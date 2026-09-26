---
name: workflow-research
version: 1.0.0
description: "[Workflow] Use when researching a topic from web sources then synthesizing. Flag: --output={synthesis|business-eval|marketing|course}."
disable-model-invocation: false
---

## Quick Summary

**Goal:** Research a topic from web sources and deliver ONE cited, reviewed artifact in the form `--output` selects: a knowledge report (`synthesis`, default), a business/market viability evaluation (`business-eval`), a marketing strategy (`marketing`), or course material (`course`). The workflow produces research artifacts only, never code.

**Use it when** the answer must come from external sources and end in a durable, cited deliverable. **Use a sibling instead** for a quick lookup with no artifact (plain `/web-research`), for questions about this codebase (`/investigate`), or for a diagram of researched knowledge (`workflow-visualize --mode=knowledge`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-research` manifest variant for `--output` first, then create one task per returned occurrence (default: /web-research -> /deep-research -> /knowledge-synthesis -> /knowledge-review -> /workflow-end -> /watzup).

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

This skill is the canonical Research & Synthesis entry point. Invoke it with `--output=<mode>` (default `synthesis`); `/start-workflow workflow-research` resolves the same variants through `.claude/scripts/lib/workflow-manifest.cjs`. Each variant is a complete sequence, so execute the resolved manifest and never a hand-swapped list.

## Output Modes (--output)

Pick the mode from the prompt BEFORE creating tasks. When the prompt is ambiguous, use `synthesis` and state the assumption. Every mode shares the research scaffold (`/web-research → /deep-research`) and the `/knowledge-review → /workflow-end → /watzup` close; only the terminal synthesis skill(s) differ.

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

Classify the question and record it in the workflow report. Scope sets research DEPTH inside each skill's caps (`/web-research` ≤10 searches, `/deep-research` ≤8 fetches); it never lowers the evidence bar.

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
| `/web-research`             | core | Always; depth per triage.                                                    | Tiered source map with gaps (`.claude/tmp/_sources-{slug}.md`).                          |
| `/deep-research`            | core | Always; fetch count per triage. The synthesis skills read its evidence base. | Cross-validated evidence base (`.claude/tmp/_evidence-{slug}.md`).                       |
| Terminal synthesis skill(s) | core | Per the Output Modes table.                                                  | The deliverable.                                                                         |
| `/knowledge-review`         | gate | Always.                                                                      | `review-converged`: template, citation, confidence, source-quality and anti-bias checks. |
| `/workflow-end`             | gate | Always, last.                                                                | `run-closed`.                                                                            |
| `/watzup`                   | core | Always.                                                                      | Handoff summary with the artifact path.                                                  |

## Orchestration

You choose inline vs sub-agent, batching and ordering to minimize wall-clock and tokens at equal quality. Narrow questions run inline. For broad questions, independent sub-topic research passes can run as one parallel wave, because each writes only its own source and evidence files. Merge them before synthesis.

Fixed data dependencies: the source map exists before `/deep-research`; the evidence base exists before synthesis; `market-analysis` writes `MARKET_ANALYSIS_PATH` before its consumer reads it; `/knowledge-review` checks the final artifact; `/workflow-end` runs last.

## Memory & Reporting

- Create one task per resolved occurrence. Child skills expand their own phases under the parent row.
- Create the workflow report FIRST at `tmp/reports/workflow-research-{YYMMDD}-{HHmm}-{slug}.md`: mode, triage, resolver fingerprint, per-step evidence and deviations, and the paths of the source map, evidence base and final artifact. Append after each step.
- Sub-agent briefs carry the topic, the slug, the exact paths and the evidence bar, and make report writing the first deliverable.
- After compaction, re-read `TaskList` and the workflow report before continuing.

## Findings & Fix Path

- `/knowledge-review` is read-only. Validate each REVISE/BLOCKED finding against the evidence, then fix it at its owner. An evidence gap takes a targeted `/deep-research` pass on that gap. A synthesis defect (missing section, uncited claim, miscalibrated confidence) is fixed in the artifact through its synthesis skill. Then re-run `/knowledge-review` on the fixed artifact.
- Loop bounds: round 1 exits on zero findings; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, with LOWs deferred and listed; cap 2 rounds (+1 when a validated CRITICAL/HIGH is still open); escalate via `AskUserQuestion` when a round makes no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one cited, reviewed artifact in the selected `--output` form, with `/knowledge-review` converged and every factual claim traceable to a Sources row.

- **MUST ATTENTION** select the `--output` mode and triage the question scope FIRST. Scope sets research depth inside the skill caps; it never lowers the citation or cross-validation bar.
- **MUST ATTENTION** for `business-eval` and `marketing`, derive one `ARTIFACT_SLUG` and `MARKET_ANALYSIS_PATH` before the first research step and pass the exact values to every child.
- **MUST ATTENTION** fix validated review findings at their owner (evidence gap → targeted `/deep-research`, synthesis defect → the artifact), then re-run `/knowledge-review`.
- **MUST ATTENTION Variant closure:** record the selected `--output` mode, resolver fingerprint, ordered occurrence IDs, each invoked skill's evidence, and every deviation before `/workflow-end`; a variant mismatch is a workflow failure.

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Critical Thinking · AI Mistake Prevention · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
