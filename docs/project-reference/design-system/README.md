<!-- Last scanned: 2026-10-03 -->

# Design System

<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> Read this guide when reusing the Remotion scaffold palette/components or PDF print styling, or when deciding whether an application-owned design system exists.

## Quick Summary

**Goal:** Reuse verified skill-local visual assets while preserving their ownership and avoiding invented application-wide design authority.

- The maintained sources here are the Remotion scaffold palette/components and the PDF converter's default print stylesheet.
- Read the owning skill and declaration before copying a component, changing a palette or replacing PDF styling.
- Treat token values, usage examples and computed contrast as scoped records; they do not establish rendered accessibility compliance.
- Resolve configured authority → inspect declarations and consumers → preserve ownership → record applicable conventions/gaps. Scan does not enforce UI defaults or change visual source.

## Design System Overview

`docs/project-config.json` → `designSystem` points at this reference directory and has an empty `appMappings` list. No application token owner is configured. The evidenced visual sources are skill-local: `.claude/skills/remotion/refs/Shared.tsx:1–20` is a copyable scaffold template; `.claude/skills/pdf-convert/to-pdf/assets/default-style.css:1–7` is standalone print styling. Their source ownership is distinct from an installed application component library.

## App Documentation Map

| Scope | Read when | Authoritative source and consumption |
| --- | --- | --- |
| Configured applications | Resolving application design ownership: read `docs/project-config.json` → `designSystem.appMappings` | Empty mapping; do not infer a canonical app design doc. |
| Remotion scaffold | Creating/updating video scenes: read `.claude/skills/remotion/SKILL.md` → scaffold and scene steps | Copy `refs/Shared.tsx` and `refs/animations.ts` into the generated project's component/utility paths; scene templates consume them (`SKILL.md:221–227,288–305`). |
| PDF output | Replacing document print styling: read `.claude/skills/pdf-convert/SKILL.md` → PDF conversion | `to-pdf/assets/default-style.css` is selected by `to-pdf/scripts/lib/config-loader.cjs:68–76,87–103`; the converter passes it to `mdToPdf` (`converter.cjs:44–70` in that library directory). |

## Design Tokens

The Remotion `C` object declares `bg`, `surface`, `border`, `text`, `dim`, `blue`, `purple`, `green`, `amber`, `red`, `cyan` (`.claude/skills/remotion/refs/Shared.tsx:8–20`). `C.*` usages are consumers, not new declarations. The PDF stylesheet has literal local values and no named custom-property token chain. These observations apply to those sources, not every authored visual artifact in the repository.

To change a copied video palette, read `.claude/skills/remotion/SKILL.md:460–463`: edit its generated `Shared.tsx` palette; font ownership is per scene unless the adopting project chooses a shared owner. A caller-supplied PDF CSS file replaces the default stylesheet rather than layering onto it (`.claude/skills/pdf-convert/to-pdf/scripts/lib/config-loader.cjs:68–76,89–92`).

### UI/UX Convention Record

This records project authority and applicable gaps; it does not flag deviations as defects. Read `.claude/skills/ui-design/SKILL.md` when reviewing an actual user-facing interface. Defaults apply where the relevant adopting surface has no project convention.

