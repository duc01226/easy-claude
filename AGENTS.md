# Codex Project Instructions

<!-- CLAUDE-MIRROR:START -->
## Claude Instructions Mirror (Auto-Synced)

This block is auto-generated from `CLAUDE.md` by `npm run codex:sync:context`.
Do not edit manually; update `CLAUDE.md` and re-sync.

<!-- CK:UNIVERSAL-GUIDES v6 -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about… | Default route |
> | --- | --- |
> | A simple, straightforward task with a clear target and low risk | **direct execution** — do it without a workflow |
> | A simple task that needs a few coordinated steps or skills | **custom simple workflow** — sequence only the necessary skills/steps |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `$start-workflow workflow-bugfix` |
> | A non-trivial new feature, capability, or enhancement | **`workflow-feature` workflow** — `$start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause | that skill / workflow |
> | A one-off question, or a truly trivial edit | direct execution |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Analyze whether the task is simple and straightforward before defaulting to a standard workflow.** If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. **For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.** Do not expand to a full standard workflow when a small custom sequence is enough.
> 4. **Use standard workflows for non-trivial bugs and feature/enhancement work** — they force the investigation, tests, and review that risky or broad changes need.
> 5. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `$start-workflow <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the skill invocation.
>     - **Custom simple workflow →** create a small task list from the selected skills/steps, then execute them in order.
>     - **Direct route →** build the task list yourself, then proceed.
>   In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->














# easy-claude - Code Instructions

<!-- SECTION:tldr -->

> **Project:** easy-claude — Claude Code enhancement framework — hooks, skills, agents, and workflows that extend Claude Code capabilities
>
> **Tech Stack:** javascript, python + claude-code-framework
>
> **Apps/Services:** hooks, hooks-lib, skills, agents, scripts, workflows, docs-framework

<!-- /SECTION:tldr -->

## Workflow Step Advancement & Parallel Phases

<!-- Universal portable rule shipped by claude-md-init into every project — model-driven workflow progression, identical across Claude, Codex (AGENTS.md whole-file mirror), and Copilot (baked common-protocol), none of which depend on a hook. The runtime workflow-protocol injector and any step-tracker hook are accelerators only. -->

Workflow progression is **model-driven** — your responsibility, not a tool/hook/harness signal:

1. **Advancement.** A step is complete when its work returns — whether run **inline** (a skill/step call) OR dispatched as a **sub-agent** (Agent / Task tool). A sub-agent completion advances the step **identically** to an inline call. Do not wait for any hook or tool event to advance; advance by judgment and your task list.
2. **Parallel phase = all-return barrier.** When steps are declared a parallel-phase group, spawn **ALL** members together (one message), then advance **only after EVERY member returns**. Never start the next step — and never start any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."
3. **Workflow-in-workflow → sub-agent.** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `plans/reports/`. This preserves context containment.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Claude, Codex, and Copilot all run without a step-tracking hook and advance entirely by this rule.

---

**Sections:** [TL;DR](#tldr--what-you-must-know-before-writing-any-code) | [Search First](#search-existing-code-first) | [Task Planning](#task-planning-rules) | [Code Hierarchy](#code-responsibility-hierarchy) | [Naming](#naming-conventions) | [Key Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Evidence](#evidence-based-reasoning--investigation) | [Graph Intelligence](#graph-intelligence-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation)

---

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

**Golden Rules (memorize these):**

1. Hooks use CommonJS (require/module.exports)
2. Hook files read stdin JSON and write to stdout/stderr
3. Shared utilities go in .claude/hooks/lib/
4. Test hooks via node .claude/hooks/tests/test-all-hooks.cjs
5. Each skill is a directory with SKILL.md as entry point
6. Skills may have scripts/, references/, and tests/ subdirectories
7. Follow naming conventions in .claude/docs/skill-naming-conventions.md
8. Agent definitions are markdown files in .claude/agents/
9. Follow patterns in .claude/docs/agents/agent-patterns.md

<!-- /SECTION:golden-rules -->

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and platform decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

> **Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task | Pattern |
|---|---|
| New API endpoint | Controller + CQRS Command |
| Business logic | Command Handler (Application layer) |

<!-- /SECTION:decision-quick-ref -->

## Search Existing Code First

Before writing code, you MUST grep/glob for 3+ similar examples and follow the local pattern over generic framework docs. Cite `file:line` evidence in the plan.

1. Grep/Glob for similar patterns (find 3+ examples).
2. Follow the codebase pattern; don't default to framework docs.
3. Provide `file:line` evidence in the plan.

**Why:** projects have local conventions that differ from framework defaults.
**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps).

### Path → Reference Doc (read BEFORE editing the matched path)

| Edited path                                 | Read first                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend / `.cs` (commands, handlers, repos) | `docs/project-reference/backend-patterns-reference.md` — CQRS, validation, entity events        |
| Frontend / UI components, stores            | `docs/project-reference/frontend-patterns-reference.md` — base classes, store, reactive effects |
| Integration tests                           | `docs/project-reference/integration-test-reference.md` — subcutaneous CQRS, real DI, no mocks   |
| E2E tests                                   | `docs/project-reference/e2e-test-reference.md` — Page Object, BDD conventions                   |
| Feature specs / `docs/specs/**`             | `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`                 |
| SCSS / style files                          | SCSS guide — BEM on all elements, no magic numbers, max 3 nesting levels                        |

> **[ROOT-CAUSE-FIX]** Fix at the correct layer (Entity > Service > Handler) — never patch symptoms.

---

## First Action Decision (before any tool call)

1. Explicit slash command (e.g. `$plan`, `$feature-implement`) → execute it.
2. Workflow Catalog has a matching workflow → ask via a direct user question whether to activate the workflow or run the underlying skill directly.
3. No matching workflow AND prompt would modify files → MUST invoke `$plan <prompt>` first.
4. No matching workflow AND prompt is read-only/conversational → answer directly.

**Modification beats research.** When a prompt mixes research and modification intent, treat it as modification (investigation is a substep of `$plan`).

---

## Task Planning Rules

1. Before editing files, MUST create a task tracking item per change.
2. Break work into small todos; add a final review todo.
3. Mark todos `completed` immediately after each one finishes. Keep exactly one `in_progress`.
4. On context loss or compaction, call the current task list first — resume existing tasks, don't duplicate.
5. Recommendations need traced evidence (`file:line`, grep, graph). No speculation.
6. Recommendations that could break behavior require validation before proposing.

---

## Code Responsibility Hierarchy

Place logic in the lowest appropriate layer to enable reuse and prevent duplication.

```
Entity/Model (Lowest)  >  Service  >  Component/Handler (Highest)
```

| Layer            | Contains                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values |
| **Service**      | API calls, command factories, data transformation                       |
| **Component**    | UI event handling only — delegates all logic to lower layers            |

**Anti-pattern:** logic in a component/handler that belongs in the entity → leads to duplicated code.

---

## Naming Conventions

| Type           | Convention       | Example                                       |
| -------------- | ---------------- | --------------------------------------------- |
| Files          | kebab-case       | `context-injector.cjs`, `session-manager.cjs` |
| Hook files     | `<name>.cjs`     | `.claude/hooks/privacy-block.cjs`             |
| Hook libraries | `<name>.cjs`     | `.claude/hooks/lib/project-config-schema.cjs` |
| Skill dirs     | `<skill-name>/`  | `.claude/skills/code-review/SKILL.md`         |
| Agent files    | `<name>.md`      | `.claude/agents/code-reviewer.md`             |
| Constants      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                             |
| Booleans       | Prefix with verb | `isActive`, `hasPermission`, `canEdit`        |
| Collections    | Plural           | `users`, `items`, `employees`                 |

---

<!-- SECTION:key-locations -->

```
/\.claude/hooks/                         # Runtime hooks for session initialization, safety gates, graph maintenance, and code formatting
/\.claude/hooks/lib/                     # Shared utility modules consumed by hooks
/\.claude/skills/                        # Skill definitions for task automation (SKILL.md + scripts)
/\.claude/agents/                        # Agent definitions for specialized subagent roles
/\.claude/scripts/                       # Utility scripts for catalog generation, skill management, and worktree operations
/\.claude/workflows/                     # Workflow definitions for orchestrating multi-step task sequences
/\.claude/docs/                          # Framework documentation — agents, skills, hooks, configuration guides
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

```bash
node .claude/hooks/tests/test-all-hooks.cjs   # hook tests
node .claude/hooks/tests/run-all-tests.cjs    # all suites
```

**Platform (Windows):** invoke Python via `py -3` or `py` — NEVER `python3` (MS Store alias exits 49). Scripts resolve `python` then `py -3` (see `count-drift.test.cjs:29-32`). macOS/Linux: use `python3`.

<!-- /SECTION:dev-commands -->

<!-- SECTION:integration-testing -->

See [integration-test-reference.md](docs/project-reference/integration-test-reference.md) for integration test patterns and setup.

<!-- /SECTION:integration-testing -->

---

## Evidence-Based Reasoning & Investigation

Don't speculate. Every claim about code behavior — and every recommendation for changes — must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — cite `file:line`, grep results, or framework docs. Don't use "obviously…", "I think…" without proof.
2. **State your confidence** — every recommendation lists its confidence level and the evidence it rests on.
3. **Inference alone isn't enough** — upgrade to code evidence when possible. When unsure, say _"I don't have enough evidence yet."_
4. **Cross-service validation** — check all services before recommending architectural changes.
5. **Graph trace before conclusion** — when investigating code flow, run a graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Continuous Improvement — Lesson Extraction Gate

> **[BLOCKING] Self-improvement loop — runs at the end of every non-trivial task.** This is the static, hook-independent home of the `$learn` gate: it binds Claude, Codex, and Copilot equally, with or without any hook firing.

Add a final task — "Analyze AI mistakes & lessons learned" — to every non-trivial task list (see [Task Planning Rules](#task-planning-rules)). At task end, extract lessons by **ROOT CAUSE, not symptom**:

1. Name the **failure mode** (the reasoning/assumption failure), not the symptom — "assumed an API existed without reading the source", not "used the wrong enum value".
2. **Generality test:** does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write it as a **universal rule** — strip project-specific names/paths/classes so it is useful on any codebase.
4. **Consolidate:** multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in a future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review` / `$code-simplifier` / `$security-review` / `$lint` catch this mechanically?" — Yes → improve that review skill instead of writing a lesson.
7. **Both gates pass → ask the user to run `$learn`** to capture the lesson durably. Never silently self-edit instruction files.

---

## Git & Version-Control Discipline

