---
module: 'hooks'
service: 'framework.ContextDelivery'
feature_code: 'PFCI'
entities: ['ConventionClass', 'ClassMatcher', 'ConventionDigest', 'DeliveryRecord', 'WorkingContext']
status: draft
owner: 'Framework maintainers'
last_updated: '2026-09-24'
scope_mode: FRAMEWORK-LIBRARY
large_idea_decomposition: null
roadmap: null
milestone_id: null
scope_brief: null
roadmap_status: null
---

# Per-File Convention Injection — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> Technical identifiers live only in frontmatter, Mermaid blocks and the Section 8 hidden carriers.

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

In long working sessions an AI assistant tends to change a file after the conventions for that kind of file have faded from its attention, so its edits ignore the project's own rules. This capability lets a project describe kinds of files together with the conventions that govern them, and puts a short, non-repeating reminder of exactly those conventions in front of the assistant when it opens or changes such a file — early enough to shape the edit it is about to write, and again whenever the reminder may have been lost or pushed far back. The same conventions stay available through the always-loaded project instructions and an on-demand lookup, so assistants without automatic delivery still get identical guidance.

---

## 2. Glossary

| Term                | Definition                                                                                                                         | Context                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Convention Class    | A named kind of file (for example "hook source" or "feature spec") plus the conventions that apply when such a file is changed     | Defined by a maintainer or by setup detection in the project configuration                                     |
| Include Pattern     | A rule that makes a file belong to a class: a location pattern, a wildcard location, or a file-name pattern                        | A class needs at least one                                                                                     |
| Exclude Pattern     | A rule that removes a file from a class even when an include pattern matched                                                       | Exclusion always wins                                                                                          |
| File-Type Filter    | An optional list of file types a class is limited to                                                                               | Must pass in addition to an include pattern                                                                    |
| Precedence Rank     | A whole number ordering classes when several match; lower means more specific and comes first                                      | Default ranks: specific 100, default 500, general 900                                                          |
| Deliverable Item    | A short rule, a protocol reference, or a reference document attached to a class                                                    | A class with at least one is deliverable                                                                       |
| Delivery Switch     | The project-level setting that turns automatic delivery on                                                                         | Off unless the project explicitly turns it on; a project with no configuration file gets the built-in fallback |
| Trigger             | An operation that can deliver conventions: the assistant opening a file for reading, or finishing a change to files                | Reading can be excluded by setting; which operations deliver a given class is its class trigger                |
| Convention Digest   | The short reminder assembled for one trigger from all matched classes not currently present                                        | Bounded in size                                                                                                |
| Working Context     | One assistant conversation window: the main conversation, or one helper agent's own conversation                                   | Each keeps its own delivery memory                                                                             |
| Condensation        | The assistant host shortening a long conversation, which may drop earlier reminders                                                | Invalidates earlier deliveries in the affected conversation                                                    |
| Reminder Distance   | How much conversation has accumulated since a class was last delivered, or how much time passed when the amount cannot be measured | Large distance means the reminder has faded                                                                    |
| Content Version     | A short fingerprint of a class's rendered reminder and of the patterns deciding which files belong to it                           | Changes whenever the class's deliverable items or membership patterns change                                   |
| Delivery Record     | The memory that a class at a content version was delivered in a working context, and when                                          | Prevents duplicates                                                                                            |
| Static Instructions | The always-loaded project instruction files every assistant reads at the start of work                                             | Carry the same conventions without automatic delivery                                                          |
| Convention Lookup   | An on-demand command that prints the conventions for a given file                                                                  | Fallback for hosts without automatic delivery                                                                  |
| Detected Class      | A class created by setup detection rather than written by a maintainer                                                             | Setup may refresh it only while nobody has edited it                                                           |
| Class Trigger       | Which of the two triggers deliver a class: reads, changes, or both                                                                 | Both unless the class says otherwise (BR-PFCI-19)                                                              |

---

## 3. User Stories & Acceptance Criteria

### US-PFCI-01: Define convention classes

**As a** framework maintainer
**I want to** declare kinds of files, how to recognise them, and which conventions apply to each
**So that** the assistant is reminded of the right rules for each kind of file without me repeating them in every prompt

**Acceptance Criteria:**

- **AC-PFCI-01** — **Given** a class with an include pattern and a deliverable item **When** the project configuration is validated **Then** it is accepted
- **AC-PFCI-02** — **Given** a class with no include pattern, a malformed pattern, or a name used by another class **When** the configuration is validated **Then** an error names the class
- **AC-PFCI-03** — **Given** a configuration exists and the delivery switch is off or absent, or no class is deliverable **When** the assistant reads or edits any file **Then** nothing is delivered and the work proceeds normally
- **AC-PFCI-28** — **Given** no project configuration file exists **When** the assistant reads or edits a front-end file **Then** the built-in user-interface design class is delivered, and a file of any other kind receives nothing

### US-PFCI-02: Receive conventions when working on a file

**As an** AI assistant working in a long session
**I want to** see the conventions of a file kind when I open or change such a file
**So that** my next edit follows the project's rules even when the original instructions are far back in the conversation

**Acceptance Criteria:**

- **AC-PFCI-04** — **Given** a file of a deliverable class whose class trigger includes reads **When** the assistant finishes reading it **Then** a digest naming that class, its must-read references and its short rules is shown before the assistant's next step
- **AC-PFCI-05** — **Given** a file of a deliverable class whose class trigger includes changes **When** the assistant finishes creating, changing or moving it **Then** the digest is shown before the assistant's next step
- **AC-PFCI-06** — **Given** a file matching an include pattern and also an exclude pattern of the same class **When** it is read or edited **Then** that class is not delivered
- **AC-PFCI-07** — **Given** a file matching several classes **When** it is read or edited **Then** the classes appear ordered by precedence rank (lower first), then by definition order, limited to the per-trigger maximum
- **AC-PFCI-08** — **Given** a change that only removes a file, or a file outside the project **When** it happens **Then** nothing is delivered
- **AC-PFCI-09** — **Given** reading is excluded as a trigger **When** a file of a deliverable class is read **Then** nothing is delivered, while a later change still triggers delivery

### US-PFCI-03: No duplicate reminders, but never a lost one

**As an** AI assistant
**I want to** receive each class reminder only when it is not effectively present in my conversation
**So that** reminders stay meaningful instead of becoming noise, yet return whenever they may have been lost or faded

**Acceptance Criteria:**

- **AC-PFCI-10** — **Given** a class was delivered in this working context at the same content version, with no condensation since and a small reminder distance **When** another matching file is read or edited **Then** it is not delivered again, except that a delivery made on a read does not cover a later change (AC-PFCI-35)
- **AC-PFCI-11** — **Given** a class was delivered and the conversation was condensed afterwards **When** a matching file is read or edited **Then** the class is delivered again
- **AC-PFCI-12** — **Given** a class was delivered and its deliverable items then changed **When** a matching file is read or edited **Then** the new version is delivered
- **AC-PFCI-13** — **Given** a class was delivered in the main conversation **When** a helper agent reads or edits a matching file in its own conversation **Then** the class is delivered to the helper agent
- **AC-PFCI-14** — **Given** a class was delivered and the reminder distance has since reached the configured limit or more **When** a matching file is read or edited **Then** the class is delivered again
- **AC-PFCI-15** — **Given** several matching files are read or edited at the same moment in one working context **When** they are evaluated **Then** each class is delivered at most once
- **AC-PFCI-16** — **Given** the static instructions already carry the current version of a class and the main conversation is still short and uncondensed **When** a matching file is read or edited **Then** the class is not delivered
- **AC-PFCI-17** — **Given** a delivery was attempted but could not be completed **When** a matching file is read or edited after the short coordination window **Then** the class is delivered

### US-PFCI-04: Compact reminders

**As an** AI assistant
**I want** reminders that are short, put the critical instruction first and last, and point to documents rather than copying them
**So that** they cost little attention and survive long contexts

**Acceptance Criteria:**

- **AC-PFCI-18** — **Given** any digest **When** it is delivered **Then** its first line names the must-read references and its last line repeats them
- **AC-PFCI-19** — **Given** matched classes whose full reminders exceed the size limit **When** the digest is assembled **Then** the lowest-precedence classes are reduced to references only (or left out if still too large), no line is cut, and the digest stays within the limit
- **AC-PFCI-20** — **Given** a digest **When** it is delivered **Then** each class section carries a stable tag of its name and content version, and a short rule shared by several classes appears only once

### US-PFCI-05: Same guidance without automatic delivery

**As a** maintainer using an assistant host that cannot deliver reminders automatically
**I want** the same conventions listed in the static instructions and printable on demand
**So that** correctness never depends on automatic delivery

**Acceptance Criteria:**

- **AC-PFCI-21** — **Given** the project configuration **When** the static instructions are regenerated **Then** every deliverable class appears with its include patterns, file-type filter, exclusions, protocol references, reference documents and version tag, and its short rules appear among the golden rules unless the project opted out under BR-PFCI-13's exception
- **AC-PFCI-22** — **Given** any file **When** the convention lookup is run for it **Then** it prints the same classes, in the same order, with the same content automatic delivery would use
- **AC-PFCI-29** — **Given** the project opted out of repeating short rules in the static instructions **When** the static instructions are regenerated **Then** if automatic delivery is switched on and the convention lookup is available and can print every class that has short rules on every file it matches (none of them delivered on reads only, each ranked within the per-file class limit, and the largest possible digest within the size limit), the golden rules name every class that has short rules and point to the lookup without repeating any rule text, and the lookup for a matching file prints each named class's rules; otherwise every short rule stays among the golden rules and the maintainer is warned that the opt-out was not honored

### US-PFCI-06: Setup detects classes without overwriting maintainer work

**As a** maintainer running project setup or re-scans
**I want** detected file kinds merged into my configuration
**So that** new projects get useful classes automatically while my own edits are never lost

**Acceptance Criteria:**

- **AC-PFCI-23** — **Given** a detected class whose name is not yet configured **When** detection results are merged **Then** it is added and marked as detected
- **AC-PFCI-24** — **Given** a configured class written by a maintainer, or a detected class a maintainer has since edited **When** detection results with the same name are merged **Then** that class is left unchanged
- **AC-PFCI-25** — **Given** a detected class nobody edited **When** newer detection results with the same name are merged **Then** it is refreshed to the newer detection

### US-PFCI-07: Never disrupt work

**As a** maintainer
**I want** the reminder capability to fail silently
**So that** a broken or missing configuration never stops or slows down real work

**Acceptance Criteria:**

- **AC-PFCI-26** — **Given** an unreadable, malformed, or partially invalid configuration, or unwritable delivery memory **When** a file is read or edited **Then** the work proceeds and no error is shown to the assistant
- **AC-PFCI-27** — **Given** a condensation is reported by the host **When** it is recorded **Then** nothing is shown to the assistant

### US-PFCI-08: Reading a file does not pull authoring context

**As an** AI assistant that opens files to understand them
**I want** a class's must-read documents and protocols to reach me when I change a file of that kind, and only when its maintainer wants it, when I merely read one
**So that** reading stays cheap while every edit is still guarded by its conventions

**Acceptance Criteria:**

