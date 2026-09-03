"""Single source of truth for CRM records that still require staff action."""

LEAD_ACTIONABLE_STATUSES = ("Open", "Follow-up")
QUOTATION_ACTIONABLE_STATUSES = ("Draft", "Sent", "Accepted", "Advance Received")
ORDER_ACTIONABLE_STATUSES = (
    "Confirmed", "Production", "Processing", "Ready",
    "Invoice Generated", "Invoice Pending",
)
INVOICE_ACTIONABLE_STATUSES = ("Generated", "Issued")
DELIVERY_ACTIONABLE_STATUSES = ("Pending", "Out for Delivery")


def status_payload():
    return {
        "leads": list(LEAD_ACTIONABLE_STATUSES),
        "follow_ups": ["Follow-up"],
        "quotations": list(QUOTATION_ACTIONABLE_STATUSES),
        "orders": list(ORDER_ACTIONABLE_STATUSES),
        "invoices": list(INVOICE_ACTIONABLE_STATUSES),
        "deliveries": list(DELIVERY_ACTIONABLE_STATUSES),
    }
