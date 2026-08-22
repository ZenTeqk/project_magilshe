import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/data";
import {
  useDelivery, useUpdateDelivery, useDeliveryWorkflowAction, useUploadDamageImages, useDeliveryPersons,
  DELIVERY_TYPES, type CrmDelivery, type DeliveryPatchInput, type DeliveryType,
} from "@/features/crm/deliveries-hooks";
import { MarkDamagedDialog } from "@/features/crm/components/mark-damaged-dialog";
import { MarkFailedDialog } from "@/features/crm/components/mark-failed-dialog";
import { useDeliveryPlatforms, useExternalDeliveryPersons } from "@/features/operations/operations-hooks";

const deliveryTypeHints: Record<DeliveryType, string> = {
  "Customer Pickup": "Someone visits the bakery and collects the order.",
  "Magilshe Delivery": "Our own delivery staff delivers the order.",
  "Porter Delivery": "A third-party porter (Rapido, Porter, Dunzo) delivers the order.",
};
const pickupPersonTypes = ["Customer", "Family Member", "Friend", "Other"];

const toLocalInput = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

type FormState = {
  delivery_type: DeliveryType;
  customer_address: string;
  recipient_name: string;
  recipient_phone: string;
  pickup_person_type: string;
  pickup_person_relationship: string;
  pickup_person_name: string;
  pickup_contact: string;
  pickup_time: string;
  pickup_location: string;
  pickup_notes: string;
  delivery_person: string;
  external_platform: string;
  external_delivery_person: string;
  delivery_time: string;
  delivery_location: string;
  delivery_notes: string;
  porter_id: string;
  porter_name: string;
  porter_contact: string;
  porter_location: string;
  porter_time: string;
  porter_amount: string;
  porter_notes: string;
};

function toForm(d: CrmDelivery): FormState {
  return {
    delivery_type: d.delivery_type,
    customer_address: d.customer_address !== null ? String(d.customer_address) : "",
    recipient_name: d.recipient_name ?? "",
    recipient_phone: d.recipient_phone ?? "",
    pickup_person_type: d.pickup_person_type ?? "",
    pickup_person_relationship: d.pickup_person_relationship ?? "",
    pickup_person_name: d.pickup_person_name ?? "",
    pickup_contact: d.pickup_contact ?? "",
    pickup_time: toLocalInput(d.pickup_time),
    pickup_location: d.pickup_location ?? "",
    pickup_notes: d.pickup_notes ?? "",
    delivery_person: d.delivery_person !== null ? String(d.delivery_person) : "",
    external_platform: d.external_platform !== null ? String(d.external_platform) : "",
    external_delivery_person: d.external_delivery_person !== null ? String(d.external_delivery_person) : "",
    delivery_time: toLocalInput(d.delivery_time),
    delivery_location: d.delivery_location ?? "",
    delivery_notes: d.delivery_notes ?? "",
    porter_id: d.porter_id ?? "",
    porter_name: d.porter_name ?? "",
    porter_contact: d.porter_contact ?? "",
    porter_location: d.porter_location ?? "",
    porter_time: toLocalInput(d.porter_time),
    porter_amount: d.porter_amount !== null && d.porter_amount !== undefined ? String(d.porter_amount) : "",
    porter_notes: d.porter_notes ?? "",
  };
}

function toPatchPayload(id: string | number, form: FormState): DeliveryPatchInput {
  const base = {
    id,
    delivery_type: form.delivery_type,
    customer_address: form.customer_address || null,
    recipient_name: form.recipient_name || null,
    recipient_phone: form.recipient_phone || null,
  };
  if (form.delivery_type === "Customer Pickup") {
    return {
      ...base,
      external_platform: form.external_platform || null,
      external_delivery_person: form.external_delivery_person || null,
      pickup_person_type: form.pickup_person_type || null,
      pickup_person_relationship: form.pickup_person_type === "Other" ? (form.pickup_person_relationship || null) : null,
      pickup_person_name: form.pickup_person_name || null,
      pickup_contact: form.pickup_contact || null,
      pickup_time: fromLocalInput(form.pickup_time),
      pickup_location: form.pickup_location || null,
      pickup_notes: form.pickup_notes || null,
    };
  }
  if (form.delivery_type === "Porter Delivery") {
    return {
      ...base,
      porter_id: form.porter_id || null,
      porter_name: form.porter_name || null,
      porter_contact: form.porter_contact || null,
      porter_location: form.porter_location || null,
      porter_time: fromLocalInput(form.porter_time),
      porter_amount: form.porter_amount === "" ? null : form.porter_amount,
      porter_notes: form.porter_notes || null,
    };
  }
  return {
    ...base,
    delivery_person: form.delivery_person || null,
    delivery_time: fromLocalInput(form.delivery_time),
    delivery_location: form.delivery_location || null,
    delivery_notes: form.delivery_notes || null,
  };
}

