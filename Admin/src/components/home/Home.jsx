import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalendarDay,
  faChartLine,
  faClock,
  faFileLines,
  faTruck,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { Api } from "../../Api/Api";
import { GetDashboardDataUrl } from "../../Constant/urls/urls";
import { DashboardPageTemplate } from "../../admin/templates";
import {
  DataTable,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SkeletonDashboard,
  StatusBadge,
  formatDate,
  useToast,
} from "../../admin/design-system";
import "./Home.scss";

const workflowRoute = row => row.stage === "Delivery"
  ? `/crm/delivery/${row.target_id}`
  : row.stage === "Invoice"
    ? `/crm/invoices/${row.target_id}`
    : row.stage === "Order"
      ? `/crm/orders/${row.target_id}`
      : `/crm/quotations/${row.target_id}`;

const statusTone = status => {
  const value = String(status || "").toLowerCase();
  if (["completed", "delivered", "paid", "ready", "won"].some(item => value.includes(item))) return "success";
  if (["overdue", "lost", "cancel"].some(item => value.includes(item))) return "danger";
  if (["pending", "follow-up", "advance"].some(item => value.includes(item))) return "warning";
  return "info";
};

const customerName = row => row?.customer?.name || row?.customer_name || row?.customer?.first_name || "Customer";
const orderReference = row => row?.order_no || row?.order_number || row?.id || "—";
const onlineStatus = value => ({ 1: "Pending", 2: "Confirmed", 3: "In progress", 4: "Preparing", 5: "Out for delivery", 6: "Delivered" })[value] || value || "Pending";
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};
const nextAction = row => row.stage === "Delivery"
  ? (String(row.status).toLowerCase().includes("delivered") ? "Review completed delivery" : "Continue delivery")
  : row.stage === "Invoice"
    ? (String(row.status).toLowerCase().includes("paid") ? "Move to delivery" : "Review payment")
    : row.stage === "Order"
      ? (String(row.status).toLowerCase().includes("ready") ? "Move to invoice" : "Continue order")
      : row.status === "Draft" ? "Send quotation" : row.status === "Sent" ? "Record acceptance" : row.status === "Accepted" ? "Record advance" : "Open quotation";

