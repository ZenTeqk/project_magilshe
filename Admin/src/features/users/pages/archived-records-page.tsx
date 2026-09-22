import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

type ArchiveType = "users" | "customers" | "leads" | "quotations" | "orders" | "invoices" | "deliveries";

type ArchivedRow = {
  id: string | number;
  identifier: string;
  name: string;
  archived_at: string | null;
  archived_by_name: string | null;
  archived_by: string | number | null;
  status: string;
  detailPath: string;
};

type DependencyLink = {
  label: string;
  count: number;
  records: Array<Record<string, unknown>>;
};

type DeletionDependencies = {
  has_dependencies: boolean;
  links: DependencyLink[];
};

const tabs: Array<{ key: ArchiveType; label: string }> = [
  { key: "users", label: "Users" },
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Leads" },
  { key: "quotations", label: "Quotations" },
  { key: "orders", label: "Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "deliveries", label: "Deliveries" },
];

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return record["results"] as T[];
    if (Array.isArray(record["data"])) return record["data"] as T[];
  }
  return [];
}

function fullName(row: Record<string, unknown>) {
  return [row["first_name"], row["last_name"]].filter(Boolean).join(" ").trim();
}

function mapRows(type: ArchiveType, data: unknown): ArchivedRow[] {
  return unwrapList<Record<string, unknown>>(data).map((row) => {
    const id = row["id"] as string | number;
    const archivedAt = (row["archived_at"] as string | null | undefined) ?? null;
    const archivedByName = (row["archived_by_name"] as string | null | undefined) ?? null;
    const archivedBy = (row["archived_by"] as string | number | null | undefined) ?? null;
    if (type === "users") {
      return {
        id,
        identifier: String(row["username"] ?? id),
        name: fullName(row) || String(row["email"] ?? row["phone"] ?? "User"),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["is_active"] ? "Active" : "Archived",
        detailPath: "/users?archived=true",
      };
    }
    if (type === "customers") {
      return {
        id,
        identifier: String(row["username"] ?? id),
        name: String(row["name"] ?? (fullName(row) || row["phone"] || "Customer")),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["is_active"] ? "Active" : "Archived",
        detailPath: `/crm/customers/${id}`,
      };
    }
    if (type === "leads") {
      return {
        id,
        identifier: String(row["lead_no"] ?? id),
        name: String(row["customer_name"] ?? "Lead"),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["status"] ? `Archived (${row["status"]})` : "Archived",
        detailPath: `/crm/leads/${id}/edit`,
      };
    }
    if (type === "quotations") {
      return {
        id,
        identifier: String(row["quotation_no"] ?? id),
        name: String(row["customer_name"] ?? "Quotation"),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["status"] ? `Archived (${row["status"]})` : "Archived",
        detailPath: `/crm/quotations/${id}/edit`,
      };
    }
    if (type === "orders") {
      return {
        id,
        identifier: String(row["order_no"] ?? id),
        name: String(row["customer_name"] ?? "Order"),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["status"] ? `Archived (${row["status"]})` : "Archived",
        detailPath: `/crm/orders/${id}`,
      };
    }
    if (type === "invoices") {
      return {
        id,
        identifier: String(row["invoice_no"] ?? id),
        name: String(row["customer_name"] ?? "Invoice"),
        archived_at: archivedAt,
        archived_by_name: archivedByName,
        archived_by: archivedBy,
        status: row["status"] ? `Archived (${row["status"]})` : "Archived",
        detailPath: `/crm/invoices/${id}`,
      };
    }
    return {
      id,
      identifier: String(row["delivery_no"] ?? id),
      name: String(row["customer_name"] ?? "Delivery"),
      archived_at: archivedAt,
      archived_by_name: archivedByName,
      archived_by: archivedBy,
      status: row["delivery_status"] ? `Archived (${row["delivery_status"]})` : "Archived",
      detailPath: `/crm/delivery/${id}`,
    };
  });
}

const listEndpoint: Record<ArchiveType, string> = {
  users: endpoints.rbac.users,
  customers: endpoints.crm.customers,
  leads: endpoints.crm.leads,
  quotations: endpoints.crm.quotations,
  orders: endpoints.crm.orders,
  invoices: endpoints.crm.invoices,
  deliveries: endpoints.crm.deliveries,
};

