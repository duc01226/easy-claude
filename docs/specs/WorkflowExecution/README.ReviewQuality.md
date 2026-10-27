---
module: skills
service: framework.WorkflowExecution
feature_code: RVQ
entities: [ReviewDimension, DimensionCheck, PlanProfile, FixRound, DriftCheck]
status: active
owner: Framework maintainers
last_updated: '2026-10-27'
scope_mode: FRAMEWORK-LIBRARY
large_idea_decomposition:
    outcome_slices:
        - id: RVQ-S1
          outcome: Reviewers work one shared list of review dimensions as evidence-closed checks, scaled by plan size, with fresh context left to the reviewer and fixes kept proportionate
          releasable_when: TC-RVQ-001 to TC-RVQ-006 and TC-RVQ-008 pass
          owning_artifact: this spec, US-RVQ-01 to US-RVQ-04
        - id: RVQ-S2
          outcome: A specification audit reports rules the system no longer enforces, not only stale dates
          releasable_when: TC-RVQ-007 passes
          owning_artifact: this spec, US-RVQ-05
        - id: RVQ-S3
          outcome: A decision interview offers a short stress pass on its recorded decisions
          releasable_when: TC-WFR-029 passes
          owning_artifact: Workflow Routing spec, US-WFR-06
        - id: RVQ-S4
          outcome: After a consequential answer the assistant offers a deeper check in the form each person chose, advice questions get the same self-review as verdict questions, and a standalone plan ends with one next-step question
          releasable_when: TC-RVQ-009, TC-RVQ-010, TC-RVQ-011 and TC-RVQ-012 pass
          owning_artifact: this spec, US-RVQ-06
    dependencies_order:
        - before: RVQ-S1
          after: RVQ-S2
          reason: none in data; S1 first so its side-by-side check confirms the approach before other skills adopt it
        - before: RVQ-S1
          after: RVQ-S3
          reason: none in data; same ordering reason as S2
        - before: RVQ-S3
          after: RVQ-S4
          reason: S4 offers the decision interview that S3 extends; no data dependency
    non_goals:
        - statement: No mandatory independent reviewer panel, coordinating reviewer or duplicate reviewers
          owner: Framework maintainers
        - statement: No separate design-document artifact beside specifications and plans
          owner: Framework maintainers
        - statement: No per-folder description files generated from the code
          owner: Framework maintainers
        - statement: No automatic heavy review of every answer; the deeper check runs only when the user picks it
          owner: Framework maintainers
    risks_evidence:
        - risk: Self-review cannot see its own unwritten assumptions, so outsider read finds little in the session that wrote the artifact
          evidence_needed: side-by-side review of two saved plans, old and new review
          status: partly confirmed (side-by-side check, 2026-10-26) — the writing session found 6 of 10 real outsider-read gaps and missed a contradiction it had created; a fresh small-model read found it but listed 52 items (19% real) when not told who the reader is. Plan review itself — new guidance found 7 issues on the full plan vs 5 for the old, at equal cost, two of which the build later had to fix; on the light plan both found the same 2 MEDIUMs and the old found 2 more LOWs. Mitigated — the fresh read is now briefed with its reader and a 10-item cap (BR-RVQ-05)
          owner: Framework maintainers
        - risk: Moving the dimension list out of the rationale review hides it from a reviewer who never opens it
          evidence_needed: guidance points to the list with a read-before-review instruction; tests assert the pointer
          status: mitigated — TC-RVQ-001 asserts both read-before-review pointers
          owner: Framework maintainers
    deferred_work_owner:
        - item: Reword the remaining "fresh helper agent" phrasing across other review skills
          owner: Framework maintainers
          follow_up_artifact: a later change
          target_slice: RVQ-S1
        - item: Let task and specification reviews read the same dimension list
          owner: Framework maintainers
          follow_up_artifact: a later change
          target_slice: RVQ-S1
roadmap: null
milestone_id: null
scope_brief: null
roadmap_status: null
---

# Review Quality — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. Technical identifiers live only in frontmatter and the Section 8 hidden carriers.

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

When the assistant reviews a plan, a rationale or another written artifact, it checks a fixed set of review dimensions. One list owns them, and the reviewer works each applicable dimension as its own tracked check, closed with evidence it found. The review also checks things a planning conversation tends to miss: whether an outsider could follow the artifact, and whether any decision is still left to whoever builds it. A plan's review grows with the plan, so a small plan stays cheap. The reviewer decides whether a fresh helper agent is worth its cost; no rule forces one. Fixes made during a review stay proportionate to what was found. A specification audit can also report business rules the system no longer enforces, not only that a document is older than the code. After an answer the user will act on, the assistant asks once whether to test it by interview, review it adversarially, or leave it, because most users do not know when either would help. A plan the user asked for directly ends with one question: execute it, review it more deeply, or stop.

## Large-Idea Decomposition

The decomposition lives in the frontmatter block `large_idea_decomposition`: four independently releasable slices (RVQ-S1 review dimensions and proportionate fixes, RVQ-S2 meaning-level audit, RVQ-S3 decision-interview stress pass, owned by the Workflow Routing spec, RVQ-S4 deeper-check offer after a consequential answer), with no data dependency between them.

---

## 2. Glossary

| Term                | Definition                                                                                                                | Context                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Review dimension    | One angle a reviewer judges an artifact from, with its purpose and the question it answers                                | The shared list every rationale and plan review reads |
| Dimension check     | One tracked item per applicable dimension, closed with a verdict and the evidence behind it                               | Created by the reviewer before judging                |
| Applicable dimension | A dimension whose subject exists in the artifact under review; one that does not apply closes as not applicable with a one-line reason | Decides which checks a review creates |
| Tool evidence       | Something a lookup returned: a search that was run, a cited location, a named test                                        | Required to close a dimension check                   |
| Outsider read       | The dimension asking whether a reader with no access to the planning conversation can follow the artifact                 | Catches context that lives only in the conversation   |
| Decision readiness  | The dimension asking whether every product, public-contract, data or irreversible choice is settled or explicitly blocked | Local working detail stays with the builder           |
| Plan profile        | The size class a plan declares: light for small, low-risk work; full otherwise                                            | Sets how many dimensions a plan review runs           |
| Helper agent        | A separate assistant context a reviewer may start for part of a review                                                    | Its use is the reviewer's choice                      |
| Fix round           | One pass of validated fixes followed by a fresh review of the settled artifact                                            | Bounded by the shared round limit                     |
| Meaning-level drift | A business rule a specification states that the system no longer enforces, or enforces differently                        | Reported by the specification audit                   |
| Consequential answer | A recommendation, plan, design, solution or verdict the user will act on, with a material trade-off or an irreversible, cross-module, security, data or cost consequence | Decides whether a deeper check is offered |
| Deeper-check offer  | The close of a consequential answer that names the one or two checks that fit best (by default the decision interview and the adversarial review), in the form the decision-support mode sets | Once per subject                                |
| Decision-support mode | A person's preference for how a deeper check is offered: ask (the default; one question with skip), suggest (one closing line, no question), auto (the adversarial review runs on the draft before the reply; the interview is still asked about) or off (no offer) | Also sets the form of the mid-session plan question; a team sets a default, a person overrides it |
| Advice question     | A question asking for the best way, an approach, a design or a recommendation                                             | Gets the same self-review as a verdict question       |
| Decision interview | An interview that puts each choice an answer, plan or idea made to the user, one decision at a time, and records the answers | One option of the deeper-check offer |
| Rationale review | An adversarial review of the reasoning behind a decision, plan or claim; it interviews no one and asks the user only to confirm a material trade-off | The other option of the deeper-check offer |
| Plan review | A rationale review of a saved implementation plan, scaled by the plan profile | Run on request, and by plan creation on its own plan |
| Specification audit | A read-only check of a specification against the system that should enforce it | Reports stale sections and meaning-level drift |
| Ideation session | A brainstorm that ranks options and recommends one | May offer the decision interview on its recommended option |
| Standalone plan | A plan the user asked for directly, not one a workflow or another skill created | Ends with one next-step question |
| Mid-session plan question | The one question asked before non-trivial work requested later in a session: plan first, run directly, or interview first | Owned by Workflow Routing (BR-WFR-17); replaces the deeper-check offer on its turn |

