---
name: spec
version: 5.0.1
description: '[Documentation] Use when a workflow step or the user asks for spec authoring, auditing, amending, test-speccing or reconciling. Resolve the project artifact profile first; the 8-section/TC format is the strict default.'
triggers: 'feature spec, feature documentation, create feature doc, update feature doc, business feature documentation, audit feature spec, amend feature spec, spec from idea, generate spec from requirements, draft feature spec from prompt, idea to spec, requirements to spec, tdd spec, tdd test, test driven, write test specs, create test cases, update test specs, test specifications for feature, test spec for feature, sync test specs, generate test specs from code, update test specs after changes, test specs from PR, test specs from pull request, code to test specs, sync tests, reconcile tests with code, sync test specs to integration tests'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** the Feature Spec root is CONFIGURED, not fixed — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (rationale: `docs/adr/0003-config-driven-doc-and-spec-roots.md`). The spec template defaults to `detailed-feature-spec-template.md` under the templates root (default `docs/templates/`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path) unless `workflowPatterns.featureDocTemplate` points to another template.

**[IMPORTANT] TaskCreate** — Break ALL work into small tasks BEFORE starting. For simple tasks, ask user whether to skip.

**Goal:** Own the spec lifecycle across seven modes — author the canonical project artifact, capture testable scenario intent in its declared carrier, and reconcile cases to tests and code. **MUST ATTENTION** resolve the project profile before applying a format. The eight-section/TC model remains the strict default; a declared native profile owns its existing identifiers, sections, carriers, and cardinality without a duplicate registry. Every profile keeps the applicable shared semantic, evidence, execution, and review gates.

**Summary:**

- **Main steps:** **MUST ATTENTION** resolve mode → resolve artifact root/type/profile from project config and references → read the matching author/tests/sync body → run applicability/decomposition gate → track and execute that profile's procedure → verify evidence and execution status → cross-service check → reconcile without replacing canonical owner content.

**Workflow:**

- **Purpose:** one skill owns `draft | init | update | audit | amend | tests | sync`, selecting the canonical artifact profile before applying representation-specific rules.
- **Main steps (every run):** (1) **MUST ATTENTION** resolve mode FIRST — explicit `[mode=<x>]` wins, else infer from request + repo state, ambiguous → `AskUserQuestion` before any mutating mode; (2) resolve the project root, artifact type, profile, owner, and configured identifiers/carriers; (3) read required project references and the matching `references/{author,tests,sync}.md` body — NEVER run a mode from memory; (4) classify large-idea applicability; (5) `TaskCreate`-break the work before starting; (6) execute the selected profile's procedure and semantic gates; (7) cross-service check before concluding.
- **Semantic floor:** **MUST ATTENTION** enforce applicable M1-M7, evidence, testability, property/boundary, preservation, actual-execution, operation-authority, and drift gates for every profile. A representation change never waives these obligations. — why: traceable intent must survive changes in format or test topology.
- **Strict default representation:** **MUST ATTENTION** use the tech-free eight-section Feature Spec and `TC-{FEATURE}-{NNN}` registry in Section 8 only when no native case profile is explicitly declared; preserve its canonical source, `[Source:]` evidence, and no-overwrite rules.
- **Native representation:** **MUST ATTENTION** use the project's declared section roles, logical IDs, owner rule, case carriers, and cardinality. For executable coverage, link each owner/scenario/variant to its executor, inspected assertion, observed runner result, source evidence, and reconciliation state. Use a manual-QC path only when the profile explicitly authorizes it, with its approved procedure and observed evidence; never label that result runner-executed. Never add a TC/Section 8 side registry to mirror native cases.
- **Derived outputs:** `INDEX.md`/ERDs remain derived; flag required refresh, but never trigger `/spec-index` here. — why: derived views cannot become competing sources of truth.
- **[BLOCKING]** Apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before authoring. A true signal requires the complete `large_idea_decomposition` block with stable outcome slices, dependency order, non-goals, risks/evidence, and deferred-work owners; an all-false idea omits the block and roadmap/milestone placeholders. Only an explicit roadmap request uses the standalone roadmap branch; unresolved product terms or missing decomposition owners stop authoring. — why: a technically complete spec can still encode the wrong product boundary.

**Key Rules:**

