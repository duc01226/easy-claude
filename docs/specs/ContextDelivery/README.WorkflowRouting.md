---
module: 'hooks'
service: 'framework.ContextDelivery'
feature_code: 'WFR'
entities: ['Workflow', 'ActivationPolicy', 'RoutingGuidance', 'RootInstructionFile', 'RouteMode']
status: draft
owner: 'Framework maintainers'
last_updated: '2026-10-01'
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

| Type                 | Path                                                                                                                                                                                                                                                                                                                                                                                           | Description                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Spec Index (derived) | `docs/specs/ContextDelivery/INDEX.md`                                                                                                                                                                                                                                                                                                                                                          | Generated navigation catalog for this bucket; refresh through the spec index owner.    |
| Routing gate text    | `.claude/skills/shared/workflow-first-gate.md`                                                                                                                                                                                                                                                                                                                                                 | The routing gate the guidance delivers per mode; root files carry no route pointer. |
| Workflow registry    | `.claude/workflows.json`                                                                                                                                                                                                                                                                                                                                                                       | Workflow names, framework activation tiers, steps and parallel phases.                 |
| Project settings     | `docs/project-config.json` (`portability.workflowRouteMode`, `portability.workflowActivation`), `~/.claude/.ck.json`, `.claude/.ck.local.json`, environment `CK_WORKFLOW_ROUTE_MODE`, `.claude/scripts/lib/workflow-routing-config.cjs`, `.claude/scripts/workflow-mode.cjs`, `.claude/skills/workflow-mode/SKILL.md`                                                                          | Team default, the personal sources, the resolver and the mode command.                 |
| Test suites          | `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs`, `.claude/hooks/tests/suites/content-presence.test.cjs`, `.claude/scripts/codex/tests/verify-workflow-cycle-compliance.test.mjs` | Executors for Section 8.                                                               |

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

Before each prompt the assistant receives short routing guidance: the rule that it must choose how to handle the request first, and a catalog of the project's workflows with the activation tier of each. The guidance is the only carrier of that rule: the always-loaded root instruction files hold no route text, so no second copy can contradict the mode a person chose. Each person chooses how a matched workflow starts — ask first (the default), start by itself, or never unasked — through the environment, a personal file, or a first line in a prompt, without touching shared files. Guidance larger than the host shows in one added message reaches the assistant only as its first part; this capability keeps the guidance inside the host limit and never drops the marks that make parallel quality steps finish together. It also lets a project decide how freely workflows may start by themselves — one project-wide default that can only make tiers stricter, plus explicit per-workflow choices — while an explicit request from the user still runs any workflow.

---

## 2. Glossary

| Term                  | Definition                                                                                                                                                    | Context                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow              | A named sequence of steps the assistant can run for a kind of request                                                                                         | Defined by the framework or the project                                                                                                   |
| Routing Guidance      | The text added before each prompt: the mode line, the routing gate for the mode and the workflow catalog (or the off notice)                                  | Rebuilt for each prompt; shown once per conversation until it may have faded                                                              |
| Routing Gate          | The rule block telling the assistant to choose its route before acting; one variant per mode                                                                  | Delivered only by the guidance; no root file carries it                                                                                   |
| Root Instruction File | An always-loaded project instruction file an assistant host reads at session start                                                                            | One per host family; holds project information only, no route text                                                                         |
| Route Pointer         | A retired line once stamped into each root file to name the hook that delivers the route                                                                      | No longer written; regeneration removes one that remains                                                                                  |
| Mode Line             | The first line of a delivered route: "Route mode: <mode> (<source>)"                                                                                          | Shows the state without any tool                                                                                                          |
| Workflow Catalog      | The list of workflows with name, activation tier, step count and a short hint                                                                                 | Compact, in the guidance only; root files hold none                                                                                       |
| Parallel Phase        | A group of steps that start together and all must finish before the next step                                                                                 | Shown as a parallel-phase mark in a catalog row                                                                                           |
| Advancement Rule      | The sentence "advance only after ALL return" that governs parallel phases                                                                                     | Always part of the guidance                                                                                                               |
| Activation Tier       | Which option the workflow question recommends: auto (by fit), confirm (the full workflow only when nothing leaner would do), manual (never the full workflow) | Ordered auto < confirm < manual                                                                                                           |
| Framework Tier        | The tier the framework gives a workflow                                                                                                                       | Starting point before project settings                                                                                                    |
| Project Default Tier  | A project-wide tier that raises every workflow to at least that tier                                                                                          | Optional; can only tighten                                                                                                                |
| Workflow Override     | A project's explicit tier for one named workflow                                                                                                              | Optional; may loosen or tighten                                                                                                           |
| Effective Tier        | The tier that applies after the framework tier, the project default and any override                                                                          | What the catalog shows and the assistant obeys                                                                                            |
| Size Cap              | The largest message the host shows in full when a prompt gains added context: 10,000 characters                                                               | Guidance must stay at or below 9,500 characters                                                                                           |
| Guidance Form         | How much of the catalog the guidance carries: the compact catalog, an index with tiers and parallel-phase marks, an index with tiers only, or a pointer only  | The first form that fits the size cap is used                                                                                             |
| Workflow Pointer      | A line saying that starting a workflow resolves its full list and steps from the workflow registry                                                            | Present in every guidance form                                                                                                            |
| Route Mode            | How a workflow the assistant matched by itself starts: ask (default), auto or off                                                                             | Resolved from the built-in default, the team configuration, the person's files, the environment and a session directive                   |
| Workflow Question     | The one question the assistant asks when its own route is to start a catalog workflow: run the full workflow, a slimmer custom route, or execute directly     | Mode ask, every tier; or mode auto for a confirm-tier workflow when a leaner route would do; never for an explicit request or mid-session |
| Off Notice            | The short state shown instead of the guidance when the mode is off                                                                                            | Tells the assistant to run workflows only on explicit request                                                                             |
| Personal File         | A person's own untracked settings: the every-project file in the home directory, or the checkout file                                                         | A valid value there wins over the team value                                                                                              |
| Prompt Directive      | A first line of a prompt that sets the mode for the session: "workflow-mode: auto"                                                                            | Wins over every other source; never fires on prose                                                                                        |
| Hook-less Host        | A host that delivers no guidance: no hook support, hooks disabled or not trusted                                                                              | Unsupported: it receives no route and no universal protocol                                                                               |

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

### US-WFR-02: The routing gate is carried once, by the guidance only

**As a** framework maintainer
**I want** the routing rule to exist in one place, the per-prompt guidance, with the root instruction files holding no route text at all
**So that** a person's chosen mode is never contradicted by a second copy of the rule

**Acceptance Criteria:**

- **AC-WFR-03** — **Given** routing is on in mode ask or auto **When** the guidance is built **Then** it always contains the full routing gate for that mode, whatever the root instruction files hold, and never a line saying the gate is in a root file; when a shipped source it is built from cannot be read or the gate has no guidance for that mode, the hook says so in one line instead of delivering nothing (TC-WFR-020, TC-WFR-021)
- **AC-WFR-04** — **Given** a generated root instruction file **When** it is read **Then** it holds no pointer, no routing rule, no workflow question and no catalog; regenerating a root file removes a pointer or gate block an earlier version wrote
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
- **AC-WFR-10** — **Given** a valid value in a personal source **When** the route mode or a tier is resolved **Then** it wins over the team value
- **AC-WFR-11** — **Given** any tier **When** the user explicitly asks for a workflow **Then** it runs with no question, in every mode; **When** the assistant decides by itself, on the first task of a session in mode ask, to start a catalog workflow **Then** it asks the workflow question before starting it, and **When** its route is direct, one skill or a custom route (a downgrade of a matched workflow included) **Then** it asks nothing (AC-WFR-14 describes auto and off); every routing surface says both

### US-WFR-04: Each person chooses how workflows start

**As a** developer using the assistant
**I want** to choose, for myself only, whether a matched workflow asks first, starts by itself, or is never started without my request
**So that** the project's shared files and my teammates' settings stay untouched

**Acceptance Criteria:**

