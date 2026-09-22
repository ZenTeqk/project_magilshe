import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, FileText, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { paymentSummaryStyles } from "@/features/crm/components/payment-summary-styles";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import { useArchiveOrder, useOrders, usePermanentDeleteOrder, useRestoreOrder, displayOrderStatus, type CrmOrder } from "@/features/crm/orders-hooks";
import { useCrmDashboard } from "@/features/crm/hooks";
import { useCurrentAccess } from "@/features/auth/rbac";

const displayStatuses = ["Confirmed", "Processing", "Ready", "Invoice Pending", "Delivery", "Closed", "Cancelled"];

function CrmOrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [archived, setArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<CrmOrder | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<CrmOrder | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const access = useCurrentAccess();
  const { data: orders, isLoading, isError, refetch } = useOrders({ archived });
  const { data: dashboard } = useCrmDashboard();
  const archiveOrder = useArchiveOrder();
  const restoreOrder = useRestoreOrder();
  const permanentDeleteOrder = usePermanentDeleteOrder();
  const isSuperAdmin = Boolean(access.data?.is_super_admin);
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

  const errorMessage = (error: unknown, fallback: string) => {
    const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
    return data?.message || data?.detail || fallback;
  };
  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveOrder.mutateAsync(archiveTarget.id);
      toast.success("Order archived.");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "Unable to archive order."));
    }
  };
  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || deleteConfirmation !== "DELETE") return;
    try {
      await permanentDeleteOrder.mutateAsync(permanentDeleteTarget.id);
      toast.success("Order permanently deleted.");
      setPermanentDeleteTarget(null);
      setDeleteConfirmation("");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to permanently delete order."));
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Confirmed commercial orders in production and fulfilment."
        actions={<div className="flex flex-wrap gap-2"><Button variant={archived ? "default" : "outline"} onClick={() => setArchived((value) => !value)}><Archive className="size-4" /> {archived ? "Archived" : "Active"}</Button>{!archived && <Button onClick={() => navigate("/crm/orders/new")}><Plus className="size-4" /> New order</Button>}</div>}
      />

      {!archived && <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {[{ key: "all", label: "All", value: dashboard?.documents.orders ?? 0 }, { key: "action", label: "Action required", value: dashboard?.actionable.orders ?? 0 }, ...displayStatuses.map((s) => ({ key: s, label: s, value: statusCounts[s] ?? 0 }))].map((tile) => (
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
          onRowClick={(r) => !archived && navigate(`/crm/orders/${r.id}`)}
          emptyTitle={archived ? "No archived orders" : "No orders yet"}
          emptyDescription={archived ? "Archived orders will appear here for Super Admin review." : "Confirm a quotation, or create a direct order."}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Row actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!archived ? (
                  <>
                    <DropdownMenuItem asChild><Link to={`/crm/orders/${r.id}`}><FileText className="size-4" /> Open</Link></DropdownMenuItem>
                    {isSuperAdmin && <><DropdownMenuSeparator /><DropdownMenuItem className="text-danger" onClick={() => setArchiveTarget(r)}><Archive className="size-4" /> Archive</DropdownMenuItem></>}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => restoreOrder.mutate(r.id, { onSuccess: () => toast.success("Order restored.") })}><RotateCcw className="size-4" /> Restore</DropdownMenuItem>
                    {isSuperAdmin && <DropdownMenuItem className="text-danger" onClick={() => setPermanentDeleteTarget(r)}><Trash2 className="size-4" /> Permanently delete</DropdownMenuItem>}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive {archiveTarget?.order_no}?</AlertDialogTitle><AlertDialogDescription>The order will be hidden from active lists and can be restored by Super Admin.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={archiveOrder.isPending} onClick={confirmArchive}>Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={permanentDeleteTarget !== null} onOpenChange={(open) => { if (!open) { setPermanentDeleteTarget(null); setDeleteConfirmation(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete {permanentDeleteTarget?.order_no}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Type DELETE to confirm.</AlertDialogDescription></AlertDialogHeader><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={deleteConfirmation !== "DELETE" || permanentDeleteOrder.isPending} onClick={confirmPermanentDelete}>Permanently Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

export default CrmOrdersPage;
