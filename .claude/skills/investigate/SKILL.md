---
name: investigate
description: '[Fix & Debug] Use when investigating and explaining how existing features or logic work. Flag: --mode=explain gives a developer-narrative walkthrough.'
version: 2.2.1
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->
> **[BLOCKING]** Execute phases in declared order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Before each phase or skill call, update task tracking; mark `in_progress` at start and `completed` after evidence.
> **[BLOCKING]** Record evidence for each completed/skipped phase; if task tools are unavailable, maintain an equivalent tracker.
> **[BLOCKING]** Investigation stays READ-ONLY; report findings, never patch source.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Explain existing code through READ-ONLY, evidence-backed exploration so every finding maps to `file:line` (or "inferred"), system flow is verified, and follow-up decisions rest on evidence without changing source.

**Summary:**

- **Purpose:** map behavior from trigger to exit, including transformations, side effects, validation, authz, errors, and cross-service paths; stop at findings.
- **Ordered work:** (0) classify `quick|deep|debug|recommendation|explain` → (1) discover `Entities → Commands/Queries → EventHandlers → Controllers → Consumers → Components` → (2) graph-expand 2–3 key files (main agent; mandatory when `graph.db` exists) → (3) document the per-file knowledge graph → (4) map entry→exit flow → (5) analyze rules/validation/authz/errors/edge cases → (6) synthesize (deep writes/re-reads analysis file; explain writes ledger) → (7) present cited findings.
- **Gates:** stay READ-ONLY; cite `file:line` and mark unknowns `inferred`; recommendation scope requires the full validation chain and confidence; cross-service scope scans producers, consumers, sagas, and contracts.

**Workflow:**

1. **Phase 0: Classify** — MUST ATTENTION determine scope (quick / deep / debug / recommendation / explain) before acting
2. **Discovery** — MUST ATTENTION search codebase for related files (Entities > Commands/Queries > EventHandlers > Controllers > Consumers > Components)
3. **Graph Expand** — MUST ATTENTION run graph queries on 2-3 key files (MANDATORY, main agent only)
4. **Knowledge Graph** — MUST ATTENTION read + document purpose, symbols, dependencies per file
5. **Flow Mapping** — MUST ATTENTION trace entry points through pipeline to exit points
6. **Analysis** — MUST ATTENTION extract business rules, validation, authorization, error handling
7. **Synthesis** — MUST ATTENTION for deep scope, write and re-read `tmp/analysis/[feature]-investigation.md`; explain scope writes its ledger; quick scope skips the analysis file
8. **Present** — MUST ATTENTION deliver structured findings, offer deeper dives

**Modes:**

