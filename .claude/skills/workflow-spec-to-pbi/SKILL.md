---
name: workflow-spec-to-pbi
version: 2.0.0
description: '[Workflow] Use when converting canonical feature/spec artifacts in the project configured format into complete, prioritized, dependency-aware PBIs and stories.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Convert canonical specs in the project's active artifact contract into a complete, prioritized, dependency-aware, sprint-ready PBI/story backlog with actor-facing outcomes, full UI flows, and evidence-backed review/sync gates.

**Summary:**

- **Main steps:** investigate/index → applicability/domain/rationale → clarify/scenario → plan/review/validate → refine → PBI/story/challenge/DoR → mock-up/design-spec → prioritize → docs/presentation/handoff.

- Load and audit the canonical specs under the active artifact contract, then evaluate the shared `isLargeIdea` rule and apply its profile/local-reference-declared decomposition owner or the explicit isolated-change branch before decomposition.
- Map native requirement, contract, test-evidence, domain-impact, and dependency intent to tech-agnostic PBIs and vertically sliced stories without minting replacement spec IDs.
- Review, challenge, validate readiness, prioritize across PBIs, synchronize docs, and produce the backlog plus stakeholder evidence.
- Every generated PBI MUST be one independently releasable actor-facing outcome with a complete entry-to-result journey; technical/foundation/migration/setup work is attached enabling work, never a standalone PBI.
- For UI PBIs, the mockup MUST be a navigable mock app containing every required page/view, navigation edge, common/domain/page component, applicable state, and full-flow demo; one isolated screen is a blocking failure.

**Workflow:** Load/index → freshness audit → coverage/decomposition/domain gates → plan/review/validate → refine/review stories and PBIs → DoR + UI artifacts → prioritize → docs-update → presentation → close.

**Key Rules:**

- **MUST ATTENTION** keep every PBI independently releasable and actor-facing; attach technical enabling work to a releasable outcome.
- **MUST ATTENTION** preserve logical-ID citations, source evidence, full UI flows, priority propagation, and the final docs/presentation gates.
- **NEVER** invent product scope, emit standalone technical PBIs, or skip freshness, review, validation, priority, or synchronization gates.

**Canonical input:** one project-owned canonical spec per capability under the configured business root. Resolve its native path and structure from `docs/project-config.json`, the configured template, and local spec references. The portable `{Bucket}/README.{Feature}.md`, tech-free 8-section Feature Spec is the fallback only when neither a native profile nor local artifact contract applies. Where implementation exists, code remains the technical source of truth; the canonical spec remains the requirements/behavior source. Do not create a second engineering-spec plane.

**Primary outputs:**

Artifact paths below are relative to the team-artifacts root — default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.

- `pbis/{date}-pbi-{slug}.md` for each generated PBI — each carries its rank/priority in frontmatter (written back by `/prioritize`).
- `backlog/spec-to-pbi-{date}-backlog.md` with priority order and dependency graph.
- `pbis/{slug}-mockup.html` for each UI PBI (header surfaces the PBI priority/rank).
- `design-specs/{date}-designspec-{slug}.md` for each UI PBI.
- One standalone HTML stakeholder deck from `/feature-presentation` whose Scope & backlog slide surfaces each PBI's priority/rank.
- `tmp/reports/spec-to-pbi-{date}-{bucket}.md` with coverage matrix and unresolved questions.

