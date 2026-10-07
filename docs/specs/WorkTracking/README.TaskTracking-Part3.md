---
module: WorkTracking
service: work-tracking
feature_code: TPT
status: draft
provisional: true
owner: Framework maintainers
last_updated: 2026-10-07
source_of_truth: README.TaskTracking.md
continuation: 3
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 3

## Related Documentation

- Governing intent and §1–7: `README.TaskTracking.md`.
- Same canonical case registry; this carrier owns the following 22 stable case bodies only.
- Authored primary guards and registered executors are mapped per case; no test or visual execution result is claimed.

## 8. Test Specifications

#### TC-TPT-107: Refused Verifying → Done [P0]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-07, INV-TPT-03.

**Preconditions:**

- Required proof is stale, skipped, foreign, missing or failed while the actor reviews a requested Verifying → Done action.
- This includes previously passing proof followed by a newer failed or skipped observation for the same criterion and relevant source; contradictory observations at the same time leave that criterion unresolved.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, accept the exact delivered scope, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given required proof is stale, skipped, foreign, missing or failed while the actor reviews a requested Verifying → Done action
When accept the exact delivered scope
Then Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain
And no requested new state, delivery credit or fictitious receipt
And an older pass cannot override a newer applicable failed or skipped observation
And legitimate earlier acceptance remains attributable without current verification credit
When I record a later passing observation covering the unresolved criteria after completing re-verification
Then current confidence can recover under the actual acceptance policy
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no requested new state, delivery credit or fictitious receipt. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain.
- ❌ no requested new state, delivery credit or fictitious receipt.
- ✅ latest applicable observations are criterion-scoped: unaffected criteria retain proof, while a newer failed/skipped observation or contradictory tie withdraws current confidence without erasing legitimate acceptance history.
- ❌ receiving an older observation later cannot supersede the newer applicable observation or certify unresolved work.

**Test Data:**

```json
{
  "transition": "Verifying → Done",
  "missingOrInvalid": "required proof is stale, skipped, foreign, missing or failed",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters.",
  "state": "Verifying",
  "requiredCriteria": [
    "Authorized access",
    "Filtered records",
    "Agreed columns"
  ],
  "proofResult": "required proof stale",
  "acceptingAction": "explicit exact scope"
}
```

**Edge Cases:**

- Boundary/failure: no requested new state, delivery credit or fictitious receipt.
- Old pass followed by a newer failed/skipped observation: acceptance is refused until applicable passing coverage is restored; prior acceptance remains historical.
- Equal-time contradictory observations: no current certification from record order.
- New evidence for one criterion: preserve applicable proof for other required criteria; older evidence received later cannot displace the latest observation.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-107]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-07, INV-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-107]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-107: newer applicable failed or skipped proof withdraws current credit without erasing delivery`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-107: latest observations are criterion scoped and tied contradictions cannot borrow a pass`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-107: future-dated and duplicated-criterion proof cannot grant current acceptance`
**Status:** Untested

#### TC-TPT-108: Refused Done → explicit active state [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-08.

**Preconditions:**

- No explicit changed delivery/reopen intent while the actor reviews a requested Done → explicit active state action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, reopen to that permitted active state, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given no explicit changed delivery/reopen intent while the actor reviews a requested Done → explicit active state action
When reopen to that permitted active state
Then Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain
And no requested new state, delivery credit or fictitious receipt
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no requested new state, delivery credit or fictitious receipt. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Transition unavailable in the current state, or the specific readiness/acceptance reason; previous state and history remain.
- ❌ no requested new state, delivery credit or fictitious receipt.

**Test Data:**

```json
{
  "transition": "Done → explicit active state",
  "missingOrInvalid": "no explicit changed delivery/reopen intent",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no requested new state, delivery credit or fictitious receipt.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-108]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-08 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-108]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-108: every permitted Done reopen without a reason preserves acceptance, current credit and exact owner bytes`
**Status:** Untested

#### TC-TPT-109: Refused invalid or redundant portable cancellation [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-08.

**Preconditions:**

- The actor requests cancellation with a missing reason, absent owner authority, stale revision, an undeclared state, or an already Canceled item under a new operation identity.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, cancel the selected scope with its reason, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given a cancellation request with a missing reason, absent owner authority, stale revision, an undeclared state, or an already Canceled item under a new operation identity
When cancel the selected scope with its reason
Then The missing reason/authority, stale revision or invalid state is refused; already Canceled under a new operation identity is a no-op/refusal; previous state and history remain without revision/history growth
And no requested new state, delivery credit or fictitious receipt
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: The missing reason/authority, stale revision or invalid state is refused; already Canceled under a new operation identity is a no-op/refusal; previous state and history remain without revision/history growth. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no requested new state, delivery credit or fictitious receipt. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ The missing reason/authority, stale revision or invalid state is refused; already Canceled under a new operation identity is a no-op/refusal; previous state and history remain without revision/history growth.
- ❌ no requested new state, delivery credit or fictitious receipt.

**Test Data:**

```json
{
  "transition": "Invalid or redundant cancellation",
  "eligibleStates": ["Draft", "Backlog", "Ready", "In progress", "Blocked", "Verifying", "Done"],
  "alreadyCanceled": "new request no-op/refusal; same completed request replay original receipt",
  "missingOrInvalid": "missing reason; absent owner authority; stale revision; undeclared state; Canceled under new operation identity",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- An identical completed operation identity/payload returns its original receipt within the retained retry horizon without revision/history growth. A new redundant cancellation of Canceled work is a no-op or refusal with no revision/history growth. A changed request under a reused operation identity is refused.
- Done is an eligible initial state under the cancellation guards; refusal cannot be based on acceptance alone.

- Boundary/failure: no requested new state, delivery credit or fictitious receipt.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-109]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-08 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-109]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-109: reasonless cancellation from every eligible state preserves bytes, attribution, receipts and delivery credit`
**Status:** Untested

#### TC-TPT-111: Visible Saved + secondary pending with recovery [P1]

**Objective:** Verify the view labels actual outcomes and preserves the task context through the stated observable action.

**Business Intent / Invariant Guarded:** The view labels actual outcomes and preserves the task context.

**Proves:** BR-TPT-09, BR-TPT-10, BR-TPT-12.

**Preconditions:**

- The primary save succeeded but a linked update or refresh failed.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, inspect the result and use the displayed permitted recovery, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given the primary save succeeded but a linked update or refresh failed
When inspect the result and use the displayed permitted recovery
Then Primary result remains saved; retry only unresolved link/report outcome.
And no erased draft/context, fabricated success or falsely complete scope
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Primary result remains saved; retry only unresolved link/report outcome.. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no erased draft/context, fabricated success or falsely complete scope. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Primary result remains saved; retry only unresolved link/report outcome..
- ❌ no erased draft/context, fabricated success or falsely complete scope.

**Test Data:**

```json
{
  "state": "Saved + secondary pending",
  "selectedItem": "PBI-104",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no erased draft/context, fabricated success or falsely complete scope.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-111]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-09, BR-TPT-10, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-111]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-111: completion journal failure retains successful deletion as primary and exposes recoverable pending work`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-111: report collisions retain the successful primary save and exact human output`
