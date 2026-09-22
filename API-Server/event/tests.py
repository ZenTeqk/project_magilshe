from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.test import APIClient

from cake.models import Cake, CakePrice
from category.models import MainCategory, SubCategory
from customer.models import AccessPermission, AccessRole
from event.models import EventOrder, EventOrderItems
from event.views import GetAllEventOrder, GetIndividualEventOrderData, SaveEventOrder, UpdateEventOrder
from kg.models import Kg
from unit.models import unit

urlpatterns = [
    path("event/save-event-order", SaveEventOrder.as_view()),
    path("event/get-all-event-order", GetAllEventOrder.as_view()),
    path("event/get-individual-event-order/<int:id>", GetIndividualEventOrderData.as_view()),
    path("event/update-status", UpdateEventOrder.as_view()),
]


@override_settings(ROOT_URLCONF=__name__)
class EventOrderAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(username="event-customer", password="password")
        self.staff_without_permission = User.objects.create_user(
            username="event-restricted-staff",
            password="password",
            is_staff=True,
        )
        view_permission, _ = AccessPermission.objects.get_or_create(
            code="marketing.view",
            defaults={
                "module": "Marketing",
                "resource": "Marketing",
                "action": "view",
                "name": "Marketing - View",
            },
        )
        edit_permission, _ = AccessPermission.objects.get_or_create(
            code="marketing.edit",
            defaults={
                "module": "Marketing",
                "resource": "Marketing",
                "action": "edit",
                "name": "Marketing - Edit",
            },
        )
        viewer_role = AccessRole.objects.create(name="Marketing Viewer", is_active=True)
        viewer_role.permissions.add(view_permission)
        editor_role = AccessRole.objects.create(name="Marketing Editor", is_active=True)
        editor_role.permissions.add(view_permission, edit_permission)
        self.authorized_staff = User.objects.create_user(
            username="event-marketing-staff",
            password="password",
            is_staff=True,
            role=viewer_role,
        )
        self.editor_staff = User.objects.create_user(
            username="event-marketing-editor",
            password="password",
            is_staff=True,
            role=editor_role,
        )

        main = MainCategory.objects.create(name="Events")
        sub = SubCategory.objects.create(name="Event Cakes", main_category=main)
        sale_unit = unit.objects.create(name="Kg")
        kg = Kg.objects.create(kg="1.00", unit=sale_unit)
        cake = Cake.objects.create(name="Event Cake", sub_category=sub, unit=sale_unit, status=True)
        self.cake_price = CakePrice.objects.create(cake=cake, kg=kg, price=1200)

    def create_event_order(self, **overrides):
        payload = {
            "name": "Private Event Customer",
            "phone": "9000000201",
            "email": "event@example.com",
            "address": "Private event address",
            "notes": "Sensitive event note",
            "total_amount": 1200,
            "order_status": 1,
        }
        payload.update(overrides)
        return EventOrder.objects.create(**payload)

    def public_creation_payload(self):
        return {
            "name": "Guest Event Customer",
            "phone": "9000000202",
            "email": "guest-event@example.com",
            "address": "Guest event address",
            "notes": "Guest note",
            "total_amount": 1200,
            "cake_price_details": [{"id": self.cake_price.id, "qty": 1}],
        }

    def test_public_event_order_list_is_protected(self):
        self.create_event_order()

        response = self.client.get("/event/get-all-event-order")

        self.assertIn(response.status_code, (401, 403))
        self.assertNotIn("Private Event Customer", str(getattr(response, "data", response.content)))

    def test_public_event_order_detail_is_protected(self):
        order = self.create_event_order()

        response = self.client.get(f"/event/get-individual-event-order/{order.id}")

        self.assertIn(response.status_code, (401, 403))
        self.assertNotIn("Private event address", str(getattr(response, "data", response.content)))

    def test_customer_event_order_detail_is_rejected_without_staff_permission(self):
        self.client.force_authenticate(self.customer)
        order = self.create_event_order()

        response = self.client.get(f"/event/get-individual-event-order/{order.id}")

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("Private event address", str(response.data))

    def test_customer_cannot_view_another_event_order(self):
        self.client.force_authenticate(self.customer)
        order = self.create_event_order(name="Other Event Customer")

        response = self.client.get(f"/event/get-individual-event-order/{order.id}")

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("Other Event Customer", str(response.data))

    def test_event_order_id_enumeration_does_not_expose_data(self):
        self.client.force_authenticate(self.customer)
        orders = [
            self.create_event_order(name=f"Enumerated Event {index}", phone=f"90000002{index:02d}")
            for index in range(3)
        ]

        for order in orders:
            with self.subTest(order_id=order.id):
                response = self.client.get(f"/event/get-individual-event-order/{order.id}")
                self.assertEqual(response.status_code, 403)
                self.assertNotIn("Enumerated Event", str(response.data))

    def test_staff_with_marketing_view_permission_can_read_event_order(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.create_event_order()

        list_response = self.client.get("/event/get-all-event-order")
        detail_response = self.client.get(f"/event/get-individual-event-order/{order.id}")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["data"]["id"], order.id)
        self.assertEqual(detail_response.data["data"]["phone"], "9000000201")

    def test_staff_without_marketing_permission_is_rejected(self):
        self.client.force_authenticate(self.staff_without_permission)
        order = self.create_event_order()

        list_response = self.client.get("/event/get-all-event-order")
        detail_response = self.client.get(f"/event/get-individual-event-order/{order.id}")

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(detail_response.status_code, 403)

    def test_public_event_order_creation_still_works(self):
        response = self.client.post(
            "/event/save-event-order",
            self.public_creation_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order = EventOrder.objects.get(id=response.data["data"]["id"])
        self.assertEqual(order.name, "Guest Event Customer")
        self.assertEqual(EventOrderItems.objects.filter(event_order=order).count(), 1)

    def test_event_status_mutation_requires_marketing_edit_permission(self):
        order = self.create_event_order(order_status=1)

        public_response = self.client.post(
            "/event/update-status",
            {"id": order.id, "order_status": 2},
            format="json",
        )
        self.client.force_authenticate(self.authorized_staff)
        viewer_response = self.client.post(
            "/event/update-status",
            {"id": order.id, "order_status": 2},
            format="json",
        )
        self.client.force_authenticate(self.editor_staff)
        editor_response = self.client.post(
            "/event/update-status",
            {"id": order.id, "order_status": 2},
            format="json",
        )

        self.assertIn(public_response.status_code, (401, 403))
        self.assertEqual(viewer_response.status_code, 403)
        self.assertEqual(editor_response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.order_status, 2)
