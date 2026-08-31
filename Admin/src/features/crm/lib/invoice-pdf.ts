import { jsPDF } from "jspdf";
import type { CrmInvoice } from "@/features/crm/invoices-hooks";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";
import {
  PDF, displayDate, drawDocumentHeader, drawFooter, drawInfoBlock, drawSectionLabel,
  drawTableHeader, drawTableRowBackground, drawTotalsPanel, loadBrandLogo, money,
} from "./pdf-brand";

export async function buildInvoicePdf(invoice: CrmInvoice, company?: CompanyConfig, brandLogo?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? await loadBrandLogo();
  const title = company?.gst_number ? "TAX INVOICE" : "INVOICE";
  let y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo);

  const customerBottom = drawInfoBlock(doc, "Customer details", [
    ["Name", invoice.customer_name], ["Phone", invoice.phone],
    ["Address", invoice.address || invoice.delivery_address],
  ], PDF.left, y, 91);
  const orderBottom = drawInfoBlock(doc, "Invoice details", [
    ["Order", invoice.order_no], ["Quotation", invoice.quotation_no], ["Status", invoice.status],
    ["Event date", invoice.event_date ? displayDate(invoice.event_date) : null],
    ["Delivery", invoice.delivery_date ? displayDate(invoice.delivery_date) : null],
  ], 109, y, 87);
  y = Math.max(customerBottom, orderBottom) + 5;

  const headers = [
    { text: "#", x: 17 }, { text: "PRODUCT / DESCRIPTION", x: 23 }, { text: "FLAVOUR", x: 82 },
    { text: "QTY", x: 116, align: "right" as const }, { text: "UNIT", x: 121 },
    { text: "RATE", x: 153, align: "right" as const }, { text: "GST", x: 169, align: "right" as const },
    { text: "AMOUNT", x: 193, align: "right" as const },
  ];
  y = drawTableHeader(doc, y, headers);

  (invoice.items || []).forEach((item, index) => {
    const productLines = doc.splitTextToSize([item.item_name, item.description].filter(Boolean).join(" - "), 55).slice(0, 5);
    const flavourLines = doc.splitTextToSize(String(item.flavour || "-"), 25).slice(0, 4);
    const rowHeight = Math.max(11, Math.max(productLines.length, flavourLines.length) * 4 + 4);
    if (y + rowHeight > 267) {
      doc.addPage();
      y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo, true);
      y = drawTableHeader(doc, y, headers);
    }
    const quantity = Number(item.quantity) || 0;
    drawTableRowBackground(doc, y, rowHeight, index % 2 === 1);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...PDF.ink);
    doc.text(String(index + 1), 17, y + 6.5); doc.text(productLines, 23, y + 6.5); doc.text(flavourLines, 82, y + 6.5);
    doc.text(String(quantity), 116, y + 6.5, { align: "right" }); doc.text(item.unit_type === "kg" ? "KG" : item.unit_type === "piece" ? "Piece" : item.unit_type, 121, y + 6.5);
    doc.text(money(item.rate), 153, y + 6.5, { align: "right" }); doc.text(`${Number(item.gst_percentage) || 0}%`, 169, y + 6.5, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.text(money(item.amount), 193, y + 6.5, { align: "right" });
    y += rowHeight;
  });

  const paymentLines = Math.min(invoice.payments?.length || 0, 6);
  const requiredHeight = Math.max(49, paymentLines ? 17 + paymentLines * 5 : 0);
  if (y + requiredHeight > 267) {
    doc.addPage();
    y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo, true);
  } else y += 7;

  if (invoice.payments?.length) {
    drawSectionLabel(doc, "Payment information", PDF.left, y + 2);
    let paymentY = y + 9;
    invoice.payments.slice(0, 6).forEach((payment) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.setTextColor(...PDF.ink);
      doc.text(`${displayDate(payment.payment_date)}  |  ${payment.payment_method || "Payment"}`, PDF.left, paymentY);
      doc.setFont("helvetica", "bold"); doc.text(money(payment.amount), 94, paymentY, { align: "right" });
      paymentY += 5;
    });
  }

  drawTotalsPanel(doc, y, [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "GST", value: invoice.gst_amount },
    { label: "Grand Total", value: invoice.total_amount, kind: "grand" },
    { label: "Advance Received", value: invoice.amount_paid },
    { label: "Balance Due", value: invoice.balance_amount, kind: "balance" },
  ]);

  doc.setFont("helvetica", "italic"); doc.setFontSize(7.2); doc.setTextColor(...PDF.muted);
  doc.text(Number(invoice.balance_amount) === 0 ? "Payment received in full." : "Please quote the invoice number when making payment.", PDF.left, 279);
  drawFooter(doc, company);
  return doc;
}