**Status:** Untested

#### TC-TPT-112: Visible Stale confidence with recovery [P1]

**Objective:** Verify the view labels actual outcomes and preserves the task context through the stated observable action.

**Business Intent / Invariant Guarded:** The view labels actual outcomes and preserves the task context.

**Proves:** BR-TPT-09, BR-TPT-10, BR-TPT-12.

**Preconditions:**

- Accepted work has a relevant later change and its proof is stale.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, inspect the result and use the displayed permitted recovery, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given accepted work has a relevant later change and its proof is stale
When inspect the result and use the displayed permitted recovery
Then Preserve accepted history; explain relevant proof gap and offer re-verification.
And no erased draft/context, fabricated success or falsely complete scope
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Preserve accepted history; explain relevant proof gap and offer re-verification.. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no erased draft/context, fabricated success or falsely complete scope. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Preserve accepted history; explain relevant proof gap and offer re-verification..
- ❌ no erased draft/context, fabricated success or falsely complete scope.

**Test Data:**

```json
{
  "state": "Done",
  "selectedItem": "PBI-104",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters.",
  "historicalAcceptance": "retained",
  "relevantLaterChange": "export criteria changed",
  "currentVerification": "stale"
}
```

**Edge Cases:**

- Boundary/failure: no erased draft/context, fabricated success or falsely complete scope.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-112]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-09, BR-TPT-10, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-112]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-112: a later governing change turns current proof stale while keeping accepted history and a real re-verification path`
**Status:** Untested

#### TC-TPT-121: Property BR-TPT-10 conservation [P1]

**Objective:** Verify coverage and freshness are disclosed from permitted selected content; existing output grants no authority through the stated observable action.

**Business Intent / Invariant Guarded:** coverage and freshness are disclosed from permitted selected content; existing output grants no authority.

**Proves:** BR-TPT-10.

**Preconditions:**

- Any complete, partial, denied, unknown or missing selected input and previously generated view.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any complete, partial, denied, unknown or missing selected input and previously generated view
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: coverage and freshness are disclosed from permitted selected content; existing output grants no authority; boundary outcome: changed read access or missing-known scope → denied/unavailable/partial, not empty or re-exported forbidden content
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: coverage and freshness are disclosed from permitted selected content; existing output grants no authority; boundary outcome: changed read access or missing-known scope → denied/unavailable/partial, not empty or re-exported forbidden content. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: coverage and freshness are disclosed from permitted selected content; existing output grants no authority; boundary outcome: changed read access or missing-known scope → denied/unavailable/partial, not empty or re-exported forbidden content.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any complete, partial, denied, unknown or missing selected input and previously generated view"
invariant: "for ALL inputs: coverage and freshness are disclosed from permitted selected content; existing output grants no authority"
boundaryCounterCase: "changed read access or missing-known scope \u2192 denied/unavailable/partial, not empty or re-exported forbidden content"
```

**Edge Cases:**

