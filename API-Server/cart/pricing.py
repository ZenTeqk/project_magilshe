from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from cake.models import CakePrice, Offer


def money_to_model_int(value):
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def validate_cart_quantity(raw_quantity):
    try:
        quantity = int(raw_quantity)
    except (TypeError, ValueError):
        raise ValidationError({"qty": "Quantity must be a positive whole number."})
    if quantity <= 0:
        raise ValidationError({"qty": "Quantity must be greater than zero."})
    return quantity


def active_offer_for_cake_price(cake_price):
    now = timezone.now()
    active_offers = Offer.objects.filter(
        status=True,
        offer_from__lte=now,
        offer_to__gte=now,
    ).order_by("id")
    return next(
        (offer for offer in active_offers if cake_price.id in (offer.id_list or [])),
        None,
    )


def get_authoritative_cake_price(cake_price_id):
    try:
        cake_price = (
            CakePrice.objects.select_related("cake", "kg")
            .get(id=int(cake_price_id))
        )
    except (CakePrice.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"cake_price": "Invalid cake price."})
    if not cake_price.cake or cake_price.cake.status is not True:
        raise ValidationError({"cake_price": "Selected cake is not available."})
    if cake_price.price is None or Decimal(cake_price.price) < 0:
        raise ValidationError({"cake_price": "Selected cake price is invalid."})
    return cake_price


def calculate_cart_unit_price(cake_price):
    base_price = Decimal(cake_price.price)
    offer = active_offer_for_cake_price(cake_price)
    if not offer or offer.offer_per in (None, ""):
        return base_price, None
    discount = Decimal(offer.offer_per)
    if discount <= 0:
        return base_price, None
    if discount > 100:
        raise ValidationError({"cake_price": "Configured offer discount is invalid."})
    unit_price = base_price - (base_price * discount / Decimal("100"))
    return unit_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), offer


def calculate_cart_line(cake_price_id, raw_quantity):
    cake_price = get_authoritative_cake_price(cake_price_id)
    quantity = validate_cart_quantity(raw_quantity)
    unit_price, offer = calculate_cart_unit_price(cake_price)
    line_total = (unit_price * Decimal(quantity)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return {
        "cake_price": cake_price,
        "qty": quantity,
        "unit_price": unit_price,
        "line_total": line_total,
        "offer": offer,
    }


def refresh_cart_authoritative_price(cart):
    if not cart.cake_price_id:
        raise ValidationError({"cart_id_list": "Cart contains an invalid cake price."})
    line = calculate_cart_line(cart.cake_price_id, cart.qty)
    cart.price = money_to_model_int(line["unit_price"])
    cart.qty = line["qty"]
    return line
