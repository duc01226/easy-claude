---
module: 'hooks'
service: 'framework.AssistantSessionNotifications'
feature_code: 'NT'
entities: ['AssistantSession', 'Alert', 'Question']
status: draft
owner: 'Framework maintainers'
last_updated: '2026-09-24'
scope_mode: FRAMEWORK-LIBRARY
---

## Related Documentation

| Type                      | Path                                                                                                                                                                        | Description                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Spec Index (derived)      | `docs/specs/Notifications/INDEX.md`                                                                                                                                         | Generated navigation catalog for this bucket; refresh through the spec index owner.                   |
| Claude Code hook settings | `.claude/settings.json`                                                                                                                                                     | First supported assistant (gives direct question signals): session-end and direct question alerts.    |
| Codex hook configuration  | `.codex/hooks.json`                                                                                                                                                         | Second supported assistant (gives no direct question signal): session-end and turn-completion alerts. |
| OpenCode hook bridge      | `.claude/scripts/opencode/templates/easy-claude-hooks.js.tmpl`                                                                                                              | Third supported assistant (gives direct question signals): session-end and question hook events.      |
| Remote chat channel setup | `.claude/hooks/notifications/docs/discord-hook-setup.md`, `.claude/hooks/notifications/docs/slack-hook-setup.md`, `.claude/hooks/notifications/docs/telegram-hook-setup.md` | How a developer configures an optional remote chat channel.                                           |
| Hook behavior guide       | `.claude/docs/hooks/README.md`                                                                                                                                              | Framework hook behavior and user-facing guidance.                                                     |
| Hook test suites          | `.claude/hooks/tests/suites/notification.test.cjs`, `.claude/hooks/tests/suites/desktop-argv.test.cjs`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs`                | Notification routing, desktop alerts, and the generated OpenCode bridge.                              |

# Assistant Session Notifications — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability; a Business Analyst, QA/QC engineer, or AI understands the whole capability from one read.
> **No technical terms in prose.** Implementation names and file paths appear only in frontmatter, Related Documentation, and the Section 8 machine-only carriers.

## Sections

1. [Overview](#1-overview)
2. [Glossary](#2-glossary)
3. [User Stories & Acceptance Criteria](#3-user-stories--acceptance-criteria)
4. [Business Rules](#4-business-rules)
5. [Domain Model](#5-domain-model)
6. [Process Flows](#6-process-flows)
7. [Permissions & Roles](#7-permissions--roles)
8. [Test Specifications](#8-test-specifications)

---

## 1. Overview

Alerts tell developers when the main assistant conversation ends, when the assistant needs an answer, and when a turn finishes, so they can return to finished work or answer without watching the screen. Alerts appear on the desktop and on any remote chat channel the developer has configured, and never carry what the assistant wrote.

---

## 2. Glossary

| Term                   | Definition                                                                                             | Context                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Assistant session      | One conversation in which an assistant works with a developer.                                         | Has either a main conversation or a delegated conversation.                  |
| Main conversation      | The developer's primary working conversation with the assistant.                                       | Only its end produces a main-session-ended alert.                            |
| Delegated conversation | A separate conversation in which the assistant handles delegated work.                                 | Its end does not end the main conversation.                                  |
| Alert channel          | A place an alert is delivered: the developer's desktop, or a remote chat channel.                      | Desktop is on unless the developer turns it off; remote channels are opt-in. |
| Remote chat channel    | A team or personal chat destination the developer has configured to receive alerts.                    | Receives the same alert kinds with the same meaning as the desktop.          |
| Workspace name         | The name of the project folder the conversation runs in.                                               | Every alert names it so the developer knows which conversation to open.      |
| Session-ended alert    | An alert that says the main conversation has ended.                                                    | Distinct from an alert for a completed assistant turn.                       |
| Question alert         | An attention-seeking alert that says the assistant has a question and asks the developer to answer it. | Names the workspace; the question itself is read in the conversation.        |
| Turn-complete alert    | The alert that says the assistant has finished its turn and the conversation is still open.            | Never mentions a session ending or a question.                               |
| Reply text             | What the assistant wrote in its response.                                                              | Never included in any alert on any channel.                                  |
| Supported assistants   | Three assistants, listed first, second, and third in Related Documentation.                            | The first and third give direct question signals; the second gives none.     |
| Final question mark    | A question mark that is the last non-whitespace character of the assistant's completed response.       | Used only on assistants that give no direct signal when they ask a question. |
| Direct question signal | The assistant's own indication that it is asking the developer a question.                             | Some supported assistants give it; others give none.                         |
| Conversation reset     | The developer clears the main conversation to start afresh in the same workspace.                      | Not treated as a finished session.                                           |
| Blocking alert         | An alert that stays until the developer acknowledges it.                                               | A non-blocking alert appears and goes away on its own.                       |

---

## 3. User Stories & Acceptance Criteria

### US-NT-01: Know when the main conversation has ended

**As a** developer working with an assistant  
**I want** an alert when the main conversation ends  
**So that** I can return to the completed work without monitoring the conversation continuously

**Acceptance Criteria:**

- **AC-NT-01** — **Given** the desktop alert channel is on and the main conversation is active **When** the main conversation ends **Then** exactly one session-ended alert is shown on the desktop.
- **AC-NT-02** — **Given** delegated work is active **When** its separate conversation ends while the main conversation remains active **Then** no main-session-ended alert is shown.
- **AC-NT-03** — **Given** the main conversation remains open **When** an assistant turn finishes **Then** no session-ended alert is shown.
- **AC-NT-07** — **Given** the main conversation is active **When** the developer resets the conversation to start afresh **Then** no session-ended alert is shown; an end for any other reason, or with no reason reported, still shows one.

### US-NT-02: Notice when the assistant needs an answer

**As a** developer working with an assistant  
**I want** an alert when the assistant asks me a question  
**So that** I can provide the requested response promptly

**Acceptance Criteria:**

- **AC-NT-04** — **Given** the assistant directly asks the developer a question **When** the question is presented **Then** one question alert is shown that says the assistant has a question and names the workspace.
- **AC-NT-05** — **Given** the second supported assistant, which gives no direct signal when it asks a question **When** its completed response ends in a final question mark, ignoring trailing whitespace **Then** one non-blocking question alert is shown.
- **AC-NT-06** — **Given** a completed response not classified as a question (neither a direct question signal nor a qualifying final question mark) **When** the turn finishes **Then** no question alert is shown, and the ordinary turn-complete alert remains available.

### US-NT-03: Receive alerts away from the desk, without exposing the conversation

**As a** developer working with an assistant
**I want** the same alerts on a remote chat channel I configured, with none of the assistant's reply text
**So that** I notice finished work or a pending question away from the desktop without leaking conversation content to that channel

**Acceptance Criteria:**

- **AC-NT-08** — **Given** a remote chat channel is configured **When** a session-ended, question, or turn-complete alert is raised **Then** that channel receives exactly one alert of that kind, with the same title and meaning as the desktop alert, naming the workspace — even when the desktop alert channel is off.
- **AC-NT-09** — **Given** the assistant's reply text is available when an alert is raised (including a reply used to recognise a question) **When** the alert is delivered on any channel **Then** the alert contains none of that reply text.

---

## 4. Business Rules

### Rule Catalog

| Rule ID  | Name                                      | Category             | Enforcement |
| -------- | ----------------------------------------- | -------------------- | ----------- |
| BR-NT-01 | Main-conversation ownership               | Alert scope          | [HARD]      |
| BR-NT-02 | Direct question alerts                    | User response        | [HARD]      |
| BR-NT-03 | Final question-mark fallback              | Question recognition | [HARD]      |
| BR-NT-04 | Distinct turn-completion alerts           | Alert meaning        | [HARD]      |
| BR-NT-05 | A conversation reset is not a session end | Alert scope          | [HARD]      |
| BR-NT-06 | One alert per enabled channel             | Alert delivery       | [HARD]      |
| BR-NT-07 | Alerts never carry reply text             | Alert content        | [HARD]      |

### BR-NT-01: Main-conversation ownership [HARD]

**Statement:** Ending the main conversation produces exactly one session-ended alert on each enabled alert channel (BR-NT-06), except a conversation reset (BR-NT-05). Neither a delegated conversation ending nor an assistant turn finishing while the main conversation stays open produces one. When the system cannot tell whether an ended conversation was the main one, it treats the end as not proven main and shows no session-ended alert.

```
IF the main conversation ends AND the end is not a conversation reset
  → SHOW exactly one session-ended alert per enabled alert channel