const MetricCard = ({ label, value, note, tone, icon, onClick }) => (
  <button type="button" className={`executive-metric executive-metric--${tone}`} onClick={onClick}>
    <span className="executive-metric__top"><span>{label}</span><FontAwesomeIcon icon={icon} /></span>
    <strong>{value}</strong>
    <small>{note}</small>
  </button>
);

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [online, setOnline] = useState(null);
  const [crm, setCrm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [onlineResult, crmResult] = await Promise.allSettled([
      Api.get(GetDashboardDataUrl),
      Api.get("crm/leads/crm-dashboard/"),
    ]);
    if (onlineResult.status === "fulfilled") setOnline(onlineResult.value.data);
    if (crmResult.status === "fulfilled") setCrm(crmResult.value.data);
    if (onlineResult.status === "rejected" || crmResult.status === "rejected") {
      setFailed(true);
      toast.warning("Some dashboard information could not be loaded. Available sections are still shown.");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const counts = online?.count || {};
  const data = online?.data || {};
  const leads = crm?.leads || {};
  const documents = crm?.documents || {};
  const conversion = leads.total ? Math.round(((leads.Won || 0) / leads.total) * 100) : 0;
  const workflowRows = crm?.workflows || [];
  const recentOrders = data.recent_10_orders || [];
  const occasions = data.upcoming_occasions || [];

  const workflowColumns = useMemo(() => [
    { key: "customer", header: "Customer & order", render: row => <div className="dashboard-customer"><strong>{row.customer_name}</strong><small>{row.occasion || row.cake_type || row.lead_no || "Customer order"}</small></div> },
    { key: "context", header: "Stage", render: row => <div className="dashboard-customer"><strong>{row.stage}</strong><small>{row.quotation_no}{row.delivery_date ? ` · ${formatDate(row.delivery_date)}` : ""}</small></div> },
    { key: "status", header: "Status", render: row => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge> },
    { key: "next", header: "Next step", render: row => <div className="dashboard-next-action"><strong>{nextAction(row)}</strong><small>Updated {formatDate(row.updated_on)}</small></div> },
    { key: "action", header: "", align: "right", render: row => <SecondaryButton aria-label="Open" onClick={() => navigate(workflowRoute(row))}>Open <span aria-hidden="true">→</span></SecondaryButton> },
  ], [navigate]);

  const orderColumns = useMemo(() => [
    { key: "reference", header: "Order ref", render: row => <strong>#{orderReference(row)}</strong> },
    { key: "customer", header: "Customer", render: customerName },
    { key: "status", header: "Delivery", render: row => { const status = onlineStatus(row.delivery_status_name || row.delivery_status || row.status); return <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>; } },
    { key: "ordered", header: "Ordered", align: "right", render: row => formatDate(row.order_time || row.created_on) },
  ], []);

  if (loading && !online && !crm) return <DashboardPageTemplate title="Executive overview" subtitle="Loading bakery health and active workflows."><SkeletonDashboard /></DashboardPageTemplate>;

  const attentionTotal = (leads["Follow-up"] || 0) + (counts.total_pending || 0);

  return <DashboardPageTemplate
    title={`${greeting()}, Team`}
    subtitle={`Bakery health at a glance${attentionTotal ? `: ${attentionTotal} active items require review.` : "."}`}
    primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faUserPlus} />} onClick={() => navigate("/crm/leads/new")}>New customer lead</PrimaryButton>}
    secondaryActions={<SecondaryButton onClick={() => navigate("/products")}>Manage catalog</SecondaryButton>}
  >
    {failed && <div className="executive-error" role="status"><span>Some information is temporarily unavailable. Available sections remain usable.</span><SecondaryButton onClick={loadDashboard}>Try again</SecondaryButton></div>}

    <section className="executive-metrics" aria-label="Bakery health summary">
      <MetricCard label="New leads" value={leads.Open || 0} note="Open customer opportunities" tone="info" icon={faUserPlus} onClick={() => navigate("/crm/leads?status=Open")} />
      <MetricCard label="Open orders" value={documents.orders || 0} note={`${counts.total_pending || 0} online orders await review`} tone="warning" icon={faClock} onClick={() => navigate("/orders")} />
      <MetricCard label="Deliveries" value={documents.deliveries || 0} note="Active delivery workflows" tone="success" icon={faTruck} onClick={() => navigate("/crm/delivery")} />
      <MetricCard label="Conversion" value={`${conversion}%`} note="Won leads across the current pipeline" tone="accent" icon={faChartLine} onClick={() => navigate("/crm/leads")} />
    </section>

    <div className="executive-layout">
      <div className="executive-main">
        <section className="executive-focus" aria-label="Operational focus">
          <div><span className="executive-focus__pulse" aria-hidden="true" /><strong>{leads["Follow-up"] || 0} follow-ups need attention</strong></div>
          <div><FontAwesomeIcon icon={faClock} /><span>{counts.total_pending || 0} online orders awaiting validation</span></div>
          <button type="button" onClick={() => navigate("/crm/leads/follow-ups")}>Open action queue <span aria-hidden="true">→</span></button>
        </section>

        <SectionCard className="executive-workflow" title="Customer workflow queue" description="Current active leads and their order lifecycle status." actions={<SecondaryButton onClick={() => navigate("/crm")}>Full CRM directory <FontAwesomeIcon icon={faArrowRight} /></SecondaryButton>}>
          <DataTable ariaLabel="Customer workflow queue" columns={workflowColumns} rows={workflowRows} rowKey="quotation_no" emptyTitle="No active customer workflows" emptyDescription="New quotations and confirmed orders will appear here." />
        </SectionCard>

        <SectionCard className="executive-orders" title="Recent online orders" description="Latest activity received through the existing online-order workflow." actions={<SecondaryButton onClick={() => navigate("/orders")}>View all activity</SecondaryButton>}>
          <DataTable ariaLabel="Recent online orders" columns={orderColumns} rows={recentOrders} emptyTitle="No online orders yet" emptyDescription="Orders placed through the website will appear here." />
        </SectionCard>
      </div>

      <aside className="executive-rail" aria-label="Dashboard shortcuts and occasions">
        <SectionCard title="Quick actions" description="Start frequent bakery tasks.">
          <div className="dashboard-quick-actions">
            <PrimaryButton icon={<FontAwesomeIcon icon={faUserPlus} />} onClick={() => navigate("/crm/leads/new")}>New lead</PrimaryButton>
            <SecondaryButton icon={<FontAwesomeIcon icon={faFileLines} />} onClick={() => navigate("/crm/quotations/new")}>New quotation</SecondaryButton>
            <SecondaryButton icon={<FontAwesomeIcon icon={faTruck} />} onClick={() => navigate("/crm/delivery")}>Open deliveries</SecondaryButton>
            <SecondaryButton icon={<FontAwesomeIcon icon={faChartLine} />} onClick={() => navigate("/reports/analytics")}>Reports & analytics</SecondaryButton>
          </div>
        </SectionCard>

        <SectionCard title="Upcoming occasions" description="Scheduled in the next ten days.">
          {occasions.length ? <div className="executive-occasions">{occasions.slice(0, 6).map((occasion, index) => <article key={occasion.id || index}><span className="executive-occasion-icon"><FontAwesomeIcon icon={faCalendarDay} /></span><div><strong>{occasion.name || occasion.title || occasion.occasion || "Customer occasion"}</strong><small>{formatDate(occasion.date)}</small></div></article>)}</div> : <EmptyState icon={<FontAwesomeIcon icon={faCalendarDay} />} title="No upcoming occasions" description="There are no recorded occasions in the next ten days." />}
        </SectionCard>
      </aside>
    </div>
  </DashboardPageTemplate>;
}
