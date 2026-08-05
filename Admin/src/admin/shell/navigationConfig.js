export const navigationGroups = [
  { key:"home", routeKey:"home" },
  { key:"crm", label:"CRM", routeKey:"crm", children:["crm-overview","crm-leads","crm-quotations","crm-orders","crm-invoices","crm-delivery","crm-settings"] },
  { key:"crm-customers", label:"Customers", routeKey:"crm-customers" },
  { key:"website", label:"Website Management", children:[
    "products",{ key:"website-master", label:"Master", children:["categories","sub_categories","item","unit","sub-unit","tags"] },
    "gallery","offers","banner","events","event_orders","feedback"
  ]},
  { key:"operations", label:"Operations", children:["delivery_person"] },
  { key:"reports", label:"Reports & Analytics", routeKey:"reports", children:["reports-home"] },
  { key:"configuration-group", label:"Configuration", children:["configuration","terms_conditions"] },
  { key:"help", label:"Help", children:["admin-manual"] },
];

export const routeParents = {
  "crm-lead-follow-ups":"crm-leads","crm-lead-create":"crm-leads","crm-lead-edit":"crm-leads","crm-lead-details":"crm-leads",
  "crm-customer-details":"crm-customers","crm-quotation-new":"crm-quotations","crm-quotation-details":"crm-quotations","crm-quotation-edit":"crm-quotations",
  "crm-order-details":"crm-orders","crm-invoice-details":"crm-invoices","crm-delivery-details":"crm-delivery",
};

export const quickActionConfig = [
  { key:"new-lead", label:"New Lead", routeKey:"crm-lead-create" },
  { key:"new-quotation", label:"New Quotation", routeKey:"crm-quotation-new" },
  { key:"manual-order", label:"Manual Order", routeKey:"manual-order" },
  { key:"new-product", label:"New Product", routeKey:"products", intent:"open-create" },
  { key:"customer", label:"Customer", routeKey:"crm-customers" },
  { key:"banner", label:"Banner", routeKey:"banner", intent:"open-create" },
  { key:"delivery-person", label:"Delivery Person", routeKey:"delivery_person", intent:"open-create" },
];

export const routeAliases = {
  "crm-overview":["crm home","crm dashboard","sales dashboard"],"crm-orders":["confirmed orders","bakery orders"],orders:["online orders","website orders"],
  delivery_person:["delivery staff"],"crm-settings":["crm configuration"],products:["cakes","catalogue"],
};

export const routeLabelOverrides = {
  "reports-home":"Reports & Analytics",
  "crm-overview":"Home","crm-lead-follow-ups":"Follow-ups","crm-lead-create":"New Lead","crm-lead-edit":"Edit Lead","crm-lead-details":"Lead Details",
  "crm-customer-details":"Customer Details","crm-quotation-new":"New Quotation","crm-quotation-details":"Quotation Details","crm-quotation-edit":"Edit Quotation",
  "crm-order-details":"Order Details","crm-invoice-details":"Invoice Details","crm-delivery-details":"Delivery Details",
  purchase:"Purchases",delivery_person:"Delivery Persons",event_orders:"Event Orders",feedback:"Feedback",configuration:"General Configuration",terms_conditions:"Terms & Conditions",
  "crm-settings":"Configuration",
};
