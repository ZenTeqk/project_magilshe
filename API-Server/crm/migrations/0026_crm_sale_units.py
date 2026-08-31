from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0025_crmdelivery_customer_address")]

    operations = [
        migrations.AlterField(
            model_name="lead", name="quantity",
            field=models.DecimalField(decimal_places=3, default=1, max_digits=10),
        ),
        migrations.AddField(
            model_name="lead", name="unit_type",
            field=models.CharField(
                choices=[("Weight", "Weight"), ("Piece", "Piece"), ("Slice", "Slice")],
                default="Weight", max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="quotation", name="quantity",
            field=models.DecimalField(blank=True, decimal_places=3, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name="quotationitem", name="quantity",
            field=models.DecimalField(decimal_places=3, default=1, max_digits=10),
        ),
        migrations.AddField(
            model_name="quotationitem", name="unit_type",
            field=models.CharField(
                choices=[("Weight", "Weight"), ("Piece", "Piece"), ("Slice", "Slice")],
                default="Weight", max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="crmorder", name="quantity",
            field=models.DecimalField(decimal_places=3, default=1, max_digits=10),
        ),
        migrations.AlterField(
            model_name="crmorderitem", name="quantity",
            field=models.DecimalField(decimal_places=3, default=1, max_digits=10),
        ),
        migrations.AddField(
            model_name="crmorderitem", name="unit_type",
            field=models.CharField(
                choices=[("Weight", "Weight"), ("Piece", "Piece"), ("Slice", "Slice")],
                default="Weight", max_length=10,
            ),
        ),
    ]
