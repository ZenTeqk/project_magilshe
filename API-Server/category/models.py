from django.db import models
from django.conf import settings

# Create your models here.


class MainCategory(models.Model):
    name = models.CharField(max_length = 300, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    image_name = models.UUIDField(blank=True, null=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    meta_title = models.CharField(max_length = 300, null=True, blank=True)
    meta_description = models.TextField(null=True, blank=True)
    slug = models.TextField(null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='main_category_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='main_category_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Main Category"
        ordering = ['id']
        default_permissions = ()



class SubCategory(models.Model):
    main_category = models.ForeignKey(MainCategory, null=True, blank=True, on_delete=models.CASCADE,
                                   related_name='sub_category')
    name = models.CharField(max_length = 300, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    image_name = models.UUIDField(blank=True, null=True)
    image_ext = models.CharField(max_length=10, blank=True, null=True)
    meta_title = models.CharField(max_length = 300, null=True, blank=True)
    meta_description = models.TextField(null=True, blank=True)
    slug = models.TextField(null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='sub_category_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='sub_category_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Sub Category"
        ordering = ['id']
        default_permissions = ()