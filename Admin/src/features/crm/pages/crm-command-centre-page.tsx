import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  FileText,
  Gift,
  Send,
  Target,
  TrendingUp,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Surface, SurfaceHeading as Heading } from "@/components/shared/command-surface";
import { DateRangeToolbar } from "@/components/shared/date-range-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { lastNDays } from "@/features/reports/reports-hooks";
import { useCrmAnalytics } from "@/features/dashboard/hooks";
import { useCrmDashboard, useFollowUps, useLeads } from "@/features/crm/hooks";
import { useOrders } from "@/features/crm/orders-hooks";
import { useAttentionCenter } from "@/features/attention/use-attention-center";
import { useSendCustomerReminder, useUpcomingCustomerEvents } from "@/features/customers/hooks";

const stageColors = [
  "var(--accent)",
  "var(--primary)",
  "var(--info)",
  "var(--warning)",
  "var(--chart-5)",
  "var(--success)",
];
const statusColors: Record<string, string> = {
  Open: "var(--accent)",
  "Follow-up": "var(--primary)",
  Won: "var(--success)",
  Lost: "var(--danger)",
};
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-";
const OPEN_ORDER_STATUSES = new Set(["Delivered", "Completed", "Closed", "Cancelled"]);

function orderUrgency(dueDate: string) {
  const due = new Date(dueDate);
  const dueDay = due.toDateString();
  const today = new Date();
  const todayDay = today.toDateString();
  const tomorrowDay = new Date(today.getTime() + 86400000).toDateString();
  if (due < today && dueDay !== todayDay) return { label: "Overdue", tone: "danger" as const };
  if (dueDay === todayDay) return { label: "Today", tone: "danger" as const };
  if (dueDay === tomorrowDay) return { label: "Tomorrow", tone: "warning" as const };
  return {
    label: due.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    tone: "info" as const,
  };
}

