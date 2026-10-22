import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { inr } from "@/lib/data";
import { useRecordQuotationPayment, type Quotation } from "@/features/crm/quotations-hooks";
import { useCrmOptions } from "@/features/crm/hooks";
import { configuredOptions } from "@/features/crm/config-options";
import { OptionCombobox } from "@/features/crm/components/option-combobox";
import { useCreateCrmOptionFromText } from "@/features/crm/options-hooks";
import { NO_ADVANCE_METHOD, isNoAdvance } from "@/features/crm/no-advance";

export function RecordQuotationPaymentDialog({
  quotation,
  open,
  onOpenChange,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const balance = Number(quotation.balance_amount) || Number(quotation.total_amount) || 0;
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [customerRemarks, setCustomerRemarks] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: livePaymentMethods } = useCrmOptions("payment_method");
  const paymentMethods = configuredOptions(livePaymentMethods);
  const paymentMethodOptions = configuredOptions([NO_ADVANCE_METHOD, ...paymentMethods]);
  const noAdvance = isNoAdvance(paymentMethod);
  const createOption = useCreateCrmOptionFromText();

  const recordPayment = useRecordQuotationPayment();

  const submit = async () => {
    setError(null);
    const value = noAdvance ? 0 : Number(amount);
    if (!noAdvance && (!value || value <= 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (value > balance) {
      setError("Payment cannot exceed the remaining balance.");
      return;
    }
    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }
    try {
      await recordPayment.mutateAsync({
        id: quotation.id,
        amount: value,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: noAdvance ? "" : transactionReference,
        customer_remarks: customerRemarks,
        ...(proof && !noAdvance ? { proof } : {}),
      });
      toast.success(noAdvance ? "No advance recorded. You can now confirm the order." : "Advance payment recorded");
      onOpenChange(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(response ? Object.values(response).flat().join(" ") : "Unable to record payment.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record advance payment</DialogTitle>
          <DialogDescription>Balance due: {inr(balance)}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" required>
            <Input
              type="number"
              min={0}
              max={balance}
              step={0.01}
              value={amount}
              disabled={noAdvance}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Payment date" required>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </Field>
          <Field label="Payment method" required>
            <OptionCombobox value={paymentMethod} options={paymentMethodOptions} onChange={(value) => { setPaymentMethod(value); if (isNoAdvance(value)) setAmount("0"); }} onCreateOption={createOption("payment_method", paymentMethodOptions)} placeholder="Select or type payment method" portal />
            {!paymentMethods.length && <p className="text-xs text-warning">Add an active payment method in CRM Settings.</p>}
          </Field>
          <Field label="Transaction reference">
            <Input
              value={transactionReference}
              disabled={noAdvance}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </Field>
          <Field label="Proof of payment" className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border-strong p-3">
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
              {proof && <Button type="button" size="sm" variant="ghost" onClick={() => setProof(null)}>Remove</Button>}
              <p className="w-full text-xs text-muted-foreground">Supported: JPG, JPEG, PNG, WEBP up to 10 MB.{proof ? ` Selected: ${proof.name}` : ""}</p>
              {proof?.type.startsWith("image/") && <img src={URL.createObjectURL(proof)} alt="Payment proof preview" className="mt-2 h-28 w-40 rounded-lg border object-cover" />}
            </div>
          </Field>
          <Field label="Customer remarks" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={customerRemarks}
              onChange={(e) => setCustomerRemarks(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? "Recording…" : noAdvance ? "Continue without advance" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
