import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/**
 * Endpoint paths for the "Store Operations" module group, matching
 * Admin/src/Constant/urls/urls.js call sites exactly (no backend changes).
 * Sourced from the shared `@/lib/endpoints` registry.
 */
const ORDER_LIST = endpoints.order.getAllOrder; // Admin/src/components/orders/Orders.jsx -> GetOrderUrl
const ORDER_STATUS_UPDATE = endpoints.order.statusUpdate;
const ORDER_SAVE = endpoints.order.save;

const MANUAL_CUSTOMER_CREATE = endpoints.auth.createManualCustomer;
const MANUAL_CART_ADD = endpoints.cart.addManualCart;

const DELIVERY_PERSON_CREATE = endpoints.deliveryPerson.create;

const ITEMS_PRODUCTS = endpoints.items.products;
const PURCHASE_RECEIVINGS = endpoints.purchase.receivings;
const purchaseReceiving = endpoints.purchase.receiving;
const purchaseBill = endpoints.purchase.bill;

const FEEDBACK = endpoints.testimonial.feedback;
const feedbackItem = endpoints.testimonial.feedbackItem;

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const record = data as { data?: T[]; results?: T[] } | undefined;
  return record?.data ?? record?.results ?? [];
}

/* ---------------------------------------------------------------------- */
/* Online orders — order/get-all-order/, order/status-update/              */
/* ---------------------------------------------------------------------- */

export type OrderCartItem = {
  id: number;
  cake_price_id: number | null;
  price: string | number;
  qty: number;
  greeting_text: string | null;
  cake: {
    id: number;
    name: string;
    unit: { id: number; name: string } | null;
    sub_category: { id: number; name: string } | null;
    main_category: { id: number; name: string } | null;
    images?: Array<{ url: string }>;
  } | null;
  price_list?: { kg: string } | null;
};

export type OnlineOrder = {
  id: number;
  cart_id_list: number[];
  cart_details: OrderCartItem[];
  order_time: string;
  delivery_time: string;
  delivery_status: number;
  tracking_link: string | null;
  customer: { id: number; name: string; phone: string; email: string };
  delivery_address: { id: number; address_title: string | null; address: string | null };
  delivery_person: { name: string | null; phone: string | null };
  delivery_partner: { id: number; name: string; email: string; phone: string; address: string; dob: string; status: boolean } | null;
  is_manual_order: boolean;
};

export const orderStatusArray = [
  "",
  "Pending",
  "Order Placed",
  "Confirmed",
  "Preparing",
  "Ready",
  "Delivered",
  "Cancel Requested",
  "Cancelled",
  "Rejected",
];

export function useOnlineOrders() {
  return useQuery({
    queryKey: ["operations", "orders"],
    queryFn: async () => {
      const { data } = await apiClient.get(ORDER_LIST);
      return unwrap<OnlineOrder>(data);
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      cake_order_id: number;
      delivery_status: number;
      tracking_link: string;
      delivery_partner_id: number | string;
    }) => {
      const { data } = await apiClient.post(ORDER_STATUS_UPDATE, payload);
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "orders"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Manual order — auth/create-manual-customer/, customer/check-customer/,  */
/* cart/add-manual-cart/, order/save/                                      */
/* ---------------------------------------------------------------------- */

export type ManualCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address_details?: Array<{ id: number; title: string; address: string; city: string; pincode: string; is_primary: boolean; customer_id: number }>;
};

export function useCheckCustomer() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data } = await apiClient.post(endpoints.customer.checkCustomer, { phone });
      return (data as { data: ManualCustomer | null }).data;
    },
  });
}

export function useCreateManualCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { phone: string; name: string; email: string; address: string; city: string; pincode: string }) => {
      const { data } = await apiClient.post(MANUAL_CUSTOMER_CREATE, payload);
      return data as { message: string; data: ManualCustomer };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "customers"] }),
  });
}

export type ManualCartLine = {
  cake_price: number;
  price: number;
  qty: number;
  greeting_text: string;
  type: string;
  date: string;
  person_name: string;
};

export function useAddManualCart() {
  return useMutation({
    mutationFn: async (payload: { customer_id: number; cart_list: ManualCartLine[] }) => {
      const { data } = await apiClient.post(MANUAL_CART_ADD, payload);
      return data as { data: number[] };
    },
  });
}

