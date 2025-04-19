from django.db import models
from django.conf import settings

# Create your models here.

class Gallery(models.Model):
    image_name = models.UUIDField(blank=True, null=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    description = models.TextField(blank=True, null=True)    
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='gallery_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='gallery_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Gallery"
        ordering = ['id']
        default_permissions = ()