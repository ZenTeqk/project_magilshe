import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "./page-header";
import { DataTable, type Column } from "./data-table";
import { PreviewBanner } from "./preview-banner";
import { Button } from "@/components/ui/button";

export function ListModule<T>({
  title,
  description,
  createLabel,
  createTo,
  rows,
  columns,
  rowKey,
  searchKeys,
  above,
  below,
  stats,
}: {
  title: string;
  description: string;
  createLabel?: string;
  createTo?: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  searchKeys: (r: T) => string;
  above?: ReactNode;
  below?: ReactNode;
  stats?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          createLabel ? (
            <Button
              className="rounded-xl gradient-brand text-primary-foreground shadow-soft hover:opacity-95"
              asChild
            >
              <Link to={createTo ?? "/"}>
                <Plus className="size-4" /> {createLabel}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <PreviewBanner />
      {stats}
      {above}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={rowKey}
        searchKeys={searchKeys}
        exportName={title.toLowerCase()}
      />
      {below}
    </>
  );
}
