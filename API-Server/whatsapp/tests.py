from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from crm.models import CRMDelivery, CRMInvoice, CRMOrder, Quotation
from .models import MessageLog, MessageTemplate, WhatsAppSettings
from .services import (
    WhatsAppError, apply_template_review_event, send_template_message,
    submit_template_for_review, trigger_event, validate_template_payload,
)


def make_template(**overrides):
    defaults = dict(
        name="quotation_sent_v1", category=MessageTemplate.CATEGORY_UTILITY, language="en",
        body="Hi {{1}}, your quotation {{2}} is ready.", event="quotation_sent",
        variable_map={"1": "customer_name", "2": "quotation_no"},
    )
    defaults.update(overrides)
    return MessageTemplate.objects.create(**defaults)


class TemplateValidationTests(TestCase):
    def test_rejects_name_with_spaces_or_capitals(self):
        with self.assertRaises(WhatsAppError):
            validate_template_payload({"name": "Quotation Sent"})

    def test_accepts_valid_name(self):
        validate_template_payload({"name": "quotation_sent_v1"})

    def test_text_header_requires_header_text(self):
        with self.assertRaises(WhatsAppError):
            validate_template_payload({"name": "ok_name", "header_type": MessageTemplate.HEADER_TEXT, "header_text": ""})

    def test_url_button_requires_url(self):
        with self.assertRaises(WhatsAppError):
            validate_template_payload({"name": "ok_name", "buttons": [{"type": "URL", "text": "View"}]})


class TemplateLifecycleTests(TestCase):
    def test_new_template_is_draft_and_editable(self):
        template = make_template()
        self.assertEqual(template.status, MessageTemplate.STATUS_DRAFT)
        self.assertTrue(template.is_editable)

    def test_submit_without_connection_leaves_status_pending(self):
        """No WhatsAppSettings connection configured -- submit still moves
        the template into Pending locally; it's just never sent to Meta."""
        template = make_template()
        submit_template_for_review(template)
        template.refresh_from_db()
        self.assertEqual(template.status, MessageTemplate.STATUS_PENDING)
        self.assertFalse(template.is_editable)

    def test_submit_already_pending_template_raises(self):
        template = make_template(status=MessageTemplate.STATUS_PENDING)
        with self.assertRaises(WhatsAppError):
            submit_template_for_review(template)

    def test_media_header_without_upload_blocks_submit(self):
        template = make_template(header_type=MessageTemplate.HEADER_IMAGE, header_media_handle="")
        with self.assertRaises(WhatsAppError):
            submit_template_for_review(template)

    def test_webhook_approval_event_activates_template(self):
        template = make_template(status=MessageTemplate.STATUS_PENDING)
        apply_template_review_event(template_name=template.name, template_language="en", event="APPROVED")
        template.refresh_from_db()
        self.assertEqual(template.status, MessageTemplate.STATUS_APPROVED)

    def test_webhook_rejection_event_records_reason(self):
        template = make_template(status=MessageTemplate.STATUS_PENDING)
        apply_template_review_event(
            template_name=template.name, template_language="en", event="REJECTED", reason="Policy violation",
        )
        template.refresh_from_db()
        self.assertEqual(template.status, MessageTemplate.STATUS_REJECTED)
        self.assertEqual(template.rejection_reason, "Policy violation")


