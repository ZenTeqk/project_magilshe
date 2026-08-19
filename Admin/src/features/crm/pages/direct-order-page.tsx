import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { searchCrmCustomers, type CrmCustomerSearchResult } from "@/features/crm/hooks";
import { useCreateDirectOrder, type DirectOrderItem } from "@/features/crm/orders-hooks";

const emptyItem: DirectOrderItem = { item_name: "", description: "", flavour: "", weight: "", quantity: 1, rate: 0, gst_percentage: 0 };
const paymentMethods = ["Cash", "Google Pay", "PhonePe", "Paytm", "Card", "Bank Transfer", "Other UPI", "Other"];

function DirectOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateDirectOrder();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [cakeType, setCakeType] = useState("Custom Cake");
  const [items, setItems] = useState<DirectOrderItem[]>([emptyItem]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");
  const [matched, setMatched] = useState<CrmCustomerSearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onIdentityChange = (name: string, phoneValue: string) => {
    clearTimeout(debounceRef.current);
    const digits = phoneValue.replace(/\D/g, "");
    const term = digits.length === 10 ? digits : name.length >= 3 ? name : "";
    if (!term) { setMatched(null); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCrmCustomers(term);
      setMatched(results.length === 1 ? (results[0] ?? null) : (results.find((r) => r.phone.replace(/\D/g, "") === digits) ?? null));
    }, 300);
  };

  const applyMatch = () => {
    if (!matched) return;
    setCustomerName(matched.name || customerName);
    setEmail(matched.email || email);
    setBillingAddress(matched.addresses?.[0]?.address || billingAddress);
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const gst = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0) * (Number(it.gst_percentage) || 0) / 100, 0);
  const total = Math.max(0, subtotal + gst - (Number(discountAmount) || 0));

  const setItem = (i: number, patch: Partial<DirectOrderItem>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((arr) => [...arr, { ...emptyItem }]);
  const removeItem = (i: number) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const submit = async () => {
    const clientErrors: Record<string, string> = {};
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) clientErrors["phone"] = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
    if (!customerName.trim()) clientErrors["customer_name"] = "Customer name is required.";
    if (!items.some((it) => it.item_name.trim() && it.rate > 0)) clientErrors["items"] = "Add at least one item with a name and rate.";
    const advance = Number(advanceAmount);
    if (!advance || advance <= 0) clientErrors["advance_amount"] = "Collect the advance payment before confirming this order.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    try {
      const result = await createOrder.mutateAsync({
        customer_name: customerName,
        phone,
        email: email || undefined,
        billing_address: billingAddress || undefined,
        cake_type: cakeType,
        occasion: occasion || undefined,
        event_date: eventDate || undefined,
        items: items.filter((it) => it.item_name.trim()).map((it) => ({ ...it, quantity: Number(it.quantity) || 1, rate: Number(it.rate) || 0, gst_percentage: Number(it.gst_percentage) || 0 })),
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
            <Input value={customerName} onChange={(e) => { setCustomerName(e.target.value); onIdentityChange(e.target.value, phone); }} />
          </Field>
          <Field label="Phone" required error={errors["phone"]}>
            <Input value={phone} maxLength={10} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setPhone(v); onIdentityChange(customerName, v); }} />
          </Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Billing address" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></Field>
        </div>
        {matched && (
          <button type="button" onClick={applyMatch} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-left text-xs text-primary hover:bg-primary-soft/70">
            <UserRoundCheck className="size-3.5 shrink-0" /> Existing customer found — {matched.name} ({matched.phone}). Tap to use their details.
          </button>
        )}
      </SectionCard>

      <SectionCard title="Order details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cake type" required><Input value={cakeType} onChange={(e) => setCakeType(e.target.value)} /></Field>
          <Field label="Occasion"><Input value={occasion} onChange={(e) => setOccasion(e.target.value)} /></Field>
          <Field label="Event date"><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Items" description={errors["items"]}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr><th className="py-2 pr-2">Item</th><th className="py-2 pr-2">Flavour</th><th className="py-2 pr-2 w-20">Qty</th><th className="py-2 pr-2 w-28">Rate</th><th className="py-2 pr-2 w-24">GST%</th><th className="py-2 pr-2 w-28 text-right">Amount</th><th className="w-10" /></tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0) * (1 + (Number(item.gst_percentage) || 0) / 100);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-2"><Input value={item.item_name} onChange={(e) => setItem(i, { item_name: e.target.value })} /></td>
                    <td className="py-2 pr-2"><Input value={item.flavour ?? ""} onChange={(e) => setItem(i, { flavour: e.target.value })} /></td>
                    <td className="py-2 pr-2"><Input type="number" min={1} value={item.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) || 1 })} /></td>
                    <td className="py-2 pr-2"><Input type="number" min={0} value={item.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value) || 0 })} /></td>
                    <td className="py-2 pr-2"><Input type="number" min={0} max={100} value={item.gst_percentage} onChange={(e) => setItem(i, { gst_percentage: Number(e.target.value) || 0 })} /></td>
                    <td className="py-2 pr-2 text-right tabular font-medium">{inr(amount)}</td>
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
            <div className="flex justify-between border-t border-border pt-2 text-base"><dt className="font-semibold">Grand Total</dt><dd className="tabular font-semibold">{inr(total)}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Advance payment" description="Required to confirm this order">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Advance amount" required error={errors["advance_amount"]}>
              <Input type="number" min={0} max={total} value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
            </Field>
            <Field label="Payment date" required><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></Field>
            <Field label="Payment method" required>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
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
