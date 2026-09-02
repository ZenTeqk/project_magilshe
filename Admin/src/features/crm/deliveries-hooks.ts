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
const deliveryKey = (id: string | number) => ["crm", "delivery", String(id)] as const;

/** Matches API-Server/crm/models.py CRMDelivery.DELIVERY_STATUS_CHOICES exactly. */
export const DELIVERY_STATUSES = [
  "Pending", "Out for Delivery", "Delivered Successfully", "Damaged During Delivery", "Delivery Failed",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Matches CRMDelivery.DELIVERY_TYPE_CHOICES exactly. */
export const DELIVERY_TYPES = ["Customer Pickup", "Magilshe Delivery", "Porter Delivery"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export type DeliveryDamageImage = {
  id: string | number;
  original_name: string;
  url: string;
  created_on: string;
};

export type CrmDelivery = {
  id: string | number;
  delivery_no: string;
  order: number;
  order_no: string;
  invoice_no: string;
  customer: number | null;
  customer_name: string;
  phone: string;
  cake_type: string;
  flavour: string | null;
  quantity: number;
  items: CrmOrderItem[];
  total_amount: string | number;
  advance_paid: string | number;
  balance_amount: string | number;
  delivery_type: DeliveryType;
  recipient_name: string | null;
  recipient_phone: string | null;
  customer_address: number | null;
  customer_addresses: Array<{
    id: number;
    title: string | null;
    person_name: string;
    phone: string;
    address: string | null;
    city: string | null;
    pincode: string | null;
    is_primary: boolean;
  }>;
  delivery_status: DeliveryStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  created_on: string;
  updated_on: string;

  pickup_person_type: string | null;
  pickup_person_relationship: string | null;
  pickup_person_name: string | null;
  pickup_contact: string | null;
  pickup_time: string | null;
  pickup_location: string | null;
  pickup_notes: string | null;

  delivery_person: number | null;
  delivery_person_name: string | null;
  delivery_person_name_snapshot: string | null;
  delivery_person_phone_snapshot: string | null;
  delivery_time: string | null;
  delivery_location: string | null;
  delivery_notes: string | null;

  porter_id: string | null;
  porter_name: string | null;
  porter_contact: string | null;
  porter_location: string | null;
  porter_time: string | null;
  porter_amount: string | number | null;
  porter_notes: string | null;
  tracking_link: string | null;
  external_platform: number | null;
  external_platform_name: string | null;
  external_delivery_person: number | null;
  external_delivery_person_name: string | null;
  external_platform_name_snapshot: string | null;
  external_person_name_snapshot: string | null;
  external_person_phone_snapshot: string | null;

  damage_description: string | null;
  failure_reason: string | null;
  damage_images: DeliveryDamageImage[];
  timeline: Array<{ id: string | number; action: string; description: string; staff_name: string; created_on: string }>;
};

export type DeliveryPerson = { id: string | number; name: string; phone: string; status: boolean };

export function useDeliveries() {
  return useQuery({
    queryKey: ["crm", "deliveries"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.deliveries);
      return unwrapList<CrmDelivery>(data);
    },
  });
}

export function useDelivery(id: string | number | undefined) {
  return useQuery({
    queryKey: id === undefined ? ["crm", "delivery", "new"] : deliveryKey(id),
    queryFn: async () => {
      const { data } = await apiClient.get<CrmDelivery>(endpoints.crm.delivery(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

export function useDeliveryPersons() {
  return useQuery({
    queryKey: ["delivery-persons"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.deliveryPerson.get);
      const list = unwrapList<DeliveryPerson>(data);
      return list.filter((person) => person.status);
    },
  });
}

function invalidateDelivery(queryClient: ReturnType<typeof useQueryClient>, id?: string | number) {
  queryClient.invalidateQueries({ queryKey: ["crm", "deliveries"] });
  queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["reports", "crm-analytics"] });
  if (id !== undefined) queryClient.invalidateQueries({ queryKey: deliveryKey(id) });
}

/** Mirrors Admin/src/components/crm/delivery/DeliveryDetails.jsx patchPayload() exactly. */
export type DeliveryPatchInput = {
  id: string | number;
  delivery_type: DeliveryType;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  customer_address?: number | string | null;
  pickup_person_type?: string | null;
  pickup_person_relationship?: string | null;
  pickup_person_name?: string | null;
  pickup_contact?: string | null;
  pickup_time?: string | null;
  pickup_location?: string | null;
  pickup_notes?: string | null;
  porter_id?: string | null;
  porter_name?: string | null;
  porter_contact?: string | null;
  porter_location?: string | null;
  porter_time?: string | null;
  porter_amount?: string | number | null;
  porter_notes?: string | null;
  tracking_link?: string | null;
  delivery_person?: number | string | null;
  external_platform?: number | string | null;
  delivery_time?: string | null;
  delivery_location?: string | null;
  delivery_notes?: string | null;
};

export function useUpdateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: DeliveryPatchInput) => {
      const { data } = await apiClient.patch<CrmDelivery>(endpoints.crm.delivery(id), payload);
      return data;
    },
    onSuccess: (data, { id }) => { queryClient.setQueryData(deliveryKey(id), data); invalidateDelivery(queryClient, id); },
  });
}

export function useDeliveryWorkflowAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, ...extra }: {
      id: string | number; action: "start" | "deliver" | "mark_damaged" | "mark_failed";
      damage_description?: string; failure_reason?: string;
    }) => {
      const { data } = await apiClient.post<CrmDelivery>(endpoints.crm.deliveryWorkflowAction(id), { action, ...extra });
      return data;
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(deliveryKey(id), data);
      invalidateDelivery(queryClient, id);
    },
  });
}

export function useUploadDamageImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, files }: { id: string | number; files: File[] }) => {
      const form = new FormData();
      files.forEach((file) => form.append("images", file));
      const { data } = await apiClient.post(endpoints.crm.deliveryDamageImages(id), form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { data: DeliveryDamageImage[] };
    },
    onSuccess: (_data, { id }) => invalidateDelivery(queryClient, id),
  });
}