| Clause | Source-backed local convention | Authority / gap |
| --- | --- | --- |
| `UI-2.5` type scale | Remotion owner defines eyebrow 14/700, hero 44–56/800, body 17–21/400, card 15–16/700 and mono 12–14/400 (`.claude/skills/remotion/SKILL.md:352–361`). PDF has body 12pt, h1 24pt, h2 18pt, h3 14pt, h4 12pt and print body 11pt (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:12,27,33,38–39,146`). | PROJECT AUTHORITY — skill-local roles override a forced six-step scale for these outputs. GAP — no repository-wide named six-step scale. |
| `UI-4.1` spacing | Remotion uses local values such as gap 10, top 36, left 48, padding 20px/24px and 5px/16px (`Shared.tsx:36,72,96`). PDF mixes cm/em/px (`default-style.css:6,21–22,81` at the sources above). | GAP — no declared shared 4px/8px base; default applies for a relevant future interface, not by deriving a scale from literals. |
| `UI-3.2` accent jobs | Six palette accents; progress uses blue→purple, chapter badge defaults blue (`Shared.tsx:14–19,26,32`). The other four have no fixed job in Shared. Owner guidelines use category color (`SKILL.md:356,359`). | PROJECT AUTHORITY — multicolor video scaffold overrides a single-accent assumption. GAP — no per-token one-job taxonomy. Do not infer status semantics from names. |
| `UI-3.1` contrast | Computed scoped pairs below; caller colors, parent opacity and unspecified PDF page backgrounds remain unmeasured. | GAP — no declared local contrast policy; 4.5:1 text / 3:1 UI-edge defaults apply where the interface requires them. Color declarations alone do not waive accessibility. |
| `UI-3.4` dark surfaces | `C.bg=#070d1a`, surface white alpha .04, border white alpha .08, softened text `#e8f0fe` (`Shared.tsx:9–12`). | PROJECT AUTHORITY — additive translucent lifting in the dark scaffold. No inverted-light algorithm or PDF dark-mode theme is declared in these sources. |
| `UI-5.4` motion | Frame-driven 18-frame badge/row and 14-frame code-line fades (`Shared.tsx:34,80,115`); `easeOut` uses cubic-bezier(.16,1,.3,1) (`.claude/skills/remotion/refs/animations.ts:6–10`). At the owner's 30fps composition example only, these are 600ms/~467ms (`SKILL.md:410`). | PROJECT AUTHORITY — video-timeline motion overrides interactive 150–250ms timing for this output. GAP — no reduced-motion handling in Shared/animations; apply relevant defaults when adopting into interactive UI. |

### Computed Contrast

Ratios use declared encoded-sRGB colors, alpha composited onto `C.bg` before luminance calculation. Assume settled opacity 1 and no parent opacity. `C.surface`/`C.border` have no universal backdrop; these values apply only to the stated composition. They are source measurements, not a rendered conformance verdict (`.claude/skills/remotion/refs/Shared.tsx:9–13,69–80`).

| Pair | Ratio |
| --- | ---: |
| `C.text` on `C.bg` | 16.94:1 |
| `C.dim` on `C.bg` | 4.71:1 |
| `C.dim` on `C.surface` composed over `C.bg` | 4.36:1 |
| `C.border` composed over `C.bg`, against `C.bg` | 1.20:1 |
| CodeBlock default `C.dim` on its `#0d1117` | 4.59:1 |
| PDF blockquote `#666` on declared `#fafafa` | 5.50:1 |

The PDF blockquote pair comes from `.claude/skills/pdf-convert/to-pdf/assets/default-style.css:109–110`. Body/link colors against the unspecified PDF page background, caller-supplied Pill colors and transient video fades are **unmeasured**. Review actual rendered usage when accessibility matters.

## Component Inventory

These exports are copyable Remotion scene references, not installed application primitives. The type declarations and defaults below are owned by `.claude/skills/remotion/refs/Shared.tsx`.

| Component / category | Props and supported state | Source |
| --- | --- | --- |
| `ProgressBar` / feedback | Required `chapterIndex`, `totalChapters`; progress width derives from their ratio; blue→purple gradient | `Shared.tsx:23–30` |
| `ChapterBadge` / data display | Required `index`, `label`; optional `color` defaults `C.blue`; entrance opacity is frame-driven | `Shared.tsx:32–56` |
| `CodeBlock` / data display | Required `lines` with text/optional color; defaults `startFrame=0`, `stagger=5`, `fontSize=16`; line color defaults `C.dim` | `Shared.tsx:59–86` |
| `Pill` / badge | Required `label`, `color`; optional `opacity=1`; alpha background/border strings derive from the supplied color | `Shared.tsx:89–106` |
| `AnimRow` / motion layout | Required `frame`, `startAt`, `children`; `direction` is `up` or `left` (default `up`); `distance=20` | `Shared.tsx:108–118` |

Read `.claude/skills/remotion/SKILL.md:288–305` when wiring scene consumers; keep chapter totals consistent when scenes change. The scoped components are display-oriented divs with no ARIA, keyboard or interactive-state contract. Their video rendering use does not establish an application accessibility guarantee.

The PDF stylesheet styles document elements and `.page-break`, not exported components (`.claude/skills/pdf-convert/to-pdf/assets/default-style.css:139–163`). Resulting document/PDF accessibility belongs to markup and renderer verification.

## Scope & Usage Guidelines

No icon library, Storybook adoption contract or app component barrel is declared by the two visual owners inspected here; this is not a claim that the repository ships no other media examples or visual assets. Read the owning skill's references when using additional scene/media templates.

Preserve skill-local ownership until an adopting project supplies authoritative token/component/docs roots and application mappings. Then run `scan --target=design-system` for that project's actual system. Framework design-producing skills serve adopting projects; their protocols are guidance, not this repository's product tokens.

## Closing Reminders

Resolve configured authority, inspect declarations and consumers, preserve ownership, then record relevant conventions/gaps. Keep copied Remotion references and replaceable PDF styling local to their owners. Compute contrast for declared pairs and verify rendered accessibility separately; never promote examples or repeated values into an application-wide system.
