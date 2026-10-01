from rest_framework import serializers

from .event_fields import FIELDS_FOR_EVENT
from .models import MessageLog, MessageTemplate, WhatsAppSettings
from .services import validate_template_payload


class WhatsAppSettingsSerializer(serializers.ModelSerializer):
    # The access token is a secret: accepted on write, never echoed back on
    # read. has_access_token tells the UI whether one is already stored
    # without exposing it.
    access_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_access_token = serializers.SerializerMethodField()
    is_connected = serializers.ReadOnlyField()

    class Meta:
        model = WhatsAppSettings
        fields = (
            "id", "waba_id", "phone_number_id", "access_token", "has_access_token",
            "webhook_verify_token", "business_display_name", "business_display_phone",
            "auto_send_events", "is_connected", "updated_on",
        )
        read_only_fields = ("id", "updated_on")

    def get_has_access_token(self, obj):
        return bool(obj.access_token)

    def update(self, instance, validated_data):
        # An unset/blank access_token on a PATCH means "leave it as is" --
        # the field is write-only so the UI has no way to echo back the
        # current value, and clearing a working token by accident on every
        # unrelated settings save (e.g. toggling auto-send) would be a bad
        # failure mode.
        if not validated_data.get("access_token"):
            validated_data.pop("access_token", None)
        return super().update(instance, validated_data)


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = (
            "id", "name", "category", "language", "status", "header_type", "header_text",
            "header_media_url", "body", "footer_text", "buttons", "event", "variable_map",
            "rejection_reason", "submitted_at", "reviewed_at", "created_on", "updated_on", "is_editable",
        )
        read_only_fields = ("id", "status", "rejection_reason", "submitted_at", "reviewed_at", "created_on", "updated_on", "is_editable")

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
