---
module: 'workflows'
service: 'framework.WorkflowExecution'
feature_code: 'GWF'
entities: ['Workflow', 'Step', 'OutcomeGate', 'WorkflowRun', 'DeviationLogEntry', 'SpecBaseline', 'UsageTotal', 'SpendCheckpoint', 'UsageReport']
status: draft
provisional: true
owner: 'Framework maintainers'
last_updated: '2026-09-25'
scope_mode: FRAMEWORK-LIBRARY
large_idea_decomposition: null
roadmap: null
milestone_id: null
scope_brief: null
roadmap_status: null
---

# Guided Workflow Execution — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> Technical identifiers live only in frontmatter, Related Documentation and the Section 8 hidden carriers.

> **DRAFT — provisional spec.** The code has landed for every case except TC-GWF-051 (live replay, still `Planned`). Cases whose executing test passed during implementation carry `Implemented` with the test location; after the release-close full test run, reconcile with `/spec [mode=update]`, flip them to `Tested`, and clear the provisional flag.

## Related Documentation

| Type                  | Path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Description                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Spec Index (derived)  | `docs/specs/WorkflowExecution/INDEX.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Generated navigation catalog for this bucket; refresh through the spec index owner. |
| Routing (sibling)     | `docs/specs/ContextDelivery/README.WorkflowRouting.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Which workflow is chosen and how freely it may start; this spec covers how it runs. |
| Workflow registry     | `.claude/workflows.json`, `.claude/workflows.schema.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Workflow intent, outcome gates, steps and step roles.                               |
| Rule owner            | `.claude/skills/start-workflow/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The one place the step-flex rules are written.                                      |
| Close check           | `.claude/skills/workflow-end/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Outcome-gate evidence check before a run closes.                                    |
| Lean route            | `.claude/skills/workflow-implement-spec/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Route for work whose behavior is already written in a canonical spec.               |
| Scope anchor          | `.claude/skills/plan/SKILL.md`, `.claude/skills/plan-review/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Spec baseline recorded at plan start and traced at plan review.                     |
| Usage reading         | `.claude/hooks/lib/session-usage.cjs`, `.claude/scripts/session-usage-report.cjs`, `.claude/hooks/token-budget-checkpoint.cjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Usage totals, the usage report and the spend checkpoint.                            |
| Session report opener | `.claude/scripts/open-report.cjs`, `.claude/skills/watzup/SKILL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Opens the session report safely (BR-GWF-18).                                        |
| Test suites (planned) | `.claude/hooks/tests/suites/workflow.test.cjs`, `.claude/hooks/tests/suites/content-presence.test.cjs`, `.claude/hooks/tests/suites/scope-guard.test.cjs`, `.claude/hooks/tests/suites/session-usage.test.cjs`, `.claude/hooks/tests/suites/session-usage-report.test.cjs`, `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs`, `.claude/scripts/tests/open-report.test.cjs`, `.claude/hooks/tests/suites/watzup-session-summary.test.cjs` | Executors for Section 8.                                                            |

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

Every workflow states the goal it must reach and the quality results a finished run must prove, and the assistant runs it intent first: the listed steps are recommendations it may skip, merge, simplify or reorder, with a logged reason for each change, as long as every step still follows the steps whose output it needs. Gate steps — tests green for changed behavior, a converged review, a synced spec when behavior changed, a root-cause trace for a bug, and the close — are never flexed, and a run closes only when evidence exists for every quality result. The capability also offers a lean route for work whose behavior is already written in a spec, keeps a plan anchored to the spec as it was supplied, and shows developers what a run costs through an advisory spend checkpoint and a usage report.

---

## 2. Glossary

| Term               | Definition                                                                                                                                              | Context                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Workflow           | A named, ordered list of recommended steps for a kind of request                                                                                        | Declared in the workflow registry                                                             |
| Intent             | One sentence naming the goal a workflow must achieve                                                                                                    | Every workflow has one; the assistant decides step choices against it first                   |
| Outcome Gate       | A quality result a finished run must prove, such as "tests pass" or "review converged"                                                                  | Declared per workflow, with the steps that can satisfy it and an optional condition           |
| Step               | One entry of a workflow: a skill to run, with its arguments                                                                                             | Has exactly one step role                                                                     |
| Step Role          | How freely a step may be flexed: gate, core or optional                                                                                                 | Declared on the step itself; a step with no declared role is core                             |
| Gate Step          | A step that produces an outcome gate's evidence or closes the run                                                                                       | Never skipped, merged away or moved                                                           |
| Core Step          | A step the workflow normally runs                                                                                                                       | May be flexed with a logged reason                                                            |
| Optional Step      | A step that runs only when its run condition holds                                                                                                      | Carries a run condition and a declared skip reason                                            |
| Run Condition      | The plain-language condition under which an optional step runs, for example "a new domain or ambiguous scope"                                           | Evaluated by the assistant from the run's evidence                                            |
| Flex Decision      | The assistant's choice to skip, merge, simplify or reorder core or optional steps in service of the intent                                              | Each one is written to the deviation log with its reason                                      |
| Data Dependency    | A step needs another step's output, for example a review needs the finished change, and a closing review needs the synced spec                          | No flex decision may run a step before a step it depends on                                   |
| Workflow Run       | One execution of a workflow, from its start to its close                                                                                                | Identified by the run identity recorded when it started                                       |
| Run Identity       | The identifier a run receives when it starts                                                                                                            | The only identity of the run; a nested workflow uses its parent's                             |
| Nested Workflow    | A workflow started as one step of another workflow                                                                                                      | Shares the parent run's identity and deviation log                                            |
| Deviation Log      | The run's list of every skipped, merged, simplified or reordered step and every review closed on a report, one line each                                | Also called the skip log; kept under the run identity; read by review and by the usage report |
| Deviation Kind     | The reason category of a deviation log line, from a closed list                                                                                         | See the Deviation Kind enum                                                                   |
| Close              | The final step of a run, which checks outcome-gate evidence before ending the run                                                                       | A gate step, except in a workflow built to run nested (see BR-GWF-01)                         |
| Review Receipt     | A record, made only by a review that looped until converged, that the exact current change was reviewed                                                 | Required later to commit                                                                      |
| Review Report      | The written findings file a review step produced during the run                                                                                         | Accepted at close for the review gate when no receipt exists                                  |
| Lean Route         | A short route for work whose requested behavior is already written in a canonical spec                                                                  | Keeps every gate of the full route                                                            |
| Full Feature Route | The complete feature route, which writes or updates the spec before building                                                                            | Taken when the spec lacks the requested behavior                                              |
| Gap Review         | The lean route's early check of the supplied spec for vague, contradictory or missing behavior                                                          | A finding stops the lean route                                                                |
| Spec Baseline      | The supplied spec's content as it stood when the plan started, stored so it can be read back later                                                      | Plan tasks trace to it, never to a later edit                                                 |
| Proposed Addition  | A requirement found during planning that the spec baseline does not contain                                                                             | Raised as a question for approval, never built silently                                       |
| Usage Total        | The tokens a run adds: new input, cache writes and output, summed over the main session and every sub-agent                                             | The spend checkpoint and every run comparison use it                                          |
| Cache Reads        | Tokens re-read from the prompt cache                                                                                                                    | Reported on their own line; never part of the usage total                                     |
| Sub-agent          | A helper assistant session started by the main session                                                                                                  | Its usage and skill loads count toward the run                                                |
| Response Record    | One saved line of a session record that carries a model response's usage                                                                                | One response may be saved as several records; it counts once                                  |
| Oversized Record   | A single session-record line larger than the reading limit                                                                                              | Skipped, counted and reported                                                                 |
| Spend Checkpoint   | An advisory note shown when the usage total crosses the next threshold                                                                                  | On by default, every 500,000 tokens; can be turned off                                        |
| Usage Report       | A printed summary of a run's usage per agent, tool and skill, optionally compared with a second run                                                     | Developer-facing                                                                              |
| Effective Steps    | The number of skill loads in a run, counted across the main session and every sub-agent                                                                 | The measure of how many steps a run really executed                                           |
| Rule Owner         | The single place where the step-flex rules are written: the workflow starter's instructions, plus the intent and outcome gates in the workflow registry | Every other surface carries at most a one-line pointer                                        |

---

## 3. User Stories & Acceptance Criteria

### US-GWF-01: Step roles and outcome gates are declared data

**As a** framework maintainer
**I want** every step's role and every workflow's outcome gates declared in the workflow registry and validated
**So that** the quality floor is checked by rule, not left to the assistant's memory

**Acceptance Criteria:**

- **AC-GWF-01** — **Given** an optional step without a run condition or without a skip reason **When** the registry is validated **Then** it is rejected
- **AC-GWF-02** — **Given** a gate step that carries a run condition **When** the registry is validated **Then** it is rejected
- **AC-GWF-03** — **Given** an outcome gate naming a satisfying step the workflow does not contain **When** the registry is validated **Then** it is rejected
- **AC-GWF-04** — **Given** a workflow **When** it is read for a run **Then** every step shows its role, a step without a declared role shows core, and the workflow shows its intent and outcome gates
- **AC-GWF-05** — **Given** a step role declared anywhere other than on the step itself **When** the registry is validated **Then** it is rejected, while the same role on the step is accepted

### US-GWF-02: A run closes only on evidence

**As a** developer relying on a workflow
**I want** the close step to refuse to end a run until every outcome gate has evidence
**So that** a skipped test or an unreviewed change cannot pass as done

**Acceptance Criteria:**

- **AC-GWF-06** — **Given** a run missing evidence for any outcome gate **When** it closes **Then** the close refuses and names each missing gate
- **AC-GWF-07** — **Given** a run with changes, no review receipt and a cited review report **When** it closes **Then** it closes without a question, logs the report's location, and states that a commit still needs the receipt; **Given** that report's final verdict is not converged, or it is older than the run's last change **Then** the log line and the close message say so; **Given** neither a receipt nor a cited report **Then** it refuses
- **AC-GWF-08** — **Given** any deviation in a run, including one inside a nested workflow **When** it happens **Then** one line is added to the deviation log kept under the run's identity, and the reviewing steps read that log

### US-GWF-03: A lean route for work the spec already describes

**As a** developer whose requested behavior is already written in a spec
**I want** a short route that still keeps every quality gate
**So that** I do not pay for re-authoring a spec that already exists

**Acceptance Criteria:**

- **AC-GWF-09** — **Given** a request whose behavior is already written in a canonical spec **When** a route is chosen **Then** the lean route fits; **Given** a spec that exists but lacks the requested behavior **Then** the full feature route fits
- **AC-GWF-10** — **Given** the lean route **When** its gap review finds the spec vague, contradictory or missing the requested behavior **Then** the route stops and asks the user to clarify or switch to the full feature route
- **AC-GWF-11** — **Given** the lean route **When** it is read **Then** it keeps the test, review and close gates, runs its optional spec sync before the review, and appears in the routing catalog within the size cap

### US-GWF-04: Plans stay anchored to the spec as supplied

**As a** product owner who supplied a spec
**I want** every plan task to trace to the spec as I supplied it
**So that** new requirements reach me as questions instead of growing the scope silently

**Acceptance Criteria:**

- **AC-GWF-12** — **Given** a plan that implements a supplied spec **When** the plan starts **Then** it records the spec baseline, and every requirement the baseline lacks becomes a proposed addition
- **AC-GWF-13** — **Given** a spec baseline **When** the plan is reviewed **Then** tasks trace to the baseline content even if the spec changed later or was never saved to history; an unreadable or malformed baseline is a named finding with no fallback
- **AC-GWF-14** — **Given** a plan with no supplied spec **When** it is planned **Then** no baseline is recorded and planning behaves as before

### US-GWF-05: An advisory spend checkpoint

**As a** developer running a long workflow
**I want** a short note each time the run's spend crosses a threshold
**So that** I can decide whether to continue before the cost surprises me

**Acceptance Criteria:**

- **AC-GWF-15** — **Given** the usage total, including sub-agents and excluding cache reads, crosses the next threshold at a step boundary **When** the task list changes **Then** one note appears for that threshold and never again
- **AC-GWF-16** — **Given** the checkpoint is turned off, the session record cannot be read, or a note is due **When** the task list changes **Then** the run never stops, nothing appears when off or unreadable, and a note is short and carries only counts

### US-GWF-06: A usage report per run

**As a** framework maintainer comparing routes
**I want** a report of each run's usage per agent, tool and skill, and a comparison of two runs
**So that** route cost decisions rest on measured figures

**Acceptance Criteria:**

- **AC-GWF-17** — **Given** a run with sub-agents and repeated response records **When** it is reported **Then** each response counts once, cache reads print on their own line, and skipped oversized records are counted
- **AC-GWF-18** — **Given** two runs, or one run with a deviation log **When** they are reported **Then** the comparison shows per-figure differences, skill loads sum across sub-agents, and the deviation log shows each step and its reason category only

### US-GWF-07: Intent-first flexible execution

**As a** developer
**I want** the assistant to treat workflow steps as recommendations and decide from the workflow's intent
**So that** a run does only the work that serves the goal while the quality floor never moves

**Acceptance Criteria:**

- **AC-GWF-19** — **Given** any workflow in the registry **When** it is read **Then** it has an intent sentence and its outcome gates, each gate satisfiable by a step the workflow contains
- **AC-GWF-20** — **Given** a run **When** the assistant skips, merges, simplifies or reorders core or optional steps **Then** each change is logged with its reason, and gate steps run unchanged
- **AC-GWF-21** — **Given** any flex decision **When** it is applied **Then** no step runs before a step whose output it needs
- **AC-GWF-22** — **Given** a run that changed behavior **When** it closes **Then** tests covering that behavior ran green in this run, whichever test steps or cases were chosen
- **AC-GWF-23** — **Given** the framework's surfaces **When** they are read **Then** the flex rules are written once in the rule owner, and every other surface carries at most a one-line pointer

### US-GWF-08: The session report opens safely

**As a** developer finishing a workflow run
**I want** the run's session report opened for me only when it is safe to open
**So that** reading the summary is one step, and a file left in the work area can never run as a program

**Acceptance Criteria:**

- **AC-GWF-24** — **Given** a path to open **When** the session report is opened **Then** only an existing report file inside the project's temporary work area opens, judged on the real file after following links; any other location, any non-report file type, and any path the command line would reinterpret is refused, and nothing runs
- **AC-GWF-25** — **Given** continuous integration, auto-open turned off, or a Linux machine without a display **When** the session report is ready **Then** nothing opens and the path is printed; **Given** the viewer cannot start **Then** the run continues and the path is printed

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                                                    | Category     | Enforcement |
| --------- | ----------------------------------------------------------------------- | ------------ | ----------- |
| BR-GWF-01 | Gate steps are never skipped, merged away or reordered                  | Quality      | [HARD]      |
| BR-GWF-02 | Optional steps run only when their condition holds; each skip is logged | Execution    | [HARD]      |
| BR-GWF-03 | The close requires evidence for every outcome gate                      | Quality      | [HARD]      |
| BR-GWF-04 | The lean route escalates on a vague or contradictory spec               | Routing      | [HARD]      |
| BR-GWF-05 | Plan tasks trace to the frozen spec baseline                            | Scope        | [HARD]      |
| BR-GWF-06 | The spend checkpoint is advisory, once per threshold, and can be off    | Visibility   | [SOFT]      |
| BR-GWF-07 | Usage totals include sub-agents                                         | Visibility   | [HARD]      |
| BR-GWF-08 | One run identity owns the deviation log                                 | Traceability | [HARD]      |
| BR-GWF-09 | Route by whether the spec already contains the requested behavior       | Routing      | [HARD]      |
| BR-GWF-10 | Each model response counts once                                         | Visibility   | [HARD]      |
| BR-GWF-11 | Reading usage finishes with bounded memory                              | Visibility   | [HARD]      |
| BR-GWF-12 | Every workflow declares its intent and outcome gates                    | Quality      | [HARD]      |
| BR-GWF-13 | Core and optional steps flex with a logged reason                       | Execution    | [HARD]      |
| BR-GWF-14 | Every flex decision keeps data dependencies                             | Execution    | [HARD]      |
| BR-GWF-15 | Test choice flexes; the test outcome does not                           | Quality      | [HARD]      |
| BR-GWF-16 | One owner for the flex rules                                            | Consistency  | [HARD]      |
| BR-GWF-17 | Usage output shows counts, never content                                | Privacy      | [HARD]      |
| BR-GWF-18 | The session report opens only a report file from the work area          | Safety       | [HARD]      |

### BR-GWF-01: Gate steps are fixed [HARD]

**Statement:** A gate step is never skipped, merged into another step, simplified away or moved ahead of a step it depends on. Every workflow's close step is a gate, with one exception: a workflow built to run nested inside another (the change-review workflow) closes only when it runs on its own, so its close is optional and is skipped when nested — the parent's close closes the run. The gate outcomes are: tests pass for changed behavior, the review converged, the spec is synced when behavior or a public contract changed, a bug has a root-cause trace, and the run closes. Every outcome gate that always applies is produced by at least one gate step; other satisfying steps may be core. A gate step carries no run condition; a gate that applies only sometimes expresses that through its outcome gate's condition, and may be produced by an optional step whose run condition states the same trigger — for example the root-cause investigation that runs only when a verify run reported a failing test.

```
IF step role = gate
  → run it as declared; REJECT any skip, merge or reorder of it
