---
name: product-roadmap
description: '[Planning] Use ONLY when the user explicitly requests a product roadmap, roadmap update, or milestone selection — outcome milestones, MVP scope, non-goals, risks, evidence gates.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute phases in order; update task tracking before and after each phase.
> **[BLOCKING]** Every completed or skipped phase needs concise evidence or a reason.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** When explicitly requested, turn a product vision into an approved, outcome-based roadmap and one selected milestone—or route a genuinely isolated change through an explicit EXEMPT boundary—without making the roadmap artifact a prerequisite for ordinary idea, PBI, spec, presentation, or mock-up work.

**Summary:**

- Detect create/update/select/exempt only after confirming that the user explicitly requested this standalone skill. Read the shared contract and existing roadmap before writing. A large or ambiguous idea alone is not an invocation; its decomposition belongs in the owning PBI/spec/presentation/mock-up artifacts.
- Define the product outcome, actors, business truth, and 3–8 outcome milestones; each milestone names user outcome, risk retired, non-goals, human decisions, dependencies, and evidence.
- Ask the owner to confirm ambiguous terms and select one milestone; write the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) and a linked `scope-brief.md` incrementally.
- Hand off only an approved milestone, or an explicitly accepted EXEMPT scope, to `$scenario`; implementation planning remains blocked until the applicable Plan Gate is satisfied.
- **Main steps:** explicit-route confirmation → context/contract load → outcome framing → milestone design → owner decision gate → roadmap/scope-brief write → selected milestone or EXEMPT handoff → scenario/Plan Gate.

**Workflow:** 0) route and context → 1) outcome framing → 2) milestone design → 3) decision gate → 4) write roadmap → 5) select milestone/scope brief → 6) handoff.

**Key Rules:**

- Product roadmap answers outcomes and boundaries; it is not a timeline or implementation plan.
- Do not choose frameworks, database schemas, endpoints, screens, or code in this skill.
- Never silently reinterpret `ready`, `published`, `delivered`, `paid`, `refunded`, or equivalent lifecycle terms.
- A roadmap is canonical at one path — default `docs/product-roadmap.md`, overridden by a `docsRoots.productRoadmap.path` entry in `docs/project-config.json`; update that file rather than creating competing roadmap files.

## Mission

<request>$ARGUMENTS</request>

## Required Context

**MUST ATTENTION READ** `.claude/skills/shared/product-roadmap-contract.md` and `references/roadmap-template.md` before authoring. Also read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` when present. If project context is stale or missing, use the project's setup route before proceeding.

## Phase 0: Explicit Invocation Gate and Applicability

First confirm that the caller explicitly requested a product-roadmap deliverable or named this standalone skill. If not, STOP this route and return control to the active idea/PBI/spec workflow; do not infer `create`, do not create a scope brief, and do not write the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path).

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

Use `references/roadmap-template.md`. Create or update the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) immediately after framing; preserve approved history and replace only the section the owner approved. Include the evidence basis for each decision, but do not place secrets or implementation design in the file.

The artifact is `draft` until the owner approves the product outcome and milestones. A new roadmap MUST NOT be marked `approved` because AI confidence is high.

## Phase 5: Select One Milestone and Write Scope Brief

For roadmap-applicable work, ask the owner to select one milestone (or confirm the supplied one). Then write:

`<plans root>/{active-plan-id}/scope-brief.md` — resolve `<plans root>` in this order: a `docsRoots.plans.path` entry in `docs/project-config.json` WINS; otherwise `.ck.json` `paths.plans`; otherwise the `plans` default.

If no active plan exists, create one stable handoff directory named `{YYMMDD-HHmm}-{slug}/` under that same resolved plans root (default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`), write the scope brief there, and keep that `plan-id` for every downstream artifact. Do not put a scope brief under `tmp/reports/`: that directory is for reports, not the roadmap-to-plan handoff. The scope brief must carry the roadmap path, milestone ID/outcome, actor, in-scope behaviors, non-goals, terminology, source of truth, risks, confirmed decisions, open questions, evidence gate, and redaction rules. Update the roadmap’s `## Selected Milestone` section with the same path and approval status.

Do not select multiple milestones for one implementation plan. If the request spans independent outcomes, return to milestone design and split the scope.

For `exempt`, do not select a milestone. Write `<plans root>/{plan-id}/scope-brief.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) with the shared contract's EXEMPT block, common actor/outcome/boundary/non-goal/terms/source-of-truth/risk/evidence fields, and accepting-owner approval. Keep the stable `plan-id` for `$scenario` and `$plan`.

## Phase 6: Handoff and Stop Conditions

For an explicit roadmap request, handoff only after the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) and the scope brief are written and owner-approved. For `exempt`, handoff after the EXEMPT scope brief and owner approval are written; no roadmap or milestone is required:

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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** For an explicit roadmap request, produce an owner-approved outcome roadmap and one selected milestone, or an owner-approved EXEMPT boundary for an isolated change. Ordinary workflows use embedded large-idea decomposition and do not enter this writer route.
**IMPORTANT MUST ATTENTION Main steps:** confirm the explicit route → load context and contract → frame outcomes → design milestones → obtain owner decisions → write the roadmap/scope brief → hand off the selected milestone or EXEMPT branch through scenario and Plan Gate.
**IMPORTANT MUST ATTENTION** run the explicit route → context → outcome/milestone or EXEMPT boundary → decision gate → scope → handoff in order.
**IMPORTANT MUST ATTENTION** define outcome, risk retired, non-goals, human decisions, dependencies, and evidence for every milestone.
**IMPORTANT MUST ATTENTION** use ask the user directly for material decisions; AI confidence never equals owner approval.
**IMPORTANT MUST ATTENTION** no framework, schema, endpoint, screen, or code decisions in the product roadmap.

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
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
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
