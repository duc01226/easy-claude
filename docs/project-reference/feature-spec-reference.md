<!-- Last scanned: 2026-09-30 -->
<!-- Shared Feature Spec rules are extended below with the current project inventory maintained by /scan --target=feature-spec. -->

<!-- CRITICAL RULES (primacy anchor):
1. MUST ATTENTION use the tech-free 8-section Feature Spec template for all business feature docs
2. MUST ATTENTION include test specifications (Section 8) with TC-{FEATURE}-{NNN} format, Business Intent / Invariant Guarded, and Evidence field
3. MUST ATTENTION study the master template and every concrete gold standard listed in this reference before writing new feature docs
-->

> **[IMPORTANT]** MUST ATTENTION use the tech-free 8-section Feature Spec template . MUST ATTENTION include TC-{FEATURE}-{NNN} test cases (Section 8) with `Business Intent / Invariant Guarded` and `Evidence: [Source: namespace/service/id]` (abstract anchor - legacy `[Source: FilePath:Line]` is DEPRECATED) . MUST ATTENTION study the master template and every concrete gold standard listed below before writing.

# Feature Documentation Reference

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:START -->

## Quick Summary

**Goal:** All business feature docs follow the tech-free 8-section Feature Spec template - a single doc a BA, QA/QC, or AI fully understands from one read - with correct test spec format and verifiable code evidence.

**Summary:**

- The canonical capability path is `{Bucket}/README.{FeatureName}.md` inside the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path. Section 8 is the canonical Test Specification registry.
- The current Feature Spec corpus is five buckets, each with a thin `INDEX.md`: `ContextDelivery` (`README.SessionPromptLedger.md`, `README.PerFileConventionInjection.md`, `README.WorkflowRouting.md`, `README.ProtocolDelivery.md`), `WorkflowExecution` (`README.GuidedWorkflow.md`), `Notifications` (`README.AssistantSessionNotifications.md`), `Presentation` (`README.PresentationDecks.md`) and `Adoption` (`README.AdoptionSwitches.md` plus its continuation part `README.AdoptionSwitches-Part2.md`). It is small and recent, so treat it as a conformance reference for structure — not yet as a gold-standard exemplar — and keep the project master template authoritative where the two differ.
- Enforce M1-M7, the complete canonical TC fields, and stack-portable evidence anchors before accepting a Feature Spec.

**Decision sequence:** inspect the current corpus -> study the master template and any listed exemplars -> author through the spec owner -> verify all eight sections, M1-M7, TC fields, and evidence -> refresh derived indexes and technical views.

**Key Rules:**

- MUST ATTENTION follow the 8-section structure in exact order (see below); narrative prose in every section is STRICTLY tech-free
- MUST ATTENTION include Section 8 (Test Specifications) with `TC-{FEATURE}-{NNN}` IDs, `Business Intent / Invariant Guarded`, and `Evidence: [Source: namespace/service/id]` (abstract anchor; legacy `[Source: FilePath:Line]` DEPRECATED)
- MUST ATTENTION study the master template and every concrete gold standard listed below before writing any new feature doc
- MUST keep feature doc path: `{Bucket}/README.{FeatureName}.md` inside the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
- MUST NOT apply line-count caps to Feature Specs; split the capability only when TCs>40 or distinct module-level capabilities emerge

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:END -->

---

## Directory Convention

**Path roots used throughout this document.** Every path below is stated RELATIVE to one of these roots; the filenames are immutable, the roots are not:

- Business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.
- Project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.
- Templates root — default `docs/templates`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path.

Feature docs path: `{Bucket}/README.{FeatureName}.md` inside the business spec root (no line-count cap; split when TCs>40 or distinct module-level capabilities emerge). Each bucket also includes `INDEX.md`. The bucket layout under the resolved root is identical for every project.

### Current Directory Structure (top three levels)