IF a gate step carries a run condition
  → REJECT at validation: "A gate step cannot carry a run condition."
IF an outcome gate always applies AND no gate step satisfies it
  → REJECT at validation: the gate has no gate step
```

### BR-GWF-02: Optional steps follow their condition [HARD]

**Statement:** An optional step declares a run condition and a skip reason. When the condition is false the step is skipped and the deviation log records the step, the "condition false" category and the declared reason. When the condition holds the step is recommended like a core step and may still be flexed under BR-GWF-13. An optional step missing either field fails validation.

| Run condition declared | Skip reason declared | Validation | At run time, condition false |
| ---------------------- | -------------------- | ---------- | ---------------------------- |
| No                     | any                  | REJECT     | —                            |
| Yes                    | No                   | REJECT     | —                            |
| Yes                    | Yes                  | ALLOW      | skipped and logged           |

### BR-GWF-03: The close requires outcome-gate evidence [HARD]

**Statement:** Before a run closes, the close step checks every outcome gate that applies to the run and refuses to close when any evidence is missing, naming each missing gate.

| Outcome gate      | Accepted evidence                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests pass        | The test command run in this run and its passing result, covering the changed behavior                                                                                                                  |
| Review converged  | No change to review; or a review receipt over the current change; or, without a receipt, the cited review report written by a step that satisfies the review gate. A skip record alone is not a receipt |
| Spec synced       | The spec change made in this run, or a "no behavior change" statement with the size of the change                                                                                                       |
| Plan approved     | The recorded approval of the plan                                                                                                                                                                       |
| Root cause traced | The cited root-cause trace for the bug                                                                                                                                                                  |

Closing the review gate on a report never blocks and never asks the user: the close adds a deviation log line of the "closed on review report" category with the report's location, and states that a commit will still need a review receipt. The close also reads the report's final verdict and compares its time with the run's last change-making step: when the verdict is not converged, or the report is older than that step, the log line and the close message say so, so a weak review is visible instead of silent. If the receipt check itself fails, the close refuses. If the receipt check cannot run on the host, the cited report is the evidence, recorded the same way, and the close says so.

```
IF any applicable outcome gate lacks accepted evidence
  → REJECT close: "Missing evidence: {gate list}."
ELSE
  → close the run
```

### BR-GWF-04: The lean route escalates [HARD]

**Statement:** When the lean route's gap review finds the supplied spec vague or contradictory, or finds that the requested behavior is not in it, the route stops before planning and asks the user to clarify the spec or switch to the full feature route, which updates the spec first. It never guesses the missing behavior and never drops it silently.

### BR-GWF-05: Plans trace to the frozen spec baseline [HARD]

**Statement:** When a plan implements a supplied spec, the plan records a spec baseline — the spec's content as supplied, stored so it stays readable after later edits, even if the spec was never saved to history. Plan review traces every task to the baseline content, not to a spec edited later in the same run. A requirement the baseline lacks goes to a "proposed additions (need approval)" list and becomes a question, never a planned task. A baseline reference that is malformed, or whose content cannot be read back, is the named finding "baseline unrecoverable" — plan review never falls back to the current spec. With no supplied spec, planning is unchanged.

| Spec supplied | Baseline readable | Task traces to baseline      | Outcome                         |
| ------------- | ----------------- | ---------------------------- | ------------------------------- |
| No            | —                 | —                            | unchanged planning              |
| Yes           | Yes               | Yes                          | task accepted                   |
| Yes           | Yes               | No, not an approved addition | finding: untraced task          |
| Yes           | No                | —                            | finding: baseline unrecoverable |

### BR-GWF-06: The spend checkpoint is advisory [SOFT]

**Statement:** At each step boundary — the moments the task list is created or updated — the checkpoint compares the usage total with the next multiple of the threshold (500,000 tokens by default). Each threshold crossed produces exactly one note; a threshold already noted never produces a second. The usage total counts only the tokens the run adds: new input, cache writes and output. Cache reads are reported elsewhere and never count toward a threshold. The note never blocks, fails open when the session record cannot be read, stays at most 600 characters, and shows no note and reads nothing when turned off.

### BR-GWF-07: Usage includes sub-agents [HARD]

**Statement:** Usage totals and skill-load counts sum the main session and every sub-agent of the run. A run with no sub-agents reports the main session alone.

### BR-GWF-08: One run identity owns the deviation log [HARD]

**Statement:** Each run keeps its deviation log (the skip log) under the identity recorded when the run started. There is no second run identity. A nested workflow writes to its parent run's log. A run identity outside the allowed character set, or one that points outside the run area, is refused before anything is read.

### BR-GWF-09: Route by specified behavior [HARD]

**Statement:** Work whose requested behavior is already written in a canonical spec takes the lean route. When a spec exists but does not contain the requested behavior, the work takes the full feature route, which updates the spec first. The lean route is never chosen just because a spec file exists. The lean route is listed in the routing catalog like every other workflow.

### BR-GWF-10: Each response counts once [HARD]

**Statement:** Records that repeat one model response — the same message and the same request — count once, and the last record's usage wins. The usage total is the non-cached sum of BR-GWF-06; cache reads are reported as their own figure.

### BR-GWF-11: Bounded usage reading [HARD]

**Statement:** Reading usage always finishes and never holds more than a fixed amount in memory. A single record too large to read is skipped; the skip is counted and reported, never silent. A later read of an unchanged session record reads nothing new, and a read after growth reads only what was added.

### BR-GWF-12: Every workflow declares intent and outcome gates [HARD]

**Statement:** Every workflow in the registry declares one intent sentence and its outcome gates. Each outcome gate names at least one satisfying step the workflow contains, and a gate that applies only sometimes names its condition — for example "spec synced" applies when behavior or a public contract changed. A workflow that contains a test-running step declares "tests pass"; one that contains a review of the run's changes declares "review converged"; one that fixes a bug declares "root cause traced". Declaring roles and gates never adds or removes a step.

### BR-GWF-13: Core and optional steps flex with a logged reason [HARD]

**Statement:** The listed steps are recommendations. Intent first, the assistant may skip, merge, simplify or reorder core and optional steps, provided every applicable outcome gate is still satisfied and BR-GWF-14 holds. Every such decision adds one deviation log line naming the step, the deviation kind and a short reason. Gate steps are outside this freedom (BR-GWF-01).

| Step role | Skip            | Merge / simplify | Reorder                            |
| --------- | --------------- | ---------------- | ---------------------------------- |
| gate      | never           | never            | never                              |
| core      | allowed, logged | allowed, logged  | allowed, logged, dependencies kept |
| optional  | allowed, logged | allowed, logged  | allowed, logged, dependencies kept |

### BR-GWF-14: Flex decisions keep data dependencies [HARD]

**Statement:** No flex decision runs a step before a step whose output it needs. The standing dependencies are: a change is made before it is reviewed and before its tests run; the spec sync runs before the review that checks it; and the close runs last. A reorder or merge that would break one of these is not allowed.

### BR-GWF-15: Test choice flexes; the test outcome does not [HARD]

**Statement:** "Tests are recommendations" covers only which test steps and which test cases run. Whatever is chosen, every behavior the run changed is covered by tests that ran green in this run before it closes. A flex decision that would leave changed behavior untested or failing is not allowed, and a failing test is investigated before either the test or the behavior changes.

### BR-GWF-16: One owner for the flex rules [HARD]

**Statement:** The flex rules are written in one place, the rule owner: the workflow starter's instructions, together with each workflow's intent, outcome gates and step roles in the registry. A step's role is declared only on the step. Workflow descriptions, wrappers and runtime helpers carry at most a one-line pointer to the rule owner, never a copy of the rules.

### BR-GWF-17: Usage output shows counts, never content [HARD]

**Statement:** The usage report, the spend checkpoint note and the printed deviation log show only token counts, the skipped-record count, agent labels, tool names, skill names in the allowed form (any other name prints as "other"), step identifiers and deviation kinds. They never show message text, command text, task subjects or the free-text evidence of a deviation log line. A deviation log line whose kind is not in the closed list prints as an invalid line.

### BR-GWF-18: The session report opens safely [HARD]

**Statement:** Every workflow ends with a session summary whose written report may be opened in the developer's default viewer. The opener opens only an existing file inside the project's temporary work area (the `tmp` or `temp` folder at the project root), judged on the real file after following links. It opens only report types a viewer displays — a web page, markdown, plain text, PDF, an image or JSON, in any letter case — and refuses every other type, including scripts and program launchers. A path containing characters the platform's command line would reinterpret is refused. Nothing is opened in continuous integration, when auto-open is turned off, or on a Linux machine without a display. In every case the path is printed, and a refusal or a failure to open never stops the run.

```
IF the file is missing, or lies outside the temporary work area after following links
  → REFUSE: "not opened (<reason>)"; print the path
IF the file is not a report type
  → REFUSE: "not opened (unsupported report type)"; nothing runs
IF the path holds characters the command line would reinterpret
  → REFUSE; nothing runs
IF continuous integration, auto-open off, or no display on Linux
  → open nothing; print the path
ELSE
  → open with the platform's default viewer; a launch failure is reported, never fatal
