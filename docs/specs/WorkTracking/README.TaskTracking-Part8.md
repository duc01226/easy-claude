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
continuation: 8
---

> **DRAFT — inherits the governing spec's provisional contract evidence. These ten cases are Untested: each names its authored guards and registered executors, and no observed result is recorded here.**

# Work tracking case continuation 8

## Related Documentation

- Read `README.TaskTracking.md` §§1–7 for governing intent, in particular BR-TPT-31 to BR-TPT-33, the amended BR-TPT-27, BR-TPT-29 and BR-TPT-30, FR-TPT-058 to FR-TPT-061, AC-TPT-39 to AC-TPT-42 and INV-TPT-09, and the glossary entries for detail form, size budget, area/initiative figures, domain and kind display label.
- This continues the same canonical registry and owns ten new stable case bodies, TC-TPT-253 to TC-TPT-262. Earlier case bodies and their evidence remain conserved in the main owner and Parts2–7.
- The fourth area level or initiative type and kind display labels amend `docs/adr/0005-work-tracker-vocabulary-and-migration.md`. The fourth purpose is guarded by the existing purpose cases TC-TPT-211 and TC-TPT-231.
- Existing provenance, refusal, exact-scope, print and permission cases remain governing, in particular TC-TPT-007, TC-TPT-045, TC-TPT-046, TC-TPT-131, TC-TPT-241 and TC-TPT-252. One business case may require multiple executing tests.

> Current applicability: vocabulary 3 and the main owner’s kind lifecycles/record-owned tags govern these conserved intents. Historical earlier-vocabulary examples are amended below; no new executor or migration-mechanism obligation is introduced.

## 8. Test Specifications

### Test summary

| Priority | Planned | Untested | Executed |
| -------- | ------: | -------: | -------: |
| P0       |       0 |        3 |        0 |
| P1       |       0 |        7 |        0 |
| Total    |       0 |       10 |        0 |

### Snapshot detail forms and size

#### TC-TPT-253: Every detail form lists every inspected record and names what it leaves out [P0]

**Objective:** Verify that a progress snapshot in any detail form lists every inspected record with the same counts and says which detail it leaves out.

**Business Intent / Invariant Guarded:** BR-TPT-31 and INV-TPT-09: for ALL detail forms and size budgets, choosing how much detail a snapshot carries never removes a record from its list or changes its counts.

**Proves:** FR-TPT-058, FR-TPT-015, FR-TPT-021, AC-TPT-39, BR-TPT-31, BR-TPT-10, BR-TPT-20, INV-TPT-09.

**Current contract clarification:** All inspected records of the exact selected project/area/initiative scope remain listed in every form; only detail form differs.

**Preconditions:**

- A fully inspected project holds initiatives, tasks, a story, subtasks and groups in several recorded states; its tasks carry outcome text, criteria, links, proof, acceptance and change history.
- A complete snapshot of the project exists, and its list of records and its counts are recorded.

**Real-World Reachability:** A team has tracked work for some weeks. A lead generates the complete snapshot at a desk. Later the same day a teammate away from the working copy asks for a smaller copy to read on a phone.

**Demo Flow:** Generate the snapshot in the complete form, then in the packed form, then with no record detail. Compare the list of records and every count across the three. In each, select one record.

```gherkin
Given a fully inspected project and its complete snapshot
When a reader asks for the same source and scope in the packed form and in the detail-free form
Then each snapshot lists every inspected record exactly once
And source, coverage, Delivery scope and every count equal those of the complete snapshot, and each snapshot states its own date
And the detail-free snapshot says that record detail is not in this copy and names the ways to read it
And the list of records and every count stay readable in each form without enhanced interactions
```

**Expected Result:**

| Dimension           | Expectation |
| ------------------- | ----------- |
| UI                  | A compact snapshot says beside its source and beside its list of records that it is the compact version and how to request the complete one; every snapshot names its detail form in its identity details. A record whose detail is absent keeps its place in the list and says under its own row "Detail not in this copy" with the ways to read it. |
| System behavior     | The form changes only how much record detail the snapshot carries; no record is filtered, sampled or dropped. |
| Business data state | No record, proof, acceptance or project setting changes by generating any form. |
| Data shown on UI    | The same record identities, kinds, states, responsible people, proof and acceptance marks in every form; identical accepted, currently verified and remaining counts. |

**Acceptance Criteria:**

- ✅ The listed record identities and every count are identical across the complete, packed and detail-free forms, and each omission is named with the way to read it.
- ❌ A record missing from any form, a count that differs between forms, detail left out without a notice, or a snapshot refused for its size fails this case.

