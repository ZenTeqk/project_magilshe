import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchCrmCustomers, type CrmCustomerSearchResult } from "@/features/crm/hooks";

type Props = {
  term: string;
  selected: CrmCustomerSearchResult | null;
  onSelect: (customer: CrmCustomerSearchResult) => void;
  onChange: () => void;
};

export function CustomerMatchPicker({ term, selected, onSelect, onChange }: Props) {
  const [results, setResults] = useState<CrmCustomerSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) return;
    const normalized = term.trim();
    if (normalized.length < 2) { setResults([]); setSearched(false); return; }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => searchCrmCustomers(normalized)
      .then((rows) => { if (active) { setResults(rows); setSearched(true); } })
      .catch(() => { if (active) { setResults([]); setSearched(true); } })
      .finally(() => { if (active) setLoading(false); }), 300);
    return () => { active = false; clearTimeout(timer); };
  }, [term, selected]);

  if (selected) return <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-sm">
    <div><strong className="flex items-center gap-1.5 text-success"><CheckCircle2 className="size-4" /> Customer selected</strong><span className="block font-medium">{selected.name}</span><span className="text-xs text-muted-foreground">{selected.phone}{selected.email ? ` · ${selected.email}` : ""}</span></div>
    <Button type="button" size="sm" variant="outline" onClick={onChange}>Change customer</Button>
  </div>;
  if (loading) return <p className="mt-3 text-xs text-muted-foreground">Searching customers…</p>;
  if (!searched) return null;
  if (!results.length) return <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs"><strong>No customer found</strong><span className="block text-muted-foreground">Continue with the new customer workflow.</span></div>;
  return <div className="mt-3 rounded-xl border border-primary/25 bg-primary-soft/30 p-2">
    <strong className="px-1 text-xs text-primary">{results.length === 1 ? "Existing customer found" : "Existing customers found"}</strong>
    <div className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">{results.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-3 p-2.5">
      <div className="min-w-0"><strong className="block truncate text-sm">{customer.name}</strong><span className="block truncate text-xs text-muted-foreground">{customer.phone || "—"} · {customer.email || "—"}</span><span className="block text-[11px] text-muted-foreground">Customer since: {customer.customer_since ? new Date(customer.customer_since).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</span></div>
      <Button type="button" size="sm" variant="outline" onClick={() => onSelect(customer)}>Select</Button>
    </div>)}</div>
  </div>;
}
