from django.db import migrations, models
import django.db.models.deletion


DEFINITIONS = {
    "crm.dashboard": ("CRM", "Dashboard", ("view",)),
    "crm.leads": ("CRM", "Leads", ("view", "create", "edit", "delete", "import", "process")),
    "crm.quotations": ("CRM", "Quotations", ("view", "create", "edit", "delete", "process", "record_payment")),
    "crm.orders": ("CRM", "Orders", ("view", "create", "edit", "process", "cancel")),
    "crm.invoices": ("CRM", "Invoices", ("view", "edit", "process", "record_payment")),
    "crm.delivery": ("CRM", "Delivery", ("view", "edit", "process")),
    "crm.settings": ("CRM", "CRM Settings", ("view", "configure")),
    "customers": ("Customers", "Customers", ("view", "create", "edit", "delete")),
    "catalog": ("Catalog", "Catalog", ("view", "create", "edit", "delete")),
    "operations": ("Operations", "Store Operations", ("view", "create", "edit", "delete", "process")),
    "marketing": ("Marketing", "Marketing", ("view", "create", "edit", "delete")),
    "reports": ("Reports", "Reports", ("view", "export")),
    "configuration": ("Configuration", "Configuration", ("view", "edit")),
    "rbac.users": ("Administration", "Users", ("view", "create", "edit", "deactivate")),
    "rbac.roles": ("Administration", "Roles", ("view", "create", "edit", "delete", "configure")),
}


def seed_rbac(apps, schema_editor):
    Permission = apps.get_model("customer", "AccessPermission")
    Role = apps.get_model("customer", "AccessRole")
    Customer = apps.get_model("customer", "Customer")
    permissions = []
    for resource_code, (module, resource, actions) in DEFINITIONS.items():
        for action in actions:
            code = f"{resource_code}.{action}"
            permission, _ = Permission.objects.get_or_create(code=code, defaults={"module": module, "resource": resource, "action": action, "name": f"{resource} — {action.replace('_', ' ').title()}"})
            permissions.append(permission)
    role, _ = Role.objects.get_or_create(name="Super Admin", defaults={"description": "Full platform access. Protected system role.", "is_active": True, "is_super_admin": True})
    role.permissions.set(permissions)
    Customer.objects.filter(is_staff=True).update(role=role)


class Migration(migrations.Migration):
    dependencies = [("customer", "0007_customer_lookup_indexes")]
    operations = [
        migrations.CreateModel(name="AccessPermission", fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("code", models.CharField(db_index=True, max_length=120, unique=True)), ("module", models.CharField(db_index=True, max_length=60)), ("resource", models.CharField(db_index=True, max_length=60)), ("action", models.CharField(max_length=40)), ("name", models.CharField(max_length=160))], options={"ordering": ("module", "resource", "action"), "default_permissions": ()}),
        migrations.CreateModel(name="AccessRole", fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("name", models.CharField(max_length=100, unique=True)), ("description", models.TextField(blank=True)), ("is_active", models.BooleanField(default=True)), ("is_super_admin", models.BooleanField(default=False)), ("created_on", models.DateTimeField(auto_now_add=True)), ("updated_on", models.DateTimeField(auto_now=True)), ("permissions", models.ManyToManyField(blank=True, related_name="roles", to="customer.accesspermission"))], options={"ordering": ("name",), "default_permissions": ()}),
        migrations.AddField(model_name="customer", name="role", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users", to="customer.accessrole")),
        migrations.RunPython(seed_rbac, migrations.RunPython.noop),
    ]
