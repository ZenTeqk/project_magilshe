from django.db import migrations


def forwards(apps, schema_editor):
    """0017 renamed address/notes to delivery_location/delivery_notes for every
    row regardless of the row's (also-just-remapped) delivery_type, so rows
    that became Customer Pickup ended up with their location/notes sitting in
    the Magilshe Delivery fields instead of the pickup ones. Move them over.
    """
    CRMDelivery = apps.get_model("crm", "CRMDelivery")
    pickups = CRMDelivery.objects.filter(delivery_type="Customer Pickup").exclude(delivery_location__isnull=True).exclude(delivery_location="")
    for delivery in pickups:
        if not delivery.pickup_location or delivery.pickup_location == "Bakery":
            delivery.pickup_location = delivery.delivery_location
        if not delivery.pickup_notes:
            delivery.pickup_notes = delivery.delivery_notes
        delivery.delivery_location = None
        delivery.delivery_notes = None
        delivery.save(update_fields=("pickup_location", "pickup_notes", "delivery_location", "delivery_notes"))


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0017_delivery_type_and_status_workflow"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
