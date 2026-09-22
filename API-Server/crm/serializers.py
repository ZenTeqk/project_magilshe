from datetime import date
from decimal import Decimal
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
    CRMDelivery, CRMDeliveryDamageImage, CRMInvoice, CRMOrder, CRMOrderItem, QuotationActivity, QuotationItem, QuotationPayment, QuotationVersion,
)
from .recurring_events import recurring_event_status
from .uploads import validate_image_upload


def is_quotation_locked(quotation):
    return bool(
        quotation
        and quotation.status in {"Order Confirmed", "Closed"}
        and hasattr(quotation, "crm_order")
    )


class CRMOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOption
        fields = "__all__"


def validate_sale_quantity(unit_type, quantity):
    """Defaults are kg/piece; active CRM settings may add more sale units."""
    unit_type = str(unit_type or "").strip()
    blocked_aliases = {"gram", "grams", "g"}
    configured = CRMOption.objects.filter(
        option_type="sale_unit", name__iexact=unit_type, is_active=True
    ).exists()
    if unit_type.casefold() in blocked_aliases or (unit_type not in ("kg", "piece") and not configured):
        raise serializers.ValidationError({"unit_type": "Select kg, piece, or an active unit from CRM Settings."})
    if quantity is None:
        return
    if unit_type == "kg" and quantity < 0.5:
        raise serializers.ValidationError({"quantity": "kg quantity must be at least 0.5."})
    if unit_type == "piece":
        if quantity < 1:
            raise serializers.ValidationError({"quantity": "piece quantity must be at least 1."})
        if quantity != quantity.to_integral_value():
            raise serializers.ValidationError({"quantity": "piece quantity must be a whole number."})
    if unit_type not in ("kg", "piece") and quantity <= 0:
        raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})


class CRMCustomerAddressUpdateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CustomerAddress
        fields = ("id", "title", "person_name", "phone", "address", "city", "pincode", "is_primary")

    def validate_pincode(self, value):
        if value and (not value.isdigit() or len(value) != 6):
            raise serializers.ValidationError("Pincode must contain exactly 6 digits.")
        return value

    def validate_phone(self, value):
        digits = "".join(character for character in str(value or "") if character.isdigit())
        if not digits:
            return None
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) != 10 or digits[0] not in "6789":
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        return digits


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
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer", queryset=Customer.objects.filter(is_staff=False),
        required=False, allow_null=True,
    )
    cake_name = serializers.CharField(source="cake.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    archived_by_name = serializers.SerializerMethodField()
    quotation_id = serializers.IntegerField(source="quotation.id", read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    reference_images = LeadReferenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Lead
        exclude = ("customer",)
        read_only_fields = (
            "lead_no", "created_on", "updated_on", "created_by", "updated_by",
            "is_archived", "archived_at", "archived_by",
        )
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

    def get_archived_by_name(self, obj):
        return str(obj.archived_by) if obj.archived_by else None

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
        unit_type = attrs.get("unit_type", self.instance.unit_type if self.instance else "kg")
        quantity = attrs.get("quantity", self.instance.quantity if self.instance else None)
        validate_sale_quantity(unit_type, quantity)
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
            try:
                ext = validate_image_upload(proof)
            except ValueError as error:
                raise serializers.ValidationError({"proof": str(error)})
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

    def validate(self, attrs):
        unit_type = attrs.get("unit_type", self.instance.unit_type if self.instance else "kg")
        quantity = attrs.get("quantity", self.instance.quantity if self.instance else None)
        validate_sale_quantity(unit_type, quantity)
        return attrs


class QuotationSerializer(serializers.ModelSerializer):
    lead_no = serializers.CharField(source="lead.lead_no", read_only=True, allow_null=True)
    lead_details = LeadSerializer(source="lead", read_only=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payments = QuotationPaymentSerializer(many=True, read_only=True)
    quotation_activities = QuotationActivitySerializer(source="activities", many=True, read_only=True)
    items = QuotationItemSerializer(many=True, required=False)
    order_id = serializers.IntegerField(source="crm_order.id", read_only=True, allow_null=True)
    current_version = serializers.SerializerMethodField()
    quotation_versions = serializers.SerializerMethodField()
    archived_by_name = serializers.SerializerMethodField()

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
            "current_version", "quotation_versions",
            "is_archived", "archived_at", "archived_by", "archived_by_name",
        )
        read_only_fields = (
            "quotation_no", "lead", "subtotal", "gst_amount",
            "created_on", "updated_on", "is_archived", "archived_at", "archived_by",
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

    def get_current_version(self, instance):
        version = instance.versions.first()
        if not version:
            return None
        return {
            "id": version.id, "version_number": version.version_number,
            "snapshot": version.snapshot, "total_amount": str(version.total_amount),
            "generated_on": version.generated_on,
        }

    def get_archived_by_name(self, instance):
        return str(instance.archived_by) if instance.archived_by else None

    def get_quotation_versions(self, instance):
        return [{
            "id": version.id, "version_number": version.version_number,
            "snapshot": version.snapshot, "total_amount": str(version.total_amount),
            "generated_on": version.generated_on,
        } for version in instance.versions.all()]

    def validate_phone(self, value):
        if value in (None, ""):
            return value
        value = str(value).strip()
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone must contain exactly 10 digits.")
        return value

    def validate(self, attrs):
        if self.instance and is_quotation_locked(self.instance):
            raise serializers.ValidationError({
                "message": "This quotation is finalized with a confirmed order and cannot be edited. Create a new quotation for changes."
            })
        lead = attrs.get("lead", self.instance.lead if self.instance else None)
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
        if attrs.get("items"):
            subtotal = sum(item["quantity"] * item["rate"] for item in attrs["items"])
            gst = sum(
                item["quantity"] * item["rate"] * (item.get("gst_percentage") or 0) / 100
                for item in attrs["items"]
            )
            resulting_total = subtotal + gst - attrs.get(
                "discount_amount",
                self.instance.discount_amount if self.instance else 0,
            )
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


def create_quotation_version(quotation, user=None):
    """Persist the exact API representation used by the quotation PDF."""
    quotation.refresh_from_db()
    snapshot = dict(QuotationSerializer(quotation).data)
    snapshot.pop("current_version", None)
    snapshot.pop("quotation_versions", None)
    latest = quotation.versions.order_by("-version_number").first()
    return QuotationVersion.objects.create(
        quotation=quotation,
        version_number=(latest.version_number + 1) if latest else 1,
        snapshot=snapshot,
        total_amount=quotation.total_amount,
        generated_by=user,
    )


class QuotationListSerializer(serializers.ModelSerializer):
    """Compact serializer for fast quotation tables; detail APIs stay unchanged."""
    lead_no = serializers.CharField(source="lead.lead_no", read_only=True, allow_null=True)
    balance_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    archived_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = (
            "id", "quotation_no", "lead", "lead_no", "customer_name", "phone",
            "event_date", "cake_type", "total_amount", "advance_received",
            "advance_amount", "balance_amount", "status", "created_on", "updated_on",
            "is_archived", "archived_at", "archived_by", "archived_by_name",
        )

    def get_archived_by_name(self, instance):
        return str(instance.archived_by) if instance.archived_by else None

class CRMOrderItemSerializer(serializers.ModelSerializer):
    amount = serializers.SerializerMethodField()

    class Meta:
        model = CRMOrderItem
        fields = "__all__"

    def get_amount(self, obj):
        return (Decimal(obj.quantity) * Decimal(obj.rate)).quantize(Decimal("0.01"))

    def validate(self, attrs):
        unit_type = attrs.get("unit_type", self.instance.unit_type if self.instance else "kg")
        quantity = attrs.get("quantity", self.instance.quantity if self.instance else None)
        validate_sale_quantity(unit_type, quantity)
        return attrs


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
    archived_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CRMOrder
        fields = "__all__"
        read_only_fields = (
            "order_no", "quotation", "customer", "customer_name", "phone",
            "cake_type", "flavour", "quantity", "event_date", "total_amount",
            "advance_paid", "confirmed_by", "confirmed_on", "updated_on",
            "cancellation_reason", "cancelled_at", "cancelled_by",
            "is_archived", "archived_at", "archived_by",
        )

    def get_assigned_staff_name(self, obj):
        return str(obj.assigned_staff) if obj.assigned_staff else None

    def get_assigned_baker_name(self, obj):
        return str(obj.assigned_baker) if obj.assigned_baker else None

    def get_cancelled_by_name(self, obj):
        return str(obj.cancelled_by) if obj.cancelled_by else None

    def get_archived_by_name(self, obj):
        return str(obj.archived_by) if obj.archived_by else None

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
    email = serializers.EmailField(source="customer.email", read_only=True, allow_null=True)
    discount_amount = serializers.DecimalField(
        source="order.quotation.discount_amount", max_digits=12, decimal_places=2,
        read_only=True,
    )
    archived_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CRMInvoice
        fields = "__all__"
        read_only_fields = ("is_archived", "archived_at", "archived_by")

    def get_archived_by_name(self, obj):
        return str(obj.archived_by) if obj.archived_by else None


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
    quantity = serializers.DecimalField(source="order.quantity", max_digits=10, decimal_places=3, read_only=True)
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
    customer_addresses = serializers.SerializerMethodField()
    archived_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CRMDelivery
        fields = "__all__"
        read_only_fields = (
            "delivery_no", "order", "delivery_status", "completed_at",
            "damage_description", "failure_reason", "created_by", "created_on", "updated_on",
            "is_archived", "archived_at", "archived_by",
        )

    def get_scheduled_at(self, obj):
        return obj.scheduled_at

    def get_archived_by_name(self, obj):
        return str(obj.archived_by) if obj.archived_by else None

    def get_customer_addresses(self, obj):
        customer = obj.order.customer
        if not customer:
            return []
        fallback_name = " ".join(filter(None, [customer.first_name, customer.last_name])).strip() or customer.username
        return [{
            "id": address.id,
            "title": address.title,
            "person_name": address.person_name or fallback_name,
            "phone": address.phone or customer.phone,
            "address": address.address,
            "city": address.city,
            "pincode": address.pincode,
            "is_primary": address.is_primary,
        } for address in customer.customeraddress_set.order_by("-is_primary", "id")]

    def validate_customer_address(self, address):
        order = self.instance.order if self.instance else None
        if order and address and address.customer_id != order.customer_id:
            raise serializers.ValidationError("Select an address saved for this delivery's customer.")
        return address

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # Only enforce type-specific requirements when this request is actually
        # confirming a delivery_type or touching that type's assignment fields --
        # not on unrelated partial updates (e.g. selecting a customer_address)
        # against a record whose persisted delivery_type happens to need them.
        magilshe_fields = ("delivery_person",)
        porter_fields = ("external_delivery_person", "external_platform", "porter_name", "porter_contact")
        touches_assignment = "delivery_type" in attrs or any(
            field in attrs for field in magilshe_fields + porter_fields
        )
        if not touches_assignment:
            return attrs
        delivery_type = attrs.get(
            "delivery_type", self.instance.delivery_type if self.instance else None
        )
        if delivery_type == "Magilshe Delivery":
            person = attrs.get(
                "delivery_person", self.instance.delivery_person if self.instance else None
            )
            if not person:
                raise serializers.ValidationError(
                    {"delivery_person": "Select an existing Magilshe delivery staff member."}
                )
            if not person.status and (
                not self.instance or person.pk != self.instance.delivery_person_id
            ):
                raise serializers.ValidationError(
                    {"delivery_person": "Select an active Magilshe delivery staff member."}
                )
        elif delivery_type == "Porter Delivery":
            if attrs.get("external_delivery_person") is not None:
                raise serializers.ValidationError({
                    "external_delivery_person": (
                        "Enter this delivery person's name and contact directly; "
                        "do not select a permanent delivery-person record."
                    )
                })
            required = {
                "external_platform": "Select a delivery platform.",
                "porter_name": "Enter the delivery person's name.",
                "porter_contact": "Enter the delivery person's contact number.",
            }
            errors = {}
            for field, message in required.items():
                value = attrs.get(field, getattr(self.instance, field, None) if self.instance else None)
                if not value or (isinstance(value, str) and not value.strip()):
                    errors[field] = message
            if errors:
                raise serializers.ValidationError(errors)
        return attrs

    def update(self, instance, validated_data):
        delivery_type = validated_data.get("delivery_type", instance.delivery_type)
        # Delivery types have separate field sets. Keep inactive values so a
        # temporary type switch cannot destroy an existing valid assignment.
        address = validated_data.get("customer_address")
        if address and address.pk != instance.customer_address_id:
            customer = instance.order.customer
            fallback_name = " ".join(filter(None, [customer.first_name, customer.last_name])).strip() if customer else ""
            location = ", ".join(filter(None, [address.address, address.city, address.pincode]))
            validated_data["recipient_name"] = address.person_name or fallback_name or instance.order.customer_name
            validated_data["recipient_phone"] = address.phone or (customer.phone if customer else None) or instance.order.phone
            if delivery_type == "Porter Delivery":
                validated_data["porter_location"] = location
            elif delivery_type == "Magilshe Delivery":
                validated_data["delivery_location"] = location
        person = validated_data.get("delivery_person")
        platform = validated_data.get("external_platform")
        if delivery_type == "Magilshe Delivery" and person:
            validated_data["delivery_person_name_snapshot"] = person.name
            validated_data["delivery_person_phone_snapshot"] = person.phone
        if delivery_type == "Porter Delivery":
            if platform:
                validated_data["external_platform_name_snapshot"] = platform.name
            if "porter_name" in validated_data:
                validated_data["external_person_name_snapshot"] = validated_data["porter_name"]
            if "porter_contact" in validated_data:
                validated_data["external_person_phone_snapshot"] = validated_data["porter_contact"]
        return super().update(instance, validated_data)