export function useSaveManualOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      customer_id: number;
      cart_id_list: number[];
      customer_address_id: number;
      delivery_date_time: string;
      delivery_person_email: string;
      delivery_person_name: string;
      delivery_person_phone: string;
      id: number;
      total_amount: number;
      total_qty: number;
      tracking_link: string;
      is_manual_order: boolean;
    }) => {
      const { data } = await apiClient.post(ORDER_SAVE, payload);
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "orders"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Purchases — items/products, purchase/receivings/, purchase/stock-*      */
/* ---------------------------------------------------------------------- */

export type PurchaseItemOption = {
  id: number;
  name: string;
  description: string | null;
  purchase_price: string | number | null;
  mrp_price: string | number | null;
  retail_price: string | number | null;
  wholesale_price: string | number | null;
  receiving_quantity: string | number | null;
};

export function usePurchaseItems() {
  return useQuery({
    queryKey: ["operations", "purchase-items"],
    queryFn: async () => {
      // Old Admin's item picker calls with default page_size=5, which is too
      // small for a usable dropdown; fetching a large page keeps the same
      // endpoint/shape while making every active item selectable.
      const { data } = await apiClient.get(ITEMS_PRODUCTS, { params: { page: 1, page_size: 1000 } });
      const record = data as { data?: PurchaseItemOption[] };
      return record.data ?? [];
    },
  });
}

export type PurchaseLineItem = {
  id?: number | undefined;
  item_id: number;
  item_name?: string | undefined;
  description: string;
  serialnumber: string;
  quantity_purchased: number;
  mrp_price: number | string;
  purchase_price: number | string;
  retail_price: number | string;
  wholesale_price: number | string;
  discount: number;
  discount_type: number;
  stock_location: number;
  receiving_quantity: number | string;
  free_qty?: number | undefined;
  is_deleted?: boolean | undefined;
  is_edit_item?: boolean | undefined;
};

export type PurchaseRecord = {
  id: number;
  comment: string | null;
  supplier_name: string | null;
  payment_type: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | number | null;
  purchase_status: number;
  created_at: string;
  updated_at: string;
  purchase_items: Array<PurchaseLineItem & { item: { id: number; name: string } }>;
};

export function usePurchases(range: { start: string; end: string; page: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["operations", "purchases", range.start, range.end, range.page, range.pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get(PURCHASE_RECEIVINGS, {
        params: { start_date: range.start, end_date: range.end, page: range.page, page_size: range.pageSize ?? 10 },
      });
      const record = data as { results?: { data?: PurchaseRecord[]; total_length?: number } };
      return { rows: record.results?.data ?? [], total: record.results?.total_length ?? 0 };
    },
  });
}

export function useSavePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      purchase: {
        id?: number | undefined;
        comment: string;
        payment_type: string;
        invoice_date: string;
        invoice_number: string;
        supplier_name: string;
        total_amount: number;
      };
      items: PurchaseLineItem[];
    }) => {
      const { data } = payload.purchase.id
        ? await apiClient.put(purchaseReceiving(payload.purchase.id), payload)
        : await apiClient.post(PURCHASE_RECEIVINGS, payload);
      return data as { message: string; data: PurchaseRecord };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "purchases"] }),
  });
}

export function usePurchaseBill(id: number | null) {
  return useQuery({
    queryKey: ["operations", "purchase-bill", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await apiClient.get(purchaseBill(id as number));
      return (data as { data: PurchaseRecord }).data;
    },
  });
}

/* ---------------------------------------------------------------------- */
/* Delivery persons — delivery-person/get/, delivery-person/create/        */
/* ---------------------------------------------------------------------- */

export type DeliveryPersonRecord = {
  id: number;
  staff_id?: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string | null;
  status: boolean;
  image_url?: string | null;
  alternate_phone?: string | null;
  service_area?: string | null;
  joining_date?: string | null;
  notes?: string | null;
  image?: File | null;
};

export function useDeliveryPersons() {
  return useQuery({
    queryKey: ["operations", "delivery-persons"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.deliveryPerson.staff);
      return unwrap<DeliveryPersonRecord>(data);
    },
  });
}

