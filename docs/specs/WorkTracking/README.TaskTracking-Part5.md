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
continuation: 5
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 5

## Related Documentation

- Read `README.TaskTracking.md` for governing intent, local identity, retained attribution and §1–7.
- This is the same canonical case registry; this carrier owns nine stable P10 case bodies.
- Parts2–4 retain lifecycle, authority, acceptance, retry and concern cases. In particular, TC085 permits explicit common-core capture without configured members and TC133 permits an inactive owner to unassign where that operation allows it.
- The focused identity suite supplies authored assertions mapped per case; no execution result is claimed. P9 report presentation remains governed by existing report cases, including TC062.

## 8. Test Specifications

### Test summary

| Priority | Untested | Executed |
|---|---:|---:|
| P0 | 4 | 0 |
| P1 | 5 | 0 |
| Total | 9 | 0 |

### Local identity journeys

#### TC-TPT-171: Start permitted work with the checkout author identity [P1]

**Objective:** A contributor starts and takes responsibility for local work without shared member setup.

**Business Intent / Invariant Guarded:** A usable local author identifies the contributor, while explicit work permission and lifecycle rules still govern every save.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-14, BR-TPT-17, BR-TPT-25.

**Preconditions:**

- Rowan selects a writable permitted checkout with author address `Rowan@Example.Test` and author name `Rowan Example`; no custom identity is selected and no declared member matches that address.
- Explicit capture and assignment to the current validated local contributor are permitted. Shared settings and the current tracking mode are recorded before the request.

**Real-World Reachability:** A new contributor opens the selected checkout, captures a draft, reads the saved result, then chooses self-assignment. A writable local workspace offers that validated contributor as a self-assignment choice; a read-only shared view does not create such eligibility.

**Demo Flow:** Capture explicitly, reread the draft, choose self-assignment and reread responsibility before continuing work.

```gherkin
Given Rowan has a usable author identity in the selected permitted checkout and no custom selection
When Rowan explicitly captures a draft and reads the saved result
And Rowan explicitly assigns that draft to the current local contributor
Then responsibility is rowan@example.test and the displayed name is Rowan Example
And the draft has no acceptance or completion credit and shared settings and tracking mode are unchanged
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Capture and self-assignment are usable without a member-registration detour; the actual saved outcome is visible. |
| System behavior | Resolve the selected checkout author for the permitted action and retain its identity throughout that action. |
| Business data state | Only the requested draft and responsibility are saved; minimal historical attribution may accompany the authorized save. |
| Data shown on UI | Rereading shows the lower-case address, Rowan's name, Draft state and unaccepted delivery. |

**Acceptance Criteria:**

- ✅ The saved draft can be reread, and a separate permitted self-assignment saves the same resolved contributor.
- ❌ Name/address discovery alone must not create work, turn tracking on, accept delivery or enroll a shared member.

**Test Data:**

```json
{"authorAddress":"Rowan@Example.Test","authorName":"Rowan Example","customSelection":null,"expectedOwner":"rowan@example.test","initialState":"Draft","acceptance":"none"}
```

**Edge Cases:** Missing author name with a usable address displays the complete address instead; a read-only launch must not offer a new active local assignment choice. If identity is unavailable or changes before the write, the action refuses without switching contributors or discarding the pending draft.

**Transition Invariants:** Capture creates Draft only; assignment changes responsibility only. Neither action supplies proof, health eligibility or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-171]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Local start and self-assignment | FR-TPT-051, AC-TPT-32, BR-TPT-17, BR-TPT-25 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-171]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-171: actual CLI discovers a local actor and captures without shared member enrollment`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-171: writable HTTP offers only its validated local worktree actor for capture and self-assignment`
**Status:** Untested

#### TC-TPT-172: Preserve an explicitly chosen custom member [P1]

**Objective:** A contributor keeps the established custom identity when the checkout author differs.

**Business Intent / Invariant Guarded:** Existing team identity choices remain stable; author metadata does not silently rename or replace them.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-02, BR-TPT-17, BR-TPT-25, BR-TPT-26.

**Preconditions:**

- Active declared member `Rowan-Team` has name `Rowan` and email alias `Rowan@Example.Test`; Casey is the selected checkout author.
- Rowan explicitly selects `Rowan-Team` for an otherwise permitted capture. An earlier retained name belongs to a different former contributor.

**Real-World Reachability:** A contributor who already uses a team member ID opens a checkout authored by a colleague and deliberately keeps the team identity. After reading that result, the contributor repeats identity selection through the declared email alias in different letter case.

**Demo Flow:** Choose the custom identity, save permitted work, reread it, then compare a separate permitted alias-matched action.

```gherkin
Given Rowan-Team is explicitly selected and Casey is the checkout author
When the contributor performs a permitted capture and reads it back
Then the saved actor is Rowan-Team with its declared name Rowan
And Casey does not replace it and prior attribution remains
When a separate permitted action matches the declared alias rowan@example.test
Then the chosen member still keeps the spelling Rowan-Team
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The selected custom identity and actual result remain explicit. |
| System behavior | An explicit valid choice takes precedence; unambiguous email matching is case-insensitive. |
| Business data state | Custom identity, name and prior attribution remain; no redundant historical name is added for a configured actor. |
| Data shown on UI | Rereads show `Rowan-Team` and `Rowan`, rather than Casey or a lower-cased custom ID. |

