from rest_framework.permissions import BasePermission


PERMISSION_DEFINITIONS = {
    "crm.dashboard": ("CRM", "Dashboard", ("view",)),
    "crm.leads": ("CRM", "Leads", ("view", "create", "edit", "delete", "import", "process")),
    "crm.quotations": ("CRM", "Quotations", ("view", "create", "edit", "delete", "process", "record_payment")),
    "crm.orders": ("CRM", "Orders", ("view", "create", "edit", "process", "cancel")),
    "crm.invoices": ("CRM", "Invoices", ("view", "edit", "process", "record_payment")),
    "crm.delivery": ("CRM", "Delivery", ("view", "edit", "process")),
    "crm.settings": ("CRM", "CRM Settings", ("view", "configure")),
    "customers.data": ("Customer Data", "Customers, History & 360", ("view", "create", "edit", "delete")),
    "customers.analytics": ("Customer Analytics", "Customer Dashboard", ("view",)),
    "catalog": ("Catalog", "Catalog", ("view", "create", "edit", "delete")),
    "operations": ("Operations", "Store Operations", ("view", "create", "edit", "delete", "process")),
    "marketing": ("Marketing", "Marketing", ("view", "create", "edit", "delete")),
    "reports": ("Reports", "Reports", ("view", "export")),
    "configuration": ("Configuration", "Configuration", ("view", "edit")),
    "rbac.users": ("Administration", "Users", ("view", "create", "edit", "deactivate")),
    "rbac.roles": ("Administration", "Roles", ("view", "create", "edit", "delete", "configure")),
}


def all_permission_codes():
    return [f"{resource}.{action}" for resource, (_, _, actions) in PERMISSION_DEFINITIONS.items() for action in actions]


def is_super_admin(user):
    """Single source of truth for unrestricted administrative access."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(
        user.role_id and user.role.is_active and user.role.is_super_admin
    )


def effective_permissions(user):
    if not user or not user.is_authenticated:
        return set()
    if is_super_admin(user):
        return set(all_permission_codes())
    if not user.is_staff or not user.role_id or not user.role.is_active:
        return set()
    return set(user.role.permissions.values_list("code", flat=True))


def required_permission(request, view):
    path = request.path.strip("/")
    # CRM option values populate operational form dropdowns. Reading them must
    # not require access to the Settings page; mutations remain configure-only.
    if path.startswith("crm/options") and request.method == "GET":
        return None
    action = getattr(view, "action", None)
    method_action = {"GET": "view", "POST": "create", "PUT": "edit", "PATCH": "edit", "DELETE": "delete"}.get(request.method, "view")
    custom = {
        "workflow_action": "process", "convert": "process", "confirm_order": "process",
        "generate_invoice": "process", "move_to_delivery": "process", "payment_completed": "process",
        "record_payment": "record_payment",
        "import_file": "import", "cancel_order": "cancel", "partial_update": "edit", "update": "edit",
    }
    permission_action = custom.get(action, method_action)
    if action == "analytics":
        return "customers.analytics.view"
    if action == "customer_search":
        return "customers.data.view"
    if action == "save_customer_address":
        return "customers.data.edit"
    mappings = (
        ("customer/rbac/users", "rbac.users"), ("customer/rbac/roles", "rbac.roles"),
        ("customer/rbac/permissions", "rbac.roles"),
        ("crm/leads", "crm.leads"), ("crm/quotations", "crm.quotations"), ("crm/orders", "crm.orders"),
        ("crm/invoices", "crm.invoices"), ("crm/deliveries", "crm.delivery"), ("crm/options", "crm.settings"),
        ("crm/customers", "customers.data"), ("crm/customer-events", "customers.data"), ("crm", "crm.dashboard"),
        ("reports", "reports"), ("configuration", "configuration"),
        ("cake", "catalog"), ("category", "catalog"), ("tag", "catalog"), ("gallery", "catalog"),
        ("unit", "catalog"), ("kg", "catalog"), ("items", "catalog"),
        ("order", "operations"), ("purchase", "operations"), ("delivery-person", "operations"),
        ("testimonial", "operations"), ("banner", "marketing"), ("event", "marketing"),
    )
    for prefix, resource in mappings:
        if path.startswith(prefix):
            if resource == "crm.settings" and permission_action != "view": permission_action = "configure"
            return f"{resource}.{permission_action}"
    return None


class HasRBACPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if is_super_admin(request.user):
            return True
        code = required_permission(request, view)
        if code is None:
            return True
        return code in effective_permissions(request.user)
