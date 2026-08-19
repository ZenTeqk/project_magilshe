import { ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/features/crm/hooks";

type StepState = "completed" | "current" | "upcoming" | "lost";

function Step({ label, state }: { label: string; state: StepState }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
      state === "completed" && "border-success/25 bg-success-soft text-success",
      state === "current" && "border-primary/35 bg-primary-soft text-primary",
      state === "upcoming" && "border-border bg-surface-muted text-muted-foreground",
      state === "lost" && "border-danger/30 bg-danger-soft text-danger",
    )}>
      {state === "completed" ? <Check className="size-3" /> : state === "lost" ? <X className="size-3" /> : <span className={cn("size-2 rounded-full border", state === "current" && "border-primary bg-primary")} />}
      {label}
    </span>
  );
}

export function LeadWorkflowTracker({ status, hasQuotation }: { status: LeadStatus; hasQuotation: boolean }) {
  if (status === "Lost") {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto py-1" aria-label="Lead workflow progress">
        <Step label="Open" state="completed" />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        <Step label="Follow-up" state="completed" />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
        <Step label="Lost" state="lost" />
      </div>
    );
  }

  const currentIndex = hasQuotation ? 3 : status === "Won" ? 2 : status === "Follow-up" ? 1 : 0;
  const stages = ["Open", "Follow-up", "Won", "Quotation"];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1" aria-label="Lead workflow progress">
      {stages.map((stage, index) => (
        <span key={stage} className="contents">
          {index > 0 && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <Step label={stage} state={index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming"} />
        </span>
      ))}
    </div>
  );
}
