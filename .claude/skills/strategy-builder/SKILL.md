---
name: strategy-builder
version: 1.0.0
description: '[Content] Use when building a marketing strategy — positioning, channels, messaging, campaigns, budget, KPIs.'
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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
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