**Test Data:**

```json
{
    "inputDomain": "any inspectable project from no records up to the inspection limit, with any mix of kinds, states, groups, outcome lengths and history lengths; each detail form; any size budget, including none and one smaller than the detail-free form",
    "invariant": "for ALL such projects, forms and budgets, the listed record identities equal the inspected record identities and every count equals the complete form's",
    "boundaryCounterCase": "an unknown detail form is refused as invalid with the previous snapshot kept; a project past the inspection limit lists what was inspected and names the limit, in every form"
}
```

**Edge Cases:**

- Empty complete project → every form shows no tracked work and no percentage.
- Partly inspected project → every form lists the inspected records and names the same gaps.
- A snapshot made for one selected area or initiative → every record of that area/initiative’s own scope is named once in every form: its eligible tasks in the delivery list, and its excluded tasks, supporting work and groups apart from it (TC-TPT-256).
- A pinned shared source → each form reads that source's own records.
- Print of the detail-free form → the list, the counts and the omission notice print together.
- Two records that carry one identity → both are listed, and both can be opened in every form that carries detail.

**Transition Invariants:** N/A — generating a snapshot performs no lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-253]

**Related Behaviors:**

| Capability                         | Anchor |
| ---------------------------------- | ------ |
| Governing observable intent        | FR-TPT-058, FR-TPT-015, FR-TPT-021, AC-TPT-39, BR-TPT-31, BR-TPT-10, BR-TPT-20, INV-TPT-09 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-253]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-253: report refuses an unknown detail form before writing anything and keeps the previous snapshot`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-253: every inspected record keeps its row in every detail form, with the same counts`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-253: a scoped snapshot names every record of its own scope once in every detail form`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-253: a report that leaves detail out names what it left out, on the page and in the result`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-253: report bytes per record stay within each detail form's ceiling`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The detail-free form lists every record, keeps its filters and says where a record can be read [variant: detail-free-says-where-to-read]`
**Status:** Untested

#### TC-TPT-254: Packed detail shows exactly what the complete form shows [P0]

**Objective:** Verify that the packed form carries complete record detail and opens it on request, identical to the complete form.

**Business Intent / Invariant Guarded:** BR-TPT-31 and INV-TPT-09: for ALL records, the detail opened from the packed form equals the detail the complete form shows; packing is never a summary.

**Proves:** FR-TPT-058, FR-TPT-017, FR-TPT-018, AC-TPT-39, BR-TPT-31, BR-TPT-09, INV-TPT-09.

**Preconditions:**

- The project from TC-TPT-253, including one task whose title and outcome contain text that looks like markup and like an instruction.
- Its complete snapshot and its packed snapshot, generated from the same unchanged source.

**Real-World Reachability:** The lead generates both forms minutes apart with no save between them. A teammate opens the packed copy later on another device.

**Demo Flow:** Open the packed snapshot. Select several records in turn, including the one with markup-looking text, and compare each opened detail with the same record in the complete snapshot. Follow a link from one record to another. Print the packed snapshot.

```gherkin
Given a complete snapshot and a packed snapshot of the same unchanged source
When a reader selects a record in the packed snapshot
Then its outcome, criteria, links, responsibility, proof, acceptance and history read exactly as in the complete snapshot
And text that looks like markup or an instruction is shown as text
And following a link to another record opens that record's detail the same way
And printing the packed snapshot shows every record's detail
```

**Expected Result:**

| Dimension           | Expectation |
| ------------------- | ----------- |
| UI                  | Selecting a record opens its detail in place, moves focus to it and offers a return to the list. A reader without the needed enhanced interactions sees the list, the counts and a notice that record detail needs them or the complete form. |
| System behavior     | Detail is opened from the snapshot itself; nothing is requested from anywhere else and nothing is saved. |
| Business data state | Unchanged. |
| Data shown on UI    | For every record, the same detail text as the complete form. |

**Acceptance Criteria:**

- ✅ For every record, opened packed detail equals the complete form's detail, record content stays inert and print shows every record.
- ❌ A shortened, reordered or missing detail, content that acts as anything other than text, a request that leaves the snapshot, or filters that stop working when detail cannot be opened fails this case.

**Test Data:**

```json
{
    "inputDomain": "any record with any outcome, criteria, links, proofs, acceptance history and change history, including empty values, markup-looking text, long text and text in any writing system",
    "invariant": "for ALL such records, detail opened from the packed form equals detail shown by the complete form of the same source",
    "boundaryCounterCase": "a reader whose environment cannot open packed detail sees the list, the counts and the stated limit; no partial or guessed detail is shown"
}
```

