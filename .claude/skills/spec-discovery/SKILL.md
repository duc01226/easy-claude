---
name: spec-discovery
version: 1.0.0
description: '[Investigation] Use when about to author a new Feature Spec — surface related, overlapping, or affected specs, missing test cases, and the invariant landscape first.'
context-budget: medium
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**Summary:**

- This is BOTH spec-aware and code-aware: it reads `<spec root>/**` (the canonical Feature Specs — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND delegates to `/investigate` + code-graph for the code logic the idea touches. Spec-only or code-only discovery misses half the landscape.
- It runs BEFORE `spec [mode=draft]` and feeds it. Its job is to decide WHETHER a new standalone spec is even the right move — the alternative is extending an existing spec, which only a spec-corpus scan can reveal.
- It is INLINE on the main agent (NOT a sub-agent) because step 5 is a BLOCKING `AskUserQuestion` scope-decision gate that only works inline. It MAY spawn sub-agents for parallel spec reads, but it orchestrates and gates inline.
- Greenfield short-circuit: when there are no specs AND no code, auto-detect it, record the reason, skip the heavy discovery, and hand off a minimal landscape — never grind through empty discovery.
- **Main steps (0→6) — do ALL in order:** (0) frame scope = keywords/entities/bucket → (1) spec-corpus discovery = Glob all candidate specs under the spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path), read §1/§4/§5/§8, classify each EXTENDS/OVERLAPS/DEPENDS-ON/AFFECTED/UNRELATED with `file:line` → (2) code-logic discovery = `/investigate` + MANDATORY graph expansion, bridge code→spec via §8 `[Source:]` → (3) gap & invariant analysis = missing features, missing TCs/user stories, system unknowns, [HARD]/§5 invariant landscape → (4) report incrementally to `plans/.../spec-discovery-{slug}.md` → (5) BLOCKING `AskUserQuestion` scope gate = recommend NEW / EXTEND X / SPLIT, confirm cross-refs → (6) handoff to `domain-analysis` + `spec [mode=draft|update]`.

**Workflow:**

0. **Scope** — read the framed capability (brainstorm/idea output); extract keywords, candidate entities/actors, target spec bucket.
1. **Spec-corpus discovery** — `Glob <spec root>/**/README.*.md` (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); read §1/§4/§5/§8 of each candidate; classify each as EXTENDS / OVERLAPS / DEPENDS-ON / AFFECTED / UNRELATED.
2. **Code-logic discovery** — `/investigate {keywords}` + MANDATORY graph expansion on key files when `.code-graph/graph.db` exists; bridge code→spec via §8 `[Source:]` anchors.
3. **Gap & invariant analysis** — missing features, missing test cases / user stories, system unknowns (<80% confidence), and the existing [HARD] rules / §5 invariants the idea must respect.
4. **Report** — write `<plans root>/{plan-dir}/research/spec-discovery-{slug}.md` (plans root default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) incrementally (Related Specs · Related Code · Affected Specs · Gaps · Invariant Landscape · Open Questions).
5. **Scope-decision gate (BLOCKING `AskUserQuestion`)** — recommend NEW / EXTEND existing X / SPLIT into N, and confirm which existing specs to cross-reference.
6. **Handoff** — feed entities, invariants, cross-refs, and gaps into `domain-analysis` + `spec [mode=draft]`.

**Key Rules:**

- Landscape over implementation — surface related/overlapping/affected specs + the invariant landscape fast; this is NOT the spec author and NOT a deep investigation.
- INLINE execution — the step 5 user gate is BLOCKING and only works inline; spawn sub-agents only for parallel spec reads, never delegate the whole skill.
- NEVER auto-pick NEW — step 5 is a BLOCKING user gate. OVERLAPS is exactly what the spec scan exists to catch; recommend, then let the user decide scope.
- NEVER skip graph expansion when `.code-graph/graph.db` exists; when absent, grep + read still bridge code→spec via `[Source:]` anchors.

# Spec-Discovery — Pre-Spec Landscape Investigation

---

## When to Use

- About to author a NEW Feature Spec from an idea / requirement / brainstorm output, before `spec [mode=draft]` runs.
- Need to know whether the idea is genuinely new or overlaps an existing spec (duplicate-spec prevention).
- Need the invariant landscape — the existing [HARD] rules and §5 invariants a new capability must respect or might violate.

**NOT for:** authoring the spec (use `spec [mode=draft]`), deep root-cause analysis of existing code (use `investigate`), generating Section 8 test cases (use `spec [mode=tests]`), regenerating the derived bucket index/ERD (use `spec-index`).

