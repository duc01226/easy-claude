---
name: sync-to-copilot
description: '[AI & Tools] Use when you need to sync Claude Code knowledge to GitHub Copilot instructions. Auto-inits docs/copilot-registry.json when missing. Flag: --fast (script-only workflow-catalog sync, no registry-curation pass).'
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

Codex uses static project-reference loading instead of runtime-injected project docs.
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

**Purpose:** Keep Copilot instructions in sync with Claude Code workflows, dev rules, and project-reference docs.

**Architecture (Two-Tier):**

1. `.github/copilot-instructions.md` — **Project-specific** (always loaded by Copilot)
    - TL;DR golden rules, decision table
    - Project-reference docs index with READ prompts
    - Key file locations, dev commands

2. `.github/instructions/common-protocol.instructions.md` — **Generic protocols** (applyTo: `**/*`)
    - Prompt protocol, before-editing rules
    - Workflow catalog (from workflows.json)
    - Workflow execution protocol
    - Development rules (from development-rules.md)

3. `.github/instructions/{group}.instructions.md` — **Per-group** (applyTo: file patterns)
    - Enhanced summaries per doc with READ prompts
    - Groups: backend, frontend, styling, testing, project

**What gets synced:**

- Workflow-First Gate (from `.claude/skills/shared/workflow-first-gate.md`) — **SCRIPT-GENERATED**, stamped at the top of `copilot-instructions.md` so Copilot (no hooks) gets the same bug→`workflow-bugfix` / feature→`workflow-feature` routing rule
- Workflow catalog (from workflows.json) — **SCRIPT-GENERATED**
- Dev rules (from development-rules.md) — **SCRIPT-GENERATED**
- Missing `docs/copilot-registry.json` bootstrap — **AI-CREATED before generation**, from current `CLAUDE.md` + `docs/project-reference/**/*.md`
- Project-reference summaries (from copilot-registry.json) — **SCRIPT-GENERATED**
- Registry summary accuracy + golden-rule parity + missing-doc entries — **AI-CURATED** in `docs/copilot-registry.json`, then re-generated (this skill)

**Usage:**

```
$sync-to-copilot          # full sync: registry bootstrap + generation + registry curation + verification
$sync-to-copilot --fast   # fast path: registry bootstrap if missing + script generation only (former /sync-copilot-workflows)
```

**Script:** `.claude/scripts/sync-copilot-workflows.cjs`

> **Name note:** the script name is historical — despite its name, it generates the **entire** Copilot instruction set (project-specific + common-protocol + all per-group files). This skill runs that script and then adds a registry-curation pass (verify golden rules, fix stale summaries, add missing doc entries — then re-run the script) on top. The generated files are NEVER hand-edited. The former `/sync-copilot-workflows` skill (workflow-catalog-only wrapper around the same script) was absorbed into this skill as the `--fast` mode.

---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## When to Use This Skill

> **Scope vs related skills:** Syncs **Claude→Copilot knowledge** (docs, dev-rules, workflow catalog) into Copilot instructions via script + a registry-curation pass. For the **`workflows.json` catalog only** (fast, no curation pass) → use `--fast` mode below. For the full pipeline — **bidirectional** source sync (skills/prompts/agents) **+** ordered both-mirror regen → `$sync-ai-dev-tools` (user-invoke-only).

Trigger this skill when:

- **Workflows added/modified** — After editing `.claude/workflows.json` (`--fast` is enough)
- **Workflow catalog stale/drifted** — When the Copilot catalog no longer matches `workflows.json` (`--fast` is enough)
- **Development rules changed** — After editing `.claude/docs/development-rules.md`
- **Project-reference docs updated** — After modifying files in `docs/project-reference/`
- **Registry entries changed** — After editing `docs/copilot-registry.json`
- **Regular maintenance** — Quarterly sync to ensure Copilot parity
- **Copilot setup** — First-time Copilot instructions creation

**NOT for**: Claude Code workflow issues (Claude reads the catalog from the static `## Workflow & Skills Catalog` baked into `CLAUDE.md`).

---

## Workflow

### Phase 0: Registry Bootstrap (Auto-init Required)

Before running the generator in **any mode**:

1. Check whether `docs/copilot-registry.json` exists.
2. If it is missing, create it automatically before script generation. Do **not** ask the user and do **not** run the generator first, because the script produces `0 docs` without this source.
3. Build the initial registry from current files:
    - `projectInstructions.goldenRules`: copy the Golden Rules from `CLAUDE.md` exactly, without punctuation normalization.
    - `projectInstructions.decisionQuickRef`, `keyFileLocations`, and `devCommands`: derive concise project-specific entries from `CLAUDE.md`, `docs/project-config.json`, and existing package scripts.
    - `instructionFileConfig`: include the standard groups `backend-csharp`, `frontend`, `styling-scss`, `testing`, and `project-reference` with their `.github/instructions/{group}.instructions.md` filenames and `applyTo` globs.
    - `registry`: include one entry for every `docs/project-reference/**/*.md` file. Use the first H1 as `title` when available; write `summary` and `whenToRead` from the actual file headings/content; choose `group` by topic:
        - `backend-csharp`: backend, hook architecture, CQRS/API/domain implementation references
        - `frontend`: frontend patterns and design-system references
        - `styling-scss`: SCSS/CSS/styling references
        - `testing`: integration and E2E test references
        - `project-reference`: cross-cutting docs, specs, lessons, project structure, code review, docs index
4. Validate the JSON parses, then verify the registry file list exactly covers `docs/project-reference/**/*.md` before Phase 1.

