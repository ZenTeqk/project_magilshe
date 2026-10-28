from rest_framework import serializers

from cakery.common import get_s3_file_url
from crm.recurring_events import occasion_key

from .event_fields import FIELDS_FOR_EVENT
from .models import MessageLog, MessageTemplate, WhatsAppSettings
from .services import (
    WhatsAppAPIError, WhatsAppError, clean_access_token, validate_template_payload, verify_connection,
)


class WhatsAppSettingsSerializer(serializers.ModelSerializer):
    # The access token is a secret: accepted on write, never echoed back on
    # read. has_access_token tells the UI whether one is already stored
    # without exposing it.
    access_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_access_token = serializers.SerializerMethodField()
    # Same treatment as the access token.
    app_secret = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_app_secret = serializers.SerializerMethodField()
    is_connected = serializers.ReadOnlyField()

    class Meta:
        model = WhatsAppSettings
        fields = (
            "id", "waba_id", "phone_number_id", "access_token", "has_access_token",
            "webhook_verify_token", "app_id", "business_display_name", "business_display_phone",
            "app_secret", "has_app_secret", "auto_send_enabled", "auto_send_events",
            "occasion_reminders_enabled", "occasion_reminder_mode", "occasion_reminder_types",
            "is_connected", "updated_on",
        )
        read_only_fields = ("id", "updated_on")

    def get_has_access_token(self, obj):
        return bool(obj.access_token)

    def get_has_app_secret(self, obj):
        return bool(obj.app_secret)

    def validate_occasion_reminder_types(self, value):
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise serializers.ValidationError("Expected a list of occasion names.")
        return sorted({occasion_key(item) for item in value if item.strip()})

    def validate_access_token(self, value):
        return clean_access_token(value)

    def validate(self, attrs):
        # A new token or phone number is checked with Meta before it's saved,
        # so a bad paste fails here with a clear reason, not later on Submit.
        phone_changed = attrs.get("phone_number_id", None) not in (None, getattr(self.instance, "phone_number_id", None))
        if not (attrs.get("access_token") or phone_changed):
            return attrs
        token = attrs.get("access_token") or getattr(self.instance, "access_token", "")
        phone_number_id = attrs.get("phone_number_id", getattr(self.instance, "phone_number_id", ""))
        if not (token and phone_number_id):
            return attrs
        try:
            info = verify_connection(phone_number_id=phone_number_id, access_token=token)
        except WhatsAppError as exc:
            field = "access_token" if attrs.get("access_token") else "phone_number_id"
            raise serializers.ValidationError({field: str(exc)})
        except WhatsAppAPIError as exc:
            raise serializers.ValidationError({"access_token": f"Could not check this token with Meta: {exc}"})
        # Fill in what Meta knows about the number, unless staff set their own.
        if not (attrs.get("business_display_phone") or getattr(self.instance, "business_display_phone", "")):
            attrs["business_display_phone"] = (info.get("display_phone_number") or "")[:20]
        if not (attrs.get("business_display_name") or getattr(self.instance, "business_display_name", "")):
            attrs["business_display_name"] = (info.get("verified_name") or "")[:150]
        return attrs

    def update(self, instance, validated_data):
        # An unset/blank access_token on a PATCH means "leave it as is" --
        # the field is write-only so the UI has no way to echo back the
        # current value, and clearing a working token by accident on every
        # unrelated settings save (e.g. toggling auto-send) would be a bad
        # failure mode.
        for secret in ("access_token", "app_secret"):
            if not validated_data.get(secret):
                validated_data.pop(secret, None)
        return super().update(instance, validated_data)


class MessageTemplateSerializer(serializers.ModelSerializer):
    # The header file is set only through the upload-header action, never
    # by a plain save; these just tell the editor what's there.
    has_header_media = serializers.SerializerMethodField()
    header_media_preview_url = serializers.SerializerMethodField()

    class Meta:
        model = MessageTemplate
        fields = (
            "id", "name", "category", "language", "status", "header_type", "header_text",
            "header_media_url", "header_media_filename", "has_header_media", "header_media_preview_url",
            "body", "footer_text", "buttons", "event", "variable_map",
            "rejection_reason", "submitted_at", "reviewed_at", "created_on", "updated_on", "is_editable",
        )
        read_only_fields = (
            "id", "status", "header_media_filename", "rejection_reason", "submitted_at", "reviewed_at",
            "created_on", "updated_on", "is_editable",
        )

    def get_has_header_media(self, obj):
        return bool(obj.header_media_handle and obj.header_media_key)

    def get_header_media_preview_url(self, obj):
        return get_s3_file_url(obj.header_media_key) if obj.header_media_key else None

    def validate(self, attrs):
        if self.instance and not self.instance.is_editable:
            raise serializers.ValidationError("Only Draft or Rejected templates can be edited.")
        merged = {
            "name": attrs.get("name", getattr(self.instance, "name", "")),
            "header_type": attrs.get("header_type", getattr(self.instance, "header_type", MessageTemplate.HEADER_NONE)),
            "header_text": attrs.get("header_text", getattr(self.instance, "header_text", "")),
            "footer_text": attrs.get("footer_text", getattr(self.instance, "footer_text", "")),
            "buttons": attrs.get("buttons", getattr(self.instance, "buttons", [])),
        }
        try:
            validate_template_payload(merged)
        except Exception as exc:
            raise serializers.ValidationError(str(exc))

        event = attrs.get("event", getattr(self.instance, "event", ""))
        variable_map = attrs.get("variable_map", getattr(self.instance, "variable_map", {}))
        if variable_map:
            available = set(FIELDS_FOR_EVENT.get(event, {}).keys())
            unknown = {key: field for key, field in variable_map.items() if field not in available}
            if unknown:
                if not event:
                    raise serializers.ValidationError(
                        {"variable_map": "Assign this template to an event before mapping variables to fields."}
                    )
                raise serializers.ValidationError(
                    {"variable_map": f"Not a field on this event: {', '.join(sorted(set(unknown.values())))}"}
                )
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # A file uploaded for one header type is no good for another (an
        # image handle can't stand in for a document), so switching drops it.
        new_type = validated_data.get("header_type", instance.header_type)
        if new_type != instance.header_type:
            instance.header_media_handle = ""
            instance.header_media_key = ""
            instance.header_media_filename = ""
        return super().update(instance, validated_data)


class MessageLogSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source="template.name", read_only=True, default="")
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageLog
        fields = (
            "id", "template", "template_name", "event", "customer_name", "phone",
            "source_model", "source_id", "source_label", "status", "error_message",
            "sent_by_name", "created_on",
        )

    def get_sent_by_name(self, obj):
        if not obj.sent_by_id:
            return "Automatic"
        return obj.sent_by.get_full_name() or obj.sent_by.username
