export const statusMetadata=Object.freeze({
  Open:{label:"Open",tone:"info"},"Follow-up":{label:"Follow-up",tone:"warning"},Won:{label:"Won",tone:"success"},Lost:{label:"Lost",tone:"danger",terminal:true},Completed:{label:"Completed",tone:"success",terminal:true},
  Draft:{label:"Draft",tone:"neutral"},Sent:{label:"Sent / Shared",tone:"info"},Accepted:{label:"Accepted",tone:"success"},"Advance Received":{label:"Advance Received",tone:"success"},"Order Confirmed":{label:"Order Confirmed",tone:"success",terminal:true},Rejected:{label:"Rejected",tone:"danger",terminal:true},Expired:{label:"Expired",tone:"warning",terminal:true},Cancelled:{label:"Cancelled",tone:"danger",terminal:true},Closed:{label:"Closed",tone:"success",terminal:true},
  Confirmed:{label:"Confirmed",tone:"info"},Production:{label:"Production",tone:"warning",legacyAlias:"Processing"},Processing:{label:"Processing",tone:"warning"},Ready:{label:"Ready",tone:"success"},"Out for Delivery":{label:"Out for Delivery",tone:"info"},"Invoice Generated":{label:"Invoice Generated",tone:"info",legacyAlias:"Invoice Pending"},"Invoice Pending":{label:"Invoice Pending",tone:"warning"},Delivery:{label:"Delivery",tone:"info"},Delivered:{label:"Delivered",tone:"success"},
  Generated:{label:"Generated",tone:"info"},Issued:{label:"Issued",tone:"info"},Paid:{label:"Paid",tone:"success"},
  Pending:{label:"Pending",tone:"warning"},"In Progress":{label:"In Progress",tone:"info"},
});

export const metaForStatus=status=>statusMetadata[status]||{label:status||"Unknown",tone:"neutral"};
