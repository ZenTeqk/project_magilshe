from datetime import date, timedelta
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import CRMDelivery, CRMInvoice, CRMOrder, Lead, Quotation
from .serializers import LeadSerializer, QuotationSerializer


class LeadSerializerTests(TestCase):
    def valid_data(self):
        return {
            "customer_name": "Asha",
            "phone": "9876543210",
            "occasion": "Birthday",
            "event_date": timezone.localdate() + timedelta(days=1),
            "cake_type": "Theme Cake",
            "quantity": 1,
        }

    def test_quick_entry_is_valid(self):
        self.assertTrue(LeadSerializer(data=self.valid_data()).is_valid())

    def test_rejects_past_date_and_invalid_phone(self):
        data = self.valid_data()
        data.update(phone="123", event_date=timezone.localdate() - timedelta(days=1))
        serializer = LeadSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)
        self.assertIn("event_date", serializer.errors)

    def test_status_specific_fields_are_required(self):
        lead = Lead.objects.create(**self.valid_data())
        follow_up = LeadSerializer(lead, data={"status": "Follow-up"}, partial=True)
        self.assertFalse(follow_up.is_valid())
        self.assertIn("follow_up_date", follow_up.errors)
        lost = LeadSerializer(lead, data={"status": "Lost"}, partial=True)
        self.assertFalse(lost.is_valid())
        self.assertIn("loss_reason", lost.errors)
        won = LeadSerializer(
            lead, data={"status": "Won", "winning_reason": "Returning Customer"}, partial=True
        )
        self.assertTrue(won.is_valid(), won.errors)

    def test_lead_number_increments(self):
        first = Lead.objects.create(**self.valid_data())
        second = Lead.objects.create(**{**self.valid_data(), "phone": "9876543211"})
        self.assertRegex(first.lead_no, r"^L/\d{2}/\d{2}/\d{2}/00001$")
        self.assertTrue(second.lead_no.endswith("00002"))

    def test_lead_number_resets_each_day(self):
        with patch("crm.numbering.timezone.localdate", return_value=date(2026, 7, 24)):
            first = Lead.objects.create(**self.valid_data())
        with patch("crm.numbering.timezone.localdate", return_value=date(2026, 7, 25)):
            second = Lead.objects.create(**{**self.valid_data(), "phone": "9876543211"})
        self.assertEqual(first.lead_no, "L/26/07/24/00001")
        self.assertEqual(second.lead_no, "L/26/07/25/00001")


