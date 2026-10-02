# Workflow skill audit — execution and supplementary closure

Read-only audit of the current working tree, 2026-10-02. Basis: `docs/knowledge/research/ai-agent-skills-best-and-bad-practices.md`. Canonical `.claude` roots were inspected, not generated mirrors. No skill, script, workflow, spec or test was changed. File-convention lookups preceded scoped entrypoint reads. Scope: 14 directly configured execution skills and 10 supplementary/transitive-or-mentioned roots delegated by the parent reviewer. Ancillary references were checked structurally and inspected when necessary to resolve a finding; this is not an exhaustive source review of every bundled script.

## Retained findings — validated in-batch

All eight findings below survived the terminal `why-review --validate-findings` checks: reachable input/caller, current evidence, opposing interpretation, proportional severity, >=85% confidence, and reverse-premise check. Recommendations are routine consistency/safety repairs, not unconfirmed material product decisions. Spec-drift and executing-test follow-up are recorded as audit actions; no repair is claimed. `SPEC-STALE` here means a stale skill contract relative to its named owner, not an adjudication that an absent business-spec TC was updated.

### EX-01 — MEDIUM · 98% · Demo sizing shadows the large/program routes

`demo-guide/SKILL.md:109-117` says first match wins, but S2 (>=10 files OR >=2 capabilities/contexts) precedes S3 (>40 files) and S4 (whole product/multi-service). A 60-file demo takes S2; a multi-context product takes S2. The promised S3/S4 hierarchical gathering does not activate for these ordinary supported inputs. The same skill's decomposition contract at lines 123-125 requires bounded groups, so scale cannot simply be excused as an unrestricted inline transcript. Direct consumers include `.claude/workflows.json:446-447` and `661-662`. This is a dispatch defect even when the separate 2,000-line alternative permits groups larger than eight files; the issue does not rely on a hard 48-file ceiling.

Recommendation: select the most specific/largest tier first or make predicates mutually exclusive. Sacrifice: slightly more explicit selection logic; WORTH IT, nonmaterial. Drift: SPEC-STALE relative to the same skill's announced tier contract. Test action: table fixtures for 1, 9, 10, 41 and 60 files plus whole-product/multi-context requests must assert the selected tier and dispatch shape. No model success rate was measured.

### EX-02 — MEDIUM · 97% · Harness entrypoint mandates a tool its owner makes optional

`harness-setup/SKILL.md:24,135,270,278,292,296` repeatedly requires mutation-score/property gates. Its authoritative shared protocol, `.claude/skills/shared/protocols/harness-setup.md:12`, explicitly prohibits a universal mutation-score/property-tool/defect-seeding gate and allows assertion-intent, contract, focused mutation or other evidence chosen by stack and budget. `scaffold/SKILL.md:207` already implements that owner policy. Greenfield invokes harness setup after linter setup, so a small CLI or unsupported mutation-tool stack reaches contradictory completion requirements. The question about a mutation tool in line 135 does not resolve the later unconditional gate.

Recommendation: align summary, body and reminders to the shared profile-aware owner; retain meaningful outcome assertions and optional supported sensors. Sacrifice: less uniform tooling and score comparability; WORTH IT, nonmaterial because the owner already selects that policy. Drift: SPEC-STALE. Test action: no-mutation-tool/tiny-stack and supported-high-risk-stack fixtures must demonstrate alternate evidence vs a chosen sensor, not merely look for the word mutation.

### EX-03 — MEDIUM · 96% · Scaffold presence check skips missing foundations in another boundary

`scaffold/SKILL.md:38-47` scans broad Base/Helpers/Common/DI patterns and skips on any existing scaffolding. `.claude/workflows.json:213-221` activates this optional big-feature step when the codebase lacks abstractions *this feature needs* and skips only when existing abstractions cover it. A new service in a repo containing an unrelated Common helper hits the skill's skip branch, despite satisfying its workflow caller. The skill itself names new-service/module foundations at line 52. The anti-duplication intent is sound; mere repository-wide presence does not prove suitability or reuse.

