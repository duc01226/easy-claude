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
continuation: 7
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 7

## Related Documentation

- Read `README.TaskTracking.md` §§1–7 for governing intent, in particular BR-TPT-30, FR-TPT-056/057, AC-TPT-37/38 and INV-TPT-08, and the glossary entries for the current vocabulary, the earlier vocabulary, the vocabulary declaration and vocabulary migration.
- This continues the same canonical registry and owns eleven new stable case bodies, TC-TPT-242 to TC-TPT-252. Earlier case bodies and their evidence remain conserved in the main owner and Parts2–6.
- Current vocabulary 3 uses task/story/subtask delivery lifecycles, person-decided initiatives and areas. Supported earlier vocabulary 2 is mapped read-only; first vocabulary 1 is unsupported (TC-TPT-326). No case creates migration code or a mechanism-specific test obligation.
- The decision and its rejected alternatives are recorded in `docs/adr/0005-work-tracker-vocabulary-and-migration.md`.
- Existing preservation, exact-scope, retry, deletion and permission cases remain governing. One business case may require multiple executing tests.

> Current applicability: vocabulary 3 and the main owner’s kind lifecycles/record-owned tags govern these conserved intents. Historical earlier-vocabulary examples are amended below; no new executor or migration-mechanism obligation is introduced.

## 8. Test Specifications

### Test summary

| Priority | Untested | Executed |
| -------- | -------: | -------: |
| P0       |        7 |        0 |
| P1       |        4 |        0 |
| Total    |       11 |        0 |

### Preservation Tests

#### TC-TPT-242: Read supported earlier work in current terms without saving [P0]

**Objective:** Read earlier2 in current3 terms with exact conserved task progress.

**Business Intent / Invariant Guarded:** For ALL wholly readable supported earlier2 projects, current presentation preserves total/accepted/remaining and exact eligible task identities without changing stored bytes.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-10, BR-TPT-28, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- earlier2 stores accepted task P1, Planned task P2, subtask K, idea initiative D, story S and program-purpose project E grouping P1/P2
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. open working and pinned source, inspect workspace/report and compare current view with pre-recorded task sets and stored content.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given earlier2 stores accepted task P1, Planned task P2, subtask K, idea initiative D, story S and program-purpose project E grouping P1/P2
When open working and pinned source, inspect workspace/report and compare current view with pre-recorded task sets and stored content
Then P1/P2 stay tasks, K subtask, S story, D initiative type idea and E initiative type initiative with mapped own state; P1/P2 own their E tags; exact task sets/counts stay equal
And a read never saves or rewrites source; unavailable/mixed input refuses rather than inventing current work
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | P1/P2 stay tasks, K subtask, S story, D initiative type idea and E initiative type initiative with mapped own state; P1/P2 own their E tags; exact task sets/counts stay equal |
| System behavior | a read never saves or rewrites source; unavailable/mixed input refuses rather than inventing current work |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ P1/P2 stay tasks, K subtask, S story, D initiative type idea and E initiative type initiative with mapped own state; P1/P2 own their E tags; exact task sets/counts stay equal
- ✅ a read never saves or rewrites source; unavailable/mixed input refuses rather than inventing current work
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all supported earlier2 kinds, group purposes, states, labels, declarations and working/pinned source variants",
  "invariant": "For ALL wholly readable supported earlier2 projects, current presentation preserves total/accepted/remaining and exact eligible task identities without changing stored bytes.",
  "boundaryCounterCase": "a read never saves or rewrites source; unavailable/mixed input refuses rather than inventing current work"
}
```

**Edge Cases:**

- Nonprogram project/vision maps to area with declared mapping; unsupported first1 is TC-TPT-326.
- An undeclared shared-only location requires enough supported vocabulary evidence or declaration.
- Earlier-valid labels are interpreted under declared2 and do not silently become current3 config.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-242]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-056, AC-TPT-37, BR-TPT-10, BR-TPT-28, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-242]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-242: inspect --figures states the figures of every area and every initiative of an earlier project, from the working copy and from a pinned commit, and the same figures once it is migrated`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-242: the status report of an earlier-vocabulary project shows current words and the recorded numbers under a read-only notice, and changes no record`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: an earlier-vocabulary project reads in the current terms with the progress it had and nothing is written`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: a pinned read uses the pinned commit's own vocabulary and reports the numbers that commit had`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: an undeclared project is recognised by an earlier-only location and reads the same numbers locally and pinned`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: a location spelled in another letter case is recognised exactly when the disk reads it as the same location`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: the working copy and a pinned commit of an earlier project state the same thing: every former group as the area or initiative it becomes, holding the tasks its list held, and nothing is written`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::An earlier-vocabulary project is shown in the current words with its recorded numbers and a read-only notice, in the workspace and in its report [variant: earlier-project-current-words]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A read that carries no vocabulary is refused whole, when the page opens and after a later read, and the draft returns once the workspace answers in full [variant: read-without-vocabulary]`
**Status:** Untested

