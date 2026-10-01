import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useCurrentAccess } from "@/features/auth/rbac";
import { useSendWhatsAppMessage, useTemplatesForEvent } from "@/features/whatsapp/hooks";

/** The one component every CRM detail page drops in next to its existing
 * action buttons -- Quotation's Send, Order's Confirm, Delivery's workflow
 * actions, Invoice's Generate/Record Payment, Lead's follow-up logging.
 * Renders nothing if the user lacks whatsapp.messages.send, same pattern
 * as every other permission-gated action in this app. */
export function SendWhatsAppButton({
  event, recordId, label = "Send WhatsApp",
}: { event: string; recordId: number | string; label?: string }) {
  const { data: access } = useCurrentAccess();
  const { data: templates } = useTemplatesForEvent(event);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const send = useSendWhatsAppMessage();

  if (!hasPermission(access, "whatsapp.messages.send")) return null;

  const openDialog = () => {
    setTemplateId(templates[0] ? String(templates[0].id) : "");
    setOpen(true);
  };

  const submit = async () => {
    if (!templateId) return;
    try {
      await send.mutateAsync({ event, template_id: Number(templateId), record_id: recordId });
      toast.success("WhatsApp message sent");
      setOpen(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Message could not be sent");
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog}>
        <MessageCircle className="size-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send WhatsApp message</DialogTitle>
            <DialogDescription>
              {templates.length === 0
                ? "No Active template is assigned to this stage yet. Set one up in WhatsApp → Templates."
                : "The message is filled in from this record's details and sent to the customer's number on file."}
            </DialogDescription>
          </DialogHeader>
          {templates.length > 0 && (
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!templateId || send.isPending}>
              {send.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
