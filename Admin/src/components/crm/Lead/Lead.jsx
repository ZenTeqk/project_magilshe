import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faCopy,
  faFileExport,
  faFileImport,
  faTableCellsLarge,
  faSitemap,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

import { Api } from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import { ListPageTemplate } from "../../../admin/templates";
import {
  DataTable,
  IconButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatisticsBanner,
  StatusBadge,
  UniversalFilterBar,
  formatDate,
} from "../../../admin/design-system";

import { crmStatusTone } from "../crmPresentation";
import QuickEntry from "./QuickEntry";
import LeadImport from "./LeadImport";
import LeadStatusDialog, { WonQuotationDialog } from "./LeadStatusDialog";
import LeadKanban from "./LeadKanban";
import "./leadUx.scss";

const PAGE_SIZE = 10;

const emptyFilters = { search: "", status: "", occasion: "", cake_type: "", event_date: "", created_date: "" };

const statisticsItems = [
  { key: "", label: "All leads", tone: "neutral" },
  { key: "Open", label: "Open", tone: "info" },
  { key: "Follow-up", label: "Follow-up", tone: "warning" },
  { key: "Won", label: "Won", tone: "success" },
  { key: "Lost", label: "Lost", tone: "danger" },
];

export const statusOptions = (lead) =>
  lead.status === "Open" ? ["Follow-up", "Won", "Lost"] : lead.status === "Follow-up" ? ["Won", "Lost"] : [];

const statusActionLabel = { "Follow-up": "Schedule follow-up", Won: "Mark as Won", Lost: "Mark as Lost" };

const excludedDuplicateFields = [
  "id", "lead_no", "created_on", "updated_on", "created_by", "updated_by",
  "activities", "reference_images", "quotation_id", "assigned_to_name", "cake_name",
];