**Edge Cases:**

- A record with no criteria, links or history → the same "not recorded" wording as the complete form.
- A direct link to one record → opens that record in the packed form too.
- A damaged packed copy → the list and counts stay readable, the notice names the complete form and filters keep working.
- A packed snapshot read inside the workspace → the same behaviour.

**Transition Invariants:** N/A — reading a snapshot performs no lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-254]

**Related Behaviors:**

| Capability                         | Anchor |
| ---------------------------------- | ------ |
| Governing observable intent        | FR-TPT-058, FR-TPT-017, FR-TPT-018, AC-TPT-39, BR-TPT-31, BR-TPT-09, INV-TPT-09 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-254]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-254: a packed card restores exactly the card a full report shows, and hostile content stays text`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The packed form opens every record with the same detail as the full form, keeps outcomes searchable and prints them all [variant: packed-detail-opens-and-prints]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts the packed form still lists every record and says that its detail needs scripts or the full form [variant: packed-without-scripts]`
**Status:** Untested

#### TC-TPT-255: A size budget writes the richest form that fits and never refuses [P1]

**Objective:** Verify that a stated size budget selects the richest detail form that fits, always writes a snapshot and states what it chose.

**Business Intent / Invariant Guarded:** BR-TPT-31: a size budget may reduce detail depth only; it never removes a record, refuses a snapshot or splits it.

**Proves:** FR-TPT-058, FR-TPT-021, AC-TPT-39, BR-TPT-31, BR-TPT-20.

**Preconditions:**

- A project large enough that its complete, packed and detail-free snapshots have three clearly different sizes, each recorded.

**Real-World Reachability:** A teammate needs to publish the snapshot somewhere that accepts files only up to a known size, and states that size when asking.

**Demo Flow:** Ask for the complete form four times, each with a different budget: above the complete size; between the packed and complete sizes; between the detail-free and packed sizes; below the detail-free size. Read the result and the snapshot each time.

```gherkin
Given the recorded sizes of the complete, packed and detail-free snapshots of one project
When a reader asks for the complete form with a budget between the packed and complete sizes
Then the packed form is written within the budget
And the result and the snapshot state that the packed form was chosen for the budget
When the reader asks again with a budget below the detail-free size
Then the detail-free form is still written
And the result and the snapshot state that the budget was not met
And in every case every inspected record is listed
```

**Expected Result:**

| Dimension           | Expectation |
| ------------------- | ----------- |
| UI                  | The snapshot names its detail form and, when a budget changed it, says so beside the coverage facts. |
| System behavior     | The richest of the requested form, then packed, then detail-free that fits is written; the outcome names the form written, its size and whether the budget was met. |
| Business data state | Unchanged; the project's default snapshot is not replaced by a budgeted one. |
| Data shown on UI    | Chosen form, stated budget, actual size and "Size budget not met" when that applies. |

**Acceptance Criteria:**

- ✅ Each budget yields the richest fitting form, a budget nothing fits still yields the detail-free form with the stated shortfall, and the list is complete every time.
- ❌ A refusal for size, a shortened list, a silent change of form, or a larger-than-budget snapshot reported as fitting fails this case.

**Test Data:**

```json
{
    "requestedForm": "complete",
    "budgets": ["above the complete size", "between packed and complete", "between detail-free and packed", "below the detail-free size"],
    "expectedForm": ["complete", "packed", "none", "none, budget not met"]
}
```

**Edge Cases:**

- The packed form requested with a budget below the packed size → the detail-free form.
- No budget stated → a compact snapshot is held to the default 15 MB; the complete form requested by name is written whatever its size.
- A budget that is not a positive whole size → refused as invalid, with the previous snapshot kept.
- A budget set once for the project → applied to the snapshots the project configures and to their automatic refresh; a form requested by name is held only to a budget requested with it, so the complete form can still be requested.

**Transition Invariants:** N/A — generating a snapshot performs no lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-255]

**Related Behaviors:**