- **AC-WFR-12** — **Given** the mode is off **When** a prompt is received **Then** a short state notice is shown and no catalog or gate is added; it tells the assistant not to choose or start a workflow by itself, to run a workflow (or the one skill the user names) only on explicit request, and that every quality gate still binds
- **AC-WFR-14** — **Given** the mode is ask, auto or off **When** a prompt is received **Then** the text opens with a line naming the mode and the source that decided it; ask (the default) asks the workflow question before a catalog workflow the assistant routes to starts; auto starts a matched workflow without asking, by its tier; off delivers the state notice only
- **AC-WFR-15** — **Given** several sources name a mode **When** the mode is resolved **Then** the latest of these wins: built-in ask, the team project configuration, the person's every-project file, the person's checkout file, the environment variable, this session's prompt directive; with no project configuration, no setting anywhere, or an invalid or unreadable value in a source, that source expresses no opinion, the next source decides, the result ends at ask, and the prompt is never failed or blocked
- **AC-WFR-16** — **Given** a prompt whose whole first line is a mode directive **When** it is received **Then** the mode applies to that prompt and, when the session preference can be remembered, the rest of the session; otherwise the reply reports that it could not be remembered and later prompts use the recorded or configured mode. The new route is delivered even though one was delivered earlier, and with "save" the person's every-project file is updated; prose that merely mentions the words is never a directive
- **AC-WFR-17** — **Given** any personal source **When** tracked, team-shared output is generated **Then** it reads the built-in and team layers only, and no personal value is ever written to a tracked file
- **AC-WFR-18** — **Given** a host that delivers no guidance **When** the assistant starts **Then** it receives no route: a host that runs no hook is unsupported, and the personal auto and off modes need a host that runs the hook
- **AC-WFR-19** — **Given** a workflow that an explicit skill step, the user's named skill or an already-running parent workflow requires **When** it starts **Then** it is part of that run, not a workflow the assistant chose: in mode ask it asks no workflow question and in mode off it is not skipped; ask and off govern only a workflow the assistant chooses to start, and the gate and the off notice say so while still saying a self-chosen workflow asks (ask) or is not started (off)

---

### US-WFR-05: Project route additions keep private files out of the conversation

**As a** developer using a project's additional route guidance
**I want** private local files to remain excluded even when another name points to them
**So that** shared route settings cannot expose my credentials to the assistant

**Acceptance Criteria:**

- **AC-WFR-20** — **Given** additional route guidance names a project file **When** that file is resolved **Then** neither a private configured name nor a private final target is read into the guidance; a public alias to a public file remains readable, and a rejected personal source leaves an eligible team source in force

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                                                                                                                        | Category     | Enforcement |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| BR-WFR-01 | Guidance within the size cap, with ordered shorter forms                                                                                    | Presentation | [HARD]      |
| BR-WFR-02 | Compact catalog content                                                                                                                     | Presentation | [HARD]      |
| BR-WFR-03 | Gate payload: the full gate for the mode is always delivered; root files hold no route text; marker, advancement rule and phase marks kept | Presentation | [HARD]      |
| BR-WFR-04 | Effective tier: default only tightens, override is explicit                                                                                 | Activation   | [HARD]      |
| BR-WFR-05 | Layered settings: framework, team, personal                                                                                                 | Activation   | [HARD]      |
| BR-WFR-06 | Explicit requests run every tier; what a self-matched workflow does depends on the mode                                                     | Activation   | [HARD]      |
| BR-WFR-07 | Only known tiers are accepted                                                                                                               | Validation   | [HARD]      |
| BR-WFR-08 | Off notice replaces the guidance and keeps its promise                                                                                      | Activation   | [HARD]      |
| BR-WFR-09 | Delivered once per conversation; re-armed after a context compaction on both hosts                                                          | Delivery     | [HARD]      |
| BR-WFR-10 | Route mode: ask by default, fixed precedence, fail-safe to ask                                                                              | Activation   | [HARD]      |
| BR-WFR-11 | A first-line prompt directive sets the mode for the session                                                                                 | Activation   | [HARD]      |
| BR-WFR-12 | Personal settings stay personal                                                                                                             | Activation   | [HARD]      |
| BR-WFR-13 | A workflow a run requires is part of that run                                                                                               | Activation   | [HARD]      |
| BR-WFR-14 | Additional route guidance excludes private file names and final targets                                                                     | Privacy      | [HARD]      |

### BR-WFR-01: Guidance within the size cap [HARD]

**Statement:** The routing guidance added to a prompt is at most 9,500 characters, leaving margin under the host's 10,000-character cap, with the single exception stated at the end of this rule. The guidance uses the first of these forms that fits: the compact catalog (BR-WFR-02); the same rows without the line of step-skill names; an index with each workflow's name, effective tier and parallel-phase marks; an index with each workflow's name and effective tier only; a pointer only, with no workflow rows. Every form keeps the gate part (BR-WFR-03), the advancement rule and the workflow pointer. A project's own route protocol is never dropped or cut. The size is measured on the whole guidance — gate part, catalog form and protocol together — so when the gate part plus the project protocol keep even the pointer-only form over the cap, that form is still delivered with the protocol whole; this is the only case in which the guidance exceeds 9,500 characters.

| Compact catalog fits | Index with phase marks fits | Index with tiers fits | Form used                                                                               |
| -------------------- | --------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| Yes                  | —                           | —                     | compact catalog                                                                         |
| No                   | Yes                         | —                     | index with tiers and parallel-phase marks                                               |
| No                   | No                          | Yes                   | index with tiers only                                                                   |
| No                   | No                          | No                    | pointer only (delivered even when the gate part plus the protocol keep it over the cap) |

### BR-WFR-02: Compact catalog content [HARD]

**Statement:** Each catalog row in the guidance shows the workflow name, its effective tier, its step count and a when-to-use hint of at most 140 characters. Full step lists are left out: starting a workflow resolves its full sequence before any work begins. A workflow with parallel phases keeps only its parallel-phase marks in the last column. The step skills appear as a single line of names. The tier legend stays. A workflow with several modes shows its step count as the range from its shortest to its longest mode, and each parallel-phase mark is prefixed with the name of the mode it belongs to; a mode without parallel phases adds no mark. The index with parallel-phase marks prefixes its marks the same way.

### BR-WFR-03: Gate payload [HARD]

**Statement:** The guidance always carries the full routing gate for the resolved mode (ask or auto): the rules shared by both modes plus the lines written for that mode, with no fence line. The root instruction files carry no routing rule and no pointer, so one copy of the rule exists and a person's mode is never contradicted by a second one. A host that delivers no guidance is unsupported. In every case the guidance keeps the gate marker and the advancement rule ("advance only after ALL return"). In the compact catalog and in the index with parallel-phase marks, every row of a workflow with parallel phases keeps at least one parallel-phase mark per phase. The index with tiers only and the pointer-only form, used only when those do not fit (BR-WFR-01), list no phase marks; the phases reach the assistant when the workflow starts. The workflow-cycle consistency check that reads the delivered guidance therefore verifies phase-mark parity only when the guidance uses the compact catalog or the index with parallel-phase marks; it still requires the advancement rule in every form.

| Root instruction files present               | Gate part in the guidance | Marker and advancement rule |
| -------------------------------------------- | ------------------------- | --------------------------- |
| none                                         | full gate for the mode    | kept                        |
| any, carrying a retired pointer              | full gate for the mode    | kept                        |
| any, unreadable or carrying an outdated gate | full gate for the mode    | kept                        |

Regenerating the root instruction files removes an outdated gate or pointer from them.

When the hook cannot build the guidance from a shipped source, it is never silent: an unreadable workflow registry still delivers the state line and the full gate for the mode plus one line `workflow catalog unavailable: <reason>; read .claude/workflows.json`, and an unreadable gate file or one with no guidance for the selected mode delivers the state line plus one line naming the gate file and the registry to read. An empty body, whitespace alone, empty gate markers, or only guidance for another mode all count as unavailable. The off notice reads no file and is unchanged.

### BR-WFR-04: Effective tier [HARD]

**Statement:** Tiers are ordered auto < confirm < manual. A workflow's effective tier is its override when the project names it; otherwise the stricter of its framework tier and the project default tier. Without a default and an override, the framework tier applies unchanged. The catalog and the assistant use the effective tier.

