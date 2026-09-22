import json
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.cache import cache
from rest_framework.exceptions import Throttled, ValidationError


PHONE_PATTERN = r"^\d{10}$"


def normalize_phone(value):
    phone = str(value or "").strip()
    if not phone.isdigit() or len(phone) != 10:
        raise ValidationError({"username": "Invalid username."})
    return phone


def client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def secure_otp():
    return str(secrets.randbelow(900000) + 100000)


def throttle_key(scope, identifier):
    return f"otp:{scope}:{identifier}"


def check_rate_limit(scope, identifier, limit, window_seconds):
    key = throttle_key(scope, identifier)
    added = cache.add(key, 1, timeout=window_seconds)
    if added:
        return
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)
        return
    if count > limit:
        raise Throttled(detail="Too many OTP attempts. Please try again later.")


def ensure_rate_limit_available(scope, identifier, limit):
    count = cache.get(throttle_key(scope, identifier), 0)
    if count >= limit:
        raise Throttled(detail="Too many OTP attempts. Please try again later.")


def reset_rate_limit(scope, identifier):
    cache.delete(throttle_key(scope, identifier))


def enforce_otp_request_limits(phone, ip_address):
    check_rate_limit(
        "request:phone",
        phone,
        settings.OTP_REQUEST_PHONE_LIMIT,
        settings.OTP_REQUEST_PHONE_WINDOW_SECONDS,
    )
    check_rate_limit(
        "request:ip",
        ip_address,
        settings.OTP_REQUEST_IP_LIMIT,
        settings.OTP_REQUEST_IP_WINDOW_SECONDS,
    )


def enforce_otp_verify_limits(phone, ip_address):
    ensure_rate_limit_available(
        "verify:phone",
        phone,
        settings.OTP_VERIFY_PHONE_LIMIT,
    )
    ensure_rate_limit_available(
        "verify:ip",
        ip_address,
        settings.OTP_VERIFY_IP_LIMIT,
    )


def record_otp_verify_failure(phone, ip_address):
    check_rate_limit(
        "verify:phone",
        phone,
        settings.OTP_VERIFY_PHONE_LIMIT,
        settings.OTP_VERIFY_PHONE_WINDOW_SECONDS,
    )
    check_rate_limit(
        "verify:ip",
        ip_address,
        settings.OTP_VERIFY_IP_LIMIT,
        settings.OTP_VERIFY_IP_WINDOW_SECONDS,
    )


def reset_otp_verify_limits(phone, ip_address):
    reset_rate_limit("verify:phone", phone)
    reset_rate_limit("verify:ip", ip_address)


def send_msg91_otp(phone, otp):
    if not settings.MSG91_API_KEY or not settings.MSG91_TEMPLATE_ID:
        raise ValidationError({"message": "Unable to send OTP at this time."})

    params = urlencode({
        "otp_expiry": max(1, int(settings.OTP_EXPIRY_SECONDS / 60)),
        "template_id": settings.MSG91_TEMPLATE_ID,
        "mobile": f"91{phone}",
        "realTimeResponse": 1,
    })
    response = requests.post(
        f"https://control.msg91.com/api/v5/otp?{params}",
        data=json.dumps({"OTP": otp}),
        headers={
            "Content-Type": "application/json",
            "authkey": settings.MSG91_API_KEY,
        },
        timeout=10,
    )
    if response.status_code != 200:
        raise ValidationError({"message": "Unable to send OTP at this time."})

    try:
        response_json = response.json()
    except ValueError:
        raise ValidationError({"message": "Unable to send OTP at this time."})

    if response_json.get("type") != "success":
        raise ValidationError({"message": "Unable to send OTP at this time."})
