> **Design-System Check** — Before UI work, resolve the applicable design, accessibility, platform, styling, and component references from `docs/project-config.json`, its docs index, and existing code. Read only references that exist and apply to the surface; do not assume a web, mobile, desktop, or component framework.
>
> 1. Follow the configured project design-system docs for visual tokens, components, icons, themes, and interaction patterns where present.
> 2. Read the frontend/UI architecture and styling references that apply to the target surface; BEM, SCSS, stores, API wrappers, and base classes are requirements only when project config or evidence establishes them.
> 3. Use the project's component ownership taxonomy when documented; otherwise record actual owners and boundaries without imposing tiers or base abstractions.
> 4. Reuse or compose components when their behavior and platform fit; record a concrete reason when creating a new abstraction or diverging from an existing pattern.
>
> App-specific paths: check `docs/project-config.json` → `designSystem.appMappings[]` and `contextGroups[]`.
