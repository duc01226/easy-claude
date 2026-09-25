<!-- CK:UNIVERSAL-GUIDES v7 -->

# {project-name} - Code Instructions

<!-- SECTION:tldr -->
> **Project:** {project-name} — {project-description}
<!-- /SECTION:tldr -->

## Project Reference Loading

Read `docs/project-config.json` first, then `docs/project-reference/docs-index-reference.md` and `docs/project-reference/lessons.md` before investigating, planning, or coding. Config owns project paths, commands, modules, design-system mappings and conventions; local references override generic defaults. Classify the target, operation and phase you are about to enter (plan, edit, test, spec/doc, review), then open only that row's context-group and index-routed detail immediately before the first target read/grep/edit/test, and state `Reference docs read: ... | Not applicable: ...`. Dedup: a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading; a hook reminder, a summary, or a prior mention never counts. After compaction, resume, a context change, or leaving that window, re-read the required docs and restate the set; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

| Task | Required detail under the reference-docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) |
| --- | --- |
| Plan, investigate, design; structure, architecture, stack, deployment, setup | `project-structure-reference.md`, `domain-entities-reference.md`, plus the edit-row docs for every file type the plan touches |
| Edit or write code | `code-review-rules.md` plus the backend or frontend row below for the file type |
| Backend/CQRS/API/domain/entity | `backend-patterns-reference.md`, `domain-entities-reference.md` |
| Frontend/UI/style/design | Applicable frontend patterns, styling, and design-system docs selected by project config |
| Integration / E2E tests / test data | `integration-test-reference.md` / `e2e-test-reference.md` / `seed-test-data-reference.md` |
| Specs, TC authoring, derived indexes | `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`; source Feature Specs under the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) for derived artifacts |
| Behavior/public contract or spec-test-code sync | Spec docs above plus `workflow-spec-test-code-cycle-reference.md` |
| Review/audit (diff, plan, spec, artifact) | `code-review-rules.md` plus the rows above for every file type under review |

A missing project config is supported. If a declared config section is malformed, or root instructions or required docs are missing or stale, run `/project-init` or the narrow `/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/ai-context-refresh` setup route before ordinary work. A full `/sync-codex` run preflights `CLAUDE.md`; a completed `/ai-context-refresh` run invokes the same standalone runner with `--skip=claude-md`. Markerless roots stay a manual smart-merge boundary unless `portability.requireUniversalGuides: false` is explicit. If required detail remains unavailable, stop and report its path; never invent rules or completion.

Answer a project question (not a change) from its Doc Lookup row below, citing the doc you read — never from framework defaults or memory; for the `.claude` framework itself, read `.claude/docs/README.md` (the user can run `/project-help`).

When you write or update a doc an agent reads (root context, reference docs, docs index, `lessons.md`), keep it discoverable: purpose and critical rules first, closing reminders last when long, and every pointer to another doc as `read <path> when <situation>` to a file that exists, routed from this table or the docs index. The doc-writing skills end with this gate (`SYNC:ai-discovery-doc-quality`).

## Doc Lookup — What to Read When

<!-- SECTION:doc-lookup -->
<!-- /SECTION:doc-lookup -->

## Task Planning Rules

Create a small task per change before edits; keep exactly one `in_progress`, complete it immediately after evidence, and include final consistency review. **Analyze the task graph BEFORE executing** (every host, with or without hooks): once the list exists, split work into delegable tasks, map output dependencies and shared write targets, order them into waves (what runs first, what runs in parallel, what stays `SEQ` and why), declare the wave plan, then dispatch each parallel-safe wave together under the Workflow Step Advancement limits below; re-run the analysis when tasks are added. Serial execution of independent tasks is a defect. For non-trivial work resolve the active goal contract and observable acceptance criteria; persist findings incrementally to `tmp/reports/`. Pin `Original goal:` as the first task, keep a running `User prompts this session: P1…Pn` list, re-read both at each step, before delegation and after compaction, and map the finished result to every prompt before claiming done (`SYNC:session-goal-ledger`). On compaction inspect existing tasks/state and re-read files before continuing. Required quality gates and native host permissions cannot be waived by routing, overlays, delegation or completion pressure.

## Generated Artifact Storage

Store disposable generated output in the project workspace. Treat it as disposable unless its owning contract explicitly declares it a source-of-truth or an intentionally versioned projection. Write temporary state, integration/E2E test results, reports, logs, screenshots, traces, videos, coverage, dumps, candidate evidence, and any other reproducible non-source output under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. The project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Do not place disposable output in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or generated mirror directories; committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned mirrors remain at their declared owner paths.

## Workflow Step Advancement & Parallel Phases

Advance by verified results and task state, never by waiting for a hook. Execute the selected canonical sequence without skipping or reordering gates. Inline and delegated returns use the same acceptance criteria; a return alone is not proof of completion.