| Override set | Default set | Effective tier                             |
| ------------ | ----------- | ------------------------------------------ |
| Yes          | any         | the override                               |
| No           | Yes         | the stricter of framework tier and default |
| No           | No          | the framework tier                         |

### BR-WFR-05: Layered settings [HARD]

**Statement:** The route mode (BR-WFR-10) and the tier settings are read in layers. The mode reads: built-in ask, then the team project configuration, then the person's every-project file, then the person's checkout file, then the environment variable, then this session's prompt directive. The tier settings read: framework default, then the team project configuration, then the developer's checkout file. A later valid value wins; a missing, unreadable or invalid value expresses no opinion. The mode and the project default tier each take the value of the latest layer that sets them validly. Overrides merge per workflow: a personal override replaces the team override for that one workflow only, and every workflow the personal file does not name keeps its team override. Personal layers apply to the developer's own assistant at run time. Outputs shared with the whole team — generated files kept under version control — read the framework default and the team configuration only, so one developer's personal settings never reach another developer.

| Setting                   | Team sets it | Personal source sets it | Value at run time    | Value in shared outputs                |
| ------------------------- | ------------ | ----------------------- | -------------------- | -------------------------------------- |
| Route mode / default tier | any          | Yes                     | personal value       | team value, else the framework default |
| Route mode / default tier | Yes          | No                      | team value           | team value                             |
| Override for workflow W   | any          | Yes, for W              | personal value for W | team value for W, else no override     |
| Override for workflow W   | Yes, for W   | No (names others)       | team value for W     | team value for W                       |

### BR-WFR-06: Explicit requests run every tier; what a self-matched workflow does depends on the mode [HARD]

**Statement:** A workflow the user asks for explicitly — by command on any host or in words — runs in every mode and whatever its effective tier, with no question. A workflow the assistant decides by itself to start acts by the mode. In ask (the default) it never starts until the user answers the workflow question, whatever its tier: one question offering the full workflow with its step count, a slimmer custom route listing its steps with every required quality gate kept, or direct execution, the recommended option first with a one-line reason; the effective tier only decides which option is recommended. In auto it starts without asking, by its tier: an auto-tier workflow starts; a confirm-tier workflow starts too unless a leaner route would also do, in which case the same one question is asked; a manual-tier workflow never starts by itself. In off nothing the assistant chooses starts unasked (BR-WFR-08). A workflow that a skill step, a named skill or a running parent workflow requires is part of that run, not self-matched, and follows neither rule (BR-WFR-13). In ask and auto, the workflow question or the start applies on the first task of a session only; mid-session the assistant neither starts a workflow nor asks to. A route that is not the start of a catalog workflow (a direct answer, one skill, or a focused custom route — including one chosen after downgrading a matched workflow because it fits poorly) asks nothing, in every mode, and the assistant declares the route and acts.

| Request                                                                       | Mode      | Tier    | Assistant                                                        |
| ----------------------------------------------------------------------------- | --------- | ------- | ---------------------------------------------------------------- |
| Explicit, by command or in words                                              | any       | any     | runs it, no question                                             |
| Required by a skill step, a named skill or a running parent workflow          | any       | any     | runs as part of that run, no question, never skipped (BR-WFR-13) |
| Self-matched, first task of a session                                         | ask       | any     | asks the workflow question, then follows the answer              |
| Self-matched, first task of a session                                         | auto      | auto    | starts it without asking                                         |
| Self-matched, first task of a session                                         | auto      | confirm | starts it; asks the question only when a leaner route would do   |
| Self-matched, first task of a session                                         | auto      | manual  | does not start it; takes the slimmer route or works directly     |
| Self-matched, first task of a session                                         | off       | any     | starts nothing; works directly                                   |
| Self-matched, mid-session                                                     | ask, auto | any     | no workflow, no question; works directly                         |
| No workflow matched, or route downgraded to direct, one skill or custom route | any       | —       | no question; declares the route and acts                         |

### BR-WFR-07: Only known tiers are accepted [HARD]

**Statement:** The project default tier and every override must be auto, confirm or manual. Any other value fails validation with a message naming the setting and the three allowed tiers.

### BR-WFR-08: Off notice replaces the guidance and keeps its promise [HARD]

**Statement:** When the mode is off, the assistant receives the off notice instead of the gate and catalog; the big catalog is never delivered. The notice opens with the mode line, states that routing is off and overrides every instruction to select a workflow automatically; it tells the assistant not to choose or start a workflow by itself, to skip a step that would start a workflow the assistant chose (a step that merely offers one to the user stays as written, and a workflow a run requires is not skipped, BR-WFR-13), and to run a workflow — or the one skill the user names — only when the user explicitly asks; and it keeps every quality gate binding.

### BR-WFR-09: Delivered once, re-armed after a compaction [HARD]

**Statement:** The routing guidance — or the off notice while routing is off — is delivered once per conversation and is not repeated while it is still in the assistant's context. It is delivered again when it may have left that context: its content changed, the conversation record grew by the re-arm distance (about 4.5 MB) or shrank since the delivery, or the conversation was compacted after the delivery. A compaction re-arms delivery on both hosts: the primary host (Claude) records it as a compaction-boundary entry in its conversation record, and the second host (Codex) records it as a compaction record of its own at the top level of its conversation record. The word "compacted" appearing only inside another record — nested in its content or quoted in a message — is not a compaction and re-arms nothing. Any number of compactions before the next prompt re-arm exactly one delivery.

| Since the last delivery                                               | Next prompt              |
| --------------------------------------------------------------------- | ------------------------ |
| Nothing changed                                                       | silent                   |
| A compaction recorded by the primary host                             | guidance delivered again |
| A top-level compaction record written by the second host              | guidance delivered again |
| "compacted" only nested in or quoted by another record                | silent                   |
| Content changed, or the record grew by the re-arm distance, or shrank | guidance delivered again |

### BR-WFR-10: Route mode: ask by default, fixed precedence, fail-safe to ask [HARD]

**Statement:** The route mode is one of ask, auto and off. Its value is the latest valid one among: built-in ask; the team project configuration; the person's every-project file; the person's checkout file; the environment variable; this session's prompt directive (BR-WFR-11). A source with no project configuration at all, no setting, an unknown value, or an unreadable or malformed file expresses no opinion, and the next source decides; nothing fails or blocks the prompt, and the result ends at ask. A file saved with a byte-order mark or as UTF-16 is read normally. The environment variable also accepts the usual switch-off spellings as off, tolerates surrounding spaces and quotes, and ignores a blank value. The earlier on/off setting still works: false reads as off and true as ask, and the named mode wins when both are set in one file. Every delivered text opens with "Route mode: <mode> (<source>)", so the state is visible without any tool.

| Sources that name a valid mode                        | Mode used                     | Source shown                 |
| ----------------------------------------------------- | ----------------------------- | ---------------------------- |
| none (no project configuration, no file, no variable) | ask                           | default                      |
| team only                                             | the team value                | project config               |
| team and person's every-project file                  | the file's value              | the user file                |
| … and checkout file                                   | the checkout file's value     | the checkout file            |
| … and environment variable                            | the variable's value          | the environment variable     |
| … and a session directive                             | the directive's value         | set by the prompt            |
| a source holding only an invalid or corrupt value     | as if that source were absent | the next source that decides |

### BR-WFR-11: A first-line prompt directive sets the mode for the session [HARD]

**Statement:** A prompt whose whole first line is "workflow-mode: <mode>", "/workflow-mode <mode>" or "$workflow-mode <mode>" (mode: ask, auto or off; case-insensitive; optionally followed by "save" or "--save") is a mode directive. It applies to that prompt and, when the session preference can be remembered, to every later prompt of the same session ahead of every other source. If it cannot be remembered, the reply states that the change applies only to the current prompt and that later prompts use the recorded or configured mode. A new session returns to the configured mode. The new route is delivered even when a route was delivered earlier in the session; repeating a directive for the mode already delivered only acknowledges it. The first task after the directive counts as the session's first task for the first-task rule (BR-WFR-06). With "save" the person's every-project file is updated, keeping its other settings; a file that cannot be read is left untouched and reported. A directive on a later line, inside a code fence, followed by other words, or mentioned in prose is not a directive and changes nothing. The assistant treats the directive line as already applied, not as a task.

