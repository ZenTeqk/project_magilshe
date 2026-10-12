"""Daily occasion-reminder run, scheduled by cron for 10:00 AM IST.

Does nothing unless occasion reminders are turned on in WhatsApp Settings.
In review mode it only reports how many are waiting -- staff send those from
the Occasion Reminders page. In automatic mode it sends them.
"""

from django.core.management.base import BaseCommand

from whatsapp.models import OCCASION_MODE_AUTOMATIC, WhatsAppSettings
from whatsapp.occasion_reminders import due_reminders, send_due_reminders
from whatsapp.services import WhatsAppError


class Command(BaseCommand):
    help = "Send today's birthday/anniversary WhatsApp reminders (automatic mode only)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List what is due without sending.")

    def handle(self, *args, dry_run=False, **options):
        settings_row = WhatsAppSettings.load()
        if not settings_row.occasion_reminders_enabled:
            self.stdout.write("Occasion reminders are turned off.")
            return
        due = due_reminders()
        if dry_run or settings_row.occasion_reminder_mode != OCCASION_MODE_AUTOMATIC:
            self.stdout.write(f"{len(due)} occasion reminder(s) due; not sending (review mode or dry run).")
            for row in due:
                self.stdout.write(f"  {row['occasion_date']} {row['occasion']}: {row['customer_name']} {row['blocked_reason']}")
            return
        try:
            counts = send_due_reminders()
        except WhatsAppError as exc:
            self.stderr.write(str(exc))
            return
        self.stdout.write(f"Occasion reminders: {counts['sent']} sent, {counts['failed']} failed, {counts['skipped']} skipped.")
