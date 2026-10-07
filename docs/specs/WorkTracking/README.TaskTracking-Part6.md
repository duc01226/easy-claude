---
module: WorkTracking
service: work-tracking
feature_code: TPT
status: draft
provisional: true
owner: Framework maintainers
last_updated: 2026-10-07
source_of_truth: README.TaskTracking.md
parent_spec: README.TaskTracking.md
continuation: 6
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 6

## Related Documentation

- Read `README.TaskTracking.md` §§1–7 for governing purpose, vocabulary, exact membership, scope navigation and permissions.
- This continues the same canonical registry and owns fourteen new stable case bodies. Earlier case bodies and their evidence/dispositions remain conserved in the main owner and Parts2–5.
- Existing lifecycle, acceptance/current-proof/health, cancellation/retirement, identity, native refusal and retry cases remain governing; the bounded semantic reuse map is recorded in the authoring report. One business case may require multiple executing tests.
- Group purpose is descriptive metadata, not a new lifecycle. This framework-library amendment requires no adopter roadmap, forced organizational taxonomy, native adapter or migration.

## 8. Test Specifications

### Test summary

| Priority | Untested | Executed |
|---|---:|---:|
| P0 | 5 | 0 |
| P1 | 6 | 0 |
| P2 | 3 | 0 |
| Total | 14 | 0 |

### Preservation Tests

#### TC-TPT-201: Keep existing generic work usable beside optional purposes [P1]

**Objective:** Keep existing generic work usable beside optional purposes.

**Business Intent / Invariant Guarded:** Optional vocabulary must not force an existing project into an organizational taxonomy.

**Proves:** FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-27.

**Preconditions:**

- A contributor has an existing generic vision G containing a project group F and a delivery outcome P; F has a subtask and a separate delivery outcome Q. Existing intent, accepted history and current-proof gaps are recorded.
- The selected permitted project has no declared purpose labels. Its existing configuration and work are recorded before inspection.

**Real-World Reachability:** The contributor opens the existing project, reads G and F, then chooses a purpose for F after reading its current revision and members. No conversion, setup interview or migration step occurs.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given G and F are existing generic groups in a permitted project
When the contributor inspects them and explicitly saves F as a capability through group maintenance
Then G remains generic and both delivery outcomes remain reachable with their original identities
And subtasks, history, configuration and the existing nesting remain unchanged
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Generic and labelled groups coexist; the normal read and group-maintenance paths remain usable. |
| System behavior | Absent purpose and absent label configuration preserve supported legacy reading; no wrapper or fixed depth is required. |
| Business data state | Only the authorized purpose edit is saved; child records and configuration remain byte-conserved. |
| Data shown on UI | The capability displays Feature by default; generic G retains its identity and its actual two-outcome scope. |

**Acceptance Criteria:**

- ✅ Existing generic work remains inspectable before and after one optional purpose edit.
- ❌ Requiring an area wrapper, converting kinds or rewriting children fails this case.

**Test Data:**

```json
{
  "groups": [
    "G",
    "F"
  ],
  "members": {
    "G": [
      "F",
      "P"
    ],
    "F": [
      "Q",
      "subtask"
    ]
  },
  "configuredLabels": "absent",
  "eligibleOutcomes": [
    "P",
    "Q"
  ]
}
```

**Edge Cases:** Repeat with minimal valid setup and custom declared roots; a malformed declared profile keeps its existing refusal rather than silently using a default. A capability under a capability and an area under a generic group remain legal when membership is valid.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-201]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-27 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-201]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::An optional capability purpose uses Feature by default without converting generic nesting or children [variant: generic-purpose-coexistence]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-201: absent minimal and relocated configuration need no member enrollment or hierarchy rewrite`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-201: optional purpose retains generic nesting and all child owners without setup or conversion`
**Status:** Untested

### Positive scope and group outcomes

#### TC-TPT-202: Set change and clear purpose without replacing omitted members [P1]

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

