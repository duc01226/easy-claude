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

- The canonical capability path is `docs/specs/{Bucket}/README.{FeatureName}.md`; Section 8 is the canonical Test Specification registry.
- The current Feature Spec corpus is absent, so use the project master template and never infer compliance, conventions, or a gold-standard exemplar from a zero-document sample.
- Enforce M1-M7, the complete canonical TC fields, and stack-portable evidence anchors before accepting a Feature Spec.

**Decision sequence:** inspect the current corpus -> study the master template and any listed exemplars -> author through the spec owner -> verify all eight sections, M1-M7, TC fields, and evidence -> refresh derived indexes and technical views.

**Key Rules:**

- MUST ATTENTION follow the 8-section structure in exact order (see below); narrative prose in every section is STRICTLY tech-free
- MUST ATTENTION include Section 8 (Test Specifications) with `TC-{FEATURE}-{NNN}` IDs, `Business Intent / Invariant Guarded`, and `Evidence: [Source: namespace/service/id]` (abstract anchor; legacy `[Source: FilePath:Line]` DEPRECATED)
- MUST ATTENTION study the master template and every concrete gold standard listed below before writing any new feature doc
- MUST keep feature doc path: `docs/specs/{Bucket}/README.{FeatureName}.md`
- MUST NOT apply line-count caps to Feature Specs; split the capability only when TCs>40 or distinct module-level capabilities emerge

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:END -->

---

## Directory Convention

