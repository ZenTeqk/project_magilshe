import { PageHeader } from "@/components/shared/page-header";
import { AgendaBoard } from "@/features/crm/components/agenda-board";

export default function CrmCalendarPage() {
  return (
    <>
      <PageHeader
        title="CRM calendar"
        description="Day-wise upcoming orders, deliveries, pending payments, follow-ups, customer events, reminders and completed work."
      />
      <AgendaBoard defaultView="week" />
    </>
  );
}
