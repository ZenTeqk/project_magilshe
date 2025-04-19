from django.urls import path
from dashboard import views

urlpatterns = [
    path("home/", views.GetOrderStatusCount.as_view(), name="get_order_status_count")
]