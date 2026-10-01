---
name: workflow-research
version: 1.0.0
description: "[Workflow] Use when researching a topic from web sources then synthesizing. Flag: --output={synthesis|business-eval|marketing|course}."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Research a topic from web sources and deliver ONE cited, reviewed artifact in the form `--output` selects: a knowledge report (`synthesis`, default), a business/market viability evaluation (`business-eval`), a marketing strategy (`marketing`), or course material (`course`). The workflow produces research artifacts only, never code.

**Use it when** the answer must come from external sources and end in a durable, cited deliverable. **Use a sibling instead** for a quick lookup with no artifact (plain `/web-research`) or for questions about this codebase (`/investigate`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-research` manifest variant for `--output` first, then create one task per returned occurrence (the research occurrence runs `/web-research --chain=deep-dive`) (default: /web-research -> /knowledge-synthesis -> /knowledge-review -> /workflow-end -> /watzup).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

This skill is the canonical Research & Synthesis entry point. Invoke it with `--output=<mode>` (default `synthesis`); `/start-workflow workflow-research` resolves the same variants through `.claude/scripts/lib/workflow-manifest.cjs`. Each variant is a complete sequence, so execute the resolved manifest and never a hand-swapped list.

## Output Modes (--output)

Pick the mode from the prompt BEFORE creating tasks. When the prompt is ambiguous, use `synthesis` and state the assumption. Every mode shares one research step, `/web-research --chain=deep-dive` (source map, then evidence base; the `/source-deep-dive` procedure runs inside it per `.claude/skills/web-research/references/research-chain.md`), and the `/knowledge-review → /workflow-end → /watzup` close; only the terminal synthesis skill(s) differ.

| `--output`              | Deliverable                          | Terminal synthesis skill(s)                 |
| ----------------------- | ------------------------------------ | ------------------------------------------- |
| **synthesis** (default) | Cited knowledge report               | `/knowledge-synthesis`                      |
| **business-eval**       | Business/market viability evaluation | `/market-analysis` → `/business-evaluation` |
| **marketing**           | Marketing strategy                   | `/market-analysis` → `/strategy-builder`    |
| **course**              | Structured course material           | `/course-builder`                           |

**[BLOCKING] Evidence-artifact identity for `business-eval` and `marketing`:** before invoking the
first research child, derive one stable `ARTIFACT_SLUG` from the user's topic and record the exact
`MARKET_ANALYSIS_PATH = docs/knowledge/strategy/market-analysis/{ARTIFACT_SLUG}.md` in the parent
workflow context/task handoff. Pass those exact values to every child skill. `market-analysis` is the
only producer; it must write and return that path, and `business-evaluation`/`strategy-builder` must
read that exact path rather than deriving a second slug. If a plan directory is active, its
`{plan-dir}/research/market-analysis.md` file is a copy of the same producer artifact, not a second
identity. This token is not needed for `synthesis` or `course` variants. — why: sequence ordering
without a shared artifact key still allows a producer/consumer miss that degrades the final evidence
without failing the workflow.

## Question-Scope Triage (first action)

Classify the question and record it in the workflow report. Scope sets research DEPTH inside the research step's caps (≤10 searches, then ≤8 fetches); it never lowers the evidence bar.

| Scope                          | Signals                                                                           | Depth                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narrow**                     | One fact, definition, or comparison of 2–3 named options                          | 3–5 angle-varied queries; fetch the 2–4 strongest Tier 1–2 sources; a short artifact that still carries every template section the review enforces.                                                                    |
| **Standard**                   | One topic with several angles                                                     | Skill defaults: 5–10 queries, 5–8 fetches.                                                                                                                                                                             |
| **Broad or decision-critical** | Multi-part topic, contested evidence, or a business/strategy decision rides on it | Split into sub-topics, one bounded research pass per sub-topic (each under the caps), then merge the source maps and evidence bases before synthesis. Run the adversarial checks of `/knowledge-review` at full depth. |

## Required Quality Gates

| Gate                                             | Evidence that proves it                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review converged (`review-converged`)            | `/knowledge-review` verdict APPROVED on the final artifact, after validated REVISE/BLOCKED findings were fixed and re-reviewed.                                                         |
| Citation bar                                     | Every factual claim, number, table row and inference ends with an inline `[N]` citation mapped to a Sources row (Title, URL, Author/Publisher, Date, Tier).                             |
| Cross-validated and calibrated | Factual claims rest on 2+ independent sources; a single-source claim is marked unverified and held below 60%; confidence above 80% needs contradicting evidence addressed; Tier 4 is never cited as fact; findings below 60% and open gaps are flagged. |
| Artifact identity (`business-eval`, `marketing`) | One `MARKET_ANALYSIS_PATH`, written by `market-analysis` and read by its consumer.                                                                                                      |
| Variant closure                                  | The workflow report records the selected mode, resolver fingerprint and ordered occurrence IDs.                                                                                         |
| Run closed (`run-closed`)                        | `/workflow-end` ran last.                                                                                                                                                               |

## Recommended Skills

| Skill                       | Role | When it earns its cost                                                       | Proves / feeds                                                                           |
| --------------------------- | ---- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/web-research --chain=deep-dive` | core | Always; depth per triage. Runs the `/source-deep-dive` procedure inline; the synthesis skills read its evidence base. | Tiered source map with gaps (`tmp/research/_sources-{slug}.md`), then the cross-validated evidence base (`tmp/research/_evidence-{slug}.md`). |
| Terminal synthesis skill(s) | core | Per the Output Modes table.                                                  | The deliverable.                                                                         |
| `/knowledge-review`         | gate | Always.                                                                      | `review-converged`: template, citation, confidence, source-quality and anti-bias checks. |
| `/workflow-end`             | gate | Always, last.                                                                | `run-closed`.                                                                            |
| `/watzup`                   | core | Always.                                                                      | Handoff summary with the artifact path.                                                  |

## Orchestration

You choose inline vs sub-agent, batching and ordering to minimize wall-clock and tokens at equal quality. Narrow questions run inline. For broad questions, independent sub-topic research passes can run as one parallel wave, because each writes only its own source and evidence files. Merge them before synthesis.

Fixed data dependencies: inside the research step the source map exists before the deep dive; the evidence base exists before synthesis; `market-analysis` writes `MARKET_ANALYSIS_PATH` before its consumer reads it; `/knowledge-review` checks the final artifact; `/workflow-end` runs last.

## Memory & Reporting

- Create one task per resolved occurrence. Child skills expand their own phases under the parent row.
- Create the workflow report FIRST at `tmp/reports/workflow-research-{YYMMDD}-{HHmm}-{slug}.md`: mode, triage, resolver fingerprint, per-step evidence and deviations, and the paths of the source map, evidence base and final artifact. Append after each step.
- Sub-agent briefs carry the topic, the slug, the exact paths and the evidence bar, and make report writing the first deliverable.
- After compaction, re-read `TaskList` and the workflow report before continuing.

## Findings & Fix Path

- `/knowledge-review` is read-only. Validate each REVISE/BLOCKED finding against the evidence, then fix it at its owner. An evidence gap takes a targeted `/source-deep-dive` pass over the existing source map, or a `/web-research --chain=deep-dive` pass on the gap when the map lacks the needed sources. A synthesis defect (missing section, uncited claim, miscalibrated confidence) is fixed in the artifact through its synthesis skill. Then re-run `/knowledge-review` on the fixed artifact.
- Loop bounds: round 1 exits on zero open findings (Round-1 LOW closure, `SYNC:double-round-trip-review`); from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, with LOWs deferred and listed; cap 2 rounds (+1 when a validated CRITICAL/HIGH is still open); escalate via `AskUserQuestion` when a round makes no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one cited, reviewed artifact in the selected `--output` form, with `/knowledge-review` converged and every factual claim traceable to a Sources row.

- **MUST ATTENTION** select the `--output` mode and triage the question scope FIRST. Scope sets research depth inside the skill caps; it never lowers the citation or cross-validation bar.
- **MUST ATTENTION** for `business-eval` and `marketing`, derive one `ARTIFACT_SLUG` and `MARKET_ANALYSIS_PATH` before the first research step and pass the exact values to every child.
- **MUST ATTENTION** fix validated review findings at their owner (evidence gap → targeted `/source-deep-dive` or `/web-research --chain=deep-dive` pass, synthesis defect → the artifact), then re-run `/knowledge-review`.
- **MUST ATTENTION Variant closure:** record the selected `--output` mode, resolver fingerprint, ordered occurrence IDs, each invoked skill's evidence, and every deviation before `/workflow-end`; a variant mismatch is a workflow failure.

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
