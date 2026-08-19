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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCatalogSubUnits, useSaveCatalogSubUnit, useCatalogUnits, type CatalogSubUnit,
} from "@/features/catalog/catalog-hooks";

type EditorState = { id?: number; kg: string; description: string; unit: string };

function SubUnitsPage() {
  const { data: subUnits, isLoading } = useCatalogSubUnits();
  const { data: units } = useCatalogUnits();
  const saveSubUnit = useSaveCatalogSubUnit();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const save = async () => {
    if (!editor?.kg.trim() || !editor.unit) return;
    try {
      await saveSubUnit.mutateAsync({
        id: editor.id, kg: editor.kg.trim(), description: editor.description, unit: Number(editor.unit),
      });
      toast.success(editor.id ? "Sub-unit updated successfully" : "Sub-unit created successfully");
      setEditor(null);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(response?.message || "An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Sub-units"
        description="Manage sellable weights and measurements within each unit."
        actions={<Button onClick={() => setEditor({ kg: "", description: "", unit: "" })}><Plus className="size-4" /> Add sub-unit</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : (
        <DataTable<CatalogSubUnit>
          rows={subUnits ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.kg} ${r.unit?.name ?? ""}`}
          emptyTitle="No sub-units yet"
          emptyDescription="Add your first sub-unit."
          columns={[
            { key: "kg", header: "Sub-unit", sortValue: (r) => r.kg, cell: (r) => <span className="font-medium">{r.kg}</span> },
            { key: "unit", header: "Unit", cell: (r) => <span>{r.unit?.name ?? "—"}</span> },
            { key: "description", header: "Description", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
          ]}
          rowActions={(r) => (
            <Button
              variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.kg}`}
              onClick={() => setEditor({ id: r.id, kg: r.kg, description: r.description ?? "", unit: r.unit ? String(r.unit.id) : "" })}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit sub-unit" : "Add sub-unit"}</DialogTitle></DialogHeader>
          {editor && (
            <>
              <Field label="Weight" required>
                <Input autoFocus value={editor.kg} onChange={(e) => setEditor({ ...editor, kg: e.target.value })} />
              </Field>
              <Field label="Unit" required>
                <Select value={editor.unit} onValueChange={(v) => setEditor({ ...editor, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{(units ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea rows={4} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editor?.kg.trim() || !editor.unit || saveSubUnit.isPending}>
              {saveSubUnit.isPending ? "Saving…" : editor?.id ? "Update sub-unit" : "Add sub-unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SubUnitsPage;
