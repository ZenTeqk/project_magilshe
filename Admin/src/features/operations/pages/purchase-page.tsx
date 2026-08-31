import { useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { inr } from "@/lib/data";
import {
  usePurchases,
  usePurchaseItems,
  useSavePurchase,
  usePurchaseBill,
  type PurchaseRecord,
  type PurchaseLineItem,
  type PurchaseItemOption,
} from "@/features/operations/operations-hooks";

// Matches Admin/src/Constant/Constant.js paymentMode exactly.
const paymentModes: Record<string, string> = {
  cash: "Cash", upi: "UPI", debit_card: "Debit Card", credit_card: "Credit Card",
  due: "Due", cheque: "Cheque", net_banking: "Net Banking",
};

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type PurchaseDetail = {
  id?: number | undefined;
  comment: string;
  payment_type: string;
  invoice_date: string;
  invoice_number: string;
  supplier_name: string;
  total_amount: string;
};

const emptyDetail: PurchaseDetail = { comment: "", payment_type: "", invoice_date: "", invoice_number: "", supplier_name: "", total_amount: "0" };

function PurchasePage() {
  const [range, setRange] = useState(() => ({
    startDate: toLocalDate(new Date(new Date().setDate(new Date().getDate() - 30))),
    endDate: toLocalDate(new Date()),
  }));
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePurchases({ start: range.startDate, end: range.endDate, page, pageSize: 10 });
  const { data: itemOptions } = usePurchaseItems();
  const savePurchase = useSavePurchase();

  const [editor, setEditor] = useState<{ detail: PurchaseDetail; items: PurchaseLineItem[] } | null>(null);
  const [pickItem, setPickItem] = useState("");
  const [billId, setBillId] = useState<number | null>(null);
  const { data: bill } = usePurchaseBill(billId);

  const openNew = () => { setEditor({ detail: emptyDetail, items: [] }); setPickItem(""); };
  const openEdit = (row: PurchaseRecord) => {
    setEditor({
      detail: {
        id: row.id,
        comment: row.comment ?? "",
        payment_type: row.payment_type ?? "",
        invoice_date: row.invoice_date ?? "",
        invoice_number: row.invoice_number ?? "",
        supplier_name: row.supplier_name ?? "",
        total_amount: String(row.total_amount ?? 0),
      },
      items: row.purchase_items.map((it) => ({
        id: it.id, item_id: it.item.id, item_name: it.item.name, description: it.description ?? "",
        serialnumber: it.serialnumber ?? "", quantity_purchased: Number(it.quantity_purchased),
        mrp_price: it.mrp_price, purchase_price: it.purchase_price, retail_price: it.retail_price,
        wholesale_price: it.wholesale_price, discount: 0, discount_type: 1, stock_location: 1,
        receiving_quantity: it.receiving_quantity, is_edit_item: true,
      })),
    });
    setPickItem("");
  };

  const currentTotal = (editor?.items ?? [])
    .filter((it) => !it.is_deleted)
    .reduce((sum, it) => sum + Number(it.purchase_price) * Number(it.quantity_purchased), 0);

  const addItem = (id: string) => {
    if (!editor) return;
    const item = (itemOptions ?? []).find((i) => String(i.id) === id);
    if (!item) return;
    const existingIndex = editor.items.findIndex((it) => it.item_id === item.id && !it.is_deleted);
    if (existingIndex !== -1) {
      const updated = [...editor.items];
      const existing = updated[existingIndex];
      if (!existing) return;
      const qty = Number(existing.quantity_purchased) + 1;
      updated[existingIndex] = { ...existing, quantity_purchased: qty };
      setEditor({ ...editor, items: updated });
    } else {
      const newItem: PurchaseLineItem = {
        item_id: item.id, item_name: item.name, description: item.description ?? "", serialnumber: "",
        quantity_purchased: 1, mrp_price: item.mrp_price ?? 0, purchase_price: item.purchase_price ?? 0,
        retail_price: item.retail_price ?? 0, wholesale_price: item.wholesale_price ?? 0,
        discount: 0, discount_type: 1, stock_location: 1, receiving_quantity: item.receiving_quantity ?? 1,
      };
      setEditor({ ...editor, items: [...editor.items, newItem] });
    }
    setPickItem("");
  };

  const updateLine = (index: number, field: keyof PurchaseLineItem, value: string) => {
    if (!editor) return;
    const items = editor.items.map((it, i) => {
      if (i !== index) return it;
      if (field === "quantity_purchased") {
        const n = parseInt(value, 10);
        return { ...it, quantity_purchased: isNaN(n) || n <= 0 ? 1 : n };
      }
      return { ...it, [field]: value };
    });
    setEditor({ ...editor, items });
  };

  const toggleLine = (index: number) => {
    if (!editor) return;
    const items = editor.items
      .map((it, i) => {
        if (i !== index) return it;
        if (it.is_deleted) return { ...it, is_deleted: false };
        return it.is_edit_item ? { ...it, is_deleted: true } : null;
      })
      .filter((it): it is PurchaseLineItem => it !== null);
    setEditor({ ...editor, items });
  };

  const finish = async () => {
    if (!editor) return;
    if (Math.abs(currentTotal - Number(editor.detail.total_amount || 0)) > 0.001) {
      toast.warning("Please check Total with Amount Tendered");
      return;
    }
    try {
      const result = await savePurchase.mutateAsync({
        purchase: {
          id: editor.detail.id,
          comment: editor.detail.comment,
          payment_type: editor.detail.payment_type,
          invoice_date: editor.detail.invoice_date,
          invoice_number: editor.detail.invoice_number,
          supplier_name: editor.detail.supplier_name,
          total_amount: Number(editor.detail.total_amount || 0),
        },
        items: editor.items,
      });
      toast.success(result.message || "Purchase saved");
      setEditor(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Record supplier invoices and stock purchases."
        actions={<Button onClick={openNew}><Plus className="size-4" /> New purchase</Button>}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <Field label="From"><Input type="date" value={range.startDate} onChange={(e) => setRange({ ...range, startDate: e.target.value })} /></Field>
        <Field label="To"><Input type="date" value={range.endDate} onChange={(e) => setRange({ ...range, endDate: e.target.value })} /></Field>
        <Button variant="outline" onClick={() => setPage(1)}><RotateCcw className="size-4" /> Apply dates</Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <>
          <DataTable<PurchaseRecord>
            rows={rows}
            rowKey={(r) => String(r.id)}
            searchKeys={(r) => `${r.id} ${r.supplier_name ?? ""} ${r.invoice_number ?? ""}`}
            searchPlaceholder="Search purchases"
            emptyTitle="No purchases"
            emptyDescription="Create a purchase to record a supplier invoice."
            onRowClick={openEdit}
            pageSize={pageSize}
            columns={[
              { key: "id", header: "ID", cell: (r) => <span className="font-medium">{r.id}</span> },
              { key: "created", header: "Created", cell: (r) => <span className="text-muted-foreground tabular">{new Date(r.created_at).toLocaleDateString()}</span> },
              { key: "invoiceDate", header: "Invoice date", cell: (r) => <span className="tabular">{r.invoice_date || "—"}</span> },
              { key: "invoiceNo", header: "Invoice number", cell: (r) => <span className="font-medium tabular">{r.invoice_number || "—"}</span> },
              { key: "supplier", header: "Supplier", cell: (r) => r.supplier_name || "—" },
              { key: "total", header: "Total", align: "right", cell: (r) => <span className="tabular font-medium">{inr(Number(r.total_amount ?? 0))}</span>, sortValue: (r) => Number(r.total_amount ?? 0) },
              { key: "payment", header: "Payment", cell: (r) => paymentModes[r.payment_type ?? ""] || r.payment_type || "—" },
            ]}
            rowActions={(r) => (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setBillId(r.id); }}>View bill</Button>
            )}
          />
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>{total} purchase{total === 1 ? "" : "s"} in range</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page} / {pageCount}</span>
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={editor !== null} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{editor?.detail.id ? `Edit purchase #${editor.detail.id}` : "New purchase"}</DialogTitle></DialogHeader>
          {editor && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                <Field label="Select an item">
                  <Select value={pickItem} onValueChange={addItem}>
                    <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                    <SelectContent>
                      {(itemOptions ?? []).map((item: PurchaseItemOption) => (
                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="scroll-slim overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-max text-sm">
                    <thead className="bg-surface-muted/70 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2" />
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Purchase</th>
                        <th className="px-3 py-2 text-right">MRP</th>
                        <th className="px-3 py-2 text-right">Wholesale</th>
                        <th className="px-3 py-2 text-right">Retail</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editor.items.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-3 py-2">
                            <Button type="button" variant="ghost" size="icon" className={item.is_deleted ? "size-7 text-success" : "size-7 text-danger"} onClick={() => toggleLine(index)}>
                              {item.is_deleted ? <Plus className="size-3.5" /> : <Trash2 className="size-3.5" />}
                            </Button>
                          </td>
                          <td className="px-3 py-2">{item.item_name}</td>
                          <td className="px-3 py-2 text-right"><Input className="w-24 text-right" disabled={item.is_deleted} value={item.purchase_price} onChange={(e) => updateLine(index, "purchase_price", e.target.value)} /></td>
                          <td className="px-3 py-2 text-right"><Input className="w-24 text-right" disabled={item.is_deleted} value={item.mrp_price} onChange={(e) => updateLine(index, "mrp_price", e.target.value)} /></td>
                          <td className="px-3 py-2 text-right"><Input className="w-24 text-right" disabled={item.is_deleted} value={item.wholesale_price} onChange={(e) => updateLine(index, "wholesale_price", e.target.value)} /></td>
                          <td className="px-3 py-2 text-right"><Input className="w-24 text-right" disabled={item.is_deleted} value={item.retail_price} onChange={(e) => updateLine(index, "retail_price", e.target.value)} /></td>
                          <td className="px-3 py-2 text-right"><Input className="w-16 text-right" disabled={item.is_deleted} value={item.quantity_purchased} onChange={(e) => updateLine(index, "quantity_purchased", e.target.value)} /></td>
                          <td className="px-3 py-2 text-right tabular">{item.is_deleted ? "-" : inr(Number(item.purchase_price) * Number(item.quantity_purchased))}</td>
                        </tr>
                      ))}
                      {editor.items.length === 0 && (
                        <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Select an item above to add a line.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-3">
                {editor.detail.id && <p className="text-sm font-semibold text-danger">Purchase ID: #{editor.detail.id}</p>}
                <Field label="Supplier name"><Input value={editor.detail.supplier_name} onChange={(e) => setEditor({ ...editor, detail: { ...editor.detail, supplier_name: e.target.value } })} /></Field>
                <Field label="Invoice number"><Input value={editor.detail.invoice_number} onChange={(e) => setEditor({ ...editor, detail: { ...editor.detail, invoice_number: e.target.value } })} /></Field>
                <Field label="Purchase date"><Input type="date" value={editor.detail.invoice_date} onChange={(e) => setEditor({ ...editor, detail: { ...editor.detail, invoice_date: e.target.value } })} /></Field>
                <Field label="Payment mode">
                  <Select value={editor.detail.payment_type} onValueChange={(v) => setEditor({ ...editor, detail: { ...editor.detail, payment_type: v } })}>
                    <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                    <SelectContent>{Object.entries(paymentModes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Amount tendered"><Input value={editor.detail.total_amount} onChange={(e) => setEditor({ ...editor, detail: { ...editor.detail, total_amount: e.target.value } })} /></Field>
                <Field label="Comment"><Textarea rows={2} value={editor.detail.comment} onChange={(e) => setEditor({ ...editor, detail: { ...editor.detail, comment: e.target.value } })} /></Field>
                <div className="flex items-baseline justify-between rounded-xl bg-primary-soft px-3 py-2.5 text-sm text-primary"><span className="font-semibold">Grand total</span><span className="tabular text-lg font-semibold">{inr(currentTotal)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={finish} disabled={savePurchase.isPending}>{savePurchase.isPending ? "Saving…" : "Finish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={billId !== null} onOpenChange={(v) => !v && setBillId(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>Purchase receipt #{bill?.invoice_number ?? billId ?? ""}</SheetTitle>
          </SheetHeader>
          {bill && (
            <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div className="flex justify-between">
                <div>
                  <p>Invoice No.: #{bill.invoice_number}</p>
                  <p>Purchase ID.: #{bill.id}</p>
                  <p>Bill mode: {paymentModes[bill.payment_type ?? ""] || bill.payment_type || "—"}</p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>Receiving date: {new Date(bill.created_at).toLocaleDateString()}</p>
                  <p>Invoice date: {bill.invoice_date || "—"}</p>
                </div>
              </div>
              <div className="scroll-slim overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-surface-muted/70 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">S.No</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {bill.purchase_items.map((item, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{item.item?.name}</td>
                        <td className="px-3 py-2 text-right tabular">{item.receiving_quantity}</td>
                        <td className="px-3 py-2 text-right tabular">{inr(Number(item.purchase_price))}</td>
                        <td className="px-3 py-2 text-right tabular">{inr(Number(item.receiving_quantity) * Number(item.purchase_price))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Subtotal</td><td className="px-3 py-2 text-right tabular">{inr(Number(bill.total_amount ?? 0))}</td></tr>
                    <tr className="font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Tax</td><td className="px-3 py-2 text-right tabular">₹0</td></tr>
                    <tr className="text-primary"><td colSpan={4} className="px-3 py-2 text-right font-semibold">Grand total</td><td className="px-3 py-2 text-right tabular text-lg font-semibold">{inr(Number(bill.total_amount ?? 0))}</td></tr>
                  </tfoot>
                </table>
              </div>
              {bill.comment && <p className="text-muted-foreground">Comment: {bill.comment}</p>}
            </div>
          )}
          <SheetFooter className="border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => setBillId(null)}>Back</Button>
            <Button onClick={() => window.print()}>Print receipt</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default PurchasePage;
