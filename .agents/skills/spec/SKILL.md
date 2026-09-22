---
name: spec
description: '[Documentation] Use when authoring, auditing, amending, test-speccing, or reconciling a canonical spec. Resolve the project artifact profile first; the 8-section/TC format is the strict default.'
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

> **Portability:** the Feature Spec root is CONFIGURED, not fixed — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (rationale: `docs/adr/0003-config-driven-doc-and-spec-roots.md`). The spec template defaults to `detailed-feature-spec-template.md` under the templates root (default `docs/templates/`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path) unless `workflowPatterns.featureDocTemplate` points to another template.

**[IMPORTANT] task tracking** — Break ALL work into small tasks BEFORE starting. For simple tasks, ask user whether to skip.

**Goal:** Own the spec lifecycle across seven modes — author the canonical project artifact, capture testable scenario intent in its declared carrier, and reconcile cases to tests and code. **MUST ATTENTION** resolve the project profile before applying a format. The eight-section/TC model remains the strict default; a declared native profile owns its existing identifiers, sections, carriers, and cardinality without a duplicate registry. Every profile keeps the applicable shared semantic, evidence, execution, and review gates.

**Summary:**

- **Main steps:** **MUST ATTENTION** resolve mode → resolve artifact root/type/profile from project config and references → read the matching author/tests/sync body → run applicability/decomposition gate → track and execute that profile's procedure → verify evidence and execution status → cross-service check → reconcile without replacing canonical owner content.

**Workflow:**

- **Purpose:** one skill owns `draft | init | update | audit | amend | tests | sync`, selecting the canonical artifact profile before applying representation-specific rules.
- **Main steps (every run):** (1) **MUST ATTENTION** resolve mode FIRST — explicit `[mode=<x>]` wins, else infer from request + repo state, ambiguous → ask the user directly before any mutating mode; (2) resolve the project root, artifact type, profile, owner, and configured identifiers/carriers; (3) read required project references and the matching `references/{author,tests,sync}.md` body — NEVER run a mode from memory; (4) classify large-idea applicability; (5) task tracking-break the work before starting; (6) execute the selected profile's procedure and semantic gates; (7) cross-service check before concluding.
- **Semantic floor:** **MUST ATTENTION** enforce applicable M1-M7, evidence, testability, property/boundary, preservation, actual-execution, operation-authority, and drift gates for every profile. A representation change never waives these obligations. — why: traceable intent must survive changes in format or test topology.
- **Strict default representation:** **MUST ATTENTION** use the tech-free eight-section Feature Spec and `TC-{FEATURE}-{NNN}` registry in Section 8 only when no native case profile is explicitly declared; preserve its canonical source, `[Source:]` evidence, and no-overwrite rules.
- **Native representation:** **MUST ATTENTION** use the project's declared section roles, logical IDs, owner rule, case carriers, and cardinality. For executable coverage, link each owner/scenario/variant to its executor, inspected assertion, observed runner result, source evidence, and reconciliation state. Use a manual-QC path only when the profile explicitly authorizes it, with its approved procedure and observed evidence; never label that result runner-executed. Never add a TC/Section 8 side registry to mirror native cases.
- **Derived outputs:** `INDEX.md`/ERDs remain derived; flag required refresh, but never trigger `$spec-index` here. — why: derived views cannot become competing sources of truth.
- **[BLOCKING]** Apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before authoring. A true signal requires the complete `large_idea_decomposition` block with stable outcome slices, dependency order, non-goals, risks/evidence, and deferred-work owners; an all-false idea omits the block and roadmap/milestone placeholders. Only an explicit roadmap request uses the standalone roadmap branch; unresolved product terms or missing decomposition owners stop authoring. — why: a technically complete spec can still encode the wrong product boundary.

**Key Rules:**

- Resolve the mode and artifact profile and read its matching reference body before any mutation; ambiguous mode → ask the user directly, invalid/conflicting profile → `UNKNOWN`/`BLOCKED`.
- Keep the canonical owner and identifiers authoritative; never create duplicate case registries or overwrite existing owner content during `update`.
- Apply the shared AI-SDD/large-idea gates, cross-service check, evidence rules, and review/sync boundaries before concluding.

## Artifact Root and Profile Resolution (before the mode body)