### Refusal outcomes for earlier and mixed vocabularies

#### TC-TPT-243: Refuse earlier-project saves and skip upkeep until migration [P0]

**Objective:** Preserve every earlier2 record until explicit migration.

**Business Intent / Invariant Guarded:** For ALL earlier2 projects, every save and save-preview refuses migration-required and automatic upkeep skips without changing source.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-02, BR-TPT-14, BR-TPT-30.

**Preconditions:**

- the earlier2 project is readable with an otherwise eligible actor and linked upkeep enabled
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. attempt capture/update/link/tag/assignment/state/proof/accept/delete and save previews, then observe an eligible upkeep checkpoint.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given the earlier2 project is readable with an otherwise eligible actor and linked upkeep enabled
When attempt capture/update/link/tag/assignment/state/proof/accept/delete and save previews, then observe an eligible upkeep checkpoint
Then each write entry names migration required, retains pending draft and preserves all stored records/settings
And read success, preview, person authority or automatic upkeep never authorizes an earlier-project write
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | each write entry names migration required, retains pending draft and preserves all stored records/settings |
| System behavior | read success, preview, person authority or automatic upkeep never authorizes an earlier-project write |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ each write entry names migration required, retains pending draft and preserves all stored records/settings
- ✅ read success, preview, person authority or automatic upkeep never authorizes an earlier-project write
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "every supported write entry against earlier2, direct/assistant/UI/upkeep and preview variants",
  "invariant": "For ALL earlier2 projects, every save and save-preview refuses migration-required and automatic upkeep skips without changing source.",
  "boundaryCounterCase": "read success, preview, person authority or automatic upkeep never authorizes an earlier-project write"
}
```

**Edge Cases:**

- Migration preview remains separately available without save authority.
- Pinned earlier source remains read-only.
- Changing independent tracking controls cannot bypass compatibility refusal.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-243]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-056, AC-TPT-37, BR-TPT-02, BR-TPT-14, BR-TPT-30 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-243]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: every save operation and its preview on an earlier-vocabulary project is refused as migration required and changes nothing`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: an automatic checkpoint on an earlier-vocabulary project is skipped with the same reason and the primary result is kept`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: the save an earlier-vocabulary project refuses succeeds on a project stored in the current vocabulary`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A save sent to a project that stores the earlier vocabulary is refused as migration required, keeps the draft and changes nothing [variant: save-refused-until-migration]`
**Status:** Untested

#### TC-TPT-244: Refuse mixed or undecidable vocabulary without guessed credit [P0]

**Objective:** Keep ambiguous projects unavailable and prior reports intact.

**Business Intent / Invariant Guarded:** For ALL mixed or undecidable vocabulary inputs, no record owner or progress value is guessed.

**Proves:** FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- a stored declaration conflicts with owned records, or undeclared record evidence mixes supported vocabularies
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect the project and request a replacement report, then compare source and the previous report.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a stored declaration conflicts with owned records, or undeclared record evidence mixes supported vocabularies
When inspect the project and request a replacement report, then compare source and the previous report
Then the exact conflicting declaration/location/stamp is named and scope is unavailable
And no substituted record, complete percentage or replacement report is produced; stored source and prior report remain
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the exact conflicting declaration/location/stamp is named and scope is unavailable |
| System behavior | no substituted record, complete percentage or replacement report is produced; stored source and prior report remain |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the exact conflicting declaration/location/stamp is named and scope is unavailable
- ✅ no substituted record, complete percentage or replacement report is produced; stored source and prior report remain
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "declared/undeclared mixed2/3, invalid declarations, contradictory stamps and incomplete recognition",
  "invariant": "For ALL mixed or undecidable vocabulary inputs, no record owner or progress value is guessed.",
  "boundaryCounterCase": "no substituted record, complete percentage or replacement report is produced; stored source and prior report remain"
}
```

**Edge Cases:**

