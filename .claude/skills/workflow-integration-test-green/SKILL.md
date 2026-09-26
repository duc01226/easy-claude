---
name: workflow-integration-test-green
version: 1.0.0
description: '[Workflow] Use when driving an integration-test suite to fully green — adjudicate every failure before editing, fix at the owning layer, re-verify, then sync specs and docs.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive the resolved integration-test scope to a truthful, repeatable green — every failure adjudicated before any edit, fixed at the component that owns the violated contract, and re-verified under the configured repeat policy — then sync the case owner and the docs the fixes made stale.

**Use when:** a suite or a named test is red, flaky, or must be proven repeatably green. To author new tests from specs, use `/workflow-write-integration-test`; to reconcile specs and tests after a code change, use `/workflow-spec-sync`.

**IMPORTANT MANDATORY Steps:** /investigate -> /integration-test-verify --fix-loop -> /debug-investigate [on-failure] -> /fix [on-failure] -> /spec [mode=sync] -> /scan --target=integration-tests -> /docs-update -> /workflow-end -> /watzup

The chain above is the recommended default order. Which steps are gates and when each optional step runs is declared in the registry entry and restated in [Recommended Skills](#recommended-skills).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-integration-test-green` workflow. Run `/start-workflow workflow-integration-test-green` with the user's prompt as context.

## Triage — FIRST Action

Classify before choosing depth and record the result in the report. Escalate depth on risk and ambiguity, not on test count alone.

| Axis                                      | Read from                                                                                                 | What it selects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**                                 | the prompt + `docs/project-config.json` → `integrationTestVerify` (`testProjectPattern` > `testProjects`) | No target → the WHOLE system. A named suite, module, feature, test or diff narrows it — state how it maps to test projects. The resolved list stays fixed for every round and is passed explicitly; never the git-changed subset.                                                                                                                                                                                                                                                                                                       |
| **Failure load** (after the first verify) | runner output                                                                                             | **0** → proof-only run: complete the repeat-policy runs, then every conditional step closes as `when-false`. **XS** (1–3 failures sharing one cause) → inline, one diagnosis for the cause, no sub-agents. **S/M** (up to ~20) → cluster failures by error signature and module; one `/debug-investigate` per cluster that traces every member failure to the shared cause, one Fault Verdict per failure. **L/XL** (more, or many modules) → sweep the environment first (a shared cause is likely), then adjudicate cluster by cluster in bounded batches, appending each batch to the report before the next. |
| **Verdict kinds**                         | Fault Verdicts                                                                                            | Only `ENVIRONMENT-BLOCKED`/`AMBIGUOUS` → no edit; escalate. `TEST-*` only → case sync limited to the touched tests. Any `SOURCE-WRONG` → behavior changed: the final proof also covers every suite that exercises the changed source (widen the scope and log why), then spec and docs sync.                                                                                                                                                                                                                                            |
| **Risk**                                  | the fix diff                                                                                              | A fix touching security, data integrity, a public contract or several modules → deeper `/changes-review` over that round's diff; everything else → a focused review of the small diff.                                                                                                                                                                                                                                                                                                                                                  |

## Required Quality Gates

Each gate names the evidence `/workflow-end` checks. None of them flexes.

1. **Tests green, repeatably** (`tests-pass`, gate `/integration-test-verify --fix-loop`) — a fresh full verify over the fixed scope satisfies `integrationTestVerify.guidance`; absent guidance, two zero-failure fresh runs without a destructive shared-state reset for persistent or shared-state suites. Evidence: command, Passed/Failed/Skipped counts, failing names and exit status for each run.
2. **Every failure adjudicated before any edit** (`root-cause-traced`, when a verify run reported a failing test) — ONE written Fault Verdict per failure (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) backed by `/debug-investigate`'s traced root cause and report-only `/integration-test-review` findings, with `file:line` evidence and confidence. `AMBIGUOUS` → ask the user; `ENVIRONMENT-BLOCKED` → stop mutating source and tests, name the remedy, escalate.
3. **Fix at the owner** — the fix lands on the component that owns the violated contract, never the crash site; a `SOURCE-WRONG` fix keeps or strengthens the test that caught it.
4. **No fake green** (Round Integrity Check) — executed count never shrinks, skipped count never grows, scope never narrows; no assertion weakened or removed, skip added, assertion timeout widened, retry wrapped around an assertion, or unrelated persistent data mutated. Evidence: per-round counts.
5. **Every fix reviewed** — each round that landed a fix runs inline, report-only `/changes-review` over that round's fix diff; validated findings are fixed in the same round. Evidence: review report path, or the recorded "no fix this round".
6. **Spec and docs synced** (`spec-synced`, when a fix changed tested behavior or a test case) — the configured case owner and coverage carrier match the final tests; the integration-test reference and other docs are refreshed where the fixes made them stale.
7. **Goal Contract satisfied** — set before round 1 (scope, repeat policy, round cap, baseline executed/skipped counts); one Iteration Log entry per round; Goal Satisfaction matrix before `/workflow-end`.
8. **Run closed** (`run-closed`, gate `/workflow-end`).

## Recommended Skills

| Step                                  | Role     | Runs when (optional steps: registry `when` / `skipReason`)                                                                                                                                                                                                                                                              | Proves / feeds                                                                      |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/investigate`                        | core     | Always. For a named single test it reduces to mapping the target to its test project and command.                                                                                                                                                                                                                       | The fixed scope and the Test Architecture Contract record.                          |
| `/integration-test-verify --fix-loop` | gate     | Always.                                                                                                                                                                                                                                                                                                                 | `tests-pass`; owns the round loop, the Goal Contract and the Round Integrity Check. |
| `/debug-investigate [on-failure]`     | optional | When: A verify run reported a failing test. · Skip reason: Every verify run was green, so there is no failure to trace.                                                                                                                                                                                                 | `root-cause-traced`                                                                 |
| `/fix [on-failure]`                   | optional | When: A verify run reported a failing test whose Fault Verdict is SOURCE-WRONG, TEST-WRONG or TEST-NOT-OPTIMAL. · Skip reason: No verify run reported a fixable failure: every run was green, or every failure was ENVIRONMENT-BLOCKED or AMBIGUOUS and was escalated without an edit.                                  | The owning-layer fix.                                                               |
| `/spec [mode=sync]`                   | optional | When: A fix changed tested behavior, a test case, or the name or location of a traced test. · Skip reason: No fix changed tested behavior, a test case, or the name or location of a traced test, so the case owner and its coverage links are unchanged.                                                               | `spec-synced`                                                                       |
| `/scan --target=integration-tests`    | optional | When: A fix changed what the integration-test reference documents: fixtures, helpers, base classes, wait or data conventions, or the suite and project inventory. · Skip reason: No fix changed the fixtures, helpers, conventions or suite inventory the integration-test reference documents, so it is still current. | A current integration-test reference for the next agent.                            |
| `/docs-update`                        | optional | When: A fix landed in this run, or a doc outside the spec and the integration-test reference records test counts, coverage or evidence this run changed. · Skip reason: No fix landed and no doc records a test count, coverage claim or evidence this run changed.                                                     | Feature-doc evidence, version history, embedded counts.                             |
| `/workflow-end`                       | gate     | Always, last.                                                                                                                                                                                                                                                                                                           | `run-closed` + Goal Satisfaction check.                                             |
| `/watzup`                             | core     | Always.                                                                                                                                                                                                                                                                                                                 | The convergence recap.                                                              |

Inside each round the loop also drives report-only `/integration-test-review` (test-side fault gates) and report-only `/changes-review` (fix-diff review); they are not separate sequence steps.

**`/debug-investigate` and `/fix` are roll-ups of the loop.** Their single executing owner is `/integration-test-verify --fix-loop`, which fires them inside each failing round. Complete the two workflow-level tasks from the loop's trail (which rounds fired them) once the loop returns — never start a second fix loop at workflow level, which would double-fix one failure or leave each owner assuming the other acted.

## Orchestration Freedom

You choose inline vs sub-agent, batching, clustering and ordering to minimise wall-clock and token cost at equal quality. The fixed constraints are data dependencies and in-session gates:

- **Inline, never a sub-agent:** the fix-loop and the skills it drives — the default verify pass, `/debug-investigate`, `/integration-test-review`, `/changes-review`. `/debug-investigate` needs its `/why-review` gate in the same session and `/integration-test-review` self-binds its fix and re-review obligations; a sub-agent cannot carry either back. Their own internal fan-outs (per-project verify agents, review phases) stay sub-agents, so context stays bounded.
- A fix lands only after its Fault Verdict; a fixed state is re-verified by a fresh full run over the same scope.
- Sync steps run after convergence, so they sync the final tests rather than intermediate ones. `/workflow-end` runs last. Gates awaiting user approval never run in parallel.
- Recommended: after convergence `/spec [mode=sync]` and `/scan --target=integration-tests` write disjoint files and may run as one wave, with `/docs-update` after both.

## Memory & Reporting

- One task per selected sequence step plus a final review task. When a round opens, create its child tasks (verify · adjudicate · fix · fix-diff review · integrity check) under the fix-loop task; a child whose trigger never fires completes with its recorded reason.
- Write `tmp/reports/workflow-integration-test-green-{YYMMDD}-{HHmm}-{slug}.md` FIRST (triage, scope, commands), then append per round: counts, Fault Verdicts, fixes, review verdict, integrity result.
- After compaction or resume, re-read the report, the Goal Contract and `TaskList` before continuing; the round in progress is the first one without an integrity result.

## Loop Bounds

The loop is bounded by `/integration-test-verify --fix-loop`: round cap 3 by default; STOP and escalate via `AskUserQuestion` when the failing count does not shrink across 2 rounds, failures increase, coverage is lost, a validated review finding stays open, the cap is hit with failures open, or a failure is `ENVIRONMENT-BLOCKED` or `AMBIGUOUS`. The cap triggers escalation, never acceptance of a red test. The per-round fix-diff review follows the framework round bar: round 1 clears every validated finding; round 2 onward clears CRITICAL/HIGH/MEDIUM and defers LOW.

## Test Architecture Contract Handoff

Before round 1, `/investigate` locks one evidence-backed record that every round reuses: tier applicability (integration/system `APPLICABLE` only with verified runner/config evidence; other tiers `N/A — <evidence>` unless explicitly in scope); owners (the fix-loop owns convergence; diagnosis, review, fixing and fix review keep their conditional owners); copy-ready full and focused commands that fail on invalid or zero-match selections, with a simple Windows/macOS/Linux entry point where required; a unique non-sensitive run identity, valid public-use-case setup and isolated mutable data for parallel workers; and the per-round counts, failing names, exit status and repeat evidence `integrationTestVerify.guidance` requires. No fallback runner, narrowed scope or destructive reset may stand in for missing evidence.

---

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
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

**IMPORTANT MUST ATTENTION Goal:** drive the resolved scope to a truthful, repeatable green — adjudicate, fix at the owner, review each fix, re-verify, then sync what the fixes made stale.

- **MUST ATTENTION** triage FIRST: scope (WHOLE system by default, fixed and passed explicitly every round) and failure load (0 · XS · S/M · L/XL) decide depth — one failing test does not get the whole-suite ceremony, but it still gets a Fault Verdict and the repeat-policy proof.
- **MUST ATTENTION** every failure gets ONE written five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) BEFORE any edit — why: an unadjudicated failure gets "fixed" at the assertion, and a weakened assertion protects nothing.
- **MUST ATTENTION** NEVER force green — no weakened or removed assertions, skips, widened assertion timeouts, retried assertions, or narrowed scope; the Round Integrity Check blocks a suite that got greener by losing tests.
- **MUST ATTENTION** run the fix-loop and the skills it drives INLINE; every round that lands a fix runs report-only `/changes-review` on that diff; back every pass/fail claim with runner output.
- **MUST ATTENTION** bootstrap one task per selected step plus a final review task, write the report FIRST, and end with the lessons-learned check.

**[TASK-PLANNING]** Before acting, run the triage, then break the selected steps into small tasks with `TaskCreate`.