```

---

## 5. Domain Model

### Relationships (overview)

```
Workflow       1──N Step              (ordered recommendations)
Workflow       1──N OutcomeGate       (quality results a finished run must prove)
OutcomeGate    N──N Step              (satisfying steps, all inside the workflow)
Workflow       1──N WorkflowRun
WorkflowRun    1──N DeviationLogEntry (one per deviation)
WorkflowRun    1──N WorkflowRun       (nested runs share the parent's identity)
WorkflowRun    1──0..1 SpecBaseline   (when a spec was supplied to the plan)
WorkflowRun    1──1 UsageTotal        (main session plus sub-agents)
WorkflowRun    1──N SpendCheckpoint   (at most one per threshold)
```

### Entity: Workflow

| Property      | Type                | Required | Constraints                                                                    | Business Meaning                        |
| ------------- | ------------------- | -------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| Name          | text                | Yes      | Unique                                                                         | What the assistant and the user call it |
| Intent        | text                | Yes      | One sentence                                                                   | The goal every step choice serves first |
| Outcome gates | list of OutcomeGate | Yes      | Each satisfiable by a contained step                                           | What a finished run must prove          |
| Steps         | list of Step        | Yes      | At least one; the close step is a gate (nested-only close excepted, BR-GWF-01) | The recommended order of work           |

### Entity: Step

| Property      | Type          | Required            | Constraints                                  | Business Meaning                    |
| ------------- | ------------- | ------------------- | -------------------------------------------- | ----------------------------------- |
| Identifier    | text          | Yes                 | Unique within the workflow                   | Names the step in the deviation log |
| Skill         | text          | Yes                 | An existing skill                            | The work the step does              |
| Role          | enum StepRole | No                  | Declared only on the step; absent means core | How freely the step may be flexed   |
| Run condition | text          | Optional steps only | Required for optional, forbidden for gate    | When an optional step runs          |
| Skip reason   | text          | Optional steps only | Required for optional                        | Logged when the condition is false  |

### Entity: OutcomeGate

| Property         | Type                 | Required | Constraints                         | Business Meaning                     |
| ---------------- | -------------------- | -------- | ----------------------------------- | ------------------------------------ |
| Kind             | enum OutcomeGateKind | Yes      | Closed list                         | Which quality result is required     |
| Satisfying steps | list of text         | Yes      | Each is a step of the same workflow | Which steps produce the evidence     |
| Condition        | text                 | No       | —                                   | When the gate applies, if not always |

### Entity: WorkflowRun

| Property     | Type   | Required | Constraints                                                             | Business Meaning         |
| ------------ | ------ | -------- | ----------------------------------------------------------------------- | ------------------------ |
| Run identity | text   | Yes      | Recorded at start; safe characters only; nested runs reuse the parent's | The one name of the run  |
| Closed       | yes-no | Yes      | Yes only with evidence for every applicable outcome gate                | Whether the run finished |

### Entity: DeviationLogEntry

| Property        | Type               | Required | Constraints                  | Business Meaning                    |
| --------------- | ------------------ | -------- | ---------------------------- | ----------------------------------- |
| Step identifier | text               | Yes      | A step of the run's workflow | Which step deviated                 |
| Kind            | enum DeviationKind | Yes      | Closed list                  | Why, as a category                  |
| Evidence        | text               | Yes      | Short note; never printed    | The run-specific reason or location |

### Entity: SpecBaseline

| Property       | Type | Required | Constraints                                           | Business Meaning                        |
| -------------- | ---- | -------- | ----------------------------------------------------- | --------------------------------------- |
| Spec location  | text | Yes      | The supplied spec                                     | Which spec the plan implements          |
| Content anchor | text | Yes      | Full-length content identifier; nothing else accepted | Reads back the spec exactly as supplied |

### Entity: UsageTotal

| Property        | Type   | Required | Constraints                       | Business Meaning                            |
| --------------- | ------ | -------- | --------------------------------- | ------------------------------------------- |
| New input       | number | Yes      | Each response once                | Input tokens not served from the cache      |
| Cache writes    | number | Yes      | Each response once                | Tokens written to the prompt cache          |
| Output          | number | Yes      | Each response once                | Tokens the model produced                   |
| Cache reads     | number | Yes      | Never part of the total           | Tokens re-read from the prompt cache        |
| Total           | number | Yes      | New input + cache writes + output | What the run added; the checkpoint metric   |
| Skipped records | number | Yes      | At least 0                        | How many oversized records were not counted |

### Entity: SpendCheckpoint

| Property        | Type   | Required | Constraints             | Business Meaning                    |
| --------------- | ------ | -------- | ----------------------- | ----------------------------------- |
| Enabled         | yes-no | Yes      | On by default           | Whether notes appear                |
| Threshold       | number | Yes      | 500,000 by default      | Spend between two notes             |
| Last noted      | number | Yes      | Only increases          | The highest threshold already noted |
| Completed steps | number | Yes      | From task statuses only | Progress shown in the note          |

### Enum: StepRole

| Value    | Meaning                                                                |
| -------- | ---------------------------------------------------------------------- |
| gate     | Produces outcome-gate evidence or closes the run; never flexed         |
| core     | Normally run; may be flexed with a logged reason                       |
| optional | Runs only when its condition holds; may be flexed with a logged reason |

### Enum: OutcomeGateKind

| Value             | Meaning                                                        |
| ----------------- | -------------------------------------------------------------- |
| Tests pass        | Changed behavior is covered by tests that ran green in the run |
| Review converged  | The change was reviewed until no open finding remained         |
| Spec synced       | The spec matches the changed behavior (conditional)            |
| Plan approved     | The plan was approved before building                          |
| Root cause traced | A bug's cause was traced to its owner before the fix           |

### Enum: DeviationKind

| Value                     | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| Condition false           | An optional step's run condition was false; its declared reason applies |
| Pre-authorized            | The workflow's own conditional instructions authorized the skip         |
| Not needed for the intent | A core or optional step was skipped because the intent did not need it  |
| Merged                    | The step's work was done inside another step                            |
| Simplified                | The step ran in a lighter form                                          |
| Reordered                 | The step ran at another position, dependencies kept                     |
| Closed on review report   | The review gate closed on a cited report instead of a receipt           |

### Domain Events (business occurrences)

| Occurrence            | When it happens                                     | Who/what reacts (business outcome)              |
| --------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Run started           | A workflow is activated                             | The run identity is recorded                    |
| Step deviated         | The assistant skips, merges, simplifies or reorders | A deviation log line is added                   |
| Close refused         | Evidence is missing for an outcome gate             | The assistant is told which gates lack evidence |
| Scope question raised | A plan finds a requirement the baseline lacks       | The user is asked to approve or decline it      |
| Threshold crossed     | The usage total passes the next threshold           | One advisory note appears                       |

---

## 6. Process Flows

> No screen exists: the interaction surface is the text the assistant receives, the run's deviation log, the registry validation messages and command output. Backend-only capability; the view inventory is skipped for that reason.

### Flow: Run a workflow intent first

| Step | Actor     | Action                                                | System Response                                                   | Next |
| ---- | --------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ---- |
| 1    | Assistant | Activates a workflow                                  | Run identity recorded; intent, outcome gates and step roles shown | 2    |
| 2    | Assistant | Decides each step against the intent                  | Gate steps kept (BR-GWF-01); others may flex (BR-GWF-13)          | 3    |
| 3    | Assistant | Skips, merges, simplifies or reorders a non-gate step | Deviation log line added; dependencies kept (BR-GWF-14)           | 4    |
| 4    | Assistant | Chooses the test steps and cases                      | Changed behavior must still be tested green (BR-GWF-15)           | 5    |
| 5    | Assistant | Runs the close step                                   | Evidence checked for every outcome gate (BR-GWF-03)               | end  |

### Flow: Close a run

| Step | Actor  | Action                                      | System Response                                                                                                       | Next      |
| ---- | ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| 1    | System | Checks each applicable outcome gate         | Collects evidence                                                                                                     | 2         |
| 2    | System | Review gate without a receipt, report cited | Adds a "closed on review report" line, naming a not-converged or stale report; notes a commit still needs the receipt | 3         |
| 3    | System | Any gate without evidence                   | Refuses and names the gates                                                                                           | back to 1 |
| 4    | System | All gates evidenced                         | Run closes                                                                                                            | end       |

### Flow: Lean route

| Step | Actor     | Action                                                             | System Response                                                     | Next     |
| ---- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | -------- |
| 1    | Assistant | Routes a request whose behavior is in the spec                     | Lean route (BR-GWF-09)                                              | 2        |
| 2    | Assistant | Runs the gap review                                                | Vague, contradictory or missing behavior → stop and ask (BR-GWF-04) | 3 or end |
| 3    | Assistant | Plans against the spec baseline                                    | New requirements become questions (BR-GWF-05)                       | 4        |
| 4    | Assistant | Builds, syncs the spec if behavior differs, tests, reviews, closes | Same gates as the full route                                        | end      |

### Flow: Spend checkpoint and usage report

| Step | Actor     | Action                           | System Response                                                        | Next |
| ---- | --------- | -------------------------------- | ---------------------------------------------------------------------- | ---- |
| 1    | Assistant | Updates the task list            | Usage total read for new records only (BR-GWF-10, BR-GWF-11)           | 2    |
| 2    | System    | Total crosses the next threshold | One advisory note with counts only (BR-GWF-06, BR-GWF-17)              | 3    |
| 3    | Developer | Asks for the usage report        | Totals per agent, tools, skill loads and the deviation log (BR-GWF-07) | end  |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create | Edit | Delete | Scope                                                              |
| -------------------- | :--: | :----: | :--: | :----: | ------------------------------------------------------------------ |
| Framework maintainer | yes  |  yes   | yes  |  yes   | Workflow intent, outcome gates, step roles and the rule owner      |
| Project maintainer   | yes  |   no   | yes  |   no   | Turns the spend checkpoint on or off and sets its threshold        |
| Developer            | yes  |   no   |  no  |   no   | Reads the deviation log, the checkpoint notes and the usage report |
| AI assistant         | yes  |  yes   |  no  |   no   | Adds deviation log lines; flexes only core and optional steps      |
| Product owner        | yes  |   no   |  no  |   no   | Answers proposed additions and escalation questions                |

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a developer, a framework maintainer or the AI assistant; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: the IDs were pre-allocated by the release plan so implementation phases could reference them in parallel; categories below group them by behavior rather than by decade. TC-GWF-057…062 were added for intent-first flexible execution, TC-GWF-063…067 for the session report opener (BR-GWF-18), and TC-GWF-068 for the order of a clean-up rewrite (BR-GWF-14).

> Size note: this spec holds more than forty cases. It stays one document because every case guards one capability — how a workflow run executes and what it costs — and the pre-allocated IDs are referenced by the implementation plan; a split into a continuation part is a follow-up for the spec owner.

> Status note: `Implemented` = the executing test (or recorded dry run) exists and passed while the capability was built, but has not yet run in the release-close full test run; it becomes `Tested` after that run. `Planned` = not built yet.

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 18     | 16        | 2      |
| P1        | 42     | 41        | 1      |
| P2        | 8      | 8         | 0      |
| **Total** | **68** | **65**    | **3**  |

| Category                  | TCs                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step Role and Gate Tests  | TC-GWF-001, TC-GWF-002, TC-GWF-003, TC-GWF-004, TC-GWF-005, TC-GWF-052, TC-GWF-006, TC-GWF-007, TC-GWF-008, TC-GWF-009, TC-GWF-010, TC-GWF-041, TC-GWF-042 |
| Workflow Annotation Tests | TC-GWF-011, TC-GWF-012, TC-GWF-013, TC-GWF-014, TC-GWF-015, TC-GWF-016                                                                                     |
| Intent-First Flex Tests   | TC-GWF-057, TC-GWF-058, TC-GWF-059, TC-GWF-060, TC-GWF-061, TC-GWF-062, TC-GWF-068                                                                         |
| Lean Route Tests          | TC-GWF-017, TC-GWF-018, TC-GWF-019, TC-GWF-020, TC-GWF-021, TC-GWF-022, TC-GWF-043, TC-GWF-044, TC-GWF-051                                                 |
| Scope Guard Tests         | TC-GWF-023, TC-GWF-024, TC-GWF-025, TC-GWF-026, TC-GWF-027, TC-GWF-045, TC-GWF-046                                                                         |
| Usage Reading Tests       | TC-GWF-028, TC-GWF-029, TC-GWF-030, TC-GWF-047, TC-GWF-048, TC-GWF-049, TC-GWF-056                                                                         |
| Usage Report Tests        | TC-GWF-031, TC-GWF-032, TC-GWF-033, TC-GWF-054                                                                                                             |
| Spend Checkpoint Tests    | TC-GWF-034, TC-GWF-035, TC-GWF-036, TC-GWF-037, TC-GWF-038, TC-GWF-039, TC-GWF-040, TC-GWF-050, TC-GWF-053, TC-GWF-055                                     |
| Session Report Tests      | TC-GWF-063, TC-GWF-064, TC-GWF-065, TC-GWF-066, TC-GWF-067                                                                                                 |

### Planned Executors

| Executor                                                       | TCs                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/hooks/tests/suites/workflow.test.cjs`                 | TC-GWF-001, TC-GWF-002, TC-GWF-003, TC-GWF-004, TC-GWF-005, TC-GWF-011, TC-GWF-012, TC-GWF-013, TC-GWF-014, TC-GWF-015, TC-GWF-017, TC-GWF-018, TC-GWF-022, TC-GWF-043, TC-GWF-044, TC-GWF-052, TC-GWF-057, TC-GWF-061, TC-GWF-062, TC-GWF-068 |
| `.claude/hooks/tests/suites/content-presence.test.cjs`         | TC-GWF-006, TC-GWF-007, TC-GWF-010, TC-GWF-019, TC-GWF-020, TC-GWF-041, TC-GWF-042, TC-GWF-044, TC-GWF-058, TC-GWF-059, TC-GWF-060                                                                                                 |
| Manual-QC (dry run or live replay)                             | TC-GWF-008, TC-GWF-009, TC-GWF-041, TC-GWF-051, TC-GWF-058                                                                                                                                                                         |
| `.claude/hooks/tests/suites/review-commit-gate.test.cjs`       | TC-GWF-042                                                                                                                                                                                                                         |
| `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs` | TC-GWF-016                                                                                                                                                                                                                         |
| `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs`  | TC-GWF-021                                                                                                                                                                                                                         |
| `.claude/hooks/tests/suites/scope-guard.test.cjs`              | TC-GWF-023, TC-GWF-024, TC-GWF-025, TC-GWF-026, TC-GWF-027, TC-GWF-045, TC-GWF-046                                                                                                                                                 |
| `.claude/hooks/tests/suites/session-usage.test.cjs`            | TC-GWF-028, TC-GWF-029, TC-GWF-030, TC-GWF-047, TC-GWF-048, TC-GWF-049, TC-GWF-056                                                                                                                                                 |
| `.claude/hooks/tests/suites/session-usage-report.test.cjs`     | TC-GWF-031, TC-GWF-032, TC-GWF-033, TC-GWF-054                                                                                                                                                                                     |
| `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs`  | TC-GWF-034, TC-GWF-035, TC-GWF-036, TC-GWF-037, TC-GWF-038, TC-GWF-039, TC-GWF-040, TC-GWF-050, TC-GWF-053, TC-GWF-055                                                                                                             |
| `.claude/scripts/tests/open-report.test.cjs`                   | TC-GWF-063, TC-GWF-064, TC-GWF-065, TC-GWF-066                                                                                                                                                                                     |
| `.claude/hooks/tests/suites/watzup-session-summary.test.cjs`   | TC-GWF-067                                                                                                                                                                                                                         |

### Rule Coverage

| Rule      | Proven by                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------- |
| BR-GWF-01 | TC-GWF-002, TC-GWF-006, TC-GWF-010, TC-GWF-013, TC-GWF-017, TC-GWF-058, TC-GWF-062             |
| BR-GWF-02 | TC-GWF-001, TC-GWF-008, TC-GWF-014, TC-GWF-018                                                 |
| BR-GWF-03 | TC-GWF-007, TC-GWF-009, TC-GWF-042                                                             |
| BR-GWF-04 | TC-GWF-019, TC-GWF-044, TC-GWF-051                                                             |
| BR-GWF-05 | TC-GWF-020, TC-GWF-023, TC-GWF-024, TC-GWF-025, TC-GWF-026, TC-GWF-027, TC-GWF-045, TC-GWF-046 |
| BR-GWF-06 | TC-GWF-034, TC-GWF-035, TC-GWF-036, TC-GWF-037, TC-GWF-038, TC-GWF-039, TC-GWF-053, TC-GWF-055 |
| BR-GWF-07 | TC-GWF-028, TC-GWF-030, TC-GWF-040, TC-GWF-054                                                 |
| BR-GWF-08 | TC-GWF-008, TC-GWF-010, TC-GWF-033, TC-GWF-041                                                 |
| BR-GWF-09 | TC-GWF-017, TC-GWF-021, TC-GWF-022, TC-GWF-043, TC-GWF-044, TC-GWF-051                         |
| BR-GWF-10 | TC-GWF-028, TC-GWF-029, TC-GWF-031, TC-GWF-047                                                 |
| BR-GWF-11 | TC-GWF-048, TC-GWF-049, TC-GWF-056                                                             |
| BR-GWF-12 | TC-GWF-003, TC-GWF-004, TC-GWF-005, TC-GWF-011, TC-GWF-012, TC-GWF-016, TC-GWF-057, TC-GWF-062 |
| BR-GWF-13 | TC-GWF-006, TC-GWF-058                                                                         |
| BR-GWF-14 | TC-GWF-018, TC-GWF-059, TC-GWF-068                                                             |
| BR-GWF-15 | TC-GWF-007, TC-GWF-060                                                                         |
| BR-GWF-16 | TC-GWF-015, TC-GWF-052, TC-GWF-061                                                             |
| BR-GWF-17 | TC-GWF-032, TC-GWF-033, TC-GWF-050                                                             |
| BR-GWF-18 | TC-GWF-063, TC-GWF-064, TC-GWF-065, TC-GWF-066, TC-GWF-067                                     |

### Step Role and Gate Tests

> Registry validation of step roles, and the runner and close contracts (US-GWF-01, US-GWF-02).

#### TC-GWF-001: An optional step without a run condition is rejected [P1]

**Objective:** Prove that the registry refuses an optional step that does not say when it runs.

**Business Intent / Invariant Guarded:** An optional step can only be skipped for a stated reason; without its condition the skip would be arbitrary (BR-GWF-02).

**Traces:** AC-GWF-01 / BR-GWF-02

**Preconditions:**

- A registry with one workflow whose optional step lacks a run condition

**Real-World Reachability:** A maintainer annotates a step as optional and forgets its condition.

**Demo Flow:** Validate the registry and read the message.

```gherkin
Given a workflow with an optional step and no run condition
When the registry is validated
Then validation fails and names the step
And the same step with a run condition and a skip reason validates
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Rejects the registry                                                                                                                                                               |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | A validation message naming the step                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Optional step with condition and skip reason accepted
- ❌ Optional step without a condition accepted
- ❌ Optional step without a skip reason accepted

**Test Data:**

```yaml
inputDomain: 'any optional step'
invariant: 'for ALL optional steps a run condition and a skip reason are present, or validation fails'
boundaryCounterCase: 'the same step with the skip reason removed → rejected'
```

**Edge Cases:**

- A run condition of only spaces → treated as missing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/optional-step]`
> **Related Behaviors:** `rule/workflows/optional-step`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-001` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:362` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-002: A gate step with a run condition is rejected [P0]

**Objective:** Prove that no gate step can be made conditional through the step itself.

**Business Intent / Invariant Guarded:** Gate steps are never skipped; a condition on one would reopen the quality floor (BR-GWF-01).

**Traces:** AC-GWF-02 / BR-GWF-01

**Preconditions:**

- A registry with a gate step that carries a run condition

**Real-World Reachability:** A maintainer copies an optional step block onto a review step.

**Demo Flow:** Validate the registry and read the message.

```gherkin
Given a gate step with a run condition
When the registry is validated
Then validation fails with "A gate step cannot carry a run condition."
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Rejects the registry                                                                                                                                                               |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The validation message                                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Gate step without a condition accepted
- ❌ Gate step with a condition accepted

**Test Data:**

```yaml
inputDomain: 'any gate step in any workflow'
invariant: 'for ALL gate steps no run condition is present'
boundaryCounterCase: 'a gate step with an empty condition object → rejected'
```

**Edge Cases:**

- A conditional gate is expressed on the outcome gate instead → accepted (TC-GWF-012)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/gate-step]`
> **Related Behaviors:** `rule/workflows/gate-step`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-002` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:376` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-003: An outcome gate naming a step outside the workflow is rejected [P1]

**Objective:** Prove that every outcome gate can be satisfied by a step the workflow actually contains.

**Business Intent / Invariant Guarded:** A gate no step can satisfy would make every close impossible or meaningless (BR-GWF-12).

**Traces:** AC-GWF-03 / BR-GWF-12

**Preconditions:**

- A workflow whose "tests pass" gate names a test step it does not contain

**Real-World Reachability:** A maintainer removes a step and leaves the gate pointing at it.

**Demo Flow:** Validate the registry.

```gherkin
Given an outcome gate whose satisfying step is not in the workflow
When the registry is validated
Then validation fails naming the gate and the missing step
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Rejects the registry                                                                                                                                                               |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The gate and the missing step                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Gate with contained satisfying steps accepted
- ❌ Gate naming an absent step accepted

**Test Data:**

```yaml
inputDomain: 'any outcome gate of any workflow'
invariant: 'for ALL gates every satisfying step is a step of the same workflow'
boundaryCounterCase: 'one satisfying step absent → rejected'
```

**Edge Cases:**

- A gate with two satisfying steps, one absent → rejected

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/outcome-gate]`
> **Related Behaviors:** `rule/workflows/outcome-gate`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-003` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:394` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-004: Reading a workflow shows every step role and the workflow gates [P1]

**Objective:** Prove that the run starter receives step roles, the intent and the outcome gates.

**Business Intent / Invariant Guarded:** The assistant can only honor roles and gates it is shown (BR-GWF-12).

**Traces:** AC-GWF-04 / BR-GWF-12

**Preconditions:**

- An annotated workflow

**Real-World Reachability:** Every workflow activation reads the workflow first.

**Demo Flow:** Read the workflow for a run and inspect the result.

```gherkin
Given an annotated workflow
When it is read for a run
Then each step carries its role
And the workflow carries its intent and outcome gates
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Returns roles, intent and gates                                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Role per step; intent; gates with satisfying steps and conditions                                                                                                                  |

**Acceptance Criteria:**

- ✅ Roles, intent and gates present
- ❌ Any of them missing

**Edge Cases:**

- A workflow mixing plain and annotated steps → both forms read

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/workflows/read-workflow-entry]`
> **Related Behaviors:** `operation/workflows/read-workflow-entry`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-004` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:422` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-005: A step with no declared role reads as core [P1]

**Objective:** Prove that unannotated steps keep today's behavior.

**Business Intent / Invariant Guarded:** Adding roles changes nothing for steps nobody annotated (BR-GWF-12).

**Traces:** AC-GWF-04 / BR-GWF-12

**Preconditions:**

- A step with no role

**Real-World Reachability:** A project workflow written before roles existed.

**Demo Flow:** Read the workflow.

```gherkin
Given a step with no declared role
When the workflow is read
Then the step's role is core
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Defaults the role                                                                                                                                                                  |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | core                                                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Default core
- ❌ Default optional or gate

**Edge Cases:**

- A plain step written by name only → core

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/default-role]`
> **Related Behaviors:** `rule/workflows/default-role`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-005` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:462` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-052: A step role is accepted only on the step itself [P1]

**Objective:** Prove that the role has one owner, the step, and cannot also be set in the step's runtime hints.

**Business Intent / Invariant Guarded:** Two places for one fact drift apart; the role and the run condition are checked together on one object (BR-GWF-16).

**Traces:** AC-GWF-05 / BR-GWF-16

**Preconditions:**

- A workflow whose runtime hints for a step carry a role

**Real-World Reachability:** A maintainer puts the role next to the execution hints by mistake.

**Demo Flow:** Validate the registry twice: role in the hints, then role on the step.

```gherkin
Given a role in a step's runtime hints
When the registry is validated
Then it is rejected as an unknown hint
And the same role on the step is accepted
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Rejects the misplaced role                                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The unknown-field message                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Role on the step accepted
- ❌ Role in the hints accepted

**Test Data:**

```yaml
inputDomain: 'any runtime hint set'
invariant: 'for ALL hint sets a role key is rejected'
boundaryCounterCase: 'role on the step → accepted'
```

**Edge Cases:**

- Role in both places → rejected

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/role-owner]`
> **Related Behaviors:** `rule/workflows/role-owner`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-052` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:475` (passed in P12; not re-run at the final gate)

---

#### TC-GWF-006: The run starter states that gate steps never skip and every deviation is logged [P0]

**Objective:** Prove that the rule owner tells the assistant gate steps are fixed and each skip writes a reason line.

**Business Intent / Invariant Guarded:** The quality floor is stated where every run starts (BR-GWF-01, BR-GWF-13).

**Traces:** AC-GWF-20 / BR-GWF-01 / BR-GWF-13

**Preconditions:**

- The workflow starter's instructions

**Real-World Reachability:** Every workflow activation reads these instructions.

**Demo Flow:** Read the workflow starter's step rules.

```gherkin
Given the workflow starter's instructions
When they are read
Then gate steps are stated as never skipped
And every skip writes one deviation log line with its reason
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the rules                                                                                                                                                                   |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The gate rule and the log rule                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Both rules present
- ❌ Gate steps described as skippable
- ❌ Skips without a log line allowed

**Edge Cases:**

- A task list shows each task's role

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/start-workflow-step-contract]`
> **Related Behaviors:** `rule/skills/start-workflow-step-contract`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-006` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:453` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-007: The close checks every outcome gate before anything else [P0]

**Objective:** Prove that the close step begins with the outcome-gate evidence check and refuses on missing evidence.

**Business Intent / Invariant Guarded:** A run cannot end as done without evidence for its quality results (BR-GWF-03, BR-GWF-15).

**Traces:** AC-GWF-06 / AC-GWF-22 / BR-GWF-03 / BR-GWF-15

**Preconditions:**

- The close step's instructions

**Real-World Reachability:** Every run ends with the close step.

**Demo Flow:** Read the close step's first instruction.

```gherkin
Given the close step's instructions
When they are read
Then the first step checks evidence for every applicable outcome gate
And a missing piece of evidence refuses the close and names the gate
And the tests-pass evidence must cover the behavior the run changed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Refuses on missing evidence                                                                                                                                                        |
| **Business data state** | Run stays open                                                                                                                                                                     |
| **Data shown on UI**    | The list of missing gates                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Evidence check first
- ✅ Refusal names the gate
- ❌ Close without the check
- ❌ Check after closing actions

**Edge Cases:**

- The root-cause gate asks for the cited trace

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/workflow-end-evidence-check]`
> **Related Behaviors:** `rule/skills/workflow-end-evidence-check`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-007` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:580` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-008: A run that skipped an optional step lists it in the deviation log [P1]

**Objective:** Prove on a real dry run that the deviation log records step, reason category and evidence.

**Business Intent / Invariant Guarded:** Skips stay visible to review and to the usage report (BR-GWF-02, BR-GWF-08).

**Traces:** AC-GWF-08 / BR-GWF-02 / BR-GWF-08

**Preconditions:**

- An annotated workflow run in a temporary project
- One optional step whose condition is false

**Real-World Reachability:** A feature run in an established domain skips the domain-analysis step.

**Demo Flow:** Run the workflow, close it, then print its deviation log.

```gherkin
Given a run that skips an optional step
When the run closes
Then the deviation log lists that step, the "condition false" category and the evidence
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Logs the skip                                                                                                                                                                      |
| **Business data state** | Deviation log holds one line                                                                                                                                                       |
| **Data shown on UI**    | Step and reason category in the usage report                                                                                                                                       |

**Acceptance Criteria:**

- ✅ One line per skip
- ❌ Skip with no line

**Edge Cases:**

- Two skipped steps → two lines

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: event/workflows/step-deviated]`
> **Related Behaviors:** `event/workflows/step-deviated`
> **CoveredBy:** Manual-QC (dry run; printed log recorded in the release metrics note) · **Status:** Implemented — evidence: `tmp/metrics/release-b.md` §2 (P46 dry run; local disposable record)

---

#### TC-GWF-009: A run with changes and no review evidence refuses to close; a cited report closes it [P0]

**Objective:** Prove both sides of the review gate at close on a real dry run.

**Business Intent / Invariant Guarded:** Unreviewed change never closes silently, and a reviewed run is never stopped for lack of a receipt (BR-GWF-03).

**Traces:** AC-GWF-07 / BR-GWF-03

**Preconditions:**

- A run with changes and no review receipt

**Real-World Reachability:** Nested reviews do not mint receipts, so most runs close on their review report.

**Demo Flow:** Close without a report, then close again citing the report.

```gherkin
Given a run with changes, no receipt and no cited review report
When the close runs
Then it refuses and names the review gap
Given the same run citing its review report
When the close runs
Then it closes without asking
And the deviation log holds a "closed on review report" line with the report location
And the close states that a commit still needs a receipt
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Refuses, then closes                                                                                                                                                               |
| **Business data state** | Run closed after the report is cited                                                                                                                                               |
| **Data shown on UI**    | Refusal message; close message; the log line                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Refusal without evidence
- ✅ Close with a cited report
- ❌ Close without evidence
- ❌ A question asked when a report is cited

**Edge Cases:**

- A report that does not exist → refused

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/workflow-end-review-gate]`
> **Related Behaviors:** `rule/skills/workflow-end-review-gate`
> **CoveredBy:** Manual-QC (dry run; refusal and close recorded in the release metrics note) · **Status:** Implemented — evidence: `tmp/metrics/release-b.md` §2 (P46 dry run; local disposable record)

---

#### TC-GWF-010: A nested review workflow stays in the main session [P1]

**Objective:** Prove that the rule owner keeps the nested review running inline, as today.

**Business Intent / Invariant Guarded:** The review loop cannot be abandoned when it runs in the session that owns the stop check; a nested run shares its parent's identity (BR-GWF-01, BR-GWF-08).

**Traces:** AC-GWF-08 / BR-GWF-01 / BR-GWF-08

**Preconditions:**

- The workflow starter's instructions

**Real-World Reachability:** Every feature, bugfix and refactor run nests the review workflow.

**Demo Flow:** Read the nested-workflow rule.

```gherkin
Given the workflow starter's instructions
When the nested review rule is read
Then the review workflow runs inline in the main session, never as a sub-agent
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Keeps the exception                                                                                                                                                                |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The inline exception                                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Exception present
- ❌ Review nested as a sub-agent

**Edge Cases:**

- Other nested workflows still run as sub-agents

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/nested-review-inline]`
> **Related Behaviors:** `rule/skills/nested-review-inline`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-010` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:643` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-041: The deviation log lives under the run identity and the reviewers read it [P1]

**Objective:** Prove the log location, line shape and closed category list, and that both reviewing skills read it.

**Business Intent / Invariant Guarded:** One run identity owns the log; no second identity exists; review sees every deviation (BR-GWF-08).

**Traces:** AC-GWF-08 / BR-GWF-08

**Preconditions:**

- The workflow starter's instructions and both reviewing skills

**Real-World Reachability:** Every run that deviates writes the log; every review reads it.

**Demo Flow:** Read the log rule, then a dry run's log file.

```gherkin
Given the workflow starter's instructions
When the log rule is read
Then the log is kept under the identity recorded at run start
And each line is step identifier, deviation kind and evidence
And the deviation kinds form a closed list
And both reviewing skills read the log when it exists
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the location and shape                                                                                                                                                      |
| **Business data state** | Log under the run identity                                                                                                                                                         |
| **Data shown on UI**    | The rule text; the dry-run file                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Single identity
- ✅ Closed kinds
- ❌ A second identity format
- ❌ Free-form kinds

**Test Data:**

```json
{
    "lineShape": "<step identifier> · <deviation kind> · <evidence>"
}
```

**Edge Cases:**

- A nested run writes to its parent's log

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/deviation-log]`
> **Related Behaviors:** `rule/skills/deviation-log`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-041`, Manual-QC (dry-run log file) · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:543` (passed in P13; not re-run at the final gate; dry-run half: `tmp/metrics/release-b.md` §2 (P46; local disposable record))

---

#### TC-GWF-042: The review gate uses the receipt check and falls back to a cited report [P0]

**Objective:** Prove the close step's review-gate instructions in full.

**Business Intent / Invariant Guarded:** The review gate is machine-checked where a receipt exists, never blocks a reviewed run, and never lowers the commit bar (BR-GWF-03).

**Traces:** AC-GWF-07 / BR-GWF-03

**Preconditions:**

- The close step's instructions

**Real-World Reachability:** Every close of a run with changes.

**Demo Flow:** Read the review-gate instructions.

```gherkin
Given the close step's instructions
When the review gate is read
Then it runs the receipt check and reads its reported result
And a failed check refuses the close
And no change passes, and a receipt over the current change passes
And a skip record alone is not a receipt
And without a receipt a cited review report passes and adds a "closed on review report" line
And the cited report must come from a step that satisfies the review gate
And a report whose final verdict is not converged, or that predates the run's last change, is named as such in that line and in the close message
And the close states that a commit still needs the receipt
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the check and the fallback                                                                                                                                                  |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The review-gate rules                                                                                                                                                              |

**Acceptance Criteria:**

- ✅ All clauses present
- ❌ Receipt-only close
- ❌ Skip record counted as a receipt
- ❌ A stale or not-converged report closing the gate silently

**Edge Cases:**

- A host that cannot run the check → the cited report, recorded the same way

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/workflow-end-review-gate]`
> **Related Behaviors:** `rule/skills/workflow-end-review-gate`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-042`, `.claude/hooks/tests/suites/review-commit-gate.test.cjs::TC-HARNESS-GATE receipt binds exact fingerprint, repository and kind; skip is separate` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:609` (passed in P13; not re-run at the final gate)

---

### Workflow Annotation Tests

> Outcome gates and roles on the annotated workflows (US-GWF-01, US-GWF-07).

#### TC-GWF-011: Every workflow with test and review steps declares both gates [P1]

**Objective:** Prove that each annotated workflow that contains a test-running step and a review step declares "tests pass" and "review converged".

**Business Intent / Invariant Guarded:** The routes that change code carry the test and review floor (BR-GWF-12).

**Traces:** AC-GWF-19 / BR-GWF-12

**Preconditions:**

- The framework registry

**Real-World Reachability:** Feature, bugfix, refactor and big-feature runs.

**Demo Flow:** Validate the registry and list each workflow's gates.

```gherkin
Given every workflow that contains a test-running step and a review step
When the registry is validated
Then each declares "tests pass" and "review converged"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Gates per workflow                                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ Both gates declared
- ❌ Either missing

**Test Data:**

```yaml
inputDomain: 'any workflow containing a test-running step and a review step'
invariant: 'for ALL such workflows both gates are declared'
boundaryCounterCase: 'a workflow without a review step → no review gate required'
```

**Edge Cases:**

- A workflow whose only test step is conditional → the gate still declared, with its condition

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/outcome-gates]`
> **Related Behaviors:** `rule/workflows/outcome-gates`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-011` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:735` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-012: Spec sync is a conditional gate on behavior change [P1]

**Objective:** Prove that feature and bugfix declare "spec synced" with a behavior-change condition.

**Business Intent / Invariant Guarded:** The spec stays true when behavior changes, and nobody syncs a spec for an unchanged behavior (BR-GWF-12).

**Traces:** AC-GWF-19 / BR-GWF-12

**Preconditions:**

- The framework registry

**Real-World Reachability:** A bug fix that changes behavior; a refactor that does not.

**Demo Flow:** Read the two workflows' gates.

```gherkin
Given the feature and bugfix workflows
When the registry is validated
Then "spec synced" is declared with the condition "behavior or public contract changed"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The conditional gate                                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Condition present
- ❌ Unconditional or missing

**Edge Cases:**

- The refactor workflow declares no spec gate

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/spec-synced-gate]`
> **Related Behaviors:** `rule/workflows/spec-synced-gate`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-012` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:762` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-013: Review, test and close steps are gates in every annotated workflow [P0]

**Objective:** Prove the gate role on the review step, the test step when present, and the close step; for a workflow without a test step, on the step that satisfies "tests pass".

**Business Intent / Invariant Guarded:** The steps that produce the quality evidence cannot be flexed (BR-GWF-01).

**Traces:** AC-GWF-20 / BR-GWF-01

**Preconditions:**

- The annotated workflows, including one whose only test-running step is the integration test check

**Real-World Reachability:** The bugfix workflow verifies tests without a separate test step.

**Demo Flow:** Read each annotated workflow's roles.

```gherkin
Given any annotated workflow
When it is read
Then its review step, its test step when present, and its close step are gates
And in a workflow without a test step, the step that satisfies "tests pass" is a gate
And every outcome gate that always applies is satisfied by at least one gate step
And the only close that is not a gate is the optional close of a workflow built to run nested
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates roles                                                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Roles per step                                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ All gate roles present
- ❌ Any of them core or optional

**Test Data:**

```yaml
inputDomain: 'any annotated workflow'
invariant: 'for ALL annotated workflows every nested change-review step and every test step is a gate, every always-applying outcome gate has at least one gate step satisfying it, and the close is a gate unless it is the optional close of a nested-only workflow'
boundaryCounterCase: 'a workflow whose only step proving tests pass is marked core → rejected'
```

**Edge Cases:**

- The lean route follows the same rule (TC-GWF-017)
- A second, core step that also produces review evidence (for example an artifact review before the gate review) → allowed; one gate step is enough

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/gate-roles]`
> **Related Behaviors:** `rule/workflows/gate-roles`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-013` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:777` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-014: Every optional step in the registry carries its condition and skip reason [P1]

**Objective:** Prove the rule of TC-GWF-001 over the real registry.

**Business Intent / Invariant Guarded:** No shipped optional step can be skipped without a stated reason (BR-GWF-02).

**Traces:** AC-GWF-01 / BR-GWF-02

**Preconditions:**

- The framework registry

**Real-World Reachability:** Every run of an annotated workflow.

**Demo Flow:** List every optional step with its condition and reason.

```gherkin
Given every optional step in the registry
When it is read
Then it has a run condition and a skip reason
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Condition and reason per optional step                                                                                                                                             |

**Acceptance Criteria:**

- ✅ All present
- ❌ Any missing

**Test Data:**

```yaml
inputDomain: 'every optional step of every workflow'
invariant: 'for ALL of them both fields are present'
boundaryCounterCase: 'a registry edit that drops one → rejected'
```

**Edge Cases:**

- A workflow with no optional step → nothing to check

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/optional-step]`
> **Related Behaviors:** `rule/workflows/optional-step`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-014` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:796` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-015: Workflow wrappers point to the rule owner and list their gates [P2]

**Objective:** Prove that each annotated workflow's description lists its gates and optional steps and points to the rule owner in one line.

**Business Intent / Invariant Guarded:** A reader sees what a workflow must prove without a second copy of the flex rules (BR-GWF-16).

**Traces:** AC-GWF-23 / BR-GWF-16

**Preconditions:**

- The annotated workflow descriptions

**Real-World Reachability:** A developer opens a workflow description before running it.

**Demo Flow:** Read each description.

```gherkin
Given an annotated workflow description
When it is read
Then it lists the gate steps and the optional steps
And it points to the rule owner in at most one line
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Shows gates and optional steps                                                                                                                                                     |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Two short lists and one pointer                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Lists and pointer present
- ❌ Lists missing
- ❌ A pasted copy of the flex rules

**Edge Cases:**

- A description with no optional steps → says so

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/workflow-wrapper-summary]`
> **Related Behaviors:** `rule/skills/workflow-wrapper-summary`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-015` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:866` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-016: Declaring roles leaves step counts unchanged [P2]

**Objective:** Prove that the routing catalog shows the same step counts before and after annotation.

**Business Intent / Invariant Guarded:** Roles describe steps; they never add or remove one (BR-GWF-12).

**Traces:** AC-GWF-19 / BR-GWF-12

**Preconditions:**

- The catalog rendered from the annotated registry

**Real-World Reachability:** Every prompt shows the catalog.

**Demo Flow:** Render the catalog and compare step counts.

```gherkin
Given the annotated registry
When the catalog is rendered
Then each workflow's step count equals its number of steps
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Renders counts                                                                                                                                                                     |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Step counts                                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Counts match
- ❌ A count changed by annotation

**Edge Cases:**

- A step written as a record instead of a name → counted once

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-skills-catalog]`
> **Related Behaviors:** `operation/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-GWF-016` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs:515` (passed in P14; not re-run at the final gate)

---

### Intent-First Flex Tests

> Intent, flex freedom, data dependencies, test scope and the single rule owner (US-GWF-07).

#### TC-GWF-057: Every workflow declares an intent and its outcome gates [P1]

**Objective:** Prove that all workflows in the registry, not only the heaviest, carry one intent sentence and an outcome-gate list whose gates are satisfiable.

**Business Intent / Invariant Guarded:** Intent-first decisions need a stated intent in every workflow (BR-GWF-12).

**Traces:** AC-GWF-19 / BR-GWF-12

**Preconditions:**

- The framework registry, every workflow

**Real-World Reachability:** Any workflow may be activated.

**Demo Flow:** List every workflow with its intent and gates.

```gherkin
Given every workflow in the registry
When it is read
Then it has a one-sentence intent
And an outcome-gate list whose every gate names a step it contains
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Intent and gates per workflow                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Every workflow annotated
- ❌ A workflow without an intent
- ❌ A workflow without a gate list

**Test Data:**

```yaml
inputDomain: 'every workflow in the registry'
invariant: 'for ALL workflows an intent and a gate list are present and each gate is satisfiable'
boundaryCounterCase: 'a workflow with an empty intent → rejected'
```

**Edge Cases:**

- A workflow whose steps produce no test or review → its gate list names only the gates its steps can satisfy

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/intent]`
> **Related Behaviors:** `rule/workflows/intent`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-057` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:714` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-058: Core and optional steps may flex with a logged reason; gate steps may not [P0]

**Objective:** Prove that the rule owner lets the assistant skip, merge, simplify or reorder core and optional steps, each with a log line, and never a gate step.

**Business Intent / Invariant Guarded:** Steps are recommendations, the quality floor is not (BR-GWF-13, BR-GWF-01).

**Traces:** AC-GWF-20 / BR-GWF-13 / BR-GWF-01

**Preconditions:**

- The workflow starter's instructions

**Real-World Reachability:** A small change inside a long workflow.

**Demo Flow:** Read the flex rules; then run a dry run that merges two core steps and print its log.

```gherkin
Given the workflow starter's instructions
When the flex rules are read
Then core and optional steps may be skipped, merged, simplified or reordered, intent first
And each such decision adds a deviation log line with its kind and reason
And gate steps are excluded from every kind of flex
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the flex freedom and its limit                                                                                                                                              |
| **Business data state** | Log lines per deviation                                                                                                                                                            |
| **Data shown on UI**    | The rule text; merged and reordered lines in the dry-run log                                                                                                                       |

