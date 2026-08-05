import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import {ListPageTemplate} from "../../../admin/templates";
import {DataTable,SectionCard,SecondaryButton,StatisticsBanner,StatusBadge,UniversalFilterBar,formatDate,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";

const statuses=["Generated","Issued","Paid","Closed"];

export default function InvoiceList(){
 const navigate=useNavigate(),[rows,setRows]=useState([]),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Api.get("crm/invoices/").then(({data})=>active&&setRows(data.results||data)).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[]);
 const visible=useMemo(()=>rows.filter(row=>(!status||row.status===status)&&(!search||[row.invoice_no,row.order_no,row.customer_name,row.phone].some(value=>String(value||"").toLowerCase().includes(search.toLowerCase())))),[rows,search,status]);
 const columns=[
  {key:"invoice",header:"Invoice",render:row=><div><strong>{row.invoice_no}</strong><br/><small>Order {row.order_no}</small></div>},
  {key:"customer",header:"Customer",render:row=><div>{row.customer_name}<br/><small>{row.phone||"No phone"}</small></div>},
  {key:"payment",header:"Financial summary",render:row=><div><strong>{formatMoney(row.total_amount)}</strong><br/><small>Paid {formatMoney(row.amount_paid)} · Balance {formatMoney(row.balance_amount)}</small></div>},
  {key:"status",header:"Financial stage",render:row=><StatusBadge tone={crmStatusTone(row.status)}>{row.status}</StatusBadge>},
  {key:"generated",header:"Generated",render:row=>formatDate(row.generated_on)},
  {key:"action",header:"Next step",align:"right",render:row=><SecondaryButton onClick={event=>{event.stopPropagation();navigate(`/crm/invoices/${row.id}`);}}>Open workspace</SecondaryButton>},
 ];
 const banner=<StatisticsBanner ariaLabel="Invoice stages" items={[{key:"",label:"All invoices",value:rows.length},{key:"Generated",label:"Payment pending",value:rows.filter(row=>["Generated","Issued"].includes(row.status)&&Number(row.balance_amount)>0).length,tone:"warning"},{key:"Paid",label:"Paid",value:rows.filter(row=>row.status==="Paid").length,tone:"success"},{key:"Closed",label:"Moved forward",value:rows.filter(row=>row.status==="Closed").length,tone:"info"}]} activeKey={status} onSelect={setStatus}/>;
 return <ListPageTemplate title="Invoices" subtitle="Financial settlement workspace for final payment, customer documents and Delivery handoff." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Invoices"}]} banner={banner} table={<SectionCard title="Invoice queue" description="Prioritize invoices with an outstanding balance, then move paid records to Delivery."><UniversalFilterBar searchValue={search} onSearchChange={setSearch} statusValue={status} statusOptions={statuses} onStatusChange={setStatus} activeCount={(search?1:0)+(status?1:0)} onClear={()=>{setSearch("");setStatus("");}}/>{failed?<div role="alert">Invoices could not be loaded. Refresh the page to try again.</div>:<DataTable ariaLabel="CRM invoices" columns={columns} rows={visible} loading={loading} onRowClick={row=>navigate(`/crm/invoices/${row.id}`)} emptyTitle="No invoices match this view" emptyDescription="Invoices appear automatically after a Ready Order is moved to Invoice."/>}</SectionCard>}/>;
}
