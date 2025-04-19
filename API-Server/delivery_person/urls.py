from django.urls import path
from delivery_person import views

urlpatterns = [
    path('create/', views.AddDeliveryPerson.as_view(), name="create_delivery_person"),
    path('get/', views.GetDeliveryPerson.as_view(), name="get_delivery_person"),
]