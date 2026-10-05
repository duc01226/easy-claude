---
name: workflow-implement-spec
description: '[Workflow] Implement behavior already captured in a canonical spec or test-case set, with scope held, reviewed changes and verified tests. Spec gaps use workflow-feature.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-implement-spec` together with this skill. Call [`$start-workflow workflow-implement-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create ALL selected occurrence tasks before triage, analysis or step execution, including conditional/optional tasks; preserve occurrence IDs, roles and barrier groups. Use native task tools or an equivalent persistent ledger. Then mark the first task `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a task or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$investigate`](../investigate/SKILL.md) (core) → [`$spec [mode=clarify]`](../spec/SKILL.md) (core) → [`$plan`](../plan/SKILL.md) (core) → [`$plan --mode=execute`](../plan/SKILL.md) (core) → [`$integration-test`](../integration-test/SKILL.md) (core) → [`$spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`$workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`$integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`$test`](../test/SKILL.md) (gate) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:235c2b9f3476f380213bf45fca43bea1532f6a2817fd99de5c494c8099130f9e -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Implement already-specified behavior within the supplied baseline, proven by green tests, converged review and reconciled spec evidence.

**Summary:** The supplied spec replaces feature discovery, spec-authoring and test-spec rounds. Triage → investigate → clarify gaps → plan → execute → author integration tests → sync changed behavior/evidence → review statically → verify integration tests → test remaining tiers → close → hand off.

**Workflow:** Activate `$start-workflow workflow-implement-spec` with the user's prompt; follow the registry and step contracts below.

**Key Rules:** Implement the supplied spec without re-authoring it or growing scope. Missing behavior routes to `workflow-feature`, which updates the spec first; other gaps stop for clarification before planning. Keep every phase within `spec_baseline`; review runs inline and tests run last.

## Size & Kind Triage (first action)

Classify the target before choosing depth; record it in the run report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300.
- **Kind**: behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service · test-only · tooling/config.
- **Risk**: irreversible · data · security · cross-module. Escalate depth on risk and ambiguity, not file count alone.

Depth by band:

- **XS/S** — a short investigation and a light plan (a few tasks, each traced to the spec baseline; log it as a `simplified` deviation); work inline.
- **M, or any public-contract, data/schema or security kind** — full investigation and one lean plan; user-owned decisions go through `$plan --mode=validate`.
- **L/XL** — partition the build, the integration tests and the review into bounded batches per module or TC group, one report per batch; the plan names the batches.

At every size, `$spec [mode=clarify]` checks the supplied spec against the request before `$plan`.

## Required Quality Gates

