import { jsPDF } from "jspdf";
import type { CompanyConfig, Quotation } from "@/features/crm/quotations-hooks";
import { formatTimeOfDay } from "@/lib/format-time";
import { addressOrFallback } from "./address-fallback";
import {
  PDF, displayDate, displayUnit, drawBakeryMessage, drawDocumentHeader, drawFooter, drawInfoBlock, drawSectionLabel,
  drawTableHeader, drawTableRowBackground, drawTotalsPanel, loadBrandLogo, money,
  measureInfoBlockHeight,
} from "./pdf-brand-v1";

export async function buildQuotationPdf(q: Quotation, company?: CompanyConfig, brandLogo?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? await loadBrandLogo();
  let y = drawDocumentHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, logo);

  const detailRows: Array<[string, unknown]> = [
    ["Number", q.quotation_no], ["Date", displayDate(q.created_on)],
    ["Payment", q.payment_method || "Not recorded"], ["Status", q.status],
  ];
  const customerRows: Array<[string, unknown]> = [
    ["Name", q.customer_name], ["Phone", q.phone],
    ["Address", addressOrFallback(q.billing_address, q.address)],
  ];
  const cardHeight = Math.max(measureInfoBlockHeight(doc, detailRows, 92), measureInfoBlockHeight(doc, customerRows, 92));
  const detailsBottom = drawInfoBlock(doc, "Quotation details", detailRows, PDF.left, y, 92, cardHeight);
  const customerBottom = drawInfoBlock(doc, "Customer details", customerRows, 108, y, 92, cardHeight);
  y = Math.max(customerBottom, detailsBottom) + 4;

  if (q.occasion || q.event_date || q.delivery_date || (q.address && q.address !== q.billing_address)) {
    y = drawInfoBlock(doc, "Event & delivery details", [
      ["Occasion", q.occasion], ["Event date", q.event_date ? displayDate(q.event_date) : null],
      ["Delivery", q.delivery_date ? `${displayDate(q.delivery_date)}${q.delivery_time ? `  ${formatTimeOfDay(q.delivery_time)}` : ""}` : null],
      ["Method", q.delivery_type], ["Address", q.address && q.address !== q.billing_address ? q.address : null],
    ], PDF.left, y, PDF.right - PDF.left) + 5;
  }

  const headers = [
    { text: "#", x: 15, align: "center" as const }, { text: "PRODUCT / DESCRIPTION", x: 22 }, { text: "FLAVOUR", x: 81 },
    { text: "QTY", x: 116, align: "center" as const }, { text: "UNIT", x: 130, align: "center" as const },
    { text: "RATE", x: 158, align: "right" as const }, { text: "GST", x: 168, align: "center" as const },
    { text: "AMOUNT", x: 196, align: "right" as const },
  ];
  y = drawTableHeader(doc, y, headers);
  const items = q.items?.length ? q.items : [{
    item_name: q.cake_type || "Custom cake", description: null, flavour: q.flavour, weight: null,
    quantity: q.quantity || 0, unit_type: "kg", rate: q.rate || 0, gst_percentage: q.gst_percentage,
    amount: q.subtotal,
  }];

  items.forEach((item, index) => {
    const productLines = doc.splitTextToSize([item.item_name, item.description].filter(Boolean).join(" - "), 54).slice(0, 5);
    const flavourLines = doc.splitTextToSize(String(item.flavour || "-"), 25).slice(0, 4);
    const rowHeight = Math.max(14, Math.max(productLines.length, flavourLines.length) * 4.5 + 5);
    if (y + rowHeight > 267) {
      doc.addPage();
      y = drawDocumentHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, logo, true);
      y = drawTableHeader(doc, y, headers);
    }
    const qty = Number(item.quantity) || 0, rate = Number(item.rate) || 0, gst = Number(item.gst_percentage) || 0;
    drawTableRowBackground(doc, y, rowHeight, index % 2 === 1);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.3); doc.setTextColor(...PDF.ink);
    [20, 79, 109, 123, 138, 160, 176].forEach((x) => { doc.setDrawColor(...PDF.rule); doc.line(x, y, x, y + rowHeight); });
    doc.text(String(index + 1), 15, y + 6.5, { align: "center" }); doc.text(productLines, 22, y + 6.5); doc.text(flavourLines, 81, y + 6.5);
    doc.text(String(qty), 116, y + 6.5, { align: "center" }); doc.text(displayUnit(item.unit_type), 130, y + 6.5, { align: "center" });
    doc.text(money(rate), 158, y + 6.5, { align: "right" }); doc.text(`${gst}%`, 168, y + 6.5, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.text(money(item.amount ?? item.subtotal ?? 0), 196, y + 6.5, { align: "right" });
    y += rowHeight;
  });

  const totalsHeight = 54 + (Number(q.discount_amount || 0) ? 6.5 : 0);
  if (y + totalsHeight > 267) {
    doc.addPage();
    y = drawDocumentHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, logo, true);
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
    { label: "Subtotal", value: q.subtotal },
    { label: "Discount", value: Number(q.discount_amount || 0) ? -Number(q.discount_amount) : 0, kind: "discount" as const },
    { label: "CGST", value: Number(q.gst_amount || 0) / 2 },
    { label: "SGST", value: Number(q.gst_amount || 0) / 2 },
    { label: "Grand Total", value: q.total_amount, kind: "grand" as const },
    { label: "Advance Received", value: q.advance_amount, kind: "advance" as const },
    { label: "Balance Due", value: q.balance_amount, kind: "balance" as const },
  ];
  drawTotalsPanel(doc, y, totalRows);

  drawFooter(doc, company);
  return doc;
}
