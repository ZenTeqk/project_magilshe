import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: ReactNode;
  to?: string;
  accent?: boolean;
  tone?: "primary" | "success" | "crm" | "info" | "warning" | "danger";
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  to,
  accent,
  tone = "primary",
  className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        "group relative flex h-full min-h-28 flex-col justify-between gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200",
        to && "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              accent ? "bg-primary text-primary-foreground" : {
                primary: "bg-primary-soft text-primary",
                success: "bg-success-soft text-success",
                crm: "bg-accent-soft text-accent",
                info: "bg-info-soft text-info",
                warning: "bg-warning-soft text-warning",
                danger: "bg-danger-soft text-danger",
              }[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <p
          className={cn(
            "stat-value text-[1.65rem] leading-none font-semibold tracking-tight",
            accent && "text-primary",
          )}
        >
          {value}
        </p>
        <div className="flex items-center gap-2 text-xs">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
                delta >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </div>
      {to && (
        <ArrowUpRight className="absolute top-5 right-5 size-4 -translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
      )}
    </div>
  );
  return to ? (
    <Link
      to={to}
      className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
