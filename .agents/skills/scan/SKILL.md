---
name: scan
description: '[Documentation] Use when a workflow step or the user asks for one project-reference doc to be regenerated. Flag: --target=<doc key> (project-structure, code-review-rules, domain-entities, docs-index); generic-reference-doc also requires --filename.'
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

**Goal:** Scan one selected built-in or explicitly generic custom reference doc and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**Summary:**

- **Purpose:** Run one selected, applicable manifest target; its entry owns the output doc, capability evidence, detection, agents, sections, exceptions, and enhancement requirements.
- **Ordered path:** Validate required config → resolve key/entry and selected output → check applicability → assess mode/type/config/graph → scan → write/verify → enhance + AI-discovery gate (changed doc only) → report.
- **Modes/gates:** Init/Sync and target-defined Force; `kind: orchestrator` uses its procedure; unknown key STOPs; unsupported capability is a reported skip, not a guessed fallback.
- **Evidence:** Use real `file:line` examples, incremental unique reports, surgical writes, all-path/name checks, target exceptions, and graph checks when the project supports them.

**Workflow:**

1. **Validate** — Confirm the configured project-config file exists and is schema-valid.
2. **Resolve** — Parse `--target=<key>`, load its manifest entry, and confirm the output is selected or separately owned as an always-on input.
3. **Assess** — Check capability evidence before running target-specific Phase 0 detection.
4. **Scan** — Run only applicable declared work and capture `file:line` evidence.
5. **Write** — Surgically update the selected reference doc; verify all generated claims and examples.
6. **Enhance + discovery gate** — For a changed doc: `$prompt-enhance`, then the AI-discovery gate (purpose + critical rules on top, reminders at the bottom when long, trigger-based pointers to existing docs, reachable from the docs index).
7. **Report** — Persist findings and return complete, unchanged, skipped, or blocked status with evidence.

**Key Rules:**

**MUST ATTENTION** resolve `--target` FIRST; the manifest entry owns all target-specific behavior, never memory.
**MUST ATTENTION** validate config and target applicability before scanning; a catalog entry is not proof the project uses that capability.
**MUST ATTENTION** detect framework/type only after applicability is established; derive scan terms and scopes from evidence, never hardcode.
**MUST ATTENTION** use actual project examples with `file:line` — NEVER fabricate.
**MUST ATTENTION** use graph evidence only for code relationships when a supported project graph exists; an absent graph is not a scan failure.

- Update surgically — NEVER rewrite the whole doc or remove a section without evidence it is obsolete.
- Honor target-entry Content Rules/exceptions and Special slivers, including target-specific branches.

---

# Scan (parameterized reference-doc scanner)

## Phase 0.0: Resolve Target (BLOCKING — do this before anything else)

