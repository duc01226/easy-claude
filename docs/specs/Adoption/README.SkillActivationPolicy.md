---
module: hooks
service: framework.Adoption
feature_code: SAP
entities: [SkillActivationPolicy, AuthorizationScope]
status: implemented
owner: Framework maintainers
last_updated: '2026-10-02'
scope_mode: FRAMEWORK-LIBRARY
---

# Framework Skill Activation Policy

## 1. Overview

A team or individual developer can stop the assistant from starting heavy framework procedures on
ordinary task requests. Explicitly requested procedures and checks required by an active operation
remain available. When a suitable procedure matches an ordinary request, the assistant asks whether
to run it or skip it and execute directly. The default preserves automatic selection. This is guidance
for assistant behavior,
not an access-control guarantee: the procedure catalog remains available and existing permissions
remain authoritative.

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Framework procedure | A skill or workflow supplied by the framework |
| Heavy procedure | Every framework procedure except the commit, pull-request and lightweight framework-configuration entry procedures |
| Automatic selection | Starting a procedure because ordinary task wording resembles its description |
| Named request | A human explicitly asks for a particular procedure by name or command |
| Required call | An operation-specific instruction requires a named procedure after the operation is active |
| Authorized scope | The selected operation and its required dependencies; excludes optional unrelated work |
| Restricted policy | Suitable unrequested procedures need confirmation; named requests and required calls stay eligible |

## 3. User Stories & Acceptance Criteria

### US-SAP-01: Choose lighter ordinary interactions

As a project maintainer, I want ordinary requests handled without automatically starting heavy
procedures, so their cost is incurred only when requested or required.

- **AC-SAP-01:** An unset preference preserves automatic selection; a restricted preference tells the
  assistant to ask once before starting a suitable heavy procedure on ordinary fixing, implementation,
  explanation or review requests: name the procedure and its fit, offer run or skip and execute directly,
  then wait for the answer. With no suitable match, execute directly without a question.
- **AC-SAP-02:** Commit and pull-request entry procedures retain their usual triggers and human authorization.
- **AC-SAP-03:** The assistant receives no competing suggestion to self-start a workflow in restricted mode.

### US-SAP-02: Keep commit quality gates operational

As a developer, I want a commit to retain its review-choice question and the selected review's required
reviewers, so restricting automatic work does not bypass quality checks.

- **AC-SAP-04:** Named requests and required calls remain eligible without changing procedure access
  or asking an additional procedure-choice question. A confirmed candidate and its scoped required
  dependencies become eligible without requiring the user to repeat its name.
- **AC-SAP-05:** A commit still asks the human to select a review or explicitly approve a skip where required;
  the selected review can invoke its required reviewers and validation. The policy itself approves neither choice.
- **AC-SAP-06:** Optional unrelated procedures and attempts to obtain authorization by self-starting an agent
  remain outside the authorized scope. A skipped procedure is not replaced by another unrequested one;
  direct execution retains required quality and safety checks. The same task does not prompt again
  on follow-up, delegation or recovery; its recorded choice and scope are preserved.

### US-SAP-03: Override the team preference personally

As a developer, I want a personal preference without rewriting shared files, so colleagues retain their own behavior.

- **AC-SAP-07:** Valid personal preferences override the team; checkout preferences override user preferences;
  an environment preference overrides both. Invalid values do not erase an earlier valid choice.
- **AC-SAP-08:** A changed or removed preference takes effect during the current session and after recovery.
- **AC-SAP-09:** Supported host adapters deliver the policy to the main conversation and delegated work.

## 4. Business Rules

- **BR-SAP-01 [HARD]:** Automatic selection is enabled unless a valid preference disables it. The policy
  affects framework procedures only, with commit, pull-request and lightweight framework configuration exempt.
- **BR-SAP-02 [HARD]:** For every ordinary task with a suitable restricted procedure match, ask one
  choice question before loading or executing it: name the best fit and its reason, offer run (recommended)
  or skip and execute directly, and wait for the human answer. No suitable match means direct execution
  without a question. Confirmation authorizes only that candidate and its scoped required dependencies.
  Skip proceeds directly without a replacement or repeated question for the same task, while retaining
  required quality and safety checks. Silence never grants confirmation. Named requests, already authorized
  required calls and exempt entry procedures need no procedure-choice question. Restricted mode allows
  named human requests, confirmed candidates, operation-specific required calls and required dependencies
  and selected applicable steps within an authorized workflow’s declared scope, including planned steps
  executed later or after recovery. Ordinary task wording, generic discovery guidance,
  optional suggestions and merely reading a procedure do not create authorization.
