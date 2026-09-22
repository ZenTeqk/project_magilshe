from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from unittest.mock import patch


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
    b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
    b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
    b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class ConfigurationLogoUploadTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username="config-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @patch("configuration.views.put_image_to_s3", return_value=True)
    def test_configuration_logo_accepts_valid_image_with_shared_validation(self, upload):
        image = SimpleUploadedFile("logo.png", PNG_BYTES, content_type="image/png")

        response = self.client.put("/configuration/config-data/", {"image": image}, format="multipart")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["image_ext"], "png")
        self.assertTrue(upload.called)

    @patch("configuration.views.put_image_to_s3", return_value=True)
    def test_configuration_logo_rejects_corrupt_image_before_uploading(self, upload):
        image = SimpleUploadedFile("logo.png", b"not-an-image", content_type="image/png")

        response = self.client.put("/configuration/config-data/", {"image": image}, format="multipart")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("image", response.data)
        upload.assert_not_called()
