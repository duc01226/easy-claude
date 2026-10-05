# Domain Entities Reference

<!-- Last scanned: 2026-10-03 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> Read this guide when planning or reviewing framework behavior, domain ownership, state transitions, or data flows. The business contracts are canonical Feature Specs; implementation records are not automatically DDD entities.

## Quick Summary

**Goal:** Trace easy-claude's user-facing contracts to their authoritative concepts, invariants and implementation owners.

- Read the relevant Feature Spec's Business Rules and Domain Model before treating a payload or configuration record as a domain concept.
- Workflow execution, prompt retention, contextual delivery, activation, notifications and presentation have product rules even though this repository has no application ORM.
- Distinguish authored definitions, derived representations and session recovery state. Their owners and freshness/authorization rules differ.
- Use the project's terms. Nested objects, file storage and one package do not establish aggregates, bounded contexts or service synchronization.

## Business Concepts & Rules

| Contract | Concepts and action-changing rules | Read when / authority |
| --- | --- | --- |
| Guided workflow | Workflow, Step, OutcomeGate, WorkflowRun, DeviationLogEntry and optional SpecBaseline. Gate steps and outcome evidence remain fixed; permitted flex preserves dependencies and logs a reason. Nested runs share identity. | Read `docs/specs/WorkflowExecution/README.GuidedWorkflow.md` §4–5 when executing or changing workflow semantics; read `.claude/skills/start-workflow/SKILL.md` → Step Execution Protocol for the execution owner. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Session prompt ledger | SessionRecord owns ordered PromptEntry values; the first recorded entry stays pinned, with an explicit mid-session qualification when necessary. Redact before storage/summarization; keep session identity isolated and cap retained entries. DeliveryRecord tracks reminder presence, not business completion. | Read `docs/specs/ContextDelivery/README.SessionPromptLedger.md` §4–5 when changing goal retention/reminders. Executable owners: `.claude/hooks/lib/prompt-ledger-store.cjs:298–323,420–427`; `.claude/hooks/prompt-ledger.cjs:95–158`. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Per-file conventions | ConventionClass relates matchers, content signals and deliverable guidance. Exclusions and supported file/content matchers decide applicability; delivery is scoped to the current working context. | Read `docs/specs/ContextDelivery/README.PerFileConventionInjection.md` §4–5 when changing class matching/delivery; read `.claude/hooks/lib/file-conventions.cjs` → `explainGroupMatch` for source enforcement. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Protocol delivery | A Protocol has one canonical source and group; published text and guide entries are projections. DeliveryRecord belongs to a scope; a universal protocol's delivery contract differs from a skill-carried protocol. | Read `docs/specs/ContextDelivery/README.ProtocolDelivery.md` §4–5 when changing projection or presence behavior; read `.claude/hooks/lib/protocol-delivery.cjs` → `planDelivery`, `deliver`, `recordCompaction` for runtime ownership. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Routing and skill activation | ActivationPolicy/SkillActivationPolicy resolve effective preferences; AuthorizationScope distinguishes a named operation and required calls from an outstanding human choice. Routing selects a workflow; execution owns advancement. | Read `docs/specs/ContextDelivery/README.WorkflowRouting.md` and `docs/specs/Adoption/README.SkillActivationPolicy.md` §4–5 when changing automatic selection or authorization. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Adoption switches | ProjectSwitches, SkillVisibility and OwnershipRecord describe graph activity, host skill exposure and generator-owned settings. Generator ownership is limited to entries it wrote; user settings remain separately owned. | Read `docs/specs/Adoption/README.AdoptionSwitches.md` §4–5 and `docs/specs/Adoption/README.AdoptionSwitches-Part2.md` when changing adoption/profile behavior. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Session notifications | Assistant Session and Alert distinguish main/delegated conversations and session-end, question and turn-complete events. Pending delegated work or a one-shot wakeup delays turn-complete alerts; recurring schedules do not hold them indefinitely. | Read `docs/specs/Notifications/README.AssistantSessionNotifications.md` §4–5 when changing alert semantics; `.claude/hooks/notifications/notify.cjs:75–171` owns event eligibility. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |
| Presentation decks | Deck owns ordered Slides and SpeakerNotes. ConformanceVerdict is judged against a ConformanceProfile; presenter and feature-review outputs have different editing/export obligations. A static verdict does not prove browser interactions. | Read `docs/specs/Presentation/README.PresentationDecks.md` §4–5 when changing deck behavior; `.claude/skills/presentation-builder/scripts/validate-presentation.cjs:20–45` owns profile selection and manual-verification requirements. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location. |

These are documented product concepts, not a database entity inventory. Canonical specifications establish intended semantics; executable checks establish which parts are enforced mechanically. Read `docs/project-reference/spec-system-reference.md` when resolving canonical versus derived spec ownership. Default-root example; `docsRoots.projectReference.path` in `docs/project-config.json` overrides this location.

Read `docs/specs/ContextDelivery/README.ProjectContextIntake.md` when changing project-rule discovery and phase-specific loading. The universal bundle delivers the loading gate; delivery records do not prove that required references were read or followed. Convention suppression requires verified successful complete loading of the correct project document. Default-root example; `specRoots.business.path` in `docs/project-config.json` overrides this location.

## Representations & Transformations

