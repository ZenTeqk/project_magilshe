from django.db import models
from django.conf import settings

# Create your models here.

class feedback_messages(models.Model):
    name = models.CharField(max_length=300, null=True, blank=True)
    mobile = models.CharField(max_length=20,null=True,blank=True)    
    message = models.TextField(blank=True, null=True)    
    is_subscribed = models.BooleanField(default = False,null=True, blank=True)
    status = models.BooleanField(default = True,null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "feedback_messages"
        ordering = ['id']
        default_permissions = ()