import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import {ListPageTemplate} from "../../../admin/templates";
import {DataTable,PrimaryButton,SectionCard,SecondaryButton,StatisticsBanner,StatusBadge,UniversalFilterBar,formatDate,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";

const displayStatus=status=>status==="Production"?"Processing":status==="Invoice Generated"?"Invoice Pending":status;
const statuses=["Confirmed","Processing","Ready","Invoice Pending","Delivery","Closed","Cancelled"];

export default function OrderList(){
 const navigate=useNavigate(),[rows,setRows]=useState([]),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Api.get("crm/orders/").then(({data})=>active&&setRows(data.results||data)).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[]);
 const visible=useMemo(()=>rows.filter(row=>(!status||displayStatus(row.status)===status)&&(!search||[row.order_no,row.quotation_no,row.customer_name,row.phone,row.cake_type].some(value=>String(value||"").toLowerCase().includes(search.toLowerCase())))),[rows,search,status]);
 const columns=[
  {key:"order",header:"Order",render:row=><div><strong>{row.order_no}</strong><br/><small>{row.quotation_no}</small></div>},
  {key:"customer",header:"Customer",render:row=><div>{row.customer_name}<br/><small>{row.phone||"No phone"}</small></div>},
  {key:"cake",header:"Cake preparation",render:row=><div>{row.cake_type||"Cake order"}<br/><small>{[row.flavour,row.quantity&&`Qty ${row.quantity}`].filter(Boolean).join(" · ")}</small></div>},
  {key:"required",header:"Required date",render:row=>formatDate(row.delivery_date||row.event_date)},
  {key:"payment",header:"Payment",render:row=><div><strong>Balance {formatMoney(row.balance_amount)}</strong><br/><small>Advance {formatMoney(row.advance_paid)} of {formatMoney(row.total_amount)}</small></div>},
  {key:"status",header:"Operations stage",render:row=><StatusBadge tone={crmStatusTone(displayStatus(row.status))}>{displayStatus(row.status)}</StatusBadge>},
  {key:"action",header:"Next step",align:"right",render:row=><SecondaryButton onClick={event=>{event.stopPropagation();navigate(`/crm/orders/${row.id}`);}}>Open workspace</SecondaryButton>},
 ];
 const banner=<StatisticsBanner ariaLabel="Order stages" items={[{key:"",label:"All orders",value:rows.length},{key:"Confirmed",label:"Confirmed",value:rows.filter(row=>displayStatus(row.status)==="Confirmed").length},{key:"Processing",label:"Processing",value:rows.filter(row=>displayStatus(row.status)==="Processing").length,tone:"warning"},{key:"Ready",label:"Ready",value:rows.filter(row=>displayStatus(row.status)==="Ready").length,tone:"success"},{key:"Invoice Pending",label:"Invoice pending",value:rows.filter(row=>displayStatus(row.status)==="Invoice Pending").length,tone:"info"},{key:"Cancelled",label:"Cancelled",value:rows.filter(row=>displayStatus(row.status)==="Cancelled").length,tone:"danger"}]} activeKey={status} onSelect={setStatus}/>;
 return <ListPageTemplate title="Orders" subtitle="Operations workspace for preparation, readiness, payment visibility and invoice handoff." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Orders"}]} primaryAction={<PrimaryButton onClick={()=>navigate("/crm/orders/new")}>New Order</PrimaryButton>} banner={banner} table={<SectionCard title="Order queue" description="Prioritize fulfilment by required date, current stage and outstanding balance."><UniversalFilterBar searchValue={search} onSearchChange={setSearch} statusValue={status} statusOptions={statuses} onStatusChange={setStatus} activeCount={(search?1:0)+(status?1:0)} onClear={()=>{setSearch("");setStatus("");}}/>{failed?<div role="alert">Orders could not be loaded. Refresh the page to try again.</div>:<DataTable ariaLabel="CRM orders" columns={columns} rows={visible} loading={loading} onRowClick={row=>navigate(`/crm/orders/${row.id}`)} emptyTitle="No orders match this view" emptyDescription="Confirmed quotations will appear here automatically."/>}</SectionCard>}/>;
}