| Capability                         | Anchor |
| ---------------------------------- | ------ |
| Governing observable intent        | FR-TPT-058, FR-TPT-021, AC-TPT-39, BR-TPT-31, BR-TPT-20 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-255]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-255: report refuses a size budget that is not a positive whole number before writing anything and keeps the previous snapshot`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-255: a byte budget writes the richest form that fits and still writes when nothing fits`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-255: a report states its size in its result and, on the page, the size budget it was held to and whether it met it`
**Status:** Untested

### Group scope, area/initiative figures and kind totals

#### TC-TPT-256: A scoped snapshot carries exactly its selected area or initiative [P1]

**Objective:** Avoid outside detail and false credit in a scoped copy.

**Business Intent / Invariant Guarded:** For ALL scoped snapshots, area union/direct initiative scope determines every carried record; outside affiliation is named as outside and grants no detail or task credit.

**Proves:** FR-TPT-054, FR-TPT-058, FR-TPT-059, AC-TPT-39, AC-TPT-40, BR-TPT-28, BR-TPT-29, BR-TPT-31, INV-TPT-09.

**Preconditions:**

- selected area A has descendants/tagged work and initiative I has only directly tagged work, including a shared task with outside affiliation
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. generate each selected scope in all forms, independently enumerate carried records and inspect outside links.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given selected area A has descendants/tagged work and initiative I has only directly tagged work, including a shared task with outside affiliation
When generate each selected scope in all forms, independently enumerate carried records and inspect outside links
Then each scope lists/details only its selected records and needed area ancestry; exact task sets/counts are equal across forms
And area/nested-initiative affiliation never expands initiative scope; outside work is not listed/detailed as inside
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each scope lists/details only its selected records and needed area ancestry; exact task sets/counts are equal across forms |
| System behavior | area/nested-initiative affiliation never expands initiative scope; outside work is not listed/detailed as inside |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each scope lists/details only its selected records and needed area ancestry; exact task sets/counts are equal across forms
- ✅ area/nested-initiative affiliation never expands initiative scope; outside work is not listed/detailed as inside
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "complete/packed/detail-free project/area/initiative scopes with overlapping outside tags",
  "invariant": "For ALL scoped snapshots, area union/direct initiative scope determines every carried record; outside affiliation is named as outside and grants no detail or task credit.",
  "boundaryCounterCase": "area/nested-initiative affiliation never expands initiative scope; outside work is not listed/detailed as inside"
}
```

**Edge Cases:**

- Needed ancestor areas provide context, not extra selected task credit.
- Selected owner counts as its own supporting record, never a task.
- Unavailable outside detail has safe readable return.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-256]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-058, FR-TPT-059, AC-TPT-39, AC-TPT-40, BR-TPT-28, BR-TPT-29, BR-TPT-31, INV-TPT-09 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-256]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-256: a scoped report carries detail for its own scope only, and names what lies outside it without detailing it`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-256: a report scoped to one area or one initiative counts and lists that scope only, and names its health after the kind of record that owns it`
**Status:** Untested

#### TC-TPT-257: Each organizational figure equals independent scope and is never summed [P0]

**Objective:** Compare area/initiative progress without duplicating delivery.

**Business Intent / Invariant Guarded:** For ALL complete scopes, each area/initiative’s figure equals an independently selected scope; overlap never becomes an additive project figure.

**Proves:** FR-TPT-059, AC-TPT-40, BR-TPT-04, BR-TPT-10, BR-TPT-28, BR-TPT-32, INV-TPT-09.

**Preconditions:**

- areas and initiatives overlap eligible/accepted tasks and complete independent scope results are recorded
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. read project figures and each selected scope’s own snapshot, then repeat with an organizational coverage gap.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given areas and initiatives overlap eligible/accepted tasks and complete independent scope results are recorded
When read project figures and each selected scope’s own snapshot, then repeat with an organizational coverage gap
Then each eligible/accepted/remaining count and percentage agrees with its own scope; shared work may appear in several independent figures
And incomplete coverage withholds all organizational figures with causes; no guessed zero/complete percentage or sum of overlapping figures appears
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each eligible/accepted/remaining count and percentage agrees with its own scope; shared work may appear in several independent figures |
| System behavior | incomplete coverage withholds all organizational figures with causes; no guessed zero/complete percentage or sum of overlapping figures appears |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each eligible/accepted/remaining count and percentage agrees with its own scope; shared work may appear in several independent figures
- ✅ incomplete coverage withholds all organizational figures with causes; no guessed zero/complete percentage or sum of overlapping figures appears
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all complete/empty/partial organizational scopes and task overlap patterns",
  "invariant": "For ALL complete scopes, each area/initiative’s figure equals an independently selected scope; overlap never becomes an additive project figure.",
  "boundaryCounterCase": "incomplete coverage withholds all organizational figures with causes; no guessed zero/complete percentage or sum of overlapping figures appears"
}
```

**Edge Cases:**

- No delivery scope is not100percent.
- Supporting/retired/canceled records earn no active task credit.
- Fixed snapshot Delivery scope is not switched by figure inspection links.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-257]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-059, AC-TPT-40, BR-TPT-04, BR-TPT-10, BR-TPT-28, BR-TPT-32, INV-TPT-09 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-257]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: a rollup row equals that area's or initiative's own exact scope`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: rollup rows are never added up`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: rollup is withheld when tags were cut`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: rollup is withheld when one area's own scope would pass the navigation byte budget that the project still fits`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: every area and initiative figure equals its own scope across nesting, shared branches and each delivery state, in any reading order`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: area and initiative figures are absent unless requested`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-257: a percentage is stated only for a completely read scope that holds eligible work, and figures are stated for every area and initiative or for none`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-257: the report states each area's own figures beside it and never a total of them`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-257: withheld figures state their reason and draw no meter or number, while every area and initiative is still named`
**Status:** Untested

