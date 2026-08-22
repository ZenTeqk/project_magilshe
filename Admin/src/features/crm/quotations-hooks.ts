import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { Lead } from "@/features/crm/hooks";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}

const quotationKey = (id: string | number) => ["crm", "quotation", String(id)] as const;

/* -------------------------------------------------------------------- */
/* Quotations                                                            */
/* -------------------------------------------------------------------- */

export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Advance Received",
  "Order Confirmed",
  "Rejected",
  "Expired",
  "Cancelled",
  "Closed",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export type QuotationItem = {
  id?: string | number;
  item_name: string;
  description: string | null;
  flavour: string | null;
  weight: string | null;
  quantity: number;
  rate: string | number;
  gst_percentage: string | number;
  sort_order?: number;
};

export type QuotationPayment = {
  id: string | number;
  amount: string | number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string | null;
  customer_remarks: string | null;
  proof: string | null;
  collected_by_name: string | null;
  created_on: string;
};

export type QuotationActivity = {
  id: string | number;
  action: string;
  description: string;
  staff_name: string;
  created_on: string;
};

export type QuotationListItem = {
  id: string | number;
  quotation_no: string;
  lead: number | null;
  lead_no: string | null;
  customer_name: string;
  phone: string;
  event_date: string;
  cake_type: string;
  total_amount: string | number;
  advance_received: boolean;
  advance_amount: string | number;
  balance_amount: string | number;
  status: QuotationStatus;
  created_on: string;
  updated_on: string;
};

export type Quotation = QuotationListItem & {
  customer: number | null;
  email: string | null;
  billing_address: string | null;
  billing_selected_address: number | null;
  shipping_same_as_billing: boolean;
  address: string | null;
  selected_address: number | null;
  cake: number | null;
  cake_type: string;
  flavour: string | null;
  quantity: number;
  notes: string | null;
  rate: string | number | null;
  gst_enabled: boolean;
  gst_percentage: string | number;
  subtotal: string | number;
  gst_amount: string | number;
  discount_amount: string | number;
  payment_terms: string | null;
  valid_until: string | null;
  occasion: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_type: string | null;
  special_instructions: string | null;
  payment_date: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  items: QuotationItem[];
  payments: QuotationPayment[];
  quotation_activities: QuotationActivity[];
  lead_details: Lead | null;
  order_id: number | null;
};

export type QuotationListParams = { search?: string; status?: string };

export function useQuotations() {
  return useQuery({
    queryKey: ["crm", "quotations"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.quotations);
      return unwrapList<QuotationListItem>(data);
    },
  });
}

export function useQuotationsPending() {
  return useQuery({
    queryKey: ["crm", "quotations", "pending"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.quotationsPending);
      return unwrapList<Lead>(data);
    },
  });
}

export function useQuotation(id: string | number | undefined) {
  return useQuery({
    queryKey: id === undefined ? ["crm", "quotation", "new"] : quotationKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Quotation>(endpoints.crm.quotation(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

function invalidateQuotation(queryClient: ReturnType<typeof useQueryClient>, id?: string | number) {
  queryClient.invalidateQueries({ queryKey: ["crm", "quotations"] });
  queryClient.invalidateQueries({ queryKey: ["crm", "quotations", "pending"] });
  queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
  if (id !== undefined) queryClient.invalidateQueries({ queryKey: quotationKey(id) });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<Quotation>(endpoints.crm.quotations, payload);
      return data;
    },
    onSuccess: () => invalidateQuotation(queryClient),
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Record<string, unknown>;
    }) => {
      const { data } = await apiClient.patch<Quotation>(endpoints.crm.quotation(id), payload);
      return data;
    },
    onSuccess: (data) => invalidateQuotation(queryClient, data.id),
  });
}

export function useQuotationWorkflowAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string | number;
      action: "send" | "accept" | "cancel";
    }) => {
      const { data } = await apiClient.post<Quotation>(endpoints.crm.quotationWorkflowAction(id), {
        action,
      });
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(quotationKey(id), data);
      invalidateQuotation(queryClient, id);
    },
  });
}

export type RecordQuotationPaymentInput = {
  id: string | number;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string;
  customer_remarks?: string;
  proof?: File;
};

export function useRecordQuotationPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: RecordQuotationPaymentInput) => {
      const form = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "")
          form.append(key, value as string | Blob);
      });
      const { data } = await apiClient.post<Quotation>(
        endpoints.crm.quotationRecordPayment(id),
        form,
      );
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(quotationKey(id), data);
      invalidateQuotation(queryClient, id);
    },
  });
}

export function useConfirmQuotationOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await apiClient.post(endpoints.crm.quotationConfirmOrder(id));
      return data as { message: string; data: { id: number; order_no: string } };
    },
    onSuccess: (_data, id) => invalidateQuotation(queryClient, id),
  });
}

export function useSaveCustomerAddress() {
  return useMutation({
    mutationFn: async (payload: {
      customer: number;
      title: string;
      address: string;
      city?: string;
      pincode?: string;
      is_primary?: boolean;
    }) => {
      const { data } = await apiClient.post(endpoints.crm.quotationSaveCustomerAddress, payload);
      return data as {
        id: number;
        title: string;
        address: string;
        city: string;
        pincode: string;
        is_primary: boolean;
      };
    },
  });
}

/* -------------------------------------------------------------------- */
/* Company configuration (for quotation "From" block + PDF header)      */
/* -------------------------------------------------------------------- */

export type CompanyConfig = {
  name: string;
  company_address: string;
  mobile: string;
  email: string;
  gst_number: string;
  url: string | null;
  website: string | null;
  greeting_text: string | null;
  return_policy: string | null;
};

export function useCompanyConfig() {
  return useQuery({
    queryKey: ["configuration"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.configuration.get);
      return (data?.data ?? data) as CompanyConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}
