import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateLead,
  useUpdateLead,
  useLead,
  useCrmOptions,
  useUploadLeadReferenceImages,
  useDeleteLeadReferenceImage,
  useConvertLead,
  type CrmCustomerSearchResult,
  type LeadStatus,
} from "@/features/crm/hooks";
import { WonQuotationDialog } from "@/features/crm/components/won-quotation-dialog";
import { LeadWorkflowTracker } from "@/features/crm/components/lead-workflow-tracker";
import { CustomerMatchPicker } from "@/features/crm/components/customer-match-picker";
import { CrmHistoryTimeline } from "@/features/crm/components/crm-history-timeline";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import { quantityMin, quantityStep, useSaleUnits, type SaleUnit } from "@/features/crm/sale-units";
import { formatTimeOfDay, normalizeTimeOfDayInput } from "@/lib/format-time";
import { configuredOptions, optionsWithCurrent } from "@/features/crm/config-options";
import { OptionCombobox } from "@/features/crm/components/option-combobox";

const blank = {
  customer_id: null as number | null,
  customer_name: "",
  phone: "",
  email: "",
  whatsapp_number: "",
  alternate_phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  cake_type: "",
  flavour: "",
  shape: "",
  weight: "",
  quantity: "" as number | string,
  unit_type: "kg" as SaleUnit,
  theme: "",
  occasion: "",
  event_date: "",
  delivery_date: "",
  delivery_time: "",
  budget: "",
  estimated_amount: "",
  cake_message: "",
  customer_notes: "",
  internal_notes: "",
  status: "Open" as LeadStatus,
  follow_up_date: "",
  follow_up_time: "",
  follow_up_notes: "",
  lead_source: "",
  lead_source_details: "",
  staff_remarks: "",
  winning_reason: "",
  loss_reason: "",
  internal_sales_notes: "",
};

const statusChoicesByOriginal: Record<string, LeadStatus[]> = {
  Open: ["Open", "Follow-up", "Won", "Lost"],
  "Follow-up": ["Follow-up", "Won", "Lost"],
  Won: ["Won"],
  Lost: ["Lost"],
};

