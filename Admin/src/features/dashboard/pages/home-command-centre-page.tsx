import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
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
  CircleAlert,
  Gift,
  IndianRupee,
  PackageCheck,
  ReceiptText,
  Send,
  ShoppingBag,
  Target,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Surface, SurfaceHeading as SurfaceTitle } from "@/components/shared/command-surface";
import { DateRangeToolbar } from "@/components/shared/date-range-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { lastNDays } from "@/features/reports/reports-hooks";
import { useCrmAnalytics } from "@/features/dashboard/hooks";
import { useCrmDashboard } from "@/features/crm/hooks";
import { displayOrderStatus, useOrders } from "@/features/crm/orders-hooks";
import { useDeliveries } from "@/features/crm/deliveries-hooks";
import { useSendCustomerReminder, useUpcomingCustomerEvents } from "@/features/customers/hooks";
import { useCurrentAccess } from "@/features/auth/rbac";
import {
  useAttentionCenter,
  type AttentionBucket,
} from "@/features/attention/use-attention-center";

const palette = [
  "var(--accent)",
  "var(--primary)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--chart-5)",
];

const OPEN_ORDER_STATUSES = new Set([
  "Delivered",
  "Completed",
  "Closed",
  "Cancelled",
]);

function orderUrgency(dueDate: string) {
  const due = new Date(dueDate);
  const dueDay = due.toDateString();
  const today = new Date();
  const todayDay = today.toDateString();
  const tomorrowDay = new Date(today.getTime() + 86400000).toDateString();
  if (due < today && dueDay !== todayDay) {
    return { label: "Overdue", tone: "danger" as const };
  }
  if (dueDay === todayDay) return { label: "Today", tone: "danger" as const };
  if (dueDay === tomorrowDay) return { label: "Tomorrow", tone: "warning" as const };
  return {
    label: due.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    tone: "info" as const,
  };
}

