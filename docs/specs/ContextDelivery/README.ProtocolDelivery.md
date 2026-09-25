---
module: 'hooks'
service: 'framework.ContextDelivery'
feature_code: 'PDL'
entities:
    [
        'Protocol',
        'ProtocolGroup',
        'PublishedProtocol',
        'GuideEntry',
        'Skill',
        'ReferenceCarrier',
        'Agent',
        'DeliveryMessage',
        'DeliveryRecord',
        'LoadPath',
        'SecondHostInlineList'
    ]
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

# Protocol Delivery — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> Technical identifiers live only in frontmatter, Related Documentation and the Section 8 hidden carriers.

> **DRAFT — provisional spec.** The decided values in Section 4 were confirmed on all three assistant hosts by the delivery confirmation run recorded in ADR-0004; one default changed there (the second host keeps its shell-read path) and is written here as decided behavior. The delivery code has landed: cases with an executing test carry `Implemented` (see the Section 8 status note); close-time, manual and conditional cases stay `Planned` or `Untested` with their reason. After the release-close full test run, reconcile with `/spec [mode=update]`, flip the implemented cases to `Tested`, and clear the provisional flag.

## Related Documentation

| Type                      | Path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Description                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Spec Index (derived)      | `docs/specs/ContextDelivery/INDEX.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Generated navigation catalog for this bucket; refresh through the spec index owner.                                    |
| Decision record           | `0004-protocol-delivery-hybrid.md` under the ADR root (default `docs/adr`; `docsRoots.adr.path` in `docs/project-config.json` overrides it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Why protocols are delivered this way, the options rejected, the agent-start reversal and the confirmation-run figures. |
| Sibling capabilities      | `docs/specs/ContextDelivery/README.WorkflowRouting.md`, `docs/specs/ContextDelivery/README.PerFileConventionInjection.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Same once-per-session delivery and the same re-arm distance.                                                           |
| Host mapping              | Primary assistant host = Claude Code (`.claude/settings.json`); second assistant host = Codex (`.codex/hooks.json`, `.agents/skills/`, `.codex/agents/`); third assistant host = OpenCode (bridge template `.claude/scripts/opencode/templates/easy-claude-hooks.js.tmpl`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Products behind the host roles named in the prose.                                                                     |
| Canonical protocol source | `.claude/skills/shared/sync-inline-versions.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | The one place each protocol is authored.                                                                               |
| Group data                | `.claude/skills/shared/protocol-groups.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Groups, one-line summaries, "when" lines, the inline skill list.                                                       |
| Published protocol text   | `.claude/skills/shared/protocols/<tag>.md`, `.claude/skills/shared/protocols/index.json`; generator `.claude/scripts/build-protocol-projection.cjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The only text delivery reads; versioned so hookless hosts can read it by path.                                         |
| Delivery                  | `.claude/hooks/lib/protocol-delivery.cjs`; entries `.claude/hooks/protocol-inject-<group>.cjs`; record store `<project>/tmp/protocol-delivery`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Event resolution, filters, pack, session records.                                                                      |
| Host mapping generators   | `.claude/scripts/codex/sync-hooks.mjs`, `.claude/scripts/codex/migrate-claude-to-codex.mjs`, `.claude/scripts/opencode/sync-hooks.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Second- and third-host registration and the second-host inline list.                                                   |
| Carrier tooling           | `.claude/scripts/sync-update-blocks.py` (guide mode)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Converts skill bodies to guide entries; propagates canonical edits to full-text carriers.                              |
| Test suites (planned)     | `.claude/scripts/tests/build-protocol-projection.test.cjs`, `.claude/hooks/tests/suites/protocol-delivery.test.cjs`, `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs`, `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs`, `.claude/scripts/codex/tests/verify-sync-divergence.test.mjs`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs`, `.claude/scripts/tests/sync-update-blocks-guide.test.cjs`, `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs`, `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs`, `.claude/hooks/tests/suites/content-presence.test.cjs`, `.claude/scripts/tests/injectors-respect-guides.test.cjs`, `.claude/hooks/tests/suites/review-mode-sections.test.cjs` | Executors for Section 8.                                                                                               |

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

Many skills follow the same shared protocols — evidence rules, review rules, task rules — and until now every skill carried a full copy of each one, so half of what the assistant read when it loaded a skill was repeated text. This capability keeps one short guide entry per protocol in each skill and delivers the full protocol text to the assistant once per session, in six small group messages, when the skill loads on any of the three supported assistant hosts; a delivery that cannot happen degrades to the assistant reading the protocol by its path, never to silence. The five review-family skills, whose protocol text is larger than the delivery capacity, and every supporting reference file keep their full text in place, and the four rules the root instruction file already carries are not repeated.

---

## 2. Glossary

| Term                         | Definition                                                                                                                                                                                                   | Context                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Protocol                     | A shared rule text that several skills or agents follow, such as the evidence rules or the review rules                                                                                                      | Authored once, in the canonical protocol source                                      |
| Canonical Protocol Source    | The one document where every protocol is written                                                                                                                                                             | Every other copy is derived from it                                                  |
| Published Protocol Text      | One generated, versioned file per protocol, plus an index of all protocols                                                                                                                                   | The only text delivery reads; hosts without delivery read it by path                 |
| Protocol Index               | The list of published protocols, each with its group, one-line summary, when it applies, size and parts                                                                                                      | Unknown protocol names are dropped against it                                        |
| Protocol Group               | One of six fixed sets of protocols, each delivered as its own message                                                                                                                                        | review · evidence and trace · workflow and task · spec and test · design · universal |
| Bin                          | The largest delivery message: 9,500 characters                                                                                                                                                               | Below the primary host's 10,000-character limit for one added message                |
| Host Message Limit           | The largest added message a host shows in full                                                                                                                                                               | Primary host: 10,000 characters; a longer one becomes a file with a 2 KB preview     |
| Guide Entry                  | One line in a skill naming a protocol, a one-line summary, when it applies and where its published text lives                                                                                                | Replaces the full protocol body in a converted skill                                 |
| Guide Block                  | The marked block in a skill that holds its guide entries                                                                                                                                                     | The only place delivery reads a skill's declared protocols                           |
| Reminder Digest              | The short recap of a protocol near the end of a skill                                                                                                                                                        | Always kept, in every kind of skill                                                  |
| Converted Skill              | A skill whose protocol bodies were replaced by guide entries                                                                                                                                                 | Receives the full text by delivery                                                   |
| Inline Skill                 | A skill that keeps every full protocol body and has no guide block                                                                                                                                           | The five review-family skills, listed in the group data                              |
| Undeclared Skill             | A skill not yet converted and not on the inline list                                                                                                                                                         | Carries full bodies; delivery gives it nothing                                       |
| Reference Carrier            | A supporting file of a skill, read at the point in the skill where it is needed                                                                                                                              | Keeps full protocol bodies; never converted                                          |
| Root Instruction File        | The always-loaded project instruction file a host reads at session start                                                                                                                                     | Carries the four root-carried protocols                                              |
| Root-Carried Protocol        | One of the four protocols the root instruction file carries: critical thinking, AI mistake prevention, the project reference docs gate, the project protocol overlay                                         | Exactly the universal group                                                          |
| Universal Guides Requirement | The project setting that says every skill relies on the root file for the root-carried protocols                                                                                                             | On by default; a project may switch it off                                           |
| Load Path                    | A way a skill reaches the assistant: a typed command, a skill the assistant chose, a read of the skill file, an agent that preloads skills, a prompt naming a skill, a shell command that reads a skill file | Each host has its own set                                                            |
| Root-Skipping Agent Type     | A built-in agent type that starts without the root instruction file                                                                                                                                          | Decided: Explore and Plan, on the primary host only                                  |
| Delivery Message             | The text one group delivers for one load: full protocol texts, then the names and paths of any that did not fit                                                                                              | At most one bin                                                                      |
| Delivery Record              | The per-session, per-scope note that a protocol's current text was delivered                                                                                                                                 | Stops counting after compaction or re-arm distance                                   |
| Scope                        | The main session, or one sub-agent                                                                                                                                                                           | Each scope receives a protocol once                                                  |
| Compaction                   | The host's summary of an over-long conversation, which drops earlier added messages                                                                                                                          | Re-arms every delivery record                                                        |
| Re-arm Distance              | About 4,500,000 bytes of conversation record growth, about 200,000 tokens                                                                                                                                    | Same distance as routing guidance and file conventions                               |
| Read-by-Path Fallback        | The assistant reading a protocol from the path in its guide entry                                                                                                                                            | What every delivery miss degrades to                                                 |
| Second-Host Inline List      | The protocols the second host's generated skill copy keeps as full text                                                                                                                                      | Decided: empty                                                                       |
| Handler Review               | The second host's rule that a new or changed delivery step runs only after the user reviews it                                                                                                               | Until then, guides are the path                                                      |
| Mode-Only Section            | Skill text used by one mode only, such as the fix loop                                                                                                                                                       | Loads when that mode runs                                                            |
| Non-Matching Event           | A host event that cannot load a skill, such as a read of an ordinary source file                                                                                                                             | Costs no delivery start where a filter exists                                        |

---

## 3. User Stories & Acceptance Criteria

### US-PDL-01: Protocols arrive once when a converted skill loads

**As an** AI assistant loading a skill
**I want** the full text of each protocol the skill follows, delivered once per session
**So that** I follow the whole protocol without reading it again on every load

**Acceptance Criteria:**

- **AC-PDL-01** — **Given** a converted skill that declares protocols from two groups **When** it loads for the first time in a scope **Then** each of the two groups arrives as one message of at most 9,500 characters holding the full text of that group's declared protocols, and no other group arrives
- **AC-PDL-02** — **Given** a protocol already delivered in this scope **When** any skill that declares it loads again, or the same trigger fires again **Then** it is not repeated; **and after** a compaction or about 4,500,000 bytes of conversation growth it is delivered again
- **AC-PDL-03** — **Given** more declared text in one group than the bin holds **When** that group is delivered **Then** the protocols that do not fit are named with their published paths, and none is dropped

### US-PDL-02: A delivery miss is never silent

**As a** framework maintainer
**I want** every miss to leave the assistant a path to the full protocol
**So that** shrinking skill text never lowers compliance

**Acceptance Criteria:**

- **AC-PDL-04** — **Given** a host without delivery, or a second-host delivery step the user has not reviewed yet **When** a converted skill loads **Then** its guide entries name each protocol and where to read it
- **AC-PDL-05** — **Given** a delivery record store that cannot be created, read or locked for a storage reason **When** a converted skill loads **Then** the protocols are delivered anyway, possibly twice; only a live parallel delivery of the same protocol skips it
- **AC-PDL-06** — **Given** a protocol group is converted **When** the same review is run before and after the conversion and scored with the compliance checklist **Then** no check that passed before fails after

### US-PDL-03: Heavy review skills and reference files keep their full text

**As a** framework maintainer
**I want** the skills whose protocol text exceeds the delivery capacity, and every reference file, to keep full bodies
**So that** no review reaches the assistant as a list of paths

**Acceptance Criteria:**

- **AC-PDL-07** — **Given** one of the five inline skills **When** it loads on any host **Then** it keeps every full protocol body, receives nothing from any group, and a guide entry placed in it fails verification
- **AC-PDL-08** — **Given** a reference file of a skill that holds full protocol bodies **When** conversion runs **Then** the file is unchanged, and a converted skill's guide block lists every protocol that any mode or reference of the skill declares

### US-PDL-04: Root-carried rules are carried once

**As a** project maintainer
**I want** the four rules my root instruction file carries not to be repeated in skills or deliveries
**So that** the assistant is not charged for them twice, and still gets them where the root file is missing

**Acceptance Criteria:**

- **AC-PDL-09** — **Given** the universal guides requirement is on (the default) **When** skills are converted and loaded **Then** no skill outside the inline list carries the four root-carried bodies, none is delivered, and the root instruction files carry all four
- **AC-PDL-10** — **Given** the universal guides requirement is off **When** a converted skill loads **Then** the universal group is delivered with it
- **AC-PDL-11** — **Given** an agent type that starts without the root instruction file **When** it starts **Then** the universal group is delivered to it

### US-PDL-05: Every load path on every host delivers

**As a** developer using any of the three assistant hosts
**I want** each way a skill can load to deliver its protocols
**So that** my host choice does not change the rules the assistant follows

**Acceptance Criteria:**

- **AC-PDL-12** — **Given** the primary host **When** a skill loads by a typed command, by the assistant's own choice, by a read of the skill file, or by an agent that preloads it **Then** the declared protocols are delivered; the typed command and the assistant's own choice are two separate triggers and both are registered
- **AC-PDL-13** — **Given** the second host **When** a prompt names a skill, a shell command reads a skill file, or an agent that preloads skills starts **Then** the declared protocols are delivered within a per-message allowance of 3,000, and every delivery step that existed before renders exactly as before
- **AC-PDL-14** — **Given** the third host **When** the skill tool loads a skill or a skill file is read **Then** the declared protocols are appended to that result; the host's missing agent-start and prompt-expansion triggers are reported as not available
- **AC-PDL-15** — **Given** the second-host inline list **When** the second host's skill copy is generated **Then** listed protocols are full text and all others are guide entries; the decided list is empty

### US-PDL-06: Delivery costs nothing on unrelated events

**As a** developer
**I want** reads of ordinary files and other unrelated events not to start delivery work
**So that** six delivery groups do not slow down every step

**Acceptance Criteria:**

- **AC-PDL-16** — **Given** a read of a file that is not a skill file **When** it happens on any host **Then** no delivery step starts
- **AC-PDL-17** — **Given** any other event that cannot load a skill **When** a delivery step receives it **Then** the step ends with no output before it loads any project module, and on the second host its start path skips the version-control lookup

### US-PDL-07: Untrusted input cannot steer delivery

**As a** framework maintainer
**I want** delivery to open only framework files and publish only indexed protocol text
**So that** a crafted skill name, agent type or guide line cannot read or echo arbitrary files

**Acceptance Criteria:**

- **AC-PDL-18** — **Given** a skill name or agent type outside the allowed name shape, a skill file outside the skill folders, or a guide line naming an unknown protocol with a custom path **When** delivery is planned **Then** no file outside the skill and agent folders is opened, the unknown protocol is dropped, and no guide-line path text appears in the message

### US-PDL-08: Mode-only sections load only when the mode runs

**As an** AI assistant running one mode of a review skill
**I want** the sections of other modes kept out of the main skill file
**So that** a small validate run does not pay for the full review and fix-loop text

**Acceptance Criteria:**

- **AC-PDL-19** — **Given** a review skill with a validate mode, a full mode, a fix loop and a reviewer injection template **When** a mode runs **Then** that mode's first action reads its section from the reference file, the other modes' sections are absent from the main file, every full protocol body stays in the main file, and the reviewer injection template is published whole and copied wholesale into reviewer prompts

### US-PDL-09: One owner keeps every carrier in step

**As a** framework maintainer
**I want** the canonical source, the published text, the guide entries and every full-text carrier to stay equal
**So that** a protocol edit reaches everything that carries it and nothing goes stale unnoticed

**Acceptance Criteria:**

- **AC-PDL-20** — **Given** the canonical source and the group data **When** the published text is built **Then** it is deterministic, every protocol in use has a group, and a stale published text fails the sync verification
- **AC-PDL-21** — **Given** a canonical edit **When** the carrier tooling runs **Then** every full-text carrier — inline skills, reference files and agents — equals the new text, and guide conversion is repeatable, limited to the protocols named, and never touches agents, inline skills or reference files
- **AC-PDL-22** — **Given** a converted skill **When** any framework check or skill injector runs **Then** a guide entry with its reminder counts in place of the body, and the check still fails when both are missing
- **AC-PDL-23** — **Given** the duplication policy text **When** it is read **Then** it states the hybrid rule, and every copy of it equals the canonical text
- **AC-PDL-24** — **Given** compressed protocols **When** they are published **Then** each keeps every rule it had and stays at or under 9,000 characters, the reviewer injection template excepted
- **AC-PDL-25** — **Given** the conditional pruning follow-up runs **When** a skill's guide list is pruned **Then** only protocols that no mode of the skill uses are removed, each with a recorded reason

---

## 4. Business Rules

### Rule Catalog

| Rule ID   | Name                                                                     | Category  | Enforcement |
| --------- | ------------------------------------------------------------------------ | --------- | ----------- |
| BR-PDL-01 | Every converted skill keeps a guide entry per protocol                   | Carrier   | [HARD]      |
| BR-PDL-02 | Once per session per scope, re-armed by compaction and distance          | Delivery  | [HARD]      |
| BR-PDL-03 | Six standalone group messages, each within the bin                       | Delivery  | [HARD]      |
| BR-PDL-04 | Root-carried rules are neither copied nor delivered, with two exceptions | Delivery  | [HARD]      |
| BR-PDL-05 | A miss degrades to read-by-path, never to silence                        | Fail-safe | [HARD]      |
| BR-PDL-06 | Second-host copy and second-host load paths                              | Host      | [HARD]      |
| BR-PDL-07 | Mode-only sections load with their mode                                  | Carrier   | [HARD]      |
| BR-PDL-08 | Agent-start delivery, narrowed                                           | Delivery  | [HARD]      |
| BR-PDL-09 | Per-event, per-host cost budget                                          | Cost      | [HARD]      |
| BR-PDL-10 | Input trust                                                              | Security  | [HARD]      |
| BR-PDL-11 | The five review-family skills stay inline                                | Carrier   | [HARD]      |
| BR-PDL-12 | Reference carriers stay inline                                           | Carrier   | [HARD]      |
| BR-PDL-13 | Published protocol text is generated, fresh and portable                 | Integrity | [HARD]      |
| BR-PDL-14 | One owner; every carrier and check stays in step                         | Integrity | [HARD]      |
| BR-PDL-15 | Every host load path is registered                                       | Host      | [HARD]      |

### BR-PDL-01: Every converted skill keeps a guide entry per protocol [HARD]

IF a skill is converted THEN for every protocol it follows it carries one guide entry inside its guide block — the protocol name, a one-line summary, when it applies, and the path of the published text — and it keeps each protocol's reminder digest. A guide entry is the fallback every delivery miss relies on (BR-PDL-05). The inline skills of BR-PDL-11 are never converted and carry no guide block. A skill that declares no guide block receives nothing from delivery, so a skill is never delivered text it already carries in full while conversion is in progress.

`[Source: rule/skills/protocol-guide-entry]`

### BR-PDL-02: Once per session per scope, re-armed by compaction and distance [HARD]

On a host that runs delivery steps, IF a converted skill loads THEN each protocol declared in its guide block is delivered in full once per session per scope (the main session, and each sub-agent separately). IF a protocol was already delivered in this scope THEN it is not delivered again, however often the same skill or another skill that declares it loads, and however often a trigger fires again (on the primary host the prompt event fires again each time a background sub-agent returns). A delivery record stops counting — so the protocol is delivered again at the next load — after a compaction, after about 4,500,000 bytes of conversation record growth (about 200,000 tokens; the same distance routing guidance and file conventions use), or when the protocol's published text changed since it was delivered. A compaction counts on every host that runs delivery steps: the primary host marks it in its conversation record, the second host writes it into its conversation record as its own compaction entry, and the third host, whose events carry no conversation record, reports it when the session is compacted.

`[Source: rule/hooks/protocol-dedup]`

### BR-PDL-03: Six standalone group messages, each within the bin [HARD]

Protocols belong to exactly one of six fixed groups: review, evidence and trace, workflow and task, spec and test, design, universal. Each group is delivered as its own message of at most 9,500 characters (the bin), and each message stands alone: groups need no order and none refers to another. The bin leaves room below the primary host's 10,000-character limit, above which a message is replaced by a 2 KB preview and a file; several messages on one event are each limited separately, which is what lets six groups carry up to 57,000 characters per skill load. A protocol longer than the bin is published in parts, each within the bin and split at section boundaries; a part after the first still fits the bin once the "continued" line that opens it is added. IF one group's declared protocols for a load exceed the bin THEN the protocols that do not fit are listed by name and published path ("read these"); no protocol is dropped. A protocol's full text is never included at the cost of turning another protocol's name into an anonymous count: a closing "N more … → index" line appears only when the names alone would already exceed the bin.

`[Source: rule/hooks/protocol-pack]`

### BR-PDL-04: Root-carried rules are neither copied nor delivered, with two exceptions [HARD]

The universal group holds exactly the four root-carried protocols: critical thinking, AI mistake prevention, the project reference docs gate, and the project protocol overlay. The root instruction files carry all four, so they are neither copied into converted skills nor delivered, except:

- IF a project switches the universal guides requirement off THEN the universal group is delivered with every converted skill load;
- IF an agent type starts without the root instruction file (BR-PDL-08) THEN the universal group is delivered at its start.

The inline skills of BR-PDL-11 are excluded from both exceptions; they already carry the four in full.

`[Source: rule/hooks/protocol-root-carried]`

### BR-PDL-05: A miss degrades to read-by-path, never to silence [HARD]

Every way delivery can fail leaves the assistant a path to the full protocol:

- A host without delivery steps, or a second-host delivery step the user has not reviewed yet (the second host runs a new or changed step only after the user's handler review), leaves the guide entries as the path.
- IF the delivery record store cannot be created, read or locked for a storage reason — a read-only checkout, a store owned by someone else, a full disk, a file where the store folder should be — THEN the protocols are still delivered, without de-duplication; a duplicate delivery is accepted.
- Only a live parallel delivery of the same protocol record skips delivery.
- IF the skill or agent cannot be resolved, or any other error happens after the relevance check THEN nothing is delivered for it and its guide entries remain.

A group conversion is accepted only when the same review, run before and after the conversion and scored with the compliance checklist, passes every check after that it passed before; a confirmed regression holds the next conversion.

`[Source: rule/hooks/protocol-fail-open]`

### BR-PDL-06: Second-host copy and second-host load paths [HARD]

The second host's generated skill copy keeps full text only for protocols on the second-host inline list; every other protocol appears there as a guide entry and is delivered. **Decided: the list is empty**, because every second-host load path delivered the full bin in the confirmation run. The list changes only on new confirmation evidence; IF every second-host path failed THEN the copy would keep full text for every protocol.

The second host delivers on three paths:

- a prompt that names a skill;
- a shell command that reads a skill file — **kept on**, because the second host loads a skill through the shell when the prompt names none, and the prompt path then carries nothing. The relevance check matches the skill file name anywhere in the command, whatever the shell or path separator;
- an agent start (BR-PDL-08).

Each second-host delivery message has an allowance of 3,000 (holds up to about 11,000 characters). Every second-host delivery step that existed before this capability renders exactly as before, so the user's earlier handler review still holds for it. The second host shows a large skill whole (a 12 KB skill file arrived in full), so no size cut forces a protocol onto the inline list. Second-host sub-agents inherit the root instruction file, so the root-skipping rule of BR-PDL-08 is not needed there.

`[Source: rule/scripts/codex-protocol-mapping]`

### BR-PDL-07: Mode-only sections load with their mode [HARD]

IF a section of a skill is used by one mode only — the full review of the reasoning review skill, the fix loop of the review skills, the reviewer injection template — THEN it lives in a reference file, and the mode's first action is a blocking read of it. The main skill file keeps every full protocol body and reminder it carried before (BR-PDL-11). The reviewer injection template is published whole, with every protocol section and body, and each reviewer prompt copies it wholesale.

`[Source: rule/skills/review-mode-sections]`

### BR-PDL-08: Agent-start delivery, narrowed [HARD]

Delivery at agent start is registered only for agent types whose definition preloads skills, plus the built-in agent types that start without the root instruction file. **Decided: Explore and Plan** — the confirmation run showed the root file absent for both and present for a custom agent. The agent-start filter equals exactly that list, sorted. IF an agent that preloads skills starts THEN it receives the protocols of the converted skills it preloads (an inline skill among them contributes nothing). IF Explore or Plan starts THEN it receives the universal group only. The second host mirrors agent start with the same filter for skill-preloading agents; its agent type is the agent's name in the generated agent file. This reverses the earlier deliberate removal of agent-start injection; ADR-0004 records why.

`[Source: rule/hooks/protocol-agent-start]`

### BR-PDL-09: Per-event, per-host cost budget [HARD]

The budget is **per event and per host**: the added wall time of all delivery steps registered on one event, measured through the host's real start path (the primary host's own command, the second host's generated start command, the third host's bridge, which runs matching steps one after another).

- IF a file that is not a skill file is read THEN no delivery step starts, on every host: the primary host filters the read with a handler condition on the skill file name; the third host's bridge checks the same condition before it starts anything; the second host registers no read step.
- IF no such filter applies (events that are not tool uses, and the second host) THEN each step ends on a non-matching event before it loads any project module.
- On the second host, delivery steps use a lean start path without the version-control lookup that other steps run.
- Budget for a non-matching event: at most one bare host-path start per registered step plus 10 ms each, where the bare start is a no-op step through that same host path. The budget is measured, not asserted as a timing in a test; tests assert the deterministic parts (no project module loaded; no start for a non-skill read; no version-control lookup on the lean path). The reference figures are recorded in ADR-0004.

`[Source: rule/hooks/protocol-cost-budget]`

### BR-PDL-10: Input trust [HARD]

- A skill name or agent type is used only when it is lowercase letters, digits and hyphens, starting with a letter or digit; any other shape (a plugin-qualified name, a drive-letter name, a parent-folder step) opens no file.
- Files are read only inside the skill folder, the agent folder and, for second-host events, the second host's skill copy; a skill file outside them (for example under a dependency or temporary folder) delivers nothing.
- Protocol text comes only from protocols listed in the protocol index; an unknown protocol name is dropped, and the path text written in a guide entry is never read or repeated.
- The loaded skill's name is taken from the field each host uses for it (the primary host and the third host name it in different fields; delivery accepts either).

`[Source: rule/hooks/protocol-input-trust]`

### BR-PDL-11: The five review-family skills stay inline [HARD]

The skills on the inline list of the group data keep every full protocol body in their main file. **Decided list:** changes-review, code-review, plan-review, why-review, workflow-review-changes — each carries between 55,176 and 121,781 characters of shared protocol text, more than the 57,000 characters six bins can deliver per load, so delivery would reach them mostly as paths. They are never converted, even when a conversion run names their protocols; they declare no guide entries, so no group delivers to them, the universal exceptions included; a guide entry in one of them fails verification. Every name on the list must be a valid skill name with an existing skill folder. Agents keep their full protocol text as before and are never converted.

`[Source: rule/skills/inline-skills]`

### BR-PDL-12: Reference carriers stay inline [HARD]

Protocol bodies in a skill's reference files stay in full and are never converted; conversion changes a skill's main file only. IF a skill moves mode-only text into a reference file THEN a converted skill's guide block stays in its main file and lists the union of the protocols any mode or reference of the skill declares, while an inline skill keeps its full bodies in its main file, where framework checks and injectors look for them.

`[Source: rule/skills/reference-carriers]`

### BR-PDL-13: Published protocol text is generated, fresh and portable [HARD]

The published text — one file per protocol in use plus the protocol index (group, summary, when, size, parts) — is generated from the canonical protocol source and the group data, never edited by hand. Two builds of the same input are byte-identical. IF a protocol in use has no group, or an inline-list name is invalid or has no skill folder THEN the build fails naming it. IF the canonical text changed and the published text was not rebuilt THEN the freshness check fails, and the framework's sync verification fails with it. The published text names no consuming project and no absolute path, and its locations follow the project's configured roots.

`[Source: rule/scripts/protocol-projection]`

### BR-PDL-14: One owner; every carrier and check stays in step [HARD]

- A canonical protocol edit reaches every full-text carrier — inline skills, reference files and agents — through the carrier tooling; guide conversion never changes an agent, an inline skill or a reference file, is limited to the protocols it is asked for, and is repeatable with no further change.
- Every framework check and skill injector that looks for a protocol accepts a guide entry with its reminder in place of the body, and still fails when both are missing; the text-presence checks on a converted skill read the pinned rule fragments from the published text.
- The duplication policy states the hybrid rule — skills keep guides, delivery carries the text, agents and reviewer prompts carry full text, the five review-family skills keep full bodies — and every copy of the policy equals the canonical text.
- Compressed protocols keep every rule they had (checked rule by rule) and stay at or under 9,000 characters, the reviewer injection template excepted.
- Pruning a skill's guide list is a conditional follow-up that runs only if delivered protocol text is still a top-three cost after de-duplication; it removes only protocols that no mode of the skill uses, each with a recorded reason.

`[Source: rule/skills/protocol-carrier-parity]`

### BR-PDL-15: Every host load path is registered [HARD]

- **Primary host:** delivery steps for each group on the skill-use event, the skill-file read (with the skill file condition), the typed-command expansion and agent start (BR-PDL-08). The typed command and the assistant's own skill choice are separate triggers, so both are registered.
- **Second host:** the prompt event (the host has no typed-command expansion, so that trigger is remapped to the prompt), the shell-read event (BR-PDL-06) and agent start; the skill-use and file-read steps are not mirrored because the host has neither tool, and each skip is recorded with its reason. Every added row and every skip is pinned by the host-surface check, and a new or changed step needs the user's handler review.
- **Third host:** the skill tool and the file read, through the bridge; agent start and typed-command expansion are reported as not available on that host. The third host's prompt event is not a protocol load path.
- Every delivery step is a bare command with no arguments, so every host's generated start command resolves to an existing file.

`[Source: rule/scripts/protocol-host-registration]`

---

## 5. Domain Model

### Relationships (overview)

```
CanonicalProtocolSource 1──N Protocol
ProtocolGroup           1──N Protocol           (each protocol in exactly one group)
Protocol                1──1 PublishedProtocol  (one or more parts)
Skill                   1──N GuideEntry         (converted skills only)
GuideEntry              N──1 Protocol
Skill                   1──N ReferenceCarrier
Agent                   N──N Skill              (preloads)
Scope                   1──N DeliveryRecord     (one per protocol delivered)
LoadPath                1──N DeliveryMessage    (at most one per group per load)
SecondHostInlineList    1──N Protocol           (decided: none)
```

### Entity: Protocol

| Property     | Type                   | Required | Constraints                                                                                 | Business Meaning                         |
| ------------ | ---------------------- | -------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Name         | text                   | Yes      | Unique; listed in the protocol index                                                        | How skills and guide entries refer to it |
| Group        | enum ProtocolGroupName | Yes      | Exactly one                                                                                 | Which delivery message carries it        |
| Root-carried | yes-no                 | Yes      | Yes only for the four universal protocols                                                   | Whether the root file already carries it |
| Size         | number                 | Yes      | Target at most 9,000 characters after compression, the reviewer injection template excepted | What it costs to deliver                 |

### Entity: PublishedProtocol

| Property | Type         | Required | Constraints                                                | Business Meaning                      |
| -------- | ------------ | -------- | ---------------------------------------------------------- | ------------------------------------- |
| Summary  | text         | Yes      | One line                                                   | Shown in guide entries                |
| When     | text         | Yes      | One line                                                   | When the protocol applies             |
| Parts    | list of text | Yes      | Each at most 9,500 characters, split at section boundaries | What delivery sends                   |
| Path     | text         | Yes      | Inside the configured published-text folder                | Where the read-by-path fallback reads |

### Entity: GuideEntry

| Property      | Type | Required | Constraints                              | Business Meaning                                  |
| ------------- | ---- | -------- | ---------------------------------------- | ------------------------------------------------- |
| Protocol name | text | Yes      | Must be in the protocol index to deliver | The protocol the skill follows                    |
| Summary       | text | Yes      | One line                                 | Why it matters                                    |
| When          | text | Yes      | One line                                 | When it applies                                   |
| Path          | text | Yes      | The published path                       | Fallback reading location; never read by delivery |

### Entity: Skill

| Property         | Type                   | Required | Constraints                                               | Business Meaning                             |
| ---------------- | ---------------------- | -------- | --------------------------------------------------------- | -------------------------------------------- |
| Name             | text                   | Yes      | Lowercase letters, digits, hyphens                        | How hosts and agents refer to it             |
| Delivery mode    | enum SkillDeliveryMode | Yes      | Inline for the five review-family skills                  | Whether it keeps bodies or receives delivery |
| Guide block      | list of GuideEntry     | No       | Only on converted skills; union over modes and references | What delivery reads                          |
| Reminder digests | list                   | Yes      | Kept in every mode                                        | Recency recap                                |

### Entity: ReferenceCarrier

| Property        | Type | Required | Constraints      | Business Meaning      |
| --------------- | ---- | -------- | ---------------- | --------------------- |
| Owning skill    | text | Yes      | Existing skill   | Where it is read from |
| Protocol bodies | list | No       | Always full text | Read at point of use  |

### Entity: Agent

| Property           | Type         | Required | Constraints                                                     | Business Meaning                     |
| ------------------ | ------------ | -------- | --------------------------------------------------------------- | ------------------------------------ |
| Type               | text         | Yes      | Lowercase letters, digits, hyphens; built-ins named by the host | Which agent-start filter applies     |
| Preloaded skills   | list of text | No       | Named in the agent definition                                   | Whose protocols it receives at start |
| Receives root file | yes-no       | Yes      | No for Explore and Plan on the primary host                     | Whether it needs the universal group |
| Protocol bodies    | list         | Yes      | Always full text                                                | Agents are never converted           |

### Entity: DeliveryMessage

| Property    | Type                   | Required | Constraints                                   | Business Meaning              |
| ----------- | ---------------------- | -------- | --------------------------------------------- | ----------------------------- |
| Group       | enum ProtocolGroupName | Yes      | One per message                               | Which group it carries        |
| Full texts  | list                   | Yes      | Only protocols not yet delivered in the scope | What the assistant reads      |
| Named paths | list                   | No       | Protocols that did not fit                    | What the assistant reads next |
| Length      | number                 | Yes      | At most 9,500 characters                      | Fits every host               |

### Entity: DeliveryRecord

| Property         | Type   | Required | Constraints                            | Business Meaning                       |
| ---------------- | ------ | -------- | -------------------------------------- | -------------------------------------- |
| Scope            | text   | Yes      | Main session or one sub-agent          | Who received it                        |
| Protocol         | text   | Yes      | One record per protocol                | What was delivered                     |
| Text fingerprint | text   | Yes      | Of the published text                  | A changed text counts as not delivered |
| Counts           | yes-no | Yes      | No after compaction or re-arm distance | Whether the next load repeats it       |

### Enum: SkillDeliveryMode

| Value      | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| Inline     | Keeps every full body; receives nothing from delivery; never converted |
| Converted  | Guide entries replace bodies; receives the text by delivery            |
| Undeclared | Not converted yet; keeps full bodies; receives nothing                 |

### Enum: ProtocolGroupName

| Value          | Meaning                                   |
| -------------- | ----------------------------------------- |
| review         | Review rules and reviewer protocols       |
| evidence-trace | Evidence, tracing and investigation rules |
| workflow-task  | Workflow, task and session rules          |
| spec-test      | Spec, test-case and test-execution rules  |
| design         | Interface design rules                    |
| universal      | The four root-carried protocols           |

### Enum: LoadPath

| Value                      | Hosts                                               |
| -------------------------- | --------------------------------------------------- |
| Typed command              | Primary (second host: remapped to the prompt event) |
| Assistant-chosen skill     | Primary, third (skill tool)                         |
| Skill file read            | Primary, third                                      |
| Prompt naming a skill      | Second                                              |
| Shell read of a skill file | Second                                              |
| Agent start                | Primary, second                                     |

### Domain Events (business occurrences)

| Occurrence                | When it happens                                | Who/what reacts (business outcome)                                     |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Skill loaded              | A skill reaches the assistant on any load path | Undelivered declared protocols are delivered per group                 |
| Agent started             | A listed agent type starts                     | Its preloaded skills' protocols, or the universal group, are delivered |
| Conversation compacted    | The host summarizes the conversation           | Every delivery record stops counting                                   |
| Canonical protocol edited | A maintainer edits a protocol                  | Published text must be rebuilt; carriers are propagated                |
| Group converted           | A maintainer converts a protocol group         | Bodies become guide entries; compliance is compared before and after   |

---

## 6. Process Flows

> No screen exists: the interaction surface is the text the assistant receives, the generated host files, command output and check messages. Backend-only capability; the view inventory is skipped for that reason.

### Flow: Deliver protocols for a skill load

| Step | Actor             | Action                         | System Response                                                                                           | Next     |
| ---- | ----------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------- | -------- |
| 1    | Assistant or user | Loads a skill on a load path   | Each group's delivery step checks relevance first; a non-matching event ends with no output (BR-PDL-09)   | 2 or end |
| 2    | System            | Resolves the skill or agent    | Names and folders checked (BR-PDL-10); unresolved → nothing, guides remain (BR-PDL-05)                    | 3        |
| 3    | System            | Reads the guide block          | Inline and undeclared skills yield nothing (BR-PDL-01, BR-PDL-11)                                         | 4        |
| 4    | System            | Filters to this group          | Root-carried dropped unless an exception applies (BR-PDL-04); unknown names dropped                       | 5        |
| 5    | System            | Checks delivery records        | Protocols already delivered in the scope dropped (BR-PDL-02); unusable store → deliver anyway (BR-PDL-05) | 6        |
| 6    | System            | Packs and delivers the message | At most 9,500 characters; overflow named by path (BR-PDL-03)                                              | end      |

### Flow: Agent start

| Step | Actor     | Action                   | System Response                                    | Next     |
| ---- | --------- | ------------------------ | -------------------------------------------------- | -------- |
| 1    | Assistant | Starts an agent          | Filter matches only listed agent types (BR-PDL-08) | 2 or end |
| 2    | System    | Agent preloads skills    | Delivers those converted skills' protocols         | end      |
| 3    | System    | Agent is Explore or Plan | Delivers the universal group only                  | end      |

### Flow: Convert a protocol group

| Step | Actor                | Action                                          | System Response                                                                                                  | Next |
| ---- | -------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| 1    | Framework maintainer | Runs guide conversion for the group's protocols | Main skill files outside the inline list change; agents, inline skills and reference files unchanged (BR-PDL-14) | 2    |
| 2    | Framework maintainer | Rebuilds published text and runs checks         | Fresh; every guide path exists; checks accept guides (BR-PDL-13, BR-PDL-14)                                      | 3    |
| 3    | Framework maintainer | Runs the same review before and after           | No compliance check regresses, or the next group is held (BR-PDL-05)                                             | end  |

### Flow: Miss and fallback

| Step | Actor     | Action                                                 | System Response                                       | Next |
| ---- | --------- | ------------------------------------------------------ | ----------------------------------------------------- | ---- |
| 1    | Host      | Has no delivery, or has an unreviewed second-host step | Nothing delivered                                     | 2    |
| 2    | Assistant | Reads the guide entries                                | Reads each protocol by its published path (BR-PDL-05) | end  |

---

## 7. Permissions & Roles

### Role-Permission Matrix

| Role                 | View | Create | Edit | Delete | Scope                                                                             |
| -------------------- | :--: | :----: | :--: | :----: | --------------------------------------------------------------------------------- |
| Framework maintainer | yes  |  yes   | yes  |  yes   | Canonical protocols, group data, inline list, conversion, second-host inline list |
| Project maintainer   | yes  |   no   | yes  |   no   | The universal guides requirement for the project                                  |
| Developer            | yes  |   no   | yes  |   no   | Reviews and approves new second-host delivery steps on their machine              |
| AI assistant         | yes  |   no   |  no  |   no   | Reads delivered text and guide entries; reads by path on a miss                   |
| Assistant host       |  no  |   no   |  no  |   no   | Runs the registered delivery steps; runs a second-host step only after review     |

---

## 8. Test Specifications

> Business-readable acceptance scenarios. The "user" of this capability is a framework maintainer, a project maintainer, a developer or the AI assistant; the observable surface is the text the assistant receives, the generated host files, command output and check messages (no screen exists, so the UI dimension is stated as not applicable).

> Numbering note: the IDs were pre-allocated by the release plan so implementation phases could reference them in parallel; categories below group them by behavior rather than by decade. TC-PDL-071…079 are unallocated.

> Size note: this spec holds more than forty cases. It stays one document because every case guards one capability — how shared protocol text reaches the assistant — and the pre-allocated IDs are referenced by the implementation plan; a split into a continuation part is a follow-up for the spec owner.

> Conditional cases: TC-PDL-050…052 run only if the pruning follow-up's trigger fires; otherwise they stay `Untested` with the reason "pruning follow-up not triggered".

> Status note: `Implemented` = the executing test exists; each line says whether it passed while the capability was built or was written but never executed. None has run in the release-close full test run yet; each becomes `Tested` after that run passes. `Planned — deferred` = a manual or close-time check that has not run; `Planned — deferred to after commit` = a live run that waits for the committed tree.

### Test Summary

| Priority  | Count  | Automated | Manual |
| --------- | ------ | --------- | ------ |
| P0        | 14     | 13        | 1      |
| P1        | 54     | 52        | 2      |
| P2        | 7      | 6         | 1      |
| **Total** | **75** | **71**    | **4**  |

| Category                       | TCs                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published Protocol Text Tests  | TC-PDL-001, TC-PDL-002, TC-PDL-003, TC-PDL-004, TC-PDL-005, TC-PDL-006, TC-PDL-007, TC-PDL-008, TC-PDL-055, TC-PDL-080                                                             |
| Delivery Planning Tests        | TC-PDL-009, TC-PDL-010, TC-PDL-011, TC-PDL-012, TC-PDL-013, TC-PDL-016, TC-PDL-017, TC-PDL-018, TC-PDL-019, TC-PDL-056                                                             |
| Delivery Step Tests            | TC-PDL-014, TC-PDL-015, TC-PDL-020, TC-PDL-053, TC-PDL-054, TC-PDL-057, TC-PDL-067                                                                                                 |
| Host Registration Tests        | TC-PDL-021, TC-PDL-022, TC-PDL-026, TC-PDL-028, TC-PDL-058, TC-PDL-059, TC-PDL-060, TC-PDL-069, TC-PDL-070, TC-PDL-023, TC-PDL-024, TC-PDL-025, TC-PDL-027, TC-PDL-068, TC-PDL-042 |
| Guide Tooling and Policy Tests | TC-PDL-029, TC-PDL-030, TC-PDL-031, TC-PDL-034, TC-PDL-061, TC-PDL-081, TC-PDL-082                                                                                                 |
| Guide-Aware Check Tests        | TC-PDL-032, TC-PDL-033, TC-PDL-040, TC-PDL-065, TC-PDL-066, TC-PDL-083, TC-PDL-084                                                                                                 |
| Conversion Tests               | TC-PDL-035, TC-PDL-036, TC-PDL-037, TC-PDL-038, TC-PDL-039, TC-PDL-041, TC-PDL-063                                                                                                 |
| Mode Section Tests             | TC-PDL-043, TC-PDL-044, TC-PDL-045, TC-PDL-046, TC-PDL-064                                                                                                                         |
| Compression Tests              | TC-PDL-047, TC-PDL-048, TC-PDL-049, TC-PDL-062                                                                                                                                     |
| Conditional Pruning Tests      | TC-PDL-050, TC-PDL-051, TC-PDL-052                                                                                                                                                 |

### Planned Executors

| Executor                                                                                                        | TCs                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/scripts/tests/build-protocol-projection.test.cjs`                                                      | TC-PDL-001, TC-PDL-002, TC-PDL-003, TC-PDL-004, TC-PDL-005, TC-PDL-006, TC-PDL-007, TC-PDL-008, TC-PDL-047, TC-PDL-049, TC-PDL-055, TC-PDL-080 |
| `.claude/hooks/tests/suites/protocol-delivery.test.cjs`                                                         | TC-PDL-009, TC-PDL-010, TC-PDL-011, TC-PDL-012, TC-PDL-013, TC-PDL-016, TC-PDL-017, TC-PDL-018, TC-PDL-019, TC-PDL-038, TC-PDL-052, TC-PDL-056 |
| `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs`                                                      | TC-PDL-014, TC-PDL-015, TC-PDL-020, TC-PDL-053, TC-PDL-054, TC-PDL-057, TC-PDL-067                                                             |
| `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs`                                                     | TC-PDL-021, TC-PDL-022, TC-PDL-023, TC-PDL-024, TC-PDL-025, TC-PDL-027, TC-PDL-042, TC-PDL-058, TC-PDL-059, TC-PDL-060, TC-PDL-070             |
| `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only`                                       | TC-PDL-026                                                                                                                                     |
| `.claude/hooks/tests/suites/content-presence.test.cjs`                                                          | TC-PDL-028, TC-PDL-084                                                                                                                         |
| `.claude/scripts/tests/sync-update-blocks-guide.test.cjs`                                                       | TC-PDL-029, TC-PDL-030, TC-PDL-031, TC-PDL-061, TC-PDL-081                                                                                     |
| `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs`                                         | TC-PDL-032, TC-PDL-033, TC-PDL-065, TC-PDL-083                                                                                                 |
| `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs`                                                       | TC-PDL-034, TC-PDL-035, TC-PDL-036, TC-PDL-037, TC-PDL-039, TC-PDL-040, TC-PDL-050, TC-PDL-062, TC-PDL-065, TC-PDL-082                         |
| Manual-QC (live transcript or review evidence)                                                                  | TC-PDL-041, TC-PDL-048, TC-PDL-051, TC-PDL-063                                                                                                 |
| `.claude/hooks/tests/suites/review-mode-sections.test.cjs`                                                      | TC-PDL-043, TC-PDL-044, TC-PDL-045, TC-PDL-046, TC-PDL-064                                                                                     |
| `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,scripts-tests,review-validate-coverage` | TC-PDL-045                                                                                                                                     |
| `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,scripts-tests,wf-cycle`                 | TC-PDL-046                                                                                                                                     |
| `.claude/scripts/codex/tests/verify-sync-adoption-parity.test.mjs`                                              | TC-PDL-065                                                                                                                                     |
| `.claude/hooks/tests/suites/project-reference-gate-coverage.test.cjs`                                           | TC-PDL-065                                                                                                                                     |
| `.claude/hooks/tests/suites/protocol-text-parity.test.cjs`                                                      | TC-PDL-065                                                                                                                                     |
| `.claude/scripts/codex/tests/framework-policy-regressions.test.mjs`                                             | TC-PDL-065                                                                                                                                     |
| `.claude/scripts/codex/tests/review-policy-consumers.test.mjs`                                                  | TC-PDL-065                                                                                                                                     |
| `.claude/hooks/tests/suites/prompt-ledger.test.cjs`                                                             | TC-PDL-065                                                                                                                                     |
| `.claude/scripts/codex/tests/round3-prompt-contract.test.mjs`                                                   | TC-PDL-065                                                                                                                                     |
| `.claude/scripts/tests/experience-config.test.cjs`                                                              | TC-PDL-065                                                                                                                                     |
| `.claude/hooks/tests/suites/agent-universal-rules.test.cjs`                                                     | TC-PDL-065                                                                                                                                     |
| `.claude/scripts/tests/injectors-respect-guides.test.cjs`                                                       | TC-PDL-066                                                                                                                                     |
| `.claude/scripts/opencode/tests/sync-hooks.test.mjs`                                                            | TC-PDL-068                                                                                                                                     |
| `.claude/scripts/codex/tests/verify-sync-divergence.test.mjs`                                                   | TC-PDL-069                                                                                                                                     |

### Rule Coverage

| Rule      | Proven by                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| BR-PDL-01 | TC-PDL-019, TC-PDL-029, TC-PDL-030, TC-PDL-031, TC-PDL-032, TC-PDL-033, TC-PDL-034, TC-PDL-036, TC-PDL-040             |
| BR-PDL-02 | TC-PDL-009, TC-PDL-014, TC-PDL-015, TC-PDL-020, TC-PDL-041, TC-PDL-053                                                 |
| BR-PDL-03 | TC-PDL-002, TC-PDL-016, TC-PDL-047                                                                                     |
| BR-PDL-04 | TC-PDL-017, TC-PDL-018, TC-PDL-035, TC-PDL-036, TC-PDL-037, TC-PDL-038, TC-PDL-080                                     |
| BR-PDL-05 | TC-PDL-016, TC-PDL-054, TC-PDL-063                                                                                     |
| BR-PDL-06 | TC-PDL-013, TC-PDL-022, TC-PDL-024, TC-PDL-025, TC-PDL-042                                                             |
| BR-PDL-07 | TC-PDL-043, TC-PDL-044, TC-PDL-045, TC-PDL-046, TC-PDL-064                                                             |
| BR-PDL-08 | TC-PDL-011, TC-PDL-012, TC-PDL-060                                                                                     |
| BR-PDL-09 | TC-PDL-057, TC-PDL-058, TC-PDL-067, TC-PDL-068, TC-PDL-070                                                             |
| BR-PDL-10 | TC-PDL-027, TC-PDL-056                                                                                                 |
| BR-PDL-11 | TC-PDL-018, TC-PDL-039, TC-PDL-041, TC-PDL-064, TC-PDL-080, TC-PDL-081, TC-PDL-083                                     |
| BR-PDL-12 | TC-PDL-039, TC-PDL-081                                                                                                 |
| BR-PDL-13 | TC-PDL-001, TC-PDL-003, TC-PDL-004, TC-PDL-005, TC-PDL-006, TC-PDL-007, TC-PDL-008, TC-PDL-049, TC-PDL-055             |
| BR-PDL-14 | TC-PDL-048, TC-PDL-050, TC-PDL-051, TC-PDL-052, TC-PDL-061, TC-PDL-062, TC-PDL-065, TC-PDL-066, TC-PDL-082, TC-PDL-084 |
| BR-PDL-15 | TC-PDL-010, TC-PDL-013, TC-PDL-021, TC-PDL-022, TC-PDL-023, TC-PDL-026, TC-PDL-027, TC-PDL-028, TC-PDL-059, TC-PDL-069 |

### Published Protocol Text Tests

> Building the published text and keeping it fresh (US-PDL-09).

#### TC-PDL-001: Each protocol in use gets one published file [P1]

**Objective:** Prove the build publishes exactly one file for every protocol that some skill or agent uses.

**Business Intent / Invariant Guarded:** Every guide entry must point at text that exists; a missing published file turns a delivery miss into silence (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture canonical source with protocols in use and group data for each

**Real-World Reachability:** A maintainer rebuilds the published text after any protocol edit.

**Demo Flow:** Build the published text and list the output folder.

```gherkin
Given the canonical protocol source and the group data
When the published text is built
Then each protocol in use has exactly one published file
And the index lists each of them once
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Writes one file per protocol and the index                                                                                                                            |
| **Business data state** | Published text matches the canonical protocols one to one                                                                                                             |
| **Data shown on UI**    | The list of published files                                                                                                                                           |

**Acceptance Criteria:**

- ✅ One file per protocol in use
- ❌ A protocol in use with no file
- ❌ Two files for one protocol

**Test Data:**

```yaml
inputDomain: 'any set of protocols in use'
invariant: 'for ALL protocols in use exactly one published file exists'
boundaryCounterCase: 'a protocol referenced by a skill but absent from the canonical source → the build fails naming it'
```

**Edge Cases:**

- A protocol no skill uses → not required to be published

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/build-protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection` · `test/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-001` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:167` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-002: A protocol longer than the bin is published in parts within the bin [P1]

**Objective:** Prove a long protocol is split at section boundaries into parts that each fit one delivery message.

**Business Intent / Invariant Guarded:** No delivery message may exceed the bin, and a split must not cut a rule in half (BR-PDL-03).

**Traces:** AC-PDL-01 / BR-PDL-03

**Preconditions:**

- A fixture protocol longer than 9,500 characters with several sections

**Real-World Reachability:** The reviewer injection template and other large protocols exceed the bin before compression.

**Demo Flow:** Build and read the index row and the parts of the long protocol.

```gherkin
Given a protocol longer than 9,500 characters
When the published text is built
Then it is published in parts
And every part is at most 9,500 characters and starts at a section boundary
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Splits the protocol                                                                                                                                                   |
| **Business data state** | The parts together equal the protocol text                                                                                                                            |
| **Data shown on UI**    | The index row lists every part                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Every part at most 9,500 characters
- ✅ Every part after the first at most 9,500 characters with its "continued" line
- ✅ Parts joined equal the original
- ❌ A part over 9,500 characters
- ❌ A split inside a section

**Test Data:**

```yaml
inputDomain: 'any protocol length from 1 to 60,000 characters'
invariant: 'for ALL lengths every part is at most 9,500 characters and the parts rejoin to the original'
boundaryCounterCase: 'a single section longer than 9,500 characters → the build fails naming the protocol and section'
```

**Edge Cases:**

- A protocol of exactly 9,500 characters → one part

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection` · `rule/hooks/protocol-pack`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-002` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:186` (also `:220`, `:240`; passed in P22; not re-run at the final gate)

---

#### TC-PDL-003: A protocol with no group fails the build by name [P1]

**Objective:** Prove the build refuses to publish a protocol that belongs to no group.

**Business Intent / Invariant Guarded:** A protocol with no group would never be delivered, so every protocol in use must belong to one group (BR-PDL-13, BR-PDL-03).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture protocol in use that the group data does not list

**Real-World Reachability:** A maintainer adds a new protocol and forgets its group.

**Demo Flow:** Build and read the error.

```gherkin
Given a protocol in use that belongs to no group
When the published text is built
Then the build fails
And the message names the protocol
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Rejects the build                                                                                                                                                     |
| **Business data state** | No published text changes                                                                                                                                             |
| **Data shown on UI**    | An error naming the protocol                                                                                                                                          |

**Acceptance Criteria:**

- ✅ The build fails naming the protocol
- ❌ The protocol is published without a group
- ❌ The build passes silently

**Test Data:**

```yaml
inputDomain: 'any protocol in use'
invariant: 'for ALL protocols in use a group exists or the build fails'
boundaryCounterCase: 'the same protocol with a group added → the build passes'
```

**Edge Cases:**

- A group listing a protocol that does not exist → the build fails naming it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-003` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:220` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-004: Two builds of the same input are byte-identical [P2]

**Objective:** Prove the published text is deterministic.

**Business Intent / Invariant Guarded:** A freshness check can only work if an unchanged input gives unchanged output (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture canonical source and group data

**Real-World Reachability:** Every sync and every developer machine rebuilds the same text.

**Demo Flow:** Build twice and compare the outputs.

```gherkin
Given the same canonical source and group data
When the published text is built twice
Then the two outputs are byte-identical
And every file uses one line-ending style
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Produces identical output                                                                                                                                             |
| **Business data state** | No difference between runs                                                                                                                                            |
| **Data shown on UI**    | An empty comparison                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Identical bytes
- ❌ Any difference, including line endings or ordering

**Test Data:**

```yaml
inputDomain: 'any input built on any supported operating system'
invariant: 'for ALL inputs two builds are byte-identical'
boundaryCounterCase: 'a canonical edit between builds → outputs differ'
```

**Edge Cases:**

- A build on a system with a different default line ending → still identical

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-004` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:253` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-005: An edited protocol without a rebuild fails the freshness check [P1]

**Objective:** Prove the freshness check detects published text that no longer matches the canonical source.

**Business Intent / Invariant Guarded:** Stale published text would deliver an old rule while every other check passes (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture with fresh published text
- A canonical protocol edited afterwards

**Real-World Reachability:** A maintainer edits a protocol and forgets to rebuild.

**Demo Flow:** Run the freshness check after the edit.

```gherkin
Given published text built before a canonical protocol was edited
When the freshness check runs
Then it fails
And it names the stale protocol
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Reports stale text                                                                                                                                                    |
| **Business data state** | Nothing is rewritten by the check                                                                                                                                     |
| **Data shown on UI**    | A failure naming the protocol                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Fails on stale text
- ✅ Passes after a rebuild
- ❌ Passes on stale text
- ❌ Rewrites files while checking

**Test Data:**

```yaml
inputDomain: 'any single canonical edit'
invariant: 'for ALL canonical edits without a rebuild the check fails'
boundaryCounterCase: 'the same edit followed by a rebuild → the check passes'
```

**Edge Cases:**

- A whitespace-only edit that changes the output → still stale

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-005` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:268` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-006: Every index row carries group, summary, when, size and parts [P1]

**Objective:** Prove the protocol index holds everything delivery and guide entries read.

**Business Intent / Invariant Guarded:** Delivery reads group and parts from the index, and guide entries read summary and when; a missing field breaks one of them (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture build

**Real-World Reachability:** Every delivery and every conversion reads the index.

**Demo Flow:** Read the index rows.

```gherkin
Given a built index
When each row is read
Then it has the protocol name, group, summary, when, size and parts
And the size equals the published text length
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Publishes a complete index                                                                                                                                            |
| **Business data state** | Every row complete                                                                                                                                                    |
| **Data shown on UI**    | The index rows                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Every field present
- ❌ A row missing any field
- ❌ A size that differs from the text

**Test Data:**

```yaml
inputDomain: 'any built index'
invariant: 'for ALL rows every field is present and the size matches the text'
boundaryCounterCase: 'a row with an empty summary → the build fails'
```

**Edge Cases:**

- A protocol in several parts → parts listed in order

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: schema/scripts/protocol-index]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-006` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:305` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-007: A relocated root moves the published paths with it [P2]

**Objective:** Prove published paths follow the project configuration rather than a fixed folder.

**Business Intent / Invariant Guarded:** The framework is copied into other projects; a fixed path would point guide entries at nothing in a relocated project (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A temporary fixture project that relocates a configured root

**Real-World Reachability:** An adopting project keeps its folders in a different place.

**Demo Flow:** Build in the fixture project and read the paths.

```gherkin
Given a fixture project with a relocated root
When the published text is built
Then the paths in the index follow the configuration
And no path names the default location
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Resolves paths from configuration                                                                                                                                     |
| **Business data state** | Paths match the project layout                                                                                                                                        |
| **Data shown on UI**    | The index paths                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Paths follow configuration
- ❌ A path fixed to the default location

**Test Data:**

```yaml
inputDomain: 'any configured root location'
invariant: 'for ALL configured roots the published paths resolve under them'
boundaryCounterCase: 'no configuration → paths resolve to the documented defaults'
```

**Edge Cases:**

- A configured root with a trailing separator → same paths

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-007` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:329` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-008: The published text names no consuming project and no absolute path [P1]

**Objective:** Prove the published text is portable.

**Business Intent / Invariant Guarded:** Published text ships with the framework into every project; a project name or machine path would leak one project into all (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- A fixture build

**Real-World Reachability:** Every adopting project receives the published text.

**Demo Flow:** Scan the published text for project names and absolute paths.

```gherkin
Given the published text
When it is scanned for project names and absolute paths
Then none is found
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Passes the portability scan                                                                                                                                           |
| **Business data state** | No leak                                                                                                                                                               |
| **Data shown on UI**    | An empty scan result                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ No project names or absolute paths
- ❌ Any absolute path or consuming-project name

**Test Data:**

```yaml
inputDomain: 'any published file'
invariant: 'for ALL published files no project name or absolute path appears'
boundaryCounterCase: 'a fixture protocol that contains an absolute path → the scan fails naming the file'
```

**Edge Cases:**

- A relative path inside a protocol → allowed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: constraint/scripts/protocol-projection-portability]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-008` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:353` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-055: The framework sync verification fails when the published text is stale [P1]

**Objective:** Prove the real published text is checked for freshness on every sync verification in the framework repository.

**Business Intent / Invariant Guarded:** Stale text must not pass the sync with every other gate green (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- The framework repository with its committed published text

**Real-World Reachability:** A maintainer runs the sync verification before a commit.

**Demo Flow:** Run the read-only sync verification limited to the scripts tests.

```gherkin
Given the framework repository
When the read-only sync verification runs its scripts tests
Then the freshness check runs over the real tree
And it passes only when the committed published text matches a fresh build
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Runs the freshness check in the existing read-only stage                                                                                                              |
| **Business data state** | No file changes                                                                                                                                                       |
| **Data shown on UI**    | Pass, or a failure naming the stale protocol                                                                                                                          |

**Acceptance Criteria:**

- ✅ Runs in the framework repository
- ❌ Passes on stale text
- ❌ Reports a pass outside the framework repository instead of skipped

**Test Data:**

```yaml
inputDomain: 'any committed state of the published text'
invariant: 'for ALL states the verification passes only when the text is fresh'
boundaryCounterCase: 'a project that is not the framework repository → the case reports skipped'
```

**Edge Cases:**

- An adopting project → skipped with its reason, never a pass

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection` · `operation/scripts/run-codex-sync`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-055` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:478` (passed in P22; not re-run at the final gate)

---

#### TC-PDL-080: The universal group holds exactly the four root-carried protocols and the inline list names real skills [P0]

**Objective:** Prove the group data pins the universal group and the inline skill list.

**Business Intent / Invariant Guarded:** A wrong universal group repeats or loses a root rule; a wrong inline name converts a review skill or keeps a ghost (BR-PDL-04, BR-PDL-11).

**Traces:** AC-PDL-07, AC-PDL-09 / BR-PDL-04, BR-PDL-11

**Preconditions:**

- A fixture group data file and skill folders

**Real-World Reachability:** A maintainer edits the group data.

**Demo Flow:** Build and read the universal group and the inline list, then build with a bad inline name.

```gherkin
Given the group data
When the published text is built
Then the universal group holds exactly the four root-carried protocols
And the inline list names existing skills only
And an inline name that is malformed or has no skill folder fails the build by name
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Validates the group data                                                                                                                                              |
| **Business data state** | Universal group and inline list as decided                                                                                                                            |
| **Data shown on UI**    | An error naming a bad inline entry                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Exactly four universal protocols
- ✅ Only existing, well-formed inline names
- ❌ A fifth protocol in the universal group
- ❌ An inline name with no skill folder accepted

**Test Data:**

```yaml
inputDomain: 'any group data'
invariant: 'for ALL group data the universal group is exactly the four and every inline name is a valid existing skill'
boundaryCounterCase: 'an inline name with an upper-case letter → the build fails naming it'
```

**Edge Cases:**

- An empty inline list → accepted

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/inline-skills]`
> **Related Behaviors:** `rule/hooks/protocol-root-carried` · `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-080` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:380` (passed in P22; not re-run at the final gate)

---

### Delivery Planning Tests

> What one group delivers for one load, and which inputs are trusted (US-PDL-01, US-PDL-04, US-PDL-07).

#### TC-PDL-009: A converted skill that uses the skill tool receives its review protocols [P1]

**Objective:** Prove an assistant-chosen skill load delivers the full text of the protocols it declares in a group.

**Business Intent / Invariant Guarded:** A converted skill has only guide entries, so delivery is what gives the assistant the full rules (BR-PDL-02).

**Traces:** AC-PDL-01 / BR-PDL-02

**Preconditions:**

- A fixture converted skill declaring two review protocols
- No delivery recorded yet

**Real-World Reachability:** The assistant picks a skill by itself during a task.

**Demo Flow:** Load the skill through the skill tool and read the review group message.

```gherkin
Given a converted skill that declares two review protocols
When the assistant loads it by its own choice
Then the review group message holds both full texts
And it is at most 9,500 characters
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers the review group                                                                                                                                             |
| **Business data state** | Both protocols recorded as delivered in this scope                                                                                                                    |
| **Data shown on UI**    | The review message text                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Both full texts delivered
- ❌ A guide line instead of text
- ❌ A protocol from another group in this message

**Test Data:**

```yaml
inputDomain: 'any converted skill declaring 1..n protocols of one group'
invariant: 'for ALL such skills the group message holds each declared protocol not yet delivered'
boundaryCounterCase: 'a skill that declares no protocols of this group → empty message'
```

**Edge Cases:**

- A declared protocol listed twice → delivered once

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/protocol-delivery]`
> **Related Behaviors:** `operation/hooks/protocol-delivery` · `test/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-009` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:253` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-010: A typed command and a second-host prompt naming a skill deliver the same protocols [P1]

**Objective:** Prove the typed-command path and the second-host prompt path resolve the same skill and deliver the same protocols.

**Business Intent / Invariant Guarded:** A typed command fires a different trigger from an assistant choice, and the second host has only the prompt; each must deliver (BR-PDL-15).

**Traces:** AC-PDL-12, AC-PDL-13 / BR-PDL-15

**Preconditions:**

- A fixture converted skill

**Real-World Reachability:** A user types the skill command, or names the skill in a second-host prompt.

**Demo Flow:** Plan delivery for a typed command, then for a second-host prompt naming the skill.

```gherkin
Given a converted skill
When the user types its command on the primary host
Or names it in a prompt on the second host
Then the same protocols are returned for each group
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Resolves the skill from each trigger                                                                                                                                  |
| **Business data state** | Same delivery on both paths                                                                                                                                           |
| **Data shown on UI**    | Identical group messages                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Same protocols on both paths
- ❌ Either path delivering nothing

**Test Data:**

```yaml
inputDomain: 'any prompt that names one or more skills'
invariant: 'for ALL named converted skills their protocols are returned'
boundaryCounterCase: 'a prompt with no skill named → nothing'
```

**Edge Cases:**

- A prompt naming two skills → the union, each protocol once

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/protocol-delivery]`
> **Related Behaviors:** `rule/scripts/protocol-host-registration`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-010` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:272` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-011: An agent that preloads skills receives those skills' protocols at start [P1]

**Objective:** Prove agent-start delivery resolves the agent definition and its preloaded skills.

**Business Intent / Invariant Guarded:** An agent that preloads converted skills sees only guide entries unless delivery runs at its start (BR-PDL-08).

**Traces:** AC-PDL-12 / BR-PDL-08

**Preconditions:**

- A fixture agent definition whose name matches its type and that preloads a converted skill

**Real-World Reachability:** The assistant starts a specialist agent that preloads skills.

**Demo Flow:** Plan delivery for the agent start.

```gherkin
Given an agent type whose definition preloads a converted skill
When the agent starts
Then that skill's protocols are returned
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers the preloaded skills' protocols                                                                                                                              |
| **Business data state** | Recorded for the agent scope                                                                                                                                          |
| **Data shown on UI**    | The group messages                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Preloaded skills' protocols delivered
- ❌ An agent file whose name differs from its type being trusted

**Test Data:**

```yaml
inputDomain: 'any agent preloading 0..n skills'
invariant: 'for ALL such agents the protocols of their converted skills are returned'
boundaryCounterCase: 'an agent file whose declared name differs from the agent type → nothing'
```

**Edge Cases:**

- An agent that preloads an inline skill and a converted skill → only the converted skill's protocols

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-agent-start]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-011` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:299` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-012: An Explore agent receives only the universal group [P1]

**Objective:** Prove a root-skipping agent type receives the four root-carried protocols and nothing else.

**Business Intent / Invariant Guarded:** Explore and Plan start without the root file, so the universal group is their only source of the root rules (BR-PDL-08, BR-PDL-04).

**Traces:** AC-PDL-11 / BR-PDL-08

**Preconditions:**

- A fixture with the universal group published

**Real-World Reachability:** The assistant starts a built-in Explore agent.

**Demo Flow:** Plan delivery for an Explore agent start.

```gherkin
Given the built-in Explore agent type
When it starts
Then only the universal group is returned
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers the universal group                                                                                                                                          |
| **Business data state** | Recorded for the agent scope                                                                                                                                          |
| **Data shown on UI**    | The universal message                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ Universal group only
- ❌ Any other group
- ❌ Nothing at all

**Test Data:**

```yaml
inputDomain: 'any root-skipping agent type'
invariant: 'for ALL root-skipping types only the universal group is returned'
boundaryCounterCase: 'a custom agent type with no preloaded skills → nothing'
```

**Edge Cases:**

- Plan → the same as Explore

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-agent-start]`
> **Related Behaviors:** `rule/hooks/protocol-root-carried`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-012` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:319` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-013: Reading a skill file, or a second-host shell read of one, delivers its protocols [P1]

**Objective:** Prove the file-read path and the second-host shell-read path resolve the skill and deliver.

**Business Intent / Invariant Guarded:** The second host loads skills through the shell when the prompt names none, so that path must deliver (BR-PDL-06, BR-PDL-15).

**Traces:** AC-PDL-12, AC-PDL-13 / BR-PDL-06, BR-PDL-15

**Preconditions:**

- A fixture converted skill and its second-host copy

**Real-World Reachability:** The assistant reads a skill file, or the second host reads one through its shell.

**Demo Flow:** Plan delivery for a file read, then for shell commands that read the skill file with either path separator.

```gherkin
Given a converted skill
When its skill file is read
Or a second-host shell command reads its copy, in any shell and with either path separator
Then its protocols are returned
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Resolves the skill from the path                                                                                                                                      |
| **Business data state** | Delivered once per scope                                                                                                                                              |
| **Data shown on UI**    | The group messages                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Delivered on both paths
- ❌ A shell command that reads the file with a different command word missed

**Test Data:**

```yaml
inputDomain: 'any command text containing a skill file path'
invariant: 'for ALL such commands the skill resolves and its protocols are returned'
boundaryCounterCase: 'a command that mentions no skill file → nothing'
```

**Edge Cases:**

- A command that lists a skill folder without reading its file → nothing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/hooks/protocol-delivery]`
> **Related Behaviors:** `rule/scripts/codex-protocol-mapping`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-013` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:339` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-016: Every packed message fits the bin and loses no protocol [P0]

**Objective:** Prove packing keeps every message within 9,500 characters and names every protocol that does not fit.

**Business Intent / Invariant Guarded:** An oversize message is cut by the host and a dropped protocol is silent; both break the never-silent promise (BR-PDL-03, BR-PDL-05).

**Traces:** AC-PDL-01, AC-PDL-03 / BR-PDL-03, BR-PDL-05

**Preconditions:**

- Generated sets of 1 to 40 protocols of 200 to 9,500 characters, fixed seed

**Real-World Reachability:** A skill that follows many protocols of one group loads.

**Demo Flow:** Pack every generated set and inspect each message.

```gherkin
Given sets of 1 to 40 protocols of mixed sizes
When each set is packed
Then every message is at most 9,500 characters
And each protocol appears exactly once, as full text or as a named path
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Packs and names overflow                                                                                                                                              |
| **Business data state** | No protocol lost or doubled                                                                                                                                           |
| **Data shown on UI**    | The messages                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Every message within the bin
- ✅ Every protocol present once
- ❌ A message over 9,500 characters
- ❌ A protocol missing or repeated

**Test Data:**

```yaml
inputDomain: 'any 1..40 protocols of 200..9,500 characters'
invariant: 'for ALL sets every message is at most 9,500, each protocol appears exactly once, and a closing index-path count appears only when naming every protocol with nothing in full would exceed the bin'
boundaryCounterCase: 'a set whose named paths alone would exceed the bin → still within the bin, with the rest named by group path'
```

**Edge Cases:**

- One protocol of exactly 9,500 characters → one full message
- One 9,000-character protocol plus ten 300-character protocols → every protocol in full or named by its path; no anonymous count

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-pack]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-016` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:390` (property asserted in `assertEachOnce`, `.claude/hooks/tests/suites/protocol-delivery.test.cjs:239`; counter-case `:416`) — targeted suite passed 2026-09-25

---

#### TC-PDL-017: A root-carried protocol is not delivered when the project relies on the root file [P1]

**Objective:** Prove the default project does not receive the four root-carried protocols by delivery.

**Business Intent / Invariant Guarded:** The root file already carries them; delivering them again doubles their cost (BR-PDL-04).

**Traces:** AC-PDL-09 / BR-PDL-04

**Preconditions:**

- A fixture project with the universal guides requirement on
- A converted skill

**Real-World Reachability:** The default configuration of every adopting project.

**Demo Flow:** Load the skill and read the universal group message.

```gherkin
Given the universal guides requirement is on
When a converted skill loads
Then no root-carried protocol is returned
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Drops root-carried protocols                                                                                                                                          |
| **Business data state** | Nothing recorded for them                                                                                                                                             |
| **Data shown on UI**    | No universal message                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ No root-carried delivery
- ❌ Any root-carried protocol delivered

**Test Data:**

```yaml
inputDomain: 'any converted skill'
invariant: 'for ALL converted skills no root-carried protocol is returned while the requirement is on'
boundaryCounterCase: 'the requirement switched off → the universal group is returned'
```

**Edge Cases:**

- A skill that lists a root-carried protocol in its guide block by mistake → still not delivered

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-root-carried]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-017` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:421` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-018: A project without the universal requirement gets the universal group; an inline skill gets nothing [P0]

**Objective:** Prove the universal exception applies to converted skills and never to inline skills.

**Business Intent / Invariant Guarded:** Projects that do not rely on the root file still need the four rules; inline skills already carry them, so a delivery would duplicate (BR-PDL-04, BR-PDL-11).

**Traces:** AC-PDL-07, AC-PDL-10 / BR-PDL-04, BR-PDL-11

**Preconditions:**

- A fixture project with the universal guides requirement off
- A converted skill and an inline skill

**Real-World Reachability:** A project switches the requirement off; a review skill loads in it.

**Demo Flow:** Load each skill and read the messages.

```gherkin
Given the universal guides requirement is off
When a converted skill loads
Then the universal group is returned
When an inline skill loads
Then nothing is returned from any group
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Applies the exception to converted skills only                                                                                                                        |
| **Business data state** | Inline skill has no delivery record                                                                                                                                   |
| **Data shown on UI**    | Universal message for the converted skill only                                                                                                                        |

**Acceptance Criteria:**

- ✅ Universal group for the converted skill
- ✅ Nothing for the inline skill
- ❌ Any group for an inline skill

**Test Data:**

```yaml
inputDomain: 'any skill under either requirement value'
invariant: 'for ALL inline skills nothing is returned from any group'
boundaryCounterCase: 'the same inline name removed from the inline list → treated by its guide block'
```

**Edge Cases:**

- The inline list is read from the group data, never assumed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/inline-skills]`
> **Related Behaviors:** `rule/hooks/protocol-root-carried` · `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-018` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:437` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-019: A skill that declares no guide block receives nothing [P1]

**Objective:** Prove delivery is inert for a skill that has not been converted.

**Business Intent / Invariant Guarded:** During conversion, an unconverted skill still carries full bodies; delivering to it would double the text (BR-PDL-01).

**Traces:** AC-PDL-01 / BR-PDL-01

**Preconditions:**

- A fixture skill with full bodies and no guide block

**Real-World Reachability:** Any skill before its group is converted.

**Demo Flow:** Load the skill and read every group.

```gherkin
Given a skill with no guide block
When it loads
Then no group returns anything
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers nothing                                                                                                                                                      |
| **Business data state** | No record written                                                                                                                                                     |
| **Data shown on UI**    | No messages                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ Nothing delivered
- ❌ Any delivery

**Test Data:**

```yaml
inputDomain: 'any skill without a guide block'
invariant: 'for ALL such skills nothing is returned'
boundaryCounterCase: 'the same skill with a guide block → its protocols are returned'
```

**Edge Cases:**

- An empty guide block → nothing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-guide-entry]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-019` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:500` (passed in P23; not re-run at the final gate)

