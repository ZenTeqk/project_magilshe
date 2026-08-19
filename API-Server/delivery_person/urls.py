from django.urls import include, path
from rest_framework.routers import DefaultRouter
from delivery_person import views

router = DefaultRouter()
router.register("staff", views.DeliveryStaffViewSet, basename="delivery-staff")
router.register("platforms", views.DeliveryPlatformViewSet, basename="delivery-platform")
router.register("partners", views.ExternalDeliveryPersonViewSet, basename="external-delivery-person")

urlpatterns = [
    path('create/', views.AddDeliveryPerson.as_view(), name="create_delivery_person"),
    path('get/', views.GetDeliveryPerson.as_view(), name="get_delivery_person"),
    path('management/', include(router.urls)),
]
