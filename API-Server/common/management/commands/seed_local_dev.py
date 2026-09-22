"""Local-development-only seed data.

Creates a minimal but realistic dataset (catalog, a customer + address, an
active offer, and one staff user per CRM-relevant role) so the application
can be exercised end-to-end on a developer machine. Refuses to run against
anything that isn't the local sqlite dev database, so it can never touch a
real deployment by accident.
"""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed the LOCAL sqlite dev database with sample catalog/customer/CRM-role data."

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        if db["ENGINE"] != "django.db.backends.sqlite3" or settings.DEBUG is not True:
            raise CommandError(
                "Refusing to run: this command only seeds the local sqlite dev database "
                "(DEBUG=True). Current DB engine: %s, DEBUG=%s" % (db["ENGINE"], settings.DEBUG)
            )

        with transaction.atomic():
            self._seed_catalog()
            self._seed_customer()
            self._seed_crm_roles()

        self.stdout.write(self.style.SUCCESS("Local dev seed data created (or already present)."))

    def _seed_catalog(self):
        from category.models import MainCategory, SubCategory
        from cake.models import Cake, CakePrice, Offer
        from kg.models import Kg
        from unit.models import unit as Unit

        main_cat, _ = MainCategory.objects.get_or_create(
            slug="celebration-cakes",
            defaults={
                "name": "Celebration Cakes", "description": "Cakes for every occasion.",
                "meta_title": "Celebration Cakes", "meta_description": "Celebration Cakes",
                "content": "Celebration Cakes",
            },
        )
        sub_cat, _ = SubCategory.objects.get_or_create(
            slug="chocolate-cakes", main_category=main_cat,
            defaults={
                "name": "Chocolate Cakes", "description": "Rich chocolate cakes.",
                "meta_title": "Chocolate Cakes", "meta_description": "Chocolate Cakes",
                "content": "Chocolate Cakes",
            },
        )
        unit_kg, _ = Unit.objects.get_or_create(name="Kg", defaults={"description": "Kilogram", "is_variant": True})
        kg_half, _ = Kg.objects.get_or_create(kg=Decimal("0.5"), unit=unit_kg, defaults={"description": "Half Kg"})
        kg_one, _ = Kg.objects.get_or_create(kg=Decimal("1.0"), unit=unit_kg, defaults={"description": "One Kg"})

        cake_specs = [
            ("Dark Chocolate Truffle", "Rich dark chocolate truffle cake.", "dark-chocolate-truffle",
             {kg_half: 600, kg_one: 1100}),
            ("Chocolate Forest", "Classic chocolate forest cake.", "chocolate-forest",
             {kg_half: 550, kg_one: 999}),
            ("Red Velvet Delight", "Soft red velvet cake with cream cheese frosting.", "red-velvet-delight",
             {kg_half: 650, kg_one: 1200}),
        ]
        created_cake_prices = []
        for name, description, slug, prices in cake_specs:
            cake, _ = Cake.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name, "description": description, "sub_category": sub_cat, "unit": unit_kg,
                    "tag": [], "seo_url": slug, "seo_text": name, "status": True,
                    "meta_title": name, "meta_description": description, "content": description,
                },
            )
            for kg, price in prices.items():
                cake_price, _ = CakePrice.objects.get_or_create(cake=cake, kg=kg, defaults={"price": price})
                created_cake_prices.append(cake_price)

        # An active 10% offer on the first cake's half-kg price, so pricing/discount
        # behavior can be exercised end-to-end (AUD-001 authoritative pricing).
        if created_cake_prices:
            Offer.objects.get_or_create(
                name="Launch Week 10% Off",
                defaults={
                    "type": 1, "id_list": [created_cake_prices[0].id], "offer_per": Decimal("10.00"),
                    "offer_from": timezone.now() - timedelta(days=1),
                    "offer_to": timezone.now() + timedelta(days=30),
                    "status": True,
                },
            )

    def _seed_customer(self):
        from customer.models import Customer, CustomerAddress

        customer, created = Customer.objects.get_or_create(
            username="9000090000",
            defaults={"first_name": "Local", "last_name": "Tester", "phone": "9000090000",
                      "email": "local.tester@example.invalid", "is_active": True},
        )
        if created:
            customer.set_password("LocalDev@123")
            customer.save(update_fields=["password"])

        CustomerAddress.objects.get_or_create(
            customer=customer, title="Home",
            defaults={
                "person_name": "Local Tester", "phone": "9000090000",
                "address": "12 Test Street, Sample Layout", "city": "Nagercoil",
                "pincode": "629001", "is_primary": True,
            },
        )

    def _seed_crm_roles(self):
        from customer.models import Customer, AccessRole

        local_super, created = Customer.objects.get_or_create(
            username="local-super-admin",
            defaults={"is_staff": True, "is_superuser": True, "email": "local-super-admin@example.invalid"},
        )
        if created:
            local_super.set_password("LocalDev@123")
            local_super.is_staff = True
            local_super.is_superuser = True
            local_super.save()

        role_users = [
            ("local-finance-staff", "Accounts / Finance"),
            ("local-operations-staff", "Operations Staff"),
            ("local-crm-staff", "CRM Staff"),
        ]
        for username, role_name in role_users:
            role = AccessRole.objects.filter(name=role_name).first()
            if not role:
                continue
            user, created = Customer.objects.get_or_create(
                username=username,
                defaults={"is_staff": True, "role": role, "email": f"{username}@example.invalid"},
            )
            if created:
                user.set_password("LocalDev@123")
                user.role = role
                user.is_staff = True
                user.save()
