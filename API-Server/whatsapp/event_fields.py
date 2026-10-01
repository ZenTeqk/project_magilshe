"""Per-event variable sources for WhatsApp templates.

Each event key here matches one of whatsapp.models.EVENT_CHOICES. A
template assigned to an event can only map its {{n}} placeholders to the
field keys registered for that event -- this is what lets the Templates
page offer a dropdown of real fields instead of free text, and what keeps
a template from being assigned variables that don't exist on the record
that will actually trigger it.

Adding a new trigger point later means: one entry in EVENT_CHOICES, one
entry in FIELDS_FOR_EVENT below, and one call to services.trigger_event()
at the point in crm/views.py where that status actually changes.
"""

from datetime import date, datetime


def _text(value):
    return str(value).strip() if value not in (None, "") else ""


def _money(value):
    return f"{value:.2f}" if value is not None else ""


def _date(value):
    if isinstance(value, datetime):
        value = value.date()
    return value.strftime("%d %b %Y") if isinstance(value, date) else ""


def _lead_recipient(lead):
    return lead.whatsapp_number or lead.phone


def _order_recipient(order):
    return order.recipient_phone or order.phone


def _delivery_recipient(delivery):
    return delivery.recipient_phone or _order_recipient(delivery.order)


FIELDS_FOR_EVENT = {
    "quotation_sent": {
        "customer_name": ("Customer name", lambda q: _text(q.customer_name)),
        "quotation_no": ("Quotation number", lambda q: _text(q.quotation_no)),
        "total_amount": ("Total amount", lambda q: _money(q.total_amount)),
        "valid_until": ("Valid until", lambda q: _date(q.valid_until)),
        "event_date": ("Event date", lambda q: _date(q.event_date)),
        "cake_type": ("Cake type", lambda q: _text(q.cake_type)),
    },
    "order_confirmed": {
        "customer_name": ("Customer name", lambda o: _text(o.customer_name)),
        "order_no": ("Order number", lambda o: _text(o.order_no)),
        "delivery_date": ("Delivery date", lambda o: _date(o.delivery_date)),
        "total_amount": ("Total amount", lambda o: _money(o.total_amount)),
    },
    "follow_up": {
        "customer_name": ("Customer name", lambda l: _text(l.customer_name)),
        "lead_no": ("Lead number", lambda l: _text(l.lead_no)),
        "follow_up_date": ("Follow-up date", lambda l: _date(l.follow_up_date)),
        "staff_name": ("Staff name", lambda l: _text(l.assigned_to.get_full_name() or l.assigned_to.username) if l.assigned_to else ""),
    },
    "out_for_delivery": {
        "customer_name": ("Customer name", lambda d: _text(d.order.customer_name)),
        "delivery_no": ("Delivery number", lambda d: _text(d.delivery_no)),
        "delivery_person_name": ("Delivery person", lambda d: _text(d.delivery_person_name_snapshot or d.pickup_person_name)),
        "tracking_link": ("Tracking link", lambda d: _text(d.tracking_link)),
    },
    "delivered": {
        "customer_name": ("Customer name", lambda d: _text(d.order.customer_name)),
        "delivery_no": ("Delivery number", lambda d: _text(d.delivery_no)),
        "delivered_at": ("Delivered on", lambda d: _date(d.completed_at)),
    },
    "invoice_generated": {
        "customer_name": ("Customer name", lambda i: _text(i.customer_name)),
        "invoice_no": ("Invoice number", lambda i: _text(i.invoice_no)),
        "total_amount": ("Total amount", lambda i: _money(i.total_amount)),
        "balance_amount": ("Balance due", lambda i: _money(i.balance_amount)),
    },
    "payment_reminder": {
        "customer_name": ("Customer name", lambda i: _text(i.customer_name)),
        "invoice_no": ("Invoice number", lambda i: _text(i.invoice_no)),
        "balance_amount": ("Balance due", lambda i: _money(i.balance_amount)),
    },
}

RECIPIENT_FOR_EVENT = {
    "quotation_sent": lambda q: q.phone,
    "order_confirmed": _order_recipient,
    "follow_up": _lead_recipient,
    "out_for_delivery": _delivery_recipient,
    "delivered": _delivery_recipient,
    "invoice_generated": lambda i: i.phone,
    "payment_reminder": lambda i: i.phone,
}

LABEL_FOR_EVENT = {
    "quotation_sent": lambda q: q.quotation_no,
    "order_confirmed": lambda o: o.order_no,
    "follow_up": lambda l: l.lead_no,
    "out_for_delivery": lambda d: d.delivery_no,
    "delivered": lambda d: d.delivery_no,
    "invoice_generated": lambda i: i.invoice_no,
    "payment_reminder": lambda i: i.invoice_no,
}

CUSTOMER_NAME_FOR_EVENT = {
    "quotation_sent": lambda q: q.customer_name,
    "order_confirmed": lambda o: o.customer_name,
    "follow_up": lambda l: l.customer_name,
    "out_for_delivery": lambda d: d.order.customer_name,
    "delivered": lambda d: d.order.customer_name,
    "invoice_generated": lambda i: i.customer_name,
    "payment_reminder": lambda i: i.customer_name,
}

SOURCE_MODEL_FOR_EVENT = {
    "quotation_sent": "quotation",
    "order_confirmed": "crmorder",
    "follow_up": "lead",
    "out_for_delivery": "crmdelivery",
    "delivered": "crmdelivery",
    "invoice_generated": "crminvoice",
    "payment_reminder": "crminvoice",
}


MODEL_FOR_EVENT = {
    "quotation_sent": ("crm", "Quotation"),
    "order_confirmed": ("crm", "CRMOrder"),
    "follow_up": ("crm", "Lead"),
    "out_for_delivery": ("crm", "CRMDelivery"),
    "delivered": ("crm", "CRMDelivery"),
    "invoice_generated": ("crm", "CRMInvoice"),
    "payment_reminder": ("crm", "CRMInvoice"),
}


def resolve_variables(event_key, variable_map, record):
    """variable_map is {"1": "customer_name", ...}; returns {"1": "Priya", ...}."""
    fields = FIELDS_FOR_EVENT.get(event_key, {})
    resolved = {}
    for position, field_key in (variable_map or {}).items():
        entry = fields.get(field_key)
        resolved[position] = entry[1](record) if entry else ""
    return resolved
