# Claude AI Agent Framework — Guide

> **Purpose:** the one-page map of the portable `.claude/` framework — what it does, how the parts fit, how to use it day to day, and where each topic's detailed owner doc lives. Read it first when you adopt the framework, change it, or need to explain a hook block, a routing decision or a workflow step.
>
> **Framework inventory:** <!-- COUNT:hooks -->32<!-- /COUNT --> top-level hook files · <!-- COUNT:lib-modules -->61<!-- /COUNT --> hook-library modules · <!-- COUNT:skills -->102<!-- /COUNT --> skills · <!-- COUNT:workflows -->19<!-- /COUNT --> workflows · <!-- COUNT:agents -->24<!-- /COUNT --> agents · <!-- COUNT:shared -->15<!-- /COUNT --> shared reference/protocol entries.
>
> **Visual overview:** `.claude/docs/claude-ai-agent-framework-guide.html`. Use this Markdown guide for current inventories and source-owner pointers.

**Critical rules (read before anything else)**

1. **Route first.** Every first task of a session is routed (direct · custom-simple · workflow) before any edit, agent or command. Mid-session, never auto-start a workflow.
2. **Evidence, not memory.** Project facts come from `docs/project-config.json` and the project-reference docs; every claim cites `file:line`; below 80% confidence, don't act.
3. **Gates are not optional.** Root-cause before a fix, adjudicate a failed test before editing it, review before commit, spec/doc sync when behavior changes.
4. **`.claude/` is the source.** `.agents/`, `.codex/`, `.opencode/`, `AGENTS.md` and the generated parts of `CLAUDE.md` are projections — fix the source and regenerate.

---

## 1. What the framework is

A generic LLM is capable but forgetful, confident without evidence, and unaware of your project. This framework wraps Claude Code in **32 top-level hook files**, **102 skills**, **19 registered workflows**, and **24 specialized agents** that make it project-aware, evidence-driven and gated at every quality step — from idea and spec through implementation, testing, review, commit and pull request.

| Failure mode of a plain agent        | What counters it                                            | Where it lives                                     |
| ------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| Picks the wrong process for the task | Routing gate + workflow catalog injected at prompt time     | `workflow-route-inject.cjs` |
| Skips steps or stops early           | Guided workflows: gate steps, outcome gates, evidence-gated close | `.claude/workflows.json`, `start-workflow`, `workflow-end` |
| Guesses APIs and project facts       | Evidence protocols, project config, reference docs, code graph | shared protocols, `docs/project-config.json`     |
| Forgets rules in long sessions       | Rules delivered once per session and re-armed after compaction | protocol-inject hooks, prompt ledger             |
| Ships unreviewed work                | Review fix-loop → receipt → commit gate                     | review skills, `review-commit-gate.cjs`, `commit`  |
| Drifts from the spec                 | Spec-first workflows, spec sync gates, doc-sync advisory     | `spec`, `docs-manager`, `doc-sync-gate.cjs`         |
| Leaks one project into another       | Portable source + generated mirrors + residue verifiers     | `framework-portability.md`, `/sync-codex`          |

The design bet: **hooks put the contract in context at the right moment.** The universal rules every task follows are delivered by the universal hook on the first prompt, again after 150K tokens or a compaction, and to every sub-agent; skill protocols arrive when a skill loads, and a skill's project overlays are named when it starts. `CLAUDE.md` holds project information only. Claude Code, Codex and OpenCode run the same hooks; a host with no hooks is unsupported. A few checks must be mechanical, so they are gates.

---

## 2. Everyday use

| You want to…                          | Use                                                     |
| ------------------------------------- | ------------------------------------------------------- |
| Build a feature                       | `/workflow-feature` (large or unclear: `/workflow-big-feature`) |
| Build what a spec already describes   | `/workflow-implement-spec`                              |
| Fix a bug                             | `/workflow-bugfix` (small, known cause: `/fix`)         |
| Understand code                       | `/investigate` (`--mode=explain`) or `/understand`      |
| Refactor without behavior change      | `/workflow-refactor`                                    |
| Review your changes                   | `/changes-review` (quick) · `/workflow-review-changes --fix-loop` (full) |
| Commit                                | `/commit` (the only agent commit path)                  |
| Open a pull request                   | `/pull-request` (branch → review → commit → PR → CI green) |
| Design or mock up UI                  | `/ui-design`, `/work-item --mode=mockup --explore`, `/workflow-spec-to-mockup` |
| Write or sync a spec                  | `/spec`, `/workflow-feature-spec`, `/workflow-spec-sync` |
| Write or fix tests                    | `/workflow-integration-test` (`--mode=write` · `--mode=green`), `/workflow-e2e` |
| Set up a project                      | `/project-init`, then `/scan-all`                       |
| Capture a lesson                      | `/learn`                                                |
| Ask what the framework does here      | `/project-help`                                         |

