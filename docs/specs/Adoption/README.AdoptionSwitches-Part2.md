---
module: 'hooks'
service: 'framework.Adoption'
feature_code: 'ADS'
parent_spec: README.AdoptionSwitches.md
entities: ['SkillProfile', 'SkillVisibility', 'HostPermissionEntry', 'GraphToolingEnvironment']
status: draft
provisional: true
owner: 'Framework maintainers'
last_updated: '2026-09-24'
scope_mode: FRAMEWORK-LIBRARY
large_idea_decomposition: null
roadmap: null
milestone_id: null
scope_brief: null
roadmap_status: null
---

# Adoption Switches — Feature Spec, Part 2 (release D test cases)

> **DRAFT — provisional spec.** The skill-profile cases (TC-ADS-016…024, 040…042, 045…048) and the shared graph tooling cases (TC-ADS-028…031, 044, 049, 051…053) have landed: they carry `Implemented` with the test location (passed during implementation, not yet in the release-close full test run) and a `[Source:]` anchor. The emphasis anchor lock (TC-ADS-025) and the step-skill description cases (TC-ADS-032, 033, 050) also carry `Implemented`, but their tests were written and never executed. The emphasis comparison cases (TC-ADS-026, 043) are `Planned — deferred to after commit`. Every other case here stays `Planned (release D)` with `Evidence: TBD`. After the close run, reconcile with `/spec [mode=update]`, flip the implemented cases to `Tested`, and clear the provisional flag once no case is left planned.

> **Continuation part.** Sections 1–7, the rule catalog, the test summary and the release-A cases live in the parent spec. This part holds only the release-D Section 8 cases, split out under the project's forty-case rule; their IDs are unchanged.

**See also:** [README.AdoptionSwitches.md](README.AdoptionSwitches.md) — parent spec (sections 1–7, release-A cases, test summary).

## 8. Test Specifications (continued)

> Business-readable acceptance scenarios. The "user" of this capability is a project maintainer, a developer or the AI assistant; the observable surface is command output, printed lines, the text the assistant receives and the generated settings files (no screen exists, so the UI dimension is stated as not applicable).

### Invariant / Property Tests (release D)

> Universally-quantified cases for the [HARD] called-skill and lock rules (BR-ADS-09, BR-ADS-18).

#### TC-ADS-018: No preset hides a called skill [P0]

**Objective:** Prove that for every preset no skill started by a workflow step, an agent preload, the called-by-others list or the entry-skill list is turned off or made command-only.

**Business Intent / Invariant Guarded:** A preset never breaks a workflow or an agent (BR-ADS-09).

**Traces:** AC-ADS-10 / BR-ADS-09

**Preconditions:**

- A fixture tree with workflows, agents, a called-by-others list and an entry-skill list

**Real-World Reachability:** Any team selecting any preset.

**Demo Flow:** Resolve every preset over the fixture tree and inspect the called skills.

```gherkin
Given any preset
When it is resolved over a project with workflows and agents
Then no called skill is off or command-only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Keeps called skills callable                                                                                                                              |
| **Business data state** | Called skills callable                                                                                                                                    |
| **Data shown on UI**    | Called skills never in the off or command-only lists                                                                                                      |

**Acceptance Criteria:**

- ✅ No called skill hidden
- ❌ Any called skill off or command-only

**Test Data:**

```yaml
inputDomain: 'any preset over any workflow and agent tree'
invariant: 'for ALL presets no called skill resolves to off or command-only'
boundaryCounterCase: 'a user list naming a called skill without the opt-in → refusal (TC-ADS-042)'
```

```json
{
    "presets": ["standard", "minimal"]
}
```

**Edge Cases:**

- A skill called only by a project workflow → still called
- An entry skill (the workflow runner, a setup skill) → still called, and the standard preset does not make it name-only

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `rule/scripts/called-skills` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-018` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:155` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-053: Old locks, readable or not, are broken, a fresh unreadable lock is kept, and a broken holder never removes the new lock [P1]

**Objective:** Prove that a lock older than fifteen minutes — with a live holder or with unreadable content — is broken and the install proceeds, that a fresh lock with unreadable content is treated as held, and that a holder whose lock was broken does not delete the lock another session created.

**Business Intent / Invariant Guarded:** Lock recovery never lets two holders delete each other (BR-ADS-18).

**Traces:** AC-ADS-18 / BR-ADS-18

**Preconditions:**

- A lock older than fifteen minutes with a live process
- Separately, a lock with unreadable content that is also older than fifteen minutes
- Separately, a fresh lock with unreadable content
- A holder whose lock was broken and re-created by another session

**Real-World Reachability:** A reused process number or a corrupt lock after a crash.

**Demo Flow:** Start the install against each lock; then release as the first holder.

```gherkin
Given a lock older than fifteen minutes whose process is alive, and separately a lock with unreadable content that is also older than fifteen minutes
When the install starts
Then both locks are broken and the install proceeds
And given a fresh lock with unreadable content
When the install starts
Then that lock is not broken, and the session waits, then fails without installing, as for a live lock
And given a holder whose lock was broken and re-created by another session
When the first holder releases
Then the new holder lock stays
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Age and content rules; release only own lock                                                                                                              |
| **Business data state** | New holder lock intact                                                                                                                                    |
| **Data shown on UI**    | Install proceeds                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Both old locks broken
- ✅ Fresh unreadable lock kept
- ✅ New lock kept
- ❌ A fresh unreadable lock broken
- ❌ New lock deleted by the old holder

**Test Data:**

```yaml
inputDomain: 'any lock state: fresh or old, live or dead, readable or not, own or foreign token'
invariant: 'for ALL states a holder removes a lock only when it carries its own token'
boundaryCounterCase: 'a lock exactly fifteen minutes old with a live holder, or with unreadable content → still held'
```

```json
{
    "staleAfterMinutes": 15
}
```

