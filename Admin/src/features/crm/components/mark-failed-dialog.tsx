import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/field";
import { useCrmOptions } from "@/features/crm/hooks";
import { configuredOptions } from "@/features/crm/config-options";
import { OptionCombobox } from "@/features/crm/components/option-combobox";
import { useCreateCrmOptionFromText } from "@/features/crm/options-hooks";

export function MarkFailedDialog({
  open, onOpenChange, busy, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { data: liveReasons } = useCrmOptions("delivery_failure_reason");
  const reasons = configuredOptions(liveReasons);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createOption = useCreateCrmOptionFromText();

  const finalReason = reason;

  const submit = async () => {
    if (!finalReason.trim()) { setError("Failure reason is required."); return; }
    setError(null);
    try {
      await onSubmit(finalReason);
      setReason("");
      onOpenChange(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(response ? Object.values(response).flat().join(" · ") : "Could not record the failure reason");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark delivery as failed</DialogTitle>
          <DialogDescription>A failure reason is required.</DialogDescription>
        </DialogHeader>
        {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <Field label="Failure reason" required>
          <OptionCombobox value={reason} options={reasons} onChange={setReason} onCreateOption={createOption("delivery_failure_reason", reasons)} placeholder="Select or type reason" />
          {!reasons.length && <p className="text-xs text-warning">Add an active failure reason in CRM Settings.</p>}
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={busy || !finalReason.trim()} onClick={submit}>Mark Failed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
