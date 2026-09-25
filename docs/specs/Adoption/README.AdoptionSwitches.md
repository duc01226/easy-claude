---
module: 'hooks'
service: 'framework.Adoption'
feature_code: 'ADS'
entities:
    [
        'ProjectSwitches',
        'CodeGraphMode',
        'SkillVisibility',
        'HostPermissionEntry',
        'GeneratedCommand',
        'SkillProfile',
        'GraphToolingEnvironment',
        'CompactionBudget'
    ]
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

# Adoption Switches — Feature Spec

> **Release A verified against code.** Every release-A case in §8 carries a `[Source:]` anchor; all but TC-ADS-010 are covered by automated tests, and TC-ADS-010 is a Manual-QC case run once per host at the release-A close. Rules and rows marked `Planned (release D)` are pre-allocated for a later release and stay provisional; their test cases live in the continuation part, which keeps its own provisional banner.

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> Technical identifiers live only in frontmatter, Related Documentation and the Section 8 hidden carriers.

**See also:** [README.AdoptionSwitches-Part2.md](README.AdoptionSwitches-Part2.md) — continuation part with the release-D test cases.

## Related Documentation

| Type                   | Path                                                                                                                                             | Description                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Spec Index (derived)   | `docs/specs/Adoption/INDEX.md`                                                                                                                   | Generated navigation catalog for this bucket; refresh through the spec index owner.                              |
| Continuation part      | `docs/specs/Adoption/README.AdoptionSwitches-Part2.md`                                                                                           | The release-D test cases (TC-ADS-016…033, TC-ADS-040…053), under their original IDs.                             |
| Project settings       | `docs/project-config.json` (`hooks.codeGraph`, `hooks.tokenBudget`, `commit.fixOriginTrailer`, `portability.workflowActivation`, `skillProfile`) | The team switches this capability reads.                                                                         |
| Primary assistant host | `.claude/settings.json`, skill frontmatter `disable-model-invocation`                                                                            | Skill visibility and command-only marks.                                                                         |
| Second assistant host  | `.codex/`, `.agents/skills/<name>/agents/openai.yaml`                                                                                            | Generated copy and per-skill implicit-selection policy.                                                          |
| Third assistant host   | `opencode.json` `permission.skill`, `.opencode/commands/`, `.opencode/skill-permissions.generated.json`                                          | Permission entries, generated commands and the ownership record.                                                 |
| Graph tooling          | `.claude/hooks/lib/graph-utils.cjs`, `.claude/scripts/code_graph/`, `.claude/skills/graph-build/SKILL.md`                                        | Graph mode, lazy install and the graph command.                                                                  |
| Workflow routing       | `docs/specs/ContextDelivery/README.WorkflowRouting.md`                                                                                           | Effective activation tiers used by the third-host parity rules.                                                  |
| Compaction settings    | `.claude/settings.json` `env`, `.codex/config.toml` `model_auto_compact_token_limit`, root `opencode.json` `provider.<id>.models.<model>.limit`  | Where each host would pin an auto-compaction budget; the bundle pins none and retires only its own former value. |

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

A project that adopts the framework gets a set of project-level switches that decide what the framework does by itself, so adopting it brings no surprise installs, no noise about unused capabilities and no workflow the team did not allow. The code knowledge graph runs only when the project chose it or already built one; a commit trailer used for defect-origin measurement appears only when the project opts in; utility skills run only on explicit command; and the third assistant host enforces the same visibility policy as the other two, without ever taking over a permission the user set. The framework also leaves the conversation-compaction point to each host and each person: it sets no budget of its own, and removing the budget it once set never touches a value a user chose. A later release extends the same switches with a per-project skill profile, a shared graph tooling environment and leaner skill texts; their test cases are reserved in this spec's continuation part so numbering never changes.

---

## 2. Glossary

| Term                                    | Definition                                                                                                                               | Context                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Adopting Project                        | A project that copies the framework to use it                                                                                            | The audience of every switch                                                |
| Primary / Second / Third Assistant Host | The three assistant hosts the framework supports; each reads its own generated copy of the skills and settings                           | Mapping to products in Related Documentation                                |
| Code Knowledge Graph                    | A project-local index of code relationships the assistant can query                                                                      | Built on explicit request                                                   |
| Graph Mode                              | The switch deciding graph activity: auto (active only when a graph has been built), on, off                                              | Default auto                                                                |
| Graph Tooling Environment               | The private set of helper tools the graph needs, installed once                                                                          | Installed on first build, never at session start unless the graph is active |
| Graph-Not-Built Note                    | A one-line reminder that the graph is chosen but not yet built                                                                           | Only in mode on, once per session                                           |
| Graph Command                           | The command-line entry the assistant and skills use to query or build the graph                                                          | Refuses every command in off mode                                           |
| Fix-Origin Trailer                      | An optional commit-message line naming where a fixed defect came from                                                                    | Opt-in; new commits only                                                    |
| Utility Skill                           | One of fifteen skills no workflow, agent or automatic step calls                                                                         | Command-only by default                                                     |
| Command-Only Skill                      | A skill the assistant never selects by itself; a user runs it by explicit command                                                        | Keeps working on every host                                                 |
| Called Skill                            | A skill named as a step of a workflow or preloaded by an agent                                                                           | Never hidden unless the project opts in                                     |
| Effective Tier                          | A workflow's activation tier after project settings (see the Workflow Routing spec)                                                      | auto, confirm or manual                                                     |
| Permission Entry                        | A third-host setting that hides a skill, asks before loading it, or allows it                                                            | Keyed by skill name                                                         |
| Ownership Record                        | The list of permission entries the generator wrote, with the values it wrote                                                             | Only owned entries are ever changed or removed                              |
| Conflict Line                           | A printed line naming a setting the generator wanted to change but left to the user                                                      | Never silent                                                                |
| Generated Command                       | A third-host command file that loads a hidden skill and passes the user arguments                                                        | Carries a generated marker                                                  |
| Check Mode                              | A run that changes nothing and fails when generated output is stale                                                                      | Used before release                                                         |
| Token Checkpoint Interval               | How many tokens pass between two progress notes                                                                                          | Validated range 50,000 to 20,000,000                                        |
| Auto-Compaction Budget                  | The conversation size at which an assistant host condenses the conversation to free room                                                 | Set by the host or the user, never by the framework                         |
| Host Default                            | The compaction point a host applies when no budget is set, based on the model's own context size                                         | Applies on every host unless a user sets a budget                           |
| Bundled Value                           | A setting value an earlier framework version wrote into a project's host configuration                                                   | Removed only while it still equals what the framework wrote                 |
| Skill Profile                           | A per-project choice of which skills the assistant sees in full, by name only, or not at all (release D)                                 | Preset plus lists                                                           |
| Name-Only Skill                         | A skill listed by name without its description; still callable (release D)                                                               | Shortens the skill list                                                     |
| Entry Skill                             | One of the skills the minimal preset keeps fully listed: the workflow starter, the commit skill and the project setup skills (release D) | Every other skill becomes name-only under that preset                       |
| Install Lock                            | A marker that stops two sessions from installing the shared graph tooling at once (release D)                                            | Stale locks are broken safely                                               |

---

## 3. User Stories & Acceptance Criteria

### US-ADS-01: The code graph only when the project chose it

**As a** project maintainer adopting the framework
**I want** graph installs, notes and activity only when my project uses the graph
**So that** adopting the framework costs nothing for a capability we do not use

**Acceptance Criteria:**

- **AC-ADS-01** — **Given** graph mode auto and no built graph **When** a session starts **Then** nothing is installed
- **AC-ADS-02** — **Given** no built graph **When** prompts are submitted **Then** a graph-not-built note appears only in mode on, at most once per session, and never after it was dismissed
- **AC-ADS-03** — **Given** the graph tooling is missing **When** the user builds the graph **Then** the build installs its own tooling first
- **AC-ADS-04** — **Given** graph mode off **When** sessions, edits, prompts or graph commands run **Then** no graph output, refresh or background process occurs and every graph command refuses with the off message

### US-ADS-02: A measurement trailer only when the team measures

**As a** developer committing through the framework
**I want** the fix-origin trailer offered only when my project opted in
**So that** I am never asked for a line nothing reads, and never asked to rewrite history

**Acceptance Criteria:**

- **AC-ADS-05** — **Given** the trailer switch **When** the commit guidance is read **Then** the trailer appears only when the switch is on, the switch is named, it applies to new commits only, and no text claims an automated check

### US-ADS-03: Utilities on command only

**As a** developer
**I want** utility skills to run when I call them and never by the assistant's own choice
**So that** they do not self-trigger or crowd the skill list

**Acceptance Criteria:**

- **AC-ADS-06** — **Given** the fifteen utility skills **When** the primary and second host copies are read **Then** each is marked command-only
- **AC-ADS-07** — **Given** a command-only skill **When** a user invokes it explicitly on any of the three hosts **Then** it runs

### US-ADS-04: The third host enforces the same policy safely

**As a** team using the third assistant host
**I want** the same visibility policy as the other hosts, without the generator taking over my own settings
**So that** the manual and confirm tiers mean the same everywhere and my permissions stay mine

**Acceptance Criteria:**

- **AC-ADS-08** — **Given** command-only skills and workflows at their effective tiers **When** the third host is synced **Then** manual and command-only skills are hidden, confirm workflows ask, auto workflows get no entry, user entries are never adopted, overwritten or loosened, an ownership record copied from another project owns nothing, a deleted owned entry is restored, unrelated settings are preserved, and a second run changes nothing
- **AC-ADS-09** — **Given** a hidden skill **When** the third host is synced **Then** a generated command loads it with the user arguments, its name comes from the validated skill folder, it is written only inside the commands folder, user commands are never touched, and the check mode catches drift
- **AC-ADS-10** — **Given** a called skill **When** any generator would hide it or make it command-only **Then** it stays loadable with a printed skip or refusal, unless the project opts in to hiding called skills (the opt-in arrives in release D)

### US-ADS-05: Safe settings values

**As a** project maintainer
**I want** out-of-range switch values rejected
**So that** a typo never changes behavior silently

**Acceptance Criteria:**

- **AC-ADS-11** — **Given** a token checkpoint interval outside 50,000 to 20,000,000 **When** the configuration is validated **Then** an error names the setting and the range

### US-ADS-06: Choose how many skills the assistant sees (release D)

**As a** project maintainer
**I want** a skill profile with presets and lists
**So that** the assistant sees only the skills my team uses, on every host

**Acceptance Criteria:**

- **AC-ADS-12** — **Given** a skill profile **When** the primary host is synced **Then** preset and list entries are written under the ownership record, user entries are untouched, other settings are byte-identical, invalid settings files are never overwritten, and no profile means no change
- **AC-ADS-13** — **Given** a skill profile **When** the second and third host copies are generated **Then** name-only and command-only take their host equivalents, user permissions are never loosened, a called name-only skill follows the recorded probe result, and no profile means unchanged output

### US-ADS-07: Leaner skill texts, decided by measurement (release D)

**As a** framework maintainer
**I want** skill text reductions measured and bounded
**So that** shorter texts never cost compliance or leave traces behind

**Acceptance Criteria:**

- **AC-ADS-14** — **Given** skills whose emphasis was reduced **When** they are read and measured **Then** summary and closing emphasis stay, each decision is recorded per host, and the comparison runs leave the repository and host state unchanged
- **AC-ADS-15** — **Given** the name-clash spike result **When** the documentation is read **Then** it matches the result
- **AC-ADS-16** — **Given** the step skills **When** the description lint runs **Then** every description starts with the routing prefix and is at most 250 characters, wrappers excepted

### US-ADS-08: One graph tooling install per machine (release D)

**As a** developer with several checkouts
**I want** checkouts with the same graph requirements to share one tooling install
**So that** each checkout does not download the same tools again

