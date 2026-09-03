import type { jsPDF } from "jspdf";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";

export const PDF = {
  left: 10, right: 200, bottom: 267,
  wine: [145, 8, 48] as const, magenta: [188, 20, 70] as const,
  rose: [226, 64, 111] as const, blush: [253, 240, 244] as const,
  pale: [255, 249, 251] as const, ink: [35, 31, 33] as const,
  muted: [103, 91, 96] as const, rule: [235, 174, 194] as const,
  green: [31, 143, 69] as const, orange: [215, 112, 10] as const,
};
export type PdfColumn = { text: string; x: number; align?: "left" | "right" | "center" };
export type TotalRow = { label: string; value: unknown; kind?: "grand" | "balance" | "advance" | "discount" | "muted" };
let logoDataPromise: Promise<string | undefined> | undefined;

export function loadBrandLogo() {
  logoDataPromise ??= fetch("/logo.png").then((r) => r.blob()).then((blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(() => undefined);
  return logoDataPromise;
}
export const displayDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
export const money = (value: unknown) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const safeText = (value: unknown, fallback = "-") => String(value ?? "").trim() || fallback;
export const displayUnit = (value: unknown) => {
  const unit = String(value ?? "").trim().toLowerCase();
  if (unit === "kg") return "kg";
  if (unit === "piece") return "Piece";
  return "-";
};

function heart(doc: jsPDF, x: number, y: number, size = 1.8) {
  doc.setFillColor(...PDF.rose); doc.circle(x - size * .45, y, size * .55, "F"); doc.circle(x + size * .45, y, size * .55, "F");
  doc.triangle(x - size, y, x + size, y, x, y + size * 1.25, "F");
}
function drawCake(doc: jsPDF, x: number, y: number, scale = 1) {
  doc.setDrawColor(...PDF.wine); doc.setLineWidth(.4); doc.setFillColor(...PDF.blush);
  doc.roundedRect(x, y + 8 * scale, 26 * scale, 8 * scale, 2, 2, "FD");
  doc.setFillColor(255, 255, 255); doc.roundedRect(x + 3 * scale, y + 2 * scale, 20 * scale, 8 * scale, 2, 2, "FD");
  doc.setFillColor(...PDF.blush); doc.roundedRect(x + 7 * scale, y - 3 * scale, 12 * scale, 7 * scale, 2, 2, "FD");
  doc.setFillColor(...PDF.rose); doc.circle(x + 13 * scale, y - 5 * scale, 2 * scale, "F");
  doc.setDrawColor(...PDF.rose); doc.line(x + 13 * scale, y - 7 * scale, x + 14.2 * scale, y - 10 * scale);
  doc.setLineWidth(.25);
  for (let i = 0; i < 5; i += 1) { doc.setFillColor(...PDF.rose); doc.circle(x + (3 + i * 5) * scale, y + 9 * scale, .75 * scale, "F"); }
  for (let i = 0; i < 4; i += 1) heart(doc, x + (5 + i * 5.3) * scale, y + 13 * scale, .55 * scale);
  doc.setFillColor(...PDF.wine); doc.rect(x + 2 * scale, y + 15.2 * scale, 22 * scale, .7 * scale, "F");
  doc.setDrawColor(...PDF.rule); doc.setLineWidth(.45); doc.line(x - 3 * scale, y + 18 * scale, x + 29 * scale, y + 18 * scale);
}

export function drawDocumentHeader(doc: jsPDF, title: string, numberLabel: string, number: string, date: string, company?: CompanyConfig, logoData?: string, continuation = false) {
  doc.setDrawColor(...PDF.wine); doc.setLineWidth(.45); doc.rect(1.2, 1.2, 207.6, 294.6); doc.setFillColor(...PDF.wine); doc.rect(0, 0, 210, 2.4, "F");
  if (continuation) {
    doc.setFillColor(...PDF.blush); doc.rect(2, 2.5, 206, 25, "F");
    if (logoData) try { doc.addImage(logoData, "PNG", PDF.left, 5, 27, 18, undefined, "FAST"); } catch { /* text fallback */ }
    doc.setFont("times", "bolditalic"); doc.setFontSize(14); doc.setTextColor(...PDF.wine); doc.text(company?.name || "MagliShe", 43, 12);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(title, PDF.right, 11, { align: "right" }); doc.setFontSize(7.5); doc.setTextColor(...PDF.ink); doc.text(`${numberLabel}: ${safeText(number)}  |  Continued`, PDF.right, 18, { align: "right" });
    doc.setDrawColor(...PDF.rose); doc.line(PDF.left, 28, PDF.right, 28); return 33;
  }
  doc.setFillColor(...PDF.pale); doc.rect(2, 2.5, 206, 65.5, "F"); drawCake(doc, 11, 17, 1.18);
  if (logoData) try { doc.addImage(logoData, "PNG", 75, 2.5, 60, 42, undefined, "FAST"); } catch { /* text fallback */ }
  else { doc.setFont("times", "bolditalic"); doc.setFontSize(33); doc.setTextColor(...PDF.wine); doc.text(company?.name || "MagliShe", 105, 25, { align: "center" }); }
  doc.setFont("helvetica", "bold"); doc.setCharSpace(.8); doc.setFontSize(9.2); doc.setTextColor(...PDF.wine); doc.text("CAKES & MORE", 105, 49, { align: "center" }); doc.setCharSpace(0);
  // Reference-style flourishes sit beside the tagline, never between the
  // tagline and the address or through the letterforms.
  doc.setDrawColor(...PDF.rose); doc.setLineWidth(.35); doc.line(66, 47.2, 82, 47.2); doc.line(128, 47.2, 144, 47.2);
  doc.setFont("times", "bolditalic"); doc.setFontSize(10); doc.text("Made with love,", 193, 20, { align: "right" }); doc.setTextColor(...PDF.rose); doc.text("just for you!", 193, 27, { align: "right" }); heart(doc, 190, 33, 1.25);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); doc.setTextColor(...PDF.ink);
  const address = safeText(company?.company_address, "").replace(/\s+/g, " ").trim();
  if (address) doc.text(doc.splitTextToSize(address, 170).slice(0, 1), 105, 57, { align: "center" });
  const contact = [company?.mobile, company?.website || company?.url].filter(Boolean).join("   |   ");
  if (contact) doc.text(contact, 105, 62, { align: "center" });
  if (company?.gst_number) { doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${company.gst_number}`, 105, 66.5, { align: "center" }); }
  const bannerX = 12, bannerWidth = 186;
  doc.setFillColor(...PDF.wine); doc.roundedRect(bannerX, 71, bannerWidth, 13, 2.5, 2.5, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(title, bannerX + 7, 79.5);
  doc.setFontSize(7.8); doc.text(`${numberLabel}: ${safeText(number)}`, bannerX + bannerWidth - 7, 76.5, { align: "right" }); doc.setFont("helvetica", "normal"); doc.text(`Date: ${displayDate(date)}`, bannerX + bannerWidth - 7, 81, { align: "right" }); return 89;
}

export function drawSectionLabel(doc: jsPDF, text: string, x: number, y: number) {
  const width = Math.max(40, text.length * 2.45 + 13); doc.setFillColor(...PDF.magenta); doc.roundedRect(x, y - 6, width, 9, 1, 1, "F"); doc.setFillColor(...PDF.wine); doc.triangle(x, y - 6, x - 3, y - 1.5, x, y + 3, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(text.toUpperCase(), x + 5, y);
}
export function measureInfoBlockHeight(doc: jsPDF, rows: Array<[string, unknown]>, width: number) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  const heights = visible.map(([, value]) => Math.max(6, Math.min(3, doc.splitTextToSize(String(value), width - 35).length) * 4.4));
  return Math.max(34, 14 + heights.reduce((a, b) => a + b, 0));
}
export function drawInfoBlock(doc: jsPDF, title: string, rows: Array<[string, unknown]>, x: number, y: number, width: number, fixedHeight?: number) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  const height = Math.max(measureInfoBlockHeight(doc, rows, width), fixedHeight ?? 0);
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF.rule); doc.setLineDashPattern([1.2, 1.4], 0); doc.roundedRect(x, y, width, height, 3, 3, "FD"); doc.setLineDashPattern([], 0);
  // A clean backing strip prevents the dashed card border from showing
  // through or touching the section ribbon.
  doc.setFillColor(255, 255, 255); doc.rect(x + 2, y - .7, Math.min(width - 4, Math.max(45, title.length * 2.6 + 17)), 4, "F");
  drawSectionLabel(doc, title, x + 4, y + 5.5);
  let rowY = y + 16; visible.forEach(([label, value]) => { const lines = doc.splitTextToSize(String(value), width - 35).slice(0, 3); doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...PDF.ink); doc.text(label, x + 5, rowY); doc.setTextColor(...PDF.rose); doc.text(":", x + 29, rowY); doc.setFont("helvetica", "normal"); doc.setFontSize(8.4); doc.setTextColor(...PDF.ink); doc.text(lines, x + 33, rowY); rowY += Math.max(6, lines.length * 4.4); }); return y + height;
}
export function drawTableHeader(doc: jsPDF, y: number, labels: PdfColumn[]) {
  doc.setFillColor(...PDF.wine); doc.roundedRect(PDF.left, y, PDF.right - PDF.left, 12.5, 2.3, 2.3, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8); labels.forEach(({ text, x, align }) => doc.text(text, x, y + 8, align ? { align } : undefined)); return y + 12.5;
}
export function drawTableRowBackground(doc: jsPDF, y: number, height: number, alternate: boolean) {
  if (alternate) { doc.setFillColor(...PDF.pale); doc.rect(PDF.left, y, PDF.right - PDF.left, height, "F"); } doc.setDrawColor(...PDF.rule); doc.setLineDashPattern([1, .8], 0); doc.line(PDF.left, y + height, PDF.right, y + height); doc.setLineDashPattern([], 0);
}
export function drawTotalsPanel(doc: jsPDF, y: number, rows: TotalRow[]) {
  const x = 103, width = PDF.right - x; const height = rows.reduce((sum, row) => sum + (row.kind === "grand" ? 13 : row.kind === "balance" ? 8 : 6.5), 0) + 5; let rowY = y + 6;
  rows.forEach((row) => { if (row.kind === "grand") { doc.setFillColor(...PDF.blush); doc.setDrawColor(...PDF.rose); doc.setLineDashPattern([1.2, 1], 0); doc.roundedRect(x, rowY - 5, width, 11, 2, 2, "FD"); doc.setLineDashPattern([], 0); }
    doc.setFont("helvetica", row.kind ? "bold" : "normal"); doc.setFontSize(row.kind === "grand" ? 12 : row.kind === "balance" ? 9.5 : 8.5); const color: readonly [number, number, number] = row.kind === "advance" ? PDF.green : row.kind === "balance" ? PDF.orange : row.kind === "discount" ? PDF.rose : row.kind === "grand" ? PDF.wine : PDF.ink; doc.setTextColor(color[0], color[1], color[2]); doc.text(row.label.toUpperCase(), x + 5, rowY); doc.text(money(row.value), PDF.right - 5, rowY, { align: "right" }); rowY += row.kind === "grand" ? 13 : row.kind === "balance" ? 8 : 6.5; }); return y + height;
}
export function drawBakeryMessage(doc: jsPDF, y: number) {
  drawSectionLabel(doc, "A sweet note", PDF.left + 3, y + 5.5);
  drawCake(doc, PDF.left + 5, y + 16, 1.05);
  doc.setFont("times", "bolditalic"); doc.setFontSize(13); doc.setTextColor(...PDF.wine); doc.text("Thank you for", PDF.left + 42, y + 20);
  doc.text("choosing MagliShe!", PDF.left + 42, y + 27);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...PDF.muted);
  doc.text("Made with love, just for you.", PDF.left + 42, y + 34);
}
export function drawFooter(doc: jsPDF, company?: CompanyConfig) {
  const pageCount = doc.getNumberOfPages(); for (let page = 1; page <= pageCount; page += 1) { doc.setPage(page);
    if (page === pageCount) { doc.setDrawColor(...PDF.rule); doc.setLineDashPattern([1.4, 1], 0); doc.line(PDF.left + 4, 268, PDF.right - 4, 268); doc.setLineDashPattern([], 0); drawCake(doc, 19, 273, .62); doc.setFont("times", "bolditalic"); doc.setFontSize(10); doc.setTextColor(...PDF.wine); doc.text("Thank you for choosing MagliShe!", 53, 276); doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(...PDF.ink); const social = [company?.website || company?.url, company?.mobile, company?.email].filter(Boolean).join("  |  "); if (social) doc.text(doc.splitTextToSize(social, 68)[0], 53, 282); doc.setFillColor(...PDF.blush); doc.setDrawColor(...PDF.rule); doc.roundedRect(128, 272, 67, 14, 2, 2, "FD"); heart(doc, 132, 275, .8); doc.setFont("times", "bolditalic"); doc.setFontSize(9); doc.setTextColor(...PDF.wine); doc.text("We hope to serve you again!", 161.5, 278, { align: "center" }); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text("VISIT AGAIN!", 161.5, 283, { align: "center" }); }
    doc.setFillColor(...PDF.blush); doc.rect(1.5, 289, 207, 6, "F"); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...PDF.wine); doc.text("This is a system generated document. No signature required.", 105, 293, { align: "center" }); doc.setFontSize(5.8); doc.text(`Page ${page} of ${pageCount}`, 196, 293, { align: "right" }); }
}

