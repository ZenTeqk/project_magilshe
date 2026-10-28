"""Quotation, invoice and payment-receipt PDFs, built server-side.

Ports of quotation-pdf.ts, invoice-pdf.ts and receipt-pdf.ts (the "v2"
templates). Each reads the record through the same serializer the Admin
fetches, so the numbers match the PDF staff download from the browser.
"""

from decimal import Decimal

from .brand import (
    BLUSH, BOTTOM, GREEN, INK, LEFT, MUTED, RIGHT, RULE, BrandPDF, address_or_fallback, display_date, display_unit,
    draw_bakery_message, draw_document_header, draw_info_block, draw_section_label, draw_table_header,
    draw_table_row_background, draw_totals_panel, finish, format_time_of_day, has_value,
    measure_info_block_height, money, new_page, number, totals_height,
)

GRAM_ALIASES = {"g", "gm", "gms", "gram", "grams"}
ITEM_COLUMNS = [
    {"text": "#", "x": 24, "align": "center"}, {"text": "PRODUCT / DESCRIPTION", "x": 31}, {"text": "FLAVOUR", "x": 86},
    {"text": "QTY", "x": 118, "align": "center"}, {"text": "UNIT", "x": 132, "align": "center"},
]


def _company():
    from configuration.models import Configuration
    from configuration.serializers import configuration_serializer
    config = Configuration.objects.first()
    return configuration_serializer(config) if config else {}


def _pricing_quantity(quantity, unit_type):
    qty = number(quantity)
    return qty / 1000 if str(unit_type or "").strip().lower() in GRAM_ALIASES else qty


def _item_columns(show_rate):
    return ITEM_COLUMNS + ([{"text": "RATE", "x": 158, "align": "right"}] if show_rate else []) + [
        {"text": "GST", "x": 169, "align": "center"}, {"text": "AMOUNT", "x": 190, "align": "right"},
    ]


def _gst_text(value):
    gst = number(value)
    return f"{gst.normalize():f}%" if gst else "0%"


def _draw_item_rows(pdf, y, items, columns, show_rate, product_width, restart):
    for index, item in enumerate(items):
        pdf.font("helvetica", "", 7.6)
        product = pdf.split(" - ".join(str(p) for p in (item.get("item_name"), item.get("description")) if p), product_width)[:4]
        flavour = pdf.split(str(item.get("flavour") or "-"), 25)[:3]
        row_height = max(11.5, max(len(product), len(flavour)) * 3.9 + 4.2)
        if y + row_height > BOTTOM:
            y = draw_table_header(pdf, restart(), columns)
        rate = number(item.get("rate"))
        line_amount = number(item.get("amount") or item.get("subtotal")) or _pricing_quantity(item.get("quantity"), item.get("unit_type")) * rate
        draw_table_row_background(pdf, y, row_height, index % 2 == 1)
        pdf.font("helvetica", "", 7.6, INK)
        pdf.write_text(str(index + 1), 24, y + 6, "center")
        pdf.write_text(product, 31, y + 6)
        pdf.write_text(flavour, 86, y + 6)
        quantity = number(item.get("quantity"))
        pdf.write_text(f"{quantity.normalize():f}" if quantity else "0", 118, y + 6, "center")
        pdf.write_text(display_unit(item.get("unit_type")), 132, y + 6, "center")
        if show_rate:
            pdf.write_text(money(rate) if has_value(item.get("rate")) else "-", 158, y + 6, "right")
        pdf.write_text(_gst_text(item.get("gst_percentage")), 169, y + 6, "center")
        pdf.font("helvetica", "B", 7.6)
        pdf.write_text(money(line_amount), 190, y + 6, "right")
        y += row_height
    return y


