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
continuation: 6
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Current case guards are mapped to authored tests and remain Untested; two retired cases are Deprecated.**

# Work tracking case continuation 6

## Related Documentation

- Read `README.TaskTracking.md` §§1–7 for governing purpose, vocabulary, exact membership, scope navigation and permissions.
- This continues the same canonical registry and owns fourteen new stable case bodies. Earlier case bodies and their evidence/dispositions remain conserved in the main owner and Parts2–5.
- Existing lifecycle, acceptance/current-proof/health, cancellation/retirement, identity, native refusal and retry cases remain governing; the bounded semantic reuse map is recorded in the authoring report. One business case may require multiple executing tests.
- Earlier group-purpose semantics retained below are historical compatibility inputs; the current area and initiative contracts are governed by the main owner. This framework-library amendment requires no adopter roadmap, forced organizational taxonomy, native adapter or migration.

> Current applicability: vocabulary 3 and the main owner’s kind lifecycles/record-owned tags govern these conserved intents. Historical earlier-vocabulary examples are amended below; no new executor or migration-mechanism obligation is introduced.

## 8. Test Specifications

### Test summary

| Priority | Untested | Deprecated | Executed |
|---|---:|---:|---:|
| P0 | 4 | 1 | 0 |
| P1 | 5 | 1 | 0 |
| P2 | 3 | 0 | 0 |
| Total | 12 | 2 | 0 |

### Preservation Tests

#### TC-TPT-201: Keep optional organization and existing untagged work usable [P1]

**Objective:** Keep work useful without compulsory levels, tags or new wrappers.

**Business Intent / Invariant Guarded:** For ALL supported current projects, absent optional organization preserves useful reading and reachable work without adding authority or credit.

**Proves:** FR-TPT-053, FR-TPT-055, AC-TPT-34, AC-TPT-36, BR-TPT-27, BR-TPT-28.

**Preconditions:**

