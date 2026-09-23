import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
    const results = record["results"];
    if (results && typeof results === "object") {
      const nested = results as Record<string, unknown>;
      if (Array.isArray(nested["data"])) return nested["data"] as T[];
    }
  }
  return [];
}

function dedupeNames(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = String(value ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
const leadKey = (id: string | number) => ["crm", "lead", String(id)] as const;

export type CrmDashboardResponse = {
  leads: { total: number; [status: string]: number };
  documents: { quotations: number; orders: number; invoices: number; deliveries: number };
  status_counts: {
    quotations: Record<string, number>; orders: Record<string, number>;
    invoices: Record<string, number>; deliveries: Record<string, number>;
  };
  actionable: { leads: number; follow_ups: number; quotations: number; orders: number; invoices: number; deliveries: number };
  actionable_statuses: {
    leads: string[]; follow_ups: string[]; quotations: string[];
    orders: string[]; invoices: string[]; deliveries: string[];
  };
  funnel: {
    total_leads: number;
    lead_only: number;
    moved_to_quotation: number;
    moved_to_order: number;
    moved_to_invoice: number;
    moved_to_delivery: number;
    completed: number;
    won_not_quoted: number;
    lost: number;
  };
  workflows: Array<{
    customer_name: string;
    lead_no: string;
    quotation_no: string | null;
    stage: string;
    status: string;
    target_id: string | number;
    updated_on: string;
  }>;
};

type DateRangeParams = { from_date?: string; to_date?: string };

export function useCrmDashboard(params?: DateRangeParams) {
  return useQuery({
    queryKey: ["crm", "dashboard", params],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmDashboardResponse>(endpoints.crm.crmDashboard, { params });
      return data;
    },
  });
}

export type FollowUpRow = {
  id: string | number;
  lead_no?: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  occasion?: string;
  status?: string;
  follow_up_notes?: string;
  follow_up_date?: string;
  follow_up_time?: string;
};

export type FollowUpsResponse = {
  results: FollowUpRow[];
  completed_results: FollowUpRow[];
  current_staff: string;
  summary: { today: number; overdue: number; completed_today: number; assigned_to_me: number };
};

export function useFollowUps(params?: DateRangeParams) {
  return useQuery({
    queryKey: ["crm", "follow-ups", params],
    queryFn: async () => {
      const { data } = await apiClient.get<FollowUpsResponse>(endpoints.crm.followUps, { params });
      return data;
    },
  });
}

export function useFollowUpNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string | number; note: string }) => {
      const { data } = await apiClient.post(endpoints.crm.followUpNote(id), { note });
      return data as { lead: Lead; activity: LeadActivity };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await apiClient.post(endpoints.crm.completeFollowUp(id));
      return data as { message: string; data: Lead };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

/* -------------------------------------------------------------------- */
/* Leads                                                                 */
/* -------------------------------------------------------------------- */

export const LEAD_STATUSES = ["Open", "Follow-up", "Won", "Lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Legal next statuses per current status — mirrors Admin/src/components/crm/Lead/Lead.jsx statusOptions(). */
export function leadStatusOptions(status: string): LeadStatus[] {
  if (status === "Open") return ["Follow-up", "Won", "Lost"];
  if (status === "Follow-up") return ["Won", "Lost"];
  return [];
}

export type LeadActivity = {
  id: string | number;
  action: string;
  description: string;
  staff_name: string;
  created_on: string;
};

export type LeadReferenceImage = {
  id: string | number;
  original_name: string;
  url: string;
  created_on: string;
};

export type Lead = {
  id: string | number;
  customer_id: number | null;
  lead_no: string;
  customer_name: string;
  phone: string;
  email: string | null;
  whatsapp_number: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  occasion: string;
  event_date: string;
  event_notes: string | null;
  cake: number | null;
  cake_name: string | null;
  cake_type: string;
  flavour: string | null;
  shape: string | null;
  weight: string | null;
  quantity: number;
  unit_type: import("@/features/crm/sale-units").SaleUnit;
  theme: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_type: string | null;
  delivery_address: string | null;
  budget: string | null;
  estimated_amount: string | null;
  cake_message: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  status: LeadStatus;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_notes: string | null;
  lead_source: string | null;
  lead_source_details: string | null;
  staff_remarks: string | null;
  winning_reason: string | null;
  loss_reason: string | null;
  internal_sales_notes: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  quotation_id: number | null;
  created_on: string;
  updated_on: string;
  activities?: LeadActivity[];
  reference_images?: LeadReferenceImage[];
};

export type LeadListParams = {
  search?: string;
  status?: string;
  occasion?: string;
  cake_type?: string;
  event_date?: string;
  created_date?: string;
  from_date?: string;
  to_date?: string;
  action_required?: boolean;
  archived?: boolean;
};

export function useLeads(params: LeadListParams = {}) {
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  return useQuery({
    queryKey: ["crm", "leads", cleaned],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.leads, { params: cleaned });
      return unwrapList<Lead>(data);
    },
  });
}

