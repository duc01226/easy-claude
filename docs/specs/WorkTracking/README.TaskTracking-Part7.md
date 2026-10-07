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
continuation: 7
---

> **DRAFT — inherits the governing spec's provisional contract evidence. Case guards are mapped to authored tests; all cases remain Untested.**

# Work tracking case continuation 7

## Related Documentation

- Read `README.TaskTracking.md` §§1–7 for governing intent, in particular BR-TPT-30, FR-TPT-056/057, AC-TPT-37/38 and INV-TPT-08, and the glossary entries for the current vocabulary, the earlier vocabulary, the vocabulary declaration and vocabulary migration.
- This continues the same canonical registry and owns eleven new stable case bodies, TC-TPT-242 to TC-TPT-252. Earlier case bodies and their evidence remain conserved in the main owner and Parts2–6.
- These cases use the current vocabulary: task is the delivery item counted toward progress, subtask is supporting work, initiative is captured intent, a project group is a finite group, program is a group purpose and Planned is a lifecycle label. Where a case names an earlier word it says so; the main owner and Parts2–6 use the same current words.
- The decision and its rejected alternatives are recorded in `docs/adr/0005-work-tracker-vocabulary-and-migration.md`.
- Existing preservation, exact-scope, retry, deletion and permission cases remain governing. One business case may require multiple executing tests.

## 8. Test Specifications

### Test summary

| Priority | Untested | Executed |
| -------- | -------: | -------: |
| P0       |        7 |        0 |
| P1       |        4 |        0 |
| Total    |       11 |        0 |

### Preservation Tests

#### TC-TPT-242: Read an earlier-vocabulary project in the current words with unchanged progress [P0]

**Objective:** Verify that a project still storing the earlier vocabulary is read in the current vocabulary with the same progress it had before.

**Business Intent / Invariant Guarded:** BR-TPT-30 and INV-TPT-08: for ALL projects stored in the earlier vocabulary, changing the words shown never changes which work counts, what is accepted or what remains.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-28, INV-TPT-08.

**Preconditions:**

- A project stores its records in the earlier vocabulary: an accepted delivery item P1, a remaining delivery item P2 in the earlier Backlog state, one supporting task K under P2, one idea D linked from P1, one story S under P1, and one epic E with the earlier initiative purpose whose members are P1 and P2.
- Its progress before the vocabulary change is recorded: total 2, accepted 1, remaining 1, eligible delivery identities P1 and P2.

**Real-World Reachability:** A team created this work with the release before the vocabulary change and shared it through its normal process. A contributor later updates the tracker and opens the same project on another day; no one has run migration.

**Demo Flow:** Open the project in the workspace, read Overview, Work and the group, then open the status report. Compare every shown number and identity with the recorded values, then compare the stored records with their recorded content.

```gherkin
Given a project whose stored records use the earlier vocabulary and whose progress is recorded
When a contributor inspects it in the workspace and in the status report
Then P1 and P2 are shown as tasks, K as a subtask, D as an initiative, S as a story and E as a project group with the program purpose
And P2 is shown as Planned and the link from P1 to D is shown as an initiative link
And total, accepted, remaining and the eligible delivery identities equal the recorded values
And no stored record or project setting has changed
```

**Expected Result:**

| Dimension           | Expectation                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| UI                  | Workspace and status report show only current words, with a visible notice that the project is read-only until migration. |
| System behavior     | Reads succeed at project and group scope; nothing is saved, moved or converted by reading.                                |
| Business data state | Every record keeps its recorded content, identity and location; the project still stores the earlier vocabulary.          |
| Data shown on UI    | Total 2, accepted 1, remaining 1; eligible delivery identities P1 and P2; K, D and S earn no delivery credit.             |

**Acceptance Criteria:**

- ✅ Every kind, state, group purpose and link relation is shown in the current vocabulary and all four progress values equal the recorded ones.
- ❌ A supporting task counted as delivery, a delivery item missing from the count, an earlier word on screen or any changed stored record fails this case.

**Test Data:**

```json
{
    "inputDomain": "any fully inspectable project stored in the earlier vocabulary, with any mix of delivery items, supporting tasks, ideas, stories, epics, visions, states, purposes and links; declared as earlier, or undeclared and recognised from an earlier-only record location",
    "invariant": "for ALL such projects, the identities shown as tasks equal the earlier delivery items, and total, accepted, remaining and eligible delivery identities equal the values before the vocabulary change",
    "boundaryCounterCase": "an undeclared project holding only the earlier supporting-work location cannot be recognised as earlier; with the explicit declaration added it reads its records as subtasks with no delivery credit"
}
```

**Edge Cases:**

- Empty earlier-vocabulary project → shown as no tracked work, read-only, with no percentage.
- A shared baseline selected from before the migration → read in current words with that baseline's own numbers.
- Custom display label for the earlier initiative purpose → the same text is shown for the program purpose.
- Story and vision records, the sprint field and story-point wording → shown exactly as before.

**Transition Invariants:** N/A — reading performs no lifecycle transition. The Planned label names the same state the earlier vocabulary called Backlog; allowed transitions are unchanged.

**Evidence:** [Source: test/work-tracking/TC-TPT-242]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-28, INV-TPT-08                                                                          |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-242]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::An earlier-vocabulary project is shown in the current words with its recorded numbers and a read-only notice, in the workspace and in its report [variant: earlier-project-current-words]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A read that carries no vocabulary is refused whole, when the page opens and after a later read, and the draft returns once the workspace answers in full [variant: read-without-vocabulary]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-242: the status report of an earlier-vocabulary project shows current words and the recorded numbers under a read-only notice, and changes no record`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: an earlier-vocabulary project reads in the current words with the progress it had and nothing is written`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: a pinned read uses the pinned commit's own vocabulary and reports the numbers that commit had`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: an undeclared project is recognised by an earlier-only location and reads the same numbers locally and pinned`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: only the shared supporting-work location cannot show the earlier vocabulary until the project declares it`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-242: a location spelled in another letter case is recognised exactly when the disk reads it as the same location`
**Status:** Untested

### Refusal outcomes for earlier and mixed vocabularies

#### TC-TPT-243: Refuse every save and skip automatic upkeep until migration [P0]

**Objective:** Verify that nothing is written to a project that still stores the earlier vocabulary.

