import logging
from rest_framework import mixins, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AccessPermission, AccessRole, Customer
from .rbac import effective_permissions, is_super_admin
from .rbac_serializers import PermissionSerializer, RoleSerializer, StaffUserSerializer

logger = logging.getLogger("cakery")


class StaffUserViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_staff=True).select_related("role").order_by("-id")
    serializer_class = StaffUserSerializer
    http_method_names = ("get", "post", "put", "patch", "head", "options")

    def perform_create(self, serializer):
        user = serializer.save(); logger.info("RBAC user created actor=%s user=%s", self.request.user.id, user.id)

    def perform_update(self, serializer):
        before = serializer.instance.role_id; user = serializer.save()
        logger.info("RBAC user updated actor=%s user=%s role=%s->%s active=%s", self.request.user.id, user.id, before, user.role_id, user.is_active)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = AccessRole.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer

    def perform_create(self, serializer):
        role = serializer.save(); logger.info("RBAC role created actor=%s role=%s", self.request.user.id, role.id)

    def perform_update(self, serializer):
        role = serializer.save(); logger.info("RBAC role updated actor=%s role=%s", self.request.user.id, role.id)

    def perform_destroy(self, instance):
        if instance.is_super_admin or instance.users.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("A protected or assigned role cannot be deleted.")
        logger.info("RBAC role deleted actor=%s role=%s", self.request.user.id, instance.id); instance.delete()


class PermissionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = AccessPermission.objects.all()
    serializer_class = PermissionSerializer


@api_view(["GET"])
def current_access(request):
    user = request.user
    codes = sorted(effective_permissions(user))
    details = PermissionSerializer(AccessPermission.objects.filter(code__in=codes), many=True).data
    return Response({"id": user.id, "email": user.email, "username": user.username, "name": user.get_full_name() or user.username, "role": user.role.name if user.role_id else None, "is_super_admin": is_super_admin(user), "permissions": codes, "permission_details": details})
