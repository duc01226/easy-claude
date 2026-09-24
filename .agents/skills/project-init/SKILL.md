---
name: project-init
description: '[Utilities] Use when initializing or re-evaluating portable project context — project-config, reference docs, CLAUDE.md, AGENTS.md, static-context setup.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Create complete task plan before shell checks, scans, generators, edits, or skill calls.
> **[IMPORTANT]** The config file is required, but only `project.name` is mandatory; select optional setup work from declared capabilities and repository evidence.
> **[IMPORTANT]** Run `$scan-all` only when selected built-in or generic scan targets apply; custom references default to manual ownership. Run `$workflow-code-to-spec` only for an existing spec corpus or accepted capability scope.

## Quick Summary

**Goal:** Initialize or re-evaluate portable project context through one idempotent route, requiring a valid project identity while configuring only capabilities supported by the project and task.

**Summary:**

- Plan and assess the configured project, then repair the required config until non-empty `project.name` validates.
- Keep always-on context separate from exact task-specific reference selection; add optional capabilities only from evidence.
- Run scan, spec, surface, host, and graph work only when selected; preserve native spec formats or use strict defaults, then verify, review, and report outcomes and skips.

**Workflow:**

1. **Plan Tasks** - Before setup, create task-tracking entries for required setup and review work; include conditional tasks only when their evidence and prerequisites apply.
2. **Assess** - Classify folder state and current context-file health.
3. **Bootstrap** - Require the configured config file with non-empty `project.name`; derive optional properties only from evidence.
4. **Select Context Work** - Ensure always-on `lessons.md` and `docs-index-reference.md` independently of task-specific `referenceDocs`; run only applicable selected/evidenced scans.
5. **Spec Work** - For selected spec work, preserve a valid native `specArtifacts` profile or use the strict TC/Section-8 default when absent. Select the spec workflow only when canonical specs exist or accepted capability scope is available.
6. **Review** - Run the AI-discovery gate across the whole doc set (root context → docs index → every created or changed doc; Phase 4) so its fixes are reviewed, then `$changes-review`, then `$why-review` after setup changes and selected scan/spec work are complete.
7. **Verify** - Validate the required config, declared optional sections, changed docs, selected workflow outcomes, and generated mirrors that apply to this host; re-run the AI-discovery gate only on a doc verification changed.
8. **Graph Refresh** - Run `$graph-build` in a background sub-agent only when graph tooling is available and the project/task needs graph coverage; otherwise record an evidence-backed skip.
9. **Report** - List completed actions, evidence-backed skips, blockers, and remaining manual steps.

**Key Rules:**

- MUST ATTENTION run this before ordinary work when required config/docs/root instruction files are missing.
- MUST ATTENTION preserve user-authored `CLAUDE.md` and `AGENTS.md`; use smart-merge/update paths, never blind overwrite.
- MUST ATTENTION keep reusable skill text project-neutral; local rules belong in project config/reference docs.
- MUST ATTENTION use configured portability paths from `.claude/.ck.json` when present.
- MUST ATTENTION before any shell check, scan, generator, or file edit, create a complete task plan covering assessment, setup routes, final skill calls, verification, report, and lessons.
- MUST ATTENTION treat only the config file and non-empty `project.name` as required; valid omitted capability sections do not make the config incomplete.
- MUST ATTENTION distinguish absent `referenceDocs` (portable baseline, possibly empty, plus evidenced capabilities) from an explicit array (authoritative, including `[]`); always-on `lessons.md` and `docs-index-reference.md` are handled separately.
- MUST ATTENTION run `$scan-all` only for selected/evidenced built-in targets or custom docs explicitly marked `scanTarget: "generic"`; custom docs otherwise remain manual and are not freshness-tracked.
- MUST ATTENTION run `$workflow-code-to-spec` only when an existing canonical spec corpus or accepted project/capability scope supplies a real owner target; code/package names alone are not acceptance.
- MUST ATTENTION if both scan and spec work are selected, run them as siblings and wait for both outcomes; otherwise run only the applicable task.
- MUST ATTENTION preserve valid native `specArtifacts`; absence keeps strict TC/Section-8 defaults; an invalid declared profile blocks spec setup instead of falling back silently.
- MUST ATTENTION keep `$changes-review` then `$why-review` as final review gates after setup changes; report a no-change result when no artifacts were modified.
- MUST ATTENTION run `$graph-build` as a background sub-agent only when graph tooling is available and graph work is relevant; do not make graph support a hidden prerequisite for non-code projects.
- MUST ATTENTION resolve Codex mirrors through the `$ai-context-refresh` completion handoff when Codex context is installed or selected; otherwise record the host-specific step as not applicable.
- MUST ATTENTION when the user asks for help, options, or "what does init decide", run **Help Mode** below and STOP — never start Phase -1.