**Evidence:** [Source: test/work-tracking/TC-TPT-202]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-12, BR-TPT-27 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-202]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Purpose set change clear and membership-only edits preserve omitted facts and a refused stale draft [variant: purpose-exact-omission-and-conflict]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-202: purpose preview set change and clear conserve omitted members and external affiliation`
**Status:** Untested

#### TC-TPT-203: Follow a stakeholder scope to an outcome and its governing proof [P1]

**Objective:** Follow a stakeholder scope to an outcome and its governing proof.

**Business Intent / Invariant Guarded:** A decision maker can explain delivery progress using the exact independently useful outcomes behind it.

**Proves:** FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-04, BR-TPT-28, BR-TPT-29.

**Preconditions:**

- Area A directly contains capability F. F declares delivery outcomes P and Q, canceled R, retired S, a story and a subtask; P provides a useful integration outcome to a consuming system.
- Q retains accepted history but has a relevant current-proof gap. Exact governing-intent and proof owners are readable; health is not attested.

**Real-World Reachability:** A stakeholder opens the current project, selects A then F, reads the loaded selected scope, opens P and its governing intent, and returns after observing each new location.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given F contains P, Q, R, S, story and subtask
When the stakeholder follows project to A to F to P and its exact governing intent and returns
Then the primary delivery list is exactly P and Q and the denominator is two
And R and S are separately inspectable as excluded and story and subtask are inspectable as supporting work
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Scope, source, coverage and one primary next action precede details; Back returns to F under A. |
| System behavior | Count independently useful delivery items once; an integration outcome qualifies without a visual widget. Direct child groups and supporting members remain separate. |
| Business data state | Reading, following intent and returning change no responsibility, lifecycle, acceptance or proof. |
| Data shown on UI | Q is accepted historically with re-verification needed; health stays Unknown. P is the same canonical outcome at every location. |

**Acceptance Criteria:**

- ✅ The selected eligible identities explain the denominator and exact intent/proof links remain actionable.
- ❌ Counting a subtask/widget, concealing exclusions or promoting Q to current proof fails this case.

**Test Data:**

```json
{
  "members": [
    "P",
    "Q",
    "R",
    "S",
    "story",
    "subtask"
  ],
  "eligible": [
    "P",
    "Q"
  ],
  "excluded": [
    "R",
    "S"
  ],
  "accepted": [
    "Q"
  ],
  "currentlyVerified": [],
  "health": "Unknown"
}
```

**Edge Cases:** An empty capability stays visible with No delivery scope; missing or denied governing intent shows its reason and safe return. Native unsupported proof remains unavailable, without copied replacement criteria.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-203]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-04, BR-TPT-28, BR-TPT-29 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-203]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A through F explains exactly two outcomes and their actual intent proof exclusions and support [variant: scope-outcome-intent-proof]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-203: selected delivery identities separate exclusions and support while proof and health keep their meanings`
**Status:** Untested

#### TC-TPT-204: Enter one shared capability through either area [P1]

**Objective:** Enter one shared capability through either area.

**Business Intent / Invariant Guarded:** Shared work remains one outcome set while the reader retains the context actually chosen.

**Proves:** FR-TPT-055, AC-TPT-36, BR-TPT-28, BR-TPT-29, INV-TPT-07.

**Preconditions:**

- Areas A and B each directly declare capability F; F contains P and Q. A also reaches Q through generic G.
- The reader has permission to read both areas and starts with a recorded search filter in A.

**Real-World Reachability:** The stakeholder enters F from A, opens an outcome and returns, then deliberately chooses B from F’s other affiliations and enters F there. Each location is read before the next dependent action.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given A and B both directly contain F and F contains P and Q
When the reader enters F through A then separately through B
Then F keeps one identity and the same two-outcome denominator
And each return trail names the chosen area and the other direct affiliation is available on demand
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The chosen breadcrumb and Back remain clear; other affiliations are a separate explicit choice. |
| System behavior | Validate a chosen path against direct membership; legitimate diamond reuse is not a cycle. Do not expand every possible ancestry path. |
| Business data state | Navigation and filters save no reciprocal membership, copied item or history. |
| Data shown on UI | P and Q appear once in each selected scope; A’s second route to Q adds no credit. |

**Acceptance Criteria:**

- ✅ Returning preserves the chosen area and filter while alternative entry preserves canonical identity.
- ❌ Inventing a single permanent parent, multiplying identities by paths or accepting a nonmembership breadcrumb fails.

**Test Data:**

```json
{
  "directMembers": {
    "A": [
      "F",
      "G"
    ],
    "B": [
      "F"
    ],
    "F": [
      "P",
      "Q"
    ],
    "G": [
      "Q"
    ]
  },
  "featureDenominator": 2,
  "areaADenominator": 2
}
```