ELSE IF a delegated conversation ends OR only an assistant turn finishes OR the developer reset the conversation
     OR the ended conversation cannot be identified as the main one
  → SHOW no main-session-ended alert
```

### BR-NT-02: Direct question alerts [HARD]

**Statement:** A direct question from the assistant raises one question alert per enabled alert channel. Its title says the assistant has a question, its message asks the developer to check and answer, and it names the workspace whose conversation holds the question. The question wording itself is not shown in the alert; the developer reads and answers it in that conversation.

### BR-NT-03: Final question-mark fallback [HARD]

**Statement:** Applies only on assistants that give no direct question signal. There, a completed response is a question only if its last non-whitespace character is `?`; any other ending is not, even when it implies a request. Fallback question alerts are non-blocking because the classification is inferred from text; direct question alerts may block. On assistants that give direct question signals, a response ending in `?` without a direct signal stays an ordinary turn completion.

| Assistant gives direct question signals | Direct question signal | Last non-whitespace character         | Classification             |
| --------------------------------------- | ---------------------- | ------------------------------------- | -------------------------- |
| Yes                                     | Present                | Any                                   | Question (may be blocking) |
| Yes                                     | Absent                 | Any                                   | Not a question             |
| No                                      | —                      | `?`                                   | Question (non-blocking)    |
| No                                      | —                      | Any other character or empty response | Not a question             |

### BR-NT-04: Distinct turn-completion alerts [HARD]

**Statement:** A completed turn not classified as a question keeps the turn-complete alert. Its title and message say the assistant finished its turn and the conversation is still open; they never say or suggest that the session completed or ended, and never read as a question.

### BR-NT-05: A conversation reset is not a session end [HARD]

**Statement:** Resetting the main conversation to start afresh shows no session-ended alert — the developer caused the end and is present. Every other main-conversation end still alerts, including one whose reason the assistant does not report.

```
IF the main conversation ends because the developer reset it
  → SHOW no session-ended alert
ELSE IF the main conversation ends for any other or an unreported reason
  → SHOW exactly one session-ended alert (BR-NT-01)
```

### BR-NT-06: One alert per enabled channel [HARD]

**Statement:** The desktop alert channel is on unless the developer turns it off; each remote chat channel is on only when the developer has configured it. Every alert this capability raises is delivered once to each enabled channel, except a remote chat channel paused after a failure or left without time while the conversation ends (below), and every channel gives an alert kind the same title and meaning. "Exactly one alert" anywhere in this spec means exactly one per enabled channel. Turning the desktop channel off stops desktop alerts only; configured remote chat channels still receive theirs. A channel that fails or is slow never delays or prevents delivery on the other channels.

A remote chat channel that does not answer within two seconds is abandoned for that one alert only: the alert may or may not have arrived, so the channel is not paused and the next alert still tries it. A remote chat channel that reports a failure — it rejects the alert, refuses the connection, or cannot be found — is paused for five minutes; alerts for that channel are dropped while it is paused, then it is tried again. While the main conversation is ending, the assistant allows only a short time to finish, so a session-ended alert on a remote chat channel gets only the part of that time still left; when none is left, that alert is skipped on that channel and the channel is not paused.

```
FOR EACH alert raised
  FOR EACH enabled alert channel
    IF the channel is paused after a failure
      → SKIP that channel for this alert
    ELSE IF the main conversation is ending AND no time is left to deliver it
      → SKIP that channel for this alert; do NOT pause the channel
    ELSE
      → DELIVER exactly one alert of that kind, with the shared title and meaning
      IF the channel does not answer within two seconds (or within the time left while the conversation ends)
        → ABANDON this alert on that channel; do NOT pause the channel
      ELSE IF the channel reports a failure
        → PAUSE the channel for five minutes
```

### BR-NT-07: Alerts never carry reply text [HARD]

**Statement:** An alert contains only its kind's title and message, the workspace name, and — on remote chat channels — the time, a shortened conversation reference, and the workspace location. It never contains any of the assistant's reply text, including a reply that was read to recognise a final question mark (BR-NT-03).

```
IF an alert is delivered on any channel
  → CONTENT = title + message + workspace name (+ time, shortened conversation reference, location on remote chat channels)
  → CONTENT never includes the assistant's reply text