- areas G/F have unset levels, two tasks retain their intent/history and other work has no area tags
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect project, G/F and untagged tasks without configuring labels; optionally set an applicable area level and reread.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given areas G/F have unset levels, two tasks retain their intent/history and other work has no area tags
When inspect project, G/F and untagged tasks without configuring labels; optionally set an applicable area level and reread
Then unset-level areas and untagged tasks stay reachable with exact identities and conserved task credit
And no setup, wrapper, invented taxonomy or target rewrite is required; an invalid optional edit refuses unchanged
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | unset-level areas and untagged tasks stay reachable with exact identities and conserved task credit |
| System behavior | no setup, wrapper, invented taxonomy or target rewrite is required; an invalid optional edit refuses unchanged |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ unset-level areas and untagged tasks stay reachable with exact identities and conserved task credit
- ✅ no setup, wrapper, invented taxonomy or target rewrite is required; an invalid optional edit refuses unchanged
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "current projects with absent/present optional levels, labels and tags",
  "invariant": "For ALL supported current projects, absent optional organization preserves useful reading and reachable work without adding authority or credit.",
  "boundaryCounterCase": "no setup, wrapper, invented taxonomy or target rewrite is required; an invalid optional edit refuses unchanged"
}
```

**Edge Cases:**

- Supported earlier groups map read-only under TC-TPT-242; no current group-purpose operation remains.
- Adding descriptive level affects only its owner and still enforces TC-TPT-263 placement.
- Default labels are display-only.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-201]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, FR-TPT-055, AC-TPT-34, AC-TPT-36, BR-TPT-27, BR-TPT-28 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-201]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-201: absent minimal and relocated configuration need no member enrollment or hierarchy rewrite`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-201: optional level retains generic nesting and all child owners without setup or conversion`
**Status:** Untested

### Positive scope and group outcomes

#### TC-TPT-202: Set change and clear purpose without replacing omitted members [P1] [DEPRECATED: 2026-10-09 — purpose-only operation retired by the current vocabulary]

**Applicability:** Deprecated — historical vocabulary-2 purpose/member-list operation, retired by the 2026-10-09 current-contract supersession in ADR-0005. Retained for history; not a current schema3 behavior or case to repurpose. The following objective and scenario are historical.

**Objective:** Set change and clear purpose without replacing omitted members.

**Business Intent / Invariant Guarded:** A maintainer can describe group purpose without accidentally changing the work it contains.

**Proves:** FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-12, BR-TPT-27.

**Preconditions:**

- A permitted maintainer selects project group F with current revision and declared members P and subtask. F has authored text, health assessment and accepted history.
- Another group A also contains F; neither affiliation is being edited.

**Real-World Reachability:** The maintainer reads F, previews a purpose-only edit and saves it. After each actual saved result is reread, the maintainer changes its purpose and later explicitly clears it; separate actor actions use the then-current revision.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given F contains P and subtask and is also a member of A
When the maintainer previews and saves area, then program, then explicitly clears purpose, rereading between saves
Then F displays each requested purpose and finally generic
And F still contains P and subtask and A still contains F
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Preview identifies the purpose change; saving returns to F with the actual saved result. |
| System behavior | Omitting members preserves them; omitting purpose in a later member edit preserves purpose. Explicit clearing restores generic display. |
| Business data state | Requested group facts alone change; child kind, identity, body, acceptance, proof and prior history remain. |
| Data shown on UI | Rereads show the exact purpose, current members, preserved affiliations and actual revision. |

**Acceptance Criteria:**

- ✅ Each set/change/clear saves the intended fact without a companion membership or lifecycle edit.
- ❌ An empty request, invalid purpose or stale save must refuse and retain the entered draft and saved group.

**Test Data:**

```json
{
  "group": "F",
  "initialMembers": [
    "P",
    "subtask"
  ],
  "purposeSequence": [
    "area",
    "program",
    "clear"
  ],
  "otherAffiliation": "A"
}
```

**Edge Cases:** Include a membership-only edit after setting capability; omitted purpose remains capability. A denied preview/save offers no optimistic success. Replay and concurrent-edit conservation are additionally guarded by TC-TPT-234.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** Historical [Source: test/work-tracking/TC-TPT-202]; retained audit anchor, with no current primary executor.

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-12, BR-TPT-27 |
| Executing implementation/assertion | Historical only; the retired operation has no current executor or runtime claim. |

**CoveredBy:** Untested — no current primary executor; historical purpose-only operation is retired.
**Status:** Deprecated

#### TC-TPT-203: Follow selected work to governing intent and proof [P1]

**Objective:** Keep exact governing evidence reachable from stakeholder scope.

**Business Intent / Invariant Guarded:** For ALL readable scoped work, links expose the actual governing owner and applicable proof without copied authority or invented acceptance.

**Proves:** FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-05, BR-TPT-22, BR-TPT-29.

**Preconditions:**

- a permitted area and initiative point through record-owned tags to task P with governing intent and retained proof
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. enter the area or initiative scope, inspect P, open its exact intent/proof owner and return.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a permitted area and initiative point through record-owned tags to task P with governing intent and retained proof
When enter the area or initiative scope, inspect P, open its exact intent/proof owner and return
Then the same task identity, applicable proof/history, kind/state and selected source/context remain visible
And missing/denied/ambiguous owners show a named gap and safe return instead of substitute criteria or expanded authority
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the same task identity, applicable proof/history, kind/state and selected source/context remain visible |
| System behavior | missing/denied/ambiguous owners show a named gap and safe return instead of substitute criteria or expanded authority |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the same task identity, applicable proof/history, kind/state and selected source/context remain visible
- ✅ missing/denied/ambiguous owners show a named gap and safe return instead of substitute criteria or expanded authority
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "readable/unresolved/denied governing links from project/area/initiative journeys",
  "invariant": "For ALL readable scoped work, links expose the actual governing owner and applicable proof without copied authority or invented acceptance.",
  "boundaryCounterCase": "missing/denied/ambiguous owners show a named gap and safe return instead of substitute criteria or expanded authority"
}
```

**Edge Cases:**

- Linked initiative context remains reachable without changing delivery scope.
- Recorded Done and current verified acceptance remain separately labelled.
- Outside governing owner stays its own authority.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-203]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-05, BR-TPT-22, BR-TPT-29 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-203]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-203: selected delivery identities separate exclusions and support while proof and health keep their meanings`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A through F explains exactly two outcomes and their actual intent proof exclusions and support [variant: scope-outcome-intent-proof]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An initiative's record lists its linked work with the kind and state of each record, the number of tasks that count is the read's own figure, said beside the list and left unsaid when figures are withheld, and showing the rest of the list puts the reader on the first record added [variant: linked-work-and-counted-tasks]`
**Status:** Untested

#### TC-TPT-204: Enter shared work through either valid area path [P1]

**Objective:** Preserve identity and context when organizational affiliations overlap.

**Business Intent / Invariant Guarded:** For ALL valid shared affiliations, different entry paths preserve the same work identity, proof and delivery credit while retaining the chosen path.

**Proves:** FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-28, BR-TPT-29, INV-TPT-07.

**Preconditions:**