- Boundary/failure: changed read access or missing-known scope → denied/unavailable/partial, not empty or re-exported forbidden content.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-121]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-10 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-121]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-121: bounded live-input partitions disclose lost source and missing scope while an old view grants no write authority`, `.claude/hooks/tests/suites/task-tracking-recovery-contracts.test.cjs::TC-TPT-121: a retired workspace session cannot disclose or re-export work through a replacement session, whose live reads disclose unavailable evidence`
**Status:** Untested

#### TC-TPT-122: Property BR-TPT-11 conservation [P0]

**Objective:** Verify native authority, meaning, history, unknown dates and metric units remain with original owners through the stated observable action.

**Business Intent / Invariant Guarded:** native authority, meaning, history, unknown dates and metric units remain with original owners.

**Proves:** BR-TPT-11.

**Preconditions:**

- Any trusted project-owned native record/profile with supported or unproved operation footprint.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any trusted project-owned native record/profile with supported or unproved operation footprint
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: native authority, meaning, history, unknown dates and metric units remain with original owners; boundary outcome: unsupported/unproved broader create/update/refresh → Unsupported native operation; all original owners preserved
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: native authority, meaning, history, unknown dates and metric units remain with original owners; boundary outcome: unsupported/unproved broader create/update/refresh → Unsupported native operation; all original owners preserved. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: native authority, meaning, history, unknown dates and metric units remain with original owners; boundary outcome: unsupported/unproved broader create/update/refresh → Unsupported native operation; all original owners preserved.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any trusted project-owned native record/profile with supported or unproved operation footprint"
invariant: "for ALL inputs: native authority, meaning, history, unknown dates and metric units remain with original owners"
boundaryCounterCase: "unsupported/unproved broader create/update/refresh \u2192 Unsupported native operation; all original owners preserved"
```

**Edge Cases:**

- Boundary/failure: unsupported/unproved broader create/update/refresh → Unsupported native operation; all original owners preserved.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-122]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-11 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-122]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-122: native operation partitions preserve every original owner before any create, update or secondary footprint can run`
**Status:** Untested

#### TC-TPT-123: Property BR-TPT-12 idempotency [P0]

**Objective:** Verify current revision is respected and a completed identical request applies once; actual outcomes remain distinct through the stated observable action.

**Business Intent / Invariant Guarded:** current revision is respected and a completed identical request applies once; actual outcomes remain distinct.

**Proves:** BR-TPT-12.

**Preconditions:**

- Any permitted save, cooperating competing edit, interrupted retry or primary/secondary batch outcome within the stated retry horizon.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any permitted save, cooperating competing edit, interrupted retry or primary/secondary batch outcome within the stated retry horizon
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: current revision is respected and a completed identical request applies once; actual outcomes remain distinct; boundary outcome: changed request under reused identity or stale save → refusal/conflict; successful siblings not retried
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: current revision is respected and a completed identical request applies once; actual outcomes remain distinct; boundary outcome: changed request under reused identity or stale save → refusal/conflict; successful siblings not retried. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: current revision is respected and a completed identical request applies once; actual outcomes remain distinct; boundary outcome: changed request under reused identity or stale save → refusal/conflict; successful siblings not retried.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any permitted save, cooperating competing edit, interrupted retry or primary/secondary batch outcome within the stated retry horizon"
invariant: "for ALL inputs: current revision is respected and a completed identical request applies once; actual outcomes remain distinct"
boundaryCounterCase: "changed request under reused identity or stale save \u2192 refusal/conflict; successful siblings not retried"
```

**Edge Cases:**

- Boundary/failure: changed request under reused identity or stale save → refusal/conflict; successful siblings not retried.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-123]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-123]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-123: identical completed requests replay once across intervening edits`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-123: allocated creation identity is retained by retries and collision never overwrites`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-123: receipt horizon requires fresh preview and retains bounded retry history`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-123: expired allocated creation cannot create duplicate work or authorize altered retries`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-123: checkpoint retry retains the original request after a later item revision`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-123: changed observations under a reused checkpoint identity refuse optional saves`
**Status:** Untested

#### TC-TPT-124: Property BR-TPT-13 conservation [P1]

**Objective:** Verify governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof through the stated observable action.

**Business Intent / Invariant Guarded:** governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof.

**Proves:** BR-TPT-13.

**Preconditions:**

