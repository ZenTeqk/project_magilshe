from django.db import models
from django.conf import settings
from cake.models import CakePrice

# Create your models here.


class Event(models.Model):
    name = models.CharField(max_length=300)
    place = models.CharField(max_length=300, null=True, blank=True)
    description = models.TextField(default="")
    start = models.DateField()
    end = models.DateField()
    cake_id_list = models.JSONField(default=list)
    image_name = models.UUIDField(null=True, blank=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    status = models.BooleanField(default=True, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='event_created_user')
    updated_on = models.DateTimeField(auto_now=True, null=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='event_updated_user')
    


    class Meta:
        verbose_name_plural = "Event"
        ordering = ['id']
        default_permissions = ()






class EventOrder(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=300)
    phone = models.CharField(max_length = 15)
    email = models.EmailField(null=True)
    address = models.TextField(default="")
    notes = models.TextField(default="")
    total_amount = models.PositiveIntegerField(default=0)
    status=models.BooleanField(default=True)    
    ordered_time = models.DateTimeField(auto_now_add=True, null=True)
    order_status = models.PositiveIntegerField(default=1)


    class Meta:
        verbose_name_plural = "Event Order"
        ordering = ['id']
        default_permissions = ()



class EventOrderItems(models.Model):
    event_order = models.ForeignKey(EventOrder, on_delete=models.CASCADE, null=True)
    cake_price = models.ForeignKey(CakePrice, on_delete=models.CASCADE, null=True)
    qty = models.PositiveIntegerField(default=0)


    class Meta:
        verbose_name_plural = "Event Order Items"
        ordering = ['id']
        default_permissions = ()

