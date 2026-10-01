import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/lib/data";
import { formatTimeOfDay } from "@/lib/format-time";
import {
  useOrder, useOrderWorkflowAction, useUpdateOrderNotes, useGenerateInvoice, displayOrderStatus,
} from "@/features/crm/orders-hooks";
import { CancelOrderDialog } from "@/features/crm/components/cancel-order-dialog";
import { WorkflowTracker } from "@/features/crm/components/workflow-tracker";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { CrmHistoryTimeline } from "@/features/crm/components/crm-history-timeline";
import { formatSaleQuantity } from "@/features/crm/sale-units";
import { addressOrFallback } from "@/features/crm/lib/address-fallback";
import { useQuotation } from "@/features/crm/quotations-hooks";
import { PaymentReceiptButton } from "@/features/crm/components/payment-receipt-button";
import { SendWhatsAppButton } from "@/features/whatsapp/components/send-whatsapp-button";

const nonCancellable = new Set(["Delivery", "Out for Delivery", "Delivered", "Completed", "Closed", "Cancelled"]);

function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id);
  // Payments are recorded against the order's quotation; load them for receipts.
  const { data: quotation } = useQuotation(order?.quotation);

  const workflowAction = useOrderWorkflowAction();
  const updateNotes = useUpdateOrderNotes();
  const generateInvoice = useGenerateInvoice();

  const [notes, setNotes] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => { if (order) setNotes(order.production_notes ?? ""); }, [order]);

  if (isLoading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  if (!order) return <EmptyState title="Couldn't load this order" />;

  const status = order.status;
  const orderStages = ["Confirmed", "Processing", "Ready", "Invoice Pending", "Delivery", "Closed"];
  const currentStage = status === "Cancelled" ? 0 : Math.max(0, orderStages.indexOf(displayOrderStatus(status)));
  const balance = Number(order.balance_amount);

  const saveNotes = () => {
    if (notes !== (order.production_notes ?? "")) updateNotes.mutate({ id: order.id, production_notes: notes });
  };

  const startProcessing = async () => {
    try { await workflowAction.mutateAsync({ id: order.id, action: "start_processing" }); toast.success("Order moved to processing"); }
    catch { toast.error("Unable to update order."); }
  };
  const markReady = async () => {
    try { await workflowAction.mutateAsync({ id: order.id, action: "mark_ready" }); toast.success("Order marked ready"); }
    catch { toast.error("Unable to update order."); }
  };
  const moveToInvoice = async () => {
    try {
      const result = await generateInvoice.mutateAsync(order.id);
      toast.success(result.message, { description: `Invoice ${result.data.invoice_no}` });
      navigate(`/crm/invoices/${result.data.id}`);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(response ? Object.values(response).flat().join(" ") : "Unable to generate invoice.");
    }
  };

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/crm/orders")}>
          <ArrowLeft className="size-4" /> All orders
        </Button>
      </div>

      <PageHeader
        title={order.order_no}
        description={`${order.customer_name} · from ${order.quotation_no}`}
      />

      <SectionCard>
        <WorkflowTracker stages={orderStages} currentIndex={currentStage} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <StatusChip status={displayOrderStatus(status)} />
            <span className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
              <span className={paymentSummaryStyles.inlineTotal}>Total {inr(Number(order.total_amount))}</span><span>·</span>
              <strong className={paymentSummaryStyles.inlineAdvance}>Advance {inr(Number(order.advance_paid))}</strong><span>·</span>
              <span className={paymentSummaryStyles.inlineBalance}>Balance {inr(balance)}</span>
            </span>
          </div>
          <div className="flex min-h-8 flex-wrap items-center justify-end gap-2">
            <SendWhatsAppButton event="order_confirmed" recordId={order.id} />
            {(status === "Confirmed" || status === "Production") && <Button size="sm" onClick={startProcessing} disabled={workflowAction.isPending}>Start Processing</Button>}
            {status === "Processing" && <Button size="sm" onClick={markReady} disabled={workflowAction.isPending}>Mark Ready</Button>}
            {(status === "Ready" || status === "Invoice Pending" || status === "Invoice Generated") && (
              <Button size="sm" onClick={moveToInvoice} disabled={generateInvoice.isPending}>
                {generateInvoice.isPending ? "Generating…" : "Move to Invoice"}
              </Button>
            )}
            <Button size="sm" variant="outline" asChild><Link to={`/crm/quotations/${order.quotation}/edit`}>View quotation</Link></Button>
            {!nonCancellable.has(status) && (
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
            )}
          </div>
        </div>
        {status === "Cancelled" && order.cancellation_reason && (
          <p className="mt-3 text-sm text-danger">Cancelled: {order.cancellation_reason}</p>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Customer" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{order.customer_name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="tabular">{order.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Event date</dt><dd className="tabular">{order.event_date ?? "—"}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Delivery" className="lg:col-span-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Recipient</dt><dd className="font-medium">{order.recipient_name ?? "—"}</dd></div>
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Recipient phone</dt><dd className="tabular">{order.recipient_phone ?? "—"}</dd></div>
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Method</dt><dd>{order.delivery_method ?? "—"}</dd></div>
            <div className="flex justify-between sm:block"><dt className="text-muted-foreground">Date/time</dt><dd className="tabular">{order.delivery_date ?? "—"} {formatTimeOfDay(order.delivery_time)}</dd></div>
            <div className="flex justify-between sm:block sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{addressOrFallback(order.delivery_address)}</dd></div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Payments & receipts"
        description="Every payment recorded for this order. Download a receipt to share with the customer."
      >
        {!quotation ? (
          <p className="text-sm text-muted-foreground">Loading payments…</p>
        ) : !quotation.payments?.length ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {quotation.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {inr(Number(payment.amount))} · {payment.payment_method}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.payment_date?.slice(0, 10)}
                    {payment.transaction_reference ? ` · Ref ${payment.transaction_reference}` : ""}
                    {payment.collected_by_name ? ` · by ${payment.collected_by_name}` : ""}
                  </p>
                </div>
                <PaymentReceiptButton quotation={quotation} payment={payment} order={order} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Items" padded={false}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Flavour</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">GST%</th><th className="px-5 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{item.item_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{item.flavour ?? "—"}</td>
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

      <SectionCard title="Production notes" description="Saved automatically when you leave the field">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
      </SectionCard>

      {order.special_instructions && (
        <SectionCard title="Special instructions"><p className="text-sm text-muted-foreground">{order.special_instructions}</p></SectionCard>
      )}

      <SectionCard title="History">
        <CrmHistoryTimeline events={order.timeline} />
      </SectionCard>

      <CancelOrderDialog orderId={order.id} open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  );
}

export default OrderDetailPage;
