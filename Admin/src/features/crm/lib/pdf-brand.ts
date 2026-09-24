import type { jsPDF } from "jspdf";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";

export const PDF = {
  left: 10, right: 200, bottom: 267,
  wine: [143, 13, 50] as const, magenta: [190, 28, 75] as const,
  rose: [225, 72, 113] as const, blush: [253, 241, 246] as const,
  pale: [255, 250, 252] as const, ink: [36, 32, 33] as const,
  muted: [103, 93, 96] as const, rule: [236, 180, 198] as const,
  green: [31, 143, 69] as const, orange: [188, 103, 18] as const,
};

export type PdfColumn = { text: string; x: number; align?: "left" | "right" | "center" };
export type TotalRow = { label: string; value: unknown; kind?: "grand" | "balance" | "advance" | "discount" | "muted" };

let logoDataPromise: Promise<string | undefined> | undefined;

const DEFAULT_COMPANY = {
  address: "No 1/2, Janakiraman st, 83rd St, Muthurangam Block, West Jafferkhanpet, Chennai,Tamil Nadu 600083.",
  mobile: "9940427774",
  website: "https://magilshe.com/home",
};

export function loadBrandLogo() {
  logoDataPromise ??= fetch("/logo.png").then((r) => r.blob()).then((blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
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
  return String(value ?? "").trim() || "-";
};

function drawBrandFallback(doc: jsPDF, company?: CompanyConfig) {
  doc.setFont("times", "bolditalic");
  doc.setFontSize(31);
  doc.setTextColor(...PDF.wine);
  doc.text(company?.name || "Magilshe", 105, 23, { align: "center" });
  drawCakesMore(doc, 36);
}

function drawCakeIcon(doc: jsPDF, x: number, y: number) {
  const cx = x + 23;
  doc.setDrawColor(...PDF.wine);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.55);
  doc.roundedRect(x + 6, y + 22, 34, 8.6, 2.2, 2.2, "FD");
  doc.setFillColor(...PDF.blush);
  doc.roundedRect(x + 10.5, y + 13, 25, 10.5, 2.4, 2.4, "FD");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 16, y + 5, 14, 9.4, 2.3, 2.3, "FD");
  doc.setFillColor(...PDF.rose);
  doc.circle(cx, y + 1.2, 2.8, "F");
  doc.setDrawColor(...PDF.rose);
  doc.setLineWidth(0.45);
  doc.line(cx, y - 1.6, cx + 1.8, y - 7.2);
  doc.setDrawColor(...PDF.wine);
  doc.setLineWidth(0.4);
  doc.line(x + 8, y + 26, x + 38, y + 26);
  doc.line(x + 13, y + 18, x + 33, y + 18);
  doc.setFillColor(...PDF.rose);
  [14.8, 23, 31.2].forEach((dotX) => doc.circle(x + dotX, y + 16.2, 0.72, "F"));
  [12.5, 19.5, 26.5, 33.5].forEach((heartX) => {
    doc.circle(x + heartX - 0.62, y + 28.8, 0.54, "F");
    doc.circle(x + heartX + 0.62, y + 28.8, 0.54, "F");
    doc.triangle(x + heartX - 1.25, y + 29, x + heartX + 1.25, y + 29, x + heartX, y + 30.6, "F");
  });
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.45);
  doc.line(x + 7, y + 33.7, x + 39, y + 33.7);
}