**Edge Cases:**

- Two contenders race to re-create → one wins, the other treats it as held

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv-lock]`
> **Related Behaviors:** `operation/hooks/graph-venv-lock` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-053` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:487` (passed in P37; not re-run at the final gate)

---

### Skill Profile Tests (release D)

#### TC-ADS-016: The standard preset lists called skills by name only [P1]

**Objective:** Prove that the standard profile preset makes each called skill name-only on the primary host.

**Business Intent / Invariant Guarded:** The standard preset shortens the skill list while every called skill stays callable (BR-ADS-12).

**Traces:** AC-ADS-12 / BR-ADS-12

**Preconditions:**

- The project selects the standard preset

**Real-World Reachability:** A team picks the standard preset to trim its skill list.

**Demo Flow:** Run the profile sync and read the skill visibility settings.

```gherkin
Given the project selects the standard preset
When the profile is synced
Then each of the called skills in the preset is listed by name only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes name-only entries for the preset                                                                                                                   |
| **Business data state** | Visibility settings hold one owned entry per preset skill                                                                                                 |
| **Data shown on UI**    | Name-only entries for the preset skills                                                                                                                   |

**Acceptance Criteria:**

- ✅ All preset skills name-only
- ❌ A preset skill hidden or left fully listed

**Test Data:**

```json
{
    "skillProfile": {
        "preset": "standard"
    },
    "expectedNameOnlyCount": 20
}
```

**Edge Cases:**

- A preset skill missing from the project → warning, not failure

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-016` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:131` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-017: The minimal preset keeps only entry skills on [P1]

**Objective:** Prove that the minimal preset leaves only the entry skills fully listed.

**Business Intent / Invariant Guarded:** A project can opt into the smallest skill list without editing skills (BR-ADS-12).

**Traces:** AC-ADS-12 / BR-ADS-12

**Preconditions:**

- The project selects the minimal preset

**Real-World Reachability:** A team that uses only a few entry points picks the minimal preset.

**Demo Flow:** Run the profile sync and read the visibility settings.

```gherkin
Given the project selects the minimal preset
When the profile is synced
Then only the entry skills stay fully listed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes entries for every non-entry skill                                                                                                                  |
| **Business data state** | Owned entries for non-entry skills                                                                                                                        |
| **Data shown on UI**    | Only entry skills fully listed                                                                                                                            |

**Acceptance Criteria:**

- ✅ Only entry skills on
- ❌ A non-entry skill left fully listed

**Test Data:**

```json
{
    "skillProfile": {
        "preset": "minimal"
    }
}
```

**Edge Cases:**

- Called skills → never off (TC-ADS-018)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-017` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:142` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-019: User visibility entries survive the profile sync [P0]

**Objective:** Prove that user-written visibility entries, and owned entries the user changed, are untouched and each changed owned entry prints a conflict line.

**Business Intent / Invariant Guarded:** The profile never overwrites a developer choice (BR-ADS-12).

**Traces:** AC-ADS-12 / BR-ADS-12

**Preconditions:**

- A user-written entry
- An owned entry the user changed since the last sync

**Real-World Reachability:** A developer adjusts one skill by hand, then the team updates its profile.

**Demo Flow:** Run the profile sync and compare entries and printed lines.

```gherkin
Given a user-written entry and an owned entry the user changed
When the profile is synced
Then both are unchanged
And a conflict line names the changed owned entry
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Skips user entries; reports conflicts                                                                                                                     |
| **Business data state** | User values kept                                                                                                                                          |
| **Data shown on UI**    | Conflict line per changed owned entry                                                                                                                     |

**Acceptance Criteria:**

- ✅ User values kept
- ✅ Conflict printed
- ❌ A user value overwritten

**Test Data:**

```json
{
    "userEntry": {
        "my-skill": "off"
    }
}
```

**Edge Cases:**

- User deletes an owned entry → recreated on the next sync

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `rule/scripts/owned-key-ledger` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-019` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:174` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-020: The profile sync is repeatable and silent without a profile [P1]

**Objective:** Prove that a second run leaves the settings file byte-identical to the first run's output, that a run with no profile at all leaves the file byte-identical to its input, and that the check passes.

**Business Intent / Invariant Guarded:** Projects without a profile see no change; reruns are safe (BR-ADS-12).

**Traces:** AC-ADS-12 / BR-ADS-12

**Preconditions:**

- A settings file with or without a profile

**Real-World Reachability:** Every framework update reruns the sync.

**Demo Flow:** Run the sync twice and compare; run it with no profile and compare.

```gherkin
Given a project with a profile, or with none
When the profile sync runs twice
Then the second run leaves the file byte-identical to the first run's output
And with no profile the file stays byte-identical to its input
And the check passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes nothing when nothing changes                                                                                                                       |
| **Business data state** | File unchanged                                                                                                                                            |
| **Data shown on UI**    | Identical file; passing check                                                                                                                             |

**Acceptance Criteria:**

- ✅ Byte-identical
- ✅ Check passes
- ❌ Any rewrite without a change

**Test Data:**

```json
{
    "skillProfile": null
}
```

**Edge Cases:**

- No profile and no owned entries → no empty member inserted

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-020` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:199` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-040: A missing or broken primary-host settings file is never overwritten [P0]

**Objective:** Prove that when the settings file is missing or not valid, the profile sync fails naming the problem and leaves an existing file byte-identical.

**Business Intent / Invariant Guarded:** A parse failure never turns into an empty settings file that drops safety prompts (BR-ADS-13).

**Traces:** AC-ADS-12 / BR-ADS-13

**Preconditions:**

- The settings file is missing, or holds invalid content

**Real-World Reachability:** A developer hand-edits the settings file and leaves a syntax error.

**Demo Flow:** Run the profile sync and compare the file.

```gherkin
Given the settings file is missing or holds invalid content
When the profile sync runs
Then it fails and names the parse problem
And an existing file is byte-identical
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Refuses to write                                                                                                                                          |
| **Business data state** | File unchanged                                                                                                                                            |
| **Data shown on UI**    | Failure naming the problem                                                                                                                                |

