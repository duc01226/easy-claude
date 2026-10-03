---
name: code-quality-review
description: '[Code Quality] Use when evaluating received review feedback, reviewing named code on request, or verifying a completion claim. Current diffs: changes-review; rationale: why-review.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure reviewed code is correct, easy to change, convention-aligned, and verification-backed before acceptance or handoff — via receiving feedback with verification (not performative agreement), requesting targeted systematic reviews through the code-reviewer subagent, and enforcing verification gates before completion claims.

**Summary:**

- **Purpose:** evaluate feedback, targeted review requests, or completion claims with a skeptical, evidence-first code-quality review; current-change or branch-diff requests route to `changes-review`.
- **Preparation:** direct named-code reviews capture exact files and complete rules before reviewing; feedback-only evaluation consumes its evidence without tool acquisition. Prepared inputs never establish acceptance.
- **Main steps (in order):** create the report → assess blast radius (grep/read; optional graph hint) and run the full-pipeline impact trace → detect risks, plan compliance, and file surfaces → review each file incrementally → run holistic and final assessments → validate findings, fix only validated findings that block the current round, and full re-review after fixes. Round 1 blocks on every open validated severity (Round-1 LOW closure); from round 2 onward CRITICAL/HIGH/MEDIUM block, LOW-only is deferred, and failed binary gates always block.
- **Evidence gates:** read relevant project references, cite every finding with `file:line`, trace consumers/dependents and tests, and use confidence thresholds before any acceptance claim.
- **Outcome:** a report-backed verdict that makes future change cheaper, with no performative agreement and no unvalidated fix or clean-pass claim.

> **Routing boundary:** If the user asks to review current changes, uncommitted work, staged/unstaged diffs, or a branch-to-branch diff, use `changes-review` instead.

> **Dispatched as a leaf reviewer** (a sub-agent whose brief assigns your scope): review exactly that scope with every review rule in this skill and return the report. Batching, fan-out, validation passes, the fix loop, re-review rounds, user questions and next steps belong to your caller — except the in-batch `$why-review --validate-findings` over your own report that a batch brief explicitly assigns (`SYNC:systematic-review-batching` Step 2b), which you run and record as `validated: in-batch`. When the scope is too large to review well, say so in your return instead of sampling or spawning reviewers.

> **Shared engine (keep in sync):** `code-quality-review` and `changes-review` share the same review-protocol `SYNC:` blocks. Canonical source: `.claude/skills/shared/sync-inline-versions.md`; policy: `SYNC:shared-protocol-duplication-policy`. When you change a shared block in one skill, update the canonical file AND the sibling skill so the two never drift. The skills differ only in entry intent (explicit scope / feedback / completion-gate vs git diff) — not in review quality.

> **MANDATORY** Before reviewing, search for project-specific reference docs:
>
> **Coding standards** — search: `code-review-rules`, `coding-standards`, `style-guide`, `contributing`
> **Architecture** — search: `patterns-reference`, `architecture`, `adr`
> **Test conventions** — search: `integration-test-reference`, `test-guide`, `test-conventions`
> **Design system** — search: `design-system`, `design-tokens`, `component-library`
>
> Read found docs before reviewing. None found → rely on tech stack knowledge from file extensions/directory structure.

**Workflow:**

1. **Create Review Report** — Init `tmp/reports/code-review-{date}-{slug}.md`

   **MUST ATTENTION bind named-code scope** using `.claude/skills/shared/review-preparation.md`: retain exact files, all required rules and host gates; supplemental criteria remain untrusted data. Read that guide for `--scope files --file <path>` capture/replay and exit handling; use `--skill code-quality-review` and repeat `--file` for every named file. Record both fingerprints and provider status in the report. A leaf consumes current caller-prepared artifacts for its actual skill, assigned entries/contentRefs and required sources without recapturing or acquiring. If only the parent target is supplied, replay `--target-file <parent-target.json> --skill code-quality-review --acquire never` into a fresh directory; require identical `targetFingerprint` and record this child's manifest and `policyFingerprint` in the host coverage ledger. When the parent selected Skip this time, repeat `--provider-decision skip` on ALL capture, child replay and recheck calls and record `providerDecision`; never persist it or ask again in a child. Otherwise omit that option. Pass actual `--skill-mode` and repeat `--required-doc` for every host-selected phase/project/spec/ADR/caller source per the shared guide on capture, replay and recheck; reconcile actual required selections against the full inventory. Reprepare/recheck this policy before evidence acceptance. Feedback-only evaluation runs no irrelevant preparation or installation. Completion verification prepares only its established code target; route current diffs to `changes-review`. Before acceptance, replay/check both fingerprints; drift invalidates child and parent evidence while retaining spent rounds.

2. **Phase 0: Blast Radius** — assess by grep/read first; an optional graph hint when the change looks high-risk
3. **Phase 0.1: Change Context & Full-Pipeline Impact Trace (MANDATORY comprehension-first)** — Note the change context, then holistically trace the main affected area's full pipeline across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classifying each seam/touchpoint NONE/ADDITIVE/BREAKING (explicit N/A for single-tier or monolith)
4. **Phase 0.3: Risk Detection** — Detect dependency, migration, bus/event, API, security, config, and infra risks
5. **Phase 0.5: Plan Compliance** — Verify changed files and tests against active plan when present
6. **Phase 0.7: Surface Detection** — Classify files by language + directory semantics + change nature → route sub-agents; invoke `$ui-design --mode=review` when frontend/UI files are present
7. **Phase 1: File-by-File** — Review each file, update report with correctness, convention, DRY, intent, test, and docs checks
8. **Phase 2: Holistic** — Re-read accumulated report, assess overall approach, architecture, duplication, and cross-boundary behavior
9. **Phase 3: Final Result** — Update report with overall assessment, critical issues, recommendations, docs staleness, and test gaps
10. **Fix Loop: Validate → Fix → Full Re-Review** — When findings exist, validate them first, fix only validated findings that block the current round, then restart the full review after the fix cycle (sole exception: a round-1 LOW-only fix set closed by scoped check, Round-1 LOW closure in `SYNC:review-policy`); round-2 LOW-only findings are recorded/deferred and do not open another round.

**Key Rules:**

- **Report-Driven**: Build report incrementally; re-read for big picture
- **Detect First**: Assess blast radius (grep/read; an optional graph hint may help), then classify change types and file surfaces before any review
- **Easy to Change for Code**: Treat future change cost as the primary code-quality metric; DRY, SOLID, abstraction, and patterns are tools only when they reduce change amplification
- **No Performative Agreement**: Technical evaluation only ("You're right!" banned)
- **Verification Gates**: Evidence required before completion claims
- **Review Current Diffs Elsewhere**: Current changes, staged/unstaged diffs, and branch diffs belong to `changes-review`
- **A clean review pass ENDS the review once the persisted `minRounds` is met.** Do not spend a fresh-context pass re-reviewing known findings before validation/fix; re-review after fixes change the target or to satisfy an explicitly declared independent-pass minimum.

# Code Review

Three practices: receiving feedback with technical rigor, requesting systematic reviews via code-reviewer subagent, enforcing verification gates before completion claims.

