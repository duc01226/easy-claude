---
name: workflow-research
version: 1.0.0
description: '[Workflow] Use when researching a topic from web sources then synthesizing. Flag: --output={synthesis|business-eval|marketing|course}.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Research & Synthesis workflow — resolve the target artifact selected by `--output` to a complete canonical manifest variant, gather web sources, then synthesize the requested knowledge report, business evaluation, marketing strategy, or course material.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** resolve the `workflow-research` manifest variant for `--output` first, then invoke its exact ordered steps (default: /web-research -> /deep-research -> /knowledge-synthesis -> /knowledge-review -> /workflow-end -> /watzup).

> These steps are the default `--output=synthesis` sequence (identical to the catalog `workflow-research` workflow sequence). For `--output={business-eval|marketing|course}` the terminal synthesis skill(s) swap per the **Output Dispatch** table below — the research scaffold and `/knowledge-review -> /workflow-end -> /watzup` closure are invariant.

---

## Output Dispatch (--output)

All modes share the research scaffold `/web-research → /deep-research → … → /knowledge-review → /workflow-end → /watzup`; only the terminal synthesis skill(s) swap per `--output`:

| `--output`              | Terminal synthesis skill(s)                 | Full sequence                                                                                                            |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **synthesis** (default) | `/knowledge-synthesis`                      | `/web-research → /deep-research → /knowledge-synthesis → /knowledge-review → /workflow-end → /watzup`                    |
| **business-eval**       | `/market-analysis` + `/business-evaluation` | `/web-research → /deep-research → /market-analysis → /business-evaluation → /knowledge-review → /workflow-end → /watzup` |
| **marketing**           | `/market-analysis` + `/strategy-builder`    | `/web-research → /deep-research → /market-analysis → /strategy-builder → /knowledge-review → /workflow-end → /watzup`    |
| **course**              | `/course-builder`                           | `/web-research → /deep-research → /course-builder → /knowledge-review → /workflow-end → /watzup`                         |

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

This skill IS the canonical Research & Synthesis entry point — invoke it directly with `--output=<mode>` (default `synthesis`), resolve the matching complete variant through `.claude/scripts/lib/workflow-manifest.cjs`, and execute every returned occurrence in order via the `Skill` tool. The workflow catalog exposes the same four variants for auto-routing and `/start-workflow workflow-research`; never execute a prose-swapped sequence that differs from the resolved manifest.

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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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

**IMPORTANT MUST ATTENTION Variant closure:** record the selected `--output` mode, resolver fingerprint, ordered occurrence IDs, each invoked skill's evidence, and any conditional skip before `/workflow-end`; a variant mismatch is a workflow failure.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — NEVER treat a digest line as the full rule; it signposts the canonical SYNC body above:**

- **Nested Task Creation:** Expand child phases under the parent workflow row; link when nested.
- **Critical Thinking:** Apply critical + sequential thinking; cite proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Persist findings to `tmp/reports/` per file; survive context cutoff.
- **Subagent Return Contract:** Sub-agents return summary plus report pointer only, never inline transcript.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