**Business Intent / Invariant Guarded:** BR-TPT-30: an earlier-vocabulary project is never changed in either vocabulary before its explicit migration, so its records cannot end up half in one and half in the other.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-02, BR-TPT-14.

**Preconditions:**

- The earlier-vocabulary project from TC-TPT-242 is open with writing enabled for an eligible contributor. Its records and progress are recorded.
- Linked upkeep is enabled and one item is linked to the contributor's current work.

**Real-World Reachability:** The contributor opens the project after updating the tracker, reads it, and then tries their usual actions during a working session. A work checkpoint occurs later in the same session.

**Demo Flow:** Try each kind of save in turn through the workspace and through an assistant request, read the outcome, then reach a work checkpoint and read the upkeep outcome. Finally reread the project and compare it with the recorded content.

```gherkin
Given an earlier-vocabulary project open for an eligible contributor
When the contributor tries to capture, edit, assign, group, link, change lifecycle state, accept, attest health or delete
Then each attempt is refused as migration required and names migration as the next step
And when a work checkpoint occurs automatic upkeep is skipped with the same reason and the primary work continues
And rereading shows every record, the progress and the project setting unchanged
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | Each save shows "Migration required"; the draft is retained; the project stays marked read-only.                                                    |
| System behavior     | Every save path refuses before changing anything; automatic upkeep reports skipped, never saved; inspection and the status report remain available. |
| Business data state | No record, history entry, receipt or project setting is added or changed.                                                                           |
| Data shown on UI    | The same items, states, owners and progress as before the attempts.                                                                                 |

**Acceptance Criteria:**

- ✅ Every save operation and every automatic upkeep attempt ends as migration required or skipped with nothing changed.
- ❌ Any saved field, new record, new history entry, or a claimed saved result fails this case.

**Test Data:**

```json
{
    "inputDomain": "every supported save operation, through the workspace and through an assistant request, plus automatic upkeep at a checkpoint, on any earlier-vocabulary project",
    "invariant": "for ALL of them the outcome is a migration-required refusal or a skip, and stored content is identical before and after",
    "boundaryCounterCase": "the same save on the same project after migration (TC-TPT-248) succeeds normally"
}
```

**Edge Cases:**

- A retry of a save that completed before the tracker was updated → refused as migration required; no second change.
- Read-only opening → the same reads, with no save offered.
- Upkeep switched off or observe-only → stays silent or advisory as before; no migration prompt is forced.

**Transition Invariants:** For ALL lifecycle requests on an earlier-vocabulary project → refused as migration required with the prior state, history and acceptance unchanged.

**Evidence:** [Source: test/work-tracking/TC-TPT-243]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-02, BR-TPT-14                                                                           |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-243]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A save sent to a project that stores the earlier vocabulary is refused as migration required, keeps the draft and changes nothing [variant: save-refused-until-migration]`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: every save operation and its preview on an earlier-vocabulary project is refused as migration required and changes nothing`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: an automatic checkpoint on an earlier-vocabulary project is skipped with the same reason and the primary result is kept`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-243: the save an earlier-vocabulary project refuses succeeds on a project stored in the current vocabulary`
**Status:** Untested

#### TC-TPT-244: Refuse a project holding both vocabularies rather than count it [P0]

**Objective:** Verify that a project whose vocabulary cannot be settled is refused, not counted.

**Business Intent / Invariant Guarded:** BR-TPT-30: progress is never computed from a guess about which vocabulary a record uses, because the same word names a delivery item in one and supporting work in the other.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-10.

**Preconditions:**

- An undeclared project holds an earlier-only record location with one delivery item and a current-only record location with one subtask.
- A second project is declared as earlier and also holds a current-only record location with one project group.

**Real-World Reachability:** Two contributors work on separate copies. One copy is migrated; the other still receives new earlier-vocabulary work. The copies are combined through the team's normal sharing process without the declaration, and a coordinator opens the result.

**Deliberate Impossible State:** Migration never produces this state. It arises from combining a migrated copy with an unmigrated one, or from copying records by hand. The case proves the fail-safe: no count is shown.

**Demo Flow:** Open the combined project, request project status, then try a save and a migration preview. Read each outcome and confirm the records are unchanged.

```gherkin
Given an undeclared project holding record locations from both vocabularies, or a project declared as earlier that holds a current-only location
When a coordinator opens it, requests status, tries a save or previews migration
Then opening, status and the save are each refused as mixed vocabularies and name the locations found from each
And a status report requested for it is refused with the same reason and the report made before is kept
And the migration preview is refused, naming the destination already present first and mixed vocabularies second
And no total, accepted, remaining or percentage is shown
And no record is moved, changed or counted
```

**Expected Result:**

| Dimension           | Expectation                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| UI                  | "Mixed vocabularies" with the locations found; no progress figures.                                  |
| System behavior     | Reads, saves, a status report request and migration refuse; the tracker neither chooses a vocabulary nor repairs the project, and a report made before is left as it was. |
| Business data state | All records unchanged.                                                                               |
| Data shown on UI    | The reason and the locations involved only.                                                          |

**Acceptance Criteria:**

- ✅ The project is refused with a named reason and no progress number.
- ❌ Any count, any percentage, a silently chosen vocabulary or any changed record fails this case.

**Test Data:**

```json
{
    "undeclaredProject": {
        "earlierOnlyLocations": ["delivery items: 1 record"],
        "currentOnlyLocations": ["subtasks: 1 record"]
    },
    "declaredEarlierProject": {
        "currentOnlyLocations": ["project groups: 1 record"]
    },
    "expected": "Mixed vocabularies; nothing counted; nothing changed"
}
```

**Edge Cases:**

- Either family's location present but empty → still mixed; refused.
- A project declared as earlier that holds a current-only location → refused as mixed; the declaration does not turn that location into an earlier one.
- The location name shared by both vocabularies present beside an earlier-only location → recognised as earlier, not mixed.
- A project declared as current that later receives an earlier-vocabulary record → governed by TC-TPT-250, not by this case.
- A status report requested for the project → refused as mixed vocabularies, with the reason the project itself gives; no report describing an unreadable project replaces the one made before.
- A readable shared baseline compared with a working copy that holds both vocabularies → shown as "Not compared" with that reason; no difference, count or sharing hint is shown.

**Transition Invariants:** N/A — nothing is read as current work, so no transition is offered.

**Evidence:** [Source: test/work-tracking/TC-TPT-244]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-10                                                                                      |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-244]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A project holding record locations of both vocabularies shows the named reason and no work, count, percentage or report [variant: mixed-vocabularies]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::Comparing a readable pinned ref with a checkout that holds both vocabularies names that reason and shows no difference, count or sharing hint [variant: comparison-unreadable-checkout]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-244: a status report requested for a project holding both vocabularies is refused with that reason, shows no work, and the report made before is kept`, `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-244: the shipped report command refuses a project that holds both vocabularies or an unfinished migration with that project's own reason`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: an undeclared project holding locations of both vocabularies is refused as mixed and nothing is counted`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: a project declared as earlier that holds a current-only location is refused as mixed, locally and pinned`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-244: one rule settles a project's vocabulary from its declaration, its locations and a migration progress record`
**Status:** Untested

