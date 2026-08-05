from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def combine_date_time(delivery_date, delivery_time):
    from datetime import datetime, time as time_cls
    from django.utils import timezone
    if not delivery_date:
        return None
    naive = datetime.combine(delivery_date, delivery_time or time_cls(0, 0))
    return timezone.make_aware(naive) if timezone.is_naive(naive) else naive


def forwards(apps, schema_editor):
    CRMDelivery = apps.get_model("crm", "CRMDelivery")
    type_map = {"Store Pickup": "Customer Pickup", "Home Delivery": "Magilshe Delivery"}
    status_map = {"In Progress": "Out for Delivery", "Completed": "Delivered Successfully"}
    for delivery in CRMDelivery.objects.all():
        delivery.delivery_type = type_map.get(delivery.delivery_type, delivery.delivery_type or "Magilshe Delivery")
        delivery.delivery_status = status_map.get(delivery.delivery_status, delivery.delivery_status or "Pending")
        scheduled = combine_date_time(delivery.legacy_delivery_date, delivery.legacy_delivery_time)
        if scheduled:
            if delivery.delivery_type == "Customer Pickup":
                delivery.pickup_time = scheduled
            else:
                delivery.delivery_time = scheduled
        if delivery.delivery_status == "Delivered Successfully" and not delivery.completed_at:
            delivery.completed_at = delivery.updated_on
        delivery.save()


def backwards(apps, schema_editor):
    # One-way data migration: old split date/time columns are dropped by this
    # migration and are not reconstructed on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("delivery_person", "0001_initial"),
        ("crm", "0016_customerrecurringevent_customercommunicationlog_and_more"),
    ]

    operations = [
        # Free up the "delivery_time"/"delivery_date" names by parking the old
        # columns under a legacy name until the data migration has read them.
        migrations.RenameField(model_name="crmdelivery", old_name="delivery_time", new_name="legacy_delivery_time"),
        migrations.RenameField(model_name="crmdelivery", old_name="delivery_date", new_name="legacy_delivery_date"),

        migrations.RenameField(model_name="crmdelivery", old_name="method", new_name="delivery_type"),
        migrations.RenameField(model_name="crmdelivery", old_name="status", new_name="delivery_status"),
        migrations.RenameField(model_name="crmdelivery", old_name="address", new_name="delivery_location"),
        migrations.RenameField(model_name="crmdelivery", old_name="notes", new_name="delivery_notes"),
        migrations.RenameField(model_name="crmdelivery", old_name="delivery_staff", new_name="delivery_person"),

        migrations.AlterField(
            model_name="crmdelivery",
            name="delivery_type",
            field=models.CharField(choices=[("Customer Pickup", "Customer Pickup"), ("Magilshe Delivery", "Magilshe Delivery"), ("Porter Delivery", "Porter Delivery")], default="Magilshe Delivery", max_length=30),
        ),
        migrations.AlterField(
            model_name="crmdelivery",
            name="delivery_status",
            field=models.CharField(choices=[("Pending", "Pending"), ("Out for Delivery", "Out for Delivery"), ("Delivered Successfully", "Delivered Successfully"), ("Damaged During Delivery", "Damaged During Delivery"), ("Delivery Failed", "Delivery Failed")], default="Pending", max_length=30),
        ),
        migrations.AlterField(
            model_name="crmdelivery",
            name="delivery_person",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="crm_deliveries", to="delivery_person.deliveryperson"),
        ),

        migrations.AddField(model_name="crmdelivery", name="pickup_person_type", field=models.CharField(blank=True, choices=[("Customer", "Customer"), ("Family Member", "Family Member"), ("Friend", "Friend"), ("Other", "Other")], max_length=20, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_person_relationship", field=models.CharField(blank=True, max_length=100, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_person_name", field=models.CharField(blank=True, max_length=300, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_contact", field=models.CharField(blank=True, max_length=15, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_time", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_location", field=models.CharField(blank=True, default="Bakery", max_length=300, null=True)),
        migrations.AddField(model_name="crmdelivery", name="pickup_notes", field=models.TextField(blank=True, null=True)),

        migrations.AddField(model_name="crmdelivery", name="delivery_time", field=models.DateTimeField(blank=True, null=True)),

        migrations.AddField(model_name="crmdelivery", name="porter_id", field=models.CharField(blank=True, max_length=100, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_name", field=models.CharField(blank=True, max_length=300, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_contact", field=models.CharField(blank=True, max_length=15, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_location", field=models.TextField(blank=True, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_time", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_amount", field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
        migrations.AddField(model_name="crmdelivery", name="porter_notes", field=models.TextField(blank=True, null=True)),

        migrations.AddField(model_name="crmdelivery", name="completed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="crmdelivery", name="damage_description", field=models.TextField(blank=True, null=True)),
        migrations.AddField(model_name="crmdelivery", name="failure_reason", field=models.CharField(blank=True, max_length=255, null=True)),

        migrations.RunPython(forwards, backwards),

        migrations.RemoveField(model_name="crmdelivery", name="legacy_delivery_time"),
        migrations.RemoveField(model_name="crmdelivery", name="legacy_delivery_date"),

        migrations.CreateModel(
            name="CRMDeliveryDamageImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file_name", models.UUIDField()),
                ("file_ext", models.CharField(max_length=10)),
                ("original_name", models.CharField(max_length=255)),
                ("created_on", models.DateTimeField(auto_now_add=True)),
                ("delivery", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="damage_images", to="crm.crmdelivery")),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
