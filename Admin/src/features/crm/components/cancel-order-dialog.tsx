import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { useCrmOptions } from "@/features/crm/hooks";
import { useOrderWorkflowAction } from "@/features/crm/orders-hooks";

const fallbackReasons = ["Customer cancelled", "Payment not received", "Duplicate order", "Product unavailable", "Delivery issue", "Customer not responding"];

export function CancelOrderDialog({
  orderId, open, onOpenChange,
}: { orderId: string | number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: liveReasons } = useCrmOptions("order_cancellation_reason");
  const reasons = liveReasons?.length ? liveReasons : fallbackReasons;
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const workflowAction = useOrderWorkflowAction();

  const finalReason = reason === "__other__" ? custom : reason;

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
              <SelectItem value="__other__">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {reason === "__other__" && (
          <Field label="Custom reason" required>
            <Input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} />
          </Field>
        )}
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
