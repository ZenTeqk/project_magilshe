import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Eye, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatusChip } from "@/components/shared/status-chip";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/data";
import {
  useOnlineOrders,
  useUpdateOrderStatus,
  useDeliveryPersons,
  orderStatusArray,
  type OnlineOrder,
} from "@/features/operations/operations-hooks";

function orderAmount(order: OnlineOrder) {
  return (order.cart_details ?? []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0,
  );
}

function OnlineOrdersPage() {
  const { data: orders, isLoading } = useOnlineOrders();
  const { data: deliveryPersons } = useDeliveryPersons();
  const updateStatus = useUpdateOrderStatus();

  const [selected, setSelected] = useState<OnlineOrder | null>(null);
  const [bill, setBill] = useState<OnlineOrder | null>(null);
  const [draft, setDraft] = useState<{ delivery_status: number; tracking_link: string; delivery_partner_id: number | string }>({
    delivery_status: 0,
    tracking_link: "",
    delivery_partner_id: "",
  });
  const navigate = useNavigate();

  const openOrder = (order: OnlineOrder) => {
    setSelected(order);
    setDraft({
      delivery_status: order.delivery_status ?? 0,
      tracking_link: order.tracking_link ?? "",
      delivery_partner_id: order.delivery_partner?.id ?? "",
    });
  };

  const save = async () => {
    if (!selected) return;
    try {
      await updateStatus.mutateAsync({
        cake_order_id: selected.id,
        delivery_status: draft.delivery_status,
        tracking_link: draft.tracking_link,
        delivery_partner_id: draft.delivery_partner_id,
      });
      toast.success("Order status updated");
      setSelected(null);
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const rows = [...(orders ?? [])].sort((a, b) => b.id - a.id);

  return (
    <>
      <PageHeader
        title="Online orders"
        description="Review storefront and manually entered customer orders."
        actions={<Button onClick={() => navigate("/manual-order")}>New manual order</Button>}
      />

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <DataTable<OnlineOrder>
          rows={rows}
          rowKey={(r) => String(r.id)}
          searchKeys={(r) => `${r.id} ${r.customer?.name ?? ""} ${r.customer?.phone ?? ""} ${r.delivery_address?.address ?? ""}`}
          searchPlaceholder="Search orders"
          emptyTitle="No online orders"
          emptyDescription="New storefront orders will appear here."
          onRowClick={openOrder}
          columns={[
            { key: "id", header: "Order", cell: (r) => <span className="font-medium">#{r.id}</span>, sortValue: (r) => r.id },
            {
              key: "customer",
              header: "Customer",
              sortValue: (r) => r.customer?.name ?? "",
              cell: (r) => (
                <span className="min-w-0">
                  <span className="block font-medium">{r.customer?.name || "—"}</span>
                  <span className="block text-xs text-muted-foreground tabular">{r.customer?.phone || "—"}</span>
                </span>
              ),
            },
            {
              key: "address",
              header: "Delivery address",
              cell: (r) => (
                <span className="line-clamp-1 max-w-xs text-muted-foreground">
                  {[r.delivery_address?.address_title, r.delivery_address?.address].filter(Boolean).join(", ") || "—"}
                </span>
              ),
            },
            {
              key: "items",
              header: "Items",
              align: "right",
              cell: (r) => <span className="tabular">{r.cart_id_list?.length ?? 0}</span>,
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              cell: (r) => <span className="tabular font-medium">{inr(orderAmount(r))}</span>,
              sortValue: (r) => orderAmount(r),
            },
            { key: "type", header: "Type", cell: (r) => <StatusChip status={r.is_manual_order ? "Manual" : "Online"} /> },
            {
              key: "ordered",
              header: "Ordered",
              cell: (r) => <span className="text-muted-foreground tabular">{r.order_time ? new Date(r.order_time).toLocaleString() : "—"}</span>,
              sortValue: (r) => r.order_time,
            },
            {
              key: "status",
              header: "Order status",
              cell: (r) => <StatusChip status={orderStatusArray[r.delivery_status] || "Unknown"} />,
            },
          ]}
          rowActions={(r) => (
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="size-8" aria-label={`View order ${r.id}`} onClick={() => openOrder(r)}>
                <Eye className="size-4" />
              </Button>
              {orderStatusArray[r.delivery_status] === "Delivered" && (
                <Button variant="ghost" size="icon" className="size-8" aria-label={`View bill ${r.id}`} onClick={() => setBill(r)}>
                  <FileText className="size-4" />
                </Button>
              )}
            </div>
          )}
        />
      )}

      <Sheet open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>Order #{selected?.id ?? ""}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="scroll-slim flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Customer</h3>
                  <StatusChip status={orderStatusArray[selected.delivery_status] || "Unknown"} />
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{selected.customer?.name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Phone</p><p>{selected.customer?.phone || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Email</p><p>{selected.customer?.email || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Order time</p><p>{selected.order_time ? new Date(selected.order_time).toLocaleString() : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Delivery time</p><p>{selected.delivery_time ? new Date(selected.delivery_time).toLocaleString() : "—"}</p></div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Delivery address</p>
                    <p>{[selected.delivery_address?.address_title, selected.delivery_address?.address].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
                <h3 className="mb-3 text-sm font-semibold">Fulfilment update</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tracking link" className="sm:col-span-2">
                    <Input value={draft.tracking_link} onChange={(e) => setDraft({ ...draft, tracking_link: e.target.value })} />
                  </Field>
                  <Field label="Delivery partner">
                    <Select value={String(draft.delivery_partner_id)} onValueChange={(v) => setDraft({ ...draft, delivery_partner_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select delivery partner" /></SelectTrigger>
                      <SelectContent>
                        {(deliveryPersons ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Order status">
                    <Select value={String(draft.delivery_status)} onValueChange={(v) => setDraft({ ...draft, delivery_status: Number(v) })}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {orderStatusArray.map((status, index) =>
                          index === 0 ? null : (
                            <SelectItem key={`${status}-${index}`} value={String(index)}>{status}</SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
                <h3 className="mb-3 text-sm font-semibold">Order items</h3>
                {selected.cart_details?.length ? (
                  <ul className="space-y-3">
                    {selected.cart_details.map((item, index) => (
                      <li key={item.id ?? index} className="flex items-center gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                        {item.cake?.images?.[0]?.url && (
                          <img src={item.cake.images[0].url} alt={item.cake?.name ?? "Cake"} className="size-12 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.cake?.name || "Cake item"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.cake?.sub_category?.name || ""} {item.price_list?.kg ? `· ${item.price_list.kg}` : ""} {item.cake?.unit?.name || "Pc"} × {item.qty}
                          </p>
                          {item.greeting_text && <StatusChip status={item.greeting_text} tone="success" className="mt-1" />}
                        </div>
                        <span className="font-semibold tabular">{inr(Number(item.price) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No items are attached to this order.</p>
                )}
              </div>
            </div>
          )}
          <SheetFooter className="border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {selected && orderStatusArray[selected.delivery_status] === "Delivered" && (
              <Button variant="outline" onClick={() => { setBill(selected); setSelected(null); }}>View bill</Button>
            )}
            <Button onClick={save} disabled={updateStatus.isPending}>{updateStatus.isPending ? "Updating…" : "Update order status"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={bill !== null} onOpenChange={(v) => !v && setBill(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>Invoice #{bill?.id ?? ""}</SheetTitle>
          </SheetHeader>
          {bill && (
            <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">Order #{bill.id}</p>
                  <p className="text-muted-foreground">Order date: {bill.order_time ? new Date(bill.order_time).toLocaleString() : "—"}</p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>Bill date: {bill.delivery_time ? new Date(bill.delivery_time).toLocaleString() : "—"}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold">{bill.customer?.name || "—"}</p>
                <p className="text-muted-foreground">{bill.delivery_address?.address || "—"}</p>
                <p className="text-muted-foreground">{bill.customer?.phone || "—"} · {bill.customer?.email || "—"}</p>
              </div>
              <div className="scroll-slim overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-max text-sm">
                  <thead className="bg-surface-muted/70 text-xs uppercase text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">No.</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {bill.cart_details?.map((item, index) => (
                      <tr key={item.id ?? index} className="border-t border-border">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{item.cake?.name || "Cake"}{item.price_list?.kg ? ` (${item.price_list.kg} kg)` : ""}</td>
                        <td className="px-3 py-2 text-right tabular">{item.qty}</td>
                        <td className="px-3 py-2 text-right tabular">{inr(Number(item.price) || 0)}</td>
                        <td className="px-3 py-2 text-right tabular">{inr((Number(item.qty) || 0) * (Number(item.price) || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td colSpan={4} className="px-3 py-2 text-right">Grand total</td>
                      <td className="px-3 py-2 text-right tabular">{inr(orderAmount(bill))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-center text-muted-foreground">Thank you for your business.</p>
            </div>
          )}
          <SheetFooter className="border-t border-border px-6 py-4">
            <Button variant="ghost" onClick={() => { setBill(null); if (bill) openOrder(bill); }}>Back to order</Button>
            <Button onClick={() => window.print()}>Print bill</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default OnlineOrdersPage;
