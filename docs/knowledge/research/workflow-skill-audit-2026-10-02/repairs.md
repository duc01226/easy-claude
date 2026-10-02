# Workflow skill repairs — 2026-10-02

All 21 retained audit findings have canonical repairs and regression coverage. The approved [plan](../../../../plans/261002-workflow-skill-repairs/plan.md) separates artifact, execution and research work, followed by consolidated static review and verification. Existing workspace changes were preserved; generated host mirrors are produced by the canonical sync pipeline. No project commit or push was performed.

## Fix Log

| Finding | Canonical repair | Regression evidence |
|---|---|---|
| P01 | workflow-end requires current accepted report evidence; diagnostic completion stays distinct from implementation convergence. Shared checker validates occurrence, report path, target and time. | skill-repairs-gates; GuidedWorkflow TC-GWF042 |
| D1 | plan emits the Plan Gate required by its validator. | skill-repairs-artifacts |
| D2 | scan summary and reminders match its conditional fresh-review predicate. | skill-repairs-artifacts |
| D3 | design-spec uses its documented output filename and native profile authority. | skill-repairs-artifacts |
| D4 | docs-manager forwards explicit changed_files into the impact mapper. | skill-repairs-artifacts |
| D5 | learn validates JSON structurally; Markdown enhancement applies only to its supported carrier. | skill-repairs-artifacts |
| D6 | skill-creator commands resolve existing scripts from the canonical framework root. | skill-repairs-artifacts |
| EX-01 | demo-guide selects program, large, medium and small tiers without shadowing. | skill-repairs-execution tier boundaries |
| EX-02 | harness-setup delegates applicability and mutation authority to the shared owner. | skill-repairs-execution |
| EX-03 | scaffold reuses only helpers matching the needed responsibility and contract. | skill-repairs-execution |
| EX-04 | integration-test preserves executing carrier identity instead of document-only renumbering. | skill-repairs-execution |
| EX-05 | integration-test defers polling, counts, layout and ledger rules to active profile authorities. | skill-repairs-execution |
| EX-06 | linter hook probes use isolated Git fixtures; actual staged work cannot be committed by verification. | skill-repairs-execution real fixture HEAD/index checks |
| EX-07 | fix log capture preserves producer exit status and stdout/stderr. | skill-repairs-execution actual Bash recipe exits 0/7 |
| EX-08 | conflict resolution preserves parent commit/PR authority. | skill-repairs-execution MERGE_HEAD/HEAD fixture |
| RS-1 | research evidence remains available throughout rejected-output repair and acceptance. | skill-repairs-research |
| RS-2 | knowledge-review removes irrelevant code/OOP duties. | skill-repairs-research |
| RS-3 | tech-stack-research scopes layers and search budgets to applicable project needs. | skill-repairs-research |
| RS-4 | performance-review preserves mixed-case grouped query rows. | skill-repairs-research |
| RS-5 | watzup requires correspondence evidence between changes and commits. | skill-repairs-research |
| RS-6 | understand dispatches larger scopes before smaller tiers. | skill-repairs-execution tier boundaries |

## Assurance and limits

Consolidated source/spec/rationale review is CLEAN. A snapshot of the pre-repair current tree provides the RED baseline: the four new suites report 20 failures, 12 passes. This demonstrates detection of original contracts; it is not a claim that every individual finding has an independent dynamic reproduction. Isolated checker mutations separately test rejection, freshness, occurrence membership, diagnostic coverage, target match and missing report handling.

A versioned evaluation corpus contains 10 activation, ambiguity and repair cases, with schema/results validation and a documented with/without-skill method. No live model evaluation, cross-host agent execution, token-cost comparison or browser penetration test was performed. Static instruction checks establish explicit contracts; they do not guarantee model compliance.

Final verification results are recorded below after the required runners finish. Six isolated checker mutants were killed (accepted-verdict bypass, stale-time bypass, occurrence bypass, missing-face bypass, target bypass and missing-report bypass); their unmodified control passed. Reinstating the old lexical evaluation CLI guard also fails the new directory-alias regression. Test prerequisites use a task-local Python virtual environment with the repository-declared PyYAML dependency. A stale removed-help-skill fixture and documentation counts were reconciled with the current tree, without reverting concurrent framework changes.

## Supporting reports

- [Artifact repairs](repairs-artifacts.md)
- [Execution repairs](repairs-execution.md)
- [Research repairs](repairs-research.md)
- [Static review](repairs-review.md)

## Verification results

- New repair regressions: **32 passed, 0 failed, 0 skipped** (Node built-in runner).
- Baseline RED: **20 failed, 12 passed**, expected nonzero exit against the pre-repair snapshot.
- Mutation proof: unmodified gate control passes; **6/6 checker mutants** and **1/1 lexical CLI guard mutant** fail the corresponding regressions.
- Canonical Codex pipeline: **19/19 stages passed**, including tooling/script tests, hook gates, workflow/protocol/spec compliance, provenance and divergence verification.
- OpenCode handoff: **9/9 stages passed**.
- Corpus validator: **10 cases valid, 0 model pairs; model evaluation not run**.
- Full hook suite: **1,354 passed, 0 failed, 6 skipped** (1,360 discovered), exit0. Existing explicit platform/environment skips remain visible; no failure was converted into a skip.

Raw diagnostic logs and temporary fixtures remain under `tmp/workflow-skill-repairs/`. Initial unsuccessful runs are preserved: one CLI symlink bug was repaired; task-local PyYAML resolved environment failures; removed-help-skill and document-count fixtures were reconciled. No passing result is inferred from those failed runs.

## Follow-up why-review fix loop

Round1 retained two MEDIUM assurance findings, validated in a terminal pass: inherited shell/Git/provider inputs contaminated execution fixtures, and incompatible baseline-root units produced missing-file failures in the earlier aggregate RED evidence. Both were repaired in `skill-repairs-execution.test.mjs`: allowlist OS/executable essentials, own fixture settings, explicitly test inherited-key exclusion, and use the installed `.claude` root consistently.

Round2 fresh inline full review retained zero findings. Current32/32 regressions pass with a hostile Bash startup file and synthetic provider/workflow settings. Corrected semantic baseline:20 failures/12passes; no ENOENT, missing-module or syntax infrastructure failures. Earlier RED output is retained as invalid for execution-path proof, superseded by `tmp/workflow-skill-why-review/baseline-semantic-red.tap`. Static instruction tests still do not establish model compliance. Final checks after the correction passed:15/15 Codex verify stages,5/5 OpenCode verify stages and1,354 hook tests (0failed,6explicit skips), all exit0. Provider/workflow settings were synthetically set for the isolation run. The fix loop converged in two rounds (2MEDIUM ->0 findings).

Review reports: `tmp/reports/why-review-skill-repairs-round1.md`, `why-review-validate-skill-repairs-round1.md`, `why-review-skill-repairs-round2.md`. No full-changeset receipt issued because the target excludes concurrent unrelated work. No commits or pushes.
