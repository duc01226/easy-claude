---
name: workflow-spec-to-pbi
version: 2.0.0
description: '[Workflow] Use when converting canonical feature/spec artifacts in the project configured format into complete, prioritized, dependency-aware PBIs and stories.'
disable-model-invocation: true
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

> **Conditional step:** `/scenario` runs only when the selected decomposition/slice risks need adversarial replay, state, ownership, recovery, or evidence analysis.

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

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
