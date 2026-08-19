import { useState } from "react";
import { CalendarHeart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOccasionReport, lastNDays, type OccasionReportRow, type DateRange } from "@/features/reports/reports-hooks";

const defaultRange = lastNDays(30);

/** Admin/src/components/Reports/OccasionReport/OccasionReport.jsx */
function OccasionReportsPage() {
  const [dates, setDates] = useState<DateRange>(defaultRange);
  const [applied, setApplied] = useState<DateRange>(defaultRange);

  const { data, isLoading, isFetching, isError, refetch } = useOccasionReport(applied);
  const rows = data ?? [];

  const columns: Column<OccasionReportRow>[] = [
    { key: "id", header: "ID", sortValue: (r) => r.id, cell: (r) => <span className="font-medium">#{r.id}</span> },
    { key: "type", header: "Type", sortValue: (r) => r.type ?? "", cell: (r) => r.type || "—" },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => r.date ?? "",
      cell: (r) => (r.date ? new Date(r.date).toLocaleDateString("en-IN") : "—"),
    },
    { key: "name", header: "Name", sortValue: (r) => r.person_name ?? "", cell: (r) => r.person_name || "—" },
  ];

  return (
    <>
      <PageHeader title="Occasion Report" description="Review recorded customer occasions for a selected period." />

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
        title="Occasions"
        description="Matched by month and day across every year on record."
        padded={false}
      >
        {isError ? (
          <div className="p-5">
            <EmptyState
              title="Could not load the occasion report"
              description="Something went wrong fetching this data."
              icon={<CalendarHeart className="size-7" />}
              action={
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : isLoading || isFetching ? (
          <TableSkeleton rows={6} cols={4} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => String(r.id)}
            searchKeys={(r) => `${r.type ?? ""} ${r.person_name ?? ""}`}
            searchPlaceholder="Search occasions…"
            emptyTitle="No occasions found"
            emptyDescription="No customer occasions were recorded in the selected period."
            exportName="occasion-report"
          />
        )}
      </SectionCard>
    </>
  );
}

export default OccasionReportsPage;
