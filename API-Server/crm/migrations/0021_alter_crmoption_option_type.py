from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0020_customerrecurringevent_notes_and_more")]

    operations = [
        migrations.AlterField(
            model_name="crmoption",
            name="option_type",
            field=models.CharField(
                choices=[
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
                    ("tax_setting", "Tax Setting"),
                    ("order_cancellation_reason", "Order Cancellation Reason"),
                ],
                db_index=True,
                max_length=30,
            ),
        ),
    ]