---

#### TC-PDL-056: Unsafe names, outside paths and unknown protocols open nothing and echo nothing [P0]

**Objective:** Prove delivery reads only framework folders and publishes only indexed protocol text.

**Business Intent / Invariant Guarded:** A crafted agent type, skill name or guide line must not read or repeat arbitrary files (BR-PDL-10).

**Traces:** AC-PDL-18 / BR-PDL-10

**Preconditions:**

- A fixture with a file reader that records every open

**Real-World Reachability:** A plugin-qualified skill name, a cloned skill under a temporary folder, or an edited guide line.

**Demo Flow:** Plan delivery for each hostile input and read the opened-file log and the output.

```gherkin
Given an agent type with a parent-folder step, skill names with a drive letter or a colon, a guide line naming an unknown protocol with a custom path, and a read of a skill file under a dependency folder
When delivery is planned for each
Then no file outside the skill and agent folders is opened
And the unknown protocol is dropped
And no guide-line path text appears in the output
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Refuses each input                                                                                                                                                    |
| **Business data state** | No record written                                                                                                                                                     |
| **Data shown on UI**    | Empty output for each                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ No outside file opened
- ✅ No path echoed
- ❌ Any outside open
- ❌ Guide path text in the output

**Test Data:**

```yaml
inputDomain: 'any name string and any file path'
invariant: 'for ALL names outside lowercase letters, digits and hyphens no file is opened'
boundaryCounterCase: 'a well-formed name inside the skill folder → resolves normally'
```

**Edge Cases:**

- A name starting with a hyphen → refused

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-input-trust]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-056` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:521` (passed in P23; not re-run at the final gate)

---

### Delivery Step Tests

> Once per scope, re-arm, parallel groups, unusable store and early exit (US-PDL-01, US-PDL-02, US-PDL-06).

#### TC-PDL-014: A protocol already delivered in the session is not repeated [P1]

**Objective:** Prove the second load of a skill in the same scope delivers nothing.

**Business Intent / Invariant Guarded:** Repeating a protocol on every load wastes what conversion saved (BR-PDL-02).

**Traces:** AC-PDL-02 / BR-PDL-02

**Preconditions:**

- A fixture project with a converted skill delivered once in the session

**Real-World Reachability:** The assistant loads the same skill twice, or the prompt trigger fires again after a background agent returns.

**Demo Flow:** Run the delivery step twice for the same load.

```gherkin
Given a protocol delivered earlier in the session
When the same skill loads again
Then the delivery step prints nothing
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Skips delivered protocols                                                                                                                                             |
| **Business data state** | Record unchanged                                                                                                                                                      |
| **Data shown on UI**    | Empty output                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Nothing repeated
- ❌ The protocol delivered again

