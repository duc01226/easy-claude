---
name: plan
description: '[Planning] Use when a workflow step or the user asks for implementation planning. --mode=review supports review-only or --fix-loop; validate interviews, execute implements. --mode=ci plans CI fixes; --mode=cro plans conversion optimization.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Todo tracking mandate: BEFORE executing any workflow or skill step, create/update todo tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
> **[BLOCKING] Mode routing — detect FIRST.** Select explicit `--mode=review|validate|execute|ci|cro`; otherwise create a plan. Read the selected reference in full before acting (see [Mode Dispatch](#mode-dispatch)). Every mode works directly without a workflow. `/plan-review`, `/plan-validate` and `/plan-execute` do not resolve.

> **Work tracking:** Read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Inspect exact selected owners and declared spec/task/subtask/plan concerns before planning, incorporate applicable unresolved concerns into task-derived quality gates, and reread after an actual artifact save. Execute mode retains actual linked producer/run/occurrence and the primary saving owner's one checkpoint. Continue untracked; report partial/unavailable scope and saved/pending secondary results. Plan prose and passing checks never authorize readiness, acceptance or publication.

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Produce a concise, evidence-backed implementation plan that fixes direction and proof while leaving code-level discovery and mechanics to the executing agent.

**Summary:** Select the mode first: create a plan, review once, interview for validation, execute, or add CI/CRO intake. For creation: resolve evidence → settle decisions → derive gates → write → self-check → standalone only: validate with the user → hand back.

- **Creation is planning only:** decide direction, ownership, dependencies, risks, bounded discovery and proof; leave code and edit mechanics to execution.
- Derive the task-specific `## Quality Gates & Concerns Checklist` before phases: verification, evidence, owner and how open concerns will be settled.
- Keep one `plan.md`; separate phase files only for independent execution, context isolation or disjoint ownership.
- Plan creation never runs `--mode=review` or another review skill. After saving, standalone runs the validation interview ([Standalone Validation Chain](#standalone-validation-chain); automatic unless the `plan.validation.mode` setting says `prompt` or `off`), then asks once about `$plan --mode=review`; a workflow returns to its parent without the interview or next-step prompts.
- Write tests with implementation; schedule suites after all implementation and static review, never per phase.

**Workflow:** Resolve context → inspect governing evidence and representative patterns → settle material decisions → derive the quality-gates checklist → write the lean plan → self-check scope, discovery, checklist, and verify-last order → standalone only: run the validation interview and apply its answers → hand back.

**Key Rules:**

- A plan says what must be true, why, where to investigate, and how completion is proved—not every edit.
- Cite evidence for known repository facts. Mark future implementation evidence as an obligation, never fabricate paths, symbols, or line numbers.
- A plan without a task-specific checklist is incomplete: rows come from the task and repository evidence, non-applicable rows stay listed as `NO — <reason>`, every applicable row is checkable.
- Open product intent or irreversible decisions block and go to the user; bounded source discovery belongs in the plan with an owner and stop condition.

## Invocation Context

Determine once before writing:

- **Workflow invocation:** THIS run is a step of a `[Workflow]` row (`nested=true`: its own phase tasks are linked to that parent row) or the caller identifies this as a workflow step; a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count. Finish by returning the plan path and concise summary. Do not ask about review, execution, or other next steps, and do not run the validation interview: the parent workflow owns its own validation step.
- **Standalone invocation:** no parent workflow owns progression. After saving the plan, run the [Standalone Validation Chain](#standalone-validation-chain) as the `plan.validation.mode` setting directs (default `auto`: no question first; the chain's own exits cover a plan that another skill creates as one of its steps), then finish by asking exactly one optional question: `Run $plan --mode=review on this plan?` Do not call the review automatically, and do not bundle other next-step choices into that question.

## Mode Dispatch

Detect the mode from the invocation arguments before any other work; do not load a mode file the invocation did not select. One exception: a standalone plan creation loads `references/mode-validate.md` after the plan is saved, for the [Standalone Validation Chain](#standalone-validation-chain).

| Mode | Purpose | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Default plan creation — this file | — |
| `--mode=review [plan-path]` | Intent, necessity, alternatives, trade-offs and proof; review-only default, --fix-loop repairs and re-reviews. | `references/mode-review.md` |
| `--mode=validate [plan-path]` | Critical-questions interview that validates an existing plan's decisions and records a `## Validation Summary`. Formerly `/plan-validate` | `references/mode-validate.md` |
| `--mode=execute [plan-path] [--approval=off] [--tests=off] [--parallel={auto\|on\|off}]` | Implement an existing plan phase by phase: code and tests together, static review, one verify, approval, finalize. Formerly `/plan-execute` | `references/mode-execute.md` |
| `--mode=ci <log-url>` | CI failure-analysis intake | `references/mode-ci.md` |
| `--mode=cro` | Conversion-optimization intake | `references/mode-cro.md` |

- **[BLOCKING]** When `--mode=review`, read `references/mode-review.md` in full FIRST; it replaces creation with review-only or --fix-loop. Apply the shared mode/round policy; return the report path and verdict to the caller.
- **[BLOCKING]** When `--mode=validate`, read `references/mode-validate.md` in full FIRST; it replaces plan creation for the invocation (interview via `ask user question tool`, annotate `plan.md` only). Workflow invocation and standalone both run the interview.
- **[BLOCKING]** When `--mode=execute`, read `references/mode-execute.md` in full FIRST; it replaces plan creation for the invocation and owns the `--approval`, `--tests` and `--parallel` flags (no flag is set by default: no flags = the full spine, run sequentially). Workflow invocation runs Steps 0–2, the Checklist Walk (parent-owned rows carried as `PENDING-PARENT`) and Step 6 only; standalone runs the full spine.
- **[BLOCKING]** When `--mode=ci`, read `references/mode-ci.md` in full FIRST; when `--mode=cro`, read `references/mode-cro.md` in full FIRST. Both add domain intake only; they do not add review or change the plan-creation contract.
- `--mode=review` and `--mode=execute` are separate invocations over an existing plan; plan creation never chains into them. `--mode=validate` is the one mode a standalone plan creation chains into after saving; a workflow invocation reaches it only as its own workflow step.

## Evidence and Discovery

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`; the plan must map its outcome and final proof to the saved required criteria.
2. Resolve the configured plans root, spec profile, project references, commands, and mirror/generated surfaces from `docs/project-config.json` when present. Read `.claude/skills/shared/product-roadmap-contract.md` to select the applicable Plan Gate branch; it owns branch artifacts, scenario requiredness and approval semantics.
3. Read the task-relevant reference docs and governing spec/decision artifacts. For code-bearing work, inspect the target plus three comparable local patterns when available; record scarcity instead of inventing examples.
4. Trace affected owners and consumers. The code graph is an optional, stale-able hint for high-risk blast radius; for service/event systems, check producers, consumers, orchestration, and shared contracts.
5. Separate facts from execution-time discovery:
   - **Known now:** cite `file:line`, config key, spec section, or command.
   - **Discover during execution:** name the bounded question, source/owner to inspect, why it matters, and stop/escalation condition.
6. Ask the user only for a decision that changes product intent, public contract, irreversible data/architecture choice, or materially changes scope. Do not ask the user to supply mechanics the executor can discover safely.

Use direct repository inspection for focused work. Add research agents or external research only when distinct unknowns justify their context cost.

## Plan Artifact Contract

Write `plan.md` under the configured plans root. Use this compact shape; omit a section only with a stated `N/A` reason.

### 0. Applicability and Plan Gate (required producer handoff)

Before the technical sections, write exactly one `## Plan Gate` using the selected branch from `product-roadmap-contract.md`: EXPLICIT-ROADMAP, DECOMPOSITION-EMBEDDED, FRAMEWORK-LIBRARY, or EXEMPT. Preserve the shared owner's status values and required fields: Roadmap, Milestone, Scope brief, Scenarios, Product decisions, Project skeleton, Commands, Evidence plan, Human approval, plus Decomposition owner or Framework owner when applicable.

- Reuse the stable `{plan-dir}` and the actual upstream scope/scenario artifacts. Create the branch-required scope brief and scenario evidence there if absent, using verified intent; an embedded ordinary route uses its owning artifact and conditional scenario evidence. Do not invent a roadmap, milestone or decomposition block.
- Record approval only from explicit user/session evidence. An authorized scope may be recorded `APPROVED`; unknown approval stays `REQUIRED`, open intent stays `OPEN`, and the gate stays `BLOCKED` where the branch requires it. Saving a blocked plan is valid; implementation remains blocked.
- Self-check these fields against the shared owner’s Plan Gate and Handoff rules before handoff without loading or running another mode. This supplies the applicability contract consumed by validation Phase 0.5; missing applicability is an incomplete producer artifact, not a discovery task for the validator.

### 1. Outcome and boundaries

- Desired observable outcome and governing intent/spec.
- In scope, non-goals, assumptions, and compatibility/rollback boundary. A non-goal is out of scope by decision: give the reason, and never list it as not yet specified.
- **Not yet specified:** each decision or investigation you can tell is coming but cannot yet state as a precise question, with the area, what it waits on and who settles it. The test is whether the question can be stated precisely now, not whether it can be answered now: when it can, it becomes a decision (section 2), a bounded discovery in its phase or an open question for the user, and leaves this list. A phase that depends on an item names it as a blocking open question; a phase that does not may execute. Never file here a decision that changes product intent, a public contract or anything irreversible: that one blocks and goes to the user. Write `None — the whole route is visible` when nothing is foggy.

### 2. Important technical decisions

For each decision: choice · rationale · meaningful alternative · sacrifice/trade-off · reversibility · owning contract/module. Keep only decisions that constrain execution or future change cost.

### 3. Areas and owners to touch

Name affected modules, contracts, data/state, tests, specs/docs, generated mirrors, and external boundaries with why each is involved. List exact files only when evidence establishes them; representative paths are enough for an area whose exact edit sites must be discovered.

### 4. Quality Gates & Concerns Checklist

- **[BLOCKING]** Read `references/plan-quality-checklist.md` in full before writing this section; it owns the row columns, the candidate sweep, the row quality bar and the review/validate/execute duties.
- Write `## Quality Gates & Concerns Checklist` in `plan.md` before the phases: one table row per gate/concern with `# | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase`, then `### Open concerns and risks` with the planned way to settle each.
- Derive rows from the task and repository evidence, not boilerplate; list non-applicable gates as `NO — <reason>`; every applicable row is satisfiable and checkable; each phase cites the gate numbers it owns.

### 5. Execution phases

Use the fewest phases that express real dependency or ownership boundaries. Each phase contains:

- **Objective and boundary** — outcome, inclusions, non-goals.
- **Decisions already fixed** — constraints the executor must preserve.
- **Areas/owners** — known paths or modules and responsible contract.
- **Discovery before edit** — bounded source questions, evidence to inspect, stop condition.
- **Implementation output** — artifact/behavior produced, not a recipe of code edits.
- **Acceptance/quality gate** — observable evidence and invariant/test owner, citing the checklist gate numbers the phase owns.
- **Dependency metadata** — `PAR` with a disjoint write set, or `SEQ` with the exact dependency. Untagged phases execute sequentially.

Do not decompose into line edits, symbol-by-symbol instructions, ≤30-minute tasks, per-file pseudo-implementation, or recursive sub-plans. Split only for a real dependency, independently verifiable outcome, or disjoint write ownership.

### 6. Final verification order

- Map every changed behavior/invariant to its canonical case/test owner under the resolved `specArtifacts` profile. Cite an existing assertion when known; otherwise state the test obligation and expected observable.
- Author tests during the implementation phase that changes the behavior.
- After every implementation phase: run static/type/compile checks only when useful; no test suite, mutation run, or review.
- After all implementation: run one whole-change static review with tests deferred; fix validated findings.
- Then run the full affected test suite once plus required mutation/red proof. A failure follows fault adjudication and may trigger focused reruns/full rerun; this is recovery, not a planned intermediate test phase.
- Reconcile specs, tests, code, docs, and generated mirrors before completion; if a review fix changes any of them, repeat only the invalidated reconciliation before final verification.

### 7. Risks and execution concerns

Record material risks, security/data/platform/operational concerns, migration or rollback needs, cross-boundary compatibility, and what would force replanning. Include the next plausible change and expected edit sites, the 10× growth concern, and the named test that should fail when each protected rule breaks.

### 8. Execution waves

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

- **Producer handoff:** exactly one branch-correct `## Plan Gate`, real required scope/scenario paths, commands/evidence and honest approval state, as required by the shared owner and validation Phase 0.5.
- **Plan, not implementation:** could an executor choose local mechanics without contradicting the plan?
- **Decision completeness:** are product/public-contract/irreversible choices settled or explicitly blocked? Is every not-yet-specified item named with what it waits on, and kept apart from the non-goals?
- **Discovery completeness:** does every unknown have a bounded source, owner, and stop condition? A not-yet-specified item is the one exception: it names what it waits on and who settles it instead.
- **Checklist:** does `## Quality Gates & Concerns Checklist` exist, derived from this task (not generic), with every applicable row carrying a verification method, expected evidence and owner phase, every NO row carrying a reason, and every phase citing its gates?
- **Area coverage:** are code, tests, spec/docs, data/contracts, consumers, and mirrors included when applicable?
- **Verify-last:** are tests run only after all implementation and static review?
- **Efficiency:** remove repeated rationale, exhaustive inventories, generic advice, and any phase that proves no distinct fact.

Persist the plan path and a short summary. Workflow invocation returns immediately to its parent; standalone continues with the Standalone Validation Chain.

## Standalone Validation Chain

A standalone plan creation, the `--mode=ci` and `--mode=cro` intakes included, validates the saved plan with the user in the same run, as the effective `plan.validation.mode` setting directs. From the project root, read the effective value, which merges the user, project and checkout settings files (the later one wins), with `node -e "console.log(require('./.claude/hooks/lib/ck-config-loader.cjs').loadConfig().plan.validation.mode)"`; the default is `auto`. `auto` runs the interview without asking, `prompt` first asks one question, `Validate this plan with an interview now?`, and `off` skips the interview. Creation asked only what blocked writing the plan; the interview confirms every material decision it took.

Check these exits first, in this order. Do not start the chain when:

- **A workflow owns this run** — its own validation step decides.
- **Another skill runs plan creation as one of its own steps** — that skill owns what follows the plan; hand the plan back to it.
- **The setting is `off`, or the request explicitly declines validation** (an answer of no to the `prompt` question counts) — write `Validation: SKIPPED — {setting off | declined by the user}` under `## Validation Summary` in `plan.md`.
- **This context cannot reach the user** (a sub-agent or a headless run) — write `Validation: PENDING` under `## Validation Summary` in `plan.md` and return `Validation: PENDING — run the Standalone Validation Chain of the plan skill on <plan-path>` in the hand-back; never self-answer it. A session that receives that hand-back and can reach the user runs this chain from its first paragraph for that plan, so the setting and these exits apply.

When no exit applies:

1. **[BLOCKING]** Read `references/mode-validate.md` in full and run its interview on the plan just saved, passing that plan path; skip its closing next-step prompt.
2. **Apply the answers.** The interview only annotates; plan creation authored the plan, so it edits `plan.md` and any phase file for each action item the answers created, ticks that item in the `## Validation Summary`, lists every edit under `### Applied Changes` there (section → what changed) and shows that list in the conversation. When an applied answer creates a new material decision, ask it as a further round through the same reference before closing, and repeat until applying answers creates no new one; never settle it yourself. Then re-check the Self-Check Before Handoff bullets once; do not start this chain again. An answer that leaves product intent open, a preservation invariant unsure or the Plan Gate unapproved keeps the plan `BLOCKED`: report it, never settle it by assumption.
3. **Close** with the one optional review question from [Invocation Context](#invocation-context).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `plan-granularity` — Outcome phases name decisions, boundaries and bounded discovery without replaying implementation; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `preservation-inventory` — Table of behavior a bugfix plan must preserve, written before the implementation steps; writing a bugfix plan → .claude/skills/shared/protocols/preservation-inventory.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a concise, evidence-backed implementation plan that fixes direction and proof while leaving code-level discovery and mechanics to the executing agent.

**MUST ATTENTION Main steps:** select mode → read its reference when selected; creation resolves evidence → settles decisions → derives gates → writes → self-checks → standalone only: validates with the user → hands back. Review follows the selected review-only/fix-loop mode; validation interviews; execution follows its flags; CI/CRO add intake.

- **MUST ATTENTION** record outcome/non-goals, important decisions, affected owners/areas, bounded discovery, risks, and final quality gates.
- **MUST ATTENTION** write a task-specific `## Quality Gates & Concerns Checklist` before the phases (per `references/plan-quality-checklist.md`): every applicable gate with how it is verified, the evidence expected and the owner phase; NO rows with reasons; open concerns with a way to settle each.
- **MUST ATTENTION** resolve the active Goal Contract and map the plan to its saved required criteria.
- **MUST ATTENTION** plan creation never runs `--mode=review`; standalone asks once whether the user wants it, workflow invocation returns without next-step prompts.
- **MUST ATTENTION** a standalone plan creation runs the validation interview after saving (`plan.validation.mode`: `auto` runs it, `prompt` asks first, `off` skips it) and applies the answers before it closes; a workflow invocation or a calling skill never starts it, and a context that cannot reach the user hands back `Validation: PENDING` instead of self-answering.
- **MUST ATTENTION** `--mode=review`, `--mode=validate` and `--mode=execute` read their `references/mode-<x>.md` in full FIRST and follow it alone; default plan creation loads none of them, except `mode-validate.md` for the standalone validation chain.
- **MUST ATTENTION** write tests with implementation and run test suites only after all implementation and static review; never plan per-phase test/review cycles.
- **MUST ATTENTION** one `plan.md` by default; add phases/files only for real dependency, verification, context, or ownership boundaries.
- **MUST ATTENTION** cite known facts and never fabricate future symbols, paths, assertions, or `file:line` evidence.


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