---

## Phase 0: Classify Corpus & Short-Circuit

**Before any discovery**, classify what landscape exists. This decides which steps run.

| Corpus state                | Detection                                                              | Route                                                                        |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Specs + code**            | `<spec root>/**/README.*.md` present AND source files for keywords (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides the root) | Full run — steps 1, 2, 3, 4, 5, 6                                            |
| **Specs only**              | Specs present, no code yet (provisional/draft-era project)            | Steps 1, 3, 4, 5 — skip step 2 code discovery (record "no code yet")        |
| **Code only**               | No specs yet, code exists                                             | Steps 2, 3, 4, 5 — step 1 records "no existing specs", bridge gaps from code |
| **Greenfield (empty)**      | No specs AND no source for keywords                                  | **Short-circuit** — record reason, skip heavy discovery, minimal handoff     |

> **Greenfield / empty-corpus short-circuit.** When Phase 0 detects no specs AND no code: record `Corpus: greenfield — no specs, no code for {keywords}` with the `Glob`/grep evidence that proved it, skip steps 1–3, write a minimal landscape report (just the framed scope + open questions), and hand off to `spec [mode=draft]`. Run the step 5 scope gate ONLY if there is something to decide (e.g. two plausible buckets); with nothing to decide, default to NEW and state the assumption in one line.

---

## Workflow

### Step 0: Frame the Scope

Read the framed capability — the brainstorm / idea / requirement text that triggered this. Extract:

- **Keywords** — domain nouns and verbs the idea names (entities, actions, features).
- **Candidate entities / actors** — the business objects and roles the idea implies.
- **Target spec bucket** — which `<spec root>/{Bucket}/` the new spec would most likely live in — spec root default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (per the project's module mapping; resolve from `feature-spec-reference.md` / `spec-system-reference.md` in the project-reference docs root, default `docs/project-reference`, relocatable via `docsRoots.projectReference.path`).

State the framed scope in one line before continuing (e.g. `Discovering for: "bulk order export" — keywords [order, export, batch], bucket Orders`).

### Step 0.5: Declare the Discovery Wave

Step 1 (specs), Step 2 (code), and the invariant/test-case sweep read DIFFERENT inputs and produce DIFFERENT report sections — they are PAR. Running them one after another triples the wall time of the gate that stands between an idea and a duplicate spec, for zero safety gain. Declare the wave before Step 1, then spawn its members in ONE message:

| Wave-1 member                      | Scope (read-only)                                                                       | Route to                                                              | Feeds                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| **Spec-corpus sweep**              | the `<spec root>/**` candidates the keywords touch (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it) — §1/§4/§5/§8 ONLY, never whole specs | one `investigate` per bucket when the corpus is large; inline for a small one | Related Specs · Affected Specs         |
| **Related-code discovery**         | the code the idea touches (the Step 2 delegation)                                        | `/investigate {keywords}`                                                   | Related Code                           |
| **Invariant / test-case landscape** | [HARD] BRs (§4), §5 entity invariants, existing §8 TC coverage of the touched specs      | one `investigate`; fold into the corpus sweep when the corpus is small      | Invariant Landscape · Missing TCs      |

Rules binding this wave: each member owns a **unique artifact path** under `tmp/reports/spec-discovery-{slug}/`; no worker writes `spec-discovery-{slug}.md`. After the barrier, YOU are the sole reducer: read and validate every artifact, then synthesize the final report in section order. A missing artifact is rerun or reported, never silently replaced by a bounded summary.

**SEQ — keep these OUT of the wave (each names its blocker):** the Step 2 graph expansion (YOU run it, and only after the code member returns its key files) · Step 3 gap & invariant reconciliation (consumes all three members) · the Step 5 scope-decision gate (a BLOCKING `AskUserQuestion` cannot block from inside a sub-agent) · Step 6 handoff.

Phase 0's corpus state shrinks the wave: **Specs only** → drop the code member · **Code only** → drop the corpus sweep · **Greenfield** → no wave at all (short-circuit).

### Step 1: Spec-Corpus Discovery

```bash
# Enumerate every canonical Feature Spec
ls docs/specs/**/README.*.md 2>/dev/null   # or: Glob docs/specs/**/README.*.md — docs/specs is the DEFAULT spec root; specRoots.business.path in docs/project-config.json overrides it
```

If NONE → record `No existing specs` and skip to Step 2.

Else, for each candidate spec the keywords touch, read the high-signal sections only (do NOT read whole specs — landscape, not deep-dive):

- **§1 Overview** — what the spec covers (scope boundary).
- **§4 Business-Rule headers** — the BR-{FC}-NN IDs and their [HARD]/[SOFT] tags (feeds invariant landscape).
- **§5 Domain Model** — entities + ERD (overlap detection by shared entities).
- **§8 Test-Case summary** — the TC count + summary table (coverage baseline; missing-TC detection).

Use the bucket `INDEX.md` (produced by `/spec-index`) as a fast navigation map when present — it lists the specs and their entities so you read fewer full files.

**Classify each candidate spec's relationship to the idea** (one label per spec, with `file:line` evidence):

| Relationship             | Meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **EXTENDS**              | The idea is a natural addition to this spec's capability — likely an UPDATE, not NEW. |
| **OVERLAPS (dup risk)**  | The idea re-states behavior this spec already owns — authoring NEW would duplicate.   |
| **DEPENDS-ON**           | The idea needs this spec's entities/rules to function — cross-reference required.     |
| **AFFECTED**             | The idea would change behavior this spec documents — forward-impact, may need amend.  |
| **UNRELATED**            | Shares a keyword but no real relationship — record to show it was checked.            |

### Step 2: Code-Logic Discovery (only if code exists)

Bridge the idea to the implementation so the spec reflects what actually exists (or what the idea will touch).

1. **Delegate to `/investigate {keywords}`** — fast parallel file discovery of the code the idea relates to. Use investigate's numbered, prioritized list as targets; do NOT re-grep what investigate already mapped.
2. **MANDATORY graph expansion** — when `.code-graph/graph.db` exists, run graph commands YOURSELF (sub-agents cannot) on 2–3 key files investigate surfaced:
    ```bash
    python .claude/scripts/code_graph trace <key-entity-or-command> --direction both --json
    python .claude/scripts/code_graph connections <key-file> --json
    ```
    Graph reveals callers, consumers, event chains, and tests grep cannot find — exactly the downstream the new spec must account for.
3. **Delegate ambiguous areas to `/investigate`** — when investigate + graph surface a flow whose behavior is unclear (the idea hinges on how it works), hand that narrow slice to `investigate` rather than guessing.
4. **Bridge code → spec** — for each key code file, find its governing spec via the §8 `[Source: namespace/service/id]` anchors / Related Files. A code area with NO governing spec is a gap (record in Step 3); a code area WITH a governing spec strengthens the Step 1 relationship classification.

### Step 3: Gap & Invariant Analysis

From Steps 1–2, synthesize four lists (every item `file:line`-cited or marked "inferred"):

- **Missing features** — behavior the idea implies that NO existing spec or code covers. These are the net-new surface the spec must define.
- **Missing test cases / user stories** — in the specs the idea touches (EXTENDS/AFFECTED), the AC / TC the idea's behavior would require but that are absent today.
- **System unknowns** — anything the discovery could not resolve to >80% confidence (unverified flows, ambiguous ownership, unread cross-service consumers). Name each explicitly — an unknown surfaced is cheaper than a wrong spec.
- **Invariant landscape** — the existing [HARD] business rules (§4) and §5 entity invariants the idea must respect or might violate. This is the single most load-bearing output: a new spec that contradicts a [HARD] rule of a DEPENDS-ON spec ships a defect. List each invariant as "for ALL {inputs}, {invariant} holds — owned by {spec/BR-id}".

### Step 4: Report

Write `<plans root>/{plan-dir}/research/spec-discovery-{slug}.md` — plans root default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path — (resolve `{plan-dir}` from the active plan; fall back to `tmp/reports/spec-discovery-{YYMMDD}-{HHmm}-{slug}.md`, a FIXED framework path, when no plan dir exists). Persist **incrementally** — append each section as it is produced, never hold the whole report in memory:

```markdown
# Spec-Discovery: {idea}

## Framed Scope
{keywords, candidate entities/actors, target bucket}

## Related Specs
| Spec | Relationship | Overlap evidence | Action implied |
| ---- | ------------ | ---------------- | -------------- |

## Related Code
{investigate's prioritized files + graph evidence — callers/consumers/tests}

## Affected Specs (forward-impact)
{specs whose documented behavior the idea would change}

## Gaps
- Missing features: ...
- Missing TCs / user stories: ...

## Invariant Landscape
- for ALL {inputs}, {invariant} — owned by {spec/BR-id} — idea must {respect/extend}

## Open Questions
- {system unknowns, <80% confidence items}
```

### Step 5: Scope-Decision Gate (BLOCKING `AskUserQuestion`)

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** before any spec is authored, MUST ATTENTION use `AskUserQuestion` to present the recommended scope. NEVER auto-pick — OVERLAPS detection is the whole reason this skill exists; assuming NEW silently ships duplicates.

Recommend ONE option (with the evidence behind it) and confirm the cross-references:

- **(a) NEW standalone spec** — no EXTENDS/OVERLAPS match; the idea is genuinely net-new. Hand off to `spec [mode=draft]`.
- **(b) EXTEND existing spec X** — an EXTENDS/OVERLAPS match means the idea belongs inside X. **Reroute to `/spec [mode=update]`** against X instead of drafting a new file.
- **(c) SPLIT into N specs** — the idea spans N distinct capabilities (or would breach the size caps); author N specs, each with its own bucket.

Also confirm WHICH existing specs (the DEPENDS-ON / AFFECTED set) the author must cross-reference, so the new/updated spec links them and respects their invariants.

### Step 6: Handoff

Feed the discovery forward:

- **→ `domain-analysis`** — the related entities + invariant landscape (so the domain model is consistent with existing specs).
- **→ `spec [mode=draft]`** (or `spec [mode=update]` if Step 5 chose EXTEND) — the framed scope, the missing features/TCs, the cross-references to link, and the [HARD] rules to respect.

---

## Results Format

Paths in the template below are DEFAULTS — spec root `docs/specs`, plans root `plans/`; `specRoots.business.path` and `docsRoots.plans.path` entries in `docs/project-config.json` override them. `tmp/reports/` is a fixed framework path.

```markdown
## Spec-Discovery Results: {idea}

### Recommended Scope
**{NEW | EXTEND spec X | SPLIT into N}** — because {evidence-backed reason}

### Related Specs
| Spec | Relationship | Evidence | Implied action |
| --- | --- | --- | --- |
| `docs/specs/{Bucket}/README.{X}.md` | OVERLAPS | §4 BR-X-03 already states this | route to /spec mode=update |

### Related Code
1. `{file}` — {role} — graph: {callers/consumers found}

### Affected Specs (forward-impact)
- `{spec}` — {documented behavior the idea changes}

### Gaps
- Missing features: {list}
- Missing TCs / user stories: {list}

### Invariant Landscape (must respect)
- for ALL {inputs}, {invariant} — owned by {spec/BR-id}

### Open Questions
- {system unknowns, <80% confidence}

**Full report:** plans/{plan-dir}/research/spec-discovery-{slug}.md
```

---

## Related Skills

`investigate` (code discovery and deep-dive ambiguous flows — Step 2) | `spec [mode=draft]` (authors §1–7 from the idea — Step 6 handoff) | `spec [mode=update]` (the EXTEND reroute — Step 5) | `domain-analysis` (entity/invariant modeling — Step 6) | `spec-index` (derived bucket INDEX.md used in Step 1)

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including a task per candidate spec read. This prevents context loss from long specs. For trivial single-spec scopes, AI MUST ATTENTION ask user whether to skip.

These three filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

- `feature-spec-reference.md` — Feature Spec conventions, bucket/module mapping (read before reading any spec).
- `spec-system-reference.md` — canonical vs derived spec artifacts, TC format, spec paths.
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when the idea involves business entities/models).