**Edge Cases:** Direct entry to F claims no selected parent. If the saved path’s edge was removed by a real later group edit, show Path unavailable and a safe current scope rather than reattaching it.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-204]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-055, AC-TPT-36, BR-TPT-28, BR-TPT-29, INV-TPT-07 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-204]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Shared F retains the deliberately chosen A or B path and safely rejects a later removed membership edge [variant: chosen-shared-path-and-removed-edge]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-204: shared diamonds expose direct affiliations and exact unique scopes without a permanent parent`
**Status:** Untested

#### TC-TPT-205: Keep generic and ungrouped outcomes visible while filters stay cosmetic [P1]

**Objective:** Keep generic and ungrouped outcomes visible while filters stay cosmetic.

**Business Intent / Invariant Guarded:** A project can inspect useful work without complete taxonomy and without a search changing progress.

**Proves:** FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-04, BR-TPT-09, BR-TPT-28, BR-TPT-29.

**Preconditions:**

- The project contains labelled A and F, reachable generic G, ungrouped outcome U, and supporting subtask T. A has eligible P and Q.
- P has no acceptance and Q has historical acceptance with a current-proof gap.

**Real-World Reachability:** The stakeholder opens project choices, visits G and U, returns to A, applies a search with no matches, then clears it after the filter-empty result is visible.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given generic G and ungrouped U coexist with A and F
When the stakeholder inspects those choices and applies a zero-match filter in A
Then U remains a delivery outcome without an invented group and G remains reachable
And A still has the denominator P and Q with No work matches this view
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Project choices expose generic and ungrouped work beside optional labelled scopes; Clear filters is a usable exit. |
| System behavior | An explicit scope selection changes scope; filtering affects only visible matching rows and never admitted membership or metrics. |
| Business data state | No wrapper, classification, acceptance or membership is saved by viewing. |
| Data shown on UI | A’s accepted history remains one of two and its current-proof gap remains; ungrouped U adds only its single project identity. |

**Acceptance Criteria:**

- ✅ Zero search matches retain the selected denominator; generic and ungrouped outcomes have usable direct detail paths.
- ❌ Treating zero matches as no work or 100% complete, hiding U, or counting T fails.

**Test Data:**

```json
{
  "projectEligible": [
    "P",
    "Q",
    "U"
  ],
  "areaEligible": [
    "P",
    "Q"
  ],
  "zeroMatchFilter": "does-not-match",
  "support": [
    "T"
  ]
}
```

**Edge Cases:** An entirely complete empty project differs from a nonempty project with no eligible tasks. A retired ungrouped outcome remains separately inspectable as excluded, with no eligible credit.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-205]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-04, BR-TPT-09, BR-TPT-28, BR-TPT-29 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-205]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Generic and ungrouped choices remain reachable while zero search results cannot redefine area progress [variant: generic-ungrouped-filter-choices]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-205: project retains generic and ungrouped work while selected delivery remains independent of outside records`
**Status:** Untested

### Validation and boundary outcomes

#### TC-TPT-211: Refuse invalid purpose and unsafe vocabulary without losing the draft [P1]

**Objective:** Refuse invalid purpose and unsafe vocabulary without losing the draft.

**Business Intent / Invariant Guarded:** Optional descriptive vocabulary has a finite safe meaning and cannot silently damage or execute work.

**Proves:** FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-27.

**Preconditions:**

- A maintainer can edit group F and has an entered pending draft; a permitted delivery outcome P is also present.
- Valid labels and the original work are recorded before the invalid requests.

**Real-World Reachability:** After reading the current group, the maintainer previews an unsupported purpose, attempts purpose on P and an empty group request. In separate isolated configuration variants the reader supplies invalid label declarations then repeats with valid boundary labels.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given F has a retained draft and P is a delivery outcome
When the maintainer requests an unknown purpose, purpose on P, or neither purpose nor members
Then each request is refused with its business reason and current records and draft preserved
When a label is blank, contains a control character, exceeds the limit or declares an unsupported label key
Then the affected declaration is invalid instead of silently defaulted
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Explain the invalid fact beside the editor or scope capability and retain a useful exit. |
| System behavior | Only three named purposes on vision/project groups and their three inert labels are admitted; declared malformed configuration fails closed. |
| Business data state | No requested invalid fact, inferred membership or unintended configuration repair is saved. |
| Data shown on UI | A 160-character nonblank label is readable; a 161-character label is invalid; executable-looking text within the valid text domain displays as text. |

**Acceptance Criteria:**

- ✅ Invalid purpose, nongroup purpose, empty patch and invalid label shapes have distinct refused outcomes.
- ❌ Running a label, silently falling back for malformed declared data or erasing the draft fails.

**Test Data:**

```json
{
  "invalidPurposes": [
    "module",
    "unknown",
    7
  ],
  "invalidLabels": [
    "",
    "   ",
    "line\nfeed",
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  ],
  "validBoundary": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "unsupportedLabel": "other"
}
```

**Edge Cases:** Trim surrounding ordinary whitespace for valid display. Duplicate label text may identify different purposes by stable role/identity and must not merge groups. Missing declarations use defaults without creating shared configuration.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-211]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-053, AC-TPT-34, BR-TPT-02, BR-TPT-27 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-211]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Invalid purpose and declared vocabulary refuse through actual boundaries while a useful group draft survives [variant: purpose-and-vocabulary-refusal]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-211: invalid purposes empty patches and nongroup changes refuse with canonical bytes preserved`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-211: declared labels share project validation and fail closed at raw length control and shape boundaries`
**Status:** Untested

### Edge and concern outcomes

#### TC-TPT-212: Expose corrupt or bounded membership as incomplete scope [P2]

**Objective:** Expose corrupt or bounded membership as incomplete scope.

**Business Intent / Invariant Guarded:** An uncertain graph must not produce a complete-looking delivery percentage or choose an arbitrary owner.

**Proves:** FR-TPT-054, AC-TPT-35, BR-TPT-05, BR-TPT-10, BR-TPT-20, BR-TPT-28.

**Preconditions:**

