---
name: workflow-feature-spec
version: 1.0.0
description: '[Workflow] Use when creating or updating the configured canonical feature/spec artifact, applying its native paths, sections, identifiers, and test-evidence carriers; use the portable 8-section/README/TC form only when neither a native profile nor local artifact contract applies.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Produce or update one canonical feature/spec artifact under the project's configured format, with validated planning, intent and test-evidence coverage, and synchronized docs/change evidence.

**Summary:** Detect scope, investigate, plan/review/validate, author the configured canonical artifact and its native test-evidence representation, challenge docs/code alignment, sync docs, and close with evidence.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Ordered route:** `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/docs-update` → `/workflow-review-changes` → `/workflow-end` → `/watzup`.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /docs-update -> /workflow-review-changes -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[BLOCKING]** Before starting, read `docs/project-config.json`, the configured feature/spec template, and the local `spec-system-reference.md` and `spec-principles.md`. Apply section-role prose and test-evidence rules from the native profile or local artifact contract; the portable tech-free 8-section and `TC-` rules apply only when no native profile or local artifact contract exists.

Activate the `workflow-feature-spec` workflow. Run `/start-workflow workflow-feature-spec` with the user's prompt as context.

**Steps:** /investigate → /plan → /plan-review → /plan-validate → /docs-update → /workflow-review-changes → /workflow-end → /watzup _(this workflow is differentiated by its injectContext domain: the configured canonical artifact and its section, identifier, evidence, and test-carrier rules — see `workflows.json` `workflow-feature-spec.injectContext`)._

### Canonical Artifact Profile

Before authoring or synchronizing, resolve `specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, and `specArtifacts` when declared in `docs/project-config.json`; read the configured template and local spec-system reference. The configured business root and feature template determine the canonical path; `specArtifacts` and the local artifact contract define section roles, identifiers, ownership, and evidence/test carriers. Preserve those exactly and do not create a README, section, or test-ID registry the native artifact contract does not define. The framework's README/8-section/`TC-` format is the fallback only when neither configuration nor local references define a native contract. Default `TC-{FEATURE}-{NNN}` cases carry user-visible GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, Evidence: [Source: namespace/service/id], CoveredBy, and applicable status. A malformed or conflicting declared contract is BLOCKED; never silently fall back.

Keep the business-intent, contract, evidence, test-review, docs-sync, and change-review obligations. Map each to the configured roles and carriers; apply tech-agnostic prose rules only where the profile assigns them. Missing or unmapped coverage is UNKNOWN/BLOCKED, not PASS or NOT-APPLICABLE.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /docs-update -> /workflow-review-changes -> /workflow-end -> /watzup

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

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce one canonical feature/spec artifact in the configured native format, with validated planning, mandatory intent and test-evidence coverage, and synchronized docs/change evidence. Resolve the profile before applying the portable 8-section/README/TC fallback.

**IMPORTANT MUST ATTENTION Main steps:** `/investigate` → `/plan` → `/plan-review` → `/plan-validate` → `/docs-update` → `/workflow-review-changes` → `/workflow-end` → `/watzup`. **NEVER** skip the spec-principles gate, invoke each Skill step, or batch-complete validation. **MUST ATTENTION** resolve native artifact roles before using the strict portable fallback; unknown mappings stay blocked.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested, one `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `tmp/reports/` per file, never hold in memory.
- **Sub-Agent Return Contract:** return summary only (≤10 bullets) with `Full report:` path.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