**Acceptance Criteria:**

- ✅ Both explicit selection and unambiguous declared email matching preserve the declared member ID and name.
- ❌ Similar names, ambiguous aliases or invalid explicit selection must not choose a different actor.

**Test Data:**

```json
{"chosenMember":"Rowan-Team","declaredName":"Rowan","alias":"Rowan@Example.Test","checkoutAuthor":"casey@example.test","aliasInput":"rowan@example.test","priorAttribution":"former@example.test"}
```

**Edge Cases:** Declared custom names retain the 160-character limit; email aliases use the 254-character address limit. A declared inactive selection stays that member and retains operation-specific eligibility; it is not replaced by an active checkout author.

**Transition Invariants:** Identity resolution does not change lifecycle, membership state, proof or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-172]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Custom identity precedence | AC-TPT-32, BR-TPT-25, BR-TPT-26 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-172]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-172: explicit custom selection and unique email matching keep custom spelling without profile churn`
**Status:** Untested

### Shared attribution journey

#### TC-TPT-173: Recognize a contributor across checkouts without granting membership [P1]

**Objective:** A coordinator recognizes prior work and interprets its health honestly in another checkout.

**Business Intent / Invariant Guarded:** A retained name explains who acted; it does not make that person an active member or eligible health owner.

**Proves:** FR-TPT-052, AC-TPT-33, BR-TPT-08, BR-TPT-17, BR-TPT-26, INV-TPT-02, INV-TPT-06.

**Preconditions:**

- Unregistered local contributor Rowan has made an authorized save and an otherwise-permitted dated health attestation; the selected item retains Rowan's minimal identity/name and dated reason.
- Casey opens a shared read-only copy without an eligible declared owner for that attestation. A separate control item has an eligible declared owner who explicitly supplies a current dated attestation.

**Real-World Reachability:** Rowan saves permitted work, a colleague receives the shared record, then reads its responsibility, attribution and health. The colleague separately reads the declared-owner control after its attestation is saved; neither read requires enrollment or a new local author choice.

**Demo Flow:** Save and share the selected record, read it elsewhere, then compare the eligible-owner control.

```gherkin
Given Rowan's permitted save retains Rowan Example and a dated attestation
When Casey reads the shared record without an eligible declared owner
Then Casey recognizes Rowan but sees health Unknown with the historical date and reason still inspectable
And Rowan's retained name supplies no acting, assignment or health-owner eligibility
When Casey reads a separate current attestation from an eligible declared owner
Then that control shows the health allowed by the existing attestation policy
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Names, dated reasons and health limitation are readable without forced identity setup. |
| System behavior | Separate read-only attribution from operational membership and health-owner eligibility. |
| Business data state | Earlier attribution and attestation remain; sharing and viewing change no member settings or record bytes. |
| Data shown on UI | The unregistered historical contributor is recognizable but inactive for selection; health is Unknown without the eligible declared owner, while the positive control is recognized. |

**Acceptance Criteria:**

- ✅ Historical names survive sharing and explain actual saved work; the eligible-owner control demonstrates that health is not universally Unknown.
- ❌ A saved name or date must not grant membership, new assignment, health credit, verified delivery or acceptance.

