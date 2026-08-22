import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useCrmCustomers, type CrmCustomerSummary } from "@/features/customers/hooks";

/**
 * Same `crm/customers/` endpoint the Customers module already calls
 * (`CRMCustomerViewSet`, read-only). There is no dedicated staff/users
 * endpoint on the backend — staff are just `Customer` rows with
 * `is_staff=True` (single `AUTH_USER_MODEL = customer.Customer` table for
 * both storefront customers and admin staff). The endpoint doesn't support
 * filtering by `is_staff` server-side, so this module fetches the same list
 * and filters client-side, same as other pages in this app do for search.
 */
const CRM_CUSTOMERS_URL = endpoints.crm.customers;
const CRM_CUSTOMER_URL = endpoints.crm.customer;

export type StaffUser = CrmCustomerSummary;

/** All `crm/customers/` rows narrowed to staff accounts (`is_staff === true`). */
export function useStaffUsers() {
  const query = useCrmCustomers();
  const staff = useMemo(() => (query.data ?? []).filter((c) => c.is_staff === true), [query.data]);
  return { ...query, data: staff };
}

export type StaffUserDetail = StaffUser & {
  history?: {
    leads: Array<Record<string, unknown>>;
    quotations: Array<Record<string, unknown>>;
    orders: Array<Record<string, unknown>>;
    invoices: Array<Record<string, unknown>>;
    deliveries: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
    communications: Array<Record<string, unknown>>;
  };
};

/** Detail lookup for a single staff user, reusing `crm/customers/<id>/`. */
export function useStaffUser(id: string | number | undefined) {
  return useQuery({
    queryKey: ["crm", "customers", "staff-detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<StaffUserDetail>(CRM_CUSTOMER_URL(id!));
      return data;
    },
    enabled: id !== undefined,
  });
}

// Re-exported so callers of this module don't need to import from lib/endpoints
// for the one URL this feature touches.
export { CRM_CUSTOMERS_URL };
