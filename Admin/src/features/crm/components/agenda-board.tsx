import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Phone,
  RefreshCw,
} from "lucide-react";
import { Surface, SurfaceHeading } from "@/components/shared/command-surface";
import { StatusChip } from "@/components/shared/status-chip";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { inr } from "@/lib/data";
import { hasPermission, permissionForRoute, useCurrentAccess } from "@/features/auth/rbac";
import { cn } from "@/lib/utils";
import {
  agendaItemLink,
  agendaMeta,
  agendaTypes,
  useCrmAgenda,
  type AgendaItem,
  type AgendaType,
} from "@/features/crm/agenda-hooks";

type View = "day" | "week" | "month";

const iso = (value: Date) => format(value, "yyyy-MM-dd");
const weekOptions = { weekStartsOn: 1 as const };

function rangeFor(view: View, anchor: Date) {
  if (view === "day") return { start: anchor, end: anchor };
  if (view === "week")
    return { start: startOfWeek(anchor, weekOptions), end: endOfWeek(anchor, weekOptions) };
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

function rangeLabel(view: View, start: Date, end: Date) {
  if (view === "day") return format(start, "EEEE, d MMM yyyy");
  if (view === "month") return format(start, "MMMM yyyy");
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

/**
 * Day-wise CRM agenda: upcoming orders, deliveries, pending payments,
 * follow-ups, customer events, reminders and completed work, with customer
 * details. Used by the CRM Calendar page, the Customers dashboard and (scoped
 * with `customerId`) the Customer 360 profile.
 */
export function AgendaBoard({
  customerId,
  defaultView = "week",
  embedded = false,
}: {
  customerId?: string | number | undefined;
  defaultView?: View;
  /** Wrap in a titled Surface for use inside another dashboard. */
  embedded?: boolean;
}) {
  const [view, setView] = useState<View>(defaultView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [hidden, setHidden] = useState<AgendaType[]>([]);
  const { start, end } = rangeFor(view, anchor);
  const agenda = useCrmAgenda({ start: iso(start), end: iso(end), customer: customerId });
  const today = agenda.data?.today ?? iso(new Date());
  const showCustomer = customerId == null;
  const { data: access } = useCurrentAccess();
  const calendarPermission = permissionForRoute("/crm/calendar");
  const canOpenCalendar = !calendarPermission || hasPermission(access, calendarPermission);

  const visible = useMemo(
    () => (agenda.data?.items ?? []).filter((item) => !hidden.includes(item.type)),
    [agenda.data, hidden],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of visible) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return map;
  }, [visible]);
  const overdue = (agenda.data?.overdue ?? []).filter((item) => !hidden.includes(item.type));

  const step = (direction: 1 | -1) =>
    setAnchor((current) =>
      view === "day"
        ? addDays(current, direction)
        : view === "week"
          ? addDays(current, 7 * direction)
          : addMonths(current, direction),
    );
  const toggleType = (type: AgendaType) =>
    setHidden((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  const openDay = (day: Date) => {
    setAnchor(day);
    setView("day");
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => step(-1)}
          aria-label="Previous"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setAnchor(new Date())}>
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => step(1)}
          aria-label="Next"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <strong className="min-w-0 truncate text-sm">{rangeLabel(view, start, end)}</strong>
      <div className="ml-auto flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && setView(value as View)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => agenda.refetch()}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("size-4", agenda.isFetching && "animate-spin")} />
        </Button>
      </div>
    </div>
  );

  const summary = agenda.data?.summary;
  const tiles = (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4 xl:grid-cols-8">
      {agendaTypes.map((type) => {
        const meta = agendaMeta[type];
        const off = hidden.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            aria-pressed={!off}
            title={off ? `Show ${meta.label.toLowerCase()}` : `Hide ${meta.label.toLowerCase()}`}
            className={cn(
              "flex min-w-0 items-center gap-3 bg-card p-3 text-left transition-colors hover:bg-surface-muted/70",
              off && "opacity-45",
            )}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", meta.chip)}>
              <meta.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {meta.label}
              </span>
              <strong className="block text-lg leading-tight tabular">
                {summary?.[type] ?? "–"}
              </strong>
              {type === "payment" && summary && Number(summary.payment_pending_amount) > 0 && (
                <span className="block truncate text-[10px] text-muted-foreground">
                  {inr(Number(summary.payment_pending_amount))} due
                </span>
              )}
            </span>
          </button>
        );
      })}
      <div className="flex min-w-0 items-center gap-3 bg-card p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
          <AlertTriangle className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Overdue
          </span>
          <strong
            className={cn("block text-lg leading-tight tabular", summary?.overdue && "text-danger")}
          >
            {summary?.overdue ?? "–"}
          </strong>
        </span>
      </div>
    </div>
  );

  const body = agenda.isLoading ? (
    <CardSkeleton />
  ) : agenda.isError ? (
    <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
      Unable to load the calendar.
    </p>
  ) : (
    <div className="space-y-4">
      {overdue.length > 0 && <OverduePanel items={overdue} showCustomer={showCustomer} />}
      {view === "day" && (
        <DayList items={byDay.get(iso(start)) ?? []} showCustomer={showCustomer} />
      )}
      {view === "week" && (
        <WeekGrid
          days={eachDayOfInterval({ start, end })}
          byDay={byDay}
          today={today}
          showCustomer={showCustomer}
          onOpenDay={openDay}
        />
      )}
      {view === "month" && (
        <MonthGrid anchor={anchor} byDay={byDay} today={today} onOpenDay={openDay} />
      )}
    </div>
  );

  const content = (
    <div className="space-y-4">
      {toolbar}
      {tiles}
      {body}
    </div>
  );

  if (!embedded) return content;
  return (
    <Surface>
      <SurfaceHeading
        eyebrow="Day-wise schedule"
        title={customerId == null ? "Orders, deliveries, payments & events" : "Customer schedule"}
        detail="Upcoming work, reminders and what was completed each day"
        action={
          customerId == null && canOpenCalendar ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/crm/calendar">
                Open calendar <ArrowUpRight />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="border-t border-border p-4 sm:p-5">{content}</div>
    </Surface>
  );
}

