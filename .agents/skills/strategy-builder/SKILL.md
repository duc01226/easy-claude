---
name: strategy-builder
description: '[Content] Use when a workflow step or the user asks for marketing strategy: positioning, channels, messaging, campaigns, budget and KPIs.'
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
## Quick Summary

**Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**Summary:**

- **Main path:** load the market-analysis artifact → define positioning and differentiation → plan channels with budget and ROI → craft messaging → build the campaign roadmap with KPIs → assess risks and mitigations.
- **Evidence gate:** base positioning on competitive analysis, label market evidence, and make KPIs specific, measurable, and time-bound.

**Workflow:**

1. **Load market analysis** — Read market-analysis output
2. **Define positioning** — Value proposition, differentiation
3. **Plan channels** — Strategy with budget allocation + ROI
4. **Craft messaging** — Tagline, key messages, proof points
5. **Build campaign roadmap** — Phases with timeline and KPIs
6. **Risk assessment** — Marketing risks with mitigation

**Key Rules:**

- Positioning MUST ATTENTION reference competitive analysis
- Every channel: purpose, budget %, expected ROI, priority
- KPIs must be specific, measurable, time-bound
- Market evidence must be labelled as the exact market-analysis artifact or as unverified inline context; never silently treat the latter as reviewed research

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Strategy Builder

## Step 1: Load Market Analysis

When invoked by `workflow-research` marketing mode, read the exact parent-provided
`MARKET_ANALYSIS_PATH`; never derive a second slug. If that workflow artifact is missing, mark market
facts N/A and cap market-evidence confidence at 60% — do not silently substitute inline context.
Standalone inline context is allowed only when labelled **Unverified inline market context**. In that
mode, do not claim it is the market-analysis artifact, do not introduce uncited market-size figures,
mark unsupported market facts N/A, and cap market-evidence confidence at 60%. Extract only what the
evidence provenance supports: competitor landscape, target segments, SWOT, and market size.

## Step 2: Positioning

Based on competitive analysis:

- **Value proposition** — What unique value do we offer?
- **Differentiation** — How are we different from competitor X, Y, Z?
- **Brand voice** — Tone, personality, communication style

## Step 3: Channel Strategy

For each channel:

| Channel   | Purpose                           | Budget % | Expected ROI | Priority |
| --------- | --------------------------------- | -------- | ------------ | -------- |
| {channel} | {awareness/acquisition/retention} | {%}      | {X:1}        | P0/P1/P2 |

Total budget % must equal 100%.

## Step 4: Messaging Framework

- **Tagline** — One memorable line
- **Key messages** (3-5 pillars) — Core themes
- **Proof points** — Evidence supporting each message
- **Elevator pitch** — 30-second version

## Step 5: Campaign Roadmap

| Phase  | Timeline | Objective   | Tactics | KPIs      | Budget |
| ------ | -------- | ----------- | ------- | --------- | ------ |
| Launch | M1-M3    | Awareness   | {list}  | {metrics} | {$}    |
| Growth | M4-M6    | Acquisition | {list}  | {metrics} | {$}    |
| Scale  | M7-M12   | Retention   | {list}  | {metrics} | {$}    |

## Step 6: Risk Assessment

| Risk   | Likelihood | Impact | Mitigation |
| ------ | ---------- | ------ | ---------- |
| {risk} | H/M/L      | H/M/L  | {strategy} |

## Output

Write to `docs/knowledge/strategy/marketing/{descriptive-slug}.md` using enforced template from `.claude/templates/marketing-strategy-template.md`.

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**IMPORTANT MUST ATTENTION Main steps:** load market analysis → define positioning → plan channels, budget, and ROI → craft messaging → build campaign roadmap and KPIs → assess risks and mitigations.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
