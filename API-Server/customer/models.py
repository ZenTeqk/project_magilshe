from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

# Create your models here.

class Customer(AbstractUser):
    phone = models.CharField(max_length = 15, null= True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)    
    profile_picture_name = models.UUIDField(null=True, blank=True)
    profile_picture_ext = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Customer"
        ordering = ['id']
        default_permissions = ()


class CustomerAddress(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null = True, blank=True)
    title = models.CharField(max_length = 300, null = True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.TextField(null=True, blank=True)
    pincode = models.CharField(max_length = 6, null=True, blank=True)
    is_primary = models.BooleanField(default=False, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='customer_address_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='customer_address_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Customer Address"
        ordering = ['id']
        default_permissions = ()