function drawCakesMore(doc: jsPDF, y: number) {
  doc.setDrawColor(...PDF.rose);
  doc.setLineWidth(0.45);
  doc.line(54, y - 0.8, 72, y - 0.8);
  doc.line(138, y - 0.8, 156, y - 0.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setCharSpace(1.2);
  doc.setTextColor(...PDF.wine);
  doc.text("CAKES & MORE", 105, y, { align: "center" });
  doc.setCharSpace(0);
}

export function drawDocumentHeader(doc: jsPDF, title: string, numberLabel: string, number: string, date: string, company?: CompanyConfig, logoData?: string, continuation = false) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");
  doc.setDrawColor(...PDF.wine);
  doc.setLineWidth(0.35);
  doc.rect(1.3, 1.3, 207.4, 294.4);
  doc.setFillColor(...PDF.wine);
  doc.rect(0, 0, 210, 2.4, "F");

  if (continuation) {
    if (logoData) try { doc.addImage(logoData, "PNG", PDF.left, 7, 31, 20, undefined, "FAST"); } catch { /* compact text fallback below */ }
    doc.setFont("times", "bolditalic");
    doc.setFontSize(18);
    doc.setTextColor(...PDF.wine);
    doc.text(company?.name || "Magilshe", 48, 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setCharSpace(0.8);
    doc.text("CAKES & MORE", 49, 24);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PDF.wine);
    doc.text(`${title} CONTINUED`, PDF.right, 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF.muted);
    doc.text(`${numberLabel}: ${safeText(number)}  |  ${displayDate(date)}`, PDF.right, 23, { align: "right" });
    doc.setDrawColor(...PDF.rule);
    doc.line(PDF.left, 32, PDF.right, 32);
    return 39;
  }

  doc.setFillColor(...PDF.pale);
  doc.rect(2, 2.5, 206, 66, "F");
  drawCakeIcon(doc, PDF.left + 1, 14);

  if (logoData) try { doc.addImage(logoData, "PNG", 77, 4, 56, 35, undefined, "FAST"); } catch { drawBrandFallback(doc, company); }
  else drawBrandFallback(doc, company);
  if (logoData) {
    drawCakesMore(doc, 46);
  }

  const address = safeText(company?.company_address, DEFAULT_COMPANY.address).replace(/\s+/g, " ").trim();
  const contact = [
    safeText(company?.mobile, DEFAULT_COMPANY.mobile),
    safeText(company?.website || company?.url, DEFAULT_COMPANY.website),
    safeText(company?.email, ""),
  ].filter(Boolean).join("  |  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.setTextColor(...PDF.ink);
  if (address) doc.text(doc.splitTextToSize(address, 154).slice(0, 1), 105, 55, { align: "center" });
  if (contact) doc.text(doc.splitTextToSize(contact, 154).slice(0, 1), 105, 61, { align: "center" });
  if (company?.gst_number) {
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${company.gst_number}`, 105, 67, { align: "center" });
  }

  doc.setFont("times", "bolditalic");
  doc.setFontSize(10);
  doc.setTextColor(...PDF.ink);
  doc.text("Made with love,", PDF.right - 9, 23, { align: "right" });
  doc.setTextColor(...PDF.rose);
  doc.text("just for you!", PDF.right - 9, 32, { align: "right" });
  doc.setFillColor(...PDF.rose);
  doc.circle(PDF.right - 13, 41, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF.wine);
  doc.text(title, PDF.left + 1, 79);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF.muted);
  doc.text(`${numberLabel}: ${safeText(number)}`, PDF.right - 2, 75, { align: "right" });
  doc.text(`Date: ${displayDate(date)}`, PDF.right - 2, 80, { align: "right" });
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.3);
  doc.line(PDF.left + 5, 85, PDF.right - 5, 85);
  return 90;
}

export function drawSectionLabel(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF.wine);
  doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...PDF.rose);
  doc.setLineWidth(0.45);
  doc.line(x, y + 2, x + Math.max(28, text.length * 1.85), y + 2);
}

export function measureInfoBlockHeight(doc: jsPDF, rows: Array<[string, unknown]>, width: number) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  const heights = visible.map(([, value]) => Math.max(4.8, Math.min(3, doc.splitTextToSize(String(value), width - 43).length) * 3.8));
  return Math.max(34, 16 + heights.reduce((a, b) => a + b, 0));
}

export function drawInfoBlock(doc: jsPDF, title: string, rows: Array<[string, unknown]>, x: number, y: number, width: number, fixedHeight?: number) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  const height = Math.max(measureInfoBlockHeight(doc, rows, width), fixedHeight ?? 0);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  drawSectionLabel(doc, title, x + 5, y + 8);
  let rowY = y + 17;
  visible.forEach(([label, value]) => {
    const lines = doc.splitTextToSize(String(value), width - 45).slice(0, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(...PDF.ink);
    doc.text(label, x + 5, rowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.7);
    doc.setTextColor(...PDF.ink);
    doc.text(lines, x + 37, rowY);
    rowY += Math.max(4.8, lines.length * 3.8);
  });
  return y + height;
}

export function drawTableHeader(doc: jsPDF, y: number, labels: PdfColumn[]) {
  doc.setFillColor(...PDF.wine);
  doc.rect(PDF.left, y, PDF.right - PDF.left, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  labels.forEach(({ text, x, align }) => doc.text(text, x, y + 7.1, align ? { align } : undefined));
  return y + 11;
}

export function drawTableRowBackground(doc: jsPDF, y: number, height: number, alternate: boolean) {
  if (alternate) {
    doc.setFillColor(...PDF.pale);
    doc.rect(PDF.left, y, PDF.right - PDF.left, height, "F");
  }
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.25);
  doc.line(PDF.left, y + height, PDF.right, y + height);
}

export function drawTotalsPanel(doc: jsPDF, y: number, rows: TotalRow[]) {
  const x = 104;
  const width = PDF.right - x;
  const height = rows.reduce((sum, row) => sum + (row.kind === "grand" ? 11.5 : row.kind === "balance" ? 6.8 : 5.6), 0) + 4;
  let rowY = y + 5.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF.rule);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  rows.forEach((row) => {
    if (row.kind === "grand") {
      doc.setDrawColor(...PDF.rose);
      doc.setLineWidth(0.35);
      doc.line(x + 5, rowY - 4.8, x + width - 5, rowY - 4.8);
    }
    doc.setFont("helvetica", row.kind ? "bold" : "normal");
    doc.setFontSize(row.kind === "grand" ? 11 : row.kind === "balance" ? 8.4 : 8);
    const color: readonly [number, number, number] = row.kind === "advance" ? PDF.green : row.kind === "balance" ? PDF.orange : row.kind === "discount" ? PDF.rose : row.kind === "grand" ? PDF.wine : PDF.ink;
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(row.label.toUpperCase(), x + 5, rowY);
    doc.text(money(row.value), PDF.right - 5, rowY, { align: "right" });
    rowY += row.kind === "grand" ? 11.5 : row.kind === "balance" ? 6.8 : 5.6;
  });
  return y + height;
}

export function drawBakeryMessage(doc: jsPDF, y: number) {
  doc.setFont("times", "bolditalic");
  doc.setFontSize(13);
  doc.setTextColor(...PDF.ink);
  doc.text("Thank you for", PDF.left + 3, y + 10);
  doc.text("choosing", PDF.left + 9, y + 17);
  doc.setFontSize(14);
  doc.setTextColor(...PDF.rose);
  doc.text("Magilshe!", PDF.left + 4, y + 25);
}

export function drawFooter(doc: jsPDF, company?: CompanyConfig) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    if (page === pageCount) {
      doc.setDrawColor(...PDF.rule);
      doc.setLineDashPattern([1.3, 1.3], 0);
      doc.line(PDF.left + 4, 268, PDF.right - 4, 268);
      doc.setLineDashPattern([], 0);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...PDF.rule);
      doc.roundedRect(114, 270, 78, 14, 2, 2, "FD");
      doc.setFont("times", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(...PDF.wine);
      doc.text(company?.greeting_text || "We hope to serve you again!", 153, 276, { align: "center" });
      doc.setFillColor(...PDF.magenta);
      doc.rect(132, 279, 42, 3.8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.3);
      doc.setTextColor(255, 255, 255);
      doc.text("VISIT AGAIN!", 153, 282);
    }
    doc.setDrawColor(...PDF.rule);
    doc.setLineWidth(0.2);
    doc.line(PDF.left, 288, PDF.right, 288);
    doc.setFillColor(...PDF.blush);
    doc.rect(1.5, 289, 207, 5.2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF.wine);
    const contact = [company?.website || company?.url, company?.mobile, company?.email].filter(Boolean).join("  |  ");
    doc.text(contact || "This is a system generated document. No signature required.", 105, 292.5, { align: "center" });
    doc.text(`Page ${page} of ${pageCount}`, PDF.right - 2, 292.5, { align: "right" });
  }
}
