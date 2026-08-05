import { createContext } from "react";
//Components
import Home from "../components/home/Home";
import Profile from "../components/profile/Profile";
import Lead from "../components/crm/Lead/Lead";
import LeadForm from "../components/crm/Lead/LeadForm";
import FollowUps from "../components/crm/Lead/FollowUps";
import CRMHome from "../components/crm/CRMHome";
import QuotationList from "../components/crm/quotation/QuotationList";
import QuotationDetails from "../components/crm/quotation/QuotationDetails";
import QuotationForm from "../components/crm/quotation/QuotationForm";
import OrderList from "../components/crm/order/OrderList";
import OrderDetails from "../components/crm/order/OrderDetails";
import OrderForm from "../components/crm/order/OrderForm";
import InvoiceList from "../components/crm/invoice/InvoiceList";
import InvoiceDetails from "../components/crm/invoice/InvoiceDetails";
import DeliveryList from "../components/crm/delivery/DeliveryList";
import DeliveryDetails from "../components/crm/delivery/DeliveryDetails";
import CRMSettings from "../components/crm/CRMSettings";
import AdminManual from "../components/help/AdminManual";
import CRMCustomerList from "../components/crm/customer/CustomerList";
import CRMCustomerDetails from "../components/crm/customer/CustomerDetails";

