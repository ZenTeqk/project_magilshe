import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Repeat, UserRoundSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { inr } from "@/lib/data";
import { useCrmCustomers, type CrmCustomerSummary } from "@/features/customers/hooks";
import { Button } from "@/components/ui/button";
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
  const access = useCurrentAccess();
  const { data: customers, isLoading, isError, refetch } = useCrmCustomers();
  const [editCustomer, setEditCustomer] = useState<CrmCustomerSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Customer Management"
        actions={hasPermission(access.data, "customers.data.create") ? <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New customer</Button> : undefined}
        description="Search any customer, see what's happened, and act — open a profile for the full picture."
      />

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
          searchKeys={(r) => `${r.name} ${r.phone} ${r.email}`}
          onRowClick={(r) => navigate(`/crm/customers/${r.id}`)}
          emptyTitle="No customers yet"
          emptyDescription="Customers appear here once linked to a lead, quotation or order."
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
          rowActions={(customer) => <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit ${customer.name}`} onClick={(event) => { event.stopPropagation(); setEditCustomer(customer); }}><Pencil className="size-4" /></Button>
            <UserRoundSearch className="size-4 text-muted-foreground" />
          </div>}
        />
      )}
      {editCustomer && <EditCustomerDialog open customer={editCustomer} onOpenChange={(open) => !open && setEditCustomer(null)} />}
      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/crm/customers/${id}`)} />
    </>
  );
}

export default CustomerManagementPage;
