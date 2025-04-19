from django.db import models
from django.conf import settings
from unit.models import unit
# Create your models here.


class Kg(models.Model):
    kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    description = models.TextField(blank=True, null=True)    
    unit = models.ForeignKey(unit, on_delete=models.CASCADE, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='kg_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='kg_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Kg"
        ordering = ['id']
        default_permissions = ()