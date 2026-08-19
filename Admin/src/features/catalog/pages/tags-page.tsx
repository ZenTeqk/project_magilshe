import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogTags, useSaveCatalogTag, type CatalogTag } from "@/features/catalog/catalog-hooks";

function TagsPage() {
  const { data: tags, isLoading } = useCatalogTags();
  const saveTag = useSaveCatalogTag();
  const [editor, setEditor] = useState<{ id?: number; tag: string } | null>(null);

  const save = async () => {
    if (!editor?.tag.trim()) return;
    try {
      await saveTag.mutateAsync({ id: editor.id, tag: editor.tag.trim() });
      toast.success(editor.id ? "Tag updated successfully" : "Tag created successfully");
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Tags"
        description="Manage catalogue labels used to classify products."
        actions={<Button onClick={() => setEditor({ tag: "" })}><Plus className="size-4" /> Add tag</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={2} />
      ) : (
        <DataTable<CatalogTag>
          rows={tags ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => r.tag}
          emptyTitle="No tags yet"
          emptyDescription="Add your first catalogue tag."
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "tag", header: "Tag", sortValue: (r) => r.tag, cell: (r) => <span className="font-medium">{r.tag}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.tag}`} onClick={() => setEditor({ id: r.id, tag: r.tag })}>
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit tag" : "Add tag"}</DialogTitle></DialogHeader>
          {editor && (
            <Field label="Tag name" required>
              <Input autoFocus value={editor.tag} onChange={(e) => setEditor({ ...editor, tag: e.target.value })} />
            </Field>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editor?.tag.trim() || saveTag.isPending}>
              {saveTag.isPending ? "Saving…" : editor?.id ? "Update tag" : "Add tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TagsPage;
