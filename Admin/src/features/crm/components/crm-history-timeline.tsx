import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export type CrmHistoryEvent = {
  id: string | number;
  action: string;
  description?: string | null;
  staff_name?: string | null;
  created_on: string;
};

const DEFAULT_VISIBLE_MILESTONES = 5;

const majorActions = new Set([
  "Lead Created",
  "Lead Converted",
  "Quotation Created",
  "Quotation Sent",
  "Quotation Accepted",
  "Order Confirmed",
  "Order Processing",
  "Order Ready",
  "Invoice Generated",
  "Payment Completed",
  "Moved to Delivery",
  "Delivered",
  "Delivered Successfully",
  "Workflow Closed",
]);

function isMajorMilestone(event: CrmHistoryEvent) {
  const action = event.action.trim();
  if (majorActions.has(action)) return true;
  return /\b(cancelled|canceled|lost)\b/i.test(action);
}

function byNewestFirst(a: CrmHistoryEvent, b: CrmHistoryEvent) {
  return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
}

function TimelineList({ events }: { events: CrmHistoryEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-primary ring-4 ring-card" />
          <p className="text-sm">
            {event.staff_name ? <span className="font-semibold">{event.staff_name} </span> : null}
            <span className="text-muted-foreground">{event.action}</span>
          </p>
          {event.description ? <p className="text-xs text-muted-foreground">{event.description}</p> : null}
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            {new Date(event.created_on).toLocaleString("en-IN")}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function CrmHistoryTimeline({
  events,
  emptyTitle = "No activity yet",
  emptyDescription,
  visibleMilestones = DEFAULT_VISIBLE_MILESTONES,
}: {
  events?: CrmHistoryEvent[] | undefined;
  emptyTitle?: string;
  emptyDescription?: string | undefined;
  visibleMilestones?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const orderedEvents = useMemo(
    () => [...(events ?? [])].sort(byNewestFirst),
    [events],
  );
  const mainEvents = useMemo(() => {
    const milestones = orderedEvents.filter(isMajorMilestone);
    return (milestones.length ? milestones : orderedEvents).slice(0, visibleMilestones);
  }, [orderedEvents, visibleMilestones]);

  if (!orderedEvents.length) {
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
      />
    );
  }

  return (
    <div className="space-y-4">
      <TimelineList events={mainEvents} />
      {orderedEvents.length > mainEvents.length ? (
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? "Hide detailed history" : `View detailed history (${orderedEvents.length})`}
          </Button>
          {expanded ? (
            <div className="mt-4">
              <TimelineList events={orderedEvents} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