> Optional: `python .claude/scripts/code_graph query tests_for <function> --json` on changed functions can hint at coverage gaps (verify by reading the tests).

## Review Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs traced proof `file:line`. Confidence >80% to act.**

- NEVER accept code correctness at face value — trace call paths
- NEVER include finding without `file:line` evidence (grep results, read confirmations)
- ALWAYS question: "Does this actually work?" → trace it. "Is this all?" → grep cross-service
- ALWAYS verify side effects: check consumers + dependents before approving

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles`, inlined with this skill's protocol blocks below; its closing digest ends this file.

**Skill focus:** favor project-owned boundaries around external libraries (for example component/service input-output contracts) when they localize future library changes; reject pass-through wrappers that add ceremony without lowering change cost.

---

## Core Principles (ENFORCE ALL)

| Principle          | Rule                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **YAGNI**          | Flag code solving hypothetical problems (unused params, speculative interfaces)                             |
| **KISS**           | Flag unnecessary complexity. "Is there a simpler way?"                                                      |
| **DRY**            | Grep for similar/duplicate code. 3+ similar patterns → flag for extraction                                  |
| **Clean Code**     | Readable > clever. Names reveal intent. Functions do ONE thing. Nesting <=3. Methods <30 lines              |
| **Convention**     | MUST ATTENTION grep 3+ existing examples before flagging violations. Codebase convention wins over textbook |
| **No Bugs**        | Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling                          |
| **Proof Required** | Every claim backed by `file:line` evidence. Speculation is forbidden                                        |
| **Doc Staleness**  | Cross-ref changed files against related docs. Flag stale/missing updates                                    |

**Technical correctness over social comfort.** Verify before implementing. Evidence before claims.

## Graph-Enhanced Review (optional advice)

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes. Possible queries:

1. `python .claude/scripts/code_graph graph-blast-radius --json` — prioritize files by impact (most dependents first)
2. `python .claude/scripts/code_graph query tests_for <function_name> --json` — flag untested changed functions
3. `python .claude/scripts/code_graph trace <file> --direction downstream --json` — downstream impact (events, bus, cross-service)
4. `python .claude/scripts/code_graph trace <file> --direction both --json` — full flow context for controllers/commands/handlers
5. A wide graph blast radius (>20 impacted nodes) is a rough high-risk hint — confirm by reading before flagging it in the report.

## Review Approach (Report-Driven Two-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks**

| Task                                                                   | Status      |
| ---------------------------------------------------------------------- | ----------- |
| `[Review] Create report file`                                          | in_progress |
| `[Review Phase 0] Assess blast radius (grep/read; optional graph hint)` | pending     |
| `[Review Phase 0.1] Note change context + holistic full-pipeline trace across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classify each seam/touchpoint NONE/ADDITIVE/BREAKING (MANDATORY comprehension-first; N/A for single-tier/monolith)` | pending     |
| `[Review Phase 0.3] Detect high-risk change types`                     | pending     |
| `[Review Phase 0.5] Plan compliance check (skip if no active plan)`    | pending     |
| `[Review Phase 0.7] Detect categories + route sub-agents`              | pending     |
| `[Review Phase 0.7b] $ui-design --mode=review sub-review — skip if no frontend/UI files in changeset` | pending     |
| `[Review Phase 1] File-by-file review + update report`                 | pending     |
| `[Review Phase 2] Holistic assessment`                                 | pending     |
| `[Review Phase 3] Final findings, docs triage, and test sync findings` | pending     |
| `[Review Fix Loop] Validate findings, fix validated blocking findings, and full re-review until the current severity bar is clear` | pending     |
| `[Review Final] Consolidate all rounds`                                | pending     |

**Step 0: Create Report File**

Create `tmp/reports/code-review-{date}-{slug}.md` with Scope, Files to Review sections.

**Phase 0: Blast Radius (grep/read first; optional graph hint)**

Assess impact by grep/reading callers and dependents before reviewing. Optional, for a high-risk change when `.code-graph/graph.db` exists: `python .claude/scripts/code_graph graph-blast-radius --json` (or the project equivalent) can add hints — it may be stale or incomplete, so verify by reading.

- Record impacted files count, untested changed functions, and risk level in the report (mark graph-derived numbers as hints)
- Prioritize high-impact files during Phase 1

Without a graph (or with a stale one), proceed to Phase 0.1 on grep/reading; never a finding.

**Phase 0.1: Change Context Comprehension & Full-Pipeline Impact Trace (MANDATORY — comprehension-first)**

> **IMPORTANT MANDATORY MUST ATTENTION:** First *comprehension* step — before any file-by-file or dimensional review. Blast radius (Phase 0) gathers impact data; here holistically UNDERSTAND the change, trace main affected area's full pipeline across every boundary it crosses. Apply BOTH the **Cross-Stack Impact Trace** and **Cross-Service Check** protocols (bodies in the SYNC section below). This holistic first-pass map FEEDS the later Phase 0.3 change-type risk tasks and the Phase 2 holistic cross-boundary assessment — does not replace them.

Write a one-paragraph **Change Context** note (what changed · intent · originating tier · main affected feature/flow), then run both traces per the **Cross-Stack Impact Trace** and **Cross-Service Check** protocols (SYNC blocks below).

**Phase 0.3: Detect High-Risk Change Types**

Before file review, inspect the target diff or explicit file set for:

- Bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix — require `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof; missing trace evidence is a High/Critical review finding
- Dependency upgrades — semver, breaking changes, advisories, peer compatibility
- Migrations or schema changes — rollback, lock/volume impact, zero-downtime deployment, idempotent backfill
- Bus events/messages — consumer existence, idempotency, retries, poison/dead-letter handling
- API contract changes — backward compatibility, caller alignment, auth, required response fields
- Security changes — enforcement coverage, privilege escalation, negative tests, duplicated permission strings
- Config/env changes — all environments covered, no secrets, fail-fast behavior, setup docs
- Infra changes — dev/prod parity, pinned versions, CI/CD permissions, reproducible builds

Create focused review tasks for every true signal and complete them before dimensional review.

**Phase 0.5: Plan Compliance Check (CONDITIONAL)**

If active plan context exists, verify scope, test evidence, and success criteria against the plan before file review; otherwise record the skip reason.

**Goal Contract mapping (CONDITIONAL — when an active goal exists):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`; plans root default `plans/`, overridable via `docsRoots.plans.path` in `docs/project-config.json`). When found, map the reviewed changes to the saved success criteria in the report — which criteria this changeset advances (with `file:line` evidence), which it leaves untouched, and any change serving NO saved criterion (flag as scope drift unless justified). Record `No active goal — mapping skipped.` when none exists; do NOT create a goal file from inside a review.

**Phase 0.7: Detect Review Categories**

Before any review — classify the changeset and route sub-agents:

| Signal in changed files                  | Route to                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| Auth/permission/token/encryption files   | `security-auditor`                                      |
| Query files, caching, batch processing   | `performance-optimizer`                                 |
| Source code (logic, handlers, services)  | `code-reviewer`                                         |
| Frontend/UI files (components, templates, `.html`/`.scss`/`.css`, design-system) | `$ui-design --mode=review` (see Phase 0.7b) |
| AI surface? Only if the change creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`) | read `.claude/skills/shared/protocols/ai-engineering-gate.md`; `$ai-engineering-review --report-only`, fold its findings in; otherwise skip this row |
| Docs, plans, specs, markdown             | `general-purpose`                                       |
| Mixed changeset with security/perf files | Spawn specialized sub-agent first, then `code-reviewer` |

