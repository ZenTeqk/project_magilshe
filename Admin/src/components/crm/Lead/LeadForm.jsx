import React,{useContext,useEffect,useState} from "react";
import {ArrowBack,CakeOutlined,CalendarMonthOutlined,Close,FlagOutlined,HistoryOutlined,LocalShippingOutlined,NotesOutlined,PaymentsOutlined,PersonOutline,StorefrontOutlined,UploadFileOutlined} from "@mui/icons-material";
import {useLocation,useNavigate,useParams} from "react-router-dom";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import {PageHeader,StatusBadge} from "../shared";
import {ActivityTimeline} from "../../../admin/workflow";
import {WonQuotationDialog} from "./LeadStatusDialog";
import {customerProfileFields,lookupExistingCustomer} from "./customerLookup";
import {DateInput,Field,NotesInput,NumberInput,PageContainer,PhoneInput,PrimaryButton,SecondaryButton,SelectInput,TextInput,extractErrorMessage,extractFieldErrors,focusFirstInvalidField,formatDate} from "../../../admin/design-system";
import "../crm.scss";
import "./leadUx.scss";

const blank={customer_name:"",phone:"",email:"",whatsapp_number:"",alternate_phone:"",address:"",city:"",state:"",pincode:"",cake_type:"Custom Cake",flavour:"",shape:"",weight:"",quantity:1,theme:"",occasion:"Birthday",event_date:"",delivery_date:"",delivery_time:"",delivery_type:"",delivery_address:"",budget:"",estimated_amount:"",cake_message:"",customer_notes:"",internal_notes:"",status:"Open",follow_up_date:"",follow_up_time:"",follow_up_notes:"",lead_source:"Walk-in",lead_source_details:"",staff_remarks:"",winning_reason:"",loss_reason:"",internal_sales_notes:""};
const optionTypes=["occasion","cake_type","cake_flavour","lead_source","winning_reason","loss_reason"];
const longFields=["address","cake_message","customer_notes","internal_notes","staff_remarks","internal_sales_notes","follow_up_notes"];
const phoneFields=["phone","whatsapp_number","alternate_phone"];
const Fields=({items,form,change,errors={}})=>items.map(({name,label,type="text",required=false,options,wide=false})=>{
 const isWide=wide||longFields.includes(name),span=isWide?12:4;
 const common={name,value:form[name]??"",onChange:change};
 let control;
 if(options)control=<SelectInput {...common}>{options.map(x=><option key={x} value={x}>{x}</option>)}</SelectInput>;
 else if(longFields.includes(name))control=<NotesInput {...common} rows={3}/>;
 else if(type==="number")control=<NumberInput {...common} min={0}/>;
 else if(type==="date")control=<DateInput {...common}/>;
 else if(type==="time")control=<TextInput {...common} type="time"/>;
 else if(phoneFields.includes(name))control=<PhoneInput {...common} maxLength={10}/>;
 else control=<TextInput {...common} type={type}/>;
 return <Field key={name} label={label} required={required} span={span} error={errors[name]}>{control}</Field>;
});
const Section=({id,icon:Icon,title,text,children})=><section id={id} className="crm-section crm-form-card"><div className="crm-section-heading"><span className="crm-section-icon"><Icon/></span><div><h3>{title}</h3><p>{text}</p></div></div>{children}</section>;

