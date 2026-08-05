import React,{useContext,useEffect,useMemo,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import logo from "../../../assets/img/tcc-logo.png";
import {buildInvoicePdf} from "./invoicePdf";
import {DetailPageTemplate} from "../../../admin/templates";
import {ActivityTimeline,CustomerSummaryPanel,WorkflowActionBar,WorkflowProgress,WorkspaceSummary} from "../../../admin/workflow";
import {crmWorkflowV1} from "../../../admin/workflow/config/v1";
import {DataTable,EmptyState,GridItem,ResponsiveGrid,SectionCard,SecondaryButton,SkeletonCards,StatusBadge as DesignStatusBadge,formatDate,formatMoney} from "../../../admin/design-system";
import {crmStatusTone} from "../crmPresentation";
import {Info} from "../shared";
import PaymentModal from "../shared/PaymentModal";
import "../crm.scss";

const methods=["Cash","Google Pay","PhonePe","Paytm","Card","Bank Transfer","Other UPI","Other"];
const StatusBadge=({children})=><DesignStatusBadge tone={crmStatusTone(children)}>{children}</DesignStatusBadge>;

export default function InvoiceDetails(){
 const {id}=useParams(),navigate=useNavigate(),{ShowNotification}=useContext(MainContext),[invoice,setInvoice]=useState(),[payment,setPayment]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;Api.get(`crm/invoices/${id}/`).then(({data})=>active&&setInvoice(data)).catch(()=>active&&setFailed(true)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[id]);
 const definition=crmWorkflowV1.entities.invoice,balance=Number(invoice?.balance_amount),paid=invoice?.status==="Paid";
 const availableActions=useMemo(()=>{if(["Closed","Completed"].includes(invoice?.status))return[];const key=balance>0?"record_payment":!paid?"payment_completed":"move_to_delivery";return definition.transitions.filter(item=>item.key===key);},[balance,definition.transitions,invoice?.status,paid]);
 const crumbs=(current)=>[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Invoices",href:"/crm/invoices"},{label:current}];
 if(loading)return <DetailPageTemplate title="Invoice workspace" subtitle="Loading financial information" breadcrumbs={crumbs("Invoice workspace")}><SkeletonCards count={5}/></DetailPageTemplate>;
 if(failed||!invoice)return <DetailPageTemplate title="Invoice workspace" subtitle="The invoice could not be loaded" breadcrumbs={crumbs("Invoice workspace")}><EmptyState title="Invoice unavailable" description="Return to Invoices and try opening the record again." action={<SecondaryButton onClick={()=>navigate("/crm/invoices")}>Back to invoices</SecondaryButton>}/></DetailPageTemplate>;
 const imageData=async()=>{const blob=await fetch(logo).then(response=>response.blob());return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});};
 const pdf=async()=>buildInvoicePdf(invoice,await imageData());
 const preview=async()=>window.open((await pdf()).output("bloburl"),"_blank");
 const download=async()=>(await pdf()).save(`${invoice.invoice_no.replaceAll("/","-")}.pdf`);
 const collect=async()=>{const body=new FormData();Object.entries(payment).forEach(([key,value])=>value!==""&&value!==null&&body.append(key,value));try{const {data}=await Api.post(`crm/invoices/${id}/record-payment/`,body);setInvoice(data);setPayment(null);ShowNotification("success","Balance payment recorded");}catch(exception){ShowNotification("error",Object.values(exception.response?.data||{}).flat().join(" · ")||"Payment could not be recorded");}};
 const completePayment=async()=>{setBusy(true);try{const {data}=await Api.post(`crm/invoices/${id}/payment-completed/`);setInvoice(data);ShowNotification("success","Payment completed");}catch(exception){ShowNotification("error",exception.response?.data?.message||"Payment cannot be completed");}finally{setBusy(false);}};
 const delivery=async()=>{setBusy(true);try{const {data}=await Api.post(`crm/invoices/${id}/move-to-delivery/`);ShowNotification("success",data.message);navigate(`/crm/delivery/${data.data.id}`);}catch(exception){ShowNotification("error",exception.response?.data?.message||"Cannot move to Delivery");}finally{setBusy(false);}};
 const openPayment=()=>setPayment({amount:invoice.balance_amount,payment_method:"",payment_date:new Date().toISOString().slice(0,10),transaction_reference:"",customer_remarks:"",proof:null});
 const onAction=item=>item.key==="record_payment"?openPayment():item.key==="payment_completed"?completePayment():delivery();
 const itemColumns=[{key:"item",header:"Item",render:row=>row.item_name},{key:"description",header:"Description",render:row=>row.description||"—"},{key:"quantity",header:"Qty"},{key:"rate",header:"Rate",render:row=>formatMoney(row.rate)},{key:"gst",header:"GST",render:row=>`${row.gst_percentage||0}%`},{key:"amount",header:"Amount",align:"right",render:row=>formatMoney(row.amount)}];
 const paymentColumns=[{key:"amount",header:"Amount",render:row=><strong>{formatMoney(row.amount)}</strong>},{key:"method",header:"Payment method",render:row=>row.payment_method},{key:"date",header:"Payment date",render:row=>formatDate(row.payment_date)},{key:"staff",header:"Collected by",render:row=>row.collected_by_name||"—"},{key:"proof",header:"Proof",align:"right",render:row=>row.proof?<a href={row.proof} target="_blank" rel="noreferrer">View proof</a>:"—"}];
 const timeline=(invoice.timeline||[]).map(row=>({id:row.id,title:row.action,note:row.description,actor:row.staff_name,time:new Date(row.created_on).toLocaleString("en-IN")}));
 const actions=<WorkflowActionBar actions={availableActions} record={invoice} onAction={onAction} busyAction={busy?availableActions[0]?.key:undefined} emptyMessage="Financial settlement is complete and responsibility has moved to Delivery."/>;
 const secondary=<><SecondaryButton onClick={()=>navigate("/crm/invoices")}>Back</SecondaryButton><SecondaryButton onClick={preview}>Preview invoice</SecondaryButton><SecondaryButton onClick={download}>Download PDF</SecondaryButton><SecondaryButton onClick={()=>window.print()}>Print</SecondaryButton></>;
 return <DetailPageTemplate title={invoice.invoice_no} subtitle={`Financial settlement · Order ${invoice.order_no}`} breadcrumbs={crumbs(invoice.invoice_no)} status={<StatusBadge tone={paid?"success":"warning"}>{invoice.status}</StatusBadge>} secondaryActions={secondary} workflow={<WorkflowProgress definition={definition} record={invoice}/>} aside={<WorkspaceSummary title={invoice.customer_name} items={[{label:"Invoice",value:invoice.invoice_no},{label:"Order",value:invoice.order_no},{label:"Status",value:invoice.status},{label:"Grand total",value:formatMoney(invoice.total_amount),emphasis:true},{label:"Paid",value:formatMoney(invoice.amount_paid)},{label:"Balance",value:formatMoney(invoice.balance_amount),emphasis:true},{label:"Delivery",value:formatDate(invoice.delivery_date)}]}/>} footer={actions}>
  <ResponsiveGrid equalHeight>
   <GridItem span={6}><SectionCard title="Customer"><CustomerSummaryPanel customer={{name:invoice.customer_name,phone:invoice.phone,email:invoice.email,address:invoice.address||invoice.delivery_address}}/></SectionCard></GridItem>
   <GridItem span={6}><SectionCard title="Order summary"><Info label="Order" value={invoice.order_no}/><Info label="Invoice generated" value={formatDate(invoice.generated_on)}/><Info label="Event date" value={formatDate(invoice.event_date)}/><Info label="Delivery date" value={formatDate(invoice.delivery_date)}/></SectionCard></GridItem>
  </ResponsiveGrid>
  <SectionCard title="Final commercial details"><DataTable ariaLabel="Invoice items" columns={itemColumns} rows={invoice.items||[]} emptyTitle="No invoice items found" emptyDescription="The source Order did not return item details."/></SectionCard>
  <SectionCard title="Payment summary" description="Authoritative settlement position for this customer invoice."><ResponsiveGrid><GridItem span={4}><Info label="Subtotal" value={formatMoney(invoice.subtotal)}/></GridItem><GridItem span={4}><Info label="GST" value={formatMoney(invoice.gst_amount)}/></GridItem><GridItem span={4}><Info label="Invoice total" value={formatMoney(invoice.total_amount)}/></GridItem><GridItem span={6}><Info label="Amount paid" value={formatMoney(invoice.amount_paid)}/></GridItem><GridItem span={6}><Info label="Balance due" value={formatMoney(invoice.balance_amount)}/></GridItem></ResponsiveGrid></SectionCard>
  <SectionCard title="Payment history" description="Customer payments recorded against this invoice."><DataTable ariaLabel="Invoice payment history" columns={paymentColumns} rows={invoice.payments||[]} emptyTitle="No invoice payments recorded" emptyDescription="Balance payments will appear here after collection."/></SectionCard>
  <SectionCard title="Financial activity"><ActivityTimeline items={timeline} emptyMessage="Payment and Delivery handoff events will appear here."/></SectionCard>
  <PaymentModal open={Boolean(payment)} title="Collect balance payment" payment={payment} setPayment={setPayment} methods={methods} onClose={()=>setPayment(null)} onSubmit={collect} submitLabel="Record payment"/>
 </DetailPageTemplate>;
}