**Test Data:**

```json
{"contributor":"rowan@example.test","retainedName":"Rowan Example","attestationDate":"2026-10-06","attestationReason":"Current work checked by its permitted contributor","sharedHealth":"Unknown","controlOwner":"declared-owner","controlAttestation":"current and permitted"}
```

**Edge Cases:** A later declared name takes display precedence without erasing prior attribution. Deactivation or a changed local name does not rewrite history. Pinned shared and read-only views do not create an active local self-assignment choice.

**Transition Invariants:** Name retention and dated health attestation do not advance lifecycle or acceptance. Health eligibility follows the existing declared-owner rule.

**Evidence:** [Source: test/work-tracking/TC-TPT-173]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Attribution and honest health | AC-TPT-33, BR-TPT-26, INV-TPT-02, INV-TPT-06 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-173]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-173: shared and pinned attribution remains inactive and local-only health stays Unknown with configured positive control`
**Status:** Untested

### Identity validation

#### TC-TPT-181: Refuse unusable author identity and retain the usable address fallback [P1]

**Objective:** Identity-dependent work gives an actionable refusal for unusable author data and succeeds when only the name is absent.

**Business Intent / Invariant Guarded:** The contributor is identified by the selected checkout's usable address; identity gaps never silently choose another person.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-15, BR-TPT-20, BR-TPT-25.

**Preconditions:** An identity-dependent permitted request has no explicit custom actor. Independent copies provide missing, malformed, overlong and usable author data; allowed read-only inspection and primary untracked work remain available.

**Real-World Reachability:** A new checkout lacks author setup, the contributor tries an explicit identity-dependent save, reads its refusal and corrects the local author data. A separate checkout has a valid address but no name; the contributor saves and rereads it successfully.

**Demo Flow:** Try each unusable address independently, observe unchanged work, then use the valid address-only and exact-length controls.

```gherkin
Given the request needs a local actor and has no custom selection
When the selected checkout address is missing, malformed or longer than 254 characters
Then the request explains the identity problem and saves no work or substitute actor
When the selected checkout instead has a usable 254-character address and no author name
Then the permitted save succeeds and displays that complete address as its name
And allowed inspection and primary untracked work remain available
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | A refusal explains the unusable local identity and the permitted remedy; missing name alone causes no enrollment detour. |
| System behavior | Accept visible basic Latin address characters, exactly one at-sign with nonempty portions, no whitespace/control and total length at most254; require no mailbox/network validation. |
| Business data state | Refused saves leave canonical work and controls unchanged; the valid address-only save records its exact intended work. |
| Data shown on UI | A successful fallback shows the full lower-case address, without truncation; a refusal shows no saved or accepted substitute. |

**Acceptance Criteria:**

- ✅ Exact 254-character usable address succeeds, 255 refuses, and a missing name uses the full usable address.
- ❌ Missing address, empty portions, multiple at-signs, whitespace, controls, non-basic-Latin address characters or foreign checkout fallback must not supply an actor.

**Test Data:**

```json
{"validAddress":"rowan@example.test","missingName":true,"addressBoundaries":[254,255],"autoNameBoundaries":[254,255],"invalidAddresses":["","@example.test","rowan@","rowan@@example.test","rowan @example.test","rówan@example.test"],"declaredCustomNameBoundaries":[160,161]}
```

**Edge Cases:** An unavailable selected checkout is not replaced by a different checkout. Valid address casing normalizes automatic identity. Automatic/profile names support 254 characters; overlong supplied names refuse, while declared custom names retain their separate 160 limit. Other work identifiers retain their existing grammar.

**Transition Invariants:** Identity validation neither creates lifecycle progress nor disables permitted inspection or untracked primary work.

