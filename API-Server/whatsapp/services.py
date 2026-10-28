"""Meta WhatsApp Business Cloud API client and the template/send business logic.

Reference implementation: threadine's apps/messaging/services.py, which runs
this same template lifecycle in production. Adapted here by dropping its
workspace/multi-tenant scoping (magilshe is one business, one connection)
and swapping its contact-field variable binding for CRM-record-field
binding (see event_fields.py) -- magilshe's templates attach to a CRM
document (a quotation, an order...), not a generic contact.
"""

import logging
import os
import re
import uuid

import requests
from django.db import transaction
from django.utils import timezone

from cakery.common import aws_domain_name, get_s3_file_url
from cakery.file_upload_to_aws import put_image_to_s3

from .event_fields import (
    FIELD_SAMPLES, CUSTOMER_NAME_FOR_EVENT, LABEL_FOR_EVENT, RECIPIENT_FOR_EVENT,
    SOURCE_MODEL_FOR_EVENT, resolve_variables,
)
from .models import AUTO_SENDABLE_EVENTS, MessageLog, MessageTemplate, OptOut, WhatsAppSettings

logger = logging.getLogger("cakery")

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

TEMPLATE_NAME_RE = re.compile(r"^[a-z0-9_]+$")
TEMPLATE_FOOTER_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)
MAX_TEMPLATE_BUTTONS = 10
# Graph API's code for an invalid, expired or unparseable access token.
TOKEN_ERROR_CODE = 190
MEDIA_HEADER_TYPES = (MessageTemplate.HEADER_IMAGE, MessageTemplate.HEADER_VIDEO, MessageTemplate.HEADER_DOCUMENT)

_MB = 1024 * 1024
# What Meta accepts in a template header, per header type: (content types, max size).
MEDIA_HEADER_RULES = {
    MessageTemplate.HEADER_IMAGE: (("image/jpeg", "image/png"), 5 * _MB, "a JPG or PNG image up to 5 MB"),
    MessageTemplate.HEADER_VIDEO: (("video/mp4", "video/3gpp"), 16 * _MB, "an MP4 or 3GP video up to 16 MB"),
    MessageTemplate.HEADER_DOCUMENT: (("application/pdf",), 16 * _MB, "a PDF up to 16 MB"),
}

# Events whose record has a PDF of its own (the quotation, the receipt, the
# invoice). A document header on these carries that customer's own PDF, built
# at send time; the uploaded file is only Meta's review sample.
RECORD_DOCUMENT_EVENTS = tuple(
    event for event, source in SOURCE_MODEL_FOR_EVENT.items() if source in ("quotation", "crminvoice")
)


