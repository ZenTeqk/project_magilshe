import { useState } from "react";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton, CardSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeliveryPersons } from "@/features/crm/deliveries-hooks";
import {
  useDeliveryPersonReport,
  lastNDays,
  type CakeOrderReportRow,
  type DateRange,
  type DeliveryPersonReportParams,
} from "@/features/reports/reports-hooks";

const defaultRange = lastNDays(30);

/** Admin/src/components/Reports/DeliveryPersonReport/DeliveryPersonReport.jsx */
function DeliveryPersonReportsPage() {
  const [dates, setDates] = useState<DateRange>(defaultRange);
  const [personId, setPersonId] = useState("");
  const [applied, setApplied] = useState<DeliveryPersonReportParams | null>(null);

  const { data: people, isLoading: peopleLoading } = useDeliveryPersons();
  const { data, isLoading, isFetching, isError, refetch } = useDeliveryPersonReport(applied);
  const rows = data ?? [];

  const canSubmit = Boolean(personId && dates.from_date && dates.to_date);

  const columns: Column<CakeOrderReportRow>[] = [
    { key: "id", header: "ID", sortValue: (r) => r.id, cell: (r) => <span className="font-medium">#{r.id}</span> },
    { key: "address", header: "Delivery address", cell: (r) => r.delivery_address?.address || "—" },
    {
      key: "delivery_time",
      header: "Delivered date",
      sortValue: (r) => r.delivery_time ?? "",
      cell: (r) => (r.delivery_time ? new Date(r.delivery_time).toLocaleString("en-IN") : "—"),
    },
    {
      key: "delivered_by",
      header: "Delivered by",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-medium">{r.delivery_person?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">{r.delivery_person?.phone || "No phone"}</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Delivery Person Report"
        description="Review existing deliveries assigned to a selected delivery person."
      />

      <SectionCard title="Report filters">
        {peopleLoading ? (
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
            <Field label="Delivery person">
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select delivery person" />
                </SelectTrigger>
                <SelectContent>
                  {(people ?? []).map((person) => (
                    <SelectItem key={person.id} value={String(person.id)}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                className="rounded-xl"
                disabled={!canSubmit}
                onClick={() => setApplied({ dp_id: personId, ...dates })}
              >
                Get data
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Delivery records" padded={false}>
        {isError ? (
          <div className="p-5">
            <EmptyState
              title="Could not load the delivery report"
              description="Something went wrong fetching this data."
              icon={<Truck className="size-7" />}
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
              title="No delivery records"
              description="Choose a delivery person and date range to review completed assignments."
              icon={<Truck className="size-7" />}
            />
          </div>
        ) : isLoading || isFetching ? (
          <TableSkeleton rows={6} cols={4} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => String(r.id)}
            searchKeys={(r) => `${r.delivery_address?.address ?? ""} ${r.delivery_person?.name ?? ""}`}
            searchPlaceholder="Search deliveries…"
            emptyTitle="No delivery records"
            emptyDescription="No deliveries were recorded for this person in the selected period."
            exportName="delivery-person-report"
          />
        )}
      </SectionCard>
    </>
  );
}

export default DeliveryPersonReportsPage;