> **[BLOCKING] Hook-independent guardrail — binds Claude, Codex, and Copilot equally.** Where hooks run, `git-commit-block.cjs` enforces this as a hard PreToolUse block; on a hookless host (Codex/Copilot) or an un-wired project this section is the ONLY guardrail — obey it without the block.

1. **Never commit, push, or stage (`git add`) unless the user explicitly asks for it.** "Implement X" / "fix the bug" is NOT permission to commit — finish the work, report what changed, and wait. Only an explicit "commit"/"push" (or an invoked commit skill / git-manager) authorizes it.
2. **Never `git commit --amend`.** Amending rewrites history and can corrupt commits once HEAD has moved — always create a NEW commit. No bypass.
3. **Branch before committing on the default branch.** If asked to commit while on `main`/`master`, create a feature branch first.
4. **Read-only git needs no permission** — `status`, `diff`, `log`, `show`, `branch`, `fetch`, `restore`, `reset HEAD` are always allowed.

**Why:** auto-committing/pushing unprompted publishes unreviewed work and can rewrite shared history — the highest-blast-radius irreversible action an agent can take — so it stays gated on explicit human intent on every host, not only where a hook fires.

---

## Graph Intelligence (when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least one graph command on key files before concluding any investigation, plan, or fix verification. Skip only when `.code-graph/graph.db` is absent.
</HARD-GATE>

### Quick CLI Reference

```bash
python .claude/scripts/code_graph trace <file> --direction both --json                    # Full system flow
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json   # File-level overview
python .claude/scripts/code_graph connections <file> --json                               # Structural relationships
python .claude/scripts/code_graph query callers_of <function> --json                      # All callers
python .claude/scripts/code_graph query tests_for <function> --json                       # Test coverage
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json                       # Multiple files at once
python .claude/scripts/code_graph search <keyword> --kind Function --json                 # Find by keyword
```

**Pattern:** Grep finds files > trace reveals system flow > grep verifies details.

**Routing:** When grep surfaces an important file, or before editing across modules, run a graph trace (see the `graph-*` skills) to map callers/dependents first.

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

When editing files matching these path patterns, pre-read the listed context first:

| Path Pattern | Skill / Auto-Context | Pre-Read Files |
|---|---|---|
| `/\.claude/hooks/.*\.cjs$**` | _(auto-context)_ | `.claude/docs/hooks/README.md` |
| `/\.claude/skills/.*SKILL\.md$**` | _(auto-context)_ | `.claude/docs/skills/README.md` |
| `/\.claude/agents/.*\.md$**` | _(auto-context)_ | `.claude/docs/agents/README.md` |

<!-- /SECTION:skill-activation -->

**Design routing:** SCSS / style files → review-ui / frontend-design skill (BEM conventions live there). UI / HTML / CSS files → design skill (canonical design-system doc: tokens, components, BEM).

---

## Inventory

<!-- Auto-injected by `python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md`. See `docs/adr/0002-canonical-count-metrics.md`. -->

| Kind        | Count                                       |
| ----------- | ------------------------------------------- |
| Skills      | <!-- COUNT:skills -->154<!-- /COUNT -->     |
| Hooks       | <!-- COUNT:hooks -->15<!-- /COUNT -->       |
| Agents      | <!-- COUNT:agents -->29<!-- /COUNT -->      |
| Workflows   | <!-- COUNT:workflows -->17<!-- /COUNT -->   |
| Shared      | <!-- COUNT:shared -->6<!-- /COUNT -->       |
| Lib modules | <!-- COUNT:lib-modules -->25<!-- /COUNT --> |

---

<!-- SECTION:doc-index -->

```
docs/adr/  (2 files)
docs/project-reference/  (15 files)
docs/release/  (1 files)
docs/templates/  (1 files)
```

<!-- /SECTION:doc-index -->

<!-- SECTION:doc-lookup -->

| If user prompt mentions... | Read first |
|---|---|
| Feature specs, capability behavior, business rules, test cases | `docs/specs/` + `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation | `docs/project-reference/backend-patterns-reference.md` |
| Frontend patterns, components, stores | `docs/project-reference/frontend-patterns-reference.md` |

<!-- /SECTION:doc-lookup -->
<!-- CLAUDE-MIRROR:END -->

<!-- CODEX-CONTEXT-MIRROR:START -->
## Codex Context Mirror (Auto-Synced)

This block is auto-generated from `.codex/CODEX_CONTEXT.md` by `npm run codex:sync:context`.
Do not edit manually; update Claude sources and re-sync.

<!-- PROMPT-PROTOCOLS:START -->
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
## Prompt Protocol Mirror (Auto-Synced, Primacy Anchor)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

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
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.
<!-- PROMPT-PROTOCOLS:END -->

## Codex Hookless Project Reference Gate

Codex uses static project-reference loading instead of runtime-injected project docs. Before coding, planning, debugging, testing, or reviewing:

- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.
- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.
- Read `docs/project-reference/lessons.md` for always-on project guardrails.
- For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read the spec routing set named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized.
- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.

<!-- WORKFLOWS:START -->
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
## Workflow Protocol (Hookless)

Use this protocol for workflow execution in Codex (no hook dependency):
1. Detect: execute explicit `$skill`, `$workflow-*`, or `$start-workflow <id>` prompts directly; otherwise match request against workflow catalog and skill list.
2. Analyze: choose the best path: direct execution, skill, standard workflow, or custom step combination.
3. Auto-select: pick the best path yourself without asking the user to choose between direct/skill/workflow/custom options.
4. Activate: execute direct work, invoke the selected skill, start the selected workflow sequence, or run the custom sequence.
5. Tasking: create tasks for each workflow/custom/skill step when the selected path has multiple steps.
6. Execute: run steps in order, validate outputs, and report completion.

Workflow source: `.claude/workflows.json` (17 workflows).

## Workflow Catalog

### Quick Keyword Lookup (match prompt -> workflow)

| If prompt mentions... | Workflow ID | Workflow Name |
| --- | --- | --- |
| implement a large, complex, or ambiguous feature that needs research | `workflow-big-feature` | Big Feature (Research + Implement) |
| a bug, error, crash | `workflow-bugfix` | Bug Fix |
| initial feature spec generation from zero, maintaining spec sync after code changes, quarterly spec health audits | `workflow-code-to-spec` | Code to Feature Spec |
| generate, update, or maintain e2e/playwright tests from code/spec | `workflow-e2e` | E2E Testing |
| implement a well-defined feature, add a component, build a capability | `workflow-feature` | Feature Implementation |
| create or update business feature documentation | `workflow-feature-spec` | Business Feature Documentation |
| start a new project from scratch, init a greenfield project, plan a new application | `workflow-greenfield-init` | Greenfield Project Init |
| po/ba wants a grooming-ready pbi backlog, tdd test specifications, dev ba pic challenge | `workflow-idea-to-pbi` | Idea to PBI |
| turn a raw product idea, vision, or problem statement into one canonical | `workflow-idea-to-spec` | Idea to Feature Spec |
| restructure, reorganize, clean up | `workflow-refactor` | Code Refactoring |
| research a topic from web sources, a business/market viability evaluation, a marketing strategy | `workflow-research` | Research & Synthesis |
| review current uncommitted, staged, or unstaged changes before committing | `workflow-review-changes` | Review Current Changes |
| seed test data, implement data seeders, realistic development environment data | `workflow-seed-test-data` | Seed Test Data |
| fixing a bug update test specs, code changes update test specs, pr review update test specs | `workflow-spec-sync` | Spec Sync (Post-Change) |
| create all pbis from an existing, convert a large feature spec into, dependent pbis from docs/specs | `workflow-spec-to-pbi` | Spec to PBI Backlog |
| visualize, diagram, draw | `workflow-visualize` | Visual Diagram |
| write integration tests for a specific, add test coverage to an untested, update integration tests after code changes | `workflow-write-integration-test` | Write Integration Tests |

### Workflow Details (full sequence + protocol)

### workflow-big-feature — Big Feature (Research + Implement)
- Description: Research-driven feature development for large, complex, or ambiguous features in an existing project — includes idea refinement, market research, business evaluation, domain analysis, tech stack research, and full implementation
- When To Use: User wants to implement a large, complex, or ambiguous feature that needs research, market analysis, business evaluation, domain modeling, or tech stack analysis before implementation. Big new module, major enhancement, cross-cutting capability, or feature where scope is unclear
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> spec -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> plan-validate -> why-review -> plan-execute -> review-domain-entities -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> production-readiness-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
BIG FEATURE PROTOCOL (Research-Driven):
For large/ambiguous features in an existing codebase that need research before implementation.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. Present 2-4 options for every major decision with confidence %
4. New Tech/Lib Gate: evaluate top 3 alternatives before adding any new dependency

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis)
- [x] Tech Stack Research (tech-stack-research)
- [x] User Stories (story)
- [x] Feature Spec Consolidation (spec) — folds story/pbi-mockup into the tech-free 8-section Feature Spec; these are INPUTS, not re-authored
- [x] Test Specifications (spec [mode=tests])
- [x] Test Spec Review (review-artifact --type=spec-tests)
- [x] Implementation Plan (plan)
- [x] Plan Review (plan-review)
- [x] Plan Validation (plan-validate)
- [x] Design Rationale Review (why-review)
- [x] Implementation (plan-execute)
- [x] Domain Entity Review (review-domain-entities) — CONDITIONAL: skip if no domain entity files changed
- [x] Integration Tests (integration-test)
- [x] Review Changes (workflow-review-changes) — consolidated review + fix loop
- [x] SRE Review (production-readiness-review)
- [x] Changelog (changelog)
- [x] Tests (test)
- [x] Documentation (docs-update)
- [x] Summary (watzup)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, component boundaries, data flow, tech choices. Based on: research findings + domain analysis.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, test infrastructure, phased steps. Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.

SECOND PLANNING ROUND:
After stories + reviews are complete, a second $plan + $plan-review cycle runs.
The first $plan (after architecture-design) is high-level architecture based on research + domain analysis.
The second $plan (after review-artifact --type=spec-tests) incorporates the concrete stories, test specifications, dependency tables, and refinement details into a sprint-ready implementation plan with phased steps.
This ensures the implementation plan reflects all discovered requirements, test strategy, and story dependencies.

TEST SPECIFICATIONS (after review-artifact --type=story, BEFORE second plan):
After stories are reviewed, write TDD specs ($spec [mode=tests]) based on story acceptance criteria.
Review specs ($review-artifact --type=spec-tests) for coverage and correctness.
The second $plan then incorporates test strategy alongside implementation tasks.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
For existing projects adding a new module, adapt scaffolding to extend existing base classes rather than creating duplicates.
MANDATORY SPEC-DRIVEN BIG-FEATURE GATES:
- Read docs/project-reference/spec-principles.md before $story and $spec [mode=tests] to lock intent and non-negotiable invariants.
- $spec [mode=tests] + $review-artifact --type=spec-tests MUST map each invariant to Section 8 TC IDs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine flows, tests MUST assert persisted state transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-bugfix — Bug Fix
- Description: Systematic debugging and fix workflow with end-to-start debugger trace before fix
- When To Use: User reports a bug, error, crash, failure, regression, stale/incorrect final output, or something not working; wants to fix/debug/troubleshoot an issue with end-to-start trace
- Sequence: `scout -> investigate -> debug-investigate -> spec [mode=amend] -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> integration-test -> fix -> prove-fix -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> workflow-review-changes -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
BUG FIX PROTOCOL (TDD-FIRST):
PROJECT CONTEXT: Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Read docs/project-config.json and docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may implement or review when this context is synced.
1. Scout: Find files related to the reported issue
2. Investigate: Understand current vs expected behavior and unchanged behavior that must be preserved
   IMPORTANT: When analyzing 'unused' code during investigation:
   - Follow Investigation Protocol (CLAUDE.md)
   - Require grep evidence, confidence >=80%, cross-module/service checks (see docs/project-config.json → workflowPatterns.crossModuleValidation)
   - Use $investigate skill for removal/refactoring decisions
