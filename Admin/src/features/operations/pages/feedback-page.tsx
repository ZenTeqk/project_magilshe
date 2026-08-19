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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useFeedbackMessages,
  useSaveFeedback,
  useDeleteFeedback,
  type FeedbackRecord,
} from "@/features/operations/operations-hooks";

type EditorState = { id?: number; name: string; mobile: string; message: string; status: boolean; is_subscribed: boolean };
const blank: EditorState = { name: "", mobile: "", message: "", status: false, is_subscribed: false };

function FeedbackPage() {
  const { data: feedback, isLoading } = useFeedbackMessages();
  const saveFeedback = useSaveFeedback();
  const deleteFeedback = useDeleteFeedback();

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackRecord | null>(null);

  const save = async () => {
    if (!editor) return;
    try {
      await saveFeedback.mutateAsync(editor);
      toast.success("Feedback saved successfully");
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFeedback.mutateAsync(deleteTarget.id);
      toast.success("Feedback deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("An unexpected error occurred while deleting feedback");
    }
  };

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Manage customer feedback displayed or collected by the website."
        actions={<Button onClick={() => setEditor(blank)}><Plus className="size-4" /> Add feedback</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <DataTable<FeedbackRecord>
          rows={feedback ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.mobile} ${r.message}`}
          searchPlaceholder="Search feedback"
          emptyTitle="No feedback yet"
          columns={[
            { key: "id", header: "ID", cell: (r) => <span className="tabular text-muted-foreground">{r.id}</span> },
            { key: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "mobile", header: "Mobile", cell: (r) => <span className="tabular">{r.mobile}</span> },
            { key: "message", header: "Message", cell: (r) => <span className="line-clamp-1 max-w-md text-muted-foreground">{r.message}</span> },
            { key: "status", header: "Status", cell: (r) => <StatusChip status={r.status ? "Active" : "Inactive"} /> },
            { key: "subscribed", header: "Subscribed", cell: (r) => <StatusChip status={r.is_subscribed ? "Subscribed" : "Inactive"} /> },
          ]}
          rowActions={(r) => (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit feedback from ${r.name}`} onClick={() => setEditor({ id: r.id, name: r.name, mobile: r.mobile, message: r.message, status: r.status, is_subscribed: r.is_subscribed })}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label="Delete feedback" onClick={() => setDeleteTarget(r)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        />
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit feedback" : "Add feedback"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3">
              <Field label="Name"><Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></Field>
              <Field label="Mobile"><Input value={editor.mobile} onChange={(e) => setEditor({ ...editor, mobile: e.target.value })} /></Field>
              <Field label="Message"><Textarea rows={4} value={editor.message} onChange={(e) => setEditor({ ...editor, message: e.target.value })} /></Field>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={editor.status} onCheckedChange={(v) => setEditor({ ...editor, status: Boolean(v) })} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={editor.is_subscribed} onCheckedChange={(v) => setEditor({ ...editor, is_subscribed: Boolean(v) })} />
                  Subscribed
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveFeedback.isPending}>{saveFeedback.isPending ? "Saving…" : "Save feedback"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this feedback permanently?</AlertDialogTitle>
            <AlertDialogDescription>This removes the feedback entry from {deleteTarget?.name || "this customer"}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FeedbackPage;