> **External Memory:** Complex/lengthy discovery → write findings incrementally to the research report. Prevents context loss.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every relationship classification, gap, and invariant requires `file:line` proof with confidence % (>80% act, <80% verify first).

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

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
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

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

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** never skip steps via evasions. Plan anyway. Test first. Show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

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

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**IMPORTANT MUST ATTENTION Workflow:** Phase 0 classify the corpus and short-circuit when empty → declare the parallel discovery wave → Step 1 scan related specs → Step 2 discover related code and graph paths → Step 3 reconcile gaps and invariants → Step 4 persist the report → Step 5 obtain the blocking scope decision → Step 6 hand off to `domain-analysis` and `spec [mode=draft|update]`.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above):**

- **Graph-Assisted Investigation:** Run one graph command on key code files before concluding the code-discovery step.
- **Incremental Persistence:** Append findings to the research report, never hold the landscape in memory.
- **Subagent Return Contract:** Parallel-spec-read sub-agents return summary only, full findings on disk.
- **Nested Task Creation:** Expand child phases and link parent when nested under a workflow row.
- **Project Reference Docs:** Read `feature-spec-reference.md` + `spec-system-reference.md` + `lessons.md` before reading specs.
- **Task Tracking External Report:** Bootstrap task tracking, persist discovery findings incrementally.
- **Critical Thinking:** Traced proof per relationship/gap/invariant, confidence >80% to act.
- **Evidence:** Cite `file:line`; speculation forbidden, <60% do not recommend.
- **Cross-Service Check:** Scan producers, consumers, sagas, contracts — a missed consumer the idea touches is a silent gap.
- **Rationalization Prevention:** Reject step-skipping evasions; show grep evidence.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**MUST ATTENTION** every protocol above is in force for this spec-discovery — honor its canonical body, not just the digest line.

