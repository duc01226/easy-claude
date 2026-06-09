<!-- PROMPT-PROTOCOLS:START -->
> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Prompt Protocol Mirror (Auto-Synced, Primacy Anchor)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$workflow-start <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$workflow-start <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.
## Learned Lessons

# Lessons

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Fill in your project's details below. -->

- [2026-03-10] **Mirror copies create staleness traps.** Editing a canonical source is insufficient when mirror copies exist — must trace and update ALL mirrored files (configs, skill definitions, docs). Grep verification after edits catches missed mirrors.
- [2026-03-10] **Docs embedding derived data stale on source modification.** Documentation that inlines data from a canonical source (e.g., workflow sequences, API schemas) goes stale silently when the source changes. Map all docs that embed canonical data and update them alongside the source.
- [2026-04-14] **Front-load report-write in sub-agent prompts for large reviews.** Sub-agents reviewing many files exhaust token budget before writing the final report — all findings lost. Design prompts so: (1) report-write is the explicit first deliverable, (2) findings appended per-file immediately (not batched), (3) scope is bounded. If sub-agent returns truncated output with no report, spawn a new one with narrower scope.
- [2026-04-14] **After context compaction, re-verify all prior phase outcomes before continuing.** Session summaries describe what the AI intended — not what persisted in the environment. When resuming a multi-phase task, the first action must be a state audit: re-check git status, re-read files, verify filesystem state. Treat every "completed" phase claim as an untested hypothesis.
- [2026-06-09] **A sub-agent "X does not exist" verdict is only as wide as its search scope.** An Explore agent grepped only `.claude/hooks` + `.claude/skills` and concluded `AGENTS.md` did not exist — it is a generated artifact produced under `.claude/scripts/codex/`, and the false premise nearly drove a duplicate parallel generator (a mirror-staleness trap). Before acting on a "missing/absent" finding, confirm the search covered generators, scripts, and build outputs — not just the obvious source dirs. For generated files, grep for the writer (`writeFileSync.*<name>`), not just the file.
- [2026-06-09] **In-process hook tests that mutate `process.env` MUST restore it in `finally`, or they silently break later suites.** A new suite set `process.env.CLAUDE_PROJECT_DIR` to a temp dir without restoring it; the leaked (deleted) path made a _downstream_ suite (`dev-rules-injector`) fail 9 tests in the full run while passing when filtered. Symptom signature: a suite passes in isolation (`--filter`) but fails in the full run → suspect global-state pollution from an earlier suite, not the failing suite itself. Wrap every env mutation in a save/restore helper; a `git stash -u` + re-run pinpoints ownership.
- [2026-06-09] **Inserting a gate earlier in a precondition chain breaks existing tests that exercise downstream gates.** Adding `handleAgentFilesGate` to the front of `init-prompt-gate`'s config-populated fast-path made older inline tests (which set up populated config but no `CLAUDE.md`/`AGENTS.md`) block on the new gate instead of reaching the staleness/graph gate they assert on. When a new gate runs before others, audit and update the setup of every test that depends on reaching a later gate — provision the new precondition so the gate passes through.
- [2026-06-09] **Adding a hook or lib module drifts canonical inventory counts — regenerate, don't hand-edit.** New `agent-files-skill-gate.cjs` (+1 hook) and `agent-files-state.cjs` (+1 lib) failed `count-drift` across CLAUDE.md, the structure reference, SKILLS.yaml, and the docs README. Fix is the documented reconcile: `generate_catalogs.py --inject-counts <file>` per marker file + `--skills --output .claude/SKILLS.yaml`, then update the manual README table. Distinguish drift you caused (hooks/lib) from incidental drift already in the working tree (e.g. an unrelated skill add) — regenerating reconciles both to filesystem truth.
<!-- PROMPT-PROTOCOLS:END -->

# Codex Context (Hookless Parity)

Purpose: provide Codex with the same core principles and lessons normally injected by Claude hooks.

Source hooks:

- `.claude/hooks/lib/prompt-injections.cjs`
- `.claude/hooks/code-patterns-injector.cjs`
- `.claude/hooks/mindset-injector.cjs`
- `.claude/hooks/lessons-injector.cjs`
- `docs/project-reference/lessons.md`

Last synced: 2026-05-29


## Codex Hookless Project Reference Gate

Codex does not receive Claude hook-injected project docs or project config summaries. Before coding, planning, debugging, testing, or reviewing:

- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.
- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.
- Read `docs/project-reference/lessons.md` for always-on project guardrails.
- For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read the spec routing set named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized.
- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.

## Critical Thinking Mindset

- Apply critical thinking and sequential thinking.
- Every claim needs traced proof.
- Confidence threshold: >80% to act; <80% verify first.
- Anti-hallucination principle: never present a guess as fact.
- Cite sources for claims, admit uncertainty, self-check output, cross-reference independently, and remain skeptical of your own confidence.

## Root Cause Principle

- Never patch symptoms.
- Trace full call chain to find who is responsible.
- Fix at the correct layer (Entity > Service > Handler).
- If a fix feels like a workaround, it is likely not the root cause.

## Common AI Mistake Prevention

- Re-read files after context compaction; edit requires prior read in current context.
- Grep for old terms after bulk replacements; verify docs/config/catalog references.
- Check downstream references before deleting files or components.
- After memory loss, inspect existing state before creating new artifacts.
- Verify AI-generated API/class/method references against real code.
- Trace full dependency chains after edits.
- When renaming, grep all consumer file types.
- Trace all code paths, including early exits and error branches.
- Update docs that embed canonical data when sources change.
- Verify sub-agent results after context recovery.
- Cross-check complete target lists against parallel sub-agent splits.
- Use custom agent types with explicit instructions; do not rely on implicit tool behavior.
- Persist sub-agent findings incrementally, not only at the end.
- Ask "whose responsibility?" before fixing; repair the responsible layer.
- Grep all removed symbols after refactors/extractions.
- Assume existing values may be intentional; inspect comments/blame/context before changing.
- Verify all affected outputs, not only the first successful one.
- Do not copy nearby patterns blindly; verify matching preconditions.
- Use holistic-first debugging: verify config/env/DB/endpoints/DI/data prerequisites before deep code hypotheses.
- Keep changes surgical: bugfix changes should map directly to the bug unless explicitly announcing enhancement scope.
- Surface ambiguity before coding; do not silently choose one interpretation.
- Activate a suitable workflow/skill before substantial execution.
- Use adversarial review mindset: test assumptions, alternatives, and failure modes.
- Front-load report writing for long reviews; append findings per section/file.
- After compaction, re-verify claimed completed steps against real current state.
- For OOM triage, validate row-count/unbounded-query causes before row-size micro-optimizations.
- Keep domain concepts out of generic/shared/infra layers; push consumer-specific domain (tenant/customer/product IDs, business entities, feature rules) into the consumer via subclass/composition — a silent leak couples a reusable layer to one consumer.

## Lessons Learned (Project)

Top rules:

- Verify all preconditions (config, env vars, DB names, DI registrations) before code-layer hypotheses.
- Fix responsible layer; never patch symptom sites.
- For parallel async with repo/UoW: use `ExecuteInjectScopedAsync`, never `ExecuteUowTask`.
- Name by purpose, not content-membership lists.
- Persist sub-agent findings incrementally, not only as final batch.
- On Windows shell, verify Python alias (`where python` / `where py`) before assuming command names.

Debugging and root-cause reasoning:

- Holistic-first debugging: list all preconditions first (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites), verify each with evidence, then form hypotheses.
- Ask "whose responsibility?" before fixing: caller vs callee responsibility must be explicit.
- Trace data lifecycle (creation -> transformation -> consumption), not only error site.
- Keep code caller-agnostic; do not encode caller-specific assumptions into business logic.

Architecture invariants:

- Parallel async + repo/UoW MUST use `ExecuteInjectScopedAsync` (new UoW + new DI scope per iteration).
- Bus message naming must reflect schema ownership with service prefix; feature services should use request messages for core services.

Naming and abstraction:

- Use purpose-driven names. If adding/removing a member forces renaming, abstraction is content-driven and likely wrong.

Environment and tooling:

- Windows bash: do not assume `python` or `python3` resolves; verify aliases first and prefer `py` on Windows when appropriate.

## Workflow and Learning Protocol

- Break substantial work into small tasks before execution.
- Maintain evidence-first decisions and report unresolved questions explicitly.
- At end of tasks, extract reusable failure-mode lessons (root-cause level, not symptom level).
- Only retain lessons that are broadly reusable and likely to recur without reminders.

<!-- WORKFLOWS:START -->
> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
## Workflow Protocol (Hookless)

Use this protocol for workflow execution in Codex (no hook dependency):
1. Detect: execute explicit `$skill`, `$workflow-*`, or `$workflow-start <id>` prompts directly; otherwise match request against workflow catalog and skill list.
2. Analyze: choose the best path: direct execution, skill, standard workflow, or custom step combination.
3. Auto-select: pick the best path yourself without asking the user to choose between direct/skill/workflow/custom options.
4. Activate: execute direct work, invoke the selected skill, start the selected workflow sequence, or run the custom sequence.
5. Tasking: create tasks for each workflow/custom/skill step when the selected path has multiple steps.
6. Execute: run steps in order, validate outputs, and report completion.

Workflow source: `.claude/workflows.json` (21 workflows).

## Workflow Catalog

### Quick Keyword Lookup (match prompt -> workflow)

