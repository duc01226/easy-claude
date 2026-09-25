---
name: workflow-spec-sync
version: 1.0.0
description: '[Workflow] Use when updating test specs and feature docs after code changes, bug fixes, or PR reviews.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Test Spec Update (Post-Change) workflow — update test specs and feature docs after code changes, bug fixes, or pr reviews.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION preserve `Business Intent / Invariant Guarded` when updating TCs; do not encode accidental implementation behavior.
- MUST ATTENTION **A native contract declared by config or local references takes precedence over portable format defaults.** Read `docs/project-config.json` (`specArtifacts`, `specRoots`, `workflowPatterns`) and the required local references first, then resolve section roles, identifiers, ownership, and test/evidence carriers from them. Under a native profile, a missing or conflicting required placement, ID, owner, carrier, or companion link remains `UNKNOWN`/`BLOCKED` — never guessed and never silently downgraded to the portable format.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /workflow-review-changes -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /test -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[BLOCKING]** Read `spec-principles.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides the path) before updating test specs — Section 7 TC coverage mapping is the canonical baseline.

Activate the `workflow-spec-sync` workflow. Run `/start-workflow workflow-spec-sync` with the user's prompt as context.

> **UI-intent maintenance (conditional)** — runs alongside the `/spec [mode=sync]` step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When the changed behavior is user-facing, run `/spec` (ui-intent intent) to refresh the affected Feature Spec **§6** interaction surface — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path — and re-link the governing `/design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to the synced behavior. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

**Steps:** /workflow-review-changes → /spec [mode=tests] → /artifact-review --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-review → /integration-test-verify → /test → /docs-update → /workflow-end → /watzup

---

**IMPORTANT MANDATORY Steps:** /workflow-review-changes -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /test -> /docs-update -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION** every protocol below is in force — apply each:
**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent task when nested.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act.
- **Incremental Persistence:** append findings to report per file, survive compaction.
- **Sub-Agent Return Contract:** return summary only, full detail to report file.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
