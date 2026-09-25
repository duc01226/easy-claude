---
name: feature-implement
version: 1.0.0
description: '[Implementation] Use when implementing a feature step by step.'
execution-mode: subagent
context-budget: high
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ship a correct, fully-verified feature that satisfies the saved Goal Contract — implemented with deep research, comprehensive planning, and maximum quality verification (planned, reviewed, tested, documented) — with no skipped quality gate on any non-trivial change.

**Summary:** Resolve the saved goal and spec contract, research and trace the feature, obtain an approved plan, implement in verified phases, run tests and reviews, reconcile specs and docs, and close with evidence; use fast mode only when every trivial-task condition is satisfied.

**Workflow:**

1. **Research** — Deep investigation, multiple researcher subagents
2. **Plan** — Detailed plan via `/plan`; user approval required
3. **Implement** — Execute with full code review + SRE review
4. **Verify** — Run all tests, review changes, update docs

**Key Rules:**

- Maximum thoroughness: research → plan → implement → review → test → docs
- User approval required at plan stage
- Break work into todo tasks; add final self-review task

> **Renamed:** formerly `cook` — now `/feature-implement`. The old name no longer resolves as a slash command.

> **feature-implement vs plan-execute:** `feature-implement` takes an idea/feature description and goes idea → research → **plan (created here)** → shipped. Use `/plan-execute` instead when a plan file already exists and you only need disciplined phase-by-phase execution + commit. feature-implement owns the front of the pipeline (research + planning); plan-execute owns the back (phase gates + auto-commit + `--parallel`/`--approval`/`--tests` flags).

## Standalone Mode Pipeline (skip entirely if invoked inside a workflow)

> **MANDATORY — standalone `/feature-implement` only.** When invoked OUTSIDE a workflow, wrap the core spine in this quality loop. Detect an active workflow via `TaskList` FIRST: if a parent `[Workflow]` row exists, SKIP this section — the surrounding workflow already sequences plan/review/why-review around this skill (e.g. `workflow-feature` wraps feature-implement with exactly these steps).
>
> Create these as `TaskCreate` tasks up front, in order, then execute them:
>
> 1. **`/spec` — spec-driven, BEFORE any plan or code.** Create or update the tech-free 8-section Feature Spec under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) so the plan and implementation satisfy an agreed contract, not chat memory. Decide the case from evidence: net-new capability with no code yet → `/spec [mode=draft]` (provisional, `Evidence: TBD`); enhancement to an already-documented feature → `/spec [mode=update]`; behavior/contract change to existing spec → `/spec [mode=amend]`; buggy/undocumented area that now warrants a spec → `/spec [mode=init]`. If a governing spec already exists and fully covers this change, record `Spec verified current — no change` with `file:line` evidence and proceed. **Skip ONLY in fast mode** (ALL Default Mode Policy trivial-task conditions met — no behavior/contract change); record the skip reason. Decide the case explicitly — skip only the authoring, never the decision.
> 2. **`/plan`** — author the implementation plan from the spec. feature-implement's Comprehensive Planning phase (Step 2) satisfies this; emit a reviewable plan artifact under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides). Map each plan phase's `## Test Specifications` to the spec's §8 `TC-{FEATURE}-{NNN}` IDs.
> 3. **`/plan-review`** — recursively review/validate the plan; fix validated findings that block the current severity bar before implementing.
> 4. **Proceed** — execute the core implementation spine (research already done → implement → test → review → docs).
> 5. **`/spec [mode=sync]`** — *spec-driven closure.* Reconcile the spec's §8 `TC-{FEATURE}-{NNN}` ↔ integration tests and refresh `Evidence: TBD` markers to real `file:line` now that code exists. Run `/spec [mode=tests]` first if the implementation introduced behavior not yet captured as a test case. Skip only when step 1 was skipped (fast-mode trivial, no spec touched).
> 6. **`/changes-review`** — review the diff before commit.
> 7. **`/why-review`** — review rationale and change quality of the implementation.

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Default Mode Policy

