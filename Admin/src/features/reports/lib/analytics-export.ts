import { jsPDF } from "jspdf";
import type { CrmAnalyticsResponse } from "@/features/dashboard/hooks";
import type { DateRange } from "@/features/reports/reports-hooks";

export type AnalyticsExportRow = Record<string, string | number>;

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Content-equivalent to Admin/src/components/Reports/Analytics/ReportsAnalytics.jsx
 * exportRows()/exportCsv()/exportExcel()/exportPdf(): old Admin exported the
 * flat table for the Customers/Products/Timeline tabs (which already have a
 * DataTable) and a funnel + revenue summary for every other tab. xlsx is
 * dropped in favour of a plain CSV per this pass's constraints — it opens in
 * Excel/Sheets the same way without adding a dependency.
 */
export function buildAnalyticsExportRows(
  tab: string,
  data: CrmAnalyticsResponse | undefined,
  funnel: CrmAnalyticsResponse["funnel"],
  revenue: CrmAnalyticsResponse["revenue"] | undefined,
): AnalyticsExportRow[] {
  const flat =
    tab === "Customers"
      ? (data?.customers ?? [])
      : tab === "Products"
        ? (data?.products ?? [])
        : tab === "Timeline"
          ? (data?.timeline ?? [])
          : [];
  if (flat.length) return flat as unknown as AnalyticsExportRow[];

  const funnelRows: AnalyticsExportRow[] = funnel.map((row) => ({
    section: "Funnel",
    key: row.key,
    label: row.label,
    value: row.value,
    conversion: row.conversion,
    drop_off: row.drop_off,
  }));
  const revenueRows: AnalyticsExportRow[] = Object.entries(revenue ?? {})
    .filter(([, value]) => typeof value !== "object")
    .map(([metric, value]) => ({ section: "Revenue", metric, value: value as string | number }));
  return [...funnelRows, ...revenueRows];
}

/** Exports the currently-displayed rows (already filtered by the applied date range) as a CSV file. */
export function exportAnalyticsCsv(rows: AnalyticsExportRow[], filename = "crm-report.csv") {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","),
    ),
  ].join("\n");
  downloadBlob(csv, "text/csv;charset=utf-8;", filename);
}

/**
 * Simple, text-only PDF: title, the applied date range, and the same rows
 * visible on screen for the active tab — no attempt at pixel-perfect chart
 * rendering, matching the task's PDF scope. Layout style follows
 * src/features/crm/lib/invoice-pdf.ts (pt units, A4, helvetica).
 */
export function buildAnalyticsPdf(tab: string, range: DateRange, rows: AnalyticsExportRow[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 50;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`CRM ${tab} Report`, margin, y);

  y += 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`${range.from_date} to ${range.to_date}`, margin, y);
  doc.setTextColor(20);

  y += 20;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  if (rows.length === 0) {
    doc.setFontSize(11);
    doc.text("No data in this period.", margin, y);
    return doc;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  doc.setFontSize(9);
  for (const row of rows) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
    const line = headers.map((key) => `${key}: ${row[key] ?? ""}`).join("  |  ");
    doc.text(line, margin, y, { maxWidth: pageWidth - margin * 2 });
    y += 16;
  }

  return doc;
}