A typical request: you type a prompt → hooks inject the routing catalog and your project context → Claude declares a route (`Route: workflow-bugfix — because …`) → a workflow creates one task per step → steps run inline or as sub-agents → review, tests and outcome gates must pass → `workflow-end` closes with a summary.

---

## 3. Architecture — four layers on a static base

```mermaid
flowchart TB
  U[User prompt] --> H[Hooks: route, context, protocols, gates]
  H --> R{Route decision}
  R -->|direct / custom-simple| S[Skills]
  R -->|workflow| W[Workflows: gated step sequences]
  W --> S
  S --> A[Agents: specialist sub-agents]
  S & A --> O[Code, specs, tests, reports]
  B[(Static base: CLAUDE.md · docs/project-config.json · reference docs · lessons)] -.-> H & S & A
```

| Layer         | What it is                                                   | Kills this failure mode                   | Owner doc                                   |
| ------------- | ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------- |
| Static base   | `CLAUDE.md` (project information, generated from config), project config, reference docs, `lessons.md` | Generic answers that ignore the project | `configuration/README.md`, `ai-context-refresh` |
| Hooks         | Node scripts on lifecycle events (`.claude/hooks/*.cjs`)     | Forgotten rules, unreviewed commits        | `hooks/README.md`                            |
| Skills        | Task protocols (`.claude/skills/<name>/SKILL.md`)            | Ad-hoc, unrepeatable work                  | `skills/README.md`                           |
| Workflows     | Ordered, role-tagged skill sequences (`.claude/workflows.json`) | Skipped steps, wrong process            | `start-workflow` skill, `configuration/README.md` |
| Agents        | Specialist sub-agents (`.claude/agents/*.md`)                | Context overload, shallow specialist work  | `agents/README.md`, `agents/agent-patterns.md` |

**Relocatable roots.** No path is hard-wired; each root has a framework default and a config key in `docs/project-config.json`:

| Role                     | Default                   | Override key                           |
| ------------------------ | ------------------------- | -------------------------------------- |
| Business specs           | `docs/specs`              | `docs/project-config.json` → `specRoots.business.path` |
| Technical specs          | (none)                    | `docs/project-config.json` → `specRoots.technical.path` |
| Project reference docs   | `docs/project-reference`  | `docs/project-config.json` → `docsRoots.projectReference.path` |
| ADRs                     | `docs/adr`                | `docs/project-config.json` → `docsRoots.adr.path` |
| Plans                    | `plans`                   | `docs/project-config.json` → `docsRoots.plans.path` |
| Team artifacts (tasks, mockups) | `team-artifacts`    | `docs/project-config.json` → `docsRoots.teamArtifacts.path` |
| Product roadmap          | `docs/product-roadmap.md` | `docs/project-config.json` → `docsRoots.productRoadmap.path` |
| Disposable output        | `tmp/` (or `temp/`)       | fixed; both git-ignored                |

---

## 4. Routing — how a request becomes a route

The workflow route (source: `.claude/skills/shared/workflow-first-gate.md`) is delivered only by `workflow-route-inject.cjs` at prompt time: the gate plus a compact workflow catalog (tier, step count, when to use, parallel groups), in the route mode each person chose — `ask` (default), `auto` or `off`. No tracked file carries it.

1. **Honor explicit requests** — a `/skill`, `/workflow-*` or "use a workflow" always runs.
2. **Assess** scope · change type · risk · ambiguity · needed artifacts. Escalate on risk and ambiguity, not file count.
3. **Pick a route:** question or trivial edit → *direct*; focused one-module change → *custom-simple* (only the steps it needs); non-trivial bug → `workflow-bugfix`; cross-module feature → `workflow-feature`; explicit roadmap → `product-roadmap`; otherwise the matching skill.
4. **Catalog fit:** keep a workflow only if >80% of its unconditional steps do real work; otherwise downgrade to custom-simple — but a behavior change keeps test and review, a bug keeps root-cause, a contract change keeps spec/doc sync.
5. **Declare and activate:** `Route: {id | skill | custom-simple [a → b] | direct} — because {signals}`, then start it before any edit. A route that starts a catalog workflow first asks the **workflow question** (a direct, single-skill or custom-simple route asks nothing): one question offering the full workflow (with its step count), a slimmer custom route listing its steps (required gates kept), or direct execution, with the recommended option first. An explicit request skips it.

**Activation tiers** (per workflow in `.claude/workflows.json`; absent = `auto`). In mode `ask` every tier asks the workflow question before a self-routed catalog workflow start (direct, single-skill and custom-simple routes ask nothing) and the tier only orders the recommendation (mode `auto` lets the tier decide whether to ask): `auto` by catalog fit · `confirm` recommends the full workflow only when no leaner route would do · `manual` never recommends it first (its wrapper skill is also hidden from implicit invocation). Projects adjust tiers with `portability.workflowActivation` in `docs/project-config.json` (`default` only tightens; a per-workflow `overrides` entry may loosen); a local `.claude/.ck.local.json` wins for one developer. Set the route mode with `portability.workflowRouteMode` (team default in `docs/project-config.json`; a person overrides it in `~/.claude/.ck.json`, `.claude/.ck.local.json` or env `CK_WORKFLOW_ROUTE_MODE`); `off` turns prompt-time routing off.

