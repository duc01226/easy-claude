# Design System

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Status: Not Applicable

**easy-claude** is a Claude Code enhancement framework (hooks, skills, agents, workflows). It contains no UI components, no component library, and no design tokens. There is no design system to document here.

### Why This File Exists

This placeholder exists so that `/scan-design-system` and design-related skills have a known location to populate when easy-claude is adopted into a project that does have a design system. Without this file, future AI sessions would repeatedly attempt to scan the codebase for nonexistent UI primitives.

### Related Skills and Agents (for Target Projects)

easy-claude ships skill definitions and agents that produce design-system output for **other** projects — not for this repository:

- **Skills:** `/frontend-design`, `/interface-design`, `/ui-ux-pro-max`, `/figma-design`, `/wireframe-to-spec`, `/design-spec`, `/design-describe`, `/design-screenshot`, `/web-design-guidelines`
- **Shared protocols:** `design-system-check.md`, `ui-system-context.md`, `ui-wireframe-protocol.md`
- **Agents:** `ui-ux-designer`, `frontend-developer`, `fullstack-developer`
- **Scan skill:** `/scan-design-system` — run this after adopting easy-claude into a UI project to populate this file with actual design tokens, color palettes, and component inventories.

### When to Populate

Run `/scan-design-system` after easy-claude is integrated into a project that contains a component library or design token set. The scan will replace this placeholder with a full design-system reference.
