---
module: WorkTracking
service: work-tracking
feature_code: TPT
status: draft
provisional: true
owner: Framework maintainers
last_updated: 2026-10-09
source_of_truth: README.TaskTracking.md
parent_spec: README.TaskTracking.md
continuation: 9
---

> **DRAFT — inherits the main owner’s provisional evidence. All fifteen cases are Untested; CoveredBy names the current source registrations; their execution is NOT RUN.**

# Work tracking case continuation 9

## Related Documentation

- `README.TaskTracking.md` §§3–7 owns current schema3 behavior, authorization, states and invariants.
- Parts2–8 conserve existing identities; Part7 owns supported compatibility/migration outcomes and Part8 owns report forms and currentness.
- `docs/adr/0005-work-tracker-vocabulary-and-migration.md` retains the historical decisions and dated current-contract supersession.

## 8. Test Specifications

| Priority | Untested | Executed |
|---|---:|---:|
| P0 | 4 | 0 |
| P1 | 11 | 0 |
| Total | 15 | 0 |

#### TC-TPT-263: Area placement conserves acyclic direct-level ordering [P0]

**Objective:** Keep an area graph valid when changing direct parents or a level.

**Business Intent / Invariant Guarded:** For ALL admitted area graphs, application has no parent, each stated direct parent is no deeper than its child, and self/transitive cycles never save. Equal, skipped and unset levels remain allowed.

**Proves:** FR-TPT-062, AC-TPT-43, BR-TPT-05, BR-TPT-27, INV-TPT-01, INV-TPT-07.

**Preconditions:**

- areas A at application, P at product, M at module and F at feature exist with multiple valid parent choices
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect F, choose a valid direct parent, preview/save and reread; then try self, descendant, deeper parent and a level edit that would invalidate a direct child.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given areas A at application, P at product, M at module and F at feature exist with multiple valid parent choices
When inspect F, choose a valid direct parent, preview/save and reread; then try self, descendant, deeper parent and a level edit that would invalidate a direct child
Then valid skipped/equal/unset placement saves only the selected owner, with every direct edge valid
And each invalid placement or reverse-invalidating level edit refuses with exact prior bytes and a retained draft
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | valid skipped/equal/unset placement saves only the selected owner, with every direct edge valid |
| System behavior | each invalid placement or reverse-invalidating level edit refuses with exact prior bytes and a retained draft |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ valid skipped/equal/unset placement saves only the selected owner, with every direct edge valid
- ✅ each invalid placement or reverse-invalidating level edit refuses with exact prior bytes and a retained draft
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all finite admissible multiple-parent area graphs and current optional levels",
  "invariant": "For ALL admitted area graphs, application has no parent, each stated direct parent is no deeper than its child, and self/transitive cycles never save. Equal, skipped and unset levels remain allowed.",
  "boundaryCounterCase": "each invalid placement or reverse-invalidating level edit refuses with exact prior bytes and a retained draft"
}
```

**Edge Cases:**

- Unset intermediate levels do not impose a transitive level comparison.
- A picker omits self and descendants; a direct request still enforces the same refusal.
- Application with any parent refuses; an empty parent set removes only parent affiliation.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-263]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-062, AC-TPT-43, BR-TPT-05, BR-TPT-27, INV-TPT-01, INV-TPT-07 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-263]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: an area sits beneath another only when the parent is not at a deeper level, so a level may be skipped`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: an application-level area has no parent`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: an unset level constrains nothing`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: the level rule is judged against an area's direct parents only: with an area that has no level between them, a product sits beneath a feature`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: a level change that breaks another record's placement is refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-263: no chain of areas returns to itself`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The tag picker says where an area sits from the areas it is tagged to: the way down to it for one, each of them by name for several, and the top of the project for none [variant: picker-says-where-an-area-sits]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Editing the areas an existing area sits inside offers neither that area nor any area inside it, however deep and whatever its level, while the other areas its level allows stay on offer [variant: area-parents-exclude-itself-and-inside]`
**Status:** Untested

#### TC-TPT-268: Affiliations are owned by the tagged record [P0]

**Objective:** Maintain tags without changing their target records or omitted relations.

**Business Intent / Invariant Guarded:** For ALL valid area/initiative tag sets, supplied relation replaces only its set, omitted relations preserve, empty sets clear, order is immaterial and targets never change.

**Proves:** FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-05, BR-TPT-12, BR-TPT-27, INV-TPT-05, INV-TPT-07.

**Preconditions:**