**Acceptance Criteria:**

- **AC-ADS-17** — **Given** graph requirements **When** the tooling environment is resolved **Then** a current project environment wins, otherwise a shared per-OS location keyed by the requirements is used, and resolving starts no process
- **AC-ADS-18** — **Given** an install lock **When** a session starts the install **Then** stale locks are broken, a live lock causes a bounded wait and a clear failure, and a holder only ever removes its own lock

### US-ADS-09: My own compaction point on every host

**As a** developer using any of the three assistant hosts
**I want** the framework to set no conversation-compaction budget
**So that** the host default applies and a budget I choose for myself takes effect

**Acceptance Criteria:**

- **AC-ADS-19** — **Given** the framework's shipped settings for all three hosts **When** they are read or synced into a project **Then** none sets a compaction budget, so each host applies its own default and a budget the user sets for themselves takes effect
- **AC-ADS-20** — **Given** a project whose host configuration holds a compaction budget **When** the second or third host is synced **Then** a budget equal to the one an earlier framework version wrote is removed, and any other budget is kept with one printed line naming it

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                                      | Category      | Enforcement | Release |
| --------- | --------------------------------------------------------- | ------------- | ----------- | ------- |
| BR-ADS-01 | Graph mode decides graph activity                         | Activation    | [HARD]      | A       |
| BR-ADS-02 | Graph tooling installs on use                             | Activation    | [HARD]      | A       |
| BR-ADS-03 | Graph-not-built note: mode on only, once per session      | Presentation  | [HARD]      | A       |
| BR-ADS-04 | Off means inert, and the graph command refuses            | Activation    | [HARD]      | A       |
| BR-ADS-05 | Fix-origin trailer is opt-in and forward-only             | Policy        | [HARD]      | A       |
| BR-ADS-06 | Utility skills are command-only on every host             | Visibility    | [HARD]      | A       |
| BR-ADS-07 | Third-host entries follow the effective tier              | Visibility    | [HARD]      | A       |
| BR-ADS-08 | The generator owns only what it wrote                     | Ownership     | [HARD]      | A       |
| BR-ADS-09 | Called skills are never hidden without opt-in             | Visibility    | [HARD]      | A       |
| BR-ADS-10 | Every hidden skill keeps a safe explicit command          | Visibility    | [HARD]      | A       |
| BR-ADS-11 | Token checkpoint interval range                           | Validation    | [HARD]      | A       |
| BR-ADS-12 | Skill profile on the primary host                         | Visibility    | [HARD]      | D       |
| BR-ADS-13 | Settings writer never loses settings                      | Ownership     | [HARD]      | D       |
| BR-ADS-14 | Skill profile on the second and third hosts               | Visibility    | [HARD]      | D       |
| BR-ADS-15 | Emphasis reductions are anchored, measured and traceless  | Quality       | [HARD]      | D       |
| BR-ADS-16 | Name-clash guidance follows the spike result              | Documentation | [SOFT]      | D       |
| BR-ADS-17 | Shared graph tooling environment                          | Activation    | [HARD]      | D       |
| BR-ADS-18 | Install lock recovery                                     | Safety        | [HARD]      | D       |
| BR-ADS-19 | Step-skill description form                               | Quality       | [SOFT]      | D       |
| BR-ADS-20 | No compaction budget on any host                          | Policy        | [HARD]      | A       |
| BR-ADS-21 | A retired bundled value is removed only on an exact match | Ownership     | [HARD]      | A       |

### BR-ADS-01: Graph mode decides graph activity [HARD]

**Statement:** The graph mode is auto, on or off; auto is the default. The graph is active in mode on, and in mode auto only when a built graph exists. It is dormant in mode auto without a built graph, and off in mode off. Any other mode value fails validation with a message naming the setting and the three allowed modes.

| Mode | Built graph exists | Graph state |
| ---- | ------------------ | ----------- |
| on   | any                | active      |
| auto | Yes                | active      |
| auto | No                 | dormant     |
| off  | any                | off         |

### BR-ADS-02: Graph tooling installs on use [HARD]

**Statement:** A session start installs or refreshes the graph tooling only when the graph is active. The first explicit graph build installs the tooling itself, with one command that is the same on every supported operating system, and stops with a clear message if the install fails.

### BR-ADS-03: Graph-not-built note [HARD]

**Statement:** The note that the graph is not built appears only in mode on with no built graph, at most once per session, and never after the user dismissed it. Modes auto and off never show it.

### BR-ADS-04: Off means inert, and the graph command refuses [HARD]

**Statement:** In mode off no automatic step — session start, prompt, or file edit — produces graph output, refreshes the graph or starts a background graph process, even when an old graph exists. Every graph command refuses before opening the graph, fails, and says the code graph is off for this project, naming the setting. Projects without a built graph pay only one cheap existence check on the edit and prompt steps.

### BR-ADS-05: Fix-origin trailer is opt-in and forward-only [HARD]

**Statement:** The commit guidance shows the fix-origin trailer only when the project turned the trailer switch on; by default the template omits it. The guidance names the switch, says the trailer applies to new commits only, never asks anyone to reword existing commits, and never claims that an automated check reads the trailer. A trailer switch that is not yes or no fails validation with a message naming the setting.

### BR-ADS-06: Utility skills are command-only on every host [HARD]

**Statement:** The fifteen utility skills are never selected by the assistant on its own on any host: the primary host marks them command-only, the second host copy stops their implicit selection, and the third host hides them. An explicit command runs each of them on all three hosts. The commit and learn skills stay selectable. A skill that any workflow, agent or automatic step calls is never in this set.

### BR-ADS-07: Third-host entries follow the effective tier [HARD]

**Statement:** The third-host generator reads each workflow's effective tier (never the raw framework tier) and each skill's command-only mark, and writes one permission entry per skill it governs. Its output is shared with the whole team, so it resolves the effective tier from the team's shared settings only: a developer's personal tier setting, which wins for that developer's own routing (Workflow Routing spec), never reaches this output.

| Skill kind         | Effective tier or mark | Permission entry |
| ------------------ | ---------------------- | ---------------- |
| Command-only skill | —                      | hide             |
| Workflow           | manual                 | hide             |
| Workflow           | confirm                | ask              |
| Workflow           | auto                   | none             |
| Any other skill    | —                      | none             |

BR-ADS-09 overrides this table for called skills.

### BR-ADS-08: The generator owns only what it wrote [HARD]

**Statement:** The generator records every permission entry it writes, with the value written. An entry that existed before the generator first wrote it stays the user's and is never recorded as owned. An owned entry whose value the user changed is kept, skipped, and reported with one conflict line. The generator never loosens a user hide entry, never rewrites a permission setting that is a single value instead of a map (it prints a conflict and writes no skill entries), and never rewrites a user wildcard entry. An owned entry the user deleted is restored to the policy value with no conflict line: deleting an entry resets it to policy, and a user who wants the skill loadable sets an explicit allow instead. Unrelated settings are preserved; a second run produces identical output; the check mode fails when entries or the ownership record are stale.

**The ownership record is bound to its project.** The record states the project it was written for: the project name from the team's shared project settings (wherever the framework settings place that file), or an explicit "no name" when the project has none. A record that does not state a project at all, or states a different one, came from somewhere else — for example a copied folder, or a project that was renamed — and is ignored: it owns nothing, so every entry already in the settings stays the user's under the first row below. The sync prints one line saying the record was ignored because it belongs to another project, and rewrites the record for this project. A project settings file that exists but cannot be read stops the sync before anything is written, so a broken file never unbinds the record.

| Entry exists before first write | Recorded as owned | Current value equals recorded value | Outcome                                     |
| ------------------------------- | ----------------- | ----------------------------------- | ------------------------------------------- |
| Yes                             | No                | —                                   | KEEP user value; conflict line if different |
| No                              | Yes               | Yes                                 | UPDATE or REMOVE as the policy requires     |
| No                              | Yes               | No (another value)                  | KEEP user value; conflict line              |
| No                              | Yes               | No entry (the user deleted it)      | RESTORE the policy value; no conflict line  |
| No                              | No                | —                                   | WRITE and record                            |

"Recorded as owned" counts only a record bound to this project; an entry listed only in a record from another project is not owned.

### BR-ADS-09: Called skills are never hidden without opt-in [HARD]

**Statement:** A called skill is any skill named as a step of any workflow or in an agent's preload list, plus, from release D, the framework's called-by-others list and its entry-skill list (the workflow runner, commit and the setup skills that routing gates and hooks start). The entry-skill list protects those skills without making them name-only in any preset. No generator on any host hides a called skill or makes it command-only. The third-host generator leaves it without an entry and prints that it was skipped and which caller needs it; the profile generators refuse with a message naming the skill, the list it came from and its caller, write nothing, and fail the check mode. From release D, when the skill profile settings exist, a project may lift the rule by opting in to hiding called skills; each hidden called skill is then named in a warning line, never silently. Before then no opt-in exists and the rule always holds. Making a called skill name-only is allowed on the primary host because it stays callable.

### BR-ADS-10: Every hidden skill keeps a safe explicit command [HARD]

**Statement:** A skill counts as hidden only when its own entry in the final settings is a hide — one the generator wrote or one the user set. A skill the policy would hide but whose kept user entry is not a hide, or for which no entry could be written, is not hidden and gets no command. For every skill the third host hides, the generator writes a command that loads the skill instructions and passes the user arguments, so the explicit command keeps working. The command name is the skill folder name, which must be lowercase letters, digits and hyphens starting with a letter or digit; any other folder is skipped with a warning, and the name declared inside the skill text is never used. Every command is written inside the commands folder only. The description is escaped so it reads back as the original text with whitespace collapsed. Only files carrying the generated marker are ever rewritten or deleted; a marked command whose skill is no longer hidden is removed. When a user command without the marker already uses a hidden skill's name, it is kept unchanged, no generated command replaces it, and one conflict line names it. The check mode fails on a missing, changed or stale command. Generated commands contain no shell execution; the guidance warns that typed arguments containing shell-execution syntax run as shell on that host.

### BR-ADS-11: Token checkpoint interval range [HARD]

**Statement:** The token checkpoint interval, when set, must be a whole number from 50,000 to 20,000,000 inclusive; any other number fails validation with a message naming the setting and the range, and a value that is not a number fails validation with a type error naming the setting. An empty value is accepted as not set. When the setting is absent the default of 500,000 applies. The checkpoint behavior itself belongs to the guided workflow capability.

### BR-ADS-12: Skill profile on the primary host [HARD] (release D)

**Statement:** A project may choose a preset (standard or minimal) and lists of command-only, name-only and off skills. The profile generator writes the resulting visibility entries for the primary host under the same ownership rules as BR-ADS-08: user-written entries and owned entries the user changed are untouched and reported. Unknown skill names give a warning, not a failure. No profile and no owned entries means no write at all. Two runs produce identical files and the check passes. The generator runs only on request, never from an automatic step.

### BR-ADS-13: Settings writer never loses settings [HARD] (release D)

**Statement:** A missing or invalid primary-host settings file stops the profile generator with the parse problem named and the file unchanged. A write replaces only the profile member (or inserts it when absent); every other text span stays byte-identical and every other setting equal, verified before writing. The write is atomic and leaves no temporary file.

### BR-ADS-14: Skill profile on the second and third hosts [HARD] (release D)

**Statement:** With no profile, both host outputs equal their outputs from before profiles existed. A name-only skill that no workflow calls stops implicit selection on the second host and gets no entry on the third host (an owned entry is removed). A command-only or off skill is hidden on the third host with a generated command. A called name-only skill on the second host keeps implicit selection unless the recorded probe showed that a workflow step still reaches a skill with implicit selection off. User permissions are never adopted or loosened (BR-ADS-08).

### BR-ADS-15: Emphasis reductions are anchored, measured and traceless [HARD] (release D)

