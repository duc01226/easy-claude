---
name: plan-execute
description: '[Implementation] Use when a workflow step or the user asks for an existing plan to be coded and tested. Flags: --approval=off, --tests=off, --parallel={auto|on|off} (default off).'
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

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Complete the selected plan phase as working, fully-tested, reviewed, user-approved code through its testing, code review, and approval gates. Git operations are optional and require an explicit user request — NEVER bypass a quality or authority gate to declare done.

**Summary:**

- **Purpose:** consume an EXISTING plan, one phase per run — Step 0 detects `*.md` plan files under the plans root (default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) + selects the next incomplete phase (prefer IN_PROGRESS, else earliest Planned). Use `$feature-implement` instead when no plan exists yet — it creates plans, this consumes them.
- **Ordered execution anchor (run in declared order; emit `✓ Step N:` each):** Step 0 detect/select the plan → Step 1 read the plan fully, read the Goal Contract and Trace Gate, seed task tracking 0–6 → Step 2 implement step-by-step (type-check + compile; UI → `ui-ux-designer`) → Step 3 test (`tester` → `debugger` until 100%) → Step 4 review (`code-reviewer` until the current severity bar is clear: round 1 zero findings, round 2 zero CRITICAL/HIGH/MEDIUM with LOW deferred) → Step 5 explicit user approval (BLOCKING — stop and wait) → Step 6 finalize (main-session status update + `docs-manager`; optional `git-manager` only for an explicit user request).
- **Three BLOCKING gates cannot be faked-green:** Step 3 tests 100% pass, Step 4 has no blocking finding under the current round bar (round 1: no finding; round 2: no CRITICAL/HIGH/MEDIUM; failed binary gates always block), Step 5 explicit user approval before Finalize. These gates never grant Git authority. — why: quality acceptance and operation authority protect different boundaries.
- **Two STOP-before-coding gates:** Pre-Implementation Granularity Gate (refuse planning verbs / unnamed files / unresolved decisions → sub-plan with `$plan`) + bugfix Trace Gate (require the End→Start debugger trace for any bug/regression/behavior-changing plan). Also the Spec-Loop Gate (property TC + mutation-killed test + Dual-Feedback) closes any behavior change.
- **Step 2 is SEQUENTIAL by default; wave fan-out is OPT-IN.** `--parallel` / `--parallel=on` dispatches disjoint-write-set phases as one wave of `fullstack-developer` subagents in ONE message, barrier, then recomputes the next wave against the updated repo. `--parallel=auto` fans out ONLY when every in-scope phase carries the `## Parallel Execution` block (`PAR`/`SEQ` tag + declared write set) written by `$plan` — no block, no fan-out.
- **Mode flags** add/remove ONE step, never relax a running gate: `--approval=off` (auto/trust, skip Step 5, optional `$ALL_PHASES` loop over every incomplete phase), `--tests=off` (skip Step 3), `--parallel={auto|on|off}` (`off` default = sequential; bare `--parallel`/`on` opts in to wave dispatch; `auto` fans out only on plan-declared `PAR`/`SEQ` metadata). No flags = full 7-step spine, run sequentially.
- **Standalone** (no parent `[Workflow]` row via the current task list) → wrap the spine in plan → plan-review → proceed → `$changes-review` → `$why-review`, the two reviews as the LAST todos.

> **Slash-command routing:** `/code`, `/code-auto`, `/code-no-test`, `/code-parallel` no longer resolve — use `$plan-execute` with the matching flag: `/code-auto` → `--approval=off`, `/code-no-test` → `--tests=off`, `/code-parallel` → `--parallel`.

**Workflow:**

0. **Plan Detection** — Find latest plan or use provided path, select next incomplete phase
1. **Analysis & Tasks** — Read the phase file fully and extract tasks into task tracking
2. **Implementation** — Implement step-by-step, run type checks
3. **Testing** — Call tester subagent; must reach 100% pass before proceeding
4. **Code Review** — Call code-reviewer subagent; must clear the current severity bar: Round 1 has zero validated findings of any severity; Round 2 has zero validated CRITICAL/HIGH/MEDIUM findings, with LOW findings recorded/deferred. Failed binary gates always block.
5. **User Approval** — BLOCKING gate: wait for explicit user approval
6. **Finalize** — Update status/docs, report implementation complete; optionally handle an explicit Git request

**Key Rules:**

