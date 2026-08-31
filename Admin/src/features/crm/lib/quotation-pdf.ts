import { jsPDF } from "jspdf";
import type { CompanyConfig, Quotation } from "@/features/crm/quotations-hooks";
import {
  PDF, displayDate, drawDocumentHeader, drawFooter, drawInfoBlock, drawSectionLabel,
  drawTableHeader, drawTableRowBackground, drawTotalsPanel, loadBrandLogo, money,
} from "./pdf-brand";

export async function buildQuotationPdf(q: Quotation, company?: CompanyConfig, brandLogo?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? await loadBrandLogo();
  let y = drawDocumentHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, logo);

  const customerBottom = drawInfoBlock(doc, "Customer details", [
    ["Name", q.customer_name], ["Phone", q.phone], ["Email", q.email],
  ], PDF.left, y, 87);
  const detailsBottom = drawInfoBlock(doc, "Quotation details", [
    ["Valid until", q.valid_until ? displayDate(q.valid_until) : null],
    ["Occasion", q.occasion], ["Event date", q.event_date ? displayDate(q.event_date) : null],
    ["Delivery", q.delivery_date ? `${displayDate(q.delivery_date)}${q.delivery_time ? `  ${q.delivery_time}` : ""}` : null],
    ["Method", q.delivery_type],
  ], 105, y, 91);
  y = Math.max(customerBottom, detailsBottom) + 4;

  if (q.billing_address || q.address) {
    y = drawInfoBlock(doc, "Address details", [
      ["Billing", q.billing_address || q.address],
      ["Delivery", q.address && q.address !== q.billing_address ? q.address : null],
    ], PDF.left, y, PDF.right - PDF.left) + 5;
  }

  const headers = [
    { text: "#", x: 17 }, { text: "PRODUCT / DESCRIPTION", x: 23 }, { text: "FLAVOUR", x: 82 },
    { text: "QTY", x: 116, align: "right" as const }, { text: "UNIT", x: 121 },
    { text: "RATE", x: 153, align: "right" as const }, { text: "GST", x: 169, align: "right" as const },
    { text: "AMOUNT", x: 193, align: "right" as const },
  ];
  y = drawTableHeader(doc, y, headers);
  const items = q.items?.length ? q.items : [{
    item_name: q.cake_type || "Custom cake", description: null, flavour: q.flavour, weight: null,
    quantity: q.quantity || 0, unit_type: "kg", rate: q.rate || 0, gst_percentage: q.gst_percentage,
  }];

  items.forEach((item, index) => {
    const productLines = doc.splitTextToSize([item.item_name, item.description].filter(Boolean).join(" - "), 55).slice(0, 5);
    const flavourLines = doc.splitTextToSize(String(item.flavour || "-"), 25).slice(0, 4);
    const rowHeight = Math.max(11, Math.max(productLines.length, flavourLines.length) * 4 + 4);
    if (y + rowHeight > 267) {
      doc.addPage();
      y = drawDocumentHeader(doc, "QUOTATION", "Quotation No", q.quotation_no, q.created_on, company, logo, true);
      y = drawTableHeader(doc, y, headers);
    }
    const qty = Number(item.quantity) || 0, rate = Number(item.rate) || 0, gst = Number(item.gst_percentage) || 0;
    drawTableRowBackground(doc, y, rowHeight, index % 2 === 1);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...PDF.ink);
    doc.text(String(index + 1), 17, y + 6.5); doc.text(productLines, 23, y + 6.5); doc.text(flavourLines, 82, y + 6.5);
    doc.text(String(qty), 116, y + 6.5, { align: "right" }); doc.text(item.unit_type === "kg" ? "KG" : item.unit_type === "piece" ? "Piece" : item.unit_type, 121, y + 6.5);
    doc.text(money(rate), 153, y + 6.5, { align: "right" }); doc.text(`${gst}%`, 169, y + 6.5, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.text(money(qty * rate * (1 + gst / 100)), 193, y + 6.5, { align: "right" });
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
  }

  const totalRows = [
    { label: "Subtotal", value: q.subtotal },
    ...(Number(q.discount_amount || 0) ? [{ label: "Discount", value: -Number(q.discount_amount) }] : []),
    { label: "GST", value: q.gst_amount },
    { label: "Grand Total", value: q.total_amount, kind: "grand" as const },
    { label: "Advance Received", value: q.advance_amount },
    { label: "Balance Due", value: q.balance_amount, kind: "balance" as const },
  ];
  drawTotalsPanel(doc, y, totalRows);

  drawFooter(doc, company);
  return doc;
}
