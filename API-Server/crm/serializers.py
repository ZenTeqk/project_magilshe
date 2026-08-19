from datetime import date
import uuid

from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from cakery.common import aws_domain_name, get_s3_file_url
from cakery.file_upload_to_aws import put_image_to_s3
from customer.models import Customer, CustomerAddress
from .models import (
    CRMOption, CustomerRecurringEvent, Lead, LeadActivity, LeadReferenceImage, Quotation,
    CRMDelivery, CRMDeliveryDamageImage, CRMInvoice, CRMOrder, CRMOrderItem, QuotationActivity, QuotationItem, QuotationPayment,
)
from .recurring_events import recurring_event_status


class CRMOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOption
        fields = "__all__"


class CRMCustomerAddressUpdateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CustomerAddress
        fields = ("id", "title", "address", "city", "pincode", "is_primary")

    def validate_pincode(self, value):
        if value and (not value.isdigit() or len(value) != 6):
            raise serializers.ValidationError("Pincode must contain exactly 6 digits.")
        return value


class CRMCustomerUpdateSerializer(serializers.ModelSerializer):
    addresses = CRMCustomerAddressUpdateSerializer(many=True, required=False, write_only=True)
    delete_address_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, write_only=True
    )

    class Meta:
        model = Customer
        fields = ("first_name", "last_name", "email", "phone", "is_active", "addresses", "delete_address_ids")

    def validate_phone(self, value):
        digits = "".join(character for character in str(value or "") if character.isdigit())
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if not digits or len(digits) != 10 or digits[0] not in "6789":
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        duplicate_query = Customer.objects.filter(phone=digits)
        if self.instance:
            duplicate_query = duplicate_query.exclude(pk=self.instance.pk)
        duplicate = duplicate_query.exists()
        if duplicate:
            raise serializers.ValidationError("Another customer already uses this mobile number.")
        return digits

    @transaction.atomic
    def create(self, validated_data):
        addresses = validated_data.pop("addresses", [])
        validated_data.pop("delete_address_ids", None)
        phone = validated_data["phone"]
        username = phone
        suffix = 1
        while Customer.objects.filter(username=username).exists():
            username = f"customer-{phone}-{suffix}"
            suffix += 1
        customer = Customer(username=username, is_staff=False, **validated_data)
        customer.set_unusable_password()
        customer.save()
        primary_created = False
        for index, address_data in enumerate(addresses):
            is_primary = bool(address_data.get("is_primary")) or (index == 0 and not primary_created)
            address_data["is_primary"] = is_primary
            address = CustomerAddress.objects.create(
                customer=customer,
                created_by=self.context["request"].user,
                **address_data,
            )
            if address.is_primary:
                customer.customeraddress_set.exclude(pk=address.pk).update(is_primary=False)
                primary_created = True
        return customer

    @transaction.atomic
    def update(self, instance, validated_data):
        addresses = validated_data.pop("addresses", None)
        delete_ids = validated_data.pop("delete_address_ids", [])
        instance = super().update(instance, validated_data)
        if delete_ids:
            instance.customeraddress_set.filter(id__in=delete_ids).delete()
        if addresses is not None:
            primary_id = None
            for address_data in addresses:
                address_id = address_data.pop("id", None)
                address = instance.customeraddress_set.filter(id=address_id).first() if address_id else None
                if address:
                    for field, value in address_data.items():
                        setattr(address, field, value)
                    address.updated_by = self.context["request"].user
                    address.save()
                else:
                    address = CustomerAddress.objects.create(
                        customer=instance, created_by=self.context["request"].user, **address_data
                    )
                if address.is_primary:
                    primary_id = address.id
            if primary_id:
                instance.customeraddress_set.exclude(id=primary_id).update(is_primary=False)
        return instance


