---
name: docs-update
version: 3.4.0
description: '[Documentation] Use when updating impacted documentation after code, spec, or test changes.'
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

- **Router, not author:** Phase 0 triage (git diff → categories → deduped modules → existing-doc state) routes each owner (`/spec`, `/spec [mode=tests]`, `/spec [mode=sync]`, `/spec-index`, `/tech-spec`). NEVER write §8, `docs/specs/`, or derived technical views here — why: dual authorship diverges canonical docs and derived views.
- **Ordered path:** Phase 0 → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` and 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → Phase 5 report → final Step 2.4 sync-verify. TC modes: `TDD-first|implement-first|update|sync|from-integration-tests`; caller flags: `modules`, `changed_files`, `phases`, `mode`, `tc_mode`, `skip_phases`, `freshness={impact|full|off}`, `base`. Create/track all 8 tasks; every skip needs evidence and a reason.
- **Gates:** Phase 1 is impact-scoped and parallel; missing Feature Spec with changed behavior BLOCKS at Phase 2; a weakened `[HARD]` BR BLOCKS final review; Phase 2.5/2.6 run only when derived outputs are affected; Phase 2.6 uses configured generation or read-only `--check`.
- **Contract:** Keep prose tech-agnostic outside evidence fields, update `FR-`/`BR-`/`OP-`/`TC-` mappings before prose, report generated-mirror status, and ALWAYS write the Phase 5 audit trail.

**Workflow:**

- **MUST ATTENTION** run Phase 0 triage → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` → optional Phase 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → Phase 5 report → final Step 2.4 code↔spec sync-verify; track each task before/after and record every skip.

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
                  → Phase 5: Summary Report