**IMPORTANT MUST ATTENTION** be BOTH spec-aware AND code-aware — read the spec root `<spec root>/**` (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it) (§1/§4/§5/§8 of related specs) AND delegate to `/investigate` + code-graph; spec-only or code-only discovery misses half the landscape — why: overlap lives in the spec corpus, downstream impact lives in the code.
**IMPORTANT MUST ATTENTION** run INLINE — the step 5 scope-decision gate is a BLOCKING `AskUserQuestion` that only works inline; spawn sub-agents only for parallel spec reads, NEVER delegate the whole skill — why: a delegated user gate cannot block, so the author would proceed before the user decides scope.
**IMPORTANT MUST ATTENTION** NEVER auto-pick NEW — classify every candidate spec EXTENDS/OVERLAPS/DEPENDS-ON/AFFECTED/UNRELATED with `file:line` evidence, then recommend and let the user decide via the BLOCKING gate — why: OVERLAPS detection is the entire reason this skill runs before the author; silently picking NEW ships a duplicate spec.
**MUST ATTENTION** stay in the LANDSCAPE lane — surface related/overlapping/affected specs + the invariant landscape fast; do NOT author the spec (that is `spec [mode=draft]`) and do NOT deep-dive every flow (that is `investigate`) — why: scope creep into authoring/analysis duplicates the next steps and burns the budget.
**MUST ATTENTION** graph expand is MANDATORY when `.code-graph/graph.db` exists — run at least ONE graph command on 2–3 key files investigate surfaced; when absent, grep + read still bridge code→spec via `[Source:]` anchors — why: structural callers/consumers/event chains the new spec must account for are invisible to grep.
**MUST ATTENTION** capture the invariant landscape explicitly — list every existing [HARD] rule (§4) and §5 invariant the idea must respect, as "for ALL {inputs}, {invariant} — owned by {spec/BR-id}" — why: a new spec that contradicts a DEPENDS-ON spec's [HARD] rule ships a defect.
**MUST ATTENTION** apply the greenfield short-circuit — when no specs AND no code, record the reason with `Glob`/grep evidence, skip heavy discovery, hand off a minimal landscape; run the scope gate only if there is something to decide — why: grinding through empty discovery wastes the budget and produces nothing.
**MUST ATTENTION** persist the report incrementally (per-section) to the research file — never hold the whole landscape in memory — why: context cutoff mid-discovery loses every finding; disk writes survive compaction.
**MUST ATTENTION** read required project docs first (always `lessons.md`; `feature-spec-reference.md` + `spec-system-reference.md` for spec conventions) BEFORE reading any spec — project conventions override generic assumptions.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| "The idea is obviously new, skip the spec scan"  | OVERLAPS is exactly what the scan catches. Classify every candidate spec first.   |
| "No graph available, skip code discovery"        | Grep + read still bridge code→spec via `[Source:]` anchors. Discovery is required. |
| "I'll just guess the right scope"                | Step 5 is a BLOCKING user gate. NEVER auto-pick NEW — recommend, then let user decide. |
| "Spec corpus is huge, read just one spec"        | Glob ALL candidates the keywords touch; reading one hides the overlap in another. |
| "I'll author the draft while I'm here"           | Landscape only. Authoring is `spec [mode=draft]`; deep flow analysis is `investigate`. |
| "Invariants are the author's problem"            | A spec contradicting a [HARD] rule ships a defect. List the invariant landscape now. |
| "Delegate the whole skill to a sub-agent, faster"| The step 5 gate is BLOCKING and inline-only. Spawn sub-agents only for spec reads. |

**IMPORTANT MUST ATTENTION** spec-aware AND code-aware · INLINE (step 5 gate is BLOCKING) · NEVER auto-pick NEW — cite `file:line` with confidence >80% — these survive any long context, anchored top and bottom.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