**Evidence:** [Source: test/work-tracking/TC-TPT-181]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Local identity limits and refusal | AC-TPT-32, BR-TPT-25 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-181]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-181: exact address and name limits preserve full fallback while malformed identity refuses`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-181: author lookup uses literal argv exact root bounded process options and scrubbed injected context`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-181: normal global local includeIf and worktree author configuration stays usable`
**Status:** Untested

### Permission and control preservation

#### TC-TPT-182: Keep the selected actor and operation-specific inactive permissions [P0]

**Objective:** An invalid explicit choice or changed author cannot switch actors, while permitted inactive-owner unassignment remains usable.

**Business Intent / Invariant Guarded:** Identity fallback does not rewrite explicit choices or replace the existing permission matrix.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-12, BR-TPT-17, BR-TPT-25.

**Preconditions:**

- A member registry exists with inactive `Rowan-Team`, who owns an item; the existing operation permits that owner to unassign. Casey is an active local checkout author.
- Separate requests cover an explicitly unknown member, assignment to inactive Rowan, a retained actor mismatch and a changed implicit checkout address before a pending write.

**Real-World Reachability:** An owner leaves the team but needs to unassign existing work. The owner explicitly selects the established ID, unassigns and rereads it. Independent refused requests exercise an unknown explicit ID, inactive new assignment and an author changed between opening a writable session and saving.

**Demo Flow:** Perform permitted inactive-owner unassignment first; attempt each refused action against an independently preserved item.

```gherkin
Given inactive Rowan-Team owns work and may unassign it
When Rowan-Team explicitly unassigns and reads the result
Then the item is unassigned by that same actor
When an explicit unknown actor or inactive new assignee is requested
Then the request refuses without falling back to Casey
When the implicit author changes before a pending write or disagrees with its retained actor
Then that write refuses without rebinding its draft to another actor
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The permitted unassignment and each specific refusal are distinguishable; pending drafts retain the chosen actor. |
| System behavior | Preserve explicit identity and operation-specific eligibility; never retry a pending action under a different contributor. |
| Business data state | Permitted unassignment alone removes responsibility; refused assignment, mismatch and unknown-selection requests preserve their source work. |
| Data shown on UI | Rereads show the actual unassignment and unchanged refused items, without Casey attribution or optimistic saves. |

**Acceptance Criteria:**

- ✅ TC133's permitted inactive-owner unassignment succeeds; inactive new assignment refuses without substitute identity.
- ❌ A registry-backed unknown explicit choice or changed/mismatched implicit actor must not silently fall back or save under another person.

**Test Data:**

```json
{"inactiveOwner":"Rowan-Team","localAuthor":"casey@example.test","unknownExplicitMember":"not-declared","permittedAction":"unassign own work","refusedAction":"assign inactive member","changedAuthor":"different@example.test"}
```

**Edge Cases:** Explicit common-core capture without configured members remains governed by TC085; this case's registry-backed unknown-choice refusal does not narrow it. Inactive members retain their historical IDs and operation permissions, rather than being globally banned.

**Transition Invariants:** Unassignment changes responsibility only; actor refusal and retry do not alter lifecycle, drafts, source data, proof or acceptance.

**Evidence:** [Source: test/work-tracking/TC-TPT-182]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Exact actor and inactive-operation preservation | BR-TPT-17, BR-TPT-25; preserved TC085 and TC133 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-182]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-182: inactive owner unassignment remains permitted while unknown actor and inactive recipient refuse`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-182: pending workspace actor cannot be rebound after Git email changes`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-182: linked retries retain original actor revision and request while changed identity preserves primary success`
**Status:** Untested

#### TC-TPT-183: Keep tracking and write controls independent of local identity [P0]

**Objective:** A usable author enables only an already-permitted action and leaves optional upkeep controls intact.

**Business Intent / Invariant Guarded:** Identity identifies the contributor; it does not grant scope, write permission, tracking consent or acceptance.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-07, BR-TPT-14, BR-TPT-15, BR-TPT-25.

**Preconditions:** A usable local author exists. Separate selected contexts cover an explicit permitted write with tracking off or observe, optional automatic upkeep off/observe/opted out, read-only work, foreign work and pending selection. The primary requested operation and exact prior work/control state are recorded.

**Real-World Reachability:** A contributor explicitly maintains permitted work without enabling automatic tracking, then performs primary work where optional upkeep is disabled. Independent read-only or foreign selections attempt the same write and receive honest refusals.

**Demo Flow:** Reread after the explicit permitted save, then observe skipped optional upkeep and refused out-of-authority writes independently.

```gherkin
Given local identity is usable and an explicit selected write is permitted with tracking off or observe
When the contributor requests that write and rereads it
Then only its exact intended change is saved and the tracking control remains unchanged
When optional upkeep is disabled or opted out
Then primary work remains successful and tracker work is not automatically added
When write permission or selected scope is unavailable
Then the attempted write refuses despite the usable author
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Saved, skipped, pending and denied outcomes are distinct; ordinary reading/guidance requires no author-registration detour. |
| System behavior | Apply existing control/scope/permission gates before optional identity work; explicit permitted actions retain their own identity requirements. |
| Business data state | Only the authorized exact save changes work; refusal, ordinary inspection and skipped upkeep preserve record bytes, settings and selection. |
| Data shown on UI | The successful primary result remains visible; no skipped or denied upkeep is shown as maintained, verified or accepted. |