- Separate deliberate corrupt-import variants contain self-membership, a two-group cycle, a missing reference or two owners claiming the same identity. A healthy diamond variant is retained for comparison.
- These invalid states model a manual/outside-host edit or upstream partial save; permitted ordinary group editing must refuse creating them.

**Real-World Reachability:** After a teammate finishes the outside-host save, the stakeholder performs the next allowed scoped inspection. In a separately declared oversized fixture the reader reaches the supported inspection bound; no blind wait or unbounded retry substitutes for a result.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given an outside-host import left a cycle, missing member or duplicate owner
When the stakeholder inspects the exact group
Then the read terminates with named incomplete or unavailable coverage and inspected identities
And it withholds a complete percentage and chooses no duplicate-owner winner
When the same reader inspects a valid shared diamond
Then sharing remains valid and each outcome appears once
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Partial or unavailable scope names affected identities and offers a permitted reread or safe return. |
| System behavior | Bound graph and output inspection; an omitted member or affiliation is disclosed rather than returned as complete empty data. |
| Business data state | Inspection preserves all imported records and makes no repair or new authority claim. |
| Data shown on UI | Complete empty, known zero, partial and unavailable remain distinct; wrong-kind or missing selected group is unavailable. |

**Acceptance Criteria:**

- ✅ Every invalid/bounded variant is honest and bounded, while the healthy diamond remains complete.
- ❌ Pruning a cycle silently, selecting a duplicate owner, using a parent/dependency edge as membership or showing 100% after truncation fails.

**Test Data:**

```json
{
  "invalidVariants": [
    "self",
    "cycle",
    "missing",
    "duplicate-owner",
    "wrong-kind-selection",
    "bound-exhausted"
  ],
  "healthyVariant": "shared diamond",
  "expectedInvalidCoverage": "partial or unavailable"
}
```

**Edge Cases:** Repeated member references to one valid owner deduplicate; they differ from duplicate canonical owners. A typed dependency back-link alone is not containment. No outside project is consulted to fill a missing identity.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-212]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, AC-TPT-35, BR-TPT-05, BR-TPT-10, BR-TPT-20, BR-TPT-28 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-212]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-212: manual corrupt membership reads terminate honestly without selecting duplicated owners or repairing bytes`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-212: edge and navigation byte bounds disclose omissions without complete percentages or invented ungrouped claims`
**Status:** Untested

#### TC-TPT-213: Inspect narrow delivery scope without hiding wider linked concerns [P2]

**Objective:** Inspect narrow delivery scope without hiding wider linked concerns.

**Business Intent / Invariant Guarded:** A stakeholder’s delivery scope and a maintainer’s exact linked concerns remain distinct usable views.

**Proves:** FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-22, BR-TPT-28.

**Preconditions:**

- F declares only eligible outcome P and a supporting subtask. Outside F, outcome Q and P each declare a link to the same exact governing specification owner at its permitted location; neither declares a direct link to the other. Subtask Z has a parent link to P but is not declared as F’s member.
- The shared governing specification is uniquely identified as SPEC-SHARED in the fixture. The contributor may inspect all four records and select that exact specification owner at the location declared by P and Q; a pending permitted edit of Q exists.

**Real-World Reachability:** The contributor selects F and reads its delivery scope, opens P’s exact linked concerns and reads the declared specification link, then selects that exact shared governing specification owner at its declared location. After reviewing its incoming Q relationship, the contributor deliberately opens Q in management. Each subsequent selection follows review of the preceding visible result.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given F declares P and subtask while P and Q each link only to the same exact governing specification and Z has a parent link to P
When the contributor inspects F and then P’s exact linked concerns
Then F’s eligible delivery list is only P and its supporting list includes subtask
And P’s concern result exposes its declared specification link but excludes Q
When the contributor selects the exact shared governing specification owner at the location declared by P
Then its incoming concerns expose Q with its original declaring owner and specification relationship
When the contributor opens Q in management and returns to F
Then Q’s pending draft is retained while neither Q nor Z becomes F membership
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Scope delivery, supporting work and concerns have clear distinct locations and safe returns; selecting the exact shared specification reveals Q, and Q’s draft is retained. |
| System behavior | Retain global permitted inventory for concern and management uses; P-only concern inspection excludes Q, while explicit shared-specification selection reveals its incoming Q relationship; derive scoped delivery only from declared membership. |
| Business data state | No reciprocal copies, inferred memberships, repaired links or draft discard occur. |
| Data shown on UI | F’s denominator is one; Q’s exact owner and relation are readable with their current coverage limits. |

**Acceptance Criteria:**

- ✅ Narrow scope excludes unrelated delivery rows; P-only concerns exclude Q and explicit shared-specification selection exposes incoming Q without making outside permitted work inaccessible.
- ❌ Removing Q from global management, counting shared specifications as membership or silently discarding Q’s draft fails.

**Test Data:**

