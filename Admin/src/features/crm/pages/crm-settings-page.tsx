import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCrmOptionRows, useSaveCrmOption, useToggleCrmOption, useDeleteCrmOption, type CrmOptionRow,
} from "@/features/crm/options-hooks";

/** Mirrors Admin/src/components/crm/CRMSettings.jsx `modules` exactly — the full set of configurable CRM option lists. */
const moduleGroups = [
  {
    label: "Lead Settings",
    description: "Options shown on lead capture and qualification.",
    items: [
      { type: "cake_type", label: "Cake Types", description: "Cake product styles shown on lead forms." },
      { type: "cake_flavour", label: "Cake Flavours", description: "Flavours available to the sales team." },
      { type: "cake_product", label: "Cake Products", description: "Reusable cakes and product names used in commercial item tables." },
      { type: "product_rate", label: "Product Rates", description: "Standard product and cake rate references for staff." },
      { type: "occasion", label: "Occasions", description: "Events and occasions customers enquire about." },
      { type: "lead_source", label: "Lead Sources", description: "Where enquiries originate." },
      { type: "winning_reason", label: "Reasons for Won", description: "Why customers choose the bakery." },
      { type: "loss_reason", label: "Reasons for Lost", description: "Why opportunities do not convert." },
    ],
  },
  {
    label: "Quotation Settings",
    description: "Commercial terms used while quoting customers.",
    items: [
      { type: "quotation_status", label: "Quotation Statuses", description: "Statuses used in the quotation workflow." },
      { type: "payment_term", label: "Payment Terms", description: "Reusable commercial payment terms." },
      { type: "quotation_validity", label: "Validity Options", description: "Standard quotation validity periods." },
      { type: "sale_unit", label: "Units", description: "Units available for product quantities. kg and piece are provided by default." },
      { type: "product_rate", label: "Rates", description: "Standard product and cake rate references for staff." },
      { type: "tax_setting", label: "GST Rates", description: "Editable GST percentages used by quotation items, such as 0% and 18%." },
    ],
  },
  {
    label: "Order Settings",
    description: "Lifecycle and operations options for confirmed orders.",
    items: [
      { type: "order_status", label: "Order Statuses", description: "Customer order lifecycle options." },
      { type: "production_status", label: "Processing Statuses", description: "Operational preparation stages used by staff." },
      { type: "order_priority", label: "Order Priorities", description: "Priority labels for urgent and scheduled orders." },
      { type: "order_cancellation_reason", label: "Order Cancellation Reasons", description: "Reasons shown when cancelling an order." },
    ],
  },
  {
    label: "Invoice Settings",
    description: "Billing options shown on customer invoices.",
    items: [
      { type: "invoice_status", label: "Invoice Statuses", description: "Invoice lifecycle options." },
      { type: "payment_method", label: "Payment Methods", description: "Ways customers can make payment." },
      { type: "invoice_term", label: "Invoice Terms", description: "Reusable billing terms displayed on customer invoices." },
    ],
  },
  {
    label: "Delivery Settings",
    description: "Fulfilment options for the delivery team.",
    items: [
      { type: "delivery_method", label: "Delivery Methods", description: "Fulfilment methods for confirmed orders." },
      { type: "delivery_time_slot", label: "Delivery Time Slots", description: "Reusable delivery and pickup time windows." },
      { type: "delivery_area", label: "Delivery Areas", description: "Areas serviced by the delivery team." },
      { type: "delivery_failure_reason", label: "Delivery Failure Reasons", description: "Reasons shown when a delivery fails." },
    ],
  },
] as const;

type EditorState = { type: string; typeLabel: string; id?: string | number; name: string; sort_order: number };
type DeleteState = { type: string; row: CrmOptionRow };

