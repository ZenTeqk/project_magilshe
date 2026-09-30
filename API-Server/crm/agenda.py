"""Day-wise CRM agenda: everything staff need to act on (or already actioned)
per calendar day, across orders, deliveries, payments, follow-ups and
customer events. Shared by the CRM Calendar page, the Customers dashboard and
the Customer 360 profile (scoped to one customer)."""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from .actionable import DELIVERY_ACTIONABLE_STATUSES, LEAD_ACTIONABLE_STATUSES, ORDER_ACTIONABLE_STATUSES
from .models import CRMDelivery, CRMOrder, CustomerRecurringEvent, Lead, LeadActivity, QuotationPayment
from .recurring_events import recurring_event_status

AGENDA_TYPES = ("order", "delivery", "payment", "follow_up", "event", "reminder", "completed")
MAX_RANGE_DAYS = 62
OVERDUE_LIMIT = 100
CLOSED_ORDER_STATUSES = ("Cancelled", "Completed", "Delivered", "Closed")


def _customer_name(customer):
    if customer is None:
        return None
    return " ".join(filter(None, [customer.first_name, customer.last_name])).strip() or customer.username


def _customer(customer, fallback_name=None, fallback_phone=None):
    return {
        "id": customer.id if customer else None,
        "name": _customer_name(customer) or fallback_name or "Walk-in customer",
        "phone": (customer.phone if customer else None) or fallback_phone or None,
    }


def _item(kind, record_id, on, *, title, customer, subtitle=None, time=None, status=None,
          amount=None, record_no=None, link_id=None, overdue=False, completed_kind=None):
    return {
        "key": f"{kind}-{completed_kind or ''}-{record_id}-{on.isoformat()}",
        "type": kind,
        "completed_kind": completed_kind,
        "date": on.isoformat(),
        "time": time.strftime("%H:%M") if time else None,
        "title": title,
        "subtitle": subtitle or None,
        "status": status,
        "amount": str(amount) if amount is not None else None,
        "overdue": overdue,
        "record_no": record_no,
        # Id of the record the frontend links to (order / delivery / lead / customer).
        "link_id": link_id if link_id is not None else record_id,
        "customer": customer,
    }


def _order_date(order):
    return order.delivery_date or order.event_date


def _order_balance(order):
    invoice = getattr(order, "invoice", None)
    if invoice is not None and invoice.status != "Cancelled":
        return Decimal(invoice.balance_amount or 0)
    return order.balance_amount


def _local_date(value):
    return timezone.localtime(value).date() if value else None


def _occurrence(event, year):
    try:
        return date(year, event.event_month, event.event_day)
    except ValueError:  # 29 Feb in a non-leap year
        return date(year, event.event_month, 28)


def _scope(queryset, customer_id, field):
    return queryset.filter(**{field: customer_id}) if customer_id else queryset


def _orders(start, end, today, customer_id, overdue_only=False):
    base = _scope(
        CRMOrder.objects.filter(is_archived=False, status__in=ORDER_ACTIONABLE_STATUSES)
        .select_related("customer"),
        customer_id, "customer_id",
    )
    date_q = Q(delivery_date__isnull=False) & (Q(delivery_date__lt=today) if overdue_only else Q(delivery_date__range=(start, end)))
    event_q = Q(delivery_date__isnull=True, event_date__isnull=False) & (
        Q(event_date__lt=today) if overdue_only else Q(event_date__range=(start, end))
    )
    for order in base.filter(date_q | event_q):
        on = _order_date(order)
        yield _item(
            "order", order.id, on,
            title=f"{order.order_no} · {order.cake_type or 'Order'}",
            subtitle=" · ".join(filter(None, [order.delivery_method, order.flavour])),
            time=order.delivery_time, status=order.status, amount=order.total_amount,
            record_no=order.order_no, overdue=on < today,
            customer=_customer(order.customer, order.customer_name, order.phone),
        )