```json
{
  "members": {
    "F": [
      "P",
      "subtask"
    ]
  },
  "outsideLinked": [
    "Q",
    "Z"
  ],
  "expectedScopedEligible": [
    "P"
  ],
  "governingSpecification": "SPEC-SHARED",
  "declaredSpecificationLinks": {
    "P": "SPEC-SHARED",
    "Q": "SPEC-SHARED"
  },
  "concernSelections": [
    {
      "selectedItem": "P",
      "expectedAbsentConcern": "Q"
    },
    {
      "selectedSpecificationOwner": "SPEC-SHARED",
      "selectionLocation": "exact permitted location declared by P and Q",
      "expectedIncomingConcern": "Q"
    }
  ],
  "expectedScopedDenominator": 1,
  "expectedRetainedDraft": "Q"
}
```

**Edge Cases:** Ambiguous or denied concern owners stay unresolved and do not leak records. Text similarity alone remains a concern signal, never exact membership or a selected mutation target.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-213]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-048, FR-TPT-054, AC-TPT-29, AC-TPT-35, BR-TPT-22, BR-TPT-28 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-213]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::P-only concerns exclude Q until the exact shared specification is selected, without changing F membership [variant: exact-concern-owner-and-retained-outside-draft]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-213: narrow scope preserves global management and exact shared-spec concern selection without inferred members`
**Status:** Untested

### Authorization outcomes

#### TC-TPT-221: Keep stakeholder guidance and reading separate from write authority [P0]

**Objective:** Keep stakeholder guidance and reading separate from write authority.

**Business Intent / Invariant Guarded:** Read-oriented hierarchy guidance helps the requested work while permissions and independent controls still govern every action.

**Proves:** FR-TPT-049, FR-TPT-053, AC-TPT-30, AC-TPT-34, BR-TPT-14, BR-TPT-15, BR-TPT-23, BR-TPT-25, BR-TPT-27.

**Preconditions:**

- A stakeholder has permitted read access to A and F but no group-write or acceptance authority. A separate maintainer has group-write access; local author discovery is unavailable for the reader.
- Tracking observe, off, opted-out and unavailable variants are independently arranged under the established controls. A pinned shared baseline has different labels from the personal worktree.

**Real-World Reachability:** The reader asks an ordinary status question and reads the advisory/result before opening F. The reader then attempts a group edit. A separately permitted maintainer previews and saves the same edit under current actor/profile; changed authority before save is rechecked.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given the reader may inspect but not change F and tracking permits advisory guidance
When the reader asks show module status or show feature progress
Then concise read-oriented work guidance is eligible without local author lookup or an executed-procedure claim
When the reader attempts purpose maintenance
Then it is refused without changes
And the separately authorized maintainer can save the current previewed group edit
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Only supported read choices are offered to the stakeholder; refused edits retain input and actual reasons. |
| System behavior | Guidance grants no authority. Off, unavailable, quoted-only and opted-out prompts stay silent; generic implement a feature remains outside this hierarchy-read trigger. |
| Business data state | Reads/notices preserve all work. Pinned labels and scope stay baseline-specific; author metadata never grants write/health/acceptance rights. |
| Data shown on UI | The response states current read source and coverage; supported maintainer success is reread, while denied/native unsupported edits show not saved. |

**Acceptance Criteria:**

- ✅ Read permission succeeds, denied write fails, authorized write succeeds, and guidance silence controls hold.
- ❌ Assuming a CEO role grants acceptance, using a worktree label for the pinned baseline, or discovering identity before a permitted read fails.

**Test Data:**

```json
{
  "readPrompts": [
    "show module status",
    "show feature progress",
    "report initiative status"
  ],
  "silentPrompts": [
    "implement a feature",
    "quoted status request"
  ],
  "controls": [
    "observe",
    "off",
    "opt-out",
    "unavailable"
  ],
  "readerWrite": "denied"
}
```

**Edge Cases:** Quoted embedded instructions and untrusted display labels are not requests. Named inspect/report retain existing eligibility. If profile or actor changes between preview and save, preserve the pending draft and refuse/revalidate; native unsupported operations do not create portable replacements.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-221]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-049, FR-TPT-053, AC-TPT-30, AC-TPT-34, BR-TPT-14, BR-TPT-15, BR-TPT-23, BR-TPT-25, BR-TPT-27 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-221]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-221: descriptive roles preserve independent read write automatic and profile controls`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: trusted hierarchy read verbs and delivery intents receive non-authorizing guidance`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: hierarchy read guidance retains off invalid unavailable and native silence controls`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-221: hierarchy notices preserve restricted pending Skip permissions and linked opt-out authority`
**Status:** Untested

### Invariant / Property Tests

#### TC-TPT-231: For every valid purpose and label preserve descriptive-only semantics [P0]

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
| Data shown on UI | Configured text or default Area/Feature/Program appears with stable group identity. |

**Acceptance Criteria:**

- ✅ Every admitted input conserves protected facts and each boundary counter-case fails closed.
- ❌ Any semantic change caused by label text, a purpose-only member replacement or invalid-input fallback fails.

**Test Data:**

```json
{
  "inputDomain": "all vision/project groups; absent/clear/area/capability/program purpose; nonblank trimmed control-free labels of 1..160 characters including markup-looking and duplicate text; omitted labels",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-231]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | BR-TPT-27, FR-TPT-053, AC-TPT-34 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-231]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-231: all purpose kinds and independent inert labels conserve lifecycle proof custom content and membership`
**Status:** Untested

#### TC-TPT-232: For every admitted graph conserve exact unique delivery scope [P0]

**Objective:** For every admitted graph conserve exact unique delivery scope.

**Business Intent / Invariant Guarded:** BR-TPT-28: for ALL admitted project/group graphs, the displayed eligible identities equal the unique selected delivery denominator.

**Proves:** BR-TPT-28, FR-TPT-054, AC-TPT-35, INV-TPT-04.

**Preconditions:**

- Fixtures contain admitted unique owners, deep generic/labelled groups, repeated references, shared diamonds, all portable delivery states, supporting members and nonmembership links.
- Separate corrupt-import and bounded variants are explicitly labelled as deliberate fail-safe cases reachable by outside-host editing.

**Real-World Reachability:** The reader chooses each project/group after its source save completes, compares declared reachable identities with the selected lists, then changes only member order or display filters and rereads. Invalid variants are inspected separately with named diagnostics.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given any admitted finite membership graph with one authoritative owner per identity
When the reader selects any project or group and then reorders references or filters its presentation
Then selected eligible delivery identities equal the unique denominator and support adds no credit
And canceled or retired outcomes remain excluded but inspectable
But ambiguous, missing, cyclic or bounded scope cannot claim complete coverage or a complete percentage
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Direct groups, eligible delivery, excluded outcomes and supporting work are distinct readable sets. |
| System behavior | Probe deduplication, permutation commutativity and overlap conservation; only declared member edges enlarge group scope, while project admits all its work. |
| Business data state | No read/filter/reorder experiment writes duplicate owners, inferred memberships or lifecycle changes. |
| Data shown on UI | The exact unique list is the arithmetic oracle; empty differs from known zero and unavailable. |

**Acceptance Criteria:**

- ✅ All healthy graphs conserve identity sets, and each just-outside-domain graph stays explicitly incomplete/unavailable.
- ❌ Counting paths, support, parent/spec/source links or a silently truncated known subset as complete fails.

**Test Data:**

```json
{
  "inputDomain": "all admitted bounded acyclic project/group membership graphs with unique owners, any purpose nesting, repeated refs, shared fan-in, all portable lifecycle states and display filters",
  "invariant": "eligible delivery identities = unique admitted reachable delivery identities minus canceled/retired; direct group navigation and all supporting/excluded members remain inspectable without extra credit",
  "boundaryCounterCase": [
    "self/cyclic member graph",
    "missing owner",
    "duplicate canonical owners",
    "wrong-kind selector",
    "inspection/output bound exhaustion"
  ]
}
```

**Edge Cases:** A typed dependency back-link remains separate from containment. Growing from an empty graph to one nonaccepted eligible outcome yields known zero, not 100%; adding an unrelated outside item cannot alter a group denominator.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-232]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | BR-TPT-28, FR-TPT-054, AC-TPT-35, INV-TPT-04 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-232]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-232: finite graph permutations and portable states conserve unique identities and exclude every nonmembership edge`
**Status:** Untested

