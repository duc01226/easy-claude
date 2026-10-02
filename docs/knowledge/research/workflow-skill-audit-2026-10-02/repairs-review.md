# Static repair review

Session: /root/review_repairs
Scope: task delta versus baseline; unrelated concurrent edits excluded. No tests executed.

- [done] Inspect 21 repairs and consumer contracts.
- [done] Review checker, evaluation validator and regression fixtures.
- [done] Terminal finding validation and handoff prepared.

Single-tier framework change — no client/server seam, product UI, domain entity or service-event boundary.

## Per-issue static findings

No retained actionable findings. Each original issue was compared against its current canonical instruction, the baseline and relevant consumer contract.

| Original ID | Static assessment | Evidence |
| --- | --- | --- |
| P01 | Source-contract resolved | `.claude/skills/workflow-end/SKILL.md:36` |
| D1 | Source-contract resolved | `.claude/skills/plan/SKILL.md:74` |
| D2 | Source-contract resolved | `.claude/skills/scan/SKILL.md:94` |
| D3 | Source-contract resolved | `.claude/skills/design-spec/SKILL.md:146` |
| D4 | Source-contract resolved | `.claude/skills/docs-manager/references/mode-update.md:123` |
| D5 | Source-contract resolved | `.claude/skills/learn/SKILL.md:461` |
| D6 | Source-contract resolved | `.claude/skills/skill-creator/SKILL.md:53` |
| EX-01 | Source-contract resolved | `.claude/skills/demo-guide/SKILL.md:109` |
| RS-6 | Source-contract resolved | `.claude/skills/understand/SKILL.md:114` |
| EX-02 | Source-contract resolved | `.claude/skills/harness-setup/SKILL.md:135` |
| EX-03 | Source-contract resolved | `.claude/skills/scaffold/SKILL.md:47` |
| EX-04 | Source-contract resolved | `.claude/skills/integration-test/SKILL.md:218` |
| EX-05 | Source-contract resolved | `.claude/skills/integration-test/SKILL.md:146` |
| EX-06 | Source-contract resolved | `.claude/skills/linter-setup/SKILL.md:192` |
| EX-07 | Source-contract resolved | `.claude/skills/fix/references/target-logs.md:16` |
| EX-08 | Source-contract resolved | `.claude/skills/git-conflict-resolve/SKILL.md:153` |
| RS-1 | Source-contract resolved | `.claude/skills/knowledge-synthesis/SKILL.md:87` |
| RS-2 | Source-contract resolved | `.claude/skills/knowledge-review/SKILL.md:196` |
| RS-3 | Source-contract resolved | `.claude/skills/tech-stack-research/SKILL.md:87` |
| RS-4 | Source-contract resolved | `.claude/skills/performance-review/SKILL.md:260` |
| RS-5 | Source-contract resolved | `.claude/skills/watzup/SKILL.md:116` |

## Whole-delta assessment

Static review: no actionable correctness, authority, profile, portability or regression finding retained. This is a static review result, not a claim that tests pass or that agents obey the repaired prompts.

Read the exact baseline delta for all assigned canonical roots and selected references, the complete new report-evidence checker and fallback guide, four complete regression test files (505 lines), complete evaluation corpus/README/validator, pressure-testing-guide delta, GuidedWorkflow AC/BR/TC-GWF-042 clauses and content-presence changed assertion. Examined plan handoff against shared product-roadmap contract and mode-validate; closure against declared gate satisfiers and report ownership; research cleanup against repair/review consumer; Git continuation against caller review/commit authority. Excluded unrelated concurrently modified help/config surfaces and generated mirrors (parent synchronization gate).

### Executable surfaces

- `.claude/scripts/lib/review-report-evidence.cjs:15`: missing/invalid gate occurrence metadata, missing/outside report, unknown or timezone-free review/change times, stale review, optional target mismatch, rejected status and incomplete diagnostics fail acceptance. `main` bounds CLI input to 64 KiB and distinguishes BLOCKED (1) from malformed input (2). Existing receipts remain authoritative. Satisfier/provenance comes from the inspecting caller, explicitly documented rather than inferred authentic by the helper.
- `.claude/skills/workflow-end/references/review-report-evidence.md:40`: PASS is expressly supplied acceptance predicates, not authentication or an actual review. Manual host fallback enforces the same predicates. Diagnostic `architecture --mode=full` completion requires three faces and accepted report validation while preserving target FAIL.
- `.claude/skills/shared/skill-evals/validate.mjs:11`: corpus uniqueness/type/skill/rubric checks and paired metadata validation preserve failing results, reject baseline skill leakage/incomparable runtimes and require per-assertion evidence. No model invocation or effectiveness assertion is implied by successful validation.
- `.claude/scripts/codex/tests/skill-repairs-execution.test.mjs:89`: disposable Git fixtures exercise exact lint rejection, valid success, absent-gate false acceptance and unchanged unrelated HEAD/index. POSIX hook fixture explicitly skips on Windows; host-independent instruction assertions still apply. Bash diagnostics extract the actual source recipe, test success/failure and both output streams without modifying the manifest. Merge fixture stages resolution with HEAD and MERGE_HEAD preserved.

