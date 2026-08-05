from django.test import TestCase
from rest_framework.test import APIClient

from crm.models import Lead
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
