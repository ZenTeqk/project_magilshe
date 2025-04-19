from django.urls import path

from gallery import views

urlpatterns = [
    path("get-gallery", views.GetGalleryImages.as_view(), name="get_gallery_image"),
    path("add-gallery", views.AddGalleryImages.as_view(), name="add_gallery_image"),
    path("delete-gallery/<int:id>", views.DeleteGalleryImage.as_view(), name="delete_gallery_image"),
]