## Help Mode (`--help`)

**Trigger:** `$ARGUMENTS` contains `--help`, `-h`, `help`, `options`, `what does this set up`, `what will it change`, or any other request to understand the setup surface rather than to run setup.

**Help Mode is read-only and terminal.** It creates no tasks, runs no scan, generates no file, and edits nothing. Answer, then STOP. If the user then asks to initialize, re-enter this skill at Phase -1.

### 1. What init decides (read this out, it is the part that is skill-owned)

| Decision | Inputs it reads | Effect if you get it wrong |
| --- | --- | --- |
| Route (greenfield / bootstrap / repair / re-evaluate) | `session-init-helpers.cjs` state checks in Phase 0 | A repair route run on a greenfield tree overwrites nothing but reports nothing useful; the reverse regenerates context the project already owns |
| Required config identity | the configured project-config path, non-empty `project.name` | Every downstream skill blocks on invalid config |
| Optional capability sections | repository evidence, not the project name | An invented section makes skills demand a lane the project does not have |
| Always-on vs task-specific reference docs | `lessons.md` + `docs-index-reference.md` are always-on; `referenceDocs[]` is task-specific selection | Selecting a built-in doc with no owning scan target leaves a permanently stale file |
| Spec profile | `specArtifacts` (valid native profile) else strict TC/Section-8 defaults | An invalid declared profile BLOCKS spec setup; it never falls back silently |
| Host mirrors | `$ai-context-refresh` completion handoff | Hand-edited `.agents/**` is overwritten on the next sync |

### 2. The option surface it configures

Init writes the project-config file, so the full option catalog is the same one `$project-config --help` renders. Run the generator directly:

```bash
node .claude/skills/project-config/scripts/project-config-help.cjs            # orientation + most-consumed options
node .claude/skills/project-config/scripts/project-config-help.cjs --sections # every option init can write
node .claude/skills/project-config/scripts/project-config-help.cjs --roots    # relocatable roots init resolves
node .claude/skills/project-config/scripts/project-config-help.cjs --docs     # reference docs init selects, and their owners
node .claude/skills/project-config/scripts/project-config-help.cjs --consumers # how much of the framework each option moves
node .claude/skills/project-config/scripts/project-config-help.cjs --current  # what THIS project already declares
```