**Statement:** A skill whose emphasis is reduced keeps its emphasis markers in its quick summary and closing reminders. A reduction is applied only when compliance on every host that ran is equal or higher and tokens are lower; a host that did not run is recorded as not run, never as pass. The comparison runs leave the repository status, branches, stashes and worktrees and the user host trust state exactly as before, and their run folders are deleted.

### BR-ADS-16: Name-clash guidance follows the spike result [SOFT] (release D)

**Statement:** When a framework skill shares its name with a built-in skill, the documentation gives the recipe that matches the recorded spike result: a way to prefer the built-in skill when the host restores it, or a rename proposal for the owner when it does not. Nothing is renamed without owner approval.

### BR-ADS-17: Shared graph tooling environment [HARD] (release D)

**Statement:** A project environment whose ready marker matches the current requirements fingerprint is used first. Otherwise the shared environment keyed by that fingerprint under the per-user, per-OS cache is used; identical requirements share one location, different requirements get different ones. An existing project environment without a marker whose import check passes is adopted in place, with no shared install; a project environment whose marker records a different fingerprint is never adopted or re-marked (the import check proves module names, not versions), so the shared environment is used. A shared environment's ready marker is removed only while the install lock is held. Resolving the location starts no process, never throws, and treats an unreadable marker as absent. The ready marker is written last, so an interrupted install is retried next session.

### BR-ADS-18: Install lock recovery [HARD] (release D)

**Statement:** Creating the shared environment holds an exclusive install lock. A lock is stale when its holder process on this machine is provably dead, or when it is older than fifteen minutes. A lock whose content cannot be read has no holder to check, so it is judged by its age alone: it is stale only when older than fifteen minutes, and a fresh unreadable lock counts as held. A stale lock is broken only if unchanged since it was checked. A live, fresh lock makes another session wait at most five seconds, then fail with a message naming the holder, install nothing, and leave the lock alone. A holder releases the lock only while it still carries its own token. The lock step never waits without bound and never throws.

### BR-ADS-19: Step-skill description form [SOFT] (release D)

**Statement:** Each skill used as a workflow step, except workflow wrappers, has a description that starts with "Use when a workflow step or the user asks for", keeps the domain nouns routing relies on, and is at most 250 characters. The framework checks its own step skills in its own repository; in any other project that self-check reports itself skipped with a reason.

### BR-ADS-20: No compaction budget on any host [HARD]

**Statement:** The framework sets no auto-compaction budget on any of the three hosts, neither in the settings it ships nor in the configuration its syncs write. Each host therefore compacts at its own default, which follows the model's own context size, and a budget a user sets in their personal or project-local settings takes effect without being overridden. The settings the framework shares with the whole team never carry a budget, because a budget there would outrank every personal choice.

| Host    | What the framework ships or writes                                   | Effect                                                                          |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Primary | No budget in the shared settings                                     | Host default; the user's own command, launch option or personal setting applies |
| Second  | The sync never writes a budget                                       | Host default unless the user set one                                            |
| Third   | No model window override in the recommended defaults the sync merges | The model's registry window applies                                             |

### BR-ADS-21: A retired bundled value is removed only on an exact match [HARD]

**Statement:** When a sync finds a compaction budget in a project's host configuration, it removes it only when the value is exactly the one an earlier framework version wrote: a second-host budget of 500,000 at the top level of the configuration, or a third-host model window of 500,000 with an output size of 384,000 and nothing else. On the second host the explanatory note the framework placed directly above that budget is removed with it, but only when every line of the note is unchanged; a note the user wrote stays. Any other value — a different number, the same number written differently, a partial or extended window, or a budget inside a narrower section — belongs to the user: the sync keeps it unchanged and prints one line naming it. A second sync changes nothing, and the third-host check mode reports a configuration that still holds the retired value as stale.

| Budget found | Equals the bundled value exactly | Outcome                                                     |
| ------------ | -------------------------------- | ----------------------------------------------------------- |
| None         | —                                | Nothing written, nothing printed                            |
| Bundled      | Yes                              | Removed, with the unchanged bundled note on the second host |
| Any other    | No                               | Kept unchanged; one "kept user-set" line                    |

---

## 5. Domain Model

### Relationships (overview)

```
AdoptingProject   1──1 ProjectSwitches         (graph mode, trailer switch, checkpoint interval, skill profile)
AdoptingProject   0──1 CodeGraph               (built on request)
AdoptingProject   1──N Skill
Skill             0──N Caller                  (workflow step or agent preload)
Skill             1──N SkillVisibility         (one per host)
ThirdHostSettings 1──N HostPermissionEntry
AdoptingProject   1──0..1 OwnershipRecord      (bound to the project name; a record from another project owns nothing)
OwnershipRecord   1──N HostPermissionEntry     (only entries the generator wrote)
HostPermissionEntry 0──1 GeneratedCommand      (hide entries only)
GraphToolingEnvironment 0──1 InstallLock        (release D)
AdoptingProject   0──N CompactionBudget        (user-owned; at most one per host)
```

### Entity: ProjectSwitches

| Property                   | Type               | Required | Constraints           | Business Meaning                           |
| -------------------------- | ------------------ | -------- | --------------------- | ------------------------------------------ |
| Graph mode                 | enum CodeGraphMode | No       | Default auto          | Whether graph activity runs                |
| Fix-origin trailer         | yes-no             | No       | Default no            | Whether commit guidance offers the trailer |
| Token checkpoint interval  | number             | No       | 50,000 to 20,000,000  | Spacing of progress notes                  |
| Skill profile              | SkillProfile       | No       | Release D             | Which skills the assistant sees            |
| Allow hiding called skills | yes-no             | No       | Default no; release D | Lifts BR-ADS-09 with a warning             |

### Entity: SkillVisibility

| Property | Type                 | Required | Constraints                        | Business Meaning                      |
| -------- | -------------------- | -------- | ---------------------------------- | ------------------------------------- |
| Host     | enum Host            | Yes      | Primary, second or third           | Where this visibility applies         |
| Level    | enum VisibilityLevel | Yes      | —                                  | How the assistant may reach the skill |
| Called   | yes-no               | Yes      | Computed from workflows and agents | Whether BR-ADS-09 protects it         |

### Entity: HostPermissionEntry

| Property      | Type                  | Required   | Constraints                      | Business Meaning                    |
| ------------- | --------------------- | ---------- | -------------------------------- | ----------------------------------- |
| Skill name    | text                  | Yes        | Name or user wildcard            | Which skill the entry governs       |
| Value         | enum hide, ask, allow | Yes        | —                                | What the third host does            |
| Owned         | yes-no                | Yes        | Only entries the generator wrote | Whether the generator may change it |
| Written value | text                  | When owned | —                                | Detects a later user edit           |

### Entity: GeneratedCommand

| Property         | Type   | Required | Constraints                     | Business Meaning              |
| ---------------- | ------ | -------- | ------------------------------- | ----------------------------- |
| Name             | text   | Yes      | Validated folder name           | What the user types           |
| Description      | text   | Yes      | Escaped; whitespace collapsed   | Shown in the command list     |
| Generated marker | yes-no | Yes      | Present on generated files only | Only marked files are managed |

### Entity: SkillProfile (release D)

| Property          | Type                   | Required | Constraints        | Business Meaning               |
| ----------------- | ---------------------- | -------- | ------------------ | ------------------------------ |
| Preset            | enum standard, minimal | No       | —                  | A ready-made visibility set    |
| Command-only list | list of text           | No       | Unknown names warn | Hidden from self-selection     |
| Name-only list    | list of text           | No       | —                  | Listed by name only            |
| Off list          | list of text           | No       | —                  | Not available to the assistant |

### Entity: GraphToolingEnvironment (release D)

| Property                 | Type                 | Required | Constraints               | Business Meaning         |
| ------------------------ | -------------------- | -------- | ------------------------- | ------------------------ |
| Location kind            | enum project, shared | Yes      | Project wins when current | Where the tools live     |
| Requirements fingerprint | text                 | Yes      | —                         | Keys the shared location |
| Ready marker             | yes-no               | Yes      | Written last              | Install finished         |

### Entity: CompactionBudget

| Property | Type                 | Required | Constraints                                                    | Business Meaning                         |
| -------- | -------------------- | -------- | -------------------------------------------------------------- | ---------------------------------------- |
| Host     | enum Host            | Yes      | Primary, second or third                                       | Where the budget applies                 |
| Size     | number               | No       | Absent means the host default                                  | When the host condenses the conversation |
| Owner    | enum user, framework | Yes      | Framework-owned only while it equals the retired bundled value | Whether a sync may remove it             |

### Enum: CodeGraphMode

| Value | Meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| auto  | Active only when a built graph exists (default)                  |
| on    | Active; a note reminds once per session until the graph is built |
| off   | Nothing graph-related runs; the graph command refuses            |

### Enum: VisibilityLevel

| Value        | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| Full         | Listed with its description; the assistant may select it  |
| Name-only    | Listed by name only; still callable (release D)           |
| Command-only | Not selectable by the assistant; runs on explicit command |
| Off          | Not available to the assistant (release D)                |

### Domain Events (business occurrences)

| Occurrence                | When it happens                                           | Who/what reacts (business outcome)                              |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Session started           | A developer opens a session                               | Graph tooling set up only when active                           |
| Graph built               | A developer runs the graph build                          | Tooling installed on first build; mode auto becomes active      |
| Third host synced         | A maintainer runs the third-host sync                     | Entries and commands match the policy; conflicts printed        |
| Permission conflict found | A user value differs from what the generator wants        | User value kept; one conflict line                              |
| Foreign record ignored    | The ownership record states no project or another project | Record owns nothing; existing entries stay the user's; one line |
| Called skill protected    | A generator would hide a called skill                     | Skip or refusal printed; skill stays loadable                   |
| Bundled budget retired    | A sync finds the value an earlier framework version wrote | Removed; the host default applies                               |
| User budget kept          | A sync finds any other compaction budget                  | Kept unchanged; one line names it                               |

---

## 6. Process Flows

> No screen exists: the interaction surface is the text the assistant receives, command output, printed conflict and refusal lines, and the generated settings files. Backend-only capability; the view inventory is skipped for that reason.

### Flow: Decide graph activity

| Step | Actor  | Action                           | System Response                                         | Next |
| ---- | ------ | -------------------------------- | ------------------------------------------------------- | ---- |
| 1    | System | Session start, prompt or edit    | Cheap check for a built graph                           | 2    |
| 2    | System | Reads the graph mode             | State per BR-ADS-01                                     | 3    |
| 3    | System | Active                           | Normal graph work                                       | end  |
| 4    | System | Dormant or off                   | Nothing; mode on without a graph notes once (BR-ADS-03) | end  |
| 5    | User   | Runs a graph command in mode off | Refusal naming the setting (BR-ADS-04)                  | end  |

### Flow: Sync the third host

| Step | Actor      | Action                            | System Response                                                                                      | Next |
| ---- | ---------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ---- |
| 1    | Maintainer | Runs the sync                     | Reads skills, workflows, agents and effective tiers                                                  | 2    |
| 2    | System     | Computes the called set           | Called skills skipped with a line (BR-ADS-09)                                                        | 3    |
| 3    | System     | Computes entries                  | Per BR-ADS-07                                                                                        | 4    |
| 4    | System     | Merges into the settings          | Ownership rules and conflict lines; a record from another project is ignored with a line (BR-ADS-08) | 5    |
| 5    | System     | Writes commands for hidden skills | Validated names, marked files only (BR-ADS-10)                                                       | end  |

### Flow: Apply a skill profile (release D)