- task P tags two valid areas A/B and its accepted/current-proof facts are recorded
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. enter P through A, return, then enter through B and inspect other direct affiliations.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given task P tags two valid areas A/B and its accepted/current-proof facts are recorded
When enter P through A, return, then enter through B and inspect other direct affiliations
Then P is the same record and each selected area counts it once; Back follows the chosen path
And no duplicate identity, exclusive-parent claim or extra delivery credit is introduced
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | P is the same record and each selected area counts it once; Back follows the chosen path |
| System behavior | no duplicate identity, exclusive-parent claim or extra delivery credit is introduced |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ P is the same record and each selected area counts it once; Back follows the chosen path
- ✅ no duplicate identity, exclusive-parent claim or extra delivery credit is introduced
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "multiple valid area paths, shared tasks and independently selected scopes",
  "invariant": "For ALL valid shared affiliations, different entry paths preserve the same work identity, proof and delivery credit while retaining the chosen path.",
  "boundaryCounterCase": "no duplicate identity, exclusive-parent claim or extra delivery credit is introduced"
}
```

**Edge Cases:**

- Selecting an initiative still includes direct tags only.
- A direct link without a chosen parent invents no ancestry.
- Display labels and filters preserve identity.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-204]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-28, BR-TPT-29, INV-TPT-07 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-204]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-204: shared diamonds expose direct affiliations and exact unique scopes without a permanent parent`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Shared F retains the deliberately chosen A or B path and safely rejects a later removed tag to the area above [variant: chosen-shared-path-and-removed-edge]`
**Status:** Untested

#### TC-TPT-205: Keep untagged and unset-level work visible while filters stay cosmetic [P1]

**Objective:** Let teams inspect useful work before or outside organization.

**Business Intent / Invariant Guarded:** For ALL display filters and optional organization, project inventory preserves every admitted record and filtering never changes delivery membership or eligibility.

**Proves:** FR-TPT-054, FR-TPT-055, AC-TPT-36, BR-TPT-09, BR-TPT-28.

**Preconditions:**

- an unset-level area and untagged eligible task coexist with organized work
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect project entries, apply and clear person/state/search filters, then inspect the same task scope.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given an unset-level area and untagged eligible task coexist with organized work
When inspect project entries, apply and clear person/state/search filters, then inspect the same task scope
Then untagged work and unset-level areas remain reachable with unchanged exact task denominator
And filter-empty is distinguished from empty project and cannot erase records or create completion
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | untagged work and unset-level areas remain reachable with unchanged exact task denominator |
| System behavior | filter-empty is distinguished from empty project and cannot erase records or create completion |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ untagged work and unset-level areas remain reachable with unchanged exact task denominator
- ✅ filter-empty is distinguished from empty project and cannot erase records or create completion
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "project/area/initiative views and all admitted cosmetic filters",
  "invariant": "For ALL display filters and optional organization, project inventory preserves every admitted record and filtering never changes delivery membership or eligibility.",
  "boundaryCounterCase": "filter-empty is distinguished from empty project and cannot erase records or create completion"
}
```

**Edge Cases:**

- A complete project with no organization has useful empty area/initiative notices and reachable work.
- Canceled/retired work stays separately visible without active credit.
- No fabricated area is created for untagged work.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-205]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-055, AC-TPT-36, BR-TPT-09, BR-TPT-28 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-205]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-205: project retains unlevelled and untagged work while selected delivery remains independent of outside records`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-205: work with no area belongs to the project and is named as untagged, and no application record is needed or created`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An area without a level and work in no area remain reachable while zero search results cannot redefine area progress [variant: generic-ungrouped-filter-choices]`
**Status:** Untested

### Validation and boundary outcomes

#### TC-TPT-211: Refuse invalid owned values and unsafe labels without losing the draft [P1]

**Objective:** Fail closed for malformed optional vocabulary and preserve pending work.

**Business Intent / Invariant Guarded:** For ALL current owned-value and label declarations, only applicable allowed values and bounded inert label text are admitted; malformed declarations never silently default.

**Proves:** FR-TPT-061, FR-TPT-063, AC-TPT-42, AC-TPT-44, BR-TPT-27, BR-TPT-33.

**Preconditions:**

- current record F has a retained draft and a project config can be varied in isolated copies
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. attempt an unknown/foreign-kind value and invalid kind/level/type label shapes, then inspect valid boundary text.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given current record F has a retained draft and a project config can be varied in isolated copies
When attempt an unknown/foreign-kind value and invalid kind/level/type label shapes, then inspect valid boundary text
Then each invalid field has a named refusal with saved records and pending draft preserved; valid inert boundary text displays only
And blank/control/oversized/malformed/unknown-key labels and declared-vocabulary kind collisions do not become work or executable instructions
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each invalid field has a named refusal with saved records and pending draft preserved; valid inert boundary text displays only |
| System behavior | blank/control/oversized/malformed/unknown-key labels and declared-vocabulary kind collisions do not become work or executable instructions |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each invalid field has a named refusal with saved records and pending draft preserved; valid inert boundary text displays only
- ✅ blank/control/oversized/malformed/unknown-key labels and declared-vocabulary kind collisions do not become work or executable instructions
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all valid current kind/level/type label keys, raw text lengths160/161, control/blank/shape/collision and owned-value applicability",
  "invariant": "For ALL current owned-value and label declarations, only applicable allowed values and bounded inert label text are admitted; malformed declarations never silently default.",
  "boundaryCounterCase": "blank/control/oversized/malformed/unknown-key labels and declared-vocabulary kind collisions do not become work or executable instructions"
}
```

