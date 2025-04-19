from django.urls import path
from cake import views

urlpatterns = [
    path("get-cake-data/", views.GetCakeList.as_view(), name="get_cake_list"),
    path("create/", views.CreateCake.as_view(), name="create_cake"),
    path("cake/<int:id>", views.GetCakeData.as_view(), name="get_cake_data"),
    path("update-offer/", views.AddCakeOffer.as_view(), name="add_cake_offer"),
    path("get-offer/", views.GetOffer.as_view(), name="get_cake_offer"),
    path("offer-items", views.GetOfferItems.as_view(), name="get_offer_items"),

    path('cakes/', views.CakeListView.as_view(), name='cake-list'),
    path('cakes/<int:id>/', views.CakeDetailView.as_view(), name='cake-detail'),

    path('get-latest-cake-data/', views.GetLatestCakeData.as_view(), name="get_latest_cake_data"),
    path('delete/<int:id>/', views.DeleteCake.as_view(), name="delete_cake"),
    path('delete-offer/<int:id>/', views.DeleteCakeOffer.as_view(), name="delete_cake"),

]