---

## 3. User Stories & Acceptance Criteria

### US-RVQ-01: Work every review angle as an evidence-closed check

**As a** developer asking for a review
**I want** the reviewer to judge each angle separately and show what it found
**So that** a review cannot pass by blending every angle into one general approval

**Acceptance Criteria:**

- **AC-RVQ-01** — **Given** a rationale review or a plan review **When** the reviewer prepares its checks **Then** both read the same single list of review dimensions, and no second list of dimensions exists elsewhere
- **AC-RVQ-02** — **Given** the dimension list **When** the reviewer starts **Then** it creates one tracked check per applicable dimension, closes each with its verdict and tool evidence before the next, and counts a check closed without evidence as unchecked
- **AC-RVQ-03** — **Given** the dimension list **When** a reader inspects it **Then** it includes outsider read, decision readiness, and a change-cost dimension that asks whether each change is needed, whether it is the smallest change at the root cause, and whether an existing part was searched for

### US-RVQ-02: Pay for review in proportion to the plan

**As a** developer with a small plan
**I want** its review to run only the dimensions that matter at that size
**So that** small work does not pay for a large review

**Acceptance Criteria:**

- **AC-RVQ-04** — **Given** a plan review, or plan creation's own review pass **When** the plan declares the light profile **Then** it runs goal alignment, future change cost, decision readiness and test, specification and documentation sync; **When** it declares the full profile **Then** it runs every applicable dimension, including outsider read in any session; in both cases it also checks that the outcome has a clear owner and specification with stated non-goals and no silent expansion, that discovery is bounded with a named way to settle each uncertainty, and that the not-yet-specified list holds no product, contract or irreversible decision; the profile split and the plan-only checks are stated once, in the dimension list both reviews read
- **AC-RVQ-05** — **Given** a plan is being validated or executed **When** its guidance loads **Then** no review dimension text loads with it
- **AC-RVQ-06** — **Given** a rationale review of a plan written by the planning procedure **When** its required sections are checked **Then** problem maps to the plan's outcome section, alternatives and rationale to its decisions, risk to its risks and ownership to its areas and owners, and the review output keeps its usual checklist

### US-RVQ-03: Leave fresh context to the reviewer

**As a** developer paying for the review's tokens
**I want** the reviewer to start a helper agent only when it judges the gain worth the cost
**So that** reviews are not forced into the most expensive form

**Acceptance Criteria:**

- **AC-RVQ-07** — **Given** any review or re-review **When** a fresh view is needed **Then** the reviewer re-reads the saved artifact rather than relying on memory, decides itself whether a helper agent is worth its cost, and never reuses a helper agent from an earlier round when it does start one; no rule in the shared review guidance (the dimension list, the round-structure guide, the task and artifact reviews, and the guidance that writes review loops into other skills) requires a helper agent, and rewording the other review skills that still require one is listed as deferred work

### US-RVQ-04: Keep fixes proportionate

**As a** developer whose artifact is being fixed during a review
**I want** each fix to be the smallest one that answers its finding
**So that** review rounds do not pile defensive machinery onto the work

**Acceptance Criteria:**

- **AC-RVQ-08** — **Given** a validated finding in a fix round **When** it is fixed **Then** the fix is made at the evidenced owner with the smallest change proportionate to the finding's severity, and every published copy of this rule matches its single owner

### US-RVQ-05: Catch rules the system stopped enforcing

**As a** framework maintainer auditing a specification
**I want** the audit to check stated business rules against what the system does
**So that** a rule the system silently stopped enforcing is found, not only a document that is older than the code

**Acceptance Criteria:**

- **AC-RVQ-09** — **Given** a specification audit with stale modules **When** the audit runs **Then** it checks each stated rule of those modules once per module or section, reports each divergence as missing or violated with its evidence, states how many rules it checked and how many diverge, changes no document, and the code-to-specification audit inherits the same pass without a second owner

### US-RVQ-06: Offer a deeper check when an answer matters

**As a** developer acting on the assistant's advice
**I want** to be asked, once, whether to test or review an answer before I act on it
**So that** I get the deeper check without having to know which skill to call or when

**Acceptance Criteria:**

- **AC-RVQ-10** — **Given** a question that asks for the best way, an approach, a design or a recommendation **When** the assistant answers **Then** it self-reviews the answer as it does a verdict: the constraints it assumed are named and at least one real alternative is weighed with the same evidence bar; build work that merely names a recommendation or asks for the work done the best way (unless the prompt also asks a question), a stated plan, a factual lookup (including what approach or design is already in use), and an explicit call of either deeper check get no such review prompt
- **AC-RVQ-11** — **Given** a consequential answer outside a running workflow, in the main conversation, in the default ask mode **When** the answer ends **Then** the assistant asks one question offering the one or two checks that fit best, plus skip — by default test it by decision interview or review it adversarially; the interview is listed first when the answer rests on the user's preferences or constraints, the review first when it rests on evidence
- **AC-RVQ-12** — **Given** a lookup, a trivial answer, a routine edit, a running workflow, a skill that closes with its own question or next step, a helper agent or headless run, a user who already asked for either check on this answer, a subject the user already skipped, or a turn on which the mid-session plan question applies (it replaces the offer) **When** the answer ends **Then** no offer is asked
- **AC-RVQ-13** — **Given** the decision interview, an ideation session or a standalone rationale review **When** its result leaves choices that rest on the user **Then** it points to the decision interview: the interview accepts an earlier answer as its subject and names the rationale review as its complement, ideation lists it on the recommended option as one option of its single closing next-step question (multi-opportunity discovery has no recommended option and lists none), and a standalone rationale review names it in its completed report with the material trade-offs, asking nothing more; none offers it as a workflow step or helper agent
- **AC-RVQ-15** — **Given** a consequential answer to any request — a question, an investigation, a design, a fix, or work in which the assistant chose an approach by itself **When** the answer ends **Then** the offer follows from the answer, never from how the request was worded; the assistant learns the rule and the active mode once per session, and again after the conversation is condensed, never in a helper agent
- **AC-RVQ-16** — **Given** each decision-support mode **When** a consequential answer ends **Then** ask asks one question; suggest closes with one line naming the checks and asks nothing; auto runs the adversarial review on the draft before replying, folds its validated findings in, and asks about the decision interview only when choices that only the user can make remain; off makes no offer while the self-review stays; auto reads as ask while automatic skill selection is restricted, and a team default yields to a person's own choice
- **AC-RVQ-17** — **Given** the first offer in a session **When** it names its checks **Then** each check gets one short clause on what it does, who does the work and its rough cost, plus how to change the mode; later offers stay one line; a saved plan may be offered its validation interview, decisions spanning sessions a decision map, and an irreversible high-stakes choice an adversarial advisor council, never more than two checks at once
- **AC-RVQ-14** — **Given** a plan created standalone, with a user present **When** its self-review and validation chain end (or the chain exits) **Then** the assistant asks one question — execute now, deeper review first (up to three rounds), or stop — recommends one with its reason, and acts only on the answer; inside a workflow, when another skill runs plan creation, or when no user can be reached, no question is asked and the hand-back names the same three next steps

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                         | Category       | Enforcement |
| --------- | -------------------------------------------- | -------------- | ----------- |
| BR-RVQ-01 | One owner for review dimensions              | Ownership      | [HARD]      |
| BR-RVQ-02 | Every dimension check closes with evidence   | Review conduct | [HARD]      |
| BR-RVQ-03 | Plan review scales with the plan profile     | Cost           | [HARD]      |
| BR-RVQ-04 | Review text loads only when a review runs    | Cost           | [HARD]      |
| BR-RVQ-05 | A helper agent is the reviewer's choice      | Cost           | [HARD]      |
| BR-RVQ-06 | Fixes are proportionate                      | Review conduct | [HARD]      |
| BR-RVQ-07 | Meaning-level drift is bounded and read-only | Audit          | [HARD]      |
| BR-RVQ-08 | Plan targets map required sections           | Review conduct | [HARD]      |
| BR-RVQ-09 | Advice questions get the answer self-review  | Answer review  | [HARD]      |
| BR-RVQ-10 | A consequential answer offers a deeper check | Answer review  | [HARD]      |
| BR-RVQ-11 | A standalone plan ends with one next-step question | Answer review | [HARD] |
| BR-RVQ-12 | Each person chooses how a deeper check is offered | Answer review | [HARD] |

