# `$spec [mode=index]` — derived spec index reference

> Loaded by `spec/SKILL.md`'s Mode Dispatch when invoked as `$spec [mode=index] [action=index|audit] [bucket=<scope>] [artifacts=INDEX[,ERD]]`. This contract REPLACES the spec authoring body for the invocation: it assembles regenerable navigation aids (index, cross-capability ERD, reimplementation guide) FROM canonical specs only, or audits them for staleness. It never authors canonical content and never becomes a source of truth.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

> **Portability:** the canonical business-spec root defaults to `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides it. Use project references to resolve the canonical filename pattern, section roles, owner/ID rules, carriers, output policy, and derived destination.

**Goal:** Generate only requested, regenerable navigation aids from a project's canonical specs while preserving its section, identity, evidence, and ownership rules.

**Summary:**

- **Purpose:** MUST ATTENTION derive aids only from fields mapped to canonical sources. NEVER author missing business intent or create a parallel scenario registry.
- **Ordered run:** MUST ATTENTION read project config + required references → confirm scope/action/artifacts/destination → discover canonical owners → resolve mapped roles, IDs, carriers and test relation → assemble requested aids → stamp/write in an approved derived location, skipping unchanged content → verify source coverage, links, policy and noncanonical status; no source → stop and report.
- **Actions:** `index` (default — regenerate derived aids) · `audit` (report derived aids stale vs source specs). Select with `action=index|audit` or the `--audit` flag; the spec-level mode is always `[mode=index]`, so the `audit` action never means the spec `audit` mode.
- **Hard boundary:** outputs are DERIVED, regenerate from exact linked sources, and never replace or duplicate canonical owners, case registries, or project-managed indexes. Honor the project's configured authorship, section, prose, and destination rules.

> **Routing:** `$spec [mode=index]` owns derived aids; the project's canonical authoring workflow owns source specs and native cases.

> **[SCOPE]** Assemble only the user-requested derived index, ERD, or reimplementation guide. Resolve the configured business root from `specRoots.business.path`, using the framework config loader's fallback only when unset. Consult `spec-system-reference.md` through the configured project-reference docs root and its docs index for canonical file patterns, exclusions, ownership, and whether an index or destination is allowed. Never create a parallel spec plane or case registry.

**Inputs:** project-configured canonical sources and project references. Read code only to resolve an explicitly requested technical relationship or build order; never use it to invent missing business intent, canonical cases, or a second spec layer.

**Actions:**

| Action  | Trigger                                  | Input                                          | Output                                                                   |
| ------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `index` | default — refresh requested aids       | Canonical owners selected through project config and references | Approved derived catalog (+ optional ERD / reimplementation guide) |
| `audit` | explicit request — staleness check     | Canonical owners and existing derived aids     | Stale-list report with exact source/output paths                         |

**Workflow:** `$investigate` (locate specs) → `$spec [mode=index]` (assemble derived aids) → `$changes-review` → `$watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via $spec [mode=index]; do NOT hand-edit` banner. It is NEVER a second source of truth.
- **[BLOCKING]** Never write into a derived or canonical location unless project config/references allow it. Never create a parallel canonical spec, case registry, or manually maintained index.
- Resolve source patterns and section roles from the configured profile and required project-reference docs. If no explicit native case profile is established, retain the strict default TC/Section 8 representation; do not infer a native format from language, file extension, or one example.
- Extract only mapped fields. Use the mapped intent sections for summaries, mapped contract/model sections for relationships, and mapped evidence sections for proof pointers. Preserve exact owner paths and logical IDs; do not turn carrier rows or tests into new canonical cases.
- **[BLOCKING] MUST ATTENTION** Keep each canonical owner path joined to its exact logical case identity in every derived reference; NEVER emit an unqualified native ID.
- **[BLOCKING] NEVER** infer coverage cardinality from test names, executor totals, or variant-row counts; trace every claimed result to its actual executor and inspected assertion.
- **[BLOCKING] ALWAYS** keep unknown owners, mappings, and outcomes explicitly `UNKNOWN`/`[UNVERIFIED]`; do not turn incomplete selection into clean coverage.
- Link each row/entity to its exact canonical owner and mark `[UNVERIFIED]` or omit it when the mapped source does not support the claim.
- Apply the project's writing and stack-detail rules from its required reference docs; do not assume every project uses the same prose restrictions or rebuild-guide exception.

---

## Scope Mapping

Use the grouping and ownership model named by the configured root and project references (for example, domain, capability, module, or a single root). Do not assume an application bucket or service-to-bucket map. Keep project-specific grouping names in project references, not in this skill.

---

## Step 0 — Project Context and Scope Gate (MANDATORY)

Before reading canonical source content:

1. **MUST ATTENTION** read `docs/project-config.json`, the configured docs index (default `docs/project-reference/docs-index-reference.md`), `lessons.md`, and the required spec references from the configured reference-doc root. Resolve roots, authorship, mapped sections/identities/carriers, and the allowed derived-output location.
2. State `Reference docs read: ... | Not applicable: ...`.
3. **MUST ATTENTION** use ask the user directly to confirm scope and output. Do not read canonical source bodies until the user confirms.

Confirm:

| Dimension          | Question                                                                                         | Auto-default |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------ |
| **Scope** ★        | Which canonical domain/capability set or the entire configured root?                             | Must confirm |
| **Action** ★       | `index` (regenerate allowed derived aids) or `audit` (report staleness without writing)?         | `index`      |
| **Artifacts**       | Which aids allowed by local policy: catalog, ERD, reimplementation guide?                         | Catalog only |
| **Destination** ★  | Which configured/approved derived location? If none exists, where outside canonical owners?     | Must confirm |
| **Stack note**      | For a requested reimplementation guide, is a target stack explicitly required?                  | Project rule |

> **[BLOCKING]** Use the configured canonical pattern and declared exclusions; never assume `README.*.md` or a directory shape. If selection is empty, check the root and selector against project config/references, then report the exact paths/patterns searched and stop. Do not infer specs from code. If local policy rejects an index in the canonical tree and no approved derived destination exists, do not write one.

---

## Step 1 — Read the Canonical Sources

1. **MUST ATTENTION** enumerate canonical owners using the configured root plus the exact file pattern, lifecycle, companion, and exclusion rules from project references. NEVER substitute a framework-default path for a declared root.
2. Resolve the project's explicit profile before interpreting contents. Use configured section aliases, logical identifiers, owner rules, carriers, and documented case-to-test relationship. If no native profile is explicit, use the strict default TC/Section 8 contract.
3. For each owner, extract only supported fields:
   - canonical name, exact source path, and lifecycle when declared;
   - a concise intent summary from the mapped intent source;
   - an optional case/coverage summary only when its source and counting rule are explicit; do not count executor or variant rows as canonical scenarios;
   - model/relationship details for an ERD only from a mapped canonical model/contract source.
4. Preserve exact owner-qualified scenario and variant identities when a requested aid needs them. NEVER create a second case registry or infer coverage from aggregate counts; trace every claimed result to the actual executor and inspected assertion.
5. Do NOT re-derive missing business rules, contracts, relationships, or events from code. Use `[UNVERIFIED]` or omit unsupported fields.

> **Scale:** For many canonical owners, you MAY spawn read-only inventory workers that return exact source paths and mapped fields; the main agent verifies every claim before writing. This is an optimization, not a gate.

---

## Step 2 — Assemble the Derived Aids

### 2a. Catalog (default, when local policy permits)

Generate `INDEX.md` only at the user-confirmed, project-approved destination. Keep it navigational and link to canonical owners; do not duplicate requirement or scenario registries.

```markdown
> **DERIVED — regenerate via `$spec [mode=index]`; do NOT hand-edit.** Source of truth: the linked canonical artifacts under the configured root.

