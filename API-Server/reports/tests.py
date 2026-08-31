from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone

from crm.models import CRMInvoice, CRMOrder, Lead, Quotation
from customer.models import Customer


class CRMAnalyticsReportTests(TestCase):
    def setUp(self):
        self.user = Customer.objects.create_user(username="report-manager", password="test-pass")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.lead = Lead.objects.create(customer_name="Analytics Customer", phone="9000000001", status="Open")

    def test_analytics_snapshot_is_read_only_and_uses_existing_crm_records(self):
        before = Lead.objects.count()
        response = self.client.get("/reports/crm-analytics", {"from_date": "2000-01-01", "to_date": "2100-01-01"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["leads"], 1)
        self.assertEqual(response.data["overview"]["leads"]["Open"], 1)
        self.assertEqual(Lead.objects.count(), before)

    def test_current_dashboard_metrics_use_live_crm_orders_and_invoice_balances(self):
        quotation = Quotation.objects.create(
            customer_name="Dashboard Customer", phone="9000000002",
            cake_type="Cake", quantity=1, rate="1000.00", total_amount="1000.00",
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name=quotation.customer_name, phone=quotation.phone,
            total_amount="1000.00", advance_paid="400.00",
        )
        CRMInvoice.objects.create(
            order=order, customer_name=order.customer_name, phone=order.phone,
            subtotal="1000.00", total_amount="1000.00", amount_paid="400.00",
            balance_amount="600.00",
        )
        response = self.client.get("/reports/crm-analytics", {
            "from_date": "2000-01-01", "to_date": "2000-01-02",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["current"]["today_orders"], 1)
        self.assertEqual(str(response.data["current"]["balance_pending"]), "600.00")
        self.assertEqual(order.confirmed_on.date(), timezone.localdate())
