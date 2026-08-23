---
name: product-roadmap
description: '[Planning] Use only when the user explicitly requests a product roadmap deliverable, roadmap update, or milestone selection; handles outcome milestones, MVP scope, non-goals, risks, human decisions, and evidence gates.'
disable-model-invocation: true
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute phases in order; update task tracking before and after each phase.
> **[BLOCKING]** Every completed or skipped phase needs concise evidence or a reason.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** When explicitly requested, turn a product vision into an approved, outcome-based roadmap and one selected milestone—or route a genuinely isolated change through an explicit EXEMPT boundary—without making the roadmap artifact a prerequisite for ordinary idea, PBI, spec, presentation, or mock-up work.

**Summary:**

- Detect create/update/select/exempt only after confirming that the user explicitly requested this standalone skill. Read the shared contract and existing roadmap before writing. A large or ambiguous idea alone is not an invocation; its decomposition belongs in the owning PBI/spec/presentation/mock-up artifacts.
- Define the product outcome, actors, business truth, and 3–8 outcome milestones; each milestone names user outcome, risk retired, non-goals, human decisions, dependencies, and evidence.
- Ask the owner to confirm ambiguous terms and select one milestone; write `docs/product-roadmap.md` and a linked `scope-brief.md` incrementally.
- Hand off only an approved milestone, or an explicitly accepted EXEMPT scope, to `$scenario`; implementation planning remains blocked until the applicable Plan Gate is satisfied.
- **Main steps:** explicit-route confirmation → context/contract load → outcome framing → milestone design → owner decision gate → roadmap/scope-brief write → selected milestone or EXEMPT handoff → scenario/Plan Gate.

**Workflow:** 0) route and context → 1) outcome framing → 2) milestone design → 3) decision gate → 4) write roadmap → 5) select milestone/scope brief → 6) handoff.

**Key Rules:**

- Product roadmap answers outcomes and boundaries; it is not a timeline or implementation plan.
- Do not choose frameworks, database schemas, endpoints, screens, or code in this skill.
- Never silently reinterpret `ready`, `published`, `delivered`, `paid`, `refunded`, or equivalent lifecycle terms.
- A roadmap is canonical at `docs/product-roadmap.md`; update it rather than creating competing roadmap files.

## Mission

<request>$ARGUMENTS</request>

## Required Context

**MUST ATTENTION READ** `.claude/skills/shared/product-roadmap-contract.md` and `references/roadmap-template.md` before authoring. Also read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` when present. If project context is stale or missing, use the project's setup route before proceeding.

## Phase 0: Explicit Invocation Gate and Applicability

First confirm that the caller explicitly requested a product-roadmap deliverable or named this standalone skill. If not, STOP this route and return control to the active idea/PBI/spec workflow; do not infer `create`, do not create a scope brief, and do not write `docs/product-roadmap.md`.

For an explicit invocation, classify `$ARGUMENTS` as `create`, `update`, `select`, or `exempt`:

- `create`: no approved roadmap or a new product boundary;
- `update`: roadmap exists but outcome, milestone, risk, or decision changed;
- `select`: roadmap exists and the task needs one milestone scope brief.
- `exempt`: a genuinely isolated brownfield change or bugfix whose product-level scope is unchanged.

Do not infer roadmap-first planning from greenfield, big/ambiguous, broad, or release-scoped wording. Those signals trigger the shared `large_idea_decomposition` contract in their owning workflow. Only the explicit `create|update|select` route writes or updates a product roadmap. For `exempt`, resolve or create the stable scope brief, write the explicit `Roadmap Applicability: EXEMPT` record from the shared contract, and hand off to the existing narrow flow; do not create/update a product roadmap or select a milestone.

## Phase 1: Frame the Product Outcome

Run Phases 1–5 only for `create`, `update`, or `select`. The `exempt` route uses the shared contract's common scope fields and skips product-outcome/milestone authoring.

Read the request and existing product/spec artifacts without selecting technology. Establish:

1. Primary user/owner and the outcome they need.
2. Product boundary and actors outside it.
3. Key hypothesis and the cheapest evidence that could validate it.
4. Business source of truth, critical states, persistence expectation, and ambiguous terms.
5. Risks that make a screen-only breakdown unsafe (data loss, duplicates, wrong status, access leakage, orphaned records, irreversible side effects).

Separate observed evidence, user-provided decisions, and AI hypotheses. Mark unresolved items instead of filling gaps from “reasonable” defaults.

## Phase 2: Design Outcome-Based Milestones

Create 3–8 milestones, ordered by dependency and learning value, not calendar date. For every milestone answer:

| Field | Required question |
| --- | --- |
| User outcome | What can the user accomplish after this milestone? |
| Risk retired | Which product, data, access, lifecycle, or operational risk is reduced? |
| Non-goals | What is explicitly not being built or validated yet? |
| Human decisions | Which terms, policies, ownership, or risk tolerances require approval? |
| Evidence gate | What observable journey/state proves the milestone is complete? |
| Dependencies | Which prior outcome or decision must already hold? |

Use “Pre-MVP Gate” for product truth/ownership/state decisions when needed, and “MVP” only for the smallest release that tests the key hypothesis. Keep later refunds, automation, roles, production handoff, or similar work visible as later milestones or non-goals; do not erase them from the roadmap.

## Phase 3: Decision Gate

Before writing an approved roadmap, use ask the user directly for every material ambiguity. At minimum confirm:

- the product hypothesis and primary owner/customer;
- source-of-truth state and persistence expectation;
- meanings of lifecycle terms that downstream artifacts might interpret differently;
- milestone boundaries, especially what MVP explicitly excludes;
- evidence acceptable for completion and what must be redacted.

Present 2–4 concrete options with a recommendation grounded in the request. Record `confirmed`, `deferred`, or `blocked`; a material `blocked` decision prevents approval.

## Phase 4: Write the Canonical Roadmap

Use `references/roadmap-template.md`. Create or update `docs/product-roadmap.md` immediately after framing; preserve approved history and replace only the section the owner approved. Include the evidence basis for each decision, but do not place secrets or implementation design in the file.

The artifact is `draft` until the owner approves the product outcome and milestones. A new roadmap MUST NOT be marked `approved` because AI confidence is high.

## Phase 5: Select One Milestone and Write Scope Brief

For roadmap-applicable work, ask the owner to select one milestone (or confirm the supplied one). Then write:

`plans/{active-plan-id}/scope-brief.md`

If no active plan exists, create one stable handoff directory named `plans/{YYMMDD-HHmm}-{slug}/`, write the scope brief there, and keep that `plan-id` for every downstream artifact. Do not put a scope brief under `plans/reports/`: that directory is for reports, not the roadmap-to-plan handoff. The scope brief must carry the roadmap path, milestone ID/outcome, actor, in-scope behaviors, non-goals, terminology, source of truth, risks, confirmed decisions, open questions, evidence gate, and redaction rules. Update the roadmap’s `## Selected Milestone` section with the same path and approval status.

