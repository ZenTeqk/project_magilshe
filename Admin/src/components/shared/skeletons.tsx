import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-5 rounded-md" style={{ opacity: 1 - r * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return <Skeleton className="h-32 rounded-2xl" />;
}
