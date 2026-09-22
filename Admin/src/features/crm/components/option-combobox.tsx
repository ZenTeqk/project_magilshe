import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OptionComboboxProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

export function OptionCombobox({
  value,
  options,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
  className,
}: OptionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const visibleOptions = useMemo(() => {
    const query = String(value ?? "").trim().toLowerCase();
    const cleaned = [...new Map(options.map((option) => [option.trim().toLowerCase(), option.trim()])).values()]
      .filter(Boolean);
    if (!query) return cleaned;
    return cleaned.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  const updateMenuPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
    });
  };

  const openMenu = () => {
    updateMenuPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const menu = open ? (
    <div
      className="fixed z-[1000] max-h-56 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={menuStyle}
    >
      {visibleOptions.length ? (
        visibleOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onMouseDown={(event) => {
              event.preventDefault();
              onChange(option);
              setOpen(false);
            }}
          >
            {option}
          </button>
        ))
      ) : (
        <p className="px-2.5 py-2 text-sm text-muted-foreground">No configured option. Keep typing to use a custom value.</p>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)} onBlur={scheduleClose} onFocus={cancelClose}>
      <Input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onFocus={openMenu}
        onChange={(event) => {
          onChange(event.target.value);
          openMenu();
        }}
        className="w-full pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          updateMenuPosition();
          setOpen((current) => !current);
        }}
        aria-label="Show options"
      >
        <ChevronDown className="size-4" />
      </Button>
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
