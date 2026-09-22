from django.db import migrations


PERMISSION_CODE = "crm.orders.record_payment"
GRANTED_ROLES = ("Accounts / Finance", "CRM Manager")


def add_record_payment_permission(apps, schema_editor):
    AccessPermission = apps.get_model("customer", "AccessPermission")
    AccessRole = apps.get_model("customer", "AccessRole")

    permission, _ = AccessPermission.objects.get_or_create(
        code=PERMISSION_CODE,
        defaults={"module": "CRM", "resource": "Orders", "action": "record_payment", "name": "Orders — Record Payment"},
    )

    for name in GRANTED_ROLES:
        role = AccessRole.objects.filter(name=name).first()
        if role:
            role.permissions.add(permission)

    for role in AccessRole.objects.filter(is_super_admin=True):
        role.permissions.add(permission)


def remove_record_payment_permission(apps, schema_editor):
    AccessPermission = apps.get_model("customer", "AccessPermission")
    AccessPermission.objects.filter(code=PERMISSION_CODE).delete()


class Migration(migrations.Migration):
    dependencies = [("customer", "0012_customeraddress_recipient_details")]

    operations = [migrations.RunPython(add_record_payment_permission, remove_record_payment_permission)]