Do not select multiple milestones for one implementation plan. If the request spans independent outcomes, return to milestone design and split the scope.

For `exempt`, do not select a milestone. Write `plans/{plan-id}/scope-brief.md` with the shared contract's EXEMPT block, common actor/outcome/boundary/non-goal/terms/source-of-truth/risk/evidence fields, and accepting-owner approval. Keep the stable `plan-id` for `$scenario` and `$plan`.

## Phase 6: Handoff and Stop Conditions

For an explicit roadmap request, handoff only after `docs/product-roadmap.md` and the scope brief are written and owner-approved. For `exempt`, handoff after the EXEMPT scope brief and owner approval are written; no roadmap or milestone is required:

1. `$scenario {scope-brief}` to enumerate adversarial situations.
2. `$brainstorm` for a selected capability’s detailed scope only when ideation is still needed; do not reopen the product roadmap silently.
3. `$spec`, `$refine`, or `$plan` only after the downstream skill confirms the roadmap/milestone references or the EXEMPT branch.

Stop and report `BLOCKED` when applicable roadmap artifacts are missing, no applicable milestone is selected, the EXEMPT reason/owner is missing, a material term has multiple plausible meanings, or the owner has not approved the selection/boundary.

## Output

Report:

- roadmap path and status, or the EXEMPT reason and owner;
- selected milestone ID and user outcome when applicable;
- explicit non-goals;
- risk retired and evidence gate;
- confirmed decisions and open questions;
- scope brief path;
- next skill and any blocker.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** For an explicit roadmap request, produce an owner-approved outcome roadmap and one selected milestone, or an owner-approved EXEMPT boundary for an isolated change. Ordinary workflows use embedded large-idea decomposition and do not enter this writer route.
**IMPORTANT MUST ATTENTION Main steps:** confirm the explicit route → load context and contract → frame outcomes → design milestones → obtain owner decisions → write the roadmap/scope brief → hand off the selected milestone or EXEMPT branch through scenario and Plan Gate.
**IMPORTANT MUST ATTENTION** run the explicit route → context → outcome/milestone or EXEMPT boundary → decision gate → scope → handoff in order.
**IMPORTANT MUST ATTENTION** define outcome, risk retired, non-goals, human decisions, dependencies, and evidence for every milestone.
**IMPORTANT MUST ATTENTION** use ask the user directly for material decisions; AI confidence never equals owner approval.
**IMPORTANT MUST ATTENTION** no framework, schema, endpoint, screen, or code decisions in the product roadmap.

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
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
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
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
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
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
