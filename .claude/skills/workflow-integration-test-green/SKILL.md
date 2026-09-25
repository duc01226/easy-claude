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

**Goal:** Drive the configured relevant integration-test scope to a truthful green result, adjudicate each failure before editing, fix at the component that owns the violated contract, verify under the project's repeat policy, and sync the configured case/reference docs.

**Summary:** Set the Goal Contract and explicit configured scope (whole relevant system by default), then run `/investigate` → `/integration-test-verify --fix-loop` → conditional `/debug-investigate`/`/fix` → configured case-owner sync → configured reference scan when needed → `/docs-update` → `/workflow-end` → `/watzup`. Each failing round requires a written Fault Verdict, a fix at the owner selected by architecture/source evidence, inline `/changes-review`, a Round Integrity Check, and fresh full verification under `integrationTestVerify.guidance` (default: two no-reset green runs for persistent/shared-state suites) or bounded escalation.
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

**When to use:** "make all integration tests pass", "fix the failing integration tests", "the suite is red after my change", "loop until all integration tests are green", "diagnose this flaky integration test". For AUTHORING new tests from specs use `/workflow-write-integration-test`; this workflow is for driving an EXISTING suite to green.

**Workflow:**

1. **Detect** — resolve the verification scope: the WHOLE system by default, or the target named in the prompt.
2. **Converge** — loop verify → adjudicate → fix → review the fix → re-verify until the configured repeat policy passes, bounded by a round cap and a Round Integrity Check.
3. **Sync** — reconcile the configured case/spec owner, refresh the integration-test reference only when its content changed, and update impacted feature docs.

**Key Rules:**