- task T, two areas A/B and initiative I exist with T tagged to A and I
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect T, replace area tags with B while omitting initiative tags, preview/save/reread T and targets; clear area tags; repeat with reordered tags and invalid targets.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given task T, two areas A/B and initiative I exist with T tagged to A and I
When inspect T, replace area tags with B while omitting initiative tags, preview/save/reread T and targets; clear area tags; repeat with reordered tags and invalid targets
Then T alone carries the requested exact set; omitted initiative tags remain and clearing area tags removes only that relation
And missing/wrong-kind/repeated/self targets, area-to-initiative tags, an empty patch or stale/denied save refuse without owner/target changes
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | T alone carries the requested exact set; omitted initiative tags remain and clearing area tags removes only that relation |
| System behavior | missing/wrong-kind/repeated/self targets, area-to-initiative tags, an empty patch or stale/denied save refuse without owner/target changes |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ T alone carries the requested exact set; omitted initiative tags remain and clearing area tags removes only that relation
- ✅ missing/wrong-kind/repeated/self targets, area-to-initiative tags, an empty patch or stale/denied save refuse without owner/target changes
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all current record kinds, valid/invalid affiliation sets, supplied/omitted/empty relations and current actor/revision controls",
  "invariant": "For ALL valid area/initiative tag sets, supplied relation replaces only its set, omitted relations preserve, empty sets clear, order is immaterial and targets never change.",
  "boundaryCounterCase": "missing/wrong-kind/repeated/self targets, area-to-initiative tags, an empty patch or stale/denied save refuse without owner/target changes"
}
```

**Edge Cases:**

- Capture initial tags writes only the new record.
- Ordinary non-tag linking preserves tags and rejects tag relations in its own input.
- Two independent tagged owners can change without rewriting a shared target; retry semantics remain TC-TPT-123.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-268]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-05, BR-TPT-12, BR-TPT-27, INV-TPT-05, INV-TPT-07 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-268]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: a tag is stored on the tagged record and changes no area or initiative record`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: tag replaces only the links of the relation it names and keeps every other link`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: the link operation never writes a tag: it keeps every stored tag exactly, replaces every other link, and refuses a list that names an area or initiative link`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: an empty tag list clears its relation, an omitted key leaves it and an empty tag patch is refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: a tag names one existing area or initiative once: unknown, repeated, wrongly typed and self targets are refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: an area is placed under areas only: an initiative link declared by an area is refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-268: capture tags a new record to its first areas and initiatives`, `.claude/hooks/tests/suites/task-tracking-maintenance-contracts.test.cjs::TC-TPT-268: a tag is stored only with the tagged record: two tasks tagged to one area from the same read both save and the area record keeps its exact bytes`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-268: a record's detail lists the areas it is tagged to and the initiatives it is linked to, beside its level, type, priority level and due date, and an untagged record says it has none`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A task is tagged to areas and initiatives from its own record through a search that never lists one control per record, only that task changes, and a change to one relation names that relation alone [variant: edit-tags-end-to-end]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Moving an area previews its parent-scope effect and saves only that area while descendant delivery moves between parent counts [variant: area-placement-counting-preview]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A canceled task’s tag preview preserves its exclusion and the saved affiliation leaves eligible and accepted totals unchanged [variant: canceled-tag-counting-preview]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A tag list changed and changed back in another order is no change: nothing is previewed or sent for it, and a real change beside it names only its own relation [variant: same-tags-another-order]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An initiative's own record names other initiatives only when it is linked to one, in the workspace as in the report, while any other record says when it has none [variant: initiative-names-initiatives-only-when-linked]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Edit links neither offers, lists nor sends a tag relation and says tags are changed with Edit tags, and a saved link change leaves the record's tags as stored [variant: edit-links-leaves-tags]`
**Status:** Untested

#### TC-TPT-272: Only kind-owned values save and optional clearing preserves omission [P0]

**Objective:** Keep type, level, priority level and deadline applicability unambiguous.

**Business Intent / Invariant Guarded:** For ALL current kinds, only applicable enumerated owned values save; omitted values preserve, optional null clears, initiative type defaults to idea and cannot clear, and numeric priority ordering remains independent.

**Proves:** FR-TPT-063, AC-TPT-44, BR-TPT-02, BR-TPT-27, INV-TPT-05.

**Preconditions:**

- one record of each current kind exists with stated optional values and numeric priorities
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. choose each kind, inspect its offered values, preview/save a valid value, omit another and clear an optional value; attempt a foreign field, unknown choice and null initiative type.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given one record of each current kind exists with stated optional values and numeric priorities
When choose each kind, inspect its offered values, preview/save a valid value, omit another and clear an optional value; attempt a foreign field, unknown choice and null initiative type
Then each applicable valid value saves only its owned field; omitted facts and numeric priority/order stay unchanged
And foreign-kind fields, unknown enum values and null required initiative type refuse with the prior record and draft intact
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each applicable valid value saves only its owned field; omitted facts and numeric priority/order stay unchanged |
| System behavior | foreign-kind fields, unknown enum values and null required initiative type refuse with the prior record and draft intact |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each applicable valid value saves only its owned field; omitted facts and numeric priority/order stay unchanged
- ✅ foreign-kind fields, unknown enum values and null required initiative type refuse with the prior record and draft intact
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "initiative types feedback/idea/initiative; initiative priorityLevel high/medium/low; area levels application/product/module/feature; deadline only initiative/task/story/subtask; omission/null boundaries",
  "invariant": "For ALL current kinds, only applicable enumerated owned values save; omitted values preserve, optional null clears, initiative type defaults to idea and cannot clear, and numeric priority ordering remains independent.",
  "boundaryCounterCase": "foreign-kind fields, unknown enum values and null required initiative type refuse with the prior record and draft intact"
}
```

**Edge Cases:**

- New initiative without explicit type is idea.
- Area never owns deadline; delivery kinds never own initiative type/priorityLevel or area level.
- Area placement is independently constrained by TC-TPT-263; real-calendar date semantics by TC-TPT-278.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-272]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-063, AC-TPT-44, BR-TPT-02, BR-TPT-27, INV-TPT-05 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-272]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-272: each owned value is accepted only on the kinds that own it`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-272: an owned value outside its list is refused and an optional one is cleared with null`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-272: a priority level is a value of its own: the ordering number and the order of ready work stay as they were`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-272: an initiative always has one type: idea when capture omits it, and never unset`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Capture asks only for what the chosen kind uses, and an area is offered every area that is not deeper than its own level to sit inside, one of its own level and one with no level included [variant: capture-fields-by-kind]`
**Status:** Untested

#### TC-TPT-275: Initiative decisions remain explicit and independent of task delivery [P0]

**Objective:** Keep proposal approval, commitment, closure and reopening as person decisions.

**Business Intent / Invariant Guarded:** For ALL initiative states and tagged-task completion levels, usual transitions need actual decision authority and required intent/reason; task acceptance cannot close an initiative and initiative closure need not await tasks.

**Proves:** FR-TPT-064, AC-TPT-45, BR-TPT-06, BR-TPT-07, BR-TPT-08, INV-TPT-03, INV-TPT-05.

**Preconditions:**

- an initiative has stated intent, an open tagged task and an actor with explicit decision authority
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. approve Draft, commit Approved and close Committed with a reason while its task is open; reopen Done to Committed with a reason; inspect unchanged task facts and attempt a forbidden or unauthorized step.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given an initiative has stated intent, an open tagged task and an actor with explicit decision authority
When approve Draft, commit Approved and close Committed with a reason while its task is open; reopen Done to Committed with a reason; inspect unchanged task facts and attempt a forbidden or unauthorized step
Then permitted declared decisions change only initiative state/history and keep tagged-task acceptance unchanged
And missing decision authority, approval intent, required reason, illegal pair or intent/criteria edit while Done refuses preserving prior facts; reopen before subsequent intent/criteria edit
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | permitted declared decisions change only initiative state/history and keep tagged-task acceptance unchanged |
| System behavior | missing decision authority, approval intent, required reason, illegal pair or intent/criteria edit while Done refuses preserving prior facts; reopen before subsequent intent/criteria edit |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ permitted declared decisions change only initiative state/history and keep tagged-task acceptance unchanged
- ✅ missing decision authority, approval intent, required reason, illegal pair or intent/criteria edit while Done refuses preserving prior facts; reopen before subsequent intent/criteria edit
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all five initiative states, declared initiative decisions, actual decision/manual-record authority and open/accepted tagged-task variants",
  "invariant": "For ALL initiative states and tagged-task completion levels, usual transitions need actual decision authority and required intent/reason; task acceptance cannot close an initiative and initiative closure need not await tasks.",
  "boundaryCounterCase": "missing decision authority, approval intent, required reason, illegal pair or intent/criteria edit while Done refuses preserving prior facts; reopen before subsequent intent/criteria edit"
}
```