| Step | Actor      | Action                                           | System Response                             | Next     |
| ---- | ---------- | ------------------------------------------------ | ------------------------------------------- | -------- |
| 1    | Maintainer | Sets a preset or lists and runs the profile sync | Resolves the profile                        | 2        |
| 2    | System     | Finds called skills in hide lists                | Refuses unless opted in (BR-ADS-09)         | 3 or end |
| 3    | System     | Writes the primary host settings                 | Only the profile member changes (BR-ADS-13) | 4        |
| 4    | Maintainer | Regenerates the other host copies                | Host equivalents written (BR-ADS-14)        | end      |

### Flow: Retire the bundled compaction budget

| Step | Actor      | Action                              | System Response                                         | Next      |
| ---- | ---------- | ----------------------------------- | ------------------------------------------------------- | --------- |
| 1    | Maintainer | Runs the second- or third-host sync | Reads the project's host configuration                  | 2, 3 or 4 |
| 2    | System     | Finds no budget                     | Writes none (BR-ADS-20)                                 | end       |
| 3    | System     | Finds the bundled value             | Removes it, with the unchanged bundled note (BR-ADS-21) | end       |
| 4    | System     | Finds any other value               | Keeps it and prints one line naming it (BR-ADS-21)      | end       |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create |        Edit        |       Delete       | Scope                                                                                                    |
| -------------------- | :--: | :----: | :----------------: | :----------------: | -------------------------------------------------------------------------------------------------------- |
| Framework maintainer | yes  |  yes   |        yes         |        yes         | Defaults, the utility set and the generators                                                             |
| Project maintainer   | yes  |  yes   |        yes         |        yes         | Team switches and the skill profile                                                                      |
| Developer            | yes  |  yes   |        yes         |        yes         | Own permission entries and personal settings; never overwritten                                          |
| Generator            | yes  |  yes   | owned entries only | owned entries only | Entries and marked commands it wrote; a compaction budget only while it equals the retired bundled value |
| AI assistant         | yes  |   no   |         no         |         no         | Uses what the switches allow                                                                             |

### Granular Permissions (if applicable)

| Permission                                 | Description                                                                           | Default Roles      |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------ |
| Can allow hiding called skills (release D) | Lift BR-ADS-09 for the project; every hidden called skill is still named in a warning | Project maintainer |

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a project maintainer, a developer or the AI assistant; the observable surface is command output, printed lines, the text the assistant receives and the generated settings files (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: IDs are pre-allocated and never renumbered, and categories group them by behavior rather than by decade. TC-ADS-016…033 and TC-ADS-040…053 are `Planned (release D)`. TC-ADS-034…039 cover the auto-compaction budget rules BR-ADS-20 and BR-ADS-21. TC-ADS-054 and TC-ADS-055 cover the ownership record's project binding and a deleted owned entry (BR-ADS-08). TC-ADS-063 is unallocated.

> Size note: the capability defines 62 cases, over the project's forty-case split rule, so the 32 release-D cases live in the continuation part [README.AdoptionSwitches-Part2.md](README.AdoptionSwitches-Part2.md) under their original IDs. This part holds the 30 release-A cases. The Test Summary below counts both parts.

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 17     | 15        | 2      |
| P1        | 33     | 32        | 1      |
| P2        | 12     | 10        | 2      |
| **Total** | **62** | **57**    | **5**  |

| Category                                                      | TCs                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Code Graph Mode Tests                                         | TC-ADS-001, TC-ADS-002, TC-ADS-003, TC-ADS-004, TC-ADS-005, TC-ADS-056, TC-ADS-057                         |
| Commit Trailer Tests                                          | TC-ADS-006, TC-ADS-007                                                                                     |
| Command-Only Skill Tests                                      | TC-ADS-008, TC-ADS-009, TC-ADS-010                                                                         |
| Third-Host Parity Tests                                       | TC-ADS-011, TC-ADS-012, TC-ADS-013, TC-ADS-054, TC-ADS-055, TC-ADS-058, TC-ADS-059, TC-ADS-060, TC-ADS-061 |
| Validation Tests                                              | TC-ADS-014                                                                                                 |
| Compaction Budget Tests                                       | TC-ADS-034, TC-ADS-035, TC-ADS-036, TC-ADS-037, TC-ADS-038, TC-ADS-039                                     |
| Invariant / Property Tests                                    | TC-ADS-015, TC-ADS-062; TC-ADS-018, TC-ADS-053 (release D, continuation part)                              |
| Skill Profile Tests (release D, continuation part)            | TC-ADS-016, TC-ADS-017, TC-ADS-019, TC-ADS-020, TC-ADS-040, TC-ADS-041, TC-ADS-042                         |
| Profile on Other Hosts Tests (release D, continuation part)   | TC-ADS-021, TC-ADS-022, TC-ADS-023, TC-ADS-024, TC-ADS-045, TC-ADS-046, TC-ADS-047, TC-ADS-048             |
| Skill Text Tests (release D, continuation part)               | TC-ADS-025, TC-ADS-026, TC-ADS-027, TC-ADS-032, TC-ADS-033, TC-ADS-050, TC-ADS-043                         |
| Shared Graph Environment Tests (release D, continuation part) | TC-ADS-028, TC-ADS-029, TC-ADS-030, TC-ADS-031, TC-ADS-044, TC-ADS-049, TC-ADS-051, TC-ADS-052             |

### Code Graph Mode Tests

#### TC-ADS-001: Auto mode without a built graph installs nothing at session start [P1]

**Objective:** Prove that a project in the default graph mode with no built graph gets no graph tooling installed when a session starts.

**Business Intent / Invariant Guarded:** Adopting the framework never triggers a surprise download or install for a capability the project does not use (BR-ADS-01, BR-ADS-02).

**Traces:** AC-ADS-01 / BR-ADS-01 / BR-ADS-02

**Preconditions:**

- Graph mode is auto (the default)
- The project has no built code graph

**Real-World Reachability:** A team copies the framework into a project and opens its first session.

**Demo Flow:** Start a session in a fresh project and check whether any graph tooling install was attempted.

```gherkin
Given the graph mode is auto and the project has no built graph
When a session starts
Then no graph tooling install is attempted
And the session starts normally
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Skips graph tooling setup                                                                                                                                 |
| **Business data state** | No graph tooling environment is created                                                                                                                   |
| **Data shown on UI**    | No graph message at session start                                                                                                                         |

**Acceptance Criteria:**

- ✅ No install attempt
- ❌ An install attempt at session start

**Test Data:**

```json
{
    "hooks": {
        "codeGraph": {
            "enabled": "auto"
        }
    },
    "graphBuilt": false
}
```

**Edge Cases:**

- Mode setting absent → treated as auto
- Mode value outside auto, on and off → rejected by validation with the setting and the allowed modes named (BR-ADS-01)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-session-init]` · `[Source: rule/hooks/code-graph-mode]`
> **Related Behaviors:** `operation/hooks/graph-session-init` · `rule/hooks/code-graph-mode` · `test/hooks/code-graph-opt-in`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] TC-ADS-001 auto mode without a built graph installs nothing at session start`, `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] BR-ADS-01 codeGraphMode maps the setting and graph presence to active | dormant | off`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] hooks.codeGraph.enabled accepts auto|on|off only` · **Status:** Tested

---

#### TC-ADS-002: Auto mode without a built graph shows no graph note [P1]

**Objective:** Prove that a prompt in the default mode without a built graph carries no "graph not built" note.

**Business Intent / Invariant Guarded:** A project that never chose the graph is not nagged about it on every prompt (BR-ADS-03).

**Traces:** AC-ADS-02 / BR-ADS-03

**Preconditions:**

- Graph mode is auto
- No built graph

**Real-World Reachability:** Any prompt in a project that never built a graph.

**Demo Flow:** Submit a prompt and read the added context.

```gherkin
Given the graph mode is auto and the project has no built graph
When the user submits a prompt
Then no graph note is added
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Adds no graph note                                                                                                                                        |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | No "graph not built" text                                                                                                                                 |

**Acceptance Criteria:**

- ✅ No graph note
- ❌ A graph note in auto mode without a graph

**Test Data:**

```json
{
    "hooks": {
        "codeGraph": {
            "enabled": "auto"
        }
    },
    "graphBuilt": false
}
```

**Edge Cases:**

- The same project after building a graph → graph features run as before

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/init-prompt-gate]` · `[Source: rule/hooks/code-graph-mode]`
> **Related Behaviors:** `operation/hooks/init-prompt-gate` · `rule/hooks/code-graph-mode` · `test/hooks/code-graph-opt-in`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] TC-ADS-002 auto mode without a built graph shows no graph note`, `.claude/hooks/tests/test-all-hooks.cjs::Default auto mode without a graph shows no graph note` · **Status:** Tested

---

#### TC-ADS-003: On mode without a built graph notes it once per session [P2]

**Objective:** Prove that a project that chose the graph but has not built it sees the note on the first prompt only.

**Business Intent / Invariant Guarded:** The reminder to build the graph is useful once, noise afterwards (BR-ADS-03).

**Traces:** AC-ADS-02 / BR-ADS-03

**Preconditions:**

- Graph mode is on
- No built graph
- The note was not dismissed

**Real-World Reachability:** A team turned the graph on but has not run the build yet.

**Demo Flow:** Submit two prompts in the same session and count the notes.

```gherkin
Given the graph mode is on and the project has no built graph
When the user submits two prompts in one session
Then the graph note appears on the first prompt only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Adds the note once and remembers it for the session                                                                                                       |
| **Business data state** | The session records that the note was shown                                                                                                               |
| **Data shown on UI**    | One "graph not built" note                                                                                                                                |

**Acceptance Criteria:**

- ✅ Exactly one note
- ❌ A note on every prompt
- ❌ No note at all

**Test Data:**

```json
{
    "hooks": {
        "codeGraph": {
            "enabled": "on"
        }
    },
    "graphBuilt": false,
    "prompts": 2
}
```

**Edge Cases:**

- Note dismissed by the user earlier → no note
- A new session → the note may appear once again

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/init-prompt-gate]`
> **Related Behaviors:** `operation/hooks/init-prompt-gate` · `test/hooks/code-graph-opt-in`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] TC-ADS-003 on mode without a built graph notes it once per session` · **Status:** Tested

---

#### TC-ADS-004: The first graph build installs its own tooling [P1]

**Objective:** Prove that building the graph for the first time installs the graph tooling itself, with one command that is the same on every operating system.

**Business Intent / Invariant Guarded:** Since sessions no longer install the tooling, the explicit build is where the install happens — once, on use (BR-ADS-02).

**Traces:** AC-ADS-03 / BR-ADS-02

**Preconditions:**

- Graph tooling is not installed
- The user asks to build the graph

**Real-World Reachability:** A developer decides to try the graph and runs the build command.

**Demo Flow:** Run the graph build in a project without graph tooling and watch its first step.

```gherkin
Given the graph tooling is not installed
When the user runs the graph build
Then its first step installs the tooling
And the build stops with a clear message if the install fails
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Installs, then builds                                                                                                                                     |
| **Business data state** | Graph tooling environment exists after the first build                                                                                                    |
| **Data shown on UI**    | Install progress, then the build result or a clear failure message                                                                                        |

**Acceptance Criteria:**

- ✅ Install happens on the first build
- ✅ Same command on Windows, macOS and Linux
- ❌ Build fails because the tooling is missing
- ❌ Install silently skipped

**Test Data:**

```json
{
    "firstStep": "node -e \"const r=require('./.claude/hooks/lib/graph-utils.cjs').ensurePythonDeps(); process.exit(r && r.ok ? 0 : 1)\""
}
```

**Edge Cases:**

- Tooling already installed → the first step is a quick no-op
- Graph mode off → the build refuses with the off message (TC-ADS-057)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/graph-build]`
> **Related Behaviors:** `operation/skills/graph-build` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-ADS-004 graph-build installs the graph tooling as its first step` · **Status:** Partial (text test only; the manual first-install check on a machine without the tooling is pending at the release-A close)

---

#### TC-ADS-005: Off mode with a built graph produces no graph activity [P1]

**Objective:** Prove that a project that switched the graph off gets no graph output and no graph refresh at session start or on prompts, even though an old graph exists.

**Business Intent / Invariant Guarded:** Off means off: an old graph never keeps graph work running (BR-ADS-04).

**Traces:** AC-ADS-04 / BR-ADS-04

**Preconditions:**

- Graph mode is off
- A built graph exists from earlier

**Real-World Reachability:** A team built a graph once, then decided to stop using it.

**Demo Flow:** Start a session and submit prompts; check for graph output and refreshes.

```gherkin
Given the graph mode is off and a built graph exists
When a session starts and prompts are submitted
Then no graph output appears
And the graph is not refreshed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | All automatic graph steps stay idle                                                                                                                       |
| **Business data state** | The old graph is left untouched                                                                                                                           |
| **Data shown on UI**    | No graph text                                                                                                                                             |

