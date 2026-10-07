---
module: WorkTracking
service: work-tracking
feature_code: TPT
status: draft
provisional: true
owner: Framework maintainers
last_updated: 2026-10-07
source_of_truth: README.TaskTracking.md
continuation: 2
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 2

## Related Documentation

- Governing intent and §1–7: `README.TaskTracking.md`.
- Same canonical case registry; this carrier owns the following 40 stable case bodies only.
- Authored primary guards and registered executors are mapped per case; no test or visual execution result is claimed.

## 8. Test Specifications

#### TC-TPT-058: Visible Saving with recovery [P1]

**Objective:** Verify the view labels actual outcomes and preserves the task context through the stated observable action.

**Business Intent / Invariant Guarded:** The view labels actual outcomes and preserves the task context.

**Proves:** BR-TPT-09, BR-TPT-10, BR-TPT-12.

**Preconditions:**

- One explicit save is pending.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, inspect the result and use the displayed permitted recovery, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given one explicit save is pending
When inspect the result and use the displayed permitted recovery
Then Show actual pending save, prevent duplicate submission; no accepted/saved claim yet.
And no erased draft/context, fabricated success or falsely complete scope
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Show actual pending save, prevent duplicate submission; no accepted/saved claim yet.. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no erased draft/context, fabricated success or falsely complete scope. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Show actual pending save, prevent duplicate submission; no accepted/saved claim yet..
- ❌ no erased draft/context, fabricated success or falsely complete scope.

**Test Data:**

```json
{
  "state": "Saving",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-058]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-09, BR-TPT-10, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-058]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A pending real save prevents duplicate submission and any premature saved or accepted claim [variant: actual-pending-save]`
**Status:** Untested

#### TC-TPT-059: Visible Saved with recovery [P1]

**Objective:** Verify the view labels actual outcomes and preserves the task context through the stated observable action.

**Business Intent / Invariant Guarded:** The view labels actual outcomes and preserves the task context.

**Proves:** BR-TPT-09, BR-TPT-10, BR-TPT-12.

**Preconditions:**

- The requested operation has actually succeeded.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, inspect the result and use the displayed permitted recovery, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given the requested operation has actually succeeded
When inspect the result and use the displayed permitted recovery
Then Acknowledge only actual successful change; next action returns to retained context.
And no erased draft/context, fabricated success or falsely complete scope
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: Acknowledge only actual successful change; next action returns to retained context.. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no erased draft/context, fabricated success or falsely complete scope. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ Acknowledge only actual successful change; next action returns to retained context..
- ❌ no erased draft/context, fabricated success or falsely complete scope.

**Test Data:**

```json
{
  "state": "Saved",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-059]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-09, BR-TPT-10, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-059]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Only the actual saved receipt restores the selected scope and next-action context without a duplicate change [variant: saved-receipt-context]`
**Status:** Untested

#### TC-TPT-061: J1 select and assign useful work [P1]

**Objective:** Verify responsibility is distinct from starting and acceptance through the stated observable action.

**Business Intent / Invariant Guarded:** Responsibility is distinct from starting and acceptance.

**Proves:** AC-TPT-23, BR-TPT-17, INV-TPT-02.

**Preconditions:**

- PBI-104 is Ready, Unassigned, not accepted and has no proof; Maya is active.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The contributor or coordinator arranges the prior work through authorized actions. Each view action follows after the person reads its result; a teammate action or substantive work occurs between checkpoints where stated, rather than assuming simultaneous back-to-back user actions. Waiting is only for the actual pending result, never an invented elapsed-time gate.

**Demo Flow:** Arrange the stated permitted work, open Work; Open item; Assign; choose Maya; Save assignment; Back to Work, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given PBI-104 is Ready, Unassigned, not accepted and has no proof; Maya is active
When open Work; Open item; Assign; choose Maya; Save assignment; Back to Work
Then owner reads Maya in saved result and Work; Ready, not accepted and no proof are unchanged; selected item/filter remain
And inactive/unknown member cannot save; conflict retains choice without claiming durable success
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: owner reads Maya in saved result and Work; Ready, not accepted and no proof are unchanged; selected item/filter remain. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; inactive/unknown member cannot save; conflict retains choice without claiming durable success. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ owner reads Maya in saved result and Work; Ready, not accepted and no proof are unchanged; selected item/filter remain.
- ❌ inactive/unknown member cannot save; conflict retains choice without claiming durable success.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters.",
  "state": "Ready",
  "assigneeBefore": null,
  "assigneeRequested": "maya",
  "acceptance": "Not accepted",
  "currentVerification": "No proof"
}
```

**Edge Cases:**

- Boundary/failure: inactive/unknown member cannot save; conflict retains choice without claiming durable success.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-061]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-23, BR-TPT-17, INV-TPT-02 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-061]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-061: work-list API preview/save/reread exposes the exact selected item and current revision`
**Status:** Untested

#### TC-TPT-062: J2 inspect honest remaining work [P1]

**Objective:** Verify progress can be inspected without changing work through the stated observable action.

**Business Intent / Invariant Guarded:** Progress can be inspected without changing work.

**Proves:** AC-TPT-07, AC-TPT-08, BR-TPT-09, BR-TPT-10.

**Preconditions:**

- Known scope contains accepted, remaining and stale-proof work.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The contributor or coordinator arranges the prior work through authorized actions. Each view action follows after the person reads its result; a teammate action or substantive work occurs between checkpoints where stated, rather than assuming simultaneous back-to-back user actions. Waiting is only for the actual pending result, never an invented elapsed-time gate.

**Demo Flow:** Arrange the stated permitted work, open Overview/status; select actual scope; inspect remaining; open detail; return/filter/print, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given known scope contains accepted, remaining and stale-proof work
When open Overview/status; select actual scope; inspect remaining; open detail; return/filter/print
Then scope before accepted/currently verified/remaining; exact detail and retained context; static reading and keyboard/narrow navigation keep labels
And filters never alter global scope; unavailable input cannot become zero; opening is not implied by generation
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: scope before accepted/currently verified/remaining; exact detail and retained context; static reading and keyboard/narrow navigation keep labels. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; filters never alter global scope; unavailable input cannot become zero; opening is not implied by generation. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ scope before accepted/currently verified/remaining; exact detail and retained context; static reading and keyboard/narrow navigation keep labels.
- ❌ filters never alter global scope; unavailable input cannot become zero; opening is not implied by generation.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: filters never alter global scope; unavailable input cannot become zero; opening is not implied by generation.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-062]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-07, AC-TPT-08, BR-TPT-09, BR-TPT-10 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-062]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-062: complete-empty report offers capture recovery while incomplete inspection never asserts no work`
**Status:** Untested

#### TC-TPT-063: J3 linked work checkpoint without automatic acceptance [P1]

**Objective:** Verify actual scoped activity reduces upkeep without granting delivery through the stated observable action.

**Business Intent / Invariant Guarded:** Actual scoped activity reduces upkeep without granting delivery.

**Proves:** AC-TPT-26, AC-TPT-27, BR-TPT-14, BR-TPT-16.

**Preconditions:**

- Exact linked PBI and permitted linked-upkeep policy; alternatively unlinked/off work.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The contributor or coordinator arranges the prior work through authorized actions. Each view action follows after the person reads its result; a teammate action or substantive work occurs between checkpoints where stated, rather than assuming simultaneous back-to-back user actions. Waiting is only for the actual pending result, never an invented elapsed-time gate.

**Demo Flow:** Arrange the stated permitted work, perform authorized implementation or bugfix; inspect checkpoint/proof; inspect item, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given exact linked PBI and permitted linked-upkeep policy; alternatively unlinked/off work
When perform authorized implementation or bugfix; inspect checkpoint/proof; inspect item
Then only exact observed activity/blocker/proof changes; no edit/stop/green result becomes Done; unlinked work continues with checkpoint linking offer
And no all-linked fanout, mandatory ticket, unsolicited flow or invented missing-host observation
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: only exact observed activity/blocker/proof changes; no edit/stop/green result becomes Done; unlinked work continues with checkpoint linking offer. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no all-linked fanout, mandatory ticket, unsolicited flow or invented missing-host observation. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ only exact observed activity/blocker/proof changes; no edit/stop/green result becomes Done; unlinked work continues with checkpoint linking offer.
- ❌ no all-linked fanout, mandatory ticket, unsolicited flow or invented missing-host observation.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no all-linked fanout, mandatory ticket, unsolicited flow or invented missing-host observation.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-063]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-26, AC-TPT-27, BR-TPT-14, BR-TPT-16 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-063]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: exact linked checkpoint records activity only on the selected item and retains the primary outcome`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: untracked work continues without a mandatory ticket or invented state`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: failed or interrupted primary results never advance linked items`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: missing and sensitive observations leave primary results saved and optional work pending`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: unlinking is explicit and session context is not canonical progress`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: every declared producer uses exact observed activity rather than delivery approval`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: successful write observer emits a bounded reminder and never mutates work`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: patch delete and move targets form bounded hints without fictitious save evidence`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: successful checkpoint acknowledges its hint and a later same-file save prompts again`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-063: a later reminder remains pending while the prior checkpoint is still saving`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-063: CLI linkage and checkpoint preserve actual workflow context and primary result`
**Status:** Untested