function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading } = useDelivery(id);
  const { data: deliveryPersons } = useDeliveryPersons();
  const { data: deliveryPlatforms } = useDeliveryPlatforms();
  const { data: externalDeliveryPersons } = useExternalDeliveryPersons();

  const updateDelivery = useUpdateDelivery();
  const workflowAction = useDeliveryWorkflowAction();
  const uploadDamageImages = useUploadDamageImages();

  const [form, setForm] = useState<FormState | null>(null);
  const [damageOpen, setDamageOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);

  useEffect(() => { if (delivery) setForm(toForm(delivery)); }, [delivery]);

  const isPickup = form?.delivery_type === "Customer Pickup";
  const isPorter = form?.delivery_type === "Porter Delivery";
  const isMagilshe = form?.delivery_type === "Magilshe Delivery";

  const startLabel = isPickup ? "Mark Picked Up" : "Start Delivery";
  const deliverLabel = isPickup ? "Mark Handed Over" : "Mark Delivered";

  const busy = updateDelivery.isPending || workflowAction.isPending || uploadDamageImages.isPending;

  const change = (key: keyof FormState, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const selectCustomerAddress = (addressId: string) => setForm((current) => {
    if (!current) return current;
    const address = delivery?.customer_addresses.find((item) => String(item.id) === addressId);
    if (!address) return current;
    const location = [address.address, address.city, address.pincode].filter(Boolean).join(", ");
    return {
      ...current,
      customer_address: addressId,
      recipient_name: address.person_name || current.recipient_name,
      recipient_phone: address.phone || current.recipient_phone,
      delivery_location: location,
      porter_location: location,
    };
  });

  const changeDeliveryType = (deliveryType: DeliveryType) => setForm((current) => {
    if (!current || current.delivery_type === deliveryType) return current;

    const customerLocation = current.delivery_location || current.porter_location || current.pickup_location;
    const customerTime = current.delivery_time || current.porter_time || current.pickup_time;

    if (deliveryType === "Magilshe Delivery") {
      return {
        ...current,
        delivery_type: deliveryType,
        delivery_person: "",
        delivery_location: customerLocation,
        delivery_time: customerTime,
      };
    }

    if (deliveryType === "Porter Delivery") {
      return {
        ...current,
        delivery_type: deliveryType,
        external_platform: "",
        external_delivery_person: "",
        porter_id: "",
        porter_name: "",
        porter_contact: "",
        porter_location: customerLocation,
        porter_time: customerTime,
      };
    }

    return {
      ...current,
      delivery_type: deliveryType,
      pickup_person_type: current.pickup_person_type || "Customer",
      pickup_person_name: current.pickup_person_name || current.recipient_name,
      pickup_contact: current.pickup_contact || current.recipient_phone,
      pickup_location: customerLocation,
      pickup_time: customerTime,
    };
  });

  if (isLoading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  if (!delivery || !form) return <EmptyState title="Couldn't load this delivery" />;

  const typeLocked = delivery.delivery_status !== "Pending";

  const save = () => updateDelivery.mutateAsync(toPatchPayload(delivery.id, form));

  const saveOnly = async () => {
    try { await save(); toast.success("Delivery details saved"); }
    catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(response ? Object.values(response).flat().join(" · ") : "Delivery details could not be saved");
    }
  };

  const runAction = async (action: "start" | "deliver") => {
    try {
      await save();
      await workflowAction.mutateAsync({ id: delivery.id, action });
      toast.success(action === "start" ? `${startLabel} recorded` : "Delivery completed and workflow closed");
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(response?.message || "Complete the required delivery fields");
    }
  };

  const submitDamage = async (description: string, files: File[]) => {
    await save();
    await workflowAction.mutateAsync({ id: delivery.id, action: "mark_damaged", damage_description: description });
    if (files.length) await uploadDamageImages.mutateAsync({ id: delivery.id, files });
    toast.success("Delivery marked as damaged");
  };

  const submitFailure = async (reason: string) => {
    await save();
    await workflowAction.mutateAsync({ id: delivery.id, action: "mark_failed", failure_reason: reason });
    toast.success("Delivery marked as failed");
  };

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/delivery")}>
          <ArrowLeft className="size-4" /> Back to Delivery
        </Button>
      </div>

      <PageHeader
        title={delivery.delivery_no}
        description={`${delivery.customer_name} · ${delivery.order_no} · ${delivery.invoice_no}`}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusChip status={delivery.delivery_status} />
            <span className="text-sm text-muted-foreground">
              {Number(delivery.balance_amount) === 0 ? "Paid in full" : `Balance ${inr(Number(delivery.balance_amount))}`}
              {" · "}Scheduled {delivery.scheduled_at ? new Date(delivery.scheduled_at).toLocaleString("en-IN") : "—"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {delivery.delivery_status === "Pending" && (
              <Button size="sm" onClick={() => runAction("start")} disabled={busy}>{startLabel}</Button>
            )}
            {delivery.delivery_status === "Out for Delivery" && (
              <>
                <Button size="sm" onClick={() => runAction("deliver")} disabled={busy}>{deliverLabel}</Button>
                <Button size="sm" variant="outline" onClick={() => setDamageOpen(true)} disabled={busy}>Mark Damaged</Button>
                <Button size="sm" variant="outline" className="text-danger" onClick={() => setFailedOpen(true)} disabled={busy}>Mark Failed</Button>
              </>
            )}
          </div>
        </div>
        {!["Pending", "Out for Delivery"].includes(delivery.delivery_status) && (
          <p className="mt-3 text-sm text-muted-foreground">This order has reached its final delivery outcome.</p>
        )}
        {delivery.delivery_status === "Damaged During Delivery" && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <strong>Damage report:</strong> {delivery.damage_description}
            {delivery.damage_images?.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {delivery.damage_images.map((image) => (
                  <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                    <img src={image.url} alt={image.original_name} className="aspect-square rounded-lg border border-border object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {delivery.delivery_status === "Delivery Failed" && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <strong>Failure reason:</strong> {delivery.failure_reason}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Delivery information" className="lg:col-span-3">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Delivery number</dt><dd className="tabular font-medium">{delivery.delivery_no}</dd></div>
            <div><dt className="text-muted-foreground">Order number</dt><dd className="tabular font-medium">{delivery.order_no}</dd></div>
            <div><dt className="text-muted-foreground">Delivery type</dt><dd className="font-medium">{form.delivery_type}</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{delivery.delivery_status}</dd></div>
            <div><dt className="text-muted-foreground">Completed</dt><dd className="tabular">{delivery.completed_at ? new Date(delivery.completed_at).toLocaleString("en-IN") : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Final payment status</dt><dd className="font-medium">{Number(delivery.balance_amount) === 0 ? "Paid in full" : `Balance ${inr(Number(delivery.balance_amount))}`}</dd></div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Delivery type" description="Choose how this order is handed over to the customer. Only the relevant fields are required.">
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Delivery type">
          {DELIVERY_TYPES.map((type) => (
            <button
              type="button" key={type} disabled={typeLocked} aria-pressed={form.delivery_type === type}
              onClick={() => changeDeliveryType(type)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                form.delivery_type === type ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted",
                typeLocked && "cursor-not-allowed opacity-60",
              )}
            >
              <p className="text-sm font-semibold">{type}</p>
              <p className="text-xs text-muted-foreground">{deliveryTypeHints[type]}</p>
            </button>
          ))}
        </div>
        {typeLocked && <p className="mt-2 text-xs text-muted-foreground">The delivery type is locked once fulfilment has started.</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Recipient name"><Input value={form.recipient_name} onChange={(e) => change("recipient_name", e.target.value)} /></Field>
          <Field label="Recipient phone"><Input value={form.recipient_phone} onChange={(e) => change("recipient_phone", e.target.value)} /></Field>
        </div>

        {!isPickup && delivery.customer_addresses.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Customer delivery address</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {delivery.customer_addresses.map((address) => (
                <label key={address.id} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3 text-sm", form.customer_address === String(address.id) ? "border-primary bg-primary-soft" : "border-border")}>
                  <input type="radio" name="customer-address" value={address.id} checked={form.customer_address === String(address.id)} onChange={(event) => selectCustomerAddress(event.target.value)} />
                  <span className="min-w-0"><span className="block font-medium">{address.title || "Address"}{address.is_primary ? " · Default" : ""}</span><span className="block">{address.person_name} · {address.phone}</span><span className="block text-muted-foreground">{[address.address, address.city, address.pincode].filter(Boolean).join(", ")}</span></span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isPickup && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Person collecting" required>
              <Select value={form.pickup_person_type} onValueChange={(v) => change("pickup_person_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{pickupPersonTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {form.pickup_person_type === "Other" && (
              <Field label="Relationship" required><Input value={form.pickup_person_relationship} onChange={(e) => change("pickup_person_relationship", e.target.value)} /></Field>
            )}
            <Field label="Person name" required><Input value={form.pickup_person_name} onChange={(e) => change("pickup_person_name", e.target.value)} /></Field>
            <Field label="Contact number" required><Input value={form.pickup_contact} onChange={(e) => change("pickup_contact", e.target.value)} /></Field>
            <Field label="Pickup time" required><Input type="datetime-local" value={form.pickup_time} onChange={(e) => change("pickup_time", e.target.value)} /></Field>
            <Field label="Pickup location" required><Input value={form.pickup_location} onChange={(e) => change("pickup_location", e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={form.pickup_notes} onChange={(e) => change("pickup_notes", e.target.value)} /></Field>
          </div>
        )}

        {isMagilshe && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Delivery person" required>
              <Select value={form.delivery_person} onValueChange={(v) => change("delivery_person", v)}>
                <SelectTrigger><SelectValue placeholder="Select delivery staff" /></SelectTrigger>
                <SelectContent>{(deliveryPersons ?? []).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Delivery time" required><Input type="datetime-local" value={form.delivery_time} onChange={(e) => change("delivery_time", e.target.value)} /></Field>
            <Field label="Delivery location" required className="sm:col-span-2"><Input value={form.delivery_location} onChange={(e) => change("delivery_location", e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={form.delivery_notes} onChange={(e) => change("delivery_notes", e.target.value)} /></Field>
          </div>
        )}

        {isPorter && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Platform" required><Select value={form.external_platform} onValueChange={(v) => { change("external_platform", v); change("external_delivery_person", ""); }}><SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger><SelectContent>{(deliveryPlatforms ?? []).filter((p) => p.status || String(p.id) === form.external_platform).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Delivery person" required><Select value={form.external_delivery_person} onValueChange={(v) => change("external_delivery_person", v)}><SelectTrigger><SelectValue placeholder="Select delivery person" /></SelectTrigger><SelectContent>{(externalDeliveryPersons ?? []).filter((p) => String(p.platform) === form.external_platform && (p.status || String(p.id) === form.external_delivery_person)).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} · {p.phone}</SelectItem>)}</SelectContent></Select></Field>
            <div className="sm:col-span-2"><Button variant="link" size="sm" asChild><Link to="/delivery-management/partners">+ Add new delivery person</Link></Button></div>
            <Field label="Delivery location" required><Input value={form.porter_location} onChange={(e) => change("porter_location", e.target.value)} /></Field>
            <Field label="Delivery time" required><Input type="datetime-local" value={form.porter_time} onChange={(e) => change("porter_time", e.target.value)} /></Field>
            <Field label="Delivery charge"><Input type="number" min={0} step={0.01} value={form.porter_amount} onChange={(e) => change("porter_amount", e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={form.porter_notes} onChange={(e) => change("porter_notes", e.target.value)} /></Field>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={saveOnly} disabled={busy}>Save delivery details</Button>
        </div>
      </SectionCard>

      <SectionCard title="Cake details" description="Confirmed fulfilment information inherited from the linked Order." padded={false}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr><th className="px-5 py-3">Cake / Product</th><th className="px-5 py-3">Delivery instructions</th><th className="px-5 py-3">Flavour</th><th className="px-5 py-3">Weight</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(delivery.items ?? []).map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{item.item_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{item.description ?? "—"}</td>
                  <td className="px-5 py-3">{item.flavour ?? "—"}</td>
                  <td className="px-5 py-3">{item.weight ?? "—"}</td>
                  <td className="px-5 py-3 tabular">{item.quantity}</td>
                  <td className="px-5 py-3 text-right tabular font-medium">{inr(Number(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="grid gap-3 border-t border-border p-5 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Order total</dt><dd className="tabular font-medium">{inr(Number(delivery.total_amount))}</dd></div>
          <div><dt className="text-muted-foreground">Advance paid</dt><dd className="tabular font-medium">{inr(Number(delivery.advance_paid))}</dd></div>
          <div><dt className="text-muted-foreground">Final payment status</dt><dd className="font-medium">{Number(delivery.balance_amount) === 0 ? "Paid in full" : `Balance ${inr(Number(delivery.balance_amount))}`}</dd></div>
        </dl>
      </SectionCard>

      <SectionCard title="Timeline" description="Read-only history grouped by date and workflow type.">
        {delivery.timeline?.length ? (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {delivery.timeline.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 left-[-1.4rem] size-2.5 rounded-full bg-primary ring-4 ring-card" />
                <p className="text-sm"><span className="font-semibold">{a.staff_name}</span> <span className="text-muted-foreground">{a.action}</span></p>
                {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{new Date(a.created_on).toLocaleString("en-IN")}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No activity yet" description="Assignment, start, completion and workflow closure events will appear here." />
        )}
      </SectionCard>

      <MarkDamagedDialog open={damageOpen} onOpenChange={setDamageOpen} busy={busy} onSubmit={submitDamage} />
      <MarkFailedDialog open={failedOpen} onOpenChange={setFailedOpen} busy={busy} onSubmit={submitFailure} />
    </>
  );
}

export default DeliveryDetailPage;