**Mid-session rule:** the workflow question applies only to the first task of a session; mid-session the model neither starts a workflow nor asks to. It works directly or with a chain of at most three skills; required gates still run and don't count toward the cap.

---

## 5. Workflows — guided, gated execution

A workflow is an **intent** plus **outcome gates** plus an ordered list of **step occurrences**, each with a role:

| Role       | Meaning                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `gate`     | Always runs. Never skipped, merged or reordered.                                         |
| `core`     | Recommended. May flex (skip, merge, simplify, reorder) with a logged reason if outcome gates stay reachable. Unannotated steps are `core`. |
| `optional` | Carries `applicability.when` and `skipReason`; skipped when `when` is false.              |

**How a run works** (owner: `.claude/skills/start-workflow/SKILL.md`):

- **Triage first** — size (XS to XL), change kinds and risk decide depth; small work stays lean, large work batches per module.
- **Read the workflow's own SKILL.md, then create tasks 1:1** — one task per occurrence, titled `[Workflow] [{role}] {step}`, all before the first starts.
- **Log every deviation** to `tmp/workflow-runs/<runId>/skips.md` as `<occurrence-id> · <kind> · <evidence>`; a skipped task is completed with a comment, never deleted.
- **Parallel groups** run as waves: all members spawn in one message; the next step waits until every member returns.
- **Nested workflows** run as sub-agents that return a summary — except `workflow-review-changes`, which always runs inline in the main session (its loop owns the session Stop hook); its own reviewers stay sub-agents.
- **Run record** — run id, mode, fingerprint and occurrence ids persist, so a resume detects a changed definition and stops instead of silently switching.
- **Evidence-gated close** — `workflow-end` refuses to close until every outcome gate (`root-cause-traced`, `plan-approved`, `tests-pass`, `spec-synced`, `review-converged`, `run-closed`) has evidence: a review receipt or cited report, test command output, and so on.

### Workflow Catalog (19 Workflows)

| Workflow                          | Tier    | Steps | Use when                                                          |
| --------------------------------- | ------- | ----- | ----------------------------------------------------------------- |
| `workflow-feature`                | auto    | 28    | A well-defined feature or capability without a spec for it yet    |
| `workflow-big-feature`            | confirm | 45    | Large, ambiguous or research-heavy feature                        |
| `workflow-implement-spec`         | auto    | 11    | Behavior already written in a canonical spec                      |
| `workflow-bugfix`                 | auto    | 16    | A bug, crash, regression or stale output                          |
| `workflow-refactor`               | auto    | 15    | Restructure without changing behavior                             |
| `workflow-review-changes`         | auto    | 19    | Review uncommitted changes before commit                          |
| `workflow-spec-to-mockup`         | auto    | 8     | Clickable mockup of a UI spec, 1–3 design directions              |
| `workflow-feature-spec`           | auto    | 8     | Create or update a canonical feature spec                         |
| `workflow-code-to-spec`           | auto    | 6–11  | Spec from existing code, sync after changes, staleness audit      |
| `workflow-spec-sync`              | auto    | 11    | Update test specs after code, bug or PR changes                   |
| `workflow-initiative-to-spec`           | auto    | 19    | Raw idea → one reviewed provisional spec                          |
| `workflow-initiative-to-task`            | auto    | 30    | Initiative → ready-to-plan task, stories and test specs                  |
| `workflow-spec-to-task`            | auto    | 22    | Specs → prioritized, dependency-aware planned work                     |
| `workflow-greenfield-init`        | confirm | 55    | A new project from scratch                                        |
| `workflow-integration-test`       | auto    | 6–10  | Write or update integration tests spec-first, or drive a red suite to green |
| `workflow-e2e`                    | auto    | 6     | Write, update and verify E2E tests                                |
| `workflow-seed-test-data`         | auto    | 9     | Idempotent seeders and realistic dev data                         |
| `workflow-architecture-audit`     | auto    | 6     | Whole-project architecture and production-readiness check         |
| `workflow-research`               | auto    | 5–6   | Web research → synthesis, business, marketing or course output           |

### Key sequences (`gate` in bold)

