from django.conf import settings
from django.db import models

# The fixed set of CRM moments a template can be tied to. Kept as a flat
# registry (not derived from the CRM models themselves) so adding a new
# trigger point is a one-line addition here plus one in
# whatsapp/event_fields.py, without the CRM app needing to know WhatsApp
# exists.
EVENT_CHOICES = (
    ("", "Unassigned (manual send only)"),
    ("quotation_sent", "Quotation Sent"),
    ("quotation_accepted", "Quotation Accepted"),
    ("quotation_advance_received", "Advance Received"),
    ("quotation_cancelled", "Quotation Cancelled"),
    ("order_confirmed", "Order Confirmed"),
    ("order_processing", "Order Processing"),
    ("order_ready", "Order Ready"),
    ("order_cancelled", "Order Cancelled"),
    ("follow_up", "Follow-up Reminder"),
    ("out_for_delivery", "Out for Delivery"),
    ("delivered", "Delivered"),
    ("invoice_generated", "Invoice Generated"),
    ("payment_reminder", "Payment Reminder"),
    ("occasion_reminder", "Occasion Reminder"),
)

# Follow-up and payment reminders are deliberately absent: their timing is a
# staff judgment call, not a status change, so they're manual-send only.
AUTO_SENDABLE_EVENTS = (
    "quotation_sent", "quotation_accepted", "quotation_advance_received", "quotation_cancelled",
    "order_confirmed", "order_processing", "order_ready", "order_cancelled",
    "invoice_generated", "out_for_delivery", "delivered",
)

# Section each event belongs to, for grouping on the Settings page.
EVENT_GROUPS = {
    "quotation_sent": "Quotation", "quotation_accepted": "Quotation",
    "quotation_advance_received": "Quotation", "quotation_cancelled": "Quotation",
    "order_confirmed": "Order", "order_processing": "Order",
    "order_ready": "Order", "order_cancelled": "Order",
    "invoice_generated": "Invoice", "payment_reminder": "Invoice",
    "out_for_delivery": "Delivery", "delivered": "Delivery",
    "follow_up": "Lead",
    "occasion_reminder": "Customer",
}

OCCASION_MODE_REVIEW = "review"
OCCASION_MODE_AUTOMATIC = "automatic"
OCCASION_MODE_CHOICES = (
    (OCCASION_MODE_REVIEW, "Review before sending"),
    (OCCASION_MODE_AUTOMATIC, "Send automatically"),
)


class WhatsAppSettings(models.Model):
    """Single row holding the business's Meta WhatsApp Business connection.

    One business, one WhatsApp number -- deliberately a singleton rather than
    a per-user or multi-account model.
    """

    waba_id = models.CharField("WhatsApp Business Account ID", max_length=64, blank=True)
    phone_number_id = models.CharField(max_length=64, blank=True)
    access_token = models.TextField(blank=True)
    webhook_verify_token = models.CharField(max_length=128, blank=True)
    # Meta App Secret. When set, webhook calls must carry a matching
    # X-Hub-Signature-256, so only Meta can update template/message status.
    app_secret = models.CharField(max_length=128, blank=True)
    # Meta App ID. Only needed for image/video/document templates: Meta's
    # Resumable Upload API, which takes the header's sample file, is
    # addressed by app rather than by WhatsApp account.
    app_id = models.CharField("Meta App ID", max_length=64, blank=True)
    business_display_name = models.CharField(max_length=150, blank=True)
    business_display_phone = models.CharField(max_length=20, blank=True)
    # Master switch. Off = nothing auto-sends, whatever auto_send_events says.
    # Manual Send buttons are unaffected either way.
    auto_send_enabled = models.BooleanField(default=False)
    # Which AUTO_SENDABLE_EVENTS fire automatically while the master switch
    # is on. An event not listed here only sends when staff click Send.
    auto_send_events = models.JSONField(default=list, blank=True)
    # Birthday/anniversary reminders, run daily by the
    # send_occasion_reminders command. Review = staff send from the
    # Occasion Reminders page; automatic = the daily job sends them itself.
    occasion_reminders_enabled = models.BooleanField(default=False)
    occasion_reminder_mode = models.CharField(
        max_length=20, choices=OCCASION_MODE_CHOICES, default=OCCASION_MODE_REVIEW,
    )
    # crm.recurring_events.occasion_key() values, e.g. ["birthday", "anniversary"].
    occasion_reminder_types = models.JSONField(default=list, blank=True)
    updated_on = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
    )

    class Meta:
        verbose_name_plural = "WhatsApp settings"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    @property
    def is_connected(self):
        return bool(self.waba_id and self.phone_number_id and self.access_token)


