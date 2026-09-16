---
name: demo-guide
version: 2.3.0
description: '[Documentation] Use when generating a demo guide, demo script, or sprint-demo walkthrough covering user stories and their test cases.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Investigate an in-scope feature end-to-end, then produce a stakeholder-ready, proof-carrying demo guide with real stories/IDs, runnable user flows, domain storage/solution, and honest proof levels — UI-first, with technical cases in the closing appendix — so presenters can show behaviour, explain its data, and never claim unearned proof.

**Summary:** Read this if nothing else.

- **Purpose:** MUST ATTENTION investigate before scripting; prove behaviour, user path, storage, and solution with `file:line`; ALWAYS state blockers instead of inventing missing evidence.
- **Main steps (in order):** MUST ATTENTION (0) resolve scope → load contract → size S0–S4 → decompose → task; (1) clear the six-question gate + write the Understanding Brief; (2) gather five inventories; (3) map/persist real cases + classify channels; (4) trace storage/solution; (5) open guide + ledger and accumulate; (6) write four-part cases; (7) compose the backlog-item (PBI) block at the top; (8) assign proof rungs + transparency; (9) validate.
- **Case contract:** setup + numbered flow + discriminator + domain storage/solution + proof rung/chain. UI cases lead each story; technical cases keep full rigour in the closing appendix.
- **Modes and boundaries:** `feature-or-scope`, `--context`, `--output`, `--lang`, `--html`, `--stories`, `--estimate`; only `--estimate` or an explicit estimation instruction names the estimate target — the demo scope never does; `--lang` emits a translated copy and `--html` follows post-approval Artifact flow; a no-front-end project names its primary demo surface; delegates gather read-only input only; secrets are redacted; deferred work is named in the header and chat summary.

**Workflow:**

0. **Resolve Scope, Load Contract, Size & Task** — prompt → context → ASK; read the template; size S0–S4; decompose into story groups; task BEFORE the first deep read.
1. **Understand the Feature FIRST [BLOCKING]** — clear the comprehension bar; use read-only gathering delegates only when needed; write the Understanding Brief.
2. **Gather the Five Inventories** — discover through `docs/project-config.json`; record each ladder's landing rung.
3. **Map Stories → Cases + Classify the Demo Channel** — use REAL `TC-*` / test IDs, name gaps, and tag every case 🖥️ UI or 🔧 technical; under no-front-end, UI means the declared primary surface (Step 3.1).
4. **Trace Domain Storage & Solution** — per case, identify persisted/changed data, owner, migration/handler, consuming rule, and `file:line` evidence.
5. **Open the Guide + Ledger, Accumulate** — write the spine first; add one block per story group; update the ledger as each lands.
6. **Write Each Case** — setup → numbered flow → discriminator → domain storage/solution.
7. **Compose the Backlog-Item (PBI) Block** — prepend a copy-paste-ready PBI at the very top: purpose, overall requirements, ALL acceptance criteria / user stories, authorization requirements, and a bottom-up estimate (story points + man-days) per `SYNC:estimation-framework`, sized over the **estimate target only** — the current changes by default, the target the user names for estimation, or (no change set in scope) the labelled demo scope — never silently the entire feature.
8. **Prove** — assign the proof rung and write the test-execution transparency note.
9. **Validate** — pass the gate below before declaring done.

**Key Rules (the contract):**

- **UNDERSTAND BEFORE YOU SCRIPT.** The Step 1 comprehension bar is a **[BLOCKING] gate**: until you can answer all six questions with `file:line`, you have no demo to write. — why: a demo step invented from a screen name is a demo that fails live, in front of the people it was written for.
- **THE GUIDE OPENS WITH A COPY-PASTE-READY BACKLOG ITEM.** Before the demo guide body, the document carries a PBI block (Step 7) a developer pastes straight into the tracker: purpose/business value · overall requirements (in/out of scope) · **ALL** acceptance criteria and user stories · authorization requirements (or an explicit `None`) · estimation with **story points AND man-days** derived bottom-up per `SYNC:estimation-framework`. Its content is **sourced, never invented** — copied from the governing spec/PBI where one exists, else derived from the traced cases with the source stated. — why: the demo and the backlog record describe the same item; a developer who must re-type it by hand ends up with two different truths.
- **Scope precedence is prompt → current context → ASK.** An explicit feature in the prompt wins; else derive from current work; else `AskUserQuestion` — NEVER invent a feature.
- **Every case carries four parts:** setup/preconditions · numbered **step-by-step demo flow** · **expected result phrased as the discriminator** vs the old behaviour · **how the domain stores/changes data & solves the feature**. A case missing the storage/solution part is incomplete.
- **DEMO THROUGH THE UI — the audience is a normal user / QC, not an engineer.** Every main case is staged AND observed in the product's front-end. A case whose steps or expected result need an API client, CLI, script, manual job/queue trigger, DB query, log tail, or config edit is a **🔧 technical case**: marked as such and collected in the closing `Appendix — Technical demo (non-UI)` (after the last story, before the transparency note), NEVER among the important cases to test. **Resolve the front-end rung FIRST (Step 3.1)** — a project with no front-end states `No front-end in this project — primary demo surface is {API / CLI / library / background job}`, and that surface REPLACES "front-end" throughout this rule. — why: the room believes what it watches happen in the app; a terminal-driven step proves the code to engineers and proves nothing to the stakeholders the guide was written for.
- **PROOF IS EARNED, NEVER ASSERTED.** Every case sits on one of the four proof rungs (Step 8), and `✅ ran` is licensed **only** by a test executed this session with its command and result recorded. There is no fifth rung: a case you cannot place is a **stated blocker**.
- **REAL IDs ONLY — NEVER invent a test case ID.** A story with no case says *"no test covers this"* and is recorded as a coverage gap. — why: a fabricated ID retires a risk that is still live.
- **Cite `file:line` for every storage/behaviour claim** — read the entity, the mapping, and the migration. NEVER infer persistence from a field name.
- **A demo step is traced to a real user path, or it is a stated blocker** — NEVER an invented click, endpoint, or screen, and never state faked by a path a user could not reach.
- **DELEGATE THE GATHERING, NEVER THE SCRIPTING.** Read-only delegates only; their output is INPUT, re-verified at `file:line` before it becomes a claim. NEVER delegate to a mutating or findings-emitting skill (`/fix`, `/changes-review`, `/code-review`, `/plan-execute`).
- **ACCUMULATE ON DISK, NEVER IN CONTEXT.** Open the guide before case one; append per case and per story group; synthesize the guide-level sections **from the written blocks**. — why: partial results on disk beat complete results that never got written.
- **NO SECRET VALUES, ANYWHERE.** Setup steps, run commands, and seed instructions name the setting, the file, and the account **role** — never a credential, token, key, connection string, or customer identifier. Secrets render `<redacted:…>` from the moment they would enter context.
- **NO SILENT TRUNCATION.** Anything deferred, sampled, or dropped is named in the guide header AND the chat summary — bounded coverage must never read as complete coverage.
- **Portable — discover, don't hardcode.** Resolve source roots, spec/test locations, run commands, and output dir from `docs/project-config.json`; degrade gracefully and say which rung you landed on.
- **Scale buys MORE STORY GROUPS, never FEWER PARTS per case.** *"Too big to demo properly"* is a conclusion this skill may never reach.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

