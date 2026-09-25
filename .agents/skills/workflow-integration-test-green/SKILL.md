---
name: workflow-integration-test-green
description: '[Workflow] Use when driving an integration-test suite to fully green — adjudicate every failure before editing, fix at the owning layer, re-verify, then sync specs and docs.'
disable-model-invocation: false
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

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive the configured relevant integration-test scope to a truthful green result, adjudicate each failure before editing, fix at the component that owns the violated contract, verify under the project's repeat policy, and sync the configured case/reference docs.

**Summary:** Set the Goal Contract and explicit configured scope (whole relevant system by default), then run `$investigate` → `$integration-test-verify --fix-loop` → conditional `$debug-investigate`/`$fix` → configured case-owner sync → configured reference scan when needed → `$docs-update` → `$workflow-end` → `$watzup`. Each failing round requires a written Fault Verdict, a fix at the owner selected by architecture/source evidence, inline `$changes-review`, a Round Integrity Check, and fresh full verification under `integrationTestVerify.guidance` (default: two no-reset green runs for persistent/shared-state suites) or bounded escalation.
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

**When to use:** "make all integration tests pass", "fix the failing integration tests", "the suite is red after my change", "loop until all integration tests are green", "diagnose this flaky integration test". For AUTHORING new tests from specs use `$workflow-write-integration-test`; this workflow is for driving an EXISTING suite to green.

**Workflow:**

1. **Detect** — resolve the verification scope: the WHOLE system by default, or the target named in the prompt.
2. **Converge** — loop verify → adjudicate → fix → review the fix → re-verify until the configured repeat policy passes, bounded by a round cap and a Round Integrity Check.
3. **Sync** — reconcile the configured case/spec owner, refresh the integration-test reference only when its content changed, and update impacted feature docs.

**Key Rules:**

