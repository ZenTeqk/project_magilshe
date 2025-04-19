from django.db import models
from django.conf import settings
from category.models import SubCategory
from tax.models import TaxCategory
# Create your models here.

class Items(models.Model):
    name = models.CharField(max_length=255, default = '', null=True, blank=True)
    category = models.ForeignKey(SubCategory, on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=255, default = '', null=True, blank=True)
    hsn_code = models.CharField(max_length=32, default = '', null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    mrp_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    retail_price = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    wholesale_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    receiving_quantity = models.DecimalField(max_digits=15, decimal_places=3, default=1.000, null=True, blank=True)
    is_serialized = models.BooleanField(default=False)
    is_stock = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    tax_category = models.ForeignKey(TaxCategory, on_delete=models.CASCADE, null=True, blank=True)
    # item_type = models.SmallIntegerField(default=0)
    # qty_per_pack = models.DecimalField(max_digits=15, decimal_places=3, default=1.000)
    # low_sell_item_id = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Items"
        ordering = ['id']
        default_permissions = ()