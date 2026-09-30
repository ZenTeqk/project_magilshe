import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Gift,
  IndianRupee,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export const agendaTypes = [
  "order",
  "delivery",
  "payment",
  "follow_up",
  "event",
  "reminder",
  "completed",
] as const;
export type AgendaType = (typeof agendaTypes)[number];

export type AgendaItem = {
  key: string;
  type: AgendaType;
  completed_kind: "delivery" | "payment" | "follow_up" | "reminder" | null;
  date: string;
  time: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  amount: string | null;
  overdue: boolean;
  record_no: string | null;
  link_id: number | null;
  customer: { id: number | null; name: string; phone: string | null };
};

export type AgendaResponse = {
  start: string;
  end: string;
  today: string;
  summary: Record<AgendaType, number> & { overdue: number; payment_pending_amount: string };
  items: AgendaItem[];
  overdue: AgendaItem[];
};

/** Presentation per agenda type. Class strings are literal so Tailwind picks them up. */
export const agendaMeta: Record<
  AgendaType,
  {
    label: string;
    short: string;
    icon: React.ComponentType<{ className?: string }>;
    chip: string;
    border: string;
    dot: string;
  }
> = {
  order: {
    label: "Upcoming orders",
    short: "Order",
    icon: ShoppingCart,
    chip: "bg-primary-soft text-primary",
    border: "border-l-primary",
    dot: "bg-primary",
  },
  delivery: {
    label: "Deliveries",
    short: "Delivery",
    icon: Truck,
    chip: "bg-info-soft text-info",
    border: "border-l-info",
    dot: "bg-info",
  },
  payment: {
    label: "Payment pending",
    short: "Payment",
    icon: IndianRupee,
    chip: "bg-danger-soft text-danger",
    border: "border-l-danger",
    dot: "bg-danger",
  },
  follow_up: {
    label: "Follow-ups",
    short: "Follow-up",
    icon: CalendarCheck,
    chip: "bg-accent-soft text-accent",
    border: "border-l-accent",
    dot: "bg-accent",
  },
  event: {
    label: "Customer events",
    short: "Event",
    icon: Gift,
    chip: "bg-success-soft text-success",
    border: "border-l-success",
    dot: "bg-success",
  },
  reminder: {
    label: "Reminders",
    short: "Reminder",
    icon: BellRing,
    chip: "bg-warning-soft text-warning",
    border: "border-l-warning",
    dot: "bg-warning",
  },
  completed: {
    label: "Completed",
    short: "Done",
    icon: CheckCircle2,
    chip: "bg-muted text-muted-foreground",
    border: "border-l-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

/** Route of the record an agenda item points at. */
export function agendaItemLink(item: AgendaItem): string | null {
  if (item.link_id == null) return null;
  const kind = item.type === "completed" ? item.completed_kind : item.type;
  switch (kind) {
    case "order":
    case "payment":
      return `/crm/orders/${item.link_id}`;
    case "delivery":
      return `/crm/delivery/${item.link_id}`;
    case "follow_up":
      return `/crm/leads/${item.link_id}/edit`;
    case "event":
    case "reminder":
      return `/crm/customers/${item.link_id}`;
    default:
      return null;
  }
}

/** crm/agenda/ — day-wise orders, deliveries, payments, follow-ups, events, reminders and completed work. */
export function useCrmAgenda(params: {
  start: string;
  end: string;
  customer?: string | number | undefined;
}) {
  return useQuery({
    queryKey: ["crm", "agenda", params.start, params.end, params.customer ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get<AgendaResponse>(endpoints.crm.agenda, {
        params: { start: params.start, end: params.end, customer: params.customer || undefined },
      });
      return data;
    },
    placeholderData: (previous) => previous,
  });
}
