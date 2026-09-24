from django.conf import settings
from django.db import models
from decimal import Decimal, ROUND_HALF_UP
from cake.models import Cake

SALE_UNIT_CHOICES = (("kg", "kg"), ("piece", "piece"))
GRAM_ALIASES = {"g", "gm", "gms", "gram", "grams"}


def pricing_quantity(quantity, unit_type):
    """Converts a quantity into the unit the rate is priced against.

    Uses the conversion_factor configured in CRM Settings for the unit when
    one exists, falling back to the historical gram-name heuristic (kg/piece
    and unconfigured units pass through 1:1) so existing data keeps computing
    the same amounts.
    """
    quantity = Decimal(quantity or 0)
    normalized = str(unit_type or "").strip().lower()
    factor = (
        CRMOption.objects
        .filter(option_type="sale_unit", name__iexact=normalized)
        .values_list("conversion_factor", flat=True)
        .first()
    )
    if factor is not None:
        return quantity * factor
    if normalized in GRAM_ALIASES:
        return quantity / Decimal("1000")
    return quantity


class Lead(models.Model):
    STATUS_CHOICES = (
        ("Open", "Open"),
        ("Follow-up", "Follow-up"),
        ("Won", "Won"),
        ("Lost", "Lost"),
        ("Completed", "Completed"),
    )

    lead_no = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    customer = models.ForeignKey(
        "customer.Customer",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="crm_leads",
    )
    customer_name = models.CharField(max_length=300)
    phone = models.CharField(max_length=10, db_index=True)
    email = models.EmailField(null=True, blank=True)
    whatsapp_number = models.CharField(max_length=10, null=True, blank=True)
    alternate_phone = models.CharField(max_length=10, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=6, null=True, blank=True)
    occasion = models.CharField(max_length=150, default="Other")
    event_date = models.DateField(null=True, blank=True)
    event_notes = models.TextField(null=True, blank=True)
    cake = models.ForeignKey(Cake, on_delete=models.SET_NULL, null=True, blank=True)
    cake_type = models.CharField(max_length=150, default="Custom Cake")
    flavour = models.CharField(max_length=100, null=True, blank=True)
    shape = models.CharField(max_length=100, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_type = models.CharField(max_length=30, default="kg")
    theme = models.CharField(max_length=250, null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    delivery_time = models.TimeField(null=True, blank=True)
    delivery_type = models.CharField(max_length=50, null=True, blank=True)
    delivery_address = models.TextField(null=True, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    customer_notes = models.TextField(null=True, blank=True)
    internal_notes = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Open", db_index=True)
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_time = models.TimeField(null=True, blank=True)
    follow_up_notes = models.TextField(null=True, blank=True)
    lead_source_details = models.CharField(max_length=250, null=True, blank=True)
    staff_remarks = models.TextField(null=True, blank=True)
    winning_reason = models.CharField(max_length=250, null=True, blank=True)
    loss_reason = models.CharField(max_length=250, null=True, blank=True)
    internal_sales_notes = models.TextField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="assigned_crm_leads"
    )
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="lead_created_user"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="lead_updated_user"
    )
    updated_on = models.DateTimeField(auto_now=True, null=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="archived_crm_leads",
    )

    # Legacy fields retained for data compatibility.
    expected_price = models.IntegerField(default=0)
    cake_message = models.TextField(null=True, blank=True)
    reference_image_name = models.UUIDField(null=True, blank=True)
    reference_image_ext = models.CharField(max_length=10, null=True, blank=True)
    lead_source = models.CharField(max_length=50, default="Walk-in")
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]
        default_permissions = ()

    def save(self, *args, **kwargs):
        if not self.lead_no:
            from .numbering import next_crm_number
            self.lead_no = next_crm_number("lead")
        super().save(*args, **kwargs)


class LeadSequence(models.Model):
    year = models.PositiveIntegerField(unique=True)
    last_number = models.PositiveIntegerField(default=0)


class DailySequence(models.Model):
    document_type = models.CharField(max_length=20)
    sequence_date = models.DateField()
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("document_type", "sequence_date"),
                name="unique_crm_daily_sequence",
            )
        ]


