---
name: workflow-implement-spec
version: 1.0.0
description: '[Workflow] Use when implementing behavior already written in a canonical spec or TC set (spec-complete work). A spec that lacks the requested behavior goes to workflow-feature.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Run the Implement From Spec workflow — implement behavior that a canonical spec or TC set already states, without re-authoring the spec or growing scope, and close with green tests, a converged change review and a spec synced to any behavior difference.

**Summary:** Investigate the supplied spec and the affected code → gap-review the spec against the request (stop and escalate on a gap) → plan inside the spec baseline → build → sync the spec only when behavior differs → integration tests and their check → review changes → test → close.

**Workflow:**

1. **Gap review** — confirm the supplied spec states the requested behavior clearly; otherwise stop and escalate.
2. **Plan and build** — plan inside the recorded spec baseline, then execute.
3. **Verify and close** — sync the spec on a behavior difference, run the integration tests and their check, review the changes, test, close.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION stop at the gap review when the spec is vague, contradictory or lacks the requested behavior — never build a guessed behavior.
- MUST ATTENTION when creating/reviewing tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-clarify -> /plan -> /plan-execute -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[ESCALATION — BLOCKING]** `/spec-clarify` runs as a gap review of the supplied spec against the request. When the spec is vague or contradictory, or the requested behavior is not in the supplied spec, STOP before `/plan` and ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first. Never guess the missing behavior and never drop it silently. A spec with one open question is clarified before planning.

> **[PLAN SCOPE ANCHOR]** Plan scope is anchored to the supplied spec baseline: `/plan` records the supplied spec as `spec_baseline` at plan start (`/plan` → Supplied-Spec Scope Baseline), and every plan task traces to that baseline. A requirement the baseline lacks goes to `## Proposed additions (need approval)` and becomes a question, never a planned task.

> **Conditional step:** `/spec [mode=sync]` runs when the implemented behavior differs from the supplied spec, and always before `/integration-test` and the nested `/workflow-review-changes`, so the review sees the synced spec. Skip reason: "The implementation matches the supplied spec, so there is nothing to sync."

Activate the `workflow-implement-spec` workflow. Run `/start-workflow workflow-implement-spec` with the user's prompt as context.

**Steps:** /investigate → /spec-clarify → /plan → /plan-execute → /spec [mode=sync] → /integration-test → /integration-test-verify → /workflow-review-changes → /test → /workflow-end → /watzup

---

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-clarify -> /plan -> /plan-execute -> /spec [mode=sync] -> /integration-test -> /integration-test-verify -> /workflow-review-changes -> /test -> /workflow-end -> /watzup
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

**IMPORTANT MUST ATTENTION Goal:** Run the Implement From Spec workflow — implement behavior that a canonical spec or TC set already states, without re-authoring the spec or growing scope, and close with green tests, a converged change review and a spec synced to any behavior difference.

**IMPORTANT MUST ATTENTION Main steps:** `/investigate` → `/spec-clarify` (gap review) → `/plan` → `/plan-execute` → `/spec [mode=sync]` (only on a behavior difference) → `/integration-test` → `/integration-test-verify` → `/workflow-review-changes` → `/test` → `/workflow-end` → `/watzup`.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases; link parent when nested.
- **Critical Thinking:** Traced proof per claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Append findings to report file per section.
- **Subagent Return Contract:** Sub-agents return summary only, not transcript.

**IMPORTANT MUST ATTENTION** a vague, contradictory or incomplete spec stops the route before `/plan` — the user clarifies the spec or switches to `workflow-feature`.
**IMPORTANT MUST ATTENTION** every plan task traces to the recorded spec baseline; anything beyond it is a proposed addition that needs approval.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
