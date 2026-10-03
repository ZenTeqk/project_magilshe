"""Meta WhatsApp Business Cloud API client and the template/send business logic.

Reference implementation: threadine's apps/messaging/services.py, which runs
this same template lifecycle in production. Adapted here by dropping its
workspace/multi-tenant scoping (magilshe is one business, one connection)
and swapping its contact-field variable binding for CRM-record-field
binding (see event_fields.py) -- magilshe's templates attach to a CRM
document (a quotation, an order...), not a generic contact.
"""

import logging
import re

import requests
from django.db import transaction
from django.utils import timezone

from .event_fields import (
    CUSTOMER_NAME_FOR_EVENT, LABEL_FOR_EVENT, RECIPIENT_FOR_EVENT,
    SOURCE_MODEL_FOR_EVENT, resolve_variables,
)
from .models import AUTO_SENDABLE_EVENTS, MessageLog, MessageTemplate, WhatsAppSettings

logger = logging.getLogger("cakery")

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

TEMPLATE_NAME_RE = re.compile(r"^[a-z0-9_]+$")
TEMPLATE_FOOTER_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)
MAX_TEMPLATE_BUTTONS = 10
MEDIA_HEADER_TYPES = (MessageTemplate.HEADER_IMAGE, MessageTemplate.HEADER_VIDEO, MessageTemplate.HEADER_DOCUMENT)


class WhatsAppError(Exception):
    """A problem with the request itself (validation, local state) -- not Meta's API."""