**Acceptance Criteria:**

- ✅ No graph output
- ✅ No refresh
- ❌ Any graph output or refresh in off mode

**Test Data:**

```json
{
    "hooks": {
        "codeGraph": {
            "enabled": "off"
        }
    },
    "graphBuilt": true
}
```

**Edge Cases:**

- Switching back to auto with the graph present → graph features resume

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-session-init]` · `[Source: operation/hooks/init-prompt-gate]`
> **Related Behaviors:** `operation/hooks/graph-session-init` · `operation/hooks/init-prompt-gate` · `test/hooks/code-graph-opt-in`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] TC-ADS-005 off mode with a built graph produces no graph activity` · **Status:** Tested

---

#### TC-ADS-056: Off mode keeps the per-edit and per-prompt graph steps from starting [P1]

**Objective:** Prove that in off mode the graph refresh after an edit and the graph sync on a prompt start no background process and write nothing, even with a built graph.

**Business Intent / Invariant Guarded:** Off costs nothing: no background graph process runs on any automatic step (BR-ADS-04).

**Traces:** AC-ADS-04 / BR-ADS-04

**Preconditions:**

- Graph mode is off
- A built graph exists

**Real-World Reachability:** A team switched the graph off after using it; developers keep editing files and submitting prompts.

**Demo Flow:** Edit a file and submit a prompt; observe whether any graph process starts or any graph text appears.

```gherkin
Given the graph mode is off and a built graph exists
When a file is edited and a prompt is submitted
Then no background graph process starts
And no graph output is written
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Both automatic graph steps return before starting any process                                                                                             |
| **Business data state** | The old graph is untouched                                                                                                                                |
| **Data shown on UI**    | No graph text                                                                                                                                             |

**Acceptance Criteria:**

- ✅ No process started
- ✅ No output
- ❌ A process started or output written

**Test Data:**

```json
{
    "hooks": {
        "codeGraph": {
            "enabled": "off"
        }
    },
    "graphBuilt": true,
    "events": ["edit", "prompt"]
}
```

**Edge Cases:**

- A project without a graph → the steps still exit on the first cheap check, before reading settings

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/graph-auto-update]` · `[Source: operation/hooks/graph-prompt-sync]`
> **Related Behaviors:** `operation/hooks/graph-auto-update` · `operation/hooks/graph-prompt-sync` · `test/hooks/code-graph-opt-in`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-opt-in.test.cjs::[code-graph-opt-in] TC-ADS-056 off mode keeps the per-edit and per-prompt graph steps from starting` · **Status:** Tested

---

#### TC-ADS-057: Off mode makes the graph command refuse with a clear message [P1]

**Objective:** Prove that in off mode every graph command stops with a message that the graph is off and names the setting, and that auto mode does not show it.

**Business Intent / Invariant Guarded:** No skill can read stale graph results from a project that switched the graph off (BR-ADS-04).

**Traces:** AC-ADS-04 / BR-ADS-04

**Preconditions:**

- Graph mode is off
- A built graph exists

**Real-World Reachability:** A skill follows its instruction to query the graph because a graph file exists.

**Demo Flow:** Run the graph status command in off mode, then in auto mode.

```gherkin
Given the graph mode is off and a built graph exists
When the graph status command runs
Then it fails
And it says the code graph is off for this project and names the setting
And with the mode set to auto the same command does not show that message
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Refuses before opening the graph                                                                                                                          |
| **Business data state** | Graph not opened                                                                                                                                          |
| **Data shown on UI**    | The off message                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Fails with the off message in off mode
- ✅ No off message in auto mode
- ❌ Returns graph results in off mode

**Test Data:**

```json
{
    "command": "code_graph status --json --repo <temp>",
    "message": "code graph is off for this project (hooks.codeGraph)",
    "exitStatus": 1,
    "json": {
        "status": "off"
    }
}
```

**Edge Cases:**

- A build command in auto mode without a graph → still works

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/code-graph-cli]`
> **Related Behaviors:** `operation/scripts/code-graph-cli` · `test/hooks/code-graph-cli-off`
> **CoveredBy:** `.claude/hooks/tests/suites/code-graph-cli-off.test.cjs::[code-graph-cli-off] TC-ADS-057 off mode: status --json refuses with the off message and never opens graph.db`, `.claude/hooks/tests/suites/code-graph-cli-off.test.cjs::[code-graph-cli-off] TC-ADS-057 off mode: a query command without --json also refuses with the off message`, `.claude/hooks/tests/suites/code-graph-cli-off.test.cjs::[code-graph-cli-off] TC-ADS-057 auto mode: the same status command runs and shows no off message` · **Status:** Tested

---

### Commit Trailer Tests

#### TC-ADS-006: The commit message template omits the fix-origin trailer by default [P1]

**Objective:** Prove that, with the trailer switch off (the default), the commit guidance shows no fix-origin trailer and claims no automated check of it.

**Business Intent / Invariant Guarded:** Developers are not asked to add a line nothing reads, and no text promises a check that does not ship (BR-ADS-05).

**Traces:** AC-ADS-05 / BR-ADS-05

**Preconditions:**

- The trailer switch is off or absent

**Real-World Reachability:** Every commit made through the commit guidance in a project that never opted in.

**Demo Flow:** Read the commit guidance message template.

```gherkin
Given the fix-origin trailer switch is off
When the commit guidance is read
Then its message template has no fix-origin trailer
And no text says an automated check reads the trailer
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Guidance presents the template without the trailer                                                                                                        |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | Commit template without the trailer line                                                                                                                  |

**Acceptance Criteria:**

- ✅ Template without the trailer
- ✅ No sensor claim
- ❌ Trailer shown as required by default
- ❌ Text claiming an automated check

**Test Data:**

```json
{
    "commit": {
        "fixOriginTrailer": false
    }
}
```

**Edge Cases:**

- Switch absent → same as off
- Switch value that is not yes or no → rejected by validation with the setting named (BR-ADS-05)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/commit]`
> **Related Behaviors:** `operation/skills/commit` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-ADS-006 commit template omits Fix-Origin by default and claims no sensor`, `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] commit.fixOriginTrailer is an optional boolean section` · **Status:** Tested

---

#### TC-ADS-007: The trailer switch is named and applies to new commits only [P2]

**Objective:** Prove that the commit guidance names the switch that enables the trailer and says it applies to new commits only.

**Business Intent / Invariant Guarded:** Turning the trailer on never leads anyone to rewrite existing history (BR-ADS-05).

**Traces:** AC-ADS-05 / BR-ADS-05

**Preconditions:**

- The commit guidance describes the trailer option

**Real-World Reachability:** A team that measures fix origins opts in.

**Demo Flow:** Read the part of the commit guidance that describes the trailer option.

```gherkin
Given the commit guidance describes the trailer option
When a maintainer reads it
Then it names the switch that enables the trailer
And it says the trailer applies to new commits only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Guidance states the opt-in and its scope                                                                                                                  |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The switch name and the words "new commits only"                                                                                                          |

**Acceptance Criteria:**

- ✅ Switch named
- ✅ "new commits only" stated
- ❌ Advice to reword existing commits

**Test Data:**

```json
{
    "switch": "commit.fixOriginTrailer",
    "scope": "new commits only"
}
```

**Edge Cases:**

- Switch on → template shows the trailer as an optional line for new commits

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/skills/commit]`
> **Related Behaviors:** `operation/skills/commit` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-ADS-007 commit skill names commit.fixOriginTrailer and limits the trailer to new commits` · **Status:** Tested

---

### Command-Only Skill Tests

#### TC-ADS-008: The fifteen utility skills are command-only on the primary host [P1]

**Objective:** Prove that each of the fifteen utility skills is marked so the assistant never selects it by itself.

**Business Intent / Invariant Guarded:** Utilities run only when a user asks, so they never self-trigger and never crowd the model skill list (BR-ADS-06).

**Traces:** AC-ADS-06 / BR-ADS-06

**Preconditions:**

- The framework skills are present

**Real-World Reachability:** Every session lists the skills the assistant may choose from.

**Demo Flow:** Inspect the settings of each utility skill.

```gherkin
Given the fifteen utility skills
When their settings are read
Then each is marked as command-only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Utilities leave the self-selection list                                                                                                                   |
| **Business data state** | Each utility carries the command-only mark                                                                                                                |
| **Data shown on UI**    | The utilities are absent from the list of skills the assistant may pick by itself                                                                         |

**Acceptance Criteria:**

- ✅ All fifteen marked
- ❌ Any utility left selectable by the assistant

**Test Data:**

```json
{
    "utilities": [
        "custom-agent",
        "docx-convert",
        "pdf-convert",
        "playwright-cli",
        "presentation-builder",
        "remotion",
        "sync-skills-shared-protocols",
        "release-notes",
        "git-developer-performance",
        "skill-creator",
        "scan-codebase-health",
        "graph-export",
        "ck-help",
        "project-help",
        "custom-prompt"
    ]
}
```

**Edge Cases:**

- Commit, learn and git-conflict-resolve skills → stay selectable (owner decisions; the assistant resolves conflicts from its own pull-before-commit step)
- Check runs only in the framework repository; elsewhere reported as skipped

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/skills/utility-frontmatter]`
> **Related Behaviors:** `component/skills/utility-frontmatter` · `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::[content-presence] TC-ADS-008 command-only utility skills are manual-only; commit, learn and git-conflict-resolve stay callable` · **Status:** Tested

---

#### TC-ADS-009: The utilities are command-only on the second host after regeneration [P1]

**Objective:** Prove that regenerating the second host copy marks each utility as not selectable by the assistant.

**Business Intent / Invariant Guarded:** The same command-only choice holds on the second host (BR-ADS-06).

**Traces:** AC-ADS-06 / BR-ADS-06

**Preconditions:**

- The second host copy was regenerated

**Real-World Reachability:** The release close regenerates the second host copy.

**Demo Flow:** Inspect each utility in the regenerated second host copy.

```gherkin
Given the second host copy was regenerated
When each utility is inspected
Then each has a policy that stops the assistant from selecting it by itself
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Generator writes the policy per utility                                                                                                                   |
| **Business data state** | Policy present for each utility                                                                                                                           |
| **Data shown on UI**    | Policy file per utility with implicit selection off                                                                                                       |

**Acceptance Criteria:**

- ✅ Policy present for all fifteen
- ❌ A utility without the policy

**Test Data:**

```json
{
    "policyFile": "agents/openai.yaml",
    "value": "allow_implicit_invocation: false"
}
```

**Edge Cases:**