class MessageTemplate(models.Model):
    CATEGORY_MARKETING = "marketing"
    CATEGORY_UTILITY = "utility"
    CATEGORY_AUTHENTICATION = "authentication"
    CATEGORY_CHOICES = (
        (CATEGORY_MARKETING, "Marketing"),
        (CATEGORY_UTILITY, "Utility"),
        (CATEGORY_AUTHENTICATION, "Authentication"),
    )

    # Mirrors Meta's real template review lifecycle: a template is DRAFT
    # until explicitly submitted, then PENDING until Meta's async review
    # completes (via the message_template_status_update webhook) and lands
    # on APPROVED or REJECTED. A rejected template can be edited and
    # resubmitted; an approved one must be duplicated into a new draft to
    # change, same restriction Meta itself enforces.
    STATUS_DRAFT = "draft"
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Active"),
        (STATUS_REJECTED, "Rejected"),
    )
    EDITABLE_STATUSES = (STATUS_DRAFT, STATUS_REJECTED)

    HEADER_NONE = "none"
    HEADER_TEXT = "text"
    HEADER_IMAGE = "image"
    HEADER_VIDEO = "video"
    HEADER_DOCUMENT = "document"
    HEADER_TYPE_CHOICES = (
        (HEADER_NONE, "None"),
        (HEADER_TEXT, "Text"),
        (HEADER_IMAGE, "Image"),
        (HEADER_VIDEO, "Video"),
        (HEADER_DOCUMENT, "Document"),
    )

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    language = models.CharField(max_length=10, default="en")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    header_type = models.CharField(max_length=10, choices=HEADER_TYPE_CHOICES, default=HEADER_NONE)
    header_text = models.CharField(max_length=60, blank=True)
    header_media_url = models.URLField(max_length=500, blank=True)
    # Meta's Resumable Upload API "h" handle -- required by /message_templates
    # as example.header_handle before Meta will accept a media header. Opaque
    # and observed well past 255 chars in practice, so left unbounded.
    header_media_handle = models.TextField(blank=True)
    # The same header file, kept in our own S3 bucket. Meta's handle is only
    # good for review; every send has to hand Meta the file again, which it
    # fetches from a short-lived link to this key.
    header_media_key = models.CharField(max_length=300, blank=True)
    # Original file name, shown in the editor and used as the document name
    # the customer sees for document headers.
    header_media_filename = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    footer_text = models.CharField(max_length=60, blank=True)
    # [{"type": "URL"|"QUICK_REPLY"|"PHONE_NUMBER", "text": str, "url"?: str, "phone_number"?: str}]
    buttons = models.JSONField(default=list, blank=True)

    # Which CRM moment this template is offered for. Blank = ad-hoc only,
    # picked manually from the Customer 360 / detail pages, never auto-sent.
    event = models.CharField(max_length=30, choices=EVENT_CHOICES, blank=True, db_index=True)
    # {"1": "customer_name", "2": "quotation_no", ...} -- which field from the
    # event's record fills each {{n}} placeholder in body. Validated against
    # whatsapp.event_fields.FIELDS_FOR_EVENT at save time by the serializer,
    # not the model, so it can give a precise per-key error.
    variable_map = models.JSONField(default=dict, blank=True)

    rejection_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_whatsapp_templates",
    )
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_on",)
        constraints = [
            models.UniqueConstraint(fields=("name", "language"), name="unique_whatsapp_template_name_lang"),
        ]

    def __str__(self):
        return self.name

    @property
    def is_editable(self):
        return self.status in self.EDITABLE_STATUSES


class MessageLog(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_SENT = "sent"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = (
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENT, "Sent"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_READ, "Read"),
        (STATUS_FAILED, "Failed"),
    )

    template = models.ForeignKey(
        MessageTemplate, null=True, blank=True, on_delete=models.SET_NULL, related_name="messages",
    )
    event = models.CharField(max_length=30, blank=True)
    customer_name = models.CharField(max_length=300, blank=True)
    phone = models.CharField(max_length=20)
    # The triggering record, kept as a plain (model label, id) pair rather
    # than a GenericForeignKey -- this log only ever needs to link back for
    # display, never to query across record types, so the extra content-type
    # machinery isn't worth it. source_label is a snapshot (e.g. the
    # quotation number) so the log still reads correctly if that record is
    # ever archived or deleted.
    source_model = models.CharField(max_length=30, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    source_label = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    wa_message_id = models.CharField(max_length=128, blank=True, db_index=True)
    error_message = models.TextField(blank=True)
    # Null = sent automatically by an event trigger, not a staff member.
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
    )
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_on",)
        indexes = [models.Index(fields=["phone", "created_on"])]


class OptOut(models.Model):
    """A phone number that replied STOP: never sent occasion reminders again.

    Only the number is kept -- incoming messages themselves aren't stored.
    Order/quotation updates still go through, since the customer asked for
    those by ordering.
    """

    phone = models.CharField(max_length=20, unique=True)
    created_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.phone
