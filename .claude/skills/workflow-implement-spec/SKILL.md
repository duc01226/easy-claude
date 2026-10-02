---
name: workflow-implement-spec
version: 1.0.0
description: '[Workflow] Use when implementing behavior already written in a canonical spec or TC set. Spec lacks the behavior: workflow-feature.'
disable-model-invocation: false
---

## Purpose

Implement behavior that a canonical spec or TC set already states — without re-authoring the spec or growing scope — and close with green tests, a converged change review and a spec synced to any behavior difference. Use it only when the requested behavior is already written in a canonical spec; a spec that lacks it goes to `workflow-feature`, which updates the spec first. The route is lean by design: the supplied spec stands in for the discovery, spec-authoring and test-spec rounds of the feature route.

Activate the `workflow-implement-spec` workflow. Run `/start-workflow workflow-implement-spec` with the user's prompt as context.

## Size & Kind Triage (first action)

Classify the target before choosing depth and record the result in the run report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300.
- **Kind**: behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service · test-only · tooling/config.
- **Risk**: irreversible · data · security · cross-module. Escalate depth on risk and ambiguity, not file count alone.

Depth by band:

- **XS/S** — a short investigation and a light plan (a few tasks, each traced to the spec baseline; log it as a `simplified` deviation); work inline.
- **M, or any public-contract, data/schema or security kind** — full investigation and one lean plan; user-owned decisions go through `/plan --mode=validate`.
- **L/XL** — partition the build, the integration tests and the review into bounded batches per module or TC group, one report per batch; the plan names the batches.

The gap review never shrinks: at every size `/spec [mode=clarify]` checks the supplied spec against the request before `/plan`.

## Required Quality Gates

- **Tests pass** (`tests-pass`) — `/integration-test --mode=verify` (incl. the mutation check) and `/test` ran green in THIS run, once, after the static review; every implemented TC has a test that names its `Business Intent / Invariant Guarded` and would fail if that intent broke
- **Review converged** (`review-converged`) — nested `/workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed
- **Spec synced** (`spec-synced`, when behavior or evidence mappings changed) — `/spec [mode=sync]` reconciled the supplied spec with implemented behavior and actual case-to-test evidence after test authoring and before review
- **Run closed** (`run-closed`) — `/workflow-end` checked every gate
- **No guessed behavior** — the gap review passed, or the route stopped per the escalation rule below
- **Scope held** — the workflow records the supplied `spec_baseline`; plan phases and acceptance evidence stay within it

> **[ESCALATION — BLOCKING]** `/spec [mode=clarify]` runs as a gap review of the supplied spec against the request. When the spec is vague or contradictory, or the requested behavior is not in the supplied spec, STOP before `/plan` and ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first. Never guess the missing behavior and never drop it silently. A spec with one open question is clarified before planning.

> **[PLAN SCOPE ANCHOR]** Before `/plan`, the workflow report records the supplied spec path and revision as `spec_baseline`. `/plan` names it as governing intent and keeps every phase and acceptance gate within that baseline. A requirement the baseline lacks is recorded as `Proposed additions — owner approval required` and becomes a question, never an accepted plan phase.

## Gates and Optional Steps

**Step contract:** `/start-workflow` → Step Execution Protocol owns how gate, core and optional steps run and how every deviation is logged; this table is the registry's recommended order (`.claude/workflows.json` → `workflow-implement-spec`) with this workflow's triage guidance.

| Step                       | Role     | Earns its cost when                                                           | Proves / feeds                |
| -------------------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `/investigate`             | core     | always — read the supplied spec and the affected code; find 3+ local examples | gap-review input              |
| `/spec [mode=clarify]`            | core     | always — the gap review                                                       | no guessed behavior           |
| `/plan`                    | core     | always; XS/S keeps it light                                                   | `spec_baseline`, traced tasks |
| `/plan --mode=execute`            | core     | always                                                                        | the change                    |
| `/integration-test`        | core     | always — tests from the spec's TCs                                            | tests-pass                    |
| `/spec [mode=sync]`        | optional | behavior or canonical case-to-test evidence/mappings changed                  | spec-synced                   |
| `/workflow-review-changes --tests=defer` | gate     | always                                                                        | review-converged              |
| `/integration-test --mode=verify` | gate     | always                                                                        | tests-pass                    |
| `/test` | gate | always | tests-pass — pass `--proven=<integration-test --mode=verify report path>` so only tiers it does not cover run |
| `/workflow-end`            | gate     | always                                                                        | run-closed                    |
| `/watzup`                  | core     | always                                                                        | handoff summary               |

> **Conditional step:** `/spec [mode=sync]` runs after integration-test authoring when behavior differs or canonical case-to-test evidence/mappings changed, and before the nested review. Skip reason: "Behavior and canonical case-to-test evidence still match the supplied spec, so no reconciliation is needed."

The registry's default order, parsed by the workflow verifier — keep it equal to `workflows.json`; the roles above decide what may flex:

**IMPORTANT MANDATORY Steps:** /investigate -> /spec [mode=clarify] -> /plan -> /plan --mode=execute -> /integration-test -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /test -> /workflow-end -> /watzup

**On-demand skill (not a registry step):** `/investigate --mode=debug` — a test fails and its cause is unknown.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Only these data dependencies are fixed:

- the gap review precedes `/plan`; a change exists before it is reviewed or tested; tests run once, last, after the static review (`--tests=defer`); a fix made by the verify step re-runs `/workflow-review-changes --tests=defer`, and a fix made by that re-review re-runs the verify (`SYNC:verify-last-order`);
- `/integration-test` writes the executing evidence before the single conditional `/spec [mode=sync]` reconciliation; the sync precedes review;
- the nested `/workflow-review-changes` runs inline in the main session — it owns the session's review→fix→re-review loop, and its own reviewers run as sub-agents;
- a gap-review question to the user is never parallelized with later work;
- `/workflow-end` runs last, then `/watzup`.

Recommended: XS/S inline without sub-agents; L/XL in bounded batches per module or TC group with one report per batch.

## Memory & Reporting

- One task per selected step (and per batch for L/XL); a step that does not run keeps its task, closed with its logged deviation.
- Write the run report FIRST under `tmp/reports/` — triage result, `spec_baseline`, gate evidence, deviations — and append per step or batch; re-read it and `TaskList` after compaction.
- Sub-agent briefs carry the supplied spec path, the `spec_baseline` and the resolved reference-doc paths, and make report-writing their first deliverable.

## Fix Path & Loop Bounds

- Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass when the fixes were non-trivial.
- A failing test gets a root-cause verdict before either the source or the test is edited; never weaken an assertion to force green. A test that contradicts the supplied spec is adjudicated against the spec, never silently rewritten.
- Re-run `/plan` only when a material scope or contract decision invalidates the saved plan; ordinary implementation discovery stays with the executor.
- The nested review keeps the framework loop bounds: round 1 exits on zero open validated findings (Round-1 LOW closure); round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 3 review rounds; failing tests are uncapped; escalate with `AskUserQuestion` on no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** a vague, contradictory or incomplete spec stops the route before `/plan` — the user clarifies the spec or switches to `workflow-feature`.
**IMPORTANT MUST ATTENTION** the workflow records the supplied baseline before planning; every plan phase and acceptance gate stays within it, and anything beyond it needs owner approval.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `/workflow-review-changes` converged inline · spec synced before the review when behavior differs · `/workflow-end` last.
**IMPORTANT MUST ATTENTION** triage size, kind and risk first; depth follows risk, and every deviation is logged with evidence.