1. Parse `--target=<key>` from the invocation (e.g. `$scan --target=backend-patterns`). Built-in keys use their manifest entry. The reserved `generic-reference-doc` mode also requires `--filename="<relative-path>"`. If no target or an unknown key is supplied, STOP and list registered keys; never guess the intended target.
2. **Validate project config.** Resolve the configured config path through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`). Ordinary project work requires a schema-valid file with a non-empty `project.name`; omitted capability sections use neutral defaults or skips, while any declared invalid section is a blocking config error. Route missing or invalid config to `project-init` / `project-config` and do not scan until repaired.
3. **Resolve output selection.** Read the effective `referenceDocs` selection through the project config/runtime resolver. An explicit array, including `[]`, is exact for task-specific docs. A built-in target may write only its manifest `doc` when that exact filename is selected. `generic-reference-doc` may write only the exact selected custom filename whose `scanTarget` is `generic`; a missing/`manual` target or unselected filename blocks the scan. Custom docs never inherit a built-in target by basename. The `lessons.md` and docs-index inputs are ensured by project-init separately from task-specific selection.
4. **Read the target's entry in `references/targets.md`.** That entry supplies:
   - `doc` — the reference doc path this scan owns
   - applicability and skip evidence
   - description, sub-agent roles, Phase 0 detection, Think scopes, sections, content rules, exceptions, special slivers, anti-rationalization, and enhancement requirements
5. **Check applicability before scanning.** Verify the capability from relevant config plus repository evidence. Config may select or point to search locations, but does not prove that a code pattern exists. If evidence shows the capability is absent, report `SKIPPED` with the config fields and paths checked and write nothing. If evidence conflicts materially, stop and surface the conflict.
6. **Orchestrator branch:** if the entry is `kind: orchestrator`, follow its applicability-aware procedure and include only eligible children. Do not run the shared single-doc engine for the orchestrator.

> Everything below is the SHARED engine (standard single-doc scanner targets). Wherever it says "the target entry," read the loaded manifest entry — do not assume values from another target. **Orchestrator-kind targets do not use this engine** — they run their entry's Orchestration Procedure instead.

## Phase 0: Classify & Assess

After config, output selection, and applicability pass, run only the checks relevant to this target:

1. Read the target's `doc`.
   - Detect mode: **Init** (placeholder — headings only / sentinel present) or **Sync** (populated). Some targets add a **Force** mode (user says "rebuild"/"reset" → treat as Init even if the doc exists) — honor it if the target entry defines it.
   - In Sync mode: list already-documented sections → skip re-scanning those unless staleness suspected.
2. Run the target entry's **Phase 0 detection** table(s) only for the evidenced capability. For a generic custom doc, derive evidence and search scope from its configured purpose and sections, then verify against repository sources without assuming a stack, architecture, or test convention. Derive patterns from source, manifests, test config, or documentation; a framework name in config is a search hint to verify, not permission to invent usage.
3. Load only relevant configured paths and profiles, and validate every declared section the scan consumes. Omitted optional properties mean neutral defaults or a skipped branch; a declared malformed property blocks the scan.
4. For code-oriented targets, trace relevant files with the project graph only when `.code-graph/graph.db` and the graph tool are available.

**Evidence gate:** If applicability or framework detection cannot be established, report what was checked and what remains unknown. Skip absent capabilities; ask only when unresolved evidence materially changes the doc and cannot be settled from config or source. Never substitute a guessed manifest fallback.

## Phase 1: Plan Scan Strategy

From the evidenced framework/type, derive concrete patterns to search (naming, lifecycle, data access, configuration, and test organization). Treat architecture patterns such as repositories, CQRS, events, or domain entities as options to evaluate against observed boundaries, not mandatory structures.

Create work items for applicable phases and declared sub-agents. Do not create or dispatch work for skipped capability branches.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch only the general-purpose sub-agents defined for applicable branches in the target entry. Give each sub-agent its **Think scope** + scan-target bullets verbatim from the entry. Each sub-agent MUST:

- Write findings incrementally after each file/section — NEVER batch at end
- Cite `file:line` for every pattern example
- Confidence: >80% document as pattern; 60-80% document as "observed (unverified)"; <60% omit

Each worker writes a **unique shard** under `tmp/reports/scan-{target}-{YYMMDD}-{HHMM}/`; workers never append to the same report. After the barrier, the main agent reads and validates every shard and is the **sole writer** of `tmp/reports/scan-{target}-{YYMMDD}-{HHMM}-report.md`.

> Honor every **conditional / ordered** sub-agent from the entry (for example, cross-service work only when service boundaries exist, or a BDD agent only when BDD artifacts are present). Honor any **CRITICAL security flag** the entry defines. Never create extra architecture or test components to fill a section.

## Phase 3: Analyze & Generate

Read the full report. Apply the fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings, using the target entry's **Target Sections** + **Content Rules / exceptions**.

**Round 2 (fresh sub-agent, zero memory of Round 1):** Sub-agent re-reads report + draft doc independently and checks (apply the target entry's Round-2 verification specifics):

- Does every code example match an actual existing file (Glob verify)?
- Do class/token/variable names in examples match actual declarations (Grep verify)?
- Are required sections (Anti-Patterns / Coverage Report / Gap Analysis / M1-M2 Compliance / etc. as the target mandates) populated?
- Coverage gaps: which Target Sections have no examples?

**Round 3 only if Round 2 finds issues.** Max 3 rounds → escalate to user if unresolved. (Clean Round 1 ends the scan; fresh-eyes is mandatory only after issues are found and fixed.)

> **Authoring branch (init mode):** if the target entry defines one (e.g. `design-system` authors the canonical doc + token `.scss`), follow it exactly — including any **sentinel removal** (e.g. "First: REMOVE `PLACEHOLDER_MARKER_SCSS`") and regen-marker prepend.

## Phase 4: Write & Verify

1. **[BLOCKING] No-op scans write NOTHING — not even the stamp.** Build the full candidate doc (including `<!-- Last scanned: YYYY-MM-DD -->` at top), then compare it against the doc on disk with the shared guard, which ignores volatile stamps and whitespace:

   ```bash
   node .claude/hooks/lib/doc-stamp-guard.cjs --check <target doc> --candidate <candidate file>
   ```

   - **Exit 0 (CHANGED)** → write the candidate, stamp and all.
   - **Exit 3 (NO-OP)** → do **NOT** write the file, do **NOT** touch the stamp. Record the verification in the untracked local ledger instead, so the 60-day freshness gate still sees a recent scan without dirtying a tracked file:

     ```bash
     node .claude/hooks/lib/doc-stamp-guard.cjs --record-verified <doc filename>
     ```

     Then report `unchanged (no write)`. — why: a date-only rewrite is an unmergeable line at the top of a file many branches touch, so two branches that each merely RE-RAN this scan conflict over a date neither of them decided. The churn carries no information and costs a manual merge.

2. Surgical update only — preserve sections with no staleness, update only diverged sections; preserve manual annotations.
3. Verify (Glob check): **ALL** code example file paths exist — not just a sample of 5.
4. Verify (Grep check): class/token/variable names in examples match actual declarations.
5. Verify any target-mandated section is real, not hypothetical (Anti-Patterns / Coverage gaps / M1-M2 leaks / ports-from-config / etc.).
6. For code-oriented claims, validate call-chain or dependency claims with the available project graph; when no supported graph exists, trace relevant source callers directly.
7. **Convention classes (main agent only, never a worker):** when the valid project config declares convention classes, follow their configured additive merge procedure. Omitted optional convention configuration is a skip; do not create classes from guessed stack facts. Workers keep writing only their unique shard; the main agent stays the sole writer.
8. Report: sections updated / unchanged / coverage gaps / violations found / convention classes added-refreshed-kept.

> **Output-rule overrides:** apply the target entry's "Content Rules / exceptions" — e.g. `feature-spec` intentionally INCLUDES a directory tree (overriding the shared no-trees rule); `docs-index` intentionally OUTPUTS glob-verified counts (its counts are the deliverable); `e2e-tests`/`integration-tests` forbid hardcoded counts and use grep-expression statistics.

<!-- SCAN:prompt-enhance-final-step -->

## Final Step: Enhance Scanned Doc (MANDATORY)

**MUST ATTENTION** after a selected doc changes, run `$prompt-enhance <the target entry's doc>` when required by the target manifest; preserve project facts, evidence, and owner sections during enhancement. A skipped or unchanged target is not rewritten or enhanced.