---

# Demo Guide — Investigate-First, Proof-Carrying Demo Script

You are an **investigator first, a presenter's coach second** — the order is the point.

- **Investigate:** identify capability/before→after, state owner, click→persistence→display flow, and governing rule. Read the code; NEVER infer persistence from a name.
- **Coach:** provide a live real-user script, old-behaviour discriminator, and honest trace-vs-test proof statement.

> **Success bar:** the presenter can stage preconditions without asking anyone, run every case without improvising, explain where data is stored and why it is correct, and distinguish green tests from trace-only demos. Otherwise it is a wish-list, not a demo guide.

Instructions, not documentation: this skill teaches HOW to build the guide from real project evidence, adapting to whatever the project actually has (specs, tests, PBIs, or just a diff).

## Invocation

```
/demo-guide [feature-or-scope] [--context] [--output path] [--lang xx] [--html] [--stories "A,B"] [--estimate "<target>"]
```

| Flag / arg         | Meaning                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `feature-or-scope` | Named feature, spec title, PBI/story id, path, or free-text scope. Highest precedence. Sets the DEMO scope only, never the estimate target. |
| `--context`        | Force "derive scope from current working context" (branch diff / staged + unstaged / active work). |
| `--output path`    | Where to write the guide. Default: project demo-guide dir (see Configuration), else a temp file.   |
| `--lang xx`        | Also emit a translated copy in the given language (keep code identifiers/paths/IDs in English).    |
| `--html`           | After the markdown, offer/produce a self-contained HTML runbook (via the Artifact flow).           |
| `--stories "A,B"`  | Restrict to the named stories instead of all main stories.                                         |
| `--estimate "<target>"` | Name the estimate target (story, PBI/story id, files, slice, or `whole feature`) — Step 7 rung 1. Absent → current changes. |

## Step 0 — Resolve Scope, Load the Contract, Size & Task (cheap — costs seconds)

**0.1 Resolve scope (prompt → context → ASK).** Apply this defining precedence:

1. **Prompt names scope** → use it; normalize to a spec, PBI/story ID, changed files, or keywords; confirm real artifacts.
2. **Prompt empty / only "generate demo guide"** → derive current context until signal: active task/workflow goal → `git status` + staged/unstaged `git diff` + branch → recent commits vs main → in-progress plan/spec/release-note.
3. **No usable signal** → **STOP and `AskUserQuestion`**: *"Which feature should I generate the demo guide for?"* Offer 2-4 found candidates plus free text. NEVER pick silently.

State the resolved scope and its source in one line (e.g. `Scope: <feature> — derived from branch diff (7 changed files)`).

**0.2 Load the output contract BEFORE gathering.** Read `references/demo-guide-template.md` for structure, case blocks, proof rungs, storage fields, and translation/HTML rules. **If missing**, name the absent file and use this file's inline Step 6–8 contract; still deliver the full guide, with only template elaboration unavailable.

**0.3 Size the target into a tier (count, do not estimate).** Count in-scope **files**, user-facing **capabilities/flows**, **modules/bounded contexts** (`docs/project-config.json` → modules), and changed lines when a diff exists. Use the first matching row top-down. Announce it: `Scope: S2 · Multi — 14 files, 3 capabilities → 3 story groups`.

| Tier            | Trigger (first match wins)                             | Story groups        | How the work runs                         |
| --------------- | ------------------------------------------------------ | ------------------- | ----------------------------------------- |
| **S0 · Point**  | One case, one bug fix, one screen                      | 1                   | Inline, case by case                      |
| **S1 · Small**  | < 10 in-scope files, one capability                    | 1                   | Inline, case by case                      |
| **S2 · Multi**  | ≥ 10 files **OR** ≥ 2 capabilities/flows/contexts      | 2–6                 | Inline, story group by story group        |
| **S3 · Large**  | > 40 files **OR** > 6 story groups                     | 6–12                | One sub-agent per group, front-loaded writes |
| **S4 · Program**| Whole product · multi-service · "demo the whole thing" | Grouped per context | Group agents → context synthesis → spine  |

> Thresholds match the framework's map-reduce ladder (`SYNC:systematic-review-batching`: < 10 sequential · ≥ 10 batch · > 6 categories or > 40 files hierarchical) and `/understand` tiers — why: understanding and demoing must partition the feature the same way.

**Tier is a SHAPE dial, not depth:** it changes group count and dispatch, but NEVER removes a case part, proof rung, or storage explanation.

**0.4 Decompose into story groups, then task the work — BEFORE any deep read.**

- **A story group is a demoable unit** — one user-facing capability staged in one sitting, ≤ 8 files or ≤ 2000 diff-lines. Choose the first decomposition rung yielding ≥2 cohesive groups: **capability / user story** → **end-to-end flow** → **module / bounded context** → **screen or endpoint cluster** (last resort: *"structural grouping — not a story boundary"*). Record the rung. S0/S1 → exactly one group. A 🔧 technical case NEVER forms its own group; it goes to the closing appendix (Step 3.1) — why: a group must be showable to a user.
- **[BLOCKING] Create the task list BEFORE gathering.** `TaskList` FIRST; interrupted/compacted runs resume tasks, never duplicate them. Create one task per group plus: *size & decompose · understand-gate · scope-wide gather · open guide + ledger · proof & transparency · validate*. Exactly one `in_progress`. **A group task completes ONLY when its block is on disk**; evidence is the path plus its cases, not a context summary — why: an interrupted run must show its exact stopping point.

## Step 1 — Understand the Feature FIRST **[BLOCKING GATE]**

**No demo step, expected result, or storage claim before this gate clears.** Investigation makes the guide true.

**Comprehension bar — answer all six with `file:line` for each story group:**

1. **What capability is delivered, and what did the system do before?** State the before → after behaviour; the expected result must discriminate it.
2. **Which entity/aggregate owns the changed state, and which field/column/table holds it?** Read entity, mapping/configuration, and migration — not the property name.
3. **What is the end-to-end flow?** Entry screen/endpoint/job → validation → handler/domain rule → persistence → read path rendering the presenter's outcome.
4. **Which business rule/invariant makes the result correct, and where is it enforced?** This is the stakeholder's *"but what if…"* test.
5. **What preconditions exist, and which REAL user path stages each?** Roles, configuration, seed data, and prior state must be user-reachable.
6. **What proves it?** REAL `TC-*` / test IDs per case, runnable status here, and cases with none.

