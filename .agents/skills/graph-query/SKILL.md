---
name: graph-query
description: '[Code Intelligence] Use when querying code relationships and connections via the knowledge graph.'
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

**Goal:** [Code Intelligence] Query code relationships and connections using the structural knowledge graph. Show related files, callers, callees, imports, tests, inheritance, and file structure. Requires graph to be built first via $graph-build. Triggers on "who calls", "what imports", "related files", "connections of", "depends on", "tests for", "inherits from", "file structure", "graph query".

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Prerequisites

1. **Graph must exist** -- check `.code-graph/graph.db`. If missing, tell user to run `$graph-build` first.
2. Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx.

## Intent Mapping

Map user's question to the appropriate query pattern(s):

| User asks...                                                   | Pattern(s) / Command                   |
| -------------------------------------------------------------- | -------------------------------------- |
| "who/what calls X", "callers of X"                             | `callers_of`                           |
| "what does X call", "callees of X"                             | `callees_of`                           |
| "what does X import", "X depends on", "deps of X"              | `imports_of`                           |
| "who/what imports X", "importers of X", "who references X"     | `importers_of`                         |
| "who uses X", "what uses X", "reverse deps of X"               | `importers_of`                         |
| "what's inside X", "structure of X", "contents"                | `file_summary` (files) / `children_of` |
| "what tests cover X", "tests for X"                            | `tests_for`                            |
| "who inherits/extends X", "subclasses of X"                    | `inheritors_of`                        |
| "show all connections/related files of X", "graph connections" | `connections` command (see below)      |

For composite queries ("show all connections", "related files", "full picture"), use the **`connections`** command instead of running multiple queries manually.

## Workflow

### Step 1: Check graph exists

```bash
ls .code-graph/graph.db 2>/dev/null && echo "OK" || echo "MISSING"
```

If MISSING: stop and tell user to run `$graph-build`.

### Step 2: Identify target

Extract the target from user's question (file path, function name, or class name).

- For files: use relative path (e.g., `{source-root}/utils`)
- For functions/classes: use the name (e.g., `validateInput`) or qualified name (e.g., `{source-root}/utils::validateInput`)

### Step 3: Run query

Execute via Bash with `--json` flag:

```bash
python .claude/scripts/code_graph query <pattern> <target> --json
```

For composite "show all connections" queries, use the **`connections`** command instead:

```bash
python .claude/scripts/code_graph connections <target> --json
```

This returns `file_summary`, `imports_of`, `importers_of`, `callers_of`, and `tests_for` in one call (capped at 20 results per section).

**Tip:** Add `--node-mode file` to `query`, `connections`, or `trace` for a file-level overview with 10-30x less noise. Options: `file`, `function`, `class`, `all` (default).

### Step 4: Handle response status

- **`status: "ok"`** -- Parse `results[]` and `edges[]`, format report (Step 5)
- **`status: "ambiguous"`** -- Multiple matches found. Show `candidates[]` list and ask user to pick one using ask the user directly
- **`status: "not_found"`** -- No match. Suggest: check spelling, use relative file path, try a different name. Optionally run `file_summary` on the parent file to show available names.
- **`status: "error"`** -- Show error message. Common: graph.db missing, Python version too old.

### Step 5: Format results

Present results grouped by relationship type. For each result show:

- **Name** and **kind** (function, class, method)
- **File path** with line numbers (`file:line_start-line_end`)
- **Relationship** (calls, imports, tests, inherits)

**Single query output format:**

```
## {Pattern Description} for `{target}`

Found {N} result(s).

| Name | Kind | File | Lines |
|------|------|------|-------|
| ... | function | {source-root}/file | 10-25 |
```

**Composite query output format:**

```
## Connections of `{target}`

### File Summary
{N} nodes: {list functions/classes}

### Imports (outgoing)
{What this file/module imports}

### Importers (incoming)
{Who imports this file/module}

### Callers
{Functions that call functions in this file}

### Test Coverage
{Tests covering functions in this file}
```

## Semantic Query Protocol (When User Query is Not File-Specific)

When the user asks about a FLOW or BEHAVIOR (not a specific file), follow this protocol:

### Step 0: Grep/Glob/Search to find trace anchors

Use Grep/Glob/Search to find key classes/functions related to the user's query.

- Bug/failure symptom: find the final output reader first (renderer, query, assertion, aggregate, log, stored field), then trace upstream.
- Feature-flow question: find entry points (`CreateX`, `XCommand`, `XHandler`) and trace both directions.

### Step 1: Use graph to expand

Run `connections` or `batch-query` on the grep-discovered files to find ALL related files. For bugs, group results by final reader, storage/projection, writer, consumer/job, and producer/origin.

### Step 2: Trace full system flow

Run the `trace` command to follow the complete chain through all edge types:

```bash
python .claude/scripts/code_graph trace <entry-file> --direction both --depth 3 --json
```

This traces upstream (who calls this?) AND downstream (what does this trigger?) through:
CALLS → TRIGGERS_EVENT → PRODUCES_EVENT → MESSAGE_BUS → API_ENDPOINT

For bug/failure symptoms, run an upstream-first pass from the final output before expanding the suspected producer:

```bash
python .claude/scripts/code_graph trace <final-reader-or-output-file> --direction upstream --depth 5 --json
python .claude/scripts/code_graph batch-query <final-reader> <writer> <producer> --json
```

### Step 3: Verify with grep

For any graph edge that seems surprising, verify with grep that the connection is real.

## Available Query Patterns

