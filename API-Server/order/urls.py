from django.urls import path
from order import views

urlpatterns = [
    path("save/", views.SaveCakeOrder.as_view(), name="save_cake_order"),
    path("get-all-order/", views.GetAllCakeOrder.as_view(), name="get_all_cake_order"),
    path("get-my-order/", views.GetMyCakeOrder.as_view(), name="get_my_cake_order"),
    path("status-update/", views.OrderStatusUpdate.as_view(), name="cake_order_status_update"),
    path("get/<int:id>/", views.GetIndividualOrder.as_view(), name="get_individual_order"),

    path("get-orders/", views.CakeOrderListView.as_view(), name="get_order_list"),
    path("get-orders/<int:pk>/", views.CakeOrderDetailView.as_view(), name="get_order_details"),
    path("get-my-orders/", views.MyCakeOrderListView.as_view(), name="get_my_order_details"),
    path("get-customer-order/", views.GetCustomerOrderBasedOnDateRange.as_view(), name="get_customer_order"),
]