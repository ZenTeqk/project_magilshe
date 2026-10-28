"""Server-side port of Admin/src/features/crm/lib/pdf-brand.ts.

The Admin builds quotation/invoice/receipt PDFs in the browser with jsPDF;
WhatsApp auto-sends run on the server, so they need the same documents built
here. Coordinates, sizes and colours are copied from the TypeScript so both
produce the same page -- change them together.
"""

import pathlib
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from fpdf import FPDF

LEFT, RIGHT, BOTTOM = 10, 200, 267
WINE, MAGENTA, ROSE = (143, 13, 50), (190, 28, 75), (225, 72, 113)
BLUSH, PALE, INK = (253, 241, 246), (255, 250, 252), (36, 32, 33)
MUTED, RULE = (103, 93, 96), (236, 180, 198)
GREEN, ORANGE = (31, 143, 69), (188, 103, 18)

LOGO_PATH = pathlib.Path(__file__).resolve().parent / "assets" / "logo.png"

DEFAULT_COMPANY = {
    "address": "No 1/2, Janakiraman st, 83rd St, Muthurangam Block, West Jafferkhanpet, Chennai,Tamil Nadu 600083.",
    "mobile": "9940427774",
    "website": "https://magilshe.com/home",
}

# The built-in PDF fonts only cover Latin-1, same as jsPDF's.
_REPLACEMENTS = {"—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"',
                 "…": "...", "₹": "INR ", " ": " "}


def clean(value):
    text = "".join(_REPLACEMENTS.get(ch, ch) for ch in str(value))
    return text.encode("latin-1", "replace").decode("latin-1")


def number(value):
    try:
        return Decimal(str(value)) if value not in (None, "") else Decimal("0")
    except (InvalidOperation, ValueError):
        return Decimal("0")


def has_value(value):
    return value is not None and str(value).strip() != ""


def money(value):
    """en-IN grouping, as Number.toLocaleString("en-IN"): INR 1,25,000.00"""
    amount = number(value).quantize(Decimal("0.01"))
    sign = "-" if amount < 0 else ""
    whole, fraction = f"{abs(amount):.2f}".split(".")
    head, tail = whole[:-3], whole[-3:]
    if head:
        head = ",".join(re.findall(r"\d{1,2}", head[::-1]))[::-1] if len(head) > 2 else head
        whole = f"{head},{tail}"
    return f"INR {sign}{whole}.{fraction}"


def display_date(value):
    if not value:
        return "-"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00")) if "T" in value else date.fromisoformat(value[:10])
        except ValueError:
            return value
    if isinstance(value, datetime):
        value = timezone.localtime(value).date() if timezone.is_aware(value) else value.date()
    return value.strftime("%d %b %Y")


def display_unit(value):
    unit = str(value or "").strip()
    if unit.lower() == "kg":
        return "kg"
    if unit.lower() == "piece":
        return "Piece"
    return unit or "-"


def format_time_of_day(value):
    match = re.match(r"^(\d{1,2}):(\d{2})", str(value or "").strip())
    if not match:
        return str(value or "")
    hours, minutes = int(match.group(1)), match.group(2)
    if hours > 23:
        return str(value)
    return f"{hours % 12 or 12}:{minutes} {'PM' if hours >= 12 else 'AM'}"


def address_or_fallback(*values):
    return next((str(v).strip() for v in values if v and str(v).strip()), "Address not provided")


def safe_text(value, fallback="-"):
    return str(value if value is not None else "").strip() or fallback