**Acceptance Criteria:**

- ✅ Flex allowed for core and optional
- ✅ Every deviation logged
- ❌ A gate step flexed
- ❌ A deviation without a line

**Test Data:**

```yaml
inputDomain: 'any flex decision on any step'
invariant: 'for ALL decisions the step is core or optional and a log line exists'
boundaryCounterCase: 'a merge that absorbs the review gate → not allowed'
```

```json
{
    "deviationKinds": ["condition false", "pre-authorized", "not needed for the intent", "merged", "simplified", "reordered", "closed on review report"]
}
```

**Edge Cases:**

- An optional step whose condition holds → may still be flexed, logged
- A reorder alone → logged as reordered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/start-workflow-flex]`
> **Related Behaviors:** `rule/skills/start-workflow-flex`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-058`, Manual-QC (dry-run log) · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:479` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-059: No flex decision runs a step before a step it depends on [P0]

**Objective:** Prove that the rule owner states the standing data dependencies and forbids a reorder or merge that breaks them.

**Business Intent / Invariant Guarded:** A review of unfinished work, or of an unsynced spec, proves nothing (BR-GWF-14).

**Traces:** AC-GWF-21 / BR-GWF-14

**Preconditions:**

- The workflow starter's instructions

**Real-World Reachability:** The assistant wants to review early to save time.

**Demo Flow:** Read the dependency rule.

```gherkin
Given the workflow starter's instructions
When the dependency rule is read
Then a change is made before it is reviewed and before its tests run
And the spec sync runs before the review that checks it
And the close runs last
And a reorder or merge that breaks one of these is not allowed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the dependencies                                                                                                                                                            |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The dependency rule                                                                                                                                                                |