function ItemRow({
  item,
  showCustomer,
  compact = false,
}: {
  item: AgendaItem;
  showCustomer: boolean;
  compact?: boolean;
}) {
  const meta = agendaMeta[item.type];
  const link = agendaItemLink(item);
  const title = link ? (
    <Link to={link} className="hover:underline">
      {item.title}
    </Link>
  ) : (
    item.title
  );
  const customer = showCustomer && (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      {item.customer.id ? (
        <Link
          to={`/crm/customers/${item.customer.id}`}
          className="truncate font-medium text-foreground hover:underline"
        >
          {item.customer.name}
        </Link>
      ) : (
        <span className="truncate font-medium text-foreground">{item.customer.name}</span>
      )}
      {item.customer.phone && (
        <a
          href={`tel:${item.customer.phone}`}
          className="inline-flex items-center gap-1 tabular hover:text-foreground"
        >
          <Phone className="size-3" /> {item.customer.phone}
        </a>
      )}
    </span>
  );

  if (compact) {
    return (
      <li className={cn("rounded-lg border border-l-[3px] border-border bg-card p-2", meta.border)}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
          <meta.icon className="size-3" />
          {item.time ?? meta.short}
          {item.overdue && <span className="text-danger">· overdue</span>}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs font-medium">{title}</p>
        {showCustomer && (
          <p className="truncate text-[11px] text-muted-foreground">{item.customer.name}</p>
        )}
        {item.amount && (
          <p className="text-[11px] font-semibold tabular">{inr(Number(item.amount))}</p>
        )}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-3 border-l-[3px] bg-card px-4 py-3",
        meta.border,
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", meta.chip)}>
        <meta.icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">
          {item.time && <span className="mr-2 text-muted-foreground tabular">{item.time}</span>}
          {title}
        </p>
        {item.subtitle && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</p>
        )}
        {customer}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {item.amount && <strong className="text-sm tabular">{inr(Number(item.amount))}</strong>}
        <div className="flex items-center gap-1">
          {item.overdue && <StatusChip status="Overdue" tone="danger" />}
          {item.status && !(item.overdue && item.status === "Overdue") && (
            <StatusChip status={item.status} />
          )}
        </div>
      </div>
    </li>
  );
}

function OverduePanel({ items, showCustomer }: { items: AgendaItem[]; showCustomer: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 4);
  return (
    <div className="overflow-hidden rounded-xl border border-danger/30 bg-danger-soft/40">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <AlertTriangle className="size-4 text-danger" />
        <strong className="text-sm">Overdue · needs attention</strong>
        <span className="text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} before today
        </span>
        {items.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `Show all ${items.length}`}
          </Button>
        )}
      </div>
      <div className="divide-y divide-border border-t border-border">
        {shown.map((item) => (
          <ItemRowWithDate key={`overdue-${item.key}`} item={item} showCustomer={showCustomer} />
        ))}
      </div>
    </div>
  );
}

