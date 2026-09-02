from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from crm.models import CRMDelivery, CRMInvoice, CRMOrder, CRMOrderItem, Quotation
from .models import AccessPermission, AccessRole, Customer
from .rbac import all_permission_codes, effective_permissions

class SuperAdminAuthorizationTests(TestCase):
    major_read_endpoints = (
        "/customer/rbac/me/", "/crm/leads/crm-dashboard/", "/crm/leads/",
        "/crm/quotations/", "/crm/orders/", "/crm/invoices/",
        "/crm/deliveries/", "/crm/customers/", "/crm/options/",
        "/customer/rbac/users/", "/customer/rbac/roles/",
    )

    def jwt_client(self, user):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}")
        return client

    def assert_major_modules_load(self, user):
        client = self.jwt_client(user)
        for endpoint in self.major_read_endpoints:
            response = client.get(endpoint)
            self.assertEqual(response.status_code, 200, (endpoint, response.data))

    def test_django_superuser_has_every_permission_and_module(self):
        user = Customer.objects.create_superuser(
            username="platform-superuser", password="password"
        )
        self.assertEqual(effective_permissions(user), set(all_permission_codes()))
        self.assert_major_modules_load(user)

    def test_active_super_admin_role_has_every_permission_and_module(self):
        role = AccessRole.objects.create(
            name="Test Super Admin", is_active=True, is_super_admin=True
        )
        user = Customer.objects.create_user(
            username="role-super-admin", password="password", is_staff=True, role=role
        )
        self.assertEqual(effective_permissions(user), set(all_permission_codes()))
        self.assert_major_modules_load(user)
        access = self.jwt_client(user).get("/customer/rbac/me/").data
        self.assertTrue(access["is_super_admin"])

    def test_normal_staff_still_requires_assigned_permissions(self):
        role = AccessRole.objects.create(name="Restricted Staff", is_active=True)
        user = Customer.objects.create_user(
            username="restricted-staff", password="password", is_staff=True, role=role
        )
        client = self.jwt_client(user)
        self.assertEqual(client.get("/crm/deliveries/").status_code, 403)
        permission = AccessPermission.objects.get(code="crm.delivery.view")
        role.permissions.add(permission)
        self.assertEqual(client.get("/crm/deliveries/").status_code, 200)

    def test_super_admin_can_load_a_real_delivery_after_fresh_authentication(self):
        role = AccessRole.objects.create(
            name="Delivery Super Admin", is_active=True, is_super_admin=True
        )
        user = Customer.objects.create_user(
            username="delivery-super-admin", password="password", is_staff=True, role=role
        )
        quotation = Quotation.objects.create(
            customer_name="Delivery Customer", phone="9876543210", quantity=1,
            rate=500, total_amount=500,
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name="Delivery Customer",
            phone="9876543210", total_amount=500,
        )
        CRMOrderItem.objects.create(
            order=order, item_name="Test cake", quantity=1, unit_type="piece",
            rate=500, amount=500,
        )
        CRMInvoice.objects.create(
            order=order, customer_name="Delivery Customer", phone="9876543210",
            subtotal=500, total_amount=500, amount_paid=500, balance_amount=0,
        )
        delivery = CRMDelivery.objects.create(
            order=order, delivery_type="Customer Pickup", created_by=user,
        )

        # A newly issued JWT represents a fresh login/restored browser session.
        client = self.jwt_client(user)
        for endpoint in ("/crm/orders/", "/crm/invoices/"):
            linked_response = client.get(endpoint)
            self.assertEqual(linked_response.status_code, 200, (endpoint, linked_response.data))
            linked_rows = (
                linked_response.data.get("results", linked_response.data)
                if isinstance(linked_response.data, dict) else linked_response.data
            )
            self.assertEqual(len(linked_rows), 1)

        response = client.get("/crm/deliveries/")
        self.assertEqual(response.status_code, 200, response.data)
        rows = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["delivery_no"], delivery.delivery_no)
        self.assertEqual(rows[0]["order_no"], order.order_no)
