import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCatalogGallery, useAddGalleryImages, useDeleteGalleryImage, type CatalogGalleryImage,
} from "@/features/catalog/catalog-hooks";

function GalleryPage() {
  const { data: images, isLoading } = useCatalogGallery();
  const addImages = useAddGalleryImages();
  const deleteImage = useDeleteGalleryImage();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CatalogGalleryImage | null>(null);

  const upload = async () => {
    if (!files.length) { toast.warning("Please choose image"); return; }
    try {
      const result = await addImages.mutateAsync(files);
      toast.success(result.message || "Gallery images added successfully");
      setFiles([]);
      setUploadOpen(false);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteImage.mutateAsync(deleteTarget.id);
      toast.success(result.message || "Gallery image deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete this image.");
    }
  };

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Manage images displayed in the bakery website gallery."
        actions={<Button onClick={() => setUploadOpen(true)}><Plus className="size-4" /> Add images</Button>}
      />

      <SectionCard title="Gallery images">
        {isLoading ? (
          <CardSkeleton />
        ) : !images?.length ? (
          <EmptyState title="No gallery images yet" description="Upload your first website gallery image." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                <img src={img.image_url} alt="Gallery" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Delete gallery image"
                  onClick={() => setDeleteTarget(img)}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-lg bg-card/90 text-danger opacity-0 shadow-soft transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={uploadOpen} onOpenChange={(v) => { setUploadOpen(v); if (!v) setFiles([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add gallery images</DialogTitle></DialogHeader>
          <Field label="Gallery images" required help="Select one or more website-ready images.">
            <input
              type="file" multiple accept="image/*" className="text-sm"
              onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
            />
          </Field>
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {files.map((file, i) => (
                <img key={`${file.name}-${i}`} src={URL.createObjectURL(file)} alt={file.name} className="aspect-square rounded-lg border border-border object-cover" />
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={upload} disabled={addImages.isPending}>
              {addImages.isPending ? "Uploading…" : "Upload images"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this gallery image?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the website gallery.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep image</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default GalleryPage;
