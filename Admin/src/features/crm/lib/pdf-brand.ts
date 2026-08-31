import type { jsPDF } from "jspdf";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";

export const PDF = {
  left: 14, right: 196, bottom: 278,
  chocolate: [112, 57, 47] as const,
  coral: [241, 112, 91] as const,
  cream: [252, 247, 244] as const,
  ink: [49, 43, 40] as const,
  muted: [116, 105, 100] as const,
  rule: [224, 210, 204] as const,
};

export type PdfColumn = { text: string; x: number; align?: "left" | "right" | "center" };
let logoDataPromise: Promise<string | undefined> | undefined;

export function loadBrandLogo() {
  logoDataPromise ??= fetch("/logo.png").then((response) => response.blob()).then((blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(() => undefined);
  return logoDataPromise;
}

export const displayDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
export const money = (value: unknown) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const safeText = (value: unknown, fallback = "-") => String(value ?? "").trim() || fallback;

export function drawDocumentHeader(doc: jsPDF, title: string, numberLabel: string, number: string, date: string, company?: CompanyConfig, logoData?: string, continuation = false) {
  doc.setFillColor(...PDF.coral); doc.rect(0, 0, 210, 2.2, "F");
  doc.setFillColor(...PDF.cream); doc.rect(0, 2.2, 210, continuation ? 24 : 39, "F");
  if (logoData) try { doc.addImage(logoData, "PNG", PDF.left, continuation ? 5 : 5.5, continuation ? 25 : 31, continuation ? 17 : 25, undefined, "FAST"); } catch { /* text fallback */ }
  const brandX = logoData ? (continuation ? 43 : 49) : PDF.left;
  doc.setTextColor(...PDF.chocolate); doc.setFont("helvetica", "bold"); doc.setFontSize(continuation ? 11 : 15); doc.text(company?.name || "MagliShe Bakery", brandX, continuation ? 11 : 12);
  if (!continuation) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.setTextColor(...PDF.muted);
    if (company?.company_address) doc.text(doc.splitTextToSize(company.company_address.replace(/\s+/g, " ").trim(), 92).slice(0, 2), brandX, 17);
    const contact = [company?.mobile, company?.email, company?.website].filter(Boolean).join("  |  ");
    if (contact) doc.text(doc.splitTextToSize(contact, 92)[0], brandX, 28.5);
    if (company?.gst_number) { doc.setFont("helvetica", "bold"); doc.text(`GSTIN  ${company.gst_number}`, brandX, 34); }
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...PDF.muted); doc.text(`${title}  |  ${number}`, brandX, 16);
  }
  doc.setTextColor(...PDF.chocolate); doc.setFont("helvetica", "bold"); doc.setFontSize(continuation ? 13 : 19); doc.text(title, PDF.right, continuation ? 10.5 : 12.5, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.8); doc.setTextColor(...PDF.ink); doc.text(`${numberLabel}: ${safeText(number)}`, PDF.right, continuation ? 16 : 20.5, { align: "right" });
  if (!continuation) doc.text(`Date: ${displayDate(date)}`, PDF.right, 27, { align: "right" });
  doc.setDrawColor(...PDF.rule); doc.line(PDF.left, continuation ? 26 : 41.2, PDF.right, continuation ? 26 : 41.2);
  return continuation ? 31 : 46;
}

export function drawSectionLabel(doc: jsPDF, text: string, x: number, y: number) {
  doc.setTextColor(...PDF.coral); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...PDF.coral); doc.setLineWidth(0.45); doc.line(x, y + 1.8, x + 16, y + 1.8); doc.setLineWidth(0.2);
}

export function drawInfoBlock(doc: jsPDF, title: string, rows: Array<[string, unknown]>, x: number, y: number, width: number) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  const lineCounts = visible.map(([, value]) => Math.min(3, doc.splitTextToSize(String(value), width - 29).length));
  const height = Math.max(25, 12 + lineCounts.reduce((sum, count) => sum + Math.max(5, count * 3.8), 0));
  doc.setFillColor(...PDF.cream); doc.setDrawColor(...PDF.rule); doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD"); drawSectionLabel(doc, title, x + 5, y + 7);
  let rowY = y + 14;
  visible.forEach(([label, value], index) => {
    const lines = doc.splitTextToSize(String(value), width - 29).slice(0, 3);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...PDF.muted); doc.text(label, x + 5, rowY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...PDF.ink); doc.text(lines, x + 27, rowY);
    rowY += Math.max(5, lines.length * 3.8);
    if (index < visible.length - 1) { doc.setDrawColor(235, 225, 220); doc.line(x + 5, rowY - 2, x + width - 5, rowY - 2); }
  });
  return y + height;
}

export function drawTableHeader(doc: jsPDF, y: number, labels: PdfColumn[]) {
  doc.setFillColor(...PDF.chocolate); doc.rect(PDF.left, y, PDF.right - PDF.left, 10, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
  labels.forEach(({ text, x, align }) => doc.text(text, x, y + 6.3, align ? { align } : undefined)); doc.setTextColor(...PDF.ink); return y + 10;
}

export function drawTableRowBackground(doc: jsPDF, y: number, height: number, alternate: boolean) {
  if (alternate) { doc.setFillColor(253, 249, 247); doc.rect(PDF.left, y, PDF.right - PDF.left, height, "F"); }
  doc.setDrawColor(...PDF.rule); doc.line(PDF.left, y + height, PDF.right, y + height);
}

export function drawTotalsPanel(doc: jsPDF, y: number, rows: Array<{ label: string; value: unknown; kind?: "grand" | "balance" | "muted" }>) {
  const x = 108, width = PDF.right - x;
  const height = rows.reduce((sum, row) => sum + (row.kind === "grand" ? 11 : row.kind === "balance" ? 9 : 6.5), 0) + 5;
  doc.setDrawColor(...PDF.rule); doc.setFillColor(255, 255, 255); doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
  let rowY = y + 6;
  rows.forEach((row) => {
    if (row.kind === "grand") { doc.setFillColor(...PDF.cream); doc.rect(x + 0.3, rowY - 4.5, width - 0.6, 10.5, "F"); doc.setDrawColor(...PDF.coral); doc.setLineWidth(0.55); doc.line(x, rowY + 6, PDF.right, rowY + 6); doc.setLineWidth(0.2); }
    doc.setFont("helvetica", row.kind === "grand" || row.kind === "balance" ? "bold" : "normal"); doc.setFontSize(row.kind === "grand" ? 10.5 : row.kind === "balance" ? 9 : 7.8);
    if (row.kind === "grand" || row.kind === "balance") doc.setTextColor(...PDF.chocolate);
    else doc.setTextColor(...PDF.ink);
    doc.text(row.label, x + 5, rowY); doc.text(money(row.value), PDF.right - 5, rowY, { align: "right" }); rowY += row.kind === "grand" ? 11 : row.kind === "balance" ? 9 : 6.5;
  });
  return y + height;
}

export function drawFooter(doc: jsPDF, company?: CompanyConfig) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page); doc.setDrawColor(...PDF.rule); doc.line(PDF.left, 284, PDF.right, 284); doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(...PDF.muted);
    const details = [company?.name || "MagliShe Bakery", company?.mobile, company?.email].filter(Boolean).join("  |  ");
    doc.text(details || "MagliShe Bakery", PDF.left, 289.5); doc.text(`Thank you for choosing MagliShe  |  Page ${page} of ${pageCount}`, PDF.right, 289.5, { align: "right" });
  }
}