3. Debug: Identify root cause with evidence (file:line)
3b. END-TO-START DEBUGGER TRACE GATE: Start at the observed final symptom/output, identify the final reader, trace backward through storage/projection, writer, consumer/job, producer/origin, enumerate all feeder paths, and build a hypothesis matrix. BLOCKED until owning fix layer and forward convergence proof are written.
4. Plan fix with minimal blast radius
5. Validate plan before implementing
6. Validate fix rationale with $why-review
6b. SPEC-BUG GATE — Run BEFORE writing regression TCs:
   Ask: "Is this a Code Bug or a Spec Bug?"
   • CODE BUG (code doesn't match spec — most common): Spec correctly describes expected behavior. Code diverged. Proceed to step 7.
   • SPEC BUG (spec documented wrong behavior; code implemented the spec faithfully): Do NOT write regression TCs yet. First run $spec [mode=update] to correct the affected Feature Spec sections (§1-7, plus §8 if a TC encoded the wrong behavior). Then return to step 7.
   • AMBIGUOUS: Ask user: "Did the spec ever correctly document this behavior?"
   SIGNAL: Spec MATCHES buggy code → Spec Bug. Spec says X but code does Y → Code Bug.
7. Write test specs ($spec [mode=tests]): Create TC specs asserting the CORRECT (fixed) expected behavior — not the buggy behavior. These become the regression guard.
8. Review test specs with $review-artifact --type=spec-tests
9. WRITE INTEGRATION TEST — RED phase: Implement integration test(s) based on the bug reproduction spec. Run the test(s) — they MUST FAIL. A passing test means it does NOT actually catch the bug. Never proceed to fix until the test(s) fail.
10. Fix the identified issue
11. PROVE FIX: Build code proof traces per change, confidence scores, stack-trace-style evidence. MANDATORY — never skip.
12. RE-RUN INTEGRATION TESTS — GREEN phase: Run integration tests again — expect all to PASS. This confirms the fix resolves the bug AND regression guard is in place.
13. Review integration tests with $integration-test-review — verify tests have real assertion value, not just smoke/existence checks.
14. Code review for quality and regression risk
15. Update changelog
16. Run full test suite to verify fix and no regressions
17. Summary report of fix and verification results

PERFORMANCE-SDD ROUTE: If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run $test and relevant functional checks when behavior can change. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY INVARIANT-PRESERVING BUGFIX LOOP:
- Do not encode buggy behavior into specs/tests. Confirm intended invariant from spec docs first.
- $spec [mode=tests] MUST capture preserved invariants and newly-fixed invariants explicitly.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): regression tests MUST assert entity state before/after transitions and invalid transition rejection.
- RED/GREEN harness proof is mandatory: first $integration-test must fail on the bug, second $integration-test must pass after fix.
- $workflow-end is BLOCKED until specs, TCs, and test code are synchronized via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→fix→tests→review loop): the regression §8 TCs must include universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the bug touched — not just the single reproduction example — backed by property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the fixed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only patch. Re-review the whole package (spec + tests + fix, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-code-to-spec — Code to Feature Spec
- Description: Code-to-spec — authors and maintains ONE canonical artifact per capability FROM existing code: the tech-free 8-section Feature Spec at docs/specs/{Bucket}/README.{Feature}.md (code is the technical source of truth; derived bucket INDEX/ERD are regenerable aids). Modes: init-full (zero → Feature Specs), update (incremental sync from code changes), audit (staleness check). For idea→spec (no code yet) use workflow-idea-to-spec.
- When To Use: Initial Feature Spec generation from zero docs, maintaining spec sync after code changes, quarterly spec health audits, before tech migrations, after major features land — authors + three-way-syncs the canonical Feature Spec. Use spec-index instead when only regenerating derived indexes/ERDs.
- Sequence: `scout -> plan -> plan-review -> plan-validate -> spec -> spec [mode=tests] -> review-artifact --type=spec-tests -> review-artifact -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SPEC-DRIVEN-DEV PROTOCOL:
Modes: init-full | update | audit.
Step 0: auto-detect mode, map changed services → App Bucket, confirm capability name(s).
Scale gate: 4+ capabilities = MUST spawn one spec sub-agent per capability in ONE message.
ONE canonical artifact: docs/specs/{Bucket}/README.{Feature}.md (tech-free 8-section Feature Spec; §5 holds the Mermaid ERD INLINE). No separate A-E engineering tree — code is the technical source of truth. Derived bucket INDEX.md/ERD are optional regenerable aids (spec-index mode=index).
Update mode: git diff → impact map → spec [mode=update] (§1-7) → spec [mode=tests] (§8) → review-artifact --type=spec-tests → spec [mode=sync] (§8 ↔ test code) → optional spec-index index refresh.
New PBI/requirement update mode: run dor-gate when a new/changed PBI is being made implementation-ready; run pbi-mockup only for UI/user-journey changes.
Audit mode: compare Feature Spec git-history timestamps vs source-code git log → staleness reports.
See .claude/skills/workflow-code-to-spec/SKILL.md for full protocol.
MANDATORY SPEC-DRIVEN SYNC GATES:
- Three-way sync contract (Feature Spec §1-7 ↔ §8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
- Run docs-update as a near-final sync before workflow-end; watzup runs after workflow-end for every mode to keep Feature Specs and derived indexes aligned.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (extract spec→derive properties→sync tests→re-review loop): when generating §8 from code, derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the code enforces — not just example scenarios; the test-quality bar for the synced tests is the MUTATION-SCORE gate (a surviving mutant on the spec'd core-logic = a missing invariant → write the killing test), NOT line-coverage %. Any behavior the spec and tests do not jointly cover feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE). Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-e2e — E2E Testing
- Description: Generate, update, or maintain E2E/Playwright tests — source-parameterized (changes | recording | update-ui)
- When To Use: User wants to generate, update, or maintain E2E/Playwright tests from code/spec changes (--source=changes), a Chrome DevTools recording (--source=recording), or for UI screenshot baselines (--source=update-ui)
- Sequence: `scout -> e2e-test -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
E2E WORKFLOW (source-parameterized):
Resolve --source={changes|recording|update-ui} and follow the matching protocol block in .claude/skills/workflow-e2e/SKILL.md:
- changes: detect change type from git diff (spec/code/API) -> load affected TC-{FEATURE}-{NNN} -> update/generate test implementations -> ensure each TC has a corresponding test -> run tests -> report coverage.
- recording: validate recording JSON -> identify app/feature -> run convert-recording.ts -> map TCs to recording steps -> apply project CSS conventions (docs/project-config.json → workflowPatterns.cssMethodology) -> add screenshot assertions -> Page Object if complex -> run + report.
- update-ui: identify visual diff (SCSS/HTML/TS) -> map to page objects -> find affected specs -> regenerate screenshots (--update-snapshots) -> visual review old vs new -> confirm intentional with user -> report.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (E2E tier — tailored): trace each E2E scenario to the §8 invariant/behavior it guards (name the protected rule, not just the click path) so a scenario fails only when that intended behavior breaks. Property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to unit/integration core-logic and are N/A at the E2E tier — do NOT force them here. Any coverage gap found feeds the Dual-Feedback Ledger into BOTH the spec (the missing/changed behavior) AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only fix.
```

### workflow-feature — Feature Implementation
- Description: Full feature development workflow with search-first approach, planning, implementation, testing, and documentation
- When To Use: User wants to implement a well-defined feature, add a component, build a capability, develop a module, implement/execute an existing plan, create a new API endpoint, or design an API contract, TDD/test-first development, spec-driven feature implementation with test specs written before code
- Sequence: `scout -> investigate -> domain-analysis -> why-review -> spec -> plan -> plan-review -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> plan-execute -> review-domain-entities -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> production-readiness-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
FEATURE IMPLEMENTATION PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns and docs/project-reference/docs-index-reference.md for project-specific architecture, test, documentation, naming, and CSS conventions. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Any supported AI tool may implement or review when this context is synced.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar features, patterns, and implementation examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
2b. Domain Analysis — CONDITIONAL: if feature creates/modifies domain entities, run $domain-analysis after investigate to model bounded contexts and ERD before planning.
3. Author Feature Spec: with $spec BEFORE planning, capture intended behavior — §1-7 business rules, invariants, and acceptance criteria the plan and tests are built against. Validate investigation + spec rationale with $why-review.
4. Plan: Design solution following discovered project patterns (architecture, state management, CSS — see docs/project-config.json → workflowPatterns). Include expected behavior, unchanged behavior, and docs/spec/test sync when behavior can change.
5. Validate plan via $plan-review then $plan-validate before any code changes; confirm design rationale with $why-review.
6. Write test specifications with $spec [mode=tests] (before implementation). Review with $review-artifact --type=spec-tests.
7. Update plan with test strategy via $plan (re-plan cycle). Review with $plan-review.
8. Implement with $plan-execute (backend + frontend) — guided by test specs
8b. Domain Entity Review — CONDITIONAL: if domain entity files created/modified, run $review-domain-entities before updating test specs to catch DDD quality issues early.
9. Update test specs to catch implementation gaps with $spec [mode=tests]. Review with $review-artifact --type=spec-tests. Sync §8 TCs ↔ integration test code with $spec [mode=sync].
10. Generate/update integration tests with $integration-test — creates actual test files from TC specifications — then verify with $integration-test-review and $integration-test-verify.
11. Review the full change set with $workflow-review-changes (simplification, code quality, UI, architecture, and patterns compliance).
12. SRE review for production readiness with $production-readiness-review; security review with $security-review.
13. Update changelog with feature entry
14. Run tests to verify no regressions
15. Update documentation if feature impacts business docs
16. Summary report of all changes ($workflow-end + $watzup)

PLAN PHASES:
- PLAN₁ (after investigate): Feature design plan. Scope: architecture, file changes, implementation approach.
- PLAN₂ (after review-artifact --type=spec-tests): Updated plan incorporating test strategy. Scope: refine PLAN₁ with test infrastructure, test data setup, spec coverage gaps.

GUARDRAIL: Provide file:line evidence of pattern search in plan. Follow project conventions over generic docs.

PERFORMANCE-SDD ROUTE: If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do NOT skip $plan-execute. If behavior can change, run $test and relevant functional no-regression checks. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY SPEC-DRIVEN + INVARIANT + TEST HARNESS LOOP:
- Read docs/project-reference/spec-principles.md before $plan and lock feature intent + non-negotiable invariants.
- $spec [mode=tests] MUST map every invariant to TC IDs in §8 Test Specifications.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle behavior, tests MUST assert persisted entity state transitions and invalid-transition rejection.
- $workflow-end is BLOCKED until Feature Spec §1-7, §8 TCs, and test code are synchronized via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY): the $spec authored BEFORE $plan captured intended behavior; after $plan-execute the implemented behavior may have diverged. Before closure, re-verify Feature Spec §1-7 against what was actually built and adjudicate any divergence per SYNC:spec-drift-adjudication (shared/sdd-artifact-contract.md Drift Gates) — CODE-WRONG -> fix code; SPEC-STALE -> run $spec [mode=update] to record the new intended behavior. This is not optional cleanup: a feature that shipped behavior the spec does not describe leaves the spec stale.
- If mismatch exists (spec vs code vs tests), run $spec [mode=update] + $spec [mode=tests] before closure.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-feature-spec — Business Feature Documentation
- Description: Business feature documentation with tech-free 8-section Feature Spec template enforcement, plan validation, and mandatory test coverage (TCs in Section 8)
- When To Use: User wants to create or update business feature documentation under the fixed docs/specs Feature Spec root
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> workflow-end -> watzup`

Protocol:
```text
Role: Documentation Specialist
BUSINESS FEATURE DOC PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns.featureDocTemplate to find and read the feature doc template — follow its section requirements exactly. Use docs/specs/ for the docs directory.
- TC-{FEATURE}-{NNN} test case format with GIVEN/WHEN/THEN
- Evidence field with `[Source: namespace/service/id]` abstract-anchor format (never physical file:line)
- Cross-reference parent features if sub-feature