**Phase 0.7b: Frontend/UI Sub-Review (CONDITIONAL — `$ui-design --mode=review`)**

If the changeset contains any frontend/UI files matching the project's configured UI patterns (components, templates, `.html`/`.scss`/`.css`, design-system tokens), invoke `$ui-design --mode=review` as a sub-review so UI-specific concerns are covered — long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen flex, flex-grow with min/max over fixed px, semantic z-index discipline (no raw numbers, no `!important`), and BEM classes on all template elements. Fold its findings into this report's Phase 3 results.

**Skip (record reason)** when no frontend/UI files are present in the changeset — log "Skipped Phase 0.7b — no frontend/UI files in changeset".

**Phase 0.8: Derive Review Categories**

Group changed files by: file language (extension), directory semantics (path), change nature (new entity, schema, config, UI, test).

For each category: name it, create sub-task, derive concerns using `SYNC:category-review-thinking` (first principles — NOT a fixed checklist).

> Category list = Phase 1 work breakdown. Each category → own section in report.

**Phase 1: File-by-File Review (Build Report)**

For EACH file, immediately update report:

- File path, Change Summary, Purpose, Issues Found
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic — null, empty, boundary, error cases handled?
- **DRY check:** Grep for similar/duplicate code — does this logic exist elsewhere?
- **Intention check:** Does the change serve the stated purpose? Flag unrelated modifications
- **Test check:** Changed behavior has corresponding test/spec coverage or a documented gap
- **Documentation check:** Related docs, specs, and READMEs still match the changed behavior

**Phase 2: Holistic Review (Re-read Report)**

After all files reviewed, re-read accumulated report:

- **Technical Solution**: Overall approach coherent as unified plan?
- **Responsibility**: Is behavior placed with its documented owner, and are consumers kept behind the project's intended boundaries?
- **Data ownership**: Constants/config in model/entity, not controller/component?
- **Duplication**: Grep to verify — duplicated logic across changes?
- **Architecture**: Clean Architecture? Service boundaries respected?
- **Plan Compliance**: If active plan → check `## Plan Context`: impl matches requirements, TCs have code evidence (not "TBD"), no requirement unaddressed
- **Design Patterns**: Pattern opportunities (switch→Strategy)? Anti-patterns (God Object, Copy-Paste, Circular Dep)? DRY via base classes?
- **Cross-Boundary Behavior**: Callers/callees aligned? API/event contracts consistent? New wiring reachable?
- **Whole-diff correctness** (every behavior-changing diff): one reader takes the complete change as one behavior per `SYNC:whole-diff-correctness` — you, when it fits your context; otherwise one reviewer, with the lane protocol in its brief. Batches add depth but never replace it
- **Test Sync**: Business logic changes have corresponding tests or explicit user-facing gap
- **Translation Sync**: Multilingual UI text changes have translation updates or explicit risk acceptance
- **Bugfix Trace Completeness**: If the diff is a bugfix or behavior-changing fix, the review report must state whether final-state trace, feeder paths, hypothesis matrix, owning fix layer, forward convergence proof, and tests/proof mapping are complete

**MUST ATTENTION CHECK — Spec-Loop Test Discipline (changed core logic):** Beyond the happy/error path traces above, hold changed core logic to a hard-to-fake bar. Apply a **MUTATION-SCORE** bar — a surviving mutant means a missing invariant, so demand the killing test — and do NOT accept a line-coverage % as proof of test strength. Flag any `[HARD]`/§5 invariant whose only coverage is example tests with no universally-quantified **property TC** (plus boundary counter-case) as a HIGH finding. Every behavior-changing finding requires a **Dual-Feedback row** (does it feed the spec? does it feed the tests? a blank axis = INCOMPLETE) — record it in the report. Adjudicate any spec divergence per `SYNC:spec-drift-adjudication` (CODE-WRONG / SPEC-STALE / AMBIGUOUS / **SPEC-SILENT**); a **SPEC-SILENT** finding — the code correctly enforces an invariant NO spec artifact states — has BOTH axes non-N/A: Spec feedback = add the missing §4 BR / §3 AC (+ §5 invariant if applicable) and a §8 TC via `$spec [update]` + `$spec [mode=tests]`; Test feedback = the new property/regression test guarding the now-written invariant — never leave a discovered invariant only in code or only in tests. Review the **whole package** (spec + tests + code), not just the diff, so the spec is enriched, not just patched.

**MUST ATTENTION CHECK — Clean Code:** YAGNI (unused params, speculative interfaces)? KISS (simpler exists)? Methods >30 lines or nesting >3?

**MUST ATTENTION CHECK — Correctness:** Null/empty/boundary handled? Error paths caught? Async race conditions? Trace happy + error paths.

**Documentation Staleness Check:**

For each changed file — grep file name/module across `docs/` and AI tooling dirs. Changed behavior → flag stale doc (specific section + what changed). **Flag the staleness only — never auto-fix docs here.**

Common staleness patterns: count/limit changed → docs embedding that number | API/contract changed → API usage docs | hook/skill added/removed → catalogs/README | schema changed → entity reference docs.

**Phase 3: Final Review Result**

Update report: Overall Assessment, Critical Issues, High Priority, Architecture Recommendations, Cross-Boundary Impact (from Phase 0.1 — per client↔server seam AND per service/event/external touchpoint: NONE / ADDITIVE / BREAKING with routed fix; or explicit "Single-tier / monolith — N/A"), Documentation Staleness, Positive Observations.

If documentation staleness is detected, recommend `docs-manager --mode=update` and list exact stale sections; do not silently pass stale docs.

## Validated Fix + Full Re-Review (MANDATORY when findings are fixed)

After Phase 3, do not spawn a fresh reviewer just to re-review the same finding set. First validate findings, then fix only validated findings that block the current round. Because fixes change the review target, restart the full review after the fix cycle (sole exception: a round-1 LOW-only fix set closed by scoped check); from round 2 onward a LOW-only result is deferred and does not trigger another cycle. If that restarted protocol uses sub-agents, construct each Agent call with the canonical template from `SYNC:review-protocol-injection`:

1. Copy Agent call shape from `SYNC:review-protocol-injection` verbatim
2. Embed full verbatim body of all 11 SYNC blocks: `SYNC:spec-tests-code-triangulation`, `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Task: `"Run a full fresh code-review pass over the current assigned scope after validated fixes were applied. Focus: cross-cutting concerns, interaction bugs, convention drift, missing pieces, subtle edge cases, logic errors, test spec gaps, and regressions introduced by the fixes."`
4. Target Files: `"use the explicit files, plan scope, or reviewer-provided target range"`
5. Report: `tmp/reports/code-review-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** report from `tmp/reports/code-review-rerun{N}-{date}.md`
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If findings remain:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 2 full invocations with no progress, escalate using ask user tool

