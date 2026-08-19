import { useState } from "react";
import { UserSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton, CardSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCustomerOrderReport,
  useReportCustomers,
  lastNDays,
  type CakeOrderReportRow,
  type CustomerOrderReportParams,
  type DateRange,
} from "@/features/reports/reports-hooks";

const defaultRange = lastNDays(30);

/** Admin/src/components/Reports/UserWiseReport/UserWiseReport.jsx */
function UserWiseReportsPage() {
  const [dates, setDates] = useState<DateRange>(defaultRange);
  const [customerId, setCustomerId] = useState("");
  const [applied, setApplied] = useState<CustomerOrderReportParams | null>(null);

  const { data: customers, isLoading: customersLoading } = useReportCustomers();
  const { data, isLoading, isFetching, isError, refetch } = useCustomerOrderReport(applied);
  const rows = data ?? [];

  const canSubmit = Boolean(customerId && dates.from_date && dates.to_date);

  const columns: Column<CakeOrderReportRow>[] = [
    { key: "id", header: "ID", sortValue: (r) => r.id, cell: (r) => <span className="font-medium">#{r.id}</span> },
    { key: "customer", header: "Customer", sortValue: (r) => r.customer?.name ?? "", cell: (r) => r.customer?.name || "—" },
    { key: "address", header: "Address", cell: (r) => r.delivery_address?.address || "—" },
    {
      key: "delivery_person",
      header: "Delivery person",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-medium">{r.delivery_person?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{r.delivery_person?.phone || "No phone"}</span>
        </span>
      ),
    },
    {
      key: "order_time",
      header: "Order time",
      sortValue: (r) => r.order_time ?? "",
      cell: (r) => (r.order_time ? new Date(r.order_time).toLocaleString("en-IN") : "—"),
    },
    {
      key: "delivery_time",
      header: "Delivered time",
      sortValue: (r) => r.delivery_time ?? "",
      cell: (r) => (r.delivery_time ? new Date(r.delivery_time).toLocaleString("en-IN") : "—"),
    },
  ];

  return (
    <>
      <PageHeader title="User-wise Report" description="Review existing order history for a selected customer." />

      <SectionCard title="Report filters">
        {customersLoading ? (
          <CardSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,180px))_minmax(0,220px)_auto]">
            <Field label="Start">
              <Input
                type="date"
                value={dates.from_date}
                onChange={(e) => setDates((d) => ({ ...d, from_date: e.target.value }))}
                className="rounded-xl"
              />
            </Field>
            <Field label="End">
              <Input
                type="date"
                value={dates.to_date}
                onChange={(e) => setDates((d) => ({ ...d, to_date: e.target.value }))}
                className="rounded-xl"
              />
            </Field>
            <Field label="Customer">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                className="rounded-xl"
                disabled={!canSubmit}
                onClick={() => setApplied({ customer_id: customerId, ...dates })}
              >
                Get data
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Customer orders" padded={false}>
        {isError ? (
          <div className="p-5">
            <EmptyState
              title="Could not load the customer report"
              description="Something went wrong fetching this data."
              icon={<UserSearch className="size-7" />}
              action={
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : applied === null ? (
          <div className="p-5">
            <EmptyState
              title="No customer orders"
              description="Choose a customer and date range to review their order history."
              icon={<UserSearch className="size-7" />}
            />
          </div>
        ) : isLoading || isFetching ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => String(r.id)}
            searchKeys={(r) => `${r.delivery_address?.address ?? ""} ${r.delivery_person?.name ?? ""}`}
            searchPlaceholder="Search orders…"
            emptyTitle="No customer orders"
            emptyDescription="This customer has no orders in the selected period."
            exportName="user-wise-report"
          />
        )}
      </SectionCard>
    </>
  );
}

export default UserWiseReportsPage;