**Edge Cases:**

- Done intent/criteria needs permitted reopening or correction before editing; Canceled alone does not impose that restriction and has no usual outgoing step.
- Draft/Approved/Committed may cancel with reason; Done cannot usually cancel.
- Canceled has no usual outgoing step; explicit kind-valid reasoned correction is governed by TC-TPT-076.
- Manual correction authority is distinct from the additional authority for usual initiative decisions.

**Transition Invariants:** Allowed usual pairs: draft→approved/canceled, approved→committed/canceled, committed→done/canceled, done→committed; all others refuse. Current intent/reason and kind prerequisites remain. No delivery acceptance is created.

**Evidence:** [Source: test/work-tracking/TC-TPT-275]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-064, AC-TPT-45, BR-TPT-06, BR-TPT-07, BR-TPT-08, INV-TPT-03, INV-TPT-05 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-275]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-275: an initiative whose linked tasks are all accepted stays committed at 100 percent`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-275: an initiative moves from draft to approved to committed to done, reopens to committed, and is canceled from any state but done`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-275: every usual step of an initiative is a person's decision; approval needs stated intent, and closing, canceling and reopening need a reason`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-275: a closed initiative is reopened before its intent or criteria change, in words about its closing, and accepted work keeps the words about its delivered scope`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-275: an initiative closes while linked tasks are open and never closes by itself`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-275: the command takes an initiative decision only under its own flag, which corrects no state, and names that flag in discovery`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An initiative is approved, committed, closed and reopened as recorded decisions, with a reason where one is required, while its linked work stays open [variant: initiative-decisions]`
**Status:** Untested

#### TC-TPT-278: Due and overdue describe the read day without delivery consequences [P1]

**Objective:** Show truthful calendar dates while preserving delivery and decision facts.

**Business Intent / Invariant Guarded:** For ALL valid deadlines and UTC read days, only open nonretired work strictly after its due day is overdue; same/future dates and Done/Canceled/retired work are not.

**Proves:** FR-TPT-065, AC-TPT-46, BR-TPT-10, BR-TPT-27, BR-TPT-31, INV-TPT-04.

**Preconditions:**

- open initiative and delivery records have a real deadline D, alongside Done/Canceled/retired records and recorded counts/proof/readiness
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect on D and the next UTC day, change a valid deadline and inspect again; attempt a nonexistent calendar date.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given open initiative and delivery records have a real deadline D, alongside Done/Canceled/retired records and recorded counts/proof/readiness
When inspect on D and the next UTC day, change a valid deadline and inspect again; attempt a nonexistent calendar date
Then due/overdue text changes exactly at the UTC-day boundary for applicable open work with delivery counts, acceptance and readiness unchanged
And noncalendar or malformed dates refuse unchanged; closed/retired work never becomes overdue and areas refuse deadline
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | due/overdue text changes exactly at the UTC-day boundary for applicable open work with delivery counts, acceptance and readiness unchanged |
| System behavior | noncalendar or malformed dates refuse unchanged; closed/retired work never becomes overdue and areas refuse deadline |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ due/overdue text changes exactly at the UTC-day boundary for applicable open work with delivery counts, acceptance and readiness unchanged
- ✅ noncalendar or malformed dates refuse unchanged; closed/retired work never becomes overdue and areas refuse deadline
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "real YYYY-MM-DD dates, leap/calendar boundaries, UTC read dates, applicable kinds and open/closed/retired states",
  "invariant": "For ALL valid deadlines and UTC read days, only open nonretired work strictly after its due day is overdue; same/future dates and Done/Canceled/retired work are not.",
  "boundaryCounterCase": "noncalendar or malformed dates refuse unchanged; closed/retired work never becomes overdue and areas refuse deadline"
}
```

**Edge Cases:**

- Leap-day validity follows the real calendar.
- A changed read day can stale an existing report without any record edit; TC-TPT-260 owns the refresh outcome.
- Omitting deadline preserves it; optional null clears it under TC-TPT-272.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-278]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-065, AC-TPT-46, BR-TPT-10, BR-TPT-27, BR-TPT-31, INV-TPT-04 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-278]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-278: a record is overdue only while its due date is before the read date and it is still open`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-278: one read judges every record against the same UTC day even when its clock crosses midnight between records`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-278: a due date that is no calendar date is refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-278: a due date changes no count, readiness or acceptance`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-278: the report words a due date against the day of its read: overdue once that day is past it, "Due today" on the day itself, and due while the day is ahead`
**Status:** Untested

#### TC-TPT-326: Unsupported first vocabulary refuses without reinterpretation [P1]

**Objective:** Refuse unsupported first-version work while naming a safe next step.

**Business Intent / Invariant Guarded:** For ALL first-vocabulary projects detected by declaration, first-only locations or stamps, working/pinned reads, saves and migration refuse by name without inventing current records or counts.

**Proves:** FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- a project from first vocabulary 1 is retained exactly, with working and pinned copies; supported earlier 2 and current 3 comparison projects exist
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect working and pinned first source, attempt a save and migration, and compare stored bytes; then inspect the supported comparison sources.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a project from first vocabulary 1 is retained exactly, with working and pinned copies; supported earlier 2 and current 3 comparison projects exist
When inspect working and pinned first source, attempt a save and migration, and compare stored bytes; then inspect the supported comparison sources
Then each first-vocabulary entry shows its unsupported reason and documented upgrade/recovery next step; stored records remain exact
And no first record is reinterpreted as current, no count or migration success is claimed; earlier 2 remains readable read-only and current 3 remains usable
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each first-vocabulary entry shows its unsupported reason and documented upgrade/recovery next step; stored records remain exact |
| System behavior | no first record is reinterpreted as current, no count or migration success is claimed; earlier 2 remains readable read-only and current 3 remains usable |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each first-vocabulary entry shows its unsupported reason and documented upgrade/recovery next step; stored records remain exact
- ✅ no first record is reinterpreted as current, no count or migration success is claimed; earlier 2 remains readable read-only and current 3 remains usable
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "declared or evidenced first-vocabulary source, undeclared first-only stamp/location and every public read/write/migrate entry",
  "invariant": "For ALL first-vocabulary projects detected by declaration, first-only locations or stamps, working/pinned reads, saves and migration refuse by name without inventing current records or counts.",
  "boundaryCounterCase": "no first record is reinterpreted as current, no count or migration success is claimed; earlier 2 remains readable read-only and current 3 remains usable"
}
```