**Universal Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- **[BLOCKING] Tech-agnostic output:** PBI / backlog / report prose stays tech-agnostic per `spec-principles.md` §3, in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) — no framework/product/language/design-pattern names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- **[BLOCKING] Inherit M1-M5/M7 + source-ID carry:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Every generated PBI MUST satisfy M1-M5 and M7. **M7 — business-visibility:** a PBI is a business-tree artifact, so apply the demo test to each acceptance criterion's BODY — *"what would a stakeholder SEE change?"*; no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count, and NEVER derive a PBI's AC count from an architecture inventory. Judge the BODY, never the title or ID. **M1 governs vocabulary; M7 governs subject matter — a technical AC in impeccably tech-free prose satisfies M1 while violating M7**, and that gap is the most common way business specs rot. Carry the source profile's requirement, acceptance, rule, and scenario IDs as the PRIMARY citation spine, keeping its declared evidence carriers as secondary traceability. Do not translate native IDs into `FR-`/`BR-` or invent IDs. Generated acceptance criteria stay tech-agnostic and observable — one valid interpretation, named failure modes, no implementation details.
- **[BLOCKING] Decomposition scope chain:** read `.claude/skills/shared/product-roadmap-contract.md`. For a large spec, carry the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) through every generated PBI, story, mock-up, and the all-PBI presentation. For an isolated spec, omit the block and roadmap fields. An explicitly supplied roadmap is read-only context; only an explicit roadmap-deliverable request invokes the standalone writer.
- **[BLOCKING] Releasable PBI contract:** read `.claude/skills/shared/releasable-pbi-contract.md`. Every generated PBI must name an actor-facing outcome, complete the entry-to-result journey, and carry evidence. UI PBIs must carry the complete page/view, navigation, component, state, and mock-app flow surface. A blocked gate cannot advance by assumption.

## When to Use

- User wants to create all PBIs from an existing Feature Spec (or a bucket of them).
- User wants to split a very large Feature Spec into small sprint-ready PBIs.
- User wants a dependency-aware and priority-ranked backlog from the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides).
- User wants shared/foundation tasks identified before feature PBIs.

## When Not to Use

- Raw product vision without any Feature Spec -> use `/workflow-idea-to-spec` (then chain back here for the backlog).
- One informal idea -> use `/workflow-idea-to-pbi`.
- Spec creation/update only -> use `/workflow-code-to-spec` (from code) or `/workflow-idea-to-spec` (from an idea).
- Implementation after PBIs are ready -> use `/workflow-feature` or `/workflow-big-feature`.

## Protocol

### Canonical Input Profile

