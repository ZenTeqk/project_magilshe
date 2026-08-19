import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOrderReport, lastNDays, type CakeOrderReportRow, type DateRange } from "@/features/reports/reports-hooks";

const defaultRange = lastNDays(30);

/** Admin/src/components/Reports/OrderReport/OrderReport.jsx */
function OrderReportsPage() {
  const [dates, setDates] = useState<DateRange>(defaultRange);
  const [applied, setApplied] = useState<DateRange>(defaultRange);

  const { data, isLoading, isFetching, isError, refetch } = useOrderReport(applied);
  const rows = data ?? [];

  const columns: Column<CakeOrderReportRow>[] = [
    { key: "id", header: "ID", sortValue: (r) => r.id, cell: (r) => <span className="font-medium">#{r.id}</span> },
    { key: "customer", header: "Customer", sortValue: (r) => r.customer?.name ?? "", cell: (r) => r.customer?.name || "—" },
    { key: "address", header: "Address", cell: (r) => r.delivery_address?.address || "—" },
    {
      key: "delivery_person",
      header: "Delivery person",
      cell: (r) => (
        <span className="flex flex-col">
          <span>{r.delivery_person?.name || "—"}</span>
          {r.delivery_person?.phone && (
            <span className="text-xs text-muted-foreground">{r.delivery_person.phone}</span>
          )}
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
      <PageHeader title="Order Report" description="Review existing online order fulfilment records." />

      <SectionCard title="Report filters">
        <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,220px))_auto]">
          <Field label="Start date">
            <Input
              type="date"
              value={dates.from_date}
              onChange={(e) => setDates((d) => ({ ...d, from_date: e.target.value }))}
              className="rounded-xl"
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={dates.to_date}
              onChange={(e) => setDates((d) => ({ ...d, to_date: e.target.value }))}
              className="rounded-xl"
            />
          </Field>
          <div className="flex items-end">
            <Button className="rounded-xl" onClick={() => setApplied(dates)} disabled={!dates.from_date || !dates.to_date}>
              Get data
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Orders"
        description={`${applied.from_date} to ${applied.to_date}`}
        padded={false}
      >
        {isError ? (
          <div className="p-5">
            <EmptyState
              title="Could not load the order report"
              description="Something went wrong fetching this data."
              icon={<PackageSearch className="size-7" />}
              action={
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : isLoading || isFetching ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => String(r.id)}
            searchKeys={(r) => `${r.customer?.name ?? ""} ${r.delivery_address?.address ?? ""} ${r.delivery_person?.name ?? ""}`}
            searchPlaceholder="Search orders…"
            emptyTitle="No orders found"
            emptyDescription="No online orders were fulfilled in the selected period."
            exportName="order-report"
          />
        )}
      </SectionCard>
    </>
  );
}

export default OrderReportsPage;
