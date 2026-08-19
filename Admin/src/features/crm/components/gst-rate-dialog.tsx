import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";
import { useQueryClient } from "@tanstack/react-query";

export function GstRateDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (rate: number) => void;
}) {
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const save = async () => {
    const value = Number(rate);
    if (Number.isNaN(value) || value < 0 || value > 100) return;
    setSaving(true);
    try {
      await apiClient.post(endpoints.crm.options, {
        option_type: "tax_setting",
        name: String(value),
        sort_order: value,
        is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ["crm", "options", "tax_setting"] });
      onAdded(value);
      toast.success(`GST rate ${value}% added`);
      setRate("");
      onOpenChange(false);
    } catch {
      toast.error("Unable to add GST rate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Manage GST rates</DialogTitle>
          <DialogDescription>
            Add a GST percentage to reuse across quotation items.
          </DialogDescription>
        </DialogHeader>
        <Field label="GST percentage" required>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!rate || saving}>
            {saving ? "Adding…" : "Add rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
