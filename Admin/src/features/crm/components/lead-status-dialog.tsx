import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";
import { useCrmOptions, useUpdateLead, type Lead, type LeadStatus } from "@/features/crm/hooks";
import { OptionCombobox } from "@/features/crm/components/option-combobox";
import { useCreateCrmOptionFromText } from "@/features/crm/options-hooks";

export function LeadStatusDialog({
  lead,
  target,
  onOpenChange,
  onUpdated,
}: {
  lead: Lead;
  target: LeadStatus | null;
  onOpenChange: (v: boolean) => void;
  onUpdated: (lead: Lead, won: boolean) => void;
}) {
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const optionType = target === "Won" ? "winning_reason" : target === "Lost" ? "loss_reason" : "";
  const { data: liveReasons } = useCrmOptions(optionType);
  const reasons = liveReasons ?? [];
  const createOption = useCreateCrmOptionFromText();

  const updateLead = useUpdateLead();

  useEffect(() => {
    setFollowUpDate(lead.follow_up_date ?? "");
    setFollowUpTime(lead.follow_up_time ?? "");
    setFollowUpNotes("");
    setReason("");
    setError(null);
  }, [lead.id, target]);

  const save = async () => {
    setError(null);
    const payload: Record<string, unknown> = { status: target };
    if (target === "Follow-up") {
      payload["follow_up_date"] = followUpDate;
      payload["follow_up_time"] = followUpTime || null;
      payload["follow_up_notes"] = followUpNotes;
    }
    if (target === "Won" || target === "Lost") {
      payload[target === "Won" ? "winning_reason" : "loss_reason"] = reason;
    }
    try {
      const data = await updateLead.mutateAsync({ id: lead.id, payload });
      onUpdated(data, target === "Won");
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const message = response
        ? Object.values(response).flat().join(" ")
        : "Unable to update status.";
      setError(message);
    }
  };

  const label =
    target === "Follow-up"
      ? "Schedule follow-up"
      : target === "Won"
        ? "Mark as Won"
        : "Mark as Lost";
  const canSave =
    target === "Follow-up"
      ? !!followUpDate && !!followUpNotes.trim()
      : !!reason.trim();

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{lead.customer_name}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {target === "Follow-up" && (
          <div className="space-y-3">
            <Field label="Next follow-up date" required>
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
              />
            </Field>
            <Field label="Follow-up notes" required>
              <Textarea
                rows={3}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
              />
            </Field>
          </div>
        )}

        {(target === "Won" || target === "Lost") && (
          <div className="space-y-3">
            {reasons.length === 0 && (
              <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">No active reasons are configured. Add one in CRM Settings before changing this status.</p>
            )}
            <Field label={target === "Won" ? "Reason for winning" : "Reason for loss"} required>
              <OptionCombobox value={reason} options={reasons} onChange={setReason} onCreateOption={createOption(optionType, reasons)} placeholder="Select or type reason" portal />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!canSave || updateLead.isPending}>
            {updateLead.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