**Acceptance Criteria:**

- ✅ All three dependencies stated
- ❌ Review allowed before the change
- ❌ Review allowed before spec sync

**Test Data:**

```yaml
inputDomain: "any reorder or merge of any workflow's steps"
invariant: 'for ALL of them each step still follows every step whose output it needs'
boundaryCounterCase: 'moving the review ahead of the spec sync → not allowed'
```

**Edge Cases:**

- Two independent steps swapped → allowed and logged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/start-workflow-dependencies]`
> **Related Behaviors:** `rule/skills/start-workflow-dependencies`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-059` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:499` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-060: Test choice flexes, but changed behavior is tested green before close [P0]

**Objective:** Prove that "tests are recommendations" is scoped to which tests run, never to whether changed behavior is tested and green.

**Business Intent / Invariant Guarded:** Flex never leaves changed behavior untested or failing (BR-GWF-15).

**Traces:** AC-GWF-22 / BR-GWF-15

**Preconditions:**

- The workflow starter's instructions and the close step's instructions

**Real-World Reachability:** A run that skips the broad test step and runs only the affected cases.

**Demo Flow:** Read both rules.

```gherkin
Given the workflow starter's instructions
When the test rule is read
Then the choice of test steps and test cases may flex
And every behavior the run changed must be covered by tests that ran green in this run
And a skip or merge that would leave changed behavior untested or failing is not allowed
Given the close step's instructions
Then the tests-pass evidence must cover the changed behavior
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the scope of test flex                                                                                                                                                      |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Both rules                                                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Scope stated in both places
- ❌ Tests described as optional
- ❌ Close accepting a failing test

**Test Data:**

```yaml
inputDomain: 'any run that changed behavior'
invariant: 'for ALL such runs tests covering the change ran green before close'
boundaryCounterCase: 'changed behavior with only unrelated tests run → close refused'
```

**Edge Cases:**

- A run that changed no behavior → the test gate evidence may be the unchanged-behavior statement where the workflow declares one
- A failing test → investigated first, never weakened to pass

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/test-scope]`
> **Related Behaviors:** `rule/skills/test-scope`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-060` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:519` (passed in P13; not re-run at the final gate)

---

#### TC-GWF-061: The flex rules are written once; every other surface points to them [P1]

**Objective:** Prove that no workflow description, wrapper or runtime helper carries a copy of the flex rules.

**Business Intent / Invariant Guarded:** One owner keeps the rules consistent and small (BR-GWF-16).

**Traces:** AC-GWF-23 / BR-GWF-16

**Preconditions:**

- Every workflow wrapper and the per-prompt routing text

**Real-World Reachability:** A maintainer tempted to paste the rules into each wrapper.

**Demo Flow:** Search every wrapper for the flex rule text.

```gherkin
Given every workflow wrapper and the routing text
When they are read
Then each carries at most one line pointing to the rule owner
And none carries the flex rules themselves
And no wrapper, the rule owner or the shared registry-binding rules forbid reordering, dropping or skipping a non-gate step
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Keeps one owner                                                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | One pointer line per surface at most                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Pointer only
- ❌ A pasted copy of the rules
- ❌ A line saying never to reorder or drop a step, which contradicts the rule owner
- ✅ Gate wording ("gate steps are never skipped") and a skill's own numbered steps are not contradictions

**Test Data:**

```yaml
inputDomain: 'every wrapper and routing surface'
invariant: 'for ALL of them the flex rule text appears at most as a one-line pointer'
boundaryCounterCase: 'a wrapper with the full rules → fails'
```

**Edge Cases:**

- A wrapper with no pointer at all → allowed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/flex-rule-owner]`
> **Related Behaviors:** `rule/skills/flex-rule-owner`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-061` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:890` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-062: Bug-fixing workflows require a root-cause trace as a gate [P1]

**Objective:** Prove that every workflow that fixes a bug declares "root cause traced" and marks its investigation step as a gate — or, when the gate applies only on failure, as an optional step carrying that condition.

**Business Intent / Invariant Guarded:** A bug fix without a traced cause patches a symptom (BR-GWF-01, BR-GWF-12).

**Traces:** AC-GWF-19 / BR-GWF-01 / BR-GWF-12

**Preconditions:**

- The framework registry

**Real-World Reachability:** The bugfix workflow, and a test-repair workflow when a failure is found.

**Demo Flow:** Read each bug-fixing workflow's gates and roles.

```gherkin
Given every workflow whose steps investigate and fix a bug
When it is read
Then it declares "root cause traced", satisfied by its investigation step
And that step is a gate when the gate always applies
And a workflow that investigates only on failure declares the gate with that condition, and its investigation step is optional with that same run condition
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The gate and the role                                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Gate and role present
- ❌ A bug fix without the gate
- ❌ Investigation step marked optional under a gate that always applies
- ❌ An on-failure investigation declared as a gate step (a gate step carries no run condition)

**Test Data:**

```yaml
inputDomain: 'every workflow containing a bug investigation step'
invariant: 'for ALL of them the root-cause gate is declared and satisfiable'
boundaryCounterCase: 'the investigation step marked core → rejected'
```

**Edge Cases:**

- A workflow that fixes nothing → no root-cause gate

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/root-cause-gate]`
> **Related Behaviors:** `rule/workflows/root-cause-gate`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-062` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:815` (passed in P14; not re-run at the final gate)

---

#### TC-GWF-068: No workflow rewrites code after the test run or review that proves it [P1]

**Objective:** Prove that a clean-up step that rewrites code (the simplifier) sits before every test run in the recommended order and is followed by a review, in every workflow.

**Business Intent / Invariant Guarded:** Test and review evidence describes the code that ships; a rewrite after them makes that evidence stale (BR-GWF-14).

**Traces:** AC-GWF-21 / BR-GWF-14

**Preconditions:**

- The framework registry

**Real-World Reachability:** The seed-test-data workflow and the review workflow, which both run the simplifier.

**Demo Flow:** Read each workflow's recommended order around its clean-up step.

```gherkin
Given every workflow whose sequence contains a clean-up rewrite step
When its recommended order is read
Then no test run comes before the rewrite
And a review comes after the rewrite
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The workflow and the misplaced step                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Rewrite before the test run, review after it
- ❌ A rewrite after the test run
- ❌ A rewrite with no review after it

**Test Data:**

```yaml
inputDomain: 'every workflow sequence containing a clean-up rewrite step'
invariant: 'for ALL of them no test run precedes the rewrite and a review follows it'
boundaryCounterCase: 'the simplifier moved behind the test and review gates → both gaps reported'
```

**Edge Cases:**

- A workflow with no rewrite step → nothing to check

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/rewrite-before-checks]`
> **Related Behaviors:** `rule/workflows/rewrite-before-checks`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-068` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:848` (passed in the round-2 review fix; not re-run at the final gate)

---

### Lean Route Tests

> Route shape, escalation and routing predicate (US-GWF-03).

#### TC-GWF-017: The lean route has nine steps plus close and every gate [P1]

**Objective:** Prove the lean route's shape: investigate, gap review, plan, build, optional spec sync, integration tests, their check, review, tests, close.

**Business Intent / Invariant Guarded:** The lean route is shorter only where the spec already exists; it keeps every gate (BR-GWF-01, BR-GWF-09).

**Traces:** AC-GWF-11 / BR-GWF-01 / BR-GWF-09

**Preconditions:**

- The framework registry with the lean route

**Real-World Reachability:** Spec-supplied work routed to the lean route.

**Demo Flow:** Read the lean route.

```gherkin
Given the lean route
When the registry is validated
Then it has nine steps plus close in the stated order
And it declares "tests pass", "review converged" and "spec synced"
And its test check, review, test and close steps are gates
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Steps, gates and roles                                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Order, gates and roles as stated
- ❌ A gate missing
- ❌ A gate step not marked gate

**Edge Cases:**

- The integration-test pair stays; no checker exemption

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/implement-spec]`
> **Related Behaviors:** `rule/workflows/implement-spec`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-017` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:1054` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-018: The lean route syncs the spec only on behavior change, before the review [P1]

**Objective:** Prove the spec sync is optional with a behavior-change condition and precedes the tests and the review.

**Business Intent / Invariant Guarded:** The review sees the synced spec, and no sync runs when behavior matches the spec (BR-GWF-02, BR-GWF-14).

**Traces:** AC-GWF-11 / AC-GWF-21 / BR-GWF-02 / BR-GWF-14

**Preconditions:**

- The lean route

**Real-World Reachability:** An implementation that matches the supplied spec exactly.

**Demo Flow:** Read the spec sync step and its position.

```gherkin
Given the lean route
When it is read
Then its spec sync step is optional, runs when behavior differs from the supplied spec, and skips with "implementation matches the supplied spec"
And it comes before the integration tests and the review
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Validates                                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Condition, reason and position                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Optional, conditioned, placed first
- ❌ After the review
- ❌ Unconditional

**Edge Cases:**

