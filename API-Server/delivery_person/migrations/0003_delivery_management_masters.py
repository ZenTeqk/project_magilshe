from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("delivery_person", "0002_alter_deliveryperson_status")]
    operations = [
        migrations.AddField(model_name="deliveryperson", name="staff_id", field=models.CharField(blank=True, editable=False, max_length=30, null=True, unique=True)),
        migrations.AddField(model_name="deliveryperson", name="alternate_phone", field=models.CharField(blank=True, max_length=15, null=True)),
        migrations.AddField(model_name="deliveryperson", name="service_area", field=models.CharField(blank=True, max_length=300, null=True)),
        migrations.AddField(model_name="deliveryperson", name="joining_date", field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name="deliveryperson", name="notes", field=models.TextField(blank=True, null=True)),
        migrations.CreateModel(name="DeliveryPlatform", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("name", models.CharField(max_length=150, unique=True)),
            ("contact_information", models.TextField(blank=True, null=True)),
            ("status", models.BooleanField(default=True)),
            ("notes", models.TextField(blank=True, null=True)),
            ("created_on", models.DateTimeField(auto_now_add=True)),
            ("updated_on", models.DateTimeField(auto_now=True)),
        ], options={"ordering": ("name",), "default_permissions": ()}),
        migrations.CreateModel(name="ExternalDeliveryPerson", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("partner_id", models.CharField(blank=True, editable=False, max_length=30, null=True, unique=True)),
            ("name", models.CharField(max_length=300)),
            ("phone", models.CharField(max_length=15)),
            ("alternate_phone", models.CharField(blank=True, max_length=15, null=True)),
            ("vehicle_type", models.CharField(blank=True, max_length=100, null=True)),
            ("vehicle_number", models.CharField(blank=True, max_length=100, null=True)),
            ("service_area", models.CharField(blank=True, max_length=300, null=True)),
            ("status", models.BooleanField(default=True)),
            ("notes", models.TextField(blank=True, null=True)),
            ("created_on", models.DateTimeField(auto_now_add=True)),
            ("updated_on", models.DateTimeField(auto_now=True)),
            ("platform", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="drivers", to="delivery_person.deliveryplatform")),
        ], options={"ordering": ("name",), "default_permissions": ()}),
    ]
