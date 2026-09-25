---
module: 'hooks'
service: 'framework.ContextDelivery'
feature_code: 'WFR'
entities: ['Workflow', 'ActivationPolicy', 'RoutingGuidance', 'RootInstructionFile']
status: draft
owner: 'Framework maintainers'
last_updated: '2026-09-25'
scope_mode: FRAMEWORK-LIBRARY
large_idea_decomposition: null
roadmap: null
milestone_id: null
scope_brief: null
roadmap_status: null
---

# Workflow Routing — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> Technical identifiers live only in frontmatter, Related Documentation and the Section 8 hidden carriers.

## Related Documentation

| Type                 | Path                                                                                                                                                                                                                                                                                                                               | Description                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Spec Index (derived) | `docs/specs/ContextDelivery/INDEX.md`                                                                                                                                                                                                                                                                                              | Generated navigation catalog for this bucket; refresh through the spec index owner. |
| Routing gate text    | `.claude/skills/shared/workflow-first-gate.md`                                                                                                                                                                                                                                                                                     | The routing gate the root instruction files and the guidance carry.                 |
| Workflow registry    | `.claude/workflows.json`                                                                                                                                                                                                                                                                                                           | Workflow names, framework activation tiers, steps and parallel phases.              |
| Project settings     | `docs/project-config.json` (`portability.workflowAutoDetect`, `portability.workflowActivation`), `.claude/.ck.local.json`                                                                                                                                                                                                          | Team switches and the developer personal file.                                      |
| Test suites          | `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs`, `.claude/hooks/tests/suites/content-presence.test.cjs`, `.claude/scripts/codex/tests/verify-workflow-cycle-compliance.test.mjs` | Executors for Section 8.                                                            |

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

Before each prompt the assistant receives short routing guidance: the rule that it must choose how to handle the request first, and a catalog of the project's workflows with the activation tier of each. Guidance larger than the host shows in one added message reaches the assistant only as its first part; this capability keeps the guidance inside the host limit, stops repeating the routing rule when the always-loaded root instruction file already carries it, and never drops the marks that make parallel quality steps finish together. It also lets a project decide how freely workflows may start by themselves — one project-wide default that can only make tiers stricter, plus explicit per-workflow choices — while an explicit request from the user still runs any workflow.

---

## 2. Glossary

| Term                     | Definition                                                                                                                                                            | Context                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow                 | A named sequence of steps the assistant can run for a kind of request                                                                                                 | Defined by the framework or the project                                                                                               |
| Routing Guidance         | The text added before each prompt: the routing gate (or a pointer to it) and the workflow catalog                                                                     | Rebuilt for each prompt; shown once per conversation until it may have faded                                                          |
| Routing Gate             | The rule block telling the assistant to choose its route before acting                                                                                                | Also carried by the root instruction files                                                                                            |
| Root Instruction File    | An always-loaded project instruction file an assistant host reads at session start                                                                                    | One per host family; a project may have one or two                                                                                    |
| Primary Host Root File   | The root instruction file of the primary assistant host                                                                                                               | Must exist before the gate body is left out, because that host does not read another host's root file on every version and deployment |
| Gate Marker              | A fixed line that shows a root instruction file carries the routing gate                                                                                              | Its presence decides whether the gate body is repeated                                                                                |
| Workflow Catalog         | The list of workflows with name, activation tier, step count and a short hint                                                                                         | Compact in the guidance; full in the root instruction files                                                                           |
| Parallel Phase           | A group of steps that start together and all must finish before the next step                                                                                         | Shown as a parallel-phase mark in a catalog row                                                                                       |
| Advancement Rule         | The sentence "advance only after ALL return" that governs parallel phases                                                                                             | Always part of the guidance                                                                                                           |
| Activation Tier          | How freely a workflow may start: auto (the assistant may select and start it), confirm (ask the user once first), manual (never start it without an explicit request) | Ordered auto < confirm < manual                                                                                                       |
| Framework Tier           | The tier the framework gives a workflow                                                                                                                               | Starting point before project settings                                                                                                |
| Project Default Tier     | A project-wide tier that raises every workflow to at least that tier                                                                                                  | Optional; can only tighten                                                                                                            |
| Workflow Override        | A project's explicit tier for one named workflow                                                                                                                      | Optional; may loosen or tighten                                                                                                       |
| Effective Tier           | The tier that applies after the framework tier, the project default and any override                                                                                  | What the catalog shows and the assistant obeys                                                                                        |
| Size Cap                 | The largest message the host shows in full when a prompt gains added context: 10,000 characters                                                                       | Guidance must stay at or below 9,500 characters                                                                                       |
| Guidance Form            | How much of the catalog the guidance carries: the compact catalog, an index with tiers and parallel-phase marks, an index with tiers only, or a pointer only          | The first form that fits the size cap is used                                                                                         |
| Workflow Pointer         | A line saying that starting a workflow resolves its full list and steps from the workflow registry                                                                    | Present in every guidance form                                                                                                        |
| Automatic Routing Switch | The project setting that turns automatic route selection on or off                                                                                                    | On unless a project turns it off                                                                                                      |
| Off Notice               | The text shown instead of the guidance when automatic routing is off                                                                                                  | Tells the assistant to run workflows only on explicit request                                                                         |
| Personal File            | The developer's own untracked settings file, read after the team configuration                                                                                        | A valid value there wins over the team value                                                                                          |

---

## 3. User Stories & Acceptance Criteria

### US-WFR-01: Routing guidance the assistant can read in full

**As an** AI assistant receiving a prompt
**I want** the routing guidance to fit in what the host shows me
**So that** my choice of route rests on the whole catalog, not on its first part

**Acceptance Criteria:**

- **AC-WFR-01** — **Given** automatic routing is on **When** a prompt is received **Then** the guidance is at most 9,500 characters, uses the compact catalog naming every workflow with its effective tier whenever that fits, and otherwise the first shorter guidance form that fits; when the gate part plus the project's route protocol keep even the pointer-only form over the cap, that form is still delivered with the protocol whole
- **AC-WFR-02** — **Given** the compact catalog **When** it is rendered **Then** each row shows name, tier, step count and a hint of at most 140 characters, never the full step list, and the step skills appear as one line of names; a workflow with several modes shows its step count as a range and prefixes each mode's parallel-phase marks with the mode name
- **AC-WFR-13** — **Given** the guidance was already delivered in this conversation **When** the next prompt is received **Then** it is not repeated, unless the conversation was compacted since the delivery — recorded by either host in its own form — in which case it is delivered again, once; the word "compacted" appearing only inside another record is not a compaction