- Resolve the mode and artifact profile and read its matching reference body before any mutation; ambiguous mode → `AskUserQuestion`, invalid/conflicting profile → `UNKNOWN`/`BLOCKED`.
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
3. If the user explicitly requests a product roadmap or selects a milestone from an explicitly supplied roadmap, use the explicit roadmap branch. Resolve and verify the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), the owner-approved milestone, and its scope brief; route missing approval to `/product-roadmap`. Reading a supplied roadmap never authorizes creating/updating one.
4. For a framework/library change, use the `FRAMEWORK-LIBRARY` technical branch. For an isolated brownfield change, use `EXEMPT`. Neither branch requires a product roadmap or milestone.
5. For `audit`, `tests`, and `sync`, inherit and verify the existing branch metadata; never invent a milestone, silently broaden the spec, or drop a decomposition field.

This gate is product-level and does not relax applicable intent-quality rules in the selected profile. Explicit roadmap references belong only in the explicit branch; embedded decomposition fields belong in the owning artifact; business outcomes, definitions, and boundaries belong in the canonical sections.

> **Renamed:** formerly `/feature-spec` (and earlier `/feature-docs`); the former `/spec-tests` skill is now folded in as `mode=tests` / `mode=sync`. Those names no longer resolve as slash commands — use `/spec` with the matching mode.

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
2. If ambiguous, present the detected mode via `AskUserQuestion` before proceeding — NEVER auto-start a mutating mode.
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

**Format:** Tech-free 8-section Feature Spec. Activate the `/spec` skill before editing.

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
- Section 8 authored via `/spec [mode=tests]`; `/spec [mode=init]` populates it only during initial authoring
- No line-count cap applies to Feature Specs. Split the capability only when TCs>40 or distinct module-level capabilities emerge.

### Applicable M1-M7 Compliance (BLOCKING — apply through the selected profile)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for the full BLOCKING criteria. Apply them to the target artifact tree and its configured section/carrier roles. The default-specific §1–8 wording below applies only to the strict default profile; native logical IDs, fields, and section roles carry the same applicable obligations.

**M7 — Business-visibility.** Where M7 applies, test the case BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. A `When` that is an invocation or a `Then` asserting an internal-only state fails the business-visibility gate. Apply the same gate through the selected profile's scenario/case fields; judge the BODY, never the title or ID.

> **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7.
>
> M6 is absent from this list by design: it binds the REVIEWER (a review that passes an M1-M5/M7 violation is itself defective), never the artifact. The artifact-facing set reads **M1-M5 and M7**.

---

## Derived-Index Delegation

This skill owns the canonical artifact and cases selected by the active profile. Indexes and cross-capability ERDs remain derived projections regenerated by `/spec-index` — never a source of truth, and never authored here. In `update` mode, flag a required derived-artifact refresh but do NOT trigger `/spec-index` directly (separation of concerns).

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — spec-driven with tests by default; run the canonical `workflow-feature` sequence from `.claude/workflows.json` (spec + test specs before `plan-execute`, spec/test/code sync and review gates after it) — never a copied step list.
> 2. **Execute `/spec` directly** — run this skill standalone in the resolved mode

---

## Next Steps

**[BLOCKING]** After completing, use `AskUserQuestion` to present options. Do NOT skip — user decides:

