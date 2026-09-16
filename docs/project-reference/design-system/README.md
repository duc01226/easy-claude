<!-- Last scanned: 2026-09-16 -->

# Design System

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Separate verified skill-local UI assets from application-owned design-system authority, so AI reuses real tokens/components without promoting examples into nonexistent shared infrastructure.

**Summary:**

- Current scope: one copyable Remotion scaffold palette plus its component references, and one standalone PDF print stylesheet; no configured app mapping, canonical token file, Storybook, or installed component library.
- Important steps: resolve configured authority → whitelist declarations/components → preserve ownership boundaries → record gaps → run `/scan --target=design-system` after application adoption.

**Key rule:** MUST ATTENTION treat tokens and components as shared only when configured ownership and declaration evidence support that scope; NEVER promote repeated values or scaffold examples by inference.

## Status: Limited Skill-Local System

easy-claude has no configured application design system, frontend app mapping, Storybook, or shared component package. It contains one exported palette object with copyable Remotion component references, and one isolated print stylesheet owned by the `pdf-convert` skill. These assets are local to their owning skills, not repository-wide UI primitives.

## Design System Overview

Type: limited scaffold-first/ad-hoc. There is no runtime token chain and no CSS custom property is declared anywhere in the authored scope. The only named-token surface is a TypeScript palette constant exported for copying into a scaffolded Remotion project (`.claude/skills/remotion/refs/Shared.tsx:8-20`).

## App Documentation Map

| Scope                    | Design doc                         | Token/component source                                       | Status                                                                   |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Configured frontend apps | None                               | None                                                         | `designSystem.appMappings` is empty (`docs/project-config.json:144-147`) |
| Remotion scaffold        | `.claude/skills/remotion/SKILL.md` | `.claude/skills/remotion/refs/Shared.tsx`                    | Copyable reference, not installed library                                |
| PDF output               | This limited reference             | `.claude/skills/pdf-convert/to-pdf/assets/default-style.css` | Standalone print stylesheet, not application-wide                        |

## Design Tokens

Authoritative named tokens exist only in the Remotion scaffold palette; usages of `C.*` do not create new declarations. The PDF stylesheet declares no tokens — every value there is a literal.

| Category                    | Naming / authority                                            | Evidence                                        |
| --------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Colors/surfaces             | `C.bg`, `C.surface`, `C.border`                               | `.claude/skills/remotion/refs/Shared.tsx:9-11`  |
| Text                        | `C.text`, `C.dim`                                             | `.claude/skills/remotion/refs/Shared.tsx:12-13` |
| Accent / status             | `C.blue`, `C.purple`, `C.green`, `C.amber`, `C.red`, `C.cyan` | `.claude/skills/remotion/refs/Shared.tsx:14-19` |
| Typography                  | No named scale; per-component `fontSize` props and literals   | `.claude/skills/remotion/refs/Shared.tsx:59,95` |
| Spacing/breakpoints/z-index | No named scale; raw local values only                         | `.claude/skills/remotion/refs/Shared.tsx:94,96` |

## Component Inventory

No installed reusable application component library exists. The following are copyable Remotion scaffold references:

| Component      | Category      | Variants / state                            | Source                                            |
| -------------- | ------------- | ------------------------------------------- | ------------------------------------------------- |
| `ProgressBar`  | Feedback      | chapter index + total                       | `.claude/skills/remotion/refs/Shared.tsx:23-30`   |
| `ChapterBadge` | Data display  | label, color, entrance opacity              | `.claude/skills/remotion/refs/Shared.tsx:32-56`   |
| `CodeBlock`    | Data display  | line color, start frame, stagger, font size | `.claude/skills/remotion/refs/Shared.tsx:59-86`   |
| `Pill`         | Badge         | color, opacity                              | `.claude/skills/remotion/refs/Shared.tsx:89-106`  |
| `AnimRow`      | Motion layout | up/left direction, distance, opacity        | `.claude/skills/remotion/refs/Shared.tsx:108-118` |

The PDF stylesheet exposes no components — it styles document elements plus one flat `.page-break` utility class (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:139-141`).

## Gap Analysis

- `designSystem.canonicalDoc` and `designSystem.tokenFiles` are not configured; do not infer paths from filenames (`docs/project-config.json:144-147`).
- No configured application mappings, Storybook stories, component barrel, or per-component library docs exist.
- No CSS custom property or SCSS variable is declared anywhere in the authored style scope — there is no runtime theming surface to extend.
- Breakpoints, spacing, z-index, elevation geometry, and component token prefixes lack shared named scales.
- Remotion components are scaffold references; adoption into a real app requires ownership, accessibility review, and app-specific documentation.

## Icon & Asset Library

No icon library exists and no icon asset is shipped in the authored scope.

## Storybook

Not configured. No `.storybook/` or story files were found in the bounded source scan.

## Usage Guidelines

- Treat the Remotion palette and components as copyable scaffold examples, not installed shared components (`.claude/skills/remotion/refs/Shared.tsx:1-2`).
- Keep the PDF stylesheet standalone; a caller-supplied `--css` path replaces it rather than layering on it.
- Add repository-wide tokens/components only after configuring authoritative paths and app mappings.

### Why This File Exists

This reference distinguishes current skill-local UI assets from an adopted application design system and remains the output location for `/scan --target=design-system`.

### Related Skills and Agents (for Target Projects)

easy-claude ships skill definitions and agents that produce design-system output for **other** projects — not for this repository:

- **Skills:** `/design` (multi-mode/lane and local design intelligence), `/design-spec`, `/web-design-guidelines`
- **Shared protocol blocks:** `SYNC:ui-system-context`, `SYNC:ui-wireframe-protocol`, and `SYNC:design-system-check` are defined in `.claude/skills/shared/sync-inline-versions.md:207,1172,1239`; consuming skills inline them.
- **Agents:** `ui-ux-designer`, `frontend-developer`, `fullstack-developer`
- **Scan skill:** `/scan --target=design-system` — run this after adopting easy-claude into a UI project to populate this file with actual design tokens, color palettes, and component inventories.

### When to Populate

Run `/scan --target=design-system` after easy-claude is integrated into a project that contains a component library or design token set. Preserve skill-local boundaries until application-owned sources exist.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Separate verified skill-local UI assets from application-owned design-system authority, so AI reuses real tokens/components without promoting examples into nonexistent shared infrastructure.

**IMPORTANT MUST ATTENTION** follow the full sequence: resolve configured authority → whitelist declarations/components → preserve ownership → document gaps → rescan after application adoption.
**IMPORTANT MUST ATTENTION** keep the Remotion palette and components classified as copyable scaffold references and the PDF stylesheet as a standalone, replaceable surface.
**IMPORTANT MUST ATTENTION** verify every future token, component, variant, icon, and Storybook claim at `file:line`.
**IMPORTANT MUST ATTENTION** configure canonical doc, token paths, and app mappings before declaring a repository-wide design system.
