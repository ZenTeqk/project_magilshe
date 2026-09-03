from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0029_backfill_quotation_version_item_amounts")]

    operations = [
        migrations.AlterField(
            model_name="crminvoice",
            name="status",
            field=models.CharField(
                choices=[
                    ("Generated", "Generated"), ("Issued", "Issued"),
                    ("Paid", "Paid"), ("Closed", "Closed"),
                    ("Cancelled", "Cancelled"),
                ],
                default="Generated", max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="crmdelivery",
            name="delivery_status",
            field=models.CharField(
                choices=[
                    ("Pending", "Pending"),
                    ("Out for Delivery", "Out for Delivery"),
                    ("Delivered Successfully", "Delivered Successfully"),
                    ("Damaged During Delivery", "Damaged During Delivery"),
                    ("Delivery Failed", "Delivery Failed"),
                    ("Cancelled", "Cancelled"),
                ],
                default="Pending", max_length=30,
            ),
        ),
    ]