Before loading or mapping a spec, read `docs/project-config.json` fields `specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, and `specArtifacts` when declared, plus its configured template and local `spec-system-reference.md` / `spec-principles.md`. Use the declared native paths, section roles, identifier formats, ownership model, and evidence/test carriers. The README, eight-section, `TC-`, and numbered-section examples below describe only the framework fallback when no native profile or local contract exists. Default TC cases retain Business Intent / Invariant Guarded, user-visible GIVEN/WHEN/THEN, Evidence, CoveredBy, and status. Never synthesize a missing section or duplicate a case registry. Map intent, contracts, acceptance, test evidence, dependencies, and applicable UI intent from native roles. If a required owner/role or test-evidence mapping is unknown, stop that mapping as UNKNOWN and clarify; do not treat it as absent or green.

### 1. Activate

Run `/start-workflow workflow-spec-to-pbi` with the user's prompt as context.

### 2. Load Spec Context

Locate and read, per target capability:

Resolve the business spec root and canonical artifact path from project configuration and local artifact references; use the framework config loader's fallback only when neither declares a canonical root.

- The project-declared catalog/index when one exists — capability ownership and completeness.
- The canonical project spec — map its native-contract-defined roles: intent and acceptance to PBI scope/outcomes; contracts and lifecycle/permission/data rules to PBI constraints/domain impact; source identifiers and test/evidence carriers to traceable PBI test needs. Use the §1–§8 / `US-`/`BR-`/`TC-` mapping below only for the no-native-contract default.

- `large_idea_decomposition` from the source spec's profile/local-reference-declared slice-planning role and supporting evidence when the spec is large. If neither the native profile nor local artifact reference identifies a role that permits slice plans, mark the owner UNKNOWN and stop decomposition until the mapping is resolved; do not invent a section or move the block. If an explicit roadmap path is supplied, read it as context and verify its approval; do not create or update one. Run `/scenario` conditionally when slice risks require it.

If the canonical spec path or owner is missing or ambiguous, ask for its exact configured path before generating PBIs.

### 3. Freshness Gate

Run `/spec-index` in audit mode before PBI generation.

- If stale behavior is found, run/update the impacted spec sections before generating PBIs.
- If only structural/doc formatting is stale, record the risk and continue.
- If critical domain/API/business-rule sections are stale, stop and ask whether to update specs first.

### 4. Coverage Matrix

Create a matrix with one row per independently deliverable item:

| Spec Source      | Capability     | Feature/Operation | Domain Impact             | Shared Dependency | PBI Type                                      | Status  |
| ---------------- | -------------- | ----------------- | ------------------------- | ----------------- | --------------------------------------------- | ------- |
| `{Feature §sec}` | `{capability}` | `{feature}`       | entity/state/event/API/UI | yes/no            | releasable feature / enabling task / existing reference / out-of-scope | planned |

Every source feature/operation must map to exactly one of:

- Generated releasable PBI
- Enabling task attached to a releasable PBI (not a standalone PBI)
- Existing releasable PBI reference
- Explicit out-of-scope decision with reason

### 5. Large Spec Decomposition

Apply these scale rules before creating PBIs:

| Scope                      | Required Breakdown                                                    |
| -------------------------- | --------------------------------------------------------------------- |
| 1-3 capabilities           | Process inline with one task per capability and feature group         |
| 4-10 capabilities          | Split by capability, then feature/operation group                     |
| 10+ capabilities           | Incremental capability-group batches with coverage matrix checkpoints |
| Any PBI > 8 story points   | Split with SPIDR until each PBI is <= 8 story points                  |
| Cross-cutting prerequisite | Attach enabling work to the dependent releasable PBI, or define a separate actor-facing releasable outcome; never emit a technical-only PBI |

### 6. Domain Analysis Gate

Run `/domain-analysis` when any spec item includes:

- New or changed entities, aggregates, value objects, or ownership boundaries
- State machines or lifecycle transitions
- Cross-service event ownership or synchronization
- Data migration or seed/test-data needs

Record domain findings in each affected PBI under `## Domain Impact`.

### 7. PBI Generation Loop

For each matrix row that needs a new PBI:

1. Run `/refine` to create the PBI artifact and pass its Releasable Outcome Gate.
2. Run `/artifact-review --type=pbi` and fail any technical-only, incomplete-journey, or missing UI-surface PBI.
3. Run `/story` to create vertical-slice stories.
4. Run `/artifact-review --type=story`.
5. Run `/pbi-challenge`.
6. Run `/dor-gate`.
7. Run `/pbi-mockup` only when UI is involved. The generated mockup MUST be a navigable multi-view mock app covering the full outcome flow, required components/states, and all stories; it MUST also surface the PBI's priority/rank (header badge) so the prototype carries the same priority info as the backlog.
8. Run `/design-spec` only when UI is involved (after `/pbi-mockup`) — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.

> **Spec-hub coupling (native interaction intent ↔ UI artifacts):** for UI PBIs, `/pbi-mockup` and `/design-spec` are companions to the interaction-intent owner declared by the native profile or local artifact contract and must stay linked where the project contract supports that carrier. Use §6's View Inventory / Navigation Map / Key UI States / per-story click-path and `design_spec:` / `mockup:` frontmatter only with the fallback profile. If the native spec has no interaction section or link carrier, preserve the separate UI design spec and flag the missing relationship; do not invent a numbered section. Keep deep visual fidelity in the mockup/`design-spec`. See the `SYNC:ui-intent-layer` block below for the common quality gate. Backend-only PBIs → skip `/pbi-mockup` + `/design-spec` and state that reason.

Each PBI MUST include:

- Native requirement, acceptance, rule, and scenario IDs carried from the source spec as the primary citation spine; do not translate or mint replacement IDs.
- Source spec references with `file:section` evidence (secondary, re-anchorable carrier — KEEP).
- GIVEN/WHEN/THEN acceptance criteria — tech-agnostic and observable (M1/M4).
- Story points and complexity.
- Dependencies table with `must-before`, `can-parallel`, `blocked-by`, or `independent`.
- Priority input data for `/prioritize`.
- Test specification needs, including categories mapped to the source's declared test/evidence carrier.
- Domain impact and enabling-task/dependency references; shared/foundation work is never emitted as a standalone technical-only PBI.
- Releasable Outcome Gate evidence: actor, observable outcome, entry-to-result journey, visible/persisted truth, applicable access/failure/recovery behavior, and explicit non-goals.
- For UI: page/view inventory, navigation map, common/domain/page component inventory, applicable states, and full-flow mock-app evidence; backend-only: explicit no-UI reason.

### 8. Cross-PBI Prioritization

After all PBI loops finish, run `/prioritize` once across the full generated set. `/prioritize` is NON-OPTIONAL whenever PBIs were generated — a backlog without priority is incomplete.

The backlog artifact MUST include:

- Rank and recommended implementation order.
- Dependency graph and first-do/blocked/defer groups.
- Required enabling work is attached to and ordered with the releasable PBIs it enables; never emit a standalone technical/foundation/setup/migration PBI.
- RICE or MoSCoW rationale.
- DoR status per PBI.
- Remaining open questions.

**PRIORITY PROPAGATION (MANDATORY):** `/prioritize` MUST write the resulting rank/priority back into EACH PBI's frontmatter (`priority:` + numeric rank), not only into the standalone backlog file. Every generated PBI carries its own priority so downstream consumers (`/pbi-mockup`, `/feature-presentation`) can surface it without re-deriving the ranking.

### 8.5 Near-Final Documentation Synchronization

Run `/docs-update` after `/prioritize` and before `/workflow-end`.

Purpose:

- Sync generated PBIs/stories/backlog outputs back into the canonical specs where applicable.
- Sync the canonical spec's configured test/evidence carriers with the generated PBI test needs.
- Verify canonical specs, configured test/evidence carriers, project-declared derived indexes/catalogs, and TDD/test docs do not drift after PBI generation.
- Record skipped sub-phases explicitly when no impacted docs exist.

### 8.6 Stakeholder Presentation

Run `/feature-presentation` after `/docs-update` and before `/workflow-end` — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.

The standalone HTML deck MUST:

- Synthesize the generated PBIs, stories, mockups, and design-specs into one stakeholder presentation.
- Surface each PBI's **priority/rank** in the Scope & backlog slide (ranked order + priority label per PBI card), reusing the priority written back into PBI frontmatter by `/prioritize` and the ranked backlog artifact.

### 9. Completion Criteria

Workflow can close only when:

- Every spec source item is represented in the coverage matrix.
- Every generated PBI has dependency and priority fields.
- `/prioritize` has run and written rank/priority back into EACH PBI's frontmatter (priority propagation), not just the standalone backlog.
- Every generated PBI passes the Releasable Outcome Gate; enabling/foundation work is attached to a releasable outcome and ordered before the behavior it enables, never emitted as a technical-only PBI.
- Domain-analysis findings are attached where domain changes are implied.
- The final backlog artifact ranks all PBIs and explains what to do first.
- `/docs-update` has run as the near-final sync gate, with native spec/test-evidence carriers and project-declared derived indexes either updated or explicitly marked unchanged.
- The generated PBIs carry the complete decomposition block and stable slice/dependency IDs when the spec is large; scenario proof is mapped to the appropriate PBI and native test-evidence ID or recorded in `deferred_work_owner`. No separate roadmap artifact is required.
- `/feature-presentation` has run, producing one standalone HTML deck whose Scope & backlog slide surfaces each PBI's priority/rank.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-index -> /domain-analysis -> /why-review -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /refine -> /artifact-review --type=pbi -> /story -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /design-spec -> /prioritize -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