**Acceptance Criteria:**

- ✅ Permitted explicit work can save with off/observe unchanged; automatic disabled/opted-out upkeep is skipped and out-of-scope writes refuse.
- ❌ A usable author must not widen authority, turn on tracking, change selection, fabricate proof or accept delivery.

**Test Data:**

```json
{"author":"rowan@example.test","explicitPermittedModes":["off","observe"],"automaticControls":["off","observe","opted out"],"refusedContexts":["read-only","foreign work","selection pending"],"acceptance":"none"}
```

**Edge Cases:** Ordinary report, link inspection and advisory reading remain useful without resolving a local author. A separately authorized explicit save is not suppressed merely because automatic upkeep is off. A partial tracker failure never rewrites primary success as failure.

**Transition Invariants:** Identity and optional upkeep supply no implicit lifecycle change, proof or acceptance; exact authorized operations retain their existing transition rules.

**Evidence:** [Source: test/work-tracking/TC-TPT-183]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Independent authority and upkeep controls | BR-TPT-14, BR-TPT-15, BR-TPT-25 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-183]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-183: ordinary readers and off observe advisory paths never resolve a local author`
**Status:** Untested

### Identity and attribution properties

#### TC-TPT-191: Every supported identity resolution preserves the intended actor [P0]

**Objective:** Verify the actor-preservation property across supported choices, addresses, states and retry boundaries.

**Business Intent / Invariant Guarded:** A permitted action consistently belongs to its intended contributor, never to a convenient fallback person.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-17, BR-TPT-25.

**Preconditions:** Independent permitted and refused work requests have exact selected checkout, explicit choice and prior record states. The domain includes eligible custom/local actors, registry-backed unknown choices, inactive actors with operation-specific permissions, aliases and missing/malformed author data.

**Real-World Reachability:** Contributors retain custom identities, use new local checkouts, change author names or correct a missing address between distinct requests. A pending write can outlive an author-address change; the retained request actor remains observable before retry.

**Demo Flow:** For each supported domain partition, request the operation, read its actual actor/result, and compare unchanged data when refusal applies. Include mandatory successful custom and local saves, plus permitted inactive-owner unassignment.

```gherkin
Given an independently selected request from the supported identity domain
When the contributor resolves identity and requests its permitted or refused action
Then a valid explicit choice or unambiguous declared alias keeps the declared ID spelling
And otherwise a usable selected-checkout address identifies the local contributor in lower case
And invalid explicit choices, unusable addresses and pending actor changes never choose a substitute
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | The intended actor and usable result or specific refusal are visible for every partition. |
| System behavior | Custom precedence, case-insensitive address matching, address/name bounds and retained actor checks apply consistently. |
| Business data state | Mandatory eligible positive requests save as the intended actor; conditional refusals preserve source work and pending drafts. |
| Data shown on UI | Saved ownership/name or refusal agrees with the selected choice; display-name similarity never substitutes an actor. |

**Acceptance Criteria:**

- ✅ Successful custom/local and permitted inactive-unassignment controls are required alongside all applicable refusal partitions.
- ❌ No partition may silently select another actor, truncate a fallback address or broaden inactive assignment permission.

**Test Data:**