def whatsapp_number(phone):
    """Meta needs the number with its country code. CRM phones are mostly
    stored as plain 10-digit Indian mobiles, so those get 91 added."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10:
        digits = "91" + digits
    return digits


def phone_key(phone):
    """Last 10 digits: the same number written with or without +91 / 0."""
    return re.sub(r"\D", "", phone or "")[-10:]


def is_opted_out(phone):
    return bool(phone) and OptOut.objects.filter(phone=phone_key(phone)).exists()


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
    # The Resumable Upload API wants "OAuth <token>" instead, so a caller may set it.
    headers.setdefault("Authorization", f"Bearer {settings_row.access_token}")
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
        error = (body or {}).get("error", {})
        message = error.get("message") or response.text
        if error.get("code") == TOKEN_ERROR_CODE:
            message = (
                f"WhatsApp rejected the access token saved in WhatsApp Settings ({message}). "
                "Paste a valid access token there and save again."
            )
        raise WhatsAppAPIError(message, status_code=response.status_code, response_body=body)
    return response.json() if response.content else {}


def clean_access_token(value):
    """What people actually paste: "Bearer EAA...", quoted, or wrapped across
    lines. Meta tokens never contain spaces or quotes, so all of that goes."""
    token = (value or "").strip().strip("\"'")
    token = re.sub(r"^(bearer|oauth)\s+", "", token, flags=re.IGNORECASE)
    return re.sub(r"\s+", "", token).strip("\"'")


def verify_connection(*, phone_number_id, access_token):
    """Asks Meta for the phone number with this token, so a wrong token or
    phone number ID is caught on Save instead of on the first Submit/send.
    Returns {"display_phone_number": ..., "verified_name": ...}."""
    probe = WhatsAppSettings(waba_id="probe", phone_number_id=phone_number_id, access_token=access_token)
    try:
        return _graph_request(
            "GET", phone_number_id, probe, params={"fields": "display_phone_number,verified_name"},
        )
    except WhatsAppAPIError as exc:
        error = (exc.response_body or {}).get("error", {})
        if error.get("code") == TOKEN_ERROR_CODE:
            raise WhatsAppError(
                f"Meta did not accept this access token ({error.get('message')}). Copy the whole token -- it "
                "starts with EAA -- from Meta Business Settings > System users, or WhatsApp > API Setup."
            ) from exc
        if exc.status_code in (400, 404):
            raise WhatsAppError(
                f"Meta could not find Phone Number ID {phone_number_id} with this token ({error.get('message') or exc}). "
                "Check the Phone Number ID, and that the token has access to this WhatsApp account."
            ) from exc
        raise


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


def _example_values(text, variable_map=None):
    """Meta's required sample for each {{n}}: the mapped field's realistic
    sample when there is one, else a generic placeholder."""
    keys = sorted({int(m) for m in re.findall(r"\{\{(\d+)\}\}", text or "")})
    variable_map = variable_map or {}
    return [FIELD_SAMPLES.get(variable_map.get(str(k)), f"example{k}") for k in keys] if keys else None


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
    body_examples = _example_values(template.body, template.variable_map)
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


def upload_header_media(template, uploaded_file):
    """Stores the sample file for an image/video/document header.

    Two copies, for two different jobs: Meta's Resumable Upload API returns
    the handle it needs to review the template, and our S3 copy is what each
    send later points Meta at. Meta goes first -- it's the stricter check,
    and nothing is kept in S3 for a file Meta wouldn't take.
    """
    if not template.is_editable:
        raise WhatsAppError("Only Draft or Rejected templates can be changed.")
    rules = MEDIA_HEADER_RULES.get(template.header_type)
    if rules is None:
        raise WhatsAppError("Set the header type to Image, Video or Document before uploading a file.")
    content_types, max_size, description = rules
    content_type = (uploaded_file.content_type or "").split(";")[0].strip().lower()
    if content_type not in content_types:
        raise WhatsAppError(f"{template.get_header_type_display()} headers need {description}.")
    if uploaded_file.size > max_size:
        raise WhatsAppError(f"That file is too large: {template.get_header_type_display()} headers need {description}.")

    settings_row = WhatsAppSettings.load()
    if not settings_row.is_connected:
        raise WhatsAppError("WhatsApp Business is not connected yet. Add your credentials in Settings.")
    if not settings_row.app_id:
        raise WhatsAppError("Add your Meta App ID in WhatsApp Settings before uploading header files.")

    data = uploaded_file.read()
    filename = os.path.basename(uploaded_file.name or "") or "header"
    session = _graph_request(
        "POST", f"{settings_row.app_id}/uploads", settings_row,
        params={"file_name": filename, "file_length": len(data), "file_type": content_type},
    )
    if not session.get("id"):
        raise WhatsAppAPIError("WhatsApp did not start an upload session for this file.")
    result = _graph_request(
        "POST", session["id"], settings_row, data=data,
        headers={"Authorization": f"OAuth {settings_row.access_token}", "file_offset": "0"},
    )
    handle = result.get("h")
    if not handle:
        raise WhatsAppAPIError("WhatsApp did not return an upload handle for this file.")

    extension = os.path.splitext(filename)[1].lower()
    key = f"{aws_domain_name}/whatsapp/templates/{template.pk}/{uuid.uuid4().hex}{extension}"
    uploaded_file.seek(0)
    uploaded_file.content_type = content_type
    if not put_image_to_s3(uploaded_file, key):
        raise WhatsAppError("Could not store the file. Please try again.")

    template.header_media_handle = handle
    template.header_media_key = key
    template.header_media_filename = filename
    template.save(update_fields=["header_media_handle", "header_media_key", "header_media_filename", "updated_on"])
    return template


def record_document(event_key, record):
    """(pdf bytes, file name) for the customer's own document on this event:
    the payment receipt for an advance, the invoice for invoice events, the
    quotation otherwise."""
    from crm.pdf.documents import build_invoice_pdf, build_quotation_pdf, build_receipt_pdf, receipt_filename

    if SOURCE_MODEL_FOR_EVENT.get(event_key) == "crminvoice":
        return build_invoice_pdf(record), f"Invoice-{record.invoice_no}.pdf".replace("/", "-")
    if event_key == "quotation_advance_received":
        payment = record.payments.order_by("-payment_date", "-created_on", "-id").first()
        if payment:
            return build_receipt_pdf(record, payment), receipt_filename(record, payment)
    return build_quotation_pdf(record), f"Quotation-{record.quotation_no}.pdf".replace("/", "-")


def _upload_message_media(settings_row, data, filename, content_type):
    """Uploads a file to WhatsApp's media store for sending; returns its id.
    Used for customer documents so they aren't left on a shareable link."""
    result = _graph_request(
        "POST", f"{settings_row.phone_number_id}/media", settings_row,
        data={"messaging_product": "whatsapp", "type": content_type},
        files={"file": (filename, data, content_type)},
    )
    if not result.get("id"):
        raise WhatsAppAPIError("WhatsApp did not return a media id for the document.")
    return result["id"]