class CustomerRecurringEventSerializer(serializers.ModelSerializer):
    """Manual CRUD for customer occasions/reminders, on top of the same model
    auto-populated from Lead history by recurring_events.sync_recurring_event."""

    event_date = serializers.DateField(write_only=True, required=False)
    next_occurrence = serializers.SerializerMethodField()
    reminder_date = serializers.SerializerMethodField()
    days_until = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = CustomerRecurringEvent
        fields = (
            "id", "customer", "event_type", "event_month", "event_day", "original_date",
            "notes", "reminder_days_before", "last_reminder_sent_on", "source_lead",
            "event_date", "next_occurrence", "reminder_date", "days_until", "is_completed", "status",
            "created_on", "updated_on",
        )
        read_only_fields = (
            "event_month", "event_day", "original_date", "last_reminder_sent_on",
            "source_lead", "created_on", "updated_on",
        )

    def _status(self, obj):
        return recurring_event_status(obj)

    def get_next_occurrence(self, obj):
        return self._status(obj)[0]

    def get_reminder_date(self, obj):
        return self._status(obj)[1]

    def get_is_completed(self, obj):
        return self._status(obj)[2]

    def get_status(self, obj):
        return self._status(obj)[3]

    def get_days_until(self, obj):
        return (self._status(obj)[0] - date.today()).days

    def validate(self, attrs):
        event_date = attrs.pop("event_date", None)
        if event_date:
            attrs["event_month"] = event_date.month
            attrs["event_day"] = event_date.day
            attrs["original_date"] = event_date
        elif self.instance is None:
            raise serializers.ValidationError({"event_date": "This field is required."})
        return attrs


class LeadActivitySerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    class Meta:
        model = LeadActivity
        fields = ("id", "action", "description", "staff_name", "created_on")
    def get_staff_name(self, obj):
        return str(obj.staff) if obj.staff else "System"


class LeadReferenceImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    class Meta:
        model = LeadReferenceImage
        fields = ("id", "original_name", "url", "created_on")
    def get_url(self, obj):
        return get_s3_file_url(f"{aws_domain_name}/crm/lead/reference/{obj.file_name}.{obj.file_ext}")


