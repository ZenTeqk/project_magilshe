import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { inr } from "@/lib/data";
import { useRecordInvoicePayment, type CrmInvoice } from "@/features/crm/invoices-hooks";

const paymentMethods = ["Cash", "Google Pay", "PhonePe", "Paytm", "Card", "Bank Transfer", "Other UPI", "Other"];

export function RecordInvoicePaymentDialog({
  invoice, open, onOpenChange,
}: { invoice: CrmInvoice; open: boolean; onOpenChange: (v: boolean) => void }) {
  const balance = Number(invoice.balance_amount) || 0;
  const [amount, setAmount] = useState(String(balance || ""));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordPayment = useRecordInvoicePayment();

  const submit = async () => {
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) { setError("Enter an amount greater than zero."); return; }
    if (!paymentMethod) { setError("Select a payment method."); return; }
    if (!paymentDate) { setError("Select a payment date."); return; }
    try {
      await recordPayment.mutateAsync({
        id: invoice.id, amount: value, payment_date: paymentDate, payment_method: paymentMethod,
        transaction_reference: transactionReference, customer_remarks: customerRemarks,
        ...(proof ? { proof } : {}),
      });
      toast.success("Balance payment recorded");
      onOpenChange(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(response ? Object.values(response).flat().join(" · ") : "Payment could not be recorded");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect balance payment</DialogTitle>
          <DialogDescription>Balance due: {inr(balance)}</DialogDescription>
        </DialogHeader>
        {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount received" required>
            <Input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Payment date" required>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </Field>
          <Field label="Payment method" required>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
              <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Transaction reference">
            <Input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} />
          </Field>
          <Field label="Payment proof" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border-strong p-3">
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
              {proof && <Button type="button" size="sm" variant="ghost" onClick={() => setProof(null)}>Remove</Button>}
              <p className="w-full text-xs text-muted-foreground">Supported: JPG, JPEG, PNG, WEBP up to 10 MB.{proof ? ` Selected: ${proof.name}` : ""}</p>
              {proof?.type.startsWith("image/") && <img src={URL.createObjectURL(proof)} alt="Payment proof preview" className="mt-2 h-28 w-40 rounded-lg border object-cover" />}
            </div>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={customerRemarks} onChange={(e) => setCustomerRemarks(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? "Recording…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
