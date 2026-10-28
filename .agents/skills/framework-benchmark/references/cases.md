# Case contract and task selection

Read when choosing a preset or authoring a consumer-project experiment. Case files are trusted experiment definitions, not instructions returned by the solver. Review their check programs and intended data exposure before execution.

## Selecting the task

Use the consumer's actual architecture and tests. Choose work large enough to require several connected decisions, with observable acceptance, regressions and meaningful boundaries. Examples include a cross-module feature, complex stateful refactor, or a complete fictional product. Avoid task difficulty manufactured by ambiguous requirements or hidden filename assumptions. Put all behavior needed to satisfy the task in the shared prompt.

The bundled dependency-planner cases provide deterministic examples of greenfield creation, feature implementation, plan-plus-implementation and behavior-preserving refactoring. They cover dependency closure/order, invalid data, atomic rejected edits, input/output ownership and bounded graph sizes. They are small harness examples and cannot establish real-project effectiveness. Consumer cases should exercise their own genuinely complex work.

## Manifest

Start from `assets/consumer-case.example.json`. Required fields:

| Field | Meaning |
|---|---|
| schemaVersion | `1` |
| id | Stable lowercase letters/digits/hyphens identity |
| kind | `greenfield`, `feature`, `plan-implement`, `refactor`, `plan`, `decision` or `review` |
| projectMode | `greenfield`, `brownfield-bootstrap` or `brownfield-configured` |
| prompt | Exact shared brief; include expected public interfaces and boundary decisions |
| treatment | Framework task-skill/workflow instruction; the runner adds the mode's setup instruction |
| expectedSkills | Required successful task-skill engagement receipts; setup requirements are added automatically |
| checksDir | Contained relative directory of frozen check programs |
| checks | 2–32 unique named acceptance/regression check commands with literal argv, timeout and expected baseline pass/fail |

`fixture` selects a contained case-relative source directory when neither `--project` nor `--template` is supplied. Greenfield may omit it for an empty source. `--project` uses a committed Git snapshot at `ref` (default `HEAD`), excluding local edits, history, submodules and symlinks. `--template` uses a verified reusable brownfield input from the template owner; it conflicts with `--project` and is unavailable for greenfield. Read [complex-corpus.md](complex-corpus.md) when preparing one. The selected installation's portability declaration/default resolves the config owner, including a fallback framework for greenfield. `projectConfigPath`, when supplied, must agree with that native owner; preparation rejects conflicts before model execution. Reference roots come from the source configuration. Configured mode requires valid existing setup and reference docs; bootstrap intentionally withholds setup and measures regeneration.

Optional `qualification` freezes `rationale`, unique `areas` (at least3), `decisions` (at least2), `risks` (at least4) and `evidence` (at least1). Each list admits at most32 nonempty strings of at most2,000 characters; rationale is at most4,000 characters. These fields make the maintainer's complexity reasoning reviewable; passing structural validation does not prove difficulty or representativeness. Qualified cases require skilled assessment. Use the qualification process in [complex-corpus.md](complex-corpus.md), not filler lists to meet the schema.

New preparations default `assessment` to `{"profile":"skilled-v1","maxPasses":3,"skills":["code-quality-review","integration-test"]}` for implementation artifacts. Plan, decision and review kinds default to `why-review`; the selected role is architect for planning and decision artifacts and code-reviewer otherwise. The eight criteria keep their identities but use artifact-appropriate meaning. An explicit skilled policy permits2–3 passes and1–8 unique existing skill names; unsupported capabilities fail rather than silently downgrade. Every discovery pass is followed by fresh `why-review --validate-findings`; a third pass is only for new consequential claims. Rejected/unresolved claims and new unvalidated LOWs remain separately visible. Explicit `{"profile":"legacy"}` selects historical single-pass mechanics; a saved case without this field retains that old interpretation. Legacy is not qualified complex assessment.

Case/runtime declarations are closed to unsupported fields and schema revisions. Optional paths must be nonempty canonical contained paths; an explicit committed ref must be a nonempty string without a leading dash or control characters. Task kind and project mode must agree on greenfield. Case/check IDs are at most 80 characters. Each check retains its declared supported kind and baseline; an otherwise valid list containing only acceptance or only regression is rejected. Read [running.md](running.md) for native versus Docker runtime fields and limits.