In `--fast` mode, Phase 0 still runs when the registry is missing; `--fast` only skips the post-generation curation pass when the registry already exists.

### Phase 1: Script Generation (Automated)

```bash
node .claude/scripts/sync-copilot-workflows.cjs            # generate
node .claude/scripts/sync-copilot-workflows.cjs --dry-run  # preview changes without writing
```

In `--fast` mode, Phase 0 + this phase are the whole sync: run the script (optionally `--dry-run` first), confirm the workflow count matches `workflows.json`, and stop — no registry-curation pass.

This generates:

- `.github/copilot-instructions.md` — project-specific with registry summaries
- `.github/instructions/common-protocol.instructions.md` — generic protocols
- `.github/instructions/{group}.instructions.md` — per-group instruction files
- Removes old `.github/common.copilot-instructions.md` if it exists

### Phase 2: Registry Curation (This Skill)

After the script runs, the AI MUST ATTENTION curate the **sources** the script reads — NEVER hand-edit the generated files:

> **Do NOT hand-edit `.github/instructions/*.instructions.md` or `.github/copilot-instructions.md`.** They are fully regenerated by the script and gated by `copilot:verify:divergence`, which does **full-file equality** against fresh generator output (`.claude/scripts/verify-copilot-divergence.cjs:62-69,109`). Any manual edit fails that oracle and is clobbered on the next run. ALL enrichment flows through the curated sources below → re-run the script.

1. **For `docs/copilot-registry.json`** (the per-group summaries source):
    - If Phase 0 created the file, treat it as a first draft and refine it immediately
    - Verify each `summary` field accurately describes the current file content; update stale summaries based on the actual file
    - Check for new `docs/project-reference/**/*.md` files missing from the registry; add entries (`file`, `title`, `summary`, `whenToRead`, `group`)
2. **For golden rules**: verify `projectInstructions.goldenRules` in `docs/copilot-registry.json` still match CLAUDE.md
3. **Re-run the script** so the curated sources reach the generated files: `node .claude/scripts/sync-copilot-workflows.cjs`

### Phase 3: Verification

Check that:

- [x] `.github/copilot-instructions.md` contains project-specific content
- [x] `.github/instructions/common-protocol.instructions.md` contains protocols + workflow catalog
- [x] Per-group instruction files contain READ prompts
- [x] No old `common.copilot-instructions.md` file remains
- [x] Workflow count matches workflows.json
- [x] `docs/copilot-registry.json` exists and parses
- [x] All project-reference files are represented in the registry

---

## Output Files

| File                                                     | Type                                    | Content                                        |
| -------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `.github/copilot-instructions.md`                        | Project-specific                        | TL;DR + project-reference index + READ prompts |
| `.github/instructions/common-protocol.instructions.md`   | Generic (applyTo: `**/*`)               | Prompt protocol + workflow catalog + dev rules |
| `.github/instructions/backend-csharp.instructions.md`    | Backend (applyTo: `**/*.cs`)            | Backend doc summaries + READ prompts           |
| `.github/instructions/frontend.instructions.md`          | Frontend (applyTo: configured frontend globs) | Frontend doc summaries + READ prompts          |
| `.github/instructions/styling-scss.instructions.md`      | Styling (applyTo: `**/*.scss,**/*.css`) | Styling doc summaries + READ prompts           |
| `.github/instructions/testing.instructions.md`           | Testing (applyTo: `**/*Test*/**,...`)   | Testing doc summaries + READ prompts           |
| `.github/instructions/project-reference.instructions.md` | Cross-cutting (applyTo: `**/*`)         | General project doc summaries + READ prompts   |

---

## Copilot Limitations

**Copilot can't enforce protocols like Claude Code hooks:**

- No blocking operations (e.g. the `path-boundary-block` / `git-commit-block` PreToolUse gates)
- Relies on LLM instruction-following (not guaranteed)
- Protocols are advisory, not enforced
- No runtime context injection — all context must be in instruction files

**Benefits:**

- Consistent guidance across AI tools
- Same workflow detection for Claude and Copilot users
- READ prompts enable on-demand context loading
- Automated sync reduces configuration drift

---

## Troubleshooting

### Issue: "workflows.json not found"

**Solution:** Ensure you're running from project root

### Issue: Missing project-reference files in registry

**Solution:** Add entries to `docs/copilot-registry.json`, then re-run script

### Issue: `docs/copilot-registry.json` not found

**Solution:** Re-run this skill, not the raw script. The skill MUST auto-create `docs/copilot-registry.json` in Phase 0, then run the generator. If manually running only `node .claude/scripts/sync-copilot-workflows.cjs`, create or restore the registry first.

### Issue: Stale summaries

**Solution:** Run this skill — AI will read files and update summaries

---

## Related Skills

- `$sync-ai-dev-tools` — Full-pipeline Claude/Copilot sync (skills, prompts, agents) + ordered both-mirror regen (user-invoke-only)

---

## References

- **Script:** `.claude/scripts/sync-copilot-workflows.cjs`
- **Registry:** `docs/copilot-registry.json`
- **Sources:** `.claude/workflows.json`, `.claude/docs/development-rules.md`
- **Main output:** `.github/copilot-instructions.md`
- **Instruction files:** `.github/instructions/*.instructions.md`

---

# Skill: sync-to-copilot

Sync Claude Code knowledge to GitHub Copilot instructions. Two-tier output: project-specific + common protocol.

---

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**Protocols in force — MUST ATTENTION, concise digest of the SYNC/shared blocks this skill carries:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** critical+sequential thinking; traced proof, confidence >80%, no guess-as-fact.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** auto-create `docs/copilot-registry.json` before generation when it is missing
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

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

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
