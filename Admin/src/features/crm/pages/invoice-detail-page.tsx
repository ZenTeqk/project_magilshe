import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import {
  useInvoice, useRecordInvoicePayment, usePaymentCompleted, useMoveToDelivery,
  useCancelInvoice,
} from "@/features/crm/invoices-hooks";
import { useCompanyConfig } from "@/features/crm/quotations-hooks";
import { RecordInvoicePaymentDialog } from "@/features/crm/components/record-invoice-payment-dialog";
import { CrmHistoryTimeline } from "@/features/crm/components/crm-history-timeline";
import { buildInvoicePdf } from "@/features/crm/lib/pdf-template";
import { addressOrFallback } from "@/features/crm/lib/address-fallback";
import { formatSaleQuantity } from "@/features/crm/sale-units";

function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: company } = useCompanyConfig();

  const paymentCompleted = usePaymentCompleted();
  const moveToDelivery = useMoveToDelivery();
  const recordPayment = useRecordInvoicePayment();
  const cancelInvoice = useCancelInvoice();

  const [paymentOpen, setPaymentOpen] = useState(false);

  const balance = Number(invoice?.balance_amount ?? 0);
  const paid = invoice?.status === "Paid";

  /** Mirrors Admin/src/components/crm/invoice/InvoiceDetails.jsx availableActions exactly. */
  const nextAction = useMemo(() => {
    if (!invoice) return null;
    if (["Closed", "Cancelled"].includes(invoice.status)) return null;
    if (balance > 0) return "record_payment" as const;
    if (!paid) return "payment_completed" as const;
    return "move_to_delivery" as const;
  }, [invoice, balance, paid]);

  if (isLoading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  if (!invoice) return <EmptyState title="Couldn't load this invoice" />;

  const completePayment = async () => {
    try {
      await paymentCompleted.mutateAsync(invoice.id);
      toast.success("Payment completed");
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(response?.message || "Payment cannot be completed");
    }
  };

  const moveDelivery = async () => {
    try {
      const result = await moveToDelivery.mutateAsync(invoice.id);
      toast.success(result.message, { description: `Delivery ${result.data.delivery_no}` });
      navigate(`/crm/delivery/${result.data.id}`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(response?.message || "Cannot move to Delivery");
    }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this invoice? The record will remain available for audit history.")) return;
    try { await cancelInvoice.mutateAsync(invoice.id); toast.success("Invoice cancelled"); }
    catch (err: unknown) { const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; toast.error(message || "Invoice cannot be cancelled"); }
  };

  const previewPdf = async () => window.open((await buildInvoicePdf(invoice, company)).output("bloburl") as unknown as string, "_blank");
  const downloadPdf = async () => (await buildInvoicePdf(invoice, company)).save(`${invoice.invoice_no.replaceAll("/", "-")}.pdf`);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/invoices")}>
          <ArrowLeft className="size-4" /> All invoices
        </Button>
      </div>

      <PageHeader
        title={invoice.invoice_no}
        description={`${invoice.customer_name} · Order ${invoice.order_no}`}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusChip status={invoice.status} />
            <span className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
              <span className={paymentSummaryStyles.inlineTotal}>Total {inr(Number(invoice.total_amount))}</span><span>·</span>
              <strong className={paymentSummaryStyles.inlineAdvance}>Paid {inr(Number(invoice.amount_paid))}</strong><span>·</span>
              <span className={paymentSummaryStyles.inlineBalance}>Balance {inr(balance)}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={previewPdf}>Preview</Button>
            <Button size="sm" variant="outline" onClick={downloadPdf}>Download PDF</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button>
            {["Generated", "Issued"].includes(invoice.status) && <Button size="sm" variant="ghost" className="text-danger" onClick={cancel} disabled={cancelInvoice.isPending}>Cancel</Button>}
            {nextAction === "record_payment" && (
              <Button size="sm" onClick={() => setPaymentOpen(true)} disabled={recordPayment.isPending}>Collect Balance</Button>
            )}
            {nextAction === "payment_completed" && (
              <Button size="sm" onClick={completePayment} disabled={paymentCompleted.isPending}>
                {paymentCompleted.isPending ? "Completing…" : "Payment Completed"}
              </Button>
            )}
            {nextAction === "move_to_delivery" && (
              <>
                <Button size="sm" disabled>Payment Completed</Button>
                <Button size="sm" onClick={moveDelivery} disabled={moveToDelivery.isPending}>
                  {moveToDelivery.isPending ? "Moving…" : "Move to Delivery"}
                </Button>
              </>
            )}
          </div>
        </div>
        {!nextAction && (
          <p className="mt-3 text-sm text-muted-foreground">Financial settlement is complete and responsibility has moved to Delivery.</p>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Customer" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{invoice.customer_name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="tabular">{invoice.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Address</dt><dd className="max-w-[60%] text-right">{addressOrFallback(invoice.address, invoice.delivery_address)}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Order summary" className="lg:col-span-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Order</dt><dd className="font-medium tabular">{invoice.order_no}</dd></div>
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Invoice generated</dt><dd className="tabular">{invoice.generated_on?.slice(0, 10) ?? "—"}</dd></div>
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Delivery date</dt><dd className="tabular">{invoice.delivery_date ?? "—"}</dd></div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Final commercial details" padded={false}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">GST%</th><th className="px-5 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{item.item_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{item.description ?? "—"}</td>
                  <td className="px-5 py-3 tabular">{formatSaleQuantity(item.quantity, item.unit_type)}</td>
                  <td className="px-5 py-3 tabular">{item.rate === null || item.rate === undefined || item.rate === "" ? "-" : inr(Number(item.rate))}</td>
                  <td className="px-5 py-3 tabular">{item.gst_percentage}%</td>
                  <td className="px-5 py-3 text-right tabular font-medium">{inr(Number(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Payment summary" description="Authoritative settlement position for this customer invoice.">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular font-medium">{inr(Number(invoice.subtotal))}</dd></div>
          <div><dt className="text-muted-foreground">GST</dt><dd className="tabular font-medium">{inr(Number(invoice.gst_amount))}</dd></div>
          <div className="text-primary"><dt className="font-semibold">Invoice total</dt><dd className="tabular text-lg font-semibold">{inr(Number(invoice.total_amount))}</dd></div>
          <div className={paymentSummaryStyles.advance}><dt className="font-semibold">Amount paid</dt><dd className="tabular font-semibold">{inr(Number(invoice.amount_paid))}</dd></div>
          <div className={paymentSummaryStyles.balance}><dt>Balance due</dt><dd className="tabular">{inr(balance)}</dd></div>
        </dl>
      </SectionCard>

      <SectionCard title="Payment history" description="Customer payments recorded against this invoice." padded={false}>
        {invoice.payments?.length ? (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <tr><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Collected by</th><th className="px-5 py-3 text-right">Proof</th></tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium tabular">{inr(Number(p.amount))}</td>
                    <td className="px-5 py-3">{p.payment_method}</td>
                    <td className="px-5 py-3 tabular">{p.payment_date?.slice(0, 10)}</td>
                    <td className="px-5 py-3">{p.collected_by_name ?? "—"}</td>
                    <td className="px-5 py-3 text-right">
                      {p.proof ? <a href={p.proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary underline"><img src={p.proof} alt="Payment proof" className="size-10 rounded-md border object-cover" />View proof</a> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No invoice payments recorded" description="Balance payments will appear here after collection." />
        )}
      </SectionCard>

      <SectionCard title="Financial activity">
        <CrmHistoryTimeline events={invoice.timeline} emptyTitle="Payment and Delivery handoff events will appear here" />
      </SectionCard>

      <RecordInvoicePaymentDialog invoice={invoice} open={paymentOpen} onOpenChange={setPaymentOpen} />
    </>
  );
}

export default InvoiceDetailPage;