#### TC-TPT-258: Per-kind standing counts records once without delivery credit [P1]

**Objective:** Keep lifecycle meaning distinct from task delivery arithmetic.

**Business Intent / Invariant Guarded:** For ALL inspected records, each appears once in its own kind/state totals; only eligible task identities earn delivery credit.

**Proves:** FR-TPT-059, AC-TPT-40, BR-TPT-04, BR-TPT-06, BR-TPT-32, INV-TPT-04.

**Preconditions:**

- delivery records use eight-state lifecycle, initiatives five-state lifecycle and areas Active/Canceled, with retired/canceled variants
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect per-kind standing and compare independent record inventory and exact task delivery figures.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given delivery records use eight-state lifecycle, initiatives five-state lifecycle and areas Active/Canceled, with retired/canceled variants
When inspect per-kind standing and compare independent record inventory and exact task delivery figures
Then delivery standing excludes areas/initiatives; their own tables use their own states and canceled/retired distinctions
And shared tags, stories/subtasks, initiative Done or area Active never create task credit or duplicate a record total
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | delivery standing excludes areas/initiatives; their own tables use their own states and canceled/retired distinctions |
| System behavior | shared tags, stories/subtasks, initiative Done or area Active never create task credit or duplicate a record total |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ delivery standing excludes areas/initiatives; their own tables use their own states and canceled/retired distinctions
- ✅ shared tags, stories/subtasks, initiative Done or area Active never create task credit or duplicate a record total
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all current kinds/states and retired/canceled records in project or selected scope",
  "invariant": "For ALL inspected records, each appears once in its own kind/state totals; only eligible task identities earn delivery credit.",
  "boundaryCounterCase": "shared tags, stories/subtasks, initiative Done or area Active never create task credit or duplicate a record total"
}
```

**Edge Cases:**

- Retired initiatives are distinct from open initiatives.
- Recorded delivery Done without applicable acceptance is not certified credit.
- A kind with no records has a truthful empty total.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-258]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-059, AC-TPT-40, BR-TPT-04, BR-TPT-06, BR-TPT-32, INV-TPT-04 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-258]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-258: status totals by kind count every inspected record once and leave the delivery figures alone`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-258: "Where work stands" counts tasks, stories and subtasks only, and says that initiatives and areas are not counted there`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A retired initiative that was never finished is not open: the workspace and the report both list it with the closed ones, and it says it was retired, not closed [variant: retired-initiative-not-open]`
**Status:** Untested

### Single-record read

#### TC-TPT-259: Read one exact record in full on request [P1]

**Objective:** Verify that one exact record can be read in full through an explicit work operation.

**Business Intent / Invariant Guarded:** BR-TPT-31, BR-TPT-05 and INV-TPT-01: detail a snapshot leaves out stays reachable for an exact identity, and an identity held by more than one record is never silently resolved.

**Proves:** FR-TPT-060, AC-TPT-41, BR-TPT-31, BR-TPT-02, BR-TPT-05, BR-TPT-10, BR-TPT-21, INV-TPT-01.

**Preconditions:**

- A project with task P2 carrying outcome, criteria, links, proof and history; two records that both carry identity D; no record with identity Z.
- A detail-free snapshot of the project.

**Real-World Reachability:** A contributor reads the detail-free snapshot, sees that P2's detail is not in that copy and asks an assistant for the record. The repeated identity D arose when two people captured the same initiative in separate working copies and both were shared.

**Demo Flow:** Request P2. Request D. Request Z.

