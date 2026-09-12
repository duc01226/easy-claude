---
name: changelog
version: 1.1.0
description: '[Documentation] Use when generating or updating changelog entries.'
triggers:
    - changelog
    - update changelog
    - add changelog
    - log changes
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a Keep-a-Changelog entry under `[Unreleased]` that tells users, in business terms, what changed and why it matters, cites affected logical IDs, flags breaking changes, and NEVER names files/classes in entry prose.

**Summary:**

- MUST ATTENTION translate every diff into user impact; ALWAYS group related changes by module/feature; NEVER name files/classes/enums/migrations as business impact.
- MUST ATTENTION before writing, find and read the changelog: root `./CHANGELOG.md` preferred, `./docs/CHANGELOG.md` fallback; ALWAYS create root only when neither exists; NEVER create `docs/CHANGELOG.md` when root exists.
- **Main steps (in order):** MUST ATTENTION choose PR/commit/range scope → create `tmp/changelog-notes-{YYMMDD-HHMM}.md` with Added/Changed/Fixed/Deprecated/Removed/Security → review EVERY changed file and categorize → read notes holistically for the main change, beneficiaries, and new user capability → write a grouped entry under `[Unreleased]` → update while preserving existing entries → delete the notes file; NEVER skip review or cleanup.
- Gates: MUST ATTENTION cite `FR-`/`BR-`/`TC-` IDs in `**Refs**`; ALWAYS prefix breaking changes with `**BREAKING:**` plus a migration/impact note; NEVER include Breaking when none; outside a workflow, ask the user to choose `workflow-feature` or `/changelog`, then after completion ask about `/test`, `/docs-update`, or manual continuation.

**Workflow:**

1. **Gather Changes** — Get changed files via `git diff` (PR, commit, or range mode)
2. **Create Temp Notes** — Build categorized review notes (Added/Changed/Fixed/etc.)
3. **Review Each File** — Read diffs, identify business impact, categorize changes
4. **Generate Entry** — Write Keep-a-Changelog formatted entry under `[Unreleased]`
5. **Cleanup** — Delete temp notes file

**Key Rules:**

- Use business-focused language, not technical jargon (e.g., "Added pipeline management" not "Added PipelineController.cs")
- Group related changes by module/feature, not by file
- Always insert under the `[Unreleased]` section; create it if missing
> **AI-SDD Artifact Contract** — M1/M2 keep business prose free of implementation identifiers; M3 makes logical IDs the primary traceability spine.
> M6 requires review/gate skills to check applicable mandates and fail with specific violations.

- **Cite logical IDs + flag breaking changes (M3/M1):** MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Each entry cites the logical IDs it affects (`FR-`/`TC-`, plus `BR-` where relevant) and a business-level change description; keep implementation jargon and class/file names out of entry prose per `docs/project-reference/spec-principles.md` §3. Explicitly flag any breaking change with a `**BREAKING:**` prefix and a one-line migration/impact note.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Changelog Skill

Generate business-focused changelog entries by reviewing every changed file; name the user-facing capability, NEVER the class/file.

## Pre-Execution Checklist

1. **Find `CHANGELOG.md`** — prefer root `./CHANGELOG.md`; fall back to `./docs/CHANGELOG.md`; if absent, create root.

2. **Read current changelog** — preserve format and latest entries.

## Workflow

### Step 1: Gather Changes

Determine scope by mode:

```bash
# PR/Branch-based (default)
git diff origin/develop...HEAD --name-only

# Commit-based
git show {commit} --name-only

# Range-based
git diff {from}..{to} --name-only
```

### Step 2: Create Temp Notes File

Create `tmp/changelog-notes-{YYMMDD-HHMM}.md`:

```markdown
# Changelog Review Notes - {date}

## Files Changed

- [ ] file1.ts -
- [ ] file2.cs -

## Categories

### Added (new features)

-

### Changed (modifications to existing)

-

### Fixed (bug fixes)

-

### Deprecated

-

### Removed

-

### Security

-

## Business Summary

<!-- What does this mean for users? -->
```

