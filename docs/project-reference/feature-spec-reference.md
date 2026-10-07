<!-- Last scanned: 2026-10-03 -->

# Feature Documentation Reference

Read this guide when authoring, reviewing, splitting, or tracing a business Feature Spec. It records the local owner format and discovery paths; the spec authoring and TC contracts own the full procedures.

- Keep one canonical business owner per capability under the configured authored root. Resolve the native profile before choosing a representation; this repository currently uses the strict default.
- Preserve the eight-section order, business-visible intent, stable logical IDs, and verified evidence. A matching test ID or complete heading list proves neither coverage nor semantic quality.
- Keep provisional evidence explicit. Upgrade a draft through the spec owner after implementation; preserve derived-artifact ownership and existing project-template customizations.

## Directory Convention

Resolve roots from `docs/project-config.json` before assuming paths. Here `specRoots.business` selects `docs/specs/` with `authorship: authored` and `m1Policy: enforced`; `specRoots.technical` selects `docs/specs-technical/` with `authorship: derived` and `m1Policy: exempt`. The technical root is configured but has no generated tree yet. `specArtifacts` is absent, so the strict default contract applies. A declared malformed profile blocks rather than falling back. Read `.claude/skills/shared/sdd-artifact-contract.md` when selecting a native profile or judging ownership and semantic obligations.

The local canonical path is `<business-spec-root>/{Bucket}/README.{FeatureName}.md`. A bucket groups multiple capabilities; it does not limit the bucket to one spec. `INDEX.md` is a derived capability router. Continuation files retain the parent capability and existing TC identities; `docs/specs/Adoption/README.AdoptionSwitches-Part2.md` declares its `parent_spec` in frontmatter. Read `.claude/skills/spec/references/author.md` when creating or splitting an owner; its size procedure uses more than forty TCs or distinct module-level capabilities as split triggers, without imposing a line-count cap. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location.

Use the current bucket indexes for discovery rather than copying a census into this guide:

| Read when changing… | Canonical owner/router |
| --- | --- |
| Adoption behavior or automatic skill selection | `docs/specs/Adoption/INDEX.md`; ADS main owner `docs/specs/Adoption/README.AdoptionSwitches.md` and continuation; SAP owner `docs/specs/Adoption/README.SkillActivationPolicy.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Context injection, protocol delivery, prompt history, workflow routing | `docs/specs/ContextDelivery/INDEX.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Assistant session notifications | `docs/specs/Notifications/INDEX.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Presentation deck standards | `docs/specs/Presentation/INDEX.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Guided workflow execution | `docs/specs/WorkflowExecution/INDEX.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |

The Adoption router currently links the ADS continuation without the main owner; use the explicit main path above until regenerated through the spec index owner. There is no product app/service mapping to infer: the configured modules are framework libraries.

## Template Paths

Read `docs/templates/detailed-feature-spec-template.md` when starting a local Feature Spec. Read `.claude/skills/spec/SKILL.md` and its selected author mode when choosing the lifecycle procedure. Read `.claude/skills/shared/tc-format.md` when writing or reviewing Section 8; it owns complete TC fields, property cases, evidence, deprecation, numbering, and cardinality. Default-root example; `docsRoots.templates.path` in `docs/project-config.json` overrides this location.

`workflowPatterns.featureDocTemplate` is not configured here. The author guide selects the project template by default. `.claude/templates/detailed-feature-spec-template.md` is the bootstrap source, copied only when the project template is absent; `.claude/hooks/session-init-docs.cjs:179-197` preserves an existing local template. Do not overwrite that customization to obtain parity.

The project template and author guide differ on interaction-surface detail and rule/entity-anchor placement. Follow the governing author procedure for those semantic obligations, and resolve template alignment through its owner. Read `.claude/skills/spec/references/author.md` when a template omits a required condition; a shorter local template is not permission to omit it. Representative specs illustrate shape; none is declared a ratified gold standard.

## 8-Section Structure

The strict default uses these sections in order. Narrative prose stays technology-free; technical identifiers belong in allowed evidence carriers, frontmatter, or Mermaid blocks. Code remains the technical source of truth.

| Order | Section | Authoring purpose |
| ---: | --- | --- |
| 1 | Overview | Who uses the capability, what it does, and why it matters |
| 2 | Glossary | Domain terms and their business meanings |
| 3 | User Stories & Acceptance Criteria | `US-{FC}-NN` stories and `AC-{FC}-NN` observable criteria |
| 4 | Business Rules | `BR-{FC}-NN` invariants, decisions and state transitions; `[HARD]`/`[SOFT]` strength and abstract rule anchors |
| 5 | Domain Model | Entities, value objects, relationships, plain business types and abstract entity anchors; no transport schemas |
| 6 | Process Flows & Interaction Surface | Business journeys; for a UI-bearing feature, view inventory, navigation, key states and per-story interaction flows; a feature without UI records the omission reason |
| 7 | Permissions & Roles | Business roles, permitted actions and scope, without auth implementation detail |
| 8 | Test Specifications | Canonical business cases tied to criteria/rules, with intent, observable outcomes, evidence and coverage carriers |

Read `.claude/skills/shared/sdd-artifact-contract.md` when reviewing M1–M7: technology-free prose, no source identifiers in prose, logical-ID-first traceability, one testable interpretation, rebuild completeness, reviewer enforcement, and user/QC-demoable visibility. The evidence carve-outs do not turn a technical-only scenario into a business case. Keep technical mechanisms in their appropriate source/derived owner.

## Test Case ID Format

The strict default identity is `TC-{FEATURE}-{NNN}`. Section 8 is the registry; check existing IDs before allocation, use the canonical category-decade rules, and preserve deprecated IDs instead of deleting or reusing them. One business TC may have many covering tests; do not split a business outcome to force one method per TC.

Local capability codes are discoverable through owner frontmatter and bucket indexes:

| Code | Capability | Canonical owner |
| --- | --- | --- |
| ADS | Adoption Switches | `docs/specs/Adoption/README.AdoptionSwitches.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| SAP | Framework Skill Activation Policy | `docs/specs/Adoption/README.SkillActivationPolicy.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| PFCI | Per-File Convention Injection | `docs/specs/ContextDelivery/README.PerFileConventionInjection.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| PCI | Project Context Intake | `docs/specs/ContextDelivery/README.ProjectContextIntake.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| PDL | Protocol Delivery | `docs/specs/ContextDelivery/README.ProtocolDelivery.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| SPL | Session Prompt Ledger | `docs/specs/ContextDelivery/README.SessionPromptLedger.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| WFR | Workflow Routing | `docs/specs/ContextDelivery/README.WorkflowRouting.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| GWF | Guided Workflow Execution | `docs/specs/WorkflowExecution/README.GuidedWorkflow.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| NT | Assistant Session Notifications | `docs/specs/Notifications/README.AssistantSessionNotifications.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| PD | Presentation Decks | `docs/specs/Presentation/README.PresentationDecks.md` Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |

Read `.claude/skills/shared/tc-format.md` before writing or validating a case. Preserve its complete fields: title/priority, Objective, Business Intent / Invariant Guarded, Preconditions, Real-World Reachability, Demo Flow/GWT, Expected Result, Acceptance Criteria, Test Data, Edge Cases, Evidence, Related Behaviors, CoveredBy and Status. Include Deliberate Impossible State only when intentionally constructing one, and Transition Invariants when lifecycle states exist. Property cases for hard rules/entity invariants declare `inputDomain`, `invariant`, and `boundaryCounterCase`; probe the canonical invariant categories and preserve healthy behavior for a business-visible bugfix. Technical-only fixes do not manufacture business TCs.

## Evidence Rule