function ItemRowWithDate({ item, showCustomer }: { item: AgendaItem; showCustomer: boolean }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-stretch bg-card">
      <div className="grid place-content-center border-r border-border text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
          {format(parseISO(item.date), "EEE")}
        </span>
        <strong className="text-sm tabular">{format(parseISO(item.date), "d MMM")}</strong>
      </div>
      <ul>
        <ItemRow item={item} showCustomer={showCustomer} />
      </ul>
    </div>
  );
}

function DayList({ items, showCustomer }: { items: AgendaItem[]; showCustomer: boolean }) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nothing scheduled for this day.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {agendaTypes.map((type) => {
        const group = items.filter((item) => item.type === type);
        if (!group.length) return null;
        const meta = agendaMeta[type];
        return (
          <section key={type} className="overflow-hidden rounded-xl border border-border">
            <header className="flex items-center gap-2 bg-surface-muted/60 px-4 py-2">
              <span className={cn("size-2 rounded-full", meta.dot)} />
              <strong className="text-xs tracking-wide uppercase">{meta.label}</strong>
              <span className="text-xs text-muted-foreground tabular">{group.length}</span>
            </header>
            <ul className="divide-y divide-border">
              {group.map((item) => (
                <ItemRow key={item.key} item={item} showCustomer={showCustomer} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function WeekGrid({
  days,
  byDay,
  today,
  showCustomer,
  onOpenDay,
}: {
  days: Date[];
  byDay: Map<string, AgendaItem[]>;
  today: string;
  showCustomer: boolean;
  onOpenDay: (day: Date) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day) => {
        const key = iso(day);
        const items = byDay.get(key) ?? [];
        const isToday = key === today;
        return (
          <div
            key={key}
            className={cn(
              "flex min-w-0 flex-col rounded-xl border border-border bg-surface-muted/40",
              isToday && "border-primary ring-1 ring-primary/40",
              !items.length && !isToday && "max-lg:hidden",
            )}
          >
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              className="flex items-center justify-between gap-2 rounded-t-xl px-3 py-2 text-left hover:bg-surface-muted"
            >
              <span>
                <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                  {format(day, "EEE")}
                </span>
                <strong className="text-sm tabular">{format(day, "d MMM")}</strong>
              </span>
              {isToday ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Today
                </span>
              ) : items.length ? (
                <span className="text-xs text-muted-foreground tabular">{items.length}</span>
              ) : null}
            </button>
            <ul className="flex-1 space-y-1.5 p-1.5 pt-0">
              {items.length ? (
                items.map((item) => (
                  <ItemRow key={item.key} item={item} showCustomer={showCustomer} compact />
                ))
              ) : (
                <li className="px-2 py-4 text-center text-[11px] text-muted-foreground">Free</li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  anchor,
  byDay,
  today,
  onOpenDay,
}: {
  anchor: Date;
  byDay: Map<string, AgendaItem[]>;
  today: string;
  onOpenDay: (day: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), weekOptions),
    end: endOfWeek(endOfMonth(anchor), weekOptions),
  });
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 bg-surface-muted/60 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px border-t border-border bg-border">
        {days.map((day) => {
          const key = iso(day);
          const inMonth = isSameMonth(day, anchor);
          const items = inMonth ? (byDay.get(key) ?? []) : [];
          const counts = agendaTypes
            .map((type) => ({ type, count: items.filter((item) => item.type === type).length }))
            .filter((entry) => entry.count > 0);
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => onOpenDay(day)}
              className={cn(
                "flex min-h-20 min-w-0 flex-col gap-1 bg-card p-1.5 text-left transition-colors hover:bg-surface-muted/70 sm:min-h-24 sm:p-2",
                !inMonth && "bg-surface-muted/30 text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs font-semibold tabular",
                  key === today && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <span className="flex flex-wrap gap-1">
                {counts.map(({ type, count }) => (
                  <span
                    key={type}
                    title={`${count} ${agendaMeta[type].label.toLowerCase()}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1 text-[10px] font-semibold tabular",
                      agendaMeta[type].chip,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", agendaMeta[type].dot)} />
                    {count}
                    <span className="hidden xl:inline">{agendaMeta[type].short}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
