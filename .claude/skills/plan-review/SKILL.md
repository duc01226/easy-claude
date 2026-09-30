---
name: plan-review
version: 2.0.0
description: '[Planning] Use when a workflow step or the user asks for a plan review. Performs one evidence-backed review pass and returns a verdict; maximum one review round per invocation.'
---

## Quick Summary

**Goal:** Decide in one review pass whether a plan gives an executor sound direction, bounded discovery, complete affected-area coverage, and credible final quality gates without pre-writing the implementation.

**Summary:**

- **ONE ROUND MAXIMUM per invocation.** Review once, report once, stop. Never fix the plan, start a re-review, or loop through findings.
- Review the whole plan at decision-and-boundary altitude: intent, important decisions, owners/areas, dependencies, discovery obligations, risks, spec/test/code sync, and final proof.
- Use conditional specialist lenses inside the single pass only when their risk warrants the context cost. An AI-feature plan retains the AI-engineering lens; UI, security, data/domain, integration-test, and architecture lenses remain evidence-triggered.
- Findings are validated and deduplicated before the verdict, but validation is not a second review round.

**Workflow:** Resolve plan and scope → load governing evidence → run one core pass plus warranted lenses → validate/deduplicate findings → emit report and verdict → stop.

**Key Rules:**

- Maximum one review round per invocation; a caller may revise and explicitly invoke the skill again as a new run.
- Read-only on plan/source/spec artifacts. Write only the review report under `tmp/reports/`.
- Do not manufacture work: a clean plan passes; missing evidence is `NOT VERIFIABLE`, not a speculative finding.

## One-Round Contract

`round = 1`, `maxRounds = 1`, `minRounds = 1`.

- The single round includes reading, core review, any parallel specialist lenses, finding validation, deduplication, scoring, and verdict.
- It does **not** include editing `plan.md`, applying fixes, asking another reviewer to re-read fixed content, or starting round 2.
- When findings survive validation, return `CHANGES_REQUESTED` with owner and evidence. The plan author/caller owns revision. Another review requires a new explicit invocation and a new report.
- A missing required artifact, unresolved material user decision, or evidence gap that prevents judgment returns `BLOCKED` or `NOT_VERIFIABLE`; never consume another round trying to manufacture certainty.
- Test execution is outside this skill. Review whether the plan schedules verify-last correctly; do not run suites.

## Scope and Evidence

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`, then resolve the target `plan.md`, any phase files it intentionally uses, its spec owner, and the configured project references.
2. Read current plan artifacts and cited evidence. For code-bearing plans, spot-check the key owners/consumers and representative patterns; use the graph when present.
3. Establish the requested change and non-goals. If a supplied spec baseline exists, review against that baseline and separate proposed additions.
4. Create `tmp/reports/plan-review-{YYMMDD}-{HHmm}-{slug}.md` before recording findings.

## Single Review Pass

### Core review

Judge each dimension `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with evidence:

| Dimension | Review question |
| --- | --- |
| Intent and scope | Is the outcome governed by a clear owner/spec, with non-goals and no silent expansion? |
| Technical decisions | Are material choices, rationale, alternatives, trade-offs, reversibility, and owners explicit? |
| Areas and consumers | Are modules, contracts, state/data, tests, specs/docs, mirrors, and downstream consumers covered where applicable? |
| Dependency order | Do phases reflect real dependencies or disjoint ownership rather than ceremony? |
| Executor discovery | Are unknowns bounded by source/owner, purpose, and stop condition instead of hidden or pre-solved? |
| Plan altitude | Is the plan actionable without becoming method-by-method implementation replay? |
| Failure and compatibility | Are rollback, migration, security/data/platform, error paths, and compatibility concerns covered where material? |
| Spec/test/code drift | Does the plan preserve intent/cases before build and reconcile actual tests/code/spec evidence before completion? |
| Verify-last | Are tests authored with implementation and executed only after all implementation and static review? |
| Future change cost | Is there one owner per rule, bounded growth, and a named test for each protected invariant without speculative abstraction? |

### Conditional lenses

Use a lens only when evidence triggers it. Run warranted independent lenses in one parallel wave with an all-return barrier; otherwise review inline.

- **AI feature:** invoke or apply `ai-engineering-review --report-only` over the plan's model/tool/retrieval/eval/guardrail/operations decisions. This preserves the existing AI-feature review lane.
- **User-facing UI:** apply journey, design-system, accessibility, state, and container-fit plan checks.
- **Domain/data/security/public contract:** inspect the owning specialist rules and surface material unresolved decisions.
- **Integration/E2E:** verify case ownership, observable outcomes, fidelity, isolation, and final execution evidence; do not prescribe runner mechanics without project evidence.
- **Architecture/performance:** use only for cross-boundary, irreversible, scale, or SLA decisions.

Sub-agents are optional, not a quality signal. Use them only when independent risk lenses clearly outweigh their context load. Every lens is part of round 1, never a new round.

### Finding validation and verdict

1. Deduplicate by root cause and owning location.
2. For every potential finding, confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings with `/why-review --validate-findings <report-path>`; this terminal adjudication belongs to the same pass and never edits the plan or opens another review round.
3. Ask the three trade-off questions for plan decisions and for each recommendation. Hand material unconfirmed trade-offs to the caller/user as blocking questions.
4. Verdict:
   - `PASS` — no validated blocking finding, unresolved required evidence, or failed required Goal Contract criterion.
   - `PASS_WITH_NOTES` — only evidence-backed LOW observations that do not require plan changes.
   - `CHANGES_REQUESTED` — one or more validated findings require revision.
   - `BLOCKED` — required intent/evidence/user decision is unavailable.
5. Stop. Do not apply fixes or re-review.

## Report Shape

```markdown
# Plan Review — {plan}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: 1/1

## Scope and Evidence
- Plan artifacts reviewed
- Governing spec/decision/reference sources
- Code/graph evidence spot-checked

## Dimension Results
| dimension | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Location/evidence:
- Reachable consequence:
- Why it matters to execution:
- Recommended plan-level correction:
- Confidence:

## Trade-Off Assessment
| decision | sacrifice | gain | who pays/when | worth it | material | confirmed |

## Coverage and Limits
- Conditional lenses run or N/A with evidence
- Unverified evidence and owner

## Goal Satisfaction
| Success Criterion | Evidence | Status |
| --- | --- | --- |

## Handoff
- Plan author/caller owns revisions.
- This invocation is complete; no automatic second round.
```

Inside a workflow, return the report path and verdict to the parent without a next-step prompt. Standalone, report the same result; the user decides whether to revise or invoke another review.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-engineering-gate` — Thirty-eight AI-engineering clauses, AE-1.1 to AE-9.4: prompt contract, security, agents, retrieval, reliability, evals, operations, governance, UX; planning, building or reviewing a feature that calls a model → .claude/skills/shared/protocols/ai-engineering-gate.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `plan-granularity` — Outcome phases name decisions, boundaries and bounded discovery without replaying implementation; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed plan review pass that improves execution confidence without becoming another implementation or review loop.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** resolve the active Goal Contract and emit its Goal Satisfaction matrix before a PASS verdict.
- **MUST ATTENTION** never edit the plan, fix findings, or start a fresh re-review inside this skill.
- **MUST ATTENTION** judge intent, decisions, areas/consumers, bounded discovery, risks, drift control, and verify-last order at plan altitude.
- **MUST ATTENTION** keep the AI-engineering lens when AI-feature evidence triggers it; all other specialist lenses remain evidence-triggered and part of the same single pass.
- **MUST ATTENTION** inside workflows return the verdict/report path without a next-step prompt.