class BrandPDF(FPDF):
    """jsPDF-style drawing on top of fpdf2: text at a baseline with an
    optional alignment, and splitTextToSize-style wrapping."""

    def __init__(self, company=None):
        super().__init__(unit="mm", format="A4")
        self.company = company or {}
        self.set_auto_page_break(False)
        self.set_margins(0, 0, 0)
        self.alias_nb_pages()

    def font(self, family, style, size, color=None):
        self.set_font({"helvetica": "helvetica", "times": "times"}[family], style, size)
        if color:
            self.set_text_color(*color)

    def write_text(self, value, x, y, align="left"):
        lines = value if isinstance(value, list) else [value]
        line_height = self.font_size * 1.15
        for i, line in enumerate(lines):
            line = clean(line)
            width = self.get_string_width(line)
            dx = {"left": 0, "center": width / 2, "right": width}[align]
            self.text(x - dx, y + i * line_height, line)

    def split(self, value, width):
        lines = []
        for paragraph in clean(value).replace("\r", "").split("\n"):
            current = ""
            for word in paragraph.split(" "):
                candidate = f"{current} {word}".strip() if current else word
                if self.get_string_width(candidate) <= width or not current:
                    current = candidate
                    while self.get_string_width(current) > width and len(current) > 1:
                        cut = len(current)
                        while cut > 1 and self.get_string_width(current[:cut]) > width:
                            cut -= 1
                        lines.append(current[:cut])
                        current = current[cut:]
                else:
                    lines.append(current)
                    current = word
            lines.append(current)
        return lines or [""]

    def fill(self, color):
        self.set_fill_color(*color)

    def draw(self, color, width=None):
        self.set_draw_color(*color)
        if width is not None:
            self.set_line_width(width)


def _brand_fallback(pdf):
    pdf.font("times", "BI", 31, WINE)
    pdf.write_text(pdf.company.get("name") or "Magilshe", 105, 23, "center")
    _cakes_more(pdf, 36)


def _cake_icon(pdf, x, y):
    cx = x + 23
    pdf.draw(WINE, 0.55)
    pdf.fill((255, 255, 255))
    pdf.rect(x + 6, y + 22, 34, 8.6, "DF", round_corners=True, corner_radius=2.2)
    pdf.fill(BLUSH)
    pdf.rect(x + 10.5, y + 13, 25, 10.5, "DF", round_corners=True, corner_radius=2.4)
    pdf.fill((255, 255, 255))
    pdf.rect(x + 16, y + 5, 14, 9.4, "DF", round_corners=True, corner_radius=2.3)
    pdf.fill(ROSE)
    pdf.circle(cx, y + 1.2, 2.8, "F")
    pdf.draw(ROSE, 0.45)
    pdf.line(cx, y - 1.6, cx + 1.8, y - 7.2)
    pdf.draw(WINE, 0.4)
    pdf.line(x + 8, y + 26, x + 38, y + 26)
    pdf.line(x + 13, y + 18, x + 33, y + 18)
    pdf.fill(ROSE)
    for dot_x in (14.8, 23, 31.2):
        pdf.circle(x + dot_x, y + 16.2, 0.72, "F")
    for heart_x in (12.5, 19.5, 26.5, 33.5):
        pdf.circle(x + heart_x - 0.62, y + 28.8, 0.54, "F")
        pdf.circle(x + heart_x + 0.62, y + 28.8, 0.54, "F")
        pdf.polygon([(x + heart_x - 1.25, y + 29), (x + heart_x + 1.25, y + 29), (x + heart_x, y + 30.6)], style="F")
    pdf.draw(RULE, 0.45)
    pdf.line(x + 7, y + 33.7, x + 39, y + 33.7)


def _cakes_more(pdf, y):
    pdf.draw(ROSE, 0.45)
    pdf.line(54, y - 0.8, 72, y - 0.8)
    pdf.line(138, y - 0.8, 156, y - 0.8)
    pdf.font("helvetica", "B", 10.5, WINE)
    pdf.set_char_spacing(1.2)
    pdf.write_text("CAKES & MORE", 105, y, "center")
    pdf.set_char_spacing(0)


