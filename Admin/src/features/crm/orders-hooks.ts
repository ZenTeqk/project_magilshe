import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import type { QuotationItem } from "@/features/crm/quotations-hooks";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}
const orderKey = (id: string | number) => ["crm", "order", String(id)] as const;

/**
 * Raw statuses match API-Server/crm/models.py CRMOrder.STATUS_CHOICES exactly.
 * "Production"/"Invoice Generated" are legacy aliases the old Admin collapses
 * for display only (displayStatus()) — the stored value is never rewritten.
 */
export const ORDER_STATUSES = [
  "Confirmed", "Production", "Processing", "Ready", "Out for Delivery", "Invoice Generated",
  "Invoice Pending", "Delivery", "Closed", "Delivered", "Completed", "Cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function displayOrderStatus(status: string): string {
  if (status === "Production") return "Processing";
  if (status === "Invoice Generated") return "Invoice Pending";
  return status;
}

export type CrmOrderItem = QuotationItem & { amount: string | number };

export type CrmOrder = {
  id: string | number;
  order_no: string;
  quotation: number;
  quotation_no: string;
  customer: number | null;
  customer_name: string;
  phone: string;
  cake_type: string;
  flavour: string | null;
  quantity: number;
  event_date: string | null;
  total_amount: string | number;
  advance_paid: string | number;
  balance_amount: string | number;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_method: string | null;
  delivery_notes: string | null;
  delivery_staff: number | null;
  delivery_staff_name: string | null;
  assigned_staff: number | null;
  assigned_staff_name: string | null;
  assigned_baker: number | null;
  assigned_baker_name: string | null;
  production_notes: string | null;
  special_instructions: string | null;
  status: OrderStatus;
  confirmed_by: number | null;
  confirmed_on: string;
  updated_on: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancelled_by_name: string | null;
  items: CrmOrderItem[];
  timeline: Array<{ id: string | number; action: string; description: string; staff_name: string; created_on: string }>;
};

export function useOrders() {
  return useQuery({
    queryKey: ["crm", "orders"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.orders);
      return unwrapList<CrmOrder>(data);
    },
  });
}

export function useOrder(id: string | number | undefined) {
  return useQuery({
    queryKey: id === undefined ? ["crm", "order", "new"] : orderKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<CrmOrder>(endpoints.crm.order(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

function invalidateOrder(queryClient: ReturnType<typeof useQueryClient>, id?: string | number) {
  queryClient.invalidateQueries({ queryKey: ["crm", "orders"] });
  queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
  if (id !== undefined) queryClient.invalidateQueries({ queryKey: orderKey(id) });
}

export function useUpdateOrderNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, production_notes }: { id: string | number; production_notes: string }) => {
      const { data } = await apiClient.patch<CrmOrder>(endpoints.crm.order(id), { production_notes });
      return data;
    },
    onSuccess: (data, { id }) => { queryClient.setQueryData(orderKey(id), data); invalidateOrder(queryClient, id); },
  });
}

export function useOrderWorkflowAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, cancellation_reason }: {
      id: string | number; action: "start_processing" | "mark_ready" | "cancel_order"; cancellation_reason?: string;
    }) => {
      const { data } = await apiClient.post<CrmOrder>(endpoints.crm.orderWorkflowAction(id), {
        action, ...(cancellation_reason ? { cancellation_reason } : {}),
      });
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(orderKey(id), data);
      invalidateOrder(queryClient, id);
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await apiClient.post(endpoints.crm.orderGenerateInvoice(id));
      return data as { message: string; data: { id: number; invoice_no: string } };
    },
    onSuccess: (_data, id) => invalidateOrder(queryClient, id),
  });
}

export type DirectOrderItem = { item_name: string; description?: string; flavour?: string; weight?: string; quantity: number; rate: number; gst_percentage: number };

export type CreateDirectOrderInput = {
  customer?: number | undefined;
  customer_name: string;
  phone: string;
  email?: string | undefined;
  billing_address?: string | undefined;
  cake_type: string;
  occasion?: string | undefined;
  event_date?: string | undefined;
  items: DirectOrderItem[];
  discount_amount?: string;
  advance_amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string | undefined;
  customer_remarks?: string | undefined;
};

export function useCreateDirectOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDirectOrderInput) => {
      const { data } = await apiClient.post(endpoints.crm.orderDirect, payload);
      return data as { message: string; data: CrmOrder };
    },
    onSuccess: () => invalidateOrder(queryClient),
  });
}