**Edge Cases:**

- A160-character nonblank label is admitted;161 raw characters refuses even if trimming would shorten it.
- Declared earlier2 group labels use earlier compatibility only and cannot become a current groupLabels configuration.
- Kind-owned null/omission applicability is fully owned by TC-TPT-272.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-211]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-061, FR-TPT-063, AC-TPT-42, AC-TPT-44, BR-TPT-27, BR-TPT-33 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-211]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-211: declared labels share project validation and fail closed at raw length control and shape boundaries`
**Status:** Untested

### Edge and concern outcomes

#### TC-TPT-212: Expose corrupt or bounded affiliation as incomplete scope [P2]

**Objective:** Avoid complete progress claims from incomplete organization.

**Business Intent / Invariant Guarded:** For ALL missing/ambiguous/cyclic/cut tagged scope, expose exact causes and inspected work without a complete percentage or arbitrary owner.

**Proves:** FR-TPT-013, FR-TPT-021, AC-TPT-35, BR-TPT-10, BR-TPT-28, BR-TPT-32.

**Preconditions:**

- a selected source contains unresolved area/initiative tags or a bounded incomplete read
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect project and selected area/initiative figures, then follow available safe details.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a selected source contains unresolved area/initiative tags or a bounded incomplete read
When inspect project and selected area/initiative figures, then follow available safe details
Then Partial/Unavailable and the causal identity/tag or limit are explicit; known work remains inspectable
And no automatic repair, guessed owner, zero-as-complete result or complete organizational figures is produced
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Partial/Unavailable and the causal identity/tag or limit are explicit; known work remains inspectable |
| System behavior | no automatic repair, guessed owner, zero-as-complete result or complete organizational figures is produced |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ Partial/Unavailable and the causal identity/tag or limit are explicit; known work remains inspectable
- ✅ no automatic repair, guessed owner, zero-as-complete result or complete organizational figures is produced
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "unresolved/duplicate/cyclic target graphs and read bounds",
  "invariant": "For ALL missing/ambiguous/cyclic/cut tagged scope, expose exact causes and inspected work without a complete percentage or arbitrary owner.",
  "boundaryCounterCase": "no automatic repair, guessed owner, zero-as-complete result or complete organizational figures is produced"
}
```

**Edge Cases:**

- UNRESOLVED_TAG identifies missing affiliation; no relink is guessed.
- All area/initiative figures withhold together when organizational coverage is incomplete.
- Complete empty scope is a separate outcome.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-212]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-013, FR-TPT-021, AC-TPT-35, BR-TPT-10, BR-TPT-28, BR-TPT-32 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-212]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-212: manual corrupt tag reads terminate honestly without selecting duplicated owners or repairing bytes`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-212: edge and navigation byte bounds disclose omissions without complete percentages or invented untagged claims`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-212: a tag whose target record was removed by hand leaves the read partial, names the unresolved tag and certifies no figure`
**Status:** Untested

#### TC-TPT-213: Inspect narrow scope without hiding wider linked concerns [P2]

**Objective:** Keep scope arithmetic separate from permitted exact management context.

**Business Intent / Invariant Guarded:** For ALL narrow delivery scopes, counts use only selected tasks while permitted incoming/outgoing concerns retain their actual owners and coverage.

**Proves:** FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-22, BR-TPT-28, BR-TPT-29.

**Preconditions:**

- selected area or initiative has task P linked to permitted governing/other work outside its delivery scope
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect selected task figures, open exact linked concerns and return.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given selected area or initiative has task P linked to permitted governing/other work outside its delivery scope
When inspect selected task figures, open exact linked concerns and return
Then scope denominator stays exact and separately labelled outside relationships remain reachable under actual access
And outside records never enter delivery count or scoped snapshot detail merely because they are linked
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | scope denominator stays exact and separately labelled outside relationships remain reachable under actual access |
| System behavior | outside records never enter delivery count or scoped snapshot detail merely because they are linked |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ scope denominator stays exact and separately labelled outside relationships remain reachable under actual access
- ✅ outside records never enter delivery count or scoped snapshot detail merely because they are linked
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "selected project/area/initiative scopes and permitted/denied exact outside links",
  "invariant": "For ALL narrow delivery scopes, counts use only selected tasks while permitted incoming/outgoing concerns retain their actual owners and coverage.",
  "boundaryCounterCase": "outside records never enter delivery count or scoped snapshot detail merely because they are linked"
}
```

**Edge Cases:**