- **Feature:** investigate → spec (+ optional discovery, domain, scenario, mockup) → test specs → plan → implement + integration tests → one spec sync → **review changes** → **verify once** → **close**.
- **Bug fix:** **root-cause investigation** → optional spec amend / plan → **regression test written** → fix → **review changes** (static) → **verify** (tests + mutation check: the test fails without the fix, passes with it) → **close**.
- **Refactor:** investigate → **run tests (green baseline)** → plan → optional safety-net tests → execute → **review changes** → **test** → **close**.
- **Implement spec:** investigate → spec [mode=clarify] → plan → execute → integration tests → **review changes** (static) → **verify** → **test** → **close**.
- **Spec to mockup:** design spec → **design review** → `work-item --mode=mockup --explore` → `html-export` → **UI review** → **close**.
- **Review changes:** `changes-review` ∥ whole-target `why-review` → triage-selected `--report-only` specialists (the integration-test review with `--prove-tests` always runs; a parent workflow that verifies once, last — `SYNC:verify-last-order` — passes `--tests=defer` and the review stays static) → validate findings → trace unexplained defects → `fix --target=review` → simplify → post-fix re-review → `scan --target=domain-entities → docs-manager --mode=update`. The domain-entity scan runs only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence; otherwise complete the scan task with a cited skip reason. `docs-manager --mode=update` always applies the spec/doc gaps the reviewers flagged read-only.

---

## 6. Skills

A skill is a directory with `SKILL.md` (frontmatter `name`, `description` = `[Category] Use when …`, optional `version`, `disable-model-invocation`) plus optional `references/`, `scripts/` and `tests/`. The body opens with a Quick Summary, carries a `PROTOCOL-GUIDES` block, and ends with closing reminders. Naming: lowercase-hyphen, subject-first when a family exists (`graph-code`, `tech-spec`). Read `.claude/docs/skills/README.md` and `.claude/docs/skill-naming-conventions.md` when you add or change a skill.

| Category                         | Count | Examples                                                             |
| -------------------------------- | ----- | -------------------------------------------------------------------- |
| Workflows (entry + lifecycle)    | 22    | `workflow-*`, `start-workflow`, `workflow-end`                       |
| Planning & architecture          | 7     | `plan` (modes `review`, `validate`, `execute`), `scenario`, `architecture` (modes `design`, `review`, `scalability`, `full`) |
| Implementation                   | 6     | `feature-implement`, `code-simplifier`                               |
| Understand, fix, debug, graph    | 4     | `investigate` (mode `debug`), `understand`, `fix`, `graph-code` (includes export mode) |
| Review & quality                 | 8     | `changes-review`, `why-review`, `security-audit`, `ui-design --mode=review` |
| Testing                          | 6     | `test`, `integration-test`, `e2e-test`, `experience-review`          |
| Specs & reference docs           | 6     | `spec` (modes `discovery`, `clarify`, `index`), `tech-spec`, `docs-manager` (modes `init`, `update`), `scan` |
| Design & UI                      | 3     | `ui-design`, `design-spec`, `work-item --mode=mockup`                                |
| Product / task                    | 4     | `initiative`, `work-item` (modes `refine`, `story`, `mockup`, `challenge`, `review`, `dor`), `prioritize` |
| Research & business content      | 6     | `web-research`, `source-deep-dive`, `market-analysis`                   |
| Documents, decks & media         | 9     | `feature-presentation`, `html-export`, `demo-guide`, `watzup`        |
| Git & delivery                   | 5     | `commit`, `pull-request`, `git-conflict-resolve`, `release-doc`    |
| Project setup, context & help    | 9     | `project-init`, `ai-context-refresh`, `project-skill-protocol`, `learn` |
| Framework maintenance            | 6     | `sync-codex`, `sync-opencode`, `skill-creator`, `prompt-enhance`     |

**Who can start a skill.** Most skills are model-invocable. 15 are command-only (`disable-model-invocation: true`, e.g. `sync-opencode`, `release-doc`, `product-roadmap`) — only the user starts them with `/name`. A team can hide more with a **skill profile** (`skillProfile` in `docs/project-config.json`): preset `full` · `standard` · `minimal`, plus `nameOnly`, `commandOnly` and `off` lists; `node .claude/scripts/sync-skill-profile.cjs` writes the result into `.claude/settings.json` `skillOverrides`. Hiding a skill that a workflow, agent or hook calls is refused unless `allowHidingCalledSkills: true`.

**Review-family modes.** `--fix-loop` (review → validate → fix → fresh re-review until converged; mints a review receipt) and `--report-only` (a leaf reviewer that only reports — no fixes, no questions, no nested fan-out — used when a caller owns the fixes).

---

## 7. Agents

Specialist sub-agents with their own context. Each declares `memory: project`; all inherit the session model except where a definition pins one. Agent files carry their role protocols; the universal rules reach every sub-agent through the `SubagentStart` hook, so a host that runs no hooks is unsupported. Choose by domain — `.claude/skills/shared/sub-agent-selection-guide.md` maps domain → agent, and specialist work never goes to the generic `code-reviewer`.

