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
  onCreateOption?: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  portal?: boolean;
  disabled?: boolean;
};

export function OptionCombobox({
  value,
  options,
  onChange,
  onCreateOption,
  placeholder,
  type = "text",
  min,
  max,
  step,
  className,
  portal = false,
  disabled = false,
}: OptionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const visibleOptions = useMemo(() => {
    const query = String(value ?? "").trim().toLowerCase();
    const cleaned = [...new Map(options.map((option) => [option.trim().toLowerCase(), option.trim()])).values()]
      .filter(Boolean);
    if (showAllOptions || !query) return cleaned;
    return cleaned.filter((option) => option.toLowerCase().includes(query));
  }, [options, showAllOptions, value]);
  const optionExists = (candidate: string) => (
    options.some((option) => option.trim().toLowerCase() === candidate.trim().toLowerCase())
  );
  const persistTypedOption = () => {
    const typed = String(value ?? "").trim();
    if (!typed || optionExists(typed)) return;
    onCreateOption?.(typed);
  };

  const selectOption = (option: string) => {
    cancelClose();
    onChange(option);
    setOpen(false);
  };

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  const openMenu = () => {
    if (disabled) return;
    setShowAllOptions(true);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !portal) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      // Open upwards when the field sits near the bottom of the screen; a fixed
      // menu running past the viewport edge can't be scrolled into view.
      if (spaceBelow < 224 && spaceAbove > spaceBelow) {
        setPortalStyle({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          maxHeight: spaceAbove,
        });
        return;
      }
      setPortalStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(160, spaceBelow),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, portal]);

  const menu = open ? (
    <div
      className={cn(
        portal ? "fixed z-[1000]" : "absolute top-full right-0 left-0 z-[70] mt-1 max-h-56",
        // A modal Radix Dialog sets document.body's pointer-events to "none" while open,
        // which this portaled menu (appended directly to body) would otherwise inherit,
        // making it visible but unclickable. Force it back on for this menu and its options.
        "pointer-events-auto overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
      )}
      style={portal ? portalStyle ?? undefined : undefined}
    >
      {visibleOptions.length ? (
        visibleOptions.map((option) => (
          <button
            key={option}
            type="button"
            className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onPointerDown={(event) => {
              event.preventDefault();
              selectOption(option);
            }}
            onMouseDown={(event) => {
              event.preventDefault();
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
    <div
      ref={rootRef}
      className={cn("relative min-w-0", className)}
      onBlur={() => {
        persistTypedOption();
        scheduleClose();
      }}
      onFocus={cancelClose}
    >
      <Input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={openMenu}
        onChange={(event) => {
          setShowAllOptions(false);
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            persistTypedOption();
            setOpen(false);
          }
        }}
        className="w-full pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
        onPointerDown={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setShowAllOptions(true);
          setOpen((current) => !current);
        }}
        aria-label="Show options"
      >
        <ChevronDown className="size-4" />
      </Button>
      {portal && menu ? createPortal(menu, document.body) : menu}
    </div>
  );
}