**Acceptance Criteria:**

- ✅ Fails with the reason
- ✅ File unchanged
- ❌ File replaced or emptied

**Test Data:**

```json
{
    "settings": "{ invalid"
}
```

**Edge Cases:**

- File present but empty → treated as invalid

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-040` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:231` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-041: The profile sync changes only its own member [P0]

**Objective:** Prove that a profile change leaves all settings text outside the profile member byte-identical, every other setting equal, and no temporary file behind.

**Business Intent / Invariant Guarded:** Safety prompts and hook registrations can never be lost by a profile change (BR-ADS-13).

**Traces:** AC-ADS-12 / BR-ADS-13

**Preconditions:**

- A settings file with compact lists, safety prompts and hook registrations

**Real-World Reachability:** Teams change their profile several times.

**Demo Flow:** Run the sync with a changed profile; diff the file.

```gherkin
Given a settings file with safety prompts and hook registrations
When the profile sync runs with a changed profile
Then text outside the profile member is byte-identical
And every other setting is equal
And no temporary file remains
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Replaces one member atomically                                                                                                                            |
| **Business data state** | Only the profile member changed                                                                                                                           |
| **Data shown on UI**    | A diff limited to the profile member                                                                                                                      |

**Acceptance Criteria:**

- ✅ Diff limited to the member
- ✅ No temporary file
- ❌ Any other change

**Test Data:**

```json
{
    "preserved": ["permissions.ask", "hooks"]
}
```

**Edge Cases:**

- Profile member absent → inserted before the closing brace

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-041` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:253` (passed in P31; not re-run at the final gate)

---

#### TC-ADS-042: Hiding a called skill is refused unless the project opts in [P0]

**Objective:** Prove that putting a called skill in the command-only list without the opt-in fails with a message naming the skill and its caller and leaves the file unchanged, and that the opt-in writes it with a warning.

**Business Intent / Invariant Guarded:** A called skill cannot be made unreachable by accident (BR-ADS-09).

**Traces:** AC-ADS-10 / BR-ADS-09

**Preconditions:**

- The command-only list names a skill that a workflow step calls

**Real-World Reachability:** A team tries to hide a review skill its workflows use.

**Demo Flow:** Run the sync without and with the opt-in.

```gherkin
Given the command-only list names a called skill and no opt-in
When the profile sync runs
Then it fails naming the skill and its caller
And the settings file is unchanged
And with the opt-in the value is written and a warning names the skill
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Refuses, or writes with a warning                                                                                                                         |
| **Business data state** | Unchanged, or changed with the opt-in                                                                                                                     |
| **Data shown on UI**    | Refusal or warning line                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Refusal without opt-in
- ✅ Warning with opt-in
- ❌ Silent hiding

**Test Data:**

```json
{
    "skillProfile": {
        "commandOnly": ["security-review"]
    },
    "optIn": "allowHidingCalledSkills"
}
```

**Edge Cases:**

- Name-only on a called skill → allowed on the primary host
- The workflow runner, named only in the entry-skill list, in the command-only list (or a setup skill in the off list) → refused the same way, naming the entry-skill list as its caller; written with a warning only with the opt-in

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-skill-profile]`
> **Related Behaviors:** `operation/scripts/sync-skill-profile` · `rule/scripts/called-skills` · `test/scripts/sync-skill-profile`
> **CoveredBy:** `.claude/scripts/tests/sync-skill-profile.test.cjs::TC-ADS-042` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-skill-profile.test.cjs:276` (passed in P31; not re-run at the final gate); entry-skill edge `.claude/scripts/tests/sync-skill-profile.test.cjs:296` (passed in the round-1 review fix; not re-run at the final gate)

---

### Profile on Other Hosts Tests (release D)

#### TC-ADS-021: A name-only skill is not selectable by the assistant on the second host [P1]

**Objective:** Prove that a name-only skill that no workflow calls gets a policy on the second host that stops implicit selection.

**Business Intent / Invariant Guarded:** The profile has the same effect on the second host as on the primary one (BR-ADS-14).

**Traces:** AC-ADS-13 / BR-ADS-14

**Preconditions:**

- A name-only skill x that is not called

**Real-World Reachability:** A team using the second host sets a profile.

**Demo Flow:** Regenerate the second host copy and inspect x.

```gherkin
Given x is name-only and not called
When the second host copy is generated
Then x cannot be selected implicitly
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes the policy for x                                                                                                                                   |
| **Business data state** | Policy present                                                                                                                                            |
| **Data shown on UI**    | Implicit selection off for x                                                                                                                              |

**Acceptance Criteria:**

- ✅ Policy written
- ❌ x still selectable implicitly

**Test Data:**

```json
{
    "skillProfile": {
        "nameOnly": ["x"]
    }
}
```

**Edge Cases:**

- x owns its own policy file → not overwritten; conflict printed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-021` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs:846` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-022: A name-only skill has no entry on the third host [P2]

**Objective:** Prove that a name-only skill leaves no permission entry on the third host.

**Business Intent / Invariant Guarded:** Name-only never hides a skill on the third host (BR-ADS-14).

**Traces:** AC-ADS-13 / BR-ADS-14

**Preconditions:**

- A name-only skill x

**Real-World Reachability:** A team using the third host sets a profile.

**Demo Flow:** Sync the third host and read the permission entries.

```gherkin
Given x is name-only
When the third host is synced
Then x has no permission entry
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes no entry; removes an owned one                                                                                                                     |
| **Business data state** | No entry for x                                                                                                                                            |
| **Data shown on UI**    | Permissions without x                                                                                                                                     |