Keep case/runtime/holdout/oracle material outside the source snapshot. Do not hide secrets in checked-in files. Preparation rejects known duplicated holdout bytes in solver inputs, but cannot prove a different copy or paraphrased answer does not leak. The case author owns that audit. The benchmark's bundled case directory is excluded from delivered framework packages.

## Independent checks

Each check supplies `id`, `kind` (`acceptance` or `regression`), `baseline` (`pass` or `fail`), `argv` and `timeoutMs`. There must be at least one acceptance and one regression check; regression baseline must pass. Use commands available in the selected runtime, for example `['node', '/checks/acceptance.cjs']`. Docker exposes candidate work under `/workspace` and frozen checks under `/checks`; native execution maps those literal argv paths and supplies `BENCH_WORKSPACE` for scripts to locate the fresh candidate worktree. Write check programs against that variable, falling back to `/workspace` for containers. Programs must not assume a particular host path or access the original checkout. Explicit offline dependency setup is allowed before testing.

Checks must fail for a real violated intent. Cover happy, invalid, boundary and regression states and properties/metamorphic cases where warranted. Acceptance for a new feature should initially fail for the missing capability; a refactor's preservation checks can initially pass. Calibration rejects unexpected baseline outcomes and execution failures before a solver is launched. Exit zero is pass, nonzero is failed work, and launch/timeout/infrastructure-reserved failures remain invalid grading evidence. Never weaken checks to obtain a positive framework delta.

To evaluate agent-authored tests, include a frozen check program that discovers and runs the candidate's intended test suite, with a nonempty actual-case assertion. File-level runner success alone may count zero registered cases. The bundled checks preserve native main-file execution, require normal process/reporting completion and aggregate non-skipped, non-todo native passes; empty files alongside actual passing tests remain valid. Keep that result distinct from held-out acceptance/regression checks. The neutral reviewer assesses intent, independence, coverage and assertion strength; passing authored tests alone proves none of those.

A separate journey observer reads the public execution trace after each attempt, using the same chronological/eight-aspect contract for both arms. It does not execute or follow instructions embedded in the trace and never feeds back to the solver. Its cited story, coverage limits and overhead are independent from the anonymous end-product grader. Author a brief that permits routine autonomous decisions when intended, so workflow questions do not become an undeclared treatment; preserve genuine permission boundaries.

The eight review criteria are fixed independently of the candidate. Local admission requires every score in 0–4, no unsupported output or score names, an array of at most 50 findings, supported finding severities, and nonempty evidence/consequence text up to 2,000 characters. These bounds supplement the provider schema; valid-looking citations cannot bypass them. Missing criteria or mismatched assessor identity/completion/integrity remain ungraded.

## Treatment and interpretation

Greenfield automatically requires observed `workflow-greenfield-init`; brownfield-bootstrap requires `project-init` before the task skill(s). Configured consumers retain their frozen project setup. The application baseline excludes all known agent instruction surfaces and resolved framework setup roots. The treatment measures setup/config/reference docs plus skills/hooks/workflows, including their overhead. Native personal and ancestor guidance/hooks are also excluded; worktrees alone do not disable them.

Record skill availability, successful engagement, workflow-gate evidence and delivered task success separately. Claude requires a matching successful skill invocation result; Codex requires complete matching content from successful native skill-file reads; a prefix-only or failed read is insufficient. Do not invent Claude-style events for Codex or infer all workflow gates from either load receipt. Counterbalanced repeats are one attempt each, not best-of selection. For broad comparisons, use distinct tasks and held-out variants across project modes, report every campaign, and aggregate by task rather than treating all repeats as independent projects.

Keep trusted verifier assertions outside the interpreter executing candidate code. Use bounded subprocess/response or equivalent public-service checks; missing, malformed or prematurely ended responses fail. Readonly check files alone do not prevent an imported candidate from exiting the checker. The bundled planner probe demonstrates this boundary. Custom check authors own equivalent oracle correctness.

Runtime integrity compares final immutable file bytes and native control membership, including unexported local overrides. This is final-snapshot evidence, not continuous or cryptographic attestation against a malicious solver. Native tasks, candidate code and checks must be trusted: worktrees and withheld input delivery do not prevent hostile code from reading outside its workspace. Use the optional container backend when its stronger boundary is needed.

Freeze configuration and reference-document owner paths before a campaign. Existing consumers derive them from their committed setup; generated setup uses those declared/default owners. Choose a case brief compatible with those owners rather than silently relocating them mid-trial. Project context may sit beside framework files, but cannot claim immutable skill/hook/config controls as its own mutable root.
