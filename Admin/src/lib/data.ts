/**
 * Presentation-layer sample data. Shapes mirror the Magilshe Admin API
 * entities described in the functional specification so screens can be
 * wired to the existing backend without structural changes.
 */

import type { Tone } from "./status-tones";
export type { Tone } from "./status-tones";
export { statusTone } from "./status-tones";

export const leadStatuses = ["Open", "Follow-up", "Won", "Lost"] as const;
export const quotationStatuses = [
  "Draft",
  "Sent",
  "Accepted",
  "Advance Received",
  "Order Confirmed",
] as const;
export const orderStatuses = [
  "Confirmed",
  "Processing",
  "Ready",
  "Invoice Pending",
  "Closed",
  "Cancelled",
] as const;
export const invoiceStatuses = ["Generated", "Issued", "Paid", "Closed"] as const;
export const deliveryStatuses = [
  "Pending",
  "Out for Delivery",
  "Delivered Successfully",
  "Damaged During Delivery",
  "Delivery Failed",
] as const;
export const onlineOrderStatuses = [
  "Pending",
  "Order Placed",
  "Confirmed",
  "Preparing",
  "Ready",
  "Delivered",
  "Cancel Requested",
  "Cancelled",
  "Rejected",
] as const;

export const occasions = [
  "Birthday",
  "Marriage Anniversary",
  "Work Anniversary",
  "Wedding",
  "Baby Shower",
  "Others",
];
export const cakeTypes = ["Custom Theme", "Photo Cake", "Tier Cake", "Cupcakes", "Dessert Table"];
export const flavours = [
  "Belgian Chocolate",
  "Red Velvet",
  "Butterscotch",
  "Pistachio Rose",
  "Salted Caramel",
];

export type Lead = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  occasion: string;
  cakeType: string;
  flavour: string;
  qty: number;
  eventDate: string;
  status: (typeof leadStatuses)[number];
  source: string;
  budget: number;
  estimate: number;
  owner: string;
  created: string;
  city: string;
};

export const leads: Lead[] = [
  {
    id: "LD-2418",
    customer: "Aarthi Rangan",
    phone: "9840112233",
    email: "aarthi@zenmail.com",
    occasion: "Wedding",
    cakeType: "Tier Cake",
    flavour: "Pistachio Rose",
    qty: 1,
    eventDate: "2026-08-22",
    status: "Won",
    source: "Instagram",
    budget: 42000,
    estimate: 46500,
    owner: "Divya",
    created: "2026-07-28",
    city: "Chennai",
  },
  {
    id: "LD-2417",
    customer: "Kiran Textiles",
    phone: "9821004411",
    email: "orders@kirantex.in",
    occasion: "Work Anniversary",
    cakeType: "Custom Theme",
    flavour: "Belgian Chocolate",
    qty: 6,
    eventDate: "2026-08-14",
    status: "Follow-up",
    source: "Referral",
    budget: 18000,
    estimate: 21400,
    owner: "Naveen",
    created: "2026-07-30",
    city: "Coimbatore",
  },
  {
    id: "LD-2416",
    customer: "Meera Sundaram",
    phone: "9790556677",
    email: "meera.s@gmail.com",
    occasion: "Birthday",
    cakeType: "Photo Cake",
    flavour: "Red Velvet",
    qty: 2,
    eventDate: "2026-08-09",
    status: "Open",
    source: "Website",
    budget: 6500,
    estimate: 7200,
    owner: "Divya",
    created: "2026-08-02",
    city: "Chennai",
  },
  {
    id: "LD-2415",
    customer: "Hotel Vellore Grand",
    phone: "9445009812",
    email: "fnb@vellograND.com",
    occasion: "Others",
    cakeType: "Dessert Table",
    flavour: "Salted Caramel",
    qty: 12,
    eventDate: "2026-08-30",
    status: "Open",
    source: "Walk-in",
    budget: 96000,
    estimate: 104000,
    owner: "Rahul",
    created: "2026-08-03",
    city: "Vellore",
  },
  {
    id: "LD-2414",
    customer: "Sneha Iyer",
    phone: "9611223344",
    email: "sneha.iyer@fastmail.com",
    occasion: "Baby Shower",
    cakeType: "Cupcakes",
    flavour: "Butterscotch",
    qty: 48,
    eventDate: "2026-08-11",
    status: "Follow-up",
    source: "WhatsApp",
    budget: 9600,
    estimate: 11200,
    owner: "Naveen",
    created: "2026-07-25",
    city: "Bengaluru",
  },
  {
    id: "LD-2413",
    customer: "Prakash Motors",
    phone: "9500788221",
    email: "admin@prakashmotors.co",
    occasion: "Work Anniversary",
    cakeType: "Custom Theme",
    flavour: "Belgian Chocolate",
    qty: 3,
    eventDate: "2026-08-06",
    status: "Lost",
    source: "Cold call",
    budget: 12000,
    estimate: 15800,
    owner: "Rahul",
    created: "2026-07-18",
    city: "Madurai",
  },
  {
    id: "LD-2412",
    customer: "Divya Krishnan",
    phone: "9003344556",
    email: "divya.k@zenmail.com",
    occasion: "Marriage Anniversary",
    cakeType: "Tier Cake",
    flavour: "Red Velvet",
    qty: 1,
    eventDate: "2026-08-18",
    status: "Won",
    source: "Instagram",
    budget: 15000,
    estimate: 16400,
    owner: "Divya",
    created: "2026-07-21",
    city: "Chennai",
  },
  {
    id: "LD-2411",
    customer: "Anand Vidyalaya",
    phone: "9776655443",
    email: "office@anandvidya.edu",
    occasion: "Others",
    cakeType: "Cupcakes",
    flavour: "Butterscotch",
    qty: 120,
    eventDate: "2026-09-05",
    status: "Open",
    source: "Referral",
    budget: 24000,
    estimate: 27800,
    owner: "Rahul",
    created: "2026-08-04",
    city: "Salem",
  },
];

