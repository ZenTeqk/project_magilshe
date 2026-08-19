import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/**
 * order/get-customer-order/ has no dedicated backend "reports" prefix (it
 * lives under the order app), so endpoints.ts intentionally doesn't carry
 * it — kept as a local constant per the migration instructions.
 * Admin/src/Constant/urls/urls.js -> GetUserWiseReportUrl.
 */
const GET_CUSTOMER_ORDER_URL = endpoints.order.getCustomerOrder;

function unwrap<T>(data: unknown): T[] {
  const record = data as { data?: T[] } | undefined;
  return record?.data ?? [];
}

export type DateRange = { from_date: string; to_date: string };

/** Returns the last N days as YYYY-MM-DD strings (matches old Admin's default 30-day window). */
export function lastNDays(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from_date: iso(from), to_date: iso(to) };
}

/* ---------------------------------------------------------------------- */
/* Shared shapes — order/serializers.py: cake_order_serialier              */
/* ---------------------------------------------------------------------- */

export type ReportOrderCustomer = { id: number; name: string; phone: string; email: string };
export type ReportDeliveryAddress = { address_title: string | null; address: string; id: number };
export type ReportDeliveryPersonInfo = { name: string | null; phone: string | null };
export type ReportDeliveryPartner = { id: number; name: string; phone?: string } | null;

export type CakeOrderReportRow = {
  id: number;
  order_time: string;
  delivery_time: string | null;
  delivery_status: string;
  tracking_link: string | null;
  is_manual_order: boolean;
  customer: ReportOrderCustomer;
  delivery_address: ReportDeliveryAddress;
  delivery_person: ReportDeliveryPersonInfo;
  delivery_partner: ReportDeliveryPartner;
};

/** occasion/serializers.py: occasion_serializer */
export type OccasionReportRow = {
  id: number;
  type: string;
  date: string;
  person_name: string;
  person_phone: string;
};

/** customer/serializers.py: customer_serializer (subset used by report pickers) */
export type ReportCustomerOption = {
  id: number;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
};

/* ---------------------------------------------------------------------- */
/* reports/order-report — from_date/to_date (date-only; falls back to      */
/* today's orders when omitted, so this app always supplies both).         */
/* ---------------------------------------------------------------------- */

export function useOrderReport(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ["reports", "order-report", range],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.reports.orderReport, { params: range });
      return unwrap<CakeOrderReportRow>(data);
    },
    enabled,
  });
}

/* ---------------------------------------------------------------------- */
/* reports/delivery-person-report — dp_id required, from_date/to_date      */
/* optional (defaults to today server-side).                               */
/* ---------------------------------------------------------------------- */

export type DeliveryPersonReportParams = DateRange & { dp_id: string };

export function useDeliveryPersonReport(params: DeliveryPersonReportParams | null) {
  return useQuery({
    queryKey: ["reports", "delivery-person-report", params],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.reports.deliveryPersonReport, {
        params: params!,
      });
      return unwrap<CakeOrderReportRow>(data);
    },
    enabled: params !== null,
  });
}

/* ---------------------------------------------------------------------- */
/* reports/occasion-report — from_date/to_date compared by month+day only  */
/* (year is ignored server-side), returns all occasions when omitted.      */
/* ---------------------------------------------------------------------- */

export function useOccasionReport(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ["reports", "occasion-report", range],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.reports.occasionReport, { params: range });
      return unwrap<OccasionReportRow>(data);
    },
    enabled,
  });
}

/* ---------------------------------------------------------------------- */
/* order/get-customer-order/ — customer_id required, from_date/to_date     */
/* optional (all of that customer's orders when omitted).                  */
/* ---------------------------------------------------------------------- */

export type CustomerOrderReportParams = DateRange & { customer_id: string };

export function useCustomerOrderReport(params: CustomerOrderReportParams | null) {
  return useQuery({
    queryKey: ["reports", "customer-order-report", params],
    queryFn: async () => {
      const { data } = await apiClient.get(GET_CUSTOMER_ORDER_URL, { params: params! });
      return unwrap<CakeOrderReportRow>(data);
    },
    enabled: params !== null,
  });
}

/** customer/get-all-data/ — used to populate the User-wise Report customer picker. */
export function useReportCustomers() {
  return useQuery({
    queryKey: ["reports", "customers"],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.customer.getAllData);
      return unwrap<ReportCustomerOption>(data);
    },
  });
}
