import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import { CreateCustomerDialog } from "@/features/customers/components/create-customer-dialog";
import type { CrmCustomerSummary } from "@/features/customers/hooks";
import type { CrmCustomerSearchResult } from "@/features/crm/hooks";

function toSearchResult(customer: CrmCustomerSummary): CrmCustomerSearchResult {
  return {
    id: Number(customer.id),
    name: customer.name,
    phone: customer.phone || customer.username,
    email: customer.email || null,
    is_active: customer.is_active,
    customer_since: customer.date_joined,
    addresses: customer.addresses.flatMap((address) =>
      address.id === undefined
        ? []
        : [{ id: address.id, title: address.title, address: address.address, city: address.city, pincode: address.pincode, is_primary: address.is_primary }],
    ),
  };
}

/** Opens the existing Create customer dialog and hands the new customer back in the
 * same shape as CustomerMatchPicker, so pages can reuse their applyMatch. */
export function NewCustomerButton({ onCreated }: { onCreated: (customer: CrmCustomerSearchResult) => void }) {
  const access = useCurrentAccess();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  if (!hasPermission(access.data, "customers.data.create")) return null;

  const handleCreated = async (id: string | number) => {
    // useCreateCustomer already puts the created customer into the list cache.
    const cached = queryClient
      .getQueryData<CrmCustomerSummary[]>(["crm", "customers"])
      ?.find((customer) => String(customer.id) === String(id));
    try {
      const customer = cached ?? (await apiClient.get<CrmCustomerSummary>(endpoints.crm.customer(id))).data;
      onCreated(toSearchResult(customer));
    } catch {
      toast.warning("Customer created", { description: "Search for them by phone to select them." });
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New customer
      </Button>
      <CreateCustomerDialog open={open} onOpenChange={setOpen} onCreated={(id) => void handleCreated(id)} />
    </>
  );
}
