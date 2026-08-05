import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import {ListPageTemplate} from "../../../admin/templates";
import {DataTable,SecondaryButton,SectionCard,StatisticsBanner,UniversalFilterBar,formatDate} from "../../../admin/design-system";
import "./customerUx.scss";

export default function CustomerList(){
 const navigate=useNavigate(),[rows,setRows]=useState([]),[search,setSearch]=useState(()=>new URLSearchParams(window.location.search).get("search")||""),[scope,setScope]=useState("all"),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Api.get("crm/customers/").then(({data})=>{if(active)setRows(data.results||data);}).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[]);
 const visible=useMemo(()=>{const term=search.toLowerCase();return rows.filter(row=>(!term||[row.name,row.phone,row.email,row.username].some(value=>String(value||"").toLowerCase().includes(term)))&&(scope==="all"||(scope==="leads"&&row.counts.leads>0)||(scope==="orders"&&row.counts.orders>0)||(scope==="delivery"&&row.counts.deliveries>0)||(scope==="repeat"&&row.counts.orders>1)));},[rows,search,scope]);
 const columns=[
  {key:"name",header:"Customer",render:row=><div className="crm-customer-directory__primary"><strong>{row.name}</strong><small>{row.phone||"No phone"}</small></div>},
  {key:"contact",header:"Contact",render:row=><div className="crm-customer-directory__contact"><span>{row.email||"No email"}</span><small>Account: {row.username}</small></div>},
  {key:"addresses",header:"Addresses",render:row=><span>{row.addresses.length} saved</span>},
  {key:"history",header:"CRM history",render:row=><span>{row.counts.leads} Leads · {row.counts.quotations} Quotations<br/><small>{row.counts.orders} Orders · {row.counts.invoices} Invoices · {row.counts.deliveries} Deliveries</small></span>},
  {key:"date_joined",header:"Customer since",render:row=>formatDate(row.date_joined)},
  {key:"action",header:"Action",align:"right",render:row=><SecondaryButton onClick={()=>navigate(`/crm/customers/${row.id}`)}>View profile</SecondaryButton>},
 ];
 const banner=<StatisticsBanner ariaLabel="Customer views" items={[{key:"all",label:"All customers",value:rows.length},{key:"leads",label:"With Leads",value:rows.filter(row=>row.counts.leads>0).length,tone:"info"},{key:"orders",label:"With Orders",value:rows.filter(row=>row.counts.orders>0).length,tone:"success"},{key:"repeat",label:"Repeat customers",value:rows.filter(row=>row.counts.orders>1).length,tone:"success"},{key:"delivery",label:"With Deliveries",value:rows.filter(row=>row.counts.deliveries>0).length,tone:"info"}]} activeKey={scope} onSelect={setScope}/>;
 const table=<SectionCard title="Customer directory" description="Open a profile to see the customer's complete connected CRM history."><UniversalFilterBar searchValue={search} onSearchChange={setSearch} activeCount={(search?1:0)+(scope!=="all"?1:0)} onClear={()=>{setSearch("");setScope("all");}}/>{failed?<div role="alert">Customers could not be loaded. Refresh the page to try again.</div>:<DataTable ariaLabel="CRM customers" columns={columns} rows={visible} loading={loading} onRowClick={row=>navigate(`/crm/customers/${row.id}`)} emptyTitle={search||scope!=="all"?"No customers match this view":"No CRM customers found"} emptyDescription={search||scope!=="all"?"Clear the search or customer view to see other profiles.":"Existing authentication customers will appear here when available."}/>}</SectionCard>;
 return <ListPageTemplate title="Customers" subtitle="One customer profile for addresses, enquiries, commercial documents, payments and delivery history." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Customers"}]} banner={banner} table={table}/>;
}
