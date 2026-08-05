import React from "react";
import {useNavigate} from "react-router-dom";

export default function LeadViewNav({current="all",onStatus}){
 const navigate=useNavigate();
 const views=[["all","All Leads"],["Open","Open"],["follow-ups","Follow-ups"],["Won","Won"],["Lost","Lost"]];
 const select=key=>{
  if(key==="follow-ups") navigate("/crm/leads/follow-ups");
  else if(onStatus){onStatus(key==="all"?"":key);}
  else navigate("/crm/leads",{state:{status:key==="all"?"":key}});
 };
 return <nav className="crm-view-tabs" aria-label="Lead views">{views.map(([key,label])=><button className={current===key?"active":""} key={key} onClick={()=>select(key)}>{label}</button>)}</nav>;
}