- **"/spec [mode=tests] (Recommended)"** — Generate/update the selected profile's canonical test scenarios (strict default: Section 8 TCs)
- **"/spec [mode=sync]"** — Reconcile the selected profile's canonical cases with executing test code
- **"/artifact-review --type=spec-tests"** — Review scenario intent, assertion-backed coverage, and profile-specific completeness
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                                | Relationship                                                                                                           | When to Call                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/spec-index`                        | **Derived consumer** — assembles a regenerable navigation index/ERD FROM canonical specs (never a source of truth) | AFTER canonical specs exist — refresh the declared index/ERD over the owner artifacts |
| `/artifact-review --type=spec-tests` | **Reviewer** — audits scenario intent and coverage under the selected profile                                         | After `spec [mode=tests]`, to validate completeness and assertion-backed mappings                      |
| `/integration-test`                  | **End consumer** — generates or updates executable tests from the selected profile's canonical scenarios             | After `spec [mode=tests]`, when code generation is the configured next step                             |
| `/docs-update`                       | **Orchestrator** — calls this skill as Phase 2                                                                         | Run `/docs-update` for full chain sync; it calls `/spec` internally                                    |
| `/changes-review`                    | **Trigger** — detects feature doc staleness                                                                            | Calls `/docs-update` when a business doc is stale relative to code changes                             |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

- **IMPORTANT MUST ATTENTION [BLOCKING]** Resolve the mode FIRST and read its `references/{author,tests,sync}.md` body — NEVER run `draft`/`init`/`update`/`audit`/`amend`/`tests`/`sync` from memory; ambiguous → `AskUserQuestion` before any mutating mode — why: each mode's gates + output contract live in its body, not in this entry skill
- **IMPORTANT MUST ATTENTION [BLOCKING]** Run the Applicability and Decomposition Gate before authoring or materially changing a spec; use the shared four-signal rule, require the complete five-field `large_idea_decomposition` block when true, omit roadmap/milestone placeholders when false, and use the standalone roadmap branch only for an explicit roadmap request — why: the spec must preserve an approved outcome boundary without turning every large idea into a new roadmap file
- **IMPORTANT MUST ATTENTION [BLOCKING]** Use only the selected profile's canonical owner, identifiers, evidence fields, and carriers; do not add a TC/Section 8 shadow registry beside a native case source — why: competing owners make drift silent.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Source mapping or ID presence alone is not execution proof; map each owner/scenario/variant to its actual executor and inspected assertion, and claim executed/PASS only after observing the selected runner result — why: aggregate labels can conceal unverified rows.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Keep unresolved owners, unsupported carriers, ambiguous profile declarations, and required unexecuted cases `UNKNOWN`/`BLOCKED`; never convert missing data to N/A or PASS — why: absence is not evidence of inapplicability.
- **IMPORTANT MUST ATTENTION** Honor applicable M1-M7 from `.claude/skills/shared/sdd-artifact-contract.md`; use `.claude/skills/shared/tc-format.md` only for the strict default TC representation. Apply business-visibility and tech-agnostic rules through the selected profile's section/carrier roles.
- **IMPORTANT MUST ATTENTION** `INDEX.md`/ERD are DERIVED — flag refresh need in `update`, NEVER trigger `/spec-index` here — why: separation of concerns keeps the canonical spec the only source of truth
- **IMPORTANT MUST ATTENTION** evidence gate — cite traced source evidence for every claim, confidence >80% to act, <60% do NOT recommend; verify profile-specific anchors against actual code/docs and map native cases to their real executor/assertion/result before claiming coverage — why: unsupported or stale anchors silently break traceability
- **IMPORTANT MUST ATTENTION** cross-service check before concluding any spec/case work — scan producers, consumers, sagas, contracts; per touchpoint owner · message · risk (NONE/ADDITIVE/BREAKING) — why: a missing downstream consumer is a silent regression
- **IMPORTANT MUST ATTENTION [BLOCKING]** Break work into small `TaskCreate` tasks BEFORE starting (one per file read) + a final review task; on context loss `TaskList` first, never duplicate — why: long spec files exhaust context and lose un-tracked progress
- **IMPORTANT MUST ATTENTION** Search codebase for 3+ similar patterns and read existing spec siblings before authoring new content — match local conventions over generic defaults

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| "Mode is obvious, skip the `references/` body"   | The body owns gates + output contract — running from memory drifts. Read it every time.      |
| "The case ID is in a test, so it is covered"      | ID/source mapping is not an assertion or observed runner result. Trace the actual owner, executor, assertion, and result. |
| "`update` — just regenerate the cases"            | The configured owner is canonical. Preserve its identity and use `sync` to reconcile drift; never create a shadow registry. |
| "One tech name in prose is harmless"             | One banned token fails M1 and breaks rebuild-on-any-stack. Move it to an evidence carrier.   |
| "Small spec, skip task tracking"                 | Skip depth, NEVER skip tracking — context loss wipes un-tracked progress.                    |
| "Index looks stale, I'll just run `/spec-index`" | Not this skill's job — flag the refresh need; derived artifacts regenerate separately.       |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via TaskCreate before acting.

**IMPORTANT MUST ATTENTION** Resolve the mode and profile before authoring · preserve one canonical owner with its configured identifiers/carriers · never report required coverage as PASS without an inspected assertion and observed result — the three rules this skill must never skip.

---
