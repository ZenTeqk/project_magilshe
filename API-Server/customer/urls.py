from django.urls import path
from customer import views

urlpatterns = [
    path('get-address/', views.GetCustomerAddressList.as_view(), name="get_customer_address"),
    path('save-address/', views.SaveCustomerAddress.as_view(), name="save_customer_address"),
    path('get-all-data/', views.GetAllCustomerData.as_view(), name="get_all_customer_data"),
    path('get-my-profile/', views.GetMyProfile.as_view(), name="get_my_profile"),
    path('update-profile/', views.UpdateProfile.as_view(), name="update_profile"),
    path('check-customer/', views.GetCustomerFromPhone.as_view(), name="check_customer"),
]