- **BR-SAP-03 [HARD]:** Human review-choice and skip-approval gates remain intact. A selected commit review
  authorizes its required review chain; it does not authorize unrelated work or additional Git operations.
- **BR-SAP-04:** Later valid preferences win in this order: framework default, team, personal user,
  personal checkout, environment. Missing, unreadable, malformed and invalid layers express no preference.
- **BR-SAP-05:** Restricted guidance refreshes for each ordinary prompt, delegated start and recovery.
  Restoring automatic behavior replaces the earlier restriction; unchanged default behavior stays silent.
- **BR-SAP-06:** Restricted mode suppresses competing automatic workflow routing. Native permission and
  manual-only restrictions remain authoritative and are never relaxed by this policy.
- **BR-SAP-07:** The capability controls selection through assistant instructions. Deterministic adapter
  tests prove delivery and preserved reachability, not universal model compliance.

## 5. Domain Model

| Entity | Responsibilities |
| --- | --- |
| Skill Activation Policy | Effective automatic/restricted choice, deciding preference layer and exempt entry procedures |
| Authorization Scope | Named operation, its required calls and dependencies, and any outstanding human choices |
| Delivery Record | Earlier effective choice within one conversation or delegated scope; enables a restoration notice |

## 6. Process Flows & Interaction Surface

1. Resolve the effective preference for the current project and developer.
2. For restricted mode, deliver scoped selection guidance and suppress automatic workflow suggestions.
3. On an ordinary request with a suitable heavy procedure match, ask once whether to run it or skip
   and execute directly; wait for the answer. No match proceeds directly. Confirmation scopes the
   authorization to that procedure; Skip preserves direct execution and required checks. Preserve the
   answer and scope for follow-ups, delegation and recovery without asking again for the same task.
4. On a named request or required call, execute the real procedure and preserve its human-choice gates.
5. A selected commit review runs its required review chain under the same scope.
6. Refresh guidance on subsequent prompts, delegated starts and recovery; replace an earlier restriction
   when automatic selection is restored.

There is no application screen. The observable surfaces are assistant instructions, procedure-choice
questions and unchanged host permission settings. OpenCode delegated conversations receive live policy
at system-context transformation even when no ordinary user-message notification occurred.

## 7. Permissions & Roles

| Actor | Allowed choice | Scope |
| --- | --- | --- |
| Project maintainer | Set team preference | Adopting project |
| Developer | Override preference | Own projects or current checkout |
| Human user | Select a procedure, commit review or approved skip | Requested operation |
| Assistant | Follow required calls and dependencies | Authorized operation only |

The policy grants no host permission, Git authority or approval to skip checks.

## 8. Test Specifications

### TC-SAP-001: Automatic selection remains the default [P0]

**Objective:** Preserve current behavior for adopters that configure nothing.
**Business Intent / Invariant Guarded:** BR-SAP-01 / AC-SAP-01.
**Preconditions:** A project with no valid restrictive preference.

```gherkin
Given no preference, an invalid preference or unreadable preference content
When the effective choice is resolved and an ordinary prompt arrives
Then automatic selection remains enabled
And no restriction is injected
```

**Expected Result:** Automatic selection stays enabled and no restriction is emitted.
**Acceptance Criteria:** AC-SAP-01.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** Strings resembling booleans, arrays, missing files and malformed content preserve the default.
**Evidence:** [Source: operation/SkillActivationPolicy/Resolve]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-001` · **Status:** Tested

### TC-SAP-002: Personal preferences override the team without shared writes [P0]

**Objective:** Prove precedence, portability and input validation.
**Business Intent / Invariant Guarded:** BR-SAP-04 / AC-SAP-07.
**Preconditions:** Isolated team, user, checkout and environment preference layers.

```gherkin
Given disagreeing valid preferences at multiple layers
When the effective choice is resolved
Then the highest-priority valid preference wins
And team-only resolution ignores personal preferences
And no shared preference file is rewritten
```

**Expected Result:** The highest-priority valid preference wins without shared writes.
**Acceptance Criteria:** AC-SAP-07.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** Invalid later values preserve the earlier valid decision; relocated team preferences and
common editor encodings preserve the same outcome; team and personal validation reject string booleans.
**Evidence:** [Source: operation/SkillActivationPolicy/Resolve]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-002` · **Status:** Tested

### TC-SAP-003: Ordinary prompts receive confirmation or direct execution guidance [P0]

