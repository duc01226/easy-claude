<!-- Last scanned: 2026-08-04 -->

# Design System

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Separate verified skill-local UI assets from application-owned design-system authority, so AI reuses real tokens/components without promoting examples into nonexistent shared infrastructure.

**Summary:**

- Current scope: Novel Viewer runtime tokens plus copyable Remotion components; no configured app mapping, canonical token file, Storybook, or installed component library.
- Important steps: resolve configured authority → whitelist declarations/components → preserve ownership boundaries → record gaps → run `/scan --target=design-system` after application adoption.

**Key rule:** MUST ATTENTION treat tokens and components as shared only when configured ownership and declaration evidence support that scope; NEVER promote repeated values or scaffold examples by inference.

## Status: Limited Skill-Local System

easy-claude has no configured application design system, frontend app mapping, Storybook, or shared component package. It does contain a small semantic token set for the Markdown Novel Viewer and copyable Remotion component references; these assets are local to their owning skills, not repository-wide UI primitives.

## Design System Overview

Type: limited token-first/ad-hoc CSS. Novel Viewer owns the only runtime token chain: declarations in `novel-theme.css`, loading through `template.html`, and theme state in `reader.js` (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:7-51`; `.claude/skills/markdown-novel-viewer/assets/template.html:22,78`; `.claude/skills/markdown-novel-viewer/assets/reader.js:24-45`).

## App Documentation Map

| Scope | Design doc | Token/component source | Status |
| --- | --- | --- | --- |
| Configured frontend apps | None | None | `designSystem.appMappings` is empty (`docs/project-config.json:105-108`) |
| Markdown Novel Viewer skill | This limited reference | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css` | Functional skill UI, not application-wide |
| Remotion scaffold | `.claude/skills/remotion/SKILL.md` | `.claude/skills/remotion/refs/Shared.tsx` | Copyable reference, not installed library |

## Design Tokens

Authoritative named tokens exist only in the Novel Viewer surface; `var(...)` usages do not create new declarations.

| Category | Naming / authority | Evidence |
| --- | --- | --- |
| Colors/effects | `--bg-*`, `--text-*`, `--accent`, `--accent-hover`, `--border*`, `--shadow`, `--code-bg`, `--link*` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:9-23,37-51` |
| Typography | `--font-heading`, `--font-body`, `--font-mono` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:25-28` |
| Layout | `--content-width`, `--sidebar-width`, `--header-height` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:30-33` |
| Spacing/breakpoints/z-index | No named scale; raw local values only | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:91,229,730,754` |

## Component Inventory

No installed reusable application component library exists. The following are copyable Remotion scaffold references:

| Component | Category | Variants / state | Source |
| --- | --- | --- | --- |
| `ProgressBar` | Feedback | chapter index + total | `.claude/skills/remotion/refs/Shared.tsx:22-28` |
| `ChapterBadge` | Data display | label, color, entrance opacity | `.claude/skills/remotion/refs/Shared.tsx:31-55` |
| `CodeBlock` | Data display | line color, start frame, stagger, font size | `.claude/skills/remotion/refs/Shared.tsx:58-85` |
| `Pill` | Badge | color, opacity | `.claude/skills/remotion/refs/Shared.tsx:88-105` |
| `AnimRow` | Motion layout | up/left direction, distance, opacity | `.claude/skills/remotion/refs/Shared.tsx:107-118` |

Novel Viewer theme/sidebar/font controls are concrete DOM, not exported components. Native buttons carry accessible labels/titles, and keyboard shortcuts handle navigation and display controls (`.claude/skills/markdown-novel-viewer/assets/template.html:30-54`; `.claude/skills/markdown-novel-viewer/assets/reader.js:86-124`).

## Gap Analysis

- `designSystem.canonicalDoc` and `designSystem.tokenFiles` are not configured; do not infer paths from filenames (`docs/project-config.json:105-108`).
- No configured application mappings, Storybook stories, component barrel, or per-component library docs exist.
- `--accent-bg` is consumed without a declaration in the authored style scope (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:120-123`).
- Breakpoints, spacing, z-index, elevation geometry, and component token prefixes lack shared named scales.
- Remotion components are scaffold references; adoption into a real app requires ownership, accessibility review, and app-specific documentation.

## Icon & Asset Library

No icon library exists. Novel Viewer embeds one-off menu/sun/moon SVGs and links a favicon PNG (`.claude/skills/markdown-novel-viewer/assets/template.html:7,30-53`).

## Storybook

Not configured. No `.storybook/` or story files were found in the bounded source scan.

## Usage Guidelines

- Consume Novel Viewer tokens only inside that skill's reader surface; other CSS assets do not inherit them.
- Treat Remotion components as copyable scaffold examples, not installed shared components (`.claude/skills/remotion/refs/Shared.tsx:1-5`).
- Add repository-wide tokens/components only after configuring authoritative paths and app mappings.

### Why This File Exists

This reference distinguishes current skill-local UI assets from an adopted application design system and remains the output location for `/scan --target=design-system`.

### Related Skills and Agents (for Target Projects)

easy-claude ships skill definitions and agents that produce design-system output for **other** projects — not for this repository:

- **Skills:** `/design` (multi-mode/lane), `/ui-ux-pro-max`, `/figma-design`, `/design-spec`, `/web-design-guidelines`
- **Shared protocols:** `design-system-check.md`, `ui-system-context.md`, `ui-wireframe-protocol.md`
- **Agents:** `ui-ux-designer`, `frontend-developer`, `fullstack-developer`
- **Scan skill:** `/scan --target=design-system` — run this after adopting easy-claude into a UI project to populate this file with actual design tokens, color palettes, and component inventories.

### When to Populate

Run `/scan --target=design-system` after easy-claude is integrated into a project that contains a component library or design token set. Preserve skill-local boundaries until application-owned sources exist.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Separate verified skill-local UI assets from application-owned design-system authority, so AI reuses real tokens/components without promoting examples into nonexistent shared infrastructure.

**IMPORTANT MUST ATTENTION** follow the full sequence: resolve configured authority → whitelist declarations/components → preserve ownership → document gaps → rescan after application adoption.
**IMPORTANT MUST ATTENTION** keep Novel Viewer tokens local to its reader surface and Remotion components classified as copyable scaffold references.
**IMPORTANT MUST ATTENTION** verify every future token, component, variant, icon, and Storybook claim at `file:line`.
**IMPORTANT MUST ATTENTION** configure canonical doc, token paths, and app mappings before declaring a repository-wide design system.
