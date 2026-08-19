import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inr } from "@/lib/data";
import {
  useCatalogCakes, useSaveCatalogCake, useDeleteCatalogCake, useCatalogSubCategories,
  useCatalogUnits, useCatalogSubUnits, useCatalogTags,
  type CatalogCake, type CakeKgListItem, type CakeImageItem,
} from "@/features/catalog/catalog-hooks";

type EditorState = {
  id?: number;
  name: string;
  description: string;
  seo_text: string;
  seo_url: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  content: string;
  sub_category: string;
  unit: string;
  tag: string[];
  kg_list: CakeKgListItem[];
  images: CakeImageItem[];
};

const emptyEditor: EditorState = {
  name: "", description: "", seo_text: "", seo_url: "", meta_title: "", meta_description: "",
  slug: "", content: "", sub_category: "", unit: "", tag: [], kg_list: [], images: [],
};

function ProductsPage() {
  const { data: cakes, isLoading } = useCatalogCakes();
  const { data: subCategories } = useCatalogSubCategories();
  const { data: units } = useCatalogUnits();
  const { data: subUnits } = useCatalogSubUnits();
  const { data: tags } = useCatalogTags();
  const saveCake = useSaveCatalogCake();
  const deleteCake = useDeleteCatalogCake();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogCake | null>(null);
  const [kgDraft, setKgDraft] = useState<{ kg_id: string; kg_price: string }>({ kg_id: "", kg_price: "" });

  const openEdit = (row: CatalogCake) => setEditor({
    id: row.id, name: row.name ?? "", description: row.description ?? "",
    seo_text: row.seo_text ?? "", seo_url: row.seo_url ?? "",
    meta_title: row.meta_title ?? "", meta_description: row.meta_description ?? "",
    slug: row.slug ?? "", content: row.content ?? "",
    sub_category: row.sub_category ? String(row.sub_category.id) : "",
    unit: row.unit ? String(row.unit.id) : "",
    tag: row.tag_details.map((t) => String(t.id)),
    kg_list: row.price_list.map((p) => ({ id: p.id, kg_id: p.kg_id, kg_name: p.kg, kg_price: p.price, is_deleted: false })),
    images: row.images.map((img) => ({ id: img.id, image: null, is_deleted: false, url: img.url })),
  });

  const addKgRow = () => {
    if (!kgDraft.kg_id || !kgDraft.kg_price || !editor) return;
    const kg = (subUnits ?? []).find((u) => String(u.id) === kgDraft.kg_id);
    if (!kg) return;
    if (editor.kg_list.some((row) => !row.is_deleted && row.kg_id === kg.id)) {
      toast.warning("already Added");
      return;
    }
    setEditor({
      ...editor,
      kg_list: [...editor.kg_list, { id: 0, kg_id: kg.id, kg_name: kg.kg, kg_price: kgDraft.kg_price, is_deleted: false }],
    });
    setKgDraft({ kg_id: "", kg_price: "" });
  };

  const toggleKgRow = (kg_id: number) => {
    if (!editor) return;
    setEditor({ ...editor, kg_list: editor.kg_list.map((row) => (row.kg_id === kg_id ? { ...row, is_deleted: !row.is_deleted } : row)) });
  };

  const onImagesChange = (files: File[]) => {
    if (!editor) return;
    const additions: CakeImageItem[] = files.map((file) => ({ id: 0, image: file, is_deleted: false, url: URL.createObjectURL(file) }));
    setEditor({ ...editor, images: [...editor.images, ...additions] });
  };

  const toggleImage = (index: number) => {
    if (!editor) return;
    setEditor({ ...editor, images: editor.images.map((img, i) => (i === index ? { ...img, is_deleted: !img.is_deleted } : img)) });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) { toast.warning("Please enter cake name"); return; }
    if (!editor.sub_category) { toast.warning("Please Select Sub Category"); return; }
    if (!editor.seo_url.trim()) { toast.warning("Please enter Seo URL"); return; }
    if (!editor.tag.length) { toast.warning("Please Select Tag"); return; }
    if (!editor.kg_list.filter((r) => !r.is_deleted).length) { toast.warning("Please Enter KG"); return; }
    const remainingImages = editor.images.filter((img) => !img.is_deleted);
    if (remainingImages.length === 0) { toast.warning("Please select image"); return; }
    try {
      const result = await saveCake.mutateAsync({
        id: editor.id, name: editor.name, description: editor.description,
        seo_text: editor.seo_text, seo_url: editor.seo_url,
        sub_category: Number(editor.sub_category), unit: Number(editor.unit),
        tag: editor.tag, meta_title: editor.meta_title, meta_description: editor.meta_description,
        slug: editor.slug, content: editor.content, kg_list: editor.kg_list, images: editor.images,
      });
      toast.success(result.message || (editor.id ? "Product updated" : "Product created"));
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCake.mutateAsync(deleteTarget.id);
      toast.success("Product deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete this product.");
    }
  };

  const availableSubUnits = (subUnits ?? []).filter((u) => editor?.unit && u.unit && String(u.unit.id) === editor.unit);

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage the bakery products displayed across the website and ordering flows."
        actions={<Button onClick={() => setEditor(emptyEditor)}><Plus className="size-4" /> Add product</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<CatalogCake>
          rows={cakes ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.sub_category?.name ?? ""}`}
          emptyTitle="No products available"
          columns={[
            { key: "name", header: "Product", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", header: "Category", cell: (r) => <span>{r.sub_category?.name ?? "—"}</span> },
            { key: "unit", header: "Unit", cell: (r) => <span>{r.unit?.name ?? "—"}</span> },
            { key: "tags", header: "Tags", cell: (r) => (
              <div className="flex flex-wrap gap-1">{r.tag_details.slice(0, 3).map((t) => <StatusChip key={t.id} status={t.tag} tone="info" dot={false} />)}</div>
            ) },
            { key: "images", header: "Images", cell: (r) => (
              <div className="flex -space-x-2">{r.images.slice(0, 4).map((img) => <img key={img.id} src={img.url} alt="" className="size-8 rounded-full border-2 border-card object-cover" />)}</div>
            ) },
          ]}
          rowActions={(r) => (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Delete ${r.name}`} onClick={() => setDeleteTarget(r)}><Trash2 className="size-4" /></Button>
            </div>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cake name" required className="sm:col-span-2"><Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Cake description" required className="sm:col-span-2"><Textarea rows={2} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} /></Field>
              <Field label="Sub Category" required>
                <Select value={editor.sub_category} onValueChange={(v) => setEditor({ ...editor, sub_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(subCategories ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Unit">
                <Select value={editor.unit} onValueChange={(v) => setEditor({ ...editor, unit: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(units ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="SEO text"><Input value={editor.seo_text} onChange={(e) => setEditor({ ...editor, seo_text: e.target.value })} /></Field>
              <Field label="SEO URL" required><Input value={editor.seo_url} onChange={(e) => setEditor({ ...editor, seo_url: e.target.value })} /></Field>
              <Field label="Meta title"><Input value={editor.meta_title} onChange={(e) => setEditor({ ...editor, meta_title: e.target.value })} /></Field>
              <Field label="Meta description"><Textarea rows={2} value={editor.meta_description} onChange={(e) => setEditor({ ...editor, meta_description: e.target.value })} /></Field>
              <Field label="Meta keywords" className="sm:col-span-2"><Textarea rows={2} value={editor.content} onChange={(e) => setEditor({ ...editor, content: e.target.value })} /></Field>

              <Field label="Tags" required className="sm:col-span-2">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-2">
                  {(tags ?? []).map((t) => {
                    const value = String(t.id);
                    const selected = editor.tag.includes(value);
                    return (
                      <button
                        key={t.id} type="button"
                        onClick={() => setEditor({ ...editor, tag: selected ? editor.tag.filter((v) => v !== value) : [...editor.tag, value] })}
                        className={selected ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground" : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}
                      >
                        {t.tag}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="sm:col-span-2 space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Weight-wise pricing</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Select value={kgDraft.kg_id} onValueChange={(v) => setKgDraft({ ...kgDraft, kg_id: v })}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Sub unit" /></SelectTrigger>
                    <SelectContent>{availableSubUnits.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.kg}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Price" className="w-28" value={kgDraft.kg_price} onChange={(e) => setKgDraft({ ...kgDraft, kg_price: e.target.value })} />
                  <Button type="button" size="sm" variant="outline" onClick={addKgRow}><Plus className="size-4" /> Add</Button>
                </div>
                {editor.kg_list.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {editor.kg_list.map((row) => (
                      <li key={row.kg_id} className={row.is_deleted ? "flex items-center justify-between text-muted-foreground line-through" : "flex items-center justify-between"}>
                        <span>{row.kg_name} — {inr(Number(row.kg_price))}</span>
                        <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => toggleKgRow(row.kg_id)}>
                          {row.is_deleted ? <Plus className="size-3.5" /> : <X className="size-3.5" />}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Field label="Product images" required={editor.images.every((i) => i.is_deleted)}>
                  <input type="file" multiple accept="image/*" className="text-sm" onChange={(e) => onImagesChange(Array.from(e.target.files ?? []))} />
                </Field>
                {editor.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editor.images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img.url} alt="" className={img.is_deleted ? "size-16 rounded-lg object-cover opacity-30" : "size-16 rounded-lg object-cover"} />
                        <button type="button" onClick={() => toggleImage(i)} className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-card shadow-soft">
                          {img.is_deleted ? <Plus className="size-3" /> : <X className="size-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveCake.isPending}>{saveCake.isPending ? "Saving…" : editor?.id ? "Update product" : "Add product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the product from the catalogue.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep product</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProductsPage;