**Edge Cases:**

- A first-only stray record in a supported project is named and excluded under TC-TPT-250.
- Mixed/undecidable evidence refuses under TC-TPT-244; it is never guessed from a shared word.
- No new first→current migration mechanism or executing test is requested.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-326]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-326]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-326: a project in the first vocabulary is refused by name by a preview, a run and an abandon request, declared or recognised by its locations, and nothing is changed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-326: an undeclared project whose records are stamped for the first vocabulary is refused by name with what to do, although it holds none of that vocabulary's own locations`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-326: a project in the first vocabulary is refused by name on every read and save, declared or recognised by its locations, from the working copy and from a pinned commit`
**Status:** Untested

### Placement inspection and delivery declaration properties

Placement remains advisory and read-only. Implemented records a declaration, not acceptance. Property domains below state the full intended contract; the named source guards cover their inspected witnesses and are NOT RUN.

#### TC-TPT-327: Described work exposes explained area leads without being saved [P1]

**Objective:** Judge where new work belongs before creating or tagging it.

**Business Intent / Invariant Guarded:** For ALL admitted work descriptions, placement inspection explains offered areas and ancestry, selects no owner and changes no work.

**Proves:** FR-TPT-004, FR-TPT-020, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-20, BR-TPT-23, INV-TPT-01.

**Preconditions:**

- The project has People → Time off → Leave balances areas and unrelated Billing → Invoices areas; the proposed leave-balance correction is not saved.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor first maintains the areas through permitted saves, then describes a new leave-balance problem during planning. They inspect and compare the answer before any separate capture or tag decision.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Inspect placement for the proposed leave-balance correction, read the leading area’s matching words and parent path, browse available root areas, then repeat the same inspection.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given The project has People → Time off → Leave balances areas and unrelated Billing → Invoices areas; the proposed leave-balance correction is not saved.
When Inspect placement for the proposed leave-balance correction, read the leading area’s matching words and parent path, browse available root areas, then repeat the same inspection.
Then Leave balances is offered with People/Time off ancestry and matching leave, balance and carry words; unrelated Invoices is absent, roots are available, and the unsaved description has no held affiliations.
And Recommendations remain inspection leads with source and coverage; repetition changes no saved record and never becomes selection, capture, tag or link.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | Recommendations remain inspection leads with source and coverage; repetition changes no saved record and never becomes selection, capture, tag or link. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | Leave balances is offered with People/Time off ancestry and matching leave, balance and carry words; unrelated Invoices is absent, roots are available, and the unsaved description has no held affiliations. |

**Acceptance Criteria:**

- ✅ Leave balances is offered with People/Time off ancestry and matching leave, balance and carry words; unrelated Invoices is absent, roots are available, and the unsaved description has no held affiliations.
- ✅ Recommendations remain inspection leads with source and coverage; repetition changes no saved record and never becomes selection, capture, tag or link.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all permitted saved area hierarchies and admitted nonempty work descriptions, with no exact record selected",
  "invariant": "For ALL admitted work descriptions, placement inspection explains offered areas and ancestry, selects no owner and changes no work.",
  "boundaryCounterCase": "an unknown exact identity must refuse under TC-TPT-329 rather than substitute a title match"
}
```

**Edge Cases:**

- An area sharing no relevant words is not offered as an own-description match.
- Repeating the same description against the same source retains the same leads; the read time may differ.

**Transition Invariants:** N/A — inspection requests no lifecycle action.

**Evidence:** [Source: test/work-tracking/TC-TPT-327]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-004, FR-TPT-020, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-20, BR-TPT-23, INV-TPT-01 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-327]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard covers the stated fixture and repeat read; it does not establish every ranking weight, language, hierarchy, declared read limit or optional workspace presentation.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-327: a described record is offered the area whose own words match it, with the areas above it and the words that matched, and the read changes nothing`
**Status:** Untested

#### TC-TPT-328: Similar work names the affiliation and specification witnesses behind a lead [P1]

**Objective:** Use existing work to investigate organization when an area’s own words do not match.

**Business Intent / Invariant Guarded:** For ALL admitted descriptions, a placement lead supported by similar work names that witness and its relevant affiliation or governing specification; it grants no authority to copy them.

**Proves:** FR-TPT-002, FR-TPT-004, AC-TPT-47, BR-TPT-05, BR-TPT-22, BR-TPT-23.

**Preconditions:**

- A currency-rounding task belongs to General ledger and Faster month-end and declares its governing specification; unrelated password-reset work belongs to Sign-in.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor saves the existing task’s actual tags and governing specification, then later describes a related currency-rounding problem and reviews the placement answer before changing anything.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Inspect placement for the new currency-rounding description and open the named similar record and its declared governing specification to judge their meaning.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given A currency-rounding task belongs to General ledger and Faster month-end and declares its governing specification; unrelated password-reset work belongs to Sign-in.
When Inspect placement for the new currency-rounding description and open the named similar record and its declared governing specification to judge their meaning.
Then The related currency task is named; General ledger, Faster month-end and the governing specification are offered with that task as their witness even when their own words do not match.
And Unrelated password-reset work does not supply an area lead; no recommendation selects, copies or saves the witness’s affiliations or specification relationship.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | Unrelated password-reset work does not supply an area lead; no recommendation selects, copies or saves the witness’s affiliations or specification relationship. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | The related currency task is named; General ledger, Faster month-end and the governing specification are offered with that task as their witness even when their own words do not match. |

