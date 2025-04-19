from django.db import models
from django.conf import settings
from category.models import SubCategory
from kg.models import Kg
from unit.models import unit

# Create your models here.

class Cake(models.Model):
    name = models.CharField(max_length = 300, null=True, blank=True)
    description = models.TextField(default="", null=True, blank=True)
    sub_category = models.ForeignKey(SubCategory, on_delete=models.CASCADE, null=True, blank=True)
    unit = models.ForeignKey(unit, on_delete=models.CASCADE, null=True, blank=True)
    tag = models.JSONField(blank=True, null=True)
    seo_url = models.TextField(null=True, blank=True)
    seo_text = models.TextField(null=True, blank=True)
    status = models.BooleanField(default=True, null=True)
    price = models.IntegerField(default = 0, null=True, blank=True)
    meta_title = models.CharField(max_length = 300, null=True, blank=True)
    meta_description = models.TextField(null=True, blank=True)
    slug = models.TextField(null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cake_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cake_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Cake"
        ordering = ['id']
        default_permissions = ()



class Offer(models.Model):
    name = models.TextField(null=True,blank=True)
    type = models.IntegerField(null=True, blank=True)
    id_list = models.JSONField(null=True, blank=True)
    image_name = models.UUIDField(null=True, blank=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    offer_per = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    offer_from = models.DateTimeField(null=True, blank=True)
    offer_to = models.DateTimeField(null=True, blank=True)
    status = models.BooleanField(default=True, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='offer_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='offer_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Offer"
        ordering = ['id']
        default_permissions = ()


class CakePrice(models.Model):
    cake = models.ForeignKey(Cake, on_delete=models.CASCADE, null=True, blank=True)
    kg = models.ForeignKey(Kg, on_delete=models.CASCADE, null=True, blank=True)
    price = models.IntegerField(default = 0, null = True, blank = True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cakeprice_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cakeprice_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Cake Price"
        ordering = ['id']
        default_permissions = ()



class CakeImages(models.Model):
    cake = models.ForeignKey(Cake, on_delete=models.CASCADE, null=True, blank=True)
    image_name = models.UUIDField(blank=True, null=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cake_image_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='cake_image_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Cake Images"
        ordering = ['id']
        default_permissions = ()





