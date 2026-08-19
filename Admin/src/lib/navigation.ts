import {
  LayoutDashboard,
  Users,
  Contact,
  Target,
  FileText,
  ShoppingCart,
  ReceiptText,
  Truck,
  Settings2,
  Boxes,
  FolderTree,
  Layers,
  Package,
  Ruler,
  Scale,
  Tags,
  Images,
  Store,
  ClipboardList,
  PackagePlus,
  BikeIcon,
  Megaphone,
  Percent,
  GalleryHorizontalEnd,
  CalendarDays,
  CalendarCheck,
  BarChart3,
  LineChart,
  UserSearch,
  MapPinned,
  Building2,
  ScrollText,
  SlidersHorizontal,
  UserCircle,
  MessageSquareHeart,
  Gauge,
  UserCog,
  UserRoundSearch,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  aliases?: string[];
  /** Not yet wired to the real backend in this pass — flagged in nav + breadcrumbs. */
  comingSoon?: boolean;
};
export type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};
export type NavEntry = NavItem | NavGroup;

export const isGroup = (e: NavEntry): e is NavGroup => "items" in e;

/**
 * IA restructured around the three priority workspaces (Home, CRM, Customers)
 * surfaced as top-level destinations, with the rest of the storefront/ops
 * surface grouped underneath.
 */
