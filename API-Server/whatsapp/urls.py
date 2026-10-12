from rest_framework.routers import DefaultRouter
from django.urls import path, include

from . import views

router = DefaultRouter()
router.register("templates", views.MessageTemplateViewSet, basename="whatsapp-template")
router.register("messages", views.MessageLogViewSet, basename="whatsapp-message")

urlpatterns = [
    path("settings/", views.WhatsAppSettingsView.as_view()),
    path("event-catalogue/", views.EventCatalogueView.as_view()),
    path("send/", views.SendMessageView.as_view()),
    path("occasion-reminders/", views.OccasionReminderView.as_view()),
    path("webhook/", views.WebhookView.as_view()),
    path("", include(router.urls)),
]
