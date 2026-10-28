import re

from django.test import TestCase

from crm.models import Quotation, QuotationItem

from .brand import clean, money
from .documents import amount_in_words, build_quotation_pdf


class PdfHelperTests(TestCase):
    def test_money_uses_indian_grouping(self):
        self.assertEqual(money("2500"), "INR 2,500.00")
        self.assertEqual(money("125000.5"), "INR 1,25,000.50")
        self.assertEqual(money("12345678"), "INR 1,23,45,678.00")
        self.assertEqual(money("-150"), "INR -150.00")
        self.assertEqual(money(None), "INR 0.00")

    def test_amount_in_words_matches_the_receipt_wording(self):
        self.assertEqual(amount_in_words("1500"), "Rupees One Thousand Five Hundred Only")
        self.assertEqual(amount_in_words("125000.50"), "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only")
        self.assertEqual(amount_in_words("0"), "Rupees Zero Only")

    def test_text_outside_the_pdf_font_does_not_crash(self):
        self.assertEqual(clean("Priya — ₹500"), "Priya - INR 500")
        self.assertEqual(clean("பி"), "??")

    def test_long_quotation_continues_on_a_second_page(self):
        quotation = Quotation.objects.create(customer_name="Priya", phone="9876543210", quotation_no="QT-1", quantity=1, rate="100")
        for n in range(30):
            QuotationItem.objects.create(quotation=quotation, item_name=f"Cupcake box {n}", quantity=1, rate="100")
        pdf = build_quotation_pdf(quotation)
        self.assertTrue(pdf.startswith(b"%PDF"))
        # ~11 rows fit under the first page's header, ~18 on each continuation page.
        self.assertEqual(len(re.findall(rb"/Type\s*/Page\b(?!s)", pdf)), 3)
