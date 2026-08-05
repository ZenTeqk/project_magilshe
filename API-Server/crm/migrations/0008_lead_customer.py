from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("crm", "0007_expand_crm_option_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="customer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="crm_leads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