export default function LeadForm(){
 const {id}=useParams(),navigate=useNavigate(),location=useLocation(),{ShowNotification}=useContext(MainContext)||{};
 const [form,setForm]=useState({...blank,...(location.state?.leadDraft||{})}),[errors,setErrors]=useState({}),[saving,setSaving]=useState(false),[originalStatus,setOriginalStatus]=useState("Open"),[referenceFiles,setReferenceFiles]=useState([]),[existingImages,setExistingImages]=useState([]),[wonLead,setWonLead]=useState(null),[matchedCustomer,setMatchedCustomer]=useState(null);
 const [options,setOptions]=useState({occasion:["Birthday"],cake_type:["Custom Cake"],cake_flavour:[],lead_source:["Walk-in"],winning_reason:[],loss_reason:[]});
 useEffect(()=>{if(id)Api.get(`crm/leads/${id}/`).then(({data})=>{setForm({...blank,...data,delivery_time:data.delivery_time?.slice(0,5)||"",follow_up_time:data.follow_up_time?.slice(0,5)||""});setOriginalStatus(data.status);setExistingImages(data.reference_images||[]);});},[id]);
 useEffect(()=>{Promise.all(optionTypes.map(type=>Api.get("crm/options/",{params:{type,active:true}}).then(({data})=>[type,(data.results||data).map(x=>x.name)]))).then(entries=>setOptions(current=>({...current,...Object.fromEntries(entries)})));},[]);
 useEffect(()=>{if(id)return undefined;const phone=String(form.phone||"").replace(/\D/g,"");const name=String(form.customer_name||"").trim();setMatchedCustomer(null);const term=phone.length===10?phone:name.length>=3?name:"";if(!term)return undefined;let active=true;const timer=setTimeout(()=>lookupExistingCustomer(term).then(customer=>{if(!active)return;setMatchedCustomer(customer);if(customer)setForm(current=>({...current,...customerProfileFields(customer),phone:customer.phone?String(customer.phone).replace(/\D/g,"").slice(-10)||current.phone:current.phone}));}).catch(()=>{}),300);return()=>{active=false;clearTimeout(timer);};},[form.phone,form.customer_name,id]);
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();if(saving)return;setErrors({});
  const clientErrors={};
  const phoneDigits=String(form.phone||"").replace(/\D/g,"");
  if(!phoneDigits||phoneDigits.length!==10)clientErrors.phone="Phone number must contain exactly 10 digits.";
  if(!form.customer_name?.trim())clientErrors.customer_name="Customer name is required.";
  if(!form.event_date)clientErrors.event_date="Event date is required.";
  if(Object.keys(clientErrors).length){setErrors(clientErrors);ShowNotification?.("error","Please check the highlighted fields.");focusFirstInvalidField(clientErrors,".crm-lead-form");return;}
  setSaving(true);const payload=Object.fromEntries(Object.entries(form).filter(([k])=>!["activities","reference_images","quotation_id","assigned_to_name","cake_name"].includes(k)).map(([k,v])=>[k,v===""?null:v]));
  try{const {data}=id?await Api.patch(`crm/leads/${id}/`,payload):await Api.post("crm/leads/",payload);if(referenceFiles.length){const images=new FormData();referenceFiles.forEach(file=>images.append("images",file));await Api.post(`crm/leads/${data.id}/reference-images/`,images,{headers:{"Content-Type":"multipart/form-data"}});}ShowNotification?.("success",id?"Lead updated successfully":"Lead created successfully");if(data.status==="Won"&&originalStatus!=="Won")setWonLead(data);else navigate(`/crm/leads/${data.id}/edit`);}
  catch(err){const fieldErrors=extractFieldErrors(err);setErrors(fieldErrors);ShowNotification?.("error",extractErrorMessage(err,"Unable to save lead."));focusFirstInvalidField(fieldErrors,".crm-lead-form");}finally{setSaving(false);}
 };
 const removeExisting=async image=>{await Api.delete(`crm/leads/${id}/reference-images/${image.id}/`);setExistingImages(existingImages.filter(x=>x.id!==image.id));};
 const statusChoices=id?({Open:["Open","Follow-up","Won","Lost"],"Follow-up":["Follow-up","Won","Lost"],Won:["Won"],Lost:["Lost"]}[originalStatus]):["Open"];
 const nav=[["customer","Customer"],["event","Event"],["cake","Cake"],["delivery","Delivery"],["pricing","Pricing"],["status","Status"],["content","Cake Content"],["sales","Sales"],...(id?[["activity","Activity"]]:[])];
 const scrollTo=anchor=>document.getElementById(anchor)?.scrollIntoView({behavior:"smooth",block:"start"});
 const convertToQuotation=async()=>{if(form.quotation_id){navigate(`/crm/quotations/${form.quotation_id}`);return;}const {data}=await Api.post(`crm/leads/${id}/convert/`);navigate(data?.data?.id?`/crm/quotations/${data.data.id}`:"/crm/quotations");};
 const statusAction=!id?null
  :form.status==="Won"?{label:form.quotation_id?"View quotation":"Generate quotation",onClick:convertToQuotation}
  :form.status==="Follow-up"?{label:"Complete follow-up",onClick:()=>scrollTo("status")}
  :form.status==="Lost"?{label:"View lost reason",onClick:()=>scrollTo("status")}
  :form.status==="Completed"?{label:"View summary",onClick:()=>scrollTo("workspace-summary")}
  :null;
 const activities=(form.activities||[]).map(item=>({id:item.id,title:item.action,note:item.description,actor:item.staff_name,time:new Date(item.created_on).toLocaleString("en-IN"),rawTime:item.created_on,reference:form.lead_no}));
 return <PageContainer variant="form" className="crm-page crm-lead-form-page"><PageHeader title={id?(form.lead_no||"Edit lead"):"Create full lead"} subtitle={id&&form.customer_name?`${form.customer_name} · Edit the existing enquiry without changing its workflow.`:"All enquiry details in one clear, organised workspace."} breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Leads",href:"/crm/leads"},{label:id?"Edit lead":"New lead"}]} status={id&&<StatusBadge status={form.status}/>} primaryAction={statusAction&&<PrimaryButton onClick={statusAction.onClick}>{statusAction.label}</PrimaryButton>}><SecondaryButton icon={<ArrowBack/>} onClick={()=>navigate("/crm/leads")}>Back to leads</SecondaryButton></PageHeader>
  {id&&<div className="crm-lead-workspace-summary" id="workspace-summary">
   <div><span>Lead ID</span><strong>{form.lead_no}</strong></div>
   <div><span>Created</span><strong>{formatDate(form.created_on)}</strong></div>
   {form.quotation_id&&<div><span>Quotation</span><strong className="crm-link" onClick={()=>navigate(`/crm/quotations/${form.quotation_id}`)}>View quotation</strong></div>}
  </div>}
  <form className="crm-lead-form" onSubmit={submit}>
   <aside className="crm-form-nav"><span>Lead sections</span>{nav.map(([anchor,label],index)=><a href={`#${anchor}`} key={anchor}><b>{index+1}</b>{label}</a>)}</aside>
   <main className="crm-form-content">
    {!!Object.keys(errors).length&&<div className="crm-error" role="alert"><strong>Please check the highlighted field{Object.keys(errors).length>1?"s":""} below</strong></div>}
    <Section id="customer" icon={PersonOutline} title="Customer Information" text="Contact details and the customer's primary address."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"customer_name",label:"Customer name",required:true},{name:"phone",label:"Phone",required:true},{name:"email",label:"Email",type:"email"},{name:"whatsapp_number",label:"WhatsApp number"},{name:"alternate_phone",label:"Alternate phone"},{name:"address",label:"Address",wide:true},{name:"city",label:"City"},{name:"state",label:"State"},{name:"pincode",label:"Pincode"}]}/></div>{matchedCustomer&&<div className="crm-customer-match"><strong>Existing Customer Found</strong><span>{matchedCustomer.name||matchedCustomer.phone}</span></div>}</Section>
    <Section id="event" icon={CalendarMonthOutlined} title="Event Details" text="The occasion and date this enquiry is for."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"occasion",label:"Occasion",required:true,options:options.occasion},{name:"event_date",label:"Event date",type:"date",required:true}]}/></div></Section>
    <Section id="cake" icon={CakeOutlined} title="Cake Details" text="Specifications, theme, and reference images."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"cake_type",label:"Cake type",required:true,options:options.cake_type},{name:"flavour",label:"Cake flavour",options:options.cake_flavour},{name:"shape",label:"Shape"},{name:"weight",label:"Weight (kg)",type:"number"},{name:"quantity",label:"Quantity",type:"number",required:true},{name:"theme",label:"Theme"}]}/></div><label className="crm-upload-zone"><UploadFileOutlined/><strong>Reference cake images</strong><span>Choose JPG, PNG or WEBP files</span><input type="file" multiple accept=".jpg,.jpeg,.png,.webp" onChange={e=>setReferenceFiles([...referenceFiles,...e.target.files])}/></label><div className="crm-image-grid">{existingImages.map(image=><div className="crm-image-preview" key={image.id}><img src={image.url} alt={image.original_name}/><button type="button" onClick={()=>removeExisting(image)}><Close/></button></div>)}{referenceFiles.map((file,index)=><div className="crm-image-preview" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name}/><button type="button" onClick={()=>setReferenceFiles(referenceFiles.filter((_,i)=>i!==index))}><Close/></button></div>)}</div></Section>
    <Section id="delivery" icon={LocalShippingOutlined} title="Delivery Information" text="Only the expected handover date and time are captured at lead stage. Method and address are collected later."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"delivery_date",label:"Expected delivery date",type:"date"},{name:"delivery_time",label:"Expected delivery time",type:"time"}]}/></div></Section>
    <Section id="pricing" icon={PaymentsOutlined} title="Pricing" text="The customer's budget and current estimate."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"budget",label:"Budget",type:"number"},{name:"estimated_amount",label:"Estimated amount",type:"number"}]}/></div></Section>
    <Section id="status" icon={FlagOutlined} title="Status" text="Move the lead through the sales workflow. Won is always available when the workflow permits."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"status",label:"Status",required:true,options:statusChoices}]}/>{form.status==="Follow-up"&&<Fields form={form} change={change} errors={errors} items={[{name:"follow_up_date",label:"Next follow-up date",type:"date",required:true},{name:"follow_up_time",label:"Next follow-up time",type:"time"},{name:"follow_up_notes",label:"Follow-up notes",required:true,wide:true}]}/>} {form.status==="Won"&&<Fields form={form} change={change} errors={errors} items={[{name:"winning_reason",label:"Reason for winning",required:true,options:options.winning_reason}]}/>} {form.status==="Lost"&&<Fields form={form} change={change} errors={errors} items={[{name:"loss_reason",label:"Reason for loss",required:true,options:options.loss_reason}]}/>}</div><div className="crm-workflow"><span className={form.status==="Open"?"active":""}>Open</span><i>→</i><span className={form.status==="Follow-up"?"active":form.status==="Won"?"done":""}>Follow-up</span><i>→</i><span className={form.status==="Won"?"active":""}>Won</span><i>→</i><span>Quotation</span></div></Section>
    <Section id="content" icon={NotesOutlined} title="Cake Content" text="Exact wording and customer instructions for the cake."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"cake_message",label:"Message to appear on cake",wide:true},{name:"customer_notes",label:"Customer instructions",wide:true}]}/></div></Section>
    <Section id="sales" icon={StorefrontOutlined} title="Sales Information" text="Acquisition context and staff notes."><div className="crm-fields"><Fields form={form} change={change} errors={errors} items={[{name:"lead_source",label:"Lead source",options:options.lead_source},{name:"lead_source_details",label:"Lead source details"},{name:"internal_sales_notes",label:"Notes",wide:true}]}/></div></Section>
    {id&&<Section id="activity" icon={HistoryOutlined} title="Activity" text="Lead events grouped chronologically for quick scanning."><ActivityTimeline items={activities} emptyMessage="No lead activity has been recorded yet."/></Section>}
    <div className="crm-form-actions crm-form-actions--sticky"><SecondaryButton onClick={()=>navigate(-1)}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving?"Saving…":"Save lead"}</PrimaryButton></div>
   </main>
  </form>
  {wonLead&&<WonQuotationDialog lead={wonLead} onLater={()=>navigate(`/crm/leads/${wonLead.id}/edit`)} onGenerate={async()=>{const {data}=await Api.post(`crm/leads/${wonLead.id}/convert/`);navigate(`/crm/quotations/${data.data.id}`);}}/>}
 </PageContainer>;
}