function CrmSettingsPage() {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const saveOption = useSaveCrmOption();
  const deleteOption = useDeleteCrmOption();

  const save = async () => {
    if (!editor?.name.trim()) return;
    try {
      await saveOption.mutateAsync({
        id: editor.id, option_type: editor.type, name: editor.name.trim(),
        sort_order: editor.sort_order, is_active: true,
      });
      toast.success(editor.id ? "Option updated successfully" : "Option added successfully");
      setEditor(null);
    } catch {
      toast.error("Unable to save this option.");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOption.mutateAsync({ id: deleteTarget.row.id, optionType: deleteTarget.type });
      toast.success(`"${deleteTarget.row.name}" deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete this option.");
    }
  };

  return (
    <>
      <PageHeader
        title="CRM Settings"
        description="Manage every CRM option list and workflow configuration from one place."
      />

      <Accordion type="multiple" defaultValue={[moduleGroups[0].label]} className="space-y-4">
        {moduleGroups.map((group) => (
          <AccordionItem
            key={group.label}
            value={group.label}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline">
              <span className="text-left">
                <span className="block text-sm font-semibold">{group.label}</span>
                <span className="block text-xs font-normal text-muted-foreground">{group.description}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-border px-5 pt-3 pb-3">
              <Accordion type="multiple" className="space-y-2">
                {group.items.map((item) => (
                  <OptionTypeSection
                    key={item.type}
                    type={item.type}
                    label={item.label}
                    description={item.description}
                    onAdd={() =>
                      setEditor({ type: item.type, typeLabel: item.label, name: "", sort_order: 0 })
                    }
                    onEdit={(row) =>
                      setEditor({
                        type: item.type, typeLabel: item.label,
                        id: row.id, name: row.name, sort_order: row.sort_order,
                      })
                    }
                    onDelete={(row) => setDeleteTarget({ type: item.type, row })}
                  />
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit" : "Add"} {editor?.typeLabel}</DialogTitle></DialogHeader>
          {editor && (
            <div className="space-y-4">
              <Field label="Name" required>
                <Input autoFocus value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
              </Field>
              <Field label="Sort order">
                <Input type="number" value={editor.sort_order} onChange={(e) => setEditor({ ...editor, sort_order: Number(e.target.value) || 0 })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editor?.name.trim() || saveOption.isPending}>
              {saveOption.isPending ? "Saving…" : "Save option"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.row.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Existing records will retain this text.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep option</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** One option-type's own collapsible sub-section within an expanded group — its own query, fetched only while it's open. */
function OptionTypeSection({
  type,
  label,
  description,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: string;
  label: string;
  description: string;
  onAdd: () => void;
  onEdit: (row: CrmOptionRow) => void;
  onDelete: (row: CrmOptionRow) => void;
}) {
  return (
    <AccordionItem value={type} className="rounded-xl border border-border bg-surface-muted/40 px-4">
      <AccordionTrigger className="py-3 hover:no-underline">
        <span className="text-left">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs font-normal text-muted-foreground">{description}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pt-1 pb-4">
        <OptionTypeRows type={type} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      </AccordionContent>
    </AccordionItem>
  );
}

function OptionTypeRows({
  type,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: string;
  onAdd: () => void;
  onEdit: (row: CrmOptionRow) => void;
  onDelete: (row: CrmOptionRow) => void;
}) {
  const { data: rows, isLoading } = useCrmOptionRows(type);
  const toggleOption = useToggleCrmOption();

  const visibleRows = useMemo(
    () => [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [rows],
  );

  const toggle = async (row: CrmOptionRow) => {
    try { await toggleOption.mutateAsync({ id: row.id, is_active: !row.is_active }); }
    catch { toast.error("Unable to update availability."); }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : visibleRows.length === 0 ? (
        <EmptyState title="No options configured" description="Add the first reusable option for this workflow section." />
      ) : (
        <ul className="space-y-2">
          {visibleRows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground tabular">Sort order {row.sort_order}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={row.is_active}
                  onCheckedChange={() => toggle(row)}
                  aria-label={`${row.is_active ? "Disable" : "Enable"} ${row.name}`}
                />
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Delete ${row.name}`} onClick={() => onDelete(row)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CrmSettingsPage;
