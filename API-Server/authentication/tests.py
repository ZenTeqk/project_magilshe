from datetime import timedelta
from unittest.mock import Mock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import path
from django.utils import timezone
from rest_framework.test import APIClient

from authentication.models import OTP
from authentication.views import CreateManualCustomer, OTPRequestView, OTPVerifyView

urlpatterns = [
    path("auth/create-manual-customer/", CreateManualCustomer.as_view()),
    path("auth/request-otp/", OTPRequestView.as_view()),
    path("auth/verify-otp/", OTPVerifyView.as_view()),
]


@override_settings(
    ROOT_URLCONF=__name__,
    MSG91_API_KEY="test-provider-key",
    MSG91_TEMPLATE_ID="test-template",
    OTP_EXPIRY_SECONDS=300,
    OTP_REQUEST_PHONE_LIMIT=2,
    OTP_REQUEST_PHONE_WINDOW_SECONDS=60,
    OTP_REQUEST_IP_LIMIT=3,
    OTP_REQUEST_IP_WINDOW_SECONDS=60,
    OTP_VERIFY_PHONE_LIMIT=2,
    OTP_VERIFY_PHONE_WINDOW_SECONDS=60,
    OTP_VERIFY_IP_LIMIT=3,
    OTP_VERIFY_IP_WINDOW_SECONDS=60,
)
class OTPSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="9000000001",
            password="password",
            phone="9000000001",
            email="otp@example.com",
        )

    def tearDown(self):
        cache.clear()

    def provider_success(self):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {"type": "success"}
        return response

    def request_otp(self, username="9000000001", ip="10.0.0.1"):
        return self.client.post(
            "/auth/request-otp/",
            {"username": username},
            format="json",
            REMOTE_ADDR=ip,
        )

    def verify_otp(self, username="9000000001", otp="000000", ip="10.0.0.1"):
        return self.client.post(
            "/auth/verify-otp/",
            {"username": username, "otp": otp},
            format="json",
            REMOTE_ADDR=ip,
        )

    @patch("authentication.otp_security.requests.post")
    def test_normal_otp_request_succeeds(self, post):
        post.return_value = self.provider_success()

        response = self.request_otp()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "OTP sent successfully!")
        self.assertEqual(OTP.objects.filter(user=self.user).count(), 1)
        self.assertNotIn(settings.MSG91_API_KEY, post.call_args.args[0])

    @patch("authentication.otp_security.requests.post")
    def test_phone_rate_limit_blocks_repeated_otp_requests(self, post):
        post.return_value = self.provider_success()

        self.assertEqual(self.request_otp(ip="10.0.0.1").status_code, 200)
        self.assertEqual(self.request_otp(ip="10.0.0.2").status_code, 200)
        response = self.request_otp(ip="10.0.0.3")

        self.assertEqual(response.status_code, 429)

    @patch("authentication.otp_security.requests.post")
    def test_ip_rate_limit_blocks_requests_across_phone_numbers(self, post):
        post.return_value = self.provider_success()
        User = get_user_model()
        for index in range(2, 5):
            phone = f"900000000{index}"
            User.objects.create_user(username=phone, phone=phone)

        self.assertEqual(self.request_otp("9000000001", ip="10.0.0.9").status_code, 200)
        self.assertEqual(self.request_otp("9000000002", ip="10.0.0.9").status_code, 200)
        self.assertEqual(self.request_otp("9000000003", ip="10.0.0.9").status_code, 200)
        response = self.request_otp("9000000004", ip="10.0.0.9")

        self.assertEqual(response.status_code, 429)

    def test_failed_otp_brute_force_is_rate_limited(self):
        OTP.objects.create(user=self.user, otp="123456")

        self.assertNotEqual(self.verify_otp(otp="000000").status_code, 200)
        self.assertNotEqual(self.verify_otp(otp="111111").status_code, 200)
        response = self.verify_otp(otp="222222")

        self.assertEqual(response.status_code, 429)

    def test_successful_otp_returns_tokens(self):
        OTP.objects.create(user=self.user, otp="123456")

        response = self.verify_otp(otp="123456")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Logged in successfully")
        self.assertTrue(response.data["login_redirect"])
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_otp_replay_fails_after_successful_verification(self):
        OTP.objects.create(user=self.user, otp="123456")

        first = self.verify_otp(otp="123456")
        second = self.verify_otp(otp="123456")

        self.assertEqual(first.status_code, 200)
        self.assertNotEqual(second.status_code, 200)

    def test_expired_otp_is_rejected(self):
        otp = OTP.objects.create(user=self.user, otp="123456")
        OTP.objects.filter(id=otp.id).update(created_at=timezone.now() - timedelta(seconds=301))

        response = self.verify_otp(otp="123456")

        self.assertNotEqual(response.status_code, 200)

    @patch("authentication.views.secure_otp", side_effect=["111111", "222222"])
    @patch("authentication.otp_security.requests.post")
    def test_new_otp_invalidates_old_otp(self, post, secure_otp_mock):
        post.return_value = self.provider_success()

        self.assertEqual(self.request_otp(ip="10.0.0.1").status_code, 200)
        self.assertEqual(self.request_otp(ip="10.0.0.2").status_code, 200)

        old_response = self.verify_otp(otp="111111")
        new_response = self.verify_otp(otp="222222")

        self.assertNotEqual(old_response.status_code, 200)
        self.assertEqual(new_response.status_code, 200)

    def test_invalid_phone_input_returns_clean_error(self):
        response = self.request_otp(username="not-a-phone")

        self.assertNotEqual(response.status_code, 200)
        self.assertNotIn("Traceback", str(response.data))

    @patch("authentication.otp_security.requests.post")
    def test_provider_failure_returns_clean_response_without_secret(self, post):
        response = Mock()
        response.status_code = 503
        response.json.return_value = {"type": "error", "message": "provider detail"}
        post.return_value = response

        api_response = self.request_otp()

        self.assertNotEqual(api_response.status_code, 200)
        self.assertNotIn(settings.MSG91_API_KEY, str(api_response.data))
        self.assertNotIn("provider detail", str(api_response.data))

    @override_settings(OTP_REQUEST_PHONE_WINDOW_SECONDS=1, OTP_REQUEST_IP_WINDOW_SECONDS=1)
    @patch("authentication.otp_security.requests.post")
    def test_rate_limit_expiry_allows_requests_again(self, post):
        post.return_value = self.provider_success()
        with patch("authentication.otp_security.throttle_key", side_effect=lambda scope, identifier: f"otp-expiry:{scope}:{identifier}"):
            self.assertEqual(self.request_otp(ip="10.0.0.1").status_code, 200)
            self.assertEqual(self.request_otp(ip="10.0.0.2").status_code, 200)
            self.assertEqual(self.request_otp(ip="10.0.0.3").status_code, 429)
            cache.clear()
            self.assertEqual(self.request_otp(ip="10.0.0.4").status_code, 200)