### 3. Current state of this project (run before answering "what would init do here?")

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify({hasProjectContent:h.hasProjectContent(), isGreenfield:h.isGreenfieldProject()}, null, 2))"
node -e "const s=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify(s.checkProjectConfig(), null, 2))"
node -e "const a=require('./.claude/hooks/lib/agent-files-state.cjs'); console.log(JSON.stringify(a.getAgentFileIssues(), null, 2))"
```

Map the result onto the Phase 1 route table and tell the user which route init would take **and which steps it would skip**, with the evidence for each skip.

**Presentation rules:**

- Show generator output verbatim; it is derived from live sources, so never retype an option list from memory.
- Name skipped steps explicitly. "Not applicable, because <evidence>" is an answer; silence is not.
- For framework-wide help beyond setup (skills, workflows, hooks, project architecture), route to `$project-help`.

## Scope

`$project-init` is the canonical coordinator for portable setup. It does not replace lower-level skills; it decides which one to run and when:

| Concern | Primary route |
| --- | --- |
| Project config | `$project-config`; the configured file is required and its minimum valid content is non-empty `project.name`. Add optional capabilities only from evidence. |
| User/downstream experience | `$experience-review` after a runnable outcome exists; during setup, configure the matrix or record evidence-backed `NOT-APPLICABLE`/`ENVIRONMENT-BLOCKED` |
| Project reference docs | Ensure always-on `lessons.md` and `docs-index-reference.md` separately. Use `$scan-all` only for selected/evidenced applicable targets; use `$docs-init`, a built-in `$scan --target=<key>`, or the configured generic target for a selected stub/focused repair. |
| Root AI context | `$ai-context-refresh` |
| Codex mirror, `AGENTS.md`, `.agents`, `.codex` | Consume the `$ai-context-refresh` completion handoff when Codex context is present or requested; if required and unavailable, report the exact user-run route. |
| Canonical specification and test-case artifacts | `$workflow-code-to-spec` only when canonical artifacts exist or an accepted product/capability scope identifies the owner target. Resolve `specRoots.business.path` when configured; a valid `specArtifacts` profile supplies the native format, while absence keeps strict TC/Section-8 defaults. |
| Knowledge graph | Background `$graph-build` only when graph tooling is available and selected by code relationships or the active task. |

> **Project-init test matrix** — Defines config validity, optional capability selection, reference-doc semantics, spec-profile routing, and project-neutral setup behavior.
> MUST ATTENTION read `references/use-cases-and-test-cases.md` when creating plans, tests, or reviewing changes to this setup.

## Phase -1: Required Task Plan

Before Phase 0 shell checks, create a full task-tracking plan. The plan MUST include many small, observable tasks and MUST NOT start execution until these rows exist.

Minimum required task rows:

1. Read `project-init` instructions and setup reference files.
2. Assess configured config path/status, always-on docs, task-selected references, applicable root instructions/host mirrors, and evidence for optional capabilities.
3. Run `$project-config` when the required config is missing, invalid, or stale; accept a valid config containing only `project.name`.
4. Verify or initialize always-on `lessons.md` and `docs-index-reference.md` independently of task-specific `referenceDocs`.
5. Select scan targets from the exact `referenceDocs` selection or repository evidence; call `$scan-all` only when at least one applicable target exists, otherwise record each evidence-backed skip.
6. Decide whether an existing spec corpus or accepted product/capability scope provides a real spec owner; call `$workflow-code-to-spec` only for that scope, otherwise record an evidence-backed deferral.
7. If both scan and spec work are selected, wait at a barrier until both finish or return an explicit blocker/deferral.
8. Run `$ai-context-refresh` when root instructions are missing or stale; otherwise record the verified state.
9. Resolve Codex mirrors through the completed `$ai-context-refresh` handoff only when Codex context is present or requested.
10. Configure or review `experienceVerification` only for evidenced observable surfaces; do not invent surface commands or baselines.
11. Run the AI-discovery gate (`SYNC:ai-discovery-doc-quality`, Phase 4 doc-set check) on every doc this run created or changed plus the root instruction file and the docs index; route each failure to its owner fix before the reviews.
12. Call `$changes-review` after selected setup/scan/spec work.
13. Call `$why-review` after `$changes-review`.
14. Run focused verification for changed config, selected docs, and generated outputs; run broader harness gates only when the change plan calls for them.
15. Spawn `Spawn background $graph-build sub-agent` only when graph tooling is available and graph work is relevant; otherwise record the evidence-backed skip.
16. Record the graph sub-agent outcome or skip reason.
17. Report the configured identity, changed optional properties, applicable scan/spec outcomes, always-on context, reviews, verification, graph outcome/skip, and remaining actions.
18. Analyze AI mistakes and reusable lessons.

Keep exactly one row `in_progress`. Mark each row `completed` immediately after its evidence is recorded.

## Phase 0: Assess State

Use shell checks, not memory. Record evidence for every state claim:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify({hasProjectContent:h.hasProjectContent(), isGreenfield:h.isGreenfieldProject()}, null, 2))"
node -e "const s=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify(s.checkProjectConfig(), null, 2))"
node -e "const a=require('./.claude/hooks/lib/agent-files-state.cjs'); console.log(JSON.stringify(a.getAgentFileIssues(), null, 2))"
```

Also check:

- Config path: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredProjectConfigPath())"`
- Config status: only the file and non-empty `project.name` are required. A valid config with omitted optional properties is initialized, not a skeleton; repair any invalid declared section before ordinary work.
- Reference selection: absent `referenceDocs` lets the resolver choose its portable baseline (which can be empty) plus evidenced capabilities; an explicit array, including `[]`, is authoritative for task-specific docs. Do not compare it with or restore a full reference catalog.
- Custom reference ownership: `referenceDocs[].scanTarget` is optional. Built-in docs keep their framework target; custom docs default to `manual`, while `generic` opts into one selected evidence-based scan using configured `purpose` and optional `sections`.
- Always-on inputs: check `lessons.md` and `docs-index-reference.md` under the configured project-reference root independently of `referenceDocs`.
- Experience path: inspect `experienceVerification` only when an observable project surface is evidenced or in scope; configuration never substitutes for live evidence.
- Docs index path: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredDocsIndexPath())"`
- Project-reference root: resolve it with `getDocsRoot('projectReference')`; inspect only the always-on docs and task-selected/evidenced references needed for this run.
- Placeholder/stale docs: use `isPlaceholderFile()` and `getStaleReferenceDocs()` for selected task-specific docs, not every file in the reference catalog.
- Spec inventory: inspect a configured or repository-evidenced canonical spec root only when a spec corpus or accepted capability scope is found. A missing default root alone does not select spec creation.

If `specArtifacts` is present, require it to validate before spec work. Preserve a valid native profile; absence keeps the strict TC/Section-8 default when a spec workflow is selected; a malformed declared profile blocks that work rather than silently falling back.

## Phase 1: Decide Route

| State | Action |
| --- | --- |
| Empty folder, no real project content | Do not deep-scan. Create a valid minimal config only when initialization was explicitly requested; derive `project.name` from repository metadata or the root directory. Do not invent capabilities, reference docs, or specs. |
| Greenfield project with manifests/code scaffold | Run `$project-config` when the required config is missing or invalid. Add only metadata and capabilities proven by the manifest/source. Manifests and package names alone do not define accepted product scope. |
| Existing project, config missing or invalid | Run `$project-config` first and stop ordinary setup until the required file validates. A minimal valid config with `project.name` is sufficient when no optional capability is evidenced. |
| Existing project, config valid but optional properties omitted | Treat it as initialized. Add only requested/evidenced capabilities; do not route back to `$project-config` solely to fill every optional section. |
| Custom workflow-route protocol requested (team or machine-only) | Team value → `portability.workflowRouteProtocol` in the configured project-config file; machine-only value → git-ignored `.claude/.ck.local.json` (a valid local value replaces the team value). Runtime-only: never regenerate tracked `CLAUDE.md`/`AGENTS.md`/Codex context to apply it. |
| Configured observable surface is in scope | Preserve existing testing practices. Configure only evidence-backed surface/tool facts, then defer live `$experience-review` until an entry point and inspection capability are available. |
| `e2eTesting.execution` is absent or partial for an evidenced E2E surface | Preserve known facts, then derive only the missing values from the linked surface config, E2E reference, runner configs, package/task scripts, compose/CI files, fixtures/seed scripts, and auth docs. Record `file:line` evidence; never invent commands, ports, accounts, selectors, or secrets. |
| Configured observable surface is relevant but cannot run or be inspected | Record `ENVIRONMENT-BLOCKED` with the missing capability and evidence. Do not substitute a screenshot, source review, or passing automated test for the missing exercise. |
| Always-on `lessons.md` or `docs-index-reference.md` missing/stale | Create/refresh these through their owner setup routes at the configured project-reference root; their lifecycle is independent of task-specific `referenceDocs`. |
| A selected/evidenced task-specific reference is missing, a placeholder, or stale | Run only its applicable built-in scan target or explicitly generic custom target, using `$scan-all` when multiple targets are selected. Manual custom docs remain owner-managed. Explicit `referenceDocs: []` selects no task-specific doc scan. |
| `referenceDocs` absent | Use the resolver's portable baseline (possibly empty) and capability-aware selection from config/repository evidence; keep the property absent unless the project wants a fixed explicit selection. |
| `referenceDocs` explicitly lists a subset or `[]` | Preserve it exactly as task-specific selection. Do not restore unselected catalog entries; continue ensuring always-on docs separately. |
| `CLAUDE.md` missing | Run `$ai-context-refresh --mode init` when the Claude host/root context is in use. |
| `CLAUDE.md` exists but lacks universal guides | Run `$ai-context-refresh --mode update` if marker-managed. If markerless/project-only, manually merge the universal-guide blocks from `ai-context-refresh/references/claude-md-template.md` while preserving project content, then rerun update. |
| `AGENTS.md`, `.agents`, or `.codex` missing/incomplete and Codex is present/requested | Consume the `$ai-context-refresh` completion handoff; if unavailable, report the user-run `$sync-codex` route. |
| Canonical specs exist, or accepted product/capability scope identifies a spec owner | Run `$workflow-code-to-spec` for the selected owner. Existing specs normally select `audit`, or `update` when an active requirement/change is in scope. If no owner/scope exists, defer spec authoring with evidence; code/package names alone are insufficient. |
| Existing native spec profile is valid | Preserve `specArtifacts` and route through its configured identifiers, sections, owners, and carriers. Do not translate it to TC identifiers. |
| `specArtifacts` is absent | When a spec workflow is selected, apply strict business-spec and Section-8 TC defaults. Do not create a profile just to avoid those defaults. |
| `specArtifacts` is declared but malformed/unsupported | Stop spec-related setup, retain the declared profile for diagnosis, and route to `$project-config` to repair it. Never drop the declaration and continue with TC defaults. |
| Graph tool and code relationship scope are available | Run `$graph-build` in a background sub-agent after setup/review/verification; otherwise record an evidence-backed skip. |
| Everything present and valid | Report verified idempotent state. Do not schedule scans, spec creation, or graph work without a selected/evidenced capability. |

