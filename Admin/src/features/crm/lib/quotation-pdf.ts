import { jsPDF } from "jspdf";
import type { CompanyConfig, Quotation } from "@/features/crm/quotations-hooks";
import { PDF, displayDate, drawFooter, drawHeader, drawTableHeader, loadBrandLogo, money } from "./pdf-brand";

export async function buildQuotationPdf(q: Quotation, company?: CompanyConfig) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, await loadBrandLogo());
  const label = (text: string, x: number, y: number) => { doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(130); doc.text(text, x, y); };
  const value = (text: unknown, x: number, y: number, width = 78) => { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(46, 43, 41); doc.text(doc.splitTextToSize(String(text || "-"), width).slice(0, 3), x, y); };
  label("CUSTOMER", PDF.left, 47); value(q.customer_name, PDF.left, 52); value([q.phone, q.email].filter(Boolean).join(" | "), PDF.left, 57);
  label("EVENT / DELIVERY", 104, 47); value([q.occasion, q.cake_type, q.event_date && `Event: ${displayDate(q.event_date)}`, q.delivery_date && `Delivery: ${displayDate(q.delivery_date)} ${q.delivery_time || ""}`, q.delivery_type].filter(Boolean).join(" | "), 104, 52, 92);
  label("BILLING ADDRESS", PDF.left, 64); value(q.billing_address || q.address, PDF.left, 69);
  label("SHIPPING ADDRESS", 104, 64); value(q.address, 104, 69);
  if (q.valid_until) { label("VALID UNTIL", 174, 35); value(displayDate(q.valid_until), 174, 39, 22); }
  let y = 82;
  const headers = [{ text: "#", x: 17 }, { text: "PRODUCT / DESCRIPTION", x: 25 }, { text: "FLAVOUR", x: 103 }, { text: "QTY", x: 137, align: "right" as const }, { text: "RATE", x: 158, align: "right" as const }, { text: "GST", x: 173, align: "right" as const }, { text: "AMOUNT", x: 193, align: "right" as const }];
  y = drawTableHeader(doc, y, headers);
  const items = q.items?.length ? q.items : [{ item_name: q.cake_type || "Custom cake", description: null, flavour: q.flavour, weight: null, quantity: q.quantity || 1, rate: q.rate || 0, gst_percentage: q.gst_percentage }];
  items.forEach((item, index) => {
    const description = doc.splitTextToSize([item.item_name, item.weight, item.description].filter(Boolean).join(" - "), 72).slice(0, 4); const rowHeight = Math.max(10, description.length * 4 + 3);
    if (y + rowHeight > 228) { doc.addPage(); y = drawTableHeader(doc, 17, headers); }
    const qty = Number(item.quantity) || 0, rate = Number(item.rate) || 0, gst = Number(item.gst_percentage) || 0;
    doc.setDrawColor(224); doc.rect(PDF.left, y, PDF.right - PDF.left, rowHeight); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(46, 43, 41);
    doc.text(String(index + 1), 17, y + 6); doc.text(description, 25, y + 6); doc.text(String(item.flavour || "-"), 103, y + 6); doc.text(String(qty), 137, y + 6, { align: "right" }); doc.text(money(rate), 158, y + 6, { align: "right" }); doc.text(`${gst}%`, 173, y + 6, { align: "right" }); doc.text(money(qty * rate * (1 + gst / 100)), 193, y + 6, { align: "right" }); y += rowHeight;
  });
  const notes = [q.payment_terms && `Payment Terms: ${q.payment_terms}`, q.notes && `Notes: ${q.notes}`, q.special_instructions && `Special Instructions: ${q.special_instructions}`].filter(Boolean) as string[];
  if (y + 60 + notes.length * 8 > PDF.bottom) { doc.addPage(); y = 20; } y += 7;
  const totals: Array<[string, unknown, boolean?]> = [["Subtotal", q.subtotal], ["GST", q.gst_amount], ["Discount", -Number(q.discount_amount || 0)], ["Total Amount", q.total_amount, true], ["Advance Received", q.advance_amount], ["Balance Due", q.balance_amount, true]];
  totals.filter(([name, amount]) => name !== "Discount" || Number(amount) !== 0).forEach(([name, amount, bold]) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 9.5 : 8); doc.text(name, 116, y); doc.text(money(amount), PDF.right, y, { align: "right" }); y += bold ? 7 : 5.5; });
  if (notes.length) { y += 3; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); notes.forEach((line) => { doc.text(doc.splitTextToSize(line, 176).slice(0, 3), PDF.left, y); y += 8; }); }
  doc.setDrawColor(120); doc.line(138, Math.min(y + 12, 274), PDF.right, Math.min(y + 12, 274)); doc.setFontSize(7); doc.text("Authorized Signature", 167, Math.min(y + 17, 279), { align: "center" }); drawFooter(doc, company); return doc;
}
