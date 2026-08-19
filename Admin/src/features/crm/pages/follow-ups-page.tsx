import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, MessageSquarePlus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusChip } from "@/components/shared/status-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCompleteFollowUp,
  useFollowUpNote,
  useFollowUps,
  useUpdateLead,
  type FollowUpRow,
} from "@/features/crm/hooks";

type Scope = "all" | "today" | "overdue" | "tomorrow" | "week" | "completed";

function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function priority(date?: string) {
  if (!date) return "Upcoming";
  const today = localDateStr();
  if (date < today) return "Overdue";
  if (date === today) return "Today";
  return "Upcoming";
}

function FollowUpsPage() {
  const { data, isLoading } = useFollowUps();
  const completeFollowUp = useCompleteFollowUp();
  const followUpNote = useFollowUpNote();
  const updateLead = useUpdateLead();

  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");
  const [completeTarget, setCompleteTarget] = useState<{
    id: string | number;
    name: string;
  } | null>(null);
  const [editor, setEditor] = useState<{ mode: "note" | "reschedule"; row: FollowUpRow } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const rows = data?.results ?? [];
  const completed = data?.completed_results ?? [];

  const scoped = useMemo(() => {
    if (scope === "completed") return completed;
    const today = localDateStr();
    const tomorrow = localDateStr(1);
    const weekEnd = localDateStr(7);
    let out = rows;
    if (scope === "today") out = out.filter((r) => r.follow_up_date === today);
    if (scope === "overdue") out = out.filter((r) => (r.follow_up_date ?? "") < today);
    if (scope === "tomorrow") out = out.filter((r) => r.follow_up_date === tomorrow);
    if (scope === "week")
      out = out.filter(
        (r) => (r.follow_up_date ?? "") >= today && (r.follow_up_date ?? "") <= weekEnd,
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    return out;
  }, [rows, completed, scope, search]);

  const openEditor = (mode: "note" | "reschedule", row: FollowUpRow) => {
    setEditor({ mode, row });
    setNote("");
    setRescheduleDate(row.follow_up_date ?? "");
    setRescheduleTime(row.follow_up_time ?? "");
  };

  const saveEditor = async () => {
    if (!editor) return;
    const id = editor.row.id;
    try {
      if (editor.mode === "note") {
        await followUpNote.mutateAsync({ id, note });
        toast.success("Note added");
      } else {
        await updateLead.mutateAsync({
          id,
          payload: {
            follow_up_date: rescheduleDate,
            follow_up_time: rescheduleTime || null,
            follow_up_notes: note,
          },
        });
        toast.success("Follow-up rescheduled");
      }
      setEditor(null);
    } catch {
      toast.error("Unable to update follow-up");
    }
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    try {
      await completeFollowUp.mutateAsync(completeTarget.id);
      toast.success("Follow-up completed");
    } catch {
      toast.error("Unable to complete follow-up");
    } finally {
      setCompleteTarget(null);
    }
  };

  const scopes: { key: Scope; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "overdue", label: "Overdue" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "week", label: "This week" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Every scheduled customer touchpoint, prioritized by urgency."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today's follow-ups"
          value={String(data?.summary.today ?? 0)}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Overdue"
          value={String(data?.summary.overdue ?? 0)}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Completed today"
          value={String(data?.summary.completed_today ?? 0)}
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {scopes.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${scope === s.key ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"}`}
          >
            {s.label}
          </button>
        ))}
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto h-8 w-56"
        />
      </div>

      <SectionCard padded={false}>
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : scoped.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description="You're all caught up for this view."
            icon={<CheckCircle2 className="size-7" />}
          />
        ) : (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-surface-muted/80 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Occasion</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Next follow-up</th>
                  <th className="px-5 py-3">Notes</th>
                  {scope !== "completed" && <th className="px-5 py-3 text-right">Quick actions</th>}
                </tr>
              </thead>
              <tbody>
                {scoped.map((r) => {
                  const p = priority(r.follow_up_date as string | undefined);
                  return (
                    <tr
                      key={String(r.id)}
                      className="border-t border-border hover:bg-surface-muted/60"
                    >
                      <td className="px-5 py-3">
                        <Link
                          to={`/crm/leads/${r.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.lead_no ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="block font-medium">
                          {String(r.customer_name ?? r.name ?? "")}
                        </span>
                        <a href={`tel:${r.phone}`} className="block text-xs text-muted-foreground">
                          {String(r.phone ?? "")}
                        </a>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {String(r.occasion ?? "—")}
                      </td>
                      <td className="px-5 py-3">
                        <StatusChip status={String(r.status ?? "")} />
                      </td>
                      <td className="px-5 py-3">
                        {scope === "completed" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <>
                            <StatusChip
                              status={p}
                              tone={p === "Overdue" ? "danger" : p === "Today" ? "warning" : "info"}
                              dot={false}
                            />
                            <span className="ml-2 text-xs text-muted-foreground">
                              {String(r.follow_up_date ?? "")} {String(r.follow_up_time ?? "")}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="max-w-40 truncate px-5 py-3 text-xs text-muted-foreground">
                        {String(r.follow_up_notes ?? "—")}
                      </td>
                      {scope !== "completed" && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Add note"
                              onClick={() => openEditor("note", r)}
                            >
                              <MessageSquarePlus className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Reschedule"
                              onClick={() => openEditor("reschedule", r)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Complete"
                              onClick={() =>
                                setCompleteTarget({ id: r.id, name: String(r.customer_name ?? "") })
                              }
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "note" ? "Add follow-up note" : "Reschedule follow-up"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editor?.mode === "reschedule" && (
              <>
                <Field label="Next follow-up date" required>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label={editor?.mode === "note" ? "Note" : "Notes"} required>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEditor}
              disabled={!note.trim() || (editor?.mode === "reschedule" && !rescheduleDate)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={completeTarget !== null}
        onOpenChange={(v) => !v && setCompleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark the follow-up for {completeTarget?.name} as complete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This clears the scheduled follow-up date. The lead stays in Follow-up until its status
              is changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FollowUpsPage;
