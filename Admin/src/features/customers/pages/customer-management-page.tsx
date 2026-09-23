import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, Download, MoreHorizontal, Pencil, Plus, Repeat, Upload, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { inr } from "@/lib/data";
import {
  useArchiveCustomer,
  useCrmCustomers,
  useExportCustomers,
  useImportCustomers,
  type CrmCustomerSummary,
  type CustomerImportResult,
} from "@/features/customers/hooks";
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
import { EditCustomerDialog } from "@/features/customers/components/edit-customer-dialog";
import { CreateCustomerDialog } from "@/features/customers/components/create-customer-dialog";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";

/**
 * Customer Management — "who is this customer, what has happened, what's
 * next", distinct from the Customer Dashboard ("how is the base performing").
 * Same `crm/customers/` list endpoint as the dashboard, just a different lens.
 */
function CustomerManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const access = useCurrentAccess();
  const { data: customers, isLoading, isError, refetch } = useCrmCustomers();
  const [editCustomer, setEditCustomer] = useState<CrmCustomerSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CrmCustomerSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importResult, setImportResult] = useState<CustomerImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importCustomers = useImportCustomers();
  const exportCustomers = useExportCustomers();
  const archiveCustomer = useArchiveCustomer();
  const canArchiveCustomers = hasPermission(access.data, "customers.data.delete");
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const [tableQuery, setTableQuery] = useState(() => searchParams.get("q") ?? "");
  const [tablePage, setTablePage] = useState(() => Number.isFinite(parsedPage) ? Math.max(0, parsedPage - 1) : 0);

  const updateListParams = (updates: { q?: string; page?: number }) => {
    const next = new URLSearchParams(searchParams);
    if (updates.q !== undefined) {
      const value = updates.q.trim();
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
    }
    if (updates.page !== undefined) {
      if (updates.page > 0) next.set("page", String(updates.page + 1));
      else next.delete("page");
    }
    setSearchParams(next, { replace: true });
  };

  const changeTableQuery = (query: string) => {
    setTableQuery(query);
    setTablePage(0);
    updateListParams({ q: query });
  };

  const changeTablePage = (page: number) => {
    setTablePage(page);
    updateListParams({ page });
  };

  const profilePath = (id: string | number) => {
    const next = new URLSearchParams(searchParams);
    const query = tableQuery.trim();
    if (query) next.set("q", query);
    else next.delete("q");
    if (tablePage > 0) next.set("page", String(tablePage + 1));
    else next.delete("page");
    const params = next.toString();
    return `/crm/customers/${id}${params ? `?${params}` : ""}`;
  };

  const runImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await importCustomers.mutateAsync(file);
      setImportResult(result);
      toast.success("Import completed", {
        description: `Created ${result.created}, updated ${result.updated}, failed ${result.failed}.`,
      });
      await refetch();
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const errors = Array.isArray(response?.["errors"]) ? response["errors"] as CustomerImportResult["errors"] : [];
      setImportResult({
        created: 0,
        updated: 0,
        skipped: 0,
        failed: errors.length,
        errors,
        unknown_columns: Array.isArray(response?.["unknown_columns"]) ? response["unknown_columns"] as string[] : undefined,
      });
      toast.error(response?.["message"] ? String(response["message"]) : "Unable to import customers.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runExport = async (rows: CrmCustomerSummary[]) => {
    try {
      const blob = await exportCustomers.mutateAsync(rows.map((row) => row.id));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "customers.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Customer export downloaded");
    } catch {
      toast.error("Unable to export customers.");
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveCustomer.mutateAsync(archiveTarget.id);
      toast.success("Customer archived");
      setArchiveTarget(null);
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      toast.error(data?.message || data?.detail || "Unable to archive customer.");
    }
  };

  return (
    <>
      <PageHeader
        title="Customer Management"
        actions={
          <>
            {hasPermission(access.data, "customers.data.view") && (
              <>
                {access.data?.is_super_admin && (
                  <Button variant="outline" asChild>
                    <Link to="/archived-records"><Archive className="size-4" /> Archived</Link>
                  </Button>
                )}
                <Button variant="outline" onClick={() => runExport(customers ?? [])} disabled={exportCustomers.isPending}>
                  <Download className="size-4" /> Export
                </Button>
              </>
            )}
            {hasPermission(access.data, "customers.data.create") && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => runImport(event.target.files?.[0])}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importCustomers.isPending}>
                  <Upload className="size-4" /> Import
                </Button>
                <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New customer</Button>
              </>
            )}
          </>
        }
        description="Search any customer, see what's happened, and open a profile for the full picture."
      />

      {importResult && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm shadow-soft">
          <div className="flex flex-wrap gap-3">
            <span>Created: <strong>{importResult.created}</strong></span>
            <span>Updated: <strong>{importResult.updated}</strong></span>
            <span>Skipped: <strong>{importResult.skipped}</strong></span>
            <span>Failed: <strong>{importResult.failed}</strong></span>
          </div>
          {importResult.unknown_columns?.length ? (
            <p className="mt-2 text-danger">Unknown columns: {importResult.unknown_columns.join(", ")}</p>
          ) : null}
          {importResult.errors.length ? (
            <ul className="mt-2 space-y-1 text-danger">
              {importResult.errors.slice(0, 8).map((error) => (
                <li key={`${error.row}-${error.reason}`}>Row {error.row} - {error.reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {isError ? (
        <EmptyState
          title="Couldn't load customers"
          description="Check your connection and try again."
          action={
            <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">
              Retry
            </button>
          }
        />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <DataTable<CrmCustomerSummary>
          rows={customers ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => {
            const primaryAddress = r.addresses.find((item) => item.is_primary) ?? r.addresses[0];
            return [
              r.name,
              r.username,
              r.first_name,
              r.last_name,
              r.phone,
              r.email,
              primaryAddress?.address,
              primaryAddress?.city,
              primaryAddress?.pincode,
            ].filter(Boolean).join(" ");
          }}
          query={tableQuery}
          onQueryChange={changeTableQuery}
          page={tablePage}
          onPageChange={changeTablePage}
          onRowClick={(r) => navigate(profilePath(r.id))}
          emptyTitle="No customers yet"
          emptyDescription="Customers appear here once linked to a lead, quotation or order."
          exportName="customers"
          onExport={runExport}
          columns={[
            {
              key: "name",
              header: "Customer",
              sortValue: (r) => r.name,
              cell: (r) => (
                <span className="min-w-0">
                  <span className="block font-medium">{r.name || r.username}</span>
                  <span className="block text-xs text-muted-foreground tabular">{r.phone}</span>
                </span>
              ),
            },
            {
              key: "email",
              header: "Email",
              cell: (r) => <span className="text-muted-foreground">{r.email || "—"}</span>,
            },
            {
              key: "address",
              header: "Primary address",
              sortValue: (r) => {
                const address = r.addresses.find((item) => item.is_primary) ?? r.addresses[0];
                return address ? [address.address, address.city, address.pincode].filter(Boolean).join(", ") : "";
              },
              cell: (r) => {
                const address = r.addresses.find((item) => item.is_primary) ?? r.addresses[0];
                return <span className="block max-w-72 whitespace-normal text-sm leading-5 text-muted-foreground">{address ? [address.address, address.city, address.pincode].filter(Boolean).join(", ") : "—"}</span>;
              },
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusChip status={r.is_active ? "Active" : "Inactive"} />,
            },
            {
              key: "since",
              header: "Customer since",
              sortValue: (r) => r.date_joined,
              cell: (r) => (
                <span className="text-muted-foreground tabular">
                  {r.date_joined ? new Date(r.date_joined).toLocaleDateString("en-IN") : "—"}
                </span>
              ),
            },
            {
              key: "orders",
              header: "Orders",
              align: "right",
              sortValue: (r) => r.valid_order_count,
              cell: (r) => <span className="tabular">{r.valid_order_count}</span>,
            },
            {
              key: "revenue",
              header: "Revenue",
              align: "right",
              sortValue: (r) => Number(r.total_revenue) || 0,
              cell: (r) => <span className="font-medium tabular">{inr(Number(r.total_revenue))}</span>,
            },
            {
              key: "last_order",
              header: "Last order",
              sortValue: (r) => r.last_order_date ?? "",
              cell: (r) => (
                <span className="text-muted-foreground tabular">
                  {r.last_order_date ? new Date(r.last_order_date).toLocaleDateString("en-IN") : "—"}
                </span>
              ),
            },
            {
              key: "returning",
              header: "Returning",
              cell: (r) =>
                r.is_returning_customer ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Repeat className="size-3.5" /> Returning
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">First order</span>
                ),
            },
          ]}
          rowActions={(customer) => <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Open ${customer.name}`} onClick={(event) => { event.stopPropagation(); navigate(profilePath(customer.id)); }}><UserRoundSearch className="size-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${customer.name}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(profilePath(customer.id))}>
                  <UserRoundSearch className="size-4" /> Open profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditCustomer(customer)}>
                  <Pencil className="size-4" /> Edit customer
                </DropdownMenuItem>
                {canArchiveCustomers && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-danger" onClick={() => setArchiveTarget(customer)}>
                      <Archive className="size-4" /> Archive customer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>}
        />
      )}
      {editCustomer && <EditCustomerDialog open customer={editCustomer} onOpenChange={(open) => !open && setEditCustomer(null)} />}
      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(profilePath(id))} />
      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiveTarget?.name || archiveTarget?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be hidden from active Customer Management and can be restored from Archived Records by Super Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={archiveCustomer.isPending} onClick={confirmArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CustomerManagementPage;
