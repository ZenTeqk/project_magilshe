from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0019_order_direct_and_cancellation'),
    ]

    operations = [
        migrations.AddField(
            model_name='customerrecurringevent',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customerrecurringevent',
            name='reminder_days_before',
            field=models.PositiveSmallIntegerField(default=7),
        ),
    ]
