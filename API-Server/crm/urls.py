from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    CRMCustomerViewSet, CRMDeliveryViewSet, CRMInvoiceViewSet, CRMOptionViewSet, CRMOrderViewSet,
    CustomerRecurringEventViewSet, LeadViewSet, QuotationViewSet,
)

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="crm-lead")
router.register("customers", CRMCustomerViewSet, basename="crm-customer")
router.register("quotations", QuotationViewSet, basename="crm-quotation")
router.register("orders", CRMOrderViewSet, basename="crm-order")
router.register("invoices", CRMInvoiceViewSet, basename="crm-invoice")
router.register("deliveries", CRMDeliveryViewSet, basename="crm-delivery")
router.register("options", CRMOptionViewSet, basename="crm-option")
router.register("customer-events", CustomerRecurringEventViewSet, basename="crm-customer-event")

urlpatterns = [path("", include(router.urls))]