### BR-RVQ-01: One owner for review dimensions [HARD]

**Statement:** The review dimensions exist in exactly one list. The rationale review and the plan review read that list. Neither keeps its own copy of the dimensions or a parallel list of angles.

```
IF a second list of review dimensions exists
  → REJECT: "Review dimensions have one owner; point to it instead of copying it"
```

### BR-RVQ-02: Every dimension check closes with evidence [HARD]

**Statement:** The reviewer creates one tracked check per applicable dimension and closes it with a verdict and tool evidence before starting the next. A check closed without evidence counts as unchecked. A dimension that does not apply closes as not applicable with a one-line reason. The list includes outsider read, decision readiness and a change-cost dimension covering necessity, smallest change and a search for an existing part.

### BR-RVQ-03: Plan review scales with the plan profile [HARD]

**Statement:** A light plan's review runs goal alignment, future change cost, decision readiness and test, specification and documentation sync. A full plan's review runs every applicable dimension, outsider read included in any session. A plan that declares no profile is reviewed as full. Plan creation's own review pass is one round, except for a full-profile plan with a one-way, cross-module, public-contract, data or security decision: that pass becomes a fix loop of up to three rounds. Both also check that the outcome has a clear owner and specification with non-goals and no silent expansion, that discovery is bounded, and that the not-yet-specified list parks no product, contract or irreversible decision. The profile split and the plan-only checks are stated once, in the dimension list that plan review and plan creation's own review pass both read.

| Plan profile | Dimensions run                                                             | Plan-only checks                             |
| ------------ | -------------------------------------------------------------------------- | -------------------------------------------- |
| light        | goal alignment, future change cost, decision readiness, test/spec/doc sync | owner and non-goals; bounded discovery; not-yet-specified hygiene |
| full         | every applicable dimension, outsider read in any session                   | owner and non-goals; bounded discovery; not-yet-specified hygiene |

### BR-RVQ-04: Review text loads only when a review runs [HARD]

**Statement:** Plan validation and plan execution load no review dimension text. The dimension list loads when a review reads it.

### BR-RVQ-05: A helper agent is the reviewer's choice [HARD]

**Statement:** No rule in the shared review guidance requires a helper agent: the dimension list, the round-structure guide, the task and artifact reviews, and the guidance that writes review loops into other skills. Rewording the other review skills that still require one is deferred work. A fresh view means re-reading the saved artifact; the reviewer decides whether a helper agent is worth its cost. A helper agent started for a round is never one reused from an earlier round. A short fresh read for outsider read is a comprehension check, not a review round: it is told who the reader is (someone with the repository open) and returns at most 10 items, most misleading first — what neither the page nor a file it names resolves, and statements on the page that contradict each other — so it carries none of the review-round briefing.

### BR-RVQ-06: Fixes are proportionate [HARD]

**Statement:** A validated finding is fixed at its evidenced owner with the smallest change proportionate to its severity. The rule has one owner; every published copy matches it.

### BR-RVQ-07: Meaning-level drift is bounded and read-only [HARD]

**Statement:** The specification audit checks stated rules only for modules that changed since the specification was last updated, one tracked check per module or section. It reports each divergence as missing or violated with its evidence, plus the count checked and the count divergent, and never changes a document. The code-to-specification audit inherits this pass.

### BR-RVQ-08: Plan targets map required sections [HARD]

**Statement:** When a rationale review targets a plan written by the planning procedure, its required sections map onto that plan's own sections instead of being demanded verbatim; the review output keeps its usual checklist.

### BR-RVQ-09: Advice questions get the answer self-review [HARD]

**Statement:** A question asking for the best way, an approach, a design or a recommendation gets the same anti-bias self-review as a verdict question, and the answer names the constraints it assumed and weighs at least one real alternative. Build work that only names a recommendation or asks for the work done the best way, unless the prompt also asks a question; a stated plan ("I suggest we …"); a factual lookup, including what approach or design is already in use; and an explicit call of the decision interview or the rationale review are not advice questions. An approach or design question asks for advice when it names a decision (what should, what fits, what is best, what do I take, what does this need); without one it asks what is already in use. The prompt check recognizes the common advice phrasings; the rule binds every advice answer whether or not the check fires.

### BR-RVQ-10: A consequential answer offers a deeper check [HARD]

**Statement:** After a consequential answer, the assistant offers a deeper check: in the default ask mode, one question offering the one or two checks that fit best plus skip — by default test it by decision interview or review it adversarially; a saved plan may be offered its validation interview, decisions spanning sessions a decision map, and an irreversible high-stakes choice an adversarial advisor council. An answer is consequential when it adopts or recommends a choice the user will act on and at least one holds: an alternative was rejected, the choice is hard to undo, it touches a public contract, data, security or cost, it spans modules, or it rests on assumptions about the user's constraints that could not be checked. The answer decides, never the wording of the request: an investigation, a design or a fix that ends in such a choice counts as advice does. It never asks after a lookup, a trivial answer or a routine edit, inside a running workflow, at the end of a skill that already closes with its own question or next step, from a helper agent or headless run, when the user already asked for either check on that answer, or again on a subject the user skipped. On a turn where the mid-session plan question applies (Workflow Routing, BR-WFR-17), that question replaces this offer. The decision interview, an ideation session and a standalone rationale review point to the interview where their result leaves choices to the user: ideation lists it as one option of its single closing next-step question, and a standalone rationale review names it in its completed report without asking; none does so as a workflow step or helper agent.

```
IF the answer is consequential AND no exemption holds
  → close it in the active decision-support mode (default ask: ONE question · the 1–2 fitting checks · skip)
IF an exemption holds
  → no offer
```

### BR-RVQ-11: A standalone plan ends with one next-step question [HARD]

