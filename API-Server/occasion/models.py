from django.db import models

# Create your models here.

class Occasion(models.Model):
    type = models.CharField(max_length = 300, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    person_name = models.CharField(max_length = 300, null=True, blank=True)
    person_phone = models.CharField(max_length = 20, null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    updated_on = models.DateTimeField(auto_now_add=True, blank=True, null=True)


    class Meta:
        verbose_name_plural = "Occasion"
        ordering = ['id']
        default_permissions = ()
