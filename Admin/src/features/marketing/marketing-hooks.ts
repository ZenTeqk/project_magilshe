import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/** Endpoint path strings sourced from the shared `@/lib/endpoints` registry. */
const OFFERS = endpoints.offer;

const BANNER = endpoints.banner;

const EVENTS = endpoints.event;

const EVENT_ORDERS = {
  list: endpoints.event.orders,
  detail: endpoints.event.orderDetail,
  updateStatus: endpoints.event.updateOrderStatus,
};

function unwrap<T>(data: unknown): T[] {
  const record = data as { data?: T[] } | undefined;
  return record?.data ?? [];
}

/* ---------------------------------------------------------------------- */
/* Offers — Admin/src/components/offers (cake app, type=3 "Cake Price")    */
/* ---------------------------------------------------------------------- */

export type MarketingOfferCakePrice = {
  id: number;
  cake_id: number;
  cake_name: string;
  sub_category_name: string;
  kg_id: number;
  kg_name: string;
  price: number | string;
};

export type MarketingOffer = {
  id: number;
  name: string;
  type: number;
  id_list: number[];
  offer_per: number | string;
  offer_from: string;
  offer_to: string;
  status: boolean;
  url: string | null;
  cake_list?: number[];
  cake_price?: MarketingOfferCakePrice[];
};

export function useMarketingOffers() {
  return useQuery({
    queryKey: ["marketing", "offers"],
    queryFn: async () => {
      const { data } = await apiClient.get(OFFERS.list);
      return unwrap<MarketingOffer>(data);
    },
  });
}

export type SaveOfferInput = {
  id?: number | undefined;
  name: string;
  offer_per: number | string;
  offer_from: string;
  offer_to: string;
  id_list: number[];
  image?: File | null;
};

export function useSaveMarketingOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveOfferInput) => {
      const form = new FormData();
      form.append("id", String(payload.id ?? 0));
      form.append("type", "3");
      form.append("id_list", payload.id_list.join(","));
      form.append("name", payload.name);
      form.append("offer_per", String(payload.offer_per));
      form.append("offer_from", payload.offer_from);
      form.append("offer_to", payload.offer_to);
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(OFFERS.save, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: MarketingOffer };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing", "offers"] }),
  });
}

export function useDeleteMarketingOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(OFFERS.delete(id));
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing", "offers"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Banner — Admin/src/components/Dynamic_Banner (banner app)               */
/* ---------------------------------------------------------------------- */

export type MarketingBanner = {
  id: number;
  main_text: string | null;
  sub_text: string | null;
  url: string | null;
  status: boolean;
};

export function useMarketingBanners() {
  return useQuery({
    queryKey: ["marketing", "banners"],
    queryFn: async () => {
      const { data } = await apiClient.get(BANNER.list);
      return unwrap<MarketingBanner>(data);
    },
  });
}

export type SaveBannerInput = {
  id?: number | undefined;
  main_text: string;
  sub_text: string;
  status: boolean;
  image?: File | null;
};

export function useSaveMarketingBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveBannerInput) => {
      const form = new FormData();
      form.append("id", String(payload.id ?? 0));
      form.append("main_text", payload.main_text);
      form.append("sub_text", payload.sub_text);
      form.append("status", String(payload.status));
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(BANNER.save, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: MarketingBanner };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing", "banners"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Events — Admin/src/components/Events (event app)                        */
/* ---------------------------------------------------------------------- */

export type MarketingEvent = {
  id: number;
  name: string;
  place: string | null;
  start: string;
  end: string;
  description: string | null;
  cake_id_list: number[];
  url: string | null;
  status: boolean;
  cake_details: Array<{ id: number; name: string }>;
};

export function useMarketingEvents() {
  return useQuery({
    queryKey: ["marketing", "events"],
    queryFn: async () => {
      const { data } = await apiClient.get(EVENTS.list);
      return unwrap<MarketingEvent>(data);
    },
  });
}

export type SaveEventInput = {
  id?: number | undefined;
  name: string;
  place: string;
  start: string;
  end: string;
  description: string;
  status: boolean;
  cake_id_list: number[];
  image?: File | null;
};

export function useSaveMarketingEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveEventInput) => {
      const form = new FormData();
      form.append("id", String(payload.id ?? 0));
      form.append("name", payload.name);
      form.append("place", payload.place);
      form.append("start", payload.start);
      form.append("end", payload.end);
      form.append("description", payload.description);
      form.append("status", String(payload.status));
      form.append("cake_id_list", payload.cake_id_list.join(","));
      if (payload.image) form.append("image", payload.image);
      const { data } = await apiClient.post(EVENTS.save, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { message: string; data: MarketingEvent };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing", "events"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Event orders — Admin/src/components/EventsOrders (event app)            */
/* ---------------------------------------------------------------------- */

export type MarketingEventOrderItem = { id: number; cake_id: number; qty: number };

export type MarketingEventOrder = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  address: string | null;
  total_amount: number;
  ordered_time: string;
  order_status: number;
  cake_price_details: MarketingEventOrderItem[];
};

export function useMarketingEventOrders() {
  return useQuery({
    queryKey: ["marketing", "event-orders"],
    queryFn: async () => {
      const { data } = await apiClient.get(EVENT_ORDERS.list);
      return unwrap<MarketingEventOrder>(data);
    },
  });
}

export function useMarketingEventOrderDetail(id: number | null) {
  return useQuery({
    queryKey: ["marketing", "event-orders", id],
    queryFn: async () => {
      const { data } = await apiClient.get(EVENT_ORDERS.detail(id as number));
      return (data as { data: MarketingEventOrder | null }).data;
    },
    enabled: id !== null,
  });
}

export function useUpdateMarketingEventOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; order_status: number }) => {
      const { data } = await apiClient.post(EVENT_ORDERS.updateStatus, payload);
      return data as { message: string; data: MarketingEventOrder };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing", "event-orders"] }),
  });
}