- Hook-event JSON is adapted by `.claude/hooks/lib/stdin-parser.cjs` → `parseHookEvent` and `.claude/hooks/lib/hook-runner.cjs` → `runHook`. This infrastructure representation is not a domain DTO hierarchy (`hook-runner.cjs:294–306`).
- Workflow JSON resolves into mode-specific occurrences, groups, roles and outcome gates through `.claude/scripts/lib/workflow-manifest.cjs:162–212`. Read `.claude/workflows.schema.json` when changing accepted definition shapes; read the resolver when tracing consumer semantics.
- Prompt text passes host-content filtering, redaction, bounding and goal-line generation before creating a PromptEntry (`.claude/hooks/lib/prompt-ledger-store.cjs:298–323`). Markdown and digests derive from that record; they are not separate authoritative prompt stores.
- Skill frontmatter becomes catalog records through `.claude/scripts/scan_skills.py:127–175`; catalog output is a discovery projection. Read `.claude/docs/skills/README.md` when locating a skill and `.claude/docs/skill-naming-conventions.md` when authoring its identity.
- Convention-class setup preserves maintainer ownership: only `origin: detected` classes with a matching `detectedFingerprint` may be refreshed automatically. Read `.claude/hooks/lib/convention-merge.cjs` when refreshing detected classes; `mergeDetected` owns that merge and retains hand-owned or edited classes.
- Module and Context Group are project-configuration records, not business entities. Read `docs/project-config.json` → `modules`, `contextGroups` when selecting file ownership/rules; `.claude/hooks/lib/project-config-loader.cjs` → `getModuleForPath`, `getContextGroup` consumes them.

## Persistence & Relationships

SessionRecord contains PromptEntry values and has a separately persisted DeliveryRecord. The authoritative prompt file is `ledger.json`; `ledger.md` is written afterward as a reader view. Delivery success is recorded after the output callback succeeds (`.claude/hooks/lib/prompt-ledger-store.cjs:503–519`; `.claude/hooks/prompt-ledger.cjs:118–134`). The default per-session location is project `tmp/prompt-ledger`; `CK_PROMPT_LEDGER_DIR` may relocate it (`prompt-ledger-store.cjs:460–467`). Cleanup requires both the store's ownership marker and its known directory shape; resemblance alone never grants deletion authority (`prompt-ledger-store.cjs:623–641`).

Workflow recovery state contains workflow identity, ordered steps, current index, completed steps and todo snapshots. `.claude/hooks/lib/workflow-state.cjs:35–46,75–105,119–175` owns its file representation and progression helpers; `.claude/hooks/session-init.cjs:321–330` clears it on a host clear and loads it on continuation. It is legacy OS-temp state under `CK_TMP_DIR/workflow`; it does not prove that a model-executed quality gate passed (`workflow-state.cjs:17–28`).

Code-graph SQLite stores source nodes, edges and metadata (`.claude/scripts/code_graph/graph.py:26–71`). It models code topology, not business records. No application database, ORM migration or broker owner is declared by `docs/project-config.json` → `databases`, `messaging`, `api`; do not infer a missing persistence layer or create one to fit this guide.

## Ownership & Boundary Flows

- Authored Skill/Agent/Workflow/Protocol definitions live under `.claude/`; catalogs and host mirrors are downstream projections. Read `.claude/docs/framework-portability.md` when changing these boundaries; regenerate through the declared sync owner.
- The workflow registry/schema defines accepted configuration; the manifest resolver produces execution inputs; `start-workflow` owns flex decisions; `workflow-end` verifies closure. The state helper is a recovery mechanism, not a replacement for those contracts (`workflow-manifest.cjs:47–107,162–212`; GuidedWorkflow §4 BR-GWF-03/16).
- Notification eligibility is decided before provider delivery. Providers own optional external messaging; they do not decide whether delegated/background work makes the main turn complete (`notify.cjs:122–171`).
- Prompt recording and reminder delivery share a session identity but separate records. Missing identity, opt-out or failure produces no ledger output; main-conversation checkpoints do not feed helper agents the user history (`prompt-ledger.cjs:88–106` and §4 BR-SPL-06/08/09/10 of the ledger spec).

## Context and Review Classification

Context-group `referenceDocs` paths are repository-relative; selected root `referenceDocs[].filename` resolves beneath the configured project-reference root. Matching requires the extension filter, a supported path/name or eligible bounded content include, and no exclusion. `on` controls reminder delivery, not whether required review rules apply. Read `.claude/hooks/lib/file-conventions.cjs` when evaluating matching/delivery. Keep the detected-origin/fingerprint maintainer boundary above.

Runtime skill selection is advisory and preserves host permissions. Read `.claude/hooks/skill-activation-inject.cjs` and `.claude/hooks/workflow-route-inject.cjs` when tracing selection; SubagentStart delivers protocols and skill context, while UserPromptExpansion delivers selected skill/overlay guidance. Persisted workflow snapshots still do not advance model-executed gates.

## Evidence Limits

Concepts in specifications are business vocabulary; names such as WorkflowRun or OutcomeGate do not imply a class, ORM table or DDD aggregate. Runtime enforcement may be model-driven or mechanical: inspect the cited owner before relying on a guarantee. Empty service/database configuration establishes this repository's configured surface, not every optional tool an adopter could enable.

## Closing Reminders

Start from the business contract, trace representation and storage owners, then follow consumer/provider direction. Preserve session isolation, pinned/redacted prompt data and generator ownership. Treat projections and recovery snapshots as evidence carriers; verify required outcomes through their execution owners.