**Acceptance Criteria:**

- ✅ The related currency task is named; General ledger, Faster month-end and the governing specification are offered with that task as their witness even when their own words do not match.
- ✅ Unrelated password-reset work does not supply an area lead; no recommendation selects, copies or saves the witness’s affiliations or specification relationship.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all admitted descriptions and similar permitted work with exact area, initiative and specification declarations",
  "invariant": "For ALL admitted descriptions, a placement lead supported by similar work names that witness and its relevant affiliation or governing specification; it grants no authority to copy them.",
  "boundaryCounterCase": "work sharing no relevant description supplies no witness for its otherwise unrelated area"
}
```

**Edge Cases:**

- A witness can explain both an area and an initiative without merging their meanings.
- Specification suggestions retain their declared path and witness; title similarity is not semantic equivalence.

**Transition Invariants:** N/A — inspection requests no lifecycle action.

**Evidence:** [Source: test/work-tracking/TC-TPT-328]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-002, FR-TPT-004, AC-TPT-47, BR-TPT-05, BR-TPT-22, BR-TPT-23 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-328]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard checks the stated witness and exclusion; it does not prove every possible similarity comparison, file availability, semantic suitability or subsequent tag/link save.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-328: similar work speaks for where it sits: an area and an initiative whose own words do not match are offered when the nearest record carries them, and so is its governing spec`
**Status:** Untested

#### TC-TPT-329: Exact work keeps held facts distinct from possible duplicates [P1]

**Objective:** Inspect a specific record’s existing organization without substituting similar work.

**Business Intent / Invariant Guarded:** For ALL exact admitted identities, placement reads that record’s current facts, marks held affiliations and missing relations separately, excludes the subject from similar work and never treats a possible duplicate as the same identity.

**Proves:** FR-TPT-004, FR-TPT-008, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-22, INV-TPT-01.

**Preconditions:**

- A warehouse task holds an area and governing specification but no initiative; another task and an initiative share its title.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor captures the three distinct records and tags the selected task. After reviewing those saves they inspect that task by its exact identity, then separately inspect a description and an unknown identity.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Inspect the exact warehouse task, compare its held area/specification and missing initiative, inspect possible duplicates, then try an identity no record owns.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given A warehouse task holds an area and governing specification but no initiative; another task and an initiative share its title.
When Inspect the exact warehouse task, compare its held area/specification and missing initiative, inspect possible duplicates, then try an identity no record owns.
Then The answer names the selected identity and current revision, marks its held area, retains its governing specification and names the missing initiative affiliation; the subject is absent from similar work.
And The same-title task is only a possible duplicate, the different-kind initiative is not the same task, and an unknown exact identity refuses without replacement or save.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | The same-title task is only a possible duplicate, the different-kind initiative is not the same task, and an unknown exact identity refuses without replacement or save. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | The answer names the selected identity and current revision, marks its held area, retains its governing specification and names the missing initiative affiliation; the subject is absent from similar work. |

**Acceptance Criteria:**

- ✅ The answer names the selected identity and current revision, marks its held area, retains its governing specification and names the missing initiative affiliation; the subject is absent from similar work.
- ✅ The same-title task is only a possible duplicate, the different-kind initiative is not the same task, and an unknown exact identity refuses without replacement or save.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all exact unique permitted work identities and descriptions with optional kinds, existing tags and same-title records",
  "invariant": "For ALL exact admitted identities, placement reads that record’s current facts, marks held affiliations and missing relations separately, excludes the subject from similar work and never treats a possible duplicate as the same identity.",
  "boundaryCounterCase": "an unknown exact identity returns not found and selects none; a description with no kind may expose same-title records of several kinds as possible duplicates"
}
```

**Edge Cases:**

- No initiative tag is visibly untagged, rather than an inferred initiative.
- Omitting the kind from a description broadens possible-duplicate leads without merging identities.

**Transition Invariants:** N/A — inspection requests no lifecycle action.

**Evidence:** [Source: test/work-tracking/TC-TPT-329]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-004, FR-TPT-008, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-22, INV-TPT-01 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-329]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard checks unique, unknown and same-title fixtures; ambiguous owners, denied reads and every duplicate-detection boundary remain governed requirements with complete implementation evidence TBD.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-329: an exact existing record is read with what it already carries: held tags are marked, a tag relation it lacks is named, it is never offered to itself, and the same title on the same kind is a possible duplicate`
**Status:** Untested

#### TC-TPT-330: Ended targets and inapplicable affiliations are omitted from placement leads [P1]

**Objective:** Keep placement suggestions useful for the subject’s current kind.

**Business Intent / Invariant Guarded:** For ALL placement inspections, canceled or retired targets are not offered and an area has no initiative lead.

**Proves:** FR-TPT-004, AC-TPT-47, BR-TPT-05, BR-TPT-19, BR-TPT-27.

**Preconditions:**

- The project contains matching live and canceled supplier areas, and live and retired supplier initiatives.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A coordinator captures the targets, explicitly cancels or retires the ended ones, reviews the results, then a contributor inspects described task and area placement.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Inspect a matching task description, then inspect the same description as an area.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given The project contains matching live and canceled supplier areas, and live and retired supplier initiatives.
When Inspect a matching task description, then inspect the same description as an area.
Then The task is offered the matching live area and initiative; canceled areas and retired initiatives are absent.
And The area is offered no initiative even when the description matches one; omitted targets remain unchanged and no affiliation is saved.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | The area is offered no initiative even when the description matches one; omitted targets remain unchanged and no affiliation is saved. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | The task is offered the matching live area and initiative; canceled areas and retired initiatives are absent. |

**Acceptance Criteria:**

- ✅ The task is offered the matching live area and initiative; canceled areas and retired initiatives are absent.
- ✅ The area is offered no initiative even when the description matches one; omitted targets remain unchanged and no affiliation is saved.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all admitted subject kinds and matching permitted live, canceled or retired targets",
  "invariant": "For ALL placement inspections, canceled or retired targets are not offered and an area has no initiative lead.",
  "boundaryCounterCase": "a canceled or retired matching target must be absent, and any area subject has an empty initiative-lead set"
}
```

**Edge Cases:**

- An otherwise strong text match cannot restore an ended target to the offer.
- An area remains inspectable without inventing a why/initiative affiliation.

**Transition Invariants:** Inspection preserves every target’s existing lifecycle and retirement standing.

**Evidence:** [Source: test/work-tracking/TC-TPT-330]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-004, AC-TPT-47, BR-TPT-05, BR-TPT-19, BR-TPT-27 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-330]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard exercises canceled-area, retired-initiative and area-kind exclusions; the complete cross-product of states, retirement and kinds is not proved by this fixture.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-330: work is never sent to a place that has ended: a canceled area and a retired initiative are not offered, and an area is offered no initiative`
**Status:** Untested