Recommendation: inspect suitability within the planned boundary and record reused vs missing foundations before skipping. Sacrifice: an extra suitability read; WORTH IT, nonmaterial. Drift: SPEC-STALE relative to workflow applicability. Test action: mixed repository with a foundation in service A but missing service B's required boundary must proceed only for B; a genuinely reusable shared foundation must skip.

### EX-04 — MEDIUM · 98% · Collision recovery breaks the canonical ID-to-test join

`integration-test/SKILL.md:216-219` tells an unavoidable collision recovery to renumber the document only, preserve the test-spec annotation and add a note. Its review consumer, `references/mode-review.md:69-72`, joins owner/case/variant to the actual executor and inspected assertion. Renumbering only one join endpoint makes the preserved annotation point at an obsolete ID or another scenario. A prose note is not a configured annotation alias. Earlier collision avoidance is valuable but cannot make the explicitly supported recovery branch correct.

Recommendation: preserve identity or migrate canonical ID and configured carrier atomically; resolve ambiguity before claiming traceability. Sacrifice: touching the associated carrier and potentially coordinating concurrent work; WORTH IT, nonmaterial for a mechanical identity repair. Drift: SPEC-STALE relative to the matching traceability contract. Test action: collision fixture must resolve each canonical case to the intended executing assertion after recovery, preserving configured many-to-many mapping.

### EX-05 — MEDIUM · 97% · Integration-test's later hard rules contradict its current mode policy

`integration-test/SKILL.md:138-149` imposes domain-only organization, polling for every DB assertion without exception, and minimum three methods. Its new entry policy at `:63-80` follows project-native organization, deterministic synchronous boundaries, and risk-derived cases. `:358` also claims review Gate 1 requires a per-line Mutation Probe Ledger and denies PASS without one, whereas current `references/mode-review.md:46-57` grades protected intent and a concrete behavioral break, not a universal ledger. The current native-mode guidance is a genuine improvement, but does not remove later unconditional commands encountered by the authoring agent. A synchronous transaction boundary or non-CQRS test layout reaches mutually exclusive instructions and unnecessary generated apparatus.

Recommendation: give one mode/profile policy authority and remove obsolete universal recipes from body/examples/reminders; keep precise asynchronous proof where required. Sacrifice: a less rigid common recipe; WORTH IT, nonmaterial because current mode owners already specify the intended bar. Drift: SPEC-STALE. Test action: author/review handoff fixtures for synchronous and eventual-consistency boundaries and a native folder layout must agree on acceptance; do not test only regex presence of the new introduction.

### EX-06 — MEDIUM · 98% · Pre-commit verification can commit the intentional defect

`linter-setup/SKILL.md:192,246` requires adding a lint defect, attempting a commit and proving the hook blocks. It supplies no scratch repository/index, original-HEAD assertion, or cleanup contract. The exact failure under test is a missing/nonfunctional hook: that commit can then succeed, possibly including pre-existing staged work. `.claude/agents/git-manager.md:65-69` requires explicit operation/scope/sourceRequest and says implementation approval does not authorize commit. A user asking for tooling setup has not thereby requested a real project-history mutation. An unrelated review/authority hook blocking the commit would also be insufficient evidence that the new lint gate works.

Recommendation: test the actual pre-commit/lint path in an isolated fixture repository or reversible isolated index with explicit HEAD/index invariants and verify the lint-specific rejection. Sacrifice: fixture setup and fidelity maintenance; WORTH IT, nonmaterial. Drift: SPEC-STALE relative to Git authority plus test-evidence policy. Test action: both installed-hook and absent-hook fixtures must leave original repository HEAD/index unchanged, report the expected lint discriminator, and restore fixture content. No real commit was attempted during this audit.

### EX-07 — MEDIUM · 99% · Permanent tee logging hides failed command status

`fix/references/target-logs.md:16` requires permanently appending `2>&1 | tee logs.txt` to a project's script when no log exists. In a shell without pipefail, the pipeline returns tee's successful status when the producer fails, changing build/test/start semantics. A read-only probe, `zsh -c '(exit 7) 2>&1 | tee /dev/null'`, returned 0. Neither the recipe nor its entry dispatch supplies pipefail/producer-status handling. This is a concrete false-green path, not a preference for another logging style.

