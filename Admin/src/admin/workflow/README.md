# CRM Workflow Foundation

This package is declarative and opt-in. It is not imported by any CRM business page.

- `config/v1/`: approved status metadata, stages, transitions, transport references, validations and timeline event vocabulary derived from the current backend.
- `utils/`: generic selectors, guard/rule evaluation, stage resolution and timeline normalization.
- `components/`: generic Design System presentation components.

The browser configuration improves consistency and action visibility; it is not an authorization or integrity boundary. Django serializers and viewsets remain the source of truth and must revalidate every transition.

Hidden compatibility actions use `exposed: false`. They remain documented because the backend supports them, but generic action bars do not show them unless `includeHidden` is explicitly requested by an approved page.

No functional changes to Leads are permitted through this package. A Lead migration may only map existing behavior to the generic presentation components after explicit approval.
