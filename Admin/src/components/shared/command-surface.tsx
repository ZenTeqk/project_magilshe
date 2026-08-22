import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-soft", className)}
    >
      {children}
    </section>
  );
}

export function SurfaceHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">{title}</h2>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </header>
  );
}
