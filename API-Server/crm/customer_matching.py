from customer.models import Customer


def find_existing_customer(phone):
    """
    Return an existing authentication Customer only when the supplied phone
    identifies exactly one record. Ambiguous matches remain deliberately
    unlinked so Lead creation never guesses or creates an account.
    """
    phone = str(phone or "").strip()
    if not phone:
        return None

    matches = list(
        Customer.objects.filter(phone__iexact=phone).order_by("id")[:2]
    )
    return matches[0] if len(matches) == 1 else None
