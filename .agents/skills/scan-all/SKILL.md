---
name: scan-all
description: '[Documentation] Use when you need orchestrate all reference doc scans in parallel.'
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
## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Run all 12 scan-\* skills in parallel and clear the staleness gate.

**Workflow:**

1. **Check Prerequisites** — Verify project has content (not empty)
2. **Launch Parallel Scans** — All 12 skills simultaneously
3. **Collect Results** — Read scan output from reference docs
4. **Clear Staleness Flag** — Remove `.claude/.scan-stale` so the gate unblocks
5. **Build Knowledge Graph** — Run `$graph-build` to update structural graph
6. **Enhance Docs** — Run `$prompt-enhance` on all 12 scanned docs
7. **Summarize** — Report what was refreshed

**Key Rules:**

- All 12 scans run in PARALLEL for speed
- Does NOT modify code — only populates docs/project-reference/
- Clears `.claude/.scan-stale` flag after completion
- `$prompt-enhance` ensures AI attention anchoring on all generated docs

## When to Use

- Staleness gate blocks prompts ("BLOCKED: Reference docs are stale")
- First time using easy-claude on an existing project (project onboarding)
- Periodic refresh when codebase has changed significantly
- User runs `$scan-all` manually

## When to Skip

- Empty/greenfield project (no code to scan)
- All reference docs are already fresh (no staleness warning)

## Execution

Launch all 12 scan skills in parallel:

| #   | Invocation                         | Target Doc                       |
| --- | ---------------------------------- | -------------------------------- |
| 1   | `$scan --target=project-structure` | `project-structure-reference.md` |
| 2   | `$scan --target=backend-patterns`  | `backend-patterns-reference.md`  |
| 3   | `$scan --target=seed-test-data`    | `seed-test-data-reference.md`    |
| 4   | `$scan --target=frontend-patterns` | `frontend-patterns-reference.md` |
| 5   | `$scan --target=integration-tests` | `integration-test-reference.md`  |
| 6   | `$scan --target=feature-spec`      | `feature-spec-reference.md`      |
| 7   | `$scan --target=code-review-rules` | `code-review-rules.md`           |
| 8   | `$scan --target=scss-styling`      | `scss-styling-guide.md`          |
| 9   | `$scan --target=design-system`     | `design-system/README.md`        |
| 10  | `$scan --target=e2e-tests`         | `e2e-test-reference.md`          |
| 11  | `$scan --target=domain-entities`   | `domain-entities-reference.md`   |
| 12  | `$scan --target=docs-index`        | `docs-index-reference.md`        |

## Post-Scan Cleanup

After all scans complete, clear the staleness flag:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

This re-evaluates all docs and removes the `.scan-stale` gate if all are now fresh.

## Post-Scan: Build Knowledge Graph (MANDATORY)

After all scans complete, **MUST ATTENTION create a follow-up task:**

**Task tracking: "Run $graph-build to build/update code knowledge graph"**

The knowledge graph uses `project-config.json` (populated by scans) for API connector patterns and implicit connection rules. Building the graph after scans ensures:

- Frontend↔backend API_ENDPOINT edges use accurate service paths
- MESSAGE_BUS implicit edges use correct consumer patterns
- Graph trace shows full system flow (frontend → backend → cross-service consumers)

```bash
python .claude/scripts/code_graph build --json
```

## Post-Scan: Enhance Generated Docs (MANDATORY)

Each scan-\* sub-skill now self-enhances its own doc as its final step. After graph build, **MUST ATTENTION confirm `$prompt-enhance` ran on every scanned doc and backfill any that were skipped.** Reference docs are injected into AI context — attention anchoring (top/bottom summaries, inline READ summaries, token density) directly improves AI output quality.

**task tracking one task per doc, parallel OK:**

| #   | Target File                                             |
| --- | ------------------------------------------------------- |
| 1   | `docs/project-reference/project-structure-reference.md` |
| 2   | `docs/project-reference/backend-patterns-reference.md`  |
| 3   | `docs/project-reference/seed-test-data-reference.md`    |
| 4   | `docs/project-reference/frontend-patterns-reference.md` |
| 5   | `docs/project-reference/integration-test-reference.md`  |
| 6   | `docs/project-reference/feature-spec-reference.md`      |
| 7   | `docs/project-reference/code-review-rules.md`           |
| 8   | `docs/project-reference/scss-styling-guide.md`          |
| 9   | `docs/project-reference/design-system/README.md`        |
| 10  | `docs/project-reference/e2e-test-reference.md`          |
| 11  | `docs/project-reference/domain-entities-reference.md`   |
| 12  | `docs/project-reference/docs-index-reference.md`        |

Run via: `$prompt-enhance docs/project-reference/{filename}`

## Summary Output

After all scans complete, report:

"Scan All Complete:

- {X}/12 scans succeeded
- Reference docs refreshed in docs/project-reference/
- Staleness gate cleared
- Prompt-enhanced {Y}/12 docs
- Knowledge graph rebuilt via $graph-build"

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim, confidence >80% to act.
- **Output Quality:** MUST ATTENTION no counts/trees/TOCs, rules over prose, primacy-recency anchoring.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