function LeadFormPage() {
  const { units: saleUnits } = useSaleUnits();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state as { leadDraft?: Record<string, unknown> } | null)?.leadDraft;

  const isEdit = !!id;
  const { data: existingLead, isLoading } = useLead(id);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const uploadImages = useUploadLeadReferenceImages();
  const deleteImage = useDeleteLeadReferenceImage();
  const convertLead = useConvertLead();
  const access = useCurrentAccess();

  const [form, setForm] = useState<typeof blank>({ ...blank, ...(draft ?? {}) });
  const [originalStatus, setOriginalStatus] = useState<string>("Open");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);
  const [wonLead, setWonLead] = useState<typeof existingLead | null>(null);

  const { data: occasions } = useCrmOptions("occasion");
  const { data: cakeTypes } = useCrmOptions("cake_type");
  const { data: flavours } = useCrmOptions("cake_flavour");
  const { data: productRates } = useCrmOptions("product_rate");
  const { data: leadSources } = useCrmOptions("lead_source");
  const { data: deliveryTimeSlots } = useCrmOptions("delivery_time_slot");
  const { data: winningReasons } = useCrmOptions("winning_reason");
  const { data: lossReasons } = useCrmOptions("loss_reason");
  const occasionOptions = optionsWithCurrent(occasions, isEdit ? form.occasion : "");
  const cakeTypeOptions = optionsWithCurrent(cakeTypes, isEdit ? form.cake_type : "");
  const flavourOptions = optionsWithCurrent(flavours, isEdit ? form.flavour : "");
  const productRateOptions = optionsWithCurrent(productRates, isEdit ? form.estimated_amount : "");
  const leadSourceOptions = optionsWithCurrent(leadSources, isEdit ? form.lead_source : "");
  const winningReasonOptions = optionsWithCurrent(winningReasons, isEdit ? form.winning_reason : "");
  const lossReasonOptions = optionsWithCurrent(lossReasons, isEdit ? form.loss_reason : "");

  useEffect(() => {
    if (existingLead) {
      setForm({ ...blank, ...existingLead } as typeof blank);
      setOriginalStatus(existingLead.status);
    }
  }, [existingLead]);

  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyMatch = (customer: CrmCustomerSearchResult) => {
    setMatched(customer);
    setForm((f) => ({
      ...f,
      customer_id: customer.id,
      customer_name: customer.name || f.customer_name,
      phone: customer.phone.slice(-10) || f.phone,
      email: customer.email || f.email,
      address: customer.addresses?.[0]?.address || f.address,
      city: customer.addresses?.[0]?.city || f.city,
      pincode: customer.addresses?.[0]?.pincode || f.pincode,
    }));
  };

  const statusChoices = isEdit ? (statusChoicesByOriginal[originalStatus] ?? ["Open"]) : ["Open"];

  const createQuotation = async (markWon: boolean) => {
    if (!existingLead) return;
    try {
      const result = await convertLead.mutateAsync({ id: existingLead.id, markWon });
      toast.success(result.message, { description: `Quotation ${result.data.quotation_no}` });
      navigate(`/crm/quotations/${result.data.id}/edit`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Unable to create quotation.");
    }
  };

  const canGenerateQuotation =
    hasPermission(access.data, "crm.leads.process") &&
    hasPermission(access.data, "crm.quotations.create");

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
    if (form.status === "Follow-up" && !form.follow_up_date) clientErrors["follow_up_date"] = "Next follow-up date is required.";
    if (form.status === "Follow-up" && !form.follow_up_notes.trim()) clientErrors["follow_up_notes"] = "Follow-up notes are required.";
    if (form.status === "Won" && !form.winning_reason.trim()) clientErrors["winning_reason"] = "Reason for winning is required.";
    if (form.status === "Lost" && !form.loss_reason.trim()) clientErrors["loss_reason"] = "Reason for loss is required.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      const data = isEdit
        ? await updateLead.mutateAsync({ id: id!, payload: form })
        : await createLead.mutateAsync(form);

      if (referenceFiles.length) {
        await uploadImages.mutateAsync({ id: data.id, files: referenceFiles });
        setReferenceFiles([]);
      }
      toast.success(isEdit ? "Lead updated successfully" : "Lead created successfully");

      if (data.status === "Won" && originalStatus !== "Won") {
        setWonLead(data);
      } else {
        navigate(`/crm/leads/${data.id}/edit`);
      }
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors: Record<string, string> = {};
      if (response) {
        for (const [key, value] of Object.entries(response)) {
          fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
        }
      }
      setErrors(fieldErrors);
      toast.error(fieldErrors["detail"] ?? fieldErrors["message"] ?? "Unable to save lead.");
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/leads")}>
          <ArrowLeft className="size-4" /> All leads
        </Button>
      </div>

      <PageHeader
        title={isEdit ? (existingLead?.lead_no ?? "Edit lead") : "Create full lead"}
        description={
          isEdit && form.customer_name
            ? `${form.customer_name} · Edit the existing enquiry without changing its workflow.`
            : "All enquiry details in one clear, organised workspace."
        }
        actions={
          <>
            {existingLead && canGenerateQuotation && !existingLead.quotation_id && (
              <Button
                variant="outline"
                onClick={() => createQuotation(false)}
                disabled={convertLead.isPending}
                title="Create or open a quotation without changing the Lead status"
              >
                Move to Quotation
              </Button>
            )}
            {existingLead?.quotation_id && (
              <Button variant="outline" asChild>
                <Link to={`/crm/quotations/${existingLead.quotation_id}/edit`}>View Quotation</Link>
              </Button>
            )}
            {existingLead && existingLead.status !== "Won" && canGenerateQuotation && (
              <Button
                onClick={() => createQuotation(true)}
                disabled={convertLead.isPending}
                title="Mark the Lead Won, then create or open its quotation"
              >
                {convertLead.isPending ? "Processing…" : "Won & Generate Quotation"}
              </Button>
            )}
            <Button onClick={submit} disabled={createLead.isPending || updateLead.isPending}>
              {isEdit ? "Save changes" : "Create lead"}
            </Button>
          </>
        }
      />

      {isEdit && existingLead && (
        <div className="flex flex-wrap gap-6 rounded-2xl border border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Lead ID</p>
            <p className="font-semibold tabular">{existingLead.lead_no}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-semibold">
              {new Date(existingLead.created_on).toLocaleDateString("en-IN")}
            </p>
          </div>
          {existingLead.quotation_id && (
            <div>
              <p className="text-xs text-muted-foreground">Quotation</p>
              <Link
                to={`/crm/quotations/${existingLead.quotation_id}`}
                className="font-semibold text-primary hover:underline"
              >
                View quotation
              </Link>
            </div>
          )}
        </div>
      )}

      <SectionCard title="Customer Information">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer name" required error={errors["customer_name"]}>
            <Input
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
            />
          </Field>
          <Field label="Phone" required error={errors["phone"]}>
            <Input
              value={form.phone}
              maxLength={10}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="WhatsApp number">
            <Input
              value={form.whatsapp_number}
              maxLength={10}
              onChange={(e) => set("whatsapp_number", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Alternate phone">
            <Input
              value={form.alternate_phone}
              maxLength={10}
              onChange={(e) => set("alternate_phone", e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label="Pincode">
            <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2 lg:col-span-3">
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
        </div>
        {!isEdit && <CustomerMatchPicker term={form.phone.length >= 3 ? form.phone : form.customer_name} selected={matched} onSelect={applyMatch} onChange={() => { setMatched(null); setForm((f) => ({ ...f, customer_id: null })); }}/>} 
      </SectionCard>

      <SectionCard title="Event Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Occasion" required error={errors["occasion"]}>
            <OptionCombobox value={form.occasion} options={occasionOptions} onChange={(v) => set("occasion", v)} placeholder="Select or type occasion" />
            {!occasionOptions.length && <p className="text-xs text-warning">Add an active occasion in CRM Settings.</p>}
          </Field>
          <Field label="Event date" required error={errors["event_date"]}>
            <Input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Cake Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Cake type" required error={errors["cake_type"]}>
            <OptionCombobox value={form.cake_type} options={cakeTypeOptions} onChange={(v) => set("cake_type", v)} placeholder="Select or type cake type" />
            {!cakeTypeOptions.length && <p className="text-xs text-warning">Add an active cake type in CRM Settings.</p>}
          </Field>
          <Field label="Flavour">
            <OptionCombobox value={form.flavour} options={flavourOptions} onChange={(v) => set("flavour", v)} placeholder="Select or type flavour" />
          </Field>
          <Field label="Shape">
            <Input value={form.shape} onChange={(e) => set("shape", e.target.value)} />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min={quantityMin(form.unit_type)}
              step={quantityStep(form.unit_type)}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </Field>
          <Field label="Unit" required>
            <Select value={form.unit_type} onValueChange={(v) => set("unit_type", v as SaleUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{saleUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Theme">
            <Input value={form.theme} onChange={(e) => set("theme", e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium">Reference cake images</p>
          <p className="text-xs text-muted-foreground">Supported: JPG, JPEG, PNG, WEBP up to 10 MB. Images are uploaded when the lead is saved.</p>
          <div className="flex flex-wrap gap-2">
            {(existingLead?.reference_images ?? []).map((img) => (
              <div
                key={img.id}
                className="group relative size-20 overflow-hidden rounded-xl border border-border"
              >
                <img src={img.url} alt={img.original_name} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => id && deleteImage.mutate({ leadId: id, imageId: img.id })}
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {referenceFiles.map((file, i) => (
              <div
                key={i}
                className="group relative size-20 overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReferenceFiles((files) => files.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-center transition-colors hover:border-primary hover:bg-primary-soft/40">
              <ImagePlus className="size-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">Add</span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) =>
                  setReferenceFiles((files) => [...files, ...Array.from(e.target.files ?? [])])
                }
              />
            </label>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Delivery Information"
        description="Only the expected handover date and time are captured at lead stage. Method and address are collected later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery date">
            <Input
              type="date"
              value={form.delivery_date}
              onChange={(e) => set("delivery_date", e.target.value)}
            />
          </Field>
          <Field label="Delivery time">
            <Input
              type="text"
              list="lead-delivery-time-slots"
              placeholder="Select or type a time"
              value={formatTimeOfDay(form.delivery_time)}
              onChange={(e) => set("delivery_time", normalizeTimeOfDayInput(e.target.value))}
            />
            <datalist id="lead-delivery-time-slots">{configuredOptions(deliveryTimeSlots).map((slot) => <option key={slot} value={formatTimeOfDay(slot)} />)}</datalist>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget">
            <Input
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
            />
          </Field>
          <Field label="Rate">
            <OptionCombobox type="number" min={0} value={form.estimated_amount} options={productRateOptions} onChange={(v) => set("estimated_amount", v)} placeholder="Select or type rate" />
          </Field>
          <Field label="Amount">
            <Input readOnly value={(Number(form.quantity || 0) * Number(form.estimated_amount || 0)).toFixed(2)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Status" description="Move the lead through the sales workflow.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" required>
            <Select value={form.status} onValueChange={(v) => set("status", v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusChoices.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-5">
          <LeadWorkflowTracker status={existingLead?.status ?? form.status} hasQuotation={Boolean(existingLead?.quotation_id)} />
        </div>
        {form.status === "Follow-up" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Next follow-up date" required error={errors["follow_up_date"]}>
              <Input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => set("follow_up_date", e.target.value)}
              />
            </Field>
            <Field label="Follow-up time">
              <Input
                type="time"
                value={form.follow_up_time}
                onChange={(e) => set("follow_up_time", e.target.value)}
              />
            </Field>
            <Field label="Follow-up notes" required error={errors["follow_up_notes"]} className="sm:col-span-2">
              <Textarea
                rows={3}
                value={form.follow_up_notes}
                onChange={(e) => set("follow_up_notes", e.target.value)}
              />
            </Field>
          </div>
        )}
        {form.status === "Won" && (
          <div className="mt-4">
            <Field label="Reason for winning" required error={errors["winning_reason"]}>
              <Select value={form.winning_reason} onValueChange={(value) => set("winning_reason", value)}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>{winningReasonOptions.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
              </Select>
              {!winningReasonOptions.length && <p className="text-xs text-warning">Add an active winning reason in CRM Settings.</p>}
            </Field>
          </div>
        )}
        {form.status === "Lost" && (
          <div className="mt-4">
            <Field label="Reason for loss" required error={errors["loss_reason"]}>
              <Select value={form.loss_reason} onValueChange={(value) => set("loss_reason", value)}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>{lossReasonOptions.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
              </Select>
              {!lossReasonOptions.length && <p className="text-xs text-warning">Add an active loss reason in CRM Settings.</p>}
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cake Content">
        <div className="grid gap-4">
          <Field label="Message to appear on cake">
            <Textarea
              rows={2}
              value={form.cake_message}
              onChange={(e) => set("cake_message", e.target.value)}
            />
          </Field>
          <Field label="Customer notes">
            <Textarea
              rows={2}
              value={form.customer_notes}
              onChange={(e) => set("customer_notes", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Sales Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead source">
            <OptionCombobox value={form.lead_source} options={leadSourceOptions} onChange={(v) => set("lead_source", v)} placeholder="Select or type source" />
            {!leadSourceOptions.length && <p className="text-xs text-warning">Add an active lead source in CRM Settings.</p>}
          </Field>
          <Field label="Lead source details">
            <Input
              value={form.lead_source_details}
              onChange={(e) => set("lead_source_details", e.target.value)}
            />
          </Field>
          <Field label="Internal sales notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.internal_sales_notes}
              onChange={(e) => set("internal_sales_notes", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {isEdit && (
        <SectionCard title="Activity">
          <CrmHistoryTimeline events={existingLead?.activities} />
        </SectionCard>
      )}

      <WonQuotationDialog
        lead={wonLead ?? null}
        open={wonLead !== null}
        onOpenChange={(v) => {
          if (!v) {
            const lead = wonLead;
            setWonLead(null);
            navigate(`/crm/leads/${(lead as { id: string | number })?.id}/edit`);
          }
        }}
        onGenerated={(quotationId) => {
          setWonLead(null);
          navigate(`/crm/quotations/${quotationId}/edit`);
        }}
      />
    </>
  );
}

export default LeadFormPage;