```text
docs/                                      # Project-owned documentation
├── adr/                                   # Architecture decisions
│   ├── 0001-skill-lifecycle.md
│   ├── 0002-canonical-count-metrics.md
│   ├── 0003-config-driven-doc-and-spec-roots.md
│   └── 0004-protocol-delivery-hybrid.md
├── project-reference/                     # AI-facing project conventions and routers
│   ├── design-system/
│   │   └── README.md
│   ├── backend-patterns-reference.md
│   ├── code-review-rules.md
│   ├── custom-prompts-reference.md
│   ├── docs-index-reference.md
│   ├── domain-entities-reference.md
│   ├── e2e-test-reference.md
│   ├── feature-spec-reference.md
│   ├── frontend-patterns-reference.md
│   ├── integration-test-reference.md
│   ├── lessons.md
│   ├── project-structure-reference.md
│   ├── scss-styling-guide.md
│   ├── seed-test-data-reference.md
│   ├── skill-protocols-reference.md
│   ├── spec-principles.md
│   ├── spec-system-reference.md
│   └── workflow-spec-test-code-cycle-reference.md
├── release/                               # Release history
│   └── release-notes-2026-03-15-to-2026-04-14.md
├── release-notes/                         # Release-doc skill outputs (+ HTML renders)
│   ├── release-notes-d0e5d0cc.html
│   ├── release-notes-d0e5d0cc.md
│   ├── release-notes-unreleased-2026-09-26.html
│   └── release-notes-unreleased-2026-09-26.md
├── specs/                                 # Canonical business Feature Specs (authored root)
│   ├── Adoption/                          # Bucket: project switches for what the framework does by itself
│   ├── ContextDelivery/                   # Bucket: which guidance reaches an AI assistant, and when
│   ├── Notifications/                     # Bucket: telling a developer an AI assistant finished or needs an answer
│   ├── Presentation/                      # Bucket: slide decks held to one shared deck standard
│   └── WorkflowExecution/                 # Bucket: how a chosen workflow runs, what it must prove, and what it costs
├── templates/                             # Project authoring templates
│   └── detailed-feature-spec-template.md
├── copilot-registry.json                  # Copilot registry data
└── project-config.json                    # Machine-readable project map
```

The configured authored spec root exists and holds five buckets; the configured derived technical root is still absent from the tree. **Evidence:** `docs/project-config.json:401-412` (`specRoots.business` = `docs/specs`, `specRoots.technical` = `docs/specs-technical`); `docs/specs/Adoption/` holds `INDEX.md`, `README.AdoptionSwitches.md`, `README.AdoptionSwitches-Part2.md`; `docs/specs/ContextDelivery/` holds `INDEX.md`, `README.PerFileConventionInjection.md`, `README.ProtocolDelivery.md`, `README.SessionPromptLedger.md`, `README.WorkflowRouting.md`; `docs/specs/Notifications/` holds `INDEX.md`, `README.AssistantSessionNotifications.md`; `docs/specs/Presentation/` holds `INDEX.md`, `README.PresentationDecks.md`; `docs/specs/WorkflowExecution/` holds `INDEX.md`, `README.GuidedWorkflow.md`; no `docs/specs-technical/` path exists.

## Template Paths

| Template / Owner            | Path                                                  | Purpose                                                       | Used by Feature Docs | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | -------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature document convention | `{Bucket}/README.{FeatureName}.md`                    | Canonical capability document                                 |                    8 | `ContextDelivery/README.PerFileConventionInjection.md`, `ContextDelivery/README.ProtocolDelivery.md`, `ContextDelivery/README.SessionPromptLedger.md`, `ContextDelivery/README.WorkflowRouting.md`, `WorkflowExecution/README.GuidedWorkflow.md`, `Notifications/README.AssistantSessionNotifications.md`, `Presentation/README.PresentationDecks.md`, `Adoption/README.AdoptionSwitches.md` (continuation part `README.AdoptionSwitches-Part2.md`) |
| Project master template     | `detailed-feature-spec-template.md`                   | Current project authoring template                            |                    8 | All eight corpus specs follow its 8-section order (`README.PerFileConventionInjection.md:36-749`, `README.AssistantSessionNotifications.md:42-327`; every heading line under Section Structure)                                                                                                                                                                                                                                                     |
| Portable source template    | `.claude/templates/detailed-feature-spec-template.md` | Bootstrap source when the project template is absent          |                    0 | `.claude/hooks/session-init-docs.cjs:62-63,182-198`                                                                                                                                                                                                                                                                                                                                                                                                 |
| Feature authoring owner     | `.claude/skills/spec/SKILL.md`                        | Owns authoring and Test Specifications lifecycle              |                  N/A | `.claude/skills/spec/SKILL.md:17-35,47-62`                                                                                                                                                                                                                                                                                                                                                                                                          |
| Test-case format authority  | `.claude/skills/shared/tc-format.md`                  | Owns TC shape, evidence, coverage, cardinality, and numbering |                    8 | 356 TCs across the eight corpus specs (nine files) carry `CoveredBy:` + `Status:` per `.claude/skills/shared/tc-format.md:55-166,198-218`                                                                                                                                                                                                                                                                                                           |

