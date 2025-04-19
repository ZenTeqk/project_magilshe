from django.urls import path
from tag import views

urlpatterns = [
    path("tags", views.TagOperations.as_view(), name = "tags_operation"),
]
