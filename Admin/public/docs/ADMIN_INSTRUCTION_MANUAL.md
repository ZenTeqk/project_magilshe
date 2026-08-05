# MagilShe Admin Staff Guide

## Getting Started

Use the sidebar to choose a business workspace. Breadcrumbs show your current location, Search finds modules, and Create opens common entry points. The theme switch changes between Light and Dark mode without leaving the current page.

Use the prominent business action on each workspace. Workflow stages are indicators; staff should not attempt to type or manually imitate a status.

## CRM Workflow

Lead → Quotation → Order → Invoice → Delivery → Completed

Each stage has one responsibility:

- Leads manage enquiries and follow-ups.
- Quotations manage the commercial proposal and advance.
- Orders manage bakery preparation.
- Invoices manage final payment and billing.
- Delivery manages pickup or bakery delivery and closes the order.

## Leads

1. Open CRM → Leads and select New Lead.
2. Enter the customer phone number and use the existing-customer match where available.
3. Record the enquiry, occasion, cake requirements and follow-up.
4. Use the Follow-ups view for scheduled calls.
5. Mark the Lead Won or Lost using the approved workflow.
6. Open a Won Lead and generate its Quotation.

## Quotations

1. Generate from a Won Lead or select Create → New Quotation.
2. Confirm customer, billing address and shipping address.
3. Add cake or product items with quantity, rate and GST.
4. Review subtotal, discount, GST, grand total, advance and balance.
5. Preview or download the customer PDF.
6. Send, record acceptance and collect the required advance.
7. Select Confirm Order. The created Order opens automatically.

## Orders

1. Review the customer, cake, event, delivery and payment summary.
2. Use Start Processing when bakery preparation starts.
3. Add internal preparation notes where the existing workspace allows it.
4. Select Mark Ready when preparation is complete.
5. Select Move to Invoice. The connected Invoice opens automatically.

## Invoices

1. Review the customer, billing, shipping, commercial and payment summaries.
2. Preview, print or download the Invoice.
3. Record the remaining payment with the current payment controls.
4. Confirm payment completion.
5. Select Move to Delivery. The connected Delivery opens automatically.

## Delivery

### Store Pickup

Confirm recipient name, phone, pickup date and pickup time. Select Mark Picked Up, then Complete Order after collection is confirmed.

### Bakery Delivery

Confirm recipient, contact, address, date, time and notes. Use the Google Maps link when available. Select Start Delivery, then Complete Order after fulfilment is confirmed.

Third-party courier-specific fields are not currently stored by the approved Delivery API. Do not record temporary courier information outside the supported fields.

## Customers

Customers is a standalone workspace and the single connected customer record. Search by name, phone or email, then open a row to review:

- Contact and verification information
- Saved addresses
- Lead, Won and Lost statistics
- Quotations and Orders
- Revenue and average order value
- Invoices, Payments and Deliveries
- Chronological activity

Related records can be opened directly from their history row.

## Reports & Analytics

Use the main Reports & Analytics workspace. Choose a date preset or custom range, select an analytics tab, and use KPI cards or funnel stages for drill-down navigation. Available exports include Excel, CSV, PDF and Print.

## Website Management

Website Management contains Products, catalogue masters, Gallery, Offers, Banner, Events, Event Orders and Feedback. Existing create, edit and delete behavior is unchanged.

## Operations

The visible Operations module contains Delivery Persons. Maintain the available bakery delivery staff here. Existing Online Orders, Manual Orders and Purchases routes remain available internally but are hidden from the simplified release-candidate navigation.

## Safeguards

- Search for a customer before creating duplicate information.
- CRM Orders must originate from confirmed Quotations.
- Verify customer, address, delivery time and balance before progressing.
- Use workflow actions instead of manually changing stages.
- Confirm fulfilment before completing an order.

## Troubleshooting

- If a workflow action is unavailable, complete the required preceding stage.
- If a Home Delivery cannot proceed, verify its address and required fields.
- If Move to Delivery is unavailable, verify payment completion.
- After deployment, refresh the browser once if an older cached bundle is displayed.
