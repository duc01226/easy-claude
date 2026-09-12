---
name: spec-index
version: 4.0.0
description: '[General] Use when (re)generating a DERIVED navigation index, cross-capability ERD, or reimplementation guide FROM canonical Feature Specs.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** `docs/specs/` is the fixed Feature Spec root.

**Goal:** Generate a regenerable, single-writer navigation layer (catalog, cross-capability ERD, and reimplementation guide) from canonical, tech-free 8-section Feature Specs, so derived aids never become a second source of truth.

**Summary:**

- **Purpose:** DERIVED-aid assembler ONLY — read §1 Overview, §5 Domain Model Mermaid, and §8 TCs to build default `INDEX.md`, optional `{Bucket}.erd.md`, and optional `{Bucket}.reimplementation-guide.md`; NEVER author business content. Feature Specs remain canonical.
- **Ordered run:** 0 Scope Gate — `AskUserQuestion` confirms bucket/mode/artifacts before reads; no `README.*.md` specs → STOP, route `/spec` → 1 read capability name+link, §1 summary, §8 feature code/TC count/status, §5 entities/relationships → 2 assemble 2a INDEX, 2b ERD, 2c guide → 3 stamp DERIVED banner/date and write each immediately → 4 verify retired outputs absent, links/banner valid, prose tech-free, no canonical claims.
- **Modes:** `index` (default — regenerate derived aids) · `audit` (report derived aids stale vs source specs).
- **Hard boundary:** NEVER emit retired A-E engineering tree, `M##` dirs, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, or `docs/specs/README.md`/`PRIORITY-INDEX.md`; use `{Bucket}.*` instead — why: an A-E bundle becomes a competing source of truth. Every generated file carries the DERIVED banner, links each row/entity to its source, and keeps INDEX/ERD prose tech-free; only the guide may name a target stack.

> **Routing:** `/spec-index` owns derived index/ERD/reimplementation aids; `/spec` owns canonical Feature Specs.

> **[SCOPE]** Assemble a **DERIVED** index / ERD / reimplementation guide over canonical Feature Specs. MUST NOT emit per-module A-E engineering files (`A-domain-model`, `B-business-rules`, `C-api-contracts`, `D-events`, `E-user-journeys`), `M##` directories, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, or `docs/specs/README.md`/`PRIORITY-INDEX.md`; those contents live in the Feature Spec. Thin-index-only contract: output is DERIVED, never an A-E bundle. Authority: [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md).

**Inputs:** canonical 8-section Feature Specs (§1 Overview, §5 Domain Model Mermaid, §8 TCs). Code is the technical source of truth; read it ONLY for unresolved cross-spec ERD relationships or reimplementation build order, never to populate a parallel spec layer.

**Modes:**

| Mode    | Trigger                                  | Input                                          | Output                                                                   |
| ------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `index` | default — refresh derived aids           | Feature Specs in the target bucket(s)          | `INDEX.md` catalog (+ optional ERD / reimplementation guide), all DERIVED |
| `audit` | explicit request — staleness check       | Feature Spec mtimes/git vs derived-artifact age | Stale-list report (which derived aids lag their source specs)            |

**Workflow:** `/investigate` (locate specs) → `/spec-index` (assemble derived aids) → `/changes-review` → `/watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via /spec-index; do NOT hand-edit` banner. It is NEVER a second source of truth.
- **[BLOCKING]** MUST NOT emit `M##` dirs, `A-E` files, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, `docs/specs/README.md`, or `docs/specs/PRIORITY-INDEX.md` (all retired). See **Hard Prohibitions**.
- §1-7 Feature Spec prose is tech-free; derived INDEX/ERD inherit that. The **reimplementation guide is the sole artifact allowed to name a target stack** (`spec-principles.md` §3 rebuild-guide exception).
- Every catalog row / ERD entity links back to the source Feature Spec; mark `[UNVERIFIED]` rather than guessing.
- Read [`docs/project-reference/spec-principles.md`](../../../docs/project-reference/spec-principles.md) §3 (tech-agnostic + banned-token list) before writing any prose.

---

## App Bucket Mapping

Derived aids use **App Bucket** (single-home spec tree). Resolve service→bucket assignments from the canonical table in [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md) → **App Bucket Mapping**; do not inline project-specific bucket names.

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before any read, use `AskUserQuestion`. Confirm:

| Dimension      | Question                                                                                                  | Auto-Default                  |
| -------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Bucket** ★   | Which App Bucket(s) — one bucket, several, or all of `docs/specs/`?                                       | — must confirm                |
| **Mode** ★     | `index` (regenerate derived aids) OR `audit` (report which derived aids are stale vs their source specs)? | `index`                       |
| **Artifacts**  | Which derived aids: bucket `INDEX.md` / cross-capability ERD / reimplementation guide?                    | `INDEX.md` only               |
| **Stack note** | (reimplementation guide only) Name a target rebuild stack, or keep stack-neutral build order?            | Stack-neutral                 |

> **[BLOCKING]** If the target bucket has **no** Feature Specs matching `docs/specs/{Bucket}/README.*.md`, STOP and route the user to `/spec`; there is nothing to derive. NEVER fabricate a spec to index.

---

## Step 1 — Read the Source Feature Specs

1. `Glob docs/specs/{Bucket}/README.*.md` → enumerate the canonical specs.
2. For each spec, read and extract ONLY:
    - **Capability name** + file link
    - **Summary** — first sentence of `## 1. Overview`
    - **Feature code** + **TC count** + status mix from `## 8. Test Specifications`
    - **Entities + relationships** from the `## 5. Domain Model` ` ```mermaid ` block (for ERD assembly)
3. Do NOT re-derive business rules, API contracts, or events into new files — those live in the Feature Spec (§1-7) and in code. You are indexing, not extracting.

> **Scale:** For many specs, you MAY spawn one reader sub-agent per spec returning the fields above; optimization only, not a gate. No per-module A-E extraction.

---

## Step 2 — Assemble the Derived Aids

### 2a. Bucket `INDEX.md` (default)

Regenerate `docs/specs/{Bucket}/INDEX.md` as a feature catalog:

```markdown
> **DERIVED — regenerate via `/spec-index`; do NOT hand-edit.** Source of truth: the Feature Specs in `docs/specs/{Bucket}/README.*.md`.

# {Bucket} — Feature Index

| Capability | Summary | Feature Code | TCs | Status |
| ---------- | ------- | ------------ | --- | ------ |
| [{Name}](README.{Name}.md) | {one-line overview} | {FC} | {n} | {Active/Draft} |
```

> `/spec` owns canonical Feature Specs; `/spec-index` deterministically regenerates derived `INDEX.md` from them (one writer).

### 2b. Cross-Capability ERD (on request)

Assemble one Mermaid `erDiagram` from every spec's §5 block in the bucket:

- Merge/dedupe entities by name; keep cross-capability relationships.
- Resolve code-only relationships by reading code; keep ERD prose tech-free (entity + relationship names only, no class/table identifiers).
- Write to `docs/specs/{Bucket}/{Bucket}.erd.md` with the DERIVED banner. **Do NOT** name it `01-domain-erd.md` (retired).

### 2c. Reimplementation Guide (on explicit request only)

A build-order narrative: capability dependency order, integration touchpoints, suggested rebuild sequence.

- This is the **only** derived artifact permitted to name a target stack (`spec-principles.md` §3 rebuild-guide exception).
- Write to `docs/specs/{Bucket}/{Bucket}.reimplementation-guide.md` with the DERIVED banner. **Do NOT** name it `06-reimplementation-guide.md` (retired).

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate via /spec-index; do NOT hand-edit` banner + regenerate date; write each file immediately after assembly. Do NOT accumulate large outputs in context.

---

## Step 4 — Verify (self-check before completing)

- **MUST ATTENTION** No retired artifacts: grep output paths; require zero `M[0-9]`, zero `A-domain-model`/`B-business-rules`/`C-api-contracts`/`D-events`/`E-user-journeys`, zero `00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`, zero `docs/specs/README.md`/`PRIORITY-INDEX.md`.
- **MUST ATTENTION** Every catalog row links to an existing Feature Spec; no dangling links.
- **MUST ATTENTION** DERIVED banner present on each generated file.
- **MUST ATTENTION** §1-7-derived prose tech-free (INDEX/ERD); only the reimplementation guide may name a stack.
- **MUST ATTENTION** No canonical claims; derived files never assert they are the source of truth.

---

## Hard Prohibitions (R1 mitigation — NON-NEGOTIABLE)