```yaml
inputDomain: "Any independently selected checkout/action with valid, inactive or unknown explicit choice, unique/ambiguous/no alias match, usable/missing/malformed author data, boundary address/name lengths and unchanged/changed/mismatched pending actor"
invariant: "For ALL supported inputs, an explicit valid identity or unambiguous declared email match keeps custom spelling; otherwise only the selected usable local address supplies the lower-case actor. Conditional refusal never substitutes actors, changes work or discards drafts. Mandatory eligible custom/local saves and permitted inactive unassignment succeed."
boundaryCounterCase: "A usable 254-character address without name succeeds; 255, a second at-sign or a changed/mismatched pending actor refuses without substitution. Inactive new assignment refuses while existing permitted inactive-owner unassignment remains allowed."
partitions:
  explicitChoice: [valid-custom, registry-backed-unknown, configured-inactive, absent]
  aliasMatch: [unique-case-insensitive, ambiguous, none]
  localAddress: [usable-basic-Latin, missing, malformed, unavailable-selected-checkout]
  addressLength: [253, 254, 255]
  addressStructure: [one-at-sign-nonempty-portions, empty-portion, multiple-at-signs, whitespace, control, non-basic-Latin]
  displayName: [present-at-most254, absent-full-address-fallback, over254, declared-custom-at-most160, declared-custom-over160]
  operation: [eligible-save, inactive-owner-permitted-unassign, inactive-new-assignment]
  pendingActor: [unchanged, changed-address, retained-request-mismatch]
witnesses:
  meaning: "Explicit valid identity wins; unambiguous declared email matching preserves custom spelling; otherwise selected usable local address supplies a lower-case stable actor. No refused or pending action rebinds actors."
  mandatoryPositive: "Eligible custom save, eligible local save with 254-character address/name fallback, case-insensitive alias match, permitted inactive-owner unassignment"
  conditionalNegative: "Refuse registry-backed invalid/ambiguous selection, unusable or 255-character address, overlong name, inactive assignment and actor change/mismatch; preserve data and drafts"
boundaryExamples:
  trigger: "A valid 254-character address without name succeeds, while 255 or a second at-sign refuses; a custom choice remains itself even when another usable local author exists"
  violation: "Truncation, actor substitution or refusing all inactive operations contradicts the property"
```

**Edge Cases:** Alias matching is not mailbox/delivery verification. Other item/run/operation/native identifiers keep their original slug limits. Explicit no-members common-core capture remains TC085's permitted route.

**Transition Invariants:** Resolution and retries alter neither lifecycle nor acceptance; permitted assignment/unassignment retains its existing narrow purpose.

**Evidence:** [Source: test/work-tracking/TC-TPT-191]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Universal actor identity preservation | AC-TPT-32, BR-TPT-25; preserved TC085 and TC133 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-191]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-191: finite identity partitions preserve custom local alias and refusal actor meanings`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-191: every supported printable author character remains data across resolver and record roundtrip`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-191: a 254-character actor survives every lifecycle history and linked identity carrier`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-191: exact request retries do not append profiles history or revision after name-only changes`
**Status:** Untested

#### TC-TPT-192: Local identity never widens authority or optional upkeep [P0]

**Objective:** Verify that actor resolution preserves every applicable write, scope and tracking control.

**Business Intent / Invariant Guarded:** Correct attribution cannot turn a denied, pending or optional action into authorized work.

**Proves:** FR-TPT-051, AC-TPT-32, BR-TPT-07, BR-TPT-14, BR-TPT-15, BR-TPT-25.

**Preconditions:** Independent contexts span permitted/denied writes, exact/foreign/pending scope, explicit/automatic actions and off/observe/linked/opt-out controls. Their selected records, drafts, settings and primary results are known before the action.

**Real-World Reachability:** The same contributor works across writable and read-only selections, explicitly maintains an item with automatic tracking disabled and performs primary work where upkeep is optional. Each context is reread after its own request.

**Demo Flow:** Require an eligible exact write and permitted explicit off/observe writes, then exercise each applicable denied or skipped context with an equally usable identity.

