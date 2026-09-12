---
name: deep-research
version: 1.0.0
description: '[Research] Use when deeply researching the top sources surfaced by web-research.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING MUST ATTENTION]** Execute declared steps in order; NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING MUST ATTENTION]** Update task tracking before/after each step or sub-skill: `in_progress` at start, `completed` at end.
> **[BLOCKING MUST ATTENTION]** Completed steps need brief evidence; skipped steps need explicit reason; if Task tools are unavailable, maintain an equivalent synchronized step tracker.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`.claude/tmp/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**Summary:**

- **Purpose/input:** Consume prior `.claude/tmp/_sources-{slug}.md`; prioritize Tier 1-2, high-relevance, gap-covering sources; NEVER start a fresh search.
- **Ordered path:** (1) load/prioritize source map → (2) fetch 5-8 sources with `WebFetch` (hard cap 8) → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write evidence base.
- **Confidence gate:** 2+ independent sources agree = high confidence; disagreement = both positions + discrepancy; one source = `single source, unverified`; declare 95/80/60/<60% for every finding.
- **Handoff/routes:** Write `.claude/tmp/_evidence-{slug}.md` with inline citations, `## Unresolved Discrepancies`, and `## Gaps Remaining`; standalone runs use `AskUserQuestion` for workflow/direct routing and post-completion choices.

**Workflow:**

1. **Read source map** — Load `.claude/tmp/_sources-{slug}.md`; prioritize Tier 1-2, high relevance, and gap coverage.
2. **Fetch top sources** — Run `WebFetch` for prioritized URLs; maximum 8 calls.
3. **Extract findings** — Capture claims, data points, quotes, methodology, publication date, author credentials, and source type.
4. **Cross-validate** — Compare findings; distinguish agreement, discrepancy, and unique-source claims; assign confidence.
5. **Build evidence base** — Write structured findings, citations, confidence, discrepancies, and gaps to the output path.

**Key Rules:**

- **MUST ATTENTION** Maximum 8 `WebFetch` calls per invocation; prioritize Tier 1-2 sources covering gaps.
- **MUST ATTENTION** Every finding cites a specific source and confidence percentage; factual claims need 2+ independent sources.
- **MUST ATTENTION** Conflicting claims → present both + flag discrepancy; one source → `single source, unverified`.
- **MUST ATTENTION** Output the intermediate evidence base, not final synthesis; preserve discrepancy and gap sections.

**Critical thinking:** Be skeptical; apply critical/sequential thinking; trace every claim and state confidence (>80% to act).

# Deep Research

## Knowledge Work Rules

> **Web Research Protocol** — Factual claims require 2+ independent sources. Rank sources Tier 1 (authoritative `.gov`/`.edu`/official docs) > Tier 2 (industry reports) > Tier 3 (credible blogs, cross-validated); Tier 4 is unverified and NEVER cite it as fact. Declare 95/80/60/<60% confidence; working files → `.claude/tmp/`, final output → `docs/knowledge/`.
>
> **MUST ATTENTION READ** `.claude/skills/web-research/SKILL.md` for canonical research rules.

## Step 1: Load Source Map

Read `.claude/tmp/_sources-{slug}.md` (web-research output). If missing or invalid, report missing input; NEVER start a fresh search.

Prioritize: (1) Tier 1-2; (2) high relevance; (3) identified gap coverage.

## Step 2: Fetch Top Sources

For each prioritized source (5-8 when available; maximum 8 total):

1. Run `WebFetch` with its URL
2. Extract key claims, data points, quotes, and methodology
3. Record publication date, author credentials, and source type

## Step 3: Extract Findings

For each fetched source, extract:

- **Key claims** — factual statements with specific data
- **Data points** — numbers, percentages, dates
- **Quotes** — notable expert statements
- **Methodology** — how data was gathered (for market reports)

## Step 4: Cross-Validate

Compare findings across sources:

- **Agreement** — 2+ independent sources agree → high confidence
- **Discrepancy** — sources disagree → record both positions + flag discrepancy
- **Unique** — one source only → mark `single source, unverified`; do not present as fact

## Step 5: Build Evidence Base

Write findings incrementally to `.claude/tmp/_evidence-{slug}.md`:

```markdown
# Evidence Base: {Topic}

**Date:** {date}
**Sources analyzed:** {count}

## Findings

### Finding 1: {Title}

**Confidence:** {95%|80%|60%|<60%}
**Sources:** [1], [3]
**Content:** {finding with inline citations}
**Cross-validation:** {agreement/discrepancy notes}

## Unresolved Discrepancies

- {claim X from source A vs claim Y from source B}

## Gaps Remaining

- {what couldn't be verified}
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, use `AskUserQuestion`; the user chooses:
>
> 1. **Activate `workflow-research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `/deep-research` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, use `AskUserQuestion` to offer:

- **"/market-analysis (Recommended)"** — Size the market (TAM/SAM/SOM), competitors, trends, SWOT, segments — the producer `/business-evaluation` consumes
- **"/business-evaluation"** — Evaluate business viability. **Run `/market-analysis` first** — this skill consumes its sized-market output as evidence and MUST NOT re-derive market sizing. Without it, every market figure must be marked N/A.
- **"/knowledge-synthesis"** — If synthesizing research report
- **"Skip, continue manually"** — user decides

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings + final results to `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence plus confidence percentage (>80% to act, <80% verify first).

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

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`.claude/tmp/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**IMPORTANT MUST ATTENTION Main path:** Run all 5 steps in order: (1) load/prioritize source map → (2) fetch 5-8 prioritized sources, maximum 8 `WebFetch` calls → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write the evidence base incrementally.
**IMPORTANT MUST ATTENTION Route gates:** Before standalone execution, use `AskUserQuestion` to choose `workflow-research` or `/deep-research`; after completion, offer `/market-analysis`, `/business-evaluation` (after `/market-analysis`), `/knowledge-synthesis`, or manual continuation.
**IMPORTANT MUST ATTENTION Evidence gate:** Every finding cites a source number and confidence; 2+ independent sources support factual claims; disagreements show both positions; one source is `single source, unverified`.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, NEVER guess-as-fact.

**IMPORTANT MUST ATTENTION** Cross-validation drives confidence: 2+ independent sources agree → high (95/80%); disagreement → both positions + discrepancy; one source → `single source, unverified`; `<60%` → say `insufficient evidence, verified: … / not verified: …` — NEVER collapse conflicts.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 calls; spend them on Tier 1-2 authoritative sources covering gaps; NEVER cite Tier 4 as fact.
**IMPORTANT MUST ATTENTION** This deep-dive consumes the prior `.claude/tmp/_sources-{slug}.md` map; NEVER start a fresh search.
**IMPORTANT MUST ATTENTION** Capture publication date, author credentials, source type, and methodology per source; verify facts, quotes, and numbers against fetched sources before recording — NEVER fabricate citations.
**IMPORTANT MUST ATTENTION** Deliverable MUST include `## Unresolved Discrepancies` and `## Gaps Remaining`; NEVER hide unverifiable content.
**IMPORTANT MUST ATTENTION** Break work into `TaskCreate` todos BEFORE starting; keep one `in_progress`; add a final review todo checking citation and confidence coverage.
**IMPORTANT MUST ATTENTION** Write findings incrementally to `.claude/tmp/_evidence-{slug}.md`; NEVER hold the full evidence base only in context.
**IMPORTANT MUST ATTENTION** Validate standalone/workflow routing with `AskUserQuestion`; never auto-decide the route.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "One good source is enough"                  | A lone source is "single source, unverified" — never high confidence. Cross-validate.      |
| "The sources roughly agree, call it settled" | Roughly ≠ exactly. Record the discrepancy with both positions; don't smooth it over.       |
| "I remember this stat from the page"         | Re-open the fetched source and verify the number/quote before citing. Memory hallucinates. |
| "I'll fetch a few more to be thorough"       | 8-call cap is the budget. Prioritize Tier 1-2 gap-coverage, not breadth.                    |
| "I'll write the evidence base at the end"    | Persist findings incrementally to `_evidence-{slug}.md` — a context cutoff loses batched work. |

**IMPORTANT MUST ATTENTION** Every finding cites a source + confidence (95/80/60/<60%); conflicts show both positions, lone source is `unverified`.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 Tier 1-2 calls and persist the evidence base incrementally to `.claude/tmp/_evidence-{slug}.md`.
**IMPORTANT MUST ATTENTION** Surface `## Unresolved Discrepancies` and `## Gaps Remaining`; never hide unverifiable content.

**IMPORTANT MUST ATTENTION** Follow ordered path: load/prioritize → fetch ≤8 → extract metadata → cross-validate → write required evidence sections; honor standalone route and post-completion user choices.
**IMPORTANT MUST ATTENTION** Cite every finding and confidence-score it; preserve disagreements and gaps; NEVER fabricate or present a lone source as fact.
**IMPORTANT MUST ATTENTION** Use the prior source map, cap `WebFetch` at 8, and persist output incrementally.
