import { Field } from "@/components/shared/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import type { CrmCustomerSearchResult } from "@/features/crm/hooks";
import { formatSavedAddress, isNewAddressFor } from "@/features/crm/saved-address";

/** Always-visible saved-address dropdown; picking one hands back the text for an editable Textarea. */
export function SavedAddressSelect({
  customer,
  onPick,
  label = "Saved addresses",
}: {
  customer: CrmCustomerSearchResult | null;
  onPick: (text: string) => void;
  label?: string;
}) {
  const addresses = customer?.addresses ?? [];
  const placeholder = !customer
    ? "Pick a customer to see saved addresses"
    : addresses.length
      ? "Select saved address"
      : "No saved addresses";
  return (
    <Field label={label}>
      {/* key resets the selection when the customer changes */}
      <Select
        key={customer?.id ?? "none"}
        disabled={!addresses.length}
        onValueChange={(id) => {
          const selected = addresses.find((address) => String(address.id) === id);
          if (selected) onPick(formatSavedAddress(selected));
        }}
      >
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {addresses.map((address) => (
            <SelectItem key={address.id} value={String(address.id)}>
              {address.title || "Address"}{address.is_primary ? " · Primary" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Unchecked-by-default opt-in, shown only for a selected customer, a new address and customers.data.edit. */
export function SaveAddressCheckbox({
  customer,
  text,
  checked,
  onCheckedChange,
}: {
  customer: CrmCustomerSearchResult | null;
  text: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const access = useCurrentAccess();
  if (!hasPermission(access.data, "customers.data.edit") || !isNewAddressFor(customer, text)) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      Save this address to the customer
    </label>
  );
}
