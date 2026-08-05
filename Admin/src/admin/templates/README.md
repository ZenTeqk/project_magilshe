# Admin Page Templates

These templates establish layout contracts without containing business behavior. They are opt-in and wrap only an intentionally migrated page in `AdminThemeProvider`.

- `DashboardPageTemplate`: header, KPI region, optional filters and dashboard content.
- `ListPageTemplate`: header, one primary action, search/filter toolbar and table.
- `DetailPageTemplate`: status/workflow, main details, optional contextual aside and sticky actions.
- `SettingsPageTemplate`: settings navigation, content card and sticky save actions.
- `WizardPageTemplate`: read-only progress, focused step content and sticky actions.

Pages remain responsible for API requests, validation, permissions and workflow transitions.