- **AC-PFCI-30** — **Given** a class whose trigger is edit **When** a matching file is read **Then** that class delivers nothing, and **When** a matching file is changed **Then** its references and protocols are delivered
- **AC-PFCI-31** — **Given** a class that sets no trigger **When** a matching file is read or changed **Then** it behaves as trigger both and is delivered on the same operations as before this story, while a digest delivered on a read uses the conditional wording of AC-PFCI-33
- **AC-PFCI-32** — **Given** a class whose trigger is read **When** a matching file is changed **Then** that class delivers nothing
- **AC-PFCI-33** — **Given** a class delivered on a read **When** the digest is shown **Then** its opening line is conditional ("if you will edit this file, read first") and it carries no instruction to follow a protocol
- **AC-PFCI-34** — **Given** setup detection proposes a new class that carries reference documents or protocols **When** it is merged **Then** it is written with trigger edit (the framework's user-interface design class keeps trigger both, BR-PFCI-19), and a trigger a maintainer set is never changed
- **AC-PFCI-35** — **Given** a class delivered on a read in this working context, with the conditional wording **When** a matching file is then created, changed or moved **Then** the class is delivered once more with the mandatory wording and its protocol, and after that it is not delivered again on reads or changes while it stays present

---

## 4. Business Rules

### Rule Catalog

| Rule ID    | Name                                                    | Category      | Enforcement |
| ---------- | ------------------------------------------------------- | ------------- | ----------- |
| BR-PFCI-01 | Explicit opt-in and silence when nothing is deliverable | Activation    | [HARD]      |
| BR-PFCI-02 | Class membership                                        | Matching      | [HARD]      |
| BR-PFCI-03 | Deliverable classes                                     | Activation    | [HARD]      |
| BR-PFCI-04 | Multi-class ordering and precedence                     | Matching      | [HARD]      |
| BR-PFCI-05 | Presence decides delivery                               | Deduplication | [HARD]      |
| BR-PFCI-06 | Condensation invalidates earlier deliveries             | Deduplication | [HARD]      |
| BR-PFCI-07 | Separate helper-agent contexts                          | Deduplication | [HARD]      |
| BR-PFCI-08 | Size limit with graceful reduction                      | Presentation  | [HARD]      |
| BR-PFCI-09 | Critical first and last, tagged sections                | Presentation  | [HARD]      |
| BR-PFCI-10 | Never block, never alter                                | Safety        | [HARD]      |
| BR-PFCI-11 | Valid class definitions                                 | Validation    | [HARD]      |
| BR-PFCI-12 | Merge never overwrites maintainer work                  | Setup         | [HARD]      |
| BR-PFCI-13 | Static parity                                           | Portability   | [HARD]      |
| BR-PFCI-14 | Relevant triggers and targets only                      | Matching      | [HARD]      |
| BR-PFCI-15 | Reminder distance re-arms delivery                      | Deduplication | [HARD]      |
| BR-PFCI-16 | Static instructions count as an early delivery          | Deduplication | [SOFT]      |
| BR-PFCI-17 | Record only completed deliveries                        | Deduplication | [HARD]      |
| BR-PFCI-18 | Bounded retention of delivery memory                    | Safety        | [HARD]      |
| BR-PFCI-19 | Per-class trigger                                       | Matching      | [HARD]      |
| BR-PFCI-20 | Conditional wording on reads                            | Presentation  | [HARD]      |

### BR-PFCI-01: Explicit opt-in and silence when nothing is deliverable [HARD]

**Statement:** Automatic delivery happens only when the project's delivery switch is explicitly on and at least one class is deliverable. A project whose configuration exists but has never set the switch receives no automatic delivery. A project with no configuration file at all gets a built-in fallback: delivery on, with the framework's user-interface design class as the only class, so a front-end file still receives the design rules before it is edited. A configuration that exists but cannot be read is not missing — it stays silent (BR-PFCI-10).

```
IF no configuration file exists
  → act on the built-in fallback (switch on; the user-interface design class only)
ELSE IF delivery switch is absent or off OR no class is deliverable OR the configuration is unreadable
  → deliver nothing; the work proceeds unchanged
ELSE
  → evaluate the trigger
```

### BR-PFCI-02: Class membership [HARD]

**Statement:** A file belongs to a class only when the class's file-type filter (if any) accepts it, at least one include pattern matches it, and no exclude pattern matches it. Patterns are evaluated against the file's location relative to the project root, ignoring letter case.

| File-type filter  | Any include matches | Any exclude matches | Member? |
| ----------------- | ------------------- | ------------------- | ------- |
| rejects           | —                   | —                   | No      |
| accepts or absent | No                  | —                   | No      |
| accepts or absent | Yes                 | Yes                 | No      |
| accepts or absent | Yes                 | No                  | Yes     |

### BR-PFCI-03: Deliverable classes [HARD]

**Statement:** A class is deliverable only if it has at least one short rule, protocol reference, or reference document. Styling and design-system links alone do not make a class deliverable.

### BR-PFCI-04: Multi-class ordering and precedence [HARD]

**Statement:** When several classes match one trigger (across all its files), they are ordered by precedence rank ascending (missing rank = 500), then by position in the configuration; the digest states that earlier sections win on conflict. At most the configured maximum number of classes (default 4) is considered per trigger; the rest are dropped.

### BR-PFCI-05: Presence decides delivery [HARD]

**Statement:** A matched class is delivered unless it is present in the working context. A class is present when all hold: a delivery record exists at the current content version; that delivery happened after the latest condensation of the context; and the reminder distance since that delivery is below its limit (BR-PFCI-15).

| Record at current version | Delivered after last condensation | Distance below limit | Outcome |
| ------------------------- | --------------------------------- | -------------------- | ------- |
| No                        | —                                 | —                    | DELIVER |
| Yes                       | No                                | —                    | DELIVER |
| Yes                       | Yes                               | No                   | DELIVER |
| Yes                       | Yes                               | Yes                  | SKIP    |

**Read-form presence:** A delivery made on a read, in the conditional wording of BR-PFCI-20, counts as present only for later reads, because it carried no instruction to follow a protocol. The first creation, change or move of a matching file after it delivers the class once more in the mandatory wording, with the must-read references and the protocol; from then on the class is present for reads and changes alike under the table above. The delivery record therefore remembers which wording it delivered.

| Wording of the recorded delivery | Current trigger          | Outcome when the table above says SKIP |
| -------------------------------- | ------------------------ | -------------------------------------- |
| Conditional (read)               | read                     | SKIP                                   |
| Conditional (read)               | creation, change or move | DELIVER once, mandatory wording        |
| Mandatory (change)               | read or change           | SKIP                                   |

### BR-PFCI-06: Condensation invalidates earlier deliveries [HARD]

**Statement:** A condensation found in a working context's own history invalidates earlier deliveries in that context. A condensation reported by the host at session level does not say which context was condensed, so it invalidates earlier deliveries in the main conversation and in every helper agent whose own history cannot be inspected; a helper agent whose history can be inspected relies on the marks in that history instead, so a sibling's condensation does not repeat its reminders. When too much history accumulated between two checks to inspect it, a condensation is assumed (repeat rather than miss). A condensation seen without its own time counts as happening just before the check, so a reminder delivered in that same check counts as after it.

### BR-PFCI-07: Separate helper-agent contexts [HARD]

**Statement:** Each helper agent's conversation is its own working context with its own delivery records and condensation state; deliveries in the main conversation never suppress a helper agent's delivery, and vice versa. When the host does not identify helper agents, all work shares the main context and only the distance rule bounds suppression.

### BR-PFCI-08: Size limit with graceful reduction [HARD]

**Statement:** A digest never exceeds the configured character limit (default 4000). When full reminders do not fit, classes are reduced to references-only starting from the lowest precedence; if that still does not fit, the lowest-precedence classes are left out. A line is delivered whole or not at all. A class delivered in references-only form counts as delivered for that version; a class left out does not — the delivery memory never records it, so the next matching trigger delivers it.

### BR-PFCI-09: Critical first and last, tagged sections [HARD]

**Statement:** The first line of a digest names the must-read references for the triggering file; the last line repeats them and names the convention lookup. Each class section starts with a stable tag made of the class name and its content version. A short rule already shown under an earlier class in the same digest is not repeated.

### BR-PFCI-10: Never block, never alter [HARD]

**Statement:** Delivery only adds context after a successful read or change. It never refuses, delays for user input, or modifies the operation. Any internal failure results in no delivery and no visible error. Recording a condensation shows nothing. A maintainer may switch on a diagnostic mode that explains each decision (delivered, skipped and why) on the diagnostic stream; it never changes what the assistant receives.

### BR-PFCI-11: Valid class definitions [HARD]

**Statement:** Validation rejects a class without a name, a duplicate class name, a class without any include pattern, a class whose location-pattern list is missing (the list must be present, and may be empty when another include pattern is used), a malformed pattern, and out-of-range delivery settings. Each error names the offending class, or its position in the list when the class has no usable name. It warns about unknown class fields and a precedence rank that is not a whole number. A setting value validation accepts is always the value delivery uses; a rejected value is replaced by its default.

### BR-PFCI-12: Merge never overwrites maintainer work [HARD]

**Statement:** Merging detection results adds classes whose name is not configured, refreshes a class only when it is marked as detected and is unchanged since it was detected, and leaves every other class untouched. Merging never removes a class.

Detection proposes classes only from project knowledge the configuration already records: the feature-spec root, integration-test and other test file locations, end-to-end test locations, backend and frontend modules, styling file types, and project languages (general code). A proposed class keeps only the reference documents and protocols that exist in the project; a class with nothing deliverable left is not proposed. General classes skip dependency and build output at any depth and the temporary output folders at the project root. Setup switches delivery on only when a maintainer's setup run explicitly asks for it, and never overrides a maintainer's explicit off.

| Existing class with same name | Marked detected | Unchanged since detection | Outcome               |
| ----------------------------- | --------------- | ------------------------- | --------------------- |
| none                          | —               | —                         | ADD (marked detected) |
| present                       | No              | —                         | KEEP                  |
| present                       | Yes             | No                        | KEEP                  |
| present                       | Yes             | Yes                       | REFRESH               |

### BR-PFCI-13: Static parity [HARD]

**Statement:** Everything that can be delivered automatically — class name, include patterns, protocol references, reference documents, version tag and short rules — is also present in the static instructions, whose class rows also state the file-type filter and the exclusions so a row never claims files the class skips, and printed by the convention lookup, which uses the same ordering and rendering as automatic delivery. Automatic delivery is an accelerator, never the only carrier.

**Opt-out exception (compact golden rules):** A project may opt out of repeating short rules in the static instructions. The opt-out is honored only when automatic delivery is switched on AND the convention lookup is available and can print every class that has short rules (a class it cannot identify — one without a name, or sharing its name with another — counts as not printable) AND no class that has short rules is delivered on reads only (BR-PFCI-19), because the lookup prints what a change of the file delivers and so never prints such a class, AND every class that has short rules ranks within the per-file class limit of BR-PFCI-04, so no file's digest or lookup can leave it out, AND the largest digest any file could receive — the longest accepted path, every class's references, and the largest rule sets that limit admits — fits the size limit of BR-PFCI-08, so no reduction can drop rule text; the golden rules then name every class that has short rules and point the reader to the convention lookup instead of repeating the rule text. The lookup stays the non-automatic carrier of those rules, so automatic delivery is still never the only carrier. When any precondition is missing, the opt-out is refused: every short rule stays among the golden rules and the maintainer regenerating the static instructions is warned with the missing precondition named. A project with no class carrying short rules has nothing to compact and gets no warning. In both modes every class row keeps its include patterns, file-type filter, exclusions, protocol references, reference documents and version tag.

| Project opted out | Automatic delivery switched on | Lookup available for every rule-bearing class                                                                | Golden rules carry                      | Maintainer warned |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----------------- |
| No (default)      | any                            | any                                                                                                          | Every short rule                        | No                |
| Yes               | Yes                            | Yes                                                                                                          | Class names and a pointer to the lookup | No                |
| Yes               | No, or never configured        | any                                                                                                          | Every short rule                        | Yes               |
| Yes               | Yes                            | No — unnamed, duplicated, delivered on reads only, ranked beyond the per-file class limit, or a worst-case digest over the size limit | Every short rule                        | Yes               |

### BR-PFCI-14: Relevant triggers and targets only [HARD]

**Statement:** Only successful reads and successful creations, changes or moves are triggers. Removals, folders, files outside the project root, and operations the host reports as failed are ignored. Reading is a trigger unless the project excludes it. A moved file counts only at its new location: its former location no longer exists, like a removal. One change may touch several files; the digest combines their matched classes without duplicates.

### BR-PFCI-15: Reminder distance re-arms delivery [HARD]

**Statement:** A delivery stops counting as present once the conversation has grown by the configured amount or more since it, measured in bytes of conversation history (default 4500000 bytes, roughly two hundred thousand tokens' worth — history files store about five to six bytes per visible character). A conversation history that is shorter than it was at the delivery has been replaced, so that delivery stops counting as present. When the conversation size cannot be measured, it stops counting once the configured time or longer has passed.

Two time limits exist, because two situations that both fall back on time are not equally informed:

| Working context | Size measurable | Condensation observed                            | Limit used          | Default        |
| --------------- | --------------- | ------------------------------------------------ | ------------------- | -------------- |
| Measured        | Yes             | either                                           | conversation growth | 4500000 bytes  |
| Partly measured | No              | Yes — a host report or a mark in its own history | measured time limit | thirty minutes |
| Blind           | No              | No — none has ever been seen for it              | blind time limit    | five minutes   |

A blind working context is one where the condensation check in BR-PFCI-05 cannot fail, because no condensation has ever been observed for it, so elapsed time is the only remaining signal. A condensation there is invisible, and the reminder stays suppressed until the limit passes — the shorter blind limit bounds how long that can last. A context whose condensations are observed keeps the longer measured limit, because time is only standing in for distance there; observing a condensation for a context moves it out of the blind case for the rest of the session.

### BR-PFCI-16: Static instructions count as an early delivery [SOFT]

**Statement:** In the main conversation only, a class whose current version tag is present in every static instruction file that exists counts as delivered at the start of the session; one outdated file is enough to withhold the credit, because the host may have loaded exactly that file. This credit ends at the first condensation or once the reminder distance from the session start reaches its limit. Helper agents never receive this credit.

### BR-PFCI-17: Record only completed deliveries [HARD]

**Statement:** A delivery record is written only after the digest has been handed to the host. Simultaneous evaluations coordinate so that only one of them delivers a given class; if the delivering evaluation fails before recording, the first matching trigger after a short coordination window (about ten seconds) delivers the class again. Triggers inside that window skip the class, trading a brief gap for never duplicating a delivery that a live peer is still completing. A claim is released only by the evaluation that holds it: after a stale claim was taken over, the original holder never removes the new one.

### BR-PFCI-18: Bounded retention of delivery memory [HARD]

**Statement:** Delivery memory of a session is removed once its newest entry is more than seven days old. Removal happens when a condensation is recorded and, on the delivering path, at most once a day. A session's memory is removed only when it is **both** marked as this system's own — a mark the system writes when it first creates that memory — **and** shaped exactly like delivery memory. Resembling delivery memory is not sufficient on its own: the memory location is configurable and may point anywhere, so an unrelated folder can match the shape by coincidence, and removing on shape alone would destroy someone else's data. Anything failing either test — other files, nested folders, source trees, and memory created before the system began marking its own — is never removed, even when old. Each sweep removes a bounded number of sessions. Paths that deliver nothing never write to the memory location.

### BR-PFCI-19: Per-class trigger [HARD]

**Statement:** Each class may name the operations that deliver it: read, edit or both. A class that names none behaves as both, so existing configurations are delivered on the same operations as before; the wording of a digest delivered on a read follows BR-PFCI-20 for every class, including those that name no trigger. A read delivers only classes whose trigger is read or both; a creation, change or move delivers only classes whose trigger is edit or both. The project-wide exclusion of reads (BR-PFCI-14) still wins: when reading is excluded, no class is delivered on a read whatever its trigger. The convention lookup answers "what applies before editing this file", so it lists the classes a change would deliver. A class's trigger is part of its content version (BR-PFCI-05), so changing it re-delivers the class once. Setup detection writes trigger edit on each new class it proposes that carries reference documents or protocols, except the framework's user-interface design class (see the note below the table), and never changes a trigger on a class it may not refresh (BR-PFCI-12).

| Class trigger                    | On a read           | On a creation, change or move |
| -------------------------------- | ------------------- | ----------------------------- |
| none (default)                   | delivered (as both) | delivered                     |
| both                             | delivered           | delivered                     |
| read                             | delivered           | nothing                       |
| edit                             | nothing             | delivered                     |
| any, reads excluded project-wide | nothing             | per the row above             |

**Design class keeps trigger both:** the framework's user-interface design class carries reference documents, yet setup detection proposes it with trigger both, never edit. A class is delivered only after an operation completes, so an edit-only class would first reach the assistant after its first change of an existing front-end file, while the design rules must be in context before that change; the read that precedes the change is what delivers them. Trigger both is also the content version of a class that names no trigger, so the built-in fallback copy (BR-PFCI-01) and the detected copy keep one content version, and a project that runs setup later is not re-sent the class.

### BR-PFCI-20: Conditional wording on reads [HARD]

**Statement:** A digest delivered on a read opens with a conditional instruction — "if you will edit this file, read first:" followed by the must-read references — and carries no instruction to follow a protocol, so the assistant decides whether the documents are needed for what it is doing. A digest delivered on a creation, change or move keeps the mandatory wording ("must read first" and "follow the protocol"). Because the conditional wording carries no protocol, a read-form delivery never satisfies a later change: the first change of a matching file after it re-delivers the class once in the mandatory wording (BR-PFCI-05, read-form presence). The first-and-last framing of BR-PFCI-09 holds in both forms.

---

## 5. Domain Model

### Relationships (overview)

```
ProjectConfiguration 1──N ConventionClass     (ordered list)
ConventionClass      1──N ClassMatcher        (include ≥1, exclude ≥0)
ConventionClass      1──N DeliverableItem     (short rules, protocol refs, reference docs)
Session              1──N WorkingContext      (main + helper agents)
WorkingContext       1──N DeliveryRecord      (one per class, latest delivery)
Trigger              1──N TargetFile
ConventionDigest     1──N DigestSection       (one per delivered class)
```

### Entity: ConventionClass

| Property              | Type         | Required                                     | Constraints                      | Business Meaning                                          |
| --------------------- | ------------ | -------------------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Name                  | text         | Yes                                          | Unique in the configuration      | Stable identity of the file kind                          |
| Location patterns     | list of text | Yes (may be empty if another include exists) | Well-formed                      | Include by location                                       |
| Wildcard locations    | list of text | No                                           | —                                | Include by wildcard location                              |
| File-name patterns    | list of text | No                                           | Well-formed                      | Include by file name                                      |
| Exclude patterns      | list of text | No                                           | Well-formed                      | Carve files out of the class                              |
| File-type filter      | list of text | No                                           | —                                | Restricts the class to certain file types                 |
| Precedence rank       | number       | No                                           | Whole number; default 500        | Ordering among matched classes                            |
| Short rules           | list of text | No                                           | One sentence each                | Critical rules shown inline; golden rules per BR-PFCI-13  |
| Protocol references   | list of text | No                                           | Names of working protocols       | Which protocols must be followed                          |
| Reference documents   | list of text | No                                           | Project-relative                 | Which documents must be read first                        |
| Origin                | enum         | No                                           | Detected or maintainer           | Who authored the class                                    |
| Detection fingerprint | text         | No                                           | Set only for detected classes    | Shows whether a detected class was edited since detection |
| Trigger               | enum         | No                                           | Read, edit or both; default both | Which operations deliver the class (BR-PFCI-19)           |

### Enum: Origin

| Value      | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| Maintainer | Written or adopted by a person; never changed by setup      |
| Detected   | Created by setup detection; may be refreshed while unedited |

### Enum: ClassTrigger

| Value | Meaning                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| Both  | Delivered on reads and on changes (default when the class names nothing)                                          |
| Read  | Delivered on reads only                                                                                           |
| Edit  | Delivered on creations, changes and moves only; setup detection's default for classes with documents or protocols |

### Entity: DeliverySettings

| Property                   | Type         | Required | Constraints                                             | Business Meaning                         |
| -------------------------- | ------------ | -------- | ------------------------------------------------------- | ---------------------------------------- |
| Delivery switch            | yes-no       | No       | Absent means off                                        | Turns automatic delivery on              |
| Size limit                 | number       | No       | 500–10000 characters; default 4000                      | Maximum digest size                      |
| Classes per trigger        | number       | No       | 1–10; default 4                                         | Maximum classes considered at once       |
| Distance limit             | number       | No       | At least 4500000 bytes of conversation; default 4500000 | When a delivery has faded                |
| Time limit                 | number       | No       | 1–1440 minutes; default 30                              | Fade rule when size cannot be measured   |
| Read trigger               | yes-no       | No       | Default yes                                             | Whether reading a file triggers delivery |
| Extra condensation markers | list of text | No       | Well-formed                                             | Additional host signals of condensation  |
| Inline short rules         | yes-no       | No       | Default yes; "no" honored only under BR-PFCI-13         | Repeat short rules in the golden rules   |

### Entity: DeliveryRecord

| Property                      | Type   | Required | Constraints                           | Business Meaning                                         |
| ----------------------------- | ------ | -------- | ------------------------------------- | -------------------------------------------------------- |
| Working context               | text   | Yes      | Main conversation or one helper agent | Whose conversation received the reminder                 |
| Class name                    | text   | Yes      | —                                     | Which class was delivered                                |
| Content version               | text   | Yes      | Short fingerprint                     | Which version was delivered                              |
| Delivered at                  | date   | Yes      | —                                     | Compared with the latest condensation and the time limit |
| Conversation size at delivery | number | No       | —                                     | Base for the reminder distance                           |
| Form                          | enum   | Yes      | Full or ReferencesOnly                | What was delivered                                       |
| Wording                       | enum   | Yes      | Conditional or Mandatory              | Whether a later change must re-deliver (BR-PFCI-05)      |

### Enum: DeliveryForm

| Value          | Meaning                                      |
| -------------- | -------------------------------------------- |
| Full           | Tag, short rules and references              |
| ReferencesOnly | Tag and references, used when space is short |

### Enum: DeliveryWording

| Value       | Meaning                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| Conditional | Delivered on a read: "if you will edit this file, read first", no protocol; covers reads only |
| Mandatory   | Delivered on a change: "must read first" and the protocol; covers reads and changes           |

### Relationships (detail)

| From             | To              | Cardinality | Business Meaning                                 |
| ---------------- | --------------- | ----------- | ------------------------------------------------ |
| ConventionClass  | ClassMatcher    | 1→N         | How a file is recognised as this kind            |
| ConventionClass  | DeliverableItem | 1→N         | What the assistant must know for this kind       |
| WorkingContext   | DeliveryRecord  | 1→N         | What this conversation was reminded of, and when |
| ConventionDigest | DigestSection   | 1→N         | One reminder block per delivered class           |

### Domain Events (business occurrences)

| Occurrence            | When it happens                                                   | Who/what reacts (business outcome)                                 |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| File Read or Changed  | The assistant successfully read, created, changed or moved a file | Matching classes are evaluated                                     |
| Conventions Delivered | A digest is handed to the host                                    | Delivery records are written for that context                      |
| Context Condensed     | The host shortened a conversation                                 | Earlier deliveries in the affected contexts stop counting          |
| Class Content Changed | A class's deliverable items or membership patterns were edited    | Its content version changes; the next matching trigger re-delivers |
| Detection Merged      | Setup merged detected classes                                     | New classes appear; maintainer classes are untouched               |

---

## 6. Process Flows

> No screen exists: the interaction surface is the reminder text the assistant receives, validation and merge summaries, the static instructions, and the lookup output.

### Flow: Deliver conventions after a read or change

```
┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐   ┌───────────┐
│ Read or    │──▶│ Find target  │──▶│ Match classes│──▶│ Skip those │──▶│ Deliver   │
│ change done│   │ files        │   │ and order    │   │ present    │   │ digest    │
└────────────┘   └──────────────┘   └──────────────┘   └────────────┘   └───────────┘
```

| Step | Actor     | Action                                                                        | System Response                                                                            | Next     |
| ---- | --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| 1    | Assistant | Successfully reads, creates, changes or moves files                           | Delivery switch and deliverable classes checked; otherwise nothing happens                 | 2 or end |
| 2    | System    | Identifies target files                                                       | Removals, folders, outside-project files and failed operations ignored                     | 3        |
| 3    | System    | Matches every class whose trigger accepts this operation against every target | Matched classes ordered by rank then definition order, capped; read wording per BR-PFCI-20 | 4        |
| 4    | System    | Determines working context, latest condensation and reminder distance         | Present classes skipped; a read-form delivery does not count on a change (BR-PFCI-05)      | 5 or end |
| 5    | System    | Assembles the digest within the size limit                                    | Critical references first and last; overflow reduced to references                         | 6        |
| 6    | System    | Hands the digest to the host, then records delivery                           | The assistant sees the digest before its next step                                         | end      |

### Flow: Record a condensation

| Step | Actor  | Action                                                                  | System Response                                                                                                 | Next |
| ---- | ------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1    | Host   | Reports that the conversation was condensed                             | The session's condensation time is recorded; nothing is shown; delivery memory older than seven days is removed | end  |
| 2    | System | Finds a condensation mark in a context's history during a later trigger | That context's condensation time is updated                                                                     | end  |

### Flow: Look up conventions without automatic delivery

| Step | Actor                   | Action                                       | System Response                                                                                     | Next |
| ---- | ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---- |
| 1    | Assistant or maintainer | Reads the static instructions before editing | Sees every deliverable class with patterns, references and version tags; short rules per BR-PFCI-13 | 2    |
| 2    | Assistant or maintainer | Runs the convention lookup for a file        | Prints the same ordered classes and content automatic delivery would use                            | end  |

### Flow: Merge detected classes during setup

| Step | Actor | Action                                                                                            | System Response                                         | Next |
| ---- | ----- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---- |
| 1    | Setup | Detects file kinds from existing project knowledge (modules, test locations, spec roots, styling) | Proposes classes marked as detected                     | 2    |
| 2    | Setup | Merges proposals by class name                                                                    | Adds new, refreshes unedited detected, keeps all others | 3    |
| 3    | Setup | Validates and regenerates the static instructions                                                 | Errors reported; static instructions list the classes   | end  |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create |            Edit            | Delete | Scope                                |
| -------------------- | :--: | :----: | :------------------------: | :----: | ------------------------------------ |
| Framework maintainer | yes  |  yes   |            yes             |  yes   | All classes and delivery settings    |
| Setup detection      | yes  |  yes   | detected-and-unedited only |   no   | Classes marked as detected           |
| AI assistant         | yes  |   no   |             no             |   no   | Receives digests and runs the lookup |

### Granular Permissions (if applicable)

| Permission                    | Description                                                        | Default Roles        |
| ----------------------------- | ------------------------------------------------------------------ | -------------------- |
| Can switch delivery on or off | Enable or disable automatic delivery while keeping static guidance | Framework maintainer |

Setup detection acts on the delivery switch only on a maintainer's explicit request during a setup run, and never turns on a switch the maintainer explicitly set to off.

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a framework maintainer or the AI assistant; the observable surface is the reminder text, validation and merge summaries, the static instructions and the lookup output (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: the 021-029 permission decade holds the setup-merge cases because the only permission boundary in this capability is that automatic setup may never overwrite maintainer-owned classes (see §7).

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 8      | 8         | 0      |
| P1        | 38     | 38        | 0      |
| P2        | 10     | 10        | 0      |
| **Total** | **56** | **56**    | **0**  |

| Category                     | TCs                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Core Delivery Tests          | TC-PFCI-001, TC-PFCI-002, TC-PFCI-003, TC-PFCI-004, TC-PFCI-005, TC-PFCI-083, TC-PFCI-084, TC-PFCI-085                           |
| Validation Tests             | TC-PFCI-011, TC-PFCI-012, TC-PFCI-013, TC-PFCI-014, TC-PFCI-015, TC-PFCI-016, TC-PFCI-017, TC-PFCI-018                           |
| Setup Merge Permission Tests | TC-PFCI-021, TC-PFCI-022, TC-PFCI-023                                                                                            |
| Delivery Lifecycle Tests     | TC-PFCI-031, TC-PFCI-032, TC-PFCI-033, TC-PFCI-034, TC-PFCI-035, TC-PFCI-036, TC-PFCI-037, TC-PFCI-038, TC-PFCI-039, TC-PFCI-040 |
| Host Signal Tests            | TC-PFCI-041                                                                                                                      |
| Edge and Failure Tests       | TC-PFCI-051, TC-PFCI-082, TC-PFCI-052, TC-PFCI-053, TC-PFCI-054, TC-PFCI-055, TC-PFCI-056                                        |
| Reminder Shape Tests         | TC-PFCI-061, TC-PFCI-062                                                                                                         |
| Invariant / Property Tests   | TC-PFCI-071, TC-PFCI-072, TC-PFCI-073, TC-PFCI-074, TC-PFCI-075, TC-PFCI-076, TC-PFCI-077, TC-PFCI-078, TC-PFCI-079              |
| Read/Edit Trigger Tests      | TC-PFCI-086, TC-PFCI-087, TC-PFCI-088, TC-PFCI-089, TC-PFCI-090, TC-PFCI-091, TC-PFCI-092, TC-PFCI-093                           |

### Core Delivery Tests

#### TC-PFCI-001: Reading a file of a class delivers its conventions [P1]

**Objective:** Prove that opening a file of a deliverable class puts that class's conventions in front of the assistant before its next step.

**Business Intent / Invariant Guarded:** The assistant is reminded of a file kind's rules before it composes an edit to an existing file (US-PFCI-02).

**Traces:** AC-PFCI-04 / BR-PFCI-02 / BR-PFCI-05

**Preconditions:**

- Delivery switch is on
- A class "hook source" matches hook source files and lists one short rule and one reference document
- No earlier delivery in this conversation

**Real-World Reachability:** A maintainer enabled delivery during setup; hours later the assistant opens a hook source file as the first step of a change.

**Demo Flow:** Open a hook source file in a fresh conversation and read the reminder shown after the file content.

```gherkin
Given delivery is on and the "hook source" class has a rule and a reference document
When the assistant finishes reading a hook source file
Then a reminder is shown naming "hook source", its reference document and its rule
And the operation result is unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Adds a reminder after the read; never changes or delays the read                                                                                              |
| **Business data state** | The conversation now counts "hook source" as reminded at the current version                                                                                  |
| **Data shown on UI**    | Reminder first line names the reference document; section tagged with the class name and version                                                              |

**Acceptance Criteria:**

- ✅ Reminder names the class, rule and reference document
- ❌ No reminder, or the read result altered

**Test Data:**

```json
{
    "file": ".claude/hooks/example-hook.cjs",
    "class": "hook source",
    "rules": ["Hooks use CommonJS"],
    "referenceDocs": [".claude/docs/hooks/README.md"]
}
```

**Edge Cases:**

- File of a kind with no class → no reminder

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/deliver-conventions]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-001 read delivers digest` · **Status:** Tested

---

#### TC-PFCI-002: Changing a file of a class delivers its conventions [P1]

**Objective:** Prove that a successful creation or change of a file of a deliverable class delivers the reminder before the assistant's next step.

**Business Intent / Invariant Guarded:** New files and files never read in this conversation still receive their conventions for the following edits (US-PFCI-02).

**Traces:** AC-PFCI-05 / BR-PFCI-14

**Preconditions:**

- Delivery switch is on
- A class "feature spec" matches spec documents and lists the spec protocol and three reference documents

**Real-World Reachability:** The assistant creates a new feature spec document during a workflow without having read one before.

**Demo Flow:** Create a new spec document and read the reminder shown after the creation result.

```gherkin
Given delivery is on and the "feature spec" class lists a protocol and reference documents
When the assistant successfully creates a feature spec document
Then a reminder naming "feature spec", the protocol reference and the reference documents is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Reminder added after the successful change                                                                                                                    |
| **Business data state** | "feature spec" counts as reminded in this conversation                                                                                                        |
| **Data shown on UI**    | Protocol reference and documents listed in the reminder                                                                                                       |

**Acceptance Criteria:**

- ✅ Reminder shown after creation and after changes of not-yet-reminded kinds
- ❌ No reminder after a successful creation of a class file

**Test Data:**

```json
{
    "tool": "create",
    "file": "docs/specs/Bucket/README.Feature.md",
    "skills": ["spec"]
}
```

**Edge Cases:**

- The same change repeated immediately → no second reminder (see TC-PFCI-031)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/deliver-conventions]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-002 edit delivers digest` · **Status:** Tested

---

#### TC-PFCI-003: A multi-file change combines the classes of all touched files [P1]

**Objective:** Prove that one change touching several files delivers each matched class once, and ignores removed files.

**Business Intent / Invariant Guarded:** Hosts that change several files in one step still receive every relevant convention without duplicates (BR-PFCI-14).

**Traces:** AC-PFCI-05 / BR-PFCI-14

**Preconditions:**

- Delivery switch is on
- Classes "hook source" and "feature spec" exist

**Real-World Reachability:** A patch-based assistant host adds a spec, updates a hook and deletes an obsolete file in one patch.

**Demo Flow:** Apply one patch that adds a spec, updates a hook source file and removes another file; read the reminder.

```gherkin
Given classes "hook source" and "feature spec" exist
When one patch adds a spec document, updates a hook source file and removes an unrelated file
Then one reminder contains exactly one "feature spec" section and one "hook source" section
And the removed file contributes nothing
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Targets taken from added, updated and moved-to files only                                                                                                     |
| **Business data state** | Both classes counted as reminded                                                                                                                              |
| **Data shown on UI**    | Opening line names the first touched file and "(+1 more)"; two tagged sections in precedence order                                                            |

**Acceptance Criteria:**

- ✅ Union of classes, each once
- ❌ A class repeated, or a removal triggering a class

**Test Data:**

```json
{
    "patch": ["*** Add File: docs/specs/B/README.F.md", "*** Update File: .claude/hooks/x.cjs", "*** Delete File: .claude/hooks/old.cjs"]
}
```

**Edge Cases:**

- Patch moving a file into a class location → the destination counts and its class reminder is shown
- Patch moving a file out of a class location into an unclassified one → the former location's class is not reminded

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/extract-targets]`
> **Related Behaviors:** `operation/hooks/extract-targets` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-003 codex patch targets union` · **Status:** Tested

---

#### TC-PFCI-004: Convention lookup prints what delivery would show [P1]

**Objective:** Prove that the on-demand lookup for a file prints the same ordered classes and content as automatic delivery in a fresh conversation.

**Business Intent / Invariant Guarded:** Assistants on hosts without automatic delivery get identical guidance (US-PFCI-05, BR-PFCI-13).

**Traces:** AC-PFCI-22 / BR-PFCI-13

**Preconditions:**

- Classes with rules, protocol references and reference documents exist

**Real-World Reachability:** A maintainer on a host without automatic delivery runs the lookup before editing a hook.

**Demo Flow:** Run the convention lookup for a hook source file and compare with the reminder delivered in a fresh conversation.

```gherkin
Given several classes match a hook source file
When the lookup is run for that file
And the same file is read in a fresh conversation with delivery on
Then both outputs contain the same sections in the same order with the same text
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Lookup never consults or writes delivery memory                                                                                                               |
| **Business data state** | No delivery record created by the lookup                                                                                                                      |
| **Data shown on UI**    | Identical section text                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Same content and order
- ❌ Lookup differs from delivery or records a delivery

**Test Data:**

```json
{
    "file": ".claude/hooks/example-hook.cjs"
}
```

**Edge Cases:**

- File matching no class → lookup reports no conventions
- Machine-readable lookup → also states whether automatic delivery and the read trigger are on
- Delivery switched off → the same lookup text, plus a note (on the diagnostic stream only) that automatic delivery is off
- No file given → usage text and a usage exit status

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/lookup-conventions]`
> **Related Behaviors:** `operation/hooks/lookup-conventions` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-004 lookup equals delivered digest` · **Status:** Tested

---

#### TC-PFCI-005: Static instructions list every deliverable class [P1]

**Objective:** Prove that regenerated static instructions show every deliverable class with patterns, protocol references, documents and version tag.

**Business Intent / Invariant Guarded:** Automatic delivery is never the only carrier of a convention (BR-PFCI-13).

**Traces:** AC-PFCI-21 / BR-PFCI-13

**Preconditions:**

- A class with only short rules and a protocol reference (no guide document) exists
- A class with a guide document exists

**Real-World Reachability:** Setup regenerates the static instructions after adding classes.

**Demo Flow:** Regenerate the static instructions and read the per-file conventions table.

```gherkin
Given a class without any guide document but with rules and a protocol reference
And a class with a guide document
When the static instructions are regenerated
Then the table has a row for the first class with its patterns, protocol reference and version tag
And its rules appear among the golden rules
And the row for the class with a guide document lists that document as a reference document
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Every deliverable class rendered; non-deliverable classes omitted                                                                                             |
| **Business data state** | Static instructions carry the same version tag automatic delivery uses                                                                                        |
| **Data shown on UI**    | Table row per deliverable class                                                                                                                               |

**Acceptance Criteria:**

- ✅ Every deliverable class present
- ❌ A deliverable class missing because it has no guide document

**Test Data:**

```json
{
    "groups": [
        {
            "name": "generated-mirrors",
            "pathGlobs": [".agents/**"],
            "rules": ["Never hand-edit"],
            "skills": ["spec"]
        },
        {
            "name": "hooks-context",
            "pathGlobs": [".claude/hooks/*.cjs"],
            "guideDoc": ".claude/docs/hooks/README.md"
        }
    ]
}
```

**Edge Cases:**

- Class with only a styling link → not rendered as deliverable
- Class with a file-type filter and exclusions → its row states the file types and every exclusion after its include patterns
- Project opted out of repeating short rules → the golden rules follow BR-PFCI-13's exception (TC-PFCI-083, TC-PFCI-084, TC-PFCI-085)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/hooks/static-convention-table]`
> **Related Behaviors:** `component/hooks/static-convention-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-005 static table renders every injectable group` · **Status:** Tested

---

#### TC-PFCI-083: Opting out of inline rules names each class and leaves its rules to the lookup [P1]

**Objective:** Prove that when a project opts out of repeating short rules and both preconditions hold, the golden rules name every class that has short rules without repeating their text, and the lookup prints each named class's rules for a matching file.

**Business Intent / Invariant Guarded:** Shorter static instructions never cost a convention — the lookup remains a non-automatic carrier, so automatic delivery is still never the only one (BR-PFCI-13).

**Traces:** AC-PFCI-29 / AC-PFCI-21 / BR-PFCI-13

**Preconditions:**

- Automatic delivery is switched on
- The convention lookup is available
- The project opted out of repeating short rules in the static instructions
- Two classes with short rules exist, and one class with only a reference document

**Real-World Reachability:** A maintainer with many classes trims the always-loaded instructions to save the assistant's attention budget.

**Demo Flow:** Regenerate the static instructions, read the golden rules, then run the lookup for a file of each named class.

```gherkin
Given the project opted out of repeating short rules in the static instructions
And automatic delivery is switched on
And the convention lookup is available
When the static instructions are regenerated
Then the golden rules name every class that has short rules and point to the convention lookup
And none of those classes' rule text appears among the golden rules
And every class row still shows its patterns, file-type filter, exclusions, references and version tag
And the lookup for a file of each named class prints that class's rules
```

**Expected Result:**

| Dimension               | Expectation                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the static instructions and the lookup output                        |
| **System behavior**     | Compact golden rules rendered; no warning to the maintainer                                                     |
| **Business data state** | Class rows and version tags unchanged from the default mode                                                     |
| **Data shown on UI**    | One golden-rules entry naming the rule-bearing classes and the lookup; the lookup shows each class's full rules |

**Acceptance Criteria:**

- ✅ Every rule-bearing class named; each named class's rules returned by the lookup for a matching file
- ❌ Any rule text among the golden rules, a rule-bearing class missing from the names, or a named class whose rules the lookup does not print

**Test Data:**

```yaml
inputDomain: 'configurations that opt out, switch delivery on and have the lookup available, with classes that do and do not carry short rules'
invariant: 'every short rule reachable through the lookup and absent from the golden rules; class names in precedence order'
boundaryCounterCase: 'a class with only a reference document → keeps its row but is not named among the golden rules; a class with short rules ranked beyond the per-file class limit (two overlapping rule-bearing classes, limit one) → the opt-out is refused and every short rule stays inline, and raising the limit to cover both restores the compact form; a class whose rules make the largest possible digest exceed the size limit (minimum size limit, long rules) → refused and inline, while the widest size limit admits it'
```

**Edge Cases:**

- Class name containing characters that would break the rendered text → escaped the same way as its table row
- Default (not opted out) regenerated right after → every short rule returns to the golden rules
- No class carries short rules → nothing to compact and no warning
- A rule-bearing class the lookup cannot print (no name, or a name shared with another class) → opt-out refused, every rule stays inline and the warning names that class
- A rule-bearing class delivered on reads only → opt-out refused (TC-PFCI-093)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/static-parity]`
> **Related Behaviors:** `constraint/hooks/static-parity` · `component/hooks/static-convention-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-083 path rules always reach the agent: compact golden rules name every group and the lookup delivers its rules` · **Status:** Tested

---

#### TC-PFCI-084: Opting out without automatic delivery keeps rules inline [P1]

**Objective:** Prove that the opt-out is refused when automatic delivery is switched off or never configured, so every short rule stays among the golden rules and the maintainer is warned.

**Business Intent / Invariant Guarded:** On a project where nothing delivers reminders automatically, the static instructions must keep carrying every rule (BR-PFCI-13).

**Traces:** AC-PFCI-29 / AC-PFCI-21 / BR-PFCI-13

**Preconditions:**

- The project opted out of repeating short rules in the static instructions
- Automatic delivery is switched off, or its switch was never configured
- A class with short rules exists

**Real-World Reachability:** A maintainer copies an opted-out configuration into a project that never switched automatic delivery on.

**Demo Flow:** Regenerate the static instructions and read the golden rules and the regeneration messages.

```gherkin
Given the project opted out of repeating short rules in the static instructions
And automatic delivery is switched off or was never configured
When the static instructions are regenerated
Then every short rule appears among the golden rules exactly as in the default mode
And the maintainer is warned that the opt-out was not honored
```

**Expected Result:**

| Dimension               | Expectation                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the static instructions and the lookup output |
| **System behavior**     | Opt-out refused; default rendering used                                                  |
| **Business data state** | Static instructions identical to the default mode                                        |
| **Data shown on UI**    | Every short rule among the golden rules; a warning in the regeneration messages          |

**Acceptance Criteria:**

- ✅ Every short rule inline and the maintainer warned
- ❌ Compact golden rules while automatic delivery is off, or a silent refusal

**Test Data:**

```yaml
inputDomain: 'opted-out configurations whose delivery switch is off or absent'
invariant: 'golden rules equal the default mode for ALL such configurations'
boundaryCounterCase: 'the same configuration with delivery switched on and the lookup available → compact (TC-PFCI-083)'
```

**Edge Cases:**

- Delivery switch explicitly off and delivery switch absent → same inline outcome
- Project not opted out → inline with no warning

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/static-parity]`
> **Related Behaviors:** `constraint/hooks/static-parity` · `rule/hooks/explicit-opt-in` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-084 path rules always reach the agent: inlinePathRules false with injection absent or disabled keeps rules inline and warns` · **Status:** Tested

---

#### TC-PFCI-085: Opting out without the convention lookup keeps rules inline [P1]

**Objective:** Prove that the opt-out is refused when the convention lookup is not available, even with automatic delivery switched on, so every short rule stays among the golden rules and the maintainer is warned.

**Business Intent / Invariant Guarded:** Without the lookup, automatic delivery would become the only carrier of the rules — the one outcome BR-PFCI-13 forbids.

**Traces:** AC-PFCI-29 / AC-PFCI-21 / BR-PFCI-13

**Preconditions:**

- The project opted out of repeating short rules in the static instructions
- Automatic delivery is switched on
- The convention lookup is not available in the project
- A class with short rules exists

**Real-World Reachability:** An adopter copies only part of the framework, leaving out the lookup, into a project whose configuration already opted out.

**Demo Flow:** Regenerate the static instructions in a project without the lookup and read the golden rules and the regeneration messages.

```gherkin
Given the project opted out of repeating short rules in the static instructions
And automatic delivery is switched on
And the convention lookup is not available
When the static instructions are regenerated
Then every short rule appears among the golden rules exactly as in the default mode
And the maintainer is warned that the opt-out was not honored
```

**Expected Result:**

| Dimension               | Expectation                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the static instructions and the lookup output |
| **System behavior**     | Opt-out refused; default rendering used                                                  |
| **Business data state** | Static instructions identical to the default mode                                        |
| **Data shown on UI**    | Every short rule among the golden rules; a warning in the regeneration messages          |

**Acceptance Criteria:**

- ✅ Every short rule inline and the maintainer warned
- ❌ Compact golden rules pointing to a lookup that does not exist

**Test Data:**

```yaml
inputDomain: 'opted-out configurations with delivery switched on in a project lacking the convention lookup'
invariant: 'golden rules equal the default mode whenever the lookup is unavailable'
boundaryCounterCase: 'the lookup restored → the next regeneration renders compact golden rules (TC-PFCI-083)'
```

**Edge Cases:**

- A partial framework copy that carries the static-instructions generator but not the lookup → rules stay inline; adding the lookup to that same project is the only change needed to render compact golden rules

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/static-parity]`
> **Related Behaviors:** `constraint/hooks/static-parity` · `component/hooks/static-convention-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-085 path rules always reach the agent: inlinePathRules false with the conventions lib unavailable keeps rules inline` · **Status:** Tested

---

### Validation Tests

#### TC-PFCI-011: A well-formed class definition is accepted [P2]

**Objective:** Prove that a class with a name, an include pattern and a deliverable item validates without errors.

**Business Intent / Invariant Guarded:** Maintainers can define classes with any include form (US-PFCI-01).

**Traces:** AC-PFCI-01

**Preconditions:**

- Configuration with required project sections

**Real-World Reachability:** A maintainer adds a class using a wildcard location instead of a location pattern.

**Demo Flow:** Validate a configuration containing a wildcard-only class.

```gherkin
Given a class named "feature-spec" with only a wildcard location and a reference document
When the configuration is validated
Then validation passes with no errors
And the same passes for a class with only a location pattern and for a class with only a file-name pattern
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Validator accepts                                                                                                                                             |
| **Business data state** | Configuration unchanged                                                                                                                                       |
| **Data shown on UI**    | Validation result PASSED                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Valid with regex-only, wildcard-only and file-name-only includes
- ❌ Error for a valid include form

**Test Data:**

```json
{
    "name": "feature-spec",
    "pathRegexes": [],
    "pathGlobs": ["docs/specs/**/*.md"],
    "referenceDocs": ["docs/project-reference/feature-spec-reference.md"]
}
```

**Edge Cases:**

- Existing class shape with only location patterns stays valid
- Location-pattern list left out entirely (instead of empty) → validation fails naming the class

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/context-group-schema]`
> **Related Behaviors:** `constraint/hooks/context-group-schema` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-011 valid group forms accepted` · **Status:** Tested

---

#### TC-PFCI-012: Invalid class definitions are rejected by name [P1]

**Objective:** Prove that duplicate names, missing include patterns and malformed patterns are errors naming the class.

**Business Intent / Invariant Guarded:** A class that can never match, or two classes with one identity, must not silently ship (BR-PFCI-11).

**Traces:** AC-PFCI-02 / BR-PFCI-11

**Preconditions:**

- Configuration with required project sections

**Real-World Reachability:** A maintainer copies a class and forgets to rename it, or leaves every include list empty.

**Demo Flow:** Validate configurations containing each defect.

```gherkin
Given a configuration with two classes named "hooks-context"
When it is validated
Then validation fails with an error naming "hooks-context"
And the same happens for a class with no include pattern and for a malformed pattern
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Validator reports errors; warns on unknown class fields and non-whole ranks                                                                                   |
| **Business data state** | Configuration unchanged                                                                                                                                       |
| **Data shown on UI**    | Error lines naming the class                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Each defect produces an error naming the class
- ❌ Any defect passing validation

**Test Data:**

```yaml
inputDomain: 'any class definition with a blank or duplicate name, zero include patterns, or a pattern that does not compile'
invariant: 'validation fails and the error names the offending class (or its position in the list when the name is blank) — for ALL such definitions'
boundaryCounterCase: 'the same class with one valid include pattern and a unique name → validation passes'
```

**Edge Cases:**

- Unknown class field → warning only
- Rank 1.5 → warning only
- Blank or missing name on the second class → the error names that position in the class list

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/valid-class-definitions]`
> **Related Behaviors:** `rule/hooks/valid-class-definitions` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-012 invalid groups rejected` · **Status:** Tested

