---
name: spec-index
description: '[General] Use when (re)generating a DERIVED navigation index, cross-capability ERD, or reimplementation guide FROM canonical Feature Specs.'
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
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** the canonical business-spec root defaults to `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides it. Use project references to resolve the canonical filename pattern, section roles, owner/ID rules, carriers, output policy, and derived destination.

**Goal:** Generate only requested, regenerable navigation aids from a project's canonical specs while preserving its section, identity, evidence, and ownership rules.

**Summary:**

- **Purpose:** MUST ATTENTION derive aids only from fields mapped to canonical sources. NEVER author missing business intent or create a parallel scenario registry.
- **Ordered run:** MUST ATTENTION read project config + required references → confirm scope/mode/artifacts/destination → discover canonical owners → resolve mapped roles, IDs, carriers and test relation → assemble requested aids → stamp/write in an approved derived location, skipping unchanged content → verify source coverage, links, policy and noncanonical status; no source → stop and report.
- **Modes:** `index` (default — regenerate derived aids) · `audit` (report derived aids stale vs source specs).
- **Hard boundary:** outputs are DERIVED, regenerate from exact linked sources, and never replace or duplicate canonical owners, case registries, or project-managed indexes. Honor the project's configured authorship, section, prose, and destination rules.

> **Routing:** `$spec-index` owns derived aids; the project's canonical authoring workflow owns source specs and native cases.

> **[SCOPE]** Assemble only the user-requested derived index, ERD, or reimplementation guide. Resolve the configured business root from `specRoots.business.path`, using the framework config loader's fallback only when unset. Consult `spec-system-reference.md` through the configured project-reference docs root and its docs index for canonical file patterns, exclusions, ownership, and whether an index or destination is allowed. Never create a parallel spec plane or case registry.

**Inputs:** project-configured canonical sources and project references. Read code only to resolve an explicitly requested technical relationship or build order; never use it to invent missing business intent, canonical cases, or a second spec layer.

**Modes:**

| Mode    | Trigger                                  | Input                                          | Output                                                                   |
| ------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `index` | default — refresh requested aids       | Canonical owners selected through project config and references | Approved derived catalog (+ optional ERD / reimplementation guide) |
| `audit` | explicit request — staleness check     | Canonical owners and existing derived aids     | Stale-list report with exact source/output paths                         |

**Workflow:** `$investigate` (locate specs) → `$spec-index` (assemble derived aids) → `$changes-review` → `$watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via $spec-index; do NOT hand-edit` banner. It is NEVER a second source of truth.
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
| **Mode** ★         | `index` (regenerate allowed derived aids) or `audit` (report staleness without writing)?         | `index`      |
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
> **DERIVED — regenerate via `$spec-index`; do NOT hand-edit.** Source of truth: the linked canonical artifacts under the configured root.

# {Scope} — Canonical Source Index

| Canonical source | Intent summary | Lifecycle |
| --------------- | -------------- | --------- |
| [{Source path}](<relative canonical path>) | {one-line mapped intent} | {declared state or `not declared`} |
```

The project's canonical authoring workflow owns each source. `$spec-index` is the single writer for this derived catalog.

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

- Every generated file opens with the `> DERIVED — regenerate via $spec-index; do NOT hand-edit` banner + regenerate date; write each file immediately after assembly. Do NOT accumulate large outputs in context.
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

- **"$docs-update (Recommended)"** — reconcile stale canonical specs and their profile-defined case/test carriers
- **"$watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill               | Relationship                                                                                          | When to Call                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `$spec`     | **Source owner** — authors or amends canonical specifications and flags when derived refresh may be required | Before spec-index — canonical owners must exist          |
| `$spec [mode=tests]` | **Strict-default source owner** — edits Section 8 TCs only when the strict default profile applies | When default-profile cases change and a derived summary is requested |
| `$docs-update`      | **Orchestrator** — may call spec-index to refresh derived aids after a doc sync                       | After code/spec changes need a full doc sync              |
| `$changes-review`   | **Trigger** — detects spec changes and surfaces stale derived aids                                    | After spec changes; it will suggest regenerating the index |

## Purpose

`$spec-index` assembles regenerable navigation aids over the configured canonical roots. It reads only mapped fields, keeps exact owners and identities, obeys output policy, and never reverse-engineers code into a parallel spec or case layer. Code is consulted only for an explicitly requested technical relationship or build order.

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

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
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Generate requested, regenerable navigation aids from exact canonical sources while preserving configured section, identity, evidence, authorship, and case/test semantics.
- **IMPORTANT MUST ATTENTION Main steps/modes/gates:** read project config and required spec references → ask the user directly confirms scope, mode, artifacts, and approved output destination before source-body reads → discover canonical owners with the configured patterns/exclusions → map intent/contracts/evidence, identifiers, carriers, and coverage relation; strict default TC/Section 8 applies only without an explicit native profile → assemble selected aids → stamp and write each approved output immediately, with unchanged-content guard → verify selection totals, source links, section policy, DERIVED status, and no duplicate registry → after completion ask about `$docs-update`, `$watzup`, or continuing manually. NEVER skip gates or infer a missing source — why: a wrong root or copied case registry can silently replace the real owner.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** NEVER present a guess as fact; traced proof, confidence >80% to act.

- **IMPORTANT MUST ATTENTION** Canonical owners remain authoritative; emit only approved derived aids, link every row/entity to its exact owner, and mark `[UNVERIFIED]` or omit unsupported claims.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve business root, canonical pattern, section roles, owner/ID rules, carriers, coverage relation, prose policy, and destination from project config + required references; if no native profile is explicit, use the strict default TC/Section 8 format.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Confirm scope + mode + artifacts + allowed destination by asking the user directly after required reference prefetch and before reading canonical source bodies. Empty selection → verify root/pattern, report exact search, STOP; never extract a substitute spec from code.
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
| "Scope is obvious; skip ask the user directly"              | BLOCKING — confirm scope, mode, artifact set, and destination before reading canonical bodies. |
| "I'll trust the source link"                             | Verify it. A dangling link makes the derived navigation layer worse than none. |
| "Case count looks about right"                           | Count only from the selected canonical carrier and its explicit counting rule; otherwise mark unknown or omit it. |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

**IMPORTANT MUST ATTENTION** Derived aids remain regenerable and noncanonical; preserve canonical owners and profile-defined identifiers.
**IMPORTANT MUST ATTENTION** Read config + required refs, then confirm scope/mode/artifacts/destination before canonical source reads.
**IMPORTANT MUST ATTENTION** Use the explicit native profile when present; otherwise keep strict default TC/Section 8 obligations. Never invent a registry, path, identity, relationship, or coverage result.
**IMPORTANT MUST ATTENTION** Link every derived claim to a canonical source, obey destination policy, and verify every selected output before completion.

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
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