Recommendation: capture the diagnostic invocation externally while retaining the producer's status; if persistent logging is required, use and verify a stack-native wrapper that preserves errors. Sacrifice: shell/runtime-specific capture handling; WORTH IT, nonmaterial. Drift: SPEC-SILENT in this recipe concerning status preservation; the caller should add that invariant to its governing skill/test contract. Test action: a command exiting 7 must still yield nonzero through capture, while stdout/stderr appear in the log, and diagnostic capture must not rewrite the project command by default.

### EX-08 — MEDIUM · 97% · Conflict resolution commits before the caller's review gate

`git-conflict-resolve/SKILL.md:151-161` unconditionally completes a merge with raw `git commit`, and continues a rebase without the noninteractive editor handling supplied by its PR caller. `pull-request/SKILL.md:36,93,108,121,145` requires integration-merge conflict results to remain uncommitted, then whole-branch review and `commit` skill with an exact receipt; `commit/SKILL.md:479,482` declares that path authoritative. On a PR integration merge, the nested resolver commits before the owning caller can review/stage the intended candidate. With the enforcement hook this is a blocked handoff; without it the merge commit bypasses the described review boundary. The conflict skill's backups are useful but do not prove candidate review. Primary finding is merge completion, not whether every continuation command is invalid.

Recommendation: return resolved/staged state plus operation status to an owning caller; standalone operation completion must use the commit/review authority contract, with supported noninteractive continuation handling. Sacrifice: an explicit caller/standalone distinction and less self-contained resolver; WORTH IT, nonmaterial. Drift: SPEC-STALE relative to PR and commit consumers. Test action: isolated conflicted merge reached through PR flow must preserve original HEAD until review and the authorized commit; standalone completion and rebase interruption must emit accurate state and bounded recovery.

## Coverage table

All paths below resolve under `.claude/skills/<name>/SKILL.md`. **Reviewed** means entrypoint inspected and no additional retained issue, not a claim of flawless behavior or end-to-end model evaluation. **D** = exact skill named by a configured workflow sequence/variant. **S** = supplementary/transitive-or-mentioned closure, not an exact direct step in current workflows.json. Initial/reference coverage is substantive for defect paths; other ancillary files were structural/targeted.

| Skill | Class | Status | Evidence/checked concern |
|---|---|---|---|
| integration-test | D | EX-04, EX-05 | Entry profile/mode dispatch; patterns, current review, verify/fix-loop contracts; canonical carrier join |
| e2e-test | D | Reviewed | Mode dispatch, recorded scope/runner evidence, bounded verification, generated-test references |
| test | D | Reviewed | Config-derived runner, summary interpretation, failures delegated to debugger; no success inferred from prose |
| fix | D | EX-07 | Root approval/root-cause dispatch; targets types/ci/logs/test/ui inspected; tee failure reproduced |
| investigate | D | Reviewed | Read-only flow mode, debug hypothesis and evidence-output boundaries; debug ending/handoffs |
| seed-test-data | D | Reviewed | Review mode read-only; idempotency/prod-path safety, configured counts, scope and consumer reports |
| scaffold | D | EX-03 | Activation guard vs current big-feature applicability; profile-aware foundation/verification owner |
| linter-setup | D | EX-06 | Stack options, local/CI gate parity, mutation optionality, verification mutation authority |
| harness-setup | D | EX-02 | Root vs shared harness/F4 owner, profile fit, sensor ownership, inventory/completion |
| experience-review | D | Reviewed | Entry/channel applicability, actual running experience/log evidence, repetition and blocked limitations |
| code-simplifier | D | Reviewed + observation | Behavior preservation/review scope; numeric extraction suggestions not proven materially harmful |
| html-export | D | Reviewed + observation | Script invocation/exit distinctions; setup trust/offline contract; no browser-security execution performed |
| demo-guide | D | EX-01 | Sizing and group dispatch, case identity/proof rung, ledger/output; template does not replace tier selection |
| feature-presentation | D | Reviewed | Scope and configured artifact identities, accumulation, review conformance profile and evidence |
| feature-implement | S | Reviewed + cross-candidate | Whole entrypoint; standalone spine/nesting, declared AI gate, broad no-mocks rule, completion |
| commit | S | Reviewed | Explicit intent/scope/lease, staged candidate receipt, tests/review selection, push authority; script/protocol targets structural |
| pull-request | S | Consumer of EX-08 | Whole-branch exact-candidate review, upstream/conflict handling, CI failure signatures, blockers |
| git-conflict-resolve | S | EX-08 | Whole entrypoint; backups/operation-side mapping, completion vs PR and commit callers |
| git-developer-performance | S | Reviewed | Whole entrypoint; current authoritative scoring vs legacy script caveat, scope/uncertainty limits |
| release-doc | S | Reviewed + observation | Whole entrypoint; refs/time scopes, dump-before-analysis, script pipeline, HTML procedure targets and audience/fidelity gates |
| presentation-builder | S | Reviewed | Whole entrypoint; deterministic generator/validator interface, presenter vs review profiles, browser vs static proof limits |
| sync-codex | S | Reviewed + cross-candidate | Whole entrypoint; standalone pipeline, stage mutability, profile refusal, optional contracts, opencode handoff |
| sync-opencode | S | Reviewed + cross-candidate | Whole entrypoint; ownership ledger, hidden-skill explicit commands, verifier/host limitations, user-only invocation |
| tech-spec | S | Reviewed | Whole entrypoint; native UNSUPPORTED/NOT CONFIGURED, derived-only authority, sync routing, idempotence/error vs proxy distinction |

