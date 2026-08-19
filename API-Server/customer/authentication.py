from types import SimpleNamespace
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from .rbac import effective_permissions, required_permission


class RBACJWTAuthentication(JWTAuthentication):
    """JWT remains unchanged; staff authorization is checked from the database
    on every request, including views that explicitly declare IsAuthenticated."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        if not user.is_staff:
            return result
        url_name = getattr(getattr(request, "resolver_match", None), "url_name", "") or ""
        action = None
        for marker, mapped in (
            ("workflow-action", "workflow_action"), ("record-payment", "record_payment"),
            ("confirm-order", "confirm_order"), ("generate-invoice", "generate_invoice"),
            ("move-to-delivery", "move_to_delivery"), ("import", "import_file"),
            ("complete-follow-up", "workflow_action"), ("follow-up-note", "workflow_action"),
            ("/convert/", "workflow_action"),
        ):
            if marker in url_name or marker in request.path:
                action = mapped
                break
        code = required_permission(request, SimpleNamespace(action=action))
        if code and code not in effective_permissions(user):
            raise PermissionDenied("You do not have permission to perform this action.")
        return user, token
