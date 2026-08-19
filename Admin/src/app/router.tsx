import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./require-auth";
import { RedirectIfAuthed } from "./redirect-if-authed";
import { NotFoundPage } from "./not-found-page";
import { ComingSoonPage } from "@/components/shared/coming-soon-page";

const LoginPage = lazy(() => import("@/features/auth/pages/login-page"));

const HomeDashboardPage = lazy(() => import("@/features/dashboard/pages/home-dashboard-page"));

const CrmDashboardPage = lazy(() => import("@/features/crm/pages/crm-dashboard-page"));
const LeadsPage = lazy(() => import("@/features/crm/pages/leads-page"));
const LeadFormPage = lazy(() => import("@/features/crm/pages/lead-form-page"));
const FollowUpsPage = lazy(() => import("@/features/crm/pages/follow-ups-page"));
const QuotationsPage = lazy(() => import("@/features/crm/pages/quotations-page"));
const QuotationFormPage = lazy(() => import("@/features/crm/pages/quotation-form-page"));
const CrmOrdersPage = lazy(() => import("@/features/crm/pages/crm-orders-page"));
const OrderDetailPage = lazy(() => import("@/features/crm/pages/order-detail-page"));
const DirectOrderPage = lazy(() => import("@/features/crm/pages/direct-order-page"));
const InvoicesPage = lazy(() => import("@/features/crm/pages/invoices-page"));
const InvoiceDetailPage = lazy(() => import("@/features/crm/pages/invoice-detail-page"));
const CrmDeliveryPage = lazy(() => import("@/features/crm/pages/delivery-page"));
const DeliveryDetailPage = lazy(() => import("@/features/crm/pages/delivery-detail-page"));
const CrmSettingsPage = lazy(() => import("@/features/crm/pages/crm-settings-page"));

const CustomersPage = lazy(() => import("@/features/customers/pages/customers-page"));
const CustomerManagementPage = lazy(() => import("@/features/customers/pages/customer-management-page"));
const CustomerProfilePage = lazy(() => import("@/features/customers/pages/customer-profile-page"));

const CategoriesPage = lazy(() => import("@/features/catalog/pages/categories-page"));
const SubCategoriesPage = lazy(() => import("@/features/catalog/pages/subcategories-page"));
const ProductsPage = lazy(() => import("@/features/catalog/pages/products-page"));
const ItemsPage = lazy(() => import("@/features/catalog/pages/items-page"));
const UnitsPage = lazy(() => import("@/features/catalog/pages/units-page"));
const SubUnitsPage = lazy(() => import("@/features/catalog/pages/sub-units-page"));
const TagsPage = lazy(() => import("@/features/catalog/pages/tags-page"));
const GalleryPage = lazy(() => import("@/features/catalog/pages/gallery-page"));

const OnlineOrdersPage = lazy(() => import("@/features/operations/pages/online-orders-page"));
const ManualOrderPage = lazy(() => import("@/features/operations/pages/manual-order-page"));
const PurchasePage = lazy(() => import("@/features/operations/pages/purchase-page"));
const FeedbackPage = lazy(() => import("@/features/operations/pages/feedback-page"));
const LegacyCustomersPage = lazy(() => import("@/features/operations/pages/legacy-customers-page"));

const OffersPage = lazy(() => import("@/features/marketing/pages/offers-page"));
const BannerPage = lazy(() => import("@/features/marketing/pages/banner-page"));
const EventsPage = lazy(() => import("@/features/marketing/pages/events-page"));
const EventOrdersPage = lazy(() => import("@/features/marketing/pages/event-orders-page"));

const AnalyticsPage = lazy(() => import("@/features/reports/pages/analytics-page"));
const OrderReportsPage = lazy(() => import("@/features/reports/pages/order-reports-page"));
const UserWiseReportsPage = lazy(() => import("@/features/reports/pages/user-wise-reports-page"));
const DeliveryPersonReportsPage = lazy(
  () => import("@/features/reports/pages/delivery-person-reports-page"),
);
const OccasionReportsPage = lazy(() => import("@/features/reports/pages/occasion-reports-page"));