#### TC-TPT-245: Refuse a save request written for the earlier vocabulary [P0]

**Objective:** Verify that a request phrased in the earlier vocabulary is refused and never carried out under the current meaning.

**Business Intent / Invariant Guarded:** BR-TPT-30: a request for a "task" written for the earlier vocabulary asked for supporting work; carrying it out now would create a delivery item and inflate the denominator.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-01.

**Preconditions:**

- A project in the current vocabulary with one task T and recorded progress total 1, accepted 0, remaining 1.
- An assistant procedure that was not updated still produces save requests written for the earlier vocabulary.

**Real-World Reachability:** A team updates the tracker but keeps an older copy of an assistant procedure. Days later a contributor asks that assistant to add supporting work under T.

**Demo Flow:** Ask the out-of-date assistant to add the supporting work, read the outcome, reread the project, then repeat the request through the current procedure.

```gherkin
Given a current-vocabulary project and a save request written for the earlier vocabulary asking for a task under T
When the request is submitted
Then it is refused as written for the earlier vocabulary and nothing is created
And the total stays 1
And the same intent submitted in the current vocabulary creates one subtask and the total still stays 1
```

**Expected Result:**

| Dimension           | Expectation                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| UI                  | "Request uses the earlier vocabulary", with the advice to update the procedure that produced it. |
| System behavior     | Refuses before any change; never maps the request to a current kind.                             |
| Business data state | No record created; T unchanged.                                                                  |
| Data shown on UI    | Total 1 before and after the refused request.                                                    |

**Acceptance Criteria:**

- ✅ The earlier-vocabulary request is refused with nothing saved.
- ❌ A created task, a created subtask from the earlier request, or a changed total fails this case.

**Test Data:**

```json
{
    "inputDomain": "any save request written for the earlier vocabulary, whatever kind, state, purpose or link relation it names, on any project",
    "invariant": "for ALL such requests nothing is saved and nothing is reinterpreted",
    "boundaryCounterCase": "the same intent written for the current vocabulary on a current-vocabulary project saves normally"
}
```

**Edge Cases:**

- An earlier-vocabulary request that names only unchanged words, such as a story edit → still refused; the request as a whole is out of date.
- The same request on an earlier-vocabulary project → refused with nothing saved; this case does not fix which of the two refusal reasons is shown first.
- A retry of the refused request with its original identity → the same refusal, no change.

**Transition Invariants:** For ALL lifecycle requests written for the earlier vocabulary → refused with the prior state unchanged, including a request naming the earlier Backlog state.

**Evidence:** [Source: test/work-tracking/TC-TPT-245]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-01                                                                                      |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-245]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-245: a save request written for the earlier vocabulary is refused whole and never carried out under the current meaning`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-245: a checkpoint request retained from before the vocabulary change is never replayed`
**Status:** Untested

#### TC-TPT-246: Refuse migration when a precondition fails [P0]

**Objective:** Verify that migration starts only on a project it can migrate completely, and otherwise changes nothing.

**Business Intent / Invariant Guarded:** BR-TPT-30: a migration that cannot finish safely must not begin, so no project is left partly moved because of something knowable in advance.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02, BR-TPT-19.

**Preconditions:**

- Separate projects, each recorded before the attempt. Project (a) is already in the current vocabulary. Each of the others stores the earlier vocabulary and fails one precondition:
    - (b) it uses a native record profile, not the portable one;
    - (c) a record location, or the place where the migration progress record is kept, is a link to somewhere else;
    - (d) one record file cannot be read as stored, or one record is already in the current form;
    - (e) a deletion's recovery is unfinished;
    - (f) a destination name for the current vocabulary is already taken, compared without regard to letter case;
    - (g) the project is under version control and its record root holds an uncommitted or untracked file, or the project configuration that migration will rewrite holds an uncommitted change;
    - (h) rewriting one record would alter its authored content;
    - (i) a migration progress record is already present when a preview is requested; only the preview is refused, and running migration completes the unfinished one (TC-TPT-249);
    - (j) the project is under version control, and version control cannot say whether the record root is clean: it does not answer in time, lists more changes than can be inspected, cannot be started or reports a failure.
- Inspection is complete when every record file can be read as stored. A finding about what a readable record means, such as a link that no longer resolves, is not a failed precondition.

**Real-World Reachability:** A coordinator runs migration on each project during an upgrade. Project (e) had a deletion interrupted the previous day; project (f) had a location created by hand; project (g) holds a teammate's unsaved edits.

**Demo Flow:** For each project, run the migration preview and then the migration itself. Read the outcome and compare the project with its recorded content.