| If prompt mentions... | Workflow ID | Workflow Name |
| --- | --- | --- |
| implement a large, complex, or ambiguous feature that needs research | `big-feature` | Big Feature (Research + Implement) |
| a bug, error, crash | `bugfix` | Bug Fix |
| create a ui/ux design spec, mockup, wireframe | `design-workflow` | Design Workflow |
| create, update, or improve documentation | `documentation` | Documentation Update |
| generate, update, or maintain e2e/playwright tests from code/spec | `e2e` | E2E Testing |
| implement a well-defined feature, add a component, build a capability | `feature` | Feature Implementation |
| create or update business feature documentation | `feature-spec` | Business Feature Documentation |
| full end-to-end feature delivery requiring idea | `full-feature-lifecycle` | Full Feature Lifecycle |
| start a new project from scratch, init a greenfield project, plan a new application | `greenfield-init` | Greenfield Project Init |
| take a raw idea — or, tdd test specifications, dev ba pic challenge review | `idea-to-pbi` | Idea to PBI |
| go from a raw product idea, vision, or problem statement through structured brainstorming | `product-discovery` | Product Discovery |
| restructure, reorganize, clean up | `refactor` | Code Refactoring |
| research a topic from web sources, a business/market viability evaluation, a marketing strategy | `research` | Research & Synthesis |
| review current uncommitted, staged, or unstaged changes before committing | `review-changes` | Review Current Changes |
| initial feature spec generation from zero, maintaining spec sync after code changes, quarterly spec health audits | `spec-driven-dev` | Spec-Driven Development |
| regenerating a per-bucket feature index.md after, assembling a cross-capability erd from the, producing a… | `spec-index` | Spec Discovery |
| fixing a bug update test specs, code changes update test specs, pr review update test specs | `spec-sync` | Spec Sync (Post-Change) |
| create all pbis from an existing, convert a large feature spec into, dependent pbis from docs/specs | `spec-to-pbi` | Spec to PBI Backlog |
| visualize, diagram, draw | `visualize` | Visual Diagram |
| seed test data, implement data seeders, realistic development environment data | `workflow-seed-test-data` | Seed Test Data |
| write integration tests for a specific, add test coverage to an untested, update integration tests after code changes | `write-integration-test` | Write Integration Tests |

### Workflow Details (full sequence + protocol)

### big-feature — Big Feature (Research + Implement)
- Description: Research-driven feature development for large, complex, or ambiguous features in an existing project — includes idea refinement, market research, business evaluation, domain analysis, tech stack research, and full implementation
- When To Use: User wants to implement a large, complex, or ambiguous feature that needs research, market analysis, business evaluation, domain modeling, or tech stack analysis before implementation. Big new module, major enhancement, cross-cutting capability, or feature where scope is unclear
- When Not To Use: Small/well-defined features (use feature), new project from scratch (use greenfield-init), bug fixes, documentation, test-only tasks
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> feature-spec -> spec-tests -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> plan-validate -> why-review -> cook -> review-domain-entities -> integration-test -> integration-test-review -> integration-test-verify -> spec-tests [direction=sync] -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
BIG FEATURE PROTOCOL (Research-Driven):
For large/ambiguous features in an existing codebase that need research before implementation.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. Present 2-4 options for every major decision with confidence %
4. New Tech/Lib Gate: evaluate top 3 alternatives before adding any new dependency

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis)
- [x] Tech Stack Research (tech-stack-research)
- [x] User Stories (story)
- [x] Feature Spec Consolidation (feature-spec) — folds story/pbi-mockup into the tech-free 8-section Feature Spec; these are INPUTS, not re-authored
- [x] Test Specifications (spec-tests)
- [x] Test Spec Review (review-artifact --type=spec-tests)
- [x] Implementation Plan (plan)
- [x] Plan Review (plan-review)
- [x] Plan Validation (plan-validate)
- [x] Design Rationale Review (why-review)
- [x] Implementation (cook)
- [x] Domain Entity Review (review-domain-entities) — CONDITIONAL: skip if no domain entity files changed
- [x] Integration Tests (integration-test)
- [x] Review Changes (workflow-review-changes) — consolidated review + fix loop
- [x] SRE Review (sre-review)
- [x] Changelog (changelog)
- [x] Tests (test)
- [x] Documentation (docs-update)
- [x] Summary (watzup)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, component boundaries, data flow, tech choices. Based on: research findings + domain analysis.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, test infrastructure, phased steps. Based on: stories + test specs + dependency tables.
The two plans serve different purposes — PLAN₁ is strategic, PLAN₂ is tactical.

SECOND PLANNING ROUND:
After stories + reviews are complete, a second $plan + $plan-review cycle runs.
The first $plan (after architecture-design) is high-level architecture based on research + domain analysis.
The second $plan (after review-artifact --type=spec-tests) incorporates the concrete stories, test specifications, dependency tables, and refinement details into a sprint-ready implementation plan with phased steps.
This ensures the implementation plan reflects all discovered requirements, test strategy, and story dependencies.

TEST SPECIFICATIONS (after review-artifact --type=story, BEFORE second plan):
After stories are reviewed, write TDD specs ($spec-tests) based on story acceptance criteria.
Review specs ($review-artifact --type=spec-tests) for coverage and correctness.
The second $plan then incorporates test strategy alongside implementation tasks.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
For existing projects adding a new module, adapt scaffolding to extend existing base classes rather than creating duplicates.
MANDATORY SPEC-DRIVEN BIG-FEATURE GATES:
- Read docs/project-reference/spec-principles.md before $story and $spec-tests to lock intent and non-negotiable invariants.
- $spec-tests + $review-artifact --type=spec-tests MUST map each invariant to Section 8 TC IDs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine flows, tests MUST assert persisted state transitions and invalid-transition rejection.
- Before $workflow-end, enforce three-way sync: spec docs ↔ TDD docs ↔ test code via $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### bugfix — Bug Fix
- Description: Systematic debugging and fix workflow with end-to-start debugger trace before fix
- When To Use: User reports a bug, error, crash, failure, regression, stale/incorrect final output, or something not working; wants to fix/debug/troubleshoot an issue with end-to-start trace
- When Not To Use: New feature implementation, code improvement/refactoring, investigation-only (no fix), documentation updates
- Sequence: `scout -> investigate -> debug-investigate -> feature-spec [mode=amend] -> plan -> plan-review -> plan-validate -> why-review -> spec-tests -> why-review -> review-artifact --type=spec-tests -> integration-test -> fix -> prove-fix -> integration-test -> integration-test-review -> integration-test-verify -> spec-tests [direction=sync] -> workflow-review-changes -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
BUG FIX PROTOCOL (TDD-FIRST):
PROJECT CONTEXT: Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Read docs/project-config.json and docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may implement or review when this context is synced.
1. Scout: Find files related to the reported issue
2. Investigate: Understand current vs expected behavior and unchanged behavior that must be preserved
   IMPORTANT: When analyzing 'unused' code during investigation:
   - Follow Investigation Protocol (CLAUDE.md)
   - Require grep evidence, confidence >=80%, cross-module/service checks (see docs/project-config.json → workflowPatterns.crossModuleValidation)
   - Use $investigate skill for removal/refactoring decisions
3. Debug: Identify root cause with evidence (file:line)
3b. END-TO-START DEBUGGER TRACE GATE: Start at the observed final symptom/output, identify the final reader, trace backward through storage/projection, writer, consumer/job, producer/origin, enumerate all feeder paths, and build a hypothesis matrix. BLOCKED until owning fix layer and forward convergence proof are written.
4. Plan fix with minimal blast radius
5. Validate plan before implementing
6. Validate fix rationale with $why-review
6b. SPEC-BUG GATE — Run BEFORE writing regression TCs:
   Ask: "Is this a Code Bug or a Spec Bug?"
   • CODE BUG (code doesn't match spec — most common): Spec correctly describes expected behavior. Code diverged. Proceed to step 7.
   • SPEC BUG (spec documented wrong behavior; code implemented the spec faithfully): Do NOT write regression TCs yet. First run $feature-spec [update] to correct the affected Feature Spec sections (§1-7, plus §8 if a TC encoded the wrong behavior). Then return to step 7.
   • AMBIGUOUS: Ask user: "Did the spec ever correctly document this behavior?"
   SIGNAL: Spec MATCHES buggy code → Spec Bug. Spec says X but code does Y → Code Bug.
7. Write test specs ($spec-tests REGRESSION mode): Create TC specs asserting the CORRECT (fixed) expected behavior — not the buggy behavior. These become the regression guard.
8. Review test specs with $review-artifact --type=spec-tests
9. WRITE INTEGRATION TEST — RED phase: Implement integration test(s) based on the bug reproduction spec. Run the test(s) — they MUST FAIL. A passing test means it does NOT actually catch the bug. Never proceed to fix until the test(s) fail.
10. Fix the identified issue
11. PROVE FIX: Build code proof traces per change, confidence scores, stack-trace-style evidence. MANDATORY — never skip.
12. RE-RUN INTEGRATION TESTS — GREEN phase: Run integration tests again — expect all to PASS. This confirms the fix resolves the bug AND regression guard is in place.
13. Review integration tests with $integration-test-review — verify tests have real assertion value, not just smoke/existence checks.
14. Code review for quality and regression risk
15. Update changelog
16. Run full test suite to verify fix and no regressions
17. Summary report of fix and verification results

PERFORMANCE-SDD ROUTE: If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run $test and relevant functional checks when behavior can change. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY INVARIANT-PRESERVING BUGFIX LOOP:
- Do not encode buggy behavior into specs/tests. Confirm intended invariant from spec docs first.
- $spec-tests REGRESSION mode MUST capture preserved invariants and newly-fixed invariants explicitly.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): regression tests MUST assert entity state before/after transitions and invalid transition rejection.
- RED/GREEN harness proof is mandatory: first $integration-test must fail on the bug, second $integration-test must pass after fix.
- $workflow-end is BLOCKED until specs, TCs, and test code are synchronized via $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### design-workflow — Design Workflow
- Description: Designer workflow: create design specification and implement UI (product, marketing, creative) from requirements or screenshots
- When To Use: User wants to create a UI/UX design spec, mockup, wireframe, or component specification, design a product interface (dashboard, admin panel, SaaS app), build a landing page, create a marketing page, replicate a screenshot/design, or build a creative/distinctive frontend interface
- When Not To Use: Implementing an existing design in code
- Sequence: `design-spec -> why-review -> interface-design -> frontend-design -> workflow-review-changes -> docs-update -> workflow-end`

Protocol:
```text
Role: UX Designer
DESIGN WORKFLOW:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → designSystem.docsPath to find design system documentation. Read docs/project-config.json → workflowPatterns.cssMethodology for project CSS conventions.
1. Read requirements/PBI
2. Create design spec with component inventory, states, tokens, accessibility
3. DESIGN IMPLEMENTATION GATE (pick ONE, skip the other):
   - Product UIs (dashboards, admin panels, SaaS apps, data interfaces) → $interface-design (skip frontend-design)
   - Marketing pages, landing pages, creative UIs, screenshot replication → $frontend-design (skip interface-design)
   Mark the skipped step as completed immediately.
