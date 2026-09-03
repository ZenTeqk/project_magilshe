import { jsPDF } from "jspdf";
import type { CrmInvoice } from "@/features/crm/invoices-hooks";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";
import {
  PDF, displayDate, displayUnit, drawBakeryMessage, drawDocumentHeader, drawFooter, drawInfoBlock, drawSectionLabel,
  drawTableHeader, drawTableRowBackground, drawTotalsPanel, loadBrandLogo, measureInfoBlockHeight, money,
} from "./pdf-brand";

export async function buildInvoicePdf(invoice: CrmInvoice, company?: CompanyConfig, brandLogo?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = brandLogo ?? await loadBrandLogo();
  const title = company?.gst_number ? "TAX INVOICE" : "INVOICE";
  let y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo);

  const detailRows: Array<[string, unknown]> = [
    ["Invoice No", invoice.invoice_no], ["Date", displayDate(invoice.generated_on)],
    ["Order", invoice.order_no], ["Quotation", invoice.quotation_no], ["Status", invoice.status],
    ["Payment", invoice.payments?.[0]?.payment_method || "Not recorded"],
  ];
  const customerRows: Array<[string, unknown]> = [
    ["Name", invoice.customer_name], ["Phone", invoice.phone],
    ["Email", invoice.email],
    ["Address", invoice.address || invoice.delivery_address],
  ];
  const cardHeight = Math.max(
    measureInfoBlockHeight(doc, detailRows, 84),
    measureInfoBlockHeight(doc, customerRows, 84),
  );
  const orderBottom = drawInfoBlock(doc, "Invoice details", detailRows, PDF.left, y, 84, cardHeight);
  const customerBottom = drawInfoBlock(doc, "Customer details", customerRows, 110, y, 84, cardHeight);
  y = Math.max(customerBottom, orderBottom) + 5;

  const headers = [
    { text: "#", x: 24, align: "center" as const }, { text: "PRODUCT / DESCRIPTION", x: 31 }, { text: "FLAVOUR", x: 86 },
    { text: "QTY", x: 118, align: "center" as const }, { text: "UNIT", x: 132, align: "center" as const },
    { text: "RATE", x: 158, align: "right" as const }, { text: "GST", x: 169, align: "center" as const },
    { text: "AMOUNT", x: 190, align: "right" as const },
  ];
  y = drawTableHeader(doc, y, headers);

  (invoice.items || []).forEach((item, index) => {
    const productLines = doc.splitTextToSize([item.item_name, item.description].filter(Boolean).join(" - "), 55).slice(0, 5);
    const flavourLines = doc.splitTextToSize(String(item.flavour || "-"), 25).slice(0, 4);
    const rowHeight = Math.max(14, Math.max(productLines.length, flavourLines.length) * 4.5 + 5);
    if (y + rowHeight > 267) {
      doc.addPage();
      y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo, true);
      y = drawTableHeader(doc, y, headers);
    }
    const quantity = Number(item.quantity) || 0;
    drawTableRowBackground(doc, y, rowHeight, index % 2 === 1);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.3); doc.setTextColor(...PDF.ink);
    doc.text(String(index + 1), 24, y + 6.5, { align: "center" }); doc.text(productLines, 31, y + 6.5); doc.text(flavourLines, 86, y + 6.5);
    doc.text(String(quantity), 118, y + 6.5, { align: "center" }); doc.text(displayUnit(item.unit_type), 132, y + 6.5, { align: "center" });
    doc.text(money(item.rate), 158, y + 6.5, { align: "right" }); doc.text(`${Number(item.gst_percentage) || 0}%`, 169, y + 6.5, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.text(money(item.amount), 190, y + 6.5, { align: "right" });
    y += rowHeight;
  });

  const paymentLines = invoice.payments?.length || 0;
  const totalRows = [
    { label: "Subtotal", value: invoice.subtotal },
    { label: "Discount", value: Number(invoice.discount_amount || 0) ? -Number(invoice.discount_amount) : 0, kind: "discount" as const },
    ...(Number(invoice.gst_amount || 0) ? [
      { label: "CGST", value: Number(invoice.gst_amount) / 2 },
      { label: "SGST", value: Number(invoice.gst_amount) / 2 },
    ] : []),
    { label: "Grand Total", value: invoice.total_amount, kind: "grand" as const },
    { label: "Advance Received", value: invoice.amount_paid, kind: "advance" as const },
    { label: "Balance Due", value: invoice.balance_amount, kind: "balance" as const },
  ];
  const totalsHeight = totalRows.reduce((sum, row) => sum + (row.kind === "grand" ? 13 : row.kind === "balance" ? 8 : 6.5), 5);
  const requiredHeight = Math.max(totalsHeight, paymentLines ? 17 + paymentLines * 5 : 38);
  if (y + requiredHeight > 267) {
    doc.addPage();
    y = drawDocumentHeader(doc, title, "Invoice No", invoice.invoice_no, invoice.generated_on, company, logo, true);
  } else y += 7;

  if (invoice.payments?.length) {
    drawSectionLabel(doc, "Payment information", PDF.left, y + 2);
    let paymentY = y + 9;
    invoice.payments.forEach((payment) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.setTextColor(...PDF.ink);
      doc.text(`${displayDate(payment.payment_date)}  |  ${payment.payment_method || "Payment"}`, PDF.left, paymentY);
      doc.setFont("helvetica", "bold"); doc.text(money(payment.amount), 94, paymentY, { align: "right" });
      paymentY += 5;
    });
  } else drawBakeryMessage(doc, y);

  drawTotalsPanel(doc, y, totalRows);
  drawFooter(doc, company);
  return doc;
}