export const navigation: NavEntry[] = [
  { label: "Home", to: "/", icon: LayoutDashboard, aliases: ["dashboard", "overview"] },
  { label: "CRM Dashboard", to: "/crm", icon: Gauge, aliases: ["pipeline", "funnel"] },
  {
    label: "Customers",
    to: "/crm/customers",
    icon: Contact,
    aliases: ["customer dashboard"],
  },
  {
    label: "Customer Management",
    to: "/crm/customers/manage",
    icon: UserRoundSearch,
    aliases: ["customer 360", "customer list", "customer profile"],
  },
  {
    label: "Users",
    to: "/users",
    icon: UserCog,
    aliases: ["staff", "admin users", "team"],
    comingSoon: true,
  },
  {
    label: "Roles & Permissions",
    to: "/roles",
    icon: UserCog,
    aliases: ["rbac", "permissions", "profiles"],
    comingSoon: true,
  },
  {
    label: "CRM Pipeline",
    icon: Target,
    items: [
      {
        label: "Leads",
        to: "/crm/leads",
        icon: Target,
        aliases: ["enquiry", "kanban"],
      },
      {
        label: "Follow-ups",
        to: "/crm/leads/follow-ups",
        icon: CalendarCheck,
        aliases: ["due", "overdue"],
      },
      {
        label: "Quotations",
        to: "/crm/quotations",
        icon: FileText,
        aliases: ["quote"],
      },
      {
        label: "Orders",
        to: "/crm/orders",
        icon: ShoppingCart,
        aliases: ["crm orders"],
      },
      {
        label: "Invoices",
        to: "/crm/invoices",
        icon: ReceiptText,
        aliases: ["billing"],
      },
      {
        label: "Delivery",
        to: "/crm/delivery",
        icon: Truck,
        aliases: ["fulfilment"],
      },
      {
        label: "CRM Settings",
        to: "/crm/settings",
        icon: Settings2,
        aliases: ["configuration"],
      },
    ],
  },
  {
    label: "Catalog",
    icon: Boxes,
    items: [
      { label: "Categories", to: "/categories", icon: FolderTree },
      { label: "Sub Categories", to: "/subcategories", icon: Layers },
      { label: "Products", to: "/products", icon: Package, aliases: ["cakes"] },
      {
        label: "Inventory Items",
        to: "/item",
        icon: PackagePlus,
        aliases: ["stock", "hsn"],
      },
      { label: "Units", to: "/unit", icon: Ruler },
      {
        label: "Sub Units",
        to: "/sub-unit",
        icon: Scale,
        aliases: ["kg", "weight"],
      },
      { label: "Tags", to: "/tags", icon: Tags },
      { label: "Gallery", to: "/gallery", icon: Images },
    ],
  },
  {
    label: "Store Operations",
    icon: Store,
    items: [
      { label: "Delivery Overview", to: "/delivery-management", icon: Truck, comingSoon: true },
      { label: "Delivery Records", to: "/delivery-management/records", icon: ClipboardList },
      { label: "Delivery Staff", to: "/delivery-management/staff", icon: BikeIcon, aliases: ["rider"], comingSoon: true },
      { label: "External Partners", to: "/delivery-management/partners", icon: Users, aliases: ["porter", "driver"], comingSoon: true },
      { label: "Delivery Performance", to: "/delivery-management/performance", icon: LineChart, comingSoon: true },
      {
        label: "Online Orders",
        to: "/orders",
        icon: ClipboardList,
        aliases: ["storefront orders"],
      },
      {
        label: "Manual Orders",
        to: "/manual-order",
        icon: ShoppingCart,
        aliases: ["pos", "walk-in"],
      },
      {
        label: "Purchases",
        to: "/purchase",
        icon: PackagePlus,
        aliases: ["supplier"],
      },
      {
        label: "Feedback",
        to: "/feedback",
        icon: MessageSquareHeart,
        aliases: ["testimonials"],
      },
      {
        label: "Customers (Legacy)",
        to: "/customers",
        icon: UserSearch,
        aliases: ["accounts"],
      },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    items: [
      { label: "Offers", to: "/offers", icon: Percent, aliases: ["discount"] },
      {
        label: "Website Banner",
        to: "/banner",
        icon: GalleryHorizontalEnd,
        aliases: ["hero"],
      },
      { label: "Events", to: "/events", icon: CalendarDays },
      { label: "Event Orders", to: "/event-orders", icon: CalendarCheck },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      {
        label: "Analytics",
        to: "/reports/analytics",
        icon: LineChart,
        aliases: ["bi", "reports"],
      },
      {
        label: "Sales Reports",
        to: "/order_reports",
        icon: BarChart3,
        aliases: ["order reports"],
      },
      {
        label: "Customer Reports",
        to: "/user_wise_reports",
        icon: UserSearch,
        aliases: ["user wise"],
      },
      {
        label: "Delivery Reports",
        to: "/delivery_person_reports",
        icon: MapPinned,
      },
      { label: "Occasion Reports", to: "/occasion_reports", icon: CalendarDays },
    ],
  },
  {
    label: "Configuration",
    icon: SlidersHorizontal,
    items: [
      { label: "Company", to: "/configuration", icon: Building2 },
      {
        label: "Terms",
        to: "/terms_conditions",
        icon: ScrollText,
        aliases: ["privacy"],
      },
      { label: "Settings", to: "/settings", icon: SlidersHorizontal },
    ],
  },
  { label: "Profile", to: "/profile", icon: UserCircle, aliases: ["account"] },
];

export const flatNav: NavItem[] = navigation.flatMap((e) => (isGroup(e) ? e.items : [e]));

export const quickCreate = [
  { label: "New Lead", to: "/crm/leads", hint: "L" },
  { label: "New Quotation", to: "/crm/quotations", hint: "Q" },
  { label: "Manual Order", to: "/manual-order", hint: "M" },
  { label: "New Product", to: "/products", hint: "P" },
  { label: "New Customer", to: "/crm/customers", hint: "C" },
];

export const breadcrumbFor = (pathname: string): { label: string; to?: string }[] => {
  if (pathname === "/") return [{ label: "Home" }];
  for (const entry of navigation) {
    if (isGroup(entry)) {
      const hit = entry.items.find((i) => pathname === i.to || pathname.startsWith(i.to + "/"));
      if (hit) return [{ label: entry.label }, { label: hit.label, to: hit.to }];
    } else if (pathname === entry.to || pathname.startsWith(entry.to + "/")) {
      return [{ label: entry.label }];
    }
  }
  return [{ label: "Workspace" }];
};