def _header_component(template, event_key, record, settings_row):
    """The send-time header for a media template, or None for text/no header.
    Raises WhatsAppError/WhatsAppAPIError when the header can't be sent."""
    if template.header_type not in MEDIA_HEADER_TYPES:
        return None
    if template.header_type == MessageTemplate.HEADER_DOCUMENT and event_key in RECORD_DOCUMENT_EVENTS and record:
        try:
            data, filename = record_document(event_key, record)
        except Exception as exc:
            logger.exception("Could not build the %s PDF for %s", event_key, getattr(record, "pk", None))
            raise WhatsAppError(f"Could not build the PDF to attach: {exc}") from exc
        media_id = _upload_message_media(settings_row, data, filename, "application/pdf")
        return {"type": "header", "parameters": [
            {"type": "document", "document": {"id": media_id, "filename": filename}},
        ]}
    link = get_s3_file_url(template.header_media_key, expires_in=24 * 3600) if template.header_media_key else None
    if not link:
        raise WhatsAppError("This template's header file is missing. Upload it again on the template page.")
    media = {"link": link}
    if template.header_type == MessageTemplate.HEADER_DOCUMENT and template.header_media_filename:
        media["filename"] = template.header_media_filename
    return {"type": "header", "parameters": [{"type": template.header_type, template.header_type: media}]}


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
    # Opting out (replying STOP) covers promotional reminders only; order and
    # quotation updates are still sent.
    if event_key == "occasion_reminder" and is_opted_out(phone):
        log.status = MessageLog.STATUS_FAILED
        log.error_message = "Customer replied STOP to reminders."
        log.save(update_fields=["status", "error_message", "updated_on"])
        return log

    try:
        header = _header_component(template, event_key, record, settings_row)
    except (WhatsAppError, WhatsAppAPIError) as exc:
        log.status = MessageLog.STATUS_FAILED
        log.error_message = str(exc)
        log.save(update_fields=["status", "error_message", "updated_on"])
        return log

    variables = resolve_variables(event_key, template.variable_map, record) if record else {}
    components = [header] if header else []
    if variables:
        components.append({
            "type": "body",
            # Meta rejects the whole message if any value is empty (e.g. no delivery date yet).
            "parameters": [{"type": "text", "text": variables.get(str(i)) or "-"} for i in range(1, len(variables) + 1)],
        })

    try:
        result = _graph_request(
            "POST", f"{settings_row.phone_number_id}/messages", settings_row,
            json={
                "messaging_product": "whatsapp", "to": whatsapp_number(phone), "type": "template",
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


def _log_skipped(event_key, record, reason):
    MessageLog.objects.create(
        event=event_key, status=MessageLog.STATUS_FAILED, error_message=reason,
        customer_name=CUSTOMER_NAME_FOR_EVENT[event_key](record) or "",
        phone=RECIPIENT_FOR_EVENT[event_key](record) or "",
        source_model=SOURCE_MODEL_FOR_EVENT.get(event_key, ""), source_id=record.pk,
        source_label=LABEL_FOR_EVENT[event_key](record) or "",
    )


def trigger_event(event_key, record):
    """Called from crm/views.py at the moment a CRM status actually changes.

    Fires only when the master switch is on, the event is opted in from
    Settings, and exactly one Active template is assigned to it. More than
    one Active template for the same event is intentionally not auto-sent --
    that's ambiguous, and is left for a manual Send with a template picker.
    Either way a skipped send is written to the Message Log with the reason,
    so "it never arrived" always has an answer there.

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

    def send():
        try:
            if len(templates) == 1:
                send_template_message(template=templates[0], record=record, event_key=event_key, user=None)
            elif not templates:
                _log_skipped(event_key, record, "Auto-send is on for this event, but no Active template is assigned to it.")
            else:
                _log_skipped(event_key, record, (
                    f"{len(templates)} Active templates are assigned to this event; auto-send needs exactly one. "
                    "Unassign the extras on the Templates page."
                ))
        except Exception:
            logger.exception("Automatic WhatsApp send failed for %s", event_key)

    transaction.on_commit(send)