export type Quotation = {
  id: string;
  customer: string;
  eventDate: string;
  total: number;
  advance: number;
  status: (typeof quotationStatuses)[number];
  created: string;
  validUntil: string;
  owner: string;
};

export const quotations: Quotation[] = [
  {
    id: "QT-1092",
    customer: "Aarthi Rangan",
    eventDate: "2026-08-22",
    total: 46500,
    advance: 20000,
    status: "Advance Received",
    created: "2026-07-29",
    validUntil: "2026-08-12",
    owner: "Divya",
  },
  {
    id: "QT-1091",
    customer: "Divya Krishnan",
    eventDate: "2026-08-18",
    total: 16400,
    advance: 16400,
    status: "Order Confirmed",
    created: "2026-07-24",
    validUntil: "2026-08-05",
    owner: "Divya",
  },
  {
    id: "QT-1090",
    customer: "Kiran Textiles",
    eventDate: "2026-08-14",
    total: 21400,
    advance: 0,
    status: "Sent",
    created: "2026-08-01",
    validUntil: "2026-08-10",
    owner: "Naveen",
  },
  {
    id: "QT-1089",
    customer: "Sneha Iyer",
    eventDate: "2026-08-11",
    total: 11200,
    advance: 4000,
    status: "Accepted",
    created: "2026-07-27",
    validUntil: "2026-08-07",
    owner: "Naveen",
  },
  {
    id: "QT-1088",
    customer: "Hotel Vellore Grand",
    eventDate: "2026-08-30",
    total: 104000,
    advance: 0,
    status: "Draft",
    created: "2026-08-03",
    validUntil: "2026-08-20",
    owner: "Rahul",
  },
  {
    id: "QT-1087",
    customer: "Anand Vidyalaya",
    eventDate: "2026-09-05",
    total: 27800,
    advance: 0,
    status: "Sent",
    created: "2026-08-04",
    validUntil: "2026-08-25",
    owner: "Rahul",
  },
];

export type CrmOrder = {
  id: string;
  customer: string;
  preparation: string;
  requiredDate: string;
  total: number;
  paid: number;
  status: (typeof orderStatuses)[number];
  priority: "High" | "Normal" | "Rush";
};

export const crmOrders: CrmOrder[] = [
  {
    id: "OR-0731",
    customer: "Divya Krishnan",
    preparation: "3-tier red velvet, fondant florals",
    requiredDate: "2026-08-18",
    total: 16400,
    paid: 16400,
    status: "Processing",
    priority: "Normal",
  },
  {
    id: "OR-0730",
    customer: "Aarthi Rangan",
    preparation: "4-tier pistachio rose, sugar pearls",
    requiredDate: "2026-08-22",
    total: 46500,
    paid: 20000,
    status: "Confirmed",
    priority: "High",
  },
  {
    id: "OR-0729",
    customer: "Sneha Iyer",
    preparation: "48 butterscotch cupcakes, pastel set",
    requiredDate: "2026-08-11",
    total: 11200,
    paid: 11200,
    status: "Ready",
    priority: "Rush",
  },
  {
    id: "OR-0728",
    customer: "Ramesh Bhavan",
    preparation: "Photo cake 2kg + brownie box",
    requiredDate: "2026-08-08",
    total: 5400,
    paid: 5400,
    status: "Invoice Pending",
    priority: "Normal",
  },
  {
    id: "OR-0727",
    customer: "Kiran Textiles",
    preparation: "6 logo cakes, 1kg each",
    requiredDate: "2026-08-14",
    total: 21400,
    paid: 8000,
    status: "Confirmed",
    priority: "Normal",
  },
];