**Statement:** A plan created standalone reviews itself (one round, or up to three for a high-risk full-profile plan) and is validated with the user; it then ends with one question: execute now, deeper review first, or stop. The recommendation follows the plan's state: execute when no finding stayed open and validation passed, a deeper review when a finding stayed open, validation was skipped, or a full-profile plan carries a one-way or cross-module decision and its self-review ran one round or none; when both fit, the deeper review is recommended. Plan creation never starts execution or a review on its own; the answer starts it. A workflow, a calling skill or a context with no user gets no question.

### BR-RVQ-12: Each person chooses how a deeper check is offered [HARD]

**Statement:** A person's decision-support mode sets how a deeper check is offered and how the mid-session plan question is put (Workflow Routing, BR-WFR-17). The modes are ask (the default), suggest, auto and off. Ask asks one question; suggest closes with one line naming the checks and asks nothing; auto runs the adversarial review on the draft before the reply, folds its validated findings in, and asks about the decision interview only when choices that only the user can make remain, because an interview needs the user and never starts on its own; off makes no offer and drops the plan question, while the answer self-review stays. Auto reads as ask while automatic skill selection is restricted, because it would start a review nobody named. A team sets a default and each person's own choice overrides it; an unknown value expresses no preference. The rule and the active mode reach the assistant once per session and again after the conversation is condensed, never in a helper agent, which has no user to answer. The first offer in a session gives each named check one short clause (what it does, who does the work, its rough cost) and says how to change the mode; later offers stay one line.