function HomeCommandCentrePage() {
  const [range, setRange] = useState(lastNDays(7));
  const access = useCurrentAccess();
  const analytics = useCrmAnalytics(range);
  const crm = useCrmDashboard(range);
  const orders = useOrders();
  const deliveries = useDeliveries();
  const events = useUpcomingCustomerEvents(30);
  const sendReminder = useSendCustomerReminder();
  const attention = useAttentionCenter();

  const pendingDeliveries = (deliveries.data ?? []).filter((delivery) =>
    ["Pending", "Out for Delivery"].includes(delivery.delivery_status),
  );
  const today = new Date().toDateString();
  const todayDeliveries = (deliveries.data ?? [])
    .filter(
      (delivery) =>
        ["Pending", "Out for Delivery"].includes(delivery.delivery_status) &&
        delivery.scheduled_at && new Date(delivery.scheduled_at).toDateString() === today,
    )
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    .slice(0, 5);

  const products = useMemo(
    () =>
      (analytics.data?.products ?? [])
        .map((row) => ({
          name: String(row["item_name"] ?? "Product"),
          flavour: String(row["flavour"] ?? ""),
          revenue: Number(row["revenue"] ?? 0),
          orders: Number(row["orders"] ?? 0),
          quantity: Number(row["quantity"] ?? 0),
        }))
        .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
        .slice(0, 6),
    [analytics.data?.products],
  );
  const maxProduct = Math.max(1, ...products.map((product) => product.revenue));
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
  const occasions = (analytics.data?.occasions ?? []).filter((item) => item.value > 0).slice(0, 6);
  const occasionTotal = occasions.reduce((sum, item) => sum + item.value, 0);

  const funnel = crm.data
    ? [
        { label: "Leads", value: crm.data.funnel.total_leads, color: "var(--accent)" },
        { label: "Quotation", value: crm.data.funnel.moved_to_quotation, color: "var(--info)" },
        { label: "Order", value: crm.data.funnel.moved_to_order, color: "var(--primary)" },
        { label: "Invoice", value: crm.data.funnel.moved_to_invoice, color: "var(--warning)" },
        { label: "Delivery", value: crm.data.funnel.moved_to_delivery, color: "var(--chart-5)" },
        { label: "Complete", value: crm.data.funnel.completed, color: "var(--success)" },
      ]
    : [];
  const maxFunnel = Math.max(1, ...funnel.map((step) => step.value));

  const statuses = useMemo(
    () =>
      Array.from(
        Object.entries(crm.data?.status_counts.orders ?? {}).reduce((map, [raw, count]) => {
          const status = displayOrderStatus(raw);
          map.set(status, (map.get(status) ?? 0) + count);
          return map;
        }, new Map<string, number>()),
        ([status, value]) => ({ status, value }),
      ).sort((a, b) => b.value - a.value),
    [crm.data?.status_counts.orders],
  );
  const statusTotal = Math.max(
    1,
    statuses.reduce((sum, item) => sum + item.value, 0),
  );
  const statusColor = (status: string) =>
    /cancel|fail/i.test(status)
      ? "var(--danger)"
      : /complete|deliver|closed/i.test(status)
        ? "var(--success)"
        : /ready|out for/i.test(status)
          ? "var(--info)"
          : /pending|process|production/i.test(status)
            ? "var(--warning)"
            : "var(--primary)";
  const attentionGroups: Array<{ key: AttentionBucket; label: string; tone: string }> = [
    { key: "overdue", label: "Urgent", tone: "text-danger" },
    { key: "today", label: "Today", tone: "text-warning" },
    { key: "upcoming", label: "Upcoming", tone: "text-info" },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayName = access.data?.name?.trim() || access.data?.username;

  return (
    <>
      <PageHeader
        title={<span className="block"><span className="mb-1 block text-sm font-medium tracking-normal text-muted-foreground">{greeting}{displayName ? `, ${displayName}` : ""} 👋</span><span className="block">Business today</span></span>}
        description="Revenue, sales flow, bakery operations and the actions that matter now."
        actions={
          <DateRangeToolbar
            value={range}
            onChange={setRange}
            onRefresh={() => analytics.refetch()}
            isFetching={analytics.isFetching}
          />
        }
      />

      <Surface className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 xl:grid-cols-5 xl:divide-y-0">
        {[
          {
            label: "Collected revenue",
            value: inr(analytics.data?.revenue.collected ?? 0),
            detail: `${analytics.data?.totals.orders ?? 0} orders`,
            to: "/reports/analytics",
            icon: IndianRupee,
            tone: "text-primary",
          },
          {
            label: "Orders today",
            value: String(analytics.data?.current.today_orders ?? 0),
            detail: `${orders.data?.length ?? 0} all time`,
            to: "/crm/orders",
            icon: ShoppingBag,
            tone: "text-success",
            live: true,
          },
          {
            label: "New leads",
            value: String(analytics.data?.totals.leads ?? 0),
            detail: "Selected period",
            to: "/crm/leads",
            icon: Target,
            tone: "text-accent",
          },
          {
            label: "Payments pending",
            value: String(analytics.data?.current.payments_pending.count ?? 0),
            detail: inr(analytics.data?.current.payments_pending.amount ?? 0),
            to: "/crm/orders",
            icon: ReceiptText,
            tone: "text-warning",
            live: true,
          },
          {
            label: "Active deliveries",
            value: String(pendingDeliveries.length),
            detail: `${todayDeliveries.length} today`,
            to: "/crm/delivery",
            icon: Truck,
            tone: "text-info",
            live: true,
          },
        ].map((metric, index) => (
            <Link
              key={metric.label}
              to={metric.to}
            className="group relative flex min-h-24 items-center gap-3 overflow-hidden bg-card px-4 py-3 transition-colors hover:bg-surface-muted"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: ["var(--primary)", "var(--success)", "var(--accent)", "var(--warning)", "var(--info)"][index] }}
            />
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${["bg-primary-soft", "bg-success-soft", "bg-accent-soft", "bg-warning-soft", "bg-info-soft"][index]} ${metric.tone}`}
            >
              <metric.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {metric.label}
                {"live" in metric && metric.live && (
                  <span
                    title="Always shows the current position, not the selected date range"
                    className="rounded bg-success-soft px-1 text-[9px] text-success"
                  >
                    Live
                  </span>
                )}
              </span>
              <strong className="mt-1 block truncate text-xl tabular">{metric.value}</strong>
              <span className="block truncate text-[10px] text-muted-foreground">
                {metric.detail}
              </span>
            </span>
          </Link>
        ))}
      </Surface>

      <Surface className="relative">
        <span className="absolute inset-x-0 top-0 h-1 bg-danger" />
        <SurfaceTitle
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
        <Surface className="relative self-start xl:col-span-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase">
                Revenue performance
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular sm:text-4xl">
                {inr(analytics.data?.revenue.collected ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Collected in the selected period</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-muted/50 py-2 text-right">
              <div className="px-3">
                <span className="block text-[10px] text-muted-foreground">Orders</span>
                <strong className="tabular">{analytics.data?.totals.orders ?? 0}</strong>
              </div>
              <div className="px-3">
                <span className="block text-[10px] text-muted-foreground">AOV</span>
                <strong className="tabular">
                  {inr(analytics.data?.revenue.average_order ?? 0)}
                </strong>
              </div>
              <div className="px-3">
                <span className="block text-[10px] text-muted-foreground">Outstanding</span>
                <strong className="tabular text-warning">
                  {inr(analytics.data?.revenue.outstanding ?? 0)}
                </strong>
              </div>
            </div>
          </div>
          <div className="h-64 px-2 pt-3 pb-2">
            {analytics.isLoading ? (
              <CardSkeleton />
            ) : !analytics.data?.revenue.trend.length ? (
              <EmptyState title="No revenue in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.data.revenue.trend}
                  margin={{ left: -18, right: 14, top: 8 }}
                >
                  <defs>
                    <linearGradient id="commandRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Revenue"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#commandRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Surface>

        <Surface className="self-start border-warning/25 bg-[linear-gradient(150deg,var(--card),var(--warning-soft))] xl:col-span-4 xl:row-span-2">
          <SurfaceTitle
            eyebrow="Executive actions"
            title="What needs attention"
            detail={`${attention.items.length} live workflow signals`}
          />
          <div className="grid grid-cols-3 border-y border-border bg-card/60">
            {attentionGroups.map((group) => {
              const count = attention.items.filter((item) => item.bucket === group.key).length;
              return (
                <div key={group.key} className="px-4 py-3">
                  <span className={`text-2xl font-semibold tabular ${group.tone}`}>
                    {String(count).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-border px-4">
            {attention.isLoading ? (
              <div className="py-6">
                <CardSkeleton />
              </div>
            ) : attention.items.length === 0 ? (
              <EmptyState title="Everything is on track" />
            ) : (
              attention.items.slice(0, 6).map((item) => (
                <Link key={item.id} to={item.to} className="group flex items-center gap-3 py-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${item.bucket === "overdue" ? "bg-danger" : item.bucket === "today" ? "bg-warning" : "bg-info"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.type}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.customer}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))
            )}
          </div>
        </Surface>
        <Surface className="xl:col-span-8">
          <SurfaceTitle
            eyebrow="Sales intelligence"
            title="Commercial flow"
            detail="Where demand is moving through the sales process"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm">
                  Open CRM <ArrowUpRight />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-0 border-t border-border lg:grid-cols-[1.35fr_1fr]">
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 xl:grid-cols-6 lg:border-r lg:border-border">
              {crm.isLoading ? (
                <CardSkeleton />
              ) : (
                funnel.map((step, index) => (
                  <div
                    key={step.label}
                    className="relative flex min-h-24 flex-col justify-between overflow-hidden rounded-lg p-3"
                    style={{ background: `color-mix(in srgb, ${step.color} 8%, var(--card))` }}
                  >
                    <div>
                      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                        {step.label}
                      </span>
                      <strong className="mt-2 block text-2xl tabular">{step.value}</strong>
                    </div>
                    {index > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {funnel[index - 1]!.value
                          ? Math.round((step.value / funnel[index - 1]!.value) * 100)
                          : 0}
                        % from prior
                      </span>
                    )}
                    <span
                      className="absolute inset-x-0 bottom-0 h-1"
                      style={{
                        background: step.color,
                        width: `${(step.value / maxFunnel) * 100}%`,
                      }}
                    />
                  </div>
                ))
              )}
            </div>
            <div className="relative min-h-48 p-4">
              <p className="text-xs font-semibold">Sales by occasion</p>
              <div className="relative mx-auto h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occasions}
                      dataKey="value"
                      nameKey="occasion"
                      innerRadius={46}
                      outerRadius={68}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {occasions.map((item, index) => (
                        <Cell key={item.occasion} fill={palette[index % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        borderColor: "var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <strong className="text-2xl tabular">{occasionTotal}</strong>
                  <span className="text-[10px] text-muted-foreground">orders</span>
                </div>
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Surface className="xl:col-span-5">
          <SurfaceTitle
            eyebrow="Bakery intelligence"
            title="Best sellers"
            detail="Ranked by real order revenue"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">Catalog</Link>
              </Button>
            }
          />
          <ol className="space-y-3 px-5 pb-5">
            {products.length ? (
              products.map((product, index) => (
                <li key={`${product.name}-${product.flavour}`}>
                  <div className="flex items-end gap-3 text-xs">
                    <span
                      className={`w-6 text-lg font-semibold tabular ${index === 0 ? "text-success" : "text-muted-foreground"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {product.name}
                      {product.flavour ? ` · ${product.flavour}` : ""}
                    </span>
                    <strong className="tabular">{inr(product.revenue)}</strong>
                  </div>
                  <div className="mt-1 ml-9 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${(product.revenue / maxProduct) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 ml-9 text-[10px] text-muted-foreground">
                    {product.orders} orders · {product.quantity} units
                  </p>
                </li>
              ))
            ) : (
              <EmptyState title="No product sales in this period" />
            )}
          </ol>
        </Surface>

        <Surface className="xl:col-span-3">
          <SurfaceTitle
            eyebrow="Operations"
            title="Order workload"
            detail={`${statusTotal} orders represented`}
          />
          <div className="px-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
              {statuses.map((item) => (
                <span
                  key={item.status}
                  style={{
                    width: `${(item.value / statusTotal) * 100}%`,
                    background: statusColor(item.status),
                  }}
                  title={`${item.status}: ${item.value}`}
                />
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {statuses.slice(0, 6).map((item) => (
                <div key={item.status} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: statusColor(item.status) }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">{item.status}</span>
                  <strong className="tabular">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 border-t border-border">
            <Link to="/crm/orders" className="p-4 hover:bg-surface-muted">
              <ReceiptText className="size-4 text-warning" />
              <strong className="mt-2 block text-xl tabular">{analytics.data?.current.payments_pending.count ?? 0}</strong>
              <span className="text-[10px] text-muted-foreground">Payments pending</span>
            </Link>
            <Link to="/crm/delivery" className="border-l border-border p-4 hover:bg-surface-muted">
              <Truck className="size-4 text-info" />
              <strong className="mt-2 block text-xl tabular">{pendingDeliveries.length}</strong>
              <span className="text-[10px] text-muted-foreground">Deliveries active</span>
            </Link>
          </div>
        </Surface>

        <Surface className="xl:col-span-4">
          <SurfaceTitle
            eyebrow="Delivery desk"
            title="Today's schedule"
            detail={`${todayDeliveries.length} scheduled today`}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/delivery">View all</Link>
              </Button>
            }
          />
          {deliveries.isLoading ? (
            <div className="p-4">
              <CardSkeleton />
            </div>
          ) : todayDeliveries.length === 0 ? (
            <EmptyState title="No deliveries scheduled today" />
          ) : (
            <ol className="relative px-5 pb-4 before:absolute before:top-2 before:bottom-6 before:left-[5.15rem] before:w-px before:bg-border">
              {todayDeliveries.map((delivery) => (
                <li key={String(delivery.id)}>
                  <Link
                    to={`/crm/delivery/${delivery.id}`}
                    className="grid grid-cols-[3.7rem_0.75rem_minmax(0,1fr)] gap-2 rounded-lg py-3 hover:bg-surface-muted"
                  >
                    <span className="text-xs font-semibold tabular text-muted-foreground">
                      {new Date(delivery.scheduled_at!).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="relative z-10 mt-1 size-2.5 rounded-full border-2 border-card bg-info" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {delivery.customer_name}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] text-muted-foreground">
                          {delivery.order_no}
                        </span>
                        <StatusChip
                          status={delivery.delivery_status}
                          className="px-1.5 py-0.5 text-[9px]"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Surface>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 [&>section]:self-start">
        <Surface>
          <SurfaceTitle
            eyebrow="Customer reminders"
            title="Upcoming events & reminders"
            detail={`${events.data?.length ?? 0} upcoming ${events.data?.length === 1 ? "event" : "events"}`}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/customers">View all reminders <ArrowUpRight className="size-3.5" /></Link>
              </Button>
            }
          />
          {events.isLoading ? (
            <div className="p-4">
              <CardSkeleton />
            </div>
          ) : !events.data?.length ? (
            <EmptyState title="No upcoming events" description="You're all caught up." />
          ) : (
            <div className="grid border-t border-border sm:grid-cols-2">
              {events.data.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-b border-border p-4 transition-colors hover:bg-surface-muted sm:odd:border-r"
                >
                  <span className="flex h-12 flex-col items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <strong className="text-base leading-none tabular">
                      {new Date(event.next_occurrence).toLocaleDateString("en-IN", { day: "2-digit" })}
                    </strong>
                    <span className="mt-1 text-[9px] font-bold uppercase">
                      {new Date(event.next_occurrence).toLocaleDateString("en-IN", { month: "short" })}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <Link to={`/crm/customers/${event.customer_id}`} className="flex items-center gap-1.5 text-sm font-semibold text-warning hover:underline">
                      <Gift className="size-3.5 shrink-0" /> {event.event_type}
                    </Link>
                    <strong className="mt-1 block truncate text-sm">{event.customer_name}</strong>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {event.notes || `${event.event_type} reminder`}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-info">{event.status}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={sendReminder.isPending}
                        onClick={() => sendReminder.mutate(
                          { customerId: event.customer_id, eventId: event.id },
                          { onSuccess: (data) => toast.success(data.message ?? "Reminder logged.") },
                        )}
                      >
                        <Send className="size-3" /> Send
                      </Button>
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>
        <Surface>
          <SurfaceTitle
            eyebrow="Business activity"
            title="Latest movement"
            detail="Cross-module commercial activity"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reports/analytics">Analytics</Link>
              </Button>
            }
          />
          <div className="divide-y divide-border px-5">
            {(analytics.data?.timeline ?? []).slice(0, 7).map((item) => (
              <div key={String(item.id)} className="flex gap-3 py-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.action}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.customer} · {item.reference}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">{item.created_on}</span>
              </div>
            ))}
            {!analytics.data?.timeline.length && <EmptyState title="No recent activity" />}
          </div>
        </Surface>
      </div>
    </>
  );
}

export default HomeCommandCentrePage;
