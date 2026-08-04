<!-- Last scanned: 2026-08-04 -->

# SCSS Styling Guide

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Quick Summary

**Goal:** Keep styling guidance grounded in authoritative declarations and isolated delivery surfaces, so AI applies real repository conventions without inventing SCSS or BEM patterns.

**Summary:**

- Current scope: three skill-local plain-CSS assets; no SCSS, import chain, BEM, mixins, or shared token system.
- Important steps: classify the target surface → scan only authored style roots → record declarations rather than usages → preserve each loading boundary → re-run `/scan --target=scss-styling` after SCSS adoption.

**Key rule:** MUST ATTENTION verify every token, color, breakpoint, selector, and mixin against an authoritative declaration; NEVER infer common SCSS defaults.

## Status: Limited Plain-CSS Scope

easy-claude has no SCSS/Sass source, mixins, functions, or repository-wide stylesheet. It does ship three isolated plain-CSS assets for the Novel Viewer and Markdown-to-PDF skills (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:1`, `.claude/skills/markdown-novel-viewer/assets/directory-browser.css:1`, `.claude/skills/markdown-to-pdf/assets/default-style.css:1`).

## BEM Methodology

No BEM selectors exist. Novel Viewer uses flat descriptive kebab-case classes such as `.reader-header`, `.font-controls`, and `.main-content`; states use additional classes such as `.sidebar.hidden` and `.font-btn.active` (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:79,246,270,298,499`). Preserve this convention inside those assets; do not invent BEM rules for the repository.

## SCSS Architecture

Each stylesheet belongs to one delivery surface; there is no import chain:

| Surface | Stylesheet | Loading boundary |
| --- | --- | --- |
| Novel reader | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css` | Linked by `template.html` (`.claude/skills/markdown-novel-viewer/assets/template.html:19-24`) |
| Directory browser | `.claude/skills/markdown-novel-viewer/assets/directory-browser.css` | Embedded by the HTTP server (`.claude/skills/markdown-novel-viewer/scripts/lib/http-server.cjs:250-265`) |
| PDF output | `.claude/skills/markdown-to-pdf/assets/default-style.css` | Default, replaceable stylesheet (`.claude/skills/markdown-to-pdf/scripts/lib/config-loader.cjs:68-76,87-93`) |

## Mixins & Variables

### Mixins & Functions

Not applicable: the authored style scope contains plain CSS only; no Sass variables, mixins, functions, includes, or extends were found.

### Variables & Tokens

Only `novel-theme.css` declares tokens. Document declarations, not usages:

| Category | Declaration pattern | Evidence |
| --- | --- | --- |
| Color | `--bg-*`, `--text-*`, `--accent`, `--border*`, `--link*` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:9-23` |
| Typography | `--font-heading`, `--font-body`, `--font-mono` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:25-28` |
| Layout | `--content-width`, `--sidebar-width`, `--header-height` | `.claude/skills/markdown-novel-viewer/assets/novel-theme.css:30-33` |

## Theming

The reader uses semantic light defaults in `:root` and dark overrides under `[data-theme="dark"]` (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:7-33,36-51`); runtime writes `html.dataset.theme` and switches syntax highlighting (`.claude/skills/markdown-novel-viewer/assets/reader.js:23-49`). The directory browser independently follows OS dark preference with `@media (prefers-color-scheme: dark)` and hardcoded colors (`.claude/skills/markdown-novel-viewer/assets/directory-browser.css:129-192`). PDF styling has no theme switch.

## Responsive Patterns

No named breakpoint variables or mixins exist. Raw viewport rules use `600px` and `900px` (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:228-237,729-788`; `.claude/skills/markdown-novel-viewer/assets/directory-browser.css:194-215`). Print rules are local to the reader and PDF surfaces (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:790-818`; `.claude/skills/markdown-to-pdf/assets/default-style.css:143-163`).

## Color Palette

Reader colors are semantic by role: background, text, accent, border, shadow, code, and link declarations (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:9-23,37-51`). Directory-browser and PDF colors remain hardcoded within their isolated surfaces; they do not consume reader tokens.

## Z-Index Scale

No managed scale exists. The only declaration is the fixed reader header layer `z-index: 100` (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:79-92`).

## Anti-Patterns

- **Undefined token:** `var(--accent-bg)` is used without a declaration in the authored CSS whitelist (`.claude/skills/markdown-novel-viewer/assets/novel-theme.css:120-123`). Define it beside the other semantic color tokens before relying on that hover background.
- **Cross-surface token assumptions:** treat the three stylesheets as isolated; `directory-browser.css` and `default-style.css` do not inherit reader tokens.
- **Invented SCSS/BEM guidance:** no source evidence supports Sass abstractions or BEM naming in this repository.

## Why This File Exists

This reference records the limited CSS assets now and remains the output location for `/scan --target=scss-styling` after adoption into an SCSS project.

### Related Skills (for Target Projects)

easy-claude includes skill definitions that guide SCSS work in **other** projects — not in this repository:

- **Skills:** `/design`, `/design-spec`, `/web-design-guidelines`
- **Shared protocols:** `design-system-check.md`, `ui-system-context.md`
- **Scan skill:** `/scan --target=scss-styling` — run this after adopting easy-claude into a project that uses SCSS to populate this file with mixins, variables, theming conventions, and responsive breakpoints.

### When to Populate

Run `/scan --target=scss-styling` after easy-claude is integrated into a project that contains `.scss` files. The scan will replace the limited plain-CSS guidance with project-specific SCSS conventions.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep styling guidance grounded in authoritative declarations and isolated delivery surfaces, so AI applies real repository conventions without inventing SCSS or BEM patterns.

**IMPORTANT MUST ATTENTION** follow the full sequence: classify surface → whitelist authored style roots → extract declarations only → preserve loading boundaries → rescan after SCSS adoption.
**IMPORTANT MUST ATTENTION** use flat kebab-case selectors inside current assets; no source evidence supports BEM.
**IMPORTANT MUST ATTENTION** treat reader, directory-browser, and PDF styles as isolated; share tokens only after explicit source changes.
**IMPORTANT MUST ATTENTION** verify future tokens, colors, breakpoints, selectors, and mixins at `file:line` before documenting them.