- Unknown declaration version is named, never treated as omitted.
- An actually complete empty current project differs from ambiguous evidence.
- First-only1 receives its distinct unsupported refusal under TC-TPT-326.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-244]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-244]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-244: the shipped report command refuses a project that holds both vocabularies or an unfinished migration with that project's own reason`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-244: a status report requested for a project holding both vocabularies is refused with that reason, shows no work, and the report made before is kept`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: an undeclared project holding locations of both vocabularies is refused as mixed and nothing is counted`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: a project declared as earlier that holds a current-only location is refused as mixed, locally and pinned`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: one rule settles a project's vocabulary from its declaration, its locations and a migration progress record`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A project holding record locations of both vocabularies shows the named reason and no work, count, percentage or report [variant: mixed-vocabularies]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Comparing a readable pinned ref with a checkout that holds both vocabularies names that reason and shows no difference, count or sharing hint [variant: comparison-unreadable-checkout]`
**Status:** Untested

#### TC-TPT-245: Refuse older save requests whole without reinterpretation [P0]

**Objective:** Require current exchanged words and request version.

**Business Intent / Invariant Guarded:** For ALL requests not written for current3, refuse whole before applying any part even when a word overlaps current vocabulary.

**Proves:** FR-TPT-006, AC-TPT-37, BR-TPT-12, BR-TPT-30.

**Preconditions:**

- a current3 project and an otherwise authorized actor retain exact pre-state
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. send older2/first1 or absent/invalid-version save requests, including retired group operation/kinds, then reread.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a current3 project and an otherwise authorized actor retain exact pre-state
When send older2/first1 or absent/invalid-version save requests, including retired group operation/kinds, then reread
Then the request version or unsupported operation/kind is named and nothing saves
And no partial application, silent rename, guessed kind, receipt or revision growth occurs
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the request version or unsupported operation/kind is named and nothing saves |
| System behavior | no partial application, silent rename, guessed kind, receipt or revision growth occurs |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the request version or unsupported operation/kind is named and nothing saves
- ✅ no partial application, silent rename, guessed kind, receipt or revision growth occurs
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "current/older/unknown/missing request versions and retired current operation/kind shapes",
  "invariant": "For ALL requests not written for current3, refuse whole before applying any part even when a word overlaps current vocabulary.",
  "boundaryCounterCase": "no partial application, silent rename, guessed kind, receipt or revision growth occurs"
}
```

**Edge Cases:**

- Explicit current3 valid requests remain admitted under their actual policies.
- Dry-run never reinterprets an older request.
- A project declaration is not a substitute for the request version.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-245]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-006, AC-TPT-37, BR-TPT-12, BR-TPT-30 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-245]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-245: a version 2 request is refused whole and never carried out in the current words`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-245: the group operation and the kinds of an earlier vocabulary are refused`, `.claude/hooks/tests/suites/task-tracking-core.test.cjs::TC-TPT-245: the catalogue offers fourteen operations and its transition entry carries the decision flag`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-245: a save request written for the earlier vocabulary is refused whole and never carried out under the current meaning`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-245: a checkpoint request retained from before the vocabulary change is never replayed`
**Status:** Untested

#### TC-TPT-246: Refuse unsafe migration before any source change [P0]

**Objective:** Require mappable conserved source and an actual restore point.

**Business Intent / Invariant Guarded:** For ALL unsafe supported2 migration preconditions, refusal names the cause and changes no source.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-02, BR-TPT-20, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- an earlier2 portable project has one varied obstacle: unreadable/unsafe/duplicate/cyclic source, invalid mapping/label, incomplete/nonconserved scope or absent restore protection
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. request preview, inspect named obstacles, then attempt explicit migration without resolving them.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given an earlier2 portable project has one varied obstacle: unreadable/unsafe/duplicate/cyclic source, invalid mapping/label, incomplete/nonconserved scope or absent restore protection
When request preview, inspect named obstacles, then attempt explicit migration without resolving them
Then preview explains extent and obstacles without writing; migration refuses before source change
And no claimed backup, automatic cleanup, guessed mapping or changed source can stand in for actual protection and conservation
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | preview explains extent and obstacles without writing; migration refuses before source change |
| System behavior | no claimed backup, automatic cleanup, guessed mapping or changed source can stand in for actual protection and conservation |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ preview explains extent and obstacles without writing; migration refuses before source change
- ✅ no claimed backup, automatic cleanup, guessed mapping or changed source can stand in for actual protection and conservation
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all mapping/conservation/safe-owner/readability/restore-protection preconditions for supported2 migration",
  "invariant": "For ALL unsafe supported2 migration preconditions, refusal names the cause and changes no source.",
  "boundaryCounterCase": "no claimed backup, automatic cleanup, guessed mapping or changed source can stand in for actual protection and conservation"
}
```

**Edge Cases:**