For implemented behavior, each TC carries an abstract `[Source: namespace/service/id]` anchor. Allowed namespaces are `operation`, `event`, `component`, `schema`, `requirement`, `rule`, `constraint`, and `test`. Verify that the anchor resolves to real source behavior; legacy physical `[Source: FilePath:Line]` evidence is deprecated.

A reference-only idea draft may use `Evidence: TBD` with `Status: Planned`, `provisional: true`, and the explicit DRAFT banner. Read `.claude/skills/spec/references/author.md` when upgrading it: replace every pending anchor with verified code evidence and reconcile coverage before clearing provisional status. A remaining TBD keeps the draft provisional; it cannot be presented as verified implemented evidence.

`CoveredBy` is the physical QA exception: it may name test-file/method links, an accepted test-filter expression, `Manual-QC`, or `Untested`. Legacy `IntegrationTest` is migration input only. The field is representative, not an exhaustive join. Read `.claude/skills/shared/tc-format.md` when evaluating one-to-many coverage and test status; retain explicit conditional/untriggered and planned limitations.

## Traceability & Verification

For each claimed case, resolve the canonical owner and TC, inspect its preconditions/actions/owned outcome, then trace the coverage carrier to a real executor and its assertion. Confirm suite membership or test registration, not merely an ID comment. Record result evidence from the actual run; an aggregate pass proves only the cases whose assertions execute.

For example, `docs/specs/Adoption/README.SkillActivationPolicy.md` TC-SAP-003 links to the registered suite case at `.claude/hooks/tests/suites/skill-activation-policy.test.cjs:98`: a restricted fixture enters the real host launchers, and assertions check the emitted human-choice and authorization conditions. The suite runner discovers files and awaits test callbacks at `.claude/hooks/tests/run-all-tests.cjs:100-109,125-145`. These paths explain how to trace evidence; their existence does not establish a current passing result. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location.

Read `docs/project-reference/integration-test-reference.md` when choosing the test runner and isolation contract. Read `.claude/skills/spec/references/sync.md` when reconciling coverage or unmatched behavior, and `docs/project-reference/workflow-spec-test-code-cycle-reference.md` when coordinating behavior, specs, tests and derived views. Default-root example; `docsRoots.projectReference.path` in `docs/project-config.json` overrides this location.

## Coverage Gaps & Quality Limits

- `techSpecScan` is deliberately omitted: there is no configured annotation scan from which to derive a complete TC/test join. The technical generator rejects missing scan fields at `.claude/skills/tech-spec/scripts/generate-tech-specs.mjs:97-102`. Do not fabricate an annotation pattern or report generation success.
- The strict-default provenance sidecar `docs/specs/.sdd-provenance-map.jsonl` contains source-verified authored guard mappings for the 143 WorkTracking cases (332 canonical case/executor joins). It does not cover every repository anchor or establish runtime results. <!-- path-role: generated-output --> Read `.claude/skills/shared/sdd-artifact-contract.md` when recovering physical coordinates from abstract anchors; route missing verified mappings through the spec owner. Existing related-doc tables and selected direct traces do not prove a complete anchor map. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location.
- Complete executable coverage remains `UNKNOWN` until each claim is matched to its executing assertions and result. Planned and untriggered cases are not test failures or proof of implemented coverage. Library-module inventories do not establish a list of missing business capabilities.
- Read `.claude/scripts/codex/verify-sdd-semantic-compliance.mjs` when assessing automated M1/M2 detection scope. Dictionary/source-shape checks do not prove all semantic mandates, and no local banned-token list is configured. Review implementation-file vocabulary outside carriers through the spec owner; public command vocabulary may require a different disposition from private source coordinates.

## Closing Reminders

Preserve the canonical owner, eight-section semantics, stable IDs, draft lifecycle and verified evidence. Read the author/TC owners at the decision point; use bucket indexes for discovery. Keep coverage unknown when assertions/results or anchor recovery are unresolved, and regenerate derived artifacts through their owning command.
