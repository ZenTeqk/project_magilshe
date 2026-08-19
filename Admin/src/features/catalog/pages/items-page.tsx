import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inr } from "@/lib/data";
import {
  useInventoryItems, useInventoryCategories, useInventoryTaxCategories,
  useSaveInventoryItem, useDeleteInventoryItem,
  type InventoryItem,
} from "@/features/catalog/items-hooks";

type EditorState = {
  id?: number;
  name: string;
  category: string;
  description: string;
  tax_category: string;
  hsn_code: string;
  receiving_quantity: string;
  purchase_price: string;
  mrp_price: string;
  wholesale_price: string;
  retail_price: string;
  is_serialized: boolean;
  is_stock: boolean;
  is_deleted: boolean;
};

const emptyEditor: EditorState = {
  name: "",
  category: "",
  description: "",
  tax_category: "",
  hsn_code: "",
  receiving_quantity: "0",
  purchase_price: "0",
  mrp_price: "0",
  wholesale_price: "0",
  retail_price: "0",
  is_serialized: false,
  is_stock: false,
  is_deleted: false,
};

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ItemsPage() {
  const { data: items, isLoading } = useInventoryItems();
  const { data: categories } = useInventoryCategories();
  const { data: taxCategories } = useInventoryTaxCategories();
  const saveItem = useSaveInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const openEdit = (row: InventoryItem) =>
    setEditor({
      id: row.id,
      name: row.name ?? "",
      category: row.category ? String(row.category.id) : "",
      description: row.description ?? "",
      tax_category: row.tax_category ? String(row.tax_category.id) : "",
      hsn_code: row.hsn_code ?? "",
      receiving_quantity: String(row.receiving_quantity ?? 0),
      purchase_price: String(row.purchase_price ?? 0),
      mrp_price: String(row.mrp_price ?? 0),
      wholesale_price: String(row.wholesale_price ?? 0),
      retail_price: String(row.retail_price ?? 0),
      is_serialized: Boolean(row.is_serialized),
      is_stock: Boolean(row.is_stock),
      is_deleted: Boolean(row.is_deleted),
    });

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      toast.warning("Please enter item name");
      return;
    }
    try {
      const result = await saveItem.mutateAsync({
        id: editor.id,
        name: editor.name,
        category: editor.category ? Number(editor.category) : "",
        description: editor.description,
        tax_category: editor.tax_category ? Number(editor.tax_category) : "",
        hsn_code: editor.hsn_code,
        receiving_quantity: toNumber(editor.receiving_quantity),
        purchase_price: toNumber(editor.purchase_price),
        mrp_price: toNumber(editor.mrp_price),
        wholesale_price: toNumber(editor.wholesale_price),
        retail_price: toNumber(editor.retail_price),
        is_serialized: editor.is_serialized,
        is_stock: editor.is_stock,
        is_deleted: editor.is_deleted,
      });
      toast.success(result.message || (editor.id ? "Item updated" : "Item created"));
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget);
      toast.success("Item deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete this item.");
    }
  };

  return (
    <>
      <PageHeader
        title="Inventory Items"
        description="Manage reusable stock and pricing items used across billing and inventory."
        actions={<Button onClick={() => setEditor(emptyEditor)}><Plus className="size-4" /> Add item</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<InventoryItem>
          rows={items ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name ?? ""} ${r.category?.name ?? ""} ${r.hsn_code ?? ""}`}
          emptyTitle="No items yet"
          emptyDescription="Add your first inventory item."
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "name", header: "Name", sortValue: (r) => r.name ?? "", cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", header: "Category", cell: (r) => r.category?.name ?? "—" },
            { key: "hsn", header: "HSN", cell: (r) => <span className="tabular text-muted-foreground">{r.hsn_code || "—"}</span> },
            { key: "tax", header: "Tax", cell: (r) => r.tax_category ? <StatusChip status={r.tax_category.tax_category} tone="info" dot={false} /> : "—" },
            {
              key: "retail",
              header: "Retail price",
              align: "right",
              sortValue: (r) => Number(r.retail_price ?? 0),
              cell: (r) => <span className="tabular">{inr(Number(r.retail_price ?? 0))}</span>,
            },
            {
              key: "purchase",
              header: "Purchase price",
              align: "right",
              cell: (r) => <span className="tabular">{inr(Number(r.purchase_price ?? 0))}</span>,
            },
            {
              key: "stock",
              header: "Stock item",
              cell: (r) => (
                <StatusChip status={r.is_stock ? "Stock" : "Non-stock"} tone={r.is_stock ? "success" : "neutral"} dot={false} />
              ),
            },
          ]}
          rowActions={(r) => (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name ?? "item"}`} onClick={() => openEdit(r)}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Delete ${r.name ?? "item"}`} onClick={() => setDeleteTarget(r)}><Trash2 className="size-4" /></Button>
            </div>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit item" : "Add item"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Item name" required className="sm:col-span-2">
                <Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
              </Field>
              <Field label="Category">
                <Select value={editor.category} onValueChange={(v) => setEditor({ ...editor, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{(categories ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Tax category">
                <Select value={editor.tax_category} onValueChange={(v) => setEditor({ ...editor, tax_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select tax" /></SelectTrigger>
                  <SelectContent>{(taxCategories ?? []).map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.tax_category}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea rows={3} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </Field>
              <Field label="HSN code">
                <Input value={editor.hsn_code} onChange={(e) => setEditor({ ...editor, hsn_code: e.target.value })} />
              </Field>
              <Field label="Receiving quantity">
                <Input type="number" step="0.001" value={editor.receiving_quantity} onChange={(e) => setEditor({ ...editor, receiving_quantity: e.target.value })} />
              </Field>
              <Field label="Purchase price" required>
                <Input type="number" step="0.01" value={editor.purchase_price} onChange={(e) => setEditor({ ...editor, purchase_price: e.target.value })} />
              </Field>
              <Field label="MRP price">
                <Input type="number" step="0.01" value={editor.mrp_price} onChange={(e) => setEditor({ ...editor, mrp_price: e.target.value })} />
              </Field>
              <Field label="Wholesale price">
                <Input type="number" step="0.01" value={editor.wholesale_price} onChange={(e) => setEditor({ ...editor, wholesale_price: e.target.value })} />
              </Field>
              <Field label="Retail price">
                <Input type="number" step="0.01" value={editor.retail_price} onChange={(e) => setEditor({ ...editor, retail_price: e.target.value })} />
              </Field>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="text-sm font-medium">Serialized</span>
                <Switch checked={editor.is_serialized} onCheckedChange={(v) => setEditor({ ...editor, is_serialized: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="text-sm font-medium">Stock item</span>
                <Switch checked={editor.is_stock} onCheckedChange={(v) => setEditor({ ...editor, is_stock: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 sm:col-span-2">
                <span className="text-sm font-medium">Deleted</span>
                <Switch checked={editor.is_deleted} onCheckedChange={(v) => setEditor({ ...editor, is_deleted: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveItem.isPending}>
              {saveItem.isPending ? "Saving…" : editor?.id ? "Update item" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This marks the item as deleted and removes it from lists and search.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep item</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ItemsPage;