- A skill already owning its own policy file → not overwritten

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-009 command-only utility skills mirror to Codex with implicit invocation off` · **Status:** Tested

---

#### TC-ADS-010: A command-only skill still runs when the user asks for it on every host [P0]

**Objective:** Prove that a command-only skill runs when the user invokes it explicitly on each of the three hosts.

**Business Intent / Invariant Guarded:** Command-only never removes a skill: explicit invocation always works (BR-ADS-06).

**Traces:** AC-ADS-07 / BR-ADS-06 / BR-ADS-10

**Preconditions:**

- A utility is command-only
- All three host copies were regenerated

**Real-World Reachability:** A user types the utility command on whichever host they use.

**Demo Flow:** On each host, invoke one utility by its command and observe that it runs.

```gherkin
Given a command-only utility
When the user invokes it explicitly on the primary, second and third host
Then it runs on each host
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Each host loads the skill on explicit request                                                                                                             |
| **Business data state** | No change                                                                                                                                                 |
| **Data shown on UI**    | The utility output on each host                                                                                                                           |

**Acceptance Criteria:**

- ✅ Runs on all three hosts
- ❌ Any host refusing or not finding the skill

**Test Data:**

```json
{
    "primary": "/pdf-convert",
    "second": "$pdf-convert",
    "third": "/pdf-convert (generated command)"
}
```

**Edge Cases:**

- Third host without the generated command → fails; covered by TC-ADS-012

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: component/skills/utility-frontmatter]` · `[Source: operation/scripts/migrate-claude-to-codex]` · `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/skills/command-only` · `test/manual/release-a-close`
> **CoveredBy:** `Manual-QC` (one skill per host at the release-A close) · **Status:** Untested

---

### Third-Host Parity Tests

#### TC-ADS-011: The third host hides command-only skills and asks before confirm-tier workflows [P1]

**Objective:** Prove that syncing the third host gives a command-only skill a hide entry and a confirm-tier workflow an ask entry.

**Business Intent / Invariant Guarded:** The third host enforces the same selection policy as the other two (BR-ADS-07).

**Traces:** AC-ADS-08 / BR-ADS-07

**Preconditions:**

- A command-only skill and a workflow whose effective tier is confirm
- Neither is called by another workflow or an agent

**Real-World Reachability:** A team uses the third host and runs its sync.

**Demo Flow:** Run the third-host sync and read the skill permission entries.

```gherkin
Given a command-only skill and a confirm-tier workflow
When the third host is synced
Then the command-only skill is hidden
And the workflow asks before loading
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes one hide entry and one ask entry                                                                                                                   |
| **Business data state** | Both entries recorded as owned by the generator                                                                                                           |
| **Data shown on UI**    | Permission entries: hide for the skill, ask for the workflow                                                                                              |

**Acceptance Criteria:**

- ✅ Hide and ask written
- ❌ Either entry missing or reversed

**Test Data:**

```json
{
    "expected": {
        "permission.skill": {
            "pdf-convert": "deny",
            "workflow-feature": "ask"
        }
    }
}
```

**Edge Cases:**

- An auto-tier workflow → no entry

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-011: a command-only skill gets deny and a confirm-tier workflow gets ask` · **Status:** Tested

---

#### TC-ADS-012: A hidden skill gets a command that loads it [P1]

**Objective:** Prove that each hidden skill on the third host gets a generated command that loads the skill and passes the user arguments.

**Business Intent / Invariant Guarded:** Hiding a skill from the assistant never removes the user explicit command (BR-ADS-10).

**Traces:** AC-ADS-09 / BR-ADS-10

**Preconditions:**

- A skill is hidden on the third host

**Real-World Reachability:** A user types the command of a hidden utility on the third host.

**Demo Flow:** Run the third-host sync and open the generated command for the hidden skill.

```gherkin
Given a hidden skill
When the third host is synced
Then a command named after the skill exists
And it loads the skill instructions and passes the user arguments
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes one marked command per hidden skill                                                                                                                |
| **Business data state** | Command file present in the commands folder                                                                                                               |
| **Data shown on UI**    | Command content: the skill include and the argument placeholder                                                                                           |

**Acceptance Criteria:**

- ✅ Command present and correct
- ❌ Hidden skill without a command

**Test Data:**

```json
{
    "file": ".opencode/commands/<name>.md",
    "includes": "@.claude/skills/<name>/SKILL.md",
    "arguments": "$ARGUMENTS"
}
```

**Edge Cases:**

- A workflow hidden through its effective tier → also gets a command
- A skill the policy would hide but whose kept user entry is not a hide, or a permission setting that is a single value → not hidden, so no command (BR-ADS-10)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-012: every hidden skill gets a command that includes its SKILL.md and passes $ARGUMENTS`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-012 / BR-ADS-10: a skill the policy denies but whose final entry is not deny gets no command` · **Status:** Tested

---

#### TC-ADS-013: A user-written command is never touched [P0]

**Objective:** Prove that a command file without the generated marker is left byte-identical by the sync.

**Business Intent / Invariant Guarded:** The generator owns only what it wrote; adopter commands are safe (BR-ADS-10).

**Traces:** AC-ADS-09 / BR-ADS-10

**Preconditions:**

- The commands folder holds a user-written command without the marker

**Real-World Reachability:** A team keeps its own commands in the same folder.

**Demo Flow:** Run the sync and compare the user command before and after.

```gherkin
Given a user-written command without the generated marker
When the third host is synced
Then that command is unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Skips unmarked files                                                                                                                                      |
| **Business data state** | User command unchanged                                                                                                                                    |
| **Data shown on UI**    | Identical file content                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Byte-identical
- ❌ Changed or deleted

**Test Data:**

```json
{
    "userCommand": ".opencode/commands/team-deploy.md",
    "marker": false
}
```

**Edge Cases:**

- A user command with the same name as a hidden skill → kept; a conflict is reported

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-013: a user command without the marker is never touched`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-013 / BR-ADS-10: a user command that already uses a hidden skill's name is kept with one conflict line` · **Status:** Tested

---

#### TC-ADS-054: An ownership record copied from another project owns nothing [P0]

**Objective:** Prove that an ownership record that states another project, or no project at all, is ignored, so the adopter's own permission entries are never loosened or removed, while a record written for this project stays trusted.

**Business Intent / Invariant Guarded:** Only entries this project's sync wrote belong to the generator; a record that arrived with a copied folder never takes over the adopter's permissions (BR-ADS-08).

**Traces:** AC-ADS-08 / BR-ADS-08

**Preconditions:**

- The adopter hid a workflow in their own settings before the first sync in their project
- An ownership record copied from another project lists the same entry with the same value
- The team then loosens that workflow's tier

**Real-World Reachability:** A team adopts the framework by copying the third-host folder from another repository, then changes a workflow tier and syncs.

**Demo Flow:** Copy a third-host folder with its ownership record into a project that already hides a workflow, change the tier, run the sync, and read the entry, the printed lines and the ownership record.

```gherkin
Given the adopter hid a workflow and an ownership record from another project lists that entry
When the team loosens the workflow to confirm or auto and the third host is synced
Then the adopter's hide entry is kept, neither loosened to ask nor removed
And one line says the ownership record was ignored because it belongs to another project
And the ownership record is rewritten for this project and owns nothing it did not write
And given a record written for this project, a tier change updates the owned entry with no conflict
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Ignores a record from another project and treats every existing entry as the user's                                                                       |
| **Business data state** | The adopter's entry unchanged; ownership record bound to this project                                                                                     |
| **Data shown on UI**    | One ignored-record line, plus the usual conflict line when the wanted value differs                                                                       |

**Acceptance Criteria:**

- ✅ The adopter's hide entry kept after a tier change to confirm or auto
- ✅ Exactly one line says the record was ignored
- ✅ A record written for this project stays trusted
- ❌ A copied record loosens or removes a user entry
- ❌ A record without a project is trusted

**Test Data:**

```json
{
    "projectName": "adopter",
    "before": {
        "permission.skill": {
            "workflow-big-feature": "deny"
        }
    },
    "copiedRecord": {
        "project": "source-project",
        "skill": {
            "workflow-big-feature": "deny"
        }
    },
    "tierChange": ["confirm", "auto"]
}
```

**Edge Cases:**

- A record that states no project → ignored the same way
- A record written for this project, with the project settings file moved by the framework settings → trusted
- A project settings file that exists but cannot be read → the sync stops before anything is written and the record keeps its content
- A project renamed in its settings → its record now belongs to another project; entries stay the user's until the record is rebound

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]` · `[Source: rule/scripts/owned-key-ledger]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/owned-key-ledger` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-054: a ledger copied from another project is ignored, so the adopter's own entry survives a tier change`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-054: a ledger written for this project stays trusted, including a project config relocated by .ck.json`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-054: a ledger with no project field is untrusted`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-054: a project config that is not valid JSON stops the sync before anything is written` · **Status:** Tested

---

#### TC-ADS-055: Deleting an owned entry resets it to policy [P1]

**Objective:** Prove that an owned entry the user deleted is written back with the policy value, stays owned, and prints no conflict line.

**Business Intent / Invariant Guarded:** Deleting a generated entry means "reset to policy", not "the user chose"; a user who wants the skill loadable sets an explicit allow (BR-ADS-08).

**Traces:** AC-ADS-08 / BR-ADS-08

**Preconditions:**

- The generator wrote and owns a hide entry
- The user deleted that entry from the settings

**Real-World Reachability:** A developer removes a generated hide entry to make a skill selectable again, then the next sync runs.

**Demo Flow:** Delete an owned entry, run the sync, and read the entry, the printed lines and the ownership record.

```gherkin
Given an owned hide entry the user deleted
When the third host is synced
Then the entry is written back with the policy value
And it stays recorded as owned
And no conflict line is printed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Restores the deleted owned entry silently                                                                                                                 |
| **Business data state** | Entry present with the policy value; ownership record unchanged                                                                                           |
| **Data shown on UI**    | No conflict line                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Deleted owned entry restored to the policy value
- ✅ No conflict line
- ❌ The deletion kept as a user choice
- ❌ A conflict line for a deleted owned entry

**Test Data:**

```json
{
    "owned": {
        "pdf-convert": "deny"
    },
    "userDeleted": "pdf-convert",
    "after": {
        "permission.skill": {
            "pdf-convert": "deny"
        }
    }
}
```

**Edge Cases:**

- The user sets an explicit allow instead of deleting → kept with one conflict line (TC-ADS-058)
- The policy no longer wants the deleted entry → nothing is written back and the record drops it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]` · `[Source: rule/scripts/owned-key-ledger]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/owned-key-ledger` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-055: an owned entry the user deleted is restored to the policy value with no conflict line` · **Status:** Tested

---

#### TC-ADS-058: The third-host sync never adopts, overwrites or loosens a user permission [P0]

**Objective:** Prove that a user-set skill permission, set before the first sync or changed after it, survives the sync with a conflict line, and that a non-map permission value is left alone.

**Business Intent / Invariant Guarded:** The generator never takes over or weakens a permission the user chose (BR-ADS-08).

**Traces:** AC-ADS-08 / BR-ADS-08

**Preconditions:**

- The user hid a workflow before the first sync; the generator wants "ask"
- The user changed an owned entry after the last sync

**Real-World Reachability:** A security-minded team tightens permissions by hand, then updates the framework.

**Demo Flow:** Run the sync and read the permission entries, the printed lines and the ownership record.

```gherkin
Given the user hid a workflow before the first sync and changed an owned entry after the last sync
When the third host is synced
Then both user values stay
And one conflict line is printed per entry
And the pre-existing entry is not recorded as owned
And given the permission setting is a single value instead of a map, it is unchanged and a conflict is printed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Skips user entries and reports each conflict                                                                                                              |
| **Business data state** | User values unchanged; ownership record excludes pre-existing entries                                                                                     |
| **Data shown on UI**    | Conflict lines naming the entry, the user value and the wanted value                                                                                      |

**Acceptance Criteria:**

- ✅ User values kept
- ✅ One conflict line each
- ✅ Pre-existing entry not owned
- ❌ A user value overwritten or loosened
- ❌ A pre-existing entry adopted

