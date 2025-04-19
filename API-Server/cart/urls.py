from django.urls import path
from cart import views

urlpatterns = [
    path("get/", views.GetCart.as_view(), name="get_cart"),
    path("get-cart/", views.GetMyCart.as_view(), name="get_my_cart"),
    path("get-all/", views.GetAllCart.as_view(), name="get_all_cart"),
    path("create/", views.CreateCart.as_view(), name="create_cart"),
    path("delete-cart/<int:id>", views.DeleteCartItem.as_view(), name="delete_cart"),
    path("add-manual-cart/", views.AddManualCart.as_view(), name="add_manual_cart"),
]