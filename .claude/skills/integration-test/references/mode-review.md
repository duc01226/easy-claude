# `/integration-test --mode=review` — one-pass integration-test review reference

> Loaded by `integration-test/SKILL.md`'s Mode Dispatch when invoked as `/integration-test --mode=review [--report-only] [--prove-tests] <target>`. This contract REPLACES test generation for the invocation: review once, report, stop. It never writes or edits tests, source, specs or config (only its report under `tmp/reports/`).

## Quick Summary

**Goal:** In one review pass, determine whether integration tests protect intended behavior through realistic, repeatable, observable boundaries and remain aligned with source and canonical specs.

**Summary:**

- **ONE ROUND MAXIMUM per invocation.** Review once, validate/deduplicate findings, report, stop. Never fix tests/source or re-review inside this skill.
- Review the package, not isolated test files: governing spec/cases + production path + integration tests + runner/config evidence.
- `--report-only` is the normal workflow-specialist mode. `--prove-tests` may inspect existing runner evidence or run the configured relevant suite only when the caller owns test execution; it does not open another review round.
- Preserve the AI-surface lens when the tested path calls a model, prompt, agent, tool/MCP, retrieval, or guardrail.

**Workflow:** Resolve scope/profile → trace spec/test/source package → run eight quality gates once → validate/deduplicate → verdict/report → stop.

**Key Rules:**

- Maximum one review round per invocation; another pass requires a new explicit invocation after the caller revises the target.
- Read-only on source, tests, specs, and config. Write only the review report under `tmp/reports/`.
- Never weaken assertions, add skips, widen timeouts, or rewrite source/tests to force green.

## One-Round Contract

`round = 1`, `maxRounds = 1`, `minRounds = 1`.

- The round includes evidence loading, all quality gates, optional parallel batches/lenses, finding validation, deduplication, and verdict.
- Findings return to the caller as `CHANGES_REQUESTED`; the caller owns fixes and final verification.
- No internal fix loop, fresh-context re-review, round-2 severity floor, or review-policy continuation applies.
- Test reruns used to diagnose a failure are verification/recovery, not review rounds, and remain owned by `integration-test --mode=verify` or the parent workflow.

## Scope and Case Profile

1. Resolve `docs/project-config.json`, the configured integration-test command, relevant reference docs, and `specArtifacts`.
2. Valid native profile: use its intent/contracts/evidence roles, case identity, carrier dialect, and cardinality. Absent profile: use the strict-default feature-spec/TC contract. Malformed profile: `BLOCKED`, no fallback.
3. Locate the whole package:
   - canonical intent/contract and case/scenario;
   - production entry path and owned outcome;
   - integration test and assertion path;
   - fixtures/builders/data isolation and runner configuration.
4. Create `tmp/reports/integration-test-review-{YYMMDD}-{HHmm}-{slug}.md` before findings.

## Single Review Pass — Eight Gates