# {Scope} — Canonical Source Index

| Canonical source | Intent summary | Lifecycle |
| --------------- | -------------- | --------- |
| [{Source path}](<relative canonical path>) | {one-line mapped intent} | {declared state or `not declared`} |
```

The project's canonical authoring workflow owns each source. `$spec [mode=index]` is the single writer for this derived catalog.

### 2b. Cross-Capability ERD (on request)

Assemble one Mermaid ERD only when project references identify a canonical model/relationship source for the selected owners:

- Merge duplicate model concepts only when source evidence establishes they are the same; retain cross-owner links.
- Do not invent business relationships from code. Code may validate a declared relation or resolve a requested technical dependency; label unsupported relationships `[UNVERIFIED]` or omit them.
- Write to the user-confirmed, project-approved derived destination with the DERIVED banner. Follow its filename conventions.

### 2c. Reimplementation Guide (on explicit request only)

A build-order narrative over declared capability dependencies and integration touchpoints.

- Read project writing rules and the requested audience. Name a target stack only when project policy permits it; ask the user when the policy leaves the choice open.
- Write to the user-confirmed, project-approved derived destination with the DERIVED banner. Follow its filename conventions.

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate via $spec [mode=index]; do NOT hand-edit` banner + regenerate date; write each file immediately after assembly. Do NOT accumulate large outputs in context.
- **[BLOCKING] A regeneration that produces the same content writes NOTHING — not the date either.** Before writing each file, compare the assembled candidate against the file on disk: `node .claude/hooks/lib/doc-stamp-guard.cjs --check <output path> --candidate <candidate file>`. Exit `3` = no-op → skip that file and report it `unchanged (no write)`; exit `0` = write it, banner date and all. — why: these outputs are DERIVED, so re-running the skill on unchanged specs is routine — and a rewrite that moves only the regenerate date is an unmergeable line that makes two branches conflict over a value neither of them decided.