```
mode = default ask ← team default ← personal choice ← this checkout ← environment   (an unknown value is skipped)
IF mode = auto AND automatic skill selection is restricted → act as ask
ask     → ONE question · fitting checks · skip
suggest → ONE closing line naming the fitting checks; nothing runs
auto    → adversarial review of the draft first; ask about the interview only when user-only choices remain
off     → no offer, no plan question; the self-review stays
```

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/review-dimensions]` · `[Source: constraint/skills/review-policy]` · `[Source: operation/skills/spec-audit]` · `[Source: constraint/skills/judgement-integrity]` · `[Source: operation/hooks/judgement-integrity-route]` · `[Source: operation/scripts/workflow-routing-config]`

---

## 5. Domain Model

### Relationships (overview)

```mermaid
erDiagram
  ReviewDimension ||--o{ DimensionCheck : "is worked as"
  PlanProfile ||--o{ ReviewDimension : "selects"
  FixRound ||--o{ DimensionCheck : "re-runs"
  DriftCheck }o--|| ReviewDimension : "is outside"
```

### Entity: ReviewDimension

| Property      | Type | Required | Constraints                | Business Meaning       |
| ------------- | ---- | -------- | -------------------------- | ---------------------- |
| name          | text | Yes      | unique in the one list     | The angle judged       |
| question      | text | Yes      | answerable PASS or FINDING | What the reviewer asks |
| evidence kind | text | Yes      | names a lookup result      | What closes the check  |

### Entity: DimensionCheck

| Property  | Type | Required | Constraints                           | Business Meaning              |
| --------- | ---- | -------- | ------------------------------------- | ----------------------------- |
| dimension | text | Yes      | one per applicable dimension          | Which angle this check covers |
| verdict   | enum | Yes      | PASS, FINDING or N/A with reason      | The result                    |
| evidence  | text | Yes      | tool evidence; absent means unchecked | Why the verdict holds         |

### Entity: PlanProfile

| Property | Type | Required | Constraints   | Business Meaning                         |
| -------- | ---- | -------- | ------------- | ---------------------------------------- |
| value    | enum | Yes      | light or full | Sets which dimensions a plan review runs |

### Entity: FixRound

| Property | Type   | Required | Constraints                     | Business Meaning    |
| -------- | ------ | -------- | ------------------------------- | ------------------- |
| number   | number | Yes      | within the shared round limit   | Which round this is |
| fixes    | text   | Yes      | each smallest and proportionate | What changed        |

### Entity: DriftCheck

| Property        | Type | Required | Constraints                    | Business Meaning             |
| --------------- | ---- | -------- | ------------------------------ | ---------------------------- |
| scope           | text | Yes      | one stale module or section    | What was checked             |
| status per rule | enum | Yes      | PASS, MISSING or VIOLATED      | Whether the rule still holds |
| totals          | text | Yes      | rules checked, rules divergent | Coverage of the audit        |

### Enum: DriftStatus

| Value    | Meaning                                         |
| -------- | ----------------------------------------------- |
| PASS     | The rule is enforced as stated                  |
| MISSING  | No enforcement of the stated rule was found     |
| VIOLATED | The system does the opposite of the stated rule |

### Domain Events (business occurrences)

| Occurrence        | When it happens                           | Who/what reacts (business outcome)         |
| ----------------- | ----------------------------------------- | ------------------------------------------ |
| Dimension checked | A reviewer closes a check with evidence   | The next check starts                      |
| Drift found       | An audit finds a missing or violated rule | The maintainer sees it in the audit report |
| Deeper check offered | A consequential answer ends outside a workflow | The user picks interview, review or skip |
| Standalone plan closed | A standalone plan's self-review and validation end, or the validation chain exits | The user picks execute, deeper review or stop |

---

## 6. Process Flows

No user interface: this capability changes how the assistant reviews and audits, not a screen. Interaction surface sections are skipped for that reason.

### Flow: Review an artifact

| Step | Actor     | Action                                                                                       | System Response                       | Next |
| ---- | --------- | -------------------------------------------------------------------------------------------- | ------------------------------------- | ---- |
| 1    | Developer | Asks for a rationale or plan review                                                          | Reviewer reads the one dimension list | 2    |
| 2    | Reviewer  | Selects applicable dimensions (by plan profile for a plan)                                   | One tracked check per dimension       | 3    |
| 3    | Reviewer  | Closes each check with verdict and tool evidence                                             | Findings recorded                     | 4    |
| 4    | Reviewer  | Validates findings; in a fix loop, makes the smallest proportionate fix                      | Settled artifact                      | 5    |
| 5    | Reviewer  | Re-reads the saved artifact for a fresh review; starts a helper agent only by its own choice | Verdict                               | —    |

### Flow: Audit a specification for meaning-level drift

| Step | Actor      | Action                                                  | System Response                                                       | Next |
| ---- | ---------- | ------------------------------------------------------- | --------------------------------------------------------------------- | ---- |
| 1    | Maintainer | Runs the specification audit                            | Stale modules found from change history                               | 2    |
| 2    | Reviewer   | Checks each stated rule of each stale module or section | PASS, MISSING or VIOLATED with evidence                               | 3    |
| 3    | Reviewer   | Writes the audit report                                 | Divergences listed with "N checked, M divergent"; no document changed | —    |

### Flow: Offer a deeper check on an answer

| Step | Actor     | Action                                                        | System Response                                             | Next |
| ---- | --------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---- |
| 1    | Developer | Asks for advice, a plan, a design or a verdict                 | The assistant self-reviews its draft answer                 | 2    |
| 2    | Assistant | Sends the answer; judges whether the answer itself is consequential and exempt, whatever the request's wording | Consequential and not exempt: the close the decision-support mode sets — one question (ask, the default), one line (suggest), a reviewed answer (auto) or nothing (off) | 3    |
| 3    | Developer | Picks a check or skip, or types a named check later            | The picked check runs; skip leaves the answer as it is     | —    |

### Flow: Close a standalone plan

| Step | Actor | Action | System Response | Next |
| ---- | ----- | ------ | --------------- | ---- |
| 1 | Planner | Saves the plan, reviews it (one round, or up to three for a high-risk full plan) and runs the validation interview | Reviewed, validated plan | 2 |
| 2 | Planner | Asks one question with a reasoned recommendation: execute now, deeper review first, or stop | The question waits for the developer | 3 |
| 3 | Developer | Picks one | Only the answer starts the next run; in a workflow, a calling skill or with no user, the hand-back names the three steps instead | — |

---

## 7. Permissions & Roles

This capability enforces no permission boundary of its own. Anyone may ask for a review; the reviewing assistant runs it; changing the dimension list, the round rule or the audit guidance follows the repository’s normal write access and review.

| Role | Asks for review | Runs review | Changes the guidance |
| --- | :---: | :---: | :---: |
| Developer | yes | no | through normal repository access |
| Reviewing assistant | no | yes | no |
| Framework maintainer | yes | no | through normal repository access |

---

## 8. Test Specifications

### Test Summary

| Priority  | Count | Automated | Manual |
| --------- | ----- | --------- | ------ |
| P0        | 3      | 3         | 0      |
| P1        | 7      | 7         | 0      |
| P2        | 1      | 1         | 0      |
| **Total** | **11** | **11**    | **0**  |

Every rule in §4 is `[HARD]`, so each case below carries a property block under its Test Data: the input domain, the invariant that holds across it and the boundary counter-case. The cases are grouped by category; the Invariant / Property section indexes them by rule.

### Review Conduct Tests

#### TC-RVQ-001: One list owns the review dimensions [P0]

**Objective:** Keep the dimensions in one place so the next angle is a one-row change.

**Business Intent / Invariant Guarded:** BR-RVQ-01 / AC-RVQ-01 — for every review guidance a reviewer reads, the dimensions come from the one list.

**Preconditions:** The framework's review guidance as shipped.

**Real-World Reachability:** Every rationale or plan review a developer asks for: the reviewer opens its guidance before the first pass.

**Demo Flow:** A maintainer opens the rationale review and the plan review guidance and follows each to its dimensions.

```gherkin
Given every review guidance that names review dimensions
When a maintainer follows each one to its dimensions
Then each points to the same single dimension list with a read-before-review instruction
And no guidance holds its own dimension table or a parallel angle list
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | Both reviews read one list                                 |
| **Business data state** | Exactly one dimension list exists                          |
| **Data shown on UI**    | The list's rows, seen through either review                |

**Acceptance Criteria:**

- ✅ The rationale review and the plan review each point to the one list.
- ❌ A second dimension table anywhere in the review guidance fails the case.

**Test Data:** The rationale review guidance, the plan review guidance and the dimension list.

```yaml
inputDomain: 'any review guidance in the framework that names review dimensions: the rationale review, the plan review and any guidance added later'
invariant: 'for ALL such guidance the dimensions come from the one shared list through a read-before-review pointer, and exactly one dimension table exists'
boundaryCounterCase: 'a second guidance file carrying its own table of dimension rows → the case fails; naming a dimension inside another rule''s sentence is not a copy'
```

**Edge Cases (boundary counter-case):** One dimension's name used in a sentence of another rule is not a copy; a second table with the dimension rows is.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/review-dimensions]`
> **Related Behaviors:** `constraint/skills/review-dimensions`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-001` · **Status:** Tested

#### TC-RVQ-002: Every dimension check closes with tool evidence [P0]

**Objective:** Stop a review from passing on one general approval.

**Business Intent / Invariant Guarded:** BR-RVQ-02 / AC-RVQ-02, AC-RVQ-03 — for every applicable dimension, the check closes only with evidence.

**Preconditions:** The dimension list.

**Real-World Reachability:** Every review run: the reviewer builds its checks from the list before it judges anything.

**Demo Flow:** A developer asks for a review and reads the review report.

```gherkin
Given the dimension list
When a reviewer starts any review
Then it creates one tracked check per applicable dimension
And closes each with a verdict and tool evidence before the next
And a check closed without evidence counts as unchecked
And a dimension that does not apply closes as not applicable with a one-line reason
And the list contains outsider read and decision readiness
And its change-cost dimension asks about necessity, the smallest change and a search for an existing part
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | One check per applicable dimension, each with evidence     |
| **Business data state** | The list holds the evidence rule and the three angles      |
| **Data shown on UI**    | A review report with a verdict and evidence per dimension  |

**Acceptance Criteria:**

- ✅ The evidence rule, the not-applicable rule and the three angles are in the list.
- ❌ A rule allowing a check to close without evidence fails the case.

**Test Data:** The dimension list.

```yaml
inputDomain: 'any artifact under review, with any mix of dimensions whose subject exists in it and dimensions whose subject does not'
invariant: 'for ALL such reviews each applicable dimension is one check closed with a verdict and tool evidence before the next starts, and every other dimension closes as not applicable with a one-line reason'
boundaryCounterCase: 'a check closed with a verdict but no evidence → counted as unchecked, never as a pass'
```

**Edge Cases (boundary counter-case):** A dimension with no subject in the artifact is closed not applicable with its reason, not silently skipped.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/review-dimensions]`
> **Related Behaviors:** `constraint/skills/review-dimensions`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-002` · **Status:** Tested

#### TC-RVQ-003: Plan review scales with the plan profile [P1]

**Objective:** Keep small plans cheap without losing plan-only checks.

**Business Intent / Invariant Guarded:** BR-RVQ-03 / AC-RVQ-04 — for every plan profile, the review runs exactly its stated dimension set plus the plan-only checks.

**Preconditions:** The dimension list (owner of the profile split and the plan-only checks) and the plan review guidance that points to it.

**Real-World Reachability:** A developer asks for a plan review after the planning procedure saved a plan, with a declared profile or none.

**Demo Flow:** A developer runs a plan review on a light plan and on a full plan.

```gherkin
Given a plan review
When the plan is light
Then it runs goal alignment, future change cost, decision readiness and test, spec and doc sync
When the plan is full
Then it runs every applicable dimension including outsider read in any session
When the plan declares no profile
Then it is reviewed as full
And every profile also checks a clear owner with non-goals and no silent expansion, bounded discovery and the not-yet-specified list
And plan creation's own review pass applies the same profile scaling and records each dimension's verdict
And a high-risk full-profile plan gets a fix loop of up to three rounds; every other plan gets one round
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | Dimension set chosen by profile                            |
| **Business data state** | Not applicable — no data changes                           |
| **Data shown on UI**    | The review report lists the profile's dimensions           |

**Acceptance Criteria:**

- ✅ Light, full and undeclared profiles each name their set; the plan-only line is present.
- ❌ Outsider read limited to the drafting session fails the case.

**Test Data:** The dimension list, the plan review guidance and the planning procedure's Self-Review Pass.

```yaml
inputDomain: 'any saved plan declaring the light profile, the full profile or no profile, reviewed by plan review or by plan creation''s own pass, in the session that wrote it or a later one'
invariant: 'for ALL such plans the review runs exactly the dimension set its profile selects in the one dimension list (no profile counts as full) plus the three plan-only checks, and plan creation''s own pass loops up to three rounds only for a full plan with a one-way, cross-module, public-contract, data or security decision'
boundaryCounterCase: 'a light plan → still gets the three plan-only checks; a full plan reviewed in a later session → still runs outsider read'
```

**Edge Cases (boundary counter-case):** A light plan still gets the three plan-only checks; outsider read runs on a full plan reviewed in a later session.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/review-dimensions]` · `[Source: constraint/skills/plan-mode-review]`
> **Related Behaviors:** `constraint/skills/plan-mode-review`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-003` · **Status:** Tested

#### TC-RVQ-004: Validation and execution load no review text [P1]

**Objective:** Spend review tokens only when a review runs.

**Business Intent / Invariant Guarded:** BR-RVQ-04 / AC-RVQ-05 — for every guidance plan validation or execution loads, no dimension text loads.

**Preconditions:** The plan's validation and execution guidance and the gate checklist they read.

**Real-World Reachability:** A developer validates or executes a saved plan; only that mode's guidance loads.

**Demo Flow:** A maintainer inspects what a validation or an execution reads.

```gherkin
Given every guidance plan validation and plan execution read
When it is inspected
Then it carries no review dimension rows
And no pointer that loads the dimension list
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is loaded guidance |
| **System behavior**     | Validation and execution load no review text               |
| **Business data state** | Not applicable — no data changes                           |
| **Data shown on UI**    | Not applicable — nothing new is shown                      |

**Acceptance Criteria:**

- ✅ None of those loads contains the dimension list or a pointer to it.
- ❌ Dimension rows in the shared gate checklist fail the case.

**Test Data:** The validation, execution and gate checklist guidance.

```yaml
inputDomain: 'any guidance that plan validation, plan execution or the plan gate checklist loads'
invariant: 'for ALL such guidance no dimension text loads, and no validation, execution or gate checklist file points to the dimension list'
boundaryCounterCase: 'the plan review guidance → points to the list, as the one plan load allowed to'
```

**Edge Cases (boundary counter-case):** The plan review guidance does point to the list; that is the one plan load allowed to.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/plan-mode-review]`
> **Related Behaviors:** `constraint/skills/plan-mode-review`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-004` · **Status:** Tested

