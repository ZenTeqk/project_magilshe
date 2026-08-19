import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      {(title || actions) && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && "p-4 sm:p-5", "flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
