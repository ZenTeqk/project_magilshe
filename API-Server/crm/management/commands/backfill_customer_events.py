from django.core.management.base import BaseCommand
from django.db import transaction

from crm.models import CRMOrder, CustomerRecurringEvent, Lead, Quotation
from crm.recurring_events import sync_recurring_event


class Command(BaseCommand):
    help = (
        "Create/link customer events (Customer 360 -> Events tab) for existing "
        "leads, quotations and orders that have a customer and an event date."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Report how many events would be created without saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        before = CustomerRecurringEvent.objects.count()
        with transaction.atomic():
            sources = (
                ("leads", Lead.objects.filter(customer__isnull=False, event_date__isnull=False)),
                ("quotations", Quotation.objects.select_related("lead").filter(customer__isnull=False)),
                ("orders", CRMOrder.objects.select_related("quotation__lead").filter(
                    customer__isnull=False, event_date__isnull=False,
                )),
            )
            for label, queryset in sources:
                synced = sum(1 for source in queryset.iterator() if sync_recurring_event(source))
                self.stdout.write(f"{label}: {synced} synced")
            created = CustomerRecurringEvent.objects.count() - before
            if dry_run:
                transaction.set_rollback(True)
        verb = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(f"{verb} {created} customer event(s)."))
