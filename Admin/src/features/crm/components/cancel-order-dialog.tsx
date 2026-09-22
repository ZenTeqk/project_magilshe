import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { useCrmOptions } from "@/features/crm/hooks";
import { useOrderWorkflowAction } from "@/features/crm/orders-hooks";
import { configuredOptions } from "@/features/crm/config-options";

export function CancelOrderDialog({
  orderId, open, onOpenChange,
}: { orderId: string | number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: liveReasons } = useCrmOptions("order_cancellation_reason");
  const reasons = configuredOptions(liveReasons);
  const [reason, setReason] = useState("");
  const workflowAction = useOrderWorkflowAction();

  const finalReason = reason;

  const submit = async () => {
    if (!finalReason.trim()) return;
    try {
      await workflowAction.mutateAsync({ id: orderId, action: "cancel_order", cancellation_reason: finalReason });
      toast.success("Order cancelled");
      onOpenChange(false);
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      toast.error(response ? Object.values(response).flat().join(" ") : "Unable to cancel order.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>A cancellation reason is required.</DialogDescription>
        </DialogHeader>
        <Field label="Reason" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
            <SelectContent>
              {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {!reasons.length && <p className="text-xs text-warning">Add an active cancellation reason in CRM Settings.</p>}
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Keep order</Button>
          <Button type="button" className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={!finalReason.trim() || workflowAction.isPending} onClick={submit}>
            Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
