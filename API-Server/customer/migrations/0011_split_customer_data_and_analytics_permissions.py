from django.db import migrations


NEW_PERMISSIONS = (
    ("customers.data.view", "Customer Data", "Customers, History & 360", "view", "Customers, History & 360 View"),
    ("customers.data.create", "Customer Data", "Customers, History & 360", "create", "Customers Create"),
    ("customers.data.edit", "Customer Data", "Customers, History & 360", "edit", "Customers Edit"),
    ("customers.data.delete", "Customer Data", "Customers, History & 360", "delete", "Customers Delete"),
    ("customers.analytics.view", "Customer Analytics", "Customer Dashboard", "view", "Customer Dashboard View"),
)


def split_customer_permissions(apps, schema_editor):
    AccessPermission = apps.get_model("customer", "AccessPermission")
    AccessRole = apps.get_model("customer", "AccessRole")
    created = {}
    for code, module, resource, action, name in NEW_PERMISSIONS:
        created[code], _ = AccessPermission.objects.get_or_create(
            code=code,
            defaults={"module": module, "resource": resource, "action": action, "name": name},
        )

    for action in ("view", "create", "edit", "delete"):
        old = AccessPermission.objects.filter(code=f"customers.{action}").first()
        if old:
            for role in old.roles.all():
                role.permissions.add(created[f"customers.data.{action}"])

    crm_staff = AccessRole.objects.filter(name="CRM Staff").first()
    if crm_staff:
        crm_staff.permissions.add(created["customers.data.view"])
    crm_manager = AccessRole.objects.filter(name="CRM Manager").first()
    if crm_manager:
        crm_manager.permissions.add(
            created["customers.data.view"], created["customers.data.create"], created["customers.data.edit"]
        )
    for role in AccessRole.objects.filter(is_super_admin=True):
        role.permissions.add(*created.values())

    AccessPermission.objects.filter(code__in=[
        "customers.view", "customers.create", "customers.edit", "customers.delete"
    ]).delete()


class Migration(migrations.Migration):
    dependencies = [("customer", "0010_seed_business_role_profiles")]

    operations = [migrations.RunPython(split_customer_permissions, migrations.RunPython.noop)]
