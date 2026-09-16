<!-- Last scanned: 2026-09-16 -->

# SCSS Styling Guide

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Keep styling guidance grounded in authoritative declarations and isolated delivery surfaces, so AI applies real repository conventions without inventing SCSS or BEM patterns.

**Summary:**

- Current scope: ONE skill-local plain-CSS asset; no SCSS, import chain, BEM, mixins, custom properties, or shared token system.
- Important steps: classify the target surface → scan only authored style roots → record declarations rather than usages → preserve the loading boundary → re-run `/scan --target=scss-styling` after SCSS adoption.

**Key rule:** MUST ATTENTION verify every token, color, breakpoint, selector, and mixin against an authoritative declaration; NEVER infer common SCSS defaults.

## Status: Limited Plain-CSS Scope

easy-claude has no SCSS/Sass source, mixins, functions, CSS custom properties, or repository-wide stylesheet. Phase 0 detection found no `*.scss`, `*.less`, `*.module.css`, `tailwind.config.*`, or CSS-in-JS dependency. It ships exactly one isolated plain-CSS asset, the default print stylesheet for the `pdf-convert` skill (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:1`).

## BEM Methodology

No BEM selectors exist. The single stylesheet is element-selector-driven (`body`, `h1`–`h6`, `pre`, `table`, `blockquote`) with one flat utility class, `.page-break` (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:139-141`). Preserve this convention inside that asset; do not invent BEM rules for the repository.

## SCSS Architecture

One stylesheet serves one delivery surface; there is no import chain:

| Surface    | Stylesheet                                                   | Loading boundary                                                                                                                                                     |
| ---------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF output | `.claude/skills/pdf-convert/to-pdf/assets/default-style.css` | Default, replaceable stylesheet resolved by path and passed to the renderer (`.claude/skills/pdf-convert/to-pdf/scripts/lib/config-loader.cjs:10,17-22,68-72,88-92`) |

A caller-supplied `--css` path replaces the default outright; the two are never merged.

## Mixins & Variables

### Mixins & Functions

Not applicable: the authored style scope contains plain CSS only; no Sass variables, mixins, functions, includes, or extends were found.

### Variables & Tokens

Not applicable: no CSS custom property (`--*`) or SCSS variable (`$*`) is declared anywhere in the authored style scope. Every value in the stylesheet is a literal.

## Theming

No theme system exists — no theme class, `data-theme` attribute, or `prefers-color-scheme` block. The only conditional block is a print media query that overrides body size, `pre` wrapping, and link colour, and appends the href after external links (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:144-163`).

## Responsive Patterns

No named breakpoint variables, mixins, or viewport media queries exist. Page geometry is declared once for print via `@page { size: A4; margin: 2cm; }` (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:4-7`); the only media query is `@media print` (`:144`).

## Color Palette

All colours are literals inside the one stylesheet, grouped by role:

| Role              | Declared values                             | Evidence                                                        |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Body text         | `#333`                                      | `.claude/skills/pdf-convert/to-pdf/assets/default-style.css:14` |
| Rules and borders | `#333` (h1), `#ccc` (h2), `#e1e4e8`, `#ddd` | `:28,34,50,80,106,134`                                          |
| Surfaces          | `#f6f8fa` (code/table header), `#fafafa`    | `:49,65,86,91,110`                                              |
| Link              | `#0366d6`, overridden to `#333` in print    | `:115,155`                                                      |
| Muted text        | `#666`                                      | `:109,161`                                                      |

## Z-Index Scale

No managed scale and no `z-index` declaration exists in the authored style scope.

## Anti-Patterns

- **Cross-surface token assumptions:** the PDF stylesheet is standalone; nothing inherits from it and it inherits from nothing.
- **Invented SCSS/BEM guidance:** no source evidence supports Sass abstractions, custom properties, or BEM naming in this repository.
- **Treating a custom `--css` path as an overlay:** a supplied stylesheet REPLACES the default (`.claude/skills/pdf-convert/to-pdf/scripts/lib/config-loader.cjs:68-72`); rules omitted from it are simply absent.

## UI/UX Clause Coverage

A RECORD of the project's actual conventions, never a grade — enforcement belongs to `ui-review`.

| Clause   | Project rule                                                       | `file:line`                                                         | Verdict                                                 |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- |
| `UI-2.2` | Print body `12pt`, reduced to `11pt` under `@media print`          | `.claude/skills/pdf-convert/to-pdf/assets/default-style.css:12,146` | PROJECT AUTHORITY — print surface, not a web body size  |
| `UI-2.3` | No measure/line-length constraint; `max-width: none` on body       | `:15`                                                               | PROJECT AUTHORITY — page width is bounded by `@page`    |
| `UI-2.5` | Fixed heading scale in points: 24 / 18 / 14 / 12                   | `:27,33,38,39`                                                      | PROJECT AUTHORITY — overrides the generic type scale    |
| `UI-4.1` | No spacing unit; spacing is em-relative (`0.2em`–`2em`) and ad hoc | `:21,22,43,52,75,97,101,107,135`                                    | GAP — no project convention; the clause default applies |
| `UI-4.2` | Spacing carried by child margins; no `gap` declaration exists      | `:21-22,43,75,96,101,107`                                           | PROJECT AUTHORITY — flow layout, no flex/grid container |
| `UI-4.4` | No viewport breakpoints; only the `print` media type               | `:144`                                                              | GAP — no project convention; the clause default applies |
| `UI-5.5` | No `:focus`/`:focus-visible` rule and no `outline` removal         | (no declaration)                                                    | GAP — no project convention; the clause default applies |

## Why This File Exists

This reference records the limited CSS assets now and remains the output location for `/scan --target=scss-styling` after adoption into an SCSS project.

### Related Skills (for Target Projects)

easy-claude includes skill definitions that guide SCSS work in **other** projects — not in this repository:

- **Skills:** `/design`, `/design-spec`, `/web-design-guidelines`
- **Shared protocol blocks:** `SYNC:ui-system-context` and `SYNC:design-system-check` are defined in `.claude/skills/shared/sync-inline-versions.md:207,1239`; consuming skills inline them.
- **Scan skill:** `/scan --target=scss-styling` — run this after adopting easy-claude into a project that uses SCSS to populate this file with mixins, variables, theming conventions, and responsive breakpoints.

### When to Populate

Run `/scan --target=scss-styling` after easy-claude is integrated into a project that contains `.scss` files. The scan will replace the limited plain-CSS guidance with project-specific SCSS conventions.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep styling guidance grounded in authoritative declarations and isolated delivery surfaces, so AI applies real repository conventions without inventing SCSS or BEM patterns.

**IMPORTANT MUST ATTENTION** follow the full sequence: classify surface → whitelist authored style roots → extract declarations only → preserve loading boundaries → rescan after SCSS adoption.
**IMPORTANT MUST ATTENTION** use element selectors and flat kebab-case utility classes inside the current asset; no source evidence supports BEM.
**IMPORTANT MUST ATTENTION** treat the PDF stylesheet as isolated and replaceable; a caller `--css` path substitutes it rather than layering on it.
**IMPORTANT MUST ATTENTION** verify future tokens, colors, breakpoints, selectors, and mixins at `file:line` before documenting them.