Judge each gate `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with `file:line`/config/runner evidence.

### 1. Assertion value

- Does the assertion fail when the protected rule breaks, or does it only prove no exception/status bookkeeping?
- Name the mutant or behavioral break that should make the case red.

### 2. Owned outcome

- Assert the business/entity/system outcome the tested component owns, not queue attempts, delivery bookkeeping, sleeps, or another process's mutable internals.
- For async behavior, assert convergence independent of which worker completes it.

### 3. Repeatability and isolation

- Test data/state is isolated under the configured concurrency model; cleanup removes only owned resources.
- Reruns do not depend on order, shared leftovers, wall-clock luck, or a blind delay.

### 4. Behavior ownership

- Setup uses the production boundary when that boundary is under test; unrelated preconditions may use project-native fixtures/builders without bypassing the protected contract.
- A failure is provisionally classified SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS before any recommendation.

### 5. Spec/case traceability

- Owner + case/scenario + optional variant resolves to the actual executor and inspected assertion.
- Identity text alone is not proof; preserve configured many-to-many mappings.

### 6. Spec ↔ tests ↔ code consistency

- Triangulate all three faces and classify divergence as CODE-WRONG, SPEC-STALE, SPEC-SILENT, TEST-GAP, WEAK-TEST, or AMBIGUOUS.
- Green tests never normalize drift. A changed invariant missing from the canonical owner remains incomplete.

### 7. Change coverage

- Every changed behavior, error path, edge/boundary, authorization rule, state transition, and regression risk has appropriate integration coverage or an evidence-backed reason another test tier owns it.
- Do not require integration tests for mechanics already better proven by a narrower/lower-cost test.

### 8. Real-world fidelity

- Sequence, timing, actors, topology, and data can occur in production—or an impossible-state test labels and justifies its corruption/recovery purpose.
- Use observable readiness/postconditions and native runner waits; no assertion retry, timeout widening, or fixed sleep masking.

### Conditional AI-surface lens

When the path calls a model, prompt, agent, tool/MCP, retrieval, eval, or guardrail, also review: deterministic seams/mocks at the correct boundary, tool authorization, untrusted output handling, bounded retries/spend, eval/trace evidence, fallback/kill switch, and assertions on owned outcomes. Route deep AI concerns to `ai-engineering-review --report-only`; keep it inside this one pass.

**AI surface?** Only if the tested path calls a model, prompt, agent, tool/MCP, retrieval, eval or guardrail (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it inside this one pass; otherwise skip this line.

## Execution Evidence

- `--report-only`: do not run tests. Review source, specs, and any existing exact runner output supplied by the caller.
- `--prove-tests`: run the configured relevant suite once only when this invocation is the final proof owner and no parent verify-last step will run it later. Record exact command, exit code, scope, and output location.
- Any failure follows the test-failure investigation route. This skill reports the adjudicated finding; it does not edit or start another review pass.

## Finding Validation and Verdict

1. Deduplicate findings by root cause/owner.
2. Confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings through `/why-review --validate-findings <report-path>`; terminal validation is part of round 1 and never opens another review round.
3. Emit:
   - `PASS` — all gates clear with no validated blocking finding.
   - `PASS_WITH_NOTES` — LOW observations only.
   - `CHANGES_REQUESTED` — validated test/source/spec findings require caller action.
   - `BLOCKED` — required profile, environment, owner intent, or execution evidence is unavailable.
4. Stop. Never fix or re-review.

## Report Shape

```markdown
# Integration Test Review — {scope}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: 1/1

## Package Traced
| spec/case | production owner | test/assertion | runner |

## Gate Results
| gate | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Evidence and reachable path:
- Protected intent/consequence:
- Fault classification:
- Owner and recommended correction:
- Confidence:

## Coverage and Limits
- AI-surface lens: applied/N/A + evidence
- Test execution: deferred/proved + exact evidence
- Unverified items and owner
```

Inside a workflow, return the verdict/report path to the parent without next-step prompts.

## Mode protocols

The protocols below are carried in full because only this mode needs them; the protocols shared with test generation are guide lines in `integration-test/SKILL.md`.

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier means the same everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> **Reachable trigger path (required):** a finding also names HOW a supported configuration reaches the defect — the caller, input, state or event sequence that drives execution or data there. A concern on a path nothing reaches (dead code, a branch its guard excludes, an impossible state) is an observation: record it as advice, never as a LOW to fix. Also never a finding: what a compiler, type checker, linter or test run for this change already reports in the review evidence; a behavior change the stated intent asks for; an issue silenced by a suppression that predates this change and states its reason (a suppression the change adds is itself reviewed); a pre-existing issue on a line the change neither touched nor made reachable. When reachability cannot be settled and the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it; a polish-level concern with unsettled reachability is an observation. — why: a speculative LOW admitted as a finding becomes build work in round 1.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; a silent failure on a critical path. A failed binary gate is carried by the executable policy as a separate synthetic blocker, not an ordinary severity judgment. |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift — real impact, not immediate material loss. A recorded follow-up does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never raises the round budget | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and obtaining another round never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate is bounded by the three-round review cap; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. `architecture --mode=scalability`): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; all review blockers may use up to three rounds, then escalate; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed integration-test review pass over spec, source, test, and runner contracts.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** never edit tests/source/specs or start a re-review inside this mode.
- **MUST ATTENTION** preserve assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, and fidelity.
- **MUST ATTENTION** keep the conditional AI-surface lens and route deep findings to the AI reviewer within the same single pass.
- **MUST ATTENTION** test execution is deferred when a parent verify-last gate owns it.
