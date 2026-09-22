import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { getTokens } from "@/lib/auth-storage";

export type CurrentAccess = { id: number; email: string; username: string; name: string; role: string | null; is_super_admin: boolean; permissions: string[]; permission_details: Array<{ id:number; code:string; module:string; resource:string; action:string; name:string }> };

const ACCESS_REQUEST_TIMEOUT_MS = 30_000;

export function useCurrentAccess(enabled = true) {
  const sessionToken = getTokens()?.access ?? null;
  return useQuery({
    queryKey: ["rbac", "me", sessionToken],
    queryFn: async () => (
      await apiClient.get<CurrentAccess>(endpoints.rbac.me, { timeout: ACCESS_REQUEST_TIMEOUT_MS })
    ).data,
    enabled,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    retry: (failureCount, error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      return status !== 401 && status !== 403 && failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
  });
}

export function hasPermission(access: CurrentAccess | undefined, code: string) {
  if (code === "__super_admin__") return Boolean(access?.is_super_admin);
  return Boolean(access?.is_super_admin || access?.permissions.includes(code));
}

export function hasAdminAccess(access: CurrentAccess | undefined) {
  return Boolean(access && (access.is_super_admin || access.role || access.permissions.length));
}

const routes: Array<[string, string]> = [
  ["/", "crm.dashboard.view"],
  ["/users", "rbac.users.view"], ["/roles", "rbac.roles.view"],
  ["/crm/leads", "crm.leads.view"], ["/crm/quotations", "crm.quotations.view"],
  ["/crm/orders", "crm.orders.view"], ["/crm/invoices", "crm.invoices.view"],
  ["/crm/delivery", "crm.delivery.view"], ["/crm/settings", "crm.settings.view"],
  ["/crm", "crm.dashboard.view"],
  ["/reports", "reports.view"], ["/order_reports", "reports.view"], ["/user_wise_reports", "reports.view"],
  ["/delivery_person_reports", "reports.view"], ["/occasion_reports", "reports.view"],
  ["/categories", "catalog.view"], ["/subcategories", "catalog.view"], ["/products", "catalog.view"], ["/item", "catalog.view"], ["/unit", "catalog.view"], ["/sub-unit", "catalog.view"], ["/tags", "catalog.view"], ["/gallery", "catalog.view"],
  ["/orders", "operations.view"], ["/manual-order", "operations.view"], ["/purchase", "operations.view"], ["/delivery-management", "operations.view"], ["/delivery_person", "operations.view"], ["/feedback", "operations.view"], ["/customers", "operations.view"],
  ["/offers", "marketing.view"], ["/banner", "marketing.view"], ["/events", "marketing.view"], ["/event-orders", "marketing.view"],
  ["/configuration", "configuration.view"], ["/terms_conditions", "configuration.view"], ["/settings", "configuration.view"],
];

export function permissionForRoute(pathname: string) {
  if (pathname === "/crm/customers") return "customers.data.view";
  if (pathname.startsWith("/crm/customers/")) return "customers.data.view";
  if (pathname === "/archived-records") return "__super_admin__";
  return routes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}