**Cannot answer one?** Keep investigating or delegate. NEVER paper over the gap with a plausible step.

| The gate needs…                                                        | Invoke                              | Feeds                                        |
| ---------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| Where the feature's files even are, across a large or unfamiliar repo  | `/investigate`                            | Step 0.4 group decomposition + file lists    |
| How the existing feature actually works, beyond what one read shows    | `/investigate`                      | Bar Q1 · Q3 · Q4 → the storage/solution block |
| Why a fixed defect now behaves differently (bug-fix demo)              | `/debug-investigate`                | Bar Q1's before → after discriminator        |
| The call/flow chain and which read path renders the outcome            | `/graph-trace` · `/graph-blast-radius` | Bar Q3 · the "where to look" demo step     |
| Which spec owns the capability, when finding it is itself the problem  | `/spec-index` · `/spec`             | Bar Q6 → REAL `TC-*` IDs                     |

1. **Read-only delegates ONLY.** NEVER invoke a skill that mutates files or issues findings/verdicts (`/fix`, `/changes-review`, `/code-review`, `/why-review`, `/plan-execute`) — this skill emits a script, not a verdict, and mutates nothing but its own output.
2. **MUST ATTENTION delegate on evidence of need — NEVER by reflex.** Try read + grep + trace first, within the group's budget. Announce each delegation in one line and record it in the guide header: `Delegated: /investigate — Story B mechanics`. — why: the reader calibrates on the provenance chain exactly as on a grep-derived claim.
3. **A delegate's output is INPUT, never a finished block.** Re-verify every claim at `file:line` before it enters the guide; a `TC-*` ID that arrives through a delegate is still one you must have read yourself. The anti-hallucination bar does not relax by passing through another skill.
4. **At tier S3+, delegation happens INSIDE the group's sub-agent**, never in the orchestrator. — why: delegating from the orchestrator pulls a whole investigation transcript into the one context the grouping exists to protect.

**Gate exit:** write the Understanding Brief to disk before Step 2 ends. For each group, include six answers with `file:line`, delegations, and every unanswered question as a named blocker, never blank. Steps 4, 6, and 7 use this brief, never memory.

## Step 2 — Gather the Five Inventories (portable discovery)

Read `docs/project-config.json` and its project-reference docs to locate (do NOT hardcode) **source roots** (entities, handlers, migrations, models), **spec/feature-doc location** (canonical stories, ACs, `TC-*` IDs), **test locations** (integration/unit/e2e — ground truth of "what is proven"), **release/changelog/PBI-story** dirs, and **run/test commands**. This skill runs on unfamiliar repos; a hardcoded framework path is a guess wearing a citation.

Each inventory walks its ladder top-down and **records its landing rung**. **Every ladder ends in a stated blocker; none has an invention rung.**

