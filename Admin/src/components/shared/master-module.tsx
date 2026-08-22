import { useState, type ReactNode } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "./page-header";
import { DataTable, type Column } from "./data-table";
import { RecordDrawer, type FieldSection } from "./record-drawer";
import { PreviewBanner } from "./preview-banner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function MasterModule<T>({
  title,
  description,
  createLabel,
  rows,
  columns,
  rowKey,
  searchKeys,
  sections,
  headerExtras,
  above,
  below,
  canDelete = true,
  canEdit = true,
  pageSize,
}: {
  title: string;
  description: string;
  createLabel: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchKeys: (row: T) => string;
  sections: FieldSection[];
  headerExtras?: ReactNode;
  above?: ReactNode;
  below?: ReactNode;
  canDelete?: boolean;
  canEdit?: boolean;
  pageSize?: number;
}) {
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "create" | "edit" }>({
    open: false,
    mode: "create",
  });
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerExtras}
            <Button
              className="rounded-xl gradient-brand text-primary-foreground shadow-soft hover:opacity-95"
              onClick={() => setDrawer({ open: true, mode: "create" })}
            >
              <Plus className="size-4" /> {createLabel}
            </Button>
          </>
        }
      />
      <PreviewBanner />
      {above}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={rowKey}
        searchKeys={searchKeys}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        exportName={title.toLowerCase().replace(/\s+/g, "-")}
        pageSize={pageSize}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription={`Create your first record to see it listed here.`}
        {...(canEdit ? { onRowClick: () => setDrawer({ open: true, mode: "edit" }) } : {})}
        bulkActions={(sel) => (
          <>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => toast.success(`${sel.length} records exported`)}
            >
              Export selection
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-danger"
                onClick={() => setConfirm(`${sel.length} records`)}
              >
                Delete
              </Button>
            )}
          </>
        )}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                aria-label="Row actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canEdit && (
                <DropdownMenuItem onClick={() => setDrawer({ open: true, mode: "edit" })}>
                  <Pencil className="size-4" /> Edit record
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => toast.success("Duplicated as draft")}>
                Duplicate
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-danger" onClick={() => setConfirm(rowKey(row))}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      {below}

      <RecordDrawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((d) => ({ ...d, open: v }))}
        title={drawer.mode === "create" ? createLabel : `Edit ${title.replace(/s$/, "")}`}
        description={description}
        sections={sections}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirm}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record from the workspace. Linked history stays intact for reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep record</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={() => {
                toast.success("Record deleted");
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
