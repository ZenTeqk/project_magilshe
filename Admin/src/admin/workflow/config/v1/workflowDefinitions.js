import { statusMetadata } from "./statusMetadata";

const action=(key,label,from,to,extra={})=>({key,label,from,to,...extra});
const required=(fields,when)=>({type:"required",fields,when});

export const crmWorkflowV1=Object.freeze({
  version:"1.0.0",
  sourceOfTruth:"API-Server/crm models, serializers and viewset actions",
  entities:{
    lead:{
      label:"Lead",statusField:"status",initialStatus:"Open",
      stages:[{key:"open",label:"Open",statuses:["Open"]},{key:"follow_up",label:"Follow-up",statuses:["Follow-up"]},{key:"won",label:"Won",statuses:["Won"]},{key:"quotation",label:"Quotation",derivedFrom:"quotation_id"},{key:"completed",label:"Completed",statuses:["Completed"]}],
      statuses:["Open","Follow-up","Won","Lost","Completed"],
      transitions:[
        action("schedule_follow_up","Schedule Follow-up",["Open"],"Follow-up",{transport:{method:"PATCH",path:"crm/leads/:id/"},primary:true,validation:[required(["follow_up_date","follow_up_notes"])]}),
        action("mark_won","Mark Won",["Open","Follow-up"],"Won",{transport:{method:"PATCH",path:"crm/leads/:id/"},primary:true,validation:[required(["winning_reason"])]}),
        action("mark_lost","Mark Lost",["Open","Follow-up"],"Lost",{transport:{method:"PATCH",path:"crm/leads/:id/"},validation:[required(["loss_reason"])]}),
        action("generate_quotation","Generate Quotation",["Won"],null,{transport:{method:"POST",path:"crm/leads/:id/convert/"},primary:true,guard:{field:"quotation_id",empty:true},creates:"quotation"}),
      ],
      systemTransitions:[{from:"Won",to:"Completed",cause:"delivery.completed",event:"Workflow Closed"}],
      validation:[required(["customer_name","phone","occasion","event_date","cake_type","quantity"]),{type:"phone",field:"phone",digits:10},{type:"notPast",field:"event_date"},{type:"positive",field:"quantity"}],
      timelineEvents:["Lead Created","Lead Edited","Status Changed","Follow-up Note","Follow-up Completed","Quotation Created","Reference Images Added","Reference Image Removed","Lead Imported","Workflow Closed"],
    },
    quotation:{
      label:"Quotation",statusField:"status",initialStatus:"Draft",
      stages:[{key:"draft",label:"Draft",statuses:["Draft"]},{key:"sent",label:"Sent / Shared",statuses:["Sent"]},{key:"accepted",label:"Accepted",statuses:["Accepted"]},{key:"advance",label:"Advance Received",statuses:["Advance Received"]},{key:"confirmed",label:"Order Confirmed",statuses:["Order Confirmed"]}],
      statuses:["Draft","Sent","Accepted","Advance Received","Order Confirmed","Rejected","Expired","Cancelled","Closed"],
      transitions:[
        action("send","Send / Mark Shared",["Draft"],"Sent",{transport:{method:"POST",path:"crm/quotations/:id/workflow-action/",body:{action:"send"}},primary:true,event:"Quotation Sent"}),
        action("accept","Accept",["Sent"],"Accepted",{transport:{method:"POST",path:"crm/quotations/:id/workflow-action/",body:{action:"accept"}},primary:true,event:"Quotation Accepted"}),
        action("record_advance","Record Advance",["Accepted","Advance Received"],"Advance Received",{exposedFrom:["Accepted"],transport:{method:"POST",path:"crm/quotations/:id/record-payment/"},primary:true,validation:[{type:"positive",field:"amount"},{type:"maxRemaining",field:"amount",totalField:"total_amount",paidField:"advance_amount"}],event:"Advance Payment Recorded"}),
        action("confirm_order","Confirm Order",["Advance Received","Order Confirmed"],"Order Confirmed",{exposedFrom:["Advance Received"],transport:{method:"POST",path:"crm/quotations/:id/confirm-order/"},primary:true,guard:{all:[{field:"advance_received",equals:true},{field:"advance_amount",greaterThan:0}]},creates:"order",event:"Order Confirmed",idempotent:true}),
        action("open_order","Open Order",["Order Confirmed"],null,{transport:{method:"POST",path:"crm/quotations/:id/confirm-order/"},primary:true,navigation:"response.data.id",idempotent:true}),
        action("cancel","Cancel Quotation",["Draft","Sent","Accepted"],"Cancelled",{transport:{method:"POST",path:"crm/quotations/:id/workflow-action/",body:{action:"cancel"}},tone:"danger",event:"Quotation Cancelled",exposed:false}),
      ],
      systemTransitions:[{from:"Order Confirmed",to:"Closed",cause:"delivery.completed",event:"Workflow Closed"}],
      validation:[{type:"wonLead",field:"lead"},{type:"phone",field:"phone",digits:10,optional:true},{type:"nonNegative",fields:["quantity","rate","gst_percentage","advance_amount"]},{type:"positiveIfPresent",field:"quantity"},{type:"notGreaterThan",field:"advance_amount",otherField:"total_amount"},{type:"manualRequired",fields:["customer_name","phone"],itemFallbackFields:["cake_type","quantity","rate"]}],
      timelineEvents:["Quotation Created","Quotation Sent","Quotation Accepted","Quotation Cancelled","Advance Payment Recorded","Order Confirmed","Order Payment Recorded","Invoice Generated","Invoice Payment Recorded","Payment Completed","Moved to Delivery","Delivery Started","Delivered Successfully","Workflow Closed"],
    },
    order:{
      label:"Order",statusField:"status",initialStatus:"Confirmed",creation:"quotation.confirm_order",
      stages:[{key:"confirmed",label:"Confirmed Order",statuses:["Confirmed"]},{key:"processing",label:"Processing",statuses:["Production","Processing"]},{key:"ready",label:"Ready",statuses:["Ready"]},{key:"invoice",label:"Invoice Pending",statuses:["Invoice Pending","Invoice Generated"]},{key:"delivery",label:"Delivery",statuses:["Delivery","Out for Delivery","Delivered"]},{key:"complete",label:"Completed",statuses:["Completed","Closed"]}],
      statuses:["Confirmed","Production","Processing","Ready","Out for Delivery","Invoice Generated","Invoice Pending","Delivery","Closed","Delivered","Completed","Cancelled"],
      transitions:[
        action("start_processing","Start Processing",["Confirmed","Production"],"Processing",{transport:{method:"POST",path:"crm/orders/:id/workflow-action/",body:{action:"start_processing"}},primary:true,event:"Order Processing"}),
        action("mark_ready","Mark Ready",["Processing"],"Ready",{transport:{method:"POST",path:"crm/orders/:id/workflow-action/",body:{action:"mark_ready"}},primary:true,event:"Order Ready"}),
        action("generate_invoice","Move to Invoice",["Ready","Invoice Pending","Invoice Generated"],"Invoice Pending",{exposedFrom:["Ready"],transport:{method:"POST",path:"crm/orders/:id/generate-invoice/"},primary:true,creates:"invoice",event:"Invoice Generated",idempotent:true}),
        action("open_invoice","Open Invoice",["Invoice Pending","Invoice Generated"],null,{transport:{method:"POST",path:"crm/orders/:id/generate-invoice/"},primary:true,navigation:"response.data.id",idempotent:true}),
        action("record_payment","Record Payment",["Confirmed","Production","Processing","Ready","Out for Delivery","Invoice Generated","Invoice Pending","Delivery","Closed","Delivered","Completed","Cancelled"],null,{transport:{method:"POST",path:"crm/orders/:id/record-payment/"},validation:[{type:"positiveBalanceAmount",field:"amount",balanceField:"balance_amount"}],event:"Order Payment Recorded"}),
        action("dispatch_delivery","Dispatch Delivery",["Invoice Generated","Out for Delivery"],"Delivery",{transport:{method:"POST",path:"crm/orders/:id/workflow-action/",body:{action:"dispatch_delivery"}},validation:[required(["recipient_name","recipient_phone","delivery_address","delivery_date","delivery_time","delivery_method"])],event:"Order Delivery",exposed:false}),
        action("complete_delivery","Complete Delivery",["Delivery","Out for Delivery","Delivered"],"Completed",{transport:{method:"POST",path:"crm/orders/:id/workflow-action/",body:{action:"complete_delivery"}},guard:{field:"balance_amount",equalsNumber:0},event:"Order Completed",exposed:false}),
        action("cancel_order","Cancel Order",["Confirmed","Production","Processing","Ready","Invoice Pending","Invoice Generated"],"Cancelled",{transport:{method:"POST",path:"crm/orders/:id/workflow-action/",body:{action:"cancel_order"}},validation:[required(["cancellation_reason"])],tone:"danger",event:"Order Cancelled",exposed:false}),
      ],
      systemTransitions:[{from:"Invoice Pending",to:"Delivery",cause:"invoice.move_to_delivery"},{from:"Delivery",to:"Closed",cause:"delivery.completed"}],
      validation:[{type:"serverCreatedOnly",message:"Orders are created by confirming a quotation."},required(["recipient_name","recipient_phone","delivery_address","delivery_date","delivery_time","delivery_method"],{action:"dispatch_delivery"}),{type:"zeroBalance",field:"balance_amount",when:{action:"complete_delivery"}}],
      timelineEvents:["Order Confirmed","Order Processing","Order Ready","Order Payment Recorded","Invoice Generated","Moved to Delivery","Order Cancelled","Workflow Closed"],
    },
    invoice:{
      label:"Invoice",statusField:"status",initialStatus:"Generated",creation:"order.generate_invoice",
      stages:[{key:"generated",label:"Invoice Generated",statuses:["Generated","Issued"]},{key:"collected",label:"Balance Collected",derivedWhen:{field:"balance_amount",equalsNumber:0}},{key:"paid",label:"Payment Completed",statuses:["Paid"]},{key:"delivery",label:"Move to Delivery",derivedFrom:"delivery_id"}],
      statuses:["Generated","Issued","Paid","Closed"],
      transitions:[
        action("record_payment","Collect Balance",["Generated","Issued","Paid"],null,{transport:{method:"POST",path:"crm/invoices/:id/record-payment/"},primary:true,guard:{field:"balance_amount",greaterThan:0},validation:[{type:"positiveBalanceAmount",field:"amount",balanceField:"balance_amount"}],event:"Invoice Payment Recorded"}),
        action("payment_completed","Payment Completed",["Generated","Issued","Paid"],"Paid",{exposedFrom:["Generated","Issued"],transport:{method:"POST",path:"crm/invoices/:id/payment-completed/"},primary:true,guard:{field:"balance_amount",equalsNumber:0},event:"Payment Completed",idempotent:true}),
        action("move_to_delivery","Move to Delivery",["Paid"],null,{transport:{method:"POST",path:"crm/invoices/:id/move-to-delivery/"},primary:true,guard:{field:"balance_amount",equalsNumber:0},creates:"delivery",event:"Moved to Delivery",idempotent:true}),
      ],
      systemTransitions:[{from:"Paid",to:"Paid",cause:"delivery.completed"}],
      validation:[{type:"serverCreatedOnly",message:"Invoices are generated from Orders."}],
      timelineEvents:["Invoice Generated","Invoice Payment Recorded","Payment Completed","Moved to Delivery","Workflow Closed"],
    },
    delivery:{
      label:"Delivery",statusField:"status",initialStatus:"Pending",creation:"invoice.move_to_delivery",
      stages:[{key:"pending",label:"Pending",statuses:["Pending"]},{key:"in_progress",label:"In Progress",statuses:["In Progress"]},{key:"completed",label:"Completed",statuses:["Completed"]}],
      statuses:["Pending","In Progress","Completed"],
      transitions:[
        action("start","Start Delivery",["Pending"],"In Progress",{transport:{method:"POST",path:"crm/deliveries/:id/workflow-action/",body:{action:"start"}},primary:true,validation:[required(["address"],{field:"method",equals:"Home Delivery"})],event:"Delivery Started"}),
        action("complete","Complete Delivery",["In Progress"],"Completed",{transport:{method:"POST",path:"crm/deliveries/:id/workflow-action/",body:{action:"complete"}},primary:true,event:"Delivered Successfully",cascade:["order:Closed","quotation:Closed","lead:Completed"]}),
      ],
      validation:[{type:"serverCreatedOnly",message:"Deliveries are created from paid invoices."}],
      timelineEvents:["Moved to Delivery","Delivery Started","Delivered Successfully","Workflow Closed"],
    },
  },
  statusMetadata,
});

export default crmWorkflowV1;
