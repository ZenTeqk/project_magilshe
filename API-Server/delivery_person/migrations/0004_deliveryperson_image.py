from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("delivery_person", "0003_delivery_management_masters")]

    operations = [
        migrations.AddField(
            model_name="deliveryperson",
            name="image_name",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="deliveryperson",
            name="image_ext",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
