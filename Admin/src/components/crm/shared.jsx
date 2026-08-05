import React from "react";
import {PageHeader as DesignSystemPageHeader,StatCard as DesignSystemStatCard,StatusBadge as DesignSystemStatusBadge} from "../../admin/design-system";
import {crmStatusTone} from "./crmPresentation";

export const StatusBadge = ({ status = "Draft" }) => (
  <DesignSystemStatusBadge tone={crmStatusTone(status)}>{status}</DesignSystemStatusBadge>
);

export const StatCard = ({ label, value, hint }) => (
  <DesignSystemStatCard label={label} value={value} hint={hint}/>
);

export const PageHeader = ({ title, subtitle, breadcrumbs, status, primaryAction, children }) => (
  <DesignSystemPageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} status={status} primaryAction={primaryAction} secondaryActions={children}/>
);

export const Info = ({ label, value }) => (
  <div className="crm-info">
    <span className="crm-info__label">{label}</span>
    <div className="crm-info__value">{value ?? "—"}</div>
  </div>
);

export const displayDate = value => value ? new Date(value).toLocaleDateString("en-IN") : "—";
export const money = value => value !== null && value !== undefined && value !== "" ?
  new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(value) : "—";
