import { Construction } from "lucide-react";

/**
 * Shown on modules not yet wired to the real backend in this pass — makes it
 * impossible to mistake sample rows for live data. Remove once a module's
 * route is rebuilt against real endpoints (see docs/MIGRATION_PLAN roadmap).
 */
export function PreviewBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning">
      <Construction className="size-4 shrink-0" />
      <span>
        <span className="font-semibold">Preview layout.</span> This module is still on sample data —
        backend wiring lands in a follow-up pass.
      </span>
    </div>
  );
}
