import React,{useContext,useEffect,useMemo,useState} from "react";
import {TextField} from "@mui/material";
import {useNavigate,useParams} from "react-router-dom";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import {DetailPageTemplate} from "../../../admin/templates";
import {ActivityTimeline,CustomerSummaryPanel,WorkflowActionBar,WorkflowProgress,WorkspaceSummary} from "../../../admin/workflow";
import {crmWorkflowV1} from "../../../admin/workflow/config/v1";
import {Button,DataTable,EmptyState,Field,GridItem,Modal,ResponsiveGrid,SectionCard,SecondaryButton,SelectInput,SkeletonCards,StatusBadge as DesignStatusBadge,TextInput,formatDate,formatMoney,formatTime} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";
import {Info} from "../shared";
import "../crm.scss";

const displayStatus=status=>status==="Production"?"Processing":status==="Invoice Generated"?"Invoice Pending":status;
const StatusBadge=({children})=><DesignStatusBadge tone={crmStatusTone(children)}>{children}</DesignStatusBadge>;
const uncancellableStatuses=["Delivery","Out for Delivery","Delivered","Completed","Closed","Cancelled"];
const cancellationReasonExamples=["Customer cancelled","Payment not received","Duplicate order","Product unavailable","Delivery issue","Customer not responding"];