```gherkin
Given a project that fails one or more migration preconditions
When the coordinator previews and then runs migration
Then both are refused and name every unmet precondition, not only the first
And no location is moved, no record is rewritten and the project's vocabulary declaration is unchanged
And the project reads exactly as it did before the attempt
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI                  | (a) "Nothing to migrate"; (b) "Migration supports the portable record profile only"; (c) "Linked or escaping record locations are unsupported" with the location; (d) "Inspection incomplete" with the record; (e) "Deletion recovery unfinished" with the recovery and how to settle it; (f) "Destination already present" with the name; (g) "Record root has uncommitted changes" with the files, and "Project configuration has uncommitted changes" with the configuration when that is what differs; (h) "Record cannot be rewritten safely" with the record; (i) "Migration in progress"; (j) a reason worded by its cause, with what resolves it. |
| System behavior     | Refuses before the first change; lists every unmet precondition together; leaves no migration progress record behind.                                                                                                                                                                                                                                                                                                                                                                      |
| Business data state | Every record, location and setting identical to the recorded content.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Data shown on UI    | Project (a) reads normally; (i) stays unavailable as migration in progress; the others read exactly as before the attempt, with their prior limits.                                                                                                                                                                                                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Each failing precondition yields its own named refusal, several failing at once are all listed, and nothing changes.
- ❌ A partial move, a rewritten record, a changed declaration or a later "migration in progress" outcome fails this case.

**Test Data:**

```json
{
    "refusals": [
        { "project": "already current", "reason": "Nothing to migrate" },
        { "project": "native record profile", "reason": "Migration supports the portable record profile only" },
        { "project": "linked record location", "reason": "Linked or escaping record locations are unsupported" },
        { "project": "one unreadable record, or one record already in the current form", "reason": "Inspection incomplete" },
        { "project": "unfinished deletion recovery", "reason": "Deletion recovery unfinished" },
        { "project": "destination name taken, in any letter case", "reason": "Destination already present" },
        { "project": "uncommitted or untracked file in the record root, under version control", "reason": "Record root has uncommitted changes" },
        { "project": "uncommitted change to the project configuration that migration will rewrite, under version control", "reason": "Project configuration has uncommitted changes" },
        { "project": "version control cannot say whether the record root is clean", "reason": "worded by cause: no answer in time, too many changes to inspect, cannot be started, or reports a failure; each with what resolves it" },
        { "project": "a rewrite would alter authored content", "reason": "Record cannot be rewritten safely" },
        { "project": "progress record present, preview requested", "reason": "Migration in progress" }
    ],
    "expectedChange": "none"
}
```

**Edge Cases:**

- Two preconditions fail at once → every unmet precondition is named; nothing changes. A native record profile or a linked location is named by itself, because the remaining checks need records that can be read safely.
- A failing precondition is resolved, for example the unreadable record is repaired or removed → the next migration attempt proceeds (TC-TPT-248).
- An unfinished deletion recovery → this release cannot finish it, because every save on an earlier-vocabulary project is refused. The person finishes that deletion with the release that started it, or removes the recovery once the record's fate is confirmed; then migration proceeds. A deletion whose recovery already completed is no obstacle.
- A destination name that is taken and also makes the project hold both vocabularies → named as destination already present first and as mixed vocabularies second (TC-TPT-244).
- A destination location that exists but is empty, or a destination name taken by something that is not a record location → still refused.
- A project outside version control → not refused for that; the preview states that nothing there can restore the earlier records.
- A record root, or one location in it, that version control ignores → not refused and not called protected: the preview names what is ignored with a note that version control cannot restore it, so the person keeps their own copy first.
- Version control cannot say whether the record root is clean → refused with the cause and what resolves it; once it answers, the same request proceeds.
- A project kept below the top of a larger working copy → its uncommitted record files and configuration are each named for what they are, by their place in the project.
- An uncommitted file outside the record root → not a failed precondition, unless it is the project configuration that migration will rewrite. An uncommitted change to a configuration that migration will not rewrite, as in a project with no declaration, is no obstacle.

**Transition Invariants:** N/A — a refused migration changes no lifecycle state or history.

**Evidence:** [Source: test/work-tracking/TC-TPT-246]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02, BR-TPT-19                                                                           |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-246]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: migration and its preview refuse each unmet precondition by name, change nothing and leave no progress record`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a record root with uncommitted or untracked files is refused in a Git checkout, and a project outside version control is told it has no restore point`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: an uncommitted change to the project configuration that will be rewritten is refused by name`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: an uncommitted change to a project configuration the migration will not rewrite is not its concern`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: when Git cannot say whether the record root is clean the migration is refused with the cause and what resolves it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a record root that Git ignores is previewed with a note that version control cannot restore it, and is not called protected`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-246: a project in a sub-folder of a larger Git checkout has its uncommitted configuration and records named as the project itself names them`
**Status:** Untested

### Migration outcomes

#### TC-TPT-247: Preview migration without changing anything [P1]

**Objective:** Verify that a coordinator can see exactly what migration would do before choosing to run it.

**Business Intent / Invariant Guarded:** BR-TPT-30 and BR-TPT-02: migration is never implicit; a person sees its full extent first, and looking changes nothing.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02.

**Preconditions:**

- The earlier-vocabulary project from TC-TPT-242, fully inspectable, with no unfinished deletion recovery and no destination location present. Its content is recorded.

**Real-World Reachability:** After reading the migration-required notice, the coordinator asks for a preview before deciding when to migrate.

**Demo Flow:** Request the preview, read it, request it again, then reread the project and try a save.

```gherkin
Given a migratable earlier-vocabulary project
When the coordinator previews migration twice
Then each preview lists every location that would move, in order, with its record count
And lists per record which tracker-owned values would change and states that authored content and identities stay
And shows the progress values that must be equal afterwards
And names any work whose currently verified standing would change: verification that goes stale, work that leaves the ready list and work newly held by a prerequisite that is no longer verified
And the project is unchanged, still earlier vocabulary and still read-only
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | A preview naming the moves in their fixed order, the counts per kind, the values to be rewritten and total 2, accepted 1, remaining 1. |
| System behavior     | Preview performs the same precondition checks as migration and saves nothing; two previews of an unchanged project are identical.      |
| Business data state | Identical to the recorded content; no migration progress record exists.                                                                |
| Data shown on UI    | After the preview the project reads as in TC-TPT-242 and a save is still refused as migration required.                                |

**Acceptance Criteria:**

- ✅ The preview is complete, repeatable and leaves the project unchanged.
- ❌ Any moved location, rewritten value, changed declaration or blocked read after a preview fails this case.

**Test Data:**

```json
{
    "expectedPreview": {
        "movesInOrder": ["supporting work to subtasks", "delivery items to tasks", "ideas to initiatives", "epics to project groups"],
        "recordsByCurrentKind": { "task": 2, "subtask": 1, "initiative": 1, "project group": 1, "story": 1 },
        "progressToConserve": { "total": 2, "accepted": 1, "remaining": 1, "eligible": ["P1", "P2"] }
    },
    "expectedChange": "none"
}
```

**Edge Cases:**

