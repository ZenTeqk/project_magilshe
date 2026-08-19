import { useState } from "react";
import { Link } from "react-router-dom";
import { StatusChip } from "@/components/shared/status-chip";
import { cn } from "@/lib/utils";
import { leadStatusOptions, type Lead, type LeadStatus } from "@/features/crm/hooks";

const COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: "Open", label: "Open" },
  { key: "Follow-up", label: "Follow-up" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
];

export function LeadKanban({
  leads,
  onDropStatus,
}: {
  leads: Lead[];
  onDropStatus: (lead: Lead, status: LeadStatus) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | number | null>(null);

  const columnKeyFor = (lead: Lead) =>
    COLUMNS.some((c) => c.key === lead.status) ? lead.status : "Open";

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const cards = leads.filter((l) => columnKeyFor(l) === col.key);
        const draggingLead = leads.find((l) => l.id === draggingId);
        const canAccept = draggingLead
          ? leadStatusOptions(draggingLead.status).includes(col.key)
          : false;
        const isOver = dragOverKey === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (draggingLead && canAccept) {
                e.preventDefault();
                setDragOverKey(col.key);
              }
            }}
            onDragLeave={() => setDragOverKey((k) => (k === col.key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverKey(null);
              if (draggingLead && canAccept && col.key !== draggingLead.status)
                onDropStatus(draggingLead, col.key);
            }}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/40 p-3 transition-colors",
              isOver && canAccept && "border-primary bg-primary-soft/40",
              isOver && !canAccept && "border-danger bg-danger-soft/40",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold">{col.label}</p>
              <span className="text-xs text-muted-foreground">{cards.length}</span>
            </div>
            <div className="flex-1 space-y-2">
              {cards.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className="cursor-grab space-y-2 rounded-xl border border-border bg-card p-3 shadow-soft active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{lead.customer_name}</p>
                    <StatusChip status={lead.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.occasion} · {lead.cake_type}
                  </p>
                  <p className="text-xs text-muted-foreground">{lead.event_date}</p>
                  <Link
                    to={`/crm/leads/${lead.id}/edit`}
                    className="block text-xs font-medium text-primary hover:underline"
                  >
                    Open lead
                  </Link>
                </div>
              ))}
              {cards.length === 0 && <p className="px-1 text-xs text-muted-foreground">No leads</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