export default function CrmCommandCentrePage() {
  const [range, setRange] = useState(lastNDays(0));
  const crm = useCrmDashboard(range);
  const followUps = useFollowUps(range);
  const leads = useLeads(range);
  const analytics = useCrmAnalytics(range);
  const attention = useAttentionCenter();
  const events = useUpcomingCustomerEvents(30);
  const sendReminder = useSendCustomerReminder();
  const orders = useOrders();
  const upcomingOrders = useMemo(
    () =>
      (orders.data ?? [])
        .filter((order) => !OPEN_ORDER_STATUSES.has(order.status))
        .map((order) => ({ ...order, dueDate: order.delivery_date || order.event_date }))
        .filter((order) => order.dueDate)
        .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
        .slice(0, 6),
    [orders.data],
  );
  const stages = crm.data
    ? [
        { label: "Leads", value: crm.data.funnel.total_leads },
        { label: "Quotation", value: crm.data.funnel.moved_to_quotation },
        { label: "Order", value: crm.data.funnel.moved_to_order },
        { label: "Invoice", value: crm.data.funnel.moved_to_invoice },
        { label: "Delivery", value: crm.data.funnel.moved_to_delivery },
        { label: "Complete", value: crm.data.funnel.completed },
      ]
    : [];
  const maxStage = Math.max(1, ...stages.map((stage) => stage.value));
  const completion = crm.data?.funnel.total_leads
    ? Math.round((crm.data.funnel.completed / crm.data.funnel.total_leads) * 100)
    : 0;
  const leadStatuses = ["Open", "Follow-up", "Won", "Lost"]
    .map((status) => ({ status, value: crm.data?.leads[status] ?? 0 }))
    .filter((item) => item.value > 0);
  const leadSources = (analytics.data?.lead_sources ?? [])
    .filter((source) => source.value > 0)
    .slice(0, 6);
  const latestLeads = useMemo(
    () =>
      [...(leads.data ?? [])].sort((a, b) => b.created_on.localeCompare(a.created_on)).slice(0, 5),
    [leads.data],
  );
  const upcoming = (followUps.data?.results ?? []).filter(
    (row) => (row.follow_up_date ?? "") > new Date().toISOString().slice(0, 10),
  ).length;
  const followBreakdown = [
    { label: "Overdue", value: followUps.data?.summary.overdue ?? 0, color: "var(--danger)" },
    { label: "Today", value: followUps.data?.summary.today ?? 0, color: "var(--warning)" },
    { label: "Upcoming", value: upcoming, color: "var(--info)" },
    {
      label: "Completed",
      value: followUps.data?.summary.completed_today ?? 0,
      color: "var(--success)",
    },
  ];

  return (
    <>
      <PageHeader
        title="CRM command centre"
        description="Pipeline velocity, follow-up pressure and the next workflow actions."
        actions={
          <>
            <DateRangeToolbar
              value={range}
              onChange={setRange}
              onRefresh={() => void Promise.all([analytics.refetch(), crm.refetch(), followUps.refetch(), leads.refetch()])}
              isFetching={analytics.isFetching || crm.isFetching || followUps.isFetching || leads.isFetching}
            />
            <Button variant="outline" asChild>
              <Link to="/crm/leads">Open leads</Link>
            </Button>
          </>
        }
      />
      <Surface className="relative">
        <span className="absolute inset-x-0 top-0 h-1 bg-danger" />
        <Heading
          eyebrow="Priority queue"
          title="Upcoming orders"
          detail={`${upcomingOrders.length} orders due for delivery`}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/crm/orders">
                All orders <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        />
        {orders.isLoading ? (
          <div className="p-4">
            <CardSkeleton />
          </div>
        ) : upcomingOrders.length === 0 ? (
          <EmptyState title="No upcoming orders" description="Nothing due for delivery soon." />
        ) : (
          <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
            {upcomingOrders.map((order) => {
              const urgency = orderUrgency(order.dueDate!);
              return (
                <Link
                  key={String(order.id)}
                  to={`/crm/orders/${order.id}`}
                  className={`flex flex-col gap-2 bg-card p-4 transition-colors hover:bg-surface-muted ${
                    urgency.tone === "danger" ? "bg-danger-soft/30" : ""
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                        urgency.tone === "danger"
                          ? "bg-danger-soft text-danger"
                          : urgency.tone === "warning"
                            ? "bg-warning-soft text-warning"
                            : "bg-info-soft text-info"
                      }`}
                    >
                      <CalendarClock className="size-3" /> {urgency.label}
                    </span>
                    <StatusChip status={order.status} className="px-1.5 py-0.5 text-[9px]" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{order.customer_name}</strong>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.order_no} · {order.cake_type}
                      {order.flavour ? ` · ${order.flavour}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center justify-between text-xs">
                    <span className="tabular font-semibold">{inr(Number(order.total_amount))}</span>
                    {Number(order.balance_amount) > 0 && (
                      <span className="tabular text-warning">Due {inr(Number(order.balance_amount))}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Surface>

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <Surface className="self-start xl:col-span-8">
          <Heading
            eyebrow="Pipeline intelligence"
            title="Commercial progression"
            detail="Lead to completed delivery"
            action={
              <div className="text-right">
                <strong className="text-2xl tabular text-accent">{completion}%</strong>
                <span className="block text-[10px] text-muted-foreground">end-to-end</span>
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4 sm:grid-cols-3 xl:grid-cols-6">
            {crm.isLoading ? (
              <CardSkeleton />
            ) : stages.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No pipeline activity yet"
                  description="Lead progression will appear here as records move through CRM."
                />
              </div>
            ) : (
              stages.map((stage, index) => (
                <Link
                  key={stage.label}
                  to={
                    index === 0
                      ? "/crm/leads"
                      : index === 1
                        ? "/crm/quotations"
                        : index === 2
                          ? "/crm/orders"
                          : index === 3
                            ? "/crm/invoices"
                            : "/crm/delivery"
                  }
                  className="relative flex min-h-36 flex-col justify-between overflow-hidden rounded-lg bg-surface-muted/55 p-3 transition-colors hover:bg-accent-soft"
                >
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: stageColors[index] }} />
                  <div>
                    <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                      {stage.label}
                    </span>
                    <strong className="mt-3 block text-3xl tabular">{stage.value}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">
                      {index
                        ? `${stages[index - 1]!.value ? Math.round((stage.value / stages[index - 1]!.value) * 100) : 0}% from prior`
                        : "Pipeline entry"}
                    </span>
                    <div className="mt-2 h-1.5 rounded-full bg-border">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(stage.value / maxStage) * 100}%`,
                          background: stageColors[index],
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="grid grid-cols-4 divide-x divide-border border-t border-border bg-surface-muted/30 text-center">
            {followBreakdown.map((item) => (
              <Link key={item.label} to="/crm/leads/follow-ups" className="px-2 py-3 hover:bg-card">
                <strong className="block text-lg tabular" style={{ color: item.color }}>
                  {item.value}
                </strong>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </Link>
            ))}
          </div>
        </Surface>
        <Surface className="self-start border-warning/25 bg-[linear-gradient(150deg,var(--card),var(--warning-soft))] xl:col-span-4 xl:row-span-2">
          <Heading
            eyebrow="Action centre"
            title="Workflow pressure"
            detail={`${attention.items.length} records require review`}
          />
          <div className="grid grid-cols-2 gap-px border-y border-border bg-border">
            {[
              { module: "leads", label: "Leads", to: "/crm/leads" },
              { module: "followUps", label: "Follow-ups", to: "/crm/leads/follow-ups" },
              { module: "quotations", label: "Quotations", to: "/crm/quotations" },
              { module: "orders", label: "Orders", to: "/crm/orders" },
            ].map((entry) => (
              <Link
                key={entry.module}
                to={entry.to}
                className="bg-card/90 p-4 hover:bg-warning-soft"
              >
                <strong className="text-2xl tabular">
                  {attention.counts[entry.module as keyof typeof attention.counts]}
                </strong>
                <span className="mt-1 block text-xs text-muted-foreground">{entry.label}</span>
              </Link>
            ))}
          </div>
          <div className="divide-y divide-border px-4">
            {attention.items.slice(0, 7).map((item) => (
              <Link key={item.id} to={item.to} className="flex items-center gap-3 py-3">
                <span
                  className={`size-2 rounded-full ${item.bucket === "overdue" ? "bg-danger" : item.bucket === "today" ? "bg-warning" : "bg-info"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.type}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.customer}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Surface>
        <Surface className="xl:col-span-8">
          <Heading
            eyebrow="Demand intelligence"
            title="Lead composition and commercial value"
            detail="Status, acquisition source and collected revenue"
          />
          <div className="grid border-t border-border lg:grid-cols-12">
            <div className="flex items-center justify-center gap-4 p-4 lg:col-span-3 lg:border-r">
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={leadStatuses}
                      dataKey="value"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {leadStatuses.map((item) => (
                        <Cell key={item.status} fill={statusColors[item.status]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-content-center text-center">
                  <strong className="text-xl">{crm.data?.leads.total ?? 0}</strong>
                  <span className="text-[9px] text-muted-foreground">leads</span>
                </div>
              </div>
            </div>
            <div className="h-48 p-4 lg:col-span-4 lg:border-r">
              <ResponsiveContainer>
                <BarChart data={leadSources} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="lead_source"
                    width={85}
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                    {leadSources.map((source, index) => (
                      <Cell
                        key={source.lead_source}
                        fill={stageColors[index % stageColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-48 p-4 lg:col-span-5">
              <ResponsiveContainer>
                <AreaChart
                  data={analytics.data?.revenue.trend ?? []}
                  margin={{ left: -18, right: 8 }}
                >
                  <defs>
                    <linearGradient id="crmValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="var(--primary)" stopOpacity=".22" />
                      <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip />
                  <Area
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="url(#crmValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Surface>
        <Surface className="xl:col-span-4">
          <Heading
            eyebrow="Customer reminders"
            title="Occasion follow-ups"
            detail={`${events.data?.length ?? 0} upcoming customer moments`}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/customers">Open</Link>
              </Button>
            }
          />
          {events.isLoading ? (
            <div className="p-4"><CardSkeleton /></div>
          ) : !events.data?.length ? (
            <EmptyState title="No reminders due" />
          ) : (
            <div className="divide-y divide-border px-4">
              {events.data.slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
                    <Gift className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link to={`/crm/customers/${event.customer_id}`} className="block truncate text-sm font-medium hover:underline">
                      {event.customer_name}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {event.event_type} on {date(event.next_occurrence)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={sendReminder.isPending}
                    onClick={() => sendReminder.mutate(
                      { customerId: event.customer_id, eventId: event.id },
                      { onSuccess: (data) => toast.success(data.message ?? "Reminder logged.") },
                    )}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>

            <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <Heading
            eyebrow="Latest demand"
            title="Newest leads"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/leads">View all</Link>
              </Button>
            }
          />
          <div className="divide-y divide-border px-5">
            {latestLeads.map((lead) => (
              <Link
                key={String(lead.id)}
                to={`/crm/leads/${lead.id}/edit`}
                className="flex items-center gap-3 py-3"
              >
                <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {lead.customer_name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{lead.customer_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {lead.lead_no} · {lead.occasion}
                  </span>
                </span>
                <StatusChip status={lead.status} />
              </Link>
            ))}
          </div>
        </Surface>
        <Surface>
          <Heading eyebrow="Workflow activity" title="Recent movement" />
          <div className="divide-y divide-border px-5">
            {(crm.data?.workflows ?? []).slice(0, 7).map((item, index) => (
              <div key={index} className="flex gap-3 py-3">
                <span className="mt-1.5 size-2 rounded-full bg-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.customer_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.lead_no} · {item.stage}
                  </span>
                </span>
                <StatusChip status={item.status} />
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </>
  );
}
