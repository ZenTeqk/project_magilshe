from django.db import models
from django.conf import settings

# Create your models here.

class Banner(models.Model):
    image_name = models.UUIDField(null=True, blank=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    main_text = models.CharField(max_length = 300, null=True, blank=True)
    sub_text = models.CharField(max_length = 300, null=True, blank=True)
    status = models.BooleanField(default=True, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='banner_created_user')
    updated_on = models.DateTimeField(auto_now=True, null=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='banner_updated_user')
    


    class Meta:
        verbose_name_plural = "Banner"
        ordering = ['id']
        default_permissions = ()