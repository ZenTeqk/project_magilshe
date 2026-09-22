import os
import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from cakery.uploads import MAX_IMAGE_SIZE, validate_image_upload


BASE_DIR = Path(__file__).resolve().parent.parent


class ProductionSecuritySettingsTests(SimpleTestCase):
    def run_settings_probe(self, env_overrides, expression="print('ok')"):
        env = os.environ.copy()
        for key in (
            "DJANGO_DEBUG",
            "DJANGO_SECRET_KEY",
            "ALLOWED_HOSTS",
            "CORS_ALLOWED_ORIGINS",
            "CSRF_TRUSTED_ORIGINS",
            "DB_HOST",
            "DB_NAME",
            "DB_USER",
            "DB_PASS",
            "DB_PORT",
        ):
            env.pop(key, None)
        env.update(env_overrides)
        return subprocess.run(
            [
                sys.executable,
                "-c",
                "import cakery.settings as s\n" + expression,
            ],
            cwd=BASE_DIR,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def secure_production_env(self):
        return {
            "DJANGO_SECRET_KEY": "configured-secret",
            "ALLOWED_HOSTS": "api.example.com, admin.example.com",
            "CORS_ALLOWED_ORIGINS": "https://www.example.com, https://admin.example.com",
            "CSRF_TRUSTED_ORIGINS": "https://www.example.com",
            "DB_HOST": "db.example.com",
            "DB_NAME": "magilshe",
            "DB_USER": "magilshe_user",
            "DB_PASS": "configured-password",
            "DB_PORT": "5432",
        }

    def test_production_allowed_hosts_do_not_use_wildcard(self):
        result = self.run_settings_probe(self.secure_production_env(), "print(s.ALLOWED_HOSTS)")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("*", result.stdout)

    def test_production_cors_is_not_unrestricted(self):
        result = self.run_settings_probe(
            self.secure_production_env(),
            "print(s.CORS_ALLOW_ALL_ORIGINS)\nprint(s.CORS_ORIGIN_ALLOW_ALL)",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip().splitlines(), ["False", "False"])

    def test_missing_production_secret_key_fails_safely(self):
        env = self.secure_production_env()
        env.pop("DJANGO_SECRET_KEY")

        result = self.run_settings_probe(env)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY must be configured", result.stderr)

    def test_missing_database_credentials_fail_safely(self):
        for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASS", "DB_PORT"):
            with self.subTest(key=key):
                env = self.secure_production_env()
                env.pop(key)

                result = self.run_settings_probe(env)

                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f"{key} must be configured", result.stderr)

    def test_explicit_allowed_hosts_are_parsed_and_trimmed(self):
        result = self.run_settings_probe(
            self.secure_production_env(),
            "print('|'.join(s.ALLOWED_HOSTS))",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "api.example.com|admin.example.com")

    def test_explicit_cors_origins_are_parsed_and_trimmed(self):
        result = self.run_settings_probe(
            self.secure_production_env(),
            "print('|'.join(s.CORS_ALLOWED_ORIGINS))",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "https://www.example.com|https://admin.example.com")

    def test_local_debug_defaults_remain_available(self):
        result = self.run_settings_probe(
            {"DJANGO_DEBUG": "true"},
            "print(s.SECRET_KEY)\nprint('|'.join(s.ALLOWED_HOSTS))\nprint('|'.join(s.CORS_ALLOWED_ORIGINS))",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        lines = result.stdout.strip().splitlines()
        self.assertEqual(lines[0], "django-insecure-local-development-key")
        self.assertIn("localhost", lines[1])
        self.assertIn("http://localhost:3000", lines[2])

    def test_test_settings_use_sqlite_without_production_infrastructure(self):
        self.assertEqual(settings.DATABASES["default"]["ENGINE"], "django.db.backends.sqlite3")
        self.assertNotIn("*", settings.ALLOWED_HOSTS)
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)


class SharedImageUploadValidationTests(SimpleTestCase):
    PNG_BYTES = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02"
        b"\x00\x00\x00\x02\x08\x02\x00\x00\x00\xfd\xd4\x9as"
        b"\x00\x00\x00\x13IDATx\x9cc\xfc\xff\xff?\x03\x03\x03"
        b"\x13\x03\x18\x00\x00$\x06\x03\x01]\xa2N\x88"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    def image_upload(self, name="image.png", content_type="image/png"):
        return SimpleUploadedFile(name, self.PNG_BYTES, content_type=content_type)

    def test_accepts_valid_supported_image(self):
        self.assertEqual(validate_image_upload(self.image_upload()), "png")

    def test_rejects_invalid_extension(self):
        with self.assertRaisesRegex(ValueError, "Supported image formats"):
            validate_image_upload(self.image_upload(name="image.gif", content_type="image/gif"))

    def test_rejects_mime_content_type_mismatch(self):
        with self.assertRaisesRegex(ValueError, "supported image"):
            validate_image_upload(self.image_upload(name="image.png", content_type="text/plain"))

    def test_rejects_corrupt_image(self):
        upload = SimpleUploadedFile("image.png", b"not-an-image", content_type="image/png")
        with self.assertRaisesRegex(ValueError, "valid image"):
            validate_image_upload(upload)

    def test_rejects_oversized_image_before_decoding(self):
        upload = SimpleUploadedFile("image.png", b"x", content_type="image/png")
        upload.size = MAX_IMAGE_SIZE + 1
        with self.assertRaisesRegex(ValueError, "10 MB"):
            validate_image_upload(upload)