1. **Story & test-case inventory** (feeds the story map, §Quick-reference). The main user-facing capabilities in scope, each as *As a … I want … so that …*, plus the REAL cases proving each — spec `TC-*` IDs and/or the integration/unit/e2e `it` / `[Fact]` / scenario names. Reconcile the union of spec TCs and test-code cases. _Ladder:_ specs → tests → PBIs/release notes/commit messages → the diff itself → **state that no story source exists**.
2. **Domain storage & solution inventory** (feeds each case's fourth part). Per case: the persisted field/column/table, the owning entity/value object, the migration that added or altered it, the value actually written (anchored/computed), and the rule/method/invariant that consumes it. _Ladder:_ entity + mapping + migration read → graph trace of the writer/reader → schema dump → **state the blocker**.
3. **Demo path & setup inventory** (feeds setup/preconditions and the numbered steps). The real user path to each precondition: roles/permissions, configuration flags, seed or fixture entry points, which app/screen/endpoint, and what input. _Ladder:_ existing seeders/fixtures → e2e test setup → manual path traced through the UI/API code → **state that the precondition cannot be staged**.
4. **Proof inventory** (feeds the proof rung per case). Which suites/cases exist, which are runnable here (resolve the command — never guess it), and what a run actually returned this session. _Ladder:_ `project-config.json` commands → the CI workflow's own commands → the test-runner manifest (`package.json` scripts, `*.csproj`, `Makefile`) → **state that no command could be resolved**.
5. **Discriminator inventory** (feeds every expected result). Per case, the value/state that would have been WRONG under the old behaviour — from the diff, the fixed defect, the spec's AC, or the test's assertion. _Ladder:_ the test assertion → the diff's before/after → the spec AC → **state that the discriminator is unknown** rather than writing "it succeeds".

> **[SECURITY]** Record every command, credential, and account in **placeholder form** at the moment of collection — not at write time. Environment variables, connection strings, tokens, keys, passwords, and customer identifiers are referenced by NAME and rendered `<redacted:…>`; demo accounts are named by **role** (`<demo user: approver>`), never by real login. This is the point where a secret would first enter context, so it is the point that must refuse it.

> When `.code-graph/graph.db` exists, run `python .claude/scripts/code_graph trace <entity-or-handler> --direction both --json` to map how a stored field flows to the reader that solves the case — this is how the "how the domain solves the feature" claim is backed by structure instead of guesswork.

## Step 3 — Map Stories → Cases (persist the map)

- **Main user story** = user-facing capability/outcome. Prefer spec stories; otherwise synthesize one per distinct capability from ACs/tests. Keep minor variants under cases; do not inflate the count.
- **Cases per story** = real proving cases with **ACTUAL IDs** — NEVER invent case numbers. A story without a case is a **coverage gap to report**, never a plausible ID.

Write the story → case map to disk before any case block; cross-check the full changed-file list so no main area is missed — why: the map is the coverage contract, and context-only work can vanish at cutoff.

**3.1 Classify every case by DEMO CHANNEL — UI-first [BLOCKING before any case block is written].**

The reader is a **normal user / QC driving the running app** — no terminal, API client, database console, or log tail. Classify every mapped case into exactly ONE channel; the channel determines placement.

**FIRST resolve the PROJECT's primary demo surface — one rung, stated once, before classifying cases.** Discover whether a front-end exists; record the landing rung and repeat it verbatim in the guide header.

| Rung | Resolve when | What it changes below |
| ---- | ------------ | --------------------- |
| **Front-end present** | a discriminating signal resolves to a real user-facing app | Default — everything below applies exactly as written. |
| **`No front-end in this project — primary demo surface is {API / CLI / library / background job}`** | no signal resolves | That surface REPLACES the front-end throughout — **including the channel table below**: read "front-end" as that surface and "non-UI" as "not that surface", so its cases are the main-body channel, ordered first, and the appendix holds only what is not demoable on that surface either. The main-channel marker stays `🖥️`, but the WORD `UI` is replaced by the surface name everywhere the split is written. |

**Discriminating signals** (`docs/project-config.json`): `modules[*].kind` (front-end/app/web vs library/service) · `e2eTesting.framework` (`"none"` means no browser surface) · `styling.guideDoc` · `designSystem.appMappings`. **NEVER test `framework.frontendPatternsDoc`**: it is a scaffold default and proves nothing. Whichever signal decides, state the rung; NEVER switch silently — why: without it, backend, CLI, library, and API products get an empty main body, an all-appendix guide, and a false thin-surface finding.

| Channel | Test (first failure decides) | Placement |
| ------- | ---------------------------- | --------- |
| **🖥️ UI case** — *the demo* | Staged **and** observed entirely through the product's front-end: screens, forms, clicks, navigation, visible output | Main body, inside its story group, ordered first |
| **🔧 Technical case** | ANY step or expected result needs a non-UI surface — HTTP/API client, CLI, script, manual job/queue trigger, DB query, log or file inspection, config edit | Closing `## Appendix — Technical demo (non-UI)` — after every story, before the transparency note |

- **UI cases carry the demo; technical cases are the appendix.** Order each story's cases UI-first, and NEVER let a technical case open a story, head the quick-reference table, or count as a main case to test. — why: the room believes what it watches happen in the app.
- **Hybrid = UI case.** A case demoed on screen whose data can ALSO be confirmed in the DB or logs stays a UI case — put that confirmation on its own **`Deeper confirmation (optional, non-UI)`** line, NEVER as a numbered demo step and NEVER on the proof chain. — why: every numbered step must be runnable by the presenter on screen with no tooling the audience has; and the proof chain is typed as `file:line` links a challenger can walk, so a runtime action ("query `orders` after clicking Save") on that line is an entry the auditor cannot open.
- **A story whose ONLY demonstration is technical is a stated finding.** Record `no UI demo path — technical only` in the story header and route its cases to the appendix. NEVER invent a screen, button, or admin page to make a case look UI-demoable. **Silent under the no-front-end rung** — a project with no front-end by design has no missing UI path to report; there the finding fires only when a case is not demoable on the project's primary surface either. — why: an invented surface fails live, and the audience discovers it before you do.
- **Announce the split in the guide header** — `Cases: 11 🖥️ UI · 3 🔧 technical (appendix)`. **Under the no-front-end rung** the split counts the primary surface as the main channel, and a large appendix is NOT a thin-surface finding — the stated rung already explains it. — why: for a product that HAS a front-end, a guide that is mostly appendix is telling the team the feature's user-visible surface is thin — a finding worth surfacing, not a formatting detail.
- **A technical case keeps the FULL four-part block and its proof rung** — it is demoted in ORDER and PROMINENCE, never in rigour. It obeys **every** per-case rule below: the four parts, real-user-path setup with no faked state, the `file:line` storage claim, the proof rung and chain; only its **observation** surface may be non-UI. — why: the appendix is a placement, not a lower evidence bar — and "not a main case" must never be read as "not bound by the per-case rules".

## Step 4 — Trace Domain Storage & Solution (the distinctive step)

For **each case** — UI and 🔧 technical — read the owning code and answer both questions with `file:line` evidence:

- **How is domain data stored or changed?** Identify persisted field(s)/column(s)/table, owning value object/entity, migration, anchored/computed value, and additive/nullable/backfilled status. Read entity, DTO mapping, and migration — NEVER infer persistence from names.
- **How does the domain solve the feature?** Identify the rule/method/invariant consuming that data to produce the outcome (resolver/derivation/gate), and why storage makes it correct — including edge cases, legacy fallback, and cross-tier parity.

For a display-only case, state **explicitly** that persistence does not change and describe the **representation** (computed value/shape and why correct). *"No storage change"* is valid; an empty block is not.

## Step 5 — Open the Guide + Ledger, Accumulate Story by Story

**Create the guide file BEFORE case one** and append as you produce it. NEVER hold the whole guide in context for one final write.

**Write order is fixed:** title + a `<!-- PBI:START -->` / `<!-- PBI:END -->` placeholder marked `pending` (filled in Step 7) → header — scope/source, sources, delegations, tier/group count, **group ledger** rows `pending`, and empty `Appendix — Technical demo (non-UI)` heading → each group (trace → write main cases → **append 🔧 technical cases to the appendix** → mark its ledger row `written` with `main / technical` split → complete task) → guide-level sections (storage summary, quick-reference table, transparency note) **from written blocks** → chat summary. NEVER hold more than the current group; read finished blocks from disk — why: the appendix is last in the document but technical cases are written per group, preventing context loss.

**After a cutoff, compaction, or resume:** `TaskList` → read the ledger → **verify every `written` row against the filesystem** — a group's cases live in **TWO** places, so check BOTH: the file exists AND carries that group's main-channel cases AND its 🔧 technical cases in the appendix; an absent or truncated block in **either** location resets the row to `pending` → re-read the contract and the Understanding Brief → continue at the first unfinished group. NEVER restart a finished group and never re-derive a written block from memory.

> **[NO SILENT TRUNCATION]** If any cap, budget, or interruption leaves part of the resolved scope uncovered, name what was deferred or dropped **in the guide header AND in the chat summary** — *"Story D (bulk import, 9 cases) deferred — not covered by this guide."* — why: bounded coverage that reads as complete coverage sends a presenter into a room unprepared for the question nobody examined.

**Write location — the demo guide is a DELIVERABLE, not a working artifact.** Write it to the project's demo-guide dir (Configuration); it is shared and version-controlled. **This deliberately differs from `/understand`, whose report is git-ignored** — do NOT copy that rule here — why: a guide the team cannot find is unused.

## Step 6 — Write Each Case (four mandatory parts)

Follow `references/demo-guide-template.md`. Per **case** — UI and 🔧 technical — the guide MUST contain:

1. **Setup / preconditions** — exact state (roles, configuration, seed data, app/screen), staged through **real user paths**; never fake unreachable state. Secrets use `<redacted:…>`, accounts use roles.
2. **Step-by-step demo flow** — numbered, concrete click/action steps: actor, screen, input, and observation. **Every 🖥️ UI step runs in the front-end**; endpoint, command, query, or log inspection appears ONLY in a 🔧 technical appendix case. An untraceable step is a **stated blocker**, never an invented click.
3. **Expected result** — observable **discriminator**: the value that would have been WRONG under old behaviour, not generic "it succeeds".
4. **How the domain stores/changes data + solves it** — Step 4 in plain team language with `file:line` anchors.

**Order inside every story: 🖥️ UI cases first** (happy path → variants → edge cases → legacy). 🔧 Technical cases are NOT inline; put them in the closing `Appendix — Technical demo (non-UI)` with the same four-part shape, after the last story — why: presenters read top-down.

Also include: scope/source header with `{n} UI · {n} technical` split, story groups, **main test-case quick-reference table** (ID · what it proves · proof rung — UI only), **domain storage summary** per story, closing **technical demo appendix**, and **test-execution transparency note**. Keep prose tight.

`--lang` given → emit a translated copy (prose translated; code identifiers, `file:line`, `TC-*` IDs, and numeric values kept verbatim). `--html` given → follow the Artifact flow to render a self-contained runbook **after** the markdown is approved.

## Step 7 — Compose the Backlog-Item (PBI) Block (top of the guide)

**Purpose:** a developer/PO copies this block straight into the backlog tool (Jira/ADO/Linear) without re-typing anything. It sits **above** the demo-guide body, immediately under the document title, fenced by `<!-- PBI:START -->` / `<!-- PBI:END -->` so it can be selected and copied in one go.

**[BLOCKING] SOURCE IT, NEVER INVENT IT.** Fill every field from evidence already gathered in Steps 1–6:

1. **A governing PBI / spec / story exists** (`docs/specs/**`, a PBI or story artifact, a tracker item found in Step 2) → **copy its wording** for requirements, stories, and acceptance criteria; normalize formatting only. Cite the source path in the block header.
2. **No such artifact** → derive from the traced cases and code, and label the block `derived from code + demo cases this session — not yet reviewed by the PO`.
3. **A field has no evidence** → write the explicit negative (`None — no authorization behaviour in this item`), NEVER a plausible filler. An invented acceptance criterion is worse than an absent one: it enters the tracker as a commitment nobody agreed to.

**Mandatory fields (all present; an inapplicable one states why):**

| Field | Content | Sourced from |
| --- | --- | --- |
| **Title + type** | One-line item title · `Feature \| Enhancement \| Bug \| Tech` | Resolved scope (Step 0.1) |
| **Purpose / business value** | Why the item exists, for whom, and the outcome it buys — 2–4 sentences, no implementation detail | Spec/PBI, or Step 1 bar Q1 (before → after) |
| **Overall requirements** | What the item must deliver, as a short numbered list, plus explicit **In scope** / **Out of scope** lines | Spec/PBI, Step 3 story→case map |
| **User stories (ALL)** | Every main story in scope, `As a {role}, I want {capability} so that {value}` — the same stories the guide demos, none omitted | Step 3 map (one per story group) |
| **Acceptance criteria (ALL)** | Every AC, numbered `AC-1…`, each in Given/When/Then, each traced to its demo case and REAL `TC-*` ID (`↔ A1 · TC-042`) | Spec ACs where they exist, else the Step 6 discriminators |
| **Authorization requirements** | Roles/permissions required to exercise the item, tenancy or data-visibility scoping, and any audit obligation — each with `file:line` from a read guard/policy/attribute. No such behaviour → `None — no authorization behaviour in this item` | Code read in Step 4 (guards, policies, role checks) |
| **Estimation** | `Estimate target:` line + `story_points` + `man_days_traditional` + `man_days_ai` and the supporting frontmatter, per `SYNC:estimation-framework` (inlined below) | Bottom-up over the **estimate target** only — the current changes by default, the target the user names for estimation, or (no change set in scope) the labelled demo scope — never silently the whole feature the guide demos |
| **Dependencies / prerequisites** | Blocking items, migrations, configuration, or external systems — or `None` | Steps 2 and 4 |
| **Definition of Done** | The item's DoD, including the coverage gaps this guide reports as open | Steps 3 and 8 |

**Estimate target — size the change, not the feature.** The guide may demo a whole feature for context, but the estimate covers ONLY the estimate target, resolved by this precedence:

1. **User names an estimate target** — the `--estimate "<target>"` flag, or an explicit estimation instruction in the prompt (e.g. "estimate only story B", "size the whole feature") → estimate exactly that. A demo scope (`feature-or-scope`, `--stories`) named without an estimation instruction is NOT an estimate target.
2. **Default → the current changes only** — the union of branch commits vs the default branch and the staged + unstaged diff (the active task's delta only when git shows no change set), narrowed to the part inside the resolved demo scope. Pre-existing, unchanged feature code is context, never estimated work.
3. **No change set inside the demo scope** (no diff — e.g. demoing already-merged work — or no changed file falls inside the demo scope) → the resolved demo scope (named, or derived in Step 0.1), under its own fallback label. NEVER silently widen beyond it.

Write the resolved target as the first line of the Estimation field — `Estimate target: current changes — {n} files on {diff source}` · `Estimate target: user-named — {target}` · `Estimate target: named scope (no change set) — {scope} ({scope source})`. When the target is narrower than the item the PBI block describes, add `SP/man-days cover the estimate target only, not the full item above.` `blast_radius` and test count are computed over that target; name the unchanged surrounding feature in `estimate_reasoning` (e), and keep `estimate_scope_included`/`estimate_scope_excluded` as the shared work-category lists.

**Estimation — apply the shared protocol, do not improvise one.** Use `SYNC:estimation-framework` exactly as `/plan`, `/refine`, `/story` and `/dor-gate` apply it:

- **Bottom-up first:** decompose the estimate-target work into phases → hours → `likely_days = ceil(Σ hours / 6) × productivity_factor`; add the risk margin; emit a **min–max range** whenever `likely_days ≥ 3`.
- **Story points are DERIVED from days, never the driver.** Disagreement > 50% → trust bottom-up and downgrade SP.
- **Emit the full frontmatter** the protocol mandates — `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `risk_margin_pct`, `risk_factors`, `blast_radius`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` — inside a fenced `yaml` block so it survives the copy-paste.
- **State the estimate's nature honestly.** A demo guide is normally written **after** the work is done, so the number is a **retrospective sizing for the backlog record**, not a forecast; say which it is in one line. When a groomed PBI estimate covers **exactly the estimate target**, **reuse that estimate verbatim** and note any delta against this bottom-up pass instead of silently replacing it — why: overwriting a groomed team estimate with a private re-derivation corrupts velocity data. When the groomed estimate covers a wider item than the target (the whole feature vs this change), cite it as context and do NOT copy it as this target's number.
- Estimate the **target work**, not the demo. Writing this guide is never part of the number.

**Write order:** the PBI block is composed **after** the cases exist (its ACs and stories are read back from the written blocks) but **prepended** to the file — open the guide's spine in Step 5 with a `<!-- PBI:START -->` / `<!-- PBI:END -->` placeholder carrying `pending`, and fill it here from disk. NEVER re-derive stories or ACs from memory.

## Step 8 — Prove (the proof ladder)

Every case sits on exactly one rung. State it per case AND in the quick-reference table.

| Rung                | Means                                                                       | Licence                                                             |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `✅ ran`            | The test was **executed this session**                                      | The ONLY rung that may claim green. Record the command + pass/fail.  |
| `⚠️ trace-verified` | Code read end-to-end, the `file:line` chain is complete, not executed       | Demo it live; say it was not run.                                    |
| `📄 spec-only`      | Asserted by a spec/TC; the code path was not traced                         | Weakest rung — say so explicitly.                                    |
| `❌ no coverage`    | No test exists for this case                                                | A reported gap. NEVER filled with a plausible ID.                    |

**There is no fifth rung.** A case you cannot place on one of these four is a **stated blocker**, not a case you quietly promote.

**Proof chain per case** — the `file:line` links a challenger can walk: **where the value is written** → **where it is read** → **where the presenter sees it**. A case whose chain has a missing link cannot sit above `📄 spec-only`.

**Transparency note (mandatory, at the end of the guide):** what was proven this session (suites/cases executed + pass/fail counts), what was not and why (runner blocker, environment, no coverage), and which cases are therefore being shown live rather than via a green run. NEVER imply a run that did not happen.

## Step 9 — Validate

Before declaring done, verify each — evidence, not assertion:

- **MUST ATTENTION** the resolved scope and its source (prompt / context / user-confirmed) are recorded in the guide header.
- **MUST ATTENTION** the Step 1 comprehension bar was cleared per story group, with `file:line` per answer, and the Understanding Brief is on disk.
- **MUST ATTENTION** every main user story is present, each with its REAL test-case IDs — **no invented numbers** — and every story with no case is named as a coverage gap.
- **MUST ATTENTION** every case has all four parts: setup · numbered demo flow · expected result as the discriminator · domain storage/solution.
- **MUST ATTENTION** every case is classified 🖥️ UI or 🔧 technical — **under the no-front-end rung `UI` reads as the rung's primary surface, and the header, case headings and quick-reference table carry that surface name instead** — main-channel cases lead their story and the quick-reference table, technical cases appear ONLY in the closing appendix, and the `{n} 🖥️ · {n} 🔧 technical` split is in the guide header.
- **MUST ATTENTION** no numbered demo step of a UI case requires a terminal, API client, DB console, log tail, or config edit — such a confirmation belongs on the case's `Deeper confirmation (optional, non-UI)` line — never on the proof chain — or the case belongs in the technical appendix.
- **MUST ATTENTION** a story with no UI demo path says so explicitly (`no UI demo path — technical only`) — no invented screen, button, or admin page anywhere in the guide.
- **MUST ATTENTION** every storage/behaviour claim cites `file:line` from a read entity/migration/handler — nothing inferred from a name.
- **MUST ATTENTION** the PBI block is at the TOP of the guide, fenced by `<!-- PBI:START -->` / `<!-- PBI:END -->`, and carries every mandatory field — purpose · overall requirements with in/out of scope · ALL user stories · ALL acceptance criteria (each traced to a demo case and a REAL `TC-*` ID) · authorization requirements or an explicit `None` · estimation · dependencies · DoD.
- **MUST ATTENTION** the PBI block names its source (governing spec/PBI path, or `derived from code + demo cases this session`), and **no requirement, story, or acceptance criterion in it is invented** — each traces to a read artifact or a traced case.
- **MUST ATTENTION** the estimate opens with one of the three `Estimate target:` labels and sizes ONLY that target — the current changes by default, the target the user named for estimation, or (no change set in scope) the labelled demo scope — never silently the entire feature; a target narrower than the PBI item carries the `estimate target only` note.
- **MUST ATTENTION** the estimate carries BOTH `story_points` and man-days (`man_days_traditional` + `man_days_ai`), was derived **bottom-up per `SYNC:estimation-framework`** with SP derived from days, emits the mandated frontmatter fields inside a fenced `yaml` block, states whether it is a retrospective sizing or a forecast, and reuses an existing groomed estimate verbatim only where it covers exactly the estimate target (noting any delta).
- **MUST ATTENTION** every case carries a proof rung and a proof chain; `✅ ran` appears only where a command was executed and recorded.
- **MUST ATTENTION** no secret value appears anywhere — settings, files, and account roles named; credentials rendered `<redacted:…>`.
- **MUST ATTENTION** anything deferred, sampled, or dropped is named in the guide header AND the chat summary.
- **MUST ATTENTION** the ledger's `written` rows are verified against the filesystem, and the output landed at the resolved path; translation/HTML produced only if requested.

## Configuration

Resolve everything project-specific from `docs/project-config.json`; an optional block overrides demo-guide defaults:

```json
{
    "demoGuide": {
        "outputDir": "docs/demo-guides",
        "specDir": "docs/specs",
        "translateDefaultLang": null,
        "storyGranularity": "main"
    }
}
```

Block or file absent → degrade gracefully: default `outputDir` to the project's docs/demo dir if one exists, else a temp file; discover spec/test/source locations from the project-reference docs; and **state the fallbacks you used**.

## Integration with Other Skills

- **`/understand`** — reuse its Purpose→How→Why framing for the "how the domain solves the feature" explanation. ⚠️ **Boundary — decide by audience, not by overlap:** `/understand` §11 *Test & Demo* is **reviewer-facing** — how to run and see the change you are about to review, scoped to that change. This skill is **presenter-facing** — a standalone, stakeholder-ready script that walks a room through a whole feature. The per-case block is deliberately the same shape in both so they converge instead of drifting; showing finished work to people → here, preparing to review it → `/understand`.
- **`/investigate`** / **`/debug-investigate`** / **`/graph-trace`** — the Step 1 gate's read-only gather delegates. Their output is INPUT, re-verified at `file:line`; they never author a case block.
- **`/spec`** — the canonical source of user stories + `TC-*` IDs when the project maintains feature specs. **A business `TC-*` and a demo case are the SAME event for two audiences** — the spec states it as intent, this guide stages it for a room. So they converge by construction: reuse the TC's demo flow and expected result rather than re-deriving them, and **cite the `TC-*` ID per case** so the two cannot drift apart. ⚠️ **A `TC-*` you cannot stage as a live demo on any surface is a finding, not a formatting problem** — it means a non-demoable (technical) case reached the business spec, which violates **M7**. Report it; do NOT invent a demo to cover for it. ⚠️ **Business-visible ≠ UI-demoable — do not conflate the two gates:** a genuinely business-visible outcome reachable only through a non-UI surface (API, CLI, or the business state a job produces — NEVER the job firing itself, which still fails M7's invocation-`When` rule) passes M7 and is still a 🔧 **technical case here** — appendix, not M7 finding. Only a case with no observable business outcome at all is the M7 violation.
- **`/refine`** / **`/story`** / **`/dor-gate`** — the owners of the PBI artifact itself. The Step 7 block is a **backlog-ready summary of an item this guide demos**, sized with the SAME `SYNC:estimation-framework` protocol so the two cannot drift; when one of those skills has already produced the PBI, **copy its wording** rather than re-author it, and never overwrite its groomed estimate — reuse that estimate as the number only when it covers exactly the estimate target (Step 7).
- **`/plan`** — the canonical consumer of `SYNC:estimation-framework`; if a plan for this item exists, reuse only the bottom-up phase hours that fall inside the estimate target instead of re-deriving them.
- **`/release-notes`** — sibling generator; `demo-guide` is presenter-facing (how to show it), it is change-facing (what changed).
- **`/commit`** — commit the generated guide when the user wants it version-controlled.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — one per story group (understand → trace → write) so a long feature can't overflow context. Persist the Understanding Brief and the story→case map early; NEVER hold them only in memory.

**IMPORTANT MANDATORY Steps:** resolve-scope-load-contract-size-and-task-first -> understand-the-feature-blocking-gate-six-question-bar -> gather-five-inventories-with-ladders -> map-stories-to-real-case-ids-and-classify-ui-vs-technical-channel -> trace-domain-storage-and-solution -> open-guide-and-ledger-accumulate-story-by-story -> write-each-case-four-parts -> compose-the-backlog-item-pbi-block-at-the-top -> place-every-case-on-the-proof-ladder -> validate

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any explanation. Run graph trace when graph.db exists.
<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality principles: token efficiency, lead with answer, no filler.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->
- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.
<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Investigate an in-scope feature end-to-end, then produce a stakeholder-ready, proof-carrying demo guide with real stories/IDs, runnable user flows, domain storage/solution, and honest proof levels — UI-first, with technical cases in the closing appendix — so presenters can show behaviour, explain its data, and never claim unearned proof.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each:**

- **Understand Code First:** read the entity/migration/handler before explaining storage — NEVER infer persistence.
- **Evidence-Based Reasoning:** every storage/behaviour claim cites `file:line`; state confidence; "insufficient evidence" is valid output.
- **Graph-Assisted Investigation:** run a graph command on key files when `graph.db` exists — grep → trace → grep verify.
- **Incremental Persistence:** create the guide file BEFORE case one; append per case and per story group; NEVER hold results in memory.
- **Output Quality:** token efficiency, lead with the answer, no filler.
- **Estimation Framework:** bottom-up hours drive man-days; story points DERIVED, never the driver; emit the full estimate frontmatter; estimate ONLY the current changes by default, the target the user names for estimation, or — with no change set in scope — the labelled demo scope; never silently the entire feature.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, NEVER guess.
- **AI Mistake Prevention:** verify against evidence, re-read after context loss, surface ambiguity.

- **MUST ATTENTION** run the main steps in order, none skipped: (0) Resolve scope + load contract + size + task → (1) **UNDERSTAND the feature [BLOCKING gate]** → (2) Gather five inventories → (3) Map stories → REAL case IDs → (4) Trace domain storage/solution → (5) Open guide + ledger and accumulate → (6) Write each case's four parts → (7) Compose the backlog-item (PBI) block at the top → (8) Place every case on the proof ladder → (9) Validate.
- **MUST ATTENTION** Step 1 is a **[BLOCKING] gate, not a preamble** — until all six comprehension questions are answered with `file:line` per story group, NO demo step, expected result, or storage claim may be written. Unanswerable question → keep investigating, delegate, or **state it as a blocker**; NEVER paper over it with a plausible step.
- **MUST ATTENTION** scope precedence is **prompt → current context → ASK** — NEVER silently invent the feature.
- **MUST ATTENTION** DELEGATE the GATHERING to read-only skills (`/investigate`, `/debug-investigate`, `/graph-trace`, `/spec-index`) when read + grep + trace cannot clear the bar — NEVER to a mutating or findings-emitting skill, never let a delegate author a case block, and re-verify every delegated claim at `file:line` first. At S3+ delegation runs inside the group's sub-agent, not the orchestrator.
- **MUST ATTENTION** SIZE the target into a tier (S0–S4) and DECOMPOSE anything above S1 into story groups (≤8 files / ≤2000 diff-lines, each demoable in one sitting) — announce both in one line. Scale buys MORE GROUPS, never FEWER PARTS per case; *"too big to demo properly"* is a conclusion this skill may never reach.
- **MUST ATTENTION** BREAK THE WORK INTO TASKS **before the first deep read** — `TaskList` first (resume, never duplicate), one task per story group plus the fixed tasks, exactly one `in_progress`, and a group task `completed` ONLY when its block is on disk.
- **MUST ATTENTION** OPEN the guide — header, ledger, group rows — before case one, ACCUMULATE story group by story group, and write the guide-level sections **from the written blocks**, never from memory. After any cutoff or compaction, verify every `written` ledger row against the filesystem before continuing.
- **MUST ATTENTION** DEMO THROUGH THE UI FRONT-END — the reader is a **normal user / QC driving the running app**, with no terminal, API client, DB console, or log access. Every main case is staged AND observed in the front-end; each story's cases are ordered UI-first; the header states the `{n} 🖥️ UI · {n} 🔧 technical` split. **Under the `No front-end in this project` rung (Step 3.1)** read "front-end" as the project's stated primary demo surface, and label the main-channel count with that surface instead of `UI` — nothing else in this bullet changes.
- **MUST ATTENTION** any case whose step or expected result needs a non-UI surface (API/HTTP client, CLI, script, manual job/queue trigger, DB query, log or file inspection, config edit) is a 🔧 **technical case**: it keeps the full four-part block and its proof rung but moves to the closing `Appendix — Technical demo (non-UI)`, and is NEVER an important case to test, never opens a story, never heads the quick-reference table, and never forms a story group. A hybrid (UI demo + optional DB/log confirmation) stays a UI case — the confirmation goes on its own `Deeper confirmation (optional, non-UI)` line, never on the proof chain and never in a numbered step. A story with NO UI path says `no UI demo path — technical only`; NEVER invent a screen to cover for it — **silent under the no-front-end rung**, where that finding fires only when a case is not demoable on the primary surface either.
- **MUST ATTENTION** every case — UI and 🔧 technical alike — = setup/preconditions + numbered **step-by-step demo flow** + **expected result phrased as the discriminator** + **how the domain stores/changes data & solves the feature**. A case missing the storage/solution part is incomplete; a display-only case states *"no storage change"* and describes the computed representation.
- **MUST ATTENTION** PROOF IS EARNED: every case sits on one of four rungs — `✅ ran` (executed THIS session, command + result recorded) · `⚠️ trace-verified` · `📄 spec-only` · `❌ no coverage` — plus a proof chain (written → read → seen, `file:line` each). **There is no fifth rung**; an unplaceable case is a stated blocker. NEVER imply a green run that did not happen.
- **MUST ATTENTION** the guide OPENS with the copy-paste-ready **PBI block** (`<!-- PBI:START -->` … `<!-- PBI:END -->`, above the demo body): purpose/business value · overall requirements with in/out of scope · **ALL** user stories · **ALL** acceptance criteria in Given/When/Then, each traced to its demo case and REAL `TC-*` ID · authorization requirements with `file:line` or an explicit `None` · estimation · dependencies · DoD. Every field is COPIED from the governing spec/PBI where one exists and otherwise derived from traced cases with the source stated — **NEVER invented**.
- **MUST ATTENTION** the PBI estimate applies `SYNC:estimation-framework` and nothing else: bottom-up hours → `likely_days` → risk margin → min–max range when `likely_days ≥ 3`, with **story points DERIVED from days** and the mandated frontmatter (`story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `risk_margin_pct`, `risk_factors`, `blast_radius`, `estimate_scope_*`, `estimate_reasoning`) emitted in a fenced `yaml` block. State whether it is a retrospective sizing or a forecast; an existing groomed estimate that covers exactly the estimate target is reused verbatim with any delta noted, NEVER silently replaced. Never size the writing of the guide.
- **MUST ATTENTION** use the project's REAL user stories and `TC-*` / test IDs — **NEVER invent a case number**. No coverage → say so; an admitted gap is a finding, a fabricated ID retires a live risk.
- **MUST ATTENTION** stage every precondition through a REAL user path and trace every demo step to real code — an untraceable step is a **stated blocker**, never an invented click, endpoint, or faked state.
- **MUST ATTENTION** cite `file:line` for every storage/behaviour claim from a read entity/mapping/migration/handler — NEVER infer persistence from a field name.
- **MUST ATTENTION** NEVER put a secret value in the guide, the setup steps, or the chat summary — name the setting, the file, and the account **role**; credentials, tokens, keys, connection strings, and customer identifiers render `<redacted:…>` from the moment they would enter context.
- **MUST ATTENTION** announce anything deferred, sampled, or dropped in BOTH the guide header and the chat summary — bounded coverage must never read as complete coverage.
- **MUST ATTENTION** stay portable — discover paths, spec/test locations, and run commands via `docs/project-config.json`; NEVER hardcode project specifics, and state which degradation rung you landed on.
- **MUST ATTENTION** the demo guide is a **shareable DELIVERABLE** written to the project's demo-guide dir — do NOT copy `/understand`'s git-ignored-working-artifact rule onto it.
- **MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.

**Anti-Rationalization:**

| Evasion                                                     | Rebuttal                                                                                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| "I know what this feature does — skip the understand gate"  | Then clearing the bar costs minutes. **You cannot skip it.** A demo written from an assumed flow fails live, in front of the room it was for. |
| "The field name says what it stores"                        | A name is a hypothesis. Read the entity, the mapping, and the migration — persistence is never inferred.                                     |
| "This story probably has a test — I'll cite TC-042"         | NEVER invent a case ID. Cite the ID you actually read, or write "no test covers this case" and record the gap.                               |
| "The suite is green on CI, so mark it ✅ ran"               | `✅ ran` means executed THIS session with the command and result recorded. Anything else is `⚠️ trace-verified`.                              |
| "I'll write a reasonable-looking click path"                | An untraceable step is a **stated blocker**. A presenter who follows an invented step discovers it live.                                     |
| "Expected result: it works"                                 | Failed section. State the discriminator — the value that would have been WRONG under the old behaviour.                                      |
| "I'll demo this one with a curl call / a quick DB check"    | Then it is not a main case. Mark it 🔧 technical, move it to the closing appendix, and lead the story with what a QC can click. |
| "There's no screen for it, so I'll describe an admin page"  | NEVER invent a surface. Record `no UI demo path — technical only` and put the case in the technical appendix. |
| "The technical cases are the interesting ones — put them first" | Order is the message. UI cases first, technical last; an appendix case is never an important case to test. |
| "Display-only case — nothing to say about storage"          | Say *"no storage change"* and describe the computed representation that solves it. An empty block is a dropped part.                         |
| "Big feature — a high-level walkthrough IS the honest answer" | Wrong lever. Scale buys MORE STORY GROUPS, never fewer parts per case. Size it, decompose it, task it, accumulate it.                       |
| "I'll investigate everything first, then write the guide"   | Never. Header + ledger before case one, a block per group, ledger updated as each lands. Investigation held in context is one cutoff from gone. |
| "The sub-agent reported it wrote the block"                 | Verify the FILE. A summary is evidence of a reply, never of a block — check it exists, carries its cases, and cites REAL IDs.                |
| "I'll call /changes-review to gather faster"                | Delegates are READ-ONLY and gather-only. This skill emits a script, not findings — never delegate to a mutating or verdict-issuing skill.    |
| "No PBI exists, so I'll write reasonable acceptance criteria"  | NEVER invent an AC — it enters the tracker as a commitment nobody agreed to. Derive from the traced cases and LABEL the block as derived, or write the explicit gap. |
| "I'll ballpark the story points — it's just a backlog note"    | SP is DERIVED from bottom-up hours, never guessed. Run `SYNC:estimation-framework`: hours → days → margin → range → SP. |
| "The PBI already has an estimate but mine is better"           | Reuse the groomed estimate verbatim and note the delta — when it covers exactly the estimate target. Overwriting a team estimate with a private re-derivation corrupts velocity data. |
| "The guide demos the whole feature, so I'll size the whole feature" | Size ONLY the estimate target: what `--estimate` or an explicit instruction names, else the current changes, else the labelled demo scope. Unchanged feature code is demo context, not estimated work. |
| "They named PBI-123 to demo, so PBI-123 is the estimate target" | A demo scope is not an estimate target. Only `--estimate` or an explicit estimation instruction sets one; otherwise size the current changes. |
| "Authorization? I'll write 'admin only' — it's probably right"  | Cite the guard/policy at `file:line` or write `None — no authorization behaviour in this item`. A guessed permission ships as a requirement. |
| "The demo needs the admin password to be runnable"          | Name the role and the setting; render the value `<redacted:…>`. A guide is shared — a credential in it is a leak.                            |
| "Most stories are covered — close enough"                   | Name every deferred story in the header AND the chat summary. Bounded coverage that reads as complete is how a presenter gets ambushed.      |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION Goal:** Investigate an in-scope feature end-to-end, then produce a stakeholder-ready, proof-carrying demo guide with real stories/IDs, runnable user flows, domain storage/solution, and honest proof levels — UI-first, with technical cases in the closing appendix — so presenters can show behaviour, explain its data, and never claim unearned proof.
**IMPORTANT MUST ATTENTION** Main order: resolve scope → load contract → size/decompose → task → clear six-question gate + write Understanding Brief → gather five inventories → map/persist real cases + channels → trace storage/solution → open guide + ledger and accumulate → write four-part cases → compose the backlog-item (PBI) block at the top (sourced content; estimate per `SYNC:estimation-framework`) → assign proof rungs + transparency → validate. Preserve the [BLOCKING] understanding and UI-first channel gates.
**IMPORTANT MUST ATTENTION** Modes/flags: `feature-or-scope`, `--context`, `--output`, `--lang`, `--html`, `--stories`, `--estimate`; only `--estimate` or an explicit estimation instruction names the estimate target; `--lang` translates, `--html` follows the post-approval Artifact flow, and no-front-end projects state a primary demo surface.
**IMPORTANT MUST ATTENTION** Preserve real IDs, `file:line` evidence, earned proof, read-only gathering, redacted secrets, UI-first placement, full technical appendix cases, and named blockers; NEVER invent paths, states, or evidence.