### Step 3: Systematic File Review

For each changed file:

1. Read file or diff.
2. Identify **business impact**, not just technical change.
3. Mark its notes item, then categorize it.

**Business Focus Guidelines**:

| Technical (Avoid)               | Business-Focused (Use)                       |
| ------------------------------- | -------------------------------------------- |
| Added `StageCategory` enum      | Added stage categories for pipeline tracking |
| Created `PipelineController` class | Added API endpoints for pipeline management  |
| Fixed null reference in GetById | Fixed pipeline loading error                 |
| Added migration file            | Database schema updated for new features     |

### Step 4: Holistic Review

Read temp notes file completely. Ask:

- Main feature/fix?
- Who benefits, how?
- What can users now do they couldn't before?

### Step 5: Generate Changelog Entry

Format (Keep a Changelog):

```markdown
## [Unreleased]

### {Module}: {Feature Title}

**Feature/Fix**: {One-line business description}
**Refs**: {FR-/BR-/TC- logical IDs affected}

#### Added

- {Business-focused item}

#### Changed

- {What behavior changed}

#### Fixed

- {What issue was resolved}

#### Breaking

- **BREAKING:** {what changed} — {migration/impact note}
```

> If no breaking change: omit the `#### Breaking` block. Cite logical IDs in `**Refs**`; keep class/file names out of all entry prose.

### Step 6: Update Changelog

1. Read existing `CHANGELOG.md`.
2. Insert new entry under `[Unreleased]`.
3. If `[Unreleased]` is absent, create it after the header.
4. Preserve existing entries.

### Step 7: Cleanup

Delete temp notes file: `tmp/changelog-notes-*.md`.

## Grouping Strategy

Group related changes by module/feature.

```markdown
### Your Service: Order Pipeline Management

**Feature**: Customizable order pipeline/stage management.

#### Added

**Backend**:

- Entities: Pipeline, Stage, PipelineStage
- Controllers: PipelineController, StageController
- Commands: SavePipelineCommand, DeletePipelineCommand

**Frontend**:

- Pages: order-pipeline-page
- Components: pipeline-filter, pipeline-stage-display
```

## Anti-Patterns

1. ❌ Create new changelog under `docs/` when root exists.
2. ❌ Skip file review; changes get missed.
3. ❌ Use technical jargon without business context.
4. ❌ Leave the temp notes file.
5. ❌ Omit the `[Unreleased]` section.
6. ❌ List every file instead of grouping by feature.

## Examples

### Good Entry

```markdown
### Your Service: Order Pipeline Management

**Feature**: Customizable order pipeline/stage management for fulfillment workflows.

#### Added

- Drag-and-drop pipeline stage builder with default templates
- Stage categories (Created, Confirmed, Packed, Shipped, Delivered, Cancelled)
- Pipeline duplication for quick setup
- Multi-language stage names (EN/VI)

#### Changed

- Order cards now show current pipeline stage
- Order creation wizard includes pipeline selection
```

### Bad Entry (Too Technical)

```markdown
### Pipeline Changes

#### Added

- Pipeline.cs entity
- StageCategory enum
- PipelineController
- SavePipelineCommand
- 20251216000000_MigrateDefaultStages migration
```

## Reference

See `references/keep-a-changelog-format.md` for format rules. Related: `documentation`, `release-notes`, `commit`.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, use `AskUserQuestion` first. Do NOT judge the task "simple enough to skip"; the user chooses:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — investigate → plan → feature-implement → review → changelog
> 2. **Execute `/changelog` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after this skill, use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious"; the user decides:

- **"/test (Recommended)"** — Run tests after changelog update
- **"/docs-update"** — Update docs if needed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting, including each file read; this prevents context loss. For simple tasks, AI MUST ATTENTION ask the user whether to skip.

