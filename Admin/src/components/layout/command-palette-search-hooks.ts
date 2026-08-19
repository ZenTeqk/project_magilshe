import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

/**
 * Command-palette record search. Only wired to endpoints confirmed to do the
 * filtering server-side (see API-Server/crm/views.py):
 *  - LeadViewSet.get_queryset()        -> crm/leads/?search=
 *  - CRMCustomerViewSet.get_queryset() -> crm/customers/?search=
 * Quotations/Orders/Invoices/Deliveries have no `search` support in their
 * viewsets, so they're deliberately left out here (nav-only access is fine).
 */

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

/** Debounces a fast-changing value (e.g. command palette input) before it's used as a query key. */
export function useDebouncedValue<T>(value: T, delayMs = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type CommandPaletteLeadResult = {
  id: string | number;
  lead_no: string;
  customer_name: string;
  phone: string;
  status: string;
  occasion: string | null;
};

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}

/** Searches leads server-side via crm/leads/?search= (lead_no / customer_name / phone). */
export function useCommandPaletteLeadSearch(debouncedQuery: string) {
  const term = debouncedQuery.trim();
  return useQuery({
    queryKey: ["command-palette", "leads", term],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.leads, {
        params: { search: term },
      });
      return unwrapList<CommandPaletteLeadResult>(data).slice(0, 5);
    },
    enabled: term.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });
}

export type CommandPaletteCustomerResult = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

/** Searches customers server-side via crm/customers/?search= (name / username / phone / email). */
export function useCommandPaletteCustomerSearch(debouncedQuery: string) {
  const term = debouncedQuery.trim();
  return useQuery({
    queryKey: ["command-palette", "customers", term],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoints.crm.customers, {
        params: { search: term },
      });
      return unwrapList<CommandPaletteCustomerResult>(data).slice(0, 5);
    },
    enabled: term.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });
}
