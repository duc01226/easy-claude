---
name: docs-update
version: 3.5.0
description: '[Documentation] Use when a workflow step or the user asks for a documentation update. Updates the docs impacted by code, spec or test changes.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Keep docs synchronized after every code/spec/test change: triage impact, route each doc type to its owner, and align project-reference/config docs, Feature Specs, §8 TCs, test-code links, and derived indexes with shipped behavior — zero silent drift.

**Summary:**

- **Router, not author:** Phase 0 triage (git diff → categories → deduped modules → existing-doc state) routes each owner (`/spec`, `/spec [mode=tests]`, `/spec [mode=sync]`, `/spec-index`, `/tech-spec`). NEVER write §8, Feature Spec content, or derived technical views here — why: dual authorship diverges canonical docs and derived views.
- **Ordered path:** Phase 0 → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` and 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → optional Phase 4.5 `/demo-guide` → Phase 5 report → final Step 2.4 sync-verify. TC modes: `TDD-first|implement-first|update|sync|from-integration-tests`; caller flags: `modules`, `changed_files`, `phases`, `mode`, `tc_mode`, `skip_phases`, `freshness={impact|full|off}`, `base`. Create/track all 9 tasks; every skip needs evidence and a reason.
- **Gates:** Phase 1 is impact-scoped and parallel; missing Feature Spec with changed behavior BLOCKS at Phase 2; a weakened `[HARD]` BR BLOCKS final review; Phase 2.5/2.6 run only when derived outputs are affected; Phase 2.6 uses configured generation or read-only `--check`; Phase 4.5 runs only when a globbed demo guide is keyed to this change, records `DEFERRED` (detect and report, do NOT invoke) when a downstream `/demo-guide` step owns the refresh — `workflow-feature` and `workflow-bugfix` both order `docs-update → demo-guide` — and records `NOT-APPLICABLE` when no guide is keyed.
- **Contract:** Keep prose tech-agnostic outside evidence fields, update `FR-`/`BR-`/`OP-`/`TC-` mappings before prose, report generated-mirror status, and ALWAYS write the Phase 5 audit trail.

**Workflow:**

- **MUST ATTENTION** run Phase 0 triage → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` → optional Phase 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → optional Phase 4.5 `/demo-guide` → Phase 5 report → final Step 2.4 code↔spec sync-verify; track each task before/after and record every skip.

**Orchestration Model:**

```
git diff → Triage → Phase 1: Project Context Sync (PARALLEL, impact-scoped)
                  │            ├─ impacted docs/project-reference/** — verify → patch → (escalate to /scan --target=X)
                  │            ├─ impacted docs/project-config.json sections — verify → merge → validate
                  │            └─ README.md / project docs (docs-manager)
                  → Phase 2: /spec (business feature docs)
                  → Phase 2.5: /spec-index (derived index/ERD refresh) [optional]
                  → Phase 2.6: /tech-spec (derived technical view refresh/audit) [optional]
                  → Phase 3: /spec [mode=tests] (§8 test specifications)
                  → Phase 4: /spec [mode=sync] (§8 ↔ test code sync)
                  → Phase 4.5: /demo-guide (refresh an existing, change-keyed demo guide) [optional]
                  → Phase 5: Summary Report
```

**Key Rules:**

