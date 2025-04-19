from django.db import models
from cake.models import CakePrice
from kg.models import Kg
from customer.models import Customer
from occasion.models import Occasion

# Create your models here.

class Cart(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    cake_price = models.ForeignKey(CakePrice, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.IntegerField(default=0, null=True, blank=True)
    qty = models.IntegerField(default=0, null=True, blank=True)    
    greeting_text = models.CharField(max_length = 300, null=True, blank=True) 
    occasion = models.ForeignKey(Occasion, on_delete=models.CASCADE, null=True, blank=True)   
    status = models.BooleanField(default=True, null=True,blank=True)
    created_on = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_on = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Cart"
        ordering = ['id']
        default_permissions = ()