- Clean tracked owned paths may supply protection; dirty/unknown Git status names exact cause.
- Outside Git or ignored records require the person’s actual confirmed restorable backup; preview remains available.
- Unrecordable or unmappable work refuses before change; no technical journal-layout case is created.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-246]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-057, AC-TPT-38, BR-TPT-02, BR-TPT-20, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-246]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-246: outside version control the shipped migrate command ends with a failing status and changes nothing until --backup-confirmed is given, previews either way, and no other command takes that flag`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: migration and its preview refuse each unmet precondition by name, change nothing and leave no progress record`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a record root with uncommitted or untracked files is refused in a Git checkout, and a project outside version control is told it has no restore point`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: an uncommitted change to the project configuration that will be rewritten is refused by name`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: an uncommitted change to a project configuration the migration will not rewrite is not its concern`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: when Git cannot say whether the record root is clean the migration is refused with the cause and what resolves it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a record root that Git ignores is previewed with the statement that version control cannot restore it, and a run there is refused until a backup is confirmed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a project in a sub-folder of a larger Git checkout has its uncommitted configuration and records named as the project itself names them`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a record that already links to a finite-outcome group without being listed by it would join what that group counts: refused before any change, naming the group and the task`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a group that lists an identity no record has is refused before any change, naming the group and the identity`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a listed record without tracking metadata cannot carry a link and migration invents none: refused before any change, naming the record`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: two records that would be kept at one path, or one that would land on a file already there, are refused before any change with both named, also when the names differ only in letter case`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a project that reads as current but holds records stamped for the earlier vocabulary is refused and told how to say what it stores`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: an identity stored twice, or a file that is not a record in a location the migration removes, is refused before any change by name`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: where version control cannot restore the project a run is refused before any change until a backup is confirmed, while the preview is given and says so, a repeated run and an abandon request do not ask, and a clean checkout needs no confirmation`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a kind label that the current vocabulary uses for something else is named by the migration before any change, with the rename that resolves it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a project whose member index would not fit a progress record is refused before any change: the migration could not record what it must before its first change`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a migration that would not keep what a group held names each record that causes it, and a record that is no group and holds an empty member list is no obstacle`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a file Git ignores that is no record does not make a clean checkout unrestorable: only an ignored record file or an ignored declaration needs a confirmed backup, and each is named`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: every label the current vocabulary cannot keep is named in one answer before any change, each with what resolves it`
**Status:** Untested

### Migration outcomes

#### TC-TPT-247: Preview explicit migration without changing or authorizing work [P1]

**Objective:** Let a person review supported2→3 mapping and unresolved protection.

**Business Intent / Invariant Guarded:** For ALL supported2 migration previews, mapping, extent, conservation, standing and obstacles are visible without saving or granting authority.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-20, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- an earlier2 project has recorded source and a known restore-protection condition
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. request only migration preview and compare all stored source/settings before and after.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given an earlier2 project has recorded source and a known restore-protection condition
When request only migration preview and compare all stored source/settings before and after
Then the preview names current mapped kinds/values/tags, affected scope and verification changes with any precondition obstacle
And no source changes and preview success supplies no backup confirmation, write authority or person decision
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the preview names current mapped kinds/values/tags, affected scope and verification changes with any precondition obstacle |
| System behavior | no source changes and preview success supplies no backup confirmation, write authority or person decision |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the preview names current mapped kinds/values/tags, affected scope and verification changes with any precondition obstacle
- ✅ no source changes and preview success supplies no backup confirmation, write authority or person decision
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "supported2 portable source, explicit command/flag admission and met/unmet protection variants",
  "invariant": "For ALL supported2 migration previews, mapping, extent, conservation, standing and obstacles are visible without saving or granting authority.",
  "boundaryCounterCase": "no source changes and preview success supplies no backup confirmation, write authority or person decision"
}
```

**Edge Cases:**