## Phase 2: Execute Order

Run required setup in order. Only scan/spec work selected from project evidence may run in parallel. After a material setup phase, re-check the configured project state.

1. **Required config** — run `$project-config` when the configured file is missing, invalid, or stale for an in-scope capability. A schema-valid config with only `project.name` is sufficient when no optional capability applies.
2. **Always-on context** — ensure `lessons.md` and `docs-index-reference.md` at the configured project-reference root through their owner setup routes. This is independent of `referenceDocs`.
3. **Select reference scans** — absent `referenceDocs` uses the portable resolver baseline (which may be empty) plus configured/repository-evidenced capabilities; an explicit array, including `[]`, is authoritative for task-specific docs. Do not merge to a fixed floor, rename files, or generate an unselected reference. Use `$scan-all` only when one or more applicable targets are selected.
4. **Select spec work** — create a task for `$workflow-code-to-spec` only when a canonical spec corpus exists or accepted project/capability scope names the owner to document. If neither exists, record an evidence-backed deferral; code/package names alone do not establish acceptance. Preserve a valid native `specArtifacts` profile; absent profile means strict TC/Section-8 behavior; an invalid declared profile blocks the spec task.
5. **Post-config selected work** — when both scan and spec tasks apply, create them as sibling tasks and run them in parallel when the host supports it; otherwise finish both before crossing the barrier. When only one applies, run only that task. Every selected task must return completed, blocked, or evidence-deferred before final review.
6. **Experience/E2E** — configure or review the `experienceVerification`/`e2eTesting` matrix only for evidence-backed observable surfaces. Use `$experience-review` or E2E workflows when the surface can actually run and be inspected; missing prerequisites are `ENVIRONMENT-BLOCKED`, not PASS/N/A. Never create an expected baseline from current output.
7. **Convention classes** — run the detector only when stable `contextGroups` or convention injection is selected. Apply a write only when the configured preference or explicit request authorizes it; do not turn on injection merely because the detector found candidates. Verify a representative file with `file-conventions.cjs --lookup` when enabled.
8. **Root instructions** — run `$ai-context-refresh --mode init|update` when `CLAUDE.md` or equivalent root context is missing/stale, preserving user-authored content.
9. **Codex mirror** — consume the `$ai-context-refresh` completion handoff when Codex files/host are present or requested; otherwise record the Codex-only step as not applicable.
10. **Enhance** — use `$prompt-enhance` for newly created or materially updated project guidance when prompt quality warrants it.
11. **Verification** — validate config, selected references, root files, and mirrors that apply; run focused checks for changed behavior.
12. **Graph refresh** — after verification and reviews, run `$graph-build` in a background sub-agent only when graph tooling is available and relevant; otherwise record the evidence-backed skip.

