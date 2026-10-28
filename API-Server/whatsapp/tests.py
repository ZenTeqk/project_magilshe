from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

import hashlib
import hmac
import importlib
import json
from datetime import timedelta
from io import StringIO

from django.apps import apps
from django.core.management import call_command

from crm.models import (
    CRMDelivery, CRMInvoice, CRMOption, CRMOrder, CustomerCommunicationLog, CustomerRecurringEvent, Quotation,
)
from crm.recurring_events import event_type_for_occasion
from .models import AUTO_SENDABLE_EVENTS, MessageLog, MessageTemplate, OptOut, WhatsAppSettings
from .occasion_reminders import due_reminders, send_due_reminders
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
        # Stored as a 10-digit mobile; Meta needs the country code.
        self.assertEqual(sent_payload["to"], "919876543210")

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
        with patch("whatsapp.services._graph_request") as mock_graph, self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        mock_graph.assert_not_called()
        log = MessageLog.objects.get()
        self.assertEqual((log.status, log.phone, log.source_label), (MessageLog.STATUS_FAILED, "9876543210", "Q/1"))
        self.assertIn("2 Active templates", log.error_message)

    def test_opted_in_event_without_an_active_template_is_logged_not_dropped(self):
        self._enable_auto_send("quotation_sent")
        make_template()  # Draft only
        with self.captureOnCommitCallbacks(execute=True):
            trigger_event("quotation_sent", self.quotation)
        log = MessageLog.objects.get()
        self.assertEqual(log.status, MessageLog.STATUS_FAILED)
        self.assertIn("no Active template", log.error_message)

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

    def test_document_templates_attach_each_customers_pdf_end_to_end(self):
        """Send -> record advance -> confirm -> invoice, through the real
        buttons, with document templates: each message carries its own PDF."""
        connect()
        for event in ("quotation_sent", "quotation_advance_received", "invoice_generated"):
            make_template(
                name=f"{event}_doc", event=event, header_type=MessageTemplate.HEADER_DOCUMENT,
                status=MessageTemplate.STATUS_APPROVED, body="Hi {{1}}, your document is attached.",
                variable_map={"1": "customer_name"}, header_media_handle="h", header_media_key="sample.pdf",
            )
        quotation = self.make_quotation(status="Draft", quotation_no="QT-55")
        uploads = []

        def meta(method, path, *args, **kwargs):
            if path.endswith("/media"):
                uploads.append(kwargs["files"]["file"][0])
                return {"id": f"media-{len(uploads)}"}
            return {"messages": [{"id": f"wamid.{len(uploads)}"}]}

        with patch("whatsapp.services._graph_request", side_effect=meta):
            self.post(f"/crm/quotations/{quotation.id}/workflow-action/", {"action": "send"})
            self.post(f"/crm/quotations/{quotation.id}/workflow-action/", {"action": "accept"})
            self.post(f"/crm/quotations/{quotation.id}/record-payment/", {
                "amount": "200", "payment_method": "Cash", "payment_date": timezone.localdate().isoformat(),
            })
            order_id = self.post(f"/crm/quotations/{quotation.id}/confirm-order/").data["data"]["id"]
            CRMOrder.objects.filter(pk=order_id).update(status="Ready")
            self.post(f"/crm/orders/{order_id}/generate-invoice/")

        payment = quotation.payments.get()
        invoice = CRMInvoice.objects.get(order_id=order_id)
        self.assertEqual(uploads, [
            "Quotation-QT-55.pdf", f"Receipt-QT-55-R{payment.pk}.pdf", f"Invoice-{invoice.invoice_no.replace('/', '-')}.pdf",
        ])
        self.assertEqual(
            sorted(MessageLog.objects.filter(status="sent").values_list("event", flat=True)),
            sorted(["quotation_sent", "quotation_advance_received", "invoice_generated"]),
        )
        # Events turned on in Settings but without a template are logged, not silently dropped.
        skipped = MessageLog.objects.exclude(status="sent")
        self.assertEqual(sorted(skipped.values_list("event", flat=True)), ["order_confirmed", "quotation_accepted"])
        self.assertTrue(all("no Active template" in log.error_message for log in skipped))

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


