import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserRoundCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import {
  useCreateLead,
  useCrmOptions,
  searchCrmCustomers,
  type CrmCustomerSearchResult,
} from "@/features/crm/hooks";

const emptyQuickLead = {
  customer_name: "",
  phone: "",
  occasion: "Birthday",
  cake_type: "Custom Cake",
  flavour: "",
  weight: "",
  quantity: 1,
  event_date: "",
};

export function QuickCreateLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyQuickLead);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: occasions } = useCrmOptions("occasion");
  const { data: flavours } = useCrmOptions("cake_flavour");
  const createLead = useCreateLead();

  useEffect(() => {
    if (!open) {
      setForm(emptyQuickLead);
      setErrors({});
      setMatched(null);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const phoneDigits = form.phone.replace(/\D/g, "");
    const term =
      phoneDigits.length === 10
        ? phoneDigits
        : form.customer_name.length >= 3
          ? form.customer_name
          : "";
    if (!term) {
      setMatched(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCrmCustomers(term);
      const exact =
        results.find((r) => r.phone.replace(/\D/g, "").endsWith(phoneDigits)) ?? results[0] ?? null;
      setMatched(exact);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [form.phone, form.customer_name]);

  const applyMatch = () => {
    if (!matched) return;
    setForm((f) => ({
      ...f,
      customer_name: matched.name || f.customer_name,
      phone: matched.phone.slice(-10) || f.phone,
    }));
  };

  const submit = async () => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    const clientErrors: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(phoneDigits))
      clientErrors["phone"] = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
    if (!form.customer_name.trim()) clientErrors["customer_name"] = "Customer name is required.";
    if (!form.event_date) clientErrors["event_date"] = "Event date is required.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      const data = await createLead.mutateAsync(form);
      toast.success("Lead created successfully");
      onOpenChange(false);
      navigate(`/crm/leads/${data.id}/edit`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors: Record<string, string> = {};
      if (response) {
        for (const [key, value] of Object.entries(response)) {
          fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
        }
      }
      setErrors(fieldErrors);
      toast.error(fieldErrors["detail"] ?? fieldErrors["message"] ?? "Unable to create lead.");
    }
  };

  const openFullForm = () => {
    onOpenChange(false);
    navigate("/crm/leads/new", { state: { leadDraft: form } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Capture the essentials — you can fill in the rest later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Customer
            </p>
            <Field label="Customer name" required error={errors["customer_name"]}>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              />
            </Field>
            <Field label="Phone" required error={errors["phone"]}>
              <Input
                value={form.phone}
                maxLength={10}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))
                }
              />
            </Field>
            {matched && (
              <button
                type="button"
                onClick={applyMatch}
                className="flex w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-left text-xs text-primary transition-colors hover:bg-primary-soft/70"
              >
                <UserRoundCheck className="size-3.5 shrink-0" />
                Existing customer found — {matched.name} ({matched.phone}). Tap to use their
                details.
              </button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Order requirement
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Occasion" required>
                <Select
                  value={form.occasion}
                  onValueChange={(v) => setForm((f) => ({ ...f, occasion: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(occasions?.length
                      ? occasions
                      : ["Birthday", "Wedding", "Anniversary", "Other"]
                    ).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Flavour">
                <Select
                  value={form.flavour}
                  onValueChange={(v) => setForm((f) => ({ ...f, flavour: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(flavours ?? []).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity" required>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: Number(e.target.value) || 1 }))
                  }
                />
              </Field>
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  inputMode="decimal"
                  placeholder="e.g. 1.5"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </Field>
              <Field label="Event date" required error={errors["event_date"]}>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={openFullForm}>
            Open full form
          </Button>
          <Button type="button" onClick={submit} disabled={createLead.isPending}>
            {createLead.isPending ? "Creating…" : "Create lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
