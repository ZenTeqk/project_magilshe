import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/field";
import { useCreateCustomer, type CustomerAddress } from "@/features/customers/hooks";

const emptyAddress = (): CustomerAddress => ({ title: "", address: "", city: "", pincode: "", is_primary: true });
const emptyForm = () => ({ first_name: "", last_name: "", email: "", phone: "", is_active: true, addresses: [] as CustomerAddress[] });

export function CreateCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (id: string | number) => void }) {
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (open) { setForm(emptyForm()); setErrors({}); } }, [open]);
  const changeAddress = (index: number, patch: Partial<CustomerAddress>) => setForm((current) => ({ ...current, addresses: current.addresses.map((address, addressIndex) => addressIndex === index ? { ...address, ...patch } : patch.is_primary ? { ...address, is_primary: false } : address) }));

  const submit = async () => {
    const phone = form.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    const validation: Record<string, string> = {};
    if (!form.first_name.trim() && !form.last_name.trim()) validation["name"] = "First name or last name is required.";
    if (!/^[6-9]\d{9}$/.test(phone)) validation["phone"] = "Enter a valid 10-digit Indian mobile number.";
    form.addresses.forEach((address, index) => { if (address.pincode && !/^\d{6}$/.test(address.pincode)) validation[`address_${index}`] = "Pincode must contain exactly 6 digits."; });
    setErrors(validation); if (Object.keys(validation).length) return;
    try {
      const customer = await createCustomer.mutateAsync({ ...form, phone });
      toast.success("Customer created successfully"); onOpenChange(false); onCreated?.(customer.id);
    } catch (error: unknown) {
      const response = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const message = response ? Object.values(response).flat(Infinity).join(" ") : "Couldn't create this customer";
      setErrors({ api: message }); toast.error(message);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>Create customer</DialogTitle></DialogHeader>
    {errors["api"] && <p className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{errors["api"]}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" error={errors["name"]}><Input autoFocus value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></Field>
      <Field label="Last name"><Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></Field>
      <Field label="Phone" required error={errors["phone"]}><Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} /></Field>
      <Field label="Email"><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 sm:col-span-2"><span><span className="block text-sm font-medium">Active customer</span><span className="text-xs text-muted-foreground">Immediately available to CRM workflows.</span></span><Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} /></div>
    </div>
    <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Addresses</h3><p className="text-xs text-muted-foreground">Optional during creation.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, addresses: [...current.addresses, emptyAddress()] }))}><Plus className="size-4" /> Add address</Button></div>
      {form.addresses.map((address, index) => <div key={`new-${index}`} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
        <Field label="Label"><Input placeholder="Home, Office, Other" value={address.title} onChange={(event) => changeAddress(index, { title: event.target.value })} /></Field>
        <Field label="Pincode" error={errors[`address_${index}`]}><Input inputMode="numeric" maxLength={6} value={address.pincode} onChange={(event) => changeAddress(index, { pincode: event.target.value.replace(/\D/g, "") })} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea rows={2} placeholder="Complete street address" value={address.address} onChange={(event) => changeAddress(index, { address: event.target.value })} /></Field>
        <Field label="City"><Input value={address.city} onChange={(event) => changeAddress(index, { city: event.target.value })} /></Field>
        <div className="flex items-end justify-between"><label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={address.is_primary} onCheckedChange={(checked) => changeAddress(index, { is_primary: checked })} /> Primary</label><Button type="button" size="icon" variant="ghost" className="text-danger" onClick={() => setForm((current) => ({ ...current, addresses: current.addresses.filter((_, addressIndex) => addressIndex !== index) }))}><Trash2 className="size-4" /></Button></div>
      </div>)}
    </div>
    <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={createCustomer.isPending}>{createCustomer.isPending ? "Creating…" : "Create customer"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