def connect(**extra):
    settings_row = WhatsAppSettings.load()
    settings_row.waba_id = "waba-1"
    settings_row.phone_number_id = "phone-1"
    settings_row.access_token = "token"
    for field, value in extra.items():
        setattr(settings_row, field, value)
    settings_row.save()
    return settings_row


class OccasionReminderTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.customer = get_user_model().objects.create_user(
            username="occasion-customer", password="x", first_name="Priya", phone="9876500001",
        )
        connect(occasion_reminders_enabled=True, occasion_reminder_types=["birthday", "anniversary"])
        self.template = make_template(
            name="occasion_reminder_v1", category=MessageTemplate.CATEGORY_MARKETING, event="occasion_reminder",
            status=MessageTemplate.STATUS_APPROVED, body="Hi {{1}}, your {{2}} is on {{3}}!",
            variable_map={"1": "customer_name", "2": "occasion", "3": "occasion_date"},
        )

    def event_in(self, days, event_type="Birthdays", customer=None):
        when = self.today + timedelta(days=days)
        return CustomerRecurringEvent.objects.create(
            customer=customer or self.customer, event_type=event_type,
            event_month=when.month, event_day=when.day, original_date=when,
        )

    def test_only_selected_occasions_inside_the_reminder_window_are_due(self):
        due = self.event_in(5)
        self.event_in(10, event_type="Anniversaries")  # outside the 7-day window
        self.event_in(3, event_type="Engagements")  # not a selected occasion
        self.assertEqual([row["id"] for row in due_reminders()], [due.id])

    def test_sending_fills_the_template_and_marks_the_occasion_done(self):
        event = self.event_in(5)
        with patch("whatsapp.services._graph_request") as mock_request:
            mock_request.return_value = {"messages": [{"id": "wamid.occ"}]}
            counts = send_due_reminders()
        self.assertEqual(counts, {"sent": 1, "failed": 0, "skipped": 0})
        payload = mock_request.call_args.kwargs["json"]
        params = [p["text"] for p in payload["template"]["components"][0]["parameters"]]
        self.assertEqual(params[:2], ["Priya", "birthday"])
        self.assertEqual(payload["to"], "919876500001")
        event.refresh_from_db()
        self.assertEqual(event.last_reminder_sent_on, self.today)
        self.assertTrue(CustomerCommunicationLog.objects.filter(recurring_event=event).exists())
        # Once a year: a second run sends nothing.
        self.assertEqual(due_reminders(), [])

    def test_failed_send_is_retried_on_the_next_run(self):
        event = self.event_in(5)
        from .services import WhatsAppAPIError
        with patch("whatsapp.services._graph_request", side_effect=WhatsAppAPIError("boom")):
            counts = send_due_reminders()
        self.assertEqual(counts["failed"], 1)
        event.refresh_from_db()
        self.assertIsNone(event.last_reminder_sent_on)
        self.assertEqual(len(due_reminders()), 1)

    def test_opted_out_customer_is_listed_but_never_sent(self):
        self.event_in(5)
        OptOut.objects.create(phone="9876500001")
        rows = due_reminders()
        self.assertEqual(rows[0]["blocked_reason"], "Replied STOP")
        with patch("whatsapp.services._graph_request") as mock_request:
            counts = send_due_reminders()
        mock_request.assert_not_called()
        self.assertEqual(counts, {"sent": 0, "failed": 0, "skipped": 1})

    def test_review_mode_job_sends_nothing(self):
        self.event_in(5)
        with patch("whatsapp.services._graph_request") as mock_request:
            call_command("send_occasion_reminders", stdout=StringIO())
        mock_request.assert_not_called()

    def test_automatic_mode_job_sends(self):
        self.event_in(5)
        connect(occasion_reminder_mode="automatic")
        with patch("whatsapp.services._graph_request") as mock_request:
            mock_request.return_value = {"messages": [{"id": "wamid.auto"}]}
            call_command("send_occasion_reminders", stdout=StringIO())
        mock_request.assert_called_once()

    def test_reminders_turned_off_job_sends_nothing(self):
        self.event_in(5)
        connect(occasion_reminders_enabled=False, occasion_reminder_mode="automatic")
        with patch("whatsapp.services._graph_request") as mock_request:
            call_command("send_occasion_reminders", stdout=StringIO())
        mock_request.assert_not_called()

    def test_review_page_lists_and_sends_selected(self):
        first = self.event_in(2)
        other = get_user_model().objects.create_user(username="occ-2", password="x", first_name="Ravi", phone="9876500002")
        self.event_in(4, customer=other)
        admin = get_user_model().objects.create_superuser(username="occ-admin", password="x")
        client = APIClient()
        client.force_authenticate(admin)
        listing = client.get("/whatsapp/occasion-reminders/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.data["results"]), 2)
        self.assertEqual(listing.data["template_name"], "occasion_reminder_v1")
        with patch("whatsapp.services._graph_request") as mock_request:
            mock_request.return_value = {"messages": [{"id": "wamid.sel"}]}
            response = client.post("/whatsapp/occasion-reminders/", {"ids": [first.id]}, format="json")
        self.assertEqual(response.data, {"sent": 1, "failed": 0, "skipped": 0})
        self.assertEqual(len(client.get("/whatsapp/occasion-reminders/").data["results"]), 1)

    def test_staff_without_whatsapp_permission_cannot_list_or_send(self):
        staff = get_user_model().objects.create_user(username="occ-staff", password="x", is_staff=True)
        client = APIClient()
        client.force_authenticate(staff)
        self.assertEqual(client.get("/whatsapp/occasion-reminders/").status_code, 403)
        self.assertEqual(client.post("/whatsapp/occasion-reminders/", {}, format="json").status_code, 403)

    def test_without_exactly_one_active_template_nothing_sends(self):
        self.event_in(5)
        self.template.status = MessageTemplate.STATUS_DRAFT
        self.template.save()
        with self.assertRaises(WhatsAppError):
            send_due_reminders()


class OccasionNameTests(TestCase):
    def setUp(self):
        # Mirror production's CRM Settings list (the test DB seeds singulars).
        CRMOption.objects.filter(option_type="occasion").delete()
        for name in ("Birthdays", "Anniversaries", "Others", "Engagements"):
            CRMOption.objects.create(option_type="occasion", name=name, is_active=True)

    def test_any_spelling_maps_to_the_crm_settings_name(self):
        self.assertEqual(event_type_for_occasion("Birthday"), "Birthdays")
        self.assertEqual(event_type_for_occasion("birthday party"), "Birthdays")
        self.assertEqual(event_type_for_occasion("Anniversary"), "Anniversaries")
        self.assertEqual(event_type_for_occasion("Other"), "Others")
        self.assertEqual(event_type_for_occasion("Housewarming"), "Housewarming")

    def test_migration_renames_and_merges_duplicates(self):
        customer = get_user_model().objects.create_user(username="dup-customer", password="x")
        older = CustomerRecurringEvent.objects.create(
            customer=customer, event_type="Birthdays", event_month=9, event_day=9, original_date="2020-09-09",
        )
        duplicate = CustomerRecurringEvent.objects.create(
            customer=customer, event_type="Birthday", event_month=9, event_day=9, original_date="2020-09-09",
            notes="Likes chocolate",
        )
        CustomerCommunicationLog.objects.create(customer=customer, channel="whatsapp", recurring_event=duplicate)
        lone = CustomerRecurringEvent.objects.create(
            customer=customer, event_type="Anniversary", event_month=3, event_day=1, original_date="2020-03-01",
        )
        migration = importlib.import_module("crm.migrations.0037_normalise_customer_event_types")
        migration.normalise(apps, None)

        self.assertFalse(CustomerRecurringEvent.objects.filter(pk=duplicate.pk).exists())
        older.refresh_from_db()
        self.assertEqual(older.notes, "Likes chocolate")
        self.assertEqual(older.communications.count(), 1)
        lone.refresh_from_db()
        self.assertEqual(lone.event_type, "Anniversaries")


class WebhookSecurityAndOptOutTests(TestCase):
    def post(self, payload, secret=None, signature=None):
        body = json.dumps(payload).encode()
        headers = {}
        if signature is not None:
            headers["HTTP_X_HUB_SIGNATURE_256"] = signature
        elif secret:
            headers["HTTP_X_HUB_SIGNATURE_256"] = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return APIClient().post("/whatsapp/webhook/", body, content_type="application/json", **headers)

    def reply(self, text, sender="919876500009", kind="text"):
        message = {"from": sender, "type": kind}
        if kind == "button":
            message["button"] = {"text": text, "payload": text}
        else:
            message["text"] = {"body": text}
        return {"entry": [{"changes": [{"field": "messages", "value": {"messages": [message]}}]}]}

    def test_unsigned_call_is_rejected_once_app_secret_is_set(self):
        connect(app_secret="s3cret")
        response = self.post(self.reply("STOP"), signature="sha256=bad")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(OptOut.objects.exists())

    def test_signed_call_is_accepted(self):
        connect(app_secret="s3cret")
        response = self.post(self.reply("STOP"), secret="s3cret")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(OptOut.objects.filter(phone="9876500009").exists())

    def test_stop_button_and_start_text(self):
        self.post(self.reply("Stop reminders", kind="button"))
        self.assertTrue(OptOut.objects.filter(phone="9876500009").exists())
        self.post(self.reply("start"))
        self.assertFalse(OptOut.objects.exists())

    def test_ordinary_message_is_ignored(self):
        self.assertEqual(self.post(self.reply("hi")).status_code, 200)
        self.assertFalse(OptOut.objects.exists())

    def test_settings_never_echo_the_app_secret(self):
        connect(app_secret="s3cret")
        admin = get_user_model().objects.create_superuser(username="secret-admin", password="x")
        client = APIClient()
        client.force_authenticate(admin)
        data = client.get("/whatsapp/settings/").data
        self.assertNotIn("app_secret", data)
        self.assertTrue(data["has_app_secret"])
        # Saving other settings leaves the stored secret alone.
        client.patch("/whatsapp/settings/", {"app_secret": "", "occasion_reminder_types": ["Birthdays"]}, format="json")
        settings_row = WhatsAppSettings.load()
        self.assertEqual(settings_row.app_secret, "s3cret")
        self.assertEqual(settings_row.occasion_reminder_types, ["birthday"])


class MediaHeaderTests(TestCase):
    """Image/video/document headers: the sample file goes to Meta (for
    review) and to S3 (for sending), and every send hands Meta that file."""

    def setUp(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.file = lambda name="banner.png", content_type="image/png", size=10: SimpleUploadedFile(
            name, b"x" * size, content_type=content_type,
        )
        self.admin = get_user_model().objects.create_superuser(username="media-admin", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def upload(self, template, file):
        return self.client.post(f"/whatsapp/templates/{template.id}/upload-header/", {"file": file}, format="multipart")

    @patch("whatsapp.services.put_image_to_s3", return_value=True)
    @patch("whatsapp.services._graph_request")
    def test_upload_sends_file_to_meta_and_s3_and_unlocks_submit(self, mock_graph, mock_s3):
        connect(app_id="app-9")
        mock_graph.side_effect = [{"id": "upload:abc"}, {"h": "handle-123"}]
        template = make_template(name="occasion_img", header_type=MessageTemplate.HEADER_IMAGE)

        response = self.upload(template, self.file())

        self.assertEqual(response.status_code, 200, response.data)
        start, transfer = mock_graph.call_args_list
        self.assertEqual(start.args[1], "app-9/uploads")
        self.assertEqual(start.kwargs["params"], {"file_name": "banner.png", "file_length": 10, "file_type": "image/png"})
        self.assertEqual(transfer.args[1], "upload:abc")
        self.assertEqual(transfer.kwargs["headers"], {"Authorization": "OAuth token", "file_offset": "0"})
        template.refresh_from_db()
        self.assertEqual(template.header_media_handle, "handle-123")
        self.assertEqual(template.header_media_filename, "banner.png")
        self.assertTrue(template.header_media_key.startswith(f"cakery/whatsapp/templates/{template.id}/"))
        self.assertTrue(template.header_media_key.endswith(".png"))
        self.assertEqual(mock_s3.call_args.args[1], template.header_media_key)
        self.assertTrue(response.data["has_header_media"])

        # The submit payload now carries Meta's handle as the header example.
        mock_graph.side_effect = None
        mock_graph.return_value = {"id": "tpl-1"}
        submit_template_for_review(template)
        header = mock_graph.call_args.kwargs["json"]["components"][0]
        self.assertEqual(header, {"type": "HEADER", "format": "IMAGE", "example": {"header_handle": ["handle-123"]}})

    @patch("whatsapp.services._graph_request")
    def test_wrong_file_type_or_size_is_refused_before_meta(self, mock_graph):
        connect(app_id="app-9")
        image = make_template(name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE)
        document = make_template(name="doc_tpl", header_type=MessageTemplate.HEADER_DOCUMENT)

        self.assertEqual(self.upload(image, self.file("menu.pdf", "application/pdf")).status_code, 400)
        self.assertEqual(self.upload(document, self.file("banner.png")).status_code, 400)
        too_big = self.upload(image, self.file(size=5 * 1024 * 1024 + 1))
        self.assertEqual(too_big.status_code, 400)
        self.assertIn("5 MB", too_big.data["message"])
        mock_graph.assert_not_called()

    @patch("whatsapp.services._graph_request")
    def test_upload_needs_app_id_media_header_and_an_editable_template(self, mock_graph):
        connect()
        image = make_template(name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE)
        response = self.upload(image, self.file())
        self.assertEqual(response.status_code, 400)
        self.assertIn("App ID", response.data["message"])

        connect(app_id="app-9")
        text = make_template(name="text_tpl", header_type=MessageTemplate.HEADER_TEXT, header_text="Hi")
        self.assertEqual(self.upload(text, self.file()).status_code, 400)
        approved = make_template(name="live_tpl", header_type=MessageTemplate.HEADER_IMAGE, status=MessageTemplate.STATUS_APPROVED)
        self.assertEqual(self.upload(approved, self.file()).status_code, 400)
        mock_graph.assert_not_called()

    def test_changing_header_type_drops_the_uploaded_file(self):
        template = make_template(
            name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE,
            header_media_handle="h", header_media_key="k.png", header_media_filename="banner.png",
        )
        self.client.patch(f"/whatsapp/templates/{template.id}/", {"body": "Hi {{1}}, quotation {{2}}."}, format="json")
        template.refresh_from_db()
        self.assertEqual(template.header_media_handle, "h")  # unrelated edit keeps it

        self.client.patch(f"/whatsapp/templates/{template.id}/", {"header_type": "document"}, format="json")
        template.refresh_from_db()
        self.assertEqual((template.header_media_handle, template.header_media_key, template.header_media_filename), ("", "", ""))

    def test_duplicate_keeps_the_header_file(self):
        template = make_template(
            name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE, status=MessageTemplate.STATUS_APPROVED,
            header_media_handle="h", header_media_key="k.png", header_media_filename="banner.png",
        )
        copy = MessageTemplate.objects.get(pk=self.client.post(f"/whatsapp/templates/{template.id}/duplicate/").data["id"])
        self.assertEqual((copy.header_media_handle, copy.header_media_key, copy.header_media_filename), ("h", "k.png", "banner.png"))

    @patch("whatsapp.services.get_s3_file_url", return_value="https://s3.test/k.png?sig=1")
    @patch("whatsapp.services._graph_request", return_value={"messages": [{"id": "wamid.9"}]})
    def test_image_send_carries_the_header_file_ahead_of_the_body(self, mock_graph, _url):
        connect()
        quotation = Quotation.objects.create(customer_name="Priya", phone="9876543210", quotation_no="Q/1", quantity=1, rate="500")
        template = make_template(
            name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE, status=MessageTemplate.STATUS_APPROVED,
            header_media_handle="h", header_media_key="k.png",
        )
        log = send_template_message(template=template, record=quotation, event_key="quotation_sent")
        self.assertEqual(log.status, MessageLog.STATUS_SENT)
        header, body = mock_graph.call_args.kwargs["json"]["template"]["components"]
        self.assertEqual(header, {"type": "header", "parameters": [{"type": "image", "image": {"link": "https://s3.test/k.png?sig=1"}}]})
        self.assertEqual([p["text"] for p in body["parameters"]], ["Priya", "Q/1"])

    @patch("whatsapp.services.get_s3_file_url", return_value="https://s3.test/menu.pdf?sig=1")
    @patch("whatsapp.services._graph_request", return_value={"messages": [{"id": "wamid.9"}]})
    def test_document_send_names_the_file(self, mock_graph, _url):
        connect()
        template = make_template(
            name="menu_tpl", header_type=MessageTemplate.HEADER_DOCUMENT, status=MessageTemplate.STATUS_APPROVED,
            event="", variable_map={}, body="Here is our menu.",
            header_media_handle="h", header_media_key="menu.pdf", header_media_filename="Menu.pdf",
        )
        log = send_template_message(template=template, record=None, event_key="", recipient_phone="9876543210")
        self.assertEqual(log.status, MessageLog.STATUS_SENT)
        header = mock_graph.call_args.kwargs["json"]["template"]["components"][0]
        self.assertEqual(header["parameters"][0]["document"], {"link": "https://s3.test/menu.pdf?sig=1", "filename": "Menu.pdf"})

    def _doc_template(self, event):
        return make_template(
            name=f"{event}_doc", event=event, header_type=MessageTemplate.HEADER_DOCUMENT,
            status=MessageTemplate.STATUS_APPROVED, body="Hi {{1}}, here is your document.",
            variable_map={"1": "customer_name"}, header_media_handle="h", header_media_key="sample.pdf",
            header_media_filename="Sample.pdf",
        )

    def _send_capturing(self, template, record, event_key):
        """Runs a send with Meta mocked; returns (log, media upload call, message payload)."""
        with patch("whatsapp.services._graph_request") as mock_graph:
            mock_graph.side_effect = lambda method, path, *a, **kw: (
                {"id": "media-77"} if path.endswith("/media") else {"messages": [{"id": "wamid.1"}]}
            )
            log = send_template_message(template=template, record=record, event_key=event_key)
        upload = next((c for c in mock_graph.call_args_list if c.args[1].endswith("/media")), None)
        message = next((c.kwargs["json"] for c in mock_graph.call_args_list if c.args[1].endswith("/messages")), None)
        return log, upload, message

    def test_quotation_document_is_the_customers_own_pdf(self):
        connect()
        quotation = Quotation.objects.create(
            customer_name="Priya", phone="9876543210", quotation_no="Q/7", quantity=2, rate="500", total_amount="1000",
        )
        log, upload, message = self._send_capturing(self._doc_template("quotation_sent"), quotation, "quotation_sent")

        self.assertEqual(log.status, MessageLog.STATUS_SENT, log.error_message)
        filename, data, content_type = upload.kwargs["files"]["file"]
        self.assertEqual((filename, content_type), ("Quotation-Q-7.pdf", "application/pdf"))
        self.assertTrue(data.startswith(b"%PDF"))
        self.assertEqual(upload.kwargs["data"], {"messaging_product": "whatsapp", "type": "application/pdf"})
        header, body = message["template"]["components"]
        self.assertEqual(header["parameters"][0]["document"], {"id": "media-77", "filename": "Quotation-Q-7.pdf"})
        self.assertEqual(body["parameters"][0]["text"], "Priya")

    def test_advance_sends_the_latest_payment_receipt_and_invoice_sends_the_invoice(self):
        import datetime
        from crm.models import QuotationPayment
        connect()
        quotation = Quotation.objects.create(
            customer_name="Priya", phone="9876543210", quotation_no="Q/8", quantity=1, rate="900", total_amount="900",
            advance_received=True, advance_amount="400", status="Advance Received",
        )
        payment = QuotationPayment.objects.create(
            quotation=quotation, amount="400", payment_date=datetime.date(2026, 10, 28), payment_method="UPI",
        )
        log, upload, _ = self._send_capturing(self._doc_template("quotation_advance_received"), quotation, "quotation_advance_received")
        self.assertEqual(log.status, MessageLog.STATUS_SENT, log.error_message)
        self.assertEqual(upload.kwargs["files"]["file"][0], f"Receipt-Q-8-R{payment.pk}.pdf")

        order = CRMOrder.objects.create(quotation=quotation, customer_name="Priya", phone="9876543210", total_amount="900", advance_paid="400")
        invoice = CRMInvoice.objects.create(
            order=order, customer_name="Priya", phone="9876543210", total_amount="900", amount_paid="400", balance_amount="500",
        )
        log, upload, _ = self._send_capturing(self._doc_template("invoice_generated"), invoice, "invoice_generated")
        self.assertEqual(log.status, MessageLog.STATUS_SENT, log.error_message)
        self.assertEqual(upload.kwargs["files"]["file"][0], f"Invoice-{invoice.invoice_no.replace('/', '-')}.pdf")

    def test_pdf_failure_is_logged_and_nothing_is_sent(self):
        connect()
        quotation = Quotation.objects.create(customer_name="Priya", phone="9876543210", quotation_no="Q/9", quantity=1, rate="500")
        with patch("crm.pdf.documents.build_quotation_pdf", side_effect=RuntimeError("disk full")):
            log, upload, message = self._send_capturing(self._doc_template("quotation_sent"), quotation, "quotation_sent")
        self.assertEqual(log.status, MessageLog.STATUS_FAILED)
        self.assertIn("Could not build the PDF", log.error_message)
        self.assertIsNone(upload)
        self.assertIsNone(message)

    def test_empty_field_value_is_sent_as_a_dash_not_blank(self):
        connect()
        quotation = Quotation.objects.create(customer_name="Priya", phone="9876543210", quotation_no="Q/10", quantity=1, rate="500")
        template = make_template(
            name="with_event_date", status=MessageTemplate.STATUS_APPROVED, body="Hi {{1}}, event on {{2}}.",
            variable_map={"1": "customer_name", "2": "event_date"},
        )
        _, _, message = self._send_capturing(template, quotation, "quotation_sent")
        self.assertEqual([p["text"] for p in message["template"]["components"][0]["parameters"]], ["Priya", "-"])

    @patch("whatsapp.services._graph_request")
    def test_media_template_without_its_file_fails_with_a_clear_reason(self, mock_graph):
        connect()
        template = make_template(
            name="img_tpl", header_type=MessageTemplate.HEADER_IMAGE, status=MessageTemplate.STATUS_APPROVED,
            event="", variable_map={}, body="Hello there.",
        )
        log = send_template_message(template=template, record=None, event_key="", recipient_phone="9876543210")
        self.assertEqual(log.status, MessageLog.STATUS_FAILED)
        self.assertIn("header file is missing", log.error_message)
        mock_graph.assert_not_called()

    def test_settings_store_the_app_id(self):
        self.client.patch("/whatsapp/settings/", {"app_id": "app-9"}, format="json")
        self.assertEqual(WhatsAppSettings.load().app_id, "app-9")
        self.assertEqual(self.client.get("/whatsapp/settings/").data["app_id"], "app-9")


class TemplateExampleValueTests(TestCase):
    @patch("whatsapp.services._graph_request", return_value={"id": "tpl-1"})
    def test_submit_sends_realistic_samples_for_mapped_fields(self, mock_graph):
        connect()
        template = make_template(
            body="Hi {{1}}, quotation {{2}} totals {{3}}.",
            variable_map={"1": "customer_name", "2": "quotation_no"},  # {{3}} left unmapped
        )
        submit_template_for_review(template)
        body = mock_graph.call_args.kwargs["json"]["components"][0]
        self.assertEqual(body["example"], {"body_text": [["Priya", "QT-0012", "example3"]]})

    def test_event_catalogue_offers_a_sample_for_every_field(self):
        admin = get_user_model().objects.create_superuser(username="cat-admin", password="x")
        client = APIClient()
        client.force_authenticate(admin)
        fields = client.get("/whatsapp/event-catalogue/").data["fields_by_event"]
        missing = [(event, f["value"]) for event, entries in fields.items() for f in entries if not f["sample"]]
        self.assertEqual(missing, [])


class AccessTokenTests(TestCase):
    """"Invalid OAuth access token - Cannot parse access token" on Submit:
    a bad token paste used to be saved unchecked and only fail there."""

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(get_user_model().objects.create_superuser(username="tok-admin", password="x"))

    def meta_error(self, code, message, status=401):
        from .services import WhatsAppAPIError
        return WhatsAppAPIError(message, status_code=status, response_body={"error": {"code": code, "message": message}})

    def test_pasted_prefixes_quotes_and_line_breaks_are_cleaned(self):
        from .services import clean_access_token
        self.assertEqual(clean_access_token('  "Bearer EAAB12\n34cd" '), "EAAB1234cd")
        self.assertEqual(clean_access_token("OAuth EAAxyz"), "EAAxyz")
        self.assertEqual(clean_access_token("EAA abc\ndef"), "EAAabcdef")

    @patch("whatsapp.services._graph_request", return_value={"display_phone_number": "+91 98765 43210", "verified_name": "Magilshe Cakery"})
    def test_new_token_is_checked_with_meta_and_fills_the_business_details(self, mock_graph):
        response = self.client.patch(
            "/whatsapp/settings/", {"waba_id": "waba-1", "phone_number_id": "phone-1", "access_token": "Bearer EAAgood"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(mock_graph.call_args.args[1], "phone-1")
        self.assertEqual(mock_graph.call_args.args[2].access_token, "EAAgood")
        saved = WhatsAppSettings.load()
        self.assertEqual(saved.access_token, "EAAgood")
        self.assertEqual(saved.business_display_phone, "+91 98765 43210")
        self.assertEqual(saved.business_display_name, "Magilshe Cakery")

    @patch("whatsapp.services._graph_request")
    def test_token_meta_cannot_parse_is_refused_and_not_saved(self, mock_graph):
        connect(access_token="EAAold")
        mock_graph.side_effect = self.meta_error(190, "Invalid OAuth access token - Cannot parse access token")
        response = self.client.patch("/whatsapp/settings/", {"access_token": "not-a-token"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("did not accept this access token", str(response.data["access_token"]))
        self.assertEqual(WhatsAppSettings.load().access_token, "EAAold")

    @patch("whatsapp.services._graph_request")
    def test_unchanged_connection_and_other_settings_dont_call_meta(self, mock_graph):
        connect()
        response = self.client.patch(
            "/whatsapp/settings/", {"waba_id": "waba-1", "phone_number_id": "phone-1", "access_token": "", "auto_send_enabled": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        mock_graph.assert_not_called()

    @patch("whatsapp.services.requests.request")
    def test_token_error_on_submit_says_where_to_fix_it(self, mock_request):
        connect()
        mock_request.return_value.status_code = 401
        mock_request.return_value.json.return_value = {"error": {"code": 190, "message": "Invalid OAuth access token - Cannot parse access token"}}
        template = make_template()
        with self.assertRaises(Exception) as ctx:
            submit_template_for_review(template)
        self.assertIn("access token saved in WhatsApp Settings", str(ctx.exception))
        template.refresh_from_db()
        self.assertEqual(template.status, MessageTemplate.STATUS_PENDING)  # infra error, not a verdict