**Acceptance Criteria:**

- ✅ No entry
- ❌ x hidden

**Test Data:**

```json
{
    "skillProfile": {
        "nameOnly": ["x"]
    }
}
```

**Edge Cases:**

- An owned entry for x from before → removed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-022` · **Status:** Implemented — evidence: `.claude/scripts/opencode/tests/sync-skills.test.mjs:704` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-023: A command-only skill is hidden with a command on the third host [P1]

**Objective:** Prove that a command-only skill that no workflow calls is hidden on the third host and gets a command.

**Business Intent / Invariant Guarded:** Command-only in the profile behaves as the built-in command-only mark (BR-ADS-14, BR-ADS-10).

**Traces:** AC-ADS-13 / BR-ADS-14

**Preconditions:**

- A command-only skill y that is not called

**Real-World Reachability:** A team marks a rarely used skill command-only.

**Demo Flow:** Sync the third host; read entries and commands.

```gherkin
Given y is command-only and not called
When the third host is synced
Then y is hidden
And a command for y exists
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes hide entry and command                                                                                                                             |
| **Business data state** | Entry and command owned                                                                                                                                   |
| **Data shown on UI**    | Hide entry and command for y                                                                                                                              |

**Acceptance Criteria:**

- ✅ Hidden with command
- ❌ Hidden without command

**Test Data:**

```json
{
    "skillProfile": {
        "commandOnly": ["y"]
    }
}
```

**Edge Cases:**

- y is called → refusal (TC-ADS-046)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-023` · **Status:** Implemented — evidence: `.claude/scripts/opencode/tests/sync-skills.test.mjs:745` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-024: Without a profile both other hosts generate as before [P1]

**Objective:** Prove that with no profile the second and third host outputs equal the outputs before profiles existed.

**Business Intent / Invariant Guarded:** Profiles are opt-in; nothing changes for projects that do not use them (BR-ADS-14).

**Traces:** AC-ADS-13 / BR-ADS-14

**Preconditions:**

- No profile

**Real-World Reachability:** Any project that never sets a profile.

**Demo Flow:** Generate both copies and compare with the reference outputs.

```gherkin
Given no profile
When the second and third host copies are generated
Then both equal the outputs from before profiles
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | No profile effects                                                                                                                                        |
| **Business data state** | Outputs unchanged                                                                                                                                         |
| **Data shown on UI**    | Identical outputs                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Both identical
- ❌ Any difference

**Test Data:**

```json
{
    "skillProfile": null
}
```

**Edge Cases:**

- Empty profile object → same as none

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `operation/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-024`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-024` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs:862`, `.claude/scripts/opencode/tests/sync-skills.test.mjs:768` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-045: The second host refuses to hide a called skill without opt-in [P0]

**Objective:** Prove that the second host generation stops before writing any file when the profile makes a called skill command-only without the opt-in, and writes the policy with a warning when opted in.

**Business Intent / Invariant Guarded:** The called-skill safeguard holds on the second host (BR-ADS-09).

**Traces:** AC-ADS-10 / BR-ADS-09

**Preconditions:**

- The command-only list names a called skill

**Real-World Reachability:** A team using the second host sets a strict profile.

**Demo Flow:** Generate without and with the opt-in.

```gherkin
Given the command-only list names a called skill and no opt-in
When the second host copy is generated
Then it fails with the refusal message before writing any file
And with the opt-in the policy is written and a warning names the skill
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Refuses, or writes with a warning                                                                                                                         |
| **Business data state** | No files written without opt-in                                                                                                                           |
| **Data shown on UI**    | Refusal or warning line                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Refusal before writing
- ✅ Warning with opt-in
- ❌ Partial write
- ❌ Silent hiding

**Test Data:**

```json
{
    "skillProfile": {
        "commandOnly": ["security-review"]
    }
}
```

**Edge Cases:**

- Check mode → fails the same way

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `rule/scripts/called-skills`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-045` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs:879` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-046: The third host refuses to hide a called skill without opt-in [P0]

**Objective:** Prove that the third host sync fails with the refusal message and leaves settings byte-identical when the profile turns a called skill off without the opt-in, and hides it with a command and a warning when opted in.

**Business Intent / Invariant Guarded:** The called-skill safeguard holds on the third host (BR-ADS-09).

**Traces:** AC-ADS-10 / BR-ADS-09

**Preconditions:**

- The off list names a called skill

**Real-World Reachability:** A team using the third host sets a strict profile.

**Demo Flow:** Sync without and with the opt-in.

```gherkin
Given the off list names a called skill and no opt-in
When the third host is synced
Then it fails with the refusal message
And the settings file is byte-identical
And with the opt-in the skill is hidden with a command and a warning names it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Refuses, or writes with a warning                                                                                                                         |
| **Business data state** | Unchanged without opt-in                                                                                                                                  |
| **Data shown on UI**    | Refusal or warning line                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Refusal
- ✅ Warning with opt-in
- ❌ Silent hiding

**Test Data:**

```json
{
    "skillProfile": {
        "off": ["security-review"]
    }
}
```

**Edge Cases:**

- Check mode → fails the same way

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/called-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-046` · **Status:** Implemented — evidence: `.claude/scripts/opencode/tests/sync-skills.test.mjs:799` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-047: A called name-only skill on the second host follows the probe result [P1]

**Objective:** Prove that under the standard preset a called name-only skill gets no implicit-selection policy when the probe failed or was inconclusive, and gets one when the probe passed.

**Business Intent / Invariant Guarded:** The second host never cuts a workflow off from a skill it may not be able to reach (BR-ADS-14).

**Traces:** AC-ADS-13 / BR-ADS-14

**Preconditions:**

- The standard preset
- The probe result recorded at the release-D close

**Real-World Reachability:** A team on the second host selects the standard preset.

**Demo Flow:** Generate and inspect the called skill.

```gherkin
Given the standard preset lists a called skill as name-only
When the second host copy is generated
Then with a failed or inconclusive probe the skill has no policy and a note is printed
And with a passed probe it cannot be selected implicitly
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Branches on the probe                                                                                                                                     |
| **Business data state** | Policy per branch                                                                                                                                         |
| **Data shown on UI**    | Note line or policy                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Branch followed
- ❌ Policy written after a failed probe