#### TC-TPT-331: Direct area browsing and refused placement questions stay bounded and exact [P1]

**Objective:** Explore organization one level at a time and recover from questions that cannot be read exactly.

**Business Intent / Invariant Guarded:** For ALL admitted placement questions, opening an area lists only its available direct children; invalid, unsupported or over-limit requests refuse without guessed owners or saves.

**Proves:** FR-TPT-004, FR-TPT-020, FR-TPT-021, AC-TPT-47, BR-TPT-05, BR-TPT-20, BR-TPT-22.

**Preconditions:**

- A top area has Receiving and Dispatch children, Receiving has a Dock child, and another direct child is canceled; a task identity and an unknown identity are also available as browsing attempts.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor creates the hierarchy through permitted tag saves and reviews it. During organization they open the top area and then inspect named invalid or over-limit questions as separate reads.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Open the top area, compare its direct children, try opening a task and a missing identity as areas, then submit empty, invalid, unsupported and over-limit placement questions.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given A top area has Receiving and Dispatch children, Receiving has a Dock child, and another direct child is canceled; a task identity and an unknown identity are also available as browsing attempts.
When Open the top area, compare its direct children, try opening a task and a missing identity as areas, then submit empty, invalid, unsupported and over-limit placement questions.
Then Receiving and Dispatch are direct children; the deeper Dock and canceled child are absent. A non-area or missing browsing target is named unavailable, with no substitute.
And Invalid, unsupported or over-limit questions refuse; the reader never receives a guessed complete answer or a saved placement.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | Invalid, unsupported or over-limit questions refuse; the reader never receives a guessed complete answer or a saved placement. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | Receiving and Dispatch are direct children; the deeper Dock and canceled child are absent. A non-area or missing browsing target is named unavailable, with no substitute. |

**Acceptance Criteria:**

- ✅ Receiving and Dispatch are direct children; the deeper Dock and canceled child are absent. A non-area or missing browsing target is named unavailable, with no substitute.
- ✅ Invalid, unsupported or over-limit questions refuse; the reader never receives a guessed complete answer or a saved placement.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all admitted descriptions or exact identities and requested area openings within declared read limits",
  "invariant": "For ALL admitted placement questions, opening an area lists only its available direct children; invalid, unsupported or over-limit requests refuse without guessed owners or saves.",
  "boundaryCounterCase": "a request beyond the declared area-opening limit, repeated opening identities, no subject/opening, invalid values or unsupported request version refuses"
}
```

**Edge Cases:**

- A browsing-only question can have no ranked description leads.
- Opening a task as an area cannot silently open a similarly named area.

**Transition Invariants:** N/A — inspection requests no lifecycle action.

**Evidence:** [Source: test/work-tracking/TC-TPT-331]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-004, FR-TPT-020, FR-TPT-021, AC-TPT-47, BR-TPT-05, BR-TPT-20, BR-TPT-22 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-331]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard checks direct depth and the enumerated request boundaries; it does not prove every read-budget cut, denied source or partial hierarchy outcome.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-331: opening an area lists the areas directly under it, an identity that is not an area is named as not found, and a query is bounded and exact`
**Status:** Untested

#### TC-TPT-333: Explicit placement inspection answers or refuses without changing work [P1]

**Objective:** Use placement inspection directly while retaining exact read authority.

**Business Intent / Invariant Guarded:** For ALL direct placement inspections, a valid question returns source-qualified leads and an invalid or unsupported question visibly refuses; neither path changes work or accepts mutation authority.

**Proves:** FR-TPT-004, FR-TPT-008, FR-TPT-020, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-15, BR-TPT-20, INV-TPT-05.

**Preconditions:**

- A current permitted project has a Fleet maintenance area and no selected work to change.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor opens the project’s explicit placement operation, describes a fleet reminder and reviews the answer. They separately try unknown work and questions carrying save/selection intent, without granting a writer action.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Request placement for the fleet reminder through the explicit operation, then try missing/unknown/unsupported questions and attempts to attach a tag or writer selection to that read.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given A current permitted project has a Fleet maintenance area and no selected work to change.
When Request placement for the fleet reminder through the explicit operation, then try missing/unknown/unsupported questions and attempts to attach a tag or writer selection to that read.
Then The valid question shows Fleet maintenance with complete read coverage; the answer exposes no machine-specific project location.
And Each question the operation cannot read exactly has a visible refused outcome and cause; writer selection or tag changes are refused and all work stays as previously saved.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | N/A — this case uses explicit inspection; optional workspace presentation is not asserted. |
| System behavior | Each question the operation cannot read exactly has a visible refused outcome and cause; writer selection or tag changes are refused and all work stays as previously saved. |
| Business data state | All work remains as saved before inspection; no affiliation, identity, criteria, proof, acceptance or history changes. |
| Data shown on UI | The valid question shows Fleet maintenance with complete read coverage; the answer exposes no machine-specific project location. |

**Acceptance Criteria:**

- ✅ The valid question shows Fleet maintenance with complete read coverage; the answer exposes no machine-specific project location.
- ✅ Each question the operation cannot read exactly has a visible refused outcome and cause; writer selection or tag changes are refused and all work stays as previously saved.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all valid direct placement questions and invalid, unknown, unsupported or mutation-bearing requests",
  "invariant": "For ALL direct placement inspections, a valid question returns source-qualified leads and an invalid or unsupported question visibly refuses; neither path changes work or accepts mutation authority.",
  "boundaryCounterCase": "an unknown exact record, unsupported request, missing subject or attempted tag/writer option refuses while the selected project remains unchanged"
}
```

**Edge Cases:**

- Read inspection needs no selected acting identity.
- A successful read is not permission to save one of its leads.

**Transition Invariants:** No record state, proof, acceptance, affiliation or revision changes on a successful or refused inspection.

**Evidence:** [Source: test/work-tracking/TC-TPT-333]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-004, FR-TPT-008, FR-TPT-020, AC-TPT-47, BR-TPT-02, BR-TPT-05, BR-TPT-15, BR-TPT-20, INV-TPT-05 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-333]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard also checks transport details, which are incidental technical assertions rather than business promises here; it does not prove every caller, operating system or optional UI presentation.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-placement.test.cjs::TC-TPT-333: the shipped command is a read: it answers one JSON query, refuses what it cannot read exactly with a failing status, takes no actor or permission option, and leaves every stored byte as it was`
**Status:** Untested

