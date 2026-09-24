---
name: git-conflict-resolve
version: 1.0.0
description: '[Git] Use when resolving git merge, cherry-pick, or rebase conflicts with backup and analysis.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Resolve git merge/cherry-pick/rebase conflicts with backup, analysis, and structured reporting.

**Workflow:**

1. **Backup** — Create safety backup of current state
2. **Analyze** — Identify conflict types and affected files
3. **Resolve** — Apply resolution strategy per conflict
4. **Report** — Generate conflict resolution report

**Key Rules:**

- Always create backup before resolving conflicts
- Prefer preserving both sides' intent over arbitrary choice
- Generate resolution report for audit trail

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Purpose

Systematically resolve git conflicts (merge, cherry-pick, rebase) with:

1. Backup of all conflicted files before resolution
2. Per-file conflict analysis with root cause explanation
3. Resolution with documented rationale
4. Comprehensive report generation

## Variables

OPERATION: auto-detect (cherry-pick, merge, rebase) from git state
REPORT_PATH: `tmp/reports/conflict-resolution-{date}-{operation}-{source}.md`
BACKUP_PATH: `tmp/conflict-backups-{date}/`

## Workflow

### Step 1: Detect conflict state

```bash
# Detect operation type
git status  # Check for "cherry-pick in progress", "merge in progress", etc.

# List all conflicted files
git diff --name-only --diff-filter=U  # Unmerged files (both modified)
git status --short | grep "^DU\|^UD\|^UU\|^AA\|^DD"  # All conflict types
```

Classify each conflict:

- **DU (Deleted by us):** File exists on source but not on target branch
- **UD (Deleted by them):** File exists on target but deleted by source
- **UU (Both modified):** Both branches modified the same file
- **AA (Both added):** Both branches added a file at the same path
- **DD (Both deleted):** Both branches deleted the file

### Step 2: Create backup files

**MANDATORY before any resolution.**

```bash
mkdir -p {BACKUP_PATH}

# For each conflicted file, copy WITH conflict markers preserved
cp <conflicted-file> {BACKUP_PATH}/<filename>.conflict
```

Create a TaskCreate item for each conflicted file PLUS report and review tasks.

### Step 3: Analyze each conflict (per file)

For each conflicted file, perform this analysis:

#### 3a. Understand the conflict type

- **DU/UD (deleted by one side):** Check if the file was introduced in a commit not present on the target branch. Read the file content from the source commit to understand what it provides.
- **UU (both modified):** Read the conflict markers. Identify what each side changed and why.

#### 3b. Read both versions

```bash
# For UU conflicts: read the file with conflict markers
# Look for <<<<<<< HEAD / ======= / >>>>>>> markers

# For DU conflicts: get the source version
git show <source-commit>:<file-path>

# Optionally extract clean versions
git show HEAD:<file-path> > {BACKUP_PATH}/<filename>.ours
git show <source-commit>:<file-path> > {BACKUP_PATH}/<filename>.theirs
```

#### 3c. Analyze dependencies

- **Check callers:** Do other files reference methods/classes in this file? Are caller names compatible?
- **Check constructor/DI:** Does the resolution require new dependencies?
- **Check cross-file consistency:** Will the resolution break other files?

#### 3d. Determine resolution strategy

| Conflict Pattern                                       | Resolution Strategy                                |
| ------------------------------------------------------ | -------------------------------------------------- |
| DU: File needed by feature                             | Accept theirs (add the file)                       |
| DU: File not needed                                    | Keep ours (skip the file)                          |
| UU: Non-overlapping changes                            | Merge both (keep all changes)                      |
| UU: Overlapping, source modifies methods not on target | Keep ours if methods don't exist on target         |
| UU: Overlapping, both modify same method               | Manual merge with careful analysis                 |
| UU: Schema/snapshot files                              | Accept theirs for new entities, merge for modified |

### Step 4: Resolve each conflict

Apply the determined strategy:

```bash
# Accept theirs (source version)
git checkout --theirs <file> && git add <file>

# Keep ours (target version)
git checkout --ours <file> && git add <file>

# Manual merge: Edit the file to remove conflict markers, then:
git add <file>
```

For manual merges:

1. Remove `<<<<<<< HEAD`, `=======`, `>>>>>>> <commit>` markers
2. Keep the correct content from each side
3. Verify no leftover conflict markers: `git diff --check`

### Step 5: Verify resolution

```bash
# Check no unmerged files remain
git diff --name-only --diff-filter=U

# Check no leftover conflict markers
git diff --check

# Review overall status
git status
```

### Step 6: Complete the operation

```bash
# For cherry-pick
git cherry-pick --continue --no-edit

# For merge
git commit  # (merge commit is auto-prepared)

# For rebase
git rebase --continue
```

### Step 7: Generate report

Create a comprehensive report at `{REPORT_PATH}` with:

1. **Header:** Date, source commit/branch, target branch, result commit
2. **Summary:** Total conflicts, categories, overall risk
3. **Per-file details:**
    - File path
    - Conflict type (DU/UU/etc.)
    - Root cause (why the conflict occurred)
    - Resolution chosen (accept theirs/keep ours/manual merge)
    - Rationale (why this resolution was chosen)
    - Risk level (Low/Medium/High)
4. **Summary table:** All files with conflict type, resolution, risk
5. **Root cause analysis:** Common patterns across conflicts
6. **Recommendations:** Follow-up actions, build verification, etc.

### Step 8: Final review

