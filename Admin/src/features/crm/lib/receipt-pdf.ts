import { jsPDF } from "jspdf";
import type { CrmOrder } from "@/features/crm/orders-hooks";
import type { CompanyConfig, Quotation, QuotationPayment } from "@/features/crm/quotations-hooks";
import { formatTimeOfDay } from "@/lib/format-time";
import { addressOrFallback } from "./address-fallback";
import {
  PDF,
  displayDate,
  displayUnit,
  drawBakeryMessage,
  drawDocumentHeader,
  drawFooter,
  drawInfoBlock,
  drawTableHeader,
  drawTableRowBackground,
  drawTotalsPanel,
  loadBrandLogo,
  measureInfoBlockHeight,
  money,
} from "./pdf-brand";

const MAX_ITEM_ROWS = 6;

/** Stable, human-readable receipt number derived from the quotation and payment (no new sequence needed). */
export function paymentReceiptNo(
  quotation: Pick<Quotation, "quotation_no">,
  payment: Pick<QuotationPayment, "id">,
) {
  return `${quotation.quotation_no}/R${payment.id}`;
}

export function paymentReceiptFileName(
  quotation: Pick<Quotation, "quotation_no">,
  payment: Pick<QuotationPayment, "id">,
) {
  return `Receipt-${paymentReceiptNo(quotation, payment).replaceAll("/", "-")}.pdf`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const restWords =
    rest < 20
      ? ONES[rest]
      : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` ${ONES[rest % 10]}` : ""}`;
  return [hundred ? `${ONES[hundred]} Hundred` : "", restWords].filter(Boolean).join(" ");
}

/** Indian numbering (lakh / crore), e.g. 125000.5 -> "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only". */
export function amountInWords(value: number) {
  const rupees = Math.floor(Math.abs(value));
  const paise = Math.round((Math.abs(value) - rupees) * 100);
  const parts: string[] = [];
  let remaining = rupees;
  for (const [size, label] of [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ] as const) {
    const count = Math.floor(remaining / size);
    if (count)
      parts.push(
        `${count >= 1000 ? amountInWords(count).replace(/^Rupees | Only$/g, "") : belowThousand(count)} ${label}`,
      );
    remaining %= size;
  }
  if (remaining) parts.push(belowThousand(remaining));
  const words = parts.join(" ") || "Zero";
  return `Rupees ${words}${paise ? ` and ${belowThousand(paise)} Paise` : ""} Only`;
}

const byPaymentOrder = (a: QuotationPayment, b: QuotationPayment) =>
  a.payment_date.localeCompare(b.payment_date) ||
  a.created_on.localeCompare(b.created_on) ||
  Number(a.id) - Number(b.id);

function drawAmountBanner(doc: jsPDF, y: number, amount: number) {
  const height = 22;
  doc.setFillColor(...PDF.blush);
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.35);
  doc.roundedRect(PDF.left, y, PDF.right - PDF.left, height, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF.muted);
  doc.text("AMOUNT RECEIVED", PDF.left + 6, y + 7);
  doc.setFontSize(17);
  doc.setTextColor(...PDF.green);
  doc.text(money(amount), PDF.left + 6, y + 15.5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.4);
  doc.setTextColor(...PDF.ink);
  doc.text(doc.splitTextToSize(amountInWords(amount), 118).slice(0, 2), PDF.left + 70, y + 9);
  // "PAID" stamp
  doc.setDrawColor(...PDF.green);
  doc.setLineWidth(0.8);
  doc.roundedRect(PDF.right - 30, y + 5, 24, 12, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PDF.green);
  doc.text("PAID", PDF.right - 18, y + 13.2, { align: "center" });
  return y + height;
}

/**
 * Customer-facing receipt for one recorded payment (advance or part payment).
 * Built entirely from data the quotation/order pages already load, so it needs
 * no backend change. Totals only count payments up to and including this one,
 * so a receipt for an older payment always shows the balance as it was then.
 */
export async function buildPaymentReceiptPdf({
  quotation,
  payment,
  order,
  company,
  brandLogo,
}: {
  quotation: Quotation;
  payment: QuotationPayment;
  order?: CrmOrder | null | undefined;
  company?: CompanyConfig | undefined;
  brandLogo?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? (await loadBrandLogo());
  const receiptNo = paymentReceiptNo(quotation, payment);
  let y = drawDocumentHeader(
    doc,
    "PAYMENT RECEIPT",
    "Receipt No.",
    receiptNo,
    payment.payment_date,
    company,
    logo,
  );

  const amount = Number(payment.amount || 0);
  const total = Number(order?.total_amount ?? quotation.total_amount ?? 0);
  const payments = [...(quotation.payments ?? [])].sort(byPaymentOrder);
  const recordedTotal = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  // Advances captured before payment records existed are counted as paid earlier.
  const currentPaid = Number(order?.advance_paid ?? quotation.advance_amount ?? 0);
  const untracked = Math.max(0, currentPaid - recordedTotal);
  const index = payments.findIndex((item) => String(item.id) === String(payment.id));
  const paidBefore =
    untracked +
    payments.slice(0, Math.max(0, index)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidToDate = paidBefore + amount;
  const balance = Math.max(0, total - paidToDate);

  y = drawAmountBanner(doc, y, amount) + 5;

  const paymentRows: Array<[string, unknown]> = [
    ["Receipt No.", receiptNo],
    ["Payment date", displayDate(payment.payment_date)],
    ["Payment mode", payment.payment_method],
    ["Reference", payment.transaction_reference],
    ["Received by", payment.collected_by_name],
    ["Remarks", payment.customer_remarks],
  ];
  const customerRows: Array<[string, unknown]> = [
    ["Name", order?.customer_name || quotation.customer_name],
    ["Phone", order?.phone || quotation.phone],
    ["Email", quotation.email],
    [
      "Address",
      addressOrFallback(quotation.billing_address, quotation.address, order?.delivery_address),
    ],
  ];
  const cardWidth = 92;
  const cardHeight = Math.max(
    measureInfoBlockHeight(doc, paymentRows, cardWidth),
    measureInfoBlockHeight(doc, customerRows, cardWidth),
  );
  drawInfoBlock(doc, "Payment details", paymentRows, PDF.left, y, cardWidth, cardHeight);
  drawInfoBlock(
    doc,
    "Customer details",
    customerRows,
    PDF.right - cardWidth,
    y,
    cardWidth,
    cardHeight,
  );
  y += cardHeight + 5;

  const items = order?.items?.length ? order.items : (quotation.items ?? []);
  if (items.length) {
    const headers = [
      { text: "#", x: 16, align: "center" as const },
      { text: "ITEM", x: 23 },
      { text: "FLAVOUR", x: 105 },
      { text: "QTY", x: 150, align: "center" as const },
      { text: "AMOUNT", x: 196, align: "right" as const },
    ];
    y = drawTableHeader(doc, y, headers);
    const shown = items.slice(0, MAX_ITEM_ROWS);
    shown.forEach((item, row) => {
      const name = doc.splitTextToSize(String(item.item_name || "Item"), 78).slice(0, 2);
      const height = Math.max(8, name.length * 3.9 + 3.6);
      drawTableRowBackground(doc, y, height, row % 2 === 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(...PDF.ink);
      doc.text(String(row + 1), 16, y + 5.2, { align: "center" });
      doc.text(name, 23, y + 5.2);
      doc.text(doc.splitTextToSize(String(item.flavour || "-"), 40).slice(0, 1), 105, y + 5.2);
      doc.text(`${Number(item.quantity) || 0} ${displayUnit(item.unit_type)}`, 150, y + 5.2, {
        align: "center",
      });
      doc.setFont("helvetica", "bold");
      doc.text(money(item.amount), 196, y + 5.2, { align: "right" });
      y += height;
    });
    if (items.length > shown.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.2);
      doc.setTextColor(...PDF.muted);
      doc.text(`+ ${items.length - shown.length} more item(s)`, 23, y + 4.5);
      y += 6;
    }
    y += 5;
  }

  const delivery = order?.delivery_date ?? quotation.delivery_date;
  const deliveryTime = order?.delivery_time ?? quotation.delivery_time;
  const orderRows: Array<[string, unknown]> = [
    ["Order No.", order?.order_no],
    ["Order status", order?.status],
    ["Quotation No.", quotation.quotation_no],
    ["Occasion", quotation.occasion],
    [
      "Event date",
      order?.event_date || quotation.event_date
        ? displayDate(order?.event_date || quotation.event_date)
        : null,
    ],
    [
      "Delivery",
      delivery
        ? `${displayDate(delivery)}${deliveryTime ? `  ${formatTimeOfDay(deliveryTime)}` : ""}`
        : null,
    ],
    ["Method", order?.delivery_method || quotation.delivery_type],
  ];
  const orderHeight = measureInfoBlockHeight(doc, orderRows, cardWidth);
  const totalRows = [
    { label: order ? "Order total" : "Quotation total", value: total, kind: "muted" as const },
    { label: "Paid earlier", value: paidBefore },
    { label: "This payment", value: amount, kind: "advance" as const },
    { label: "Total paid", value: paidToDate, kind: "muted" as const },
    { label: "Balance due", value: balance, kind: "balance" as const },
  ];
  if (y + Math.max(orderHeight, 40) > PDF.bottom) {
    doc.addPage();
    y = drawDocumentHeader(
      doc,
      "PAYMENT RECEIPT",
      "Receipt No.",
      receiptNo,
      payment.payment_date,
      company,
      logo,
      true,
    );
  }
  const orderBottom = drawInfoBlock(
    doc,
    order ? "Order details" : "Booking details",
    orderRows,
    PDF.left,
    y,
    cardWidth,
    orderHeight,
  );
  const totalsBottom = drawTotalsPanel(doc, y, totalRows);
  y = Math.max(orderBottom, totalsBottom) + 4;

  if (y + 8 <= PDF.bottom) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF.muted);
    doc.text(
      balance > 0
        ? `Balance of ${money(balance)} is payable on or before delivery.`
        : "Thank you — this order is fully paid.",
      PDF.left + 1,
      y + 2,
    );
    doc.text(
      "This is a computer-generated receipt and does not require a signature.",
      PDF.left + 1,
      y + 6,
    );
    if (y + 36 <= PDF.bottom) drawBakeryMessage(doc, y + 4);
  }

  drawFooter(doc, company);
  return doc;
}