```gherkin
Given a project and its detail-free snapshot
When a contributor requests the exact record P2
Then its outcome, criteria, links, responsibility, proof, acceptance and history are returned as currently stored
And nothing in the project changes
When the contributor requests D
Then both records that carry D are returned with their own locations and neither is selected
When the contributor requests Z
Then the result names Z as not found and offers no substitute
```

**Expected Result:**

| Dimension           | Expectation |
| ------------------- | ----------- |
| UI                  | The assistant or direct result shows the requested record in full, or the named reason. No visual workspace change is required by this case. |
| System behavior     | A read; no save, link or snapshot refresh follows. |
| Business data state | Unchanged. |
| Data shown on UI    | P2's currently stored facts; for D both records and where each is kept; for Z "not found". |

**Acceptance Criteria:**

- ✅ An exact identity returns that record in full, a repeated identity returns every record that carries it, and an unknown identity is named.
- ❌ A record chosen by resemblance, one of two records picked silently, or any change to stored work fails this case.

**Test Data:**

```json
{
    "requests": ["P2", "D", "Z"],
    "expected": ["one record in full", "two records, neither selected", "not found"]
}
```

**Edge Cases:**

- A pinned shared source → the record as that source holds it.
- A request that is not a valid identity → refused as invalid input.
- A project that cannot be read, such as one with an unfinished migration → the same named refusal as any other read.
- A record in a denied scope → denied, with no earlier copy shown in its place.

**Transition Invariants:** N/A — a read performs no lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-259]

**Related Behaviors:**

| Capability                         | Anchor |
| ---------------------------------- | ------ |
| Governing observable intent        | FR-TPT-060, AC-TPT-41, BR-TPT-31, BR-TPT-02, BR-TPT-05, BR-TPT-10, BR-TPT-21, INV-TPT-01 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-259]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-259: inspect --item returns every record with that identity and never picks between duplicates`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-259: a repeated identity stays ambiguous when only one of its records can be shown, and findings about other work are left out`
**Status:** Untested

### Snapshot currentness across forms

#### TC-TPT-260: A requested form never replaces the default snapshot, and refresh keeps the configured form [P1]

**Objective:** Verify that snapshots in different detail forms stay apart, report their currentness truthfully and refresh in the form the project configures.

**Business Intent / Invariant Guarded:** BR-TPT-31, BR-TPT-09 and BR-TPT-14: asking for another form is a separate request; it cannot replace the default snapshot, mark a stale snapshot current or change what automatic refresh writes.

**Proves:** FR-TPT-058, FR-TPT-016, AC-TPT-39, BR-TPT-31, BR-TPT-09, BR-TPT-14.

**Current contract clarification:** Read-date due/overdue facts participate in currentness, so a later UTC day may stale a report without any record edit. Refresh preserves requested/default form and source/scope.

**Preconditions:**

- A project whose default snapshot exists in the complete form and is current.

**Real-World Reachability:** The lead keeps the default snapshot open through the day. A teammate asks for a packed copy around noon. Work is saved in the afternoon.

**Demo Flow:** Request the packed form and check the default snapshot. Request the packed form again. Save a change to a task. Read both snapshots, then request the packed form once more.

```gherkin
Given a current default snapshot in the complete form
When a reader requests the packed form
Then a separate packed snapshot is written and the default snapshot is unchanged
When the reader requests the packed form again with nothing saved in between
Then the existing packed snapshot is reported current and is not rewritten
When work is saved some hours later
Then the default snapshot is refreshed in the form the project configures
And the packed snapshot is brought up to date only when it is requested again
```

**Expected Result:**

| Dimension           | Expectation |
| ------------------- | ----------- |
| UI                  | Each snapshot names its detail form and its date; the result says whether it was generated or already current. |
| System behavior     | Separately requested forms are kept apart from the default snapshot; automatic refresh touches only the default snapshot. |
| Business data state | No record changes through any snapshot request. |
| Data shown on UI    | The date of each snapshot; the packed one may be older than the default until it is requested again. |

**Acceptance Criteria:**

- ✅ The default snapshot keeps its form and place, an unchanged request is reported current, and refresh keeps the configured form.
- ❌ A requested form overwriting the default snapshot, a stale snapshot reported current, or a refresh that ignores the form or budget the project configures fails this case.

**Test Data:**

```json
{
    "sequence": ["request packed", "request packed again", "save a task change", "read the default snapshot", "request packed"],
    "expected": ["generated separately", "current", "default refreshed in the configured form", "default dated after the save", "generated"]
}
```

