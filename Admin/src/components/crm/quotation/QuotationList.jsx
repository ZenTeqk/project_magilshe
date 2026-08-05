import React,{useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import {ListPageTemplate} from "../../../admin/templates";
import {DataTable,PrimaryButton,SectionCard,SecondaryButton,StatisticsBanner,StatusBadge,UniversalFilterBar,formatDate,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";

const statuses=["Draft","Sent","Accepted","Advance Received","Order Confirmed"];

export default function QuotationList(){
 const navigate=useNavigate(),[rows,setRows]=useState([]),[pending,setPending]=useState([]),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[sort,setSort]=useState("newest"),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Promise.all([Api.get("crm/quotations/"),Api.get("crm/quotations/pending/")]).then(([quotes,leads])=>{if(active){setRows(quotes.data.results||quotes.data);setPending(leads.data);}}).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[]);
 const visible=useMemo(()=>rows.filter(row=>{const term=search.toLowerCase();return(!term||[row.quotation_no,row.customer_name,row.phone,row.cake_type].some(value=>String(value||"").toLowerCase().includes(term)))&&(!status||row.status===status);}).sort((a,b)=>sort==="amount"?Number(b.total_amount)-Number(a.total_amount):sort==="event"?String(a.event_date||"").localeCompare(String(b.event_date||"")):b.id-a.id),[rows,search,status,sort]);
 const columns=[
  {key:"quotation",header:"Quotation",render:row=><div><strong>{row.quotation_no}</strong><br/><small>{row.lead?row.lead_no:"New entry"}</small></div>},
  {key:"customer",header:"Customer",render:row=><div>{row.customer_name}<br/><small>{row.phone||"No phone"}</small></div>},
  {key:"event",header:"Event date",render:row=>formatDate(row.event_date)},
  {key:"total",header:"Commercial summary",render:row=><div><strong>{formatMoney(row.total_amount)}</strong><br/><small>Advance {formatMoney(row.advance_amount)} · Balance {formatMoney(row.balance_amount)}</small></div>},
  {key:"status",header:"Stage",render:row=><StatusBadge tone={crmStatusTone(row.status)}>{row.status}</StatusBadge>},
  {key:"created",header:"Created",render:row=>formatDate(row.created_on)},
  {key:"action",header:"Action",align:"right",render:row=><SecondaryButton onClick={event=>{event.stopPropagation();navigate(`/crm/quotations/${row.id}/edit`);}}>Open workspace</SecondaryButton>},
 ];
 const banner=<StatisticsBanner ariaLabel="Quotation stages" items={[{key:"",label:"All quotations",value:rows.length},{key:"Draft",label:"Draft",value:rows.filter(row=>row.status==="Draft").length},{key:"Sent",label:"Sent",value:rows.filter(row=>row.status==="Sent").length,tone:"warning"},{key:"Accepted",label:"Accepted",value:rows.filter(row=>row.status==="Accepted").length,tone:"info"},{key:"Advance Received",label:"Advance received",value:rows.filter(row=>row.status==="Advance Received").length,tone:"success"},{key:"Order Confirmed",label:"Confirmed",value:rows.filter(row=>row.status==="Order Confirmed").length,tone:"success"}]} activeKey={status} onSelect={setStatus}/>;
 const filters=<UniversalFilterBar searchValue={search} onSearchChange={setSearch} statusValue={status} statusOptions={statuses} onStatusChange={setStatus} activeCount={(search?1:0)+(status?1:0)+(sort!=="newest"?1:0)} onClear={()=>{setSearch("");setStatus("");setSort("newest");}} extraFilters={<label className="mads-filter-control"><span>Sort by</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Newest</option><option value="event">Event date</option><option value="amount">Highest amount</option></select></label>}/>;
 const pendingStrip=pending.length>0&&<SectionCard title={`Ready to quote (${pending.length})`} description="Won leads waiting for a commercial quotation.">
  <div style={{display:"flex",flexDirection:"column",gap:8}}>
   {pending.map(lead=><div key={lead.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"8px 0",borderBottom:"1px solid var(--mads-divider)"}}>
    <span><strong>{lead.customer_name}</strong> <small><strong>{lead.lead_no}</strong> · {formatDate(lead.event_date)} · {formatMoney(lead.estimated_amount||lead.budget)}</small></span>
    <PrimaryButton onClick={()=>navigate(`/crm/quotations/new?lead=${lead.id}`)}>Generate quotation</PrimaryButton>
   </div>)}
  </div>
 </SectionCard>;
 return <ListPageTemplate title="Quotations" subtitle="Commercial workspace for pricing, customer approval, advance collection and order confirmation." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Quotations"}]} primaryAction={<PrimaryButton onClick={()=>navigate("/crm/quotations/new")}>New quotation</PrimaryButton>} banner={banner} filters={filters} table={<>{pendingStrip}<SectionCard title="Quotation workspace" description="Open a quotation to continue its current business stage.">{failed?<div role="alert">Quotations could not be loaded. Refresh the page to try again.</div>:<DataTable ariaLabel="Quotations" columns={columns} rows={visible} loading={loading} onRowClick={row=>navigate(`/crm/quotations/${row.id}/edit`)} emptyTitle="No quotations match this view" emptyDescription="Clear the filters or create a new quotation."/>}</SectionCard></>}/>;
}
