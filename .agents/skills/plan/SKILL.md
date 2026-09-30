---
name: plan
description: '[Planning] Use when a workflow step or the user asks for a concise implementation plan. Captures technical decisions, affected areas, execution-time discovery, risks, and final quality gates without pre-implementing the change. Flag: --mode={ci|cro}.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Produce a concise, evidence-backed implementation plan that fixes direction and proof while leaving code-level discovery and mechanics to the executing agent.

**Summary:**

- PLANNING ONLY. Record important decisions, affected owners/areas, dependency order, risks, discovery obligations, and final quality gates; do not write code or method-by-method instructions.
- Keep one `plan.md` by default. Add phase files only when independent execution, context isolation, or disjoint parallel ownership genuinely needs them.
- Never invoke `plan-review` or another review skill. Standalone only: after saving the plan, ask once whether the user wants `plan-review`. Workflow invocation: return the artifact and let the parent advance without a next-step prompt.
- Tests are authored with implementation but executed only after all implementation and static review. Never schedule per-phase test or review runs.

**Workflow:** Resolve context → inspect governing evidence and representative patterns → settle material decisions → write the lean plan → self-check scope, discovery, and verify-last order → hand back.

**Key Rules:**

- A plan says what must be true, why, where to investigate, and how completion is proved—not every edit.
- Cite evidence for known repository facts. Mark future implementation evidence as an obligation, never fabricate paths, symbols, or line numbers.
- Open product intent or irreversible decisions block and go to the user; bounded source discovery belongs in the plan with an owner and stop condition.

## Invocation Context

Determine once before writing:

- **Workflow invocation:** a matching active workflow task exists or the caller identifies this as a workflow step. Finish by returning the plan path and concise summary. Do not ask about review, execution, or other next steps.
- **Standalone invocation:** no parent workflow owns progression. Finish by asking exactly one optional question: `Run plan-review on this plan?` Do not call it automatically, and do not bundle other next-step choices into that question.

`--mode=ci` reads `references/mode-ci.md`; `--mode=cro` reads `references/mode-cro.md`. A mode adds domain intake only; it does not add review or change this contract.

## Evidence and Discovery

1. Resolve and read the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`; the plan must map its outcome and final proof to the saved required criteria.
2. Resolve the configured plans root, spec profile, project references, commands, and mirror/generated surfaces from `docs/project-config.json` when present.
3. Read the task-relevant reference docs and governing spec/decision artifacts. For code-bearing work, inspect the target plus three comparable local patterns when available; record scarcity instead of inventing examples.
4. Trace affected owners and consumers. Use the code graph when present; for service/event systems, check producers, consumers, orchestration, and shared contracts.
5. Separate facts from execution-time discovery:
   - **Known now:** cite `file:line`, config key, spec section, or command.
   - **Discover during execution:** name the bounded question, source/owner to inspect, why it matters, and stop/escalation condition.
6. Ask the user only for a decision that changes product intent, public contract, irreversible data/architecture choice, or materially changes scope. Do not ask the user to supply mechanics the executor can discover safely.

Use direct repository inspection for focused work. Add research agents or external research only when distinct unknowns justify their context cost.

## Plan Artifact Contract

Write `plan.md` under the configured plans root. Use this compact shape; omit a section only with a stated `N/A` reason.

### 1. Outcome and boundaries

- Desired observable outcome and governing intent/spec.
- In scope, non-goals, assumptions, and compatibility/rollback boundary.

### 2. Important technical decisions

For each decision: choice · rationale · meaningful alternative · sacrifice/trade-off · reversibility · owning contract/module. Keep only decisions that constrain execution or future change cost.

### 3. Areas and owners to touch

Name affected modules, contracts, data/state, tests, specs/docs, generated mirrors, and external boundaries with why each is involved. List exact files only when evidence establishes them; representative paths are enough for an area whose exact edit sites must be discovered.

### 4. Execution phases

Use the fewest phases that express real dependency or ownership boundaries. Each phase contains:

- **Objective and boundary** — outcome, inclusions, non-goals.
- **Decisions already fixed** — constraints the executor must preserve.
- **Areas/owners** — known paths or modules and responsible contract.
- **Discovery before edit** — bounded source questions, evidence to inspect, stop condition.
- **Implementation output** — artifact/behavior produced, not a recipe of code edits.
- **Acceptance/quality gate** — observable evidence and invariant/test owner.
- **Dependency metadata** — `PAR` with a disjoint write set, or `SEQ` with the exact dependency. Untagged phases execute sequentially.

Do not decompose into line edits, symbol-by-symbol instructions, ≤30-minute tasks, per-file pseudo-implementation, or recursive sub-plans. Split only for a real dependency, independently verifiable outcome, or disjoint write ownership.

### 5. Quality gates and final verification

- Map every changed behavior/invariant to its canonical case/test owner under the resolved `specArtifacts` profile. Cite an existing assertion when known; otherwise state the test obligation and expected observable.
- Author tests during the implementation phase that changes the behavior.
- After every implementation phase: run static/type/compile checks only when useful; no test suite, mutation run, or review.
- After all implementation: run one whole-change static review with tests deferred; fix validated findings.
- Then run the full affected test suite once plus required mutation/red proof. A failure follows fault adjudication and may trigger focused reruns/full rerun; this is recovery, not a planned intermediate test phase.
- Reconcile specs, tests, code, docs, and generated mirrors before completion; if a review fix changes any of them, repeat only the invalidated reconciliation before final verification.

### 6. Risks and execution concerns

Record material risks, security/data/platform/operational concerns, migration or rollback needs, cross-boundary compatibility, and what would force replanning. Include the next plausible change and expected edit sites, the 10× growth concern, and the named test that should fail when each protected rule breaks.

### 7. Execution waves

List phase waves only when `PAR` phases have proven disjoint write sets. Otherwise state `Sequential — dependencies or shared writes require it.` Parallelism is metadata-gated; never infer it later from an untagged plan.

## Scope-Specific Gates

- **Bugfix:** include a preservation inventory for the affected invariants and prove the correction owner, not merely the failure site.
- **New dependency/technology:** compare viable existing/project-native options first; surface material lock-in or operational trade-offs to the user. Do not turn ordinary library selection into a research project.
- **Domain entity/value object/aggregate:** state actual invariant ownership, boundary, construction, concurrency, events, and test obligation when the project uses those concepts; otherwise record the DDD-specific gate N/A.
- **User-facing UI:** apply the configured UX/design authority and bind relevant states/accessibility criteria to acceptance evidence; do not redesign settled project conventions.
- **AI surface?** Only if a phase creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-feature-framing-gate.md`, give that phase an `## AI Feature Gate` section and apply it; otherwise skip this line.
- **Framework/mirror work:** name canonical owners and the generated sync/verify action.
- **Supplied spec:** preserve the supplied baseline. Put proposed behavior outside it under `Proposed additions — owner approval required`; never silently plan it as accepted scope.