def _deliveries(start, end, today, customer_id, overdue_only=False):
    queryset = _scope(
        CRMDelivery.objects.filter(is_archived=False, delivery_status__in=DELIVERY_ACTIONABLE_STATUSES)
        .select_related("order", "order__customer"),
        customer_id, "order__customer_id",
    )
    for delivery in queryset:
        scheduled = delivery.scheduled_at
        on = _local_date(scheduled) or delivery.order.delivery_date
        if on is None or (on >= today if overdue_only else not (start <= on <= end)):
            continue
        order = delivery.order
        yield _item(
            "delivery", delivery.id, on,
            title=f"{delivery.delivery_no} · {delivery.delivery_type}",
            subtitle=" · ".join(filter(None, [
                order.order_no, delivery.recipient_name or order.recipient_name,
                delivery.delivery_location or delivery.pickup_location or order.delivery_address,
            ])),
            time=timezone.localtime(scheduled).time() if scheduled else order.delivery_time,
            status=delivery.delivery_status, record_no=delivery.delivery_no, overdue=on < today,
            customer=_customer(order.customer, order.customer_name, order.phone),
        )


def _payments(start, end, today, customer_id, overdue_only=False):
    queryset = _scope(
        CRMOrder.objects.filter(is_archived=False).exclude(status="Cancelled")
        .select_related("customer", "invoice"),
        customer_id, "customer_id",
    )
    for order in queryset:
        on = _order_date(order) or _local_date(order.confirmed_on)
        if on is None or (on >= today if overdue_only else not (start <= on <= end)):
            continue
        balance = _order_balance(order)
        if balance <= 0:
            continue
        yield _item(
            "payment", order.id, on,
            title=f"{order.order_no} · balance due",
            subtitle=f"Total ₹{order.total_amount} · paid ₹{order.advance_paid}",
            status="Payment Pending", amount=balance, record_no=order.order_no, overdue=on < today,
            customer=_customer(order.customer, order.customer_name, order.phone),
        )


def _follow_ups(start, end, today, customer_id, overdue_only=False):
    queryset = _scope(
        Lead.objects.filter(
            is_archived=False, status__in=LEAD_ACTIONABLE_STATUSES, follow_up_date__isnull=False,
        ).select_related("customer"),
        customer_id, "customer_id",
    )
    queryset = queryset.filter(follow_up_date__lt=today) if overdue_only else queryset.filter(
        follow_up_date__range=(start, end)
    )
    for lead in queryset:
        yield _item(
            "follow_up", lead.id, lead.follow_up_date,
            title=f"{lead.lead_no} · {lead.occasion or 'Lead'} follow-up",
            subtitle=lead.follow_up_notes or lead.cake_type,
            time=lead.follow_up_time, status=lead.status, amount=lead.estimated_amount,
            record_no=lead.lead_no, overdue=lead.follow_up_date < today,
            customer=_customer(lead.customer, lead.customer_name, lead.phone),
        )


def _events_and_reminders(start, end, today, customer_id):
    events = _scope(CustomerRecurringEvent.objects.select_related("customer"), customer_id, "customer_id")
    for event in events:
        next_occurrence, _, _, current_status = recurring_event_status(event, today)
        customer = _customer(event.customer)
        # Reminders can fall up to reminder_days_before ahead of the occurrence,
        # so look one year past the range for occurrences whose reminder lands in it.
        sourced = bool(event.source_lead_id or event.source_quotation_id or event.source_order_id)
        for year in range(start.year, end.year + 2):
            occurrence = _occurrence(event, year)
            reminder_on = occurrence - timedelta(days=event.reminder_days_before)
            cycle_completed = bool(
                event.last_reminder_sent_on
                and event.next_occurrence(event.last_reminder_sent_on) == occurrence
            )
            # The occurrence a lead/quotation/order was captured for is already
            # booked, so it needs no reminder; later years do.
            booked = sourced and occurrence == event.original_date
            if start <= occurrence <= end and occurrence >= event.original_date:
                if booked:
                    status = "Booked"
                elif occurrence == next_occurrence:
                    status = current_status
                elif occurrence < today:
                    status = "Completed" if cycle_completed else "Passed"
                else:
                    status = "Upcoming"
                yield _item(
                    "event", event.id, occurrence, title=f"{event.event_type}",
                    subtitle=event.notes, status=status, link_id=event.customer_id, customer=customer,
                )
            if (start <= reminder_on <= end and occurrence >= today and not cycle_completed
                    and not booked and occurrence >= event.original_date):
                yield _item(
                    "reminder", event.id, reminder_on,
                    title=f"Remind · {event.event_type} on {occurrence.strftime('%d %b')}",
                    subtitle=event.notes, status="Reminder Due" if reminder_on <= today else "Upcoming",
                    link_id=event.customer_id, overdue=reminder_on < today, customer=customer,
                )


