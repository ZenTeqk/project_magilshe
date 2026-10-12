"""Stores every customer occasion under one spelling.

Imported and older events were saved as "Birthday", "Other", ... while the
CRM Settings occasion list (and so every newer event) says "Birthdays",
"Others", ... -- which split one occasion into two for filtering and
reminders, and left some customers with the same birthday twice. Each event
is renamed to its matching CRM Settings occasion; when that collides with an
event the customer already has on the same day, the two are merged.

The matching logic is copied from crm.recurring_events (not imported) so this
migration keeps working if that module changes later.
"""

from django.db import migrations

KEYWORDS = (
    ("birthday", "Birthday"),
    ("anniversar", "Anniversary"),
    ("wedding", "Wedding"),
    ("engagement", "Engagement"),
    ("baby shower", "Baby Shower"),
    ("corporate", "Corporate Event"),
)
LINK_FIELDS = ("source_lead_id", "source_quotation_id", "source_order_id")


def occasion_key(name):
    text = " ".join(str(name or "").lower().split())
    if text.endswith("ies"):
        return text[:-3] + "y"
    if text.endswith("s") and not text.endswith("ss"):
        return text[:-1]
    return text


def normalise(apps, schema_editor):
    CRMOption = apps.get_model("crm", "CRMOption")
    Event = apps.get_model("crm", "CustomerRecurringEvent")
    CommunicationLog = apps.get_model("crm", "CustomerCommunicationLog")

    configured = {
        occasion_key(name): name.strip()
        for name in CRMOption.objects.filter(option_type="occasion", is_active=True).values_list("name", flat=True)
    }

    def canonical(event_type):
        if occasion_key(event_type) in configured:
            return configured[occasion_key(event_type)]
        text = str(event_type or "").lower()
        for keyword, label in KEYWORDS:
            if keyword in text:
                return configured.get(occasion_key(label), label)
        return event_type

    for event in Event.objects.order_by("id"):
        target = canonical(event.event_type)
        if target == event.event_type:
            continue
        keeper = Event.objects.filter(
            customer_id=event.customer_id, event_type=target,
            event_month=event.event_month, event_day=event.event_day,
        ).exclude(pk=event.pk).first()
        if keeper is None:
            event.event_type = target
            event.save(update_fields=["event_type"])
            continue
        # Same customer, same occasion, same day: fold this one into keeper.
        for field in LINK_FIELDS:
            if getattr(keeper, field) is None and getattr(event, field) is not None:
                setattr(keeper, field, getattr(event, field))
        if not keeper.notes and event.notes:
            keeper.notes = event.notes
        if event.last_reminder_sent_on and (
            keeper.last_reminder_sent_on is None or event.last_reminder_sent_on > keeper.last_reminder_sent_on
        ):
            keeper.last_reminder_sent_on = event.last_reminder_sent_on
        keeper.save()
        CommunicationLog.objects.filter(recurring_event_id=event.pk).update(recurring_event_id=keeper.pk)
        event.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0036_customer_event_quotation_order_sources"),
    ]

    operations = [
        migrations.RunPython(normalise, migrations.RunPython.noop),
    ]