### US-WFR-02: The routing gate is carried once, never lost

**As a** framework maintainer
**I want** the routing gate left out of the per-prompt guidance only when the root instruction files, including the primary host's, already carry it
**So that** the assistant is not charged twice for the same rule and never loses it

**Acceptance Criteria:**

- **AC-WFR-03** — **Given** the primary host root file exists and every root instruction file present carries the gate marker **When** the guidance is built **Then** the gate body is left out, and the marker line plus one pointer line are kept
- **AC-WFR-04** — **Given** no primary host root file, a present root instruction file without the gate marker, or a present root instruction file that cannot be read **When** the guidance is built **Then** the full gate is included
- **AC-WFR-05** — **Given** any workflow with parallel phases **When** the guidance is built in the compact catalog or the index with parallel-phase marks **Then** its row keeps at least one parallel-phase mark per phase, and in every guidance form the guidance states the advancement rule

### US-WFR-03: A project controls which workflows start by themselves

**As a** project maintainer adopting the framework
**I want** one default tier and optional per-workflow tiers
**So that** my team gets no surprise workflow starts without editing the framework

**Acceptance Criteria:**

- **AC-WFR-06** — **Given** a project default tier **When** a workflow's effective tier is resolved **Then** it is the stricter of its framework tier and the default
- **AC-WFR-07** — **Given** a workflow override **When** that workflow's effective tier is resolved **Then** it is the override, even when that loosens it
- **AC-WFR-08** — **Given** a default or override that is not auto, confirm or manual **When** the configuration is validated **Then** an error names the setting and the allowed tiers
- **AC-WFR-09** — **Given** project tier settings **When** the catalog is rendered **Then** every row shows the effective tier
- **AC-WFR-10** — **Given** a valid value in the developer personal file **When** the routing switch or a tier is resolved **Then** it wins over the team value
- **AC-WFR-11** — **Given** any tier **When** the user explicitly asks for a workflow **Then** it runs, and every routing surface says so

### US-WFR-04: Routing can be switched off

**As a** project maintainer
**I want** switching automatic routing off to keep working as before
**So that** my team decides every workflow start itself

**Acceptance Criteria:**

- **AC-WFR-12** — **Given** automatic routing is off **When** a prompt is received **Then** the off notice is shown and no catalog or gate is added; it tells the assistant not to choose or start a workflow by itself, to run one only on explicit request, and that every quality gate still binds

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                                                                                                                                  | Category     | Enforcement |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| BR-WFR-01 | Guidance within the size cap, with ordered shorter forms                                                                                              | Presentation | [HARD]      |
| BR-WFR-02 | Compact catalog content                                                                                                                               | Presentation | [HARD]      |
| BR-WFR-03 | Gate payload: body left out only when the primary host root file exists and every root file carries it; marker, advancement rule and phase marks kept | Presentation | [HARD]      |
| BR-WFR-04 | Effective tier: default only tightens, override is explicit                                                                                           | Activation   | [HARD]      |
| BR-WFR-05 | Layered settings: framework, team, personal                                                                                                           | Activation   | [HARD]      |
| BR-WFR-06 | Explicit requests run every tier                                                                                                                      | Activation   | [HARD]      |
| BR-WFR-07 | Only known tiers are accepted                                                                                                                         | Validation   | [HARD]      |
| BR-WFR-08 | Off notice replaces the guidance and keeps its promise                                                                                                | Activation   | [HARD]      |
| BR-WFR-09 | Delivered once per conversation; re-armed after a context compaction on both hosts                                                                    | Delivery     | [HARD]      |

### BR-WFR-01: Guidance within the size cap [HARD]

**Statement:** The routing guidance added to a prompt is at most 9,500 characters, leaving margin under the host's 10,000-character cap, with the single exception stated at the end of this rule. The guidance uses the first of these forms that fits: the compact catalog (BR-WFR-02); an index with each workflow's name, effective tier and parallel-phase marks; an index with each workflow's name and effective tier only; a pointer only, with no workflow rows. Every form keeps the gate part (BR-WFR-03), the advancement rule and the workflow pointer. A project's own route protocol is never dropped or cut. The size is measured on the whole guidance — gate part, catalog form and protocol together — so when the gate part plus the project protocol keep even the pointer-only form over the cap, that form is still delivered with the protocol whole; this is the only case in which the guidance exceeds 9,500 characters.

| Compact catalog fits | Index with phase marks fits | Index with tiers fits | Form used                                                                               |
| -------------------- | --------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| Yes                  | —                           | —                     | compact catalog                                                                         |
| No                   | Yes                         | —                     | index with tiers and parallel-phase marks                                               |
| No                   | No                          | Yes                   | index with tiers only                                                                   |
| No                   | No                          | No                    | pointer only (delivered even when the gate part plus the protocol keep it over the cap) |

### BR-WFR-02: Compact catalog content [HARD]

**Statement:** Each catalog row in the guidance shows the workflow name, its effective tier, its step count and a when-to-use hint of at most 140 characters. Full step lists are left out: starting a workflow resolves its full sequence before any work begins. A workflow with parallel phases keeps only its parallel-phase marks in the last column. The step skills appear as a single line of names. The tier legend stays. A workflow with several modes shows its step count as the range from its shortest to its longest mode, and each parallel-phase mark is prefixed with the name of the mode it belongs to; a mode without parallel phases adds no mark. The index with parallel-phase marks prefixes its marks the same way.

### BR-WFR-03: Gate payload [HARD]

**Statement:** The guidance leaves out the routing gate body only when the primary host root file exists and every root instruction file present carries the gate marker near its start. The guidance cannot tell which host reads it, and each host loads a different root instruction file, so one file without the marker is enough to keep the body. Another host's root file alone never suppresses the body, because the primary host does not read that file on every version and deployment. A root instruction file that is present but cannot be read counts as not carrying the marker. When the body is left out, the guidance carries the marker line and one line saying the gate is in the root instruction file. In every case the guidance keeps the gate marker and the advancement rule ("advance only after ALL return"). In the compact catalog and in the index with parallel-phase marks, every row of a workflow with parallel phases keeps at least one parallel-phase mark per phase. The index with tiers only and the pointer-only form, used only when those do not fit (BR-WFR-01), list no phase marks; the phases reach the assistant when the workflow starts. The workflow-cycle consistency check that reads the delivered guidance therefore verifies phase-mark parity only when the guidance uses the compact catalog or the index with parallel-phase marks; it still requires the advancement rule in every form.

