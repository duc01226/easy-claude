---
name: market-analysis
version: 1.0.0
description: '[Research] Use when a workflow step or the user asks for a market landscape analysis. Competitors, TAM/SAM/SOM sizing, trends, SWOT, customer segments.'
---

## Quick Summary

**Goal:** Analyze a market landscape and deliver an evidence-backed market-analysis artifact—competitors, TAM/SAM/SOM, trends, SWOT, and customer segments—that downstream skills can consume as evidence.

**Summary:**

- **Purpose:** Produce evidence-backed market landscape analysis for `business-evaluation` and `strategy-builder`, not unsupported opinion.
- **Ordered path:** Classify and clarify scope; then (1) research 5-10 competitors, (2) size TAM/SAM/SOM, (3) analyze growth, disruption, regulation, and behavior trends, (4) evidence-link SWOT, and (5) segment customers by demographics, psychographics, behavior, and jobs-to-be-done.
- **Evidence gate:** Prefer Tier 1-2 sizing sources; every factual claim, number, table row, and inference ends `[N]` mapped to Sources or `N/A — {reason}`; every size claim cites source/year/methodology; never invent source metadata; SWOT requires evidence.
- **Handoff:** Use the enforced template; `workflow-research` `business-eval`/`marketing` uses parent `ARTIFACT_SLUG` + `MARKET_ANALYSIS_PATH` exactly; otherwise use the fallback path; return the exact written path and copy the plan-dir path when required.

**Workflow:**

1. **Define scope** — Industry, geography, segment, timeframe
2. **Research competitors** — WebSearch players, positioning, strengths/weaknesses
3. **Size market** — TAM/SAM/SOM from industry reports
4. **Identify trends** — Growth drivers, disruptions, regulatory changes
5. **SWOT analysis** — Synthesize Strengths/Weaknesses/Opportunities/Threats
6. **Segment customers** — Demographics, psychographics, jobs-to-be-done

**Key Rules:**

- Prefer Tier 1-2 sources for market sizing
- Every factual claim, number, table row, and inference must end with an inline `[N]` citation that maps to one Sources row; use `N/A — {reason}` when evidence is unavailable
- Cite source + methodology for every market-size claim
- Sources table must provide Title, URL, Author/Publisher, Date, and Tier for every source; never invent missing metadata
- Link SWOT items to evidence; no speculation
- **Risk profile:** analysis. Fresh-eyes review, specialist routing, inline sub-agent protocols, and recursive quality loops: N/A — this skill does not delegate or own fix convergence.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Market Analysis

## Precondition: Classify Inputs

Before research, classify scope and available evidence as present, missing, or ambiguous; clarify missing or ambiguous industry, geography, timeframe, and focus with user.

**Analysis lens:** For each step, run one focused `Think:` pass: what evidence supports, limits, or falsifies each finding?

## Step 1: Define Market Scope

Confirm scope with user:

- **Industry/vertical** — Market segment?
- **Geography** — Global, regional, or local?
- **Timeframe** — Current state or 3-year projection?
- **Focus** — B2B, B2C, or both?

## Step 2: Competitive Research

For each competitor (identify 5-10):

| Field                       | Source                       |
| --------------------------- | ---------------------------- |
| Company name                | WebSearch                    |
| Positioning/tagline         | Company website              |
| Key products                | Product pages                |
| Pricing model               | Pricing page or reports      |
| Strengths                   | Reviews, analyst reports     |
| Weaknesses                  | Reviews, customer complaints |
| Market share (if available) | Industry reports             |

## Step 3: Market Sizing

Use Tier 1-2 sources (Gartner, Statista, IBISWorld, government data):

- **TAM** (Total Addressable Market) — Maximum possible revenue at 100% market share
- **SAM** (Serviceable Addressable Market) — Accessible portion given constraints
- **SOM** (Serviceable Obtainable Market) — Realistic 3-year capture

Every number must cite source, year, methodology.

## Step 4: Trend Analysis

Research and categorize:

- **Growth drivers** — Forces fueling market growth
- **Disruptions** — Technology shifts, new entrants, business-model innovations
- **Regulatory** — New laws, compliance requirements, policy changes
- **Consumer behavior** — Preference changes, demographic shifts

## Step 5: SWOT Analysis

Each item must link to evidence:

| Category        | Item   | Evidence   |
| --------------- | ------ | ---------- |
| **Strength**    | {item} | Source [N] |
| **Weakness**    | {item} | Source [N] |
| **Opportunity** | {item} | Source [N] |
| **Threat**      | {item} | Source [N] |

## Step 6: Customer Segmentation

For each segment:

- **Demographics** — Age, role, income, company size
- **Psychographics** — Values, pain points, aspirations
- **Behavior** — Buying patterns, media consumption
- **Jobs-to-be-Done** — Desired accomplishment

## Output

**MANDATORY IMPORTANT MUST ATTENTION** Write the result via enforced `.claude/templates/market-analysis-template.md` to parent-provided `MARKET_ANALYSIS_PATH` when present; otherwise use `docs/knowledge/strategy/market-analysis/{descriptive-slug}.md` — why: downstream skills consume this as EVIDENCE; an informal or inline handoff without deterministic location and known shape fails silently, leaving consumers nothing to cite.

When invoked by `workflow-research` in `business-eval` or `marketing` mode, use parent-provided
`ARTIFACT_SLUG` and `MARKET_ANALYSIS_PATH` exactly; do not derive a new slug. Return the exact written
path in the completion handoff so the next skill can verify it before reading.

Consumed by:

- `business-evaluation` skill (business viability) — reads Sizing, Competitors, Trends, SWOT, Segments
- `strategy-builder` skill (marketing strategy)

When invoked inside a workflow that also writes to a plan directory, copy the file to `{plan-dir}/research/market-analysis.md` so the plan artifact set stays self-contained.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Analyze a market landscape and deliver an evidence-backed market-analysis artifact—competitors, TAM/SAM/SOM, trends, SWOT, and customer segments—that downstream skills can consume as evidence.

**IMPORTANT MUST ATTENTION Main path:** Classify and clarify scope/evidence; then run in order: (1) research 5-10 competitors, (2) size TAM/SAM/SOM, (3) analyze growth, disruption, regulation, and behavior trends, (4) evidence-link SWOT, and (5) segment customers by demographics, psychographics, behavior, and jobs-to-be-done. Write via the enforced template and complete the exact handoff path. NEVER skip, reorder, or merge steps.
**IMPORTANT MUST ATTENTION Modes/gates:** In `workflow-research` `business-eval`/`marketing`, use parent `ARTIFACT_SLUG` + `MARKET_ANALYSIS_PATH` exactly; otherwise use the fallback path; return the exact written path; copy the plan-dir artifact when required. Prefer Tier 1-2 sizing sources; every factual claim, number, table row, and inference ends `[N]` mapped to Sources or `N/A — {reason}`; cite size source/year/methodology; never invent metadata; link every SWOT item to evidence.
**IMPORTANT MUST ATTENTION** Apply critical/sequential thinking; run one focused `Think:` pass per step; cite source evidence and confidence; preserve uncertainty; never present unsupported findings as fact.
**IMPORTANT MUST ATTENTION** Create `TaskCreate` todos before starting; keep one `in_progress`, mark each completed with evidence, and add a final review todo. If task tools are unavailable, maintain equivalent synchronized statuses.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Market size is obvious; source later." | Cite source, year, and methodology now; use `N/A — {reason}` when unavailable. |
| "One competitor or source is enough." | Research 5-10 competitors; prefer Tier 1-2 sources and preserve metadata. |
| "SWOT is just judgment." | Link every item to evidence; label unavailable support `N/A — {reason}`. |
| "Output path is optional." | Use the enforced template/path contract, return the exact written path, and copy the plan-dir artifact when required. |

**IMPORTANT MUST ATTENTION** verify all claims, numbers, source metadata, and handoff paths before completion; NEVER guess, skip evidence, or weaken the output contract.