MANDATORY UPDATE CHECKLIST (when updating existing docs):
- ALWAYS update the Test Specifications section when documenting new functionality
- Plan MUST ATTENTION include all impacted sections identified from diff analysis
- Plan MUST ATTENTION be validated via $plan-review and $plan-validate before any edits begin

OUTPUT: Complete feature README following template sections.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-greenfield-init — Greenfield Project Init
- Description: Full waterfall project inception from idea through implementation with integration testing
- When To Use: User wants to start a new project from scratch, init a greenfield project, plan a new application, research and plan before coding, bootstrap a new codebase, build something new
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> security-review -> performance-review -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> plan-validate -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> linter-setup -> harness-setup -> why-review -> plan-execute -> review-domain-entities -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> production-readiness-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
GREENFIELD PROJECT INCEPTION PROTOCOL:
You are acting as a Solution Architect for a brand-new project.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. All tech recommendations include confidence % and evidence
4. Present 2-4 options for every major decision
5. Delegate architecture decisions to solution-architect agent
6. After workflow activation, auto-select applicable steps and skip irrelevant conditional steps
7. NEVER ask tech stack upfront — business analysis first, tech stack research after domain analysis
8. Domain analysis produces ERD + bounded contexts BEFORE tech stack research
9. Tech stack research compares top 3 options per layer with detailed pros/cons

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis) — NEW
- [x] Tech Stack Research (tech-stack-research) — NEW
- [x] Implementation Plan (plan)
- [x] Plan Validation (plan-validate)
- [x] Test Strategy (spec [mode=tests]) — includes integration test strategy
- [x] User Stories (story)
- [x] Final Review (plan-review)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, layer boundaries, component responsibilities, tech choices. Followed by $security-review + $performance-review review of the architecture.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, scaffolding needs, test infrastructure. Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan. Scope: test file structure, test data setup, CI integration. Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.

SECOND PLANNING ROUND:
After stories + TDD specs are generated and reviewed, a second $plan + $plan-review cycle runs.
This second plan incorporates the concrete stories, test specs, and dependency tables into a detailed implementation plan.
The first plan is high-level architecture; the second plan is sprint-ready with phased implementation steps.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
The scaffolded project should be copy-ready as a starter template for similar projects.

IMPLEMENTATION & INTEGRATION TESTING (after scaffold):
After scaffolding, the workflow continues with full implementation and integration testing:
1. $why-review validates design rationale before coding
2. $plan-execute implements the feature (backend + frontend)
3. $review-domain-entities reviews domain entity DDD quality — CONDITIONAL: skip if no domain entity files in changeset. Detects anemic model, missing invariants, VO misclassification before integration tests are written.
4. $spec [mode=tests] writes test specifications (feature doc Section 8)
5. $review-artifact --type=spec-tests validates spec coverage and correctness
6. Third $plan + $plan-review cycle plans integration test architecture
7. $integration-test generates integration tests from specs
8. $test runs all tests to verify TCs pass
9. $workflow-review-changes for quality (use the canonical review-changes workflow sequence from .claude/workflows.json: review-changes, why-review findings validation, parallel review batch, code-simplifier, verification, plan/plan-review/why-review/plan-execute, and full re-review restart)
10. $production-readiness-review + $security-review for production readiness
11. $changelog + final $test + $docs-update + $watzup to close
This ensures greenfield projects ship with integration test coverage from day one.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→code→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant — not just example scenarios — and back them with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-idea-to-pbi — Idea to PBI
- Description: PO/BA idea → grooming-ready backlog. TWO modes: (1) SINGLE-PBI DEEP — one concrete idea/ticket/brief → deep single PBI via idea → TDD test specs → domain → plan → PBI/stories → challenge → DoR → mockup → prioritize; (2) MULTI-OPPORTUNITY DISCOVERY — a raw vision/problem → brainstorm → RICE opportunity map → user multi-select → light per-opportunity PBI loop → cross-PBI ranked backlog. For idea → ONE provisional Feature Spec only (no backlog) use workflow-idea-to-spec.
- When To Use: PO/BA wants a grooming-ready PBI backlog from an idea. SINGLE-PBI DEEP: a raw idea — or a handed-off artifact/ticket/brief — through to ONE grooming-ready PBI with user stories, TDD test specifications, Dev BA PIC challenge, DoR validation, wireframes, and prioritization. MULTI-OPPORTUNITY DISCOVERY: a raw product vision/problem statement → structured brainstorm → RICE opportunity map → user multi-select → multiple PBIs (light per-opportunity loop) → cross-PBI ranked backlog. For idea → ONE provisional Feature Spec only (no backlog), use workflow-idea-to-spec
- Sequence: `brainstorm -> web-research -> idea -> review-artifact -> refine -> why-review -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:
```text
IDEA TO PBI PROTOCOL:
Capture and refine a raw idea — or a handed-off artifact/ticket/brief — into a grooming-ready PBI via an idea → test specs → (from those specs) PBI/stories/plan flow, with domain analysis, challenge review, DoR validation, and wireframe. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root and read docs/project-config.json plus docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may produce or review artifacts when this context is synced.

MODE DETECTION GATE (FIRST — pick the track before running any step, then declare it to the user):
- SINGLE-PBI DEEP MODE — input is ONE concrete idea / ticket / brief. Run the deep single-PBI track: idea → refine → spec [mode=tests] → review-artifact --type=spec-tests → domain-analysis → plan → plan-review → plan-validate → PBI → stories → challenge → DoR → mockup → prioritize. SKIP brainstorm and web-research.
- MULTI-OPPORTUNITY DISCOVERY MODE — input is a raw product vision / problem statement spanning multiple opportunities. Run brainstorm → RICE opportunity map → user multi-select → a LIGHT per-opportunity PBI loop (idea → refine → review-artifact --type=pbi → story → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup), then cross-PBI prioritize. The spec [mode=tests] step and the plan/plan-review/plan-validate cycle are SINGLE-PBI-DEEP-MODE ONLY — NEVER run them per opportunity (they would multiply N× and stall discovery). domain-analysis runs ONCE up front (shared across opportunities), not per opportunity.
When the input is ambiguous (single concrete ask vs broad vision), ask via ask the user directly before step 1.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. review-artifact is CONDITIONAL — skip if no existing artifact; proceed straight to refine
3. why-review runs after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story. The standalone gate after review-artifact --type=pbi is omitted because review-artifact --type=pbi (like every review skill) self-invokes $why-review --validate-findings internally as a Findings Validation Gate. Each gate validates WHY before the next artifact step proceeds. FAIL blocks the next artifact step; WARN requires user acknowledgment.
4. spec [mode=tests] and review-artifact --type=spec-tests run right after refine (BEFORE the PBI is drafted) so the idea is captured as testable TC specifications first; domain-analysis and plan/plan-review/plan-validate (grafted from the spec-to-pbi analytical half), then the PBI and stories, are derived FROM those specs (idea → specs → from specs to PBI)
5. pbi-challenge is run by a reviewer different from the drafter — confirm reviewer identity before that step
6. dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
7. Save artifacts at every step to the workflow artifact paths used by the child skills. If artifact roots become configurable later, update the workflow and child skills in the same change.
8. Write output IMMEDIATELY after each step — never batch
9. Run docs-update after prioritize and before workflow-end so specs, workflow-feature docs, and TDD/spec docs stay synchronized
10. Treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until the owning review or acceptance gate approves them.
11. DISCOVERY MODE: $brainstorm MUST produce a RICE-scored opportunity map (3–8 items) before any $idea step. The per-opportunity loop (idea → refine → review-artifact --type=pbi → story → review-artifact --type=story → pbi-challenge → dor-gate → pbi-mockup) repeats for EACH selected opportunity — NOT once. spec [mode=tests] and the plan/plan-review/plan-validate cycle stay SINGLE-PBI-DEEP-MODE ONLY.
12. DISCOVERY MODE: $prioritize at the end is cross-PBI — it ranks ALL PBIs from this session together. This workflow produces a BACKLOG only (no implementation) — hand off to workflow-feature or workflow-big-feature to build the top-ranked PBI.

