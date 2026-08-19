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
  useConfiguration,
  useSaveConfiguration,
  type ConfigurationData,
} from "@/features/settings/settings-hooks";

/** Mirrors Admin/src/components/config/Config.jsx `emptyConfiguration` exactly. */
type FormState = {
  id: number;
  name: string;
  company_address: string;
  email: string;
  website: string;
  mobile: string;
  gst_number: string;
  food_license_number: string;
  map_iframe_link: string;
  description: string;
  return_policy: string;
  meta: string;
  greeting_text: string;
  url: string | null;
};

const emptyForm: FormState = {
  id: 0,
  name: "",
  company_address: "",
  email: "",
  website: "",
  mobile: "",
  gst_number: "",
  food_license_number: "",
  map_iframe_link: "",
  description: "",
  return_policy: "",
  meta: "",
  greeting_text: "",
  url: null,
};

function toFormState(data: ConfigurationData): FormState {
  return {
    id: data.id ?? 0,
    name: data.name ?? "",
    company_address: data.company_address ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    mobile: data.mobile ?? "",
    gst_number: data.gst_number ?? "",
    food_license_number: data.food_license_number ?? "",
    map_iframe_link: data.map_iframe_link ?? "",
    description: data.description ?? "",
    return_policy: data.return_policy ?? "",
    meta: data.meta ? JSON.stringify(data.meta, null, 2) : "",
    greeting_text: data.greeting_text ?? "",
    url: data.url ?? null,
  };
}

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ConfigurationPage() {
  const { data, isLoading, isError, refetch } = useConfiguration();
  const saveConfiguration = useSaveConfiguration();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm(toFormState(data));
      setPreview(data.url ?? "");
      setLoaded(true);
    }
  }, [data, loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (file: File | null) => {
    setImage(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Enter company name"); return; }
    if (!form.mobile.trim()) { toast.error("Enter mobile number"); return; }
    if (!form.email.trim()) { toast.error("Enter email address"); return; }
    if (!form.company_address.trim()) { toast.error("Enter company address"); return; }
    if (!image && !form.url) { toast.error("Please choose a company logo"); return; }
    if (!MOBILE_REGEX.test(form.mobile)) { toast.error("Please enter a valid 10-digit mobile number"); return; }
    if (!EMAIL_REGEX.test(form.email)) { toast.error("Please enter a valid email address"); return; }

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
      await saveConfiguration.mutateAsync({
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
        image,
      });
      toast.success("Configuration saved successfully");
      setImage(null);
    } catch {
      toast.error("Unable to save configuration");
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Configuration" description="Company identity and storefront defaults." />
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Configuration" description="Company identity and storefront defaults." />
        <SectionCard>
          <EmptyState
            title="Configuration could not be loaded"
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
        title="Configuration"
        description="Company identity and storefront defaults."
        actions={
          <Button onClick={handleSave} disabled={saveConfiguration.isPending}>
            {saveConfiguration.isPending ? "Saving…" : "Save configuration"}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Company details" description="Used across the storefront and generated documents">
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
            <Field label="Company address" className="sm:col-span-2">
              <Textarea rows={3} value={form.company_address} onChange={(e) => set("company_address", e.target.value)} />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Brand and storefront" description="Logo, map, policies and metadata">
          <div className="grid gap-4">
            <Field label="Company logo" required>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </Field>
            {preview && (
              <img
                src={preview}
                alt="Company logo preview"
                className="size-24 rounded-2xl border border-border object-cover"
              />
            )}
            <Field label="Google Map iframe">
              <Input value={form.map_iframe_link} onChange={(e) => set("map_iframe_link", e.target.value)} />
            </Field>
            <Field label="Greeting text">
              <Input value={form.greeting_text} onChange={(e) => set("greeting_text", e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Return policy">
              <Textarea rows={4} value={form.return_policy} onChange={(e) => set("return_policy", e.target.value)} />
            </Field>
            <Field label="Metadata" help="Optional JSON object">
              <Textarea rows={4} value={form.meta} onChange={(e) => set("meta", e.target.value)} />
            </Field>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export default ConfigurationPage;
