from django.urls import path
from reports import views

urlpatterns = [
    path("order-report", views.GetOrderReport.as_view(), name="get_order_report"),
    path("delivery-person-report", views.GetDeliveryPersonReport.as_view(), name="delivery_person_report"),
    path("occasion-report", views.GetOccasionReport.as_view(), name="occasion_report"),
]