---
name: plan
version: 2.0.0
description: '[Planning] Use when a workflow step or the user asks for a concise implementation plan. Captures technical decisions, affected areas, execution-time discovery, risks, and final quality gates without pre-implementing the change. Flag: --mode={ci|cro}.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Produce a concise, evidence-backed implementation plan that fixes direction and proof while leaving code-level discovery and mechanics to the executing agent.

**Summary:**

- PLANNING ONLY. Record important decisions, affected owners/areas, dependency order, risks, discovery obligations, and final quality gates; do not write code or method-by-method instructions.
- Keep one `plan.md` by default. Add phase files only when independent execution, context isolation, or disjoint parallel ownership genuinely needs them.
- Never invoke `plan-review` or another review skill. Standalone only: after saving the plan, ask once whether the user wants `plan-review`. Workflow invocation: return the artifact and let the parent advance without a next-step prompt.
- Tests are authored with implementation but executed only after all implementation and static review. Never schedule per-phase test or review runs.

**Workflow:** Resolve context → inspect governing evidence and representative patterns → settle material decisions → write the lean plan → self-check scope, discovery, and verify-last order → hand back.

**Key Rules:**

- A plan says what must be true, why, where to investigate, and how completion is proved—not every edit.
- Cite evidence for known repository facts. Mark future implementation evidence as an obligation, never fabricate paths, symbols, or line numbers.
- Open product intent or irreversible decisions block and go to the user; bounded source discovery belongs in the plan with an owner and stop condition.

## Invocation Context

Determine once before writing:

- **Workflow invocation:** a matching active workflow task exists or the caller identifies this as a workflow step. Finish by returning the plan path and concise summary. Do not ask about review, execution, or other next steps.
- **Standalone invocation:** no parent workflow owns progression. Finish by asking exactly one optional question: `Run plan-review on this plan?` Do not call it automatically, and do not bundle other next-step choices into that question.

`--mode=ci` reads `references/mode-ci.md`; `--mode=cro` reads `references/mode-cro.md`. A mode adds domain intake only; it does not add review or change this contract.

