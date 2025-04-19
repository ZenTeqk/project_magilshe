from django.urls import path
from items import views

urlpatterns = [
    path("products", views.ProductOperations.as_view(), name="product-operations"),
    path('products/<int:pk>', views.ProductOperations.as_view(), name='item_update'),
    path('search', views.ItemSearchView.as_view(), name='item_search'),
]