from datetime import date, timedelta

from .models import CRMOption, CustomerRecurringEvent

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
        defaults={
            "original_date": lead.event_date,
            "source_lead": lead,
            "notes": lead.event_notes,
        },
    )
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
