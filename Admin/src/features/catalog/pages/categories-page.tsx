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
import {
  useCatalogCategories, useSaveCatalogCategory, type CatalogCategory, type SaveCategoryInput,
} from "@/features/catalog/catalog-hooks";

type EditorState = Omit<SaveCategoryInput, "image"> & { imagePreview: string; image: File | null };

const emptyEditor: EditorState = {
  name: "", description: "", meta_title: "", meta_description: "", slug: "", content: "", image: null, imagePreview: "",
};

function CategoriesPage() {
  const { data: categories, isLoading } = useCatalogCategories();
  const saveCategory = useSaveCatalogCategory();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const openEdit = (row: CatalogCategory) => setEditor({
    id: row.id, name: row.name ?? "", description: row.description ?? "",
    meta_title: row.meta_title ?? "", meta_description: row.meta_description ?? "",
    slug: row.slug ?? "", content: row.content ?? "", image: null, imagePreview: row.image_url ?? "",
  });

  const save = async () => {
    if (!editor?.name.trim()) { toast.warning("Please enter category name"); return; }
    if (!editor.image && !editor.id) { toast.warning("Please select image"); return; }
    try {
      const result = await saveCategory.mutateAsync(editor);
      toast.success(result.message || (editor.id ? "Category updated" : "Category created"));
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Cake Categories"
        description="Organize products into customer-facing catalogue categories."
        actions={<Button onClick={() => setEditor(emptyEditor)}><Plus className="size-4" /> Add category</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : (
        <DataTable<CatalogCategory>
          rows={categories ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => r.name}
          emptyTitle="No cake categories"
          emptyDescription="Add your first catalogue category."
          columns={[
            { key: "image", header: "Image", cell: (r) => r.image_url ? <img src={r.image_url} alt={r.name} className="size-10 rounded-full object-cover" /> : <span className="text-muted-foreground">—</span> },
            { key: "name", header: "Category name", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "description", header: "Description", cell: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit main category" : "Add main category"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category name" required><Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Meta title"><Input value={editor.meta_title} onChange={(e) => setEditor({ ...editor, meta_title: e.target.value })} /></Field>
              <Field label="Category description" className="sm:col-span-2"><Textarea rows={3} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} /></Field>
              <Field label="Meta description" className="sm:col-span-2"><Textarea rows={2} value={editor.meta_description} onChange={(e) => setEditor({ ...editor, meta_description: e.target.value })} /></Field>
              <Field label="Meta keywords" className="sm:col-span-2"><Textarea rows={2} value={editor.content} onChange={(e) => setEditor({ ...editor, content: e.target.value })} /></Field>
              <Field label="Category image" required={!editor.id} className="sm:col-span-2">
                <input
                  type="file" accept="image/*" className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditor({ ...editor, image: file, imagePreview: file ? URL.createObjectURL(file) : editor.imagePreview });
                  }}
                />
              </Field>
              {editor.imagePreview && <img src={editor.imagePreview} alt="Category preview" className="h-24 w-24 rounded-xl object-cover" />}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveCategory.isPending}>
              {saveCategory.isPending ? "Saving…" : editor?.id ? "Update category" : "Add category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CategoriesPage;