**Test Data:**

```yaml
inputDomain: 'any number of repeated loads in one scope'
invariant: 'for ALL repeats after the first nothing is delivered'
boundaryCounterCase: 'a changed published text → delivered again'
```

**Edge Cases:**

- Another skill declaring the same protocol → also nothing

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-dedup]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-014` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:273` (passed in P44; not re-run at the final gate)

---

#### TC-PDL-015: After a compaction the protocol is delivered again [P1]

**Objective:** Prove a compaction re-arms delivery.

**Business Intent / Invariant Guarded:** Compaction drops earlier added messages, so a protocol must come back (BR-PDL-02).

**Traces:** AC-PDL-02 / BR-PDL-02

**Preconditions:**

- A delivered protocol
- A compaction recorded after it

**Real-World Reachability:** A long session compacts, then the assistant loads the skill again.

**Demo Flow:** Record a compaction, then load the skill.

```gherkin
Given a protocol delivered before a compaction
When the skill loads again
Then the protocol is delivered again
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Re-delivers                                                                                                                                                           |
| **Business data state** | Record refreshed                                                                                                                                                      |
| **Data shown on UI**    | The group message                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Delivered again
- ❌ Still suppressed after compaction

**Test Data:**

```yaml
inputDomain: 'any delivery followed by a compaction'
invariant: 'for ALL such sequences the next load re-delivers'
boundaryCounterCase: 'a compaction before the first delivery → one delivery only'
```

**Edge Cases:**

- Two compactions in a row → one re-delivery at the next load
- Second host: the conversation record gains its own compaction entry → delivered again; the same words nested inside another entry or quoted in a message → not a compaction
- Third host: the host reports the session's compaction (its events carry no conversation record) → delivered again; a report for a session that received no delivery writes nothing; a failing report never stops the host's compaction handling

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-dedup]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-015`, `.claude/scripts/opencode/tests/sync-hooks.test.mjs::[TC-PDL-015]` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:299` (primary host), `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:320` (second-host record), `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:352` (third-host report), `.claude/scripts/opencode/tests/sync-hooks.test.mjs:522` and `:560` (third-host bridge report, fail-open) — targeted suites passed 2026-09-25; a live second/third-host compaction run is not yet recorded

---

#### TC-PDL-020: Parallel group steps for one load deliver each protocol once [P1]

**Objective:** Prove the group steps that run together for one load neither lose nor duplicate a protocol.

**Business Intent / Invariant Guarded:** Hosts start group steps together; each protocol belongs to one group, so each record has one writer (BR-PDL-02).

**Traces:** AC-PDL-01 / BR-PDL-02

**Preconditions:**

- A fixture skill declaring protocols in three groups

**Real-World Reachability:** Every skill load starts all group steps at once.

**Demo Flow:** Start three group steps together and read the output and records.

```gherkin
Given three group steps started together for one load
When they finish
Then each protocol is delivered once
And every delivery record reads back whole
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers each group independently                                                                                                                                     |
| **Business data state** | One valid record per protocol                                                                                                                                         |
| **Data shown on UI**    | Three messages                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Each protocol once
- ✅ Every record readable
- ❌ A duplicate or a torn record

