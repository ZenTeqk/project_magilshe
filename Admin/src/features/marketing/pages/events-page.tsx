import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogCakes } from "@/features/catalog/catalog-hooks";
import {
  useMarketingEvents, useSaveMarketingEvent, type MarketingEvent,
} from "@/features/marketing/marketing-hooks";

type EditorState = {
  id?: number;
  name: string;
  place: string;
  start: string;
  end: string;
  description: string;
  status: boolean;
  cake_id_list: number[];
  image: File | null;
  imagePreview: string;
};

const emptyEditor: EditorState = {
  name: "", place: "", start: "", end: "", description: "", status: true, cake_id_list: [], image: null, imagePreview: "",
};

function fmtDate(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function EventsPage() {
  const { data: events, isLoading } = useMarketingEvents();
  const { data: cakes } = useCatalogCakes();
  const saveEvent = useSaveMarketingEvent();

  const [editor, setEditor] = useState<EditorState | null>(null);

  const openCreate = () => setEditor(emptyEditor);
  const openEdit = (event: MarketingEvent) => setEditor({
    id: event.id,
    name: event.name ?? "",
    place: event.place ?? "",
    start: event.start ?? "",
    end: event.end ?? "",
    description: event.description ?? "",
    status: Boolean(event.status),
    cake_id_list: Array.isArray(event.cake_id_list) ? event.cake_id_list : [],
    image: null,
    imagePreview: event.url ?? "",
  });

  const toggleCake = (id: number) => {
    if (!editor) return;
    const selected = editor.cake_id_list.includes(id);
    setEditor({
      ...editor,
      cake_id_list: selected ? editor.cake_id_list.filter((c) => c !== id) : [...editor.cake_id_list, id],
    });
  };

  const onImageChange = (file: File | undefined) => {
    if (!file || !editor) return;
    setEditor({ ...editor, image: file, imagePreview: URL.createObjectURL(file) });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) { toast.warning("Please Enter Event Name"); return; }
    try {
      const result = await saveEvent.mutateAsync({
        id: editor.id,
        name: editor.name,
        place: editor.place,
        start: editor.start,
        end: editor.end,
        description: editor.description,
        status: editor.status,
        cake_id_list: editor.cake_id_list,
        image: editor.image,
      });
      toast.success(result.message || "Event saved successfully");
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Events"
        description="Manage bakery events and their associated product selections."
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Add event</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<MarketingEvent>
          rows={events ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.place ?? ""}`}
          emptyTitle="No events yet"
          emptyDescription="Add the first bakery event."
          columns={[
            { key: "image", header: "Image", cell: (r) => r.url ? <img src={r.url} alt={`${r.name || "Event"} preview`} className="size-9 rounded-lg object-cover" /> : <span className="text-muted-foreground">—</span> },
            { key: "name", header: "Event", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "place", header: "Place", cell: (r) => r.place || "—" },
            { key: "window", header: "Window", cell: (r) => <span className="text-muted-foreground">{fmtDate(r.start)} – {fmtDate(r.end)}</span> },
            { key: "products", header: "Products", align: "right", cell: (r) => <span className="tabular">{r.cake_id_list?.length ?? 0}</span> },
            { key: "status", header: "Status", cell: (r) => <StatusChip status={r.status ? "Active" : "Inactive"} tone={r.status ? "success" : "neutral"} /> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}><Pencil className="size-4" /></Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit event" : "Add event"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Event name" required className="sm:col-span-2">
                <Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
              </Field>
              <Field label="Place" className="sm:col-span-2">
                <Input value={editor.place} onChange={(e) => setEditor({ ...editor, place: e.target.value })} />
              </Field>
              <Field label="Start date">
                <Input type="date" value={editor.start} onChange={(e) => setEditor({ ...editor, start: e.target.value })} />
              </Field>
              <Field label="End date">
                <Input type="date" value={editor.end} onChange={(e) => setEditor({ ...editor, end: e.target.value })} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea rows={3} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </Field>
              <Field label="Curated products" className="sm:col-span-2" help="Select the products featured in this event.">
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
                  {(cakes ?? []).map((cake) => {
                    const selected = editor.cake_id_list.includes(cake.id);
                    return (
                      <button
                        key={cake.id} type="button" onClick={() => toggleCake(cake.id)}
                        className={selected ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground" : "rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}
                      >
                        {cake.name}
                      </button>
                    );
                  })}
                  {!cakes?.length && <span className="text-xs text-muted-foreground">No products available</span>}
                </div>
              </Field>
              <Field label="Event image" className="sm:col-span-2">
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => onImageChange(e.target.files?.[0])} />
              </Field>
              {editor.imagePreview && (
                <img src={editor.imagePreview} alt="Event preview" className="sm:col-span-2 aspect-video w-full rounded-lg border border-border object-cover" />
              )}
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Switch checked={editor.status} onCheckedChange={(v) => setEditor({ ...editor, status: v })} />
                Event active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveEvent.isPending}>{saveEvent.isPending ? "Saving…" : "Save event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EventsPage;