```

---

## 5. Domain Model

### Relationships (overview)

| From              | To                     | Relationship         | Business Meaning                                                                       |
| ----------------- | ---------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| Developer         | Main conversation      | Participates in      | The developer's primary working conversation.                                          |
| Main conversation | Delegated conversation | May delegate work to | Delegated work can finish while the main conversation stays open.                      |
| Assistant session | Alert                  | May cause            | A main session end, a user question, or a completed turn may produce a distinct alert. |

### Entity: Assistant Session

| Property          | Type | Required | Constraints       | Business Meaning                                           |
| ----------------- | ---- | -------- | ----------------- | ---------------------------------------------------------- |
| Conversation kind | enum | Yes      | Main or delegated | Identifies which conversation boundary the alert concerns. |

### Entity: Alert

| Property   | Type | Required | Constraints                                               | Business Meaning                                           |
| ---------- | ---- | -------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Alert kind | enum | Yes      | Session ended, question, or turn complete                 | Tells the developer what action or status needs attention. |
| Channel    | enum | Yes      | Desktop or a configured remote chat channel               | Where the developer receives the alert.                    |
| Message    | text | Yes      | Must make the alert kind clear; never contains reply text | Summarizes why the developer is being notified.            |
| Workspace  | text | Yes      | The workspace name                                        | Tells the developer which conversation to open.            |

### Entity: Question

| Property                 | Type   | Required | Constraints                        | Business Meaning                                                    |
| ------------------------ | ------ | -------- | ---------------------------------- | ------------------------------------------------------------------- |
| Needs developer response | yes-no | Yes      | Yes when a question alert is shown | States whether the assistant is waiting for the developer's answer. |

### Domain Events (business occurrences)

| Occurrence                               | When it happens                                                         | Who/what reacts (business outcome)                                |
| ---------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Main conversation ended                  | The developer's primary assistant conversation ends.                    | The developer receives one session-ended alert.                   |
| Delegated conversation ended             | Delegated work finishes while the main conversation may continue.       | No main-session-ended alert is produced.                          |
| Developer reset the conversation         | The developer clears the main conversation to start afresh.             | No session-ended alert is produced.                               |
| Assistant asked the developer a question | The assistant requests information or a decision.                       | The developer receives a question alert and can return to answer. |
| Assistant turn completed                 | The assistant finishes a response without ending the main conversation. | The existing turn-complete alert remains distinct.                |

---

## 6. Process Flows

### 6.1 Flow: Main conversation ends

| Step | Actor     | Action                                             | System Response                                                     | Next |
| ---- | --------- | -------------------------------------------------- | ------------------------------------------------------------------- | ---- |
| 1    | Developer | Works with the assistant in the main conversation. | The conversation remains available.                                 | 2    |
| 2    | Developer | Ends the main conversation.                        | One session-ended alert is presented on each enabled alert channel. | 3    |
| 3    | Developer | Returns to the alert or completed work.            | The alert identifies that the main conversation ended.              | End  |

A delegated conversation ending first causes no main-session-ended alert. A reset instead of an end shows no alert at step 2 (BR-NT-05).

### 6.2 Flow: Assistant asks a question

| Step | Actor     | Action                                                                                                         | System Response                                                                                   | Next |
| ---- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| 1    | Assistant | Asks the developer a direct question, or provides a completed response that qualifies under the fallback rule. | One question alert per enabled channel says the assistant has a question and names the workspace. | 2    |
| 2    | Developer | Returns to the conversation in the workspace named by the alert.                                               | The question is available for the developer to answer.                                            | 3    |
| 3    | Developer | Provides the requested response.                                                                               | Work can continue with that answer.                                                               | End  |

### 6.3 View Inventory

| View                        | Purpose                                                | Key content                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session-ended alert         | Show that the main conversation has ended.             | A clear session-ended title, short message, and the workspace name.                                                                                           |
| Question alert              | Bring a pending question to the developer's attention. | A title saying the assistant has a question, a message asking the developer to check and answer, and the workspace name.                                      |
| Turn-complete alert         | Preserve the notice that an assistant turn finished.   | A title and message saying the turn finished and the conversation is still open, with the workspace name.                                                     |
| Remote chat channel message | Carry any of the alerts above away from the desk.      | The same title and message as the desktop alert, the workspace name, time, a shortened conversation reference, and the workspace location — never reply text. |

### 6.4 Navigation Map

| From                | User action                                           | To                                            |
| ------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Question alert      | Open or return to the referenced conversation.        | The question awaiting the developer's answer. |
| Session-ended alert | Open or return to the completed work if desired.      | The completed main conversation.              |
| Turn-complete alert | Open or return to the active conversation if desired. | The conversation after the completed turn.    |

### 6.5 Key UI States

| State                        | Entry condition                                                                            | What the developer sees                              | Next action                               |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| Main conversation active     | Work is in progress.                                                                       | No session-ended alert.                              | Continue working or end the conversation. |
| Main conversation ended      | The main conversation ends and at least one alert channel is enabled.                      | Exactly one session-ended alert per enabled channel. | Return to the completed work.             |
| Delegated conversation ended | Delegated work ends while the main conversation remains open.                              | No main-session-ended alert.                         | Continue the main conversation.           |
| Conversation reset           | The developer resets the main conversation to start afresh.                                | No session-ended alert.                              | Continue in the fresh conversation.       |
| Question needs an answer     | A direct question is asked or the fallback rule classifies the response as a question.     | One question alert.                                  | Return to the conversation and answer.    |
| Ordinary turn completed      | A response finishes without a question classification while the conversation remains open. | The existing turn-complete alert.                    | Continue in the conversation.             |

### 6.6 Per-Story Interaction Flow

**US-NT-01 — Main conversation end:** Work in the main conversation → end it → one session-ended alert. Delegated work ending while it stays open, or a reset → no session-ended alert.

**US-NT-02 — Question alert:** Direct question, or (on an assistant without direct question signals) a response ending in `?` ignoring trailing whitespace → one question alert (non-blocking for the fallback) → developer returns and answers. Any other response stays an ordinary turn completion.

**US-NT-03 — Remote chat channel:** Configure a remote chat channel → each alert arrives there once with the same title and meaning as on the desktop, naming the workspace and never quoting the assistant's reply.

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                | View | Create | Respond | Scope                                                                                                                           |
| ------------------- | :--: | :----: | :-----: | ------------------------------------------------------------------------------------------------------------------------------- |
| Developer           | yes  |   no   |   yes   | Receives alerts, turns the desktop channel off or on, chooses which remote chat channels receive alerts, and answers questions. |
| Main assistant      | yes  |   no   |   no    | May cause a question alert, a turn-complete alert, or a session-ended alert when the main conversation ends.                    |
| Delegated assistant | yes  |   no   |   no    | Its session end cannot cause a main-session-ended alert.                                                                        |

---

## 8. Test Specifications

> Observable surface: the developer's desktop alert, question prompt, or a configured remote chat channel message. "One alert" means one per enabled channel (BR-NT-06). No case creates or changes business data. `Untested` = no executable coverage recorded yet.

### Test Summary

| Priority  |  Count | Automated | Manual |
| --------- | -----: | --------: | -----: |
| P0        |      0 |         0 |      0 |
| P1        |     12 |        12 |      0 |
| P2        |      0 |         0 |      0 |
| **Total** | **12** |    **12** |  **0** |

| Category                              | TCs                                                   |
| ------------------------------------- | ----------------------------------------------------- |
| Main Conversation Outcomes            | TC-NT-001, TC-NT-002, TC-NT-003, TC-NT-004            |
| Question and Turn-Completion Outcomes | TC-NT-011, TC-NT-012, TC-NT-013                       |
| Invariant / Property Tests            | TC-NT-071, TC-NT-072, TC-NT-073, TC-NT-074, TC-NT-075 |

### Main Conversation Outcomes

#### TC-NT-001: Ending the main conversation shows one session-ended alert [P1]

**Objective:** Verify one clear alert when the main conversation ends.

**Business Intent / Invariant Guarded:** A developer can tell when the main assistant conversation has ended.

**Proves:** AC-NT-01

**Preconditions:**

- The desktop alert channel is on.
- A main assistant conversation is active.

**Real-World Reachability:** Developer opens a supported assistant workspace, completes a task, ends the main conversation, and checks the desktop alert immediately.

**Demo Flow:** Complete work, end the main conversation, observe the alert.

```gherkin
Given the desktop alert channel is on and the main conversation is active
When the developer ends the main conversation
Then exactly one session-ended alert appears on the desktop
And its message makes clear that the main conversation ended
```

**Expected Result:**

| Dimension               | Expectation                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| **UI**                  | One non-modal session-ended desktop alert.                                |
| **System behavior**     | The main conversation ending produces one alert.                          |
| **Business data state** | Not applicable — no business data are created or changed.                 |
| **Data shown on UI**    | A title and message that clearly identify the main conversation as ended. |

**Acceptance Criteria:**

- ✅ One session-ended alert appears on the desktop after the main conversation ends.
- ❌ More than one desktop alert for the same end, a missing alert, or wording implying only a turn finished.

**Test Data:**

- Active main conversation; desktop alert channel on.

**Edge Cases:**

- Developer turned the desktop channel off → no desktop alert; a configured remote chat channel still receives its one alert (TC-NT-073).

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: operation/hooks/claude-session-ended-alert]`

