import { jsPDF } from "jspdf";
import type { CrmInvoice } from "@/features/crm/invoices-hooks";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";
import { PDF, displayDate, drawFooter, drawHeader, drawTableHeader, loadBrandLogo, money } from "./pdf-brand";

export async function buildInvoicePdf(invoice: CrmInvoice, company?: CompanyConfig) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); drawHeader(doc, "INVOICE", "Invoice No", invoice.invoice_no, invoice.generated_on, company, await loadBrandLogo());
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(130); doc.text("BILL TO", PDF.left, 48); doc.text("ORDER DETAILS", 112, 48); doc.setTextColor(46, 43, 41); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize([invoice.customer_name, invoice.phone, invoice.address || invoice.delivery_address].filter(Boolean).join("\n"), 84).slice(0, 5), PDF.left, 54);
  doc.text(doc.splitTextToSize([`Order: ${invoice.order_no || "-"}`, invoice.quotation_no && `Quotation: ${invoice.quotation_no}`, invoice.event_date && `Event: ${displayDate(invoice.event_date)}`, invoice.delivery_date && `Delivery: ${displayDate(invoice.delivery_date)}`].filter(Boolean).join("\n"), 84), 112, 54);
  let y = 78; const headers = [{ text: "#", x: 17 }, { text: "PRODUCT / DESCRIPTION", x: 25 }, { text: "FLAVOUR", x: 104 }, { text: "QTY", x: 138, align: "right" as const }, { text: "RATE", x: 160, align: "right" as const }, { text: "GST", x: 174, align: "right" as const }, { text: "AMOUNT", x: 193, align: "right" as const }]; y = drawTableHeader(doc, y, headers);
  (invoice.items || []).forEach((item, index) => { const desc = doc.splitTextToSize([item.item_name, item.weight, item.description].filter(Boolean).join(" - "), 73).slice(0, 4); const h = Math.max(10, desc.length * 4 + 3); if (y + h > 225) { doc.addPage(); y = drawTableHeader(doc, 17, headers); }
    doc.setDrawColor(224); doc.rect(PDF.left, y, PDF.right - PDF.left, h); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(46, 43, 41); doc.text(String(index + 1), 17, y + 6); doc.text(desc, 25, y + 6); doc.text(String(item.flavour || "-"), 104, y + 6); doc.text(String(item.quantity || 0), 138, y + 6, { align: "right" }); doc.text(money(item.rate), 160, y + 6, { align: "right" }); doc.text(`${item.gst_percentage || 0}%`, 174, y + 6, { align: "right" }); doc.text(money(item.amount), 193, y + 6, { align: "right" }); y += h; });
  if (y + 66 > PDF.bottom) { doc.addPage(); y = 20; } y += 8;
  const totals: Array<[string, unknown, boolean?]> = [["Subtotal", invoice.subtotal], ["GST", invoice.gst_amount], ["TOTAL AMOUNT", invoice.total_amount, true], ["ADVANCE RECEIVED", invoice.amount_paid, true], ["BALANCE DUE", invoice.balance_amount, true]];
  totals.forEach(([name, amount, bold]) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 10 : 8); if (name === "ADVANCE RECEIVED") { doc.setFillColor(246, 237, 233); doc.rect(112, y - 5, 84, 7, "F"); } doc.text(name, 116, y); doc.text(money(amount), PDF.right, y, { align: "right" }); y += bold ? 8 : 6; });
  if (invoice.payments?.length) { y += 3; doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("PAYMENT HISTORY", PDF.left, y); y += 5; doc.setFont("helvetica", "normal"); invoice.payments.slice(0, 5).forEach((payment) => { doc.text(`${displayDate(payment.payment_date)} | ${payment.payment_method || "Payment"} | ${money(payment.amount)}`, PDF.left, y); y += 4.5; }); }
  doc.setDrawColor(120); doc.line(138, Math.min(y + 12, 274), PDF.right, Math.min(y + 12, 274)); doc.setFontSize(7); doc.text("Authorized Signature", 167, Math.min(y + 17, 279), { align: "center" }); drawFooter(doc, company); return doc;
}
