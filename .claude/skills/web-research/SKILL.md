---
name: web-research
version: 1.0.0
description: '[Research] Use when starting web research — discover, gather, and triage candidate sources to feed deeper investigation.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Run broad web research, classify and deduplicate candidate sources, and produce a tiered source map + gap list for `deep-research`, never a final report.

**Summary:**

- **Purpose:** Breadth-first discovery + triage for `deep-research`; produce a tiered, deduplicated source map, never synthesis.
- **Main steps (all 5, in order):** (1) Define scope — parse topic; generate 5-10 angle-varied queries (overview, current-state, comparison, data, expert, criticism); (2) Execute searches — run `WebSearch` per query (≤10 calls); record title/URL/snippet/source type; (3) Triage — classify each result Tier 1-4; dedupe; (4) Build map — write `.claude/tmp/_sources-{slug}.md` (Sources + Gaps Identified); (5) Identify gaps — note underexplored angles for `deep-research`.
- Hard-cap fan-out at 10 `WebSearch` calls/invocation; generate 5-10 varied queries, then stop; breadth then triage, not deep-dive.
- Tier every result (.gov/.edu/official > industry reports > established blogs/Wikipedia > forums/social); dedupe URL/syndicated content before counting.
- Deliverable: intermediate source map at `.claude/tmp/_sources-{slug}.md` (Sources + Gaps Identified), not synthesis; hand off to `deep-research`.
- Mine gaps: missing perspectives, quantitative data, stale recency; guide the next deep dive.

**Workflow:**

1. **Define scope** — Parse topic; generate 5-10 varied queries
2. **Execute searches** — Run `WebSearch`; collect results
3. **Source triage** — Classify each source Tier 1-4; dedupe
4. **Build source map** — Write structured source list to working file
5. **Identify gaps** — Note underexplored angles for `deep-research`

**Key Rules:**

- Maximum 10 WebSearch calls per invocation
- Follow source hierarchy: Official docs (Tier 1) > Peer-reviewed (Tier 2) > Industry blogs (Tier 3) > Forums (Tier 4)
- Output intermediate source map, not final report

**MUST ATTENTION** Apply skeptical, sequential thinking; trace every claim and state confidence (>80% to act).

# Web Research

## Knowledge Work Rules (canonical)

> **Web Research Protocol** — Factual claims require 2+ independent sources. Rank sources Tier 1 (.gov/.edu/official) > Tier 2 (industry reports) > Tier 3 (credible blogs; cross-validate) > Tier 4 (unverified; NEVER cite as fact). Declare confidence (95/80/60/<60%) for every finding.

1. Follow source hierarchy (official docs > peer-reviewed > industry blogs > forums) for factual claims
2. Cite sources with Tier classification (inline `[N]`)
3. Cross-validate claims with 2+ independent sources
4. Declare confidence: 95/80/60/<60%
5. Use enforced template; include all sections
6. Working files → `.claude/tmp/`; final output → `docs/knowledge/`

This protocol is canonical for knowledge/research rules; `deep-research` and `knowledge-synthesis` reference it.

## Step 1: Define Search Scope

Parse topic; generate 5-10 queries:

- **Definition/overview** — "what is {topic}"
- **Current state** — "{topic} 2026" or "{topic} latest"
- **Comparison** — "{topic} vs alternatives"
- **Data/statistics** — "{topic} market size" or "{topic} statistics"
- **Expert opinion** — "{topic} expert analysis" or "{topic} review"
- **Criticism/risks** — "{topic} challenges" or "{topic} risks"

## Step 2: Execute Searches

For each query:

1. Run `WebSearch`.
2. Record title, URL, snippet, apparent source type.
3. Stop after 10 calls.

## Step 3: Source Triage

For each result, classify Tier:

- **Tier 1:** .gov, .edu, official docs, peer-reviewed
- **Tier 2:** Industry reports, major publications
- **Tier 3:** Established blogs, verified experts, Wikipedia
- **Tier 4:** Forums, personal blogs, social media

Filter duplicate URLs and syndicated content.

## Step 4: Build Source Map

Write to `.claude/tmp/_sources-{slug}.md`:

```markdown
# Source Map: {Topic}

**Date:** {date}
**Queries executed:** {count}
**Sources found:** {count} (Tier 1: N, Tier 2: N, Tier 3: N, Tier 4: N)

## Sources

| #   | Title | URL | Tier | Relevance | Notes         |
| --- | ----- | --- | ---- | --------- | ------------- |
| 1   | ...   | ... | 1    | High      | Official docs |

## Gaps Identified

- {angle not covered}
- {topic needing deeper research}
```

## Step 5: Identify Gaps

Review source map for:

- Missing perspectives (only positive sources? need criticism)
- Missing data types (no quantitative data? need statistics)
- Recency issues (all sources old? need current data)

