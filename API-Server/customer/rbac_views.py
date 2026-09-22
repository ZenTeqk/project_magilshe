import logging
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AccessPermission, AccessRole, Customer
from .rbac import effective_permissions, is_super_admin
from .rbac_serializers import PermissionSerializer, RoleSerializer, StaffUserSerializer

logger = logging.getLogger("cakery")


class StaffUserViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_staff=True).select_related("role").order_by("-id")
    serializer_class = StaffUserSerializer
    http_method_names = ("get", "post", "put", "patch", "delete", "head", "options")

    def get_queryset(self):
        queryset = super().get_queryset()
        archived = str(self.request.query_params.get("archived") or "").lower() in {"1", "true", "yes"}
        if self.action in {"restore", "permanent_delete"}:
            return queryset
        return queryset.filter(is_active=not archived) if (not archived or is_super_admin(self.request.user)) else queryset.none()

    def perform_create(self, serializer):
        user = serializer.save(); logger.info("RBAC user created actor=%s user=%s", self.request.user.id, user.id)

    def perform_update(self, serializer):
        before = serializer.instance.role_id; user = serializer.save()
        logger.info("RBAC user updated actor=%s user=%s role=%s->%s active=%s", self.request.user.id, user.id, before, user.role_id, user.is_active)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser or (user.role_id and user.role.is_super_admin):
            raise ValidationError("A protected Super Admin account cannot be archived.")
        user.is_active = False
        user.archived_at = timezone.now()
        user.archived_by = request.user
        user.save(update_fields=("is_active", "archived_at", "archived_by"))
        logger.info("RBAC user archived actor=%s user=%s", request.user.id, user.id)
        return Response({"message": "User archived."})

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can restore users."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = True
        user.archived_at = None
        user.archived_by = None
        user.save(update_fields=("is_active", "archived_at", "archived_by"))
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["delete"], url_path="permanent-delete")
    def permanent_delete(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can permanently delete users."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        if user == request.user or user.is_superuser or (user.role_id and user.role.is_super_admin):
            return Response({"message": "A protected Super Admin account cannot be permanently deleted."}, status=409)
        business_refs = (
            user.assigned_crm_leads.exists() or user.created_crm_quotations.exists() or
            user.assigned_crm_quotations.exists() or user.assigned_crm_orders.exists() or
            user.generated_crm_invoices.exists()
        )
        if business_refs:
            return Response({"message": "User cannot be permanently deleted because they own CRM history. Archive it instead."}, status=409)
        try:
            user.delete()
        except ProtectedError:
            return Response({"message": "User cannot be permanently deleted because protected business records reference it. Archive it instead."}, status=409)
        return Response(status=204)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = AccessRole.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        archived = str(self.request.query_params.get("archived") or "").lower() in {"1", "true", "yes"}
        if self.action in {"restore", "permanent_delete"}:
            return queryset
        return queryset.filter(is_active=not archived) if (not archived or is_super_admin(self.request.user)) else queryset.none()

    def perform_create(self, serializer):
        role = serializer.save(); logger.info("RBAC role created actor=%s role=%s", self.request.user.id, role.id)

    def perform_update(self, serializer):
        role = serializer.save(); logger.info("RBAC role updated actor=%s role=%s", self.request.user.id, role.id)

    def perform_destroy(self, instance):
        if instance.is_super_admin or instance.users.filter(is_active=True).exists():
            raise ValidationError("A protected or assigned role cannot be deleted.")
        logger.info("RBAC role deleted actor=%s role=%s", self.request.user.id, instance.id); instance.delete()

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_super_admin or role.users.filter(is_active=True).exists():
            raise ValidationError("A protected or assigned role cannot be archived.")
        role.is_active = False
        role.archived_at = timezone.now()
        role.archived_by = request.user
        role.save(update_fields=("is_active", "archived_at", "archived_by"))
        return Response({"message": "Role archived."})

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can restore roles."}, status=status.HTTP_403_FORBIDDEN)
        role = self.get_object()
        role.is_active = True
        role.archived_at = None
        role.archived_by = None
        role.save(update_fields=("is_active", "archived_at", "archived_by"))
        return Response(self.get_serializer(role).data)

    @action(detail=True, methods=["delete"], url_path="permanent-delete")
    def permanent_delete(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can permanently delete roles."}, status=status.HTTP_403_FORBIDDEN)
        role = self.get_object()
        if role.is_super_admin or role.users.exists():
            return Response({"message": "Role cannot be permanently deleted because it is protected or assigned to users."}, status=409)
        role.delete()
        return Response(status=204)


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = AccessPermission.objects.all()
    serializer_class = PermissionSerializer
    http_method_names = ("get", "post", "put", "patch", "delete", "head", "options")

    def destroy(self, request, *args, **kwargs):
        permission = self.get_object()
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can delete access permissions."}, status=status.HTTP_403_FORBIDDEN)
        if permission.roles.exists():
            return Response({"message": "Permission cannot be deleted because it is assigned to one or more roles."}, status=409)
        permission.delete()
        return Response(status=204)


@api_view(["GET"])
def current_access(request):
    user = request.user
    codes = sorted(effective_permissions(user))
    details = PermissionSerializer(AccessPermission.objects.filter(code__in=codes), many=True).data
    return Response({"id": user.id, "email": user.email, "username": user.username, "name": user.get_full_name() or user.username, "role": user.role.name if user.role_id else None, "is_super_admin": is_super_admin(user), "permissions": codes, "permission_details": details})