const ConfigurationPage = lazy(() => import("@/features/settings/pages/configuration-page"));
const TermsPage = lazy(() => import("@/features/settings/pages/terms-conditions-page"));
const SettingsPage = lazy(() => import("@/features/settings/pages/settings-page"));
const ProfilePage = lazy(() => import("@/features/settings/pages/profile-page"));

function RouteFallback() {
  return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
}

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomeDashboardPage />} />

            <Route path="/crm" element={<CrmDashboardPage />} />
            <Route path="/crm/leads" element={<LeadsPage />} />
            <Route path="/crm/leads/follow-ups" element={<FollowUpsPage />} />
            <Route path="/crm/leads/new" element={<LeadFormPage />} />
            <Route path="/crm/leads/:id/edit" element={<LeadFormPage />} />
            <Route path="/crm/quotations" element={<QuotationsPage />} />
            <Route path="/crm/quotations/new" element={<QuotationFormPage />} />
            <Route path="/crm/quotations/:id" element={<QuotationFormPage />} />
            <Route path="/crm/quotations/:id/edit" element={<QuotationFormPage />} />
            <Route path="/crm/orders" element={<CrmOrdersPage />} />
            <Route path="/crm/orders/new" element={<DirectOrderPage />} />
            <Route path="/crm/orders/:id" element={<OrderDetailPage />} />
            <Route path="/crm/invoices" element={<InvoicesPage />} />
            <Route path="/crm/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/crm/delivery" element={<CrmDeliveryPage />} />
            <Route path="/crm/delivery/:id" element={<DeliveryDetailPage />} />
            <Route path="/crm/settings" element={<CrmSettingsPage />} />
            <Route path="/crm/customers" element={<CustomersPage />} />
            <Route path="/crm/customers/manage" element={<CustomerManagementPage />} />
            <Route path="/crm/customers/:customerId" element={<CustomerProfilePage />} />

            <Route path="/users" element={<ComingSoonPage title="Users" />} />
            <Route path="/roles" element={<ComingSoonPage title="Roles & Permissions" />} />

            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/subcategories" element={<SubCategoriesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/item" element={<ItemsPage />} />
            <Route path="/unit" element={<UnitsPage />} />
            <Route path="/sub-unit" element={<SubUnitsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />

            <Route path="/orders" element={<OnlineOrdersPage />} />
            <Route path="/manual-order" element={<ManualOrderPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/delivery_person" element={<ComingSoonPage title="Delivery Staff" />} />
            <Route path="/delivery-management" element={<ComingSoonPage title="Delivery Overview" />} />
            <Route path="/delivery-management/staff" element={<ComingSoonPage title="Delivery Staff" />} />
            <Route path="/delivery-management/partners" element={<ComingSoonPage title="External Partners" />} />
            <Route path="/delivery-management/:kind/:id" element={<ComingSoonPage title="Delivery Profile" />} />
            <Route path="/delivery-management/records" element={<CrmDeliveryPage />} />
            <Route path="/delivery-management/performance" element={<ComingSoonPage title="Delivery Performance" />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/customers" element={<LegacyCustomersPage />} />

            <Route path="/offers" element={<OffersPage />} />
            <Route path="/banner" element={<BannerPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/event-orders" element={<EventOrdersPage />} />

            <Route path="/reports/analytics" element={<AnalyticsPage />} />
            <Route path="/order_reports" element={<OrderReportsPage />} />
            <Route path="/user_wise_reports" element={<UserWiseReportsPage />} />
            <Route path="/delivery_person_reports" element={<DeliveryPersonReportsPage />} />
            <Route path="/occasion_reports" element={<OccasionReportsPage />} />

            <Route path="/configuration" element={<ConfigurationPage />} />
            <Route path="/terms_conditions" element={<TermsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