4. Review with code-review agent
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### documentation — Documentation Update
- Description: Documentation creation and update workflow with plan validation
- When To Use: User wants to create, update, or improve documentation, READMEs, or code comments
- When Not To Use: Feature implementation, bug fixes, test writing
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> review-post-task -> workflow-end -> watzup`

Protocol:
```text
IMPORTANT: For project feature docs under docs/specs/, use feature-spec workflow instead.

DOCUMENTATION UPDATE PROTOCOL:
1. Scout: Identify all documentation files affected by recent changes
2. Investigate: Read existing docs, understand current structure and content
3. Plan: List all files and sections to update with specific changes
4. Validate plan via $plan-review before making any edits
5. Execute updates following existing doc conventions and templates
6. Review changes before finalizing
7. Summary report of all documentation changes

RULES:
- For business feature docs (tech-free 8-section format), use feature-spec workflow instead
- Match existing style and formatting of target documents
- Update table of contents and cross-references if structure changes
- Never create new doc files when existing ones should be updated
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### e2e — E2E Testing
- Description: Generate, update, or maintain E2E/Playwright tests — source-parameterized (changes | recording | update-ui)
- When To Use: User wants to generate, update, or maintain E2E/Playwright tests from code/spec changes (--source=changes), a Chrome DevTools recording (--source=recording), or for UI screenshot baselines (--source=update-ui)
- When Not To Use: Non-E2E test work (unit/integration tests → use the test/integration-test workflows)
- Sequence: `scout -> e2e-test -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
E2E WORKFLOW (source-parameterized):
Resolve --source={changes|recording|update-ui} and follow the matching protocol block in .claude/skills/workflow-e2e/SKILL.md:
- changes: detect change type from git diff (spec/code/API) -> load affected TC-{FEATURE}-{NNN} -> update/generate test implementations -> ensure each TC has a corresponding test -> run tests -> report coverage.
- recording: validate recording JSON -> identify app/feature -> run convert-recording.ts -> map TCs to recording steps -> apply project CSS conventions (docs/project-config.json → workflowPatterns.cssMethodology) -> add screenshot assertions -> Page Object if complex -> run + report.
- update-ui: identify visual diff (SCSS/HTML/TS) -> map to page objects -> find affected specs -> regenerate screenshots (--update-snapshots) -> visual review old vs new -> confirm intentional with user -> report.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### feature — Feature Implementation
- Description: Full feature development workflow with search-first approach, planning, implementation, testing, and documentation
- When To Use: User wants to implement a well-defined feature, add a component, build a capability, develop a module, implement/execute an existing plan, create a new API endpoint, or design an API contract, TDD/test-first development, spec-driven feature implementation with test specs written before code
- When Not To Use: Bug fixes, documentation, test-only tasks, feature requests/ideas (no implementation), PBI/story creation, design specs, large/ambiguous features needing research (use big-feature)
- Sequence: `scout -> investigate -> domain-analysis -> why-review -> feature-spec -> plan -> plan-review -> plan-validate -> why-review -> spec-tests -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> cook -> review-domain-entities -> spec-tests -> why-review -> review-artifact --type=spec-tests -> spec-tests [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
FEATURE IMPLEMENTATION PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns and docs/project-reference/docs-index-reference.md for project-specific architecture, test, documentation, naming, and CSS conventions. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root. Any supported AI tool may implement or review when this context is synced.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar features, patterns, and implementation examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
2b. Domain Analysis — CONDITIONAL: if feature creates/modifies domain entities, run $domain-analysis after investigate to model bounded contexts and ERD before planning.
3. Plan: Design solution following discovered project patterns (architecture, state management, CSS — see docs/project-config.json → workflowPatterns). Include expected behavior, unchanged behavior, and docs/spec/test sync when behavior can change.
4. Validate plan via $plan-review before any code changes
5. Validate design rationale with $why-review (features/refactors)
6. Write test specifications with $spec-tests CREATE mode (before implementation). Review with $review-artifact --type=spec-tests.
7. Update plan with test strategy via $plan (re-plan cycle). Review with $plan-review.
8. Implement with $cook (backend + frontend) — guided by test specs
8b. Domain Entity Review — CONDITIONAL: if domain entity files created/modified, run $review-domain-entities before updating test specs to catch DDD quality issues early.
9. Update test specs to catch implementation gaps with $spec-tests UPDATE mode. Review with $review-artifact --type=spec-tests. Sync §8 TCs ↔ integration test code with $spec-tests [direction=sync].
10. Generate/update integration tests with $integration-test — creates actual test files from TC specifications.
11. Simplify code for readability and consistency
12. Code review for quality, security, patterns compliance
13. SRE review for production readiness
14. Update changelog with feature entry
15. Run tests to verify no regressions
16. Update documentation if feature impacts business docs
17. Summary report of all changes

PLAN PHASES:
- PLAN₁ (after investigate): Feature design plan. Scope: architecture, file changes, implementation approach.
- PLAN₂ (after review-artifact --type=spec-tests): Updated plan incorporating test strategy. Scope: refine PLAN₁ with test infrastructure, test data setup, spec coverage gaps.

GUARDRAIL: Provide file:line evidence of pattern search in plan. Follow project conventions over generic docs.

PERFORMANCE-SDD ROUTE: If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run $performance-review and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do NOT skip $cook. If behavior can change, run $test and relevant functional no-regression checks. Update the affected Feature Spec (docs/specs/{Bucket}/) for changed SLA, performance constraints, or behavior boundaries.
MANDATORY SPEC-DRIVEN + INVARIANT + TEST HARNESS LOOP:
- Read docs/project-reference/spec-principles.md before $plan and lock feature intent + non-negotiable invariants.
- $spec-tests MUST map every invariant to TC IDs in §8 Test Specifications.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle behavior, tests MUST assert persisted entity state transitions and invalid-transition rejection.
- $workflow-end is BLOCKED until Feature Spec §1-7, §8 TCs, and test code are synchronized via $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update. Performance-related work may delegate measurement to $performance-review, but spec/test/docs sync remains required whenever behavior, public contract, SLA, performance constraints, or docs/spec boundaries change.
- If mismatch exists (spec vs code vs tests), run $feature-spec [update] + $spec-tests [update] before closure.
- Code-to-spec extraction is reference-only until accepted by the canonical spec owner.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### feature-spec — Business Feature Documentation
- Description: Business feature documentation with tech-free 8-section Feature Spec template enforcement, plan validation, and mandatory test coverage (TCs in Section 8)
- When To Use: User wants to create or update business feature documentation under the fixed docs/specs Feature Spec root
- When Not To Use: Bug fixes, feature implementation, test writing, debugging, refactoring
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> docs-update -> workflow-review-changes -> review-post-task -> workflow-end -> watzup`

Protocol:
```text
Role: Documentation Specialist
BUSINESS FEATURE DOC PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns.featureDocTemplate to find and read the feature doc template — follow its section requirements exactly. Use docs/specs/ for the docs directory.
- TC-{FEATURE}-{NNN} test case format with GIVEN/WHEN/THEN
- Evidence field with `[Source: namespace/service/id]` abstract-anchor format (never physical file:line)
- Cross-reference parent features if sub-feature

MANDATORY UPDATE CHECKLIST (when updating existing docs):
- ALWAYS update the Test Specifications section when documenting new functionality
- Plan MUST ATTENTION include all impacted sections identified from diff analysis
- Plan MUST ATTENTION be validated via $plan-review and $plan-validate before any edits begin

OUTPUT: Complete feature README following template sections.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### full-feature-lifecycle — Full Feature Lifecycle
- Description: Complete feature from idea through implementation, testing, and documentation — PO→BA→Designer→Dev→QA
- When To Use: Full end-to-end feature delivery requiring idea → PBI → stories → design → implementation → testing → documentation
- When Not To Use: PBI-only work (use idea-to-pbi), implementation-only work (use feature or big-feature), research-heavy new product (use big-feature or greenfield-init), bug fixes (use bugfix)
- Sequence: `idea -> refine -> why-review -> review-artifact --type=pbi -> domain-analysis -> why-review -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> design-spec -> why-review -> interface-design -> frontend-design -> feature-spec -> plan -> plan-review -> plan-validate -> why-review -> cook -> review-domain-entities -> spec-tests -> why-review -> review-artifact --type=spec-tests -> integration-test -> integration-test-review -> integration-test-verify -> spec-tests [direction=sync] -> workflow-review-changes -> sre-review -> quality-gate -> docs-update -> workflow-end -> watzup`

Protocol:
```text
FULL FEATURE LIFECYCLE PROTOCOL:
End-to-end feature delivery with formal role handoffs: idea capture → PBI refinement → story creation → Dev BA PIC challenge → DoR gate → design → implementation → testing → documentation. Apply shared/sdd-artifact-contract.md and allow any supported AI tool to implement or review when context is synced.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. pbi-challenge requires Dev BA PIC (different person from drafter)
3. dor-gate must pass (PASS or WARN) before design steps
4. plan-validate confirms implementation plan with user before cook
4b. domain-analysis (after review-artifact --type=pbi) — CONDITIONAL: skip if feature has no domain entity changes. Run to model bounded contexts, aggregates, ERD before story writing.
4c. review-domain-entities (after cook) — CONDITIONAL: skip if no domain entity files in changeset. Reviews DDD quality of created/modified entities before integration tests.
4d. feature-spec (after frontend-design, before plan) — CONSOLIDATION point: folds story/design-spec/pbi-mockup into the tech-free 8-section Feature Spec; these upstream artifacts are INPUTS, not re-authored. spec-tests then writes TCs into it.
5. workflow-review-changes is the consolidated review + fix loop. Use the canonical review-changes workflow sequence from .claude/workflows.json: review-changes -> why-review findings validation -> parallel review batch -> code-simplifier -> verification -> plan/plan-review/why-review/cook -> full restart -> docs.
6. Save artifacts at every step to configured plan and product-artifact roots from docs/project-config.json or project reference docs.
MANDATORY FULL-LIFECYCLE SYNC GATES:
- Read docs/project-reference/spec-principles.md before planning and spec-tests updates to keep intent/invariants explicit across role handoffs.
- Treat AI-extracted specs, PBIs, stories, and TCs as draft/reference until their owning review or acceptance gate approves them.
- Keep three-way sync explicit throughout the lifecycle: spec docs ↔ Section 8 TCs ↔ test code.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state transitions, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, enforce sync chain: $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update.
- When shared skill/workflow guidance changed, confirm generated mirrors are current before closure.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### greenfield-init — Greenfield Project Init
- Description: Full waterfall project inception from idea through implementation with integration testing
- When To Use: User wants to start a new project from scratch, init a greenfield project, plan a new application, research and plan before coding, bootstrap a new codebase, build something new
- When Not To Use: Existing codebase with code, bug fixes, feature implementation, refactoring existing code
- Sequence: `idea -> web-research -> deep-research -> business-evaluation -> domain-analysis -> why-review -> tech-stack-research -> architecture-design -> why-review -> plan -> plan-review -> security-review -> performance-review -> plan-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> plan-validate -> why-review -> spec-tests -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> scaffold -> linter-setup -> harness-setup -> why-review -> cook -> review-domain-entities -> spec-tests -> why-review -> review-artifact --type=spec-tests -> plan -> plan-review -> integration-test -> integration-test-review -> integration-test-verify -> test -> workflow-review-changes -> sre-review -> security-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
GREENFIELD PROJECT INCEPTION PROTOCOL:
You are acting as a Solution Architect for a brand-new project.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY stage requires ask the user directly validation before proceeding
2. Save artifacts to plan directory at EVERY step
3. All tech recommendations include confidence % and evidence
4. Present 2-4 options for every major decision
5. Delegate architecture decisions to solution-architect agent
6. After workflow activation, auto-select applicable steps and skip irrelevant conditional steps
7. NEVER ask tech stack upfront — business analysis first, tech stack research after domain analysis
8. Domain analysis produces ERD + bounded contexts BEFORE tech stack research
9. Tech stack research compares top 3 options per layer with detailed pros/cons

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Discovery Interview (idea)
- [x] Market Research (web-research)
- [x] Deep Research (deep-research)
- [x] Business Evaluation (business-evaluation)
- [x] Refine to PBI (refine)
- [x] Domain Analysis & ERD (domain-analysis) — NEW
- [x] Tech Stack Research (tech-stack-research) — NEW
- [x] Implementation Plan (plan)
- [x] Plan Validation (plan-validate)
- [x] Test Strategy (spec-tests) — includes integration test strategy
- [x] User Stories (story)
- [x] Final Review (plan-review)

Auto-skip steps that are irrelevant to the prompt; mark skipped steps as completed with a short reason.

PLAN PHASES (quick reference):
- PLAN₁ (after architecture-design): High-level architecture plan. Scope: system design, layer boundaries, component responsibilities, tech choices. Followed by $security-review + $performance-review review of the architecture.
- PLAN₂ (after review-artifact --type=spec-tests): Sprint-ready implementation plan. Scope: concrete tasks, file changes, scaffolding needs, test infrastructure. Based on: stories + test specs from TDD-SPEC₁.
- PLAN₃ (after TDD-SPEC₂ post-implementation): Integration test architecture plan. Scope: test file structure, test data setup, CI integration. Based on: implementation code + updated test specs.
The three plans serve progressively detailed purposes — architecture → implementation → test infrastructure.

SECOND PLANNING ROUND:
After stories + TDD specs are generated and reviewed, a second $plan + $plan-review cycle runs.
This second plan incorporates the concrete stories, test specs, and dependency tables into a detailed implementation plan.
The first plan is high-level architecture; the second plan is sprint-ready with phased implementation steps.

ARCHITECTURE SCAFFOLDING (after second plan-review, CONDITIONAL):
The $scaffold step is CONDITIONAL — AI must first self-investigate for existing base abstractions.
Grep for: abstract/base classes, generic interfaces, infrastructure abstractions (IRepository, IUnitOfWork), utility layers (Extensions, Helpers, Utils), frontend foundations (base component/service/store), DI registrations.
If existing scaffolding found → SKIP $scaffold step, mark completed.
If NO foundational abstractions found → PROCEED: create all base abstract classes, generic interfaces, infrastructure abstractions, and shared utilities with OOP/SOLID principles BEFORE any feature story implementation.
All infrastructure behind interfaces with at least one concrete implementation (Dependency Inversion).
The scaffolded project should be copy-ready as a starter template for similar projects.

IMPLEMENTATION & INTEGRATION TESTING (after scaffold):
After scaffolding, the workflow continues with full implementation and integration testing:
1. $why-review validates design rationale before coding
2. $cook implements the feature (backend + frontend)
3. $review-domain-entities reviews domain entity DDD quality — CONDITIONAL: skip if no domain entity files in changeset. Detects anemic model, missing invariants, VO misclassification before integration tests are written.
4. $spec-tests writes test specifications (feature doc Section 8)
5. $review-artifact --type=spec-tests validates spec coverage and correctness
6. Third $plan + $plan-review cycle plans integration test architecture
7. $integration-test generates integration tests from specs
8. $test runs all tests to verify TCs pass
9. $workflow-review-changes for quality (use the canonical review-changes workflow sequence from .claude/workflows.json: review-changes, why-review findings validation, parallel review batch, code-simplifier, verification, plan/plan-review/why-review/cook, and full re-review restart)
10. $sre-review + $security-review for production readiness
11. $changelog + final $test + $docs-update + $watzup to close
This ensures greenfield projects ship with integration test coverage from day one.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### idea-to-pbi — Idea to PBI
- Description: PO/BA workflow: capture or review idea/artifact, refine to PBI, create user stories, generate TDD test specs, challenge review, DoR gate, mockup, prioritize
- When To Use: PO or BA wants to take a raw idea — OR PO is handing off an existing artifact/ticket/brief to BA — through to a grooming-ready PBI with user stories, TDD test specifications, Dev BA PIC challenge review, DoR validation, wireframes, and backlog prioritization
- When Not To Use: Already have a drafted PBI (use pbi-challenge standalone), implementing a feature (use feature or big-feature)
- Sequence: `idea -> review-artifact -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> spec-tests -> why-review -> review-artifact --type=spec-tests -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:
```text
IDEA TO PBI PROTOCOL:
Capture and refine a raw idea — or a handed-off artifact/ticket/brief — into a grooming-ready PBI with stories, TDD test specifications, challenge review, DoR validation, and wireframe. Apply the shared SDD Artifact Contract from shared/sdd-artifact-contract.md in the active skills root and read docs/project-config.json plus docs/project-reference/docs-index-reference.md for project-specific conventions. Any supported AI tool may produce or review artifacts when this context is synced.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. Each step must invoke its skill invocation — never batch-complete or skip steps
2. review-artifact is CONDITIONAL — skip if no existing artifact; proceed straight to refine
3. why-review runs three times with purpose-specific labels: after refine, after story, and after spec-tests. The standalone gate after review-artifact --type=pbi is omitted because review-artifact --type=pbi (like every review skill) self-invokes $why-review --validate-findings internally as a Findings Validation Gate. Each gate validates WHY before the next artifact step proceeds. FAIL blocks the next artifact step; WARN requires user acknowledgment.
4. spec-tests and review-artifact --type=spec-tests run after review-artifact --type=story so acceptance criteria and stories are mapped into testable TC specifications before challenge and DoR gates
5. pbi-challenge is run by a reviewer different from the drafter — confirm reviewer identity before that step
6. dor-gate must pass (PASS or WARN) before pbi-mockup is finalized
7. Save artifacts at every step to the workflow artifact paths used by the child skills. If artifact roots become configurable later, update the workflow and child skills in the same change.
8. Write output IMMEDIATELY after each step — never batch
9. Run docs-update after prioritize and before workflow-end so specs, feature docs, and TDD/spec docs stay synchronized
10. Treat AI-generated ideas, PBIs, stories, mockups, and TCs as draft/reference until the owning review or acceptance gate approves them.

STEP SELECTION GATE:
After workflow activation, present the full step list and let user deselect irrelevant ones:
- [x] Idea capture (idea)
- [ ] Review existing artifact (review-artifact) — CONDITIONAL: only if PO artifact/ticket exists
- [x] Refine to PBI (refine) — hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] Refinement rationale review (why-review) — after refine
- [x] PBI review (review-artifact --type=pbi)
- [x] User stories (story)
- [x] Story rationale review (why-review) — after story
- [x] Story review (review-artifact --type=story)
- [x] Test specifications (spec-tests)
- [x] Test-spec rationale review (why-review) — after spec-tests
- [x] Test specification review (review-artifact --type=spec-tests)
- [x] Dev BA PIC challenge (pbi-challenge)
- [x] Definition of Ready gate (dor-gate)
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL: skip for backend-only PBIs
- [x] Backlog prioritization (prioritize)
- [x] Documentation synchronization (docs-update) — near-final sync for specs, feature docs, and TDD/spec docs