- Current3 returns the appropriate no-change result.
- Unknown flags or unsupported first1 cannot launch a conversion.
- Crossing organizational edges and cleared invalid levels are disclosed.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-247]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-057, AC-TPT-38, BR-TPT-20, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-247]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-247: the shipped command lists migrate, previews it without changing anything and accepts the preview and abandon flags for migrate alone, never both`, `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-247: the shipped migrate command takes its own flags and nothing else: a scope, a decision, a request for figures or the retired group selector is refused as typed and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-247: a preview lists each record that would move, the owned values that would change and the progress to conserve, twice alike, and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-247: the preview of an earlier project with no records lists only the declaration change, and of an unconfigured project no declaration change`
**Status:** Untested

#### TC-TPT-248: Explicit migration conserves authored work and exact task sets [P0]

**Objective:** Move supported2 to current3 without losing meaning or delivery credit.

**Business Intent / Invariant Guarded:** For ALL admissible supported2 migrations, identity, authored content and exact eligible/accepted/remaining task sets are conserved while mapped current representation is disclosed.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-02, BR-TPT-28, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- an earlier2 portable project is fully mapped/readable and protected by clean tracked owned paths or actual confirmed backup
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. review preview, explicitly migrate and compare each identity/content/task set with the recorded source; reread working/pinned source appropriately.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given an earlier2 portable project is fully mapped/readable and protected by clean tracked owned paths or actual confirmed backup
When review preview, explicitly migrate and compare each identity/content/task set with the recorded source; reread working/pinned source appropriately
Then program groups become initiative type initiative; other groups become areas; former members own tags; type/level/state/label mapping equals BR-TPT-30 and exact task sets/counts remain equal
And authored body, reasons, identities, revisions, retained history/proof/receipts are not invented or discarded; changed standing is named without altering proof
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | program groups become initiative type initiative; other groups become areas; former members own tags; type/level/state/label mapping equals BR-TPT-30 and exact task sets/counts remain equal |
| System behavior | authored body, reasons, identities, revisions, retained history/proof/receipts are not invented or discarded; changed standing is named without altering proof |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ program groups become initiative type initiative; other groups become areas; former members own tags; type/level/state/label mapping equals BR-TPT-30 and exact task sets/counts remain equal
- ✅ authored body, reasons, identities, revisions, retained history/proof/receipts are not invented or discarded; changed standing is named without altering proof
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "all admitted earlier2 groups/purposes/nesting/crossing links/states/labels and protected-source variants",
  "invariant": "For ALL admissible supported2 migrations, identity, authored content and exact eligible/accepted/remaining task sets are conserved while mapped current representation is disclosed.",
  "boundaryCounterCase": "authored body, reasons, identities, revisions, retained history/proof/receipts are not invented or discarded; changed standing is named without altering proof"
}
```

**Edge Cases:**

- Nested program and area/program crossing preserve direct nongroup task membership, disclose dropped edges and any invalid level cleared.
- Empty nongroup sets are valid when their independent conserved sets are equal.
- A later pinned earlier commit still maps its own records read-only, not the current checkout.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-248]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-057, AC-TPT-38, BR-TPT-02, BR-TPT-28, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-248]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-248: the shipped command migrates only when asked without the preview flag and ends with a failing status whenever the migration did not finish`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: migration rewrites only tracker-owned values, writes each group record at its new path and conserves every authored byte, identity, name and progress value`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: an unconfigured earlier project is migrated without being enrolled and then reads as current by its locations`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a rewrite that would alter authored content is refused before any record changes`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a result whose progress differs from the values captured before the first change is reported as failed and its progress record is kept`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: the preview and the result name the work that stops being currently verified, leaves the ready list or is newly held by an unverified prerequisite, and no proof is altered`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a record with Windows line endings and a byte-order mark is rewritten with both kept and no other byte changed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a project whose configuration sits in the checkout root is migrated, with its declaration replaced whole and nothing else written there`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a stored link path that spells a moved record in another letter case follows the record where the disk ignores case, and is left as written and named where it does not`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a group becomes an area unless its purpose is a finite outcome, which becomes an initiative of type initiative kept in the initiatives location`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a proposal becomes an initiative of type idea and stays where it is kept`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: an area takes its level from its purpose: product for a top-level area group, module for one nested in another or for a domain, feature for a capability, none without a purpose`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a level that would put an area under a deeper one is left unset and reported, so no area breaks the ordering`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a group listed by two groups sits under both, and its tasks count once in each and once in what holds both`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: an area is active unless it was canceled, an initiative takes the state its delivery state stood for, delivery work keeps its state, and history keeps the states it recorded`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: every record a group listed names that group itself afterwards, and no record keeps a list of members or a purpose`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a listing between a group that becomes an area and one that becomes an initiative is not kept: everything beneath the listed group gains the direct link, and the listing is reported`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a finite outcome that listed another keeps that link, and the work beneath the listed one is linked to it directly so it still counts what it counted`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: the project and every former group show the same figures before and after migration, each the tasks its list held`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: what the migration stores is exactly what the earlier project read as: kind, state and every tracker-owned value of every record, with only the paths of moved records differing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: migration creates and deletes no record and adds no history entry, revision or receipt: the same identities, each with the history it had`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a label declared for a group purpose becomes the label of the level or type that purpose became, and a label the current vocabulary has no place for is refused by name`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: the result of a run states the listings that were not kept, the nested listings and the levels left unset, as its preview did, also when the run was completed after an interruption`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-248: the stored read hands migration every record in the words it stores, whatever state the project is in`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-248: a record without tracking metadata can have its recorded state rewritten without gaining tracking metadata`
**Status:** Untested

### Edge and recovery outcomes

#### TC-TPT-249: Interrupted migration stays unavailable until explicit safe recovery [P0]

**Objective:** Keep partial migration from appearing current and preserve recovery choice.

**Business Intent / Invariant Guarded:** For ALL interrupted/failed supported migrations, no read/save/report is current until safe explicit continuation completes or whole restoration plus explicit abandonment exits.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-10, BR-TPT-20, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- a migration has stopped before completion with its original recovery source retained
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect and attempt save/report, then either resume under unchanged safe source or restore whole source and explicitly abandon.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a migration has stopped before completion with its original recovery source retained
When inspect and attempt save/report, then either resume under unchanged safe source or restore whole source and explicitly abandon
Then unfinished migration names recovery; safe continuation conserves task sets and completes; verified whole restoration plus explicit abandon exits
And external restoration alone never abandons, changed unsafe source refuses rerun, and incomplete restore refuses abandonment with named missing/remaining facts
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | unfinished migration names recovery; safe continuation conserves task sets and completes; verified whole restoration plus explicit abandon exits |
| System behavior | external restoration alone never abandons, changed unsafe source refuses rerun, and incomplete restore refuses abandonment with named missing/remaining facts |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ unfinished migration names recovery; safe continuation conserves task sets and completes; verified whole restoration plus explicit abandon exits
- ✅ external restoration alone never abandons, changed unsafe source refuses rerun, and incomplete restore refuses abandonment with named missing/remaining facts
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "every public unfinished/recovery outcome, whole/incomplete/external restoration and unchanged/changed source",
  "invariant": "For ALL interrupted/failed supported migrations, no read/save/report is current until safe explicit continuation completes or whole restoration plus explicit abandonment exits.",
  "boundaryCounterCase": "external restoration alone never abandons, changed unsafe source refuses rerun, and incomplete restore refuses abandonment with named missing/remaining facts"
}
```