```
IF the primary host root file exists
   AND every present root instruction file can be read and carries the gate marker
  → gate part = marker line + pointer line
ELSE
  → gate part = full gate
ALWAYS → keep the marker and the advancement rule
IF form is compact catalog OR index with phase marks
  → keep every parallel-phase mark
```

| Root instruction files present                              | All readable and carry the marker    | Gate part             | Marker and advancement rule |
| ----------------------------------------------------------- | ------------------------------------ | --------------------- | --------------------------- |
| none                                                        | —                                    | full gate             | kept                        |
| another host's file only, no primary host root file         | any                                  | full gate             | kept                        |
| primary host root file, with or without another host's file | No, or a present file cannot be read | full gate             | kept                        |
| primary host root file, with or without another host's file | Yes                                  | marker + pointer line | kept                        |

A root instruction file that carries the marker but an outdated gate still suppresses the body; regenerating the root instruction files is the remedy.

### BR-WFR-04: Effective tier [HARD]

**Statement:** Tiers are ordered auto < confirm < manual. A workflow's effective tier is its override when the project names it; otherwise the stricter of its framework tier and the project default tier. Without a default and an override, the framework tier applies unchanged. The catalog and the assistant use the effective tier.

| Override set | Default set | Effective tier                             |
| ------------ | ----------- | ------------------------------------------ |
| Yes          | any         | the override                               |
| No           | Yes         | the stricter of framework tier and default |
| No           | No          | the framework tier                         |

### BR-WFR-05: Layered settings [HARD]

**Statement:** The automatic routing switch and the tier settings are read in layers: framework default, then the team project configuration, then the developer's personal file. A later valid value wins; a missing, unreadable or invalid value expresses no opinion. The routing switch and the project default tier each take the value of the latest layer that sets them validly. Overrides merge per workflow: a personal override replaces the team override for that one workflow only, and every workflow the personal file does not name keeps its team override. The personal file applies to the developer's own assistant at run time. Outputs shared with the whole team — generated files kept under version control — read the framework default and the team configuration only, so one developer's personal settings never reach another developer.

| Setting                       | Team sets it | Personal file sets it | Value at run time    | Value in shared outputs                |
| ----------------------------- | ------------ | --------------------- | -------------------- | -------------------------------------- |
| Routing switch / default tier | any          | Yes                   | personal value       | team value, else the framework default |
| Routing switch / default tier | Yes          | No                    | team value           | team value                             |
| Override for workflow W       | any          | Yes, for W            | personal value for W | team value for W, else no override     |
| Override for workflow W       | Yes, for W   | No (names others)     | team value for W     | team value for W                       |

### BR-WFR-06: Explicit requests run every tier [HARD]

**Statement:** Tiers govern only what the assistant selects by itself. A workflow the user asks for explicitly — by command or in words — runs whatever its effective tier.

### BR-WFR-07: Only known tiers are accepted [HARD]

**Statement:** The project default tier and every override must be auto, confirm or manual. Any other value fails validation with a message naming the setting and the three allowed tiers.

### BR-WFR-08: Off notice replaces the guidance and keeps its promise [HARD]

**Statement:** When automatic routing is off, the assistant receives the off notice instead of the gate and catalog. The notice states that routing is off and overrides every instruction to select a workflow automatically; it tells the assistant not to choose or start a workflow by itself, to skip a step that recommends switching to one, and to run a workflow only when the user explicitly asks; and it keeps every quality gate binding.

### BR-WFR-09: Delivered once, re-armed after a compaction [HARD]

**Statement:** The routing guidance — or the off notice while routing is off — is delivered once per conversation and is not repeated while it is still in the assistant's context. It is delivered again when it may have left that context: its content changed, the conversation record grew by the re-arm distance (about 4.5 MB) or shrank since the delivery, or the conversation was compacted after the delivery. A compaction re-arms delivery on both hosts: the primary host (Claude) records it as a compaction-boundary entry in its conversation record, and the second host (Codex) records it as a compaction record of its own at the top level of its conversation record. The word "compacted" appearing only inside another record — nested in its content or quoted in a message — is not a compaction and re-arms nothing. Any number of compactions before the next prompt re-arm exactly one delivery.

| Since the last delivery                                               | Next prompt              |
| --------------------------------------------------------------------- | ------------------------ |
| Nothing changed                                                       | silent                   |
| A compaction recorded by the primary host                             | guidance delivered again |
| A top-level compaction record written by the second host              | guidance delivered again |
| "compacted" only nested in or quoted by another record                | silent                   |
| Content changed, or the record grew by the re-arm distance, or shrank | guidance delivered again |

---

## 5. Domain Model

### Relationships (overview)

```
Project           1──N Workflow            (framework and project workflows)
Workflow          1──N ParallelPhase       (zero or more)
Project           1──1 ActivationPolicy    (default tier, overrides)
ActivationPolicy  1──N WorkflowOverride
Project           1──N RootInstructionFile (zero to two)
RoutingGuidance   1──1 GatePart            (full gate or marker + pointer)
RoutingGuidance   1──1 WorkflowCatalog
```

### Entity: Workflow

| Property         | Type                | Required | Constraints                  | Business Meaning                              |
| ---------------- | ------------------- | -------- | ---------------------------- | --------------------------------------------- |
| Name             | text                | Yes      | Unique                       | What the assistant and user call it           |
| Framework tier   | enum ActivationTier | Yes      | —                            | Tier before project settings                  |
| Step count       | number              | Yes      | At least 1                   | Size shown to the assistant and the user      |
| When-to-use hint | text                | Yes      | Shown at most 140 characters | Helps the assistant pick a route              |
| Parallel phases  | list                | No       | Each has two or more members | Steps that start together and finish together |

### Entity: ActivationPolicy

| Property     | Type                          | Required | Constraints        | Business Meaning           |
| ------------ | ----------------------------- | -------- | ------------------ | -------------------------- |
| Default tier | enum ActivationTier           | No       | Only tightens      | Project-wide floor         |
| Overrides    | list of (workflow name, tier) | No       | Tier must be known | Explicit per-workflow tier |

### Entity: RootInstructionFile

| Property            | Type   | Required | Constraints                                                                      | Business Meaning                                     |
| ------------------- | ------ | -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Carries gate marker | yes-no | Yes      | Read from the start of the file; a present file that cannot be read counts as No | Whether the gate is already loaded for the assistant |

### Entity: RoutingGuidance