export type Invoice = {
  id: string;
  customer: string;
  total: number;
  collected: number;
  status: (typeof invoiceStatuses)[number];
  generated: string;
};

export const invoices: Invoice[] = [
  {
    id: "IN-0512",
    customer: "Ramesh Bhavan",
    total: 5400,
    collected: 5400,
    status: "Paid",
    generated: "2026-08-04",
  },
  {
    id: "IN-0511",
    customer: "Sneha Iyer",
    total: 11200,
    collected: 4000,
    status: "Issued",
    generated: "2026-08-03",
  },
  {
    id: "IN-0510",
    customer: "Vidya Menon",
    total: 8900,
    collected: 8900,
    status: "Closed",
    generated: "2026-07-30",
  },
  {
    id: "IN-0509",
    customer: "Kiran Textiles",
    total: 21400,
    collected: 8000,
    status: "Generated",
    generated: "2026-08-05",
  },
  {
    id: "IN-0508",
    customer: "Sathya Constructions",
    total: 34500,
    collected: 34500,
    status: "Paid",
    generated: "2026-08-01",
  },
];

export type Delivery = {
  id: string;
  customer: string;
  type: "Customer Pickup" | "Magilshe Delivery" | "Porter Delivery";
  scheduled: string;
  balance: number;
  status: (typeof deliveryStatuses)[number];
  nextStep: string;
  area: string;
};

export const deliveries: Delivery[] = [
  {
    id: "DL-0388",
    customer: "Ramesh Bhavan",
    type: "Magilshe Delivery",
    scheduled: "2026-08-06 11:30",
    balance: 0,
    status: "Out for Delivery",
    nextStep: "Mark handed over",
    area: "Adyar",
  },
  {
    id: "DL-0387",
    customer: "Vidya Menon",
    type: "Customer Pickup",
    scheduled: "2026-08-06 17:00",
    balance: 0,
    status: "Pending",
    nextStep: "Confirm pickup person",
    area: "Store — T. Nagar",
  },
  {
    id: "DL-0386",
    customer: "Sneha Iyer",
    type: "Porter Delivery",
    scheduled: "2026-08-11 09:00",
    balance: 7200,
    status: "Pending",
    nextStep: "Collect balance",
    area: "Whitefield",
  },
  {
    id: "DL-0385",
    customer: "Sathya Constructions",
    type: "Magilshe Delivery",
    scheduled: "2026-08-05 10:00",
    balance: 0,
    status: "Delivered Successfully",
    nextStep: "Closed",
    area: "Guindy",
  },
  {
    id: "DL-0384",
    customer: "Gokul Sweets",
    type: "Porter Delivery",
    scheduled: "2026-08-04 16:00",
    balance: 0,
    status: "Damaged During Delivery",
    nextStep: "Raise replacement",
    area: "Velachery",
  },
];

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  addresses: number;
  since: string;
  leads: number;
  quotations: number;
  orders: number;
  invoices: number;
  revenue: number;
  city: string;
};