- Any requested idea/specification/plan/design/refinement save with linked delivery records.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any requested idea/specification/plan/design/refinement save with linked delivery records
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof; boundary outcome: competing intent or required behavior undecided → owner/decision gap; no automatic partner ticket/promotion
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof; boundary outcome: competing intent or required behavior undecided → owner/decision gap; no automatic partner ticket/promotion. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof; boundary outcome: competing intent or required behavior undecided → owner/decision gap; no automatic partner ticket/promotion.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any requested idea/specification/plan/design/refinement save with linked delivery records"
invariant: "for ALL inputs: governing intent and cases retain their owners; defined provisional work needs no invented preexisting proof"
boundaryCounterCase: "competing intent or required behavior undecided \u2192 owner/decision gap; no automatic partner ticket/promotion"
```

**Edge Cases:**

- Boundary/failure: competing intent or required behavior undecided → owner/decision gap; no automatic partner ticket/promotion.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-124]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-13 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-124]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-124: a real governing spec save through the public linked workflow checkpoint preserves owners and provisional decisions without invented proof`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-124: every supported governing artifact save conserves its owner and provisional work never borrows delivery authority`, `.claude/hooks/tests/suites/task-tracking-producer-consumers.test.cjs::TC-TPT-124: public specification refinement and plan saving checkpoints preserve original declared concerns and historical acceptance`
**Status:** Untested

#### TC-TPT-125: Property BR-TPT-14 state-transition [P1]

**Objective:** Verify each control acts independently within actual access; changed policy stops next optional save through the stated observable action.

**Business Intent / Invariant Guarded:** each control acts independently within actual access; changed policy stops next optional save.

**Proves:** BR-TPT-14.

**Preconditions:**

- Any direct/named/guided selection crossed with off, observe, linked, task opt-out and report preference.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any direct/named/guided selection crossed with off, observe, linked, task opt-out and report preference
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: each control acts independently within actual access; changed policy stops next optional save; boundary outcome: tracking disabled mid-operation → earlier save retained and optional next update skipped/pending
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: each control acts independently within actual access; changed policy stops next optional save; boundary outcome: tracking disabled mid-operation → earlier save retained and optional next update skipped/pending. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: each control acts independently within actual access; changed policy stops next optional save; boundary outcome: tracking disabled mid-operation → earlier save retained and optional next update skipped/pending.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any direct/named/guided selection crossed with off, observe, linked, task opt-out and report preference"
invariant: "for ALL inputs: each control acts independently within actual access; changed policy stops next optional save"
boundaryCounterCase: "tracking disabled mid-operation \u2192 earlier save retained and optional next update skipped/pending"
```

**Edge Cases:**

- Boundary/failure: tracking disabled mid-operation → earlier save retained and optional next update skipped/pending.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-125]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-14 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-125]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-125: finite policy controls act independently and disabling tracking retains earlier saves while stopping the next optional write`
**Status:** Untested

#### TC-TPT-126: Property BR-TPT-15 conservation [P0]

**Objective:** Verify only the current trusted selected scope permits management; record text supplies no authority through the stated observable action.

**Business Intent / Invariant Guarded:** only the current trusted selected scope permits management; record text supplies no authority.

**Proves:** BR-TPT-15.

**Preconditions:**

- Any permitted project/session/member participation or delegated operation and imported text.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any permitted project/session/member participation or delegated operation and imported text
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: only the current trusted selected scope permits management; record text supplies no authority; boundary outcome: foreign context, unsafe scope or oversized request → Operation not permitted or limit result, unchanged work
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: only the current trusted selected scope permits management; record text supplies no authority; boundary outcome: foreign context, unsafe scope or oversized request → Operation not permitted or limit result, unchanged work. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: only the current trusted selected scope permits management; record text supplies no authority; boundary outcome: foreign context, unsafe scope or oversized request → Operation not permitted or limit result, unchanged work.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any permitted project/session/member participation or delegated operation and imported text"
invariant: "for ALL inputs: only the current trusted selected scope permits management; record text supplies no authority"
boundaryCounterCase: "foreign context, unsafe scope or oversized request \u2192 Operation not permitted or limit result, unchanged work"
```

**Edge Cases:**

- Boundary/failure: foreign context, unsafe scope or oversized request → Operation not permitted or limit result, unchanged work.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-126]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-15 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-126]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-126: instruction-shaped authored text stays inert data and cannot assign or accept another item`
**Status:** Untested

#### TC-TPT-127: Property BR-TPT-16 state-transition [P1]

**Objective:** Verify observed scoped facts alone drive activity/proof; observations/findings never own acceptance through the stated observable action.

**Business Intent / Invariant Guarded:** observed scoped facts alone drive activity/proof; observations/findings never own acceptance.

**Proves:** BR-TPT-16.

**Preconditions:**

- Any exact linked observed outcome or manual/outside-host edit before next allowed inspection.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any exact linked observed outcome or manual/outside-host edit before next allowed inspection
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: observed scoped facts alone drive activity/proof; observations/findings never own acceptance; boundary outcome: missing reminder or unmapped changed work → explicit observation gap/candidate; no guessed all-item repair
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: observed scoped facts alone drive activity/proof; observations/findings never own acceptance; boundary outcome: missing reminder or unmapped changed work → explicit observation gap/candidate; no guessed all-item repair. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: observed scoped facts alone drive activity/proof; observations/findings never own acceptance; boundary outcome: missing reminder or unmapped changed work → explicit observation gap/candidate; no guessed all-item repair.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any exact linked observed outcome or manual/outside-host edit before next allowed inspection"
invariant: "for ALL inputs: observed scoped facts alone drive activity/proof; observations/findings never own acceptance"
boundaryCounterCase: "missing reminder or unmapped changed work \u2192 explicit observation gap/candidate; no guessed all-item repair"
```

**Edge Cases:**

