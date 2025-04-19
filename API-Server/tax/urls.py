from django.urls import path
from .views import TaxCategoryAPIView

urlpatterns = [
    path('tax-category', TaxCategoryAPIView.as_view(), name='tax_category_add_update'),
    path('tax-category/<int:pk>', TaxCategoryAPIView.as_view(), name='tax_category_update'),
]