## Phase 2.5: Conditional Spec Workflow

When existing canonical specs or accepted product/capability scope selects spec work:

- Resolve the configured business-spec root. Do not infer a new owner from a missing default directory.
- For existing specs, choose `audit` unless an active requirement/code change selects `update`.
- For accepted new capability scope, choose `init-full` for only the accepted scope; apply the workflow's large-scope decomposition rules to that set.
- Use the existing valid `specArtifacts` profile as the native section/ID/case format. If absent, apply strict business-spec and Section-8 TC defaults. If malformed/unsupported, stop spec setup and repair through `$project-config`; do not drop it or fall back silently.
- If no existing spec owner or accepted capability scope exists, do not call the spec workflow to manufacture one. Report the evidence and the route needed to establish scope.

## Phase 2.6: Final Review Skills

After selected setup, scan, and spec work, create and execute these final tasks in order:

1. `Run the AI-discovery gate` - the Phase 4 doc-set check, run BEFORE the reviews so any doc it fixes is reviewed.
2. `Call $changes-review` - run after all selected setup, scan, and spec work so changed config/context/artifacts are reviewed from the current diff.
3. `Call $why-review` - run after `$changes-review` to validate rationale and avoid closing on unchallenged setup decisions.

If a listed task's skill cannot run because the environment lacks the required tool, stop and report the missing tool. If no files changed, still record that result rather than claiming a review of nonexistent changes.

## Phase 3: Hookless Agent Rule

For Codex or any environment where the Claude-specific hook set is unavailable:

- If the configured project-config file, always-on docs, applicable root instruction files, or a task-required reference doc is missing or stale, invoke `$project-init` before ordinary task work. Resolve config/index paths through the configured path helpers and the reference root through `getDocsRoot('projectReference')`.
- If `$project-init` cannot run because required tools are absent, report the missing tool and the exact lower-level route that remains.
- Do not proceed with project-specific coding from guessed context.

## Phase 4: Verification

Verify the required project identity, every declared optional property, and each changed or selected output before declaring setup complete. A valid config containing only non-empty `project.name` passes when no optional capability applies.

```bash
node -e "const{spawnSync}=require('child_process');const path=require('path');const configPath=require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredProjectConfigPath();const result=spawnSync(process.execPath,[path.resolve('.claude/hooks/lib/project-config-schema.cjs'),'--validate',configPath],{stdio:'inherit'});if(result.error){console.error(result.error.message);process.exitCode=1}else process.exitCode=result.status??1"
node -e "const l=require('./.claude/hooks/lib/project-config-loader.cjs');console.log(JSON.stringify({docsIndex:l.getConfiguredDocsIndexPath(),referenceRoot:l.getDocsRoot('projectReference')},null,2))"
node .claude/skills/skill-creator/scripts/validate-skills.cjs --path .claude/skills/project-init
```

For setup behavior changes, run focused tests that cover the changed contract. For example, use `node .claude/hooks/tests/run-all-tests.cjs --filter=init-reference-docs` when changing reference selection, and `--filter=docroot-relocation` or `--filter=reference-doc-freshness` when those behaviors changed. Do not run the full hook suite merely because project initialization completed; include broader harness checks when the framework-change plan requires them.

For selected spec work, confirm:

- Confirm an existing canonical owner or accepted capability scope selected the work; otherwise do not create specs or test cases and record the evidence-backed deferral.
- Confirm the configured business-spec root resolves through `getSpecDocsPath()` only when selected spec work needs it; the default is `docs/specs` (a `specRoots.business.path` entry in `docs/project-config.json` overrides it).
- Preserve and validate a declared native `specArtifacts` profile. When absent, use strict TC/Section-8 defaults for the selected spec work; malformed declarations block that work.
- Apply the spec workflow's large-scope decomposition rules only to the accepted scope actually selected.

For selected observable-surface work, validate only declared or evidenced surfaces. Configuration is not live-review evidence; a relevant but unusable surface is `ENVIRONMENT-BLOCKED`, and first-run expectations remain `ACCEPTANCE-PENDING`.