class QuotationTests(TestCase):
    def test_quotation_links_to_lead_without_copying_customer(self):
        lead = Lead.objects.create(
            customer_name="Asha", phone="9876543210", occasion="Wedding",
            event_date=timezone.localdate() + timedelta(days=2),
            cake_type="Wedding Cake", quantity=1, status="Won"
        )
        quotation = Quotation.objects.create(lead=lead)
        self.assertEqual(quotation.lead.customer_name, "Asha")
        self.assertRegex(quotation.quotation_no, r"^Q/\d{2}/\d{2}/\d{2}/00001$")

    def test_manual_quotation_calculates_gst_and_balance(self):
        quotation = Quotation.objects.create(
            customer_name="Walk-in Customer", phone="9876543210",
            cake_type="Theme Cake", quantity=2, rate="500.00",
            gst_enabled=True, gst_percentage="18.00", advance_amount="200.00",
        )
        self.assertIsNone(quotation.lead)
        self.assertEqual(quotation.subtotal, 1000)
        self.assertEqual(quotation.gst_amount, 180)
        self.assertEqual(quotation.total_amount, 1180)
        self.assertEqual(quotation.balance_amount, 980)

    def test_legacy_quotation_response_falls_back_to_lead_snapshot(self):
        lead = Lead.objects.create(
            customer_name="Legacy Customer", phone="9876543210", occasion="Wedding",
            event_date=timezone.localdate() + timedelta(days=2),
            cake_type="Wedding Cake", quantity=1, status="Won"
        )
        quotation = Quotation.objects.create(lead=lead, total_amount=500)
        data = QuotationSerializer(quotation).data
        self.assertEqual(data["customer_name"], "Legacy Customer")
        self.assertEqual(data["phone"], "9876543210")

    def test_confirm_order_is_duplicate_safe(self):
        User = get_user_model()
        staff = User.objects.create_user(username="order-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        quotation = Quotation.objects.create(
            customer_name="Order Customer", phone="9876543210", cake_type="Cake",
            quantity=1, rate="1000", advance_received=True, advance_amount="500",
            status="Advance Received",
        )
        first = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        second = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(CRMOrder.objects.filter(quotation=quotation).count(), 1)
        listed = client.get("/crm/orders/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data[0]["quotation"], quotation.id)

    def test_confirm_order_requires_accepted_quotation_and_advance(self):
        User = get_user_model()
        staff = User.objects.create_user(username="validation-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        quotation = Quotation.objects.create(
            customer_name="Pending Customer", phone="9876543210", cake_type="Cake",
            quantity=1, rate="1000", status="Accepted",
        )
        response = client.post(
            f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(CRMOrder.objects.filter(quotation=quotation).count(), 0)


class LeadCustomerLinkingTests(TestCase):
    def setUp(self):
        Customer = get_user_model()
        self.staff = Customer.objects.create_user(
            username="crm-staff", password="test-password"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def lead_data(self, phone):
        return {
            "customer_name": "Narendran A",
            "phone": phone,
            "occasion": "Birthday",
            "event_date": timezone.localdate() + timedelta(days=1),
            "cake_type": "Theme Cake",
            "quantity": 1,
        }

    def test_new_lead_links_one_exact_existing_customer(self):
        Customer = get_user_model()
        customer = Customer.objects.create_user(
            username="9876543210", phone="9876543210", first_name="Narendran A"
        )

        response = self.client.post("/crm/leads/", self.lead_data("9876543210"), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        lead = Lead.objects.get(id=response.data["id"])
        self.assertEqual(lead.customer, customer)
        self.assertEqual(lead.customer_name, "Narendran A")
        self.assertNotIn("customer", response.data)

    def test_customer_match_returns_prefill_profile(self):
        Customer = get_user_model()
        customer = Customer.objects.create_user(
            username="9876543210", phone="9876543210",
            first_name="Narendran A", email="narendran@example.com",
        )
        customer.customeraddress_set.create(
            address="12 Bakery Street", city="Chennai", pincode="600001", is_primary=True
        )

        response = self.client.get("/crm/leads/customer-match/", {"phone": "9876543210"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["id"], customer.id)
        self.assertEqual(response.data["data"]["name"], "Narendran A")
        self.assertEqual(response.data["data"]["address_details"][0]["city"], "Chennai")

        directory = self.client.get("/crm/customers/")
        self.assertEqual(directory.status_code, 200, directory.data)
        listed = next(row for row in directory.data if row["id"] == customer.id)
        self.assertEqual(listed["addresses"][0]["title"], None)
        detail = self.client.get(f"/crm/customers/{customer.id}/")
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertIn("payments", detail.data["history"])

    def test_unmatched_lead_does_not_create_authentication_customer(self):
        Customer = get_user_model()
        before = Customer.objects.count()

        response = self.client.post("/crm/leads/", self.lead_data("9123456780"), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(Lead.objects.get(id=response.data["id"]).customer)
        self.assertEqual(Customer.objects.count(), before)

    def test_ambiguous_phone_match_is_not_linked(self):
        Customer = get_user_model()
        Customer.objects.create_user(username="customer-one", phone="9000000000")
        Customer.objects.create_user(username="customer-two", phone="9000000000")

        response = self.client.post("/crm/leads/", self.lead_data("9000000000"), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(Lead.objects.get(id=response.data["id"]).customer)


class PhaseThreeWorkflowTests(TestCase):
    def test_same_as_billing_keeps_quotation_shipping_snapshot_in_sync(self):
        serializer = QuotationSerializer(data={
            "customer_name": "Address Customer", "phone": "9876543210",
            "billing_address": "10 Billing Road, Chennai",
            "shipping_same_as_billing": True,
            "items": [{"item_name": "Cake", "quantity": 1, "rate": "500.00"}],
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        quotation = serializer.save()
        self.assertEqual(quotation.address, quotation.billing_address)

    def test_order_to_invoice_to_delivery_closes_linked_workflow(self):
        User = get_user_model()
        staff = User.objects.create_user(username="phase-three-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        lead = Lead.objects.create(
            customer_name="Workflow Customer", phone="9876543210", occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2), cake_type="Theme Cake",
            quantity=1, status="Won",
        )
        quotation = Quotation.objects.create(
            lead=lead, customer_name=lead.customer_name, phone=lead.phone,
            cake_type="Theme Cake", quantity=1, rate="1000.00", total_amount="1000.00",
            advance_received=True, advance_amount="500.00", status="Advance Received",
        )
        confirmed = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order_id = confirmed.data["data"]["id"]
        self.assertEqual(client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "start_processing"}, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "mark_ready"}, format="json").status_code, 200)
        invoice_response = client.post(f"/crm/orders/{order_id}/generate-invoice/", {}, format="json")
        self.assertEqual(invoice_response.status_code, 201, invoice_response.data)
        invoice_id = invoice_response.data["data"]["id"]
        payment = client.post(f"/crm/invoices/{invoice_id}/record-payment/", {
            "amount": "500.00", "payment_method": "Cash",
            "payment_date": timezone.localdate().isoformat(),
        }, format="json")
        self.assertEqual(payment.status_code, 201, payment.data)
        self.assertEqual(client.post(f"/crm/invoices/{invoice_id}/payment-completed/", {}, format="json").status_code, 200)
        delivery_response = client.post(f"/crm/invoices/{invoice_id}/move-to-delivery/", {}, format="json")
        self.assertEqual(delivery_response.status_code, 201, delivery_response.data)
        delivery_id = delivery_response.data["data"]["id"]
        pickup_payload = {
            "delivery_type": "Customer Pickup", "pickup_person_type": "Customer",
            "pickup_person_name": "Workflow Customer", "pickup_contact": "9876543210",
            "pickup_time": timezone.now().isoformat(), "pickup_location": "Bakery",
        }
        self.assertEqual(client.patch(f"/crm/deliveries/{delivery_id}/", pickup_payload, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery_id}/workflow-action/", {"action": "start"}, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery_id}/workflow-action/", {"action": "deliver"}, format="json").status_code, 200)
        lead.refresh_from_db(); quotation.refresh_from_db()
        order = CRMOrder.objects.get(pk=order_id)
        invoice = CRMInvoice.objects.get(pk=invoice_id)
        delivery = CRMDelivery.objects.get(pk=delivery_id)
        self.assertEqual((lead.status, quotation.status, order.status, invoice.status, delivery.delivery_status),
                         ("Completed", "Closed", "Closed", "Paid", "Delivered Successfully"))
        self.assertIsNotNone(delivery.completed_at)

        dashboard = client.get("/crm/leads/crm-dashboard/")
        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        self.assertEqual(dashboard.data["workflows"][0]["stage"], "Delivery")
        self.assertEqual(dashboard.data["workflows"][0]["status"], "Delivered Successfully")

    def test_delivery_start_requires_type_specific_fields(self):
        User = get_user_model()
        staff = User.objects.create_user(username="delivery-validation-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500001")
        response = client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("delivery_person", response.data.get("fields", []))

    def test_magilshe_delivery_flow_reaches_delivered_successfully(self):
        User = get_user_model()
        staff = User.objects.create_user(username="magilshe-flow-staff", password="password")
        from delivery_person.models import DeliveryPerson
        delivery_person = DeliveryPerson.objects.create(name="Ravi", phone="9000011111", status=True)
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500002")
        payload = {
            "delivery_type": "Magilshe Delivery", "delivery_person": delivery_person.id,
            "delivery_time": timezone.now().isoformat(), "delivery_location": "12 Test Street",
        }
        self.assertEqual(client.patch(f"/crm/deliveries/{delivery.id}/", payload, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "deliver"}, format="json").status_code, 200)
        delivery.refresh_from_db()
        self.assertEqual(delivery.delivery_status, "Delivered Successfully")

    def test_porter_delivery_can_be_marked_damaged_with_description(self):
        User = get_user_model()
        staff = User.objects.create_user(username="porter-damage-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500003")
        payload = {
            "delivery_type": "Porter Delivery", "porter_id": "PORTER-1", "porter_name": "Rapido Runner",
            "porter_contact": "9000022222", "porter_location": "12 Test Street",
            "porter_time": timezone.now().isoformat(),
        }
        self.assertEqual(client.patch(f"/crm/deliveries/{delivery.id}/", payload, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json").status_code, 200)
        failed_without_reason = client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "mark_damaged"}, format="json")
        self.assertEqual(failed_without_reason.status_code, 400)
        response = client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "mark_damaged", "damage_description": "Box crushed in transit"}, format="json")
        self.assertEqual(response.status_code, 200)
        delivery.refresh_from_db()
        self.assertEqual(delivery.delivery_status, "Damaged During Delivery")
        self.assertEqual(delivery.damage_description, "Box crushed in transit")

    def test_delivery_marked_failed_records_reason(self):
        User = get_user_model()
        staff = User.objects.create_user(username="delivery-failed-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500004")
        pickup_payload = {
            "delivery_type": "Customer Pickup", "pickup_person_type": "Customer",
            "pickup_person_name": "Failed Flow Customer", "pickup_contact": "9876500004",
            "pickup_time": timezone.now().isoformat(), "pickup_location": "Bakery",
        }
        self.assertEqual(client.patch(f"/crm/deliveries/{delivery.id}/", pickup_payload, format="json").status_code, 200)
        self.assertEqual(client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json").status_code, 200)
        response = client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "mark_failed", "failure_reason": "Customer unavailable"}, format="json")
        self.assertEqual(response.status_code, 200)
        delivery.refresh_from_db()
        self.assertEqual(delivery.delivery_status, "Delivery Failed")
        self.assertEqual(delivery.failure_reason, "Customer unavailable")

    def test_damage_image_upload_and_delete(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        User = get_user_model()
        staff = User.objects.create_user(username="damage-image-staff", password="password")
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500005")
        with patch("crm.views.put_image_to_s3", return_value=True):
            upload = SimpleUploadedFile("damage.jpg", b"fake-bytes", content_type="image/jpeg")
            response = client.post(f"/crm/deliveries/{delivery.id}/damage-images/", {"images": [upload]}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        image_id = response.data["data"][0]["id"]
        detail = client.get(f"/crm/deliveries/{delivery.id}/")
        self.assertEqual(len(detail.data["damage_images"]), 1)
        with patch("crm.views.get_s3_session") as mock_session:
            mock_session.return_value.resource.return_value.Object.return_value.delete.return_value = None
            delete_response = client.delete(f"/crm/deliveries/{delivery.id}/damage-images/{image_id}/")
        self.assertEqual(delete_response.status_code, 204)

    def _make_delivery(self, client, phone):
        """Create a lead -> quotation -> order -> paid invoice -> delivery, returning the CRMDelivery."""
        lead = Lead.objects.create(
            customer_name="Flow Customer", phone=phone, occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2), cake_type="Theme Cake",
            quantity=1, status="Won",
        )
        quotation = Quotation.objects.create(
            lead=lead, customer_name=lead.customer_name, phone=lead.phone,
            cake_type="Theme Cake", quantity=1, rate="1000.00", total_amount="1000.00",
            advance_received=True, advance_amount="1000.00", status="Advance Received",
        )
        confirmed = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        order_id = confirmed.data["data"]["id"]
        client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "start_processing"}, format="json")
        client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "mark_ready"}, format="json")
        invoice_response = client.post(f"/crm/orders/{order_id}/generate-invoice/", {}, format="json")
        invoice_id = invoice_response.data["data"]["id"]
        client.post(f"/crm/invoices/{invoice_id}/record-payment/", {
            "amount": "1000.00", "payment_method": "Cash",
            "payment_date": timezone.localdate().isoformat(),
        }, format="json")
        client.post(f"/crm/invoices/{invoice_id}/payment-completed/", {}, format="json")
        delivery_response = client.post(f"/crm/invoices/{invoice_id}/move-to-delivery/", {}, format="json")
        return CRMDelivery.objects.get(pk=delivery_response.data["data"]["id"])