def build_quotation_pdf(quotation):
    from crm.serializers import QuotationSerializer
    q = QuotationSerializer(quotation).data
    pdf = BrandPDF(_company())
    header = ("QUOTATION", "No.", q.get("quotation_no"), q.get("created_on"))
    new_page(pdf)
    y = draw_document_header(pdf, *header)

    delivery = q.get("delivery_date")
    detail_rows = [
        ("Date", display_date(q.get("created_on"))),
        ("Valid until", display_date(q.get("valid_until")) if q.get("valid_until") else None),
        ("Status", q.get("status")), ("Payment", q.get("payment_method") or "Not recorded"),
        ("Occasion", q.get("occasion")),
        ("Event", display_date(q.get("event_date")) if q.get("event_date") else None),
        ("Delivery", f"{display_date(delivery)}{'  ' + format_time_of_day(q['delivery_time']) if q.get('delivery_time') else ''}" if delivery else None),
        ("Method", q.get("delivery_type")),
    ]
    customer_rows = [
        ("Name", q.get("customer_name")), ("Phone", q.get("phone")), ("Email", q.get("email")),
        ("Address", address_or_fallback(q.get("billing_address"), q.get("address"))),
        ("Delivery", q.get("address") if q.get("address") and q.get("address") != q.get("billing_address") else None),
    ]
    card_height = max(measure_info_block_height(pdf, detail_rows, 84), measure_info_block_height(pdf, customer_rows, 84))
    details_bottom = draw_info_block(pdf, "Quote details", detail_rows, LEFT, y, 84, card_height)
    customer_bottom = draw_info_block(pdf, "Customer details", customer_rows, 110, y, 84, card_height)
    y = max(details_bottom, customer_bottom) + 4

    item_rows = q.get("items") or []
    items = item_rows or [{
        "item_name": q.get("cake_type") or "Custom cake", "description": None, "flavour": q.get("flavour"),
        "quantity": q.get("quantity") or 0, "unit_type": "kg", "rate": q.get("rate"),
        "gst_percentage": q.get("gst_percentage"), "amount": q.get("subtotal"),
    }]
    show_rate = any(has_value(i.get("rate")) for i in items) if item_rows else has_value(q.get("rate"))
    columns = _item_columns(show_rate)

    def restart():
        new_page(pdf)
        return draw_document_header(pdf, *header, continuation=True)

    y = draw_table_header(pdf, y, columns)
    y = _draw_item_rows(pdf, y, items, columns, show_rate, 54, restart)

    def line_amount(item):
        return number(item.get("amount") or item.get("subtotal")) or _pricing_quantity(item.get("quantity"), item.get("unit_type")) * number(item.get("rate"))

    if item_rows:
        subtotal = sum((line_amount(i) for i in items), Decimal("0"))
        gst = sum((line_amount(i) * number(i.get("gst_percentage")) / 100 for i in items), Decimal("0"))
    else:
        subtotal, gst = number(q.get("subtotal")), number(q.get("gst_amount"))
    discount = number(q.get("discount_amount"))
    grand_total = max(Decimal("0"), subtotal + gst - discount)
    advance = number(q.get("advance_amount"))
    balance = max(Decimal("0"), grand_total - advance)

    if y + 47 + (5.6 if discount else 0) > BOTTOM:
        y = restart()
    else:
        y += 7

    notes = [(label, q.get(key)) for label, key in (
        ("Payment terms", "payment_terms"), ("Notes", "notes"), ("Special instructions", "special_instructions"),
    ) if q.get(key)]
    if notes:
        draw_section_label(pdf, "Terms & notes", LEFT, y + 2)
        note_y = y + 9
        for label, value in notes:
            pdf.font("helvetica", "B", 7, MUTED)
            pdf.write_text(label, LEFT, note_y)
            pdf.font("helvetica", "", 7, INK)
            lines = pdf.split(str(value), 78)[:4]
            pdf.write_text(lines, LEFT, note_y + 4)
            note_y += len(lines) * 3.8 + 7
    else:
        draw_bakery_message(pdf, y)

    draw_totals_panel(pdf, y, [
        {"label": "Subtotal", "value": subtotal},
        {"label": "Discount", "value": -discount if discount else 0, "kind": "discount"},
        {"label": "CGST", "value": gst / 2},
        {"label": "SGST", "value": gst / 2},
        {"label": "Grand Total", "value": grand_total, "kind": "grand"},
        {"label": "Advance Received", "value": advance, "kind": "advance"},
        {"label": "Balance Due", "value": balance, "kind": "balance"},
    ])
    return finish(pdf)