@override_settings(
    ROOT_URLCONF=__name__,
    MSG91_API_KEY="test-provider-key",
    MSG91_TEMPLATE_ID="test-template",
)
class ManualCustomerPasswordTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        User = get_user_model()
        self.staff = User.objects.create_user(username="manual-staff", password="password", is_staff=True)
        self.client.force_authenticate(self.staff)

    def tearDown(self):
        cache.clear()

    def create_manual_customer(self, phone="9000000101", email="manual@example.com"):
        return self.client.post(
            "/auth/create-manual-customer/",
            {
                "phone": phone,
                "name": "Manual Customer",
                "email": email,
                "address": "Manual address",
                "city": "Chennai",
                "pincode": "600001",
            },
            format="json",
        )

    def provider_success(self):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {"type": "success"}
        return response

    def test_manual_customer_has_no_shared_default_password(self):
        response = self.create_manual_customer()

        self.assertEqual(response.status_code, 200)
        customer = get_user_model().objects.get(username="9000000101")
        self.assertFalse(customer.has_usable_password())
        self.assertFalse(customer.check_password("Welcome@321"))

    @patch("authentication.otp_security.requests.post")
    def test_manual_customer_otp_login_still_works(self, post):
        post.return_value = self.provider_success()
        self.create_manual_customer(phone="9000000102", email="manual2@example.com")
        self.client.force_authenticate(None)

        request_response = self.client.post(
            "/auth/request-otp/",
            {"username": "9000000102"},
            format="json",
            REMOTE_ADDR="10.1.0.1",
        )
        otp = OTP.objects.get(user__username="9000000102").otp
        verify_response = self.client.post(
            "/auth/verify-otp/",
            {"username": "9000000102", "otp": otp},
            format="json",
            REMOTE_ADDR="10.1.0.1",
        )

        self.assertEqual(request_response.status_code, 200)
        self.assertEqual(verify_response.status_code, 200)
        self.assertIn("access", verify_response.data["tokens"])

    def test_manual_customer_response_does_not_return_password(self):
        response = self.create_manual_customer()

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("password", str(response.data).lower())
        self.assertNotIn("Welcome@321", str(response.data))

    def test_multiple_manual_customers_do_not_share_predictable_password(self):
        first = self.create_manual_customer(phone="9000000103", email="manual3@example.com")
        second = self.create_manual_customer(phone="9000000104", email="manual4@example.com")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        users = get_user_model().objects.filter(username__in=["9000000103", "9000000104"])
        self.assertEqual(users.count(), 2)
        for user in users:
            self.assertFalse(user.has_usable_password())
            self.assertFalse(user.check_password("Welcome@321"))


class UserSignupTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def valid_payload(self, **overrides):
        payload = {"name": "New Customer", "phone": "9000000200", "email": "new-customer@example.invalid", "password": "Secret@123"}
        payload.update(overrides)
        return payload

    def test_signup_succeeds_with_valid_data(self):
        response = self.client.post("/auth/signup/", self.valid_payload(), format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(get_user_model().objects.filter(username="9000000200").exists())

    def test_duplicate_phone_returns_clean_400(self):
        self.client.post("/auth/signup/", self.valid_payload(), format="json")
        response = self.client.post(
            "/auth/signup/", self.valid_payload(email="different@example.invalid"), format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("phone", response.data)

    def test_duplicate_email_returns_clean_400(self):
        self.client.post("/auth/signup/", self.valid_payload(), format="json")
        response = self.client.post(
            "/auth/signup/", self.valid_payload(phone="9000000201"), format="json",
        )
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("email", response.data)

    def test_missing_required_fields_return_clean_400(self):
        response = self.client.post("/auth/signup/", {}, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        for field in ("name", "phone", "email"):
            self.assertIn(field, response.data)

    def test_missing_email_alone_returns_clean_400(self):
        payload = self.valid_payload()
        del payload["email"]
        response = self.client.post("/auth/signup/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("email", response.data)

    def test_error_response_does_not_leak_internals(self):
        response = self.client.post("/auth/signup/", {}, format="json")
        body = str(response.data)
        self.assertNotIn("Traceback", body)
        self.assertNotIn("KeyError", body)
