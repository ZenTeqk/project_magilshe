import { useState } from "react";
import { toast } from "sonner";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrmOrder } from "@/features/crm/orders-hooks";
import {
  useCompanyConfig,
  type Quotation,
  type QuotationPayment,
} from "@/features/crm/quotations-hooks";
import { buildPaymentReceiptPdf, paymentReceiptFileName } from "@/features/crm/lib/receipt-pdf";

/** Downloads the customer-facing receipt PDF for one recorded payment. */
export function PaymentReceiptButton({
  quotation,
  payment,
  order,
  className,
}: {
  quotation: Quotation;
  payment: QuotationPayment;
  order?: CrmOrder | null | undefined;
  className?: string;
}) {
  const { data: company } = useCompanyConfig();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const doc = await buildPaymentReceiptPdf({ quotation, payment, order, company });
      doc.save(paymentReceiptFileName(quotation, payment));
    } catch {
      toast.error("Unable to generate the receipt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      onClick={download}
      disabled={busy}
    >
      <ReceiptText className="size-4" /> {busy ? "Preparing…" : "Receipt"}
    </Button>
  );
}
