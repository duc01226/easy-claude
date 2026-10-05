---
name: workflow-feature-spec
version: 2.0.0
description: "[Workflow] Create or revise the canonical spec for one capability in the configured format, with reviewed cases and reconciled test evidence."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-feature-spec` together with this skill. Call [`/start-workflow workflow-feature-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create ALL selected occurrence tasks before triage, analysis or step execution, including conditional/optional tasks; preserve occurrence IDs, roles and barrier groups. Use native task tools or an equivalent persistent ledger. Then mark the first task `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a task or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate`](../investigate/SKILL.md) (core) → [`/plan`](../plan/SKILL.md) (core) → [`/plan --mode=validate`](../plan/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (gate) → [`/workflow-review-changes`](../workflow-review-changes/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:307b5f149092be5c5a0af9d67f7a600ae46242abc031ac37a9e09babe424f1e3 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** create or update ONE canonical feature/spec artifact for one capability at its configured path — scoped by evidence, planned to the depth the change needs, reconciled with its test/evidence cases, reviewed, and docs-synced. **MUST ATTENTION** resolve the configured artifact profile before writing anything.

**Summary:** Triage and resolve ownership → investigate → plan → confirm decisions → docs/spec/case sync → supplemental spec review when needed → change review → close → handoff. Depth varies with risk; confirmed decisions, reconciled evidence and converged review remain required.

**Use it when** the user asks to write or revise the business spec for a capability. **Use a sibling instead when:** only a raw idea exists → `workflow-idea-to-spec`; the spec must be derived from or re-synced with existing code across capabilities → `workflow-code-to-spec`; code changes are the goal → `workflow-feature` / `workflow-implement-spec`.

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /plan --mode=validate -> /docs-manager --mode=update -> /workflow-review-changes -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged to the run's deviation log. The list above is the recommended default order; the triage below decides which recommendations earn their cost.

## 1. Triage (FIRST action)

Classify the change from the request plus the investigate evidence, and record it in the run report:

| Band     | Signal                                                  | Default depth                                                                      |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **XS**   | one rule, one case, or wording in an existing spec      | short plan inside the task list; plan --mode=validate confirms the one decision           |
| **S**    | a few sections/cases of one existing spec, clear intent | written plan; plan --mode=validate confirms the non-obvious decisions                     |
| **M**    | new spec, restructure, UI intent, or many rules/states  | one lean plan + `/plan --mode=validate` + `/pbi --mode=review` on the result                 |
| **L/XL** | several capabilities or buckets                         | split: one spec per capability; route whole-bucket work to `workflow-code-to-spec` |

**Kinds:** behavior change (cases/evidence must be reconciled) · public contract · UI surface (interaction-intent role) · parent/child features (cross-references) · docs-only wording. Escalate depth on ambiguity and risk, not length.

## 2. Required Quality Gates (non-negotiable)

- **Artifact profile resolved** — Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the canonical path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback.
- **Decisions confirmed** — `/plan --mode=validate` confirmed scope and every non-obvious decision with the user.
- **Spec synced** (`spec-synced`) — `/docs-manager --mode=update` routed the spec chain — `/spec` → `/spec [mode=tests]` → test-spec review → `/spec [mode=sync]` — and the artifact satisfies the applicable **M1-M7** mandates (tech-agnostic intent prose, business-visible cases). Every case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.
- **Review converged** (`review-converged`) — `/workflow-review-changes` converged, run INLINE in the main session.
- **Run closed** (`run-closed`) — `/workflow-end` checked every outcome gate (top-level runs only).

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers; generate only project-declared derived outputs. Keep intent roles tech-agnostic; put permitted technical detail only in declared contract/evidence roles. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI features, Section 8 `TC-{FEATURE}-{NNN}` cases with user-visible GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Cross-reference parent/child artifacts as the contract defines them (portable form: each sub-feature references its parent). Unknown mapping or missing required coverage is BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE; never create a README, section or ID registry the native contract does not define.

## 3. Execution Notes

- `/investigate` checks the existing spec, related code and test evidence; `/plan` names the section/case changes at the triaged depth.
- Add a task for `/pbi --mode=review` on the changed spec for M+ bands, new/restructured specs or doubt about M1-M7. It supplies an independent M1-M7 verdict after the docs-manager spec chain and before change review; it is not a registry step.

## 4. Orchestration Freedom

You choose inline vs sub-agent, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the spec change exists before it is reviewed; the spec chain runs before the review that checks it; fixes are re-verified after they land; `/workflow-review-changes` runs inline in the main session; `/workflow-end` runs last; user-approval gates are never parallelized. XS/S work runs inline without sub-agents.

## 5. Memory, Reporting and Fix Path

- One task per selected step; write the run report under `tmp/reports/` FIRST and append per step; re-read it and `TaskList` after compaction.
- Findings are validated before fixing; fix in the owning spec role; re-run the review that raised them. Review loop: round 1 exits on zero open findings (LOW deferral); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 3 review rounds; escalate via `ask user question tool` on no progress.
- Define success criteria before the first edit (the sections, cases and decisions that must exist) and loop until each is observably true.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one canonical feature/spec artifact in the configured native format — planned to the depth the triage needs, cases reconciled, reviewed and docs-synced.

**MUST ATTENTION Main steps:** triage/profile → investigate → plan → validate decisions → docs/spec/case sync → supplemental spec review when needed → change review → close → handoff.

- **MUST ATTENTION** triage FIRST; it sets plan depth and whether `/pbi --mode=review` earns its cost.
- **MUST ATTENTION** resolve the artifact profile before writing; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the gates always hold: user-confirmed decisions, spec chain synced with applicable M1-M7, `/workflow-review-changes` converged inline in the main session, `/workflow-end` closed.
- **MUST ATTENTION** every case names the business intent or invariant it guards and would fail if that intent broke.
- **MUST ATTENTION** one task per selected step; the report in `tmp/reports/` is written first and re-read after compaction.