export type DeliveryPlatform = { id: number; name: string; contact_information: string | null; status: boolean; notes: string | null; driver_count?: number };
export type ExternalDeliveryPerson = { id: number; partner_id: string; platform: number; platform_name: string; name: string; phone: string; alternate_phone: string | null; vehicle_type: string | null; vehicle_number: string | null; service_area: string | null; status: boolean; notes: string | null };

export function useDeliveryPlatforms() { return useQuery({ queryKey:["operations","delivery-platforms"], queryFn: async()=>unwrap<DeliveryPlatform>((await apiClient.get(endpoints.deliveryPerson.platforms)).data) }); }
export function useExternalDeliveryPersons() { return useQuery({ queryKey:["operations","external-delivery-persons"], queryFn: async()=>unwrap<ExternalDeliveryPerson>((await apiClient.get(endpoints.deliveryPerson.partners)).data) }); }
export function useSaveDeliveryPlatform() { const qc=useQueryClient(); return useMutation({ mutationFn: async(payload:Partial<DeliveryPlatform>) => (payload.id ? apiClient.patch(endpoints.deliveryPerson.platform(payload.id),payload) : apiClient.post(endpoints.deliveryPerson.platforms,payload)).then(r=>r.data), onSuccess:()=>qc.invalidateQueries({queryKey:["operations","delivery-platforms"]}) }); }
export function useSaveExternalDeliveryPerson() { const qc=useQueryClient(); return useMutation({ mutationFn: async(payload:Partial<ExternalDeliveryPerson>) => (payload.id ? apiClient.patch(endpoints.deliveryPerson.partner(payload.id),payload) : apiClient.post(endpoints.deliveryPerson.partners,payload)).then(r=>r.data), onSuccess:()=>qc.invalidateQueries({queryKey:["operations","external-delivery-persons"]}) }); }

export function useSaveDeliveryPerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DeliveryPersonRecord> & { name: string; phone: string }) => {
      const { id, image_url: _imageUrl, ...body } = payload;
      const requestBody = body.image
        ? Object.entries(body).reduce((form, [key, value]) => {
            if (value !== undefined && value !== null) form.append(key, value instanceof Blob ? value : String(value));
            return form;
          }, new FormData())
        : body;
      const { data } = id
        ? await apiClient.patch<DeliveryPersonRecord>(endpoints.deliveryPerson.staffDetail(id), requestBody)
        : await apiClient.post<DeliveryPersonRecord>(endpoints.deliveryPerson.staff, requestBody);
      return { message: id ? "Delivery staff updated successfully" : "Delivery staff created successfully", data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations", "delivery-persons"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-persons"] });
    },
  });
}

/* ---------------------------------------------------------------------- */
/* Feedback — testimonial/feedback-message (GET/POST/DELETE)               */
/* ---------------------------------------------------------------------- */

export type FeedbackRecord = {
  id: number;
  name: string;
  mobile: string;
  message: string;
  status: boolean;
  is_subscribed: boolean;
  created_at?: string;
};

export function useFeedbackMessages() {
  return useQuery({
    queryKey: ["operations", "feedback"],
    queryFn: async () => {
      const { data } = await apiClient.get(FEEDBACK);
      return unwrap<FeedbackRecord>(data);
    },
  });
}

export function useSaveFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number; name: string; mobile: string; message: string; status: boolean; is_subscribed: boolean }) => {
      const { data } = await apiClient.post(FEEDBACK, payload);
      return data as { message: string; data: FeedbackRecord };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "feedback"] }),
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(feedbackItem(id));
      return data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations", "feedback"] }),
  });
}

/* ---------------------------------------------------------------------- */
/* Legacy customers — customer/get-all-data/ (read-only)                   */
/* ---------------------------------------------------------------------- */

export type LegacyCustomer = {
  id: number;
  username: string;
  email: string;
  phone: string;
  name: string;
  is_active: boolean;
  address_details: Array<{ id: number; title: string; address: string; city: string; pincode: string; is_primary: boolean; customer_id: number }>;
};

export function useLegacyCustomers() {
  return useQuery({
    queryKey: ["operations", "legacy-customers"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.customer.getAllData);
      return unwrap<LegacyCustomer>(data);
    },
  });
}
