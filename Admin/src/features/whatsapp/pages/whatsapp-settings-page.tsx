import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCrmOptions } from "@/features/crm/hooks";
import {
  occasionKey, useEventCatalogue, useSaveWhatsAppSettings, useTemplates, useWhatsAppSettings,
  type WhatsAppSettings,
} from "@/features/whatsapp/hooks";

const GROUP_ORDER = ["Quotation", "Order", "Invoice", "Delivery"];

/** The server checks new Meta tokens and Fenwira keys, and says why one was refused. */
function errorReason(err: unknown) {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  return data && Object.values(data).flat().map(String).join(" ");
}

function WhatsAppSettingsPage() {
  const { data: settings } = useWhatsAppSettings();
  const { data: catalogue } = useEventCatalogue();
  const { data: templates } = useTemplates();
  const { data: occasions } = useCrmOptions("occasion");
  const saveSettings = useSaveWhatsAppSettings();
  const [form, setForm] = useState({
    waba_id: "", phone_number_id: "", access_token: "", app_secret: "", app_id: "", webhook_verify_token: "",
    business_display_name: "", business_display_phone: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        waba_id: settings.waba_id, phone_number_id: settings.phone_number_id, access_token: "", app_secret: "",
        app_id: settings.app_id, webhook_verify_token: settings.webhook_verify_token,
        business_display_name: settings.business_display_name, business_display_phone: settings.business_display_phone,
      });
    }
  }, [settings]);

  const saveConnection = async () => {
    try {
      const payload: Partial<typeof form> = { ...form };
      if (!payload.access_token) delete payload.access_token;
      if (!payload.app_secret) delete payload.app_secret;
      await saveSettings.mutateAsync(payload);
      toast.success("WhatsApp settings saved");
      setForm((f) => ({ ...f, access_token: "", app_secret: "" }));
    } catch (err: unknown) {
      toast.error(errorReason(err) || "Could not save these settings", { duration: 12000 });
    }
  };

  const [fenwiraKey, setFenwiraKey] = useState("");
  const viaFenwira = settings?.send_via_fenwira ?? false;

  /** Turns Send via Fenwira on or off, or saves a new key; Fenwira checks the key first. */
  const saveFenwira = async (enabled: boolean) => {
    try {
      await saveSettings.mutateAsync({ send_via_fenwira: enabled, ...(fenwiraKey ? { fenwira_api_key: fenwiraKey } : {}) });
      setFenwiraKey("");
      toast.success(enabled ? "Messages now send through Fenwira" : "Messages now send straight to Meta");
    } catch (err: unknown) {
      toast.error(errorReason(err) || "Could not update Send via Fenwira", { duration: 12000 });
    }
  };

  // How many Active templates each event has. Auto-send needs exactly one.
  const activeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates ?? []) {
      if (t.status === "approved" && t.event) counts[t.event] = (counts[t.event] ?? 0) + 1;
    }
    return counts;
  }, [templates]);

  const autoGroups = useMemo(() => {
    const events = (catalogue?.events ?? []).filter((e) => catalogue?.auto_sendable_events.includes(e.value));
    return GROUP_ORDER.map((group) => ({ group, events: events.filter((e) => e.group === group) })).filter((g) => g.events.length);
  }, [catalogue]);

  const masterOn = settings?.auto_send_enabled ?? false;

  const toggleMaster = async (enabled: boolean) => {
    try {
      await saveSettings.mutateAsync({ auto_send_enabled: enabled });
      toast.success(enabled ? "Automatic sending turned on" : "All automatic sending turned off");
    } catch {
      toast.error("Could not update automatic sending");
    }
  };

  /** Saves one reminder setting, with a toast either way. */
  const saveReminders = async (patch: Partial<WhatsAppSettings>, message: string) => {
    try {
      await saveSettings.mutateAsync(patch);
      toast.success(message);
    } catch {
      toast.error("Could not update occasion reminders");
    }
  };

  const reminderTypes = settings?.occasion_reminder_types ?? [];
  const occasionTemplates = activeCount["occasion_reminder"] ?? 0;
  const remindersOn = settings?.occasion_reminders_enabled ?? false;

  const toggleOccasion = (name: string, checked: boolean) => {
    const key = occasionKey(name);
    const next = checked ? [...reminderTypes, key] : reminderTypes.filter((t) => t !== key);
    saveReminders({ occasion_reminder_types: next }, checked ? `${name} reminders on` : `${name} reminders off`);
  };

  const toggleAutoSend = async (event: string, enabled: boolean) => {
    const current = settings?.auto_send_events ?? [];
    const next = enabled ? [...current, event] : current.filter((e) => e !== event);
    try {
      await saveSettings.mutateAsync({ auto_send_events: next });
      toast.success(enabled ? "Stage turned on" : "Stage turned off");
    } catch {
      toast.error("Could not update automatic sending");
    }
  };

  return (
    <>
      <PageHeader title="WhatsApp Settings" description="Your business's WhatsApp Business connection." />

      <SectionCard
        title="Connection"
        actions={
          <StatusChip
            status={settings?.is_connected ? "Connected" : "Not connected"}
            tone={settings?.is_connected ? "success" : "neutral"}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp Business Account ID" required>
            <Input value={form.waba_id} onChange={(e) => setForm((f) => ({ ...f, waba_id: e.target.value }))} />
          </Field>
          <Field label="Phone Number ID" required>
            <Input value={form.phone_number_id} onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))} />
          </Field>
          <Field label="Access token" help={settings?.has_access_token ? "A token is already saved. Enter a new one only to replace it." : "Never shown back once saved."}>
            <Input type="password" value={form.access_token} placeholder={settings?.has_access_token ? "••••••••" : ""} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} />
          </Field>
          <Field
            label="App secret"
            help={settings?.has_app_secret
              ? "Saved. Webhook calls must be signed by Meta. Enter a new one only to replace it."
              : "From Meta App Dashboard → App settings → Basic. Once saved, only Meta can update message and template status."}
          >
            <Input type="password" value={form.app_secret} placeholder={settings?.has_app_secret ? "••••••••" : ""} onChange={(e) => setForm((f) => ({ ...f, app_secret: e.target.value }))} />
          </Field>
          <Field label="Meta App ID" help="From Meta App Dashboard → App settings → Basic. Needed to upload image, video and document headers.">
            <Input value={form.app_id} onChange={(e) => setForm((f) => ({ ...f, app_id: e.target.value }))} />
          </Field>
          <Field label="Webhook verify token" help="Set this same value when you register the webhook in Meta Business Manager.">
            <Input value={form.webhook_verify_token} onChange={(e) => setForm((f) => ({ ...f, webhook_verify_token: e.target.value }))} />
          </Field>
          <Field label="Business display name">
            <Input value={form.business_display_name} onChange={(e) => setForm((f) => ({ ...f, business_display_name: e.target.value }))} />
          </Field>
          <Field label="Business display phone">
            <Input value={form.business_display_phone} onChange={(e) => setForm((f) => ({ ...f, business_display_phone: e.target.value }))} />
          </Field>
        </div>
        <Button className="mt-4" onClick={saveConnection} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? "Saving…" : "Save connection"}
        </Button>
      </SectionCard>

      <SectionCard
        title="Send via Fenwira"
        description="Send every WhatsApp message through Fenwira, so each one shows in Fenwira's inbox with its delivery status. Templates are still created and submitted with the Meta details above."
        actions={
          <StatusChip status={viaFenwira ? "On" : "Off"} tone={viaFenwira ? "success" : "neutral"} />
        }
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Send messages through Fenwira</p>
            <p className="text-xs text-muted-foreground">
              {viaFenwira
                ? "On. Manual, automatic and reminder messages all go through Fenwira."
                : "Off. Messages go straight to Meta."}
            </p>
          </div>
          <Switch
            checked={viaFenwira}
            disabled={(!viaFenwira && !settings?.has_fenwira_api_key && !fenwiraKey) || saveSettings.isPending}
            onCheckedChange={saveFenwira}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
          <Field
            label="Fenwira API key"
            help={settings?.has_fenwira_api_key
              ? "A key is already saved. Enter a new one only to replace it."
              : "From Fenwira → Integrations → API, with \"Reply to conversations\" ticked. Never shown back once saved."}
          >
            <Input
              type="password"
              value={fenwiraKey}
              placeholder={settings?.has_fenwira_api_key ? "••••••••" : "fw_…"}
              onChange={(e) => setFenwiraKey(e.target.value)}
            />
          </Field>
          </div>
          <Button variant="outline" onClick={() => saveFenwira(viaFenwira)} disabled={!fenwiraKey || saveSettings.isPending}>
            Save key
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Automatic sending"
        description="Send a message automatically when a record reaches a stage. Manual Send WhatsApp buttons work either way."
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Send WhatsApp messages automatically</p>
            <p className="text-xs text-muted-foreground">
              {masterOn
                ? "On. Each stage below sends only if its own switch is on."
                : "Off. Nothing is sent automatically, whatever the switches below say."}
            </p>
          </div>
          <Switch checked={masterOn} onCheckedChange={toggleMaster} disabled={saveSettings.isPending} />
        </div>

        <div className={`mt-4 flex flex-col gap-5 ${masterOn ? "" : "opacity-60"}`}>
          {autoGroups.map(({ group, events }) => (
            <div key={group}>
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{group}</p>
              <div className="flex flex-col divide-y divide-border">
                {events.map((event) => {
                  const count = activeCount[event.value] ?? 0;
                  const on = (settings?.auto_send_events ?? []).includes(event.value);
                  return (
                    <div key={event.value} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{event.label}</p>
                        {count === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No Active template yet &middot; <Link to="/whatsapp/templates/new" className="text-primary hover:underline">Create one</Link>
                          </p>
                        ) : count > 1 ? (
                          <p className="text-xs text-warning">{count} Active templates &middot; won't auto-send until only one is left</p>
                        ) : (
                          <p className="text-xs text-success">Template ready</p>
                        )}
                      </div>
                      <Switch
                        checked={on}
                        disabled={(count === 0 && !on) || saveSettings.isPending}
                        onCheckedChange={(checked) => toggleAutoSend(event.value, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Follow-up Reminder and Payment Reminder are always sent manually, since their timing is a staff decision rather than a status change.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Occasion reminders"
        description="A WhatsApp message to customers before their birthday or anniversary, inviting them to order. Each occasion gets one reminder a year, sent its reminder days before (7 by default)."
        actions={<Button size="sm" variant="outline" asChild><Link to="/whatsapp/occasion-reminders">Today's reminders</Link></Button>}
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Send occasion reminders</p>
            {occasionTemplates === 0 ? (
              <p className="text-xs text-muted-foreground">
                Needs an Active template for Occasion Reminder &middot; <Link to="/whatsapp/templates/new" className="text-primary hover:underline">Create one</Link>
              </p>
            ) : occasionTemplates > 1 ? (
              <p className="text-xs text-warning">{occasionTemplates} Active templates &middot; nothing sends until only one is left</p>
            ) : (
              <p className="text-xs text-success">Template ready</p>
            )}
          </div>
          <Switch
            checked={remindersOn}
            disabled={(occasionTemplates === 0 && !remindersOn) || saveSettings.isPending}
            onCheckedChange={(checked) => saveReminders(
              { occasion_reminders_enabled: checked },
              checked ? "Occasion reminders turned on" : "Occasion reminders turned off",
            )}
          />
        </div>

        <div className={`mt-4 grid gap-5 sm:grid-cols-2 ${remindersOn ? "" : "opacity-60"}`}>
          <Field
            label="How they're sent"
            help={settings?.occasion_reminder_mode === "automatic"
              ? "Sent by themselves every day at 10:00 AM."
              : "Every day from 10:00 AM, staff check the list and press Send."}
          >
            <Select
              value={settings?.occasion_reminder_mode ?? "review"}
              onValueChange={(mode) => saveReminders(
                { occasion_reminder_mode: mode as WhatsAppSettings["occasion_reminder_mode"] },
                mode === "automatic" ? "Reminders will send automatically" : "Reminders will wait for review",
              )}
              disabled={saveSettings.isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Review before sending</SelectItem>
                <SelectItem value="automatic">Send automatically</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Occasions</p>
            <div className="flex flex-col gap-2">
              {(occasions ?? []).map((name) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={reminderTypes.includes(occasionKey(name))}
                    disabled={saveSettings.isPending}
                    onCheckedChange={(checked) => toggleOccasion(name, checked === true)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Customers who reply STOP are never sent another reminder (START turns them back on). Order and quotation updates still reach them.
        </p>
      </SectionCard>
    </>
  );
}

export default WhatsAppSettingsPage;
