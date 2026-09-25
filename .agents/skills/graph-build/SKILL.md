---
name: graph-build
description: '[Code Intelligence] Use when building, updating, or syncing the code knowledge graph. Flag: --scope={full|update|sync} (default auto-detect).'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
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

## Quick Summary

**Goal:** [Code Intelligence] Build, update, or sync the code review knowledge graph. Parses codebase with Tree-sitter into a structural graph (functions, classes, imports, calls, tests) stored in SQLite. Enables blast-radius analysis and graph-powered code review. `--scope` selects the lifecycle operation — `full` (rebuild), `update` (working-tree changes; folds former `/graph-update`), `sync` (committed git changes + working-tree update; folds former `/graph-sync`) — default auto-detects from graph status.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- **Scope flag** (see [Scope Mode](#scope-mode---scope)): default (no flag) auto-detects via `status` (full if never built, else incremental); `--scope=full` forces rebuild; `--scope=update` = uncommitted working-tree changes (CLI `update`, folds `/graph-update`); `--scope=sync` = committed git changes then working-tree update (CLI `sync` + `update`, folds `/graph-sync`).
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Prerequisites

Requires Python 3.10+ on the machine. The graph tooling (`tree-sitter`, `tree-sitter-language-pack`, `networkx`) is installed by [Step 0](#step-0--install-the-graph-tooling-every-scope) on first use; session start installs it only while the graph is active.

## Scope Mode (`--scope=`)

| `--scope`         | CLI verb(s)                        | What it does                                                              | Former skill    |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------- | --------------- |
| _(none, default)_ | `status` → `build` or `update`     | Auto-detect: full build if never built, else incremental update           | —               |
| `full`            | `build --json`                     | Force full rebuild (ignore existing graph)                                | —               |
| `update`          | `update --json`                    | Re-parse uncommitted working-tree changes (staged/unstaged)               | `/graph-update` |
| `sync`            | `sync --json` then `update --json` | Sync committed git changes (last_synced_commit → HEAD), then working tree | `/graph-sync`   |

Default (no `--scope`) auto-detects from `status`. `update` = working-tree changes (base `HEAD~1`, options `--base`/`--repo`). `sync` = committed changes + chained working-tree `update` (the sync→update chain is preserved). Pick `--scope` FIRST (default auto-detect), then run the matching branch.

**Automatic HEAD reconciliation (independent of this skill).** Two hooks call the CLI `sync` directly, so a manual run is rarely needed just because HEAD moved:

| Hook | Fires | Catches |
| ---- | ----- | ------- |
| `graph-session-init` | SessionStart (`startup\|resume`) | Commits that landed while the session was away |
| `graph-prompt-sync` | UserPromptSubmit | A `git pull` / `checkout` / `merge` performed MID-session — gated on a cheap `git rev-parse HEAD` compare, so Python spawns only when HEAD actually moved |

The `graph-auto-update` PostToolUse hook covers file EDITS; these two cover HEAD MOVES. Between them the graph should already be current — reach for a manual `--scope=sync` only to force the issue or after a rebase/force-push.

## Steps

### Step 0 — Install the graph tooling (every scope)

Run these first, from the project root, before any `--scope` branch. Each command is the same on Windows, macOS and Linux. First check the graph mode (it reads the project config the way the hooks do, including a `.claude/.ck.json` relocation), so a project that switched the graph off never downloads the tooling:

```bash
node -e "const g=require('./.claude/hooks/lib/graph-utils.cjs'),c=require('./.claude/hooks/lib/project-config-loader.cjs');if(g.codeGraphMode({config:c.loadProjectConfig()})==='off'){console.log('code graph is off for this project (hooks.codeGraph)');process.exit(1)}"
```

- **Exit 1 with `code graph is off for this project (hooks.codeGraph)`:** stop. Install nothing and run no graph command; tell the user the off message below. Any other non-zero exit: stop and report the error output.

Then install the tooling:

```bash
node -e "const r=require('./.claude/hooks/lib/graph-utils.cjs').ensurePythonDeps(); process.exit(r && r.ok ? 0 : 1)"
```

- **Exit 0:** the tooling is ready (a quick no-op when it is already installed). Continue with the chosen scope.
- **Non-zero exit:** stop. Tell the user the graph tooling could not be installed, that it needs Python 3.10+ on the PATH, and that the manual fallback is `pip install -r .claude/scripts/code_graph/requirements.txt`. Do not run any graph command.
- The install goes into the project-local virtual environment the graph hooks use. If a later `python .claude/scripts/code_graph ...` call fails with a missing-module error, run the same command with the Python this prints: `node -e "console.log(require('./.claude/hooks/lib/graph-utils.cjs').findPython())"`.
- If the mode check or a graph command answers `code graph is off for this project (hooks.codeGraph)`, stop and tell the user: the project config (default `docs/project-config.json`; a `.claude/.ck.json` `portability.projectConfigPath` relocates it) sets `hooks.codeGraph.enabled` to `off` or to a value other than `auto`, `on` or `off`, and building needs `auto` or `on`.

### Default (auto-detect) — build or incremental update

1. **Check availability** — Run via Bash:

    ```bash
    python .claude/scripts/code_graph status --json
    ```

    - If error (Python/deps missing after Step 0): report the error and stop
    - If `last_updated` is null: graph never built → proceed with full build
    - If `last_updated` exists: graph exists → proceed with incremental update

2. **Build or update** — Run via Bash:
    - Full build: `python .claude/scripts/code_graph build --json`
    - Incremental: `python .claude/scripts/code_graph update --json`

3. **Report results** from JSON output:
    - Files parsed, nodes created, edges created
    - Languages detected
    - Any errors encountered
    - Build type (full vs incremental)

### `--scope=full` — force full rebuild

```bash
python .claude/scripts/code_graph build --json
```

Always does a complete reparse (ignores existing graph). Report: files parsed, nodes/edges created, languages, build type.

### `--scope=update` — uncommitted working-tree changes (folds `/graph-update`)

```bash
python .claude/scripts/code_graph update --json
```

Diffs the working tree against a base commit (default `HEAD~1`), re-parses changed/added files, removes deleted files from the graph, then re-runs the API + implicit connectors. Options: `--base <commit>` (default `HEAD~1`), `--repo <path>`. Report: files updated/added/deleted, or "Working tree clean — graph already up to date".

### `--scope=sync` — committed git changes + working tree (folds `/graph-sync`)

1. **Sync committed changes** via Bash:

    ```bash
    python .claude/scripts/code_graph sync --json
    ```

    Diffs `last_synced_commit` → HEAD, re-parses changed/added files, removes deleted files, re-runs connectors, stores new HEAD. If it reports `full_rebuild_fallback` (unreachable commit after rebase/force-push), a full rebuild was triggered — inform the user.

2. **Update working tree** (chained — former graph-sync step 4) via Bash:

    ```bash
    python .claude/scripts/code_graph update --json
    ```

3. **Report:** files synced/added/modified/deleted, then working-tree update results (or "working tree clean").

> **Older checkout is a deliberate no-op.** When HEAD is an ANCESTOR of the graph's `last_synced_commit` — you checked out an older branch or commit the graph already covers — `sync` returns `{"reason": "graph_ahead_skipped"}` and changes nothing: no re-parse, and `last_synced_commit` is NOT dragged backwards. This is intentional. `git diff A..B` succeeds in BOTH directions, so without the guard an older checkout would silently rewrite the graph to the older tree. **Trade-off to know:** while sitting on that older branch the graph describes the newer tree, so it can report symbols the checked-out code does not have; run `--scope=full` if you need the graph to match an older branch exactly. Diverged branches are NOT "behind" (neither commit is an ancestor of the other) and still sync normally.

> **sync vs update:** `sync` detects **committed** changes only (`last_synced_commit` → HEAD; use after pull/merge/checkout). `update` detects **working-tree** changes (staged/uncommitted, mid-session). No `--files` flag on `sync`/`update` (auto-detected from git); there is no `incremental` subcommand (use `update`).

## When to Use

- First time setting up graph for a project
- After major refactoring or branch switches
- If graph seems stale or out of sync
- Graph auto-updates via the PostToolUse hook (file edits) and auto-syncs via the SessionStart / UserPromptSubmit hooks (HEAD moves), so manual builds are rarely needed

## Notes

- Graph stored at `.code-graph/graph.db` (SQLite, auto-gitignored)
- Supported: Python, TypeScript, JavaScript, Vue, Go, Rust, Java, C#, Ruby, Kotlin, Swift, PHP, Solidity, C/C++
- Initial build: ~10s for 500 files. Incremental: <2s

## Connectors (Auto-Run)

After build/update, graph connectors run automatically if configured in `project-config.json`:

- **API Endpoints**: Frontend HTTP calls matched to backend routes (`graphConnectors.apiEndpoints`)
- **Implicit Connections**: Entity events, message bus, command events (`graphConnectors.implicitConnections`)

See `$graph-connect-api` and `.claude/docs/code-graph-mechanism.md` for details.

## DB Performance Indexes

The graph database includes optimized indexes created automatically on first build:

- `idx_nodes_name` — fast node name lookups for search
- `idx_edges_kind_source` — composite index for filtered edge queries (kind + source)
- `idx_edges_kind_target` — composite index for filtered edge queries (kind + target)

These indexes are defined in the init schema and auto-create in any new project on first `graph build`.

## Auto-Connect After Build

After building, the CLI automatically runs:

1. **API connector** — detects frontend HTTP calls matching backend route definitions
2. **Implicit connector** — detects behavioral relationships (entity events, bus messages, command events) based on rules in `project-config.json → graphConnectors.implicitConnections[]`

This creates edges for MESSAGE_BUS, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, and API_ENDPOINT — enabling full system flow tracing via the `trace` command.

## Describe (AI-Friendly Command Reference)

Run `python .claude/scripts/code_graph describe --json` to get MCP-style structured descriptions of all available CLI commands, their parameters, and usage. Useful for AI agents to discover graph capabilities programmatically.

## Valid CLI Subcommands

`build`, `update`, `status`, `blast-radius`, `query`, `connections`, `trace`, `search`, `find-path`, `batch-query`, `sync`, `export`, `export-mermaid`, `connect-api`, `connect-implicit`, `review-context`, `describe`

`migrate-paths` is also available to convert existing databases built with absolute file paths into repo-relative storage without reparsing the repository.

### Common Mistakes (DO NOT USE)

| Invalid Command         | Correct Alternative                                               |
| ----------------------- | ----------------------------------------------------------------- |
| `incremental`           | `update --json` (incremental is the default behavior of `update`) |
| `update --files <list>` | `update --json` (auto-detects changed files via git diff)         |
| `build --files <list>`  | `build --json` (always does full rebuild)                         |
| `sync --files <list>`   | `sync --json` (auto-detects from git)                             |
| `file_summary`          | `connections <file> --json`                                       |

---

# Build Graph

Build or incrementally update the persistent code knowledge graph for this repository.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80%, NEVER guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
