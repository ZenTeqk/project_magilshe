import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { flatNav, quickCreate } from "@/lib/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Target, Contact } from "lucide-react";
import {
  useCommandPaletteCustomerSearch,
  useCommandPaletteLeadSearch,
  useDebouncedValue,
} from "./command-palette-search-hooks";

const MIN_QUERY_LENGTH = 2;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const leadSearch = useCommandPaletteLeadSearch(debouncedQuery);
  const customerSearch = useCommandPaletteCustomerSearch(debouncedQuery);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search modules, records, actions…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Quick create">
          {quickCreate.map((q) => (
            <CommandItem
              key={q.label}
              value={`create ${q.label}`}
              onSelect={() => {
                go(q.to);
                toast.success(`${q.label} — form ready`);
              }}
            >
              <Plus className="size-4 text-primary" />
              {q.label}
              <span className="ml-auto text-xs text-muted-foreground">⌘{q.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {flatNav.map((item) => (
            <CommandItem
              key={item.to}
              value={[item.label, ...(item.aliases ?? [])].join(" ")}
              onSelect={() => go(item.to)}
            >
              <item.icon className="size-4 text-muted-foreground" />
              {item.label}
              <span className="ml-auto text-xs text-muted-foreground">{item.to}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {isSearching && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Leads">
              {leadSearch.isFetching && (
                <CommandItem disabled value="__leads-loading">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  Searching leads…
                </CommandItem>
              )}
              {!leadSearch.isFetching &&
                (leadSearch.data ?? []).map((lead) => (
                  <CommandItem
                    key={`lead-${lead.id}`}
                    value={`lead ${lead.lead_no} ${lead.customer_name} ${lead.phone}`}
                    onSelect={() => go(`/crm/leads/${lead.id}/edit`)}
                  >
                    <Target className="size-4 text-muted-foreground" />
                    <span>
                      {lead.customer_name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {lead.lead_no} · {lead.phone}
                      </span>
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{lead.status}</span>
                  </CommandItem>
                ))}
              {!leadSearch.isFetching && leadSearch.data?.length === 0 && (
                <CommandItem disabled value="__leads-empty">
                  No matching leads
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customerSearch.isFetching && (
                <CommandItem disabled value="__customers-loading">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  Searching customers…
                </CommandItem>
              )}
              {!customerSearch.isFetching &&
                (customerSearch.data ?? []).map((customer) => (
                  <CommandItem
                    key={`customer-${customer.id}`}
                    value={`customer ${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`}
                    onSelect={() => go(`/crm/customers/${customer.id}`)}
                  >
                    <Contact className="size-4 text-muted-foreground" />
                    <span>
                      {customer.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {customer.phone ?? customer.email ?? ""}
                      </span>
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {customer.is_active ? "Active" : "Inactive"}
                    </span>
                  </CommandItem>
                ))}
              {!customerSearch.isFetching && customerSearch.data?.length === 0 && (
                <CommandItem disabled value="__customers-empty">
                  No matching customers
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
