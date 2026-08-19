from django.urls import include, path
from rest_framework.routers import DefaultRouter
from customer import views
from customer.rbac_views import PermissionViewSet, RoleViewSet, StaffUserViewSet, current_access

rbac_router = DefaultRouter()
rbac_router.register("users", StaffUserViewSet, basename="rbac-user")
rbac_router.register("roles", RoleViewSet, basename="rbac-role")
rbac_router.register("permissions", PermissionViewSet, basename="rbac-permission")

urlpatterns = [
    path("rbac/me/", current_access, name="rbac-me"),
    path("rbac/", include(rbac_router.urls)),
    path('get-address/', views.GetCustomerAddressList.as_view(), name="get_customer_address"),
    path('save-address/', views.SaveCustomerAddress.as_view(), name="save_customer_address"),
    path('get-all-data/', views.GetAllCustomerData.as_view(), name="get_all_customer_data"),
    path('get-my-profile/', views.GetMyProfile.as_view(), name="get_my_profile"),
    path('update-profile/', views.UpdateProfile.as_view(), name="update_profile"),
    path('check-customer/', views.GetCustomerFromPhone.as_view(), name="check_customer"),
]