def build_invoice_pdf(invoice):
    from crm.serializers import CRMInvoiceSerializer
    inv = CRMInvoiceSerializer(invoice).data
    pdf = BrandPDF(_company())
    title = "TAX INVOICE" if pdf.company.get("gst_number") else "INVOICE"
    header = (title, "Invoice No", inv.get("invoice_no"), inv.get("generated_on"))
    new_page(pdf)
    y = draw_document_header(pdf, *header)
    payments = inv.get("payments") or []

    detail_rows = [
        ("Invoice No", inv.get("invoice_no")), ("Date", display_date(inv.get("generated_on"))),
        ("Order", inv.get("order_no")), ("Quotation", inv.get("quotation_no")), ("Status", inv.get("status")),
        ("Payment", (payments[0].get("payment_method") if payments else None) or "Not recorded"),
    ]
    customer_rows = [
        ("Name", inv.get("customer_name")), ("Phone", inv.get("phone")), ("Email", inv.get("email")),
        ("Address", address_or_fallback(inv.get("address"), inv.get("delivery_address"))),
    ]
    card_height = max(measure_info_block_height(pdf, detail_rows, 84), measure_info_block_height(pdf, customer_rows, 84))
    order_bottom = draw_info_block(pdf, "Invoice details", detail_rows, LEFT, y, 84, card_height)
    customer_bottom = draw_info_block(pdf, "Customer details", customer_rows, 110, y, 84, card_height)
    y = max(order_bottom, customer_bottom) + 5

    items = inv.get("items") or []
    show_rate = any(has_value(i.get("rate")) for i in items)
    columns = _item_columns(show_rate)

    def restart():
        new_page(pdf)
        return draw_document_header(pdf, *header, continuation=True)

    y = draw_table_header(pdf, y, columns)
    y = _draw_item_rows(pdf, y, items, columns, show_rate, 55, restart)

    gst = number(inv.get("gst_amount"))
    discount = number(inv.get("discount_amount"))
    rows = [
        {"label": "Subtotal", "value": inv.get("subtotal")},
        {"label": "Discount", "value": -discount if discount else 0, "kind": "discount"},
        *([{"label": "CGST", "value": gst / 2}, {"label": "SGST", "value": gst / 2}] if gst else []),
        {"label": "Grand Total", "value": inv.get("total_amount"), "kind": "grand"},
        {"label": "Advance Received", "value": inv.get("amount_paid"), "kind": "advance"},
        {"label": "Balance Due", "value": inv.get("balance_amount"), "kind": "balance"},
    ]
    required = max(totals_height(rows), 17 + len(payments) * 5 if payments else 38)
    if y + required > BOTTOM:
        y = restart()
    else:
        y += 7

    if payments:
        draw_section_label(pdf, "Payment information", LEFT, y + 2)
        payment_y = y + 9
        for payment in payments:
            pdf.font("helvetica", "", 7.3, INK)
            pdf.write_text(f"{display_date(payment.get('payment_date'))}  |  {payment.get('payment_method') or 'Payment'}", LEFT, payment_y)
            pdf.font("helvetica", "B", 7.3)
            pdf.write_text(money(payment.get("amount")), 78, payment_y, "right")
            payment_y += 5
    else:
        draw_bakery_message(pdf, y)

    draw_totals_panel(pdf, y, rows)
    return finish(pdf)


# ---------------------------------------------------------------------------
# Payment receipt
# ---------------------------------------------------------------------------

_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
         "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _below_thousand(n):
    hundred, rest = divmod(n, 100)
    rest_words = _ONES[rest] if rest < 20 else f"{_TENS[rest // 10]}{' ' + _ONES[rest % 10] if rest % 10 else ''}"
    return " ".join(filter(None, [f"{_ONES[hundred]} Hundred" if hundred else "", rest_words]))