STEP SELECTION GATE:
After workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Brainstorm (brainstorm) — DISCOVERY MODE ONLY: Double Diamond → RICE-scored opportunity map (3–8 items); SKIP in single-PBI deep mode
- [ ] Market research (web-research) — DISCOVERY MODE, CONDITIONAL: skip for internal tools or well-understood domains
- [x] Idea capture (idea) — REPEATS per selected opportunity in discovery mode
- [ ] Review existing artifact (review-artifact) — CONDITIONAL: only if PO artifact/ticket exists
- [x] Refine to PBI (refine) — hypothesis, AC, RICE, GIVEN/WHEN/THEN; REPEATS per opportunity in discovery mode
- [x] Refinement rationale review (why-review) — after refine
- [x] Test specifications (spec [mode=tests]) — SINGLE-PBI DEEP MODE ONLY: generate TCs FROM the refined idea (idea → specs)
- [x] Test-spec rationale review (why-review) — after spec [mode=tests] (deep mode)
- [x] Test specification review (review-artifact --type=spec-tests) — deep mode
- [x] Domain analysis (domain-analysis) — CONDITIONAL: skip if no new/changed entities; in discovery mode runs ONCE up front (shared)
- [x] Domain rationale review (why-review) — after domain-analysis
- [x] Implementation plan (plan) — SINGLE-PBI DEEP MODE ONLY
- [x] Plan review (plan-review) — deep mode
- [x] Plan validation (plan-validate) — deep mode
- [x] Plan rationale review (why-review) — after plan-validate (deep mode)
- [x] PBI review (review-artifact --type=pbi)
- [x] User stories (story)
- [x] Story rationale review (why-review) — after story
- [x] Story review (review-artifact --type=story)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL: skip for backend-only PBIs
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update) — near-final sync for specs, workflow-feature docs, and TDD/spec docs

WHY-REVIEW GATES (repeated, purpose-specific):
Run in sequence after refine, after spec [mode=tests], after domain-analysis, after plan-validate, and after story (the after-plan-validate gate covers the rationale before review-artifact --type=pbi; review-artifact --type=pbi also self-invokes $why-review --validate-findings internally as a Findings Validation Gate). Challenge the active artifact rationale before the next artifact step:
- Is this the right next artifact/solution to the stated problem? What was rejected and why?
- Are the acceptance criteria, story, or TC constraints justified? What breaks if they change?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives the team has not considered?
Output: Why-Review checklist with PASS/WARN/FAIL + adversarial analysis section.
FAIL blocks the next artifact step — active artifact must be revised first.

TDD-SPEC GATE (after refine, BEFORE the PBI is drafted):
Map the refined idea’s acceptance criteria into TC specifications up front, so the PBI, stories, and plan are derived FROM the test specs:
- Each material acceptance criterion should map to at least one TC ID
- Route planned TC IDs to Feature doc Section 8 through $spec [mode=tests]; $docs-update later verifies workflow-feature docs and §8 TC ↔ integration test code sync
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Review specs with review-artifact --type=spec-tests before pbi-challenge so reviewers evaluate a testable PBI
- AI-generated TC drafts are reference-only until review and DoR gates accept them.

MULTI-OPPORTUNITY DISCOVERY LOOP (DISCOVERY MODE core mechanic — folded in from product discovery):
The $brainstorm step produces a RICE-scored opportunity map — typically 3–8 opportunities. Present it to the user (ask the user directly, multiSelect: true): 'Which opportunities should we develop into PBIs?'. Run the OPPORTUNITY-MAP WHY-REVIEW gate (below) BEFORE the loop. Then for EACH selected opportunity, run this LIGHT loop (8 steps — NO spec [mode=tests], NO plan/plan-review/plan-validate; domain-analysis already ran once up front):
  1. $idea — capture as a structured artifact
  2. $refine — PBI with hypothesis, AC, RICE, GIVEN/WHEN/THEN
  3. $review-artifact --type=pbi — BA quality check
  4. $story — user stories per PBI
  5. $review-artifact --type=story — story quality check
  6. $pbi-challenge — Dev BA PIC review (reviewer ≠ drafter)
  7. $dor-gate — INVEST + DoR pass/fail
  8. $pbi-mockup — wireframe (SKIP for backend-only PBIs)
After ALL opportunities are processed: run $prioritize across all PBIs (cross-PBI).

TASK DECOMPOSITION GATE (DISCOVERY MODE): After the user selects opportunities, call task tracking for EVERY task (N opportunities × 8 loop steps = N×8 tasks min) BEFORE processing any opportunity — do NOT start the loop without a complete task list.

SCALE MANAGEMENT (DISCOVERY MODE): For 6+ selected opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + its task list); the main context runs $prioritize at the end. After every 3 opportunities, update the session summary table.

BRAINSTORM STEP REQUIREMENTS (DISCOVERY MODE):
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (RICE/Kano/2×2)
- Output: opportunity map with 3–8 RICE-scored items, documented in plans/{plan-dir}/brainstorm-opportunity-map.md

OPPORTUNITY-MAP WHY-REVIEW GATE (DISCOVERY MODE — after brainstorm, before the per-opportunity loop):
Before committing to the loop, validate the opportunity map rationale:
- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (platform/process change) that make these opportunities unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL per opportunity. FAIL on a high-ranked opportunity → remove from selection or revisit brainstorm framing; WARN → document risk and proceed with user acknowledgment.

CROSS-PBI PRIORITIZE (DISCOVERY MODE):
- Aggregate ALL PBIs produced this session; apply cross-PBI RICE + a dependency graph
- Produce a sprint-ready ranked backlog; flag Must/Should/Could-Have per release scope
- Output to the configured backlog artifact root

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: single-PBI deep mode → 1 PBI created (test specs created/reviewed, plan, DoR result); discovery mode → N PBIs created, X passed DoR, Y need rework, ranked backlog produced; docs sync completed; any blocking items
- Recommended next workflow: $start-workflow workflow-feature or $start-workflow workflow-big-feature (implement the PBI / top-ranked PBI from the backlog)
- Any DoR failures: list specific blocking criteria that must be resolved
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-idea-to-spec — Idea to Feature Spec
- Description: Idea-to-spec — turns a raw idea/vision/problem statement into ONE canonical, provisional Feature Spec (the tech-free 8-section spec + §8 test specs at docs/specs/{Bucket}/README.{Feature}.md, Evidence: TBD until code lands). STOPS at the reviewed Feature Spec — it does NOT produce a PBI backlog. For a backlog, chain workflow-spec-to-pbi afterward. For code→spec (implementation already exists) use workflow-code-to-spec.
- When To Use: PO/BA wants to turn a raw product idea, vision, or problem statement into ONE canonical (provisional) Feature Spec — spec-driven: idea → framing → Feature Spec (the tech-free 8-section spec + §8 test specs, Evidence: TBD until code lands). STOPS at the reviewed Feature Spec; for a PBI backlog chain workflow-spec-to-pbi next, or use workflow-idea-to-pbi for idea → full backlog in one pass
- Sequence: `brainstorm -> domain-analysis -> why-review -> idea -> spec [mode=draft] -> spec [mode=tests] -> review-artifact --type=spec-tests -> review-artifact -> why-review -> docs-update -> workflow-end -> watzup`