**Edge Cases:**

- No form named by the project or the request → the default snapshot is the compact version within the default 15 MB; it says beside its source and beside its list of records that it is the compact version and how to request the complete one, and its refresh keeps that form and budget.
- The complete form requested by name → written beside a compact default snapshot, with no budget unless one is requested with it.
- The workspace → always shows the complete form, written beside the project's own snapshot when that snapshot is compact.
- A form requested by name that is exactly the project's own form and budget → that request reads the project's default snapshot itself.
- The project configures packed as its default form → the default snapshot and its refresh are packed; a requested complete form is the separate one.
- A person's own file where a snapshot would be written → preserved and refused, as for the default snapshot (TC-TPT-007).
- A snapshot edited outside the tool → refused as altered, as for the default snapshot.
- Group and pinned-source snapshots → each keeps its own place for each form.

**Transition Invariants:** N/A — generating a snapshot performs no lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-260]

**Related Behaviors:**

| Capability                         | Anchor |
| ---------------------------------- | ------ |
| Governing observable intent        | FR-TPT-058, FR-TPT-016, AC-TPT-39, BR-TPT-31, BR-TPT-09, BR-TPT-14 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-260]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-260: a form or a budget given to the shipped report command is the one written, apart from the default snapshot`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-260: a report written before a due date passed is written again once the date has passed, and is kept while no overdue mark moves`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-260: another detail form is written apart from the default report, and a refresh keeps the form the project configures`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-260: with no form named the snapshot is the compact version within the default budget, and the full version is written when asked for by name`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The workspace reads the full version while the project's own report file is the compact version [variant: full-report-in-app]`
**Status:** Untested

### Kind display labels

#### TC-TPT-261: Display labels change inert words and no stored authority [P1]

**Objective:** Let projects use familiar kind/level/type words safely.

**Business Intent / Invariant Guarded:** For ALL valid declared-vocabulary labels, displayed text changes without altering exchanged values, records, counts or authority; full valid labels stay readable with narrow-layout reflow.

**Proves:** FR-TPT-017, FR-TPT-061, AC-TPT-42, BR-TPT-27, BR-TPT-30, BR-TPT-33.

**Preconditions:**

- a selected project declares valid kind/level/type words and records unchanged semantic values
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. read workspace/report/plain/print with labels, including valid unbroken 160-character words at a narrow width, compare stored/exchanged values, then supply invalid shape/collision/earlier-only labels.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a selected project declares valid kind/level/type words and records unchanged semantic values
When read workspace/report/plain/print with labels, including valid unbroken 160-character words at a narrow width, compare stored/exchanged values, then supply invalid shape/collision/earlier-only labels
Then every applicable display uses inert configured words, keeps full valid labels readable without horizontal overflow at narrow widths, and all identities/values/counts remain exact
And blank/control/oversized/unknown declarations or kind collisions refuse by field; labels never execute or silently translate old current words
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | every applicable display uses inert configured words, keeps full valid labels readable without horizontal overflow at narrow widths, and all identities/values/counts remain exact |
| System behavior | blank/control/oversized/unknown declarations or kind collisions refuse by field; labels never execute or silently translate old current words |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ every applicable display uses inert configured words, keeps full valid labels readable without horizontal overflow at narrow widths, and all identities/values/counts remain exact
- ✅ blank/control/oversized/unknown declarations or kind collisions refuse by field; labels never execute or silently translate old current words
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "declared2/3 vocabularies, kind/level/type label shapes, defaults and collision boundaries",
  "invariant": "For ALL valid declared-vocabulary labels, displayed text changes without altering exchanged values, records, counts or authority; full valid labels stay readable with narrow-layout reflow.",
  "boundaryCounterCase": "blank/control/oversized/unknown declarations or kind collisions refuse by field; labels never execute or silently translate old current words"
}
```

**Edge Cases:**

- Raw accepted length160 is a valid boundary, including one unbroken kind/level/type word: the full text remains readable with narrow-layout reflow and no horizontal overflow. Length161 refuses; clipping or shortening a valid label cannot satisfy readability.
- Earlier2 labels may be valid there yet invalid as current3 kind labels.
- Unmappable migration labels refuse before change under TC-TPT-246.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-261]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-017, FR-TPT-061, AC-TPT-42, BR-TPT-27, BR-TPT-30, BR-TPT-33 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-261]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-261: level and type labels from configuration reach the report as text, never as markup, in every detail form and in a scoped report`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-261: a kind label changes the word the report shows and nothing it counts`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-261: a kind label is display text only and may never be another word of either vocabulary`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-261: a kind label of a project that declares the earlier vocabulary is judged by the words that vocabulary had: the project stays readable, a label the current vocabulary uses for something else is not shown, and a word of the earlier vocabulary stays refused by field`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A kind display label is the word both the workspace and the status report show, and new work is still stored under the tracker's word [variant: kind-label-in-both-views]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Level and type labels from configuration are shown by the workspace as text, never as markup, wherever a level or a type is named [variant: labels-inert-in-workspace]`
**Status:** Untested