### BR-WFR-12: Personal settings stay personal [HARD]

**Statement:** The person's every-project file lives in the person's home directory, outside every repository. The checkout file lives under the framework folder and is ignored by version control. The environment variable and the session directive are never stored in the repository. Tracked, team-shared outputs read the built-in and team layers only (BR-WFR-05). The mode command writes a personal file only on request; it writes the checkout file only after version control confirms the file is ignored, and it never writes the team project configuration.

### BR-WFR-13: A workflow a run requires is part of that run [HARD]

**Statement:** A workflow that an explicit skill step, a skill the user named or an already-running parent workflow requires (for example a pull-request skill that runs the review workflow as its own step, or a nested review or end-to-end workflow inside a feature workflow) is part of that run, not a workflow the assistant chose by itself. It asks no workflow question in ask and is not skipped in off; it still runs with the quality gates of its run. Modes ask and off govern only a workflow the assistant chooses to start for the task: in ask a self-chosen catalog workflow still waits for the workflow question, and in off it is still not started. The routing gate, the off notice, the workflow start guidance and the configuration guide each state this in one sentence. A commit of unreviewed changes stays blocked by the review gate whatever the mode.

---

### BR-WFR-14: Additional route guidance excludes private files [HARD]

**Statement:** For every additional route file named by a team or personal setting, both the chosen name and the final file it resolves to must remain inside the project and outside the privacy-sensitive classes: environment secrets, credentials, secret configuration and private keys. Another name or linked folder never makes a private target eligible. A refused file contributes no text and expresses no opinion, so an eligible earlier source can still decide. Public aliases and example or template files that are allowed by the same privacy policy remain readable. Off carries no additional route guidance.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/workflow-routing-config]`

---

## 5. Domain Model

### Relationships (overview)

```
Project           1──N Workflow            (framework and project workflows)
Workflow          1──N ParallelPhase       (zero or more)
Project           1──1 ActivationPolicy    (default tier, overrides)
ActivationPolicy  1──N WorkflowOverride
Project           1──N RootInstructionFile (zero to two; each holds project information only)
RoutingGuidance   1──1 GateVariant         (the gate lines for ask or auto)
RoutingGuidance   1──1 WorkflowCatalog
Person            1──N PersonalModeSource  (every-project file, checkout file, environment variable)
Session           0──1 SessionMode         (set by a prompt directive)
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

| Property                  | Type   | Required | Constraints                                                    | Business Meaning                               |
| ------------------------- | ------ | -------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Carries route text | yes-no | Yes      | Never: no root file carries the gate or a pointer | Keeps one copy of the rule |

### Entity: RoutingGuidance

| Property     | Type              | Required | Constraints                                | Business Meaning                   |
| ------------ | ----------------- | -------- | ------------------------------------------ | ---------------------------------- |
| Mode line    | text              | Yes      | "Route mode: <mode> (<source>)"            | The state the assistant obeys      |
| Gate variant | enum RouteMode    | Yes      | ask or auto, per BR-WFR-03 and BR-WFR-06   | The routing rule for the mode      |
| Form         | enum GuidanceForm | Yes      | First that fits, per BR-WFR-01             | How much of the catalog is carried |
| Catalog      | text              | Yes      | Rows per BR-WFR-02, or index rows, or none | What the assistant routes from     |
| Length       | number            | Yes      | At most 9,500 characters                   | Fits the host cap                  |

### Entity: SessionMode

| Property | Type           | Required | Constraints                   | Business Meaning                                      |
| -------- | -------------- | -------- | ----------------------------- | ----------------------------------------------------- |
| Mode     | enum RouteMode | Yes      | Set by a first-line directive | Applies to the rest of the session, then is forgotten |

### Enum: ActivationTier

| Value   | Meaning                                                                                  |
| ------- | ---------------------------------------------------------------------------------------- |
| auto    | The workflow question recommends the option that fits the request best                   |
| confirm | The workflow question recommends the full workflow only when nothing leaner would do     |
| manual  | The workflow question never recommends the full workflow; it runs when the user picks it |

### Enum: GuidanceForm

| Value                  | Meaning                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Compact catalog        | Name, tier, step count, hint and phase marks per workflow        |
| Compact rows           | The same rows without the line of step-skill names               |
| Index with phase marks | Name, tier and phase marks per workflow                          |
| Index with tiers       | Name and tier per workflow                                       |
| Pointer only           | No workflow rows; the workflow pointer and advancement rule only |

### Enum: RouteMode

| Value | Meaning                                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| ask   | Default. A catalog workflow the assistant routes to asks the workflow question first; direct, skill and custom routes ask nothing |
| auto  | A matched workflow starts without asking, by its tier                                                                             |
| off   | Only the state notice is delivered; nothing starts without an explicit request                                                    |

### Domain Events (business occurrences)

| Occurrence                         | When it happens                                       | Who/what reacts (business outcome)                                                        |
| ---------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Prompt received                    | The user submits a prompt                             | The mode is resolved; guidance or the off notice is built and added once per conversation |
| Root instruction files regenerated | A maintainer regenerates them                         | They hold project information only                                                        |
| Tier settings changed              | A maintainer sets a default or an override            | The next catalog shows the new effective tiers                                            |
| Mode changed                       | A person edits a personal source or sends a directive | The next prompt delivers the route for the new mode                                       |
| Conversation compacted             | Either host condenses the conversation                | The next prompt carries the guidance again (BR-WFR-09)                                    |

---

## 6. Process Flows

> No screen exists: the interaction surface is the routing guidance the assistant receives, validation messages and the catalog text. Backend-only capability; the view inventory is skipped for that reason.

### Flow: Build the routing guidance for a prompt

| Step | Actor  | Action                                                           | System Response                                                               | Next            |
| ---- | ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| 1    | User   | Submits a prompt                                                 | First-line directive applied (BR-WFR-11); route mode resolved (BR-WFR-10)     | 2 or off notice |
| 2    | System | Picks the gate variant for the mode                              | Full gate for ask or auto (BR-WFR-03); mode line added                        | 3               |
| 3    | System | Resolves every workflow's effective tier                         | Tier per BR-WFR-04                                                            | 4               |
| 4    | System | Renders the compact catalog, or the first shorter form that fits | Rows per BR-WFR-02 or an index; advancement rule and pointer kept (BR-WFR-01) | 5               |
| 5    | System | Adds the guidance before the prompt                              | Within the size cap (BR-WFR-01)                                               | end             |

### Flow: Assistant chooses a route