- Boundary/failure: missing reminder or unmapped changed work → explicit observation gap/candidate; no guessed all-item repair.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-127]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-16 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-127]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-127: real linked producer facts add only activity and outside-host edits stale proof without guessed repair or acceptance`
**Status:** Untested

#### TC-TPT-128: Property BR-TPT-17 conservation [P1]

**Objective:** Verify all exact assignments change applied leaf ownership to the requested stable member, preserve unrelated responsibility/history and expose every selected result.

**Business Intent / Invariant Guarded:** BR-TPT-17: responsibility is attributable to an active stable member; applied assignments are real; coordination, lifecycle and historical attribution are independent of leaf ownership.

**Proves:** BR-TPT-17.

**Preconditions:**

- Any active/inactive/unknown/ambiguous member or alias, an exact item or previewed leaf set with prior owners/current revisions, an unselected leaf and independent group coordinator.
- Bulk domain includes at least two selected leaves; the witness selects STORY-101(member-duc) and STORY-102(member-maya), requests active member-leo, excludes STORY-103(member-maya) and retains coordinator member-sam.
- Every native operation requires proved entire-footprint capability; permitted partial outcomes remain that owner policy, not an invented all-or-nothing promise.

**Real-World Reachability:** A coordinator creates/selects work, reviews its owners and exact assignment preview, then confirms the requested stable member. A later member rename/deactivation or competing teammate edit occurs before the next review; historical attribution is reread afterward. Capability failures can interrupt a supported operation; fixtures do not authorize real unproved native writes.

**Demo Flow:** For all domain members assign the exact preview and read back every selected result and owner; independently inspect unselected/coordinator/state/history and repeat invalid-member, partial/pending and unproved native boundaries.

```gherkin
Given any exact assignment scope and members in the declared domain
When the coordinator requests the previewed assignment and reads every selected leaf
Then every applied leaf reads back the requested active stable member
And every selected identity has exactly one actual applied, refused or pending result with reason and current owner
And unresolved leaves are not claimed saved or complete; permitted successes remain attributable
And unselected leaves, coordinator, lifecycle, acceptance, proof and unrelated history remain unchanged
And unknown, inactive or ambiguous member refuses assignment; renaming/deactivation preserves historical attribution
And unproved entire native footprint refuses every affected write
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | All selected identities/results/current owners and unresolved reasons are visible; coordinator and leaf ownership remain distinct. |
| System behavior | For every domain member enforce active stable identity and exact preview; applied ownership equals the requested identity. No omitted result, guessed member, unrequested leaf change or implied transition is permitted. |
| Business data state | Full witness STORY-101/STORY-102 owners are member-leo; partial STORY-101 applied/STORY-102 refused or pending yields STORY-101 member-leo/STORY-102 member-maya without competing edit. Whole-footprint refusal leaves STORY-101 member-duc/STORY-102 member-maya. Unselected STORY-103 member-maya and coordinator member-sam remain. Native refusal includes every affected owner, not just the visible leaves. |
| Data shown on UI | Each selected ID has its actual outcome and owner readback; a concurrent edit is disclosed as current truth/conflict, not overwritten or mislabelled saved. Historical receipts keep their stable attribution after renaming/deactivation. |

**Acceptance Criteria:**

- ✅ For ALL inputs, every applied selected leaf reads the requested active stable member, every selected identity has an explicit actual result, and unrelated ownership/state/history and attribution are preserved.
- ❌ A no-op reported applied, omitted second result, inactive/unknown/ambiguous assignment, unselected/coordinator change, implied start/acceptance or any unproved native write violates the property.

**Test Data:**

```yaml
inputDomain: "All exact item or previewed group assignments with prior owners/current revisions, active/inactive/unknown/ambiguous stable members and aliases; bulk sets contain two or more selected leaves, one unselected leaf and separate coordinator; full, policy-permitted partial, pending, conflict and whole-footprint-unproved native outcomes."
invariant: "For ALL assignments every applied selected leaf reads back the requested active stable member; every selected ID has exactly one actual applied/refused/pending result with reason/current owner; unresolved is never claimed complete; unselected/coordinator/lifecycle/acceptance/proof/unrelated history remain unchanged, and rename/deactivation preserves historical attribution. Unproved entire native footprint refuses every affected write."
boundaryCounterCase: "Select STORY-101 prior member-duc and STORY-102 prior member-maya; request active member-leo; unselected STORY-103 owner member-maya and coordinator member-sam. Full result must be STORY-101 applied/member-leo and STORY-102 applied/member-leo. Permitted partial or pending: STORY-101 applied/member-leo, STORY-102 refused or pending/member-maya with reason; a competing edit instead shows its actual reread owner/conflict. Whole-footprint unproved: STORY-101 refused/member-duc, STORY-102 refused/member-maya and all other affected owners unchanged. Fail no-op/applied, omitted STORY-102, changed STORY-103/coordinator or implied transition; unknown/inactive/ambiguous member cannot assign."
```

**Edge Cases:**

- Single-item assignment retains the same active-identity/readback invariant; larger exact sets add explicit selected result rows, not wider scope.
- Changing coordinator alone never assigns leaves; alias/display-name updates cannot replace or erase stable historical attribution.
- Refused/pending leaves remain unresolved until actual supported save; retry rereads current ownership/revision and touches only unresolved work under the original allowed scope.

**Transition Invariants:** Assignment grants no start, completion, acceptance or proof; unrelated state remains preserved in success, partial and refusal.

