from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers
from .models import AccessPermission, AccessRole, Customer
from .rbac import effective_permissions


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPermission
        fields = ("id", "code", "module", "resource", "action", "name")


class RoleSerializer(serializers.ModelSerializer):
    permission_codes = serializers.SlugRelatedField(source="permissions", slug_field="code", queryset=AccessPermission.objects.all(), many=True, required=False)
    users_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = AccessRole
        fields = ("id", "name", "description", "is_active", "is_super_admin", "permission_codes", "users_count", "created_on", "updated_on")
        read_only_fields = ("is_super_admin", "created_on", "updated_on")

    def validate(self, attrs):
        if self.instance and self.instance.is_super_admin and attrs.get("is_active") is False:
            raise serializers.ValidationError({"is_active": "The Super Admin role cannot be deactivated."})
        actor = self.context["request"].user
        requested = attrs.get("permissions")
        if requested is not None and not (actor.is_superuser or (actor.role_id and actor.role.is_super_admin)):
            actor_codes = effective_permissions(actor)
            unauthorized = [permission.code for permission in requested if permission.code not in actor_codes]
            if unauthorized:
                raise serializers.ValidationError({"permission_codes": "You cannot grant permissions you do not hold."})
        return attrs


class StaffUserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True, allow_null=True)
    role = serializers.PrimaryKeyRelatedField(queryset=AccessRole.objects.filter(is_active=True), allow_null=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ("id", "username", "first_name", "last_name", "email", "phone", "role", "role_name", "is_active", "is_staff", "date_joined", "last_login", "password", "permissions")
        read_only_fields = ("is_staff", "date_joined", "last_login", "permissions")

    def get_permissions(self, obj):
        return sorted(effective_permissions(obj))

    def validate_role(self, role):
        actor = self.context["request"].user
        if role.is_super_admin and not (actor.is_superuser or (actor.role_id and actor.role.is_super_admin)):
            raise serializers.ValidationError("Only a Super Admin can assign the Super Admin role.")
        return role

    def validate_phone(self, value):
        digits = "".join(c for c in str(value or "") if c.isdigit())
        if len(digits) == 12 and digits.startswith("91"): digits = digits[2:]
        if not digits or len(digits) != 10 or digits[0] not in "6789":
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        qs = Customer.objects.filter(phone=digits)
        if self.instance: qs = qs.exclude(pk=self.instance.pk)
        if qs.exists(): raise serializers.ValidationError("Another account uses this mobile number.")
        return digits

    def validate(self, attrs):
        password = attrs.get("password")
        if not self.instance and not password:
            raise serializers.ValidationError({"password": "A password is required."})
        if password: password_validation.validate_password(password, self.instance)
        if self.instance and self.instance.is_superuser:
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({"is_active": "A protected Super Admin account cannot be deactivated."})
            requested_role = attrs.get("role")
            if requested_role is not None and not requested_role.is_super_admin:
                raise serializers.ValidationError({"role": "A protected Super Admin account cannot be assigned a restricted role."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Customer(**validated_data, is_staff=True)
        user.set_password(password); user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items(): setattr(instance, field, value)
        if password: instance.set_password(password)
        instance.save(); return instance
