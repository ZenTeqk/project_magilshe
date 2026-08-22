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
    role = models.ForeignKey("AccessRole", null=True, blank=True, on_delete=models.SET_NULL, related_name="users")

    class Meta:
        verbose_name_plural = "Customer"
        ordering = ['id']
        default_permissions = ()
        indexes = [
            models.Index(fields=['phone'], name='customer_phone_idx'),
            models.Index(fields=['email'], name='customer_email_idx'),
            models.Index(fields=['first_name', 'last_name'], name='customer_name_idx'),
        ]


class CustomerAddress(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null = True, blank=True)
    title = models.CharField(max_length = 300, null = True, blank=True)
    person_name = models.CharField(max_length=300, null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
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


class AccessPermission(models.Model):
    code = models.CharField(max_length=120, unique=True, db_index=True)
    module = models.CharField(max_length=60, db_index=True)
    resource = models.CharField(max_length=60, db_index=True)
    action = models.CharField(max_length=40)
    name = models.CharField(max_length=160)

    class Meta:
        ordering = ("module", "resource", "action")
        default_permissions = ()

    def __str__(self):
        return self.code


class AccessRole(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_super_admin = models.BooleanField(default=False)
    permissions = models.ManyToManyField(AccessPermission, blank=True, related_name="roles")
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        default_permissions = ()

    def __str__(self):
        return self.name