| Group              | Agents                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Implementation     | `backend-developer`, `frontend-developer`, `fullstack-developer`, `code-simplifier`, `database-admin` |
| Review             | `code-reviewer`, `architect`, `security-auditor`, `performance-optimizer`, `spec-compliance-reviewer` |
| Testing & debugging| `tester`, `integration-tester`, `e2e-runner`, `debugger`                                         |
| Research & planning| `planner`, `researcher`, `knowledge-worker`, `solution-architect`                               |
| Design             | `ui-ux-designer`                                                                                 |
| Docs & ops         | `docs-manager`, `git-manager` (explicit git requests only), `journal-writer`                     |
| Framework          | `framework-maintainer` (edits `.claude/` itself, not app code)                                   |

A sub-agent starts with no conversation context: its brief must name the files, reference docs, and any journey report or design plan it needs, and it writes its full findings to `tmp/reports/` and returns a summary.

---

## 8. Hooks and runtime

Hooks are Node scripts registered in `.claude/settings.json`. They read stdin JSON and write context to stdout. Only two can stop you:

| Hook                  | When it blocks                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `review-commit-gate`  | An agent `git commit` with no review receipt (or user-approved skip) for that exact changeset |
| `init-prompt-gate`    | `docs/project-config.json` exists but is invalid (repair commands still pass). A missing config only gets a once-a-day notice. |

Everything else is advisory or silent.

| Event                           | Hooks (purpose)                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SessionStart                    | `verify-install` (partial-install check, safe dependency install), `session-init` (session/plan state), `session-init-docs` (reference-doc status), `graph-session-init`, `file-convention-inject` and `prompt-ledger` (re-arm after compaction) |
| UserPromptSubmit                | `init-prompt-gate`, `graph-prompt-sync`, `workflow-route-inject` (routing catalog), `commit-skill-route`, `judgement-integrity-route`, `ai-feature-route`, `prompt-ledger` |
| UserPromptExpansion · PostToolUse `Skill`/`Read(SKILL.md)` · SubagentStart | six `protocol-inject-<group>` hooks (review, evidence-trace, workflow-task, spec-test, design, universal) |
| PreToolUse                      | `doc-sync-gate` (spec-drift warning), `review-commit-gate`, notifications on `AskUserQuestion`           |
| PostToolUse                     | `post-edit-prettier` (formatter), `graph-auto-update`, `file-convention-inject`, `prompt-ledger`, `token-budget-checkpoint` |
| Stop · Notification · SessionEnd| `notifications/notify.cjs` (turn-complete, question and permission alerts), `session-end` (cleanup)      |

**Key mechanisms**

