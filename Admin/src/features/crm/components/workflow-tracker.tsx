import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowTracker({ stages, currentIndex }: { stages: string[]; currentIndex: number }) {
  return <ol className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr" aria-label="Workflow progress">
    {stages.map((stage, index) => {
      const complete = index < currentIndex, current = index === currentIndex;
      return <li key={stage} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium", complete && "border-success/30 bg-success-soft text-success", current && "border-primary/40 bg-primary-soft text-primary", !complete && !current && "border-border bg-surface-muted text-muted-foreground")}>
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", complete && "border-success bg-success text-white", current && "border-primary bg-primary text-white")}>{complete ? <Check className="size-3" /> : index + 1}</span>
        <span>{stage}<span className="block text-[10px] font-normal opacity-75">{complete ? "Completed" : current ? "Current" : "Upcoming"}</span></span>
      </li>;
    })}
  </ol>;
}