### The paged list of records

#### TC-TPT-262: Independent paging keeps every record and selected context reachable [P1]

**Objective:** Bound visible lists without losing scope or printable content.

**Business Intent / Invariant Guarded:** For ALL admitted lists, paging changes visible slice only; every row remains reachable and plain/print retains all rows.

**Proves:** FR-TPT-017, FR-TPT-058, AC-TPT-39, BR-TPT-09, BR-TPT-29, BR-TPT-31, INV-TPT-09.

**Preconditions:**

- a complete scope exceeds20 report rows and10 workspace top-level-area/initiative rows with a selected detail
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. page report work and initiatives independently, page workspace area/initiative lists, inspect a row and return, then read plain/print.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a complete scope exceeds20 report rows and10 workspace top-level-area/initiative rows with a selected detail
When page report work and initiatives independently, page workspace area/initiative lists, inspect a row and return, then read plain/print
Then report pages use20 and workspace organizational pages10; each independent control preserves selected scope/context and all rows remain reachable
And paging never changes membership, denominator or selected identity; plain/print never truncates to the current enhanced page
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | report pages use20 and workspace organizational pages10; each independent control preserves selected scope/context and all rows remain reachable |
| System behavior | paging never changes membership, denominator or selected identity; plain/print never truncates to the current enhanced page |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ report pages use20 and workspace organizational pages10; each independent control preserves selected scope/context and all rows remain reachable
- ✅ paging never changes membership, denominator or selected identity; plain/print never truncates to the current enhanced page
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "empty/one/exact-page/page-plus-one/volume lists, independent controls and enhanced/plain/print reading",
  "invariant": "For ALL admitted lists, paging changes visible slice only; every row remains reachable and plain/print retains all rows.",
  "boundaryCounterCase": "paging never changes membership, denominator or selected identity; plain/print never truncates to the current enhanced page"
}
```

**Edge Cases:**

- Area filtering/page changes retain valid chosen detail/context.
- First/last page controls truthfully reflect available rows.
- Browser source390’s paged-print variant maps here; migration source390 maps246 and is unrelated.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-262]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-017, FR-TPT-058, AC-TPT-39, BR-TPT-09, BR-TPT-29, BR-TPT-31, INV-TPT-09 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-262]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-262: the page carries every record and its paging controls whatever page the list shows`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The list of records shows twenty at a time, reaches every record page by page and follows a chosen record to its page [variant: work-list-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The initiative list is read ten at a time in its own order with its total always stated; steps and the rows choice repaint the list alone; the Closed head stands on every page that holds a closed one; the page is kept across a redraw and a reread, pulled back when the list shrinks and started again when the scope changes [variant: initiative-list-in-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::With scripts the report opens and closes every level of the area tree at once and reads its initiative table twenty at a time, with a page state apart from the list of records, while every row stays in the page and on paper [variant: report-level-links-and-initiative-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts the report shows every initiative row and no pager or level link, and every level of the area tree is reached through its native disclosure [variant: report-lists-whole-without-scripts]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The area list is read ten top-level areas at a time with its total stated; a level opened on one page is as the reader left it on coming back; Open all and Close all reach the levels of every page and are judged over all of them; the page starts again when the scope changes [variant: area-list-in-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The areas directly inside a scope are read ten at a time with the same pager once there are more than a page of them [variant: areas-inside-a-scope-in-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::With scripts the report reads the top of its area tree twenty areas at a time, each with the levels inside it; Open all and Close all reach every page; every area stays in the page and on paper [variant: report-area-tree-in-pages]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts the report shows every area at the top of its tree, however many there are, and no pager [variant: report-area-tree-whole-without-scripts]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::On paper the workspace shows every row of each list read in pages, the area list and the initiative list together and the areas inside a scope, each with its total; afterwards the screen is back on its page and the reader on the row, or the list, they stood on [variant: paged-lists-whole-on-paper]`
**Status:** Untested