**Test Data:**

```yaml
inputDomain: 'any number of groups started together'
invariant: 'for ALL runs each protocol is delivered exactly once and every record parses'
boundaryCounterCase: 'two steps for the same group at once → one delivers, the other skips on the live lock'
```

**Edge Cases:**

- One step fails → the others still deliver

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-dedup]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-020` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:320` (passed in P44; not re-run at the final gate)

---

#### TC-PDL-053: Delivery re-arms at 4,500,000 bytes of conversation growth, not before [P1]

**Objective:** Prove the distance re-arm fires at the decided distance and not earlier.

**Business Intent / Invariant Guarded:** After about 200,000 tokens a protocol has faded from the assistant's attention; before that, repeating it wastes tokens (BR-PDL-02).

**Traces:** AC-PDL-02 / BR-PDL-02

**Preconditions:**

- A delivered protocol and a conversation record that grows

**Real-World Reachability:** A long session keeps using the same skills.

**Demo Flow:** Grow the conversation record by 4,400,000 bytes and load; then by 4,500,000 and load.

```gherkin
Given a delivered protocol
When the conversation has grown by 4,400,000 bytes and the skill loads again
Then nothing is delivered
When it has grown by 4,500,000 bytes and the skill loads again
Then the protocol is delivered again
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Re-arms at the distance                                                                                                                                               |
| **Business data state** | Record refreshed at the distance                                                                                                                                      |
| **Data shown on UI**    | Empty, then the message                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Re-delivered at 4,500,000
- ❌ Re-delivered at 4,400,000
- ❌ Never re-delivered

**Test Data:**

```yaml
inputDomain: 'any growth from 0 to 9,000,000 bytes'
invariant: 'for ALL growth below 4,500,000 nothing is delivered and at or above it the protocol is delivered'
boundaryCounterCase: 'growth of exactly 4,499,999 bytes → nothing'
```

**Edge Cases:**

- Growth past twice the distance → one re-delivery per load, not two

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-dedup]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-053` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:359` (passed in P44; not re-run at the final gate)

---

#### TC-PDL-054: An unusable record store still delivers [P0]

**Objective:** Prove a storage failure of the delivery record store never silences delivery.

**Business Intent / Invariant Guarded:** A read-only or broken store must degrade to a duplicate, never to silence (BR-PDL-05).

**Traces:** AC-PDL-05 / BR-PDL-05

**Preconditions:**

- A fixture project where a regular file sits where the record store folder should be

**Real-World Reachability:** A read-only checkout, a shared machine or a full disk.

**Deliberate Impossible State:** A file in place of the store folder is not a normal state; it stands for a read-only checkout, a store owned by another user or a full disk, and proves the deliver-anyway branch on every operating system.

**Demo Flow:** Load a converted skill and read the output and the exit status.

```gherkin
Given the record store cannot be created
When a converted skill loads
Then its protocols are delivered
And the step ends successfully
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers without de-duplication                                                                                                                                       |
| **Business data state** | No record written                                                                                                                                                     |
| **Data shown on UI**    | The group message                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Delivered
- ✅ Successful end
- ❌ Empty output
- ❌ A blocking failure