---

#### TC-PFCI-013: Out-of-range delivery settings are rejected [P2]

**Objective:** Prove that delivery settings outside their allowed ranges fail validation.

**Business Intent / Invariant Guarded:** A size limit of zero or a negative distance would silently disable or flood reminders (BR-PFCI-11).

**Traces:** BR-PFCI-11

**Preconditions:**

- Configuration with required project sections

**Real-World Reachability:** A maintainer mistypes the size limit while tuning delivery.

**Demo Flow:** Validate configurations with each setting just outside its range, then at each exact range edge.

```gherkin
Given delivery settings with a size limit of 499 characters
When the configuration is validated
Then validation fails naming the size limit setting
And a class maximum of 0, a distance of 4499999, a measured time limit of 1441 minutes and a blind time limit of 1441 minutes each fail naming their setting
And every setting at its exact range edge passes
And every range-checked setting is a declared setting, so a mistyped name is reported as an unknown field rather than silently ignored
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Validator reports range errors                                                                                                                                |
| **Business data state** | Configuration unchanged                                                                                                                                       |
| **Data shown on UI**    | Error line naming the setting and its range                                                                                                                   |

**Acceptance Criteria:**

- ✅ Out-of-range values rejected; edge values accepted
- ❌ Out-of-range value accepted or edge value rejected

**Test Data:**

```json
{
    "conventionInjection": {
        "enabled": true,
        "maxChars": 499,
        "maxClassesPerEdit": 0,
        "reinjectAfterBytes": 4499999,
        "reinjectAfterMinutes": 1441,
        "blindReinjectAfterMinutes": 1441
    }
}
```

```yaml
inputDomain: 'each delivery setting at any value outside its range (size limit <500 or >10000; class maximum <1 or >10; distance <4500000; measured minutes <1 or >1440; blind minutes <1 or >1440)'
invariant: 'validation fails naming that setting, and delivery ignores that value and uses the default — for ALL such values'
boundaryCounterCase: 'each setting at its exact edge (500, 10000, 1, 10, 4500000, 1, 1440) → validation passes and delivery uses exactly that value'
```

**Edge Cases:**

- Settings object absent → valid, delivery off
- Distance at the largest whole number the configuration can hold → accepted (the distance has no upper limit)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/convention-injection-settings]`
> **Related Behaviors:** `constraint/hooks/convention-injection-settings` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-013 settings ranges validated` · **Status:** Tested

---

#### TC-PFCI-014: An exclude pattern removes a file from its class [P1]

**Objective:** Prove that a file matching both an include and an exclude pattern of a class is not a member.

**Business Intent / Invariant Guarded:** Maintainers can carve out sub-kinds (for example tests inside a source folder) without false reminders (BR-PFCI-02).

**Traces:** AC-PFCI-06 / BR-PFCI-02

**Preconditions:**

- Class "hooks-context" includes all hook source files and excludes the hook tests folder

**Real-World Reachability:** The assistant edits a hook test file after the maintainer separated test conventions.

**Demo Flow:** Change a file under the hook tests folder and read the reminder.

```gherkin
Given "hooks-context" includes hook source files and excludes the hook tests folder
When the assistant changes a hook test file
Then no "hooks-context" section is delivered
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Exclusion wins over inclusion                                                                                                                                 |
| **Business data state** | No record for "hooks-context"                                                                                                                                 |
| **Data shown on UI**    | No section for the excluded class                                                                                                                             |

