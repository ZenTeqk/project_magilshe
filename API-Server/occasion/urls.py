from django.urls import path
from occasion import views


urlpatterns = [
    path("get", views.Occasions.as_view(), name="get_occasion"),
    path("save", views.Occasions.as_view(), name="save_occasion"),
]