- MUST ATTENTION default the verification scope to the **WHOLE SYSTEM** — every integration-test project via `testProjectPattern` > `testProjects` — and pass it EXPLICITLY to `$integration-test-verify`; never fall through to its change-scoped git auto-detect default.
- MUST ATTENTION adjudicate EVERY failure with `$debug-investigate` + `$integration-test-review` (report-only) into ONE written Fault Verdict — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — with `file:line` evidence, BEFORE any edit.
- MUST ATTENTION fix at the invariant-owning component identified from project architecture and source evidence, never the crash site; a `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it.
- MUST ATTENTION run `$changes-review` (INLINE, report-only) on the fix diff of EVERY loop round that landed a fix, folding its validated findings back into that same round — no fix reaches the next round un-code-reviewed.
- MUST ATTENTION back every pass/fail claim with actual test-runner output (Passed/Failed/Skipped counts + failing names) — "all passed" without output is theater.
- MUST ATTENTION treat a shrinking executed-test count, a growing skipped count, or a narrowed scope as a REGRESSION → STOP and escalate; a suite that got greener by losing tests did not converge.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution (the Goal Contract is set FIRST) and loop until observable verification passes.
- MUST ATTENTION require integration tests to protect a named business rule/invariant and fail if that intent breaks.
- MUST ATTENTION use the production entry path when it is part of the behavior under test; use valid project fixtures/factories for other preconditions without bypassing the tested contract.
- MUST ATTENTION follow `integrationTestVerify.guidance`; when absent, require two fresh green runs for suites with persistent/shared state, preserving the configured isolation and reset policy.
- NEVER force green by weakening or removing assertions, adding skip annotations, widening assertion timeouts, wrapping a retry around a failing assertion, or narrowing the scope.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** $investigate -> $integration-test-verify --fix-loop -> $debug-investigate [on-failure] -> $fix [on-failure] -> $spec [mode=sync] -> $scan --target=integration-tests -> $docs-update -> $workflow-end -> $watzup

> **[BLOCKING] Step 0 — CREATE THE FULL TASK LIST BEFORE ANY VERIFICATION WORK.** Call the current task list first (resume, never duplicate), then task tracking EVERY task below in one pass — before `$investigate`, before the first test run. A workflow that starts verifying with an empty task list has already lost the ability to show where it is, and an interrupted run cannot be resumed. — why: this loop can span many rounds and a context compaction mid-round; the task list is the only state that survives it.
>
> **Fixed tasks — created 1:1 from the canonical `sequence` in `.claude/workflows.json`, in order:**
>
> 1. `[1] investigate — resolve verification scope to a concrete project/suite list`
> 2. `[2] integration-test-verify --fix-loop — drive the suite to green (parent of the per-round tasks)`
> 3. `[3] debug-investigate [on-failure] — traced root cause behind every Fault Verdict` *(CONDITIONAL)*
> 4. `[4] fix [on-failure] — resolve every verdict at the owning layer` *(CONDITIONAL)*
> 5. `[5] spec [mode=sync] — reconcile §8 TCs with the executing tests`
> 6. `[6] scan --target=integration-tests — regenerate the integration-test reference doc`
> 7. `[7] docs-update — update every other impacted doc`
> 8. `[8] workflow-end — close workflow state`
> 9. `[9] watzup — summarize the convergence trail`
> 10. `[10] final review — verify work quality + extract lessons` *(not a sequence step — the standing close-out task)*
>
> **`[3]` and `[4]` are ROLL-UPS, not separate invocations.** They appear in the canonical sequence so the conditional fix half is visible in the task list from the start, but `$integration-test-verify --fix-loop` is their single executing owner: each firing happens INSIDE a round as `[2.N.2]` / `[2.N.5]` below. Complete `[3]`/`[4]` once the loop converges, summarizing which rounds fired them — or, if no round ever failed, complete them with the reason recorded (`no failure in any round`). NEVER run them a second time at workflow level after the loop returns — that would be a parallel fix loop the Inline Execution Gate forbids.
>
> **Per-round tasks (created when EACH round opens — round N is not planned until round N-1 reported):**
>
> - `[2.N.1] verify — full run over {scope}, capture real counts` *(always)*
> - `[2.N.2] debug-investigate — trace root cause of each failure` *(CONDITIONAL: only if round N reported failures — the round-N instance of `[3]`)*
> - `[2.N.3] integration-test-review — report-only fault gates` *(CONDITIONAL: same trigger)*
> - `[2.N.4] fault verdict — one written verdict per failure` *(CONDITIONAL: same trigger)*
> - `[2.N.5] fix — resolve at the owning layer` *(CONDITIONAL: same trigger — the round-N instance of `[4]`)*
> - `[2.N.6] changes-review — review this round's fix diff` *(CONDITIONAL: only if a fix landed)*
> - `[2.N.7] round integrity check — counts not shrunk, scope not narrowed` *(always)*
>
> A conditional task whose trigger never fires is marked **completed with the reason recorded** (`no failures this round`), NEVER silently dropped — why: a skipped-and-unrecorded gate is indistinguishable from a forgotten one when someone audits the run later.

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Adjudicate-Before-Fix Gate:** inside `$integration-test-verify --fix-loop`, no edit may land before that failure has a written Fault Verdict backed by `$debug-investigate`'s traced root cause AND `$integration-test-review`'s gate findings. An unadjudicated failure gets "fixed" by whatever is nearest — which is almost always the assertion, and a weakened assertion protects nothing.

> **[CRITICAL] Per-Round Review Gate:** the loop's only convergence signal is "the tests went green" — and a green test cannot see a fix made at the wrong layer, an invariant broken elsewhere, dead code, a leaked domain concept, or a security/performance regression. So EVERY round that lands a fix must run `$changes-review` (INLINE, report-only) over that round's fix diff, validate its findings, and resolve them in the SAME round. A round that leaves a validated review finding open has not finished, even if its tests are green. This subsumes the `SOURCE-WRONG` verdict's own changes-review obligation — once per round over the whole fix diff, never twice, and never as a nested review→fix loop.