**Test Data:**

```json
{
    "before": {
        "permission.skill": {
            "workflow-feature": "deny"
        }
    },
    "generatorWants": {
        "workflow-feature": "ask"
    },
    "scalarCase": {
        "permission": {
            "skill": "deny"
        }
    }
}
```

**Edge Cases:**

- A user wildcard entry → never rewritten

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]` · `[Source: rule/scripts/owned-key-ledger]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/owned-key-ledger` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-058: a pre-existing user key is never adopted, overwritten or loosened`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-058: an owned key the user changed after the last sync is kept with one conflict line`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-058: a permission.skill that is a single value is unchanged and reported` · **Status:** Tested

---

#### TC-ADS-059: Command names come from validated folder names and stay inside the commands folder [P0]

**Objective:** Prove that an invalid skill folder name is skipped with a warning, that a hostile name in the skill text cannot move the command file, and that descriptions with special characters are escaped.

**Business Intent / Invariant Guarded:** A skill can never make the generator write outside the commands folder or produce a broken command (BR-ADS-10).

**Traces:** AC-ADS-09 / BR-ADS-10

**Preconditions:**

- A skill folder "Bad_Name"
- A valid folder whose declared name tries to leave the folder and whose description has a quote, a backslash and a line break

**Real-World Reachability:** A project adds its own skills with unusual names or descriptions.

**Demo Flow:** Run the sync and list the commands folder; read back the generated description.

```gherkin
Given a skill folder with an invalid name and a valid folder whose declared name tries to leave the commands folder
When the third host is synced
Then the invalid folder is skipped with a warning
And the valid command is written inside the commands folder under its folder name
And its description reads back as the original text with whitespace collapsed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Validates names, contains paths, escapes descriptions                                                                                                     |
| **Business data state** | Only safe command files exist                                                                                                                             |
| **Data shown on UI**    | A warning for the invalid folder; one command under the folder name                                                                                       |

**Acceptance Criteria:**

- ✅ Invalid skipped
- ✅ Write inside the folder
- ✅ Description round-trips
- ❌ A file outside the commands folder
- ❌ A broken description

**Test Data:**

```json
{
    "invalidFolder": "Bad_Name",
    "declaredName": "../../evil",
    "description": "say \"hi\" \\ then\nnext",
    "namePattern": "^[a-z0-9][a-z0-9-]*$"
}
```

**Edge Cases:**

- Two skills mapping to one name → cannot happen, folder names are unique

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-059: command names come from validated folder names and stay inside the commands folder` · **Status:** Tested

---

#### TC-ADS-060: A skill another workflow or an agent calls is never hidden without opt-in [P0]

**Objective:** Prove that a workflow used as a step of another workflow stays loadable under a strict project default, with a skip line; the opt-in to hiding called skills, which reverses this, arrives in release D.

**Business Intent / Invariant Guarded:** Tightening visibility never breaks a workflow step or an agent that needs the skill (BR-ADS-09).

**Traces:** AC-ADS-10 / BR-ADS-09

**Preconditions:**

- Project default tier is confirm
- The review workflow is a step of another workflow

**Real-World Reachability:** A team sets a strict default; its feature workflow still calls the review workflow.

**Demo Flow:** Run the sync and read the entries and printed lines; from release D, run it again with the opt-in.

```gherkin
Given the project default tier is confirm and the review workflow is a step of another workflow
When the third host is synced
Then the review workflow has no permission entry
And one line says it was skipped because another workflow calls it
And, from release D, with the opt-in to hide called skills its entry is "ask"
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Computes the called set and skips it                                                                                                                      |
| **Business data state** | Called skill stays loadable                                                                                                                               |
| **Data shown on UI**    | A skipped line naming the caller                                                                                                                          |

**Acceptance Criteria:**

- ✅ No entry without opt-in
- ✅ Skip line printed
- ✅ Ask entry with opt-in (release D clause)
- ❌ Called skill hidden or asked without opt-in

**Test Data:**

```json
{
    "default": "confirm",
    "calledSkill": "workflow-review-changes",
    "optIn": "skillProfile.allowHidingCalledSkills",
    "optInRelease": "D"
}
```

**Edge Cases:**

- A skill named in an agent preload list → treated as called

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]` · `[Source: rule/scripts/called-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `rule/scripts/called-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-060: a workflow called as another workflow's step keeps no entry under a strict default`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-060: the skip line is printed by the CLI` (release-A no-opt-in clauses; the opt-in clause needs the release-D skill profile setting) · **Status:** Tested (release-A clauses; the opt-in clause stays Planned for release D)

---

#### TC-ADS-061: The third host uses the effective tier, not the framework tier [P1]

**Objective:** Prove that a project override that tightens a workflow to manual hides it, and one that loosens a manual workflow to auto removes its entry.

**Business Intent / Invariant Guarded:** The third host enforces exactly the tiers the project chose (BR-ADS-07).

**Traces:** AC-ADS-08 / BR-ADS-07

**Preconditions:**

- Workflow A is auto in the framework, overridden to manual
- Workflow B is manual in the framework, overridden to auto
- Neither is called by another workflow

**Real-World Reachability:** A team adjusts individual workflow tiers.

**Demo Flow:** Run the sync and read both entries.

```gherkin
Given workflow A is overridden from auto to manual and workflow B from manual to auto
When the third host is synced
Then A is hidden
And B has no entry
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Maps effective tiers to entries                                                                                                                           |
| **Business data state** | Entries follow the overrides                                                                                                                              |
| **Data shown on UI**    | Hide for A; nothing for B                                                                                                                                 |

**Acceptance Criteria:**

- ✅ A hidden
- ✅ B without entry
- ❌ Entries following the framework tiers

**Test Data:**

```json
{
    "overrides": {
        "a": "manual",
        "b": "auto"
    },
    "frameworkTiers": {
        "a": "auto",
        "b": "manual"
    }
}
```

**Edge Cases:**

- A hidden through its tier → also gets a command (TC-ADS-012)
- The same override set only in a developer's personal settings → no entry; the shared output follows the team settings only (BR-ADS-07)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]` · `[Source: operation/scripts/workflow-routing-config]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `operation/scripts/workflow-routing-config` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-061: entries follow the effective tier, not the framework tier`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::effective tier comes from the team scope: a developer's local override never lands in opencode.json` · **Status:** Tested

---

### Validation Tests

#### TC-ADS-014: An out-of-range token checkpoint interval is rejected [P2]

**Objective:** Prove that a checkpoint interval below the allowed range fails validation.

**Business Intent / Invariant Guarded:** A mistyped interval never floods the assistant with checkpoint notes (BR-ADS-11). The checkpoint behavior itself is specified with the guided workflow capability.

**Traces:** AC-ADS-11 / BR-ADS-11

**Preconditions:**

- The checkpoint interval is set to 10 tokens

**Real-World Reachability:** A maintainer mistypes the interval.

**Demo Flow:** Validate the project configuration.

```gherkin
Given the token checkpoint interval is 10
When the project configuration is validated
Then an out-of-range error names the setting and the allowed range
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Validation reports an error                                                                                                                               |
| **Business data state** | Configuration reported invalid                                                                                                                            |
| **Data shown on UI**    | Error with the setting name and the range 50,000 to 20,000,000                                                                                            |

**Acceptance Criteria:**

- ✅ Error reported
- ❌ Value accepted

**Test Data:**

```yaml
inputDomain: 'any whole-number interval'
invariant: 'for ALL values validation accepts exactly 50,000 to 20,000,000 inclusive'
boundaryCounterCase: '49,999 and 20,000,001 → rejected; 50,000 and 20,000,000 → accepted'
```

```json
{
    "hooks": {
        "tokenBudget": {
            "checkpointTokens": 10
        }
    }
}
```

**Edge Cases:**

- Setting absent → default of 500,000 applies, no error
- A value that is not a number → rejected with a type error naming the setting (BR-ADS-11)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/project-config-schema]`
> **Related Behaviors:** `rule/hooks/project-config-schema` · `test/hooks/project-config-refactor-keys`
> **CoveredBy:** `.claude/hooks/tests/suites/project-config-refactor-keys.test.cjs::[project-config-refactor-keys] TC-ADS-014 checkpointTokens outside 50000..20000000 is rejected` · **Status:** Tested

---

### Compaction Budget Tests

#### TC-ADS-034: The framework's shipped settings set no compaction budget [P1]

**Objective:** Prove that the primary-host settings and the third-host recommended defaults the framework ships carry no compaction budget.

**Business Intent / Invariant Guarded:** Each host compacts at its own default and a budget the user chooses is never outranked by the framework (BR-ADS-20).

**Traces:** AC-ADS-19 / BR-ADS-20

**Preconditions:**

- The framework's own repository; in an adopting project the case reports itself skipped, because the project owns its copy of these settings

**Real-World Reachability:** Every adopting project copies these settings as they are shipped.

**Demo Flow:** Read the shipped primary-host settings and the third-host recommended defaults.

```gherkin
Given the framework's shipped primary-host settings and third-host recommended defaults
When they are read
Then neither sets a compaction budget
And the other shipped settings are still present
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Nothing in the shipped settings overrides the host default                                                                                                |
| **Business data state** | No budget and no model window override in the shipped settings                                                                                            |
| **Data shown on UI**    | The shipped settings, with every other setting unchanged                                                                                                  |

**Acceptance Criteria:**

- ✅ No budget for the primary host
- ✅ No model window override for the third host
- ✅ The other shipped settings kept
- ❌ A budget in the shared settings
- ❌ A model window override in the recommended defaults

**Test Data:**

```json
{
    "primaryHost": { "compactionBudget": null },
    "thirdHost": { "modelWindowOverride": null }
}
```

**Edge Cases:**

- In an adopting project → reported as skipped with its reason, never as a failure

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: config/claude/shipped-settings]`
> **Related Behaviors:** `config/claude/shipped-settings` · `test/scripts/compaction-default`
> **CoveredBy:** `.claude/scripts/codex/tests/compaction-default.test.mjs::TC-ADS-034 the shipped host settings pin no auto-compaction budget` · **Status:** Tested

---

#### TC-ADS-035: A fresh project gets no second-host compaction budget [P1]

**Objective:** Prove that syncing the second host into a project without any configuration writes no compaction budget and none of the framework's former note.

**Business Intent / Invariant Guarded:** The second host compacts at its own default in every newly adopting project (BR-ADS-20).

**Traces:** AC-ADS-19 / BR-ADS-20

**Preconditions:**

- A project with no second-host configuration

**Real-World Reachability:** A team adopts the framework and runs the second-host sync for the first time.

**Demo Flow:** Run the second-host sync and read the configuration it writes.

```gherkin
Given a project with no second-host configuration
When the second-host sync runs
Then the configuration it writes has no compaction budget
And none of the framework's former compaction note
And no "kept user-set" line is printed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | The sync writes its other managed settings and no budget                                                                                                  |
| **Business data state** | No compaction budget in the new configuration                                                                                                             |
| **Data shown on UI**    | The written configuration without a budget or the former note                                                                                             |

**Acceptance Criteria:**

- ✅ No budget written
- ✅ No former note written
- ❌ A budget of any size written

**Test Data:**

```json
{
    "existingConfiguration": null
}
```

**Edge Cases:**

- The sync still writes its other managed settings, so a missing budget is not a skipped run

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-035 a fresh project gets no Codex compaction budget and no bundled compaction comment` · **Status:** Tested

---

#### TC-ADS-036: The bundled second-host budget and its note are retired, and a second sync changes nothing [P1]

**Objective:** Prove that a second-host budget of exactly 500,000 under the framework's unchanged note is removed with that note, the project's own settings stay, and a second sync leaves the configuration identical.

**Business Intent / Invariant Guarded:** A project that adopted an earlier framework version returns to the host default on its next sync (BR-ADS-21).

