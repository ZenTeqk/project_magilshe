import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
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
import { ArrowUpRight, Gift, IndianRupee, Repeat, UserCheck, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { useCrmCustomerAnalytics, useUpcomingCustomerEvents } from "@/features/customers/hooks";

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-soft ${className}`}
    >
      {children}
    </section>
  );
}
function Heading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <p className="text-[10px] font-bold tracking-[.16em] text-info uppercase">{eyebrow}</p>
        <h2 className="mt-1 text-sm font-semibold">{title}</h2>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </header>
  );
}
const month = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
const chartColors = [
  "var(--primary)",
  "var(--success)",
  "var(--accent)",
  "var(--info)",
  "var(--warning)",
  "var(--danger)",
];
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

export default function CustomerIntelligencePage() {
  const navigate = useNavigate();
  const customers = useCrmCustomerAnalytics();
  const events = useUpcomingCustomerEvents(30);
  const stats = useMemo(() => {
    const rows = customers.data ?? [];
    const cutoff = Date.now() - 30 * 86400000;
    const fresh = rows.filter((item) => new Date(item.date_joined).getTime() >= cutoff).length;
    const returning = rows.filter((item) => item.is_returning_customer).length;
    const active = rows.filter((item) => item.is_active).length;
    return {
      total: rows.length,
      fresh,
      returning,
      active,
      revenue: rows.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0),
      retention: rows.length ? Math.round((returning / rows.length) * 100) : 0,
    };
  }, [customers.data]);
  const growth = useMemo(
    () =>
      Array.from(
        (customers.data ?? []).reduce((map, item) => {
          const key = month(item.date_joined);
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
        ([period, value]) => ({ period, value }),
      ).slice(-8),
    [customers.data],
  );
  const top = useMemo(
    () =>
      [...(customers.data ?? [])]
        .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
        .slice(0, 6),
    [customers.data],
  );
  const maxRevenue = Math.max(1, ...top.map((item) => Number(item.total_revenue)));
  const recent = useMemo(
    () =>
      [...(customers.data ?? [])]
        .sort((a, b) => b.date_joined.localeCompare(a.date_joined))
        .slice(0, 6),
    [customers.data],
  );
  const segments = [
    { name: "Returning", value: stats.returning, color: "var(--accent)" },
    {
      name: "First-order",
      value: Math.max(0, stats.total - stats.returning),
      color: "var(--info)",
    },
  ];
  const purchaseMix = useMemo(() => {
    const rows = customers.data ?? [];
    return [
      {
        name: "No valid order",
        value: rows.filter((item) => item.valid_order_count === 0).length,
        color: "var(--warning)",
      },
      {
        name: "First purchase",
        value: rows.filter((item) => item.valid_order_count === 1).length,
        color: "var(--info)",
      },
      {
        name: "Repeat",
        value: rows.filter((item) => item.valid_order_count > 1).length,
        color: "var(--accent)",
      },
    ].filter((item) => item.value > 0);
  }, [customers.data]);
  const eventMix = useMemo(
    () =>
      Array.from(
        (events.data ?? []).reduce((map, event) => {
          map.set(event.event_type, (map.get(event.event_type) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
        ([name, value], index) => ({ name, value, color: chartColors[index % chartColors.length] }),
      ),
    [events.data],
  );

  return (
    <>
      <PageHeader
        title="Customer intelligence"
        description="Growth, retention, customer value and upcoming opportunities."
        actions={
          <Button variant="outline" asChild>
            <Link to="/crm/customers/manage">
              Customer management <ArrowUpRight />
            </Link>
          </Button>
        }
      />
      <Surface className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 xl:grid-cols-5 xl:divide-y-0">
        {[
          {
            label: "Total customers",
            value: stats.total,
            detail: "All customer accounts",
            icon: Users,
            color: "text-primary",
            bg: "bg-primary-soft",
          },
          {
            label: "New · 30 days",
            value: stats.fresh,
            detail: "Recently acquired",
            icon: UserPlus,
            color: "text-info",
            bg: "bg-info-soft",
          },
          {
            label: "Active",
            value: stats.active,
            detail: `${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of customer base`,
            icon: UserCheck,
            color: "text-success",
            bg: "bg-success-soft",
          },
          {
            label: "Returning",
            value: stats.returning,
            detail: `${stats.retention}% repeat rate`,
            icon: Repeat,
            color: "text-accent",
            bg: "bg-accent-soft",
          },
          {
            label: "Customer revenue",
            value: inr(stats.revenue),
            detail: "Valid orders only",
            icon: IndianRupee,
            color: "text-warning",
            bg: "bg-warning-soft",
          },
        ].map((item) => (
          <div key={item.label} className="flex min-h-24 items-center gap-3 bg-card p-4">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg ${item.bg} ${item.color}`}
            >
              <item.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {item.label}
              </span>
              <strong className="mt-1 block truncate text-xl tabular">{item.value}</strong>
              <span className="block truncate text-[10px] text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </div>
        ))}
      </Surface>
      <Surface>
        <Heading
          eyebrow="Customer composition"
          title="Behaviour, opportunity and account health"
          detail="A live distribution of purchase maturity, upcoming customer moments and engagement."
        />
        <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <strong className="text-sm">Purchase lifecycle</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Customers by valid-order history
              </span>
            </div>
            <div className="grid items-center gap-4 sm:grid-cols-[9rem_1fr]">
              <div className="relative h-36">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={purchaseMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={62}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {purchaseMix.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-content-center text-center">
                  <strong className="text-xl tabular">{stats.total}</strong>
                  <span className="text-[9px] text-muted-foreground">customers</span>
                </div>
              </div>
              <div className="space-y-2">
                {purchaseMix.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2 rounded-full" style={{ background: item.color }} />
                    <span className="flex-1 text-muted-foreground">{item.name}</span>
                    <strong className="tabular">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <strong className="text-sm">Upcoming moments</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Events in the next 30 days by type
              </span>
            </div>
            {eventMix.length ? (
              <div className="grid items-center gap-4 sm:grid-cols-[9rem_1fr]">
                <div className="relative h-36">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={eventMix}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={62}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {eventMix.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-content-center text-center">
                    <strong className="text-xl tabular">{events.data?.length ?? 0}</strong>
                    <span className="text-[9px] text-muted-foreground">events</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {eventMix.slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full" style={{ background: item.color }} />
                      <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                      <strong className="tabular">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid h-36 place-content-center text-center text-xs text-muted-foreground">
                No upcoming customer events
              </div>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <div className="mb-5">
              <strong className="text-sm">Account health</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Current engagement and retention signals
              </span>
            </div>
            <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="bg-success"
                style={{ width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%` }}
              />
              <span
                className="bg-danger"
                style={{
                  width: `${stats.total ? ((stats.total - stats.active) / stats.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Active",
                  value: stats.active,
                  color: "text-success",
                  bg: "bg-success-soft",
                },
                {
                  label: "Inactive",
                  value: Math.max(0, stats.total - stats.active),
                  color: "text-danger",
                  bg: "bg-danger-soft",
                },
                {
                  label: "Returning",
                  value: stats.returning,
                  color: "text-accent",
                  bg: "bg-accent-soft",
                },
                {
                  label: "Upcoming",
                  value: events.data?.length ?? 0,
                  color: "text-info",
                  bg: "bg-info-soft",
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-3 ${item.bg}`}>
                  <strong className={`block text-xl tabular ${item.color}`}>{item.value}</strong>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>
      <div className="grid gap-4 xl:grid-cols-12">
        <Surface className="xl:col-span-8">
          <Heading
            eyebrow="Growth intelligence"
            title="Customer acquisition"
            detail="New customer accounts by month"
            action={
              <div className="text-right">
                <strong className="text-3xl tabular text-info">{stats.total}</strong>
                <span className="block text-[10px] text-muted-foreground">total customers</span>
              </div>
            }
          />
          <div className="h-72 px-3 pb-3">
            {customers.isLoading ? (
              <CardSkeleton />
            ) : (
              <ResponsiveContainer>
                <BarChart data={growth} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="New customers" radius={[6, 6, 0, 0]}>
                    {growth.map((item, index) => (
                      <Cell key={item.period} fill={chartColors[index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-4 divide-x divide-border border-t border-border bg-surface-muted/30">
            {[
              { label: "New · 30d", value: stats.fresh, icon: UserPlus, color: "text-primary" },
              { label: "Active", value: stats.active, icon: UserCheck, color: "text-success" },
              { label: "Returning", value: stats.returning, icon: Repeat, color: "text-accent" },
              {
                label: "Revenue",
                value: inr(stats.revenue),
                icon: IndianRupee,
                color: "text-info",
              },
            ].map((item) => (
              <div key={item.label} className="p-3">
                <item.icon className={`size-4 ${item.color}`} />
                <strong className="mt-2 block text-lg tabular">{item.value}</strong>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="xl:col-span-4">
          <Heading
            eyebrow="Retention signal"
            title="New vs returning"
            detail="Returning uses the valid-order rule"
          />
          <div className="relative mx-auto h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {segments.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-content-center text-center">
              <strong className="text-3xl tabular text-accent">{stats.retention}%</strong>
              <span className="text-[10px] text-muted-foreground">returning rate</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
            {segments.map((item) => (
              <div key={item.name} className="bg-card p-4">
                <span className="size-2 rounded-full" style={{ background: item.color }} />
                <strong className="mt-2 block text-2xl tabular">{item.value}</strong>
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Surface className="self-start">
        <Heading
          eyebrow="Value intelligence"
          title="Highest-value customers"
          detail="Lifetime revenue from valid orders"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/crm/customers/manage">View all</Link>
            </Button>
          }
        />
          <ol className="space-y-3 border-t border-border p-5">
            {top.map((customer, index) => (
              <li key={String(customer.id)}>
                <button
                  onClick={() => navigate(`/crm/customers/${customer.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`w-6 text-lg font-semibold ${index === 0 ? "text-info" : "text-muted-foreground"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {customer.name || customer.username}
                    </span>
                    <strong className="tabular">{inr(Number(customer.total_revenue))}</strong>
                  </div>
                  <div className="mt-1 ml-9 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-info"
                      style={{ width: `${(Number(customer.total_revenue) / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 ml-9 text-[10px] text-muted-foreground">
                    {customer.valid_order_count} valid orders · last{" "}
                    {date(customer.last_order_date)}
                  </p>
                </button>
              </li>
            ))}
          </ol>
      </Surface>
      <Surface className="self-start">
          <div>
            <Heading
              eyebrow="Opportunity calendar"
              title="Upcoming celebrations"
              detail="Next 30 days"
            />
            {events.isLoading ? (
              <div className="p-4">
                <CardSkeleton />
              </div>
            ) : !events.data?.length ? (
              <EmptyState title="No upcoming events" />
            ) : (
              <div className="divide-y divide-border px-5">
                {events.data.slice(0, 6).map((event) => (
                  <Link
                    key={event.id}
                    to={`/crm/customers/${event.customer_id}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning">
                      <Gift className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {event.event_type} · {event.customer_name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {date(event.next_occurrence)} · reminder {date(event.reminder_date)}
                      </span>
                    </span>
                    <StatusChip status={event.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
      </Surface>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 [&>section]:self-start">
        <Surface>
          <Heading
            eyebrow="Customer opportunities"
            title="Recently joined"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/customers/manage">Open records</Link>
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-3">
            {recent.map((customer) => (
              <Link
                key={String(customer.id)}
                to={`/crm/customers/${customer.id}`}
                className="bg-card p-4 hover:bg-info-soft"
              >
                <span className="grid size-9 place-items-center rounded-full bg-info-soft text-xs font-bold text-info">
                  {(customer.name || customer.username).slice(0, 2).toUpperCase()}
                </span>
                <strong className="mt-3 block truncate text-sm">
                  {customer.name || customer.username}
                </strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {customer.phone}
                </span>
                <span className="mt-2 block text-[10px] text-muted-foreground">
                  Joined {date(customer.date_joined)}
                </span>
              </Link>
            ))}
          </div>
        </Surface>
        <Surface>
          <Heading
            eyebrow="Customer health"
            title="Engagement snapshot"
            detail="Live account and purchase signals"
          />
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
            {[
              { label: "Active accounts", value: stats.active, color: "text-success" },
              {
                label: "Inactive",
                value: Math.max(0, stats.total - stats.active),
                color: "text-muted-foreground",
              },
              { label: "Returning", value: stats.returning, color: "text-accent" },
              { label: "Upcoming events", value: events.data?.length ?? 0, color: "text-warning" },
            ].map((item) => (
              <div key={item.label} className="bg-card p-5">
                <strong className={`text-3xl tabular ${item.color}`}>{item.value}</strong>
                <span className="mt-2 block text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </>
  );
}