> **Default mode HARD (full rigor).** Every section below — deep research, mandatory `/plan`, full `code-reviewer` review, mandatory tests, mandatory `/docs-update` — applies by default.
>
> **Opt out to fast mode ONLY when ALL true** (task genuinely trivial):
>
> - Single-file edit, ≤30 lines changed
> - No design choice (only one reasonable approach)
> - No cross-service impact, no contract change, no new dependency
> - No new pattern — follows existing codebase pattern
> - Existing tests cover change OR change non-functional (typo, comment, log message)
>
> **Any condition fails → use full protocol below.** When in doubt, default hard. Skipping review/tests on non-trivial change ships bugs.
>
> **Fast mode skips (and only skips):** researcher subagent phase (direct grep instead), mandatory `code-reviewer` review (self-review only), separate test phase (verify inline). Does NOT skip `/plan` step, test execution, `/docs-update` triage.

### Backend Context (if applicable)

> When task involves backend changes, read these directly before implementing:

Both docs below sit under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- CQRS commands/queries, validation, repositories, entity events: `backend-patterns-reference.md`
- Entity catalog, relationships, cross-service sync: `domain-entities-reference.md`
- **Repository type (service-specific):** when the project declares a per-service repository abstraction (`backendServices.serviceRepositories` in `docs/project-config.json`), use that repository type for the service — NEVER the generic root repository base.

### Frontend/UI Context (if applicable)

> When task involves frontend or UI changes:

All three live under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

**Ultrathink** plan and implement these tasks with maximum verification:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

<tasks>$ARGUMENTS</tasks>

**Mode:** Extra research, detailed planning, mandatory reviews.

## Workflow

### 0. Goal Contract Read (BEFORE implementation)

- Resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`: active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides) → create from the current request via `.claude/templates/goal-contract-template.md`.
- Read the saved success criteria BEFORE any code change — implementation serves the saved criteria, not chat memory.
- After implementation and verification, append an Iteration Log entry to the goal file: result, evidence references (`file:line`, command output), remaining gaps mapped to criteria.

### 1. Deep Research Phase

- Launch 2-3 `researcher` subagents in parallel covering:
    - Technical approach validation
    - Edge cases, failure modes
    - Security implications
    - Performance considerations
- Use `/investigate` for comprehensive codebase analysis
- Research reports max 150 lines each
- **External Memory:** Write all research to `tmp/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.
- **Pre-Implementation Trace Gate:** For bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix plans, MUST ATTENTION confirm the plan/referenced analysis includes `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and produce the missing-trace list before editing.

> After implementing, run `python .claude/scripts/code_graph connections <file> --json` on modified files; verify no related files need updates.

### Graph-Trace Before Implementation

When graph DB available, BEFORE writing code, trace blast radius:

- `python .claude/scripts/code_graph trace <file> --direction both --json` — what calls this code AND what it triggers
- `python .claude/scripts/code_graph trace <file> --direction downstream --json` — all downstream consumers
- Prevents breaking implicit dependencies (bus message consumers, event handlers)

### 2. Comprehensive Planning

- Use `planner` subagent with all research reports
- Create full plan directory:
    - `plan.md` — overview with risk assessment
    - `phase-XX-*.md` — detailed phase files
    - Success criteria per phase
    - Rollback strategy

### 3. Verified Implementation

- Implement one phase at a time
- After each phase:
    - Run type-check, compile
    - Run relevant tests
    - Self-review before proceeding

### Batch Checkpoint (Large Plans)

For plans with 10+ tasks, execute in batches with human review:

1. **Execute batch** — Complete next 3 tasks (or user-specified size)
2. **Report** — Show implementation, verification output, any concerns
3. **Wait** — Say "Ready for feedback" and STOP. Do NOT continue automatically.
4. **Apply feedback** — Incorporate changes, execute next batch
5. **Repeat** until all tasks complete

<HARD-GATE>
Plans with 10+ tasks — do NOT execute all tasks continuously without checkpoint.
Stop after every batch for human review. Prevents runaway execution where early
mistakes compound through later tasks.
</HARD-GATE>

### 4. Mandatory Testing

- Use `tester` subagent for full test coverage
- Write tests for:
    - Happy path scenarios
    - Edge cases from research
    - Error handling paths
- NO mocks or fake data
- Repeat until all tests pass

### 5. Mandatory Code Review

- Use `code-reviewer` subagent
- Apply the canonical review policy: Round 1 fixes every validated finding;
  Round 2 fixes only validated CRITICAL/HIGH/MEDIUM findings, while
  LOW-only findings are recorded as deferred and do not reopen the loop.
- Failed binary gates (tests, required artifacts, security must-fix, parity)
  block at every round and are never relabeled LOW.
- Re-run tests after fixes and start a fresh full review after every fix cycle.
- Stop when the current round's severity bar is clear; cap at two rounds — plus ONE extension round when round 2 leaves a validated CRITICAL/HIGH open — and
  escalate repeated/no-progress CRITICAL/HIGH/MEDIUM findings rather than
  looping open-ended.

### 6. Documentation Update

- Use `docs-manager` to update relevant docs
- Update plan status inline
- Record architectural decisions

### 7. Final Report

- Summary of all changes
- Test coverage metrics
- Security considerations addressed
- Unresolved questions (if any)
- Ask user to review and approve

## When to Use

- Critical production features
- Security-sensitive changes
- Public API modifications
- Database schema changes
- Cross-service integrations

## Quality Gates

| Gate     | Criteria                  |
| -------- | ------------------------- |
| Research | 2+ researcher reports     |
| Planning | Full plan directory       |
| Tests    | All pass, no mocks        |
| Review   | No blocking findings under the current severity bar; deferred LOWs listed |
| Docs     | Updated if needed         |

---

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"Proceed with full workflow (Recommended)"** — Detect best workflow to continue from here (feature implemented). Ensures review, testing, docs steps aren't skipped.
- **"/code-simplifier"** — Simplify and clean up implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — workflow handles sequencing.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
- The business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) — Test specifications by module (read existing TCs; generate/update via `/spec [mode=tests]` after implementation)

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `plan-quality` — Every plan phase carries test specifications and purpose-named contracts; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:plan-quality:reminder -->

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call `TaskList` and re-read the phase file; verify `file:line` evidence before completion.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:ui-system-context:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ship a correct, fully-verified feature that satisfies the saved Goal Contract — implemented with deep research, comprehensive planning, and maximum quality verification (planned, reviewed, tested, documented) — with no skipped quality gate on any non-trivial change.

**IMPORTANT MUST ATTENTION** follow the pipeline in order: resolve the Goal Contract → decide/create/sync the spec → research and trace → author and review the plan → implement one verified phase at a time → run full tests → review and fix validated findings that block the current severity bar → update docs/status → run spec sync, changes-review, and why-review → emit the final evidence report; use fast mode only when every opt-out condition passes.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above):**

- **End-To-Start Debugger Trace:** Trace observed output backward through every feeder path before fixing.
- **Source/Test Drift Check:** When source behavior changes, reconcile affected tests from evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** Read frontend, SCSS, and design-system docs before any UI change.
- **Graph-Assisted Investigation:** Run a graph command on key files when graph.db exists.
- **Nested Task Creation:** Expand child phase tasks and link the parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs (always `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap task tracking; persist plan/review findings incrementally to disk.
- **Critical Thinking Mindset:** Critical + sequential thinking; every claim needs traced proof, confidence >80%.
- **Understand Code First:** Search 3+ patterns and read code before any modification.
- **Plan Quality:** Add `## Test Specifications` with TC IDs to every plan phase.

- **MANDATORY IMPORTANT MUST ATTENTION** default mode HARD — opt out to fast mode ONLY when ALL trivial-task conditions met
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER skip `code-reviewer` review or test execution on non-trivial change

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via TaskCreate.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
