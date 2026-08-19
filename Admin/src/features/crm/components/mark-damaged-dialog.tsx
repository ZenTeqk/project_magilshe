import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/field";

export function MarkDamagedDialog({
  open, onOpenChange, busy, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onSubmit: (description: string, files: File[]) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!description.trim()) { setError("Damage description is required."); return; }
    setError(null);
    try {
      await onSubmit(description, files);
      setDescription("");
      setFiles([]);
      onOpenChange(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(response ? Object.values(response).flat().join(" · ") : "Could not record the damage report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark delivery as damaged</DialogTitle>
          <DialogDescription>Example: Box crushed in transit, cake toppled during ride.</DialogDescription>
        </DialogHeader>
        {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>}
        <Field label="Damage description" required>
          <Textarea autoFocus rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Photos (optional)" help="JPG, PNG or WEBP. You can add more than one.">
          <input
            type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="text-sm"
            onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
          />
        </Field>
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {files.map((file, i) => (
              <img key={`${file.name}-${i}`} src={URL.createObjectURL(file)} alt={file.name} className="aspect-square rounded-lg border border-border object-cover" />
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={busy} onClick={submit}>Mark Damaged</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