**MUST ATTENTION** resolve location and format separately. A configured root or template changes where the artifact lives; it does not by itself change the case model.

1. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` (using configured roots when present). For the selected mode, also read the relevant spec system, principles, format, and workflow-cycle references named by the docs index.
2. Classify the target as a hand-authored business/canonical artifact, a generated technical artifact, or another locally governed type. Resolve `specRoots.business.path`, `specRoots.technical.path`, authorship, and policy from config and the owner references. A generated/exempt technical root remains single-writer; this skill does not hand-edit it.
3. Resolve explicit owner/supersession precedence documented by the project references before classifying them as conflicting. Then select exactly one case representation:

| Selection | Evidence | Required behavior |
| --- | --- | --- |
| **Strict default** | No explicit native case contract exists in config or the required project references. | Use `shared/tc-format.md` and the eight-section/Section 8 TC rules below. |
| **Native profile** | Config or required project references explicitly name the canonical owner, section/field roles, logical IDs, case carriers, or case-to-test relation that differs from the strict default. | Use those declarations for every mode. Apply the native branch in the loaded mode body; do not create TC IDs, Section 8, or a parallel case registry unless that is already the declared owner format. |
| **Unresolved** | Config is invalid/incomplete, required references disagree, or the canonical owner/carrier/cardinality cannot be resolved safely. | Report the conflict or missing fact as `UNKNOWN`/`BLOCKED`. Do not silently fall back to TC, call the gap N/A, write an alternate registry, or claim coverage. |

4. A native profile may come from explicit project-reference documentation when config has no profile field. A changed root, template, or filename alone is not enough to infer a different case model. If the docs declare a native identifier but do not locate its canonical owner/carrier, or if a documented conflict has no explicit resolution, the profile is unresolved, not default.
5. Preserve semantic obligations across all selections. For executable coverage, map each required owner/scenario/variant identity to its actual executor, inspected assertion, and observed runner result. Accept manual-QC proof only when the selected profile explicitly authorizes it and its approved procedure and observed evidence are recorded; do not label it runner-executed. An ID match or source mapping alone is not execution proof. **NEVER** report `PASS`/executed without observing the result of the profile's selected execution method; otherwise preserve `mapped/unverified`, uncovered, or `UNKNOWN` as appropriate.

> **Native-profile precedence:** The explicit native branch in the matching mode body governs representation. All TC, Section 8, decade-numbering, `CoveredBy`, and default one-to-many instructions later in this skill or its reference files describe the strict default only. Their semantic protections still apply through the native profile's fields and identity rules; map default section numbers (including the UI-intent and drift examples) to declared native roles without adding default headings or a second owner.

## Applicability and Decomposition Gate (before any authoring or mutation)

Read `.claude/skills/shared/product-roadmap-contract.md` before creating, updating, or amending a Feature Spec. Apply the four-operand `isLargeIdea` rule to every idea-sourced request and preserve any existing branch metadata on audit/tests/sync.

1. If any signal is true, require one complete `large_idea_decomposition` block in the owning Feature Spec: non-empty stable `outcome_slices`, ordered `dependencies_order`, explicit `non_goals`, `risks_evidence` with owners/statuses, and `deferred_work_owner`. The spec owns the business decomposition; stories, PBIs, scenarios, plans, mock-ups, and presentations consume it read-only.
2. If all signals are false, author the ordinary single-capability spec without a roadmap path, milestone ID, scope brief, or empty decomposition placeholder. Preserve one actor-facing outcome, in-scope behavior, non-goals, lifecycle terms, source-of-truth state, persistence expectations, and evidence directly in the spec.
3. If the user explicitly requests a product roadmap or selects a milestone from an explicitly supplied roadmap, use the explicit roadmap branch. Resolve and verify the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), the owner-approved milestone, and its scope brief; route missing approval to `$product-roadmap`. Reading a supplied roadmap never authorizes creating/updating one.
4. For a framework/library change, use the `FRAMEWORK-LIBRARY` technical branch. For an isolated brownfield change, use `EXEMPT`. Neither branch requires a product roadmap or milestone.
5. For `audit`, `tests`, and `sync`, inherit and verify the existing branch metadata; never invent a milestone, silently broaden the spec, or drop a decomposition field.

This gate is product-level and does not relax applicable intent-quality rules in the selected profile. Explicit roadmap references belong only in the explicit branch; embedded decomposition fields belong in the owning artifact; business outcomes, definitions, and boundaries belong in the canonical sections.

> **Renamed:** formerly `/feature-spec` (and earlier `/feature-docs`); the former `/spec-tests` skill is now folded in as `mode=tests` / `mode=sync`. Those names no longer resolve as slash commands — use `$spec` with the matching mode.

### Modes (resolve mode FIRST — BLOCKING)

| Mode     | Use when…                                                                                                                                       | Body                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `draft`  | Author a provisional artifact from an idea/requirement/prompt — **no code yet**; evidence and provisional fields follow the selected profile | `references/author.md` |
| `init`   | No canonical owner exists under the configured business root; author the selected profile's artifact from source | `references/author.md` |
| `update` | Docs exist + code changed — section-impact-mapped updates                                                                                       | `references/author.md` |
| `audit`  | `--audit` flag or user asks — staleness report per section (never mutates docs)                                                                 | `references/author.md` |
| `amend`  | `[mode=amend]` from the bugfix workflow — minimal owner-scoped intent/contract/scenario touch under the selected profile | `references/author.md` |
| `tests`  | Generate or update canonical test scenarios under the selected profile (strict default: Section 8 TCs) | `references/tests.md`  |
| `sync`   | Reconcile canonical owner/cases ↔ executing test code using the selected profile (forward/reverse/harvest/orphan/staleness) | `references/sync.md`   |

**Mode resolution (do this before any work):**

1. Parse the mode from the invocation: explicit `[mode=<x>]` arg wins; else infer from request + repo state ("from idea/requirements/prompt", "draft spec", "no code yet" → `draft`; no canonical owner under the configured business root AND code exists to source from → `init`; docs exist + diff → `update`; "audit/stale" → `audit`; bugfix caller → `amend`; "write/update test specs" or the selected profile's case terms → `tests`; "sync tests" or reconcile canonical cases with tests → `sync`). **`draft` vs `init`:** both author a new artifact, but `draft` sources from idea/requirement text and records evidence/provisional state using the selected profile, while `init` sources from existing code. "No docs" alone does NOT imply `init` — check whether code exists to source from. Never overwrite existing owner content during `update`.
2. If ambiguous, present the detected mode by asking the user directly before proceeding — NEVER auto-start a mutating mode.
3. **Read the matching `references/` body** — it is the single source of truth for that mode's procedure, gates, and output contract. Do not run a mode from memory.

**Key Rules (all modes):**

- **[BLOCKING]** Read `docs/project-reference/spec-principles.md` (project-reference docs root default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — repo-local prose/evidence rules (§3 prose scope + §3.2 banned prose-token list). For the AI-implementability criteria + tech-agnostic mandates, read `.claude/skills/shared/sdd-artifact-contract.md` ("AI-Implementability Gate" + mandates M1-M7) — those are the canonical authority, not the local stub.
- **[BLOCKING]** The selected profile's canonical owner, identifiers, evidence fields, and carriers are authoritative. Under the strict default only, each TC uses the `[Source: namespace/service/id]` carrier; `mode=draft` may use its documented provisional state until code exists. A native profile uses its declared evidence form and never gains a duplicate TC registry.
- **[BLOCKING]** Under the strict default, Section 8 is the canonical TC registry; `tests` mode owns generation, `sync` reconciles it, and it MUST NOT be overwritten during author modes or update. Under a native profile, update only the declared owner/carriers and preserve owner/scenario/variant identities.
- Authored artifacts MUST satisfy applicable M1-M7 and the selected profile's section/field contract. The strict default uses the tech-free eight-section template; a native profile follows its declared structure and evidence carriers without importing the default template.
- **[BLOCKING]** `.claude/skills/shared/sdd-artifact-contract.md` defines the semantic floor for every profile. `.claude/skills/shared/tc-format.md` supplies representation-specific rules only when the strict default TC profile is active.

> `docs/project-reference/feature-spec-reference.md` — project-specific Feature Spec patterns (read directly when relevant). `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync. Both filenames resolve inside the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

