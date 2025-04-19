from django.db import models
from django.conf import settings

# Create your models here.

class DeliveryPerson(models.Model):
    name = models.CharField(max_length=300, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    email = models.EmailField(null = True, blank=True)
    phone = models.CharField(max_length=15,null=True,blank=True)
    address = models.TextField(null=True,blank=True)
    status = models.BooleanField(default = True,null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='delivery_person_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='delivery_person_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Delivery Person"
        ordering = ['id']
        default_permissions = ()
