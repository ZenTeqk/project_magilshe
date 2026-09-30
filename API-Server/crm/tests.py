from datetime import date, timedelta
import csv
from io import BytesIO, StringIO
from decimal import Decimal
from unittest.mock import patch
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from customer.models import CustomerAddress
from django.utils import timezone
from rest_framework.test import APIClient
from .models import CRMDelivery, CRMDeliveryDamageImage, CRMInvoice, CRMOption, CRMOrder, CRMOrderItem, CustomerRecurringEvent, Lead, LeadActivity, LeadReferenceImage, Quotation, QuotationActivity, QuotationItem, QuotationPayment, QuotationVersion
from .serializers import CRMDeliverySerializer, LeadSerializer, QuotationItemSerializer, QuotationSerializer, create_quotation_version
from .uploads import validate_image_upload
from .recurring_events import sync_recurring_event


class CRMCustomerImportExportTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="customer-import-export-admin", password="password"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def csv_upload(self, content, name="customers.csv"):
        return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv")

    def test_valid_csv_import_creates_persists_and_lists_customers(self):
        upload = self.csv_upload(
            "Customer Name,Phone Number,Email Address,Address,City,Pincode\n"
            "Imported Customer,9876543210,imported@example.com,12 Baker St,Chennai,600001\n"
        )
        response = self.client.post("/crm/customers/import/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["created"], 1)
        customer = get_user_model().objects.get(phone="9876543210", is_staff=False)
        self.assertEqual(customer.first_name, "Imported")
        self.assertEqual(customer.last_name, "Customer")
        self.assertEqual(customer.email, "imported@example.com")
        address = customer.customeraddress_set.get()
        self.assertEqual(address.address, "12 Baker St")
        self.assertEqual(address.city, "Chennai")
        directory = self.client.get("/crm/customers/", {"search": "9876543210"})
        self.assertEqual(directory.status_code, 200, directory.data)
        self.assertTrue(any(row["id"] == customer.id for row in directory.data))

    def test_valid_xlsx_import_creates_customer(self):
        from openpyxl import Workbook
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Name", "Phone", "Email"])
        sheet.append(["Excel Customer", "9876543211", "excel@example.com"])
        payload = BytesIO()
        workbook.save(payload)
        payload.seek(0)
        upload = SimpleUploadedFile(
            "customers.xlsx",
            payload.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response = self.client.post("/crm/customers/import/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["created"], 1)
        self.assertTrue(get_user_model().objects.filter(phone="9876543211", email="excel@example.com").exists())

    def test_import_updates_duplicate_phone_and_reports_invalid_rows(self):
        customer = get_user_model().objects.create_user(
            username="9876543212", phone="9876543212", first_name="Old", email="old@example.com"
        )
        upload = self.csv_upload(
            "Name,Phone,Email,Unknown Column\n"
            "Updated Customer,9876543212,updated@example.com,ignored\n"
        )
        unknown = self.client.post("/crm/customers/import/", {"file": upload}, format="multipart")
        self.assertEqual(unknown.status_code, 400)
        self.assertIn("Unknown Column", unknown.data["unknown_columns"])

        upload = self.csv_upload(
            "Name,Phone,Email\n"
            "Updated Customer,9876543212,updated@example.com\n"
            ",9876543213,missing-name@example.com\n"
            "Bad Phone,12345,bad-phone@example.com\n"
        )
        response = self.client.post("/crm/customers/import/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["updated"], 1)
        self.assertEqual(response.data["created"], 0)
        self.assertEqual(response.data["failed"], 2)
        customer.refresh_from_db()
        self.assertEqual(customer.first_name, "Updated")
        self.assertEqual(customer.last_name, "Customer")
        self.assertEqual(customer.email, "updated@example.com")
        self.assertTrue(any(error["row"] == 3 and "Missing customer name" in error["reason"] for error in response.data["errors"]))
        self.assertTrue(any(error["row"] == 4 and "valid 10-digit" in error["reason"] for error in response.data["errors"]))

    def test_export_returns_database_customer_data(self):
        customer = get_user_model().objects.create_user(
            username="9876543214", phone="9876543214", first_name="Export", last_name="Customer",
            email="export@example.com",
        )
        CustomerAddress.objects.create(
            customer=customer, title="Primary", address="99 Export Road",
            city="Chennai", pincode="600002", is_primary=True,
        )
        response = self.client.get("/crm/customers/export/", {"ids": str(customer.id)})
        self.assertEqual(response.status_code, 200)
        rows = list(csv.DictReader(StringIO(response.content.decode("utf-8"))))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["Customer ID"], str(customer.id))
        self.assertEqual(rows[0]["Name"], "Export Customer")
        self.assertEqual(rows[0]["Phone"], "9876543214")
        self.assertEqual(rows[0]["Email"], "export@example.com")
        self.assertEqual(rows[0]["Address"], "99 Export Road")
        self.assertEqual(rows[0]["Customer Status"], "Active")

    def test_customer_analytics_total_matches_active_customer_management_count(self):
        customers = [
            get_user_model().objects.create_user(
                username=f"9876543{index:03d}", phone=f"9876543{index:03d}", first_name=f"Customer {index}"
            )
            for index in range(210)
        ]
        archived = get_user_model().objects.create_user(
            username="9876543219", phone="9876543219", first_name="Archived", is_active=False
        )

        response = self.client.get("/crm/customers/analytics/", {
            "from_date": timezone.localdate().isoformat(),
            "to_date": timezone.localdate().isoformat(),
        })

        self.assertEqual(response.status_code, 200, response.data)
        ids = {row["id"] for row in response.data}
        self.assertEqual(len(response.data), len(customers))
        self.assertIn(customers[0].id, ids)
        self.assertIn(customers[-1].id, ids)
        self.assertNotIn(archived.id, ids)

    def test_customer_import_export_require_customer_data_permissions(self):
        unauthenticated = APIClient()
        self.assertIn(unauthenticated.get("/crm/customers/export/").status_code, (401, 403))
        upload = self.csv_upload("Name,Phone\nBlocked Customer,9876543215\n")
        self.assertIn(
            unauthenticated.post("/crm/customers/import/", {"file": upload}, format="multipart").status_code,
            (401, 403),
        )

        from customer.models import AccessPermission, AccessRole
        role = AccessRole.objects.create(name="Customer Export Only")
        role.permissions.add(AccessPermission.objects.get(code="customers.data.view"))
        staff = get_user_model().objects.create_user(
            username="customer-export-only", password="password", is_staff=True, role=role
        )
        client = APIClient()
        client.force_authenticate(staff)
        self.assertEqual(client.get("/crm/customers/export/").status_code, 200)
        upload = self.csv_upload("Name,Phone\nBlocked Customer,9876543216\n")
        self.assertEqual(client.post("/crm/customers/import/", {"file": upload}, format="multipart").status_code, 403)


class CRMStatusSummaryAndCancellationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username="status-admin", password="password")
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def make_order(self, suffix):
        quotation = Quotation.objects.create(
            customer_name=f"Customer {suffix}", phone=f"98765432{suffix:02d}",
            quantity=1, rate="500.00", status="Order Confirmed",
        )
        return CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name,
            phone=quotation.phone, total_amount="500.00", status="Confirmed",
        )

    def test_backend_counts_and_cancellations_share_persisted_statuses(self):
        invoice_order = self.make_order(1)
        delivery_order = self.make_order(2)
        invoice = CRMInvoice.objects.create(
            order=invoice_order, customer_name=invoice_order.customer_name,
            phone=invoice_order.phone, total_amount=500, balance_amount=500,
        )
        delivery = CRMDelivery.objects.create(order=delivery_order, delivery_status="Pending")

        before = self.client.get("/crm/leads/crm-dashboard/")
        self.assertEqual(before.status_code, 200, before.data)
        self.assertEqual(before.data["status_counts"]["orders"]["Confirmed"], 2)
        self.assertEqual(before.data["actionable"]["orders"], 2)
        self.assertEqual(before.data["actionable"]["invoices"], 1)
        self.assertEqual(before.data["actionable"]["deliveries"], 1)

        self.assertEqual(self.client.post(f"/crm/invoices/{invoice.id}/cancel/").status_code, 200)
        self.assertEqual(self.client.post(f"/crm/deliveries/{delivery.id}/cancel/").status_code, 200)
        invoice.refresh_from_db(); delivery.refresh_from_db()
        self.assertEqual(invoice.status, "Cancelled")
        self.assertEqual(delivery.delivery_status, "Cancelled")

        after = self.client.get("/crm/leads/crm-dashboard/")
        self.assertEqual(after.data["status_counts"]["invoices"]["Cancelled"], 1)
        self.assertEqual(after.data["status_counts"]["deliveries"]["Cancelled"], 1)
        self.assertEqual(after.data["actionable"]["invoices"], 0)
        self.assertEqual(after.data["actionable"]["deliveries"], 0)


class CRMPaymentConcurrencyAndCancellationTests(TransactionTestCase):
    reset_sequences = True
    # TransactionTestCase flushes the whole DB after each test; without this,
    # the RBAC roles/permissions seeded by data migrations only survive the
    # first test in the class and every test after it gets a role-less user.
    serialized_rollback = True

    def setUp(self):
        from customer.models import AccessRole
        User = get_user_model()
        finance_role = AccessRole.objects.filter(name="Accounts / Finance").first()
        self.user = User.objects.create_user(
            username="crm-finance-staff", password="password", is_staff=True, role=finance_role,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def make_invoice(self, total="1000.00", paid="0.00", status="Generated", order_status="Invoice Pending"):
        quotation = Quotation.objects.create(
            customer_name="Finance Customer", phone="9876543201",
            cake_type="Cake", quantity=1, rate=total, total_amount=total,
            advance_received=Decimal(paid) > 0, advance_amount=paid,
            status="Advance Received" if Decimal(paid) > 0 else "Order Confirmed",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name,
            phone=quotation.phone, total_amount=total, advance_paid=paid,
            status=order_status,
        )
        return CRMInvoice.objects.create(
            order=order, customer_name=order.customer_name, phone=order.phone,
            total_amount=total, amount_paid=paid,
            balance_amount=Decimal(total) - Decimal(paid), status=status,
        )

    def payment_payload(self, amount, reference=None):
        payload = {
            "amount": amount,
            "payment_method": "Cash",
            "payment_date": timezone.localdate().isoformat(),
        }
        if reference:
            payload["transaction_reference"] = reference
        return payload

    def test_invoice_payment_rejects_overpayment_and_keeps_totals(self):
        invoice = self.make_invoice(total="1000.00", paid="400.00")
        response = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("700.00"),
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        invoice.refresh_from_db()
        invoice.order.refresh_from_db()
        self.assertEqual(str(invoice.amount_paid), "400.00")
        self.assertEqual(str(invoice.balance_amount), "600.00")
        self.assertEqual(str(invoice.order.advance_paid), "400.00")
        self.assertEqual(QuotationPayment.objects.filter(quotation=invoice.order.quotation).count(), 0)

    def test_invoice_payment_exact_balance_marks_paid(self):
        invoice = self.make_invoice(total="1000.00", paid="400.00")
        response = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("600.00", "EXACT-1"),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        invoice.refresh_from_db()
        self.assertEqual(str(invoice.amount_paid), "1000.00")
        self.assertEqual(str(invoice.balance_amount), "0.00")
        self.assertEqual(invoice.status, "Paid")

    def test_invoice_payment_rejects_duplicate_transaction_reference(self):
        invoice = self.make_invoice(total="1000.00", paid="200.00")
        first = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("300.00", "UPI-123"),
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.data)
        second = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("100.00", "UPI-123"),
            format="json",
        )
        self.assertEqual(second.status_code, 400, second.data)
        self.assertEqual(QuotationPayment.objects.filter(quotation=invoice.order.quotation).count(), 1)

    def test_two_payments_cannot_exceed_locked_remaining_balance(self):
        invoice = self.make_invoice(total="1000.00", paid="0.00")
        first = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("700.00", "RACE-1"),
            format="json",
        )
        second = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("700.00", "RACE-2"),
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 400, second.data)
        invoice.refresh_from_db()
        self.assertEqual(str(invoice.amount_paid), "700.00")
        self.assertEqual(str(invoice.balance_amount), "300.00")

    def test_payment_creation_failure_rolls_back_invoice_and_order(self):
        invoice = self.make_invoice(total="1000.00", paid="400.00")
        with patch("crm.serializers.QuotationPaymentSerializer.create", side_effect=Exception("payment failed")):
            with self.assertRaises(Exception):
                self.client.post(
                    f"/crm/invoices/{invoice.id}/record-payment/",
                    self.payment_payload("100.00"),
                    format="json",
                )
        invoice.refresh_from_db()
        invoice.order.refresh_from_db()
        self.assertEqual(str(invoice.amount_paid), "400.00")
        self.assertEqual(str(invoice.balance_amount), "600.00")
        self.assertEqual(str(invoice.order.advance_paid), "400.00")

    def test_unpaid_invoice_cancellation_blocks_delivery_without_payments(self):
        invoice = self.make_invoice()
        response = self.client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        invoice.refresh_from_db()
        invoice.order.refresh_from_db()
        self.assertEqual(invoice.status, "Cancelled")
        self.assertEqual(invoice.order.status, "Ready")
        self.assertEqual(QuotationPayment.objects.filter(quotation=invoice.order.quotation).count(), 0)
        delivery = self.client.post(f"/crm/invoices/{invoice.id}/move-to-delivery/", {}, format="json")
        self.assertEqual(delivery.status_code, 400)

    def test_partially_paid_invoice_cancellation_preserves_payment_history(self):
        invoice = self.make_invoice(total="1000.00", paid="400.00")
        QuotationPayment.objects.create(
            quotation=invoice.order.quotation, amount="400.00",
            payment_method="Cash", payment_date=timezone.localdate(), collected_by=self.user,
        )
        response = self.client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Cancelled")
        self.assertEqual(str(invoice.amount_paid), "400.00")
        self.assertEqual(str(invoice.balance_amount), "600.00")
        self.assertEqual(QuotationPayment.objects.filter(quotation=invoice.order.quotation).count(), 1)

    def test_fully_paid_invoice_cannot_be_cancelled_without_reversal_workflow(self):
        invoice = self.make_invoice(total="1000.00", paid="1000.00", status="Paid")
        response = self.client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Paid")

    def test_cancelled_invoice_cannot_receive_new_payment_or_be_marked_paid(self):
        invoice = self.make_invoice()
        self.client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        pay = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            self.payment_payload("100.00"),
            format="json",
        )
        complete = self.client.post(f"/crm/invoices/{invoice.id}/payment-completed/", {}, format="json")
        self.assertEqual(pay.status_code, 400, pay.data)
        self.assertEqual(complete.status_code, 400, complete.data)

    def test_invoice_cancellation_cancels_pending_delivery_but_preserves_completed_delivery(self):
        pending_invoice = self.make_invoice(total="1000.00", paid="400.00")
        pending_delivery = CRMDelivery.objects.create(order=pending_invoice.order, delivery_status="Pending")
        response = self.client.post(f"/crm/invoices/{pending_invoice.id}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        pending_delivery.refresh_from_db()
        self.assertEqual(pending_delivery.delivery_status, "Cancelled")

        completed_invoice = self.make_invoice(total="1000.00", paid="400.00", status="Generated")
        completed_delivery = CRMDelivery.objects.create(order=completed_invoice.order, delivery_status="Delivered Successfully")
        blocked = self.client.post(f"/crm/invoices/{completed_invoice.id}/cancel/", {}, format="json")
        self.assertEqual(blocked.status_code, 400, blocked.data)
        completed_invoice.refresh_from_db()
        completed_delivery.refresh_from_db()
        self.assertEqual(completed_invoice.status, "Generated")
        self.assertEqual(completed_delivery.delivery_status, "Delivered Successfully")

    def test_unauthenticated_invoice_cancellation_is_rejected(self):
        invoice = self.make_invoice()
        client = APIClient()
        response = client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        self.assertIn(response.status_code, (401, 403))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, "Generated")

    def test_cancellation_rolls_back_if_downstream_delivery_update_fails(self):
        invoice = self.make_invoice(total="1000.00", paid="400.00")
        CRMDelivery.objects.create(order=invoice.order, delivery_status="Pending")
        with patch.object(CRMDelivery, "save", side_effect=Exception("delivery update failed")):
            with self.assertRaises(Exception):
                self.client.post(f"/crm/invoices/{invoice.id}/cancel/", {}, format="json")
        invoice.refresh_from_db()
        invoice.order.refresh_from_db()
        self.assertEqual(invoice.status, "Generated")
        self.assertEqual(invoice.order.status, "Invoice Pending")


