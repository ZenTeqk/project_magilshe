from django.db import models
from django.conf import settings
import uuid

class OTP(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    otp = models.CharField(max_length=6)
    session_id = models.UUIDField(default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        from datetime import timedelta
        from django.conf import settings
        from django.utils.timezone import now
        return now() < self.created_at + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)
