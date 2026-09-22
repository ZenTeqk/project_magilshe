from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from customer.models import Customer
from .models import MainCategory


class CategoryImageUploadValidationTests(TestCase):
    PNG_BYTES = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
        b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
        b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
        b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    def setUp(self):
        self.user = Customer.objects.create_superuser(username="category-upload-admin", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def valid_payload(self, image):
        return {
            "name": "Celebration Cakes",
            "description": "Category",
            "meta_title": "Celebration Cakes",
            "meta_description": "Category",
            "slug": "celebration-cakes",
            "content": "Category content",
            "image": image,
        }

    def image_upload(self, name="category.png", content_type="image/png", content=None):
        if content is None:
            content = self.PNG_BYTES
        return SimpleUploadedFile(name, content, content_type=content_type)

    @patch("category.views.put_image_to_s3", return_value=True)
    def test_main_category_accepts_valid_image_with_shared_validation(self, _upload):
        response = self.client.post(
            "/category/main-category",
            self.valid_payload(self.image_upload()),
            format="multipart",
        )

        self.assertEqual(response.status_code, 200, response.data)
        category = MainCategory.objects.get()
        self.assertEqual(category.image_ext, "png")

    @patch("category.views.put_image_to_s3", return_value=True)
    def test_main_category_rejects_corrupt_image_without_uploading(self, upload):
        response = self.client.post(
            "/category/main-category",
            self.valid_payload(self.image_upload(content=b"not-an-image")),
            format="multipart",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("valid image", str(response.data))
        self.assertFalse(MainCategory.objects.exists())
        upload.assert_not_called()

    def test_unauthenticated_main_category_upload_remains_unauthorized(self):
        client = APIClient()
        response = client.post(
            "/category/main-category",
            self.valid_payload(self.image_upload()),
            format="multipart",
        )

        self.assertIn(response.status_code, (401, 403))
