from django.urls import path
from authentication import views

urlpatterns = [
    path("login/", views.UserLogin.as_view(), name="login"),
    path("logout/", views.UserLogout.as_view(), name="logout"),
    path("signup/", views.UserSignup.as_view(), name="signup"),

    path('send-otp/', views.send_otp_view, name='send_otp'),
    path('validate-otp/', views.validate_otp_view, name='validate_otp'),

    path('request-otp/', views.OTPRequestView.as_view(), name='otp-request'),
    path('verify-otp/', views.OTPVerifyView.as_view(), name='otp-verify'),
    path('create-manual-customer/', views.CreateManualCustomer.as_view(), name="create_manual_customer"),

]