| Property  | Type              | Required | Constraints                                | Business Meaning                    |
| --------- | ----------------- | -------- | ------------------------------------------ | ----------------------------------- |
| Gate part | enum GatePart     | Yes      | Per BR-WFR-03                              | The routing rule or a pointer to it |
| Form      | enum GuidanceForm | Yes      | First that fits, per BR-WFR-01             | How much of the catalog is carried  |
| Catalog   | text              | Yes      | Rows per BR-WFR-02, or index rows, or none | What the assistant routes from      |
| Length    | number            | Yes      | At most 9,500 characters                   | Fits the host cap                   |

### Enum: ActivationTier

| Value   | Meaning                                                                        |
| ------- | ------------------------------------------------------------------------------ |
| auto    | The assistant may select and start the workflow on the first task of a session |
| confirm | The assistant asks the user once before starting it by its own choice          |
| manual  | The assistant never starts it by itself; it names it so the user can run it    |

### Enum: GuidanceForm

| Value                  | Meaning                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Compact catalog        | Name, tier, step count, hint and phase marks per workflow        |
| Index with phase marks | Name, tier and phase marks per workflow                          |
| Index with tiers       | Name and tier per workflow                                       |
| Pointer only           | No workflow rows; the workflow pointer and advancement rule only |

### Enum: GatePart

| Value              | Meaning                                                             |
| ------------------ | ------------------------------------------------------------------- |
| Full gate          | The routing rule text is in the guidance                            |
| Marker and pointer | The rule is in the root instruction file; the guidance points there |

### Domain Events (business occurrences)

| Occurrence                         | When it happens                                     | Who/what reacts (business outcome)                     |
| ---------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Prompt received                    | The user submits a prompt with automatic routing on | Guidance is built and added once per conversation      |
| Root instruction files regenerated | A maintainer regenerates them with the gate         | The next guidance leaves out the gate body             |
| Tier settings changed              | A maintainer sets a default or an override          | The next catalog shows the new effective tiers         |
| Conversation compacted             | Either host condenses the conversation              | The next prompt carries the guidance again (BR-WFR-09) |

---

## 6. Process Flows

> No screen exists: the interaction surface is the routing guidance the assistant receives, validation messages and the catalog text. Backend-only capability; the view inventory is skipped for that reason.

### Flow: Build the routing guidance for a prompt

| Step | Actor  | Action                                                           | System Response                                                               | Next            |
| ---- | ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| 1    | User   | Submits a prompt                                                 | Automatic routing switch resolved (BR-WFR-05)                                 | 2 or off notice |
| 2    | System | Checks the root instruction files for the gate marker            | Chooses full gate or marker + pointer (BR-WFR-03)                             | 3               |
| 3    | System | Resolves every workflow's effective tier                         | Tier per BR-WFR-04                                                            | 4               |
| 4    | System | Renders the compact catalog, or the first shorter form that fits | Rows per BR-WFR-02 or an index; advancement rule and pointer kept (BR-WFR-01) | 5               |
| 5    | System | Adds the guidance before the prompt                              | Within the size cap (BR-WFR-01)                                               | end             |

### Flow: Assistant chooses a route