- Behavior differs → sync runs, then review

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/implement-spec-sync]`
> **Related Behaviors:** `rule/workflows/implement-spec-sync`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-018` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:1073` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-019: The lean route states its escalation to the full feature route [P0]

**Objective:** Prove the lean route's description tells the assistant to stop on a vague, contradictory or incomplete spec.

**Business Intent / Invariant Guarded:** The lean route never guesses behavior the spec does not contain (BR-GWF-04).

**Traces:** AC-GWF-10 / BR-GWF-04

**Preconditions:**

- The lean route description

**Real-World Reachability:** A request that goes beyond the supplied spec.

**Demo Flow:** Read the escalation rule.

```gherkin
Given the lean route description
When it is read
Then a vague or contradictory spec, or a requested behavior the spec lacks, stops the route
And the user is asked to clarify or switch to the full feature route, which updates the spec first
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the escalation                                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The escalation rule                                                                                                                                                                |

**Acceptance Criteria:**

- ✅ All three triggers named
- ❌ Any trigger missing

**Edge Cases:**

- A spec with one open question → clarify first

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/implement-spec-escalation]`
> **Related Behaviors:** `rule/skills/implement-spec-escalation`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-019` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:657` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-020: The lean route anchors its plan to the supplied spec [P1]

**Objective:** Prove the lean route description anchors plan scope to the spec baseline.

**Business Intent / Invariant Guarded:** Spec-supplied work does not grow beyond the spec (BR-GWF-05).

**Traces:** AC-GWF-12 / BR-GWF-05

**Preconditions:**

- The lean route description

**Real-World Reachability:** Every lean-route plan.

**Demo Flow:** Read the plan-scope rule.

```gherkin
Given the lean route description
When it is read
Then plan scope is anchored to the spec baseline recorded at plan start
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the anchor                                                                                                                                                                  |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The anchor rule                                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Anchor stated
- ❌ Plan scope unanchored

**Edge Cases:**

- A new requirement → proposed addition (TC-GWF-025)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/implement-spec-anchor]`
> **Related Behaviors:** `rule/skills/implement-spec-anchor`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-020` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:677` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-021: The routing guidance still fits with the lean route row [P2]

**Objective:** Prove that adding the lean route keeps the per-prompt routing guidance within 9,500 characters.

**Business Intent / Invariant Guarded:** A new route never pushes the routing guidance past what the host shows (BR-GWF-09; sibling WFR size rule).

**Traces:** AC-GWF-11 / BR-GWF-09

**Preconditions:**

- The registry with the lean route

**Real-World Reachability:** Every prompt.

**Demo Flow:** Build the guidance and measure it.

```gherkin
Given the registry with the lean route
When the routing guidance is built
Then it is at most 9,500 characters and lists the lean route
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Fits the cap                                                                                                                                                                       |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The compact catalog with the new row                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Within the cap
- ❌ Over the cap

**Test Data:**

```json
{
    "guardCharacters": 9500
}
```

**Edge Cases:**

- At the cap → the next shorter guidance form

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: this framework registry fits under 9,500 chars` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs:533` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-022: The feature and lean routes split on whether the behavior is already specified [P1]

**Objective:** Prove the two routes' when-to-use texts are mutually exclusive on "the requested behavior is already written in a canonical spec".

**Business Intent / Invariant Guarded:** The lean route is never chosen just because a spec exists (BR-GWF-09).

**Traces:** AC-GWF-09 / BR-GWF-09

**Preconditions:**

- Both when-to-use texts

**Real-World Reachability:** A spec exists for the capability but not for the new behavior.

**Demo Flow:** Read both texts side by side.

```gherkin
Given the feature and lean route when-to-use texts
When they are read
Then the lean route covers work whose requested behavior is already written in a canonical spec
And the feature route covers no spec yet, or a spec that lacks the requested behavior
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Splits the routes                                                                                                                                                                  |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The two predicates                                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ Mutually exclusive
- ❌ Either keyed on "a spec exists"

**Test Data:**

```yaml
inputDomain: 'any request'
invariant: 'for ALL requests at most one of the two predicates holds'
boundaryCounterCase: 'a spec file that lacks the behavior → feature route'
```

**Edge Cases:**

- A spec with the behavior but vague → lean route, then escalation (TC-GWF-019)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/route-predicate]`
> **Related Behaviors:** `rule/workflows/route-predicate`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-022` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:1096` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-043: The lean route is registered and the catalog lists it [P1]

**Objective:** Prove the real registry with the lean route builds its catalog and lists the route.

**Business Intent / Invariant Guarded:** A registered route is routable; a malformed one would empty routing for every workflow (BR-GWF-09).

**Traces:** AC-GWF-11 / BR-GWF-09

**Preconditions:**

- The framework registry; runs only inside the framework repository, reported as skipped elsewhere

**Real-World Reachability:** Every catalog build.

**Demo Flow:** Build the catalog.

```gherkin
Given the registry with the lean route
When the catalog is built
Then it builds without error and lists the lean route
And the expected workflow list includes it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Builds the catalog                                                                                                                                                                 |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The lean route row                                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ Listed
- ❌ Build error
- ❌ Missing row

**Edge Cases:**

- Outside the framework repository → reported as skipped with its reason, never as a pass

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-skills-catalog]`
> **Related Behaviors:** `operation/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-043` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:1128` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-044: A spec that lacks the requested behavior routes to the feature route [P1]

**Objective:** Prove the routing texts and the lean route description agree on a spec without the requested behavior.

**Business Intent / Invariant Guarded:** Missing behavior is specified first, never built from a guess (BR-GWF-09, BR-GWF-04).

**Traces:** AC-GWF-09 / AC-GWF-10 / BR-GWF-09 / BR-GWF-04

**Preconditions:**

- Both when-to-use texts and the lean route description

**Real-World Reachability:** A capability spec exists; the request adds a behavior it does not describe.

**Demo Flow:** Read the texts for that request.

```gherkin
Given a request whose capability spec lacks the requested behavior
When the routing texts and the lean route description are read
Then the feature route covers it with "update the spec first"
And the lean route stops at its gap review and escalates
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Routes to the feature route                                                                                                                                                        |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The matching predicate and the stop rule                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Feature route; lean stop
- ❌ Lean route plans the behavior

**Edge Cases:**

- Behavior partly described → gap review finds it vague and escalates

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/workflows/route-predicate]`
> **Related Behaviors:** `rule/workflows/route-predicate`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow.test.cjs::TC-GWF-044`, `.claude/hooks/tests/suites/content-presence.test.cjs::TC-GWF-044` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow.test.cjs:1110`, `.claude/hooks/tests/suites/content-presence.test.cjs:625` (passed in P15; not re-run at the final gate)

---

#### TC-GWF-051: Live: a request beyond the spec escalates instead of being built [P0]

**Objective:** Prove on a live run of the lean route that a request the spec does not describe is escalated or asked about before planning.

**Business Intent / Invariant Guarded:** Observed behavior matches the escalation rule (BR-GWF-04, BR-GWF-09).

**Traces:** AC-GWF-10 / BR-GWF-04 / BR-GWF-09

**Preconditions:**

- A fixture project whose supplied spec has no rule for the requested behavior

**Real-World Reachability:** A developer asks the lean route for a feature the spec omits.

**Demo Flow:** Run the lean route with that request and follow the recommended answer to every question.

```gherkin
Given the lean route and a request whose behavior is absent from the supplied spec
When the route runs
Then it stops at the gap review and escalates to the feature route, or asks the user before planning that behavior
And it neither guesses the behavior nor drops it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Escalates or asks                                                                                                                                                                  |
| **Business data state** | No behavior built from a guess                                                                                                                                                     |
| **Data shown on UI**    | The escalation or the question                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Escalation or question before planning
- ❌ Behavior planned or built without asking
- ❌ Behavior silently dropped

**Edge Cases:**

- A fail blocks recording the lean route as the default

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/implement-spec-escalation]`
> **Related Behaviors:** `rule/skills/implement-spec-escalation`
> **CoveredBy:** Manual-QC (live replay; verdict in the lean-route comparison note) · **Status:** Planned

---

### Scope Guard Tests

> Spec baseline and proposed additions (US-GWF-04).

#### TC-GWF-023: A plan records the spec baseline when a spec is supplied [P1]

**Objective:** Prove the plan instructions record the spec location and a stored content anchor at plan start.

**Business Intent / Invariant Guarded:** The spec as supplied stays readable for the whole run (BR-GWF-05).

**Traces:** AC-GWF-12 / BR-GWF-05

**Preconditions:**

- The plan instructions

**Real-World Reachability:** Every plan that implements a supplied spec.

**Demo Flow:** Read the baseline rule.

```gherkin
Given the plan instructions
When a spec is supplied
Then the plan records the spec location and a content anchor that stores the content for later read-back
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the baseline rule                                                                                                                                                           |
| **Business data state** | Baseline recorded in the plan                                                                                                                                                      |
| **Data shown on UI**    | The rule text                                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Location and stored anchor
- ❌ Anchor that does not store the content

**Edge Cases:**

- A spec location that looks like an option → still read as a location

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/plan-spec-baseline]`
> **Related Behaviors:** `rule/skills/plan-spec-baseline`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-023` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:104` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-024: Plan review traces tasks to the baseline, not the current spec [P1]

**Objective:** Prove the plan review instructions trace against the baseline content when one exists.

**Business Intent / Invariant Guarded:** A spec edited mid-run cannot justify new scope (BR-GWF-05).

**Traces:** AC-GWF-13 / BR-GWF-05

**Preconditions:**

- The plan review instructions

**Real-World Reachability:** A spec edited after planning started.

**Demo Flow:** Read the trace rule.

```gherkin
Given the plan review instructions
When a baseline exists
Then every task is traced to the baseline content
And an untraced task that is not an approved addition is a finding
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the trace rule                                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The rule text                                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Baseline tracing
- ❌ Tracing to the current spec

**Edge Cases:**

- An approved addition → not a finding

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/plan-review-baseline-trace]`
> **Related Behaviors:** `rule/skills/plan-review-baseline-trace`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-024` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:121` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-025: A requirement the baseline lacks becomes a proposed addition [P1]

**Objective:** Prove new requirements go to "proposed additions (need approval)", not to plan tasks.

**Business Intent / Invariant Guarded:** Scope grows only with the owner's approval (BR-GWF-05).

**Traces:** AC-GWF-12 / BR-GWF-05

**Preconditions:**

- The plan instructions

**Real-World Reachability:** Planning finds a hardening gap the spec never asked for.

**Demo Flow:** Read the proposed-additions rule.

```gherkin
Given the plan instructions
When a requirement is not in the baseline
Then it goes to "proposed additions (need approval)" and is raised as a question
And it is not placed in a plan task
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the rule                                                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The section name                                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Proposal and question
- ❌ Silent task
- ❌ Silent drop

**Edge Cases:**

- The owner approves → it becomes a task

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/plan-proposed-additions]`
> **Related Behaviors:** `rule/skills/plan-proposed-additions`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-025` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:137` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-026: The baseline returns the original content after the spec changes [P1]

**Objective:** Prove on a temporary repository that a committed spec edited after the baseline reads back as supplied.

**Business Intent / Invariant Guarded:** The baseline is real, not a label (BR-GWF-05).

**Traces:** AC-GWF-13 / BR-GWF-05

**Preconditions:**

- A temporary repository with a committed spec

**Real-World Reachability:** A clarification edits the spec mid-run.

**Demo Flow:** Record the baseline, edit the spec, read the baseline back.

```gherkin
Given a baseline recorded for a committed spec
When the spec is edited
And the baseline is read back
Then the original content returns
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Reads back the original                                                                                                                                                            |
| **Business data state** | Spec edited; baseline unchanged                                                                                                                                                    |
| **Data shown on UI**    | The original content                                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Original returned
- ❌ Edited content returned

**Test Data:**

```yaml
inputDomain: 'any spec content and any later edit'
invariant: 'for ALL of them the baseline reads back the supplied content'
boundaryCounterCase: 'a malformed anchor → baseline unrecoverable (TC-GWF-046)'
```

**Edge Cases:**

- An empty spec → an empty baseline, still readable

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/plan-spec-baseline]`
> **Related Behaviors:** `operation/skills/plan-spec-baseline`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-026` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:152` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-027: Without a supplied spec, planning is unchanged [P2]

**Objective:** Prove the baseline rule applies only when a spec is supplied.

**Business Intent / Invariant Guarded:** Plans without a spec behave as before (BR-GWF-05).

**Traces:** AC-GWF-14 / BR-GWF-05

**Preconditions:**

- The plan instructions

**Real-World Reachability:** An investigation-only plan.

**Demo Flow:** Read the no-spec rule.

```gherkin
Given no supplied spec
When a plan is made
Then no baseline is recorded and no scope rule changes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | No baseline                                                                                                                                                                        |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The rule text                                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Unchanged
- ❌ A baseline demanded

**Edge Cases:**

- A spec mentioned but not supplied as input → no baseline

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/plan-spec-baseline]`
> **Related Behaviors:** `rule/skills/plan-spec-baseline`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-027` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:175` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-045: A spec never saved to history stays restorable [P1]

**Objective:** Prove on a temporary repository that an uncommitted spec reads back as supplied after an edit.

**Business Intent / Invariant Guarded:** A brand-new spec is protected like a committed one (BR-GWF-05).

**Traces:** AC-GWF-13 / BR-GWF-05

**Preconditions:**

- A temporary repository with a spec that was never committed

**Real-World Reachability:** A spec written in the same session as the plan.

**Demo Flow:** Record the baseline, edit the spec, read it back.

```gherkin
Given a spec that was never saved to history
When its baseline is recorded, the spec is edited, and the baseline is read back
Then the original content returns
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Stores the content with the baseline                                                                                                                                               |
| **Business data state** | Content stored                                                                                                                                                                     |
| **Data shown on UI**    | The original content                                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Original returned
- ❌ Read-back fails

**Edge Cases:**

- The stored content is later pruned by routine cleanup → baseline unrecoverable finding

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/plan-spec-baseline]`
> **Related Behaviors:** `operation/skills/plan-spec-baseline`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-045` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:189` (passed in P16; not re-run at the final gate)

---

#### TC-GWF-046: A malformed baseline anchor is refused and named [P0]

**Objective:** Prove hostile or partial anchor values are refused before any read and produce the "baseline unrecoverable" finding.

**Business Intent / Invariant Guarded:** An editable plan field can never become an instruction, and a broken baseline never falls back to the current spec (BR-GWF-05).

**Traces:** AC-GWF-13 / BR-GWF-05

**Preconditions:**

- The plan review instructions and a temporary repository

**Real-World Reachability:** A plan file edited by hand, or a baseline pruned by cleanup.

**Demo Flow:** Check each hostile value and a real anchor against the plan review rule.

```gherkin
Given the anchor rule from the plan review instructions
When it checks a revision expression, an option-like value, a short identifier and a real anchor
Then the three hostile values are refused and the real one passes
And the instructions name the "baseline unrecoverable" finding with no fallback to the current spec
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Refuses malformed anchors                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The finding name                                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Hostile values refused
- ✅ Real anchor accepted
- ❌ Any hostile value accepted
- ❌ Fallback to the current spec

**Test Data:**

```yaml
inputDomain: 'any text in the anchor field'
invariant: 'for ALL values only a full-length content identifier is accepted'
boundaryCounterCase: 'a short identifier → refused'
```

```json
{
    "hostile": ["HEAD:spec.md", "--batch", "abc123"]
}
```

**Edge Cases:**

- A valid anchor whose content is gone → the same finding

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/plan-review-baseline-anchor]`
> **Related Behaviors:** `rule/skills/plan-review-baseline-anchor`
> **CoveredBy:** `.claude/hooks/tests/suites/scope-guard.test.cjs::TC-GWF-046` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/scope-guard.test.cjs:215` (passed in P16; not re-run at the final gate)

---

### Usage Reading Tests

> Totals, deduplication and bounded reading (US-GWF-05, US-GWF-06).

#### TC-GWF-028: Usage totals count each response once across main session and sub-agents [P1]

**Objective:** Prove the four usage figures sum unique responses, last record winning, across the main session and two sub-agents, and the total excludes cache reads.

