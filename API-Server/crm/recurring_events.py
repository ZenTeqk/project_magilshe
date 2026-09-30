from datetime import date, timedelta

from .models import CRMOption, CRMOrder, CustomerRecurringEvent, Lead, Quotation

RECURRING_KEYWORDS = (
    ("birthday", "Birthday"),
    ("anniversary", "Anniversary"),
    ("wedding", "Wedding"),
    ("baby shower", "Baby Shower"),
    ("corporate", "Corporate Event"),
)


def match_recurring_event_type(occasion):
    raw_text = str(occasion or "").strip()
    text = raw_text.lower()
    configured = CRMOption.objects.filter(option_type="occasion", is_active=True)
    for option in configured:
        if option.name.strip().lower() == text:
            return option.name.strip()
    for keyword, label in RECURRING_KEYWORDS:
        if keyword in text:
            return label
    return None


def event_type_for_occasion(occasion):
    """Every occasion becomes a customer event: known recurring occasions are
    normalised to their label, anything else keeps the entered text."""
    matched = match_recurring_event_type(occasion)
    if matched:
        return matched[:50]
    return str(occasion or "").strip()[:50] or "Other"


def _event_details(source):
    """(customer_id, event_date, occasion, notes, own link field, source links)
    for a Lead, Quotation or CRMOrder."""
    if isinstance(source, Lead):
        return (
            source.customer_id, source.event_date, source.occasion, source.event_notes,
            "source_lead", {"source_lead": source},
        )
    if isinstance(source, Quotation):
        lead = source.lead
        return (
            source.customer_id, source.event_date or (lead.event_date if lead else None),
            source.occasion or (lead.occasion if lead else None),
            lead.event_notes if lead else None,
            "source_quotation", {"source_quotation": source, "source_lead": lead},
        )
    if isinstance(source, CRMOrder):
        quotation = source.quotation
        lead = quotation.lead if quotation else None
        occasion = (quotation.occasion if quotation else None) or (lead.occasion if lead else None)
        return (
            source.customer_id, source.event_date, occasion,
            lead.event_notes if lead else None,
            "source_order", {"source_order": source, "source_quotation": quotation, "source_lead": lead},
        )
    raise TypeError(f"Unsupported customer event source: {type(source).__name__}")


def sync_recurring_event(source, create=True):
    """Records/refreshes the customer event for a Lead, Quotation or CRMOrder.

    The event already linked to this source is moved when its date/occasion
    changes (instead of leaving a stale duplicate behind). With create=False
    only an existing event is updated/linked, so an event staff deleted from
    the Customer Events tab is not silently recreated."""
    customer_id, event_date, occasion, notes, own_field, links = _event_details(source)
    if not customer_id or not event_date:
        return None
    key = {
        "customer_id": customer_id,
        "event_type": event_type_for_occasion(occasion),
        "event_month": event_date.month,
        "event_day": event_date.day,
    }
    linked = CustomerRecurringEvent.objects.filter(**{own_field: source}).first()
    existing = CustomerRecurringEvent.objects.filter(**key).first()
    if linked and existing and linked.pk != existing.pk:
        # The source moved onto an event that already exists: merge into it.
        linked.delete()
        linked = None
    event = existing or linked
    if event is None:
        if not create:
            return None
        event = CustomerRecurringEvent()
    for field, value in key.items():
        setattr(event, field, value)
    event.original_date = event_date
    if notes:
        event.notes = notes
    for field, value in links.items():
        if value is not None and (field == own_field or getattr(event, f"{field}_id") is None):
            setattr(event, field, value)
    event.save()
    return event


def recurring_event_status(event, today=None):
    """Upcoming / Reminder Due / Overdue / Completed, derived purely from dates
    already on the model (no extra "completed" flag needed): a reminder counts
    as completed for the *current* cycle if, on the day it was last sent, the
    event's own next_occurrence() calculation already pointed at the same
    upcoming date we're evaluating now — i.e. it wasn't sent for a past cycle."""
    today = today or date.today()
    next_occurrence = event.next_occurrence(today)
    reminder_date = next_occurrence - timedelta(days=event.reminder_days_before)
    completed = bool(
        event.last_reminder_sent_on
        and event.next_occurrence(event.last_reminder_sent_on) == next_occurrence
    )
    # next_occurrence() always rolls forward to be >= today, so "overdue" can
    # only mean "the event day itself has arrived and nobody actioned it yet".
    if completed:
        status = "Completed"
    elif today >= next_occurrence:
        status = "Overdue"
    elif today >= reminder_date:
        status = "Reminder Due"
    else:
        status = "Upcoming"
    return next_occurrence, reminder_date, completed, status


def recurring_event_summary(event, today=None):
    today = today or date.today()
    next_occurrence, reminder_date, completed, status = recurring_event_status(event, today)
    return {
        "id": event.id,
        "event_type": event.event_type,
        "source_lead": event.source_lead_id,
        "source_lead_no": event.source_lead.lead_no if event.source_lead_id else None,
        "source_quotation": event.source_quotation_id,
        "source_quotation_no": event.source_quotation.quotation_no if event.source_quotation_id else None,
        "source_order": event.source_order_id,
        "source_order_no": event.source_order.order_no if event.source_order_id else None,
        "original_date": event.original_date,
        "notes": event.notes,
        "reminder_days_before": event.reminder_days_before,
        "next_occurrence": next_occurrence,
        "reminder_date": reminder_date,
        "days_until": (next_occurrence - today).days,
        "last_reminder_sent_on": event.last_reminder_sent_on,
        "is_completed": completed,
        "status": status,
    }