WHY-REVIEW GATES (repeated, purpose-specific):
Run in sequence after refine, after story, and after spec-tests (the gate after review-artifact --type=pbi is omitted — review-artifact --type=pbi self-invokes $why-review --validate-findings internally as a Findings Validation Gate). Challenge the active artifact rationale before the next artifact step:
- Is this the right next artifact/solution to the stated problem? What was rejected and why?
- Are the acceptance criteria, story, or TC constraints justified? What breaks if they change?
- Pre-mortem: if this PBI ships and fails in 3 months, what breaks?
- Are there simpler alternatives the team has not considered?
Output: Why-Review checklist with PASS/WARN/FAIL + adversarial analysis section.
FAIL blocks the next artifact step — active artifact must be revised first.

TDD-SPEC GATE (after review-artifact --type=story):
Before pbi-challenge and DoR, map reviewed stories and acceptance criteria into TC specifications:
- Each material acceptance criterion should map to at least one TC ID
- Route planned TC IDs to Feature doc Section 8 through $spec-tests; $docs-update later verifies feature docs and §8 TC ↔ integration test code sync
- Cover happy path, validation failure, authorization/permission, and important edge cases where applicable
- Review specs with review-artifact --type=spec-tests before pbi-challenge so reviewers evaluate a testable PBI
- AI-generated TC drafts are reference-only until review and DoR gates accept them.

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: PBI created, test specs created/reviewed, docs sync completed, DoR result (PASS/WARN/FAIL), any blocking items
- Recommended next workflow: $workflow-start feature or $workflow-start big-feature (if PBI is ready to implement)
- Any DoR failures: list specific blocking criteria that must be resolved
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### product-discovery — Product Discovery
- Description: Product discovery: raw vision or problem → structured brainstorm → prioritized opportunity map → N PBIs with stories, challenge review, DoR gate, and wireframes → cross-PBI ranked backlog ready for sprint planning
- When To Use: PO/BA wants to go from a raw product idea, vision, or problem statement through structured brainstorming into a prioritized backlog of multiple PBIs with stories, challenge review, DoR validation, wireframes, and cross-PBI ranking — full product discovery sprint output without implementation
- When Not To Use: Single well-defined feature (use feature or idea-to-pbi), implementation-only work (use feature or big-feature), bug fixes (use bugfix), research-only without PBI output (use $investigate skill or deep-research)
- Sequence: `brainstorm -> web-research -> domain-analysis -> why-review -> idea -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> review-changes -> prioritize -> workflow-end -> watzup`

