import hashlib
import hmac
import json
import logging

from django.apps import apps
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .event_fields import FIELD_SAMPLES, FIELDS_FOR_EVENT, MODEL_FOR_EVENT
from .models import AUTO_SENDABLE_EVENTS, EVENT_CHOICES, EVENT_GROUPS, MessageLog, MessageTemplate, OptOut, WhatsAppSettings
from .occasion_reminders import due_reminders, reminder_template, send_due_reminders
from .serializers import MessageLogSerializer, MessageTemplateSerializer, WhatsAppSettingsSerializer
from .services import (
    WhatsAppAPIError, WhatsAppError, apply_template_review_event, phone_key, send_template_message,
    submit_template_for_review, upload_header_media,
)

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
                event: [
                    {"value": key, "label": label, "sample": FIELD_SAMPLES.get(key, "")}
                    for key, (label, _getter) in fields.items()
                ]
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

    @action(detail=True, methods=["post"], url_path="upload-header", parser_classes=[MultiPartParser])
    def upload_header(self, request, pk=None):
        template = self.get_object()
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"message": "Choose a file to upload."}, status=400)
        try:
            upload_header_media(template, uploaded_file)
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
            header_media_url=template.header_media_url, header_media_handle=template.header_media_handle,
            header_media_key=template.header_media_key, header_media_filename=template.header_media_filename,
            body=template.body,
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


class OccasionReminderView(APIView):
    """Today's due birthday/anniversary reminders (GET) and sending them
    (POST {"ids": [...]}, or no ids for all of them)."""

    def get(self, request):
        settings_row = WhatsAppSettings.load()
        template = reminder_template()
        return Response({
            "enabled": settings_row.occasion_reminders_enabled,
            "mode": settings_row.occasion_reminder_mode,
            "template_name": template.name if template else "",
            "results": [
                {key: value for key, value in row.items() if key != "event"}
                for row in due_reminders()
            ],
        })

    def post(self, request):
        ids = request.data.get("ids")
        if ids is not None and not (isinstance(ids, list) and all(isinstance(i, int) for i in ids)):
            return Response({"message": "ids must be a list of occasion ids."}, status=400)
        try:
            counts = send_due_reminders(user=request.user, ids=ids)
        except WhatsAppError as exc:
            return Response({"message": str(exc)}, status=400)
        return Response(counts)


# Replies that opt a customer out of / back into occasion reminders. Matches
# a typed message or a template's quick-reply button with that text.
STOP_REPLIES = {"stop", "stop reminders", "unsubscribe"}
START_REPLIES = {"start", "start reminders"}


def _reply_text(message):
    for source in (
        (message.get("button") or {}).get("text"),
        ((message.get("interactive") or {}).get("button_reply") or {}).get("title"),
        (message.get("text") or {}).get("body"),
    ):
        if source:
            return " ".join(source.lower().split())
    return ""


def _signature_valid(secret, body, header):
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header or "")


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
        # Raw body, before any parsing: the signature is over the exact bytes.
        body = request.body
        settings_row = WhatsAppSettings.load()
        if settings_row.app_secret and not _signature_valid(
            settings_row.app_secret, body, request.headers.get("X-Hub-Signature-256"),
        ):
            logger.warning("Rejected WhatsApp webhook call with a bad signature")
            return HttpResponse(status=403)
        try:
            payload = json.loads(body or b"{}")
        except ValueError:
            return HttpResponse(status=400)
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
                        # Incoming messages aren't stored; only STOP/START
                        # replies are acted on.
                        for message in value.get("messages", []):
                            phone = phone_key(message.get("from"))
                            reply = _reply_text(message)
                            if not phone:
                                continue
                            if reply in STOP_REPLIES:
                                OptOut.objects.get_or_create(phone=phone)
                            elif reply in START_REPLIES:
                                OptOut.objects.filter(phone=phone).delete()
        except Exception:
            logger.exception("Failed to process WhatsApp webhook payload")
        return JsonResponse({"received": True})