**Related Behaviors:**

| Capability                  | Anchor                         |
| --------------------------- | ------------------------------ |
| Main conversation ownership | `rule/hooks/main-session-only` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-001] main SessionEnd reaches notification routing`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-001][TC-NT-002] main SessionEnd uses a literal, nonblocking alert on mocked hosts`  
**Status:** Tested

#### TC-NT-002: The other supported assistant also shows one main-session alert [P1]

**Objective:** Verify the same main-conversation end outcome in the second supported assistant (listed second in Related Documentation).

**Business Intent / Invariant Guarded:** Session-ended alert is consistent across supported assistant workspaces.

**Proves:** AC-NT-01

**Preconditions:**

- The desktop alert channel is on.
- Alerts are set up for the second supported assistant, and a main conversation with it is active in a workspace.

**Real-World Reachability:** Developer completes work with the second supported assistant, ends the main conversation, and observes the desktop alert immediately.

**Demo Flow:** Open the workspace with the second supported assistant; complete a small task; end the main conversation; observe the alert and compare its title and message with the one TC-NT-001 shows for the first supported assistant.

```gherkin
Given the desktop alert channel is on and a main conversation with the second supported assistant is active
When the developer ends that main conversation
Then exactly one session-ended alert appears on the desktop
And its title and message match the session-ended alert of the first supported assistant
```

**Expected Result:**

| Dimension               | Expectation                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| **UI**                  | One non-modal session-ended desktop alert.                                |
| **System behavior**     | The second supported assistant produces the same main-session outcome.    |
| **Business data state** | Not applicable — no business data are created or changed.                 |
| **Data shown on UI**    | A title and message that clearly identify the main conversation as ended. |

**Acceptance Criteria:**

- ✅ Exactly one session-ended alert appears after the main conversation ends, with the same title and message as for the first supported assistant.
- ❌ The conversation ends silently or shows an alert meaning something else.

**Test Data:**

- Active main conversation with the second supported assistant; desktop alert channel on.

**Edge Cases:**

- System preference suppresses alerts → visibility follows it.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: operation/hooks/codex-session-ended-alert]`

**Related Behaviors:**

| Capability                  | Anchor                         |
| --------------------------- | ------------------------------ |
| Main conversation ownership | `rule/hooks/main-session-only` |

**CoveredBy:** `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-001][TC-NT-002] main SessionEnd uses a literal, nonblocking alert on mocked hosts`, `.claude/scripts/codex/tests/verify-sync-divergence.test.mjs::TC-HOOKMIRROR-003: a fresh render produces exactly the expected hook surface`  
**Status:** Tested

#### TC-NT-003: Ending delegated work does not alert that the main conversation ended [P1]

**Objective:** Verify delegated work cannot produce a false main-session-ended alert.

**Business Intent / Invariant Guarded:** A developer is not told the main conversation ended while it remains open.

**Proves:** AC-NT-02

**Preconditions:**

- Desktop alerts are enabled.
- A main conversation is active and has delegated work in progress.

**Real-World Reachability:** Developer delegates a bounded task while continuing the main conversation; the task finishes before the main conversation ends.

**Demo Flow:** Delegate work, let it finish, observe before ending the main conversation.

```gherkin
Given the main conversation remains active while delegated work is in progress
When the delegated conversation ends
Then no main-session-ended alert appears
And the developer can continue the main conversation
```

**Expected Result:**

| Dimension               | Expectation                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **UI**                  | No main-session-ended alert appears when only delegated work ends.                  |
| **System behavior**     | The delegated conversation's end is kept separate from the main conversation's end. |
| **Business data state** | Not applicable — no business data are created or changed.                           |
| **Data shown on UI**    | No message claims that the main conversation ended.                                 |

**Acceptance Criteria:**

- ✅ The main conversation remains available without a session-ended alert.
- ❌ A session-ended alert is shown before the developer ends the main conversation.

**Test Data:**

- One active main conversation and one delegated conversation that ends first.

**Edge Cases:**

- Several delegated conversations finish while the main conversation stays open → none produces a main-session-ended alert.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/main-session-only]`