| Pattern         | Description                              | Edge Kind             |
| --------------- | ---------------------------------------- | --------------------- |
| `callers_of`    | Functions that call the target function  | CALLS                 |
| `callees_of`    | Functions called by the target function  | CALLS                 |
| `imports_of`    | What the target file/module imports      | IMPORTS_FROM          |
| `importers_of`  | Files that import the target file/module | IMPORTS_FROM          |
| `children_of`   | Nodes contained in a file or class       | CONTAINS              |
| `tests_for`     | Tests covering the target function/class | TESTED_BY + naming    |
| `inheritors_of` | Classes inheriting from the target class | INHERITS / IMPLEMENTS |
| `file_summary`  | All nodes (functions, classes) in a file | (direct lookup)       |
| `trace`         | Full system flow from a target node      | All edge types (BFS)  |

**Aliases** (natural language mappings):

| Alias           | Resolves to     |
| --------------- | --------------- |
| `references_of` | `importers_of`  |
| `uses_of`       | `callers_of`    |
| `who_calls`     | `callers_of`    |
| `who_imports`   | `importers_of`  |
| `depends_on`    | `imports_of`    |
| `subclasses_of` | `inheritors_of` |
| `extends`       | `inheritors_of` |

## Search (Find Nodes by Keyword)

When you don't know the exact name, search first to find candidates:

```bash
python .claude/scripts/code_graph search <keyword> --json
python .claude/scripts/code_graph search <keyword> --kind Function --json
python .claude/scripts/code_graph search <keyword> --kind Class --limit 5 --json
```

Use search to **disambiguate** when a query returns `status: "ambiguous"` — narrow results by `--kind` (Function, Class, File, Type, Test) then use the full qualified_name.

## Find Path (Shortest Path Between Nodes)

Discover how two nodes are connected through the dependency graph:

```bash
python .claude/scripts/code_graph find-path <source> <target> --json
```

Returns the shortest path as a list of nodes. Useful for tracing how a command reaches an event handler, or how a frontend component connects to a backend entity.

**Tip:** If ambiguous, search for exact qualified names first, then use those in find-path.

## Query Filtering and Limiting

Control result size for large codebases:

```bash
# Limit results
python .claude/scripts/code_graph query callers_of <target> --limit 5 --json

# Filter by file path regex
python .claude/scripts/code_graph query importers_of <target> --filter "ServiceName" --json

# Limit connections per section
python .claude/scripts/code_graph connections <target> --limit 10 --json
```

**Implicit connection edge types** (created by `connect-implicit`):

| Edge Kind                | Meaning                                     |
| ------------------------ | ------------------------------------------- |
| `TRIGGERS_EVENT`         | Entity CRUD triggers event handler          |
| `PRODUCES_EVENT`         | Event handler triggers bus message producer |
| `MESSAGE_BUS`            | Message bus producer to consumer            |
| `TRIGGERS_COMMAND_EVENT` | Command triggers command event handler      |

## Batch Query (Multiple Files)

When reviewing multiple files, use batch mode for deduplicated results:

```bash
python .claude/scripts/code_graph batch-query file1 file2 file3 --json
```

Returns: deduplicated nodes + edges (internal + 1-hop external) across all queried files. Single DB connection, no duplicate data.

## Trace (Full System Flow)

Trace all connections from a target node through multiple edge types using BFS:

```bash
python .claude/scripts/code_graph trace <target> --json
python .claude/scripts/code_graph trace <target> --direction both --json
python .claude/scripts/code_graph trace <target> --direction upstream --depth 2 --json
python .claude/scripts/code_graph trace <target> --edge-kinds CALLS,MESSAGE_BUS --json
python .claude/scripts/code_graph trace <target> --direction both --node-mode file --json  # file-level overview
```

Direction options:

- `downstream` (default): Follow outgoing edges. "What happens after X?"
- `upstream`: Follow incoming edges. "What calls/triggers X?"
- `both`: Both directions. "Full flow through X" — use when entry point is a middle file (controller, command handler)

Returns a multi-level tree of connected nodes grouped by BFS depth, with edge types at each level.

## Post-Grep Trace Trigger (run a trace after grep surfaces a key file)

When a grep/glob surfaces an important entry-point file — an entity, command, query, event/command handler, controller, bus message/consumer, component, store, or api-service — immediately run a graph trace on it before concluding. Grep finds files; the trace reveals callers, consumers, bus messages, event chains, and tests that grep CANNOT find:

```bash
python .claude/scripts/code_graph trace <key-entry-file> --direction both --json
```

**Pattern: grep finds files → graph trace reveals full system flow → grep verifies specific details.**

## Anti-Patterns

- **Don't rebuild graph** -- use `$graph-build` for that. This skill only queries.
- **Don't use for change-driven analysis** -- use `$graph-blast-radius` for git-diff-based impact.
- **Don't use for bulk export** -- use `$graph-export` for full graph dump.
- **Don't use for diagrams** -- use `$graph-export --format=mermaid` for Mermaid visualization.
- **Always use `--json` flag** -- ensures structured parseable output.

## Related Skills

- `$graph-build` -- Build or update the graph (prerequisite)
- `$graph-blast-radius` -- Change-driven impact analysis from git diff
- `$graph-export` -- Export full graph to JSON (`--format=json`) or a single file as a Mermaid diagram (`--format=mermaid`)

---

# Graph Query

Query code relationships using the structural knowledge graph. Maps natural language questions to graph CLI queries and formats structured reports.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** start at observed final output, trace backward, hypothesis matrix before fixing.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** every claim needs traced `file:line` proof, confidence >80% to act.

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
