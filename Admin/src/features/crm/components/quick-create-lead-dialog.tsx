import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  type CrmCustomerSearchResult,
} from "@/features/crm/hooks";
import { CustomerMatchPicker } from "./customer-match-picker";
import { quantityMin, quantityStep, useSaleUnits, type SaleUnit } from "@/features/crm/sale-units";
import { configuredOptions } from "@/features/crm/config-options";
import { OptionCombobox } from "@/features/crm/components/option-combobox";
import { useCreateCrmOptionFromText } from "@/features/crm/options-hooks";

const emptyQuickLead = {
  customer_id: null as number | null,
  customer_name: "",
  phone: "",
  occasion: "",
  cake_type: "",
  flavour: "",
  weight: "",
  quantity: "" as number | string,
  unit_type: "kg" as SaleUnit,
  estimated_amount: "",
  event_date: "",
};

export function QuickCreateLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { units: saleUnits } = useSaleUnits();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyQuickLead);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);

  const { data: occasions } = useCrmOptions("occasion");
  const { data: cakeTypes } = useCrmOptions("cake_type");
  const { data: flavours } = useCrmOptions("cake_flavour");
  const { data: productRates } = useCrmOptions("product_rate");
  const occasionOptions = configuredOptions(occasions);
  const cakeTypeOptions = configuredOptions(cakeTypes);
  const flavourOptions = configuredOptions(flavours);
  const productRateOptions = configuredOptions(productRates);
  const createOption = useCreateCrmOptionFromText();
  const createLead = useCreateLead();

  useEffect(() => {
    if (!open) {
      setForm(emptyQuickLead);
      setErrors({});
      setMatched(null);
    }
  }, [open]);

  const applyMatch = (customer: CrmCustomerSearchResult) => {
    setMatched(customer);
    setForm((f) => ({
      ...f,
      customer_id: customer.id,
      customer_name: customer.name || f.customer_name,
      phone: customer.phone.slice(-10) || f.phone,
    }));
  };

  const submit = async () => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    const clientErrors: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(phoneDigits))
      clientErrors["phone"] = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
    if (!form.customer_name.trim()) clientErrors["customer_name"] = "Customer name is required.";
    if (!form.occasion.trim()) clientErrors["occasion"] = "Occasion is required.";
    if (!form.cake_type.trim()) clientErrors["cake_type"] = "Cake type is required.";
    if (!form.event_date) clientErrors["event_date"] = "Event date is required.";
    if (form.quantity === "") clientErrors["quantity"] = "Quantity is required.";
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
            <CustomerMatchPicker term={form.phone.length >= 3 ? form.phone : form.customer_name} selected={matched} onSelect={applyMatch} onChange={() => { setMatched(null); setForm((f) => ({ ...f, customer_id: null })); }}/>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Order requirement
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Occasion" required error={errors["occasion"]}>
                <OptionCombobox value={form.occasion} options={occasionOptions} onChange={(v) => setForm((f) => ({ ...f, occasion: v }))} onCreateOption={createOption("occasion", occasionOptions)} placeholder="Select or type occasion" />
                {!occasionOptions.length && <p className="text-xs text-warning">Add an active occasion in CRM Settings.</p>}
              </Field>
              <Field label="Cake type" required error={errors["cake_type"]}>
                <OptionCombobox value={form.cake_type} options={cakeTypeOptions} onChange={(v) => setForm((f) => ({ ...f, cake_type: v }))} onCreateOption={createOption("cake_type", cakeTypeOptions)} placeholder="Select or type cake type" />
                {!cakeTypeOptions.length && <p className="text-xs text-warning">Add an active cake type in CRM Settings.</p>}
              </Field>
              <Field label="Flavour">
                <OptionCombobox value={form.flavour} options={flavourOptions} onChange={(v) => setForm((f) => ({ ...f, flavour: v }))} onCreateOption={createOption("cake_flavour", flavourOptions)} placeholder="Select or type flavour" />
              </Field>
              <Field label="Quantity" required>
                <Input
                  type="number"
                  min={quantityMin(form.unit_type)}
                  step={quantityStep(form.unit_type)}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </Field>
              <Field label="Unit" required>
                <Select value={form.unit_type} onValueChange={(unit_type) => setForm((f) => ({ ...f, unit_type: unit_type as SaleUnit }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{saleUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Rate">
                <OptionCombobox type="number" min={0} value={form.estimated_amount} options={productRateOptions} onChange={(v) => setForm((f) => ({ ...f, estimated_amount: v }))} onCreateOption={createOption("product_rate", productRateOptions)} placeholder="Select or type rate" />
              </Field>
              <Field label="Amount"><Input readOnly value={(Number(form.quantity || 0) * Number(form.estimated_amount || 0)).toFixed(2)} /></Field>
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