#### TC-TPT-064: J4 edit and retire while retaining history [P1]

**Objective:** Verify safe work management preserves references and newer edits through the stated observable action.

**Business Intent / Invariant Guarded:** Safe work management preserves references and newer edits.

**Proves:** AC-TPT-22, AC-TPT-24, BR-TPT-02, BR-TPT-19.

**Preconditions:**

- Selected editable work with references/history, or an exact authorized unreferenced draft.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The contributor or coordinator arranges the prior work through authorized actions. Each view action follows after the person reads its result; a teammate action or substantive work occurs between checkpoints where stated, rather than assuming simultaneous back-to-back user actions. Waiting is only for the actual pending result, never an invented elapsed-time gate.

**Demo Flow:** Arrange the stated permitted work, edit only requested fields; save; inspect removal options; retire or delete eligible draft; return, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given selected editable work with references/history, or an exact authorized unreferenced draft
When edit only requested fields; save; inspect removal options; retire or delete eligible draft; return
Then same authoritative work preserved except requested change; referenced/history work retains identity and links; children unaffected; newer undo conflict is visible
And no body loss, hard deletion of accepted work, cascade or overwritten newer change
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: same authoritative work preserved except requested change; referenced/history work retains identity and links; children unaffected; newer undo conflict is visible. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no body loss, hard deletion of accepted work, cascade or overwritten newer change. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ same authoritative work preserved except requested change; referenced/history work retains identity and links; children unaffected; newer undo conflict is visible.
- ❌ no body loss, hard deletion of accepted work, cascade or overwritten newer change.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no body loss, hard deletion of accepted work, cascade or overwritten newer change.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-064]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-22, AC-TPT-24, BR-TPT-02, BR-TPT-19 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-064]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-064: edit and retirement API keeps history and child work while changing explicit visibility only`
**Status:** Untested

#### TC-TPT-065: J5 reconcile local proposals with shared status [P1]

**Objective:** Verify sharing cannot convert text success into accepted valid work through the stated observable action.

**Business Intent / Invariant Guarded:** Sharing cannot convert text success into accepted valid work.

**Proves:** AC-TPT-25, BR-TPT-18.

**Preconditions:**

- Two personal copies contain competing owner/identity/link/proof proposals.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The contributor or coordinator arranges the prior work through authorized actions. Each view action follows after the person reads its result; a teammate action or substantive work occurs between checkpoints where stated, rather than assuming simultaneous back-to-back user actions. Waiting is only for the actual pending result, never an invented elapsed-time gate.

**Demo Flow:** Arrange the stated permitted work, inspect Changes and proof; select available shared baseline; review conflicts; return to affected item, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given two personal copies contain competing owner/identity/link/proof proposals
When inspect Changes and proof; select available shared baseline; review conflicts; return to affected item
Then local proposal and shared baseline remain labelled; contradictory semantic facts require exact resolution; unchanged history retained
And no global exclusive claim, implicit publishing, guessed repair or remote freshness certainty
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: local proposal and shared baseline remain labelled; contradictory semantic facts require exact resolution; unchanged history retained. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no global exclusive claim, implicit publishing, guessed repair or remote freshness certainty. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ local proposal and shared baseline remain labelled; contradictory semantic facts require exact resolution; unchanged history retained.
- ❌ no global exclusive claim, implicit publishing, guessed repair or remote freshness certainty.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no global exclusive claim, implicit publishing, guessed repair or remote freshness certainty.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-065]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-25, BR-TPT-18 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-065]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Shared comparison labels pinned and current owners without changing acceptance or publishing [variant: shared-owner-comparison]`
**Status:** Untested

#### TC-TPT-071: Property BR-TPT-01 state-transition [P1]

**Objective:** Verify trusted exact intent or allowed linkage alone can change work through the stated observable action.

**Business Intent / Invariant Guarded:** trusted exact intent or allowed linkage alone can change work.

**Proves:** BR-TPT-01.

**Preconditions:**

- Any discussion, quotation, direct save request or established linkage under any selected update policy.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any discussion, quotation, direct save request or established linkage under any selected update policy
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: trusted exact intent or allowed linkage alone can change work; boundary outcome: an unlinked quoted request to change all statuses → no tracked mutation; continue untracked
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: trusted exact intent or allowed linkage alone can change work; boundary outcome: an unlinked quoted request to change all statuses → no tracked mutation; continue untracked. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: trusted exact intent or allowed linkage alone can change work; boundary outcome: an unlinked quoted request to change all statuses → no tracked mutation; continue untracked.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any discussion, quotation, direct save request or established linkage under any selected update policy"
invariant: "for ALL inputs: trusted exact intent or allowed linkage alone can change work"
boundaryCounterCase: "an unlinked quoted request to change all statuses \u2192 no tracked mutation; continue untracked"
```

**Edge Cases:**

- Boundary/failure: an unlinked quoted request to change all statuses → no tracked mutation; continue untracked.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-071]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-01 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-071]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-071: three modes crossed with human/automatic and actual write authority cannot invent authorization`
**Status:** Untested

#### TC-TPT-072: Property BR-TPT-02 conservation [P0]

**Objective:** Verify identity, unrequested authored content and unrelated history are conserved through the stated observable action.

**Business Intent / Invariant Guarded:** identity, unrequested authored content and unrelated history are conserved.

**Proves:** BR-TPT-02.

**Preconditions:**

- Any supported existing record with authored/custom content and any requested owned-field change.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any supported existing record with authored/custom content and any requested owned-field change
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: identity, unrequested authored content and unrelated history are conserved; boundary outcome: a conflicting identity/unsafe record or changed root → not saved; originals preserved
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: identity, unrequested authored content and unrelated history are conserved; boundary outcome: a conflicting identity/unsafe record or changed root → not saved; originals preserved. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: identity, unrequested authored content and unrelated history are conserved; boundary outcome: a conflicting identity/unsafe record or changed root → not saved; originals preserved.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any supported existing record with authored/custom content and any requested owned-field change"
invariant: "for ALL inputs: identity, unrequested authored content and unrelated history are conserved"
boundaryCounterCase: "a conflicting identity/unsafe record or changed root \u2192 not saved; originals preserved"
```

**Edge Cases:**

- Boundary/failure: a conflicting identity/unsafe record or changed root → not saved; originals preserved.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-072]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-02 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-072]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-072: owned updates conserve custom fields, comments, body, BOM and untouched newlines`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-072: custom tracking extensions and block or flow metadata survive owned edits`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-072: publishing a requested edit preserves existing file permissions`, `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-072: all six item-link roles require one selected owner and refuse missing, self and ambiguous targets without edits`
**Status:** Untested

#### TC-TPT-073: Property BR-TPT-03 state-transition [P1]

**Objective:** Verify ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof through the stated observable action.

