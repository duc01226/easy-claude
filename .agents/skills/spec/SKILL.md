---
name: spec
description: '[Documentation] Use when a workflow step or the user asks for spec authoring, auditing, amending, test-speccing or reconciling. Resolve the project artifact profile first; the 8-section/TC format is the strict default.'
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

1. Read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` (using configured roots when present). For the selected mode, also read the relevant spec system, principles, format, and workflow-cycle references named by the docs index. When config declares `specArtifacts`, validate it and take its `sections.intent`/`contracts`/`evidence` roles, owner path, and case carriers as the native profile; a malformed or unsupported declaration is `BLOCKED`, never a fallback.
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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md

<!-- PROTOCOL-GUIDES:END -->

> **Profile adapter:** The synchronized examples below use default section/ID names. Under a native profile, load the configured owner and aliases; the package, disagreement, and re-review gates still apply.

> **Profile adapter:** Resolve each default section/TC reference below through the active profile's aliases and case carrier. Preserve the same drift classes and harvest gates without creating a TC registry.

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

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

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