class Quotation(models.Model):
    STATUS_CHOICES = (
        ("Draft", "Draft"), ("Sent", "Sent"), ("Accepted", "Accepted"),
        ("Advance Received", "Advance Received"), ("Order Confirmed", "Order Confirmed"),
        ("Rejected", "Rejected"),
        ("Expired", "Expired"), ("Cancelled", "Cancelled"),
        ("Closed", "Closed"),
    )
    quotation_no = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    lead = models.OneToOneField(
        Lead, null=True, blank=True, on_delete=models.PROTECT, related_name="quotation"
    )
    customer = models.ForeignKey(
        "customer.Customer", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_quotations",
    )
    customer_name = models.CharField(max_length=300, null=True, blank=True)
    phone = models.CharField(max_length=10, null=True, blank=True, db_index=True)
    email = models.EmailField(null=True, blank=True)
    # Commercial address snapshots remain stable even if the customer's saved
    # address book is edited later. `address` remains the shipping snapshot for
    # backward compatibility with existing quotation/order APIs.
    billing_address = models.TextField(null=True, blank=True)
    billing_selected_address = models.ForeignKey(
        "customer.CustomerAddress", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_billing_quotations",
    )
    shipping_same_as_billing = models.BooleanField(default=True)
    address = models.TextField(null=True, blank=True)
    cake = models.ForeignKey(Cake, null=True, blank=True, on_delete=models.SET_NULL)
    cake_type = models.CharField(max_length=150, null=True, blank=True)
    flavour = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    event_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_enabled = models.BooleanField(null=True, blank=True)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_terms = models.TextField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    customer_type = models.CharField(max_length=50, null=True, blank=True)
    selected_address = models.ForeignKey(
        "customer.CustomerAddress", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_quotations",
    )
    occasion = models.CharField(max_length=150, null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    delivery_time = models.TimeField(null=True, blank=True)
    delivery_type = models.CharField(max_length=50, null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="assigned_crm_quotations",
    )
    advance_received = models.BooleanField(null=True, blank=True, default=False)
    advance_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, default=0
    )
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=100, null=True, blank=True)
    transaction_reference = models.CharField(max_length=150, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_crm_quotations",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Draft")
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="archived_crm_quotations",
    )

    class Meta:
        ordering = ["-id"]
        default_permissions = ()

    @property
    def balance_amount(self):
        total = Decimal(self.total_amount or "0")
        advance = Decimal(self.advance_amount or "0")
        return max(total - advance, Decimal("0"))

    def calculate_totals(self):
        if self.pk and self.items.exists():
            subtotal = sum(item.subtotal for item in self.items.all())
            gst = sum(item.gst_amount for item in self.items.all())
            discount = Decimal(self.discount_amount or "0")
            self.subtotal = subtotal
            self.gst_amount = gst
            self.total_amount = max(subtotal + gst - discount, Decimal("0"))
            return
        if self.rate is None or self.quantity is None:
            return
        subtotal = Decimal(self.quantity) * Decimal(self.rate)
        percentage = Decimal(self.gst_percentage or "0")
        gst = subtotal * percentage / Decimal("100") if self.gst_enabled else Decimal("0")
        self.subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.gst_amount = gst.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.total_amount = (self.subtotal + self.gst_amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    def save(self, *args, **kwargs):
        if not self.quotation_no:
            from .numbering import next_crm_number
            self.quotation_no = next_crm_number("quotation")
        self.calculate_totals()
        super().save(*args, **kwargs)


class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")
    cake = models.ForeignKey(Cake, null=True, blank=True, on_delete=models.SET_NULL)
    item_name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    flavour = models.CharField(max_length=100, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_type = models.CharField(max_length=30, default="kg")
    # rate is optional: when blank, manual_amount is the line amount.
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    manual_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    @property
    def subtotal(self):
        if self.rate is None:
            return Decimal(self.manual_amount or 0).quantize(Decimal("0.01"))
        return (pricing_quantity(self.quantity, self.unit_type) * Decimal(self.rate)).quantize(Decimal("0.01"))

    @property
    def gst_amount(self):
        return (self.subtotal * Decimal(self.gst_percentage) / Decimal("100")).quantize(Decimal("0.01"))

    @property
    def amount(self):
        # Line amount is unit-independent quantity × rate. GST is exposed
        # separately and included only when calculating document totals.
        return self.subtotal


class QuotationVersion(models.Model):
    """Immutable commercial document snapshot created only on explicit generation."""
    quotation = models.ForeignKey(
        Quotation, on_delete=models.PROTECT, related_name="versions"
    )
    version_number = models.PositiveIntegerField()
    snapshot = models.JSONField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="generated_crm_quotation_versions",
    )
    generated_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-version_number",)
        constraints = [
            models.UniqueConstraint(
                fields=("quotation", "version_number"),
                name="unique_crm_quotation_version",
            )
        ]


class QuotationSequence(models.Model):
    year = models.PositiveIntegerField(unique=True)
    last_number = models.PositiveIntegerField(default=0)


class QuotationPayment(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=100)
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="collected_crm_quotation_payments",
    )
    transaction_reference = models.CharField(max_length=150, null=True, blank=True)
    proof = models.FileField(upload_to="crm/quotation/payment-proof/", null=True, blank=True)
    customer_remarks = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_on", "-id")