| Step | Actor     | Action                               | System Response                                          | Next |
| ---- | --------- | ------------------------------------ | -------------------------------------------------------- | ---- |
| 1    | Assistant | Reads the guidance and picks a route | —                                                        | 2    |
| 2    | Assistant | Picked workflow is auto              | Starts it                                                | end  |
| 3    | Assistant | Picked workflow is confirm           | Asks the user once, then follows the answer              | end  |
| 4    | Assistant | Picked workflow is manual            | Takes the best other route and names the manual workflow | end  |
| 5    | User      | Asks for a workflow explicitly       | It runs whatever its tier (BR-WFR-06)                    | end  |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create | Edit | Delete | Scope                                                          |
| -------------------- | :--: | :----: | :--: | :----: | -------------------------------------------------------------- |
| Framework maintainer | yes  |  yes   | yes  |  yes   | Framework workflows and their framework tiers                  |
| Project maintainer   | yes  |   no   | yes  |   no   | Team routing switch, default tier and overrides                |
| Developer            | yes  |   no   | yes  |   no   | Own personal file only                                         |
| AI assistant         | yes  |   no   |  no  |   no   | Reads the guidance; starts only what its effective tier allows |
| User                 | yes  |   no   |  no  |   no   | May request any workflow explicitly                            |

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a project maintainer or the AI assistant; the observable surface is the routing guidance text, the catalog and validation messages (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: the IDs were pre-allocated by the release plan so implementation phases could reference them in parallel; categories below group them by behavior rather than by decade.

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 1      | 1         | 0      |
| P1        | 11     | 11        | 0      |
| P2        | 1      | 1         | 0      |
| **Total** | **13** | **13**    | **0**  |

| Category                    | TCs                                                                    |
| --------------------------- | ---------------------------------------------------------------------- |
| Core Routing Guidance Tests | TC-WFR-001, TC-WFR-002, TC-WFR-003, TC-WFR-004, TC-WFR-005, TC-WFR-013 |
| Activation Tier Tests       | TC-WFR-006, TC-WFR-007, TC-WFR-009, TC-WFR-011, TC-WFR-012             |
| Validation Tests            | TC-WFR-008                                                             |
| Invariant / Property Tests  | TC-WFR-010                                                             |

### Core Routing Guidance Tests

#### TC-WFR-001: Routing guidance stays within the host size cap [P1]

**Objective:** Prove that the routing guidance added to each prompt fits inside the host limit for one added message, for the framework workflow set and for a project with many workflows.

**Business Intent / Invariant Guarded:** The assistant sees the whole routing guidance, never only the host preview of its first part (BR-WFR-01).

**Traces:** AC-WFR-01 / BR-WFR-01

**Preconditions:**

- Automatic routing is on
- The framework workflow set, a project that defines thirty workflows, or one that defines two hundred fifty

**Real-World Reachability:** A project adds its own workflows over time; every prompt then carries guidance for all of them.

**Demo Flow:** Submit a prompt in a project with the framework workflows, then in a project with thirty workflows, and measure the guidance shown to the assistant.

```gherkin
Given automatic routing is on and the project defines its workflows
When the assistant receives a prompt and the routing guidance is added
Then the guidance is at most 9,500 characters long, unless the gate part plus the project route protocol keep even the pointer-only form over the cap
And while the compact catalog fits, it names every workflow with its tier
And when it does not fit, the guidance takes the first shorter form that fits: an index with tiers and parallel-phase marks, an index with tiers only, or a pointer only
And every form keeps the gate part, the advancement rule and the pointer to the full workflow list
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Builds the compact catalog, or the first shorter form that fits under the cap                                                                             |
| **Business data state** | No change; guidance is rebuilt for each prompt                                                                                                            |
| **Data shown on UI**    | The compact catalog for the framework set; an index or a pointer for very large sets                                                                      |

**Acceptance Criteria:**

- ✅ Length at most 9,500 characters for the framework set, a thirty-workflow set and a very large set
- ✅ Framework set and a fitting set keep the compact catalog with every workflow named
- ✅ Gate part, advancement rule and pointer present in every form
- ❌ Guidance longer than 9,500 characters
- ❌ A shorter form used although the compact catalog fits
- ❌ Gate part, advancement rule or pointer dropped to make room

**Test Data:**

```yaml
inputDomain: 'any workflow set, from the framework set to hundreds of workflows, with or without a root instruction file carrying the gate, and with no project route protocol or one small enough that the gate part plus the protocol leave the pointer-only form within the cap'
invariant: 'for ALL such sets the routing guidance is at most 9,500 characters and keeps the gate part, the advancement rule and the pointer'
boundaryCounterCase: 'the gate part plus a project route protocol keep even the pointer-only form over the cap → that form is still delivered with the protocol whole, never a cut protocol'
```

```json
{
    "capCharacters": 10000,
    "guardCharacters": 9500,
    "fixtureWorkflowCounts": [30, 250],
    "formOrder": ["compact catalog", "index: id, tier, parallel phases", "index: id, tier", "pointer only"]
}
```

**Edge Cases:**

- A workflow hint longer than the hint limit → shortened, never dropped
- Thirty workflows and no root instruction file carrying the gate → the index with tiers and parallel-phase marks
- A workflow set whose index with parallel-phase marks does not fit but whose index with tiers does → the index with tiers only
- Two hundred fifty workflows → pointer only, no workflow rows
- Guidance of exactly 9,500 characters → accepted in that form; one character more → the next shorter form
- The gate part plus a project route protocol larger than the cap → the pointer-only form with the protocol whole, and no workflow rows

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: a 30-workflow registry fits under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: this framework registry fits under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 index-with-marks fallback: 30 workflows without a root gate fit under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 tiers-only index fallback: rows keep id and tier when the marked index overflows`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 pointer-only fallback drops workflow rows when even the index overflows`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 a protocol larger than the cap is delivered whole with the pointer-only form`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 a compact payload of exactly 9,500 chars is kept; 9,501 falls back` · **Status:** Tested

---

#### TC-WFR-002: The gate body is left out when the root instruction file already carries it [P1]

**Objective:** Prove that the per-prompt guidance does not repeat the routing gate body when every root instruction file present already carries the gate, while its marker and the parallel-phase marks stay.

**Business Intent / Invariant Guarded:** The routing gate is read once from the root instruction file instead of twice, and nothing that tells the assistant how to advance through parallel phases is lost (BR-WFR-03).

**Traces:** AC-WFR-03 / AC-WFR-05 / BR-WFR-03

**Preconditions:**

- Automatic routing is on
- The primary host root file exists, and every root instruction file in the project carries the gate marker
- At least one workflow has a parallel phase

**Real-World Reachability:** A project regenerated its root instruction files, which now start with the routing gate.

**Demo Flow:** Submit a prompt and read the routing guidance the assistant receives.

```gherkin
Given every root instruction file of the project carries the routing gate marker
When the assistant receives a prompt and the routing guidance is added
Then the guidance does not contain the gate body
And it contains the gate marker line and one line saying the gate is in the root instruction file
And every workflow with parallel phases still shows its parallel-phase marks
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Replaces the gate body with a marker line and a pointer line                                                                                              |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Gate marker, pointer line, the catalog with its parallel-phase marks and the advancement rule                                                             |

**Acceptance Criteria:**

- ✅ Gate body absent
- ✅ Marker line and pointer line present
- ✅ Parallel-phase marks present
- ❌ Gate body repeated
- ❌ Marker or parallel-phase marks missing

**Test Data:**

```json
{
    "rootFiles": ["CLAUDE.md", "AGENTS.md"],
    "marker": "<!-- CK:WORKFLOW-GATE -->",
    "pointer": "The routing gate is in the root instruction file."
}
```

**Edge Cases:**

- Only one of two root instruction files carries the marker → the gate body is delivered (TC-WFR-003)
- An existing check that the guidance holds the marker and the catalog heading stays green

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: rule/hooks/gate-payload]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `rule/hooks/gate-payload` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-002 gate body omitted when root carries it` · **Status:** Tested

---

#### TC-WFR-003: The gate body is delivered when no root instruction file carries it [P1]

**Objective:** Prove that the full routing gate reaches the assistant when the project has no primary host root file, when any root instruction file present lacks the gate marker, or when a present root instruction file cannot be read.

**Business Intent / Invariant Guarded:** The routing gate is never lost on any host: the guidance cannot tell which host reads it, so it carries the gate whenever any root instruction file does not (BR-WFR-03).

**Traces:** AC-WFR-04 / BR-WFR-03

**Preconditions:**

- Automatic routing is on
- The project has no primary host root file, or at least one present root instruction file lacks the gate marker or cannot be read

**Real-World Reachability:** A project copied the framework but never generated its root instruction files, or hand-wrote the instruction file of one host.

**Demo Flow:** Submit a prompt in such a project and read the routing guidance.

```gherkin
Given the project has no root instruction file
When the assistant receives a prompt and the routing guidance is added
Then the guidance contains the full routing gate
And given the first host's root file carries the marker but the second host's root file does not
Then the guidance still contains the full routing gate
And given only the second host's root file exists and it carries the marker
Then the guidance still contains the full routing gate
And given the primary host root file is present but cannot be read while the other root file carries the marker
Then the guidance still contains the full routing gate
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Delivers the gate body in the guidance                                                                                                                    |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The full routing gate followed by the catalog                                                                                                             |

**Acceptance Criteria:**

- ✅ Full gate present
- ❌ Only a pointer line while no root file carries the gate
- ❌ Only a pointer line while the primary host root file is missing or cannot be read

**Test Data:**

```json
{
    "rootFiles": []
}
```

**Edge Cases:**

- A root instruction file without the marker → full gate
- Two root files, one with the marker → full gate
- Only the second host's root file, carrying the marker → full gate
- A present root file that cannot be read → full gate
- A marker that starts in the checked opening part (the first 64 KB) but ends past it → full gate; a marker ending exactly at the end of that part counts

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: rule/hooks/gate-payload]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `rule/hooks/gate-payload` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-003 gate body omitted only when CLAUDE.md exists and every present root file carries the gate`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-003 the root-file marker counts only inside the first 64 KB` · **Status:** Tested

---