const downloadCsv = (rows) => {
  const header = ["Lead No", "Customer", "Phone", "Occasion", "Cake Type", "Event Date", "Status"];
  const body = rows.map((lead) => [
    lead.lead_no, lead.customer_name, lead.phone, lead.occasion, lead.cake_type, lead.event_date, lead.status,
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "leads.csv";
  link.click();
  URL.revokeObjectURL(url);
};

export default function Lead() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ShowNotification } = useContext(MainContext) || {};
  const notifyError = (message) => ShowNotification?.("error", message);
  const notifySuccess = (message) => ShowNotification?.("success", message);

  const [filters, setFilters] = useState({ ...emptyFilters, status: searchParams.get("status") || "" });
  const [leads, setLeads] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "created_on", direction: "desc" });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [modal, setModal] = useState(null);
  const [menu, setMenu] = useState(null);
  const [statusChange, setStatusChange] = useState(null);
  const [wonLead, setWonLead] = useState(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)));
      const response = await Api.get("crm/leads/", { params });
      const data = response?.data;
      setLeads(Array.isArray(data) ? data : data?.results || data?.data || []);
    } catch (error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const { data } = await Api.get("crm/leads/crm-dashboard/");
      setStatusCounts(data?.leads || {});
    } catch (error) {
      setStatusCounts({});
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => setPage(1), [filters, sort]);

  const sortedLeads = useMemo(() => {
    const list = [...leads];
    list.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return list;
  }, [leads, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  const pageRows = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSort = (key) =>
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  const duplicate = (lead) => {
    const draft = Object.fromEntries(Object.entries(lead).filter(([key]) => !excludedDuplicateFields.includes(key)));
    navigate("/crm/leads/new", { state: { leadDraft: draft } });
  };

  const remove = async (lead) => {
    if (!window.confirm(`Delete lead for ${lead.customer_name}? This cannot be undone.`)) return;
    try {
      await Api.delete(`crm/leads/${lead.id}/`);
      notifySuccess("Lead deleted.");
      load();
      loadCounts();
    } catch (error) {
      notifyError("Unable to delete lead.");
    }
  };

  const openStatusChange = (lead, target) => {
    setMenu(null);
    setStatusChange({ lead, target });
  };

  const onStatusUpdated = (data, isWon) => {
    setStatusChange(null);
    load();
    loadCounts();
    const updatedLead = data?.data || data;
    if (isWon) setWonLead(updatedLead);
  };

  const generateQuotation = async () => {
    try {
      const { data } = await Api.post(`crm/leads/${wonLead.id}/convert/`);
      setWonLead(null);
      navigate(data?.data?.id ? `/crm/quotations/${data.data.id}` : "/crm/quotations");
    } catch (error) {
      notifyError("Unable to generate quotation.");
    }
  };

  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "status" && value).length +
    (filters.status ? 1 : 0);

  const columns = [
    { key: "customer_name", header: "Customer", sortable: true, render: (row) => <strong>{row.customer_name}</strong> },
    { key: "phone", header: "Phone", render: (row) => row.phone || "—" },
    { key: "occasion", header: "Occasion", render: (row) => row.occasion || "—" },
    { key: "cake_type", header: "Cake type", render: (row) => row.cake_type || "—" },
    { key: "event_date", header: "Event date", sortable: true, render: (row) => formatDate(row.event_date) },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="crm-lead-status-cell" onClick={(event) => event.stopPropagation()}>
          <StatusBadge tone={crmStatusTone(row.status)}>{row.status || "Open"}</StatusBadge>
          {statusOptions(row).length > 0 && (
            <IconButton
              label={`Lead status ${row.status}, change status`}
              onClick={(event) => setMenu({ anchorEl: event.currentTarget, lead: row })}
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </IconButton>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="crm-row-actions" onClick={(event) => event.stopPropagation()}>
          <SecondaryButton onClick={() => navigate(`/crm/leads/${row.id}/edit`)}>Open lead</SecondaryButton>
          <IconButton label="Duplicate lead" onClick={() => duplicate(row)}>
            <FontAwesomeIcon icon={faCopy} />
          </IconButton>
          <IconButton label="Delete lead" onClick={() => remove(row)}>
            <FontAwesomeIcon icon={faTrashCan} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="crm-leads-console">
      <ListPageTemplate
        title="Leads"
        subtitle="Every customer enquiry captured by the sales team, from first contact to conversion."
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "CRM", href: "/crm" }, { label: "Leads" }]}
        primaryAction={<PrimaryButton onClick={() => setModal("quick-entry")}>New lead</PrimaryButton>}
        secondaryActions={
          <>
            <div className="crm-view-toggle" role="group" aria-label="Lead view">
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
                <FontAwesomeIcon icon={faTableCellsLarge} /> List
              </button>
              <button type="button" aria-pressed={view === "kanban"} className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
                <FontAwesomeIcon icon={faSitemap} /> Kanban
              </button>
            </div>
            <SecondaryButton onClick={() => setModal("import")}>
              <FontAwesomeIcon icon={faFileImport} /> Import
            </SecondaryButton>
            <SecondaryButton onClick={() => downloadCsv(sortedLeads)}>
              <FontAwesomeIcon icon={faFileExport} /> Export
            </SecondaryButton>
          </>
        }
        banner={
          <StatisticsBanner
            ariaLabel="Lead status filters"
            activeKey={filters.status}
            onSelect={(key) => setFilters((current) => ({ ...current, status: key }))}
            items={statisticsItems.map((item) => ({
              ...item,
              value: item.key ? statusCounts[item.key] ?? 0 : statusCounts.total ?? 0,
            }))}
          />
        }
        table={
          <>
            {failed && (
              <SectionCard title="Leads could not be loaded" description="Check your connection and try again.">
                <SecondaryButton onClick={load}>Retry</SecondaryButton>
              </SectionCard>
            )}
            {!failed && view === "list" && (
              <SectionCard title="All leads" description="Search, filter and act on every enquiry in one place.">
                <UniversalFilterBar
                  searchValue={filters.search}
                  onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
                  onClear={() => setFilters({ ...emptyFilters })}
                  statusValue={filters.status}
                  statusOptions={["Open", "Follow-up", "Won", "Lost"]}
                  onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                  activeCount={activeCount}
                  extraFilters={
                    <>
                      <SecondaryButton onClick={() => setAdvancedOpen((open) => !open)}>
                        {advancedOpen ? "Fewer filters" : "More filters"}
                      </SecondaryButton>
                      {advancedOpen && (
                        <div className="crm-advanced-filters">
                          <label className="mads-filter-control">
                            <span>Occasion</span>
                            <input
                              value={filters.occasion}
                              onChange={(event) => setFilters((current) => ({ ...current, occasion: event.target.value }))}
                              placeholder="Any occasion"
                            />
                          </label>
                          <label className="mads-filter-control">
                            <span>Cake type</span>
                            <input
                              value={filters.cake_type}
                              onChange={(event) => setFilters((current) => ({ ...current, cake_type: event.target.value }))}
                              placeholder="Any cake type"
                            />
                          </label>
                          <label className="mads-filter-control">
                            <span>Event date</span>
                            <input
                              type="date"
                              value={filters.event_date}
                              onChange={(event) => setFilters((current) => ({ ...current, event_date: event.target.value }))}
                            />
                          </label>
                          <label className="mads-filter-control">
                            <span>Created date</span>
                            <input
                              type="date"
                              value={filters.created_date}
                              onChange={(event) => setFilters((current) => ({ ...current, created_date: event.target.value }))}
                            />
                          </label>
                        </div>
                      )}
                    </>
                  }
                />
                <DataTable
                  columns={columns}
                  rows={pageRows}
                  loading={loading}
                  sort={sort}
                  onSort={onSort}
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  onRowClick={(row) => navigate(`/crm/leads/${row.id}/edit`)}
                  emptyTitle="No leads found"
                  emptyDescription="Try adjusting your filters, or capture a new enquiry."
                  emptyAction={<PrimaryButton onClick={() => setModal("quick-entry")}>New lead</PrimaryButton>}
                  ariaLabel="Leads"
                />
              </SectionCard>
            )}
            {!failed && view === "kanban" && (
              <LeadKanban leads={sortedLeads} loading={loading} onOpenStatusChange={openStatusChange} statusOptionsFor={statusOptions} />
            )}
          </>
        }
      />

      {modal === "quick-entry" && (
        <Modal open onClose={() => setModal(null)} title="Quick lead entry">
          <QuickEntry
            onCancel={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              load();
              loadCounts();
            }}
            onFullForm={(draft) => {
              setModal(null);
              navigate("/crm/leads/new", { state: { leadDraft: draft } });
            }}
          />
        </Modal>
      )}

      <LeadImport
        open={modal === "import"}
        onClose={() => setModal(null)}
        onImported={() => {
          setModal(null);
          load();
          loadCounts();
        }}
      />

      <Menu anchorEl={menu?.anchorEl} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu &&
          statusOptions(menu.lead).map((target) => (
            <MenuItem key={target} onClick={() => openStatusChange(menu.lead, target)}>
              {statusActionLabel[target]}
            </MenuItem>
          ))}
      </Menu>

      {statusChange && (
        <LeadStatusDialog
          lead={statusChange.lead}
          target={statusChange.target}
          onClose={() => setStatusChange(null)}
          onUpdated={onStatusUpdated}
        />
      )}

      {wonLead && (
        <WonQuotationDialog lead={wonLead} onLater={() => setWonLead(null)} onGenerate={generateQuotation} />
      )}
    </div>
  );
}