const restoreEndpoint: Record<ArchiveType, (id: string | number) => string> = {
  users: endpoints.rbac.userRestore,
  customers: endpoints.crm.customerRestore,
  leads: endpoints.crm.leadRestore,
  quotations: endpoints.crm.quotationRestore,
  orders: endpoints.crm.orderRestore,
  invoices: endpoints.crm.invoiceRestore,
  deliveries: endpoints.crm.deliveryRestore,
};

const permanentDeleteEndpoint: Record<ArchiveType, (id: string | number) => string> = {
  users: endpoints.rbac.userPermanentDelete,
  customers: endpoints.crm.customerPermanentDelete,
  leads: endpoints.crm.leadPermanentDelete,
  quotations: endpoints.crm.quotationPermanentDelete,
  orders: endpoints.crm.orderPermanentDelete,
  invoices: endpoints.crm.invoicePermanentDelete,
  deliveries: endpoints.crm.deliveryPermanentDelete,
};

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.message
    || (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data?.detail
    || fallback;
}

function errorDependencies(error: unknown): DeletionDependencies | null {
  return ((error as { response?: { data?: { dependencies?: DeletionDependencies } } })?.response?.data?.dependencies) ?? null;
}

const dependencyEndpoint: Partial<Record<ArchiveType, (id: string | number) => string>> = {
  users: endpoints.rbac.userDeletionDependencies,
  customers: endpoints.crm.customerDeletionDependencies,
  leads: endpoints.crm.leadDeletionDependencies,
  quotations: endpoints.crm.quotationDeletionDependencies,
  orders: endpoints.crm.orderDeletionDependencies,
  invoices: endpoints.crm.invoiceDeletionDependencies,
  deliveries: endpoints.crm.deliveryDeletionDependencies,
};

const clearDependencyEndpoint: Partial<Record<ArchiveType, (id: string | number) => string>> = {
  users: endpoints.rbac.userClearDeletionDependencies,
  customers: endpoints.crm.customerClearDeletionDependencies,
};

const clearConfirmation: Partial<Record<ArchiveType, string>> = {
  users: "CLEAR USER LINKS",
  customers: "CLEAR CUSTOMER LINKS",
};

function dependencyRecordType(record: Record<string, unknown>): ArchiveType | null {
  const recordType = record["record_type"];
  if (
    recordType === "leads"
    || recordType === "quotations"
    || recordType === "orders"
    || recordType === "invoices"
    || recordType === "deliveries"
  ) {
    return recordType;
  }
  return null;
}

function dependencyRecordLabel(record: Record<string, unknown>) {
  return String(
    record["lead_no"]
    ?? record["quotation_no"]
    ?? record["order_no"]
    ?? record["invoice_no"]
    ?? record["delivery_no"]
    ?? record["customer_name"]
    ?? record["message"]
    ?? record["id"]
    ?? "Record",
  );
}

function dependencyRecordPath(record: Record<string, unknown>) {
  const id = record["id"];
  if (!id) return null;
  switch (record["record_type"]) {
    case "leads":
      return `/crm/leads/${id}/edit`;
    case "quotations":
      return `/crm/quotations/${id}/edit`;
    case "orders":
      return `/crm/orders/${id}`;
    case "invoices":
      return `/crm/invoices/${id}`;
    case "deliveries":
      return `/crm/delivery/${id}`;
    default:
      return null;
  }
}

function invalidateDashboardData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["crm", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard", "home"] });
  queryClient.invalidateQueries({ queryKey: ["reports", "crm-analytics"] });
}

