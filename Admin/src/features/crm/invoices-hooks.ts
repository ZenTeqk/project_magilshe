import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { CrmOrderItem } from "@/features/crm/orders-hooks";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}
const invoiceKey = (id: string | number) => ["crm", "invoice", String(id)] as const;

/** Matches API-Server/crm/models.py CRMInvoice.STATUS_CHOICES exactly. */
export const INVOICE_STATUSES = ["Generated", "Issued", "Paid", "Closed"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoicePayment = {
  id: string | number;
  amount: string | number;
  payment_method: string;
  payment_date: string;
  collected_by_name: string | null;
  proof: string | null;
};

export type CrmInvoice = {
  id: string | number;
  invoice_no: string;
  order: number;
  order_no: string;
  quotation_no: string;
  customer: number | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
  event_date: string | null;
  subtotal: string | number;
  gst_amount: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  amount_paid: string | number;
  balance_amount: string | number;
  status: InvoiceStatus;
  generated_on: string;
  updated_on: string;
  items: CrmOrderItem[];
  payments: InvoicePayment[];
  timeline: Array<{ id: string | number; action: string; description: string; staff_name: string; created_on: string }>;
};

export function useInvoices() {
  return useQuery({
    queryKey: ["crm", "invoices"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.invoices);
      return unwrapList<CrmInvoice>(data);
    },
  });
}

export function useInvoice(id: string | number | undefined) {
  return useQuery({
    queryKey: id === undefined ? ["crm", "invoice", "new"] : invoiceKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<CrmInvoice>(endpoints.crm.invoice(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

function invalidateInvoice(queryClient: ReturnType<typeof useQueryClient>, id?: string | number) {
  queryClient.invalidateQueries({ queryKey: ["crm", "invoices"] });
  queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["reports", "crm-analytics"] });
  if (id !== undefined) queryClient.invalidateQueries({ queryKey: invoiceKey(id) });
}

export type RecordInvoicePaymentInput = {
  id: string | number;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  customer_remarks?: string;
  proof?: File;
};

export function useRecordInvoicePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: RecordInvoicePaymentInput) => {
      const form = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") form.append(key, value as string | Blob);
      });
      const { data } = await apiClient.post<CrmInvoice>(endpoints.crm.invoiceRecordPayment(id), form);
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(invoiceKey(id), data);
      invalidateInvoice(queryClient, id);
    },
  });
}

export function usePaymentCompleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await apiClient.post<CrmInvoice>(endpoints.crm.invoicePaymentCompleted(id));
      return data;
    },
    onSuccess: (data, id) => {
      queryClient.setQueryData(invoiceKey(id), data);
      invalidateInvoice(queryClient, id);
    },
  });
}

export function useMoveToDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await apiClient.post(endpoints.crm.invoiceMoveToDelivery(id));
      return data as { message: string; data: { id: number; delivery_no: string } };
    },
    onSuccess: (_data, id) => invalidateInvoice(queryClient, id),
  });
}
