import { useCallback } from "react";
import { toast } from "sonner";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import type { CrmCustomerSearchResult } from "@/features/crm/hooks";
import { useSaveCustomerAddress } from "@/features/crm/quotations-hooks";

type SavedAddress = CrmCustomerSearchResult["addresses"][number];

export const formatSavedAddress = (address: SavedAddress) =>
  [address.address, address.city, address.pincode].filter(Boolean).join(", ");

const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

/** True when the typed text is worth offering to save on the selected customer. */
export function isNewAddressFor(customer: CrmCustomerSearchResult | null, text: string) {
  if (!customer || !text.trim()) return false;
  return !customer.addresses.some((address) => normalize(formatSavedAddress(address)) === normalize(text));
}

/** Saves the typed address after the quotation/order is saved. Never throws: a failure only warns. */
export function useSaveAddressToCustomer() {
  const access = useCurrentAccess();
  const saveAddress = useSaveCustomerAddress();
  const { mutateAsync } = saveAddress;
  return useCallback(
    async (customer: CrmCustomerSearchResult | null, text: string, title: string) => {
      if (!customer || !hasPermission(access.data, "customers.data.edit") || !isNewAddressFor(customer, text)) return null;
      try {
        return await mutateAsync({ customer: customer.id, title, address: text.trim() });
      } catch {
        toast.warning("Address not saved to the customer", { description: "Everything else was saved. Add the address from the customer page." });
        return null;
      }
    },
    [access.data, mutateAsync],
  );
}