export default function ArchivedRecordsPage() {
  const [active, setActive] = useState<ArchiveType>("users");
  const [deleteTarget, setDeleteTarget] = useState<ArchivedRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [dependencies, setDependencies] = useState<DeletionDependencies | null>(null);
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({
    queryKey: ["archived-records", active],
    queryFn: async () => {
      const { data } = await apiClient.get(listEndpoint[active], { params: { archived: true } });
      return mapRows(active, data);
    },
  });

  const restore = useMutation({
    mutationFn: async (row: ArchivedRow) => {
      await apiClient.post(restoreEndpoint[active](row.id));
      return row;
    },
    onSuccess: (row) => {
      toast.success(`${row.identifier} restored.`);
      queryClient.invalidateQueries({ queryKey: ["archived-records", active] });
      invalidateDashboardData(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to restore this record.")),
  });

  const permanentDelete = useMutation({
    mutationFn: async (row: ArchivedRow) => {
      await apiClient.delete(permanentDeleteEndpoint[active](row.id));
      return row;
    },
    onSuccess: (row) => {
      toast.success(`${row.identifier} permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ["archived-records", active] });
      invalidateDashboardData(queryClient);
      setDeleteTarget(null);
      setConfirmText("");
      setDependencies(null);
    },
    onError: (error) => {
      const blockers = errorDependencies(error);
      if (blockers) setDependencies(blockers);
      toast.error(errorMessage(error, "Unable to permanently delete this record."));
    },
  });

  const inspectDependencies = useMutation({
    mutationFn: async (row: ArchivedRow) => {
      const endpoint = dependencyEndpoint[active];
      if (!endpoint) return { has_dependencies: false, links: [] } satisfies DeletionDependencies;
      const { data } = await apiClient.get<DeletionDependencies>(endpoint(row.id), { timeout: 10000 });
      return data;
    },
    onSuccess: (data) => setDependencies(data),
    onError: (error) => {
      setDependencies({ has_dependencies: false, links: [] });
      toast.error(errorMessage(error, "Unable to load linked records. You can retry or let delete check again."));
    },
  });

  const clearDependencies = useMutation({
    mutationFn: async (row: ArchivedRow) => {
      const endpoint = clearDependencyEndpoint[active];
      const confirmation = clearConfirmation[active];
      if (!endpoint || !confirmation) throw new Error("This record type does not support clearing links.");
      const { data } = await apiClient.post(endpoint(row.id), { confirmation });
      return data as { message?: string };
    },
    onSuccess: (data, row) => {
      toast.success(data.message ?? "Links cleared.");
      setDependencies(null);
      inspectDependencies.mutate(row);
      queryClient.invalidateQueries({ queryKey: ["archived-records", active] });
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to clear linked records.")),
  });

  const deleteLinkedRecord = useMutation({
    mutationFn: async (record: Record<string, unknown>) => {
      const recordType = dependencyRecordType(record);
      const id = record["id"];
      if (!recordType || !id) throw new Error("This linked record cannot be deleted from here.");
      await apiClient.delete(permanentDeleteEndpoint[recordType](id as string | number));
      return record;
    },
    onSuccess: (record) => {
      toast.success(`${dependencyRecordLabel(record)} permanently deleted.`);
      if (deleteTarget) inspectDependencies.mutate(deleteTarget);
      queryClient.invalidateQueries({ queryKey: ["archived-records"] });
      invalidateDashboardData(queryClient);
    },
    onError: (error) => {
      const blockers = errorDependencies(error);
      if (blockers) setDependencies(blockers);
      toast.error(errorMessage(error, "Unable to delete linked record."));
    },
  });

  const rows = useMemo(() => archivedQuery.data ?? [], [archivedQuery.data]);
  const dependencyRecords = useMemo(() => (
    dependencies?.links.flatMap((link) => (
      link.records.map((record) => ({ link, record }))
    )) ?? []
  ), [dependencies]);
  const hasDeleteDependencies = Boolean(dependencies?.links.length);
  const dependencyCheckRequired = Boolean(dependencyEndpoint[active]);
  const dependencyCheckIncomplete = dependencyCheckRequired && dependencies === null;
  const deleteDisabled = confirmText !== "DELETE" || !deleteTarget || permanentDelete.isPending || inspectDependencies.isPending || dependencyCheckIncomplete || hasDeleteDependencies;

  return (
    <>
      <PageHeader
        title="Archived Records"
        description="Super Admin recovery and dependency-protected permanent deletion."
      />

      <Tabs value={active} onValueChange={(value) => setActive(value as ArchiveType)}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {archivedQuery.isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : archivedQuery.isError ? (
              <div className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">
                Unable to load archived {tab.label.toLowerCase()}.{" "}
                <button className="font-medium underline" onClick={() => archivedQuery.refetch()}>
                  Retry
                </button>
              </div>
            ) : (
              <DataTable<ArchivedRow>
                rows={rows}
                rowKey={(row) => `${active}-${row.id}`}
                searchKeys={(row) => `${row.identifier} ${row.name} ${row.archived_by_name ?? ""}`}
                emptyTitle={`No archived ${tab.label.toLowerCase()}`}
                emptyDescription="Archived records for this section will appear here."
                columns={[
                  {
                    key: "identifier",
                    header: "Record",
                    sortValue: (row) => row.identifier,
                    cell: (row) => <span className="font-medium tabular text-primary">{row.identifier}</span>,
                  },
                  { key: "name", header: "Name / Customer", sortValue: (row) => row.name, cell: (row) => row.name },
                  {
                    key: "archived_at",
                    header: "Archived date",
                    sortValue: (row) => row.archived_at ?? "",
                    cell: (row) => row.archived_at ? new Date(row.archived_at).toLocaleString("en-IN") : "-",
                  },
                  {
                    key: "archived_by",
                    header: "Archived by",
                    cell: (row) => row.archived_by_name ?? (row.archived_by ? `User ${row.archived_by}` : "-"),
                  },
                  { key: "status", header: "Status", cell: (row) => <StatusChip status={row.status} /> },
                ]}
                rowActions={(row) => (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={row.detailPath}>
                        <Eye className="size-4" /> Open
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => restore.mutate(row)} disabled={restore.isPending}>
                      <RotateCcw className="size-4" /> Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget(row);
                        setDependencies(null);
                        if (dependencyEndpoint[active]) inspectDependencies.mutate(row);
                      }}
                    >
                      <Trash2 className="size-4" /> Permanently Delete
                    </Button>
                  </div>
                )}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setConfirmText(""); setDependencies(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {deleteTarget?.identifier}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dependencyEndpoint[active] && (
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium">Linked records</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!deleteTarget || inspectDependencies.isPending}
                  onClick={() => deleteTarget && inspectDependencies.mutate(deleteTarget)}
                >
                  Refresh
                </Button>
              </div>
              {inspectDependencies.isPending || dependencies === null ? (
                <p className="text-muted-foreground">Checking linked records...</p>
              ) : dependencyRecords.length ? (
                <div className="space-y-3">
                  <p className="font-medium">
                    {dependencyRecords.length} linked record{dependencyRecords.length === 1 ? "" : "s"}
                  </p>
                  <ul className="max-h-36 divide-y divide-border overflow-auto rounded-md border border-border bg-card text-xs">
                    {dependencyRecords.map(({ link, record }) => (
                      <li key={`${link.label}-${record["id"]}`} className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="min-w-0">
                          <span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {link.label}
                          </span>
                          <span className="text-foreground">
                            {dependencyRecordLabel(record)}
                            {record["status"] ? ` - ${String(record["status"])}` : ""}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {dependencyRecordPath(record) && (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                              <Link to={dependencyRecordPath(record)!}>Open</Link>
                            </Button>
                          )}
                          {dependencyRecordType(record) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-danger hover:text-danger"
                              disabled={deleteLinkedRecord.isPending || inspectDependencies.isPending}
                              onClick={() => deleteLinkedRecord.mutate(record)}
                            >
                              Delete
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
                    {clearDependencyEndpoint[active]
                      ? `Clearing links keeps these business records, but removes their reference to this ${active === "users" ? "user" : "customer"} so the archived record can be permanently deleted.`
                      : "Delete the linked child records shown above, then retry permanent delete."}
                  </div>
                  {clearDependencyEndpoint[active] && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!deleteTarget || clearDependencies.isPending}
                      onClick={() => deleteTarget && clearDependencies.mutate(deleteTarget)}
                    >
                      {clearDependencies.isPending ? "Clearing..." : "Clear linked records"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No linked CRM records found.</p>
              )}
            </div>
          )}
          <Input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteDisabled}
              onClick={() => {
                if (deleteDisabled || !deleteTarget) return;
                permanentDelete.mutate(deleteTarget);
              }}
            >
              Permanently Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