**Business Intent / Invariant Guarded:** Ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof.

**Proves:** BR-TPT-03.

**Preconditions:**

- Any backlog item with reviewed outcome, criteria, required decisions and dependency combinations.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any backlog item with reviewed outcome, criteria, required decisions and dependency combinations
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: Ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof; boundary outcome: one unresolved required decision → Not ready and prior state retained
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: Ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof; boundary outcome: one unresolved required decision → Not ready and prior state retained. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: Ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof; boundary outcome: one unresolved required decision → Not ready and prior state retained.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any backlog item with reviewed outcome, criteria, required decisions and dependency combinations"
invariant: "for ALL inputs: Ready is allowed only when all current readiness prerequisites hold, without demanding implementation proof"
boundaryCounterCase: "one unresolved required decision \u2192 Not ready and prior state retained"
```

**Edge Cases:**

- Boundary/failure: one unresolved required decision → Not ready and prior state retained.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-073]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-073]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-073: assignment, planning, sources, proof and health remain separate from delivery acceptance`
**Status:** Untested

#### TC-TPT-074: Property BR-TPT-04 conservation [P1]

**Objective:** Verify count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit through the stated observable action.

**Business Intent / Invariant Guarded:** count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit.

**Proves:** BR-TPT-04.

**Preconditions:**

- Any multiset of overlapping groups, delivery items, stories, tasks, ideas and canceled work.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any multiset of overlapping groups, delivery items, stories, tasks, ideas and canceled work
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit; boundary outcome: empty, all-canceled or partial vision → No delivery scope or Scope incomplete, not 100%
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit; boundary outcome: empty, all-canceled or partial vision → No delivery scope or Scope incomplete, not 100%. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit; boundary outcome: empty, all-canceled or partial vision → No delivery scope or Scope incomplete, not 100%.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any multiset of overlapping groups, delivery items, stories, tasks, ideas and canceled work"
invariant: "for ALL inputs: count uses the unique eligible delivery union, and only accepted outcomes gain delivery credit"
boundaryCounterCase: "empty, all-canceled or partial vision \u2192 No delivery scope or Scope incomplete, not 100%"
```

**Edge Cases:**

- Boundary/failure: empty, all-canceled or partial vision → No delivery scope or Scope incomplete, not 100%.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-074]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-04 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-074]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-074: six relationship permutations change only explicit membership and count the unique PBI union`
**Status:** Untested

#### TC-TPT-075: Property BR-TPT-05 state-transition [P1]

**Objective:** Verify every ready-work set obeys priority before exact stable-identity ties, exclusions and read-only preservation.

**Business Intent / Invariant Guarded:** BR-TPT-05: valid relationships remain acyclic; ready selection follows the selected priority comparison then exact stable identity, never a title/alias or guessed prerequisite.

**Proves:** BR-TPT-05.

**Preconditions:**

- Any permitted uniquely owned set of links, memberships and candidates under a declared selected priority and exact-identity comparison policy, including differing priorities with opposing identity order and equal-priority ties.
- Each candidate is either Ready with resolved satisfied prerequisites, or independently excluded for Blocked state, blocked/canceled unresolved prerequisite, unknown/partial prerequisite, self dependency, cycle or foreign target.
- Native reads use their proved selected policy; unproved capability is unavailable, not a substituted authority.

**Real-World Reachability:** Contributors create valid work and review priority/membership before querying. Teammates may change prerequisite state before the next review. Invalid relationship witnesses represent deliberately unvalidated imports/manual edits discovered on inspection; permitted mutations must refuse creating them. No artificial simultaneous actions or immediate observation are assumed.

**Demo Flow:** For every generated set inspect ready-list/next exact identities against the declared comparison and eligibility, exercise each invalid relationship independently, and reread original sources.

```gherkin
Given any candidate set in the declared comparison and eligibility domain
When the contributor inspects ready work and the next suggestion
Then eligible identities follow selected priority first and exact stable identity only for ties
And the differing-priority and equal-priority witnesses have their declared exact ordered identities
And every excluded or unresolved candidate stays outside ready work with its actual reason
And invalid link attempts retain their prior relationships; inspection changes no source facts
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Exact ready identity order and next identity match the selected comparison; excluded reasons and partial scope are explicit. |
| System behavior | All generated differing-priority and tie branches obey the comparator; independently refuse self/cycle/foreign/unknown links and never manufacture readiness. |
| Business data state | List/next preserves every original identity, body/custom content, relationship, owner, lifecycle, acceptance, proof and history. Refused links retain pre-state. |
| Data shown on UI | In the witness set, ready PBI-900/PBI-901/PBI-104 and next PBI-900; no PBI-201 through PBI-208 exclusion appears as ready. |

**Acceptance Criteria:**

- ✅ For every domain member, priority comparison precedes the selected exact-identity tie order; eligible membership, excluded reasons and unchanged sources independently match expectations.
- ❌ A deterministic but ID-first order, reversed equal-priority tie, alias/title tie-break, admitted excluded candidate, or source mutation violates the property.

**Test Data:**

```yaml
inputDomain: "All permitted candidate sets under declared selected priority and exact-stable-identity orders; differing priorities with opposing ID order, equal-priority ties, satisfied prerequisites, and independent blocked/canceled unresolved/unknown/partial/self/cycle/foreign exclusions."
invariant: "For ALL sets, only Ready candidates with resolved satisfied current prerequisites enter ready selection; selected priority comparison precedes exact stable-identity comparison for ties; list/next and refused link attempts preserve all original source facts."
boundaryCounterCase: "Witness selected priority Higher before Lower, exact identity PBI-104 before PBI-900 before PBI-901: Higher Ready PBI-900/PBI-901 and Lower Ready PBI-104 must yield exactly [PBI-900,PBI-901,PBI-104], next PBI-900. Reject ID-first [PBI-104,PBI-900,PBI-901] and reversed tie [PBI-901,PBI-900,PBI-104]. Independently exclude PBI-201 Blocked, PBI-202 blocked prerequisite, PBI-203 canceled unresolved prerequisite, PBI-204 unknown, PBI-205 self, PBI-206 cycle, PBI-207 foreign, PBI-208 partial; any admitted excluded identity or changed source is a failure."
```

**Edge Cases:**

- Relabeling/renaming work does not replace exact stable identity for ties; duplicate memberships do not duplicate ready work.
- Unknown/partial scope remains qualified; known eligible entries may be shown, but unavailable entries are never guessed ready.
- Refused link creation and read-only inspection independently preserve original content, owners, state, acceptance/proof and history.

**Transition Invariants:** Listing/next implies no transition; invalid link attempts confer no readiness or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-075]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-05 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-075]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-075: Ready selection orders priority before exact identities and explains each state, retired, approval and unresolved relationship exclusion`
**Status:** Untested

#### TC-TPT-076: Property BR-TPT-06 state-transition [P1]

**Objective:** Verify only declared transitions with current prerequisites change state; replay/no-op adds no credit through the stated observable action.

**Business Intent / Invariant Guarded:** only declared transitions with current prerequisites change state; replay/no-op adds no credit.

**Proves:** BR-TPT-06.

**Preconditions:**