export const customers: Customer[] = [
  {
    id: "CU-1041",
    name: "Aarthi Rangan",
    phone: "9840112233",
    email: "aarthi@zenmail.com",
    addresses: 2,
    since: "2024-02-11",
    leads: 6,
    quotations: 5,
    orders: 4,
    invoices: 4,
    revenue: 168400,
    city: "Chennai",
  },
  {
    id: "CU-1040",
    name: "Kiran Textiles",
    phone: "9821004411",
    email: "orders@kirantex.in",
    addresses: 3,
    since: "2023-09-04",
    leads: 14,
    quotations: 11,
    orders: 9,
    invoices: 9,
    revenue: 412000,
    city: "Coimbatore",
  },
  {
    id: "CU-1039",
    name: "Sneha Iyer",
    phone: "9611223344",
    email: "sneha.iyer@fastmail.com",
    addresses: 1,
    since: "2025-01-22",
    leads: 4,
    quotations: 3,
    orders: 3,
    invoices: 2,
    revenue: 38600,
    city: "Bengaluru",
  },
  {
    id: "CU-1038",
    name: "Hotel Vellore Grand",
    phone: "9445009812",
    email: "fnb@vellograND.com",
    addresses: 2,
    since: "2024-11-30",
    leads: 9,
    quotations: 7,
    orders: 5,
    invoices: 5,
    revenue: 286500,
    city: "Vellore",
  },
  {
    id: "CU-1037",
    name: "Divya Krishnan",
    phone: "9003344556",
    email: "divya.k@zenmail.com",
    addresses: 1,
    since: "2025-06-14",
    leads: 3,
    quotations: 3,
    orders: 2,
    invoices: 2,
    revenue: 31800,
    city: "Chennai",
  },
  {
    id: "CU-1036",
    name: "Sathya Constructions",
    phone: "9500221144",
    email: "hr@sathyacon.in",
    addresses: 4,
    since: "2023-04-18",
    leads: 18,
    quotations: 15,
    orders: 12,
    invoices: 12,
    revenue: 524000,
    city: "Madurai",
  },
];

export const onlineOrders = [
  {
    id: "SO-88214",
    orderedAt: "2026-08-05 09:12",
    deliveryAt: "2026-08-06 10:00",
    amount: 2480,
    customer: "Preethi N",
    phone: "9840556612",
    address: "12/4 Kamaraj St, Adyar, Chennai",
    items: 3,
    type: "Online",
    status: "Preparing",
  },
  {
    id: "SO-88213",
    orderedAt: "2026-08-05 08:40",
    deliveryAt: "2026-08-05 18:00",
    amount: 1150,
    customer: "Vikram R",
    phone: "9790778821",
    address: "Flat 3B, Anna Nagar, Chennai",
    items: 1,
    type: "Manual",
    status: "Confirmed",
  },
  {
    id: "SO-88212",
    orderedAt: "2026-08-04 19:22",
    deliveryAt: "2026-08-05 12:00",
    amount: 3620,
    customer: "Lakshmi S",
    phone: "9445112200",
    address: "7 Bazaar Rd, Mylapore, Chennai",
    items: 5,
    type: "Online",
    status: "Delivered",
  },
  {
    id: "SO-88211",
    orderedAt: "2026-08-04 16:05",
    deliveryAt: "2026-08-04 20:00",
    amount: 890,
    customer: "Arun Kumar",
    phone: "9003991122",
    address: "22 Nehru St, Velachery, Chennai",
    items: 2,
    type: "Online",
    status: "Cancelled",
  },
  {
    id: "SO-88210",
    orderedAt: "2026-08-04 11:47",
    deliveryAt: "2026-08-05 09:00",
    amount: 5240,
    customer: "Nithya Balaji",
    phone: "9611004488",
    address: "5 Lake View, OMR, Chennai",
    items: 6,
    type: "Manual",
    status: "Ready",
  },
  {
    id: "SO-88209",
    orderedAt: "2026-08-03 21:10",
    deliveryAt: "2026-08-04 17:00",
    amount: 1720,
    customer: "Gopal Iyer",
    phone: "9822114455",
    address: "16 Gandhi Rd, Tambaram, Chennai",
    items: 2,
    type: "Online",
    status: "Rejected",
  },
];

export const products = [
  {
    id: "PR-3012",
    name: "Belgian Truffle Indulgence",
    subCategory: "Signature Cakes",
    unit: "Kg",
    tags: ["Bestseller", "Eggless", "Premium"],
    sizes: [
      { size: "0.5", price: 780 },
      { size: "1", price: 1450 },
      { size: "2", price: 2790 },
    ],
    images: 4,
  },
  {
    id: "PR-3011",
    name: "Pistachio Rose Celebration",
    subCategory: "Wedding Tiers",
    unit: "Kg",
    tags: ["Premium", "New"],
    sizes: [
      { size: "1", price: 1890 },
      { size: "2", price: 3520 },
    ],
    images: 3,
  },
  {
    id: "PR-3010",
    name: "Red Velvet Cream Cheese",
    subCategory: "Signature Cakes",
    unit: "Kg",
    tags: ["Bestseller"],
    sizes: [
      { size: "0.5", price: 720 },
      { size: "1", price: 1350 },
    ],
    images: 5,
  },
  {
    id: "PR-3009",
    name: "Salted Caramel Brownie Box",
    subCategory: "Desserts",
    unit: "Piece",
    tags: ["Eggless", "Gifting"],
    sizes: [
      { size: "6 pc", price: 540 },
      { size: "12 pc", price: 980 },
    ],
    images: 2,
  },
  {
    id: "PR-3008",
    name: "Butterscotch Cupcake Set",
    subCategory: "Cupcakes",
    unit: "Piece",
    tags: ["Party", "Bestseller"],
    sizes: [
      { size: "6 pc", price: 480 },
      { size: "12 pc", price: 900 },
    ],
    images: 4,
  },
];