| Step | Actor     | Action                                 | System Response                                                                           | Next |
| ---- | --------- | -------------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| 1    | Assistant | Reads the guidance and picks a route   | —                                                                                         | 2    |
| 2    | Assistant | Route matches no workflow              | Proceeds without asking                                                                   | end  |
| 3    | Assistant | Route is to start a workflow, mode ask | Asks the workflow question, recommendation by tier                                        | 4    |
| 4    | User      | Picks full, slimmer or direct          | The assistant follows the answer without re-asking                                        | end  |
| 5    | User      | Asks for a workflow explicitly         | It runs whatever its tier and mode (BR-WFR-06)                                            | end  |
| 6    | Assistant | Route matches a workflow, mode auto    | Starts it by its tier; asks only for a confirm-tier workflow when a leaner route would do | end  |
| 7    | Assistant | Route matches a workflow, mode off     | Starts nothing; works directly                                                            | end  |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create | Edit | Delete | Scope                                                           |
| -------------------- | :--: | :----: | :--: | :----: | --------------------------------------------------------------- |
| Framework maintainer | yes  |  yes   | yes  |  yes   | Framework workflows and their framework tiers                   |
| Project maintainer   | yes  |   no   | yes  |   no   | Team routing switch, default tier and overrides                 |
| Developer            | yes  |   no   | yes  |   no   | Own personal files, environment variable and session directives |
| AI assistant         | yes  |   no   |  no  |   no   | Reads the guidance; starts only what its effective tier allows  |
| User                 | yes  |   no   |  no  |   no   | May request any workflow explicitly                             |

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a project maintainer or the AI assistant; the observable surface is the routing guidance text, the catalog and validation messages (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: the IDs were pre-allocated by the release plan so implementation phases could reference them in parallel; categories below group them by behavior rather than by decade.

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 2      | 2         | 0      |
| P1        | 19     | 19        | 0      |
| P2        | 1      | 1         | 0      |
| **Total** | **22** | **22**    | **0**  |

| Category                    | TCs                                                                    |
| --------------------------- | ---------------------------------------------------------------------- |
| Core Routing Guidance Tests | TC-WFR-001, TC-WFR-002, TC-WFR-003, TC-WFR-004, TC-WFR-005, TC-WFR-013 |
| Activation Tier Tests       | TC-WFR-006, TC-WFR-007, TC-WFR-009, TC-WFR-011, TC-WFR-012             |
| Validation Tests            | TC-WFR-008                                                             |
| Invariant / Property Tests  | TC-WFR-010, TC-WFR-022                                                             |
| Route Mode Tests            | TC-WFR-014, TC-WFR-015, TC-WFR-016, TC-WFR-017, TC-WFR-018, TC-WFR-019, TC-WFR-020, TC-WFR-021 |

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
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: a 30-workflow registry fits under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: this framework registry fits under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 index-with-marks fallback: 30 workflows without a root gate fit under 9,500 chars`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 tiers-only index fallback: rows keep id and tier when the marked index overflows`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 pointer-only fallback drops workflow rows when even the index overflows`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 a protocol larger than the cap is delivered whole with the pointer-only form`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-001 a compact payload of exactly 9,500 chars is kept; 9,501 falls back, first without the step-skill names, then to the index` · **Status:** Tested

---

#### TC-WFR-002: The gate is delivered in full whatever the root instruction files hold [P1]

**Objective:** Prove that the per-prompt guidance always carries the full routing gate, with its marker and the parallel-phase marks, for every layout of root instruction files.

**Business Intent / Invariant Guarded:** The routing rule exists in one place, the guidance, so it is never lost and never contradicted by a second copy in a root file (BR-WFR-03).

**Traces:** AC-WFR-03 / AC-WFR-05 / BR-WFR-03

**Preconditions:**

- Routing is on in mode ask
- Root instruction files may be missing, empty of any route text, carry a retired pointer, carry an outdated gate, or be unreadable
- At least one workflow has a parallel phase

**Real-World Reachability:** Projects are at every stage of regeneration: none, old gate in the root files, or a retired pointer.

**Demo Flow:** Submit a prompt in each layout and read the routing guidance the assistant receives.

```gherkin
Given a project whose root instruction files are in any of the layouts above
When the assistant receives a prompt and the routing guidance is added
Then the guidance contains the gate marker and the full gate body
And it never says the gate is in a root instruction file
And every workflow with parallel phases still shows its parallel-phase marks and the advancement rule
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Delivers the gate body for the mode in every layout                                                                                                       |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Gate marker, full gate, the catalog with its parallel-phase marks and the advancement rule                                                                |

**Acceptance Criteria:**

- ✅ Gate marker and full gate present in every layout
- ✅ Parallel-phase marks and advancement rule present
- ❌ A pointer line or nothing in place of the gate
- ❌ Marker or parallel-phase marks missing

**Test Data:**

```json
{
    "rootLayouts": ["none", "no route block", "pointer only", "outdated gate", "unreadable file"],
    "marker": "<!-- CK:WORKFLOW-GATE -->"
}
```

**Edge Cases:**

- A root instruction file that still carries an outdated gate → the guidance still carries the current gate; regenerating the file removes the outdated copy
- A root file that cannot be read → no effect on the guidance

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: rule/hooks/gate-payload]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `rule/hooks/gate-payload` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-002 gate delivered in full whatever the root files hold` · **Status:** Tested

---

#### TC-WFR-003: Root instruction files carry no route text [P1]

**Objective:** Prove that the generated root instruction files hold no routing rule, no pointer and no catalog, and that the gate text keeps an ask variant and an auto variant.

**Business Intent / Invariant Guarded:** A second copy of the rule in a root file would contradict a person's auto or off mode; the hook is the only carrier (BR-WFR-03, AC-WFR-04).

**Traces:** AC-WFR-04 / AC-WFR-18 / BR-WFR-03

**Preconditions:**

- Root instruction files generated from the current sources
- The gate text carries an ask variant and an auto variant

**Real-World Reachability:** Every regeneration of a root file.

**Demo Flow:** Read each generated root file and the gate text.

```gherkin
Given the generated root instruction files of every host
When each is read
Then it holds no route pointer, no gate body, no workflow question, no routing table and no catalog
And the gate text renders an ask variant that asks the workflow question and an auto variant that starts by tier
And regenerating a root file that still carries a pointer or gate block removes it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Generators write no route text and strip an outdated pointer or gate block                                                                                |
| **Business data state** | Root files regenerated                                                                                                                                    |
| **Data shown on UI**    | No route text in any root file                                                                                                                            |

**Acceptance Criteria:**

- ✅ No pointer, gate body, question or catalog in a root file
- ✅ The gate text keeps its ask and auto variants
- ❌ A root file carrying the gate or a pointer

**Test Data:**

```json
{
    "rootFiles": ["CLAUDE.md", "AGENTS.md"],
    "teamModes": ["ask", "auto", "off"]
}
```

**Edge Cases:**

- Any team mode → the same: no route text is stamped
- An outdated root file carrying a pointer or gate → the next regeneration removes it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: rule/hooks/gate-payload]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `rule/hooks/gate-payload` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] [cap] TC-WFR-003 the gate file carries no root pointer block and keeps the ask lines`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-015 tracked outputs carry no route text and the runtime payload has the gate and catalog` · **Status:** Tested
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

**Objective:** Prove that the mode off replaces the guidance with the off notice (no gate, no catalog), and that the notice still forbids self-started workflows while keeping explicit requests and every quality gate.

**Business Intent / Invariant Guarded:** A person or team that turned routing off keeps the promise: the assistant is told not to pick workflows by itself, and the big catalog is not spent (BR-WFR-08).

**Traces:** AC-WFR-12 / BR-WFR-08

**Preconditions:**

- The mode is off, from the team configuration, a personal source or a directive

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
    "workflowRouteMode": "off"
}
```

**Edge Cases:**

- Off in the team file, ask in a personal source → ask (BR-WFR-10 precedence)
- The earlier on/off setting false → off

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-routing-switch`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-008 TC-WFR-005 disabled hook delivers the OFF notice once, never the gate or catalog`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 mode off delivers a short state with no gate and no catalog, once per session, keeping explicit requests` · **Status:** Tested

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

**Objective:** Prove that a valid value in a personal source overrides the team value for the route mode and for the tier settings.

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
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-025 team ON with a local OFF override delivers the OFF notice through the real resolver`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 precedence: project config < user file < checkout file < env < prompt directive`, `.claude/scripts/codex/tests/workflow-skills-catalog.test.mjs::TC-WFR-011 personal file wins over the team configuration for tier settings` · **Status:** Tested

---

#### TC-WFR-012: Every routing surface says an explicit request runs any tier and a self-matched workflow asks first [P1]

**Objective:** Prove that the routing gate in the guidance, the tier legend and the workflow start guidance all state that an explicit user request runs a workflow of any tier, and that in mode ask a workflow the assistant decides to start, of any tier, waits for the workflow question while a direct, single-skill or custom-simple route asks nothing.

**Business Intent / Invariant Guarded:** The user decides every workflow start: the assistant never starts one it matched by itself without asking, and an explicit request always runs (BR-WFR-06).

**Traces:** AC-WFR-11 / BR-WFR-06

**Preconditions:**

- The routing surfaces the assistant reads

**Real-World Reachability:** A user asks by name for a manual workflow.

**Demo Flow:** Read each routing surface and find the explicit-request rule.