This skill produces only the DERIVED index / ERD / reimplementation guide. Emitting an A-E engineering tree would create a second source of truth competing with the Feature Spec. Therefore this skill MUST NEVER create:

| Forbidden output                                                              | Why                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `M##` directories (e.g., `M01/`, `M02/`)                                      | Retired per-module partition                                       |
| `A-domain-model.md` / `B-business-rules.md` / `C-api-contracts.md` / `D-events.md` / `E-user-journeys.md` | Retired A-E engineering bundle — content lives in the Feature Spec |
| `00-module-registry.md`                                                       | Retired registry — bucket `INDEX.md` is the catalog               |
| `01-domain-erd.md`                                                            | Retired per-system ERD name — use `{Bucket}.erd.md`               |
| `06-reimplementation-guide.md`                                                | Retired per-system name — use `{Bucket}.reimplementation-guide.md` |
| `docs/specs/README.md`, `docs/specs/PRIORITY-INDEX.md`                        | Retired QA dashboards — Section 8 is the canonical TC registry     |
| `docs/business-features/**`                                                   | Not a spec home — all specs live under `docs/specs/`               |

If a user explicitly asks for an A-E bundle, explain it is retired and offer the derived index/ERD instead. The thin-index-only contract applies — output is DERIVED, never an A-E bundle.

---

## Selective Artifact Mode

| User goal                              | Generate                                            |
| -------------------------------------- | --------------------------------------------------- |
| "Refresh the bucket index"             | `INDEX.md` only                                     |
| "I need the data model across the app" | Cross-capability ERD (`{Bucket}.erd.md`)            |
| "Produce a rebuild guide"              | Reimplementation guide (stack-neutral unless named) |
| "Full navigation set"                  | `INDEX.md` + ERD + reimplementation guide           |

---

## Next Steps

**[BLOCKING]** After completing, use `AskUserQuestion` — DO NOT skip:

- **"/docs-update (Recommended)"** — sync the Feature Specs + Section 8 if any source content was found stale during indexing
- **"/watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill               | Relationship                                                                                          | When to Call                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `/spec`     | **Source owner** — authors the canonical 8-section Feature Spec and flags when derived refresh may be required                | Before spec-index — the specs must exist to index         |
| `/spec [mode=tests]`         | **Source owner** — owns Section 8 TCs that this skill counts in the catalog                           | When TCs change and the index TC counts must refresh      |
| `/docs-update`      | **Orchestrator** — may call spec-index to refresh derived aids after a doc sync                       | After code/spec changes need a full doc sync              |
| `/changes-review`   | **Trigger** — detects spec changes and surfaces stale derived aids                                    | After spec changes; it will suggest regenerating the index |

## Purpose

`/spec-index` is the derived-index generator over the single-home spec tree. It assembles regenerable catalog, cross-capability ERD, and rebuild guide for bucket browsing or replatform planning; the tech-free 8-section Feature Spec remains canonical. It never reverse-engineers code into a parallel spec bundle; code is read only for unresolved ERD relationships or rebuild order.

---

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Generate a regenerable, single-writer navigation layer (catalog, cross-capability ERD, and reimplementation guide) from canonical, tech-free 8-section Feature Specs, so derived aids never become a second source of truth.
- **IMPORTANT MUST ATTENTION Main steps/modes/gates:** **Step 0 Scope Gate** — `AskUserQuestion` confirms bucket + mode (`index` default | `audit`) + artifacts (+ stack note for guide) before any read; no `README.*.md` specs → STOP and route `/spec` → **Step 1** read capability name+link, §1 summary, §8 feature code/TC count/status, §5 entities/relationships → **Step 2** assemble 2a `INDEX.md`, 2b ERD, 2c guide (explicit request only) → **Step 3** stamp DERIVED banner/date and write each immediately → **Step 4** verify no retired outputs, links resolve, banner present, INDEX/ERD prose tech-free, no canonical claims → after completion `AskUserQuestion` for `/docs-update`, `/watzup`, or skip. NEVER skip or reorder without user approval — why: this fixed sequence protects the single-writer contract.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** NEVER present a guess as fact; traced proof, confidence >80% to act.

