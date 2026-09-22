from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from unittest.mock import patch

from .models import DeliveryPerson, DeliveryPlatform, ExternalDeliveryPerson


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
    b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
    b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
    b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)
WEBP_BYTES = (
    b"RIFF$\x00\x00\x00WEBPVP8 \x18\x00\x00\x000\x01\x00\x9d\x01*"
    b"\x01\x00\x01\x00\x01@&%\xa4\x00\x03p\x00\xfe\xfb\xfdP\x00"
)

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

    @patch("delivery_person.serializers.put_image_to_s3", return_value=True)
    def test_staff_photo_accepts_valid_image_with_shared_validation(self, upload):
        image = SimpleUploadedFile("driver.png", PNG_BYTES, content_type="image/png")

        response = self.client.post("/delivery-person/management/staff/", {
            "name": "Ravi Photo", "phone": "9876543212", "status": True, "image": image,
        }, format="multipart")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(upload.called)
        person = DeliveryPerson.objects.get(id=response.data["id"])
        self.assertEqual(person.image_ext, "png")

    @patch("delivery_person.serializers.put_image_to_s3", return_value=True)
    def test_staff_photo_rejects_corrupt_image_before_uploading(self, upload):
        image = SimpleUploadedFile("driver.png", b"not-an-image", content_type="image/png")

        response = self.client.post("/delivery-person/management/staff/", {
            "name": "Ravi Bad Photo", "phone": "9876543213", "status": True, "image": image,
        }, format="multipart")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("image", response.data)
        upload.assert_not_called()

    @override_settings(IMAGE_BASE_URL="https://cdn.example.test")
    @patch("delivery_person.serializers.put_image_to_s3", return_value=True)
    def test_staff_photo_accepts_webp_and_returns_persisted_url(self, upload):
        image = SimpleUploadedFile("driver.webp", WEBP_BYTES, content_type="image/webp")

        response = self.client.post("/delivery-person/management/staff/", {
            "name": "Ravi Webp", "phone": "9876543214", "status": True, "image": image,
        }, format="multipart")

        self.assertEqual(response.status_code, 201, response.data)
        person = DeliveryPerson.objects.get(id=response.data["id"])
        self.assertEqual(person.image_ext, "webp")
        detail = self.client.get(f"/delivery-person/management/staff/{person.id}/")
        self.assertEqual(detail.status_code, 200, detail.data)
        self.assertIn(f"/delivery-person/profile/{person.image_name}.webp", detail.data["image_url"])