```gherkin
Given every surface the assistant routes from
When each is read
Then each states that an explicit user request runs a workflow of any tier
And each states that a workflow the assistant decides to start, of any tier, waits for the workflow question with three options
And each states that a direct, single-skill or custom-simple route proceeds without asking
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Rule present on every surface                                                                                                                             |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The explicit-request sentence on each surface                                                                                                             |

**Acceptance Criteria:**

- ✅ Both rules present everywhere
- ❌ A surface without either rule
- ❌ A surface that lets any tier start by itself
- ❌ A surface that makes a direct, single-skill or custom-simple route ask the workflow question

**Test Data:**

```json
{
    "surfaces": ["routing gate", "tier legend", "workflow start guidance", "route hook guidance"]
}
```

**Edge Cases:**

- Pointer-only guidance form → it carries no tier legend; the rule reaches the assistant through the full gate, which every guidance form carries

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/skills/workflow-first-gate]`
> **Related Behaviors:** `component/skills/workflow-first-gate` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-CP-017 TC-WFR-012 every routing surface asks the workflow question before any tier starts` · **Status:** Tested

---

### Route Mode Tests

#### TC-WFR-014: Each mode delivers its own route [P1]

**Objective:** Prove, by running the real hook, that ask delivers the gate with the workflow question, auto delivers the auto-start gate with no question, and off delivers only a short state with no gate and no catalog.

**Business Intent / Invariant Guarded:** A person's chosen mode changes what the assistant is told, on every prompt, within the size cap (BR-WFR-06, BR-WFR-08, BR-WFR-10).

**Traces:** AC-WFR-12 / AC-WFR-14 / BR-WFR-06 / BR-WFR-08

**Preconditions:**

- A project with the framework workflows and no other configuration
- The mode set through the environment variable

**Real-World Reachability:** A developer who finds the workflow question tedious sets auto; one who never wants workflows sets off.

**Demo Flow:** Submit a first prompt under each mode and read the text the assistant receives.

```gherkin
Given a project with no configuration
When the first prompt arrives
Then the mode is ask, the text opens "Route mode: ask (default)", and it contains the gate, the workflow question and the catalog
And given the mode is auto
Then the text contains the auto-start gate and the auto tier legend and never the workflow question
And given the mode is off
Then only the short off state is delivered, without gate or catalog, and it keeps explicit requests and every quality gate
And each text is delivered once per session and stays within 9,500 characters
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Emits the mode's route once per session                                                                                                                   |
| **Business data state** | Delivery recorded per session                                                                                                                             |
| **Data shown on UI**    | The mode line, then the gate and catalog (ask, auto) or the off notice                                                                                    |

**Acceptance Criteria:**

- ✅ Ask carries the workflow question; auto carries the auto-start text; off carries neither gate nor catalog
- ✅ Every text is at most 9,500 characters and opens with the mode line
- ❌ The workflow question in auto or off
- ❌ A catalog in off

**Test Data:**

```json
{
    "modes": ["ask", "auto", "off"],
    "source": "CK_WORKFLOW_ROUTE_MODE",
    "capCharacters": 9500
}
```

**Edge Cases:**

- Explicit `/workflow-*` request in off → the notice still allows explicit requests
- Second prompt of a session → silent

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-route-modes`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 mode ask (the default) delivers the gate, the workflow question and the catalog once per session`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 mode auto delivers the auto-start gate and never the workflow question`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 mode off delivers a short state with no gate and no catalog, once per session, keeping explicit requests`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 every mode stays under the host output cap`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-014 the shipped gate renders a distinct, fence-free text for ask and for auto`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-026 TC-WFR-012 runtime payload asks the workflow question before any tier starts` · **Status:** Tested

---

#### TC-WFR-015: Mode precedence and fail-safe to ask [P1]

**Objective:** Prove that each source beats the ones below it, and that a missing project configuration, a configuration without the setting, and an invalid or corrupt value in any source all end at ask without failing the prompt.

**Business Intent / Invariant Guarded:** A person's setting always wins over the team's, and no bad value can silently change the mode or break the hook (BR-WFR-10).

**Traces:** AC-WFR-14 / AC-WFR-15 / BR-WFR-10

**Preconditions:**

- A project with the framework workflows
- Sources set one by one: team project configuration, person's every-project file, checkout file, environment variable, session directive

**Real-World Reachability:** A developer on Windows saves the file in an editor that adds a byte-order mark, or types the variable with quotes.

**Demo Flow:** Add one source at a time and read the mode line of the first prompt.

```gherkin
Given only the team sets auto
Then the mode line reads auto from the project config
And given the person's every-project file sets off, then off wins; given the checkout file sets ask, then ask wins; given the variable sets auto, then auto wins; given a first-line directive sets off, then off wins
And given no project configuration at all, or one without the setting, then the mode is ask and the source is default
And given an unknown value, a blank value, a wrong type, malformed JSON or an unreadable file in any source
Then that source is ignored, the next source decides, the result ends at ask, and the hook exits successfully
And given a file saved with a byte-order mark or as UTF-16, or a variable wrapped in quotes, the value still counts
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Resolves the latest valid source; falls through invalid ones; never throws                                                                                |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | "Route mode: <mode> (<source>)"                                                                                                                           |

**Acceptance Criteria:**

- ✅ Precedence: default < project config < user file < checkout file < environment < session directive
- ✅ No project configuration, or no key → ask (default); the show command reports source default
- ✅ Invalid or corrupt value in each source → next source; ends at ask
- ❌ An invalid value that changes the mode
- ❌ A corrupt personal file hiding a valid lower source
- ❌ A non-zero hook exit

**Test Data:**

```json
{
    "invalidValues": ["banana", "", 42, true, ["auto"]],
    "corruptFiles": ["{bad json", "", "[]", "\"off\""],
    "environmentSpellings": ["\"auto\"", " OFF ", "0", "false", "no", "disabled"],
    "encodings": ["UTF-8 with BOM", "UTF-16 LE", "UTF-16 BE"]
}
```

**Edge Cases:**

- The earlier on/off setting false → off; true → ask; the named mode wins in the same file
- A corrupt personal file with a valid team value → the team value applies

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/workflow-routing-config` · `test/hooks/workflow-route-modes`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 precedence: project config < user file < checkout file < env < prompt directive`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 no project config at all, or a config without the key, falls back to ask (default)`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 an invalid or corrupt value in any source is ignored, the next source decides, and the hook never fails`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 a file saved with a BOM or as UTF-16, and a quoted env value, still count`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-015 the legacy workflowAutoDetect boolean reads as off or ask and workflowRouteMode wins in one file` · **Status:** Tested

---

#### TC-WFR-016: A first-line directive sets the mode for the session [P1]

**Objective:** Prove that a directive on the first line of a prompt applies at once, lasts the session when it can be remembered, reports a failure to remember it without promising later-prompt scope, re-delivers the route even after one was delivered, optionally saves to the person's file, and never fires on prose.

**Business Intent / Invariant Guarded:** A person can change the mode by typing one line, without editing a file, and text that merely mentions the words never changes it (BR-WFR-11).

**Traces:** AC-WFR-16 / BR-WFR-11

**Preconditions:**

- A project with the framework workflows; the person's file may set another mode

**Real-World Reachability:** A developer mid-session decides the next task should start without asking.

**Demo Flow:** Send "workflow-mode: off" with a task, then a plain prompt, then "/workflow-mode auto", then start a new session.