export default function OrderDetails(){
 const {id}=useParams(),navigate=useNavigate(),{ShowNotification}=useContext(MainContext),[order,setOrder]=useState(),[notes,setNotes]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const [cancelModal,setCancelModal]=useState(null),[cancelReasons,setCancelReasons]=useState(cancellationReasonExamples),[modalError,setModalError]=useState("");
 useEffect(()=>{let active=true;Api.get(`crm/orders/${id}/`).then(({data})=>{if(active){setOrder(data);setNotes(data.production_notes||"");}}).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[id]);
 useEffect(()=>{Api.get("crm/options/",{params:{type:"order_cancellation_reason",active:true}}).then(({data})=>{const names=(data.results||data).map(x=>x.name);setCancelReasons(names.length?names:cancellationReasonExamples);}).catch(()=>{});},[]);
 const legacy=displayStatus(order?.status),definition=crmWorkflowV1.entities.order;
 const availableActions=useMemo(()=>{const key=legacy==="Confirmed"?"start_processing":legacy==="Processing"?"mark_ready":legacy==="Ready"?"generate_invoice":legacy==="Invoice Pending"?"open_invoice":null;return key?definition.transitions.filter(item=>item.key===key):[];},[definition.transitions,legacy]);
 const crumbs=(current)=>[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Orders",href:"/crm/orders"},{label:current}];
 if(loading)return <DetailPageTemplate title="Order workspace" subtitle="Loading operational information" breadcrumbs={crumbs("Order workspace")}><SkeletonCards count={5}/></DetailPageTemplate>;
 if(failed||!order)return <DetailPageTemplate title="Order workspace" subtitle="The order could not be loaded" breadcrumbs={crumbs("Order workspace")}><EmptyState title="Order unavailable" description="Return to Orders and try opening this record again." action={<SecondaryButton onClick={()=>navigate("/crm/orders")}>Back to orders</SecondaryButton>}/></DetailPageTemplate>;
 const action=async name=>{setBusy(true);try{if(notes!==order.production_notes)await Api.patch(`crm/orders/${id}/`,{production_notes:notes});const {data}=await Api.post(`crm/orders/${id}/workflow-action/`,{action:name});setOrder(data);setNotes(data.production_notes||notes);ShowNotification("success",name==="start_processing"?"Order processing started":"Order marked ready");}catch(exception){ShowNotification("error",exception.response?.data?.message||"Order could not be updated");}finally{setBusy(false);}};
 const invoice=async()=>{setBusy(true);try{const {data}=await Api.post(`crm/orders/${id}/generate-invoice/`);ShowNotification("success",data.message);navigate(`/crm/invoices/${data.data.id}`);}catch(exception){ShowNotification("error",exception.response?.data?.message||"Invoice could not be generated");}finally{setBusy(false);}};
 const onAction=item=>item.key==="generate_invoice"||item.key==="open_invoice"?invoice():action(item.key);
 const saveNotes=()=>{if(notes!==order.production_notes)Api.patch(`crm/orders/${id}/`,{production_notes:notes}).then(({data})=>setOrder(data)).catch(()=>ShowNotification("error","Operational notes could not be saved"));};
 const isCancelled=order.status==="Cancelled",canCancel=!uncancellableStatuses.includes(order.status);
 const submitCancel=async()=>{
  if(!cancelModal.reason.trim()){setModalError("A cancellation reason is required.");return;}
  setBusy(true);setModalError("");
  try{
   const {data}=await Api.post(`crm/orders/${id}/workflow-action/`,{action:"cancel_order",cancellation_reason:cancelModal.reason});
   setOrder(data);setCancelModal(null);
   ShowNotification("success","Order cancelled");
  }catch(exception){setModalError(exception.response?.data?.message||Object.values(exception.response?.data||{}).flat().join(" · ")||"The order could not be cancelled");}
  finally{setBusy(false);}
 };
 const itemColumns=[{key:"item",header:"Cake / Product",render:row=>row.item_name},{key:"description",header:"Preparation details",render:row=>row.description||"—"},{key:"flavour",header:"Flavour",render:row=>row.flavour||"—"},{key:"weight",header:"Weight",render:row=>row.weight||"—"},{key:"quantity",header:"Qty"},{key:"amount",header:"Amount",align:"right",render:row=>formatMoney(row.amount)}];
 const timeline=(order.timeline||[]).map(row=>({id:row.id,title:row.action,note:row.description,actor:row.staff_name,time:new Date(row.created_on).toLocaleString("en-IN")}));
 const actions=<WorkflowActionBar actions={availableActions} record={order} onAction={onAction} busyAction={busy?availableActions[0]?.key:undefined} emptyMessage="This order has transferred to the next workflow module."/>;
 return <DetailPageTemplate title={order.order_no} subtitle={`Bakery operations workspace · ${order.quotation_no}`} breadcrumbs={crumbs(order.order_no)} status={<StatusBadge tone={legacy==="Ready"?"success":legacy==="Processing"?"warning":"info"}>{legacy}</StatusBadge>} secondaryActions={<><SecondaryButton onClick={()=>navigate("/crm/orders")}>Back to orders</SecondaryButton>{canCancel&&<Button variant="danger" onClick={()=>{setModalError("");setCancelModal({preset:"",reason:""});}}>Cancel Order</Button>}</>} workflow={<WorkflowProgress definition={definition} record={order}/>} aside={<WorkspaceSummary title={order.customer_name} items={[{label:"Order",value:order.order_no},{label:"Status",value:legacy},{label:"Event",value:formatDate(order.event_date)},{label:"Advance",value:formatMoney(order.advance_paid)},{label:"Balance",value:formatMoney(order.balance_amount),emphasis:true},{label:"Delivery",value:formatDate(order.delivery_date||order.event_date)}]}/>} footer={actions}>
  {isCancelled&&<SectionCard title="Cancellation" description="This order was cancelled and is read-only."><ResponsiveGrid><GridItem span={4}><Info label="Cancelled on" value={order.cancelled_at?new Date(order.cancelled_at).toLocaleString("en-IN"):"—"}/></GridItem><GridItem span={4}><Info label="Cancelled by" value={order.cancelled_by_name||"—"}/></GridItem><GridItem span={4}><Info label="Reason" value={order.cancellation_reason}/></GridItem></ResponsiveGrid></SectionCard>}
  <ResponsiveGrid equalHeight>
   <GridItem span={4}><SectionCard title="Order summary"><Info label="Order number" value={order.order_no}/><Info label="Customer" value={order.customer_name}/><Info label="Event date" value={formatDate(order.event_date)}/><Info label="Required delivery date" value={formatDate(order.delivery_date||order.event_date)}/></SectionCard></GridItem>
   <GridItem span={4}><SectionCard title="Payment status"><Info label="Current stage" value={legacy}/><Info label="Advance paid" value={formatMoney(order.advance_paid)}/><Info label="Balance remaining" value={formatMoney(order.balance_amount)}/></SectionCard></GridItem>
   <GridItem span={4}><SectionCard title="Customer"><CustomerSummaryPanel customer={{name:order.customer_name,phone:order.phone,address:order.delivery_address}} fields={[{key:"phone",label:"Phone"},{key:"address",label:"Delivery address",wide:true}]}/></SectionCard></GridItem>
  </ResponsiveGrid>
  <SectionCard title="Delivery planning" description="Operational delivery information for bakery and fulfilment staff."><ResponsiveGrid><GridItem span={3}><Info label="Delivery method" value={order.delivery_method||order.delivery_type}/></GridItem><GridItem span={3}><Info label="Delivery date" value={formatDate(order.delivery_date||order.event_date)}/></GridItem><GridItem span={3}><Info label="Delivery time" value={formatTime(order.delivery_time)}/></GridItem><GridItem span={3}><Info label="Assigned delivery staff" value={order.assigned_delivery_staff_name||order.delivery_staff_name}/></GridItem><GridItem span={12}><Info label="Delivery address" value={order.delivery_address}/></GridItem></ResponsiveGrid></SectionCard>
  <SectionCard title="Cake preparation" description="Confirmed commercial items available to bakery staff."><DataTable ariaLabel="Order preparation items" columns={itemColumns} rows={order.items||[]} emptyTitle="No order items found" emptyDescription="The confirmed quotation did not return item details."/>{order.reference_images?.length>0&&<ResponsiveGrid>{order.reference_images.map(image=><GridItem span={4} key={image.id}><SectionCard title="Reference image"><span>{image.original_name}</span></SectionCard></GridItem>)}</ResponsiveGrid>}</SectionCard>
  <SectionCard title="Internal operational notes" description={isCancelled?"This order is cancelled and its notes are read-only.":"Notes save using the existing order update endpoint when focus leaves the field."}><TextField fullWidth multiline minRows={4} label="Operational notes" value={notes} disabled={isCancelled} onChange={event=>setNotes(event.target.value)} onBlur={saveNotes}/></SectionCard>
  <SectionCard title="Activity" description="Operational events grouped for quick scanning."><ActivityTimeline items={timeline} emptyMessage="Processing, readiness and invoice events will appear here."/></SectionCard>
  <Modal open={Boolean(cancelModal)} onClose={()=>setCancelModal(null)} title="Cancel this order" footer={<><SecondaryButton onClick={()=>setCancelModal(null)}>Keep order</SecondaryButton><Button variant="danger" disabled={busy} onClick={submitCancel}>Cancel Order</Button></>}>
   {modalError&&<div className="crm-error" role="alert">{modalError}</div>}
   {cancelModal&&<><p className="crm-muted">This order will be marked Cancelled. It is not deleted and stays visible in the Order list.</p>
   <Field label="Cancellation reason" required><SelectInput value={cancelModal.preset} onChange={e=>{const value=e.target.value;setCancelModal({preset:value,reason:value==="__other__"?"":value});}}><option value="">Select a reason</option>{cancelReasons.map(reason=><option key={reason} value={reason}>{reason}</option>)}<option value="__other__">Other (specify)</option></SelectInput></Field>
   {cancelModal.preset==="__other__"&&<Field label="Custom reason" required><TextInput autoFocus value={cancelModal.reason} onChange={e=>setCancelModal({...cancelModal,reason:e.target.value})}/></Field>}</>}
  </Modal>
 </DetailPageTemplate>;
}