## Evidence and Discovery

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`; the plan must map its outcome and final proof to the saved required criteria.
2. Resolve the configured plans root, spec profile, project references, commands, and mirror/generated surfaces from `docs/project-config.json` when present.
3. Read the task-relevant reference docs and governing spec/decision artifacts. For code-bearing work, inspect the target plus three comparable local patterns when available; record scarcity instead of inventing examples.
4. Trace affected owners and consumers. Use the code graph when present; for service/event systems, check producers, consumers, orchestration, and shared contracts.
5. Separate facts from execution-time discovery:
   - **Known now:** cite `file:line`, config key, spec section, or command.
   - **Discover during execution:** name the bounded question, source/owner to inspect, why it matters, and stop/escalation condition.
6. Ask the user only for a decision that changes product intent, public contract, irreversible data/architecture choice, or materially changes scope. Do not ask the user to supply mechanics the executor can discover safely.

Use direct repository inspection for focused work. Add research agents or external research only when distinct unknowns justify their context cost.

## Plan Artifact Contract

Write `plan.md` under the configured plans root. Use this compact shape; omit a section only with a stated `N/A` reason.

### 1. Outcome and boundaries

- Desired observable outcome and governing intent/spec.
- In scope, non-goals, assumptions, and compatibility/rollback boundary.

### 2. Important technical decisions

For each decision: choice · rationale · meaningful alternative · sacrifice/trade-off · reversibility · owning contract/module. Keep only decisions that constrain execution or future change cost.

### 3. Areas and owners to touch

Name affected modules, contracts, data/state, tests, specs/docs, generated mirrors, and external boundaries with why each is involved. List exact files only when evidence establishes them; representative paths are enough for an area whose exact edit sites must be discovered.

### 4. Execution phases

Use the fewest phases that express real dependency or ownership boundaries. Each phase contains:

- **Objective and boundary** — outcome, inclusions, non-goals.
- **Decisions already fixed** — constraints the executor must preserve.
- **Areas/owners** — known paths or modules and responsible contract.
- **Discovery before edit** — bounded source questions, evidence to inspect, stop condition.
- **Implementation output** — artifact/behavior produced, not a recipe of code edits.
- **Acceptance/quality gate** — observable evidence and invariant/test owner.
- **Dependency metadata** — `PAR` with a disjoint write set, or `SEQ` with the exact dependency. Untagged phases execute sequentially.

Do not decompose into line edits, symbol-by-symbol instructions, ≤30-minute tasks, per-file pseudo-implementation, or recursive sub-plans. Split only for a real dependency, independently verifiable outcome, or disjoint write ownership.

### 5. Quality gates and final verification

- Map every changed behavior/invariant to its canonical case/test owner under the resolved `specArtifacts` profile. Cite an existing assertion when known; otherwise state the test obligation and expected observable.
- Author tests during the implementation phase that changes the behavior.
- After every implementation phase: run static/type/compile checks only when useful; no test suite, mutation run, or review.
- After all implementation: run one whole-change static review with tests deferred; fix validated findings.
- Then run the full affected test suite once plus required mutation/red proof. A failure follows fault adjudication and may trigger focused reruns/full rerun; this is recovery, not a planned intermediate test phase.
- Reconcile specs, tests, code, docs, and generated mirrors before completion; if a review fix changes any of them, repeat only the invalidated reconciliation before final verification.

### 6. Risks and execution concerns

Record material risks, security/data/platform/operational concerns, migration or rollback needs, cross-boundary compatibility, and what would force replanning. Include the next plausible change and expected edit sites, the 10× growth concern, and the named test that should fail when each protected rule breaks.

### 7. Execution waves

List phase waves only when `PAR` phases have proven disjoint write sets. Otherwise state `Sequential — dependencies or shared writes require it.` Parallelism is metadata-gated; never infer it later from an untagged plan.

## Scope-Specific Gates

- **Bugfix:** include a preservation inventory for the affected invariants and prove the correction owner, not merely the failure site.
- **New dependency/technology:** compare viable existing/project-native options first; surface material lock-in or operational trade-offs to the user. Do not turn ordinary library selection into a research project.
- **Domain entity/value object/aggregate:** state actual invariant ownership, boundary, construction, concurrency, events, and test obligation when the project uses those concepts; otherwise record the DDD-specific gate N/A.
- **User-facing UI:** apply the configured UX/design authority and bind relevant states/accessibility criteria to acceptance evidence; do not redesign settled project conventions.
- **AI surface?** Only if a phase creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-feature-framing-gate.md`, give that phase an `## AI Feature Gate` section and apply it; otherwise skip this line.
- **Framework/mirror work:** name canonical owners and the generated sync/verify action.
- **Supplied spec:** preserve the supplied baseline. Put proposed behavior outside it under `Proposed additions — owner approval required`; never silently plan it as accepted scope.

## Self-Check Before Handoff

- **Plan, not implementation:** could an executor choose local mechanics without contradicting the plan?
- **Decision completeness:** are product/public-contract/irreversible choices settled or explicitly blocked?
- **Discovery completeness:** does every unknown have a bounded source, owner, and stop condition?
- **Area coverage:** are code, tests, spec/docs, data/contracts, consumers, and mirrors included when applicable?
- **Verify-last:** are tests run only after all implementation and static review?
- **Efficiency:** remove repeated rationale, exhaustive inventories, generic advice, and any phase that proves no distinct fact.

Persist the plan path and a short summary. Standalone asks once about optional `plan-review`; workflow invocation returns immediately to its parent.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `plan-granularity` — Outcome phases name decisions, boundaries and bounded discovery without replaying implementation; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `preservation-inventory` — Table of behavior a bugfix plan must preserve, written before the implementation steps; writing a bugfix plan → .claude/skills/shared/protocols/preservation-inventory.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a concise decision-and-boundary plan that enables safe execution without replaying implementation.

- **MUST ATTENTION** record outcome/non-goals, important decisions, affected owners/areas, bounded discovery, risks, and final quality gates.
- **MUST ATTENTION** resolve the active Goal Contract and map the plan to its saved required criteria.
- **MUST ATTENTION** never invoke `plan-review`; standalone asks once whether the user wants it, workflow invocation returns without next-step prompts.
- **MUST ATTENTION** write tests with implementation and run test suites only after all implementation and static review; never plan per-phase test/review cycles.
- **MUST ATTENTION** one `plan.md` by default; add phases/files only for real dependency, verification, context, or ownership boundaries.
- **MUST ATTENTION** cite known facts and never fabricate future symbols, paths, assertions, or `file:line` evidence.