**Test Data:**

```json
{
    "probe": ["PASS", "FAIL", "INCONCLUSIVE"]
}
```

**Edge Cases:**

- Probe not recorded → treated as inconclusive

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-047` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs:927` (passed in P41; not re-run at the final gate)

---

#### TC-ADS-048: The profile never loosens a user third-host permission [P0]

**Objective:** Prove that a user-written "allow" for a skill the profile makes command-only is kept, a conflict line names it, and it is not recorded as owned.

**Business Intent / Invariant Guarded:** A profile never adopts or overrides a user permission (BR-ADS-08).

**Traces:** AC-ADS-08 / BR-ADS-08

**Preconditions:**

- A user-written allow for y, not owned
- The profile makes y command-only

**Real-World Reachability:** A developer explicitly allowed a skill, then the team profile hides it.

**Demo Flow:** Sync the third host and read the entry, lines and ownership record.

```gherkin
Given a user-written allow for y and a profile making y command-only
When the third host is synced
Then y keeps allow
And a conflict line names y
And y is not recorded as owned
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Skips the user entry                                                                                                                                      |
| **Business data state** | User value kept                                                                                                                                           |
| **Data shown on UI**    | Conflict line                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Allow kept
- ✅ Conflict printed
- ✅ Not owned
- ❌ Entry changed or adopted

**Test Data:**

```json
{
    "before": {
        "permission.skill": {
            "y": "allow"
        }
    },
    "skillProfile": {
        "commandOnly": ["y"]
    }
}
```

**Edge Cases:**

- User removes the entry later → the next sync may own it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/owned-key-ledger`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-048` · **Status:** Implemented — evidence: `.claude/scripts/opencode/tests/sync-skills.test.mjs:838` (passed in P41; not re-run at the final gate)

---

### Skill Text Tests (release D)

#### TC-ADS-025: Edited skills keep emphasis in their summary and closing reminders [P2]

**Objective:** Prove that a skill whose emphasis was reduced still carries emphasis markers in its quick summary and closing reminders.

**Business Intent / Invariant Guarded:** Reducing emphasis never removes it from the two places that anchor attention (BR-ADS-15).

**Traces:** AC-ADS-14 / BR-ADS-15

**Preconditions:**

- A skill edited by the emphasis reduction

**Real-World Reachability:** The emphasis reduction applies to selected skills only.

**Demo Flow:** Read the quick summary and closing reminders of the edited skill.

```gherkin
Given a skill whose emphasis was reduced
When its quick summary and closing reminders are read
Then both keep their emphasis markers
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Emphasis kept at the anchors                                                                                                                              |
| **Business data state** | Markers present                                                                                                                                           |
| **Data shown on UI**    | Markers in both sections                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Markers present in both
- ❌ Markers removed from either

**Test Data:**

```json
{
    "sections": ["Quick Summary", "Closing Reminders"]
}
```

**Edge Cases:**

- A skill not selected → unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/skills/emphasis-anchors]`
> **Related Behaviors:** `component/skills/emphasis-anchors` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-ADS-025` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:1448` "[content-presence] TC-ADS-025 anchors-only emphasis: a stripped top or closing anchor is named (fixture)", `.claude/hooks/tests/suites/content-presence.test.cjs:1476` "[content-presence] TC-ADS-025 the emphasis-diet skills keep their top and closing anchor markers" (written in P32, never executed; not run at the final gate). The live row locks per-skill anchor-marker floors for the five selected skills. No skill body was edited in P32, because the G2 anchors-only change waits for the TC-ADS-026 decision.

---

#### TC-ADS-026: The emphasis decision is recorded per skill and host [P2]

**Objective:** Prove that the measurement note gives each skill compliance counts for each host that ran, marks a host that did not run as not run, and states a decision.

**Business Intent / Invariant Guarded:** Emphasis is reduced only on measured evidence, never on a guess (BR-ADS-15).

**Traces:** AC-ADS-14 / BR-ADS-15

**Preconditions:**

- The comparison runs finished

**Real-World Reachability:** The release-D close reviews the note.

**Demo Flow:** Read the measurement note.

```gherkin
Given the comparison runs finished
When the measurement note is read
Then each skill has compliance counts per host that ran
And a host that did not run is marked not run, never pass
And each skill has a decision
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Note complete                                                                                                                                             |
| **Business data state** | Decision recorded                                                                                                                                         |
| **Data shown on UI**    | Counts, host status and decision per skill                                                                                                                |

**Acceptance Criteria:**

- ✅ Complete note
- ❌ A skipped host recorded as pass
- ❌ A skill without a decision

**Test Data:**

```json
{
    "note": "tmp/metrics/g3-emphasis.md"
}
```

**Edge Cases:**

- A skill the runs never loaded → not measured, no change

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `TBD (pre-implementation)`
> **Related Behaviors:** `requirement/framework/emphasis-measurement`
> **CoveredBy:** `Manual-QC` (review at the release-D close) · **Status:** Planned — deferred to after commit: the G3 comparison runs (P32 steps 2–5: fixture build, A/B runs, cleanup, decide) have not run. They need live multi-session runs in fixture copies of the committed tree, alongside the P47 fixture build and the P39 replay (owner directive P38). Only the skill selection and the anchors-only variant drafts exist. Until the decision is recorded, every selected skill stays unchanged.

---

#### TC-ADS-027: Name-clash guidance matches the spike result [P2]

