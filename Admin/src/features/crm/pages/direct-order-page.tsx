import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { type CrmCustomerSearchResult, useCrmOptions } from "@/features/crm/hooks";
import { useCreateDirectOrder, type DirectOrderItem } from "@/features/crm/orders-hooks";
import { CustomerMatchPicker } from "@/features/crm/components/customer-match-picker";
import { calculateLineItem, hasRate, quantityMin, quantityStep, useSaleUnits } from "@/features/crm/sale-units";
import { configuredOptions } from "@/features/crm/config-options";
import { OptionCombobox } from "@/features/crm/components/option-combobox";
import { useCreateCrmOptionFromText } from "@/features/crm/options-hooks";

const emptyItem: DirectOrderItem = { item_name: "", description: "", flavour: "", weight: "", quantity: "", unit_type: "kg", rate: "", manual_amount: "", gst_percentage: "" };

function DirectOrderPage() {
  const { units: saleUnits, factors: unitFactors } = useSaleUnits();
  const { data: cakeTypes } = useCrmOptions("cake_type");
  const { data: occasions } = useCrmOptions("occasion");
  const { data: cakeProducts } = useCrmOptions("cake_product");
  const { data: cakeFlavours } = useCrmOptions("cake_flavour");
  const { data: productRates } = useCrmOptions("product_rate");
  const { data: gstRates } = useCrmOptions("tax_setting");
  const { data: livePaymentMethods } = useCrmOptions("payment_method");
  const cakeTypeOptions = configuredOptions(cakeTypes);
  const occasionOptions = configuredOptions(occasions);
  const productOptions = configuredOptions([...(cakeTypes ?? []), ...(cakeProducts ?? [])]);
  const flavourOptions = configuredOptions(cakeFlavours);
  const rateOptions = configuredOptions(productRates);
  const gstOptions = configuredOptions(gstRates);
  const paymentMethods = configuredOptions(livePaymentMethods);
  const createOption = useCreateCrmOptionFromText();
  const navigate = useNavigate();
  const createOrder = useCreateDirectOrder();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [cakeType, setCakeType] = useState("");
  const [items, setItems] = useState<DirectOrderItem[]>([emptyItem]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyMatch = (customer: CrmCustomerSearchResult) => {
    setMatched(customer);
    setCustomerName(customer.name || customerName);
    setPhone(customer.phone.slice(-10) || phone);
    setEmail(customer.email || email);
    const primary = customer.addresses.find((address) => address.is_primary) ?? customer.addresses[0];
    setBillingAddress(primary ? [primary.address, primary.city, primary.pincode].filter(Boolean).join(", ") : billingAddress);
  };

  const subtotal = items.reduce((sum, it) => sum + calculateLineItem(it.quantity, it.rate, 0, it.unit_type, unitFactors, it.manual_amount).baseAmount, 0);
  const gst = items.reduce((sum, it) => sum + calculateLineItem(it.quantity, it.rate, it.gst_percentage, it.unit_type, unitFactors, it.manual_amount).gstAmount, 0);
  const total = Math.max(0, subtotal + gst - (Number(discountAmount) || 0));

  const setItem = (i: number, patch: Partial<DirectOrderItem>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((arr) => [...arr, { ...emptyItem }]);
  const removeItem = (i: number) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const submit = async () => {
    const clientErrors: Record<string, string> = {};
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) clientErrors["phone"] = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
    if (!customerName.trim()) clientErrors["customer_name"] = "Customer name is required.";
    if (!cakeType.trim()) clientErrors["cake_type"] = "Cake type is required.";
    if (!items.some((it) => it.item_name.trim() && (hasRate(it.rate) ? Number(it.rate) > 0 : Number(it.manual_amount) > 0))) clientErrors["items"] = "Add at least one item with a name and a rate or amount.";
    if (items.some((it) => it.item_name.trim() && it.quantity === "")) clientErrors["items"] = "Quantity is required for every item.";
    const advance = Number(advanceAmount);
    if (!advance || advance <= 0) clientErrors["advance_amount"] = "Collect the advance payment before confirming this order.";
    if (!paymentMethod) clientErrors["payment_method"] = "Select a payment method.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      const result = await createOrder.mutateAsync({
        customer: matched?.id,
        customer_name: customerName,
        phone,
        email: email || undefined,
        billing_address: billingAddress || undefined,
        cake_type: cakeType,
        occasion: occasion || undefined,
        event_date: eventDate || undefined,
        items: items.filter((it) => it.item_name.trim()).map((it) => ({ ...it, quantity: Number(it.quantity) || 1, rate: hasRate(it.rate) ? Number(it.rate) : null, manual_amount: hasRate(it.rate) ? null : Number(it.manual_amount) || 0, gst_percentage: Number(it.gst_percentage) || 0 })),
        discount_amount: discountAmount,
        advance_amount: advance,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: transactionReference || undefined,
        customer_remarks: customerRemarks || undefined,
      });
      toast.success(result.message, { description: result.data.order_no });
      navigate(`/crm/orders/${result.data.id}`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors: Record<string, string> = {};
      if (response) for (const [key, value] of Object.entries(response)) fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
      setErrors(fieldErrors);
      toast.error(fieldErrors["detail"] ?? fieldErrors["message"] ?? fieldErrors["advance_amount"] ?? "Unable to create order.");
    }
  };

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/orders")}><ArrowLeft className="size-4" /> All orders</Button>
      </div>

      <PageHeader
        title="New direct order"
        description="Create an order without a prior quotation. An advance payment is required to confirm it."
        actions={<Button onClick={submit} disabled={createOrder.isPending}>{createOrder.isPending ? "Creating…" : "Confirm order"}</Button>}
      />

      <SectionCard title="Customer">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer name" required error={errors["customer_name"]}>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
          <Field label="Phone" required error={errors["phone"]}>
            <Input value={phone} maxLength={10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Billing address" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></Field>
        </div>
        <CustomerMatchPicker term={phone.length >= 3 ? phone : customerName} selected={matched} onSelect={applyMatch} onChange={() => setMatched(null)}/>
      </SectionCard>

      <SectionCard title="Order details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cake type" required error={errors["cake_type"]}>
            <OptionCombobox value={cakeType} options={cakeTypeOptions} onChange={setCakeType} onCreateOption={createOption("cake_type", cakeTypeOptions)} placeholder="Select or type cake type" portal />
            {!cakeTypeOptions.length && <p className="text-xs text-warning">Add an active cake type in CRM Settings.</p>}
          </Field>
          <Field label="Occasion">
            <OptionCombobox value={occasion} options={occasionOptions} onChange={setOccasion} onCreateOption={createOption("occasion", occasionOptions)} placeholder="Select or type occasion" portal />
          </Field>
          <Field label="Event date"><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Items" description={errors["items"]}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-sm">
            <thead className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr><th className="w-56 py-2 pr-2">Item</th><th className="w-52 py-2 pr-2">Flavour</th><th className="py-2 pr-2 w-20">Qty</th><th className="py-2 pr-2 w-28">Unit</th><th className="py-2 pr-2 w-40">Rate</th><th className="py-2 pr-2 w-36">GST%</th><th className="py-2 pr-2 w-28 text-right">Amount</th><th className="w-10" /></tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const amount = calculateLineItem(item.quantity, item.rate, 0, item.unit_type, unitFactors, item.manual_amount).baseAmount;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-2"><OptionCombobox value={item.item_name} options={productOptions} onChange={(value) => setItem(i, { item_name: value })} onCreateOption={createOption("cake_product", productOptions)} placeholder="Select or type product" portal /></td>
                    <td className="py-2 pr-2"><OptionCombobox value={item.flavour ?? ""} options={flavourOptions} onChange={(value) => setItem(i, { flavour: value })} onCreateOption={createOption("cake_flavour", flavourOptions)} placeholder="Select or type flavour" portal /></td>
                    <td className="py-2 pr-2"><Input type="number" min={quantityMin(item.unit_type)} step={quantityStep(item.unit_type)} value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} /></td>
                    <td className="py-2 pr-2"><OptionCombobox value={item.unit_type} options={saleUnits} onChange={(unit_type) => setItem(i, { unit_type: unit_type as DirectOrderItem["unit_type"] })} onCreateOption={createOption("sale_unit", saleUnits)} placeholder="Select or type unit" portal /></td>
                    <td className="py-2 pr-2"><OptionCombobox type="number" min={0} value={String(item.rate ?? "")} options={rateOptions} onChange={(value) => setItem(i, { rate: value, manual_amount: "" })} onCreateOption={createOption("product_rate", rateOptions)} placeholder="Select or type rate" portal disabled={!hasRate(item.rate) && hasRate(item.manual_amount)} /></td>
                    <td className="py-2 pr-2"><OptionCombobox type="number" min={0} max={100} value={String(item.gst_percentage ?? "")} options={gstOptions} onChange={(value) => setItem(i, { gst_percentage: value })} onCreateOption={createOption("tax_setting", gstOptions)} placeholder="Select or type GST" portal /></td>
                    <td className="py-2 pr-2 text-right tabular font-medium">{hasRate(item.rate) ? inr(amount) : <Input type="number" min={0} step={0.01} className="text-right" placeholder="Amount" value={item.manual_amount ?? ""} onChange={(e) => setItem(i, { manual_amount: e.target.value })} />}</td>
                    <td className="py-2 text-right"><Button variant="ghost" size="icon" className="size-8" disabled={items.length === 1} onClick={() => removeItem(i)}><Trash2 className="size-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="size-4" /> Add item</Button>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Totals">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular font-medium">{inr(subtotal)}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-muted-foreground">Discount</dt><Input type="number" min={0} className="h-8 w-32 text-right" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} /></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">GST</dt><dd className="tabular font-medium">{inr(gst)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-border pt-2 text-primary"><dt className="font-semibold">Grand Total</dt><dd className="tabular text-lg font-semibold">{inr(total)}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Advance payment" description="Required to confirm this order">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Advance amount" required error={errors["advance_amount"]}>
              <Input type="number" min={0} max={total} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
            </Field>
            <Field label="Payment date" required><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></Field>
            <Field label="Payment method" required error={errors["payment_method"]}>
              <OptionCombobox value={paymentMethod} options={paymentMethods} onChange={setPaymentMethod} onCreateOption={createOption("payment_method", paymentMethods)} placeholder="Select or type payment method" portal />
              {!paymentMethods.length && <p className="text-xs text-warning">Add an active payment method in CRM Settings.</p>}
            </Field>
            <Field label="Transaction reference"><Input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} /></Field>
            <Field label="Customer remarks" className="sm:col-span-2"><Textarea rows={2} value={customerRemarks} onChange={(e) => setCustomerRemarks(e.target.value)} /></Field>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export default DirectOrderPage;