- Scoped snapshot names outside affiliations without carrying outside record detail.
- Global permitted management remains available separately.
- Denied relationships give reasons without broader cached disclosure.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-213]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-22, BR-TPT-28, BR-TPT-29 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-213]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-213: narrow scope preserves global management and exact shared-spec concern selection without inferred members`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::P-only concerns exclude Q until the exact shared specification is selected, without changing what is tagged to F [variant: exact-concern-owner-and-retained-outside-draft]`
**Status:** Untested

### Authorization outcomes

#### TC-TPT-221: Keep stakeholder reading and guidance separate from write authority [P0]

**Objective:** Make viewing organization useful without granting mutation.

**Business Intent / Invariant Guarded:** For ALL stakeholder/guidance reads, title, labels, area level, initiative type and navigation grant no tag, lifecycle, proof or acceptance authority.

**Proves:** FR-TPT-025, AC-TPT-30, AC-TPT-34, AC-TPT-45, BR-TPT-14, BR-TPT-15, BR-TPT-27, BR-TPT-29.

**Preconditions:**

- a stakeholder can read selected source but has no separately established write or initiative-decision authority
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect area/initiative details and advisory guidance, then attempt a tag or initiative decision.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a stakeholder can read selected source but has no separately established write or initiative-decision authority
When inspect area/initiative details and advisory guidance, then attempt a tag or initiative decision
Then reading works within permitted scope and each unauthorized action is refused with draft/source preserved
And pinned/read-only views, hints, labels and actor titles never widen access or claim a saved decision
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | reading works within permitted scope and each unauthorized action is refused with draft/source preserved |
| System behavior | pinned/read-only views, hints, labels and actor titles never widen access or claim a saved decision |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ reading works within permitted scope and each unauthorized action is refused with draft/source preserved
- ✅ pinned/read-only views, hints, labels and actor titles never widen access or claim a saved decision
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "read/write/decision capability combinations and direct/UI/guidance entries",
  "invariant": "For ALL stakeholder/guidance reads, title, labels, area level, initiative type and navigation grant no tag, lifecycle, proof or acceptance authority.",
  "boundaryCounterCase": "pinned/read-only views, hints, labels and actor titles never widen access or claim a saved decision"
}
```

**Edge Cases:**

- A permitted contributor still requires current actor/revision/independent controls.
- Manual-record correction and usual initiative-decision authority remain separate.
- Snapshot links do not turn pinned source writable.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-221]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-025, AC-TPT-30, AC-TPT-34, AC-TPT-45, BR-TPT-14, BR-TPT-15, BR-TPT-27, BR-TPT-29 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-221]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: trusted hierarchy read verbs and delivery intents receive non-authorizing guidance`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: hierarchy read guidance retains off invalid unavailable and native silence controls`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: hierarchy notices preserve restricted pending Skip permissions and linked opt-out authority`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A session that may not save shows a record's areas and initiatives, says why they cannot be changed, and offers no tag, decision or capture [variant: read-only-offers-no-change]`
**Status:** Untested

### Invariant / Property Tests

#### TC-TPT-231: For every valid purpose and label preserve descriptive-only semantics [P0] [DEPRECATED: 2026-10-09 — purpose-only operation retired by the current vocabulary]

**Applicability:** Deprecated — historical vocabulary-2 purpose/member-list operation, retired by the 2026-10-09 current-contract supersession in ADR-0005. Retained for history; not a current schema3 behavior or case to repurpose. The following objective and scenario are historical.

**Objective:** For every valid purpose and label preserve descriptive-only semantics.

**Business Intent / Invariant Guarded:** BR-TPT-27: for ALL admitted purpose/label combinations, description cannot change work authority or membership.

**Proves:** BR-TPT-27, FR-TPT-053, AC-TPT-34.

**Preconditions:**

- A permitted group has recorded identity, members, text, lifecycle, acceptance and proof before each edit. Separate denied and nongroup variants are available.
- The chosen project admits ordinary group maintenance and valid label configuration; no native conversion is enabled.

**Real-World Reachability:** A maintainer generates each legal purpose selection through preview/save/reread, using current revision for each separate action. The reader then inspects every admitted label combination; invalid counter-cases are requested through the same actual boundary.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given any valid vision or project group and any admitted purpose and display-label combination
When a permitted current purpose-only edit is saved and the result is reread
Then all members, child records, identity, authority, lifecycle, acceptance and proof are conserved
And omitting purpose preserves it while explicit clear restores generic
But a nongroup, unknown purpose, invalid label or empty request is refused without mutation
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Valid vocabulary displays as inert text and each edit has its actual saved/refused outcome. |
| System behavior | Exercise set/change/clear, round-trip back to generic and independent label changes; duplicate label text cannot merge roles or identities. |
| Business data state | Only requested group facts change; no label creates history, membership, permission or execution. |
| Data shown on UI | Configured text or default Area/Domain/Feature/Program appears with stable group identity. |

