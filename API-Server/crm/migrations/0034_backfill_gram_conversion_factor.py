from decimal import Decimal
from django.db import migrations

GRAM_ALIASES = {"g", "gm", "gms", "gram", "grams"}


def backfill_gram_factor(apps, schema_editor):
    CRMOption = apps.get_model("crm", "CRMOption")
    for option in CRMOption.objects.filter(option_type="sale_unit"):
        if option.name.strip().lower() in GRAM_ALIASES:
            option.conversion_factor = Decimal("0.001")
            option.save(update_fields=["conversion_factor"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0033_crmoption_conversion_factor"),
    ]

    operations = [
        migrations.RunPython(backfill_gram_factor, noop),
    ]