**Test Data:**

```yaml
inputDomain: 'any storage failure of the record store'
invariant: 'for ALL storage failures the protocols are still delivered'
boundaryCounterCase: 'a live parallel delivery of the same record → skipped'
```

**Edge Cases:**

- A store that can be read but not written → delivered, possibly twice

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-fail-open]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-054` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:380` (passed in P44; not re-run at the final gate)

---

#### TC-PDL-057: A non-matching event ends before any project module loads [P1]

**Objective:** Prove the early exit is deterministic: no project module beyond the step and its delivery library is loaded.

**Business Intent / Invariant Guarded:** Six steps run on many events; the cheap exit is what keeps them affordable (BR-PDL-09).

**Traces:** AC-PDL-17 / BR-PDL-09

**Preconditions:**

- A fixture project and a module-load logger

**Real-World Reachability:** Every ordinary file read and every second-host prompt without a skill name.

**Demo Flow:** Run a step for a read of an ordinary file and for a second-host prompt with no skill name, and read the load log.

```gherkin
Given a read of a file that is not a skill file, or a second-host prompt that names no skill
When a delivery step runs
Then it prints nothing and ends successfully
And no project module other than the step and its delivery library was loaded
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Exits early                                                                                                                                                           |
| **Business data state** | Nothing written                                                                                                                                                       |
| **Data shown on UI**    | Empty output and the load log                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Only the step and its library loaded
- ❌ Configuration or record modules loaded on a non-matching event

**Test Data:**

```yaml
inputDomain: 'any event that cannot load a skill'
invariant: 'for ALL such events only the step and its library load'
boundaryCounterCase: 'a read of a skill file → the full path runs'
```

**Edge Cases:**

- A shell command that mentions the skill file name anywhere → not an early exit

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-cost-budget]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-057` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:396` (passed in P44; not re-run at the final gate)

---

#### TC-PDL-067: Through the second host's real start command, a non-matching event loads only the expected modules [P1]

**Objective:** Prove the early exit holds through the generated second-host start command, and record its through-path time.

**Business Intent / Invariant Guarded:** The second host does not start a step directly; the cost budget is measured on the command that ships (BR-PDL-09).

**Traces:** AC-PDL-17 / BR-PDL-09

**Preconditions:**

- A generated second-host hook configuration holding a start command
- A fixture project subfolder

**Real-World Reachability:** Every second-host prompt without a skill name.

**Demo Flow:** Run a delivery step through the real start command for a prompt with no skill name.

```gherkin
Given the second host's generated start command pointed at a delivery step
When it runs from a project subfolder for a prompt that names no skill
Then it prints nothing and ends successfully
And the project modules loaded are only those the start command and the step need
And the wall time of six sequential runs is recorded next to the baseline
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Exits early through the real path                                                                                                                                     |
| **Business data state** | Timing recorded, not asserted                                                                                                                                         |
| **Data shown on UI**    | Load log and timing                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Only the expected modules
- ❌ A configuration or record module loaded

**Test Data:**

```yaml
inputDomain: 'any start command the generator renders'
invariant: 'for ALL rendered commands a non-matching event loads only the expected modules'
boundaryCounterCase: 'no generated configuration present → the case reports skipped'
```

**Edge Cases:**

- A project that never ran the second-host sync → skipped with its reason

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-cost-budget]`
> **Related Behaviors:** `operation/scripts/codex-sync-hooks`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs::TC-PDL-067` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-inject-hook.test.cjs:457` (passed in P44; not re-run at the final gate)

---

### Host Registration Tests

> Load paths on the three hosts, the second-host inline list and the cost filters (US-PDL-05, US-PDL-06).

#### TC-PDL-021: The primary host registers every group on all four load paths [P1]

**Objective:** Prove each group's step is registered, with no arguments, on skill use, skill-file read, typed-command expansion and agent start.

**Business Intent / Invariant Guarded:** A typed command and an assistant choice fire different triggers; missing either loses a load path (BR-PDL-15).

**Traces:** AC-PDL-12 / BR-PDL-15

**Preconditions:**

- The framework repository's primary-host settings

**Real-World Reachability:** Every primary-host session.

**Demo Flow:** Parse the settings and list the delivery registrations.

```gherkin
Given the primary-host settings
When they are parsed
Then each group's step is registered on skill use, skill-file read, typed-command expansion and agent start
And no registration carries arguments
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Registers every path                                                                                                                                                  |
| **Business data state** | Six steps on four events                                                                                                                                              |
| **Data shown on UI**    | The registration list                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ All four paths per group
- ❌ A path missing
- ❌ A command with arguments

**Test Data:**

```yaml
inputDomain: 'any group'
invariant: 'for ALL groups all four registrations exist without arguments'
boundaryCounterCase: 'an adopting project → the case reports skipped'
```

**Edge Cases:**

- Outside the framework repository → skipped with its reason

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-host-registration]`
> **Related Behaviors:** `test/hooks/protocol-host-mapping`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-021` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:341` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-022: The second host maps delivery to the prompt, shell-read and agent-start events without changing existing steps [P0]

**Objective:** Prove the second-host generator maps every group correctly and leaves every earlier step byte-identical.

**Business Intent / Invariant Guarded:** A changed existing step is silently disabled until the user reviews it again, which would switch off guards such as the commit gate (BR-PDL-06, BR-PDL-15).

**Traces:** AC-PDL-13 / BR-PDL-06, BR-PDL-15

**Preconditions:**

- A temporary copy of the framework

**Real-World Reachability:** Every second-host sync.

**Demo Flow:** Run the second-host sync on the copy and read the generated configuration and report.

```gherkin
Given the second-host sync on a temporary copy
When it runs
Then each group maps to the prompt event with an allowance of 3,000
And each group has a shell-read step
And no delivery step is keyed to file read or skill use, and none carries a condition
And the dropped skill-use and file-read groups and the remapped typed-command expansion are reported with their reasons
And every step that existed before renders byte-identically
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Generates the decided mapping                                                                                                                                         |
| **Business data state** | Existing steps unchanged                                                                                                                                              |
| **Data shown on UI**    | Generated configuration and report                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Prompt, shell-read and agent-start steps present
- ✅ Existing steps byte-identical
- ❌ A changed existing step
- ❌ A file-read or skill-use step on the second host

**Test Data:**

```yaml
inputDomain: 'any existing step set'
invariant: 'for ALL existing steps the render is byte-identical to before'
boundaryCounterCase: 'a step whose command changes → the check fails naming it'
```

**Edge Cases:**

- The shell-read step matches the skill file name anywhere in the command

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/codex-protocol-mapping]`
> **Related Behaviors:** `operation/scripts/codex-sync-hooks`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-022` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:407` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-026: The full read-only sync verification passes after regeneration [P1]

**Objective:** Prove every sync stage passes once the mirrors are regenerated with delivery in place.

**Business Intent / Invariant Guarded:** Host parity is verified by the sync pipeline, not assumed (BR-PDL-15).

**Traces:** AC-PDL-12, AC-PDL-13, AC-PDL-14 / BR-PDL-15

**Preconditions:**

- Regenerated mirrors in the framework repository

**Real-World Reachability:** The release close runs the full verification.

**Demo Flow:** Run the read-only sync verification.

```gherkin
Given regenerated mirrors
When the read-only sync verification runs
Then every stage passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Verifies all stages                                                                                                                                                   |
| **Business data state** | No file changes                                                                                                                                                       |
| **Data shown on UI**    | A passing stage list                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ All stages pass
- ❌ Any stage fails

**Test Data:**

```yaml
inputDomain: 'any regenerated state'
invariant: 'for ALL stages the verification passes'
boundaryCounterCase: 'a stale mirror → the divergence stage fails'
```

**Edge Cases:**

- A stale published text → the scripts-tests stage fails

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/run-codex-sync]`
> **Related Behaviors:** `operation/scripts/run-codex-sync`
> **CoveredBy:** `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only` (release close run) · **Status:** Planned — deferred: runs with the final-gate `--verify-only` after the mirror sync

---

#### TC-PDL-028: The hooks guide tells second-host users to review new delivery steps [P2]

**Objective:** Prove the documentation carries the second-host trust note and the review step for new delivery steps.

**Business Intent / Invariant Guarded:** An unreviewed second-host step never runs; users must know that guides are the path until they review it (BR-PDL-05, BR-PDL-15).

**Traces:** AC-PDL-04, AC-PDL-13 / BR-PDL-15

**Preconditions:**

- The framework hooks guide

**Real-World Reachability:** A developer adopts the framework on the second host.

**Demo Flow:** Read the hooks guide.

```gherkin
Given the hooks guide
When it is read
Then it states that the second host runs a new or changed step only after the user reviews it
And it names the review step for the new delivery steps
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Documents the trust step                                                                                                                                              |
| **Business data state** | Guide current                                                                                                                                                         |
| **Data shown on UI**    | The two notes                                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Both notes present
- ❌ Either note missing

**Test Data:**

```yaml
inputDomain: 'the hooks guide'
invariant: 'for ALL releases with second-host delivery steps both notes are present'
boundaryCounterCase: 'the notes removed → the check fails'
```

**Edge Cases:**

- Existing steps unchanged → their earlier review still holds, and the guide says so

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: requirement/docs/codex-hook-trust]`
> **Related Behaviors:** `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-PDL-028` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:903` "[content-presence] TC-PDL-028 the hooks guide tells second-host users to review new delivery steps" (written at the final gate, never executed; not run at the final gate)

---

#### TC-PDL-058: Only primary-host file-read delivery steps carry the skill-file condition [P1]

**Objective:** Prove every file-read delivery step is filtered to skill files and no other delivery step carries a condition.

**Business Intent / Invariant Guarded:** Without the condition every ordinary read would start six steps (BR-PDL-09).

**Traces:** AC-PDL-16 / BR-PDL-09

**Preconditions:**

- The framework repository's primary-host settings

**Real-World Reachability:** Every primary-host file read.

**Demo Flow:** Parse the settings and read the conditions.

```gherkin
Given the primary-host settings
When they are parsed
Then every file-read delivery step carries the skill-file condition
And no other delivery step carries a condition
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Filters file reads                                                                                                                                                    |
| **Business data state** | Six conditioned read steps                                                                                                                                            |
| **Data shown on UI**    | The conditions                                                                                                                                                        |

**Acceptance Criteria:**

- ✅ Every read step conditioned
- ❌ A read step without the condition
- ❌ A condition on another event

**Test Data:**

```yaml
inputDomain: 'any delivery step'
invariant: 'for ALL file-read steps the skill-file condition is present and for ALL others it is absent'
boundaryCounterCase: 'an adopting project → skipped'
```

**Edge Cases:**

- A condition on agent start → rejected, since the host ignores it there

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-read-filter]`
> **Related Behaviors:** `test/hooks/protocol-host-mapping`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-058` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:372` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-059: Every generated delivery step names one existing step file on both mirrors [P1]

**Objective:** Prove the second- and third-host mirrors run each delivery step as a bare command that resolves to a real file.

**Business Intent / Invariant Guarded:** A command with an argument becomes a missing file on the third host and a silent miss (BR-PDL-15).

**Traces:** AC-PDL-13, AC-PDL-14 / BR-PDL-15

**Preconditions:**

- A temporary copy of the framework

**Real-World Reachability:** Every mirror sync.

**Demo Flow:** Run both syncs on the copy and run a generated command from a subfolder.

```gherkin
Given both mirror syncs on a temporary copy
When the mirrors are generated
Then every delivery step names one group step file with no arguments
And the second-host command runs it from a subfolder and returns its output
And the third-host path resolves to an existing file
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Generates runnable commands                                                                                                                                           |
| **Business data state** | Commands resolve                                                                                                                                                      |
| **Data shown on UI**    | Generated tables                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Every command resolves
- ❌ A missing file
- ❌ An argument after the path

**Test Data:**

```yaml
inputDomain: 'any group step'
invariant: 'for ALL generated commands the file exists'
boundaryCounterCase: 'a step registered with an argument → flagged'
```

**Edge Cases:**

- A project path with spaces → still resolves

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-host-registration]`
> **Related Behaviors:** `operation/scripts/codex-sync-hooks` · `operation/scripts/opencode-sync-hooks`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-059` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:463` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-060: The agent-start filter equals the skill-preloading agents plus Explore and Plan [P1]

**Objective:** Prove the agent-start filter is derived from the agent definitions and the decided root-skipping list.

**Business Intent / Invariant Guarded:** A filter wider than needed starts steps on every agent; a narrower one misses an agent (BR-PDL-08).

**Traces:** AC-PDL-11, AC-PDL-12 / BR-PDL-08

**Preconditions:**

- The framework repository's agent definitions and primary-host settings

**Real-World Reachability:** Every agent start.

**Demo Flow:** Derive the expected list and compare it with every delivery step's filter.

```gherkin
Given the agent definitions and the settings
When the expected list is derived from every agent that preloads skills plus Explore and Plan
Then every delivery step's agent-start filter equals that list, sorted
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Filters agent starts                                                                                                                                                  |
| **Business data state** | Filter matches the derived list                                                                                                                                       |
| **Data shown on UI**    | The filter and the list                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Equal lists
- ❌ An extra or missing agent type

**Test Data:**

```yaml
inputDomain: 'any set of agent definitions'
invariant: 'for ALL sets the filter equals the derived list'
boundaryCounterCase: 'an agent that stops preloading skills → the filter must drop it'
```

**Edge Cases:**

- A new agent that preloads skills → must be added

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-agent-start]`
> **Related Behaviors:** `test/hooks/protocol-host-mapping`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-060` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:391` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-069: The second-host surface check pins the new delivery rows and reviewed skips [P1]

**Objective:** Prove the second-host surface check records every added row and flags an unreviewed skip.

**Business Intent / Invariant Guarded:** A silently dropped agent-start or delivery row would pass unnoticed (BR-PDL-15).

**Traces:** AC-PDL-13 / BR-PDL-15

**Preconditions:**

- The generated second-host surface and a synthetic report

**Real-World Reachability:** Every sync verification.

**Demo Flow:** Run the surface checks and a synthetic report that skips agent start as unsupported.

```gherkin
Given the settings with delivery registered
When the second-host surface checks run
Then the rendered surface equals the pinned rows, including the prompt, shell-read and agent-start delivery rows
And the only skips are the reviewed ones
When a synthetic report skips agent start as unsupported
Then the check reports a problem
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Pins the surface                                                                                                                                                      |
| **Business data state** | Pinned rows current                                                                                                                                                   |
| **Data shown on UI**    | Pass, or the unexpected skip                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Pinned rows match
- ✅ Unreviewed skip flagged
- ❌ An unexpected skip passes

**Test Data:**

```yaml
inputDomain: 'any generated surface'
invariant: 'for ALL surfaces only reviewed skips pass'
boundaryCounterCase: 'agent start skipped as unsupported → flagged'
```

**Edge Cases:**

- The typed-command expansion appears as remapped, never unsupported

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-host-registration]`
> **Related Behaviors:** `operation/scripts/verify-sync-divergence`
> **CoveredBy:** `.claude/scripts/codex/tests/verify-sync-divergence.test.mjs::TC-PDL-069` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/verify-sync-divergence.test.mjs:497` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-070: Second-host delivery steps start on the lean path without the version-control lookup [P1]

**Objective:** Prove the second-host start command for delivery steps drops the version-control lookup and leaves every other command unchanged.

**Business Intent / Invariant Guarded:** The lookup costs hundreds of milliseconds per start; delivery steps never need it (BR-PDL-09).

**Traces:** AC-PDL-17 / BR-PDL-09

**Preconditions:**

- The second-host command renderer
- A fixture project subfolder and a module-load logger

**Real-World Reachability:** Every second-host event with delivery steps.

**Demo Flow:** Render a delivery command and an existing command, then run the delivery command for a prompt with no skill name.

```gherkin
Given the second-host command renderer
When it renders a delivery step and an existing step
Then the delivery command has no version-control lookup
And the existing command equals its earlier render byte for byte
When the delivery command runs from a subfolder for a prompt with no skill name
Then it prints nothing, ends successfully, loads no version-control helper and starts no child process, on every operating system
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Renders the lean path                                                                                                                                                 |
| **Business data state** | Existing commands unchanged                                                                                                                                           |
| **Data shown on UI**    | Commands and the load log                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Lean delivery command
- ✅ Existing command unchanged
- ❌ The lookup in a delivery command
- ❌ Any change to an existing command

**Test Data:**

```yaml
inputDomain: 'any registered command'
invariant: 'for ALL delivery commands the lookup is absent and for ALL other commands the render is unchanged'
boundaryCounterCase: 'a non-delivery hook path → the full launcher'
```

**Edge Cases:**

- A delivery step under a project path with spaces → still lean

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-cost-budget]`
> **Related Behaviors:** `operation/scripts/codex-sync-hooks`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-070` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:511` (passed in P24; not re-run at the final gate)

---

#### TC-PDL-023: The third-host bridge lists delivery on the skill tool and file read and reports the rest as unavailable [P1]

**Objective:** Prove the third-host sync maps delivery to the skill tool and file read and reports the triggers the host lacks.

**Business Intent / Invariant Guarded:** The third host has two load paths; the others must be reported, not silently dropped (BR-PDL-15).

**Traces:** AC-PDL-14 / BR-PDL-15

**Preconditions:**

- A temporary copy of the framework

**Real-World Reachability:** Every third-host sync.

**Demo Flow:** Run the third-host sync and read the bridge table and report.

```gherkin
Given the third-host sync on a temporary copy
When it runs
Then the bridge lists each group on the skill tool and the file read
And the file-read entries carry the skill-file condition
And typed-command expansion and agent start are reported as skipped
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Generates the bridge table                                                                                                                                            |
| **Business data state** | Two load paths mapped                                                                                                                                                 |
| **Data shown on UI**    | Bridge table and report                                                                                                                                               |

**Acceptance Criteria:**

- ✅ Both paths mapped
- ✅ Skips reported
- ❌ A silent skip

**Test Data:**

```yaml
inputDomain: 'any group'
invariant: 'for ALL groups both third-host paths are mapped'
boundaryCounterCase: 'a group with no file-read condition → no condition in its entry'
```

**Edge Cases:**

- Entries for other hooks keep their earlier shape

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-host-registration]`
> **Related Behaviors:** `operation/scripts/opencode-sync-hooks`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-023` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:548` (passed in P52; not re-run at the final gate)

---

#### TC-PDL-024: A protocol on the second-host inline list stays full text in the second-host copy [P1]

**Objective:** Prove the inline list turns a guide entry back into full text in the second host's skill copy.

**Business Intent / Invariant Guarded:** The list is the escape hatch for a protocol the second host cannot receive by delivery (BR-PDL-06).

**Traces:** AC-PDL-15 / BR-PDL-06

**Preconditions:**

- A fixture inline list with one protocol
- A converted skill declaring it and others

**Real-World Reachability:** A future confirmation run shows a protocol cannot reach the second host by delivery.

**Demo Flow:** Generate the second-host copy and read the skill.

```gherkin
Given an inline list with one protocol
When the second-host copy is generated
Then the copy holds that protocol's full text
And guide entries for the others
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Inlines listed protocols                                                                                                                                              |
| **Business data state** | Copy differs from source only for listed protocols                                                                                                                    |
| **Data shown on UI**    | The copied skill                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Listed protocol inline
- ❌ Listed protocol left as a guide

