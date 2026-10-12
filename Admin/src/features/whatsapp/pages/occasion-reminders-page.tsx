import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import { useOccasionReminders, useSendOccasionReminders } from "@/features/whatsapp/hooks";

const dayLabel = (days: number) => (days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`);

function OccasionRemindersPage() {
  const { data: access } = useCurrentAccess();
  const { data, isLoading, isError, refetch } = useOccasionReminders();
  const send = useSendOccasionReminders();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(() => data?.results ?? [], [data]);
  const sendable = rows.filter((r) => !r.blocked_reason);
  const canSend = hasPermission(access, "whatsapp.messages.send") && Boolean(data?.template_name);
  const allChecked = sendable.length > 0 && sendable.every((r) => selected.has(r.id));

  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });

  const sendReminders = async (ids?: number[]) => {
    try {
      const result = await send.mutateAsync(ids);
      setSelected(new Set());
      const parts = [`${result.sent} sent`];
      if (result.failed) parts.push(`${result.failed} failed (see Message Log)`);
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      (result.failed ? toast.warning : toast.success)(parts.join(" · "));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Could not send reminders");
    }
  };

  return (
    <>
      <PageHeader
        title="Occasion Reminders"
        description="Customers whose birthday or anniversary is coming up and haven't had this year's reminder yet."
      />

      {data && !data.enabled && (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            Occasion reminders are turned off, so nothing here is sent automatically.{" "}
            <Link to="/whatsapp/settings" className="text-primary hover:underline">Turn them on in Settings</Link>.
          </p>
        </SectionCard>
      )}
      {data?.enabled && !data.template_name && (
        <SectionCard>
          <p className="text-sm text-warning">
            Reminders can't be sent until exactly one Active template is assigned to Occasion Reminder.{" "}
            <Link to="/whatsapp/templates" className="text-primary hover:underline">Go to Templates</Link>.
          </p>
        </SectionCard>
      )}
      {data?.enabled && data.mode === "automatic" && (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            Automatic mode is on: these are sent every day at 10:00 AM. You can also send them now.
          </p>
        </SectionCard>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState title="Could not load reminders" action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No reminders due today"
          description="Occasions show up here once they're within their reminder window (7 days before, by default)."
        />
      ) : (
        <SectionCard
          title={`${rows.length} due`}
          description={data?.template_name ? `Sent with template ${data.template_name}` : undefined}
          actions={canSend ? (
            <div className="flex flex-wrap gap-2">
              {selected.size > 0 && (
                <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => sendReminders([...selected])}>
                  Send selected ({selected.size})
                </Button>
              )}
              <Button size="sm" disabled={send.isPending || sendable.length === 0} onClick={() => sendReminders()}>
                {send.isPending ? "Sending…" : `Send all (${sendable.length})`}
              </Button>
            </div>
          ) : undefined}
          padded={false}
        >
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  {canSend && (
                    <th className="w-10 px-5 py-3">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(checked) => setSelected(checked === true ? new Set(sendable.map((r) => r.id)) : new Set())}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Occasion</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    {canSend && (
                      <td className="px-5 py-3">
                        <Checkbox
                          checked={selected.has(row.id)}
                          disabled={Boolean(row.blocked_reason)}
                          onCheckedChange={(checked) => toggle(row.id, checked === true)}
                          aria-label={`Select ${row.customer_name}`}
                        />
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <Link to={`/crm/customers/${row.customer_id}`} className="block font-medium hover:underline">{row.customer_name}</Link>
                      <span className="block text-xs text-muted-foreground tabular">{row.phone || "—"}</span>
                    </td>
                    <td className="px-5 py-3">{row.occasion}</td>
                    <td className="px-5 py-3 tabular">
                      {new Date(`${row.occasion_date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      <span className="block text-xs text-muted-foreground">{dayLabel(row.days_until)}</span>
                    </td>
                    <td className="px-5 py-3">
                      {row.blocked_reason
                        ? <StatusChip status={row.blocked_reason} tone="neutral" />
                        : <StatusChip status="Ready to send" tone="info" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </>
  );
}

export default OccasionRemindersPage;
