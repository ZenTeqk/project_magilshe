from django.urls import path
from category import views

urlpatterns = [
    path('get-main-category', views.GetMainCategoryOperations.as_view(), name="get_main_category_opertions"),
    path('main-category', views.MainCategoryOperations.as_view(), name="main_category_opertions"),
    path('sub-category', views.SubCategoryOperations.as_view(), name="sub_category_opertions"),
    path('get-sub-category', views.GetSubCategoryData.as_view(), name="get_sub_category_opertions"),
]