import { cn } from "@/lib/utils";
import { statusTone, type Tone } from "@/lib/status-tones";

const toneClass: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusChip({
  status,
  tone,
  className,
  dot = true,
}: {
  status: string;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  const t = tone ?? statusTone[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClass[t],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {status}
    </span>
  );
}
