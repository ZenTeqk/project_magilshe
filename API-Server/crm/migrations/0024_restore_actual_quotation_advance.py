from django.db import migrations
from django.db.models import Sum


def restore_actual_advances(apps, schema_editor):
    Quotation = apps.get_model("crm", "Quotation")
    for quotation in Quotation.objects.filter(crm_order__isnull=False).select_related("crm_order"):
        actual = quotation.payments.filter(
            created_on__lte=quotation.crm_order.confirmed_on
        ).aggregate(total=Sum("amount"))["total"] or 0
        if quotation.advance_amount != actual:
            quotation.advance_amount = actual
            quotation.advance_received = actual > 0
            quotation.save(update_fields=("advance_amount", "advance_received"))


class Migration(migrations.Migration):
    dependencies = [("crm", "0023_mark_zero_balance_invoices_paid")]
    operations = [migrations.RunPython(restore_actual_advances, migrations.RunPython.noop)]