#### TC-RVQ-005: No review rule forces a helper agent [P0]

**Objective:** Leave the expensive form of review to the reviewer's judgement.

**Business Intent / Invariant Guarded:** BR-RVQ-05 / AC-RVQ-07 — for every review rule in scope, a helper agent is optional.

**Preconditions:** The shared review guidance: the dimension list, the task review, the artifact review, the round-structure guide and the guidance that writes review loops into other skills.

**Real-World Reachability:** Any review or re-review in any review skill, at the moment the reviewer decides how to get a fresh view.

**Demo Flow:** A maintainer reads the review rules that used to require a fresh helper agent.

```gherkin
Given every rule in the shared review guidance that used to require a fresh helper agent
When it is read
Then a fresh view means re-reading the saved artifact
And the reviewer chooses whether to start a helper agent
And a helper agent started for a round is never reused from an earlier round
And no sentence requires a new helper agent for every round or every re-review
And a short fresh read for outsider read is a comprehension check, so it carries no review-round briefing
And that read is told who the reader is and returns at most 10 items: unresolved terms and contradictions on the page
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | Reviews may stay in one context                            |
| **Business data state** | Not applicable — no data changes                           |
| **Data shown on UI**    | Not applicable — nothing new is shown                      |

**Acceptance Criteria:**

- ✅ Each rule states the choice and the no-reuse limit.
- ❌ Any remaining "every round spawns a new helper agent", "restart with a fresh zero-memory reviewer" or "Round 2 uses a fresh sub-agent" sentence in the shared review guidance fails the case; the other review skills listed as deferred work are outside this case.

**Test Data:** The task review checklist, the artifact review mode and the round-structure guide.

```yaml
inputDomain: 'any rule in the shared review guidance: the dimension list, the round-structure guide, the task and artifact reviews, and the guidance that writes review loops into other skills'
invariant: 'for ALL such rules a fresh view means re-reading the saved artifact, and starting a helper agent is the reviewer''s choice, never a requirement'
boundaryCounterCase: 'a sentence requiring a new helper agent for every round, every re-review or a fixed round → the case fails; the prompt template a reviewer uses when it does choose one remains'
```

**Edge Cases (boundary counter-case):** The prompt template a reviewer uses when it does choose a helper agent remains; only the requirement to start one is removed.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/sub-agent-selection]`
> **Related Behaviors:** `constraint/skills/sub-agent-selection`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-005` · **Status:** Tested

#### TC-RVQ-006: Fixes are proportionate, and every copy matches the owner [P1]

**Objective:** Prevent defensive bloat at the moment of fixing.

**Business Intent / Invariant Guarded:** BR-RVQ-06 / AC-RVQ-08 — for every copy of the review-round rule, fixes are smallest and proportionate.

**Preconditions:** The review-round rule's owner and its published copy.

**Real-World Reachability:** Any fix round of any review loop, after its findings are validated and before the fix is made.

**Demo Flow:** A maintainer reads the round rule in its owner and in its published copy.

```gherkin
Given every copy of the review-round rule
When it describes fixing validated findings
Then it requires the smallest fix proportionate to the finding's severity at the evidenced owner
And every published copy is identical to its single owner
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | Fix rounds make proportionate fixes                        |
| **Business data state** | Owner and copies agree                                     |
| **Data shown on UI**    | Not applicable — nothing new is shown                      |

**Acceptance Criteria:**

- ✅ The proportionate-fix wording is in the owner and every copy.
- ❌ A copy that differs from the owner fails the case.

**Test Data:** The rule owner and its published copy.

```yaml
inputDomain: 'any validated finding of any severity in any fix round, and every published copy of the review-round rule'
invariant: 'for ALL such findings the fix is made at the evidenced owner with the smallest change proportionate to its severity, and every copy equals its owner'
boundaryCounterCase: 'a published copy that differs from its owner by one character → the case fails'
```

**Edge Cases (boundary counter-case):** The wording keeps "at the evidenced owner"; proportionality never moves a fix away from its owner.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/review-policy]`
> **Related Behaviors:** `constraint/skills/review-policy`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-006` · **Status:** Tested

### Audit Tests

#### TC-RVQ-007: Specification audit reports meaning-level drift, bounded and read-only [P1]

**Objective:** Find rules the system stopped enforcing without unbounded cost.

**Business Intent / Invariant Guarded:** BR-RVQ-07 / AC-RVQ-09 — for every stale module, every stated rule is checked once and reported; nothing is edited.

**Preconditions:** The specification audit guidance and the code-to-specification audit route.

**Real-World Reachability:** A maintainer runs the specification audit after code changed since the specification's last update.

**Demo Flow:** A maintainer runs a specification audit after code changed and reads the audit report.

```gherkin
Given a specification audit with stale modules
When the audit runs its meaning-level pass
Then it checks stated rules once per stale module or section
And reports each divergence as missing or violated with evidence
And states how many rules it checked and how many diverge
And changes no document
And the code-to-specification audit reaches this pass through the specification audit
```

**Expected Result:**

| Dimension               | Expectation                                                 |
| ----------------------- | ----------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the audit report |
| **System behavior**     | Bounded, read-only pass                                     |
| **Business data state** | Specifications unchanged by the audit                       |
| **Data shown on UI**    | Divergences plus "N checked, M divergent"                   |

**Acceptance Criteria:**

- ✅ The pass, its statuses, its totals and its read-only rule are stated.
- ❌ A pass that runs over unchanged modules, or a second owner of the pass, fails the case.

**Test Data:** The specification audit guidance and the code-to-specification audit route.

