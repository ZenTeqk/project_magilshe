from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customer", "0006_customer_profile_picture_ext_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["phone"], name="customer_phone_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["email"], name="customer_email_idx"),
        ),
        migrations.AddIndex(
            model_name="customer",
            index=models.Index(fields=["first_name", "last_name"], name="customer_name_idx"),
        ),
    ]