**Evidence:** [Source: test/work-tracking/TC-TPT-128]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-17 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-128]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-128: exact two-leaf assignment applies both stable owners and preserves unselected work, coordinator and proof`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-128: stale second-leaf assignment reports its refusal and exact retries conserve the successful sibling`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-128: unproved whole native assignment footprint refuses both leaves and preserves every affected owner`
**Status:** Untested

#### TC-TPT-129: Property BR-TPT-18 conservation [P1]

**Objective:** Verify views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims through the stated observable action.

**Business Intent / Invariant Guarded:** views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims.

**Proves:** BR-TPT-18.

**Preconditions:**

- Any personal proposals and available/unavailable single locally selected shared baseline.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any personal proposals and available/unavailable single locally selected shared baseline
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims; boundary outcome: missing baseline or conflicting duplicate/owner/proof → explicit gap/conflict; no silent substitution/repair
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims; boundary outcome: missing baseline or conflicting duplicate/owner/proof → explicit gap/conflict; no silent substitution/repair. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims; boundary outcome: missing baseline or conflicting duplicate/owner/proof → explicit gap/conflict; no silent substitution/repair.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any personal proposals and available/unavailable single locally selected shared baseline"
invariant: "for ALL inputs: views distinguish their actual source and sharing cannot certify semantic validity or global exclusive claims"
boundaryCounterCase: "missing baseline or conflicting duplicate/owner/proof \u2192 explicit gap/conflict; no silent substitution/repair"
```

**Edge Cases:**

- Boundary/failure: missing baseline or conflicting duplicate/owner/proof → explicit gap/conflict; no silent substitution/repair.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-129]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-18 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-129]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-129: pinned shared record limit remains partial and never falls back to a smaller worktree`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-129: expired pinned Git deadline refuses before another command and never substitutes local work`
**Status:** Untested

#### TC-TPT-130: Property BR-TPT-19 conservation [P0]

**Objective:** Verify supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work through the stated observable action.

**Business Intent / Invariant Guarded:** supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work.

**Proves:** BR-TPT-19.

**Preconditions:**

- Any work in Draft, Backlog, Ready, In progress, Blocked, Verifying, Done or Canceled, including referenced/accepted/historical work and newer edits during undo.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any work in Draft, Backlog, Ready, In progress, Blocked, Verifying, Done or Canceled, including referenced/accepted/historical work and newer edits during undo
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work; boundary outcome: hard-delete referenced work or undo against newer edit → refusal; affected records retained
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work; boundary outcome: hard-delete referenced work or undo against newer edit → refusal; affected records retained. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work; boundary outcome: hard-delete referenced work or undo against newer edit → refusal; affected records retained.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any work in Draft, Backlog, Ready, In progress, Blocked, Verifying, Done or Canceled, including referenced/accepted/historical work and newer edits during undo"
invariant: "for ALL inputs: supported retirement preserves identity/history/incoming links and children; deletion only exact authorized unreferenced draft or, by its own explicit action, unreferenced ended work"
boundaryCounterCase: "hard-delete referenced work or undo against newer edit \u2192 refusal; affected records retained"
```

**Edge Cases:**

- Cancellation is available from exactly Draft, Backlog, Ready, In progress, Blocked, Verifying and Done under current revision, actual owner authority, explicit cancellation decision and a nonempty reason.
- Canceling Done retains attributable acceptance/proof and incoming identity/history, removes active accepted credit, and never changes child work.
- An identical completed operation identity/payload returns its original receipt within the retained retry horizon without revision/history growth. A new redundant cancellation of Canceled work is a no-op or refusal with no revision/history growth. A changed request under a reused operation identity is refused.

- Boundary/failure: hard-delete referenced work or undo against newer edit → refusal; affected records retained.
- Ended work (canceled or retired) may be deleted entirely by a separate explicit action with a stated reason and a current preview that states what is removed; its history, proof and acceptance decisions leave with it, and no delivery count changes because ended work is already outside every active scope. Open, started or accepted work is refused until it is canceled or retired, and the draft-only action never removes ended work.
- Ended work that another record still links to or groups, or that is the configured project health owner, is refused until that reference is removed at its owner; deletion never edits another record, and the removed record stays recoverable for the retained retry horizon.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-130]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-19 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-130]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: exact unreferenced draft deletion needs preview and preserves recoverable bytes and retry identity`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: referenced assigned and non-draft work refuses hard deletion without cascading`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: deletion preview conflicts with a later draft edit and prepared recovery survives interrupted completion`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: failure before prepared recovery publication preserves the exact original draft`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: interrupted physical unlink retains prepared bytes and resumes the exact original request`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: prepared recovery refuses changed replacements and completed replay never removes a new replacement`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: expired deletion recovery discloses unknown replay rather than inventing completion`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-130: CLI draft deletion requires its explicit flag and exact reviewed preview`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: canceled or retired work is deleted entirely by its own explicit action with reason and preview, and stays recoverable`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: open, started and accepted work is refused for entire deletion until it is canceled or retired`, `.claude/hooks/tests/suites/task-tracking-deletion.test.cjs::TC-TPT-130: ended work that another record still points to is refused without cascading and is deletable once that link is removed`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-130: the command deletes canceled or retired work entirely only under its own flag and names that flag in discovery`
**Status:** Untested

#### TC-TPT-131: Property BR-TPT-20 idempotency [P1]

**Objective:** Verify bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep through the stated observable action.

**Business Intent / Invariant Guarded:** bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep.

**Proves:** BR-TPT-20.

**Preconditions:**

