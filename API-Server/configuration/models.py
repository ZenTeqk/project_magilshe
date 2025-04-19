from django.db import models
from django.conf import settings

# Create your models here.

class Configuration(models.Model):
    image_name = models.UUIDField(null=True, blank=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    name = models.CharField(max_length = 300, null=True, blank=True)
    mobile = models.CharField(max_length = 15, null=True, blank=True)
    email = models.EmailField(null = True, blank=True)
    website = models.TextField(null = True, blank=True)
    gst_number = models.CharField(max_length = 300, null=True, blank=True)
    food_license_number = models.CharField(max_length = 300, null=True, blank=True)
    company_address = models.TextField(null = True, blank=True)
    map_iframe_link = models.TextField(null = True, blank=True)
    description = models.TextField(null = True, blank=True)
    return_policy = models.TextField(null = True, blank=True)
    greeting_text = models.TextField(null = True, blank=True)
    meta = models.JSONField(default = dict, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='configuration_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='configuration_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Configuration"
        ordering = ['id']
        default_permissions = ()

class TermsAndConditions(models.Model):
    content = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "TermsAndConditions"
        ordering = ['id']
        default_permissions = ()

class PrivacyPolicy(models.Model):
    content = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "PrivacyPolicy"
        ordering = ['id']
        default_permissions = ()

