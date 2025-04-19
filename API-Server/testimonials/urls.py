from django.urls import path
from testimonials import views

urlpatterns = [
    path("feedback-message", views.FeedbackMessages.as_view(), name="feedback-message"),
    path("feedback-message/<int:pk>", views.FeedbackMessages.as_view(), name="delete-feedback-message"),
]