from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("whatsapp", "0003_occasion_reminders_app_secret_optout"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappsettings",
            name="app_id",
            field=models.CharField(blank=True, max_length=64, verbose_name="Meta App ID"),
        ),
        migrations.AddField(
            model_name="messagetemplate",
            name="header_media_key",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="messagetemplate",
            name="header_media_filename",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
