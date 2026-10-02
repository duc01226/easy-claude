> **UI System Context** — Apply only to a user-interface surface; `.ts`, `.html`, `.scss`, or `.css` alone does not establish one.
>
> 1. Resolve applicable paths/conventions from `docs/project-config.json`, configured project-reference docs, accepted decisions, and code. Read only relevant frontend, styling, component, design, accessibility, or platform references.
> 2. Respect absent UI and explicit N/A. Require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers only when documented or demonstrated.
> 3. Follow configured/observed styling and component conventions. Use configured `componentSystem.layerClassification`; otherwise describe actual owners without imposing Common/Domain-Shared/Page tiers.
> 4. Reuse/compose abstractions whose contract and platform fit; otherwise use idiomatic local patterns. Do not create shared bases/wrappers to satisfy a checklist.
>
> Config customization: `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and configured reference docs.