- Empty earlier-vocabulary project → the preview lists no records and only the declaration change.
- A project with no declaration, recognised as earlier from its locations → the preview lists no declaration change.
- A record changes between preview and run → the run works from current content and its own captured values, not from the earlier preview.
- A project that fails a precondition → the preview shows the refusal of TC-TPT-246.
- Work whose proof points at a record that will move or be rewritten → named in the preview as needing verification again, before anything changes; the preview alters no proof and the delivery values it promises to conserve are unaffected.
- A stored link path that differs from a moved location only in letter case → the preview says whether the storage ignores letter case and, where it does not, lists the path as one that will be left as written (TC-TPT-248).
- A record root that version control ignores → the preview carries the note described in TC-TPT-246.

**Transition Invariants:** N/A — preview performs no transition.

**Evidence:** [Source: test/work-tracking/TC-TPT-247]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02                                                                                      |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-247]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-247: the shipped command lists migrate, previews it without changing anything and accepts the preview and abandon flags for migrate alone, never both`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-247: a preview lists the moves in order, the owned values that would change and the progress to conserve, twice alike, and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-247: the preview of an earlier project with no records lists only the declaration change, and of an unconfigured project no declaration change`
**Status:** Untested

#### TC-TPT-248: Migrate only tracker-owned vocabulary values and conserve content and progress [P0]

**Objective:** Verify that migration changes exactly the stored vocabulary and nothing a person wrote, and ends with the same progress.

**Business Intent / Invariant Guarded:** BR-TPT-30 and INV-TPT-08: for ALL migratable projects, migration conserves every authored byte, every identity and the total, accepted, remaining and eligible delivery identities.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02, INV-TPT-08.

**Preconditions:**

- The earlier-vocabulary project from TC-TPT-242. P1 has history that passed through the earlier Backlog state and a receipt from an earlier save. Each record's authored body, title, intent, reasons, identity, record name, members, actors, times and revision are recorded, as are the progress values.

**Real-World Reachability:** The coordinator has read the preview (TC-TPT-247) and runs migration when the team is not mid-change. Contributors resume work afterwards.

**Demo Flow:** Run migration, read its result, then reread the project in the workspace and status report. Compare each record with its recorded content, then save one change.

```gherkin
Given a migratable earlier-vocabulary project with recorded content and progress
When the coordinator explicitly runs migration
Then the result reports the moves in their fixed order and that progress equals the values captured before it started
And the result names any work whose currently verified standing changed, and no proof is altered
And P1 and P2 are tasks, K is a subtask, D is an initiative, E is a project group with the program purpose and S stays a story under P1
And every stored state that was Backlog, current or historical, is Planned, and the link from P1 to D is an initiative link that still resolves
And every authored body, title, intent, reason, identity, record name, member, actor, time and revision equals its recorded value
And no stored value uses an earlier word, and a normal save now succeeds
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | "Migration complete" with the moves and the equal progress values; the read-only notice is gone.                                                                                                                                                                                                        |
| System behavior     | Moves supporting work first, then delivery items into the freed name, then the remaining kinds; rewrites kind, current and historical states, group purpose, link relation, links into moved locations and receipt kind and location; marks each record migrated; declares the current vocabulary last. |
| Business data state | Same identities and record names; same authored content byte for byte; the project now stores the current vocabulary only.                                                                                                                                                                              |
| Data shown on UI    | Total 2, accepted 1, remaining 1; eligible delivery identities P1 and P2; history shows Planned where it showed Backlog, with the original actors and times.                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Only tracker-owned vocabulary values differ from the recorded content, and all four progress values are equal.
- ❌ A changed authored byte, identity, record name, member, actor, time or revision; a remaining earlier word in stored values; a broken link; or a different progress value fails this case.

**Test Data:**

```json
{
    "inputDomain": "any migratable earlier-vocabulary project: any number of records of every kind, any states and histories, any purposes, links, receipts, authored bodies and custom content",
    "invariant": "for ALL of them, after migration the set of identities and all authored content are unchanged, only tracker-owned vocabulary values differ, and total, accepted, remaining and eligible delivery identities equal the values captured before it started",
    "boundaryCounterCase": "a project failing any precondition is refused with nothing changed (TC-TPT-246)"
}
```

**Edge Cases:**

- An authored body that itself contains earlier words, such as a sentence about a "backlog" → left exactly as written.
- A reason or title containing an earlier word → unchanged.
- A record with no stored kind → takes the current kind of its new location.
- A custom display label for the earlier initiative purpose → kept as the label for the program purpose.
- A project with no declaration, recognised as earlier from its locations → migrated without gaining a declaration or being enrolled; afterwards it is recognised as current from its locations.
- Currently verified work → not conserved, because a proof names the location and content of the record it was checked against. The preview and the result name each item whose verification goes stale, each item that leaves the ready list and each item newly held by a prerequisite that is no longer verified. No proof is altered; a person records a new observation for each named item, and an item named this way cannot be accepted on its earlier observation. Total, accepted, remaining and the eligible delivery identities are the conserved values.
- Work whose proof points only at content that neither moves nor is rewritten → stays currently verified and is not named.
- A stored link path that spells a moved location in another letter case → follows the location where the storage ignores letter case; where it does not, it names another location, is left exactly as written and is listed in the preview and the result for correction by hand.
- A project configuration kept at the top of the working copy rather than in a folder → migrated the same way: its declaration is replaced and nothing else is written there.
- A record stored with another line-ending style or a leading byte-order mark → both are kept and no other byte changes.
- Returning to the earlier vocabulary → only by restoring the record locations and the project configuration through version control or the person's own backup; the tracker offers no reverse action.

**Transition Invariants:** For ALL records → the current state and every historical state keep their meaning; only the Backlog label becomes Planned. No transition, acceptance, history entry or revision is added by migration.

**Evidence:** [Source: test/work-tracking/TC-TPT-248]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-02, INV-TPT-08                                                                          |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-248]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-248: the shipped command migrates only when asked without the preview flag and ends with a failing status whenever the migration did not finish`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: migration moves the locations in order, rewrites only tracker-owned vocabulary values and conserves every authored byte, identity, name and progress value`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: an unconfigured earlier project is migrated without being enrolled and then reads as current by its locations`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a rewrite that would alter authored content is refused before any location moves`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a result whose progress differs from the values captured before the first change is reported as failed and its progress record is kept`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: the preview and the result name the work that stops being currently verified, leaves the ready list or is newly held by an unverified prerequisite, and no proof is altered`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a record with Windows line endings and a byte-order mark is rewritten with both kept and no other byte changed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a project whose configuration sits in the checkout root is migrated, with its declaration replaced whole and nothing else written there`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-248: a stored link path that spells a moved folder in another letter case follows the folder where the disk ignores case, and is left as written and named where it does not`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-248: the stored read hands migration every record in the words it stores, whatever state the project is in`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-248: a record without tracking metadata can have its recorded state rewritten without gaining tracking metadata`
**Status:** Untested

### Edge and recovery outcomes

#### TC-TPT-249: Block reading and saving during an interrupted migration and complete it on a repeated run [P0]

**Objective:** Verify that a migration stopped partway never shows or accepts work from a half-moved project, and that running it again finishes it.

**Business Intent / Invariant Guarded:** BR-TPT-30 and BR-TPT-20: a partly migrated project has no trustworthy count; it is unavailable with a named reason until the same migration completes, and completion gives the same result as an uninterrupted run.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-20, INV-TPT-08.

**Preconditions:**

- The earlier-vocabulary project from TC-TPT-248 with recorded content and progress.
- A way to stop a running migration at a chosen point, as a lost session or a stopped machine would.

**Real-World Reachability:** The coordinator starts migration; the machine sleeps or the session ends before it finishes. The coordinator or a teammate returns later and opens the project.

**Deliberate Impossible State:** A partly moved project is not a state any completed action produces. It exists only after an interruption. The case proves the fail-safe (nothing is read or saved) and the repair (a repeated run completes).

**Demo Flow:** For each interruption point, start migration and stop it there. Open the workspace, request status, try a save and try a preview; read each outcome. Then run migration again and compare the result with the recorded content and with the result of TC-TPT-248.

```gherkin
Given a migration interrupted after the first location move, after the second, after each later move, partway through rewriting records, or just before the current vocabulary is declared
When anyone opens the workspace, requests status, inspects an item or tries any save
Then each is refused as migration in progress and no count or record is shown as current
And the interrupted migration's own outcome states the steps that abandon it instead of completing it
And a status report requested meanwhile is refused with the same reason and the report made before is kept
And when migration is run again it completes from where it stopped
And the finished project equals the result of an uninterrupted migration
And total, accepted, remaining and eligible delivery identities equal the values captured before the first run started
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | "Migration in progress" for every read and save, with running migration again as the next step; the interrupted migration's outcome also states the steps that abandon it; after the repeated run, "Migration complete". |
| System behavior     | No read returns partial work and no save is admitted while migration is unfinished; the repeated run neither repeats a finished step nor skips an unfinished one, never carries a project restored from outside further, and never abandons: only an explicit abandon request does. |
| Business data state | After completion: identical to the outcome of TC-TPT-248, with every authored byte conserved.                                                                     |
| Data shown on UI    | After completion: total 2, accepted 1, remaining 1; eligible delivery identities P1 and P2.                                                                       |

