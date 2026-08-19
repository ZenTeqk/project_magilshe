import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  useConfigurationSettings,
  useSaveConfigurationSettings,
  type ConfigurationData,
} from "@/features/settings/settings-hooks";

/**
 * Backed by `configuration/settings/` (ConfigurationSettings view). No old
 * Admin UI calls this endpoint — per views.py it reads/writes exactly the
 * same Configuration record and fields as `configuration/get/` + `save/`
 * (Admin/src/components/config/Config.jsx). Kept intentionally minimal
 * (no fields invented beyond the serializer) and presented as a single
 * settings form rather than duplicating the full Configuration page layout.
 */
type FormState = {
  id: number;
  name: string;
  mobile: string;
  email: string;
  website: string;
  gst_number: string;
  food_license_number: string;
  company_address: string;
  map_iframe_link: string;
  description: string;
  return_policy: string;
  greeting_text: string;
  meta: string;
  url: string | null;
};

const emptyForm: FormState = {
  id: 0,
  name: "",
  mobile: "",
  email: "",
  website: "",
  gst_number: "",
  food_license_number: "",
  company_address: "",
  map_iframe_link: "",
  description: "",
  return_policy: "",
  greeting_text: "",
  meta: "",
  url: null,
};

function toFormState(data: ConfigurationData): FormState {
  return {
    id: data.id ?? 0,
    name: data.name ?? "",
    mobile: data.mobile ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    gst_number: data.gst_number ?? "",
    food_license_number: data.food_license_number ?? "",
    company_address: data.company_address ?? "",
    map_iframe_link: data.map_iframe_link ?? "",
    description: data.description ?? "",
    return_policy: data.return_policy ?? "",
    greeting_text: data.greeting_text ?? "",
    meta: data.meta ? JSON.stringify(data.meta, null, 2) : "",
    url: data.url ?? null,
  };
}

function SettingsPage() {
  const { data, isLoading, isError, refetch } = useConfigurationSettings();
  const saveSettings = useSaveConfigurationSettings();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm(toFormState(data));
      setLoaded(true);
    }
  }, [data, loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Enter company name"); return; }
    if (!form.mobile.trim()) { toast.error("Enter mobile number"); return; }
    if (!form.email.trim()) { toast.error("Enter email address"); return; }

    let meta: Record<string, unknown> = {};
    if (form.meta.trim()) {
      try {
        meta = JSON.parse(form.meta);
      } catch {
        toast.error("Metadata must be valid JSON");
        return;
      }
    }

    try {
      await saveSettings.mutateAsync({
        id: form.id,
        name: form.name,
        mobile: form.mobile,
        email: form.email,
        website: form.website,
        gst_number: form.gst_number,
        food_license_number: form.food_license_number,
        company_address: form.company_address,
        map_iframe_link: form.map_iframe_link,
        description: form.description,
        return_policy: form.return_policy,
        greeting_text: form.greeting_text,
        meta,
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Unable to save settings");
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Settings" description="Storefront configuration defaults." />
        <CardSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Settings" description="Storefront configuration defaults." />
        <SectionCard>
          <EmptyState
            title="Settings could not be loaded"
            description="Check that the API server is running, then try again."
            action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
          />
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Storefront configuration defaults."
        actions={
          <Button onClick={handleSave} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? "Saving…" : "Save settings"}
          </Button>
        }
      />
      <SectionCard title="Storefront settings" description="Company identity and storefront defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Mobile number" required>
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Company website">
            <Input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="GST-IN">
            <Input value={form.gst_number} onChange={(e) => set("gst_number", e.target.value)} />
          </Field>
          <Field label="Food licence number">
            <Input value={form.food_license_number} onChange={(e) => set("food_license_number", e.target.value)} />
          </Field>
          <Field label="Greeting text">
            <Input value={form.greeting_text} onChange={(e) => set("greeting_text", e.target.value)} />
          </Field>
          <Field label="Google Map iframe">
            <Input value={form.map_iframe_link} onChange={(e) => set("map_iframe_link", e.target.value)} />
          </Field>
          <Field label="Company address" className="sm:col-span-2">
            <Textarea rows={3} value={form.company_address} onChange={(e) => set("company_address", e.target.value)} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Return policy" className="sm:col-span-2">
            <Textarea rows={3} value={form.return_policy} onChange={(e) => set("return_policy", e.target.value)} />
          </Field>
          <Field label="Metadata" className="sm:col-span-2" help="Optional JSON object">
            <Textarea rows={3} value={form.meta} onChange={(e) => set("meta", e.target.value)} />
          </Field>
        </div>
      </SectionCard>
    </>
  );
}

export default SettingsPage;