**Acceptance Criteria:**

- ✅ Every admitted input conserves protected facts and each boundary counter-case fails closed.
- ❌ Any semantic change caused by label text, a purpose-only member replacement or invalid-input fallback fails.

**Test Data:**

```json
{
  "inputDomain": "all vision/project groups; absent/clear/area/domain/capability/program purpose; nonblank trimmed control-free labels of 1..160 characters including markup-looking and duplicate text; omitted labels",
  "invariant": "purpose/label description preserves identity, membership, authority, child bytes, lifecycle, acceptance and proof; omitted facts preserve",
  "boundaryCounterCase": [
    "purpose on delivery item",
    "unknown purpose",
    "empty patch",
    "blank label",
    "control character",
    "161-character label",
    "unsupported label key"
  ]
}
```

**Edge Cases:** Probe round-trip and commutativity of independent label changes with reads; no difference in acceptance, eligibility or health is allowed. Compare allowed group edits to their permission-negative counterpart.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** Historical [Source: test/work-tracking/TC-TPT-231]; retained audit anchor, with no current primary executor.

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | BR-TPT-27, FR-TPT-053, AC-TPT-34 |
| Executing implementation/assertion | Historical only; the retired operation has no current executor or runtime claim. |

**CoveredBy:** Untested — no current primary executor; historical purpose-only operation is retired.
**Status:** Deprecated

#### TC-TPT-232: For every admitted graph conserve exact unique delivery scope [P0]

**Objective:** Make selected task arithmetic independent of overlap and entry path.

**Business Intent / Invariant Guarded:** For ALL admitted tag graphs, area scope is descendant-area union and initiative scope is direct tags only; unique eligible/accepted/remaining task sets equal independently enumerated scope.

**Proves:** FR-TPT-054, FR-TPT-059, AC-TPT-35, AC-TPT-36, AC-TPT-40, BR-TPT-04, BR-TPT-28, INV-TPT-04, INV-TPT-07.

**Preconditions:**

- multiple areas and initiatives share tagged tasks alongside stories/subtasks and canceled/retired tasks
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. independently list each selected scope’s task identities, inspect figures and reorder/overlap tags without changing sets.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given multiple areas and initiatives share tagged tasks alongside stories/subtasks and canceled/retired tasks
When independently list each selected scope’s task identities, inspect figures and reorder/overlap tags without changing sets
Then each eligible task counts once, excluded work is named and every scope equals its independent exact set
And area membership, nested initiative affiliation, parent/source/dependency links or supporting records never inflate direct initiative scope or task credit
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each eligible task counts once, excluded work is named and every scope equals its independent exact set |
| System behavior | area membership, nested initiative affiliation, parent/source/dependency links or supporting records never inflate direct initiative scope or task credit |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each eligible task counts once, excluded work is named and every scope equals its independent exact set
- ✅ area membership, nested initiative affiliation, parent/source/dependency links or supporting records never inflate direct initiative scope or task credit
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all admitted multiple-parent area graphs, direct initiative sets, tag orders and eligibility states",
  "invariant": "For ALL admitted tag graphs, area scope is descendant-area union and initiative scope is direct tags only; unique eligible/accepted/remaining task sets equal independently enumerated scope.",
  "boundaryCounterCase": "area membership, nested initiative affiliation, parent/source/dependency links or supporting records never inflate direct initiative scope or task credit"
}
```

**Edge Cases:**

- Empty/partial/unavailable scope never claims complete delivery percentage.
- Canceling an area preserves tags and member records; remaining eligible tasks follow exact declared scope.
- Initiative/area prerequisite meanings belong to readiness cases, not membership expansion.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-232]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-059, AC-TPT-35, AC-TPT-36, AC-TPT-40, BR-TPT-04, BR-TPT-28, INV-TPT-04, INV-TPT-07 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-232]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-232: finite graph permutations and portable states conserve unique identities and exclude every link that is not a tag`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-232: one selector names an exact area or initiative and the read states that scope alone`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-232: an unknown or wrong-kind selector gives an unavailable scope and no figure`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-232: an area counts the tasks tagged to it or to any area beneath it once each, so a parent is not the sum of its children`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-232: an initiative counts only the tasks linked directly to it: work in an area the initiative sits in, or linked to an initiative placed under it, does not join`
**Status:** Untested

#### TC-TPT-233: For every readable entry preserve identity source and return context [P0]

**Objective:** Keep navigation honest across workspace and read-only snapshots.

**Business Intent / Invariant Guarded:** For ALL readable entry paths, selected source, identity, delivery scope and coverage are preserved; contextual return follows the chosen path without inventing authority or ancestry.

**Proves:** FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-18, BR-TPT-29, INV-TPT-06, INV-TPT-07.

**Preconditions:**