---

## Step 4 — Verify (self-check before completing)

- **MUST ATTENTION** Selected source count matches the discovered canonical owners; report excluded companions and any unknown/unmapped owners.
- **MUST ATTENTION** Every row/entity links to an existing canonical source; no dangling links or fabricated identities.
- **MUST ATTENTION** DERIVED banner present on each generated file.
- **MUST ATTENTION** Output respects the project's authorship, section-role, prose, and destination rules.
- **MUST ATTENTION** No canonical claims, copied case registry, or hand-maintained index; derived files never assert they are the source of truth.

---

## Ownership Boundary (NON-NEGOTIABLE)

This skill produces only requested, DERIVED aids. It MUST NEVER:

- create or revise canonical business or technical content;
- create a parallel spec tree, canonical case registry, or duplicate owner-qualified scenario rows;
- write under a hand-authored root or project-reserved path without explicit local policy and user confirmation;
- impose retired filenames or folder layouts from another project on this one.

If a requested artifact conflicts with the project's canonical ownership or output policy, stop and explain the conflict. Offer an allowed derived destination or an audit-only report when available.

---

## Selective Artifact Mode

| User goal                              | Generate                                            |
| -------------------------------------- | --------------------------------------------------- |
| "Refresh the source index"             | Approved catalog destination only                   |
| "I need the data model across the app" | ERD from a mapped canonical model source             |
| "Produce a rebuild guide"              | Reimplementation guide (stack-neutral unless named) |
| "Full navigation set"                  | Only the aids allowed by local policy               |

---

## Next Steps

**[BLOCKING]** After completing, use ask the user directly — DO NOT skip:

- **"$docs-manager --mode=update (Recommended)"** — reconcile stale canonical specs and their profile-defined case/test carriers
- **"$watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill               | Relationship                                                                                          | When to Call                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `$spec`     | **Source owner** — authors or amends canonical specifications and flags when derived refresh may be required | Before `[mode=index]` — canonical owners must exist      |
| `$spec [mode=tests]` | **Strict-default source owner** — edits Section 8 TCs only when the strict default profile applies | When default-profile cases change and a derived summary is requested |
| `$docs-manager --mode=update`      | **Orchestrator** — may call `[mode=index]` to refresh derived aids after a doc sync                       | After code/spec changes need a full doc sync              |
| `$changes-review`   | **Trigger** — detects spec changes and surfaces stale derived aids                                    | After spec changes; it will suggest regenerating the index |

## Purpose

`$spec [mode=index]` assembles regenerable navigation aids over the configured canonical roots. It reads only mapped fields, keeps exact owners and identities, obeys output policy, and never reverse-engineers code into a parallel spec or case layer. Code is consulted only for an explicitly requested technical relationship or build order.