Feature docs path: `docs/specs/{Bucket}/README.{FeatureName}.md` (no line-count cap; split when TCs>40 or distinct module-level capabilities emerge). Each bucket also includes `INDEX.md`. The spec root is fixed at `docs/specs/` for all projects.

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
├── templates/                             # Project authoring templates
│   └── detailed-feature-spec-template.md
├── copilot-registry.json                  # Copilot registry data
└── project-config.json                    # Machine-readable project map
```

The configured authored and derived spec roots are absent from the current tree. **Evidence:** `docs/project-config.json:153-155`; `docs/project-reference/docs-index-reference.md:37-38,87,144-147`.

## Template Paths

| Template / Owner | Path | Purpose | Used by Feature Docs | Evidence |
| --- | --- | --- | ---: | --- |
| Feature document convention | `docs/specs/{Bucket}/README.{FeatureName}.md` | Canonical capability document | 0 | `docs/project-reference/spec-system-reference.md:26-36` |
| Project master template | `docs/templates/detailed-feature-spec-template.md` | Current project authoring template | 0 | `docs/project-reference/docs-index-reference.md:144-147` |
| Portable source template | `.claude/templates/detailed-feature-spec-template.md` | Bootstrap source when the project template is absent | 0 | `.claude/hooks/session-init-docs.cjs:54-56,150-167` |
| Feature authoring owner | `.claude/skills/spec/SKILL.md` | Owns authoring and Test Specifications lifecycle | N/A | `.claude/skills/spec/SKILL.md:17-31,47-60` |
| Test-case format authority | `.claude/skills/shared/tc-format.md` | Owns TC shape, evidence, coverage, cardinality, and numbering | 0 | `.claude/skills/shared/tc-format.md:49-167,186-208` |

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
- **Code link:** `CoveredBy` records representative coverage; a configured test-spec annotation supplies the complete one-to-many test join. This repository currently configures no annotation scan (`docs/project-config.json:157`).

## Evidence Rule

EVERY test case MUST ATTENTION carry a machine-readable evidence anchor:

```markdown
**Evidence:** `[Source: {namespace}/{service}/{id}]` (namespace in operation | event | component | schema | requirement | rule | constraint | test)
```

The abstract `[Source: namespace/service/id]` form is canonical (see `.claude/skills/shared/tc-format.md`). The legacy `[Source: {FilePath}:{LineNumber}]` form is **DEPRECATED** - it is stack-fragile and breaks on refactor; do not author it in new or migrated docs. The lone exception is the per-TC `CoveredBy:` link (legacy name: `IntegrationTest:`), which stays a physical `{TestFile}::{MethodName}` path. NEVER use `TBD` placeholders in shipped docs. NEVER omit the Evidence field.

---

<!-- SCAN-MANAGED BOUNDARY - refresh the project inventory below with /scan --target=feature-spec. -->

## App-to-Service Mapping

No product application or service boundary is configured, so there is no ownership mapping to infer.

| App Name | Backend Services | Doc Directory | Doc Count | Evidence |
| --- | --- | --- | ---: | --- |
| N/A — no configured product application | None | Configured root is absent | 0 | `docs/project-config.json:23-73,106-108,149-155`; `docs/project-reference/docs-index-reference.md:37-38,87,144-145` |

## Gold Standard References

No worked Feature Spec exemplar exists. Study the current master template before authoring the first capability document:

- `docs/templates/detailed-feature-spec-template.md` — project master template (**Evidence:** `docs/project-reference/docs-index-reference.md:144-147`)

## Feature Code Registry

No capability codes are registered because no canonical Feature Spec exists.

| Code | Feature | Module | Status | Evidence |
| --- | --- | --- | --- | --- |
| N/A | No registered capability | N/A | Corpus absent | `docs/project-reference/docs-index-reference.md:37-38,87` |

## Thin-Index Files

No bucket `INDEX.md` or parent capability index exists. **Evidence:** `docs/project-reference/docs-index-reference.md:38,87,144-145`.

## Section Structure

Corpus denominator: 0 Feature Specs. Observed frequency is `N/A (0/0)` for every prescribed section; no percentage or standard/optional classification is statistically defined.

| Order | Prescribed Section | Observed Frequency |
| ---: | --- | --- |
| 1 | Overview | N/A (0/0) |
| 2 | Glossary | N/A (0/0) |
| 3 | User Stories & Acceptance Criteria | N/A (0/0) |
| 4 | Business Rules | N/A (0/0) |
| 5 | Domain Model | N/A (0/0) |
| 6 | Process Flows | N/A (0/0) |
| 7 | Permissions & Roles | N/A (0/0) |
| 8 | Test Specifications | N/A (0/0) |

The structure is prescribed by the master template but is not an observed corpus convention. **Evidence:** `docs/templates/detailed-feature-spec-template.md:33-195`; `docs/project-reference/docs-index-reference.md:37-38`.

## Documentation Conventions

| Concern | Current Rule | Evidence |
| --- | --- | --- |
| Location and name | One canonical capability document per bucket; each bucket index is `INDEX.md` | `docs/project-reference/spec-system-reference.md:9-36` |
| Section order | Eight sections in the order above | `docs/templates/detailed-feature-spec-template.md:33-195` |
| Story and criteria IDs | `US-{FC}-NN` and `AC-{FC}-NN` | `docs/templates/detailed-feature-spec-template.md:59-72` |
| Rule IDs | `BR-{FC}-NN` plus an abstract rule anchor | `docs/templates/detailed-feature-spec-template.md:79-89` |
| Test IDs | `TC-{FEATURE}-{NNN}` with category-decade numbering | `.claude/skills/shared/tc-format.md:49-52,186-208` |
| Required TC content | Descriptive name/priority, Objective, Business Intent / Invariant Guarded, Preconditions, Demo Flow/GWT, Expected Result, Acceptance Criteria, Test Data, Edge Cases, conditional Transition Invariants, Evidence, Related Behaviors, CoveredBy, and Status | `.claude/skills/shared/tc-format.md:49-137` |
| Evidence | Stack-portable `[Source: namespace/service/id]`; physical code coordinates stay outside prose | `.claude/skills/shared/sdd-artifact-contract.md:59-73,379-402` |
| Coverage cardinality | One business TC may be guarded by many tests through the shared test-spec annotation | `.claude/skills/shared/tc-format.md:157-175` |
| Ownership | Business specs are authored; indexes and technical views are derived single-writer artifacts | `docs/project-reference/spec-system-reference.md:17-54` |

## Coverage Gaps

| Area | Current State | Evidence / Next Owner |
| --- | --- | --- |
| Canonical corpus | No bucket, Feature Spec, or catalog exists | `docs/project-reference/docs-index-reference.md:37-38,87,144-145`; create through `$spec` when a capability is ready |
| Module distribution | All seven configured library modules have zero Feature Specs; no distribution is measurable | `docs/project-config.json:23-73`; corpus evidence above |
| Worked exemplar | No gold-standard capability document exists | Master template only: `docs/templates/detailed-feature-spec-template.md` |
| Feature-code registry | No concrete code exists | Corpus evidence above |
| Thin indexes | No bucket index exists | `docs/project-reference/docs-index-reference.md:38,87` |
| Local M1 tokens | The local prose-rule section defines no banned-token list or verifier | `docs/project-reference/spec-principles.md:35-39` |
| Template configuration | The referenced template config key is absent | `docs/project-reference/spec-system-reference.md:15`; no matching key in `docs/project-config.json` |
| Template parity | Project and portable templates disagree on the Section 6 interaction-surface contract | `docs/templates/detailed-feature-spec-template.md:151-171`; `.claude/templates/detailed-feature-spec-template.md:153-235` |
| Rule/entity anchor placement | The reference and authoring owner require abstract anchors in Business Rules and Domain Model, while both templates say anchors appear only in Test Specifications | `docs/project-reference/feature-spec-reference.md:98-99`; `.claude/skills/spec/SKILL.md:79-80`; `docs/templates/detailed-feature-spec-template.md:254-257`; `.claude/templates/detailed-feature-spec-template.md:318-321` |
| Section 8 ownership wording | The authoring owner both locates TC IDs in Section 8 and says they are never authored directly under the same root | `.claude/skills/spec/SKILL.md:81-86`; clarify in the canonical skill source |

## M1/M2 Compliance Leaks

No per-feature leak rows exist because the canonical corpus is absent. This is an unavailable audit, not a compliance PASS.

| File | Line | Section | Mandate | Offending Token / Identifier |
| --- | ---: | --- | --- | --- |

The shared category rules remain enforceable, but the scan cannot claim exact local-token coverage because the local banned-token list is not populated. **Evidence:** `.claude/skills/shared/sdd-artifact-contract.md:59-73`; `docs/project-reference/spec-principles.md:35-39`.

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
