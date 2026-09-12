---
name: market-analysis
version: 1.0.0
description: '[Research] Use when analyzing the market landscape — competitors, TAM/SAM/SOM sizing, trends, SWOT, customer segments.'
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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

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