**Edge Cases:**

- Every refusal preserves the previous report and current recovery/source facts.
- Unreadable/untrusted recovery evidence is not acted on as if valid.
- Private checkpoint/index/hash ordering stays technical evidence, not a new business case.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-249]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-057, AC-TPT-38, BR-TPT-10, BR-TPT-20, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-249]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-249: the shipped command abandons an unfinished migration only when asked to: asked, it ends with success once the earlier project is back whole and with a failing status before that, and unasked it never abandons`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a migration interrupted at any point blocks every read, save and preview, and one repeated run finishes with the uninterrupted result`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a group record that cannot be removed from its earlier location leaves its step unfinished with the cause named, and the repeated run resumes from it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a file that appears at a group record's new path after the check stops the move without replacing it, and the run finishes once it is gone`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a migration waits for the writer lock, so it never changes a record under another tracker writer`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a progress record that names other paths, groups or steps than this migration's own is never acted on`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a linked record location or a linked progress record is refused and never followed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an unfinished migration is abandoned by an explicit request alone: after a restore from version control and the stated steps that request removes only the progress record, and the project reads as the earlier vocabulary again with its original numbers`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: in every state a migration can stop in, an abandon request ends it exactly when the earlier project is back whole, and a run without that request completes it or stops and never abandons it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an abandon request for a project whose records are back but whose declaration is not, or the reverse, is refused, names exactly what is not back and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a run without an abandon request that finds an earlier group record back names how to complete the migration after all, and completes it once that is undone`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an earlier location that held no record, which version control cannot bring back, does not keep a restored project from being abandoned`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a progress record that cannot be read or was not written by this migration is never acted on: no repeated run and no abandon request is promised, and the way out is stated as done by hand`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an abandon request cannot be previewed, and where no migration is unfinished it reports nothing to abandon and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a failed verification states the same way out as an interruption`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a file someone else put in the way is not named for removal by the way out of the migration`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a repeated run completes from the recorded member index: a group whose listing group was already rewritten still gains its link`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a recount that finds a former group holding other tasks than its list held fails the migration, keeps the progress record and leaves the project unavailable`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: one group record written and still at its earlier path is what an interruption leaves and is completed; an earlier record back among those already moved is a restore from outside and is not`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a repeated run stops and changes nothing when a group that has not moved yet no longer holds the members or the purpose recorded before the first change, names both ways on, and finishes once they are put back`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-249: a status report requested while a migration is unfinished is refused with that reason, shows no work, and the report made before is kept`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-249: while a migration progress record exists every read, save and preview answers migration in progress`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A project whose migration is unfinished shows the named reason and its command, and no work, count, percentage or report [variant: migration-in-progress]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A page that showed a report and a comparison keeps no number, badge or report once its checkout has an unfinished migration [variant: readable-then-migrating]`
**Status:** Untested

