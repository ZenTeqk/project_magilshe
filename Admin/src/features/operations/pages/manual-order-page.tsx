import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr } from "@/lib/data";
import { useCatalogCakes, type CatalogCake, type CakePriceRow } from "@/features/catalog/catalog-hooks";
import {
  useCheckCustomer,
  useCreateManualCustomer,
  useAddManualCart,
  useSaveManualOrder,
  type ManualCartLine,
} from "@/features/operations/operations-hooks";

const occasions = ["Birthday", "Marriage Anniversary", "Work Anniversary", "Others"];

type CartLine = ManualCartLine & { row_id: number; cake_name: string };

type CustomerState = {
  phone: string;
  name: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  customerId: number | null;
  addressId: number | null;
  searched: boolean;
};

const emptyCustomer: CustomerState = {
  phone: "", name: "", email: "", address: "", city: "", pincode: "",
  customerId: null, addressId: null, searched: false,
};

function localDeliveryDateTime() {
  const now = new Date();
  const offset = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offset.toISOString().slice(0, 16);
}

function ManualOrderPage() {
  const navigate = useNavigate();
  const { data: cakes, isLoading: cakesLoading } = useCatalogCakes();
  const checkCustomer = useCheckCustomer();
  const createCustomer = useCreateManualCustomer();
  const addManualCart = useAddManualCart();
  const saveManualOrder = useSaveManualOrder();

  const [customer, setCustomer] = useState<CustomerState>(emptyCustomer);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(localDeliveryDateTime());

  const [itemDialog, setItemDialog] = useState<{ cake: CatalogCake } | null>(null);
  const [variant, setVariant] = useState<CakePriceRow | null>(null);
  const [qty, setQty] = useState(1);
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [personName, setPersonName] = useState("");
  const [greeting, setGreeting] = useState("");

  const grandTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const openItem = (cake: CatalogCake) => {
    setItemDialog({ cake });
    setVariant(null);
    setQty(1);
    setOccasion("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setPersonName("");
    setGreeting("");
  };

  const price = variant ? Number(variant.price) * qty : 0;

  const addToCart = () => {
    if (!variant || !qty || !occasion || !eventDate || !personName || !greeting) {
      toast.warning("Please fill out all fields.");
      return;
    }
    if (!itemDialog) return;
    setCart((prev) => [
      ...prev,
      {
        row_id: prev.length + 1,
        cake_price: variant.id,
        price,
        qty,
        greeting_text: greeting,
        type: occasion,
        date: eventDate,
        person_name: personName,
        cake_name: itemDialog.cake.name,
      },
    ]);
    setItemDialog(null);
  };

  const removeLine = (row_id: number) => setCart((prev) => prev.filter((item) => item.row_id !== row_id));

  const checkPhone = async () => {
    if (!customer.phone.trim()) {
      toast.warning("Enter a phone number first");
      return;
    }
    try {
      const result = await checkCustomer.mutateAsync(customer.phone.trim());
      if (result?.address_details) {
        const primaryAddress = result.address_details[0];
        setCustomer((prev) => ({
          ...prev,
          name: result.name,
          email: result.email,
          customerId: result.id,
          addressId: primaryAddress?.id ?? null,
          searched: true,
        }));
      } else {
        setCustomer((prev) => ({ ...prev, searched: true }));
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const editPhone = () => setCustomer(emptyCustomer);

  const addNewCustomer = async () => {
    if (!customer.phone || !customer.name || !customer.email || !customer.address || !customer.city || !customer.pincode) {
      toast.warning("Please fill all customer fields");
      return;
    }
    try {
      const result = await createCustomer.mutateAsync({
        phone: customer.phone, name: customer.name, email: customer.email,
        address: customer.address, city: customer.city, pincode: customer.pincode,
      });
      toast.success("Customer added successfully");
      const addressId = result.data.address_details?.[0]?.id ?? null;
      setCustomer((prev) => ({ ...prev, customerId: result.data.id, addressId }));
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const finish = async () => {
    if (!customer.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty. Please add items to the cart");
      return;
    }
    if (!customer.addressId || !deliveryDate) {
      toast.error("Please provide delivery address and date");
      return;
    }
    try {
      const cartList: ManualCartLine[] = cart.map((item) => ({
        cake_price: item.cake_price, price: item.price, qty: item.qty,
        greeting_text: item.greeting_text, type: item.type, date: item.date, person_name: item.person_name,
      }));
      const addResult = await addManualCart.mutateAsync({ customer_id: customer.customerId, cart_list: cartList });
      const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
      await saveManualOrder.mutateAsync({
        customer_id: customer.customerId,
        cart_id_list: addResult.data,
        customer_address_id: customer.addressId,
        delivery_date_time: deliveryDate,
        delivery_person_email: customer.email,
        delivery_person_name: customer.name,
        delivery_person_phone: customer.phone,
        id: 0,
        total_amount: Math.trunc(grandTotal),
        total_qty: totalQty,
        tracking_link: "",
        is_manual_order: true,
      });
      toast.success("Order Successfully Complete");
      navigate("/orders");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const cancel = () => {
    if (window.confirm("Are you sure you want to cancel? All data will be cleared.")) {
      navigate("/orders");
    }
  };

  return (
    <>
      <PageHeader title="New manual order" description="Create an online-order record for a walk-in or phone customer." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Select an item">
            {cakesLoading ? (
              <p className="text-sm text-muted-foreground">Loading products…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(cakes ?? []).map((cake) => (
                  <button
                    key={cake.id}
                    type="button"
                    onClick={() => openItem(cake)}
                    className="rounded-xl border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <p className="font-medium">{cake.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{cake.sub_category?.name} · {cake.unit?.name}</p>
                    <p className="mt-2 text-sm font-semibold tabular">{inr(Number(cake.price_list?.[0]?.price ?? 0))}</p>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="scroll-slim overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-surface-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Greeting text</th>
                  <th className="px-4 py-3 text-left">Person name</th>
                  <th className="px-4 py-3 text-left">Occasion type</th>
                  <th className="px-4 py-3 text-left">Event date</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.row_id} className="border-t border-border">
                    <td className="px-4 py-3">{item.greeting_text}</td>
                    <td className="px-4 py-3">{item.person_name}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.date}</td>
                    <td className="px-4 py-3 text-right tabular">{item.qty}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{inr(item.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="size-8 text-danger" onClick={() => removeLine(item.row_id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Cart is empty. Select an item above to add a line.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard title="Customer">
            <Field label="Phone number" required help="Check the phone number before entering a new customer." className="mb-3">
              <Input value={customer.phone} disabled={customer.searched} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </Field>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={editPhone}>Edit phone</Button>
              <Button variant="outline" size="sm" onClick={checkPhone} disabled={checkCustomer.isPending}>Check customer</Button>
            </div>
            {customer.searched && (
              <div className="space-y-3">
                <Field label="Name" required><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></Field>
                {!customer.customerId && (
                  <>
                    <Field label="Address"><Textarea rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></Field>
                    <Field label="City"><Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></Field>
                    <Field label="Pincode"><Input inputMode="numeric" value={customer.pincode} onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })} /></Field>
                    <Button className="w-full" onClick={addNewCustomer} disabled={createCustomer.isPending}>
                      {createCustomer.isPending ? "Adding…" : "Add customer"}
                    </Button>
                  </>
                )}
                {customer.customerId && (
                  <p className="text-xs text-success">Customer #{customer.customerId} selected · address #{customer.addressId ?? "—"}</p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <Field label="Delivery date & time" required>
              <Input type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </Field>
            <div className="mt-4 flex items-baseline justify-between rounded-xl bg-primary-soft px-3 py-2.5 text-sm text-primary">
              <span className="font-semibold">Grand total</span>
              <span className="tabular text-lg font-semibold">{inr(grandTotal)}</span>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="ghost" onClick={cancel}>Cancel</Button>
              <Button onClick={finish} disabled={addManualCart.isPending || saveManualOrder.isPending}>
                {addManualCart.isPending || saveManualOrder.isPending ? "Saving…" : "Finish"}
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      <Dialog open={itemDialog !== null} onOpenChange={(v) => !v && setItemDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{itemDialog?.cake.name ?? "Configure cake item"}</DialogTitle></DialogHeader>
          {itemDialog && (
            <div className="space-y-4">
              <p className="text-2xl font-bold">{inr(price)}</p>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <Field label="Select variant" required>
                  <div className="flex flex-wrap gap-2">
                    {itemDialog.cake.price_list.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setVariant(row)}
                        className={variant?.id === row.id
                          ? "rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                          : "rounded-xl border border-border px-3 py-2 text-sm font-semibold"}
                      >
                        {row.kg} {itemDialog.cake.unit?.name}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Qty" required>
                  <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-1">
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
                    <span className="w-6 text-center tabular">{qty}</span>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setQty((q) => q + 1)}>+</Button>
                  </div>
                </Field>
              </div>
              <Field label="Type of occasion" required>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger><SelectValue placeholder="Select occasion" /></SelectTrigger>
                  <SelectContent>{occasions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Event date" required><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></Field>
              <Field label="Special person name" required><Input value={personName} onChange={(e) => setPersonName(e.target.value)} /></Field>
              <Field label="Greetings message" required><Input value={greeting} onChange={(e) => setGreeting(e.target.value)} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemDialog(null)}>Close</Button>
            <Button onClick={addToCart}><Plus className="size-4" /> Add to cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ManualOrderPage;