### Behavioral delta matrix

| Input state | Pre-repair | Current contract | Delta |
| --- | --- | --- | --- |
| Cited failed or stale review, no receipt | Log and close | Block close; retain pending gate | Fixed |
| Accepted current satisfying report, no receipt | Close; commit still needs receipt | Same close and commit authority, explicit normalized proof | Preserved |
| Complete architecture diagnostic with negative target verdict | Ambiguous generic report fallback | Finish validated report without claiming target PASS | Preserved/clarified — case beyond original failing-report trigger |
| Rejected synthesis followed by repair | Inputs deleted | Inputs retained through accepted review/closure | Fixed |
| Broken pre-commit gate with unrelated staged work | Real commit can succeed | Disposable probe detects absent gate; working history/index preserved | Fixed |
| Native case owner with non-default IDs | Some local default examples conflict | Declared roles/IDs/carriers remain authoritative | Fixed/clarified |

### Trade-off assessment

| Decision | Sacrifices | Gain / checkable metric | Who pays, when | Assessment | Material / approval |
| --- | --- | --- | --- | --- | --- |
| Canonical owner repairs plus regression fixtures | Added maintenance of focused fixtures | All 21 inconsistent producer/consumer contracts have mapped source evidence | Framework maintainers when changing these owners | WORTH IT | Authorized repair scope in user P3; no new product/public contract |
| Normalized report checker | Caller must inspect provenance; metadata checker alone is not authentication | Rejects documented verdict/freshness/target failures and complete diagnostic boundary | Closing agent at fallback time | WORTH IT | Restores authorized existing gate; no relaxed commit authority |
| Versioned external-runner corpus | Manual runner/reviewer work; sampled coverage only | Ten explicit activation/repair scenarios and comparable-record schema | Evaluation owner when running models | WORTH IT | Within authorized repair/assurance scope; no live-result or cost commitment |

## Terminal validation

Applied why-review `--validate-findings` terminal routine to the empty retained set and performed an additional reachability/authority/representation/failure-path sweep. No report defects or new supported actionable findings surfaced. No severity inflation, unrelated pre-existing defects or unsupported live-model claims added. Verdict: CLEAN (static report validation only).

Verification still pending with parent: execute new regressions, baseline/mutation RED proof, affected existing suites and generated-host parity. No tests, Git commands, source edits, model calls or mirror generation performed by this reviewer. Confidence: 95% for the reviewed static contract delta; dynamic outcomes unverified here. Next action: parent final verification gate.

## Follow-up static review — symlink CLI correction

Scope: only validator entry guard/import and directory alias regression; no tests executed. No actionable finding retained.

- `.claude/skills/shared/skill-evals/validate.mjs:2` and `:65` now reuse the installed shared `isInvokedAsScript` owner; resolved argv/module real paths match through directory aliases and Windows junctions. Relative import resolves inside the shipped framework; module imports still avoid running the CLI.
- `.claude/scripts/lib/project-root.cjs:117` canonicalizes both inputs with the same realpath owner and case-normalizes Windows; failure stays bounded/false.
- `.claude/scripts/codex/tests/skill-repairs-research.test.mjs:14` launches the real validator through a disposable directory alias, demands zero exit plus parsed case count (empty silent success fails), isolates environment/home/temp and cleans in finally. Only explicitly unsupported alias capability skips; unexpected failures are raised.

Preservation: ordinary direct CLI invocation, default module-relative corpus and imported validation functions retain their contracts. Terminal validation: CLEAN. Parent execution gate remains the proof of runtime success. Legacy Python test launcher availability is outside this two-hunk source scope.

## Follow-up static review — command-only help fixture reconciliation

Scope: `COMMAND_ONLY_UTILITIES` removes the retired `ck-help` name only. Current canonical filesystem contains `project-help/SKILL.md` and no `ck-help/SKILL.md`; the current skills catalog lists project-help among command-only utilities. The fixture still protects project-help and all other live command-only utilities against workflow/agent/hook activation.

Evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:182`, `:1838`; `.claude/docs/skills/README.md:256`; canonical skill inventory search. No coverage weakening for a live skill or new actionable issue. Prior CLEAN static assessment retained. No tests or source edits performed. Parent owns final execution proof.
