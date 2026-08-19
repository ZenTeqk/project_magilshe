import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLegacyCustomers, type LegacyCustomer } from "@/features/operations/operations-hooks";

function LegacyCustomersPage() {
  const { data: customers, isLoading } = useLegacyCustomers();
  const [selected, setSelected] = useState<LegacyCustomer | null>(null);

  return (
    <>
      <PageHeader
        title="Customers (Legacy)"
        description="Read-only authentication customer records retained for backward compatibility. For unified CRM history, use the standalone Customers workspace."
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<LegacyCustomer>
          rows={customers ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.email} ${r.phone}`}
          searchPlaceholder="Search customers"
          emptyTitle="No customer records"
          onRowClick={setSelected}
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "name", header: "Customer", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name || "—"}</span> },
            { key: "status", header: "Status", cell: (r) => <StatusChip status={r.is_active ? "Active" : "Inactive"} /> },
            { key: "email", header: "Email", cell: (r) => <span className="text-muted-foreground">{r.email || "—"}</span> },
            { key: "phone", header: "Mobile", cell: (r) => <span className="tabular">{r.phone || "—"}</span> },
          ]}
        />
      )}

      <Sheet open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>Customer record</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{selected.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p>{selected.email || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p><p>{selected.phone || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusChip status={selected.is_active ? "Active" : "Inactive"} /></div>
              {selected.address_details?.length ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Addresses</p>
                  <ul className="space-y-2">
                    {selected.address_details.map((addr) => (
                      <li key={addr.id} className="rounded-xl border border-border p-3">
                        <p className="font-medium">{addr.title}{addr.is_primary ? " (primary)" : ""}</p>
                        <p className="text-muted-foreground">{addr.address}, {addr.city} {addr.pincode}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
          <SheetFooter className="border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default LegacyCustomersPage;
