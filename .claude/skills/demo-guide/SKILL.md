---
name: demo-guide
version: 1.0.0
description: '[Documentation] Use when you need to generate a step-by-step demo guide (demo script / walkthrough) covering all main user stories and their test cases — scope from a named feature, else the current working context, else confirm with the user — explaining for each case how the domain data is stored/changed and how the domain solves the feature. Triggers: demo guide, generate demo guide, demo script, demo walkthrough, how to demo, prepare demo, sprint demo, user story demo.'
---

## Quick Summary

**Goal:** Produce a demo guide for a feature that (1) lists every **main user story** and its **test cases**, (2) gives a **detailed step-by-step demo flow** per case, and (3) explains for each case **how the domain data is stored or changed** and **how the domain solves the feature** — evidence-backed and project-agnostic.

**Summary (read this first):**

- **Scope precedence: prompt → current context → ASK** — never invent the feature silently.
- **Main steps in order:** (1) Resolve Scope · (2) Gather Evidence (specs/tests/PBIs/diff via `project-config`) · (3) Identify main stories + their REAL `TC-*` / test IDs · (4) Trace domain storage/solution per case · (5) Generate guide · (6) Validate.
- **Every main case carries 4 parts:** setup → step-by-step demo flow → expected result → how the domain stores/changes data & solves it — each with `file:line`.
- **Flags:** `feature-or-scope` arg · `--context` · `--output` · `--lang` · `--html` · `--stories`.

**Workflow:**

1. **Resolve Scope** — from the user prompt (named feature); else from the current working context (branch diff / active work / recent changes); else `AskUserQuestion` to confirm which feature. NEVER guess the feature silently.
2. **Gather Evidence** — discover the feature's specs/test-cases, stories/PBIs, changed code, domain entities, migrations, and handlers via `docs/project-config.json` + project-reference docs (portable — no hardcoded paths).
3. **Identify Stories & Cases** — group the main user stories, and under each the main test cases (real IDs from specs/tests, not invented).
4. **Trace Domain** — for each case, read the owning entity / value object / migration / handler and state exactly what is stored or changed and how it solves the case (`file:line`).
5. **Generate Guide** — write the demo guide markdown per the template (`references/demo-guide-template.md`): per-case demo steps + expected result + domain-storage explanation.
6. **Validate** — every case has step-by-step demo flow + expected result + storage/solution explanation + `file:line` evidence; be transparent about test-execution status.

**Key Rules:**

- **Scope precedence is prompt → context → ASK.** An explicit feature in the prompt wins; else derive from current work; else `AskUserQuestion` — never invent a feature.
- **Every case carries three parts:** numbered **step-by-step demo flow**, **expected result**, and **how the domain stores/changes data + solves the feature**. A case missing the storage/solution part is incomplete.
- **Cite `file:line` for every storage/behavior claim** — read the entity/migration/handler; never infer how data is persisted.
- **Portable — discover, don't hardcode.** Resolve source roots, test/spec locations, and output dir from `docs/project-config.json`; degrade gracefully when a project lacks specs or config.
- **Be transparent about proof** — mark each case as test-proven (ran) vs trace-verified/demo-only; never imply a green run that did not happen.

---

# Demo Guide Skill

Generate a stakeholder-ready demo guide that walks the team through a feature's main user stories and test cases, and — crucially — explains the domain data behind each case (what is stored/changed, and how that storage solves the requirement). This is what makes a demo credible: the presenter can show the behaviour AND explain the data that makes it true.

Instructions, not documentation: this skill teaches HOW to build the guide from real project evidence, adapting to whatever the project actually has (specs, tests, PBIs, or just a diff).

## Invocation

```
/demo-guide [feature-or-scope] [--context] [--output path] [--lang xx] [--html] [--stories "A,B"]
```

| Flag / arg          | Meaning                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `feature-or-scope`  | Named feature, spec title, PBI/story id, path, or free-text scope. Highest precedence.           |
| `--context`         | Force "derive scope from current working context" (branch diff / staged + unstaged / active work). |
| `--output path`     | Where to write the guide. Default: project demo-guide dir (see Configuration), else a temp file.  |
| `--lang xx`         | Also emit a translated copy in the given language (keep code identifiers/paths/IDs in English).   |
| `--html`            | After the markdown, offer/produce a self-contained HTML runbook (via the Artifact flow).          |
| `--stories "A,B"`   | Restrict to the named stories instead of all main stories.                                        |

