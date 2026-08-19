import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogUnits, useSaveCatalogUnit, type CatalogUnit } from "@/features/catalog/catalog-hooks";

function UnitsPage() {
  const { data: units, isLoading } = useCatalogUnits();
  const saveUnit = useSaveCatalogUnit();
  const [editor, setEditor] = useState<{ id?: number; name: string; description: string } | null>(null);

  const save = async () => {
    if (!editor?.name.trim()) return;
    try {
      await saveUnit.mutateAsync({ id: editor.id, name: editor.name.trim(), description: editor.description });
      toast.success(editor.id ? "Unit updated successfully" : "Unit created successfully");
      setEditor(null);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(response?.message || "An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Units"
        description="Manage product measurement units."
        actions={<Button onClick={() => setEditor({ name: "", description: "" })}><Plus className="size-4" /> Add unit</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : (
        <DataTable<CatalogUnit>
          rows={units ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.description ?? ""}`}
          emptyTitle="No units yet"
          emptyDescription="Add your first measurement unit."
          columns={[
            { key: "name", header: "Unit", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "description", header: "Description", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name}`} onClick={() => setEditor({ id: r.id, name: r.name, description: r.description ?? "" })}>
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit unit" : "Add unit"}</DialogTitle></DialogHeader>
          {editor && (
            <>
              <Field label="Unit name" required>
                <Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
              </Field>
              <Field label="Description">
                <Textarea rows={4} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editor?.name.trim() || saveUnit.isPending}>
              {saveUnit.isPending ? "Saving…" : editor?.id ? "Update unit" : "Add unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UnitsPage;
