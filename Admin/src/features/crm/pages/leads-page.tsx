import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { CardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useDeleteLead,
  useCrmDashboard,
  useLeads,
  usePermanentDeleteLead,
  useRestoreLead,
  leadStatusOptions,
  type Lead,
  type LeadStatus,
} from "@/features/crm/hooks";
import { useCurrentAccess } from "@/features/auth/rbac";
import { QuickCreateLeadDialog } from "@/features/crm/components/quick-create-lead-dialog";
import { LeadStatusDialog } from "@/features/crm/components/lead-status-dialog";
import { WonQuotationDialog } from "@/features/crm/components/won-quotation-dialog";
import { LeadImportDialog } from "@/features/crm/components/lead-import-dialog";
import { LeadKanban } from "@/features/crm/components/lead-kanban";

const excludedDuplicateFields = [
  "id",
  "lead_no",
  "created_on",
  "updated_on",
  "activities",
  "reference_images",
  "quotation_id",
  "assigned_to_name",
  "cake_name",
];

function downloadCsv(rows: Lead[]) {
  const header = ["Lead No", "Customer", "Phone", "Occasion", "Cake Type", "Event Date", "Status"];
  const lines = rows.map((r) => [
    r.lead_no,
    r.customer_name,
    r.phone,
    r.occasion,
    r.cake_type,
    r.event_date,
    r.status,
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function LeadsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [status, setStatus] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [cakeType, setCakeType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ lead: Lead; status: LeadStatus } | null>(null);
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Lead | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [archived, setArchived] = useState(false);

  const { data: access } = useCurrentAccess();
  const { data: dashboard } = useCrmDashboard();
  const {
    data: leads,
    isLoading,
    isError,
    refetch,
  } = useLeads({
    status: status === "action" ? "" : status,
    action_required: status === "action",
    occasion,
    cake_type: cakeType,
    event_date: eventDate,
    created_date: createdDate,
    archived,
  });
  const deleteLead = useDeleteLead();
  const restoreLead = useRestoreLead();
  const permanentDeleteLead = usePermanentDeleteLead();

  const rows = leads ?? [];

  const duplicate = (lead: Lead) => {
    const draft = Object.fromEntries(
      Object.entries(lead).filter(([k]) => !excludedDuplicateFields.includes(k)),
    );
    navigate("/crm/leads/new", { state: { leadDraft: draft } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success("Lead archived.");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Unable to archive lead.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteTarget || deleteConfirmation !== "DELETE") return;
    try {
      await permanentDeleteLead.mutateAsync(permanentDeleteTarget.id);
      toast.success("Lead permanently deleted.");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Unable to permanently delete lead.");
    } finally {
      setPermanentDeleteTarget(null);
      setDeleteConfirmation("");
    }
  };

  const statTiles = useMemo(() => {
    const leadsBlock = dashboard?.leads;
    return [
      { key: "", label: "All leads", value: leadsBlock?.total ?? 0 },
      { key: "action", label: "Action required", value: dashboard?.actionable.leads ?? 0 },
      { key: "Open", label: "Open", value: leadsBlock?.["Open"] ?? 0 },
      { key: "Follow-up", label: "Follow-up", value: leadsBlock?.["Follow-up"] ?? 0 },
      { key: "Won", label: "Won", value: leadsBlock?.["Won"] ?? 0 },
      { key: "Lost", label: "Lost", value: leadsBlock?.["Lost"] ?? 0 },
    ];
  }, [dashboard]);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every customer enquiry from first contact to won or lost."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setView((v) => (v === "list" ? "kanban" : "list"))}
            >
              {view === "list" ? (
                <LayoutGrid className="size-4" />
              ) : (
                <ListIcon className="size-4" />
              )}
              {view === "list" ? "Kanban" : "List"}
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> Import
            </Button>
            <Button variant="outline" onClick={() => downloadCsv(rows)}>
              <Download className="size-4" /> Export
            </Button>
            <Button onClick={() => setQuickCreateOpen(true)}>
              <Plus className="size-4" /> New lead
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statTiles.map((t) => (
          <button
            key={t.label}
            onClick={() => setStatus(t.key)}
            className={`rounded-2xl border p-3 text-left transition-colors ${status === t.key ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong"}`}
          >
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="text-xl font-semibold tabular">{t.value}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {access?.is_super_admin && (
          <Button variant={archived ? "default" : "outline"} size="sm" onClick={() => setArchived((v) => !v)}>
            {archived ? "Archived" : "Active"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setAdvancedOpen((v) => !v)}>
          <SlidersHorizontal className="size-4" /> More filters
        </Button>
        {(occasion || cakeType || eventDate || createdDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOccasion("");
              setCakeType("");
              setEventDate("");
              setCreatedDate("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      {advancedOpen && (
        <div className="grid gap-2 rounded-xl bg-surface-muted p-3 sm:grid-cols-4">
          <Input
            placeholder="Occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          />
          <Input
            placeholder="Cake type"
            value={cakeType}
            onChange={(e) => setCakeType(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Event date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Created date"
            value={createdDate}
            onChange={(e) => setCreatedDate(e.target.value)}
          />
        </div>
      )}

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
          Couldn't load leads.{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        view === "list" ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )
      ) : view === "kanban" ? (
        <LeadKanban leads={rows} onDropStatus={(lead, s) => setStatusTarget({ lead, status: s })} />
      ) : (
        <DataTable<Lead>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) =>
            `${r.lead_no} ${r.customer_name} ${r.phone} ${r.occasion} ${r.cake_type}`
          }
          onRowClick={(r) => !archived && navigate(`/crm/leads/${r.id}/edit`)}
          emptyTitle={archived ? "No archived leads" : "No leads yet"}
          emptyDescription={archived ? "Archived leads will appear here for Super Admin review." : "Create your first lead to see it listed here."}
          columns={[
            {
              key: "lead_no",
              header: "Lead No",
              sortValue: (r) => r.lead_no,
              cell: (r) => <span className="font-medium tabular text-primary">{r.lead_no}</span>,
            },
            {
              key: "customer",
              header: "Customer",
              sortValue: (r) => r.customer_name,
              cell: (r) => <span className="font-medium">{r.customer_name}</span>,
            },
            { key: "phone", header: "Phone", cell: (r) => r.phone || "—" },
            { key: "occasion", header: "Occasion", cell: (r) => r.occasion },
            { key: "cake_type", header: "Cake type", cell: (r) => r.cake_type },
            {
              key: "quantity",
              header: "Qty",
              align: "right",
              cell: (r) => <span className="tabular">{Number(r.quantity)} {r.unit_type === "piece" && Number(r.quantity) !== 1 ? "pieces" : r.unit_type}</span>,
            },
            {
              key: "event_date",
              header: "Event date",
              sortValue: (r) => r.event_date,
              cell: (r) => <span className="tabular">{r.event_date}</span>,
            },
            {
              key: "follow_up",
              header: "Follow-up",
              cell: (r) =>
                r.status === "Follow-up" && r.follow_up_date ? (
                  <span className="tabular text-warning">
                    {r.follow_up_date}
                    {r.follow_up_time ? ` ${r.follow_up_time}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "created_on",
              header: "Created",
              sortValue: (r) => r.created_on,
              cell: (r) => (
                <span className="tabular text-muted-foreground">
                  {r.created_on ? new Date(r.created_on).toLocaleDateString("en-IN") : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      className="inline-flex items-center gap-1"
                      aria-label={`Change status for ${r.customer_name}`}
                    >
                      <StatusChip status={r.status} />
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    {leadStatusOptions(r.status).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => setStatusTarget({ lead: r, status: s })}
                      >
                        {s === "Follow-up"
                          ? "Schedule follow-up"
                          : s === "Won"
                            ? "Mark as Won"
                            : "Mark as Lost"}
                      </DropdownMenuItem>
                    ))}
                    {leadStatusOptions(r.status).length === 0 && (
                      <DropdownMenuItem disabled>No further transitions</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                      <Link to={`/crm/leads/${r.id}/edit`}>
                        <Pencil className="size-4" /> Open lead
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate(r)}>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-danger" onClick={() => setDeleteTarget(r)}>
                      <Trash2 className="size-4" /> Archive
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => restoreLead.mutate(r.id, { onSuccess: () => toast.success("Lead restored.") })}>
                      <RotateCcw className="size-4" /> Restore
                    </DropdownMenuItem>
                    {access?.is_super_admin && (
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

      <QuickCreateLeadDialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
      {statusTarget && (
        <LeadStatusDialog
          lead={statusTarget.lead}
          target={statusTarget.status}
          onOpenChange={(v) => !v && setStatusTarget(null)}
          onUpdated={(lead, won) => {
            setStatusTarget(null);
            toast.success("Lead updated.");
            if (won) setWonLead(lead);
          }}
        />
      )}
      <WonQuotationDialog
        lead={wonLead}
        open={wonLead !== null}
        onOpenChange={(v) => !v && setWonLead(null)}
        onGenerated={(quotationId) => {
          setWonLead(null);
          navigate(`/crm/quotations/${quotationId}/edit`);
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive lead for {deleteTarget?.customer_name}?</AlertDialogTitle>
            <AlertDialogDescription>The lead will be hidden from normal lists and can be restored by Super Admin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={confirmDelete}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteTarget !== null} onOpenChange={(v) => { if (!v) { setPermanentDeleteTarget(null); setDeleteConfirmation(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {permanentDeleteTarget?.lead_no}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Type DELETE to confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmation !== "DELETE"}
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={confirmPermanentDelete}
            >
              Permanently delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default LeadsPage;