#### TC-TPT-233: For every readable entry path preserve identity source and advisory boundaries [P0]

**Objective:** For every readable entry path preserve identity source and advisory boundaries.

**Business Intent / Invariant Guarded:** BR-TPT-29: for ALL readable direct or valid chosen entries, navigation and vocabulary preserve exact identity and authority.

**Proves:** BR-TPT-29, FR-TPT-055, AC-TPT-36, BR-TPT-23.

**Preconditions:**

- Admitted groups include shared affiliations and generic/ungrouped project choices; readable local, pinned and generated snapshots have declared coverage.
- A complete original set of work/source/control facts is recorded before navigation, vocabulary changes and guidance requests.

**Real-World Reachability:** The reader chooses each valid direct edge in one finite path, opens an outcome and returns after location is visible. A teammate may remove an edge before the next inspection. Separate guidance-control variants use actual trusted read requests and quoted/nonread counterexamples.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given any readable direct entry or finite chosen valid membership path
When the reader navigates and returns through workspace, snapshot or unenhanced reading
Then identity, source, selected scope, acceptance and current-proof meanings remain equivalent
And only that chosen path and other direct affiliations are disclosed
But a removed or forged edge, denied link, or unavailable source gives a reason and safe return without guessed ancestry
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | All supported modes expose meaningful selected location and safe return without relying on every ancestry path. A generated snapshot labels its fixed Delivery scope separately from the Inspected group/path; following inspection anchors does not change its eligible list or counts. |
| System behavior | Labels are display-only; direct entry has no invented parent. Advisory hierarchy-read eligibility cannot turn quoted/unrelated/off/opted-out requests into notices or writes. |
| Business data state | Navigation, guidance, print and label display save no canonical work, acceptance, identity or authority changes. |
| Data shown on UI | Each mode names its actual admitted source and exact Delivery scope identities; linked intent/proof resolves only its declared owner. A snapshot may inspect another group without presenting its fixed exported totals as that group’s percentage. |