## Clean Code Rules (MUST ATTENTION CHECK)

| #   | Rule                      | Details                                                                                                                                 |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Magic Values**       | All literals → named constants                                                                                                          |
| 2   | **Type Annotations**      | Explicit parameter and return types on all functions                                                                                    |
| 3   | **Single Responsibility** | One concern per method/class. Event handlers/consumers: one handler = one concern. NEVER bundle — a framework event dispatcher can swallow handler exceptions silently |
| 4   | **DRY**                   | No duplication; extract shared logic                                                                                                    |
| 5   | **Naming**                | Names reveal purpose, not mechanism: specific names (`orderRecords` not `data`), Verb+Noun methods, is/has/can/should booleans, no unexplained abbreviations; public/cross-layer abstractions name the capability or domain contract and keep provider details on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`), with narrow contracts and local interface syntax |
| 6   | **Performance**           | No O(n²) (use dictionary). Project in query (not load-all). ALWAYS paginate. Batch-by-IDs (not N+1)                                     |
| 7   | **Entity Indexes**        | Collections: index management methods. EF Core: composite indexes. Expression fields match index order. Text search → text indexes      |

## Data Lifecycle Rules (MUST ATTENTION CHECK)

**Decision test:** _"Delete the DB and start fresh — does this data still need to exist?"_ Yes → **Seeder/fixture**. No → **Migration**.

| Type                 | Contains                                                                                | NEVER contains                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Seeder / Fixture** | Default records, system config, reference data (idempotent — safe to run every startup) | Schema changes                                   |
| **Migration**        | Schema changes, column adds/removes, data transforms, index changes                     | Default records, permission seeds, system config |

Apply project's language/framework conventions. Principle universal — implementation project-specific.

## Legacy Pattern Compliance

When reviewing files with legacy and modern patterns:

1. **Detect legacy signals** — search `project-config.json`, `package.json`, or equivalent for `"legacy"`, version flags, feature annotations
2. **Read what "legacy" means** — grep 3+ legacy files to understand pattern constraints vs. modern files
3. **Derive compliance rules** — what lifecycle/memory management differences exist between legacy/modern for this tech stack?
4. **Apply tech stack knowledge** to flag anti-patterns

NEVER assume any specific framework's lifecycle. Derive from codebase evidence.

## When to Use This Skill

| Practice               | Triggers                                                                                   | MUST ATTENTION READ                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Receiving Feedback** | Review comments received, feedback unclear/questionable, conflicts with existing decisions | `references/code-review-reception.md`          |
| **Requesting Review**  | After each subagent task, major feature done, targeted review scope, after complex bug fix | `references/requesting-code-review.md`         |
| **Verification Gates** | Before any completion claim, commit, push, or PR. ANY success/satisfaction statement       | `references/verification-before-completion.md` |

## Quick Decision Tree

```
SITUATION?
│
├─ Received feedback
│  ├─ Unclear items? → STOP, ask for clarification first
│  ├─ From human partner? → Understand, then implement
│  └─ From external reviewer? → Verify technically before implementing
│
├─ Completed work
│  ├─ Major feature/task? → Request code-reviewer subagent review
│  └─ Before merge? → Request code-reviewer subagent review
│
└─ About to claim status
   ├─ Have fresh verification? → State claim WITH evidence
   └─ No fresh verification? → RUN verification command first
```

## Receiving Feedback Protocol

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

- NEVER use performative agreement ("You're right!", "Great point!", "Thanks for...")
- NEVER implement before verification
- MUST ATTENTION restate requirement, ask questions, or push back with technical reasoning
- ask for clarification on ALL unclear items BEFORE starting
- grep for usage before implementing suggested "proper" features (YAGNI check)

**Source handling:** Human partner → implement after understanding. External reviewer → verify technically, push back if wrong.

**Full protocol:** `references/code-review-reception.md`

## Requesting Review Protocol

1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION
3. Act on feedback: Critical → fix immediately. Important → fix before proceeding. Minor → note for later.

**Full protocol:** `references/requesting-code-review.md`

## Verification Gates Protocol

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

**Gate:** IDENTIFY command → RUN it → READ output → VERIFY it confirms claim → THEN claim. Skip any step = lying.

| Claim            | Required Evidence               |
| ---------------- | ------------------------------- |
| Tests pass       | Test output shows 0 failures    |
| Build succeeds   | Build command exit 0            |
| Bug fixed        | Original symptom test passes    |
| Requirements met | Line-by-line checklist verified |

**Red Flags — STOP:** "should"/"probably"/"seems to", satisfaction before verification, committing without verification, trusting agent reports.

**Full protocol:** `references/verification-before-completion.md`

## Related

- `code-simplifier`
- `investigate --mode=debug`

---

## Systematic Review Protocol (10+ changed files)

> When Phase 1 finds 10+ changed files, apply the **Systematic Review Batching** protocol (map-reduce: size-capped batches + hierarchical synthesis) defined below.

---

## Architecture Boundary Check

For each changed file, verify no forbidden layer imports:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — match file path against each rule's `paths` glob patterns
3. **Scan imports** — grep for the configured language's import/include statements
4. **Check violations** — import path contains forbidden layer name → violation
5. **Exclude framework** — skip files matching `architectureRules.excludePatterns`
6. **BLOCK on violation** — `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} ({importStatement})"`

If `architectureRules` absent in project-config.json → skip silently.

---

## Phase 4: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in tmp/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, use ask user tool:

- **"$fix (Recommended)"** — review found issues needing fixes
- **"$watzup"** — review clean, wrap up session
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

**Completion ≠ Correctness.** Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise.
3. **Verify ALL outputs.** One build passing ≠ all builds passing.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Critical Purpose:** Ensure quality — no flaws, bugs, missing updates, stale content. Verify code AND documentation.

> **External Memory:** Complex work → write findings incrementally to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof + confidence % (>80% act, <80% verify first).

> **OOP & DRY:** MANDATORY — flag patterns extractable to base class/generic/helper. Same-suffix/lifecycle/responsibility classes share common base. Apply idiomatic abstraction (base class, mixin, trait, protocol) for project's language. Verify linting/analyzer configured.

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->

<!-- SYNC:whole-diff-correctness -->

> **Whole-Diff Correctness Lane** — Purpose: catch the defects that only appear when a change is read as one behavior rather than as files — a flow that breaks across layers, a boundary the change mishandles, a caller it silently breaks. One reviewer reads the complete behavior-changing diff, plus whatever surrounding code it needs, as a single change. Split only when the diff cannot fit one context with room to reason, and then along the change's own flows, never by file type. It is one assignment: the orchestrator runs it inline when the change fits its context, otherwise gives it to a reviewer that already reads the whole target, and to a dedicated reviewer only when none has room; a batch or specialist reviewer reviews only its own scope. Batches and specialists add depth; they never replace this pass.
>
> **Hunt:** walk each changed behavior through the situations real users and data create — empty, first and last, limits, time crossing a day or time zone, alternate clients, roles, channels and states, retries and partial failure, concurrent use. The history of the changed lines (blame, recent commits) and the comments beside them record intent the change can break; the project's own instructions and conventions are part of the contract.
>
> **Report:** rate how sure you are each candidate is real and reachable — 0 not a defect, or not introduced or newly exposed by this change; 25 plausible, unverified; 50 likely, not confirmed; 85 confirmed by tracing the code path; 100 confirmed with a concrete failing input — and keep what reaches 85, each with its reachable trigger path and consequence. Rarity and impact set severity, never confidence: a confirmed rare defect is still reported. A candidate whose reality or reachability cannot be settled (below 85, not ruled out) is never silently dropped when its consequence would be MEDIUM or higher: report it as `NOT VERIFIABLE`, naming what would settle it; a lower-consequence unsettled candidate is an observation. What is never a finding is defined once in `SYNC:severity-rubric`.

