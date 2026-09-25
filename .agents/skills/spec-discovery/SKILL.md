---
name: spec-discovery
description: '[Investigation] Use when a workflow step or the user asks for spec discovery before a new Feature Spec. Surfaces related, overlapping or affected specs, missing test cases and the invariant landscape.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Before a single line of a new Feature Spec is authored, deliver the pre-spec landscape — every existing Feature Spec the idea relates to / overlaps / depends on / would affect, the related code logic, the missing features and missing test cases / user stories, the system unknowns, and the invariant landscape the new spec must respect — so the author never ships a duplicate, contradicts a [HARD] rule, or specs into a blind spot.

**Summary:**

- This is BOTH spec-aware and code-aware: it reads `<spec root>/**` (the canonical Feature Specs — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND delegates to `$investigate` + code-graph for the code logic the idea touches. Spec-only or code-only discovery misses half the landscape.
- It runs BEFORE `spec [mode=draft]` and feeds it. Its job is to decide WHETHER a new standalone spec is even the right move — the alternative is extending an existing spec, which only a spec-corpus scan can reveal.
- It is INLINE on the main agent (NOT a sub-agent) because step 5 is a BLOCKING ask the user directly scope-decision gate that only works inline. It MAY spawn sub-agents for parallel spec reads, but it orchestrates and gates inline.
- Greenfield short-circuit: when there are no specs AND no code, auto-detect it, record the reason, skip the heavy discovery, and hand off a minimal landscape — never grind through empty discovery.
- **Main steps (0→6) — do ALL in order:** (0) frame scope = keywords/entities/bucket → (1) spec-corpus discovery = Glob all candidate specs under the spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path), read §1/§4/§5/§8, classify each EXTENDS/OVERLAPS/DEPENDS-ON/AFFECTED/UNRELATED with `file:line` → (2) code-logic discovery = `$investigate` + MANDATORY graph expansion, bridge code→spec via §8 `[Source:]` → (3) gap & invariant analysis = missing features, missing TCs/user stories, system unknowns, [HARD]/§5 invariant landscape → (4) report incrementally to `plans/.../spec-discovery-{slug}.md` → (5) BLOCKING ask the user directly scope gate = recommend NEW / EXTEND X / SPLIT, confirm cross-refs → (6) handoff to `domain-analysis` + `spec [mode=draft|update]`.

**Workflow:**

0. **Scope** — read the framed capability (brainstorm/idea output); extract keywords, candidate entities/actors, target spec bucket.
1. **Spec-corpus discovery** — `Glob <spec root>/**/README.*.md` (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); read §1/§4/§5/§8 of each candidate; classify each as EXTENDS / OVERLAPS / DEPENDS-ON / AFFECTED / UNRELATED.
2. **Code-logic discovery** — `$investigate {keywords}` + MANDATORY graph expansion on key files when `.code-graph/graph.db` exists; bridge code→spec via §8 `[Source:]` anchors.
3. **Gap & invariant analysis** — missing features, missing test cases / user stories, system unknowns (<80% confidence), and the existing [HARD] rules / §5 invariants the idea must respect.
4. **Report** — write `<plans root>/{plan-dir}/research/spec-discovery-{slug}.md` (plans root default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) incrementally (Related Specs · Related Code · Affected Specs · Gaps · Invariant Landscape · Open Questions).
5. **Scope-decision gate (BLOCKING ask the user directly)** — recommend NEW / EXTEND existing X / SPLIT into N, and confirm which existing specs to cross-reference.
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
| **Related-code discovery**         | the code the idea touches (the Step 2 delegation)                                        | `$investigate {keywords}`                                                   | Related Code                           |
| **Invariant / test-case landscape** | [HARD] BRs (§4), §5 entity invariants, existing §8 TC coverage of the touched specs      | one `investigate`; fold into the corpus sweep when the corpus is small      | Invariant Landscape · Missing TCs      |