**Objective:** Prove that the documentation describes the name-clash outcome the spike recorded: a recipe when the built-in skill returns, a rename proposal otherwise.

**Business Intent / Invariant Guarded:** Adopters get guidance that matches how the host actually resolves a clash (BR-ADS-16).

**Traces:** AC-ADS-15 / BR-ADS-16

**Preconditions:**

- The spike recorded its result

**Real-World Reachability:** A team notices a framework skill shadows a built-in one.

**Demo Flow:** Read the documentation section for the clash.

```gherkin
Given the spike recorded whether the built-in skill returns
When the documentation is read
Then it gives the recipe for the recorded outcome
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Docs follow the result                                                                                                                                    |
| **Business data state** | Docs present                                                                                                                                              |
| **Data shown on UI**    | Recipe or proposal link                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Guidance matches the result
- ❌ Guidance for the other outcome

**Test Data:**

```json
{
    "results": "tmp/spikes/name-clash/results.md"
}
```

**Edge Cases:**

- Inconclusive result → documented as such

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `TBD (pre-implementation)`
> **Related Behaviors:** `requirement/framework/name-clash`
> **CoveredBy:** `Manual-QC` (checked at the release-D close) · **Status:** Planned (release D)

---

#### TC-ADS-032: Step-skill descriptions follow the routing form [P2]

**Objective:** Prove that the lint passes a step-skill description that starts with the routing prefix and is at most 250 characters, and fails one without the prefix or longer, naming the skill.

**Business Intent / Invariant Guarded:** Step skills are described so the assistant picks them for the right step (BR-ADS-19).

**Traces:** AC-ADS-16 / BR-ADS-19

**Preconditions:**

- A fixture workflow registry with two step skills

**Real-World Reachability:** Maintainers edit step-skill descriptions.

**Demo Flow:** Run the lint on the fixture.

```gherkin
Given two step skills in a fixture project
When the description lint runs
Then a 250-character description with the prefix passes
And one without the prefix or 251 characters long fails, naming the skill
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Lint checks prefix and length                                                                                                                             |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Pass, or failure naming the skill                                                                                                                         |

**Acceptance Criteria:**

- ✅ Boundary pass and fail as stated
- ❌ Wrong verdict at the boundary

**Test Data:**

```yaml
inputDomain: 'any step-skill description'
invariant: 'for ALL descriptions the lint passes exactly those starting with the prefix and at most 250 characters'
boundaryCounterCase: '251 characters with the prefix → fails'
```

```json
{
    "prefix": "Use when a workflow step or the user asks for",
    "maxCharacters": 250
}
```

**Edge Cases:**

- Empty description → fails

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/step-skill-description]`
> **Related Behaviors:** `rule/hooks/step-skill-description` · `test/hooks/step-skill-description`
> **CoveredBy:** `.claude/hooks/tests/suites/step-skill-description.test.cjs::TC-ADS-032` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/step-skill-description.test.cjs:108` "[step-skill-description] TC-ADS-032: a 250-char description in the form passes; no prefix or 251 chars fails, naming the skill" (written in P38, never executed; not run at the final gate)

---

#### TC-ADS-033: Workflow wrappers are exempt from the step-skill form [P2]

**Objective:** Prove that a step whose skill is a workflow wrapper is excluded from the description rule.

**Business Intent / Invariant Guarded:** Wrappers keep their own description style (BR-ADS-19).

**Traces:** AC-ADS-16 / BR-ADS-19

**Preconditions:**

- A fixture step whose skill is a workflow wrapper

**Real-World Reachability:** Workflows that call other workflows.

**Demo Flow:** Run the lint on the fixture.

```gherkin
Given a step whose skill is a workflow wrapper
When the lint runs
Then the wrapper is not checked
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Excludes wrappers                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | No finding for the wrapper                                                                                                                                |

**Acceptance Criteria:**

- ✅ Wrapper excluded
- ❌ Wrapper flagged

**Test Data:**

```json
{
    "wrapper": "workflow-review-changes"
}
```

**Edge Cases:**

- A non-wrapper skill whose name starts like one → still checked

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/step-skill-description]`
> **Related Behaviors:** `rule/hooks/step-skill-description` · `test/hooks/step-skill-description`
> **CoveredBy:** `.claude/hooks/tests/suites/step-skill-description.test.cjs::TC-ADS-033` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/step-skill-description.test.cjs:133` "[step-skill-description] TC-ADS-033: a workflow-\* wrapper step is excluded from the rule" (written in P38, never executed; not run at the final gate)

---

#### TC-ADS-050: The framework step skills all follow the description form [P2]

**Objective:** Prove that in the framework repository every real step-skill description matches the form, and that in any other project the check reports itself skipped with a reason.

**Business Intent / Invariant Guarded:** The framework ships its own step skills in the routing form (BR-ADS-19).

**Traces:** AC-ADS-16 / BR-ADS-19

**Preconditions:**

- The framework repository

**Real-World Reachability:** The release-D close runs the full test set.

**Demo Flow:** Run the lint over the framework step skills.

```gherkin
Given the framework repository
When the lint runs over the real step skills
Then every description matches the form
And in any other project the check is reported as skipped with its reason
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Self-check gated to the framework repository                                                                                                              |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Pass, or skipped with reason                                                                                                                              |

**Acceptance Criteria:**

- ✅ All match
- ✅ Skip reported elsewhere
- ❌ A skip reported as a pass

**Test Data:**

```json
{
    "gate": "package-name framework signal"
}
```

**Edge Cases:**

- A new step skill added later → caught by this check

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/step-skill-description]`
> **Related Behaviors:** `rule/hooks/step-skill-description` · `test/hooks/step-skill-description`
> **CoveredBy:** `.claude/hooks/tests/suites/step-skill-description.test.cjs::TC-ADS-050` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/step-skill-description.test.cjs:147` "[step-skill-description] TC-ADS-050: every step skill of the framework workflows.json matches the form" (written in P38, never executed; not run at the final gate; runs only inside the framework repo)

