import sys

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import path
from rest_framework.test import APIClient

from cart.views import CreateCart
from customer.models import AccessPermission, AccessRole, CustomerAddress
from order.models import CakeOrder
from order.views import GetIndividualOrder, OrderStatusUpdate, SaveCakeOrder

urlpatterns = [
    path("cart/create/", CreateCart.as_view()),
    path("order/save/", SaveCakeOrder.as_view()),
    path("order/status-update/", OrderStatusUpdate.as_view()),
    path("order/get/<int:id>/", GetIndividualOrder.as_view()),
]
if any(arg == "order" or arg.startswith("order.") for arg in sys.argv):
    settings.ROOT_URLCONF = __name__


class OrderStatusAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(
            username="customer-a",
            password="password",
            email="a@example.com",
        )
        self.other_customer = User.objects.create_user(
            username="customer-b",
            password="password",
            email="b@example.com",
        )
        self.staff_without_permission = User.objects.create_user(
            username="restricted-staff",
            password="password",
            is_staff=True,
        )
        permission, _ = AccessPermission.objects.get_or_create(
            code="operations.process",
            defaults={
                "module": "Operations",
                "resource": "Store Operations",
                "action": "process",
                "name": "Store Operations - Process",
            },
        )
        role = AccessRole.objects.create(name="Operations Processor", is_active=True)
        role.permissions.add(permission)
        self.authorized_staff = User.objects.create_user(
            username="operations-staff",
            password="password",
            is_staff=True,
            role=role,
        )

    def make_order(self, customer=None, delivery_status=1):
        return CakeOrder.objects.create(
            customer=customer or self.customer,
            total_amount=100,
            total_qty=1,
            delivery_status=delivery_status,
        )

    def post_status(self, order_id, delivery_status):
        return self.client.post(
            "/order/status-update/",
            {"cake_order_id": order_id, "delivery_status": delivery_status},
            format="json",
        )

    def test_customer_can_request_cancellation_for_own_early_order(self):
        self.client.force_authenticate(self.customer)
        order = self.make_order(delivery_status=1)

        response = self.post_status(order.id, 7)

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 7)

    def test_customer_cannot_update_another_customers_order(self):
        self.client.force_authenticate(self.customer)
        other_order = self.make_order(customer=self.other_customer, delivery_status=1)

        response = self.post_status(other_order.id, 7)

        self.assertEqual(response.status_code, 404)
        other_order.refresh_from_db()
        self.assertEqual(other_order.delivery_status, 1)

    def test_customer_cannot_set_internal_status(self):
        self.client.force_authenticate(self.customer)
        order = self.make_order(delivery_status=1)

        response = self.post_status(order.id, 6)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 1)

    def test_customer_id_guessing_does_not_mutate_or_disclose_order(self):
        self.client.force_authenticate(self.customer)
        other_order = self.make_order(customer=self.other_customer, delivery_status=2)

        response = self.post_status(other_order.id, 7)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["message"], "Order not found.")
        other_order.refresh_from_db()
        self.assertEqual(other_order.delivery_status, 2)

    def test_staff_without_order_permission_cannot_update_internal_status(self):
        self.client.force_authenticate(self.staff_without_permission)
        order = self.make_order(customer=self.other_customer, delivery_status=1)

        response = self.post_status(order.id, 2)

        self.assertEqual(response.status_code, 404)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 1)

    def test_authorized_staff_can_apply_legitimate_transition(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.make_order(customer=self.other_customer, delivery_status=1)

        response = self.post_status(order.id, 2)

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 2)

    def test_invalid_status_is_rejected(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.make_order(delivery_status=1)

        response = self.post_status(order.id, 999)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 1)

    def test_invalid_transition_is_rejected(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.make_order(delivery_status=1)

        response = self.post_status(order.id, 6)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 1)

    def test_nonexistent_order_returns_clean_not_found(self):
        self.client.force_authenticate(self.authorized_staff)

        response = self.post_status(999999, 2)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["message"], "Order not found.")

    def test_finalized_order_cannot_be_mutated(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.make_order(delivery_status=6)

        response = self.post_status(order.id, 7)

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.delivery_status, 6)


class GetIndividualOrderAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(
            username="detail-customer-a",
            password="password",
            first_name="Customer A",
            email="detail-a@example.com",
            phone="9000000101",
        )
        self.other_customer = User.objects.create_user(
            username="detail-customer-b",
            password="password",
            first_name="Customer B",
            email="detail-b@example.com",
            phone="9000000102",
        )
        self.staff_without_permission = User.objects.create_user(
            username="detail-restricted-staff",
            password="password",
            is_staff=True,
        )
        view_permission, _ = AccessPermission.objects.get_or_create(
            code="operations.view",
            defaults={
                "module": "Operations",
                "resource": "Store Operations",
                "action": "view",
                "name": "Store Operations - View",
            },
        )
        role = AccessRole.objects.create(name="Operations Viewer", is_active=True)
        role.permissions.add(view_permission)
        self.authorized_staff = User.objects.create_user(
            username="detail-operations-staff",
            password="password",
            is_staff=True,
            role=role,
        )
        self.address = CustomerAddress.objects.create(
            customer=self.customer,
            title="Home",
            address="Customer A address",
            city="Chennai",
            pincode="600001",
        )
        self.other_address = CustomerAddress.objects.create(
            customer=self.other_customer,
            title="Office",
            address="Customer B private address",
            city="Chennai",
            pincode="600002",
        )

    def make_order(self, customer=None, address=None, delivery_status=1):
        owner = customer or self.customer
        delivery_address = address or (self.address if owner == self.customer else self.other_address)
        return CakeOrder.objects.create(
            customer=owner,
            delivery_address=delivery_address,
            cart_id_list=[],
            total_amount=100,
            total_qty=1,
            delivery_status=delivery_status,
        )

    def get_order(self, order_id):
        return self.client.get(f"/order/get/{order_id}/")

    def test_customer_can_view_own_order(self):
        self.client.force_authenticate(self.customer)
        order = self.make_order(delivery_status=3)

        response = self.get_order(order.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["id"], order.id)
        self.assertEqual(response.data["data"]["delivery_status"], 3)
        self.assertEqual(response.data["data"]["customer"]["id"], self.customer.id)
        self.assertEqual(response.data["data"]["cart_details"], [])

    def test_customer_cannot_view_another_customers_order(self):
        self.client.force_authenticate(self.customer)
        other_order = self.make_order(customer=self.other_customer, delivery_status=4)

        response = self.get_order(other_order.id)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["message"], "Order not found.")
        self.assertNotIn("data", response.data)

    def test_order_id_enumeration_does_not_expose_other_customer_orders(self):
        self.client.force_authenticate(self.customer)
        other_orders = [
            self.make_order(customer=self.other_customer, delivery_status=status_value)
            for status_value in (1, 2, 3)
        ]

        for order in other_orders:
            with self.subTest(order_id=order.id):
                response = self.get_order(order.id)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.data["message"], "Order not found.")
                self.assertNotIn("Customer B private address", str(response.data))

    def test_nonexistent_order_returns_clean_not_found(self):
        self.client.force_authenticate(self.customer)

        response = self.get_order(999999)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["message"], "Order not found.")

    def test_unauthorized_staff_user_cannot_view_order(self):
        self.client.force_authenticate(self.staff_without_permission)
        order = self.make_order(customer=self.other_customer)

        response = self.get_order(order.id)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["message"], "Order not found.")

    def test_authorized_staff_user_can_view_order(self):
        self.client.force_authenticate(self.authorized_staff)
        order = self.make_order(customer=self.other_customer, delivery_status=5)

        response = self.get_order(order.id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["id"], order.id)
        self.assertEqual(response.data["data"]["customer"]["id"], self.other_customer.id)
        self.assertEqual(response.data["data"]["delivery_status"], 5)

    def test_unauthenticated_request_is_rejected(self):
        order = self.make_order()

        response = self.get_order(order.id)

        self.assertIn(response.status_code, (401, 403))