```gherkin
Given a supported identity/control/scope combination with known prior state
When the contributor requests the relevant explicit action or completes primary work with optional upkeep
Then only an already-permitted exact action saves work
And applicable denial, pending selection, opt-out or disabled automatic upkeep remains effective
And identity resolution adds neither acceptance, proof nor shared enrollment
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Every saved, skipped, pending and refused outcome remains distinguishable; primary success is preserved. |
| System behavior | Existing authority and optional-upkeep controls remain independent of resolved local/custom identity. |
| Business data state | Mandatory positive saves affect only exact work; conditional denied/skipped contexts preserve work, drafts, settings and selection. |
| Data shown on UI | No skipped action appears maintained or accepted; successful exact work remains available for reread. |

**Acceptance Criteria:**

- ✅ The property includes permitted exact and explicit off/observe saves, not merely universal no-op outcomes.
- ❌ No identity partition may enable optional tracking, broaden access, choose another scope or fabricate verified/accepted delivery.

**Test Data:**

```yaml
inputDomain: "Any supported local/custom/inactive-operation actor crossed with applicable write authority, exact/foreign/pending scope, explicit/automatic/read action, off/observe/linked mode and allowed/opted-out upkeep"
invariant: "For ALL supported inputs, identity preserves existing authority and tracking controls. Mandatory eligible exact and permitted explicit off/observe saves succeed; applicable denied/pending writes refuse and disabled/opted-out automatic upkeep skips without changing prior work, selection or primary success."
boundaryCounterCase: "The same usable author can perform an authorized explicit off-mode save, but cannot enable disabled automatic upkeep or save a foreign/read-only item; those attempts preserve original work and controls."
partitions:
  identity: [valid-local, valid-custom, inactive-custom-with-operation-specific-eligibility]
  writeAuthority: [permitted, read-only, denied]
  scope: [exact-selected, foreign, pending-selection]
  action: [explicit-maintenance, optional-upkeep, ordinary-inspection]
  tracking: [off, observe, linked]
  optionalPermission: [allowed, opted-out]
witnesses:
  meaning: "Identity changes attribution only within existing permission; only already-authorized exact saves can change work. Ordinary reads and disabled/opted-out automatic upkeep cannot enroll members or expand controls."
  mandatoryPositive: "Eligible exact write and explicitly requested permitted off/observe writes save while controls remain unchanged"
  conditionalNegative: "Denied/read-only/foreign/pending writes refuse; applicable off/observe/opt-out automatic upkeep skips while primary work and prior bytes remain"
boundaryExamples:
  trigger: "Use the same usable local author for an authorized explicit off-mode save and a disabled automatic upkeep attempt"
  violation: "Treating both as denied, or using identity to enable automatic upkeep, violates independent operation authority"
```

**Edge Cases:** A missing optional tracker capability is disclosed without destroying successful primary work. Ordinary report/link/advisory reading needs no local-author registration. A permitted inactive custom operation remains permitted where its existing rule allows it.

**Transition Invariants:** No authority/control combination gets implicit lifecycle, proof, acceptance or activity credit from identity discovery.

**Evidence:** [Source: test/work-tracking/TC-TPT-192]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Universal independent authority controls | BR-TPT-07, BR-TPT-14, BR-TPT-15, BR-TPT-25 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-192]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-192: explicit off observe saves succeed while independent permissions and scope controls refuse`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-192: absent minimal relocated and malformed configuration preserve explicit setup boundaries`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-192: foreign checkout and unlinked checkpoint cannot claim work from the selected copy`
**Status:** Untested

#### TC-TPT-193: Retained contributor names remain display-only across authorized saves [P1]

**Objective:** Verify minimal durable attribution without deriving membership or health authority from history.

**Business Intent / Invariant Guarded:** Sharing and later edits preserve who acted without making former contributors eligible for new work or health credit.

**Proves:** FR-TPT-052, AC-TPT-33, BR-TPT-08, BR-TPT-17, BR-TPT-26, INV-TPT-02, INV-TPT-06.

**Preconditions:** Independent records include authorized unregistered local saves, configured actor saves, prior retained names, shared/read-only views and eligible/ineligible health-owner controls. Existing attribution and control state are known before each action.

**Real-World Reachability:** A local contributor saves, shares work, changes name or becomes inactive, and another contributor later makes a separately authorized edit. Coordinators reread the work and health in their own checkout without registering historical people.

**Demo Flow:** Require a real unregistered authorized save and configured save, then reread their history after supported later edits/sharing. Compare a permitted local dated attestation with an eligible configured-owner attestation.