Rules binding this wave: each member owns a **unique artifact path** under `tmp/reports/spec-discovery-{slug}/`; no worker writes `spec-discovery-{slug}.md`. After the barrier, YOU are the sole reducer: read and validate every artifact, then synthesize the final report in section order. A missing artifact is rerun or reported, never silently replaced by a bounded summary.

**SEQ — keep these OUT of the wave (each names its blocker):** the Step 2 graph expansion (YOU run it, and only after the code member returns its key files) · Step 3 gap & invariant reconciliation (consumes all three members) · the Step 5 scope-decision gate (a BLOCKING ask the user directly cannot block from inside a sub-agent) · Step 6 handoff.

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

Use the bucket `INDEX.md` (produced by `$spec-index`) as a fast navigation map when present — it lists the specs and their entities so you read fewer full files.

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

1. **Delegate to `$investigate {keywords}`** — fast parallel file discovery of the code the idea relates to. Use investigate's numbered, prioritized list as targets; do NOT re-grep what investigate already mapped.
2. **MANDATORY graph expansion** — when `.code-graph/graph.db` exists, run graph commands YOURSELF (sub-agents cannot) on 2–3 key files investigate surfaced:
    ```bash
    python .claude/scripts/code_graph trace <key-entity-or-command> --direction both --json
    python .claude/scripts/code_graph connections <key-file> --json
    ```
    Graph reveals callers, consumers, event chains, and tests grep cannot find — exactly the downstream the new spec must account for.
3. **Delegate ambiguous areas to `$investigate`** — when investigate + graph surface a flow whose behavior is unclear (the idea hinges on how it works), hand that narrow slice to `investigate` rather than guessing.
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

### Step 5: Scope-Decision Gate (BLOCKING ask the user directly)

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** before any spec is authored, MUST ATTENTION use ask the user directly to present the recommended scope. NEVER auto-pick — OVERLAPS detection is the whole reason this skill exists; assuming NEW silently ships duplicates.

Recommend ONE option (with the evidence behind it) and confirm the cross-references:

- **(a) NEW standalone spec** — no EXTENDS/OVERLAPS match; the idea is genuinely net-new. Hand off to `spec [mode=draft]`.
- **(b) EXTEND existing spec X** — an EXTENDS/OVERLAPS match means the idea belongs inside X. **Reroute to `$spec [mode=update]`** against X instead of drafting a new file.
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
| `docs/specs/{Bucket}/README.{X}.md` | OVERLAPS | §4 BR-X-03 already states this | route to $spec mode=update |

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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including a task per candidate spec read. This prevents context loss from long specs. For trivial single-spec scopes, AI MUST ATTENTION ask user whether to skip.

These three filenames resolve inside the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

- `feature-spec-reference.md` — Feature Spec conventions, bucket/module mapping (read before reading any spec).
- `spec-system-reference.md` — canonical vs derived spec artifacts, TC format, spec paths.
- `domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when the idea involves business entities/models).

> **External Memory:** Complex/lengthy discovery → write findings incrementally to the research report. Prevents context loss.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every relationship classification, gap, and invariant requires `file:line` proof with confidence % (>80% act, <80% verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `graph-assisted-investigation` — Run a code-graph command on the key files before concluding; investigating code while the code graph exists → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `rationalization-prevention` — Recognize and reject the evasions used to skip required steps; tempted to skip a step, a test or a review → .claude/skills/shared/protocols/rationalization-prevention.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md

<!-- PROTOCOL-GUIDES:END -->

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

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
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

**IMPORTANT MUST ATTENTION** be BOTH spec-aware AND code-aware — read the spec root `<spec root>/**` (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it) (§1/§4/§5/§8 of related specs) AND delegate to `$investigate` + code-graph; spec-only or code-only discovery misses half the landscape — why: overlap lives in the spec corpus, downstream impact lives in the code.
**IMPORTANT MUST ATTENTION** run INLINE — the step 5 scope-decision gate is a BLOCKING ask the user directly that only works inline; spawn sub-agents only for parallel spec reads, NEVER delegate the whole skill — why: a delegated user gate cannot block, so the author would proceed before the user decides scope.
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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