def amount_in_words(value):
    """Indian numbering, as amountInWords() in receipt-pdf.ts."""
    value = abs(number(value))
    rupees = int(value)
    paise = int(((value - rupees) * 100).quantize(Decimal("1")))
    parts, remaining = [], rupees
    for size, label in ((10000000, "Crore"), (100000, "Lakh"), (1000, "Thousand")):
        count, remaining = divmod(remaining, size)
        if count:
            words = amount_in_words(count)[len("Rupees "):-len(" Only")] if count >= 1000 else _below_thousand(count)
            parts.append(f"{words} {label}")
    if remaining:
        parts.append(_below_thousand(remaining))
    return f"Rupees {' '.join(parts) or 'Zero'}{' and ' + _below_thousand(paise) + ' Paise' if paise else ''} Only"


def receipt_number(quotation, payment):
    return f"{quotation.quotation_no}/R{payment.pk}"


def receipt_filename(quotation, payment):
    return f"Receipt-{receipt_number(quotation, payment).replace('/', '-')}.pdf"


def _amount_banner(pdf, y, amount):
    pdf.fill(BLUSH)
    pdf.draw(RULE, 0.35)
    pdf.rect(LEFT, y, RIGHT - LEFT, 22, "DF", round_corners=True, corner_radius=2.5)
    pdf.font("helvetica", "B", 7.5, MUTED)
    pdf.write_text("AMOUNT RECEIVED", LEFT + 6, y + 7)
    pdf.font("helvetica", "B", 17, GREEN)
    pdf.write_text(money(amount), LEFT + 6, y + 15.5)
    pdf.font("helvetica", "I", 7.4, INK)
    pdf.write_text(pdf.split(amount_in_words(amount), 118)[:2], LEFT + 70, y + 9)
    pdf.draw(GREEN, 0.8)
    pdf.rect(RIGHT - 30, y + 5, 24, 12, "D", round_corners=True, corner_radius=2)
    pdf.font("helvetica", "B", 12, GREEN)
    pdf.write_text("PAID", RIGHT - 18, y + 13.2, "center")
    return y + 22


