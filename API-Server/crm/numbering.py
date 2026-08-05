from django.db import transaction
from django.utils import timezone


PREFIXES = {
    "lead": "L",
    "quotation": "Q",
    "order": "O",
    "invoice": "I",
    "delivery": "D",
    "customer": "C",
}


def next_crm_number(document_type):
    """Return an atomic, daily-reset CRM number such as L/26/07/24/00001."""
    from .models import DailySequence

    prefix = PREFIXES[document_type]
    today = timezone.localdate()
    with transaction.atomic():
        sequence, _ = DailySequence.objects.select_for_update().get_or_create(
            document_type=document_type,
            sequence_date=today,
        )
        sequence.last_number += 1
        sequence.save(update_fields=["last_number"])
        return f"{prefix}/{today:%y/%m/%d}/{sequence.last_number:05d}"