Protocol:
```text
IDEA-TO-SPEC PROTOCOL (SPEC-DRIVEN, STOPS AT SPEC):
Converts a raw idea / product vision / problem statement into ONE canonical, provisional Feature Spec. This workflow ENDS at a reviewed Feature Spec — it does NOT decompose into PBIs, stories, or a backlog. If the user wants a backlog, hand off to workflow-spec-to-pbi after this workflow completes.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each idea-framing stage (brainstorm, domain-analysis, why-review) requires ask the user directly validation before proceeding.
2. Save ALL artifacts to configured artifact and plan roots at EVERY step — write IMMEDIATELY after each task, never batch.
3. $brainstorm frames the idea (problem framing → opportunity framing → convergence) and converges on the SINGLE feature/capability to spec. If multiple distinct capabilities emerge, confirm scope with the user and author one Feature Spec per capability (sub-agent per capability for 4+).
4. SPEC-DRIVEN MANDATE: the idea is authored as a canonical Feature Spec via $spec [mode=draft] (idea-sourced, no code yet → §8 Evidence: TBD, provisional marker), then §8 test specs via $spec [mode=tests], then reviewed. NEVER skip the Feature Spec.
5. PROVISIONAL OUTPUT: because no code exists yet, the spec is provisional — §8 TCs carry Evidence: TBD and Status: Planned, and the spec frontmatter carries provisional: true. The first workflow-code-to-spec / spec [mode=update] run against real code upgrades TBD → real [Source:] anchors and clears the provisional flag.
6. NO BACKLOG: this workflow produces the Feature Spec only — no PBI/story/DoR/wireframe/prioritize. Those belong to workflow-spec-to-pbi (chain it next) or workflow-idea-to-pbi (idea → full backlog one-shot).

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Brainstorm — Double Diamond: problem frame, HMW, SCAMPER, converge on the capability to spec
- [x] Domain Analysis (domain-analysis) — CONDITIONAL: skip if no new domain entities involved
- [x] Why-Review (why-review) — validate the idea framing is the right problem before authoring the spec
- [x] Idea capture (idea) — capture the converged idea as a structured artifact
- [x] Feature Spec authoring (spec [mode=draft]) — author the canonical tech-free 8-section Feature Spec §1-7 (idea-sourced, provisional) at docs/specs/{Bucket}/README.{Feature}.md
- [x] Feature Spec test specs (spec [mode=tests]) — author §8 TC-{FEATURE}-{NNN} behavioral test cases (Evidence: TBD, Status: Planned)
- [x] Test-spec review (review-artifact --type=spec-tests)
- [x] Feature Spec review (review-artifact) — quality-check the authored Feature Spec
- [x] Why-Review (why-review) — validate the authored spec's rationale + completeness
- [x] Docs sync (docs-update) — sync Feature Spec (§8) and derived bucket indexes

SPEC AUTHORING FLOW (core mechanic — idea → provisional Feature Spec):
  1. Run $brainstorm to frame the idea and converge on the capability to spec.
  2. Run $domain-analysis if new domain entities are implied (skip otherwise).
  3. Run $why-review to validate the idea framing (right problem? pre-mortem? systemic alternatives?).
  4. Run $idea to capture the converged idea as a structured artifact → configured idea artifact root.
  5. Run $spec [mode=draft] to author the canonical tech-free 8-section Feature Spec §1-7 from the idea text (no code grep; provisional marker) → docs/specs/{Bucket}/README.{Feature}.md.
  6. Run $spec [mode=tests] to author §8 TC-{FEATURE}-{NNN} behavioral test cases (Evidence: TBD, Status: Planned — pure behavior, before any code).
  7. Run $review-artifact --type=spec-tests — test-spec quality check.
  8. Run $review-artifact — Feature Spec quality check.
  9. Run $why-review — validate the authored spec's rationale and completeness.
  10. Run $docs-update to sync the Feature Spec (§8) and derived bucket indexes.

BRAINSTORM STEP REQUIREMENTS:
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (pick the capability to spec)
- Output: the converged capability (or a short list, if multiple capabilities — confirm scope with the user)
- Document in plans/{plan-dir}/brainstorm-idea-frame.md

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: M Feature Specs authored (provisional), §8 TC counts, open questions (confidence < 80%)
- Feature Specs authored: list the docs/specs/{Bucket}/README.{Feature}.md paths created
- Provisional note: these specs carry Evidence: TBD + provisional: true until code lands — reconcile via workflow-code-to-spec / spec [mode=update] once implemented
- Recommended next workflow: $start-workflow workflow-spec-to-pbi (decompose the Feature Spec(s) into a grooming-ready PBI backlog) OR $start-workflow workflow-feature (implement directly from the spec)

AUTO-SKIP RULES:
- spec [mode=draft] / spec [mode=tests]: NEVER skip — Feature Spec authoring is the spec-driven core of this workflow
- domain-analysis: skip if no new entities/aggregates — ask: 'Does this idea involve new domain entities?'

WHY-REVIEW GATE (after domain-analysis, before spec authoring):
Before committing to authoring the spec, validate the idea framing:
- Is this truly the right problem to solve? What was deprioritized and why?
- Pre-mortem: if this is built and misses in 6 months, what was the root cause?
- Are there systemic alternatives (e.g., platform change, process change) that make this unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL.
FAIL → revisit brainstorm framing before authoring. WARN → document risk and proceed with user acknowledgment.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-refactor — Code Refactoring
- Description: Code improvement and restructuring workflow with search-first approach
- When To Use: User wants to restructure, reorganize, clean up, or improve existing code without changing behavior; technical debt
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> plan-execute -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> production-readiness-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
Role: Refactoring Specialist
REFACTORING PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture patterns, code hierarchy, and naming conventions.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar refactoring patterns, identify target architecture examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
3. Plan: Identify code smells, define target architecture following discovered project patterns
4. Validate plan  --  ensure no behavioral changes, only structural
5. Validate design rationale with $why-review (features/refactors)
6. Implement incrementally  --  small, verifiable steps
7. Verify test specs still match after refactoring with $spec [mode=tests]. Review with $review-artifact --type=spec-tests. Sync Feature Spec §8 ↔ test code with $spec [mode=sync].
8. Verify/update integration tests with $integration-test — ensures tests reflect refactored code paths.
9. Simplify: Remove dead code, flatten nesting, extract duplicates
   CRITICAL: Before removing any code:
   - Use $investigate skill for 'unused' code verification
   - Require evidence: grep results + confidence ≥80% + cross-module/service validation
   - See Investigation Protocol (CLAUDE.md)
10. Code review: Verify no functional regressions
11. SRE review for production readiness
12. Update changelog with refactoring summary
13. Run tests  --  all existing tests MUST ATTENTION pass
14. Summary report of structural improvements

GUARDRAILS:
- Refactoring MUST ATTENTION NOT change observable behavior
- Follow project patterns from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming)
- Apply project code responsibility hierarchy from docs/project-config.json → workflowPatterns.codeHierarchy
- Provide file:line evidence of pattern search in plan

PERFORMANCE-SDD ROUTE: If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), run $performance-review for benchmark evidence while preserving observable behavior. Do not use performance/refactor scope to bypass spec, test, or docs sync when behavior, public contract, SLA, performance constraint, state timing boundary, or docs/spec boundary changes. Pure behavior-preserving optimization may skip new TC/integration-test generation only with explicit skip reason and invariant-preservation evidence. $test remains mandatory.
MANDATORY REFACTOR INVARIANT SAFETY GATES:
- Preserve existing intent/invariants; refactor MUST NOT change observable behavior unless explicitly approved.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine logic, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, maintain three-way sync: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $spec [mode=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update. Performance-driven refactors may delegate measurement to $performance-review, but observable behavior preservation and required spec/test/docs sync remain closure gates.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→refactor→tests→review loop): §8 must carry universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the refactor must PRESERVE — not just example scenarios — backed by property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the restructured core-logic = a preserved invariant left unguarded → write the killing test), NOT line-coverage %. Every behavior-affecting finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a code-only change. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-research — Research & Synthesis
- Description: Research & Synthesis: gather web sources on a topic, then synthesize into one of four artifacts selected by --output — cited knowledge report (synthesis), business/market viability evaluation (business-eval), marketing strategy (marketing), or structured course material (course)
- When To Use: User wants to research a topic from web sources and synthesize the findings into a deliverable — a cited knowledge report, a business/market viability evaluation, a marketing strategy, or structured course material
- Sequence: `web-research -> deep-research -> knowledge-synthesis -> knowledge-review -> workflow-end`

Protocol:
```text
RESEARCH & SYNTHESIS PROTOCOL:
The canonical entry point is the $workflow-research skill — it dispatches to one of four synthesis sequences via --output={synthesis|business-eval|marketing|course}. The Sequence below is the DEFAULT (--output=synthesis); for the other three intents keep the shared research scaffold (web-research → deep-research → … → knowledge-review → workflow-end) and swap ONLY the terminal synthesis skill(s) per the OUTPUT DISPATCH table.

OUTPUT DISPATCH (select by intent BEFORE creating tasks; default synthesis):
- synthesis (knowledge report): $web-research → $deep-research → $knowledge-synthesis → $knowledge-review → $workflow-end
- business-eval (business/market evaluation): $web-research → $deep-research → $market-analysis → $business-evaluation → $knowledge-review → $workflow-end
- marketing (marketing strategy): $web-research → $deep-research → $market-analysis → $strategy-builder → $knowledge-review → $workflow-end
- course (course material): $web-research → $deep-research → $course-builder → $knowledge-review → $workflow-end

RULES:
- Detect the target artifact from the prompt and pick the matching --output BEFORE creating tasks; if ambiguous, default to synthesis and state the assumption.
- Create the task tracking plan from the SELECTED --output sequence (not the default) when it differs.
- Each step MUST ATTENTION invoke its skill invocation — marking a task completed without skill invocation is a workflow violation.
- Keep claims evidence-based with cited sources; confidence >80% to assert.
- This workflow produces research artifacts only — no code implementation.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-review-changes — Review Current Changes
- Description: Review uncommitted changes, plan and fix issues, then re-review recursively until clean
- When To Use: User wants to review current uncommitted, staged, or unstaged changes before committing
- Sequence: `review-changes -> why-review -> [parallel ⇉ all-return barrier: review-architecture, review-domain-entities*, performance-review, integration-test-review, security-review] -> code-simplifier -> plan -> plan-review -> plan-execute -> review-changes -> docs-update -> workflow-end -> watzup`
- Parallel phase = all-return barrier: spawn ALL members together (one message); advance only after EVERY member returns (a skipped conditional member, marked `*`, counts as returned). A sub-agent completion advances the step identically to an inline call.

