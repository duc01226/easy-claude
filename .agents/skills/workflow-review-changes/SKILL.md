---
name: workflow-review-changes
description: '[Workflow] Use when reviewing uncommitted changes that are cross-module, contract-changing or security-sensitive: specialist lenses, validated fixes, re-review until clean; --fix-loop adds an outer convergence loop. Focused diff: changes-review.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers user-flow intent, stable locators/page objects, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` when the reviewed diff contains executable E2E/browser/user-flow artifacts; `$changes-review` owns that conditional route and it adds no workflow step.

## Quick Summary

**Goal:** Take the current changes to a defensible, converged review — every finding evidenced and validated, every validated blocking finding fixed at its owning layer, the fixed state re-reviewed, tests green, specs/docs in sync — at the lowest cost the change's size and risk allow.

**Summary:**

- **Purpose vs `$changes-review`:** `$changes-review` is the adaptive single reviewer. This workflow is the guaranteed-depth version for risky, large, or pre-merge work: it adds an independent whole-target adversarial pass, the specialist reviewers the triage selects, a runtime experience check, the entity-catalog refresh and the workflow close. Findings are fixed directly from the review reports — there is no plan ceremony.
- **Triage first, then choose:** classify the target (size band, change kinds, risk) and let the triage decide which optional specialists run and how deep — see [Triage](#triage--decide-what-deserves-review).
- **Required quality gates** are fixed ([list](#required-quality-gates)); **how** you orchestrate them — inline vs sub-agent, wave composition, batching, ordering within the data dependencies — is your call, optimized for wall-clock and token cost at equal quality.
- **Memory:** one task per selected step/aspect and ONE living report (the step-1 `$changes-review` report) that every reviewer, validation, fix and re-review appends to — the report is what survives compaction.
- **Loop:** review → validate → fix → re-review until the round bar clears (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOWs deferred), bounded at **3 rounds MAX** (escalate using ask user tool at whichever trips first: 2 no-progress repeats of the same blocker, review blockers increasing round-over-round, or the review budget spent with a review blocker still open — round 3 blocked by any review blocker — cap exhaustion escalates, never PASSes; a failing test gate is outside the budget and loops until green).
- **`--fix-loop` (OPTIONAL mode flag — absent by default, and absence changes nothing in this skill):** wraps this WHOLE workflow in an OUTER convergence loop that re-runs the default workflow INLINE round after round over a fixed scope until a complete round applies **ZERO fixes**, so every selected specialist re-reviews the fixed code from scratch. **When `--fix-loop` is passed, read `references/fix-loop.md` FIRST (BLOCKING).**
- **`--tests={prove|defer}` (default `prove`):** `prove` keeps this workflow's own read-only test run (`integration-test --mode=review --prove-tests`) — right for a standalone review with no later verify step. `defer` is what a parent workflow passes when its later step is the single verify (`SYNC:verify-last-order`): this workflow is then STATIC — `integration-test --mode=review` runs without `--prove-tests`, no test suite runs here, the fix step writes or amends tests without running them, and the parent's verify proves `tests-pass`. The flag passes through `--fix-loop` to every round.
- **Caller-mode flags to children:** this workflow is the caller, so it passes its children the flags of the caller-mode contract — `references/caller-mode.md` (`--report-only`, `--defer=<list>`). Step 1 `$changes-review` gets `--report-only --defer=whole-target,specialists,tests,entities` (plus `simplify` while the `code-simplifier` step will run); the `code-simplifier` step gets `--defer=review`. The registry occurrences carry these flags as their `args` (a runner building tasks from the registry passes them as written), and the orchestrator appends `,simplify` or drops a flag only as the caller-mode contract allows. Read that file before the first child call.

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

1. **Protocol loop — ALWAYS binding.** Do not stop until: the initial reviews and the selected specialists have returned → findings are validated → validated blocking findings are fixed → the settled post-fix whole target is re-reviewed clean at the round's bar → the conditional experience check has run (source fixes it lands get the post-fix re-review again) → `$docs-manager --mode=update` has run → the workflow closes (top-level only). Stop early only on a documented escalation.
2. **`/goal` — WHEN AVAILABLE**, invoke it with that same condition to add a mechanical Stop-hook block. If unavailable, record `/goal accelerator unavailable — review loop bound by protocol` and continue; never fake a gate.

This binding always runs, including when this workflow is nested inside a parent workflow, because the orchestrator runs inline in the main (current) session and owns the loop directly.

## Triage — Decide What Deserves Review

Run the triage inside step 1 (`$changes-review` does it natively) and write the **Review Plan** at the top of the living report before any reviewer starts:

| Axis             | Values                                                                                                                                                            | Drives                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size band**    | XS 1–3 files / ≤100 changed lines · S ≤15 · M ≤60 · L ≤300 · XL >300 (thousands possible)                                                                         | orchestration: XS/S inline with few or no sub-agents; M one parallel wave; L/XL bounded batches per module/dimension, one report section per batch, plus a cross-batch synthesis pass |
| **Change kinds** | docs-only · tooling/config · test-only · behavior · public contract/API · data/schema/migration · security-sensitive · UI · AI feature · infra/CI · cross-module/cross-service | which optional specialists run (each registry occurrence carries its `applicability.when`)                                                                                            |
| **Risk**         | irreversible · data integrity · security/authority · money/PII · cross-module blast radius                                                                        | depth: escalate a dimension to its specialist when risk is present, whatever the size                                                                                                 |

Escalate depth on risk and ambiguity, not file count alone. Decide the **AI feature** kind objectively: run `node .claude/scripts/ai-signal-scan.cjs --base <review base> --json` FIRST (drop `--base` only when no review base exists; with a base it covers committed-since-merge-base plus the working tree) — it lists the changed files that call a model or hold prompts, agents, tools, retrieval, evals or guardrails. Read its `status`: `surface` → spawn `ai-engineering-review`; `clean` → skip with the registry `skipReason` verbatim (The scan reports status clean; record `No AI-feature surface` once and read or spawn nothing for this step.); `unknown` (git error, rejected or empty base, truncated) → NOT VERIFIABLE: run the checklist §0.1 signal grep once, and if that is also inconclusive spawn the specialist. Mechanical churn (generated files, lockfiles, pure renames) is verified by pattern, recorded in the coverage ledger, and not reviewed line by line. When the triage shows an optional specialist does no real work, skip it with its registry `skipReason` and evidence — a skipped optional step is a logged deviation, never a silent omission.

## Required Quality Gates

The workflow is not done until every applicable gate holds, each with its evidence in the living report:

1. **Coverage** — every changed file is assigned to a reviewer or batch and reviewed (or classified mechanical with evidence), and a behavior-changing diff is also read whole once (`SYNC:whole-diff-correctness`); the Review Plan names which dimensions ran and why the others did not.
2. **Evidence** — every finding cites `file:line`, consequence, severity (per `SYNC:severity-rubric`) and confidence; speculation is not a finding.
3. **Validated before fixed** — no finding is fixed until it is validated: report-only specialists and batch reviewers validate their own findings in their own session (`$why-review --validate-findings`, `SYNC:systematic-review-batching` Step 2b); the orchestrator re-validates in the main session only findings no reviewer validated plus the independent check set of `SYNC:systematic-review-batching` Step 3 (the `validate-findings` occurrence).
4. **Fixed at the owner** — every validated finding that blocks the current round is fixed at its owning layer (`$fix --target=review`), with its Fix Log row appended to the living report; a defect finding whose owning cause the report does not trace gets `$investigate --mode=debug` first.
5. **Re-reviewed** — when any fix or simplification landed, the post-fix `why-review` runs INLINE in FULL mode over the settled whole target (never `--validate-findings`, never just the last fix) — except a round-1 fix set of LOWs closed by scoped check or deferral with no simplification landed (Round-1 LOW closure), which needs no full re-review; a specialist whose finding was fixed also gets a scoped re-run of its dimension unless the holistic pass covers it with written justification.
6. **Tests** — every changed behavior is covered by tests that ran green in this run (`integration-test --mode=review` is the `tests-pass` prover: its read-only run of the relevant tests is REQUIRED and a red or not-run result keeps the gate open; the fix step re-runs the tests its fixes affect). Under `--tests=defer` the parent's single verify step proves this gate instead: no test runs here, and a parent verify that edits anything re-runs this review.
7. **Spec/test/code sync** — every behavior-changing file is adjudicated CODE-WRONG / SPEC-STALE / SPEC-SILENT / AMBIGUOUS against its configured canonical owner, and every behavior-changing finding reconciles BOTH its profile-declared scenario/case and the mapped executing assertion/result (the strict default profile expresses these as §3/§4 requirements and §8 TCs). Green tests never normalize drift.
8. **User-decision gates** — integration-test coverage gaps and multilingual UI translation gaps are surfaced using ask user tool by the orchestrator at consolidation (report-only reviewers only record them), never silently passed.
9. **Docs** — `$docs-manager --mode=update` runs over the final changeset (its triage may fast-exit).
10. **Close** — top-level only: `$workflow-end` then `$watzup`.

## Recommended Skills

The registry sequence is the recommended default order; `gate` occurrences always run, `core`/`optional` occurrences are recommendations governed by `$start-workflow` → Step Execution Protocol.

| Skill (registry occurrence)                                       | Runs when                                                                                           | Proves / feeds                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$changes-review --report-only --defer=…` (gate, INLINE)          | always                                                                                              | triage + Review Plan, dimensional baseline, spec-drift verdicts, living report          |
| `$why-review --target=whole-review-target` (sub-agent, FULL mode) | always recommended; may merge into step 1 only for XS docs/tooling-only diffs with a logged reason  | independent whole-target adversarial pass over the starting state                       |
| `$architecture --mode=review --report-only`                              | cross-module, new module/layer, contract or dependency-direction change, or size ≥ M                | layering, coupling, ADR conformance                                                     |
| `$domain-analysis --mode=review --report-only`                           | entity / value-object / aggregate files changed                                                     | DDD model quality, invariants                                                           |
| `$performance-review --report-only`                               | data access, hot paths, caching, concurrency, render-heavy UI                                       | measured or evidenced performance risk                                                  |
| `$integration-test --mode=review --report-only --prove-tests` (gate)     | always (without `--prove-tests` under `--tests=defer`)                                              | coverage map (behavior change → scenario/case → executing test) + relevant test results |
| `$security-audit --report-only`                                  | auth, secrets, input handling, dependencies, CI/infra, PII/money — or not provably security-neutral | exploitable-risk findings                                                               |
| `$production-readiness-review --report-only`                      | deployable service/API/job/migration/config/operational surface                                     | deploy/operate readiness score + gate                                                   |
| `$ui-design --mode=review --report-only`                          | frontend/UI files changed (step 1 runs with `--defer=specialists`, so this is the only UI lens)     | UI floor, layout, states, accessibility                                                 |
| `$ai-engineering-review --report-only`                            | `node .claude/scripts/ai-signal-scan.cjs --base <review base> --json` (run first) reports `status: surface` (`unknown` and an inconclusive §0.1 grep also run it) — spawned only then | AI Gate Report: framing, engineering floor, trust boundaries, cost and eval gaps |
| `$why-review --validate-findings`                                 | after dedup: findings no reviewer validated, plus the independent check set (CRITICAL/HIGH, reviewer conflicts, MEDIUM sample) | ≥85% survival validation before any fix                                                 |
| `$investigate --mode=debug` | a validated blocking finding is a defect whose report names the symptom but not the owning cause | root cause traced end-to-start before its fix (`root-cause-traced`) |
| `$fix --target=review`                                            | validated blocking findings exist                                                                   | owning-layer fixes + Fix Log + affected-test results                                    |
| `$code-simplifier --defer=review`                                 | source code changed (diff or fixes)                                                                 | clarity/maintainability, behavior preserved; re-reviewed by the post-fix `why-review`   |
| `$why-review` (post-fix, INLINE, FULL mode)                       | a fix or simplification landed, other than a round-1 LOW-only fix set closed by scoped check with no simplification | the settled post-fix whole target is clean at the round's bar                           |
| `$experience-review`                                              | a configured or likely observable surface is affected                                               | runtime evidence + acceptance state; when it lands source fixes, re-run the post-fix `why-review` over the settled target before `$docs-manager --mode=update` (same round budget)                   |
| `$scan --target=domain-entities`                                  | final diff changes entity/model, DTO/contract, schema/migration or entity-sync evidence             | entity reference catalog fresh; otherwise skip it as a `pre-action` deviation authorized by the DOMAIN-ENTITY REFRESH clause of `preActions.injectContext`, with the cited reason                          |
| `$docs-manager --mode=update`                                                    | always                                                                                              | docs and specs synced to the final changeset                                                |
| `$workflow-end` → `$watzup`                                       | top-level invocation only                                                                           | run closed + wrap-up                                                                    |

Use `$plan` inside the fix step only when the validated fix set is large, cross-module or ambiguous — never as a fixed step. The plan must carry the decisions and final gates.

## Orchestration — Your Choice, Within These Constraints

You decide inline vs sub-agent, wave composition, batch boundaries and whether to merge or simplify a `core`/`optional` step, optimizing for speed and cost at equal quality. Only these data dependencies are fixed:

- A change is reviewed before it is fixed; fixes are re-verified (post-fix re-review + affected tests) after they land; `$code-simplifier` edits are re-reviewed; `$docs-manager --mode=update` runs on the final changeset; the close runs last.
- Read-only reviewers never share a wave with a writer; mutating steps (fix, simplify, experience-review remediation) run only after every reviewer they depend on has returned (the all-return barrier).
- The orchestrator stays inline in the main session; it never delegates the whole workflow to a sub-agent.
- Before consolidating findings and before trusting a failing test, confirm the target did not move under the run: `workflow-baseline.cjs report` for this run (or `git status` against the Review Plan). A path changed outside this run's own writes means another writer is active — stop and ask before attributing findings or failures on those paths to the change.

**Initial Parallel Phase (Steps 1–2)** — launch `$why-review --target=whole-review-target` as a fresh `code-reviewer` sub-agent in FULL mode over the whole review target combined with the current changes, then immediately run `$changes-review --report-only --defer=whole-target,specialists,tests,entities` inline while it is active (append `,simplify` when the `code-simplifier` step will run: the same simplification lens then runs once, mutating, after the fixes). Neither consumes the other's output. Advance only after BOTH return, then fold the whole-target report into the living report.

**Specialist wave** — size the wave before you spawn it; every lens and gate still runs, only the number of agents changes. Specialists whose lenses read the same files share one agent that loads each lens's skill, unless the combined context would not fit with room to reason. An optional specialist whose surface is small and carries no material risk in its lens is folded into a reviewer that already reads those files, as concrete lens questions, without loading its skill — logged as a `merged` deviation. A `gate` specialist always runs its own skill and may carry merged lenses. Spawn the resulting agents together in ONE message and advance only after every one returns (a skipped or merged member counts as returned). Maximum shape, one agent per selected specialist:

```
spawn_agent(architecture --mode=review, agent_type="architect", ...)           ← when selected
spawn_agent(domain-analysis --mode=review, agent_type="code-reviewer", ...)    ← when entity files changed
spawn_agent(performance-review, agent_type="performance-optimizer", ...)
spawn_agent(integration-test --mode=review, agent_type="integration-tester", ...)  ← always
spawn_agent(security-audit, agent_type="security-auditor", ...)
spawn_agent(production-readiness-review, agent_type="code-reviewer", ...)
spawn_agent(ui-design --mode=review, agent_type="ui-ux-designer", ...)  ← when frontend/UI files changed
spawn_agent(ai-engineering-review, agent_type="ai-engineering-reviewer", ...)   ← only when the scan (run with `--base <review base>`) reports `status: surface`; put the review base in the brief
```

Each reviewer brief carries: the `--report-only` flag (`integration-test --mode=review` also gets `--prove-tests`: it is the `tests-pass` prover — except under `--tests=defer`, where every brief instead says "run no test suite": the leaf's read-only run is optional and the parent's single verify proves the tests); the triage and Review Plan; the unresolved-risk register and any generated-mirror or spec/test/docs drift already known; any step-1 finding in its dimension labelled as an UNVALIDATED hint to verify independently; the instruction to write its report FIRST to `tmp/reports/{skill}-{date}-{slug}.md` and append per file/batch; and the full review protocols per `SYNC:review-protocol-injection` — read the generated template `.claude/skills/shared/protocols/review-protocol-injection.md` once per wave and copy it WHOLESALE into each reviewer prompt, replacing only the `{placeholders}`. NEVER paraphrase, summarize or drop a protocol section, and NEVER hand the reviewer that path instead of the text. For L/XL targets, partition a specialist's scope into bounded batches rather than one oversized brief.

## Fix & Re-Review Loop

1. **Consolidate** — merge every reviewer report into the living report: findings by severity, conflicts between reviewers, deferred LOWs. **Deduplicate by root cause FIRST** (same owning `file:line` range and same violated rule — one entry listing every source reviewer, the highest justified severity) so no duplicate is validated or fixed twice.
2. **Validate** — run `$why-review --validate-findings <living-report>` in the main session over findings no reviewer validated plus the independent check set of `SYNC:systematic-review-batching` Step 3. Rejected findings are recorded with the evidence that rejected them.
3. **Fix** — `$fix --target=review` on validated blocking findings; it appends a Fix Log row per finding (FIXED / REJECTED / DEFERRED) and re-runs the affected tests (not under `--tests=defer`: the parent's verify runs them). Each behavior-changing fix reconciles its configured canonical owner, profile-declared scenario/case and mapped assertion/result (spec enrichment per cycle).
4. **Simplify** — `$code-simplifier --defer=review` when source code changed; its edits join the post-fix target, and step 5 is its review (the simplifier skips its own Self-Review Gate because the caller guarantees the FULL re-review). If the orchestrator skips or merges step 5, it omits the flag so the simplifier reviews itself.
5. **Re-review** — the post-fix `why-review` re-reads the settled whole target from scratch INLINE in FULL mode (orchestrator confirmation bias is the risk it counters) and appends its verdict to the living report; blocking findings re-enter step 2 of this loop.

**Severity floor & budget** — round 1 converges on a pass with zero open findings at any severity — a LOW closes by a local fix plus scoped check, or by deferral when its fix needs new code or tests, and a LOW-only fix set with no simplification needs no full re-review (Round-1 LOW closure); from round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM, and a LOW-only round ENDS the loop with the LOWs listed under `## Deferred LOW Findings (severity floor, round ≥2)`. Never re-tier a real finding to reach the exit, and never apply the floor to a binary gate. Budget rules:

- **Repeated blocker cap** — if the same validated finding repeats for 2 full invocations with no progress, STOP and escalate using ask user tool.
- **Review blockers increasing** — if round N finds MORE review blockers (validated findings at its own bar plus failed non-test binary gates; round-2 LOWs and failing test gates never count) than round N-1, STOP and escalate using ask user tool.
- **Durable budget** — track rounds, findings and repeated blockers in the durable `review-policy.cjs` run record. Resume the same run after interruption; resume preserves completed rounds and findings. A changed target invalidates prior evidence and acceptance but must preserve the spent round budget — never reset to round 0 because context was lost.
- **Goal satisfaction** — at start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` and pass it to every child step; a required criterion at FAIL in the Goal Satisfaction matrix enters the same loop as a code finding.

PASS = one complete pass finds zero blocking issues after all validated fixes and verification are included — or, in round 1, a pass whose only findings were LOWs closed by scoped check or deferral with no simplification landed (Round-1 LOW closure), with each closure recorded. When no fix or simplification landed and no validated blocking finding was rejected by the fix step, the clean initial reviews and green tests are the PASS evidence and the post-fix re-review is skipped with its registry `skipReason`. A `REJECTED` Fix Log row is never self-certifying: it goes back through `$why-review --validate-findings` (or to the user) and the post-fix re-review runs.

## Nested Invocation

When a parent workflow (e.g. `workflow-feature`, `workflow-bugfix`, `workflow-refactor`) runs this workflow as a step, everything above applies identically — including Step 0 and `$docs-manager --mode=update` (it documents the reviewed diff; the parent's own later `$docs-manager --mode=update` documents what its later steps produce, so neither replaces the other). Only the close differs: skip `$workflow-end` and `$watzup` with their registry `skipReason` and return control to the parent after `$docs-manager --mode=update`. A parent that runs its tests once, last (`SYNC:verify-last-order`) invokes this workflow with `--tests=defer`, and re-invokes it (still `--tests=defer`) when its verify step edited any source or test.

## `--fix-loop` Mode — Read `references/fix-loop.md` First (BLOCKING)

ONLY when the invocation carries `--fix-loop`: read `references/fix-loop.md` in full FIRST (BLOCKING) — before Step 0, because the mode runs before, and wraps, this workflow's Step 0. It holds the whole outer convergence loop: FL-0 → FL-3, the ordered convergence and escalation gate, and the review receipt. Without the flag, skip it; the default workflow above is unchanged.

---

**IMPORTANT MANDATORY Steps:** $changes-review --report-only --defer=whole-target,specialists,tests,entities -> $why-review --target=whole-review-target -> $architecture --mode=review --report-only -> $domain-analysis --mode=review --report-only -> $performance-review --report-only -> $integration-test --mode=review --report-only --prove-tests -> $security-audit --report-only -> $production-readiness-review --report-only -> $ui-design --mode=review --report-only -> $ai-engineering-review --report-only -> $why-review --validate-findings -> $investigate --mode=debug -> $fix --target=review -> $code-simplifier --defer=review -> $why-review -> $experience-review -> $scan --target=domain-entities -> $docs-manager --mode=update -> $workflow-end -> $watzup

Activate the `workflow-review-changes` workflow. Run `$start-workflow workflow-review-changes` with the user's prompt as context.

<!-- SYNC:verify-last-order -->

> **Verify-Last Order** — For any code-changing task (feature, bugfix, refactor, spec implementation), planned or not, build everything, review it, then run the tests ONCE at the end on the final tree. Nothing is skipped; the gates are only batched and ordered by cost.
>
> 1. **Build** — implement every phase and write its tests in the same pass. Between phases run only type-check or compile. NEVER a test suite, a mutation run or a review per phase or per wave.
> 2. **Review and fix, static** — one converging review fix-loop over the whole changeset, reading code and tests (TEST-GAP, WEAK-TEST by mutation thinking). It does NOT run tests (`$workflow-review-changes --tests=defer`). Fixes may write or amend tests but never run them.
> 3. **Verify once** — run the full affected suite once through the runner (`tester`, `$integration-test --mode=verify`, `$test`), plus a mutation check on every changed core-logic line and new rule: use the project's mutation tool when configured, else temporarily break the line by hand-editing it: first copy the file to `tmp/` and restore from that copy afterwards, confirming a clean diff against the copy before green counts — NEVER `git checkout`, `restore`, `reset` or `stash` on the working tree, which can destroy the uncommitted work under test. The mutation check needs a step that may edit code — `$integration-test --mode=verify`, or the main session when no such step runs — never the read-only `tester` or `$test`. A surviving mutant is a missing test: write it, then re-run. For a bugfix the mutation check is the RED proof: reverting the fix must turn its regression test red.
> 4. **Fix and re-run until green** — record a provisional verdict for each red test (SOURCE-WRONG · TEST-WRONG · TEST-NOT-OPTIMAL · ENVIRONMENT-BLOCKED · AMBIGUOUS) before any edit, fix at the owner, re-run the failing set, then the whole set once. NEVER weaken, skip or delete a test to force green.
> 5. **Re-review only if step 4 edited anything** — any source or test edit after the review re-runs the review (`--tests=defer`) over the settled tree; a re-review that applies a fix sends you back to step 3. This verify ↔ re-review alternation is capped at 3 turns: a fourth turn, or the same failure returning, STOPS and escalates using ask user tool (the review's own round cap does not bound it). Done = a green verify AND no edit after the last review.
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

> **Executable review policy** — Review skills/tooling MUST use `.claude/scripts/lib/review-policy.cjs` (policy version 6) for round eligibility. Assign severity first; never change it to obtain PASS.
>
> **Blocking predicate:** `blockingFindings(round, findings, hardGates)` returns all validated round-1 findings except LOWs closed with `resolution: 'scoped-fix-verified' | 'deferred'` (valid only for LOW). From round 2, only CRITICAL/HIGH/MEDIUM findings block. `NOT VERIFIABLE` remains a separate blocking unresolved-evidence state every round. Failed binary gates are synthetic CRITICAL every round; test-green gates use `kind: 'test'`, others `kind: 'binary'` (default). No severity floor waives test-green, security-must-fix, required-artifact, or other binary gates.
>
> **Evaluation:** `evaluateRound` retains floor-round/deferred LOWs in `deferredLow`, scoped-fixed LOWs in `scopedClosedLow`, never both. LOW-only rounds do not block after the floor. It reports `extensionGranted: false`, `ESCALATE` for exhausted review budgets with review blockers, and `failingTestGates` / `testLoopContinues` for open test gates.
>
> **Budget/minimum:** `MAX_ROUNDS=3`, `HARD_MAX_ROUNDS=3`: ceilings, never targets. Every review blocker may use round 3; unresolved blockers at the cap escalate. No conditional extension. Clean review ends at `round >= minRounds`; default minimum 1, explicit maximum 3. Persist the declaration; never infer it from the round counter.
>
> **Test exception:** failing `kind: 'test'` gates are outside the review budget: they neither earn extensions nor escalate. While they are the ONLY blockers, status stays `CONTINUE`, accepting subsequent rounds beyond 3 until tests pass. Review blockers past budget still escalate; without a failing test gate, a run never reopens past budget.
>
> **Durable record:** MUST retain `runId`, target fingerprint/revision, policy version, minimum/maximum/completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use atomic, lock-serialized `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, `check` transitions. Identical completed rounds are idempotent and consume budget once. Changed target fingerprints invalidate evidence/acceptance while preserving bounded budget; stale evidence cannot be accepted. Record round 1 once after LOW closure: `targetFingerprint` is post-fix; `reviewedFingerprint` identifies the full-pass target and is required for `scoped-fix-verified`. Never claim the full pass reviewed later fixes. Policy-version changes (including LOW floor/closure or round budget) invalidate old records: start a new run. Interrupt/resume preserves completed rounds/findings. Records are bookkeeping, not consent, native permission, or proof of host review.
>
> **CLI boundary:** JSON stdin; real clock, supplied `now` rejected. State directories must be absolute non-root real directories; records size-bounded; malformed/locked state fails closed. Keep full reports on disk; inline envelopes summarize transport only. Each new consumer needs a semantic fixture, boundary counter-cases, seeded mutant, and report with target fingerprint/command exit status.

<!-- /SYNC:review-policy -->

<!-- SYNC:parallel-phase-advancement -->

> **Parallel-Phase Advancement (model-driven)** — How to run AND advance a declared parallel batch of workflow steps. Tool-agnostic: identical under Claude and Codex — neither depends on a hook. Mirrors the universal context-file rule ("Workflow Step Advancement & Parallel Phases" in CLAUDE.md / AGENTS.md).
>
> 1. **Declare the group.** Name the members of the parallel phase up-front — which steps run together, and mark any conditional member with its trigger.
> 2. **Spawn ALL members in ONE message.** Dispatch every member together (multiple `spawn_agent`/sub-agent calls in a single response) — never drip them one per turn.
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
> **MATERIAL → STOP and confirm using ask user tool BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask user tool reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it using ask user tool on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->


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
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never raises the round budget | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and obtaining another round never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate is bounded by the three-round review cap; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. `architecture --mode=scalability`): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; all review blockers may use up to three rounds, then escalate; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

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
> | `sequence` | the ordered recommended step list | One task per occurrence. Skip, merge, simplify and reorder follow `$start-workflow` → Step Execution Protocol; `gate` steps always run. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, `role` (which steps are gates), recommended order, args, applicability, barriers and execution mode; any flex from that order is decided only by `$start-workflow` → Step Execution Protocol. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `$sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Whole-diff correctness lane: read the complete behavior-changing diff once as one change (split only by flow when it cannot fit); hunt defects through real situations — boundaries, time crossing a day or zone, alternate clients, roles and states, retries, concurrency — using blame/history and adjacent comments as recorded intent; keep only confirmed findings (85+: code path traced) with a reachable trigger path, and report an unsettled candidate that would be MEDIUM or higher as `NOT VERIFIABLE` naming what would settle it, never dropped — rarity sets severity, never confidence.

<!-- /SYNC:whole-diff-correctness:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm using ask user tool BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask user tool reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `$start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
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
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** take the current changes to a converged review — triage-selected reviewers, validated findings, owning-layer fixes, a post-fix re-review of the settled whole target, tests green, specs/docs in sync — at the lowest cost the change's size and risk allow (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred).

**IMPORTANT MUST ATTENTION** triage first (size band · change kinds · risk) and write the Review Plan into the living report before any reviewer starts; the triage selects the optional specialists and the orchestration — every skipped optional step carries its registry `skipReason` and evidence.
**IMPORTANT MUST ATTENTION** launch the whole-target FULL-mode `$why-review` as a fresh sub-agent, immediately run `$changes-review` inline, and advance only after BOTH return; then spawn the selected specialists (`--report-only`) in ONE message and advance only after every spawned reviewer returns.
**IMPORTANT MUST ATTENTION** no finding is fixed before it is validated; validated blocking findings go to `$fix --target=review`; any fix or simplification — except a round-1 LOW-only fix set closed by scoped check with no simplification — triggers the post-fix `why-review` INLINE in FULL mode over the settled whole target — re-read from scratch, never just the last fix.
**IMPORTANT MUST ATTENTION** every finding/verdict needs `file:line` evidence + confidence (>80% act, <60% DO NOT recommend); "Insufficient evidence" is valid output — no speculation.
**IMPORTANT MUST ATTENTION** adjudicate every behavior-vs-spec divergence (CODE-WRONG / SPEC-STALE / SPEC-SILENT / AMBIGUOUS) against the configured canonical owner; every behavior-changing fix reconciles its profile-declared scenario/case and mapped executing assertion/result — green tests never normalize drift.
**IMPORTANT MUST ATTENTION** treat integration-test coverage gaps and multilingual UI translation gaps as mandatory ask user tool user-decision gates.
**IMPORTANT MUST ATTENTION** one task per selected step/aspect and ONE living report appended by every reviewer, validation, fix and re-review — re-read it and the current task list after any compaction.
**IMPORTANT MUST ATTENTION** steps follow `$start-workflow` → Step Execution Protocol: `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged; NEVER batch-complete validation gates.
**IMPORTANT MUST ATTENTION** this workflow always runs inline in the main session, top-level or nested; only its child reviewers run as sub-agents; nested → skip `$workflow-end` + `$watzup` and return to the parent after `$docs-manager --mode=update`.

**IMPORTANT MUST ATTENTION `--fix-loop` (OPTIONAL mode — only when the flag is passed):** re-run the WHOLE default workflow INLINE via the skill invocation (NEVER a sub-agent), round after round, over a FIXED scope (branch-diff base ∪ current uncommitted changes, recomputed each round) until a complete round applies **ZERO fixes** (working-tree fingerprint unchanged AND reviews clean at that round's bar) — not merely one clean review; its value is the fresh full specialist sweep the default post-fix re-review never re-runs. **Mode scope:** this workflow-level mode re-runs the WHOLE workflow and is DISTINCT from standalone `$changes-review --fix-loop`, which pairs ONE review pass with `$fix` on validated findings — their convergence wording differs by design. Bind the outer protocol loop (primary) plus the `/goal` accelerator when available, keep a Goal Contract with a per-round Iteration Log, regenerate a fresh task plan every round, and evaluate the FL-2 rows in order — first matching row decides.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 3, hard maximum 3)**; review blockers not shrinking across 2 rounds, or the budget spent with fixes still landing (CRITICAL/HIGH/MEDIUM fixes, or edits with no review blocker open) → **STOP & escalate** using ask user tool. NEVER loop past round 3 on review blockers, or open-ended — only failing test gates continue, until green. In `--fix-loop`, from round 2 a LOW-only round that landed no other edit is a zero-fix round and ENDS the loop.

**Anti-Rationalization:**

| Evasion                                                       | Rebuttal                                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Small diff, run every specialist anyway"                     | Triage decides — an unneeded specialist costs time and tokens and adds nothing; skip it with its `skipReason` and evidence.                               |
| "Risky change but only 2 files, skip the specialists"         | Risk escalates depth, not file count — a 2-file auth change still gets `$security-audit`.                                                                |
| "Findings look right, fix them directly"                      | Validate first — a false positive fixed is a regression shipped.                                                                                          |
| "I already know what I fixed, skip re-review"                 | Orchestrator confirmation bias — re-read the settled whole target from scratch INLINE.                                                                    |
| "Post-fix re-review can reuse `--validate-findings`"          | No — validation re-checks a findings list; the post-fix pass must run FULL mode over the whole target.                                                    |
| "Tests are green, the spec drift is fine"                     | Green can encode the drift itself — adjudicate every divergence.                                                                                          |
| "Same blocker again, one more loop will fix it"               | 2 no-progress repeats or a spent budget → escalate using ask user tool; never loop open-ended.                                                          |
| "Round 2 turned up two more nits, loop again"                 | From round 2 a LOW-only round ends the loop — defer and list the LOWs.                                                                                    |
| "`--fix-loop`: the round's review was clean, so it converged" | Not while that round landed any edit (a `$code-simplifier` change included) — run the next round to prove a zero-fix pass, or escalate at a spent budget. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
