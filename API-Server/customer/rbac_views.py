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
from crm.models import CRMDelivery, CRMInvoice, CRMOrder, Lead, Quotation

logger = logging.getLogger("cakery")


class StaffUserViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_staff=True).select_related("role").order_by("-id")
    serializer_class = StaffUserSerializer
    http_method_names = ("get", "post", "put", "patch", "delete", "head", "options")

    def get_queryset(self):
        queryset = super().get_queryset()
        archived = str(self.request.query_params.get("archived") or "").lower() in {"1", "true", "yes"}
        if self.action in {
            "restore",
            "permanent_delete",
            "deletion_dependencies_action",
            "clear_deletion_dependencies",
        }:
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

    @staticmethod
    def deletion_dependencies(user):
        links = [
            {
                "label": "Assigned leads",
                "count": user.assigned_crm_leads.count(),
                "records": [
                    {**record, "record_type": "leads"}
                    for record in user.assigned_crm_leads.order_by("-id").values("id", "lead_no", "customer_name", "status")[:20]
                ],
            },
            {
                "label": "Created quotations",
                "count": user.created_crm_quotations.count(),
                "records": [
                    {**record, "record_type": "quotations"}
                    for record in user.created_crm_quotations.order_by("-id").values("id", "quotation_no", "customer_name", "status")[:20]
                ],
            },
            {
                "label": "Assigned quotations",
                "count": user.assigned_crm_quotations.count(),
                "records": [
                    {**record, "record_type": "quotations"}
                    for record in user.assigned_crm_quotations.order_by("-id").values("id", "quotation_no", "customer_name", "status")[:20]
                ],
            },
            {
                "label": "Assigned orders",
                "count": user.assigned_crm_orders.count(),
                "records": [
                    {**record, "record_type": "orders"}
                    for record in user.assigned_crm_orders.order_by("-id").values("id", "order_no", "customer_name", "status")[:20]
                ],
            },
            {
                "label": "Generated invoices",
                "count": user.generated_crm_invoices.count(),
                "records": [
                    {**record, "record_type": "invoices"}
                    for record in user.generated_crm_invoices.order_by("-id").values("id", "invoice_no", "customer_name", "status")[:20]
                ],
            },
        ]
        links = [link for link in links if link["count"]]
        return {"has_dependencies": bool(links), "links": links}

    @staticmethod
    def protected_error_dependencies(exc):
        protected = list(getattr(exc, "protected_objects", []) or [])
        records = []
        for obj in protected[:20]:
            record = {"id": getattr(obj, "pk", None), "message": str(obj)}
            if isinstance(obj, Lead):
                record.update({"lead_no": obj.lead_no, "customer_name": obj.customer_name, "status": obj.status, "record_type": "leads"})
            elif isinstance(obj, Quotation):
                record.update({"quotation_no": obj.quotation_no, "customer_name": obj.customer_name, "status": obj.status, "record_type": "quotations"})
            elif isinstance(obj, CRMOrder):
                record.update({"order_no": obj.order_no, "customer_name": obj.customer_name, "status": obj.status, "record_type": "orders"})
            elif isinstance(obj, CRMInvoice):
                record.update({"invoice_no": obj.invoice_no, "customer_name": obj.customer_name, "status": obj.status, "record_type": "invoices"})
            elif isinstance(obj, CRMDelivery):
                record.update({"delivery_no": obj.delivery_no, "customer_name": obj.recipient_name, "status": obj.delivery_status, "record_type": "deliveries"})
            records.append(record)
        return {
            "has_dependencies": bool(records),
            "links": [{"label": "Protected related records", "count": len(protected), "records": records}] if records else [],
        }

    @action(detail=True, methods=["get"], url_path="deletion-dependencies")
    def deletion_dependencies_action(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can inspect delete blockers."}, status=status.HTTP_403_FORBIDDEN)
        return Response(self.deletion_dependencies(self.get_object()))

    @action(detail=True, methods=["post"], url_path="clear-deletion-dependencies")
    def clear_deletion_dependencies(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can clear delete blockers."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        if user == request.user or user.is_superuser or (user.role_id and user.role.is_super_admin):
            return Response({"message": "A protected Super Admin account cannot be cleared for deletion."}, status=409)
        confirmation = str(request.data.get("confirmation") or "")
        if confirmation != "CLEAR USER LINKS":
            return Response({"message": "Type CLEAR USER LINKS to confirm clearing user links."}, status=400)
        counts = {
            "assigned_leads": user.assigned_crm_leads.update(assigned_to=None),
            "created_quotations": user.created_crm_quotations.update(created_by=None),
            "assigned_quotations": user.assigned_crm_quotations.update(sales_staff=None),
            "assigned_orders": user.assigned_crm_orders.update(assigned_staff=None),
            "generated_invoices": user.generated_crm_invoices.update(generated_by=None),
        }
        return Response({"message": "User links cleared. Business records were kept.", "counts": counts})

    @action(detail=True, methods=["delete"], url_path="permanent-delete")
    def permanent_delete(self, request, pk=None):
        if not is_super_admin(request.user):
            return Response({"detail": "Only Super Admin can permanently delete users."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        if user == request.user or user.is_superuser or (user.role_id and user.role.is_super_admin):
            return Response({"message": "A protected Super Admin account cannot be permanently deleted."}, status=409)
        dependencies = self.deletion_dependencies(user)
        if dependencies["has_dependencies"]:
            return Response({
                "message": "User cannot be permanently deleted because they own CRM history. Clear linked CRM records first.",
                "dependencies": dependencies,
            }, status=409)
        try:
            user.delete()
        except ProtectedError as exc:
            return Response({
                "message": "User cannot be permanently deleted because protected business records reference it. Clear linked CRM records first.",
                "dependencies": self.protected_error_dependencies(exc),
            }, status=409)
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
