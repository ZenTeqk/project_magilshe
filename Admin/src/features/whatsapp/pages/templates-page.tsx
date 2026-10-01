import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentAccess, hasPermission } from "@/features/auth/rbac";
import {
  useDeleteTemplate, useDuplicateTemplate, useEventCatalogue, useTemplates,
  TEMPLATE_CATEGORIES, TEMPLATE_STATUSES, type MessageTemplate,
} from "@/features/whatsapp/hooks";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", pending: "Pending", approved: "Active", rejected: "Rejected" };
const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  draft: "neutral", pending: "warning", approved: "success", rejected: "danger",
};

function TemplatesPage() {
  const navigate = useNavigate();
  const { data: access } = useCurrentAccess();
  const { data: templates, isLoading, isError, refetch } = useTemplates();
  const { data: catalogue } = useEventCatalogue();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const eventLabel = (value: string) => catalogue?.events.find((e) => e.value === value)?.label ?? (value || "Unassigned");

  const rows = useMemo(() => {
    let all = templates ?? [];
    if (category !== "all") all = all.filter((t) => t.category === category);
    if (status !== "all") all = all.filter((t) => t.status === status);
    return all;
  }, [templates, category, status]);

  const canManage = hasPermission(access, "whatsapp.templates.create");

  const remove = async (template: MessageTemplate) => {
    if (!window.confirm(`Delete "${template.name}"? This can't be undone.`)) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success("Template deleted");
    } catch {
      toast.error("Could not delete this template");
    }
  };

  const duplicate = async (template: MessageTemplate) => {
    try {
      const copy = await duplicateTemplate.mutateAsync(template.id);
      toast.success("Template duplicated as a draft");
      navigate(`/whatsapp/templates/${copy.id}/edit`);
    } catch {
      toast.error("Could not duplicate this template");
    }
  };

  return (
    <>
      <PageHeader
        title="WhatsApp Templates"
        description="Write, preview, and submit message templates for Meta's approval."
        actions={canManage && <Button onClick={() => navigate("/whatsapp/templates/new")}><Plus className="size-4" /> New template</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TEMPLATE_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState title="Could not load templates" action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : (
        <DataTable<MessageTemplate>
          rows={rows}
          rowKey={(t) => String(t.id)}
          searchKeys={(t) => `${t.name} ${t.category} ${t.language}`}
          onRowClick={(t) => navigate(`/whatsapp/templates/${t.id}/edit`)}
          emptyTitle="No templates yet"
          emptyDescription="Create your first WhatsApp template to start sending quotations, order updates, and delivery notices."
          rowActions={(t) => (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicate(t)}><Copy className="size-4" /></Button>
              {canManage && (
                <Button size="icon" variant="ghost" className="text-danger" title="Delete" onClick={() => remove(t)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
          columns={[
            { key: "name", header: "Name", sortValue: (t) => t.name, cell: (t) => <span className="font-medium">{t.name}</span> },
            { key: "category", header: "Category", sortValue: (t) => t.category, cell: (t) => <span className="capitalize">{t.category}</span> },
            { key: "language", header: "Language", cell: (t) => t.language },
            { key: "event", header: "Event", cell: (t) => eventLabel(t.event) },
            { key: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <StatusChip status={STATUS_LABEL[t.status] ?? t.status} tone={STATUS_TONE[t.status] ?? "neutral"} /> },
            { key: "updated_on", header: "Updated", sortValue: (t) => t.updated_on, cell: (t) => new Date(t.updated_on).toLocaleDateString() },
          ]}
        />
      )}
    </>
  );
}

export default TemplatesPage;