**Related Behaviors:**

| Capability                  | Anchor                                       |
| --------------------------- | -------------------------------------------- |
| Main conversation end alert | `operation/hooks/claude-session-ended-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-003] SessionEnd carrying agent_id is suppressed`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-071] SessionEnd eligibility is restricted to the main conversation`  
**Status:** Tested

#### TC-NT-004: A conversation reset does not raise a session-ended alert [P1]

**Objective:** Verify resetting the main conversation raises no session-ended alert.

**Business Intent / Invariant Guarded:** A user-initiated conversation reset does not raise a session-ended alert; every other main-conversation end still does.

**Proves:** AC-NT-07 / BR-NT-05

**Preconditions:**

- Desktop alerts are enabled.
- A main assistant conversation is active.

**Real-World Reachability:** Developer finishes a task, resets the conversation to start the next in the same workspace, later ends it normally.

**Demo Flow:** Reset → no alert; end normally → one session-ended alert.

```gherkin
Given desktop alerts are enabled and the main conversation is active
When the developer resets the conversation to start afresh
Then no session-ended alert appears
When the developer later ends the main conversation normally
Then exactly one session-ended alert appears
```

**Expected Result:**

| Dimension               | Expectation                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **UI**                  | No alert on reset; one non-blocking session-ended alert on a normal end.                 |
| **System behavior**     | Only the reset reason suppresses the alert; any other or unreported reason still alerts. |
| **Business data state** | Not applicable — no business data are created or changed.                                |
| **Data shown on UI**    | Nothing on reset; the usual session-ended title and message on a normal end.             |

**Acceptance Criteria:**

- ✅ A reset shows no session-ended alert.
- ✅ An end for any other reason, or with no reason reported, shows exactly one session-ended alert.
- ❌ A reset raises a session-ended alert, or a normal end is silently dropped.

**Test Data:**

- End reasons: reset; exit; sign-out; other; not reported.

**Edge Cases:**

- Assistant does not report why the conversation ended → real end; one alert.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/conversation-reset-not-session-end]`

**Related Behaviors:**

| Capability                  | Anchor                                       |
| --------------------------- | -------------------------------------------- |
| Main conversation ownership | `rule/hooks/main-session-only`               |
| Main conversation end alert | `operation/hooks/claude-session-ended-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-004] conversation reset raises no session-ended alert`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-004] only a conversation reset suppresses a main SessionEnd`  
**Status:** Tested

### Question and Turn-Completion Outcomes

#### TC-NT-011: A direct question produces the existing question alert [P1]

**Objective:** Verify a direct question stays visible through its established question experience.

**Business Intent / Invariant Guarded:** A direct request for the developer's response is not missed or mistaken for ordinary completion.

**Proves:** AC-NT-04

**Preconditions:**

- The developer's desktop alert and question experience are enabled.
- The assistant is ready to ask the developer a direct question.

**Real-World Reachability:** During normal work the assistant needs the developer to choose or provide information; the alert is observed as the question appears.

**Demo Flow:** Continue a task needing developer input; observe the question alert.

```gherkin
Given the assistant needs the developer to answer a direct question
When the assistant presents the question
Then one question alert says that a response is needed
And the developer can return to the question and answer it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | The established question presentation appears and calls for the developer's attention.                                                                     |
| **System behavior**     | One question alert accompanies the direct question.                                                                                                        |
| **Business data state** | Not applicable — no business data are created or changed.                                                                                                  |
| **Data shown on UI**    | Title "has a question", a message asking the developer to check and answer, and the workspace name; the question wording appears only in the conversation. |

**Acceptance Criteria:**

- ✅ One question alert appears and the developer can respond in the conversation.
- ❌ The question is presented without the existing attention alert or is marked as a completed session.

**Test Data:**

- Direct question: “Which option should I use?”

**Edge Cases:**

- Developer not yet back in the conversation → question alert stays distinguishable from a turn-complete alert.
- The third supported assistant starts its question step and then presents the question → exactly one question alert, raised when the question is presented, not two.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: operation/hooks/claude-user-question-alert]`

**Related Behaviors:**

| Capability            | Anchor                                       |
| --------------------- | -------------------------------------------- |
| Direct question alert | `operation/hooks/claude-user-question-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-011] router preserves the direct PreToolUse AskUserQuestion path`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-HARNESS-003][TC-NT-011][TC-NT-013] direct questions and ordinary Stop keep their existing dialogs`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs::[TC-NT-011] generated bridge forwards question requests to the notification hook`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-011] deferred question precursor is suppressed while direct question remains eligible`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs::[TC-NT-011] generated bridge defers only the question tool precursor so one question alert is raised`  
**Status:** Tested

#### TC-NT-012: A final question mark triggers the question alert [P1]

**Objective:** Verify the text-based fallback on the second supported assistant, which gives no direct signal when it asks a question.

**Business Intent / Invariant Guarded:** On such an assistant, a clearly punctuated final question receives a non-blocking attention alert while ordinary completion remains distinguishable.

**Proves:** AC-NT-05 / BR-NT-03

**Preconditions:**

- The desktop alert channel is on.
- A main conversation with the second supported assistant (no direct question signals) is active.
- The assistant's completed response ends with a question mark followed only by whitespace.

**Real-World Reachability:** During a normal task the assistant ends a response with a clear question; the developer observes the alert immediately.

**Demo Flow:** With the second supported assistant, ask it to finish its reply with exactly “Should I continue?”; when the turn ends, observe one non-blocking question alert and no turn-complete alert.

```gherkin
Given the second supported assistant, which gives no direct signal when it asks a question
And its completed response's last non-whitespace character is a question mark
When the response finishes
Then exactly one non-blocking question alert appears
And it is not presented as an ordinary turn-complete alert
```

**Expected Result:**

| Dimension               | Expectation                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **UI**                  | One non-blocking question alert appears; it does not wait for acknowledgment.             |
| **System behavior**     | Trailing whitespace is ignored when checking the final response character.                |
| **Business data state** | Not applicable — no business data are created or changed.                                 |
| **Data shown on UI**    | The question alert's title and message and the workspace name; none of the response text. |

**Acceptance Criteria:**

- ✅ A final `?`, followed only by whitespace, produces one non-blocking question alert.
- ❌ A question alert is omitted, duplicated with an ordinary turn-complete alert, or blocks until acknowledged.

**Test Data:**

- Final response: “Should I continue? ”

**Edge Cases:**

- `?` followed by line breaks or spaces → question.
- Indirect ask ending without `?` → not a question.
- Assistant that gives direct question signals, response ending in `?` without a direct signal → no question alert; ordinary turn-complete alert remains.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/codex-final-question-mark]`