Note gaps for `deep-research`.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT in a workflow, use `AskUserQuestion`; user chooses. NEVER decide it is "simple enough" to skip:
>
> 1. **Activate `workflow-research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `/web-research` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, use `AskUserQuestion`; user chooses:

- **"/deep-research (Recommended)"** — Deep-dive into top sources
- **"/market-analysis"** — If sizing the market (TAM/SAM/SOM), competitors, trends — required before `/business-evaluation`
- **"/business-evaluation"** — If evaluating business viability. **Run `/market-analysis` first** — this skill consumes its sized-market output as evidence and MUST NOT re-derive market sizing.
- **"Skip, continue manually"** — user decides

> **[IMPORTANT MUST ATTENTION]** Use `TaskCreate` to break work into small tasks BEFORE starting.

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate + final results to `tmp/reports/`; prevents context loss and provides deliverable.

> **Evidence Gate:** **MANDATORY IMPORTANT MUST ATTENTION** Every claim, finding, recommendation needs `file:line` proof or traced evidence + confidence (>80% act; <80% verify first).

<!-- SYNC:web-research -->

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

<!-- /SYNC:web-research -->

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

**IMPORTANT MUST ATTENTION Goal:** Run broad web research, classify and deduplicate candidate sources, and produce a tiered source map + gap list for `deep-research`, never a final report.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Web Research:** Cross-validate every claim across 2+ credible sources; NEVER cite one source as authoritative.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced proof per claim, confidence >80% to act; NEVER present guess as fact.

**IMPORTANT MUST ATTENTION** run ALL 5 main steps in order — (1) define scope + generate 5-10 angle-varied queries → (2) execute `WebSearch` (≤10 calls), record title/URL/snippet/type → (3) triage each result Tier 1-4 + dedupe → (4) build source map at `.claude/tmp/_sources-{slug}.md` → (5) identify gaps for `deep-research` — why: skipping a step (esp. triage or gaps) yields untiered, gap-blind feedstock that breaks the next stage.
**IMPORTANT MUST ATTENTION** cap WebSearch at 10 calls per invocation; generate 5-10 angle-varied queries (overview, current-state, comparison, data, expert, criticism) then stop at the cap — why: bounded fan-out keeps this breadth-then-triage, not a deep-dive into one angle.
**IMPORTANT MUST ATTENTION** rank every source by tier (Tier 1 .gov/.edu/official > Tier 2 industry reports > Tier 3 established blogs/Wikipedia > Tier 4 forums/social) and dedupe by URL/syndicated content before it counts — why: tier ranking + dedupe keep the feedstock high-signal for deep-research.
**MANDATORY IMPORTANT MUST ATTENTION** NEVER cite a Tier 4 / single source as authoritative — cross-validate every factual claim against 2+ independent sources and declare confidence (95/80/60/<60%) — why: one unverified source = a hallucination-amplifier downstream.
**MANDATORY IMPORTANT MUST ATTENTION** the deliverable is the intermediate source map at `.claude/tmp/_sources-{slug}.md` (sources table + Gaps Identified), NOT a synthesized report — hand it off to `deep-research`; mine the set for gaps (missing perspectives, missing quantitative data, stale recency) so the next step knows where to dig.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; add a final review todo task to verify work quality; transition one task at a time.
**IMPORTANT MUST ATTENTION** persist intermediate findings/results to a report file in `tmp/reports/` for complex or lengthy work — why: external memory prevents context loss and is itself the deliverable.
**MANDATORY IMPORTANT MUST ATTENTION** if NOT already in a workflow, validate the route with the user via `AskUserQuestion` — NEVER auto-decide "simple enough to skip"; the user decides workflow vs. standalone `/web-research`.
**IMPORTANT MUST ATTENTION** every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first) — NEVER speculate without proof.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| "One strong source is enough"                | NEVER — cross-validate against 2+ independent sources; Tier 4 is never authoritative |
| "I'll just write the report now"             | Out of scope — output the source map + gaps; `deep-research` synthesizes, not this  |
| "Keep searching, more results help"          | Hard-cap is 10 WebSearch calls — breadth then triage, never an unbounded crawl      |
| "Topic is simple, skip tiering/dedupe"       | Tier + dedupe every source — untiered feedstock degrades every downstream step      |
| "Just do it, skip task tracking"             | Skip depth, never skip tracking — `TaskCreate` first, one task in progress          |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION Goal:** triaged, tiered, deduplicated source map + gap list as feedstock for `deep-research` — NOT a final report.
**IMPORTANT MUST ATTENTION** cap WebSearch at 10; cross-validate every claim with 2+ sources; NEVER cite Tier 4 as fact.
**IMPORTANT MUST ATTENTION** `TaskCreate` to break ALL work into small tasks BEFORE starting — this is very important.