- a permitted source includes shared work and direct links, and a snapshot has one fixed Delivery scope
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. enter through project/area/initiative or direct record link, inspect details/other affiliations, page and return.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a permitted source includes shared work and direct links, and a snapshot has one fixed Delivery scope
When enter through project/area/initiative or direct record link, inspect details/other affiliations, page and return
Then the chosen scope/context and exact identity remain readable across enhanced/plain/print forms
And inspection links never switch fixed snapshot Delivery scope; missing/denied paths show reason and safe return without substitution
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the chosen scope/context and exact identity remain readable across enhanced/plain/print forms |
| System behavior | inspection links never switch fixed snapshot Delivery scope; missing/denied paths show reason and safe return without substitution |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the chosen scope/context and exact identity remain readable across enhanced/plain/print forms
- ✅ inspection links never switch fixed snapshot Delivery scope; missing/denied paths show reason and safe return without substitution
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "workspace/report/plain/print/direct/shared-source entry paths",
  "invariant": "For ALL readable entry paths, selected source, identity, delivery scope and coverage are preserved; contextual return follows the chosen path without inventing authority or ancestry.",
  "boundaryCounterCase": "inspection links never switch fixed snapshot Delivery scope; missing/denied paths show reason and safe return without substitution"
}
```

**Edge Cases:**

- A direct record entry does not invent a parent.
- Independent page controls retain selected scope and detail.
- A shared baseline keeps its own pinned source; no silent current-copy fallback.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-233]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-18, BR-TPT-29, INV-TPT-06, INV-TPT-07 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-233]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-233: pinned labels levels and tags remain baseline-specific after local label and scope changes`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-233: quoted host and nonread hierarchy data stay silent with a trusted read positive control`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-233: hierarchy normalized contexts retain delivery credit and bounded hash-only receipts`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Pinned scoped reading and finite snapshot entries preserve their admitted source and refuse a forged entry [variant: pinned-path-and-forged-snapshot-entry]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Scoping into an area or an initiative restates the Overview for that scope under a path of the way in, and each step of the path widens the scope again [variant: scope-in-and-back-out]`
**Status:** Untested

#### TC-TPT-234: For every permitted affiliation retry conserve owner facts and newer edits [P0]

**Objective:** Preserve stable organizational facts under retry and conflict.

**Business Intent / Invariant Guarded:** For ALL permitted affiliation requests, one completed identity applies once; omitted tags and unrelated facts remain, targets do not change, and stale or changed-reused requests preserve newer saved work.

**Proves:** FR-TPT-007, FR-TPT-053, AC-TPT-11, AC-TPT-34, BR-TPT-02, BR-TPT-12, BR-TPT-27, INV-TPT-05.

**Preconditions:**

- task T has current revision, independent area/initiative tags and a recorded operation identity
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. save a narrow tag update, retry exactly, then attempt a stale or changed-reused request after a newer edit.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given task T has current revision, independent area/initiative tags and a recorded operation identity
When save a narrow tag update, retry exactly, then attempt a stale or changed-reused request after a newer edit
Then exact replay returns the original outcome without revision/history growth and target records remain exact
And stale or changed-reused requests refuse without overwriting the newer owner or omitted relation
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | exact replay returns the original outcome without revision/history growth and target records remain exact |
| System behavior | stale or changed-reused requests refuse without overwriting the newer owner or omitted relation |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ exact replay returns the original outcome without revision/history growth and target records remain exact
- ✅ stale or changed-reused requests refuse without overwriting the newer owner or omitted relation
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "permitted tag sets, omitted/provided/clear relations and exact/stale/changed operation identities",
  "invariant": "For ALL permitted affiliation requests, one completed identity applies once; omitted tags and unrelated facts remain, targets do not change, and stale or changed-reused requests preserve newer saved work.",
  "boundaryCounterCase": "stale or changed-reused requests refuse without overwriting the newer owner or omitted relation"
}
```

**Edge Cases:**

- This stable intent is retained; no current primary registration is claimed until parent validates an exact guard/remap.
- Order-equivalent sets are a no-change request, not a new membership authority.
- Denied or changed actor/access/current controls cannot borrow an old preview.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** TBD — no matching current primary guard has been verified.

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-007, FR-TPT-053, AC-TPT-11, AC-TPT-34, BR-TPT-02, BR-TPT-12, BR-TPT-27, INV-TPT-05 |
| Executing primary guard | Untested — no matching current primary registration has been verified; no executable evidence is claimed. |

**CoveredBy:** Untested — no current primary registration has been verified; resolve this guard gap before claiming executable coverage.
**Status:** Untested

### UI / User journey flows

#### TC-TPT-241: Read the exact selected journey across enhanced print and narrow views [P2]

**Objective:** Keep selected organizational progress usable in every supported reading form.