**Related Behaviors:**

| Capability               | Anchor                                            |
| ------------------------ | ------------------------------------------------- |
| Question fallback        | `rule/hooks/codex-final-question-mark`            |
| Ordinary turn completion | `operation/hooks/assistant-turn-completion-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-072] Codex Stop becomes a question only for a string question ending in ?`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-012] Codex Stop question fallback uses a nonblocking macOS alert`  
**Status:** Tested

#### TC-NT-013: An ordinary completed turn keeps its completion alert [P1]

**Objective:** Verify a non-question response still produces the established turn-complete alert.

**Business Intent / Invariant Guarded:** Developers retain the existing indication that an assistant turn finished.

**Proves:** AC-NT-03 / AC-NT-06 / BR-NT-04

**Preconditions:**

- The desktop alert channel is on.
- The main conversation remains open.
- The assistant's response contains no direct question signal and ends without a final question mark.

**Real-World Reachability:** During ordinary work the assistant completes a response without asking a question; the developer observes the completion alert.

**Demo Flow:** Assistant completes a non-question response; conversation stays open.

```gherkin
Given the main conversation remains open
And the assistant's response ends with “The report is ready.”
When the assistant finishes the turn
Then the existing turn-complete alert appears
And no question or session-ended alert appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | The turn-complete desktop alert appears.                                                                                                                                   |
| **System behavior**     | A non-question turn stays a completion; it does not become a question or session end.                                                                                      |
| **Business data state** | Not applicable — no business data are created or changed.                                                                                                                  |
| **Data shown on UI**    | Title and message say the assistant finished its turn and the conversation is still open; no wording says the session completed or ended, and nothing reads as a question. |

**Acceptance Criteria:**

- ✅ The completion alert appears once and says the turn finished while the conversation stays open.
- ❌ The alert is lost, relabeled as a question, or worded as a session that completed or ended.

**Test Data:**

- Final response: “The report is ready.”

**Edge Cases:**

- Response ends with an exclamation mark or period → ordinary completion.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: operation/hooks/assistant-turn-completion-alert]`

**Related Behaviors:**

| Capability               | Anchor                                            |
| ------------------------ | ------------------------------------------------- |
| Question fallback        | `rule/hooks/codex-final-question-mark`            |
| Ordinary turn completion | `operation/hooks/assistant-turn-completion-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-013] ordinary Codex Stop remains on the completion route`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-013] turn-complete alert copy never implies a session end or a question on any channel`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-HARNESS-003][TC-NT-011][TC-NT-013] direct questions and ordinary Stop keep their existing dialogs`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-072] Codex Stop becomes a question only for a string question ending in ?`  
**Status:** Tested

### Invariant / Property Tests

#### TC-NT-071: Session-ended alerts belong only to the main conversation [P1]

**Objective:** Verify the ownership rule across every supported way a main or delegated conversation can end.

**Business Intent / Invariant Guarded:** The developer receives exactly one session-ended alert for each enabled main-conversation end other than a conversation reset, and never receives that alert because delegated work ended.

**Proves:** BR-NT-01

**Preconditions:**

- Desktop alerts are enabled.
- The developer can run main and delegated conversations.

**Real-World Reachability:** Developer delegates work, lets it finish while the main conversation stays active, later ends the main conversation through its ordinary controls.

**Demo Flow:** Delegated work finishes → confirm no alert; end the main conversation → confirm one alert.

```gherkin
Given desktop alerts are enabled and a main conversation may include delegated work
When any delegated conversation ends while the main conversation remains open
Then no main-session-ended alert appears
When the main conversation ends
Then exactly one session-ended alert appears
```

**Expected Result:**

| Dimension               | Expectation                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| **UI**                  | No alert for delegated end; one alert for main-conversation end.           |
| **System behavior**     | Session-ended alert ownership is stable across the supported ending paths. |
| **Business data state** | Not applicable — no business data are created or changed.                  |
| **Data shown on UI**    | Only the main conversation's end is described as a session end.            |

**Acceptance Criteria:**

- ✅ Every enabled main-conversation end, other than a conversation reset (TC-NT-004), produces exactly one session-ended alert.
- ✅ A delegated conversation ending while the main conversation remains open produces none.
- ❌ A delegated end causes a main-session-ended alert, or a main end is silently omitted.

**Test Data:**

```yaml
inputDomain: 'all supported main, delegated, and unidentifiable conversation endings while desktop alerts are enabled'
invariant: 'for every main-conversation end that is not a conversation reset, exactly one session-ended alert appears; for every delegated-conversation end, and every end that cannot be identified as the main conversation, zero main-session-ended alerts appear'
boundaryCounterCase: 'a delegated conversation ends while the main conversation remains open → zero main-session-ended alerts'
```

**Edge Cases:**

- Several delegated conversations end before the main conversation → no main-session-ended alerts until the main conversation ends.
- The assistant reports an end without saying which conversation it was → no session-ended alert (BR-NT-01).
- Desktop channel off → no desktop alert; configured remote chat channels follow BR-NT-06.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/main-session-only]`

**Related Behaviors:**

| Capability                  | Anchor                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Main conversation end alert | `operation/hooks/claude-session-ended-alert` · `operation/hooks/codex-session-ended-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-071] SessionEnd eligibility is restricted to the main conversation`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-003] SessionEnd carrying agent_id is suppressed`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs::[TC-NT-071] generated bridge forwards every SessionEnd for cleanup but marks delegated sessions so only the main one alerts`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs::[TC-NT-071] generated bridge still runs SessionEnd cleanup when session metadata is missing but withholds the alert`  
**Status:** Tested

#### TC-NT-072: Question and completion alerts stay correctly classified [P1]

**Objective:** Verify the question and ordinary-completion decisions over direct questions and completed responses.