Protocol:
```text
PRE-COMMIT REVIEW (RECURSIVE):

[BLOCKING] SEQUENCING RULE — review-changes (step 1) MUST run FIRST and complete before any other reviewer; why-review (step 2) runs immediately after to validate those findings before the parallel batch.
- Step 1 (`review-changes`) establishes the baseline: surface analysis (BE/FE/SCSS file counts), review mode (DIMENSIONAL/BE-ONLY/FE-ONLY/FE-SPLIT/TOOLING), integration test sync gaps, multilingual translation gaps. The parallel batch depends on this baseline summary.
- Step 2 (`why-review`) is a FINDINGS-VALIDATION gate: it sanity-checks the review-changes findings (each finding warranted, evidence-backed, not a false positive) BEFORE expensive parallel reviewers run. It validates findings only — NOT the fix plan (`plan-review` at step 10 reviews the fix plan's design). If step 1 found zero issues, step 2 passes through with nothing to validate.
- The PARALLEL BATCH (`review-architecture`, `review-domain-entities`, `performance-review`, `integration-test-review`, `security-review`) MUST be spawned together in a single message via specialized `spawn_agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`). They are read-only and independent — no shared mutable state, no ordering dependency between them.
- The UI/frontend quality gate (`$review-ui`) is NOT a separate workflow step — it is owned by `review-changes` (step 1), which invokes it internally (ui-ux-designer sub-agent) as its UI dimension whenever the diff contains files matching the project's configured frontend/UI file patterns. Skip entirely when no frontend files changed.
- `review-domain-entities` is a CONDITIONAL member of the batch: include it ONLY when domain entity files changed. Skip it entirely (do not spawn it) when its trigger files are absent.
- NEVER start the batch before steps 1 and 2 complete. NEVER serialize the batch (burns 50K+ tokens absorbing inline reports). NEVER start `code-simplifier` until ALL spawned sub-agents return — code-simplifier modifies code and must operate on the consolidated review snapshot.
- After the parallel batch returns: TaskUpdate the batch steps to completed, read all sub-agent reports, synthesize Critical/High/Medium/Low findings into a consolidation summary, then proceed to `code-simplifier` sequentially.

- Review all staged and unstaged changes
- Check for: security issues, debug artifacts (console.log, debugger), incomplete code, style violations
- Verify no sensitive files (.env, credentials) are staged
- Check architecture compliance, naming, patterns
- DOMAIN ENTITY REVIEW: If domain entity files in changeset (Domain/, Entities/, ValueObjects/ directories), run $review-domain-entities to check DDD quality (anemic model, VO immutability, invariant enforcement). Skip entirely if no entity files changed.
- UI/FRONTEND REVIEW: Owned by step 1 (`review-changes`). When the changeset contains files matching the project's configured frontend/UI file patterns, `review-changes` invokes $review-ui internally (ui-ux-designer sub-agent) as its UI dimension to check long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-vs-fixed sizing (prefer min/max + flex-grow over fixed px), z-index scale discipline (no raw numbers, no !important), and SCSS/BEM quality. Not a separate workflow step. Skip entirely if no frontend files changed.
- Report findings with file:line references
- Output: PASS (safe to commit) or ISSUES FOUND (with list)
- If ISSUES FOUND: validate findings, plan fixes for validated findings, review and sanity-check the fix plan, implement fixes, then re-run review-changes (step 12)
- RECURSIVE (CONDITIONAL, INLINE): Step 12 re-runs `review-changes` INLINE in the main session — but ONLY if `plan-execute` actually changed files. If `plan-execute` applied no file changes, skip step 12 and go straight to docs-update. When it runs, loop plan -> plan-execute -> review-changes until one complete review pass has zero findings; stop only when the same validated blocker repeats 3 full invocations with no progress.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEATURE}-{NNN} test specifications. Flag untested code paths.
- INTEGRATION TEST SYNC: Identify changed business logic files (handlers, services, controllers, commands, queries, resolvers — infer from project conventions). For each, verify a corresponding test file exists. If missing, surface to user via ask the user directly — mandatory, not advisory.
- MULTILINGUAL UI SYNC CHECK: If UI-facing files changed and project localization is multilingual (`localization.enabled` + `supportedLocales.length > 1`), verify translation file updates. If missing, surface via ask the user directly — mandatory, not advisory.
- DOC SYNC DEFERRAL: DO NOT update Feature Specs or test spec TCs during review steps. The dedicated docs-update step handles all of this: $spec (§1-7 Feature Spec) + $spec [mode=tests] (§8 test spec update) + $spec [mode=sync] (§8 TCs ↔ test code) + optional $spec-index [mode=index] (derived bucket INDEX/ERD refresh). TEST SPEC VERIFICATION above is READ-ONLY cross-reference only — flag gaps, do not write.
MANDATORY REVIEW-CHANGES GATES:
- SPEC/TDD/TEST THREE-WAY SYNC is blocking: changed behavior must match specs + TCs + test code.
- SPEC DRIFT ADJUDICATION (apply SYNC:spec-drift-adjudication): for every behavior-changing file, do NOT silently flag a one-directional 'stale doc'. Adjudicate per shared/sdd-artifact-contract.md Drift Gates whether the divergence is CODE-WRONG (change violates an intended spec rule/AC/invariant -> BLOCKING finding, fix code/test against intended behavior) or SPEC-STALE (intentional new behavior the spec no longer reflects -> run $spec [mode=update] FIRST, then $spec [mode=tests] + $spec [mode=sync]); AMBIGUOUS -> ask the user directly before editing either side. Never normalize drift just because code/tests are green. Unadjudicated behavior-vs-spec divergence is a blocking finding.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition changes, verify persisted-state assertions and invalid-transition rejection tests.
- Missing or stale docs/tests are blocking findings; route fixes through $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (review = the spec→code→tests loop's closing pass): the test-quality bar for changed core-logic is the MUTATION-SCORE gate (Gate 1 — a surviving mutant on a changed line = a missing invariant → write the killing test), NOT line-coverage %; flag any [HARD] §4 rule or §5 invariant lacking a universally-quantified Invariant/Property TC (for-ALL-inputs + boundary counter-case). Every behavior-changing finding MUST emit a Dual-Feedback Ledger row that feeds BOTH the spec AND the tests — a blank Spec-feedback OR Test-feedback cell that survives to the fix phase = the review is INCOMPLETE, never a code-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete review pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-seed-test-data — Seed Test Data
- Description: Generate or enhance test data seeders that simulate QC happy-path scenarios for a feature area. Scouts existing patterns, implements idempotent command-based seeders, reviews compliance, simplifies.
- When To Use: User wants to seed test data, implement data seeders, generate realistic development environment data, add happy-path scenarios for a feature, create dummy data for manual QC testing, fill dev database with realistic test cases
- Sequence: `scout -> investigate -> seed-test-data -> review-changes -> code-simplifier -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SEED TEST DATA PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → 'Data Seeders' context group for project-specific seeder base class, file location, config keys, and DI registration pattern. Then read docs/project-reference/seed-test-data-reference.md for the complete project-specific implementation guide.

UNIVERSAL RULES (apply to ALL projects):
1. Environment gate FIRST — development or config-enabled only. NEVER production.
2. Command-based ONLY — call application-layer commands. NEVER direct DB/repo for domain entities. Seeder = QC orchestrator.
3. No duplicate logic — commands own validation + domain rules; seeder provides valid inputs.
4. Idempotency — check existing count BEFORE seeding; seed only remaining = target - existing.
5. Count-configurable — read count from project config key (see project-config.json). Loop from existing to target.
6. Restart-safe — idempotency inherently handles restarts.