**Acceptance Criteria:**

- ✅ At every interruption point reads and saves are refused, and one repeated run reaches the same finished project.
- ❌ A count from a half-moved project, an admitted save, a record rewritten twice, a lost record, a differing progress value, a project restored from outside migrated further, a migration abandoned without an explicit abandon request, an abandon request honoured for a project that is not back whole, or an abandon that removes more than the progress record fails this case.

**Test Data:**

```json
{
    "inputDomain": "any migratable project and any interruption point: after each location move, between any two record rewrites, and before the final declaration; including a second interruption during the repeated run",
    "invariant": "for ALL interruption points, reads and saves are refused until completion, and the completed project equals the uninterrupted result with equal progress",
    "boundaryCounterCase": "a migration that was refused before starting (TC-TPT-246) leaves no in-progress state; the project reads normally as an earlier-vocabulary project"
}
```

**Edge Cases:**

- A second person runs migration while the first run is still working → no competing migration starts; one finished result.
- A migration preview requested while migration is unfinished → refused as migration in progress; it does not describe a second migration.
- Interruption during the repeated run → the next run completes it; the outcome is the same.
- Automatic upkeep during the unfinished migration → skipped with the in-progress reason; primary work continues.
- A status report requested while migration is unfinished → refused as migration in progress; the report made before is kept, and a page that showed a report and a comparison keeps no number, badge or report.
- Abandoning instead of completing → every interrupted or failed outcome states the steps in order: restore the record locations and the project configuration from version control or the person's own backup; remove the locations this migration created; in the location both vocabularies use, keep the restored earlier records and remove only what the migration moved in; then make an explicit abandon request. Running migration again is never stated as the way to abandon.
- An explicit abandon request on a project restored whole, in each state a migration can stop in (before any location moved, when the first location could not be moved, after a location moved and before that was recorded, partway through rewriting records, after the declaration was rewritten) → "Migration abandoned": only the progress record is removed, no location is touched, and the project reads as the earlier vocabulary again, read-only, with its original numbers. It can then be previewed and migrated afresh.
- An explicit abandon request on a project not restored whole, for example the records back with the declaration still current, the declaration back with the records not, or a created location or a moved record left behind → "Restore incomplete": it names exactly what is not back or still remains, changes nothing and keeps the progress record.
- An earlier location that held no record, which version control cannot bring back → not waited for; the abandon request succeeds without it, while a location that held a record is still waited for.
- Running migration again, without an abandon request, on a project restored from outside → never abandons, even when the project is back whole: "Restored from outside", nothing changed, with both ways on named: the abandon steps, and what to undo so that a further run completes the migration. Once that is undone the run completes. When a location the migration created is already gone, or the project is back whole, completing is not offered as removing what came back.
- Running migration again where nothing was restored, or before any location had moved → completes the migration; it never abandons it.
- A preview requested on a project restored whole → still refused as migration in progress, naming the explicit abandon request.
- An abandon request together with a preview → refused as invalid input with nothing changed. An abandon request where no migration is unfinished → "Nothing to abandon", nothing changed, and an earlier project is not migrated by it.
- A progress record that cannot be read or was not written by this migration → acted on by neither a repeated run nor an abandon request, before or after a restore; the outcome says so and that the person sets the record aside by hand once the project is restored.
- A location someone else put in the way before anything moved → not named for removal by the abandon steps.
- A migration whose finished result does not equal the captured progress → reported as failed with the progress record kept, the project unavailable and the same abandon steps.

**Transition Invariants:** For ALL records → no lifecycle transition, acceptance or history entry is added by interruption or completion; states rewritten before the interruption are not rewritten again.

