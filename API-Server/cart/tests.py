import sys
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.conf import settings
from django.test import TestCase
from django.urls import path
from django.utils import timezone
from rest_framework.test import APIClient

from cake.models import Cake, CakePrice, Offer
from cart.models import Cart
from cart.views import CreateCart
from category.models import MainCategory, SubCategory
from customer.models import CustomerAddress
from kg.models import Kg
from occasion.models import Occasion
from order.models import CakeOrder
from order.views import SaveCakeOrder
from unit.models import unit

urlpatterns = [
    path("cart/create/", CreateCart.as_view()),
    path("order/save/", SaveCakeOrder.as_view()),
]
if any(arg == "cart" or arg.startswith("cart.") for arg in sys.argv):
    settings.ROOT_URLCONF = __name__


class CheckoutFinancialIntegrityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.customer = User.objects.create_user(
            username="9000000001",
            password="password",
            phone="9000000001",
            email="one@example.com",
        )
        self.other_customer = User.objects.create_user(
            username="9000000002",
            password="password",
            phone="9000000002",
            email="two@example.com",
        )
        self.client.force_authenticate(self.customer)

        main = MainCategory.objects.create(name="Cakes")
        sub = SubCategory.objects.create(name="Signature", main_category=main)
        sale_unit = unit.objects.create(name="Kg")
        kg = Kg.objects.create(kg="1.00", unit=sale_unit)
        self.cake = Cake.objects.create(name="Truffle", sub_category=sub, unit=sale_unit, status=True)
        self.cake_price = CakePrice.objects.create(cake=self.cake, kg=kg, price=1450)
        self.address = CustomerAddress.objects.create(
            customer=self.customer,
            title="Home",
            address="Customer address",
            city="Chennai",
            pincode="600001",
        )
        self.other_address = CustomerAddress.objects.create(
            customer=self.other_customer,
            title="Home",
            address="Other address",
            city="Chennai",
            pincode="600002",
        )

    def add_cart_payload(self, **overrides):
        payload = {
            "id": 0,
            "cake_price": self.cake_price.id,
            "price": 1,
            "qty": 1,
            "type": "Birthday",
            "date": "2026-12-31",
            "person_name": "Tester",
            "greeting_text": "Happy day",
        }
        payload.update(overrides)
        return payload

    def checkout_payload(self, cart_ids, **overrides):
        payload = {
            "id": 0,
            "cart_id_list": cart_ids,
            "total_amount": 1,
            "total_qty": 1,
            "delivery_date_time": "2026-12-31T10:00:00+05:30",
            "delivery_person_name": "",
            "delivery_person_phone": "",
            "customer_address_id": self.address.id,
            "tracking_link": "",
        }
        payload.update(overrides)
        return payload

    def create_cart(self, customer=None, qty=1, active=True):
        return Cart.objects.create(
            customer=customer or self.customer,
            cake_price=self.cake_price,
            price=1,
            qty=qty,
            greeting_text="Stored",
            occasion=Occasion.objects.create(type="Birthday", date="2026-12-31", person_name="Tester"),
            status=active,
        )

    def test_price_tampering_uses_authoritative_cake_price(self):
        response = self.client.post("/cart/create/", self.add_cart_payload(price=1), format="json")

        self.assertEqual(response.status_code, 200)
        cart = Cart.objects.get(id=response.data["data"]["id"])
        self.assertEqual(cart.price, 1450)

    def test_total_tampering_recalculates_order_total(self):
        cart = self.create_cart(qty=2)

        response = self.client.post(
            "/order/save/",
            self.checkout_payload([cart.id], total_amount=1, total_qty=1),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order = CakeOrder.objects.get(id=response.data["data"]["id"])
        self.assertEqual(order.total_amount, 2900)
        self.assertEqual(order.total_qty, 2)

    def test_cart_ownership_rejects_other_customers_cart_and_preserves_it(self):
        other_cart = self.create_cart(customer=self.other_customer)

        response = self.client.post("/order/save/", self.checkout_payload([other_cart.id]), format="json")

        self.assertEqual(response.status_code, 400)
        other_cart.refresh_from_db()
        self.assertTrue(other_cart.status)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_invalid_cart_rejected_without_consuming_valid_cart(self):
        cart = self.create_cart()

        response = self.client.post("/order/save/", self.checkout_payload([cart.id, 999999]), format="json")

        self.assertEqual(response.status_code, 400)
        cart.refresh_from_db()
        self.assertTrue(cart.status)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_inactive_cart_rejected(self):
        cart = self.create_cart(active=False)

        response = self.client.post("/order/save/", self.checkout_payload([cart.id]), format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_invalid_quantity_rejected(self):
        for qty in (0, -1):
            with self.subTest(qty=qty):
                response = self.client.post("/cart/create/", self.add_cart_payload(qty=qty), format="json")
                self.assertEqual(response.status_code, 400)

    def test_partial_failure_does_not_create_order_or_consume_valid_cart(self):
        valid_cart = self.create_cart()
        inactive_cart = self.create_cart(active=False)

        response = self.client.post(
            "/order/save/",
            self.checkout_payload([valid_cart.id, inactive_cart.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        valid_cart.refresh_from_db()
        self.assertTrue(valid_cart.status)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_successful_checkout_consumes_carts_once(self):
        first = self.create_cart(qty=1)
        second = self.create_cart(qty=2)

        response = self.client.post("/order/save/", self.checkout_payload([first.id, second.id]), format="json")

        self.assertEqual(response.status_code, 200)
        order = CakeOrder.objects.get(id=response.data["data"]["id"])
        self.assertEqual(order.total_amount, 4350)
        self.assertEqual(order.total_qty, 3)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.status)
        self.assertFalse(second.status)

        second_response = self.client.post("/order/save/", self.checkout_payload([first.id]), format="json")
        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(CakeOrder.objects.count(), 1)

    def test_address_ownership_rejected_without_consuming_cart(self):
        cart = self.create_cart()

        response = self.client.post(
            "/order/save/",
            self.checkout_payload([cart.id], customer_address_id=self.other_address.id),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        cart.refresh_from_db()
        self.assertTrue(cart.status)
        self.assertEqual(CakeOrder.objects.count(), 0)

    def test_expired_and_inactive_offers_do_not_affect_authoritative_price(self):
        Offer.objects.create(
            name="Expired",
            type=3,
            id_list=[self.cake_price.id],
            offer_per=90,
            offer_from=timezone.now() - timedelta(days=10),
            offer_to=timezone.now() - timedelta(days=1),
            status=True,
        )
        Offer.objects.create(
            name="Inactive",
            type=3,
            id_list=[self.cake_price.id],
            offer_per=90,
            offer_from=timezone.now() - timedelta(days=1),
            offer_to=timezone.now() + timedelta(days=1),
            status=False,
        )

        response = self.client.post("/cart/create/", self.add_cart_payload(price=1), format="json")

        self.assertEqual(response.status_code, 200)
        cart = Cart.objects.get(id=response.data["data"]["id"])
        self.assertEqual(cart.price, 1450)