**Test Data:**

```yaml
inputDomain: 'any inline list'
invariant: 'for ALL listed protocols the copy holds full text and for ALL others a guide'
boundaryCounterCase: 'a listed protocol the skill does not declare → no change'
```

**Edge Cases:**

- A listed protocol is never also delivered to the second host

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/codex-inline-list]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-024` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:633` (passed in P52; not re-run at the final gate)

---

#### TC-PDL-025: With the decided empty inline list, the second-host copy holds guides only [P1]

**Objective:** Prove a protocol not on the list, including every protocol under the decided empty list, appears only as a guide.

**Business Intent / Invariant Guarded:** Every second-host load path delivered in the confirmation run, so no protocol needs full text in the copy (BR-PDL-06).

**Traces:** AC-PDL-15 / BR-PDL-06

**Preconditions:**

- The decided empty inline list
- A converted skill

**Real-World Reachability:** Every second-host sync with the default list.

**Demo Flow:** Generate the second-host copy and compare its guide block with the source.

```gherkin
Given the empty inline list
When the second-host copy is generated
Then every protocol appears as a guide
And the copy's guide block matches the source
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Copies guides unchanged                                                                                                                                               |
| **Business data state** | No inline text                                                                                                                                                        |
| **Data shown on UI**    | The copied skill                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Guides only
- ❌ Any full body in the copy

**Test Data:**

```yaml
inputDomain: 'any converted skill'
invariant: 'for ALL protocols not on the list the copy holds a guide only'
boundaryCounterCase: 'a protocol added to the list → full text'
```

**Edge Cases:**

- An inline skill → its full bodies are copied as before

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/codex-inline-list]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-025` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:659` (passed in P52; not re-run at the final gate)

---

#### TC-PDL-027: A third-host skill tool load appends the review protocols to the result [P1]

**Objective:** Prove the third-host bridge appends the review group message when the skill tool loads a converted skill.

**Business Intent / Invariant Guarded:** The third host names the skill in a different field from the primary host; delivery must still resolve it (BR-PDL-10, BR-PDL-15).

**Traces:** AC-PDL-14, AC-PDL-18 / BR-PDL-10, BR-PDL-15

**Preconditions:**

- A bridge with a fake skill-tool event naming a converted skill in the third host's field

**Real-World Reachability:** The assistant loads a skill on the third host.

**Demo Flow:** Send the fake event through the bridge and read the tool result.

```gherkin
Given a third-host skill tool load of a converted skill
When the bridge runs the delivery steps
Then the review group message is appended to the tool result
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Appends the message                                                                                                                                                   |
| **Business data state** | Recorded once per scope                                                                                                                                               |
| **Data shown on UI**    | The tool result with the message                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Message appended
- ❌ Nothing appended because the skill field was not read

**Test Data:**

```yaml
inputDomain: 'any skill-tool event'
invariant: 'for ALL events naming a converted skill in either field the message is appended'
boundaryCounterCase: 'a skill with no guide block → nothing appended'
```

**Edge Cases:**

- An event that names the skill in both fields → one resolution

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-host-registration]`
> **Related Behaviors:** `operation/scripts/opencode-sync-hooks` · `rule/hooks/protocol-input-trust`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-027` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:587` (passed in P52; not re-run at the final gate)

---

#### TC-PDL-068: The third-host bridge starts no delivery step for a read of an ordinary file [P1]

**Objective:** Prove the bridge checks the skill-file condition before it starts a step.

**Business Intent / Invariant Guarded:** The bridge runs steps one after another; six unfiltered starts added about three seconds to every read in the confirmation run (BR-PDL-09).

**Traces:** AC-PDL-16 / BR-PDL-09

**Preconditions:**

- A temporary project with a conditioned probe step and an unconditioned step on file read

**Real-World Reachability:** Every third-host file read.

**Demo Flow:** Send reads of an ordinary file and of skill files through the generated bridge.

```gherkin
Given a conditioned probe step and an unconditioned step on file read
When the bridge receives a read of an ordinary source file
Then the probe does not start and only the unconditioned step is counted
When it receives a read of a skill file, with either path separator
Then the probe starts
And the bridge table carries the condition for the probe only
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Filters before starting                                                                                                                                               |
| **Business data state** | No probe marker for the ordinary read                                                                                                                                 |
| **Data shown on UI**    | Run count and marker files                                                                                                                                            |

**Acceptance Criteria:**

- ✅ No start for the ordinary read
- ✅ Start for skill files
- ❌ Probe started for the ordinary read

**Test Data:**

```yaml
inputDomain: 'any file path'
invariant: 'for ALL paths that are not skill files the probe does not start'
boundaryCounterCase: 'an unknown condition form → the step starts, so no step is ever dropped'
```

**Edge Cases:**

- A drive-letter path to a skill file → the probe starts

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-read-filter]`
> **Related Behaviors:** `operation/scripts/opencode-sync-hooks`
> **CoveredBy:** `.claude/scripts/opencode/tests/sync-hooks.test.mjs::TC-PDL-068` · **Status:** Implemented — evidence: `.claude/scripts/opencode/tests/sync-hooks.test.mjs:686` (passed in P52; not re-run at the final gate)

---

#### TC-PDL-042: The second-host copy inlines listed protocols and guides the rest after conversion [P1]

**Objective:** Prove the converted tree's second-host copy follows the inline list.

**Business Intent / Invariant Guarded:** After every group is converted, the second host must still reach every protocol (BR-PDL-06).

**Traces:** AC-PDL-15 / BR-PDL-06

**Preconditions:**

- The fully converted framework and its regenerated second-host copy

**Real-World Reachability:** The release close after conversion.

**Demo Flow:** Verify the second-host copy against the inline list.

```gherkin
Given the fully converted tree and its second-host copy
When the copy is verified
Then listed protocols are inline
And every other protocol is a guide
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Verifies the copy                                                                                                                                                     |
| **Business data state** | Copy consistent with the list                                                                                                                                         |
| **Data shown on UI**    | Verification result                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ Copy follows the list
- ❌ A mismatch

**Test Data:**

```yaml
inputDomain: 'any converted skill copy'
invariant: 'for ALL protocols the copy form follows the list'
boundaryCounterCase: 'a listed protocol shown as a guide → fails'
```

**Edge Cases:**

- The decided empty list → guides only

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/codex-inline-list]`
> **Related Behaviors:** `operation/scripts/migrate-claude-to-codex`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs::TC-PDL-042` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-host-mapping.test.cjs:686` "TC-PDL-042 the second-host skill mirror holds listed protocols inline and every other converted protocol as a guide entry" (written in P50, never executed; not run at the final gate; expected red until `/sync-codex` regenerates the second-host skill mirror)

---

### Guide Tooling and Policy Tests

> Converting bodies to guide entries and keeping carriers and the policy in step (US-PDL-03, US-PDL-09).

#### TC-PDL-029: Guide conversion replaces each body with a guide entry and keeps the reminders [P1]

**Objective:** Prove guide mode turns full bodies into one guide entry each and leaves reminder digests in place.

**Business Intent / Invariant Guarded:** A converted skill must keep a guide entry per protocol and its recency recap (BR-PDL-01).

**Traces:** AC-PDL-21 / BR-PDL-01

**Preconditions:**

- A fixture skill with three full protocol bodies and their reminders

**Real-World Reachability:** A maintainer converts a group.

**Demo Flow:** Run guide conversion and read the skill.

```gherkin
Given a skill with three protocol bodies
When guide conversion runs
Then three guide entries replace the bodies
And every reminder digest stays
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Converts the bodies                                                                                                                                                   |
| **Business data state** | Skill converted                                                                                                                                                       |
| **Data shown on UI**    | The guide block                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Three entries
- ✅ Reminders kept
- ❌ A body left
- ❌ A reminder removed

**Test Data:**

```yaml
inputDomain: 'any skill with 1..n bodies'
invariant: 'for ALL bodies one guide entry replaces each and reminders stay'
boundaryCounterCase: 'a body with no published text → conversion fails naming it'
```

**Edge Cases:**

- A body with no reminder → entry only

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-update-blocks]`
> **Related Behaviors:** `rule/skills/protocol-guide-entry`
> **CoveredBy:** `.claude/scripts/tests/sync-update-blocks-guide.test.cjs::TC-PDL-029` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-update-blocks-guide.test.cjs:242` (passed in P25; not re-run at the final gate)

---

#### TC-PDL-030: Running guide conversion again changes nothing [P1]

**Objective:** Prove guide conversion is repeatable.

**Business Intent / Invariant Guarded:** Conversion runs in several passes and on every canonical edit; a second run must not drift (BR-PDL-01, BR-PDL-14).

**Traces:** AC-PDL-21 / BR-PDL-01

**Preconditions:**

- A converted fixture skill

**Real-World Reachability:** A maintainer re-runs the tooling.

**Demo Flow:** Run conversion twice and compare.

```gherkin
Given a converted skill
When guide conversion runs again
Then the skill is unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | No change                                                                                                                                                             |
| **Business data state** | Byte-identical                                                                                                                                                        |
| **Data shown on UI**    | An empty comparison                                                                                                                                                   |

**Acceptance Criteria:**

- ✅ No change
- ❌ Any change

**Test Data:**

```yaml
inputDomain: 'any converted skill'
invariant: 'for ALL converted skills a second run changes nothing'
boundaryCounterCase: 'a changed summary in the group data → the guide line updates'
```

**Edge Cases:**

- Different line endings in the source → still no change

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-update-blocks]`
> **Related Behaviors:** `rule/skills/protocol-guide-entry`
> **CoveredBy:** `.claude/scripts/tests/sync-update-blocks-guide.test.cjs::TC-PDL-030` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-update-blocks-guide.test.cjs:268` (passed in P25; not re-run at the final gate)

---

#### TC-PDL-031: Guide conversion changes only the protocols it is asked for [P1]

**Objective:** Prove conversion limited to named protocols leaves every other body in place.

**Business Intent / Invariant Guarded:** Groups are converted one at a time behind a compliance hold; converting more would bypass it (BR-PDL-01).

**Traces:** AC-PDL-21 / BR-PDL-01

**Preconditions:**

- A fixture skill with bodies for protocols a, b and c

**Real-World Reachability:** A maintainer converts one group.

**Demo Flow:** Convert only a and b.

```gherkin
Given a skill with protocols a, b and c
When conversion runs for a and b only
Then a and b become guide entries
And c keeps its full body
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Converts the named protocols                                                                                                                                          |
| **Business data state** | c unchanged                                                                                                                                                           |
| **Data shown on UI**    | The skill                                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Only a and b converted
- ❌ c converted

**Test Data:**

```yaml
inputDomain: 'any subset of protocols'
invariant: 'for ALL subsets only the named protocols convert'
boundaryCounterCase: 'an empty subset → no change'
```

**Edge Cases:**

- A named protocol the skill does not carry → no change

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/sync-update-blocks]`
> **Related Behaviors:** `rule/skills/protocol-guide-entry`
> **CoveredBy:** `.claude/scripts/tests/sync-update-blocks-guide.test.cjs::TC-PDL-031` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-update-blocks-guide.test.cjs:289` (passed in P25; not re-run at the final gate)

---

#### TC-PDL-034: The duplication policy states the hybrid rule [P1]

**Objective:** Prove the policy text no longer forbids reference by path and states every part of the hybrid.

**Business Intent / Invariant Guarded:** The old policy forbade guides; leaving it would instruct the assistant against this capability (BR-PDL-01, BR-PDL-14).

**Traces:** AC-PDL-23 / BR-PDL-01, BR-PDL-14

**Preconditions:**

- The canonical policy sections

**Real-World Reachability:** Every skill and agent that carries the policy.

**Demo Flow:** Read the policy.

```gherkin
Given the policy sections
When they are read
Then no rule says never to reference a protocol by path
And the hybrid rule is present, including that agents keep full text, reviewer prompts carry bodies inline, and the five review-family skills keep full bodies inline
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | States the hybrid                                                                                                                                                     |
| **Business data state** | Policy current                                                                                                                                                        |
| **Data shown on UI**    | The policy text                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Hybrid rule present
- ❌ The old prohibition present

**Test Data:**

```yaml
inputDomain: 'the policy text'
invariant: 'for ALL policy variants the hybrid rule and its three carve-outs are present'
boundaryCounterCase: 'the old prohibition reintroduced → fails'
```

**Edge Cases:**

- The reminder variant → states the same rule in short form

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/duplication-policy]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-034` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:587` "TC-PDL-034: the duplication policy states the hybrid rule and no section keeps the old never-by-path prohibition" (passed in P25; not re-run at the final gate; the P27 extension that also scans every carrier and the four policy docs was never executed)

---

#### TC-PDL-061: A canonical edit reaches every skill and agent carrier; guide conversion never touches agents [P0]

**Objective:** Prove propagation updates every full-text carrier and guide mode leaves agents byte-identical.

**Business Intent / Invariant Guarded:** Agents keep full text by decision; a stale or converted agent loses a rule (BR-PDL-14, BR-PDL-11).

**Traces:** AC-PDL-21 / BR-PDL-14

**Preconditions:**

- A temporary tree with skill and agent carriers of one protocol

**Real-World Reachability:** A maintainer edits and propagates a protocol.

**Demo Flow:** Edit the canonical body, propagate, then run guide conversion.

```gherkin
Given skill and agent carriers of one protocol
When the canonical body changes and propagation runs
Then every skill and agent carrier equals the new text
When guide conversion runs
Then no agent file changes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Propagates and protects agents                                                                                                                                        |
| **Business data state** | Carriers equal canonical                                                                                                                                              |
| **Data shown on UI**    | Carrier comparison                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ Every carrier updated
- ✅ Agents unchanged by conversion
- ❌ A stale carrier
- ❌ An agent converted

**Test Data:**

```yaml
inputDomain: 'any set of carriers'
invariant: 'for ALL carriers propagation makes them equal to canonical'
boundaryCounterCase: 'guide conversion on an agent → no change'
```

**Edge Cases:**

- An override copy of a protocol → left unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-carrier-parity]`
> **Related Behaviors:** `operation/scripts/sync-update-blocks`
> **CoveredBy:** `.claude/scripts/tests/sync-update-blocks-guide.test.cjs::TC-PDL-061` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-update-blocks-guide.test.cjs:330` (passed in P25; not re-run at the final gate)

---

#### TC-PDL-081: Guide conversion leaves inline skills and reference files untouched [P0]

**Objective:** Prove conversion changes only a converted skill's main file.

**Business Intent / Invariant Guarded:** Inline skills and reference files keep full bodies by decision (BR-PDL-11, BR-PDL-12).

**Traces:** AC-PDL-07, AC-PDL-08 / BR-PDL-11, BR-PDL-12

**Preconditions:**

- A temporary tree with an inline skill, a converted skill and a reference file, all carrying protocol X

**Real-World Reachability:** A maintainer converts the group that holds X.

**Demo Flow:** Run guide conversion for X.

```gherkin
Given an inline skill, a converted skill and a reference file that each carry X
When guide conversion runs for X
Then only the converted skill's main file changes
And the inline skill and the reference file are byte-identical
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Converts only the main file                                                                                                                                           |
| **Business data state** | Inline and reference unchanged                                                                                                                                        |
| **Data shown on UI**    | File comparison                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Only the converted skill changes
- ❌ An inline skill or reference changed

**Test Data:**

```yaml
inputDomain: 'any tree with inline skills and reference files'
invariant: 'for ALL inline skills and reference files conversion changes nothing'
boundaryCounterCase: 'a skill removed from the inline list → its main file converts'
```

**Edge Cases:**

- A reference file of the converted skill → unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/reference-carriers]`
> **Related Behaviors:** `rule/skills/inline-skills` · `operation/scripts/sync-update-blocks`
> **CoveredBy:** `.claude/scripts/tests/sync-update-blocks-guide.test.cjs::TC-PDL-081` · **Status:** Implemented — evidence: `.claude/scripts/tests/sync-update-blocks-guide.test.cjs:309` (passed in P25; not re-run at the final gate)

---

#### TC-PDL-082: The policy copy in the development rules equals the canonical text [P1]

**Objective:** Prove the policy copy in the framework development rules matches the canonical body.

**Business Intent / Invariant Guarded:** A stale copy would restate the old prohibition to readers of the development rules (BR-PDL-14).

**Traces:** AC-PDL-23 / BR-PDL-14

**Preconditions:**

- The framework repository's development rules

**Real-World Reachability:** Every maintainer who reads the development rules.

**Demo Flow:** Compare the copy with the canonical body.

```gherkin
Given the development rules in the framework repository
When their policy block is compared with the canonical body of the same variant
Then they are byte-equal
And outside the framework repository the case reports skipped
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Compares copies                                                                                                                                                       |
| **Business data state** | Copies equal                                                                                                                                                          |
| **Data shown on UI**    | Pass, or skipped with its reason                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Byte-equal
- ❌ Any difference
- ❌ A pass reported outside the framework repository

**Test Data:**

```yaml
inputDomain: 'the policy copy'
invariant: 'for ALL edits of the canonical policy the copy equals it'
boundaryCounterCase: 'an adopting project → skipped'
```

**Edge Cases:**

- A different variant in the copy → compared against that variant

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/duplication-policy]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-082` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:629` (passed in P25; not re-run at the final gate)

---

### Guide-Aware Check Tests

> Framework checks and injectors that accept a guide entry in place of a body (US-PDL-03, US-PDL-09).

#### TC-PDL-032: A guide entry for a protocol with no published text fails verification [P1]

**Objective:** Prove the protocol-compliance check rejects a guide entry whose protocol is not published.

**Business Intent / Invariant Guarded:** A guide pointing at nothing breaks the read-by-path fallback (BR-PDL-01, BR-PDL-05).

**Traces:** AC-PDL-22 / BR-PDL-01

**Preconditions:**

- A fixture skill with a guide entry naming an unpublished protocol

**Real-World Reachability:** A maintainer removes a protocol but leaves a guide.

**Demo Flow:** Run the protocol-compliance check.

```gherkin
Given a guide naming a protocol with no published text
When the check runs
Then it fails naming the skill and protocol
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Rejects the guide                                                                                                                                                     |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | A failure message                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Fails
- ❌ Passes

**Test Data:**

```yaml
inputDomain: 'any guide entry'
invariant: 'for ALL guide entries a published text exists or the check fails'
boundaryCounterCase: 'the text published → passes'
```

**Edge Cases:**

- A protocol published in parts → passes

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/verify-skill-protocol-compliance]`
> **Related Behaviors:** `rule/skills/protocol-guide-entry`
> **CoveredBy:** `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs::TC-PDL-032` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs:375` (passed in P48; not re-run at the final gate)

---

#### TC-PDL-033: Full text and a guide for one protocol in the same file fail; full text in a reference passes [P1]

**Objective:** Prove the check rejects a double carrier in one file and accepts a guide in the main file with the body in a reference.

**Business Intent / Invariant Guarded:** Two forms in one file double the cost; a body in a reference is the decided layout (BR-PDL-01, BR-PDL-12).

**Traces:** AC-PDL-22 / BR-PDL-01

**Preconditions:**

- Fixture skills for both layouts

**Real-World Reachability:** A partial conversion, or a mode section moved to a reference.

**Demo Flow:** Run the check on both layouts.

```gherkin
Given full text and a guide for one protocol in the same file
When the check runs
Then it fails
Given the full text in a reference file and the guide in the main file
Then it passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Checks the layout                                                                                                                                                     |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | Fail, then pass                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Reference layout accepted
- ❌ Double carrier accepted

**Test Data:**

```yaml
inputDomain: 'any file with a protocol'
invariant: 'for ALL files at most one form of each protocol appears'
boundaryCounterCase: 'body in a reference, guide in the main file → passes'
```

**Edge Cases:**

- A reminder next to a guide → not a double carrier

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: operation/scripts/verify-skill-protocol-compliance]`
> **Related Behaviors:** `rule/skills/reference-carriers`
> **CoveredBy:** `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs::TC-PDL-033` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs:386` (passed in P48; not re-run at the final gate)

---

#### TC-PDL-040: Every guide entry in the converted tree points at published text that exists [P1]

**Objective:** Prove every guide path in the converted tree resolves.

**Business Intent / Invariant Guarded:** The read-by-path fallback is only real when every path exists (BR-PDL-01).

**Traces:** AC-PDL-22 / BR-PDL-01

**Preconditions:**

- The fully converted framework

**Real-World Reachability:** The release close after conversion.

**Demo Flow:** Resolve every guide path.

```gherkin
Given every guide entry
When each path is checked
Then the published file exists
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Resolves every path                                                                                                                                                   |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | Pass, or the missing paths                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Every path exists
- ❌ Any missing path