#### TC-WFR-004: Compact catalog rows show what routing needs and nothing more [P1]

**Objective:** Prove that each catalog row in the guidance carries the workflow name, activation tier, step count and a short when-to-use hint, without the full step list.

**Business Intent / Invariant Guarded:** The assistant can choose a route from the guidance alone; step lists are resolved when a workflow starts (BR-WFR-02).

**Traces:** AC-WFR-02 / BR-WFR-02

**Preconditions:**

- Automatic routing is on
- The project defines workflows with and without parallel phases

**Real-World Reachability:** Every prompt in a routed project carries the catalog.

**Demo Flow:** Render the catalog in its compact form and inspect each row.

```gherkin
Given the project defines workflows, some with parallel phases
When the compact catalog is rendered for the guidance
Then each row shows the workflow name, its activation tier, its step count and a hint of at most 140 characters
And no row lists the full step sequence
And a row with parallel phases keeps only its parallel-phase marks
And the step skills appear as one line of names
And the tier legend stays
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Renders one compact row per workflow and one names-only skills line                                                                                       |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Rows of name, tier, step count, hint and, where present, parallel-phase marks                                                                             |

**Acceptance Criteria:**

- ✅ Every row has name, tier, step count and hint
- ✅ Parallel-phase marks kept on grouped rows
- ✅ Tier legend present
- ❌ A full step list in any row
- ❌ A hint longer than 140 characters

**Test Data:**

```json
{
    "hintMaxCharacters": 140,
    "skillsLine": "Step skills: a, b, …"
}
```

**Edge Cases:**

- A workflow with no parallel phase → its last cell is empty
- A hint of exactly 140 characters → kept whole; a hint of 141 characters → shortened to at most 140 characters ending in a cut mark
- A workflow with two modes of different lengths → its step count shown as a range, and each mode's parallel-phase marks prefixed with the mode name

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-skills-catalog]`
> **Related Behaviors:** `operation/scripts/workflow-skills-catalog` · `test/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-004 compact rows: id, tier, step count and capped hint; barrier tokens only; names-only skills`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-004 compact rows of the shipped registry keep every barrier token and drop the steps` · **Status:** Tested

---

#### TC-WFR-005: Routing off shows the off notice instead of the guidance [P1]

**Objective:** Prove that switching automatic routing off replaces the guidance with the off notice, and that the notice still forbids self-started workflows while keeping explicit requests and every quality gate.

**Business Intent / Invariant Guarded:** A project that turned routing off keeps its promise: the assistant is told not to pick workflows by itself (BR-WFR-08).

**Traces:** AC-WFR-12 / BR-WFR-08

**Preconditions:**

- Automatic routing is switched off for the project

**Real-World Reachability:** A team turned automatic routing off in its project configuration.

**Demo Flow:** Submit a prompt in that project and read the text the assistant receives.

```gherkin
Given automatic routing is off for the project
When the assistant receives a prompt
Then the off notice is shown instead of the routing guidance
And it says routing is off and overrides every automatic-selection instruction
And it tells the assistant to skip a step that recommends switching to a workflow
And it runs a workflow only when the user explicitly asks
And it keeps every quality gate binding
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Emits the off notice; no catalog and no gate                                                                                                              |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The off notice telling the assistant to run a workflow only on explicit request                                                                           |

**Acceptance Criteria:**

- ✅ Off notice shown; it forbids self-started workflows, skips workflow-switch steps, keeps explicit requests and every quality gate
- ❌ Catalog or gate shown while routing is off

**Test Data:**

```json
{
    "workflowAutoDetect": false
}
```

**Edge Cases:**

- Off in the team file, on in the developer personal file → routing on (existing layering)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-008 TC-WFR-005 disabled hook delivers the OFF notice once, never the gate or catalog` · **Status:** Tested

---

#### TC-WFR-013: The guidance is delivered again after a context compaction on either host [P1]

**Objective:** Prove that guidance already delivered in a conversation is not repeated, is delivered again once after the conversation is compacted on either host, and is not re-armed by the word "compacted" appearing only inside another record.

**Business Intent / Invariant Guarded:** A compaction removes the delivered guidance from the assistant's context, so the next prompt must carry it again on every host; nothing else that merely mentions a compaction may cost a repeat (BR-WFR-09).

**Traces:** AC-WFR-13 / BR-WFR-09

**Preconditions:**

- Automatic routing is on
- A conversation on the second host whose record starts with its session entry, and a conversation on the primary host

**Real-World Reachability:** A long session on either host is compacted; without re-arming, the rest of the session routes with no guidance in context.

**Demo Flow:** Submit two prompts, write a nested mention of "compacted" into the conversation record, submit a prompt, write a top-level compaction record, submit two more prompts; repeat the compaction step with the primary host's compaction entry.

```gherkin
Given automatic routing is on and the guidance was delivered on the first prompt of a conversation
When a second prompt arrives with no compaction since the delivery
Then no guidance is added
When the second host's conversation record gains a record whose content only nests or quotes "compacted"
Then the next prompt still adds no guidance
When the second host's conversation record gains a compaction record of its own at the top level
Then the next prompt adds the guidance again, and the prompt after it adds none
And on the primary host a compaction-boundary entry re-arms the guidance the same way
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Delivers once; re-delivers once after a real compaction on either host; ignores nested or quoted mentions                                                 |
| **Business data state** | The per-conversation delivery record is refreshed on each delivery                                                                                        |
| **Data shown on UI**    | The routing guidance on the first prompt and on the first prompt after each compaction                                                                    |

**Acceptance Criteria:**

- ✅ Second prompt with no compaction adds nothing
- ✅ A top-level compaction record on the second host re-arms exactly one delivery
- ✅ A compaction-boundary entry on the primary host re-arms delivery
- ❌ Guidance repeated on a prompt with no compaction since the delivery
- ❌ A nested or quoted "compacted" re-arms delivery
- ❌ No guidance on the first prompt after a compaction

**Test Data:**

```yaml
inputDomain: 'any conversation record on either host, with any mix of ordinary records, records that nest or quote "compacted", and real compaction records'
invariant: 'for ALL such records the guidance is delivered again exactly when a real compaction was recorded after the last delivery'
boundaryCounterCase: '"compacted" nested in another record''s content or quoted in a message → no re-delivery'
```

```json
{
    "secondHostCompaction": "top-level compaction record",
    "primaryHostCompaction": "compaction-boundary entry",
    "notACompaction": ["nested in another record's content", "quoted in a message"]
}
```

**Edge Cases:**