class SendMessageTests(TestCase):
    def setUp(self):
        self.quotation = Quotation.objects.create(
            customer_name="Priya", phone="9876543210", quotation_no="Q/1", quantity=1, rate="500",
        )

    def test_send_requires_active_template(self):
        template = make_template()  # still Draft
        log = send_template_message(template=template, record=self.quotation, event_key="quotation_sent")
        self.assertEqual(log.status, MessageLog.STATUS_FAILED)
        self.assertIn("not Active", log.error_message)

    def test_send_without_connection_fails_gracefully_and_logs(self):
        template = make_template(status=MessageTemplate.STATUS_APPROVED)
        log = send_template_message(template=template, record=self.quotation, event_key="quotation_sent")
        self.assertEqual(log.status, MessageLog.STATUS_FAILED)
        self.assertEqual(log.phone, "9876543210")
        self.assertEqual(log.source_label, "Q/1")

    def test_send_resolves_mapped_variables_and_succeeds(self):
        settings_row = WhatsAppSettings.load()
        settings_row.waba_id = "waba-1"
        settings_row.phone_number_id = "phone-1"
        settings_row.access_token = "token"
        settings_row.save()
        template = make_template(status=MessageTemplate.STATUS_APPROVED)

        with patch("whatsapp.services._graph_request") as mock_request:
            mock_request.return_value = {"messages": [{"id": "wamid.123"}]}
            log = send_template_message(template=template, record=self.quotation, event_key="quotation_sent")

        self.assertEqual(log.status, MessageLog.STATUS_SENT)
        self.assertEqual(log.wa_message_id, "wamid.123")
        sent_payload = mock_request.call_args.kwargs["json"]
        body_params = sent_payload["template"]["components"][0]["parameters"]
        self.assertEqual([p["text"] for p in body_params], ["Priya", "Q/1"])

    def test_trigger_event_does_nothing_when_not_opted_into_auto_send(self):
        make_template(status=MessageTemplate.STATUS_APPROVED)
        result = trigger_event("quotation_sent", self.quotation)
        self.assertIsNone(result)
        self.assertEqual(MessageLog.objects.count(), 0)

    def test_trigger_event_sends_when_opted_in_with_one_active_template(self):
        settings_row = WhatsAppSettings.load()
        settings_row.auto_send_events = ["quotation_sent"]
        settings_row.save()
        make_template(status=MessageTemplate.STATUS_APPROVED)
        result = trigger_event("quotation_sent", self.quotation)
        self.assertIsNotNone(result)
        self.assertEqual(MessageLog.objects.count(), 1)
        self.assertIsNone(MessageLog.objects.first().sent_by)

    def test_trigger_event_skips_when_multiple_active_templates_are_ambiguous(self):
        settings_row = WhatsAppSettings.load()
        settings_row.auto_send_events = ["quotation_sent"]
        settings_row.save()
        make_template(name="quotation_sent_a", status=MessageTemplate.STATUS_APPROVED)
        make_template(name="quotation_sent_b", status=MessageTemplate.STATUS_APPROVED)
        result = trigger_event("quotation_sent", self.quotation)
        self.assertIsNone(result)
        self.assertEqual(MessageLog.objects.count(), 0)


class CRMEventTriggerIntegrationTests(TestCase):
    """Confirms whatsapp_trigger_event actually fires from the real CRM
    workflow endpoints, not just when called directly."""

    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_superuser(username="wa-staff", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        settings_row = WhatsAppSettings.load()
        settings_row.auto_send_events = ["quotation_sent", "invoice_generated", "out_for_delivery", "delivered"]
        settings_row.save()

    def test_quotation_sent_fires_whatsapp_trigger(self):
        make_template(status=MessageTemplate.STATUS_APPROVED)
        quotation = Quotation.objects.create(customer_name="Arun", phone="9000000001", quantity=1, rate="500")
        response = self.client.patch(f"/crm/quotations/{quotation.id}/", {"status": "Sent"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(MessageLog.objects.filter(event="quotation_sent").count(), 1)

    def test_delivery_workflow_actions_fire_whatsapp_triggers(self):
        make_template(
            name="out_for_delivery_v1", event="out_for_delivery", status=MessageTemplate.STATUS_APPROVED,
            body="Hi {{1}}", variable_map={"1": "customer_name"},
        )
        make_template(
            name="delivered_v1", event="delivered", status=MessageTemplate.STATUS_APPROVED,
            body="Hi {{1}}", variable_map={"1": "customer_name"},
        )
        quotation = Quotation.objects.create(
            customer_name="Kavya", phone="9000000002", quantity=1, rate="500",
            total_amount="500", status="Advance Received", advance_received=True, advance_amount="200",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name="Kavya", phone="9000000002", total_amount="500",
            delivery_method="Customer Pickup",
        )
        delivery = CRMDelivery.objects.create(
            order=order, delivery_type="Customer Pickup", pickup_location="Bakery",
            pickup_person_type="Customer", pickup_person_name="Kavya", pickup_contact="9000000002",
            pickup_time="2026-10-10T10:00:00Z",
        )
        CRMInvoice.objects.create(order=order, customer_name="Kavya", phone="9000000002", total_amount="500")

        start = self.client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json")
        self.assertEqual(start.status_code, 200, start.data)
        self.assertEqual(MessageLog.objects.filter(event="out_for_delivery").count(), 1)

        deliver = self.client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "deliver"}, format="json")
        self.assertEqual(deliver.status_code, 200, deliver.data)
        self.assertEqual(MessageLog.objects.filter(event="delivered").count(), 1)
