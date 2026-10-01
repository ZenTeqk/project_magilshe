import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEventCatalogue, useSaveWhatsAppSettings, useWhatsAppSettings } from "@/features/whatsapp/hooks";

function WhatsAppSettingsPage() {
  const { data: settings } = useWhatsAppSettings();
  const { data: catalogue } = useEventCatalogue();
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

  const toggleAutoSend = async (event: string, enabled: boolean) => {
    const current = settings?.auto_send_events ?? [];
    const next = enabled ? [...current, event] : current.filter((e) => e !== event);
    try {
      await saveSettings.mutateAsync({ auto_send_events: next });
      toast.success(enabled ? "Automatic sending turned on" : "Automatic sending turned off");
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

      <SectionCard title="Automatic sending" description="Turn on automatic sending for a stage once its template is Active. Off by default. Follow-up Reminder and Payment Reminder are always manual -- their timing is a staff judgment call, not a fixed status change.">
        <div className="flex flex-col divide-y divide-border">
          {catalogue?.events.filter((event) => catalogue.auto_sendable_events.includes(event.value)).map((event) => (
            <div key={event.value} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{event.label}</span>
              <Switch
                checked={(settings?.auto_send_events ?? []).includes(event.value)}
                onCheckedChange={(checked) => toggleAutoSend(event.value, checked)}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export default WhatsAppSettingsPage;