> **[CRITICAL] Inline Execution Gate:** `$integration-test-verify --fix-loop` and the skills it drives (its default `$integration-test-verify` pass WITHOUT the flag, `$debug-investigate`, `$integration-test-review`, `$changes-review`) run **INLINE via the skill invocation — NEVER as sub-agents**. `$debug-investigate` requires its `$why-review` gate in the SAME session/main agent, and `$integration-test-review` self-binds its own fix + re-review obligations; a sub-agent cannot own either or carry it back to the loop. Their OWN internal fan-outs (verify's per-project `integration-tester` agents, review's phase agents) remain sub-agents by their own design, so context stays bounded.

> **[CRITICAL] Documentation Sync Is Part Of Done:** the loop deliberately defers ALL doc work while it churns, so steps 3–5 are not an optional tail. `$spec [mode=sync]` reconciles §8 TCs ↔ the executing test code, `$scan --target=integration-tests` regenerates the integration-test reference doc from the suite as it now stands, and `$docs-update` catches every other impacted doc. A converged-but-undocumented suite leaves the next agent reading a reference doc describing tests that no longer exist.

> **Goal Contract propagation (workflow-owned):** At workflow start — BEFORE round 1 — resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the request). Its single required Success Criterion: _a fresh full `$integration-test-verify` over the resolved scope satisfies `integrationTestVerify.guidance`; absent guidance defaults to two zero-failure fresh runs without destructive shared-state reset when the scope persists or shares state, with no test deleted, skipped, or weakened._ Record the scope string, repeat policy, round cap (default 3), and baseline executed/skipped counts in **Constraints**. After every round, append the per-project counts, Fault Verdicts, and fixes to the Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `$workflow-end`.

Activate the `workflow-integration-test-green` workflow. Run `$start-workflow workflow-integration-test-green` with the user's prompt as context.

## Test Architecture Contract Handoff

Before round 1, `$investigate` locks one evidence-backed contract record that `$integration-test-verify --fix-loop` reuses on every round:

- `applicability`: mark the integration/system tier `APPLICABLE` only with verified runner/configuration evidence; record other tiers as `N/A — <evidence>` unless their configured owner is explicitly in scope.
- `owner`: keep `$integration-test-verify --fix-loop` as convergence owner and name the existing conditional owners for diagnosis, review, fixing, and fix review.
- `fullCommand` and `focusedCommand`: bind the full command to the resolved whole-system scope and the focused command to an explicitly named target; both must be configured, copy-ready, fail invalid or zero-match selections, and expose a simple Windows/macOS/Linux entry point when required.
- `runIdentity` and `dataStrategy`: use a unique non-sensitive run identity, valid public-use-case setup, explicit target/additive seed mode, and isolated mutable data for parallel workers.
- `repeatProof` and `result`: retain exact per-round counts, failing names, exit status, scope, and repeat/concurrency evidence required by `integrationTestVerify.guidance`; absent guidance defaults to two fresh no-reset full runs for persistent/shared-state scopes.

The loop owns this handoff and the Round Integrity Check: `$integration-test-verify` receives the fixed scope and commands, while `$debug-investigate`, `$integration-test-review`, `$fix`, and `$changes-review` retain their existing conditional ownership and gates. The existing delegated order remains the only route; no fallback runner, narrowed scope, or destructive reset may replace missing evidence.

**Steps:** $investigate → $integration-test-verify --fix-loop → $debug-investigate [on-failure] → $fix [on-failure] → $spec [mode=sync] → $scan --target=integration-tests → $docs-update → $workflow-end → $watzup

