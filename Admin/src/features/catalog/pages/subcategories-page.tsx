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
  useCatalogSubCategories, useSaveCatalogSubCategory, useCatalogCategories,
  type CatalogSubCategory, type SaveSubCategoryInput,
} from "@/features/catalog/catalog-hooks";

type EditorState = Omit<SaveSubCategoryInput, "image" | "main_category"> & {
  imagePreview: string; image: File | null; main_category: string;
};

const emptyEditor: EditorState = {
  name: "", description: "", meta_title: "", meta_description: "", slug: "", content: "",
  image: null, imagePreview: "", main_category: "",
};

function SubCategoriesPage() {
  const { data: subCategories, isLoading } = useCatalogSubCategories();
  const { data: categories } = useCatalogCategories();
  const saveSubCategory = useSaveCatalogSubCategory();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const openEdit = (row: CatalogSubCategory) => setEditor({
    id: row.id, name: row.name ?? "", description: row.description ?? "",
    meta_title: row.meta_title ?? "", meta_description: row.meta_description ?? "",
    slug: row.slug ?? "", content: row.content ?? "", image: null, imagePreview: row.image_url ?? "",
    main_category: row.main_category ? String(row.main_category.id) : "",
  });

  const save = async () => {
    if (!editor?.name.trim()) { toast.warning("Please enter category name"); return; }
    if (!editor.main_category) { toast.warning("Please choose main category"); return; }
    if (!editor.image && !editor.imagePreview) { toast.warning("Please select image"); return; }
    try {
      const result = await saveSubCategory.mutateAsync({ ...editor, main_category: Number(editor.main_category) });
      toast.success(result.message || (editor.id ? "Subcategory updated" : "Subcategory created"));
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Cake Subcategories"
        description="Maintain the second level of the website product catalogue."
        actions={<Button onClick={() => setEditor(emptyEditor)}><Plus className="size-4" /> Add subcategory</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <DataTable<CatalogSubCategory>
          rows={subCategories ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.main_category?.name ?? ""}`}
          emptyTitle="No subcategories yet"
          emptyDescription="Add your first subcategory."
          columns={[
            { key: "image", header: "Image", cell: (r) => r.image_url ? <img src={r.image_url} alt={r.name} className="size-10 rounded-lg object-cover" /> : <span className="text-muted-foreground">—</span> },
            { key: "name", header: "Subcategory", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "main_category", header: "Main category", cell: (r) => <span>{r.main_category?.name ?? "—"}</span> },
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
          <DialogHeader><DialogTitle>{editor?.id ? "Edit subcategory" : "Add subcategory"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Subcategory name" required><Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Main category" required>
                <Select value={editor.main_category} onValueChange={(v) => setEditor({ ...editor, main_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{(categories ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} /></Field>
              <Field label="Meta title"><Input value={editor.meta_title} onChange={(e) => setEditor({ ...editor, meta_title: e.target.value })} /></Field>
              <Field label="Meta description"><Textarea rows={2} value={editor.meta_description} onChange={(e) => setEditor({ ...editor, meta_description: e.target.value })} /></Field>
              <Field label="Subcategory image" required={!editor.imagePreview} className="sm:col-span-2">
                <input
                  type="file" accept="image/*" className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setEditor({ ...editor, image: file, imagePreview: file ? URL.createObjectURL(file) : editor.imagePreview });
                  }}
                />
              </Field>
              {editor.imagePreview && <img src={editor.imagePreview} alt="Subcategory preview" className="h-24 w-24 rounded-xl object-cover" />}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveSubCategory.isPending}>
              {saveSubCategory.isPending ? "Saving…" : editor?.id ? "Update subcategory" : "Add subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SubCategoriesPage;