Protocol:
```text
PRODUCT DISCOVERY PROTOCOL:
Converts a raw product vision or problem statement into a grooming-ready backlog of multiple PBIs through structured PO/BA discovery techniques.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. EVERY research stage requires ask the user directly validation before proceeding
2. Save ALL artifacts to configured artifact and plan roots at EVERY step — write IMMEDIATELY after each task, never batch
3. $brainstorm output MUST produce a scored opportunity map (RICE) before any $idea step
4. TASK DECOMPOSITION GATE: After user selects opportunities, call task tracking for EVERY task (N opportunities x 8 steps = Nx8 tasks min) BEFORE processing any opportunity — do NOT start the loop without a complete task list
5. The idea-to-pbi loop (steps 4-11) repeats for EACH opportunity selected from the map — NOT just once
6. pbi-challenge requires Dev BA PIC (not the drafter) — confirm reviewer identity before that step
7. dor-gate must pass (PASS or WARN) before pbi-mockup
8. $prioritize at the end is cross-PBI — ranks ALL PBIs from this session together
9. This workflow produces a BACKLOG only — no implementation. Hand off to the feature or full-feature-lifecycle workflow.
10. SCALE MANAGEMENT: For 6+ opportunities, spawn one sub-agent per opportunity (each gets brainstorm context + task list); main context runs $prioritize at end. After every 3 opportunities, update session summary table.

STEP SELECTION GATE:
After workflow activation, auto-select the applicable steps and skip irrelevant conditional steps. Default step set:
- [x] Brainstorm — Double Diamond: problem frame, HMW, SCAMPER, opportunity map (RICE-scored)
- [x] Market Research (web-research) — CONDITIONAL: skip for internal tools or when domain is well-understood
- [x] Domain Analysis (domain-analysis) — CONDITIONAL: skip if no new domain entities involved
- [x] Idea capture (idea) — REPEATS per opportunity
- [x] PBI refinement (refine) — REPEATS per opportunity: hypothesis, AC, RICE, GIVEN/WHEN/THEN
- [x] PBI review (review-artifact --type=pbi) — REPEATS per opportunity
- [x] User stories (story) — REPEATS per opportunity
- [x] Story review (review-artifact --type=story) — REPEATS per opportunity
- [x] Dev BA PIC challenge (pbi-challenge) — REPEATS per opportunity
- [x] Definition of Ready gate (dor-gate) — REPEATS per opportunity
- [x] PBI mockup/wireframe (pbi-mockup) — CONDITIONAL per opportunity: skip for backend-only PBIs
- [x] Cross-PBI prioritization (prioritize)

MULTI-OPPORTUNITY LOOP (core mechanic):
The $brainstorm step produces a scored opportunity map — typically 3–8 opportunities ranked by RICE.
For EACH opportunity the team selects to develop:
  1. Run $idea to capture as structured artifact → configured idea artifact root
  2. Run $refine to create PBI with hypothesis, AC, RICE, GIVEN/WHEN/THEN → configured PBI artifact root
  3. Run $review-artifact --type=pbi — BA quality check
  4. Run $story — user stories per PBI
  5. Run $review-artifact --type=story — story quality check
  6. Run $pbi-challenge — Dev BA PIC review (challenge prompts, AC quality, feasibility)
  7. Run $dor-gate — INVEST check, DoR pass/fail
  8. Run $pbi-mockup — wireframe (SKIP for backend-only PBIs)
After ALL opportunities are processed: run $prioritize across all PBIs.

BRAINSTORM STEP REQUIREMENTS:
- Detect scenario: problem-solving vs new product vs enhancement
- Apply Double Diamond: problem framing (5 Whys/HMW/JTBD) → opportunity framing (OST/Lean Canvas) → ideation (SCAMPER/Crazy 8s) → convergence (RICE/Kano/2x2)
- Output: opportunity map with 3–8 scored items
- Present map to user: 'Which opportunities should we develop into PBIs?' (ask the user directly, multiSelect: true)
- Document in plans/{plan-dir}/brainstorm-opportunity-map.md

CROSS-PBI PRIORITIZE STEP:
- Aggregate all PBIs produced in this session
- Apply cross-PBI RICE scoring and dependency graph
- Produce a sprint-ready ranked backlog
- Flag Must-Have vs Should-Have vs Could-Have per release scope
- Output: configured backlog artifact root/product-discovery-{date}-backlog.md

HANDOFF:
At workflow-end, AI MUST ATTENTION present:
- Summary: N PBIs created, X passed DoR, Y need rework
- Recommended next workflow: $workflow-start feature (implement the top-ranked PBI from the backlog) OR $workflow-start big-feature (if single large PBI needs deep research + implementation)
- Any PBIs that failed DoR gate: list blocking items

AUTO-SKIP RULES:
- web-research: skip if user says 'internal tool', 'well-understood domain', or 'no market research needed'
- domain-analysis: skip if no new entities/aggregates — ask: 'Does this product involve new domain entities?'
- pbi-mockup: skip per-PBI if PBI is backend-only (no UI changes)

WHY-REVIEW GATE (after domain-analysis, before per-opportunity loop):
Before committing to the per-PBI loop, validate the opportunity map rationale:
- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (e.g., platform change, process change) that make these opportunities unnecessary?
Output: Why-Review checklist with PASS/WARN/FAIL per opportunity.
FAIL on a high-ranked opportunity → remove from selection or revisit brainstorm framing.
WARN → document risk and proceed with user acknowledgment.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### refactor — Code Refactoring
- Description: Code improvement and restructuring workflow with search-first approach
- When To Use: User wants to restructure, reorganize, clean up, or improve existing code without changing behavior; technical debt
- When Not To Use: Bug fixes, new feature development
- Sequence: `scout -> investigate -> plan -> plan-review -> plan-validate -> why-review -> code -> spec-tests -> why-review -> review-artifact --type=spec-tests -> spec-tests [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> workflow-review-changes -> sre-review -> changelog -> test -> docs-update -> workflow-end -> watzup`

Protocol:
```text
Role: Refactoring Specialist
REFACTORING PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → workflowPatterns for project-specific architecture patterns, code hierarchy, and naming conventions.
⚠️ MANDATORY: Search existing code BEFORE planning
1. Scout: Find similar refactoring patterns, identify target architecture examples using Grep/Glob
2. Investigate: Study existing patterns - validate with 3+ codebase examples (NOT generic framework docs)
3. Plan: Identify code smells, define target architecture following discovered project patterns
4. Validate plan  --  ensure no behavioral changes, only structural
5. Validate design rationale with $why-review (features/refactors)
6. Implement incrementally  --  small, verifiable steps
7. Verify test specs still match after refactoring with $spec-tests update mode. Review with $review-artifact --type=spec-tests. Sync Feature Spec §8 ↔ test code with $spec-tests [direction=sync].
8. Verify/update integration tests with $integration-test — ensures tests reflect refactored code paths.
9. Simplify: Remove dead code, flatten nesting, extract duplicates
   CRITICAL: Before removing any code:
   - Use $investigate skill for 'unused' code verification
   - Require evidence: grep results + confidence ≥80% + cross-module/service validation
   - See Investigation Protocol (CLAUDE.md)
10. Code review: Verify no functional regressions
11. SRE review for production readiness
12. Update changelog with refactoring summary
13. Run tests  --  all existing tests MUST ATTENTION pass
14. Summary report of structural improvements

GUARDRAILS:
- Refactoring MUST ATTENTION NOT change observable behavior
- Follow project patterns from docs/project-config.json → workflowPatterns (architecture, code hierarchy, naming)
- Apply project code responsibility hierarchy from docs/project-config.json → workflowPatterns.codeHierarchy
- Provide file:line evidence of pattern search in plan

PERFORMANCE-SDD ROUTE: If this refactor is performance-driven (query optimization, caching, reducing allocations, improving throughput), run $performance-review for benchmark evidence while preserving observable behavior. Do not use performance/refactor scope to bypass spec, test, or docs sync when behavior, public contract, SLA, performance constraint, state timing boundary, or docs/spec boundary changes. Pure behavior-preserving optimization may skip new TC/integration-test generation only with explicit skip reason and invariant-preservation evidence. $test remains mandatory.
MANDATORY REFACTOR INVARIANT SAFETY GATES:
- Preserve existing intent/invariants; refactor MUST NOT change observable behavior unless explicitly approved.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine logic, tests MUST assert persisted transitions and invalid-transition rejection.
- Before $workflow-end, maintain three-way sync: spec docs ↔ TDD docs ↔ test code via $spec-tests + $review-artifact --type=spec-tests + $spec-tests [direction=sync] + $integration-test + $integration-test-review + $integration-test-verify + $docs-update. Performance-driven refactors may delegate measurement to $performance-review, but observable behavior preservation and required spec/test/docs sync remain closure gates.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### research — Research & Synthesis
- Description: Research & Synthesis: gather web sources on a topic, then synthesize into one of four artifacts selected by --output — cited knowledge report (synthesis), business/market viability evaluation (business-eval), marketing strategy (marketing), or structured course material (course)
- When To Use: User wants to research a topic from web sources and synthesize the findings into a deliverable — a cited knowledge report, a business/market viability evaluation, a marketing strategy, or structured course material
- When Not To Use: Implementing code or features (use feature/big-feature), fixing bugs (use bugfix), updating project documentation (use documentation), investigating how existing code works (use $investigate skill), turning research into a PBI backlog (use product-discovery)
- Sequence: `web-research -> deep-research -> knowledge-synthesis -> knowledge-review -> workflow-end`

Protocol:
```text
RESEARCH & SYNTHESIS PROTOCOL:
The canonical entry point is the $workflow-research skill — it dispatches to one of four synthesis sequences via --output={synthesis|business-eval|marketing|course}. The Sequence below is the DEFAULT (--output=synthesis); for the other three intents keep the shared research scaffold (web-research → deep-research → … → knowledge-review → workflow-end) and swap ONLY the terminal synthesis skill(s) per the OUTPUT DISPATCH table.

OUTPUT DISPATCH (select by intent BEFORE creating tasks; default synthesis):
- synthesis (knowledge report): $web-research → $deep-research → $knowledge-synthesis → $knowledge-review → $workflow-end
- business-eval (business/market evaluation): $web-research → $deep-research → $market-analysis → $business-evaluation → $knowledge-review → $workflow-end
- marketing (marketing strategy): $web-research → $deep-research → $market-analysis → $strategy-builder → $knowledge-review → $workflow-end
- course (course material): $web-research → $deep-research → $course-builder → $knowledge-review → $workflow-end

RULES:
- Detect the target artifact from the prompt and pick the matching --output BEFORE creating tasks; if ambiguous, default to synthesis and state the assumption.
- Create the task tracking plan from the SELECTED --output sequence (not the default) when it differs.
- Each step MUST ATTENTION invoke its skill invocation — marking a task completed without skill invocation is a workflow violation.
- Keep claims evidence-based with cited sources; confidence >80% to assert.
- This workflow produces research artifacts only — no code implementation.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### review-changes — Review Current Changes
- Description: Review uncommitted changes, plan and fix issues, then re-review recursively until clean
- When To Use: User wants to review current uncommitted, staged, or unstaged changes before committing
- When Not To Use: PR reviews, codebase reviews, branch comparisons
- Sequence: `review-changes -> why-review -> [parallel ⇉ all-return barrier: review-architecture, review-domain-entities*, performance-review, integration-test-review, security-review] -> code-simplifier -> plan -> plan-review -> cook -> review-changes -> docs-update -> workflow-end -> watzup`
- Parallel phase = all-return barrier: spawn ALL members together (one message); advance only after EVERY member returns (a skipped conditional member, marked `*`, counts as returned). A sub-agent completion advances the step identically to an inline call.

Protocol:
```text
PRE-COMMIT REVIEW (RECURSIVE):

[BLOCKING] SEQUENCING RULE — review-changes (step 1) MUST run FIRST and complete before any other reviewer; why-review (step 2) runs immediately after to validate those findings before the parallel batch.
- Step 1 (`review-changes`) establishes the baseline: surface analysis (BE/FE/SCSS file counts), review mode (DIMENSIONAL/BE-ONLY/FE-ONLY/FE-SPLIT/TOOLING), integration test sync gaps, multilingual translation gaps. The parallel batch depends on this baseline summary.
- Step 2 (`why-review`) is a FINDINGS-VALIDATION gate: it sanity-checks the review-changes findings (each finding warranted, evidence-backed, not a false positive) BEFORE expensive parallel reviewers run. It validates findings only — NOT the fix plan (`plan-review` at step 10 reviews the fix plan's design). If step 1 found zero issues, step 2 passes through with nothing to validate.
- The PARALLEL BATCH (`review-architecture`, `review-domain-entities`, `performance-review`, `integration-test-review`, `security-review`) MUST be spawned together in a single message via specialized `spawn_agent` tool calls (`architect`, `code-reviewer`, `performance-optimizer`, `integration-tester`, `security-auditor`). They are read-only and independent — no shared mutable state, no ordering dependency between them.
- The UI/frontend quality gate (`$review-ui`) is NOT a separate workflow step — it is owned by `review-changes` (step 1), which invokes it internally (ui-ux-designer sub-agent) as its UI dimension whenever the diff contains files matching the project's configured frontend/UI file patterns. Skip entirely when no frontend files changed.
- `review-domain-entities` is a CONDITIONAL member of the batch: include it ONLY when domain entity files changed. Skip it entirely (do not spawn it) when its trigger files are absent.
- NEVER start the batch before steps 1 and 2 complete. NEVER serialize the batch (burns 50K+ tokens absorbing inline reports). NEVER start `code-simplifier` until ALL spawned sub-agents return — code-simplifier modifies code and must operate on the consolidated review snapshot.
- After the parallel batch returns: TaskUpdate the batch steps to completed, read all sub-agent reports, synthesize Critical/High/Medium/Low findings into a consolidation summary, then proceed to `code-simplifier` sequentially.

- Review all staged and unstaged changes
- Check for: security issues, debug artifacts (console.log, debugger), incomplete code, style violations
- Verify no sensitive files (.env, credentials) are staged
- Check architecture compliance, naming, patterns
- DOMAIN ENTITY REVIEW: If domain entity files in changeset (Domain/, Entities/, ValueObjects/ directories), run $review-domain-entities to check DDD quality (anemic model, VO immutability, invariant enforcement). Skip entirely if no entity files changed.
- UI/FRONTEND REVIEW: Owned by step 1 (`review-changes`). When the changeset contains files matching the project's configured frontend/UI file patterns, `review-changes` invokes $review-ui internally (ui-ux-designer sub-agent) as its UI dimension to check long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-vs-fixed sizing (prefer min/max + flex-grow over fixed px), z-index scale discipline (no raw numbers, no !important), and SCSS/BEM quality. Not a separate workflow step. Skip entirely if no frontend files changed.
- Report findings with file:line references
- Output: PASS (safe to commit) or ISSUES FOUND (with list)
- If ISSUES FOUND: validate findings, plan fixes for validated findings, review and sanity-check the fix plan, implement fixes, then re-run review-changes (step 12)
- RECURSIVE (CONDITIONAL, INLINE): Step 12 re-runs `review-changes` INLINE in the main session — but ONLY if `cook` actually changed files. If `cook` applied no file changes, skip step 12 and go straight to docs-update. When it runs, loop plan -> cook -> review-changes until one complete review pass has zero findings; stop only when the same validated blocker repeats 3 full invocations with no progress.
- LOGIC REVIEW: Verify changes match their stated intention. Trace business logic paths. Clean code can be wrong code.
- BUG DETECTION: Check for null safety, boundary conditions, resource leaks, concurrency issues per bug-detection-protocol.
- TEST SPEC VERIFICATION: Cross-reference changes against TC-{FEATURE}-{NNN} test specifications. Flag untested code paths.
- INTEGRATION TEST SYNC: Identify changed business logic files (handlers, services, controllers, commands, queries, resolvers — infer from project conventions). For each, verify a corresponding test file exists. If missing, surface to user via ask the user directly — mandatory, not advisory.
- MULTILINGUAL UI SYNC CHECK: If UI-facing files changed and project localization is multilingual (`localization.enabled` + `supportedLocales.length > 1`), verify translation file updates. If missing, surface via ask the user directly — mandatory, not advisory.
- DOC SYNC DEFERRAL: DO NOT update Feature Specs or test spec TCs during review steps. The dedicated docs-update step handles all of this: $feature-spec (§1-7 Feature Spec) + $spec-tests (§8 test spec update) + $spec-tests [direction=sync] (§8 TCs ↔ test code) + optional $spec-index [mode=index] (derived bucket INDEX/ERD refresh). TEST SPEC VERIFICATION above is READ-ONLY cross-reference only — flag gaps, do not write.
MANDATORY REVIEW-CHANGES GATES:
- SPEC/TDD/TEST THREE-WAY SYNC is blocking: changed behavior must match specs + TCs + test code.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-transition changes, verify persisted-state assertions and invalid-transition rejection tests.
- Missing or stale docs/tests are blocking findings; route fixes through $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### spec-driven-dev — Spec-Driven Development
- Description: Unified spec-driven development — authors and maintains ONE canonical artifact per capability: the tech-free 8-section Feature Spec at docs/specs/{Bucket}/README.{Feature}.md (code is the technical source of truth; derived bucket INDEX/ERD are regenerable aids). Modes: init-full (zero → Feature Specs), update (incremental sync from code changes), audit (staleness check).
- When To Use: Initial Feature Spec generation from zero docs, maintaining spec sync after code changes, quarterly spec health audits, before tech migrations, after major features land — authors + three-way-syncs the canonical Feature Spec. Use spec-index instead when only regenerating derived indexes/ERDs.
- When Not To Use: Understanding one specific feature (use $investigate skill), authoring/updating a single Feature Spec (use feature-spec directly), regenerating only the derived bucket index/ERD (use spec-index directly)
- Sequence: `scout -> plan -> plan-review -> plan-validate -> feature-spec -> spec-tests -> review-artifact --type=spec-tests -> review-artifact -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SPEC-DRIVEN-DEV PROTOCOL:
Modes: init-full | update | audit.
Step 0: auto-detect mode, map changed services → App Bucket, confirm capability name(s).
Scale gate: 4+ capabilities = MUST spawn one feature-spec sub-agent per capability in ONE message.
ONE canonical artifact: docs/specs/{Bucket}/README.{Feature}.md (tech-free 8-section Feature Spec; §5 holds the Mermaid ERD INLINE). No separate A-E engineering tree — code is the technical source of truth. Derived bucket INDEX.md/ERD are optional regenerable aids (spec-index mode=index).
Update mode: git diff → impact map → feature-spec update (§1-7) → spec-tests update (§8) → review-artifact --type=spec-tests → spec-tests sync (§8 ↔ test code) → optional spec-index index refresh.
New PBI/requirement update mode: run dor-gate when a new/changed PBI is being made implementation-ready; run pbi-mockup only for UI/user-journey changes.
Audit mode: compare Feature Spec git-history timestamps vs source-code git log → staleness reports.
See .claude/skills/workflow-spec-driven-dev/SKILL.md for full protocol.
MANDATORY SPEC-DRIVEN SYNC GATES:
- Three-way sync contract (Feature Spec §1-7 ↔ §8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
- Run docs-update as a near-final sync before workflow-end; watzup runs after workflow-end for every mode to keep Feature Specs and derived indexes aligned.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### spec-index — Spec Discovery
- Description: Regenerate DERIVED navigation aids — a per-bucket feature INDEX, cross-capability ERD, or reimplementation guide — assembled FROM the canonical tech-free 8-section Feature Specs under docs/specs/. The Feature Specs stay the single source of truth; this never extracts a separate per-module A-E engineering tree (retired 2026-06-10).
- When To Use: Regenerating a per-bucket feature INDEX.md after Feature Specs changed, assembling a cross-capability ERD from the §5 domain-model blocks, producing a reimplementation/build-order guide for a rebuild, or auditing which derived aids have gone stale against their source Feature Specs — derived INDEX/ERD regeneration ONLY (never authors canonical spec content). Authoring or syncing canonical spec content → use spec-driven-dev.
- When Not To Use: Authoring or fixing the canonical business content of a capability (use feature-spec — Feature Specs are the source of truth, this only derives aids over them), syncing §8 test specs to test code (use spec-tests), reverse-engineering specs from a brand-new external codebase with no docs/specs/ tree yet (author Feature Specs via feature-spec first), refactoring or optimizing code (use refactor or $performance-review skill)
- Sequence: `scout -> spec-index -> review-changes -> review-artifact -> workflow-end -> watzup`

Protocol:
```text
SPEC DISCOVERY PROTOCOL (DERIVED-AID GENERATOR — repurposed v4.0.0):
Generates regenerable navigation aids — a per-bucket feature INDEX, a cross-capability ERD, or a reimplementation guide — assembled FROM the canonical tech-free 8-section Feature Specs matching docs/specs/{Bucket}/README.*.md. The Feature Specs are the SINGLE source of truth; this workflow only assembles regenerable aids over them. It does NOT reverse-engineer a parallel spec layer.

[RETIRED — MUST NOT RECREATE] The prior per-module A-E engineering bundle (A-domain-model, B-business-rules, C-api-contracts, D-events, E-user-journeys), M## directories, 00-module-registry.md, 01-domain-erd.md, 06-reimplementation-guide.md, docs/specs/README.md, and docs/specs/PRIORITY-INDEX.md were DELETED 2026-06-10. Emitting any of them resurrects the retired tree (the thin-index-only contract: output is DERIVED — never emit A-E bundle files). Canonical authority: docs/project-reference/spec-system-reference.md → 'spec-index — Repurposed'.

MANDATORY IMPORTANT MUST ATTENTION RULES:
1. SCOPE GATE FIRST: use ask the user directly to confirm Bucket(s) (one / several / all of docs/specs/), Mode (index | audit), and Artifacts (INDEX.md / cross-capability ERD / reimplementation guide). Default = index, INDEX.md only.
2. If the target bucket has NO Feature Specs matching docs/specs/{Bucket}/README.*.md, STOP and route to $feature-spec — there is nothing to derive from. NEVER fabricate a spec to index.
3. Output is DERIVED and regenerable — every generated file carries a '> DERIVED — regenerate via $spec-index; do NOT hand-edit' banner. It is NEVER a second source of truth.
4. §1-7 of a Feature Spec are tech-free; the derived INDEX and ERD inherit that tech-free stance. The reimplementation guide is the SOLE derived artifact allowed to name a target rebuild stack (spec-principles.md §3 rebuild-guide exception).
5. Every catalog row / ERD entity links back to its source Feature Spec; mark [UNVERIFIED] rather than guessing. Read docs/project-reference/spec-principles.md §3 (tech-agnostic + banned-token list) before writing any prose.
6. App Bucket mapping: resolve service→bucket assignments from docs/project-reference/spec-system-reference.md → 'App Bucket Mapping' (single canonical table; do not inline it here).

WORKFLOW EXECUTION:

STEP 1 — READ SOURCE FEATURE SPECS:
  Glob docs/specs/{Bucket}/README.*.md → enumerate canonical specs. Per spec extract ONLY: capability name + file link · summary (first sentence of §1 Overview) · feature code + TC count + status mix (§8 Test Specifications) · entities + relationships (§5 Domain Model mermaid block, for ERD assembly). Do NOT re-derive business rules / API contracts / events into new files — they live in §1-7 and in code. You are indexing, not extracting. (Optional: parallel reader sub-agents, one per spec — an optimization, not a gate.)

STEP 2 — ASSEMBLE DERIVED AIDS:
  2a INDEX.md (default): regenerate docs/specs/{Bucket}/INDEX.md as a feature catalog (columns: Capability link | Summary | Feature Code | TCs | Status) with the DERIVED banner. feature-spec maintains the SAME file — keep the schema identical so the two never diverge.
  2b Cross-capability ERD (on request): merge every spec's §5 mermaid erDiagram into one; dedupe entities by name; keep cross-capability relationships; ERD stays tech-free (entity + relationship names only). Write docs/specs/{Bucket}/{Bucket}.erd.md with the DERIVED banner. Do NOT name it 01-domain-erd.md (retired).
  2c Reimplementation guide (explicit request only): build-order narrative (capability dependency order, integration touchpoints, suggested rebuild sequence). The ONLY derived artifact permitted to name a target stack. Write docs/specs/{Bucket}/{Bucket}.reimplementation-guide.md with the DERIVED banner. Do NOT name it 06-reimplementation-guide.md (retired).

AUDIT MODE (Mode=audit): do NOT regenerate — compare each derived aid's age against its source Feature Specs (mtime/git) and emit a stale-list report (which aids lag their specs). No writes beyond the report.

HARD PROHIBITIONS: MUST NOT emit M## dirs, A-E files, 00-module-registry.md, 01-domain-erd.md, 06-reimplementation-guide.md, docs/specs/README.md, or docs/specs/PRIORITY-INDEX.md. MUST NOT populate a parallel spec layer. MUST NOT put a tech stack name in §1-7-derived output (INDEX/ERD) — only the reimplementation guide may.

HANDOFF at workflow-end:
  Present: derived aids regenerated (which buckets, which artifacts), and any [UNVERIFIED] / stale entries.
  Recommend: $feature-spec (author or fix a source Feature Spec), $spec-tests (sync §8 ↔ test code).
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### spec-sync — Spec Sync (Post-Change)
- Description: Update test specs and feature docs after code changes, bug fixes, or PR reviews
- When To Use: After fixing a bug update test specs, after code changes update test specs, after PR review update test specs, sync test specs after changes, update test documentation after implementation
- When Not To Use: New feature implementation (use feature), no code changes yet, idea refinement
- Sequence: `workflow-review-changes -> spec-tests -> why-review -> review-artifact --type=spec-tests -> spec-tests [direction=sync] -> integration-test -> integration-test-review -> integration-test-verify -> test -> docs-update -> workflow-end`

Protocol:
```text
TEST SPEC UPDATE WORKFLOW:
Use after code changes, bug fixes, or PR reviews to keep test specs in sync.
1. Review what changed (git diff or PR diff)
2. Update test specs in the Feature Spec §8 (Test Specifications) using $spec-tests update mode — §8 is the canonical in-place home; there is no separate dashboard (retired 2026-06-10)
3. Sync §8 ↔ integration test code via $spec-tests [direction=sync] (forward: §8 TCs → test code)
4. Generate/update integration tests for changed TCs
5. Run tests to verify

Key: $spec-tests uses UPDATE mode — diffs existing TCs against current code, adds regression TCs for bugfixes.
MANDATORY TEST-SPEC UPDATE GATES:
- Treat spec docs + Section 8 as intent/invariant source; do not encode buggy behavior as expected.
- Three-way sync contract (§8 TCs ↔ test code, including the STATE MACHINE DATA ASSERT mandate for affected lifecycle transitions) is canonical in docs/project-reference/spec-system-reference.md → Three-Way Sync Triad — follow it exactly.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### spec-to-pbi — Spec to PBI Backlog
- Description: Generate a complete, dependency-aware PBI backlog from existing canonical Feature Specs (docs/specs/{Bucket}/). Audits spec freshness, decomposes large Feature Specs by capability and feature, creates PBIs/stories/DoR evidence, and produces a ranked backlog.
- When To Use: User wants to create all PBIs from an existing Feature Spec, convert a large Feature Spec into a complete prioritized backlog, generate dependent PBIs from docs/specs, split a very big Feature Spec into sprint-ready PBIs, or produce a ranked implementation order from a bucket of Feature Specs.
- When Not To Use: Raw product vision without any Feature Spec (use product-discovery), one informal idea (use idea-to-pbi), implementation work after PBIs are ready (use feature or big-feature), spec generation/update only (use spec-driven-dev).
- Sequence: `scout -> spec-index -> domain-analysis -> why-review -> plan -> plan-review -> plan-validate -> why-review -> refine -> why-review -> review-artifact --type=pbi -> story -> why-review -> review-artifact --type=story -> pbi-challenge -> dor-gate -> pbi-mockup -> prioritize -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SPEC TO PBI BACKLOG PROTOCOL:
Use when the user has existing canonical Feature Specs at docs/specs/{Bucket}/README.{Feature}.md and wants all implementable PBIs created from them.

MANDATORY RULES:
1. Treat the Feature Specs as canonical input; do not brainstorm unrelated opportunities. Decompose each PBI from spec sections (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 TCs).
2. Run spec-index audit first if a Feature Spec may be stale vs code.
3. Build a capability x feature/operation inventory before creating any PBI.
4. Decompose large Feature Specs into independently deliverable vertical slices. Create explicit shared/foundation PBIs for cross-cutting prerequisites.
5. For each PBI, include acceptance criteria, story points, dependencies, priority, domain impact, spec-tests needs, and DoR status. Carry §4 BR-/§3 US- logical IDs as the primary citation spine.
6. Run domain-analysis when the spec implies new/changed entities, aggregates, invariants, state machines, or cross-service ownership.
7. Run prioritize once at the end across all generated PBIs to produce a dependency-aware ranked backlog.
8. Write artifacts immediately after each capability/feature is processed; never hold all PBIs in memory.
9. Run docs-update after prioritize and before workflow-end so Feature Specs (§8) and derived indexes stay synchronized.

SCALE GATE:
- 1-3 capabilities: process inline with task tracking.
- 4-10 capabilities: split tasks by capability and feature group.
- 10+ capabilities or very large specs: process incrementally by capability group, maintain a coverage matrix, and stop only when every spec feature is mapped to PBI/Shared Task/Out-of-scope.

OUTPUTS:
- team-artifacts/pbis/{date}-pbi-{slug}.md for each PBI.
- team-artifacts/backlog/spec-to-pbi-{date}-backlog.md with rank, dependency graph, priority, and recommended order.
- plans/reports/spec-to-pbi-{date}-{bucket}.md with source spec coverage and unresolved questions.
- docs-update report confirming Feature Specs and derived indexes are synchronized.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### visualize — Visual Diagram
- Description: Create visual Excalidraw diagrams from codebase investigation or web research
- When To Use: User wants to visualize, diagram, draw, or create visual representation of workflows, architectures, concepts, systems, or research findings
- When Not To Use: Text-only documentation, code implementation, bug fixes, non-visual outputs
- Sequence: `scout -> investigate -> excalidraw-diagram -> workflow-end`

Protocol:
```text
VISUAL DIAGRAM PROTOCOL:
This workflow creates Excalidraw diagrams. Two paths based on source:

PATH A — Codebase Visualization (default if topic is about this project):
1. Scout: Find relevant files, architecture, and code patterns
2. Investigate: Trace code paths, understand relationships and data flow
3. Diagram: Generate .excalidraw file visualizing the findings

PATH B — Knowledge Visualization (if topic requires web research):
1. Web Research: Research the topic broadly (max 10 WebSearch)
2. Deep Research: Deep-dive into top sources (max 8 WebFetch)
3. Diagram: Generate .excalidraw file visualizing the synthesized knowledge

GUARDRAILS:
- Ask user which path (A or B) if ambiguous
- Output .excalidraw files to docs/diagrams/ (create dir if needed)
- Use kebab-case filenames describing the diagram subject
- MUST ATTENTION render and validate diagram (render-view-fix loop)
- Read references/color-palette.md and references/element-templates.md before generating
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### workflow-seed-test-data — Seed Test Data
- Description: Generate or enhance test data seeders that simulate QC happy-path scenarios for a feature area. Scouts existing patterns, implements idempotent command-based seeders, reviews compliance, simplifies.
- When To Use: User wants to seed test data, implement data seeders, generate realistic development environment data, add happy-path scenarios for a feature, create dummy data for manual QC testing, fill dev database with realistic test cases
- When Not To Use: Writing integration tests (use write-integration-test), production data migration (use $db-migrate skill), seeding reference/config data without domain commands
- Sequence: `scout -> investigate -> seed-test-data -> review-changes -> code-simplifier -> docs-update -> workflow-end -> watzup`

Protocol:
```text
SEED TEST DATA PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → 'Data Seeders' context group for project-specific seeder base class, file location, config keys, and DI registration pattern. Then read docs/project-reference/seed-test-data-reference.md for the complete project-specific implementation guide.

UNIVERSAL RULES (apply to ALL projects):
1. Environment gate FIRST — development or config-enabled only. NEVER production.
2. Command-based ONLY — call application-layer commands. NEVER direct DB/repo for domain entities. Seeder = QC orchestrator.
3. No duplicate logic — commands own validation + domain rules; seeder provides valid inputs.
4. Idempotency — check existing count BEFORE seeding; seed only remaining = target - existing.
5. Count-configurable — read count from project config key (see project-config.json). Loop from existing to target.
6. Restart-safe — idempotency inherently handles restarts.

PROJECT-SPECIFIC CONTEXT:
- Read docs/project-config.json → 'Data Seeders' rules for environment gate key, count key, and DI registration.
- Read docs/project-reference/seed-test-data-reference.md for implementation template, reference files, and project-specific DI scope rules.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

### write-integration-test — Write Integration Tests
- Description: Write or update integration tests for existing code — spec-first: investigate domain logic → write/update specs → generate test code → 7-gate review (incl. change coverage) → run and verify
- When To Use: Write integration tests for a specific command/handler, add test coverage to an untested feature, update integration tests after code changes, integration test authoring from scratch for a feature area, cover uncommitted code changes with integration tests, generate integration tests from existing test specs or feature docs, review/audit existing integration tests for quality, flakiness, traceability, or failures
- When Not To Use: No implementation yet (use feature or bugfix), spec-only with no code generation (use $spec-tests skill directly)
- Sequence: `scout -> investigate -> spec-tests -> why-review -> review-artifact --type=spec-tests -> integration-test -> integration-test-review -> integration-test-verify -> spec-tests [direction=sync] -> docs-update -> workflow-end -> watzup`

Protocol:
```text
WRITE INTEGRATION TEST PROTOCOL:
⚠️ PROJECT CONTEXT: Read docs/project-config.json → framework.integrationTestDoc for project-specific test patterns, helper classes, and async wait conventions.
⚠️ MANDATORY: Understand domain logic BEFORE writing assertions
1. Scout: Find target command/handler files; locate existing integration tests in same service for pattern matching
2. Investigate: Read the handler/entity/event source — understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. This is the prerequisite for correct assertions.
3. TDD Spec: Write/update test specs in feature doc Section 8 (TC-{FEATURE}-{NNN} codes). Path: docs/specs/{Bucket}/README.{Feature}.md. CREATE mode for new tests, UPDATE mode for changed behavior.
4. TDD Spec Review: Validate spec coverage — GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths, no duplicate TC codes
5. Integration Test: Generate test files from TC specs. FROM-PROMPT for specific target, FROM-CHANGES for git diff.
   RULES (project-specific patterns from docs/project-config.json → framework.integrationTestDoc):
   - NO smoke-only tests (no-exception alone is FORBIDDEN)
   - ALL DB assertions wrapped in project async-wait helper
   - ALL string data uses project unique-data helper
   - Each test method has TC spec annotation linking to TC-{FEATURE}-{NNN}
   - Minimum 3 tests per command: happy path + validation failure + DB state check
6. Integration Test Review: 7-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage). Gate 7: every behavior-changing production file in the change set maps to a covering test (integration-first; unit fallback needs justification) AND a spec TC. Validate findings, fix only validated issues, then restart the full integration-test review after fixes. NEVER proceed with CRITICAL/HIGH issues outstanding.
7. Integration Test Verify: Run tests via quickRunCommand from docs/project-config.json → integrationTestVerify. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
8. Test Specs Docs: Sync cross-module spec dashboard. Update IntegrationTest fields with {File}::{MethodName} traceability links.
9. Docs Update: Update feature doc evidence fields and version history if test coverage changed materially.
10. Summary report

GUARDRAIL: Read handler source BEFORE writing any assertions. Use project async-wait helper for all DB assertions — no exceptions.
MANDATORY WRITE-INTEGRATION-TEST GATES:
- Read docs/project-reference/spec-principles.md before $spec-tests and keep invariant language explicit in TCs.
- STATE MACHINE DATA ASSERT (MOST IMPORTANT MANDATORY ASSERT): for lifecycle/state-machine behavior, generated integration tests MUST assert persisted state transitions and invalid-transition rejection.
- Maintain three-way sync before $workflow-end: spec docs ↔ TDD docs ↔ test code via $spec-tests + $review-artifact --type=spec-tests + $integration-test + $integration-test-review + $integration-test-verify + $spec-tests [direction=sync] + $docs-update.
UNIVERSAL RULES:
- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.
```

<!-- WORKFLOWS:END -->