- Router only — NEVER duplicate sub-skill logic or write Section 8 / Feature Spec content
- **[BLOCKING] Freshness is impact-scoped, never assumed.** Phase 1 verifies only routed `docs/project-reference/**` docs and `docs/project-config.json` sections via `node .claude/scripts/doc-impact-map.cjs`; each gets `FRESH | PATCHED | RESCAN REQUIRED | UNVERIFIED`. Unchecked = UNVERIFIED, NEVER FRESH — why: stale injected context teaches downstream agents obsolete code.
- **Claims must name their path role precisely.** Existing repository paths must resolve; a workspace package subpath must target an existing file and, when that package declares an `exports` map, the subpath must also resolve through that map. Packages without an `exports` map may expose an existing in-package path directly. Use a same-line `<!-- dead-link-ok -->` only for an intentionally absent historical/negative-control citation, or `<!-- path-role: generated-output|proposed|user-local -->` for a generated destination, suggested new file, or developer-local path. These markers are line-scoped; never use them to hide a stale source path. Unknown roles do not suppress a claim.
- **[BLOCKING] Impact-scoped stamping follows the resolved local docs-index contract.** Only an explicit applicable local rule may require `Last verified`; without one, use the portable no-date-stamp default and retain the existing ledger/report routing. Only a full `/scan --target=X` may move `Last scanned`, and a no-op verify writes nothing — why: scan freshness and impact verification are separate signals, while a shared default must not invent local date churn.
- **[BLOCKING] A `PATCHED` project-reference doc MUST run `/prompt-enhance` on the doc, then the AI-discovery gate, before its verdict**; skip only for stamp/count-only edits — why: injected docs need concise, useful context, and a doc no index routes to is never read.
- **Demo guides are in scope, and their absence is a stated verdict.** Phase 4.5 globs the resolved `demoGuide.outputDir` (never a guessed filename), keys each found guide to this change via its `Sources` / `Governing spec` / case `TC-*` / `Scope` header fields, and routes the refresh to `/demo-guide --output {existing path}` — no guide, or none related → explicit `NOT-APPLICABLE` — why: a stale demo guide sends a presenter into a room with retired `TC-*` IDs and an outdated backlog block.
- Phase 1/docs-manager MUST NOT own any `docs/specs/**` Feature Spec, test-spec, spec-index/ERD, derived technical-view, or demo-guide path — that business spec root defaults to `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.
- Every excluded artifact is explicitly reserved to its child skill (`/spec`, `/spec-index`, or `/tech-spec`) so one canonical writer owns it.
- Exclude `docs/specs/**` — the whole business spec tree (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — and generated technical views from every docs-manager brief/write set; check each phase's trigger before invoking.
- Step-to-skill order is fixed and sequential. ALWAYS report what was checked, including no-op phases.
- Pass changed files, deduped modules, and impacted sections to each sub-skill via `$ARGUMENTS`.
- MUST ATTENTION dedup module list — backend + frontend changes for same module = ONE entry
- MUST ATTENTION track step state live: `in_progress` -> execute -> `completed` (or `completed` with skip reason)
- **MUST ATTENTION** classify every `unrouted` file manually; **NEVER** treat a missing routing rule as proof of no impact.
- For `.claude` skills/hooks/workflows/sync tooling changes, flag generated mirror sync status (`/sync-codex` completed or explicit N/A). `docs-update` routes and reports this check; it does not edit generated mirrors directly.
- **[BLOCKING] Tech-agnostic output:** when updating spec/specs/README/INDEX, do NOT add framework/product/language/design-pattern names to prose/headings. Preserve evidence carriers (`**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter, Mermaid). Authority: `spec-principles.md` §3, in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

> **AI-SDD Artifact Contract** — Keep reusable SDD rules in `.claude`; keep local paths, commands, ownership, and formats in project-reference docs. Require `spec -> plan -> tasks -> implement -> verify -> update spec/docs`, logical-ID traceability, explicit unknowns, and tests that guard intent.
>
> **MUST ATTENTION READ** `.claude/skills/shared/sdd-artifact-contract.md` for full M1-M7 criteria.

- **[BLOCKING] M3 Traceability Update:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. When syncing docs after code changes, update the logical-ID mappings (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then the prose. The `[Source: namespace/service/id]` abstract-anchor evidence is re-resolved ONLY if the logical artifact was renamed/split — a file move or stack change does NOT change the anchor (physical coords live only in the provenance sidecar) — and the logical-ID spine stays stable across the change — never drop or renumber a logical ID just because the code moved. Keep all synced prose M1/M2-clean.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

---

## Mandatory Task Creation (ZERO TOLERANCE)

> **[BLOCKING]** Create ALL 9 tasks via `TaskCreate` BEFORE touching any file. NEVER consolidate, rename, omit. Conditional tasks skipped: mark `completed` immediately with reason — NEVER silently omit.

| #   | Task Subject                                                                                              | Conditional?                                                                             |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `[docs-update] Phase 0 — Triage: collect git diff, categorize files, detect modules, check existing docs` | No — always first                                                                        |
| 2   | `[docs-update] Phase 1 — Project context sync: impact-map → PARALLEL verify of impacted docs/project-reference/** + docs/project-config.json sections + README/project docs` | No — always, unless Step 0.3 declared a TRUE fast exit (empty impact map). Runs even when Phases 2-4 are all skipped |
| 3   | `[docs-update] Phase 2 — Invoke /spec: update business feature docs`                              | Yes — service/frontend files changed AND module has existing feature docs                |
| 4   | `[docs-update] Phase 2.5/2.6 — Refresh derived views via /spec-index and/or /tech-spec`              | Yes — Feature Spec changed and bucket maintains INDEX/ERD, OR technical tree is affected |
| 5   | `[docs-update] Phase 3 — Invoke /spec [mode=tests]: update/add §8 business test specifications`                    | Yes — business-visible functionality added OR existing business-visible behavior changed  |
| 6   | `[docs-update] Phase 4 — Invoke /spec [mode=sync]: sync §8 ↔ test code`                          | Yes — Phase 3 changed §8 TCs                                                              |
| 7   | `[docs-update] Phase 4.5 — Detect an existing demo guide, key it to this change, route the refresh to /demo-guide` | Yes — a guide exists under the resolved `demoGuide.outputDir` AND is keyed to this change |
| 8   | `[docs-update] Phase 5 — Write summary report to tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`            | No — always                                                                              |
| 9   | `[docs-update] Final review — verify all impacted docs updated, no phases skipped without justification, AND run the Step 2.4 code↔spec sync-verify (AC/BR/TC drift) for every touched module` | No — always                                                                              |

**Execution rules:**

- Mark one task `in_progress` before work and `completed` after; NEVER batch-complete or run a phase before its task is active.
- Add Phase 2/3 subtasks per module; add Task 2 subtasks per impacted doc/source-of-truth cluster so every verdict is tracked.
- TRUE fast-exit (empty impact map) → complete Tasks 2-9 with reason "Skipped — impact map empty"; preserve fixed order token `0 → 1 → 2 → 2.5/2.6 → 3 → 4 → 4.5 → 5 → final review`.
- PARTIAL exit (docs/config-only impact) → run Task 2, complete Tasks 3-7 with reason "Skipped — no business behavior changed", then run Tasks 8-9.
- After each phase/skill call, record one-line evidence (`what ran`, `what changed`, or `why skipped`).
- If `TaskCreate`/updates unavailable, maintain an equivalent 9-task tracker with identical transitions.

---

## Step-Skill Call Order (Do Not Reorder)

| Order | Task ID | Step / Phase                   | Skill Call                             | Tracking Rule                                                                                   |
| ----- | ------- | ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1     | 1       | Phase 0: Triage                | Inline triage logic in this skill      | Set Task 1 `in_progress` before diff scan; set `completed` after module + impact map recorded   |
| 2     | 2       | Phase 1: Project Context Sync  | `doc-impact-map.cjs` + PARALLEL `docs-manager` sub-agents (one per impacted doc/cluster) + `/scan --target=X` or `/project-config` only on escalation | Set Task 2 `in_progress` before the impact map; `completed` only after EVERY routed doc and config section carries a verdict + evidence |
| 3     | 3       | Phase 2: Business Feature Docs | `/spec`                        | Set Task 3 `in_progress` before invocation; `completed` after output review                     |
| 4     | 4       | Phase 2.5/2.6: Derived View Refresh | `/spec-index [mode=index]` and/or `/tech-spec [mode=generate|audit]` | Set Task 4 `in_progress` before invocation; `completed` after derived outputs are refreshed or skipped with reason |
| 5     | 5       | Phase 3: §8 Test Specs         | `/spec [mode=tests]`                            | Set Task 5 `in_progress` before invocation; `completed` after TC review                         |
| 6     | 6       | Phase 4: §8 ↔ Test Code Sync   | `/spec [mode=sync]`           | Set Task 6 `in_progress` before invocation; `completed` after sync validation                   |
| 7     | 7       | Phase 4.5: Demo Guide Refresh  | Glob the resolved `demoGuide.outputDir`, then `/demo-guide --output {existing path}` | Set Task 7 `in_progress` before the existence glob; `completed` only after every found guide carries a verdict (refreshed / unrelated-skip / DEFERRED / UNVERIFIED) or `NOT-APPLICABLE` is recorded |
| 8     | 8       | Phase 5: Summary Report        | Inline report write                    | Set Task 8 `in_progress` before report write; `completed` after file path confirmed             |
| 9     | 9       | Final Review                   | Inline verification gate               | Set Task 9 `in_progress` before final audit; `completed` after all phases justified             |

**Enforcement:** If a required step cannot run, STOP and ask user before adapting order. Never continue with untracked steps.

---

## Phase 0: Triage — Detect Impacted Documentation

### Step 0.1: Collect Changed Files

Run `git diff --name-only HEAD` (staged + unstaged); if empty, run `git diff --name-only HEAD~1` (last commit); if still empty, run `git diff --name-only origin/develop...HEAD` (branch changes).

### Step 0.2: Categorize Changes

| Changed File Pattern                                                                | Impact Category                                | Phases to Run |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| `{backend-source-paths}/**` from `docs/project-config.json`                         | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{frontend-apps-dir}/**`, `{frontend-libs-dir}/{domain-lib}/**`                     | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{legacy-frontend-dir}/**Client/**`                                                 | **spec** + **spec [mode=tests]** + project-docs | 1 + 2 + 3 + 4 |
| `{configured-framework-source-paths}/**`                                            | project-docs only                              | 1 only        |
| `docs/**` (outside `specRoots`)                                                     | project-docs only                              | 1 only        |
| `.claude/**`, `.agents/**`, `.codex/**`, `CLAUDE.md`, `AGENTS.md`                    | **harness inventory** — skill/hook/agent/workflow counts, catalogs, module registry | 1 only |
| Dependency manifests (`package.json`, `*.csproj`, `pyproject.toml`, lockfiles, …)   | project-docs — tech stack, versions, run commands | 1 only     |
| Infra/CI/env (`docker-compose*`, `Dockerfile`, `.github/workflows/**`, `*.tf`, `appsettings*`, `.env*`) | project-docs — ports, deployment, env keys | 1 only |
| `{frontend-libs-dir}/{framework-core-lib}/**`, `{frontend-libs-dir}/{common-lib}/**` | project-docs only                              | 1 only        |

> This table classifies BUSINESS-doc impact (which of Phases 2-4 run). It is deliberately coarse. The precise `docs/project-reference/**` + `docs/project-config.json` routing is produced by the impact map in Step 1.1 — read it there, never guess it here.

### Step 0.3: Fast Exit Check — decided by the impact map, never by path intuition

Run the Step 1.1 impact map now and read `fastExit`:

```bash
node .claude/scripts/doc-impact-map.cjs --text
```

| Map result | Route |
| ---------- | ----- |
| `fastExit: true` — no impacted reference doc, no impacted config section, no `unrouted` file | Report `"No documentation impacted by current changes."` → mark tasks 2-8 `completed` with reason "Skipped — impact map empty" → **exit early** |
| Impacted docs/config but NO business behavior changed (harness, CI, manifests, docs tree) | **PARTIAL exit** — run Phase 1 in full, mark Phases 2-4 `completed` with reason "Skipped — no business behavior changed", continue to Phase 5 |
| Any business/service/frontend code changed | Full sequence |
| `unrouted` non-empty | NOT a fast exit — classify each unrouted file by hand first (add it to the wave, or record why it carries no doc impact) |

> **[BLOCKING] A `.claude/**`-only (or tooling-only) diff is NOT a full fast exit.** Harness edits can stale glob-derived counts/catalogs in `CLAUDE.md`, `docs-index-reference.md`, and `project-structure-reference.md`; Phases 2-4 only inspect the business spec tree. — why: classifying tooling as no-impact skips the only freshness pass.

### Step 0.4: Auto-Detect Affected Modules

Extract module names from changed paths, then apply `unique()` before any sub-skill — backend + frontend changes in one module = ONE entry; this prevents duplicate `/spec` calls.

| Changed File Path Pattern                           | Detected Module                  |
| --------------------------------------------------- | -------------------------------- |
| `{backend-module-path}/{Module}/**`                 | {Module}                         |
| `{frontend-apps-dir}/{app-name}/**`                 | {Module} (map app to module)     |
| `{frontend-libs-dir}/{domain-lib}/{configured-feature-path}/**` | {Module} (map feature to module) |
| `{legacy-frontend-dir}/{Module}Client/**`           | {Module}                         |

Build project-specific mapping from `docs/project-config.json` and project reference docs, not from hard-coded skill paths:

```bash
node -e "const cfg=require('./.claude/hooks/lib/project-config-loader.cjs').loadProjectConfig(); console.log(JSON.stringify({sourcePaths: cfg.codebaseHealth?.sourcePaths, contextGroups: cfg.contextGroups?.map(g => ({name:g.name,pathRegexes:g.pathRegexes})), specRoot: 'docs/specs/'}, null, 2))"
node -e "process.stdout.write('docs/specs/')"
```

### Step 0.5: Check Existing Docs for Each Module

For each detected module, verify its matching bucket under the business spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path — exists and contains `README.*.md` Feature Specs (or follows the project-reference feature-doc layout); record `hasFeatureSpec` (§1–§7), `hasTestSpecs` (§8), and `hasDerivedIndex` (bucket `INDEX.md`).

### Step 0.6: Declare the Doc-Update Wave

Detection is SEQ and FIRST; derive assignments from the impacted-doc set after Steps 0.1–0.5. Then update unrelated docs in parallel: one `docs-manager` sub-agent per doc/source-of-truth cluster, all spawned in ONE message.

1. **Declare before dispatch** — `Parallel plan: wave 1 = [docs-manager: {doc A}, docs-manager: {cluster B}, …] · SEQ = [Phase 0 triage, the Phase 2 → 2.5/2.6 → 3 → 4 spec chain, Phase 5 report] (reason)`.
2. **STRICT one-writer-per-file.** State each impacted doc's owned file set in EXACTLY ONE brief; nobody-owned docs are silent misses, and two writers create lost updates.
3. **[HAZARD] Cluster shared source data with ONE agent.** Counts, catalogs, module maps, INDEX rows, ERD entities, and copied tables MUST be regenerated by ONE writer from ONE source read; cluster by SOURCE OF TRUTH, not directory.
4. **Barrier before the spec chain.** Phase 2 → 2.5/2.6 → 3 → 4 stays FIXED SEQ: `/spec` feeds derived views, §8 TCs feed `[mode=sync]`; parallelize only independent modules inside a phase.
5. **Per-module fan-out is PAR only when modules are disjoint.** Modules sharing one Feature Spec stay one task; Step 0.4 dedup is the reason.
6. Every member returns a summary + `Full report:` path; merge only after ALL members return, including skipped members.

---

## Phase 1: Project Context Sync — Reference Docs + project-config.json (PARALLEL, impact-scoped)

> **Why:** `docs/project-reference/**` and `docs/project-config.json` route every skill and enter every downstream AI context. Code moves can leave them teaching obsolete behavior; Phases 2-4 inspect only `docs/specs/**`. `/scan-all` + `/project-config` rebuild from zero on the 60-day cadence; this phase gives the same no-stale guarantee at diff scope after every change.

**When to run:** ALWAYS, unless Step 0.3 declared a TRUE fast exit. Run it even when every one of Phases 2-4 is skipped.

**Scope discipline:** verify ONLY map-routed content; escalate to full `/scan --target=X` when surgical repair cannot restore truth. NEVER regenerate all docs or hand-author a full reference doc — `scan` authors; this phase verifies and repairs narrowly.

### Step 1.1: Build the Doc-Impact Map (SEQ — everything below derives from it)

```bash
node .claude/scripts/doc-impact-map.cjs --json     # machine-readable (drives the wave)
node .claude/scripts/doc-impact-map.cjs --text     # human-readable (goes in the report)
node .claude/scripts/doc-impact-map.cjs --base=origin/main   # branch-scope instead of working tree
```

The map routes changed files to at-risk docs/config sections and returns per doc: `doc`, `exists`, `lastScanned`/`ageDays`, the exact owner invocation in `scanTarget` (including a generic custom filename where applicable), `checks`, `changedFiles`/`addedFiles`/`deletedFiles`, and `heuristicOnly`. It derives routing from `docs/project-config.json` (`contextGroups`, `modules`, `testing`, `e2eTesting`, `styling`, `designSystem`, `specRoots`, and selected generic `referenceDocs`) plus change classes — never hardcoded paths.

**Handling the map's output — [BLOCKING] rules:**

1. `unrouted` means no routing rule, not no impact. Classify each manually: add it to the wave or report why it carries no doc impact. NEVER let one pass as fresh.
2. `heuristicOnly` is a GUESS, not evidence. Verify it like any other; downgrade to not impacted only with a stated reason.
3. `exists: false` means MISSING, not fresh → invoke `/<scanTarget>` exactly as returned, or `/docs-init` when the whole set is absent. A generic custom route already carries its exact `--filename` argument.
4. If the script is unavailable, derive the same map manually from `docs/project-config.json`: match `contextGroups[].pathRegexes` → `guideDoc`/`patternsDoc`/`stylingDoc`/`designSystemDoc`, `modules[].pathRegex` → project structure/modules, tests/e2e/styles → their docs, manifests → stack, infra/CI → ports/deployment, `.claude/**` → inventory. Record the manual route.

### Step 1.2: Declare the Verify Wave (PAR — one message, all members)

`Parallel plan: wave 1 = [docs-manager: {doc A}, docs-manager: {cluster B}, docs-manager: project-config.json, …] · SEQ = [Step 1.1 impact map, the Phase 2 → 2.5/2.6 → 3 → 4 spec chain, Phase 5 report] (reason)`

Wave construction applies Step 0.6 hazards, plus:

- **STRICT one-writer-per-file.** `docs/project-config.json` always has exactly ONE owning agent; two JSON writers guarantee lost updates.
- **Cluster by SOURCE OF TRUTH, not directory.** Keep `README.md` + `project-structure-reference.md` (module map), and `CLAUDE.md` + `docs-index-reference.md` + `project-structure-reference.md` (`.claude/` counts), with ONE agent per source cluster.
- Every routed doc appears in exactly one brief; nobody-owned docs are silent misses.
- Every member returns its verdict table + `Full report:` path; merge only after ALL members return.

### Step 1.3: Per-Doc Verify Contract (what each wave member actually does)

Verify FIRST; patch NARROW. Run only map-listed `checks`:

| Check | Question it answers | How to answer it | On failure |
| ----- | ------------------- | ---------------- | ---------- |
| `claims` | Do the doc's cited paths/examples still exist? | `node .claude/scripts/doc-impact-map.cjs claims <doc>` (`missing` = dead, `ambiguous` = short-form that resolves by suffix), then grep each cited symbol at its cited file | Repoint or delete a dead citation, repo-root an ambiguous one (a citation is evidence — never leave a dead one). The `reference-doc-freshness` test suite fails the build on any dead citation |
| `coverage` | Does every ADDED artifact of this doc's kind appear in it? | Diff the map's `addedFiles` against the doc's inventory/examples | Add the missing row/example with `file:line` |
| `counts` | Do numeric claims match ground truth? | Re-derive by glob/grep (skills, hooks, agents, workflows, services, docs, tests) | Update the number — and the marker region if the count is generated |
| `conventions` | Did the diff introduce a pattern the doc does not describe, or violate one it does? | Read the diff against the doc's rules | New pattern → document it. Violation → **report it, do NOT document it as a convention** |
| `commands` | Do documented run/test commands still work? | Compare against manifests/scripts (`package.json`, test config, `integrationTestVerify`) | Patch the command |
| `versions` | Do stated tech/framework versions match the manifests? | Read the manifest — never infer | Patch the version |
| `ports` | Do documented ports/endpoints match infra config? | Read compose/k8s/appsettings — never infer | Patch the port |
| `links` / `catalog` | Do cross-links and catalog rows resolve? | Existence-check each target | Fix or remove the row |

**Verdict per doc (exactly one, evidence required):**

| Verdict | Meaning | Required evidence |
| ------- | ------- | ----------------- |
| `FRESH` | Every applicable check ran and passed; no edit needed | Which checks ran + what was compared |
| `PATCHED` | Surgical edit applied, then `/prompt-enhance <doc>` run to keep it concise | Sections touched + `file:line` evidence for each new claim + prompt-enhance run confirmation (or stated reason skipped) |
| `RESCAN REQUIRED` | Beyond surgical repair — a new subsystem/pattern family appeared, most of the impacted section's examples are dead, or the doc's structure no longer fits the code | The `scanTarget` to run (`/scan --target=X`), and whether it ran in this session or is queued |
| `UNVERIFIED` | Could not be checked (missing tooling, blocked read, budget) | Why, and what must run next |

> **[BLOCKING] Never fabricate freshness.** "Looks fine", "probably unchanged", and "small diff" are not checks. Unverified = `UNVERIFIED`, never `FRESH` — false FRESH retires the suspicion that would catch later drift.

> **[BLOCKING] Every `PATCHED` project-reference doc MUST run `/prompt-enhance <doc>` (default `--op=enhance`) before its verdict.** These docs enter every downstream context; re-compress surgical edits. `/scan --target=X` already performs this on full rescan (`scan/SKILL.md` Final Step), so an escalated rescan needs no separate call. Skip ONLY for a stamp/date/count-only edit, and record the reason.

> **[BLOCKING] AI-discovery gate on every `PATCHED` doc (`SYNC:ai-discovery-doc-quality`), after `/prompt-enhance`.** Check the touched sections plus the top/bottom anchors: purpose + critical rules still on the first screen, closing reminders still present on a long doc, every new or edited pointer to another doc is `read <path> when <situation>` with an existing target. A doc this change added, renamed, or retired must be routed (or un-routed) in the docs index and root context — when it is not, record the docs-index doc as `RESCAN REQUIRED`, and route a new or renamed doc's `referenceDocs` entry through `/project-config` so the root Doc Lookup can route it, rather than leaving an orphan or a dead route.

### Step 1.4: project-config.json Drift Check (single writer, schema-validated)

Verify ONLY map-flagged sections:

1. **Re-derive from evidence** — read changed files, not the old value.
2. **Surgical merge** — add/update entries; NEVER rename, remove, or restructure a top-level section (`/project-config` Schema Protection Rules still apply).
3. **Prove every touched `pathRegex`/path matches a real file** — zero matches silently disable dependent routers, and schema validation will not catch it:

```bash
node -e "const c=require('./.claude/hooks/lib/project-config-loader.cjs').loadProjectConfig();const {execSync}=require('child_process');const files=execSync('git ls-files',{encoding:'utf8'}).split('\n').filter(Boolean).map(f=>'/'+f);for(const m of c.modules||[]){const re=new RegExp(m.pathRegex,'i');const n=files.filter(f=>re.test(f)).length;console.log((n?'OK  ':'DEAD')+' modules.'+m.name+' -> '+n+' file(s)')}"
```

4. **Validate the schema** after merging:

```bash
node -e "const {validateConfig}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(JSON.stringify(validateConfig(require('./.claude/hooks/lib/project-config-loader.cjs').loadProjectConfig()),null,2))"
```

5. **Escalate; do not improvise.** A NEW top-level section, module class, tech stack, or failed validation requires `/project-config` re-scan; report it if unavailable.

### Step 1.5: README & Project Docs (docs-manager)

Pass Phase 0 diff context to a `docs-manager` sub-agent (`subagent_type="docs-manager"`) in the same wave:

- `README.md` — update if project scope or setup changed (keep under 300 lines)
- `project-structure-reference.md`, in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path — update if service architecture or cross-service patterns changed (same agent as README: shared source of truth)

Standalone invocation may first delegate 2-4 read-only landscape threads to `researcher`; workflow invocation uses Phase 0 context directly.

This agent NEVER owns Feature Specs, test specs, spec-index/ERD, or derived technical views.

### Step 1.6: Stamp Discipline (BLOCKING)

| What ran | Stamp behavior |
| -------- | -------------- |
| Full `/scan --target=X` | Only a full scan may write or move `<!-- Last scanned: YYYY-MM-DD -->` (owned by `scan`, top of doc). An impact-scoped pass MUST NOT add, update, or move `Last scanned`. |
| Impact-scoped verify/patch on a project-reference doc | Resolve and read `docs-index-reference.md` from the project's reference-doc root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified; otherwise write NO tracked date stamp. Record the verdict in the Step 1.7 output, and record the pass in the untracked local ledger: `node .claude/hooks/lib/doc-stamp-guard.cjs --record-verified <doc filename>` (filename only, e.g. `backend-patterns-reference.md`). |
| Impact-scoped verify/patch on any OTHER doc — `CLAUDE.md`, `.claude/docs/**`, any Feature Spec, any AI-facing instruction file | Follow an explicit applicable stamp rule in the resolved local docs-index; if no applicable explicit rule exists, the portable default is NO tracked date stamp. Record NO ledger entry for these non-reference docs; the Step 1.7 verdict is the whole record. — why: the ledger feeds the 60-day reference-doc staleness gate, which tracks built-ins in the shared registry plus selected generic custom docs; entries for other docs are unreadable by that gate and the CLI rejects them. |

> **[BLOCKING] `Last verified` is governed by local documentation policy, not a universal framework rule.** Resolve and read `docs-index-reference.md` under the project's reference-doc root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). Follow any applicable explicit stamp rule exactly, including its scope, format, and placement. If the local docs-index is missing or has no applicable explicit rule, write NO tracked date stamp and preserve the ledger/report routing above. When the applicable rule does not allow this stamp—or no applicable rule exists—remove a pre-existing `Last verified` line only as part of an otherwise-required content patch, never in a stamp-only write. Never infer a rule from a pre-existing stamp or invent a local exception — why: stamp conventions belong to each project, and the portable framework must not create date churn where a local contract does not ask for it.

> **[BLOCKING] An impact-scoped pass MUST NOT add, update, or move `Last scanned`.** It feeds the 60-day full-rescan gate (`getStaleReferenceDocs` → `refreshScanStaleFlag`, `.claude/hooks/lib/session-init-helpers.cjs:769-810`); moving it would disable the net that catches whole-doc rot.

> **[BLOCKING] A verify pass that changes nothing writes nothing, regardless of any local stamp rule.** A `FRESH` verdict is a report, not an edit: do not re-save the file, do not normalize its whitespace, do not move or add any date. Before saving a patched doc, confirm the edit is real with `node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file>` (exit 3 = no-op → skip the write).

After any doc in this run WAS fully rescanned, re-evaluate the gate:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

### Step 1.7: Phase 1 Output

Emit the freshness table in the Phase 5 report: one row per routed doc/config section with verdict, checks, and evidence. Carry `RESCAN REQUIRED`/`UNVERIFIED` docs into **Recommendations** so debt survives the session.

---

## Phase 2: Business Feature Documentation — Invoke `/spec`

**When to run:** `hasFeatureDocs = true` for a triaged module AND service/frontend files changed.

**When to skip:** No service/frontend feature files changed; report `"No business feature docs impacted."`

### Step 2.1: Determine Create vs Update

| Scenario                                                              | Action                                                                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module has existing feature docs                                      | Invoke `/spec` — auto-detect triggers update flow                                                                                                                         |
| Module has NO feature docs **AND change adds/changes a feature** (new endpoint, command/query, entity, business rule, user-facing behavior) | **BLOCK** — Report: `"Module {Module} has NO Feature Spec but this change introduces feature behavior. Create the tech-free 8-section Feature Spec FIRST via /spec, then re-run docs-update."` Do NOT skip. This is the doc-first gate. |
| Module has NO feature docs **AND change is tooling/style/config-only** (no behavioral impact) | Skip with reason `"No feature behavior changed — no Feature Spec required."` (matches Phase 0 fast-exit at `:113-120`).                                                            |
| User explicitly asked for full doc creation                          | Invoke `/spec` with explicit module name                                                                                                                                  |

### Step 2.2: Invoke `/spec`

```
/spec Update feature docs for modules: {detected modules}.
Changed files: {list from triage}.
Impacted sections based on change types: {section impact from triage}.
Mode: update (existing docs only, do not create from scratch).
```

**What `/spec` handles (DO NOT duplicate here):**

- 8-section tech-free structure and principles (implementation details only in §8 evidence carriers + `[Source:]`)
- Diff analysis → section-impact mapping → evidence-backed updates
- Codebase analysis (entities, commands, queries, controllers)
- Bucket `INDEX.md` row update
- 3-pass verification: evidence audit, domain model, cross-reference

### Step 2.3: Review `/spec` Output

1. Updated sections match triage's impact mapping.
2. No triage-flagged section is missed; if a gap appears, re-invoke `/spec` for it.

### Step 2.4: Code↔Spec Sync-Verify (final pass — runs because docs-update is last in every sequence)

> **Purpose:** docs-update runs LAST in feature/bugfix/big-feature; this is the workflow's final gate and the Phase 4 commit hook's order-time partner (this step guides; the hook enforces). Verify SHIPPED code matches its mapped tech-free 8-section Feature Spec before completion.

For each touched module, diff changed code against its Feature Spec and check the three sets:

| Spec set (Feature Spec section) | Sync check against changed code                                                                                           | On drift |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| **§3 Acceptance Criteria** (AC-{FC}-NN) | Every changed user-facing behavior maps to an AC; new behavior with no AC = missing AC.                            | Report drift; re-invoke `/spec` to add the AC. |
| **§4 Business Rules** (BR-{FC}-NNN, [HARD]/[SOFT]) | Each changed validation/invariant matches a BR; a [HARD] rule whose code path was removed/weakened = regression. | **BLOCK** — surface as a code-vs-spec contradiction for the author to resolve. |
| **§8 Test Specifications** (TC-{FC}-NNN + `CoveredBy:`) | Each new/changed business-visible behavior has a TC; each `Tested` TC's `CoveredBy: {File}::{Method}` or approved coverage carrier still resolves. Legacy `IntegrationTest:` is migration input only. | Report; route to `/spec [mode=sync]`. |
| **Derived technical views** (`specRoots.technical.path`) | Technical-only coverage or component topology changes may require a regenerated/audited derived view. The view is generated from code/tests and is never hand-authored. | Report; route to `/tech-spec [mode=generate|audit]`. |

**Output:** append a short sync-verify table (module · AC drift · BR drift/contradiction · TC drift) to the docs-update report. Clean = no drift across all three. A `[HARD]`-BR contradiction blocks completion until resolved or owner-accepted.

> **Scope:** business code↔spec drift only. Technical contracts (API routes/DTOs, bus/job mechanics) are code-canonical and NOT re-verified against prose. No new sequence step or `verify-sync` mode; this stays inside docs-update's final pass.

---

## Phase 2.5: Derived Index / ERD Refresh (OPTIONAL — spec-index)

> **[SINGLE-HOME]** The canonical artifact is the Phase 2 8-section Feature Spec; `spec-index` regenerates only the DERIVED bucket `INDEX.md` / cross-capability ERD **from** those specs. It never re-extracts an A-E tree. Run only when Phase 2 made a maintained derived index/ERD stale.

**When to run:** Phase 2 changed Feature Specs AND their bucket maintains a lagging derived `INDEX.md` / ERD.

**When to skip:**

- Only `docs/`, `.claude/`, or config files changed.
- No Feature Spec under `{Bucket}/` in the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) was touched.
- Phase 2 was skipped (no feature impact).
- No derived index/ERD is maintained, or `project-config.json` contains `"spec_discovery_update": false`.
- `spec` already refreshed `INDEX.md` in Phase 2.

### Step 2.5.1: Resolve the Bucket

- Map changed services to an App Bucket via `spec-system-reference.md` → **App Bucket Mapping**, in the project-reference docs root (default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
- Confirm `{Bucket}/` under the business spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) holds updated Feature Specs.

### Step 2.5.2: Invoke spec-index (Derived Index Mode)

Resolve `<specs>` first — `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getSpecDocsPath())"` — then brief:

```
/spec-index mode=index bucket={Bucket} artifacts=INDEX[,ERD]
Source: the canonical Feature Specs in <specs>{Bucket}/.
Output: regenerated DERIVED <specs>{Bucket}/INDEX.md (+ {Bucket}.erd.md if maintained), each carrying the DERIVED banner.
```

### Step 2.5.3: Verify Refresh Complete

- Confirm `INDEX.md` rows match current Feature Specs (no dangling links or missing capabilities).
- Confirm DERIVED banner + regenerate date.
- Report: `"Derived index refreshed: {Bucket} — {N} capabilities catalogued"`.

> **Separation of concerns:** `docs-update` passes bucket scope to `spec-index`; NEVER hand-edit the derived index or recreate retired `M##`/A-E artifacts.

---

## Phase 2.6: Derived Technical View Refresh (OPTIONAL — tech-spec)

> **[SINGLE-HOME]** `docs/project-config.json` → `specRoots.technical.path` owns the derived technical root. `/tech-spec` owns its output; `docs-update` routes and verifies, never hand-edits.

**When to run:** The impact map/source anchors show a code/test change affects the configured technical tree. Technical-only tooling changes may still need a generator freshness check.

**When to skip:** Docs/config-only change; no technical source/annotation affected; technical scan not configured; or derived tree demonstrably unaffected. Record evidence/reason in Phase 5; absent `techSpecScan` is not permission to invent an annotation pattern.

### Step 2.6.1: Resolve the Technical Scope

- Resolve `specRoots.technical.path` and any `techSpecScan` settings from project configuration.
- The generator CLI owns full configured-root generation and read-only `--check`; do not route to unsupported `--scope` or `--all`.
- If technical source affects the derived tree, invoke `/tech-spec` with component context and let it determine output. Keep this router's write set empty.

### Step 2.6.2: Invoke and Verify

```text
node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs
```

For a read-only gate, use `node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs --check --optional`. If `techSpecScan` is absent, the sync orchestrator records `SKIP (not configured)`; direct generator invocation remains fail-closed for malformed declared contracts.

Verify through `/tech-spec`: every emitted view has the DERIVED banner, the technical root has no retired artifacts, anchors are traceable, and a second unchanged check is byte-stable. Report paths, files written/removed/unchanged, and freshness verdict.

---

## Phase 3: Test Specifications — Invoke `/spec [mode=tests]`

**When to run:** New or changed business-visible behavior. Technical-only changes with no user/QC-visible outcome produce no business §8 edits; route technical coverage to tests and `/tech-spec`.

**When to skip:** Cosmetic (styling/comments) or docs-only changes with no behavior impact.

### Step 3.1: Determine TC Mode

| Context                                | TC Mode                  |
| -------------------------------------- | ------------------------ |
| New feature code, no existing TCs      | `implement-first`        |
| PBI/story exists, code not yet written | `TDD-first`              |
| Existing TCs + code changes / bugfix   | `update`                 |
| User says "sync test specs"            | `sync`                   |
| Tests exist with annotations, no docs  | `from-integration-tests` |

**PBI/idea artifact route:** When changed artifacts match configured PBI/idea artifact roots from `docs/project-config.json` or project reference docs, `docs-update` performs detection/delegation only: identify module, Feature Spec, and TC scope, then route to `/spec`, `/spec [mode=tests]`, or `/spec [mode=sync]`. NEVER generate TC content directly from PBI/idea artifacts or edit §8. If roots are absent, ask the user to initialize project config/reference docs before assuming a path.

### Step 3.2: Invoke `/spec [mode=tests]`

```
/spec [mode=tests] Mode: {detected mode}.
Modules: {detected modules}.
Changed files: {list from triage}.
Business-visible functionality detected: {new or changed user/QC-visible outcomes from diff analysis}.
```

**What `/spec [mode=tests]` handles (DO NOT duplicate here):**

- 5 modes: TDD-first, implement-first, update, sync, from-integration-tests
- `TC-{FEATURE}-{NNN}` format with decade-based numbering and interactive TC review (`AskUserQuestion`)
- Cross-cutting categories: authorization, seed data, performance, data migration
- Phase-mapped coverage, graph context analysis for cross-service impact, and per-TC evidence verification
- Write to Feature Spec §8 (canonical business TC registry)

### Step 3.3: Review `/spec [mode=tests]` Output

1. New TCs cover all new business-visible functionality from triage.
2. TC IDs do not collide with existing IDs; evidence fields are populated, not placeholders.

---

## Phase 4: Test Spec ↔ Test Code Sync — Invoke `/spec [mode=sync]`

**When to run:** Phase 3 produced new/updated §8 TCs.

**When to skip:** No §8 test-spec changes.

### Step 4.1: Invoke `/spec [mode=sync]`

```
/spec [mode=sync] Sync test specs for capabilities: {detected features}.
Direction: forward (Feature Spec §8 Test Specifications → executing test code).
Updated TCs from Phase 3: {list of new/changed TC IDs}.
```

**What `/spec [mode=sync]` handles (DO NOT duplicate here):**

- Forward/reverse sync: §8 Test Specifications ↔ executing test code
- Two-way comparison: Feature Spec §8 vs test code (code is technical source of truth)
- Test cross-reference via configured `TestSpec` across executing tiers and per-TC `CoveredBy:`; legacy `IntegrationTest:` is migration input only

> Do not route to the retired dashboard paths `README.md` or `PRIORITY-INDEX.md` at the business spec ROOT (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); §8 is the canonical business TC registry. Derived aids are bucket `INDEX.md` (Phase 2.5) and the regenerable technical view under `specRoots.technical.path` (Phase 2.6); no hand-maintained `A-E`/`M##` tree.

### Step 4.2: Review Sync Results

1. All Phase 3 TCs appear in test code or are flagged `Untested` with rationale.
2. No orphaned TCs: test code's `TestSpec` annotations all resolve to §8.

---

## Phase 4.5: Demo Guide Refresh (OPTIONAL — demo-guide)

> **[SINGLE-HOME]** `/demo-guide` owns every file under the resolved demo-guide output dir. `docs-update` detects, matches, routes, and reports; it NEVER hand-edits a demo guide — why: a guide is proof-carrying (REAL `TC-*` IDs, `file:line` storage claims, earned proof rungs), and a hand patch cannot re-earn a rung it did not run.

**When to run:** a demo guide EXISTS (Step 4.5.1) **AND** it is keyed to this change (Step 4.5.2).

**When to skip — every skip is a RECORDED verdict, never silence:**

- No guide found → `NOT-APPLICABLE — no demo guide at {resolved dir}`, quoting the globs that were run.
- Guides found, none keyed to this change → `NOT-APPLICABLE — {n} guide(s) checked, none related`, naming each path and the key that failed.
- `/demo-guide` is a LATER step of the active workflow (`workflow-feature` and `workflow-bugfix` both order `docs-update → demo-guide`) → `DEFERRED — refresh owned by the downstream /demo-guide step`. Detect and report; do NOT invoke — why: two generators writing one guide in one run is the lost-update hazard of Step 0.6 rule 2.

### Step 4.5.1: Resolve the Output Dir, Then Glob (the existence check)

Resolve the directory FIRST and **never reconstruct a filename**: `/demo-guide` defines an output DIR (`demoGuide.outputDir`, default `docs/demo-guides` — `.claude/skills/demo-guide/SKILL.md:315-328`) but NO filename convention, so existence is decided by a directory glob, never by a guessed name.

```bash
node -e "const c=require('./.claude/hooks/lib/project-config-loader.cjs').loadProjectConfig();console.log(c.demoGuide?.outputDir||'docs/demo-guides (default — no demoGuide block)')"
```

Then glob the resolved dir, plus the default when the config block is absent:

```
Glob: {resolvedOutputDir}/**/*.md
Glob: docs/demo-guides/**/*.md          # default rung, only when demoGuide.outputDir is unset
```

Zero hits → record the `NOT-APPLICABLE` verdict with both globs, complete the task, continue to Phase 5. A guide that landed in a temp file under the skill's fallback rung is out of scope — it was never a shared deliverable (`.claude/skills/demo-guide/SKILL.md:216`).

### Step 4.5.2: Match Guide → Change (the relevance check)

Read ONLY each found guide's header block and case headings — never the whole guide. A guide is RELATED when ANY key below intersects this run's evidence; **state which key decided**.

| Key | Where it lives in the guide | Related when |
| --- | --------------------------- | ------------ |
| `**Sources:**` | header | a listed spec path, test file, changed dir, or migration intersects the Phase 0 changed-file list |
| `**Governing spec / rules:**` | header | the cited spec is a Feature Spec that Phase 2 updated |
| case `TC-*` IDs | case headings + main quick-reference table | any ID intersects the Phase 3/4 new-or-changed TC list |
| `**Scope:**` | header | the named feature maps to a Step 0.4 deduped module |

- **An unrelated guide is SKIPPED and the skip is STATED with its path** — a silent skip is indistinguishable from a missed refresh.
- A guide carrying **no header block** cannot be keyed → `UNVERIFIED — {path} has no Scope/Sources header`, plus what must run next. NEVER downgrade an unkeyable guide to "unrelated".

### Step 4.5.3: Route the Refresh (never hand-edit)

`/demo-guide` has no update mode (`.claude/skills/demo-guide/SKILL.md:76-87`), so a refresh is a re-invocation written back to the SAME path:

```
/demo-guide {feature from the guide's **Scope:** header} --output {existing guide path}
```

Name the at-risk sections in the brief so the refresh is verifiable rather than assumed:

| Changed in this run | Guide section that goes stale |
| ------------------- | ----------------------------- |
| §3 ACs / §4 BRs (Phase 2) | the `<!-- PBI:START -->` block — ACs, user stories, DoD |
| §8 TCs added or renumbered (Phase 3) | per-case `TC-*` IDs and the main quick-reference table |
| §8 ↔ test-code links (Phase 4) | per-case proof rung and the closing transparency note |
| behavior, storage, or migration | the case's expected-result discriminator + its domain storage/solution part |
| a new or removed user-facing surface | the header `🖥️ / 🔧` channel split and the technical appendix |

### Step 4.5.4: Verify and Report

Confirm the refreshed guide still carries its PBI fences, the header `Cases:` split, a proof rung per case, and the transparency note. Report `Demo guide refreshed: {path} — matched on {key} — sections {list}`, or the exact `NOT-APPLICABLE` / `DEFERRED` / `UNVERIFIED` verdict.

---

## Section Ownership Reference

`docs-update` delegates only; NEVER writes directly:

| Section                          | Owner Skill                  | docs-update Role                                       |
| -------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Project-reference docs (authoring) | `/scan --target=X`    | Verify impact-scoped + surgical patch; escalate to the scan when a patch cannot make it true — NEVER hand-author a full reference doc |
| `docs/project-config.json` (structure)  | `/project-config`     | Verify + surgical merge of impacted sections with schema validation; escalate whole-section/new-tech changes |
| §1–§7 (Feature Spec, tech-free)  | `/spec`              | Pass triage context; review output                    |
| §8 (Test Specifications)         | `/spec [mode=tests]`                  | Pass TC mode + changed files; NEVER write TCs here    |
| §8 ↔ test code sync              | `/spec [mode=sync]` | Pass capability list + direction; NEVER edit directly |
| Derived bucket `INDEX.md` / ERD  | `/spec-index` (optional)     | Pass bucket scope; NEVER hand-edit the derived index  |
| Derived technical spec view      | `/tech-spec` (optional)      | Pass service/component scope; NEVER hand-edit the derived technical file |
| Demo guides (`demoGuide.outputDir`) | `/demo-guide` (optional)  | Glob for existence, key the guide to the change, re-invoke with `--output {existing path}`; NEVER hand-edit a guide |

---

## Phase 5: Summary Report

ALWAYS write full report to `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`:

```markdown
### Documentation Update Summary

**Triage:** {N} files changed → {categories detected}
**Modules detected:** {module list}
**Generated mirror sync:** {Completed / N/A / Required before close}

**Phase 1 — Project Context Sync (impact-scoped freshness):**

Impact map: {N} changed files → {D} docs, {S} config sections, {U} unrouted ({map source: working tree / last commit / branch})

| Reference doc | Verdict | Checks run | Evidence / action |
| ------------- | ------- | ---------- | ----------------- |
| {doc} | FRESH / PATCHED / RESCAN REQUIRED / UNVERIFIED | {claims, coverage, counts, …} | {what was compared; sections patched; scan target queued} |

| project-config.json section | Verdict | Evidence / action |
| --------------------------- | ------- | ----------------- |
| {section} | FRESH / PATCHED / RESCAN REQUIRED / UNVERIFIED | {re-derived from …; schema validation result; dead pathRegex found} |

- Unrouted files classified: {file → why no doc impact}
- README / project docs: {Updated/Skipped}: {reason}
- Stamps: {docs given `Last verified` by an explicit local docs-index rule} · {docs recorded in the local ledger via `--record-verified`} · {docs fully rescanned and given `Last scanned`} · {docs left untouched because nothing changed} · staleness flag refreshed: {yes/no}

**Phase 2 — Feature Specs (/spec):**

- {Capability X}: {Updated §1–§7 / No existing Feature Spec / Not impacted}
- {Capability Y}: {Updated §4 Business Rules, §5 Domain Model / Skipped: no Feature Spec}

**Phase 2.5 — Derived Index Refresh (/spec-index, optional):**

- {Refreshed {Bucket} INDEX.md ({N} capabilities) / Skipped: no derived index maintained / Skipped: spec_discovery_update=false}

**Phase 3 — Test Specifications §8 (/spec [mode=tests]):**

- Mode: {mode used}
- New TCs: {list of TC IDs added}
- Updated TCs: {list of TC IDs modified}
- Skipped: {reason if skipped}

**Phase 4 — Test Spec ↔ Test Code Sync (/spec [mode=sync]):**

- {Synced N TCs to test code / Skipped: no §8 changes}
- Discrepancies: {§8-vs-test-code comparison issues}

**Phase 4.5 — Demo Guide Refresh (/demo-guide, optional):**

- Existence check: {globs run} → {N} guide(s) found
- {path}: {Refreshed — matched on {key}, sections {list} / Skipped — unrelated: {key that failed} / DEFERRED — downstream /demo-guide step owns it / UNVERIFIED — {reason}}
- {NOT-APPLICABLE — no demo guide at {resolved dir}}

**Recommendations:**

- {New docs that should be created}
- {Stale docs flagged but not auto-fixed}
- {TCs flagged as Untested}
```

---

## Decision Matrix: When to Use docs-update vs Direct Skill

| Scenario                                       | Use docs-update?             | Use skill directly?                        |
| ---------------------------------------------- | ---------------------------- | ------------------------------------------ |
| Post-implementation doc sync (any code change) | **Yes** — full orchestration | —                                          |
| Keep project-reference docs + `project-config.json` fresh after a change | **Yes** — Phase 1 impact-scoped verify | `/scan --target=X` or `/project-config` when a single doc/section needs a full rebuild |
| Refresh every reference doc regardless of the diff | No                        | `/scan-all` (+ `/project-config`)          |
| Create new feature docs from scratch           | No                           | `/spec`                            |
| Generate TCs for specific PBI (TDD-first)      | No                           | `/spec [mode=tests]`                                |
| Route PBI/idea artifact changes                | Yes — detection/delegation   | `/spec` + `/spec [mode=tests]` owner skills |
| Keep an existing demo guide current after a change | **Yes** — Phase 4.5 detects, keys, and routes | `/demo-guide` directly when no guide exists yet, or to author one for a new scope |
| Sync dashboard only (no code changes)          | No                           | `/spec [mode=sync]`               |
| Workflow step after `/plan-execute` or `/fix`          | **Yes** — full orchestration | —                                          |
| User asks "update docs after my changes"       | **Yes** — full orchestration | —                                          |

---

## Additional Requests

Pass caller context via `$ARGUMENTS` to avoid redundant triage or narrow scope:

| Key             | Example                                              | Effect                                |
| --------------- | ---------------------------------------------------- | ------------------------------------- |
| `modules`       | `modules=ModuleA,ModuleB`                            | Skip auto-detect; use provided list   |
| `changed_files` | `changed_files=<configured-source-path>/ModuleA/...` | Skip git diff; use provided file list |
| `phases`        | `phases=2,3`                                         | Run only specified phases             |
| `mode`          | `mode=update`                                        | Override spec mode detection  |
| `tc_mode`       | `tc_mode=implement-first`                            | Override spec [mode=tests] mode detection      |
| `skip_phases`   | `skip_phases=1,2.5`                                  | Skip specific phases                  |
| `freshness`     | `freshness=impact` (default) / `full` / `off`        | `impact` = Phase 1 as specified; `full` = escalate every routed doc to its `/scan --target=X` (and `/project-config`); `off` = skip Phase 1 — allowed ONLY on explicit user instruction, and the report MUST record every routed doc as `UNVERIFIED` |
| `base`          | `base=origin/main`                                   | Scope the impact map to a branch diff instead of the working tree |

<additional_requests>
$ARGUMENTS
</additional_requests>

---

## Escalation: When docs-update Is Not Enough

| Situation                                            | What to do instead                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Feature Spec missing but capability exists           | Run `/spec [mode=init]` to author the 8-section Feature Spec, then `docs-update` |
| Derived bucket `INDEX.md`/ERD missing                | Run `/spec-index mode=index bucket={Bucket}` to (re)generate it              |
| Integration tests don't match TCs                    | Run `/integration-test-review` to diagnose, then `/integration-test` to fix |
| Bug caused by wrong spec                             | Run `/spec [mode=update]` (fix the canonical spec) BEFORE `docs-update`; optionally `/spec-index mode=index` to re-derive the bucket index |
| One reference doc is wrong beyond a surgical patch   | Invoke `/<scanTarget>` exactly as returned by the map, then re-run Phase 1 to confirm |
| Most reference docs are stale, or the 60-day gate fired | Run `/scan-all` — impact scope cannot repair rot that predates the diff |
| A reference doc does not exist at all                | Run `/docs-init` (whole set missing) or invoke the map's exact `scanTarget` owner for that single doc |
| `project-config.json` needs a new section, module class, or tech stack, or fails schema validation | Run `/project-config` — that is a re-scan, not a merge |
| Suspect long-standing rot that no current diff touches | Run `/scan-codebase-health` (count-drift, dead config references, broken cross-links) |
| No demo guide exists for a shipped feature the team must demo | Run `/demo-guide {feature}` — Phase 4.5 refreshes existing guides, it never authors a first one |

---

> **[BLOCKING]** Create ALL 9 tasks via `TaskCreate` BEFORE any action — see **Mandatory Task Creation** table. NEVER skip, batch-complete, or mark done without invoking sub-skill.
> **[BLOCKING]** Follow fixed step-skill order: `Phase 0 -> Phase 1 -> Phase 2 -> Phase 2.5/2.6 -> Phase 3 -> Phase 4 -> Phase 4.5 -> Phase 5 -> Final review`. NEVER reorder, merge, or skip without explicit user approval.
> **[BLOCKING]** Per-step task lock: BEFORE each step, mark task `in_progress`; AFTER each step, mark task `completed` with evidence or explicit skip reason.
> **[BLOCKING]** If Task tool unavailable, create equivalent 9-step plan tracker and keep statuses synced for every step.

> **Critical Purpose:** Single orchestrator for ALL documentation sync after code changes. Triages impact, delegates to specialized skills.

> **Evidence Gate:** [BLOCKING] — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep docs synchronized after every code/spec/test change: triage impact, route each doc type to its owner, and align project-reference/config docs, Feature Specs, §8 TCs, test-code links, and derived indexes with shipped behavior — zero silent drift.

**IMPORTANT MUST ATTENTION — Main steps/modes:** Phase 0 triage → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` → optional Phase 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → optional Phase 4.5 `/demo-guide` → Phase 5 report → final Step 2.4 code↔spec sync-verify. TC modes: `TDD-first|implement-first|update|sync|from-integration-tests`; caller flags: `modules`, `changed_files`, `phases`, `mode`, `tc_mode`, `skip_phases`, `freshness={impact|full|off}`, `base`. Track each task before/after; record every skip.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor every block below:**

- **Critical Thinking:** Apply critical + sequential thinking; every claim needs `file:line` proof, confidence >80%.
- **Sub-Agent Return:** Spawned sub-agents return ONLY the summary contract; full detail to disk.
- **Cross-Service Check:** Scan producers/consumers/sagas/contracts; missing consumer = silent regression.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** When nested, still expand child phase tasks and link the parent workflow row.
- **Project Reference Docs:** Read required project-reference docs (always `lessons.md`) before target work.
- **AI-Discovery Doc Quality:** a `PATCHED` doc keeps purpose + critical rules on top and reminders at the bottom; new pointers are triggers to existing docs; an added/renamed/retired doc is re-routed in the docs index.
- **Task Tracking:** Bootstrap tasks, one active, persist findings to `tmp/reports/` incrementally.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** create ALL 9 tasks via `TaskCreate` BEFORE any action, then run the FIXED order `0 -> 1 -> 2 -> 2.5/2.6 -> 3 -> 4 -> 4.5 -> 5 -> final review` — NEVER reorder, merge, or skip without explicit user approval — why: phase order is the gate that catches drift; a skipped phase ships silent staleness
**IMPORTANT MUST ATTENTION** `docs-update` is a ROUTER ONLY — delegate to `/spec`, `/spec [mode=tests]`, `/spec [mode=sync]`, `/spec-index`; NEVER write §8 content, edit Feature Spec / derived-index files, or duplicate sub-skill logic — why: dual authorship causes the two sources to diverge
**IMPORTANT MUST ATTENTION** every skip is a DECISION with evidence — mark the task `completed` with a `file:line`-backed reason; NEVER silently omit a phase — why: an unjustified skip is indistinguishable from a missed update
**MUST ATTENTION** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via `TaskCreate` with `[N.M] /skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage — why: the workflow row is a container, not a substitute for phase tracking
**MUST ATTENTION** for EVERY step: set task `in_progress` BEFORE execution, set `completed` AFTER execution with evidence or skip reason — never batch transitions, keep exactly one active
**MUST ATTENTION** if task tooling unavailable, use an equivalent 9-step plan tracker and keep statuses synced per step
**MUST ATTENTION** evidence gate — every claim, detected module, and impact mapping needs `file:line` / git-diff proof, confidence >80% to act, <60% DO NOT act; "Module unchanged" without proof is NOT a valid skip — why: speculation routes the wrong docs and misses real drift
**MUST ATTENTION** search-existing-patterns BEFORE asserting a doc shape — read the bucket's existing Feature Spec / INDEX layout and project-reference docs; build the module map from `docs/project-config.json`, NEVER from hard-coded skill paths — why: local doc conventions override generic assumptions
**MUST ATTENTION** evaluate fit before reusing a nearby pattern — a module with backend + frontend changes is ONE deduped entry, not two; verify the change actually alters behavior before routing to `/spec` — why: duplicate or behavior-free invocations waste passes and corrupt the audit
**MUST ATTENTION** validate ambiguous routing decisions with the user via `AskUserQuestion` — surface the options, NEVER silently auto-decide which phases run
**MUST ATTENTION** tech-agnostic output — when updating spec/specs/README/INDEX, introduce NO framework/product/language/pattern names in prose or headings; update logical IDs (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then prose; preserve the evidence-field exception — why: prose is the portable contract, evidence carriers hold the physical coords (spec-principles §3)
**MUST ATTENTION** Step 2.4 final code↔spec sync-verify per touched module — a removed/weakened [HARD] BR is a code-vs-spec contradiction that BLOCKS completion until resolved or owner-accepted; AC drift re-invokes `/spec`, TC drift routes to `/spec [mode=sync]`
**MUST ATTENTION** Phase 1 project context sync ALWAYS runs unless the impact map is empty — build the map (`node .claude/scripts/doc-impact-map.cjs`), verify the routed `docs/project-reference/**` docs and `docs/project-config.json` sections in a PARALLEL wave, give every routed doc a verdict (`FRESH | PATCHED | RESCAN REQUIRED | UNVERIFIED`), and NEVER move a `Last scanned` stamp from an impact-scoped pass — why: these docs feed every downstream AI context, an unchecked doc is UNVERIFIED not FRESH, and a moved stamp silently disables the 60-day full-rescan gate
**MUST ATTENTION** Phase 0 triage ALWAYS runs first (git diff → categorize → dedup modules → record existing-doc state); Phase 2 `/spec` updates §1–§7 and BLOCKS doc-first when a changed module has feature behavior but no Feature Spec — why: skipping triage or the doc-first gate ships undocumented behavior
**MUST ATTENTION** Phase 2.5 `/spec-index [mode=index]` OPTIONALLY refreshes the derived bucket INDEX/ERD from Feature Specs (never re-extracts an A-E tree); Phase 2.6 `/tech-spec` OPTIONALLY refreshes/audits the derived technical view; Phase 3 `/spec [mode=tests]` syncs §8 TCs; Phase 4 `/spec [mode=sync]` syncs §8 TCs ↔ executing test code (no QA dashboard exists)
**MUST ATTENTION** Phase 4.5 OPTIONALLY refreshes an EXISTING demo guide — resolve `demoGuide.outputDir` then GLOB it (no filename convention exists, so NEVER guess a name), key each found guide to this change by its `Sources` / `Governing spec` / case `TC-*` / `Scope` header fields, and route the refresh to `/demo-guide --output {existing path}`; never hand-edit a guide, never author a first one here, and record `NOT-APPLICABLE` / `DEFERRED` / `UNVERIFIED` explicitly — why: a silent skip and a missed refresh look identical in the audit trail
**MUST ATTENTION** inside `workflow-feature` / `workflow-bugfix` the `/demo-guide` step runs AFTER `docs-update` — Phase 4.5 there reports `DEFERRED — downstream /demo-guide step owns it` instead of invoking — why: two generators writing one guide in one run is a lost update
**MUST ATTENTION** for `.claude` skills/hooks/workflows/sync-tooling changes, flag generated-mirror sync status (`/sync-codex` completed or explicit N/A) — `docs-update` routes/reports this check, NEVER edits generated mirrors directly
**MUST ATTENTION** ALWAYS write the Phase 5 summary report to `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md` and the final review task (#9) — the report is the audit trail, the review verifies all impacted docs updated with no unjustified skips

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| "Only docs/config changed — skip all phases" | Run Phase 0 triage anyway — fast-exit is a DECISION, not an assumption |
| "Only `.claude/**` changed — tooling, fast exit" | Harness edits rot glob-derived inventory counts and catalogs in `CLAUDE.md` / docs-index / project-structure. Phase 1 STILL runs; only Phases 2-4 are skipped |
| "The reference docs looked fine"              | "Looked fine" is not a check. Run the doc's routed checks or report it `UNVERIFIED` |
| "I updated the doc, so I'll refresh `Last scanned`" | Only a full `/scan --target=X` may move `Last scanned`. For `Last verified`, follow an explicit applicable rule in the resolved local docs-index; without one, write no stamp and retain the existing ledger/report routing |
| "Nothing changed, but I'll re-save the doc with today's date so it looks verified" | A no-op write is pure merge churn. Write nothing, record the ledger entry, and report the verdict |
| "project-config.json is close enough"        | Re-derive the flagged sections from evidence, prove every touched `pathRegex` still matches a real file, and run schema validation |
| "The mapper returned unrouted files — nothing to do" | Unrouted means the router had NO RULE, not that the doc is fresh. Classify each by hand |
| "No feature docs exist — skip Phase 2"       | Mark task completed with reason. NEVER silently omit                   |
| "Module unchanged — skip sub-skill"          | Show `file:line` evidence. No proof = no skip                          |
| "Already know what changed"                  | Still run git diff — partial knowledge causes missed updates           |
| "Phase 5 report not needed"                  | ALWAYS write summary report — it's the audit trail                     |
| "I will update tasks later"                  | Invalid. Task status must change before/after each step in real time.  |
| "I'll run skills first then create tasks"    | Invalid. Create/track tasks first, then execute step-skill calls.      |
| "I'll write the §8 TC myself, faster"        | Invalid. Router only — delegate to `/spec [mode=tests]`; dual authors diverge. |
| "[HARD] BR weakened but tests pass"          | BLOCK — code-vs-spec contradiction; resolve or owner-accept, never wave through. |
| "No demo guide — nothing to record"          | Absence is a VERDICT. Record `NOT-APPLICABLE` with the globs you ran.   |
| "I'll patch the demo guide's TC IDs by hand" | Invalid. Router only — a proof rung cannot be hand-edited; re-invoke `/demo-guide --output {path}`. |
| "A guide exists, so it must be related"      | Key it first (`Sources` / `Governing spec` / `TC-*` / `Scope`). Unrelated → skip WITH the path stated. |

**IMPORTANT MUST ATTENTION** create ALL 9 tasks via `TaskCreate` (or equivalent tracker) BEFORE any action and track each step live — `in_progress` before, `completed` after with evidence.
**IMPORTANT MUST ATTENTION** router ONLY — delegate every §8 / Feature Spec / derived-index / derived technical view write; NEVER author them here — why: dual authorship diverges the spec from its generated views.
**IMPORTANT MUST ATTENTION** every skip needs `file:line` evidence and a `completed` task with reason; run the fixed phase order — NEVER silently omit a phase.
