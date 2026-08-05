from rest_framework import serializers
from django.utils import timezone
from django.conf import settings
from cakery.common import aws_domain_name
from .models import (
    CRMOption, Lead, LeadActivity, LeadReferenceImage, Quotation,
    CRMDelivery, CRMDeliveryDamageImage, CRMInvoice, CRMOrder, CRMOrderItem, QuotationActivity, QuotationItem, QuotationPayment,
)


class CRMOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOption
        fields = "__all__"


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
        return f"{settings.IMAGE_BASE_URL}/{aws_domain_name}/crm/lead/reference/{obj.file_name}.{obj.file_ext}"


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
        return f"{settings.IMAGE_BASE_URL}/{aws_domain_name}/crm/delivery/damage/{obj.file_name}.{obj.file_ext}"


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