- All declared portable states crossed with requested plan, ready, start, block, resume, verify, accept, reopen and cancel actions; cancellation starts only from Draft, Backlog, Ready, In progress, Blocked, Verifying or Done under current revision, actual owner authority, explicit decision and reason.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given all declared portable states crossed with requested plan, ready, start, block, resume, verify, accept, reopen and cancel actions; cancellation starts only from Draft, Backlog, Ready, In progress, Blocked, Verifying or Done under current revision, actual owner authority, explicit decision and reason
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: only declared transitions with current prerequisites change state; replay/no-op adds no credit; boundary outcome: any undeclared state/action pair, absent cancellation reason/authority or stale revision → refusal; exact pre-state/history retained; new Canceled cancellation is no-op/refusal without growth
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: only declared transitions with current prerequisites change state; replay/no-op adds no credit; boundary outcome: any undeclared state/action pair, absent cancellation reason/authority or stale revision → refusal; exact pre-state/history retained; new Canceled cancellation is no-op/refusal without growth. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: only declared transitions with current prerequisites change state; replay/no-op adds no credit; boundary outcome: any undeclared state/action pair, absent cancellation reason/authority or stale revision → refusal; exact pre-state/history retained; new Canceled cancellation is no-op/refusal without growth.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "all declared portable states crossed with requested plan, ready, start, block, resume, verify, accept, reopen and cancel actions; cancellation starts only from Draft, Backlog, Ready, In progress, Blocked, Verifying or Done under current revision, actual owner authority, explicit decision and reason"
invariant: "for ALL inputs: only declared transitions with current prerequisites change state; replay/no-op adds no credit"
boundaryCounterCase: "any undeclared state/action pair, absent cancellation reason/authority or stale revision \u2192 refusal; exact pre-state/history retained; new Canceled cancellation is no-op/refusal without growth"
```

**Edge Cases:**

- An identical completed operation identity/payload returns its original receipt within the retained retry horizon without revision/history growth. A new redundant cancellation of Canceled work is a no-op or refusal with no revision/history growth. A changed request under a reused operation identity is refused.
- Cancel from Done: acceptance/proof history remains attributable, while active accepted credit is removed.
- Native transitions retain the native declared matrix; these portable rows cannot authorize a native write.

- Boundary/failure: any undeclared state/action pair, absent cancellation reason/authority or stale revision → refusal; exact pre-state/history retained; new Canceled cancellation is no-op/refusal without growth.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-076]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-076]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-076: every undeclared pair in the finite eight-state matrix preserves exact history and bytes`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-076: five malformed imported blocker records cannot authorize resume or overwrite history`
**Status:** Untested

#### TC-TPT-077: Property BR-TPT-07 state-transition [P0]

**Objective:** Verify done certification requires all applicable current required proof and actual scoped acceptance through the stated observable action.

**Business Intent / Invariant Guarded:** Done certification requires all applicable current required proof and actual scoped acceptance.

**Proves:** BR-TPT-07.

**Preconditions:**

- Any verifying delivery scope and combinations of required proof results, applicability, currentness and actual accepting authority.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any verifying delivery scope and combinations of required proof results, applicability, currentness and actual accepting authority
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: Done certification requires all applicable current required proof and actual scoped acceptance; boundary outcome: one stale/skipped/foreign/failed/missing proof or no authority → Acceptance pending; no certified Done
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: Done certification requires all applicable current required proof and actual scoped acceptance; boundary outcome: one stale/skipped/foreign/failed/missing proof or no authority → Acceptance pending; no certified Done. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: Done certification requires all applicable current required proof and actual scoped acceptance; boundary outcome: one stale/skipped/foreign/failed/missing proof or no authority → Acceptance pending; no certified Done.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any verifying delivery scope and combinations of required proof results, applicability, currentness and actual accepting authority"
invariant: "for ALL inputs: Done certification requires all applicable current required proof and actual scoped acceptance"
boundaryCounterCase: "one stale/skipped/foreign/failed/missing proof or no authority \u2192 Acceptance pending; no certified Done"
```

**Edge Cases:**

- Boundary/failure: one stale/skipped/foreign/failed/missing proof or no authority → Acceptance pending; no certified Done.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-077]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-07 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-077]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-077: malformed acceptance observations cannot create a completion numerator`
**Status:** Untested

#### TC-TPT-078: Property BR-TPT-08 conservation [P1]

**Objective:** Verify historical acceptance is conserved while current confidence changes only with a justified relevant gap through the stated observable action.

**Business Intent / Invariant Guarded:** historical acceptance is conserved while current confidence changes only with a justified relevant gap.

**Proves:** BR-TPT-08.

**Preconditions:**

- Any accepted work and any later relevant, unrelated or uncertain change with optional owner health attestation.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any accepted work and any later relevant, unrelated or uncertain change with optional owner health attestation
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: historical acceptance is conserved while current confidence changes only with a justified relevant gap; boundary outcome: unmapped change or missing owner/date/reason → unknown confidence or missing health; no guessed green
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: historical acceptance is conserved while current confidence changes only with a justified relevant gap; boundary outcome: unmapped change or missing owner/date/reason → unknown confidence or missing health; no guessed green. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: historical acceptance is conserved while current confidence changes only with a justified relevant gap; boundary outcome: unmapped change or missing owner/date/reason → unknown confidence or missing health; no guessed green.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any accepted work and any later relevant, unrelated or uncertain change with optional owner health attestation"
invariant: "for ALL inputs: historical acceptance is conserved while current confidence changes only with a justified relevant gap"
boundaryCounterCase: "unmapped change or missing owner/date/reason \u2192 unknown confidence or missing health; no guessed green"
```

**Edge Cases:**

- Boundary/failure: unmapped change or missing owner/date/reason → unknown confidence or missing health; no guessed green.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-078]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-08 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-078]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-078: selected spec and source item content withdraws confidence while a plan-only edit preserves current proof`, `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-078: missing and ambiguous accepted spec or source owners yield unknown confidence without erasing delivery`, `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-078: pinned governing-item proof resolves only baseline owners despite edited and duplicate worktree homes`
**Status:** Untested

#### TC-TPT-079: Property BR-TPT-09 conservation [P1]

**Objective:** Verify view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows through the stated observable action.

**Business Intent / Invariant Guarded:** view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows.

**Proves:** BR-TPT-09.

**Preconditions:**

- Any snapshot view, filter, search, sort, reload, print or selected historical export.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, perform the permitted actions and the stated boundary attempt for ALL inputs in this domain, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given any snapshot view, filter, search, sort, reload, print or selected historical export
When perform the permitted actions and the stated boundary attempt for ALL inputs in this domain
Then for ALL inputs: view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows; boundary outcome: persistent save/drag request in snapshot → snapshot boundary explained; no durable change
And the protected rule must not fail for any generated member of the declared domain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: for ALL inputs: view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows; boundary outcome: persistent save/drag request in snapshot → snapshot boundary explained; no durable change. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; the protected rule must not fail for any generated member of the declared domain. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ for ALL inputs: view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows; boundary outcome: persistent save/drag request in snapshot → snapshot boundary explained; no durable change.
- ❌ the protected rule must not fail for any generated member of the declared domain.

**Test Data:**

```yaml
inputDomain: "any snapshot view, filter, search, sort, reload, print or selected historical export"
invariant: "for ALL inputs: view operations leave work unchanged and preserve scope/as-of labels independently of displayed rows"
boundaryCounterCase: "persistent save/drag request in snapshot \u2192 snapshot boundary explained; no durable change"
```

**Edge Cases:**

- Boundary/failure: persistent save/drag request in snapshot → snapshot boundary explained; no durable change.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-079]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-09 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-079]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Board grouping shows the same filtered records by recorded state and leaves work and the delivery scope unchanged [variant: board-grouping]`
**Status:** Untested

#### TC-TPT-081: Inspect old records [P1]

**Objective:** Verify adopt without losing history through the stated observable action.

**Business Intent / Invariant Guarded:** adopt without losing history.

**Proves:** AC-TPT-10, BR-TPT-02, BR-TPT-11.

**Preconditions:**

- Existing records.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I inspect/preview repair, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given existing records
When I inspect/preview repair
Then content and old recorded Done stay visible
And no unrequested migration or invented proof occurs
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: content and old recorded Done stay visible. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no unrequested migration or invented proof occurs. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ content and old recorded Done stay visible.
- ❌ no unrequested migration or invented proof occurs.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no unrequested migration or invented proof occurs.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-081]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-10, BR-TPT-02, BR-TPT-11 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-081]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-081: legacy inspection preserves bytes and adoption requires a current preview`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-081: malformed UTF-8 and ambiguous YAML remain preserved and unsupported`
**Status:** Untested

#### TC-TPT-082: Recover competing edits/retries [P1]

**Objective:** Verify preserve team work through the stated observable action.

**Business Intent / Invariant Guarded:** preserve team work.

