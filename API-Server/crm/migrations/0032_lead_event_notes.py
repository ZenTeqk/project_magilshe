from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0031_crmdelivery_archived_at_crmdelivery_archived_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="event_notes",
            field=models.TextField(blank=True, null=True),
        ),
    ]
