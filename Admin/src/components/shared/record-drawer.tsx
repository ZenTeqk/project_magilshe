import { useState, type ReactNode } from "react";
import { CloudUpload, ImagePlus, Loader2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Field = {
  name: string;
  label: string;
  type?:
    "text" | "textarea" | "number" | "select" | "switch" | "date" | "datetime" | "file" | "tags";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  span?: 1 | 2;
};

export type FieldSection = { title: string; description?: string; fields: Field[] };

export function RecordDrawer({
  open,
  onOpenChange,
  title,
  description,
  sections,
  footerNote,
  extra,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  sections: FieldSection[];
  footerNote?: string;
  extra?: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const submit = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onOpenChange(false);
      toast.success(`${title} saved`, { description: "Changes are live across the workspace." });
    }, 700);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="scroll-slim flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-border bg-surface-muted/40 p-4"
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                {section.description && (
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <div
                    key={f.name}
                    className={cn("space-y-1.5", (f.span ?? 1) === 2 && "sm:col-span-2")}
                  >
                    <Label htmlFor={f.name} className="text-xs font-medium">
                      {f.label}
                      {f.required && <span className="ml-0.5 text-danger">*</span>}
                    </Label>
                    <FieldControl field={f} />
                    {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {extra}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CloudUpload className="size-3.5" /> {footerNote ?? "Draft autosaved a moment ago"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl gradient-brand text-primary-foreground hover:opacity-95"
              onClick={submit}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : "Save record"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldControl({ field: f }: { field: Field }) {
  if (f.type === "textarea")
    return <Textarea id={f.name} rows={3} placeholder={f.placeholder} className="rounded-xl" />;
  if (f.type === "switch")
    return (
      <div className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Switch id={f.name} defaultChecked />
        <span className="text-xs text-muted-foreground">Enabled</span>
      </div>
    );
  if (f.type === "select")
    return (
      <Select>
        <SelectTrigger id={f.name} className="rounded-xl">
          <SelectValue placeholder={f.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {(f.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  if (f.type === "tags")
    return (
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5">
        {(f.options ?? []).slice(0, 3).map((o) => (
          <span
            key={o}
            className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            {o}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">+ add</span>
      </div>
    );
  if (f.type === "file")
    return (
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-card px-3 py-5 text-center transition-colors hover:border-primary hover:bg-primary-soft/40">
        <ImagePlus className="size-5 text-primary" />
        <span className="text-xs font-medium">Drop images or browse</span>
        <span className="text-[11px] text-muted-foreground">PNG, JPG or WEBP up to 5 MB</span>
        <input type="file" className="hidden" multiple />
      </label>
    );
  return (
    <Input
      id={f.name}
      type={
        f.type === "number"
          ? "number"
          : f.type === "date"
            ? "date"
            : f.type === "datetime"
              ? "datetime-local"
              : "text"
      }
      placeholder={f.placeholder}
      className="rounded-xl"
    />
  );
}