---

#### TC-ADS-043: Comparison runs leave no trace in the repository or the user host state [P0]

**Objective:** Prove that after the comparison runs and cleanup the repository listings equal the before listings, the second host holds no entry for the run folders, and the run folder is gone.

**Business Intent / Invariant Guarded:** Measurement never changes the developer repository or personal host trust state (BR-ADS-15).

**Traces:** AC-ADS-14 / BR-ADS-15

**Preconditions:**

- Before-listings of status, branches, stashes and worktrees were recorded
- Host state files were backed up

**Real-World Reachability:** The release-D emphasis experiment runs on a fixture copy.

**Demo Flow:** Compare the four listings and diff each host state file with its backup.

```gherkin
Given the comparison runs and cleanup have finished
When the repository listings are compared with the before listings and each host state file with its backup
Then the listings are equal
And no entry for a run folder remains
And the run folder no longer exists
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Cleanup restores state                                                                                                                                    |
| **Business data state** | Repository and host state unchanged                                                                                                                       |
| **Data shown on UI**    | Equal listings; clean diffs                                                                                                                               |

**Acceptance Criteria:**

- ✅ Listings equal
- ✅ No run entries
- ✅ Run folder gone
- ❌ Any leftover

**Test Data:**

```json
{
    "listings": ["git status --short", "git branch --list", "git stash list", "git worktree list"]
}
```

**Edge Cases:**

- Other host entries changed during the run window → only run entries removed, recorded

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `TBD (pre-implementation)`
> **Related Behaviors:** `requirement/framework/ab-fixture-cleanup`
> **CoveredBy:** `Manual-QC` (the before and after state listings are captured in the release-D close record and checked at that close) · **Status:** Planned — deferred to after commit: the P32 comparison runs have not run, so there is no before-and-after state listing to check. The listings, the Codex state backup and restore, and the cleanup run with the G3 A/B after the commit (owner directive P38).

---

### Shared Graph Environment Tests (release D)

#### TC-ADS-028: Projects with the same graph requirements share one tooling environment [P2]

**Objective:** Prove that two projects with identical graph requirements resolve to the same shared environment under the user cache.

**Business Intent / Invariant Guarded:** Many checkouts do not each download the same graph tooling (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- Two projects with identical requirements
- No current project environment

**Real-World Reachability:** A developer works in several checkouts of the framework.

**Demo Flow:** Resolve the environment location for both projects.

```gherkin
Given two projects with identical graph requirements
When their tooling environment is resolved
Then both resolve to the same shared location under the user cache
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Keys the location by the requirements fingerprint                                                                                                         |
| **Business data state** | One shared location                                                                                                                                       |
| **Data shown on UI**    | Equal locations                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Equal locations under the cache
- ❌ Different locations

**Test Data:**

```json
{
    "requirementsA": "same",
    "requirementsB": "same"
}
```

**Edge Cases:**

- Cache location injected in tests → never outside the temp folder

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-028` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:149` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-029: Different graph requirements get different environments [P2]

**Objective:** Prove that different requirements resolve to different shared locations.

