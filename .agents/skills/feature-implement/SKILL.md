---
name: feature-implement
description: '[Implementation] Use when implementing a feature step by step.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

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
2. **Plan** — Detailed plan via `$plan`; user approval required
3. **Implement** — Execute with full code review + SRE review
4. **Verify** — Run all tests, review changes, update docs

**Key Rules:**

- Maximum thoroughness: research → plan → implement → review → test → docs
- User approval required at plan stage
- Break work into todo tasks; add final self-review task

> **Renamed:** formerly `cook` — now `$feature-implement`. The old name no longer resolves as a slash command.

> **feature-implement vs plan-execute:** `feature-implement` takes an idea/feature description and goes idea → research → **plan (created here)** → shipped. Use `$plan-execute` instead when a plan file already exists and you only need disciplined phase-by-phase execution + commit. feature-implement owns the front of the pipeline (research + planning); plan-execute owns the back (phase gates + auto-commit + `--parallel`/`--approval`/`--tests` flags).

## Standalone Mode Pipeline (skip entirely if invoked inside a workflow)

> **MANDATORY — standalone `$feature-implement` only.** When invoked OUTSIDE a workflow, wrap the core spine in this quality loop. Detect an active workflow via the current task list FIRST: if a parent `[Workflow]` row exists, SKIP this section — the surrounding workflow already sequences plan/review/why-review around this skill (e.g. `workflow-feature` wraps feature-implement with exactly these steps).
>
> Create these as task tracking tasks up front, in order, then execute them:
>
> 1. **`$spec` — spec-driven, BEFORE any plan or code.** Create or update the tech-free 8-section Feature Spec under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) so the plan and implementation satisfy an agreed contract, not chat memory. Decide the case from evidence: net-new capability with no code yet → `$spec [mode=draft]` (provisional, `Evidence: TBD`); enhancement to an already-documented feature → `$spec [mode=update]`; behavior/contract change to existing spec → `$spec [mode=amend]`; buggy/undocumented area that now warrants a spec → `$spec [mode=init]`. If a governing spec already exists and fully covers this change, record `Spec verified current — no change` with `file:line` evidence and proceed. **Skip ONLY in fast mode** (ALL Default Mode Policy trivial-task conditions met — no behavior/contract change); record the skip reason. Decide the case explicitly — skip only the authoring, never the decision.
> 2. **`$plan`** — author the implementation plan from the spec. feature-implement's Comprehensive Planning phase (Step 2) satisfies this; emit a reviewable plan artifact under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides). Map each plan phase's `## Test Specifications` to the spec's §8 `TC-{FEATURE}-{NNN}` IDs.
> 3. **`$plan-review`** — recursively review/validate the plan; fix validated findings that block the current severity bar before implementing.
> 4. **Proceed** — execute the core implementation spine (research already done → implement → test → review → docs).
> 5. **`$spec [mode=sync]`** — *spec-driven closure.* Reconcile the spec's §8 `TC-{FEATURE}-{NNN}` ↔ integration tests and refresh `Evidence: TBD` markers to real `file:line` now that code exists. Run `$spec [mode=tests]` first if the implementation introduced behavior not yet captured as a test case. Skip only when step 1 was skipped (fast-mode trivial, no spec touched).
> 6. **`$changes-review`** — review the diff before commit.
> 7. **`$why-review`** — review rationale and change quality of the implementation.

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

> **Default mode HARD (full rigor).** Every section below — deep research, mandatory `$plan`, full `code-reviewer` review, mandatory tests, mandatory `$docs-update` — applies by default.
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
> **Fast mode skips (and only skips):** researcher subagent phase (direct grep instead), mandatory `code-reviewer` review (self-review only), separate test phase (verify inline). Does NOT skip `$plan` step, test execution, `$docs-update` triage.

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
- Use `$investigate` for comprehensive codebase analysis
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

## Next Steps (Standalone: MUST ATTENTION ask user by asking the user directly. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, MUST ATTENTION use ask the user directly to present these options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"Proceed with full workflow (Recommended)"** — Detect best workflow to continue from here (feature implemented). Ensures review, testing, docs steps aren't skipped.
- **"$code-simplifier"** — Simplify and clean up implementation
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — workflow handles sequencing.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
- The business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) — Test specifications by module (read existing TCs; generate/update via `$spec [mode=tests]` after implementation)

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

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call the current task list and re-read the phase file; verify `file:line` evidence before completion.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
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
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user by asking the user directly — never auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER skip `code-reviewer` review or test execution on non-trivial change

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via task tracking.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
