import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { useSaveCustomerEvent, type CustomerRecurringEvent } from "@/features/customers/hooks";

const eventTypes: CustomerRecurringEvent["event_type"][] = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Baby Shower",
  "Corporate Event",
  "Other",
];

const reminderPresets = [
  { label: "7 days before", value: 7 },
  { label: "14 days before", value: 14 },
  { label: "30 days before", value: 30 },
  { label: "Custom", value: -1 },
];

export function CustomerEventDialog({
  open,
  onOpenChange,
  customerId,
  event,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string | number;
  event: CustomerRecurringEvent | null;
}) {
  const save = useSaveCustomerEvent();
  const [eventType, setEventType] = useState<CustomerRecurringEvent["event_type"]>("Birthday");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderPreset, setReminderPreset] = useState(7);
  const [customDays, setCustomDays] = useState("7");

  useEffect(() => {
    if (!open) return;
    if (event) {
      setEventType(event.event_type);
      setEventDate(event.original_date);
      setNotes(event.notes ?? "");
      const preset = reminderPresets.find((p) => p.value === event.reminder_days_before);
      setReminderPreset(preset ? preset.value : -1);
      setCustomDays(String(event.reminder_days_before));
    } else {
      setEventType("Birthday");
      setEventDate("");
      setNotes("");
      setReminderPreset(7);
      setCustomDays("7");
    }
  }, [open, event]);

  const reminderDaysBefore = reminderPreset === -1 ? Number(customDays) || 0 : reminderPreset;

  const submit = async () => {
    if (!eventDate) {
      toast.error("Event date is required");
      return;
    }
    try {
      await save.mutateAsync({
        id: event?.id,
        customer: customerId,
        event_type: eventType,
        event_date: eventDate,
        notes,
        reminder_days_before: reminderDaysBefore,
      });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
    } catch (error) {
      const message =
        (error as { response?: { data?: { event_date?: string[]; non_field_errors?: string[] } } })?.response?.data;
      toast.error(
        message?.non_field_errors?.[0] ??
          message?.event_date?.[0] ??
          "Couldn't save this event — it may already exist for this customer.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add customer event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Event type" required>
            <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Event date" required help="Recurs every year on this month/day.">
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Reminder timing" required>
            <Select
              value={String(reminderPreset)}
              onValueChange={(v) => setReminderPreset(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderPresets.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {reminderPreset === -1 && (
            <Field label="Custom days before">
              <Input
                type="number"
                min={1}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
            </Field>
          )}
          <Field label="Notes" help="Internal note for staff — not visible to the customer.">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : event ? "Save changes" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
