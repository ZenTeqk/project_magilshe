import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { useDeliveries, DELIVERY_STATUSES, type CrmDelivery } from "@/features/crm/deliveries-hooks";

function CrmDeliveryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const { data: deliveries, isLoading, isError, refetch } = useDeliveries();

  const rows = useMemo(() => {
    const all = deliveries ?? [];
    return status === "all" ? all : all.filter((d) => d.delivery_status === status);
  }, [deliveries, status]);

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Final fulfilment workspace for Customer Pickup, Magilshe Delivery and Porter Delivery orders."
      />

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DELIVERY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          Couldn't load deliveries. <button onClick={() => refetch()} className="font-medium underline">Retry</button>
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<CrmDelivery>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.delivery_no} ${r.order_no} ${r.invoice_no} ${r.customer_name} ${r.phone}`}
          onRowClick={(r) => navigate(`/crm/delivery/${r.id}`)}
          emptyTitle="No deliveries match this view"
          emptyDescription="Paid invoices moved to Delivery will appear here automatically."
          columns={[
            { key: "delivery_no", header: "Delivery", sortValue: (r) => r.delivery_no, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium tabular text-primary">{r.delivery_no}</span>
              <span className="block text-xs text-muted-foreground">{r.order_no} · {r.invoice_no}</span></span>
            ) },
            { key: "recipient", header: "Customer / recipient", sortValue: (r) => r.recipient_name || r.customer_name, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium">{r.recipient_name || r.customer_name}</span>
              <span className="block text-xs text-muted-foreground tabular">{r.recipient_phone || r.phone}</span></span>
            ) },
            { key: "type", header: "Delivery type", cell: (r) => <span className="text-muted-foreground">{r.delivery_type}</span> },
            { key: "scheduled", header: "Scheduled", sortValue: (r) => r.scheduled_at ?? "", cell: (r) => <span className="tabular">{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString("en-IN") : "—"}</span> },
            { key: "payment", header: "Final payment", align: "right", cell: (r) => (
              <span className="min-w-0"><span className="block font-medium">{Number(r.balance_amount) === 0 ? "Paid" : "Balance due"}</span>
              <span className="block text-xs text-muted-foreground tabular">{inr(Number(r.balance_amount))}</span></span>
            ) },
            { key: "status", header: "Fulfilment stage", cell: (r) => <StatusChip status={r.delivery_status} /> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/crm/delivery/${r.id}`}><FileText className="size-4" /> Open</Link>
            </Button>
          )}
        />
      )}
    </>
  );
}

export default CrmDeliveryPage;
