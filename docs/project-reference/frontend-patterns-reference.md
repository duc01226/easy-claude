# Frontend Patterns Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Status: Not Applicable

**easy-claude** is a Claude Code enhancement framework (hooks, skills, agents, workflows). It has no frontend application — no Angular, React, Vue, or other UI framework code. There are no components, services, state management patterns, or routing configurations to document here.

### Why This File Exists

This placeholder exists so that `/scan-frontend-patterns` has a known output location when easy-claude is adopted into a project with a frontend application. Without it, future AI sessions would attempt to grep for component files, service patterns, and routing modules that do not exist in this codebase.

### Related Skills and Agents (for Target Projects)

easy-claude ships skill definitions and agents that produce frontend guidance for **other** projects — not for this repository:

- **Skills:** `/frontend-design`, `/interface-design`, `/ui-ux-pro-max`, `/figma-design`, `/wireframe-to-spec`, `/design-spec`
- **Shared protocols:** `ui-system-context.md`, `ui-wireframe-protocol.md`, `design-system-check.md`
- **Agents:** `frontend-developer`, `fullstack-developer`, `ui-ux-designer`
- **Scan skill:** `/scan-frontend-patterns` — run this after adopting easy-claude into a frontend project to populate this file with component patterns, service abstractions, state management conventions, and routing structure.

### When to Populate

Run `/scan-frontend-patterns` after easy-claude is integrated into a project that contains a frontend application. The scan will replace this placeholder with a full frontend patterns reference.
