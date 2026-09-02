from rest_framework_simplejwt.authentication import JWTAuthentication


class RBACJWTAuthentication(JWTAuthentication):
    """Authenticate JWTs only. Authorization is enforced once, after DRF has
    resolved the real view/action, by customer.rbac.HasRBACPermission."""