#### TC-TPT-250: Name and exclude stray incompatible records without guessed credit [P1]

**Objective:** Keep a supported project honest when old work reappears.

**Business Intent / Invariant Guarded:** For ALL incompatible stray records in a supported project, identify the record and exclude unsupported credit without reinterpreting or changing it.

**Proves:** FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- a supported project contains otherwise valid current records and a stray older/first stamp or exclusive old location
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. inspect project/scope and compare admitted task identities with independently known supported work.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a supported project contains otherwise valid current records and a stray older/first stamp or exclusive old location
When inspect project/scope and compare admitted task identities with independently known supported work
Then the incompatible record and coverage cause are named; it earns no guessed delivery count
And no automatic migration, silent kind substitution or repair changes its bytes; incomplete scope stays qualified
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the incompatible record and coverage cause are named; it earns no guessed delivery count |
| System behavior | no automatic migration, silent kind substitution or repair changes its bytes; incomplete scope stays qualified |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the incompatible record and coverage cause are named; it earns no guessed delivery count
- ✅ no automatic migration, silent kind substitution or repair changes its bytes; incomplete scope stays qualified
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "stray earlier2/first1 stamps/locations in an otherwise supported source",
  "invariant": "For ALL incompatible stray records in a supported project, identify the record and exclude unsupported credit without reinterpreting or changing it.",
  "boundaryCounterCase": "no automatic migration, silent kind substitution or repair changes its bytes; incomplete scope stays qualified"
}
```

**Edge Cases:**

- A whole first1 project receives TC-TPT-326’s refusal.
- A mixed declaration conflict may make the entire source unavailable under TC-TPT-244.
- No arbitrary owner wins a duplicate identity.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-250]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-006, AC-TPT-37, BR-TPT-10, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-250]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-boundaries.test.cjs::TC-TPT-250: a current project owns five record locations, the area location included, and a file lying in an earlier or first-vocabulary location is named by its path and never read as work`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-250: a status report names each earlier-vocabulary record with where it was found and withholds the percentage`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-250: a record stamped with an earlier version inside a current location is named by its path and identity and is never read as current work`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-250: a record is flagged as earlier exactly when it carries the earlier mark or sits in an earlier-only location, so an unmarked record arriving in a location both vocabularies use is counted as what that location holds`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-250: an earlier-vocabulary record arriving in a current project is flagged, left out of every count and makes coverage incomplete`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-250: a file of the first vocabulary inside an earlier project is named and never counted, and the project's own records are still read in the current terms, locally and pinned`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A record still stored in the earlier vocabulary is named with where it was found, earns no count and leaves coverage incomplete [variant: earlier-record-flagged]`
**Status:** Untested

### Invariant / Property Tests

#### TC-TPT-251: Repeating a completed migration changes nothing [P1]

**Objective:** Make explicit completion repeat-safe without new delivery or history.