#### TC-TPT-334: Implemented records a built-and-published declaration without acceptance [P1]

**Objective:** Make delivery standing visible before verification facts are recorded.

**Business Intent / Invariant Guarded:** For ALL delivery kinds, an explicit permitted declaration from Draft, Planned, Ready or In progress needs captured intent alone, records Implemented and grants no proof or acceptance; automatic upkeep never records it, even with an observed-transition claim.

**Proves:** FR-TPT-001, FR-TPT-010, FR-TPT-011, AC-TPT-04, BR-TPT-03, BR-TPT-06, BR-TPT-07, BR-TPT-14, INV-TPT-03, INV-TPT-04.

**Preconditions:**

- A contributor has exact task records with captured intent in Draft, Planned, Ready and In progress; the Draft record has no criteria, readiness review or assignee.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** The contributor captures work, then builds and publishes its outcome for review. On returning to that exact record, they explicitly declare Implemented; the declaration does not assert that publication was independently verified.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Record Implemented for the minimally defined Draft task and for each of the other allowed starting states; inspect acceptance, then try direct Done, acceptance from Implemented and an automatic Implemented change.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given A contributor has exact task records with captured intent in Draft, Planned, Ready and In progress; the Draft record has no criteria, readiness review or assignee.
When Record Implemented for the minimally defined Draft task and for each of the other allowed starting states; inspect acceptance, then try direct Done, acceptance from Implemented and an automatic Implemented change.
Then Implemented is recorded with no assignment or acceptance inferred; accepted task count remains zero and the other declared incoming states permit the same step.
And Direct Done, acceptance while Implemented and automatic entry are refused; no published declaration creates passing proof or delivery credit.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The selected record’s readback shows the actual state and any named refusal; optional browser presentation is not independently verified here. |
| System behavior | Direct Done, acceptance while Implemented and automatic entry are refused; no published declaration creates passing proof or delivery credit. |
| Business data state | Only the exact authorized lifecycle or separately requested readiness/responsibility/proof/acceptance facts change; every refused action preserves prior state and unrelated work. |
| Data shown on UI | Implemented is recorded with no assignment or acceptance inferred; accepted task count remains zero and the other declared incoming states permit the same step. |

**Acceptance Criteria:**

- ✅ Implemented is recorded with no assignment or acceptance inferred; accepted task count remains zero and the other declared incoming states permit the same step.
- ✅ Direct Done, acceptance while Implemented and automatic entry are refused; no published declaration creates passing proof or delivery credit.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all delivery kinds in each declared incoming state with captured intent, optional criteria/readiness/assignment and manual or automatic action context",
  "invariant": "For ALL delivery kinds, an explicit permitted declaration from Draft, Planned, Ready or In progress needs captured intent alone, records Implemented and grants no proof or acceptance; automatic upkeep never records it, even with an observed-transition claim.",
  "boundaryCounterCase": "missing captured intent, an undeclared usual incoming state, automatic action including an observed-transition claim, or attempted Done/acceptance cannot grant Implemented authority or acceptance"
}
```

**Edge Cases:**

- Readiness, criteria and assignment may all be absent when the declaration is recorded.
- Blocked work resolves and resumes before the usual Implemented step.

**Transition Invariants:** Only the declared incoming delivery pairs enter Implemented; rejected requests preserve the prior state and no Implemented declaration accepts delivery.

**Evidence:** [Source: test/work-tracking/TC-TPT-334]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-001, FR-TPT-010, FR-TPT-011, AC-TPT-04, BR-TPT-03, BR-TPT-06, BR-TPT-07, BR-TPT-14, INV-TPT-03, INV-TPT-04 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-334]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard executes source assertions for task entry from four states, no acceptance and automatic refusal without observedTransition; missing-intent, all supporting kinds and observedTransition-specific refusal remain universal obligations with complete executor coverage TBD.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-334: implemented says only that the work is built and published for review: it is reached with captured intent alone, earns no acceptance, and automatic upkeep never records it`
**Status:** Untested

#### TC-TPT-335: Verification after Implemented requires current readiness and responsibility [P1]

**Objective:** Keep a built declaration separate from the decision to verify and accept it.

**Business Intent / Invariant Guarded:** For ALL usual Implemented-to-Verifying steps, current criteria, reviewed readiness with resolved decisions, current prerequisites and an active responsible member are required before state changes; Done then still needs current applicable proof and actual acceptance.

**Proves:** FR-TPT-003, FR-TPT-005, FR-TPT-011, AC-TPT-06, BR-TPT-03, BR-TPT-06, BR-TPT-07, INV-TPT-03.

**Preconditions:**

- An exact task is Implemented with captured intent but no criteria, readiness review or responsible member.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor records the built-and-published declaration, then a coordinator later reviews criteria and decisions and selects responsibility. Each step waits for the previous result and human review; no fixed delay is evidence of readiness.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Request Verifying without criteria, then add criteria and try without readiness, then try reviewed readiness without a responsible member; record valid responsibility/readiness, verify, record actual passing proof and accept exact scope.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given An exact task is Implemented with captured intent but no criteria, readiness review or responsible member.
When Request Verifying without criteria, then add criteria and try without readiness, then try reviewed readiness without a responsible member; record valid responsibility/readiness, verify, record actual passing proof and accept exact scope.
Then Each missing prerequisite has a named refusal and the task remains Implemented; valid current readiness and responsibility permit Verifying.
And The declaration alone never accepts work. Only the later current proof and actual accepting decision record Done and acceptance.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The selected record’s readback shows the actual state and any named refusal; optional browser presentation is not independently verified here. |
| System behavior | The declaration alone never accepts work. Only the later current proof and actual accepting decision record Done and acceptance. |
| Business data state | Only the exact authorized lifecycle or separately requested readiness/responsibility/proof/acceptance facts change; every refused action preserves prior state and unrelated work. |
| Data shown on UI | Each missing prerequisite has a named refusal and the task remains Implemented; valid current readiness and responsibility permit Verifying. |