```yaml
inputDomain: 'any specification audit over any set of modules, changed or unchanged since the specification was last updated'
invariant: 'for ALL stale modules each stated rule is checked once, reported PASS, MISSING or VIOLATED with its evidence and counted, and no document is edited'
boundaryCounterCase: 'no module changed since the last update → zero rules checked and no drift reported'
```

**Edge Cases (boundary counter-case):** When no module changed since the last update, the pass checks nothing and reports zero checked.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/spec-audit]`
> **Related Behaviors:** `operation/skills/spec-audit`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-007` · **Status:** Tested

### Rationale and Answer Review Tests

#### TC-RVQ-008: A plan target maps the rationale review's required sections [P2]

**Objective:** Let the rationale review judge a plan by the plan's own structure.

**Business Intent / Invariant Guarded:** BR-RVQ-08 / AC-RVQ-06 — for a plan from the planning procedure, every required section maps to a plan section.

**Preconditions:** The rationale review guidance.

**Real-World Reachability:** A developer asks for a rationale review of a plan the planning procedure wrote.

**Demo Flow:** A developer asks for a rationale review of a saved plan.

```gherkin
Given a rationale review of a plan written by the planning procedure
When it checks required sections
Then problem maps to the outcome section, alternatives and rationale to decisions, risk to risks and ownership to areas and owners
And the review output checklist keeps all its rows
```

**Expected Result:**

| Dimension               | Expectation                                                |
| ----------------------- | ---------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is review guidance |
| **System behavior**     | Plan sections satisfy the required sections                |
| **Business data state** | Not applicable — no data changes                           |
| **Data shown on UI**    | The usual review checklist                                 |

**Acceptance Criteria:**

- ✅ The mapping sentence is present and the output checklist rows are unchanged.
- ❌ Demanding a separate "Alternatives Considered" section from such a plan fails the case.

**Test Data:** The rationale review guidance.

```yaml
inputDomain: 'any plan a rationale review targets, written by the planning procedure or taken from another source'
invariant: 'for ALL plans from the planning procedure every required section maps onto one of the plan''s own sections and the review output keeps its checklist'
boundaryCounterCase: 'a plan from another source → keeps the generic required sections'
```

**Edge Cases (boundary counter-case):** A plan not written by the planning procedure keeps the generic required sections.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/why-review-full-mode]`
> **Related Behaviors:** `constraint/skills/why-review-full-mode`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-008` · **Status:** Tested

#### TC-RVQ-009: A consequential answer offers a deeper check, once and only where it can be answered [P1]

**Objective:** Make the decision interview and the rationale review reachable at the moment they help, without interrupting other work.

**Business Intent / Invariant Guarded:** BR-RVQ-10 / AC-RVQ-11, AC-RVQ-12, AC-RVQ-13 — for every consequential answer outside the exemptions, in the default ask mode, exactly one question offering the fitting checks and skip; for every exemption, none.

**Preconditions:** The answer self-review rule and the guidance of the decision interview, ideation and rationale review.

**Real-World Reachability:** A developer asks for advice in the main conversation, outside any workflow, and is about to act on the answer.

**Demo Flow:** A developer asks how to structure multi-tenant access, receives a recommendation, and is asked whether to test it by interview, review it, or skip.

```gherkin
Given a consequential answer in the main conversation, outside a running workflow, in the default ask mode
When the answer ends
Then one question offers the one or two checks that fit best, by default: test it by decision interview, review it adversarially, or skip
And the decision interview accepts an earlier answer as its subject and names the rationale review as its complement
And the interview is listed first when the answer rests on the user's constraints, the review first when it rests on evidence
And ideation lists the interview as one option of its single closing question, and a standalone rationale review names it in its report without asking
And on a turn where the mid-session plan question applies, no offer is asked
```

**Expected Result:**

| Dimension               | Expectation                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| **UI**                  | One question with three options at the end of the answer         |
| **System behavior**     | The picked check runs; skip leaves the answer unchanged           |
| **Business data state** | Not applicable — no data changes                                  |
| **Data shown on UI**    | The three options, the recommended one first                      |

**Acceptance Criteria:**

- ✅ The offer rule, its three options and its exemptions are stated; the three pointing skills carry their offer and its boundary.
- ❌ An offer after a lookup, inside a running workflow, from a helper agent, or again after a skip fails the case.

**Test Data:** The answer self-review rule and the three skills' guidance.

```yaml
inputDomain: 'any answer in any context: consequential or not; in the main conversation, a running workflow, a skill that owns its close, a helper agent or a headless run; already checked, already skipped, or on a turn the mid-session plan question covers'
invariant: 'for ALL consequential answers outside every exemption exactly one question with three options is asked, the interview first when the answer rests on the user''s constraints and the review first when it rests on evidence; for ALL exempt answers none is asked'
boundaryCounterCase: 'an ideation session or a rationale review run as a workflow step → no offer; the workflow''s next steps own the move'
```

**Edge Cases (boundary counter-case):** An ideation session or a rationale review run as a workflow step makes no offer; the workflow's next steps own the move.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/judgement-integrity]`
> **Related Behaviors:** `constraint/skills/judgement-integrity`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-009`; `.claude/hooks/tests/suites/judgement-integrity-route.test.cjs::TC-JIR-013` · **Status:** Tested

#### TC-RVQ-010: Advice questions get the answer self-review; build work does not [P1]

**Objective:** Give recommendations the same anti-bias check verdicts get, without prompting it on build work.

**Business Intent / Invariant Guarded:** BR-RVQ-09 / AC-RVQ-10 — for every advice question the self-review applies; for every build request that only names a recommendation, it does not.

**Preconditions:** The answer self-review prompt check.

**Real-World Reachability:** Every user prompt in a session; advice asks, build requests, stated plans and lookups arrive in any order.

**Demo Flow:** A developer asks for the best way to cache tokens, then later asks to implement the suggested fix.

```gherkin
Given a question asking for the best way, an approach, a design or a recommendation
When the question arrives
Then the answer self-review applies, naming assumed constraints and weighing a real alternative
And a request to implement, apply or follow a recommendation, or to build something the best way, gets no review prompt unless it also asks a question
And a lookup of a choice already made ("what strategy do we use?") gets no review prompt
And a stated plan ("I suggest we …") or a factual lookup ("what tool runs the tests?") gets no review prompt
And an explicit call of the decision interview or the rationale review gets no review prompt
```

**Expected Result:**

| Dimension               | Expectation                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| **UI**                  | Not applicable — the observable surface is the assistant's answer |
| **System behavior**     | Advice questions are self-reviewed; build work is not prompted    |
| **Business data state** | Not applicable — no data changes                                  |
| **Data shown on UI**    | The answer's assumed constraints and the alternative it weighed   |

**Acceptance Criteria:**

- ✅ Each advice phrasing in the test set is recognized as advice.
- ❌ A build request that names a recommendation being prompted fails the case.

**Test Data:** Thirty-one advice phrasings, and thirty-eight build, stated-plan, lookup or explicit-call phrasings.

```yaml
inputDomain: 'any user prompt: advice asks; build requests with or without a question; stated plans; lookups of facts or of choices already made; explicit calls of either deeper check'
invariant: 'for ALL advice asks in the phrasings the test set enumerates (a best or right way; how or what would you; an approach or design question naming a decision; recommend, suggest, propose or advise; any suggestions as a question; your advice) the answer self-review prompt is added, naming the assumed constraints and a weighed alternative; for ALL build requests that ask no question, stated plans, lookups and explicit calls no review prompt is added'
boundaryCounterCase: '"Implement the cache using the best approach" → build work, no prompt; "Run the tests. What is the best way to speed them up?" → still an advice ask'
```

**Edge Cases (boundary counter-case):** "Apply what you recommend in the plan" is build work and gets no prompt.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/judgement-integrity]`
> **Related Behaviors:** `constraint/skills/judgement-integrity`
> **CoveredBy:** `.claude/hooks/tests/suites/judgement-integrity-route.test.cjs::TC-JIR-012` · **Status:** Tested