- Two compactions before the next prompt → one re-delivery
- A compaction recorded before the first delivery → one delivery only
- The conversation record shrinks (replaced) → re-armed by the shrink rule, not by compaction (BR-WFR-09)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs:862`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WFR-013 a Codex top-level compacted record re-arms the reminder, a nested one does not, and a Claude compact_boundary does` · **Status:** Tested

---

### Activation Tier Tests

#### TC-WFR-006: A project default tier only tightens [P1]

**Objective:** Prove that a project default of "confirm" raises an "auto" workflow to "confirm" and leaves a "manual" workflow "manual".

**Business Intent / Invariant Guarded:** A broad project default can never loosen a workflow the framework marked stricter (BR-WFR-04).

**Traces:** AC-WFR-06 / BR-WFR-04

**Preconditions:**

- The project default tier is "confirm"
- Workflow A is "auto" in the framework; workflow B is "manual"

**Real-World Reachability:** A team that dislikes surprise auto-starts sets one project default instead of editing every workflow.

**Demo Flow:** Resolve the effective tier of both workflows under the project default.

```gherkin
Given the project default tier is "confirm"
When the effective tiers of an "auto" workflow and a "manual" workflow are resolved
Then the first is "confirm"
And the second is "manual"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Takes the stricter of the framework tier and the project default                                                                                          |
| **Business data state** | Effective tiers: A confirm, B manual                                                                                                                      |
| **Data shown on UI**    | The catalog rows show "confirm" and "manual"                                                                                                              |

**Acceptance Criteria:**

- ✅ "auto" raised to "confirm"
- ✅ "manual" unchanged
- ❌ "manual" lowered to "confirm"

**Test Data:**

```yaml
inputDomain: 'any framework tier and any project default tier from auto, confirm, manual, with no override for the workflow'
invariant: 'for ALL pairs the effective tier equals the stricter of the two (auto < confirm < manual)'
boundaryCounterCase: 'framework "manual" with default "auto" → effective "manual", never "auto"'
```

```json
{
    "default": "confirm",
    "workflows": {
        "a": "auto",
        "b": "manual"
    }
}
```

**Edge Cases:**

- Default absent → every workflow keeps its framework tier

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/workflow-routing-config` · `test/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-006 effective tier tightens: default raises auto to confirm and never lowers manual` · **Status:** Tested

---

#### TC-WFR-007: A per-workflow override sets the tier explicitly [P1]

**Objective:** Prove that naming one workflow in the project overrides gives it exactly that tier, even when that loosens it.

**Business Intent / Invariant Guarded:** A project can deliberately allow one workflow to start by itself while keeping a strict default (BR-WFR-04).

**Traces:** AC-WFR-07 / BR-WFR-04

**Preconditions:**

- The project default tier is "confirm"
- The project overrides the feature workflow to "auto"

**Real-World Reachability:** A team wants every workflow confirmed except the one it runs all day.

**Demo Flow:** Resolve the effective tier of the overridden workflow.

```gherkin
Given the project default tier is "confirm" and the feature workflow is overridden to "auto"
When the effective tier of the feature workflow is resolved
Then it is "auto"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | An override wins over both the framework tier and the project default                                                                                     |
| **Business data state** | Effective tier of the feature workflow: auto                                                                                                              |
| **Data shown on UI**    | Its catalog row shows "auto"                                                                                                                              |

**Acceptance Criteria:**

- ✅ Override applied as written
- ❌ Default or framework tier applied instead of the override

**Test Data:**

```json
{
    "default": "confirm",
    "overrides": {
        "workflow-feature": "auto"
    }
}
```

**Edge Cases:**

- An override naming an unknown workflow → no effect on other workflows

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/workflow-routing-config` · `test/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-007 override loosens explicitly: a named workflow gets exactly its override tier` · **Status:** Tested

---

#### TC-WFR-009: The catalog shows each workflow at its effective tier [P2]

**Objective:** Prove that with a project default of "manual" every catalog row shows "manual".

**Business Intent / Invariant Guarded:** The tier the assistant reads is the tier the project enforces (BR-WFR-02, BR-WFR-04).

**Traces:** AC-WFR-09 / BR-WFR-02 / BR-WFR-04

**Preconditions:**

- The project default tier is "manual"
- No overrides

**Real-World Reachability:** A team that wants routing advice but no self-started workflows sets the default to "manual".

**Demo Flow:** Render the catalog and read the tier column.

```gherkin
Given the project default tier is "manual" and no workflow is overridden
When the catalog is rendered
Then every row shows "manual"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Catalog rows use the effective tier                                                                                                                       |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Tier column reads "manual" on every row                                                                                                                   |

**Acceptance Criteria:**

- ✅ All rows "manual"
- ❌ Any row showing its framework tier instead

**Test Data:**

```json
{
    "default": "manual",
    "overrides": {}
}
```

**Edge Cases:**

- The same project with one override to "auto" → that row alone shows "auto"

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-skills-catalog]`
> **Related Behaviors:** `operation/scripts/workflow-skills-catalog` · `test/scripts/workflow-skills-catalog`
> **CoveredBy:** `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-009 catalog shows effective tier: default manual renders manual on every row of every form` · **Status:** Tested

---

#### TC-WFR-011: The developer personal file wins over the team configuration [P1]

**Objective:** Prove that a valid value in the developer personal file overrides the team value for the automatic routing switch and for the tier settings.

**Business Intent / Invariant Guarded:** A developer can tighten routing for their own checkout without changing the team configuration (BR-WFR-05).

**Traces:** AC-WFR-10 / BR-WFR-05

**Preconditions:**

- The team configuration keeps automatic routing on
- The developer personal file turns it off, or sets a stricter default tier

**Real-World Reachability:** A developer who prefers to start every workflow by hand edits only their own untracked file.

**Demo Flow:** Submit a prompt in that checkout and read what the assistant receives.

```gherkin
Given the team keeps automatic routing on and the developer personal file turns it off
When the assistant receives a prompt
Then the off notice is shown
And given the personal file sets a default tier of manual while the team sets none
Then every catalog row shows manual
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Reads framework default, team configuration, then the personal file; the later valid value wins                                                           |
| **Business data state** | No change to the team configuration                                                                                                                       |
| **Data shown on UI**    | The off notice, or catalog rows at the personal default tier                                                                                              |

**Acceptance Criteria:**

- ✅ Personal value applied
- ✅ Team configuration untouched
- ❌ Team value applied over a valid personal value

**Test Data:**

```json
{
    "team": {
        "portability": {
            "workflowAutoDetect": true
        }
    },
    "personal": {
        "portability": {
            "workflowAutoDetect": false,
            "workflowActivation": {
                "default": "manual"
            }
        }
    }
}
```

**Edge Cases:**

- Personal file unreadable or its value invalid → no opinion; the team value applies
- Personal override for a different workflow → the team override for this workflow still applies (overrides merge per workflow)
- Settings resolved for outputs shared with the team → the personal value is ignored (BR-WFR-05)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/workflow-routing-config` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-025 team ON with a local OFF override delivers the OFF notice through the real resolver`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-011 personal file wins over the team configuration for tier settings` · **Status:** Tested