```

**Key Rules:**

- Router only — NEVER duplicate sub-skill logic or write Section 8 / `docs/specs/` content
- **[BLOCKING] Freshness is impact-scoped, never assumed.** Phase 1 verifies only routed `docs/project-reference/**` docs and `docs/project-config.json` sections via `node .claude/scripts/doc-impact-map.cjs`; each gets `FRESH | PATCHED | RESCAN REQUIRED | UNVERIFIED`. Unchecked = UNVERIFIED, NEVER FRESH — why: stale injected context teaches downstream agents obsolete code.
- **[BLOCKING] Impact-scoped verify NEVER writes `<!-- Last scanned: -->`.** Only full `/scan` with `--target=X` moves it; narrow passes write `<!-- Last verified: ... -->` only after an existing scan stamp (Step 1.6) — why: `Last scanned` drives the 60-day gate (`.claude/hooks/lib/session-init-helpers.cjs:769`).
- **[BLOCKING] A `PATCHED` `docs/project-reference/**` doc MUST run `/prompt-enhance` on the doc before its verdict**; skip only for stamp/count-only edits — why: injected docs need concise, useful context.
- Phase 1/docs-manager MUST NOT own any `docs/specs/**`, test-spec, spec-index/ERD, or derived technical-view path.
- Every excluded artifact is explicitly reserved to its child skill (`/spec`, `/spec-index`, or `/tech-spec`) so one canonical writer owns it.
- Exclude `docs/specs/**` and generated technical views from every docs-manager brief/write set; check each phase's trigger before invoking.
- Step-to-skill order is fixed and sequential. ALWAYS report what was checked, including no-op phases.
- Pass changed files, deduped modules, and impacted sections to each sub-skill via `$ARGUMENTS`.
- MUST ATTENTION dedup module list — backend + frontend changes for same module = ONE entry
- MUST ATTENTION track step state live: `in_progress` -> execute -> `completed` (or `completed` with skip reason)
- **MUST ATTENTION** classify every `unrouted` file manually; **NEVER** treat a missing routing rule as proof of no impact.
- For `.claude` skills/hooks/workflows/sync tooling changes, flag generated mirror sync status (`npm run codex:sync` completed or explicit N/A). `docs-update` routes and reports this check; it does not edit generated mirrors directly.
- **[BLOCKING] Tech-agnostic output:** when updating spec/specs/README/INDEX, do NOT add framework/product/language/design-pattern names to prose/headings. Preserve evidence carriers (`**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter, Mermaid). Authority: `docs/project-reference/spec-principles.md` §3.

> **AI-SDD Artifact Contract** — Keep reusable SDD rules in `.claude`; keep local paths, commands, ownership, and formats in project-reference docs. Require `spec -> plan -> tasks -> implement -> verify -> update spec/docs`, logical-ID traceability, explicit unknowns, and tests that guard intent.
>
> **MUST ATTENTION READ** `.claude/skills/shared/sdd-artifact-contract.md` for full M1-M7 criteria.

- **[BLOCKING] M3 Traceability Update:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. When syncing docs after code changes, update the logical-ID mappings (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then the prose. The `[Source: namespace/service/id]` abstract-anchor evidence is re-resolved ONLY if the logical artifact was renamed/split — a file move or stack change does NOT change the anchor (physical coords live only in the provenance sidecar) — and the logical-ID spine stays stable across the change — never drop or renumber a logical ID just because the code moved. Keep all synced prose M1/M2-clean.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

---

## Mandatory Task Creation (ZERO TOLERANCE)

> **[BLOCKING]** Create ALL 8 tasks via `TaskCreate` BEFORE touching any file. NEVER consolidate, rename, omit. Conditional tasks skipped: mark `completed` immediately with reason — NEVER silently omit.

| #   | Task Subject                                                                                              | Conditional?                                                                             |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `[docs-update] Phase 0 — Triage: collect git diff, categorize files, detect modules, check existing docs` | No — always first                                                                        |
| 2   | `[docs-update] Phase 1 — Project context sync: impact-map → PARALLEL verify of impacted docs/project-reference/** + docs/project-config.json sections + README/project docs` | No — always, unless Step 0.3 declared a TRUE fast exit (empty impact map). Runs even when Phases 2-4 are all skipped |
| 3   | `[docs-update] Phase 2 — Invoke /spec: update business feature docs`                              | Yes — service/frontend files changed AND module has existing feature docs                |
| 4   | `[docs-update] Phase 2.5/2.6 — Refresh derived views via /spec-index and/or /tech-spec`              | Yes — Feature Spec changed and bucket maintains INDEX/ERD, OR technical tree is affected |
| 5   | `[docs-update] Phase 3 — Invoke /spec [mode=tests]: update/add §8 business test specifications`                    | Yes — business-visible functionality added OR existing business-visible behavior changed  |
| 6   | `[docs-update] Phase 4 — Invoke /spec [mode=sync]: sync §8 ↔ test code`                          | Yes — Phase 3 changed §8 TCs                                                              |
| 7   | `[docs-update] Phase 5 — Write summary report to tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`            | No — always                                                                              |
| 8   | `[docs-update] Final review — verify all impacted docs updated, no phases skipped without justification, AND run the Step 2.4 code↔spec sync-verify (AC/BR/TC drift) for every touched module` | No — always                                                                              |

**Execution rules:**

- Mark one task `in_progress` before work and `completed` after; NEVER batch-complete or run a phase before its task is active.
- Add Phase 2/3 subtasks per module; add Task 2 subtasks per impacted doc/source-of-truth cluster so every verdict is tracked.
- TRUE fast-exit (empty impact map) → complete Tasks 2-8 with reason "Skipped — impact map empty"; preserve fixed order token `0 → 1 → 2 → 2.5/2.6 → 3 → 4 → 5 → final review`.
- PARTIAL exit (docs/config-only impact) → run Task 2, complete Tasks 3-6 with reason "Skipped — no business behavior changed", then run Tasks 7-8.
- After each phase/skill call, record one-line evidence (`what ran`, `what changed`, or `why skipped`).
- If `TaskCreate`/updates unavailable, maintain an equivalent 8-task tracker with identical transitions.

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
| 7     | 7       | Phase 5: Summary Report        | Inline report write                    | Set Task 7 `in_progress` before report write; `completed` after file path confirmed             |
| 8     | 8       | Final Review                   | Inline verification gate               | Set Task 8 `in_progress` before final audit; `completed` after all phases justified             |

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

> **[BLOCKING] A `.claude/**`-only (or tooling-only) diff is NOT a full fast exit.** Harness edits can stale glob-derived counts/catalogs in `CLAUDE.md`, `docs-index-reference.md`, and `project-structure-reference.md`; Phases 2-4 only inspect `docs/specs/**`. — why: classifying tooling as no-impact skips the only freshness pass.

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
node -e "const cfg=require('./docs/project-config.json'); console.log(JSON.stringify({sourcePaths: cfg.codebaseHealth?.sourcePaths, contextGroups: cfg.contextGroups?.map(g => ({name:g.name,pathRegexes:g.pathRegexes})), specRoot: 'docs/specs/'}, null, 2))"
node -e "process.stdout.write('docs/specs/')"
```

### Step 0.5: Check Existing Docs for Each Module

For each detected module, verify its matching `docs/specs/` bucket exists and contains `README.*.md` Feature Specs (or follows the project-reference feature-doc layout); record `hasFeatureSpec` (§1–§7), `hasTestSpecs` (§8), and `hasDerivedIndex` (bucket `INDEX.md`).

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

The map routes changed files to at-risk docs/config sections and returns per doc: `doc`, `exists`, `lastScanned`/`ageDays`, `scanTarget`, `checks`, `changedFiles`/`addedFiles`/`deletedFiles`, and `heuristicOnly`. It derives routing from `docs/project-config.json` (`contextGroups`, `modules`, `testing`, `e2eTesting`, `styling`, `designSystem`, `specRoots`) plus change classes — never hardcoded paths.

**Handling the map's output — [BLOCKING] rules:**

1. `unrouted` means no routing rule, not no impact. Classify each manually: add it to the wave or report why it carries no doc impact. NEVER let one pass as fresh.
2. `heuristicOnly` is a GUESS, not evidence. Verify it like any other; downgrade to not impacted only with a stated reason.
3. `exists: false` means MISSING, not fresh → route to `/scan --target=<scanTarget>` or `/docs-init` when the whole set is absent.
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

> **[BLOCKING] Every `PATCHED` `docs/project-reference/**` doc MUST run `/prompt-enhance <doc>` (default `--op=enhance`) before its verdict.** These docs enter every downstream context; re-compress surgical edits. `/scan --target=X` already performs this on full rescan (`scan/SKILL.md` Final Step), so an escalated rescan needs no separate call. Skip ONLY for a stamp/date/count-only edit, and record the reason.

### Step 1.4: project-config.json Drift Check (single writer, schema-validated)

Verify ONLY map-flagged sections:

1. **Re-derive from evidence** — read changed files, not the old value.
2. **Surgical merge** — add/update entries; NEVER rename, remove, or restructure a top-level section (`/project-config` Schema Protection Rules still apply).
3. **Prove every touched `pathRegex`/path matches a real file** — zero matches silently disable dependent routers, and schema validation will not catch it:

```bash
node -e "const c=require('./docs/project-config.json');const {execSync}=require('child_process');const files=execSync('git ls-files',{encoding:'utf8'}).split('\n').filter(Boolean).map(f=>'/'+f);for(const m of c.modules||[]){const re=new RegExp(m.pathRegex,'i');const n=files.filter(f=>re.test(f)).length;console.log((n?'OK  ':'DEAD')+' modules.'+m.name+' -> '+n+' file(s)')}"
```

4. **Validate the schema** after merging:

```bash
node -e "const {validateConfig}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(JSON.stringify(validateConfig(require('./docs/project-config.json')),null,2))"
```

5. **Escalate; do not improvise.** A NEW top-level section, module class, tech stack, or failed validation requires `/project-config` re-scan; report it if unavailable.

### Step 1.5: README & Project Docs (docs-manager)

Pass Phase 0 diff context to a `docs-manager` sub-agent (`subagent_type="docs-manager"`) in the same wave:

- `README.md` — update if project scope or setup changed (keep under 300 lines)
- `docs/project-reference/project-structure-reference.md` — update if service architecture or cross-service patterns changed (same agent as README: shared source of truth)

Standalone invocation may first delegate 2-4 read-only landscape threads to `researcher`; workflow invocation uses Phase 0 context directly.

This agent NEVER owns `docs/specs/**`, test specs, spec-index/ERD, or derived technical views.

### Step 1.6: Stamp Discipline (BLOCKING)

| What ran | Stamp to write |
| -------- | -------------- |
| Full `/scan --target=X` | `<!-- Last scanned: YYYY-MM-DD -->` (owned by `scan`, top of doc) |
| Impact-scoped verify/patch on a doc that **carries** a `Last scanned` stamp | `<!-- Last verified: YYYY-MM-DD (docs-update, impact-scoped) -->` on the line immediately AFTER that stamp |
| Impact-scoped verify/patch on a doc with **no** `Last scanned` stamp — `CLAUDE.md`, `.claude/docs/**`, and any other AI-facing instruction file | **Write NO stamp.** Record the doc's verdict in the Step 1.7 output only. — why: those files read as live instruction, and `.claude/agents/docs-manager.md:35` forbids provenance metadata in them; the no-meta-log rule wins over the stamp rule, it is not overridden by it. |

> **[BLOCKING] An impact-scoped pass MUST NOT touch `Last scanned`.** It feeds the 60-day full-rescan gate (`getStaleReferenceDocs` → `refreshScanStaleFlag`, `.claude/hooks/lib/session-init-helpers.cjs:769-810`); moving it would disable the net that catches whole-doc rot.

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
- No Feature Spec under `docs/specs/{Bucket}/` was touched.
- Phase 2 was skipped (no feature impact).
- No derived index/ERD is maintained, or `project-config.json` contains `"spec_discovery_update": false`.
- `spec` already refreshed `INDEX.md` in Phase 2.

### Step 2.5.1: Resolve the Bucket

- Map changed services to an App Bucket via `docs/project-reference/spec-system-reference.md` → **App Bucket Mapping**.
- Confirm `docs/specs/{Bucket}/` holds updated Feature Specs.

### Step 2.5.2: Invoke spec-index (Derived Index Mode)

```
/spec-index mode=index bucket={Bucket} artifacts=INDEX[,ERD]
Source: the canonical Feature Specs in docs/specs/{Bucket}/.
Output: regenerated DERIVED docs/specs/{Bucket}/INDEX.md (+ {Bucket}.erd.md if maintained), each carrying the DERIVED banner.
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
npm run tech-spec:generate
```

Equivalent standalone invocation:

```text
node .claude/skills/tech-spec/scripts/generate-tech-specs.mjs
```

For a read-only gate, use `npm run tech-spec:check` or direct `--check`. If `techSpecScan` is absent, the sync orchestrator records `SKIP (not configured)`; direct generator invocation remains fail-closed for malformed declared contracts.

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

> Do not route to retired dashboard paths `docs/specs/README.md` or `docs/specs/PRIORITY-INDEX.md`; §8 is the canonical business TC registry. Derived aids are bucket `INDEX.md` (Phase 2.5) and the regenerable technical view under `specRoots.technical.path` (Phase 2.6); no hand-maintained `A-E`/`M##` tree.

### Step 4.2: Review Sync Results

1. All Phase 3 TCs appear in test code or are flagged `Untested` with rationale.
2. No orphaned TCs: test code's `TestSpec` annotations all resolve to §8.

---

## Section Ownership Reference

`docs-update` delegates only; NEVER writes directly:

| Section                          | Owner Skill                  | docs-update Role                                       |
| -------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `docs/project-reference/**` (authoring) | `/scan --target=X`    | Verify impact-scoped + surgical patch; escalate to the scan when a patch cannot make it true — NEVER hand-author a full reference doc |
| `docs/project-config.json` (structure)  | `/project-config`     | Verify + surgical merge of impacted sections with schema validation; escalate whole-section/new-tech changes |
| §1–§7 (Feature Spec, tech-free)  | `/spec`              | Pass triage context; review output                    |
| §8 (Test Specifications)         | `/spec [mode=tests]`                  | Pass TC mode + changed files; NEVER write TCs here    |
| §8 ↔ test code sync              | `/spec [mode=sync]` | Pass capability list + direction; NEVER edit directly |
| Derived bucket `INDEX.md` / ERD  | `/spec-index` (optional)     | Pass bucket scope; NEVER hand-edit the derived index  |
| Derived technical spec view      | `/tech-spec` (optional)      | Pass service/component scope; NEVER hand-edit the derived technical file |

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
- Stamps: {docs given `Last verified`} · {docs fully rescanned and given `Last scanned`} · staleness flag refreshed: {yes/no}

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
| One reference doc is wrong beyond a surgical patch   | Run its `/scan --target=<key>` (the map's `scanTarget`), then re-run Phase 1 to confirm |
| Most reference docs are stale, or the 60-day gate fired | Run `/scan-all` — impact scope cannot repair rot that predates the diff |
| A reference doc does not exist at all                | Run `/docs-init` (whole set missing) or `/scan --target=<key>` (single doc) |
| `project-config.json` needs a new section, module class, or tech stack, or fails schema validation | Run `/project-config` — that is a re-scan, not a merge |
| Suspect long-standing rot that no current diff touches | Run `/scan-codebase-health` (count-drift, dead config references, broken cross-links) |

---

> **[BLOCKING]** Create ALL 8 tasks via `TaskCreate` BEFORE any action — see **Mandatory Task Creation** table. NEVER skip, batch-complete, or mark done without invoking sub-skill.
> **[BLOCKING]** Follow fixed step-skill order: `Phase 0 -> Phase 1 -> Phase 2 -> Phase 2.5/2.6 -> Phase 3 -> Phase 4 -> Phase 5 -> Final review`. NEVER reorder, merge, or skip without explicit user approval.
> **[BLOCKING]** Per-step task lock: BEFORE each step, mark task `in_progress`; AFTER each step, mark task `completed` with evidence or explicit skip reason.
> **[BLOCKING]** If Task tool unavailable, create equivalent 8-step plan tracker and keep statuses synced for every step.

> **Critical Purpose:** Single orchestrator for ALL documentation sync after code changes. Triages impact, delegates to specialized skills.

> **Evidence Gate:** [BLOCKING] — every claim requires `file:line` proof or traced evidence, confidence >80% to act.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

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

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Load detail just in time immediately before the first target read/grep/edit/test; hooks may provide a pointer, but a hook event or prior turn is never evidence that the current files were read.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work. On compaction, resume, delegation, or a context change, re-read the required docs and restate the route before continuing.

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

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep docs synchronized after every code/spec/test change: triage impact, route each doc type to its owner, and align project-reference/config docs, Feature Specs, §8 TCs, test-code links, and derived indexes with shipped behavior — zero silent drift.

**IMPORTANT MUST ATTENTION — Main steps/modes:** Phase 0 triage → Phase 1 impact-scoped context sync → Phase 2 `/spec` → optional Phase 2.5 `/spec-index` → optional Phase 2.6 `/tech-spec` → Phase 3 `/spec [mode=tests]` → Phase 4 `/spec [mode=sync]` → Phase 5 report → final Step 2.4 code↔spec sync-verify. TC modes: `TDD-first|implement-first|update|sync|from-integration-tests`; caller flags: `modules`, `changed_files`, `phases`, `mode`, `tc_mode`, `skip_phases`, `freshness={impact|full|off}`, `base`. Track each task before/after; record every skip.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor every block below:**

- **Critical Thinking:** Apply critical + sequential thinking; every claim needs `file:line` proof, confidence >80%.
- **Sub-Agent Return:** Spawned sub-agents return ONLY the summary contract; full detail to disk.
- **Cross-Service Check:** Scan producers/consumers/sagas/contracts; missing consumer = silent regression.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** When nested, still expand child phase tasks and link the parent workflow row.
- **Project Reference Docs:** Read required project-reference docs (always `lessons.md`) before target work.
- **Task Tracking:** Bootstrap tasks, one active, persist findings to `tmp/reports/` incrementally.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** create ALL 8 tasks via `TaskCreate` BEFORE any action, then run the FIXED order `0 -> 1 -> 2 -> 2.5/2.6 -> 3 -> 4 -> 5 -> final review` — NEVER reorder, merge, or skip without explicit user approval — why: phase order is the gate that catches drift; a skipped phase ships silent staleness
**IMPORTANT MUST ATTENTION** `docs-update` is a ROUTER ONLY — delegate to `/spec`, `/spec [mode=tests]`, `/spec [mode=sync]`, `/spec-index`; NEVER write §8 content, edit Feature Spec / derived-index files, or duplicate sub-skill logic — why: dual authorship causes the two sources to diverge
**IMPORTANT MUST ATTENTION** every skip is a DECISION with evidence — mark the task `completed` with a `file:line`-backed reason; NEVER silently omit a phase — why: an unjustified skip is indistinguishable from a missed update
**MUST ATTENTION** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via `TaskCreate` with `[N.M] /skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage — why: the workflow row is a container, not a substitute for phase tracking
**MUST ATTENTION** for EVERY step: set task `in_progress` BEFORE execution, set `completed` AFTER execution with evidence or skip reason — never batch transitions, keep exactly one active
**MUST ATTENTION** if task tooling unavailable, use an equivalent 8-step plan tracker and keep statuses synced per step
**MUST ATTENTION** evidence gate — every claim, detected module, and impact mapping needs `file:line` / git-diff proof, confidence >80% to act, <60% DO NOT act; "Module unchanged" without proof is NOT a valid skip — why: speculation routes the wrong docs and misses real drift
**MUST ATTENTION** search-existing-patterns BEFORE asserting a doc shape — read the bucket's existing Feature Spec / INDEX layout and project-reference docs; build the module map from `docs/project-config.json`, NEVER from hard-coded skill paths — why: local doc conventions override generic assumptions
**MUST ATTENTION** evaluate fit before reusing a nearby pattern — a module with backend + frontend changes is ONE deduped entry, not two; verify the change actually alters behavior before routing to `/spec` — why: duplicate or behavior-free invocations waste passes and corrupt the audit
**MUST ATTENTION** validate ambiguous routing decisions with the user via `AskUserQuestion` — surface the options, NEVER silently auto-decide which phases run
**MUST ATTENTION** tech-agnostic output — when updating spec/specs/README/INDEX, introduce NO framework/product/language/pattern names in prose or headings; update logical IDs (`FR-`/`BR-`/`OP-`/`TC-`) FIRST, then prose; preserve the evidence-field exception — why: prose is the portable contract, evidence carriers hold the physical coords (spec-principles §3)
**MUST ATTENTION** Step 2.4 final code↔spec sync-verify per touched module — a removed/weakened [HARD] BR is a code-vs-spec contradiction that BLOCKS completion until resolved or owner-accepted; AC drift re-invokes `/spec`, TC drift routes to `/spec [mode=sync]`
**MUST ATTENTION** Phase 1 project context sync ALWAYS runs unless the impact map is empty — build the map (`node .claude/scripts/doc-impact-map.cjs`), verify the routed `docs/project-reference/**` docs and `docs/project-config.json` sections in a PARALLEL wave, give every routed doc a verdict (`FRESH | PATCHED | RESCAN REQUIRED | UNVERIFIED`), and NEVER move a `Last scanned` stamp from an impact-scoped pass — why: these docs feed every downstream AI context, an unchecked doc is UNVERIFIED not FRESH, and a moved stamp silently disables the 60-day full-rescan gate
**MUST ATTENTION** Phase 0 triage ALWAYS runs first (git diff → categorize → dedup modules → record existing-doc state); Phase 2 `/spec` updates §1–§7 and BLOCKS doc-first when a changed module has feature behavior but no Feature Spec — why: skipping triage or the doc-first gate ships undocumented behavior
**MUST ATTENTION** Phase 2.5 `/spec-index [mode=index]` OPTIONALLY refreshes the derived bucket INDEX/ERD from Feature Specs (never re-extracts an A-E tree); Phase 2.6 `/tech-spec` OPTIONALLY refreshes/audits the derived technical view; Phase 3 `/spec [mode=tests]` syncs §8 TCs; Phase 4 `/spec [mode=sync]` syncs §8 TCs ↔ executing test code (no QA dashboard exists)
**MUST ATTENTION** for `.claude` skills/hooks/workflows/sync-tooling changes, flag generated-mirror sync status (`npm run codex:sync` completed or explicit N/A) — `docs-update` routes/reports this check, NEVER edits generated mirrors directly
**MUST ATTENTION** ALWAYS write the Phase 5 summary report to `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md` and the final review task (#8) — the report is the audit trail, the review verifies all impacted docs updated with no unjustified skips

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| "Only docs/config changed — skip all phases" | Run Phase 0 triage anyway — fast-exit is a DECISION, not an assumption |
| "Only `.claude/**` changed — tooling, fast exit" | Harness edits rot glob-derived inventory counts and catalogs in `CLAUDE.md` / docs-index / project-structure. Phase 1 STILL runs; only Phases 2-4 are skipped |
| "The reference docs looked fine"              | "Looked fine" is not a check. Run the doc's routed checks or report it `UNVERIFIED` |
| "I updated the doc, so I'll refresh `Last scanned`" | Only a full `/scan --target=X` may move that stamp — an impact-scoped patch writes `Last verified`, and only where a `Last scanned` stamp already exists |
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

**IMPORTANT MUST ATTENTION** create ALL 8 tasks via `TaskCreate` (or equivalent tracker) BEFORE any action and track each step live — `in_progress` before, `completed` after with evidence.
**IMPORTANT MUST ATTENTION** router ONLY — delegate every §8 / Feature Spec / derived-index / derived technical view write; NEVER author them here — why: dual authorship diverges the spec from its generated views.
**IMPORTANT MUST ATTENTION** every skip needs `file:line` evidence and a `completed` task with reason; run the fixed phase order — NEVER silently omit a phase.
