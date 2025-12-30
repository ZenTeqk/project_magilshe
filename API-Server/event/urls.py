from django.urls import path
from event import views

urlpatterns = [
    path("", views.SaveEvent.as_view(), name="save-event"),
    path("get-all-data", views.GetEventData.as_view(), name="get-event-data"),
    path("get-individual-data/<int:id>", views.GetIndividualEvent.as_view(), name="get-individual-data"),
    path("save-event-order", views.SaveEventOrder.as_view(), name="save-event-order"),
    path("get-all-event-order", views.GetAllEventOrder.as_view(), name="get-all-event-order"),
    path("get-individual-event-order/<int:id>", views.GetIndividualEventOrderData.as_view(), name="get-individual-event-order"),
    path("update-status", views.UpdateEventOrder.as_view(), name="update-event-order-status")
]