**Acceptance Criteria:**

- ✅ Each missing prerequisite has a named refusal and the task remains Implemented; valid current readiness and responsibility permit Verifying.
- ✅ The declaration alone never accepts work. Only the later current proof and actual accepting decision record Done and acceptance.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all delivery kinds in Implemented with current/stale/missing criteria, reviewed readiness, decisions, prerequisites and eligible or missing/inactive responsibility",
  "invariant": "For ALL usual Implemented-to-Verifying steps, current criteria, reviewed readiness with resolved decisions, current prerequisites and an active responsible member are required before state changes; Done then still needs current applicable proof and actual acceptance.",
  "boundaryCounterCase": "missing or stale required readiness facts, unresolved prerequisites or missing/inactive responsible member refuses the usual verification step with prior state retained"
}
```

**Edge Cases:**

- Adding criteria alone does not manufacture a readiness decision.
- A passing proof is separate from the human accepting action.

**Transition Invariants:** Implemented→Verifying preserves acceptance pending; Verifying→Done follows the existing proof/acceptance rule, never the declaration.

**Evidence:** [Source: test/work-tracking/TC-TPT-335]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-003, FR-TPT-005, FR-TPT-011, AC-TPT-06, BR-TPT-03, BR-TPT-06, BR-TPT-07, INV-TPT-03 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-335]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard covers missing criteria, readiness and assignment, then task verification/proof/acceptance; stale facts, inactive members, unresolved dependencies and all supporting-kind variants are not completely covered by that one executor.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-335: verification starts from implemented only with the facts verifying work always has: criteria, a reviewed readiness decision and a responsible member`
**Status:** Untested

#### TC-TPT-336: Implemented has guarded return, reasoned cancellation and visible lifecycle [P1]

**Objective:** Expose delivery standing consistently while retaining ordinary start and cancellation rules.

**Business Intent / Invariant Guarded:** For ALL delivery lifecycle reads, Implemented appears between active work and verification; its usual outgoing actions are guarded In progress, guarded Verifying and cancellation with a reason. Blocked has no usual direct Implemented step.

**Proves:** FR-TPT-012, FR-TPT-020, AC-TPT-04, AC-TPT-24, BR-TPT-03, BR-TPT-06, BR-TPT-19, INV-TPT-05.

**Preconditions:**

- An exact task is Implemented with captured intent but lacks current readiness, and the reader can inspect the declared delivery lifecycle.
- The contributor has permitted access to the named current source and records its scope before acting; each requested save has its actual authority and current revision.

**Real-World Reachability:** A contributor records the declaration after building and publishing work. Later, after deciding the work needs another change or is superseded, they request the corresponding exact action and review its outcome.

**Demo Flow:**

1. Open the selected project and read the stated exact owners and current facts.
2. Try returning to In progress without readiness, try cancellation without a reason, then cancel with the actual supersession reason and inspect the delivery lifecycle and permitted pairs.
3. Review each result and reread the affected record or inspection before the next dependent action; retain the same project context.

```gherkin
Given An exact task is Implemented with captured intent but lacks current readiness, and the reader can inspect the declared delivery lifecycle.
When Try returning to In progress without readiness, try cancellation without a reason, then cancel with the actual supersession reason and inspect the delivery lifecycle and permitted pairs.
Then Missing readiness refuses return and missing reason refuses cancellation; reasoned cancellation succeeds and retains the recorded work history.
And Reads include Implemented in the delivery standing and list only its declared usual outgoing actions; no blocked-to-Implemented step or acceptance is inferred.
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The selected record’s readback shows the actual state and any named refusal; optional browser presentation is not independently verified here. |
| System behavior | Reads include Implemented in the delivery standing and list only its declared usual outgoing actions; no blocked-to-Implemented step or acceptance is inferred. |
| Business data state | Only the exact authorized lifecycle or separately requested readiness/responsibility/proof/acceptance facts change; every refused action preserves prior state and unrelated work. |
| Data shown on UI | Missing readiness refuses return and missing reason refuses cancellation; reasoned cancellation succeeds and retains the recorded work history. |

**Acceptance Criteria:**

- ✅ Missing readiness refuses return and missing reason refuses cancellation; reasoned cancellation succeeds and retains the recorded work history.
- ✅ Reads include Implemented in the delivery standing and list only its declared usual outgoing actions; no blocked-to-Implemented step or acceptance is inferred.
- ❌ A substituted owner, hidden refusal, unrequested save or invented proof/acceptance fails this case.

**Test Data:**

```json
{
  "inputDomain": "all delivery kinds, delivery lifecycle reads and usual Implemented return/verification/cancel requests with present or absent prerequisites and reason",
  "invariant": "For ALL delivery lifecycle reads, Implemented appears between active work and verification; its usual outgoing actions are guarded In progress, guarded Verifying and cancellation with a reason. Blocked has no usual direct Implemented step.",
  "boundaryCounterCase": "a return without current readiness/responsibility, cancellation without reason or undeclared usual pair refuses without changing prior facts"
}
```

**Edge Cases:**

- An explicit correction keeps its separate authority and target prerequisites; it does not enlarge the usual transition table.
- Canceling a declaration grants no acceptance or delivery credit.

**Transition Invariants:** Usual Implemented→In progress/Verifying requires current readiness and active responsibility; Implemented→Canceled requires reason. Every undeclared usual pair refuses.

**Evidence:** [Source: test/work-tracking/TC-TPT-336]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-012, FR-TPT-020, AC-TPT-04, AC-TPT-24, BR-TPT-03, BR-TPT-06, BR-TPT-19, INV-TPT-05 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-336]; assertion-inspected source registration, NOT RUN; complete universal implementation evidence remains TBD |

**Does Not Prove:** The primary guard covers failed return and cancellation, successful reasoned task cancellation and delivery-vocabulary pairs; successful return, every read surface and every supporting-kind variant remain outside that executor’s complete proof.

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-336: implemented work returns to in progress under the rules for starting work and is canceled with a reason, and every read lists the state in the delivery lifecycle`
**Status:** Untested
