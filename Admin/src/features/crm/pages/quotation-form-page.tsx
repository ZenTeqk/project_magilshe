import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Download, Eye, Lock, Plus, Settings2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inr } from "@/lib/data";
import {
  useCrmOptions,
  useLead,
  useConvertLead,
  searchCrmCustomers,
  type CrmCustomerSearchResult,
} from "@/features/crm/hooks";
import {
  useQuotation,
  useCreateQuotation,
  useUpdateQuotation,
  useGenerateQuotationVersion,
  useQuotationWorkflowAction,
  useConfirmQuotationOrder,
  useCompanyConfig,
  type QuotationItem,
} from "@/features/crm/quotations-hooks";
import { GstRateDialog } from "@/features/crm/components/gst-rate-dialog";
import { RecordQuotationPaymentDialog } from "@/features/crm/components/record-quotation-payment-dialog";
import { CrmHistoryTimeline } from "@/features/crm/components/crm-history-timeline";
import { buildQuotationPdf } from "@/features/crm/lib/pdf-template";
import { WorkflowTracker } from "@/features/crm/components/workflow-tracker";
import { CustomerMatchPicker } from "@/features/crm/components/customer-match-picker";
import { calculateLineItem, quantityMin, quantityStep, useSaleUnits } from "@/features/crm/sale-units";
import { formatTimeOfDay, normalizeTimeOfDayInput } from "@/lib/format-time";

const emptyItem: QuotationItem = {
  item_name: "",
  description: "",
  flavour: "",
  weight: "",
  quantity: "",
  unit_type: "kg",
  rate: "",
  gst_percentage: "",
};

const blank = {
  customer: null as number | null,
  customer_name: "",
  phone: "",
  email: "",
  billing_address: "",
  shipping_same_as_billing: true,
  address: "",
  occasion: "",
  event_date: "",
  valid_until: "",
  delivery_type: "Delivery",
  delivery_date: "",
  delivery_time: "",
  special_instructions: "",
  payment_terms: "",
  notes: "",
  discount_amount: "0",
  items: [emptyItem],
};