def draw_document_header(pdf, title, number_label, number_value, when, continuation=False):
    company = pdf.company
    pdf.fill((255, 255, 255))
    pdf.rect(0, 0, 210, 297, "F")
    pdf.draw(WINE, 0.35)
    pdf.rect(1.3, 1.3, 207.4, 294.4)
    pdf.fill(WINE)
    pdf.rect(0, 0, 210, 2.4, "F")
    has_logo = LOGO_PATH.is_file()

    if continuation:
        if has_logo:
            pdf.image(str(LOGO_PATH), LEFT, 7, 31, 20)
        pdf.font("times", "BI", 18, WINE)
        pdf.write_text(company.get("name") or "Magilshe", 48, 17)
        pdf.font("helvetica", "B", 7)
        pdf.set_char_spacing(0.8)
        pdf.write_text("CAKES & MORE", 49, 24)
        pdf.set_char_spacing(0)
        pdf.font("helvetica", "B", 13, WINE)
        pdf.write_text(f"{title} CONTINUED", RIGHT, 16, "right")
        pdf.font("helvetica", "", 8, MUTED)
        pdf.write_text(f"{number_label}: {safe_text(number_value)}  |  {display_date(when)}", RIGHT, 23, "right")
        pdf.draw(RULE)
        pdf.line(LEFT, 32, RIGHT, 32)
        return 39

    pdf.fill(PALE)
    pdf.rect(2, 2.5, 206, 66, "F")
    _cake_icon(pdf, LEFT + 1, 14)
    if has_logo:
        pdf.image(str(LOGO_PATH), 77, 4, 56, 35)
        _cakes_more(pdf, 46)
    else:
        _brand_fallback(pdf)

    address = re.sub(r"\s+", " ", safe_text(company.get("company_address"), DEFAULT_COMPANY["address"])).strip()
    contact = "  |  ".join(filter(None, [
        safe_text(company.get("mobile"), DEFAULT_COMPANY["mobile"]),
        safe_text(company.get("website") or company.get("url"), DEFAULT_COMPANY["website"]),
        safe_text(company.get("email"), ""),
    ]))
    pdf.font("helvetica", "", 7.1, INK)
    if address:
        pdf.write_text(pdf.split(address, 154)[:1], 105, 55, "center")
    if contact:
        pdf.write_text(pdf.split(contact, 154)[:1], 105, 61, "center")
    if company.get("gst_number"):
        pdf.font("helvetica", "B", 7.1)
        pdf.write_text(f"GSTIN: {company['gst_number']}", 105, 67, "center")

    pdf.font("times", "BI", 10, INK)
    pdf.write_text("Made with love,", RIGHT - 9, 23, "right")
    pdf.set_text_color(*ROSE)
    pdf.write_text("just for you!", RIGHT - 9, 32, "right")
    pdf.fill(ROSE)
    pdf.circle(RIGHT - 13, 41, 1, "F")

    pdf.font("helvetica", "B", 13, WINE)
    pdf.write_text(title, LEFT + 1, 79)
    pdf.font("helvetica", "", 7.5, MUTED)
    pdf.write_text(f"{number_label}: {safe_text(number_value)}", RIGHT - 2, 75, "right")
    pdf.write_text(f"Date: {display_date(when)}", RIGHT - 2, 80, "right")
    pdf.draw(RULE, 0.3)
    pdf.line(LEFT + 5, 85, RIGHT - 5, 85)
    return 90


def draw_section_label(pdf, text, x, y):
    pdf.font("helvetica", "B", 8, WINE)
    pdf.write_text(text.upper(), x, y)
    pdf.draw(ROSE, 0.45)
    pdf.line(x, y + 2, x + max(28, len(text) * 1.85), y + 2)


def _visible(rows):
    return [(label, value) for label, value in rows if has_value(value)]


def measure_info_block_height(pdf, rows, width):
    pdf.font("helvetica", "", 7.7)
    heights = [max(4.8, min(3, len(pdf.split(str(value), width - 43))) * 3.8) for _, value in _visible(rows)]
    return max(34, 16 + sum(heights))


def draw_info_block(pdf, title, rows, x, y, width, fixed_height=0):
    height = max(measure_info_block_height(pdf, rows, width), fixed_height or 0)
    pdf.fill((255, 255, 255))
    pdf.draw(RULE, 0.35)
    pdf.rect(x, y, width, height, "DF", round_corners=True, corner_radius=2.5)
    draw_section_label(pdf, title, x + 5, y + 8)
    row_y = y + 17
    for label, value in _visible(rows):
        pdf.font("helvetica", "", 7.7)
        lines = pdf.split(str(value), width - 45)[:3]
        pdf.font("helvetica", "B", 7.6, INK)
        pdf.write_text(label, x + 5, row_y)
        pdf.font("helvetica", "", 7.7, INK)
        pdf.write_text(lines, x + 37, row_y)
        row_y += max(4.8, len(lines) * 3.8)
    return y + height


