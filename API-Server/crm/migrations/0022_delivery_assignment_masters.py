from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("delivery_person", "0003_delivery_management_masters"), ("crm", "0021_alter_crmoption_option_type")]
    operations = [
        migrations.AddField(model_name="crmdelivery", name="delivery_person_name_snapshot", field=models.CharField(blank=True, max_length=300, null=True)),
        migrations.AddField(model_name="crmdelivery", name="delivery_person_phone_snapshot", field=models.CharField(blank=True, max_length=15, null=True)),
        migrations.AddField(model_name="crmdelivery", name="external_platform_name_snapshot", field=models.CharField(blank=True, max_length=150, null=True)),
        migrations.AddField(model_name="crmdelivery", name="external_person_name_snapshot", field=models.CharField(blank=True, max_length=300, null=True)),
        migrations.AddField(model_name="crmdelivery", name="external_person_phone_snapshot", field=models.CharField(blank=True, max_length=15, null=True)),
        migrations.AddField(model_name="crmdelivery", name="external_platform", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="crm_deliveries", to="delivery_person.deliveryplatform")),
        migrations.AddField(model_name="crmdelivery", name="external_delivery_person", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="crm_deliveries", to="delivery_person.externaldeliveryperson")),
    ]
