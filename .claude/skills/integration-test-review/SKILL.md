---
name: integration-test-review
version: 2.0.0
description: '[Code Quality] Use when a workflow step or the user asks for an integration-test review. Performs one evidence-backed review pass over tests, source, and governing specs; maximum one review round per invocation.'
---

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
- Test reruns used to diagnose a failure are verification/recovery, not review rounds, and remain owned by `integration-test-verify` or the parent workflow.

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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-engineering-gate` — Thirty-eight AI-engineering clauses, AE-1.1 to AE-9.4: prompt contract, security, agents, retrieval, reliability, evals, operations, governance, UX; planning, building or reviewing a feature that calls a model → .claude/skills/shared/protocols/ai-engineering-gate.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed integration-test review pass over spec, source, test, and runner contracts.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** never edit tests/source/specs or start a re-review inside this skill.
- **MUST ATTENTION** preserve assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, and fidelity.
- **MUST ATTENTION** keep the conditional AI-surface lens and route deep findings to the AI reviewer within the same single pass.
- **MUST ATTENTION** test execution is deferred when a parent verify-last gate owns it.
