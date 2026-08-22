from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("customer", "0011_split_customer_data_and_analytics_permissions")]

    operations = [
        migrations.AddField(
            model_name="customeraddress",
            name="person_name",
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        migrations.AddField(
            model_name="customeraddress",
            name="phone",
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
    ]
