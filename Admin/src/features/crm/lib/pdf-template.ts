import type { CrmInvoice } from "@/features/crm/invoices-hooks";
import type { CompanyConfig, Quotation } from "@/features/crm/quotations-hooks";
import { buildInvoicePdf as buildInvoicePdfV1 } from "./invoice-pdf-v1";
import { buildInvoicePdf as buildInvoicePdfV2 } from "./invoice-pdf";
import { buildQuotationPdf as buildQuotationPdfV1 } from "./quotation-pdf-v1";
import { buildQuotationPdf as buildQuotationPdfV2 } from "./quotation-pdf";

export type PdfTemplateVersion = "v1" | "v2";

const configuredVersion = (import.meta.env["VITE_ACTIVE_PDF_TEMPLATE"] || "v2").toLowerCase();
export const ACTIVE_PDF_TEMPLATE: PdfTemplateVersion = configuredVersion === "v1" ? "v1" : "v2";

export function buildInvoicePdf(invoice: CrmInvoice, company?: CompanyConfig, brandLogo?: string) {
  return ACTIVE_PDF_TEMPLATE === "v1"
    ? buildInvoicePdfV1(invoice, company, brandLogo)
    : buildInvoicePdfV2(invoice, company, brandLogo);
}

export function buildQuotationPdf(quotation: Quotation, company?: CompanyConfig, brandLogo?: string) {
  return ACTIVE_PDF_TEMPLATE === "v1"
    ? buildQuotationPdfV1(quotation, company, brandLogo)
    : buildQuotationPdfV2(quotation, company, brandLogo);
}