**Acceptance Criteria:**

- ✅ Every admitted path conserves protected facts; invalid paths and ineligible guidance refuse or stay silent as appropriate.
- ❌ Worktree scope leaking into pinned reading, forged breadcrumbs, executable labels or guidance for generic feature implementation fail.

**Test Data:**

```json
{
  "inputDomain": "all readable direct entries or valid finite direct-membership paths; shared/generic/ungrouped choices; allowed read modes; valid labels; trusted hierarchy status/progress/report requests under eligible controls",
  "invariant": "one canonical identity and chosen source/scope survive navigation; no invented ancestry or authority; advisory notices preserve independent controls and never certify execution",
  "boundaryCounterCase": [
    "removed/forged edge",
    "denied link",
    "unavailable source",
    "quoted-only request",
    "off/opt-out",
    "generic implement a feature request"
  ]
}
```

**Edge Cases:** A zero-result search keeps scope and source; Back restores prior context. Other affiliation selection deliberately changes entry context without changing the feature’s identity or metrics.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-233]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | BR-TPT-29, FR-TPT-055, AC-TPT-36, BR-TPT-23 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-233]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Pinned group reading and finite snapshot paths preserve their admitted source and refuse forged ancestry [variant: pinned-path-and-forged-snapshot-entry]`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-233: pinned labels roles and membership remain baseline-specific after local vocabulary and scope changes`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-233: quoted host and nonread hierarchy data stay silent with a trusted read positive control`, `.claude/hooks/tests/suites/task-tracking-route.test.cjs::TC-TPT-233: hierarchy normalized contexts retain delivery credit and bounded hash-only receipts`
**Status:** Untested

#### TC-TPT-234: For every permitted group retry conserve scope facts and newer edits [P0]

**Objective:** For every permitted group retry conserve scope facts and newer edits.

**Business Intent / Invariant Guarded:** INV-TPT-07: for ALL current permitted group changes and exact retries, source-consistent eligible lists explain counts without lost or duplicated work.

**Proves:** INV-TPT-07, BR-TPT-12, BR-TPT-27, BR-TPT-28, BR-TPT-29.

**Preconditions:**

- A permitted group has unique members and a current revision; a second authorized actor can make an independent later member edit.
- The original request identity, actor, source and exact payload are retained for an uncertain-response retry. Accepted/proof/history facts are recorded.

**Real-World Reachability:** The maintainer previews and saves a current edit, then retries its exact request after the saved receipt is observable. For the conflict variant, a teammate saves a newer change after the first preview and before the stale save; the stale draft is retained for comparison.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given any current permitted group request with retained request identity and actor
When the request saves and is replayed exactly
Then one saved business change and receipt remain and reread eligible identities explain the denominator
When a stale preview saves after a teammate’s newer edit or a reused request changes payload or actor
Then the request is refused and the newer members and pending draft are preserved
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Actual saved/replayed/conflict results are distinct; conflicts offer reread and comparison rather than silently merged success. |
| System behavior | Purpose-only changes conserve member sets; actual member changes disclose scope movement without calling it delivery improvement. Source/profile/actor revalidation retains established authority. |
| Business data state | Exact replay adds no revision/history growth; stale/changed replay preserves newer edits and accepted/proof history. |
| Data shown on UI | Both selected views agree with the actual saved scope; an older pinned baseline keeps its own prior scope and labels. |

**Acceptance Criteria:**

- ✅ All valid edits/replays conserve one relationship authority; invalid stale/changed replays preserve current work and intent.
- ❌ Duplicated membership/history, silently switched actor, stale overwrite or denominator change under a purpose-only edit fails.

**Test Data:**

```json
{
  "inputDomain": "all permitted current group purpose/member patches with retained operation identity, actor and source; exact replay; shared/generic/labelled membership arrangements",
  "invariant": "eligible displayed identities equal saved source-consistent scope denominator; omitted facts and exact retries conserve membership, identity, acceptance, proof and one receipt",
  "boundaryCounterCase": [
    "stale revision after teammate save",
    "changed payload under reused request",
    "changed actor/profile before save",
    "denied current authority"
  ]
}
```

**Edge Cases:** A lost response is uncertain until reread or exact retry; it does not establish cancellation. Lifecycle acceptance and retirement/cancellation history remain under reused cases, not purpose changes.

**Transition Invariants:** Purpose/member edits grant no lifecycle or acceptance transition. Compare recorded lifecycle, acceptance/proof and health before and after; explicit later cancellation/retirement retains its own existing authority and exclusion rules.

**Evidence:** [Source: test/work-tracking/TC-TPT-234]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | INV-TPT-07, BR-TPT-12, BR-TPT-27, BR-TPT-28, BR-TPT-29 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-234]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-234: group exact retries preserve newer members and changed reused payload or stale preview refuses`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-234: changed actor authority or unsupported profile after preview preserves the group and original draft`
**Status:** Untested

### UI / User journey flows

#### TC-TPT-241: Read the exact selected journey across enhanced print and narrow views [P2]

**Objective:** Read the exact selected journey across enhanced print and narrow views.

**Business Intent / Invariant Guarded:** The stakeholder can explain and revisit the selected delivery scope even when enhanced interactions or output generation are unavailable.

**Proves:** FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-10, BR-TPT-20, BR-TPT-29.

**Preconditions:**

- The admitted source has A to shared F to P/Q with separate exclusions/support, exact intent/proof links and an unrelated outside outcome U. The snapshot is explicitly generated for Delivery scope F; A and its other group are available through separately labelled inspection anchors.
- The workspace, generated snapshot and pinned baseline name their actual source/coverage. An unsaved permitted group draft remains open; one separately isolated generation attempt will be denied.

**Real-World Reachability:** The stakeholder uses keyboard navigation after each target is visibly ready, reads F and its outcome detail, returns and prints F. Repeat with enhanced interactions disabled and at a narrow viewport. A teammate then saves a relevant source change before a permitted reopen; generation failure is injected only in the isolated fail-safe variant.

**Demo Flow:** Observe the stated source/location and permitted preconditions; perform the actor actions below, and observe each specified positive or refused postcondition before a dependent action. Actor review supplies normal pacing; no fixed delay establishes readiness.

```gherkin
Given the stakeholder selected F through A with exact eligible P and Q
When the stakeholder reads details and returns, prints, and repeats without enhanced interactions at a narrow width
Then source, Delivery scope F, eligible identities, excluded/support distinctions and return choices remain understandable
And native inspection of another group changes only Inspected group/path, without changing F’s metrics or claiming that inspected group’s percentage
And F’s printed delivery list excludes unrelated U
When relevant source changes before reopen or generation is denied
Then the actual fresh result or dated stale/unavailable limitation is visible without a saved-work or accepted-delivery claim
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Labels and text status remain readable, focus is usable, long names reflow, and the chosen return retains scope/filter. No color-only proof is accepted. |
| System behavior | All surfaces consume the same admitted delivery-scope semantics. Workspace may deliberately choose another Delivery scope through its supported selection; the generated snapshot retains its fixed exported Delivery scope F while native anchors change only inspected records. Print/no-enhancement preserve these distinct labels and exact eligible rows. Existing freshness and bounded recovery remain authoritative. |
| Business data state | Views and failed generation leave records/configuration unchanged; navigation or refresh preserves the unsaved draft. |
| Data shown on UI | Exact P/Q denominator, acceptance history, current-proof gaps, source/coverage and missing-link reasons remain visible in each mode. |

