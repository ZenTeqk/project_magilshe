import React,{useContext,useEffect,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import {DetailPageTemplate} from "../../../admin/templates";
import {ActivityTimeline,WorkflowActionBar,WorkflowProgress,WorkspaceSummary} from "../../../admin/workflow";
import {DataTable,EmptyState,Field,GridItem,Modal,NotesInput,NumberInput,PhoneInput,PrimaryButton,ResponsiveGrid,SectionCard,SecondaryButton,SelectInput,SkeletonCards,StatusBadge as DesignStatusBadge,TextInput,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";
import {Info} from "../shared";
import "../crm.scss";
import "./delivery.scss";

const DateTimeInput=props=><input type="datetime-local" {...props}/>;
const toLocalInput=value=>{if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16);};
const fromLocalInput=value=>value?new Date(value).toISOString():null;
const StatusBadge=({children})=><DesignStatusBadge tone={crmStatusTone(children)}>{children}</DesignStatusBadge>;

const deliveryTypes=[
 {value:"Customer Pickup",label:"Customer Pickup",hint:"Someone visits the bakery and collects the order."},
 {value:"Magilshe Delivery",label:"Magilshe Delivery",hint:"Our own delivery staff delivers the order."},
 {value:"Porter Delivery",label:"Porter Delivery",hint:"A third-party porter (Rapido, Porter, Dunzo) delivers the order."},
];
const pickupPersonTypes=["Customer","Family Member","Friend","Other"];
const failureReasonExamples=["Customer unavailable","Wrong address","Customer cancelled","Vehicle issue","Unable to contact customer"];

export default function DeliveryDetails(){
 const {id}=useParams(),navigate=useNavigate(),{ShowNotification}=useContext(MainContext);
 const [delivery,setDelivery]=useState(),[form,setForm]=useState(),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const [deliveryPersons,setDeliveryPersons]=useState([]),[failureReasons,setFailureReasons]=useState(failureReasonExamples);
 const [damageModal,setDamageModal]=useState(null),[failureModal,setFailureModal]=useState(null),[modalError,setModalError]=useState("");

 const applyDelivery=data=>{setDelivery(data);setForm({...data,pickup_time:toLocalInput(data.pickup_time),delivery_time:toLocalInput(data.delivery_time),porter_time:toLocalInput(data.porter_time)});};
 useEffect(()=>{let active=true;Api.get(`crm/deliveries/${id}/`).then(({data})=>active&&applyDelivery(data)).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[id]);
 useEffect(()=>{Api.get("delivery-person/get/").then(({data})=>setDeliveryPersons((data?.data||[]).filter(person=>person.status)));},[]);
 useEffect(()=>{Api.get("crm/options/",{params:{type:"delivery_failure_reason",active:true}}).then(({data})=>{const names=(data.results||data).map(x=>x.name);setFailureReasons(names.length?names:failureReasonExamples);}).catch(()=>{});},[]);

 const crumbs=(current)=>[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Delivery",href:"/crm/delivery"},{label:current}];
 if(loading)return <DetailPageTemplate title="Delivery workspace" subtitle="Loading fulfilment information" breadcrumbs={crumbs("Delivery workspace")}><SkeletonCards count={5}/></DetailPageTemplate>;
 if(failed||!delivery||!form)return <DetailPageTemplate title="Delivery workspace" subtitle="The delivery could not be loaded" breadcrumbs={crumbs("Delivery workspace")}><EmptyState title="Delivery unavailable" description="Return to Delivery and try opening this record again." action={<SecondaryButton onClick={()=>navigate("/crm/delivery")}>Back to Delivery</SecondaryButton>}/></DetailPageTemplate>;

 const change=(key,value)=>setForm({...form,[key]:value});
 const typeLocked=delivery.delivery_status!=="Pending";
 const isPickup=form.delivery_type==="Customer Pickup",isPorter=form.delivery_type==="Porter Delivery",isMagilshe=form.delivery_type==="Magilshe Delivery";

 const patchPayload=()=>{
  const base={delivery_type:form.delivery_type,recipient_name:form.recipient_name||null,recipient_phone:form.recipient_phone||null};
  if(isPickup)return {...base,
   pickup_person_type:form.pickup_person_type||null,
   pickup_person_relationship:form.pickup_person_type==="Other"?(form.pickup_person_relationship||null):null,
   pickup_person_name:form.pickup_person_name||null,pickup_contact:form.pickup_contact||null,
   pickup_time:fromLocalInput(form.pickup_time),pickup_location:form.pickup_location||null,pickup_notes:form.pickup_notes||null};
  if(isPorter)return {...base,
   porter_id:form.porter_id||null,porter_name:form.porter_name||null,porter_contact:form.porter_contact||null,
   porter_location:form.porter_location||null,porter_time:fromLocalInput(form.porter_time),
   porter_amount:form.porter_amount===""?null:form.porter_amount,porter_notes:form.porter_notes||null};
  return {...base,
   delivery_person:form.delivery_person||null,delivery_time:fromLocalInput(form.delivery_time),
   delivery_location:form.delivery_location||null,delivery_notes:form.delivery_notes||null};
 };
 const save=async()=>{const {data}=await Api.patch(`crm/deliveries/${id}/`,patchPayload());applyDelivery(data);return data;};
 const saveOnly=async()=>{try{await save();ShowNotification("success","Delivery details saved");}catch(exception){ShowNotification("error",Object.values(exception.response?.data||{}).flat().join(" · ")||"Delivery details could not be saved");}};

 const startLabel=isPickup?"Mark Picked Up":"Start Delivery";
 const deliverLabel=isPickup?"Mark Handed Over":"Mark Delivered";
 const availableActions=delivery.delivery_status==="Pending"
  ?[{key:"start",label:startLabel,primary:true}]
  :delivery.delivery_status==="Out for Delivery"
  ?[{key:"deliver",label:deliverLabel,primary:true},{key:"mark_damaged",label:"Mark Damaged"},{key:"mark_failed",label:"Mark Failed"}]
  :[];

 const runAction=async(name,extra={})=>{setBusy(true);try{await save();const {data}=await Api.post(`crm/deliveries/${id}/workflow-action/`,{action:name,...extra});applyDelivery(data);ShowNotification("success",name==="start"?`${startLabel} recorded`:"Delivery completed and workflow closed");}catch(exception){ShowNotification("error",exception.response?.data?.message||Object.values(exception.response?.data||{}).flat().join(" · ")||"Complete the required delivery fields");}finally{setBusy(false);}};
 const onAction=item=>{
  if(item.key==="mark_damaged"){setModalError("");setDamageModal({description:"",files:[]});return;}
  if(item.key==="mark_failed"){setModalError("");setFailureModal({preset:"",reason:""});return;}
  runAction(item.key);
 };

 const submitDamage=async()=>{
  if(!damageModal.description.trim()){setModalError("Damage description is required.");return;}
  setBusy(true);setModalError("");
  try{
   await save();
   await Api.post(`crm/deliveries/${id}/workflow-action/`,{action:"mark_damaged",damage_description:damageModal.description});
   if(damageModal.files?.length){const body=new FormData();damageModal.files.forEach(file=>body.append("images",file));await Api.post(`crm/deliveries/${id}/damage-images/`,body,{headers:{"Content-Type":"multipart/form-data"}});}
   const {data}=await Api.get(`crm/deliveries/${id}/`);
   applyDelivery(data);setDamageModal(null);
   ShowNotification("success","Delivery marked as damaged");
  }catch(exception){setModalError(Object.values(exception.response?.data||{}).flat().join(" · ")||exception.response?.data?.message||"Could not record the damage report");}
  finally{setBusy(false);}
 };
 const submitFailure=async()=>{
  if(!failureModal.reason.trim()){setModalError("Failure reason is required.");return;}
  setBusy(true);setModalError("");
  try{
   await save();
   const {data}=await Api.post(`crm/deliveries/${id}/workflow-action/`,{action:"mark_failed",failure_reason:failureModal.reason});
   applyDelivery(data);setFailureModal(null);
   ShowNotification("success","Delivery marked as failed");
  }catch(exception){setModalError(Object.values(exception.response?.data||{}).flat().join(" · ")||exception.response?.data?.message||"Could not record the failure reason");}
  finally{setBusy(false);}
 };

 const itemColumns=[{key:"item",header:"Cake / Product",render:row=>row.item_name},{key:"description",header:"Delivery instructions",render:row=>row.description||"—"},{key:"flavour",header:"Flavour",render:row=>row.flavour||"—"},{key:"weight",header:"Weight",render:row=>row.weight||"—"},{key:"quantity",header:"Qty"},{key:"amount",header:"Amount",align:"right",render:row=>formatMoney(row.amount)}];
 const timeline=(delivery.timeline||[]).map(row=>({id:row.id,title:row.action,note:row.description,actor:row.staff_name,time:new Date(row.created_on).toLocaleString("en-IN")}));
 const actions=<WorkflowActionBar actions={availableActions} record={delivery} onAction={onAction} busyAction={busy?availableActions[0]?.key:undefined} emptyMessage="This order has reached its final delivery outcome."/>;
 const workflowSteps=[{key:"pending",label:"Pending"},{key:"out",label:isPickup?"Ready for Pickup":"Out for Delivery"},{key:"outcome",label:delivery.delivery_status==="Damaged During Delivery"?"Damaged During Delivery":delivery.delivery_status==="Delivery Failed"?"Delivery Failed":isPickup?"Handed Over":"Delivered Successfully"}];
 const stage=delivery.delivery_status==="Pending"?0:delivery.delivery_status==="Out for Delivery"?1:2;

 return <DetailPageTemplate title={delivery.delivery_no} subtitle={`Final fulfilment · ${delivery.order_no} · ${delivery.invoice_no}`} breadcrumbs={crumbs(delivery.delivery_no)} status={<StatusBadge>{delivery.delivery_status}</StatusBadge>} secondaryActions={<SecondaryButton onClick={()=>navigate("/crm/delivery")}>Back to Delivery</SecondaryButton>} workflow={<WorkflowProgress steps={workflowSteps} currentIndex={stage} status={delivery.delivery_status} ariaLabel={isPickup?"Pickup workflow":"Delivery workflow"}/>} aside={<WorkspaceSummary title={delivery.customer_name} items={[{label:"Delivery",value:delivery.delivery_no},{label:"Order",value:delivery.order_no},{label:"Status",value:delivery.delivery_status},{label:"Type",value:form.delivery_type},{label:"Payment",value:Number(delivery.balance_amount)===0?"Paid in full":`Balance ${formatMoney(delivery.balance_amount)}`,emphasis:true},{label:"Scheduled",value:delivery.scheduled_at?new Date(delivery.scheduled_at).toLocaleString("en-IN"):"—"}]}/>} footer={actions}>
  <SectionCard title="Delivery information" description="At-a-glance schedule and fulfilment context."><ResponsiveGrid><GridItem span={3}><Info label="Delivery number" value={delivery.delivery_no}/></GridItem><GridItem span={3}><Info label="Order number" value={delivery.order_no}/></GridItem><GridItem span={3}><Info label="Delivery type" value={form.delivery_type}/></GridItem><GridItem span={3}><Info label="Status" value={delivery.delivery_status}/></GridItem><GridItem span={3}><Info label="Scheduled" value={delivery.scheduled_at?new Date(delivery.scheduled_at).toLocaleString("en-IN"):"—"}/></GridItem><GridItem span={3}><Info label="Completed" value={delivery.completed_at?new Date(delivery.completed_at).toLocaleString("en-IN"):"—"}/></GridItem><GridItem span={3}><Info label="Final payment status" value={Number(delivery.balance_amount)===0?"Paid in full":`Balance ${formatMoney(delivery.balance_amount)}`}/></GridItem></ResponsiveGrid>
   {delivery.delivery_status==="Damaged During Delivery"&&<div className="crm-delivery-outcome crm-delivery-outcome--damage"><strong>Damage report:</strong> {delivery.damage_description}{delivery.damage_images?.length>0&&<div className="crm-image-grid">{delivery.damage_images.map(image=><a className="crm-image-preview" key={image.id} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.original_name}/></a>)}</div>}</div>}
   {delivery.delivery_status==="Delivery Failed"&&<div className="crm-delivery-outcome crm-delivery-outcome--failure"><strong>Failure reason:</strong> {delivery.failure_reason}</div>}
  </SectionCard>

  <SectionCard title="Delivery type" description="Choose how this order is handed over to the customer. Only the relevant fields are required.">
   <div className="crm-delivery-types" role="group" aria-label="Delivery type">
    {deliveryTypes.map(type=><button type="button" key={type.value} disabled={typeLocked} aria-pressed={form.delivery_type===type.value} className={`crm-delivery-type${form.delivery_type===type.value?" crm-delivery-type--active":""}`} onClick={()=>change("delivery_type",type.value)}><strong>{type.label}</strong><small>{type.hint}</small></button>)}
   </div>
   {typeLocked&&<p className="crm-muted">The delivery type is locked once fulfilment has started.</p>}

   <div className="crm-fields">
    <Field label="Recipient name" span={4}><TextInput value={form.recipient_name||""} onChange={e=>change("recipient_name",e.target.value)}/></Field>
    <Field label="Recipient phone" span={4}><PhoneInput value={form.recipient_phone||""} onChange={e=>change("recipient_phone",e.target.value)}/></Field>
   </div>

   {isPickup&&<div className="crm-fields">
    <Field label="Person collecting" required span={4}><SelectInput value={form.pickup_person_type||""} onChange={e=>change("pickup_person_type",e.target.value)}><option value="">Select</option>{pickupPersonTypes.map(type=><option key={type} value={type}>{type}</option>)}</SelectInput></Field>
    {form.pickup_person_type==="Other"&&<Field label="Relationship" required span={4}><TextInput value={form.pickup_person_relationship||""} onChange={e=>change("pickup_person_relationship",e.target.value)}/></Field>}
    <Field label="Person name" required span={4}><TextInput value={form.pickup_person_name||""} onChange={e=>change("pickup_person_name",e.target.value)}/></Field>
    <Field label="Contact number" required span={4}><PhoneInput value={form.pickup_contact||""} onChange={e=>change("pickup_contact",e.target.value)}/></Field>
    <Field label="Pickup time" required span={4}><DateTimeInput value={form.pickup_time||""} onChange={e=>change("pickup_time",e.target.value)}/></Field>
    <Field label="Pickup location" required span={4}><TextInput value={form.pickup_location||""} onChange={e=>change("pickup_location",e.target.value)}/></Field>
    <Field label="Notes" span={12}><NotesInput rows={3} value={form.pickup_notes||""} onChange={e=>change("pickup_notes",e.target.value)}/></Field>
   </div>}

   {isMagilshe&&<div className="crm-fields">
    <Field label="Delivery person" required span={4}><SelectInput value={form.delivery_person||""} onChange={e=>change("delivery_person",e.target.value)}><option value="">Select delivery staff</option>{deliveryPersons.map(person=><option key={person.id} value={person.id}>{person.name}{person.phone?` · ${person.phone}`:""}</option>)}</SelectInput></Field>
    <Field label="Delivery time" required span={4}><DateTimeInput value={form.delivery_time||""} onChange={e=>change("delivery_time",e.target.value)}/></Field>
    <Field label="Delivery location" required span={4}><TextInput value={form.delivery_location||""} onChange={e=>change("delivery_location",e.target.value)}/></Field>
    <Field label="Notes" span={12}><NotesInput rows={3} value={form.delivery_notes||""} onChange={e=>change("delivery_notes",e.target.value)}/></Field>
   </div>}

   {isPorter&&<div className="crm-fields">
    <Field label="Porter ID" required span={4}><TextInput value={form.porter_id||""} onChange={e=>change("porter_id",e.target.value)}/></Field>
    <Field label="Porter name" required span={4}><TextInput value={form.porter_name||""} onChange={e=>change("porter_name",e.target.value)}/></Field>
    <Field label="Contact number" required span={4}><PhoneInput value={form.porter_contact||""} onChange={e=>change("porter_contact",e.target.value)}/></Field>
    <Field label="Delivery location" required span={4}><TextInput value={form.porter_location||""} onChange={e=>change("porter_location",e.target.value)}/></Field>
    <Field label="Delivery time" required span={4}><DateTimeInput value={form.porter_time||""} onChange={e=>change("porter_time",e.target.value)}/></Field>
    <Field label="Delivery charge" span={4}><NumberInput min="0" step="0.01" value={form.porter_amount??""} onChange={e=>change("porter_amount",e.target.value)}/></Field>
    <Field label="Notes" span={12}><NotesInput rows={3} value={form.porter_notes||""} onChange={e=>change("porter_notes",e.target.value)}/></Field>
   </div>}

   <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}><PrimaryButton onClick={saveOnly}>Save delivery details</PrimaryButton></div>
  </SectionCard>

  <SectionCard title="Cake details" description="Confirmed fulfilment information inherited from the linked Order."><DataTable ariaLabel="Delivery order items" columns={itemColumns} rows={delivery.items||[]} emptyTitle="No order items found" emptyDescription="The linked Order did not return item details."/><ResponsiveGrid><GridItem span={4}><Info label="Order total" value={formatMoney(delivery.total_amount)}/></GridItem><GridItem span={4}><Info label="Advance paid" value={formatMoney(delivery.advance_paid)}/></GridItem><GridItem span={4}><Info label="Final payment status" value={Number(delivery.balance_amount)===0?"Paid in full":`Balance ${formatMoney(delivery.balance_amount)}`}/></GridItem></ResponsiveGrid></SectionCard>
  <SectionCard title="Timeline" description="Read-only history grouped by date and workflow type."><ActivityTimeline items={timeline} emptyMessage="Assignment, start, completion and workflow closure events will appear here."/></SectionCard>

  <Modal open={Boolean(damageModal)} onClose={()=>setDamageModal(null)} title="Mark delivery as damaged" footer={<><SecondaryButton onClick={()=>setDamageModal(null)}>Cancel</SecondaryButton><PrimaryButton disabled={busy} onClick={submitDamage}>Mark Damaged</PrimaryButton></>}>
   {modalError&&<div className="crm-error" role="alert">{modalError}</div>}
   {damageModal&&<><Field label="Damage description" required helperText="Example: Box crushed in transit, cake toppled during ride."><NotesInput autoFocus rows={3} value={damageModal.description} onChange={e=>setDamageModal({...damageModal,description:e.target.value})}/></Field>
   <Field label="Photos (optional)" helperText="JPG, PNG or WEBP. You can add more than one."><input type="file" multiple accept=".jpg,.jpeg,.png,.webp" onChange={e=>setDamageModal({...damageModal,files:[...(damageModal.files||[]),...e.target.files]})}/></Field>
   {damageModal.files?.length>0&&<div className="crm-image-grid">{damageModal.files.map((file,index)=><div className="crm-image-preview" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name}/></div>)}</div>}</>}
  </Modal>

  <Modal open={Boolean(failureModal)} onClose={()=>setFailureModal(null)} title="Mark delivery as failed" footer={<><SecondaryButton onClick={()=>setFailureModal(null)}>Cancel</SecondaryButton><PrimaryButton disabled={busy} onClick={submitFailure}>Mark Failed</PrimaryButton></>}>
   {modalError&&<div className="crm-error" role="alert">{modalError}</div>}
   {failureModal&&<><Field label="Failure reason" required><SelectInput value={failureModal.preset} onChange={e=>{const value=e.target.value;setFailureModal({preset:value,reason:value==="__other__"?"":value});}}><option value="">Select a reason</option>{failureReasons.map(reason=><option key={reason} value={reason}>{reason}</option>)}<option value="__other__">Other (specify)</option></SelectInput></Field>
   {failureModal.preset==="__other__"&&<Field label="Custom reason" required><TextInput autoFocus value={failureModal.reason} onChange={e=>setFailureModal({...failureModal,reason:e.target.value})}/></Field>}</>}
  </Modal>
 </DetailPageTemplate>;
}