**Business Intent / Invariant Guarded:** A direct question, or a final question mark on an assistant without direct question signals, receives one question alert; any other response retains the ordinary completion alert.

**Proves:** AC-NT-05 / AC-NT-06 / BR-NT-02 / BR-NT-03 / BR-NT-04

**Preconditions:**

- Desktop alerts are enabled.
- The developer can exercise the direct question experience and completed assistant responses.

**Real-World Reachability:** During normal work an assistant asks a direct question once, then completes responses with different ending punctuation.

**Demo Flow:** Exercise a direct question, a response ending in `?` on an assistant without direct question signals, and a response ending in a period; compare the alerts.

```gherkin
Given one assistant that gives direct question signals and one that gives none
When the first presents a direct question
Then one question alert appears
When the second completes a response ending with a question mark after trailing whitespace is removed
Then one non-blocking question alert appears
When either completes a response that ends without a question mark and carries no direct signal
Then the ordinary turn-complete alert appears and no question alert appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Direct and final-question-mark prompts show a question alert; non-question completion shows the existing completion alert. |
| **System behavior**     | The classification follows the direct question signal first, then the final non-whitespace question mark when needed.      |
| **Business data state** | Not applicable — no business data are created or changed.                                                                  |
| **Data shown on UI**    | Each alert's message clearly identifies question versus ordinary completion.                                               |

**Acceptance Criteria:**

- ✅ Direct questions and qualifying final `?` responses produce one question alert.
- ✅ Any other response keeps the ordinary completion alert.
- ❌ Indirect wording alone causes a question alert, a normal completion is suppressed, or one interaction produces duplicate question/completion alerts.

**Test Data:**

```yaml
inputDomain: 'all direct question prompts and all completed responses, including every final non-whitespace character and trailing-whitespace combination'
invariant: 'a direct question, or a response whose last non-whitespace character is ? on an assistant without direct question signals, produces exactly one question alert; otherwise the response remains an ordinary completion'
boundaryCounterCase: 'an indirect request whose response ends in a period → no question alert; preserve the ordinary turn-complete alert'
```

**Edge Cases:**

- Response ending in `?` plus spaces or line breaks, on an assistant without direct question signals → one question alert.
- An indirect request ends with a period, exclamation mark, or no punctuation → no question alert; ordinary completion remains.
- Direct question whose wording does not end in `?` → one question alert.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/question-classification]`

**Related Behaviors:**

| Capability                   | Anchor                                            |
| ---------------------------- | ------------------------------------------------- |
| Direct question alert        | `operation/hooks/claude-user-question-alert`      |
| Final question-mark fallback | `rule/hooks/codex-final-question-mark`            |
| Ordinary turn completion     | `operation/hooks/assistant-turn-completion-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-072] Codex Stop becomes a question only for a string question ending in ?`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-HARNESS-003][TC-NT-011][TC-NT-013] direct questions and ordinary Stop keep their existing dialogs`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-012] Codex Stop question fallback uses a nonblocking macOS alert`  
**Status:** Tested

#### TC-NT-073: Every enabled channel receives each alert once with the same meaning [P1]

**Objective:** Verify a configured remote chat channel receives the session-ended, question, and turn-complete alerts once each, with the same title and meaning as the desktop — also when the desktop channel is off or failing, or another channel fails.

**Business Intent / Invariant Guarded:** A developer away from the desk learns the same thing, once, on every channel they enabled.

**Proves:** AC-NT-08 / BR-NT-06

**Preconditions:**

- One remote chat channel is configured (see Remote chat channel setup in Related Documentation).
- A main assistant conversation is active.

**Real-World Reachability:** Developer configures a team chat channel, steps away, and checks the channel from a phone when the assistant asks a question or the conversation ends.

**Demo Flow:** Configure one remote chat channel; have the assistant ask a direct question; then end the main conversation; read the channel and the desktop.

```gherkin
Given a remote chat channel is configured and the desktop channel is on
When the assistant finishes a turn, then asks a direct question, and later the main conversation ends
Then the remote chat channel receives exactly one turn-complete alert, one question alert, and one session-ended alert
And each has the same title and message as the matching desktop alert and names the workspace
When the desktop channel is turned off, or fails to show an alert, and the main conversation ends
Then the remote chat channel still receives exactly one session-ended alert
```

**Expected Result:**

| Dimension               | Expectation                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| **UI**                  | One message per alert in the remote chat channel, alongside the desktop alert.                               |
| **System behavior**     | Each enabled channel is delivered independently; a slow desktop alert does not hold back the remote message. |
| **Business data state** | Not applicable — no business data are created or changed.                                                    |
| **Data shown on UI**    | The shared title and message, the workspace name, time, a shortened conversation reference, and location.    |

**Acceptance Criteria:**

- ✅ Each alert arrives once per enabled channel with the same title and meaning.
- ❌ A remote channel misses an alert, receives it twice, or words it differently from the desktop.

**Test Data:**

```yaml
inputDomain: 'session-ended, question, and turn-complete alerts over every enabled combination of desktop and remote chat channels'
invariant: 'every alert is delivered exactly once to each enabled channel, with the same title and meaning on every channel'
boundaryCounterCase: 'desktop channel off, one remote chat channel configured → the remote channel still receives exactly one alert'
```

**Edge Cases:**

