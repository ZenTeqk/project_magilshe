# Magilshe Admin Design System

This package is opt-in. Importing components does not affect a legacy page; styles apply only beneath `AdminThemeProvider` (`.magilshe-admin-ds`). The approved Admin Shell uses scoped providers for its chrome, while its legacy business-page outlet remains outside the theme boundary.

## Structure

- `theme/`: semantic color, typography, spacing, radius, shadow, motion, icon and breakpoint tokens.
- `components/`: layout, navigation, common actions, forms, tables, dashboard, workflow and feedback primitives.
- `hooks/`: UI state and responsive helpers.
- `utils/`: display-only date, time, money and status helpers.

## Usage for an intentionally migrated surface

```jsx
import { AdminThemeController, AdminThemeProvider, PageContainer, PageHeader, PrimaryButton } from "../../admin/design-system";

<AdminThemeController>
  <AdminThemeProvider>
    <PageContainer>
      <PageHeader title="Example" actions={<PrimaryButton>Primary action</PrimaryButton>} />
    </PageContainer>
  </AdminThemeProvider>
</AdminThemeController>
```

`AdminThemeController` supports `light`, `dark`, and future-ready `system` preferences and persists the selection under `magilsheAdminTheme`. Use `useAdminTheme()` only for theme controls; components must use semantic `--mads-*` variables instead of checking the theme in page code.

## Rules

1. One primary action per screen/action region.
2. Pages own API calls and business decisions; primitives are presentation-only.
3. Advanced controls use progressive disclosure through sections, drawers or modals.
4. Never add page-specific selectors to this package.
5. New styling uses `mads-` classes and remains under `.magilshe-admin-ds`.
6. A page is wrapped only when its individual migration and regression pass are approved.
7. Prefer semantic tokens; do not introduce feature-specific colors or spacing.
8. Hardcoded palette values belong only in `theme/colors.js`; both themes must work without component overrides.

See repository documentation in `docs/ADMIN_DESIGN_SYSTEM.md`, `docs/ADMIN_THEME_SYSTEM.md`, `docs/COMPONENT_LIBRARY.md` and `docs/MIGRATION_PLAN.md`.
