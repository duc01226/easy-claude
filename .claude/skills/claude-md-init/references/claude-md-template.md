<!-- CK:UNIVERSAL-GUIDES v6 -->

# {project-name} - Code Instructions

<!-- SECTION:tldr -->
> **Project:** {project-name} — {project-description}
<!-- /SECTION:tldr -->

## First Action Decision

Apply the single CK:WORKFLOW-GATE above. A skill named as a noun is not an invocation; explicit execution requests win. Mixed research/modification intent follows the modification route. Route choice grants no operation authority.

## Project Reference Loading

Read `docs/project-config.json` first, then `docs/project-reference/docs-index-reference.md` and `docs/project-reference/lessons.md` before investigating, planning, or coding. Config owns project paths, commands, modules, design-system mappings and conventions; local references override generic defaults. Classify the target and operation, then open only the matching context-group and index-routed detail immediately before the first target read/grep/edit/test; do not treat a hook reminder or prior conversation as proof that a document is loaded. State `Reference docs read: ... | Not applicable: ...`; after compaction, resume, delegation, or a context change, re-read the required docs and restate the set.

| Task | Required detail under `docs/project-reference/` unless config overrides |
| --- | --- |
| Structure, architecture, stack, deployment, setup | `project-structure-reference.md` |
| Backend/CQRS/API/domain/entity | `backend-patterns-reference.md`, `domain-entities-reference.md` |
| Frontend/UI/style/design | `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md` and its applicable canonical design-system doc |
| Integration / E2E tests | `integration-test-reference.md` / `e2e-test-reference.md` |
| Specs, TC authoring, derived indexes | `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`; source Feature Specs under `docs/specs/` for derived artifacts |
| Behavior/public contract or spec-test-code sync | Spec docs above plus `workflow-spec-test-code-cycle-reference.md` |
| Review/audit | `code-review-rules.md` plus applicable domain docs |

If config, root instructions or required docs are missing or stale, run `/project-init` or the narrow `/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init` setup route before ordinary work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; never auto-run it. If required detail remains unavailable, stop and report its exact path; never invent rules or completion.

## Task Planning Rules

Create a small task per change before edits; keep exactly one `in_progress`, complete it immediately after evidence, and include final consistency review. For non-trivial work resolve the active goal contract and observable acceptance criteria; persist findings incrementally to `plans/reports/`. On compaction inspect existing tasks/state and re-read files before continuing. Required quality gates and native host permissions cannot be waived by routing, overlays, delegation or completion pressure.

## Workflow Step Advancement & Parallel Phases

Advance by verified results and task state, never by waiting for a hook. Execute the selected canonical sequence without skipping or reordering gates. Inline and delegated returns use the same acceptance criteria; a return alone is not proof of completion.

Tag independent disjoint-write tasks `PAR`; otherwise `SEQ` with the dependency. Declare waves before work; dispatch all members together and enforce the all-return barrier before the next step or mutation. Record absent conditional triggers as skipped. Never parallelize shared writers, dependent tasks, trivial work, fixed sequence gates or pending approvals. Plan execution fans out only with explicit PAR/SEQ metadata and per-phase write sets; untagged plans run sequentially.

Nested workflows use a sub-agent with incremental report, except `workflow-review-changes` runs INLINE in the main session to own its goal and re-review loop. Its individual reviewers remain delegated. Fan-out is one level unless the agent definition authorizes more. Give each agent its concrete scope, owned files, required context and evidence obligations; verify actual outputs before acceptance.

## Search Existing Code First

Before writing, read target code and `.claude/docs/development-rules.md`; grep 3+ similar patterns and cite `file:line`. Verify matching preconditions before copying conventions. Trace dependencies and downstream consumers before renames/deletions; update affected source-derived docs. Naming and detailed implementation conventions come from applicable project references.

<!-- SECTION:golden-rules -->
<!-- /SECTION:golden-rules -->

## Code Responsibility Hierarchy

Place logic at the lowest invariant owner: Entity/Model > Service > Component/Handler. Mapping/constants/display rules belong to their model/DTO owner; services handle APIs/transformations; UI/handlers delegate. Trace origin → failing consumer and bypass paths before fixing. Protect all consumers at one authoritative layer; never scatter symptom patches. Keep generic framework surfaces project-neutral. Apply YAGNI/KISS/DRY, justify abstractions and operational tradeoffs, and ship only code you can explain.