### Strict Default 8-Section Feature Spec Rules (canonical reference)

> Apply this section only after profile resolution selects the strict default. A native profile uses the matching native branch in the loaded mode body; it does not inherit this template's sections or case IDs.

**Format:** Tech-free 8-section Feature Spec. Activate the `$spec` skill before editing.

**Read first:** `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, and `docs/project-reference/spec-principles.md`. For behavior/public-contract changes, also read `docs/project-reference/workflow-spec-test-code-cycle-reference.md`. (Those filenames resolve inside the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.)

**8 sections (exact order):** 1. Overview · 2. Glossary · 3. User Stories & Acceptance Criteria · 4. Business Rules · 5. Domain Model · 6. Process Flows & Interaction Surface · 7. Permissions & Roles · 8. Test Specifications. No technical sections (Commands/Events/API/Cross-Service/Performance/Troubleshooting) — code is the technical source of truth.

> §6 carries a tech-agnostic interaction surface (views/nav/observable states/per-story click-paths) per the `SYNC:ui-intent-layer` block this skill carries; backend-only specs state the skip reason explicitly. This does NOT contradict "No technical sections" — the interaction surface is tech-agnostic INTENT (UX roles, information, states, flows), not a technical "UI Pages" section; M1-clean keeps it free of framework/route/CSS/component-class names.

**Mandatory:**

- §1-7 prose is STRICTLY tech-free — no framework/product/language/persistence/messaging/auth names (banned tokens → `spec-principles.md` §3.2). Technical identifiers live ONLY in evidence carriers.
- Section 5 (Domain Model): Mermaid ERD + `[Source: component/{service}/{id}]` abstract anchor per entity (cannot be omitted)
- Section 4 (Business Rules): `[Source: rule/{service}/{id}]` abstract anchor per rule group
- Section 8 (Test Specifications): canonical business TC source — TC-{FEATURE}-{NNN} IDs, each carrying a hidden `[Source: namespace/service/id]` carrier + a `CoveredBy:` field. Legacy `IntegrationTest:` fields are accepted only as migration input.

**Rules:**

- TC IDs live in Section 8 only — never authored elsewhere in the Feature Spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)
- Section 8 authored via `$spec [mode=tests]`; `$spec [mode=init]` populates it only during initial authoring
- No line-count cap applies to Feature Specs. Split the capability only when TCs>40 or distinct module-level capabilities emerge.

### Applicable M1-M7 Compliance (BLOCKING — apply through the selected profile)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for the full BLOCKING criteria. Apply them to the target artifact tree and its configured section/carrier roles. The default-specific §1–8 wording below applies only to the strict default profile; native logical IDs, fields, and section roles carry the same applicable obligations.

**M7 — Business-visibility.** Where M7 applies, test the case BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. A `When` that is an invocation or a `Then` asserting an internal-only state fails the business-visibility gate. Apply the same gate through the selected profile's scenario/case fields; judge the BODY, never the title or ID.

> **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7.
>
> M6 is absent from this list by design: it binds the REVIEWER (a review that passes an M1-M5/M7 violation is itself defective), never the artifact. The artifact-facing set reads **M1-M5 and M7**.

---

## Derived-Index Delegation

This skill owns the canonical artifact and cases selected by the active profile. Indexes and cross-capability ERDs remain derived projections regenerated by `$spec-index` — never a source of truth, and never authored here. In `update` mode, flag a required derived-artifact refresh but do NOT trigger `$spec-index` directly (separation of concerns).

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use ask the user directly to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — spec-driven with tests by default; run the canonical `workflow-feature` sequence from `.claude/workflows.json` (spec + test specs before `plan-execute`, spec/test/code sync and review gates after it) — never a copied step list.
> 2. **Execute `$spec` directly** — run this skill standalone in the resolved mode

---

## Next Steps

**[BLOCKING]** After completing, use ask the user directly to present options. Do NOT skip — user decides:

- **"$spec [mode=tests] (Recommended)"** — Generate/update the selected profile's canonical test scenarios (strict default: Section 8 TCs)
- **"$spec [mode=sync]"** — Reconcile the selected profile's canonical cases with executing test code
- **"$artifact-review --type=spec-tests"** — Review scenario intent, assertion-backed coverage, and profile-specific completeness
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                                | Relationship                                                                                                           | When to Call                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `$spec-index`                        | **Derived consumer** — assembles a regenerable navigation index/ERD FROM canonical specs (never a source of truth) | AFTER canonical specs exist — refresh the declared index/ERD over the owner artifacts |
| `$artifact-review --type=spec-tests` | **Reviewer** — audits scenario intent and coverage under the selected profile                                         | After `spec [mode=tests]`, to validate completeness and assertion-backed mappings                      |
| `$integration-test`                  | **End consumer** — generates or updates executable tests from the selected profile's canonical scenarios             | After `spec [mode=tests]`, when code generation is the configured next step                             |
| `$docs-update`                       | **Orchestrator** — calls this skill as Phase 2                                                                         | Run `$docs-update` for full chain sync; it calls `$spec` internally                                    |
| `$changes-review`                    | **Trigger** — detects feature doc staleness                                                                            | Calls `$docs-update` when a business doc is stale relative to code changes                             |

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Profile adapter:** For a native profile, carry this UI intent in the declared native intent/acceptance section and keep its existing identifiers; do not add the strict-default section number or a parallel UI-spec artifact.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

> **Profile adapter:** The synchronized examples below use default section/ID names. Under a native profile, load the configured owner and aliases; the package, disagreement, and re-review gates still apply.

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior. Resolve `docs/project-config.json → specArtifacts`: use its configured `sections.intent/contracts/evidence`, business owner path, and test-carrier dialects only when valid; use the strict default Feature Spec sections (§3 ACs / §4 BRs / §5 invariants / §8 TCs) only when the profile is absent. A malformed or unsupported declaration blocks and never falls back. Load the tests and production code with the owner artifact; a missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a hard rule in the configured `contracts` role, or strict-default §4/§5 invariant, with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT; with a native profile, check owner + case/scenario ID + optional variant against the actual executor and inspected assertion, not an ID match alone.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added to the configured `intent` or `contracts` section and represented in its `evidence` section with a guarding native case/test; without a profile, use strict-default §3/§4/§8 and TC. This is the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

> **Profile adapter:** Resolve each default section/TC reference below through the active profile's aliases and case carrier. Preserve the same drift classes and harvest gates without creating a TC registry.

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever behavior diverges from a canonical owner artifact under the configured business root (`specRoots.business.path`, default `docs/specs`), you MUST NOT silently pick a side. Resolve and validate `specArtifacts` from `docs/project-config.json`: when valid, use its `intent/contracts/evidence` section roles and native case carriers; only when absent, use the strict-default Feature Spec sections (§3 AC, §4 BR, §5 invariant, §8 TC). A malformed or unsupported declaration blocks; never fall back. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the owner's documented intent/contracts and linked evidence. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>    - **CODE-WRONG** — the owner artifact correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior, creating or updating a regression case in the configured native carrier (strict-default TC when no profile exists).
>    - **SPEC-STALE** — the change is the new intended behavior and the owner now documents the old/wrong behavior → update the canonical owner FIRST through the configured spec workflow, then synchronize its evidence/test carriers. Without a profile, use `$spec [mode=update]`, `$spec [mode=tests]`, then `$spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → ask the user or canonical spec owner before editing either side.
>    - **SPEC-SILENT** — code correctly enforces an invariant/behavior absent from the owner artifact → not drift but an UNWRITTEN rule. Prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, add it to the configured `intent` or `contracts` section, and link it from `evidence` to a native case with an inspected assertion. Without a profile, use the invariant-harvest workflow to add the rule to strict-default §4 (or §3/§5) and a guarding §8 TC. A discovered invariant left only in code or tests is INCOMPLETE.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured in the configured owner and case evidence (strict-default §4/§8) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Own the spec lifecycle in the profile declared by project config/references; keep one canonical owner, its native identifiers and carriers, and assertion-backed test evidence. The eight-section/TC model is the strict default only when no native contract is declared. The mode you run determines which `references/` body drives work; the shared semantic, evidence, execution, and review gates apply to every profile.
- **IMPORTANT MUST ATTENTION Main steps:** resolve mode → resolve root, artifact type, profile, owner, identifiers, and carriers → read the matching `references/{author,tests,sync}.md` body and required project docs → run applicability/decomposition gate → execute the selected profile's procedure → verify actual executors/assertions/results → cross-service check → reconcile without overwriting canonical owner content → flag derived-output refresh.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION honor each canonical body):**