**AI-discovery gate (`SYNC:ai-discovery-doc-quality`) — across the doc set, not per file.** For every doc this run created or changed, plus the root instruction file and the docs index: purpose + critical rules on the first screen and closing reminders when long; the root context's Doc Lookup and the docs index route each question/task class to one doc through a `read <path> when <situation>` trigger; every routed path exists; each selected reference doc is reachable from the root or the index (no orphan); not-applicable docs are named once as a skip. Record each failure as a fix at its owner (`$scan --target=<key>` for a reference doc, `$project-config` then `$ai-context-refresh` for a root-context route or generated section — the Doc Lookup routes only docs selected in `referenceDocs`), never a hand-edit of a generated mirror.

Run `$changes-review` and then `$why-review` after setup and selected work are complete. If no files changed, record that result without claiming a review of nonexistent changes.

Check root instructions and host mirrors only when those hosts/context files are installed or selected. Preserve user content; if Codex mirrors need regeneration, use the documented `$ai-context-refresh` completion handoff, or report the user-run `$sync-codex` route when that handoff is unavailable.

## Phase 5: Conditional Graph Refresh

Run graph work only when graph tooling is available and the project/task has code relationships for which graph coverage helps:

1. When applicable, `Spawn background $graph-build sub-agent` to run `$graph-build` with an evidence-supported scope and return a concise outcome.

Rules:

- When graph work is selected, run it in the required background/sub-agent lane and track it to a returned result or an explicit tool/dependency blocker.
- Existing graph presence is not enough by itself to select a refresh; use the active task's scope and graph freshness evidence.
- When graph tooling or relevant code relationships are absent, record why graph work was skipped.

## Output

Report:

- Folder classification: empty, greenfield, existing, or already initialized.
- Files created/updated/skipped: configured project config, always-on and selected reference docs, applicable root instructions and host mirrors.
- Lower-level skills/scripts invoked.
- Selected reference scans and spec work: outcome plus evidence, or an explicit applicability-based skip/deferral for each.
- Always-on `lessons.md` and `docs-index-reference.md`: configured paths and health, independently of task-specific `referenceDocs`.
- Experience applicability matrix: each configured or observed surface, intended outcome, exercise/inspection capability, evidence status, acceptance state, and limitation/`NOT-APPLICABLE`/`ENVIRONMENT-BLOCKED` reason.
- Final review skill calls: `$changes-review`, `$why-review`, each with outcome and evidence.
- Graph refresh: `$graph-build` sub-agent outcome when selected, or evidence-backed skip.
- Spec workflow: invoked mode (`init-full`, `audit`, `update`), profile validation result, or evidence-backed deferral reason and next trigger.
- Verification commands and results.
- Remaining manual action, especially any user-confirmed `$sync-codex` step.

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** any agent, with or without hooks, reaches a verified project-context state before project-specific work.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** ALWAYS apply critical + sequential thinking; traced proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.
- **AI-Discovery Doc Quality:** every AI-read doc leads with purpose + critical rules, ends with reminders when long, and routes to other docs by trigger to existing targets; no orphan doc.

