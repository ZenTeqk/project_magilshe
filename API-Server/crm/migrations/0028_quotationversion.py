from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


SNAPSHOT_FIELDS = (
    "id", "quotation_no", "customer_id", "customer_name", "phone", "email",
    "billing_address", "shipping_same_as_billing", "address", "cake_id", "cake_type",
    "flavour", "quantity", "event_date", "notes", "rate", "gst_enabled",
    "gst_percentage", "subtotal", "gst_amount", "total_amount", "payment_terms",
    "valid_until", "status", "advance_received", "advance_amount", "payment_date",
    "payment_method", "transaction_reference", "created_on", "customer_type",
    "occasion", "delivery_date", "delivery_time", "delivery_type",
    "special_instructions", "discount_amount", "sales_staff_id",
)


def _json_value(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def backfill_versions(apps, schema_editor):
    Quotation = apps.get_model("crm", "Quotation")
    Version = apps.get_model("crm", "QuotationVersion")
    Item = apps.get_model("crm", "QuotationItem")
    for quotation in Quotation.objects.all().iterator():
        snapshot = {}
        for field in SNAPSHOT_FIELDS:
            key = field[:-3] if field.endswith("_id") else field
            snapshot[key] = _json_value(getattr(quotation, field, None))
        if not snapshot.get("billing_address"):
            snapshot["billing_address"] = snapshot.get("address")
        snapshot["items"] = [
            {
                "id": item.id, "item_name": item.item_name,
                "description": item.description, "flavour": item.flavour,
                "weight": _json_value(item.weight), "quantity": _json_value(item.quantity),
                "unit_type": item.unit_type, "rate": _json_value(item.rate),
                "gst_percentage": _json_value(item.gst_percentage),
                "sort_order": item.sort_order,
            }
            for item in Item.objects.filter(quotation_id=quotation.id).order_by("sort_order", "id")
        ]
        Version.objects.create(
            quotation_id=quotation.id, version_number=1, snapshot=snapshot,
            total_amount=quotation.total_amount or 0, generated_by_id=quotation.created_by_id,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0027_sale_units_and_delivery_tracking"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="QuotationVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version_number", models.PositiveIntegerField()),
                ("snapshot", models.JSONField()),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("generated_on", models.DateTimeField(auto_now_add=True)),
                ("generated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="generated_crm_quotation_versions", to=settings.AUTH_USER_MODEL)),
                ("quotation", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="versions", to="crm.quotation")),
            ],
            options={"ordering": ("-version_number",)},
        ),
        migrations.AddConstraint(
            model_name="quotationversion",
            constraint=models.UniqueConstraint(fields=("quotation", "version_number"), name="unique_crm_quotation_version"),
        ),
        migrations.RunPython(backfill_versions, migrations.RunPython.noop),
    ]
