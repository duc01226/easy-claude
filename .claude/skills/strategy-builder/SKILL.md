---
name: strategy-builder
version: 1.0.0
description: '[Content] Use when a workflow step or the user asks for a marketing strategy. Positioning, channels, messaging, campaigns, budget, KPIs.'
---

## Quick Summary

**Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**Summary:**

- **Main path:** load the market-analysis artifact → define positioning and differentiation → plan channels with budget and ROI → craft messaging → build the campaign roadmap with KPIs → assess risks and mitigations.
- **Evidence gate:** base positioning on competitive analysis, label market evidence, and make KPIs specific, measurable, and time-bound.

**Workflow:**

1. **Load market analysis** — Read market-analysis output
2. **Define positioning** — Value proposition, differentiation
3. **Plan channels** — Strategy with budget allocation + ROI
4. **Craft messaging** — Tagline, key messages, proof points
5. **Build campaign roadmap** — Phases with timeline and KPIs
6. **Risk assessment** — Marketing risks with mitigation

**Key Rules:**

- Positioning MUST ATTENTION reference competitive analysis
- Every channel: purpose, budget %, expected ROI, priority
- KPIs must be specific, measurable, time-bound
- Market evidence must be labelled as the exact market-analysis artifact or as unverified inline context; never silently treat the latter as reviewed research

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Strategy Builder

## Step 1: Load Market Analysis

When invoked by `workflow-research` marketing mode, read the exact parent-provided
`MARKET_ANALYSIS_PATH`; never derive a second slug. If that workflow artifact is missing, mark market
facts N/A and cap market-evidence confidence at 60% — do not silently substitute inline context.
Standalone inline context is allowed only when labelled **Unverified inline market context**. In that
mode, do not claim it is the market-analysis artifact, do not introduce uncited market-size figures,
mark unsupported market facts N/A, and cap market-evidence confidence at 60%. Extract only what the
evidence provenance supports: competitor landscape, target segments, SWOT, and market size.

## Step 2: Positioning

Based on competitive analysis:

- **Value proposition** — What unique value do we offer?
- **Differentiation** — How are we different from competitor X, Y, Z?
- **Brand voice** — Tone, personality, communication style

## Step 3: Channel Strategy

For each channel:

| Channel   | Purpose                           | Budget % | Expected ROI | Priority |
| --------- | --------------------------------- | -------- | ------------ | -------- |
| {channel} | {awareness/acquisition/retention} | {%}      | {X:1}        | P0/P1/P2 |

Total budget % must equal 100%.

## Step 4: Messaging Framework

- **Tagline** — One memorable line
- **Key messages** (3-5 pillars) — Core themes
- **Proof points** — Evidence supporting each message
- **Elevator pitch** — 30-second version

## Step 5: Campaign Roadmap

| Phase  | Timeline | Objective   | Tactics | KPIs      | Budget |
| ------ | -------- | ----------- | ------- | --------- | ------ |
| Launch | M1-M3    | Awareness   | {list}  | {metrics} | {$}    |
| Growth | M4-M6    | Acquisition | {list}  | {metrics} | {$}    |
| Scale  | M7-M12   | Retention   | {list}  | {metrics} | {$}    |

## Step 6: Risk Assessment

| Risk   | Likelihood | Impact | Mitigation |
| ------ | ---------- | ------ | ---------- |
| {risk} | H/M/L      | H/M/L  | {strategy} |

## Output

Write to `docs/knowledge/strategy/marketing/{descriptive-slug}.md` using enforced template from `.claude/templates/marketing-strategy-template.md`.

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

**IMPORTANT MUST ATTENTION Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**IMPORTANT MUST ATTENTION Main steps:** load market analysis → define positioning → plan channels, budget, and ROI → craft messaging → build campaign roadmap and KPIs → assess risks and mitigations.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