No configured `workflowPatterns.featureDocTemplate` key is present. The authoring owner therefore identifies the project master template as its default (`.claude/skills/spec/references/author.md:63`; no matching key in `docs/project-config.json`).

## 8-Section Structure

MUST ATTENTION follow exact section order. Narrative prose across **all 8 sections is tech-free**; technical identifiers live ONLY in evidence carriers, frontmatter, and Mermaid blocks. Technical contracts (commands, message/event schemas, API routes, cross-service wiring, performance internals) are **NOT doc content** - code is the technical source of truth.

-   1. **Overview** - 2-3 plain sentences: what the capability does, who uses it, why it matters
-   2. **Glossary** - domain / ubiquitous-language terms
-   3. **User Stories & Acceptance Criteria** - `US-{FC}-NN` (As a / I want / So that) each with `AC-{FC}-NN` (Given/When/Then)
-   4. **Business Rules** - `BR-{FC}-NN` invariants, validation, state transitions; plain IF/THEN; `[HARD]`/`[SOFT]`; `[Source: rule/{service}/{id}]` per rule group
-   5. **Domain Model** - entities, value objects, enums, relationships; Mermaid ERD + business-meaning columns; **plain types only** (text/number/date/yes-no); `[Source: component/{service}/{id}]` per entity. Business-meaningful domain events surface here as occurrences, never as bus/message schemas
-   6. **Process Flows** - key user journeys as step tables / simple diagrams (business actions; key screens as business steps/states, not component names)
-   7. **Permissions & Roles** - business RBAC matrix (Role x View/Create/Edit/Delete + scope rules); no auth-implementation detail
-   8. **Test Specifications** - `TC-{FEATURE}-{NNN}` BDD, each linked to the `AC-`/`BR-` it proves; MUST ATTENTION carry `Business Intent / Invariant Guarded` and a hidden `Evidence: [Source: namespace/service/id]` carrier + `CoveredBy:` field (legacy `IntegrationTest:` accepted as migration input; legacy `[Source: FilePath:Line]` DEPRECATED)

## M1-M7 Compliance for All Sections

MUST ATTENTION all 8 sections satisfy the applicable BLOCKING AI-SDD mandates: M1 tech-agnostic prose; M2 no source identifiers in prose; M3 logical-ID-first traceability with abstract evidence anchors; M4 one testable interpretation; M5 rebuild-from-scratch completeness; M6 reviewer enforcement; and M7 business visibility through a user/QC-demoable outcome. Evidence carriers, frontmatter, and Mermaid blocks use the shared carve-outs. The full criteria live in `.claude/skills/shared/sdd-artifact-contract.md:83-97`.

## Test Case ID Format

**Single format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001, TC-KD-011). `{FEATURE}` is a short feature code; the per-project code registry lives below the SCAN-MANAGED boundary.

- **Source of truth:** Section 8 (canonical TC registry)
- **Code link:** `CoveredBy` records representative coverage; a configured test-spec annotation supplies the complete one-to-many test join. This repository currently configures no annotation scan; `techSpecScan` is deliberately omitted (`docs/project-config.json:413`).

## Evidence Rule

EVERY test case MUST ATTENTION carry a machine-readable evidence anchor:

```markdown
**Evidence:** `[Source: {namespace}/{service}/{id}]` (namespace in operation | event | component | schema | requirement | rule | constraint | test)
```

The abstract `[Source: namespace/service/id]` form is canonical (see `.claude/skills/shared/tc-format.md`). The legacy `[Source: {FilePath}:{LineNumber}]` form is **DEPRECATED** - it is stack-fragile and breaks on refactor; do not author it in new or migrated docs. The lone exception is the per-TC `CoveredBy:` link (legacy name: `IntegrationTest:`), which stays a physical `{TestFile}::{MethodName}` path. NEVER use `TBD` placeholders in shipped docs. NEVER omit the Evidence field.

---

<!-- SCAN-MANAGED BOUNDARY - refresh the project inventory below with /scan --target=feature-spec. -->

## App-to-Service Mapping

No product application or service boundary is configured, so ownership maps to the framework module that owns the behavior rather than to a deployed app.

| App Name                                | Backend Services | Doc Directory                                                                                                                                   | Doc Count | Evidence                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N/A — no configured product application | None             | `docs/specs/ContextDelivery/`, `docs/specs/WorkflowExecution/`, `docs/specs/Notifications/`, `docs/specs/Presentation/`, `docs/specs/Adoption/` |         9 | `docs/project-config.json:44-115,401-412`; seven corpus specs describe hooks-module behavior (convention injection, prompt ledger, workflow routing, protocol delivery, session notifications, adoption switches, skill activation policy), one describes workflows-module behavior (guided workflow execution) and one describes skills-module behavior (presentation decks; `Presentation/README.PresentationDecks.md:2`) |

## Gold Standard References

No spec has been ratified as a gold-standard exemplar yet. The nine corpus specs are structurally conformant and recent, so read them for shape, and keep the master template authoritative wherever a spec and the template disagree:

- `detailed-feature-spec-template.md` — project master template (authoritative on structure)
- `ContextDelivery/README.PerFileConventionInjection.md` — conformance reference; 8 sections, 85 TCs in one file (over the forty-case split rule; a continuation part is its owner's follow-up)
- `ContextDelivery/README.ProtocolDelivery.md` — conformance reference; 8 sections, 75 TCs in one file (over the forty-case split rule; a continuation part is its owner's follow-up)
- `ContextDelivery/README.SessionPromptLedger.md` — conformance reference; 8 sections, 23 TCs
- `ContextDelivery/README.WorkflowRouting.md` — conformance reference; 8 sections, 13 TCs
- `Notifications/README.AssistantSessionNotifications.md` — conformance reference; 8 sections, 13 TCs
- `Presentation/README.PresentationDecks.md` — conformance reference; 8 sections, 17 TCs (Section 6 uses the portable template's interaction-surface subsections)
- `WorkflowExecution/README.GuidedWorkflow.md` — conformance reference; 8 sections, 68 TCs in one file (over the forty-case split rule; a continuation part is its owner's follow-up)
- `Adoption/README.AdoptionSwitches.md` — conformance reference; 8 sections, 62 TCs (Section 8 continues in `README.AdoptionSwitches-Part2.md`)

- `Adoption/README.SkillActivationPolicy.md` — implemented; 8 sections, 10 TCs for configurable runtime skill selection

## Feature Code Registry

Nine capability codes are registered: four in `ContextDelivery`, two in `Adoption`, and one each in `WorkflowExecution`, `Notifications` and `Presentation`.

| Code | Feature                         | Module    | Status | Evidence                                                                              |
| ---- | ------------------------------- | --------- | ------ | ------------------------------------------------------------------------------------- |
| PFCI | Per-File Convention Injection   | hooks     | draft  | `ContextDelivery/INDEX.md:11`; `ContextDelivery/README.PerFileConventionInjection.md` |
| SPL  | Session Prompt Ledger           | hooks     | draft  | `ContextDelivery/INDEX.md:13`; `ContextDelivery/README.SessionPromptLedger.md`        |
| PDL  | Protocol Delivery               | hooks     | draft  | `ContextDelivery/INDEX.md:12`; `ContextDelivery/README.ProtocolDelivery.md`           |
| WFR  | Workflow Routing                | hooks     | draft  | `ContextDelivery/INDEX.md:14`; `ContextDelivery/README.WorkflowRouting.md`            |
| GWF  | Guided Workflow Execution       | workflows | draft  | `WorkflowExecution/INDEX.md:11`; `WorkflowExecution/README.GuidedWorkflow.md`         |
| ADS  | Adoption Switches               | hooks     | draft  | `Adoption/INDEX.md:11`; `Adoption/README.AdoptionSwitches.md` (+ `-Part2`)            |
| NT   | Assistant Session Notifications | hooks     | draft  | `Notifications/INDEX.md:11`; `Notifications/README.AssistantSessionNotifications.md`  |
| PD   | Presentation Decks              | skills    | draft  | `Presentation/INDEX.md:11`; `Presentation/README.PresentationDecks.md`                |

| SAP | Framework Skill Activation Policy | hooks | implemented | `Adoption/README.SkillActivationPolicy.md` |

## Thin-Index Files

Five bucket indexes exist, each a capability table (Capability · Feature Code · Status · Spec link): `ContextDelivery/INDEX.md` covers its four specs; `Adoption/INDEX.md` covers two specs and links the adoption-switch continuation part from its row; `Notifications/INDEX.md`, `Presentation/INDEX.md` and `WorkflowExecution/INDEX.md` each cover one spec. All five carry the derived-artifact banner (regenerate via `/spec [mode=index]`, never hand-edit). No parent cross-bucket index exists; with five buckets populated, one is now worth generating through the `/spec [mode=index]` owner. **Evidence:** `ContextDelivery/INDEX.md:1-14`; `Adoption/INDEX.md:1-11`; `Notifications/INDEX.md:1-11`; `Presentation/INDEX.md:1-11`; `WorkflowExecution/INDEX.md:1-11`.

## Section Structure

Corpus denominator: 9 Feature Specs (a continuation part is not a separate spec). All nine carry all eight prescribed sections in the prescribed order, so every section is observed at 100% (9/9) and classified standard.

| Order | Prescribed Section                 | Observed Frequency |
| ----: | ---------------------------------- | ------------------ |
|     1 | Overview                           | 100% (9/9)         |
|     2 | Glossary                           | 100% (9/9)         |
|     3 | User Stories & Acceptance Criteria | 100% (9/9)         |
|     4 | Business Rules                     | 100% (9/9)         |
|     5 | Domain Model                       | 100% (9/9)         |
|     6 | Process Flows                      | 100% (9/9)         |
|     7 | Permissions & Roles                | 100% (9/9)         |
|     8 | Test Specifications                | 100% (9/9)         |

A 9-spec denominator confirms the prescribed order is followed but is too small to establish an independent corpus convention; the master template stays the authority. **Evidence:** `detailed-feature-spec-template.md:41-216`; `ContextDelivery/README.PerFileConventionInjection.md:36,44,76,247,507,654,728,749`; `ContextDelivery/README.SessionPromptLedger.md:36,42,60,122,185,247,278,296`; `ContextDelivery/README.WorkflowRouting.md:46,52,79,132,234,315,341,355`; `Notifications/README.AssistantSessionNotifications.md:42,48,71,112,213,256,315,327`; `Presentation/README.PresentationDecks.md:42,48,69,136,223,305,370,382`; `Adoption/README.AdoptionSwitches.md:64,70,102,207,362,472,516,536` (Section 8 continues at `README.AdoptionSwitches-Part2.md:27`); `ContextDelivery/README.ProtocolDelivery.md:68,74,110,220,369,498,538,552`; `WorkflowExecution/README.GuidedWorkflow.md:54,60,100,201,358,485,527,541`.

## Documentation Conventions

| Concern                | Current Rule                                                                                                                                                                                                                                                | Evidence                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Location and name      | One canonical capability document per bucket; each bucket index is `INDEX.md`                                                                                                                                                                               | `spec-system-reference.md:9-36`                                |
| Section order          | Eight sections in the order above                                                                                                                                                                                                                           | `detailed-feature-spec-template.md:41-216`                     |
| Story and criteria IDs | `US-{FC}-NN` and `AC-{FC}-NN`                                                                                                                                                                                                                               | `detailed-feature-spec-template.md:80-93`                      |
| Rule IDs               | `BR-{FC}-NN` plus an abstract rule anchor                                                                                                                                                                                                                   | `detailed-feature-spec-template.md:100-110`                    |
| Test IDs               | `TC-{FEATURE}-{NNN}` with category-decade numbering                                                                                                                                                                                                         | `.claude/skills/shared/tc-format.md:55-58,198-218`             |
| Required TC content    | Descriptive name/priority, Objective, Business Intent / Invariant Guarded, Preconditions, Demo Flow/GWT, Expected Result, Acceptance Criteria, Test Data, Edge Cases, conditional Transition Invariants, Evidence, Related Behaviors, CoveredBy, and Status | `.claude/skills/shared/tc-format.md:55-146`                    |
| Evidence               | Stack-portable `[Source: namespace/service/id]`; physical code coordinates stay outside prose                                                                                                                                                               | `.claude/skills/shared/sdd-artifact-contract.md:89-97,388-428` |
| Coverage cardinality   | One business TC may be guarded by many tests through the shared test-spec annotation                                                                                                                                                                        | `.claude/skills/shared/tc-format.md:167-187`                   |
| Ownership              | Business specs are authored; indexes and technical views are derived single-writer artifacts                                                                                                                                                                | `spec-system-reference.md:17-54`                               |

## Coverage Gaps

| Area                         | Current State                                                                                                                                                                                                                                                                                         | Evidence / Next Owner                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical corpus             | Five buckets exist (`ContextDelivery`: 4 Feature Specs; `WorkflowExecution`: 1; `Notifications`: 1; `Presentation`: 1; `Adoption`: 2 (ADS in two parts)); every other capability is still uncovered                                                                                                         | `ContextDelivery/`, `WorkflowExecution/`, `Notifications/`, `Presentation/`, `Adoption/`; create further buckets through `$spec` when a capability is ready                                                    |
| Module distribution          | The hooks module has seven Feature Specs, the workflows module one (GWF) and the skills module one (PD); the other four configured modules have zero                                                                                                                                                    | `docs/project-config.json:44-115`; corpus evidence above                                                                                                                                                       |
| Worked exemplar              | No gold-standard capability document exists                                                                                                                                                                                                                                                           | Master template only: `detailed-feature-spec-template.md`                                                                                                                                                      |
| Feature-code registry        | Nine codes registered (`PFCI`, `SPL`, `WFR`, `PDL`, `GWF`, `NT`, `ADS`, `PD`, `SAP`); SAP is `implemented`, the others `draft`; no code is `stable` yet                                                                                                                                                                                  | `ContextDelivery/INDEX.md:11-14`; `WorkflowExecution/INDEX.md:11`; `Notifications/INDEX.md:11`; `Presentation/INDEX.md:11`; `Adoption/INDEX.md:11`                                                             |
| Thin indexes                 | Five bucket indexes exist (`ContextDelivery/INDEX.md`, `WorkflowExecution/INDEX.md`, `Notifications/INDEX.md`, `Presentation/INDEX.md`, `Adoption/INDEX.md`); no cross-bucket catalog yet — generate one through `/spec [mode=index]`                                                                        | `ContextDelivery/INDEX.md`; `Notifications/INDEX.md`; `Presentation/INDEX.md`; `Adoption/INDEX.md`                                                                                                             |
| Forty-case split rule        | `ContextDelivery/README.PerFileConventionInjection.md` (85 TCs), `ContextDelivery/README.ProtocolDelivery.md` (75 TCs) and `WorkflowExecution/README.GuidedWorkflow.md` (68 TCs) each hold more than forty cases in one file; each records the split as an owner follow-up in its Section 8 size note | `/spec` owner; `Adoption/README.AdoptionSwitches-Part2.md` is the continuation-part precedent                                                                                                                  |
| Local M1 tokens              | The local prose-rule section defines no banned-token list or verifier                                                                                                                                                                                                                                 | `spec-principles.md:35-39`                                                                                                                                                                                     |
| Template configuration       | The referenced template config key is absent                                                                                                                                                                                                                                                          | `docs/project-reference/spec-system-reference.md:15`; no matching key in `docs/project-config.json`                                                                                                            |
| Template parity              | Project and portable templates disagree on the Section 6 interaction-surface contract; `Presentation/README.PresentationDecks.md` follows the portable shape (Process Flows & Interaction Surface, subsections 6.1-6.5) while the other seven specs follow the project shape                          | templates-root `detailed-feature-spec-template.md:172-192`; portable `.claude/templates/detailed-feature-spec-template.md:153-235`; `Presentation/README.PresentationDecks.md:305-366`                         |
| Rule/entity anchor placement | The reference and authoring owner require abstract anchors in Business Rules and Domain Model, while both templates say anchors appear only in Test Specifications                                                                                                                                    | this reference, `:114-115`; `.claude/skills/spec/SKILL.md:121-122`; templates-root `detailed-feature-spec-template.md:222-224,277-278`; portable `.claude/templates/detailed-feature-spec-template.md:318-321` |

## M1/M2 Compliance Leaks

The corpus now has nine auditable specs, but no per-token M1/M2 audit has been run against them. The table below is empty because the audit is OUTSTANDING — this is an unperformed audit, not a compliance PASS.

| File | Line | Section | Mandate | Offending Token / Identifier |
| ---- | ---: | ------- | ------- | ---------------------------- |

Next owner: `/scan --target=feature-spec` populates these rows for every corpus spec, starting with `ContextDelivery/README.PerFileConventionInjection.md`, `ContextDelivery/README.SessionPromptLedger.md`, and `Notifications/README.AssistantSessionNotifications.md`. The shared category rules remain enforceable, but exact local-token coverage still cannot be claimed because the local banned-token list is not populated. **Evidence:** `.claude/skills/shared/sdd-artifact-contract.md:89-97`; `spec-principles.md:35-39`.

---

<!-- CRITICAL RULES (recency anchor):
1. MUST ATTENTION use the tech-free 8-section Feature Spec template for all business feature docs
2. MUST ATTENTION include test specifications (Section 8) with TC-{FEATURE}-{NNN} format, Business Intent / Invariant Guarded, and Evidence field
3. MUST ATTENTION study the master template and every concrete gold standard before writing new feature docs
-->

<!-- PROMPT-ENHANCE:CLOSING-GUARDRAILS:START -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION** use the tech-free 8-section Feature Spec template in exact order for ALL business feature docs; narrative stays tech-free and technical identifiers stay in allowed evidence carriers
- **IMPORTANT MUST ATTENTION** Section 8 (Test Specifications) MUST include `TC-{FEATURE}-{NNN}` IDs, `Business Intent / Invariant Guarded`, and `Evidence: [Source: namespace/service/id]` for every test case (legacy `FilePath:Line` DEPRECATED)
- **IMPORTANT MUST ATTENTION** study the master template and every concrete gold standard before writing any new feature doc; no worked exemplar exists yet
- **IMPORTANT MUST ATTENTION** enforce M1-M7, including the user/QC-demoable business-visibility gate; an absent corpus is not a compliance PASS
- **IMPORTANT MUST ATTENTION** do not apply line-count caps to Feature Specs; split only when TCs>40 or distinct module-level capabilities emerge - not shorter stubs, not sprawling dumps
- **IMPORTANT MUST ATTENTION** NEVER ship docs with `TBD` Evidence placeholders - every TC requires a canonical `[Source: namespace/service/id]` anchor (legacy `FilePath:Line` DEPRECATED)
- **IMPORTANT MUST ATTENTION** add final review task to verify all 8 sections present, narrative prose is tech-free, every TC has Business Intent / Invariant Guarded and Evidence fields, and no line-count cap was applied

<!-- PROMPT-ENHANCE:CLOSING-GUARDRAILS:END -->
