---
name: workflow-implement-spec
version: 1.0.0
description: "[Workflow] Use when implementing behavior already written in a canonical spec or TC set (spec-complete work). A spec that lacks the requested behavior goes to workflow-feature."
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
- **M, or any public-contract, data/schema or security kind** — full investigation and plan; add `/plan-review` on demand when the plan crosses modules or its risk warrants a second look.
- **L/XL** — partition the build, the integration tests and the review into bounded batches per module or TC group, one report per batch; the plan names the batches.

The gap review never shrinks: at every size `/spec-clarify` checks the supplied spec against the request before `/plan`.

## Required Quality Gates

| Gate                                                                                          | Evidence that proves it                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tests pass** (`tests-pass`)                                                                 | `/integration-test-verify` and `/test` ran green in THIS run; every implemented TC has a test that names its `Business Intent / Invariant Guarded` and would fail if that intent broke |
| **Review converged** (`review-converged`)                                                     | nested `/workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed                                     |
| **Spec synced** (`spec-synced`, when the implemented behavior differs from the supplied spec) | `/spec [mode=sync]` recorded the difference before `/integration-test` and the review                                                                                                  |
| **Run closed** (`run-closed`)                                                                 | `/workflow-end` checked every gate                                                                                                                                                     |
| **No guessed behavior**                                                                       | the gap review passed, or the route stopped per the escalation rule below                                                                                                              |
| **Scope held**                                                                                | every plan task traces to the recorded `spec_baseline`, per the plan scope anchor below                                                                                                |

> **[ESCALATION — BLOCKING]** `/spec-clarify` runs as a gap review of the supplied spec against the request. When the spec is vague or contradictory, or the requested behavior is not in the supplied spec, STOP before `/plan` and ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first. Never guess the missing behavior and never drop it silently. A spec with one open question is clarified before planning.

> **[PLAN SCOPE ANCHOR]** Plan scope is anchored to the supplied spec baseline: `/plan` records the supplied spec as `spec_baseline` at plan start (`/plan` → Supplied-Spec Scope Baseline), and every plan task traces to that baseline. A requirement the baseline lacks goes to `## Proposed additions (need approval)` and becomes a question, never a planned task.

## Gates and Optional Steps

**Step contract:** `/start-workflow` → Step Execution Protocol owns how gate, core and optional steps run and how every deviation is logged; this table is the registry's recommended order (`.claude/workflows.json` → `workflow-implement-spec`) with this workflow's triage guidance.

| Step                       | Role     | Earns its cost when                                                           | Proves / feeds                |
| -------------------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `/investigate`             | core     | always — read the supplied spec and the affected code; find 3+ local examples | gap-review input              |
| `/spec-clarify`            | core     | always — the gap review                                                       | no guessed behavior           |
| `/plan`                    | core     | always; XS/S keeps it light                                                   | `spec_baseline`, traced tasks |
| `/plan-execute`            | core     | always                                                                        | the change                    |
| `/spec [mode=sync]`        | optional | the implemented behavior differs from the supplied spec                       | spec-synced                   |
| `/integration-test`        | core     | always — tests from the spec's TCs                                            | tests-pass                    |
| `/integration-test-verify` | gate     | always                                                                        | tests-pass                    |
| `/workflow-review-changes` | gate     | always                                                                        | review-converged              |
| `/test`                    | gate     | always                                                                        | tests-pass                    |
| `/workflow-end`            | gate     | always                                                                        | run-closed                    |
| `/watzup`                  | core     | always                                                                        | handoff summary               |

> **Conditional step:** `/spec [mode=sync]` runs when the implemented behavior differs from the supplied spec, and always before `/integration-test` and the nested `/workflow-review-changes`, so the review sees the synced spec. Skip reason: "The implementation matches the supplied spec, so there is nothing to sync."

The registry's default order, parsed by the workflow verifier — keep it equal to `workflows.json`; the roles above decide what may flex:

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-clarify -> /plan -> /plan-execute -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup

**On-demand skills (not registry steps):** `/plan-review` — an M+ plan that crosses modules or touches a public contract, data/schema or security; `/debug-investigate` — a test fails and its cause is unknown.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Only these data dependencies are fixed:

- the gap review precedes `/plan`; a change exists before it is reviewed or tested; fixes are re-verified after they land;
- `/spec [mode=sync]`, when it runs, precedes `/integration-test` and the review;
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
- Plan ceremony (`/plan` → `/plan-review`) for a fix set only when it is large, cross-module or ambiguous; a handful of validated local fixes are fixed directly.
- The nested review keeps the framework loop bounds: round 1 fixes every validated finding; round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 2 rounds, +1 when a CRITICAL/HIGH stays open; failing tests are uncapped; escalate with `AskUserQuestion` on no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** a vague, contradictory or incomplete spec stops the route before `/plan` — the user clarifies the spec or switches to `workflow-feature`.
**IMPORTANT MUST ATTENTION** every plan task traces to the recorded spec baseline; anything beyond it is a proposed addition that needs approval.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `/workflow-review-changes` converged inline · spec synced before the review when behavior differs · `/workflow-end` last.
**IMPORTANT MUST ATTENTION** triage size, kind and risk first; depth follows risk, and every deviation is logged with evidence.