```gherkin
Given the session preference can be remembered
And the first line of a prompt is "workflow-mode: off"
Then the off state is delivered with a reply line and the rest of the prompt is the task
And the next plain prompt of the session keeps off and delivers nothing again
And given "/workflow-mode auto" in the same session, then the auto route is delivered although a route was delivered before
And given the same directive repeated, then only the reply line is added
And given a new session, then the configured mode applies again and no file was written
And given "workflow-mode: auto save", then the person's every-project file gets the mode and keeps its other settings; a file that cannot be read is left untouched and reported
And given prose, a later line, a code fence or trailing words, then nothing changes
And given the session preference cannot be remembered, when "workflow-mode: off" is received, then off applies to that prompt and the reply explicitly reports the failure and current-prompt scope
And when the next plain prompt arrives in that session, then the recorded or configured mode applies
And with "save", the personal-file result is reported independently; a successful personal save may decide later prompts through the ordinary preference order
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Records the session mode when possible, reports a failure to remember it, re-delivers on change, saves on request                                                                                         |
| **Business data state** | Session state; with save, the person's every-project file                                                                                                 |
| **Data shown on UI**    | The mode line "set by your prompt this session" and the reply line                                                                                        |

**Acceptance Criteria:**

- ✅ Directive applies at once and, when remembered, to later prompts of the session; a new session returns to the configured mode
- ✅ Failure to remember the session preference is reported without claiming session-wide success; later prompts use the recorded or configured mode
- ✅ Personal saving is reported independently from remembering the session preference
- ✅ Changed mode re-delivered; unchanged mode only acknowledged
- ✅ Save keeps the file's other settings; an unreadable file is not overwritten
- ❌ A directive recognised in prose, on a later line, in a code fence or followed by other words

**Test Data:**

```json
{
    "directives": [
        "workflow-mode: auto",
        "Workflow-Mode:OFF",
        "/workflow-mode ask",
        "$workflow-mode auto",
        "workflow-mode: auto save",
        "/workflow-mode off --save"
    ],
    "notDirectives": [
        "please explain workflow-mode: off in the docs",
        "hello\nworkflow-mode: off",
        "workflow-mode: off please",
        "/workflow-mode",
        "> workflow-mode: off"
    ]
}
```

**Edge Cases:**

- A directive with no other text → the assistant confirms the mode in one line
- The directive for a mode already delivered → acknowledgement only
- The session preference cannot be remembered → current-prompt scope and a clear failure message; the next plain prompt uses the recorded or configured mode
- Session remembering fails while a requested personal save succeeds → both outcomes are reported separately

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]` · `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-route-modes`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-016 a first-line directive applies to this prompt and the rest of the session only`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-016 repeating the same directive only acknowledges it`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-016 prose, a later line, a code fence and trailing words are not a directive`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-016 a directive with save writes the user file, keeps its other keys and refuses a corrupt file`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-016 failed session persistence is reported and later prompts use recorded or configured preferences` · **Status:** Tested

---

#### TC-WFR-017: Personal settings stay personal [P1]

**Objective:** Prove that personal sources never reach tracked output, that the person's file lives outside any repository, and that the mode command shows the winning source, saves to the person's file, and writes the checkout file only when version control ignores it.

**Business Intent / Invariant Guarded:** One developer's mode can never reach another developer or be committed by accident (BR-WFR-05, BR-WFR-12).

**Traces:** AC-WFR-17 / BR-WFR-12

**Preconditions:**

- Team project configuration, person's file, checkout file and environment variable all set

**Real-World Reachability:** A developer saves a mode with the mode command or by hand.

**Demo Flow:** Resolve the mode for the team scope and for the run-time scope, then use the mode command.

```gherkin
Given the team says ask and every personal source says off
When settings are resolved for team-shared output
Then the mode is ask from the project config
And when resolved at run time the mode is off
And the person's file is under the home directory, outside the project
And the mode command with save writes that file, reports a higher-precedence source that still wins, and refuses the checkout file unless version control ignores it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Team scope ignores personal layers; the command writes only personal files                                                                                |
| **Business data state** | A personal file updated on request                                                                                                                        |
| **Data shown on UI**    | The command's mode, source and layer table                                                                                                                |

**Acceptance Criteria:**

- ✅ Team scope reads built-in and team layers only
- ✅ The person's file is outside the repository; the checkout file is ignored by version control
- ✅ The command refuses an un-ignored checkout file and never writes the team configuration
- ❌ A personal value in a tracked file

**Test Data:**

```json
{
    "team": "ask",
    "personal": ["user file: off", "checkout file: off", "environment: off", "directive: off"]
}
```

**Edge Cases:**

- No home directory → no person's file, no error
- An unknown argument to the command → usage error, nothing written

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/workflow-routing-config` · `test/hooks/workflow-route-modes`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-017 the team scope ignores every personal source`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-017 the user file lives under the home directory, outside any checkout`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-017 the workflow-mode CLI shows the source, saves to the user file and refuses an un-ignored checkout file`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-017 the workflow-mode CLI writes the checkout file only when git ignores it`, `.claude/hooks/tests/suites/workflow-routing-switch.test.cjs::[workflow-routing-switch] TC-WRS-007 portable local file is git-ignored` · **Status:** Tested

---

#### TC-WFR-018: Every host that runs hooks delivers the same route [P1]

**Objective:** Prove that the route hook is registered on every supported host and that the Codex launcher runs the same hook and honours the same mode.

**Business Intent / Invariant Guarded:** The mode behaves identically on Claude, Codex and OpenCode; a host that loses the registration silently loses the route (AC-WFR-18, BR-WFR-10).

**Traces:** AC-WFR-14 / AC-WFR-18

**Preconditions:**

- The generated host settings exist

**Real-World Reachability:** A developer switches between hosts on the same checkout.

**Demo Flow:** Read each host's registration, then run the Codex launcher under two modes.

```gherkin
Given the generated settings of Claude, Codex and the OpenCode bridge
Then each registers the route hook for the prompt event
And when the Codex launcher runs the hook with the mode set to auto, then the auto route arrives with the same mode line
And with ask, the ask route arrives
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | One hook file, three registrations                                                                                                                        |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The mode line and route on each host                                                                                                                      |

**Acceptance Criteria:**

- ✅ Registration present on every host
- ✅ Launcher output carries the mode line and the mode's route
- ❌ A host without the registration

**Test Data:**

```json
{
    "hosts": ["Claude", "Codex", "OpenCode"],
    "modes": ["ask", "auto", "off"]
}
```

**Edge Cases:**

- A Codex project not yet trusted, or hooks disabled → no guidance; the host is unsupported until the hooks are trusted (AC-WFR-18)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/workflow-route-modes`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-018 the real Codex launcher command runs the same hook and honours the mode`, `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-018 the route hook is registered for UserPromptSubmit on Claude, Codex and OpenCode` · **Status:** Tested

---

#### TC-WFR-019: A workflow a run requires is part of that run, in every mode [P1]

**Objective:** Prove that the route the assistant receives in ask and auto, and the off notice, each say that a workflow required by a skill step, a named skill or a running parent workflow is part of that run, while a workflow the assistant chooses by itself still asks (ask) or is not started (off).

**Business Intent / Invariant Guarded:** A skill the user invoked keeps its documented flow — a pull-request run reaches its review workflow without a question and without being skipped — while the person's ask and off policy still binds every workflow the assistant picks on its own (BR-WFR-13).

**Traces:** AC-WFR-19 / BR-WFR-13

**Preconditions:**

- A project with the routing gate and workflow registry; hook run as a separate process under each mode

**Real-World Reachability:** A user asks for a pull request; the skill's own step runs the review workflow.

**Demo Flow:** Run the hook in ask, auto and off and read the delivered text.

```gherkin
Given a project in mode ask, auto or off
When the hook delivers the route for the first prompt
Then the ask and auto route each say a workflow required by a skill step, a named skill or a running workflow is part of that run and asks no question
And the off notice says off governs only a workflow the assistant chooses to start
And the ask route still says a self-chosen catalog workflow never starts before the answer
And the off notice still says not to choose or start a workflow by itself
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | The clause is present in every mode's text; the self-chosen rule is unchanged                                                                             |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The required-workflow sentence in each mode's text                                                                                                        |

**Acceptance Criteria:**

- ✅ Clause present in the ask route, the auto route and the off notice
- ✅ A self-chosen workflow still asks in ask and is not started in off
- ❌ A mode text that makes a required workflow ask or be skipped

**Test Data:**

```json
{
    "modes": ["ask", "auto", "off"]
}
```

**Edge Cases:**

- A user names the workflow skill directly → an explicit request, which already runs with no question (AC-WFR-11)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject` · `test/hooks/review-fix-r2-routing-pins`
> **CoveredBy:** `.claude/hooks/tests/suites/review-fix-r2-routing-pins.test.cjs::[review-fix-r2-routing] TC-WFR-019 the ask and auto routes carry the required-workflow clause and a self-chosen workflow still asks first`, `.claude/hooks/tests/suites/review-fix-r2-routing-pins.test.cjs::[review-fix-r2-routing] TC-WFR-019 the off notice carries the required-workflow clause and a self-chosen workflow is still not started`, `.claude/hooks/tests/suites/review-fix-r2-routing-pins.test.cjs::[review-fix-r2-routing] TC-WFR-019 start-workflow and the configuration guide state the required-workflow clause` · **Status:** Tested

