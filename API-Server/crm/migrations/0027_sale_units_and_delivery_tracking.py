from django.db import migrations, models


def seed_units_and_normalize(apps, schema_editor):
    Lead = apps.get_model("crm", "Lead")
    QuotationItem = apps.get_model("crm", "QuotationItem")
    CRMOrderItem = apps.get_model("crm", "CRMOrderItem")
    CRMOption = apps.get_model("crm", "CRMOption")
    for model in (Lead, QuotationItem, CRMOrderItem):
        model.objects.filter(unit_type="Weight").update(unit_type="kg")
        model.objects.filter(unit_type="Piece").update(unit_type="piece")
    for order, name in enumerate(("kg", "piece")):
        CRMOption.objects.get_or_create(
            option_type="sale_unit", name=name,
            defaults={"sort_order": order, "is_active": True},
        )


class Migration(migrations.Migration):
    dependencies = [("crm", "0026_crm_sale_units")]

    operations = [
        migrations.AlterField(
            model_name="lead", name="unit_type",
            field=models.CharField(default="kg", max_length=30),
        ),
        migrations.AlterField(
            model_name="quotationitem", name="unit_type",
            field=models.CharField(default="kg", max_length=30),
        ),
        migrations.AlterField(
            model_name="crmorderitem", name="unit_type",
            field=models.CharField(default="kg", max_length=30),
        ),
        migrations.AlterField(
            model_name="crmoption", name="option_type",
            field=models.CharField(choices=[
                ("occasion", "Occasion"), ("cake_type", "Cake Type"),
                ("cake_flavour", "Cake Flavour"), ("cake_product", "Cake Product"),
                ("product_rate", "Product Rate"), ("lead_source", "Lead Source"),
                ("winning_reason", "Winning Reason"), ("loss_reason", "Loss Reason"),
                ("quotation_status", "Quotation Status"), ("payment_term", "Payment Term"),
                ("quotation_validity", "Quotation Validity"), ("order_status", "Order Status"),
                ("production_status", "Production Status"), ("delivery_method", "Delivery Method"),
                ("delivery_time_slot", "Delivery Time Slot"), ("delivery_area", "Delivery Area"),
                ("delivery_failure_reason", "Delivery Failure Reason"),
                ("order_priority", "Order Priority"), ("invoice_status", "Invoice Status"),
                ("payment_method", "Payment Method"), ("invoice_term", "Invoice Term"),
                ("tax_setting", "Tax Setting"), ("sale_unit", "Unit"),
                ("order_cancellation_reason", "Order Cancellation Reason"),
            ], db_index=True, max_length=30),
        ),
        migrations.AddField(
            model_name="crmdelivery", name="tracking_link",
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.RunPython(seed_units_and_normalize, migrations.RunPython.noop),
    ]