class LeadSerializer(serializers.ModelSerializer):
    cake_name = serializers.CharField(source="cake.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    quotation_id = serializers.IntegerField(source="quotation.id", read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    reference_images = LeadReferenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Lead
        exclude = ("customer",)
        read_only_fields = ("lead_no", "created_on", "updated_on", "created_by", "updated_by")
        extra_kwargs = {
            "customer_name": {"required": True},
            "phone": {"required": True},
            "occasion": {"required": True},
            "event_date": {"required": True, "allow_null": False},
            "cake_type": {"required": True},
            "quantity": {"required": True},
        }

    def get_assigned_to_name(self, obj):
        return str(obj.assigned_to) if obj.assigned_to else None

    def validate_customer_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Customer name is required.")
        return value.strip()

    def validate_phone(self, value):
        value = str(value).strip()
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone must contain exactly 10 digits.")
        return value

    def validate_event_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Event date cannot be in the past.")
        return value

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate_cake_type(self, value):
        if not value.strip():
            raise serializers.ValidationError("Cake type is required.")
        return value.strip()

    def validate(self, attrs):
        resulting_status = attrs.get("status", self.instance.status if self.instance else "Open")
        def resulting(name):
            return attrs.get(name, getattr(self.instance, name, None) if self.instance else None)
        if resulting_status == "Follow-up":
            errors = {}
            if not resulting("follow_up_date"):
                errors["follow_up_date"] = "Next follow-up date is required."
            if not str(resulting("follow_up_notes") or "").strip():
                errors["follow_up_notes"] = "Follow-up notes are required."
            if errors:
                raise serializers.ValidationError(errors)
        if resulting_status == "Won" and not str(resulting("winning_reason") or "").strip():
            raise serializers.ValidationError({"winning_reason": "Reason for winning is required."})
        if resulting_status == "Lost" and not str(resulting("loss_reason") or "").strip():
            raise serializers.ValidationError({"loss_reason": "Reason for loss is required."})
        if self.instance and "status" in attrs and attrs["status"] != self.instance.status:
            transitions = {
                "Open": {"Follow-up", "Won", "Lost"},
                "Follow-up": {"Won", "Lost"},
                "Won": set(),
                "Lost": set(),
            }
            if attrs["status"] not in transitions.get(self.instance.status, set()):
                raise serializers.ValidationError({
                    "status": f"Cannot move a lead from {self.instance.status} to {attrs['status']}."
                })
        return attrs


class QuotationPaymentSerializer(serializers.ModelSerializer):
    collected_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuotationPayment
        fields = ("id", "amount", "payment_date", "payment_method", "collected_by_name",
                  "transaction_reference", "proof", "customer_remarks", "created_on")
        read_only_fields = ("created_on",)

    def get_collected_by_name(self, obj):
        return str(obj.collected_by) if obj.collected_by else "System"

    def create(self, validated_data):
        proof = validated_data.pop("proof", None)
        if proof:
            ext = proof.name.rsplit(".", 1)[-1].lower() if "." in proof.name else ""
            if ext not in {"jpg", "jpeg", "png", "webp", "pdf"}:
                raise serializers.ValidationError({"proof": "Supported files: JPG, JPEG, PNG, WEBP and PDF."})
            key = f"{aws_domain_name}/crm/quotation/payment-proof/{uuid.uuid4()}.{ext}"
            if not put_image_to_s3(proof, key):
                raise serializers.ValidationError({"proof": "Payment proof upload failed."})
            validated_data["proof"] = key
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.proof:
            name = instance.proof.name
            data["proof"] = get_s3_file_url(name) if name.startswith(f"{aws_domain_name}/") else instance.proof.url
        return data


class QuotationActivitySerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = QuotationActivity
        fields = ("id", "action", "description", "staff_name", "created_on")

    def get_staff_name(self, obj):
        return str(obj.staff) if obj.staff else "System"


class QuotationItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    gst_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuotationItem
        fields = "__all__"
        read_only_fields = ("quotation",)


class QuotationSerializer(serializers.ModelSerializer):
    lead_no = serializers.CharField(source="lead.lead_no", read_only=True, allow_null=True)
    lead_details = LeadSerializer(source="lead", read_only=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payments = QuotationPaymentSerializer(many=True, read_only=True)
    quotation_activities = QuotationActivitySerializer(source="activities", many=True, read_only=True)
    items = QuotationItemSerializer(many=True, required=False)
    order_id = serializers.IntegerField(source="crm_order.id", read_only=True, allow_null=True)

    class Meta:
        model = Quotation
        fields = (
            "id", "quotation_no", "lead", "lead_no", "lead_details", "customer",
            "customer_name", "phone", "email", "billing_address",
            "billing_selected_address", "shipping_same_as_billing", "address", "cake", "cake_type",
            "flavour", "quantity", "event_date", "notes", "rate", "gst_enabled",
            "gst_percentage", "subtotal", "gst_amount", "total_amount", "payment_terms",
            "valid_until", "status", "advance_received", "advance_amount", "payment_date",
            "payment_method", "transaction_reference", "balance_amount", "created_on",
            "updated_on", "payments", "quotation_activities", "items", "customer_type",
            "selected_address", "occasion", "delivery_date", "delivery_time",
            "delivery_type", "special_instructions", "discount_amount", "sales_staff", "order_id",
        )
        read_only_fields = (
            "quotation_no", "lead", "subtotal", "gst_amount",
            "created_on", "updated_on",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.lead:
            fallbacks = {
                "customer_name": instance.lead.customer_name,
                "phone": instance.lead.phone,
                "email": instance.lead.email,
                "address": instance.lead.address,
                "cake": instance.lead.cake_id,
                "cake_type": instance.lead.cake_type,
                "flavour": instance.lead.flavour,
                "quantity": instance.lead.quantity,
                "event_date": instance.lead.event_date,
                "notes": instance.lead.customer_notes,
            }
            for field, fallback in fallbacks.items():
                if data.get(field) in (None, "") and fallback not in (None, ""):
                    data[field] = fallback
        # Old quotations only have the legacy `address` shipping snapshot.
        # Present it as billing too until the record is explicitly edited.
        if not data.get("billing_address"):
            data["billing_address"] = data.get("address")
        return data

    def validate_phone(self, value):
        if value in (None, ""):
            return value
        value = str(value).strip()
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone must contain exactly 10 digits.")
        return value

    def validate(self, attrs):
        lead = attrs.get("lead", self.instance.lead if self.instance else None)
        if lead and lead.status != "Won":
            raise serializers.ValidationError({"lead": "Only Won leads can be quoted."})
        same_address = attrs.get(
            "shipping_same_as_billing",
            self.instance.shipping_same_as_billing if self.instance else True,
        )
        billing_address = attrs.get(
            "billing_address", self.instance.billing_address if self.instance else None
        )
        if same_address and billing_address:
            attrs["address"] = billing_address
        if not lead and not self.instance:
            required = ("customer_name", "phone")
            if not attrs.get("items"):
                required += ("cake_type", "quantity", "rate")
            errors = {
                field: "This field is required for a manual quotation."
                for field in required if attrs.get(field) in (None, "")
            }
            if errors:
                raise serializers.ValidationError(errors)
        for field in ("quantity", "rate", "gst_percentage", "advance_amount"):
            value = attrs.get(field)
            if value is not None and value < 0:
                raise serializers.ValidationError({field: "This value cannot be negative."})
        if attrs.get("quantity") == 0:
            raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})
        resulting_advance = attrs.get(
            "advance_amount", self.instance.advance_amount if self.instance else 0
        )
        resulting_total = self.instance.total_amount if self.instance else 0
        rate = attrs.get("rate", self.instance.rate if self.instance else None)
        quantity = attrs.get("quantity", self.instance.quantity if self.instance else None)
        gst_enabled = attrs.get(
            "gst_enabled", self.instance.gst_enabled if self.instance else False
        )
        gst_percentage = attrs.get(
            "gst_percentage", self.instance.gst_percentage if self.instance else 0
        ) or 0
        if rate is not None and quantity is not None:
            resulting_total = rate * quantity
            if gst_enabled:
                resulting_total += resulting_total * gst_percentage / 100
        if resulting_advance and resulting_advance > resulting_total:
            raise serializers.ValidationError(
                {"advance_amount": "Advance amount cannot exceed the quotation total."}
            )
        return attrs

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        instance = super().update(instance, validated_data)
        if items is not None:
            instance.items.all().delete()
            QuotationItem.objects.bulk_create([
                QuotationItem(quotation=instance, **item) for item in items
            ])
            instance.calculate_totals()
            instance.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))
        return instance

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        if items:
            first_item = items[0]
            validated_data.setdefault("cake_type", first_item.get("item_name", ""))
            validated_data.setdefault("flavour", first_item.get("flavour", ""))
            validated_data.setdefault("quantity", first_item.get("quantity", 1))
            validated_data.setdefault("rate", first_item.get("rate", 0))
            gst_percentage = first_item.get("gst_percentage", 0) or 0
            validated_data.setdefault("gst_percentage", gst_percentage)
            validated_data.setdefault("gst_enabled", gst_percentage > 0)
        instance = super().create(validated_data)
        QuotationItem.objects.bulk_create([
            QuotationItem(quotation=instance, **item) for item in items
        ])
        if items:
            instance.calculate_totals()
            instance.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))
        return instance