**Proves:** AC-TPT-11, BR-TPT-02, BR-TPT-12.

**Preconditions:**

- A newer competing save.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I save old work, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given a newer competing save
When I save old work
Then a conflict preserves my draft/current record
And completed retries cannot double-apply
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: a conflict preserves my draft/current record. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; completed retries cannot double-apply. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ a conflict preserves my draft/current record.
- ❌ completed retries cannot double-apply.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters.",
  "openedRevision": 7,
  "currentRevision": 8,
  "draftRetained": true
}
```

**Edge Cases:**

- Boundary/failure: completed retries cannot double-apply.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-082]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-11, BR-TPT-02, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-082]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-082: cooperating writers save one current revision and retain the losing draft`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-082: batch results remain per record and retry does not repeat successful siblings`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-082: preview detects a teammate change in selected scope before adopting`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-082: revision and byte identity both protect a saved actor draft`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-082: publication refuses stale content and exclusive creation preserves originals`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-082: creation preview across UTC midnight cannot save a different auto-allocated identity`, `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-082: policy changes between preview and apply require fresh review without relocating the owner`
**Status:** Untested

#### TC-TPT-083: Save specifications and delivery items directly [P1]

**Objective:** Verify maintain correct owners through the stated observable action.

**Business Intent / Invariant Guarded:** maintain correct owners.

**Proves:** AC-TPT-12, BR-TPT-01, BR-TPT-03, BR-TPT-13.

**Preconditions:**

- Exact save intent.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I save, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given exact save intent
When I save
Then only requested owners change
And no automatic partner record/readiness/delivery is inferred
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: only requested owners change. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no automatic partner record/readiness/delivery is inferred. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ only requested owners change.
- ❌ no automatic partner record/readiness/delivery is inferred.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no automatic partner record/readiness/delivery is inferred.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-083]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-12, BR-TPT-01, BR-TPT-03, BR-TPT-13 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-083]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-083: direct refinement saves only the selected delivery owner and never creates a partner or readiness`, `.claude/hooks/tests/suites/task-tracking-recovery-contracts.test.cjs::TC-TPT-083: specification-only producer saves preserve delivery owners and infer no partner, readiness or acceptance`
**Status:** Untested

#### TC-TPT-084: Implement defined provisional intent [P1]

**Objective:** Verify avoid evidence deadlock through the stated observable action.

**Business Intent / Invariant Guarded:** avoid evidence deadlock.

**Proves:** AC-TPT-13, BR-TPT-03, BR-TPT-13.

**Preconditions:**

- Complete provisional behavior.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I work, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given complete provisional behavior
When I work
Then absent implementation proof does not block start
And missing required behavior blocks only that decision
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: absent implementation proof does not block start. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; missing required behavior blocks only that decision. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ absent implementation proof does not block start.
- ❌ missing required behavior blocks only that decision.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: missing required behavior blocks only that decision.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-084]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-13, BR-TPT-03, BR-TPT-13 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-084]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-084: defined reviewed intent can start without implementation proof while incomplete behavior cannot become Ready`
**Status:** Untested

#### TC-TPT-085: Disable optional tracking/selection [P1]

**Objective:** Verify retain direct work through the stated observable action.

**Business Intent / Invariant Guarded:** retain direct work.

**Proves:** AC-TPT-14, BR-TPT-01, BR-TPT-14, BR-TPT-15.

**Preconditions:**

- Off/observe/skip choice.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I work, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given off/observe/skip choice
When I work
Then primary work continues under actual access
And unsolicited records/flows are not created
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: primary work continues under actual access. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; unsolicited records/flows are not created. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ primary work continues under actual access.
- ❌ unsolicited records/flows are not created.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: unsolicited records/flows are not created.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-085]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-14, BR-TPT-01, BR-TPT-14, BR-TPT-15 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-085]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-085: off and observe modes skip automatic changes while explicit edits remain available`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-085: unenrolled projects support explicit capture with automatic upkeep off`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-085: item opt-out skips exact linked upkeep without changing current facts`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-085: off and observe checkpoints save no optional item facts`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-085: opted-out items retain primary saves while optional activity is skipped`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-085: failed tools, reads, absent sessions and off policy emit no optional reminder`, `.claude/hooks/tests/suites/task-tracking-upkeep.test.cjs::TC-TPT-085: observe mode emits a useful untracked hint without adding canonical activity`
**Status:** Untested

#### TC-TPT-086: Inspect manual changes [P1]

**Objective:** Verify reconcile current truth through the stated observable action.

**Business Intent / Invariant Guarded:** reconcile current truth.

**Proves:** AC-TPT-15, BR-TPT-10, BR-TPT-16.

**Preconditions:**

- An external edit.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I next inspect permitted scope, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given an external edit
When I next inspect permitted scope
Then current content and gaps appear
And no immediate observation or automatic semantic repair is claimed
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: current content and gaps appear. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no immediate observation or automatic semantic repair is claimed. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ current content and gaps appear.
- ❌ no immediate observation or automatic semantic repair is claimed.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no immediate observation or automatic semantic repair is claimed.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-086]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-15, BR-TPT-10, BR-TPT-16 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-086]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-086: partial or duplicate owners retain visible facts and suppress precise percentages and writes`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-086: status reads preserve canonical bytes and distinguish local freshness and unknown health`
**Status:** Untested

#### TC-TPT-087: Retain successful saves [P1]

**Objective:** Verify repair secondary failures safely through the stated observable action.

**Business Intent / Invariant Guarded:** repair secondary failures safely.

**Proves:** AC-TPT-16, BR-TPT-12.

**Preconditions:**

- Saved intent and a failed link/report update.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I inspect, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given saved intent and a failed link/report update
When I inspect
Then saved and pending results are separate
And retry touches only unresolved work
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: saved and pending results are separate. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; retry touches only unresolved work. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ saved and pending results are separate.
- ❌ retry touches only unresolved work.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: retry touches only unresolved work.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-087]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-16, BR-TPT-12 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-087]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-087: a successful primary save survives missing linked work and retry applies only its unresolved checkpoint`, `.claude/hooks/tests/suites/task-tracking-recovery-contracts.test.cjs::TC-TPT-087: an initialized optional refresh failure preserves its successful core save and public retry refreshes only derived metadata`
**Status:** Untested

#### TC-TPT-088: Save native intent [P1]

**Objective:** Verify preserve one project authority through the stated observable action.

**Business Intent / Invariant Guarded:** preserve one project authority.

**Proves:** AC-TPT-17, BR-TPT-11, BR-TPT-13.

**Preconditions:**