**Business Intent / Invariant Guarded:** A project never runs graph tooling built for other requirements (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- Two projects with different requirements

**Real-World Reachability:** Two framework versions in two checkouts.

**Demo Flow:** Resolve both locations.

```gherkin
Given two projects with different graph requirements
When their environments are resolved
Then the locations differ
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Fingerprint differs                                                                                                                                       |
| **Business data state** | Two locations                                                                                                                                             |
| **Data shown on UI**    | Different locations                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Locations differ
- ❌ Same location

**Test Data:**

```json
{
    "requirementsA": "v1",
    "requirementsB": "v2"
}
```

**Edge Cases:**

- Whitespace-only difference → still a different fingerprint

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-029` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:169` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-030: A current project environment is used first [P1]

**Objective:** Prove that a project environment whose ready marker matches the current requirements is used instead of the shared one.

**Business Intent / Invariant Guarded:** Existing project setups keep working with no forced migration (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- A project environment with a ready marker holding the current requirements fingerprint

**Real-World Reachability:** A project that installed the graph before the shared environment existed.

**Demo Flow:** Resolve the environment location.

```gherkin
Given a project environment marked ready for the current requirements
When the environment is resolved
Then the project environment is used
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Prefers the project environment                                                                                                                           |
| **Business data state** | No shared environment created                                                                                                                             |
| **Data shown on UI**    | Project location                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Project environment used
- ❌ Shared environment used

**Test Data:**

```json
{
    "marker": "deps-ok",
    "markerMatches": true
}
```

**Edge Cases:**

- Unreadable marker → treated as no marker

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-030` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:186` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-031: The shared cache location follows each operating system [P1]

**Objective:** Prove that on Windows, macOS and Linux, with the cache settings set and unset, the shared location follows the per-OS rule and never points outside the test temp folder.

**Business Intent / Invariant Guarded:** The shared environment lands in the right per-user place on every supported OS (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- Operating system and cache settings injected

**Real-World Reachability:** Developers on all three operating systems.

**Demo Flow:** Resolve the location for each OS and settings combination.

```gherkin
Given each supported operating system with its cache settings set or unset
When the shared location is resolved
Then it follows that system rule
And it stays inside the injected temp folder
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Per-OS cache root                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Resolved locations                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Per-OS rule followed
- ❌ A location outside the injected folder

**Test Data:**

```yaml
inputDomain: 'each of Windows, macOS, Linux with each cache setting set or unset'
invariant: 'for ALL combinations the location is under the per-OS cache root'
boundaryCounterCase: 'all cache settings unset → falls back to the home-based root, still inside the injected folder'
```

```json
{
    "platforms": ["win32", "darwin", "linux"],
    "env": ["LOCALAPPDATA", "HOME", "XDG_CACHE_HOME"]
}
```

**Edge Cases:**

- Home unset → documented fallback

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-031` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:208` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-044: Finding the graph environment starts no process [P1]

**Objective:** Prove that resolving the environment location and its interpreter starts no process, for both the project and the shared case.

**Business Intent / Invariant Guarded:** Every session can check the graph environment for free (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- A counter on process starts is installed before the graph helpers load

**Real-World Reachability:** Every session start resolves the environment.

**Demo Flow:** Resolve both cases and read the counter.

```gherkin
Given process starts are counted
When the environment location and interpreter are resolved for the project and shared cases
Then no process was started
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | File reads only                                                                                                                                           |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Counter at zero                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Zero starts
- ❌ Any start

**Test Data:**

```json
{
    "expectedSpawns": 0
}
```

**Edge Cases:**

- Marker unreadable → still zero starts

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-044` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:245` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-049: An existing unmarked project environment is adopted in place [P1]

**Objective:** Prove that a project environment without a ready marker, whose import check passes, gets the marker, creates nothing in the shared cache, and is chosen afterwards.

**Business Intent / Invariant Guarded:** Existing installs are reused instead of downloaded again (BR-ADS-17).

**Traces:** AC-ADS-17 / BR-ADS-17

**Preconditions:**

- A project environment with an interpreter and no marker
- Its import check passes

**Real-World Reachability:** A project installed the graph before ready markers existed.

**Demo Flow:** Run the dependency check, then resolve the location.

```gherkin
Given a project environment without a ready marker whose import check passes
When the dependency check runs
Then the marker is written in the project environment
And nothing is created in the shared cache
And the next resolution returns the project environment
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Adopts the project environment                                                                                                                            |
| **Business data state** | Marker written                                                                                                                                            |
| **Data shown on UI**    | Project location on the next resolution                                                                                                                   |

**Acceptance Criteria:**

- ✅ Adopted in place
- ❌ Shared install triggered

**Test Data:**

```json
{
    "marker": "deps-ok",
    "importCheck": "pass"
}
```

**Edge Cases:**

- Import check fails → shared install path
- A project environment marked for other requirements → never import-checked, re-marked or adopted; its old marker stays and the shared environment is installed and used
- A marked shared environment whose first import check fails while another session is still installing → its marker is kept outside the install lock and re-checked under it, so nothing is reinstalled

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv]`
> **Related Behaviors:** `operation/hooks/graph-venv` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-049` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:276` (passed in P37; not re-run at the final gate); mismatched-marker edge `.claude/hooks/tests/suites/graph-venv.test.cjs:342`, marker-under-lock edge `.claude/hooks/tests/suites/graph-venv.test.cjs:378` (passed in the round-1 review fix; not re-run at the final gate)

---

#### TC-ADS-051: A lock left by a dead session is broken [P1]

**Objective:** Prove that an install lock held by a process that no longer runs on this machine is broken, the install runs once, and the lock is gone afterwards.

**Business Intent / Invariant Guarded:** A crashed session never blocks graph tooling forever (BR-ADS-18).

**Traces:** AC-ADS-18 / BR-ADS-18

**Preconditions:**

- An install lock on this machine whose holder process is dead

**Real-World Reachability:** A session crashed during the graph install.

**Demo Flow:** Start the install with the stale lock present.

```gherkin
Given an install lock whose holder process is dead
When the install starts
Then the stale lock is broken
And the install runs once
And no lock remains afterwards
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Breaks the stale lock                                                                                                                                     |
| **Business data state** | Installed; lock released                                                                                                                                  |
| **Data shown on UI**    | Install completes                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Install once
- ✅ Lock gone
- ❌ Blocked by a dead lock

**Test Data:**

```json
{
    "processAlive": false
}
```

**Edge Cases:**

- Lock from another machine → only the age rule applies

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv-lock]`
> **Related Behaviors:** `operation/hooks/graph-venv-lock` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-051` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:408` (passed in P37; not re-run at the final gate)

---

#### TC-ADS-052: A live install lock makes a second session wait briefly, then back off [P1]

**Objective:** Prove that a fresh lock held by a live process makes another session wait at most five seconds, then fail clearly naming the holder, without installing and without touching the lock.

**Business Intent / Invariant Guarded:** Two sessions never install at once, and session start stays short (BR-ADS-18).

**Traces:** AC-ADS-18 / BR-ADS-18

**Preconditions:**

- A lock younger than fifteen minutes held by a live process

**Real-World Reachability:** Two checkouts start sessions at the same time.

**Demo Flow:** Start the install while the lock is held.

```gherkin
Given a lock younger than fifteen minutes held by a live process
When another session starts the install
Then it waits at most five seconds
And it fails with a message naming the holder
And it installs nothing and leaves the lock unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Bounded wait, then clear failure                                                                                                                          |
| **Business data state** | Holder lock unchanged                                                                                                                                     |
| **Data shown on UI**    | Message naming the holder process                                                                                                                         |

**Acceptance Criteria:**

- ✅ At most five seconds
- ✅ Clear message
- ✅ Lock unchanged
- ❌ Unbounded wait
- ❌ Concurrent install

**Test Data:**

```json
{
    "waitCeilingSeconds": 5,
    "pollMilliseconds": 100
}
```

**Edge Cases:**

- Holder finishes during the wait → the waiter proceeds

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-venv-lock]`
> **Related Behaviors:** `operation/hooks/graph-venv-lock` · `test/hooks/graph-venv`
> **CoveredBy:** `.claude/hooks/tests/suites/graph-venv.test.cjs::TC-ADS-052` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/graph-venv.test.cjs:445` (passed in P37; not re-run at the final gate)

---

_Feature Spec — tech-free 8-section template v4.0_