export const revenueSeries = [
  { month: "Feb", revenue: 486000, orders: 312, target: 460000 },
  { month: "Mar", revenue: 524000, orders: 341, target: 500000 },
  { month: "Apr", revenue: 612000, orders: 388, target: 560000 },
  { month: "May", revenue: 578000, orders: 366, target: 600000 },
  { month: "Jun", revenue: 704000, orders: 421, target: 640000 },
  { month: "Jul", revenue: 812000, orders: 468, target: 700000 },
  { month: "Aug", revenue: 386000, orders: 214, target: 760000 },
];

export const dailySeries = [
  { day: "Mon", online: 42, crm: 8 },
  { day: "Tue", online: 51, crm: 11 },
  { day: "Wed", online: 38, crm: 6 },
  { day: "Thu", online: 64, crm: 14 },
  { day: "Fri", online: 88, crm: 19 },
  { day: "Sat", online: 124, crm: 22 },
  { day: "Sun", online: 96, crm: 12 },
];

export const funnel = [
  { stage: "Open", count: 48, tone: "info" as Tone },
  { stage: "Follow-up", count: 31, tone: "warning" as Tone },
  { stage: "Won", count: 22, tone: "success" as Tone },
  { stage: "Quotation", count: 18, tone: "primary" as Tone },
  { stage: "Order", count: 14, tone: "accent" as Tone },
  { stage: "Invoice", count: 11, tone: "info" as Tone },
  { stage: "Delivery", count: 9, tone: "success" as Tone },
];

export const categoryMix = [
  { name: "Signature Cakes", value: 38 },
  { name: "Wedding Tiers", value: 24 },
  { name: "Cupcakes", value: 16 },
  { name: "Desserts", value: 13 },
  { name: "Gifting", value: 9 },
];

export const activities = [
  {
    id: 1,
    who: "Divya",
    action: "moved lead",
    target: "LD-2418 Aarthi Rangan",
    detail: "Follow-up → Won",
    at: "12 min ago",
    tone: "success" as Tone,
  },
  {
    id: 2,
    who: "Naveen",
    action: "sent quotation",
    target: "QT-1090 Kiran Textiles",
    detail: "₹21,400 · valid till 10 Aug",
    at: "48 min ago",
    tone: "info" as Tone,
  },
  {
    id: 3,
    who: "System",
    action: "advance received",
    target: "QT-1092",
    detail: "₹20,000 via Google Pay",
    at: "2 hrs ago",
    tone: "accent" as Tone,
  },
  {
    id: 4,
    who: "Rahul",
    action: "marked delivery damaged",
    target: "DL-0384 Gokul Sweets",
    detail: "Replacement pending",
    at: "5 hrs ago",
    tone: "danger" as Tone,
  },
  {
    id: 5,
    who: "Divya",
    action: "added note",
    target: "CU-1036 Sathya Constructions",
    detail: "Prefers 48h lead time",
    at: "Yesterday",
    tone: "neutral" as Tone,
  },
];

export const followUps = [
  {
    id: "LD-2417",
    customer: "Kiran Textiles",
    at: "Today 15:00",
    note: "Confirm logo artwork",
    owner: "Naveen",
  },
  {
    id: "LD-2414",
    customer: "Sneha Iyer",
    at: "Today 17:30",
    note: "Share pastel palette options",
    owner: "Divya",
  },
  {
    id: "LD-2411",
    customer: "Anand Vidyalaya",
    at: "Tomorrow 10:00",
    note: "Bulk pricing approval",
    owner: "Rahul",
  },
];

export const occasionsUpcoming = [
  { name: "Aarthi Rangan · Wedding", date: "22 Aug 2026" },
  { name: "Divya Krishnan · Anniversary", date: "18 Aug 2026" },
  { name: "Sneha Iyer · Baby Shower", date: "11 Aug 2026" },
  { name: "Kiran Textiles · Work Anniversary", date: "14 Aug 2026" },
  { name: "Hotel Vellore Grand · Banquet", date: "30 Aug 2026" },
  { name: "Anand Vidyalaya · Annual Day", date: "05 Sep 2026" },
];

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
