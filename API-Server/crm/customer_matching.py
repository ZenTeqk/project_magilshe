from customer.models import Customer, CustomerAddress


def _digits(value):
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits


def _split_name(name):
    parts = str(name or "").strip().split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


def find_existing_customer(phone):
    """
    Return an existing authentication Customer only when the supplied phone
    identifies exactly one record. Ambiguous matches remain deliberately
    unlinked so Lead creation never guesses or creates an account.
    """
    phone = _digits(phone)
    if not phone:
        return None

    matches = list(
        Customer.objects.filter(phone__iexact=phone).order_by("id")[:2]
    )
    return matches[0] if len(matches) == 1 else None


def sync_customer_from_crm_details(details, user=None):
    """
    Find or create a Customer from CRM-entered details without inventing new
    fields or overwriting existing customer data blindly.
    """
    customer = details.get("customer")
    phone = _digits(details.get("phone"))
    email = str(details.get("email") or "").strip()
    name = str(details.get("customer_name") or details.get("name") or "").strip()
    if customer:
        pass
    else:
        customer = find_existing_customer(phone)
        if customer is None and phone and Customer.objects.filter(phone__iexact=phone).exists():
            return None
    if not customer and email:
        matches = list(Customer.objects.filter(email__iexact=email, is_staff=False).order_by("id")[:2])
        customer = matches[0] if len(matches) == 1 else None
    if customer:
        updates = {}
        first_name, last_name = _split_name(name)
        if first_name and not customer.first_name:
            updates["first_name"] = first_name
        if last_name and not customer.last_name:
            updates["last_name"] = last_name
        if email and not customer.email:
            updates["email"] = email
        if phone and not customer.phone:
            updates["phone"] = phone
        if updates:
            for field, value in updates.items():
                setattr(customer, field, value)
            customer.save(update_fields=[*updates.keys()])
        _ensure_customer_address(customer, details, user)
        return customer

    if not phone:
        return None
    first_name, last_name = _split_name(name)
    if not first_name:
        return None

    username = phone
    suffix = 1
    while Customer.objects.filter(username=username).exists():
        username = f"customer-{phone}-{suffix}"
        suffix += 1
    customer = Customer(
        username=username,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        is_staff=False,
        is_active=True,
    )
    customer.set_unusable_password()
    customer.save()
    _ensure_customer_address(customer, details, user)
    return customer


def _ensure_customer_address(customer, details, user=None):
    address = str(
        details.get("address")
        or details.get("billing_address")
        or details.get("delivery_address")
        or ""
    ).strip()
    city = str(details.get("city") or "").strip()
    pincode = str(details.get("pincode") or "").strip()
    if not any((address, city, pincode)):
        return
    if customer.customeraddress_set.exists():
        return
    CustomerAddress.objects.create(
        customer=customer,
        title="Primary Address",
        person_name=str(details.get("customer_name") or "").strip() or None,
        phone=_digits(details.get("phone")) or None,
        address=address,
        city=city,
        pincode=pincode,
        is_primary=True,
        created_by=user,
    )