## Step 1: Resolve Scope (prompt → context → ASK)

Apply the precedence strictly — this is the skill's defining behaviour:

1. **Prompt names a feature/scope** → use it. Normalise it to a concrete target: a spec file, a PBI/story id, a set of changed files, or a keyword set. Confirm the target resolves to real artifacts before proceeding.
2. **Prompt is empty / only "generate demo guide"** → derive scope from the **current working context**, in this order until one yields signal:
    - active task list / workflow goal (what is being worked on now),
    - `git status` + `git diff` (staged and unstaged) and the current branch name,
    - the most recent commit(s) on the branch vs the main branch,
    - any in-progress plan/spec/release-note under the project's plans/specs/release dirs.
3. **No usable signal from prompt or context** → **STOP and `AskUserQuestion`**: "Which feature should I generate the demo guide for?" Offer the best 2-4 candidates you did find (recent branches, changed areas, recent specs) plus free-text. NEVER pick one silently.

State the resolved scope and its source explicitly at the top of the run (e.g. "Scope: `<feature-name>` — derived from branch diff (N changed files)").

## Step 2: Gather Evidence (portable discovery)

Read `docs/project-config.json` (and the project-reference docs it points to) to locate — do NOT hardcode:

- **Source roots** (backend/frontend/service dirs) — where domain entities, handlers, migrations, models live.
- **Spec / feature-doc location** (e.g. `docs/specs/**`) — the canonical user stories, acceptance criteria, and `TC-*` test-case IDs.
- **Test locations** (integration/unit/e2e) — real test cases and their `Trait`/`describe`/`it` IDs, the ground truth of "what is proven".
- **Release notes / changelog / PBI-story** dirs — additional story framing.

For the resolved scope, collect: the governing spec section(s), the test files and their case IDs, the changed/added domain files, and any migration. If the project has **no specs**, derive stories from PBIs/release-notes/commit messages; if none exist either, derive them from the test files and the diff. Record what sources you used.

> When `.code-graph/graph.db` exists, run `python .claude/scripts/code_graph trace <entity-or-handler> --direction both --json` to map how a stored field flows to the reader that solves the case — this is how you back the "how the domain solves the feature" claim with structure, not guesswork.

## Step 3: Identify Main User Stories & Their Test Cases

- **Main user story** = a user-facing capability/outcome (the "As a … I want … so that …" the feature delivers). Prefer the spec's stories; else synthesise one per distinct capability from ACs/tests. Keep to the *main* stories — group minor variants under the case list, don't inflate.
- **Test cases per story** = the real cases that prove it: spec `TC-*` IDs and/or the integration/unit/e2e `it`/`[Fact]`/scenario names. Use the **actual IDs** — never invent case numbers. Reconcile the union of spec TCs and test-code cases; flag any story with no test case as a coverage gap.

Produce, internally, a story → cases map before writing. Cross-check it against the full changed-file list so no main area is missed.

## Step 4: Trace Domain Storage & Solution (the distinctive step)

For **each main case**, open the owning code and answer both questions with `file:line` evidence:

- **How is the domain data stored or changed?** — the persisted field(s)/column(s)/table, the value object or entity that owns it, the migration that added/altered it, the anchored/computed value actually written, and whether the change is additive/nullable/backfilled. Read the entity, the DTO mapping, and the migration — do not infer persistence from names.
- **How does the domain solve the feature?** — the rule/method/invariant that consumes that stored data to produce the demoed outcome (e.g. the resolver/derivation/gate), and why storing/changing it this way makes the case correct (edge cases, legacy fallback, cross-tier parity).

