import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { useOrders, displayOrderStatus, type CrmOrder } from "@/features/crm/orders-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";

const displayStatuses = ["Confirmed", "Processing", "Ready", "Invoice Pending", "Delivery", "Closed", "Cancelled"];

function CrmOrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const { data: orders, isLoading, isError, refetch } = useOrders();
  const { data: dashboard } = useCrmDashboard();
  const rawCounts = dashboard?.status_counts.orders ?? {};
  const statusCounts: Record<string, number> = {
    Confirmed: rawCounts["Confirmed"] ?? 0,
    Processing: (rawCounts["Processing"] ?? 0) + (rawCounts["Production"] ?? 0),
    Ready: rawCounts["Ready"] ?? 0,
    "Invoice Pending": (rawCounts["Invoice Pending"] ?? 0) + (rawCounts["Invoice Generated"] ?? 0),
    Delivery: (rawCounts["Delivery"] ?? 0) + (rawCounts["Out for Delivery"] ?? 0),
    Closed: (rawCounts["Closed"] ?? 0) + (rawCounts["Delivered"] ?? 0) + (rawCounts["Completed"] ?? 0),
    Cancelled: rawCounts["Cancelled"] ?? 0,
  };

  const rows = useMemo(() => {
    const all = orders ?? [];
    if (status === "all") return all;
    if (status === "action") return all.filter((o) => dashboard?.actionable_statuses?.orders.includes(o.status));
    return all.filter((o) => displayOrderStatus(o.status) === status);
  }, [dashboard?.actionable_statuses.orders, orders, status]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Confirmed commercial orders in production and fulfilment."
        actions={<Button onClick={() => navigate("/crm/orders/new")}><Plus className="size-4" /> New order</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {[{ key: "all", label: "All", value: dashboard?.documents.orders ?? 0 }, { key: "action", label: "Action required", value: dashboard?.actionable.orders ?? 0 }, ...displayStatuses.map((s) => ({ key: s, label: s, value: statusCounts[s] ?? 0 }))].map((tile) => (
          <button key={tile.key} onClick={() => setStatus(tile.key)} className={`rounded-2xl border p-3 text-left transition-colors ${status === tile.key ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}>
            <p className="text-xs text-muted-foreground">{tile.label}</p><p className="text-xl font-semibold tabular">{tile.value}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="action">Action required</SelectItem>
            {displayStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          Couldn't load orders. <button onClick={() => refetch()} className="font-medium underline">Retry</button>
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<CrmOrder>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.order_no} ${r.quotation_no ?? ""} ${r.customer_name} ${r.phone}`}
          onRowClick={(r) => navigate(`/crm/orders/${r.id}`)}
          emptyTitle="No orders yet"
          emptyDescription="Confirm a quotation, or create a direct order."
          columns={[
            { key: "order_no", header: "Order", sortValue: (r) => r.order_no, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium tabular text-primary">{r.order_no}</span>
              <span className="block text-xs text-muted-foreground">{r.quotation_no}</span></span>
            ) },
            { key: "customer", header: "Customer", sortValue: (r) => r.customer_name, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium">{r.customer_name}</span>
              <span className="block text-xs text-muted-foreground tabular">{r.phone}</span></span>
            ) },
            { key: "cake", header: "Cake preparation", cell: (r) => <span className="text-muted-foreground">{r.cake_type} · {r.flavour ?? "—"} · {r.quantity}</span> },
            { key: "date", header: "Required date", sortValue: (r) => r.delivery_date ?? r.event_date ?? "", cell: (r) => <span className="tabular">{r.delivery_date ?? r.event_date ?? "—"}</span> },
            { key: "balance", header: "Balance", align: "right", cell: (r) => <span className="tabular font-medium">{inr(Number(r.balance_amount))}</span> },
            { key: "advance", header: "Advance", align: "right", cell: (r) => <span className={`tabular ${paymentSummaryStyles.inlineAdvance}`}>{inr(Number(r.advance_paid))}</span> },
            { key: "total", header: "Total", align: "right", cell: (r) => <span className="tabular">{inr(Number(r.total_amount))}</span> },
            { key: "status", header: "Stage", cell: (r) => <StatusChip status={displayOrderStatus(r.status)} /> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/crm/orders/${r.id}`}><FileText className="size-4" /> Open</Link>
            </Button>
          )}
        />
      )}
    </>
  );
}

export default CrmOrdersPage;