**Acceptance Criteria:**

- ✅ Excluded file gets no section for that class
- ❌ Excluded class delivered

**Test Data:**

```json
{
    "pathRegexes": ["[\\\\/]\\.claude[\\\\/]hooks[\\\\/].*\\.cjs$"],
    "excludePathGlobs": [".claude/hooks/tests/**"],
    "file": ".claude/hooks/tests/suites/a.test.cjs"
}
```

**Edge Cases:**

- Exclude by location pattern behaves the same as exclude by wildcard

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/class-membership]`
> **Related Behaviors:** `rule/hooks/class-membership` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-014 exclude wins` · **Status:** Tested

---

#### TC-PFCI-015: The file-type filter must also accept the file [P2]

**Objective:** Prove that a location match alone is not enough when a file-type filter rejects the file.

**Business Intent / Invariant Guarded:** Documentation next to code does not receive code conventions (BR-PFCI-02).

**Traces:** BR-PFCI-02

**Preconditions:**

- Class "hooks-context" matches the hooks folder with a file-type filter of script files

**Real-World Reachability:** The assistant reads a markdown note inside the hooks folder.

**Demo Flow:** Read a markdown file inside the hooks folder.

```gherkin
Given "hooks-context" is limited to script files
When the assistant reads a markdown file in the hooks folder
Then no "hooks-context" section is delivered
And a script file in that folder whose type is written in upper case is still reminded
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Filter compared case-insensitively on the file type                                                                                                           |
| **Business data state** | No record created                                                                                                                                             |
| **Data shown on UI**    | No reminder                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Filtered-out type gets nothing; upper-case type still matches
- ❌ Wrong type delivered

**Test Data:**

```json
{
    "fileExtensions": [".cjs"],
    "file": ".claude/hooks/NOTES.md"
}
```

**Edge Cases:**

- File with no type and a filter present → not a member

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/class-membership]`
> **Related Behaviors:** `rule/hooks/class-membership` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-015 extension filter conjunct` · **Status:** Tested

---

#### TC-PFCI-016: Removals, outside-project files, folders and failed operations are ignored [P1]

**Objective:** Prove that deleted files, files outside the project, folder reads and operations the host reports as failed deliver nothing.

**Business Intent / Invariant Guarded:** Reminders relate only to work on project files (BR-PFCI-14).

**Traces:** AC-PFCI-08 / BR-PFCI-14

**Preconditions:**

- Delivery switch is on
- A catch-all general-code class exists

**Real-World Reachability:** The assistant reads a file in a sibling repository or deletes an obsolete script.

**Demo Flow:** Read a file outside the project, apply a delete-only patch, read a folder, and make a change the host reports as failed.

```gherkin
Scenario: file outside the project
Given a general-code class matching every script file
When the assistant reads a script outside the project root
Then no reminder is shown
Scenario: removal only
Given the same class
When the assistant applies a patch that only deletes a script
Then no reminder is shown
Scenario: folder read
Given the same class
When the assistant reads a folder instead of a file
Then no reminder is shown
Scenario: failed change
Given the same class
When the host reports that a change to a script failed
Then no reminder is shown and the class is not counted as reminded
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Outside-root, deletion, folder and failed-operation triggers dropped before matching                                                                          |
| **Business data state** | No record                                                                                                                                                     |
| **Data shown on UI**    | No reminder                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Nothing delivered in all four scenarios
- ❌ Reminder for an outside, deleted, folder or failed target

**Test Data:**

```json
{
    "outside": "../other-repo/x.cjs",
    "patch": ["*** Delete File: .claude/hooks/old.cjs"],
    "folder": ".claude/hooks",
    "failedChange": {
        "file": ".claude/hooks/x.cjs",
        "hostReportsFailure": true
    }
}
```

**Edge Cases:**

- Path with parent-directory segments resolving inside the project → evaluated normally

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/relevant-targets]`
> **Related Behaviors:** `rule/hooks/relevant-targets` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-016 ignores outside and delete targets` · **Status:** Tested

---

#### TC-PFCI-017: Reading can be excluded as a trigger [P2]

**Objective:** Prove that with the read trigger switched off, reads deliver nothing while changes still deliver.

**Business Intent / Invariant Guarded:** Projects whose exploration reads many files can reduce reminder volume without losing edit-time reminders.

**Traces:** AC-PFCI-09

**Preconditions:**

- Delivery on, read trigger off
- Class "hooks-context" exists

**Real-World Reachability:** A maintainer turned off the read trigger after noticing reminders during research sessions.

**Demo Flow:** Read then change a hook source file.

```gherkin
Given the read trigger is off
When the assistant reads a hook source file
Then no reminder is shown
When it then changes that file
Then the "hooks-context" reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Read events skipped before matching                                                                                                                           |
| **Business data state** | Record created only by the change                                                                                                                             |
| **Data shown on UI**    | Reminder after the change only                                                                                                                                |

**Acceptance Criteria:**

- ✅ Change still delivers
- ❌ Read delivers while disabled

**Test Data:**

```json
{
    "conventionInjection": {
        "enabled": true,
        "onRead": false
    }
}
```

**Edge Cases:**

- Read trigger setting absent → reads deliver

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/relevant-targets]`
> **Related Behaviors:** `rule/hooks/relevant-targets` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-017 onRead false skips reads` · **Status:** Tested

---

#### TC-PFCI-018: A class without deliverable items is never delivered [P1]

**Objective:** Prove that a class with only styling or design links, or no items at all, produces no reminder.

**Business Intent / Invariant Guarded:** Only classes that carry something to remember are delivered (BR-PFCI-03).

**Traces:** BR-PFCI-03

**Preconditions:**

- Delivery on
- Class "styles" has only a styling link

**Real-World Reachability:** An older configuration carries a styling-only class.

**Demo Flow:** Change a stylesheet matched by that class.

```gherkin
Given "styles" has only a styling link
When the assistant changes a matched stylesheet
Then no reminder is shown
And the same holds for a class with only a design-system link and for a class with no items at all
And a class with only a reference document is reminded
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Non-deliverable classes filtered out                                                                                                                          |
| **Business data state** | No record                                                                                                                                                     |
| **Data shown on UI**    | No reminder                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ No reminder for non-deliverable classes; reminder for any class with one deliverable item
- ❌ Empty section delivered, or a class with one deliverable item skipped

**Test Data:**

```json
{
    "name": "styles",
    "pathGlobs": ["**/*.scss"],
    "stylingDoc": "docs/styling.md"
}
```

```yaml
inputDomain: 'every combination of presence of short rules, protocol references, reference documents, styling link and design-system link on a matching class'
invariant: 'the class is deliverable iff at least one short rule, protocol reference or reference document is present — for ALL combinations'
boundaryCounterCase: 'only a reference document present (no rules, no protocol) → deliverable'
```

**Edge Cases:**

- Same class gaining one rule → delivered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/deliverable-classes]`
> **Related Behaviors:** `rule/hooks/deliverable-classes` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-018 non-injectable group skipped` · **Status:** Tested

---

### Setup Merge Permission Tests

#### TC-PFCI-021: Setup adds a newly detected class [P1]

**Objective:** Prove that merging detection results adds a class whose name is not configured and marks it as detected.

**Business Intent / Invariant Guarded:** New projects get useful classes automatically (US-PFCI-06).

**Traces:** AC-PFCI-23 / BR-PFCI-12

**Preconditions:**

- Configuration without a "feature-spec" class
- Project declares a spec root with the canonical spec reference documents present

**Real-World Reachability:** Setup runs on a project that just created its spec root.

**Demo Flow:** Run detection and merge; read the resulting class list.

