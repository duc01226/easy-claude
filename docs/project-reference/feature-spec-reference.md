<!-- Last scanned: 2026-08-04 -->
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
- The current Feature Spec corpus is the `ContextDelivery` bucket: `README.SessionPromptLedger.md` and `README.PerFileConventionInjection.md`, plus a thin `INDEX.md`. It is small and recent, so treat it as a conformance reference for structure — not yet as a gold-standard exemplar — and keep the project master template authoritative where the two differ.
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
│   └── 0002-canonical-count-metrics.md
├── project-reference/                     # AI-facing project conventions and routers
│   ├── design-system/
│   │   └── README.md
│   ├── backend-patterns-reference.md
│   ├── code-review-rules.md
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
│   ├── spec-principles.md
│   ├── spec-system-reference.md
│   └── workflow-spec-test-code-cycle-reference.md
├── release/                               # Release history
│   └── release-notes-2026-03-15-to-2026-04-14.md
├── specs/                                 # Canonical business Feature Specs (authored root)
│   └── ContextDelivery/                   # Bucket: which guidance reaches an AI assistant, and when
├── templates/                             # Project authoring templates
│   └── detailed-feature-spec-template.md
├── copilot-registry.json                  # Copilot registry data
└── project-config.json                    # Machine-readable project map
```

The configured authored spec root exists and holds one bucket; the configured derived technical root is still absent from the tree. **Evidence:** `docs/project-config.json:200-203` (`specRoots.business` = `docs/specs`, `specRoots.technical` = `docs/specs-technical`); `docs/specs/ContextDelivery/` holds `INDEX.md`, `README.PerFileConventionInjection.md`, `README.SessionPromptLedger.md`; no `docs/specs-technical/` path exists.

## Template Paths

| Template / Owner            | Path                                                  | Purpose                                                       | Used by Feature Docs | Evidence                                                                                                               |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | -------------------: | ---------------------------------------------------------------------------------------------------------------------- |
| Feature document convention | `{Bucket}/README.{FeatureName}.md`                    | Canonical capability document                                 |                    2 | `ContextDelivery/README.PerFileConventionInjection.md`, `ContextDelivery/README.SessionPromptLedger.md`                |
| Project master template     | `detailed-feature-spec-template.md`                   | Current project authoring template                            |                    2 | Both corpus specs follow its 8-section order (`README.PerFileConventionInjection.md:36-454`)                           |
| Portable source template    | `.claude/templates/detailed-feature-spec-template.md` | Bootstrap source when the project template is absent          |                    0 | `.claude/hooks/session-init-docs.cjs:54-56,150-167`                                                                    |
| Feature authoring owner     | `.claude/skills/spec/SKILL.md`                        | Owns authoring and Test Specifications lifecycle              |                  N/A | `.claude/skills/spec/SKILL.md:17-31,47-60`                                                                             |
| Test-case format authority  | `.claude/skills/shared/tc-format.md`                  | Owns TC shape, evidence, coverage, cardinality, and numbering |                    2 | 66 TCs across both corpus specs carry `CoveredBy:` + `Status:` per `.claude/skills/shared/tc-format.md:49-167,186-208` |

No configured `workflowPatterns.featureDocTemplate` key is present. The authoring owner therefore identifies the project master template as its default (`.claude/skills/spec/SKILL.md:19`; no matching key in `docs/project-config.json`).

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

MUST ATTENTION all 8 sections satisfy the applicable BLOCKING AI-SDD mandates: M1 tech-agnostic prose; M2 no source identifiers in prose; M3 logical-ID-first traceability with abstract evidence anchors; M4 one testable interpretation; M5 rebuild-from-scratch completeness; M6 reviewer enforcement; and M7 business visibility through a user/QC-demoable outcome. Evidence carriers, frontmatter, and Mermaid blocks use the shared carve-outs. The full criteria live in `.claude/skills/shared/sdd-artifact-contract.md:59-82`.

## Test Case ID Format

**Single format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001, TC-KD-011). `{FEATURE}` is a short feature code; the per-project code registry lives below the SCAN-MANAGED boundary.

- **Source of truth:** Section 8 (canonical TC registry)
- **Code link:** `CoveredBy` records representative coverage; a configured test-spec annotation supplies the complete one-to-many test join. This repository currently configures no annotation scan; `techSpecScan` is deliberately omitted (`docs/project-config.json:204`).

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

| App Name                                | Backend Services | Doc Directory                 | Doc Count | Evidence                                                                                                                         |
| --------------------------------------- | ---------------- | ----------------------------- | --------: | -------------------------------------------------------------------------------------------------------------------------------- |
| N/A — no configured product application | None             | `docs/specs/ContextDelivery/` |         2 | `docs/project-config.json:23-73,200-203`; both corpus specs describe hooks-module behavior (convention injection, prompt ledger) |

## Gold Standard References

No spec has been ratified as a gold-standard exemplar yet. The two corpus specs are structurally conformant and recent, so read them for shape, and keep the master template authoritative wherever the two disagree:

- `detailed-feature-spec-template.md` — project master template (authoritative on structure)
- `ContextDelivery/README.PerFileConventionInjection.md` — conformance reference; 8 sections, 44 TCs
- `ContextDelivery/README.SessionPromptLedger.md` — conformance reference; 8 sections, 22 TCs

## Feature Code Registry

Two capability codes are registered, both in the `ContextDelivery` bucket.

| Code | Feature                       | Module | Status | Evidence                                                                             |
| ---- | ----------------------------- | ------ | ------ | ------------------------------------------------------------------------------------ |
| PFCI | Per-File Convention Injection | hooks  | draft  | `ContextDelivery/INDEX.md:7`; `ContextDelivery/README.PerFileConventionInjection.md` |
| SPL  | Session Prompt Ledger         | hooks  | draft  | `ContextDelivery/INDEX.md:8`; `ContextDelivery/README.SessionPromptLedger.md`        |

## Thin-Index Files

One bucket index exists: `ContextDelivery/INDEX.md` — a 9-line capability table (Capability · Feature Code · Status · Spec link) covering both corpus specs. No parent cross-bucket index exists, and none is required while a single bucket is populated. **Evidence:** `ContextDelivery/INDEX.md:1-9`.

## Section Structure

Corpus denominator: 2 Feature Specs. Both carry all eight prescribed sections in the prescribed order, so every section is observed at 100% (2/2) and classified standard.

| Order | Prescribed Section                 | Observed Frequency |
| ----: | ---------------------------------- | ------------------ |
|     1 | Overview                           | 100% (2/2)         |
|     2 | Glossary                           | 100% (2/2)         |
|     3 | User Stories & Acceptance Criteria | 100% (2/2)         |
|     4 | Business Rules                     | 100% (2/2)         |
|     5 | Domain Model                       | 100% (2/2)         |
|     6 | Process Flows                      | 100% (2/2)         |
|     7 | Permissions & Roles                | 100% (2/2)         |
|     8 | Test Specifications                | 100% (2/2)         |

A 2-spec denominator confirms the prescribed order is followed but is too small to establish an independent corpus convention; the master template stays the authority. **Evidence:** `detailed-feature-spec-template.md:33-195`; `ContextDelivery/README.PerFileConventionInjection.md:36,42,66,160,299,388,434,454`; `ContextDelivery/README.SessionPromptLedger.md:36,42,60,122,185,246,277,295`.

## Documentation Conventions

| Concern                | Current Rule                                                                                                                                                                                                                                                | Evidence                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Location and name      | One canonical capability document per bucket; each bucket index is `INDEX.md`                                                                                                                                                                               | `spec-system-reference.md:9-36`                                |
| Section order          | Eight sections in the order above                                                                                                                                                                                                                           | `detailed-feature-spec-template.md:33-195`                     |
| Story and criteria IDs | `US-{FC}-NN` and `AC-{FC}-NN`                                                                                                                                                                                                                               | `detailed-feature-spec-template.md:59-72`                      |
| Rule IDs               | `BR-{FC}-NN` plus an abstract rule anchor                                                                                                                                                                                                                   | `detailed-feature-spec-template.md:79-89`                      |
| Test IDs               | `TC-{FEATURE}-{NNN}` with category-decade numbering                                                                                                                                                                                                         | `.claude/skills/shared/tc-format.md:49-52,186-208`             |
| Required TC content    | Descriptive name/priority, Objective, Business Intent / Invariant Guarded, Preconditions, Demo Flow/GWT, Expected Result, Acceptance Criteria, Test Data, Edge Cases, conditional Transition Invariants, Evidence, Related Behaviors, CoveredBy, and Status | `.claude/skills/shared/tc-format.md:49-137`                    |
| Evidence               | Stack-portable `[Source: namespace/service/id]`; physical code coordinates stay outside prose                                                                                                                                                               | `.claude/skills/shared/sdd-artifact-contract.md:59-73,379-402` |
| Coverage cardinality   | One business TC may be guarded by many tests through the shared test-spec annotation                                                                                                                                                                        | `.claude/skills/shared/tc-format.md:157-175`                   |
| Ownership              | Business specs are authored; indexes and technical views are derived single-writer artifacts                                                                                                                                                                | `spec-system-reference.md:17-54`                               |

## Coverage Gaps

| Area                         | Current State                                                                                                                                                      | Evidence / Next Owner                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical corpus             | One bucket exists (`ContextDelivery`: 2 Feature Specs); every other capability is still uncovered                                                                  | `ContextDelivery/`; create further buckets through `$spec` when a capability is ready                                                                                                              |
| Module distribution          | Only the hooks module has Feature Specs; the other six configured library modules have zero                                                                        | `docs/project-config.json:23-73`; corpus evidence above                                                                                                                                            |
| Worked exemplar              | No gold-standard capability document exists                                                                                                                        | Master template only: `detailed-feature-spec-template.md`                                                                                                                                          |
| Feature-code registry        | Two codes registered (`PFCI`, `SPL`), both `draft`, both hooks-module; no code is `stable` yet                                                                     | `ContextDelivery/INDEX.md:7-8`                                                                                                                                                                     |
| Thin indexes                 | One bucket index exists (`ContextDelivery/INDEX.md`); no cross-bucket catalog yet                                                                                  | `ContextDelivery/INDEX.md`                                                                                                                                                                         |
| Local M1 tokens              | The local prose-rule section defines no banned-token list or verifier                                                                                              | `spec-principles.md:35-39`                                                                                                                                                                         |
| Template configuration       | The referenced template config key is absent                                                                                                                       | `docs/project-reference/spec-system-reference.md:15`; no matching key in `docs/project-config.json`                                                                                                |
| Template parity              | Project and portable templates disagree on the Section 6 interaction-surface contract                                                                              | templates-root `detailed-feature-spec-template.md:151-171`; portable `.claude/templates/detailed-feature-spec-template.md:153-235`                                                                 |
| Rule/entity anchor placement | The reference and authoring owner require abstract anchors in Business Rules and Domain Model, while both templates say anchors appear only in Test Specifications | this reference, `:98-99`; `.claude/skills/spec/SKILL.md:79-80`; templates-root `detailed-feature-spec-template.md:254-257`; portable `.claude/templates/detailed-feature-spec-template.md:318-321` |
| Section 8 ownership wording  | The authoring owner both locates TC IDs in Section 8 and says they are never authored directly under the same root                                                 | `.claude/skills/spec/SKILL.md:81-86`; clarify in the canonical skill source                                                                                                                        |

## M1/M2 Compliance Leaks

The corpus now has two auditable specs, but no per-token M1/M2 audit has been run against them. The table below is empty because the audit is OUTSTANDING — this is an unperformed audit, not a compliance PASS.

| File | Line | Section | Mandate | Offending Token / Identifier |
| ---- | ---: | ------- | ------- | ---------------------------- |

Next owner: `/scan --target=feature-spec` populates these rows for `ContextDelivery/README.PerFileConventionInjection.md` and `ContextDelivery/README.SessionPromptLedger.md`. The shared category rules remain enforceable, but exact local-token coverage still cannot be claimed because the local banned-token list is not populated. **Evidence:** `.claude/skills/shared/sdd-artifact-contract.md:59-73`; `spec-principles.md:35-39`.

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
