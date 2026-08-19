import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLeadImport } from "@/features/crm/hooks";

export function LeadImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    success_count: number;
    failed_count: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);
  const importLead = useLeadImport();

  const submit = async () => {
    if (!file) return;
    try {
      const data = await importLead.mutateAsync(file);
      setResult(data);
    } catch {
      setResult({
        success_count: 0,
        failed_count: 0,
        errors: [{ row: 0, reason: "Import failed." }],
      });
    }
  };

  const close = (v: boolean) => {
    if (!v) {
      setFile(null);
      setResult(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>Upload a CSV or XLSX file of leads to bulk-create.</DialogDescription>
        </DialogHeader>

        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-dashed border-border-strong bg-card px-3 py-5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-primary"
        />

        {result && (
          <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-3 text-sm">
            <p className="font-medium">
              {result.success_count} imported · {result.failed_count} failed
            </p>
            {result.errors.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            Close
          </Button>
          <Button type="button" onClick={submit} disabled={!file || importLead.isPending}>
            {importLead.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