**Test Data:**

```yaml
inputDomain: 'any guide entry in the tree'
invariant: 'for ALL entries the path exists'
boundaryCounterCase: 'a deleted published file → fails naming the entry'
```

**Edge Cases:**

- A relocated root → paths resolve under it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-guide-entry]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-040` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:827` "TC-PDL-040: every guide line is the published line for its tag and its projection file exists" (written in P50, never executed; not run at the final gate)

---

#### TC-PDL-065: Every protocol sensor accepts a guide entry in place of the body and fails when both are missing [P1]

**Objective:** Prove each framework check that looks for a protocol body passes a guide entry with its reminder and fails when neither is present.

**Business Intent / Invariant Guarded:** Checks written for full bodies would fail every converted skill, or pass a skill that lost the protocol (BR-PDL-14).

**Traces:** AC-PDL-22 / BR-PDL-14

**Preconditions:**

- A fixture skill with a guide entry and reminder instead of the body, per check

**Real-World Reachability:** Every sync verification after conversion.

**Demo Flow:** Run each check on the guide fixture, then on the fixture with the guide removed.

```gherkin
Given a skill that holds a guide entry and reminder instead of the body
When each protocol check runs
Then it passes
When the guide entry is also removed
Then it fails
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Accepts guides                                                                                                                                                        |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | Pass, then fail                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Guide accepted
- ✅ Missing protocol caught
- ❌ A converted skill failing
- ❌ A skill with neither passing

**Test Data:**

```yaml
inputDomain: 'any protocol a check looks for'
invariant: 'for ALL checks a guide with reminder passes and neither fails'
boundaryCounterCase: 'agents → still require the full body'
```

**Edge Cases:**

- A protocol with no reminder variant → guide alone passes

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-carrier-parity]`
> **Related Behaviors:** `operation/scripts/verify-sync-adoption-parity` · `operation/scripts/verify-skill-protocol-compliance`
> **CoveredBy:** `.claude/scripts/codex/tests/verify-sync-adoption-parity.test.mjs::TC-PDL-065`, `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs::TC-PDL-065`, `.claude/hooks/tests/suites/project-reference-gate-coverage.test.cjs::TC-PDL-065`, `.claude/hooks/tests/suites/protocol-text-parity.test.cjs::TC-PDL-065`, `.claude/scripts/codex/tests/framework-policy-regressions.test.mjs::TC-PDL-065`, `.claude/scripts/codex/tests/review-policy-consumers.test.mjs::TC-PDL-065`, `.claude/hooks/tests/suites/prompt-ledger.test.cjs::TC-PDL-065`, `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-065`, `.claude/scripts/codex/tests/round3-prompt-contract.test.mjs::TC-PDL-065`, `.claude/scripts/tests/experience-config.test.cjs::TC-PDL-065`, `.claude/hooks/tests/suites/agent-universal-rules.test.cjs::TC-PDL-065` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs:350` "TC-PDL-065a: the guide-block hint stays inside the recognizer's block marker", `.claude/scripts/codex/tests/verify-sync-adoption-parity.test.mjs:206` "TC-PDL-065: a guide entry + reminder + projection satisfies the main-block assertion", `.claude/hooks/tests/suites/project-reference-gate-coverage.test.cjs:206` "TC-PDL-065 TC-PRG-002 accepts a guide entry + reminder backed by a projection file, and fails when both forms are missing" (passed in P48; not re-run at the final gate). P27 sensor cases N1–N8, written in P27, never executed, not run at the final gate: `.claude/scripts/codex/tests/framework-policy-regressions.test.mjs:559` "integration-test-verify protocol carrier check accepts a guide entry backed by its projection (TC-PDL-065, N1)", `.claude/scripts/codex/tests/review-policy-consumers.test.mjs:520` "TC-PDL-065 visual-consumer check (R3-PROMPT-031) accepts a guide entry backed by a canonical projection (N2)", `.claude/scripts/codex/tests/round3-prompt-contract.test.mjs:160` "TC-PDL-065 R3-PROMPT-030 reads a guide carrier through its projection only while the guide is present (N3)", `.claude/scripts/tests/experience-config.test.cjs:673` "TC-PDL-065 the e2e-test non-vacuity mutant reads a guide carrier through its projection (N4)", `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:468` "TC-PDL-065 COVERAGE counts a review-protocol-injection guide carrier only while its projection equals canonical" (N5), `.claude/hooks/tests/suites/agent-universal-rules.test.cjs:486` "[agent-universal-rules] TC-PDL-065 TC-UAR-009/-010/-013 accept a skill guide carrier only while its projection exists" (N6–N8)

---

#### TC-PDL-066: Skill injectors do not re-insert a body into a converted skill [P1]

**Objective:** Prove every skill injector respects a guide entry and still refreshes the reminder.

**Business Intent / Invariant Guarded:** An injector that re-inserted bodies would undo conversion on its next run (BR-PDL-14).

**Traces:** AC-PDL-22 / BR-PDL-14

**Preconditions:**

- A temporary project with one converted skill

**Real-World Reachability:** A maintainer runs the framework injectors.

**Demo Flow:** Run every skill injector and read the skill.

```gherkin
Given a converted skill
When every skill injector runs
Then no body is inserted
And the reminder is refreshed
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Respects guides                                                                                                                                                       |
| **Business data state** | Skill stays converted                                                                                                                                                 |
| **Data shown on UI**    | The skill                                                                                                                                                             |

**Acceptance Criteria:**

- ✅ No body inserted
- ✅ Reminder current
- ❌ A body re-inserted

**Test Data:**

```yaml
inputDomain: 'any injector'
invariant: 'for ALL injectors a converted skill gains no body'
boundaryCounterCase: 'an unconverted skill → the body is refreshed as before'
```

**Edge Cases:**

- An inline skill → bodies refreshed as before

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-carrier-parity]`
> **Related Behaviors:** `test/scripts/injectors-respect-guides`
> **CoveredBy:** `.claude/scripts/tests/injectors-respect-guides.test.cjs::TC-PDL-066` · **Status:** Implemented — evidence: `.claude/scripts/tests/injectors-respect-guides.test.cjs:244` (passed in P49; not re-run at the final gate)

---

#### TC-PDL-083: A guide entry in an inline skill fails verification by name [P0]

**Objective:** Prove the check rejects any guide entry in a skill on the inline list.

**Business Intent / Invariant Guarded:** An inline skill receives nothing by delivery, so a guide there would silently lose the full body (BR-PDL-11).

**Traces:** AC-PDL-07 / BR-PDL-11

**Preconditions:**

- A fixture tree whose group data lists skill S as inline

**Real-World Reachability:** A conversion run that ignores the inline list.

**Demo Flow:** Run the check with a guide in S, then with only full bodies.

```gherkin
Given skill S on the inline list
When S carries a guide entry
Then the check fails naming S
When S carries only full bodies
Then it passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Enforces the inline list                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | Fail naming S, then pass                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Guide in S rejected
- ❌ Guide in S accepted

**Test Data:**

```yaml
inputDomain: 'any inline skill'
invariant: 'for ALL inline skills a guide entry fails the check'
boundaryCounterCase: 'S removed from the inline list → the guide is accepted'
```

**Edge Cases:**

- The inline list is read from the group data, never assumed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/inline-skills]`
> **Related Behaviors:** `operation/scripts/verify-skill-protocol-compliance`
> **CoveredBy:** `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs::TC-PDL-083` · **Status:** Implemented — evidence: `.claude/scripts/codex/tests/verify-skill-protocol-compliance.test.mjs:400` (passed in P48; not re-run at the final gate)

---

#### TC-PDL-084: Pinned rule fragments count when a converted skill's published text holds them [P1]

**Objective:** Prove the text-presence checks for the test-execution and fault-adjudication rules accept a guide entry when the published text holds every pinned fragment.

**Business Intent / Invariant Guarded:** These checks pin exact rule wording; after conversion the wording lives in the published text, and losing it must still fail (BR-PDL-14).

**Traces:** AC-PDL-22 / BR-PDL-14

**Preconditions:**

- A fixture family skill with a guide entry and a published text holding every pinned fragment

**Real-World Reachability:** The spec-and-test group is converted.

**Demo Flow:** Run the check, then remove a fragment, then remove the guide.

```gherkin
Given a family skill with a guide entry and a published text holding every pinned fragment
When the text-presence check runs
Then it passes
When the published text lacks one fragment, or the guide entry is removed
Then it fails naming the skill and rule
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Checks fragments through the guide                                                                                                                                    |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | Pass, then fail with names                                                                                                                                            |

**Acceptance Criteria:**

- ✅ Guide plus full fragments accepted
- ❌ A missing fragment accepted

**Test Data:**

```yaml
inputDomain: 'any pinned fragment'
invariant: 'for ALL fragments either the skill or its guided published text holds it'
boundaryCounterCase: 'a fragment in neither → fails'
```

**Edge Cases:**

- A skill that still holds the fragments inline → passes as before

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-carrier-parity]`
> **Related Behaviors:** `test/hooks/content-presence`
> **CoveredBy:** `.claude/hooks/tests/suites/content-presence.test.cjs::TC-PDL-084` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/content-presence.test.cjs:793` (passed in P48; not re-run at the final gate)

---

### Conversion Tests

> The converted tree and the compliance hold (US-PDL-02, US-PDL-03, US-PDL-04).

#### TC-PDL-035: After conversion, only inline skills and agents carry the four root-carried bodies [P0]

**Objective:** Prove the root-carried bodies left every converted skill and stayed in inline skills and agents.

**Business Intent / Invariant Guarded:** The root file carries the four rules; converted skills must not repeat them and inline skills and agents must keep them (BR-PDL-04).

**Traces:** AC-PDL-09 / BR-PDL-04

**Preconditions:**

- The framework after root-carried conversion

**Real-World Reachability:** The first conversion step of the release.

**Demo Flow:** Scan every skill and agent.

```gherkin
Given every skill outside the inline list
When it is scanned
Then none carries the four root-carried bodies
And every inline skill and every agent still does
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Scans carriers                                                                                                                                                        |
| **Business data state** | Bodies only where decided                                                                                                                                             |
| **Data shown on UI**    | Pass, or the offending files                                                                                                                                          |

**Acceptance Criteria:**

- ✅ Bodies only in inline skills and agents
- ❌ A converted skill with a body
- ❌ An agent without one

**Test Data:**

```yaml
inputDomain: 'any skill or agent'
invariant: 'for ALL converted skills the four bodies are absent and for ALL inline skills and agents present'
boundaryCounterCase: 'a body re-added to a converted skill → fails'
```

**Edge Cases:**

- A reference file → keeps its bodies

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-root-carried]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-035` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:654` "TC-PDL-035: after conversion only the inline skills and the agents carry the four root-carried bodies" (passed in P26; not re-run at the final gate)

---

#### TC-PDL-036: Every former carrier of a root-carried protocol keeps a guide entry and the reminder [P1]

**Objective:** Prove each skill that used to carry the four bodies now holds one guide entry per protocol and the reminder.

**Business Intent / Invariant Guarded:** A project that switches the universal requirement off still needs a path to each rule (BR-PDL-04, BR-PDL-01).

**Traces:** AC-PDL-09, AC-PDL-10 / BR-PDL-04, BR-PDL-01

**Preconditions:**

- The framework after root-carried conversion

**Real-World Reachability:** The first conversion step of the release.

**Demo Flow:** Scan every former carrier.

```gherkin
Given each former carrier outside the inline list
When it is scanned
Then it has one guide entry per root-carried protocol
And the reminder digest
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Scans guides                                                                                                                                                          |
| **Business data state** | Guides and reminders present                                                                                                                                          |
| **Data shown on UI**    | Pass, or the offending files                                                                                                                                          |

**Acceptance Criteria:**

- ✅ One entry per protocol
- ✅ Reminder kept
- ❌ A missing entry or reminder

**Test Data:**

```yaml
inputDomain: 'any former carrier'
invariant: 'for ALL former carriers one entry per protocol and the reminder exist'
boundaryCounterCase: 'an entry removed → fails'
```

**Edge Cases:**

- A skill that never carried a body → not a former carrier

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-guide-entry]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-036` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:687` "TC-PDL-036: every former carrier of a root-carried protocol keeps one current guide line per protocol and its reminder" (passed in P26; not re-run at the final gate)

---

#### TC-PDL-037: The framework's root instruction files carry all four root-carried rules [P0]

**Objective:** Prove the root instruction files of the framework repository hold the four rules the skills no longer repeat.

**Business Intent / Invariant Guarded:** Removing the bodies from skills is only safe if the root files carry them (BR-PDL-04).

**Traces:** AC-PDL-09 / BR-PDL-04

**Preconditions:**

- The framework repository's root instruction files

**Real-World Reachability:** Every session in the framework repository.

**Demo Flow:** Scan both root instruction files.

```gherkin
Given the framework repository
When its root instruction files are scanned
Then all four rules are present
And in any other project the case reports skipped with the reason that it checks the framework repository's own root files
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Scans root files                                                                                                                                                      |
| **Business data state** | Four rules present                                                                                                                                                    |
| **Data shown on UI**    | Pass, or skipped with its reason                                                                                                                                      |

**Acceptance Criteria:**

- ✅ All four present
- ❌ A rule missing
- ❌ A pass reported in another project

**Test Data:**

```yaml
inputDomain: 'the root instruction files'
invariant: 'for ALL root files the four rules are present'
boundaryCounterCase: 'another project → skipped; its coverage is TC-PDL-038'
```

**Edge Cases:**

- A root file regenerated without a rule → fails

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-root-carried]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-037` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:747` "TC-PDL-037: the framework root instruction files carry all four root-carried rules" (passed in P26; not re-run at the final gate; expected red until `/sync-codex` restamps the root files after the P29 canonical change)

---

#### TC-PDL-038: A project without the universal requirement receives the four texts on a converted skill load [P1]

**Objective:** Prove the adopter path: the universal group delivers the four root-carried texts.

**Business Intent / Invariant Guarded:** Adopting projects that do not rely on the root file must still receive the four rules (BR-PDL-04).

**Traces:** AC-PDL-10 / BR-PDL-04

**Preconditions:**

- A fixture project with the universal requirement off
- A converted skill

**Real-World Reachability:** A project switches the requirement off.

**Demo Flow:** Load a converted skill.

```gherkin
Given the universal requirement is off
When a converted skill loads
Then the universal group delivers the four texts
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers the universal group                                                                                                                                          |
| **Business data state** | Four records written                                                                                                                                                  |
| **Data shown on UI**    | The universal message                                                                                                                                                 |

**Acceptance Criteria:**

- ✅ Four texts delivered
- ❌ Any of the four missing

**Test Data:**

```yaml
inputDomain: 'any converted skill'
invariant: 'for ALL converted skills the universal group delivers the four'
boundaryCounterCase: 'the requirement on → nothing'
```

**Edge Cases:**

- The four texts exceed one bin after growth → overflow named by path

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/hooks/protocol-root-carried]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-038` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/protocol-delivery.test.cjs:457` "TC-PDL-038 a project without the universal requirement receives the four texts on a converted skill load" (passed in P23, extended and re-run in P26; not re-run at the final gate)

---

#### TC-PDL-039: After full conversion no main skill file outside the inline list holds a protocol body [P0]

**Objective:** Prove conversion is complete and every decided full-text carrier kept its bodies equal to canonical.

**Business Intent / Invariant Guarded:** A leftover body doubles cost; a lost body in an inline skill, reference file or agent loses a rule (BR-PDL-11, BR-PDL-12).

**Traces:** AC-PDL-07, AC-PDL-08 / BR-PDL-11, BR-PDL-12

**Preconditions:**

- The fully converted framework

**Real-World Reachability:** The last conversion step of the release.

**Demo Flow:** Scan every main skill file, reference file and agent.

```gherkin
Given every main skill file outside the inline list
When it is scanned
Then no full protocol body remains, reminders excepted
Given the five inline skills, every reference file and every agent
When they are scanned
Then each still holds its full bodies, equal to canonical
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Scans all carriers                                                                                                                                                    |
| **Business data state** | Bodies only where decided                                                                                                                                             |
| **Data shown on UI**    | Pass, or the offending files                                                                                                                                          |

**Acceptance Criteria:**

- ✅ No leftover body
- ✅ Every decided carrier intact
- ❌ A leftover body
- ❌ A lost or stale body

**Test Data:**

```yaml
inputDomain: 'any carrier in the tree'
invariant: 'for ALL main files outside the inline list no body remains and for ALL decided carriers every body equals canonical'
boundaryCounterCase: 'a stale body in a reference file → fails'
```

**Edge Cases:**

- An override copy → exempt as before

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/inline-skills]`
> **Related Behaviors:** `rule/skills/reference-carriers` · `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-039` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs:786` "TC-PDL-039: converted skills hold no full protocol body; inline skills, references and agents keep canonical full bodies and no guide" (written in P50, never executed; not run at the final gate)

---

#### TC-PDL-041: Live: a converted review-group skill receives its protocols once; an inline skill receives none [P1]

**Objective:** Prove on a real primary-host session that delivery arrives once for a converted skill and never for an inline skill.

**Business Intent / Invariant Guarded:** Automated cases prove the parts; a live run proves the host delivers what the parts promise (BR-PDL-02, BR-PDL-11).

**Traces:** AC-PDL-01, AC-PDL-07 / BR-PDL-02, BR-PDL-11

**Preconditions:**

- The review group converted
- A live primary-host session

**Real-World Reachability:** A developer runs a review-group skill after conversion.

**Demo Flow:** Load a converted review-group skill twice and an inline skill once; read the session transcript.

```gherkin
Given a converted review-group skill in a live session
When it loads
Then the review group messages arrive once
Given one of the five inline skills
When it loads
Then no protocol group message arrives for it
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers per the rules                                                                                                                                                |
| **Business data state** | Transcript evidence recorded                                                                                                                                          |
| **Data shown on UI**    | The session transcript                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Once for the converted skill
- ✅ None for the inline skill
- ❌ A repeat
- ❌ Any group for the inline skill

**Test Data:**

```yaml
inputDomain: 'live primary-host sessions'
invariant: 'for ALL loads in a session each protocol arrives at most once and never for an inline skill'
boundaryCounterCase: 'a second load after compaction → arrives again'
```

**Edge Cases:**

- Evidence is the host transcript, never the assistant's own report

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: requirement/hooks/protocol-live-delivery]`
> **Related Behaviors:** `operation/hooks/protocol-inject`
> **CoveredBy:** `Manual-QC` (transcript evidence recorded under the project `tmp/metrics/` folder) · **Status:** Planned — deferred to after commit: the live smoke needs a live assistant session on the committed, converted tree. Like the other live runs (P47 fixture build, P39 A/B replay), it runs after the commit (owner directive P38, round 2).

---

#### TC-PDL-063: Review compliance does not drop after conversion [P0]

**Objective:** Prove the same review, run before and after conversion, passes every compliance check afterwards that it passed before.

**Business Intent / Invariant Guarded:** Shrinking text must not lower compliance; a regression holds the next group (BR-PDL-05).

**Traces:** AC-PDL-06 / BR-PDL-05

**Preconditions:**

- Before and after review transcripts on one fixed change
- The compliance checklist

**Real-World Reachability:** The review group is converted, then the release closes.

**Demo Flow:** Score both transcripts with the checklist.

```gherkin
Given before and after review transcripts on the same change
When they are scored with the compliance checklist
Then no check that passed before fails after
And the checks that reviewer prompts carry all protocol sections, that the full mode reads its reference and that the fix loop reads its reference first pass after
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Scores compliance                                                                                                                                                     |
| **Business data state** | Per-check results recorded                                                                                                                                            |
| **Data shown on UI**    | The scored checklist                                                                                                                                                  |

**Acceptance Criteria:**

- ✅ No regression
- ❌ A regression that repeats on re-run

**Test Data:**

```yaml
inputDomain: 'any check on the checklist'
invariant: 'for ALL checks that passed before, they pass after'
boundaryCounterCase: 'a regression confirmed on one re-run → the next conversion is held for the owner'
```

**Edge Cases:**

