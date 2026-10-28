---
name: framework-benchmark
description: '[Quality] Use when benchmarking framework skills, hooks, workflows and project setup against raw implementation on matched greenfield or existing-project tasks, with independent quality review and time/token/cost reports.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. When a workflow step or another skill names a skill, read that file in full yourself (every line, with no line limit; in parts only when output is cut off): a skill whose implicit invocation is off is never loaded for you. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
# Framework Benchmark

## Quick Summary

**Goal:** Measure whether the framework earns its cost on the selected tasks.

**Summary:** Choose the project mode, freeze inputs/checks and runtime, execute paired isolated attempts, retain their observable journeys, assess work independently, then report outcomes, resource use and limits.

**Workflow:** qualify → prepare and calibrate → run → independently review and validate → report → compare across tasks.

**Key Rules:** Freeze the same brief, application baseline, backend, CLI version, requested models and limits; compare raw execution with the complete framework treatment, then run independent checks and anonymous reviewer sessions.

Default to an available logged-in Claude Code or Codex CLI on the host. Native mode uses trusted task/code and normal CLI permissions; worktrees isolate source/context, not hostile code. Keep holdouts out of solver inputs and unknown measurements explicit. Docker remains an optional stronger execution boundary.

## Scope and project modes

Default to prepare → run → report when a trusted runtime and authorized finite budget are available. `--mode=prepare` prepares only; `--mode=report` reads a saved run. Missing capability or a failed gate remains incomplete evidence.

Choose the starting state from project evidence:

- **Greenfield:** a fictional brief and empty application baseline. The treatment starts with `workflow-greenfield-init`, including setup, planning and scaffolding, and continues through the implementation required by the brief.
- **Brownfield bootstrap:** existing code without supplied framework setup. The treatment first runs `project-init`, creates project config/reference docs from the code, then uses the task skill/workflow.
- **Brownfield configured:** the consumer's committed application, framework installation, project config and reference docs. The treatment uses that whole setup. Raw receives the application and ordinary docs, with framework instructions/config/reference docs removed.

This measures the whole package, not an individual skill's causal contribution. Setup time and reported usage belong to the treatment. Do not donate framework setup artifacts to raw execution.

## Prepare the experiment

1. Track the campaign and read the consumer's selected project references. Read [references/cases.md](references/cases.md) when selecting or authoring a task and frozen checks; read [references/methodology.md](references/methodology.md) before selecting comparison/review criteria or interpreting results.
2. For a consumer project, inspect manifests, architecture, tests and the chosen committed revision. Author a realistic complex feature, plan-plus-implementation, refactor, plan, decision or review task outside its source snapshot. Use `--project` to snapshot that checkout. Disclose excluded local edits; preserve the original checkout.
3. With no consumer task, read [references/complex-corpus.md](references/complex-corpus.md) to research and qualify a pinned public project or a coherent future-product MVP. Its template commands retain neutral source and a once-prepared generic configured version. Small cases under `cases/dependency-planner/` are harness examples; use them for shakedown, never as representative complex-project evidence.
4. Freeze independent acceptance/regression checks before seeing either answer. Cover the task's invalid inputs, state boundaries, atomicity, ownership, regressions and warranted scale. Accept every solution satisfying the brief; do not encode a preferred hidden design.
5. Read [references/running.md](references/running.md) for native account/runtime selection, optional Docker and portable commands. Use the installed authenticated CLI by default; preparation resolves its installed version and requested models before sealing. Use `assets/consumer-case.example.json` only as a scaffold, replacing its prompt and writing real checks. Explicit native settings start from `assets/runtime.example.json`; Docker settings use `assets/runtime.docker.example.json`. Probe the selected capabilities; never invent a version, model, image digest or credential.
6. Prepare under the consuming project's `tmp/` or `temp/`. Inspect hashes, mode, excluded context paths, complexity declaration, assessment profile and configured campaign budget. Preparation makes no model call. Before solver answers, qualify check sensitivity and run known-defect/healthy reviewer controls through `assess-control`; keep expected judgments outside assessor input and retain disagreements. Read [references/complex-corpus.md](references/complex-corpus.md) for the qualification and calibration exit conditions.