- **Cross-Service Check:** ALWAYS scan producers, consumers, sagas, contracts before concluding; missing consumer = silent regression.
- **Evidence:** cite `file:line` for every claim; confidence >80% to act, <60% NEVER recommend.
- **Critical Thinking:** apply critical + sequential thinking; NEVER present a guess as fact.
- **Spec↔Tests↔Code Triangulation:** the unit of judgment is the WHOLE PACKAGE (configured intent/contracts/case carriers + tests + code) — reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and capture unwritten invariants in the configured contract and case owner with a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve the mode FIRST and read its `references/{author,tests,sync}.md` body — NEVER run `draft`/`init`/`update`/`audit`/`amend`/`tests`/`sync` from memory; ambiguous → ask the user directly before any mutating mode — why: each mode's gates + output contract live in its body, not in this entry skill
- **IMPORTANT MUST ATTENTION [BLOCKING]** Run the Applicability and Decomposition Gate before authoring or materially changing a spec; use the shared four-signal rule, require the complete five-field `large_idea_decomposition` block when true, omit roadmap/milestone placeholders when false, and use the standalone roadmap branch only for an explicit roadmap request — why: the spec must preserve an approved outcome boundary without turning every large idea into a new roadmap file
- **IMPORTANT MUST ATTENTION [BLOCKING]** Use only the selected profile's canonical owner, identifiers, evidence fields, and carriers; do not add a TC/Section 8 shadow registry beside a native case source — why: competing owners make drift silent.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Source mapping or ID presence alone is not execution proof; map each owner/scenario/variant to its actual executor and inspected assertion, and claim executed/PASS only after observing the selected runner result — why: aggregate labels can conceal unverified rows.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Keep unresolved owners, unsupported carriers, ambiguous profile declarations, and required unexecuted cases `UNKNOWN`/`BLOCKED`; never convert missing data to N/A or PASS — why: absence is not evidence of inapplicability.
- **IMPORTANT MUST ATTENTION** Honor applicable M1-M7 from `.claude/skills/shared/sdd-artifact-contract.md`; use `.claude/skills/shared/tc-format.md` only for the strict default TC representation. Apply business-visibility and tech-agnostic rules through the selected profile's section/carrier roles.
- **IMPORTANT MUST ATTENTION** `INDEX.md`/ERD are DERIVED — flag refresh need in `update`, NEVER trigger `$spec-index` here — why: separation of concerns keeps the canonical spec the only source of truth
- **IMPORTANT MUST ATTENTION** evidence gate — cite traced source evidence for every claim, confidence >80% to act, <60% do NOT recommend; verify profile-specific anchors against actual code/docs and map native cases to their real executor/assertion/result before claiming coverage — why: unsupported or stale anchors silently break traceability
- **IMPORTANT MUST ATTENTION** cross-service check before concluding any spec/case work — scan producers, consumers, sagas, contracts; per touchpoint owner · message · risk (NONE/ADDITIVE/BREAKING) — why: a missing downstream consumer is a silent regression
- **IMPORTANT MUST ATTENTION [BLOCKING]** Break work into small task tracking tasks BEFORE starting (one per file read) + a final review task; on context loss the current task list first, never duplicate — why: long spec files exhaust context and lose un-tracked progress
- **IMPORTANT MUST ATTENTION** Search codebase for 3+ similar patterns and read existing spec siblings before authoring new content — match local conventions over generic defaults

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| "Mode is obvious, skip the `references/` body"   | The body owns gates + output contract — running from memory drifts. Read it every time.      |
| "The case ID is in a test, so it is covered"      | ID/source mapping is not an assertion or observed runner result. Trace the actual owner, executor, assertion, and result. |
| "`update` — just regenerate the cases"            | The configured owner is canonical. Preserve its identity and use `sync` to reconcile drift; never create a shadow registry. |
| "One tech name in prose is harmless"             | One banned token fails M1 and breaks rebuild-on-any-stack. Move it to an evidence carrier.   |
| "Small spec, skip task tracking"                 | Skip depth, NEVER skip tracking — context loss wipes un-tracked progress.                    |
| "Index looks stale, I'll just run `$spec-index`" | Not this skill's job — flag the refresh need; derived artifacts regenerate separately.       |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

**IMPORTANT MUST ATTENTION** Resolve the mode and profile before authoring · preserve one canonical owner with its configured identifiers/carriers · never report required coverage as PASS without an inspected assertion and observed result — the three rules this skill must never skip.

---

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