If a case is display-only or has no persistence change, say so explicitly and describe the **representation** that solves it instead (what value/shape is computed and why it's correct) — "no storage change" is a valid, important answer for a demo.

## Step 5: Generate the Demo Guide

Write the guide to the resolved `--output` path following `references/demo-guide-template.md`. Per **main case** the guide MUST contain:

1. **Setup / preconditions** — the exact state to stage before demoing (roles, configuration, seed data, which app/screen), driven through real user paths.
2. **Step-by-step demo flow** — numbered, concrete, click-/action-level steps a presenter can follow live (who does what, where, with what input).
3. **Expected result** — the observable outcome, phrased as the discriminator (what proves the feature works vs the old behaviour).
4. **How the domain stores/changes data + solves it** — the Step-4 explanation, in plain language for the team, with the `file:line` anchors kept for credibility.

Also include: a scope/source header, a per-story grouping, a **main test-case quick-reference table** (ID · what it proves · proven-by-test vs demo-UI), and a short **test-execution transparency** note. Keep prose tight (output-quality principles).

If `--lang` was given, emit a translated copy (prose translated; code identifiers, `file:line`, `TC-*` IDs, and numeric values kept as-is). If `--html` was given, follow the Artifact flow to render a self-contained runbook after the markdown is approved.

## Step 6: Validate

Before declaring done, verify:

- [ ] Scope resolution recorded, with its source (prompt / context / user-confirmed).
- [ ] Every main user story is present; each has its real test-case IDs (no invented numbers).
- [ ] Every case has all four parts: setup, step-by-step flow, expected result, domain storage/solution.
- [ ] Every storage/behaviour claim cites `file:line` (entity/migration/handler read, not inferred).
- [ ] Test-execution status is stated honestly per case (proven vs trace/demo-only).
- [ ] Output written to the resolved path; translation/HTML produced only if requested.

## Configuration

Resolve everything project-specific from `docs/project-config.json`; add an optional block to override demo-guide defaults:

```json
{
    "demoGuide": {
        "outputDir": "docs/demo-guides",
        "specDir": "docs/specs",
        "translateDefaultLang": null,
        "storyGranularity": "main"
    }
}
```

When the block or file is absent, degrade gracefully: default `outputDir` to the project's docs/demo dir if one exists, else a temp file; discover spec/test/source locations from the project-reference docs; and state the fallbacks you used.

## Integration with Other Skills

- **`/understand`** — reuse its Purpose→How→Why framing for the "how the domain solves the feature" explanation. ⚠️ **Boundary — decide by audience, not by overlap:** `/understand` §11 *Test & Demo* is **reviewer-facing** — how to run and see the change you are about to review, scoped to that change. This skill is **presenter-facing** — a standalone, stakeholder-ready script that walks a room through a whole feature. The per-case block is deliberately the same shape in both so they converge instead of drifting; showing finished work to people → here, preparing to review it → `/understand`.
- **`/investigate`** / **`/scout`** — locate the feature's spec, tests, and domain files when scope is broad.
- **`/spec`** — the canonical source of user stories + `TC-*` IDs when the project maintains feature specs. **A business `TC-*` and a demo case are the SAME event for two audiences** — the spec states it as intent, this guide stages it for a room. So they converge by construction: reuse the TC's demo flow and expected result rather than re-deriving them, and **cite the `TC-*` ID per case** so the two cannot drift apart. ⚠️ **A `TC-*` you cannot stage as a live demo is a finding, not a formatting problem** — it means a non-demoable (technical) case reached the business spec, which violates **M7**. Report it; do NOT invent a demo to cover for it.
- **`/release-doc`** / **`/changelog`** — sibling generators; `demo-guide` is presenter-facing (how to show it), they are change-facing (what changed).
- **`/commit`** — commit the generated guide if the user wants it version-controlled.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — one per story (gather → trace domain → write) so a long feature can't overflow context. Persist the story→case map early; don't hold it only in memory.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality principles: token efficiency, lead with answer, no filler.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a demo guide that lists every main user story + its real test cases, gives a step-by-step demo flow per case, and explains how the domain stores/changes data & solves the feature — evidence-backed, project-agnostic.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Understand Code First:** read the entity/migration/handler before explaining storage — never infer persistence.
- **Evidence-Based Reasoning:** every storage/behaviour claim cites `file:line`; state confidence; "insufficient evidence" is valid output.
- **Output Quality:** token efficiency, lead with the answer, no filler.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess.
- **AI Mistake Prevention:** verify against evidence, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** scope precedence is **prompt → current context → ASK** — never silently invent the feature
**IMPORTANT MUST ATTENTION** run the main steps in order, none skipped: (1) Resolve Scope → (2) Gather Evidence → (3) Identify stories + REAL `TC-*` / test IDs → (4) Trace domain storage/solution → (5) Generate guide → (6) Validate
**IMPORTANT MUST ATTENTION** every main case = setup + step-by-step demo flow + expected result + **how the domain stores/changes data & solves the feature**
**IMPORTANT MUST ATTENTION** use the project's REAL user stories and `TC-*` / test IDs — never invent case numbers
**IMPORTANT MUST ATTENTION** stay portable — discover paths via `docs/project-config.json`; never hardcode project specifics
**IMPORTANT MUST ATTENTION** state test-execution status honestly per case (proven vs demo-only); cite `file:line` for storage claims
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
