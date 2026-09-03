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
import { useInvoices, INVOICE_STATUSES, type CrmInvoice } from "@/features/crm/invoices-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";

function InvoicesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const { data: invoices, isLoading, isError, refetch } = useInvoices();
  const { data: dashboard } = useCrmDashboard();

  const rows = useMemo(() => {
    const all = invoices ?? [];
    if (status === "all") return all;
    if (status === "action") return all.filter((i) => dashboard?.actionable_statuses?.invoices.includes(i.status) && Number(i.balance_amount) > 0);
    return all.filter((i) => i.status === status);
  }, [dashboard?.actionable_statuses.invoices, invoices, status]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Financial settlement before delivery handoff."
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[{ key: "all", label: "All", value: dashboard?.documents.invoices ?? 0 }, { key: "action", label: "Action required", value: dashboard?.actionable.invoices ?? 0 }, ...INVOICE_STATUSES.map((s) => ({ key: s, label: s, value: dashboard?.status_counts.invoices[s] ?? 0 }))].map((tile) => (
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
            {INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          Couldn't load invoices. <button onClick={() => refetch()} className="font-medium underline">Retry</button>
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<CrmInvoice>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.invoice_no} ${r.order_no} ${r.customer_name} ${r.phone}`}
          onRowClick={(r) => navigate(`/crm/invoices/${r.id}`)}
          emptyTitle="No invoices match this view"
          emptyDescription="Invoices appear automatically after a Ready Order is moved to Invoice."
          columns={[
            { key: "invoice_no", header: "Invoice", sortValue: (r) => r.invoice_no, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium tabular text-primary">{r.invoice_no}</span>
              <span className="block text-xs text-muted-foreground">Order {r.order_no}</span></span>
            ) },
            { key: "customer", header: "Customer", sortValue: (r) => r.customer_name, cell: (r) => (
              <span className="min-w-0"><span className="block font-medium">{r.customer_name}</span>
              <span className="block text-xs text-muted-foreground tabular">{r.phone || "No phone"}</span></span>
            ) },
            { key: "total", header: "Total", align: "right", cell: (r) => <span className="tabular font-medium">{inr(Number(r.total_amount))}</span> },
            { key: "paid", header: "Paid", align: "right", cell: (r) => <span className="tabular">{inr(Number(r.amount_paid))}</span> },
            { key: "balance", header: "Balance", align: "right", cell: (r) => <span className="tabular">{inr(Number(r.balance_amount))}</span> },
            { key: "status", header: "Financial stage", cell: (r) => <StatusChip status={r.status} /> },
            { key: "generated", header: "Generated", sortValue: (r) => r.generated_on, cell: (r) => <span className="text-muted-foreground tabular">{r.generated_on?.slice(0, 10) ?? "—"}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/crm/invoices/${r.id}`}><FileText className="size-4" /> Open</Link>
            </Button>
          )}
        />
      )}
    </>
  );
}

export default InvoicesPage;
