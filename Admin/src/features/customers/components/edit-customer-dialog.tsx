import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/field";
import { useUpdateCustomer, type CrmCustomerSummary, type CustomerAddress } from "@/features/customers/hooks";

const emptyAddress = (): CustomerAddress => ({ title: "", address: "", city: "", pincode: "", is_primary: false });

export function EditCustomerDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer: CrmCustomerSummary }) {
  const update = useUpdateCustomer();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", is_active: true, addresses: [] as CustomerAddress[] });
  const [deletedAddressIds, setDeletedAddressIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm({ first_name: customer.first_name ?? "", last_name: customer.last_name ?? "", email: customer.email ?? "", phone: customer.phone ?? "", is_active: customer.is_active, addresses: customer.addresses.map((address) => ({ ...address })) });
    setDeletedAddressIds([]); setErrors({});
  }, [open, customer]);

  const changeAddress = (index: number, patch: Partial<CustomerAddress>) => setForm((current) => ({ ...current, addresses: current.addresses.map((address, addressIndex) => addressIndex === index ? { ...address, ...patch } : patch.is_primary ? { ...address, is_primary: false } : address) }));
  const removeAddress = (index: number) => setForm((current) => {
    const address = current.addresses[index];
    if (address?.id) setDeletedAddressIds((ids) => [...ids, address.id!]);
    return { ...current, addresses: current.addresses.filter((_, addressIndex) => addressIndex !== index) };
  });

  const submit = async () => {
    const phone = form.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    const validation: Record<string, string> = {};
    if (!form.first_name.trim() && !form.last_name.trim()) validation["name"] = "First name or last name is required.";
    if (!/^[6-9]\d{9}$/.test(phone)) validation["phone"] = "Enter a valid 10-digit Indian mobile number.";
    form.addresses.forEach((address, index) => { if (address.pincode && !/^\d{6}$/.test(address.pincode)) validation[`address_${index}`] = "Pincode must contain exactly 6 digits."; });
    setErrors(validation); if (Object.keys(validation).length) return;
    try {
      await update.mutateAsync({ id: customer.id, ...form, phone, delete_address_ids: deletedAddressIds });
      toast.success("Customer updated successfully"); onOpenChange(false);
    } catch (error: unknown) {
      const response = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const message = response ? Object.values(response).flat(Infinity).join(" ") : "Couldn't update this customer";
      toast.error(message); setErrors({ api: message });
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Edit customer</DialogTitle></DialogHeader>
      {errors["api"] && <p className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{errors["api"]}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer ID" help="System generated and read-only"><Input value={String(customer.id)} disabled /></Field>
        <Field label="Username" help="Authentication identity and read-only"><Input value={customer.username} disabled /></Field>
        <Field label="First name" error={errors["name"]}><Input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></Field>
        <Field label="Last name"><Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></Field>
        <Field label="Phone" required error={errors["phone"]}><Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 sm:col-span-2"><span><span className="block text-sm font-medium">Active customer</span><span className="text-xs text-muted-foreground">Controls access without changing historical records.</span></span><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} /></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Saved addresses</h3><Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, addresses: [...current.addresses, emptyAddress()] }))}><Plus className="size-4" /> Add address</Button></div>
        {form.addresses.map((address, index) => <div key={address.id ?? `new-${index}`} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
          <Field label="Label"><Input placeholder="Home, Office, Other" value={address.title} onChange={(event) => changeAddress(index, { title: event.target.value })} /></Field>
          <Field label="Pincode" error={errors[`address_${index}`]}><Input inputMode="numeric" maxLength={6} value={address.pincode} onChange={(event) => changeAddress(index, { pincode: event.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea rows={3} className="min-h-24 resize-y" placeholder="Enter the complete street address" value={address.address} onChange={(event) => changeAddress(index, { address: event.target.value })} /></Field>
          <Field label="City"><Input value={address.city} onChange={(event) => changeAddress(index, { city: event.target.value })} /></Field>
          <div className="flex items-end justify-between gap-2"><label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={address.is_primary} onCheckedChange={(checked) => changeAddress(index, { is_primary: checked })} /> Primary</label><Button type="button" size="icon" variant="ghost" className="text-danger" onClick={() => removeAddress(index)} aria-label="Remove address"><Trash2 className="size-4" /></Button></div>
        </div>)}
      </div>
      <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
