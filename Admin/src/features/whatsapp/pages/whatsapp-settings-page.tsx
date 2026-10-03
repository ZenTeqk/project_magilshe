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
import { useEventCatalogue, useSaveWhatsAppSettings, useTemplates, useWhatsAppSettings } from "@/features/whatsapp/hooks";

const GROUP_ORDER = ["Quotation", "Order", "Invoice", "Delivery"];

function WhatsAppSettingsPage() {
  const { data: settings } = useWhatsAppSettings();
  const { data: catalogue } = useEventCatalogue();
  const { data: templates } = useTemplates();
  const saveSettings = useSaveWhatsAppSettings();
  const [form, setForm] = useState({
    waba_id: "", phone_number_id: "", access_token: "", webhook_verify_token: "",
    business_display_name: "", business_display_phone: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        waba_id: settings.waba_id, phone_number_id: settings.phone_number_id, access_token: "",
        webhook_verify_token: settings.webhook_verify_token,
        business_display_name: settings.business_display_name, business_display_phone: settings.business_display_phone,
      });
    }
  }, [settings]);

  const saveConnection = async () => {
    try {
      const payload = { ...form };
      if (!payload.access_token) delete (payload as Partial<typeof payload>).access_token;
      await saveSettings.mutateAsync(payload);
      toast.success("WhatsApp settings saved");
      setForm((f) => ({ ...f, access_token: "" }));
    } catch {
      toast.error("Could not save these settings");
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
    </>
  );
}

export default WhatsAppSettingsPage;