---

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `spec` skill already carries `cross-service-check`.

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — serial execution of provably independent tasks wastes wall-clock. Applies to every multi-step job (workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync). **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`; else `SEQ`, naming the dependency that forces it.
> 2. **Group `PAR` into waves.** No edge between members; two writers of one file NEVER share a wave; read-only work parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **Cost check before every wave:** each sub-agent pays a fixed context load before any work — its agent definition, every skill it loads or preloads, its brief and reference docs — commonly tens of thousands of tokens, far more than one duplicated protocol block. Dispatch only a task whose own work clearly exceeds that load; otherwise do it inline, or fold it into an agent that already reads the same files as concrete questions (that agent need not load the task's whole skill) — unless the task's risk needs its full protocol: risk sets depth, file count never does. Merge tasks that read the same files or reference docs into one agent, and prefer fewer, larger agents over many small ones. Parallelism buys wall-clock time, never free tokens.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · a task whose own work is smaller than its sub-agent's fixed context load (do it inline or merge it) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** Plan waves per the `Workflow Step Advancement & Parallel Phases` rules: tag tasks `PAR`/`SEQ`, spawn each `PAR` wave in ONE message with disjoint write sets, honor the all-return barrier, and fold a small lens into an agent already reading the same files, unless its risk needs the full protocol; full text: `.claude/skills/shared/protocols/parallel-subagent-dispatch.md`.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Generate requested, regenerable navigation aids from exact canonical sources while preserving configured section, identity, evidence, authorship, and case/test semantics.
- **IMPORTANT MUST ATTENTION Main steps/actions/gates:** read project config and required spec references → ask the user directly confirms scope, action, artifacts, and approved output destination before source-body reads → discover canonical owners with the configured patterns/exclusions → map intent/contracts/evidence, identifiers, carriers, and coverage relation; strict default TC/Section 8 applies only without an explicit native profile → assemble selected aids → stamp and write each approved output immediately, with unchanged-content guard → verify selection totals, source links, section policy, DERIVED status, and no duplicate registry → after completion ask about `$docs-manager --mode=update`, `$watzup`, or continuing manually. NEVER skip gates or infer a missing source — why: a wrong root or copied case registry can silently replace the real owner.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.

- **IMPORTANT MUST ATTENTION** Canonical owners remain authoritative; emit only approved derived aids, link every row/entity to its exact owner, and mark `[UNVERIFIED]` or omit unsupported claims.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve business root, canonical pattern, section roles, owner/ID rules, carriers, coverage relation, prose policy, and destination from project config + required references; if no native profile is explicit, use the strict default TC/Section 8 format.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Confirm scope + action + artifacts + allowed destination by asking the user directly after required reference prefetch and before reading canonical source bodies. Empty selection → verify root/pattern, report exact search, STOP; never extract a substitute spec from code.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Never create a parallel case registry, canonical spec tree, or index forbidden by project policy; output only at a confirmed derived destination.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Context compaction/session resume → the current task list FIRST; resume existing tasks, never re-run a completed generation pass — why: summaries describe intent, not filesystem state
- **IMPORTANT MUST ATTENTION [BLOCKING]** Stamp a DERIVED banner + date and write each selected aid immediately; compare candidate content first and do not write when content is unchanged.
- **IMPORTANT MUST ATTENTION** Apply prose/stack constraints from the mapped project references; do not assume a universal section count or target-stack exception.
- **IMPORTANT MUST ATTENTION** Verify every source link and selected-owner count; mark `[UNVERIFIED]` rather than guessing identity, field, status, relationship, coverage, or count.
- **IMPORTANT MUST ATTENTION** Read code only for an explicitly requested technical dependency/build order or to validate a declared relationship — never to invent canonical business content.
- **IMPORTANT MUST ATTENTION** Before authoring a new derived format, inspect 3+ matching project artifacts and confirm their ownership/destination rules fit the requested output.
- **IMPORTANT MUST ATTENTION** Break task scope into small task tracking todos (one per artifact) before acting; mark each `completed` immediately after its file is written; keep exactly one `in_progress`
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                                                  | Rebuttal                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "The derived view can become a canonical source"        | NEVER — only configured canonical owners define requirements and cases. |
| "A familiar filename or folder pattern should work"     | Resolve the project's configured root, selectors, and naming rules first. |
| "No specs in this selection; I'll extract them from code" | Verify the root and selector, report exact paths, then STOP; code is not a replacement source. |
| "Scope is obvious; skip ask the user directly"              | BLOCKING — confirm scope, action, artifact set, and destination before reading canonical bodies. |
| "I'll trust the source link"                             | Verify it. A dangling link makes the derived navigation layer worse than none. |
| "Case count looks about right"                           | Count only from the selected canonical carrier and its explicit counting rule; otherwise mark unknown or omit it. |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

**IMPORTANT MUST ATTENTION** Derived aids remain regenerable and noncanonical; preserve canonical owners and profile-defined identifiers.
**IMPORTANT MUST ATTENTION** Read config + required refs, then confirm scope/action/artifacts/destination before canonical source reads.
**IMPORTANT MUST ATTENTION** Use the explicit native profile when present; otherwise keep strict default TC/Section 8 obligations. Never invent a registry, path, identity, relationship, or coverage result.
**IMPORTANT MUST ATTENTION** Link every derived claim to a canonical source, obey destination policy, and verify every selected output before completion.
