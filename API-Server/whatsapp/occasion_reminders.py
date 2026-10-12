"""Birthday / anniversary reminders sent ahead of a customer's occasion.

Which occasions are due comes straight from crm.recurring_events: an event
is due once its reminder date (occasion minus reminder_days_before, 7 by
default) has arrived and nothing has been sent for this year's occurrence.
Sending stamps last_reminder_sent_on, which is what moves the event to
Completed -- so each occasion gets at most one reminder a year, whether it
was sent from the review page or by the daily job.
"""

from django.db import transaction
from django.utils import timezone

from crm.models import CustomerCommunicationLog, CustomerRecurringEvent
from crm.recurring_events import occasion_key, recurring_event_status

from .models import MessageLog, MessageTemplate, OptOut, WhatsAppSettings
from .services import WhatsAppError, phone_key, send_template_message

EVENT_KEY = "occasion_reminder"


def reminder_template():
    """The one Active template for occasion reminders, or None. Like status
    auto-sends, two Active templates is ambiguous and sends nothing."""
    templates = list(MessageTemplate.objects.filter(event=EVENT_KEY, status=MessageTemplate.STATUS_APPROVED)[:2])
    return templates[0] if len(templates) == 1 else None


def due_reminders(today=None):
    """Every occasion of a selected type whose reminder is due today, nearest
    occasion first. Rows that can't be sent stay in the list with a reason,
    so staff can see why a customer was skipped."""
    today = today or timezone.localdate()
    types = set(WhatsAppSettings.load().occasion_reminder_types or [])
    if not types:
        return []
    opted_out = set(OptOut.objects.values_list("phone", flat=True))
    events = CustomerRecurringEvent.objects.select_related("customer").filter(
        customer__is_active=True, customer__archived_at__isnull=True,
    )
    rows = []
    for event in events:
        if occasion_key(event.event_type) not in types:
            continue
        next_occurrence, _, _, status = recurring_event_status(event, today)
        if status != "Reminder Due":
            continue
        customer = event.customer
        phone = customer.phone or ""
        if not phone:
            blocked = "No phone number"
        elif phone_key(phone) in opted_out:
            blocked = "Replied STOP"
        else:
            blocked = ""
        rows.append({
            "event": event,
            "id": event.id,
            "customer_id": customer.id,
            "customer_name": customer.get_full_name() or customer.first_name or customer.username,
            "phone": phone,
            "occasion": event.event_type,
            "occasion_date": next_occurrence,
            "days_until": (next_occurrence - today).days,
            "blocked_reason": blocked,
        })
    rows.sort(key=lambda row: (row["occasion_date"], row["customer_name"].lower()))
    return rows


def send_reminder(event, template, user=None, today=None):
    """Sends one occasion's reminder; returns its MessageLog, or None if it
    was no longer due (already sent from another tab or by the daily job).

    The event is marked sent *before* calling Meta, under a row lock, so two
    overlapping runs can't both message the customer. A failed send puts the
    old date back so the reminder is tried again on the next run.
    """
    today = today or timezone.localdate()
    with transaction.atomic():
        event = CustomerRecurringEvent.objects.select_for_update().select_related("customer").get(pk=event.pk)
        if recurring_event_status(event, today)[3] != "Reminder Due":
            return None
        previous = event.last_reminder_sent_on
        event.last_reminder_sent_on = today
        event.save(update_fields=["last_reminder_sent_on", "updated_on"])

    log = send_template_message(template=template, record=event, event_key=EVENT_KEY, user=user)
    if log.status == MessageLog.STATUS_FAILED:
        event.last_reminder_sent_on = previous
        event.save(update_fields=["last_reminder_sent_on", "updated_on"])
    else:
        CustomerCommunicationLog.objects.create(
            customer=event.customer, channel="whatsapp", subject=f"{event.event_type} reminder",
            message=f"WhatsApp template {template.name}", recurring_event=event, staff=user,
        )
    return log


def send_due_reminders(user=None, ids=None, today=None):
    """Sends every sendable due reminder (or only `ids`, if given) and
    returns {"sent": n, "failed": n, "skipped": n}."""
    template = reminder_template()
    if template is None:
        raise WhatsAppError("Occasion reminders need exactly one Active template assigned to Occasion Reminder.")
    wanted = set(ids) if ids is not None else None
    counts = {"sent": 0, "failed": 0, "skipped": 0}
    for row in due_reminders(today):
        if wanted is not None and row["id"] not in wanted:
            continue
        if row["blocked_reason"]:
            counts["skipped"] += 1
            continue
        log = send_reminder(row["event"], template, user=user, today=today)
        if log is None:
            counts["skipped"] += 1
        elif log.status == MessageLog.STATUS_FAILED:
            counts["failed"] += 1
        else:
            counts["sent"] += 1
    return counts
