---
name: workflow-feature-spec
version: 2.0.0
description: '[Workflow] Use when creating or updating the configured canonical feature/spec artifact, applying its native paths, sections, identifiers, and test-evidence carriers; use the portable 8-section/README/TC form only when neither a native profile nor local artifact contract applies.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** create or update ONE canonical feature/spec artifact for one capability at its configured path — scoped by evidence, planned to the depth the change needs, reconciled with its test/evidence cases, reviewed, and docs-synced. **MUST ATTENTION** resolve the configured artifact profile before writing anything.

**Use it when** the user asks to write or revise the business spec for a capability. **Use a sibling instead when:** only a raw idea exists → `workflow-idea-to-spec`; the spec must be derived from or re-synced with existing code across capabilities → `workflow-code-to-spec`; code changes are the goal → `workflow-feature` / `workflow-implement-spec`.

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan-review -> /plan-validate -> /docs-update -> /workflow-review-changes -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged to the run's deviation log. The list above is the recommended default order; the triage below decides which recommendations earn their cost.

## 1. Triage (FIRST action)

Classify the change from the request plus the investigate evidence, and record it in the run report:

| Band     | Signal                                                  | Default depth                                                                      |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **XS**   | one rule, one case, or wording in an existing spec      | short plan inside the task list; plan-validate confirms the one decision           |
| **S**    | a few sections/cases of one existing spec, clear intent | written plan; plan-validate confirms the non-obvious decisions                     |
| **M**    | new spec, restructure, UI intent, or many rules/states  | full plan + `/plan-review` + `/artifact-review` on the result                      |
| **L/XL** | several capabilities or buckets                         | split: one spec per capability; route whole-bucket work to `workflow-code-to-spec` |

**Kinds:** behavior change (cases/evidence must be reconciled) · public contract · UI surface (interaction-intent role) · parent/child features (cross-references) · docs-only wording. Escalate depth on ambiguity and risk, not length.

## 2. Required Quality Gates (non-negotiable)

| Gate                                      | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved**             | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the canonical path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback. |
| **Decisions confirmed**                   | `/plan-validate` confirmed scope and every non-obvious decision with the user.                                                                                                                                                                                                                                                                                                         |
| **Spec synced** (`spec-synced`)           | `/docs-update` routed the spec chain — `/spec` → `/spec [mode=tests]` → test-spec review → `/spec [mode=sync]` — and the artifact satisfies the applicable **M1-M7** mandates (tech-agnostic intent prose, business-visible cases). Every case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.                                                  |
| **Review converged** (`review-converged`) | `/workflow-review-changes` converged, run INLINE in the main session.                                                                                                                                                                                                                                                                                                                  |
| **Run closed** (`run-closed`)             | `/workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                                                                      |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers; generate only project-declared derived outputs. Keep intent roles tech-agnostic; put permitted technical detail only in declared contract/evidence roles. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI features, Section 8 `TC-{FEATURE}-{NNN}` cases with user-visible GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Cross-reference parent/child artifacts as the contract defines them (portable form: each sub-feature references its parent). Unknown mapping or missing required coverage is BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE; never create a README, section or ID registry the native contract does not define.

## 3. Recommended Skills

| Skill                                    | Earns its cost when                                                                                                            | Proves / feeds                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `/investigate`                           | always — existing spec, related code and test evidence for the capability                                                      | scope + evidence for the plan |
| `/plan`                                  | always; a few task lines for XS, a written plan for S+                                                                         | section/case change list      |
| `/plan-review`                           | M+ bands, restructuring, several capabilities, or an ambiguous plan                                                            | plan quality before authoring |
| `/plan-validate`                         | always — the user confirms scope and non-obvious decisions                                                                     | decisions-confirmed gate      |
| `/docs-update`                           | always — it routes the spec chain that writes the artifact                                                                     | spec-synced gate              |
| `/artifact-review` (on the changed spec) | M+ bands, new or restructured specs, or any doubt about M1-M7 — run after the docs-update spec chain, before the change review; not a registry step, so create its own task when the triage selects it | independent M1-M7 verdict     |
| `/workflow-review-changes`               | always, inline in the main session                                                                                             | review-converged gate         |
| `/workflow-end` → `/watzup`              | always, last                                                                                                                   | run-closed gate + handoff     |

## 4. Orchestration Freedom

You choose inline vs sub-agent, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the spec change exists before it is reviewed; the spec chain runs before the review that checks it; fixes are re-verified after they land; `/workflow-review-changes` runs inline in the main session; `/workflow-end` runs last; user-approval gates are never parallelized. XS/S work runs inline without sub-agents.

## 5. Memory, Reporting and Fix Path

- One task per selected step; write the run report under `tmp/reports/` FIRST and append per step; re-read it and `TaskList` after compaction.
- Findings are validated before fixing; fix in the owning spec role; re-run the review that raised them. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 2 rounds (+1 when a CRITICAL/HIGH stays open); escalate via `AskUserQuestion` on no progress.
- Define success criteria before the first edit (the sections, cases and decisions that must exist) and loop until each is observably true.
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

**IMPORTANT MUST ATTENTION Goal:** one canonical feature/spec artifact in the configured native format — planned to the depth the triage needs, cases reconciled, reviewed and docs-synced.

- **MUST ATTENTION** triage FIRST; it sets plan depth and whether `/plan-review` and `/artifact-review` earn their cost.
- **MUST ATTENTION** resolve the artifact profile before writing; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the gates always hold: user-confirmed decisions, spec chain synced with applicable M1-M7, `/workflow-review-changes` converged inline in the main session, `/workflow-end` closed.
- **MUST ATTENTION** every case names the business intent or invariant it guards and would fail if that intent broke.
- **MUST ATTENTION** one task per selected step; the report in `tmp/reports/` is written first and re-read after compaction.
