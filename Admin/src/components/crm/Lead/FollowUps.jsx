import React,{useCallback,useContext,useEffect,useMemo,useState} from "react";
import {Button,MenuItem,TextField} from "@mui/material";
import {AddCommentOutlined,CheckCircleOutline,EditCalendarOutlined,OpenInNewOutlined,PhoneInTalkOutlined,WarningAmberOutlined} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import {StatusBadge,displayDate} from "../shared";
import {DataTable,DateInput,Field,Modal,NotesInput,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import {DashboardPageTemplate} from "../../../admin/templates";
import LeadViewNav from "./LeadViewNav";
import "../crm.scss";
import "./leadUx.scss";

const localDate=value=>{const date=new Date(value);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,10);};
const today=()=>localDate(new Date());
const priority=date=>date<today()?"Overdue":date===today()?"Today":"Upcoming";
const time=value=>value?new Date(`2000-01-01T${value}`).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):"—";

export default function FollowUps(){
 const navigate=useNavigate(),{ShowNotification}=useContext(MainContext);
 const [rows,setRows]=useState([]),[completed,setCompleted]=useState([]),[summary,setSummary]=useState({}),[loading,setLoading]=useState(true);
 const [scope,setScope]=useState("all"),[search,setSearch]=useState(""),[occasion,setOccasion]=useState(""),[status,setStatus]=useState("");
 const [editor,setEditor]=useState(null),[form,setForm]=useState({note:"",follow_up_date:"",follow_up_time:""});
 const load=useCallback(()=>{setLoading(true);Api.get("crm/leads/follow-ups/").then(({data})=>{setRows(data.results);setCompleted(data.completed_results||[]);setSummary(data.summary);}).finally(()=>setLoading(false));},[]);
 useEffect(()=>{load();},[load]);
 const filtered=useMemo(()=>{
  const source=scope==="completed"?completed:rows,now=today(),tomorrow=localDate(new Date(Date.now()+86400000)),week=localDate(new Date(Date.now()+7*86400000));
  return source.filter(row=>{
   const text=`${row.lead_no} ${row.customer_name} ${row.phone} ${row.occasion} ${row.cake_type} ${row.flavour||""}`.toLowerCase();
   const date=row.follow_up_date;
   const scopeMatches=scope==="all"||scope==="completed"||
    (scope==="today"&&date===now)||
    (scope==="overdue"&&date<now)||
    (scope==="tomorrow"&&date===tomorrow)||
    (scope==="week"&&date>=now&&date<=week);
   return (!search||text.includes(search.toLowerCase()))&&(!occasion||row.occasion===occasion)&&(!status||row.status===status)&&
    scopeMatches;
  });
 },[rows,completed,scope,search,occasion,status]);
 const openEditor=(type,row)=>{setEditor({type,row});setForm({note:type==="note"?"":row.follow_up_notes||"",follow_up_date:row.follow_up_date||"",follow_up_time:row.follow_up_time?.slice(0,5)||""});};
 const save=async()=>{try{if(editor.type==="note")await Api.post(`crm/leads/${editor.row.id}/follow-up-note/`,{note:form.note});else await Api.patch(`crm/leads/${editor.row.id}/`,{follow_up_date:form.follow_up_date,follow_up_time:form.follow_up_time||null,follow_up_notes:form.note});ShowNotification("success",editor.type==="note"?"Note added":"Follow-up rescheduled");setEditor(null);load();}catch(err){ShowNotification("error",err.response?.data?.message||"Unable to update follow-up");}};
 const completeFollowUp=async row=>{if(!window.confirm(`Mark the follow-up for ${row.customer_name} as complete?`))return;await Api.post(`crm/leads/${row.id}/complete-follow-up/`);ShowNotification("success","Follow-up completed");load();};
 const occasionOptions=[...new Set(rows.map(x=>x.occasion).filter(Boolean))];
 const columns=[
  {key:"lead_no",header:"Lead ID",width:"1fr",render:row=><strong className="crm-link" onClick={()=>navigate(`/crm/leads/${row.id}/edit`)}>{row.lead_no}</strong>},
  {key:"customer_name",header:"Customer",width:"1.3fr",render:row=><strong>{row.customer_name}</strong>},
  {key:"phone",header:"Phone",width:"1.1fr",render:row=><a className="crm-phone-link" href={`tel:${row.phone}`}>{row.phone}</a>},
  {key:"occasion",header:"Occasion",width:"1fr",render:row=>row.occasion},
  {key:"cake",header:"Cake / Flavour",width:"1.1fr",render:row=><div>{row.cake_type}<br/><small>{row.flavour||"—"}</small></div>},
  {key:"status",header:"Status",width:"1fr",render:row=><StatusBadge status={row.status}/>},
  {key:"followup",header:"Next Follow-up",width:"1.4fr",render:row=>{const badge=row.follow_up_date?priority(row.follow_up_date):"Completed";return <div className="crm-followup-schedule"><span className={`crm-priority crm-priority--${badge.toLowerCase()}`}>{badge}</span><strong>{displayDate(row.follow_up_date)} · {time(row.follow_up_time)}</strong></div>;}},
  {key:"notes",header:"Follow-up Notes",width:"1.6fr",render:row=><button className="crm-note-preview" onClick={()=>openEditor("note",row)}>{row.follow_up_notes||"Add a quick note"}</button>},
  {key:"actions",header:"Quick Actions",align:"right",render:row=><div className="crm-row-actions"><Button size="small" startIcon={<OpenInNewOutlined/>} onClick={()=>navigate(`/crm/leads/${row.id}/edit`)}>Open</Button>{scope!=="completed"&&<><Button size="small" startIcon={<CheckCircleOutline/>} onClick={()=>completeFollowUp(row)}>Complete</Button><Button size="small" startIcon={<EditCalendarOutlined/>} onClick={()=>openEditor("reschedule",row)}>Reschedule</Button><Button size="small" startIcon={<AddCommentOutlined/>} onClick={()=>openEditor("note",row)}>Note</Button></>}</div>},
 ];
 const cards=[
  {key:"today",label:"Today's Follow-ups",value:summary.today||0,icon:PhoneInTalkOutlined,tone:"today"},
  {key:"overdue",label:"Overdue",value:summary.overdue||0,icon:WarningAmberOutlined,tone:"overdue"},
  {key:"completed",label:"Completed Today",value:summary.completed_today||0,icon:CheckCircleOutline,tone:"complete"},
 ];
 return <div className="crm-followups-console"><DashboardPageTemplate title="Follow-ups" subtitle="Today's contact list and scheduled callbacks, kept inside Leads." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Leads",href:"/crm/leads"},{label:"Follow-ups"}]} primaryAction={<PrimaryButton onClick={()=>navigate("/crm/leads/new")}>New lead</PrimaryButton>} secondaryActions={<SecondaryButton onClick={()=>navigate("/crm/leads")}>All leads</SecondaryButton>}><LeadViewNav current="follow-ups"/>
  <div className="crm-followup-summary">{cards.map(card=>{const CardIcon=card.icon;return <button key={card.key} className={`crm-followup-stat crm-followup-stat--${card.tone} ${scope===card.key?"active":""}`} onClick={()=>setScope(scope===card.key?"all":card.key)}><CardIcon/><span>{card.label}</span><strong>{card.value}</strong></button>;})}</div>
  <div className="crm-panel"><div className="crm-toolbar crm-followup-toolbar"><TextField size="small" label="Search" value={search} onChange={e=>setSearch(e.target.value)}/><TextField select size="small" label="Quick date" value={["today","overdue","tomorrow","week"].includes(scope)?scope:""} onChange={e=>setScope(e.target.value||"all")}><MenuItem value="">All scheduled</MenuItem><MenuItem value="today">Today</MenuItem><MenuItem value="overdue">Overdue</MenuItem><MenuItem value="tomorrow">Tomorrow</MenuItem><MenuItem value="week">This week</MenuItem></TextField><TextField select size="small" label="Occasion" value={occasion} onChange={e=>setOccasion(e.target.value)}><MenuItem value="">All occasions</MenuItem>{occasionOptions.map(x=><MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField><TextField select size="small" label="Lead status" value={status} onChange={e=>setStatus(e.target.value)}><MenuItem value="">All statuses</MenuItem>{["Follow-up","Won","Lost"].map(x=><MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></div>
   <DataTable ariaLabel="Follow-ups" columns={columns} rows={filtered} loading={loading} emptyTitle="No follow-ups in this view" emptyDescription="Try another date or clear the filters."/>
  </div>
  <Modal open={Boolean(editor)} onClose={()=>setEditor(null)} title={editor?.type==="note"?"Add follow-up note":"Reschedule follow-up"} footer={<><SecondaryButton onClick={()=>setEditor(null)}>Cancel</SecondaryButton><PrimaryButton disabled={!form.note.trim()||(editor?.type==="reschedule"&&!form.follow_up_date)} onClick={save}>Save</PrimaryButton></>}>{editor?.type==="reschedule"&&<><Field label="Next follow-up date" required><DateInput value={form.follow_up_date} onChange={e=>setForm({...form,follow_up_date:e.target.value})}/></Field><Field label="Next follow-up time"><input type="time" value={form.follow_up_time} onChange={e=>setForm({...form,follow_up_time:e.target.value})}/></Field></>}<Field label={editor?.type==="note"?"Quick note":"Reschedule notes"} required><NotesInput autoFocus rows={3} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></Field></Modal>
 </DashboardPageTemplate></div>;
}