```gherkin
Given no "feature-spec" class is configured and the spec root exists
When detection results are merged
Then a "feature-spec" class is added marked as detected with a detection fingerprint
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Merge reports the class under added                                                                                                                           |
| **Business data state** | Configuration gains one detected class                                                                                                                        |
| **Data shown on UI**    | Merge summary lists "feature-spec" as added                                                                                                                   |

**Acceptance Criteria:**

- ✅ Added and marked detected
- ❌ Class added without detected marking, or detected with missing documents

**Test Data:**

```json
{
    "specRoots": {
        "business": {
            "path": "docs/specs"
        }
    }
}
```

**Edge Cases:**

- One referenced document missing on disk → that document is left out and the class is still proposed
- Nothing deliverable left on disk → class not proposed
- The class's protocol missing on disk → the protocol reference is left out and the class is still proposed with its documents
- Configuration recording a spec root, integration and other test locations, end-to-end tests, backend and frontend modules, styling file types and a project language → exactly one class proposed per kind: feature-spec, integration-test, e2e-test, test, backend, frontend, styling, general-code — each with exactly its kind's locations, file types, rank band (specific 100, default 500, general 900), reference documents and protocols
- General-code class → files under dependency or build output (any depth) and under the project-root temporary folders are not members; a temporary folder nested deeper in the project is still a member

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/merge-detected-classes]`
> **Related Behaviors:** `operation/hooks/merge-detected-classes` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-021 merge adds detected group` · **Status:** Tested

---

#### TC-PFCI-022: Setup never changes maintainer classes or edited detected classes [P0]

**Objective:** Prove that merging leaves maintainer classes and detected classes edited since detection byte-for-byte unchanged.

**Business Intent / Invariant Guarded:** Maintainer work is never lost to automation (BR-PFCI-12).

**Traces:** AC-PFCI-24 / BR-PFCI-12

**Preconditions:**

- A maintainer class "feature-spec" with hand-written rules
- A detected class "integration-test" whose rules a maintainer edited

**Real-World Reachability:** A maintainer tuned classes weeks after setup; setup runs again after a re-scan.

**Demo Flow:** Run detection and merge; compare both classes with their previous definitions.

```gherkin
Scenario: maintainer and edited detected classes are kept
Given a maintainer-written "feature-spec" class and an edited detected "integration-test" class
When detection results with the same names are merged
Then both classes are identical to before
And the merge summary lists them as kept
Scenario: the maintainer's delivery switch is respected
Given the maintainer explicitly switched delivery off
When setup is run with an explicit request to switch delivery on
Then delivery stays off and the other delivery settings are unchanged
And a setup run without that explicit request never switches delivery on
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Merge keeps both                                                                                                                                              |
| **Business data state** | Both class definitions unchanged                                                                                                                              |
| **Data shown on UI**    | Merge summary lists both as kept                                                                                                                              |

**Acceptance Criteria:**

- ✅ Unchanged and reported kept
- ❌ Any field of either class changed or removed

**Test Data:**

```yaml
inputDomain: 'any configuration of maintainer classes and edited detected classes, and any detection result reusing their names'
invariant: 'every such class is unchanged after merge and no class is removed — for ALL inputs'
boundaryCounterCase: 'a detected class whose fingerprint still matches its content → refreshed (TC-PFCI-023)'
```

**Edge Cases:**

- Class without an origin marker → treated as maintainer
- No maintainer choice recorded and an explicit setup request → delivery switched on, other settings kept
- Setup asked only to switch delivery on for an already merged configuration (nothing to add or refresh) → switched on; the rewritten configuration is complete and no temporary file is left beside it
- Maintainer switched delivery off and setup asks to switch it on → the request is reported as skipped and the configuration is untouched

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/merge-never-overwrites]`
> **Related Behaviors:** `rule/hooks/merge-never-overwrites` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-022 merge keeps user and edited groups` · **Status:** Tested

---

#### TC-PFCI-023: Setup refreshes an unedited detected class [P1]

**Objective:** Prove that a detected class nobody edited is replaced by newer detection results.

**Business Intent / Invariant Guarded:** Detected classes stay current as the project evolves (US-PFCI-06).

**Traces:** AC-PFCI-25 / BR-PFCI-12

**Preconditions:**

- A detected class "integration-test" unchanged since detection
- The project added a second test project

**Real-World Reachability:** The team adds a new integration test project; setup is re-run.

**Demo Flow:** Run detection and merge; read the class patterns.

```gherkin
Given an unedited detected "integration-test" class covering one test project
When newer detection covering two test projects is merged
Then the class covers both test projects and carries a new fingerprint
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Merge reports refreshed                                                                                                                                       |
| **Business data state** | Class updated to new detection                                                                                                                                |
| **Data shown on UI**    | Merge summary lists "integration-test" as refreshed                                                                                                           |

**Acceptance Criteria:**

- ✅ Refreshed
- ❌ Kept stale

**Test Data:**

```json
{
    "before": {
        "pathGlobs": ["tests/A/**"]
    },
    "after": {
        "pathGlobs": ["tests/A/**", "tests/B/**"]
    }
}
```

**Edge Cases:**

- Identical detection → reported kept, nothing written

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/merge-detected-classes]`
> **Related Behaviors:** `operation/hooks/merge-detected-classes` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-023 merge refreshes unedited detected group` · **Status:** Tested

---

### Delivery Lifecycle Tests

#### TC-PFCI-031: No duplicate reminder within one conversation [P1]

**Objective:** Prove that a class already delivered at the current version is not delivered again on the next matching file.

**Business Intent / Invariant Guarded:** Reminders stay meaningful instead of noise (US-PFCI-03).

**Traces:** AC-PFCI-10 / BR-PFCI-05

**Preconditions:**

- "hooks-context" delivered moments ago in this conversation

**Real-World Reachability:** The assistant changes one hook file, then another a minute later.

**Demo Flow:** Change a hook file, then change another; observe reminders.

```gherkin
Given "hooks-context" was delivered in this conversation a moment ago
When the assistant changes another hook source file
Then no reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Present class skipped                                                                                                                                         |
| **Business data state** | Record unchanged                                                                                                                                              |
| **Data shown on UI**    | No reminder on the second trigger                                                                                                                             |

**Acceptance Criteria:**

- ✅ One reminder total
- ❌ Second reminder

**Test Data:**

```json
{
    "sequence": ["edit .claude/hooks/a.cjs", "edit .claude/hooks/b.cjs"]
}
```

**Edge Cases:**

- Second file also matches a new class → only the new class is delivered
- The earlier delivery came from a read, with the conditional wording → the change delivers the class once more with the mandatory wording (TC-PFCI-092)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/presence-decides-delivery]`
> **Related Behaviors:** `rule/hooks/presence-decides-delivery` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-031 dedup same scope` · **Status:** Tested

---

#### TC-PFCI-032: A condensation reported by the host re-arms delivery [P1]

**Objective:** Prove that after the host reports a condensation, previously delivered classes are delivered again.

**Business Intent / Invariant Guarded:** Reminders lost to condensation come back (BR-PFCI-06).

**Traces:** AC-PFCI-11 / BR-PFCI-06

**Preconditions:**

- "hooks-context" delivered in the main conversation

**Real-World Reachability:** A long session is condensed automatically; the assistant continues editing hooks.

**Demo Flow:** Deliver, report a condensation, change a hook file.

```gherkin
Given "hooks-context" was delivered in the main conversation and in a helper agent
When the host reports the session was condensed
And the assistant then changes a hook source file
Then the "hooks-context" reminder is shown again
And the helper agent is also shown the reminder again on its next change
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Session condensation time recorded; earlier deliveries stop counting                                                                                          |
| **Business data state** | New record after re-delivery                                                                                                                                  |
| **Data shown on UI**    | Reminder shown again                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Re-delivered after condensation; clearing the conversation behaves the same
- ❌ Suppressed after condensation

**Test Data:**

```json
{
    "sessionStartSource": ["compact", "clear"]
}
```

**Edge Cases:**

- Condensation reported for another session → no effect
- Helper agent whose own history can be inspected → not re-armed by the session report; re-armed by a condensation mark in its own history
- Helper agent whose history location cannot be derived → re-armed by the session report

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/condensation-invalidates]`
> **Related Behaviors:** `rule/hooks/condensation-invalidates` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-032 SessionStart compact re-arms` · **Status:** Tested

---

#### TC-PFCI-033: A condensation found in the conversation history re-arms delivery [P1]

**Objective:** Prove that a condensation mark written into a context's history after a delivery re-arms that context.

**Business Intent / Invariant Guarded:** Helper agents and hosts without a condensation report still recover reminders (BR-PFCI-06).

**Traces:** AC-PFCI-11 / BR-PFCI-06

**Preconditions:**

- "hooks-context" delivered
- Conversation history later gains a condensation mark

**Real-World Reachability:** A helper agent's own conversation is condensed mid-task.

**Demo Flow:** Deliver, append a condensation mark to the history, change a hook file.

```gherkin
Given "hooks-context" was delivered
When a condensation mark appears later in the conversation history
And a hook source file is changed
Then the reminder is shown again
And when more history accumulated since the last check than can be inspected, the next change also shows the reminder again
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | History scanned incrementally                                                                                                                                 |
| **Business data state** | Condensation time updated                                                                                                                                     |
| **Data shown on UI**    | Reminder shown again                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Re-delivered; a custom condensation marker works the same
- ❌ Old marks before the delivery re-arm delivery

**Test Data:**

```json
{
    "transcriptLine": {
        "type": "system",
        "subtype": "compact_boundary",
        "timestamp": "after delivery"
    }
}
```

**Edge Cases:**

- History rewritten shorter → rescanned from the start
- History grew past the inspection cap → condensation assumed just before the check, so a reminder delivered in that same check counts as present on the next one
- History unchanged since the last check → nothing rewritten
- A host that never reports a condensation at session level → the whole deliver, condense and re-deliver cycle still runs from the history marks alone, and the retention sweep still happens on the delivering path

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/condensation-invalidates]`
> **Related Behaviors:** `rule/hooks/condensation-invalidates` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-033 transcript boundary re-arms` · **Status:** Tested

---

#### TC-PFCI-034: Changed class content is delivered again [P1]

**Objective:** Prove that editing a class's rules produces a new version that is delivered even though the old version was.

**Business Intent / Invariant Guarded:** The assistant never works from an outdated reminder (AC-PFCI-12).

**Traces:** AC-PFCI-12 / BR-PFCI-05

**Preconditions:**

- "hooks-context" delivered at version A

**Real-World Reachability:** A maintainer adds a rule mid-session.

**Demo Flow:** Deliver, add a rule to the class, change a hook file.

```gherkin
Given "hooks-context" was delivered
When a maintainer adds a rule to "hooks-context"
And a hook source file is changed
Then a reminder with a new version tag including the new rule is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Version fingerprint differs                                                                                                                                   |
| **Business data state** | Record updated to the new version                                                                                                                             |
| **Data shown on UI**    | New tag and rule                                                                                                                                              |

**Acceptance Criteria:**

- ✅ New version delivered once
- ❌ Old version suppression continues

**Test Data:**

```json
{
    "addRule": "Never call process.exit in a PreToolUse hook"
}
```

**Edge Cases:**

- Reordering unrelated classes → versions unchanged, no re-delivery
- Changing which files belong to the class (include, file-name or location pattern, exclusion, file-type filter) → new version
- Equivalent spellings (an empty list instead of none, a file type without its dot or in capitals) → version unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/presence-decides-delivery]`
> **Related Behaviors:** `rule/hooks/presence-decides-delivery` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-034 hash change re-injects` · **Status:** Tested

---

#### TC-PFCI-035: A helper agent receives its own reminder [P1]

**Objective:** Prove that a delivery in the main conversation does not suppress delivery in a helper agent's conversation, and vice versa.

**Business Intent / Invariant Guarded:** Helper agents do not inherit the main conversation's context (BR-PFCI-07).

**Traces:** AC-PFCI-13 / BR-PFCI-07

**Preconditions:**

- "hooks-context" delivered in the main conversation

**Real-World Reachability:** The orchestrator reads hooks, then dispatches a helper agent to implement a hook.

**Demo Flow:** Deliver in main; change a hook file from a helper agent.

```gherkin
Scenario: main does not suppress helper, and helper does not suppress main
Given "hooks-context" was delivered in the main conversation
When a helper agent changes a hook source file
Then the helper agent is shown the reminder
And a second change by the same helper agent shows nothing
And in a fresh session where only a helper agent was reminded, the main conversation is shown the reminder on its first change
Scenario: host does not identify helper agents
Given the host gives no helper identity and "hooks-context" was delivered in the main conversation moments ago
When a helper agent changes a hook source file
Then no reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Each helper keyed separately                                                                                                                                  |
| **Business data state** | Separate records per context                                                                                                                                  |
| **Data shown on UI**    | Reminder in the helper conversation                                                                                                                           |

**Acceptance Criteria:**

- ✅ Helper reminded once
- ❌ Helper suppressed by main delivery

**Test Data:**

```json
{
    "agent_id": "agent-123"
}
```

**Edge Cases:**

- Helper identifier containing path separators → safely normalized

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/separate-helper-contexts]`
> **Related Behaviors:** `rule/hooks/separate-helper-contexts` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-035 subagent scope separate` · **Status:** Tested

---

#### TC-PFCI-036: Faded reminders are delivered again after the conversation grows [P1]

**Objective:** Prove that once the conversation has grown by the distance limit or more since delivery, the class is delivered again.

**Business Intent / Invariant Guarded:** Conventions that faded in a long uncondensed session return (BR-PFCI-15).

**Traces:** AC-PFCI-14 / BR-PFCI-15

**Preconditions:**

- "hooks-context" delivered when the conversation was small
- Distance limit set to its minimum allowed value (four million five hundred thousand bytes of conversation history, about two hundred thousand tokens)

**Real-World Reachability:** A long session without condensation continues editing hooks hours later.

**Demo Flow:** Deliver, grow the conversation past the limit, change a hook file.

```gherkin
Scenario: growth reaches the limit
Given "hooks-context" was delivered
And the conversation has since grown by exactly the distance limit
When a hook source file is changed
Then the reminder is shown again
Scenario: growth just below the limit
Given "hooks-context" was delivered
And the conversation has since grown by one byte less than the distance limit
When a hook source file is changed
Then no reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Distance compared with the size recorded at delivery                                                                                                          |
| **Business data state** | Record refreshed                                                                                                                                              |
| **Data shown on UI**    | Reminder shown again                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Re-delivered at or past the limit; not re-delivered just below it
- ❌ Suppressed forever in long sessions, or re-delivered below the limit

**Test Data:**

```yaml
inputDomain: 'any conversation growth g since delivery with no condensation and unchanged version'
invariant: 'delivered again iff g >= distance limit or g < 0 — for ALL g'
boundaryCounterCase: 'g = distance limit - 1 → not delivered; g = distance limit → delivered; g = 0 → not delivered; g = -1 → delivered'
```

**Edge Cases:**

- Limit raised by maintainer → takes effect on the next trigger
- Conversation history shorter than at delivery (replaced) → reminder shown again, and the record then counts from the shorter history
- No distance limit configured → default of about two hundred thousand tokens of history applies

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/reminder-distance]`
> **Related Behaviors:** `rule/hooks/reminder-distance` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-036 byte distance re-arms` · **Status:** Tested

---

#### TC-PFCI-037: Time re-arms delivery when history size is unknown [P2]

**Objective:** Prove that when the conversation size cannot be measured but its condensations are still observed, delivery re-arms after the measured time limit.

**Business Intent / Invariant Guarded:** Hosts without accessible history size still re-surface faded reminders, and are not made noisier for it (BR-PFCI-15).

**Traces:** BR-PFCI-15

**Preconditions:**

- No conversation history size available, but the host reported a condensation earlier, so this context's condensations are observed
- "hooks-context" delivered earlier in the session; measured time limit 30 minutes, blind time limit 5 minutes

**Real-World Reachability:** A host reports condensation but does not expose the size of the conversation; the assistant keeps working for an hour.

**Demo Flow:** Report a condensation, deliver without a history size, advance time past the measured limit, change a hook file.

```gherkin
Scenario: measured time limit reached
Given a condensation was reported, no history size is available, and "hooks-context" was delivered exactly 30 minutes ago with a 30-minute measured limit
When a hook source file is changed
Then the reminder is shown again
Scenario: just before the measured time limit
Given a condensation was reported, no history size is available, and "hooks-context" was delivered 29 minutes ago with a 30-minute measured limit
When a hook source file is changed
Then no reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Age compared with the measured time limit, not the blind one                                                                                                  |
| **Business data state** | Record refreshed                                                                                                                                              |
| **Data shown on UI**    | Reminder shown                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Re-delivered at or after the measured limit only
- ❌ Never re-delivered, re-delivered before the measured limit, or re-delivered on the blind limit

**Test Data:**

```json
{
    "transcript_path": null,
    "condensationReported": true,
    "deliveredMinutesAgo": 30,
    "reinjectAfterMinutes": 30,
    "blindReinjectAfterMinutes": 5
}
```

**Edge Cases:**

- 29 minutes → not re-delivered
- 31 minutes → re-delivered
- Counter-case: a measurable history hours old with one byte of growth → still present, so measuring a conversation is never made noisier by either time limit

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/reminder-distance]`
> **Related Behaviors:** `rule/hooks/reminder-distance` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-037 age re-arm without transcript` · **Status:** Tested

---

#### TC-PFCI-038: Current static instructions count as an early delivery [P2]

**Objective:** Prove that in a short uncondensed main conversation, a class whose current tag is in the static instructions is not delivered.

**Business Intent / Invariant Guarded:** Content the assistant already has at session start is not duplicated (BR-PFCI-16).

**Traces:** AC-PFCI-16 / BR-PFCI-16

**Preconditions:**

- Static instructions contain the current "hooks-context" tag
- Main conversation small, no condensation

**Real-World Reachability:** A session starts with freshly regenerated instructions and edits a hook in its first minutes.

**Demo Flow:** Change a hook file early in a fresh session.

```gherkin
Given the static instructions carry the current "hooks-context" tag
And the main conversation is short and uncondensed
When a hook source file is changed
Then no reminder is shown
And after the conversation is condensed, the next change shows the reminder
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Static credit applied in the main context only                                                                                                                |
| **Business data state** | No record written                                                                                                                                             |
| **Data shown on UI**    | No reminder                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Suppressed while credit lasts; delivered once the distance from session start reaches the limit or the conversation is condensed
- ❌ Reminder duplicates fresh static content

**Test Data:**

```json
{
    "staticCarrier": "contains [[convention:hooks-context@<current>]]"
}
```

**Edge Cases:**

- Credit ends after a condensation → delivered
- History already holding a condensation mark before the first trigger → no credit, reminder shown and recorded
- First look at a history already at the distance limit → inspection starts at its end (earlier marks are moot); a short history is inspected from the start

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/static-credit]`
> **Related Behaviors:** `rule/hooks/static-credit` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-038 static credit main scope` · **Status:** Tested

---

#### TC-PFCI-039: Stale static instructions and helper agents get no early credit [P2]

**Objective:** Prove that a stale tag in the static instructions, or a helper-agent context, receives no early credit.

**Business Intent / Invariant Guarded:** Outdated or absent static content never suppresses a reminder (BR-PFCI-16).

**Traces:** BR-PFCI-16

**Preconditions:**

- Static instructions contain an older "hooks-context" tag

**Real-World Reachability:** A maintainer changed a rule but did not regenerate the static instructions.

**Demo Flow:** Change a hook file in the main conversation and from a helper agent.

```gherkin
Scenario: stale tag in the main conversation
Given the static instructions carry an outdated "hooks-context" tag
When a hook source file is changed early in the main conversation
Then the reminder is shown
Scenario: one static instruction file stale, the other current
Given one static instruction file carries an outdated "hooks-context" tag and the other the current tag, in either order
When a hook source file is changed early in the main conversation
Then the reminder is shown and the record is written
Scenario: current tag in a helper agent
Given the static instructions carry the current "hooks-context" tag
When a helper agent changes a hook source file
Then the helper agent is shown the reminder
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Credit requires the exact current tag in every existing static instruction file, and the main context                                                         |
| **Business data state** | Record written                                                                                                                                                |
| **Data shown on UI**    | Reminder shown                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Delivered in both cases
- ❌ Suppressed by stale tag

