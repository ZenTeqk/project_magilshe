/**
 * Endpoint paths, relative to API_BASE_URL, matching Admin/src/components/crm/**
 * call sites exactly (no backend changes). Kept in one place so every later
 * module just imports from here instead of re-discovering URLs.
 */
export const endpoints = {
  auth: {
    login: "auth/login/",
    refresh: "api/token/refresh/",
    createManualCustomer: "auth/create-manual-customer/",
  },
  dashboard: {
    home: "dashboard/home/",
  },
  reports: {
    crmAnalytics: "reports/crm-analytics",
    orderReport: "reports/order-report",
    deliveryPersonReport: "reports/delivery-person-report",
    occasionReport: "reports/occasion-report",
  },
  configuration: {
    get: "configuration/get/",
    save: "configuration/save/",
    settings: "configuration/settings/",
    termsAndConditions: "configuration/terms-and-conditions/",
    privacyPolicy: "configuration/privacy-policy/",
  },
  crm: {
    leads: "crm/leads/",
    lead: (id: string | number) => `crm/leads/${id}/`,
    leadConvert: (id: string | number) => `crm/leads/${id}/convert/`,
    leadReferenceImages: (id: string | number) => `crm/leads/${id}/reference-images/`,
    leadReferenceImage: (id: string | number, imageId: string | number) =>
      `crm/leads/${id}/reference-images/${imageId}/`,
    crmDashboard: "crm/leads/crm-dashboard/",
    followUps: "crm/leads/follow-ups/",
    followUpNote: (id: string | number) => `crm/leads/${id}/follow-up-note/`,
    completeFollowUp: (id: string | number) => `crm/leads/${id}/complete-follow-up/`,
    leadImport: "crm/leads/import/",

    quotations: "crm/quotations/",
    quotationsPending: "crm/quotations/pending/",
    quotationCustomerSearch: "crm/quotations/customer-search/",
    quotationSaveCustomerAddress: "crm/quotations/save-customer-address/",
    quotation: (id: string | number) => `crm/quotations/${id}/`,
    quotationGenerateVersion: (id: string | number) => `crm/quotations/${id}/generate-version/`,
    quotationWorkflowAction: (id: string | number) => `crm/quotations/${id}/workflow-action/`,
    quotationRecordPayment: (id: string | number) => `crm/quotations/${id}/record-payment/`,
    quotationConfirmOrder: (id: string | number) => `crm/quotations/${id}/confirm-order/`,

    orders: "crm/orders/",
    orderDirect: "crm/orders/direct/",
    order: (id: string | number) => `crm/orders/${id}/`,
    orderGenerateInvoice: (id: string | number) => `crm/orders/${id}/generate-invoice/`,
    orderWorkflowAction: (id: string | number) => `crm/orders/${id}/workflow-action/`,
    orderRecordPayment: (id: string | number) => `crm/orders/${id}/record-payment/`,

    invoices: "crm/invoices/",
    invoice: (id: string | number) => `crm/invoices/${id}/`,
    invoiceRecordPayment: (id: string | number) => `crm/invoices/${id}/record-payment/`,
    invoicePaymentCompleted: (id: string | number) => `crm/invoices/${id}/payment-completed/`,
    invoiceMoveToDelivery: (id: string | number) => `crm/invoices/${id}/move-to-delivery/`,

    deliveries: "crm/deliveries/",
    delivery: (id: string | number) => `crm/deliveries/${id}/`,
    deliveryWorkflowAction: (id: string | number) => `crm/deliveries/${id}/workflow-action/`,
    deliveryDamageImages: (id: string | number) => `crm/deliveries/${id}/damage-images/`,

    customers: "crm/customers/",
    customerAnalytics: "crm/customers/analytics/",
    customer: (id: string | number) => `crm/customers/${id}/`,
    customerUpcomingEvents: "crm/customers/upcoming-events/",
    customerSendReminder: (id: string | number) => `crm/customers/${id}/send-reminder/`,

    customerEvents: "crm/customer-events/",
    customerEvent: (id: string | number) => `crm/customer-events/${id}/`,
    customerEventComplete: (id: string | number) => `crm/customer-events/${id}/complete/`,

    options: "crm/options/",
    option: (id: string | number) => `crm/options/${id}/`,
  },
  customer: {
    getAllData: "customer/get-all-data/",
    checkCustomer: "customer/check-customer/",
    myProfile: "customer/get-my-profile/",
    updateProfile: "customer/update-profile/",
  },
  rbac: {
    me: "customer/rbac/me/",
    users: "customer/rbac/users/",
    user: (id: string | number) => `customer/rbac/users/${id}/`,
    roles: "customer/rbac/roles/",
    role: (id: string | number) => `customer/rbac/roles/${id}/`,
    permissions: "customer/rbac/permissions/",
  },
  deliveryPerson: {
    get: "delivery-person/get/",
    create: "delivery-person/create/",
    staff: "delivery-person/management/staff/",
    staffDetail: (id: string | number) => `delivery-person/management/staff/${id}/`,
    staffPerformance: (id: string | number) => `delivery-person/management/staff/${id}/performance/`,
    platforms: "delivery-person/management/platforms/",
    platform: (id: string | number) => `delivery-person/management/platforms/${id}/`,
    partners: "delivery-person/management/partners/",
    partner: (id: string | number) => `delivery-person/management/partners/${id}/`,
    partnerPerformance: (id: string | number) => `delivery-person/management/partners/${id}/performance/`,
  },
  order: {
    getAllOrder: "order/get-all-order/", // Admin/src/components/orders/Orders.jsx
    statusUpdate: "order/status-update/",
    save: "order/save/",
    getCustomerOrder: "order/get-customer-order/",
  },
  cart: {
    addManualCart: "cart/add-manual-cart/",
  },
  purchase: {
    receivings: "purchase/receivings/",
    receiving: (id: string | number) => `purchase/receivings/${id}/`,
    bill: (id: string | number) => `purchase/receivings/bill/${id}/`,
  },
  testimonial: {
    feedback: "testimonial/feedback-message",
    feedbackItem: (id: string | number) => `testimonial/feedback-message/${id}`,
  },
  items: {
    products: "items/products",
    product: (id: string | number) => `items/products/${id}`,
    search: "items/search",
  },
  tax: {
    taxCategory: "tax/tax-category",
  },
  offer: {
    list: "cake/get-offer/",
    save: "cake/update-offer/",
    delete: (id: number | string) => `cake/delete-offer/${id}/`,
  },
  banner: {
    list: "banner/get-data",
    save: "banner/",
  },
  event: {
    list: "event/get-all-data",
    save: "event/",
    orders: "event/get-all-event-order",
    orderDetail: (id: number | string) => `event/get-individual-event-order/${id}`,
    updateOrderStatus: "event/update-status",
  },
  catalog: {
    tags: "tag/tags",
    units: "unit/item",
    subUnits: "kg/sub-unit",
    subUnit: (id: string | number) => `kg/sub-unit/${id}`,
    mainCategories: "category/main-category",
    subCategories: "category/sub-category",
    gallery: "gallery/get-gallery",
    galleryAdd: "gallery/add-gallery",
    galleryDelete: (id: string | number) => `gallery/delete-gallery/${id}`,
    cakes: "cake/get-cake-data/",
    cakeCreate: "cake/create/",
    cakeDelete: (id: string | number) => `cake/delete/${id}/`,
  },
} as const;
