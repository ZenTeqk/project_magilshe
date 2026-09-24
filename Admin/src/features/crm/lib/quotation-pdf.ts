import { jsPDF } from "jspdf";
import type { CompanyConfig, Quotation } from "@/features/crm/quotations-hooks";
import { hasRate, pricingQuantity } from "@/features/crm/sale-units";
import { formatTimeOfDay } from "@/lib/format-time";
import { addressOrFallback } from "./address-fallback";
import {
  PDF, displayDate, displayUnit, drawBakeryMessage, drawDocumentHeader, drawFooter, drawInfoBlock, drawSectionLabel,
  drawTableHeader, drawTableRowBackground, drawTotalsPanel, loadBrandLogo, money,
  measureInfoBlockHeight,
} from "./pdf-brand";

export async function buildQuotationPdf(q: Quotation, company?: CompanyConfig, brandLogo?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? await loadBrandLogo();
  let y = drawDocumentHeader(doc, "QUOTATION", "No.", q.quotation_no, q.created_on, company, logo);

  const detailRows: Array<[string, unknown]> = [
    ["Date", displayDate(q.created_on)],
    ["Valid until", q.valid_until ? displayDate(q.valid_until) : null],
    ["Status", q.status], ["Payment", q.payment_method || "Not recorded"],
    ["Occasion", q.occasion],
    ["Event", q.event_date ? displayDate(q.event_date) : null],
    ["Delivery", q.delivery_date ? `${displayDate(q.delivery_date)}${q.delivery_time ? `  ${formatTimeOfDay(q.delivery_time)}` : ""}` : null],
    ["Method", q.delivery_type],
  ];
  const customerRows: Array<[string, unknown]> = [
    ["Name", q.customer_name], ["Phone", q.phone],
    ["Email", q.email],
    ["Address", addressOrFallback(q.billing_address, q.address)],
    ["Delivery", q.address && q.address !== q.billing_address ? q.address : null],
  ];
  const cardWidth = 84;
  const cardHeight = Math.max(measureInfoBlockHeight(doc, detailRows, cardWidth), measureInfoBlockHeight(doc, customerRows, cardWidth));
  const detailsBottom = drawInfoBlock(doc, "Quote details", detailRows, PDF.left, y, cardWidth, cardHeight);
  const customerBottom = drawInfoBlock(doc, "Customer details", customerRows, 110, y, cardWidth, cardHeight);
  y = Math.max(customerBottom, detailsBottom) + 4;

  const showRate = q.items?.length ? q.items.some((item) => hasRate(item.rate)) : hasRate(q.rate);
  const headers = [
    { text: "#", x: 24, align: "center" as const }, { text: "PRODUCT / DESCRIPTION", x: 31 }, { text: "FLAVOUR", x: 86 },
    { text: "QTY", x: 118, align: "center" as const }, { text: "UNIT", x: 132, align: "center" as const },
    ...(showRate ? [{ text: "RATE", x: 158, align: "right" as const }] : []), { text: "GST", x: 169, align: "center" as const },
    { text: "AMOUNT", x: 190, align: "right" as const },
  ];
  y = drawTableHeader(doc, y, headers);
  const items = q.items?.length ? q.items : [{
    item_name: q.cake_type || "Custom cake", description: null, flavour: q.flavour, weight: null,
    quantity: q.quantity || 0, unit_type: "kg", rate: q.rate ?? null, gst_percentage: q.gst_percentage,
    amount: q.subtotal,
  }];
  const hasItemRows = Boolean(q.items?.length);
  const calculatedSubtotal = hasItemRows
    ? items.reduce((sum, item) => sum + (Number(item.amount ?? item.subtotal ?? 0) || pricingQuantity(item.quantity || 0, item.unit_type) * (Number(item.rate) || 0)), 0)
    : Number(q.subtotal || 0);
  const calculatedGst = hasItemRows
    ? items.reduce((sum, item) => {
        const lineAmount = Number(item.amount ?? item.subtotal ?? 0) || pricingQuantity(item.quantity || 0, item.unit_type) * (Number(item.rate) || 0);
        return sum + lineAmount * (Number(item.gst_percentage) || 0) / 100;
      }, 0)
    : Number(q.gst_amount || 0);
  const discount = Number(q.discount_amount || 0);
  const grandTotal = Math.max(0, calculatedSubtotal + calculatedGst - discount);
  const advance = Number(q.advance_amount || 0);
  const balance = Math.max(0, grandTotal - advance);

  items.forEach((item, index) => {
    const productLines = doc.splitTextToSize([item.item_name, item.description].filter(Boolean).join(" - "), 54).slice(0, 4);
    const flavourLines = doc.splitTextToSize(String(item.flavour || "-"), 25).slice(0, 3);
    const rowHeight = Math.max(11.5, Math.max(productLines.length, flavourLines.length) * 3.9 + 4.2);
    if (y + rowHeight > 267) {
      doc.addPage();
      y = drawDocumentHeader(doc, "QUOTATION", "No.", q.quotation_no, q.created_on, company, logo, true);
      y = drawTableHeader(doc, y, headers);
    }
    const qty = Number(item.quantity) || 0, rate = Number(item.rate) || 0, gst = Number(item.gst_percentage) || 0;
    const lineAmount = Number(item.amount ?? item.subtotal ?? 0) || pricingQuantity(item.quantity || 0, item.unit_type) * rate;
    drawTableRowBackground(doc, y, rowHeight, index % 2 === 1);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); doc.setTextColor(...PDF.ink);
    doc.text(String(index + 1), 24, y + 6, { align: "center" }); doc.text(productLines, 31, y + 6); doc.text(flavourLines, 86, y + 6);
    doc.text(String(qty), 118, y + 6, { align: "center" }); doc.text(displayUnit(item.unit_type), 132, y + 6, { align: "center" });
    if (showRate) doc.text(hasRate(item.rate) ? money(rate) : "-", 158, y + 6, { align: "right" }); doc.text(`${gst}%`, 169, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.text(money(lineAmount), 190, y + 6, { align: "right" });
    y += rowHeight;
  });

  const totalsHeight = 47 + (Number(q.discount_amount || 0) ? 5.6 : 0);
  if (y + totalsHeight > 267) {
    doc.addPage();
    y = drawDocumentHeader(doc, "QUOTATION", "No.", q.quotation_no, q.created_on, company, logo, true);
  } else y += 7;

  const notes = [
    q.payment_terms && ["Payment terms", q.payment_terms],
    q.notes && ["Notes", q.notes],
    q.special_instructions && ["Special instructions", q.special_instructions],
  ].filter(Boolean) as Array<[string, string]>;
  if (notes.length) {
    drawSectionLabel(doc, "Terms & notes", PDF.left, y + 2);
    let noteY = y + 9;
    notes.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...PDF.muted); doc.text(label, PDF.left, noteY);
      doc.setFont("helvetica", "normal"); doc.setTextColor(...PDF.ink);
      const lines = doc.splitTextToSize(value, 78).slice(0, 4); doc.text(lines, PDF.left, noteY + 4); noteY += lines.length * 3.8 + 7;
    });
  } else drawBakeryMessage(doc, y);

  const totalRows = [
    { label: "Subtotal", value: calculatedSubtotal },
    { label: "Discount", value: discount ? -discount : 0, kind: "discount" as const },
    { label: "CGST", value: calculatedGst / 2 },
    { label: "SGST", value: calculatedGst / 2 },
    { label: "Grand Total", value: grandTotal, kind: "grand" as const },
    { label: "Advance Received", value: advance, kind: "advance" as const },
    { label: "Balance Due", value: balance, kind: "balance" as const },
  ];
  drawTotalsPanel(doc, y, totalRows);

  drawFooter(doc, company);
  return doc;
}
