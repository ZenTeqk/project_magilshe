"""Per-event variable sources for WhatsApp templates.

Each event key here matches one of whatsapp.models.EVENT_CHOICES. A
template assigned to an event can only map its {{n}} placeholders to the
field keys registered for that event -- this is what lets the Templates
page offer a dropdown of real fields instead of free text, and what keeps
a template from being assigned variables that don't exist on the record
that will actually trigger it.

Adding a new trigger point later means: one entry in EVENT_CHOICES (and
AUTO_SENDABLE_EVENTS / EVENT_GROUPS), one entry each in FIELDS_FOR_EVENT and
SOURCE_MODEL_FOR_EVENT below, and one call to services.trigger_event() at
the point in crm/views.py where that status actually changes.
"""

from datetime import date, datetime

from django.utils import timezone


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


def _customer_name(customer):
    return _text(customer.get_full_name() or customer.first_name) if customer else ""


def _occasion_name(event):
    """"Birthdays" -> "birthday", for "your birthday is coming up"."""
    from crm.recurring_events import occasion_key
    return occasion_key(event.event_type)


def _occasion_date(event):
    return event.next_occurrence(timezone.localdate()).strftime("%d %b")


_QUOTATION_BASE = {
    "customer_name": ("Customer name", lambda q: _text(q.customer_name)),
    "quotation_no": ("Quotation number", lambda q: _text(q.quotation_no)),
}
_ORDER_BASE = {
    "customer_name": ("Customer name", lambda o: _text(o.customer_name)),
    "order_no": ("Order number", lambda o: _text(o.order_no)),
}

FIELDS_FOR_EVENT = {
    "quotation_sent": {
        **_QUOTATION_BASE,
        "total_amount": ("Total amount", lambda q: _money(q.total_amount)),
        "valid_until": ("Valid until", lambda q: _date(q.valid_until)),
        "event_date": ("Event date", lambda q: _date(q.event_date)),
        "cake_type": ("Cake type", lambda q: _text(q.cake_type)),
    },
    "quotation_accepted": {
        **_QUOTATION_BASE,
        "total_amount": ("Total amount", lambda q: _money(q.total_amount)),
        "valid_until": ("Valid until", lambda q: _date(q.valid_until)),
        "event_date": ("Event date", lambda q: _date(q.event_date)),
    },
    "quotation_advance_received": {
        **_QUOTATION_BASE,
        "advance_amount": ("Advance paid", lambda q: _money(q.advance_amount)),
        "balance_amount": ("Balance due", lambda q: _money(q.balance_amount)),
        "total_amount": ("Total amount", lambda q: _money(q.total_amount)),
    },
    "quotation_cancelled": {
        **_QUOTATION_BASE,
    },
    "order_confirmed": {
        **_ORDER_BASE,
        "delivery_date": ("Delivery date", lambda o: _date(o.delivery_date)),
        "total_amount": ("Total amount", lambda o: _money(o.total_amount)),
    },
    "order_processing": {
        **_ORDER_BASE,
        "cake_type": ("Cake type", lambda o: _text(o.cake_type)),
        "delivery_date": ("Delivery date", lambda o: _date(o.delivery_date)),
    },
    "order_ready": {
        **_ORDER_BASE,
        "balance_amount": ("Balance due", lambda o: _money(o.balance_amount)),
        "delivery_date": ("Delivery date", lambda o: _date(o.delivery_date)),
    },
    "order_cancelled": {
        **_ORDER_BASE,
        "cancellation_reason": ("Cancellation reason", lambda o: _text(o.cancellation_reason)),
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
    "occasion_reminder": {
        "customer_name": ("Customer name", lambda e: _customer_name(e.customer)),
        "occasion": ("Occasion (e.g. birthday)", _occasion_name),
        "occasion_date": ("Occasion date (e.g. 19 Oct)", _occasion_date),
        "days_until": ("Days to go", lambda e: str((e.next_occurrence(timezone.localdate()) - timezone.localdate()).days)),
    },
}

# What each kind of CRM record needs for sending and logging, described
# once per record type rather than once per event.
_RECORD_TYPES = {
    "quotation": {
        "model": ("crm", "Quotation"),
        "recipient": lambda q: q.phone,
        "label": lambda q: q.quotation_no,
        "customer_name": lambda q: q.customer_name,
    },
    "crmorder": {
        "model": ("crm", "CRMOrder"),
        "recipient": _order_recipient,
        "label": lambda o: o.order_no,
        "customer_name": lambda o: o.customer_name,
    },
    "lead": {
        "model": ("crm", "Lead"),
        "recipient": _lead_recipient,
        "label": lambda l: l.lead_no,
        "customer_name": lambda l: l.customer_name,
    },
    "crmdelivery": {
        "model": ("crm", "CRMDelivery"),
        "recipient": _delivery_recipient,
        "label": lambda d: d.delivery_no,
        "customer_name": lambda d: d.order.customer_name,
    },
    "crminvoice": {
        "model": ("crm", "CRMInvoice"),
        "recipient": lambda i: i.phone,
        "label": lambda i: i.invoice_no,
        "customer_name": lambda i: i.customer_name,
    },
    "customerevent": {
        "model": ("crm", "CustomerRecurringEvent"),
        "recipient": lambda e: e.customer.phone,
        "label": lambda e: f"{e.event_type} {_occasion_date(e)}",
        "customer_name": lambda e: _customer_name(e.customer),
    },
}

SOURCE_MODEL_FOR_EVENT = {
    "quotation_sent": "quotation",
    "quotation_accepted": "quotation",
    "quotation_advance_received": "quotation",
    "quotation_cancelled": "quotation",
    "order_confirmed": "crmorder",
    "order_processing": "crmorder",
    "order_ready": "crmorder",
    "order_cancelled": "crmorder",
    "follow_up": "lead",
    "out_for_delivery": "crmdelivery",
    "delivered": "crmdelivery",
    "invoice_generated": "crminvoice",
    "payment_reminder": "crminvoice",
    "occasion_reminder": "customerevent",
}

RECIPIENT_FOR_EVENT = {e: _RECORD_TYPES[t]["recipient"] for e, t in SOURCE_MODEL_FOR_EVENT.items()}
LABEL_FOR_EVENT = {e: _RECORD_TYPES[t]["label"] for e, t in SOURCE_MODEL_FOR_EVENT.items()}
CUSTOMER_NAME_FOR_EVENT = {e: _RECORD_TYPES[t]["customer_name"] for e, t in SOURCE_MODEL_FOR_EVENT.items()}
MODEL_FOR_EVENT = {e: _RECORD_TYPES[t]["model"] for e, t in SOURCE_MODEL_FOR_EVENT.items()}


def resolve_variables(event_key, variable_map, record):
    """variable_map is {"1": "customer_name", ...}; returns {"1": "Priya", ...}."""
    fields = FIELDS_FOR_EVENT.get(event_key, {})
    resolved = {}
    for position, field_key in (variable_map or {}).items():
        entry = fields.get(field_key)
        resolved[position] = entry[1](record) if entry else ""
    return resolved
