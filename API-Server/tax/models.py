from django.db import models
from django.conf import settings

# Create your models here.

class TaxCategory(models.Model):
    tax_category = models.CharField(max_length=5)
    tax_percentage = models.PositiveSmallIntegerField(null=True, blank=True)
    tax_group_sequence = models.PositiveSmallIntegerField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "TaxCategory"
        ordering = ['id']
        default_permissions = ()