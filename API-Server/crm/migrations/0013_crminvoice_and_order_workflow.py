from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("crm", "0012_quotation_customer_type_quotation_delivery_date_and_more"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AlterField(model_name="crmorder", name="status", field=models.CharField(choices=[("Confirmed","Confirmed"),("Production","Production"),("Ready","Ready"),("Out for Delivery","Out for Delivery"),("Invoice Generated","Invoice Generated"),("Delivery","Delivery"),("Delivered","Delivered"),("Completed","Completed"),("Cancelled","Cancelled")], default="Confirmed", max_length=30)),
        migrations.CreateModel(name="CRMInvoice", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("invoice_no", models.CharField(editable=False, max_length=30, unique=True)),
            ("customer_name", models.CharField(max_length=300)), ("phone", models.CharField(max_length=15)),
            ("address", models.TextField(blank=True, null=True)), ("subtotal", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
            ("gst_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)), ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
            ("amount_paid", models.DecimalField(decimal_places=2, default=0, max_digits=12)), ("balance_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
            ("status", models.CharField(choices=[("Generated","Generated"),("Issued","Issued"),("Paid","Paid")], default="Generated", max_length=20)),
            ("generated_on", models.DateTimeField(auto_now_add=True)), ("updated_on", models.DateTimeField(auto_now=True)),
            ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="crm_invoices", to="customer.customer")),
            ("generated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="generated_crm_invoices", to=settings.AUTH_USER_MODEL)),
            ("order", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="invoice", to="crm.crmorder")),
        ], options={"ordering": ("-id",)}),
    ]