**IMPORTANT MUST ATTENTION** use `$project-init` as the unified missing-context route; lower-level skills remain implementation steps.
**IMPORTANT MUST ATTENTION** run the AI-discovery gate across the doc set before the final reviews — root context and docs index route every selected doc by trigger, no orphan or dead route; fix each failure at its owner skill.
**IMPORTANT MUST ATTENTION** create task-plan rows for required setup and final reviews; add scan, spec, surface, root-sync, and graph tasks only when evidence selects them.
**IMPORTANT MUST ATTENTION** the configured project-config file and non-empty `project.name` are required; omitted optional properties are valid unless a declared property is invalid.
**IMPORTANT MUST ATTENTION** keep absent `referenceDocs` separate from an explicit selection: absent uses the resolver baseline (possibly empty) plus evidenced capability docs; explicit arrays, including `[]`, remain exact. Always-on lessons/index inputs are ensured independently.
**IMPORTANT MUST ATTENTION** run `$scan-all` only when applicable selected/evidenced scan targets exist; run `$workflow-code-to-spec` only for an existing canonical owner or accepted capability scope.
**IMPORTANT MUST ATTENTION** when both scan and spec work are selected, run them as parallel siblings when supported and wait for both outcomes; otherwise run only selected tasks.
**IMPORTANT MUST ATTENTION** preserve valid native `specArtifacts`; absence uses strict TC/Section-8 defaults when spec work is selected, while an invalid declaration blocks spec work.
**IMPORTANT MUST ATTENTION** run `$graph-build` only when graph tooling exists and relevant code relationships or task needs justify it; record an evidence-backed skip otherwise.
**IMPORTANT MUST ATTENTION** run `$changes-review` and then `$why-review` after setup and selected work; report no-change explicitly.
**IMPORTANT MUST ATTENTION** record explicit blocker for any unavailable required skill/tool; silent skip is not completion.
**IMPORTANT MUST ATTENTION** preserve user-authored root instruction files; do not overwrite project-only content.
**IMPORTANT MUST ATTENTION** rerun Phase 0 after every setup phase because the next route depends on current evidence.
**IMPORTANT MUST ATTENTION** keep reusable setup logic project-neutral; project-specific facts belong in config/reference docs.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Config exists, skip planning" | Create full task plan first; missing-context setup drifts without visible rows. |
| "A valid minimal config looks incomplete" | Require only non-empty `project.name`; derive optional sections from evidence. |
| "Partial reference selection needs the full registry" | Preserve the explicit selection; the catalog is metadata, and always-on inputs are separate. |
| "Package names are enough to define spec scope" | Require an existing canonical owner or accepted scope before creating specs or test cases. |
| "Graph already exists" | Select refresh from graph freshness and task relevance; do not turn graph support into a setup prerequisite. |
| "Review is enough" | Run `$changes-review`, `$why-review`, and all applicable focused verification before reporting. |

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-discovery-doc-quality -->

> **AI-Discovery Doc Quality** — Applies to every doc an AI agent reads to do its job: root instruction files (`CLAUDE.md`, `AGENTS.md`) and their templates, project-reference docs, the docs index, `lessons.md`, and prompt/protocol registries. Such a doc is a routing prompt: the agent must find the right fact fast and never miss a critical rule. Doc layouts differ per project — resolve roots from project config (framework default as fallback) and discover docs by glob; never assume a fixed file set.
>
> 1. **Top (primacy):** the first screen states the doc's purpose, when to read it, and its 1–3 most critical rules — before any detail.
> 2. **Bottom (recency):** a long doc (roughly >150 lines) or one carrying MUST/NEVER rules ends with closing reminders that repeat the goal and those critical rules.
> 3. **Navigate with triggers:** point to another doc as `read <path> when <situation>`, never a bare link or "see also". A root or index doc routes every question/task class to one doc; every AI-read doc is reachable from the root or index — no orphans.
> 4. **Existing targets only:** glob-verify every referenced path and drop dead rows; name a not-applicable doc once as a skip, never as a route.
> 5. **One owner per fact:** state a fact where it is owned and route elsewhere with a trigger. Generated sections and mirrors are fixed at their source (generator, template, config) and regenerated — never hand-edited.
> 6. **Token-efficient:** apply `$prompt-enhance` principles — compress prose, lead with the answer, no counts/trees/TOCs an agent can derive (unless a repository-owned check or ADR requires them, e.g. `<!-- COUNT:… -->` markers), one example per non-obvious rule. Never compress code, tables, paths, commands or evidence; never lower rule density.
> 7. **Truncating readers:** when a host reads only a byte budget, place routing and irreversible-action guardrails first and measure their offsets.
>
> **Final gate (each changed doc, before reporting done):** purpose + critical rules on the first screen · reminders at the end when long · every cross-doc pointer has a trigger and an existing target · no orphan doc · hand-owned doc enhanced with `$prompt-enhance` unless the owning skill records a documented skip (e.g. a stamp/count-only edit, or the user asked for no enhance); a generated doc → enhance its source or template, then regenerate. Surgical: apply to what the change touched plus the top/bottom anchors — never a license to rewrite a whole doc.

<!-- /SYNC:ai-discovery-doc-quality -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. A documented command, entry point, or wrapper script gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>` — a single-OS example is an incomplete protocol. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