**Objective:** Let the user confirm a suitable procedure or skip it and proceed directly; ordinary
wording alone never authorizes its execution.
**Business Intent / Invariant Guarded:** BR-SAP-01, BR-SAP-02 / AC-SAP-01, AC-SAP-02, AC-SAP-06.
**Preconditions:** Restricted team preference and each primary host launcher.

```gherkin
Given automatic selection is restricted
When an ordinary fixing, review, explanation or implementation request arrives
Then the guidance requires one question naming the suitable procedure and its fit
And the choices are run the matched procedure or skip and execute directly
And it requires waiting for the human answer without inferring consent from silence
And confirmation authorizes only that procedure and its scoped required dependencies
And skip retains direct execution and required checks without a replacement procedure
And no suitable match proceeds directly without a question
And named requests, authorized calls and exempt entries need no extra procedure-choice question
And the same task preserves its answer through follow-up, delegation and recovery without re-asking
And ordinary wording alone does not authorize heavy procedures
And commit and pull-request retain their existing triggers
And generic discovery guidance and self-started agents cannot widen authorization
```

**Expected Result:** Guidance delivers the run-or-direct choice and its wait, scope, skip, no-match
and same-task preservation boundaries; exempt entry triggers remain.
**Acceptance Criteria:** AC-SAP-01, AC-SAP-02, AC-SAP-06.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** A repeated prompt refreshes guidance rather than relying on an earlier context copy.
**Evidence:** [Source: event/SkillActivationPolicy/Prompt]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-003` · **Status:** Tested

### TC-SAP-004: Commit review selection and its required chain remain eligible [P0]

**Objective:** Keep commit quality gates reachable while preserving human review choice.
**Business Intent / Invariant Guarded:** BR-SAP-02, BR-SAP-03 / AC-SAP-04, AC-SAP-05.
**Preconditions:** Restricted mode and a human commit request.

```gherkin
Given automatic selection is restricted
When the human requests a commit
Then the real commit route still instructs use of the commit procedure
And the policy preserves the required human review-choice question
And the selected review and its required nested reviewers remain authorized
And the policy approves neither a review choice nor a skip
```

**Expected Result:** Commit review choice is preserved and the selected required chain remains eligible.
**Acceptance Criteria:** AC-SAP-04, AC-SAP-05.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** Optional unrelated review work stays outside the authorization; native access restrictions
continue to apply. This case verifies route and policy output, not a paid model's complete commit execution.
**Evidence:** [Source: event/SkillActivationPolicy/CommitDependency]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-004` · **Status:** Tested

### TC-SAP-005: Refresh and restoration work across conversation lifecycles [P1]

**Objective:** Keep effective guidance current without losing it when delivery records are unavailable.
**Business Intent / Invariant Guarded:** BR-SAP-05 / AC-SAP-08, AC-SAP-09.
**Preconditions:** Restricted preference and main/delegated conversation scopes.

```gherkin
Given restricted mode has been delivered
When prompts, delegated starts or recovery notifications arrive
Then the current restriction is delivered again
When the preference is removed
Then a restoration notice replaces the earlier restriction in each scope
And subsequent automatic-mode events stay silent
```

**Expected Result:** Restrictions refresh and removal emits one restoration per scope.
**Acceptance Criteria:** AC-SAP-08, AC-SAP-09.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** Missing conversation identity and an unusable record store still deliver restrictions;
unrelated notifications are silent.
**Evidence:** [Source: event/SkillActivationPolicy/Recovery]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-005` · **Status:** Tested

### TC-SAP-006: Restricted selection suppresses competing workflow suggestions [P0]

**Objective:** Avoid contradictory workflow-start instructions.
**Business Intent / Invariant Guarded:** BR-SAP-06 / AC-SAP-03.
**Preconditions:** Restricted skill selection and otherwise automatic workflow routing.

```gherkin
Given automatic skill selection is restricted
When an ordinary request reaches the workflow router
Then no automatic workflow catalog or route-choice question is suggested
And a suitable unrequested candidate follows the single procedure-choice question
And user confirmation authorizes that candidate under the shared policy
And named requests and required calls remain eligible under existing restrictions
```

**Expected Result:** No competing automatic workflow suggestion or route-choice question is emitted.
**Acceptance Criteria:** AC-SAP-03.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** A separate explicit restriction on workflow routing remains authoritative.
**Evidence:** [Source: event/SkillActivationPolicy/WorkflowRoute]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-006` · **Status:** Tested

### TC-SAP-007: The third-host adapter delivers live policy and keeps commit routing [P0]