- Any operation within, at or beyond declared input/read/history bounds and any supported/missing host capability.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any operation within, at or beyond declared input/read/history bounds and any supported/missing host capability
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep; boundary outcome: limit+1 or missing host → bounded limit/unavailable/next-check recovery, not fictitious immediate complete upkeep
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep; boundary outcome: limit+1 or missing host → bounded limit/unavailable/next-check recovery, not fictitious immediate complete upkeep. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep; boundary outcome: limit+1 or missing host → bounded limit/unavailable/next-check recovery, not fictitious immediate complete upkeep.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any operation within, at or beyond declared input/read/history bounds and any supported/missing host capability"
invariant: "for ALL inputs: bounded results and recovery expose actual partial/unsupported reach; generated activity cannot cause recursive upkeep"
boundaryCounterCase: "limit+1 or missing host \u2192 bounded limit/unavailable/next-check recovery, not fictitious immediate complete upkeep"
```

**Edge Cases:**

- Boundary/failure: limit+1 or missing host → bounded limit/unavailable/next-check recovery, not fictitious immediate complete upkeep.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-131]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-20 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-131]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-131: record budget at 2000 allows an honest read and limit plus one suppresses complete claims`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-131: a project whose records add up to more than any single-file budget is read whole, with no total-size refusal`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-131: the 64-entry cooperating queue rejects its next request and releases every owned lock`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-131: a pinned shared board whose records add up to more than any single-file budget is read whole`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-131: a report of any size shows only what the bounded inspection read and says the rest was left out, and the record byte budget stays for everything else`
**Status:** Untested

#### TC-TPT-132: Property INV-TPT-01 conservation [P1]

**Objective:** Verify each work identity has one authoritative home through the stated observable action.

**Business Intent / Invariant Guarded:** each work identity has one authoritative home.

**Proves:** INV-TPT-01.

**Preconditions:**

- Any work identities across supported roots, aliases and owner declarations.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any work identities across supported roots, aliases and owner declarations
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: each work identity has one authoritative home; boundary outcome: duplicate ambiguous identity → no silent target selection
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: each work identity has one authoritative home; boundary outcome: duplicate ambiguous identity → no silent target selection. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: each work identity has one authoritative home; boundary outcome: duplicate ambiguous identity → no silent target selection.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any work identities across supported roots, aliases and owner declarations"
invariant: "for ALL inputs: each work identity has one authoritative home"
boundaryCounterCase: "duplicate ambiguous identity \u2192 no silent target selection"
```

**Edge Cases:**

- Boundary/failure: duplicate ambiguous identity → no silent target selection.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-132]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-01 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-132]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-132: duplicate authoritative identity across kinds blocks projection precision and preserves both homes`
**Status:** Untested

#### TC-TPT-133: Property INV-TPT-02 conservation [P1]

**Objective:** Verify stable attribution survives and assignment never grants delivery credit through the stated observable action.

**Business Intent / Invariant Guarded:** stable attribution survives and assignment never grants delivery credit.

**Proves:** INV-TPT-02.

**Preconditions:**

- Any member rename/deactivation or explicit supported assignment/unassignment.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any member rename/deactivation or explicit supported assignment/unassignment
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: stable attribution survives and assignment never grants delivery credit; boundary outcome: unknown/inactive member selected for new assignment → refused with existing attribution retained
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: stable attribution survives and assignment never grants delivery credit; boundary outcome: unknown/inactive member selected for new assignment → refused with existing attribution retained. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: stable attribution survives and assignment never grants delivery credit; boundary outcome: unknown/inactive member selected for new assignment → refused with existing attribution retained.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any member rename/deactivation or explicit supported assignment/unassignment"
invariant: "for ALL inputs: stable attribution survives and assignment never grants delivery credit"
boundaryCounterCase: "unknown/inactive member selected for new assignment \u2192 refused with existing attribution retained"
```

**Edge Cases:**

- Boundary/failure: unknown/inactive member selected for new assignment → refused with existing attribution retained.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-133]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-02 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-133]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-133: assignment aliases, renames and unassignment retain attribution without credit`
**Status:** Untested

#### TC-TPT-134: Property INV-TPT-03 conservation [P1]

**Objective:** Verify acceptance certifies only the original exact scope with required applicable proof through the stated observable action.

**Business Intent / Invariant Guarded:** acceptance certifies only the original exact scope with required applicable proof.

**Proves:** INV-TPT-03.

**Preconditions:**

- Any accepted item and exact scope with changed criteria or copied acceptance.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any accepted item and exact scope with changed criteria or copied acceptance
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: acceptance certifies only the original exact scope with required applicable proof; boundary outcome: materially new/split/cloned outcome copying acceptance → no inherited certification
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: acceptance certifies only the original exact scope with required applicable proof; boundary outcome: materially new/split/cloned outcome copying acceptance → no inherited certification. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: acceptance certifies only the original exact scope with required applicable proof; boundary outcome: materially new/split/cloned outcome copying acceptance → no inherited certification.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any accepted item and exact scope with changed criteria or copied acceptance"
invariant: "for ALL inputs: acceptance certifies only the original exact scope with required applicable proof"
boundaryCounterCase: "materially new/split/cloned outcome copying acceptance \u2192 no inherited certification"
```

**Edge Cases:**

- Boundary/failure: materially new/split/cloned outcome copying acceptance → no inherited certification.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-134]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-134]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-134: accepted scope needs explicit reopening and copied outcomes cannot inherit another owner acceptance`
**Status:** Untested

