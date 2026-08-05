from django.contrib import admin
from .models import (
    CRMOption, CRMOrder, Lead, LeadActivity, LeadReferenceImage, Quotation,
    QuotationActivity, QuotationPayment,
)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("lead_no", "customer_name", "phone", "occasion", "status", "created_on")
    search_fields = ("lead_no", "customer_name", "phone", "email")
    list_filter = ("status", "lead_source", "occasion")
    ordering = ("-created_on",)
    readonly_fields = ("lead_no", "created_on", "updated_on")


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ("quotation_no", "lead", "customer_name", "total_amount", "status", "created_on")
    search_fields = ("quotation_no", "lead__lead_no", "lead__customer_name", "customer_name", "phone")
    list_filter = ("status",)
    readonly_fields = ("quotation_no", "created_on", "updated_on")


admin.site.register(LeadActivity)
admin.site.register(LeadReferenceImage)
admin.site.register(CRMOption)
admin.site.register(QuotationActivity)
admin.site.register(QuotationPayment)
admin.site.register(CRMOrder)