#### TC-RVQ-011: A standalone plan ends with one next-step question [P1]

**Objective:** Make the deeper review and execution reachable at the moment a plan is ready, without starting either unasked.

**Business Intent / Invariant Guarded:** BR-RVQ-11 / AC-RVQ-14 — for every standalone plan with a user present, exactly one closing question with three options; for every workflow, calling skill or unreachable user, none.

**Preconditions:** The planning procedure's guidance.

**Real-World Reachability:** A developer asks for a plan directly, answers the validation interview, and decides what happens next in the same session.

**Demo Flow:** Ask for a plan standalone, answer the validation interview, and see the closing question; pick deeper review and see the plan review start.

```gherkin
Given a plan created standalone with a user present
When its self-review and validation chain end, or the chain exits
Then one question offers: execute now, deeper review first, or stop
And one option is recommended with its reason
And only the answer starts execution or review
And a workflow, a calling skill or a context with no user gets no question
```

**Expected Result:**

| Dimension               | Expectation                                                    |
| ----------------------- | -------------------------------------------------------------- |
| **UI**                  | One closing question with three options                        |
| **System behavior**     | The picked next step starts as its own run; stop ends the run  |
| **Business data state** | Not applicable — no data changes                               |
| **Data shown on UI**    | The three options, the recommended one first                   |

**Acceptance Criteria:**

- ✅ The closing question, its three options, its recommendation rule and its exemptions are stated.
- ❌ Plan creation starting execution or a review without an answer, or asking inside a workflow, fails the case.

**Test Data:** The planning procedure's guidance.

```yaml
inputDomain: 'any plan creation: standalone with a user present, in a workflow, run by another skill, or with no user to reach; with validation passed, skipped or exited, and any self-review result'
invariant: 'for ALL standalone runs with a user present exactly one closing question with three options and a reasoned recommendation is asked, and only the answer starts the next run; for ALL other runs none is asked and the hand-back names the same three steps'
boundaryCounterCase: 'the validation chain exits (setting off or declined) → the question is still asked, with the deeper review recommended'
```

**Edge Cases (boundary counter-case):** The validation chain exits (setting off or declined): the closing question is still asked, with a deeper review recommended.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/skills/plan]`
> **Related Behaviors:** `constraint/skills/plan`
> **CoveredBy:** `.claude/hooks/tests/suites/review-quality.test.cjs::TC-RVQ-011` · **Status:** Tested

#### TC-RVQ-012: Each person's decision-support mode sets the form of the offer [P1]

**Objective:** Let each person trade the cost of a deeper check against its rigor, and make the offer follow the answer rather than the wording of the request.

**Business Intent / Invariant Guarded:** BR-RVQ-12, BR-RVQ-10 / AC-RVQ-15, AC-RVQ-16, AC-RVQ-17 — for every mode the offer and the mid-session plan question take that mode's form; the rule reaches the assistant once per session whatever the request's wording, and never a helper agent.

**Preconditions:** A session in the main conversation; the team default and the person's own choice may each name a mode.

**Real-World Reachability:** A developer who finds the question intrusive sets suggest for themselves; another who wants every consequential answer reviewed sets auto; the team default stays ask.

**Demo Flow:** Start a session with the default and ask the assistant to investigate and fix a slow page; the session's first reply already carries the ask rule, and the answer that picks a caching approach ends with one question. Set suggest for yourself, start again, and the same answer ends with one line naming the checks instead.

```gherkin
Given a new session whose first request is to investigate, design or fix, not a question for advice
When the request arrives
Then the assistant receives the decision-support rule for the active mode, once for the session
And it receives it again after the conversation is condensed, and never in a helper agent
Given the ask mode, the default
Then a consequential answer ends with one question offering the fitting checks and skip
Given the suggest mode
Then a consequential answer ends with one line naming the checks, and the mid-session plan question becomes one line before the work
Given the auto mode
Then the adversarial review runs on the draft first, and only the decision interview is asked about
And with automatic skill selection restricted, auto acts as ask
Given the off mode
Then no offer is made and no mid-session plan question is asked
And a team default yields to the person's own choice, and an unknown value is ignored
```

**Expected Result:**

| Dimension               | Expectation                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| **UI**                  | One question, one closing line, a reviewed answer, or nothing, per the mode |
| **System behavior**     | The rule arrives once per session and after condensing; never in a helper agent |
| **Business data state** | Not applicable — only the person's own preference is read                    |
| **Data shown on UI**    | The active mode and how to change it, on the first offer of a session        |

**Acceptance Criteria:**

- ✅ Each mode yields its own close and plan-question form; the rule arrives once per session for a request of any wording; the person's choice wins over the team default.
- ❌ A question asked in suggest or off mode, a review started by auto while automatic skill selection is restricted, or the rule reaching a helper agent fails the case.

**Test Data:** Requests to investigate, design and advise; each of the four modes set at the team, personal, checkout and environment layers; an unknown mode value; automatic skill selection on and restricted.

```yaml
inputDomain: 'any session: each of ask, suggest, auto, off or an unknown value at any layer; automatic skill selection on or restricted; a first request of any wording; a condensed conversation; a helper-agent start'
invariant: 'for ALL sessions the rule for exactly the effective mode reaches the main conversation once per session window and never a helper agent, and the offer and the plan question take that mode''s form'
boundaryCounterCase: 'auto with automatic skill selection restricted → the ask form, never a review started unasked'
```

**Edge Cases (boundary counter-case):** Auto while automatic skill selection is restricted acts as ask: the review that nobody named never starts on its own.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/judgement-integrity-route]` · `[Source: operation/scripts/workflow-routing-config]` · `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `constraint/skills/judgement-integrity`
> **CoveredBy:** `.claude/hooks/tests/suites/judgement-integrity-route.test.cjs::TC-JIR-014`; `.claude/hooks/tests/suites/judgement-integrity-route.test.cjs::TC-JIR-015`; `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::TC-WFR-032` · **Status:** Tested

### Invariant / Property Tests

Every rule in §4 is `[HARD]`. Each case above carries its property block under its Test Data; this index names the case that guards each rule.

| Rule | Guarded by |
| --- | --- |
| BR-RVQ-01 | TC-RVQ-001 |
| BR-RVQ-02 | TC-RVQ-002 |
| BR-RVQ-03 | TC-RVQ-003 |
| BR-RVQ-04 | TC-RVQ-004 |
| BR-RVQ-05 | TC-RVQ-005 |
| BR-RVQ-06 | TC-RVQ-006 |
| BR-RVQ-07 | TC-RVQ-007 |
| BR-RVQ-08 | TC-RVQ-008 |
| BR-RVQ-09 | TC-RVQ-010 |
| BR-RVQ-10 | TC-RVQ-009 |
| BR-RVQ-11 | TC-RVQ-011 |
| BR-RVQ-12 | TC-RVQ-012 |

---