**Traces:** AC-ADS-20 / BR-ADS-21

**Preconditions:**

- A second-host configuration holding the budget 500,000 under the framework's unchanged note, among the project's own settings

**Real-World Reachability:** Every project that synced an earlier framework version holds this value.

**Demo Flow:** Run the second-host sync twice and compare the configuration after each run.

```gherkin
Given a second-host configuration holding the budget 500,000 under the framework's unchanged note
And the project's own settings around it
When the sync runs twice
Then the budget and the note are removed
And the project's own settings stay
And the configuration after the second run is identical to the first
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Removes the bundled budget and the unchanged bundled note only                                                                                            |
| **Business data state** | No budget; the project's own settings unchanged                                                                                                           |
| **Data shown on UI**    | Identical configuration after both runs; no "kept user-set" line                                                                                          |

**Acceptance Criteria:**

- ✅ Budget removed
- ✅ Unchanged bundled note removed
- ✅ Project settings kept
- ✅ Second run identical
- ❌ The bundled budget left in place
- ❌ A project setting removed or changed

**Test Data:**

```yaml
inputDomain: 'any second-host configuration'
invariant: 'for ALL configurations, after one sync no top-level budget equal to the bundled value remains, every other line is unchanged except the unchanged bundled note, and a second sync changes nothing'
boundaryCounterCase: 'the bundled value under a note the user wrote → the budget is removed and the note stays; the bundled value inside a narrower section → kept'
```

```json
{
    "budget": 500000,
    "note": "the framework's former compaction note, unchanged",
    "projectSettings": ["model", "instruction file names", "display section"]
}
```

**Edge Cases:**

- A note the user wrote above the bundled value → the note stays
- The bundled value inside a narrower section of the configuration → kept, because the framework never wrote it there

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-036 the bundled Codex compaction budget and its comment are retired, and a second sync is byte-identical` · **Status:** Tested

---

#### TC-ADS-037: A user-set second-host budget survives the sync and is reported once [P0]

**Objective:** Prove that a second-host budget other than the bundled value is kept exactly as written and named in one printed line.

**Business Intent / Invariant Guarded:** A budget the user chose is never removed or changed by a sync (BR-ADS-21).

**Traces:** AC-ADS-20 / BR-ADS-21

**Preconditions:**

- A second-host configuration whose top-level budget is 300,000

**Real-World Reachability:** A developer set their own compaction point for the project before the sync ran.

**Demo Flow:** Run the second-host sync and read the configuration and the printed lines.

```gherkin
Given a second-host configuration whose top-level budget is 300,000
When the sync runs
Then the budget line is kept unchanged
And exactly one line is printed naming the kept value
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Leaves the user's budget alone and reports it                                                                                                             |
| **Business data state** | Budget still 300,000                                                                                                                                      |
| **Data shown on UI**    | One "kept user-set" line naming 300000                                                                                                                    |

**Acceptance Criteria:**

- ✅ Budget kept verbatim
- ✅ Exactly one kept line
- ❌ Budget removed or changed
- ❌ Kept silently

**Test Data:**

```yaml
inputDomain: 'any top-level budget value other than exactly 500000 as the framework wrote it'
invariant: 'for ALL such values the sync keeps the value verbatim and prints exactly one kept line naming it'
boundaryCounterCase: '500,000 written with digit separators, in another number base, or as text → kept; exactly 500000 → retired (TC-ADS-036)'
```

```json
{
    "budget": 300000
}
```

**Edge Cases:**

- A larger budget such as 1,000,000 → kept and reported
- The same number written differently → kept and reported

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/migrate-claude-to-codex]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex` · `test/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/scripts/codex/tests/migrate-claude-to-codex.test.mjs::TC-ADS-037 a user-set Codex compaction budget survives the sync and is reported once` · **Status:** Tested

---

#### TC-ADS-038: The bundled third-host model window is retired and the model options stay [P1]

**Objective:** Prove that a third-host model window of exactly 500,000 with output 384,000 is removed from the project configuration while the model's reasoning option stays, and that the check mode then passes.

**Business Intent / Invariant Guarded:** A project that adopted an earlier framework version returns to the model's registry window on its next sync (BR-ADS-21).

**Traces:** AC-ADS-20 / BR-ADS-21

**Preconditions:**

- A third-host project configuration whose model window is exactly 500,000 with output 384,000, beside a reasoning option of high

**Real-World Reachability:** Every project that synced an earlier framework version holds this window.

**Demo Flow:** Run the third-host sync, read the configuration, run the check, then sync again.

```gherkin
Given a third-host project configuration whose model window is exactly 500,000 with output 384,000
And the model's reasoning option is high
When the sync runs
Then the window override is removed
And the reasoning option stays high
And the check mode passes
And a second sync changes nothing
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Removes the bundled window before merging the recommended defaults                                                                                        |
| **Business data state** | No window override; reasoning option high                                                                                                                 |
| **Data shown on UI**    | Updated configuration; check passes; no "kept user-set" line                                                                                              |

**Acceptance Criteria:**

- ✅ Window override removed
- ✅ Reasoning option kept
- ✅ Check passes and a rerun changes nothing
- ❌ The bundled window left in place
- ❌ The model's options lost

**Test Data:**

```json
{
    "modelWindow": { "context": 500000, "output": 384000 },
    "options": { "reasoningEffort": "high" }
}
```

**Edge Cases:**

- A configuration that still holds the bundled window → the check mode reports it stale

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-config]`
> **Related Behaviors:** `operation/scripts/opencode-sync-config` · `test/scripts/opencode-sync-config`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-config.test.mjs::TC-ADS-038 the bundled model limit is retired from the root config and the model options stay` · **Status:** Tested

---

#### TC-ADS-039: A user-set third-host model window is preserved [P0]

**Objective:** Prove that a third-host model window other than the bundled one is preserved by the sync and named in one printed line.

**Business Intent / Invariant Guarded:** A model window the user chose is never removed or changed by a sync (BR-ADS-21).

**Traces:** AC-ADS-20 / BR-ADS-21

**Preconditions:**

- A third-host project configuration whose model window size is 800,000

**Real-World Reachability:** A developer set their own compaction point for the model before the sync ran.

**Demo Flow:** Run the third-host sync and read the configuration and the printed lines.

```gherkin
Given a third-host project configuration whose model window size is 800,000
When the sync runs
Then that window is preserved
And one line is printed naming it
And the check mode passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Leaves the user's window alone and reports it                                                                                                             |
| **Business data state** | Window size still 800,000                                                                                                                                 |
| **Data shown on UI**    | One "kept user-set" line naming the window                                                                                                                |

**Acceptance Criteria:**

- ✅ Window preserved
- ✅ One kept line
- ❌ Window removed or changed
- ❌ Kept silently

**Test Data:**

```yaml
inputDomain: 'any model window other than exactly a 500,000 context with a 384,000 output'
invariant: 'for ALL such windows the sync keeps the window unchanged and prints exactly one kept line'
boundaryCounterCase: 'a 500,000 window with no output size, with a different output size, with an extra field, or with the size written as text → kept'
```

```json
{
    "modelWindow": { "context": 800000, "output": 384000 }
}
```

**Edge Cases:**

- A window that differs from the bundled one only by an extra field → kept and reported

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-config]`
> **Related Behaviors:** `operation/scripts/opencode-sync-config` · `test/scripts/opencode-sync-config`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-config.test.mjs::TC-ADS-039 a user-set model limit is preserved and reported once` · **Status:** Tested

---

### Invariant / Property Tests

> Universally-quantified cases for the [HARD] ownership and command rules. The called-skill and lock properties (TC-ADS-018, TC-ADS-053) are release D and live in the continuation part. TC-ADS-014, TC-ADS-036, TC-ADS-037 and TC-ADS-039 also carry property blocks in their own categories, and so do TC-ADS-031 and TC-ADS-032 in the continuation part.

#### TC-ADS-015: The third-host sync keeps unrelated settings and is repeatable [P1]

**Objective:** Prove that syncing twice preserves unrelated third-host settings, produces identical output, and passes the check mode.

**Business Intent / Invariant Guarded:** The sync is safe to run at any time on an adopter settings file (BR-ADS-08).

**Traces:** AC-ADS-08 / BR-ADS-08

**Preconditions:**

- The third-host settings file has unrelated settings

**Real-World Reachability:** Teams rerun the sync after every framework update.

**Demo Flow:** Run the sync twice and the check once; compare the files.

```gherkin
Given unrelated settings in the third-host settings file
When the sync runs twice
Then the unrelated settings are preserved
And the second run output is identical to the first
And the check mode passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Writes only owned entries                                                                                                                                 |
| **Business data state** | Unrelated settings unchanged                                                                                                                              |
| **Data shown on UI**    | Identical files after both runs; check passes                                                                                                             |

**Acceptance Criteria:**

- ✅ Preserved
- ✅ Identical
- ✅ Check passes
- ❌ Any unrelated setting changed
- ❌ Second run differs

**Test Data:**

```yaml
inputDomain: 'any third-host settings file with any unrelated settings'
invariant: 'for ALL such files sync(sync(f)) equals sync(f) and every unrelated setting equals its input'
boundaryCounterCase: 'a settings file that is not valid → the sync refuses and leaves it unchanged'
```

```json
{
    "unrelated": {
        "theme": "dark",
        "model": "x"
    }
}
```

**Edge Cases:**

- No hidden skills at all → no permission block is added

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-015: unrelated settings survive, a second sync is byte-identical, and --check passes`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-015: no governed skills adds no permission block and no ledger`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-015: an invalid opencode.json is refused and left unchanged` · **Status:** Tested

---

#### TC-ADS-062: Generated commands are repeatable and the check catches drift [P1]

**Objective:** Prove that a second sync leaves every generated command identical, and that an edited, deleted or no-longer-needed generated command fails the check and is restored or removed by the next sync.

**Business Intent / Invariant Guarded:** Generated commands stay exactly in step with what is hidden (BR-ADS-10).

**Traces:** AC-ADS-09 / BR-ADS-10

**Preconditions:**

- A synced project with generated commands

**Real-World Reachability:** Teams rerun the sync after edits and framework updates.

**Demo Flow:** Sync twice; then edit one command, delete another, un-hide a third skill; run the check, then sync.

```gherkin
Given a synced project with generated commands
When it is synced again
Then every command is identical
When a generated command is edited or deleted, or its skill is no longer hidden
Then the check fails
And the next sync restores the command or removes the stale one
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, command output and the generated settings files |
| **System behavior**     | Compares expected and actual commands                                                                                                                     |
| **Business data state** | Commands match the hidden set after the sync                                                                                                              |
| **Data shown on UI**    | Check failure listing the drifted commands                                                                                                                |

**Acceptance Criteria:**

- ✅ Identical on rerun
- ✅ Check fails on drift
- ✅ Next sync repairs
- ❌ Drift undetected
- ❌ Stale command kept

**Test Data:**

```yaml
inputDomain: 'any set of hidden skills and any prior state of marked command files'
invariant: 'for ALL such inputs, after one sync the marked command files equal exactly the commands for the hidden set, and a second sync changes nothing'
boundaryCounterCase: 'an unmarked file with a generated-looking name → never counted, changed or removed'
```

```json
{
    "mutations": ["edit", "delete", "unhide"]
}
```

**Edge Cases:**

- An unmarked user command → ignored by the check

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/opencode-sync-skills]`
> **Related Behaviors:** `operation/scripts/opencode-sync-skills` · `test/scripts/opencode-sync-skills`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-062: commands are repeatable, --check catches edit/delete/unhide, and the next sync repairs`, `.claude/scripts/opencode/tests/sync-skills.test.mjs::TC-ADS-062: the --check CLI exits non-zero on a drifted command` · **Status:** Tested

---

_Feature Spec — tech-free 8-section template v4.0_
