import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useMarketingBanners, useSaveMarketingBanner, type MarketingBanner,
} from "@/features/marketing/marketing-hooks";

type EditorState = {
  id?: number;
  main_text: string;
  sub_text: string;
  status: boolean;
  image: File | null;
  imagePreview: string;
};

const emptyEditor: EditorState = { main_text: "", sub_text: "", status: true, image: null, imagePreview: "" };

function BannerPage() {
  const { data: banners, isLoading } = useMarketingBanners();
  const saveBanner = useSaveMarketingBanner();

  const [editor, setEditor] = useState<EditorState | null>(null);

  const openCreate = () => setEditor(emptyEditor);
  const openEdit = (banner: MarketingBanner) => setEditor({
    id: banner.id,
    main_text: banner.main_text ?? "",
    sub_text: banner.sub_text ?? "",
    status: Boolean(banner.status),
    image: null,
    imagePreview: banner.url ?? "",
  });

  const onImageChange = (file: File | undefined) => {
    if (!file || !editor) return;
    setEditor({ ...editor, image: file, imagePreview: URL.createObjectURL(file) });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.id && !editor.image) { toast.warning("Please choose a banner image"); return; }
    try {
      const result = await saveBanner.mutateAsync({
        id: editor.id,
        main_text: editor.main_text,
        sub_text: editor.sub_text,
        status: editor.status,
        image: editor.image,
      });
      toast.success(result.message || "Banner Updated Successfully!");
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Website Banners"
        description="Manage promotional images displayed in the website banner area."
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Add banner</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : !banners?.length ? (
        <SectionCard title="Website banners">
          <EmptyState title="No banners available" description="Add the first website banner." action={<Button onClick={openCreate}><Plus className="size-4" /> Add banner</Button>} />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <SectionCard
              key={banner.id}
              title={banner.main_text || "Website banner"}
              description={banner.sub_text ?? undefined}
              actions={<StatusChip status={banner.status ? "Active" : "Inactive"} tone={banner.status ? "success" : "neutral"} />}
            >
              {banner.url ? (
                <img src={banner.url} alt={banner.main_text || "Website banner"} className="mb-3 aspect-video w-full rounded-lg border border-border object-cover" />
              ) : (
                <div className="mb-3 grid aspect-video w-full place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">No image</div>
              )}
              <Button variant="outline" size="sm" onClick={() => openEdit(banner)}><Pencil className="size-3.5" /> Edit banner</Button>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editor?.id ? "Edit banner" : "Add banner"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-3">
              <Field label="Header text"><Input value={editor.main_text} onChange={(e) => setEditor({ ...editor, main_text: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={3} value={editor.sub_text} onChange={(e) => setEditor({ ...editor, sub_text: e.target.value })} /></Field>
              <Field label="Banner image" required={!editor.id}>
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => onImageChange(e.target.files?.[0])} />
              </Field>
              {editor.imagePreview && (
                <img src={editor.imagePreview} alt="Banner preview" className="aspect-video w-full rounded-lg border border-border object-cover" />
              )}
              {Boolean(editor.id) && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={editor.status} onCheckedChange={(v) => setEditor({ ...editor, status: v })} />
                  Banner active
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={save} disabled={saveBanner.isPending}>{saveBanner.isPending ? "Saving…" : "Save banner"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BannerPage;