**Acceptance Criteria:**

- ✅ Actual stakeholder journey is operable by keyboard and narrow reading; a report generated for F preserves F’s exact delivery rows, counts and provenance in print/no-enhancement while separately labelled inspection links remain usable.
- ❌ A decorative clickable card reaching the wrong owner, a false per-group percentage after following an inspection anchor, hidden scope leakage in print, stale output marked current or draft loss fails.

**Test Data:**

```json
{
  "selectedPath": [
    "A",
    "F"
  ],
  "eligible": [
    "P",
    "Q"
  ],
  "excluded": [
    "R",
    "S"
  ],
  "support": [
    "story",
    "subtask"
  ],
  "outside": [
    "U"
  ],
  "modes": [
    "workspace",
    "snapshot",
    "unenhanced",
    "print",
    "narrow-keyboard"
  ],
  "failureVariant": "generation denied"
}
```

**Edge Cases:** A missing/denied source or selected link gives a reason and safe return. An empty scope is No delivery scope; a filter-empty scope keeps its denominator. Native unavailable and pinned read-only controls preserve their exact limits; no watcher/cache/new mandatory adapter is implied.

**Transition Invariants:** N/A — purpose, viewing and navigation do not introduce lifecycle transitions or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-241]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-054, FR-TPT-055, AC-TPT-35, AC-TPT-36, BR-TPT-09, BR-TPT-10, BR-TPT-20, BR-TPT-29 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-241]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Keyboard and narrow workspace reading preserve A/F return filters and the open group draft through report refresh [variant: workspace-keyboard-return-and-live-draft]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Enhanced fixed-F report keyboard inspection and print retain P/Q while the inspected A/F path and filters return safely [variant: enhanced-fixed-report-keyboard-and-print]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Without scripts native direct-edge and intent/proof anchors keep the exported F list exact in print [variant: native-fixed-scope-print-and-direct-edge]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A real owned output obstruction preserves prior report and draft, then explicit refresh publishes the actual changed-source result [variant: fresh-source-and-generation-refusal]`
**Status:** Untested