> **[BLOCKING]** Each selected step MUST invoke its Skill tool. `/scenario` is conditional: run it only when the selected decomposition/slice risks need adversarial replay, state, ownership, recovery, or evidence analysis; otherwise mark the step skipped with evidence and an explicit reason. Marking a selected workflow step completed without skill invocation is a workflow violation.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> **Native-first resolution.** A native contract may be declared by config or local references. Before authoring, resolve the configured profile's intent/evidence section roles, logical IDs, and carrier from `docs/project-config.json` (`specArtifacts`) and the required local references, and map every item below onto them. An unresolved owner, role, ID, carrier, or companion link stays `UNKNOWN`/`BLOCKED` — never guessed.
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable states** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story action flows** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the configured profile owns.
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked companion design artifact. Record that artifact's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and action flows. Technology detail belongs in the companion design artifact, never here.
>
> **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** cross-reference each action flow to the default logical IDs `US-`/`OP-`/`BR-`, and record the companion artifact in the default `design_spec:`/`mockup:` frontmatter keys.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

<!-- SYNC:session-goal-ledger -->

> **Session Goal Ledger** — Never lose the user's original request or any later prompt, however long the session runs. Hook-independent: binds every host; a prompt-ledger hook is only an accelerator.
>
> 1. **Pin before acting.** Before the first tool call, write `Original goal: <user's request, verbatim or faithfully condensed>` and keep it as the first task-list item. For workflow or plan work, copy it verbatim into the Goal Contract `## Original Request`.
> 2. **Track every prompt.** Keep `User prompts this session: P1…Pn` — one line per user prompt or input, marked `extends` / `narrows` / `changes` / `answers`. A prompt that changes direction updates the goal explicitly — never silently.
> 3. **Re-anchor.** Re-read the original goal and the prompt list at every workflow step, before delegating (the sub-agent brief carries the verbatim goal), and after compaction, resume, or a `[[prompt-ledger@…]]` reminder. When `tmp/prompt-ledger/<session>/ledger.md` exists it is the durable record — read it after compaction.
> 4. **Verify before done.** Map the final result to the original goal and every prompt: `P# → done | deferred (reason) | not applicable`. An unaddressed prompt blocks completion.
> 5. **Security.** NEVER copy secrets, tokens, or credentials into goal lines, task lists, briefs, or reports — redact them.
>
> **Blocked until:** original goal pinned · prompt list current · final result mapped to every prompt.

<!-- /SYNC:session-goal-ledger -->

<!-- SYNC:workflow-registry-binding -->

> **Workflow ⇄ Registry Two-Way Binding** — a workflow is defined in TWO places that MUST agree: the machine registry `.claude/workflows.json` → `workflows.<workflow-id>`, and this skill's `SKILL.md`. Neither is complete alone. Read BOTH before executing, in this order.
>
> **1. Registry → skill (what the registry owns).** Before the first step, read `.claude/workflows.json` → `workflows.<workflow-id>` and treat it as CANONICAL for:
>
> | Registry field | Governs | Rule |
> | --- | --- | --- |
> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |
> | `sequence[].applicability` | every conditional step | `when` is the ONLY run condition; on skip, record `skipReason` VERBATIM as the step's evidence. |
> | `sequence[].args` | step flags | Pass exactly as declared. |
> | `parallelGroups` | all-return barriers | Spawn all members in ONE message; advance only after EVERY member returns. |
> | `stepMeta` | inline vs sub-agent, context budget | Overrides the skill's own front matter. |
> | `preActions.injectContext` | mandatory pre-read context | Apply before step 1. |
> | `variants` / `defaultMode` | mode selection | A variant is a COMPLETE sequence; it inherits nothing from the base. |
>
> **2. Skill → registry (what this SKILL.md owns).** The registry declares WHICH steps run in WHAT order; this SKILL.md declares HOW each step executes — protocols, gates, loops, evidence bars, escalation. Each `sequence[].skill` resolves to `.claude/skills/<skill>/SKILL.md`; the workflow's `preActions.readFiles` names this file as the reverse pointer. Read a step's own SKILL.md before running it.
>
> **3. Precedence on conflict.** Registry WINS on step identity, order, args, applicability, barriers and execution mode. SKILL.md WINS on how to perform a step and on the quality bar it must clear. A genuine contradiction between the two — a step in one and not the other, a different order, or an applicability note whose meaning differs — is DRIFT: note the mismatch in your evidence, continue under the precedence above, and report it when the run ends. NEVER silently pick a side, and NEVER edit one side to match without saying so.
>
> **4. Keep both sides equal when editing either.** Changing a sequence, an occurrence ID, or an `applicability` note in `workflows.json` REQUIRES the matching update in this SKILL.md, and vice versa. Specifically: the `**IMPORTANT MANDATORY Steps:**` line MUST remain a clean `->` chain equal to the registry `sequence` (it is parsed, not prose — annotations there break the gate), any conditional step's note here MUST carry the registry's `skipReason` verbatim, and the step-task table's `Conditional?` column MUST match the presence of `applicability`. After editing either side, re-mirror with `/sync-codex` (`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`).
>
> **Blocked until:** the registry entry for this workflow has been read, its `sequence` reproduced 1:1 into the task list, and every `applicability` condition evaluated with its verdict recorded.

