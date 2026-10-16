import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export type HomeDashboardResponse = {
  count: {
    total_order: number;
    today_order: number;
    total_delivered: number;
    today_delivered: number;
    total_pending: number;
    today_pending: number;
    total_users: number;
  };
  data: {
    recent_10_orders: Array<Record<string, unknown>>;
    recent_10_deliveries: Array<Record<string, unknown>>;
    upcoming_occasions: Array<{ name?: string; occasion?: string; date?: string }>;
    today_ordered_cake_list_list: Array<Record<string, unknown>>;
    today_preparing_cake_list: Array<Record<string, unknown>>;
  };
};

export function useHomeDashboard() {
  return useQuery({
    queryKey: ["dashboard", "home"],
    queryFn: async () => {
      const { data } = await apiClient.get<HomeDashboardResponse>(endpoints.dashboard.home);
      return data;
    },
  });
}

export type CrmAnalyticsResponse = {
  range: { from_date: string; to_date: string };
  current: {
    today_orders: number;
    payments_pending: { count: number; amount: number };
    balance_pending: number;
  };
  overview: Record<string, Record<string, number>>;
  totals: {
    leads: number;
    quotations: number;
    orders: number;
    invoices: number;
    deliveries: number;
    new_customers: number;
  };
  revenue: {
    collected: number;
    outstanding: number;
    advance_collected: number;
    balance_collected: number;
    average_order: number;
    trend: Array<{ day: string; value: number }>;
    payments_count?: number;
    booked_value?: number;
  };
  funnel: Array<{
    key: string;
    label: string;
    value: number;
    conversion: number;
    drop_off: number;
  }>;
  customers: Array<{
    phone: string;
    customer_name: string;
    total_orders: number;
    total_spend: number;
    last_order: string;
  }>;
  products: Array<Record<string, unknown>>;
  occasions: Array<{ occasion: string; value: number }>;
  lead_sources: Array<{ lead_source: string; value: number }>;
  delivery_methods: Array<{ delivery_type: string; value: number }>;
  timeline: Array<{
    id: string | number;
    module: string;
    action: string;
    reference: string;
    customer: string;
    staff: string;
    created_on: string;
  }>;
};

export function useCrmAnalytics(params?: { from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: ["reports", "crm-analytics", params],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmAnalyticsResponse>(endpoints.reports.crmAnalytics, {
        params,
      });
      return data;
    },
  });
}
