from django.urls import path
from reports import views

urlpatterns = [
    path("crm-analytics", views.CRMAnalyticsReport.as_view(), name="crm_analytics_report"),
    path("order-report", views.GetOrderReport.as_view(), name="get_order_report"),
    path("delivery-person-report", views.GetDeliveryPersonReport.as_view(), name="delivery_person_report"),
    path("occasion-report", views.GetOccasionReport.as_view(), name="occasion_report"),
]
