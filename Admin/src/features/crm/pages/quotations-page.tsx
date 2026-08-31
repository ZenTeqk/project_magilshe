import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/data";
import {
  useQuotations,
  useQuotationsPending,
  QUOTATION_STATUSES,
  type QuotationListItem,
} from "@/features/crm/quotations-hooks";

function QuotationsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("all");
  const { data: quotations, isLoading, isError, refetch } = useQuotations();
  const { data: pendingLeads, isLoading: pendingLoading } = useQuotationsPending();

  const rows = useMemo(() => {
    const all = quotations ?? [];
    return status === "all" ? all : all.filter((q) => q.status === status);
  }, [quotations, status]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of quotations ?? []) counts[q.status] = (counts[q.status] ?? 0) + 1;
    return counts;
  }, [quotations]);

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Commercial proposals from draft through confirmed order."
        actions={
          <Button onClick={() => navigate("/crm/quotations/new")}>
            <Plus className="size-4" /> New quotation
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <button
          onClick={() => setStatus("all")}
          className={`rounded-2xl border p-3 text-left transition-colors ${status === "all" ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}
        >
          <p className="text-xs text-muted-foreground">All</p>
          <p className="text-xl font-semibold tabular">{quotations?.length ?? 0}</p>
        </button>
        {(["Draft", "Sent", "Accepted", "Advance Received", "Order Confirmed"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-2xl border p-3 text-left transition-colors ${status === s ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}
            >
              <p className="text-xs text-muted-foreground">{s}</p>
              <p className="text-xl font-semibold tabular">{statusCounts[s] ?? 0}</p>
            </button>
          ),
        )}
      </div>

      {!pendingLoading && pendingLeads && pendingLeads.length > 0 && (
        <SectionCard title="Ready to quote" description="Won leads without a quotation yet">
          <ul className="divide-y divide-border">
            {pendingLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{lead.customer_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {lead.lead_no} · {lead.occasion}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/crm/quotations/new?lead=${lead.id}`)}
                >
                  Generate quotation
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {QUOTATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          Couldn't load quotations.{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<QuotationListItem>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.quotation_no} ${r.customer_name} ${r.phone} ${r.lead_no ?? ""}`}
          onRowClick={(r) => navigate(`/crm/quotations/${r.id}/edit`)}
          emptyTitle="No quotations yet"
          emptyDescription="Generate one from a Won lead, or create a new quotation directly."
          columns={[
            {
              key: "quotation_no",
              header: "Quotation",
              sortValue: (r) => r.quotation_no,
              cell: (r) => (
                <span className="min-w-0">
                  <span className="block font-medium tabular text-primary">{r.quotation_no}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.lead_no ?? "New entry"}
                  </span>
                </span>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              sortValue: (r) => r.customer_name,
              cell: (r) => (
                <span className="min-w-0">
                  <span className="block font-medium">{r.customer_name}</span>
                  <span className="block text-xs text-muted-foreground tabular">{r.phone}</span>
                </span>
              ),
            },
            {
              key: "event_date",
              header: "Event date",
              sortValue: (r) => r.event_date,
              cell: (r) => <span className="tabular">{r.event_date}</span>,
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              sortValue: (r) => Number(r.total_amount),
              cell: (r) => (
                <span className="tabular font-medium">{inr(Number(r.total_amount))}</span>
              ),
            },
            {
              key: "advance",
              header: "Advance",
              align: "right",
              cell: (r) => <span className={`tabular ${paymentSummaryStyles.inlineAdvance}`}>{inr(Number(r.advance_amount))}</span>,
            },
            {
              key: "balance",
              header: "Balance",
              align: "right",
              cell: (r) => <span className="tabular">{inr(Number(r.balance_amount))}</span>,
            },
            { key: "status", header: "Stage", cell: (r) => <StatusChip status={r.status} /> },
            {
              key: "created_on",
              header: "Created",
              sortValue: (r) => r.created_on,
              cell: (r) => (
                <span className="text-muted-foreground tabular">
                  {new Date(r.created_on).toLocaleDateString("en-IN")}
                </span>
              ),
            },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/crm/quotations/${r.id}/edit`}>
                <FileText className="size-4" /> Open
              </Link>
            </Button>
          )}
        />
      )}
    </>
  );
}

export default QuotationsPage;
