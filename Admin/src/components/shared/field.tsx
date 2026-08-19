import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  error,
  help,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  help?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}