**Evidence:** [Source: test/work-tracking/TC-TPT-249]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-20, INV-TPT-08                                                                          |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-249]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A project whose migration is unfinished shows the named reason and its command, and no work, count, percentage or report [variant: migration-in-progress]`, `.claude/skills/task-track/tests/workspace-browser.test.cjs::A page that showed a report and a comparison keeps no number, badge or report once its checkout has an unfinished migration [variant: readable-then-migrating]`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a migration interrupted at any point blocks every read, save and preview, and one repeated run finishes with the uninterrupted result`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a folder move that fails leaves its step unfinished with the cause named, and the repeated run resumes from it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a destination that appears after the check stops the move without merging into it, and the run finishes once it is gone`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a migration waits for the writer lock, so it never moves a location under another tracker writer`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: the progress record lives in the record root, holds steps, paths, counts and identities only, and one naming other paths is never acted on`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a linked record location or a linked progress record is refused and never followed`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an unfinished migration is abandoned by an explicit request alone: after a restore from version control and the stated steps that request removes only the progress record, and the project reads as the earlier vocabulary again with its original numbers`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: in every state a migration can stop in, an abandon request ends it exactly when the earlier project is back whole, and a run without that request completes it or stops and never abandons it`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an abandon request for a project whose records are back but whose declaration is not, or the reverse, is refused, names exactly what is not back and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a run without an abandon request that finds an earlier location back names how to complete the migration after all, and completes it once that is undone`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an earlier location that held no record, which version control cannot bring back, does not keep a restored project from being abandoned`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a progress record that cannot be read or was not written by this migration is never acted on: no repeated run and no abandon request is promised, and the way out is stated as done by hand`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: an abandon request cannot be previewed, and where no migration is unfinished it reports nothing to abandon and changes nothing`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a failed verification states the same way out as an interruption`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-249: a folder someone else put in the way is not named for removal by the way out of the migration`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-249: a status report requested while a migration is unfinished is refused with that reason, shows no work, and the report made before is kept`, `.claude/hooks/tests/suites/task-tracking-cli-access.test.cjs::TC-TPT-249: the shipped command abandons an unfinished migration only when asked to: asked, it ends with success once the earlier project is back whole and with a failing status before that, and unasked it never abandons`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-249: while a migration progress record exists every read, save and preview answers migration in progress`
**Status:** Untested

#### TC-TPT-250: Flag and exclude a record reintroduced in the earlier vocabulary [P1]

**Objective:** Verify that an earlier-vocabulary record arriving in a migrated project is made visible as a problem and earns no count.

**Business Intent / Invariant Guarded:** BR-TPT-30: in a migrated project, a record is counted only when it is known to use the current vocabulary; an older record sitting where tasks live could be supporting work and must not become delivery credit.

**Proves:** FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-10, BR-TPT-28.

**Preconditions:**

- The migrated project from TC-TPT-248: total 2, accepted 1, remaining 1.
- An older branch, cut before migration, holds a supporting task K2 and a delivery item P3, both written in the earlier vocabulary.

**Real-World Reachability:** A contributor who had not yet received the migration finishes work on the older branch a few days later and combines it with the migrated project through the team's normal sharing process. A coordinator then opens the project.

**Deliberate Impossible State:** The tracker never writes an earlier-vocabulary record into a migrated project. The state comes from combining histories outside the tracker. The case proves the fail-safe: the record is flagged, not counted.

**Demo Flow:** Open the combined project, read Overview and Work, open the status report, then try to edit a flagged record.

```gherkin
Given a migrated project that has received K2 where tasks are kept, carrying the earlier mark, and P3 in an earlier-only location
When a coordinator inspects the project and the status report
Then K2 and P3 are each flagged as an earlier-vocabulary record with identity and location
And neither is counted in total, accepted, remaining or the eligible delivery identities
And the view states that coverage is incomplete rather than presenting a complete percentage
And P1 and P2 read exactly as before
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | "Earlier-vocabulary record: not counted" for K2 and P3, with where each was found.                                                                  |
| System behavior     | The project stays readable; flagged records are excluded from every count and cannot be changed through the tracker; nothing is converted silently. |
| Business data state | K2, P3 and all migrated records unchanged.                                                                                                          |
| Data shown on UI    | Counted delivery identities remain P1 and P2, shown with the incomplete-coverage reason.                                                            |

**Acceptance Criteria:**

- ✅ Both records are flagged and excluded, and the migrated work is unaffected.
- ❌ K2 counted as a task, P3 counted, a complete percentage, a silent conversion or a hidden record fails this case.

**Test Data:**

```json
{
    "migratedProject": { "total": 2, "accepted": 1, "remaining": 1, "eligible": ["P1", "P2"] },
    "reintroduced": [
        { "record": "K2", "meaningWhenWritten": "supporting work", "arrivesAt": "the location now holding tasks", "mark": "earlier" },
        { "record": "P3", "meaningWhenWritten": "delivery item", "arrivesAt": "an earlier-only location" }
    ],
    "expected": { "flagged": ["K2", "P3"], "counted": ["P1", "P2"], "coverage": "incomplete" }
}
```

**Edge Cases:**

- A save aimed at a flagged record → refused with the same reason.
- The flagged record is corrected or removed through the team's own process → the next read counts normally and coverage is complete again.
- Running migration on this project → "Nothing to migrate"; migration does not adopt stray records.
- A record created by the current tracker after migration → carries the migrated mark and is never flagged.
- A file with no tracker metadata arriving where tasks are kept → carries no mark, is not flagged and is read as adoptable task work; the upgrade notes name this blind spot.

**Transition Invariants:** N/A — a flagged record offers no transition; migrated records keep their states.

**Evidence:** [Source: test/work-tracking/TC-TPT-250]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-056, AC-TPT-37, BR-TPT-30, BR-TPT-10, BR-TPT-28                                                                           |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-250]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::A record still stored in the earlier vocabulary is named with where it was found, earns no count and leaves coverage incomplete [variant: earlier-record-flagged]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-250: a status report names each earlier-vocabulary record with where it was found and withholds the percentage`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-250: an earlier-vocabulary record arriving in a current project is flagged, left out of every count and makes coverage incomplete`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-250: a record is flagged as earlier exactly when it carries the earlier mark or sits in an earlier-only location, so an unmarked record arriving in the shared tasks location of a declared-current project is counted as a task`
**Status:** Untested

### Invariant / Property Tests

#### TC-TPT-251: Repeating a finished migration changes nothing [P1]

