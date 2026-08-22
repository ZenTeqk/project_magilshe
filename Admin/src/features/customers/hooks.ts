import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export type CrmCustomerSummary = {
  id: string | number;
  username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  addresses: CustomerAddress[];
  counts: {
    leads: number;
    quotations: number;
    orders: number;
    invoices: number;
    deliveries: number;
  };
  /** Excludes Cancelled orders — the project's "valid order" rule. */
  valid_order_count: number;
  /** DRF serializes Decimal aggregates as strings — always wrap with Number() before formatting. */
  total_revenue: number | string;
  last_order_date: string | null;
  /** valid_order_count > 1 — see MAGLISHE_ADMIN_STATUS.md for the exact rule. */
  is_returning_customer: boolean;
};

export type CustomerAddress = {
  id?: number;
  title: string;
  person_name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  is_primary: boolean;
  created_on?: string;
  updated_on?: string;
};

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in (data as Record<string, unknown>)) {
    return ((data as Record<string, unknown>)["results"] ?? []) as T[];
  }
  return [];
}

export function useCrmCustomers() {
  return useQuery({
    queryKey: ["crm", "customers"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.customers);
      return unwrapList<CrmCustomerSummary>(data);
    },
  });
}

export function useCrmCustomerAnalytics(params?: { from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: ["crm", "customer-analytics", params],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.customerAnalytics, { params });
      return unwrapList<CrmCustomerSummary>(data);
    },
  });
}

export type LeadHistoryRow = {
  id: number;
  lead_no: string;
  status: string;
  occasion: string | null;
  event_date: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  cake_type: string | null;
  flavour: string | null;
  quantity: number;
  created_on: string;
};
export type QuotationHistoryRow = {
  id: number;
  quotation_no: string;
  status: string;
  total_amount: number | string;
  created_on: string;
};
export type OrderHistoryRow = {
  id: number;
  order_no: string;
  status: string;
  total_amount: number | string;
  occasion: string | null;
  event_date: string | null;
  confirmed_on: string;
};
export type InvoiceHistoryRow = {
  id: number;
  invoice_no: string;
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_amount: number | string;
  generated_on: string;
};
export type DeliveryHistoryRow = {
  id: number;
  delivery_no: string;
  delivery_status: string;
  delivery_type: string;
  pickup_time: string | null;
  delivery_time: string | null;
  porter_time: string | null;
  created_on: string;
};
export type PaymentHistoryRow = {
  id: number;
  quotation_id: number;
  quotation__quotation_no: string;
  amount: number | string;
  payment_method: string;
  payment_date: string | null;
  created_on: string;
};
export type CommunicationHistoryRow = {
  id: number;
  channel: string;
  subject: string | null;
  message: string | null;
  staff_name: string | null;
  created_on: string;
};

export type PurchaseSummary = {
  total_orders: number;
  /** DRF serializes Decimal aggregates as strings — always wrap with Number() before formatting. */
  total_revenue: number | string;
  average_order_value: number | string;
  last_order_date: string | null;
  is_returning_customer: boolean;
  favourite_occasion: string | null;
  favourite_flavour: string | null;
};

export type CustomerRecurringEvent = {
  id: number;
  customer?: number;
  event_type: "Birthday" | "Anniversary" | "Wedding" | "Baby Shower" | "Corporate Event" | "Other";
  event_month: number;
  event_day: number;
  original_date: string;
  notes: string | null;
  reminder_days_before: number;
  last_reminder_sent_on: string | null;
  source_lead: number | null;
  next_occurrence: string;
  reminder_date: string;
  days_until: number;
  is_completed: boolean;
  status: "Upcoming" | "Reminder Due" | "Overdue" | "Completed";
  created_on: string;
  updated_on: string;
};

export type CrmCustomerDetail = CrmCustomerSummary & {
  history: {
    leads: LeadHistoryRow[];
    quotations: QuotationHistoryRow[];
    orders: OrderHistoryRow[];
    invoices: InvoiceHistoryRow[];
    deliveries: DeliveryHistoryRow[];
    payments: PaymentHistoryRow[];
    communications: CommunicationHistoryRow[];
  };
  recurring_events: CustomerRecurringEvent[];
  purchase_summary: PurchaseSummary;
};

export function useCrmCustomer(id: string | number | undefined) {
  return useQuery({
    queryKey: ["crm", "customer", id],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmCustomerDetail>(endpoints.crm.customer(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

/** Name (+ photo) only — `customer/update-profile/` doesn't accept email/phone. */
export type UpdateCustomerInput = {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  addresses: CustomerAddress[];
  delete_address_ids: number[];
};

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateCustomerInput) => {
      const { data } = await apiClient.patch<CrmCustomerSummary>(endpoints.crm.customer(id), payload);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["crm", "customer", variables.id], (current: CrmCustomerDetail | undefined) => current ? { ...current, ...data } : current);
      queryClient.setQueryData(["crm", "customers"], (current: CrmCustomerSummary[] | undefined) => current?.map((customer) => String(customer.id) === String(data.id) ? { ...customer, ...data } : customer));
      queryClient.invalidateQueries({ queryKey: ["crm", "customer", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    },
  });
}

export type CreateCustomerInput = Omit<UpdateCustomerInput, "id" | "delete_address_ids">;

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerInput) => {
      const { data } = await apiClient.post<CrmCustomerSummary>(endpoints.crm.customers, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CrmCustomerSummary[]>(["crm", "customers"], (current) =>
        current ? [data, ...current.filter((customer) => String(customer.id) !== String(data.id))] : [data],
      );
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "customer-analytics"] });
    },
  });
}

/* ---------------------------------------------------------------------- */
/* Customer Events / Occasions — crm/customer-events/ (CustomerRecurringEvent) */
/* ---------------------------------------------------------------------- */

export type SaveCustomerEventInput = {
  id?: number | undefined;
  customer: string | number;
  event_type: CustomerRecurringEvent["event_type"];
  event_date: string;
  notes: string;
  reminder_days_before: number;
};

export function useSaveCustomerEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCustomerEventInput) => {
      const { id, ...body } = payload;
      const { data } = id
        ? await apiClient.put<CustomerRecurringEvent>(endpoints.crm.customerEvent(id), body)
        : await apiClient.post<CustomerRecurringEvent>(endpoints.crm.customerEvents, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customer", variables.customer] });
    },
  });
}

export function useDeleteCustomerEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; customer: string | number }) => {
      await apiClient.delete(endpoints.crm.customerEvent(payload.id));
      return payload;
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customer", variables.customer] });
    },
  });
}

export function useCompleteCustomerEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; customer: string | number }) => {
      const { data } = await apiClient.post<CustomerRecurringEvent>(endpoints.crm.customerEventComplete(payload.id));
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customer", variables.customer] });
    },
  });
}

export type UpcomingCustomerEvent = CustomerRecurringEvent & {
  customer_id: number;
  customer_name: string;
  phone: string;
  email: string | null;
};

/** crm/customers/upcoming-events/ — cross-customer feed, used by dashboards/widgets. */
export function useUpcomingCustomerEvents(days = 30) {
  return useQuery({
    queryKey: ["crm", "customers", "upcoming-events", days],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: UpcomingCustomerEvent[] } | UpcomingCustomerEvent[]>(
        endpoints.crm.customerUpcomingEvents,
        { params: { days } },
      );
      return Array.isArray(data) ? data : (data.data ?? []);
    },
  });
}