function QuotationFormPage() {
  const { units: saleUnits } = useSaleUnits();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead") ?? undefined;
  const navigate = useNavigate();

  const isEdit = !!id;
  const { data: existingQuotation, isLoading } = useQuotation(id);
  const { data: leadForPrefill } = useLead(!isEdit ? leadId : undefined);
  const { data: gstRates } = useCrmOptions("tax_setting");
  const { data: cakeProducts } = useCrmOptions("cake_product");
  const { data: deliveryTimeSlots } = useCrmOptions("delivery_time_slot");
  const { data: company } = useCompanyConfig();

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const generateQuotationVersion = useGenerateQuotationVersion();
  const convertLead = useConvertLead();
  const workflowAction = useQuotationWorkflowAction();
  const confirmOrder = useConfirmQuotationOrder();

  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [gstDialogOpen, setGstDialogOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<number[]>([]);

  useEffect(() => {
    if (existingQuotation) {
      setForm({
        customer: existingQuotation.customer,
        customer_name: existingQuotation.customer_name ?? "",
        phone: existingQuotation.phone ?? "",
        email: existingQuotation.email ?? "",
        billing_address: existingQuotation.billing_address ?? "",
        shipping_same_as_billing: existingQuotation.shipping_same_as_billing ?? true,
        address: existingQuotation.address ?? "",
        occasion: existingQuotation.occasion ?? "",
        event_date: existingQuotation.event_date ?? "",
        valid_until: existingQuotation.valid_until ?? "",
        delivery_type: existingQuotation.delivery_type ?? "Delivery",
        delivery_date: existingQuotation.delivery_date ?? "",
        delivery_time: existingQuotation.delivery_time ?? "",
        special_instructions: existingQuotation.special_instructions ?? "",
        payment_terms: existingQuotation.payment_terms ?? "",
        notes: existingQuotation.notes ?? "",
        discount_amount: String(existingQuotation.discount_amount ?? "0"),
        items: existingQuotation.items?.length ? existingQuotation.items : [emptyItem],
      });
    }
  }, [existingQuotation]);

  const latestVersionId = existingQuotation?.quotation_versions?.[0]?.id;

  useEffect(() => {
    if (latestVersionId) setExpandedVersions([latestVersionId]);
  }, [existingQuotation?.id, latestVersionId]);

  useEffect(() => {
    if (isEdit || !leadForPrefill) return;
    setForm((f) => ({
      ...f,
      customer: leadForPrefill.customer_id ?? null,
      customer_name: leadForPrefill.customer_name ?? "",
      phone: leadForPrefill.phone ?? "",
      email: leadForPrefill.email ?? "",
      billing_address: leadForPrefill.address ?? "",
      address: leadForPrefill.delivery_address ?? leadForPrefill.address ?? "",
      occasion: leadForPrefill.occasion ?? "",
      event_date: leadForPrefill.event_date ?? "",
      delivery_type: leadForPrefill.delivery_type ?? f.delivery_type,
      delivery_date: leadForPrefill.delivery_date ?? "",
      delivery_time: leadForPrefill.delivery_time ?? "",
      notes: leadForPrefill.customer_notes ?? "",
      special_instructions: leadForPrefill.internal_notes ?? "",
      items: [
        {
          item_name: leadForPrefill.cake_type ?? "",
          description: "",
          flavour: leadForPrefill.flavour ?? "",
          weight: leadForPrefill.weight ?? "",
          quantity: leadForPrefill.quantity ?? 1,
          unit_type: leadForPrefill.unit_type ?? "kg",
          rate: leadForPrefill.estimated_amount ?? leadForPrefill.budget ?? "",
          gst_percentage: "",
        },
      ],
    }));
  }, [leadForPrefill, isEdit]);

  useEffect(() => {
    if (!leadForPrefill?.customer_id || !leadForPrefill.phone) return;
    searchCrmCustomers(leadForPrefill.phone).then((results) => {
      const customer = results.find((row) => row.id === leadForPrefill.customer_id);
      if (customer) setMatched(customer);
    });
  }, [leadForPrefill]);

  const applyMatch = (customer: CrmCustomerSearchResult) => {
    setMatched(customer);
    const primary = customer.addresses.find((address) => address.is_primary) ?? customer.addresses[0];
    const addressText = primary ? [primary.address, primary.city, primary.pincode].filter(Boolean).join(", ") : "";
    setForm((f) => ({
      ...f,
      customer: customer.id,
      customer_name: customer.name || f.customer_name,
      phone: customer.phone.slice(-10) || f.phone,
      email: customer.email || f.email,
      billing_address: addressText || f.billing_address,
      address: addressText || f.address,
    }));
  };

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, it) => sum + calculateLineItem(it.quantity, it.rate).baseAmount, 0);
    const gst = form.items.reduce((sum, it) => sum + calculateLineItem(it.quantity, it.rate, it.gst_percentage).gstAmount, 0);
    const discount = Number(form.discount_amount) || 0;
    const total = Math.max(0, subtotal + gst - discount);
    return { subtotal, gst, total };
  }, [form.items, form.discount_amount]);

  const advanceAmount = Number(existingQuotation?.advance_amount ?? 0);
  const hasRecordedAdvance = Boolean(
    existingQuotation?.advance_received || advanceAmount > 0 || existingQuotation?.payments?.length,
  );
  const balance = Math.max(
    0,
    totals.total - advanceAmount,
  );

  const setItem = (index: number, patch: Partial<QuotationItem>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  };
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (index: number) =>
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
    }));

  const buildPayload = () => ({
    customer: form.customer,
    customer_name: form.customer_name,
    phone: form.phone,
    email: form.email || null,
    billing_address: form.billing_address || null,
    shipping_same_as_billing: form.shipping_same_as_billing,
    address: form.shipping_same_as_billing ? form.billing_address : form.address,
    occasion: form.occasion || null,
    event_date: form.event_date || null,
    valid_until: form.valid_until || null,
    delivery_type: form.delivery_type,
    delivery_date: form.delivery_date || null,
    delivery_time: normalizeTimeOfDayInput(form.delivery_time) || null,
    special_instructions: form.special_instructions || null,
    payment_terms: form.payment_terms || null,
    notes: form.notes || null,
    discount_amount: form.discount_amount || "0",
    items: form.items
      .filter((it) => it.item_name.trim())
      .map((it, i) => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        gst_percentage: Number(it.gst_percentage) || 0,
        sort_order: i,
      })),
  });

  const normalizedDocumentData = (source: ReturnType<typeof buildPayload>) => ({
    customer: source.customer ?? null,
    customer_name: source.customer_name.trim(),
    phone: source.phone.trim(),
    email: source.email ?? null,
    billing_address: source.billing_address ?? null,
    shipping_same_as_billing: source.shipping_same_as_billing,
    address: source.address ?? null,
    occasion: source.occasion ?? null,
    event_date: source.event_date ?? null,
    valid_until: source.valid_until ?? null,
    delivery_type: source.delivery_type ?? null,
    delivery_date: source.delivery_date ?? null,
    delivery_time: normalizeTimeOfDayInput(source.delivery_time) || null,
    special_instructions: source.special_instructions ?? null,
    payment_terms: source.payment_terms ?? null,
    notes: source.notes ?? null,
    discount_amount: Number(source.discount_amount ?? 0),
    items: source.items.map((item) => ({
      item_name: item.item_name.trim(),
      description: item.description?.trim() || null,
      flavour: item.flavour?.trim() || null,
      weight: item.weight === "" || item.weight == null ? null : Number(item.weight),
      quantity: Number(item.quantity),
      unit_type: item.unit_type,
      rate: Number(item.rate),
      gst_percentage: Number(item.gst_percentage),
      sort_order: item.sort_order ?? 0,
    })),
  });

  const generatedData = existingQuotation?.current_version?.snapshot;
  const hasDocumentChanges = useMemo(() => {
    if (!generatedData) return false;
    const snapshotPayload = {
      ...generatedData,
      items: generatedData.items ?? [],
    } as unknown as ReturnType<typeof buildPayload>;
    return JSON.stringify(normalizedDocumentData(buildPayload())) !==
      JSON.stringify(normalizedDocumentData(snapshotPayload));
  }, [form, generatedData]);

  const save = async () => {
    if (isFinalizedLocked) {
      toast.error("This quotation is locked. Create a new quotation for changes.");
      return;
    }
    const clientErrors: Record<string, string> = {};
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) clientErrors["phone"] = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
    if (!form.customer_name.trim()) clientErrors["customer_name"] = "Customer name is required.";
    if (!form.items.some((it) => it.item_name.trim() && Number(it.rate) > 0))
      clientErrors["items"] = "Add at least one item with a name and rate.";
    if (form.items.some((it) => it.item_name.trim() && it.quantity === ""))
      clientErrors["items"] = "Quantity is required for every item.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      if (isEdit) {
        await updateQuotation.mutateAsync({ id: id!, payload: buildPayload() });
        toast.success("Changes saved", { description: "Create a new quotation version when the document is ready." });
      } else if (leadId) {
        const result = await convertLead.mutateAsync({ id: leadId });
        const created = result.data as unknown as { id: number };
        await generateQuotationVersion.mutateAsync({ id: created.id, payload: buildPayload() });
        toast.success("Quotation created");
        navigate(`/crm/quotations/${created.id}/edit`);
      } else {
        const created = await createQuotation.mutateAsync(buildPayload());
        toast.success("Quotation created");
        navigate(`/crm/quotations/${created.id}/edit`);
      }
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors: Record<string, string> = {};
      if (response)
        for (const [key, value] of Object.entries(response))
          fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
      setErrors(fieldErrors);
      toast.error(fieldErrors["detail"] ?? fieldErrors["message"] ?? "Unable to save quotation.");
    }
  };

  const generateVersion = async () => {
    if (!id || !hasDocumentChanges) return;
    if (isFinalizedLocked) {
      toast.error("This quotation is locked. Create a new quotation for changes.");
      return;
    }
    try {
      await generateQuotationVersion.mutateAsync({ id, payload: buildPayload() });
      toast.success("Quotation updated", { description: "A new fixed PDF snapshot has been created." });
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(response ? Object.values(response).flat().join(" ") : "Unable to create quotation version.");
    }
  };

  const runWorkflow = async (action: "send" | "accept" | "cancel") => {
    if (!id) return;
    try {
      await workflowAction.mutateAsync({ id, action });
      toast.success(
        action === "send"
          ? "Quotation sent"
          : action === "accept"
            ? "Quotation accepted"
            : "Quotation cancelled",
      );
    } catch {
      toast.error("Unable to update quotation status.");
    } finally {
      setCancelOpen(false);
    }
  };

  const runConfirmOrder = async () => {
    if (!id) return;
    try {
      const result = await confirmOrder.mutateAsync(id);
      toast.success(result.message, { description: `Order ${result.data.order_no}` });
      navigate(`/crm/orders/${result.data.id}`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(response ? Object.values(response).flat().join(" ") : "Unable to confirm order.");
    }
  };

  const previewPdf = async () => {
    if (!generatedData) return;
    const doc = await buildQuotationPdf(generatedData, company);
    window.open(doc.output("bloburl") as unknown as string, "_blank");
  };
  const downloadPdf = async () => {
    if (!existingQuotation || !generatedData) return;
    const doc = await buildQuotationPdf(generatedData, company);
    doc.save(`${existingQuotation.quotation_no.replaceAll("/", "-")}.pdf`);
  };
  const previewVersion = async (snapshot: typeof generatedData) => {
    if (!snapshot) return;
    const doc = await buildQuotationPdf(snapshot, company);
    window.open(doc.output("bloburl") as unknown as string, "_blank");
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const status = existingQuotation?.status;
  const isFinalizedLocked = Boolean(
    existingQuotation?.order_id && ["Order Confirmed", "Closed"].includes(status ?? ""),
  );

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/quotations")}>
          <ArrowLeft className="size-4" /> All quotations
        </Button>
      </div>

      <PageHeader
        title={isEdit ? (existingQuotation?.quotation_no ?? "Quotation") : "New quotation"}
        description={
          isEdit && existingQuotation
            ? existingQuotation.customer_name
            : "Build a commercial proposal for the customer."
        }
        actions={
          <>
            {isEdit && existingQuotation && (
              <>
                <Button variant="outline" onClick={previewPdf}>
                  <Eye className="size-4" /> Preview PDF
                </Button>
                <Button variant="outline" onClick={downloadPdf}>
                  <Download className="size-4" /> Download
                </Button>
              </>
            )}
            {isEdit && hasDocumentChanges && !isFinalizedLocked && (
              <Button onClick={generateVersion} disabled={generateQuotationVersion.isPending}>
                {generateQuotationVersion.isPending ? "Creating…" : "Create New Quotation"}
              </Button>
            )}
            {!isFinalizedLocked && (
              <Button
                variant={isEdit ? "outline" : "default"}
                onClick={save}
                disabled={
                  createQuotation.isPending || updateQuotation.isPending || convertLead.isPending
                }
              >
                {isEdit ? "Save changes" : "Create quotation"}
              </Button>
            )}
          </>
        }
      />

      {isEdit && existingQuotation && (
        <SectionCard>
          <div className={`mb-4 flex items-start gap-3 rounded-lg border p-3 ${hasDocumentChanges ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"}`}>
            {hasDocumentChanges ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />}
            <div className="flex-1">
              <p className="font-semibold">{hasDocumentChanges ? "Changes detected" : "Quotation Created ✓"}</p>
              <p className="text-sm text-muted-foreground">
                {hasDocumentChanges
                  ? "The quotation details differ from the generated document. The existing PDF remains unchanged until you create a new quotation."
                  : `Version ${existingQuotation.current_version?.version_number ?? 1} is up to date.`}
              </p>
            </div>
            {hasDocumentChanges && !isFinalizedLocked && <Button size="sm" onClick={generateVersion} disabled={generateQuotationVersion.isPending}>Create New Quotation</Button>}
          </div>
          <WorkflowTracker
            stages={["Quotation", "Sent", "Accepted", "Advance Received", "Order Confirmed"]}
            currentIndex={existingQuotation.order_id ? 4 : status === "Advance Received" ? 3 : status === "Accepted" ? 2 : status === "Sent" ? 1 : 0}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <StatusChip status={existingQuotation.status} />
              <span className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                <span className={paymentSummaryStyles.inlineTotal}>Total {inr(Number(existingQuotation.total_amount))}</span><span>·</span>
                <strong className={paymentSummaryStyles.inlineAdvance}>Advance {inr(advanceAmount)}</strong><span>·</span>
                <span className={paymentSummaryStyles.inlineBalance}>Balance {inr(balance)}</span>
              </span>
            </div>
            <div className="flex min-h-8 flex-wrap items-center justify-end gap-2">
              {status === "Draft" && (
                <Button size="sm" onClick={() => runWorkflow("send")} disabled={hasDocumentChanges} title={hasDocumentChanges ? "Create a new quotation before sending" : undefined}>
                  Send
                </Button>
              )}
              {status === "Sent" && (
                <Button size="sm" onClick={() => runWorkflow("accept")}>
                  Accept
                </Button>
              )}
              {status === "Accepted" && !hasRecordedAdvance && (
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  Record Advance
                </Button>
              )}
              {hasRecordedAdvance && !existingQuotation.order_id && (
                <Button size="sm" variant="outline" disabled>
                  Advance Recorded
                </Button>
              )}
              {status === "Advance Received" && hasRecordedAdvance && (
                <Button size="sm" onClick={runConfirmOrder} disabled={confirmOrder.isPending}>
                  {confirmOrder.isPending ? "Confirming…" : "Confirm Order"}
                </Button>
              )}
              {existingQuotation.order_id && (
                <StatusChip status="Order created" tone="success" dot={false} />
              )}
              {["Draft", "Sent", "Accepted"].includes(status ?? "") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {isFinalizedLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-4 text-sm">
          <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">Quotation locked</p>
            <p className="text-muted-foreground">
              This quotation has a confirmed order and is preserved as a finalized business record. Create a new quotation for any changes.
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={isFinalizedLocked} className={isFinalizedLocked ? "space-y-4 opacity-75" : "space-y-4"}>
      <SectionCard title="Customer Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
        </div>
        {!isEdit && <CustomerMatchPicker term={form.phone.length >= 3 ? form.phone : form.customer_name} selected={matched} onSelect={applyMatch} onChange={() => { setMatched(null); setForm((f) => ({ ...f, customer: null })); }}/>} 
      </SectionCard>

      <SectionCard title="Address">
        <div className="grid gap-4">
          {matched?.addresses?.length ? (
            <Field label="Saved billing address">
              <Select onValueChange={(id) => {
                const selected = matched.addresses.find((address) => String(address.id) === id);
                const text = selected ? [selected.address, selected.city, selected.pincode].filter(Boolean).join(", ") : "";
                setForm((f) => ({ ...f, billing_address: text, ...(f.shipping_same_as_billing ? { address: text } : {}) }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select saved address" /></SelectTrigger>
                <SelectContent>{matched.addresses.map((address) => <SelectItem key={address.id} value={String(address.id)}>{address.title || "Address"}{address.is_primary ? " · Primary" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Billing address">
            <Textarea
              rows={2}
              value={form.billing_address}
              onChange={(e) => setForm((f) => ({ ...f, billing_address: e.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.shipping_same_as_billing}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, shipping_same_as_billing: v === true }))
              }
            />
            Shipping address same as billing
          </label>
          {!form.shipping_same_as_billing && (
            <Field label="Shipping address">
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Delivery Details">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Occasion">
            <Input
              value={form.occasion}
              onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
            />
          </Field>
          <Field label="Event date">
            <Input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
            />
          </Field>
          <Field label="Valid until">
            <Input
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
            />
          </Field>
          <Field label="Delivery type">
            <Select
              value={form.delivery_type}
              onValueChange={(v) => setForm((f) => ({ ...f, delivery_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pickup">Pickup</SelectItem>
                <SelectItem value="Delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Delivery date">
            <Input
              type="date"
              value={form.delivery_date}
              onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))}
            />
          </Field>
          <Field label="Delivery time">
            <Input
              type="text"
              list="quotation-delivery-time-slots"
              placeholder="Select or type a time"
              value={formatTimeOfDay(form.delivery_time)}
              onChange={(e) => setForm((f) => ({ ...f, delivery_time: normalizeTimeOfDayInput(e.target.value) }))}
            />
            <datalist id="quotation-delivery-time-slots">{(deliveryTimeSlots ?? []).map((slot) => <option key={slot} value={formatTimeOfDay(slot)} />)}</datalist>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Items"
        description={errors["items"]}
        actions={
          <Button variant="outline" size="sm" onClick={() => setGstDialogOpen(true)}>
            <Settings2 className="size-4" /> Manage GST rates
          </Button>
        }
      >
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-2">Cake / Product</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2">Flavour</th>
                <th className="py-2 pr-2 w-20">Qty</th>
                <th className="py-2 pr-2 w-28">Unit</th>
                <th className="py-2 pr-2 w-28">Rate</th>
                <th className="py-2 pr-2 w-24">GST%</th>
                <th className="py-2 pr-2 w-28 text-right">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => {
                const amount = calculateLineItem(item.quantity, item.rate).baseAmount;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-2">
                      <Input
                        value={item.item_name}
                        list="quotation-products"
                        onChange={(e) => setItem(i, { item_name: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={item.description ?? ""}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={item.flavour ?? ""}
                        onChange={(e) => setItem(i, { flavour: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={quantityMin(item.unit_type)}
                        step={quantityStep(item.unit_type)}
                        value={item.quantity}
                        onChange={(e) => setItem(i, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select value={item.unit_type} onValueChange={(unit_type) => setItem(i, { unit_type: unit_type as QuotationItem["unit_type"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{saleUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        value={item.rate}
                        onChange={(e) => setItem(i, { rate: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        list="quotation-gst-rates"
                        value={item.gst_percentage}
                        onChange={(e) => setItem(i, { gst_percentage: e.target.value })}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right tabular font-medium">{inr(amount)}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={form.items.length === 1}
                        onClick={() => removeItem(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="quotation-products">{(cakeProducts ?? []).map((product) => <option key={product} value={product} />)}</datalist>
          <datalist id="quotation-gst-rates">
            {[0, 5, 12, 18, 28, ...(gstRates ?? []).map(Number)]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((v) => (
                <option key={v} value={v} />
              ))}
          </datalist>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
          <Plus className="size-4" /> Add item
        </Button>
      </SectionCard>

      {existingQuotation?.lead_details?.reference_images?.length ? (
        <SectionCard
          title="Lead reference images"
          description={`Carried forward from ${existingQuotation.lead_no ?? "the originating lead"}.`}
        >
          <div className="flex flex-wrap gap-3">
            {existingQuotation.lead_details.reference_images.map((image) => (
              <a
                key={image.id}
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-lg border border-border bg-surface-muted"
              >
                <img
                  src={image.url}
                  alt={image.original_name || "Lead cake reference"}
                  className="h-24 w-24 object-cover transition-transform group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {existingQuotation?.payments?.length ? (
        <SectionCard title="Payment history" description="Payments and uploaded proof recorded against this quotation.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {existingQuotation.payments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                {payment.proof && !/\.pdf(?:\?|$)/i.test(payment.proof) ? (
                  <a href={payment.proof} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={payment.proof} alt="Payment proof" className="size-14 rounded-lg object-cover" />
                  </a>
                ) : null}
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{inr(Number(payment.amount))} · {payment.payment_method}</p>
                  <p className="text-xs text-muted-foreground">{payment.payment_date?.slice(0, 10)}</p>
                  {payment.proof ? <a href={payment.proof} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View proof</a> : <span className="text-xs text-muted-foreground">No proof uploaded</span>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Terms & Notes">
          <div className="grid gap-3">
            <Field label="Special instructions">
              <Textarea
                rows={2}
                value={form.special_instructions}
                onChange={(e) => setForm((f) => ({ ...f, special_instructions: e.target.value }))}
              />
            </Field>
            <Field label="Payment terms">
              <Textarea
                rows={2}
                value={form.payment_terms}
                onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
              />
            </Field>
            <Field label="Notes">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Totals">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular font-medium">{inr(totals.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <Input
                type="number"
                min={0}
                className="h-8 w-32 text-right"
                value={form.discount_amount}
                onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))}
              />
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">GST</dt>
              <dd className="tabular font-medium">{inr(totals.gst)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-2 text-sm text-primary">
              <dt className="font-semibold">Grand Total</dt>
              <dd className="tabular text-lg font-semibold">
                {inr(totals.total)}
              </dd>
            </div>
            {isEdit && (
              <>
                <div className={`flex justify-between ${paymentSummaryStyles.advance}`}>
                  <dt className="font-semibold">Advance received</dt>
                  <dd className="tabular font-semibold">{inr(advanceAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Balance due</dt>
                  <dd className="tabular font-semibold text-warning">{inr(balance)}</dd>
                </div>
              </>
            )}
          </dl>
        </SectionCard>
      </div>
      </fieldset>

      {isEdit && existingQuotation && (
        <SectionCard title="History">
          <div className="mb-5 space-y-2">
            {existingQuotation.quotation_versions.map((version, index) => {
              const expanded = expandedVersions.includes(version.id);
              const snapshot = version.snapshot;
              return (
                <div key={version.id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                    onClick={() =>
                      setExpandedVersions((current) =>
                        expanded ? current.filter((versionId) => versionId !== version.id) : [...current, version.id],
                      )
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronRight className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">Version {version.version_number}{index === 0 ? " - Current" : ""}</span>
                        <span className="block text-xs text-muted-foreground">{new Date(version.generated_on).toLocaleString("en-IN")} - {inr(Number(version.total_amount))}</span>
                      </span>
                    </span>
                    {index === 0 && <StatusChip status="Current" tone="success" dot={false} />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border p-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Customer</p>
                          <p className="font-medium">{snapshot.customer_name ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="tabular">{snapshot.phone ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Event date</p>
                          <p className="tabular">{snapshot.event_date ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold tabular">{inr(Number(snapshot.total_amount ?? version.total_amount))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Advance</p>
                          <p className="tabular">{inr(Number(snapshot.advance_amount ?? 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="tabular">{inr(Number(snapshot.balance_amount ?? 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Discount</p>
                          <p className="tabular">{inr(Number(snapshot.discount_amount ?? 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status then</p>
                          <p>{snapshot.status ?? "-"}</p>
                        </div>
                      </div>
                      {snapshot.items?.length ? (
                        <div className="mt-3 overflow-x-auto rounded-md border border-border">
                          <table className="w-full min-w-[640px] text-xs">
                            <thead className="bg-surface-muted text-muted-foreground">
                              <tr>
                                <th className="px-2 py-2 text-left">Item</th>
                                <th className="px-2 py-2 text-left">Qty</th>
                                <th className="px-2 py-2 text-left">Rate</th>
                                <th className="px-2 py-2 text-left">GST%</th>
                                <th className="px-2 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {snapshot.items.map((item, itemIndex) => (
                                <tr key={`${version.id}-${itemIndex}`} className="border-t border-border">
                                  <td className="px-2 py-2">{item.item_name}</td>
                                  <td className="px-2 py-2 tabular">{item.quantity} {item.unit_type}</td>
                                  <td className="px-2 py-2 tabular">{inr(Number(item.rate ?? 0))}</td>
                                  <td className="px-2 py-2 tabular">{Number(item.gst_percentage ?? 0)}</td>
                                  <td className="px-2 py-2 text-right tabular">{inr(Number(item.amount ?? item.subtotal ?? 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => previewVersion(snapshot)}>
                          <Eye className="size-4" /> View PDF
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <CrmHistoryTimeline events={existingQuotation.quotation_activities} />
        </SectionCard>
      )}

      {isEdit && existingQuotation && (
        <RecordQuotationPaymentDialog
          quotation={existingQuotation}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
        />
      )}
      <GstRateDialog
        open={gstDialogOpen}
        onOpenChange={setGstDialogOpen}
        onAdded={() => undefined}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this quotation?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep quotation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={() => runWorkflow("cancel")}
            >
              Cancel quotation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default QuotationFormPage;
