import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, FileText, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { useArchiveDelivery, useDeliveries, usePermanentDeleteDelivery, useRestoreDelivery, DELIVERY_STATUSES, type CrmDelivery } from "@/features/crm/deliveries-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";
import { useCurrentAccess } from "@/features/auth/rbac";

function CrmDeliveryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [archived, setArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<CrmDelivery | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<CrmDelivery | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const access = useCurrentAccess();
  const { data: deliveries, isLoading, isError, refetch } = useDeliveries({ archived });
  const { data: dashboard } = useCrmDashboard();
  const archiveDelivery = useArchiveDelivery();
  const restoreDelivery = useRestoreDelivery();
  const permanentDeleteDelivery = usePermanentDeleteDelivery();
  const isSuperAdmin = Boolean(access.data?.is_super_admin);

  const rows = useMemo(() => {
    const all = deliveries ?? [];
    if (status === "all") return all;
    if (status === "action") return all.filter((d) => dashboard?.actionable_statuses?.deliveries.includes(d.delivery_status));
    return all.filter((d) => d.delivery_status === status);
  }, [dashboard?.actionable_statuses.deliveries, deliveries, status]);

  const errorMessage = (error: unknown, fallback: string) => {
    const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
    return data?.message || data?.detail || fallback;
  };
  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveDelivery.mutateAsync(archiveTarget.id);
      toast.success("Delivery archived.");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to archive delivery."));
    }
  };
  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || deleteConfirmation !== "DELETE") return;
    try {
      await permanentDeleteDelivery.mutateAsync(permanentDeleteTarget.id);
      toast.success("Delivery permanently deleted.");
      setPermanentDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to permanently delete delivery."));
    }
  };

  return (
    <>
      <PageHeader
        title="Delivery"
        description="Final fulfilment workspace for Customer Pickup, Magilshe Delivery and Porter Delivery orders."
        actions={<Button variant={archived ? "default" : "outline"} onClick={() => setArchived((value) => !value)}><Archive className="size-4" /> {archived ? "Archived" : "Active"}</Button>}
      />

      {!archived && <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[{ key: "all", label: "All deliveries", value: dashboard?.documents.deliveries ?? 0 }, { key: "action", label: "Action required", value: dashboard?.actionable.deliveries ?? 0 }, ...DELIVERY_STATUSES.map((s) => ({ key: s, label: s, value: dashboard?.status_counts.deliveries[s] ?? 0 }))].map((tile) => (
          <button key={tile.key} onClick={() => setStatus(tile.key)} className={`rounded-2xl border p-3 text-left transition-colors ${status === tile.key ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}>
            <p className="text-xs text-muted-foreground">{tile.label}</p><p className="text-xl font-semibold tabular">{tile.value}</p>
          </button>
        ))}
      </div>}

      <div className="flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="action">Action required</SelectItem>
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
          onRowClick={(r) => !archived && navigate(`/crm/delivery/${r.id}`)}
          emptyTitle={archived ? "No archived deliveries" : "No deliveries match this view"}
          emptyDescription={archived ? "Archived deliveries will appear here for Super Admin review." : "Paid invoices moved to Delivery will appear here automatically."}
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
            { key: "advance", header: "Advance", align: "right", cell: (r) => <span className={`tabular ${paymentSummaryStyles.inlineAdvance}`}>{inr(Number(r.advance_paid))}</span> },
            { key: "payment", header: "Final payment", align: "right", cell: (r) => (
              <span className="min-w-0"><span className="block font-medium">{Number(r.balance_amount) === 0 ? "Paid" : "Balance due"}</span>
              <span className="block text-xs text-muted-foreground tabular">{inr(Number(r.balance_amount))}</span></span>
            ) },
            { key: "status", header: "Fulfilment stage", cell: (r) => <StatusChip status={r.delivery_status} /> },
          ]}
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Row actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!archived ? (
                  <>
                    <DropdownMenuItem asChild><Link to={`/crm/delivery/${r.id}`}><FileText className="size-4" /> Open</Link></DropdownMenuItem>
                    {isSuperAdmin && <DropdownMenuItem className="text-danger" onClick={() => setArchiveTarget(r)}><Archive className="size-4" /> Archive</DropdownMenuItem>}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => restoreDelivery.mutate(r.id, { onSuccess: () => toast.success("Delivery restored.") })}><RotateCcw className="size-4" /> Restore</DropdownMenuItem>
                    {isSuperAdmin && <DropdownMenuItem className="text-danger" onClick={() => setPermanentDeleteTarget(r)}><Trash2 className="size-4" /> Permanently delete</DropdownMenuItem>}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive {archiveTarget?.delivery_no}?</AlertDialogTitle><AlertDialogDescription>The delivery will be hidden from active lists and can be restored by Super Admin.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={archiveDelivery.isPending} onClick={confirmArchive}>Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={permanentDeleteTarget !== null} onOpenChange={(open) => { if (!open) { setPermanentDeleteTarget(null); setDeleteConfirmation(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete {permanentDeleteTarget?.delivery_no}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Type DELETE to confirm.</AlertDialogDescription></AlertDialogHeader><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={deleteConfirmation !== "DELETE" || permanentDeleteDelivery.isPending} onClick={confirmPermanentDelete}>Permanently Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

export default CrmDeliveryPage;
