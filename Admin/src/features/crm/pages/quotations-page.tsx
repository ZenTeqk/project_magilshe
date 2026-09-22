import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, FileText, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  useArchiveQuotation,
  usePermanentDeleteQuotation,
  useRestoreQuotation,
  QUOTATION_STATUSES,
  type QuotationListItem,
} from "@/features/crm/quotations-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";

function mutationMessage(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  return data?.message || data?.detail || fallback;
}

function QuotationsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("all");
  const [archived, setArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<QuotationListItem | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<QuotationListItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const access = useCurrentAccess();
  const { data: quotations, isLoading, isError, refetch } = useQuotations({ archived });
  const { data: pendingLeads, isLoading: pendingLoading } = useQuotationsPending();
  const { data: dashboard } = useCrmDashboard();
  const archiveQuotation = useArchiveQuotation();
  const restoreQuotation = useRestoreQuotation();
  const permanentDeleteQuotation = usePermanentDeleteQuotation();
  const canArchive = hasPermission(access.data, "crm.quotations.delete");

  const rows = useMemo(() => {
    const all = quotations ?? [];
    if (status === "all") return all;
    if (status === "action") return all.filter((q) => dashboard?.actionable_statuses?.quotations.includes(q.status));
    return all.filter((q) => q.status === status);
  }, [dashboard?.actionable_statuses.quotations, quotations, status]);

  const statusCounts = dashboard?.status_counts.quotations ?? {};

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveQuotation.mutateAsync(archiveTarget.id);
      toast.success("Quotation archived.");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(mutationMessage(error, "Unable to archive quotation."));
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || deleteConfirmation !== "DELETE") return;
    try {
      await permanentDeleteQuotation.mutateAsync(permanentDeleteTarget.id);
      toast.success("Quotation permanently deleted.");
      setPermanentDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (error) {
      toast.error(mutationMessage(error, "Unable to permanently delete quotation."));
    }
  };

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Commercial proposals from draft through confirmed order."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant={archived ? "default" : "outline"} onClick={() => setArchived((value) => !value)}>
              <Archive className="size-4" /> {archived ? "Archived" : "Active"}
            </Button>
            {!archived && (
              <Button onClick={() => navigate("/crm/quotations/new")}>
                <Plus className="size-4" /> New quotation
              </Button>
            )}
          </div>
        }
      />

      {!archived && <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <button
          onClick={() => setStatus("all")}
          className={`rounded-2xl border p-3 text-left transition-colors ${status === "all" ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}
        >
          <p className="text-xs text-muted-foreground">All</p>
          <p className="text-xl font-semibold tabular">{dashboard?.documents.quotations ?? 0}</p>
        </button>
        <button onClick={() => setStatus("action")} className={`rounded-2xl border p-3 text-left transition-colors ${status === "action" ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}>
          <p className="text-xs text-muted-foreground">Action required</p>
          <p className="text-xl font-semibold tabular">{dashboard?.actionable.quotations ?? 0}</p>
        </button>
        {QUOTATION_STATUSES.map(
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
      </div>}

      {!archived && !pendingLoading && pendingLeads && pendingLeads.length > 0 && (
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
            <SelectItem value="action">Action required</SelectItem>
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
          emptyTitle={archived ? "No archived quotations" : "No quotations yet"}
          emptyDescription={archived ? "Archived quotations will appear here for Super Admin review." : "Generate one from a Won lead, or create a new quotation directly."}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Row actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!archived ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to={`/crm/quotations/${r.id}/edit`}><FileText className="size-4" /> Open</Link>
                    </DropdownMenuItem>
                    {canArchive && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-danger" onClick={() => setArchiveTarget(r)}>
                          <Archive className="size-4" /> Archive
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => restoreQuotation.mutate(r.id, { onSuccess: () => toast.success("Quotation restored.") })}>
                      <RotateCcw className="size-4" /> Restore
                    </DropdownMenuItem>
                    {access.data?.is_super_admin && (
                      <DropdownMenuItem className="text-danger" onClick={() => setPermanentDeleteTarget(r)}>
                        <Trash2 className="size-4" /> Permanently delete
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveTarget?.quotation_no}?</AlertDialogTitle>
            <AlertDialogDescription>The quotation will be hidden from active lists and can be restored by Super Admin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={archiveQuotation.isPending} onClick={confirmArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={permanentDeleteTarget !== null} onOpenChange={(open) => { if (!open) { setPermanentDeleteTarget(null); setDeleteConfirmation(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {permanentDeleteTarget?.quotation_no}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Type DELETE to confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={deleteConfirmation !== "DELETE" || permanentDeleteQuotation.isPending} onClick={confirmPermanentDelete}>Permanently Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default QuotationsPage;