**Objective:** Prove real adapter delivery, including delegated work and a personal preference change.
**Business Intent / Invariant Guarded:** BR-SAP-02, BR-SAP-03, BR-SAP-05 / AC-SAP-05, AC-SAP-08, AC-SAP-09.
**Preconditions:** A generated third-host adapter and isolated preference files.

```gherkin
Given restricted selection and the real policy and commit routes
When ordinary and commit requests enter the adapter
Then the confirmation-or-direct guidance and commit route are delivered
And the choice waits for the human and preserves scoped authorization and the same-task answer
When delegated work obtains its system instructions without a user-message notification
Then it receives the live restriction
When a personal preference restores automatic selection
Then cached startup restrictions are not replayed over the restoration
```

**Expected Result:** Live main and delegated adapter context reflects the effective preference.
**Acceptance Criteria:** AC-SAP-05, AC-SAP-08, AC-SAP-09.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** The steady automatic state remains silent; repeated policy delivery yields one current
system-policy copy. Model compliance is outside this deterministic delivery test.
**Evidence:** [Source: event/SkillActivationPolicy/ThirdHostDelivery]
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-hooks.test.mjs::TC-SAP-007` · **Status:** Tested

### TC-SAP-008: Prompt classifiers retain inline checks without authorizing reviewers [P0]

**Objective:** Prevent a generic verdict or specialized implementation prompt from starting a heavy reviewer.
**Business Intent / Invariant Guarded:** BR-SAP-02, BR-SAP-06 / AC-SAP-01, AC-SAP-03.
**Preconditions:** Restricted preference and otherwise enabled prompt classifiers.

```gherkin
Given automatic procedure selection is restricted
When an ordinary verdict or specialized review request matches a classifier
Then the guidance retains its inline reasoning checks
And it does not authorize a heavy reviewer or reviewer agent
And required calls from an already authorized operation remain eligible
```

**Expected Result:** Inline checks remain and generic classifiers do not authorize a reviewer.
**Acceptance Criteria:** AC-SAP-01, AC-SAP-03.
**Test Data:** Isolated project, personal preference layers and the requests shown above.
**Related Behaviors:** Named operation authorization and preference resolution.
**Edge Cases:** Specialized guidance remains within its existing size budget.
**Evidence:** [Source: event/SkillActivationPolicy/PromptClassifier]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-008` · **Status:** Tested

### TC-SAP-009: Configuration help remains discoverable under restricted selection [P0]

**Objective:** Let adopters discover, explain and change framework preferences without memorizing keys.
**Business Intent / Invariant Guarded:** BR-SAP-01 / AC-SAP-01.
**Preconditions:** Restricted selection and the lightweight configuration entry.

```gherkin
Given heavy procedure selection is restricted
When the user asks about the framework or its settings
Then the configuration entry remains eligible for automatic selection
And questions remain read-only
When the user requests a preference change
Then the selected scope is merged and validated
And reset removes only the selected preference
```

**Expected Result:** The configuration entry stays discoverable in restricted mode and minimal visibility.
**Acceptance Criteria:** AC-SAP-01; authorized nested workflow behavior remains intact.
**Test Data:** Canonical configuration entry, visibility preset and restricted policy output.
**Related Behaviors:** Personal preference resolution and scope-limited changes.
**Edge Cases:** An explicit native permission override remains authoritative; ambiguous changes use checkout scope.
**Evidence:** [Source: event/SkillActivationPolicy/ConfigurationEntry]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-009` · **Status:** Tested

### TC-SAP-010: Consolidated configuration preserves workflow session behavior [P0]

**Objective:** Preserve workflow session selection while providing one configuration entry.
**Business Intent / Invariant Guarded:** BR-SAP-04, BR-SAP-05 / AC-SAP-07, AC-SAP-08.
**Preconditions:** A real isolated project and conversation identity.

```gherkin
Given the unified configuration entry selects workflow mode
When a session-only route change is requested
Then the prompt hook records the chosen route for that conversation
And no team or personal preference file is written
When the conversation preference is reset
Then the lower preference layers decide again
```

**Expected Result:** Session changes and reset retain scope and legacy directive compatibility.
**Acceptance Criteria:** AC-SAP-07, AC-SAP-08.
**Test Data:** Both host command prefixes, real session identity, missing identity and team-scope inputs.
**Related Behaviors:** Workflow routing precedence and scope isolation.
**Edge Cases:** Prose and persistence commands do not silently become session directives; missing identity refuses a session write.
**Evidence:** [Source: event/SkillActivationPolicy/UnifiedWorkflowMode]
> **CoveredBy:** `.claude/hooks/tests/suites/skill-activation-policy.test.cjs::TC-SAP-010` · **Status:** Tested
