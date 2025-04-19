from django.db import models
from customer.models import Customer, CustomerAddress
from delivery_person.models import DeliveryPerson

# Create your models here.

class CakeOrder(models.Model):
    cart_id_list = models.JSONField(blank=True, null=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.IntegerField(default=0, null=True, blank=True)
    total_qty = models.IntegerField(default=0, null=True, blank=True)
    order_time = models.DateTimeField(null=True, blank=True)
    delivery_time = models.DateTimeField(null=True, blank=True)
    delivery_person_name = models.CharField(max_length = 200, null=True, blank=True)
    delivery_person_phone = models.CharField(max_length = 15, null=True, blank=True)
    delivery_partner = models.ForeignKey(DeliveryPerson, on_delete=models.SET_NULL, null=True, blank=True)
    delivery_address = models.ForeignKey(CustomerAddress, on_delete=models.SET_NULL, null=True, blank=True)
    delivery_status = models.IntegerField(default=1, null=True, blank=True)
    tracking_link = models.TextField(null=True, blank=True)
    manual_order_type = models.IntegerField(null=True, blank=True)
    is_manual_order = models.BooleanField(default=False, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Cake Order"
        ordering = ['id']
        default_permissions = ()

