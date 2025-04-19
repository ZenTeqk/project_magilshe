from django.urls import path

from kg import views

urlpatterns = [
    path("kg-list", views.KgListOperations.as_view(), name="kg_list_operations"),
    path('sub-unit', views.SubUnitView.as_view(), name='kg-list-create'),
    path('sub-unit/<int:pk>', views.SubUnitView.as_view(), name='kg-detail-update'),
]