from django.db import models
from django.conf import settings

# Create your models here.
class unit(models.Model):
    name = models.CharField(max_length=25, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_variant = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='unit_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='unit_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "unit"
        ordering = ['id']
        default_permissions = ()