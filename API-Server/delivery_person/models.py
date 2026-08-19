from django.db import models
from django.conf import settings

# Create your models here.

class DeliveryPerson(models.Model):
    staff_id = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    name = models.CharField(max_length=300, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    email = models.EmailField(null = True, blank=True)
    phone = models.CharField(max_length=15,null=True,blank=True)
    alternate_phone = models.CharField(max_length=15, null=True, blank=True)
    address = models.TextField(null=True,blank=True)
    service_area = models.CharField(max_length=300, null=True, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    image_name = models.UUIDField(null=True, blank=True)
    image_ext = models.CharField(max_length=10, null=True, blank=True)
    status = models.BooleanField(default = True,null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='delivery_person_created_user')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='delivery_person_updated_user')
    updated_on = models.DateTimeField(auto_now=True, null=True, blank=True)


    class Meta:
        verbose_name_plural = "Delivery Person"
        ordering = ['id']
        default_permissions = ()

    def save(self, *args, **kwargs):
        if not self.staff_id:
            last_id = DeliveryPerson.objects.order_by("-id").values_list("id", flat=True).first() or 0
            self.staff_id = f"DS-{last_id + 1:05d}"
        super().save(*args, **kwargs)


class DeliveryPlatform(models.Model):
    name = models.CharField(max_length=150, unique=True)
    contact_information = models.TextField(null=True, blank=True)
    status = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        default_permissions = ()


class ExternalDeliveryPerson(models.Model):
    partner_id = models.CharField(max_length=30, unique=True, null=True, blank=True, editable=False)
    platform = models.ForeignKey(DeliveryPlatform, on_delete=models.PROTECT, related_name="drivers")
    name = models.CharField(max_length=300)
    phone = models.CharField(max_length=15)
    alternate_phone = models.CharField(max_length=15, null=True, blank=True)
    vehicle_type = models.CharField(max_length=100, null=True, blank=True)
    vehicle_number = models.CharField(max_length=100, null=True, blank=True)
    service_area = models.CharField(max_length=300, null=True, blank=True)
    status = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        default_permissions = ()

    def save(self, *args, **kwargs):
        if not self.partner_id:
            last_id = ExternalDeliveryPerson.objects.order_by("-id").values_list("id", flat=True).first() or 0
            self.partner_id = f"DP-{last_id + 1:05d}"
        super().save(*args, **kwargs)
