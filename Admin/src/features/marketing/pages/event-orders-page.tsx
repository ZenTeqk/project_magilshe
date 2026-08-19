import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr } from "@/lib/data";
import { useCatalogCakes } from "@/features/catalog/catalog-hooks";
import {
  useMarketingEventOrders, useMarketingEventOrderDetail, useUpdateMarketingEventOrderStatus,
  type MarketingEventOrder,
} from "@/features/marketing/marketing-hooks";

function EventOrdersPage() {
  const { data: orders, isLoading } = useMarketingEventOrders();
  const { data: cakes } = useCatalogCakes();

  const [openId, setOpenId] = useState<number | null>(null);
  const { data: orderDetails, isLoading: detailLoading } = useMarketingEventOrderDetail(openId);
  const updateStatus = useUpdateMarketingEventOrderStatus();
  const [statusDraft, setStatusDraft] = useState("");

  const view = (row: MarketingEventOrder) => {
    setOpenId(row.id);
    setStatusDraft(String(row.order_status));
  };
  const close = () => { setOpenId(null); setStatusDraft(""); };

  const cake = (id: number) => (cakes ?? []).find((c) => c.id === id);

  const itemRows = (orderDetails?.cake_price_details ?? []).map((item) => {
    const product = cake(item.cake_id);
    const priceRow = product?.price_list?.find((p) => p.id === item.id);
    const price = Number(priceRow?.price ?? 0);
    const qty = Number(item.qty ?? 0);
    return {
      key: `${item.cake_id}-${item.id}`,
      name: product?.name ?? "Unknown cake",
      unit: priceRow?.kg ?? "",
      qty,
      price,
      total: price * qty,
    };
  });

  const saveStatus = async () => {
    if (!openId) return;
    const value = Number(statusDraft);
    if (!statusDraft || Number.isNaN(value)) { toast.warning("Please enter a valid order status"); return; }
    try {
      const result = await updateStatus.mutateAsync({ id: openId, order_status: value });
      toast.success(result.message || "Status Updated Successfully!");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <PageHeader
        title="Event Orders"
        description="Review customer orders submitted through website events."
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <DataTable<MarketingEventOrder>
          rows={orders ?? []}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.name} ${r.phone}`}
          emptyTitle="No event orders found"
          onRowClick={view}
          columns={[
            { key: "id", header: "Order", cell: (r) => <span className="font-medium">#{r.id}</span> },
            { key: "name", header: "Customer", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: "phone", header: "Phone", cell: (r) => <span className="tabular">{r.phone}</span> },
            { key: "status", header: "Status", cell: (r) => <StatusChip status={`Status ${r.order_status}`} tone="info" /> },
            { key: "total", header: "Total", align: "right", sortValue: (r) => r.total_amount, cell: (r) => <span className="tabular font-medium">{inr(r.total_amount)}</span> },
          ]}
          rowActions={(r) => (
            <Button variant="outline" size="sm" onClick={() => view(r)}>View order</Button>
          )}
        />
      )}

      <Dialog open={openId !== null} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Event order #{openId}</DialogTitle></DialogHeader>
          {detailLoading || !orderDetails ? (
            <EmptyState title={detailLoading ? "Loading order…" : "Order details unavailable"} />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Customer</p>
                  <p className="text-sm font-medium">{orderDetails.name}</p>
                  <p className="text-sm text-muted-foreground">{orderDetails.phone}{orderDetails.email ? ` · ${orderDetails.email}` : ""}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Ordered</p>
                  <p className="text-sm">{orderDetails.ordered_time ? new Date(orderDetails.ordered_time).toLocaleString() : "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Address</p>
                  <p className="text-sm">{orderDetails.address || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                  <p className="text-sm">{orderDetails.notes || "—"}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Cake details</p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-muted/70">
                      <tr className="text-left text-xs font-semibold text-muted-foreground uppercase">
                        <th className="px-3 py-2">Cake / product</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((item) => (
                        <tr key={item.key} className="border-t border-border">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2 text-right tabular">{item.qty}</td>
                          <td className="px-3 py-2 text-right tabular">{inr(item.price)}</td>
                          <td className="px-3 py-2 text-right tabular font-medium">{inr(item.total)}</td>
                        </tr>
                      ))}
                      {!itemRows.length && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No items on this order.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex justify-end text-sm">
                  Grand Total&nbsp;<strong className="tabular">{inr(orderDetails.total_amount)}</strong>
                </div>
              </div>

              <div className="flex items-end gap-2 rounded-xl border border-border p-3">
                <Field label="Order status" help="Numeric status code as stored by the backend." className="flex-1">
                  <Input type="number" min={0} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} />
                </Field>
                <Button onClick={saveStatus} disabled={updateStatus.isPending}>
                  {updateStatus.isPending ? "Updating…" : "Update status"}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EventOrdersPage;
