# Complex task and reusable corpus qualification

Read when the benchmark must expose effects on substantial work, when choosing a public project, or when preparing reusable raw/configured archives. Qualify before either solver answer; retain failed controls and opposing results. A complex repository, long prompt or long execution alone does not make a discriminating task.

## Contents

- [Choose a task that requires connected decisions](#choose-a-task-that-requires-connected-decisions)
- [Research a public brownfield project](#research-a-public-brownfield-project)
- [Prepare reusable source and context](#prepare-reusable-source-and-context)
- [Calibrate checks and reviewers](#calibrate-checks-and-reviewers)
- [Run and interpret qualified comparisons](#run-and-interpret-qualified-comparisons)
- [Closing reminders](#closing-reminders)

## Choose a task that requires connected decisions

Start from a user outcome and realistic failure consequences. Qualify the task with repository evidence, not a desired framework win:

- Identify interacting ownership/lifecycle, validation, permission, persistence, recovery and interface concerns that cannot be solved independently. Choose enough of them to expose planning and integration mistakes within the finite budget.
- Name consequential alternatives and their tradeoffs. Give both arms every externally required behavior; accept different designs that meet it. Ambiguous requirements, undocumented upstream APIs and hidden architecture preferences manufacture difficulty rather than measure quality.
- Identify failure risks and observable edge cases: partial effects, duplicate/replayed requests, stale state, revoked access, bounded data growth, interrupted recovery, invalid inputs and preserved legacy behavior where applicable.
- Establish a working native toolchain and a passing nonempty regression scope. Prove missing feature acceptance fails for the intended reason, while a known satisfying control passes. For a refactor, characterize healthy behavior before either attempt.
- Judge practical feasibility against the frozen time/action budget before answers. A task where both arms only scaffold is weak efficacy evidence. Do not tune the brief or choose the more favorable result after seeing answers.

Record the pre-answer rationale, interacting areas, decisions, risks and evidence in the optional case `qualification` field described in [cases.md](cases.md). Its shape is validated; its substance needs inspection. Keep qualification notes, oracles and control expectations outside solver/setup inputs. A saturating small pilot is useful harness evidence and a reason to select a new frozen case, never a reason to erase the pilot.

Useful task families include a cross-module feature with atomic/recovery behavior, an observable-behavior-preserving refactor, a researched plan, an architecture decision under real constraints, or a review containing both real defects and plausible non-defects. Pure plan/decision/review kinds keep common source/docs and a checkable deliverable contract; their rubric evaluates feasibility, alternatives, preserved promises and falsifiable verification rather than requiring code that was never requested. Use distinct tasks to study individual valuable skills; the whole-framework experiment alone cannot identify which skill caused an effect.

For greenfield, choose a coherent future product with a bounded MVP. For example, an assurance-review service could include workspace ownership, versioned questionnaires, draft/submitted/reopened responses, reviewer permissions, immutable submission history, safe attachment metadata and a usable operator journey. Specify a small complete vertical slice with durable state and recovery; leave billing, real external identity and distributed infrastructure outside the MVP unless central to the hypothesis. Let the framework's greenfield workflow research, brainstorm, choose a stack and architecture, plan and scaffold before completing the shared brief. Freeze observable contracts and any warranted UI/UX criteria without selecting a hidden preferred stack. A UI benefit needs runtime interaction, state/accessibility checks and inspected visual evidence, not file presence.

## Research a public brownfield project

Prefer a mature, permissively reusable project whose source, tests and toolchain fit the available host. Resolve current facts from primary upstream sources, then pin an exact source revision. Compare realistic alternatives; native SQLite support may make a large project practical without a service fleet, but a small local quickstart does not prove the contribution/test environment works.

Retain repository URL, exact commit/tag relationship, source and archive hashes, root/embedded notices, declared/runtime dependency versions and a resolved dependency freeze. Read the license requirements and keep notices; a root license is not a complete third-party inventory. Do not publish or claim upstream endorsement. Reject unsupported links/submodules or over-budget snapshots; do not silently drop application files to fit.

The bundled [Wagtail recipe](../cases/corpus/wagtail-7.2.1.json) is one pinned example. Its [versioned contributor guide](https://docs.wagtail.org/en/v7.2.1/contributing/developing.html), [source manifest](https://github.com/wagtail/wagtail/blob/ea118e70f73a8e16c52433cece793f04661e51f8/pyproject.toml), [CI matrix](https://github.com/wagtail/wagtail/blob/ea118e70f73a8e16c52433cece793f04661e51f8/.github/workflows/test.yml) and [license](https://github.com/wagtail/wagtail/blob/ea118e70f73a8e16c52433cece793f04661e51f8/LICENSE) locate the qualification evidence. The recipe's focused tests are regression characterization, not full CI, browser/build coverage or a promised test count. Inspect the exact selected task against that pinned source. Existing best-effort import behavior can be intentional: an opt-in atomic import is a new feature, not proof the legacy path is buggy.

A useful brownfield feature candidate is an opt-in strict import spanning administrator and command-line entry points, shared validation, atomic effects, dry-run/audit and recoverable error outcomes while retaining existing import behavior. Another is preview/confirm asset transfer with current-permission and stale-selection checks. State bounds, public error outcomes and migration/non-goals before authoring holdouts. These examples guide task selection; they are not required solutions or already qualified cases.

## Prepare reusable source and context

The template helper uses Node18+ built-ins and Git; generic configuration additionally uses the installed authenticated native CLI. Probe those and the recipe's actual baseline command toolchain first. Provision the consumer through its supported setup in an owned environment; both arms and checks must resolve the same verified runtime. Do not archive virtual environments, caches, databases or account profiles. A dependency freeze with reconstruction instructions is portable; a host's environment directory is not.

Commands below are identical in PowerShell and POSIX shells. Replace returned paths and explicit runtime settings with actual inputs:

```text
node .claude/skills/framework-benchmark/scripts/templates.cjs fetch --recipe .claude/skills/framework-benchmark/cases/corpus/wagtail-7.2.1.json --out tmp/benchmark-templates
node .claude/skills/framework-benchmark/scripts/templates.cjs configure --template tmp/benchmark-templates/template-ACTUAL_ID --runtime tmp/benchmark/runtime.json
node .claude/skills/framework-benchmark/scripts/benchmark.cjs prepare --case tmp/benchmark/bootstrap.json --template tmp/benchmark-templates/template-ACTUAL_ID --runtime tmp/benchmark/runtime.json
node .claude/skills/framework-benchmark/scripts/benchmark.cjs prepare --case tmp/benchmark/configured.json --template tmp/benchmark-templates/template-ACTUAL_ID --runtime tmp/benchmark/runtime.json
```

`fetch` pins public HTTPS source without inference, records source/license/exclusion provenance, neutralizes known upstream agent/setup instruction surfaces equally and retains raw source plus archives. Ordinary documentation and application tests remain common. It rejects unsupported paths and refuses overwriting archive destinations. Known file exclusions are disclosed; they are not a general secret scanner. Keep an independently obtained pristine upstream archive when exact upstream distribution bytes matter: the helper's `upstream.zip` is a Git-content snapshot with known secret/disposable exclusions, not the original distribution archive.

`configure` first executes the declared baseline in fresh source work. Exit zero is command evidence; independently inspect actual nonempty discovery and applicable assertions. It then makes one fresh generic framework setup attempt through project-init, project-config, scan-all and context refresh. That session receives no future task, holdout or expected answer. Source can be researched before setup; research/task artifacts must never enter its inputs. Configuration must preserve application and ordinary-doc bytes, successfully load required setup skills and produce valid context at frozen owners. Once configuration is reserved, early filesystem/preflight failures and later setup failures retain one failed attempt with observed total time and any available usage; missing values remain null. No automatic second setup attempt follows a failure; retain it and fetch a new template if a materially changed preparation is warranted.

The retained `configuration.wallMs` measures the entire reserved preparation, including baseline/setup/packaging/cleanup; `solverWallMs` is only the inference subset when observed. Keep absent token/cost values null. Inspect `configuration.inputCleanup`: only the input directory exclusively created by this invocation is removable. A pre-existing directory stays intact; a failed owned removal records its exact relative path and error and prevents a verified configured result. Preserve that work and the receipts before bounded recovery.

Retain `template.json`, `exclusions.json`, baseline/configuration observations, archive receipts, `raw/`, `configured/` and the ZIP files as one owned local template bundle. Reuse verifies each archive's actual byte length and hash against both its retained receipt and manifest source identity; substitution or a changed sidecar rejects reuse. Archive identity reads use bounded chunks within a 512 MiB archive envelope, separate from the smaller application snapshot limits. Inspect source hashes and archive round-trip contents before sharing or reusing a bundle. Extraction of a transported ZIP needs a bounded safe extractor and verification against its manifest; this helper does not import arbitrary remote ZIPs. A selected unpacked configured project can also be used through the ordinary committed-consumer route. Neither local packaging nor the benchmark skill publishes a template to a remote platform.

Bootstrap consumes neutral raw input and pays setup inside its solver attempt. Configured mode consumes the once-prepared context and reports the generic preparation investment separately. For existing consumer snapshots, historical setup investment is unknown unless independently supplied; do not invent it. Show any amortization as an explicit scenario over a declared number of future tasks, never free setup or a measured saving. Preserve the original project and collect evidence before exact owned cleanup.

## Calibrate checks and reviewers

Author task checks independently, outside source/setup inputs. Validate both directions: healthy work passes and a known violated promise fails. Run regressions on unmodified upstream. Acceptance must fail baseline because the feature is missing, not because dependencies or the oracle are broken. For planning, decision and review artifacts, combine artifact contract checks with a domain-aware semantic assessment; heading counts cannot prove decision quality. Document what each check can and cannot detect.

New preparations freeze the same neutral reviewer toolkit for both arms. It supplies canonical role/skill text and full shared review protocols without solver setup, personal guidance, automatic framework hooks or arm labels. A code artifact receives the code reviewer and test-quality route; a plan/decision receives architect/why-review. Successful native role and skill reads/invocations prove engagement only. Reviewer reports and bounded diagnostic checks are allowed under normal native permissions; candidate/toolkit bytes are checked after execution. This is final-snapshot evidence, not hostile-code containment or permission to edit and revert work.

Use known-defective and matched healthy control artifacts with a prepared run before either solver answer:

```text
node .claude/skills/framework-benchmark/scripts/benchmark.cjs assess-control --run tmp/framework-benchmark/run-ACTUAL_ID --candidate tmp/controls/artifact-A --out tmp/controls/results
node .claude/skills/framework-benchmark/scripts/benchmark.cjs assess-control --run tmp/framework-benchmark/run-ACTUAL_ID --candidate tmp/controls/artifact-B --out tmp/controls/results
```

The command supplies anonymous application content and the frozen task/rubric/toolkit, with no solver or known check outcomes; expected verdicts stay in the maintainer's separate control ledger. It does not mark a campaign attempted, run solvers, repair artifacts or automatically declare calibration passed. Inspect the entire discovery/validation chain, not just a score. Compare detected causes, severity, rejected plausible false positives and missed defects with the pre-recorded expectations. Calibrate each materially different artifact/task family; one tiny successful control does not prove the reviewer can assess a complex project.

Default assessment is a fresh discovery plus fresh why-review findings validation, including when discovery reports no findings. Every earlier claim gets a confirmed/rejected/unresolved decision. Distinct causes may combine duplicate manifestations. A third fresh pass only validates new consequential claims. Missing identity, capability, integrity or required decisions; unresolved consequential claims; or new consequential claims at the cap leave the assessment ungraded. Newly introduced LOW claims remain explicitly unvalidated. No candidate repair or solver feedback occurs in this chain.

Require controls to catch the intended consequential defect without inventing a corresponding healthy defect, and review disagreements against real source/callers/tests. If a control fails, retain that result, investigate whether the control, expectation, prompt, environment or assessor is wrong, and correct only before a fresh campaign freeze. Never patch controls after solver answers to favor an arm. Model agreement and existing citations are not ground truth; retain human/domain-expert calibration needs and same-family bias. Control sessions, template setup and journey observers have separate resource accounting.

## Run and interpret qualified comparisons

Freeze task, source, complete setup, control code, independent checks, reviewer toolkit, models/runtime and limits before solvers. Use one declared attempt per arm, counterbalanced order and serial measured solver work; keep failures/non-engagement and invalid evidence visible. With default skilled review, each arm has one solver, one journey observer and two quality sessions, with a possible third quality session. Budget every possible stage before launch; no unbounded review panel or favorable retries.

Retain artifacts, command-level results, nonempty candidate-test outcomes, validated distinct issue counts/severities, rejected/unresolved claims, per-criterion scores/rationales, every assessor pass and full public execution stories. Describe actual context use, planning, decisions, review and recovery with cited coverage; never infer hidden reasoning, helper launches or workflow completion from a skill load. Keep solver quality, process fidelity and evaluator reliability separate.

Interpret raw wins, ties and framework wins with one evidence bar. A longer process may waste time; a short process may miss crucial states; either may produce better work. Small correlated pairs support scoped descriptive results, not universal superiority or causal attribution to one skill. A follow-up task or skill ablation needs new frozen inputs and retained prior evidence. Read [methodology.md](methodology.md) when synthesizing conclusions and [running.md](running.md) for stage artifacts, nullable telemetry, compatibility limits and exact cleanup.

## Closing reminders

Qualify realistic complexity before answers; calibrate both check and reviewer directions; use equally capable independent reviewers without candidate repair. Keep source/setup and expected answers separate, count setup/evaluator overhead honestly, retain unfavorable outcomes and preserve original work before owned cleanup.