/* Font Awesome */
import {
  faUser,
  faHomeAlt,
  faImage,
  faPercentage,
  faTags,
  faWeightScale,
  faLayerGroup,
  faCartFlatbed,
  faChartLine,
  faCartShopping,
  faUserGroup,
  faGears,
  faMessage,
  faChartBar,
  faTruck,
  faBasketShopping,
  faReceipt,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import Category from "../components/master/Category/Category";
import SubCategory from "../components/master/SubCategories/SubCategory";
import TagsComponent from "../components/master/Tags/Tags";
import KGComponent from "../components/master/KG/KG";
import CakeComponent from "../components/master/Cake/Cake";
import GalleryComponent from "../components/master/Gallery/Gallery";
import Customers from "../components/customers/Customers";
import Orders from "../components/orders/Orders";
import Config from "../components/config/Config";
import DeliveryPerson from "../components/deliveryPerson/DeliveryPerson";
import FeedBack from "../components/feedBack/FeedBack";
import Offers from "../components/offers/Offers";
import OccasionReport from "../components/Reports/OccasionReport/OccasionReport";
import DeliveryPersonReport from "../components/Reports/DeliveryPersonReport/DeliveryPersonReport";
import OrderReport from "../components/Reports/OrderReport/OrderReport";
import UnitComponent from "../components/master/Unit/Unit";
import ItemComponent from "../components/Item/Item";
// import Purchase from "../components/purchase/Purchase";
// import Sales from "../components/sales/Sales";
import PurchaseHome from "../components/purchase/PurchaseHome";
import Terms from "../components/Terms&condtions/Terms";
import Banner from "../components/Dynamic_Banner/Banner";
// import ManualOrderHome from "../components/Manual_Order/ManualOrderHome";
import ManualOrder from "../components/Manual_Order/ManualOrder";
import UserWiseReport from "../components/Reports/UserWiseReport/UserWiseReport";
import Events from "../components/Events/Events";
import EventsOrders from "../components/EventsOrders/EventsOrders";
import ReportsAnalytics from "../components/Reports/Analytics/ReportsAnalytics";


const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const RoutesList = [
    {
      label: "Home",
      key: "home",
      heading_name: "Dashboard",
      link: "/",
      icon: faHomeAlt,
      element: Home,
      accessRoles: "all",
    },
    {
      label: "Master",
      heading_name: "Master",
      key: "master",
      icon: faCartFlatbed,
      subMenu: [
        {
          label: "Categories",
          key: "categories",
          link: "/categories",
          icon: faLayerGroup,
          element: Category,
          accessRoles: "all",
        },
        {
          label: "Sub Categories",
          key: "sub_categories",
          link: "/subcategories",
          icon: faLayerGroup,
          element: SubCategory,
          accessRoles: "all",
        },
        {
          label: "Tags",
          key: "tags",
          link: "/tags",
          icon: faTags,
          element: TagsComponent,
          accessRoles: "all",
        },
        {
          label: "Unit",
          key: "unit",
          link: "/unit",
          icon: faWeightScale,
          element: UnitComponent,
          accessRoles: "all",
        },
        {
          label: "Sub Unit",
          key: "sub-unit",
          link: "/sub-unit",
          icon: faWeightScale,
          element: KGComponent,
          accessRoles: "all",
        },        
        {
          label: "Item",
          key: "item",
          link: "/item",
          icon: faBasketShopping,
          element: ItemComponent,
          accessRoles: "all",
        },       
       
      ],
    },
    {
      label: "Products",
      key: "products",
      link: "/products",
      icon: faBasketShopping,
      element: CakeComponent,
      accessRoles: "all",
    },
    {
      label: "CRM",
      heading_name: "CRM",
      key: "crm",
      icon: faUserGroup,
      subMenu: [
        {
          label: "Overview",
          key: "crm-overview",
          link: "/crm",
          icon: faChartLine,
          element: CRMHome,
          accessRoles: "all",
        },
        {
          label: "Customers",
          key: "crm-customers",
          link: "/crm/customers",
          icon: faUserGroup,
          element: CRMCustomerList,
          accessRoles: "all",
        },
        {
          label: "Leads",
          key: "crm-leads",
          link: "/crm/leads",
          icon: faUser,
          element: Lead,
          accessRoles: "all",
        },
        {
          label: "Quotations",
          key: "crm-quotations",
          link: "/crm/quotations",
          icon: faFileAlt,
          element: QuotationList,
          accessRoles: "all",
        },
        {
          label: "Orders",
          key: "crm-orders",
          link: "/crm/orders",
          icon: faCartShopping,
          element: OrderList,
          accessRoles: "all",
        },
        {
          label: "Invoices",
          key: "crm-invoices",
          link: "/crm/invoices",
          icon: faReceipt,
          element: InvoiceList,
          accessRoles: "all",
        },
        {
          label: "Delivery",
          key: "crm-delivery",
          link: "/crm/delivery",
          icon: faTruck,
          element: DeliveryList,
          accessRoles: "all",
        },
        {
          label: "Configuration",
          key: "crm-settings",
          link: "/crm/settings",
          icon: faGears,
          element: CRMSettings,
          accessRoles: "all",
        },
      ],
    },
    {
      label: "Admin Instruction Manual",
      key: "admin-manual",
      link: "/help/admin-manual",
      element: AdminManual,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM lead follow-ups",
      key: "crm-lead-follow-ups",
      link: "/crm/leads/follow-ups",
      element: FollowUps,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM customer details",
      key: "crm-customer-details",
      link: "/crm/customers/:id",
      element: CRMCustomerDetails,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM lead create",
      key: "crm-lead-create",
      link: "/crm/leads/new",
      element: LeadForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM lead edit",
      key: "crm-lead-edit",
      link: "/crm/leads/:id/edit",
      element: LeadForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM lead details",
      key: "crm-lead-details",
      link: "/crm/leads/:id",
      element: LeadForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM new quotation",
      key: "crm-quotation-new",
      link: "/crm/quotations/new",
      element: QuotationForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM quotation details",
      key: "crm-quotation-details",
      link: "/crm/quotations/:id",
      element: QuotationDetails,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM quotation edit",
      key: "crm-quotation-edit",
      link: "/crm/quotations/:id/edit",
      element: QuotationForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM new order",
      key: "crm-order-new",
      link: "/crm/orders/new",
      element: OrderForm,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM order details",
      key: "crm-order-details",
      link: "/crm/orders/:id",
      element: OrderDetails,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM invoice details",
      key: "crm-invoice-details",
      link: "/crm/invoices/:id",
      element: InvoiceDetails,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "CRM delivery details",
      key: "crm-delivery-details",
      link: "/crm/delivery/:id",
      element: DeliveryDetails,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "Gallery",
      key: "gallery",
      link: "/gallery",
      icon: faImage,
      element: GalleryComponent,
      accessRoles: "all",
    },
    {
      label: "Purchase",
      key: "purchase",
      link: "/purchase",
      icon: faReceipt,
      element: PurchaseHome,
      accessRoles: "all",
    },
    // {
    //   label: "Sales",
    //   key: "sales",
    //   link: "/sales",
    //   icon: faReceipt,
    //   element: Sales,
    //   accessRoles: "all",
    // },
    // {
    //   label: "Cart",
    //   key: "cart",
    //   link: "/cart",
    //   icon: faCartShopping,
    //   element: Cart,
    //   accessRoles: "all",
    // },
    {
      label: "Manual Order",
      key: "manual-order",
      link: "/manual-order",
      icon: faCartShopping,
      element: ManualOrder,
      accessRoles: "all",
      is_display_none: true,
      isNoSubNav: true
    },
    {
      label: "Orders",
      key: "orders",
      link: "/orders",
      icon: faUser,
      element: Orders,
      accessRoles: "all",
    },
    {
      label: "Offers",
      key: "offers",
      link: "/offers",
      icon: faPercentage,
      element: Offers,
      accessRoles: "all",
    },
    {
      label: "Customers",
      key: "customers",
      link: "/customers",
      icon: faUserGroup,
      element: Customers,
      accessRoles: "all",
    },
    {
      label: "Delivery Person",
      key: "delivery_person",
      link: "/delivery_person",
      icon: faTruck,
      element: DeliveryPerson,
      accessRoles: "all",
    },
    {
      label: "FeedBack",
      key: "feedback",
      link: "/feedback",
      icon: faMessage,
      element: FeedBack,
      accessRoles: "all",
    },
    {
      label: "Banner",
      key: "banner",
      link: "/banner",
      icon: faImage,
      element: Banner,
      accessRoles: "all",
    },
    {
      label: "Events",
      key: "events",
      link: "/events",
      icon: faImage,
      element: Events,
      accessRoles: "all",
    },
    {
      label: "Events legacy route",
      key: "events-legacy",
      link: "/events/:id",
      element: Events,
      accessRoles: "all",
      isNoSubNav: true,
    },
    {
      label: "Event Order",
      key: "event_orders",
      link: "/event-orders",
      icon: faImage,
      element: EventsOrders,
      accessRoles: "all",
    },
    {
      label: "Configuration",
      key: "configuration",
      link: "/configuration",
      icon: faGears,
      element: Config,
      accessRoles: "all",
    },
    {
      label: "Terms&Conditions",
      key: "terms_conditions",
      link: "/terms_conditions",
      icon: faFileAlt,
      element: Terms,
      accessRoles: "all",
    },
    {
      label: "Reports",
      heading_name: "Reports",
      key: "reports",
        icon: faChartLine,
        subMenu: [
          {
            label: "Reports & Analytics",
            key: "reports-home",
            link: "/reports/analytics",
            icon: faChartLine,
            element: ReportsAnalytics,
            accessRoles: "all",
          },
        {
          label: "Occasion Reports",
          key: "occasion_reports",
          link: "/occasion_reports",
          icon: faChartBar,
          element: OccasionReport,
          accessRoles: "all",
        },
        {
          label: "Delivery Person Reports",
          key: "delivery_person_reports",
          link: "/delivery_person_reports",
          icon: faChartBar,
          element: DeliveryPersonReport,
          accessRoles: "all",
        },
        {
          label: "Order Reports",
          key: "order_reports",
          link: "/order_reports",
          icon: faChartBar,
          element: OrderReport,
          accessRoles: "all",
        },
        {
          label: "User Wise Reports",
          key: "user_wise_reports",
          link: "/user_wise_reports",
          icon: faChartBar,
          element: UserWiseReport,
          accessRoles: "all",
        },
      ],
    },
    {
      label: "Profile",
      key: "profile",
      heading_name: "Profile",
      link: "/profile",
      icon: faUser,
      element: Profile,
      accessRoles: "all",
    },
  ];

  return (
    <DataContext.Provider value={{ RoutesList }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
