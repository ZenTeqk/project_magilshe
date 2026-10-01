import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEventCatalogue, useMessageLog, type MessageLog } from "@/features/whatsapp/hooks";

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger" | "info"> = {
  queued: "neutral", sent: "info", delivered: "success", read: "success", failed: "danger",
};
const STATUS_LABEL: Record<string, string> = { queued: "Queued", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };

function MessageLogPage() {
  const [status, setStatus] = useState("all");
  const [event, setEvent] = useState("all");
  const { data: catalogue } = useEventCatalogue();
  const { data: messages, isLoading, isError, refetch } = useMessageLog({
    status: status === "all" ? undefined : status,
    event: event === "all" ? undefined : event,
  });

  const eventLabel = (value: string) => catalogue?.events.find((e) => e.value === value)?.label ?? (value || "—");

  return (
    <>
      <PageHeader title="Message Log" description="Every WhatsApp message sent, and what happened to it." />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={event} onValueChange={setEvent}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {catalogue?.events.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState title="Could not load the message log" action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <DataTable<MessageLog>
          rows={messages ?? []}
          rowKey={(m) => String(m.id)}
          searchKeys={(m) => `${m.customer_name} ${m.phone} ${m.source_label}`}
          emptyTitle="No messages sent yet"
          emptyDescription="Messages sent automatically or from a Send WhatsApp button will show up here."
          columns={[
            { key: "customer_name", header: "Customer", sortValue: (m) => m.customer_name, cell: (m) => (
              <span className="min-w-0"><span className="block font-medium">{m.customer_name || "—"}</span>
              <span className="block text-xs text-muted-foreground tabular">{m.phone}</span></span>
            ) },
            { key: "template_name", header: "Template", cell: (m) => m.template_name || "—" },
            { key: "event", header: "Triggered by", cell: (m) => (
              <span className="min-w-0"><span className="block">{eventLabel(m.event)}</span>
              {m.source_label && <span className="block text-xs text-muted-foreground">{m.source_label}</span>}</span>
            ) },
            { key: "status", header: "Status", sortValue: (m) => m.status, cell: (m) => (
              <div>
                <StatusChip status={STATUS_LABEL[m.status] ?? m.status} tone={STATUS_TONE[m.status] ?? "neutral"} />
                {m.status === "failed" && m.error_message && <p className="mt-1 max-w-xs text-xs text-danger">{m.error_message}</p>}
              </div>
            ) },
            { key: "sent_by_name", header: "Sent by", cell: (m) => m.sent_by_name },
            { key: "created_on", header: "When", sortValue: (m) => m.created_on, cell: (m) => new Date(m.created_on).toLocaleString() },
          ]}
        />
      )}
    </>
  );
}

export default MessageLogPage;