## Self-Check Before Handoff

- **Plan, not implementation:** could an executor choose local mechanics without contradicting the plan?
- **Decision completeness:** are product/public-contract/irreversible choices settled or explicitly blocked?
- **Discovery completeness:** does every unknown have a bounded source, owner, and stop condition?
- **Area coverage:** are code, tests, spec/docs, data/contracts, consumers, and mirrors included when applicable?
- **Verify-last:** are tests run only after all implementation and static review?
- **Efficiency:** remove repeated rationale, exhaustive inventories, generic advice, and any phase that proves no distinct fact.

Persist the plan path and a short summary. Standalone asks once about optional `plan-review`; workflow invocation returns immediately to its parent.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fix-layer-accountability` — Fix at the component that owns the violated contract, not at the crash site; choosing where to apply a fix → .claude/skills/shared/protocols/fix-layer-accountability.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `plan-granularity` — Outcome phases name decisions, boundaries and bounded discovery without replaying implementation; breaking a plan into phases → .claude/skills/shared/protocols/plan-granularity.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `preservation-inventory` — Table of behavior a bugfix plan must preserve, written before the implementation steps; writing a bugfix plan → .claude/skills/shared/protocols/preservation-inventory.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a concise decision-and-boundary plan that enables safe execution without replaying implementation.

- **MUST ATTENTION** record outcome/non-goals, important decisions, affected owners/areas, bounded discovery, risks, and final quality gates.
- **MUST ATTENTION** resolve the active Goal Contract and map the plan to its saved required criteria.
- **MUST ATTENTION** never invoke `plan-review`; standalone asks once whether the user wants it, workflow invocation returns without next-step prompts.
- **MUST ATTENTION** write tests with implementation and run test suites only after all implementation and static review; never plan per-phase test/review cycles.
- **MUST ATTENTION** one `plan.md` by default; add phases/files only for real dependency, verification, context, or ownership boundaries.
- **MUST ATTENTION** cite known facts and never fabricate future symbols, paths, assertions, or `file:line` evidence.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does it apply to ≥3 contexts (codebases for a universal lesson, everyday tasks here for a project convention)? If not, abstract one level up.
3. Write as a durable rule — a universal lesson strips project-specific names/paths/classes; a project convention states the convention itself, never this session's incident.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Value gate:** is it a project convention or a universal best-practice protocol worth reading on everyday work? Rare AI-agent quirks, one-off incidents and details of the current task → No → skip `$learn`.
6. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
7. **Auto-fix gate:** "Could `$code-quality-review`/`$code-simplifier`/`$security-audit`/a linter catch this?" — Yes → improve review skill instead.
8. ALL three gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Core engineering principles:** Every plan, implementation and review must lower future change cost. **Easy to change** — reuse before writing, one owner per rule, purpose-named interfaces/adapters at volatile boundaries. **Easy to scale** — extend by addition with bounded growth, sized to the project's real profile. **Easy to maintain** — intent-named tests that fail when a behavior breaks, mechanical harness green. Before done, answer: next change → how many edit sites? 10× → what breaks? which test goes red? (`SYNC:core-engineering-principles`).
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
