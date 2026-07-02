---
name: architecture-scalability-review
description: '[Architecture] Use when grading project architecture and scalability quality for greenfield init or brownfield audit: build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery.'
---

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
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Grade a project or planned architecture against the full architecture and scalability quality scorecard, while routing deep checks to the existing owner skills instead of duplicating them.

**Main steps (run in order):** (1) Resolve `mode=init` or `mode=audit` and target scope. (2) Load project context and evidence. (3) Read `references/scorecard.md`. (4) Score all 10 areas 0-2 with evidence. (5) Run pass/fail gates. (6) Emit an architecture scalability review report under `plans/reports/`.

**Key rules:**

- Every score needs `file:line`, command output, architecture artifact evidence, or an explicit `N/A - reason`; unproven criteria score `0`.
- This skill is the scorecard owner, not the deep owner for every concern. Route depth to sibling skills named in the ownership matrix.
- New Tech/Lib: N/A by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or any other tool, present the recommendation for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning. `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## When To Use

- During greenfield or project-init flow after `architecture-design`, before implementation planning hardens decisions.
- On demand against an existing repository when the user asks to review project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- As a periodic architecture health check for a growing codebase.

Do not use this as the every-change diff reviewer. Per-change regression checks belong in `architecture-review`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `$architecture-review-full` (or `$start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation exists. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.

Use `planned` evidence labels when implementation is not yet present. Score `2` only when the plan names enforceable mechanisms, not only intent.

### `mode=audit`

Score an existing repository. Evidence must come from source files, build config, CI config, ADRs, reference docs, tests, dependency-boundary tooling, deployment/IaC files, and graph/grep commands.

If `.code-graph/graph.db` exists, run at least one graph command on key architecture files before concluding.

## Required Context

Read these before scoring:

- `docs/project-config.json`
- `docs/project-reference/docs-index-reference.md`
- `docs/project-reference/lessons.md`
- `docs/project-reference/project-structure-reference.md`
- Relevant stack docs from the docs index, based on target scope
- Accepted ADRs under `docs/adr/**`, when present
- Existing architecture, domain, CI, deployment, and observability artifacts in the target plan or repo

## Ownership Matrix

| Area | Cadence | This skill owns | Route depth to |
| --- | --- | --- | --- |
| Build & CI Scalability | init / audit | Score incremental builds, affected-only detection, cache strategy, parallel test/build strategy, monorepo quality gate posture | `linter-setup` for quality gates; `scaffold` for project foundation |
| Architecture Pattern / distributed-monolith | init / audit + every-change smell | Score modular monolith vs microservices fit and distributed-monolith risk | `architecture-design` for design choices; `architecture-review` for diff-level boundary drift |
| Module Isolation | init / audit + every-change boundary drift | Score bounded-context isolation and independent build/test/deploy expectations | `domain-analysis`, `architecture-review` |
| Dependency Discipline | init / audit + every-change | Score explicit dependency directions and enforcement mechanisms | `architecture-review`, `linter-setup` |
| Loose Coupling | init / audit + every-change | Score event-driven ownership and absence of avoidable sync coupling | `domain-analysis`, `architecture-review` |
| Horizontal Scaling | init / audit + local hot-path review | Score system-level statelessness, load balancing, caching, async, partitioning, autoscaling, SPOF, latency/throughput limits | `performance-review`, `production-readiness-review` |
| DRY | init / audit + every-change duplication drift | Score strategic shared-platform, monorepo/shared-lib, and duplicated-knowledge posture | `architecture-review`, `scaffold` |
| Abstraction / Easy-to-Change | init / audit + every-change conformance | Score swappable technical concerns, stable contracts, and interface boundaries where they reduce future change cost | `architecture-design`, `architecture-review`, `scaffold` |
| Clean Architecture | init / audit + every-change | Score dependency-rule fit, business logic placement, and architecture style enforcement | `architecture-review`, `scaffold` |
| Observability & Delivery | init / audit + production readiness | Score monitoring, logging, metrics, DevOps/deployment, CI/CD, IaC, rollback posture | `production-readiness-review`, `linter-setup` |

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence. Do not expand into the sibling's full checklist.

## Workflow

### Step 1: Resolve Mode And Scope

Determine:

