from django.contrib import admin
from purchases.models import StockLocations, Purchase, PurchaseItems

# Register your models here.
admin.site.register(StockLocations)
admin.site.register(Purchase)
admin.site.register(PurchaseItems)
