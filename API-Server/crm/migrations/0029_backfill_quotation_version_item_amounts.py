from decimal import Decimal, ROUND_HALF_UP
from django.db import migrations


def add_saved_item_amounts(apps, schema_editor):
    Version = apps.get_model("crm", "QuotationVersion")
    for version in Version.objects.all().iterator():
        snapshot = version.snapshot or {}
        items = snapshot.get("items") or []
        changed = False
        for item in items:
            if item.get("amount") is not None:
                continue
            quantity = Decimal(str(item.get("quantity") or 0))
            rate = Decimal(str(item.get("rate") or 0))
            gst_rate = Decimal(str(item.get("gst_percentage") or 0))
            subtotal = (quantity * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            gst_amount = (subtotal * gst_rate / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            item["subtotal"] = str(subtotal)
            item["amount"] = str(subtotal)
            item["gst_amount"] = str(gst_amount)
            changed = True
        if changed:
            snapshot["items"] = items
            version.snapshot = snapshot
            version.save(update_fields=("snapshot",))


class Migration(migrations.Migration):
    dependencies = [("crm", "0028_quotationversion")]
    operations = [migrations.RunPython(add_saved_item_amounts, migrations.RunPython.noop)]