def draw_table_header(pdf, y, columns):
    pdf.fill(WINE)
    pdf.rect(LEFT, y, RIGHT - LEFT, 11, "F")
    pdf.font("helvetica", "B", 7.2, (255, 255, 255))
    for column in columns:
        pdf.write_text(column["text"], column["x"], y + 7.1, column.get("align", "left"))
    return y + 11


def draw_table_row_background(pdf, y, height, alternate):
    if alternate:
        pdf.fill(PALE)
        pdf.rect(LEFT, y, RIGHT - LEFT, height, "F")
    pdf.draw(RULE, 0.25)
    pdf.line(LEFT, y + height, RIGHT, y + height)


def _total_row_height(kind):
    return 11.5 if kind == "grand" else 6.8 if kind == "balance" else 5.6


def totals_height(rows):
    return sum(_total_row_height(row.get("kind")) for row in rows) + 4


def draw_totals_panel(pdf, y, rows):
    x = 104
    width = RIGHT - x
    height = totals_height(rows)
    row_y = y + 5.5
    pdf.fill((255, 255, 255))
    pdf.draw(RULE, 0.35)
    pdf.rect(x, y, width, height, "DF", round_corners=True, corner_radius=2.5)
    colors = {"advance": GREEN, "balance": ORANGE, "discount": ROSE, "grand": WINE}
    for row in rows:
        kind = row.get("kind")
        if kind == "grand":
            pdf.draw(ROSE, 0.35)
            pdf.line(x + 5, row_y - 4.8, x + width - 5, row_y - 4.8)
        size = 11 if kind == "grand" else 8.4 if kind == "balance" else 8
        pdf.font("helvetica", "B" if kind else "", size, colors.get(kind, INK))
        pdf.write_text(row["label"].upper(), x + 5, row_y)
        pdf.write_text(money(row["value"]), RIGHT - 5, row_y, "right")
        row_y += _total_row_height(kind)
    return y + height


def draw_bakery_message(pdf, y):
    pdf.font("times", "BI", 13, INK)
    pdf.write_text("Thank you for", LEFT + 3, y + 10)
    pdf.write_text("choosing", LEFT + 9, y + 17)
    pdf.font("times", "BI", 14, ROSE)
    pdf.write_text("Magilshe!", LEFT + 4, y + 25)


def _page_footer(pdf):
    company = pdf.company
    pdf.draw(RULE, 0.2)
    pdf.line(LEFT, 288, RIGHT, 288)
    pdf.fill(BLUSH)
    pdf.rect(1.5, 289, 207, 5.2, "F")
    pdf.font("helvetica", "", 6.5, WINE)
    contact = "  |  ".join(filter(None, [company.get("website") or company.get("url"), company.get("mobile"), company.get("email")]))
    pdf.write_text(contact or "This is a system generated document. No signature required.", 105, 292.5, "center")
    pdf.write_text(f"Page {pdf.page_no()} of {{nb}}", RIGHT - 2, 292.5, "right")


def new_page(pdf):
    """Adds a page, closing the previous one with its footer (jsPDF's
    drawFooter loops back over pages; fpdf2 can't, so it's done going forward)."""
    if pdf.page_no():
        _page_footer(pdf)
    pdf.add_page()


def finish(pdf):
    """drawFooter() for the last page, then the bytes."""
    pdf.draw(RULE, 0.2)
    pdf.set_dash_pattern(1.3, 1.3)
    pdf.line(LEFT + 4, 268, RIGHT - 4, 268)
    pdf.set_dash_pattern()
    pdf.fill((255, 255, 255))
    pdf.draw(RULE)
    pdf.rect(114, 270, 78, 14, "DF", round_corners=True, corner_radius=2)
    pdf.font("times", "BI", 10, WINE)
    pdf.write_text(pdf.company.get("greeting_text") or "We hope to serve you again!", 153, 276, "center")
    pdf.fill(MAGENTA)
    pdf.rect(132, 279, 42, 3.8, "F")
    pdf.font("helvetica", "B", 7.3, (255, 255, 255))
    pdf.write_text("VISIT AGAIN!", 153, 282)
    _page_footer(pdf)
    return bytes(pdf.output())
