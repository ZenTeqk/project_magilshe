import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_NAME", "test_magilshe")
os.environ.setdefault("DB_USER", "test_user")
os.environ.setdefault("DB_PASS", "test_password")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("OTP_EXPIRY_SECONDS", "300")
os.environ.setdefault("OTP_REQUEST_PHONE_LIMIT", "2")
os.environ.setdefault("OTP_REQUEST_PHONE_WINDOW_SECONDS", "60")
os.environ.setdefault("OTP_REQUEST_IP_LIMIT", "3")
os.environ.setdefault("OTP_REQUEST_IP_WINDOW_SECONDS", "60")
os.environ.setdefault("OTP_VERIFY_PHONE_LIMIT", "2")
os.environ.setdefault("OTP_VERIFY_PHONE_WINDOW_SECONDS", "60")
os.environ.setdefault("OTP_VERIFY_IP_LIMIT", "3")
os.environ.setdefault("OTP_VERIFY_IP_WINDOW_SECONDS", "60")

from .settings import *


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
