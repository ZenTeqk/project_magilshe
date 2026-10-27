import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
  }
  return [];
}

/** Matches API-Server/whatsapp/models.py MessageTemplate.CATEGORY_CHOICES. */
export const TEMPLATE_CATEGORIES = ["marketing", "utility", "authentication"] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/** Matches API-Server/whatsapp/models.py MessageTemplate.STATUS_CHOICES. */
export const TEMPLATE_STATUSES = ["draft", "pending", "approved", "rejected"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const HEADER_TYPES = ["none", "text", "image", "video", "document"] as const;
export type HeaderType = (typeof HEADER_TYPES)[number];

export type TemplateButton =
  | { type: "URL"; text: string; url: string }
  | { type: "QUICK_REPLY"; text: string }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string };

export type MessageTemplate = {
  id: number;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  header_type: HeaderType;
  header_text: string;
  header_media_url: string;
  /** Set only by useUploadTemplateHeader. */
  header_media_filename: string;
  has_header_media: boolean;
  header_media_preview_url: string | null;
  body: string;
  footer_text: string;
  buttons: TemplateButton[];
  event: string;
  variable_map: Record<string, string>;
  rejection_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_on: string;
  updated_on: string;
  is_editable: boolean;
};

export type EventCatalogue = {
  events: { value: string; label: string; group: string }[];
  auto_sendable_events: string[];
  /** sample: a realistic value for the preview -- also what Meta's reviewers see. */
  fields_by_event: Record<string, { value: string; label: string; sample: string }[]>;
};

export type MessageLog = {
  id: number;
  template: number | null;
  template_name: string;
  event: string;
  customer_name: string;
  phone: string;
  source_model: string;
  source_id: number | null;
  source_label: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  error_message: string;
  sent_by_name: string;
  created_on: string;
};

export type WhatsAppSettings = {
  id: number;
  waba_id: string;
  phone_number_id: string;
  has_access_token: boolean;
  webhook_verify_token: string;
  business_display_name: string;
  business_display_phone: string;
  has_app_secret: boolean;
  app_id: string;
  auto_send_enabled: boolean;
  auto_send_events: string[];
  occasion_reminders_enabled: boolean;
  occasion_reminder_mode: "review" | "automatic";
  /** Spelling-insensitive keys, e.g. "birthday" -- see occasionKey(). */
  occasion_reminder_types: string[];
  is_connected: boolean;
  updated_on: string;
};

const templateKey = (id: string | number) => ["whatsapp", "template", String(id)] as const;

export function useEventCatalogue() {
  return useQuery({
    queryKey: ["whatsapp", "event-catalogue"],
    queryFn: async () => (await apiClient.get<EventCatalogue>(endpoints.whatsapp.eventCatalogue)).data,
    staleTime: Infinity,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["whatsapp", "templates"],
    queryFn: async () => unwrapList<MessageTemplate>((await apiClient.get(endpoints.whatsapp.templates)).data),
  });
}

export function useTemplate(id: string | number | undefined) {
  return useQuery({
    queryKey: templateKey(id ?? ""),
    queryFn: async () => (await apiClient.get<MessageTemplate>(endpoints.whatsapp.template(id!))).data,
    enabled: Boolean(id),
  });
}

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Omit<Partial<MessageTemplate>, "id"> & { id?: number | undefined }) =>
      (id
        ? await apiClient.patch<MessageTemplate>(endpoints.whatsapp.template(id), payload)
        : await apiClient.post<MessageTemplate>(endpoints.whatsapp.templates, payload)
      ).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      queryClient.setQueryData(templateKey(data.id), data);
    },
  });
}

export function useSubmitTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      (await apiClient.post<MessageTemplate>(endpoints.whatsapp.submitTemplate(id))).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      queryClient.setQueryData(templateKey(data.id), data);
    },
  });
}

export function useUploadTemplateHeader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string | number; file: File }) => {
      const body = new FormData();
      body.append("file", file);
      return (await apiClient.post<MessageTemplate>(endpoints.whatsapp.uploadTemplateHeader(id), body)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] });
      queryClient.setQueryData(templateKey(data.id), data);
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      (await apiClient.post<MessageTemplate>(endpoints.whatsapp.duplicateTemplate(id))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => apiClient.delete(endpoints.whatsapp.template(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "templates"] }),
  });
}

export type MessageLogParams = {
  status?: string | undefined; event?: string | undefined; search?: string | undefined;
  from_date?: string | undefined; to_date?: string | undefined;
};

export function useMessageLog(params: MessageLogParams = {}) {
  return useQuery({
    queryKey: ["whatsapp", "messages", params],
    queryFn: async () =>
      unwrapList<MessageLog>((await apiClient.get(endpoints.whatsapp.messages, { params })).data),
  });
}

export function useWhatsAppSettings() {
  return useQuery({
    queryKey: ["whatsapp", "settings"],
    queryFn: async () => (await apiClient.get<WhatsAppSettings>(endpoints.whatsapp.settings)).data,
  });
}

export function useSaveWhatsAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WhatsAppSettings> & { access_token?: string; app_secret?: string }) =>
      (await apiClient.patch<WhatsAppSettings>(endpoints.whatsapp.settings, payload)).data,
    onSuccess: (data) => queryClient.setQueryData(["whatsapp", "settings"], data),
  });
}

/** Active templates assigned to one event -- what a "Send WhatsApp" button
 * on a CRM page offers. Empty means nothing is configured for that moment
 * yet (the button should explain that rather than silently not render,
 * since "configure a template" is a real next step for the one person
 * running this feature). */
export function useTemplatesForEvent(event: string) {
  const templates = useTemplates();
  return {
    ...templates,
    data: (templates.data ?? []).filter((t) => t.event === event && t.status === "approved"),
  };
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { event: string; template_id: number; record_id: number | string }) =>
      (await apiClient.post<MessageLog>(endpoints.whatsapp.send, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages"] }),
  });
}

/** Mirrors crm.recurring_events.occasion_key on the API: "Birthdays",
 * "birthday" and "Birthday " are the same occasion. */
export function occasionKey(name: string) {
  const text = name.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  if (text.endsWith("ies")) return `${text.slice(0, -3)}y`;
  if (text.endsWith("s") && !text.endsWith("ss")) return text.slice(0, -1);
  return text;
}

export type OccasionReminder = {
  id: number;
  customer_id: number;
  customer_name: string;
  phone: string;
  occasion: string;
  occasion_date: string;
  days_until: number;
  /** Non-empty when this one can't be sent (no phone, replied STOP). */
  blocked_reason: string;
};

export type OccasionReminderList = {
  enabled: boolean;
  mode: "review" | "automatic";
  template_name: string;
  results: OccasionReminder[];
};

export function useOccasionReminders() {
  return useQuery({
    queryKey: ["whatsapp", "occasion-reminders"],
    queryFn: async () => (await apiClient.get<OccasionReminderList>(endpoints.whatsapp.occasionReminders)).data,
  });
}

export function useSendOccasionReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: number[]) =>
      (await apiClient.post<{ sent: number; failed: number; skipped: number }>(
        endpoints.whatsapp.occasionReminders, ids ? { ids } : {},
      )).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "occasion-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "messages"] });
    },
  });
}