def build_receipt_pdf(quotation, payment):
    """One payment's receipt; totals count only payments up to this one."""
    from crm.serializers import CRMOrderSerializer, QuotationPaymentSerializer, QuotationSerializer
    q = QuotationSerializer(quotation).data
    p = QuotationPaymentSerializer(payment).data
    order_obj = _order_for(quotation)
    order = CRMOrderSerializer(order_obj).data if order_obj else None
    pdf = BrandPDF(_company())
    receipt_no = receipt_number(quotation, payment)
    header = ("PAYMENT RECEIPT", "Receipt No.", receipt_no, p.get("payment_date"))
    new_page(pdf)
    y = draw_document_header(pdf, *header)

    amount = number(p.get("amount"))
    total = number((order or {}).get("total_amount") if order else q.get("total_amount"))
    payments = sorted(q.get("payments") or [], key=lambda i: (str(i.get("payment_date")), str(i.get("created_on")), int(i.get("id"))))
    recorded = sum((number(i.get("amount")) for i in payments), Decimal("0"))
    current_paid = number(order.get("advance_paid") if order else q.get("advance_amount"))
    untracked = max(Decimal("0"), current_paid - recorded)
    index = next((n for n, i in enumerate(payments) if str(i.get("id")) == str(p.get("id"))), 0)
    paid_before = untracked + sum((number(i.get("amount")) for i in payments[:index]), Decimal("0"))
    paid_to_date = paid_before + amount
    balance = max(Decimal("0"), total - paid_to_date)

    y = _amount_banner(pdf, y, amount) + 5
    payment_rows = [
        ("Receipt No.", receipt_no), ("Payment date", display_date(p.get("payment_date"))),
        ("Payment mode", p.get("payment_method")), ("Reference", p.get("transaction_reference")),
        ("Received by", p.get("collected_by_name")), ("Remarks", p.get("customer_remarks")),
    ]
    customer_rows = [
        ("Name", (order or {}).get("customer_name") or q.get("customer_name")),
        ("Phone", (order or {}).get("phone") or q.get("phone")),
        ("Email", q.get("email")),
        ("Address", address_or_fallback(q.get("billing_address"), q.get("address"), (order or {}).get("delivery_address"))),
    ]
    card_width = 92
    card_height = max(measure_info_block_height(pdf, payment_rows, card_width), measure_info_block_height(pdf, customer_rows, card_width))
    draw_info_block(pdf, "Payment details", payment_rows, LEFT, y, card_width, card_height)
    draw_info_block(pdf, "Customer details", customer_rows, RIGHT - card_width, y, card_width, card_height)
    y += card_height + 5

    items = (order or {}).get("items") or q.get("items") or []
    if items:
        y = draw_table_header(pdf, y, [
            {"text": "#", "x": 16, "align": "center"}, {"text": "ITEM", "x": 23}, {"text": "FLAVOUR", "x": 105},
            {"text": "QTY", "x": 150, "align": "center"}, {"text": "AMOUNT", "x": 196, "align": "right"},
        ])
        shown = items[:6]
        for row, item in enumerate(shown):
            pdf.font("helvetica", "", 7.6, INK)
            name = pdf.split(str(item.get("item_name") or "Item"), 78)[:2]
            height = max(8, len(name) * 3.9 + 3.6)
            draw_table_row_background(pdf, y, height, row % 2 == 1)
            pdf.font("helvetica", "", 7.6, INK)
            pdf.write_text(str(row + 1), 16, y + 5.2, "center")
            pdf.write_text(name, 23, y + 5.2)
            pdf.write_text(pdf.split(str(item.get("flavour") or "-"), 40)[:1], 105, y + 5.2)
            quantity = number(item.get("quantity"))
            pdf.write_text(f"{f'{quantity.normalize():f}' if quantity else '0'} {display_unit(item.get('unit_type'))}", 150, y + 5.2, "center")
            pdf.font("helvetica", "B", 7.6)
            pdf.write_text(money(item.get("amount")), 196, y + 5.2, "right")
            y += height
        if len(items) > len(shown):
            pdf.font("helvetica", "I", 7.2, MUTED)
            pdf.write_text(f"+ {len(items) - len(shown)} more item(s)", 23, y + 4.5)
            y += 6
        y += 5

    delivery = (order or {}).get("delivery_date") or q.get("delivery_date")
    delivery_time = (order or {}).get("delivery_time") or q.get("delivery_time")
    event_date = (order or {}).get("event_date") or q.get("event_date")
    order_rows = [
        ("Order No.", (order or {}).get("order_no")), ("Order status", (order or {}).get("status")),
        ("Quotation No.", q.get("quotation_no")), ("Occasion", q.get("occasion")),
        ("Event date", display_date(event_date) if event_date else None),
        ("Delivery", f"{display_date(delivery)}{'  ' + format_time_of_day(delivery_time) if delivery_time else ''}" if delivery else None),
        ("Method", (order or {}).get("delivery_method") or q.get("delivery_type")),
    ]
    order_height = measure_info_block_height(pdf, order_rows, card_width)
    if y + max(order_height, 40) > BOTTOM:
        new_page(pdf)
        y = draw_document_header(pdf, *header, continuation=True)
    order_bottom = draw_info_block(pdf, "Order details" if order else "Booking details", order_rows, LEFT, y, card_width, order_height)
    totals_bottom = draw_totals_panel(pdf, y, [
        {"label": "Order total" if order else "Quotation total", "value": total, "kind": "muted"},
        {"label": "Paid earlier", "value": paid_before},
        {"label": "This payment", "value": amount, "kind": "advance"},
        {"label": "Total paid", "value": paid_to_date, "kind": "muted"},
        {"label": "Balance due", "value": balance, "kind": "balance"},
    ])
    y = max(order_bottom, totals_bottom) + 4
    if y + 8 <= BOTTOM:
        pdf.font("helvetica", "", 7, MUTED)
        pdf.write_text(
            f"Balance of {money(balance)} is payable on or before delivery." if balance > 0
            else "Thank you - this order is fully paid.", LEFT + 1, y + 2,
        )
        pdf.write_text("This is a computer-generated receipt and does not require a signature.", LEFT + 1, y + 6)
        if y + 36 <= BOTTOM:
            draw_bakery_message(pdf, y + 4)
    return finish(pdf)


def _order_for(quotation):
    from crm.models import CRMOrder
    return CRMOrder.objects.filter(quotation=quotation).first()