class QuotationActivity(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="activities")
    action = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_on", "-id")


class CRMOrder(models.Model):
    STATUS_CHOICES = (
        ("Confirmed", "Confirmed"), ("Production", "Production"),
        ("Processing", "Processing"),
        ("Ready", "Ready"), ("Out for Delivery", "Out for Delivery"),
        ("Invoice Generated", "Invoice Generated"), ("Invoice Pending", "Invoice Pending"),
        ("Delivery", "Delivery"), ("Closed", "Closed"),
        ("Delivered", "Delivered"), ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    )
    order_no = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    quotation = models.OneToOneField(
        Quotation, on_delete=models.PROTECT, related_name="crm_order"
    )
    customer = models.ForeignKey(
        "customer.Customer", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_orders",
    )
    customer_name = models.CharField(max_length=300)
    phone = models.CharField(max_length=15)
    cake_type = models.CharField(max_length=150, null=True, blank=True)
    flavour = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    event_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    recipient_name = models.CharField(max_length=300, null=True, blank=True)
    recipient_phone = models.CharField(max_length=15, null=True, blank=True)
    delivery_address = models.TextField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    delivery_time = models.TimeField(null=True, blank=True)
    delivery_method = models.CharField(max_length=100, null=True, blank=True)
    delivery_notes = models.TextField(null=True, blank=True)
    delivery_staff = models.ForeignKey(
        "delivery_person.DeliveryPerson", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_orders",
    )
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="assigned_crm_orders",
    )
    assigned_baker = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="baking_crm_orders",
    )
    production_notes = models.TextField(null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="Confirmed")
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="confirmed_crm_orders",
    )
    confirmed_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="cancelled_crm_orders",
    )
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="archived_crm_orders",
    )

    class Meta:
        ordering = ("-id",)

    @property
    def balance_amount(self):
        return max(Decimal(self.total_amount or "0") - Decimal(self.advance_paid or "0"), Decimal("0"))

    def save(self, *args, **kwargs):
        if not self.order_no:
            from .numbering import next_crm_number
            self.order_no = next_crm_number("order")
        super().save(*args, **kwargs)


class CRMOrderItem(models.Model):
    order = models.ForeignKey(CRMOrder, on_delete=models.CASCADE, related_name="items")
    item_name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    flavour = models.CharField(max_length=100, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_type = models.CharField(max_length=30, default="kg")
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")


class CRMInvoice(models.Model):
    STATUS_CHOICES = (("Generated", "Generated"), ("Issued", "Issued"), ("Paid", "Paid"), ("Closed", "Closed"), ("Cancelled", "Cancelled"))
    invoice_no = models.CharField(max_length=30, unique=True, editable=False)
    order = models.OneToOneField(CRMOrder, on_delete=models.PROTECT, related_name="invoice")
    customer = models.ForeignKey("customer.Customer", null=True, blank=True, on_delete=models.SET_NULL, related_name="crm_invoices")
    customer_name = models.CharField(max_length=300)
    phone = models.CharField(max_length=15)
    address = models.TextField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Generated")
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="generated_crm_invoices")
    generated_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="archived_crm_invoices",
    )

    class Meta:
        ordering = ("-id",)

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            from .numbering import next_crm_number
            self.invoice_no = next_crm_number("invoice")
        super().save(*args, **kwargs)


