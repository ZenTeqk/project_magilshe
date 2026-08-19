import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCatalogCakes, type CatalogCake } from "@/features/catalog/catalog-hooks";
import {
  useMarketingOffers, useSaveMarketingOffer, useDeleteMarketingOffer, type MarketingOffer,
} from "@/features/marketing/marketing-hooks";

type EditorState = {
  id?: number;
  name: string;
  offer_per: string;
  offer_from: string;
  offer_to: string;
  selectedCakes: number[];
  image: File | null;
  imagePreview: string;
};

const emptyEditor: EditorState = {
  name: "", offer_per: "", offer_from: "", offer_to: "", selectedCakes: [], image: null, imagePreview: "",
};

function isActive(offer: MarketingOffer) {
  const now = new Date();
  return offer.status && now >= new Date(offer.offer_from) && now <= new Date(offer.offer_to);
}

function fmt(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// datetime-local expects "YYYY-MM-DDTHH:mm"
function toDateTimeLocal(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OffersPage() {
  const { data: offers, isLoading } = useMarketingOffers();
  const { data: cakes } = useCatalogCakes();
  const saveOffer = useSaveMarketingOffer();
  const deleteOffer = useDeleteMarketingOffer();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingOffer | null>(null);

  const openCreate = () => setEditor(emptyEditor);
  const openEdit = (row: MarketingOffer) => setEditor({
    id: row.id,
    name: row.name ?? "",
    offer_per: String(row.offer_per ?? ""),
    offer_from: toDateTimeLocal(row.offer_from),
    offer_to: toDateTimeLocal(row.offer_to),
    selectedCakes: row.cake_list ?? [],
    image: null,
    imagePreview: row.url ?? "",
  });

  const idListForSelection = useMemo(() => {
    if (!editor) return [] as number[];
    const cakeList = cakes ?? [];
    return cakeList
      .filter((c) => editor.selectedCakes.includes(c.id))
      .flatMap((c) => c.price_list.map((p) => p.id));
  }, [editor, cakes]);

  const toggleCake = (cake: CatalogCake) => {
    if (!editor) return;
    const selected = editor.selectedCakes.includes(cake.id);
    setEditor({
      ...editor,
      selectedCakes: selected
        ? editor.selectedCakes.filter((id) => id !== cake.id)
        : [...editor.selectedCakes, cake.id],
    });
  };

  const onImageChange = (file: File | undefined) => {
    if (!file || !editor) return;
    setEditor({ ...editor, image: file, imagePreview: URL.createObjectURL(file) });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) { toast.warning("Please Enter Offer Name"); return; }
    if (!editor.offer_from) { toast.warning("Please Enter Offer from Date"); return; }
    if (!editor.offer_to) { toast.warning("Please Enter Offer end Date"); return; }
    const pct = Number(editor.offer_per);
    if (!editor.offer_per || Number.isNaN(pct) || pct <= 0) { toast.warning("Please Enter Offer Percentage"); return; }
    if (pct > 99.9) { toast.warning("Discount percentage cannot exceed 99.9"); return; }
    try {
      const result = await saveOffer.mutateAsync({
        id: editor.id,
        name: editor.name,
        offer_per: pct,
        offer_from: editor.offer_from,
        offer_to: editor.offer_to,
        id_list: idListForSelection,
        image: editor.image,
      });
      toast.success(result.message || (editor.id ? "Offer Updated Successfully" : "Offer Added Successfully"));
      setEditor(null);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "An unexpected error occurred");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteOffer.mutateAsync(deleteTarget.id);
      toast.success(result.message || "Offer Deleted Successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete this offer.");
    }
  };

  return (
    <>
      <PageHeader
        title="Offers"
        description="Schedule promotional discounts for selected bakery products."
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Add offer</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <DataTable<MarketingOffer>
          rows={offers ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => r.name}
          emptyTitle="No offers scheduled"
          emptyDescription="Add the first promotional offer."
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "name", header: "Offer", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "discount", header: "Discount", align: "right", cell: (r) => <span className="tabular font-medium">{r.offer_per} %</span> },
            { key: "starts", header: "Starts", cell: (r) => <span className="text-muted-foreground">{fmt(r.offer_from)}</span> },
            { key: "ends", header: "Ends", cell: (r) => <span className="text-muted-foreground">{fmt(r.offer_to)}</span> },
            { key: "products", header: "Products", align: "right", cell: (r) => <span className="tabular">{r.cake_list?.length ?? 0}</span> },
            { key: "status", header: "Status", cell: (r) => <StatusChip status={isActive(r) ? "Active" : "Inactive"} tone={isActive(r) ? "success" : "neutral"} /> },
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit offer" : "Add offer"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Offer name" required className="sm:col-span-2">
                <Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
              </Field>
              <Field label="Offer starts" required>
                <Input type="datetime-local" value={editor.offer_from} onChange={(e) => setEditor({ ...editor, offer_from: e.target.value })} />
              </Field>
              <Field label="Offer ends" required>
                <Input type="datetime-local" value={editor.offer_to} onChange={(e) => setEditor({ ...editor, offer_to: e.target.value })} />
              </Field>
              <Field label="Discount percentage" required help="0 – 99.9">
                <Input type="number" min={0} max={99.9} step={0.1} value={editor.offer_per} onChange={(e) => setEditor({ ...editor, offer_per: e.target.value })} />
              </Field>
              <Field label="Offered products" className="sm:col-span-2" help="Select the products this offer applies to.">
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
                  {(cakes ?? []).map((cake) => {
                    const selected = editor.selectedCakes.includes(cake.id);
                    return (
                      <button
                        key={cake.id} type="button" onClick={() => toggleCake(cake)}
                        className={selected ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground" : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}
                      >
                        {cake.name}
                      </button>
                    );
                  })}
                  {!cakes?.length && <span className="text-xs text-muted-foreground">No products available</span>}
                </div>
              </Field>
              <Field label="Offer image" className="sm:col-span-2">
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => onImageChange(e.target.files?.[0])} />
              </Field>
              {editor.imagePreview && (
                <img src={editor.imagePreview} alt="Offer preview" className="sm:col-span-2 h-32 w-full rounded-lg border border-border object-cover" />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveOffer.isPending}>
              {saveOffer.isPending ? "Saving…" : editor?.id ? "Update offer" : "Add offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the offer from the schedule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep offer</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default OffersPage;
