from django.urls import path
from unit import views

urlpatterns = [
    path("item", views.UnitOperations.as_view(), name="unit-operations"),
]