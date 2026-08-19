import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  useDeliveryPersons,
  useSaveDeliveryPerson,
  type DeliveryPersonRecord,
} from "@/features/operations/operations-hooks";

type EditorState = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  alternate_phone: string;
  service_area: string;
  joining_date: string;
  status: boolean;
  notes: string;
  image: File | null;
  preview: string;
};

const emptyEditor: EditorState = { name: "", phone: "", email: "", dob: "", address: "", alternate_phone: "", service_area: "", joining_date: "", status: true, notes: "", image: null, preview: "" };

function DeliveryPersonPage() {
  const navigate = useNavigate();
  const { data: people, isLoading } = useDeliveryPersons();
  const savePerson = useSaveDeliveryPerson();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const openEdit = (row: DeliveryPersonRecord) => setEditor({
    id: row.id, name: row.name ?? "", phone: row.phone ?? "", email: row.email ?? "",
    dob: row.dob ?? "", address: row.address ?? "", image: null, preview: row.image_url ?? "",
    alternate_phone: row.alternate_phone ?? "", service_area: row.service_area ?? "", joining_date: row.joining_date ?? "", status: row.status, notes: row.notes ?? "",
  });

  const onImageChange = (file: File | null) => {
    if (!editor) return;
    setEditor({ ...editor, image: file, preview: file ? URL.createObjectURL(file) : editor.preview });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) { toast.warning("Please Enter Person name"); return; }
    if (!editor.phone.trim()) { toast.warning("Please Enter Mobile Number"); return; }
    try {
      const result = await savePerson.mutateAsync({
        ...(editor.id ? { id: editor.id } : {}), name: editor.name, phone: editor.phone, email: editor.email,
        dob: editor.dob || null, address: editor.address, alternate_phone: editor.alternate_phone, service_area: editor.service_area, joining_date: editor.joining_date || null, status: editor.status, notes: editor.notes,
        ...(editor.image ? { image: editor.image } : {}),
      });
      toast.success(result.message || (editor.id ? "Delivery Person Updated Successfully" : "Delivery Person Created Successfully"));
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Delivery Staff"
        description="Reusable internal Magilshe delivery staff, availability and assignment history."
        actions={<Button onClick={() => setEditor(emptyEditor)}><Plus className="size-4" /> Add delivery staff</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<DeliveryPersonRecord>
          rows={people ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.phone} ${r.email} ${r.address}`}
          searchPlaceholder="Search delivery staff"
          onRowClick={(r) => navigate(`/delivery-management/staff/${r.id}`)}
          emptyTitle="No delivery persons"
          emptyDescription="Add your first delivery person."
          columns={[
            { key: "photo", header: "Photo", cell: (r) => r.image_url ? <img src={r.image_url} alt={r.name} className="size-10 rounded-full object-cover" /> : <span className="text-muted-foreground">—</span> },
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "name", header: "Delivery person", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "phone", header: "Mobile", cell: (r) => <span className="tabular">{r.phone}</span> },
            { key: "email", header: "Email", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
            { key: "dob", header: "Date of birth", cell: (r) => r.dob },
            { key: "address", header: "Address", cell: (r) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{r.address}</span> },
            { key: "status", header: "Status", cell: (r) => <span className={r.status ? "text-success" : "text-muted-foreground"}>{r.status ? "Active" : "Inactive"}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${r.name}`} onClick={(event) => { event.stopPropagation(); openEdit(r); }}>
              <Pencil className="size-4" />
            </Button>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit delivery person" : "Add delivery person"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3">
              <Field label="Name" required><Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Mobile number" required><Input value={editor.phone} onChange={(e) => setEditor({ ...editor, phone: e.target.value })} /></Field>
              <Field label="Email" required><Input type="email" value={editor.email} onChange={(e) => setEditor({ ...editor, email: e.target.value })} /></Field>
              <Field label="Date of birth" required><Input type="date" value={editor.dob} onChange={(e) => setEditor({ ...editor, dob: e.target.value })} /></Field>
              <Field label="Address" required><Textarea rows={3} value={editor.address} onChange={(e) => setEditor({ ...editor, address: e.target.value })} /></Field>
              <Field label="Alternate phone"><Input value={editor.alternate_phone} onChange={(e) => setEditor({ ...editor, alternate_phone: e.target.value })} /></Field>
              <Field label="Service area"><Input value={editor.service_area} onChange={(e) => setEditor({ ...editor, service_area: e.target.value })} /></Field>
              <Field label="Joining date"><Input type="date" value={editor.joining_date} onChange={(e) => setEditor({ ...editor, joining_date: e.target.value })} /></Field>
              <Field label="Notes"><Textarea rows={2} value={editor.notes} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.checked })} /> Active staff member</label>
              <Field label="Photo">
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />
              </Field>
              {editor.preview && <img src={editor.preview} alt="Delivery person preview" className="size-20 rounded-xl object-cover" />}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={savePerson.isPending}>
              {savePerson.isPending ? "Saving…" : editor?.id ? "Update delivery person" : "Add delivery person"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DeliveryPersonPage;
