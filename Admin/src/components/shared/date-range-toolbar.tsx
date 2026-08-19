import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { lastNDays, type DateRange } from "@/features/reports/reports-hooks";

const presets = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

/** Compact Today/7D/30D/Custom range toolbar, shared across the three dashboards. */
export function DateRangeToolbar({
  value,
  onChange,
  onRefresh,
  isFetching,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const activePreset = presets.find((p) => {
    const r = lastNDays(p.days);
    return r.from_date === value.from_date && r.to_date === value.to_date;
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange(lastNDays(p.days));
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              activePreset?.label === p.label
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            !activePreset || customOpen
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
          )}
        >
          Custom
        </button>
      </div>
      {onRefresh && (
        <Button variant="outline" size="icon" className="size-9 rounded-xl" onClick={onRefresh} aria-label="Refresh">
          <RotateCw className={cn("size-4", isFetching && "animate-spin")} />
        </Button>
      )}
      {customOpen && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value.from_date}
            onChange={(e) => onChange({ ...value, from_date: e.target.value })}
            className="h-9 w-[9.5rem] rounded-xl text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={value.to_date}
            onChange={(e) => onChange({ ...value, to_date: e.target.value })}
            className="h-9 w-[9.5rem] rounded-xl text-xs"
          />
        </div>
      )}
    </div>
  );
}