- Native owners.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I save requested intent, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given native owners
When I save requested intent
Then existing identities/coverage remain
And unsupported extra coverage creation leaves a pending gap
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: existing identities/coverage remain. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; unsupported extra coverage creation leaves a pending gap. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ existing identities/coverage remain.
- ❌ unsupported extra coverage creation leaves a pending gap.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: unsupported extra coverage creation leaves a pending gap.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-088]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-17, BR-TPT-11, BR-TPT-13 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-088]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-088: unproved native intent and extra coverage writes refuse without changing identity, coverage or portable controls`
**Status:** Untested

#### TC-TPT-089: Assign native delivery [P1]

**Objective:** Verify supported native assignment changes every applied selected leaf to the requested active stable member and shows each selected leaf's actual result.

**Business Intent / Invariant Guarded:** AC-TPT-18/BR-TPT-11/17: leaf responsibility is real, separate from coordination; unsupported whole-footprint native writes cannot claim assignment or change any owner.

**Proves:** AC-TPT-18, BR-TPT-11, BR-TPT-17.

**Preconditions:**

- The coordinator reviews an exact preview of STORY-101 and STORY-102, their prior owners and current revisions, and selects active stable member member-leo. STORY-103 is unselected; member-sam independently coordinates EPIC-10.
- The selected native owner proves the entire requested write footprint before any native write. Fully supported, permitted partial and pending branches use capability fixtures; these do not enable actual unproved native writes.

**Real-World Reachability:** The coordinator reviews the group's leaves and proposed assignee, then confirms that exact preview. A supported per-leaf refusal or unavailable completion can occur during the operation; result inspection follows that attempt. A competing edit may occur after preview and is reread before recovery; no immediate external observation is assumed.

**Demo Flow:** Assign the two previewed leaves, inspect every selected result and reread selected/unselected leaves and coordinator. Repeat the supported partial/pending witnesses and the unproved whole-footprint refusal independently.

```gherkin
Given the exact two selected leaves, prior owners, active requested member and separate coordinator in Test Data
When the coordinator confirms the previewed native assignment to member-leo
Then a fully supported result marks both selected leaves applied and each reads back owner member-leo
And every selected leaf has an explicit applied, refused or pending result with its reason and actual owner
And the unselected STORY-103 owner and EPIC-10 coordinator remain unchanged
And state, acceptance, proof and unrelated authored/history facts remain unchanged
And an unproved whole native write footprint refuses every affected write before changing any leaf or other owner
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Both selected identities have explicit result rows; applied rows read member-leo, unresolved rows show their real reason and actual current owner. No omitted leaf or overall-complete claim for unresolved work. |
| System behavior | Apply only exact supported previewed changes. Preserve permitted primary successes if a later supported leaf fails; reread before retrying only unresolved leaves. An unproved whole footprint refuses all writes, including secondary/native refresh writes. |
| Business data state | In full success STORY-101/102 owners become member-leo. In the partial witness only STORY-101 becomes member-leo and STORY-102 remains member-maya. In pending witness STORY-102 remains member-maya until a proven actual save. In whole-footprint refusal STORY-101 remains member-duc and STORY-102 member-maya; all other affected owners remain unchanged. |
| Data shown on UI | Exact selected ID/result/readback triples match Test Data. STORY-103 stays member-maya; coordinator stays member-sam; original state/acceptance/proof and history remain visible. Competing changes show actual reread ownership, never a claimed old owner as current. |

**Acceptance Criteria:**

- ✅ Every applied selected leaf has the requested stable owner on readback; every selected ID is represented once with its actual applied/refused/pending result, while unselected/coordinator/lifecycle/acceptance/proof facts are preserved.
- ❌ No-op claimed as applied, missing selected result, unresolved claimed complete, changed unselected/coordinator, implicit start/acceptance, or any unproved whole-footprint write fails the case.

**Test Data:**

```json
{
  "scope": "Current checkout; local proposal",
  "group": "EPIC-10",
  "requestedMember": {
    "id": "member-leo",
    "displayName": "Leo",
    "active": true
  },
  "coordinator": {
    "id": "member-sam",
    "displayName": "Sam"
  },
  "selectedLeaves": [
    {
      "id": "STORY-101",
      "priorOwner": "member-duc",
      "state": "Ready"
    },
    {
      "id": "STORY-102",
      "priorOwner": "member-maya",
      "state": "In progress"
    }
  ],
  "unselectedLeaf": {
    "id": "STORY-103",
    "owner": "member-maya",
    "state": "Ready"
  },
  "fullySupportedExpected": [
    {
      "id": "STORY-101",
      "outcome": "applied",
      "readbackOwner": "member-leo"
    },
    {
      "id": "STORY-102",
      "outcome": "applied",
      "readbackOwner": "member-leo"
    }
  ],
  "supportedPartialWitness": [
    {
      "id": "STORY-101",
      "outcome": "applied",
      "readbackOwner": "member-leo"
    },
    {
      "id": "STORY-102",
      "outcome": "refused",
      "reason": "assignment unavailable for this leaf",
      "readbackOwner": "member-maya"
    }
  ],
  "pendingWitness": {
    "id": "STORY-102",
    "outcome": "pending",
    "reason": "assignment not completed",
    "readbackOwner": "member-maya"
  },
  "unprovedWholeFootprintExpected": [
    {
      "id": "STORY-101",
      "outcome": "refused",
      "readbackOwner": "member-duc"
    },
    {
      "id": "STORY-102",
      "outcome": "refused",
      "readbackOwner": "member-maya"
    }
  ]
}
```

**Edge Cases:**

- If supported policy refuses the entire operation, both selected rows are refused and both prior owners remain; partial fixtures apply only where that native policy explicitly permits them.
- A selected leaf with stale revision is not overwritten; its conflict row shows actual reread owner and preserves the attempted draft. Prior permitted successes remain explicit.
- Unsupported mixed/native broader footprint refuses every affected write; never use a portable fallback. Capability fixtures are hypothetical proof branches, not real native capability evidence.

**Transition Invariants:** Assignment changes responsibility only; it cannot start, finish or accept work, alter proof, or change coordinator/unselected leaves.

**Evidence:** [Source: test/work-tracking/TC-TPT-089]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-18, BR-TPT-11, BR-TPT-17 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-089]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-089: unproved whole native assignment refuses both exact leaves before any responsibility or secondary owner write`
**Status:** Untested

#### TC-TPT-090: Choose native working/shared status [P1]

**Objective:** Verify inspect honest scope through the stated observable action.

**Business Intent / Invariant Guarded:** inspect honest scope.

**Proves:** AC-TPT-19, BR-TPT-10, BR-TPT-11, BR-TPT-18.

**Preconditions:**

- A selected current/shared scope.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I view, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given a selected current/shared scope
When I view
Then one named source is used
And unavailable shared revision cannot substitute current work or fetch implicitly
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: one named source is used. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; unavailable shared revision cannot substitute current work or fetch implicitly. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ one named source is used.
- ❌ unavailable shared revision cannot substitute current work or fetch implicitly.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: unavailable shared revision cannot substitute current work or fetch implicitly.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-090]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-19, BR-TPT-10, BR-TPT-11, BR-TPT-18 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-090]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-090: native current and pinned shared inspection keep distinct source identities and unavailable shared scope cannot fall back`
**Status:** Untested

#### TC-TPT-091: Inspect native freshness/history [P1]

**Objective:** Verify avoid destroying project meaning through the stated observable action.

**Business Intent / Invariant Guarded:** avoid destroying project meaning.

**Proves:** AC-TPT-20, BR-TPT-07, BR-TPT-11.

**Preconditions:**

