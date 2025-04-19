from django.db import models
from django.conf import settings
from items.models import Items
# Create your models here.

class StockLocations(models.Model):
    location_name = models.TextField(default="", null=True, blank=True)
    deleted = models.SmallIntegerField(default=0, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "StockLocations"
        ordering = ['id']
        default_permissions = ()

class Purchase(models.Model):
    comment = models.TextField(default = "0", null=True, blank=True)
    supplier_name = models.CharField(max_length=255, null=True, blank=True)
    payment_type = models.CharField(max_length=20, null=True, blank=True)
    invoice_number = models.CharField(max_length=20, null=True, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reference = models.CharField(max_length=255, null=True, blank=True)
    purchase_employee = models.CharField(max_length=255, null=True, blank=True)
    login_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='purchsed_user')
    purchase_status = models.IntegerField(default=0)
    receiving_time = models.DateTimeField(auto_now_add=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Purchase"
        ordering = ['id']
        default_permissions = ()

class PurchaseItems(models.Model):
    purchase_id = models.ForeignKey(Purchase, on_delete=models.CASCADE, null=True, blank=True)
    item_id = models.ForeignKey(Items, on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=255, default = "", null=True, blank=True)
    serialnumber = models.CharField(max_length=30, default = "", null=True, blank=True)
    quantity_purchased = models.DecimalField(max_digits=15, decimal_places=3, default=0.000, null=True, blank=True)
    mrp_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    retail_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    wholesale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    discount = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, null=True, blank=True)
    discount_type = models.SmallIntegerField(default=0, null=True, blank=True)
    stock_location = models.ForeignKey(StockLocations, on_delete=models.CASCADE, default = 0, null=True, blank=True)
    receiving_quantity = models.DecimalField(max_digits=15, decimal_places=3, default=1.000)

    class Meta:
        verbose_name_plural = "PurchaseItems"
        ordering = ['id']
        default_permissions = ()
