# Magilshe Admin

The new MagliShe Admin Platform — a from-scratch UI/UX (not a reskin of `Admin/`) built on a
conventional, widely-adopted React stack, talking to the existing Django REST backend in
`API-Server/` with zero backend changes.

`Admin/` (the old CRA app) remains the **functional reference** — its API contracts, auth
flow, business rules and workflows are authoritative. This app is the **new product
direction** and, as of the cutover, the live production admin panel. See "Current status"
below for what's real vs. still coming.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| Routing | React Router DOM (`createBrowserRouter`-style layout routes) |
| UI primitives | shadcn/ui on Radix |
| Styling | Tailwind CSS 4 (CSS-based `@theme`, OKLCH tokens, light/dark) |
| Server state | TanStack Query |
| API client | Axios (one centralized instance) |
| Forms | React Hook Form + Zod (wired in as modules need them) |
| Charts | Recharts |
| Icons | Lucide React |
| Client state | React state / Context — no Redux, no Zustand (not needed yet) |
| Backend | Django REST Framework + PostgreSQL (`API-Server/`, unchanged) |

## Getting started

### Prerequisites

- Node.js 20+ and npm
- The Django backend running locally (see below) — this app has no mock-backend mode; every
  real screen needs a live API

### 1. Start the backend first

```bash
cd ../API-Server
# first time: create/activate a venv and `pip install -r requirements.txt`,
# then run migrations if you haven't already
python manage.py runserver
```

This must be serving at `http://127.0.0.1:8000/` (the default the frontend expects — see
Configuration below).

### 2. Install frontend dependencies

```bash
cd Adminpanel_lovable
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Opens at **http://localhost:8080**. Vite serves an SPA — React Router handles all routing
client-side, so a page refresh on any route works normally (dev server and `vite preview`
both handle SPA fallback).

### 4. Log in

Use the same credentials as the old Admin app (`Admin/`) — same Django users, same
`POST auth/login/` endpoint, same token storage key (`localStorage["cakeryToken"]`), so a
session is portable between the two apps.

### Other scripts

```bash
npm run build      # tsc --noEmit && vite build — type-errors fail the build
npm run preview     # serve the production build locally
npm run lint         # eslint --fix-able issues will show as errors, not just warnings
npm run format      # prettier --write .
```

## Configuration

The API base URL defaults to `http://127.0.0.1:8000/`. To point at a different backend
(staging, a teammate's machine, etc.), create `.env.local`:

```
VITE_API_BASE_URL=https://your-backend-host/
```

(Read in `src/lib/api-client.ts`.)

## Project structure

```
src/
├── app/               # router, auth guards, providers — application wiring, not features
│   ├── router.tsx          # the full route table (lazy-loaded pages)
│   ├── require-auth.tsx    # layout route: redirects to /login if unauthenticated
│   ├── redirect-if-authed.tsx
│   └── providers.tsx       # QueryClientProvider + Toaster
│
├── components/
│   ├── ui/            # shadcn primitives — generally don't hand-edit, re-generate instead
│   ├── layout/         # AppShell, sidebar, top bar, command palette, theme toggle
│   └── shared/         # DataTable, PageHeader, SectionCard, StatCard, StatusChip,
│                        # EmptyState, skeletons, ComingSoonPage
│
├── features/           # one folder per business domain — every module below is real and
│   │                    # backend-connected unless noted otherwise
│   ├── auth/pages/
│   ├── dashboard/pages/    # Home Dashboard
│   ├── crm/                # Leads, Follow-ups, Quotations, Orders, Invoices, Delivery,
│   │                       # CRM Dashboard, CRM Settings
│   ├── customers/          # Customer Dashboard, List, Profile (event reminders are
│   │                       # read-only for now — no backend CRUD yet)
│   ├── catalog/pages/      # Categories, Sub Categories, Products, Items, Units, Tags, Gallery
│   ├── operations/pages/   # Online/Manual Orders, Purchases, Feedback, legacy Customers
│   │                       # (Delivery Management staff/platforms/partners: coming soon,
│   │                       # no backend endpoints yet — routes show ComingSoonPage)
│   ├── marketing/pages/    # Offers, Banner, Events, Event Orders
│   ├── reports/pages/      # Analytics, Order/Customer/Delivery/Occasion reports
│   ├── settings/pages/     # Configuration, Terms, Settings, Profile
│   └── users/pages/        # Users, Roles & Permissions — coming soon (no RBAC backend
│                           # beyond a minimal customer/rbac/me/ that grants full access to
│                           # any staff/superuser; no Role/Permission CRUD yet)
│
├── lib/
│   ├── api-client.ts    # the one Axios instance — request/response interceptors, token refresh
│   ├── endpoints.ts      # every backend endpoint path, named — add here before calling it
│   ├── auth-storage.ts    # token get/set/clear, isAuthenticated()
│   ├── navigation.ts     # sidebar IA, breadcrumbs, quick-create, "coming soon" flags
│   ├── data.ts            # currency formatter + status-constant arrays used across pages
│   ├── status-tones.ts    # status → badge color mapping
│   └── utils.ts
│
└── styles.css           # design tokens (colors, radius, shadows, dark mode)
```

### Where a real, backend-connected module lives

Feature hooks (`useQuery`/`useMutation` wrappers around `api-client` + `endpoints`) live in
`src/features/<domain>/hooks.ts`. Pages import from there — never call `apiClient` directly
from a page component. `src/features/dashboard/hooks.ts`, `crm/hooks.ts`, `customers/hooks.ts`
are the reference examples.

### Adding a new real page (the pattern to follow)

1. If the endpoint isn't in `src/lib/endpoints.ts` yet, add it there.
2. Add a `useQuery`/`useMutation` hook in the relevant `features/<domain>/hooks.ts`.
3. Build the page in `features/<domain>/pages/`, using `DataTable`, `PageHeader`,
   `SectionCard`, `StatCard`, `EmptyState`, and the loading skeletons from
   `components/shared/` — don't build new table/card primitives per page.
4. Register the route in `src/app/router.tsx` (lazy import + `<Route>` entry).
5. If the page currently renders `ComingSoonPage` (see below), swap it to the real hook +
   `DataTable`/`SectionCard`, following any existing CRM/Catalog page as the template, and
   drop its `comingSoon` flag in `src/lib/navigation.ts`.

## Current status

Every module is real and backend-connected except:

- **Users / Roles & Permissions** — no RBAC backend beyond a minimal `customer/rbac/me/`
  endpoint (grants full access to any `is_staff`/`is_superuser` account, matching the old
  Admin's flat access model). Both routes render `ComingSoonPage`; there's no Role/Permission
  CRUD yet.
- **Delivery Management** (staff / platforms / partners / performance / per-person profile) —
  the backend's `DeliveryPerson` model has no concept of platforms or external partners.
  Routes render `ComingSoonPage`. "Delivery Records" (`/delivery-management/records`, backed
  by `crm/deliveries/`) works normally.
- **Customer event reminders** — creating/editing/completing/deleting a `CustomerRecurringEvent`
  has no backend support (the model has no `notes`/`reminder_days_before` fields, and there's
  no CRUD endpoint). Auto-detected events still display read-only on the customer profile;
  the action buttons show a "coming soon" toast instead of calling the API.

Everything else — Leads, Follow-ups, Quotations, CRM Orders, Invoices, Delivery, the CRM and
Customer dashboards (including customer analytics/lifetime revenue), Catalog, Marketing,
Reports, Configuration, and core Store Operations — is real, wired to the Django backend in
`API-Server/`, and verified against live data.