- Tests must be 100% passing (Step 3 gate)
- No blocking findings under the current Step 4 review bar (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; binary gates always block)
- User must explicitly approve before finalize (Step 5 gate)
- Implementation completion, review approval, and `--approval=off` never authorize staging, committing, or pushing. Dispatch Git only with `operation`, `scope`, and `sourceRequest` from an explicit user request; run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.
- One plan phase per command run — a multi-phase run requires `--approval=off` with `$ALL_PHASES=Yes`
- Phases run sequentially unless fan-out is explicitly opted in; even then, two phases writing the same file NEVER share a wave
- **Mode flags** (see [Mode Flags](#mode-flags)): `--approval=off` (auto/trust, no approval gate + optional all-phases loop), `--tests=off` (skip the test step), `--parallel={auto|on|off}` (default `off` = sequential; `on` = opt in to wave dispatch; `auto` = fan out only when the plan declares `PAR`/`SEQ` tags + write sets). No flags = full 7-step spine below, run sequentially.

**MUST ATTENTION READ** `CLAUDE.md` then **THINK HARDER** to start working on the following plan:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<plan>$ARGUMENTS</plan>

---

> **plan-execute vs feature-implement:** `plan-execute` **executes an EXISTING plan** phase-by-phase (Step 0 detects `*.md` plan files under the plans root — default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) and owns the back of the pipeline — phase gates, completion reporting, optional explicitly requested Git operations, and the `--parallel`/`--approval`/`--tests` flags. Use `$feature-implement` instead when you have only a feature description and need research + planning done first. feature-implement creates plans; plan-execute consumes them.

## Standalone Mode Pipeline (skip entirely if invoked inside a workflow)

> **MANDATORY — standalone `$plan-execute` only.** When this skill is invoked OUTSIDE a workflow, wrap the core spine (Steps 0-6) in this quality loop. Detect an active workflow via the current task list FIRST: if a parent `[Workflow]` row exists, SKIP this section — the surrounding workflow already sequences plan/review/why-review (e.g. `workflow-refactor`).
>
> Create these as task tracking tasks up front, in order, then execute them:
>
> 1. **`$plan`** — if Step 0 finds no plan for the request, author one first. If a plan already exists, record that and skip to step 2.
> 2. **`$plan-review`** — recursively review/validate the plan; fix validated findings that block the current severity bar before proceeding.
> 3. **Proceed** — run the core spine (Steps 0-6) against the approved plan.
> 4. **`$changes-review`** — review the diff before commit (the post-gate; see *Standalone Review Gate* below).
> 5. **`$why-review`** — review rationale and change quality of the implementation.
>
> This is the single pre+post quality loop for standalone runs.

## Mode Flags

`$plan-execute` runs the full step spine below by default. Optional flags adapt the spine for the cases formerly served by dedicated skills — each flag only adds or removes a single step against the **host step numbering** (Step 3 Testing, Step 4 Code Review, Step 5 User Approval, Step 6 Finalize); the shared spine and every quality bar are otherwise unchanged.

| Flag | Default | Effect |
| ---- | ------- | ------ |
| `--approval={on\|off}` | `on` | `off` = **trust/auto mode**: skip the Step 5 implementation-approval blocking gate and finalize without waiting; never grants Git authority. Pair with `$ALL_PHASES` to run every incomplete phase in one pass. |
| `--tests={on\|off}` | `on` | `off` = skip the Step 3 Testing gate entirely (Implementation → Code Review → Approval → Finalize only). Use ONLY when the plan explicitly defers tests. |
| `--parallel={auto\|on\|off}` | `off` | `off` = **default**: implement every phase sequentially in the main agent. `on` (also bare `--parallel`) = **explicit opt-in**: Step 2 groups disjoint-write-set phases into waves of `fullstack-developer` subagents with strict file-ownership boundaries; the user has accepted the risk, and YOU must still name every phase's write set — including its cascade/generated writes — before grouping. `auto` = **metadata-gated**: fan out only when every in-scope phase carries a `## Parallel Execution` block (`PAR`/`SEQ` tag + declared write set) written by `$plan`; absent that block, fall back to sequential — NEVER derive write sets optimistically. |

**`$ALL_PHASES` (only meaningful with `--approval=off`):** `Yes` (default in auto mode) processes ALL incomplete phases in one run, auto-looping to the next phase after each Finalize; `No` implements one phase then asks before continuing. With `--approval=on` (default), always one phase per run — so cross-phase wave dispatch is only ever reachable in a multi-phase run (`--approval=off` + `$ALL_PHASES=Yes`) or on a phase whose sub-phases are independently implementable.

### Flag-modified step behavior

- **`--parallel=auto` → Step 2 (Implementation):** metadata-gated fan-out — dispatch waves ONLY when every in-scope phase carries a `## Parallel Execution` block written by `$plan`; the moment one phase lacks it, the whole run reverts to sequential. `auto` NEVER derives a write set from the plan's prose — see [Step 2 Wave Dispatch](#step-2-wave-dispatch-opt-in---parallelon).
- **`--parallel` / `--parallel=on` → Step 2:** the explicit opt-in — dispatch waves even when the plan declares no `PAR`/`SEQ` tags or `## Execution Waves` line. You MUST first derive each phase's write set yourself from its `Related Code Files` / Implementation Steps **and** from the generated/mirrored artifacts those edits cascade into; a phase whose write set you cannot name stays out of the wave. Colliding phases still go in different waves — opting in never authorizes co-scheduling two writers of one file.
- **`--parallel=off` (DEFAULT) → Step 2:** no wave dispatch; implement every phase sequentially in the main agent. This is the normal path and needs no justification — no flag is required to stay sequential. All gates and quality bars unchanged.
- **`--tests=off` → Step 3 (Testing):** Skip entirely. Proceed Implementation → Code Review. The Source/test drift check still applies to any tests that already exist. Keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, or use fake data to make them pass — why: faked green hides the regression the test exists to catch.
- **`--approval=off` → Step 5 (User Approval):** Skip the implementation-approval blocking gate. Finalize (status, docs, completion report) runs once Steps 1-4 pass; this flag never grants Git authority. When `$ALL_PHASES=Yes`, each phase's running gates are compile plus its targeted check, then loop back to Step 0 for the next incomplete phase; after the last phase, run Step 3 and Step 4 once over the whole changeset, then generate the summary report and ask about `/preview`.

> **Behavior preserved:** the debugger-trace gate, granularity gate, testing/review quality bars, and all SYNC blocks apply in EVERY mode. Flags change *which gates run*, never *how rigorously a running gate is enforced*.

---

## Pre-Implementation Granularity Gate (MANDATORY)

<HARD-GATE>

If ANY check fails → STOP. Ask user: "Phase needs more detail before implementation. Refine with $plan? [Y/n]"
Implement only phases with named files, concrete actions, and resolved decisions — DO NOT implement a phase containing planning verbs, unnamed files, or unresolved decisions.
</HARD-GATE>

---

## Step 0: Plan Detection & Phase Selection

**If `$ARGUMENTS` is empty:**

1. Find latest `plan.md` in `./plans`
2. Parse plan for phases and status, auto-select next incomplete (prefer IN_PROGRESS or earliest Planned)

**If `$ARGUMENTS` provided:** Use that plan and detect which phase to work on.

**Output:** `✓ Step 0: [Plan Name] - [Phase Name]`

---

## Workflow Sequence

**Rules:** Follow steps 1-6 in order. Each step requires output marker `✓ Step N:`. Mark each complete in task tracking before proceeding. Do not skip steps.

---

## Step 1: Analysis & Task Extraction

Read plan file completely. Map dependencies. List ambiguities. Identify required skills and activate from catalog. If the plan references analysis files in `tmp/analysis/`, re-read them before implementation.

**Goal Contract read (BEFORE any code change):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` — active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) → create from the current request via `.claude/templates/goal-contract-template.md` — and read its saved success criteria. After implementation/verification (Step 3+), append an Iteration Log entry with evidence and remaining gaps.

**Pre-Implementation Trace Gate:** If the plan is for a bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix, MUST ATTENTION verify the plan or referenced analysis includes `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and report the missing trace links instead of implementing.

**task tracking Initialization:**

- Initialize task tracking with `Step 0: [Plan Name] - [Phase Name]` and all steps (1-6)
- Read phase file, look for tasks/steps/phases/sections/numbered/bulleted lists
- Convert to task tracking tasks with UNIQUE names:
    - Phase Implementation tasks → Step 2.X (Step 2.1, Step 2.2, etc.)
    - Phase Testing tasks → Step 3.X
    - Phase Code Review tasks → Step 4.X

**Output:** `✓ Step 1: Found [N] tasks across [M] phases - Ambiguities: [list or "none"]`

---

## Step 2: Implementation

Implement selected plan phase step-by-step following extracted tasks. Mark tasks complete as done. UI work → call `ui-ux-designer` subagent. Run type check + compile to verify.

**UI phases carry the design brief (`DD-1`–`DD-3`).** Before implementing — or briefing a sub-agent for — any phase that creates or reshapes a user-facing surface, read the phase file's `## UI Layout` → `### Design Plan` and the project's design-system / SCSS / token docs, and construct the surface to that plan: its palette, families, scale, alignment, and named memorable element. Pass the plan verbatim into any sub-agent brief (per `.claude/skills/shared/sub-agent-selection-guide.md`) — a leaf agent inherits nothing from this conversation. **If the phase has no Design Plan and the surface is new, do NOT improvise one silently:** state that the plan is missing, propose the four parts, and confirm before proceeding. Values land as tokens, never raw hex or magic numbers.

### Step 2 Wave Dispatch (opt-in — `--parallel=on`)

Fan-out is OFF unless opted in. Run this section only when BOTH hold: (a) this run covers more than one phase (`$ALL_PHASES=Yes`, or a phase whose sub-phases are independently implementable), AND (b) the user passed `--parallel` / `--parallel=on`, or passed `--parallel=auto` and every in-scope phase carries a `## Parallel Execution` block. Either condition unmet → implement sequentially. Sequential is the safe default and needs no justification.

1. **Take the write set of every in-scope phase from the plan's declaration** — its `## Parallel Execution` block (Mode · Write set · Wave · SEQ dependency) written by `$plan`. Under `--parallel=auto` that block is MANDATORY: a plan lacking it falls back to sequential, and you NEVER reconstruct a write set from `Related Code Files` / Implementation Steps — why: a derived write set structurally cannot see cascade or generated writes, so two phases editing different source files can both write the same generated/mirrored/catalog/lockfile artifact that neither phase would ever name, and the wave corrupts it. Under `--parallel=on` the user has accepted that risk: derive the set yourself, then explicitly enumerate the generated, mirrored, and regenerated artifacts each phase's edits trigger and add them to that phase's write set before grouping. A phase whose write set still cannot be named is INELIGIBLE for a wave — implement it inline or send it back to `$plan`.
2. **Refuse to co-schedule two writers of the same file** — ANY path shared between two phases puts them in different waves. No "they only touch different functions" exception: the unit of ownership is the file. A phase tagged `SEQ`, or whose named dependency has not yet returned, never joins the current wave.
3. **Declare, then spawn in ONE message** — emit `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`, then spawn EVERY member of the wave in a single response as `fullstack-developer` subagents (UI-only phase → `ui-ux-designer`; route other specialties per `.claude/skills/shared/sub-agent-selection-guide.md`). Brief each with: its phase-file path, environment info, its EXCLUSIVE file-ownership boundary (cross-boundary edits forbidden — report the conflict instead), and its return contract.
4. **Barrier, then re-evaluate against the updated repo** — advance only after EVERY member returns. The barrier is YOUR accounting, not a signal you wait for: hold the wave's member list in the task tracker and mark each member by name as `returned` / `failed` / `timed-out` / `partial`. An unaccounted member is never dropped and never assumed successful. When every member is accounted for AND all returned cleanly, verify no file was written outside its owner's boundary, run type-check + compile on the merged result, THEN recompute the next wave against the repo as it now stands — never against the wave plan you computed before dispatch, because a returned phase can change what a later phase writes.
5. **Wave failure branch — the barrier does NOT advance on an incomplete wave.** If any member fails, times out, or returns partial work:
    - **Classify partial as FAILED.** A member reporting "mostly done", or whose evidence does not match its declared write set, counts as failed — not returned.
    - **Never let the survivors stand in for the missing member,** and never proceed to Step 3 on a wave that is not fully accounted for.
    - **Quarantine the failed member's work** — inspect exactly what it wrote, and revert its partial edits if they leave the tree uncompilable. Record the files it touched.
    - **Fall back to sequential for that phase** — merge the clean returns, restore compile-green, then re-implement the failed phase INLINE in the main agent (never re-dispatch it into another wave). A phase that also fails sequentially → STOP and report; do not carry it into the next wave.
    - **A cross-boundary write fails the whole wave** — revert the out-of-boundary edits, re-run that phase sequentially, and drop fan-out for the remainder of the run: the write-set model that authorized the wave is proven wrong.
    - **In-flight early-dispatched phases are part of the failure** — before reverting or re-running anything, wait for every early-dispatched single-member wave that is still running to return, account for it by name like any other member, and apply this branch to it too; never revert or re-run around a phase that is still writing.
    - **Report the failure in the Step 2 output** — a wave that fell back is never reported as a clean fan-out.
6. **Do not dispatch when the gain is not there** — a single-phase run, a one-file phase, or a wave of one implements inline (dispatch overhead > gain).

**Gates are SEQ boundaries and are never parallelized away.** Step 3 Testing, Step 4 Code Review, and the Step 5 user-approval gate run AFTER the barrier on the merged result — never concurrently with the phases they gate, and a subagent's own self-check NEVER substitutes for the host gate.

**Multi-phase run** (`--approval=off` with `$ALL_PHASES=Yes`, or a wave dispatch): per phase, run only type-check/compile plus the phase's targeted check (its own suites + one mutation check per new rule); Step 3 and Step 4 run ONCE after the last wave, over the whole changeset. **Early dispatch = its own single-member wave.** A phase whose declared dependencies have all returned, and whose write set is disjoint from every running member, may dispatch without waiting for the rest of its wave: it opens a new single-member wave with its own all-return barrier (item 4), so the per-wave barrier rule still holds — no member is ever advanced past, only started sooner. Step 3 and Step 4 wait for every wave, early ones included. A one-phase run is unchanged.

**Output:** `✓ Step 2: Implemented [N] files - [X/Y] tasks complete, compilation passed` — when waves ran, append `- waves: [w1 members] → [w2 members]`, and name any member that failed/timed-out plus the phase that fell back to sequential

---

## Step 3: Testing

Call `tester` subagent (multi-phase run: once, after the last wave, over the whole changeset). ANY tests fail → STOP, call `debugger` subagent, fix, re-run. Repeat until 100% pass.

**Testing standards:** Unit tests may use mocks. Integration tests use test environment. Forbidden: commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes.

**Output:** `✓ Step 3: Tests [X/X passed] - All requirements met`

**Validation:** If X ≠ total, Step 3 INCOMPLETE - do not proceed.

---

## Step 4: Code Review

Call `code-reviewer` subagent (multi-phase run: once, after Step 3, over the whole changeset). If the current round has validated blocking findings, stop and fix them at the owning layer, re-run `tester`, and run a fresh full `code-reviewer` pass. Round 1 blocks on every validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, so LOW-only findings are recorded/deferred and do not reopen the cycle. Failed binary gates always block.

**Output:** `✓ Step 4: Code reviewed - blocking findings: Critical=[n] | High=[n] | Medium=[n] | Low deferred=[n] | binary gates=[n]`

**Validation:** Apply `.claude/scripts/lib/review-policy.cjs` before deciding whether to proceed. If the current round has any blocking finding, or any failed binary gate, Step 4 is INCOMPLETE — do not proceed. A Round 2 LOW-only result is complete only when the LOWs are listed as deferred; it does not reopen the fix/review cycle.

> **Severity classification (canonical `SYNC:severity-rubric`):** CRITICAL is immediate material security/safety/authority/data-loss risk or a failed binary gate; HIGH is material correctness, contract, privacy, or authority risk; MEDIUM is a bounded but consequential edge/resilience/maintainability gap; LOW is evidenced non-blocking polish with no credible present material impact. `NOT VERIFIABLE` is unresolved evidence, not LOW; if it could affect required behavior or a binary gate it remains blocking until proved or explicitly owner-accepted with residual risk. Classify by consequence and cite `file:line`, never by effort or proximity to the round cap.

---

## Spec-Loop Gate (applies in EVERY mode, standalone included)

> **A behavior change is not "done" until the spec-loop closes** (canonical: `SYNC:spec-loop-discipline` in `.claude/skills/shared/sync-inline-versions.md`). After implementing a behavior-bearing phase, the four rules gate completion: (1) every [HARD] §4 rule / §5 invariant the phase touched has a **universally-quantified property TC** ("for ALL inputs in {domain}, {invariant} holds") + boundary counter-case, not just an example; (2) the changed core-logic line is **mutation-killed** — a surviving mutant on a changed line is a missing invariant, write the killing test (MUTATION-SCORE bar, not line-coverage %); (3) the finding fed the **Dual-Feedback Ledger** into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only change. A phase with a behavior change but no property TC, no mutation-killed test, and no Dual-Feedback entry is **INCOMPLETE** — re-verify the whole package (spec + tests + code, not just the diff) before reporting success.

---

## Step 5: User Approval ⏸ BLOCKING GATE

Present summary (3-5 bullets): what implemented (name the waves when Step 2 fanned out), tests passed, code review outcome.

**This gate is a SEQ boundary** — it is never merged into a wave, never delegated to a subagent, and never satisfied by "the parallel phases all reported success". Only `--approval=off` removes it.

**Ask user explicitly:** "Phase implementation complete. All tests pass, code reviewed. Approve changes?"

This approval accepts the implementation; it does not authorize staging, committing, or pushing. A separate explicit Git request may already exist in the conversation; retain its exact operation and scope without asking for it again.

**Stop and wait** - do not proceed until user responds.

**Output:** `✓ Step 5: User approved - Ready to complete`

---

## Step 6: Finalize

**Prerequisites:** Running quality gates passed; user approved in Step 5 or `--approval=off` explicitly skips that implementation-approval gate.

1. **STATUS UPDATE:** the main session updates `plan.md` + phase status inline — this write is REQUIRED and is never delegated — and spawns `docs-manager` for documentation; barrier on its return before continuing.

2. **ONBOARDING CHECK:** Detect onboarding requirements + generate summary.

3. **COMPLETION REPORT:** Report implementation status, validation and docs outcomes independently of Git. Ordinary finalization writes no grant file and does not stage, commit, or push.

4. **OPTIONAL GIT REQUEST (SEQ — after the barrier and all required reviews):** Dispatch `git-manager` only when the user explicitly requested the operation. Pass `operation`, `scope`, and `sourceRequest` (the actual user message/quote authorizing that operation and scope); apply the agent's Git Request Contract. Scope names the repository and authorized files, or the remote/branch for push. Generic implementation/review approval never grants this authority. Commit permits necessary staging of those files and a new commit; push requires its own explicit request and never follows commit implicitly. Stage-only and push-only requests retain those limits. If the request is absent, skip Git and finish; if scope or sourceRequest is missing/ambiguous, report the missing input and ask only about that Git operation. Required standalone/workflow reviews still precede any requested Git operation. Run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.

**Output:** `✓ Step 6: Finalize - Implementation complete - Status/docs updated - No Git request (skipped)`; when Git was explicitly requested, replace the last field with the observed operation result (including blocked/failed), never a presumed commit. A blocked Git operation does not erase completed implementation work.

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Critical Enforcement Rules

**Step output format:** `✓ Step [N]: [Brief status] - [Key metrics]`

**task tracking tracking required:** Initialize at Step 0, mark each step complete before next.

**Mandatory subagent calls:** Step 3: `tester` | Step 4: `code-reviewer` | Step 6: `docs-manager` (status updated inline)

**Conditional subagent call:** Step 6: `git-manager` only for an explicit user request with operation/scope/sourceRequest. No request means implementation can finish without Git.

**Blocking gates:**

- Step 3: Tests must be 100% passing
- Step 4: No blocking findings under the current review round bar (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; binary gates always block)
- Step 5: User must explicitly approve

Execute every step in declared order; proceed only when validation passes and the user has approved; run one plan phase per command. Do not skip steps, proceed on failed validation, or assume approval without a user response.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use ask the user directly to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-refactor` workflow** (Recommended) — investigate → plan → plan-execute → review → production-readiness-review → test → docs
> 2. **Execute `$plan-execute` directly** — run this skill standalone

---

## Next Steps (Standalone: MUST ATTENTION ask user by asking the user directly. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (code implemented). This ensures review, testing, and docs steps aren't skipped.
- **"$code-simplifier"** — Simplify implementation
- **"$integration-test"** — Generate/update integration tests from test specs
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

## Standalone Review Gate (Non-Workflow Only)

> **Post-gate of the [Standalone Mode Pipeline](#standalone-mode-pipeline-skip-entirely-if-invoked-inside-a-workflow).** Full standalone loop: plan → plan-review → proceed → `$changes-review` → `$why-review`; the two review steps below are its tail.
>
> **MANDATORY IMPORTANT MUST ATTENTION:** If this skill is called **outside a workflow** (standalone `$plan-execute`), you MUST ATTENTION create task tracking todo tasks for `$changes-review` then `$why-review` as the **last tasks** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `workflow-feature`, `workflow-refactor`), skip this — the workflow sequence handles `$changes-review` at the appropriate step.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing — every filename below resolves inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- `frontend-patterns-reference.md`
- `configured styling reference` — Styling reference (read when task involves frontend/UI)
- `design-system/README.md` — Design system tokens (read when task involves frontend/UI)
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `plan-granularity` — Five-point granularity check that each phase must pass; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:plan-granularity:reminder -->

**IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"

<!-- /SYNC:plan-granularity:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

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

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete the selected plan phase as working, fully-tested, reviewed, user-approved code through its testing, code review, and approval gates. Git operations are optional and require an explicit user request — NEVER bypass a quality or authority gate to declare done.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** Trace observed end state backward through all feeders before fixing.
- **Plan Granularity:** Verify every phase passes the 5-point check; sub-plan failures.
- **Nested Task Creation:** Expand child phases and link the parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs (always `lessons.md`); cite them first.
- **Critical Thinking:** Apply critical + sequential thinking; traced proof, confidence >80% to act.
- **Understand Code First:** Search 3+ patterns and read code before any modification.
- **Source/Test Drift Check:** When behavior changes, reconcile affected tests from evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** run the full step spine in declared order, emit `✓ Step N:` each: Step 0 detect plan + select next incomplete phase → Step 1 Analysis & Task Extraction (read plan, Goal-Contract read, Trace Gate, seed task tracking) → Step 2 Implementation (code + type-check/compile; UI → `ui-ux-designer`) → Step 3 Testing (`tester`→`debugger` until 100%) → Step 4 Code Review (`code-reviewer` until the current severity bar is clear: round 1 zero findings, round 2 zero CRITICAL/HIGH/MEDIUM with LOW deferred) → Step 5 User Approval (BLOCKING, wait) → Step 6 Finalize (main-session status update + `docs-manager`; optional `git-manager` only for an explicit user request).
**IMPORTANT MUST ATTENTION** execute Steps 0-6 in declared order; the three BLOCKING gates — tests 100% (Step 3), no blocking findings under the current severity bar (Step 4), explicit user approval (Step 5) — cannot be faked-green: NEVER skip a step, proceed on failed validation, or assume approval — why: a faked-green gate ships the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim, finding, and recommendation with confidence % — >80% to act, <80% verify first, <60% do NOT recommend — why: speculation passed as fact is the root of every hallucinated fix.
**IMPORTANT MUST ATTENTION** break work into small task tracking todos BEFORE the first read/edit, keep exactly one `in_progress`, mark `completed` immediately after each step's evidence, add a final review todo — on context loss call the current task list first, never duplicate — why: long files exhaust context and silently lose findings.

**IMPORTANT MUST ATTENTION** Pre-Implementation Granularity Gate + Trace Gate STOP the run BEFORE coding — refuse phases with planning verbs / unnamed files / unresolved decisions (sub-plan instead), and require the End→Start `Debugger Trace` (final state → reader → storage → writer → producer → trigger, all feeder paths, hypothesis matrix, owning fix layer, forward convergence) for any bug/regression/behavior-changing plan — why: implementing a vague phase or fixing the symptom site wastes the run.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and READ target code (cite `file:line`) before writing — match local conventions over generic framework defaults, run a graph trace when `.code-graph/graph.db` exists; never invent a pattern when one exists — why: projects carry local conventions that framework defaults violate.
**IMPORTANT MUST ATTENTION** fix at the component that owns the invariant or responsibility, using project architecture, references, and source evidence to identify it; never patch the symptom/crash site — trace "whose responsibility?" first — why: one fix at the invariant owner protects all downstream consumers.
**IMPORTANT MUST ATTENTION** a behavior change is NOT done until the Spec-Loop closes — universally-quantified property TC + boundary counter-case for every [HARD] rule touched, a mutation-killed test on each changed core-logic line, and a Dual-Feedback Ledger entry into BOTH spec AND tests — re-verify the whole package (spec + tests + code), not just the diff.
**IMPORTANT MUST ATTENTION** keep existing tests real and genuinely passing — NEVER comment out tests, weaken assertions, change assertions to pass, or use fake data; apply the source/test drift check when behavior changes — why: faked green hides the regression the test exists to catch.
**IMPORTANT MUST ATTENTION** mode flags add/remove ONE step, never relax a running gate — `--approval=off` skips Step 5, `--tests=off` skips Step 3, `--parallel={auto|on|off}` controls Step 2 fan-out (`off` = default sequential, `on` = explicit opt-in, `auto` = fan out only on plan-declared `PAR`/`SEQ` metadata); debugger-trace + granularity + quality bars + all SYNC blocks apply in EVERY mode.
**IMPORTANT MUST ATTENTION** Step 2 is SEQUENTIAL by default — fan out only on the explicit `--parallel`/`--parallel=on` opt-in, or under `--parallel=auto` when EVERY in-scope phase carries a plan-declared `## Parallel Execution` block; `auto` with no such block falls back to sequential and NEVER derives write sets optimistically — why: a derived write set cannot see cascade/generated writes, so two "disjoint" phases silently collide on the same generated artifact.
**IMPORTANT MUST ATTENTION** when a wave does run — NEVER co-schedule two writers of the same file, declare the wave plan, spawn every member in ONE message, then hold the barrier until EVERY member is accounted for by name; a failed, timed-out, or partial member blocks the barrier, is never assumed successful, and its phase is re-implemented sequentially before the next wave — why: an advanced barrier on an incomplete wave ships half a phase as if it were whole.
**IMPORTANT MUST ATTENTION** gates are SEQ boundaries — Step 3 Testing, Step 4 Code Review, and the Step 5 approval gate run after the barrier on the merged result; a subagent's self-report NEVER substitutes for a host gate — why: parallelism may shorten the run, never the gate.
**IMPORTANT MUST ATTENTION** standalone (no parent `[Workflow]` row via the current task list) → wrap Steps 0-6 in plan → plan-review → proceed → `$changes-review` → `$why-review`, with `$changes-review` + `$why-review` as the LAST todos; validate decisions with the user by asking the user directly — never auto-decide — why: standalone runs have no workflow enforcing review before commit.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` and the path-matched project-reference docs (frontend/scss/design-system for UI, domain-entities for models) before starting.
**IMPORTANT MUST ATTENTION** Easy to Change is the success metric — every finding, test, refactor, abstraction must make the NEXT change cheaper; name the real enemies (coupling, hidden state, duplicated knowledge, unclear intent) and reject anything that raises change cost.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "Tests are basically passing"                    | 100% or Step 3 is INCOMPLETE — loop `tester`→`debugger` until X/X — partial green ships the bug.  |
| "Code review found only minor issues"            | Apply the current round bar: Round 1 fixes every validated severity; Round 2 defers LOW-only findings but still blocks on CRITICAL/HIGH/MEDIUM and failed binary gates. |
| "Obviously approved / they'll approve"           | Step 5 is BLOCKING — stop and wait for an explicit user response, never assume approval.           |
| "Phase is clear enough to start"                 | Run the Granularity Gate — planning verbs / unnamed files / open decisions → sub-plan, don't code. |
| "It's a quick fix, skip the trace"               | Bug/regression plan needs the End→Start trace + hypothesis matrix BEFORE the fix.                  |
| "Code change is enough, spec/tests later"        | Behavior change → property TC + mutation-killed test + Dual-Feedback into spec AND tests, or INCOMPLETE. |
| "Standalone, so skip review"                     | No workflow = YOU add `$changes-review` + `$why-review` as the last todos.                         |
| "The plan looks parallelizable — fan it out"     | Fan-out is OPT-IN: `--parallel`/`--parallel=on`, or `--parallel=auto` **plus** a plan-declared `## Parallel Execution` block. No opt-in, no metadata → sequential. |
| "I can infer the write sets from the plan"       | Not under `auto` — a derived set misses cascade/generated writes and collides on files no phase names. Fall back to sequential. |
| "Both phases only touch different functions"     | The unit of ownership is the FILE — any shared path splits the phases into different waves.        |
| "One wave member never came back, the rest passed" | The barrier does NOT advance — account for every member by name; failed/timed-out/partial → re-run that phase sequentially. |

---

**IMPORTANT MUST ATTENTION** the three BLOCKING gates (tests 100% · no blocking findings under the current review bar · explicit approval) cannot be faked-green — Round 1 blocks every validated severity, Round 2 defers LOW-only findings but still blocks CRITICAL/HIGH/MEDIUM and failed binary gates; NEVER bypass a gate to declare done.
**IMPORTANT MUST ATTENTION** implementation completion, review approval and `--approval=off` never authorize Git: require explicit user operation/scope/sourceRequest, report completion independently, and run `git commit --amend` only on an explicit amend request, never a pushed commit or one this task did not create.
**IMPORTANT MUST ATTENTION** cite `file:line` + confidence % for every claim; search 3+ patterns and read code before writing.
**IMPORTANT MUST ATTENTION** break work into small task tracking todos BEFORE starting; add a final review todo; on context loss call the current task list first.

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