class QuotationListSerializer(serializers.ModelSerializer):
    """Compact serializer for fast quotation tables; detail APIs stay unchanged."""
    lead_no = serializers.CharField(source="lead.lead_no", read_only=True, allow_null=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Quotation
        fields = (
            "id", "quotation_no", "lead", "lead_no", "customer_name", "phone",
            "event_date", "cake_type", "total_amount", "advance_received",
            "advance_amount", "balance_amount", "status", "created_on", "updated_on",
        )

class CRMOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOrderItem
        fields = "__all__"


class CRMOrderSerializer(serializers.ModelSerializer):
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    delivery_staff_name = serializers.CharField(source="delivery_staff.name", read_only=True)
    assigned_staff_name = serializers.SerializerMethodField()
    quotation_no = serializers.CharField(source="quotation.quotation_no", read_only=True)
    items = CRMOrderItemSerializer(many=True, read_only=True)
    assigned_baker_name = serializers.SerializerMethodField()
    reference_images = serializers.SerializerMethodField()
    timeline = QuotationActivitySerializer(source="quotation.activities", many=True, read_only=True)
    cancelled_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CRMOrder
        fields = "__all__"
        read_only_fields = (
            "order_no", "quotation", "customer", "customer_name", "phone",
            "cake_type", "flavour", "quantity", "event_date", "total_amount",
            "advance_paid", "confirmed_by", "confirmed_on", "updated_on",
            "cancellation_reason", "cancelled_at", "cancelled_by",
        )

    def get_assigned_staff_name(self, obj):
        return str(obj.assigned_staff) if obj.assigned_staff else None

    def get_assigned_baker_name(self, obj):
        return str(obj.assigned_baker) if obj.assigned_baker else None

    def get_cancelled_by_name(self, obj):
        return str(obj.cancelled_by) if obj.cancelled_by else None

    def get_reference_images(self, obj):
        lead = obj.quotation.lead
        return LeadReferenceImageSerializer(lead.reference_images.all(), many=True).data if lead else []


class CRMInvoiceSerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(source="order.order_no", read_only=True)
    quotation_no = serializers.CharField(source="order.quotation.quotation_no", read_only=True)
    items = CRMOrderItemSerializer(source="order.items", many=True, read_only=True)
    delivery_address = serializers.CharField(source="order.delivery_address", read_only=True)
    delivery_date = serializers.DateField(source="order.delivery_date", read_only=True)
    payments = QuotationPaymentSerializer(source="order.quotation.payments", many=True, read_only=True)
    timeline = QuotationActivitySerializer(source="order.quotation.activities", many=True, read_only=True)

    class Meta:
        model = CRMInvoice
        fields = "__all__"


class CRMDeliveryDamageImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    class Meta:
        model = CRMDeliveryDamageImage
        fields = ("id", "original_name", "url", "created_on")
    def get_url(self, obj):
        return get_s3_file_url(f"{aws_domain_name}/crm/delivery/damage/{obj.file_name}.{obj.file_ext}")


class CRMDeliverySerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(source="order.order_no", read_only=True)
    invoice_no = serializers.CharField(source="order.invoice.invoice_no", read_only=True)
    customer = serializers.IntegerField(source="order.customer_id", read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)
    phone = serializers.CharField(source="order.phone", read_only=True)
    cake_type = serializers.CharField(source="order.cake_type", read_only=True)
    flavour = serializers.CharField(source="order.flavour", read_only=True)
    quantity = serializers.IntegerField(source="order.quantity", read_only=True)
    items = CRMOrderItemSerializer(source="order.items", many=True, read_only=True)
    total_amount = serializers.DecimalField(source="order.total_amount", max_digits=12, decimal_places=2, read_only=True)
    advance_paid = serializers.DecimalField(source="order.advance_paid", max_digits=12, decimal_places=2, read_only=True)
    balance_amount = serializers.DecimalField(source="order.balance_amount", max_digits=12, decimal_places=2, read_only=True)
    delivery_person_name = serializers.CharField(source="delivery_person.name", read_only=True)
    external_platform_name = serializers.CharField(source="external_platform.name", read_only=True)
    external_delivery_person_name = serializers.CharField(source="external_delivery_person.name", read_only=True)
    scheduled_at = serializers.SerializerMethodField()
    damage_images = CRMDeliveryDamageImageSerializer(many=True, read_only=True)
    timeline = QuotationActivitySerializer(source="order.quotation.activities", many=True, read_only=True)

    class Meta:
        model = CRMDelivery
        fields = "__all__"
        read_only_fields = (
            "delivery_no", "order", "delivery_status", "completed_at",
            "damage_description", "failure_reason", "created_by", "created_on", "updated_on",
        )

    def get_scheduled_at(self, obj):
        return obj.scheduled_at

    def update(self, instance, validated_data):
        delivery_type = validated_data.get("delivery_type", instance.delivery_type)
        person = validated_data.get("delivery_person")
        external_person = validated_data.get("external_delivery_person")
        platform = validated_data.get("external_platform") or (external_person.platform if external_person else None)
        if delivery_type == "Magilshe Delivery" and person:
            validated_data["delivery_person_name_snapshot"] = person.name
            validated_data["delivery_person_phone_snapshot"] = person.phone
        if delivery_type == "Porter Delivery" and external_person:
            validated_data.update({
                "external_platform": platform,
                "external_platform_name_snapshot": platform.name if platform else None,
                "external_person_name_snapshot": external_person.name,
                "external_person_phone_snapshot": external_person.phone,
                "porter_id": external_person.partner_id,
                "porter_name": external_person.name,
                "porter_contact": external_person.phone,
            })
        return super().update(instance, validated_data)