**task tracking (last task when a doc changed):** `Run $prompt-enhance <target doc> on the scanned doc`

**Then run the AI-discovery gate (`SYNC:ai-discovery-doc-quality`) on the enhanced doc:** first screen states purpose, when to read it and its critical rules · a long or rule-bearing doc ends with closing reminders · every pointer to another doc is `read <path> when <situation>` with an existing target · the doc is reachable from the docs index (a missing route is reported for the `docs-index` target, not patched here). Fix a failure inside this doc before reporting; the gate is surgical and never licenses a full rewrite.

<!-- /SCAN:prompt-enhance-final-step -->

---

> **[IMPORTANT]** Use small tracked tasks for multi-phase or delegated scans. Do not ask whether to skip a clear one-target scan.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `scan-and-update-reference-doc` — Surgical updates to reference docs, never full rewrites; scanning or updating a reference doc → .claude/skills/shared/protocols/scan-and-update-reference-doc.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer. (Per-target exceptions in the manifest entry override this — e.g. feature-spec trees, docs-index counts.)

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Scan one manifest-selected reference-doc target and deliver a surgical, evidence-backed update whose examples, coverage, and generated content are verified against the project without unsupported changes.

**IMPORTANT MUST ATTENTION** verify every emitted path, example, coverage claim, and generated projection against the real repository before reporting success.

**IMPORTANT MUST ATTENTION** resolve `--target` and load its manifest entry FIRST — never scan from memory of "what a backend/frontend/design scan does"

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** traced `file:line` proof per claim; confidence >80% to act.
- **Scan & Update Doc:** read existing doc, diff, surgical update only — never full rewrite.
- **Output Quality:** no counts/trees/TOCs; 1 example per pattern; lead with answer.
- **AI-Discovery Doc Quality:** purpose + critical rules on top, reminders at the bottom when long, trigger-based pointers to existing docs, reachable from the docs index.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION Final Step:** enhance only a doc the scan actually changed, then pass the AI-discovery gate on it; a no-op or evidence-backed skip requires no write or enhancement
**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting — one task per sub-agent, one per phase
**IMPORTANT MUST ATTENTION** verify applicability before framework/type detection — all grep terms derive from evidence, never hardcoded
**IMPORTANT MUST ATTENTION** cite `file:line` for every pattern (confidence >80% to document; <60% omit)
**IMPORTANT MUST ATTENTION** use a project graph for code relationships when supported; otherwise trace source callers and state the unavailable graph as a limitation
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each file — NEVER batch at end (context loss)
**IMPORTANT MUST ATTENTION** read existing doc FIRST, diff findings, surgical update only — NEVER rewrite entire doc
**IMPORTANT MUST ATTENTION** multi-round fresh-eyes review — main agent rationalizes its own mistakes; Round 2 sub-agent catches what main agent dismissed
**IMPORTANT MUST ATTENTION** honor the target entry's Content-Rule exceptions, Special slivers, and Anti-Rationalization rows — they encode why this target differs from the others

**Anti-Rationalization (shared — the target entry adds its own rows):**

| Evasion                                           | Rebuttal                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "I know what a `<target>` scan does, skip the manifest entry" | The entry holds the BLOCKING gates, sub-agent count, and exceptions — scanning from memory drops them |
| "Framework/type already known, skip Phase 0 detection" | Phase 0 is BLOCKING — derive grep terms from evidence, not assumption               |
| "Doc has content, skip re-read"                   | Show section list extracted from doc as proof of re-read                            |
| "Examples look right"                             | Glob-verify ALL file paths + Grep-verify ALL names — looking right ≠ verified       |
| "Round 2 review not needed for small scan"        | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable.            |

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
