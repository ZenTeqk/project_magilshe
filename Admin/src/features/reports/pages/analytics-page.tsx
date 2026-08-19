import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Printer, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusChip } from "@/components/shared/status-chip";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { useCrmAnalytics, type CrmAnalyticsResponse } from "@/features/dashboard/hooks";
import { lastNDays, type DateRange } from "@/features/reports/reports-hooks";
import {
  buildAnalyticsExportRows,
  buildAnalyticsPdf,
  exportAnalyticsCsv,
} from "@/features/reports/lib/analytics-export";

const tabs = [
  "Overview",
  "Customers",
  "Sales",
  "Products",
  "Leads",
  "Quotations",
  "Orders",
  "Invoices",
  "Delivery",
  "Timeline",
] as const;
type Tab = (typeof tabs)[number];

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {inr(p.value)}
        </p>
      ))}
    </div>
  );
}

function Bars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  if (!rows.length) return <EmptyState title="No data in this period" />;
  const max = Math.max(1, ...rows.map((r) => Number(r.value || 0)));
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{row.label || "Unspecified"}</span>
            <span className="tabular text-muted-foreground">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full gradient-brand"
              style={{ width: `${Math.max(4, (Number(row.value || 0) * 100) / max)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function statusRows(overview: CrmAnalyticsResponse["overview"] | undefined, group: string) {
  return Object.entries(overview?.[group] ?? {}).map(([label, value]) => ({ label, value }));
}

/** Admin/src/components/Reports/Analytics/ReportsAnalytics.jsx */
function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [dates, setDates] = useState<DateRange>(lastNDays(30));
  const [applied, setApplied] = useState<DateRange>(lastNDays(30));

  const { data, isLoading, isFetching, isError, refetch } = useCrmAnalytics(applied);

  const overview = data?.overview;
  const totals = data?.totals;
  const revenue = data?.revenue;
  const funnel = data?.funnel ?? [];

  const revenueTrend = useMemo(
    () => (revenue?.trend ?? []).map((row) => ({ day: row.day, value: Number(row.value) })),
    [revenue],
  );
  const leadSourceData = useMemo(
    () => (data?.lead_sources ?? []).filter((s) => s.value > 0).slice(0, 8),
    [data],
  );

  /** Rows behind the tab currently on screen, scoped to the applied date range — see analytics-export.ts. */
  const exportRows = useMemo(
    () => buildAnalyticsExportRows(tab, data, funnel, revenue),
    [tab, data, funnel, revenue],
  );
  const handleExportCsv = () => exportAnalyticsCsv(exportRows, `crm-${tab.toLowerCase()}-report.csv`);
  const handleExportPdf = () =>
    buildAnalyticsPdf(tab, applied, exportRows).save(`crm-${tab.toLowerCase()}-report.pdf`);

  const customerColumns: Column<CrmAnalyticsResponse["customers"][number]>[] = [
    { key: "customer", header: "Customer", cell: (r) => <strong>{r.customer_name}</strong> },
    { key: "phone", header: "Phone", cell: (r) => r.phone },
    { key: "total_orders", header: "Orders", sortValue: (r) => r.total_orders, cell: (r) => r.total_orders },
    {
      key: "total_spend",
      header: "Total spend",
      align: "right",
      sortValue: (r) => r.total_spend,
      cell: (r) => inr(r.total_spend),
    },
    {
      key: "last_order",
      header: "Last order",
      cell: (r) => (r.last_order ? new Date(r.last_order).toLocaleDateString("en-IN") : "—"),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      cell: (r) => (
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link to={`/crm/customers?search=${encodeURIComponent(r.phone)}`}>View customer</Link>
        </Button>
      ),
    },
  ];

  const productColumns: Column<CrmAnalyticsResponse["products"][number]>[] = [
    { key: "item_name", header: "Cake / Product", cell: (r) => String(r["item_name"] ?? "—") },
    { key: "flavour", header: "Flavour", cell: (r) => String(r["flavour"] ?? "—") },
    { key: "weight", header: "Weight", cell: (r) => String(r["weight"] ?? "—") },
    { key: "orders", header: "Orders", cell: (r) => String(r["orders"] ?? 0) },
    { key: "quantity", header: "Quantity", cell: (r) => String(r["quantity"] ?? 0) },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      cell: (r) => inr(Number(r["revenue"] ?? 0)),
    },
  ];

  const timelineColumns: Column<CrmAnalyticsResponse["timeline"][number]>[] = [
    {
      key: "created_on",
      header: "Date & time",
      sortValue: (r) => r.created_on,
      cell: (r) => new Date(r.created_on).toLocaleString("en-IN"),
    },
    { key: "module", header: "Module", cell: (r) => <StatusChip status={r.module} tone="info" /> },
    { key: "action", header: "Activity", cell: (r) => r.action },
    { key: "reference", header: "Reference", cell: (r) => r.reference },
    { key: "customer", header: "Customer", cell: (r) => r.customer },
    { key: "staff", header: "Staff", cell: (r) => r.staff || "—" },
  ];

  const loading = isLoading || isFetching;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Read-only business intelligence from the connected bakery CRM."
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExportCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExportPdf}>
              <FileText className="size-4" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
          </>
        }
        className="print:hidden"
      />

      <SectionCard title="Report filters" className="print:hidden">
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

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4" /> Analytics could not be loaded.
          </span>
          <Button size="sm" variant="outline" className="rounded-lg border-danger/40" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      <nav className="scroll-slim flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-card p-1.5 print:hidden">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === name ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total leads" value={String(totals?.leads ?? 0)} to="/crm/leads" />
            <StatCard label="Quotations" value={String(totals?.quotations ?? 0)} to="/crm/quotations" />
            <StatCard label="Orders" value={String(totals?.orders ?? 0)} to="/crm/orders" />
            <StatCard label="Invoices" value={String(totals?.invoices ?? 0)} to="/crm/invoices" />
            <StatCard label="Deliveries" value={String(totals?.deliveries ?? 0)} to="/crm/delivery" />
            <StatCard accent label="Collected" value={inr(revenue?.collected ?? 0)} />
          </>
        )}
      </div>

      {tab === "Overview" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard className="lg:col-span-1" title="Revenue overview">
              {loading ? (
                <CardSkeleton />
              ) : (
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Collected</dt><dd className="tabular font-medium">{inr(revenue?.collected ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Outstanding</dt><dd className="tabular font-medium">{inr(revenue?.outstanding ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Advance collected</dt><dd className="tabular font-medium">{inr(revenue?.advance_collected ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Balance collected</dt><dd className="tabular font-medium">{inr(revenue?.balance_collected ?? 0)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Average order</dt><dd className="tabular font-medium">{inr(revenue?.average_order ?? 0)}</dd></div>
                </dl>
              )}
            </SectionCard>
            <SectionCard
              className="lg:col-span-2"
              title="Conversion funnel"
              description="Stage conversion is calculated within the selected document-creation period."
            >
              {loading ? (
                <CardSkeleton />
              ) : funnel.length === 0 ? (
                <EmptyState title="No funnel data in this period" />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {funnel.map((stage, i) => (
                    <div key={stage.key} className="flex items-center gap-2">
                      <div className="rounded-xl border border-border px-3 py-2 text-center">
                        <p className="text-xs text-muted-foreground">{stage.label}</p>
                        <p className="stat-value text-lg font-semibold">{stage.value}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {stage.conversion}% · {stage.drop_off} drop-off
                        </p>
                      </div>
                      {i < funnel.length - 1 && <span className="text-muted-foreground">→</span>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Lead status">
              {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "leads")} />}
            </SectionCard>
            <SectionCard title="Revenue trend">
              {loading ? (
                <CardSkeleton />
              ) : revenueTrend.length === 0 ? (
                <EmptyState title="No payments in this period" description="Recorded CRM payments will appear here." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ left: -12, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="analyticsRevFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="value" name="Revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#analyticsRevFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {tab === "Customers" && (
        <SectionCard title="Customer analytics" description="Customers ranked by confirmed CRM order value in the selected period." padded={false}>
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <DataTable
              rows={data?.customers ?? []}
              columns={customerColumns}
              rowKey={(r) => r.phone}
              searchKeys={(r) => `${r.customer_name} ${r.phone}`}
              emptyTitle="No customer orders in this period"
              exportName="crm-customers"
            />
          )}
        </SectionCard>
      )}

      {tab === "Products" && (
        <SectionCard title="Product analytics" description="Existing confirmed order items grouped by product, flavour and weight." padded={false}>
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <DataTable
              rows={data?.products ?? []}
              columns={productColumns}
              rowKey={(r) => `${r["item_name"]}-${r["flavour"]}-${r["weight"]}`}
              searchKeys={(r) => `${r["item_name"] ?? ""} ${r["flavour"] ?? ""}`}
              emptyTitle="No product sales in this period"
              exportName="crm-products"
            />
          )}
        </SectionCard>
      )}

      {tab === "Timeline" && (
        <SectionCard title="CRM activity timeline" description="Read-only Lead and connected commercial activity." padded={false}>
          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <DataTable
              rows={data?.timeline ?? []}
              columns={timelineColumns}
              rowKey={(r) => String(r.id)}
              searchKeys={(r) => `${r.action} ${r.customer} ${r.reference}`}
              emptyTitle="No CRM activity in this period"
              exportName="crm-timeline"
            />
          )}
        </SectionCard>
      )}

      {tab === "Sales" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Revenue trend">
            {loading ? <CardSkeleton /> : <Bars rows={revenueTrend.map((r) => ({ label: r.day, value: r.value }))} />}
          </SectionCard>
          <SectionCard title="Sales indicators">
            {loading ? (
              <CardSkeleton />
            ) : (
              <Bars
                rows={[
                  { label: "Orders", value: totals?.orders ?? 0 },
                  { label: "Invoices", value: totals?.invoices ?? 0 },
                  { label: "Collected revenue", value: Number(revenue?.collected ?? 0) },
                ]}
              />
            )}
          </SectionCard>
        </div>
      )}

      {tab === "Leads" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Leads by status">
            {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "leads")} />}
          </SectionCard>
          <SectionCard title="Lead sources">
            {loading ? (
              <CardSkeleton />
            ) : leadSourceData.length === 0 ? (
              <EmptyState title="No lead-source data yet" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadSourceData} layout="vertical" margin={{ left: 8, right: 12, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="lead_source" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }} />
                    <Bar dataKey="value" name="Leads" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
          <SectionCard className="lg:col-span-2" title="Popular occasions">
            {loading ? (
              <CardSkeleton />
            ) : (
              <Bars rows={(data?.occasions ?? []).map((o) => ({ label: o.occasion, value: o.value }))} />
            )}
          </SectionCard>
        </div>
      )}

      {tab === "Quotations" && (
        <SectionCard title="Quotation analytics">
          {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "quotations")} />}
        </SectionCard>
      )}

      {tab === "Orders" && (
        <SectionCard title="Order analytics">
          {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "orders")} />}
        </SectionCard>
      )}

      {tab === "Invoices" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Invoice analytics">
            {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "invoices")} />}
          </SectionCard>
          <SectionCard title="Settlement">
            {loading ? (
              <CardSkeleton />
            ) : (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Outstanding amount</dt><dd className="tabular font-medium">{inr(revenue?.outstanding ?? 0)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Collected</dt><dd className="tabular font-medium">{inr(revenue?.collected ?? 0)}</dd></div>
              </dl>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "Delivery" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Delivery analytics">
            {loading ? <CardSkeleton /> : <Bars rows={statusRows(overview, "deliveries")} />}
          </SectionCard>
          <SectionCard title="Delivery types">
            {loading ? (
              <CardSkeleton />
            ) : (
              <Bars rows={(data?.delivery_methods ?? []).map((d) => ({ label: d.delivery_type, value: d.value }))} />
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}

export default AnalyticsPage;