- Verify report is complete and accurate
- Check that all backup files exist
- Confirm build passes (if applicable)
- Flag any Medium/High risk resolutions for user attention

## Resolution Decision Framework

### When to "Accept Theirs" (source version)

- File is NEW (DU) and required by the feature being cherry-picked/merged
- File contains schema/config additions needed by new entities
- Source has strictly more content (e.g., empty class → populated class)

### When to "Keep Ours" (target version)

- Source modifies methods that don't exist on target (added by uncommitted prerequisite)
- Source renames methods/types that target callers still reference by old names
- Changes are not required for the feature being brought in

### When to "Manual Merge"

- Both sides have legitimate changes that need to coexist
- Schema files where both add new entries (keep both)
- Config files where both add new sections

### Risk Assessment

| Risk       | Criteria                                       | Action                                       |
| ---------- | ---------------------------------------------- | -------------------------------------------- |
| **Low**    | New file, no existing code affected            | Proceed                                      |
| **Medium** | Method changes, caller compatibility uncertain | Flag in report, recommend build verification |
| **High**   | Breaking changes, cross-service impact         | Require user confirmation before proceeding  |

## Notes

- Always create backup files BEFORE any resolution
- Understand the root cause first, then resolve — never force-resolve blind. — why: a guessed resolution silently drops or duplicates legitimate changes
- For complex conflicts (>3 conflict regions in one file), extract both clean versions for side-by-side analysis
- Check for prerequisite commits: if a cherry-pick modifies files from prior commits not on target, note this in the report
- Use `git diff <commit>^..<commit> -- <file>` to see the actual diff of a specific commit (not the full file state)

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap, immediately before target/source reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate but never prove it ran.
>
> 1. **Scope** — identify file types, domain area, and operation.
> 2. **Project config is OPTIONAL.** Read the configured project-config file via its loader (default `docs/project-config.json`) when it exists. Absent is a supported state, not an error: run on portable defaults, derive project facts (paths, commands, conventions, architecture, test/spec layout) from repository evidence (manifests, lockfiles, scripts, CI, layout, root instruction files), state material assumptions, never block, and at most OFFER `/project-init` or `/project-config` once. Present → minimum valid shape is a non-empty `project.name`; omitted optional capabilities use neutral defaults or skip. A DECLARED section left malformed or incomplete is a configuration error: fail closed on it and run `/project-init` or `/project-config` before relying on it — why: silent defaults would present wrong facts as authoritative. Verify material config hints against repository evidence; generic defaults are never project facts.
> 3. **Select docs.** Always-on: the project-init-owned `lessons.md` and docs-index inputs at their configured owner paths — read independently, never appended to `referenceDocs`. Task-specific: an explicit `referenceDocs` array is the exact selection, subsets and `[]` included; absent → the runtime capability-aware resolver (portable baseline plus configuration- or repository-evidenced capabilities; may be empty). The scan-target manifest is a registry, not a default selection. Filenames resolve under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). Custom-doc schema, ownership, and path-safety rules: `.claude/skills/scan/references/targets.md`.
> 4. **Route by phase.** Just in time, read the selected docs the table names for the phase you are ABOUT to enter, plus any selected custom doc whose `purpose` covers that phase. An unmatched row is `Not applicable`, never a blocker.
>
> | About to… | Read first (when selected and present) |
> | --- | --- |
> | investigate, explain, plan, design, estimate | `project-structure-reference.md`, `domain-entities-reference.md`, plus the edit-row docs for every file type the plan will touch |
> | edit or write code | `code-review-rules.md`, plus server-side / non-UI code → `backend-patterns-reference.md`; UI → `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md` |
> | write, run, fix, or review tests or test data | the matching kind: `integration-test-reference.md` · `e2e-test-reference.md` · `seed-test-data-reference.md` |
> | author or change specs, test cases, or docs | `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`; `workflow-spec-test-code-cycle-reference.md` when specs, tests, and code must stay in sync |
> | review a diff, plan, spec, or artifact | `code-review-rules.md`, plus the edit/test/spec-row docs for every file type under review |
>
> 5. **Per-file conventions** (`contextGroups[]` in the project config) add rules for the exact file read or edited: hooks deliver them where they run; elsewhere run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>` before the first edit of an unfamiliar path class.
> 6. **Cite and repair.** State `Reference docs read: ... | Not applicable: ...` (record an explicit empty selection); still honor references the active skill or task requires. A missing/stale always-on input or selected/required doc, or a malformed declared config section → `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on it.
> 7. **Dedup within ~200K tokens.** A doc counts as loaded only when its full content came back to THIS context from your own read, after the last compaction and within roughly the last 200K tokens, and it has not changed since — list it in `Reference docs read:` as `<doc> (loaded)` and skip the re-read. Everything else is not loaded: a hook reminder, a summary, a doc merely named in the conversation, or a read by another agent. Re-select and re-read after compaction, resume, a material context change, or ~200K tokens of growth (= the file-convention hook default). A delegated sub-agent starts empty: name the resolved doc paths in its brief.
>
> **Ready when:** scope set · config read or its absence recorded · always-on inputs confirmed · selection applied (may be empty) · phase docs read or cited `(loaded)` · citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Resolve git merge/cherry-pick/rebase conflicts with backup, analysis, and structured reporting.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** critical + sequential thinking, traced proof, confidence >80% to act.
- **Understand Code First:** search 3+ patterns and read code before any modification.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
