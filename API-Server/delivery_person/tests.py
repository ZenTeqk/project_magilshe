from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import DeliveryPerson, DeliveryPlatform, ExternalDeliveryPerson

class ReusableDeliveryPersonTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username="delivery-master-admin", password="password")
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def test_internal_person_creation_reuses_matching_phone(self):
        existing = DeliveryPerson.objects.create(name="Ravi Kumar", phone="98765 43210")
        response = self.client.post("/delivery-person/management/staff/", {
            "name": "Ravi", "phone": "9876543210", "status": True,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["id"], existing.id)
        self.assertEqual(DeliveryPerson.objects.count(), 1)

    def test_porter_creation_reuses_matching_phone_and_preserves_platform(self):
        platform = DeliveryPlatform.objects.create(name="Porter")
        existing = ExternalDeliveryPerson.objects.create(platform=platform, name="Ramesh", phone="98765-43211")
        response = self.client.post("/delivery-person/management/partners/", {
            "platform": platform.id, "name": "Ramesh S", "phone": "9876543211", "status": True,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["id"], existing.id)
        self.assertEqual(response.data["platform"], platform.id)
        self.assertEqual(ExternalDeliveryPerson.objects.count(), 1)