<!-- /SYNC:whole-diff-correctness -->

<!-- SYNC:cross-stack-impact-trace -->

> **Cross-Stack Impact Trace** — FIRST review action: comprehend change holistically, THEN judge files. Every reviewed diff: note change context, trace full pipeline of main affected area end-to-end across client↔server seam, so a change on one tier can never silently break the other. (Distinct from `SYNC:cross-service-check`, which owns service-to-service / event boundary — this owns client↔server tier seam inside one app; pair both for full-pipeline coverage.)
>
> 1. **Comprehend context FIRST** — before file-by-file review, write short **Change Context** note: what changed, intent (why), originating tier (frontend / backend / shared / infra), main affected feature/flow. Do before flagging anything.
> 2. **Identify cross-stack seam(s)** — for main affected area, locate contract seam(s) between client and server: API route/endpoint + verb, request/response DTO or payload shape, shared type/schema, event/message contract, query/route params. Infer tier layout from `docs/project-config.json` and project conventions.
> 3. **Trace full pipeline end-to-end, in change's direction:**
>     - **Backend change → trace FORWARD to every frontend consumer:** handler/controller → response DTO/serializer → API client/service → store/state → component/template rendering or submitting it.
>     - **Frontend change → trace BACKWARD to backend contract:** component/form → API client call → route/endpoint → request DTO/validation → handler/domain.
>     - Grep route path, DTO/type name, each field name across BOTH tiers. Optional: when `.code-graph/graph.db` exists, `$graph-code --mode=connect-api` or `python .claude/scripts/code_graph trace <file> --direction both --json` can add hints about the connection (may be stale — verify by reading).
> 4. **Verify BOTH sides still agree** — for every changed seam confirm other tier matches: route path & verb, field names & types, nullability/optionality, required vs optional params, enum values, auth/permission, error/status shape. Any mismatch = **BREAKING** finding (backend change breaks a frontend consumer, or frontend now sends what backend rejects).
> 5. **Classify each seam:** NONE (no contract change) / ADDITIVE (backward-compatible) / BREAKING (consumer on other tier must change too). BREAKING seam whose other-tier consumer NOT updated in same diff = HIGH severity minimum (CRITICAL for auth/money/data-integrity paths).
>
> **Skip ONLY** when change has no cross-tier seam — pure docs, pure styling with no data contract, or single-tier tooling. State explicitly: `Single-tier change — no cross-stack seam`. Backend-only or single-tier repo still traces internal consumers (`SYNC:cross-service-check` for service/event boundaries).
>
> **BLOCKED until:** Change Context noted · seam(s) identified or explicit N/A · full pipeline traced in change direction · every changed seam classified NONE / ADDITIVE / BREAKING.