- MUST ATTENTION default the verification scope to the **WHOLE SYSTEM** — every integration-test project via `testProjectPattern` > `testProjects` — and pass it EXPLICITLY to `/integration-test-verify`; never fall through to its change-scoped git auto-detect default.
- MUST ATTENTION adjudicate EVERY failure with `/debug-investigate` + `/integration-test-review` (report-only) into ONE written Fault Verdict — `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `SOURCE-WRONG` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS` — with `file:line` evidence, BEFORE any edit.
- MUST ATTENTION fix at the invariant-owning component identified from project architecture and source evidence, never the crash site; a `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it.
- MUST ATTENTION run `/changes-review` (INLINE, report-only) on the fix diff of EVERY loop round that landed a fix, folding its validated findings back into that same round — no fix reaches the next round un-code-reviewed.
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

**IMPORTANT MANDATORY Steps:** /investigate -> /integration-test-verify --fix-loop -> /debug-investigate [on-failure] -> /fix [on-failure] -> /spec [mode=sync] -> /scan --target=integration-tests -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING] Step 0 — CREATE THE FULL TASK LIST BEFORE ANY VERIFICATION WORK.** Call `TaskList` first (resume, never duplicate), then `TaskCreate` EVERY task below in one pass — before `/investigate`, before the first test run. A workflow that starts verifying with an empty task list has already lost the ability to show where it is, and an interrupted run cannot be resumed. — why: this loop can span many rounds and a context compaction mid-round; the task list is the only state that survives it.
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
> **`[3]` and `[4]` are ROLL-UPS, not separate invocations.** They appear in the canonical sequence so the conditional fix half is visible in the task list from the start, but `/integration-test-verify --fix-loop` is their single executing owner: each firing happens INSIDE a round as `[2.N.2]` / `[2.N.5]` below. Complete `[3]`/`[4]` once the loop converges, summarizing which rounds fired them — or, if no round ever failed, complete them with the reason recorded (`no failure in any round`). NEVER run them a second time at workflow level after the loop returns — that would be a parallel fix loop the Inline Execution Gate forbids.
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

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Adjudicate-Before-Fix Gate:** inside `/integration-test-verify --fix-loop`, no edit may land before that failure has a written Fault Verdict backed by `/debug-investigate`'s traced root cause AND `/integration-test-review`'s gate findings. An unadjudicated failure gets "fixed" by whatever is nearest — which is almost always the assertion, and a weakened assertion protects nothing.

> **[CRITICAL] Per-Round Review Gate:** the loop's only convergence signal is "the tests went green" — and a green test cannot see a fix made at the wrong layer, an invariant broken elsewhere, dead code, a leaked domain concept, or a security/performance regression. So EVERY round that lands a fix must run `/changes-review` (INLINE, report-only) over that round's fix diff, validate its findings, and resolve them in the SAME round. A round that leaves a validated review finding open has not finished, even if its tests are green. This subsumes the `SOURCE-WRONG` verdict's own changes-review obligation — once per round over the whole fix diff, never twice, and never as a nested review→fix loop.

> **[CRITICAL] Inline Execution Gate:** `/integration-test-verify --fix-loop` and the skills it drives (its default `/integration-test-verify` pass WITHOUT the flag, `/debug-investigate`, `/integration-test-review`, `/changes-review`) run **INLINE via the `Skill` tool — NEVER as sub-agents**. `/debug-investigate` requires its `/why-review` gate in the SAME session/main agent, and `/integration-test-review` self-binds its own fix + re-review obligations; a sub-agent cannot own either or carry it back to the loop. Their OWN internal fan-outs (verify's per-project `integration-tester` agents, review's phase agents) remain sub-agents by their own design, so context stays bounded.

> **[CRITICAL] Documentation Sync Is Part Of Done:** the loop deliberately defers ALL doc work while it churns, so steps 3–5 are not an optional tail. `/spec [mode=sync]` reconciles §8 TCs ↔ the executing test code, `/scan --target=integration-tests` regenerates the integration-test reference doc from the suite as it now stands, and `/docs-update` catches every other impacted doc. A converged-but-undocumented suite leaves the next agent reading a reference doc describing tests that no longer exist.

> **Goal Contract propagation (workflow-owned):** At workflow start — BEFORE round 1 — resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the request). Its single required Success Criterion: _a fresh full `/integration-test-verify` over the resolved scope satisfies `integrationTestVerify.guidance`; absent guidance defaults to two zero-failure fresh runs without destructive shared-state reset when the scope persists or shares state, with no test deleted, skipped, or weakened._ Record the scope string, repeat policy, round cap (default 3), and baseline executed/skipped counts in **Constraints**. After every round, append the per-project counts, Fault Verdicts, and fixes to the Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `/workflow-end`.

Activate the `workflow-integration-test-green` workflow. Run `/start-workflow workflow-integration-test-green` with the user's prompt as context.

## Test Architecture Contract Handoff

Before round 1, `/investigate` locks one evidence-backed contract record that `/integration-test-verify --fix-loop` reuses on every round:

- `applicability`: mark the integration/system tier `APPLICABLE` only with verified runner/configuration evidence; record other tiers as `N/A — <evidence>` unless their configured owner is explicitly in scope.
- `owner`: keep `/integration-test-verify --fix-loop` as convergence owner and name the existing conditional owners for diagnosis, review, fixing, and fix review.
- `fullCommand` and `focusedCommand`: bind the full command to the resolved whole-system scope and the focused command to an explicitly named target; both must be configured, copy-ready, fail invalid or zero-match selections, and expose a simple Windows/macOS/Linux entry point when required.
- `runIdentity` and `dataStrategy`: use a unique non-sensitive run identity, valid public-use-case setup, explicit target/additive seed mode, and isolated mutable data for parallel workers.
- `repeatProof` and `result`: retain exact per-round counts, failing names, exit status, scope, and repeat/concurrency evidence required by `integrationTestVerify.guidance`; absent guidance defaults to two fresh no-reset full runs for persistent/shared-state scopes.

The loop owns this handoff and the Round Integrity Check: `/integration-test-verify` receives the fixed scope and commands, while `/debug-investigate`, `/integration-test-review`, `/fix`, and `/changes-review` retain their existing conditional ownership and gates. The existing delegated order remains the only route; no fallback runner, narrowed scope, or destructive reset may replace missing evidence.

**Steps:** /investigate → /integration-test-verify --fix-loop → /debug-investigate [on-failure] → /fix [on-failure] → /spec [mode=sync] → /scan --target=integration-tests → /docs-update → /workflow-end → /watzup

> **[CRITICAL] Bounded convergence — the loop is the workflow, not a step inside it.** Step 2 repeats: run the configured full scope → adjudicate and fix every evidenced failure → run that same scope freshly → repeat. Finish only after a fresh full run satisfies `integrationTestVerify.guidance` (default: two zero-failure no-reset runs for persistent/shared-state suites), with no test deleted, skipped, weakened, or de-scoped. Otherwise bounded-escalate via `AskUserQuestion` (round cap 3 · failures not shrinking across 2 rounds · failures increasing · coverage lost · an open validated review finding · `ENVIRONMENT-BLOCKED`). A failing report is evidence for the next action, not a claim of completion.
>
> **`/debug-investigate` and `/fix` are CONDITIONAL steps of the loop, executed INSIDE `/integration-test-verify --fix-loop`.** They fire on every round that reports a failure and are skipped (with a recorded reason) on a round that is already green. They are tracked as their own tasks per round (Step 0) so they are visible in the task list, but `/integration-test-verify --fix-loop` remains their single executing owner — NEVER invoke them as a second, parallel fix loop at workflow level. — why: the fix half was previously triple-owned across three skills, which let two loops double-fix one failure or each assume the other owned it; one owner with visible sub-tasks keeps both the accountability and the visibility.
>
> **Step 2 RECURSES:** default `/integration-test-verify` pass (WITHOUT `--fix-loop`) → *(on failure)* `/debug-investigate` → `/integration-test-review` → Fault Verdict → `/fix` → `/changes-review` → fresh full re-verify — repeating until the configured repeat policy passes. Steps 3 and 4 of the sequence are the workflow-level roll-ups of that conditional half; `/integration-test-verify --fix-loop` executes them inside each round, never again after it returns.

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`/investigate`** — Resolve the verification scope to a concrete test-project list. No target in the prompt → the WHOLE system (every project via `testProjectPattern` > `testProjects` from `docs/project-config.json` → `integrationTestVerify`). A named suite/module/feature/diff narrows it — state how the target maps to projects. Output: the fixed scope string the loop will reuse every round.
> **`/integration-test-verify --fix-loop`** — The convergence engine, and the only step that changes code. Sets the Goal Contract first, then loops: the default `/integration-test-verify` pass (WITHOUT the flag) INLINE over the fixed scope under `integrationTestVerify.guidance` → on ANY failure run `/debug-investigate` + `/integration-test-review` (report-only) → ONE Fault Verdict per failure → `/fix` at the invariant-owning component → **conditional `/changes-review`** (INLINE, report-only, over the round's fix diff — runs in EVERY round that landed a fix; validated findings fold back into that same round's fix set) → **Round Integrity Check** (executed count must not shrink, skipped count must not grow, scope must not narrow) → fresh full re-verify. Round cap 3; not shrinking across 2 rounds, increasing failures, cap hit with failures open, lost coverage, an open validated review finding, or `ENVIRONMENT-BLOCKED` → STOP and escalate via `AskUserQuestion`. Output: zero-failure runner evidence required by the policy + the per-round verdict/fix/review trail.
> **`/debug-investigate`** *(CONDITIONAL — only on a round with failures)* — Trace each failure end-to-start to its root cause BEFORE any edit; produces the traced cause that the Fault Verdict rests on. Skipped on a green round, with the skip recorded.
> **`/fix`** *(CONDITIONAL — only on a round with an adjudicated failure)* — Resolve the verdict at the invariant-owning component identified from project architecture and source evidence, never the crash site. A `SOURCE-WRONG` fix KEEPS or STRENGTHENS the test that caught it. NEVER runs before a written Fault Verdict exists for that failure.
> **`/spec [mode=sync]`** — Reconcile the selected canonical case owner and configured coverage carrier with executing tests. The strict default syncs Section 8 `TC-{FEATURE}-{NNN}` cases and their `CoveredBy` links; a native profile preserves its declared identities, fields, and cardinality. Run AFTER convergence so it syncs final tests, not intermediate ones.
> **`/scan --target=integration-tests`** — Regenerate the integration-test project-reference doc from the suite as it now stands: patterns, base fixtures, async-wait and unique-data helper conventions, suite/project inventory, and lessons. This is the doc every future agent reads before touching a test — a loop that changed test structure without regenerating it leaves the next agent following stale conventions.
> **`/docs-update`** — Update every OTHER impacted doc: feature-doc evidence fields, version history, and any doc embedding test counts or coverage claims the loop changed. Covers what `/spec [mode=sync]` (spec TCs) and `/scan --target=integration-tests` (the reference doc) do not.
> **`/workflow-end`** + **`/watzup`** — Close workflow state, then summarize the convergence trail and run the final handoff.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /integration-test-verify --fix-loop -> /debug-investigate [on-failure] -> /fix [on-failure] -> /spec [mode=sync] -> /scan --target=integration-tests -> /docs-update -> /workflow-end -> /watzup

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

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Drive the configured relevant integration-test scope to a truthful green result, adjudicate each failure before editing, fix at the component that owns the violated contract, verify under the configured repeat policy, and sync the selected canonical case/reference docs.

**IMPORTANT MUST ATTENTION Workflow:** Set the Goal Contract and explicit configured scope → `/investigate` → `/integration-test-verify --fix-loop` → on failure `/debug-investigate` + `/integration-test-review` → written Fault Verdict → fix at the evidenced owner → inline `/changes-review` → Round Integrity Check → fresh full re-verify under the configured repeat policy → sync the selected case owner → refresh changed references → `/docs-update` → `/workflow-end` → `/watzup`; NEVER weaken tests, narrow scope, lose coverage, or skip evidence, and bounded-escalate on the round cap or blocked environment.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below — each is a signpost to its canonical body above.

- **Integration Test Execution Discipline:** verify the WHOLE system, drive state through real use cases, `/debug-investigate` before any fix, 60s runtime cap, loop until the whole suite is green.
- **Test-Failure Fault Adjudication:** decide WHO is at fault (source vs test) against the governing spec before touching either side; never weaken an assertion or change source to satisfy a broken test.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; settle barriers belong in ARRANGE, never a widened assertion timeout.
- **AI Mistakes:** holistic-first debug, fix at responsible layer, surgical diff, verify all outputs.
- **Nested Tasks:** expand child phases, link parent workflow row when nested.
- **Project Reference Docs:** read required docs first, cite, `lessons.md` always.
- **Task Tracking:** bootstrap tasks; persist plan/review findings to disk incrementally.
- **Critical Thinking:** traced `file:line` proof, confidence >80%, never guess.
- **Incremental Persistence:** append findings per file to report; never hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** set the Goal Contract FIRST — before round 1 — with the zero-failures / 2-consecutive-green / no-test-lost success criterion
**IMPORTANT MUST ATTENTION** the verification scope defaults to the WHOLE SYSTEM and is passed to `/integration-test-verify` EXPLICITLY every round — never let it fall through to change-scoped git auto-detect
**IMPORTANT MUST ATTENTION** adjudicate EVERY failure into ONE written Fault Verdict BEFORE any edit — `/debug-investigate` for the traced root cause, `/integration-test-review` (report-only) for the test-side gates
**IMPORTANT MUST ATTENTION** every loop round that lands a fix runs `/changes-review` (INLINE, report-only) on that round's fix diff — validated findings fold into the same round; an open validated finding blocks the round even when the tests are green
**IMPORTANT MUST ATTENTION** run `/integration-test-verify --fix-loop` and the skills it drives INLINE via the `Skill` tool — NEVER as sub-agents
**IMPORTANT MUST ATTENTION** NEVER force green — no weakened assertions, no skips, no widened timeouts, no retries around a failing assertion, no repository-hacked data, no narrowed scope
**IMPORTANT MUST ATTENTION** the Round Integrity Check is BLOCKING — a shrinking executed-test count, a growing skipped count, or a narrowed scope is a REGRESSION, not convergence
**IMPORTANT MUST ATTENTION** show actual runner output for every pass/fail claim (Passed/Failed/Skipped counts + failing names)
**IMPORTANT MUST ATTENTION** documentation sync is part of DONE — `/spec [mode=sync]` + `/scan --target=integration-tests` + `/docs-update` all run after convergence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