def _completed(start, end, customer_id):
    deliveries = _scope(
        CRMDelivery.objects.filter(
            delivery_status="Delivered Successfully", completed_at__date__range=(start, end),
        ).select_related("order", "order__customer"),
        customer_id, "order__customer_id",
    )
    for delivery in deliveries:
        order = delivery.order
        yield _item(
            "completed", delivery.id, _local_date(delivery.completed_at), completed_kind="delivery",
            title=f"Delivered · {delivery.delivery_no}", subtitle=order.order_no,
            time=timezone.localtime(delivery.completed_at).time(), status="Delivered",
            record_no=delivery.delivery_no,
            customer=_customer(order.customer, order.customer_name, order.phone),
        )
    payments = _scope(
        QuotationPayment.objects.filter(payment_date__range=(start, end))
        .select_related("quotation", "quotation__customer", "quotation__crm_order"),
        customer_id, "quotation__customer_id",
    )
    for payment in payments:
        quotation = payment.quotation
        order = getattr(quotation, "crm_order", None)
        yield _item(
            "completed", payment.id, payment.payment_date, completed_kind="payment",
            title=f"Payment received · {order.order_no if order else quotation.quotation_no}",
            subtitle=payment.payment_method, status="Paid", amount=payment.amount,
            record_no=order.order_no if order else quotation.quotation_no,
            link_id=order.id if order else None,
            customer=_customer(quotation.customer, quotation.customer_name, quotation.phone),
        )
    activities = _scope(
        LeadActivity.objects.filter(action="Follow-up Completed", created_on__date__range=(start, end))
        .select_related("lead", "lead__customer"),
        customer_id, "lead__customer_id",
    )
    for activity in activities:
        lead = activity.lead
        yield _item(
            "completed", activity.id, _local_date(activity.created_on), completed_kind="follow_up",
            title=f"Follow-up done · {lead.lead_no}", subtitle=activity.description,
            time=timezone.localtime(activity.created_on).time(), status="Completed",
            record_no=lead.lead_no, link_id=lead.id,
            customer=_customer(lead.customer, lead.customer_name, lead.phone),
        )
    reminders = _scope(
        CustomerRecurringEvent.objects.filter(last_reminder_sent_on__range=(start, end)).select_related("customer"),
        customer_id, "customer_id",
    )
    for event in reminders:
        yield _item(
            "completed", event.id, event.last_reminder_sent_on, completed_kind="reminder",
            title=f"Reminder sent · {event.event_type}", subtitle=event.notes, status="Completed",
            link_id=event.customer_id, customer=_customer(event.customer),
        )


def _sort_key(item):
    return (item["date"], item["time"] or "99:99", AGENDA_TYPES.index(item["type"]), item["title"])


def build_agenda(start, end, customer_id=None, today=None):
    today = today or timezone.localdate()
    items = [
        *_orders(start, end, today, customer_id),
        *_deliveries(start, end, today, customer_id),
        *_payments(start, end, today, customer_id),
        *_follow_ups(start, end, today, customer_id),
        *_events_and_reminders(start, end, today, customer_id),
        *_completed(start, end, customer_id),
    ]
    items.sort(key=_sort_key)
    overdue = [
        *_orders(start, end, today, customer_id, overdue_only=True),
        *_deliveries(start, end, today, customer_id, overdue_only=True),
        *_payments(start, end, today, customer_id, overdue_only=True),
        *_follow_ups(start, end, today, customer_id, overdue_only=True),
    ]
    overdue.sort(key=_sort_key)
    summary = {kind: 0 for kind in AGENDA_TYPES}
    pending_amount = Decimal("0")
    for item in items:
        summary[item["type"]] += 1
        if item["type"] == "payment":
            pending_amount += Decimal(item["amount"])
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "today": today.isoformat(),
        "summary": {**summary, "overdue": len(overdue), "payment_pending_amount": str(pending_amount)},
        "items": items,
        "overdue": overdue[:OVERDUE_LIMIT],
    }