- Mode: `mode=init` or `mode=audit`
- Target: current repo, plan directory, specific service/module, or architecture artifact set
- Evidence roots: source paths, CI/build files, ADRs, reference docs, workflow outputs
- Report slug: project/module name

If mode is missing, infer from context:

- Greenfield/project-init/plan artifacts only -> `mode=init`
- Existing repo/source/config review -> `mode=audit`

### Step 2: Gather Evidence

Use narrow grep/glob searches first. For brownfield audits, collect at least:

- Build files and CI pipeline config
- Workspace/monorepo config, if present
- Dependency-boundary or architecture-rule tooling
- Module/service folder structure
- Message bus, event, API, and cross-context communication patterns
- Deployment, IaC, observability, and runtime config
- ADRs and architecture reports

Run graph trace on key architecture or module-boundary files when `.code-graph/graph.db` exists. If the graph lacks relevant files, record that limitation and continue with grep/file evidence.

### Step 3: Score The 10 Areas

Read `references/scorecard.md` and score each area:

- `0` = absent, contradicted, or unproven
- `1` = partially addressed, documented but weakly enforced, or implemented in only some areas
- `2` = designed and enforced with evidence

Total score: `/20`.

| Total | Verdict | Meaning |
| ---: | --- | --- |
| 17-20 | STRONG | Architecture/scalability posture is credible; address any non-blocking gaps. |
| 11-16 | NEEDS WORK | Material gaps exist; plan follow-up before growth or high-scale use. |
| 0-10 | HIGH RISK | Architecture/setup quality is not yet safe for scale; fix gates before major delivery. |

### Step 4: Run Pass/Fail Gates

Run these gates after scoring. Gates are pass/fail overlays and do not change the `/20` math.

| Gate | Blocks STRONG when failing | Check |
| --- | --- | --- |
| G1 Evidence Integrity | yes | Any `2` score without evidence is downgraded; repeated unproven claims fail the gate. |
| G2 Build & CI Scalability | yes for init/audit scope with multi-module growth | Incremental/affected-only/caching strategy exists or a clear N/A rationale is documented. |
| G3 Distributed-Monolith Risk | yes | Chosen architecture avoids service/module split with shared DB, circular sync calls, or deploy-together-only coupling disguised as distribution. |
| G4 Boundary Enforcement | yes | Dependency direction and module boundaries are explicit and enforceable. |
| G5 Horizontal Scaling Bottlenecks | yes for high-scale target | Statelessness, bottlenecks, SPOF, resource ceilings, and async/back-pressure posture are known and owned. |
| G6 Reuse Without Coupling | no | Shared libraries/platform code reduce duplicated knowledge without leaking consumer domain concepts. |
| G7 Secrets And Sensitive Output | yes | Audit report redacts credentials and does not expose secrets found during inspection. |

Critical/high gate failures require an owner-accepted risk or follow-up plan before reporting STRONG.

### Step 5: Emit Report

Write:

`plans/reports/architecture-scalability-review-{YYMMDD}-{HHmm}-{slug}.md`

Report structure:

```markdown
# Architecture Scalability Review

**Mode:** init | audit
**Scope:** {project/module/artifacts}
**Date:** {date}
**Score:** {X}/20
**Verdict:** STRONG | NEEDS WORK | HIGH RISK

## Scorecard

| # | Area | Score | Evidence | Route / Owner |
| - | ---- | ----: | -------- | ------------- |

## Pass/Fail Gates

| Gate | Status | Evidence | Required follow-up |
| ---- | ------ | -------- | ------------------ |

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| ---- | ------------------- | ----------------- | --------- |

## Findings

### Critical / High
### Medium / Low

## New Tech/Lib Recommendations

List only user-confirmed recommendations or mark `N/A`.
```

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
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
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
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
- **Test failure → adjudicate WHO is at fault (source vs test) before forcing green.** A green-again suite is not the goal; the correct verdict on what was actually wrong is. Root-cause first, then triangulate the failure against the governing spec (`docs/specs/**` if one exists) AND the source: SOURCE-WRONG → fix code at the owning layer and keep/strengthen the test; TEST-WRONG → fix the stale assertion/setup at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green, and never change source to satisfy a broken test. Spec silent or ambiguous about which side is correct → STOP and ask the user.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
