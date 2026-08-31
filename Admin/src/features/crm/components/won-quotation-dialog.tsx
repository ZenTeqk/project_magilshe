import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConvertLead, type Lead } from "@/features/crm/hooks";

export function WonQuotationDialog({
  lead,
  open,
  onOpenChange,
  onGenerated,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the created/existing quotation id after a successful generate — lets the
   * caller decide navigation instead of this dialog racing with the caller's own onOpenChange. */
  onGenerated?: (quotationId: number) => void;
}) {
  const convertLead = useConvertLead();

  const generate = async () => {
    if (!lead) return;
    try {
      const result = await convertLead.mutateAsync({ id: lead.id });
      toast.success(result.message, { description: `Quotation ${result.data.quotation_no}` });
      onGenerated?.(result.data.id);
    } catch {
      toast.error("Unable to generate quotation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lead won</DialogTitle>
          <DialogDescription>
            Would you like to generate a quotation for {lead?.customer_name} now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button type="button" onClick={generate} disabled={convertLead.isPending}>
            {convertLead.isPending ? "Generating…" : "Generate quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