## Execute and independently grade

Run the prepared campaign through `scripts/benchmark.cjs run`. Native execution uses fresh login-only profiles and owned worktrees from a synthetic frozen-input repository; optional Docker uses fresh Linux containers from a pinned image. Personal guidance/hooks and the current conversation are excluded from the control. A successful skill-use receipt proves engagement, not every workflow gate.

The runner calibrates baseline checks, counterbalances repeated pairs, makes one attempt per arm, captures provider telemetry and runs frozen checks on fresh candidate copies. New preparations default to equally equipped native reviewers: artifact review, then fresh independent claim validation, with at most one further fresh pass to validate new consequential claims. Reviewers load the frozen appropriate role and skills, keep application/toolkit bytes unchanged, and retain bounded public reports and traces. Inspect confirmed distinct causes, rejected/unresolved claims, all criterion rationales and per-pass overhead; missing capability or evidence stays ungraded. Saved legacy single-pass results remain readable under their older contract. Skilled assessment currently requires native execution; optional Docker uses an explicitly selected legacy assessment.

A separate fresh read-only journey observer describes every attempt after execution. It reads the public trace; outcome reviewers never receive that trace, solver conversation or arm labels. Grade correctness, regression safety, edge cases, test quality, solution design, maintainability, security and scope with real artifact evidence. For plan/decision/review tasks, interpret these criteria against the requested deliverable, without demanding an unrequested implementation or preferred architecture.

Retain failures, timeouts and non-engagement in the denominator when runtime identity is known. Distinguish invalid infrastructure from failed work. Do not repair a task, retry only the weaker arm, or tune the framework mid-campaign. Changed case/framework/runtime inputs require a fresh run; retain previous evidence. Never replay an attempted run.

## Report and stop

Return report, result, full assessment/pass artifacts and detailed journey paths, starting-state mode, task qualification/coverage, passed/failed/invalid attempts, independent scores and validated/rejected/unresolved claims, elapsed time, input/output/cache tokens, reported cost, evaluator overhead and cleanup outcomes. Report reusable generic setup investment separately; bootstrap setup stays inside its solver's work. Native subscription charges remain unknown when unavailable; an API-equivalent estimate is not the bill. Preserve unknown observed model identities and identify actual compatibility tested. A prepared or mechanically tested harness is not a measured framework win.

Retain candidate/setup artifacts, public execution traces and stage observations before exact owned-worktree cleanup. Preserve the original checkout, unrelated work and saved results. Inspect remaining owned resources after interruption; never use broad cleanup to manufacture a clean result.

Explain both execution stories as well as their results: what was planned, what visibly ran, context/skill/workflow evidence, implementation changes, test commands and reported outcomes, review/delegation, errors/recovery, repeated work and remaining gaps. Follow the evidence coverage and citation rules in [references/running.md](references/running.md). Never infer hidden thoughts, completed workflow gates from skill loads, or causal benefit from a longer story. Keep observer usage/time separate from solver and blinded grading.

Within-task repeats probe variability; broader conclusions require representative held-out tasks and calibrated reviewers. Show raw wins, ties and losses. After several runs (for example greenfield, bootstrap and configured, or several tasks in one consumer), run `scripts/benchmark.cjs compare` for the task-level verdict: it counts each task once, never pools different runtimes, and reports insufficient evidence until at least six tasks are decisive under an exact sign test. Read [references/methodology.md](references/methodology.md) before quoting that verdict. Recommend improvements from evidenced failures, without automatically modifying or publishing the framework.

On unavailable runtime, exhausted limits, interruption or invalid checks, retain the partial report and state the blocker. Complete useful independent work within existing authority; do not fabricate execution or ask routine questions when the user delegated those decisions.

## Closing Reminders

**Goal:** Measure whether the framework earns its cost. Prepare frozen cases → execute paired attempts → independently grade → report outcomes and limits.

Use trusted code for native execution; keep holdouts out of solver inputs and missing telemetry explicit. The treatment includes setup/config/reference docs, hooks and the workflow; greenfield starts through `workflow-greenfield-init`. Preserve the original checkout, retain unfavorable results and collect evidence before owned cleanup.