```gherkin
Given supported records with known prior contributor names and membership
When an authorized unregistered local contributor saves and the record is later shared or edited
Then only minimal contributor identity and name are retained and earlier attribution survives
And a configured actor save adds no redundant captured name and declared names take display precedence
And historical names grant no new assignment or health-owner eligibility
And a local-only attestation rereads Unknown without an eligible declared owner while the configured-owner positive is recognized
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | Contributors remain recognizable, with historical/inactive selection and health Unknown explained accurately. |
| System behavior | Capture minimal unregistered attribution only within an authorized save; separate display history from operational eligibility. |
| Business data state | Prior names survive supported saves; configured actors need no redundant snapshot. Refused actions and read-only viewing add no profiles or authority. |
| Data shown on UI | Declared names take precedence; historical reasons/dates remain inspectable, and the eligible configured-owner health control is recognized. |

**Acceptance Criteria:**

- ✅ Mandatory authorized local/configured saves and eligible-owner health controls establish positive behavior before conditional history/refusal checks.
- ❌ Historical metadata, even with a recognizable name, must not confer active membership, assignment, acting permission, health eligibility or delivery credit.

**Test Data:**

```yaml
inputDomain: "Any supported authorized/refused save and later same/shared/pinned/renamed/deactivated read within existing count/byte bounds, with unregistered/configured actors, none/prior/duplicate attribution, current/absent declared names, eligible/historical/absent health owners and current/historical assignment targets"
invariant: "For ALL supported inputs, only validated unregistered participants used in authorized saves need minimal retained identity/name; prior attribution survives and configured names win without redundant snapshots. Historical names grant no operating, assignment or health eligibility. Mandatory local/configured saves and eligible configured-owner attestation positives remain usable."
boundaryCounterCase: "Historical name plus date/reason cannot authorize a new assignment or health-owner credit; refused/read-only actions add no profile. A permitted local-only dated attestation remains recorded but rereads Unknown absent an eligible configured owner, whereas the configured-owner control is recognized."
partitions:
  actingContributor: [validated-unregistered-local, configured-custom, denied-actor]
  priorAttribution: [none, retained-former-contributor, duplicate-contributor]
  laterContext: [same-checkout, shared-read-only, pinned-shared, renamed, deactivated, separately-authorized-edit]
  declaredName: [present, absent]
  healthOwner: [eligible-configured, historical-only, absent]
  healthAction: [permitted-current-dated-attestation, no-attestation]
  assignmentTarget: [eligible-current-local, eligible-declared, historical-inactive]
witnesses:
  meaning: "Only validated unregistered participants in an authorized save need minimal retained identity/name; existing attribution survives and configured names win. Historical profiles are display-only and grant neither operational membership nor health-owner eligibility."
  mandatoryPositive: "Authorized unregistered save retains recognizable name across sharing; configured save needs no redundant snapshot; eligible configured-owner current attestation is recognized"
  conditionalNegative: "Historical-only new assignment refuses; refused/read-only actions add nothing; a permitted local-only dated attestation remains recorded but health rereads Unknown absent an eligible configured owner"
boundaryExamples:
  trigger: "A historical name and dated reason are present but the contributor is not an eligible configured health owner or new assignee"
  violation: "Granting health credit/active assignment from history, discarding earlier names, or making every configured-owner health result Unknown violates the property"
```

**Edge Cases:** Repeated saves deduplicate the same supported contributor within existing bounds. Malformed or over-bound attribution is disclosed/refused under the governing record rules without widening authority. A later eligible declaration may supply current eligibility; the historical profile itself never does.

**Transition Invariants:** Attribution and health history do not imply acceptance, verified delivery or a lifecycle transition; existing proof/acceptance rules remain governing.

**Evidence:** [Source: test/work-tracking/TC-TPT-193]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Universal display-only durable attribution | AC-TPT-33, BR-TPT-26, INV-TPT-02, INV-TPT-06 |
| Executing implementation and assertion | [Source: test/work-tracking/TC-TPT-193]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-193: minimal attribution deduplicates authorized participants and preserves earlier names and configured precedence`, `.claude/hooks/tests/suites/task-tracking-identity.test.cjs::TC-TPT-193: profile schema and authorized patching preserve custom bytes and refuse malformed or overbound metadata`
**Status:** Untested