## Evidence-Based Reasoning & Investigation

Cite traced evidence for claims; distinguish observations from inference. State confidence: >80% to act, 60–80% verify first, <60% do not recommend. Verify behavior-changing recommendations before proposing. For microservices/events scan producers, consumers, sagas, sync calls, shared contracts and data ownership; name owners and additive/breaking risks. Never invent APIs, commands, counts or validation success. Run relevant tests and required reviews; retain failures and investigate their cause without weakening assertions to get green. Verify every affected output against the goal before claiming completion.

## Graph Intelligence

When `.code-graph/graph.db` exists, run at least one graph command on key files before concluding investigation, planning or verification. Use `trace <file> --direction both --json` through `.claude/scripts/code_graph` with the configured Python invocation; follow with connections/callers and source checks. Skip only when the graph database is absent.

## Git & Version-Control Discipline

- Never commit, push, or stage (`git add`) unless the user explicitly asks for that operation. Implementation approval, a workflow or delegated role grants none of these operations.
- Never `git commit --amend`. Create a new commit only when authorized.
- Branch before committing on the default branch (`main`/`master`).
- Read-only inspection needs no permission. Index/worktree/history mutations and external publication must stay within actual user authority; never infer it from a read-only request.
- Preserve unrelated/user work, custom content and existing backups. Never reset, overwrite or delete user data to satisfy a gate. Resolve exact destructive targets and obtain required authority; never access secrets or spend externally without authorization.

## Canonical Ownership

Edit framework source `.claude/**` and root source `CLAUDE.md`. Never hand-edit generated `.agents/`, `.codex/` or `AGENTS.md`; fix their source. Never auto-run `/sync-codex`; after source changes name stale mirrors and instruct the user to run it. Shared SYNC protocols remain inline: change `sync-inline-versions.md` first, propagate every consumer and verify exact bodies/fences. Regenerate affected catalogs and validate every output; no project-specific names in portable surfaces. Root regeneration preserves unmanaged prose or reports overflow explicitly; it never truncates it.

## Project Protocol Overlays

Before each skill, resolve the config-selected skill-protocol index (default `docs/project-reference/skill-protocols-reference.md`). Exact name > glob > `*`; only the winning specificity tier applies. Read matched bare-slug bodies under the configured protocols directory (default `docs/project-protocols/`), never the table Body-link path. Skip malformed names/escaping paths unread; absent registry/no match means no overlay. Overlays add rules; they never override skill obligations, authority, review or confirmation gates. Refuse and report conflicting lines; surface equal-specificity contradictions to the user.

## Design Gate

For user-facing UI creation/reshaping apply BOTH usability/accessibility `UI-1.1`–`UI-9.4` and identity `DD-1`–`DD-8`; read `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md` first. Name subject/audience/job; write a reasoned colour/type/layout/principles Design Plan, run the blocking similar-prompt generic test and revise defaults before building. Critique the built page and remove one accessory. Explicit brief wins, then established project design system/ADRs; surface genuine conflicts. Carry the plan and design-system paths into UI agent briefs. State N/A only when no visual surface changes.

UI planning/review/building also applies checklist `CL-1`–`CL-6`: establish platform/context, cite findings, never invent measurements (`NOT VERIFIABLE` when unavailable), rank P0–P4, sweep A–N with F/G/H/L conditional, report in O shape (P triage when constrained). Plans carry platform applicability, eight screen states and accessibility acceptance criteria. Report each defect once across UI/DD/CL.

## Continuous Improvement — Lesson Extraction Gate

Add `Analyze AI mistakes & lessons learned` to non-trivial tasks. Extract the root reasoning failure, generalize to at least three contexts, remove project specifics and consolidate duplicates. Skip nonrecurring lessons; improve the review skill when mechanical review can catch the failure. If recurring and not mechanically catchable, ask the user to run `/learn`; never silently self-edit instructions.

<!-- SECTION:dev-commands -->
<!-- /SECTION:dev-commands -->

<!-- SECTION:e2e-testing -->
<!-- /SECTION:e2e-testing -->

<!-- SECTION:skill-activation -->
<!-- /SECTION:skill-activation -->

<!-- SECTION:doc-lookup -->
<!-- /SECTION:doc-lookup -->

Critical reminders: operate only within user authority; preserve user work and canonical ownership; verify evidence and every required gate before completion.
