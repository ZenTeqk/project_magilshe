from django.db import migrations


ROLE_PROFILES = {
    "CRM Staff": {
        "description": "Sales pipeline access without separate customer, catalog, reporting, configuration or administration access.",
        "permissions": (
            "crm.dashboard.view",
            "crm.leads.view", "crm.leads.create", "crm.leads.edit", "crm.leads.process",
            "crm.quotations.view", "crm.quotations.create", "crm.quotations.edit", "crm.quotations.process",
            "crm.orders.view", "crm.invoices.view", "crm.delivery.view",
        ),
    },
    "CRM Manager": {
        "description": "Full CRM pipeline management, including CRM settings, without global administration or configuration.",
        "permissions": tuple(),
    },
    "Customer Service": {
        "description": "Customer management and customer-related lead and follow-up access.",
        "permissions": (
            "customers.view", "customers.create", "customers.edit",
            "crm.leads.view", "crm.leads.create", "crm.leads.edit", "crm.leads.process",
        ),
    },
    "Accounts / Finance": {
        "description": "Quotations, orders, invoices, payments and financial reporting.",
        "permissions": (
            "crm.dashboard.view", "crm.quotations.view", "crm.quotations.edit", "crm.quotations.process", "crm.quotations.record_payment",
            "crm.orders.view", "crm.invoices.view", "crm.invoices.edit", "crm.invoices.process", "crm.invoices.record_payment",
            "reports.view", "reports.export",
        ),
    },
    "Operations Staff": {
        "description": "Order fulfilment, delivery, catalog visibility and store operations.",
        "permissions": (
            "crm.orders.view", "crm.orders.edit", "crm.orders.process",
            "crm.delivery.view", "crm.delivery.edit", "crm.delivery.process",
            "catalog.view", "operations.view", "operations.create", "operations.edit", "operations.process",
        ),
    },
    "Delivery Staff": {
        "description": "Minimal delivery workflow and related order visibility.",
        "permissions": ("crm.orders.view", "crm.delivery.view", "crm.delivery.edit", "crm.delivery.process"),
    },
    "Catalog / Inventory Staff": {
        "description": "Catalog, product and inventory maintenance.",
        "permissions": ("catalog.view", "catalog.create", "catalog.edit", "catalog.delete"),
    },
    "Marketing Staff": {
        "description": "Offers, banners, events and relevant reporting.",
        "permissions": ("marketing.view", "marketing.create", "marketing.edit", "marketing.delete", "reports.view"),
    },
    "Reporting / Management": {
        "description": "Dashboard and reporting visibility without operational editing.",
        "permissions": ("crm.dashboard.view", "reports.view", "reports.export"),
    },
}


def seed_role_profiles(apps, schema_editor):
    AccessRole = apps.get_model("customer", "AccessRole")
    AccessPermission = apps.get_model("customer", "AccessPermission")
    crm_codes = list(AccessPermission.objects.filter(module="CRM").values_list("code", flat=True))
    for name, profile in ROLE_PROFILES.items():
        role, created = AccessRole.objects.get_or_create(
            name=name,
            defaults={"description": profile["description"], "is_active": True},
        )
        if not created:
            continue
        codes = crm_codes if name == "CRM Manager" else profile["permissions"]
        role.permissions.set(AccessPermission.objects.filter(code__in=codes))


class Migration(migrations.Migration):
    dependencies = [("customer", "0009_assign_intended_super_admin")]

    operations = [migrations.RunPython(seed_role_profiles, migrations.RunPython.noop)]
