import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { useCrmOptions } from "@/features/crm/hooks";

const fallbackReasons = ["Customer unavailable", "Wrong address", "Customer cancelled", "Vehicle issue", "Unable to contact customer"];

export function MarkFailedDialog({
  open, onOpenChange, busy, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { data: liveReasons } = useCrmOptions("delivery_failure_reason");
  const reasons = liveReasons?.length ? liveReasons : fallbackReasons;
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const finalReason = reason === "__other__" ? custom : reason;

  const submit = async () => {
    if (!finalReason.trim()) { setError("Failure reason is required."); return; }
    setError(null);
    try {
      await onSubmit(finalReason);
      setReason("");
      setCustom("");
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
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
            <SelectContent>
              {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              <SelectItem value="__other__">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {reason === "__other__" && (
          <Field label="Custom reason" required>
            <Input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} />
          </Field>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={busy || !finalReason.trim()} onClick={submit}>Mark Failed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
