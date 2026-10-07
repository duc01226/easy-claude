---
name: grill
description: '[Decision Support] Use when the user wants a plan, design, decision or idea stress-tested by interview before anything is written or built, or says "grill me".'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Todo tracking mandate: BEFORE executing any workflow or skill step, create/update todo tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Run phases in order; update todo tracking before and after each phase.
> **[BLOCKING]** Every completed or skipped phase needs concise evidence or a reason.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Reach a shared understanding with the user about one plan, design, decision or idea by interviewing them until no material decision is left silently assumed, so that whatever is written or built next rests on choices the user actually made.

**Summary:**

- Interview the user; do not write the plan, the spec or the code. The output is a Decision Record.
- The Decision Interview protocol owns how to ask: facts are yours, brief first, decision cards, dependency-ordered rounds, playback. No question budget applies here.
- **Main steps:** frame the subject and gather facts → brief the user → build the decision tree → interview in rounds → play back and record → confirm and name the next step.

**Key Rules:**

- Never ask for a fact you can look up; never answer a decision for the user.
- Ask every material decision and never invent one.
- Never start planning, writing a spec or implementing from this skill. Hand off.

## Mission

<request>$ARGUMENTS</request>

## When This Skill Fits

| What the user has | Use |
| --- | --- |
| A loose plan, design, decision or idea, nothing written yet | this skill |
| A saved implementation plan | `$plan --mode=validate` |
| An authored Feature Spec or test-case set | `$spec [mode=clarify]` |
| A raw product idea that should become an initiative | `$initiative` |
| A high-stakes, hard-to-reverse choice needing adversarial advisors | `$llm-council` |
| An artifact whose rationale needs review, without interviewing the user | `$why-review` |
| An effort too big for one session, route unclear | `$wayfinder` |

When another row fits better, say so in one line and let the user choose; an explicit request for this skill always runs, and so does a call from another skill.

## Phase 0: Frame the Subject and Gather Facts

1. Restate the subject in one or two sentences; read in full any file `$ARGUMENTS` names.
2. Read the project configuration, docs index and lessons file when present, then the reference docs, specs, accepted decisions and code the subject touches.
3. Answer every factual question yourself; use a sub-agent for a wide search and keep working meanwhile. A fact still being looked up blocks only the decisions that depend on it.
4. An unknown only the user can supply is a question; one you could still look up is not.

## Phase 1: Brief the User

Brief per the protocol, citing the file or evidence behind each statement.

## Phase 2: Build the Decision Tree

List every material decision, silent default, assumption and conflict, each with what it depends on. Probe these areas, skipping one only with a reason: goal and who it serves · scope and non-goals · the alternative not taken · data and state · failure, recovery and rollback · access and safety · dependencies and order · cost of the next change · how it is tested and proved · what would make the user regret this choice in six months.

## Phase 3: Interview in Rounds

First tell the user how many decisions you will ask, in how many rounds, on which topics. Ask every askable decision in one round through `ask user question tool`, at most four questions per call (a larger round continues in the next call), each as a decision card; show a card's context just before the call when it does not fit the question. After each round recompute the tree, tell the user how many remain, and ask the next round until none is open or the user stops.

When an answer contradicts an earlier one or a fact you found, say so and ask which stands. Do not design around the contradiction.

## Phase 4: Play Back and Record

Play the answers back, then write the Decision Record to `tmp/reports/grill-{YYMMDD-HHmm}-{slug}.md`:

```markdown
# Decision Record: {subject}

**Date:** {date} · **Rounds:** {n} · **Questions asked:** {n}

## Subject

{one or two sentences, with the file or evidence it came from}

## Decisions

| # | Decision | Chosen option | Why | Reversible | What it changes |
| --- | --- | --- | --- | --- | --- |

## Facts Found

- {fact}: {evidence}

## Unconfirmed Assumptions

- {decision not asked}: {assumed value}. Reason: {obvious from evidence | the user stopped the interview}

## Still Open

- {decision that cannot be settled yet}: {what it waits on}
```

## Phase 5: Confirm and Hand Off

Ask one closing question: does the playback match what the user meant. Correct the record when it does not.

Then name the next step that fits, in one line, without starting it: `$plan` for an implementation plan, `$spec` for a Feature Spec, `$initiative` for a product idea, `$wayfinder` when the effort turned out too big for one session. Give the Decision Record path with it, so the next skill starts from the record. Do not act on the decisions until the user asks.

## Called by Another Skill

When another skill runs this one as a step, for example `$wayfinder` naming a destination or resolving a ticket, skip the fit table, run Phases 0 to 4 and the closing question of Phase 5, then return the Decision Record path and the decisions to that skill. Name no next step: the caller owns what follows.

## No User Channel

A sub-agent or headless run cannot interview. Return the briefing and the open decision cards to the caller as pending, and never answer them yourself.

## Output

Report the subject, rounds and questions, the decisions with chosen options, unconfirmed assumptions, what is still open, the Decision Record path and the suggested next step.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `decision-interview` — Brief the user, then ask every material decision as a decision card in dependency-ordered rounds; asking the user to confirm, choose or validate decisions → .claude/skills/shared/protocols/decision-interview.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:decision-interview:reminder -->

**MUST ATTENTION** interview: look up facts yourself · brief before the first question · ask every material decision the hosting skill's budget allows, in dependency order, as a decision card (options with gains and costs, a reasoned recommendation) · never pad or self-answer · play answers back and record unasked decisions as unconfirmed.

<!-- /SYNC:decision-interview:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Reach a shared understanding with the user about one plan, design, decision or idea by interviewing them until no material decision is left silently assumed.
**IMPORTANT MUST ATTENTION Main steps:** frame the subject and gather facts → brief the user → build the decision tree → interview in rounds → play back and record → confirm and name the next step.
**IMPORTANT MUST ATTENTION** look up facts yourself; after the briefing put every material decision to the user as a decision card, in dependency-ordered rounds; never pad, re-ask or bundle.
**IMPORTANT MUST ATTENTION** record unasked decisions as unconfirmed; never plan, specify or implement from this skill.