**Test Data:**

```json
{
    "staticCarrier": "contains [[convention:hooks-context@old00000]]"
}
```

**Edge Cases:**

- No static instructions file → no credit
- Every existing static instruction file carries the current tag → credit (counter-case)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/static-credit]`
> **Related Behaviors:** `rule/hooks/static-credit` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-039 no credit for stale tag or subagent` · **Status:** Tested

---

#### TC-PFCI-040: A blind working context re-arms on the short time limit [P1]

**Objective:** Prove that when neither the conversation size nor any condensation can be observed, delivery re-arms on the blind time limit instead of the measured one.

**Business Intent / Invariant Guarded:** Where a condensation is invisible, a reminder can only be suppressed for a short bounded time, not for the full measured limit (BR-PFCI-15).

**Traces:** BR-PFCI-15 / BR-PFCI-05

**Preconditions:**

- No conversation history available and no condensation ever reported for this working context
- "hooks-context" delivered earlier in the session; blind time limit 5 minutes, measured time limit 30 minutes

**Real-World Reachability:** A host neither exposes a conversation history nor reports condensation; its conversation is condensed and the assistant keeps editing files of the same class.

**Demo Flow:** Deliver with nothing observable, advance time past the blind limit, change a hook file.

```gherkin
Scenario: blind time limit reached
Given nothing about the conversation can be observed and "hooks-context" was delivered exactly 5 minutes ago
When a hook source file is changed
Then the reminder is shown again
Scenario: just before the blind time limit
Given nothing about the conversation can be observed and "hooks-context" was delivered 4 minutes ago
When a hook source file is changed
Then no reminder is shown
Scenario: the same age once a condensation has been observed
Given a condensation was observed for the context and "hooks-context" was delivered 29 minutes ago
When a hook source file is changed
Then no reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Age compared with the blind time limit only while nothing can be observed                                                                                     |
| **Business data state** | Record refreshed                                                                                                                                              |
| **Data shown on UI**    | Reminder shown                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Re-delivered at or after the blind limit, and the blind limit applies only while neither size nor condensation is observable
- ❌ Blind context waits for the measured limit, or an observable context is judged by the blind limit

**Test Data:**

```json
{
    "transcript_path": null,
    "condensationReported": false,
    "deliveredMinutesAgo": 5,
    "blindReinjectAfterMinutes": 5,
    "reinjectAfterMinutes": 30
}
```

**Edge Cases:**

- 4 minutes → not re-delivered; 5 minutes → re-delivered
- Blind limit configured to 1 minute → re-delivered after 1 minute, while a context with an observed condensation still waits 30 minutes
- Counter-case: a measurable history never reaches either time limit
- Default blind limit is 5 minutes and is a separate setting from the measured limit

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/reminder-distance]`
> **Related Behaviors:** `rule/hooks/reminder-distance` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-040 blind window without transcript or condensation report` · **Status:** Tested

---

### Host Signal Tests

#### TC-PFCI-041: Recording a condensation shows nothing [P2]

**Objective:** Prove that handling a host condensation report produces no visible output.

**Business Intent / Invariant Guarded:** Session start output is visible to the assistant; the capability must not add noise there (AC-PFCI-27).

**Traces:** AC-PFCI-27 / BR-PFCI-10

**Preconditions:**

- Delivery on

**Real-World Reachability:** The host condenses a session and notifies all registered handlers.

**Demo Flow:** Send a condensation report and inspect the output.

```gherkin
Given delivery is on
When the host reports a condensation or a clear
Then nothing is shown and the report succeeds
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Condensation time recorded silently                                                                                                                           |
| **Business data state** | Session condensation time set                                                                                                                                 |
| **Data shown on UI**    | Empty output                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Empty output, success
- ❌ Any text shown

**Test Data:**

```json
{
    "hook_event_name": "SessionStart",
    "source": "compact"
}
```

**Edge Cases:**

- Startup or resume report → nothing recorded, nothing shown

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: event/hooks/context-condensed]`
> **Related Behaviors:** `event/hooks/context-condensed` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-041 SessionStart silent` · **Status:** Tested

---

### Edge and Failure Tests

#### TC-PFCI-051: Nothing is delivered unless explicitly switched on [P0]

**Objective:** Prove silence when a configuration exists and the switch is absent or off, or when no class is deliverable.

**Business Intent / Invariant Guarded:** Projects whose configuration never opted in see no behavior change (BR-PFCI-01). No configuration at all is covered by TC-PFCI-082.

**Traces:** AC-PFCI-03 / BR-PFCI-01

**Preconditions:**

- Deliverable classes exist but the delivery switch is absent

**Real-World Reachability:** An adopter upgrades the framework without re-running setup.

**Demo Flow:** Change a matched file under each silent condition.

```gherkin
Given the delivery switch is absent
When a file of a deliverable class is changed
Then nothing is shown and the change succeeds
And the same holds with the switch off and with no deliverable class
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Early exit before any memory access                                                                                                                           |
| **Business data state** | No delivery memory created                                                                                                                                    |
| **Data shown on UI**    | Empty output                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Silent in all three conditions
- ❌ Any reminder or memory written

**Test Data:**

```yaml
inputDomain: 'any trigger with an existing configuration whose switch is absent/off, or with zero deliverable classes'
invariant: 'output is empty and no delivery memory is created — for ALL such triggers'
boundaryCounterCase: 'switch on with one deliverable matching class → reminder shown'
```

**Edge Cases:**

- Switch set to a non-yes value → treated as off
- Diagnostic mode on → the reason (for example "switched off", "already present") is explained on the diagnostic stream only; the reminder itself is unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/explicit-opt-in]`
> **Related Behaviors:** `rule/hooks/explicit-opt-in` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-051 no-op when disabled or unconfigured` · **Status:** Tested

---

#### TC-PFCI-082: No configuration gets the built-in design class on front-end files only [P0]

**Objective:** Prove that a project with no configuration file receives the built-in user-interface design reminder on front-end files, nothing on other files, with the same de-duplication as a configured class.

**Business Intent / Invariant Guarded:** A framework installed without setup still puts the design rules in front of the assistant before it edits a user-facing surface, without adding noise elsewhere (BR-PFCI-01, BR-PFCI-05).

**Traces:** AC-PFCI-28 / AC-PFCI-35 / BR-PFCI-01 / BR-PFCI-05 / BR-PFCI-13 / BR-PFCI-20

**Preconditions:**

- No project configuration file exists

**Real-World Reachability:** An adopter copies the framework into a front-end repository and starts working before running setup.

**Demo Flow:** Open a component file, then a stylesheet, then a logic file; then read a component file in a fresh working context and change it.

```gherkin
Given no project configuration file exists
When the assistant reads or changes a component, template, stylesheet or native layout file
Then the design reminder is shown on the first such file of the working context
And when that first delivery was on a read, it has the conditional wording and the first change of a front-end file shows it once more in the mandatory wording
And after that no front-end file shows it again in that working context
And a logic file or an excluded dependency folder file receives nothing
And an existing configuration without the switch, or an unreadable one, stays silent
```

**Expected Result:**

| Dimension               | Expectation                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the reminder text and the lookup output              |
| **System behavior**     | Built-in fallback acts as switch on with the design class only; presence rules apply unchanged  |
| **Business data state** | Delivery memory is written for delivered or evidenced classes only                              |
| **Data shown on UI**    | The design reminder on front-end files; empty output otherwise; the lookup shows the same class |

**Acceptance Criteria:**

- ✅ Front-end file → design reminder; repeated front-end files in the same context → nothing
- ✅ A read first → conditional reminder; the first change after it → one mandatory reminder; later reads and changes → nothing
- ✅ Helper agent, reminder distance past the class window, and condensation each re-arm it once
- ✅ A design skill already loaded counts as present
- ❌ Any reminder on a non-front-end file, or any delivery when a configuration exists without the switch

**Test Data:**

```yaml
inputDomain: 'component, template, stylesheet and native layout files with no configuration file'
invariant: 'per working context, until it may have faded: exactly one mandatory-wording design reminder by the first change of a front-end file, preceded by at most one conditional-wording reminder when a read came first; nothing after that'
boundaryCounterCase: 'a configuration that exists without the switch → silent'
```

**Edge Cases:**

- Replacing the fallback with a configuration carrying the same detected design class → same content version, not re-sent
- Plain script files are not front-end files (their extension is shared with non-interface code)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/explicit-opt-in]`
> **Related Behaviors:** `rule/hooks/explicit-opt-in` · `test/hooks/file-convention-inject` · `test/hooks/ui-ux-gate-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-082 no project config delivers the built-in UI/UX gate on front-end files only` · `.claude/hooks/tests/suites/ui-ux-gate-inject.test.cjs::TC-UIG-012 no-config fallback dedups: same context skips, helper/window/condensation re-arm, evidence counts` · **Status:** Tested

---

#### TC-PFCI-052: A broken configuration never disrupts work [P0]

**Objective:** Prove that unreadable or malformed configuration and malformed trigger input produce silent success.

**Business Intent / Invariant Guarded:** Reminders are an accelerator; failures must never block reads or edits (BR-PFCI-10).

**Traces:** AC-PFCI-26 / BR-PFCI-10

**Preconditions:**

- Configuration file contains invalid content

**Real-World Reachability:** A maintainer saves a half-edited configuration while the assistant is working.

**Demo Flow:** Change a file with a malformed configuration and with malformed input.

```gherkin
Scenario: malformed configuration
Given the configuration is malformed
When a file is changed
Then the change succeeds and nothing is shown
Scenario: malformed trigger information
Given delivery is on with deliverable classes
When the host sends trigger information that cannot be understood
Then the operation succeeds and nothing is shown
Scenario: one malformed pattern
Given a readable configuration where one class has a malformed pattern and another class is valid
When a file matched by the valid class is changed
Then the valid class is reminded and the malformed class is skipped without any error shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Success status and no error text in all three scenarios                                                                                                       |
| **Business data state** | Scenarios 1-2: no delivery record; scenario 3: only the valid class is recorded as reminded                                                                   |
| **Data shown on UI**    | Scenarios 1-2: empty output; scenario 3: reminder for the valid class only                                                                                    |

**Acceptance Criteria:**

- ✅ Silent success in scenarios 1-2; valid class delivered in scenario 3
- ❌ Error text, failure status, blocked operation, or the valid class suppressed by the malformed one

**Test Data:**

```json
{
    "config": "{ not json",
    "input": "not json"
}
```

**Edge Cases:**

- Configuration is a list instead of an object → silent

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/never-block]`
> **Related Behaviors:** `rule/hooks/never-block` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-052 malformed config fail-open` · **Status:** Tested

---

#### TC-PFCI-053: Unwritable delivery memory never disrupts work [P0]

**Objective:** Prove that when delivery memory cannot be written, work proceeds silently.

**Business Intent / Invariant Guarded:** Environment faults must not block or flood the assistant, and delivery memory never grows without bound or removes anything it does not own (BR-PFCI-10, BR-PFCI-18, AC-PFCI-26).

**Traces:** AC-PFCI-26 / BR-PFCI-10, BR-PFCI-18

**Preconditions:**

- Delivery memory location is not writable

**Real-World Reachability:** A locked-down machine forbids writing to the temporary area.

**Demo Flow:** Change a matched file with an unwritable memory location.

```gherkin
Given delivery memory cannot be written
When a file of a deliverable class is changed
Then the change succeeds and nothing is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Delivery skipped                                                                                                                                              |
| **Business data state** | Nothing written                                                                                                                                               |
| **Data shown on UI**    | Empty output                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Silent success
- ❌ Error text or repeated reminder on every trigger

**Test Data:**

```json
{
    "memoryLocation": "a regular file instead of a folder"
}
```

**Edge Cases:**

- Memory becomes writable later → normal delivery resumes
- A record that cannot be written → no temporary file left behind
- Old delivery memory → removed after seven days; exactly seven days old is kept; folders not shaped like delivery memory, or holding a recent entry, are kept; a sweep removes a bounded number and runs at most once a day on the delivering path

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/never-block]`
> **Related Behaviors:** `rule/hooks/never-block` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-053 unwritable store fail-open` · **Status:** Tested

---

#### TC-PFCI-054: Simultaneous triggers deliver each class once [P1]

**Objective:** Prove that several concurrent evaluations in one context deliver a class at most once.

**Business Intent / Invariant Guarded:** Parallel reads do not flood the assistant with copies (AC-PFCI-15).

**Traces:** AC-PFCI-15 / BR-PFCI-17

**Preconditions:**

- Delivery on
- No prior delivery

**Real-World Reachability:** The assistant reads five hook files in one batch.

**Demo Flow:** Start five matching evaluations at once and count reminders.

```gherkin
Given no delivery of "hooks-context" yet
When five hook source files are read at the same moment
Then exactly one reminder containing "hooks-context" is shown across all five results
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Coordination lets one evaluation deliver                                                                                                                      |
| **Business data state** | One record                                                                                                                                                    |
| **Data shown on UI**    | One tagged section in total                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Exactly one
- ❌ Zero or more than one

**Test Data:**

```yaml
inputDomain: 'any number n >= 2 of concurrent matching evaluations in one context'
invariant: 'the class is delivered exactly once across the n evaluations — for ALL n'
boundaryCounterCase: 'the same n evaluations in n different helper contexts → n deliveries'
```

**Edge Cases:**

- A coordination mark left by a crashed evaluation → ignored after it goes stale

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/record-completed-deliveries]`
> **Related Behaviors:** `rule/hooks/record-completed-deliveries` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-054 concurrent triggers inject once` · **Status:** Tested

---

#### TC-PFCI-055: An interrupted delivery is delivered again [P1]

**Objective:** Prove that a delivery that did not complete leaves no record and is repeated at the next trigger.

**Business Intent / Invariant Guarded:** A reminder is never marked present unless it reached the host (BR-PFCI-17).

**Traces:** AC-PFCI-17 / BR-PFCI-17

**Preconditions:**

- A coordination mark exists without a delivery record, left by an evaluation that stopped

**Real-World Reachability:** An evaluation is terminated by the host mid-delivery.

**Demo Flow:** Leave a stale mark, then change a matched file.

```gherkin
Given an earlier delivery of "hooks-context" was interrupted before completion
When a hook source file is changed within ten seconds of the interruption
Then no "hooks-context" reminder is shown
When a hook source file is changed eleven seconds after the interruption
Then the reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Coordination mark respected inside the window; stale mark cleared after it; delivery proceeds                                                                 |
| **Business data state** | Record written after completion                                                                                                                               |
| **Data shown on UI**    | Reminder shown on the first trigger after the window                                                                                                          |

**Acceptance Criteria:**

- ✅ Skipped inside the window; delivered on the first trigger after it
- ❌ Suppressed after the window, or duplicated inside it

**Test Data:**

```json
{
    "lockAgeSeconds": [9, 11],
    "staleAfterSeconds": 10
}
```

**Edge Cases:**

- Mark exactly ten seconds old → treated as stale (delivered)
- The host's output channel reports a write error → treated as not accepted: nothing recorded, claim released
- A stale claim taken over by a newer evaluation → the original holder's release leaves the new claim in place

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/record-completed-deliveries]`
> **Related Behaviors:** `rule/hooks/record-completed-deliveries` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-055 stale lock redelivers` · **Status:** Tested

---

#### TC-PFCI-056: Oversized reminders degrade by precedence [P1]

**Objective:** Prove that when full sections exceed the limit, lowest-precedence classes shrink to references, then drop, and no line is cut.

**Business Intent / Invariant Guarded:** The most specific conventions survive a tight budget (BR-PFCI-08).

**Traces:** AC-PFCI-19 / BR-PFCI-08

**Preconditions:**

- Four matching classes ranked 1 to 4 by precedence, each with a full section of 900 characters and a references-only section of 150 characters
- Opening and closing lines together take 200 characters, and these figures include every line break and the closing "earlier sections win" statement

**Real-World Reachability:** A general-code class and three specific classes all match one file.

**Demo Flow:** Change the file under three size limits and read the reminder each time.