- **Default (analysis)** — MUST ATTENTION deliver engineer-facing structured findings + analysis file; quick scope may skip the file.
- **`--mode=explain`** (developer narrative) — MUST ATTENTION keep the same READ-ONLY, evidence, and graph gates; deliver a one-way Purpose → How → Why → Impact explanation in a git-ignored ledger. See [Mode: Explain](#mode-explain-developer-narrative). Use `/understand [target]` for the standalone explainer.

**Key Rules:**

- Strictly READ-ONLY — NEVER make code, plan, or spec changes
- Every claim/finding needs `file:line` proof — mark unverified as "inferred"
- MUST ATTENTION run at least ONE graph command on key files before concluding; sub-agents cannot satisfy the main-agent graph gate
- MUST ATTENTION plan a task to READ `project-structure-reference.md`; if missing, search project documentation, coding standards, and architecture docs

## Phase 0: Scope Classification

**Classify before acting** — MUST ATTENTION route to the required depth:

| Scope              | Signals                                        | Depth                                                    |
| ------------------ | ---------------------------------------------- | -------------------------------------------------------- |
| **Quick**          | Single feature/function, clear entry point     | grep → trace → answer (no analysis file needed)          |
| **Deep**           | Multi-service, cross-boundary, ambiguous scope | Full workflow + knowledge graph template + analysis file |
| **Debug**          | Error/crash/unexpected behavior                | Root-cause-debugging protocol above                      |
| **Recommendation** | Code change suggested (removal, refactor)      | Validation chain protocol below — MANDATORY              |
| **Explain**        | `--mode=explain` flag | Investigation-local developer narrative — see [Mode: Explain](#mode-explain-developer-narrative). Use `/understand` for the standalone prompt-driven explainer. |

Quick scope: MUST ATTENTION run grep → graph trace → present; skip knowledge-graph template + analysis file.
Deep scope: MUST ATTENTION write to `tmp/analysis/[feature]-investigation.md`.
Explain scope: MUST ATTENTION keep the same READ-ONLY evidence gate; deliver in-chat narrative + git-ignored ledger, NOT the analysis file.

## Investigation Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs `file:line` proof; confidence >80% to act.**
- NEVER assume names describe behavior — verify actual implementations
- MUST ATTENTION cite `file:line` for every finding; mark unproven claims "inferred"
- ALWAYS grep usages, consumers, and cross-service references — NEVER assume completeness
- ALWAYS trace actual call paths with evidence — NEVER rely on signatures alone

### Logical-ID Extraction & Business-Intent Rule (M3/M5)

> **AI-SDD Artifact Contract** — Shared SDD rules keep reusable guidance in `.claude`, require the `spec → plan → tasks → implement → verify → update spec/docs` cycle, traceability, explicit unknowns, and intent-guarding tests. Project-specific paths and commands come from project docs.
> Extracted rules use logical IDs and separate abstract source anchors; findings state business intent, not only implementation behavior.

MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria before extracting operations, business rules, or events into findings:

- Assign each extracted operation/rule/event a logical ID (FR-/BR- for operations/rules) as PRIMARY. Keep `[Source: namespace/service/id]` as a separate abstract-anchor carrier; never use physical coordinates/repository paths in the rule statement (M3).
- For every rule, explain **WHY** it exists (business intent/invariant), not only **WHAT** code does; state it in tech-agnostic terms reusable on any stack (M5).

## Workflow

1. **Discovery** — MUST ATTENTION search all related files. Priority: Entities > Commands/Queries > EventHandlers > Controllers > Consumers > Components.
2. **Graph Expand (MANDATORY — DO NOT SKIP)** — **YOU (main agent) MUST ATTENTION run graph queries YOURSELF** on key files from Step 1. Sub-agents CANNOT use graph — only you can. Pick 2-3 key files (entities, commands, bus messages):
    ```bash
    python .claude/scripts/code_graph connections <key_file> --json
    python .claude/scripts/code_graph query callers_of <FunctionName> --json
    python .claude/scripts/code_graph query importers_of <file_path> --json
    # "ambiguous" → search to disambiguate, retry with qualified name
    python .claude/scripts/code_graph search <keyword> --kind Function --json
    # Trace how two nodes connect
    python .claude/scripts/code_graph find-path <source> <target> --json
    # Filter by service, limit results
    python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
    ```
    Graph reveals callers, importers, tests, inheritance, and other edges grep misses. Also run `/graph-connect-api` for frontend-to-backend API mapping.

**Post-Grep Trace Trigger:** when discovery surfaces an important entry file — entity, command/query, handler, controller, bus message/consumer, component, store, or API service — immediately run `py -3 .claude/scripts/code_graph trace <key-entry-file> --direction both --json` before concluding. It reveals callers, consumers, bus messages, event chains, and tests grep CANNOT find. **Pattern: grep → graph trace → grep verify.**
3. **Knowledge Graph** — MUST ATTENTION read + analyze each file from grep + graph results; document purpose, symbols, dependencies, and data flow. Batch in groups of 10 and update progress after each batch. Use the per-file template:
4. **Flow Mapping** — MUST ATTENTION trace entry → exit; map transformations, persistence, side effects, and cross-service boundaries.
5. **Analysis** — MUST ATTENTION extract business rules, validation, authorization, errors, happy path, and edge cases.
6. **Synthesis** — Answer the original question with an executive summary, key files, patterns, and text flow diagrams.
7. **Present** — Use Output Format; offer deeper dives.

**If a prior discovery pass supplies a numbered file list:** use those confirmed paths, skip redundant discovery, and prioritize highest relevance.

### Parallel Investigation Threads (Discovery → ONE wave → Graph Expand)

Investigation is strictly READ-ONLY; parallelize independent threads with disjoint write targets. Once Step 1 names the surface, decompose it BEFORE deep reads:

| Decomposition axis | One thread per…                                   | Use when                                                                              |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Per-module**     | module / bounded context the target spans          | the feature crosses several modules                                                   |
| **Per-layer**      | backend · frontend · data/persistence              | a full-stack flow — each layer reads a disjoint file set                              |
| **Per-question**   | one hypothesis, or one "how does X work?" question | Phase 0 classified `debug`, or the prompt carries several independent questions       |
| **Per-service**    | each service that produces/consumes the flow       | cross-service / event-driven target (pairs with the Cross-Service Check protocol)     |

Dispatch rules specific to this skill:

1. **Declare, then spawn in ONE message** — `Parallel plan: wave 1 = [thread A, thread B, …] · SEQ = [Graph Expand, Flow Mapping, Analysis, Synthesis] (each consumes the whole wave)`.
2. **Route per thread** — file/symbol landscape → `researcher`; root-cause/hypothesis → `debugger`; never a generic reviewer. The main `investigate` pass owns graph expansion after the read-only barrier.
3. **Own scope + report path** — each brief names exact files/questions and its own target (`tmp/analysis/[feature]-{thread}.md` or `tmp/reports/…`); threads NEVER share files and persist incrementally, not as transcripts.
4. **Graph Expand stays SEQ on YOU** — after the barrier, run Step 2's commands on 2–3 surfaced key files; this reconciles the independent threads into one dependency network.
5. **Synthesize from reports, not memory** — re-read each thread report, then write Steps 4–6 (Flow Mapping → Analysis → Synthesis) yourself.

**SEQ boundary:** a thread starting from another thread's finding is SEQ, not PAR. Example: consumer tracing waits for the published-event finding, so place it in wave 2 and name that dependency. Threads sharing only a topic (same feature, different layer) remain PAR.

## Investigation Techniques

### Discovery Search Patterns

Grep `{FeatureName}` with: `EventHandler`, `BackgroundJob`, `Consumer`, `Service`, `Component`.

**Priority order (stack-neutral):** (1) Domain model (entities/aggregates) → (2) Use-cases (commands/queries) → (3) Event handlers (side effects) → (4) Entry points (controllers/API/routes) → (5) Cross-service consumers → (6) Background jobs/schedulers → (7) UI components/stores → (8) Services/helpers. _Folder names, globs, and framework markers vary; discover them from the project's structure reference + project config._

### Dependency Tracing

**Backend (stack-specific locators):** method/function callers (grep backend source); dependency injectors (interface/type in constructors or DI wiring); domain-event subscribers (framework handler type); cross-service message handlers (message/event contract); repository/data-access usage (repository/data-access interface).

**Frontend:** component users (grep selector in templates); service importers (grep class in source); store/state chains (`state-effect → API call → response handler → state`); routes (grep component in routing files). _Find globs and framework primitives in the project's frontend reference + config._

### Data Flow Mapping

Document as: `[Entry] → [Validation] → [Processing] → [Persistence] → [Side Effects]`

**MUST ATTENTION trace:** (1) entry points, (2) processing pipeline, (3) transformations, (4) persistence, (5) exits/responses, (6) cross-service message-bus boundaries.

### Common Investigation Scenarios

| Question Type               | Steps                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| "How does X work?"          | Entry points → command/query handlers → entity changes → side effects                   |
| "Where is logic for Y?"     | Keywords in commands/queries/entities → event handlers → helpers → frontend stores      |
| "What happens when Z?"      | Identify trigger → trace handler chain → document side effects + error handling         |
| "Why does A behave like B?" | Find code path → identify decision points → check config/feature flags → document rules |

### Project Pattern Recognition

**Backend** (search `backend-patterns-reference` in docs/): CQRS commands/queries, entity event handlers, message-bus consumers, repository extensions, fluent validation, authorization attributes.

**Frontend** (search `frontend-patterns-reference` in docs/): component base classes, view-model/state-store base, reactive data-fetch effects with loading/error states, API service base class.

### Graph Intelligence (MANDATORY when graph.db exists)

**MUST ATTENTION orchestrate grep → graph → grep dynamically:** (1) Grep key terms to find entry files, (2) Use `connections`/`batch-query`/`trace --direction both` to expand dependency network, (3) Grep again to verify content. `trace` follows ALL edge types including MESSAGE_BUS and TRIGGERS_EVENT.

```bash
python .claude/scripts/code_graph connections <file> --json     # Full picture
python .claude/scripts/code_graph query callers_of <name> --json
python .claude/scripts/code_graph query importers_of <file> --json
python .claude/scripts/code_graph query tests_for <name> --json
python .claude/scripts/code_graph batch-query <f1> <f2> --json
```

## Evidence Collection

**Deep scope — MANDATORY:** Write analysis to `tmp/analysis/[feature-name]-investigation.md`; MUST ATTENTION re-read it ENTIRELY before presenting.

Structure: Metadata (original question) → Progress → File List → Knowledge Graph (per-file entries per SYNC:knowledge-graph-template) → End-to-Start Debugger Trace (bug/fix/behavior-changing) → Data Flow → Findings.

**Rule:** Every 10 files, MUST ATTENTION update progress and re-check alignment with the original question.

### Analysis Phases

**Comprehensive:** Run one focused pass per applicable dimension; for each, ask what it protects, what fails if weak, and what evidence proves the answer:
- **Happy path** — trace expected input → processing → result.
- **Error paths** — trace failures, handling, and observable outputs.
- **Edge cases** — trace boundary, empty, duplicate, retry, and alternate paths found in code.
- **Authorization** — trace actors, permissions, ownership, and denial paths.
- **Validation per layer** — trace where each invariant enters, is enforced, and can be bypassed.

Extract core business rules, state transitions, side effects, and evidence for each dimension.

**Synthesis:** Executive summary (1-para answer, top 5-10 key files, patterns) + step-by-step `file:line` walkthrough + flow diagrams.

### Output Format

MUST ATTENTION include: (1) Direct answer (1-2 paragraphs), (2) Step-by-step "How It Works" with `file:line` refs, (3) Key Files table, (4) Data Flow diagram, (5) "Want to Know More?" subtopics.

For bug, failed-verification, or behavior-changing investigations, MUST ATTENTION also include:

```markdown
### Debugger Trace: End -> Start

- Observed final state:
- Final reader/query/renderer/assertion:
- Backward hops: reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- Feeder paths scanned:
- Unknown or unverified paths:

### Hypothesis Matrix

| RC | Hypothesis | Evidence for | Evidence against | Status | Verification |
| --- | --- | --- | --- | --- | --- |
```

### Guidelines

- **Evidence-based** — every claim needs code evidence; MUST ATTENTION mark unverified as "inferred"
- **Question-focused** — ALWAYS tie findings back to the original question
- **Read-only** — NEVER suggest changes unless explicitly asked
- **Layered** — start simple, offer deeper detail on request

## Related Skills

`researcher` (delegated landscape research) | `workflow-feature` (implementation) | `debug-investigate` (debugging) | `graph-query` (natural language queries)

---

## Mode: Explain (Developer Narrative)

**Trigger:** `/investigate --mode=explain [target]`. Manual-only; never auto-inserted into workflows. Use `/understand [target]` for the standalone explainer.

**Only change:** audience, shape, and write target. The evidence gate stays **identical and NON-NEGOTIABLE**: code/plans remain READ-ONLY; every concrete claim cites `file:line`; ≥1 graph command runs on key files; confidence >80% to assert. Explain mode NEVER relaxes these; mark unsupported narrative points "inferred".
**Goal:** make the **developer** understand **WHAT** the work is, its **PURPOSE**, **HOW** it works, and **WHY this way** (trade-offs + rejected alternatives) through a clear, detailed, **one-way** explanation. Derive scope from the prompt; no fixed agenda.

### Contract (read first)

- **DERIVE SCOPE FROM THE PROMPT.** No target → current context: active tasks (`TaskList`), working-tree changes (`git diff --name-only` + untracked via `git ls-files --others --exclude-standard`), active plan, and latest `/watzup` summary.
- **NEVER ASK THE USER A QUESTION.** Stay one-way: no teach-back, quiz, `AskUserQuestion`, ambiguity question, or comprehension gate. Infer the likeliest target, state the assumption once, proceed. The explicit-skill workflow-detection exemption still applies.
- **OPT-IN, NEVER BLOCKS.** Explain and end; never loop or gate commit, implementation, or workflow progress.
- **ALWAYS EXPLAIN IN FULL.** Cover purpose + how + why every time.
- **EXPLAIN THE WHOLE SCOPE, LEAD WITH THE NON-OBVIOUS.** Cover all scope, order by blast radius, future-change cost, and surprise; treat boilerplate/CRUD briefly.
- **WRITES ONLY to a project-root temp folder.** Never edit source/plan files or `tmp/analysis/...`; the only write target is `tmp/understand/{branch}.md` (Step E3).

### Step E0 — Resolve scope

1. **Derive scope from the prompt:**

   | Prompt signal | Scope to explain |
   | ------------- | ---------------- |
   | Bare invocation, no target named | **Default: current working context** — active tasks + working-tree changes + active plan / latest `/watzup`. |
   | Names a change set / PR / "what I just did" | The diff and its rationale. |
   | Names a plan / "the approach" / "before we build" | The active plan: problem, approach, rejected alternatives, risks, phase order. |
   | Names a subsystem / file / feature / "how does X work" | That code path — read files, run a graph trace, explain the flow. |
   | Names a single decision / "why X over Y" | That decision and its trade-offs. |
   | Names a concept / bug / error | That concept or root cause. |
   | Ambiguous / multiple plausible targets | **Do NOT ask.** Infer most likely (default current context), state the assumption in one line, proceed. |

    State resolved scope in one line (e.g. `Explaining: current working changes (3 files) + active task #42`).

### Step E1 — Gather the material (proportional to scope)

- **Current context:** read `TaskList`, `git diff --name-only` (+ untracked), active plan, and latest `/watzup`; extract work, changes, rationale, behavior.
- **Plan:** read `plan.md` + `phase-*.md`; extract problem, approach, rejected alternatives, decisions, risks, phase order.
- **Subsystem:** read files; run `python .claude/scripts/code_graph trace <file> --direction both --json`; extract entry points, data flow, invariants.
- **Single decision:** read relevant code + rationale (comments, git blame, plan alternatives).

Do not read the whole repo for one decision.

### Step E2 — Order topics by leverage

Cover the whole scope; use these only to ORDER: **Blast radius** (`/graph-blast-radius` or graph trace; highest reach first) · **Future-change cost** (schema, public contract, cross-service message, shared/framework layer first) · **Surprise** (call out what a competent engineer would not guess). Give boilerplate/generated/mechanical renames one line.

### Step E3 — Maintain the understanding ledger

> **[HARD RULE]** Write the ledger ONLY to a project-root temp folder — NEVER inside `.claude/`, the source tree, or any tracked path.
>
> Path: `tmp/understand/{branch}.md` (use `temp/understand/{branch}.md` if the project already uses `temp/`); create the subdir if absent, replace branch `/` with `-`, and ensure it is git-ignored.
>
> **[ANNOUNCE — the chat is the deliverable]** The explanation lives in chat, not only in the file. Whenever writing/appending, state `Understanding ledger updated → tmp/understand/{branch}.md`; NEVER leave the explanation only in the ledger.

Append, never overwrite, a checklist with: **Problem** (purpose, prior limitation, branches) · **Solution** (design, business logic, edge cases, alternatives) · **Impact** (what/who changes, blast radius, follow-ups).

### Step E4 — Explain: Purpose → How → Why (the deliverable)

Deliver in chat, in this order, for **every** level; tune depth/vocabulary only. Cite `file:line` for every concrete claim.

1. **WHAT** — one-line orientation: name the thing and location.
2. **PURPOSE (why-it-exists)** — problem solved, prior limitation, and necessary alternative branch; lead here.
3. **HOW (mechanics)** — trace entry points, data flow, invariants, callers, business logic, and handled edge cases using graph evidence.
4. **WHY-this-way (trade-offs)** — explain why this over alternatives, cost/benefit, reversibility, and non-obvious decisions ("we did X instead of Y because Z").
5. **IMPACT (blast radius & follow-ups)** — what/who changes, upstream/downstream reach, open follow-ups.

Offer a simpler restatement/analogy for dense points when useful. Answer `eli5`/`elii` follow-ups; NEVER pose questions to the developer.

### Step E5 — Recap & close (no quiz, no loop)

Mark ledger items `explained`. Close with a 2–3 line recap: purpose, key mechanic, and highest-leverage trade-off/blast-radius note. End there; do NOT quiz, ask for restatement, loop, or block the next step.

**NOT for:** investigation/docs/design/research where nothing was built or planned to understand; comprehension gates; code-quality review (use `/code-review`, `/changes-review`).
**Anti-Rationalization:** "Senior dev, skip it" → NEVER skip by level. · "I'll quiz them" → one-way only. · "Ambiguous — ask which" → infer + state assumption. · "Dump everything" → derive scope, order by leverage. · "Skip trade-offs" → WHY-this-way is mandatory. · "Drop ledger" → only `tmp/understand/{branch}.md`; announce its path because chat is the deliverable.

---

## Investigation & Recommendation Protocol

Applies only when recommending code changes (removal, refactoring, replacement). MUST ATTENTION complete the full validation chain.

### Validation Chain (NEVER skip steps)

**NEVER recommend code changes before completing ALL steps:**

1. Interface/API identified → 2. ALL implementations found → 3. ALL registrations traced → 4. ALL usage sites verified → 5. Cross-service impact (ALL services) → 6. Impact assessment → 7. Confidence declaration → **ONLY THEN** output recommendation.

**If ANY step incomplete → STOP.** State "Insufficient evidence to recommend."

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                                              |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact + cross-service check (all services) |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification + cross-service check          |
| **LOW**    | Renaming variables, formatting, comments                      | Code review only                                               |

### Removal Checklist (ALL MUST ATTENTION pass)

- MUST ATTENTION verify no static references (`rg "ClassName" {configured-source-roots}` returns no live references)
- MUST ATTENTION verify no string literals/dynamic invocations (reflection, factory, message bus)
- MUST ATTENTION verify no DI registrations (`services.Add*<ClassName>`)
- MUST ATTENTION verify no config references (appsettings, env vars)
- MUST ATTENTION verify no test dependencies
- MUST ATTENTION verify cross-service impact (ALL microservices)

**Incomplete checklist → state:** `Confidence: <90% — did not verify [missing items]`.

### Evidence Hierarchy

(1) Code evidence (grep/read) → (2) test evidence → (3) documentation → (4) inference. Recommendations based on inference alone are FORBIDDEN; MUST ATTENTION upgrade to code evidence.

### Confidence Levels

**95-100%** full trace + all services | **80-94%** main paths verified | **60-79%** partially traced | **<60% DO NOT RECOMMEND**

**Format:** `Confidence: 85% — Verified main usage in ServiceC, did not check ServiceA/ServiceB`

### Service Comparison Pattern

Find working reference → compare implementations → identify differences → verify WHY each exists → recommend from proven pattern, NEVER assumptions.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting, including each file read; this prevents long-file context loss. For simple tasks, AI MUST ATTENTION ask the user whether to skip.

- `domain-entities-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — domain entity catalog, relationships, cross-service sync (when task involves business entities/models).

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:knowledge-graph-template -->

> **Knowledge Graph Template** — For each analyzed file, document: filePath, type (entity, command, query, event handler, controller, consumer, component, store, service, or repository-specific equivalent), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), abstractions, and moduleContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Messaging fields: messageName, messageProducers, crossBoundaryIntegration. UI fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

<!-- /SYNC:knowledge-graph-template -->

<!-- SYNC:root-cause-debugging -->

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Rule the environment in or out** — Sweep environment preconditions (versions, dependency/install state, config & env vars, service dependencies, ports/network/clock, permissions, leftover state) AND resource/transience suspects (RAM/OOM, CPU saturation, disk/inode/temp, handle & pool limits, timeouts that are really slowness) BEFORE deep code tracing. The environment is a competing hypothesis, not a fallback — see `SYNC:environment-fault-hypothesis`.
> 3. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 4. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 5. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it. Keep the environment hypothesis in the matrix until evidence rules it out.
> 6. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 7. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`. An environment cause is fixed in the environment or setup — never by editing product code or tests to absorb it.
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step. Assume a failure is a code defect before the environment is ruled out.

<!-- /SYNC:root-cause-debugging -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `/project-init` or `/project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `/project-init` or `/project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `/project-init` or the narrow owner route (`/project-config`, `/docs-init`, `/scan --target=<key>`, `/ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `/sync-codex` route or its documented `/ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

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

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
>
> AI default behavior: see error at Place A → fix Place A without tracing. This can treat a symptom while leaving its cause in place.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace the affected path** — Map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
> 2. **Identify the contract owner** — Use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
> 3. **Choose the correction point** — Fix the authoritative owner and retain validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
> 4. **Check bypass paths** — Inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
>
> **BLOCKED until:** `- [ ]` The affected path is traced `- [ ]` Contract owner supported by `file:line` evidence `- [ ]` Relevant consumers and bypass paths checked `- [ ]` Correction point fits the project's architecture
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" without tracing — the observed failure site may not own the violated contract.
> - "Add defensive checks at every consumer" without evidence — scattered workarounds can hide an uncorrected source defect.
> - "Always fix at the lowest layer" — a lower layer may not own the contract; prove ownership from this project's architecture.

<!-- /SYNC:fix-layer-accountability -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:environment-fault-hypothesis -->

> **Environment-Fault Hypothesis** — A bug report, failing test, error, crash, or unexpected output is NOT proof of a code defect. The ENVIRONMENT is a first-class competing hypothesis in every debug / investigation / adjudication — weighed from the start, never a fallback reached only after the code looks fine.
>
> 1. **Sweep environment preconditions BEFORE deep tracing** — it is cheap and it reframes everything downstream: toolchain/runtime/SDK version · dependency install state (lockfile drift, partial restore, stale build/cache/generated artifacts) · env vars, secrets, config or profile selection · service dependencies actually up, migrated and seeded (DB, broker, cache, container/compose, external API) · ports, network, proxy, DNS, TLS/cert, system clock · OS/platform, path separators, line endings, locale/timezone · permissions and file locks · leftover state from a prior run (stale processes, containers, volumes, held ports, test data, dirty working tree).
> 2. **Name resource pressure and transience as explicit suspects** — RAM/OOM and swap pressure · CPU saturation or throttling (parallel test workers, noisy neighbour, small CI runner) · disk, inode or temp-dir exhaustion · file-handle and connection-pool limits · network flakiness and rate limits · a timeout that is really slowness. **Tell-tale shape:** non-deterministic · timing-dependent · passes alone but fails in parallel · fails only on one machine or only on CI · the error names resources, not business rules.
> 3. **Discriminate — then cite the discriminator.** Does it reproduce deterministically on a clean environment? Did code on the failing path change since it last passed (`git log` / `git diff` that path)? Does it fail for every machine/actor or exactly one? Does concurrency 1, a clean rebuild, or a fresh container change the result? A verdict without a discriminator you actually ran is a guess — for the environment AND for the code.
> 4. **Report an environment cause AS an environment cause.** Preserve diagnostics (exact command, exit code, full output, resource evidence, timestamps), name the setup/cleanup/provisioning remedy and its owner, and STOP mutating source or tests. NEVER edit product code, weaken an assertion, relax a timeout, or skip a test to absorb an environment fault — that hides the real defect and permanently rots the test.
> 5. **Flaky is a symptom, not a verdict.** A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named. Record it with its evidence; fix the environment or the test seam. Retry-until-green is not a resolution.
>
> **BLOCKED until:** `- [ ]` Precondition sweep done `- [ ]` Resource/transience suspects considered `- [ ]` Discriminator run and cited `- [ ]` Verdict names CODE or ENVIRONMENT with evidence
>
> **NEVER:** Treat "the test failed" as "the code is wrong". Conclude "just flaky" without a mechanism. Absorb an environment fault into source or tests. Chase a code hypothesis while an unchecked environment precondition is still in play.

<!-- /SYNC:environment-fault-hypothesis -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:knowledge-graph-template:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** document per-file: type, pattern, symbols, dependencies, relevanceScore, evidenceLevel.
<!-- /SYNC:knowledge-graph-template:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `/project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `/project-init` or `/project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

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

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Explain existing code through READ-ONLY, evidence-backed exploration so every finding maps to `file:line` (or "inferred"), system flow is verified, and follow-up decisions rest on evidence without changing source.

**IMPORTANT MUST ATTENTION — Main steps:** run in order: (0) classify `quick|deep|debug|recommendation|explain` → (1) discover all related files (`Entities → Commands/Queries → EventHandlers → Controllers → Consumers → Components`) → (2) main-agent graph-expand 2–3 key files → (3) build the per-file knowledge graph → (4) map entry→exit flow and side effects → (5) analyze rules, validation, authz, errors, and edge cases → (6) synthesize (deep analysis file; explain ledger) → (7) present cited findings.

**IMPORTANT MUST ATTENTION — Modes/gates:** Default analysis returns structured findings; quick skips the knowledge-graph template and analysis file; deep writes/re-reads `tmp/analysis/[feature]-investigation.md`; `--mode=explain` writes only `tmp/understand/{branch}.md` and delivers one-way WHAT → PURPOSE → HOW → WHY → IMPACT, never questions or loops. Stay READ-ONLY; cite `file:line` or mark "inferred"; `graph.db` requires a main-agent graph command (sub-agents cannot satisfy it); recommendation scope requires the full validation chain; cross-service scope scans producers, consumers, sagas, and contracts; bug/behavior-changing scope runs end-to-start tracing plus a hypothesis matrix.

**Protocols in force (SYNC bodies above are canonical):**

- **End-to-Start + Root Cause:** start at observed end state; reproduce, isolate, trace, hypothesize, verify; fix only at the owning layer.
- **Knowledge Graph + Evidence:** document per-file type/pattern/symbols/dependencies/relevance/evidence level; cite every claim and confidence.
- **Project Docs + Task Tracking:** read required docs first; create/advance tasks one at a time; persist deep findings incrementally.
- **Critical/Sequential Thinking:** use Thought N/M with revisions/branches/hypotheses when needed; never present guesses as facts.
- **Cross-Service + Source/Test Drift:** scan producers, consumers, sagas, contracts; reconcile affected tests when source behavior changes.
- **Parallel Dispatch:** tag PAR/SEQ, use disjoint write-set waves, spawn each wave in one message, honor the all-return barrier.
- **Nested Tasks + Fix Layer:** expand child phases when nested; trace origin → crash and protect all consumers at the lowest invariant-owning layer.

**IMPORTANT MUST ATTENTION** stay READ-ONLY — NEVER edit code, plans, or specs during investigation; deliver findings only — why: mutation corrupts the baseline the next step trusts.
**IMPORTANT MUST ATTENTION** cite `file:line` for every claim; mark unverified statements "inferred"; confidence >80% to act, <60% DO NOT recommend — why: an unmarked guess propagates as fact.
**IMPORTANT MUST ATTENTION** run at least ONE `code_graph` command on 2–3 key files before concluding; also run `/graph-connect-api` for frontend-to-backend mapping — why: graph exposes edges grep misses.
**MANDATORY IMPORTANT MUST ATTENTION** create tasks before work, keep one `in_progress`, and complete each after evidence; if nested, expand/link child phases.
**MANDATORY IMPORTANT MUST ATTENTION** read required project docs first, including `lessons.md` and `project-structure-reference.md` for architecture; local conventions override generic assumptions.
**MANDATORY IMPORTANT MUST ATTENTION** grep 3+ patterns and read implementations before concluding; evaluate fit before copying a nearby pattern.
**MANDATORY IMPORTANT MUST ATTENTION** deep scope → write/re-read `tmp/analysis/[feature]-investigation.md`; recommendation scope → complete implementations → registrations → usages → cross-service impact → confidence or state "Insufficient evidence to recommend."
**MANDATORY IMPORTANT MUST ATTENTION** bug/behavior-changing scope → trace end-to-start, enumerate feeder paths, build the hypothesis matrix, identify the owning layer, and prove forward convergence before any fix recommendation.

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| "Simple investigation, skip graph"                 | Graph reveals callers + bus consumers grep misses. Run it anyway.             |
| "Already grepped, enough evidence"                 | Show `file:line` proof. No citation = no evidence; unverified = mark inferred. |
| "Quick task, skip TaskCreate"                      | Still need tracking. Create tasks, mark done immediately.                      |
| "Recommendation is obvious, skip validation chain" | Risk matrix applies regardless of confidence. Complete ALL steps or STOP.      |
| "Deep scope wastes time for this"                  | Classify first. If quick, fine — but DECLARE scope before skipping steps.      |
| "Nearby example is close enough, copy it"          | Closest ≠ matching preconditions. Verify base class, scope, lifetime first.    |
| "I'll just fix what I found while here"            | READ-ONLY. Investigation never mutates; hand findings to the fix step.         |

**[TASK-PLANNING]** Before acting, analyze scope and break work into small tasks/subtasks with `TaskCreate`.

**IMPORTANT MUST ATTENTION** READ-ONLY always; cite `file:line` or mark "inferred".
**IMPORTANT MUST ATTENTION** classify and run the ordered phases; complete the required validation gates before concluding.
**IMPORTANT MUST ATTENTION** run ONE graph command on key files before concluding; these three rules bind every scope and mode.
