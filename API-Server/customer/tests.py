from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from crm.models import CRMDelivery, CRMInvoice, CRMOrder, CRMOrderItem, Lead, Quotation
from .models import AccessPermission, AccessRole, Customer
from .rbac import all_permission_codes, effective_permissions, required_permission

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
        access = self.jwt_client(user).get("/customer/rbac/me/")
        self.assertEqual(access.status_code, 200, access.data)
        self.assertTrue(access.data["is_super_admin"])
        self.assertEqual(set(access.data["permissions"]), set(all_permission_codes()))

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

    def test_dashboard_home_requires_crm_dashboard_permission(self):
        # dashboard/home/ previously had no RBAC mapping at all and was
        # reachable by any authenticated user, including plain customers.
        role = AccessRole.objects.create(name="No Dashboard Staff", is_active=True)
        staff = Customer.objects.create_user(username="no-dashboard-staff", password="password", is_staff=True, role=role)
        client = self.jwt_client(staff)
        self.assertEqual(client.get("/dashboard/home/").status_code, 403)

        role.permissions.add(AccessPermission.objects.get(code="crm.dashboard.view"))
        self.assertEqual(client.get("/dashboard/home/").status_code, 200)

        plain_customer = Customer.objects.create_user(username="9000099911", password="password")
        self.assertEqual(self.jwt_client(plain_customer).get("/dashboard/home/").status_code, 403)

    def test_customer_data_permission_can_access_crm_customers(self):
        role = AccessRole.objects.create(name="Customer Data Staff", is_active=True)
        role.permissions.add(AccessPermission.objects.get(code="customers.data.view"))
        user = Customer.objects.create_user(
            username="customer-data-staff", password="password", is_staff=True, role=role
        )
        Customer.objects.create_user(username="9876543210", phone="9876543210")

        response = self.jwt_client(user).get("/crm/customers/")

        self.assertEqual(response.status_code, 200, response.data)

    def test_customer_analytics_permission_alone_cannot_access_customer_records(self):
        role = AccessRole.objects.create(name="Customer Analytics Staff", is_active=True)
        role.permissions.add(AccessPermission.objects.get(code="customers.analytics.view"))
        user = Customer.objects.create_user(
            username="customer-analytics-staff", password="password", is_staff=True, role=role
        )

        client = self.jwt_client(user)

        self.assertEqual(client.get("/crm/customers/").status_code, 403)
        self.assertEqual(client.get("/crm/customers/analytics/").status_code, 200)

    def test_customer_route_permission_mapping_uses_data_domain(self):
        class View:
            action = "list"

        class Request:
            path = "/crm/customers/"
            method = "GET"

        self.assertEqual(required_permission(Request(), View()), "customers.data.view")

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

    def test_archived_user_delete_dependencies_are_returned_for_dialog(self):
        super_admin = Customer.objects.create_superuser(username="archive-user-admin", password="password")
        staff = Customer.objects.create_user(username="archive-linked-staff", password="password", is_staff=True, is_active=False)
        lead = Lead.objects.create(
            customer_name="Linked User Lead", phone="9876543210", cake_type="Cake",
            quantity=1, assigned_to=staff,
        )
        quotation = Quotation.objects.create(
            customer_name="Linked User Quote", phone="9876543211",
            cake_type="Cake", quantity=1, rate=100, created_by=staff,
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer_name="Linked User Order", phone="9876543211",
            total_amount=100, assigned_staff=staff,
        )
        invoice = CRMInvoice.objects.create(
            order=order, customer_name="Linked User Invoice", phone="9876543211",
            subtotal=100, total_amount=100, balance_amount=100, generated_by=staff,
        )
        client = self.jwt_client(super_admin)

        dependencies = client.get(f"/customer/rbac/users/{staff.id}/deletion-dependencies/")
        self.assertEqual(dependencies.status_code, 200, dependencies.data)
        record_types = {record["record_type"] for link in dependencies.data["links"] for record in link["records"]}
        self.assertTrue({"leads", "quotations", "orders", "invoices"}.issubset(record_types))

        blocked = client.delete(f"/customer/rbac/users/{staff.id}/permanent-delete/")
        self.assertEqual(blocked.status_code, 409, blocked.data)
        self.assertTrue(blocked.data["dependencies"]["has_dependencies"])
        self.assertIn(lead.id, [record["id"] for link in blocked.data["dependencies"]["links"] for record in link["records"]])
        self.assertEqual(invoice.generated_by_id, staff.id)

    def test_archived_customer_delete_dependencies_are_returned_for_dialog(self):
        super_admin = Customer.objects.create_superuser(username="archive-customer-admin", password="password")
        customer = Customer.objects.create_user(
            username="9876543212", phone="9876543212", first_name="Linked", is_active=False,
        )
        lead = Lead.objects.create(
            customer=customer, customer_name="Linked Customer Lead", phone="9876543212",
            cake_type="Cake", quantity=1,
        )
        quotation = Quotation.objects.create(
            customer=customer, customer_name="Linked Customer Quote", phone="9876543212",
            cake_type="Cake", quantity=1, rate=100,
        )
        order = CRMOrder.objects.create(
            quotation=quotation, customer=customer, customer_name="Linked Customer Order",
            phone="9876543212", total_amount=100,
        )
        invoice = CRMInvoice.objects.create(
            order=order, customer=customer, customer_name="Linked Customer Invoice",
            phone="9876543212", subtotal=100, total_amount=100, balance_amount=100,
        )
        delivery = CRMDelivery.objects.create(order=order, recipient_name="Linked Customer")
        client = self.jwt_client(super_admin)

        dependencies = client.get(f"/crm/customers/{customer.id}/deletion-dependencies/")
        self.assertEqual(dependencies.status_code, 200, dependencies.data)
        record_types = {record["record_type"] for link in dependencies.data["links"] for record in link["records"]}
        self.assertEqual(record_types, {"leads", "quotations", "orders", "invoices", "deliveries"})

        blocked = client.delete(f"/crm/customers/{customer.id}/permanent-delete/")
        self.assertEqual(blocked.status_code, 409, blocked.data)
        self.assertTrue(blocked.data["dependencies"]["has_dependencies"])
        self.assertIn(delivery.id, [record["id"] for link in blocked.data["dependencies"]["links"] for record in link["records"]])
        self.assertEqual(lead.customer_id, customer.id)


class SaveCustomerAddressTests(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create_user(username="9000012345", password="password")
        self.client = APIClient()
        self.client.force_authenticate(self.customer)

    def valid_payload(self, **overrides):
        payload = {
            "title": "Home", "address": "1 Test Street", "city": "Nagercoil",
            "pincode": "629001", "is_primary": True,
        }
        payload.update(overrides)
        return payload

    def test_create_address_without_id_field_succeeds(self):
        # The real frontend always sends id: 0 for a new address, but the
        # endpoint must not 500 just because a client omits it entirely.
        response = self.client.post("/customer/save-address/", self.valid_payload())
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["message"], "Address Created Successfully")

    def test_create_address_with_explicit_id_zero_succeeds(self):
        response = self.client.post("/customer/save-address/", self.valid_payload(id=0))
        self.assertEqual(response.status_code, 200, response.data)

    def test_update_address_with_id_succeeds(self):
        create = self.client.post("/customer/save-address/", self.valid_payload())
        address_id = create.data["data"]["id"]
        response = self.client.post(
            "/customer/save-address/", self.valid_payload(id=address_id, city="Chennai"),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["message"], "Address Updated Successfully")
        self.assertEqual(response.data["data"]["city"], "Chennai")