> **External Memory:** For complex or lengthy research, analysis, scans, or reviews, write intermediate findings and final results to `tmp/reports/`; this prevents context loss and preserves the deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation needs `file:line` proof or traced evidence with a confidence percentage (>80% act; <80% verify first).

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`. After compaction, resume, delegation, or a material context change, repeat the route and restate the set; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Load detail just in time immediately before the first target read/grep/edit/test; hooks may provide a pointer, but a hook event or prior turn is never evidence that the current files were read.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work. On compaction, resume, delegation, or a context change, re-read the required docs and restate the route before continuing.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a Keep-a-Changelog entry under `[Unreleased]` that tells users, in business terms, what changed and why it matters, cites affected logical IDs, flags breaking changes, and NEVER names files/classes in entry prose.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act.
- **Project Reference Docs:** Read required project-reference docs (always `lessons.md`) before target work.

**IMPORTANT MUST ATTENTION — main steps (run in order, NEVER skip/merge):** find and read `CHANGELOG.md` (root preferred, docs fallback, else create root) → choose PR/commit/range scope → create `tmp/changelog-notes-{YYMMDD-HHMM}.md` with Added/Changed/Fixed/Deprecated/Removed/Security → review EVERY changed file for business impact and categorize → read notes holistically for the main change, beneficiaries, and new user capability → write a grouped entry under `[Unreleased]` with `**Refs**` IDs → update while preserving existing entries → delete the notes file — why: skipping review or cleanup silently drops changes and leaves artifacts.

**IMPORTANT MUST ATTENTION** use business-focused language, group by module/feature — name the user-facing capability, NEVER the class/file/enum/migration — why: changelog readers track impact, not implementation (see Business Focus table).
**IMPORTANT MUST ATTENTION** cite `FR-`/`BR-`/`TC-` logical IDs in `**Refs**`; prefix every breaking change with `**BREAKING:**` + one-line migration/impact note; omit the Breaking block when none — why: readers need traceability and a migration signal, not noise.
**IMPORTANT MUST ATTENTION** always insert under `[Unreleased]` (create it if absent), preserve existing entries; DELETE the temp `tmp/changelog-notes-*.md` notes file in cleanup — why: a leftover notes file is an anti-pattern and entries belong only under Unreleased.

**IMPORTANT MUST ATTENTION** drive the review through the throwaway notes file: review EVERY changed file, categorize Added/Changed/Fixed/Deprecated/Removed/Security — why: skipping file review silently drops changes.
**IMPORTANT MUST ATTENTION** verify each business-impact claim against the actual diff (`file:line`), confidence >80% to act, <80% re-read the diff first — NEVER speculate impact from a filename — why: a misread diff ships a wrong user-facing claim.
**IMPORTANT MUST ATTENTION** find the existing `CHANGELOG.md` before writing — root `./CHANGELOG.md` preferred, fallback `./docs/CHANGELOG.md` — NEVER create a new changelog in `docs/` when root exists — why: a split changelog fragments release history.
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos BEFORE starting (one per file read), keep one `in_progress`, mark `completed` immediately, add a final review todo — why: long diffs exhaust context and lose findings.
**IMPORTANT MUST ATTENTION** before execution, if outside a workflow, use `AskUserQuestion` for the user's choice (`workflow-feature` or `/changelog`); after completion, use it again to offer `/test`, `/docs-update`, or manual continuation — why: workflow and follow-up choices belong to the user.

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| "Diff is small, skip the notes file"     | Still categorize each file — uncategorized changes get silently dropped.            |
| "Filename says it all, skip the diff"    | Read the diff: a filename names the file, not the business impact. Show `file:line`. |
| "Just list the files changed"            | Group by module/feature in business terms — file lists are the bad-entry anti-pattern. |
| "No existing CHANGELOG, make one in docs"| Search root first; only create at root when truly absent.                           |
| "Notes file is harmless, leave it"       | Delete it in cleanup — a leftover notes file is an anti-pattern.                     |
