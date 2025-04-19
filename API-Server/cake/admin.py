from django.contrib import admin
from cake.models import Cake, CakePrice, CakeImages, Offer

# Register your models here.

admin.site.register(Cake)
admin.site.register(CakePrice)
admin.site.register(CakeImages)
admin.site.register(Offer)