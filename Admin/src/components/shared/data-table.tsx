import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  hidden?: boolean;
};

export type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchKeys?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode | undefined;
  filters?: ReactNode;
  bulkActions?: (selected: string[]) => ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  pageSize?: number | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  selectable?: boolean;
  exportName?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchKeys,
  searchPlaceholder = "Search…",
  toolbar,
  filters,
  bulkActions,
  onRowClick,
  rowActions,
  pageSize = 8,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  selectable = true,
  exportName = "export",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.hidden).map((c) => c.key));
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const visible = columns.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q && searchKeys ? rows.filter((r) => searchKeys(r).toLowerCase().includes(q)) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const r = av > bv ? 1 : av < bv ? -1 : 0;
          return sort.dir === "asc" ? r : -r;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(rowKey(r)));

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex flex-col gap-3 border-b border-border bg-surface-muted/35 p-3.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              className="h-9 rounded-xl pl-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {toolbar}
            {filters && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="size-4" /> Filters
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Columns3 className="size-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.includes(c.key)}
                    onCheckedChange={(v) =>
                      setHidden((h) => (v ? h.filter((k) => k !== c.key) : [...h, c.key]))
                    }
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() =>
                toast.success(`${filtered.length} rows queued for export`, {
                  description: `${exportName}.csv will download shortly.`,
                })
              }
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        </div>
        {filters && showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted p-3">
            {filters}
          </div>
        )}
        {selectable && selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft px-3 py-2 text-sm">
            <span className="font-medium text-primary">{selected.length} selected</span>
            <div className="flex items-center gap-2">
              {bulkActions?.(selected)}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setSelected([])}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {pageRows.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription ?? "Adjust your filters or create the first record."}
        />
      ) : (
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface-muted/90 backdrop-blur">
              <tr className="text-left">
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(v) =>
                        setSelected((s) =>
                          v
                            ? Array.from(new Set([...s, ...pageRows.map(rowKey)]))
                            : s.filter((k) => !pageRows.map(rowKey).includes(k)),
                        )
                      }
                      aria-label="Select page"
                    />
                  </th>
                )}
                {visible.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                      c.align === "right" && "text-right",
                      c.sortValue && "cursor-pointer select-none hover:text-foreground",
                    )}
                    onClick={() =>
                      c.sortValue &&
                      setSort((s) =>
                        s?.key === c.key
                          ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                          : { key: c.key, dir: "asc" },
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {c.sortValue && (
                        <ChevronDown
                          className={cn(
                            "size-3 opacity-40 transition-transform",
                            sort?.key === c.key && "opacity-100",
                            sort?.key === c.key && sort.dir === "asc" && "rotate-180",
                          )}
                        />
                      )}
                    </span>
                  </th>
                ))}
                {rowActions && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-t border-border transition-colors",
                      onRowClick && "cursor-pointer",
                      "hover:bg-surface-muted/70",
                      selected.includes(key) && "bg-primary-soft/50",
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(key)}
                          onCheckedChange={(v) =>
                            setSelected((s) => (v ? [...s, key] : s.filter((k) => k !== key)))
                          }
                          aria-label={`Select ${key}`}
                        />
                      </td>
                    )}
                    {visible.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 align-middle",
                          c.align === "right" && "text-right",
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          Showing {filtered.length === 0 ? 0 : current * pageSize + 1}–
          {Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 font-medium text-foreground">
            {current + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
