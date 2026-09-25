---
name: workflow-refactor
version: 1.0.0
description: '[Workflow] Use when restructuring, reorganizing, or cleaning up code without changing behavior.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Run the Code Refactoring workflow to restructure existing code without changing behavior, with evidence-backed planning, validation, spec/test/docs synchronization, and a clean final review.

**Summary:** Investigate → plan/review/validate → execute the behavior-preserving refactor → update specs/tests → review and verify integration → review changes → test → entity scan → sync docs and close with evidence.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Ordered route:** `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/plan-execute` → specs/tests → integration verification → `/workflow-review-changes` (owns `/integration-test-review` and the conditional entity scan → `/docs-update` refresh) → `/test` → `/workflow-end` → `/watzup`.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION apply shared SDD Artifact Contract from `shared/sdd-artifact-contract.md`; use project config/reference docs only for local conventions.
- NEVER skip mandatory workflow or skill gates.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`.

| Step                       | Role | Runs when |
| -------------------------- | ---- | --------- |
| `/workflow-review-changes` | gate | always    |
| `/test`                    | gate | always    |
| `/workflow-end`            | gate | always    |

No step is optional. Outcome gates: tests pass · review converged · run closed.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /plan-execute -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup

> **[EXPERIENCE ACCEPTANCE HANDOFF]** `/workflow-review-changes` carries the conditional `/experience-review` gate after refactor review convergence. Behavior-preservation evidence is exercised and inspected for affected observable surfaces; unchanged surfaces retain their accepted protection.

> **[BLOCKING]** Each step that runs MUST ATTENTION invoke its `Skill` tool; every other deviation follows the step contract above. NEVER batch-complete validation gates.

Activate the `workflow-refactor` workflow. Run `/start-workflow workflow-refactor` with the user's prompt as context.

**Steps:** /investigate → /plan → /plan-review → /plan-validate → /plan-execute → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-verify → /workflow-review-changes → /test → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH — DELEGATED]** The terminal `scan --target=domain-entities` → `docs-update` refresh is owned by the nested `/workflow-review-changes` occurrence: it runs the scan when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `domain-entities-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`), otherwise completes it with a cited skip reason. Do not repeat the scan in this workflow's tail.

> **[PERFORMANCE-SDD ROUTE]** If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), run `/performance-review` for benchmark evidence while preserving observable behavior. Do not use performance/refactor scope to bypass spec, test, or docs sync when behavior, public contract, SLA, performance constraint, state timing boundary, or docs/spec boundary changes. Pure behavior-preserving optimization may skip new TC/integration-test generation only with explicit skip reason and invariant-preservation evidence. `/test` remains mandatory.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /plan-execute -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup

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

**IMPORTANT MUST ATTENTION Goal:** Run the Code Refactoring workflow to restructure existing code without changing behavior, with evidence-backed planning, validation, spec/test/docs synchronization, and a clean final review.

**IMPORTANT MUST ATTENTION Main steps:** `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/plan-execute` → `/spec [mode=tests]` → `/artifact-review --type=spec-tests` → `/spec [mode=sync]` → `/integration-test` → `/integration-test-verify` → `/workflow-review-changes` (owns `/integration-test-review` and the conditional `/scan --target=domain-entities` → `/docs-update` refresh) → `/test` → `/workflow-end` → `/watzup`. **NEVER** skip behavior-preservation evidence, required gates, or conditional skip reasons.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases; link parent when nested.
- **Critical Thinking:** Traced proof per claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Append findings to report file per section.
- **Subagent Return Contract:** Sub-agents return summary only, not transcript.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