**Business Intent / Invariant Guarded:** For ALL supported reading surfaces and widths, source, exact selected scope, identity, counts and useful navigation remain readable without authorizing writes.

**Proves:** FR-TPT-015, FR-TPT-017, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-29, BR-TPT-31.

**Preconditions:**

- a complete selected scope includes areas/initiatives, shared tasks and long identity/text content
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. read area tree and initiative list, inspect delivery/intent/proof, use keyboard/return, and read narrow/plain/print forms.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a complete selected scope includes areas/initiatives, shared tasks and long identity/text content
When read area tree and initiative list, inspect delivery/intent/proof, use keyboard/return, and read narrow/plain/print forms
Then text, controls, small meter parts, focus targets and selected context remain perceivable/reachable; plain/print carries all applicable rows
And no clipped unreachable required action, hidden record, script-only essential reading or altered task denominator is admitted
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | text, controls, small meter parts, focus targets and selected context remain perceivable/reachable; plain/print carries all applicable rows |
| System behavior | no clipped unreachable required action, hidden record, script-only essential reading or altered task denominator is admitted |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ text, controls, small meter parts, focus targets and selected context remain perceivable/reachable; plain/print carries all applicable rows
- ✅ no clipped unreachable required action, hidden record, script-only essential reading or altered task denominator is admitted
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "enhanced/plain/print/narrow/volume views, keyboard/focus and long content",
  "invariant": "For ALL supported reading surfaces and widths, source, exact selected scope, identity, counts and useful navigation remain readable without authorizing writes.",
  "boundaryCounterCase": "no clipped unreachable required action, hidden record, script-only essential reading or altered task denominator is admitted"
}
```

**Edge Cases:**

- Count wording remains truthful/readable for one and many; it adds no case per phrase.
- Page controls and area open/close preserve scope/context.
- Unsupported detail forms show a nearby reason and full-read route rather than disappearing work.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-241]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-015, FR-TPT-017, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-29, BR-TPT-31 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-241]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-241: the full report holds every area as plain content with its level, its own figures and the areas inside it, opening level by level without scripts`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-241: the full report holds every initiative as plain content with type, status, priority level, due date and an overdue marker, the overdue first and the closed last`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Keyboard and narrow workspace reading preserve A/F return filters and the open area draft through report refresh [variant: workspace-keyboard-return-and-live-draft]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Enhanced fixed-F report keyboard inspection and print retain P/Q while the opened area line and filters return safely [variant: enhanced-fixed-report-keyboard-and-print]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts native area, record and intent/proof anchors keep the exported F list exact in print [variant: native-fixed-scope-print-and-direct-edge]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A real owned output obstruction preserves prior report and draft, then explicit refresh publishes the actual changed-source result [variant: fresh-source-and-generation-refusal]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Overview states every area in a tree whose levels all start closed and open one by one, and every initiative against its due date, each with the figure the read supplies [variant: overview-areas-and-initiatives]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts the full report, written with every level of its area tree closed, opens the tree level by level, states every initiative in a table, and walks from a record to its areas and initiatives by native links [variant: areas-and-initiatives-without-scripts]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::At 320 pixels wide neither view scrolls the page sideways: a list wider than the page scrolls inside its own named box, which a keyboard can reach and where its last column can still be reached [variant: narrow-reflow-both-views]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Every control the workspace adds for areas, initiatives, scope and tags is at least 44 pixels wide and high, however short the name it carries [variant: new-controls-meet-target-size]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A delivery meter tells its three parts apart by shape and by name, and an overdue date says so in words beside a mark, in both views [variant: meaning-not-by-colour-alone]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Every part a delivery meter draws keeps a least width, so one task among several hundred can be seen beside the rest [variant: meter-part-least-width]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::On paper an area line with areas inside it and one without start at the same place, as they do on screen [variant: area-lines-align-on-paper]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::In the report an area or initiative name that leads to its record is a target at least 44 pixels wide and high, however short the name, with no style attribute anywhere on the page [variant: report-names-meet-target-size]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::The line for the tasks in no area agrees in number with its count in both views: several tasks count, one task counts [variant: no-area-line-agrees-in-number]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A project with no areas says that its one task counts, or that all of its tasks count, for the whole project [variant: no-areas-sentence-agrees-in-number]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Every level of the area list is closed when the workspace opens; Open all and Close all act on every level in place, the one that would change nothing is unavailable, and a line's own toggle keeps working after each [variant: area-levels-open-and-close-all]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An area list in which no area holds another has no level to open, and offers neither Open all nor Close all [variant: no-level-links-without-levels]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::At 320, 768, 1000, 1280 and 1440 pixels, with hundreds of records, long titles and identities that cannot break, no view scrolls the page sideways, nothing is painted outside the card that holds it, a pager keeps to two lines and every small control keeps a full-size target [variant: nothing-leaves-its-card-at-any-width]`
**Status:** Untested
