import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Cake,
  Check,
  FileText,
  Heart,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Repeat,
  ShoppingCart,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusChip } from "@/components/shared/status-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inr } from "@/lib/data";
import {
  useCompleteCustomerEvent,
  useCrmCustomer,
  useDeleteCustomerEvent,
  type CustomerRecurringEvent,
} from "@/features/customers/hooks";
import { EditCustomerDialog } from "@/features/customers/components/edit-customer-dialog";
import { CustomerEventDialog } from "@/features/customers/components/customer-event-dialog";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CustomerProfilePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, isError } = useCrmCustomer(customerId);
  const [editOpen, setEditOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState<{ open: boolean; event: CustomerRecurringEvent | null }>({
    open: false,
    event: null,
  });
  const [deleteEvent, setDeleteEvent] = useState<CustomerRecurringEvent | null>(null);
  const completeEvent = useCompleteCustomerEvent();
  const deleteEventMutation = useDeleteCustomerEvent();
  // Creating/editing/completing/deleting events has no backend support yet
  // (CustomerRecurringEvent has no notes/reminder_days_before fields, and no
  // CRUD endpoints exist) — auto-detected events still display read-only below.
  const eventsComingSoon = () => toast.info("Event reminders are read-only for now — editing is coming soon.");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !customer || !customerId) {
    return (
      <EmptyState
        title="Couldn't load this customer"
        description="They may have been removed, or the connection dropped."
      />
    );
  }

  const primaryAddress = customer.addresses.find((a) => a["is_primary"]) ?? customer.addresses[0];
  const summary = customer.purchase_summary;

  const createLeadFromEvent = (event: CustomerRecurringEvent) => {
    navigate("/crm/leads/new", {
      state: {
        leadDraft: {
          customer_name: customer.name,
          phone: customer.phone,
          email: customer.email,
          occasion: event.event_type,
          event_date: event.next_occurrence,
        },
      },
    });
  };

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="rounded-lg" asChild>
          <Link to="/crm/customers/manage">
            <ArrowLeft className="size-4" /> All customers
          </Link>
        </Button>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials(customer.name)}</AvatarFallback>
            </Avatar>
            {customer.name || customer.username}
            <StatusChip status={customer.is_active ? "Active" : "Inactive"} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5" /> {customer.phone || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" /> {customer.email || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Customer since {fmtDate(customer.date_joined)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit Customer
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate("/crm/leads/new", {
                  state: {
                    leadDraft: { customer_name: customer.name, phone: customer.phone, email: customer.email },
                  },
                })
              }
            >
              <UserRoundCheck className="size-4" /> Create Lead
            </Button>
            <Button onClick={() => navigate("/crm/orders/new")}>
              <ShoppingCart className="size-4" /> Create Order
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Leads" value={String(customer.counts.leads)} icon={<FileText className="size-4" />} />
        <StatCard label="Quotations" value={String(customer.counts.quotations)} icon={<FileText className="size-4" />} />
        <StatCard label="Orders" value={String(summary.total_orders)} icon={<ShoppingCart className="size-4" />} />
        <StatCard accent label="Revenue" value={inr(Number(summary.total_revenue))} icon={<Cake className="size-4" />} />
        <StatCard label="Last order" value={fmtDate(summary.last_order_date)} icon={<Calendar className="size-4" />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="payments">Payments ({customer.history.payments.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({customer.history.leads.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({customer.history.quotations.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({customer.history.orders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({customer.history.invoices.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries ({customer.history.deliveries.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({customer.recurring_events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Customer information" className="lg:col-span-1">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><dt className="text-muted-foreground">Customer ID</dt><dd className="font-medium tabular">{customer.id}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{customer.first_name} {customer.last_name}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusChip status={customer.is_active ? "Active" : "Inactive"} /></dd></div>
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-muted-foreground" /> {customer.phone || "—"}
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground" /> {customer.email || "—"}
                </div>
                {primaryAddress && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {[primaryAddress["title"], primaryAddress["address"], primaryAddress["city"], primaryAddress["pincode"]]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-muted-foreground" /> Last active {fmtDate(customer.last_login)}
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Saved addresses" className="lg:col-span-1">
              {customer.addresses.length === 0 ? <p className="text-sm text-muted-foreground">No saved addresses.</p> : <ul className="space-y-3">{customer.addresses.map((address) => <li key={address.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{address.title || "Address"}</span>{address.is_primary && <span className="text-xs font-medium text-primary">Primary</span>}</div><p className="mt-1 text-muted-foreground">{[address.address, address.city, address.pincode].filter(Boolean).join(", ")}</p></li>)}</ul>}
            </SectionCard>

            <SectionCard title="Purchase behaviour" className="lg:col-span-1">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Average order value</dt>
                  <dd className="font-medium tabular">{inr(Number(summary.average_order_value))}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    {summary.is_returning_customer ? (
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <Repeat className="size-3.5" /> Returning customer
                      </span>
                    ) : summary.total_orders === 1 ? (
                      "First-time customer"
                    ) : (
                      "No orders yet"
                    )}
                  </dd>
                </div>
                {summary.favourite_occasion && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Favourite occasion</dt>
                    <dd className="font-medium">{summary.favourite_occasion}</dd>
                  </div>
                )}
                {summary.favourite_flavour && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Favourite flavour</dt>
                    <dd className="font-medium">{summary.favourite_flavour}</dd>
                  </div>
                )}
              </dl>
            </SectionCard>

            <SectionCard
              title="Upcoming events"
              className="lg:col-span-1"
              actions={
                <Button size="sm" variant="ghost" onClick={eventsComingSoon}>
                  <Plus className="size-4" /> Add
                </Button>
              }
            >
              {customer.recurring_events.length === 0 ? (
                <EmptyState title="No events yet" icon={<Heart className="size-7" />} />
              ) : (
                <ul className="space-y-3">
                  {customer.recurring_events.slice(0, 4).map((event) => (
                    <li key={event.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{event.event_type}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(event.next_occurrence)}</p>
                        </div>
                        <StatusChip status={event.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <SectionCard title="Communication history" description="One-click reminder / outreach log" padded={false}>
            {customer.history.communications.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No activity logged yet" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {customer.history.communications.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-4 p-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium capitalize">
                        {c.channel} {c.subject ? `— ${c.subject}` : ""}
                      </p>
                      {c.message && <p className="mt-0.5 text-xs text-muted-foreground">{c.message}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">by {c.staff_name ?? "System"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">{fmtDate(c.created_on)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <SectionCard title="Payment history" padded={false}>
            {customer.history.payments.length === 0 ? (
              <div className="p-5"><EmptyState title="No payments yet" /></div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"><tr><th className="px-4 py-3">Quotation</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
                  <tbody>{customer.history.payments.map((payment) => <tr key={payment.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{payment.quotation__quotation_no}</td><td className="px-4 py-3 tabular">{fmtDate(payment.payment_date || payment.created_on)}</td><td className="px-4 py-3">{payment.payment_method}</td><td className="px-4 py-3 text-right font-medium tabular">{inr(Number(payment.amount))}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="leads" className="pt-4">
          <SectionCard padded={false}>
            {customer.history.leads.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No leads yet" />
              </div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Lead No.</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Occasion</th>
                      <th className="px-4 py-3">Event date</th>
                      <th className="px-4 py-3">Follow-up</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.history.leads.map((l) => (
                      <tr
                        key={l.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-muted/70"
                        onClick={() => navigate(`/crm/leads/${l.id}/edit`)}
                      >
                        <td className="px-4 py-3 font-medium">{l.lead_no}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(l.created_on)}</td>
                        <td className="px-4 py-3">{l.occasion || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(l.event_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(l.follow_up_date)}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={l.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="quotations" className="pt-4">
          <SectionCard padded={false}>
            {customer.history.quotations.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No quotations yet" />
              </div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Quotation No.</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.history.quotations.map((q) => (
                      <tr
                        key={q.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-muted/70"
                        onClick={() => navigate(`/crm/quotations/${q.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{q.quotation_no}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(q.created_on)}</td>
                        <td className="px-4 py-3 tabular">{inr(Number(q.total_amount))}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={q.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="orders" className="pt-4">
          <SectionCard padded={false}>
            {customer.history.orders.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No orders yet" />
              </div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Order No.</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Occasion</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.history.orders.map((o) => (
                      <tr
                        key={o.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-muted/70"
                        onClick={() => navigate(`/crm/orders/${o.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{o.order_no}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(o.confirmed_on)}</td>
                        <td className="px-4 py-3">{o.occasion || "—"}</td>
                        <td className="px-4 py-3 tabular">{inr(Number(o.total_amount))}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="invoices" className="pt-4">
          <SectionCard padded={false}>
            {customer.history.invoices.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No invoices yet" />
              </div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Invoice No.</th>
                      <th className="px-4 py-3">Generated</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.history.invoices.map((i) => (
                      <tr
                        key={i.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-muted/70"
                        onClick={() => navigate(`/crm/invoices/${i.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{i.invoice_no}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(i.generated_on)}</td>
                        <td className="px-4 py-3 tabular">{inr(Number(i.total_amount))}</td>
                        <td className="px-4 py-3 tabular">{inr(Number(i.amount_paid))}</td>
                        <td className="px-4 py-3 tabular">{inr(Number(i.balance_amount))}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={i.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="deliveries" className="pt-4">
          <SectionCard padded={false}>
            {customer.history.deliveries.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No deliveries yet" />
              </div>
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/70 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Delivery No.</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Scheduled</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.history.deliveries.map((d) => (
                      <tr
                        key={d.id}
                        className="cursor-pointer border-t border-border hover:bg-surface-muted/70"
                        onClick={() => navigate(`/crm/delivery/${d.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{d.delivery_no}</td>
                        <td className="px-4 py-3">{d.delivery_type}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular">{fmtDate(d.pickup_time || d.delivery_time || d.porter_time || d.created_on)}</td>
                        <td className="px-4 py-3">
                          <StatusChip status={d.delivery_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          <SectionCard
            title="Customer events & reminders"
            description="Recurring occasions (birthday, anniversary, …) with an internal staff reminder"
            actions={
              <Button size="sm" onClick={eventsComingSoon}>
                <Plus className="size-4" /> Add event
              </Button>
            }
            padded={false}
          >
            {customer.recurring_events.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No events yet" description="Add a birthday, anniversary or other occasion to get reminded." icon={<Heart className="size-7" />} />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {customer.recurring_events.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.event_type}</p>
                        <StatusChip status={event.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(event.next_occurrence)} · Reminder {fmtDate(event.reminder_date)}
                        {event.notes ? ` · ${event.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!event.is_completed && (
                        <Button size="sm" variant="outline" onClick={eventsComingSoon}>
                          <Check className="size-4" /> Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => createLeadFromEvent(event)}>
                        <UserRoundCheck className="size-4" /> Create Lead
                      </Button>
                      <Button size="sm" variant="ghost" onClick={eventsComingSoon}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={eventsComingSoon}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <EditCustomerDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />

      <CustomerEventDialog
        open={eventDialog.open}
        onOpenChange={(v) => setEventDialog((s) => ({ ...s, open: v }))}
        customerId={customer.id}
        event={eventDialog.event}
      />

      <AlertDialog open={deleteEvent !== null} onOpenChange={(v) => !v && setDeleteEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deleteEvent?.event_type} reminder for {customer.name}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteEvent) return;
                deleteEventMutation.mutate(
                  { id: deleteEvent.id, customer: customer.id },
                  { onSuccess: () => toast.success("Event deleted") },
                );
                setDeleteEvent(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CustomerProfilePage;