- A regression that does not repeat on re-run → recorded, not blocking

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: requirement/hooks/review-compliance]`
> **Related Behaviors:** `rule/hooks/protocol-fail-open`
> **CoveredBy:** `Manual-QC` (per-check results recorded under the project `tmp/metrics/` folder) · **Status:** Planned — deferred to after commit: the compliance hold was not run. It needs live before-and-after `/workflow-review-changes` runs on a seeded fixture diff, scored against the P30 checklist. Live runs wait until after the commit (owner directive P38, round 2).

---

### Mode Section Tests

> Mode-only sections at point of use (US-PDL-08).

#### TC-PDL-043: The reasoning review skill's main file holds the validate path and every protocol body, not the full-mode sections [P1]

**Objective:** Prove the main file of the reasoning review skill shrinks to the validate path while keeping every protocol body and reminder.

**Business Intent / Invariant Guarded:** A validate run should not pay for the full review; a lost body would lose a rule (BR-PDL-07, BR-PDL-11).

**Traces:** AC-PDL-19 / BR-PDL-07

**Preconditions:**

- The reasoning review skill after the split

**Real-World Reachability:** Every validate run of the reasoning review skill.

**Demo Flow:** Measure and read the main file.

```gherkin
Given the reasoning review skill
When its main file is measured and read
Then it is at most 140,000 bytes
And it holds the validate routine and the recursion guard
And none of the moved full-mode sections and no fix-loop section
And every full protocol body and reminder it carried before
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Main file split                                                                                                                                                       |
| **Business data state** | Every body kept                                                                                                                                                       |
| **Data shown on UI**    | Size and sections                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Within 140,000 bytes
- ✅ Every body kept
- ❌ A moved section still present
- ❌ A body lost

**Test Data:**

```yaml
inputDomain: 'the main file'
invariant: 'for ALL protocol bodies carried before the split each is still present'
boundaryCounterCase: 'a body moved to a reference → fails'
```

**Edge Cases:**

- The size limit is the owner-accepted figure, not a target

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/review-mode-sections]`
> **Related Behaviors:** `test/scripts/review-mode-sections`
> **CoveredBy:** `.claude/hooks/tests/suites/review-mode-sections.test.cjs::TC-PDL-043` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/review-mode-sections.test.cjs:426` "[review-mode-sections] TC-PDL-043: a valid fixture split passes; each broken clause is named", `.claude/hooks/tests/suites/review-mode-sections.test.cjs:473` "[review-mode-sections] TC-PDL-043: why-review router is under 140,000 B and keeps every protocol body" (written in P28, never executed; not run at the final gate)

---

#### TC-PDL-044: Full mode reads its reference file first [P1]

**Objective:** Prove the full mode's first action is to read the full-mode reference.

**Business Intent / Invariant Guarded:** A moved section is only safe when the mode is forced to read it (BR-PDL-07).

**Traces:** AC-PDL-19 / BR-PDL-07

**Preconditions:**

- The reasoning review skill after the split

**Real-World Reachability:** Every full review run.

**Demo Flow:** Read the full-mode router.

```gherkin
Given the router
When it is read
Then the full mode's first action reads the full-mode reference
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Blocking pointer present                                                                                                                                              |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | The router text                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ First action reads the reference
- ❌ The read comes later or is optional

**Test Data:**

```yaml
inputDomain: 'the router'
invariant: 'for ALL full-mode entries the first action is the reference read'
boundaryCounterCase: 'the pointer moved after another step → fails'
```

**Edge Cases:**

- The live read is checked in the compliance run (TC-PDL-063)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/review-mode-sections]`
> **Related Behaviors:** `test/scripts/review-mode-sections`
> **CoveredBy:** `.claude/hooks/tests/suites/review-mode-sections.test.cjs::TC-PDL-044` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/review-mode-sections.test.cjs:454` "[review-mode-sections] TC-PDL-044: the fixture pointer is the first full-mode action; a late or soft pointer is named", `.claude/hooks/tests/suites/review-mode-sections.test.cjs:486` "[review-mode-sections] TC-PDL-044: why-review full mode reads references/full-mode.md first" (written in P28, never executed; not run at the final gate)

---

#### TC-PDL-045: The review-coverage verifier and pinned suites still pass after the split with every assertion intact [P1]

**Objective:** Prove the split breaks none of the existing review checks.

**Business Intent / Invariant Guarded:** Moving text must not silently disable a review guard (BR-PDL-07).

**Traces:** AC-PDL-19 / BR-PDL-07

**Preconditions:**

- The split review skill

**Real-World Reachability:** Every sync verification.

**Demo Flow:** Run the review-coverage verifier and the pinned suites.

```gherkin
Given the review-coverage verifier and the four pinned suites
When they run after the split
Then all pass
And every original assertion and mutant is intact
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Checks pass                                                                                                                                                           |
| **Business data state** | No assertion removed                                                                                                                                                  |
| **Data shown on UI**    | Passing runs                                                                                                                                                          |

**Acceptance Criteria:**

- ✅ All pass, unchanged
- ❌ An assertion removed to pass

**Test Data:**

```yaml
inputDomain: 'the pinned checks'
invariant: 'for ALL assertions present before the split they still run and pass'
boundaryCounterCase: 'an assertion deleted → fails the comparison'
```

**Edge Cases:**

- A check that reads references too → still passes

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/review-mode-sections]`
> **Related Behaviors:** `operation/scripts/verify-review-validate-coverage`
> **CoveredBy:** `.claude/hooks/tests/suites/review-mode-sections.test.cjs::TC-PDL-045`, `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,scripts-tests,review-validate-coverage` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/review-mode-sections.test.cjs:495` "[review-mode-sections] TC-PDL-045: the coverage verifier and the four pinned why-review suites pass after the split" (written in P28, never executed; not run at the final gate)

---

#### TC-PDL-046: Fix-loop sections live in a reference file; every protocol body stays in the main file [P1]

**Objective:** Prove the change review and the review workflow moved their fix-loop sections out and kept every body.

**Business Intent / Invariant Guarded:** A normal review should not pay for the fix loop; the fix loop must still be read when it runs (BR-PDL-07).

**Traces:** AC-PDL-19 / BR-PDL-07

**Preconditions:**

- The change review skill and the review workflow skill after the split

**Real-World Reachability:** Every review run.

**Demo Flow:** Read both main files and the fix-loop reference, then run the pinned suites.

```gherkin
Given the change review skill and the review workflow skill
When they are read
Then the fix-loop bodies are absent from the main file and a blocking pointer is present
And every full protocol body each carried before is still in its main file
And the moved section keeps its markers
And the pinned suites pass on the main file and references with every assertion intact
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Split verified                                                                                                                                                        |
| **Business data state** | Every body kept                                                                                                                                                       |
| **Data shown on UI**    | Sections and passing runs                                                                                                                                             |

**Acceptance Criteria:**

- ✅ Fix loop moved
- ✅ Bodies kept
- ❌ A body moved
- ❌ An assertion removed

**Test Data:**

```yaml
inputDomain: 'both skills'
invariant: 'for ALL protocol bodies carried before, each is still in the main file'
boundaryCounterCase: 'the pointer removed → fails'
```

**Edge Cases:**

- The live read order is checked in the compliance run (TC-PDL-063)

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/review-mode-sections]`
> **Related Behaviors:** `test/scripts/review-mode-sections`
> **CoveredBy:** `.claude/hooks/tests/suites/review-mode-sections.test.cjs::TC-PDL-046`, `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,scripts-tests,wf-cycle` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/review-mode-sections.test.cjs:509` "[review-mode-sections] TC-PDL-046: a valid fixture fix-loop split passes; each broken clause is named", `.claude/hooks/tests/suites/review-mode-sections.test.cjs:539` "[review-mode-sections] TC-PDL-046: changes-review and workflow-review-changes read references/fix-loop.md first and keep every protocol body", `.claude/hooks/tests/suites/review-mode-sections.test.cjs:554` "[review-mode-sections] TC-PDL-046: the suites that pin the moved fix-loop text and the wf-cycle verifier pass" (written in P40, never executed; not run at the final gate)

---

#### TC-PDL-064: The reviewer injection template is published whole and copied wholesale [P0]

**Objective:** Prove the published reviewer injection template equals the canonical body with every section, and both review skills copy it wholesale.

**Business Intent / Invariant Guarded:** Reviewer agents start with nothing; a template reduced to paths would send reviewers without their protocols (BR-PDL-07, BR-PDL-11).

**Traces:** AC-PDL-19 / BR-PDL-07, BR-PDL-11

**Preconditions:**

- The published text and both review skills

**Real-World Reachability:** Every review that starts reviewer agents.

**Demo Flow:** Compare the published template with the canonical body and read the start steps.

```gherkin
Given the published text
When it is built
Then the reviewer injection template byte-matches the canonical body, with all eleven protocol sections and their bodies and none replaced by a path
When the start steps are read
Then the review workflow names that file and says to copy it wholesale
And the change review still holds the full template inline, equal to canonical, and says to copy it wholesale
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Template whole                                                                                                                                                        |
| **Business data state** | Equal to canonical                                                                                                                                                    |
| **Data shown on UI**    | Comparison and step text                                                                                                                                              |

**Acceptance Criteria:**

- ✅ Whole template
- ✅ Wholesale copy instruction
- ❌ A section replaced by a path

**Test Data:**

```yaml
inputDomain: 'the template'
invariant: 'for ALL eleven sections the body is present in the published file'
boundaryCounterCase: 'a section replaced by a path → fails'
```

**Edge Cases:**

- The template is the one protocol allowed over 9,000 characters

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/review-mode-sections]`
> **Related Behaviors:** `rule/skills/inline-skills` · `test/scripts/review-mode-sections`
> **CoveredBy:** `.claude/hooks/tests/suites/review-mode-sections.test.cjs::TC-PDL-064` · **Status:** Implemented — evidence: `.claude/hooks/tests/suites/review-mode-sections.test.cjs:566` "[review-mode-sections] TC-PDL-064: a valid fixture injection template passes; each broken clause is named", `.claude/hooks/tests/suites/review-mode-sections.test.cjs:600` "[review-mode-sections] TC-PDL-064: the generated injection template equals canonical and both spawn steps copy it WHOLESALE" (written in P40, never executed; not run at the final gate)

---

### Compression Tests

> Smaller protocols that keep every rule (US-PDL-09).

#### TC-PDL-047: No published protocol exceeds 9,000 characters except the reviewer injection template [P2]

**Objective:** Prove compression brought every protocol but one under the target.

**Business Intent / Invariant Guarded:** Smaller protocols fit more per bin and cost less per load (BR-PDL-03, BR-PDL-14).

**Traces:** AC-PDL-24 / BR-PDL-03

**Preconditions:**

- The published text after compression

**Real-World Reachability:** The compression step of the release.

**Demo Flow:** Measure every published protocol.

```gherkin
Given the published text
When every protocol is measured
Then none exceeds 9,000 characters
Except the reviewer injection template
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Sizes measured                                                                                                                                                        |
| **Business data state** | Within target                                                                                                                                                         |
| **Data shown on UI**    | The size list                                                                                                                                                         |

**Acceptance Criteria:**

- ✅ Every protocol within target
- ❌ Another protocol over 9,000

**Test Data:**

```yaml
inputDomain: 'any published protocol'
invariant: 'for ALL protocols except the template the size is at most 9,000'
boundaryCounterCase: 'a protocol of 9,001 characters → fails naming it'
```

**Edge Cases:**

- A protocol grows after an edit → fails until compressed

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-compression]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-047` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:436` "TC-PDL-047: the size check flags a body one char over the limit and spares only the exempt tag", `.claude/scripts/tests/build-protocol-projection.test.cjs:449` "TC-PDL-047/TC-PDL-049: no shipped protocol body exceeds 9,000 chars except review-protocol-injection, and --check passes" (written in P29, never executed; not run at the final gate)

---

#### TC-PDL-048: Every rule of a compressed protocol maps to its new text [P1]

**Objective:** Prove compression lost no rule, checked rule by rule.

**Business Intent / Invariant Guarded:** Compression must keep every rule; nuance loss is the main risk (BR-PDL-14).

**Traces:** AC-PDL-24 / BR-PDL-14

**Preconditions:**

- A parity table of old rules and new text per compressed protocol

**Real-World Reachability:** The compression step of the release.

**Demo Flow:** Review the parity table.

```gherkin
Given the parity table
When it is reviewed
Then every old rule maps to new text
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Parity reviewed                                                                                                                                                       |
| **Business data state** | Table complete                                                                                                                                                        |
| **Data shown on UI**    | The parity table                                                                                                                                                      |

**Acceptance Criteria:**

- ✅ Every rule mapped
- ❌ A rule with no new text

**Test Data:**

```yaml
inputDomain: 'any compressed protocol'
invariant: 'for ALL old rules a mapping to new text exists'
boundaryCounterCase: 'a dropped rule → compression reverted for that protocol'
```

**Edge Cases:**

- Two old rules merged into one sentence → both mapped to it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-compression]`
> **Related Behaviors:** `rule/skills/protocol-carrier-parity`
> **CoveredBy:** `Manual-QC` (parity review at the release close) · **Status:** Planned — deferred: this is a manual review of the P29 parity table under the project `tmp/reports/` folder, which maps each old rule to its new text for the 10 compressed tags. The review has not happened. It belongs to the P30 release gate.

---

#### TC-PDL-049: The freshness check passes after compression [P1]

**Objective:** Prove the published text was rebuilt after the compressed canonical edits.

**Business Intent / Invariant Guarded:** Compression edits the canonical source; stale published text would deliver the old wording (BR-PDL-13).

**Traces:** AC-PDL-20 / BR-PDL-13

**Preconditions:**

- The compressed canonical source and rebuilt published text

**Real-World Reachability:** The compression step of the release.

**Demo Flow:** Run the freshness check.

```gherkin
Given the compressed canonical source
When the freshness check runs
Then it passes
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Freshness confirmed                                                                                                                                                   |
| **Business data state** | No change                                                                                                                                                             |
| **Data shown on UI**    | A pass                                                                                                                                                                |

**Acceptance Criteria:**

- ✅ Passes
- ❌ Fails because the text was not rebuilt

**Test Data:**

```yaml
inputDomain: 'the compressed state'
invariant: 'for ALL compressed protocols the published text is fresh'
boundaryCounterCase: 'a compressed edit without a rebuild → fails'
```

**Edge Cases:**

- Parts re-split after compression → still fresh

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/scripts/protocol-projection]`
> **Related Behaviors:** `operation/scripts/build-protocol-projection`
> **CoveredBy:** `.claude/scripts/tests/build-protocol-projection.test.cjs::TC-PDL-049` · **Status:** Implemented — evidence: `.claude/scripts/tests/build-protocol-projection.test.cjs:449` "TC-PDL-047/TC-PDL-049: no shipped protocol body exceeds 9,000 chars except review-protocol-injection, and --check passes" (written in P29, never executed; not run at the final gate)

---

#### TC-PDL-062: Agent carriers equal the compressed canonical text; override copies stay unchanged [P1]

**Objective:** Prove propagation after compression updated every agent carrier and left the override copies alone.

**Business Intent / Invariant Guarded:** Agents keep full text; they must carry the current wording (BR-PDL-14).

**Traces:** AC-PDL-21 / BR-PDL-14

**Preconditions:**

- The compressed canonical source after propagation

**Real-World Reachability:** The compression step of the release.

**Demo Flow:** Compare every agent carrier with canonical and check the override copies.

```gherkin
Given the compressed protocols and propagation has run
When every agent carrier is compared
Then each equals canonical
And the three override copies of the reviewer injection template are unchanged
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Carriers verified                                                                                                                                                     |
| **Business data state** | Equal to canonical                                                                                                                                                    |
| **Data shown on UI**    | Comparison result                                                                                                                                                     |

**Acceptance Criteria:**

- ✅ Every agent carrier equal
- ❌ A stale agent carrier
- ❌ An override copy changed

**Test Data:**

```yaml
inputDomain: 'any agent carrier'
invariant: 'for ALL agent carriers the body equals canonical'
boundaryCounterCase: 'an override copy → exempt'
```

**Edge Cases:**

- An agent carrying a protocol that was not compressed → unchanged

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-carrier-parity]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-062` · **Status:** Planned

---

### Conditional Pruning Tests

> Run only if the pruning follow-up is triggered (US-PDL-09).

#### TC-PDL-050: Pruned protocols are gone from the audited skills' guide lists [P2]

**Objective:** Prove the pruning follow-up removed the pruned protocols from each audited skill.

**Business Intent / Invariant Guarded:** Pruning only pays off if the pruned protocols stop being delivered (BR-PDL-14).

**Traces:** AC-PDL-25 / BR-PDL-14

**Preconditions:**

- The pruning follow-up has run on its audited skills

**Real-World Reachability:** Runs only if delivered protocol text is still a top-three cost after de-duplication.

**Demo Flow:** Parse the audited skills' guide lists.

```gherkin
Given the audited skills
When their guide lists are parsed
Then no pruned protocol remains
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Guide lists pruned                                                                                                                                                    |
| **Business data state** | Pruned protocols absent                                                                                                                                               |
| **Data shown on UI**    | Guide lists                                                                                                                                                           |

**Acceptance Criteria:**

- ✅ No pruned protocol
- ❌ A pruned protocol still listed

**Test Data:**

```yaml
inputDomain: 'any audited skill'
invariant: 'for ALL pruned protocols none remains in the audited skill'
boundaryCounterCase: 'the trigger did not fire → case Untested with its reason'
```

**Edge Cases:**

- A protocol pruned from one skill → still listed in others that use it

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-prune]`
> **Related Behaviors:** `test/hooks/sync-carrier-parity`
> **CoveredBy:** `.claude/hooks/tests/suites/sync-carrier-parity.test.cjs::TC-PDL-050` · **Status:** Untested — pruning follow-up not triggered

---

#### TC-PDL-051: Every pruned protocol has a recorded reason covering every mode of the skill [P2]

**Objective:** Prove each pruning decision is justified for all modes of the skill.

**Business Intent / Invariant Guarded:** Delivery has no mode input; pruning a protocol one mode needs would silently drop it (BR-PDL-14).

**Traces:** AC-PDL-25 / BR-PDL-14

**Preconditions:**

- The pruning audit

**Real-World Reachability:** Runs only if the pruning follow-up is triggered.

**Demo Flow:** Cross-check the audit rows.

```gherkin
Given the audit
When it is cross-checked
Then every pruned row has a reason that covers every mode of the skill
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Audit reviewed                                                                                                                                                        |
| **Business data state** | Reasons complete                                                                                                                                                      |
| **Data shown on UI**    | The audit table                                                                                                                                                       |

**Acceptance Criteria:**

- ✅ Every row justified
- ❌ A row with a reason for one mode only

**Test Data:**

```yaml
inputDomain: 'any pruned row'
invariant: 'for ALL pruned rows the reason covers every mode'
boundaryCounterCase: 'a mode without coverage → the row is restored'
```

**Edge Cases:**

- A skill with one mode → one reason suffices

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-prune]`
> **Related Behaviors:** `rule/skills/protocol-carrier-parity`
> **CoveredBy:** `Manual-QC` (audit review, recorded under the project `tmp/reports/` folder) · **Status:** Untested — pruning follow-up not triggered

---

#### TC-PDL-052: A pruned skill receives no pruned protocol and keeps every protocol any mode uses [P2]

**Objective:** Prove delivery for a pruned skill omits only the pruned protocols.

**Business Intent / Invariant Guarded:** Pruning must reduce cost without dropping a protocol any mode runs (BR-PDL-14).

**Traces:** AC-PDL-25 / BR-PDL-14

**Preconditions:**

- A pruned skill and a fixture that holds its real guide block

**Real-World Reachability:** Runs only if the pruning follow-up is triggered.

**Demo Flow:** Plan delivery for a load of the pruned skill.

```gherkin
Given a pruned skill
When delivery runs for a load of it
Then no pruned protocol arrives
And every protocol that any mode of the skill uses is still delivered
```

**Expected Result:**

| Dimension               | Expectation                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**                  | Not applicable — the capability has no screen; the observable surface is the text the assistant receives, the generated host files, command output and check messages |
| **System behavior**     | Delivers the pruned list                                                                                                                                              |
| **Business data state** | Used protocols delivered                                                                                                                                              |
| **Data shown on UI**    | The group messages                                                                                                                                                    |

**Acceptance Criteria:**

- ✅ No pruned protocol
- ✅ Every used protocol
- ❌ A used protocol missing

**Test Data:**

```yaml
inputDomain: 'any mode of the pruned skill'
invariant: 'for ALL protocols used by some mode delivery includes them'
boundaryCounterCase: 'a protocol used only by a rarely used mode → still delivered'
```

**Edge Cases:**

- The trigger did not fire → case Untested with its reason

<!-- machine-only carrier — ignore when reading as BA/QA -->

> **Evidence:** `[Source: rule/skills/protocol-prune]`
> **Related Behaviors:** `operation/hooks/protocol-delivery`
> **CoveredBy:** `.claude/hooks/tests/suites/protocol-delivery.test.cjs::TC-PDL-052` · **Status:** Untested — pruning follow-up not triggered