---

#### TC-WFR-012: Every routing surface says an explicit request runs any tier [P1]

**Objective:** Prove that the routing gate, the tier legend, the workflow start guidance and the generated root instruction files all state that an explicit user request runs a workflow of any tier.

**Business Intent / Invariant Guarded:** Tiers only limit what the assistant starts by itself; the user can always run any workflow (BR-WFR-06).

**Traces:** AC-WFR-11 / BR-WFR-06

**Preconditions:**

- The routing surfaces the assistant reads

**Real-World Reachability:** A user asks by name for a manual workflow.

**Demo Flow:** Read each routing surface and find the explicit-request rule.

```gherkin
Given every surface the assistant routes from
When each is read
Then each states that an explicit user request runs a workflow of any tier
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Rule present on every surface                                                                                                                             |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The explicit-request sentence on each surface                                                                                                             |

**Acceptance Criteria:**

- ✅ Rule present everywhere
- ❌ A surface without the rule

**Test Data:**

```json
{
    "surfaces": ["routing gate", "tier legend", "workflow start guidance", "root instruction files"]
}
```

**Edge Cases:**

- Pointer-only guidance → it carries no tier legend; the rule reaches the assistant through the full gate when the guidance carries the gate body, and otherwise through the root instruction file that carries the gate

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/skills/workflow-first-gate]`
> **Related Behaviors:** `component/skills/workflow-first-gate` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-CP-017 activation tiers reach every routing surface` · **Status:** Tested

---

### Validation Tests

#### TC-WFR-008: An unknown tier value is rejected by name [P1]

**Objective:** Prove that a project default tier outside the three allowed values fails validation with a message naming the setting and the allowed tiers.

**Business Intent / Invariant Guarded:** A typo never silently changes which workflows may start by themselves (BR-WFR-07).

**Traces:** AC-WFR-08 / BR-WFR-07

**Preconditions:**

- The project configuration sets the default tier to "sometimes"

**Real-World Reachability:** A maintainer mistypes the tier while editing the project configuration.

**Demo Flow:** Validate the project configuration.

```gherkin
Given the project default tier is set to "sometimes"
When the project configuration is validated
Then an error names the default-tier setting
And it lists auto, confirm and manual as the allowed tiers
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Validation reports an error                                                                                                                               |
| **Business data state** | The configuration is reported invalid                                                                                                                     |
| **Data shown on UI**    | The error message with the setting name and the allowed tiers                                                                                             |

**Acceptance Criteria:**

- ✅ Error names the setting and the three tiers
- ❌ Validation passes
- ❌ Error without the allowed tiers

**Test Data:**

```json
{
    "portability": {
        "workflowActivation": {
            "default": "sometimes"
        }
    }
}
```

**Edge Cases:**

- An override with an unknown tier → the same error, naming the override

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/project-config-schema]`
> **Related Behaviors:** `rule/hooks/project-config-schema` · `test/hooks/project-config-refactor-keys`
> **CoveredBy:** `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] TC-WFR-008 unknown default activation tier names the key and the allowed tiers`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] TC-WFR-008 validate CLI exits 1 and prints the tier error` · **Status:** Tested

---

### Invariant / Property Tests

> Property cases also live in other categories: TC-WFR-001 (size for every workflow set) and TC-WFR-006 (tier order for every pair) carry their property blocks in place.

#### TC-WFR-010: Parallel-phase marks and the advancement rule survive the compact guidance [P0]

**Objective:** Prove that for every workflow with parallel phases the compact guidance keeps at least one parallel-phase mark per phase, and that the guidance states the rule to advance only after all members return.

**Business Intent / Invariant Guarded:** Shrinking the guidance never removes the instruction that keeps parallel quality steps from being skipped or advanced early (BR-WFR-03).

**Traces:** AC-WFR-05 / BR-WFR-03

**Preconditions:**

- Automatic routing is on
- The framework workflows, and a project with one workflow that has a parallel phase

**Real-World Reachability:** Every prompt in a routed project carries the compact guidance; the parallel review phases depend on it.

**Demo Flow:** Build the compact guidance for both workflow sets and inspect every grouped row and the legend.

```gherkin
Given every workflow that has parallel phases, in the framework set and in a one-workflow project
When the compact routing guidance is built
Then each such row shows at least one parallel-phase mark for each of its parallel phases
And the guidance contains the rule "advance only after ALL return"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Keeps phase marks and the legend while dropping step lists                                                                                                |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Grouped rows with their phase marks; the legend line with the advancement rule                                                                            |

**Acceptance Criteria:**

- ✅ Every parallel phase represented
- ✅ Advancement rule present
- ❌ A grouped row without its phase mark
- ❌ Advancement rule missing

**Test Data:**

```yaml
inputDomain: 'any workflow with one or more parallel phases, in any project'
invariant: 'for ALL such workflows the compact row carries at least one phase mark per parallel phase, and the guidance carries the advancement rule'
boundaryCounterCase: 'a workflow without parallel phases → no phase mark on its row, and the advancement rule is still present once'
```

```json
{
    "advancementClause": "advance only after ALL return",
    "groupMark": "[a ∥ b]"
}
```

**Edge Cases:**

- A conditional phase member (marked with a star) → still shown inside its phase mark
- A workflow set so large that only the index with tiers or the pointer fits → no phase marks listed, the advancement rule still present (BR-WFR-01); the workflow-cycle consistency check skips phase-mark parity for those two forms and still requires the advancement rule (BR-WFR-03)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: rule/hooks/gate-payload]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `rule/hooks/gate-payload` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept in a fixture with one grouped workflow`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept for every grouped workflow in this framework registry`, `.claude/scripts/codex/tests/verify-workflow-cycle-compliance.test.mjs::W5 runtime parity passes intact marked forms and fails each one that drops a barrier mark`, `.claude/scripts/codex/tests/verify-workflow-cycle-compliance.test.mjs::W5 runtime parity skips the tiers-only index and the pointer-only form but still requires the advancement clause` · **Status:** Tested

---

_Feature Spec — tech-free 8-section template v4.0_
