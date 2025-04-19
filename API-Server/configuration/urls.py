from django.urls import path

from configuration import views

urlpatterns = [
    path("save/", views.SaveConfiguration.as_view(), name="save_configuration"),
    path("get/", views.GetConfiguration.as_view(), name="get_configuration"),

    path("settings/", views.ConfigurationSettings.as_view(), name="onfiguration_settings"),

    path('config-data/', views.ConfigurationView.as_view(), name='configuration'),

    path('terms-and-conditions/', views.UpdateTermsAndConditions.as_view(), name='update_terms_and_conditions'),
    path('privacy-policy/', views.UpdatePrivacyPolicy.as_view(), name='update_privacy_policy'),

]