**Business Intent / Invariant Guarded:** For ALL completed current3 projects, repeating migration changes no source or task set and claims no second conversion.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-12, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- a supported2 migration completed successfully and current3 source/task sets are recorded
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. request migration again, then compare records/settings/history and task sets.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a supported2 migration completed successfully and current3 source/task sets are recorded
When request migration again, then compare records/settings/history and task sets
Then the result names already current/no change and task scope stays exact
And no new revision/history/receipt-derived delivery or repeated standing mutation is added
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | the result names already current/no change and task scope stays exact |
| System behavior | no new revision/history/receipt-derived delivery or repeated standing mutation is added |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ the result names already current/no change and task scope stays exact
- ✅ no new revision/history/receipt-derived delivery or repeated standing mutation is added
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "completed current3 migrations and fresh current3 projects",
  "invariant": "For ALL completed current3 projects, repeating migration changes no source or task set and claims no second conversion.",
  "boundaryCounterCase": "no new revision/history/receipt-derived delivery or repeated standing mutation is added"
}
```

**Edge Cases:**

- Empty current project remains empty.
- An unfinished migration is not mistaken for completed.
- A later stray old record is separately named/excluded rather than silently remigrated.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-251]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-057, AC-TPT-38, BR-TPT-12, BR-TPT-30, INV-TPT-08 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-251]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-251: repeating or previewing a finished migration reports nothing to migrate and changes nothing, however it finished and whatever was saved since`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-251: a project created in the current vocabulary has nothing to migrate`
**Status:** Untested

### UI / User journey flows

#### TC-TPT-252: New work uses one current kind vocabulary and its first state [P1]

**Objective:** Keep new current records and every reading surface consistent.

**Business Intent / Invariant Guarded:** For ALL admitted current3 capture requests, stored/exchanged kinds and owned defaults are current and each kind starts in its declared first state.

**Proves:** FR-TPT-001, FR-TPT-057, AC-TPT-01, BR-TPT-27, BR-TPT-30.

**Preconditions:**

- a complete current3 project permits capture and has exact authorized identity/scope
- The selected source, current records and expected scope are recorded before the action; permitted actor and independent controls are explicit.

**Real-World Reachability:** A contributor or stakeholder performs this action while maintaining or inspecting the selected working copy; a shared/pinned source uses that source’s own access and records.

**Demo Flow:**

1. Open the stated source and record its identity, current facts and permitted actor before acting.
2. capture initiative/task/story/subtask/area through an explicit surface and inspect the saved result in workspace/report/read operation.
3. Observe the actual saved/refused outcome and reread the owned record and relevant scope before the next dependent action; compare with the recorded facts.
4. Return to the selected scope with source/context retained. Repeat invalid variants from their exact recorded pre-state. Actor review provides normal pacing; no fixed delay establishes readiness.

```gherkin
Given a complete current3 project permits capture and has exact authorized identity/scope
When capture initiative/task/story/subtask/area through an explicit surface and inspect the saved result in workspace/report/read operation
Then initiative defaults idea/Draft, area starts Active, delivery kinds start Draft, and only tasks can later earn task credit
And retired project/vision kinds, group requests or older request versions refuse without fabricated records; display labels never alter exchanged kinds
```

**Expected Result:**

| Dimension | Expectation |
|---|---|
| UI | initiative defaults idea/Draft, area starts Active, delivery kinds start Draft, and only tasks can later earn task credit |
| System behavior | retired project/vision kinds, group requests or older request versions refuse without fabricated records; display labels never alter exchanged kinds |
| Business data state | Prior authored content, identity, unrelated records, proof and history remain unchanged except the exact permitted owned outcome. |
| Data shown on UI | Exact selected identity/source/scope, current kind/state and named outcome; no unsupported count, authority or saved claim. |

**Acceptance Criteria:**

- ✅ initiative defaults idea/Draft, area starts Active, delivery kinds start Draft, and only tasks can later earn task credit
- ✅ retired project/vision kinds, group requests or older request versions refuse without fabricated records; display labels never alter exchanged kinds
- ❌ Any unrequested change, invented credit, hidden refusal or claimed success without the specified observed outcome fails the case.

**Test Data:**

```json
{
  "inputDomain": "five current kinds, explicit surfaces, allowed initial owned values/tags and invalid retired kinds",
  "invariant": "For ALL admitted current3 capture requests, stored/exchanged kinds and owned defaults are current and each kind starts in its declared first state.",
  "boundaryCounterCase": "retired project/vision kinds, group requests or older request versions refuse without fabricated records; display labels never alter exchanged kinds"
}
```

**Edge Cases:**

- Initial tags live only on the new owner; targets unchanged.
- Area form excludes deadline and initiative-only fields.
- Existing authored custom content is preserved during supported adoption.

**Transition Invariants:** N/A — no lifecycle transition is requested.

**Evidence:** [Source: test/work-tracking/TC-TPT-252]

**Related Behaviors:**

| Capability | Anchor |
|---|---|
| Governing observable intent | FR-TPT-001, FR-TPT-057, AC-TPT-01, BR-TPT-27, BR-TPT-30 |
| Executing primary guard | [Source: test/work-tracking/TC-TPT-252]; assertion-inspected source mapping, NOT RUN; universal implementation evidence remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-252: a status report lists exactly the eligible tasks of its scope and names every kind, state, level and type in the current words`, `.claude/hooks/tests/suites/task-tracking-store.test.cjs::TC-TPT-252: a new record's status is the first state of its own kind's lifecycle: delivery work and an initiative start as draft, an area starts as active`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-252: new work is stored, located, identified and reported in the current vocabulary`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::New work is named in the current words in capture choices, lists, detail, the board and the status report [variant: new-work-current-words]`
**Status:** Untested
