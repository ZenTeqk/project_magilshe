from django.db import migrations, models


DEFAULTS = {
    "occasion": ["Birthday", "Wedding", "Anniversary", "Engagement", "Corporate", "Other"],
    "cake_type": ["Custom Cake", "Theme Cake", "Photo Cake", "Tier Cake", "Cupcakes"],
    "cake_flavour": ["Chocolate", "Vanilla", "Red Velvet", "Butterscotch", "Black Forest", "Other"],
    "quotation_status": ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
    "payment_term": ["Advance required", "Full payment", "Pay on delivery"],
    "quotation_validity": ["3 days", "7 days", "14 days", "30 days"],
    "order_status": ["Pending", "Confirmed", "Completed", "Cancelled"],
    "production_status": ["Not started", "In production", "Ready"],
    "delivery_method": ["Pickup", "Home Delivery", "Venue Delivery"],
    "invoice_status": ["Draft", "Issued", "Paid", "Overdue", "Cancelled"],
    "payment_method": ["Cash", "Card", "UPI", "Bank Transfer"],
    "tax_setting": ["GST applicable", "Tax exempt"],
}


def seed_options(apps, schema_editor):
    CRMOption = apps.get_model("crm", "CRMOption")
    for option_type, names in DEFAULTS.items():
        for sort_order, name in enumerate(names):
            CRMOption.objects.get_or_create(
                option_type=option_type,
                name=name,
                defaults={"sort_order": sort_order, "is_active": True},
            )


class Migration(migrations.Migration):
    dependencies = [("crm", "0006_crmoption_crmoption_unique_crm_option_name_per_type")]

    operations = [
        migrations.AlterField(
            model_name="crmoption",
            name="option_type",
            field=models.CharField(
                choices=[
                    ("occasion", "Occasion"),
                    ("cake_type", "Cake Type"),
                    ("cake_flavour", "Cake Flavour"),
                    ("lead_source", "Lead Source"),
                    ("winning_reason", "Winning Reason"),
                    ("loss_reason", "Loss Reason"),
                    ("quotation_status", "Quotation Status"),
                    ("payment_term", "Payment Term"),
                    ("quotation_validity", "Quotation Validity"),
                    ("order_status", "Order Status"),
                    ("production_status", "Production Status"),
                    ("delivery_method", "Delivery Method"),
                    ("invoice_status", "Invoice Status"),
                    ("payment_method", "Payment Method"),
                    ("tax_setting", "Tax Setting"),
                ],
                db_index=True,
                max_length=30,
            ),
        ),
        migrations.RunPython(seed_options, migrations.RunPython.noop),
    ]
