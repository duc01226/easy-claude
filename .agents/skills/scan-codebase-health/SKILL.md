---
name: scan-codebase-health
description: '[Documentation] Use when detecting codebase health issues — unused exports, doc count-drift, orphan files, stale config references.'
disable-model-invocation: true
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

**Goal:** Detect structural rot in AI-assisted codebases — dead code, count-drift, orphan files, stale configs, dead feature flags, broken cross-references. Works on any project via `docs/project-config.json`.

**Workflow:**

1. **Classify** — Load config, detect available tooling (graph.db, CI, feature-flag patterns)
2. **Run Detections** — Execute 7 detection categories (graph-dependent checks skipped if no graph.db)
3. **Fresh-Eyes Review** — Verify findings before writing report
4. **Generate Report** — Write to `tmp/reports/codebase-health-scan-{YYMMDD}.md`
5. **Present Summary** — Show actionable findings with severity levels

**Key Rules:**

- Generic — reads all paths from project-config.json, never hardcodes project names
- Graceful degradation — graph-dependent checks skipped if `.code-graph/graph.db` not found
- Report format — each finding has `file:line`, category, severity (HIGH/MEDIUM/LOW), suggested action
  **MUST ATTENTION** NEVER report a finding without `file:line` proof

---

# Scan Codebase Health

## Phase 0: Classify & Detect

**Before any other step**, in parallel:

1. Read `docs/project-config.json` for the `codebaseHealth` section:

```json
{
    "codebaseHealth": {
        "sourcePaths": ["{discovered-source-root}/"],
        "docPaths": ["docs/"],
        "configPatterns": ["**/appsettings*.json", "**/environment*.ts"],
        "excludePaths": ["node_modules", "dist", "bin", "obj"]
    }
}
```

If `codebaseHealth` section is missing, discover source roots from project config, manifests, and populated code directories; use `docPaths: ["docs/"]` when docs exist.

2. Detect available tooling to determine which phases to run:

| Signal                                                                          | Phase Enabled                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `.code-graph/graph.db` exists                                                   | Phase 3 (Unused Exports) + Phase 4 (Orphan Files) |
| CI config found (`.github/workflows`, `azure-pipelines.yml`)                    | Phase 6 (CI Health) — optional                    |
| Feature flag patterns found (`FeatureFlags`, `IFeatureManager`, `LaunchDarkly`) | Phase 6 (Dead Feature Flags)                      |
| Cross-reference patterns in docs (`file:line`, `[link]()`)                      | Phase 7 (Broken Cross-References)                 |

3. Create task tracking entries for each enabled phase before proceeding.

**Evidence gate:** If `docs/project-config.json` not found and no detectable source paths, report and ask user for guidance. DO NOT guess project structure.

## Phase 1: Doc Count-Drift Detection (No Graph Required)

**Think:** Which numeric claims in docs can actually be verified? What's the drift threshold that signals a real maintenance problem vs normal growth?

Scan `docs/` **and the AI-harness instruction surface when present** (`.claude/**/*.md`, root `AGENTS.md`, `CLAUDE.md`) for numeric claims: "N files", "N tests", "N hooks", "N services", "N skills", "N components", "N stages", "N verifiers", "N agents", "N workflows". The harness docs embed counts that are directly derivable by globbing `.claude/` (skill dirs, hook entries, `scripts/**/verify-*` scripts, pipeline stages, agent files, `workflows.json` entries) — the highest-drift claims because a new skill/verifier/stage bumps the real count while the prose claim stays frozen. This scope is generic: any project carrying a `.claude/` harness gets it; it hardcodes no project- or framework-specific count.
For each claim:

1. Extract number and what it counts
2. Glob/grep to verify actual count
3. Flag if actual differs from claimed

**Severity thresholds:**

- Drift ≤10% → LOW (normal growth)
- Drift >10% and ≤30% → MEDIUM (needs update)
- Drift >30% → HIGH (significantly stale)
- Claim cannot be verified → MEDIUM (ambiguous claim)

Write findings incrementally to report after each doc scanned. NEVER batch at end.

## Phase 2: Stale Config Reference Detection (No Graph Required)

**Think:** Which config values reference code artifacts (class names, module names, connection strings)? Could those artifacts have been renamed or deleted?

For each file matching `configPatterns`:

1. Extract class names, module names, or connection strings referenced
2. Grep codebase to verify each reference still exists
3. Flag missing references as HIGH severity

**Evidence gate:** NEVER flag a reference as stale without attempting grep. Confidence <80% → flag as MEDIUM "unverified" only.

## Phase 3: Unused Exports Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist — log "Phase 3 skipped: no graph.db".**

**Think:** Which public API surface has zero consumers? Could be dead code, or could be an intentional entry point — distinguish by file type.

For key exported symbols in source files:

1. Run `python .claude/scripts/code_graph query importers_of <symbol> --json`
2. Flag symbols with zero importers as MEDIUM severity
3. Exclude known entry points (main files, test files, config files, startup files)

## Phase 4: Orphan File Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist — log "Phase 4 skipped: no graph.db".**

Find source files (.ts,.cs,.py, etc.) with zero inbound edges:

1. Run `python .claude/scripts/code_graph query importers_of <file> --json`
2. Flag files with zero importers as LOW severity (may be entry points)
3. Exclude known entry points

## Phase 5: Pattern Drift Detection (No Graph Required)

**Think:** Where does the same pattern appear across services/modules? Does it look different in different places? Is that divergence intentional or accidental?

Compare the same pattern across services/modules:

1. Pick a pattern (e.g., repository registration, service configuration, error handling)
2. Grep across all services/modules
3. Flag inconsistencies as MEDIUM severity

## Phase 6: Dead Feature Flag Detection (If Feature Flags Detected)

**Skip if no feature flag patterns found in Phase 0.**

**Think:** Which flags exist in config but have no code references? Which code references flags that no longer exist in config?

1. Grep for feature flag names in config files
2. Grep for feature flag usage in code
3. Flag config-only flags (no code usage) as LOW
4. Flag code-only flags (no config entry) as HIGH (runtime error risk)

## Phase 7: Broken Cross-Reference Detection (No Graph Required)

**Think:** Which doc links point to files that no longer exist? Which `file:line` references in docs are stale?

For docs containing markdown links `[text](path)` or `file:line` references:

1. Extract all file path references
2. Glob to verify each path exists
3. Flag missing paths as MEDIUM severity

## Phase 8: Fresh-Eyes Review

**Before writing final report**, spawn a fresh sub-agent (zero memory) to:

- Sample 5-10 findings from the report
- Verify each has a real `file:line` evidence source
- Check: is the severity classification justified by the description?
- Flag false positives (things flagged but actually acceptable)

Max 2 rounds → escalate to user if review finds >30% false positive rate.

## Phase 9: Generate Report

Write to `tmp/reports/codebase-health-scan-{YYMMDD}.md`:

```markdown
# Codebase Health Scan Report

**Date:** {YYYY-MM-DD}
**Phases Completed:** {N}/{total} ({reason for skipped phases})
**Findings:** {total} ({HIGH} high, {MEDIUM} medium, {LOW} low)

## Summary

| Phase                   | Status                              | Findings   |
| ----------------------- | ----------------------------------- | ---------- |
| Doc Count-Drift         | Scanned                             | N findings |
| Stale Config Refs       | Scanned                             | N findings |
| Unused Exports          | Scanned/Skipped (no graph.db)       | N findings |
| Orphan Files            | Scanned/Skipped (no graph.db)       | N findings |
| Pattern Drift           | Scanned                             | N findings |
| Dead Feature Flags      | Scanned/Skipped (no flags detected) | N findings |
| Broken Cross-References | Scanned                             | N findings |

## Findings

### HIGH Severity

- `{file}:{line}`: {description} — Action: {action}

### MEDIUM Severity

- `{file}:{line}`: {description} — Action: {action}

### LOW Severity

- `{file}:{line}`: {description} — Action: {action}

## False Positives (Fresh-Eyes Review)

{Findings dismissed by Round 2 review with reasoning}
```

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting — one per phase

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical+sequential thinking; traced `file:line` proof, >80% to act.
- **Output Quality:** no counts/trees/TOCs; 1 example per pattern; lead with answer.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** detect available tooling in Phase 0 — never assume graph.db exists
**IMPORTANT MUST ATTENTION** NEVER report a finding without `file:line` evidence
**IMPORTANT MUST ATTENTION** write findings incrementally after each phase — NEVER batch at end
**IMPORTANT MUST ATTENTION** severity thresholds are concrete: HIGH = runtime failure risk; MEDIUM = drift/dead code; LOW = cleanup candidate
**IMPORTANT MUST ATTENTION** Phase 8 fresh-eyes review is mandatory — prevents false positives from rationalization

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Graph not needed, skip Phases 3-4"          | Phases 3-4 are explicitly gated — state skip reason in report, don't silently omit    |
| "Count drift is small, LOW severity is fine" | Apply the threshold table: >10% = MEDIUM, >30% = HIGH. No discretionary override.     |
| "Finding looks valid, skip Round 2 review"   | Main agent rationalizes own findings. Fresh-eyes is non-negotiable.                   |
| "No feature flags found, skip Phase 6"       | Log "Phase 6 skipped: no feature flag patterns detected" in report                    |
| "Config reference might still exist"         | Grep to verify. Confidence <80% → flag as MEDIUM "unverified" not LOW "probably fine" |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

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
