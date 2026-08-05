import React from "react";
import {PageHeader} from "./shared";
import "./crm.scss";
export default function Placeholder({title}){return <div className="crm-page"><PageHeader title={title} subtitle="This module is prepared for a future CRM phase."/><div className="crm-panel crm-empty"><strong>{title} module coming soon</strong><br/>The sequential Lead → Quotation → Order → Invoice architecture is ready to expand.</div></div>;}
export const CRMOrders=()=> <Placeholder title="CRM Orders"/>;
export const CRMInvoices=()=> <Placeholder title="CRM Invoices"/>;