class CRMDelivery(models.Model):
    DELIVERY_STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Out for Delivery", "Out for Delivery"),
        ("Delivered Successfully", "Delivered Successfully"),
        ("Damaged During Delivery", "Damaged During Delivery"),
        ("Delivery Failed", "Delivery Failed"),
        ("Cancelled", "Cancelled"),
    )
    DELIVERY_TYPE_CHOICES = (
        ("Customer Pickup", "Customer Pickup"),
        ("Magilshe Delivery", "Magilshe Delivery"),
        ("Porter Delivery", "Porter Delivery"),
    )
    PICKUP_PERSON_CHOICES = (
        ("Customer", "Customer"),
        ("Family Member", "Family Member"),
        ("Friend", "Friend"),
        ("Other", "Other"),
    )
    delivery_no = models.CharField(max_length=30, unique=True, editable=False)
    order = models.OneToOneField(CRMOrder, on_delete=models.PROTECT, related_name="delivery")
    customer_address = models.ForeignKey(
        "customer.CustomerAddress", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="crm_deliveries",
    )
    delivery_type = models.CharField(max_length=30, choices=DELIVERY_TYPE_CHOICES, default="Magilshe Delivery")
    recipient_name = models.CharField(max_length=300, null=True, blank=True)
    recipient_phone = models.CharField(max_length=15, null=True, blank=True)
    delivery_status = models.CharField(max_length=30, choices=DELIVERY_STATUS_CHOICES, default="Pending")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_crm_deliveries")
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    # Customer Pickup
    pickup_person_type = models.CharField(max_length=20, choices=PICKUP_PERSON_CHOICES, null=True, blank=True)
    pickup_person_relationship = models.CharField(max_length=100, null=True, blank=True)
    pickup_person_name = models.CharField(max_length=300, null=True, blank=True)
    pickup_contact = models.CharField(max_length=15, null=True, blank=True)
    pickup_time = models.DateTimeField(null=True, blank=True)
    pickup_location = models.CharField(max_length=300, null=True, blank=True, default="Bakery")
    pickup_notes = models.TextField(null=True, blank=True)

    # Magilshe Delivery
    delivery_person = models.ForeignKey("delivery_person.DeliveryPerson", null=True, blank=True, on_delete=models.SET_NULL, related_name="crm_deliveries")
    delivery_person_name_snapshot = models.CharField(max_length=300, null=True, blank=True)
    delivery_person_phone_snapshot = models.CharField(max_length=15, null=True, blank=True)
    delivery_time = models.DateTimeField(null=True, blank=True)
    delivery_location = models.TextField(null=True, blank=True)
    delivery_notes = models.TextField(null=True, blank=True)

    # Porter Delivery
    porter_id = models.CharField(max_length=100, null=True, blank=True)
    porter_name = models.CharField(max_length=300, null=True, blank=True)
    porter_contact = models.CharField(max_length=15, null=True, blank=True)
    porter_location = models.TextField(null=True, blank=True)
    porter_time = models.DateTimeField(null=True, blank=True)
    porter_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    porter_notes = models.TextField(null=True, blank=True)
    tracking_link = models.URLField(max_length=500, null=True, blank=True)
    external_platform = models.ForeignKey("delivery_person.DeliveryPlatform", null=True, blank=True, on_delete=models.SET_NULL, related_name="crm_deliveries")
    external_delivery_person = models.ForeignKey("delivery_person.ExternalDeliveryPerson", null=True, blank=True, on_delete=models.SET_NULL, related_name="crm_deliveries")
    external_platform_name_snapshot = models.CharField(max_length=150, null=True, blank=True)
    external_person_name_snapshot = models.CharField(max_length=300, null=True, blank=True)
    external_person_phone_snapshot = models.CharField(max_length=15, null=True, blank=True)

    # Completion / Damage / Failure outcome
    completed_at = models.DateTimeField(null=True, blank=True)
    damage_description = models.TextField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, null=True, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="archived_crm_deliveries",
    )

    class Meta:
        ordering = ("-id",)

    def save(self, *args, **kwargs):
        if not self.delivery_no:
            from .numbering import next_crm_number
            self.delivery_no = next_crm_number("delivery")
        super().save(*args, **kwargs)

    @property
    def scheduled_at(self):
        return self.pickup_time or self.delivery_time or self.porter_time


