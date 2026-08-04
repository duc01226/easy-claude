<!-- Last scanned: 2026-08-04 -->

# Frontend Patterns Reference

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Keep frontend guidance truthful to the current repository while preserving a ready scan target for adopters, so AI never invents application UI patterns.

**Summary:**

- Current repository: frontend patterns not applicable; root dependencies are repository tooling only (`package.json:2-8`), and frontend configuration is empty (`docs/project-config.json:106-118,134`).
- Important steps: retain N/A status → avoid treating copyable skill references as application code → after frontend adoption run `/scan --target=frontend-patterns` → replace this placeholder with evidence-backed patterns.

**Key rule:** MUST ATTENTION document frontend conventions only from application source with `file:line` evidence; NEVER infer them from framework skill examples.

## Status: Not Applicable

**easy-claude** is a Claude Code enhancement framework, not a frontend application (`docs/project-config.json:4-16,160`). No application components, services, state stores, forms, routing, or styling conventions exist to document.

### Why This File Exists

This placeholder gives `/scan --target=frontend-patterns` a stable output path for adopters. It prevents AI from treating copyable frontend examples under skill references as this repository's application conventions.

### Related Skills and Agents (for Target Projects)

easy-claude ships skill definitions and agents that produce frontend guidance for **other** projects — not for this repository:

- **Skills:** `/design` (multi-mode/lane), `/ui-ux-pro-max`, `/figma-design`, `/design-spec`
- **Shared protocols:** `ui-system-context.md`, `ui-wireframe-protocol.md`, `design-system-check.md`
- **Agents:** `frontend-developer`, `fullstack-developer`, `ui-ux-designer`
- **Scan skill:** `/scan --target=frontend-patterns` — run this after adopting easy-claude into a frontend project to populate this file with component patterns, service abstractions, state management conventions, and routing structure.

### When to Populate

Run `/scan --target=frontend-patterns` after integration into a repository containing a frontend application. Replace this placeholder only with verified component, form, state, API, routing, cleanup, directory, and styling patterns.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep frontend guidance truthful to the current repository while preserving a ready scan target for adopters, so AI never invents application UI patterns.

**IMPORTANT MUST ATTENTION** follow the full sequence: retain N/A status → exclude skill reference examples → run `/scan --target=frontend-patterns` after frontend adoption → populate only evidence-backed patterns.
**IMPORTANT MUST ATTENTION** cite application `file:line` evidence for every future frontend convention.
**IMPORTANT MUST ATTENTION** preserve the N/A state until actual frontend source and framework configuration exist.
