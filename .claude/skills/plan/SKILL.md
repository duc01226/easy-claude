---
name: plan
version: 1.2.0
description: '[Planning] Use when a workflow step or the user asks for an implementation plan. Flag: --mode={ci|cro} (default standard); ci plans a fix from a CI run, cro plans conversion-rate optimization.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Research the codebase and collaborate with the user to deliver a validated, implementation-ready phased plan — every phase startable immediately (exact file paths, zero open decisions, coverage mapped through the project's canonical artifact profile) — so coding proceeds without rework at minimum future change cost.

**Summary:**

- PLANNING ONLY — NEVER implement/execute code; produce `plan.md` + per-phase `phase-XX` files + a `goal.md` Goal Contract, then hand off.
- **Ordered pipeline (run in order; NEVER skip or reorder):** pre-check active/suggested plan + applicability branch → bootstrap Goal Contract (`goal.md`) → ONE `researcher` wave (spawn together; barrier before synthesis) → project-reference/codebase/pattern analysis + convention alignment → `planner` writes `plan.md` + `phase-XX` files (Alternatives, Rationale, UI Layout, profile-aware Test Specs) → tag PAR/SEQ write sets + `## Execution Waves` → granularity self-check → profile-aware Test Specs → `/plan-validate` → `/plan-review` (every round runs a parallel `/why-review` rationale sub-agent) → re-estimate → `AskUserQuestion` handoff.
- **The plan output itself carries parallelism metadata** — every phase tagged `PAR`/`SEQ` with the write set it owns, every `SEQ` naming its forcing dependency, laid out as critical-path waves ending in ONE final gate phase (see [Plan Parallelism Metadata](#plan-parallelism-metadata-mandatory--every-plan-output)). Omitting it is a defect of THIS skill: `/plan-execute` fans out only on what the plan declares.
- **`--mode={ci|cro}` routing:** `ci` plans a fix from a GitHub Actions run/log (loads `references/mode-ci.md`); `cro` plans conversion-rate optimization (25-item framework, `references/mode-cro.md`); default (no flag) = standard flow. Mode only ADDS a reference payload — SAME engine, SAME `/plan-review` gate, SAME `planner` agent.
- Default mode HARD (parallel subagents, project-reference docs, the `/plan-review` convergence loop under its HARD 2-round cap, no extension round); fast mode ONLY when EVERY trivial-task condition holds. Every phase passes the 5-point granularity check ("Can I start coding RIGHT NOW?"), carries `## Test Specifications` mapped to canonical case identities and executing evidence under the resolved profile (TC IDs only under the strict default), and uses bottom-up estimation (phase-hours drive man-days; SP DERIVED).
- **Conditional Project Pattern Alignment is mandatory:** read each of `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, and `docs/project-reference/code-review-rules.md` at its configured path when that file exists — any of them may be absent in a project that has no config, and each absence is recorded and covered from repository evidence instead of blocking the plan; if the plan edits frontend/UI, also read `frontend-patterns-reference.md` PLUS the project's styling and design-system docs (`configured styling reference`, `design-system/design-system-canonical.md`) — a UI plan written without the design system re-decides axes the project already settled; if it edits backend/hook code, also read `backend-patterns-reference.md`; if it edits both, read both. These pattern docs and their documented examples are the authority — there is no separate project-reference example-code file to assume. Cite corroborating source examples (`file:line`) when that scope has implementation code; explicit N/A/scarcity evidence is required otherwise.
- **Mandatory final tasks + gates:** write Test Specs per phase → `/plan-validate` → `/plan-review` (convergence loop, HARD 2-round cap with no extension — round 2 still blocking escalates via `AskUserQuestion`; its review wave always includes a `/why-review` rationale sub-agent, so no separate why-review task) → re-estimate vs finalized phases; New Tech/Lib gate before approval; **Domain Entity Gate (MANDATORY when the plan touches an entity/VO/aggregate)** — apply `SYNC:domain-entity-change-gate` so the plan DECIDES classification, invariant ownership, aggregate boundary, concurrency, construction, events, and the test obligation (each naming its owning file) instead of deferring them to implementation; `AskUserQuestion` confirm before any next step.
- **Applicability Gate:** before research or planner handoff, load `.claude/skills/shared/product-roadmap-contract.md`. For a large idea, verify the complete embedded `large_idea_decomposition` block and slice/conditional-scenario evidence; for an explicit roadmap request, resolve the approved roadmap milestone, scope brief, and scenario analysis; for a framework/library or isolated change, resolve its complete technical/EXEMPT branch. The emitted `plan.md` MUST contain the applicable `## Plan Gate` with decisions or explicit `N/A`, skeleton, commands, evidence, and human approval. A missing or open decision is `BLOCKED`, not an invitation to infer.

**Workflow:**

1. **Pre-Check** — Detect active/suggested plan or create new directory
2. **Research wave** — All independent research threads spawned in ONE message (`researcher` subagents, max 5 tool calls each), then a barrier before synthesis; use the main `/investigate` skill for inline code tracing
3. **Codebase + Conditional Pattern Analysis** — Resolve `code-review-rules.md` and the frontend/backend pattern reference(s) triggered by the plan, then inspect matching repository examples; investigate if required docs or implementation evidence is absent
4. **Plan Creation** — Planner subagent creates plan.md + phase-XX files with full sections
5. **Parallelism pass** — Tag every phase PAR/SEQ with its write set; declare `## Execution Waves` in plan.md
6. **Post-Validation** — Optionally interview user to confirm decisions via /plan-validate

**Key Rules:**

- PLANNING ONLY: do NOT implement or execute code changes
- Always run /plan-review after plan creation
- Ask user to confirm before any next step
- **MANDATORY IMPORTANT MUST ATTENTION** detect new tech/lib in plan and create validation task (see New Tech/Lib Gate below)
- **MANDATORY IMPORTANT MUST ATTENTION** when the plan touches an entity, value object, or aggregate, run the **Domain Entity Gate** below — state paradigm + subdomain fit BEFORE any entity task, and answer every triggered decision row with its OWNING FILE; "discover during implementation" is not an answer. Record `No domain-entity surface — gate N/A` when it does not fire

## First Principle — Easy to Change

> **Success metric of every coding decision: _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique serves one goal: **making next change cheaper**.

Evaluating code, refactor, test, abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any rule, pattern, or checklist
below — if a downstream rule raises change cost, this principle wins.

---

## Default Mode Policy

> **Default mode HARD (full rigor).** Every section below — parallel researcher subagents, the full `/plan-review` convergence loop (HARD 2-round cap, no extension), base-class greps, microservices/event-driven analysis, mandatory user approval — applies by default.
>
> **Opt out to fast mode ONLY when ALL true** (task genuinely trivial):
>
> - Single-file edit, ≤30 lines changed
> - No design choice (only one reasonable approach)
> - No cross-service impact, no contract change, no new dependency
> - No new pattern — follows existing codebase pattern
> - User explicitly asked for a quick change
>
> **Any condition fails → use full protocol below.** When in doubt, default hard — skipping rigor on a non-trivial task wastes more rework than rigor saves.
>
> **Fast mode skips (and only skips):** parallel researcher subagents (direct grep instead), the `/plan-review` re-review loop (single round, no fresh re-review even when findings remain), `/plan-validate` interview (inline confirm only), New Tech/Lib Gate (only if truly no new deps).

## New Tech/Lib Gate (MANDATORY for all plans)

**MANDATORY IMPORTANT MUST ATTENTION** after plan creation, detect new tech/packages/libraries not in project. If found: `TaskCreate` per lib → WebSearch top 3 alternatives → compare (fit, size, community, learning curve, license) → recommend with confidence % → `AskUserQuestion` to confirm. **Skip if** plan uses only existing dependencies.

## Domain Entity Gate (MANDATORY when the plan touches an entity, VO, or aggregate)

> Apply `SYNC:domain-entity-change-gate` (inlined below) — the SAME protocol `/plan-review` and `/changes-review` read, and whose A–P checklist `/domain-entities-review` owns. — why: a plan that leaves aggregate boundary, invariant ownership, or concurrency to "discover during implementation" ships a design review will reject, and the rework is paid twice.

**Fires when** the plan introduces or changes a domain entity / value object / aggregate root, its fields, invariants, relationships, or state transitions; an aggregate boundary, repository, or cross-aggregate reference; a domain event; or a concurrency/reconstitution concern. Otherwise record `No domain-entity surface — gate N/A`.

**The plan MUST name the decision AND the owning file for every triggered row** — an unanswered row is a plan that is not executable:

1. **Classification** — entity vs value object vs aggregate root (swap test applied).
2. **Invariant ownership** — which rules the entity enforces vs which the boundary validates; failure signalling (throw vs `Result`) consistent with the project convention.
3. **Aggregate boundary + concurrency** — what shares a transaction and why; cross-aggregate refs by ID; concurrency token on the ROOT; enforcing mechanism for any set-based invariant.
4. **Construction vs reconstitution** — separate creation and load paths; load raises no events.
5. **Events** — what is raised, when it dispatches (after commit / outbox), domain vs integration contract.
6. **Test obligation** — each invariant gets a property TC + boundary counter-case as a planned task, NEVER left implicit.

MUST ATTENTION state **paradigm** (OO-mutable / type-driven-immutable / event-sourced) and **subdomain fit** (core / supporting / generic / CRUD) BEFORE planning entity tasks — NEVER plan a rich domain model for a CRUD subdomain, and NEVER plan setter/mutability tasks against an immutable or event-sourced model.

---

## Greenfield Mode

> **Auto-detected:** No existing codebase found (no discovered source directories, no manifest files, no populated `project-config.json`) → skill auto-switches to greenfield mode. Planning artifacts (docs/, plans/, .claude/) don't count — repository must have actual code directories with content.

**When greenfield detected:**

1. Skip codebase analysis phase (researcher subagents grepping code)
2. **Replace with:** market research + business evaluation via WebSearch + WebFetch
3. Delegate architecture decisions to `solution-architect` agent
4. Output: `{plan-dir}/plan.md` with greenfield-specific phases (domain model, tech stack, project structure)
5. Skip reading project reference docs (won't exist in greenfield)
6. Enable broad web research: tech landscape, best practices, framework comparisons
7. Every decision point requires AskUserQuestion with 2-4 options + confidence %
8. **[CRITICAL] Business-First Protocol:** Tech stack decisions come AFTER full business analysis. Do NOT ask user to pick tech stack upfront. Instead: complete business evaluation → derive technical requirements → research current market options → produce comparison report → present to user. See `solution-architect` agent for full tech stack research methodology.

- Research reports <=150 lines; plan.md <=80 lines
- **External Memory:** Write all research/analysis to `tmp/analysis/{task-name}.analysis.md`. Re-read ENTIRE analysis file before generating plan.

Run the planning methodology engine. Load the relevant `references/engine-*.md` for each phase (skip a phase per its own skip rule):

- `references/engine-research.md` — Research & Analysis (skip if given researcher reports)
- `references/engine-codebase-understanding.md` — Codebase Understanding (skip if given investigate reports)
- `references/engine-solution-design.md` — Solution Design (trade-offs, security, performance, edge cases, architecture)
- `references/engine-plan-organization.md` — Plan Creation, Organization & Output Standards

## Mode Dispatch (`--mode={ci|cro}`)

> **Default (no `--mode` flag): IGNORE this section — run the standard plan flow below, byte-for-byte unchanged.** `--mode` only adds a domain-specific reference load + intake convention on top of the SAME engine, the SAME mandatory `/plan-review` gate, and the SAME `planner` agent. It never replaces the engine.

| Flag         | Positional `$ARGUMENTS`                                   | Load before planning                                                                  | Plan frontmatter overrides         |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| `--mode=ci`  | a GitHub Actions run/log URL                             | `references/mode-ci.md` (CI failure classes: build/test/env/Docker/dependencies)      | `priority: P1`, `tags: [ci, bugfix]` |
| `--mode=cro` | content/issues to optimize (optional screenshots/URL)    | `references/mode-cro.md` (25-item CRO framework + multimodal intake)                   | `priority: P2`, `tags: [cro, conversion]` |

When a `--mode` is present: (1) read the matching `references/mode-*.md`; (2) apply its intake + domain focus to `$ARGUMENTS`; (3) run the standard plan workflow below — same `planner` subagent, same phase-file structure, same mandatory `/plan-review`. The mode adds a reference payload only.

## Scaffolding-First Protocol (Conditional)

**Activation conditions (ALL must be true):**

1. Active workflow is `workflow-greenfield-init` OR `workflow-big-feature`
2. AI MUST ATTENTION self-investigate for existing base/foundational abstractions using these patterns:
    - Abstract/base classes: `abstract class.*Base|Base[A-Z]\w+|Abstract[A-Z]\w+`
    - Generic interfaces: `interface I\w+<|IGeneric|IBase`
    - Infrastructure abstractions: `IRepository|IUnitOfWork|IService|IHandler`
    - Utility/extension layers: `Extensions|Helpers|Utils|Common` (directories or classes)
    - Frontend foundations: `base.*component|base.*service|base.*store|abstract.*component` (if frontend present)
    - DI/IoC registration: search for DI registration patterns idiomatic to project's framework
3. If existing scaffolding found → **SKIP.** Log: "Existing scaffolding detected at {file:line}. Skipping Phase 1 scaffolding."
4. If NO foundational abstractions found → **PROCEED** with scaffolding phase.

**When activated:**

Phase 1 of plan MUST ATTENTION be **Architecture Scaffolding** — all base abstract classes, generic interfaces, infrastructure abstractions, DI registration with OOP/SOLID principles. Runs BEFORE feature stories. AI self-investigates what base classes the tech stack needs. All infrastructure behind interfaces with ≥1 concrete implementation (Dependency Inversion). Phase 1's deliverable MUST ATTENTION also include the **golden-path example set** `/scaffold` emits — one worked, compile-checked `*.example.*` per applicable pattern (backend: command · query · handler · entity-with-invariants · value-object · repository · domain event + event handler; frontend-if-UI: form · list · store · API service; tests: one integration test on happy + failure path) in an isolated, production-excluded `examples/` tree using the scaffolded base abstractions, so post-scaffold `/architecture-review-full` gate has real, gradeable code before any feature work.

**When skipped:** Plan proceeds normally — feature stories build on existing base classes.

## PLANNING-ONLY — Collaboration Required

> **DO NOT** use the `EnterPlanMode` tool — already in a planning workflow.
> **DO NOT** implement or execute any code changes.
> **COLLABORATE** with user: ask decision questions, present options with recommendations.
> After plan creation, ALWAYS run `/plan-review` to validate plan.
> ASK user to confirm plan before any next step.

## Applicability Preflight and Plan Gate (MANDATORY)

Read `.claude/skills/shared/product-roadmap-contract.md` before creating the Goal Contract or dispatching research. Apply the preflight to every plan, but select the branch from the shared four-operand `isLargeIdea` rule rather than treating a large idea as a roadmap request.

**Two relocatable roots — resolve both before writing any path below.** `{plan-dir}` is this plan's stable handoff directory, `{plans-root}/{plan-id}/`; the plans root resolves in THREE tiers, highest first: a `docsRoots.plans.path` entry in `docs/project-config.json` WINS, `.ck.json` `paths.plans` is the fallback when project-config declares nothing, and the hardcoded `plans` is last. `{roadmap-file}` is the product roadmap artifact: default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path. The `{plan-id}` directory-naming convention (`{YYMMDD-HHmm}-{slug}`) is unchanged by either root. Write the RESOLVED value into every plan, frontmatter field, and sub-agent brief — never the placeholder.

1. Classify applicability before resolving upstream artifacts. For embedded large-idea work, resolve the owning PBI/spec and verify the complete `large_idea_decomposition` block, selected slice IDs, non-goals, risks/evidence, and deferred owners; require `scenario-analysis.md` only when the slice's replay/state/ownership/recovery/evidence risks need adversarial analysis. For an explicit roadmap request, resolve `{roadmap-file}`, exactly one owner-approved milestone, its scope brief, and scenario analysis. For a framework/library or EXEMPT change, resolve its technical/EXEMPT scope and scenario branch without requiring a roadmap or product milestone. If the applicable artifacts are missing or outside `{plan-dir}`, route to the owning branch and stop with `BLOCKED`.
2. Confirm the selected slice/outcome or technical/EXEMPT boundary, in-scope behavior, explicit non-goals, lifecycle definitions, business/operational source of truth, persistence expectation, high-impact scenario coverage, project skeleton/configuration, build/test/run commands, and redacted evidence plan. Do not let architecture or code research choose an unresolved product meaning.
3. For a large idea, write the embedded decomposition owner/slice references in the plan. For a genuinely isolated brownfield change, write `## Roadmap Applicability` with `Status: EXEMPT`, reason, and accepting owner. For a framework/library change, write `Status: FRAMEWORK-LIBRARY` with technical outcome and evidence owner. Neither branch creates a product roadmap.
4. Before handoff, write exactly one `## Plan Gate` block in `plan.md`, using the applicable branch in the shared contract. Set `DECOMPOSITION-EMBEDDED`, `FRAMEWORK-LIBRARY`, or `EXEMPT` only when that branch is complete; set `READY` only for an explicit roadmap branch whose outcome/boundaries match, material decisions are `CONFIRMED`, scenarios have proof mappings, skeleton/commands/evidence are known, and the human owner has approved. Otherwise set `BLOCKED`. Never use an AI-generated `PASS` as approval.

Required output shape:

For explicit-roadmap plans:

```markdown
## Plan Gate
- Status: READY | BLOCKED
- Roadmap: {roadmap-file}
- Milestone: M{n} — {outcome}
- Scope brief: {plan-dir}/scope-brief.md
- Scenarios: {plan-dir}/scenario-analysis.md
- Product decisions: CONFIRMED | OPEN — {decision IDs}
- Project skeleton: CONFIRMED | MISSING — {frontend/backend/data/config status}
- Commands: CONFIRMED | MISSING — {build/test/run commands}
- Evidence plan: CONFIRMED | MISSING — {journey, assertions, artifacts, redaction}
- Human approval: APPROVED | REQUIRED
```

For an embedded large-idea plan, use the shared contract's `DECOMPOSITION-EMBEDDED` branch: `Roadmap: NOT APPLICABLE — embedded large-idea decomposition`, `Milestone: NOT APPLICABLE — slice IDs live in the owning artifacts`, the owning PBI/spec and selected slice IDs, a conditional scenario path, `Product decisions: CONFIRMED | OPEN`, and the same skeleton, commands, evidence, and human-approval fields. The complete five-field decomposition block is required whenever any signal is true.

For a `FRAMEWORK-LIBRARY` plan, use the shared technical branch: `Roadmap: NOT APPLICABLE — framework/library branch`, a technical registry ID only when useful, the technical scope/scenario sibling paths, `Product decisions: N/A — no adopter product intent changed`, the framework owner approval, and the same skeleton, commands, evidence, and human-approval fields. Neither branch creates a product roadmap.

For an EXEMPT plan, use the shared contract's EXEMPT branch: `Roadmap: EXEMPT — {reason}`, `Milestone: EXEMPT — product-level scope unchanged`, the stable scope/scenario sibling paths, `Product decisions: N/A — {reason}`, and the same skeleton, commands, evidence, and human-approval fields. Do not use `M{n}` or a missing roadmap path as a placeholder.

`plan-review` and `plan-validate` are downstream gates. They may not turn `BLOCKED` into `READY` without the missing product decision or explicit owner approval.

## Supplied-Spec Scope Baseline (when the input names a spec)

A plan that implements a supplied spec is scoped to that spec **as supplied**, not to a spec edited later in the same run — why: a spec that grows mid-run lets untraced work into phases while the trace check still passes.

1. **Record the baseline at plan start, before research.** For each spec file the input names, run `git hash-object -w -- <path>` (the same command on Windows, macOS and Linux; run it as an argv vector, never a shell string) and write the result into `plan.md` frontmatter as `spec_baseline: [{path, blob}]`. `-w` writes the blob into the object store, so an uncommitted or new spec stays restorable after later edits; `--` keeps a path that starts with `-` from being read as an option. Write the baseline once; never rewrite it after the spec changes.
2. **Plan against the baseline content.** Give the planner the baseline paths and blobs; it reads the content with `git cat-file -p <blob>`. Every phase requirement traces to baseline content.
3. **Additions become questions.** A requirement not in the baseline — a gap research found, a hardening idea, text added to the spec later in the run — goes to a `## Proposed additions (need approval)` section in `plan.md`, NOT into a phase. Each entry states the addition, its evidence, and `Status: PENDING | APPROVED ({who}, {date}) | REJECTED`; ask the user with `AskUserQuestion`. Only an `APPROVED` entry may enter a phase, and that phase cites the entry. Never build an addition silently and never drop a gap finding silently.
4. **Baseline cannot be recorded** (no git repository, git missing, command fails): tell the user, omit `spec_baseline`, and write `Spec baseline: NOT RECORDED — {reason}` under `## Plan Gate`. Never write a guessed, short, or partial blob.
5. **No spec supplied → no baseline.** Omit `spec_baseline` and the proposals section; planning behaves exactly as without this section.

## Your mission

<task>
$ARGUMENTS
</task>

## Pre-Creation Check (Active vs Suggested Plan)

Check `## Plan Context` section in injected context:

- If "Plan:" shows a path → Active plan exists. Ask user: "Continue with this? [Y/n]"
- If "Suggested:" shows a path → Branch-matched hint only. Ask if user wants to activate or create new.
- If "Plan: none" → Create new plan using naming from `## Naming` section.

## Workflow

1. If creating new: create directory using `Plan dir:` from `## Naming` section, then run `node .claude/scripts/set-active-plan.cjs {plan-dir}`. If reusing: use active plan path from Plan Context. Pass directory path to every subagent. When the input names a spec, record `spec_baseline` now, per [Supplied-Spec Scope Baseline](#supplied-spec-scope-baseline-when-the-input-names-a-spec).
2. **Goal Contract bootstrap (BEFORE investigation and phase writing):** resolve active goal per `SYNC:goal-contract-satisfaction-loop` — create/update `{plan-dir}/goal.md` from `.claude/templates/goal-contract-template.md`, recording original request, purpose, success criteria, constraints, required evidence. Every phase's success criteria maps to a saved goal criterion. Redact secrets.
3. Follow strictly the "Plan Creation & Organization" rules in `references/engine-plan-organization.md`.
4. **Project-reference preflight — BEFORE dispatch.** Resolve and read the required project-reference documents first. Record missing or stale references as scoped research inputs; never discover the governing conventions only after workers have already started.
5. **Research wave — ONE message, ONE barrier.** Enumerate the independent research threads this task needs — per-module code investigation, pattern discovery, dependency mapping, prior-art/library search — then tag each `PAR`/`SEQ` and declare `Parallel plan: wave 1 = [...] · SEQ = [...] (reason)` before dispatch. Research is read-only, so a thread is `PAR` unless it consumes another thread's output (name that output). Spawn the whole wave in ONE message: `researcher` agents (max 2) for external/prior-art and codebase threads, max 5 tool calls per agent; use the main `/investigate` skill for deeper inline code tracing. Give each agent its own report path under `{plan-dir}/research/` so no two agents write the same file.
6. Analyze codebase against the preflight references and complete the **Project Convention & Example Alignment Gate** below. **ONLY IF a required reference is missing or older than 3 days:** include a scoped `/investigate <instructions>` pass in the research wave to gather the missing evidence; do not launch an unplanned later round trip.
7. **Barrier, then synthesize.** Advance only after EVERY wave member returns (a skipped thread counts as returned). Read the report FILES (not memory), reconcile conflicting findings, and record unresolved gaps — a second wave is dispatched only for gaps the first wave exposed.
8. Main agent gathers research report filepaths; pass them to the `planner` subagent together with the resolved pattern-doc paths/headings and the convention matrix requirements. The planner must use those sources, not generic framework memory, when creating the implementation plan.
9. **Parallelism pass (MANDATORY before handoff).** Validate each phase's **Mode, Wave, write set, and SEQ dependency**, then write the `## Execution Waves` line — see [Plan Parallelism Metadata](#plan-parallelism-metadata-mandatory--every-plan-output). This is what lets `/plan-execute` fan out; an untagged plan executes strictly sequentially.
10. Main agent receives implementation plan from `planner`; ask user to review.

## Project Convention & Example Alignment Gate (MANDATORY)

Run this gate after the project-reference preflight and codebase analysis, before the planner handoff. Project docs and local examples outrank generic framework knowledge.

1. **Resolve the authority.** Derive the frontend/backend triggers from the requested changes and the planned file/module list, not the plan title alone. Always read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, and `docs/project-reference/code-review-rules.md`. If the plan edits frontend/UI, also read `docs/project-reference/frontend-patterns-reference.md`, `configured styling reference` and `docs/project-reference/design-system/design-system-canonical.md`; if it edits backend/hook code, also read `docs/project-reference/backend-patterns-reference.md`; if it edits both, read both. Record exact paths/headings in `plan.md` under `Reference docs read:`. Missing or stale context routes through the documented project setup/scan route and blocks handoff until resolved. Do not search for or require a separate project-reference example-code file.
2. **Use the right evidence source.** Treat the applicable pattern-reference sections and the code-review document's Golden-Path, Architecture, Skill Definition, and relevant checklist sections as the convention source. Then search/read actual source examples (`file:line`) when the planned scope has implementation code; use at least 3 comparable patterns where 3 exist, and if the repository or the applicable reference explicitly has no such surface, record `N/A` or a bounded scarcity reason. For framework/tooling-only work, analogous `.claude` skills, hooks, agents, workflows, tests, or scripts are the examples — never frontend skill assets as application conventions. Examples must share the decision's preconditions, scope, lifetime, and boundary; the nearest file is not automatically a valid precedent.
3. **Record an auditable matrix.** `plan.md` MUST contain `## Project Convention Alignment` with one row per major decision:

   | Decision | Applicable pattern source (path + heading) | Corroborating source example(s) (`file:line`) or explicit N/A | Plan choice | Status |
   | --- | --- | --- | --- | --- |
   | {placement/layer/naming/test/etc.} | `{docs/...}#{section}` | `{path}:{line}` or `{N/A reason}` | {concrete choice} | `MATCH` / `DEVIATION` / `N/A` |

   `MATCH` requires the applicable local pattern source and, when implementation code exists, a context-fit source example. Every `DEVIATION` names the violated convention, why it does not fit, the rejected alternative, and the future-change-cost trade-off; irreversible deviations also require the applicable user/owner decision. `N/A` is allowed only with an explicit reason grounded in the plan scope or a documented N/A reference.
4. **Trace every phase.** Each `phase-XX` file MUST include `## Convention Alignment` linking its file/layer/test/documentation choices to the matrix rows. `OPEN`, `MISSING`, `UNVERIFIED`, dead citations, generic-only justification, or an unreferenced major decision blocks planner handoff and must become a bounded research task.
5. **Greenfield exception.** When the repository has no implementation surface, write `N/A — no existing project code or local examples` and use the accepted architecture/tech-stack decisions as the governing evidence. Do not claim brownfield conformance where no precedent exists.

## Post-Plan Validation (Optional)

After plan creation, offer validation interview to confirm decisions before implementation.

**Check `## Plan Context` → `Validation: mode=X, questions=MIN-MAX`:**

| Mode     | Behavior                                                                        |
| -------- | ------------------------------------------------------------------------------- |
| `prompt` | Ask user: "Validate this plan with a brief interview?" → Yes (Recommended) / No |
| `auto`   | Automatically execute `/plan-validate {plan-path}`                              |
| `off`    | Skip validation step entirely                                                   |

**If mode is `prompt`:** Use `AskUserQuestion` tool with options above.
**If user chooses validation or mode is `auto`:** Execute `/plan-validate {plan-path}` SlashCommand.

## Output Requirements

**Plan Directory Structure** (use `Plan dir:` from `## Naming` section)

```
{plan-dir}/
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── XX-report.md
│   └── ...
├── investigate/
│   ├── investigate-XX-report.md
│   └── ...
├── plan.md
├── phase-XX-phase-name-here.md
└── ...
```

**Research Output Requirements**

- Research markdown reports concise (<=150 lines); cover all topics + citations.

**Plan File Specification**

- Every `plan.md` MUST ATTENTION start with YAML frontmatter:

    ```yaml
    ---
    title: '{Brief title}'
    description: '{One sentence for card preview}'
    status: pending
    priority: P2
    effort: { sum of phases, e.g., 4h }
    story_points: { sum of phase SPs, e.g., 8 }
    man_days_traditional: '{ total e.g., 6d (4d code + 2d test) }'
    man_days_ai: '{ total with AI e.g., 3d (2d code + 1d test) }'
    branch: { current git branch }
    tags: [relevant, tags]
    applicability: EXPLICIT-ROADMAP | DECOMPOSITION-EMBEDDED | FRAMEWORK-LIBRARY | EXEMPT
    roadmap: '{roadmap-file}' # resolved path; explicit-roadmap branch only; omit otherwise
    milestone_id: 'M{n}' # explicit-roadmap branch only; omit otherwise
    scope_brief: '{plan-dir}/scope-brief.md' # resolved path; required only for the applicable branch
    scenario_analysis: '{plan-dir}/scenario-analysis.md' # resolved path; conditional for embedded work
    large_idea_decomposition: {complete block when any isLargeIdea signal is true; omit when all are false}
    spec_baseline: [{ path: '{spec-path}', blob: '{git hash-object -w -- <path> output}' }] # only when the input names a spec; omit otherwise
    created: { YYYY-MM-DD }
    ---
    ```

- Save overview at `{plan-dir}/plan.md` (<80 lines): list each phase with status, progress, **Mode (`PAR`/`SEQ`)**, links to phase files; add the `## Execution Waves` line below the phases table.
- For each phase, create `{plan-dir}/phase-XX-phase-name-here.md` with sections: Context links, Overview, Key Insights, Requirements, **Alternatives Considered** (minimum 2 approaches with pros/cons), **Design Rationale** (WHY chosen approach), **Convention Alignment** (matrix row IDs + reference/example evidence), Architecture, **UI Layout** (see below), Related code files, **Parallel Execution** (Mode `PAR`/`SEQ` · Write set · SEQ dependency — see below), Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps.
- **UI Layout:** For frontend-facing phases, include ASCII wireframe. Classify components by tier (common/domain-shared/page-app). For backend-only phases: `## UI Layout` → `N/A — Backend-only change.`
- **Journey Report + design authority FIRST (MANDATORY for any phase that CREATES or RESHAPES a user-facing surface; `UX-1`, `UX-2`; catalog `.claude/docs/ux-journey-process.md`):** before the wireframe, the UI Surface Contract and the Design Plan, `## UI Layout` opens with `### User Journeys` — the Journey Report for the journeys this phase serves (frame · actors + job statements · ranked main journeys · per-journey step table: intent · decision · information needed · business rule · response · failure → recovery · assumptions), each claim `SOURCED (<location>)` or `INFERRED`, depth by scope (catalog §10: tweak → 3–5 line note; new/reshaped view → 1–2 journeys; new flow → full report). Link it instead when a governing spec, design-spec or PBI already carries it (`see {path}#{section}`) — never restate a divergent copy. Then record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)` for the project's design principles, design system, styling conventions and related existing UI. An inferred primary actor, main job or success outcome goes to the unresolved questions for the user, never settled as a plan decision.
- **Selected mockup (when an explore mockup run exists for this surface):** `## UI Layout` links its `tmp/design/<run>/journey-report.md` and `direction-approved.md` (or the final mockup path), copies its `Selection:` line verbatim (`USER` · `USER — 1 option` · `AUTO-SELECTED — <reason>`), and ADOPTS the chosen direction's axes and layout skeleton in the Design Plan — never re-deciding them. The run recorded `Mockup: SKIPPED by user` → copy that line and author the Design Plan fresh. An `AUTO-SELECTED` direction goes to the unresolved questions so the user can re-pick.
- **UI Surface Contract (MANDATORY inside `## UI Layout` for every new or reshaped view — `.claude/docs/design-review-checklist.md` in PLAN mode):** a table with one row per view, DERIVED from the journey step tables — each row names the journey steps it hosts and every main-journey step lands on a row (`UX-3`); information priority is tiered by the `UX-4` score (need-at-the-decision × frequency × cost-of-missing), with ONE primary action = the journey's next step: primary task · container and why it fits (`E9`: dialog only for a short focused task; long or multi-section entry → full view or stepped flow) · information priority `now / later / not here` (`B12`–`B13`; copy the governing spec's record when one exists) · inputs required at creation vs deferred with a draft Field Necessity Matrix for input-bearing views (`R1`–`R2`) · counts vs `uiReview.complexityBudget` when the project declares one (`B15`) · relevant states (`D2`) · accessibility standard and overlay focus handling (`I15`). The phase's Success Criteria bind the applicable checklist IDs. `/plan-review`'s UI Plan Checklist lens fails a UI phase that omits this contract.
- **UI/UX gate criteria (MANDATORY for the same phases; `UX-9`–`UX-11`):** the phase's Success Criteria record a per-journey interaction-cost target (steps · clicks · view changes · fields vs the current flow), the wayfinding check (current location · labelled destinations · back/exit keeping data · no dead ends), and require a closing UI/UX Gate Report covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy with no open `FAIL`.
- **Design Plan (MANDATORY for any phase that CREATES or RESHAPES a user-facing surface; `DD-1`–`DD-3`):** a plan that leaves visual direction to "decide during implementation" ships whatever the implementer's defaults are, and review then rejects it — the rework is paid twice. Inside `## UI Layout`, after `### User Journeys` and the UI Surface Contract (the Design Plan styles the journey structure; it never reorders it — `UX-7`), add a `### Design Plan` subsection with FOUR parts, each carrying its WHY traced to the subject matter (who the user is, what they must accomplish, what it should feel like):
    - **Color** — the base palette as **4–6 named hex values**, named for the product's world, not a numeric ramp
    - **Type** — the typefaces **and their roles**, plus the scale
    - **Layout** — the concept in one-sentence prose alongside the ASCII wireframe above, **including alignment** (left / centered / justified)
    - **Principles** — what makes THIS surface unique: the one memorable element, and what stays quiet around it

    Then record a one-line **`Generic test:`** result — work through a similar prompt, and state what you REVISED because it read like the default for any comparable screen (or state that the axes were pinned by the brief or the project design system, and by which). **Where the project already has a design system, `interface-system.md`, or token files, the Design Plan ADOPTS them and records that adoption** — it re-decides an axis only with a stated reason; a genuine conflict goes to the user, never resolved silently. For a phase that only extends an existing surface within its established system: `### Design Plan` → `ADOPTED — {design-system doc path}; no free axes in this phase.`

## Plan Parallelism Metadata (MANDATORY — every plan output)

`/plan-execute` fans out ONLY on what the plan declares. An untagged plan forces sequential execution, so omitting this metadata is a defect of THIS skill, not of the executor.

1. **Tag every phase `PAR` or `SEQ`** — in the `plan.md` phases table (`Mode` column) and in each phase file's `## Parallel Execution` section. `PAR` = its inputs contain no pending phase's output AND its write set is disjoint from every other `PAR` phase.
2. **Declare the write set per phase** — the exact file paths the phase creates / modifies / deletes (globs only when their members are enumerable from the plan). Two `PAR` phases MUST have disjoint write sets; any overlap → merge the phases, or demote the later one to `SEQ` and name the shared file.
3. **Every `SEQ` names its forcing dependency** — `SEQ — needs phase-02's {migration | generated type | contract | file}`. "Feels sequential", "safer in order", or an unnamed dependency is not a reason: retag it `PAR`.
4. **Group `PAR` phases into waves** in a `## Execution Waves` line in `plan.md`:
   `Execution waves: wave 1 = [phase-01, phase-03] · wave 2 = [phase-04] · SEQ = [phase-02 (needs phase-01 schema), phase-06 (approval gate)]`.
5. **One final gate, no test/review sub-phases.** Plan no per-phase or per-release test, review, or "close" phase. Each implementation phase ends with a cheap targeted check: its own suites plus one mutation check per new rule. The plan ends with ONE `SEQ` final gate phase: docs and counts, generated mirrors, the full suite, and one review fix-loop over the whole changeset. A user-approval or migration phase stays a `SEQ` boundary. — why: repeated gates re-test and re-review the same code and serialize the run.
6. **Critical-path waves.** For a big plan, compute the critical path. Tag `SEQ` only where a real data or write-set dependency forces it; put everything else in `PAR` waves, merged across would-be release boundaries when write sets are disjoint. Name each dependent phase's exact dependencies so it starts as soon as THOSE return, not when its whole wave does (`/plan-execute` runs that early start as its own single-member wave with its own barrier). State the wall-time estimate as the critical-path length, not the sum of phase hours.
7. **Serial chains.** Phases that share a file form one serial chain owned by one executor (`SEQ = [chain: phase-03 → phase-05 (share x.ts)]`), not separate waves.
8. **Releases only on request.** Split the plan into releases only when the owner asks for separately shippable increments.
9. **Phase-file block format** (copy verbatim into each phase file):

    ```markdown
    ## Parallel Execution

    - Mode: PAR | SEQ
    - Write set: `src/a/x.ts`, `src/a/x.spec.ts`
    - Wave: 1
    - SEQ dependency: {name the phase + the exact artifact it produces — omit when Mode: PAR}
    ```

**Behavior/Sync Planning Checks**

- **MUST ATTENTION** Before writing phase test specifications, resolve the canonical owner root from `docs/project-config.json` (`specRoots.business.path`) and read its required spec references. A declared `specArtifacts` profile supplies its section roles, identifiers, ownership, and carriers; required project-reference docs may also establish the native contract. A malformed or unresolvable configured profile is `BLOCKED`. Honor case-to-test cardinality only when explicitly established by that contract and verified against the actual mappings; unresolved cardinality or ownership is `UNKNOWN`/`BLOCKED`. Use the strict default TC/Section 8 contract and one-TC-to-many-tests mapping only when neither config nor required references declares a native profile. A native profile replaces the default representation at the existing canonical owner; it never creates a parallel case registry.
- For behavior-changing work, every phase should name changed behavior, unchanged behavior to preserve, canonical scenario/case identity and mapped proof under the resolved profile, and docs/spec sync action. Preserve owner-qualified scenario and variant IDs; map each claimed result to its actual executor and inspected assertion, or to an explicitly profile-approved manual-QC procedure and observed evidence. Aggregate results prove only rows whose assertions are shown to execute.
- For explicit-roadmap work, `plan.md` must include the approved roadmap/milestone/scope/scenario references and the `## Plan Gate`; embedded, framework, and EXEMPT work must use their own shared branches and must not fabricate roadmap fields.
- For AI-extracted specs, cases, or coverage mappings, plan must mark them reference-only until canonical acceptance.
- For `.claude` skills/hooks/workflows/sync tooling, plan must include generated mirror sync or explicit no-sync evidence.
- For every plan with implementation scope, `## Project Convention Alignment` must map major solution decisions to `code-review-rules.md` and any conditional frontend/backend pattern-reference sections, plus context-fit `file:line` examples when source exists; deviations and explicit N/A/scarcity gaps must be justified.

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always break work into many small todo tasks via `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After all planning todos, ALWAYS add these final tasks:
    1. **Task: "Write profile-aware test specifications for each phase"** — Add `## Test Specifications` to each phase as a derived mapping, not a second case registry. Read `docs/project-config.json` and the required canonical owner references; when a native contract is declared by `specArtifacts` or those references, preserve its owner-qualified scenario/case IDs, variants, and carriers, and honor only explicitly established cardinality. Map each requirement to its planned or existing test executor and inspected assertion, or to an explicitly profile-approved manual-QC procedure and expected evidence/result. Never copy canonical case content or invent IDs; unresolved ownership/cardinality is `UNKNOWN`/`BLOCKED`. If behavior needs a new or changed case, include the canonical-owner update in the plan. Only when neither config nor required references declares a native profile, retain the strict `TC-{FEATURE}-{NNN}` Section 8 default and one-TC-to-many-tests mapping; use `/spec [mode=tests]` only on that strict-default branch. `Evidence: TBD` is allowed only for an explicit TDD-first gap.
    2. **Task: "Run /plan-validate"** — `/plan-validate` skill interviews user with critical questions, validates plan assumptions.
    3. **Task: "Run /plan-review"** — `/plan-review` skill, convergence loop (review → validate findings → fix → fresh full re-review) bounded by a **HARD 2-round cap with NO extension round, NEVER a target**: a clean pass ENDS the loop at ANY round once the persisted `minRounds` is met; round 2 is the LAST round, so round 2 completing with ANY validated blocking finding open — CRITICAL, HIGH or MEDIUM — escalates via `AskUserQuestion` with every open finding listed, never a round 3 and never a silent PASS. SP raises the RIGOR of each round, never a round floor: ≤3 → checklist + code-proof trace; 4-8 → + adversarial simulation; >8 → code-proof trace mandatory in every round. Every round's review wave includes an unconditional `/why-review` rationale sub-agent (design rationale, alternatives, trade-offs), so no separate `/why-review` task follows.
    4. **Task: "Re-evaluate estimation against finalized plan"** — Pre-completion estimates anchor on scope guesses; finalized phases reveal true cost. After phases/TCs/decisions locked: (a) re-derive `bottom_up_hours = Σ phase_hours` from finalized phase files; (b) recompute `likely_days`, `risk_margin_pct`, `min-max range` per `SYNC:estimation-framework`; (c) compare to current frontmatter `man_days_traditional` / `story_points`. If `|delta| > 20%` → UPDATE frontmatter, add `reestimate_delta_pct: <signed>` + 1-line `reestimate_reason`. If `|delta| > 50%` → flag `SHOULD-RESCOPE` and surface to user via `AskUserQuestion` before implementation.

## Important Notes

- Activate needed skills from catalog during process.
- Token efficiency without sacrificing quality. Sacrifice grammar for concision in reports.
- Unresolved questions → list at end of report.

---

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST ATTENTION:** If skill is called **outside a workflow** (standalone `/plan`), generated plan MUST ATTENTION include `/changes-review` as a **final phase/task** in plan. Ensures all implementation changes get reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `workflow-feature`, `workflow-bugfix`), skip this — workflow sequence handles `/changes-review` at appropriate step.

## Next Steps (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"Proceed with full workflow (Recommended)"** — Detect best workflow to continue (plan created). Ensures review, validation, implementation, testing not skipped.
- **"/why-review"** — Extra standalone design-rationale review of the plan (every `/plan-review` round already runs one as a parallel sub-agent)
- **"/plan-review"** — Validate plan before implementation
- **"/plan-validate"** — Interview user to confirm plan decisions
- **"/plan-execute"** — Start coding & testing the finalized plan. Recommended implementation route after plan validated.
- **"Skip, continue manually"** — user decides

## Post-Plan Granularity Self-Check (MANDATORY)

After creating all phase files, run **recursive decomposition loop**:

1. Score each phase against 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
2. Each FAILING phase → create task to decompose into sub-plan (with own /plan → /plan-review → /plan-validate → fix cycle)
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."

## Preservation Inventory (MANDATORY for bugfixes)

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, MUST ATTENTION ask user whether to skip.

- `domain-entities-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
- The business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — Canonical behavior and case owner. Read the configured scenario/case identities, carriers, and executing-test or approved manual-QC mappings; use existing TC records only when no native profile is declared.

> Each phase file MUST ATTENTION satisfy: <=5 files per phase, <=3h effort, clear success criteria, and mapped canonical scenario/case identities with executor/assertion evidence under the resolved profile.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `estimation-framework` — Bottom-up estimation with derived story points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `iterative-phase-quality` — Score complexity before planning and size the phases by it; starting a plan → .claude/skills/shared/protocols/iterative-phase-quality.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `plan-granularity` — Five-point granularity check that each phase must pass; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Every plan phase carries test specifications and purpose-named contracts; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `preservation-inventory` — Table of behavior a bugfix plan must preserve, written before the implementation steps; writing a bugfix plan → .claude/skills/shared/protocols/preservation-inventory.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** when a changed model uses DDD tactical patterns or an evidenced equivalent, apply the **Domain Entity Change Gate** — `/domain-entities-review` owns the full A–P checklist; detect paradigm + subdomain fit FIRST, then answer all 6 applicable decisions (classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · assertion-backed native test obligation). Use property TCs only under the absent-profile default; a malformed declared `specArtifacts` profile blocks without fallback. When the project does not use this model, record the DDD-specific gate N/A and still protect actual invariants and outcomes through the configured owner. Planning must NAME each applicable decision; plan review treats an unanswered row as a FINDING; change review routes to the owner (Mode A read / Mode B delegate). SKIP under the 3-row duplication guard and record the deferral line. — why: one protocol shared by planner and reviewer is what stops a plan shipping an entity design that review then rejects.

<!-- /SYNC:domain-entity-change-gate:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:plan-quality:reminder -->

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call `TaskList` and re-read the phase file; verify `file:line` evidence before completion.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:plan-granularity:reminder -->

**IMPORTANT MUST ATTENTION** verify all phases pass 5-point granularity check. Failing phases → sub-plan. "Can I start coding RIGHT NOW?"

<!-- /SYNC:plan-granularity:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:iterative-phase-quality:reminder -->

**IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.

<!-- /SYNC:iterative-phase-quality:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Research the codebase and collaborate with the user to deliver a validated, implementation-ready phased plan — every phase startable immediately (exact file paths, zero open decisions, coverage mapped through the project's canonical artifact profile) — so coding proceeds without rework at minimum future change cost.

**IMPORTANT MUST ATTENTION Main steps:** pre-check active/suggested plan + applicability → bootstrap Goal Contract → one `researcher` wave + barrier → project-reference/codebase/pattern analysis + convention alignment → run New Tech/Lib and conditional Domain Entity gates → planner authors plan/phases → tag PAR/SEQ write sets + `## Execution Waves` → granularity self-check → profile-aware Test Specs → `/plan-validate` → `/plan-review` (every round runs a parallel `/why-review` rationale sub-agent) → re-estimate → `AskUserQuestion` approval/handoff.

**IMPORTANT MUST ATTENTION Applicability:** a plan is not ready to cook until its `## Plan Gate` proves the applicable branch: complete embedded decomposition and slice evidence, one approved explicit roadmap outcome, complete framework technical evidence, or complete EXEMPT scope. Every branch still needs explicit non-goals, scenario coverage where applicable, known skeleton/commands, redacted evidence, and human approval; missing product intent is BLOCKED, never silently inferred.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Plan Granularity:** every phase passes the 5-point check or sub-plans.
- **Preservation Inventory:** bugfix plans tabulate invariants with `file:line` + verification.
- **Nested Task Creation:** child skills expand visible phase tasks; link parent when nested.
- **Project Reference Docs Guide:** ALWAYS read required project docs before target work.
- **Conditional Project Pattern Alignment:** always use `code-review-rules.md`; add frontend/backend pattern references only when the plan scope triggers them; cite source examples when implementation exists and record explicit N/A/scarcity evidence otherwise.
- **Task Tracking & External Report:** bootstrap tasks; persist findings to `tmp/reports/`.
- **Critical Thinking:** every claim needs traced proof; confidence >80% to act.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers.
- **Understand Code First:** read code + grep 3+ patterns before planning.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts for breaking risk.
- **Estimation Framework:** bottom-up phase hours drive man-days; SP DERIVED.
- **Plan Quality:** every phase carries `## Test Specifications` mapped to canonical scenario/case identities and executor/assertion evidence under the resolved profile; TC IDs apply only under the strict default.
- **Iterative Phase Quality:** score complexity first; decompose at score ≥6.
- **Fix-Layer Accountability:** NEVER fix at the crash site; fix the invariant owner.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** PLANNING ONLY — NEVER implement or execute code; produce `plan.md` + per-phase files + `goal.md` Goal Contract, then hand off — why: this skill's contract is a plan, not a change.
**IMPORTANT MUST ATTENTION** default mode HARD — opt out to fast mode ONLY when ALL trivial-task conditions hold — why: skipping rigor on a non-trivial task costs more rework than rigor saves.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via `TaskCreate` BEFORE starting; add a final review todo; on context loss call `TaskList` first — never duplicate tasks.
**MANDATORY IMPORTANT MUST ATTENTION** bootstrap the Goal Contract (`goal.md` from `goal-contract-template.md`) BEFORE investigation; every phase success criterion maps to a saved goal criterion. Redact secrets.
- **MANDATORY IMPORTANT MUST ATTENTION** resolve the Applicability Preflight before Goal Contract/research and persist the exact branch-specific `## Plan Gate` in `plan.md`; downstream review/validation cannot waive a missing upstream artifact or owner approval.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — NEVER auto-decide because a task seems "obvious"; the user decides the next step.
**MANDATORY IMPORTANT MUST ATTENTION** every phase passes the 5-point granularity check ("Can I start coding RIGHT NOW?") — failing phases → sub-plan (max depth 3).
**MANDATORY IMPORTANT MUST ATTENTION** detect new tech/lib not in project → `TaskCreate` per lib → WebSearch top 3 → compare → recommend with confidence % → `AskUserQuestion` — why: an unvetted dependency is an irreversible decision exposed too early.
**MANDATORY IMPORTANT MUST ATTENTION** when the input names a spec, record `spec_baseline: [{path, blob}]` with `git hash-object -w -- <path>` before research, and route every requirement outside that baseline to `## Proposed additions (need approval)` via `AskUserQuestion` — never into a phase unapproved — why: scope anchored to the spec as supplied cannot grow silently when the spec is edited mid-run.
**MANDATORY IMPORTANT MUST ATTENTION** estimation is bottom-up — phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED, never the driver; UI cost usually dominates; emit full `estimate_reasoning` frontmatter.
**MANDATORY IMPORTANT MUST ATTENTION** every phase carries a derived `## Test Specifications` mapping from each functional requirement to the canonical owner-qualified scenario/case identity and variant rows allowed by the resolved profile, plus the actual/planned test executor and inspected assertion, or explicitly profile-approved manual-QC procedure and expected evidence/result; do not duplicate cases or invent IDs. A declared native `specArtifacts` profile supplies section roles, identifiers, ownership, and carriers; required project references may also establish the native contract. Honor only explicitly documented cardinality and verified mappings; unresolved ownership/cardinality is `UNKNOWN`/`BLOCKED`. Only when neither config nor required references declares a native profile, use the strict `TC-{FEATURE}-{NNN}` Section 8 default and one-TC-to-many-tests mapping. `/spec [mode=tests]` applies only to that strict-default branch; an explicit TDD-first gap may use `Evidence: TBD`.
**MANDATORY IMPORTANT MUST ATTENTION** for `.claude` skills/hooks/workflows/sync work, plans MUST include generated-mirror sync action or explicit no-sync evidence — why: a silently stale mirror diverges from source.
**MANDATORY IMPORTANT MUST ATTENTION** NEVER skip `/plan-review` after plan creation — run it standalone or as the workflow step; standalone `/plan` also appends `/changes-review` as a final task.
**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read target code BEFORE planning; cite `file:line`; run graph trace when `.code-graph/graph.db` exists — why: local conventions override generic framework defaults.
**MANDATORY IMPORTANT MUST ATTENTION** run the full main pipeline in order — pre-check plan → bootstrap `goal.md` → ONE research wave (`researcher` + `investigate` in one message) → barrier → codebase + conditional pattern-doc analysis → convention matrix → `planner` writes `plan.md` + `phase-XX` → parallelism pass (PAR/SEQ + write sets + `## Execution Waves`) → granularity self-check → mandatory final tasks; NEVER skip a triggered pattern doc or silently require a nonexistent example-code file — why: the skipped reference or invented convention is the one AI silently drops.
**MANDATORY IMPORTANT MUST ATTENTION** dispatch the research threads as ONE wave in ONE message (declare `Parallel plan:` first, one report path per agent) and synthesize only after EVERY member returns — why: dripping researchers one per turn serializes the cheapest-to-parallelize half of planning.
**MANDATORY IMPORTANT MUST ATTENTION** the emitted plan MUST carry parallelism metadata — every phase tagged `PAR`/`SEQ`, its write set declared, every `SEQ` naming the exact artifact it waits on, and `## Execution Waves` in `plan.md` — why: `/plan-execute` fans out only on what the plan declares, so an untagged plan silently forces sequential execution.
**MANDATORY IMPORTANT MUST ATTENTION** queue the final-task block on EVERY plan — profile-aware Test Specs per phase → `/plan-validate` → `/plan-review` (convergence loop, HARD 2-round cap with NO extension — round 2 still blocking escalates via `AskUserQuestion`, and a clean pass ends it once the persisted `minRounds` is met; every round's wave includes a parallel `/why-review` rationale sub-agent) → re-estimate vs finalized phases (flag `SHOULD-RESCOPE` when delta >50%).
**IMPORTANT MUST ATTENTION** `--mode={ci|cro}` only ADDS a domain reference load (`references/mode-ci.md` / `mode-cro.md`) + intake on top of the SAME engine, gate, and `planner` agent — default (no flag) runs the standard flow byte-for-byte; NEVER let a mode replace the engine or skip `/plan-review`.

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| "Task too simple to plan"          | Default mode HARD. Opt out ONLY when ALL trivial conditions hold.                        |
| "I already know the codebase"      | Show `file:line` from 3+ patterns + graph trace. No proof = not read.                    |
| "Phase is clear enough"            | Run the 5-point granularity check: "Can I start coding RIGHT NOW?" — else sub-plan.      |
| "Plan looks good, skip review"     | NEVER skip `/plan-review` — fresh eyes catch author blind spots.                         |
| "Only existing libs, skip the gate"| Prove it — grep manifests. Any new tech/lib → WebSearch + `AskUserQuestion` before approval. |
| "I'll just estimate SP directly"   | SP is DERIVED from bottom-up phase hours, never the driver. Σh/6 × productivity first.   |
| "It's a `.claude` change, no sync" | State the mirror action or explicit no-sync evidence — stale mirrors fail the oracle.    |
| "`--mode=ci`, so skip the normal flow" | Mode only ADDS a reference payload — same engine, same `/plan-review`, same `planner` agent. |
| "Plan's done, skip the final tasks"| Test Specs → `/plan-validate` → `/plan-review` (with its parallel `/why-review` rationale sub-agent) → re-estimate are MANDATORY, not optional. |
| "Phases feel sequential, skip the tags" | "Feels sequential" is not a dependency. Tag `PAR`/`SEQ`, declare write sets, and name the artifact each `SEQ` waits on. |
| "The executor can work the order out"  | It can't — `/plan-execute` fans out only on declared write sets. No tags = sequential execution you caused.        |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via TaskCreate.

**IMPORTANT MUST ATTENTION** PLANNING ONLY — never implement; cite `file:line` evidence (confidence >80% to act); NEVER skip `/plan-review` and the New Tech/Lib + Goal-Contract gates.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
