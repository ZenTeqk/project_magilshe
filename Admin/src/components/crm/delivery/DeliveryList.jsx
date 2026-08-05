import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import {ListPageTemplate} from "../../../admin/templates";
import {DataTable,SectionCard,SecondaryButton,StatisticsBanner,StatusBadge,UniversalFilterBar,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";

const statuses=["Pending","Out for Delivery","Delivered Successfully","Damaged During Delivery","Delivery Failed"];

export default function DeliveryList(){
 const navigate=useNavigate(),[rows,setRows]=useState([]),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Api.get("crm/deliveries/").then(({data})=>active&&setRows(data.results||data)).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[]);
 const visible=useMemo(()=>rows.filter(row=>(!status||row.delivery_status===status)&&(!search||[row.delivery_no,row.order_no,row.invoice_no,row.customer_name,row.phone].some(value=>String(value||"").toLowerCase().includes(search.toLowerCase())))),[rows,search,status]);
 const columns=[
  {key:"delivery",header:"Delivery",render:row=><div><strong>{row.delivery_no}</strong><br/><small>{row.order_no} · {row.invoice_no}</small></div>},
  {key:"customer",header:"Customer / recipient",render:row=><div>{row.recipient_name||row.customer_name}<br/><small>{row.recipient_phone||row.phone}</small></div>},
  {key:"type",header:"Delivery type",render:row=>row.delivery_type},
  {key:"schedule",header:"Scheduled",render:row=>row.scheduled_at?new Date(row.scheduled_at).toLocaleString("en-IN"):"—"},
  {key:"payment",header:"Final payment",render:row=><div><strong>{Number(row.balance_amount)===0?"Paid":"Balance due"}</strong><br/><small>{formatMoney(row.balance_amount)}</small></div>},
  {key:"status",header:"Fulfilment stage",render:row=><StatusBadge tone={crmStatusTone(row.delivery_status)}>{row.delivery_status}</StatusBadge>},
  {key:"action",header:"Next step",align:"right",render:row=><SecondaryButton onClick={event=>{event.stopPropagation();navigate(`/crm/delivery/${row.id}`);}}>Open workspace</SecondaryButton>},
 ];
 const banner=<StatisticsBanner ariaLabel="Delivery stages" items={[
  {key:"",label:"All fulfilments",value:rows.length},
  {key:"Pending",label:"Pending",value:rows.filter(row=>row.delivery_status==="Pending").length,tone:"info"},
  {key:"Out for Delivery",label:"Out for delivery",value:rows.filter(row=>row.delivery_status==="Out for Delivery").length,tone:"warning"},
  {key:"Delivered Successfully",label:"Delivered",value:rows.filter(row=>row.delivery_status==="Delivered Successfully").length,tone:"success"},
  {key:"Damaged During Delivery",label:"Damaged",value:rows.filter(row=>row.delivery_status==="Damaged During Delivery").length,tone:"danger"},
  {key:"Delivery Failed",label:"Failed",value:rows.filter(row=>row.delivery_status==="Delivery Failed").length,tone:"danger"},
 ]} activeKey={status} onSelect={setStatus}/>;
 return <ListPageTemplate title="Delivery" subtitle="Final fulfilment workspace for Customer Pickup, Magilshe Delivery and Porter Delivery orders." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Delivery"}]} banner={banner} table={<SectionCard title="Fulfilment queue" description="Review schedule, recipient, payment clearance and current delivery stage."><UniversalFilterBar searchValue={search} onSearchChange={setSearch} statusValue={status} statusOptions={statuses} onStatusChange={setStatus} activeCount={(search?1:0)+(status?1:0)} onClear={()=>{setSearch("");setStatus("");}}/>{failed?<div role="alert">Deliveries could not be loaded. Refresh the page to try again.</div>:<DataTable ariaLabel="CRM deliveries" columns={columns} rows={visible} loading={loading} onRowClick={row=>navigate(`/crm/delivery/${row.id}`)} emptyTitle="No deliveries match this view" emptyDescription="Paid invoices moved to Delivery will appear here automatically."/>}</SectionCard>}/>;
}
