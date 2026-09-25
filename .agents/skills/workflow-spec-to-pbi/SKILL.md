---
name: workflow-spec-to-pbi
description: '[Workflow] Use when converting canonical feature/spec artifacts in the project configured format into complete, prioritized, dependency-aware PBIs and stories.'
disable-model-invocation: true
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

- `pbis/{date}-pbi-{slug}.md` for each generated PBI — each carries its rank/priority in frontmatter (written back by `$prioritize`).
- `backlog/spec-to-pbi-{date}-backlog.md` with priority order and dependency graph.
- `pbis/{slug}-mockup.html` for each UI PBI (header surfaces the PBI priority/rank).
- `design-specs/{date}-designspec-{slug}.md` for each UI PBI.
- One standalone HTML stakeholder deck from `$feature-presentation` whose Scope & backlog slide surfaces each PBI's priority/rank.
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

- Raw product vision without any Feature Spec -> use `$workflow-idea-to-spec` (then chain back here for the backlog).
- One informal idea -> use `$workflow-idea-to-pbi`.
- Spec creation/update only -> use `$workflow-code-to-spec` (from code) or `$workflow-idea-to-spec` (from an idea).
- Implementation after PBIs are ready -> use `$workflow-feature` or `$workflow-big-feature`.

## Protocol

### Canonical Input Profile

Before loading or mapping a spec, read `docs/project-config.json` fields `specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, and `specArtifacts` when declared, plus its configured template and local `spec-system-reference.md` / `spec-principles.md`. Use the declared native paths, section roles, identifier formats, ownership model, and evidence/test carriers. The README, eight-section, `TC-`, and numbered-section examples below describe only the framework fallback when no native profile or local contract exists. Default TC cases retain Business Intent / Invariant Guarded, user-visible GIVEN/WHEN/THEN, Evidence, CoveredBy, and status. Never synthesize a missing section or duplicate a case registry. Map intent, contracts, acceptance, test evidence, dependencies, and applicable UI intent from native roles. If a required owner/role or test-evidence mapping is unknown, stop that mapping as UNKNOWN and clarify; do not treat it as absent or green.

### 1. Activate

Run `$start-workflow workflow-spec-to-pbi` with the user's prompt as context.

### 2. Load Spec Context

Locate and read, per target capability:

Resolve the business spec root and canonical artifact path from project configuration and local artifact references; use the framework config loader's fallback only when neither declares a canonical root.

- The project-declared catalog/index when one exists — capability ownership and completeness.
- The canonical project spec — map its native-contract-defined roles: intent and acceptance to PBI scope/outcomes; contracts and lifecycle/permission/data rules to PBI constraints/domain impact; source identifiers and test/evidence carriers to traceable PBI test needs. Use the §1–§8 / `US-`/`BR-`/`TC-` mapping below only for the no-native-contract default.

- `large_idea_decomposition` from the source spec's profile/local-reference-declared slice-planning role and supporting evidence when the spec is large. If neither the native profile nor local artifact reference identifies a role that permits slice plans, mark the owner UNKNOWN and stop decomposition until the mapping is resolved; do not invent a section or move the block. If an explicit roadmap path is supplied, read it as context and verify its approval; do not create or update one. Run `$scenario` conditionally when slice risks require it.

If the canonical spec path or owner is missing or ambiguous, ask for its exact configured path before generating PBIs.

### 3. Freshness Gate

Run `$spec-index` in audit mode before PBI generation.

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

Run `$domain-analysis` when any spec item includes:

- New or changed entities, aggregates, value objects, or ownership boundaries
- State machines or lifecycle transitions
- Cross-service event ownership or synchronization
- Data migration or seed/test-data needs

Record domain findings in each affected PBI under `## Domain Impact`.

### 7. PBI Generation Loop

For each matrix row that needs a new PBI:

1. Run `$refine` to create the PBI artifact and pass its Releasable Outcome Gate.
2. Run `$artifact-review --type=pbi` and fail any technical-only, incomplete-journey, or missing UI-surface PBI.
3. Run `$story` to create vertical-slice stories.
4. Run `$artifact-review --type=story`.
5. Run `$pbi-challenge`.
6. Run `$dor-gate`.
7. Run `$pbi-mockup` only when UI is involved. The generated mockup MUST be a navigable multi-view mock app covering the full outcome flow, required components/states, and all stories; it MUST also surface the PBI's priority/rank (header badge) so the prototype carries the same priority info as the backlog.
8. Run `$design-spec` only when UI is involved (after `$pbi-mockup`) — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.

> **Spec-hub coupling (native interaction intent ↔ UI artifacts):** for UI PBIs, `$pbi-mockup` and `$design-spec` are companions to the interaction-intent owner declared by the native profile or local artifact contract and must stay linked where the project contract supports that carrier. Use §6's View Inventory / Navigation Map / Key UI States / per-story click-path and `design_spec:` / `mockup:` frontmatter only with the fallback profile. If the native spec has no interaction section or link carrier, preserve the separate UI design spec and flag the missing relationship; do not invent a numbered section. Keep deep visual fidelity in the mockup/`design-spec`. See the `SYNC:ui-intent-layer` block below for the common quality gate. Backend-only PBIs → skip `$pbi-mockup` + `$design-spec` and state that reason.

Each PBI MUST include:

- Native requirement, acceptance, rule, and scenario IDs carried from the source spec as the primary citation spine; do not translate or mint replacement IDs.
- Source spec references with `file:section` evidence (secondary, re-anchorable carrier — KEEP).
- GIVEN/WHEN/THEN acceptance criteria — tech-agnostic and observable (M1/M4).
- Story points and complexity.
- Dependencies table with `must-before`, `can-parallel`, `blocked-by`, or `independent`.
- Priority input data for `$prioritize`.
- Test specification needs, including categories mapped to the source's declared test/evidence carrier.
- Domain impact and enabling-task/dependency references; shared/foundation work is never emitted as a standalone technical-only PBI.
- Releasable Outcome Gate evidence: actor, observable outcome, entry-to-result journey, visible/persisted truth, applicable access/failure/recovery behavior, and explicit non-goals.
- For UI: page/view inventory, navigation map, common/domain/page component inventory, applicable states, and full-flow mock-app evidence; backend-only: explicit no-UI reason.

### 8. Cross-PBI Prioritization

After all PBI loops finish, run `$prioritize` once across the full generated set. `$prioritize` is NON-OPTIONAL whenever PBIs were generated — a backlog without priority is incomplete.

The backlog artifact MUST include:

- Rank and recommended implementation order.
- Dependency graph and first-do/blocked/defer groups.
- Required enabling work is attached to and ordered with the releasable PBIs it enables; never emit a standalone technical/foundation/setup/migration PBI.
- RICE or MoSCoW rationale.
- DoR status per PBI.
- Remaining open questions.

**PRIORITY PROPAGATION (MANDATORY):** `$prioritize` MUST write the resulting rank/priority back into EACH PBI's frontmatter (`priority:` + numeric rank), not only into the standalone backlog file. Every generated PBI carries its own priority so downstream consumers (`$pbi-mockup`, `$feature-presentation`) can surface it without re-deriving the ranking.

### 8.5 Near-Final Documentation Synchronization

Run `$docs-update` after `$prioritize` and before `$workflow-end`.

Purpose:

- Sync generated PBIs/stories/backlog outputs back into the canonical specs where applicable.
- Sync the canonical spec's configured test/evidence carriers with the generated PBI test needs.
- Verify canonical specs, configured test/evidence carriers, project-declared derived indexes/catalogs, and TDD/test docs do not drift after PBI generation.
- Record skipped sub-phases explicitly when no impacted docs exist.

### 8.6 Stakeholder Presentation

Run `$feature-presentation` after `$docs-update` and before `$workflow-end` — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.

The standalone HTML deck MUST:

- Synthesize the generated PBIs, stories, mockups, and design-specs into one stakeholder presentation.
- Surface each PBI's **priority/rank** in the Scope & backlog slide (ranked order + priority label per PBI card), reusing the priority written back into PBI frontmatter by `$prioritize` and the ranked backlog artifact.

### 9. Completion Criteria

Workflow can close only when:

- Every spec source item is represented in the coverage matrix.
- Every generated PBI has dependency and priority fields.
- `$prioritize` has run and written rank/priority back into EACH PBI's frontmatter (priority propagation), not just the standalone backlog.
- Every generated PBI passes the Releasable Outcome Gate; enabling/foundation work is attached to a releasable outcome and ordered before the behavior it enables, never emitted as a technical-only PBI.
- Domain-analysis findings are attached where domain changes are implied.
- The final backlog artifact ranks all PBIs and explains what to do first.
- `$docs-update` has run as the near-final sync gate, with native spec/test-evidence carriers and project-declared derived indexes either updated or explicitly marked unchanged.
- The generated PBIs carry the complete decomposition block and stable slice/dependency IDs when the spec is large; scenario proof is mapped to the appropriate PBI and native test-evidence ID or recorded in `deferred_work_owner`. No separate roadmap artifact is required.
- `$feature-presentation` has run, producing one standalone HTML deck whose Scope & backlog slide surfaces each PBI's priority/rank.

**IMPORTANT MANDATORY Steps:** $investigate -> $spec-index -> $domain-analysis -> $why-review -> $spec-clarify -> $scenario -> $plan -> $plan-review -> $plan-validate -> $refine -> $artifact-review --type=pbi -> $story -> $artifact-review --type=story -> $pbi-challenge -> $dor-gate -> $pbi-mockup -> $design-spec -> $prioritize -> $docs-update -> $feature-presentation -> $workflow-end -> $watzup

> **Conditional step:** `$scenario` runs only when the selected decomposition/slice risks need adversarial replay, state, ownership, recovery, or evidence analysis.

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

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
**IMPORTANT MUST ATTENTION Main steps:** `$investigate` → `$spec-index` (audit freshness) → `$domain-analysis` → `$why-review` → `$spec-clarify` → conditional `$scenario` → `$plan` → `$plan-review` → `$plan-validate` → `$refine` → `$artifact-review --type=pbi` → `$story` → `$artifact-review --type=story` → `$pbi-challenge` → `$dor-gate` → conditional `$pbi-mockup` → conditional `$design-spec` → `$prioritize` → `$docs-update` → `$feature-presentation` → `$workflow-end` → `$watzup`. **NEVER** skip coverage, releasable-outcome, priority-propagation, or synchronization gates.

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
- **MUST** run `$prioritize` once at the end across all generated PBIs, and write the resulting rank/priority back into EACH PBI's frontmatter (priority propagation) — not only the standalone backlog.
- **MUST**, for UI PBIs, run `$pbi-mockup` then `$design-spec` (both UI-conditional) — mirrors `workflow-idea-to-pbi` so the spec→pbi half is step-for-step IDENTICAL.
- **MUST** surface each PBI's priority/rank in the `$pbi-mockup` generated files (header badge) and in the `$feature-presentation` deck (Scope & backlog slide).
- **MUST** run `$docs-update` after `$prioritize` and before `$workflow-end` to keep specs, feature docs, and TDD/spec docs synchronized.
- **MUST** run `$feature-presentation` after `$docs-update` and before `$workflow-end` to synthesize a single standalone stakeholder deck.

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
