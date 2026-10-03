from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from crm.models import CRMDelivery, CRMInvoice, CRMOrder, Quotation
from .models import AUTO_SENDABLE_EVENTS, MessageLog, MessageTemplate, WhatsAppSettings
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

    def _enable_auto_send(self, *events, master=True):
        settings_row = WhatsAppSettings.load()
        settings_row.auto_send_enabled = master
        settings_row.auto_send_events = list(events)
        settings_row.save()

    def test_trigger_event_does_nothing_when_not_opted_into_auto_send(self):
        self._enable_auto_send()
        make_template(status=MessageTemplate.STATUS_APPROVED)
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 0)

    def test_trigger_event_sends_when_opted_in_with_one_active_template(self):
        self._enable_auto_send("quotation_sent")
        make_template(status=MessageTemplate.STATUS_APPROVED)
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 1)
        self.assertIsNone(MessageLog.objects.first().sent_by)

    def test_master_switch_off_blocks_every_automatic_send(self):
        self._enable_auto_send("quotation_sent", master=False)
        make_template(status=MessageTemplate.STATUS_APPROVED)
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 0)

    def test_send_waits_for_commit(self):
        """Nothing is sent until the surrounding transaction commits."""
        self._enable_auto_send("quotation_sent")
        make_template(status=MessageTemplate.STATUS_APPROVED)
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            trigger_event("quotation_sent", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 0)
        self.assertEqual(len(callbacks), 1)

    def test_trigger_event_skips_when_multiple_active_templates_are_ambiguous(self):
        self._enable_auto_send("quotation_sent")
        make_template(name="quotation_sent_a", status=MessageTemplate.STATUS_APPROVED)
        make_template(name="quotation_sent_b", status=MessageTemplate.STATUS_APPROVED)
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 0)

    def test_manual_only_events_never_auto_send(self):
        self._enable_auto_send("follow_up", "payment_reminder")
        make_template(name="follow_up_v1", event="follow_up", status=MessageTemplate.STATUS_APPROVED,
                      body="Hi {{1}}", variable_map={"1": "customer_name"})
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("follow_up", self.quotation)
        self.assertEqual(MessageLog.objects.count(), 0)


def make_event_template(event):
    return make_template(
        name=f"{event}_v1", event=event, status=MessageTemplate.STATUS_APPROVED,
        body="Hi {{1}}", variable_map={"1": "customer_name"},
    )


class CRMEventTriggerIntegrationTests(TestCase):
    """Every automatic stage, fired through the same endpoint its real button
    uses. A test that changes the status some other way can pass while the
    real button never sends -- exactly what happened with Quotation Sent."""

    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_superuser(username="wa-staff", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        settings_row = WhatsAppSettings.load()
        settings_row.auto_send_enabled = True
        settings_row.auto_send_events = list(AUTO_SENDABLE_EVENTS)
        settings_row.save()

    def post(self, url, data=None):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(url, data or {}, format="json")
        self.assertIn(response.status_code, (200, 201), getattr(response, "data", None))
        return response

    def sent(self, event):
        return MessageLog.objects.filter(event=event).count()

    def make_quotation(self, **extra):
        return Quotation.objects.create(
            customer_name="Arun", phone="9000000001", quantity=1, rate="500", total_amount="500", **extra,
        )

    def make_order(self, **extra):
        quotation = self.make_quotation(status="Order Confirmed", advance_received=True, advance_amount="200")
        return CRMOrder.objects.create(
            quotation=quotation, customer_name="Arun", phone="9000000001",
            total_amount="500", advance_paid="200", **extra,
        )

    def test_quotation_send_accept_and_cancel_buttons(self):
        for event in ("quotation_sent", "quotation_accepted", "quotation_cancelled"):
            make_event_template(event)
        quotation = self.make_quotation()
        url = f"/crm/quotations/{quotation.id}/workflow-action/"
        self.post(url, {"action": "send"})
        self.assertEqual(self.sent("quotation_sent"), 1)
        self.post(url, {"action": "accept"})
        self.assertEqual(self.sent("quotation_accepted"), 1)
        self.post(url, {"action": "cancel"})
        self.assertEqual(self.sent("quotation_cancelled"), 1)

    def test_recording_an_advance(self):
        make_event_template("quotation_advance_received")
        quotation = self.make_quotation(status="Accepted")
        self.post(f"/crm/quotations/{quotation.id}/record-payment/", {
            "amount": "200", "payment_method": "Cash", "payment_date": timezone.localdate().isoformat(),
        })
        self.assertEqual(self.sent("quotation_advance_received"), 1)

    def test_order_processing_ready_and_cancel_buttons(self):
        for event in ("order_processing", "order_ready", "order_cancelled"):
            make_event_template(event)
        order = self.make_order()
        url = f"/crm/orders/{order.id}/workflow-action/"
        self.post(url, {"action": "start_processing"})
        self.assertEqual(self.sent("order_processing"), 1)
        self.post(url, {"action": "mark_ready"})
        self.assertEqual(self.sent("order_ready"), 1)

        other = self.make_order()
        self.post(f"/crm/orders/{other.id}/workflow-action/", {
            "action": "cancel_order", "cancellation_reason": "Customer changed plans",
        })
        self.assertEqual(self.sent("order_cancelled"), 1)

    def test_order_cancelled_message_carries_the_reason(self):
        make_template(
            name="order_cancelled_v1", event="order_cancelled", status=MessageTemplate.STATUS_APPROVED,
            body="Order {{1}} cancelled: {{2}}", variable_map={"1": "order_no", "2": "cancellation_reason"},
        )
        settings_row = WhatsAppSettings.load()
        settings_row.waba_id, settings_row.phone_number_id, settings_row.access_token = "w", "p", "t"
        settings_row.save()
        order = self.make_order()
        with patch("whatsapp.services._graph_request") as mock_request:
            mock_request.return_value = {"messages": [{"id": "wamid.1"}]}
            self.post(f"/crm/orders/{order.id}/workflow-action/", {
                "action": "cancel_order", "cancellation_reason": "Shop closed",
            })
        params = mock_request.call_args.kwargs["json"]["template"]["components"][0]["parameters"]
        self.assertEqual(params[1]["text"], "Shop closed")

    def test_delivery_workflow_actions_fire_whatsapp_triggers(self):
        make_event_template("out_for_delivery")
        make_event_template("delivered")
        order = self.make_order(delivery_method="Customer Pickup")
        delivery = CRMDelivery.objects.create(
            order=order, delivery_type="Customer Pickup", pickup_location="Bakery",
            pickup_person_type="Customer", pickup_person_name="Arun", pickup_contact="9000000001",
            pickup_time="2026-10-10T10:00:00Z",
        )
        CRMInvoice.objects.create(order=order, customer_name="Arun", phone="9000000001", total_amount="500")
        url = f"/crm/deliveries/{delivery.id}/workflow-action/"
        self.post(url, {"action": "start"})
        self.assertEqual(self.sent("out_for_delivery"), 1)
        self.post(url, {"action": "deliver"})
        self.assertEqual(self.sent("delivered"), 1)

    def test_whatsapp_failure_does_not_break_the_crm_action(self):
        make_event_template("quotation_sent")
        quotation = self.make_quotation()
        with patch("whatsapp.services.send_template_message", side_effect=RuntimeError("boom")):
            response = self.post(f"/crm/quotations/{quotation.id}/workflow-action/", {"action": "send"})
        quotation.refresh_from_db()
        self.assertEqual(quotation.status, "Sent")
        self.assertEqual(response.status_code, 200)
