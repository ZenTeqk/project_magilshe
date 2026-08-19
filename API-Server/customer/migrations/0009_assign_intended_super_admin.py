from django.db import migrations


INTENDED_ADMIN_EMAIL = "esakkiappan191@gmail.com"


def assign_intended_super_admin(apps, schema_editor):
    Customer = apps.get_model("customer", "Customer")
    AccessRole = apps.get_model("customer", "AccessRole")
    role = AccessRole.objects.filter(is_super_admin=True, is_active=True).first()
    if role is None:
        return
    Customer.objects.filter(email__iexact=INTENDED_ADMIN_EMAIL).update(
        is_active=True,
        is_staff=True,
        is_superuser=True,
        role_id=role.id,
    )


class Migration(migrations.Migration):
    dependencies = [("customer", "0008_accesspermission_accessrole_customer_role")]

    operations = [migrations.RunPython(assign_intended_super_admin, migrations.RunPython.noop)]