- Archives/aliases/feedback.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I review, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given archives/aliases/feedback
When I review
Then native metric meaning/history/unknown dates remain
And no portable acceptance is fabricated
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: native metric meaning/history/unknown dates remain. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; no portable acceptance is fabricated. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ native metric meaning/history/unknown dates remain.
- ❌ no portable acceptance is fabricated.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: no portable acceptance is fabricated.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-091]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-20, BR-TPT-07, BR-TPT-11 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-091]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-091: native archive review preserves unknown dates and feedback without importing portable acceptance`
**Status:** Untested

#### TC-TPT-092: Open one local workspace [P1]

**Objective:** Verify opening and closing one selected workspace preserves project scope and reports actual settled or uncertain work.

**Business Intent / Invariant Guarded:** For every selected workspace, opening grants no broader authority and closing cannot invent a successful save or cancellation for unresolved work.

**Proves:** AC-TPT-21, BR-TPT-10, BR-TPT-12, BR-TPT-15, BR-TPT-18, BR-TPT-20.

**Preconditions:**

- Selected working copy/profile.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I open, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given selected working copy/profile
When I open
Then scope/capabilities are visible and nothing canonical is written
And incompatible/unsafe scope is refused
When I submit an allowed change after reviewing the selected item
And I close the workspace while that change is still pending
Then new work is no longer admitted
And closure succeeds only after the admitted work and its result settle
And if the declared shutdown bound expires I see an uncertain outcome rather than a saved or canceled claim
When I reopen the selected workspace and reread or retry the original operation identity
Then I see the actual work outcome without applying a completed change twice
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Scope and capabilities are visible without an opening-time edit. Pending closure and unavailable new work are explicit; an expired shutdown bound reports an uncertain outcome and original-identity recovery. |
| System behavior | Refuse incompatible scope, stop new work on close, and report successful closure only after admitted work and its result settle. Repeat close requests retain the same outcome; reread/retry resolves uncertainty without duplicate application. |
| Business data state | Only exact permitted submitted changes can apply. Closing does not accept delivery, erase earlier successful work or imply cancellation. A refused action retains pre-state. |
| Data shown on UI | Reopening/rereading the selected item shows its actual saved or unchanged facts and retained receipt/history, with selected source, acceptance and current verification separately labelled. |

**Acceptance Criteria:**

- ✅ scope/capabilities are visible and nothing canonical is written.
- ✅ admitted work settles before successful closure; reopening and original-identity retry reveal one actual outcome.
- ❌ incompatible/unsafe scope is refused.
- ❌ a shutdown bound or lost result cannot be labelled saved, canceled or safely completed before the actual outcome is established.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: incompatible/unsafe scope is refused.
- Asking the machine to show the opened workspace: the outcome of that request is reported apart from the workspace being available, a request alone is never an observed open, and only the selected workspace is ever shown.
- Running the workspace where the person can see it: when asked, the workspace runs in a visible window of its own on the person's machine, and closing that window stops it. The request for that window is reported apart from the workspace being available; where no window can be opened the reason is stated and nothing is left running unseen by that request.
- Reaching the workspace without its session: nothing of the work is shown or changed. The person may ask for that same selected workspace to be shown again; no other project can be selected from there, and reloading an attached view keeps it attached while an unsaved draft is still lost.
- Closing with pending work: wait only within the declared shutdown bound, then report uncertain work and original-identity recovery if still unresolved.
- Closing twice: one settlement outcome; no extra operation or discarded earlier success.
- Communication ends before a result is received: reread or retry the original identity; do not infer cancellation or submit a fresh duplicate.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-092]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-21, BR-TPT-10, BR-TPT-12, BR-TPT-15, BR-TPT-18, BR-TPT-20 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-092]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Unavailable and unsupported initial sessions retain a real recovery path without exposing incomplete identity [variant: initial-session-recovery]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Opening and deep links keep the selected project and write nothing [variant: scope-and-links]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A read-only launch permits inspection without granting canonical write authority [variant: readonly-session]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Duplicate deep links refuse silent selection while exact owners remain safely inspectable [variant: duplicate-identity]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A lost successful response retries its exact operation without duplicate revision or history [variant: lost-save-result]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: loopback workspace binds one root and serves isolated session security headers`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: shutdown drains an admitted HTTP writer before settling and original retry commits only once`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: the real shutdown deadline reports indeterminate admitted work and original HTTP retry resolves one durable outcome`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: workspace shutdown closes its listener and writable launch requires a stable actor`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: opening asks for Google Chrome first on every platform and falls back to the default browser`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: a terminal launch runs the workspace in a window of its own on macOS, Windows and Linux, through a launcher script`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: serve --terminal reports a suppressed window as not opened, writes no launcher script, and refuses an unusable identity first`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: a suppressed, headless or failed browser start is reported as not opened and never as an observed open`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A reload stays attached, and a page without a session can only ask for the same selected workspace to be opened again [variant: session-reattach]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: serve with an open request keeps one listening workspace, reports the launch separately and writes nothing`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: a launch link attaches one page once, for a minute, and nothing else returns the session`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: a page without a session can have its workspace opened again only when the launch asked for a browser, and is never given the session`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-092: serve with an open request hands the browser a launch link, at launch and on reopen, never its session address`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Reload retains the attached checkout and actor while discarding only the unsaved page draft [variant: attached-draft-reload]`
**Status:** Untested

#### TC-TPT-093: Create/edit through ui or assistant [P1]

**Objective:** Verify get equivalent outcomes through the stated observable action.

**Business Intent / Invariant Guarded:** get equivalent outcomes.

**Proves:** AC-TPT-22, BR-TPT-02, BR-TPT-12, BR-TPT-15.

**Preconditions:**

- The same exact authorized change.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, either surface saves, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given the same exact authorized change
When either surface saves
Then the same record/rules/result apply
And stale revisions retain drafts
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: the same record/rules/result apply. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; stale revisions retain drafts. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ the same record/rules/result apply.
- ❌ stale revisions retain drafts.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: stale revisions retain drafts.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-093]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-22, BR-TPT-02, BR-TPT-12, BR-TPT-15 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-093]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::UI capture and refinement save through the same canonical operations [variant: capture-edit]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-093: writable workspace applies one actual actor request and reports stale conflicts`
**Status:** Untested

#### TC-TPT-094: Assign self/others and inspect people [P1]

**Objective:** Verify understand responsibility through the stated observable action.

**Business Intent / Invariant Guarded:** understand responsibility.

**Proves:** AC-TPT-23, BR-TPT-17.

**Preconditions:**

- An active stable member.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I assign, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given an active stable member
When I assign
Then owner changes without starting/accepting
And unknown/inactive/ambiguous identity refuses change
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: owner changes without starting/accepting. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; unknown/inactive/ambiguous identity refuses change. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ owner changes without starting/accepting.
- ❌ unknown/inactive/ambiguous identity refuses change.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters.",
  "state": "Ready",
  "assigneeBefore": null,
  "assigneeRequested": "maya",
  "acceptance": "Not accepted",
  "currentVerification": "No proof"
}
```

**Edge Cases:**

- Boundary/failure: unknown/inactive/ambiguous identity refuses change.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-094]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-23, BR-TPT-17 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-094]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Assignment to others and self preserves state until explicit Start [variant: people-and-start]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-094: people API returns stable assignments and rejects an inactive target without starting work`
**Status:** Untested

#### TC-TPT-095: Remove obsolete work [P1]

**Objective:** Verify retain references/history through the stated observable action.

**Business Intent / Invariant Guarded:** retain references/history.

**Proves:** AC-TPT-24, BR-TPT-19.

**Preconditions:**

- Obsolete referenced work.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I remove, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given obsolete referenced work
When I remove
Then cancel/archive/retire preserves history
And hard deletion is only permitted for an exact unreferenced draft or, by its own explicit action, exact unreferenced ended work (canceled or retired)
And ended work is deleted only with a stated reason and a current preview that states what is removed; open, started or accepted work is canceled or retired first and nothing cascades
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: cancel/archive/retire preserves history. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; hard deletion is only permitted for an exact unreferenced draft or, by its own explicit action, exact unreferenced ended work (canceled or retired) with a stated reason and a current preview that states what is removed. Open, started or accepted work is canceled or retired first; nothing cascades. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ cancel/archive/retire preserves history.
- ❌ hard deletion is only permitted for an exact unreferenced draft or, by its own explicit action, exact unreferenced ended work (canceled or retired) with a stated reason and a current preview that states what is removed; open, started or accepted work is canceled or retired first and nothing cascades.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: hard deletion is only permitted for an exact unreferenced draft, or by its own explicit action for unreferenced ended work (canceled or retired) after a preview that states what is removed and an explicit confirmation. Open, started or accepted work is not offered it, and ended work another record still points to is refused with that record named.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-095]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-24, BR-TPT-19 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-095]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::Draft deletion requires exact preview and confirmation while established work retains identity [variant: safe-draft-delete]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Canceled or retired work is deleted entirely after exact preview and confirmation, open work is not offered it, and referenced work is refused [variant: ended-work-delete]`
**Status:** Untested

#### TC-TPT-096: Share and reconcile proposals [P1]

**Objective:** Verify distinguish local and agreed responsibility through the stated observable action.

**Business Intent / Invariant Guarded:** distinguish local and agreed responsibility.

**Proves:** AC-TPT-25, BR-TPT-18.

**Preconditions:**