Tag independent disjoint-write tasks `PAR`; otherwise `SEQ` with the dependency. Declare waves before work; dispatch all members together and enforce the all-return barrier before the next step or mutation. Record absent conditional triggers as skipped. Never parallelize shared writers, dependent tasks, trivial work, fixed sequence gates or pending approvals. Plan execution fans out only with explicit PAR/SEQ metadata and per-phase write sets; untagged plans run sequentially.

Nested workflows use a sub-agent with incremental report, except `workflow-review-changes` runs INLINE in the main session to own its goal and re-review loop. Its individual reviewers remain delegated. Fan-out is one level unless the agent definition authorizes more. Give each agent its concrete scope, owned files, required context and evidence obligations; verify actual outputs before acceptance.

## Search Existing Code First

Before writing, read target code and `.claude/docs/development-rules.md`; grep 3+ similar patterns and cite `file:line`. Verify matching preconditions before copying conventions. Trace dependencies and downstream consumers before renames/deletions; update affected source-derived docs. Naming and detailed implementation conventions come from applicable project references.

<!-- SECTION:golden-rules -->
<!-- /SECTION:golden-rules -->

## Code Responsibility Hierarchy

Place logic with the owner selected by the project's documented architecture. Resolve it from project config, reference docs, accepted decisions, and existing code; do not assume entity/model/service/component layers or assign mappings, constants, or display rules to a fixed type. Trace origin → failing consumer and bypass paths before fixing. Protect all consumers at one authoritative owner; never scatter symptom patches. Keep generic framework surfaces project-neutral. Apply YAGNI/KISS/DRY, justify abstractions and operational tradeoffs, and ship only code you can explain.

## Evidence-Based Reasoning & Investigation

Cite traced evidence for claims; distinguish observations from inference. State confidence: >80% to act, 60–80% verify first, <60% do not recommend. Verify behavior-changing recommendations before proposing. For microservices/events scan producers, consumers, sagas, sync calls, shared contracts and data ownership; name owners and additive/breaking risks. Never invent APIs, commands, counts or validation success. Run relevant tests and required reviews; retain failures and investigate their cause without weakening assertions to get green. Verify every affected output against the goal before claiming completion.

## Graph Intelligence

When `.code-graph/graph.db` exists, run at least one graph command on key files before concluding investigation, planning or verification. Use `trace <file> --direction both --json` through `.claude/scripts/code_graph` with the configured Python invocation; follow with connections/callers and source checks. Skip only when the graph database is absent.

## Git & Version-Control Discipline

- Never commit, push, or stage (`git add`) unless the user explicitly asks for that operation. Implementation approval, a workflow or delegated role grants none of these operations.
- Commit through the `commit` skill, never a raw ad-hoc `git commit`: the skill runs the review-before-commit gate, and `review-commit-gate.cjs` blocks an agent commit whose changeset has no review fix-loop receipt (`changes-review --fix-loop` / `why-review --fix-loop` / `workflow-review-changes --fix-loop`) or user-approved skip. On a commit request, `commit-skill-route.cjs` (UserPromptSubmit) reminds the agent to run the skill (`$commit` on Codex).
- Amend only on an explicit amend request (a plain commit request makes a new commit), and never a pushed commit or one this task did not create: `git commit --amend` and `git reset --soft HEAD~1` + commit produce the same commit and follow the same rules, including the review receipt (against HEAD's parent).
- Branch before committing on the default branch (`main`/`master`).
- Read-only inspection needs no permission. Index/worktree/history mutations and external publication must stay within actual user authority; never infer it from a read-only request.
- Preserve unrelated/user work, custom content and existing backups. Never reset, overwrite or delete user data to satisfy a gate. Resolve exact destructive targets and obtain required authority; never access secrets or spend externally without authorization.

## Canonical Ownership

Edit framework source `.claude/**` and root source `CLAUDE.md`. Never hand-edit generated `.agents/`, `.codex/` or `AGENTS.md`; fix their source. `/sync-codex` owns mirror generation, while an explicit `/ai-context-refresh` completion may invoke its standalone runner after final source edits; unrelated work must not auto-run the mutating pipeline. Shared SYNC protocols remain inline: change `sync-inline-versions.md` first, propagate every consumer and verify exact bodies/fences. Regenerate affected catalogs and validate every output; no project-specific names in portable surfaces. Root regeneration preserves unmanaged prose or reports overflow explicitly; it never truncates it.

## Project Protocol Overlays

Before each skill, resolve the config-selected skill-protocol index (default `docs/project-reference/skill-protocols-reference.md`; a `referenceDocs` entry in `docs/project-config.json` overrides the path). Exact name > glob > `*`; only the winning specificity tier applies. Read matched bare-slug bodies under the configured protocols directory (default `docs/project-protocols/`), never the table Body-link path. Skip malformed names/escaping paths unread; absent registry/no match means no overlay. Overlays add rules; they never override skill obligations, authority, review or confirmation gates. Refuse and report conflicting lines; surface equal-specificity contradictions to the user.

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

Critical reminders: operate only within user authority; read the project config, docs index, `lessons.md` and the matching Doc Lookup row before answering or editing — never from memory; preserve user work and canonical ownership; map task dependencies and parallel waves before executing; verify evidence and every required gate before completion.
