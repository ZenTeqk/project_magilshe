# Magilshe Admin

The new MagliShe Admin Platform — a from-scratch UI/UX (not a reskin of `Admin/`) built on a
conventional, widely-adopted React stack, talking to the existing Django REST backend in
`API-Server/` with zero backend change.

`Admin/` (the old CRA app) remains the **functional reference** — its API contracts, auth
flow, business rules and workflows are authoritative. This app is the **new product
direction**. See `../MAGLISHE_ADMIN_STATUS.md` at the repo root for the current
module-by-module implementation status (what's real, what's still mock).

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
│                        # EmptyState, skeletons, ListModule/MasterModule scaffolds
│
├── features/           # one folder per business domain
│   ├── auth/pages/
│   ├── dashboard/pages/    # Home Dashboard
│   ├── crm/                # hooks.ts (real) + pages/ (CRM Dashboard real; Leads,
│   │                       # Quotations, Orders, Invoices, Delivery, Settings still mock)
│   ├── customers/          # hooks.ts (real) + pages/ (Customer Dashboard, List, Profile — real)
│   ├── catalog/pages/      # mock
│   ├── operations/pages/   # mock
│   ├── marketing/pages/    # mock
│   ├── reports/pages/      # mock
│   └── settings/pages/     # mock
│
├── lib/
│   ├── api-client.ts    # the one Axios instance — request/response interceptors, token refresh
│   ├── endpoints.ts      # every backend endpoint path, named — add here before calling it
│   ├── auth-storage.ts    # token get/set/clear, isAuthenticated()
│   ├── navigation.ts     # sidebar IA, breadcrumbs, quick-create, "coming soon" flags
│   ├── data.ts            # sample data still used by mock pages
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
5. If the page previously showed the "Preview layout" banner (i.e. it used
   `ListModule`/`MasterModule` on mock data), swap it to the real hook and drop those
   wrapper components in favor of `DataTable` directly, following the Customers page as the
   template.

## Current status

See `../MAGLISHE_ADMIN_STATUS.md` for the full module-by-module matrix. Short version: auth,
routing, the design system, and the Home/CRM/Customer dashboards are real and backend-connected.
Every other module (Leads, Quotations, CRM Orders, Invoices, Delivery, Catalog, Store
Operations, Marketing, Reports, Configuration) is still on sample data — those pages are
visibly flagged with a "Preview layout" banner and a "Soon" sidebar tag so nothing pretends to
be real.
# PDF template rollback

Quotation and invoice PDFs have two isolated templates. V2 is active by
default. Set `VITE_ACTIVE_PDF_TEMPLATE=v1` at build time to restore the frozen
V1 renderers without changing any CRM records, calculations, or API data.

<!-- Deploy pipeline re-verified after moving to the ZenTeqk/project_magilshe repo. -->
