import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, FileText, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { useArchiveInvoice, useInvoices, usePermanentDeleteInvoice, useRestoreInvoice, INVOICE_STATUSES, type CrmInvoice } from "@/features/crm/invoices-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";
import { useCurrentAccess } from "@/features/auth/rbac";

function InvoicesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [archived, setArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<CrmInvoice | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<CrmInvoice | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const access = useCurrentAccess();
  const { data: invoices, isLoading, isError, refetch } = useInvoices({ archived });
  const { data: dashboard } = useCrmDashboard();
  const archiveInvoice = useArchiveInvoice();
  const restoreInvoice = useRestoreInvoice();
  const permanentDeleteInvoice = usePermanentDeleteInvoice();
  const isSuperAdmin = Boolean(access.data?.is_super_admin);

  const rows = useMemo(() => {
    const all = invoices ?? [];
    if (status === "all") return all;
    if (status === "action") return all.filter((i) => dashboard?.actionable_statuses?.invoices.includes(i.status) && Number(i.balance_amount) > 0);
    return all.filter((i) => i.status === status);
  }, [dashboard?.actionable_statuses.invoices, invoices, status]);

  const errorMessage = (error: unknown, fallback: string) => {
    const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
    return data?.message || data?.detail || fallback;
  };
  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveInvoice.mutateAsync(archiveTarget.id);
      toast.success("Invoice archived.");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to archive invoice."));
    }
  };
  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || deleteConfirmation !== "DELETE") return;
    try {
      await permanentDeleteInvoice.mutateAsync(permanentDeleteTarget.id);
      toast.success("Invoice permanently deleted.");
      setPermanentDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to permanently delete invoice."));
    }
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Financial settlement before delivery handoff."
        actions={<Button variant={archived ? "default" : "outline"} onClick={() => setArchived((value) => !value)}><Archive className="size-4" /> {archived ? "Archived" : "Active"}</Button>}
      />

      {!archived && <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[{ key: "all", label: "All", value: dashboard?.documents.invoices ?? 0 }, { key: "action", label: "Action required", value: dashboard?.actionable.invoices ?? 0 }, ...INVOICE_STATUSES.map((s) => ({ key: s, label: s, value: dashboard?.status_counts.invoices[s] ?? 0 }))].map((tile) => (
          <button key={tile.key} onClick={() => setStatus(tile.key)} className={`rounded-2xl border p-3 text-left transition-colors ${status === tile.key ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}>
            <p className="text-xs text-muted-foreground">{tile.label}</p><p className="text-xl font-semibold tabular">{tile.value}</p>
          </button>
        ))}
      </div>}

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
          onRowClick={(r) => !archived && navigate(`/crm/invoices/${r.id}`)}
          emptyTitle={archived ? "No archived invoices" : "No invoices match this view"}
          emptyDescription={archived ? "Archived invoices will appear here for Super Admin review." : "Invoices appear automatically after a Ready Order is moved to Invoice."}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Row actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!archived ? (
                  <>
                    <DropdownMenuItem asChild><Link to={`/crm/invoices/${r.id}`}><FileText className="size-4" /> Open</Link></DropdownMenuItem>
                    {isSuperAdmin && <DropdownMenuItem className="text-danger" onClick={() => setArchiveTarget(r)}><Archive className="size-4" /> Archive</DropdownMenuItem>}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => restoreInvoice.mutate(r.id, { onSuccess: () => toast.success("Invoice restored.") })}><RotateCcw className="size-4" /> Restore</DropdownMenuItem>
                    {isSuperAdmin && <DropdownMenuItem className="text-danger" onClick={() => setPermanentDeleteTarget(r)}><Trash2 className="size-4" /> Permanently delete</DropdownMenuItem>}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive {archiveTarget?.invoice_no}?</AlertDialogTitle><AlertDialogDescription>The invoice will be hidden from active lists and can be restored by Super Admin.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={archiveInvoice.isPending} onClick={confirmArchive}>Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={permanentDeleteTarget !== null} onOpenChange={(open) => { if (!open) { setPermanentDeleteTarget(null); setDeleteConfirmation(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete {permanentDeleteTarget?.invoice_no}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Type DELETE to confirm.</AlertDialogDescription></AlertDialogHeader><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={deleteConfirmation !== "DELETE" || permanentDeleteInvoice.isPending} onClick={confirmPermanentDelete}>Permanently Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

export default InvoicesPage;