## Rejected, demoted and cross-concern candidates

- **Long files/context cost:** observation only. Several roots repeat summary/body/reminders, but length alone was not treated as a defect. No agent token/time/completion measurements or no-skill comparison ran. Static contract tests and generator/validator unit tests do not alone evaluate skill routing or task success. Parent should aggregate behavioral-eval coverage separately.
- **html-export offline security:** documented limitation, not a retained vulnerability finding. Root explicitly admits unsandboxed Chromium and that offline blocks network, not local files. No benign-sentinel browser isolation probe ran; do not claim offline isolates untrusted HTML or that this audit verified isolation.
- **code-simplifier numeric rules:** suggestions such as nesting/method-length thresholds can overfit, but no reachable changed behavior/outcome was proven; observation only.
- **experience-review ERROR logs:** intentional negative-path logging could interact with strict error rules, but current owning policy has the same rule and no representative runtime case was proved; dropped from actionable findings.
- **tool availability/Task/AskUserQuestion:** broad portability concern is owned by parent/adapters. Mandatory syntax alone is not proof of a supported-host failure; no standalone duplicate finding.
- **feature-implement no-mocks vs AI model seam:** cross-concern candidate for the AI reviewer, `feature-implement/SKILL.md:186,220` versus its declared AI-engineering gate at line 97. Broad no-mocks wording may contradict AE6's model seam for deterministic CI; not retained without full owner adjudication.
- **sync authority mismatch:** cross-concern candidate: `sync-codex/SKILL.md:69-90` automatically invokes the opencode mutating pipeline when `.opencode` exists while `sync-opencode/SKILL.md:271` says no unrelated skill/workflow may auto-run it and root is command-only. Runner handoff is explicitly documented, so this may be an intended exception missing from the child wording rather than a destructive authority violation. Parent should resolve owner intent and runtime enforcement before retaining.
- **release-doc time boundary:** observation: entrypoint identifies OLDEST in the selected time window but does not explicitly bind BASE to its parent. A naive OLDEST..HEAD excludes that oldest commit. The audit did not execute a time-window pipeline or settle whether current HTML/reference procedure corrects this; not retained as a proven defect.
- **Legacy git performance estimates:** rejected as a new defect because the root explicitly makes the current rubric authoritative and labels the older script output for correction; not silently represented as final evidence.

## Validation limit

This is a static instruction/caller audit with one deterministic shell status probe. No mutating skill execution, real Git commit, browser export, full sync pipeline or live model eval was performed. No findings were repaired. Retained findings have concrete current triggers and proposed executing regression checks; they should be merged into the parent's consolidated report and deduplicated against owning workflow/protocol findings.