```gherkin
Scenario: only the lowest class shrinks
Given the size limit is 3100 characters
When the matched file is changed in a fresh conversation
Then classes 1 to 3 are shown in full and class 4 as references only
Scenario: shrinking continues upward
Given the size limit is 2350 characters
When the matched file is changed in a fresh conversation
Then classes 1 and 2 are shown in full and classes 3 and 4 as references only
Scenario: lowest class left out
Given the size limit is 700 characters
When the matched file is changed in a fresh conversation
Then classes 1 to 3 are shown as references only and class 4 is left out
And in every scenario every line is complete and the reminder is within the limit
Scenario: a left-out class is delivered on the next trigger
Given class 4 was left out while classes 1 to 3 were delivered as references only
When the matched file is changed again
Then only class 4 is shown, because classes 1 to 3 count as delivered and class 4 was never recorded
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Degrade from lowest precedence, only while the reminder does not fit                                                                                          |
| **Business data state** | References-only classes recorded; left-out classes not recorded                                                                                               |
| **Data shown on UI**    | Reminder within limit with whole lines                                                                                                                        |

**Acceptance Criteria:**

- ✅ Exactly the stated forms in each scenario
- ❌ A higher class reduced before a lower one, a class reduced when it would fit, a truncated line, or the limit exceeded

**Test Data:**

```json
{
    "fullSectionChars": 900,
    "referencesOnlyChars": 150,
    "openingAndClosingChars": 200,
    "limits": [3100, 2350, 700]
}
```

**Edge Cases:**

- Opening and closing lines alone exceed the limit → nothing delivered, nothing recorded, no claim left behind

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/size-limit]`
> **Related Behaviors:** `rule/hooks/size-limit` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-056 budget degrades by precedence` · **Status:** Tested

---

### Reminder Shape Tests

#### TC-PFCI-061: Reminder shape: critical first and last, tagged, no repeated rule [P2]

**Objective:** Prove the reminder's first and last lines name the must-read references, sections are tagged, and a shared rule appears once.

**Business Intent / Invariant Guarded:** Compact reminders survive long contexts (US-PFCI-04).

**Traces:** AC-PFCI-18 / AC-PFCI-20 / BR-PFCI-09

**Preconditions:**

- Two matching classes share one rule

**Real-World Reachability:** Two classes both remind about regenerating counts.

**Demo Flow:** Change a file matched by both and read the reminder.

```gherkin
Given two matching classes share the rule "Regenerate counts"
When the file is changed
Then the first line names the must-read references
And the last line repeats them and names the lookup
And "Regenerate counts" appears once, under the earlier class
And each section starts with a tag made of its class name and content version
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Shared rules de-duplicated in order                                                                                                                           |
| **Business data state** | Both classes recorded                                                                                                                                         |
| **Data shown on UI**    | Tagged sections; one copy of the shared rule                                                                                                                  |

**Acceptance Criteria:**

- ✅ Shape as described
- ❌ Missing first/last line or duplicated rule

**Test Data:**

```json
{
    "rules": {
        "a": ["Regenerate counts"],
        "b": ["Regenerate counts", "Other"]
    }
}
```

**Edge Cases:**

- Single class → first and last lines still present
- File name containing line breaks or other control characters → shown with `?` in their place; no extra or forged reminder lines

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/critical-first-last]`
> **Related Behaviors:** `rule/hooks/critical-first-last` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-061 digest shape` · **Status:** Tested

---

#### TC-PFCI-062: Several matching classes are ordered by precedence and capped [P1]

**Objective:** Prove ordering by precedence rank then definition order, and that classes beyond the per-trigger maximum are dropped.

**Business Intent / Invariant Guarded:** Specific conventions come first and win on conflict (BR-PFCI-04).

**Traces:** AC-PFCI-07 / BR-PFCI-04

**Preconditions:**

- Five matching classes with ranks 900, 100, 500, 500 (defined in that order), 100
- Per-trigger maximum 4

**Real-World Reachability:** A file sits inside several overlapping kinds.

**Demo Flow:** Read the file and list section order.

```gherkin
Given five matching classes with mixed ranks and a maximum of 4
When the file is read
Then sections appear rank 100 classes in definition order, then rank 500 in definition order
And the rank 900 class is dropped
And the reminder states that earlier sections win on conflict
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Deterministic order independent of pattern text                                                                                                               |
| **Business data state** | Four records                                                                                                                                                  |
| **Data shown on UI**    | Ordered sections                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Deterministic order and cap
- ❌ Order depends on pattern text or exceeds cap

**Test Data:**

```yaml
inputDomain: 'any set of matching classes with any ranks and positions'
invariant: 'output order equals sort by (rank ascending, position ascending) truncated to the maximum — for ALL sets'
boundaryCounterCase: 'exactly the maximum number of matching classes → none dropped; maximum + 1 → only the last in sorted order dropped'
```

**Edge Cases:**

- Equal ranks → definition order
- Missing rank → treated as 500
- The cap applies before presence: when the top classes are already present, a lower-ranked fifth class is still not delivered for that file (intentional; it stays available through static instructions and lookup)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/ordering-precedence]`
> **Related Behaviors:** `rule/hooks/ordering-precedence` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-062 order by priority then declaration and cap` · **Status:** Tested

---

### Invariant / Property Tests

#### TC-PFCI-071: Presence decision holds for every combination [P1]

**Objective:** Prove the presence table: delivered iff no current-version record, or delivered before the last condensation, or distance at or beyond the limit (BR-PFCI-15 "the configured amount or more").

**Business Intent / Invariant Guarded:** No false "present" and no duplicate while present (BR-PFCI-05).

**Traces:** BR-PFCI-05 / BR-PFCI-06 / BR-PFCI-15

**Preconditions:**

- Records at all combinations of version match, condensation order and distance

**Real-World Reachability:** Every long session passes through these states.

**Demo Flow:** Evaluate the decision for each combination.

```gherkin
Given a class was last delivered at some version, before or after the latest condensation, and some distance ago
When the assistant changes a file of that class
Then no reminder is shown only when the version is current, the delivery came after the latest condensation and the distance is below the limit
And in every other combination the reminder is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Decision table applied                                                                                                                                        |
| **Business data state** | Records consistent with decisions                                                                                                                             |
| **Data shown on UI**    | Deliver or skip per combination                                                                                                                               |

**Acceptance Criteria:**

- ✅ All 8 combinations match the table
- ❌ Any combination deviates

**Test Data:**

```yaml
inputDomain: 'all 2x2x2 combinations of versionMatch, deliveredAfterCondensation, distanceBelowLimit'
invariant: 'skip == (versionMatch AND deliveredAfterCondensation AND distanceBelowLimit) — for ALL combinations'
boundaryCounterCase: 'delivery at exactly the condensation time → counts as absent, so delivered again (strictly after required)'
```

**Edge Cases:**

- Record from a different class name → ignored

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/presence-table]`
> **Related Behaviors:** `constraint/hooks/presence-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-071 presence decision table` · **Status:** Tested

---

#### TC-PFCI-072: Membership decision holds for every combination [P1]

**Objective:** Prove membership equals filter-accepts AND any-include AND no-exclude for all combinations and path styles.

**Business Intent / Invariant Guarded:** Classes match exactly the files maintainers intend on every operating system (BR-PFCI-02).

**Traces:** BR-PFCI-02

**Preconditions:**

- Classes with each include/exclude/filter form

**Real-World Reachability:** Projects are edited from different operating systems.

**Demo Flow:** Evaluate membership for paths written with either separator style and letter case.

```gherkin
Given a class with any combination of file-type filter, include patterns and exclude patterns
And a file whose location is written with either separator style or letter case
When the assistant reads that file in a fresh conversation
Then that class's reminder is shown exactly when the file-type filter accepts it, an include pattern matches and no exclude pattern matches
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Paths normalized before matching                                                                                                                              |
| **Business data state** | n/a                                                                                                                                                           |
| **Data shown on UI**    | Match or no match                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Table holds for all forms and path styles
- ❌ Separator style or case changes the result

**Test Data:**

```yaml
inputDomain: 'any file path inside the project in either separator style and any letter case, against any class'
invariant: 'member == filterAccepts AND anyInclude AND NOT anyExclude — for ALL paths'
boundaryCounterCase: 'include and exclude both match → not a member; include matches but the file-type filter rejects → not a member'
```

**Edge Cases:**

- Very long path beyond the cap → not evaluated
- Equivalent wildcard spellings (repeated any-depth parts, a leading current-folder prefix, back slashes) → identical membership

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/membership-table]`
> **Related Behaviors:** `constraint/hooks/membership-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-072 membership decision table` · **Status:** Tested

---

#### TC-PFCI-073: Merge never removes classes or alters maintainer work [P0]

**Objective:** Prove for generated configurations that merge output contains every input class and changes only unedited detected classes.

**Business Intent / Invariant Guarded:** Automation is additive and safe (BR-PFCI-12).

**Traces:** BR-PFCI-12

**Preconditions:**

- Generated sets of existing and detected classes

**Real-World Reachability:** Setup is re-run many times over a project's life.

**Demo Flow:** Merge each generated set and compare.

```gherkin
Given a project with any mix of maintainer classes, edited detected classes and unedited detected classes
When a maintainer re-runs setup and it merges new detection results
Then every previously configured class is still listed
And every class other than an unedited detected class reads exactly as before
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Merge is additive                                                                                                                                             |
| **Business data state** | No removal                                                                                                                                                    |
| **Data shown on UI**    | Merge summary counts add up                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Invariant holds for all generated sets
- ❌ Any removal or alteration

**Test Data:**

```yaml
inputDomain: 'any existing class list (mixed origins and edit states) and any detected class list'
invariant: 'names(existing) ⊆ names(result) AND unchanged(c) for every c not detected-and-unedited — for ALL inputs'
boundaryCounterCase: 'detected-and-unedited class with new detection → changed (allowed)'
```

**Edge Cases:**

- Detected list empty → result equals existing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/merge-additive]`
> **Related Behaviors:** `constraint/hooks/merge-additive` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-073 merge property additive` · **Status:** Tested

---

#### TC-PFCI-074: Reminder never exceeds the limit and never cuts a line [P1]

**Objective:** Prove for generated classes and limits that the reminder length is within the limit and every line is a whole rendered line.

**Business Intent / Invariant Guarded:** Budget safety for every configuration (BR-PFCI-08).

**Traces:** BR-PFCI-08

**Preconditions:**

- Generated class sets and limits

**Real-World Reachability:** Classes and limits are tuned by many maintainers.

**Demo Flow:** Build reminders for each generated set.

```gherkin
Given a file matched by any set of classes and any size limit in range
When the assistant changes that file in a fresh conversation
Then the reminder it is shown is at most the limit long
And every line of it is a complete line of a class section, a references-only section, or the opening or closing line
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Degradation applied                                                                                                                                           |
| **Business data state** | n/a                                                                                                                                                           |
| **Data shown on UI**    | Bounded reminder                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Holds for all generated sets
- ❌ Overflow or partial line

**Test Data:**

```yaml
inputDomain: 'any 1..10 classes with rules of any length and any limit within the allowed range'
invariant: 'length <= limit AND every line is whole — for ALL inputs'
boundaryCounterCase: 'first and last lines alone exceed the limit → nothing delivered'
```

**Edge Cases:**

- Unicode text → length counted in text units, where a character outside the basic range counts as two, so the limit is never exceeded

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/digest-budget]`
> **Related Behaviors:** `constraint/hooks/digest-budget` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-074 budget property` · **Status:** Tested

---

#### TC-PFCI-075: Parity between delivery, lookup and static instructions [P1]

**Objective:** Prove that for every deliverable class, delivered items are present in the static instructions and lookup output matches delivery.

**Business Intent / Invariant Guarded:** Removing automatic delivery loses no guidance (BR-PFCI-13).

**Traces:** BR-PFCI-13

**Preconditions:**

- A generated set of valid configurations, including this project's own configuration

**Real-World Reachability:** The framework ships with delivery disabled on some hosts.

**Demo Flow:** For each dogfood class compare the reminder with the static table and lookup.

```gherkin
Given any deliverable class in the configuration
When a maintainer reads that class's reminder, its row in the static instructions, the golden rules and the lookup output side by side
Then every rule is in the golden rules, every include pattern, protocol reference and document and the tag are in its table row
And when the project opted out under BR-PFCI-13's exception, the golden rules instead name the class and the lookup prints every one of its rules
And the rows follow the delivery precedence order
And lookup text equals the reminder text for a fresh context
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Shared rendering                                                                                                                                              |
| **Business data state** | n/a                                                                                                                                                           |
| **Data shown on UI**    | Matching content                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Parity holds for every class
- ❌ Any item only in the reminder

**Test Data:**

```yaml
inputDomain: 'every deliverable class of any valid configuration'
invariant: 'lookup == reminder AND (default: items(reminder) ⊆ items(static); opted out with preconditions met: every rule-bearing class named in the golden rules and every other item in its row) — for ALL classes'
boundaryCounterCase: 'non-deliverable class → absent from both'
```

**Edge Cases:**

- Class with unknown protocol name → name shown in both without a path
- Class matched only by a file-name pattern → the row shows that pattern as `name:<pattern>`
- Class with a file-type filter or exclusions → the row shows each file type and each exclusion
- Regeneration names the project folder explicitly → the project's convention renderer is used even when the environment points elsewhere; an incomplete renderer copy is skipped; a complete renderer beside the static-table builder is preferred
- Project opted out of repeating short rules → the compact form is expected exactly when BR-PFCI-13's preconditions hold, and each named class's rules come back from the lookup for a file it matches

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/static-parity]`
> **Related Behaviors:** `constraint/hooks/static-parity` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-075 parity property` · **Status:** Tested

---

#### TC-PFCI-076: No failure ever disrupts or alters the assistant's work [P0]

**Objective:** Prove for every injected failure that the read or change completes unchanged, nothing is refused and no error is shown.

**Business Intent / Invariant Guarded:** Reminders are an accelerator; no internal failure may block, delay or alter work (BR-PFCI-10).

**Traces:** BR-PFCI-10 / AC-PFCI-26

**Preconditions:**

- Delivery on with deliverable classes
- One failure injected per run

**Real-World Reachability:** Real projects meet broken configurations, locked-down temporary areas, garbled host messages and concurrent evaluations.

**Demo Flow:** Read and change a matched file once per injected failure and compare the operation results with runs without the capability.

```gherkin
Given any one of: unreadable configuration, malformed configuration, malformed trigger information, unwritable delivery memory, an invalid pattern, or a concurrent evaluation already delivering the class
When the assistant reads or changes a file matched by a deliverable class
Then the read or change completes exactly as it would without the capability
And nothing is refused and no error text is shown
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Success status in every case; output is either empty or a valid reminder                                                                                      |
| **Business data state** | No partial or corrupt delivery record                                                                                                                         |
| **Data shown on UI**    | Empty output or a well-formed reminder                                                                                                                        |

**Acceptance Criteria:**

- ✅ Unchanged operation for every failure
- ❌ Any refusal, error text, delay for input, or altered result

**Test Data:**

```yaml
inputDomain: 'every failure injection: unreadable or malformed configuration, malformed trigger information, unwritable delivery memory, invalid pattern, fresh concurrent claim'
invariant: 'the operation completes unchanged and no error is surfaced — for ALL injections'
boundaryCounterCase: 'healthy configuration and memory → reminder shown (proves the check is live, not always silent)'
```

**Edge Cases:**

- Two failures at once → same outcome
- Trigger information preceded by a byte-order mark → read normally
- Trigger information of exactly the size cap → read; one byte more → ignored
- Trigger information not ready yet → retried after short waits and given up after about two seconds

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/never-block]`
> **Related Behaviors:** `constraint/hooks/never-block` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-076 never-block property` · **Status:** Tested

---

#### TC-PFCI-077: Only successful reads and changes of project files trigger reminders [P1]

**Objective:** Prove for every trigger kind and target location that only successful reads, creations, changes and moves of files inside the project deliver.

**Business Intent / Invariant Guarded:** Reminders relate only to real work on project files (BR-PFCI-14).

**Traces:** BR-PFCI-14 / AC-PFCI-08

**Preconditions:**

- Delivery on
- A catch-all class matching every file

**Real-World Reachability:** Assistants remove files, browse folders, touch sibling repositories and sometimes fail changes during normal work.

**Demo Flow:** Run every trigger kind against every target location and note which ones produce a reminder.

```gherkin
Given a class matching every file and a fresh conversation for each case
When the assistant performs any trigger kind (read, creation, change, move, removal, folder read, failed operation) on any location (inside the project, outside it)
Then a reminder is shown only for a successful read, creation, change or move of a file inside the project
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Irrelevant triggers dropped before matching                                                                                                                   |
| **Business data state** | Records only for relevant triggers                                                                                                                            |
| **Data shown on UI**    | Reminder only in the relevant cases                                                                                                                           |

**Acceptance Criteria:**

- ✅ Exactly the relevant cases deliver
- ❌ Any irrelevant case delivers or a relevant case is silent

**Test Data:**

```yaml
inputDomain: 'every trigger kind × target location (read, create, change, move, removal, folder read, failed operation) × (inside project, outside project)'
invariant: 'reminder shown iff successful read/create/change/move AND file inside the project — for ALL combinations'
boundaryCounterCase: 'successful change of a file directly in the project root folder → reminder shown; successful change of a file in a sibling folder whose name starts with the project folder name → no reminder'
```

**Edge Cases:**

- Move from outside into the project → destination counts
- Every tool the host registration reports is understood and yields a reminder for a project file
- Trigger information naming its event only in the generic event field → honoured; another event named there → ignored

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/relevant-targets]`
> **Related Behaviors:** `rule/hooks/relevant-targets` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-077 trigger relevance property` · **Status:** Tested

---

#### TC-PFCI-078: Every reminder is framed, tagged and free of repeated rules [P1]

**Objective:** Prove for any set of matched classes that the reminder opens and closes with the must-read references, tags every section, and never repeats a shared rule.

**Business Intent / Invariant Guarded:** Compact, attention-resilient reminders for every configuration (BR-PFCI-09).

**Traces:** BR-PFCI-09 / AC-PFCI-18 / AC-PFCI-20

**Preconditions:**

- A generated set of class combinations, including overlapping rules

**Real-World Reachability:** Maintainers define overlapping classes that share rules.

**Demo Flow:** Change files matched by each generated combination and inspect the reminders.