<!-- /SYNC:workflow-registry-binding -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert canonical project specs under their configured artifact contract into a complete, prioritized, dependency-aware, sprint-ready PBI/story backlog with actor-facing outcomes, full UI flows, and evidence-backed review/sync gates. The portable 8-section/README/TC contract applies only when neither a native profile nor local artifact contract exists.
**IMPORTANT MUST ATTENTION Main steps:** `/investigate` → `/spec-index` (audit freshness) → `/domain-analysis` → `/why-review` → `/spec-clarify` → conditional `/scenario` → `/plan` → `/plan-review` → `/plan-validate` → `/refine` → `/artifact-review --type=pbi` → `/story` → `/artifact-review --type=story` → `/pbi-challenge` → `/dor-gate` → conditional `/pbi-mockup` → conditional `/design-spec` → `/prioritize` → `/docs-update` → `/feature-presentation` → `/workflow-end` → `/watzup`. **NEVER** skip coverage, releasable-outcome, priority-propagation, or synchronization gates.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases under workflow rows; link parent when nested.
- **Critical Thinking:** Apply critical/sequential thinking; trace every claim, confidence >80%.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Append findings to report file per file; never hold in memory.
- **Subagent Return Contract:** Sub-agents return summary plus report path only, no transcripts.

- **MUST** use the project's canonical specs under their active artifact contract as input; do not invent unrelated opportunities.
- **MUST** decompose large canonical specs into small PBIs before story generation.
- **MUST** include dependency, priority, domain impact, and shared-task details.
- **MUST** apply `.claude/skills/shared/releasable-pbi-contract.md`: no standalone technical/foundation/migration/setup PBI; enabling work belongs under a releasable outcome.
- **MUST**, for UI PBIs, carry the complete page/view inventory, navigation map, common/domain/page components, applicable states, and a navigable full-flow mock-app outcome; one isolated screen is a FAIL.
- **MUST** write artifacts incrementally after each capability/feature.
- **MUST** run `/prioritize` once at the end across all generated PBIs, and write the resulting rank/priority back into EACH PBI's frontmatter (priority propagation) — not only the standalone backlog.
- **MUST**, for UI PBIs, run `/pbi-mockup` then `/design-spec` (both UI-conditional) — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.
- **MUST** surface each PBI's priority/rank in the `/pbi-mockup` generated files (header badge) and in the `/feature-presentation` deck (Scope & backlog slide).
- **MUST** run `/docs-update` after `/prioritize` and before `/workflow-end` to keep specs, feature docs, and TDD/spec docs synchronized.
- **MUST** run `/feature-presentation` after `/docs-update` and before `/workflow-end` to synthesize a single standalone stakeholder deck.