- **Tests pass** (`tests-pass`) — `$integration-test --mode=verify` (incl. the mutation check) and `$test` ran green in THIS run, once, after the static review; every implemented TC has a test that names its `Business Intent / Invariant Guarded` and would fail if that intent broke
- **Review converged** (`review-converged`) — nested `$workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed
- **Spec synced** (`spec-synced`, when behavior or evidence mappings changed) — `$spec [mode=sync]` reconciled the supplied spec with implemented behavior and actual case-to-test evidence after test authoring and before review
- **Run closed** (`run-closed`) — `$workflow-end` checked every gate
- **No guessed behavior** — the gap review passed, or the route stopped per the escalation rule below
- **Scope held** — the workflow records the supplied `spec_baseline`; plan phases and acceptance evidence stay within it

> **[ESCALATION — BLOCKING]** `$spec [mode=clarify]` runs as a gap review of the supplied spec against the request. When the spec is vague or contradictory, or the requested behavior is not in the supplied spec, STOP before `$plan` and ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first. Never guess the missing behavior and never drop it silently. A spec with one open question is clarified before planning.

> **[PLAN SCOPE ANCHOR]** Before `$plan`, the workflow report records the supplied spec path and revision as `spec_baseline`. `$plan` names it as governing intent and keeps every phase and acceptance gate within that baseline. A requirement the baseline lacks is recorded as `Proposed additions — owner approval required` and becomes a question, never an accepted plan phase.

## Gates and Optional Steps

**Step contract:** Read `$start-workflow` → Step Execution Protocol for gate/core/optional execution and deviation logging. The table follows `.claude/workflows.json` → `workflow-implement-spec`; apply the triage above.

| Step                       | Role     | Earns its cost when                                                           | Proves / feeds                |
| -------------------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `$investigate`             | core     | always — read the supplied spec and the affected code; find 3+ local examples | gap-review input              |
| `$spec [mode=clarify]`            | core     | always — the gap review                                                       | no guessed behavior           |
| `$plan`                    | core     | always; XS/S keeps it light                                                   | `spec_baseline`, traced tasks |
| `$plan --mode=execute`            | core     | always                                                                        | the change                    |
| `$integration-test`        | core     | always — tests from the spec's TCs                                            | tests-pass                    |
| `$spec [mode=sync]`        | optional | behavior or canonical case-to-test evidence/mappings changed                  | spec-synced                   |
| `$workflow-review-changes --tests=defer` | gate     | always                                                                        | review-converged              |
| `$integration-test --mode=verify` | gate     | always                                                                        | tests-pass                    |
| `$test` | gate | always | tests-pass — pass `--proven=<integration-test --mode=verify report path>` so only tiers it does not cover run |
| `$workflow-end`            | gate     | always                                                                        | run-closed                    |
| `$watzup`                  | core     | always                                                                        | handoff summary               |

> **Conditional step:** `$spec [mode=sync]` runs after integration-test authoring when behavior differs or canonical case-to-test evidence/mappings changed, and before the nested review. Skip reason: "Behavior and canonical case-to-test evidence still match the supplied spec, so no reconciliation is needed."

Keep this verifier-parsed chain equal to the registry; roles determine permitted flex:

**IMPORTANT MANDATORY Steps:** $investigate -> $spec [mode=clarify] -> $plan -> $plan --mode=execute -> $integration-test -> $spec [mode=sync] -> $workflow-review-changes --tests=defer -> $integration-test --mode=verify -> $test -> $workflow-end -> $watzup

**On-demand skill (not a registry step):** `$investigate --mode=debug` — a test fails and its cause is unknown.

## Orchestration Freedom

Choose inline/sub-agent execution, parallel waves, batching and ordering at equal quality, preserving these dependencies:

- the gap review precedes `$plan`; a change exists before it is reviewed or tested; tests run once, last, after the static review (`--tests=defer`); a fix made by the verify step re-runs `$workflow-review-changes --tests=defer`, and a fix made by that re-review re-runs the verify (`SYNC:verify-last-order`);
- `$integration-test` writes the executing evidence before the single conditional `$spec [mode=sync]` reconciliation; the sync precedes review;
- the nested `$workflow-review-changes` runs inline in the main session — it owns the session's review→fix→re-review loop, and its own reviewers run as sub-agents;
- a gap-review question to the user is never parallelized with later work;
- `$workflow-end` runs last, then `$watzup`.

## Memory & Reporting

- One task per selected step or L/XL batch; skipped steps keep tasks closed with logged deviations.
- Write the run report FIRST under `tmp/reports/` — triage result, `spec_baseline`, gate evidence, deviations — and append per step or batch; re-read it and the current task list after compaction.
- Sub-agent briefs carry the supplied spec path, `spec_baseline`, resolved reference-doc paths and report-writing as their first deliverable.

## Fix Path & Loop Bounds

- Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass when the fixes were non-trivial.
- A failing test gets a root-cause verdict before either the source or the test is edited; never weaken an assertion to force green. A test that contradicts the supplied spec is adjudicated against the spec, never silently rewritten.
- Re-run `$plan` only when a material scope or contract decision invalidates the saved plan; ordinary implementation discovery stays with the executor.
- The nested review keeps the framework loop bounds: round 1 exits on zero open validated findings (LOW deferral); round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; escalate with `ask user question tool` on no progress.

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

**IMPORTANT MUST ATTENTION Goal:** Implement already-specified behavior within the supplied baseline, proven by green tests, converged review and reconciled spec evidence.
**IMPORTANT MUST ATTENTION Main steps:** triage → investigate → clarify gaps → plan → execute → author integration tests → sync changed behavior/evidence → review statically → verify integration tests → test remaining tiers → close → hand off.
**IMPORTANT MUST ATTENTION** a vague, contradictory or incomplete spec stops the route before `$plan` — the user clarifies the spec or switches to `workflow-feature`.
**IMPORTANT MUST ATTENTION** the workflow records the supplied baseline before planning; every plan phase and acceptance gate stays within it, and anything beyond it needs owner approval.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `$workflow-review-changes` converged inline · spec synced before the review when behavior differs · `$workflow-end` last.
**IMPORTANT MUST ATTENTION** triage size, kind and risk first; depth follows risk, and every deviation is logged with evidence.