```gherkin
Given a file matched by any set of classes, some sharing short rules
When the assistant changes that file in a fresh conversation
Then the first line names every must-read reference of the delivered classes
And the last line repeats them and names the convention lookup
And every section starts with a tag of its class name and content version
And no short rule appears twice
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Framing and de-duplication applied                                                                                                                            |
| **Business data state** | n/a                                                                                                                                                           |
| **Data shown on UI**    | Framed, tagged reminder                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Holds for all combinations
- ❌ Missing frame line, untagged section, or duplicated rule

**Test Data:**

```yaml
inputDomain: 'any 1..10 matched classes with any overlap of short rules, protocol references and reference documents'
invariant: 'first line and last line list all must-read references, every section tagged, each shared rule appears once under its earliest class — for ALL inputs'
boundaryCounterCase: 'a single class whose only item is one reference document → first and last lines both name that document and the section is still tagged'
```

**Edge Cases:**

- Class reduced to references only → still tagged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/critical-first-last]`
> **Related Behaviors:** `rule/hooks/critical-first-last` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-078 digest shape property` · **Status:** Tested

---

#### TC-PFCI-079: A delivery in one working context never suppresses another [P1]

**Objective:** Prove for any mix of main and helper contexts and delivery histories that suppression never crosses contexts, and that without helper identity all work shares the main context.

**Business Intent / Invariant Guarded:** Helper agents never lose reminders because another context received them (BR-PFCI-07).

**Traces:** BR-PFCI-07 / AC-PFCI-13

**Preconditions:**

- Generated sequences of deliveries across the main conversation and several helper agents

**Real-World Reachability:** An orchestrator and several helper agents edit files of the same class in one session.

**Demo Flow:** Replay each generated sequence and check which contexts are reminded.

```gherkin
Given any sequence of deliveries across the main conversation and helper agents that the host identifies
When any one of those contexts changes a file of an already delivered class
Then it is shown the reminder exactly when that same context has no current delivery of its own
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Presence evaluated per context                                                                                                                                |
| **Business data state** | Records separated per context                                                                                                                                 |
| **Data shown on UI**    | Reminder decisions independent across contexts                                                                                                                |

**Acceptance Criteria:**

- ✅ No cross-context suppression for any sequence
- ❌ Any context suppressed by another context's delivery

**Test Data:**

```yaml
inputDomain: 'any sequence of deliveries across main and 1..5 identified helper contexts, with any order of triggers'
invariant: 'a context is suppressed only by its own current delivery — for ALL sequences'
boundaryCounterCase: 'host provides no helper identity → helper work shares the main context and is suppressed by the main delivery'
```

**Edge Cases:**

- Helper identities that differ only in unsafe characters → still kept apart safely
- Helper or session identity made only of dots → never used as a history location
- Class named like the memory's own state entries → stored separately; the state stays intact and the class is remembered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/separate-helper-contexts]`
> **Related Behaviors:** `rule/hooks/separate-helper-contexts` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-079 context isolation property` · **Status:** Tested

---

### Read/Edit Trigger Tests

> Numbering note: these cases use the feature-specific block 086–092 (081–085 were already taken).

#### TC-PFCI-086: A class triggered by edits is silent when its file is read [P1]

**Objective:** Prove that reading a file of a class whose trigger is edit delivers nothing for that class.

**Business Intent / Invariant Guarded:** Reading a file to understand it no longer pulls authoring documents the assistant may not need (US-PFCI-08).

**Traces:** AC-PFCI-30 / BR-PFCI-19

**Preconditions:**

- Delivery switch is on
- The "feature spec" class has trigger edit, a protocol and reference documents
- No other class matches the file

**Real-World Reachability:** The assistant opens a spec to answer a question about it, with no intention to change it.

**Demo Flow:** Read a feature spec document in a fresh conversation and look for a reminder after the file content.

```gherkin
Given delivery is on and the "feature spec" class is triggered by edits only
When the assistant finishes reading a feature spec document
Then no reminder is shown for "feature spec"
And the read result is unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Skips the class on reads                                                                                                                                      |
| **Business data state** | The conversation does not count "feature spec" as reminded                                                                                                    |
| **Data shown on UI**    | No reminder text after the read                                                                                                                               |

**Acceptance Criteria:**

- ✅ No reminder for the class on a read
- ❌ The class delivered on a read

**Test Data:**

```json
{
    "class": "feature-spec",
    "on": "edit",
    "operation": "read",
    "file": "docs/specs/Bucket/README.Feature.md"
}
```

**Edge Cases:**

- Another class with trigger both matches the same file → only that class is delivered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/per-class-trigger]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/per-class-trigger` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-086 [read-edit] edit-only class silent on read` · **Status:** Tested

---

#### TC-PFCI-087: A class triggered by edits delivers when its file is changed [P1]

**Objective:** Prove that changing a file of a class whose trigger is edit delivers its must-read documents and protocol.

**Business Intent / Invariant Guarded:** Every edit stays guarded by its conventions after reads were quieted (US-PFCI-08).

**Traces:** AC-PFCI-30 / BR-PFCI-19

**Preconditions:**

- Delivery switch is on
- The "feature spec" class has trigger edit, a protocol and reference documents

**Real-World Reachability:** After reading a spec, the assistant changes it as part of a task.

**Demo Flow:** Change a feature spec document and read the reminder shown after the change.

```gherkin
Given delivery is on and the "feature spec" class is triggered by edits only
When the assistant changes a feature spec document
Then a reminder names "feature spec", its must-read documents and its protocol
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Delivers the class after the change                                                                                                                           |
| **Business data state** | "feature spec" counts as reminded in this conversation                                                                                                        |
| **Data shown on UI**    | The mandatory "must read first" line and the protocol reference                                                                                               |

**Acceptance Criteria:**

- ✅ Reminder with documents and protocol after the change
- ❌ No reminder after a change

**Test Data:**

```json
{
    "class": "feature-spec",
    "on": "edit",
    "operation": "edit",
    "skills": ["spec"]
}
```

**Edge Cases:**

- The file was read earlier in the same conversation → the change still delivers, because the read delivered nothing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/per-class-trigger]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/per-class-trigger` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-087 [read-edit] edit-only class delivers on edit` · **Status:** Tested

---

#### TC-PFCI-088: A class that names no trigger is delivered on the same operations as before [P0]

**Objective:** Prove that a class without a trigger is delivered on reads and on changes with the same class sections as before the trigger existed, and that only the wording of a read digest changes (BR-PFCI-20).

**Business Intent / Invariant Guarded:** Existing configurations keep their delivery operations and class content; the trigger is opt-in (BR-PFCI-19).

**Traces:** AC-PFCI-31 / BR-PFCI-19

**Preconditions:**

- Delivery switch is on
- A class with a rule and a reference document and no trigger

**Real-World Reachability:** A project upgrades the framework without touching its classes.

**Demo Flow:** Read, then change, a file of that class in two fresh conversations and compare with the reminders from before the upgrade.

```gherkin
Given a class that names no trigger
When a matching file is read in one conversation and changed in another
Then the class is delivered both times
And each reminder matches the reminder the same configuration gave before triggers existed, apart from the read wording of BR-PFCI-20
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Treats the missing trigger as both                                                                                                                            |
| **Business data state** | Delivery records as before                                                                                                                                    |
| **Data shown on UI**    | The same class sections as before                                                                                                                             |

**Acceptance Criteria:**

- ✅ Delivered on read and on change
- ✅ Class sections equal to the earlier reminders; the read digest differs only by the conditional wording of BR-PFCI-20
- ❌ A class without a trigger skipped on either operation

**Test Data:**

```yaml
inputDomain: 'any class without a trigger, any matching file, read or change'
invariant: 'for ALL such inputs the matched classes equal those of the same class with trigger both'
boundaryCounterCase: 'reads excluded project-wide → nothing on a read whatever the trigger, delivery on a change'
```

```json
{
    "class": "hook-source",
    "on": null,
    "operations": ["read", "edit"]
}
```

**Edge Cases:**

- Trigger value outside read, edit and both → rejected by validation, never guessed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/per-class-trigger]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/per-class-trigger` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-088 [read-edit] absent trigger equals both`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] contextGroups[].on accepts read|edit|both and names the group on a bad trigger` · **Status:** Tested

---

#### TC-PFCI-089: A reminder shown on a read is worded as conditional [P2]

**Objective:** Prove that a class delivered on a read opens with "if you will edit this file, read first" and gives no instruction to follow a protocol.

**Business Intent / Invariant Guarded:** On reads the assistant judges whether the documents are needed; the mandatory wording stays for edits (BR-PFCI-20).

**Traces:** AC-PFCI-33 / BR-PFCI-20

**Preconditions:**

- Delivery switch is on
- A class with trigger both, a protocol and reference documents

**Real-World Reachability:** The assistant opens a hook source file while tracing a behavior.

**Demo Flow:** Read a file of that class and read the first line of the reminder.

```gherkin
Given a class with trigger both that lists a protocol and reference documents
When the assistant finishes reading a matching file
Then the reminder opens with "If you will edit this file, read first:" and the references
And it contains no instruction to follow the protocol
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Uses the conditional read wording                                                                                                                             |
| **Business data state** | The class counts as reminded                                                                                                                                  |
| **Data shown on UI**    | Conditional opening line; references still named first and last                                                                                               |

**Acceptance Criteria:**

- ✅ Conditional opening line
- ✅ No follow-the-protocol line
- ❌ Mandatory wording on a read

**Test Data:**

```json
{
    "operation": "read",
    "expectedOpening": "If you will edit this file, read first:",
    "absent": "follow skill protocol"
}
```

**Edge Cases:**

- The same file changed afterwards in a new conversation → mandatory wording
- The same file changed afterwards in the same conversation → the class is delivered once more with the mandatory wording (TC-PFCI-092)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/read-wording]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/read-wording` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-089 [read-edit] conditional read wording` · **Status:** Tested

---

#### TC-PFCI-090: A class triggered by reads is silent when its file is changed [P1]

**Objective:** Prove that changing a file of a class whose trigger is read delivers nothing for that class.

**Business Intent / Invariant Guarded:** A maintainer can keep orientation hints for readers without repeating them on every change (BR-PFCI-19).

**Traces:** AC-PFCI-32 / BR-PFCI-19

**Preconditions:**

- Delivery switch is on
- A class with trigger read and one short rule

**Real-World Reachability:** A maintainer marks an orientation-only class for readers.

**Demo Flow:** Change a file of that class and look for a reminder.

```gherkin
Given a class triggered by reads only
When the assistant changes a matching file
Then no reminder is shown for that class
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Skips the class on changes                                                                                                                                    |
| **Business data state** | The class is not recorded as delivered                                                                                                                        |
| **Data shown on UI**    | No reminder text after the change                                                                                                                             |

**Acceptance Criteria:**

- ✅ Nothing delivered on a change
- ❌ The class delivered on a change

**Test Data:**

```json
{
    "class": "orientation",
    "on": "read",
    "operation": "edit"
}
```

**Edge Cases:**

- The same file read → the class is delivered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/per-class-trigger]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/per-class-trigger` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-090 [read-edit] read-only class silent on edit` · **Status:** Tested

---

#### TC-PFCI-091: Setup writes the edit trigger on new classes and never changes a maintainer trigger [P1]

**Objective:** Prove that detection gives a new class with documents or protocols the edit trigger, and leaves a trigger a maintainer set unchanged.

**Business Intent / Invariant Guarded:** New projects get quiet reads by default while maintainer choices stay authoritative (BR-PFCI-19, BR-PFCI-12).

**Traces:** AC-PFCI-34 / BR-PFCI-19 / BR-PFCI-12

**Preconditions:**

- A configuration with a maintainer class whose trigger is both
- Detection proposes a new class with reference documents and a class with the maintainer class name

**Real-World Reachability:** A maintainer re-runs setup after adding a new test folder.

**Demo Flow:** Run the setup merge and read the merged classes.

```gherkin
Given a maintainer class with trigger both and detection proposing a new class with reference documents
When detection results are merged
Then the new class is added with trigger edit
And the maintainer class keeps trigger both
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Merge adds the new class with the edit trigger; maintainer classes untouched                                                                                  |
| **Business data state** | New class marked detected with trigger edit; maintainer class unchanged                                                                                       |
| **Data shown on UI**    | The merge summary and the merged configuration                                                                                                                |

**Acceptance Criteria:**

- ✅ Edit trigger on the new class
- ✅ Maintainer trigger unchanged
- ❌ A maintainer trigger overwritten
- ❌ A new documented class, other than the framework design class, without the edit trigger

**Test Data:**

```json
{
    "maintainerClass": {
        "name": "hook-source",
        "on": "both"
    },
    "proposed": {
        "name": "integration-test",
        "referenceDocs": ["docs/project-reference/integration-test-reference.md"]
    }
}
```

**Edge Cases:**

- A proposed class with short rules only → no trigger written; it behaves as both
- The framework design class proposed on front-end evidence → written with trigger both (BR-PFCI-19 design-class note)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/convention-merge]`
> **Related Behaviors:** `operation/hooks/convention-merge` · `rule/hooks/merge-never-overwrites` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-091 [merge] detect writes on:edit, keeps maintainer value`, `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-021 merge adds detected group` · **Status:** Tested

---

#### TC-PFCI-092: A change after a read-form delivery re-delivers the class once with the mandatory wording [P1]

**Objective:** Prove that when a class was delivered on a read, with the conditional wording, the first change of a matching file in the same conversation delivers the class again with the mandatory wording and its protocol, and that a further change does not.

**Business Intent / Invariant Guarded:** Every edit stays guarded by its conventions: a read reminder that carried no protocol never suppresses the reminder a change needs (US-PFCI-08, BR-PFCI-05, BR-PFCI-20).

**Traces:** AC-PFCI-35 / BR-PFCI-05 / BR-PFCI-20

**Preconditions:**

- Delivery switch is on
- A class with trigger both (or no trigger), a protocol and reference documents
- No earlier delivery of the class in this conversation

**Real-World Reachability:** The assistant reads a hook source file to understand it, then changes it a minute later; this read-then-change sequence is the usual path to an edit.

**Demo Flow:** Read a file of that class, then change it, then change another file of the same class, and read each reminder.

```gherkin
Given a class with trigger both that lists a protocol and reference documents
And the class was delivered on a read in this conversation with the conditional wording
When the assistant changes a matching file
Then the reminder names the class with the mandatory "must read first" wording and its protocol
And when the assistant changes another matching file
Then no reminder is shown for that class
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the reminder text the assistant receives, validation messages, and the lookup output |
| **System behavior**     | Treats a read-form delivery as present only for reads; re-delivers once on the first change                                                                   |
| **Business data state** | The delivery record now holds the mandatory wording, so the class counts as reminded for reads and changes                                                    |
| **Data shown on UI**    | Conditional reminder after the read, mandatory reminder with the protocol after the first change, nothing after the second change                             |

**Acceptance Criteria:**

- ✅ Mandatory reminder with the protocol on the first change after a read-form delivery
- ✅ No reminder on the second change
- ❌ No reminder on the first change because the read counted as present
- ❌ A mandatory reminder on every change

**Test Data:**

```json
{
    "class": "hook-source",
    "on": "both",
    "sequence": ["read .claude/hooks/a.cjs", "edit .claude/hooks/a.cjs", "edit .claude/hooks/b.cjs"],
    "expected": ["conditional", "mandatory", "none"]
}
```

**Edge Cases:**

- A read after the mandatory delivery → no reminder (the class is present for reads and changes)
- The class content changed between the read and the change → the change delivers the new version with the mandatory wording (BR-PFCI-05, one delivery)
- A condensation between the read and the change → the change delivers the mandatory wording, as for any delivery after a condensation

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/read-form-presence]`
> **Related Behaviors:** `operation/hooks/deliver-conventions` · `rule/hooks/presence-decides-delivery` · `rule/hooks/read-wording` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-092 [read-edit] read then change re-delivers the mandatory form once` · **Status:** Tested

---

#### TC-PFCI-093: Opting out of inline rules is refused while a rule-bearing class is delivered on reads only [P1]

**Objective:** Prove that the opt-out from repeating short rules is refused when a class that has short rules is delivered on reads only, because the convention lookup never prints such a class, so every short rule stays among the golden rules and the maintainer is warned.

**Business Intent / Invariant Guarded:** Automatic delivery is never the only carrier of a convention, even when a class limits its delivery to reads (BR-PFCI-13, BR-PFCI-19).

**Traces:** AC-PFCI-29 / BR-PFCI-13 / BR-PFCI-19

**Preconditions:**

- Automatic delivery is switched on and the convention lookup is available
- The project opted out of repeating short rules in the static instructions
- One class with short rules is delivered on reads only; another class with short rules uses the default trigger

**Real-World Reachability:** A maintainer marks an orientation class as read-only so it stops repeating on edits, while the same project trims its always-loaded instructions.

**Demo Flow:** Regenerate the static instructions and read the golden rules and the maintainer warning; then run the lookup for a file of the read-only class.

```gherkin
Given the project opted out of repeating short rules in the static instructions
And automatic delivery is switched on and the convention lookup is available
And a class with short rules is delivered on reads only
When the static instructions are regenerated
Then every short rule, including that class's, stays among the golden rules
And the maintainer is warned with the read-only class named
And when the same class is delivered on changes or on both, the golden rules name it and point to the lookup
```

**Expected Result:**

| Dimension               | Expectation                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the static instructions, the maintainer warning and the lookup output |
| **System behavior**     | Opt-out refused; the refusal reason names the read-only class                                                   |
| **Business data state** | No change                                                                                                       |
| **Data shown on UI**    | Every short rule among the golden rules; the lookup for a file of the read-only class prints nothing for it     |

**Acceptance Criteria:**

- ✅ Every short rule stays among the golden rules and the warning names the read-only class
- ✅ The same class delivered on changes or on both keeps the compact golden rules
- ❌ Compact golden rules naming a read-only class whose rules no non-automatic carrier prints

**Test Data:**

```json
{
    "inlinePathRules": false,
    "groups": [
        { "name": "api-route", "pathGlobs": ["app/api/**"], "rules": ["Routes are thin wrappers"] },
        { "name": "orient", "pathGlobs": ["src/**"], "rules": ["Start at src/index.cjs"], "on": "read" }
    ]
}
```

**Edge Cases:**

- A read-only class without short rules → nothing to lose, so the compact form is kept
- A trigger value validation rejects (a different letter case, surrounding spaces) → the class counts as both (BR-PFCI-11), so it does not refuse the opt-out

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/static-parity]` · `[Source: rule/hooks/per-class-trigger]`
> **Related Behaviors:** `constraint/hooks/static-parity` · `component/hooks/static-convention-table` · `test/hooks/file-convention-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/file-convention-inject.test.cjs::TC-PFCI-093 path rules always reach the agent: a read-only rule-bearing class keeps the rules inline` · **Status:** Tested

---

_Feature Spec — tech-free 8-section template v4.0_