#### TC-TPT-135: Property INV-TPT-04 conservation [P1]

**Objective:** Verify duplicate views and enabling work add zero delivery credit; unique union is conserved through the stated observable action.

**Business Intent / Invariant Guarded:** duplicate views and enabling work add zero delivery credit; unique union is conserved.

**Proves:** INV-TPT-04.

**Preconditions:**

- Any nested overlapping delivery memberships and execution/group records.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any nested overlapping delivery memberships and execution/group records
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: duplicate views and enabling work add zero delivery credit; unique union is conserved; boundary outcome: adding duplicate membership or completed task → no extra accepted/denominator count
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: duplicate views and enabling work add zero delivery credit; unique union is conserved; boundary outcome: adding duplicate membership or completed task → no extra accepted/denominator count. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: duplicate views and enabling work add zero delivery credit; unique union is conserved; boundary outcome: adding duplicate membership or completed task → no extra accepted/denominator count.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any nested overlapping delivery memberships and execution/group records"
invariant: "for ALL inputs: duplicate views and enabling work add zero delivery credit; unique union is conserved"
boundaryCounterCase: "adding duplicate membership or completed task \u2192 no extra accepted/denominator count"
```

**Edge Cases:**

- Boundary/failure: adding duplicate membership or completed task → no extra accepted/denominator count.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-135]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-04 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-135]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-135: overlap and membership permutations conserve unique delivery while completed enabling work adds no credit`, `.claude/hooks/tests/suites/task-tracking-maintenance-contracts.test.cjs::TC-TPT-135: completed stories and groups add no PBI credit and retirement changes an overlapping unique union exactly once`
**Status:** Untested

#### TC-TPT-136: Property INV-TPT-05 idempotency [P0]

**Objective:** Verify saved labels describe actual outcomes and no stale save overwrites newer work through the stated observable action.

**Business Intent / Invariant Guarded:** saved labels describe actual outcomes and no stale save overwrites newer work.

**Proves:** INV-TPT-05.

**Preconditions:**

- Any requested record save and independent link/report outcomes including a newer competing edit.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any requested record save and independent link/report outcomes including a newer competing edit
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: saved labels describe actual outcomes and no stale save overwrites newer work; boundary outcome: primary save failed or old revision retried → not saved/conflict; no fictitious receipt
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: saved labels describe actual outcomes and no stale save overwrites newer work; boundary outcome: primary save failed or old revision retried → not saved/conflict; no fictitious receipt. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: saved labels describe actual outcomes and no stale save overwrites newer work; boundary outcome: primary save failed or old revision retried → not saved/conflict; no fictitious receipt.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any requested record save and independent link/report outcomes including a newer competing edit"
invariant: "for ALL inputs: saved labels describe actual outcomes and no stale save overwrites newer work"
boundaryCounterCase: "primary save failed or old revision retried \u2192 not saved/conflict; no fictitious receipt"
```

**Edge Cases:**

- Boundary/failure: primary save failed or old revision retried → not saved/conflict; no fictitious receipt.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-136]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-05 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-136]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-136: imported forged receipts cannot return a false durable success or grow the record`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-136: concurrent exact retry and twelve distinct-item saves conserve one receipt per request`
**Status:** Untested

#### TC-TPT-137: Property INV-TPT-06 conservation [P1]

**Objective:** Verify projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage through the stated observable action.

**Business Intent / Invariant Guarded:** projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage.

**Proves:** INV-TPT-06.

**Preconditions:**

- Any selected native/portable/current/shared/historical view and confidence/coverage combinations.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any selected native/portable/current/shared/historical view and confidence/coverage combinations
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage; boundary outcome: unavailable baseline/input/proof → explicit unavailable/partial/unknown, never substituted complete green
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage; boundary outcome: unavailable baseline/input/proof → explicit unavailable/partial/unknown, never substituted complete green. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage; boundary outcome: unavailable baseline/input/proof → explicit unavailable/partial/unknown, never substituted complete green.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any selected native/portable/current/shared/historical view and confidence/coverage combinations"
invariant: "for ALL inputs: projection preserves the selected authority and actual scope while disclosing unknown confidence/coverage"
boundaryCounterCase: "unavailable baseline/input/proof \u2192 explicit unavailable/partial/unknown, never substituted complete green"
```

**Edge Cases:**

- Boundary/failure: unavailable baseline/input/proof → explicit unavailable/partial/unknown, never substituted complete green.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-137]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | INV-TPT-06 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-137]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-137: portable current, historical shared and native views retain selected authority without substituting missing confidence`, `.claude/hooks/tests/suites/task-tracking-maintenance-contracts.test.cjs::TC-TPT-137: selected group confidence partitions retain accepted history without borrowing passing proof or delivery from outside scope`, `.claude/hooks/tests/suites/task-tracking-maintenance-contracts.test.cjs::TC-TPT-137: known empty, absent selected and partially inspectable scopes disclose distinct coverage without optimistic precision or source repair`
**Status:** Untested
