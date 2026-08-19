import { useMemo } from "react";
import { useFollowUps, useLeads } from "@/features/crm/hooks";
import { useQuotations } from "@/features/crm/quotations-hooks";
import { displayOrderStatus, useOrders } from "@/features/crm/orders-hooks";
import { useInvoices } from "@/features/crm/invoices-hooks";
import { useDeliveries } from "@/features/crm/deliveries-hooks";
import { useUpcomingCustomerEvents } from "@/features/customers/hooks";

export type AttentionBucket = "overdue" | "today" | "action" | "upcoming";
export type AttentionModule = "leads" | "followUps" | "quotations" | "orders" | "invoices" | "delivery" | "customers";
export type AttentionPriority = "critical" | "high" | "medium" | "normal";
export type AttentionItem = { id: string; module: AttentionModule; bucket: AttentionBucket; priority: AttentionPriority; type: string; customer: string; reference?: string | undefined; date?: string | undefined; reason: string; action: string; to: string };

const isoDay = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};
const dayOffset = (iso: string, amount: number) => { const date = new Date(`${iso}T00:00:00`); date.setDate(date.getDate() + amount); return isoDay(date.toISOString()); };
const displayDate = (value?: string | null, withTime = false) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", withTime ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" });
};

export function useAttentionCenter() {
  const followUps = useFollowUps(); const leads = useLeads(); const quotations = useQuotations();
  const orders = useOrders(); const invoices = useInvoices(); const deliveries = useDeliveries();
  const events = useUpcomingCustomerEvents(30);
  const items = useMemo<AttentionItem[]>(() => {
    const today = isoDay(new Date().toISOString()); const tomorrow = dayOffset(today, 1); const result: AttentionItem[] = [];
    for (const row of followUps.data?.results ?? []) {
      const due = isoDay(row.follow_up_date); const bucket: AttentionBucket = due < today ? "overdue" : due === today ? "today" : "upcoming";
      result.push({ id: `follow-up-${row.id}`, module: "followUps", bucket, priority: bucket === "overdue" ? "critical" : bucket === "today" ? "high" : "normal", type: bucket === "overdue" ? "Follow-up overdue" : due === tomorrow ? "Follow-up tomorrow" : bucket === "today" ? "Follow-up today" : "Upcoming follow-up", customer: row.customer_name ?? row.name ?? "Customer", reference: row.lead_no, date: displayDate(row.follow_up_date), reason: row.follow_up_notes || row.status || "Scheduled customer follow-up", action: "Open Lead", to: `/crm/leads/${row.id}/edit` });
    }
    for (const lead of leads.data ?? []) {
      if (lead.status !== "Open" || !lead.follow_up_date || (followUps.data?.results ?? []).some((row) => String(row.id) === String(lead.id))) continue;
      const due = isoDay(lead.follow_up_date); if (due > tomorrow) continue; const bucket: AttentionBucket = due < today ? "overdue" : due === today ? "today" : "upcoming";
      result.push({ id: `lead-${lead.id}`, module: "leads", bucket, priority: bucket === "overdue" ? "critical" : "high", type: "Open lead follow-up", customer: lead.customer_name, reference: lead.lead_no, date: displayDate(lead.follow_up_date), reason: lead.follow_up_notes || "Open lead has a scheduled follow-up", action: "Open Lead", to: `/crm/leads/${lead.id}/edit` });
    }
    for (const quote of quotations.data ?? []) {
      if (!["Draft", "Sent", "Accepted", "Advance Received"].includes(quote.status)) continue;
      const messages: Record<string, string> = { Draft: "Draft requires completion", Sent: "Awaiting customer response", Accepted: "Accepted — advance required", "Advance Received": "Ready for order confirmation" };
      result.push({ id: `quotation-${quote.id}`, module: "quotations", bucket: "action", priority: quote.status === "Accepted" ? "high" : "medium", type: `Quotation ${quote.status}`, customer: quote.customer_name, reference: quote.quotation_no, date: displayDate(quote.event_date), reason: messages[quote.status] ?? quote.status, action: "View Quotation", to: `/crm/quotations/${quote.id}/edit` });
    }
    for (const order of orders.data ?? []) {
      const status = displayOrderStatus(order.status); if (!["Confirmed", "Processing", "Ready", "Invoice Pending"].includes(status)) continue;
      const messages: Record<string, string> = { Confirmed: "Awaiting processing", Processing: "Production in progress", Ready: "Ready for invoicing", "Invoice Pending": "Invoice required" };
      const eventDay = isoDay(order.event_date ?? order.delivery_date); const bucket: AttentionBucket = eventDay && eventDay <= tomorrow ? (eventDay < today ? "overdue" : eventDay === today ? "today" : "upcoming") : "action";
      result.push({ id: `order-${order.id}`, module: "orders", bucket, priority: bucket === "overdue" ? "critical" : status === "Confirmed" || status === "Ready" ? "high" : "medium", type: `Order ${status}`, customer: order.customer_name, reference: order.order_no, date: displayDate(order.event_date ?? order.delivery_date), reason: messages[status] ?? status, action: "View Order", to: `/crm/orders/${order.id}` });
    }
    for (const invoice of invoices.data ?? []) {
      const balance = Number(invoice.balance_amount) || 0; if (balance <= 0 || ["Paid", "Closed"].includes(invoice.status)) continue;
      result.push({ id: `invoice-${invoice.id}`, module: "invoices", bucket: "action", priority: "high", type: "Invoice balance", customer: invoice.customer_name, reference: invoice.invoice_no, date: displayDate(invoice.delivery_date ?? invoice.event_date), reason: `₹${balance.toLocaleString("en-IN")} due`, action: "View Invoice", to: `/crm/invoices/${invoice.id}` });
    }
    for (const delivery of deliveries.data ?? []) {
      if (delivery.delivery_status === "Delivered Successfully") continue;
      const due = isoDay(delivery.scheduled_at); const failure = ["Delivery Failed", "Damaged During Delivery"].includes(delivery.delivery_status); const bucket: AttentionBucket = failure || (due && due < today) ? "overdue" : due === today ? "today" : due === tomorrow ? "upcoming" : "action";
      result.push({ id: `delivery-${delivery.id}`, module: "delivery", bucket, priority: failure ? "critical" : bucket === "today" ? "high" : "medium", type: failure ? delivery.delivery_status : bucket === "today" ? "Delivery today" : due === tomorrow ? "Delivery tomorrow" : `Delivery ${delivery.delivery_status}`, customer: delivery.customer_name, reference: delivery.order_no || delivery.delivery_no, date: displayDate(delivery.scheduled_at, true), reason: failure ? delivery.damage_description || delivery.failure_reason || "Immediate delivery action required" : `${delivery.delivery_type} · ${delivery.delivery_status}`, action: "View Delivery", to: `/crm/delivery/${delivery.id}` });
    }
    for (const event of events.data ?? []) {
      if (event.is_completed || event.status === "Completed") continue;
      const reminder = isoDay(event.reminder_date); const bucket: AttentionBucket = event.status === "Overdue" || reminder < today ? "overdue" : event.status === "Reminder Due" || reminder === today ? "today" : "upcoming";
      result.push({ id: `event-${event.id}`, module: "customers", bucket, priority: bucket === "overdue" ? "critical" : bucket === "today" ? "high" : "normal", type: event.event_type, customer: event.customer_name, date: displayDate(event.next_occurrence), reason: bucket === "overdue" ? "Customer reminder overdue" : bucket === "today" ? "Customer reminder due today" : `Reminder ${displayDate(event.reminder_date)}`, action: "View Customer", to: `/crm/customers/${event.customer_id}` });
    }
    const bucketOrder: Record<AttentionBucket, number> = { overdue: 0, today: 1, action: 2, upcoming: 3 }; const priorityOrder: Record<AttentionPriority, number> = { critical: 0, high: 1, medium: 2, normal: 3 };
    return result.sort((a, b) => bucketOrder[a.bucket] - bucketOrder[b.bucket] || priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [deliveries.data, events.data, followUps.data, invoices.data, leads.data, orders.data, quotations.data]);
  const counts = useMemo(() => items.reduce((acc, item) => { acc[item.module] += 1; return acc; }, { leads: 0, followUps: 0, quotations: 0, orders: 0, invoices: 0, delivery: 0, customers: 0 } satisfies Record<AttentionModule, number>), [items]);
  return { items, counts, total: items.length, isLoading: followUps.isLoading || leads.isLoading || quotations.isLoading || orders.isLoading || invoices.isLoading || deliveries.isLoading || events.isLoading };
}