class WhatsAppAPIError(Exception):
    """Meta's Graph API returned an error response."""

    def __init__(self, message, status_code=None, response_body=None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


def _graph_request(method, path, settings_row, **kwargs):
    if not settings_row.is_connected:
        raise WhatsAppAPIError("WhatsApp Business is not connected yet. Add your credentials in Settings.")
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {settings_row.access_token}"
    try:
        response = requests.request(method, f"{GRAPH_BASE}/{path}", headers=headers, timeout=20, **kwargs)
    except requests.RequestException as exc:
        raise WhatsAppAPIError(f"Could not reach WhatsApp: {exc}") from exc
    if response.status_code >= 400:
        body = None
        try:
            body = response.json()
        except ValueError:
            pass
        message = (body or {}).get("error", {}).get("message") or response.text
        raise WhatsAppAPIError(message, status_code=response.status_code, response_body=body)
    return response.json() if response.content else {}


# ---------------------------------------------------------------------------
# Template validation + lifecycle
# ---------------------------------------------------------------------------

def _validate_template_fields(*, name, header_type, header_text, footer_text, buttons):
    if not TEMPLATE_NAME_RE.match(name):
        raise WhatsAppError(
            "Template names can only use lower-case letters, numbers, and underscores -- no spaces or capitals."
        )
    if "\n" in footer_text or "\r" in footer_text:
        raise WhatsAppError("The footer can't contain line breaks.")
    if TEMPLATE_FOOTER_EMOJI_RE.search(footer_text):
        raise WhatsAppError("The footer can't contain emoji.")
    if header_type == MessageTemplate.HEADER_TEXT and not header_text:
        raise WhatsAppError("Text headers need header text.")
    if len(buttons) > MAX_TEMPLATE_BUTTONS:
        raise WhatsAppError(f"Templates support at most {MAX_TEMPLATE_BUTTONS} buttons.")
    for button in buttons:
        button_type = button.get("type")
        if button_type not in ("URL", "QUICK_REPLY", "PHONE_NUMBER"):
            raise WhatsAppError(f"Unknown button type: {button_type!r}")
        if not button.get("text"):
            raise WhatsAppError("Every button needs display text.")
        if button_type == "URL" and not button.get("url"):
            raise WhatsAppError("URL buttons need a url.")
        if button_type == "PHONE_NUMBER" and not button.get("phone_number"):
            raise WhatsAppError("Call buttons need a phone_number.")


def validate_template_payload(fields):
    _validate_template_fields(
        name=fields.get("name", ""),
        header_type=fields.get("header_type", MessageTemplate.HEADER_NONE),
        header_text=fields.get("header_text", ""),
        footer_text=fields.get("footer_text", ""),
        buttons=fields.get("buttons", []),
    )


def _example_values(text):
    keys = sorted({int(m) for m in re.findall(r"\{\{(\d+)\}\}", text or "")})
    return [f"example{k}" for k in keys] if keys else None


def _template_components(template):
    components = []
    if template.header_type == MessageTemplate.HEADER_TEXT:
        header = {"type": "HEADER", "format": "TEXT", "text": template.header_text}
        examples = _example_values(template.header_text)
        if examples:
            header["example"] = {"header_text": examples}
        components.append(header)
    elif template.header_type in MEDIA_HEADER_TYPES:
        components.append({
            "type": "HEADER", "format": template.header_type.upper(),
            "example": {"header_handle": [template.header_media_handle]},
        })
    body = {"type": "BODY", "text": template.body}
    body_examples = _example_values(template.body)
    if body_examples:
        body["example"] = {"body_text": [body_examples]}
    components.append(body)
    if template.footer_text:
        components.append({"type": "FOOTER", "text": template.footer_text})
    if template.buttons:
        components.append({"type": "BUTTONS", "buttons": template.buttons})
    return components


def submit_template_for_review(template):
    """Marks the template Pending locally, then best-effort submits to Meta.

    A real approve/reject decision always arrives later via the
    message_template_status_update webhook (apply_template_review_event) --
    a successful call here only means Meta accepted it into the review
    queue. The one exception: a 400 at submission time is Meta rejecting
    the template's *content* immediately, so no webhook is ever coming for
    it -- that's marked Rejected right here with Meta's own reason, instead
    of leaving the template stuck on "Pending" forever with no explanation.
    Any other failure (network, bad token, Meta 5xx) is an infra problem on
    our side, not a verdict on the template, so status stays Pending and the
    error is just raised back to the caller for a retry.
    """
    if template.status not in MessageTemplate.EDITABLE_STATUSES:
        raise WhatsAppError("This template has already been submitted for review.")
    if template.header_type in MEDIA_HEADER_TYPES and not template.header_media_handle:
        raise WhatsAppError("Upload an image/video/document for this template's header before submitting.")

    template.status = MessageTemplate.STATUS_PENDING
    template.submitted_at = timezone.now()
    template.rejection_reason = ""
    template.save(update_fields=["status", "submitted_at", "rejection_reason", "updated_on"])

    settings_row = WhatsAppSettings.load()
    if not settings_row.is_connected:
        return template
    try:
        _graph_request(
            "POST", f"{settings_row.waba_id}/message_templates", settings_row,
            json={
                "name": template.name, "category": template.category.upper(),
                "language": template.language, "components": _template_components(template),
            },
        )
    except WhatsAppAPIError as exc:
        if exc.status_code == 400:
            error = (exc.response_body or {}).get("error", {})
            template.status = MessageTemplate.STATUS_REJECTED
            template.reviewed_at = timezone.now()
            template.rejection_reason = error.get("error_user_msg") or str(exc)
            template.save(update_fields=["status", "reviewed_at", "rejection_reason", "updated_on"])
        else:
            raise
    return template


def apply_template_review_event(*, template_name, template_language, event, reason=""):
    """Called by the webhook receiver when Meta's own review completes."""
    template = MessageTemplate.objects.filter(name=template_name, language=template_language).first()
    if not template:
        return None
    if event == "APPROVED":
        template.status = MessageTemplate.STATUS_APPROVED
    elif event == "REJECTED":
        template.status = MessageTemplate.STATUS_REJECTED
        template.rejection_reason = reason
    else:
        return template
    template.reviewed_at = timezone.now()
    template.save(update_fields=["status", "rejection_reason", "reviewed_at", "updated_on"])
    return template


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------

def send_template_message(*, template, record, event_key, recipient_phone=None, customer_name=None, user=None):
    """Sends `template` using fields resolved from `record`, logs the result.

    Always returns the MessageLog row, even on failure -- a failed send is
    still something staff need to see in the Message Log, not just an
    exception that vanishes.
    """
    settings_row = WhatsAppSettings.load()
    phone = recipient_phone or (RECIPIENT_FOR_EVENT.get(event_key, lambda r: None)(record) if record else None)
    name = customer_name or (CUSTOMER_NAME_FOR_EVENT.get(event_key, lambda r: "")(record) if record else "")
    label = LABEL_FOR_EVENT.get(event_key, lambda r: "")(record) if record else ""
    source_model = SOURCE_MODEL_FOR_EVENT.get(event_key, "")

    log = MessageLog.objects.create(
        template=template, event=event_key, customer_name=name or "", phone=phone or "",
        source_model=source_model, source_id=getattr(record, "pk", None), source_label=label or "",
        sent_by=user,
    )

    if not phone:
        log.status = MessageLog.STATUS_FAILED
        log.error_message = "No phone number on this record."
        log.save(update_fields=["status", "error_message", "updated_on"])
        return log
    if template.status != MessageTemplate.STATUS_APPROVED:
        log.status = MessageLog.STATUS_FAILED
        log.error_message = "Template is not Active yet."
        log.save(update_fields=["status", "error_message", "updated_on"])
        return log

    variables = resolve_variables(event_key, template.variable_map, record) if record else {}
    components = []
    if variables:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": variables.get(str(i), "")} for i in range(1, len(variables) + 1)],
        })

    try:
        result = _graph_request(
            "POST", f"{settings_row.phone_number_id}/messages", settings_row,
            json={
                "messaging_product": "whatsapp", "to": phone, "type": "template",
                "template": {
                    "name": template.name,
                    "language": {"code": template.language},
                    **({"components": components} if components else {}),
                },
            },
        )
        log.status = MessageLog.STATUS_SENT
        log.wa_message_id = (result.get("messages") or [{}])[0].get("id", "")
    except WhatsAppAPIError as exc:
        log.status = MessageLog.STATUS_FAILED
        log.error_message = str(exc)
    log.save(update_fields=["status", "wa_message_id", "error_message", "updated_on"])
    return log


def trigger_event(event_key, record):
    """Called from crm/views.py at the moment a CRM status actually changes.

    Fires only when the master switch is on, the event is opted in from
    Settings, and exactly one Active template is assigned to it. More than
    one Active template for the same event is intentionally not auto-sent --
    that's ambiguous, and is left for a manual Send with a template picker.

    The send is deferred until the surrounding transaction commits, so a
    customer is never messaged about a status change that then rolled back,
    and the Meta API call doesn't run while CRM rows are locked. Any failure
    is logged, never raised: WhatsApp must not be able to break the CRM
    action that triggered it.
    """
    if event_key not in AUTO_SENDABLE_EVENTS:
        return
    settings_row = WhatsAppSettings.load()
    if not settings_row.auto_send_enabled or event_key not in (settings_row.auto_send_events or []):
        return
    templates = list(MessageTemplate.objects.filter(event=event_key, status=MessageTemplate.STATUS_APPROVED))
    if len(templates) != 1:
        return

    def send():
        try:
            send_template_message(template=templates[0], record=record, event_key=event_key, user=None)
        except Exception:
            logger.exception("Automatic WhatsApp send failed for %s", event_key)

    transaction.on_commit(send)