class CRMDeliveryDamageImage(models.Model):
    delivery = models.ForeignKey(CRMDelivery, on_delete=models.CASCADE, related_name="damage_images")
    file_name = models.UUIDField()
    file_ext = models.CharField(max_length=10)
    original_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]


class LeadActivity(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities")
    action = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_on", "-id"]


class LeadReferenceImage(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="reference_images")
    file_name = models.UUIDField()
    file_ext = models.CharField(max_length=10)
    original_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]


class CRMOption(models.Model):
    TYPE_CHOICES = (
        ("occasion", "Occasion"),
        ("cake_type", "Cake Type"),
        ("cake_flavour", "Cake Flavour"),
        ("cake_product", "Cake Product"),
        ("product_rate", "Product Rate"),
        ("lead_source", "Lead Source"),
        ("winning_reason", "Winning Reason"),
        ("loss_reason", "Loss Reason"),
        ("quotation_status", "Quotation Status"),
        ("payment_term", "Payment Term"),
        ("quotation_validity", "Quotation Validity"),
        ("order_status", "Order Status"),
        ("production_status", "Production Status"),
        ("delivery_method", "Delivery Method"),
        ("delivery_time_slot", "Delivery Time Slot"),
        ("delivery_area", "Delivery Area"),
        ("delivery_failure_reason", "Delivery Failure Reason"),
        ("order_priority", "Order Priority"),
        ("invoice_status", "Invoice Status"),
        ("payment_method", "Payment Method"),
        ("invoice_term", "Invoice Term"),
        ("tax_setting", "Tax Setting"),
        ("sale_unit", "Unit"),
        ("order_cancellation_reason", "Order Cancellation Reason"),
    )
    option_type = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    # Only meaningful for option_type="sale_unit": multiplied by the quantity
    # before pricing, so a unit's rate always resolves to a per-kg amount.
    # 1 for kg/piece-style units, 0.001 for grams, etc.
    conversion_factor = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal("1"))
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "name")
        constraints = [
            models.UniqueConstraint(
                fields=("option_type", "name"),
                name="unique_crm_option_name_per_type",
            )
        ]


class CustomerRecurringEvent(models.Model):
    """A yearly recurring occasion (birthday, anniversary, etc.) detected from a customer's order history."""

    EVENT_TYPE_CHOICES = (
        ("Birthday", "Birthday"),
        ("Anniversary", "Anniversary"),
        ("Wedding", "Wedding"),
        ("Baby Shower", "Baby Shower"),
        ("Corporate Event", "Corporate Event"),
        ("Other", "Other"),
    )

    customer = models.ForeignKey(
        "customer.Customer", on_delete=models.CASCADE, related_name="recurring_events",
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES, default="Other")
    event_month = models.PositiveSmallIntegerField()
    event_day = models.PositiveSmallIntegerField()
    original_date = models.DateField()
    source_lead = models.ForeignKey(
        Lead, null=True, blank=True, on_delete=models.SET_NULL, related_name="recurring_events",
    )
    notes = models.TextField(null=True, blank=True)
    reminder_days_before = models.PositiveSmallIntegerField(default=7)
    last_reminder_sent_on = models.DateField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_month", "event_day"]
        constraints = [
            models.UniqueConstraint(
                fields=("customer", "event_type", "event_month", "event_day"),
                name="unique_customer_recurring_event",
            )
        ]

    def next_occurrence(self, today=None):
        from datetime import date
        today = today or date.today()
        try:
            candidate = date(today.year, self.event_month, self.event_day)
        except ValueError:
            candidate = date(today.year, self.event_month, 28)
        if candidate < today:
            year = today.year + 1
            try:
                candidate = date(year, self.event_month, self.event_day)
            except ValueError:
                candidate = date(year, self.event_month, 28)
        return candidate


class CustomerCommunicationLog(models.Model):
    """One-click reminder / outreach history shown on the Customer 360 profile."""

    CHANNEL_CHOICES = (
        ("whatsapp", "WhatsApp"),
        ("sms", "SMS"),
        ("email", "Email"),
    )

    customer = models.ForeignKey(
        "customer.Customer", on_delete=models.CASCADE, related_name="communication_logs",
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    subject = models.CharField(max_length=255, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    recurring_event = models.ForeignKey(
        CustomerRecurringEvent, null=True, blank=True, on_delete=models.SET_NULL, related_name="communications",
    )
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_on", "-id"]
