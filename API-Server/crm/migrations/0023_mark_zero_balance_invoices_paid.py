from django.db import migrations


def mark_zero_balance_invoices_paid(apps, schema_editor):
    CRMInvoice = apps.get_model("crm", "CRMInvoice")
    CRMInvoice.objects.filter(
        balance_amount__lte=0,
        status__in=("Generated", "Issued"),
    ).update(status="Paid")


class Migration(migrations.Migration):
    dependencies = [("crm", "0022_delivery_assignment_masters")]

    operations = [migrations.RunPython(mark_zero_balance_invoices_paid, migrations.RunPython.noop)]
