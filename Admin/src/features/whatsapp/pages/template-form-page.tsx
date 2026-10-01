import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useEventCatalogue, useSaveTemplate, useSubmitTemplate, useTemplate,
  TEMPLATE_CATEGORIES, HEADER_TYPES, type TemplateButton, type HeaderType,
} from "@/features/whatsapp/hooks";

const STATUS_LABEL: Record<string, string> = { draft: "Draft", pending: "Pending", approved: "Active", rejected: "Rejected" };
const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  draft: "neutral", pending: "warning", approved: "success", rejected: "danger",
};

const placeholderKeys = (body: string) =>
  [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]).filter((key): key is string => key !== undefined))]
    .sort((a, b) => Number(a) - Number(b));

function resolvePreview(body: string, variableMap: Record<string, string>, fieldLabels: Record<string, string>) {
  return placeholderKeys(body).reduce((text, key) => {
    const field = variableMap[key];
    const sample = field ? `[${fieldLabels[field] ?? field}]` : `{{${key}}}`;
    return text.replaceAll(`{{${key}}}`, sample);
  }, body);
}

const blank = {
  name: "", category: "utility" as (typeof TEMPLATE_CATEGORIES)[number], language: "en",
  header_type: "none" as HeaderType, header_text: "", header_media_url: "",
  body: "", footer_text: "", buttons: [] as TemplateButton[],
  event: "", variable_map: {} as Record<string, string>,
};

function TemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== "new";
  const navigate = useNavigate();
  const { data: existing } = useTemplate(isEdit ? id : undefined);
  const { data: catalogue } = useEventCatalogue();
  const saveTemplate = useSaveTemplate();
  const submitTemplate = useSubmitTemplate();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name, category: existing.category, language: existing.language,
        header_type: existing.header_type, header_text: existing.header_text, header_media_url: existing.header_media_url,
        body: existing.body, footer_text: existing.footer_text, buttons: existing.buttons,
        event: existing.event, variable_map: existing.variable_map,
      });
    }
  }, [existing]);

  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const isLocked = isEdit && existing ? !existing.is_editable : false;
  const fieldOptions = catalogue?.fields_by_event[form.event] ?? [];
  const fieldLabels = useMemo(() => Object.fromEntries(fieldOptions.map((f) => [f.value, f.label])), [fieldOptions]);
  const placeholders = placeholderKeys(form.body);
  const preview = resolvePreview(form.body, form.variable_map, fieldLabels);

  const setButton = (index: number, patch: Partial<TemplateButton>) =>
    setForm((f) => ({ ...f, buttons: f.buttons.map((b, i) => (i === index ? { ...b, ...patch } as TemplateButton : b)) }));
  const addButton = () => setForm((f) => ({ ...f, buttons: [...f.buttons, { type: "QUICK_REPLY", text: "" }] }));
  const removeButton = (index: number) => setForm((f) => ({ ...f, buttons: f.buttons.filter((_, i) => i !== index) }));

  const setVariable = (key: string, field: string) =>
    setForm((f) => ({ ...f, variable_map: { ...f.variable_map, [key]: field } }));

  const save = async () => {
    const clientErrors: Record<string, string> = {};
    if (!/^[a-z0-9_]+$/.test(form.name)) clientErrors["name"] = "Lower-case letters, numbers, and underscores only.";
    if (!form.body.trim()) clientErrors["body"] = "The message body can't be empty.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;
    try {
      const saved = await saveTemplate.mutateAsync({ id: isEdit ? Number(id) : undefined, ...form });
      toast.success(isEdit ? "Template saved" : "Template created");
      if (!isEdit) navigate(`/whatsapp/templates/${saved.id}/edit`, { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data) setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
      toast.error("Could not save this template");
    }
  };

  const submit = async () => {
    if (!id || !isEdit) return;
    try {
      await submitTemplate.mutateAsync(id);
      toast.success("Submitted to Meta for approval");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Could not submit this template");
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? form.name || "Edit template" : "New template"}
        description="Templates must be approved by Meta before they can be sent."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/whatsapp/templates")}><ArrowLeft className="size-4" /> Back</Button>
            {existing && <StatusChip status={STATUS_LABEL[existing.status] ?? existing.status} tone={STATUS_TONE[existing.status] ?? "neutral"} />}
          </>
        }
      />

      {existing?.status === "rejected" && existing.rejection_reason && (
        <SectionCard className="border-danger/40 bg-danger/5">
          <p className="text-sm font-semibold text-danger">Rejected by Meta</p>
          <p className="text-sm text-muted-foreground">{existing.rejection_reason}</p>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <SectionCard title="Template details">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" error={errors["name"]} required>
                <Input value={form.name} disabled={isLocked} placeholder="quotation_sent_v1" onChange={(e) => set("name", e.target.value.toLowerCase())} />
              </Field>
              <Field label="Category" required>
                <Select value={form.category} onValueChange={(v) => set("category", v as typeof form.category)} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Language">
                <Input value={form.language} disabled={isLocked} onChange={(e) => set("language", e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Header (optional)">
            <Field label="Header type">
              <Select value={form.header_type} onValueChange={(v) => set("header_type", v as HeaderType)} disabled={isLocked}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEADER_TYPES.map((h) => <SelectItem key={h} value={h} className="capitalize">{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {form.header_type === "text" && (
              <Field label="Header text">
                <Input value={form.header_text} disabled={isLocked} maxLength={60} onChange={(e) => set("header_text", e.target.value)} />
              </Field>
            )}
          </SectionCard>

          <SectionCard title="Message">
            <Field label="Body" error={errors["body"]} required>
              <Textarea
                rows={6} value={form.body} disabled={isLocked}
                placeholder={"Hi {{1}}, your quotation {{2}} is ready. Total: ₹{{3}}"}
                onChange={(e) => set("body", e.target.value)}
              />
            </Field>
            <Field label="Footer (optional)">
              <Input value={form.footer_text} disabled={isLocked} maxLength={60} onChange={(e) => set("footer_text", e.target.value)} />
            </Field>
          </SectionCard>

          <SectionCard title="Buttons (optional)">
            <div className="flex flex-col gap-3">
              {form.buttons.map((button, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
                  <Field label="Type">
                    <Select value={button.type} onValueChange={(v) => setButton(index, { type: v } as Partial<TemplateButton>)} disabled={isLocked}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Quick reply</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                        <SelectItem value="PHONE_NUMBER">Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Button text">
                    <Input value={button.text} disabled={isLocked} onChange={(e) => setButton(index, { text: e.target.value })} />
                  </Field>
                  {button.type === "URL" && (
                    <Field label="URL">
                      <Input value={button.url} disabled={isLocked} onChange={(e) => setButton(index, { url: e.target.value })} />
                    </Field>
                  )}
                  {button.type === "PHONE_NUMBER" && (
                    <Field label="Phone number">
                      <Input value={button.phone_number} disabled={isLocked} onChange={(e) => setButton(index, { phone_number: e.target.value })} />
                    </Field>
                  )}
                  {!isLocked && (
                    <Button size="icon" variant="ghost" className="text-danger" onClick={() => removeButton(index)}><Trash2 className="size-4" /></Button>
                  )}
                </div>
              ))}
              {!isLocked && form.buttons.length < 10 && (
                <Button size="sm" variant="outline" onClick={addButton}><Plus className="size-4" /> Add button</Button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Send on this event">
            <Field label="Event" help="Which CRM moment offers this template. Leave unassigned for manual sends only.">
              <Select value={form.event || "__none__"} onValueChange={(v) => set("event", v === "__none__" ? "" : v)} disabled={isLocked}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned (manual send only)</SelectItem>
                  {catalogue?.events.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {placeholders.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Fill each placeholder from a field on that record</p>
                {placeholders.map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-sm text-primary">{`{{${key}}}`}</span>
                    <Select value={form.variable_map[key] ?? ""} onValueChange={(v) => setVariable(key, v)} disabled={isLocked || !form.event}>
                      <SelectTrigger className="w-64"><SelectValue placeholder={form.event ? "Select a field" : "Assign an event first"} /></SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Preview">
            <div className="rounded-2xl bg-[#e5ded6] p-3">
              <div className="rounded-lg bg-[#dcf8c6] p-3 text-sm shadow-sm">
                {form.header_type === "text" && form.header_text && <p className="mb-1 font-semibold">{form.header_text}</p>}
                <p className="whitespace-pre-wrap">{preview || "Your message preview appears here."}</p>
                {form.footer_text && <p className="mt-1 text-xs text-muted-foreground">{form.footer_text}</p>}
                {form.buttons.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 border-t border-black/10 pt-2">
                    {form.buttons.map((b, i) => <p key={i} className="text-center text-xs font-medium text-primary">{b.text || "Button"}</p>)}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex flex-col gap-2">
              <Button onClick={save} disabled={isLocked || saveTemplate.isPending}>
                {saveTemplate.isPending ? "Saving…" : "Save draft"}
              </Button>
              {isEdit && existing?.is_editable && (
                <Button variant="outline" onClick={submit} disabled={submitTemplate.isPending}>
                  {submitTemplate.isPending ? "Submitting…" : "Submit for approval"}
                </Button>
              )}
              {isLocked && existing && (
                <p className="text-xs text-muted-foreground">
                  This template is {(STATUS_LABEL[existing.status] ?? existing.status).toLowerCase()} and can't be edited. Duplicate it from the list to make changes.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

export default TemplateFormPage;
