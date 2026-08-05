from datetime import date

from .models import CustomerRecurringEvent

RECURRING_KEYWORDS = (
    ("birthday", "Birthday"),
    ("anniversary", "Anniversary"),
    ("wedding", "Wedding"),
    ("baby shower", "Baby Shower"),
    ("corporate", "Corporate Event"),
)


def match_recurring_event_type(occasion):
    text = str(occasion or "").strip().lower()
    for keyword, label in RECURRING_KEYWORDS:
        if keyword in text:
            return label
    return None


def sync_recurring_event(lead):
    """Detects a recurring occasion on a Lead and records/refreshes it for one-click reminders next year."""
    if not lead.customer_id or not lead.event_date:
        return None
    event_type = match_recurring_event_type(lead.occasion)
    if not event_type:
        return None
    event, _ = CustomerRecurringEvent.objects.update_or_create(
        customer_id=lead.customer_id, event_type=event_type,
        event_month=lead.event_date.month, event_day=lead.event_date.day,
        defaults={"original_date": lead.event_date, "source_lead": lead},
    )
    return event


def recurring_event_summary(event, today=None):
    today = today or date.today()
    next_occurrence = event.next_occurrence(today)
    return {
        "id": event.id,
        "event_type": event.event_type,
        "original_date": event.original_date,
        "next_occurrence": next_occurrence,
        "days_until": (next_occurrence - today).days,
        "last_reminder_sent_on": event.last_reminder_sent_on,
    }
