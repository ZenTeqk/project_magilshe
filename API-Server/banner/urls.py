from django.urls import path
from banner import views

urlpatterns = [
    path("", views.BannerApiView.as_view(), name="banner-api"),
    path("get-data", views.GetBannerData.as_view(), name="get-banner-data"),
]