- Desktop channel off → remote chat channels still receive their alerts.
- One channel slow or failing → the other channels still receive theirs.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/alert-channels]`

**Related Behaviors:**

| Capability                  | Anchor                                       |
| --------------------------- | -------------------------------------------- |
| Main conversation end alert | `operation/hooks/claude-session-ended-alert` |
| Direct question alert       | `operation/hooks/claude-user-question-alert` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] discord session-ended, question and turn-complete embeds carry their own copy and the project`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] slack session-ended, question and turn-complete messages carry their own copy and the project`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] telegram session-ended, question and turn-complete messages carry their own copy and the project`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073] remote providers are dispatched without waiting for the desktop alert`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073] remote channels still receive every alert kind when the desktop channel is off or failing`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073] one failing remote channel does not stop another remote channel`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073] with the desktop channel off a configured remote channel gets exactly one alert, and isolated router runs reach none`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073] every shared-copy alert renders its own title on every remote channel`  
**Status:** Tested

#### TC-NT-074: No alert ever carries the assistant's reply text [P1]

**Objective:** Verify alert content of every kind on every channel excludes what the assistant wrote, including a reply read to recognise a question and the reply that comes with every completed turn.

**Business Intent / Invariant Guarded:** Conversation content never leaves the conversation through an alert, so a shared chat channel cannot expose it.

**Proves:** AC-NT-09 / BR-NT-07

**Preconditions:**

- The desktop channel is on and one remote chat channel is configured.
- A main conversation with the second supported assistant is active.

**Real-World Reachability:** The assistant ends a reply that mentions private details with a question; the developer's team chat channel receives the question alert.

**Demo Flow:** With the second supported assistant, ask it to reply “The private token is ABC123. Should I continue?”; read the desktop alert and the remote chat channel message.

```gherkin
Given the assistant's reply text is available when an alert is raised
When a session-ended, question, or turn-complete alert is delivered on the desktop and on a remote chat channel
Then no alert contains any of the reply text
And each shows only the alert title, message, workspace name, and (remote only) time, shortened conversation reference, and location
```

**Expected Result:**

| Dimension               | Expectation                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **UI**                  | The usual question alert on each channel.                                              |
| **System behavior**     | The reply may be read to classify the question but is never copied into alert content. |
| **Business data state** | Not applicable — no business data are created or changed.                              |
| **Data shown on UI**    | No word of the reply — for the demo, “ABC123” appears nowhere in either alert.         |

**Acceptance Criteria:**

- ✅ No alert on any channel contains reply text.
- ❌ Any part of the reply appears in an alert title, message, or remote chat channel message.

**Test Data:**

```yaml
inputDomain: 'every alert kind (session-ended, question, turn-complete) on every channel, including question alerts recognised from reply text and turn-complete alerts raised with the reply of that turn'
invariant: 'no alert content on any channel contains any part of the assistant reply text'
boundaryCounterCase: 'a reply ending in ? that is read to raise a question alert → the alert still contains none of that reply'
```

**Edge Cases:**

- The reply is the only evidence of the question (second supported assistant) → alert still carries none of it.
- An ordinary completed turn arrives with the reply of that turn (second supported assistant) → the turn-complete alert still carries none of it.
- Only the start or the end of the reply would fit in a short preview → no part of it appears.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/alert-reply-privacy]`

**Related Behaviors:**

| Capability                   | Anchor                                 |
| ---------------------------- | -------------------------------------- |
| Final question-mark fallback | `rule/hooks/codex-final-question-mark` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] discord session-ended, question and turn-complete embeds carry their own copy and the project`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] slack session-ended, question and turn-complete messages carry their own copy and the project`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-073][TC-NT-074] telegram session-ended, question and turn-complete messages carry their own copy and the project`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-012] Codex Stop question fallback uses a nonblocking macOS alert`, `.claude/hooks/tests/suites/desktop-argv.test.cjs::[TC-NT-074] desktop alerts of every kind never carry the assistant reply text`  
**Status:** Tested

#### TC-NT-075: A slow channel misses one alert; a failing channel pauses for a bounded time [P1]

**Objective:** Verify a remote chat channel that is slow to answer is given up for that alert only, a channel that reports a failure is paused for five minutes, and a session-ended alert never outlasts the time the assistant allows for ending.

**Business Intent / Invariant Guarded:** One slow answer never silences a developer's later alerts, a broken channel is not retried on every alert, and ending a conversation is never held up by a remote chat channel.

**Proves:** BR-NT-06

**Preconditions:**

- One remote chat channel is configured (see Remote chat channel setup in Related Documentation).
- A main assistant conversation is active.

**Real-World Reachability:** A developer on a slow connection gets one alert that takes longer than two seconds to reach the team chat; minutes later the assistant asks a question. Separately, the chat destination is deleted, so every alert to it fails.

**Demo Flow:** Point the remote chat channel at a destination that answers slowly; finish a turn; then point it at a working destination and have the assistant ask a question; read the channel. Point it at a destination that rejects alerts; finish a turn twice; read the channel.

```gherkin
Given a remote chat channel is configured
When an alert takes longer than two seconds to be answered by that channel
Then that alert is given up on that channel and the channel is not paused
And the next alert on that channel is still sent
When the channel rejects an alert, refuses the connection, or cannot be found
Then the channel is paused for five minutes and the alerts raised in that time are not sent to it
When the main conversation is ending and little or no time is left to deliver on that channel
Then the session-ended alert gets only the time left, or is skipped on that channel, and the channel is not paused
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | After a slow answer the next alert still appears in the chat channel; after a failure, none appears for five minutes.                  |
| **System behavior**     | A slow answer is abandoned without pausing; a failure pauses the channel; the ending conversation is never held past its allowed time. |
| **Business data state** | Not applicable — no business data are created or changed.                                                                              |
| **Data shown on UI**    | The usual alert content (BR-NT-07) for every alert that is delivered.                                                                  |

**Acceptance Criteria:**

- ✅ A slow answer costs only that one alert; a failure pauses the channel for five minutes; a session-ended alert ends within the time the assistant allows.
- ❌ A slow answer pauses the channel, a failing channel is retried on every alert, or a session-ended alert is still waiting when the assistant stops the ending.

**Test Data:**

```yaml
inputDomain: 'slow, failing, and working remote chat channels across every alert kind, including session-ended alerts raised at any point of the time allowed for ending'
invariant: 'only a reported failure pauses a channel, for five minutes; a slow answer never pauses it; a session-ended alert never outlasts the time allowed for ending'
boundaryCounterCase: 'no time left while the conversation ends → the session-ended alert is skipped on that channel and the channel is not paused'
```

**Edge Cases:**

- Slow answer, then a working answer on the same channel → the second alert is delivered.
- Rejected alert, then another alert within five minutes → the second alert is not sent to that channel.
- Refused connection → paused like a rejected alert, not treated as slow.
- Session-ended alert raised late in the time allowed for ending → it gets only the time left; none left → skipped.

<!-- machine-only carrier — ignore when reading as BA/QA -->

**Evidence:** `[Source: rule/hooks/alert-channel-pause]`

**Related Behaviors:**

| Capability                    | Anchor                      |
| ----------------------------- | --------------------------- |
| One alert per enabled channel | `rule/hooks/alert-channels` |

**CoveredBy:** `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-075] a slow channel is abandoned for that alert without pausing the next alert`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-075] a failing channel pauses for a bounded period after a real error`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-075] a session-ended request gets only the rest of the session-end hook budget`, `.claude/hooks/tests/suites/notification.test.cjs::[TC-NT-075] a late session-ended request is cut short or skipped, never outlasting the hook budget`  
**Status:** Tested
