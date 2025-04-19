from django.urls import path
from api import views

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path("",views.getRoutes),
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
]