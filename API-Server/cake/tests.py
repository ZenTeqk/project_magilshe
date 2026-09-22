from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from unittest.mock import patch
import json

from .models import Offer


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
    b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
    b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
    b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class OfferImageUploadTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="offer-admin", password="password"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @override_settings(IMAGE_BASE_URL="https://cdn.example.test")
    @patch("cake.views.put_image_to_s3", return_value=True)
    def test_offer_image_upload_persists_and_reopens_with_storage_url(self, upload):
        image = SimpleUploadedFile("offer.png", PNG_BYTES, content_type="image/png")

        response = self.client.post("/cake/update-offer/", {
            "id": "0",
            "name": "Launch Offer",
            "type": "2",
            "id_list": "",
            "offer_per": "10",
            "offer_from": "2026-09-21T10:00:00+05:30",
            "offer_to": "2026-09-30T10:00:00+05:30",
            "image": image,
        }, format="multipart")

        self.assertEqual(response.status_code, 200, response.data)
        offer = Offer.objects.get(id=response.data["data"]["id"])
        self.assertEqual(offer.image_ext, "png")
        upload.assert_called_once()
        self.assertEqual(
            upload.call_args.args[1],
            f"cakery/offer/banner/{offer.image_name}.png",
        )

        list_response = self.client.get("/cake/get-offer/")
        self.assertEqual(list_response.status_code, 200, list_response.content)
        reopened = json.loads(list_response.content)["data"][0]
        self.assertEqual(
            reopened["url"],
            f"https://cdn.example.test/cakery/offer/banner/{offer.image_name}.png",
        )

    @patch("cake.views.put_image_to_s3", return_value=True)
    def test_offer_image_rejects_corrupt_upload_before_storage(self, upload):
        image = SimpleUploadedFile("offer.png", b"not-an-image", content_type="image/png")

        response = self.client.post("/cake/update-offer/", {
            "id": "0",
            "name": "Bad Offer",
            "type": "2",
            "id_list": "",
            "offer_per": "10",
            "offer_from": "2026-09-21T10:00:00+05:30",
            "offer_to": "2026-09-30T10:00:00+05:30",
            "image": image,
        }, format="multipart")

        self.assertEqual(response.status_code, 400, response.data)
        upload.assert_not_called()