class CRMOrderRecordPaymentPermissionTests(TestCase):
    """crm.orders.record_payment was unreachable: the endpoint required it but no
    role could ever be granted it. Covers the corrected permission definition."""

    def make_order(self, total="1000.00", advance="0.00"):
        quotation = Quotation.objects.create(
            customer_name="Order Payment Customer", phone="9876543202",
            cake_type="Cake", quantity=1, rate=total, total_amount=total,
            advance_received=Decimal(advance) > 0, advance_amount=advance,
            status="Advance Received" if Decimal(advance) > 0 else "Order Confirmed",
        )
        return CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name,
            phone=quotation.phone, total_amount=total, advance_paid=advance,
            status="Confirmed",
        )

    def make_role(self, name, codes):
        from customer.models import AccessPermission, AccessRole
        role = AccessRole.objects.create(name=name, is_active=True)
        role.permissions.set(AccessPermission.objects.filter(code__in=codes))
        return role

    def client_for(self, username, role):
        User = get_user_model()
        staff = User.objects.create_user(username=username, password="password", is_staff=True, role=role)
        client = APIClient()
        client.force_authenticate(staff)
        return client

    def payment_payload(self, amount="500.00", reference=None):
        payload = {"amount": amount, "payment_method": "Cash", "payment_date": timezone.localdate().isoformat()}
        if reference:
            payload["transaction_reference"] = reference
        return payload

    def test_role_with_orders_record_payment_can_record_a_payment(self):
        role = self.make_role("Order Payment Tester", ["crm.orders.view", "crm.orders.record_payment"])
        client = self.client_for("orders-record-payment-staff", role)
        order = self.make_order()
        response = client.post(f"/crm/orders/{order.id}/record-payment/", self.payment_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        order.refresh_from_db()
        self.assertEqual(order.advance_paid, Decimal("500.00"))

    def test_role_missing_record_payment_is_forbidden(self):
        role = self.make_role("Order Viewer Only", ["crm.orders.view", "crm.orders.edit", "crm.orders.process"])
        client = self.client_for("orders-view-only-staff", role)
        order = self.make_order()
        response = client.post(f"/crm/orders/{order.id}/record-payment/", self.payment_payload(), format="json")
        self.assertEqual(response.status_code, 403, response.data)
        order.refresh_from_db()
        self.assertEqual(order.advance_paid, Decimal("0.00"))

    def test_unauthenticated_request_is_rejected(self):
        order = self.make_order()
        response = APIClient().post(f"/crm/orders/{order.id}/record-payment/", self.payment_payload(), format="json")
        self.assertIn(response.status_code, (401, 403))

    def test_duplicate_transaction_reference_still_rejected_for_authorized_role(self):
        role = self.make_role("Order Payment Tester Dup", ["crm.orders.view", "crm.orders.record_payment"])
        client = self.client_for("orders-dup-ref-staff", role)
        order = self.make_order(total="2000.00")
        first = client.post(
            f"/crm/orders/{order.id}/record-payment/", self.payment_payload("500.00", reference="TXN-1"), format="json"
        )
        self.assertEqual(first.status_code, 201, first.data)
        second = client.post(
            f"/crm/orders/{order.id}/record-payment/", self.payment_payload("500.00", reference="TXN-1"), format="json"
        )
        self.assertEqual(second.status_code, 400, second.data)

    def test_super_admin_can_record_a_payment_without_explicit_role_grant(self):
        admin = get_user_model().objects.create_superuser(username="orders-payment-admin", password="password")
        client = APIClient()
        client.force_authenticate(admin)
        order = self.make_order()
        response = client.post(f"/crm/orders/{order.id}/record-payment/", self.payment_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)

    def test_orders_record_payment_does_not_grant_invoice_payment_access(self):
        role = self.make_role("Order Payment Only", ["crm.orders.view", "crm.orders.record_payment"])
        client = self.client_for("orders-only-staff", role)
        order = self.make_order()
        invoice = CRMInvoice.objects.create(
            order=order, customer_name=order.customer_name, phone=order.phone,
            total_amount=order.total_amount, amount_paid="0.00",
            balance_amount=order.total_amount, status="Generated",
        )
        response = client.post(f"/crm/invoices/{invoice.id}/record-payment/", self.payment_payload(), format="json")
        self.assertEqual(response.status_code, 403, response.data)


class CRMDeliveryDamageImagePermissionTests(TestCase):
    """crm.delivery had no 'create' action, so damage-images POST/DELETE (which
    fell through to the generic create/delete permission mapping) could never
    be granted to any non-super-admin role. Fixed by mapping both actions to
    the existing 'process' permission (matching workflow_action/cancel), not
    by inventing a new permission or broadening any role."""

    def make_role(self, name, codes):
        from customer.models import AccessPermission, AccessRole
        role = AccessRole.objects.create(name=name, is_active=True)
        role.permissions.set(AccessPermission.objects.filter(code__in=codes))
        return role

    def client_for(self, username, role):
        User = get_user_model()
        staff = User.objects.create_user(username=username, password="password", is_staff=True, role=role)
        client = APIClient()
        client.force_authenticate(staff)
        return client

    def make_delivery(self, client, phone):
        lead = Lead.objects.create(
            customer_name="Damage Perm Customer", phone=phone, occasion="Birthday",
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
        invoice_id = client.post(f"/crm/orders/{order_id}/generate-invoice/", {}, format="json").data["data"]["id"]
        client.post(f"/crm/invoices/{invoice_id}/record-payment/", {
            "amount": "1000.00", "payment_method": "Cash", "payment_date": timezone.localdate().isoformat(),
        }, format="json")
        client.post(f"/crm/invoices/{invoice_id}/payment-completed/", {}, format="json")
        delivery_id = client.post(f"/crm/invoices/{invoice_id}/move-to-delivery/", {}, format="json").data["data"]["id"]
        return CRMDelivery.objects.get(pk=delivery_id)

    def test_role_with_delivery_process_can_upload_damage_image(self):
        role = self.make_role("Delivery Process Tester", [
            "crm.leads.view", "crm.leads.create", "crm.leads.edit", "crm.leads.process",
            "crm.quotations.view", "crm.quotations.create", "crm.quotations.edit", "crm.quotations.process",
            "crm.orders.view", "crm.orders.create", "crm.orders.edit", "crm.orders.process", "crm.orders.record_payment",
            "crm.invoices.view", "crm.invoices.edit", "crm.invoices.process", "crm.invoices.record_payment",
            "crm.delivery.view", "crm.delivery.edit", "crm.delivery.process",
        ])
        client = self.client_for("delivery-process-staff", role)
        delivery = self.make_delivery(client, phone="9876500101")
        with patch("crm.views.put_image_to_s3", return_value=True):
            upload = SimpleUploadedFile("damage.png", PNG_BYTES, content_type="image/png")
            response = client.post(f"/crm/deliveries/{delivery.id}/damage-images/", {"images": [upload]}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        image_id = response.data["data"][0]["id"]

        with patch("crm.views.get_s3_session") as mock_session:
            mock_session.return_value.resource.return_value.Object.return_value.delete.return_value = None
            delete_response = client.delete(f"/crm/deliveries/{delivery.id}/damage-images/{image_id}/")
        self.assertEqual(delete_response.status_code, 204)

    def test_role_with_only_delivery_view_is_forbidden_from_uploading(self):
        setup_role = self.make_role("Damage Perm Setup", [
            "crm.leads.view", "crm.leads.create", "crm.leads.edit", "crm.leads.process",
            "crm.quotations.view", "crm.quotations.create", "crm.quotations.edit", "crm.quotations.process",
            "crm.orders.view", "crm.orders.create", "crm.orders.edit", "crm.orders.process", "crm.orders.record_payment",
            "crm.invoices.view", "crm.invoices.edit", "crm.invoices.process", "crm.invoices.record_payment",
            "crm.delivery.view", "crm.delivery.edit", "crm.delivery.process",
        ])
        setup_client = self.client_for("damage-perm-setup-staff", setup_role)
        delivery = self.make_delivery(setup_client, phone="9876500102")

        view_only_role = self.make_role("Delivery View Only", ["crm.delivery.view"])
        view_only_client = self.client_for("delivery-view-only-staff", view_only_role)

        upload = SimpleUploadedFile("damage.png", PNG_BYTES, content_type="image/png")
        response = view_only_client.post(
            f"/crm/deliveries/{delivery.id}/damage-images/", {"images": [upload]}, format="multipart",
        )
        self.assertEqual(response.status_code, 403, response.data)
        self.assertEqual(CRMDeliveryDamageImage.objects.filter(delivery=delivery).count(), 0)

        # view-only must also still be able to read the delivery (GET untouched by this fix)
        detail = view_only_client.get(f"/crm/deliveries/{delivery.id}/")
        self.assertEqual(detail.status_code, 200, detail.data)

    def test_delivery_edit_alone_does_not_grant_damage_image_upload(self):
        # Confirms no privilege escalation: crm.delivery.edit must not implicitly
        # cover the damage-images action now mapped to crm.delivery.process.
        setup_role = self.make_role("Damage Perm Setup 2", [
            "crm.leads.view", "crm.leads.create", "crm.leads.edit", "crm.leads.process",
            "crm.quotations.view", "crm.quotations.create", "crm.quotations.edit", "crm.quotations.process",
            "crm.orders.view", "crm.orders.create", "crm.orders.edit", "crm.orders.process", "crm.orders.record_payment",
            "crm.invoices.view", "crm.invoices.edit", "crm.invoices.process", "crm.invoices.record_payment",
            "crm.delivery.view", "crm.delivery.edit", "crm.delivery.process",
        ])
        setup_client = self.client_for("damage-perm-setup-staff-2", setup_role)
        delivery = self.make_delivery(setup_client, phone="9876500103")

        edit_only_role = self.make_role("Delivery Edit Only", ["crm.delivery.view", "crm.delivery.edit"])
        edit_only_client = self.client_for("delivery-edit-only-staff", edit_only_role)

        upload = SimpleUploadedFile("damage.png", PNG_BYTES, content_type="image/png")
        response = edit_only_client.post(
            f"/crm/deliveries/{delivery.id}/damage-images/", {"images": [upload]}, format="multipart",
        )
        self.assertEqual(response.status_code, 403, response.data)

    def test_unauthenticated_upload_is_rejected(self):
        response = APIClient().post("/crm/deliveries/1/damage-images/", {}, format="multipart")
        self.assertIn(response.status_code, (401, 403))


class QuotationVersionSnapshotTests(TestCase):
    def test_edit_preserves_generated_snapshot_until_explicit_regeneration(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-version-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Snapshot Customer", phone="9876543210",
            cake_type="Custom Cake", quantity=2, rate="500.00",
        )
        QuotationItem.objects.create(
            quotation=quotation, item_name="Custom Cake", quantity=2,
            unit_type="piece", rate="500.00", gst_percentage=0,
        )
        quotation.calculate_totals()
        quotation.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))
        version_one = create_quotation_version(quotation, user)

        edit = client.patch(
            f"/crm/quotations/{quotation.id}/",
            {"items": [{"item_name": "Custom Cake", "quantity": 5,
                        "unit_type": "piece", "rate": 500, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(edit.status_code, 200)
        self.assertEqual(edit.data["total_amount"], "2500.00")
        version_one.refresh_from_db()
        self.assertEqual(version_one.snapshot["total_amount"], "1000.00")
        self.assertEqual(version_one.snapshot["items"][0]["quantity"], "2.000")
        self.assertEqual(version_one.snapshot["items"][0]["amount"], "1000.00")
        self.assertEqual(QuotationVersion.objects.filter(quotation=quotation).count(), 1)

        regenerate = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 5,
                        "unit_type": "piece", "rate": 500, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(regenerate.status_code, 200)
        self.assertEqual(regenerate.data["current_version"]["version_number"], 2)
        self.assertEqual(regenerate.data["current_version"]["snapshot"]["total_amount"], "2500.00")
        self.assertEqual(QuotationVersion.objects.filter(quotation=quotation).count(), 2)

    def test_multiple_versions_keep_historical_values(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-version-history-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Version Customer", phone="9876543210",
            cake_type="Custom Cake", quantity=1, rate="1000.00",
        )
        QuotationItem.objects.create(
            quotation=quotation, item_name="Custom Cake", quantity=1,
            unit_type="piece", rate="1000.00", gst_percentage=0,
        )
        quotation.calculate_totals()
        quotation.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))
        v1 = create_quotation_version(quotation, user)

        v2_response = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 1000, "gst_percentage": 0}]},
            format="json",
        )
        v3_response = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 3,
                        "unit_type": "piece", "rate": 1000, "gst_percentage": 0}]},
            format="json",
        )

        self.assertEqual(v2_response.status_code, 200, v2_response.data)
        self.assertEqual(v3_response.status_code, 200, v3_response.data)
        v1.refresh_from_db()
        versions = list(QuotationVersion.objects.filter(quotation=quotation).order_by("version_number"))
        self.assertEqual([str(version.total_amount) for version in versions], ["1000.00", "2000.00", "3000.00"])
        self.assertEqual(v1.snapshot["total_amount"], "1000.00")
        self.assertEqual(v3_response.data["current_version"]["snapshot"]["total_amount"], "3000.00")

    def test_v1_and_v2_snapshots_remain_unchanged_after_v3(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-version-regression-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Regression Customer", phone="9876543210",
            cake_type="Custom Cake", quantity=1, rate="1000.00",
        )
        QuotationItem.objects.create(
            quotation=quotation, item_name="Custom Cake", quantity=1,
            unit_type="piece", rate="1000.00", gst_percentage=0,
        )
        quotation.calculate_totals()
        quotation.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))
        v1 = create_quotation_version(quotation, user)

        v2_response = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 750, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(v2_response.status_code, 200, v2_response.data)
        v2 = QuotationVersion.objects.get(quotation=quotation, version_number=2)
        self.assertEqual(str(v2.total_amount), "1500.00")
        self.assertEqual(v2.snapshot["total_amount"], "1500.00")
        self.assertEqual(v2.snapshot["items"][0]["quantity"], "2.000")
        self.assertEqual(v2.snapshot["items"][0]["rate"], "750.00")

        v3_response = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 3,
                        "unit_type": "piece", "rate": 800, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(v3_response.status_code, 200, v3_response.data)

        v1.refresh_from_db()
        v2.refresh_from_db()
        v3 = QuotationVersion.objects.get(quotation=quotation, version_number=3)
        self.assertEqual(str(v1.total_amount), "1000.00")
        self.assertEqual(v1.snapshot["total_amount"], "1000.00")
        self.assertEqual(v1.snapshot["items"][0]["quantity"], "1.000")
        self.assertEqual(v1.snapshot["items"][0]["rate"], "1000.00")
        self.assertEqual(str(v2.total_amount), "1500.00")
        self.assertEqual(v2.snapshot["total_amount"], "1500.00")
        self.assertEqual(v2.snapshot["items"][0]["quantity"], "2.000")
        self.assertEqual(v2.snapshot["items"][0]["rate"], "750.00")
        self.assertEqual(str(v3.total_amount), "2400.00")
        self.assertEqual(v3.snapshot["total_amount"], "2400.00")
        self.assertEqual(v3.snapshot["items"][0]["quantity"], "3.000")
        self.assertEqual(v3.snapshot["items"][0]["rate"], "800.00")
        self.assertEqual(v3_response.data["current_version"]["version_number"], 3)
        self.assertEqual(v3_response.data["current_version"]["snapshot"]["total_amount"], "2400.00")

    def test_edit_before_finalization_drives_order_invoice_and_payment_values(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-downstream-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Downstream Customer", phone="9876543210",
            cake_type="Custom Cake", quantity=1, rate="1000.00", status="Accepted",
        )
        QuotationItem.objects.create(
            quotation=quotation, item_name="Custom Cake", quantity=1,
            unit_type="piece", rate="1000.00", gst_percentage=0,
        )
        quotation.calculate_totals()
        quotation.save(update_fields=("subtotal", "gst_amount", "total_amount", "updated_on"))

        payment = client.post(
            f"/crm/quotations/{quotation.id}/record-payment/",
            {"amount": "300.00", "payment_date": timezone.localdate().isoformat(), "payment_method": "Cash"},
            format="json",
        )
        self.assertEqual(payment.status_code, 201, payment.data)
        edit = client.patch(
            f"/crm/quotations/{quotation.id}/",
            {"items": [{"item_name": "Custom Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 600, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(edit.status_code, 200, edit.data)
        self.assertEqual(edit.data["total_amount"], "1200.00")
        self.assertEqual(edit.data["balance_amount"], "900.00")

        confirmed = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order = CRMOrder.objects.get(quotation=quotation)
        self.assertEqual(str(order.total_amount), "1200.00")
        self.assertEqual(str(order.advance_paid), "300.00")
        self.assertEqual(str(order.balance_amount), "900.00")

        order.status = "Ready"
        order.save(update_fields=("status", "updated_on"))
        invoice_response = client.post(f"/crm/orders/{order.id}/generate-invoice/", {}, format="json")
        self.assertEqual(invoice_response.status_code, 201, invoice_response.data)
        invoice = CRMInvoice.objects.get(order=order)
        self.assertEqual(str(invoice.total_amount), "1200.00")
        self.assertEqual(str(invoice.amount_paid), "300.00")
        self.assertEqual(str(invoice.balance_amount), "900.00")

    def test_finalized_confirmed_quotation_rejects_edits_and_new_versions(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-lock-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Locked Customer", phone="9876543210",
            cake_type="Custom Cake", quantity=1, rate="1000.00",
            total_amount="1000.00", advance_received=True,
            advance_amount="300.00", status="Advance Received",
        )
        confirmed = client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)

        edit = client.patch(
            f"/crm/quotations/{quotation.id}/",
            {"items": [{"item_name": "Custom Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 600, "gst_percentage": 0}]},
            format="json",
        )
        version = client.post(
            f"/crm/quotations/{quotation.id}/generate-version/",
            {"items": [{"item_name": "Custom Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 600, "gst_percentage": 0}]},
            format="json",
        )
        quotation.refresh_from_db()

        self.assertEqual(edit.status_code, 400, edit.data)
        self.assertEqual(version.status_code, 400, version.data)
        self.assertEqual(str(quotation.total_amount), "1000.00")

    def test_new_quotation_can_be_created_after_original_is_finalized(self):
        user = get_user_model().objects.create_superuser(
            username="quotation-new-after-final-admin", password="password"
        )
        client = APIClient(); client.force_authenticate(user)
        original = Quotation.objects.create(
            customer_name="Final Customer", phone="9876543210",
            cake_type="Original Cake", quantity=1, rate="1000.00",
            total_amount="1000.00", advance_received=True,
            advance_amount="300.00", status="Advance Received",
        )
        confirmed = client.post(f"/crm/quotations/{original.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        original_order = CRMOrder.objects.get(quotation=original)

        locked_edit = client.patch(
            f"/crm/quotations/{original.id}/",
            {"items": [{"item_name": "Original Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 600, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(locked_edit.status_code, 400, locked_edit.data)

        created = client.post(
            "/crm/quotations/",
            {
                "customer_name": "Final Customer",
                "phone": "9876543211",
                "items": [{"item_name": "New Cake", "quantity": 1,
                           "unit_type": "piece", "rate": 800, "gst_percentage": 0}],
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        new_quotation_id = created.data["id"]

        edited = client.patch(
            f"/crm/quotations/{new_quotation_id}/",
            {"items": [{"item_name": "New Cake", "quantity": 3,
                        "unit_type": "piece", "rate": 300, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data["total_amount"], "900.00")

        new_version = client.post(
            f"/crm/quotations/{new_quotation_id}/generate-version/",
            {"items": [{"item_name": "New Cake", "quantity": 2,
                        "unit_type": "piece", "rate": 500, "gst_percentage": 0}]},
            format="json",
        )
        self.assertEqual(new_version.status_code, 200, new_version.data)
        self.assertEqual(new_version.data["current_version"]["version_number"], 2)
        self.assertEqual(new_version.data["current_version"]["snapshot"]["total_amount"], "1000.00")

        original.refresh_from_db()
        original_order.refresh_from_db()
        self.assertEqual(original.status, "Order Confirmed")
        self.assertEqual(str(original.total_amount), "1000.00")
        self.assertEqual(str(original.advance_amount), "300.00")
        self.assertEqual(str(original_order.total_amount), "1000.00")
        self.assertEqual(str(original_order.advance_paid), "300.00")
        self.assertEqual(str(original_order.balance_amount), "700.00")


class QuotationAdvanceActionStateTests(TestCase):
    def test_recorded_advance_is_persisted_and_cannot_be_recorded_twice(self):
        user = get_user_model().objects.create_superuser(username="advance-state-admin", password="password")
        client = APIClient(); client.force_authenticate(user)
        quotation = Quotation.objects.create(
            customer_name="Advance Customer", phone="9876543299", cake_type="Cake",
            quantity=1, rate="709.00", total_amount="709.00", status="Accepted",
        )
        payload = {
            "amount": "400.00", "payment_date": timezone.localdate().isoformat(),
            "payment_method": "Cash",
        }
        first = client.post(f"/crm/quotations/{quotation.id}/record-payment/", payload, format="json")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(str(first.data["advance_amount"]), "400.00")
        self.assertEqual(str(first.data["balance_amount"]), "309.00")
        self.assertEqual(first.data["status"], "Advance Received")
        second = client.post(f"/crm/quotations/{quotation.id}/record-payment/", payload, format="json")
        self.assertEqual(second.status_code, 400, second.data)
        self.assertEqual(QuotationPayment.objects.filter(quotation=quotation).count(), 1)


class DeliveryAssignmentSnapshotTests(TestCase):
    def test_internal_staff_reference_and_manual_porter_details_persist(self):
        from delivery_person.models import DeliveryPerson, DeliveryPlatform, ExternalDeliveryPerson
        quotation = Quotation.objects.create(
            customer_name="Delivery Customer", phone="9876543288", cake_type="Cake",
            quantity=1, rate="500.00", total_amount="500.00",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name,
            phone=quotation.phone, total_amount="500.00",
        )
        delivery = CRMDelivery.objects.create(order=order)
        staff = DeliveryPerson.objects.create(name="Internal Rider", phone="9000000101")
        internal = CRMDeliverySerializer(delivery, data={
            "delivery_type": "Magilshe Delivery", "delivery_person": staff.id,
        }, partial=True)
        self.assertTrue(internal.is_valid(), internal.errors)
        internal.save(); delivery.refresh_from_db()
        self.assertEqual(delivery.delivery_person_id, staff.id)
        self.assertEqual(delivery.delivery_person_name_snapshot, "Internal Rider")
        self.assertEqual(delivery.delivery_person_phone_snapshot, "9000000101")

        platform = DeliveryPlatform.objects.create(name="Porter")
        existing_external_count = ExternalDeliveryPerson.objects.count()
        external = CRMDeliverySerializer(delivery, data={
            "delivery_type": "Porter Delivery", "external_platform": platform.id,
            "porter_name": "Porter Rider", "porter_contact": "9000000102",
            "tracking_link": "https://porter.in/track/test",
        }, partial=True)
        self.assertTrue(external.is_valid(), external.errors)
        external.save(); delivery.refresh_from_db()
        self.assertEqual(delivery.external_platform_id, platform.id)
        self.assertIsNone(delivery.external_delivery_person_id)
        self.assertEqual(ExternalDeliveryPerson.objects.count(), existing_external_count)
        self.assertEqual(delivery.external_person_name_snapshot, "Porter Rider")
        self.assertEqual(delivery.external_person_phone_snapshot, "9000000102")
        self.assertEqual(delivery.tracking_link, "https://porter.in/track/test")


class UpcomingCustomerEventsDashboardTests(TestCase):
    def test_configured_lead_occasion_syncs_event_notes_to_customer_event(self):
        customer = get_user_model().objects.create_user(
            username="event-note-customer", first_name="Event", last_name="Notes", phone="9000000202",
        )
        CRMOption.objects.update_or_create(
            option_type="occasion", name="Engagement", defaults={"is_active": True}
        )
        lead = Lead.objects.create(
            customer=customer,
            customer_name="Event Notes",
            phone="9000000202",
            occasion="Engagement",
            event_date=timezone.localdate() + timedelta(days=10),
            cake_type="Cake",
            quantity=1,
            unit_type="kg",
            event_notes="Prefers evening reminder.",
        )

        event = sync_recurring_event(lead)

        self.assertIsNotNone(event)
        self.assertEqual(event.event_type, "Engagement")
        self.assertEqual(event.notes, "Prefers evening reminder.")

    def test_feed_returns_real_events_nearest_first_and_supports_empty_window(self):
        user = get_user_model().objects.create_superuser(username="event-dashboard-admin", password="password")
        customer = get_user_model().objects.create_user(
            username="event-customer", first_name="Event", last_name="Customer", phone="9000000201",
        )
        today = timezone.localdate()
        later, sooner = today + timedelta(days=5), today + timedelta(days=1)
        CustomerRecurringEvent.objects.create(
            customer=customer, event_type="Anniversary", event_month=later.month,
            event_day=later.day, original_date=later, notes="Anniversary reminder",
        )
        nearest = CustomerRecurringEvent.objects.create(
            customer=customer, event_type="Birthday", event_month=sooner.month,
            event_day=sooner.day, original_date=sooner, notes="Birthday reminder",
        )
        client = APIClient(); client.force_authenticate(user)
        response = client.get("/crm/customers/upcoming-events/", {"days": 30})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["id"], nearest.id)
        self.assertEqual(response.data[0]["customer_id"], customer.id)
        self.assertEqual(response.data[0]["customer_name"], "Event Customer")
        self.assertEqual(response.data[0]["notes"], "Birthday reminder")
        empty = client.get("/crm/customers/upcoming-events/", {"days": 0})
        self.assertEqual(empty.status_code, 200, empty.data)
        self.assertEqual(empty.data, [])


class SaleUnitValidationTests(TestCase):
    def item(self, unit_type, quantity):
        return QuotationItemSerializer(data={
            "item_name": "Cake", "quantity": quantity, "unit_type": unit_type,
            "rate": "100.00", "gst_percentage": "0",
        })

    def test_kg_accepts_supported_decimal_quantities(self):
        for quantity in ("0.500", "1.000", "1.500", "2.500"):
            serializer = self.item("kg", quantity)
            self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_piece_requires_a_positive_whole_quantity(self):
        serializer = self.item("piece", "0.500")
        self.assertFalse(serializer.is_valid())
        self.assertIn("quantity", serializer.errors)

    def test_piece_accepts_whole_quantities(self):
        for quantity in ("1", "6"):
            serializer = self.item("piece", quantity)
            self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_kg_rejects_less_than_half_a_kilo(self):
        serializer = self.item("kg", "0.400")
        self.assertFalse(serializer.is_valid())
        self.assertIn("quantity", serializer.errors)

    def test_gram_and_other_units_are_not_accepted(self):
        for unit in ("Gram", "gram", "g", "grams", "box"):
            serializer = self.item(unit, "1")
            self.assertFalse(serializer.is_valid(), unit)
            self.assertIn("unit_type", serializer.errors)

    def test_active_setting_adds_a_sale_unit(self):
        CRMOption.objects.create(option_type="sale_unit", name="box", is_active=True)
        serializer = self.item("box", "3")
        self.assertTrue(serializer.is_valid(), serializer.errors)


class SaleUnitAmountCalculationTests(TestCase):
    def quotation_total(self, unit_type, quantity, rate):
        quotation = Quotation.objects.create(
            customer_name="Unit Customer", phone="9000000099", cake_type="Cake",
            quantity=quantity, rate=rate, total_amount="0",
        )
        item = QuotationItem.objects.create(
            quotation=quotation, item_name="Cake", quantity=quantity,
            unit_type=unit_type, rate=rate, gst_percentage="0",
        )
        quotation.calculate_totals()
        return item, quotation

    def test_kg_quantity_two_at_500_totals_1000(self):
        item, quotation = self.quotation_total("kg", "2", "500.00")
        self.assertEqual(item.amount, Decimal("1000.00"))
        self.assertEqual(quotation.subtotal, Decimal("1000.00"))
        self.assertEqual(quotation.total_amount, Decimal("1000.00"))

    def test_piece_quantity_25_at_234_totals_5850(self):
        item, quotation = self.quotation_total("piece", "25", "234.00")
        self.assertEqual(item.amount, Decimal("5850.00"))
        self.assertEqual(quotation.subtotal, Decimal("5850.00"))
        self.assertEqual(quotation.total_amount, Decimal("5850.00"))

    def test_item_without_rate_uses_manual_amount(self):
        quotation = Quotation.objects.create(
            customer_name="Unit Customer", phone="9000000098", cake_type="Cake",
            quantity=2, rate=None, total_amount="0",
        )
        item = QuotationItem.objects.create(
            quotation=quotation, item_name="Cake", quantity="2", unit_type="kg",
            rate=None, manual_amount="750.00", gst_percentage="0",
        )
        quotation.calculate_totals()
        self.assertEqual(item.amount, Decimal("750.00"))
        self.assertEqual(quotation.total_amount, Decimal("750.00"))

    def test_gram_quantity_250_at_500_per_kg_totals_125(self):
        item, quotation = self.quotation_total("gram", "250", "500.00")
        self.assertEqual(item.amount, Decimal("125.00"))
        self.assertEqual(quotation.total_amount, Decimal("125.00"))

    def test_custom_unit_uses_its_configured_conversion_factor(self):
        CRMOption.objects.create(option_type="sale_unit", name="lb", conversion_factor=Decimal("0.4536"))
        item, quotation = self.quotation_total("lb", "2", "500.00")
        self.assertEqual(item.amount, Decimal("453.60"))
        self.assertEqual(quotation.total_amount, Decimal("453.60"))

    def test_configured_gram_factor_overrides_default_heuristic(self):
        CRMOption.objects.create(option_type="sale_unit", name="gram", conversion_factor=Decimal("0.0005"))
        item, quotation = self.quotation_total("gram", "250", "500.00")
        self.assertEqual(item.amount, Decimal("62.50"))
        self.assertEqual(quotation.total_amount, Decimal("62.50"))

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
    b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
    b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
    b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class ImageUploadValidationTests(SimpleTestCase):
    def test_accepts_a_real_supported_image(self):
        upload = SimpleUploadedFile("proof.png", PNG_BYTES, content_type="image/png")
        self.assertEqual(validate_image_upload(upload), "png")

    def test_rejects_a_non_image_with_an_image_extension(self):
        upload = SimpleUploadedFile("fake.png", b"not-an-image", content_type="image/png")
        with self.assertRaisesRegex(ValueError, "valid image"):
            validate_image_upload(upload)


class CustomerDeliveryAddressPersistenceTests(TestCase):
    def test_selected_address_reference_and_snapshot_survive_address_changes(self):
        customer = get_user_model().objects.create_user(
            username="9876543999", first_name="John", last_name="Doe", phone="9876543999"
        )
        address = CustomerAddress.objects.create(
            customer=customer, title="Office", person_name="Jane Doe", phone="9876543111",
            address="XYZ Office, Main Road", city="Nagercoil", pincode="629001",
        )
        quotation = Quotation.objects.create(customer=customer, customer_name="John Doe", phone=customer.phone)
        order = CRMOrder.objects.create(
            quotation=quotation, customer=customer, customer_name="John Doe", phone=customer.phone
        )
        delivery = CRMDelivery.objects.create(order=order)

        serializer = CRMDeliverySerializer(delivery, data={"customer_address": address.id}, partial=True)
        serializer.is_valid(raise_exception=True)
        delivery = serializer.save()
        self.assertEqual(delivery.customer_address_id, address.id)
        self.assertEqual(delivery.recipient_name, "Jane Doe")
        self.assertEqual(delivery.recipient_phone, "9876543111")
        self.assertEqual(delivery.delivery_location, "XYZ Office, Main Road, Nagercoil, 629001")

        address.address = "Changed later"
        address.save(update_fields=("address", "updated_on"))
        serializer = CRMDeliverySerializer(
            delivery,
            data={"customer_address": address.id, "delivery_notes": "Keep historical destination"},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        delivery = serializer.save()
        self.assertEqual(delivery.delivery_location, "XYZ Office, Main Road, Nagercoil, 629001")

        address.delete()
        delivery.refresh_from_db()
        self.assertIsNone(delivery.customer_address_id)
        self.assertEqual(delivery.delivery_location, "XYZ Office, Main Road, Nagercoil, 629001")


class PersistentUploadFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_superuser(username="upload-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    @staticmethod
    def image(name="proof.png"):
        return SimpleUploadedFile(name, PNG_BYTES, content_type="image/png")

    @patch("crm.views.put_image_to_s3", return_value=True)
    @patch("crm.serializers.get_s3_file_url", side_effect=lambda key: f"https://files.example/{key}")
    def test_existing_lead_save_then_reference_upload_persists(self, _url, _upload):
        lead = Lead.objects.create(
            customer_name="Image Customer", phone="9876543210", occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2), cake_type="Custom Cake", quantity=1,
        )
        update = self.client.patch(
            f"/crm/leads/{lead.id}/", {"customer_name": "Updated Image Customer"}, format="json"
        )
        self.assertEqual(update.status_code, 200, update.data)

        upload = self.client.post(
            f"/crm/leads/{lead.id}/reference-images/", {"images": [self.image("cake.png")]},
            format="multipart",
        )

        self.assertEqual(upload.status_code, 201, upload.data)
        self.assertEqual(LeadReferenceImage.objects.filter(lead=lead).count(), 1)
        refreshed = self.client.get(f"/crm/leads/{lead.id}/")
        self.assertEqual(refreshed.status_code, 200, refreshed.data)
        self.assertEqual(refreshed.data["customer_name"], "Updated Image Customer")
        self.assertEqual(len(refreshed.data["reference_images"]), 1)
        self.assertIn("crm/lead/reference", refreshed.data["reference_images"][0]["url"])

    @patch("crm.serializers.put_image_to_s3", return_value=True)
    @patch("crm.serializers.get_s3_file_url", side_effect=lambda key: f"https://files.example/{key}")
    def test_invoice_payment_multipart_saves_record_and_proof_reference(self, _url, _upload):
        quotation = Quotation.objects.create(
            customer_name="Payment Customer", phone="9876543211", total_amount="1000.00",
            advance_received=True, advance_amount="400.00", status="Order Confirmed",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name, phone=quotation.phone,
            total_amount="1000.00", advance_paid="400.00",
        )
        invoice = CRMInvoice.objects.create(
            invoice_no="INV-UPLOAD-1", order=order, customer_name=order.customer_name,
            phone=order.phone, total_amount="1000.00", amount_paid="400.00",
            balance_amount="600.00", status="Generated",
        )

        response = self.client.post(
            f"/crm/invoices/{invoice.id}/record-payment/",
            {"amount": "600.00", "payment_date": timezone.localdate().isoformat(),
             "payment_method": "UPI", "proof": self.image()}, format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        payment = QuotationPayment.objects.get(quotation=quotation)
        self.assertTrue(payment.proof.name.startswith("cakery/crm/quotation/payment-proof/"))
        invoice.refresh_from_db()
        self.assertEqual((str(invoice.amount_paid), str(invoice.balance_amount), invoice.status),
                         ("1000.00", "0.00", "Paid"))
        refreshed = self.client.get(f"/crm/invoices/{invoice.id}/")
        self.assertEqual(refreshed.status_code, 200, refreshed.data)
        self.assertIn("crm/quotation/payment-proof", refreshed.data["payments"][0]["proof"])


class LeadDeleteTests(TestCase):
    """Normal lead delete archives; only Super Admin can permanently delete."""

    def setUp(self):
        from customer.models import AccessRole
        User = get_user_model()
        self.role = AccessRole.objects.filter(name="CRM Manager").first()
        self.staff = User.objects.create_user(
            username="lead-delete-staff", password="password", is_staff=True, role=self.role,
        )
        self.super_admin = User.objects.create_superuser(
            username="lead-lifecycle-admin", password="password",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def make_lead(self, phone):
        return Lead.objects.create(
            customer_name="Delete Test", phone=phone, occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2), cake_type="Theme Cake",
            quantity=1, status="Open",
        )

    def test_lead_without_quotation_is_archived(self):
        lead = self.make_lead("9876500201")
        response = self.client.delete(f"/crm/leads/{lead.id}/")
        self.assertEqual(response.status_code, 200)
        lead.refresh_from_db()
        self.assertTrue(lead.is_archived)
        self.assertIsNotNone(lead.archived_at)
        self.assertEqual(lead.archived_by, self.staff)

    def test_lead_with_quotation_archives_and_preserves_relationship(self):
        lead = self.make_lead("9876500202")
        quotation = Quotation.objects.create(lead=lead, customer_name=lead.customer_name, phone=lead.phone)
        response = self.client.delete(f"/crm/leads/{lead.id}/")
        self.assertEqual(response.status_code, 200, response.data)
        lead.refresh_from_db()
        quotation.refresh_from_db()
        self.assertTrue(lead.is_archived)
        self.assertEqual(quotation.lead_id, lead.id)

    def test_archived_lead_hidden_from_normal_list_and_visible_to_super_admin_archive_filter(self):
        lead = self.make_lead("9876500205")
        self.client.delete(f"/crm/leads/{lead.id}/")
        self.assertNotContains(self.client.get("/crm/leads/"), lead.lead_no)
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)
        response = admin_client.get("/crm/leads/", {"archived": "true"})
        self.assertContains(response, lead.lead_no)

    def test_super_admin_can_restore_archived_lead(self):
        lead = self.make_lead("9876500206")
        self.client.delete(f"/crm/leads/{lead.id}/")
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)
        response = admin_client.post(f"/crm/leads/{lead.id}/restore/")
        self.assertEqual(response.status_code, 200, response.data)
        lead.refresh_from_db()
        self.assertFalse(lead.is_archived)
        self.assertIsNone(lead.archived_at)

    def test_unauthorized_role_cannot_delete_lead(self):
        from customer.models import AccessRole
        restricted_role = AccessRole.objects.create(name="No Lead Delete", is_active=True)
        User = get_user_model()
        restricted_staff = User.objects.create_user(
            username="lead-delete-restricted", password="password", is_staff=True, role=restricted_role,
        )
        client = APIClient()
        client.force_authenticate(restricted_staff)
        lead = self.make_lead("9876500203")
        response = client.delete(f"/crm/leads/{lead.id}/")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Lead.objects.filter(id=lead.id).exists())

    def test_archive_preserves_activities(self):
        lead = self.make_lead("9876500204")
        LeadActivity.objects.create(lead=lead, action="Lead Created", staff=self.staff)
        response = self.client.delete(f"/crm/leads/{lead.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(LeadActivity.objects.filter(lead_id=lead.id).count(), 1)

    def test_permanent_delete_blocked_when_lead_has_quotation(self):
        lead = self.make_lead("9876500207")
        Quotation.objects.create(lead=lead, customer_name=lead.customer_name, phone=lead.phone)
        self.client.delete(f"/crm/leads/{lead.id}/")
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)
        response = admin_client.delete(f"/crm/leads/{lead.id}/permanent-delete/")
        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn("related quotation", response.data["message"])

    def test_super_admin_can_permanently_delete_archived_lead_with_owned_history(self):
        lead = self.make_lead("9876500208")
        LeadActivity.objects.create(lead=lead, action="Lead Created", staff=self.staff)
        LeadReferenceImage.objects.create(
            lead=lead, file_name="11111111-1111-1111-1111-111111111111",
            file_ext="jpg", original_name="reference.jpg", uploaded_by=self.staff,
        )
        self.client.delete(f"/crm/leads/{lead.id}/")
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)
        response = admin_client.delete(f"/crm/leads/{lead.id}/permanent-delete/")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(Lead.objects.filter(id=lead.id).exists())

    def test_super_admin_can_permanently_delete_archived_quotation_with_owned_history(self):
        quotation = Quotation.objects.create(
            customer_name="Delete Quote", phone="9876500209", cake_type="Cake",
            quantity=1, rate="100.00", total_amount="100.00",
        )
        QuotationPayment.objects.create(
            quotation=quotation, amount="10.00", payment_date=timezone.localdate(),
            payment_method="Cash", collected_by=self.staff,
        )
        QuotationActivity.objects.create(quotation=quotation, action="Quotation Created", staff=self.staff)
        QuotationVersion.objects.create(
            quotation=quotation, version_number=1, snapshot={"quotation_no": quotation.quotation_no},
            total_amount=quotation.total_amount, generated_by=self.staff,
        )
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)
        admin_client.delete(f"/crm/quotations/{quotation.id}/")
        response = admin_client.delete(f"/crm/quotations/{quotation.id}/permanent-delete/")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(Quotation.objects.filter(id=quotation.id).exists())

    def test_super_admin_can_permanently_delete_archived_order_invoice_and_delivery_leaf_records(self):
        quotation = Quotation.objects.create(
            customer_name="Delete Flow", phone="9876500210", cake_type="Cake",
            quantity=1, rate="100.00", total_amount="100.00",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name="Delete Flow", phone="9876500210",
            total_amount="100.00", advance_paid="50.00", status="Completed",
        )
        CRMOrderItem.objects.create(
            order=order, item_name="Cake", quantity=1, unit_type="kg",
            rate="100.00", gst_percentage=0, amount="100.00",
        )
        invoice = CRMInvoice.objects.create(
            order=order, customer_name="Delete Flow", phone="9876500210",
            subtotal="100.00", total_amount="100.00", amount_paid="50.00",
            balance_amount="50.00", status="Issued",
        )
        delivery = CRMDelivery.objects.create(
            order=order, delivery_status="Delivered Successfully",
            recipient_name="Delete Flow", recipient_phone="9876500210",
        )
        CRMDeliveryDamageImage.objects.create(
            delivery=delivery, file_name="22222222-2222-2222-2222-222222222222",
            file_ext="png", original_name="damage.png", uploaded_by=self.staff,
        )
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)

        admin_client.delete(f"/crm/deliveries/{delivery.id}/")
        response = admin_client.delete(f"/crm/deliveries/{delivery.id}/permanent-delete/")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(CRMDelivery.objects.filter(id=delivery.id).exists())

        admin_client.delete(f"/crm/invoices/{invoice.id}/")
        response = admin_client.delete(f"/crm/invoices/{invoice.id}/permanent-delete/")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(CRMInvoice.objects.filter(id=invoice.id).exists())

        admin_client.delete(f"/crm/orders/{order.id}/")
        response = admin_client.delete(f"/crm/orders/{order.id}/permanent-delete/")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(CRMOrder.objects.filter(id=order.id).exists())

    def test_crm_deletion_dependencies_report_linked_child_records(self):
        lead = self.make_lead("9876500211")
        quotation = Quotation.objects.create(
            lead=lead, customer_name=lead.customer_name, phone=lead.phone,
            cake_type="Cake", quantity=1, rate="100.00", total_amount="100.00",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name=lead.customer_name, phone=lead.phone,
            total_amount="100.00", status="Completed",
        )
        invoice = CRMInvoice.objects.create(
            order=order, customer_name=lead.customer_name, phone=lead.phone,
            subtotal="100.00", total_amount="100.00", balance_amount="100.00",
        )
        delivery = CRMDelivery.objects.create(
            order=order, delivery_status="Pending",
            recipient_name=lead.customer_name, recipient_phone=lead.phone,
        )
        admin_client = APIClient()
        admin_client.force_authenticate(self.super_admin)

        lead_dependencies = admin_client.get(f"/crm/leads/{lead.id}/deletion-dependencies/")
        self.assertEqual(lead_dependencies.status_code, 200, lead_dependencies.data)
        self.assertTrue(lead_dependencies.data["has_dependencies"])
        self.assertEqual(lead_dependencies.data["links"][0]["records"][0]["record_type"], "quotations")

        quotation_dependencies = admin_client.get(f"/crm/quotations/{quotation.id}/deletion-dependencies/")
        self.assertEqual(quotation_dependencies.status_code, 200, quotation_dependencies.data)
        self.assertEqual(quotation_dependencies.data["links"][0]["records"][0]["record_type"], "orders")

        quotation.is_archived = True
        quotation.status = "Order Confirmed"
        quotation.save(update_fields=("is_archived", "status", "updated_on"))
        blocked_delete = admin_client.delete(f"/crm/quotations/{quotation.id}/permanent-delete/")
        self.assertEqual(blocked_delete.status_code, 409, blocked_delete.data)
        self.assertTrue(blocked_delete.data["dependencies"]["has_dependencies"])
        self.assertEqual(blocked_delete.data["dependencies"]["links"][0]["records"][0]["id"], order.id)

        order_dependencies = admin_client.get(f"/crm/orders/{order.id}/deletion-dependencies/")
        self.assertEqual(order_dependencies.status_code, 200, order_dependencies.data)
        record_types = {record["record_type"] for link in order_dependencies.data["links"] for record in link["records"]}
        self.assertEqual(record_types, {"invoices", "deliveries"})

        invoice_dependencies = admin_client.get(f"/crm/invoices/{invoice.id}/deletion-dependencies/")
        self.assertEqual(invoice_dependencies.status_code, 200, invoice_dependencies.data)
        self.assertFalse(invoice_dependencies.data["has_dependencies"])

        delivery_dependencies = admin_client.get(f"/crm/deliveries/{delivery.id}/deletion-dependencies/")
        self.assertEqual(delivery_dependencies.status_code, 200, delivery_dependencies.data)
        self.assertFalse(delivery_dependencies.data["has_dependencies"])


class NullBillingAddressResilienceTests(TestCase):
    """A null quotation.billing_address must never crash the CRM lifecycle.
    Covers quotation -> order -> invoice -> payment -> delivery with no
    billing address, plus the aggregate dashboard/report endpoints that
    read across all quotations."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_superuser(username="null-billing-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_quotation_serializer_handles_null_billing_address(self):
        quotation = Quotation.objects.create(
            customer_name="Null Billing", phone="9876500301", cake_type="Cake",
            quantity=1, rate="1000.00", billing_address=None, address=None,
        )
        response = self.client.get(f"/crm/quotations/{quotation.id}/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data["billing_address"])

    def test_full_lifecycle_survives_null_billing_address(self):
        quotation = Quotation.objects.create(
            customer_name="Null Billing Flow", phone="9876500302", cake_type="Cake",
            quantity=1, rate="1000.00", total_amount="1000.00",
            advance_received=True, advance_amount="500.00", status="Advance Received",
            billing_address=None, address=None,
        )
        confirmed = self.client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order_id = confirmed.data["data"]["id"]

        self.assertEqual(
            self.client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "start_processing"}, format="json").status_code,
            200,
        )
        self.assertEqual(
            self.client.post(f"/crm/orders/{order_id}/workflow-action/", {"action": "mark_ready"}, format="json").status_code,
            200,
        )
        invoice_response = self.client.post(f"/crm/orders/{order_id}/generate-invoice/", {}, format="json")
        self.assertEqual(invoice_response.status_code, 201, invoice_response.data)
        invoice_id = invoice_response.data["data"]["id"]

        self.assertEqual(self.client.get(f"/crm/invoices/{invoice_id}/").status_code, 200)
        payment = self.client.post(f"/crm/invoices/{invoice_id}/record-payment/", {
            "amount": "500.00", "payment_method": "Cash", "payment_date": timezone.localdate().isoformat(),
        }, format="json")
        self.assertEqual(payment.status_code, 201, payment.data)
        self.assertEqual(self.client.post(f"/crm/invoices/{invoice_id}/payment-completed/", {}, format="json").status_code, 200)
        delivery = self.client.post(f"/crm/invoices/{invoice_id}/move-to-delivery/", {}, format="json")
        self.assertEqual(delivery.status_code, 201, delivery.data)

    def test_aggregate_endpoints_tolerate_null_billing_address(self):
        Quotation.objects.create(
            customer_name="Null Billing Aggregate", phone="9876500303", cake_type="Cake",
            quantity=1, rate="1000.00", billing_address=None, address=None,
        )
        self.assertEqual(self.client.get("/crm/leads/crm-dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/reports/crm-analytics").status_code, 200)
        self.assertEqual(self.client.get("/crm/quotations/").status_code, 200)

    def test_invoice_uses_delivery_address_when_billing_address_is_null(self):
        quotation = Quotation.objects.create(
            customer_name="Delivery Fallback", phone="9876500304", cake_type="Cake",
            quantity=1, rate="1000.00", total_amount="1000.00",
            advance_received=True, advance_amount="500.00", status="Advance Received",
            billing_address=None, address="Delivery Road",
        )
        confirmed = self.client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order = CRMOrder.objects.get(id=confirmed.data["data"]["id"])
        order.status = "Ready"
        order.save(update_fields=("status", "updated_on"))

        invoice_response = self.client.post(f"/crm/orders/{order.id}/generate-invoice/", {}, format="json")

        self.assertEqual(invoice_response.status_code, 201, invoice_response.data)
        self.assertEqual(CRMInvoice.objects.get(id=invoice_response.data["data"]["id"]).address, "Delivery Road")

    def test_invoice_uses_billing_address_as_last_address_fallback(self):
        quotation = Quotation.objects.create(
            customer_name="Billing Fallback", phone="9876500305", cake_type="Cake",
            quantity=1, rate="1000.00", total_amount="1000.00",
            advance_received=True, advance_amount="500.00", status="Advance Received",
            billing_address="Billing Road", address=None,
        )
        confirmed = self.client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order = CRMOrder.objects.get(id=confirmed.data["data"]["id"])
        order.delivery_address = None
        order.status = "Ready"
        order.save(update_fields=("delivery_address", "status", "updated_on"))

        invoice_response = self.client.post(f"/crm/orders/{order.id}/generate-invoice/", {}, format="json")

        self.assertEqual(invoice_response.status_code, 201, invoice_response.data)
        self.assertEqual(CRMInvoice.objects.get(id=invoice_response.data["data"]["id"]).address, "Billing Road")


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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="order-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="validation-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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
        self.staff = Customer.objects.create_superuser(
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

    def test_customer_management_can_create_persisted_customer(self):
        response = self.client.post("/crm/customers/", {
            "first_name": "New",
            "last_name": "Customer",
            "phone": "9876501234",
            "email": "new.customer@example.com",
            "is_active": True,
            "addresses": [{
                "title": "Home", "address": "12 Cake Street", "city": "Chennai",
                "pincode": "600001", "is_primary": True,
            }],
        }, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        Customer = get_user_model()
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.phone, "9876501234")
        self.assertFalse(customer.has_usable_password())
        self.assertEqual(customer.customeraddress_set.get().city, "Chennai")

    def test_lead_conversion_carries_decimal_weight_and_is_duplicate_safe(self):
        lead = Lead.objects.create(
            customer_name="Weighted Cake Customer",
            phone="9876543210",
            occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2),
            cake_type="Theme Cake",
            weight="1.50",
            quantity=2,
            customer_notes="Use the supplied design",
            status="Won",
            winning_reason="Customer approved",
        )

        first = self.client.post(f"/crm/leads/{lead.id}/convert/", {}, format="json")
        second = self.client.post(f"/crm/leads/{lead.id}/convert/", {}, format="json")

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(Quotation.objects.filter(lead=lead).count(), 1)
        item = Quotation.objects.get(lead=lead).items.get()
        self.assertEqual(str(item.weight), "1.50")
        self.assertEqual(item.quantity, 2)
        self.assertIn("supplied design", item.description)

    def test_move_to_quotation_keeps_lead_status_and_customer_link(self):
        Customer = get_user_model()
        customer = Customer.objects.create_user(
            username="9876543222", phone="9876543222", first_name="Open Lead Customer"
        )
        lead = Lead.objects.create(
            customer=customer, customer_name="Open Lead Customer", phone=customer.phone,
            occasion="Birthday", event_date=timezone.localdate() + timedelta(days=2),
            cake_type="Theme Cake", quantity=1, status="Open",
        )

        first = self.client.post(
            f"/crm/leads/{lead.id}/convert/", {"mark_won": False}, format="json"
        )
        second = self.client.post(
            f"/crm/leads/{lead.id}/convert/", {"mark_won": False}, format="json"
        )

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        lead.refresh_from_db()
        quotation = Quotation.objects.get(lead=lead)
        self.assertEqual(lead.status, "Open")
        self.assertEqual(quotation.customer_id, customer.id)
        self.assertEqual(Quotation.objects.filter(lead=lead).count(), 1)
        self.assertEqual(second.data["data"]["id"], quotation.id)
        self.assertEqual(self.client.get(f"/crm/quotations/{quotation.id}/").status_code, 200)

    def test_won_and_generate_updates_status_and_reuses_existing_quotation(self):
        lead = Lead.objects.create(
            customer_name="Follow-up Customer", phone="9876543233", occasion="Birthday",
            event_date=timezone.localdate() + timedelta(days=2), cake_type="Theme Cake",
            quantity=1, status="Follow-up", follow_up_date=timezone.localdate() + timedelta(days=1),
            follow_up_notes="Call tomorrow",
        )
        existing = Quotation.objects.create(lead=lead, customer_name=lead.customer_name, phone=lead.phone)

        response = self.client.post(
            f"/crm/leads/{lead.id}/convert/", {"mark_won": True}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.data)
        lead.refresh_from_db()
        self.assertEqual(lead.status, "Won")
        self.assertEqual(response.data["lead"]["status"], "Won")
        self.assertEqual(response.data["lead"]["quotation_id"], existing.id)
        self.assertEqual(response.data["data"]["id"], existing.id)
        self.assertEqual(Quotation.objects.filter(lead=lead).count(), 1)

        repeated = self.client.post(
            f"/crm/leads/{lead.id}/convert/", {"mark_won": True}, format="json"
        )
        self.assertEqual(repeated.status_code, 200, repeated.data)
        self.assertEqual(repeated.data["data"]["id"], existing.id)
        self.assertEqual(Quotation.objects.filter(lead=lead).count(), 1)

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
        self.assertEqual(response.data["customer_id"], customer.id)

    def test_customer_search_returns_multiple_matches_and_selected_id_wins(self):
        Customer = get_user_model()
        first = Customer.objects.create_user(
            username="similar-one", phone="9876543999", first_name="John", last_name="Mathew"
        )
        second = Customer.objects.create_user(
            username="similar-two", phone="9876543999", first_name="John", last_name="Mathews"
        )

        search = self.client.get("/crm/quotations/customer-search/", {"q": "John Math"})

        self.assertEqual(search.status_code, 200, search.data)
        self.assertEqual({row["id"] for row in search.data}, {first.id, second.id})
        self.assertTrue(all("customer_since" in row for row in search.data))

        payload = self.lead_data(second.phone)
        payload["customer_id"] = second.id
        response = self.client.post("/crm/leads/", payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Lead.objects.get(pk=response.data["id"]).customer, second)

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

    def test_new_lead_creates_customer_and_appears_in_customer_management(self):
        Customer = get_user_model()
        before = Customer.objects.count()

        response = self.client.post("/crm/leads/", self.lead_data("9123456780"), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        lead = Lead.objects.get(id=response.data["id"])
        self.assertIsNotNone(lead.customer)
        self.assertEqual(lead.customer.phone, "9123456780")
        self.assertEqual(Customer.objects.count(), before + 1)
        directory = self.client.get("/crm/customers/", {"search": "9123456780"})
        self.assertEqual(directory.status_code, 200, directory.data)
        self.assertTrue(any(row["id"] == lead.customer_id for row in directory.data))

    def test_ambiguous_phone_match_is_not_linked(self):
        Customer = get_user_model()
        Customer.objects.create_user(username="customer-one", phone="9000000000")
        Customer.objects.create_user(username="customer-two", phone="9000000000")

        response = self.client.post("/crm/leads/", self.lead_data("9000000000"), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(Lead.objects.get(id=response.data["id"]).customer)

    def test_new_quotation_creates_customer(self):
        Customer = get_user_model()
        before = Customer.objects.filter(is_staff=False).count()
        payload = {
            "customer_name": "Manual Quote Customer",
            "phone": "9123456781",
            "email": "manual.quote@example.com",
            "billing_address": "44 Quote Road",
            "shipping_same_as_billing": True,
            "cake_type": "Theme Cake",
            "quantity": "1",
            "rate": "1000.00",
            "event_date": (timezone.localdate() + timedelta(days=2)).isoformat(),
        }

        response = self.client.post("/crm/quotations/", payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        quotation = Quotation.objects.get(id=response.data["id"])
        self.assertIsNotNone(quotation.customer)
        self.assertEqual(quotation.customer.phone, "9123456781")
        self.assertEqual(Customer.objects.filter(is_staff=False).count(), before + 1)

    def test_lead_to_quotation_to_order_reuses_same_customer(self):
        response = self.client.post("/crm/leads/", self.lead_data("9123456782"), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        lead = Lead.objects.get(id=response.data["id"])

        converted = self.client.post(f"/crm/leads/{lead.id}/convert/", {"mark_won": True}, format="json")
        self.assertEqual(converted.status_code, 200, converted.data)
        quotation = Quotation.objects.get(lead=lead)
        item = quotation.items.get()
        item.rate = 1000
        item.save(update_fields=("rate",))
        quotation.status = "Accepted"
        quotation.calculate_totals()
        quotation.save(update_fields=("status", "subtotal", "gst_amount", "total_amount", "updated_on"))
        payment = self.client.post(f"/crm/quotations/{quotation.id}/record-payment/", {
            "amount": "500.00",
            "payment_date": timezone.localdate().isoformat(),
            "payment_method": "Cash",
        }, format="json")
        self.assertEqual(payment.status_code, 201, payment.data)
        confirmed = self.client.post(f"/crm/quotations/{quotation.id}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        order = CRMOrder.objects.get(pk=confirmed.data["data"]["id"])

        lead.refresh_from_db()
        quotation.refresh_from_db()
        self.assertEqual(lead.customer_id, quotation.customer_id)
        self.assertEqual(order.customer_id, lead.customer_id)
        self.assertEqual(get_user_model().objects.filter(phone="9123456782", is_staff=False).count(), 1)


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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="phase-three-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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
        self.assertEqual(payment.data["status"], "Paid")
        self.assertEqual(str(payment.data["balance_amount"]), "0.00")
        quotation.refresh_from_db()
        self.assertEqual(str(quotation.advance_amount), "500.00")
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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="delivery-validation-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500001")
        response = client.post(f"/crm/deliveries/{delivery.id}/workflow-action/", {"action": "start"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("delivery_person", response.data.get("fields", []))

    def test_magilshe_delivery_flow_reaches_delivered_successfully(self):
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="magilshe-flow-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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

    def test_switching_delivery_type_preserves_inactive_assignment_fields(self):
        from customer.models import AccessRole
        User = get_user_model()
        from delivery_person.models import DeliveryPerson, DeliveryPlatform
        staff = User.objects.create_user(
            username="delivery-switch-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
        internal = DeliveryPerson.objects.create(name="Ravi", phone="9000011112", status=True)
        platform = DeliveryPlatform.objects.create(name="Porter", status=True)
        client = APIClient(); client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500012")
        porter_payload = {
            "delivery_type": "Porter Delivery", "external_platform": platform.id,
            "porter_name": "Ramesh", "porter_contact": "9000011113",
            "porter_location": "12 Test Street",
            "porter_time": timezone.now().isoformat(),
            "tracking_link": "https://porter.in/track/xxxxx",
        }
        self.assertEqual(client.patch(f"/crm/deliveries/{delivery.id}/", porter_payload, format="json").status_code, 200)
        delivery.refresh_from_db()
        self.assertEqual(delivery.tracking_link, "https://porter.in/track/xxxxx")
        magilshe_payload = {
            "delivery_type": "Magilshe Delivery", "delivery_person": internal.id,
            "delivery_location": "12 Test Street", "delivery_time": timezone.now().isoformat(),
        }
        response = client.patch(f"/crm/deliveries/{delivery.id}/", magilshe_payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        delivery.refresh_from_db()
        self.assertEqual(delivery.delivery_person_id, internal.id)
        self.assertIsNone(delivery.external_delivery_person_id)
        self.assertEqual(delivery.external_platform_id, platform.id)
        self.assertIsNotNone(delivery.porter_time)

    def test_porter_delivery_can_be_marked_damaged_with_description(self):
        from customer.models import AccessRole
        User = get_user_model()
        from delivery_person.models import DeliveryPlatform
        staff = User.objects.create_user(
            username="porter-damage-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
        platform = DeliveryPlatform.objects.create(name="Rapido", status=True)
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500003")
        payload = {
            "delivery_type": "Porter Delivery", "external_platform": platform.id,
            "porter_id": "PORTER-1", "porter_name": "Rapido Runner",
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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="delivery-failed-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username="damage-image-staff", password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
        client = APIClient()
        client.force_authenticate(staff)
        delivery = self._make_delivery(client, phone="9876500005")
        with patch("crm.views.put_image_to_s3", return_value=True):
            upload = SimpleUploadedFile("damage.png", PNG_BYTES, content_type="image/png")
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
        from customer.models import AccessRole
        User = get_user_model()
        staff = User.objects.create_user(
            username=username, password="password", is_staff=True,
            role=AccessRole.objects.filter(name="CRM Manager").first(),
        )
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
        self.assertIsNotNone(order.customer_id)
        self.assertEqual(order.customer.phone, "9876511111")
        self.assertEqual(get_user_model().objects.filter(phone="9876511111", is_staff=False).count(), 1)

    def test_direct_order_links_an_existing_customer_by_phone(self):
        client, _ = self._client("direct-order-existing-customer-staff")
        Customer = get_user_model()
        customer = Customer.objects.create_user(
            username="9876511199", phone="9876511199", first_name="Existing Customer"
        )

        response = client.post(
            "/crm/orders/direct/", self.direct_order_payload(phone=customer.phone), format="json"
        )

        self.assertEqual(response.status_code, 201, response.data)
        order = CRMOrder.objects.get(pk=response.data["data"]["id"])
        self.assertEqual(order.customer, customer)
        self.assertEqual(order.quotation.customer, customer)

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


class CustomerEventSyncTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username="customer-event-sync-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.event_date = timezone.localdate() + timedelta(days=12)

    def quotation_payload(self, phone, occasion="Birthday", **extra):
        return {
            "customer_name": "Event Sync Customer", "phone": phone,
            "occasion": occasion, "event_date": self.event_date.isoformat(),
            "items": [{"item_name": "Cake", "quantity": 1, "rate": "1000.00", "gst_percentage": 0}],
            "delivery_type": "Pickup", "address": "Bakery counter",
            **extra,
        }

    def test_quotation_creates_event_for_any_occasion(self):
        response = self.client.post("/crm/quotations/", self.quotation_payload("9876522001", occasion="Housewarming"), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        quotation = Quotation.objects.get(pk=response.data["id"])
        event = CustomerRecurringEvent.objects.get(customer=quotation.customer)
        self.assertEqual(event.event_type, "Housewarming")
        self.assertEqual(event.original_date, self.event_date)
        self.assertEqual(event.source_quotation, quotation)

    def test_direct_order_creates_event_linked_to_order(self):
        payload = self.quotation_payload(
            "9876522002", advance_amount="500.00", payment_method="Cash",
            payment_date=timezone.localdate().isoformat(),
        )
        response = self.client.post("/crm/orders/direct/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        order = CRMOrder.objects.get(pk=response.data["data"]["id"])
        event = CustomerRecurringEvent.objects.get(customer=order.customer)
        self.assertEqual(event.event_type, "Birthday")
        self.assertEqual(event.source_order, order)
        self.assertEqual(event.source_quotation, order.quotation)
        profile = self.client.get(f"/crm/customers/{order.customer_id}/")
        self.assertEqual(profile.status_code, 200, profile.data)
        self.assertEqual(profile.data["recurring_events"][0]["source_order_no"], order.order_no)

    def test_confirmed_order_links_existing_quotation_event(self):
        response = self.client.post(
            "/crm/quotations/",
            self.quotation_payload("9876522003", status="Advance Received", advance_received=True, advance_amount="500.00"),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        confirmed = self.client.post(f"/crm/quotations/{response.data['id']}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        event = CustomerRecurringEvent.objects.get(source_quotation_id=response.data["id"])
        self.assertEqual(event.source_order_id, confirmed.data["data"]["id"])
        self.assertEqual(CustomerRecurringEvent.objects.filter(customer=event.customer).count(), 1)

    def test_changing_lead_event_date_moves_the_event_instead_of_duplicating(self):
        response = self.client.post("/crm/leads/", {
            "customer_name": "Lead Event Customer", "phone": "9876522004", "occasion": "Anniversary",
            "event_date": self.event_date.isoformat(), "cake_type": "Cake", "quantity": 1, "unit_type": "kg",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        new_date = self.event_date + timedelta(days=3)
        updated = self.client.patch(f"/crm/leads/{response.data['id']}/", {"event_date": new_date.isoformat()}, format="json")
        self.assertEqual(updated.status_code, 200, updated.data)
        events = CustomerRecurringEvent.objects.filter(source_lead_id=response.data["id"])
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.get().original_date, new_date)

    def test_deleted_event_is_not_recreated_by_order_confirmation_or_unrelated_edits(self):
        response = self.client.post(
            "/crm/quotations/",
            self.quotation_payload("9876522005", status="Advance Received", advance_received=True, advance_amount="500.00"),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        event = CustomerRecurringEvent.objects.get(source_quotation_id=response.data["id"])
        self.assertEqual(self.client.delete(f"/crm/customer-events/{event.id}/").status_code, 204)
        self.client.patch(f"/crm/quotations/{response.data['id']}/", {"notes": "Less sugar"}, format="json")
        confirmed = self.client.post(f"/crm/quotations/{response.data['id']}/confirm-order/", {}, format="json")
        self.assertEqual(confirmed.status_code, 201, confirmed.data)
        self.assertFalse(CustomerRecurringEvent.objects.filter(customer=event.customer).exists())

    def test_lead_import_creates_event(self):
        upload = SimpleUploadedFile(
            "leads.csv",
            (
                "Customer Name,Phone,Occasion,event_date,cake_type,quantity,unit_type\n"
                f"Import Event,9876522006,Birthday,{self.event_date.isoformat()},Cake,1,kg\n"
            ).encode("utf-8"),
            content_type="text/csv",
        )
        response = self.client.post("/crm/leads/import/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["success_count"], 1, response.data)
        lead = Lead.objects.get(phone="9876522006")
        event = CustomerRecurringEvent.objects.get(source_lead=lead)
        self.assertEqual(event.customer_id, lead.customer_id)
        self.assertEqual(event.event_type, "Birthday")

    def test_quick_entry_lead_for_existing_customer_creates_event(self):
        customer = get_user_model().objects.create_user(
            username="9876522007", phone="9876522007", first_name="Quick", last_name="Entry",
        )
        response = self.client.post("/crm/leads/", {
            "customer_id": customer.id, "customer_name": "Quick Entry", "phone": "9876522007",
            "occasion": "Birthday", "cake_type": "Cake", "flavour": "", "weight": "",
            "quantity": 1, "unit_type": "kg", "rate": "", "estimated_amount": "",
            "event_date": self.event_date.isoformat(),
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        event = CustomerRecurringEvent.objects.get(source_lead_id=response.data["id"])
        self.assertEqual(event.customer, customer)
        self.assertEqual(event.original_date, self.event_date)

    def test_quotation_form_from_lead_syncs_changed_event_date(self):
        lead = self.client.post("/crm/leads/", {
            "customer_name": "Lead Quote", "phone": "9876522008", "occasion": "Anniversary",
            "event_date": self.event_date.isoformat(), "cake_type": "Cake", "quantity": 1, "unit_type": "kg",
        }, format="json")
        self.assertEqual(lead.status_code, 201, lead.data)
        converted = self.client.post(f"/crm/leads/{lead.data['id']}/convert/", {}, format="json")
        self.assertEqual(converted.status_code, 200, converted.data)
        quotation_id = converted.data["data"]["id"]
        new_date = self.event_date + timedelta(days=5)
        versioned = self.client.post(
            f"/crm/quotations/{quotation_id}/generate-version/",
            {"event_date": new_date.isoformat()}, format="json",
        )
        self.assertEqual(versioned.status_code, 200, versioned.data)
        event = CustomerRecurringEvent.objects.get(source_quotation_id=quotation_id)
        self.assertEqual(event.original_date, new_date)
        self.assertEqual(event.source_lead_id, lead.data["id"])
        self.assertEqual(CustomerRecurringEvent.objects.filter(customer=event.customer).count(), 1)


class CRMAgendaTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username="agenda-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.today = timezone.localdate()

    def direct_order(self, phone, delivery_date, occasion="Birthday"):
        response = self.client.post("/crm/orders/direct/", {
            "customer_name": "Agenda Customer", "phone": phone,
            "occasion": occasion, "event_date": delivery_date.isoformat(),
            "delivery_date": delivery_date.isoformat(), "delivery_time": "16:30",
            "items": [{"item_name": "Cake", "quantity": 1, "rate": "1000.00", "gst_percentage": 0}],
            "delivery_type": "Pickup", "address": "Bakery counter",
            "advance_amount": "400.00", "payment_method": "Cash", "payment_date": self.today.isoformat(),
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return CRMOrder.objects.get(pk=response.data["data"]["id"])

    def agenda(self, **params):
        response = self.client.get("/crm/agenda/", {
            "start": self.today.isoformat(), "end": (self.today + timedelta(days=6)).isoformat(), **params,
        })
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_agenda_returns_day_wise_items_for_every_type(self):
        tomorrow = self.today + timedelta(days=1)
        order = self.direct_order("9876533001", tomorrow)
        Lead.objects.create(
            customer=order.customer, customer_name="Agenda Customer", phone="9876533001",
            status="Follow-up", follow_up_date=self.today, occasion="Anniversary", cake_type="Cake",
        )
        event = CustomerRecurringEvent.objects.get(source_order=order)
        # A yearly event whose reminder (7 days before) lands inside the week.
        next_week = self.today + timedelta(days=9)
        CustomerRecurringEvent.objects.create(
            customer=order.customer, event_type="Anniversary", event_month=next_week.month,
            event_day=next_week.day, original_date=next_week.replace(year=next_week.year - 3),
        )

        data = self.agenda()
        by_type = {}
        for item in data["items"]:
            by_type.setdefault(item["type"], []).append(item)

        self.assertEqual(by_type["order"][0]["date"], tomorrow.isoformat())
        self.assertEqual(by_type["order"][0]["time"], "16:30")
        self.assertEqual(by_type["order"][0]["customer"]["id"], order.customer_id)
        self.assertEqual(by_type["payment"][0]["amount"], "600.00")
        self.assertEqual(by_type["follow_up"][0]["date"], self.today.isoformat())
        self.assertEqual([item["link_id"] for item in by_type["event"]], [event.customer_id])
        self.assertEqual(by_type["reminder"][0]["date"], (next_week - timedelta(days=7)).isoformat())
        self.assertEqual(by_type["completed"][0]["completed_kind"], "payment")
        self.assertEqual(data["summary"]["payment_pending_amount"], "600.00")

    def test_overdue_items_are_listed_separately(self):
        order = self.direct_order("9876533002", self.today + timedelta(days=2))
        CRMOrder.objects.filter(pk=order.pk).update(delivery_date=self.today - timedelta(days=2))
        data = self.agenda()
        self.assertEqual({item["type"] for item in data["overdue"]}, {"order", "payment"})
        self.assertTrue(all(item["overdue"] for item in data["overdue"]))
        self.assertFalse(any(item["type"] == "order" for item in data["items"]))

    def test_customer_scope_only_returns_that_customers_items(self):
        mine = self.direct_order("9876533003", self.today + timedelta(days=1))
        self.direct_order("9876533004", self.today + timedelta(days=1))
        data = self.agenda(customer=mine.customer_id)
        self.assertTrue(data["items"])
        self.assertEqual({item["customer"]["id"] for item in data["items"]}, {mine.customer_id})

    def test_customer_dashboard_permission_is_enough_and_no_permission_is_rejected(self):
        from customer.models import AccessPermission, AccessRole
        role = AccessRole.objects.create(name="Customer Dashboard Only")
        role.permissions.add(AccessPermission.objects.get(code="customers.analytics.view"))
        analyst = get_user_model().objects.create_user(
            username="agenda-analyst", password="password", is_staff=True, role=role,
        )
        client = APIClient(); client.force_authenticate(analyst)
        self.assertEqual(client.get("/crm/agenda/").status_code, 200)

        empty_role = AccessRole.objects.create(name="No Agenda Access")
        outsider = get_user_model().objects.create_user(
            username="agenda-outsider", password="password", is_staff=True, role=empty_role,
        )
        client.force_authenticate(outsider)
        self.assertEqual(client.get("/crm/agenda/").status_code, 403)

    def test_invalid_or_oversized_ranges_are_rejected(self):
        self.assertEqual(self.client.get("/crm/agenda/", {"start": "bad"}).status_code, 400)
        self.assertEqual(self.client.get("/crm/agenda/", {
            "start": self.today.isoformat(), "end": (self.today - timedelta(days=1)).isoformat(),
        }).status_code, 400)
        self.assertEqual(self.client.get("/crm/agenda/", {
            "start": self.today.isoformat(), "end": (self.today + timedelta(days=90)).isoformat(),
        }).status_code, 400)