PROJECT-SPECIFIC CONTEXT:
- Read docs/project-config.json → 'Data Seeders' rules for environment gate key, count key, and DI registration.
- Read docs/project-reference/seed-test-data-reference.md for implementation template, reference files, and project-specific DI scope rules.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (seeder tier — tailored): seeders are orchestration, not business logic, so property/metamorphic generation and the MUTATION-SCORE gate are N/A here — do NOT force them. Apply the dual-feedback half: every seeded scenario MUST stay consistent with the §5 invariants (commands own validation; a seeder that produces state violating an invariant is a bug), and any DOMAIN RULE a seeder encodes (a required precondition, a status/relationship the scenario assumes) belongs in the spec — feed it into BOTH the spec (the rule) AND, where that rule is testable, the tests, never a seeder-only fix.
```

### workflow-spec-sync — Spec Sync (Post-Change)
- Description: Update test specs and feature docs after code changes, bug fixes, or PR reviews
- When To Use: After fixing a bug update test specs, after code changes update test specs, after PR review update test specs, sync test specs after changes, update test documentation after implementation
- Sequence: `workflow-review-changes -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> spec [mode=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> workflow-end`

Protocol:
```text
TEST SPEC UPDATE WORKFLOW:
Use after code changes, bug fixes, or PR reviews to keep test specs in sync.
1. Review what changed (git diff or PR diff)
2. Update test specs in the Feature Spec §8 (Test Specifications) using $spec [mode=tests] — §8 is the canonical in-place home; there is no separate dashboard (retired 2026-06-10)
3. Sync §8 ↔ integration test code via $spec [mode=sync] (forward: §8 TCs → test code)
4. Generate/update integration tests for changed TCs
5. Run tests to verify

Key: $spec [mode=tests] diffs existing TCs against current code, adds regression TCs for bugfixes.
MANDATORY TEST-SPEC UPDATE GATES:
- Treat spec docs + Section 8 as intent/invariant source; do not encode buggy behavior as expected.
- Three-way sync contract (§8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate for affected lifecycle transitions) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (sync = the spec→tests loop, re-reviewed to zero): for every changed/added [HARD] §4 rule and §5 invariant, sync a universally-quantified Invariant/Property TC (for-ALL-inputs rule + boundary counter-case) — not just example scenarios — and back it with property/metamorphic tests whose quality bar is the MUTATION-SCORE gate (a surviving mutant on the changed core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every behavior-changing finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only or spec-only edit. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

### workflow-spec-to-pbi — Spec to PBI Backlog
- Description: Generate a complete, dependency-aware PBI backlog from existing canonical Feature Specs (docs/specs/{Bucket}/). Audits spec freshness, decomposes large Feature Specs by capability and feature, creates PBIs/stories/DoR evidence, and produces a ranked backlog.
- When To Use: User wants to create all PBIs from an existing Feature Spec, convert a large Feature Spec into a complete prioritized backlog, generate dependent PBIs from docs/specs, split a very big Feature Spec into sprint-ready PBIs, or produce a ranked implementation order from a bucket of Feature Specs.
- Sequence: `scout -> spec-index -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SPEC TO PBI BACKLOG PROTOCOL:
Use when the user has existing canonical Feature Specs at docs/specs/{Bucket}/README.{Feature}.md and wants all implementable PBIs created from them.

MANDATORY RULES:
1. Treat the Feature Specs as canonical input; do not brainstorm unrelated opportunities. Decompose each PBI from spec sections (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 TCs).
2. Run spec-index audit first if a Feature Spec may be stale vs code.
3. Build a capability x feature/operation inventory before creating any PBI.
4. Decompose large Feature Specs into independently deliverable vertical slices. Create explicit shared/foundation PBIs for cross-cutting prerequisites.
5. For each PBI, include acceptance criteria, story points, dependencies, priority, domain impact, spec [mode=tests] needs, and DoR status. Carry §4 BR-/§3 US- logical IDs as the primary citation spine.
6. Run domain-analysis when the spec implies new/changed entities, aggregates, invariants, state machines, or cross-service ownership.
7. Run prioritize once at the end across all generated PBIs to produce a dependency-aware ranked backlog.
8. Write artifacts immediately after each capability/feature is processed; never hold all PBIs in memory.
9. Run docs-update after prioritize and before workflow-end so Feature Specs (§8) and derived indexes stay synchronized.

SCALE GATE:
- 1-3 capabilities: process inline with task tracking.
- 4-10 capabilities: split tasks by capability and feature group.
- 10+ capabilities or very large specs: process incrementally by capability group, maintain a coverage matrix, and stop only when every spec feature is mapped to PBI/Shared Task/Out-of-scope.

OUTPUTS:
- team-artifacts/pbis/{date}-pbi-{slug}.md for each PBI.
- team-artifacts/backlog/spec-to-pbi-{date}-backlog.md with rank, dependency graph, priority, and recommended order.
- plans/reports/spec-to-pbi-{date}-{bucket}.md with source spec coverage and unresolved questions.
- docs-update report confirming Feature Specs and derived indexes are synchronized.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-visualize — Visual Diagram
- Description: Create visual Excalidraw diagrams from codebase investigation or web research
- When To Use: User wants to visualize, diagram, draw, or create visual representation of workflows, architectures, concepts, systems, or research findings
- Sequence: `scout -> investigate -> excalidraw-diagram -> workflow-end`

Protocol:
```text
VISUAL DIAGRAM PROTOCOL:
This workflow creates Excalidraw diagrams. Two paths based on source:

PATH A — Codebase Visualization (default if topic is about this project):
1. Scout: Find relevant files, architecture, and code patterns
2. Investigate: Trace code paths, understand relationships and data flow
3. Diagram: Generate .excalidraw file visualizing the findings

PATH B — Knowledge Visualization (if topic requires web research):
1. Web Research: Research the topic broadly (max 10 WebSearch)
2. Deep Research: Deep-dive into top sources (max 8 WebFetch)
3. Diagram: Generate .excalidraw file visualizing the synthesized knowledge

GUARDRAILS:
- Ask user which path (A or B) if ambiguous
- Output .excalidraw files to docs/diagrams/ (create dir if needed)
- Use kebab-case filenames describing the diagram subject
- MUST ATTENTION render and validate diagram (render-view-fix loop)
- Read references/color-palette.md and references/element-templates.md before generating
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-write-integration-test — Write Integration Tests
- Description: Write or update integration tests for existing code — spec-first: investigate domain logic → write/update specs → generate test code → 7-gate review (incl. change coverage) → run and verify
- When To Use: Write integration tests for a specific command/handler, add test coverage to an untested feature, update integration tests after code changes, integration test authoring from scratch for a feature area, cover uncommitted code changes with integration tests, generate integration tests from existing test specs or feature docs, review/audit existing integration tests for quality, flakiness, traceability, or failures
- Sequence: `scout -> investigate -> spec [mode=tests] -> why-review -> review-artifact --type=spec-tests -> integration-test -> integration-test-review -> integration-test-verify -> spec [mode=sync] -> docs-update -> workflow-end -> watzup`

Protocol:
```text
WRITE INTEGRATION TEST PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → framework.integrationTestDoc for project-specific test patterns, helper classes, and async wait conventions.
⚠️ MANDATORY: Understand domain logic BEFORE writing assertions
1. Scout: Find target command/handler files; locate existing integration tests in same service for pattern matching
2. Investigate: Read the handler/entity/event source — understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. This is the prerequisite for correct assertions.
3. TDD Spec: Write/update test specs in feature doc Section 8 (TC-{FEATURE}-{NNN} codes). Path: docs/specs/{Bucket}/README.{Feature}.md. Authors new TCs and updates existing TCs for changed behavior.
4. TDD Spec Review: Validate spec coverage — GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths, no duplicate TC codes
5. Integration Test: Generate test files from TC specs. FROM-PROMPT for specific target, FROM-CHANGES for git diff.
   RULES (project-specific patterns from docs/project-config.json → framework.integrationTestDoc):
   - NO smoke-only tests (no-exception alone is FORBIDDEN)
   - ALL DB assertions wrapped in project async-wait helper
   - ALL string data uses project unique-data helper
   - Each test method has TC spec annotation linking to TC-{FEATURE}-{NNN}
   - Minimum 3 tests per command: happy path + validation failure + DB state check
6. Integration Test Review: 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated issues, then restart the full integration-test review after fixes. NEVER proceed with CRITICAL/HIGH issues outstanding.
7. Integration Test Verify: Run tests via quickRunCommand from docs/project-config.json → integrationTestVerify. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
8. Test Specs Docs: Sync cross-module spec dashboard. Update IntegrationTest fields with {File}::{MethodName} traceability links.
9. Docs Update: Update feature doc evidence fields and version history if test coverage changed materially.
10. Summary report

GUARDRAIL: Read handler source BEFORE writing any assertions. Use project async-wait helper for all DB assertions — no exceptions.
MANDATORY WRITE-INTEGRATION-TEST GATES:
- Read docs/project-reference/spec-principles.md before $spec [mode=tests] and keep invariant language explicit in TCs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine behavior, generated integration tests MUST assert persisted state transitions and invalid-transition rejection.
- Maintain three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $spec [mode=tests] + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec [mode=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
- Spec-Loop Discipline (spec→tests→review loop): §8 must derive universally-quantified Invariant/Property TCs (for-ALL-inputs rules + boundary counter-cases) for every [HARD] §4 rule and §5 invariant the target code enforces — not just example scenarios — and the generated tests must be property/metamorphic where the rule is universal; the assertion-quality bar is the MUTATION-SCORE gate (a surviving mutant on the covered core-logic = a missing invariant → write the killing test), NOT line-coverage %. Every coverage/behavior finding feeds the Dual-Feedback Ledger into BOTH the spec AND the tests (a blank Spec-feedback OR Test-feedback cell = INCOMPLETE), never a test-only fix. Re-review the whole package (spec + tests + code, not just the diff) and loop until a complete pass surfaces zero new gap or hidden rule — each cycle enriches the spec.
```

<!-- CK:WORKFLOW-SKILLS -->
## Workflow & Skills Catalog

Session-start reference derived from `.claude/workflows.json` — use it to pick a route on any prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly.

### Workflow Skills (51 composable steps)

Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.

| Skill | Use for |
| --- | --- |
| `architecture-design` | [Architecture] Use when designing solution architecture across backend, frontend, deployment, monitoring, testing, and code quality. |
| `brainstorm` | [Content] Use when you need to brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement. |
| `business-evaluation` | [Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan. |
| `changelog` | [Documentation] Use when you need to generate or update changelog entries. |
| `code-simplifier` | [Code Quality] Use when you need to simplify and refine code for clarity, consistency, and maintainability while preserving all functionality. |
| `debug-investigate` | [Fix & Debug] Use when investigating a bug''s root cause — reproduce the symptom, trace it end-to-start through the code, form and test hypotheses, and pinpoint the defect before any fix. |
| `deep-research` | [Research] Use when deeply researching top sources from web-research. |
| `docs-update` | [Documentation] Use when updating impacted documentation after code, spec, or test changes. |
| `domain-analysis` | [Architecture] Use when you need to analyze business domain: bounded contexts, aggregates, entities, ERD, domain events, and cross-context integration. |
| `dor-gate` | [Code Quality] Use when you need to validate a PBI against Definition of Ready before grooming. |
| `e2e-test` | [Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes. |
| `excalidraw-diagram` | [Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files. |
| `fix` | [Implementation] Use when you need to analyze and fix issues [INTELLIGENT ROUTING]. Flag: --target={ci\|issue\|logs\|test\|types\|ui} scopes the fix; --target=types resolves TypeScript errors inline. |
| `harness-setup` | [Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors. |
| `idea` | [Project Management] Use when capturing new ideas, feature requests, or concepts for future refinement. |
| `integration-test` | [Testing] Use when you need to generate or review integration tests. |
| `integration-test-review` | [Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment. |
| `integration-test-verify` | [Testing] Use when you need to verify integration tests pass after writing and reviewing them. |
| `investigate` | [Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use $understand for the standalone prompt-driven explainer. |
| `knowledge-review` | [Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance. |
| `knowledge-synthesis` | [Research] Use when you need to synthesize research findings into structured report using template. |
| `linter-setup` | [Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates. |
| `pbi-challenge` | [Code Quality] Use when you need an AI-assisted Dev BA PIC review of PBI drafts. |
| `pbi-mockup` | [Project Management] Use when you need to generate an HTML mockup report from PBI and story artifacts. |
| `performance-review` | [Debugging] Use when analyzing or optimizing performance bottlenecks: database queries, N+1 fan-out, indexing, API latency, memory, concurrency, algorithmic complexity (O(n²)), frontend rendering, caching, and distributed paths. |
| `plan` | [Planning] Use when you need intelligent plan creation with prompt enhancement. Flag: --mode={ci\|cro} (default none — standard planning); --mode=ci plans a fix from a GitHub Actions CI run/log, --mode=cro plans conversion-rate optimization (25-item CRO framework). |
| `plan-execute` | [Implementation] Use when you need to start coding & testing an existing plan. Flags: --approval=off (auto/trust mode, no approval gate), --tests=off (skip the test step), --parallel (parallel phase execution via subagents). |
| `plan-review` | [Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings. |
| `plan-validate` | [Planning] Use when you need to validate a plan with critical questions interview. |
| `prioritize` | [Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks. |
| `production-readiness-review` | [Code Quality] Use when reviewing service-layer and API changes for production readiness. |
| `prove-fix` | [Code Quality] Use when you need to prove fix correctness with code proof traces, confidence scoring, and stack-trace-style evidence chains. |
| `refine` | [Project Management] Use when converting ideas to PBIs, validating problem hypotheses, adding acceptance criteria, or refining requirements. |
| `review-architecture` | [Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, and entity events. |
| `review-artifact` | [Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi\|story\|spec-tests\|design}. |
| `review-changes` | [Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs. |
| `review-domain-entities` | [DDD Quality] Use when you need to review domain entities and value objects for DDD design quality. |
| `scaffold` | [Architecture] Use when scaffolding reusable OOP/SOLID project foundations before feature implementation. |
| `scout` | [Investigation] Use when quickly locating relevant files and affected areas across a large codebase. |
| `security-review` | [Code Quality] Use when you need to perform a security review or audit on any scope — application code (OWASP Top 10 2025), secrets exposure, dependency/supply-chain malware, third-party repository vetting before install, infrastructure/config, CI/CD pipeline, AI-agent risks, and host/VPS compromise detection. |
| `seed-test-data` | [Dev Data] Use when you need to implement or enhance test data seeders that simulate QC happy-path scenarios via application-layer commands. |
| `spec` | [Documentation] Use to author, audit, amend, or test-spec a business Feature Spec. The single spec skill — modes draft\|init\|update\|audit\|amend create/maintain the tech-free 8-section Feature Spec; draft authors a provisional spec from an idea/requirement (no code yet, Evidence: TBD); tests generates Section 8 TC-{FEATURE}-{NNN} test specifications; sync reconciles §8 TCs ↔ integration test code. Per-mode procedure lives in references/{author,tests,sync}.md. |
| `spec-index` | [General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/**. Never extracts a separate A-E engineering tree. |
| `story` | [Project Management] Use when creating user stories from PBIs, slicing features, or breaking down requirements. |
| `tech-stack-research` | [Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect. |
| `test` | [Testing] Use when you need to run tests locally and analyze the summary report. |
| `watzup` | [Utilities] Use when you need to review recent changes and wrap up the work. |
| `web-research` | [Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation. |
| `why-review` | [Code Quality] Use when reviewing rationale and change quality for plans, PBIs, commits, diffs, docs, specs, reports, or explicit artifacts. |
| `workflow-end` | [Process] Use when you need to end the active workflow and clear state. |
| `workflow-review-changes` | [Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved. |
<!-- /CK:WORKFLOW-SKILLS -->

<!-- WORKFLOWS:END -->
<!-- CODEX-CONTEXT-MIRROR:END -->