export function useLead(id: string | number | undefined) {
  return useQuery({
    queryKey: id === undefined ? ["crm", "lead", "new"] : leadKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Lead>(endpoints.crm.lead(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

/** Strips computed/read-only fields and converts "" to null, matching LeadForm.jsx's submit payload transform exactly. */
export function toLeadPayload(form: Record<string, unknown>) {
  const omit = new Set([
    "id",
    "lead_no",
    "cake_name",
    "assigned_to_name",
    "quotation_id",
    "activities",
    "reference_images",
    "created_on",
    "created_by",
    "updated_by",
    "updated_on",
    "rate",
  ]);
  const payload = Object.fromEntries(
    Object.entries(form)
      .filter(([key]) => !omit.has(key))
      .map(([key, value]) => [key, value === "" ? null : value]),
  );
  if (payload["lead_source"] === null) delete payload["lead_source"];
  return payload;
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<Lead>(endpoints.crm.leads, toLeadPayload(payload));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Record<string, unknown>;
    }) => {
      const { data } = await apiClient.patch<Lead>(endpoints.crm.lead(id), toLeadPayload(payload));
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(leadKey(id), data);
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: leadKey(id) });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "follow-ups"] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(endpoints.crm.lead(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

export function useRestoreLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.post(endpoints.crm.leadRestore(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

export function usePermanentDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(endpoints.crm.leadPermanentDelete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, markWon = false }: { id: string | number; markWon?: boolean }) => {
      const { data } = await apiClient.post(endpoints.crm.leadConvert(id), { mark_won: markWon });
      return data as { message: string; data: { quotation_no: string; id: number }; lead: Lead };
    },
    onSuccess: (result, { id }) => {
      queryClient.setQueryData(leadKey(id), result.lead);
      queryClient.invalidateQueries({ queryKey: leadKey(id) });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "quotations"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

export function useUploadLeadReferenceImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: string | number; files: File[] }) => {
      const form = new FormData();
      files.forEach((file) => form.append("images", file));
      const { data } = await apiClient.post(endpoints.crm.leadReferenceImages(id), form);
      return data as { data: LeadReferenceImage[] };
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKey(id) });
    },
  });
}

export function useDeleteLeadReferenceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      imageId,
    }: {
      leadId: string | number;
      imageId: string | number;
    }) => {
      await apiClient.delete(endpoints.crm.leadReferenceImage(leadId, imageId));
    },
    onSuccess: (_data, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: leadKey(leadId) });
    },
  });
}

export function useLeadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post(endpoints.crm.leadImport, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as {
        success_count: number;
        failed_count: number;
        errors: Array<{ row: number; reason: string }>;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    },
  });
}

/* -------------------------------------------------------------------- */
/* CRM configurable option lists + customer search                      */
/* -------------------------------------------------------------------- */

export type CrmOption = {
  id: string | number;
  option_type: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export function useCrmOptions(type: string) {
  return useQuery({
    queryKey: ["crm", "options", type],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.options, {
        params: { type, active: true },
      });
      const optionNames = unwrapList<CrmOption>(data).map((option) => option.name);
      if (!["cake_type", "cake_product"].includes(type)) return dedupeNames(optionNames);

      const products = await apiClient.get(endpoints.catalog.cakes, { params: { page_size: 10000 } });
      const productNames = unwrapList<{ name: string }>(products.data).map((product) => product.name);
      return dedupeNames([...optionNames, ...productNames]);
    },
  });
}

export type CrmCustomerSearchResult = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  is_active?: boolean;
  customer_since?: string;
  addresses: Array<{
    id: number;
    title: string;
    address: string;
    city: string;
    pincode: string;
    is_primary: boolean;
  }>;
};

export async function searchCrmCustomers(term: string): Promise<CrmCustomerSearchResult[]> {
  if (term.trim().length < 2) return [];
  const { data } = await apiClient.get(endpoints.crm.quotationCustomerSearch, {
    params: { q: term },
  });
  return unwrapList<CrmCustomerSearchResult>(data);
}
