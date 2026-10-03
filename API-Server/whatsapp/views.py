import logging

from django.apps import apps
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .event_fields import FIELDS_FOR_EVENT, MODEL_FOR_EVENT
from .models import AUTO_SENDABLE_EVENTS, EVENT_CHOICES, EVENT_GROUPS, MessageLog, MessageTemplate, WhatsAppSettings
from .serializers import MessageLogSerializer, MessageTemplateSerializer, WhatsAppSettingsSerializer
from .services import WhatsAppAPIError, WhatsAppError, apply_template_review_event, send_template_message, submit_template_for_review

logger = logging.getLogger("cakery")


class WhatsAppSettingsView(APIView):
    def get(self, request):
        return Response(WhatsAppSettingsSerializer(WhatsAppSettings.load()).data)

    def patch(self, request):
        serializer = WhatsAppSettingsSerializer(WhatsAppSettings.load(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


class EventCatalogueView(APIView):
    """What the Templates page needs to render the Event dropdown and, once
    an event is picked, the field options for mapping {{n}} placeholders."""

    def get(self, request):
        return Response({
            "events": [
                {"value": value, "label": label, "group": EVENT_GROUPS.get(value, "")}
                for value, label in EVENT_CHOICES if value
            ],
            "auto_sendable_events": list(AUTO_SENDABLE_EVENTS),
            "fields_by_event": {
                event: [{"value": key, "label": label} for key, (label, _getter) in fields.items()]
                for event, fields in FIELDS_FOR_EVENT.items()
            },
        })


class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        template = self.get_object()
        try:
            submit_template_for_review(template)
        except WhatsAppError as exc:
            return Response({"message": str(exc)}, status=400)
        except WhatsAppAPIError as exc:
            return Response({"message": str(exc)}, status=502)
        return Response(MessageTemplateSerializer(template).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        template = self.get_object()
        copy = MessageTemplate.objects.create(
            name=f"{template.name}_copy", category=template.category, language=template.language,
            header_type=template.header_type, header_text=template.header_text,
            header_media_url=template.header_media_url, body=template.body,
            footer_text=template.footer_text, buttons=template.buttons,
            variable_map=template.variable_map, created_by=request.user,
        )
        return Response(MessageTemplateSerializer(copy).data, status=201)


class MessageLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MessageLog.objects.select_related("template", "sent_by").all()
    serializer_class = MessageLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if status_filter := params.get("status"):
            qs = qs.filter(status=status_filter)
        if event_filter := params.get("event"):
            qs = qs.filter(event=event_filter)
        if search := params.get("search"):
            qs = qs.filter(customer_name__icontains=search) | qs.filter(phone__icontains=search)
        if from_date := params.get("from_date"):
            qs = qs.filter(created_on__date__gte=from_date)
        if to_date := params.get("to_date"):
            qs = qs.filter(created_on__date__lte=to_date)
        return qs


class SendMessageView(APIView):
    """Manual send, triggered by the "Send WhatsApp" button on a CRM detail
    page. Takes {event, template_id, record_id}; the record is looked up
    generically via MODEL_FOR_EVENT rather than the caller passing the
    record itself, so this one endpoint serves every CRM page instead of
    each page needing its own send action."""

    def post(self, request):
        event = request.data.get("event")
        template_id = request.data.get("template_id")
        record_id = request.data.get("record_id")
        if event not in MODEL_FOR_EVENT:
            return Response({"message": "Unknown event."}, status=400)
        template = MessageTemplate.objects.filter(pk=template_id, event=event, status=MessageTemplate.STATUS_APPROVED).first()
        if not template:
            return Response({"message": "Select an Active template for this event."}, status=400)
        app_label, model_name = MODEL_FOR_EVENT[event]
        model = apps.get_model(app_label, model_name)
        record = model.objects.filter(pk=record_id).first()
        if not record:
            return Response({"message": "Record not found."}, status=404)
        log = send_template_message(template=template, record=record, event_key=event, user=request.user)
        if log.status == MessageLog.STATUS_FAILED:
            return Response({"message": log.error_message or "Message could not be sent."}, status=502)
        return Response(MessageLogSerializer(log).data, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class WebhookView(APIView):
    """Meta calls this directly -- not a staff-authenticated request."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        settings_row = WhatsAppSettings.load()
        if (
            request.GET.get("hub.mode") == "subscribe"
            and request.GET.get("hub.verify_token") == settings_row.webhook_verify_token
            and settings_row.webhook_verify_token
        ):
            return HttpResponse(request.GET.get("hub.challenge", ""))
        return HttpResponse(status=403)

    def post(self, request):
        payload = request.data
        try:
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    field = change.get("field")
                    if field == "message_template_status_update":
                        apply_template_review_event(
                            template_name=value.get("message_template_name"),
                            template_language=value.get("message_template_language"),
                            event=value.get("event"),
                            reason=value.get("reason", ""),
                        )
                    elif field == "messages":
                        for status_update in value.get("statuses", []):
                            MessageLog.objects.filter(wa_message_id=status_update.get("id")).update(
                                status=status_update.get("status", "sent")
                            )
        except Exception:
            logger.exception("Failed to process WhatsApp webhook payload")
        return JsonResponse({"received": True})
