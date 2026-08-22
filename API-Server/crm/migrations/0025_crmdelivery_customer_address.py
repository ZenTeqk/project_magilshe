from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("customer", "0012_customeraddress_recipient_details"),
        ("crm", "0024_restore_actual_quotation_advance"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmdelivery",
            name="customer_address",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="crm_deliveries",
                to="customer.customeraddress",
            ),
        ),
    ]
