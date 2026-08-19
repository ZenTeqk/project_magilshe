import type { jsPDF } from "jspdf";
import type { CompanyConfig } from "@/features/crm/quotations-hooks";

export const PDF = { left: 14, right: 196, bottom: 282, terracotta: [181, 91, 65] as const };
let logoDataPromise: Promise<string | undefined> | undefined;

export function loadBrandLogo() {
  logoDataPromise ??= fetch("/logo.png").then((response) => response.blob()).then((blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(() => undefined);
  return logoDataPromise;
}
export const displayDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-IN") : "-";
export const money = (value: unknown) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function drawHeader(doc: jsPDF, title: string, numberLabel: string, number: string, date: string, company?: CompanyConfig, logoData?: string) {
  const brand = company?.name || "MagliShe Bakery";
  doc.setFillColor(46, 43, 41); doc.rect(0, 0, 210, 39, "F");
  if (logoData) try { doc.addImage(logoData, "PNG", PDF.left, 5, 30, 27, undefined, "FAST"); } catch { /* branded text fallback */ }
  const brandX = logoData ? 47 : PDF.left;
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(brand, brandX, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  const contact = [company?.company_address, company?.mobile, company?.email, company?.website || company?.url].filter(Boolean).join(" | ");
  if (contact) doc.text(doc.splitTextToSize(contact, 90).slice(0, 3), brandX, 17);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(title, PDF.right, 13, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${numberLabel}: ${number || "-"}`, PDF.right, 21, { align: "right" }); doc.text(`Date: ${displayDate(date)}`, PDF.right, 27, { align: "right" }); doc.setTextColor(46, 43, 41);
}
export function drawTableHeader(doc: jsPDF, y: number, labels: Array<{ text: string; x: number; align?: "left" | "right" | "center" }>) {
  doc.setFillColor(...PDF.terracotta); doc.rect(PDF.left, y, PDF.right - PDF.left, 9, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  labels.forEach(({ text, x, align }) => align ? doc.text(text, x, y + 5.8, { align }) : doc.text(text, x, y + 5.8)); doc.setTextColor(46, 43, 41); return y + 9;
}
export function drawFooter(doc: jsPDF, company?: CompanyConfig) {
  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page); doc.setDrawColor(...PDF.terracotta); doc.line(PDF.left, 286, PDF.right, 286); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(90, 87, 84);
    const details = [company?.name || "MagliShe Bakery", company?.company_address, company?.mobile, company?.email].filter(Boolean).join(" | ");
    doc.text(doc.splitTextToSize(details, 145)[0] || "MagliShe Bakery", PDF.left, 291); doc.text("Thank you for choosing MagliShe.", PDF.right, 291, { align: "right" });
  }
}