- **IMPORTANT MUST ATTENTION** Feature Specs remain canonical; emit only derived aids, link every row/entity to its source, mark `[UNVERIFIED]` instead of guessing, and let only the reimplementation guide name a target stack.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Output is DERIVED — never emit `M##`/A-E/`00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`/QA-dashboard files (see Hard Prohibitions); use `{Bucket}.*` filenames instead — why: an A-E bundle becomes a second source of truth competing with the Feature Spec
- **IMPORTANT MUST ATTENTION [BLOCKING]** The Feature Spec (`docs/specs/{Bucket}/README.{Feature}.md`) is the source of truth — this skill assembles, never authors, business content — why: a derived aid that asserts canonical authority corrupts the single-writer contract
- **IMPORTANT MUST ATTENTION [BLOCKING]** Confirm bucket + mode + artifacts via `AskUserQuestion` BEFORE Step 1 — NEVER auto-start; if the bucket has no `README.*.md` specs, STOP and route to `/spec` instead of fabricating a spec to index
- **IMPORTANT MUST ATTENTION [BLOCKING]** Context compaction/session resume → `TaskList` FIRST; resume existing tasks, never re-run a completed generation pass — why: summaries describe intent, not filesystem state
- **IMPORTANT MUST ATTENTION [BLOCKING]** Stamp the DERIVED banner + regenerate date on every generated file; write after each artifact, never accumulate large outputs in context
- **IMPORTANT MUST ATTENTION [REQUIRED]** INDEX/ERD prose tech-agnostic (read `spec-principles.md` §3 banned-token list FIRST); only a reimplementation guide may name a target stack (rebuild-guide exception)
- **IMPORTANT MUST ATTENTION [REQUIRED]** Every catalog row / ERD entity links to an existing Feature Spec — grep the source path to confirm it resolves; mark `[UNVERIFIED]` rather than guessing — why: dangling links silently rot the navigation layer
- **IMPORTANT MUST ATTENTION** Read code ONLY to resolve a cross-spec ERD relationship or a reimplementation build order — never to populate a parallel spec layer — why: code is the technical source of truth, not a spec substitute
- **IMPORTANT MUST ATTENTION** Cite `file:line` evidence for every extracted field and link (confidence >80% to act, <60% mark `[UNVERIFIED]`) — NEVER fabricate a capability name, feature code, or TC count; grep the source spec to confirm
- **IMPORTANT MUST ATTENTION** Before authoring any new derived format, grep 3+ existing `INDEX.md`/`*.erd.md` siblings and match their structure — verify the new bucket shares the same spec layout before copying a nearby pattern
- **IMPORTANT MUST ATTENTION** Break task scope into small `TaskCreate` todos (one per artifact) before acting; mark each `completed` immediately after its file is written; keep exactly one `in_progress`
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                                                  | Rebuttal                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "User wants full detail — regenerate the A-E bundle"     | A-E is not part of the spec model. Offer the derived index/ERD; the detail already lives in the Feature Spec + code.  |
| "I'll write the ERD as `01-domain-erd.md`"               | Wrong filename. Use `{Bucket}.erd.md` with the DERIVED banner.                                     |
| "The index can be the source of truth, it's complete"    | NEVER — it is derived/regenerable. §1-7 + §8 of the Feature Spec are canonical.                    |
| "No specs in this bucket, I'll extract from code"        | STOP. Route to `/spec`. This skill indexes existing specs; it does not author new ones.    |
| "Scope is obvious, skip Step 0 AskUserQuestion"          | BLOCKING — NEVER auto-start. Bucket, mode, and artifact set MUST be confirmed first.               |
| "I'll just trust the spec link, no need to verify"       | Grep the source path. A dangling link makes the derived navigation layer worse than none.         |
| "TC count looks about right, skip re-reading §8"         | NEVER guess counts. Re-read `## 8. Test Specifications`; mark `[UNVERIFIED]` if unresolved.        |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via TaskCreate before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

**IMPORTANT MUST ATTENTION** Output is DERIVED + regenerable — never a second source of truth; the Feature Spec is canonical.
**IMPORTANT MUST ATTENTION** Confirm bucket + mode + artifacts via `AskUserQuestion` BEFORE any read; no specs → STOP, route to `/spec`.
**IMPORTANT MUST ATTENTION** Cite `file:line` for every extracted field; mark `[UNVERIFIED]` rather than guessing; never emit retired A-E/`M##`/QA-dashboard files.
**IMPORTANT MUST ATTENTION** Keep Feature Specs canonical, confirm scope before reading, and verify every derived output before completion.