- **Universal bundle** — the framework rules every task follows, in four messages, once per session, again after ~150K tokens of growth or a compaction, and once per spawned sub-agent.
- **Routing injection** — the gate plus the workflow catalog, once per session, re-armed on change, compaction or ~200K tokens of growth.
- **Protocol delivery** — when a skill loads, its group hook sends the full text of the protocols its guide lines name, once per session, capped per message.
- **Skill overlay reminder** — when a skill starts, a three-line reminder names the project overlay files that apply to it (repeats after ~150K tokens).
- **File conventions** — touching a file injects the matching `contextGroups[]` rules not already in context (opt-in `conventionInjection.enabled`; shell read: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`).
- **Prompt ledger** — pins your first prompt as the session goal and records every later prompt in `tmp/prompt-ledger/<session>/ledger.md`, re-delivered after compaction.
- **Token checkpoint** — an advisory note each time non-cached tokens pass a multiple of `hooks.tokenBudget.checkpointTokens` (default 500,000).
- **Code graph** — `hooks.codeGraph.enabled`: `auto` (default; active only when `.code-graph/graph.db` exists), `on`, `off`.
- **Notifications** — desktop alerts by default (`ENABLE_DESKTOP_NOTIFICATIONS=false` turns them off); Discord, Slack and Telegram when their env keys are set.

Read `.claude/docs/hooks/README.md` when you add a hook or need exact behavior, and `.claude/docs/troubleshooting.md` when one blocks or warns.

---

## 9. Shared protocols — one source, hybrid delivery

Reusable rules (evidence-based reasoning, root-cause debugging, severity rubric, UI/UX principles, and about 90 more) are written once in `.claude/skills/shared/sync-inline-versions.md` as `SYNC:<tag>` blocks and grouped in `protocol-groups.json`. `node .claude/scripts/build-protocol-projection.cjs` projects them into `.claude/skills/shared/protocols/`.

| Carrier                          | Holds                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| Normal skills                    | One guide line per protocol (tag, summary, when, path)                 |
| Protocol-inject hooks            | The full text, delivered when the skill loads                          |
| Guide line path                  | The fallback when a protocol's text is not in context                  |
| Review-family skills and agents  | Full inline bodies (a reviewer must never depend on delivery)          |
| Universal hook                   | The `universal` group in four messages (first prompt, every sub-agent) |

Why hybrid: a rule already in context beats a rule the model must go read, but repeating every body in every skill bloats context. Guides keep skills lean; hooks put the full rule in context exactly when it applies. After editing a canonical block, propagate with `sync-update-blocks.py <tag>` (or `/sync-skills-shared-protocols`) and rebuild the projection.

---

## 10. The quality chain — review, commit, pull request

1. **Review** — `changes-review` or `workflow-review-changes`. Triage all changes and create review tasks first. Standalone reviews default to review-only; the review workflow defaults to fix-loop. Every applied fix needs fresh review; LOW may be deferred without edits. Default cap three rounds; LOW-only at the cap is acceptable, while Critical/High/Medium or failed required checks ask the user for a bounded extension.
2. **Validate findings** — `why-review --validate-findings` checks every finding against evidence before any fix. It is terminal: it never recurses, so validation cannot loop.
3. **Fix** — `fix --target=review` fixes validated findings at the owning layer and records FIXED / REJECTED / DEFERRED with reasons; an unexplained defect is traced with `investigate --mode=debug` first.
4. **Receipt** — a converged `--fix-loop` mints a review receipt bound to the exact changeset; any later edit invalidates it.
5. **Commit** — `/commit` stages, runs the test-verify and review gates, and writes a Conventional Commit. `review-commit-gate` blocks any agent `git commit` without a receipt or a user-approved skip.
6. **Pull request** — `/pull-request` puts the work on a branch at the latest target (new branch if the old one was merged, rebase if it is unpushed and behind), asks initially or on material risk/scope escalation for tests and whole-branch review with explicit Skip options, reuses safe recorded preferences, runs fresh gates, commits, pushes, opens a ready PR and automatically checks routine CI repairs until green. It never merges or force-pushes. Target: `pullRequest.targetBranch` (default `main`).
7. **Doc sync** — reviewers flag spec/doc gaps read-only; `docs-manager --mode=update` applies them. `doc-sync-gate` warns when enforced areas change without their spec.

**Git discipline** (model-behavioral on every host): never commit, push or stage without an explicit request; branch before committing on the default branch; never run a command that destroys uncommitted work without asking; treat `gh`/GitHub-MCP writes like a push. Only the literal `permissions.ask` patterns in `.claude/settings.json` still prompt; the commit review gate is the one mechanical rule.

---

## 11. Design and UX gates

Any task that creates or reshapes a user-facing screen runs three rule sets in order, plus a review procedure:

| Set          | Question it answers                                           | Owner doc                             |
| ------------ | ------------------------------------------------------------- | ------------------------------------- |
| `UX-1`–`UX-11` | Whose job, which journeys, what each decision needs — a journey report first | `.claude/docs/ux-journey-process.md` |
| `UI-1.1`–`UI-9.4` | Usability and accessibility floor (pass/fail)             | `SYNC:ui-ux-design-principles`        |
| `DD-1`–`DD-8` | Is it this product's interface, not a generic template        | `.claude/docs/design-knowledge.md`    |
| `CL-1`–`CL-6` | How to review: context, evidence, P0–P4 severity, sweep       | `.claude/docs/design-review-checklist.md` |

Precedence: the brief's visual direction → the project's design system and ADRs → these clauses; genuine conflicts go to the user. **Explore mode** (`/work-item --mode=mockup --explore`, `/ui-design --mode=explore`) first asks how many drafts (3, 2, 1 or skip), opens them in the browser, recommends one with evidence and builds the full mockup only in the direction the user picks; with nobody to ask it builds one draft and records the automatic choice.

---

## 12. Specs and tests

- **Specs** live under the business spec root. The portable default is an 8-section Feature Spec whose §8 holds test cases `TC-{FEATURE}-{NNN}`; a project can declare its own artifact profile. `spec` authors, amends, writes test specs and syncs; `tech-spec` generates the derived technical view; `spec [mode=discovery]` and `spec [mode=clarify]` run before new specs.
- **Tests verify intent** — each test names the business rule or invariant it protects and must fail when that intent breaks.
- **A failed test gets a verdict before any edit:** SOURCE-WRONG · TEST-WRONG · TEST-NOT-OPTIMAL · ENVIRONMENT-BLOCKED · AMBIGUOUS. Never weaken, skip or relax a test to force green.
- **Test skills:** `integration-test` (write), `integration-test --mode=review` (quality), `integration-test --mode=verify` (run, `--fix-loop`), `e2e-test` / `e2e-test --mode=verify`, `experience-review` (drive the running product), `seed-test-data`.

Read `spec-system-reference.md` in the project-reference docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) when you write specs, and `integration-test-reference.md` in the same root when you write tests.

---

## 13. Project config and context

`docs/project-config.json` is **optional**: absent means portable defaults plus repository evidence; present means only `project.name` is required; a declared but malformed section fails closed. Main sections:

| Section                                    | Purpose                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `project`, `framework`, `modules`          | Identity, stack metadata, module map                     |
| `specRoots`, `docsRoots`, `referenceDocs`  | Where specs and docs live; which reference docs apply    |
| `contextGroups`, `conventionInjection`     | Per-path conventions and their hook delivery             |
| `designSystem`, `uiReview`, `styling`, `componentSystem` | UI capability and review settings        |
| `testing`, `e2eTesting`, `integrationTestVerify`, `experienceVerification` | Test commands and evidence contracts |
| `workflowPatterns`, `architectureRules`    | Architecture style, layer rules, doc-sync areas          |
| `portability`                              | Routing switches, activation tiers, tooling package name |
| `hooks`                                    | Startup install, Windows Git, code graph, token budget   |
| `commit`, `pullRequest`, `skillProfile`    | Commit trailer, PR target branch, skill visibility       |

- **Generated context** — `/ai-context-refresh` regenerates the `SECTION:*` blocks of `CLAUDE.md` from config (your own text outside them is preserved); `AGENTS.md` is a projection of it; `COUNT:*` markers are refreshed by `generate_catalogs.py`.
- **Reference docs** — `/scan --target=<doc>` and `/scan-all` regenerate project-reference docs from evidence (a missing capability is marked not applicable, never filled with example code).
- **Lessons** — `lessons.md` holds learned guardrails. At the end of non-trivial work Claude names the root-cause failure mode, checks it is general, recurring and not mechanically catchable, and then asks you to run `/learn`.
- **Project overlays** — `/project-skill-protocol` adds project rules on top of a framework skill. Overlays are additive only and can never waive a routing, git, review or confirmation gate.
- **Saved prompts** — `/custom-prompt` stores project playbooks.
- **Developer settings** — `.claude/.ck.json` (team) and the git-ignored `.claude/.ck.local.json` (personal) hold hook switches such as `promptLedger`, `commitSkillRoute`, `judgementIntegrityRoute` and `aiFeatureRoute`.

Read `.claude/docs/configuration/README.md` for every key and its default.

---

## 14. State, memory and recovery

Context compaction drops file contents and read state; summaries describe intent, not the environment. What survives: the task list, the workflow run record, `tmp/` reports, the prompt ledger and anything on disk.

- **Recover by re-reading:** `TaskList` first, then `CLAUDE.md`, the active plan and the files you will touch. Treat every "completed" claim in a summary as a hypothesis until evidence confirms it.
- **External memory:** long work writes its report incrementally to `tmp/reports/`, one section per append, so a cut-off loses nothing.
- **Re-arming:** protocol delivery, routing, file conventions and the prompt ledger all re-arm after compaction.
- **Disposable output** (reports, logs, screenshots, coverage) goes under `tmp/`; never into source, docs, plans or mirrors.

---

## 15. Portability — one source, every harness

The framework copies into any project and runs under Claude Code, Codex and OpenCode.

| Surface                                   | Status    | Produced by                                  |
| ----------------------------------------- | --------- | -------------------------------------------- |
| `.claude/**`, `CLAUDE.md` outside markers | Source    | hand-edited                                  |
| `.agents/skills/**`, `.codex/**`, `AGENTS.md` | Generated | `/sync-codex` (`run-codex-sync.mjs`, 19 stages) |
| `.opencode/**`, `opencode.json` skill policy | Generated | `/sync-opencode`                           |
| `.claude/skills/shared/protocols/`        | Generated | `build-protocol-projection.cjs`              |

Codex transforms `/skill` into `$skill`, `Agent` into `spawn_agent` and strips Claude-only keys; OpenCode gets a permission policy for command-only skills. `/sync-codex --verify-only` runs the read-only gates: workflow-cycle compliance, skill-protocol compliance, project-residue, SDD semantics, review-validate coverage, sync adoption parity, provenance markers and divergence.

**Portability rules** (owner: `.claude/docs/framework-portability.md`): no project names, absolute paths or stack-specific base classes in framework files; state a default together with its config key; a leak found in a mirror is fixed in the source. Self-checks about the framework's own files run only when the root `package.json` name matches `portability.toolingPackageName`.

---

## 16. Testing the framework

| Runner                                  | Tests  | Covers                                                                 |
| --------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `test-all-hooks.cjs` (primary gate)  | **133** | Hook behaviors, bridged suites and the count guard                     |
| `run-all-tests.cjs` (full aggregate) | **1839** | 118 discovered `tests/suites/*.test.cjs` files; primary gate runs separately |
| `node --test .claude/scripts/codex/tests` | —      | Mirror generators and verifiers                                        |
| `run-codex-sync.mjs --verify-only`      | —      | Every read-only gate before a commit                                   |

> Source inventory: `test-all-hooks.cjs` = 133; `run-all-tests.cjs` = 1839 declared across 118 suites. Both runners fail when these numbers drift from the docs. Counts do not establish runtime results; read the actual runner output for outcomes.

**Portable test contract** — shipped tests must pass in any project layout on Windows, macOS and Linux: build a temp fixture project instead of reading this repository's config or git state; blank inherited feature switches and provider keys; point `HOME`, `USERPROFILE`, `TMPDIR`, `TEMP` and `TMP` at the temp dir; name OS differences explicitly (paths, symlinks, `py -3` vs `python3`); run the full suite twice to prove repeatability.

---

## 17. Switches at a glance

| Feature                         | Key                                               | Default          |
| ------------------------------- | ------------------------------------------------- | ---------------- |
| Prompt-time routing mode        | `portability.workflowRouteMode`                   | ask              |
| Workflow activation tiers       | `portability.workflowActivation.{default,overrides}` | per workflow  |
| Extra routing guidance          | `portability.workflowRouteProtocol`               | none             |
| File-convention injection       | `conventionInjection.enabled`                     | off              |
| Code graph                      | `hooks.codeGraph.enabled` (`auto`/`on`/`off`)     | `auto`           |
| Token checkpoint                | `hooks.tokenBudget.{enabled,checkpointTokens}`    | on, 500,000      |
| Startup dependency install      | `hooks.startupInstall.enabled`                    | on               |
| Post-edit formatter             | `formatting.formatter` (`none` disables)          | Prettier         |
| Commit `Fix-Origin` trailer     | `commit.fixOriginTrailer`                         | off              |
| PR target branch                | `pullRequest.targetBranch`                        | `main`           |
| Skill visibility                | `skillProfile.preset`                             | `full`           |
| Prompt ledger                   | `.ck.json` `promptLedger.enabled`                 | on               |
| Commit / judgement / AI-feature routers | `.ck.json` `commitSkillRoute`, `judgementIntegrityRoute`, `aiFeatureRoute` | on |
| Desktop notifications           | env `ENABLE_DESKTOP_NOTIFICATIONS`                | on               |
| Framework off for one session   | `claude --settings .claude/config/vanilla-settings.json --disable-slash-commands` | — |

All `docs/project-config.json` keys unless marked `.ck.json` (`.claude/.ck.json`) or env.

---

## 18. Principles

| Principle                     | In practice                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Evidence before conclusion    | Cite `file:line`; state confidence; below 60% don't recommend                |
| Root cause at the owner       | Trace the wrong state to the component that owns the invariant; fix once there |
| Judgement integrity           | Treat a prompt's premise as a hypothesis; test it and its opposite; "no issues" is valid |
| Tests protect intent          | A test must fail when the business rule breaks, not only mirror behavior     |
| Hooks deliver the contract    | Universal rules, route and overlay reminders arrive only through hooks; an unreadable shipped file yields a one-line notice, and Codex needs the handlers reviewed in `/hooks` |
| Context is a budget           | Deliver rules once, at the moment of use; write long work to disk            |
| Parallel when independent     | Tag tasks PAR/SEQ, run independent waves in one message, wait for all        |
| Minimal, relevant change      | Every change traces to the request; disclose anything beyond it              |
| Portable by default           | Defaults plus config keys, never one project's names or paths                |

Sequential thinking is embedded in skills and agent definitions (`SYNC:sequential-thinking-protocol`) rather than provided by an external tool, so it works on every host.

---

## Where to read more

| Read                                            | When                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| `.claude/docs/README.md`                        | You need the full framework doc map                    |
| `.claude/docs/quick-start.md`                   | First run in a project                                 |
| `.claude/docs/universal-setup-guide.md`         | Adopting the framework in another repository           |
| `.claude/docs/configuration/README.md`          | Any config key, activation, skill profiles, notifications |
| `.claude/docs/hooks/README.md`                  | Hook inventory, events, receipts, startup install      |
| `.claude/docs/skills/README.md`                 | Skill anatomy, catalog, protocol guides                |
| `.claude/docs/agents/agent-patterns.md`         | Writing or changing an agent                           |
| `.claude/docs/development-rules.md`             | Framework coding rules and git-discipline rationale    |
| `.claude/docs/framework-portability.md`         | Keeping framework files portable                       |
| `.claude/docs/troubleshooting.md`               | A hook blocked or warned                               |
| `.claude/docs/ux-journey-process.md`, `design-knowledge.md`, `design-review-checklist.md` | UI and design work |
| `.claude/docs/code-graph-mechanism.md`          | Code-graph internals                                   |

---

## Closing reminders

- Route first; mid-session, never auto-start a workflow.
- Read project config and reference docs before acting; cite evidence; investigate root cause before fixing.
- Gates always run: failing test before a bug fix, review before commit, spec/doc sync when behavior changes, evidence before `workflow-end`.
- Edit `.claude/**`, never the generated mirrors; regenerate and verify every affected output.