- Competing personal changes.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, shared scope is reread, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given competing personal changes
When shared scope is reread
Then identity/member/link/proof conflicts are surfaced
And text merge alone cannot certify validity
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: identity/member/link/proof conflicts are surfaced. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; text merge alone cannot certify validity. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ identity/member/link/proof conflicts are surfaced.
- ❌ text merge alone cannot certify validity.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: text merge alone cannot certify validity.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-096]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-25, BR-TPT-18 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-096]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-096: a pinned shared reread surfaces merged identity, member, link and stale-proof conflicts without certifying text`
**Status:** Untested

#### TC-TPT-097: Maintain exact linked work during delivery [P1]

**Objective:** Verify reduce duplicate manual upkeep through the stated observable action.

**Business Intent / Invariant Guarded:** reduce duplicate manual upkeep.

**Proves:** AC-TPT-26, BR-TPT-07, BR-TPT-14, BR-TPT-16.

**Preconditions:**

- Allowed exact linkage.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, actual work checkpoints occur, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given allowed exact linkage
When actual work checkpoints occur
Then scoped activity/blocker/proof changes reflect observed outcomes
And editing/stopping/green results never accept work
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: scoped activity/blocker/proof changes reflect observed outcomes. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; editing/stopping/green results never accept work. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ scoped activity/blocker/proof changes reflect observed outcomes.
- ❌ editing/stopping/green results never accept work.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: editing/stopping/green results never accept work.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:**

- For all applicable declared transitions, current prerequisites and exact scope govern the post-state; historical facts remain attributable.
- Any undeclared state/action pair, missing prerequisite, stale request or repeated completed action must preserve the prior state/history and add no delivery credit.

**Evidence:** [Source: test/work-tracking/TC-TPT-097]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-26, BR-TPT-07, BR-TPT-14, BR-TPT-16 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-097]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-case-contracts.test.cjs::TC-TPT-097: exact trusted checkpoints record activity, blocker and proof without accepting linked or unrelated work`
**Status:** Untested

#### TC-TPT-098: Recover missing instrumentation [P1]

**Objective:** Verify keep progress honest through the stated observable action.

**Business Intent / Invariant Guarded:** keep progress honest.

**Proves:** AC-TPT-27, BR-TPT-14, BR-TPT-16, BR-TPT-20.

**Preconditions:**

- Missing reminders or unlinked work.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The named actor first arranges the stated work through permitted capture, planning or inspection. The action follows after the actor has reviewed the selected item; no fixed clock delay is required. For an external edit, the teammate saves it before the next permitted inspection, so an immediate observation is not assumed.

**Demo Flow:** Arrange the stated permitted work, I continue, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given missing reminders or unlinked work
When I continue
Then no forced ticket appears and next allowed inspection reconciles
And unsupported immediate upkeep stays explicit
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The workspace or read-only status view shows: no forced ticket appears and next allowed inspection reconciles. Unsupported capabilities have an explicit reason. |
| System behavior | Perform or refuse only the requested supported action; unsupported immediate upkeep stays explicit. |
| Business data state | Only the exact authorized requested facts change, if successful; all other item, owner, scope and history facts remain. A refused action retains pre-state. |
| Data shown on UI | Rereading the selected item/scope shows the actual result above, with local/shared source, acceptance and current verification distinctly labelled where applicable. |

**Acceptance Criteria:**

- ✅ no forced ticket appears and next allowed inspection reconciles.
- ❌ unsupported immediate upkeep stays explicit.

**Test Data:**

```json
{
  "project": "Team workspace",
  "item": "PBI-104",
  "scope": "Current checkout; local proposal",
  "title": "Export filtered records",
  "intent": "People can export only records matching current filters."
}
```

**Edge Cases:**

- Boundary/failure: unsupported immediate upkeep stays explicit.
- Native unavailable/unproved action: show the unsupported reason and preserve original owners; never substitute another authority.
- Read or write access changed before the action: recheck actual scope and return denied/not saved, without fictitious success.

**Transition Invariants:** N/A — this case changes or inspects only the stated facts; it grants no implied lifecycle transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-098]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | AC-TPT-27, BR-TPT-14, BR-TPT-16, BR-TPT-20 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-098]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-098: outside-host code edits reconcile on inspection without a forced ticket or copied status`
**Status:** Untested

#### TC-TPT-101: Refused Draft → Backlog [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06.

**Preconditions:**

- Missing captured intent while the actor reviews a requested Draft → Backlog action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, plan the captured draft, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given missing captured intent while the actor reviews a requested Draft → Backlog action
When plan the captured draft
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
  "transition": "Draft → Backlog",
  "missingOrInvalid": "missing captured intent",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-101]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-101]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-101: legacy draft without captured intent cannot become a planned backlog item`
**Status:** Untested

#### TC-TPT-102: Refused Backlog → Ready [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-03.

**Preconditions:**

- An unresolved required scope decision while the actor reviews a requested Backlog → Ready action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, make the selected backlog item ready, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given an unresolved required scope decision while the actor reviews a requested Backlog → Ready action
When make the selected backlog item ready
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
  "transition": "Backlog → Ready",
  "missingOrInvalid": "an unresolved required scope decision",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-102]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-102]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-102: an explicitly unresolved required decision cannot make otherwise defined backlog work Ready`
**Status:** Untested

#### TC-TPT-103: Refused Ready → In progress [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-03.

**Preconditions:**

- Unknown or ambiguous responsible member while the actor reviews a requested Ready → In progress action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, start that exact item, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given unknown or ambiguous responsible member while the actor reviews a requested Ready → In progress action
When start that exact item
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
  "transition": "Ready → In progress",
  "missingOrInvalid": "unknown or ambiguous responsible member",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-103]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-103]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-103: unknown, inactive and ambiguous configured responsibility refuses an otherwise Ready start without a receipt`
**Status:** Untested

#### TC-TPT-104: Refused In progress → Blocked [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06.

**Preconditions:**

- No blocker reason while the actor reviews a requested In progress → Blocked action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, record the obstacle and reason, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given no blocker reason while the actor reviews a requested In progress → Blocked action
When record the obstacle and reason
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
  "transition": "In progress → Blocked",
  "missingOrInvalid": "no blocker reason",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-104]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-104]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-104: reasonless blocking immediately preserves active work, historical proof and delivery facts`
**Status:** Untested

#### TC-TPT-105: Refused Blocked → prior active state [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06, BR-TPT-03.

**Preconditions:**

- A prerequisite changed before resume while the actor reviews a requested Blocked → prior active state action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, resume after reviewing the resolution, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given a prerequisite changed before resume while the actor reviews a requested Blocked → prior active state action
When resume after reviewing the resolution
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
  "transition": "Blocked → prior active state",
  "missingOrInvalid": "a prerequisite changed before resume",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-105]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06, BR-TPT-03 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-105]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-105: newer prerequisite failure withdraws start and resume eligibility while preserving accepted history`, `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-105: a changed prerequisite source refuses blocked resume and preserves historical delivery and observed blocker`
**Status:** Untested

#### TC-TPT-106: Refused In progress → Verifying [P1]

**Objective:** Verify failure to satisfy the current transition must preserve work through the stated observable action.

**Business Intent / Invariant Guarded:** Failure to satisfy the current transition must preserve work.

**Proves:** BR-TPT-06.

**Preconditions:**

- The item is Draft rather than In progress while the actor reviews a requested In progress → Verifying action.
- The actor selects the actual project/profile and permitted scope before acting; native actions require the native capability and proof gate.

**Real-World Reachability:** The stated actor first creates or selects work through permitted actions and reviews its current result. A competing teammate save, policy change or actual work checkpoint occurs before the next action when stated; the gap is the real review/work interval, with no invented delay or back-to-back race requirement.

**Demo Flow:** Arrange the stated permitted work, hand off the selected outcome for verification, then read back the affected item or scoped result. Repeat the stated failure/boundary with the invalid condition; inspect the preserved previous facts.

```gherkin
Given the item is Draft rather than In progress while the actor reviews a requested In progress → Verifying action
When hand off the selected outcome for verification
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
  "transition": "In progress → Verifying",
  "missingOrInvalid": "the item is Draft rather than In progress",
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

**Evidence:** [Source: test/work-tracking/TC-TPT-106]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Intended observable outcome | BR-TPT-06 |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-106]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-invariants.test.cjs::TC-TPT-106: a Draft cannot be handed off as In progress work and receives no fictitious receipt`
**Status:** Untested
