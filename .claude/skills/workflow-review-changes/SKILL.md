---
name: workflow-review-changes
version: 5.0.0
description: '[Workflow] Use when reviewing uncommitted, staged, or unstaged changes before committing — triage-selected reviewers, validated fixes, and re-review until the severity bar clears. Flag: --fix-loop re-runs the whole workflow until a round applies zero fixes.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers user-flow intent, stable locators/page objects, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` when the reviewed diff contains executable E2E/browser/user-flow artifacts; `/changes-review` owns that conditional route and it adds no workflow step.

## Quick Summary

**Goal:** Take the current changes to a defensible, converged review — every finding evidenced and validated, every validated blocking finding fixed at its owning layer, the fixed state re-reviewed, tests green, specs/docs in sync — at the lowest cost the change's size and risk allow.

**Summary:**

- **Purpose vs `/changes-review`:** `/changes-review` is the adaptive single reviewer. This workflow is the guaranteed-depth version for risky, large, or pre-merge work: it adds an independent whole-target adversarial pass, the specialist reviewers the triage selects, a runtime experience check, the entity-catalog refresh and the workflow close. Findings are fixed directly from the review reports — there is no plan ceremony.
- **Triage first, then choose:** classify the target (size band, change kinds, risk) and let the triage decide which optional specialists run and how deep — see [Triage](#triage--decide-what-deserves-review).
- **Required quality gates** are fixed ([list](#required-quality-gates)); **how** you orchestrate them — inline vs sub-agent, wave composition, batching, ordering within the data dependencies — is your call, optimized for wall-clock and token cost at equal quality.
- **Memory:** one task per selected step/aspect and ONE living report (the step-1 `/changes-review` report) that every reviewer, validation, fix and re-review appends to — the report is what survives compaction.
- **Loop:** review → validate → fix → re-review until the round bar clears (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOWs deferred), bounded at **2 rounds MAX**, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open (escalate via `AskUserQuestion` at whichever trips first: 2 no-progress repeats of the same blocker, review blockers increasing round-over-round (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget spent with a review blocker still open — round 2 blocked by MEDIUM/`NOT VERIFIABLE` alone, or round 3 by any review blocker — cap exhaustion escalates, never PASSes; a failing test gate is outside the budget and loops until green).
- **`--fix-loop` (OPTIONAL mode flag — absent by default, and absence changes nothing in this skill):** wraps this WHOLE workflow in an OUTER convergence loop that re-runs the default workflow INLINE round after round over a fixed scope until a complete round applies **ZERO fixes**, so every selected specialist re-reviews the fixed code from scratch. **When `--fix-loop` is passed, read `references/fix-loop.md` FIRST (BLOCKING).**
- **`--tests={prove|defer}` (default `prove`):** `prove` keeps this workflow's own read-only test run (`integration-test-review --prove-tests`) — right for a standalone review with no later verify step. `defer` is what a parent workflow passes when its later step is the single verify (`SYNC:verify-last-order`): this workflow is then STATIC — `integration-test-review` runs without `--prove-tests`, no test suite runs here, the fix step writes or amends tests without running them, and the parent's verify proves `tests-pass`. The flag passes through `--fix-loop` to every round.

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION read the run's deviation log (`tmp/workflow-runs/<runId>/skips.md`) when present and treat each skipped, merged, simplified or reordered step as a review input.
- MUST ATTENTION when creating/reviewing specs or tests, name the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry every unresolved finding or unaccepted risk into validation and fixing; do not close until it is fixed or explicitly accepted.
- MUST ATTENTION this workflow runs inline in the main session — top-level or nested inside a parent workflow; only its child reviewers run as sub-agents.

---

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles`, inlined with this skill's protocol blocks below; its closing digest ends this file.

---

## Step 0 — Bind the Review Loop (FIRST ACTION)

Before any review work, bind the loop as a standing obligation you self-drive — the **protocol loop is the binding mechanism** on every host; the `/goal` command is an optional accelerator:

1. **Protocol loop — ALWAYS binding.** Do not stop until: the initial reviews and the selected specialists have returned → findings are validated → validated blocking findings are fixed → the settled post-fix whole target is re-reviewed clean at the round's bar → the conditional experience check has run (source fixes it lands get the post-fix re-review again) → `/docs-update` has run → the workflow closes (top-level only). Stop early only on a documented escalation.
2. **`/goal` — WHEN AVAILABLE**, invoke it with that same condition to add a mechanical Stop-hook block. If unavailable, record `/goal accelerator unavailable — review loop bound by protocol` and continue; never fake a gate.

This binding always runs, including when this workflow is nested inside a parent workflow, because the orchestrator runs inline in the main (current) session and owns the loop directly.

## Triage — Decide What Deserves Review

Run the triage inside step 1 (`/changes-review` does it natively) and write the **Review Plan** at the top of the living report before any reviewer starts:

| Axis             | Values                                                                                                                                                            | Drives                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size band**    | XS 1–3 files / ≤100 changed lines · S ≤15 · M ≤60 · L ≤300 · XL >300 (thousands possible)                                                                         | orchestration: XS/S inline with few or no sub-agents; M one parallel wave; L/XL bounded batches per module/dimension, one report section per batch, plus a cross-batch synthesis pass |
| **Change kinds** | docs-only · tooling/config · test-only · behavior · public contract/API · data/schema/migration · security-sensitive · UI · infra/CI · cross-module/cross-service | which optional specialists run (each registry occurrence carries its `applicability.when`)                                                                                            |
| **Risk**         | irreversible · data integrity · security/authority · money/PII · cross-module blast radius                                                                        | depth: escalate a dimension to its specialist when risk is present, whatever the size                                                                                                 |

Escalate depth on risk and ambiguity, not file count alone. Mechanical churn (generated files, lockfiles, pure renames) is verified by pattern, recorded in the coverage ledger, and not reviewed line by line. When the triage shows an optional specialist does no real work, skip it with its registry `skipReason` and evidence — a skipped optional step is a logged deviation, never a silent omission.

## Required Quality Gates

The workflow is not done until every applicable gate holds, each with its evidence in the living report:

1. **Coverage** — every changed file is assigned to a reviewer or batch and reviewed (or classified mechanical with evidence), and a behavior-changing diff is also read whole once (`SYNC:whole-diff-correctness`); the Review Plan names which dimensions ran and why the others did not.
2. **Evidence** — every finding cites `file:line`, consequence, severity (per `SYNC:severity-rubric`) and confidence; speculation is not a finding.
3. **Validated before fixed** — no finding is fixed until it is validated: report-only specialists and batch reviewers validate their own findings in their own session (`/why-review --validate-findings`, `SYNC:systematic-review-batching` Step 2b); the orchestrator re-validates in the main session only findings no reviewer validated plus the independent check set of `SYNC:systematic-review-batching` Step 3 (the `validate-findings` occurrence).
4. **Fixed at the owner** — every validated finding that blocks the current round is fixed at its owning layer (`/fix --target=review`), with its Fix Log row appended to the living report; a defect finding whose owning cause the report does not trace gets `/debug-investigate` first.
5. **Re-reviewed** — when any fix or simplification landed, the post-fix `why-review` runs INLINE in FULL mode over the settled whole target (never `--validate-findings`, never just the last fix) — except a round-1 fix set of LOWs closed by scoped check or deferral with no simplification landed (`SYNC:double-round-trip-review` → Round-1 LOW closure), which needs no full re-review; a specialist whose finding was fixed also gets a scoped re-run of its dimension unless the holistic pass covers it with written justification.
6. **Tests** — every changed behavior is covered by tests that ran green in this run (`integration-test-review` is the `tests-pass` prover: its read-only run of the relevant tests is REQUIRED and a red or not-run result keeps the gate open; the fix step re-runs the tests its fixes affect). Under `--tests=defer` the parent's single verify step proves this gate instead: no test runs here, and a parent verify that edits anything re-runs this review.
7. **Spec/test/code sync** — every behavior-changing file is adjudicated CODE-WRONG / SPEC-STALE / SPEC-SILENT / AMBIGUOUS against its configured canonical owner, and every behavior-changing finding reconciles BOTH its profile-declared scenario/case and the mapped executing assertion/result (the strict default profile expresses these as §3/§4 requirements and §8 TCs). Green tests never normalize drift.
8. **User-decision gates** — integration-test coverage gaps and multilingual UI translation gaps are surfaced via `AskUserQuestion` by the orchestrator at consolidation (report-only reviewers only record them), never silently passed.
9. **Docs** — `/docs-update` runs over the final changeset (its triage may fast-exit).
10. **Close** — top-level only: `/workflow-end` then `/watzup`.

## Recommended Skills

The registry sequence is the recommended default order; `gate` occurrences always run, `core`/`optional` occurrences are recommendations governed by `/start-workflow` → Step Execution Protocol.

| Skill (registry occurrence)                                       | Runs when                                                                                           | Proves / feeds                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/changes-review` (gate, INLINE, report-only here)                | always                                                                                              | triage + Review Plan, dimensional baseline, spec-drift verdicts, living report          |
| `/why-review --target=whole-review-target` (sub-agent, FULL mode) | always recommended; may merge into step 1 only for XS docs/tooling-only diffs with a logged reason  | independent whole-target adversarial pass over the starting state                       |
| `/architecture-review --report-only`                              | cross-module, new module/layer, contract or dependency-direction change, or size ≥ M                | layering, coupling, ADR conformance                                                     |
| `/domain-entities-review --report-only`                           | entity / value-object / aggregate files changed                                                     | DDD model quality, invariants                                                           |
| `/performance-review --report-only`                               | data access, hot paths, caching, concurrency, render-heavy UI                                       | measured or evidenced performance risk                                                  |
| `/integration-test-review --report-only --prove-tests` (gate)     | always (without `--prove-tests` under `--tests=defer`)                                              | coverage map (behavior change → scenario/case → executing test) + relevant test results |
| `/security-audit --report-only`                                  | auth, secrets, input handling, dependencies, CI/infra, PII/money — or not provably security-neutral | exploitable-risk findings                                                               |
| `/production-readiness-review --report-only`                      | deployable service/API/job/migration/config/operational surface                                     | deploy/operate readiness score + gate                                                   |
| `/ui-review --report-only`                                        | frontend/UI files changed (also runs inside step 1's UI dimension, by design)                       | UI floor, layout, states, accessibility                                                 |
| `/why-review --validate-findings`                                 | after dedup: findings no reviewer validated, plus the independent check set (CRITICAL/HIGH, reviewer conflicts, MEDIUM sample) | ≥85% survival validation before any fix                                                 |
| `/debug-investigate` | a validated blocking finding is a defect whose report names the symptom but not the owning cause | root cause traced end-to-start before its fix (`root-cause-traced`) |
| `/fix --target=review`                                            | validated blocking findings exist                                                                   | owning-layer fixes + Fix Log + affected-test results                                    |
| `/code-simplifier`                                                | source code changed (diff or fixes)                                                                 | clarity/maintainability, behavior preserved; re-reviewed afterwards                     |
| `/why-review` (post-fix, INLINE, FULL mode)                       | a fix or simplification landed, other than a round-1 LOW-only fix set closed by scoped check with no simplification | the settled post-fix whole target is clean at the round's bar                           |
| `/experience-review`                                              | a configured or likely observable surface is affected                                               | runtime evidence + acceptance state; when it lands source fixes, re-run the post-fix `why-review` over the settled target before `/docs-update` (same round budget)                   |
| `/scan --target=domain-entities`                                  | final diff changes entity/model, DTO/contract, schema/migration or entity-sync evidence             | entity reference catalog fresh; otherwise skip it as a `pre-action` deviation authorized by the DOMAIN-ENTITY REFRESH clause of `preActions.injectContext`, with the cited reason                          |
| `/docs-update`                                                    | always                                                                                              | docs and specs synced to the final changeset                                                |
| `/workflow-end` → `/watzup`                                       | top-level invocation only                                                                           | run closed + wrap-up                                                                    |

Use `/plan` (+ `/plan-review`) inside the fix step only when the validated fix set is large, cross-module or ambiguous — never as a fixed step.

## Orchestration — Your Choice, Within These Constraints

You decide inline vs sub-agent, wave composition, batch boundaries and whether to merge or simplify a `core`/`optional` step, optimizing for speed and cost at equal quality. Only these data dependencies are fixed:

- A change is reviewed before it is fixed; fixes are re-verified (post-fix re-review + affected tests) after they land; `/code-simplifier` edits are re-reviewed; `/docs-update` runs on the final changeset; the close runs last.
- Read-only reviewers never share a wave with a writer; mutating steps (fix, simplify, experience-review remediation) run only after every reviewer they depend on has returned (the all-return barrier).
- The orchestrator stays inline in the main session; it never delegates the whole workflow to a sub-agent.
- Before consolidating findings and before trusting a failing test, confirm the target did not move under the run: `workflow-baseline.cjs report` for this run (or `git status` against the Review Plan). A path changed outside this run's own writes means another writer is active — stop and ask before attributing findings or failures on those paths to the change.

**Initial Parallel Phase (Steps 1–2)** — launch `/why-review --target=whole-review-target` as a fresh `code-reviewer` sub-agent in FULL mode over the whole review target combined with the current changes, then immediately run `/changes-review` inline while it is active. Neither consumes the other's output. Advance only after BOTH return, then fold the whole-target report into the living report.

**Specialist wave** — size the wave before you spawn it; every lens and gate still runs, only the number of agents changes. Specialists whose lenses read the same files share one agent that loads each lens's skill, unless the combined context would not fit with room to reason. An optional specialist whose surface is small and carries no material risk in its lens is folded into a reviewer that already reads those files, as concrete lens questions, without loading its skill — logged as a `merged` deviation. A `gate` specialist always runs its own skill and may carry merged lenses. Spawn the resulting agents together in ONE message and advance only after every one returns (a skipped or merged member counts as returned). Maximum shape, one agent per selected specialist:

```
Agent(architecture-review, subagent_type="architect", ...)           ← when selected
Agent(domain-entities-review, subagent_type="code-reviewer", ...)    ← when entity files changed
Agent(performance-review, subagent_type="performance-optimizer", ...)
Agent(integration-test-review, subagent_type="integration-tester", ...)  ← always
Agent(security-audit, subagent_type="security-auditor", ...)
Agent(production-readiness-review, subagent_type="code-reviewer", ...)
Agent(ui-review, subagent_type="ui-ux-designer", ...)                ← when frontend/UI files changed
```

Each reviewer brief carries: the `--report-only` flag (`integration-test-review` also gets `--prove-tests`: it is the `tests-pass` prover — except under `--tests=defer`, where every brief instead says "run no test suite": the leaf's read-only run is optional and the parent's single verify proves the tests); the triage and Review Plan; the unresolved-risk register and any generated-mirror or spec/test/docs drift already known; any step-1 finding in its dimension labelled as an UNVALIDATED hint to verify independently; the instruction to write its report FIRST to `tmp/reports/{skill}-{date}-{slug}.md` and append per file/batch; and the full review protocols per `SYNC:review-protocol-injection` — read the generated template `.claude/skills/shared/protocols/review-protocol-injection.md` once per wave and copy it WHOLESALE into each reviewer prompt, replacing only the `{placeholders}`. NEVER paraphrase, summarize or drop a protocol section, and NEVER hand the reviewer that path instead of the text. For L/XL targets, partition a specialist's scope into bounded batches rather than one oversized brief.

## Fix & Re-Review Loop

1. **Consolidate** — merge every reviewer report into the living report: findings by severity, conflicts between reviewers, deferred LOWs. **Deduplicate by root cause FIRST** (same owning `file:line` range and same violated rule — one entry listing every source reviewer, the highest justified severity) so no duplicate is validated or fixed twice.
2. **Validate** — run `/why-review --validate-findings <living-report>` in the main session over findings no reviewer validated plus the independent check set of `SYNC:systematic-review-batching` Step 3. Rejected findings are recorded with the evidence that rejected them.
3. **Fix** — `/fix --target=review` on validated blocking findings; it appends a Fix Log row per finding (FIXED / REJECTED / DEFERRED) and re-runs the affected tests (not under `--tests=defer`: the parent's verify runs them). Each behavior-changing fix reconciles its configured canonical owner, profile-declared scenario/case and mapped assertion/result (spec enrichment per cycle).
4. **Simplify** — `/code-simplifier` when source code changed; its edits join the post-fix target.
5. **Re-review** — the post-fix `why-review` re-reads the settled whole target from scratch INLINE in FULL mode (orchestrator confirmation bias is the risk it counters) and appends its verdict to the living report; blocking findings re-enter step 2 of this loop.

**Severity floor & budget** — round 1 converges on a pass with zero open findings at any severity — a LOW closes by a local fix plus scoped check, or by deferral when its fix needs new code or tests, and a LOW-only fix set with no simplification needs no full re-review (`SYNC:double-round-trip-review` → Round-1 LOW closure); from round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM, and a LOW-only round ENDS the loop with the LOWs listed under `## Deferred LOW Findings (severity floor, round ≥2)`. Never re-tier a real finding to reach the exit, and never apply the floor to a binary gate. Budget rules:

- **Repeated blocker cap** — if the same validated finding repeats for 2 full invocations with no progress, STOP and escalate via `AskUserQuestion`.
- **Review blockers increasing** — if round N finds MORE review blockers (validated findings at its own bar plus failed non-test binary gates; round-2 LOWs and failing test gates never count) than round N-1, STOP and escalate via `AskUserQuestion` — unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first.
- **Durable budget** — track rounds, findings and repeated blockers in the durable `review-policy.cjs` run record. Resume the same run after interruption; resume preserves completed rounds and findings. A changed target invalidates prior evidence and acceptance but must preserve the spent round budget — never reset to round 0 because context was lost.
- **Goal satisfaction** — at start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` and pass it to every child step; a required criterion at FAIL in the Goal Satisfaction matrix enters the same loop as a code finding.

PASS = one complete pass finds zero blocking issues after all validated fixes and verification are included — or, in round 1, a pass whose only findings were LOWs closed by scoped check or deferral with no simplification landed (`SYNC:double-round-trip-review` → Round-1 LOW closure), with each closure recorded. When no fix or simplification landed and no validated blocking finding was rejected by the fix step, the clean initial reviews and green tests are the PASS evidence and the post-fix re-review is skipped with its registry `skipReason`. A `REJECTED` Fix Log row is never self-certifying: it goes back through `/why-review --validate-findings` (or to the user) and the post-fix re-review runs.

## Nested Invocation

When a parent workflow (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`) runs this workflow as a step, everything above applies identically — including Step 0 and `/docs-update` (it documents the reviewed diff; the parent's own later `/docs-update` documents what its later steps produce, so neither replaces the other). Only the close differs: skip `/workflow-end` and `/watzup` with their registry `skipReason` and return control to the parent after `/docs-update`. A parent that runs its tests once, last (`SYNC:verify-last-order`) invokes this workflow with `--tests=defer`, and re-invokes it (still `--tests=defer`) when its verify step edited any source or test.

## `--fix-loop` Mode — Read `references/fix-loop.md` First (BLOCKING)

ONLY when the invocation carries `--fix-loop`: read `references/fix-loop.md` in full FIRST (BLOCKING) — before Step 0, because the mode runs before, and wraps, this workflow's Step 0. It holds the whole outer convergence loop: FL-0 → FL-3, the ordered convergence and escalation gate, and the review receipt. Without the flag, skip it; the default workflow above is unchanged.

---

**IMPORTANT MANDATORY Steps:** /changes-review -> /why-review --target=whole-review-target -> /architecture-review --report-only -> /domain-entities-review --report-only -> /performance-review --report-only -> /integration-test-review --report-only --prove-tests -> /security-audit --report-only -> /production-readiness-review --report-only -> /ui-review --report-only -> /why-review --validate-findings -> /debug-investigate -> /fix --target=review -> /code-simplifier -> /why-review -> /experience-review -> /scan --target=domain-entities -> /docs-update -> /workflow-end -> /watzup

Activate the `workflow-review-changes` workflow. Run `/start-workflow workflow-review-changes` with the user's prompt as context.

<!-- SYNC:verify-last-order -->

> **Verify-Last Order** — For any code-changing task (feature, bugfix, refactor, spec implementation), planned or not, build everything, review it, then run the tests ONCE at the end on the final tree. Nothing is skipped; the gates are only batched and ordered by cost.
>
> 1. **Build** — implement every phase and write its tests in the same pass. Between phases run only type-check or compile. NEVER a test suite, a mutation run or a review per phase or per wave.
> 2. **Review and fix, static** — one converging review fix-loop over the whole changeset, reading code and tests (TEST-GAP, WEAK-TEST by mutation thinking). It does NOT run tests (`/workflow-review-changes --tests=defer`). Fixes may write or amend tests but never run them.
> 3. **Verify once** — run the full affected suite once through the runner (`tester`, `/integration-test-verify`, `/test`), plus a mutation check on every changed core-logic line and new rule: use the project's mutation tool when configured, else temporarily break the line by hand-editing it: first copy the file to `tmp/` and restore from that copy afterwards, confirming a clean diff against the copy before green counts — NEVER `git checkout`, `restore`, `reset` or `stash` on the working tree, which can destroy the uncommitted work under test. The mutation check needs a step that may edit code — `/integration-test-verify`, or the main session when no such step runs — never the read-only `tester` or `/test`. A surviving mutant is a missing test: write it, then re-run. For a bugfix the mutation check is the RED proof: reverting the fix must turn its regression test red.
> 4. **Fix and re-run until green** — record a provisional verdict for each red test (SOURCE-WRONG · TEST-WRONG · TEST-NOT-OPTIMAL · ENVIRONMENT-BLOCKED · AMBIGUOUS) before any edit, fix at the owner, re-run the failing set, then the whole set once. NEVER weaken, skip or delete a test to force green.
> 5. **Re-review only if step 4 edited anything** — any source or test edit after the review re-runs the review (`--tests=defer`) over the settled tree; a re-review that applies a fix sends you back to step 3. This verify ↔ re-review alternation is capped at 2 turns: a third turn, or the same failure returning, STOPS and escalates via `AskUserQuestion` (the review's own round cap does not bound it). Done = a green verify AND no edit after the last review.
> 6. **Green counts only on the final tree** — an edit after the last green run invalidates it.
>
> **Exceptions:** a refactor's pre-change runs are allowed — the baseline run, and ONE targeted run of any characterization tests written before the code moves (they must be proven green on the unrefactored tree); neither is a per-phase run. A standalone review with no later verify step keeps its own test run (`--tests=prove`, the default).

<!-- /SYNC:verify-last-order -->

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->

<!-- SYNC:whole-diff-correctness -->

> **Whole-Diff Correctness Lane** — Purpose: catch the defects that only appear when a change is read as one behavior rather than as files — a flow that breaks across layers, a boundary the change mishandles, a caller it silently breaks. One reviewer reads the complete behavior-changing diff, plus whatever surrounding code it needs, as a single change. Split only when the diff cannot fit one context with room to reason, and then along the change's own flows, never by file type. It is one assignment: the orchestrator runs it inline when the change fits its context, otherwise gives it to a reviewer that already reads the whole target, and to a dedicated reviewer only when none has room; a batch or specialist reviewer reviews only its own scope. Batches and specialists add depth; they never replace this pass.
>
> **Hunt:** walk each changed behavior through the situations real users and data create — empty, first and last, limits, time crossing a day or time zone, alternate clients, roles, channels and states, retries and partial failure, concurrent use. The history of the changed lines (blame, recent commits) and the comments beside them record intent the change can break; the project's own instructions and conventions are part of the contract.
>
> **Report:** rate how sure you are each candidate is real and reachable — 0 not a defect, or not introduced or newly exposed by this change; 25 plausible, unverified; 50 likely, not confirmed; 85 confirmed by tracing the code path; 100 confirmed with a concrete failing input — and keep what reaches 85, each with its reachable trigger path and consequence. Rarity and impact set severity, never confidence: a confirmed rare defect is still reported. A candidate whose reality or reachability cannot be settled (below 85, not ruled out) is never silently dropped when its consequence would be MEDIUM or higher: report it as `NOT VERIFIABLE`, naming what would settle it; a lower-consequence unsettled candidate is an observation. What is never a finding is defined once in `SYNC:severity-rubric`.

<!-- /SYNC:whole-diff-correctness -->

<!-- SYNC:review-policy -->

> **Executable review policy — one predicate, one durable transition model.** Review skills and their tooling MUST use the canonical helper `.claude/scripts/lib/review-policy.cjs` (policy version 5) for round eligibility. The helper's `blockingFindings(round, findings, hardGates)` predicate returns every validated finding in round 1 except a LOW closed under the round-1 LOW closure (`resolution: 'scoped-fix-verified' | 'deferred'`, accepted only on a LOW), and only CRITICAL/HIGH/MEDIUM findings from round 2 onward; `NOT VERIFIABLE` is a separate unresolved-evidence state that remains blocking at every round. Failed binary gates are synthetic CRITICAL blocking findings at every round; record a test-green gate with `kind: 'test'` and every other gate with `kind: 'binary'` (the default). `evaluateRound` retains floor-round and deferred LOWs in `deferredLow` and scoped-fixed LOWs in `scopedClosedLow` (never both), never treats a LOW-only round as blocked after the floor applies, reports `extensionGranted` plus an `ESCALATE` status when the review budget is spent with review blockers open, and reports `failingTestGates` / `testLoopContinues` when failing test gates keep the round open. Severity is assigned before the predicate and never changed to obtain a PASS.
>
> **Round and minimum rules.** `MAX_ROUNDS` (the base budget) is 2 and `HARD_MAX_ROUNDS` is 3; both are ceilings, never targets. Round 3 is an EXTENSION, not part of the default budget: the helper grants it only when the recorded round-2 evaluation still has a validated CRITICAL or HIGH review blocker — a finding, or a failed non-test binary gate carried as synthetic CRITICAL — (`extensionGranted`), grants it at most once per run, and rejects any attempt to reach round 3 without that evidence, except the failing-test continuation below, when round 2's only blockers are failing test gates. **Failing test gates are outside the review budget:** they never earn the extension and never escalate, so while failing `kind: 'test'` gates are the ONLY blockers the helper keeps the run in `CONTINUE` and accepts the next round — past round 3 if needed — until the tests pass. A review blocker past the budget still escalates, and a round with no failing test gate never re-opens the run past its budget. A round-2 evaluation whose blockers are only MEDIUM or `NOT VERIFIABLE` ends the budget and escalates. A clean review ends once `round >= minRounds`; the default minimum is 1 and an explicit `minRounds` may not exceed the base budget of 2 — the extension is earned by evidence, never declared up front. The declaration is persisted and cannot be inferred from a round counter. A failing test-green, security-must-fix, required-artifact, or other binary gate is never waived by the severity floor.
>
> **Durable run record.** A review run MUST identify `runId`, target fingerprint, policy version, target revision, minimum/maximum rounds, completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use the atomic, lock-serialized transitions in `review-policy.cjs`: `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, and `check`. Repeating an identical completed round is idempotent and MUST NOT consume budget twice. A changed target fingerprint invalidates prior evidence and acceptance but MUST preserve the bounded round budget; stale evidence cannot be accepted. Record round 1 once, after any round-1 LOW closure: `targetFingerprint` is the post-fix target and `reviewedFingerprint` the target the full pass reviewed — required whenever a finding carries `scoped-fix-verified`, so the record never claims a full pass saw code it did not. A policy-version change (including the round-2 LOW floor, the conditional round-3 extension and the round-1 LOW closure) invalidates old records; start a new run rather than interpreting old evidence under new semantics. Interrupted/resumed runs retain completed rounds and findings. The record is bookkeeping, not consent, native permission, or proof that a host actually performed the review.
>
> **CLI boundary.** The helper CLI accepts JSON on stdin and uses its own real clock; a supplied `now` is rejected. State directories must be absolute, non-root real directories, records are size-bounded, and malformed/locked state fails closed for the transition. Full reports remain on disk; an inline result envelope is only a transport summary. Any new review policy consumer must add a semantic fixture, boundary counter-cases, a seeded mutant, and a report with the target fingerprint and command exit status.

<!-- /SYNC:review-policy -->

<!-- SYNC:parallel-phase-advancement -->

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `Agent`/sub-agent calls in a single response) — never drip them one per turn.
> 3. **Barrier — advance ONLY after EVERY member returns.** A member is "returned" when its work completes inline OR its sub-agent returns; a conditional member whose trigger is absent counts as returned. Do NOT advance, and do NOT start the next step, until the whole group has returned.
> 4. **A sub-agent return advances the step identically to an inline call.** Advancement is YOUR judgment against the task list — never wait for a hook or tool event. Mark each member `completed` (or "Skipped — <reason>") as the batch resolves.
> 5. **Mutating steps wait for the barrier.** Never start a code-mutating step (e.g. `code-simplifier`) until the full batch has returned — it must act on the complete review snapshot, not a partial one.
> 6. **Hooks are accelerators only.** Any step-tracking hook may emit a "next step" hint as an optimization; correctness MUST NOT depend on it. Claude and Codex both advance from this static rule when hooks are absent, disabled, or stale.
>
> **Blocked until:** `- [ ]` all members spawned in one message `- [ ]` every member returned (incl. skipped conditional) `- [ ]` each member marked completed/skipped `- [ ]` mutating step deferred until after the barrier.

<!-- /SYNC:parallel-phase-advancement -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. A reviewer prompt carries every protocol body inline and is never handed a path to go read (the reviewer-prompt rule of `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict (exception: a round-1 LOW-only fix set closed by scoped check, with no simplification landed, per `SYNC:double-round-trip-review`)
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero open findings at any severity (a LOW closed by scoped check or deferral is not open); **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Compaction, resume, or long-running work makes memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts; check the source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Map the docs, generated mirrors, configs, and callers a removal can stale.
> **Trace the full impact chain after edits, and verify ALL affected outputs.** A changed definition reaches derived outputs and consumers; one green check is not all green checks.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never delivery/retry bookkeeping in shared infrastructure that any co-running process can write; such a check passes alone and flakes once anything shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap, immediately before target/source reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate but never prove it ran.
>
> 1. **Scope** — identify file types, domain area, and operation.
> 2. **Project config is OPTIONAL.** Read the configured project-config file via its loader (default `docs/project-config.json`) when it exists. Absent is a supported state, not an error: run on portable defaults, derive project facts (paths, commands, conventions, architecture, test/spec layout) from repository evidence (manifests, lockfiles, scripts, CI, layout, root instruction files), state material assumptions, never block, and at most OFFER `/project-init` or `/project-config` once. Present → minimum valid shape is a non-empty `project.name`; omitted optional capabilities use neutral defaults or skip. A DECLARED section left malformed or incomplete is a configuration error: fail closed on it and run `/project-init` or `/project-config` before relying on it — why: silent defaults would present wrong facts as authoritative. Verify material config hints against repository evidence; generic defaults are never project facts.
> 3. **Select docs.** Always-on: the project-init-owned `lessons.md` and docs-index inputs at their configured owner paths — read independently, never appended to `referenceDocs`. Task-specific: an explicit `referenceDocs` array is the exact selection, subsets and `[]` included; absent → the runtime capability-aware resolver (portable baseline plus configuration- or repository-evidenced capabilities; may be empty). The scan-target manifest is a registry, not a default selection. Filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). Custom-doc schema, ownership, and path-safety rules: `.claude/skills/scan/references/targets.md`.
> 4. **Route by phase.** Just in time, read the selected docs the table names for the phase you are ABOUT to enter, plus any selected custom doc whose `purpose` covers that phase. An unmatched row is `Not applicable`, never a blocker.
>
> | About to… | Read first (when selected and present) |
> | --- | --- |
> | investigate, explain, plan, design, estimate | `project-structure-reference.md`, `domain-entities-reference.md`, plus the edit-row docs for every file type the plan will touch |
> | edit or write code | `code-review-rules.md`, plus server-side / non-UI code → `backend-patterns-reference.md`; UI → `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md` |
> | write, run, fix, or review tests or test data | the matching kind: `integration-test-reference.md` · `e2e-test-reference.md` · `seed-test-data-reference.md` |
> | author or change specs, test cases, or docs | `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`; `workflow-spec-test-code-cycle-reference.md` when specs, tests, and code must stay in sync |
> | review a diff, plan, spec, or artifact | `code-review-rules.md`, plus the edit/test/spec-row docs for every file type under review |
>
> 5. **Per-file conventions** (`contextGroups[]` in the project config) add rules for the exact file read or edited: hooks deliver them where they run; elsewhere run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` before the first edit of an unfamiliar path class.
> 6. **Cite and repair.** State `Reference docs read: ... | Not applicable: ...` (record an explicit empty selection); still honor references the active skill or task requires. A missing/stale always-on input or selected/required doc, or a malformed declared config section → `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on it.
> 7. **Dedup within ~200K tokens.** A doc counts as loaded only when its full content came back to THIS context from your own read, after the last compaction and within roughly the last 200K tokens, and it has not changed since — list it in `Reference docs read:` as `<doc> (loaded)` and skip the re-read. Everything else is not loaded: a hook reminder, a summary, a doc merely named in the conversation, or a read by another agent. Re-select and re-read after compaction, resume, a material context change, or ~200K tokens of growth (= the file-convention hook default). A delegated sub-agent starts empty: name the resolved doc paths in its brief.
>
> **Ready when:** scope set · config read or its absence recorded · always-on inputs confirmed · selection applied (may be empty) · phase docs read or cited `(loaded)` · citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — serial execution of provably independent tasks wastes wall-clock. Applies to every multi-step job (workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync). **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`; else `SEQ`, naming the dependency that forces it.
> 2. **Group `PAR` into waves.** No edge between members; two writers of one file NEVER share a wave; read-only work parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **Cost check before every wave:** each sub-agent pays a fixed context load before any work — its agent definition, every skill it loads or preloads, its brief and reference docs — commonly tens of thousands of tokens, far more than one duplicated protocol block. Dispatch only a task whose own work clearly exceeds that load; otherwise do it inline, or fold it into an agent that already reads the same files as concrete questions (that agent need not load the task's whole skill) — unless the task's risk needs its full protocol: risk sets depth, file count never does. Merge tasks that read the same files or reference docs into one agent, and prefer fewer, larger agents over many small ones. Parallelism buys wall-clock time, never free tokens.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · a task whose own work is smaller than its sub-agent's fixed context load (do it inline or merge it) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier means the same everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> **Reachable trigger path (required):** a finding also names HOW a supported configuration reaches the defect — the caller, input, state or event sequence that drives execution or data there. A concern on a path nothing reaches (dead code, a branch its guard excludes, an impossible state) is an observation: record it as advice, never as a LOW to fix. Also never a finding: what a compiler, type checker, linter or test run for this change already reports in the review evidence; a behavior change the stated intent asks for; an issue silenced by a suppression that predates this change and states its reason (a suppression the change adds is itself reviewed); a pre-existing issue on a line the change neither touched nor made reachable. When reachability cannot be settled and the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it; a polish-level concern with unsettled reachability is an observation. — why: a speculative LOW admitted as a finding becomes build work in round 1.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; a silent failure on a critical path. A failed binary gate is carried by the executable policy as a separate synthetic blocker, not an ordinary severity judgment. |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift — real impact, not immediate material loss. A recorded follow-up does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and unlocking or forfeiting the round-3 extension never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:session-goal-ledger -->

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

<!-- /SYNC:session-goal-ledger -->

<!-- SYNC:workflow-registry-binding -->

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered recommended step list | One task per occurrence. Skip, merge, simplify and reorder follow `/start-workflow` → Step Execution Protocol; `gate` steps always run. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, `role` (which steps are gates), recommended order, args, applicability, barriers and execution mode; any flex from that order is decided only by `/start-workflow` → Step Execution Protocol. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `/sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Whole-diff correctness lane: read the complete behavior-changing diff once as one change (split only by flow when it cannot fit); hunt defects through real situations — boundaries, time crossing a day or zone, alternate clients, roles and states, retries, concurrency — using blame/history and adjacent comments as recorded intent; keep only confirmed findings (85+: code path traced) with a reachable trigger path, and report an unsettled candidate that would be MEDIUM or higher as `NOT VERIFIABLE` naming what would settle it, never dropped — rarity sets severity, never confidence.

<!-- /SYNC:whole-diff-correctness:reminder -->

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

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.
- **MANDATORY** Cost check: a sub-agent's fixed load (definition + loaded skills + brief) is commonly tens of thousands of tokens — dispatch only work that clearly exceeds it; fold a small lens into an agent already reading the same files, unless its risk needs the full protocol; prefer fewer, larger agents.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `/start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-audit`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** take the current changes to a converged review — triage-selected reviewers, validated findings, owning-layer fixes, a post-fix re-review of the settled whole target, tests green, specs/docs in sync — at the lowest cost the change's size and risk allow (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred).

**IMPORTANT MUST ATTENTION** triage first (size band · change kinds · risk) and write the Review Plan into the living report before any reviewer starts; the triage selects the optional specialists and the orchestration — every skipped optional step carries its registry `skipReason` and evidence.
**IMPORTANT MUST ATTENTION** launch the whole-target FULL-mode `/why-review` as a fresh sub-agent, immediately run `/changes-review` inline, and advance only after BOTH return; then spawn the selected specialists (`--report-only`) in ONE message and advance only after every spawned reviewer returns.
**IMPORTANT MUST ATTENTION** no finding is fixed before it is validated; validated blocking findings go to `/fix --target=review`; any fix or simplification — except a round-1 LOW-only fix set closed by scoped check with no simplification — triggers the post-fix `why-review` INLINE in FULL mode over the settled whole target — re-read from scratch, never just the last fix.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); "Insufficient evidence" is valid output — no speculation.
**IMPORTANT MUST ATTENTION** adjudicate every behavior-vs-spec divergence (CODE-WRONG / SPEC-STALE / SPEC-SILENT / AMBIGUOUS) against the configured canonical owner; every behavior-changing fix reconciles its profile-declared scenario/case and mapped executing assertion/result — green tests never normalize drift.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory `AskUserQuestion` user-decision gates.
**IMPORTANT MUST ATTENTION** one task per selected step/aspect and ONE living report appended by every reviewer, validation, fix and re-review — re-read it and `TaskList` after any compaction.
**IMPORTANT MUST ATTENTION** steps follow `/start-workflow` → Step Execution Protocol: `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged; NEVER batch-complete validation gates.
**IMPORTANT MUST ATTENTION** this workflow always runs inline in the main session, top-level or nested; only its child reviewers run as sub-agents; nested → skip `/workflow-end` + `/watzup` and return to the parent after `/docs-update`.

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** re-run the WHOLE default workflow INLINE via the `Skill` tool (NEVER a sub-agent), round after round, over a FIXED scope (branch-diff base ∪ current uncommitted changes, recomputed each round) until a complete round applies **ZERO fixes** (working-tree fingerprint unchanged AND reviews clean at that round's bar) — not merely one clean review; its value is the fresh full specialist sweep the default post-fix re-review never re-runs. **Mode scope:** this workflow-level mode re-runs the WHOLE workflow and is DISTINCT from standalone `/changes-review --fix-loop`, which pairs ONE review pass with `/fix` on validated findings — their convergence wording differs by design. Bind the outer protocol loop (primary) plus the `/goal` accelerator when available, keep a Goal Contract with a per-round Iteration Log, regenerate a fresh task plan every round, and evaluate the FL-2 rows in order — first matching row decides.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 2, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open)**; review blockers not shrinking across 2 rounds (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the budget spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → **STOP & escalate** via `AskUserQuestion`. NEVER loop past round 3 on review blockers, or open-ended — only failing test gates continue, until green. In `--fix-loop`, from round 2 a LOW-only round that landed no other edit is a zero-fix round and ENDS the loop.

**Anti-Rationalization:**

| Evasion                                                       | Rebuttal                                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Small diff, run every specialist anyway"                     | Triage decides — an unneeded specialist costs time and tokens and adds nothing; skip it with its `skipReason` and evidence.                               |
| "Risky change but only 2 files, skip the specialists"         | Risk escalates depth, not file count — a 2-file auth change still gets `/security-audit`.                                                                |
| "Findings look right, fix them directly"                      | Validate first — a false positive fixed is a regression shipped.                                                                                          |
| "I already know what I fixed, skip re-review"                 | Orchestrator confirmation bias — re-read the settled whole target from scratch INLINE.                                                                    |
| "Post-fix re-review can reuse `--validate-findings`"          | No — validation re-checks a findings list; the post-fix pass must run FULL mode over the whole target.                                                    |
| "Tests are green, the spec drift is fine"                     | Green can encode the drift itself — adjudicate every divergence.                                                                                          |
| "Same blocker again, one more loop will fix it"               | 2 no-progress repeats or a spent budget → escalate via `AskUserQuestion`; never loop open-ended.                                                          |
| "Round 2 turned up two more nits, loop again"                 | From round 2 a LOW-only round ends the loop — defer and list the LOWs.                                                                                    |
| "`--fix-loop`: the round's review was clean, so it converged" | Not while that round landed any edit (a `/code-simplifier` change included) — run the next round to prove a zero-fix pass, or escalate at a spent budget. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
