import { useMemo, useRef, useState } from "react";
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
}: OptionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
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
    setShowAllOptions(true);
    setOpen(true);
  };

  const menu = open ? (
    <div
      className="absolute top-full right-0 left-0 z-[70] mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
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
      {menu}
    </div>
  );
}
