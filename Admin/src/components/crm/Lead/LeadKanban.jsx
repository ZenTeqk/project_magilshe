import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SectionCard, SkeletonCards, StatusBadge, formatDate } from "../../../admin/design-system";
import { crmStatusTone } from "../crmPresentation";

const COLUMNS = [
  { key: "Open", label: "Open" },
  { key: "Follow-up", label: "Follow-up" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
];

function LeadCard({ lead, dragging, onDragStart, onDragEnd }) {
  const navigate = useNavigate();
  return (
    <article
      className={`crm-lead-kanban__card${dragging ? " crm-lead-kanban__card--dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart(lead);
      }}
      onDragEnd={onDragEnd}
    >
      <header>
        <strong>{lead.customer_name}</strong>
        <StatusBadge tone={crmStatusTone(lead.status)}>{lead.status}</StatusBadge>
      </header>
      <dl>
        <div><dt>Phone</dt><dd>{lead.phone || "—"}</dd></div>
        <div><dt>Occasion</dt><dd>{lead.occasion || "—"}</dd></div>
        <div><dt>Cake</dt><dd>{lead.cake_type || "—"}</dd></div>
        <div><dt>Event</dt><dd>{formatDate(lead.event_date)}</dd></div>
      </dl>
      <footer>
        <button type="button" onClick={() => navigate(`/crm/leads/${lead.id}/edit`)}>Open lead</button>
      </footer>
    </article>
  );
}

function KanbanColumn({ column, leads, dragged, dragOverKey, setDragOverKey, canAccept, onDropColumn, startDrag, endDrag }) {
  const accepts = dragged ? canAccept(dragged, column.key) : false;
  const isOver = dragOverKey === column.key;
  return (
    <div
      className={`crm-lead-kanban__column${isOver && accepts ? " crm-lead-kanban__column--over" : ""}${isOver && dragged && !accepts ? " crm-lead-kanban__column--reject" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOverKey(column.key);
      }}
      onDragLeave={() => setDragOverKey((current) => (current === column.key ? null : current))}
      onDrop={(event) => {
        event.preventDefault();
        setDragOverKey(null);
        if (accepts) onDropColumn(column.key);
      }}
    >
      <header>
        <span>{column.label}</span>
        <strong>{leads.length}</strong>
      </header>
      <div className="crm-lead-kanban__column-body">
        {leads.length === 0 && <p className="crm-lead-kanban__empty">No leads</p>}
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} dragging={dragged?.id === lead.id} onDragStart={startDrag} onDragEnd={endDrag} />
        ))}
      </div>
    </div>
  );
}

export default function LeadKanban({ leads, loading, onOpenStatusChange, statusOptionsFor }) {
  const [dragged, setDragged] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((column) => [column.key, []]));
    leads.forEach((lead) => {
      const key = COLUMNS.some((column) => column.key === lead.status) ? lead.status : "Open";
      map[key].push(lead);
    });
    return map;
  }, [leads]);

  const canAccept = (lead, targetKey) => statusOptionsFor(lead).includes(targetKey);

  const startDrag = (lead) => setDragged(lead);
  const endDrag = () => {
    setDragged(null);
    setDragOverKey(null);
  };
  const handleDrop = (targetKey) => {
    if (dragged) onOpenStatusChange(dragged, targetKey);
    endDrag();
  };

  if (loading) {
    return (
      <SectionCard title="Leads" description="Loading pipeline…">
        <SkeletonCards count={4} />
      </SectionCard>
    );
  }

  return (
    <div className="crm-lead-kanban" role="group" aria-label="Lead pipeline board">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.key}
          column={column}
          leads={grouped[column.key]}
          dragged={dragged}
          dragOverKey={dragOverKey}
          setDragOverKey={setDragOverKey}
          canAccept={canAccept}
          onDropColumn={handleDrop}
          startDrag={startDrag}
          endDrag={endDrag}
        />
      ))}
    </div>
  );
}