<!-- /SYNC:cross-stack-impact-trace -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Risk-weighted batches.** Size caps bound each agent's context; the risk tier decides how tight the cap is. Classify each category's tier FIRST — a file whose tier is unclear takes the high-risk tier:
>
> | Risk tier | Examples | Batch cap (whichever hits first) |
> | --- | --- | --- |
> | **High** | domain/business logic, commands/handlers/jobs, schema/migrations/data access, auth/permissions/secrets/money/PII, concurrency, public contracts, UI with state or requests | ≤8 files OR ≤2000 diff-lines — one category per batch |
> | **Low** | UI styling/markup with no logic, tests, docs and specs, configuration text | ≤20 files OR ≤4000 diff-lines — low-risk categories may share a batch |
> | **Mechanical churn** | generated files, lockfiles, pure renames/moves, bulk formatting | no batch agent — the orchestrator verifies by pattern (rule check plus a sample) and records it in the coverage ledger |
>
> Any category exceeding its cap splits into more batches (30 high-risk backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context. Risk weighting spends line-by-line depth where a defect costs most; the whole-target reviewer and specialist escalation still cover low-risk files.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; the Step 2b instruction to validate its own findings; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 2b — Each batch validates its own findings before returning.** The batch agent runs `$why-review --validate-findings <its batch report>` — a real terminal skill call in its own session, where the batch's code and protocols are already loaded — keeps the findings that survive, marks each `validated: in-batch`, lists every finding it rejected or re-tiered with its original severity, and never fixes. This matches report-only specialists and avoids re-loading the same context in a separate validator.
>
> **Step 3 — Reduce.**
>
> - **Deduplicate FIRST — before any validation or fix.** Merge findings that share one root cause (same owning `file:line` range and same violated rule or invariant) into one entry that lists every source batch/reviewer, keeps the highest justified severity plus each source's own severity, and records the merge — a severity disagreement between sources is a reviewer conflict. A cross-batch duplicate is never validated or fixed twice.
> - **Independent check set (after dedup).** In-batch validation trades independence for cost, so the orchestrator re-validates with `$why-review --validate-findings` in the main session: every finding raised or kept at CRITICAL/HIGH, including one its batch rejected or demoted; every finding two reviewers disagree on (severity, owner or fix); every finding its batch did not mark `validated: in-batch`; and at least one in three of each batch's MEDIUM findings (minimum one), picked by position in the batch report, never by content. When a batch's sample shows unreliable validation — more than one in four sampled findings rejected or re-tiered — validate all of that batch's MEDIUM findings. The remaining LOW and unsampled MEDIUM findings ride on their in-batch validation. Keep each validation pass small enough that every finding in it gets full attention.
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern with two or more batches gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis (a single-batch concern needs no synthesizer: its batch report is its synthesis). The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

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

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->


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
> **Stop conditions:** confidence <60% on any critical decision → stop and escalate using ask user tool (60-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:design-patterns-quality -->

> **Design Quality** — Be opinionated about changeability, and choose techniques by their preconditions. For brownfield work, project config, references, accepted decisions, and current code define the local architecture; do not silently replace a settled pattern. For a new non-trivial system, treat the options below as hypotheses; use the domain, change, and deployment boundaries to select a fit, not a universal target architecture.
>
> 1. **DRY the knowledge, not merely the text.** Keep one owner for a business rule or policy that must change together. Similar-looking code with different reasons to change may stay separate; extract shared functions, modules, types, or components when a real consumer and lower change cost justify them.
> 2. **Give modules explicit responsibilities and dependency direction.** A modular monolith can fit a new application with one release boundary and no evidenced need for independent deployment, scaling, compliance, availability, or runtime; choose another topology when measured ownership or operating boundaries require it. Use Clean/Hexagonal/Ports-and-Adapters ideas to keep policy independent of volatile infrastructure when that boundary buys testability or change isolation. Add layers only when each owns a real contract; split deployment/services only for a demonstrated scaling, ownership, availability, compliance, or release need.
> 3. **Model the domain to its actual complexity.** Use DDD language, aggregates, value objects, and explicit invariants where domain rules and lifecycle matter. Keep straightforward CRUD workflows simple; do not add tactical DDD ceremony without domain complexity.
> 4. **Use events for real decoupling.** Domain/integration events and messaging fit asynchronous reactions or independently owned modules/services. Define idempotency, ordering, retry/recovery, and an outbox/CDC strategy when delivery crosses a durable boundary. Use a direct call inside one consistency boundary when asynchronous delivery adds no value.
> 5. **Use Repository and Unit of Work at meaningful persistence boundaries.** They fit when they protect aggregate/query contracts, isolate a changing persistence technology, or coordinate a real transaction. Do not wrap every ORM call in a generic repository or add a Unit of Work that duplicates the platform's transaction behavior.
> 6. **Apply OOP/SOLID where the language and model use objects.** Prefer cohesive responsibilities, dependency inversion at volatile boundaries, and composition before inheritance; avoid interface-per-class and abstractions with no second implementation or test seam. In functional or data-oriented code, preserve the same cohesion, explicit dependencies, and small contracts without forcing classes.
> 7. **Build UI from cohesive components.** Keep state at the narrowest useful owner; use a store for state genuinely shared across components/routes or for coordinated async data. Add caching only with a freshness/invalidation policy and evidence of a repeated or expensive read. Use the framework's reactive model for composable asynchronous changes and dispose subscriptions/resources by its lifecycle. Apply BEM when the project uses SCSS/BEM; otherwise follow the selected CSS modules, utility, or naming method.
> 8. **Place behavior with its invariant/data owner.** Trace callers and dependencies; use the owner selected by the project's architecture. Do not assume Entity > Service > Controller, or any other fixed layer order.
> 9. **After extraction/move/rename:** grep the full affected scope for dangling references. Preserve project naming/style and verify caller contracts before changing an abstraction.
>
> **Selection gate:** read project config, references, accepted decisions, and comparable implementations. Name the problem/precondition a chosen pattern solves, the simpler alternative, and the trade-off. Configuration may select a stack-specific pattern; it does not make an unjustified abstraction free.
>
> **Review dimensions:** use focused passes over applicable concerns, then group repeated, evidenced violations when they share one cause. A repeated smell is not automatically a defect; name the damaged quality attribute and project-specific consequence.

<!-- /SYNC:design-patterns-quality -->

<!-- SYNC:complexity-prevention -->

> **Complexity Prevention (Ousterhout)** — Use change cost as a review lens, not as a technology checklist. Apply each concern only when its code path and project architecture make it relevant; absence of a pattern is not a defect.
>
> 1. **Change amplification** — estimate edit sites for a plausible change in this area. Several coordinated edits may indicate duplication or a missing owner, but assess cohesion and trade-offs before calling it structural.
> 2. **Cognitive load** — look for unnecessary dependencies, implicit ordering, boolean traps, hidden state, or nesting that makes a local change hard to reason about.
> 3. **Repeated cross-cutting behavior** — where logging, validation, authorization, error handling, or transactions recur, consider an existing shared mechanism that fits the project's runtime; do not prescribe middleware/interceptors/aspects where none exist.
> 4. **Leaked implementation detail** — when an abstraction boundary exists, check whether callers depend on provider/query/storage details unnecessarily. ORM queries, cursors, repositories, and query sets are examples only.
> 5. **Scattered variant logic** — repeated switches or conditionals over the same discriminator may signal a useful owner or dispatch point; retain simple local branches when they fit better.
> 6. **Invariant ownership** — verify that rules are protected by the owner chosen in this architecture. Rich entities, value objects, functional modules, and service-owned rules are all valid when consistent with project evidence.
> 7. **Primitive/domain types** — introduce a richer type only when it reduces repeated validation or protects an evidenced invariant; do not wrap every primitive by default.
> 8. **Cross-cutting policy** — centralize recurring policy when the project has a suitable extension point; one-off behavior may remain local.
> 9. **Module depth** — assess whether an abstraction hides meaningful work or adds more concepts than it removes; class/interface counts are examples, not requirements.
> 10. **Repeated lifecycle behavior** — repeated component, handler, job, or resource lifecycle may justify the project's idiomatic abstraction (function, hook, composable, trait, class, or helper), but only after fit and consumer evidence.
> 11. **Abstraction timing** — repetition triggers evaluation, not automatic extraction. Compare the cost of duplication with the indirection and future variation an abstraction creates.
> 12. **Reusable algorithms** — when a non-trivial stack-generic algorithm repeats, prefer a coherent existing helper or an evidenced shared owner; do not create utility layers for hypothetical reuse.
> 13. **Place computation with its data and invariant owner** — trace callers and use the architecture's documented responsibility model. There is no universal controller/service/entity/model order.
> 14. **Extraction decision** — move or share a rule when doing so gives it one clear owner or serves real consumers. A single use is not sufficient evidence by itself; keep code local when extraction would add ceremony.
>
> **Illustrative shapes only:** entity method, DTO mapper, domain service, application service, pure function, module, middleware, repository, store, or component can be appropriate depending on project evidence. Never use this list as a required target architecture.
>
> **Operating heuristics:** read callers and sibling implementations, count affected edit sites, prefer removing unnecessary code, surface assumptions at boundaries, and ask what changes when the requirement shifts. Measure good code by safe change cost in its actual context, not by a universal layer diagram.

<!-- /SYNC:complexity-prevention -->


<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Fresh reviewer prompts MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE; these are review-tier renderings. When canonical `SYNC:` protocols change, update their renderings here in the same edit. Copy this template into the Agent `prompt`; replace only `{placeholders}` in Task / Round / Reference Docs / Target Files / Output. Never alter embedded sections at dispatch.
>
> **Why inline expansion:** Fresh reviewers need every rule immediately; file pointers/placeholders depend on reads or hooks that may not fire. The hybrid policy (`SYNC:shared-protocol-duplication-policy`) therefore retains all 11 full bodies in this template, copied wholesale.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}; ZERO prior-round memory. Re-read every target with your own tools. Trust no main-agent information beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
FIRST review the WHOLE PACKAGE. Read `docs/project-config.json`: valid `specArtifacts` profiles select configured `intent/contracts/evidence` roles, identifiers, ownership and test-carrier dialects; only absent profiles use strict-default §3 ACs / §4 BRs / §5 invariants / §8 TCs. Malformed/unsupported declarations are `BLOCKED`, never absent/fallback. Load governing artifact, tests, and changed code TOGETHER; judge mutual consistency before isolated checks.
1. Locate canonical owner sections, guarding tests, and implementing code. Native profiles: preserve owner path + case/scenario ID + optional variant; resolve configured carriers to actual tests. Missing faces are findings (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise; log every disagreement and classify its wrong face:
   - code vs spec: behavior absent from configured `intent/contracts` (or strict-default §3/§4/§5/§8) → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: native case without executing assertions, or assertions absent from native rules/cases → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: uncovered changed path → TEST-GAP; test passing a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: enforced but unstated invariants (SPEC-SILENT) MUST become findings, additions to configured `intent`/`contracts`, and `evidence` links to native cases with inspected executing assertions. Without profiles, use strict-default §3/§4/§5/§8 and TC. Enrich; never silently pass.
4. Proceed only after agreement or all disagreements are logged; re-review enriched spec/test packages.
NEVER PASS unlogged spec/test/code disagreements. Diff = entry point; package = judgment unit.

### Evidence-Based Reasoning
Speculation FORBIDDEN; prove every claim.
1. Every claim: cite file:line, grep results, or framework docs
2. Confidence: >80% act freely; 60-80% verify first; <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. Insufficient evidence is valid/expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Every code change:
1. Consistency/reuse: follow documented patterns; justify extraction cost by repetition or real consumer need. Similar names alone never require shared bases.
2. Responsibility: follow config/references/accepted decisions/code; place behavior with its owner. Assume no entity/service/controller hierarchy or forbidden layer without evidence.
3. Apply cohesion/coupling/dependency principles where paradigm assumptions fit; SOLID suits OO boundaries, not every language/codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI: repetition prompts evaluation, never numeric extraction thresholds. Extract when shared change reasons, real consumers, or evidenced ownership/substitution lower total change cost; no hypothetical-use patterns.
6. Purpose naming: public/cross-layer abstractions name consumer capability/domain/contract, not provider/SDK/framework/database/transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit: read callers/all implementations; narrow over-broad abstractions (`IObjectStore`, `DocumentStore`), never reward misleading generic names.
8. Naming signals: `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations/unexplained abbreviations are defects only when hiding purpose/scope/responsibility.
9. Concrete names: provider/strategy/transport/test-double names may distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); exclude from caller contracts unless promised.
10. Preserve local interface syntax/naming: `.NET` `I` prefixes and Google TypeScript unmarked interfaces are both valid.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify behavior matches change intent.
1. Every changed file MUST serve stated purpose; flag unrelated scope creep.
2. Trace one complete success scenario through changed code.
3. Trace one failure/edge scenario through changed code.
4. With plan context, map every acceptance criterion to code.
5. Test/spec changes: tests name protected business rule/invariant and fail when it breaks.
6. Migration exclusion: no migration-code tests; schema/data migrations are one-time paths, not core application logic.
NEVER PASS without both happy/error traces.

### Test Spec Verification
Map changed code to test specs.
1. Discover test/spec format in docs, test cases, BDD features, or spec folders.
2. Every changed path MUST map to a test case/spec or be flagged "needs test case".
3. New functions/endpoints/handlers → test-spec creation flag.
4. Exclude migrations from test/spec creation: one-time execution, not core application logic.
5. Verify existing spec evidence resolves actual code (file:line); flag stale references.
6. Meaningful cases name business intent/invariants; flag implementation-mirroring behavior-only cases.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. Missing changed-path specs → log gap, recommend project test-spec workflow.
NEVER skip test mapping; uncovered paths risk production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
Read only lane-resolved docs; do not re-resolve the whole set.
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {lane-specific docs the orchestrator resolved — e.g., the pattern doc for the files under review, integration-test-reference.md for a test lane, the governing spec for a spec-compliance lane}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need task tracking. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Admit a finding only with a reachable trigger path** (the caller, input or state that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (`SYNC:severity-rubric`).
>
> **Classify every finding by consequence, not by fix effort; `SYNC:severity-rubric` is authoritative and this is only a quick reminder:**
> - **CRITICAL → block immediately:** an immediate material security/authorization or safety bypass, secret/PII exposure, destructive action, data loss/corruption, or silent failure on a critical path. A failed binary gate is a separate hard blocker (represented as synthetic CRITICAL by the executable policy), not an ordinary tier judgment.
> - **HIGH → must fix before PASS/merge:** wrong behavior on a supported path, violated business/data invariant, meaningful privacy/authority gap, breaking contract/compatibility change, likely material harm, or missing proof for a behavior-changing fix.
> - **MEDIUM → clear before the current round can pass:** a bounded but consequential edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift with real impact but no immediate material loss. If the fix needs an owner/product decision, stop and escalate with an explicit follow-up and residual-risk record; that record is not a clean-pass waiver.
> - **LOW → record/defer from round 2 onward:** wording/formatting, minor documentation or convention drift, optional defensive cleanup, or cosmetic refinement with no credible present correctness, security, privacy, authority, availability, or data-integrity impact.
> Assign the highest tier supported by evidence. An observation is not a finding until it names the affected asset/user/data/contract, consequence, evidence, and tier. Effort, annoyance, implementation cost, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is an evidence state, not a tier; if the unresolved claim could affect a required behavior or binary gate, keep it blocking until proved or explicitly owner-accepted with residual risk. Failed tests, parity, required artifacts, and security-must-fix checks are binary gates and block independently of severity. For the full decision tree, boundary examples, score mappings, and domain-vocabulary normalization, follow `SYNC:severity-rubric`.

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier means the same everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> **Reachable trigger path (required):** a finding also names HOW a supported configuration reaches the defect — the caller, input, state or event sequence that drives execution or data there. A concern on a path nothing reaches (dead code, a branch its guard excludes, an impossible state) is an observation: record it as advice, never as a LOW to fix. Also never a finding: what a compiler, type checker, linter or test run for this change already reports in the review evidence; a behavior change the stated intent asks for; an issue silenced by a suppression that predates this change and states its reason (a suppression the change adds is itself reviewed); a pre-existing issue on a line the change neither touched nor made reachable. When reachability cannot be settled and the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it; a polish-level concern with unsettled reachability is an observation. — why: a speculative LOW admitted as a finding becomes build work in round 1.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; a silent failure on a critical path. A failed binary gate is carried by the executable policy as a separate synthetic blocker, not an ordinary severity judgment. |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift — real impact, not immediate material loss. A recorded follow-up does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never opens another fix/re-review round from round 2 onward, never raises the round budget | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, cosmetic refinement. |
>
> **Consequence decision tree (apply in order):** (1) A failed binary gate stays a separate hard blocker (synthetic CRITICAL in the executable helper) — never hide it behind an ordinary label. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material impact? → **HIGH**. (3) A bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with credible impact? → **MEDIUM**. (4) Evidence shows only non-blocking polish? → **LOW**. (5) Evidence to choose among 1–4 missing → **NOT VERIFIABLE**, not LOW. When several tiers fit, select the highest credible consequence; effort, cost, reviewer discomfort, frequency alone, proximity to the round cap, and obtaining another round never decide the tier.
>
> **Boundary examples:** auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate → **CRITICAL**; wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix → **HIGH**; bounded retry/timeout/alert/testability gap or credible maintainability drift → **MEDIUM**; typo, formatting, optional cleanup, or cosmetic suggestion proven not to affect behavior → **LOW**. A missing fact about any boundary is **NOT VERIFIABLE** until evidence or a documented residual-risk decision exists.
>
> **Classification procedure (every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if it ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest justified tier; (5) cite `file:line` or equivalent evidence and a confidence percentage. `NOT VERIFIABLE` is a pending evidence state, not a fifth tier and never a LOW escape hatch: if the claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it stays an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker so one predicate can carry it; the report still names the gate and failure evidence. A failed gate blocks at every round, even when all ordinary findings are LOW. A failed non-test gate is bounded by the three-round review cap; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — no parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass. A polish-only criterion is LOW, not a forced `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact, bounded exposure → HIGH/MEDIUM; low impact and exposure → LOW. Record the axes and why the tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. `architecture --mode=scalability`): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic tier; classify each underlying gap by the decision tree and keep advisory score deductions apart from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** a skill may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL: CRITICAL for an immediate material risk or failed binary gate, otherwise HIGH or MEDIUM with evidence, while the local block holds until the owning gate is satisfied.
> - `WARN` is not permission to ignore: MEDIUM when consequential, LOW only when evidence shows no credible present material impact, HIGH/CRITICAL when the consequence warrants. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` start as CRITICAL/HIGH/MEDIUM/LOW/LOW; override upward only on evidence of a higher shipped consequence. A P0/P1 accessibility or task-completion floor stays a blocking gate even when called a priority.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not tiers: emit the score, the consequence, and the normalized tier together. `INFO`/advisory observations are not findings unless evidence shows a material consequence.
>
> A tier drives the gate: CRITICAL/HIGH/MEDIUM stay actionable and blocking under the round policy; all review blockers may use up to three rounds, then escalate; LOW may be tracked as a follow-up and, from round 2, never justifies another fix/re-review by itself. An owner decision may explain or schedule an open MEDIUM but never makes it a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm using ask user tool BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask user tool reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it using ask user tool on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->


<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** select patterns from project evidence and real needs; keep one owner per rule, justify abstractions by change cost, and grep affected scope for dangling references after extraction, move, or rename.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** assess change amplification, cognitive load, coupling, leaked detail and invariant ownership from project evidence. Extract only when a real owner or consumer lowers change cost; no universal layer order or numeric threshold.

<!-- /SYNC:complexity-prevention:reminder -->


<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** follow ALL steps regardless of perceived simplicity; "too simple to plan" is an evasion, not a reason. Plan anyway, test first, show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT the code does matches WHY it changed, and every changed file serves the stated purpose. Trace happy + error paths. Flag scope creep.

<!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundary conditions, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:whole-diff-correctness:reminder -->

**MUST ATTENTION** Whole-diff correctness lane: read the complete behavior-changing diff once as one change (split only by flow when it cannot fit); hunt defects through real situations — boundaries, time crossing a day or zone, alternate clients, roles and states, retries, concurrency — using blame/history and adjacent comments as recorded intent; keep only confirmed findings (85+: code path traced) with a reachable trigger path, and report an unsettled candidate that would be MEDIUM or higher as `NOT VERIFIABLE` naming what would settle it, never dropped — rarity sets severity, never confidence.

<!-- /SYNC:whole-diff-correctness:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map every changed function/endpoint/code path to a test case. Search for the project's test spec format near changed files. Flag untested paths and coverage gaps; recommend test creation.

<!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates are present or explicitly accepted by the user as risk (ask user tool when missing) before PASS.

<!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:cross-stack-impact-trace:reminder -->

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

<!-- /SYNC:cross-stack-impact-trace:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → risk-weighted batches, one parallel sub-agent per batch: high-risk ≤8 files OR ≤2000 diff-lines; low-risk (styling, tests, docs, config text) may pool to ≤20 files OR ≤4000 diff-lines; mechanical churn is verified by pattern, not batched. Never review many files one-by-one.
- **MANDATORY** Each batch agent validates its own findings (`$why-review --validate-findings` in its own session); the reducer deduplicates by root cause FIRST, then re-validates only CRITICAL/HIGH (including in-batch rejections and demotions), reviewer conflicts, unvalidated findings and a MEDIUM sample.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm using ask user tool BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask user tool reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**MUST ATTENTION** named-code review prepares exact files → loads full rules → reviews captured inputs → checks both fingerprints before acceptance; feedback-only evaluation needs no preparation or installation.

**IMPORTANT MUST ATTENTION Goal:** Ensure reviewed code is correct, easy to change, convention-aligned, and verification-backed before acceptance or handoff — via receiving feedback with verification (not performative agreement), requesting targeted systematic reviews through the code-reviewer subagent, and enforcing verification gates before completion claims.

**IMPORTANT MUST ATTENTION — Main steps:** create report → blast-radius (grep/read; optional graph hint) + full-pipeline trace → detect risks/plan/surfaces → file-by-file review → holistic review → final result → validate findings before fixes → full re-review after fixes; current/branch diff requests route to `changes-review`.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each line is a signpost to its canonical body above; the body governs):** NEVER act on the digest alone; ALWAYS read the cited canonical block when its trigger fires.

- **Systematic Batching:** Large changeset → size-capped parallel batches, reduce.
- **End To Start Debugger Trace:** Trace observed end-state backward before fixing.
- **Graph-Assisted Investigation (optional):** the code graph is a stale-able hint for high-risk blast radius, never required.
- **Category Review Thinking:** Derive category concerns from first principles.
- **Subagent Return Contract:** Sub-agents return summary only, report on disk.
- **Nested Task Creation:** Expand child phases under workflow row.
- **Task Tracking External Report:** Bootstrap tasks; persist findings incrementally.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with confidence closer.
- **Evidence Based Reasoning:** Cite `file:line`; confidence >80% to act.
- **Design Patterns Quality:** DRY via OOP, lowest layer, SOLID.
- **Complexity Prevention:** One business change = one code change.
- **Double Round Trip Review:** Review → validate → fix current-round blocking findings → re-review until the current severity bar is clear (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
- **Fresh Context Review:** Re-review via fresh-memory sub-agents post-fix.
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim.
- **Rationalization Prevention:** Reject step-skipping evasions; show evidence.
- **Logic And Intention Review:** Changed code matches stated purpose.
- **Bug Detection:** Check null/boundary/error/resource every review.
- **Test Spec Verification:** Map every changed path to a test.
- **Fix Layer Accountability:** Fix at owning layer, not crash site.
- **Source Test Drift Check:** Source change → reconcile affected tests.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS.

- **MANDATORY** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via task tracking with `[N.M] /skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage. Workflow row is container, not substitute.
- **MANDATORY** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY** validate decisions with user using ask user tool — never auto-decide
- **MANDATORY** add final review task to verify work quality
- **MANDATORY MUST ATTENTION** search for project-specific reference docs BEFORE reviewing (coding standards, architecture, test conventions)
- **MANDATORY MUST ATTENTION** Phase 0: detect change type FIRST — route auth/perf files to specialized sub-agents before general review
- **MANDATORY MUST ATTENTION** run `$why-review` after completing this review to validate design rationale, alternatives considered, and risk assessment
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

| Evasion | Rebuttal |
| ------- | -------- |
| "Purpose obvious" | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough" | Echo Goal in Closing Reminders — bottom anchor prevents drift. |
| "Skip evidence for prompt edits" | Cite changed file evidence and verify no stale protocol text remains. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
