from django.urls import path
from purchases import views

urlpatterns = [
    path('stock-locations/', views.StockLocationView.as_view(), name='stock-location-list'),
    path('receivings/', views.PurchaseView.as_view(), name='purchase-list'),
    path('receivings/<int:id>/', views.PurchaseView.as_view(), name='purchase-detail'),
    path('receivings/bill/<int:id>/', views.PurchaseDetailView.as_view(), name='purchase-detail'),
]