**Objective:** Verify that migration is safe to run again on a project that is already migrated.

**Business Intent / Invariant Guarded:** BR-TPT-30: for ALL migrated projects, running migration any number of more times equals running it once.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, INV-TPT-08.

**Preconditions:**

- The migrated project from TC-TPT-248, with its full content recorded after migration.

**Real-World Reachability:** A second teammate, unsure whether the project was migrated, runs the preview and the migration again the next day.

**Demo Flow:** Preview migration, run it, run it once more, then reread the project and compare it with the recorded content.

```gherkin
Given a project whose migration has finished
When migration is previewed and then run two more times
Then each reports that there is nothing to migrate
And every record, location, history entry, revision and the vocabulary declaration equal the recorded content
And total, accepted, remaining and eligible delivery identities are unchanged
```

**Expected Result:**

| Dimension           | Expectation                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| UI                  | "Nothing to migrate" for the preview and for each run.                    |
| System behavior     | No move, rewrite, new mark, new history entry or in-progress state.       |
| Business data state | Byte-identical to the content recorded after the first migration.         |
| Data shown on UI    | Total 2, accepted 1, remaining 1; eligible delivery identities P1 and P2. |

**Acceptance Criteria:**

- ✅ Any number of repeated runs leaves the project identical.
- ❌ A second rewrite, a changed revision or time, a new history entry or a blocked read after a repeat fails this case.

**Test Data:**

```json
{
    "inputDomain": "any project whose migration finished, including one completed after an interruption (TC-TPT-249), and any number of repeated previews and runs",
    "invariant": "for ALL of them the stored content after N+1 runs equals the content after 1 run, and progress is unchanged",
    "boundaryCounterCase": "a project whose migration is unfinished is not 'already migrated': the repeated run completes it (TC-TPT-249)"
}
```

**Edge Cases:**

- A project created new in the current vocabulary → "Nothing to migrate".
- Work saved after migration, then migration repeated → the new work is untouched.

**Transition Invariants:** For ALL records → no state, history or acceptance changes on a repeated run.

**Evidence:** [Source: test/work-tracking/TC-TPT-251]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, INV-TPT-08                                                                                     |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-251]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-251: repeating or previewing a finished migration reports nothing to migrate and changes nothing, however it finished and whatever was saved since`, `.claude/hooks/tests/suites/task-tracking-migration.test.cjs::TC-TPT-251: a project created in the current vocabulary has nothing to migrate`
**Status:** Untested

### UI / User journey flows

#### TC-TPT-252: New work uses the current vocabulary wherever it is shown [P1]

**Objective:** Verify that work created in a new or migrated project is named in the current vocabulary in every view.

**Business Intent / Invariant Guarded:** BR-TPT-30: a person meets one vocabulary; the same work is never a task in one view and something else in another.

**Proves:** FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-27, BR-TPT-29.

**Preconditions:**

- Two projects: one created new, and the migrated project from TC-TPT-248 with existing identities P1 and P2.
- An eligible contributor with writing enabled.

**Real-World Reachability:** After migration the team continues normal work over the following days: capturing intent, refining it into tasks, adding supporting work and grouping.

**Demo Flow:** In each project, capture an initiative, create a task from it, add a subtask and a story under the task, create a project group with the program purpose containing the task, and plan the task. Read each result in the workspace, then open the status report.

```gherkin
Given a new project and a migrated project
When a contributor captures an initiative, creates a task, a subtask and a story, groups the task in a project group with the program purpose, and plans the task
Then the workspace names each record by its current kind, shows the task as Planned and the group purpose as Program
And the status report uses the same words and counts only the task as delivery
And each new identity follows the current naming for its kind
And in the migrated project P1 and P2 keep their existing identities and record names
```

**Expected Result:**

| Dimension           | Expectation                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI                  | Creation choices, lists, detail, grouped-by-state layout, group maintenance and saved results use task, subtask, initiative, project group, Program and Planned. |
| System behavior     | The same words appear for assistant requests and their results; no earlier word is offered as a choice.                                                          |
| Business data state | New records store the current vocabulary and carry the migrated mark; the story stays with its task.                                                             |
| Data shown on UI    | The status report shows one more task in the total; the subtask, story and initiative earn no delivery credit.                                                   |

**Acceptance Criteria:**

- ✅ Workspace and status report agree on current words for every kind, state and purpose.
- ❌ An earlier word in any view, a renamed existing identity, or a subtask counted as delivery fails this case.

**Test Data:**

```json
{
    "created": ["initiative", "task", "subtask", "story", "project group with program purpose"],
    "lifecycleStep": "Draft to Planned for the task",
    "expectedDelivery": { "newProject": { "total": 1 }, "migratedProject": { "total": 3 } },
    "existingIdentitiesUnchanged": ["P1", "P2"]
}
```

**Edge Cases:**

- A custom display label for the program purpose → shown in place of Program, as inert text.
- Story, vision, the sprint field and story-point wording → shown as before.
- Reading without enhanced interactions or in print → the same words.
- An initiative link added from the task to its initiative → shown as an initiative link in both directions.

**Transition Invariants:** For ALL legal transitions of a task → the states shown are Draft, Planned, Ready, In progress, Blocked, Verifying, Done and Canceled, with the same allowed transitions as before; a request naming the earlier Backlog state is refused with the prior state unchanged.

**Evidence:** [Source: test/work-tracking/TC-TPT-252]

**Related Behaviors:**

| Capability                         | Anchor                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Governing observable intent        | FR-TPT-057, AC-TPT-38, BR-TPT-30, BR-TPT-27, BR-TPT-29                                                                           |
| Executing implementation/assertion | [Source: test/work-tracking/TC-TPT-252]; authored callback/assertion guard, NOT RUN; complete implementation mapping remains TBD |

**CoveredBy:** `.claude/skills/task-track/tests/workspace-browser.test.cjs::New work is named in the current words in capture choices, lists, detail, the board, group maintenance and the status report [variant: new-work-current-words]`, `.claude/hooks/tests/suites/task-tracking-runtime-contract.test.cjs::TC-TPT-252: a status report lists exactly the eligible tasks of its scope and names every kind, state and purpose in the current words`, `.claude/hooks/tests/suites/task-tracking-vocabulary.test.cjs::TC-TPT-252: new work is stored, located, identified and reported in the current vocabulary`
**Status:** Untested