> **[CRITICAL] Bounded convergence — the loop is the workflow, not a step inside it.** Step 2 repeats: run the configured full scope → adjudicate and fix every evidenced failure → run that same scope freshly → repeat. Finish only after a fresh full run satisfies `integrationTestVerify.guidance` (default: two zero-failure no-reset runs for persistent/shared-state suites), with no test deleted, skipped, weakened, or de-scoped. Otherwise bounded-escalate by asking the user directly (round cap 3 · failures not shrinking across 2 rounds · failures increasing · coverage lost · an open validated review finding · `ENVIRONMENT-BLOCKED`). A failing report is evidence for the next action, not a claim of completion.
>
> **`$debug-investigate` and `$fix` are CONDITIONAL steps of the loop, executed INSIDE `$integration-test-verify --fix-loop`.** They fire on every round that reports a failure and are skipped (with a recorded reason) on a round that is already green. They are tracked as their own tasks per round (Step 0) so they are visible in the task list, but `$integration-test-verify --fix-loop` remains their single executing owner — NEVER invoke them as a second, parallel fix loop at workflow level. — why: the fix half was previously triple-owned across three skills, which let two loops double-fix one failure or each assume the other owned it; one owner with visible sub-tasks keeps both the accountability and the visibility.
>
> **Step 2 RECURSES:** default `$integration-test-verify` pass (WITHOUT `--fix-loop`) → *(on failure)* `$debug-investigate` → `$integration-test-review` → Fault Verdict → `$fix` → `$changes-review` → fresh full re-verify — repeating until the configured repeat policy passes. Steps 3 and 4 of the sequence are the workflow-level roll-ups of that conditional half; `$integration-test-verify --fix-loop` executes them inside each round, never again after it returns.

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`$investigate`** — Resolve the verification scope to a concrete test-project list. No target in the prompt → the WHOLE system (every project via `testProjectPattern` > `testProjects` from `docs/project-config.json` → `integrationTestVerify`). A named suite/module/feature/diff narrows it — state how the target maps to projects. Output: the fixed scope string the loop will reuse every round.
> **`$integration-test-verify --fix-loop`** — The convergence engine, and the only step that changes code. Sets the Goal Contract first, then loops: the default `$integration-test-verify` pass (WITHOUT the flag) INLINE over the fixed scope under `integrationTestVerify.guidance` → on ANY failure run `$debug-investigate` + `$integration-test-review` (report-only) → ONE Fault Verdict per failure → `$fix` at the invariant-owning component → **conditional `$changes-review`** (INLINE, report-only, over the round's fix diff — runs in EVERY round that landed a fix; validated findings fold back into that same round's fix set) → **Round Integrity Check** (executed count must not shrink, skipped count must not grow, scope must not narrow) → fresh full re-verify. Round cap 3; not shrinking across 2 rounds, increasing failures, cap hit with failures open, lost coverage, an open validated review finding, or `ENVIRONMENT-BLOCKED` → STOP and escalate by asking the user directly. Output: zero-failure runner evidence required by the policy + the per-round verdict/fix/review trail.
> **`$debug-investigate`** *(CONDITIONAL — only on a round with failures)* — Trace each failure end-to-start to its root cause BEFORE any edit; produces the traced cause that the Fault Verdict rests on. Skipped on a green round, with the skip recorded.
> **`$fix`** *(CONDITIONAL — only on a round with an adjudicated failure)* — Resolve the verdict at the invariant-owning component identified from project architecture and source evidence, never the crash site. A `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it. NEVER runs before a written Fault Verdict exists for that failure.
> **`$spec [mode=sync]`** — Reconcile the selected canonical case owner and configured coverage carrier with executing tests. The strict default syncs Section 8 `TC-{FEATURE}-{NNN}` cases and their `CoveredBy` links; a native profile preserves its declared identities, fields, and cardinality. Run AFTER convergence so it syncs final tests, not intermediate ones.
> **`$scan --target=integration-tests`** — Regenerate the integration-test project-reference doc from the suite as it now stands: patterns, base fixtures, async-wait and unique-data helper conventions, suite/project inventory, and lessons. This is the doc every future agent reads before touching a test — a loop that changed test structure without regenerating it leaves the next agent following stale conventions.
> **`$docs-update`** — Update every OTHER impacted doc: feature-doc evidence fields, version history, and any doc embedding test counts or coverage claims the loop changed. Covers what `$spec [mode=sync]` (spec TCs) and `$scan --target=integration-tests` (the reference doc) do not.
> **`$workflow-end`** + **`$watzup`** — Close workflow state, then summarize the convergence trail and run the final handoff.

---

**IMPORTANT MANDATORY Steps:** $investigate -> $integration-test-verify --fix-loop -> $debug-investigate [on-failure] -> $fix [on-failure] -> $spec [mode=sync] -> $scan --target=integration-tests -> $docs-update -> $workflow-end -> $watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Drive the configured relevant integration-test scope to a truthful green result, adjudicate each failure before editing, fix at the component that owns the violated contract, verify under the configured repeat policy, and sync the selected canonical case/reference docs.

**IMPORTANT MUST ATTENTION Workflow:** Set the Goal Contract and explicit configured scope → `$investigate` → `$integration-test-verify --fix-loop` → on failure `$debug-investigate` + `$integration-test-review` → written Fault Verdict → fix at the evidenced owner → inline `$changes-review` → Round Integrity Check → fresh full re-verify under the configured repeat policy → sync the selected case owner → refresh changed references → `$docs-update` → `$workflow-end` → `$watzup`; NEVER weaken tests, narrow scope, lose coverage, or skip evidence, and bounded-escalate on the round cap or blocked environment.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below — each is a signpost to its canonical body above.

- **Integration Test Execution Discipline:** verify the WHOLE system, drive state through real use cases, `$debug-investigate` before any fix, 60s runtime cap, loop until the whole suite is green.
- **Test-Failure Fault Adjudication:** decide WHO is at fault (source vs test) against the governing spec before touching either side; never weaken an assertion or change source to satisfy a broken test.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; settle barriers belong in ARRANGE, never a widened assertion timeout.
- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify all outputs.
- **Nested Tasks:** expand child phases, link parent workflow row when nested.
- **Project Reference Docs:** read required docs first, cite, `lessons.md` always.
- **Task Tracking:** bootstrap tasks; persist plan/review findings to disk incrementally.
- **Critical Thinking:** traced `file:line` proof, confidence >80%, never guess.
- **Incremental Persistence:** append findings per file to report; never hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** set the Goal Contract FIRST — before round 1 — with the zero-failures / 2-consecutive-green / no-test-lost success criterion
**IMPORTANT MUST ATTENTION** the verification scope defaults to the WHOLE SYSTEM and is passed to `$integration-test-verify` EXPLICITLY every round — never let it fall through to change-scoped git auto-detect
**IMPORTANT MUST ATTENTION** adjudicate EVERY failure into ONE written Fault Verdict BEFORE any edit — `$debug-investigate` for the traced root cause, `$integration-test-review` (report-only) for the test-side gates
**IMPORTANT MUST ATTENTION** every loop round that lands a fix runs `$changes-review` (INLINE, report-only) on that round's fix diff — validated findings fold into the same round; an open validated finding blocks the round even when the tests are green
**IMPORTANT MUST ATTENTION** run `$integration-test-verify --fix-loop` and the skills it drives INLINE via the skill invocation — NEVER as sub-agents
**IMPORTANT MUST ATTENTION** NEVER force green — no weakened assertions, no skips, no widened timeouts, no retries around a failing assertion, no repository-hacked data, no narrowed scope
**IMPORTANT MUST ATTENTION** the Round Integrity Check is BLOCKING — a shrinking executed-test count, a growing skipped count, or a narrowed scope is a REGRESSION, not convergence
**IMPORTANT MUST ATTENTION** show actual runner output for every pass/fail claim (Passed/Failed/Skipped counts + failing names)
**IMPORTANT MUST ATTENTION** documentation sync is part of DONE — `$spec [mode=sync]` + `$scan --target=integration-tests` + `$docs-update` all run after convergence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