class OrderDirectCreationAndCancellationTests(TestCase):
    def _client(self, username):
        User = get_user_model()
        staff = User.objects.create_user(username=username, password="password")
        client = APIClient()
        client.force_authenticate(staff)
        return client, staff

    def direct_order_payload(self, phone="9876511111", advance_amount="500.00"):
        return {
            "customer_name": "Walk-in Customer", "phone": phone,
            "occasion": "Birthday", "event_date": (timezone.localdate() + timedelta(days=3)).isoformat(),
            "items": [{"item_name": "Chocolate Truffle", "flavour": "Chocolate", "weight": "1", "quantity": 1, "rate": "1000.00", "gst_percentage": 0}],
            "delivery_type": "Pickup", "address": "Bakery counter",
            "advance_amount": advance_amount,
            "payment_method": "Cash", "payment_date": timezone.localdate().isoformat(),
        }

    def test_create_direct_order_reaches_confirmed_status_with_items(self):
        client, _ = self._client("direct-order-staff")
        response = client.post("/crm/orders/direct/", self.direct_order_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        order = CRMOrder.objects.get(pk=response.data["data"]["id"])
        self.assertEqual(order.status, "Confirmed")
        self.assertEqual(order.customer_name, "Walk-in Customer")
        self.assertEqual(str(order.total_amount), "1000.00")
        self.assertEqual(str(order.advance_paid), "500.00")
        self.assertEqual(order.items.count(), 1)
        self.assertIsNotNone(order.quotation_id)
        self.assertIsNone(order.quotation.lead_id)

    def test_direct_order_requires_a_positive_advance_amount(self):
        client, _ = self._client("direct-order-noadvance-staff")
        payload = self.direct_order_payload(phone="9876511112", advance_amount="0")
        response = client.post("/crm/orders/direct/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("advance_amount", response.data)

    def test_direct_order_advance_cannot_exceed_total(self):
        client, _ = self._client("direct-order-overadvance-staff")
        payload = self.direct_order_payload(phone="9876511113", advance_amount="5000.00")
        response = client.post("/crm/orders/direct/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("advance_amount", response.data)

    def test_direct_order_requires_customer_name_and_phone(self):
        client, _ = self._client("direct-order-missing-customer-staff")
        payload = self.direct_order_payload(phone="9876511114")
        payload.pop("customer_name")
        response = client.post("/crm/orders/direct/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("customer_name", response.data)

    def _confirmed_order(self, client, phone):
        response = client.post("/crm/orders/direct/", self.direct_order_payload(phone=phone), format="json")
        return CRMOrder.objects.get(pk=response.data["data"]["id"])

    def test_cancel_order_requires_a_reason(self):
        client, _ = self._client("cancel-noreason-staff")
        order = self._confirmed_order(client, "9876522221")
        response = client.post(f"/crm/orders/{order.id}/workflow-action/", {"action": "cancel_order"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cancellation_reason", response.data.get("fields", []))
        order.refresh_from_db()
        self.assertEqual(order.status, "Confirmed")

    def test_cancel_order_records_reason_timestamp_and_staff(self):
        client, staff = self._client("cancel-success-staff")
        order = self._confirmed_order(client, "9876522222")
        response = client.post(
            f"/crm/orders/{order.id}/workflow-action/",
            {"action": "cancel_order", "cancellation_reason": "Customer cancelled"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        order.refresh_from_db()
        self.assertEqual(order.status, "Cancelled")
        self.assertEqual(order.cancellation_reason, "Customer cancelled")
        self.assertIsNotNone(order.cancelled_at)
        self.assertEqual(order.cancelled_by_id, staff.id)

    def test_cancelled_order_stays_visible_and_is_not_deleted(self):
        client, _ = self._client("cancel-visible-staff")
        order = self._confirmed_order(client, "9876522223")
        client.post(f"/crm/orders/{order.id}/workflow-action/", {"action": "cancel_order", "cancellation_reason": "Duplicate order"}, format="json")
        listing = client.get("/crm/orders/")
        rows = listing.data["results"] if isinstance(listing.data, dict) else listing.data
        order_nos = [row["order_no"] for row in rows]
        self.assertIn(order.order_no, order_nos)
        self.assertTrue(CRMOrder.objects.filter(pk=order.id).exists())

    def test_order_cannot_be_cancelled_once_it_reaches_delivery(self):
        client, _ = self._client("cancel-blocked-staff")
        order = self._confirmed_order(client, "9876522224")
        order.status = "Delivery"
        order.save(update_fields=("status", "updated_on"))
        response = client.post(f"/crm/orders/{order.id}/workflow-action/", {"action": "cancel_order", "cancellation_reason": "Customer cancelled"}, format="json")
        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertNotEqual(order.status, "Cancelled")
