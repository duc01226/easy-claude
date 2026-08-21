# Releasable PBI and Full-Flow Demo Contract

Portable contract for every generated Product Backlog Item and its UI mockup. PBI creation, review, DoR, story slicing, and mockup skills MUST preserve this contract.

## Quick Summary

**Goal:** Make every PBI one independently releasable actor-facing outcome with a complete observable journey, while carrying large-idea slice boundaries into stories, mock-ups, plans, and the all-PBI presentation without creating a default roadmap file.

**Summary:**

- Evaluate the shared four-signal `isLargeIdea` rule before PBI creation; true requires the complete five-field decomposition block and a stable owning slice ID.
- Keep the PBI outcome complete: actor, entry-to-result journey, visible/persisted truth, applicable states, non-goals, dependencies, evidence, and acceptance criteria.
- UI PBIs require the full page/view, navigation, component, state, and connected mock-app flow surface; technical/foundation/setup work stays attached as enabling work.
- Downstream stories, prioritization, plans, mock-ups, and presentation consume decomposition read-only; all-false scope omits roadmap fields; explicit roadmap/EXEMPT/framework branches follow the shared contract.

**Main steps:** evaluate applicability → author one releasable outcome → validate the full flow and UI surface → attach enabling work → propagate slice context read-only → record the gate as PASS or BLOCKED.

**Workflow:** evaluate applicability → author one releasable outcome → validate the full flow and UI surface → propagate slice context read-only → record the gate as PASS or BLOCKED.

**Key Rules:** a blocked or technical-only PBI cannot become releasable by assumption; one static screen is not a full-flow UI outcome; ordinary PBI work NEVER creates `docs/product-roadmap.md`.

## Releasable PBI outcome

Every generated PBI is one independently releasable product outcome, not a technical layer or an internal work package. It MUST define:

- a primary actor and the observable business outcome that actor can achieve;
- a complete outcome journey: entry/context → action/input → validation or decision → success/result → the resulting visible or persisted truth → exit or next action;
- applicable access, loading, empty, error, recovery, duplicate-submit, refresh, and persistence behavior;
- explicit in-scope behavior, non-goals, dependencies, evidence, and acceptance criteria;
- implementation/enabling work as tasks or dependencies attached to this outcome, never as a standalone technical-only, foundation-only, migration-only, or “set up X” PBI.

If the proposed work cannot be demonstrated as a business outcome, do not generate a PBI. Reframe it as an enabling task under a releasable PBI, attach it to an existing releasable outcome, or ask the owner to define the missing outcome.

Backend-only work MUST state the observable business outcome and the explicit reason no user-facing surface is needed. Backend-only is not permission to emit a technical-only PBI.

## Large-idea decomposition handoff

Before creating a PBI, evaluate the shared rule:

```text
isLargeIdea = multipleIndependentOutcomes
            || ambiguousOrResearchHeavy
            || releaseScopeDecomposition
            || oversizedPbiThatMustSplit
```

When any signal is true, the owning PBI MUST carry the complete `large_idea_decomposition` block from `product-roadmap-contract.md`, including stable `outcome_slices`, ordered `dependencies_order`, explicit `non_goals`, `risks_evidence` with owners/statuses, and `deferred_work_owner`. The current PBI repeats its owning slice ID and remains one independently releasable actor-facing outcome. Stories, mock-ups, prioritization, plans, and the all-PBI presentation inherit the block read-only and must surface missing/conflicting fields as a gate finding. This embedded block replaces a default roadmap artifact; do not create `docs/product-roadmap.md` unless the user explicitly requests the standalone roadmap capability.

When all signals are false, omit the decomposition block and roadmap/milestone placeholders. An existing roadmap supplied by a user is read-only context. An explicit roadmap request, EXEMPT change, or framework/library change follows its own branch in the shared contract.

## UI PBI full-flow surface

For a UI-bearing PBI, “releasable” includes a demoable application flow, not one isolated screen. The PBI and its mockup MUST identify:

- a page/view inventory containing every view needed to enter, perform, complete, recover from, and leave the outcome;
- a navigation map connecting those views, including entry points and exits;
- a component inventory covering reusable/common, domain-shared, and page-level components needed by the flow;
- observable component and page states, including default, loading, empty, error, success, and permission states when applicable;
- a start-to-finish demo journey that reaches the stated business outcome and shows the resulting truth.

The mockup MUST be one self-contained mock app outcome: one HTML file may contain many navigable pages/views, panels, and state variants, but a single static screen or disconnected collection of screens is not sufficient. “Many pages” means all pages required by the actual full flow, not an arbitrary page-count target.

## Gate evidence

The producing or reviewing skill records:

```markdown
## Releasable Outcome Gate
- Status: PASS | BLOCKED
- Actor and observable outcome: { ... }
- Full-flow journey: {entry → action → result → exit}
- Persistence/access/error/recovery coverage: { ... | N/A with reason}
- Technical-only work: {attached enabling tasks | none}
- UI surface: {page/view inventory + navigation + components + states | N/A — backend-only with reason}
- Evidence: {AC/test/demo/mockup references}
```

`BLOCKED` is the only valid result when the outcome, full flow, or required UI surface is missing or ambiguous. Downstream story, mockup, design, planning, and implementation gates MUST NOT convert a blocked PBI into a releasable one by assumption.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce one independently releasable actor-facing PBI with a complete entry-to-result journey and evidence, preserving large-idea slice boundaries without creating a default roadmap artifact.

**IMPORTANT MUST ATTENTION Main steps:** classify applicability → validate the actor/outcome and complete journey → attach technical enabling work → verify UI page/view/navigation/component/state/full-flow coverage when applicable → propagate decomposition read-only → record `Releasable Outcome Gate: PASS | BLOCKED`.

**IMPORTANT MUST ATTENTION** all five decomposition fields are required when any signal is true; all-false scope omits roadmap placeholders; `BLOCKED` remains blocked until evidence and owner decisions resolve the gap.