---

#### TC-WFR-020: An unreadable workflow registry still delivers the mode gate and one notice line [P1]

**Objective:** Prove that when the workflow registry cannot be read (conflict markers, missing file, a workflow without its inject text, empty file), the hook in ask and auto still delivers the state line and the mode's own gate plus exactly one line saying the catalog is unavailable, and that the mode off is unchanged.

**Business Intent / Invariant Guarded:** The hook is the only carrier of the route; a damaged shipped file must never silence it without a visible sign (BR-WFR-03, BR-WFR-08).

**Traces:** AC-WFR-03 / BR-WFR-03, BR-WFR-08

**Preconditions:**

- A fixture project with its own temporary state and a damaged workflow registry; hook run as a separate process

**Real-World Reachability:** A team with a bad merge or partial sync of the shipped registry file.

**Demo Flow:** Damage the registry, send a first prompt in ask and in auto, then repair the file and send the next prompt of the same session.

```gherkin
Given a project whose workflow registry cannot be read, in mode ask or auto
When the hook delivers the route for the first prompt
Then the state line and the mode's own gate text are delivered, without the other mode's text
And exactly one line says the workflow catalog is unavailable and names the registry to read
And no catalog is delivered and the hook ends normally
And once the registry is repaired the same session receives the real catalog
And mode off delivers its notice unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Hook exits normally; the output stays within the size cap                                                                                                 |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | State line, the mode's gate, one notice line                                                                                                              |

**Acceptance Criteria:**

- ✅ Gate and state line still delivered for an unreadable registry
- ✅ Exactly one notice line; no catalog; no fence line
- ✅ The repaired registry delivers the catalog on the next prompt
- ❌ An empty output for an unreadable registry

**Test Data:**

```json
{
    "breakers": ["conflict markers", "missing file", "workflow without inject text", "empty file"],
    "modes": ["ask", "auto"]
}
```

**Edge Cases:**

- Mode off reads no file and carries no notice

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-020 an unreadable workflow registry still delivers the mode gate and one catalog-unavailable line` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow-route-modes.test.cjs` "[workflow-route-modes] TC-WFR-020 an unreadable workflow registry still delivers the mode gate and one catalog-unavailable line"

---

#### TC-WFR-021: An unavailable gate is reported in one line naming it [P1]

**Objective:** Prove that when the gate file cannot be read (missing, or a folder in its place) or has no guidance for the selected mode, the hook in ask and auto delivers the state line and one line naming the gate file and the registry to read, and that the off notice is unchanged.

**Business Intent / Invariant Guarded:** The person and the assistant see that the route is gone instead of receiving nothing (BR-WFR-03, BR-WFR-08).

**Traces:** AC-WFR-03 / BR-WFR-03, BR-WFR-08

**Preconditions:**

- A fixture project with its own temporary state, a readable registry and a gate that is unreadable or carries no guidance for the selected mode

**Real-World Reachability:** A checkout where the gate file was deleted, blanked, or replaced by an incomplete edit or bad merge.

**Demo Flow:** Remove the gate file, put a folder in its place, and separately leave it blank or with no guidance for the chosen mode; send a first prompt in ask, auto and off. Restore the gate and send another prompt in the same conversation.

```gherkin
Given a project whose gate file cannot be read or carries no guidance for that mode, in mode ask or auto
When the hook delivers the route for the first prompt
Then the state line is delivered
And exactly one line says the route is unavailable, names the gate file and says to read it and the registry
And no catalog is delivered and the hook ends normally
And mode off delivers its notice with no unavailable line
And after the gate is repaired, the next prompt in the same conversation delivers the gate and catalog
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Hook exits normally                                                                                                                                       |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | State line and one notice line                                                                                                                            |

**Acceptance Criteria:**

- ✅ One notice line naming the gate file for a missing file, an unreadable path, or no guidance for the selected mode
- ✅ Repair restores the normal guidance in the same conversation
- ✅ Off notice unchanged
- ❌ An empty output for an unreadable gate file

**Test Data:**

```json
{
    "breakers": ["missing gate file", "a folder in place of the gate file", "empty file", "whitespace only", "empty gate markers", "guidance for another mode only"],
    "modes": ["ask", "auto", "off"]
}
```

**Edge Cases:**

- A good registry does not hide an unavailable gate: the notice still appears
- Non-empty guidance without markers remains readable
- An empty marked gate is unavailable even if text outside the gate exists

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/workflow-route-inject]`
> **Related Behaviors:** `operation/hooks/workflow-route-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-021 an unreadable gate file is reported in one line naming it, and the off notice is unchanged` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow-route-modes.test.cjs` "[workflow-route-modes] TC-WFR-021 an unreadable gate file is reported in one line naming it, and the off notice is unchanged"

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

#### TC-WFR-022: Private route files remain private through aliases [P0]

**Objective:** Prove that selecting additional route guidance through another name cannot expose private local content, while ordinary public guidance remains usable.

**Business Intent / Invariant Guarded:** For every configured route file, a private chosen name or final target contributes no text to the assistant's guidance (BR-WFR-14).

**Traces:** AC-WFR-20 / BR-WFR-14, BR-WFR-08

**Preconditions:**

- A project with readable standard routing guidance
- Publicly named additional guidance that points to a private credentials file, and separately to a public guidance file
- The private and public files contain distinct synthetic text

**Real-World Reachability:** A maintainer shares a public guidance alias; on a developer's checkout its target is a local credentials file. The developer later sends a normal task prompt. Public aliases arise from a maintainer sharing reusable guidance in the same project.

**Demo Flow:** Select the private-target alias and send prompts in ask and auto; inspect the delivered guidance for absence of private text. Select the public-target alias and repeat, then select off. Finally set a private personal alias over public team guidance and send another prompt.

```gherkin
Given additional route guidance points through a public name to private credentials
When a developer sends a task in ask or auto
Then the normal route arrives without the private text
And a public alias to eligible public guidance still contributes its text
And an allowed example file remains readable
And a rejected personal file leaves eligible team guidance in force
And off contributes no additional guidance
```

**Expected Result:**

| Dimension | Expectation |
| --- | --- |
| **UI** | Not applicable — no screen; the observable surface is assistant context |
| **System behavior** | Private files are refused without failing the prompt |
| **Business data state** | Private content stays private and no setting is changed |
| **Data shown on UI** | Standard routing guidance plus eligible public text only |

**Acceptance Criteria:**

- ✅ No synthetic private text in any ask or auto result
- ✅ Public and allowed example aliases contribute their text
- ✅ An ineligible personal source does not suppress eligible team guidance
- ✅ Off carries no additional route text
- ❌ A harmless chosen name authorizes reading a private final target

**Test Data:**

```yaml
inputDomain: "every additional route file named directly or through an in-project alias, in ask or auto"
invariant: "a private chosen name or resolved target contributes no text"
boundaryCounterCase: "an alias to a public file or an allowed example file remains readable"
```

**Edge Cases:**

- A linked folder reaches an in-project credentials file under a public leaf name
- A public guidance file remains readable through a linked folder
- The public example exception stays governed by the existing privacy policy
- A rejected personal source falls through to eligible team guidance
- A project reached through an alias still carries its eligible public guidance

**Preservation Tests:** Eligible public aliases and allowed examples still appear in the normal guidance; off remains unchanged.

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/workflow-routing-config]`
> **Related Behaviors:** `rule/scripts/workflow-routing-config` · `operation/hooks/workflow-route-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/workflow-route-modes.test.cjs::[workflow-route-modes] TC-WFR-022 private protocol aliases are refused while public aliases remain readable` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/workflow-route-modes.test.cjs` "[workflow-route-modes] TC-WFR-022 private protocol aliases are refused while public aliases remain readable"

---

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