**Business Intent / Invariant Guarded:** Route comparisons and the checkpoint rest on the true figure (BR-GWF-10, BR-GWF-07).

**Traces:** AC-GWF-17 / BR-GWF-10 / BR-GWF-07

**Preconditions:**

- A main session record and two sub-agent records, some responses saved as several records

**Real-World Reachability:** Every long run saves streamed responses as several records.

**Demo Flow:** Read the usage and compare with a hand count.

```gherkin
Given a main session and two sub-agents with repeated response records
When usage is read
Then each of new input, cache writes, cache reads and output equals the sum over unique responses of the last record's value
And the total equals new input + cache writes + output
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Deduplicates and sums                                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Four figures and the total                                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Figures match the hand count
- ✅ Cache reads excluded from the total
- ❌ A repeated response counted twice
- ❌ Cache reads in the total

**Test Data:**

```yaml
inputDomain: 'any set of session records with repeated responses'
invariant: "for ALL of them each response counts once with its last record's usage"
boundaryCounterCase: 'the same response repeated with a different request → counted separately'
```

**Edge Cases:**

- A record with no usage → ignored

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage]`
> **Related Behaviors:** `operation/hooks-lib/session-usage`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-028` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:102` (passed in P17; not re-run at the final gate)

---

#### TC-GWF-029: A cut-off last record is skipped and the rest count [P2]

**Objective:** Prove an incomplete final record does not break the read.

**Business Intent / Invariant Guarded:** A session still being written can be measured (BR-GWF-10).

**Traces:** AC-GWF-17 / BR-GWF-10

**Preconditions:**

- A session record whose last line is incomplete

**Real-World Reachability:** The report runs while a session is still writing.

**Demo Flow:** Read the usage.

```gherkin
Given a session record with an incomplete last line
When usage is read
Then the incomplete line is skipped and every complete line counts
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Skips the partial line                                                                                                                                                             |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Totals of the complete lines                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Complete lines counted
- ❌ Read fails
- ❌ Partial line counted

**Edge Cases:**

- The line completes later → counted on the next read

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage]`
> **Related Behaviors:** `operation/hooks-lib/session-usage`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-029` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:139` (passed in P17; not re-run at the final gate)

---

#### TC-GWF-030: A run with no sub-agents reports the main session alone [P2]

**Objective:** Prove a missing sub-agent area is not an error.

**Business Intent / Invariant Guarded:** Usage reads work for every run shape (BR-GWF-07).

**Traces:** AC-GWF-17 / BR-GWF-07

**Preconditions:**

- A main session record and no sub-agent records

**Real-World Reachability:** A short direct run.

**Demo Flow:** Read the usage.

```gherkin
Given no sub-agent records
When usage is read
Then the main session totals return with an empty sub-agent list
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Reads the main session                                                                                                                                                             |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Main totals; no sub-agent rows                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Main totals returned
- ❌ Error

**Edge Cases:**

- A sub-agent area with a file of an unsafe name → ignored

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage]`
> **Related Behaviors:** `operation/hooks-lib/session-usage`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-030` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:163` (passed in P17; not re-run at the final gate)

---

#### TC-GWF-047: One response saved as three records counts once, read whole or in parts [P1]

**Objective:** Prove deduplication holds when a response spans three records with another record between them, in a full read and in an incremental read split between the records.

**Business Intent / Invariant Guarded:** The last record wins, however the reading is split (BR-GWF-10).

**Traces:** AC-GWF-17 / BR-GWF-10

**Preconditions:**

- One response saved as three records; a tool-result record between two of them; the last carries the final usage

**Real-World Reachability:** Streamed responses are saved in parts.

**Demo Flow:** Read in full; read again in two parts.

```gherkin
Given one response saved as three records
When usage is read in full
And again in two parts split between the records
Then both reads count it once with the last record's usage
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Deduplicates across reads                                                                                                                                                          |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The same totals both ways                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Once, last wins, both ways
- ❌ Counted twice
- ❌ First record wins

**Test Data:**

```yaml
inputDomain: 'any split point inside a repeated response'
invariant: 'for ALL split points the totals equal the full read'
boundaryCounterCase: 'a different response between the parts → counted separately'
```

**Edge Cases:**

- The split falls inside a record → that record is read next time

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage]`
> **Related Behaviors:** `operation/hooks-lib/session-usage`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-047` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:178` (passed in P17; not re-run at the final gate)

---

#### TC-GWF-048: An unchanged session record is not read again [P1]

**Objective:** Prove an incremental read with no growth reads nothing and returns the stored totals.

**Business Intent / Invariant Guarded:** The checkpoint costs almost nothing when nothing changed (BR-GWF-11).

**Traces:** AC-GWF-16 / BR-GWF-11

**Preconditions:**

- State from a previous incremental read; no growth since

**Real-World Reachability:** Several task updates in a row with no model response between them.

**Demo Flow:** Read incrementally and count the bytes read.

```gherkin
Given state from a previous read and no growth
When usage is read incrementally
Then nothing is read and the totals are unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Returns stored totals                                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Same totals                                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Zero read
- ❌ Any re-read

**Edge Cases:**

- A new sub-agent record appears → only it is read

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage-incremental]`
> **Related Behaviors:** `operation/hooks-lib/session-usage-incremental`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-048` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:205`, `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:326` (passed in P17/P18; not re-run at the final gate)

---

#### TC-GWF-049: An incremental read reads only what was added [P1]

**Objective:** Prove that after 1 KB is appended the read covers at most that plus a carried partial line, and totals add only the new lines.

**Business Intent / Invariant Guarded:** Reading cost follows growth, not session size (BR-GWF-11).

**Traces:** AC-GWF-16 / BR-GWF-11

**Preconditions:**

- State from a previous incremental read; 1 KB appended

**Real-World Reachability:** Each step adds a few responses to a long session.

**Demo Flow:** Read incrementally and count the bytes read.

```gherkin
Given 1 KB appended since the last read
When usage is read incrementally
Then the bytes read are at most the appended bytes plus the carried partial line
And the totals add only the new lines
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Reads the tail                                                                                                                                                                     |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Updated totals                                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Bounded read
- ❌ Whole-file read

**Edge Cases:**

- The record shrank → read from the start with zero totals

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks-lib/session-usage-incremental]`
> **Related Behaviors:** `operation/hooks-lib/session-usage-incremental`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-049` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:225` (passed in P17; not re-run at the final gate)

---

#### TC-GWF-056: An oversized record is skipped, counted and never stalls the read [P1]

**Objective:** Prove bounded reading with small injected limits: normal and near-limit records count, an oversized one is skipped and counted, and an oversized record still open at the end is skipped across calls.

**Business Intent / Invariant Guarded:** Reading always finishes with bounded memory, and a skip is never silent (BR-GWF-11).

**Traces:** AC-GWF-17 / BR-GWF-11

**Preconditions:**

- Injected limits: 64 KB per read, 128 KB per record
- A normal record, a 100 KB record, a 300 KB record and another normal record

**Real-World Reachability:** A tool result so large its record exceeds any sensible limit.

**Demo Flow:** Read in full and incrementally; then append to an unterminated oversized record and read again.

```gherkin
Given the injected limits and the four records
When usage is read in full and incrementally
Then each call ends, no single read exceeds 64 KB and no carried part exceeds 128 KB
And the normal records and the 100 KB record count, the 300 KB record does not, and one skipped record is reported
And a following call with no growth reads nothing
Given a 300 KB record still unterminated at the end
When read, and read again after its end and one normal record are appended
Then the first call stops at the end still skipping, and the second counts only the normal record
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Skips and counts                                                                                                                                                                   |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Totals and a skipped-record count of 1                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Bounded memory
- ✅ Skip counted
- ❌ Endless loop
- ❌ Unbounded buffer
- ❌ Silent skip

**Test Data:**

```yaml
inputDomain: 'any record sizes under any limits'
invariant: 'for ALL of them every call ends and memory stays within one read plus one record limit'
boundaryCounterCase: 'a record one byte over the limit → skipped and counted'
```

```json
{
    "readLimitKB": 64,
    "recordLimitKB": 128,
    "recordsKB": [1, 100, 300, 1]
}
```

**Edge Cases:**

- A record exactly at the limit → counted

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks-lib/bounded-usage-read]`
> **Related Behaviors:** `constraint/hooks-lib/bounded-usage-read`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage.test.cjs::TC-GWF-056` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage.test.cjs:253` (passed in P17; not re-run at the final gate)

---

### Usage Report Tests

> Report, comparison and privacy of printed output (US-GWF-06).

#### TC-GWF-031: Comparing two runs shows per-figure differences [P1]

**Objective:** Prove the comparison prints both runs' figures with differences and percentages, the total as new input + cache writes + output, and cache reads on their own line marked "not in total".

**Business Intent / Invariant Guarded:** Route decisions compare like with like (BR-GWF-10).

**Traces:** AC-GWF-18 / BR-GWF-10

**Preconditions:**

- Two run records

**Real-World Reachability:** Comparing the lean route with the full feature route.

**Demo Flow:** Print the comparison.

```gherkin
Given two runs
When they are compared
Then each figure prints for both runs with its difference and percentage
And each run's total equals new input + cache writes + output
And cache reads print on their own line marked "not in total"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Compares                                                                                                                                                                           |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Figures, differences, percentages                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ Correct total and separate cache line
- ❌ Cache reads in the total

**Edge Cases:**

- One unreadable run → "unreadable" for it, never a guessed figure

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/session-usage-report]`
> **Related Behaviors:** `operation/scripts/session-usage-report`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage-report.test.cjs::TC-GWF-031` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage-report.test.cjs:105` (passed in P46; not re-run at the final gate)

---

#### TC-GWF-032: The usage report never shows conversation or command text [P0]

**Objective:** Prove that a fake secret in message text and in a command never reaches the report, in text or structured output.

**Business Intent / Invariant Guarded:** A usage report is safe to share (BR-GWF-17).

**Traces:** AC-GWF-18 / BR-GWF-17

**Preconditions:**

- A run whose messages and a command hold a fake secret

**Real-World Reachability:** A developer pastes a key into a prompt, then shares a usage report.

**Demo Flow:** Print the report both ways and search for the secret.

```gherkin
Given a run whose messages and a command contain a fake secret
When the report is printed as text and as structured output
Then neither output contains the secret
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Prints only allowed fields                                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Counts, agent labels, tool and skill names                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Secret absent both ways
- ❌ Secret present

**Test Data:**

```yaml
inputDomain: 'any text inside messages or commands'
invariant: 'for ALL of it none appears in the report'
boundaryCounterCase: 'a skill name outside the allowed form → printed as "other"'
```

```json
{
    "fakeSecret": "sk-test-FAKE"
}
```

**Edge Cases:**

- A tool name → printed; its input → never

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/scripts/usage-report-allowlist]`
> **Related Behaviors:** `constraint/scripts/usage-report-allowlist`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage-report.test.cjs::TC-GWF-032` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage-report.test.cjs:156` (passed in P46; not re-run at the final gate)

---

#### TC-GWF-033: The deviation log prints step and kind only, and a hostile run identity is refused [P0]

**Objective:** Prove the printed deviation log omits evidence text and that a run identity pointing outside the run area is refused before any read.

**Business Intent / Invariant Guarded:** Evidence notes stay private and the report cannot read outside its area (BR-GWF-17, BR-GWF-08).

**Traces:** AC-GWF-18 / BR-GWF-17 / BR-GWF-08

**Preconditions:**

- A deviation log whose evidence column holds free text

**Real-World Reachability:** A report printed for a run that closed on a review report.

**Demo Flow:** Print the log; then ask for a run identity that climbs out of the run area.

```gherkin
Given a deviation log with free-text evidence
When it is printed
Then each line shows only the step identifier and the deviation kind
Given a run identity that points outside the run area
When it is requested
Then the report refuses with a failure and reads nothing
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Prints safely; refuses hostile identity                                                                                                                                            |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Step and kind per line; refusal message                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Evidence absent
- ✅ Hostile identity refused
- ❌ Evidence printed
- ❌ File outside the area read

**Test Data:**

```yaml
inputDomain: 'any run identity text'
invariant: 'for ALL values outside the allowed form the report refuses before reading'
boundaryCounterCase: 'a parent-directory step → refused'
```

**Edge Cases:**

- A line with an unknown kind → printed as an invalid line
- No log for the run → "no skip log"

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/scripts/usage-report-allowlist]`
> **Related Behaviors:** `constraint/scripts/usage-report-allowlist`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage-report.test.cjs::TC-GWF-033` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage-report.test.cjs:191` (passed in P46; not re-run at the final gate)

---

#### TC-GWF-054: Skill loads are summed across the main session and sub-agents [P1]

**Objective:** Prove effective steps count skill loads made inside sub-agents.

**Business Intent / Invariant Guarded:** A nested review's steps are counted, so route costs are compared fairly (BR-GWF-07).

**Traces:** AC-GWF-18 / BR-GWF-07

**Preconditions:**

- A main session with 2 skill loads and a sub-agent with 3, one skill shared

**Real-World Reachability:** A feature run whose review runs its reviewers as sub-agents.

**Demo Flow:** Print the skill-load rows.

```gherkin
Given 2 skill loads in the main session and 3 in a sub-agent, one skill in both
When the report is printed
Then the rows sum both per skill name
And the effective-step total is 5
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Sums skill loads                                                                                                                                                                   |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Per-skill rows; total 5                                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Total 5
- ❌ Total 2 or 3

**Test Data:**

```json
{
    "mainLoads": 2,
    "subAgentLoads": 3,
    "effectiveSteps": 5
}
```

**Edge Cases:**

- A sub-agent with no skill load → no row

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/session-usage-report]`
> **Related Behaviors:** `operation/scripts/session-usage-report`
> **CoveredBy:** `.claude/hooks/tests/suites/session-usage-report.test.cjs::TC-GWF-054` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/session-usage-report.test.cjs:256` (passed in P46; not re-run at the final gate)

---

### Spend Checkpoint Tests

> Advisory note once per threshold (US-GWF-05).

#### TC-GWF-034: Crossing 500,000 tokens shows one note [P1]

**Objective:** Prove a note with the total appears when the usage total reaches 520,000 against a 500,000 threshold.

**Business Intent / Invariant Guarded:** The developer learns the spend at a step boundary (BR-GWF-06).

**Traces:** AC-GWF-15 / BR-GWF-06

**Preconditions:**

- Usage total 520,000; threshold 500,000; checkpoint on

**Real-World Reachability:** A long feature run.

**Demo Flow:** Update a task and read the added note.

```gherkin
Given a usage total of 520,000 and a threshold of 500,000
When a task is updated
Then one note appears with the total
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Adds a note                                                                                                                                                                        |
| **Business data state** | Threshold 500,000 recorded as noted                                                                                                                                                |
| **Data shown on UI**    | The note                                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ One note
- ❌ No note
- ❌ Two notes

**Edge Cases:**

- Exactly 500,000 → the note appears

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-034` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:147` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-035: A threshold already noted produces no second note [P1]

**Objective:** Prove the same threshold never fires twice.

**Business Intent / Invariant Guarded:** The note stays advisory, not noise (BR-GWF-06).

**Traces:** AC-GWF-15 / BR-GWF-06

**Preconditions:**

- Threshold 500,000 already noted

**Real-World Reachability:** Several task updates after crossing.

**Demo Flow:** Update a task again.

```gherkin
Given the 500,000 threshold already noted
When a task is updated again below 1,000,000
Then no note appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Stays silent                                                                                                                                                                       |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Nothing                                                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Silence
- ❌ Repeat note

**Test Data:**

```yaml
inputDomain: 'any sequence of task updates'
invariant: 'for ALL sequences each threshold is noted at most once'
boundaryCounterCase: 'the stored mark lost → noted again once, never more'
```

**Edge Cases:**

- A session resumed later → the stored mark still applies

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-035` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:164` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-036: Crossing 1,000,000 tokens shows a second note [P1]

**Objective:** Prove the next multiple of the threshold fires its own note.

**Business Intent / Invariant Guarded:** Each threshold crossed is noted once (BR-GWF-06).

**Traces:** AC-GWF-15 / BR-GWF-06

**Preconditions:**

- Threshold 500,000 noted; total reaches 1,000,000

**Real-World Reachability:** A very long run.

**Demo Flow:** Update a task after the total passes 1,000,000.

```gherkin
Given 500,000 noted and a total past 1,000,000
When a task is updated
Then a second note appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Adds a note                                                                                                                                                                        |
| **Business data state** | Threshold 1,000,000 recorded                                                                                                                                                       |
| **Data shown on UI**    | The second note                                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Second note
- ❌ No note

**Edge Cases:**

- A jump past two thresholds at once → one note naming the highest

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-036` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:179` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-037: A disabled checkpoint reads nothing and shows nothing [P1]

**Objective:** Prove turning the checkpoint off stops both the read and the note.

**Business Intent / Invariant Guarded:** A project can turn the checkpoint off at no cost (BR-GWF-06).

**Traces:** AC-GWF-16 / BR-GWF-06

**Preconditions:**

- Checkpoint turned off

**Real-World Reachability:** A team that does not want the notes.

**Demo Flow:** Update a task and check output and reads.

```gherkin
Given the checkpoint is off
When a task is updated
Then nothing appears and the session record is not read
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Does nothing                                                                                                                                                                       |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Nothing                                                                                                                                                                            |

**Acceptance Criteria:**

- ✅ No output, no read
- ❌ Any output or read

**Edge Cases:**

- Turned back on → the next crossing is noted

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-037` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:195` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-038: An unreadable session record fails open [P1]

**Objective:** Prove the checkpoint never stops a run when it cannot read usage.

**Business Intent / Invariant Guarded:** An advisory feature never blocks work (BR-GWF-06).

**Traces:** AC-GWF-16 / BR-GWF-06

**Preconditions:**

- A session record that cannot be read, or another host's format

**Real-World Reachability:** Hosts whose session records the reader does not understand.

**Demo Flow:** Update a task.

```gherkin
Given an unreadable session record
When a task is updated
Then the step continues and nothing appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Fails open                                                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | Nothing                                                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Continues silently
- ❌ Blocks
- ❌ Guessed figure

**Edge Cases:**

- A missing record → the same

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-038` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:215` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-039: Every note is at most 600 characters [P2]

**Objective:** Prove the note length limit.

**Business Intent / Invariant Guarded:** A note never crowds the context (BR-GWF-06).

**Traces:** AC-GWF-16 / BR-GWF-06

**Preconditions:**

- Large totals and step counts

**Real-World Reachability:** Any note.

**Demo Flow:** Measure the note.

```gherkin
Given any note
When it is measured
Then it is at most 600 characters
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Short note                                                                                                                                                                         |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The note                                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ At most 600
- ❌ Longer

**Edge Cases:**

- A nine-digit total → still within the limit

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/checkpoint-note-length]`
> **Related Behaviors:** `constraint/hooks/checkpoint-note-length`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-039` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:233` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-040: Sub-agent usage counts toward the checkpoint [P1]

**Objective:** Prove sub-agent tokens are part of the checkpoint total.

**Business Intent / Invariant Guarded:** Spend done in helpers is not hidden (BR-GWF-07).

**Traces:** AC-GWF-15 / BR-GWF-07

**Preconditions:**

- Main usage below the threshold; main plus sub-agents above it

**Real-World Reachability:** A review run by sub-agents.

**Demo Flow:** Update a task.

```gherkin
Given main usage below and combined usage above the threshold
When a task is updated
Then a note appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Includes sub-agents                                                                                                                                                                |
| **Business data state** | Threshold recorded                                                                                                                                                                 |
| **Data shown on UI**    | The note                                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Note appears
- ❌ No note

**Edge Cases:**

- A sub-agent started after the last read → included on the next read

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-040` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:247` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-050: A checkpoint note carries only counts [P0]

**Objective:** Prove a note shows only the total, the threshold and the completed-step count, never a secret or a task subject.

**Business Intent / Invariant Guarded:** A note never leaks content into the context or a shared log (BR-GWF-17).

**Traces:** AC-GWF-16 / BR-GWF-17

**Preconditions:**

- A session whose messages and tool inputs hold a fake secret; a task subject "Refactor billing"

**Real-World Reachability:** Any run with sensitive content.

**Demo Flow:** Trigger a note and read it.

```gherkin
Given a fake secret in messages and tool inputs and a task subject
When a note fires
Then its only variable values are the total, the threshold and the completed-step count
And neither the secret nor the task subject appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Fixed text plus three counts                                                                                                                                                       |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The note                                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Counts only
- ❌ Secret or subject present

**Test Data:**

```yaml
inputDomain: 'any session content'
invariant: 'for ALL content the note varies only in three counts'
boundaryCounterCase: 'a task subject containing digits → still absent'
```

```json
{
    "fakeSecret": "sk-test-FAKE",
    "taskSubject": "Refactor billing"
}
```

**Edge Cases:**

- The note names the metric as tokens the run added

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/hooks/checkpoint-note-content]`
> **Related Behaviors:** `constraint/hooks/checkpoint-note-content`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-050` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:259` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-053: The checkpoint fires at the same step boundaries as task tracking [P2]

**Objective:** Prove the checkpoint is registered on its own at exactly the task-list update moments.

**Business Intent / Invariant Guarded:** Notes arrive between steps, never mid-edit (BR-GWF-06).

**Traces:** AC-GWF-15 / BR-GWF-06

**Preconditions:**

- The framework's shipped settings; runs only inside the framework repository, reported as skipped elsewhere

**Real-World Reachability:** Every task-list update.

**Demo Flow:** Read the registration.

```gherkin
Given the shipped settings
When the checkpoint registration is read
Then it is its own entry and fires on exactly the same task-list update moments as task tracking
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Same boundaries                                                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                                          |
| **Data shown on UI**    | The registration                                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Same moments, own entry
- ❌ Different moments
- ❌ Shared entry

**Edge Cases:**

- Outside the framework repository → reported as skipped with its reason, never as a pass

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/token-budget-checkpoint]`
> **Related Behaviors:** `operation/hooks/token-budget-checkpoint`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-053` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:282` (passed in P18; not re-run at the final gate)

---

#### TC-GWF-055: Cache reads never trigger a checkpoint [P0]

**Objective:** Prove 6,000,000 cache-read tokens with 200,000 non-cached tokens produce no note, and one note appears only when the non-cached total passes 500,000.

**Business Intent / Invariant Guarded:** The checkpoint measures what the run adds, not what it re-reads (BR-GWF-06).

**Traces:** AC-GWF-15 / BR-GWF-06

**Preconditions:**

- 40 responses, each 150,000 cache reads and 5,000 non-cached tokens; threshold 500,000

**Real-World Reachability:** Cache reads alone reach tens of millions per long session.

**Demo Flow:** Update a task after each response, then append 61 more responses.

```gherkin
Given 40 responses totalling 6,000,000 cache reads and 200,000 non-cached tokens
When a task is updated after each response
Then no note appears and the stored total is 200,000
When 61 more such responses are appended, reaching 505,000 non-cached tokens
Then exactly one note appears
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Ignores cache reads                                                                                                                                                                |
| **Business data state** | Total 505,000; one threshold noted                                                                                                                                                 |
| **Data shown on UI**    | One note at the end                                                                                                                                                                |

**Acceptance Criteria:**

- ✅ No note on cache reads
- ✅ One note at 505,000
- ❌ A note from cache reads

**Test Data:**

```yaml
inputDomain: 'any mix of cache reads and non-cached tokens'
invariant: 'for ALL mixes notes follow only the non-cached total'
boundaryCounterCase: 'non-cached total one token below the threshold → no note'
```

```json
{
    "responses": 40,
    "cacheReadEach": 150000,
    "nonCachedEach": 5000,
    "appended": 61,
    "threshold": 500000
}
```

**Edge Cases:**

- Cache writes count toward the total

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/checkpoint-metric]`
> **Related Behaviors:** `rule/hooks/checkpoint-metric`
> **CoveredBy:** `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs::TC-GWF-055` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/token-budget-checkpoint.test.cjs:302` (passed in P18; not re-run at the final gate)

---

### Session Report Tests

> The session report opener that every workflow's final summary uses (US-GWF-08, BR-GWF-18).

#### TC-GWF-063: A report opens only from the project's temporary work area [P0]

**Objective:** Prove that only an existing file inside the project's temporary work area opens, judged on the real file after following links.

**Business Intent / Invariant Guarded:** A file elsewhere on the machine can never be opened through the summary step (BR-GWF-18).

**Traces:** AC-GWF-24 / BR-GWF-18

**Preconditions:**

- A project with a temporary work area, a report inside it, a file outside it, and a link inside it that points outside

**Real-World Reachability:** Every workflow run ends with the session summary.

**Demo Flow:** Ask the opener to open each path.

```gherkin
Given a report inside the temporary work area, a file outside it, a missing file and a link inside the area that points outside
When each is opened
Then only the report inside the area opens
And the others are refused with their reason and nothing runs
```

**Expected Result:**

| Dimension               | Expectation |
| ----------------------- | ----------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Opens or refuses |
| **Business data state** | No change |
| **Data shown on UI**    | The opened path, or "not opened" with the reason |

**Acceptance Criteria:**

- ✅ The report inside the area opens
- ❌ A file outside the area opens
- ❌ A link that leaves the area opens

**Edge Cases:**

- A directory instead of a file → refused

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/open-report-containment]`
> **Related Behaviors:** `rule/scripts/open-report-containment`
> **CoveredBy:** `.claude/scripts/tests/open-report.test.cjs::TC-OR-003`, `.claude/scripts/tests/open-report.test.cjs::TC-OR-004` · **Status:** Implemented — evidence: `.claude/scripts/tests/open-report.test.cjs:107` (passed in the fix round; not re-run at the final gate)

---

#### TC-GWF-064: Only report file types open; scripts and launchers never do [P0]

**Objective:** Prove that a script or program launcher inside the work area is refused and nothing runs, whatever its letter case.

**Business Intent / Invariant Guarded:** The default viewer runs scripts, so only display-only report types may reach it (BR-GWF-18).

**Traces:** AC-GWF-24 / BR-GWF-18

**Preconditions:**

- Script and launcher files inside the temporary work area

**Real-World Reachability:** Downloaded artifacts and test output land in the work area.

**Demo Flow:** Ask the opener to open each script or launcher.

```gherkin
Given a command script, a batch file, a shortcut and a launcher file inside the work area
When each is opened
Then each is refused as an unsupported report type
And nothing is started
```

**Expected Result:**

| Dimension               | Expectation |
| ----------------------- | ----------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Refuses |
| **Business data state** | No change |
| **Data shown on UI**    | "not opened (unsupported report type)" |

**Acceptance Criteria:**

- ✅ Every script or launcher refused
- ❌ Any of them started

**Edge Cases:**

- An upper-case report type (for example a web page named in capitals) → opens

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/open-report-types]`
> **Related Behaviors:** `rule/scripts/open-report-types`
> **CoveredBy:** `.claude/scripts/tests/open-report.test.cjs::TC-OR-007` · **Status:** Implemented — evidence: `.claude/scripts/tests/open-report.test.cjs:176` (passed in the fix round; not re-run at the final gate)

---

#### TC-GWF-065: A risky path is refused and opening never stops the run [P1]

**Objective:** Prove that a path the command line would reinterpret is refused, that a failed launch is reported rather than fatal, and that the command always succeeds.

**Business Intent / Invariant Guarded:** Opening a report is a convenience; it never runs injected text and never breaks the run (BR-GWF-18).

**Traces:** AC-GWF-24 / AC-GWF-25 / BR-GWF-18

**Preconditions:**

- A report path containing command-line metacharacters, a viewer that fails to start, and valid, refused and missing arguments

**Real-World Reachability:** A report named from user or tool text.

**Demo Flow:** Open each path and read the result.

```gherkin
Given a report path containing characters the command line would reinterpret
When it is opened
Then it is refused and nothing runs
Given a viewer that fails to start
Then the failure is reported and the run continues
And the command succeeds for a valid, a refused and a missing argument
```

**Expected Result:**

| Dimension               | Expectation |
| ----------------------- | ----------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Refuses or reports; never fails |
| **Business data state** | No change |
| **Data shown on UI**    | "not opened" with the reason, and the path |

**Acceptance Criteria:**

- ✅ Risky path refused
- ✅ Launch failure reported, never fatal
- ❌ The command fails the run

**Edge Cases:**

- No argument at all → reported, the command still succeeds

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/open-report-never-fatal]`
> **Related Behaviors:** `rule/scripts/open-report-never-fatal`
> **CoveredBy:** `.claude/scripts/tests/open-report.test.cjs::TC-OR-005`, `.claude/scripts/tests/open-report.test.cjs::TC-OR-006` · **Status:** Implemented — evidence: `.claude/scripts/tests/open-report.test.cjs:158` (passed in the fix round; not re-run at the final gate)

---

#### TC-GWF-066: Nothing opens in CI, when auto-open is off, or without a display [P1]

**Objective:** Prove the skip conditions and that, otherwise, the platform's own default viewer is used with the path passed as a separate value.

**Business Intent / Invariant Guarded:** Automated and headless runs never try to open a window, and the developer can always find the report (BR-GWF-18).

**Traces:** AC-GWF-25 / BR-GWF-18

**Preconditions:**

- Continuous integration set; auto-open turned off; a Linux machine with no display; and each supported platform

**Real-World Reachability:** Every automated run and every developer machine.

**Demo Flow:** Open a report under each condition.

```gherkin
Given continuous integration, auto-open turned off, or a Linux machine with no display
When a report is opened
Then nothing opens and the path is printed
Given none of these
Then the platform's default viewer opens it
```

**Expected Result:**

| Dimension               | Expectation |
| ----------------------- | ----------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | Skips or opens |
| **Business data state** | No change |
| **Data shown on UI**    | The path in every case |

**Acceptance Criteria:**

- ✅ Nothing opens under each skip condition
- ✅ The platform's own viewer otherwise
- ❌ A window opens in continuous integration

**Edge Cases:**

- An unknown platform → nothing opens; the path is printed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/open-report-skip]`
> **Related Behaviors:** `rule/scripts/open-report-skip`
> **CoveredBy:** `.claude/scripts/tests/open-report.test.cjs::TC-OR-002`, `.claude/scripts/tests/open-report.test.cjs::TC-OR-001` · **Status:** Implemented — evidence: `.claude/scripts/tests/open-report.test.cjs:83` (passed in the fix round; not re-run at the final gate)

---

#### TC-GWF-067: The session summary opens its report only through the safe opener [P1]

**Objective:** Prove that the session summary step opens its report through the safe opener and states that only reports in the temporary work area open, printing the path otherwise.

**Business Intent / Invariant Guarded:** The final step of every workflow inherits the opener's safety rules instead of opening files its own way (BR-GWF-18).

**Traces:** AC-GWF-24 / AC-GWF-25 / BR-GWF-18

**Preconditions:**

- The session summary step's instructions

**Real-World Reachability:** The last step of every workflow run.

**Demo Flow:** Read the summary step's open instructions.

```gherkin
Given the session summary step's instructions
When the report-open step is read
Then it opens the report through the safe opener and announces the path
And it states that only reports in the temporary work area open, and the path is printed otherwise
```

**Expected Result:**

| Dimension               | Expectation |
| ----------------------- | ----------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the run's deviation log, registry validation messages and command output |
| **System behavior**     | States the open rule |
| **Business data state** | No change |
| **Data shown on UI**    | The report path |

**Acceptance Criteria:**

- ✅ Opened through the safe opener
- ❌ The report opened by any other means

**Edge Cases:**

- A report written outside the work area → printed, not opened

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/watzup-report-open]`
> **Related Behaviors:** `rule/skills/watzup-report-open`
> **CoveredBy:** `.claude/hooks/tests/suites/watzup-session-summary.test.cjs::TC-WSS-006`, `.claude/hooks/tests/suites/watzup-session-summary.test.cjs::TC-WSS-010` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/watzup-session-summary.test.cjs:170` (passed in the fix round; not re-run at the final gate)

---

_Feature Spec — tech-free 8-section template v4.0_
