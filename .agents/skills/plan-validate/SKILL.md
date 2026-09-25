---
name: plan-validate
description: '[Planning] Use when a workflow step or the user asks for plan validation. Validates a plan through a critical-questions interview.'
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

> **[BLOCKING]** Run declared steps in order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill, update task tracking: `in_progress` at start, `completed` at end.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or an explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain an equivalent step tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**Summary:**

- **Purpose:** validate a finished plan via a critical-questions interview so every assumption-laden decision and every preservation-critical behavior is user-confirmed BEFORE implementation — no unstated assumption silently reaches code.
- **Main steps (run in order):** Phase 0 Detect Plan Type → resolve plan path (`$ARGUMENTS` / `## Plan Context` / ask) → load `mode` + `questions` range as hard constraints → Phase 0.5 resolve Applicability / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md`, flag decisions/assumptions/risks/tradeoffs → Step 2 Extract topics across 9 categories (Applicability, Architecture, Assumptions, Tradeoffs, Risks, Scope, New Tech/Lib, Test Specs, Preservation) → Step 3 Generate questions (2-4 concrete options each, surface implicit decisions) → Step 4 Interview by asking the user directly (≤4 per call) → Step 5 Document answers → offer implement/refine/skip.
- **Phase 0 weights everything:** plan type (bugfix/feature/migration/refactor/other) decides which question categories fire; any fix/bug/regression/broken/defect keyword makes the Preservation question BLOCKING — never skip it.
- **The output is a REAL interview, not a self-answer:** honor the `questions` MIN-MAX range from `## Plan Context`, give 2-4 concrete options per question, treat the Preservation "Unsure" answer as BLOCKED → route to `$plan`; if the plan adds new tech/packages, probe whether alternatives were evaluated before accepting the choice.
- **Persist results narrowly:** add ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — NEVER edit phase files; close by offering implement/refine/skip by asking the user directly.
- **Applicability is mandatory for every plan:** read `.claude/skills/shared/product-roadmap-contract.md`, verify the plan's branch-specific `## Plan Gate`, and ask the owner to confirm the embedded slice/decomposition, explicit roadmap outcome, framework technical outcome, or EXEMPT boundary plus non-goals, scenario proof, commands, evidence, and approval. `BLOCKED`, `OPEN`, `MISSING`, or `REQUIRED` cannot be silently upgraded.

**Workflow:**

1. **Detect Plan Type** — Classify plan (bugfix/feature/migration/refactor) to weight question categories
2. **Read Plan** — Parse plan.md + phase files for decisions, assumptions, risks
3. **Extract Topics** — Scan architecture, assumptions, tradeoffs, risks, scope keywords
4. **Generate Questions** — Formulate concrete questions with 2-4 options each
5. **Interview User** — Present questions using configured count range
6. **Document Answers** — Add Validation Summary section to plan.md

**Key Rules:**

- MUST ATTENTION use ask the user directly — NEVER auto-decide on behalf of user — why: the user owns every assumption-laden choice, not the agent
- Ask ONLY about genuine choices affecting implementation — NEVER about non-decision points — why: noise questions burn the interview budget and erode trust
- Bugfix plans ALWAYS trigger the Preservation question (keywords: fix, bug, regression, broken, defect) — why: an unverified preserved-correctness invariant is a silent regression
- Persist via a `## Validation Summary` on `plan.md` — NEVER modify phase files — why: phase files are the plan's source of truth; validation is a read-then-annotate pass
- For embedded, explicit-roadmap, framework/library, or EXEMPT plans, include the final applicability status and exact owning paths in that same summary; use each branch only when the plan records its required evidence and owner.

## First Principle — Easy to Change

> **Success metric for every coding decision: _future change cost._** DRY, SRP,
> abstraction, design patterns, naming, layering, and tests serve one goal:
> **make the next change cheaper**.

When evaluating code, refactors, tests, abstractions, or questions, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost: premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff.
- Name real enemies: **coupling, hidden state, duplicated knowledge, unclear
  intent, irreversible decisions exposed too early**.
- Prefer simple designs easy to change over sophisticated designs that are not.

Apply this lens before downstream rules; if a rule raises change cost, this
principle wins.

---

## Phase 0: Detect Plan Type

Classify plan type BEFORE generating questions; it drives category weighting:

| Plan Type     | Detection                                                         | Mandatory Extra Categories            |
| ------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Bugfix**    | Title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect` | Preservation (BLOCKING)               |
| **Feature**   | New capability, no fix keywords                                   | Architecture, Assumptions, Test Specs |
| **Migration** | Schema change, EF migration, data move                            | Risks, Preservation, Scope            |
| **Refactor**  | Restructure/clean up, no behavior change                          | Preservation, Tradeoffs               |
| **Other**     | None of above                                                     | Architecture, Scope                   |

**Bugfix detection is BLOCKING** — NEVER skip Preservation question when fix/bug/regression/broken/defect keywords present.

## Plan Resolution

1. `$ARGUMENTS` provided → use that path
2. Else use the active path from `## Plan Context`
3. No plan → ask user for a path or run `$plan` first

## Phase 0.5: Applicability / Plan Gate

Before extracting technical questions, classify the plan's branch.

- Embedded large-idea: read the owning PBI/spec; verify complete `large_idea_decomposition`, selected slice, non-goals/deferred owners, and conditional scenario artifact when needed. Do not require the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) or a product milestone.
- Explicit roadmap: read the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), selected milestone scope brief, and `scenario-analysis.md`.
- Framework/library: read technical scope, operational scenarios, generated-carrier evidence, and commands.
- Verify one `## Plan Gate` in `plan.md`: matching branch/outcome/boundaries; explicit non-goals; lifecycle terms when applicable; branch decision state; known or explicitly inapplicable skeleton/configuration; build/test/run commands; redacted evidence; `Human approval: APPROVED`.
- Missing upstream artifacts or `BLOCKED`/`OPEN`/`MISSING`/`REQUIRED` values create a blocking Applicability question. Do not implement or recommend `implement` while unresolved.
- Isolated brownfield/bugfix: verify the shared contract's EXEMPT branch: scope brief and plan reason/owner, required sibling scenario, explicit `EXEMPT` roadmap/milestone, explicit `N/A` product-decision rationale, known commands/evidence/approval. Retain preservation/spec/test/review questions.

## Configuration (from injected context)

Check `## Plan Context` section:

- `mode` — auto/prompt/off
- `questions` — MIN-MAX range (e.g. `3-8`)

Treat both as hard constraints.

## Workflow

### Step 1: Read Plan Files

Read plan directory:

- `plan.md` — overview + phases list
- `phase-*.md` — all phase files
- Flag: decision points, assumptions, risks, tradeoffs

### Step 2: Extract Question Topics

| Category         | Keywords                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Architecture** | approach, pattern, design, structure, database, API                                        |
| **Assumptions**  | assume, expect, should, will, must, default                                                |
| **Tradeoffs**    | tradeoff, vs, alternative, option, choice, either/or                                       |
| **Risks**        | risk, might, could fail, dependency, blocker, concern                                      |
| **Scope**        | phase, MVP, future, out of scope, nice to have                                             |
| **New Tech/Lib** | install, add package, new dependency, npm install, dotnet add, unfamiliar framework names  |
| **Test Specs**   | TC-, test case, coverage, TDD, test specification                                          |
| **Preservation** | auto-trigger on bugfix keywords in title/frontmatter — scan Preservation Inventory section |
| **Product Readiness** | roadmap-applicable or EXEMPT plan — scan the applicable `## Plan Gate` branch, scope/scenario refs, non-goals, definitions, evidence, and human approval |

### Step 3: Generate Questions

**Format rules:**

- 2-4 concrete options per question
- Mark recommended with "(Recommended)" suffix
- "Other" option automatic — do NOT add
- Surface implicit decisions

For a roadmap-applicable plan, ask a Product Readiness question before lower-level choices:

> Does the plan implement the owning slice/outcome or technical boundary exactly, with the stated non-goals, lifecycle definitions where applicable, scenario proof, known skeleton/commands, redacted evidence, and human approval?

Offer concrete choices such as: **Yes, approve the Plan Gate (Recommended)**; **No, revise the scope/plan**; **A product decision remains open**; **This plan is an explicitly accepted isolated-change exemption**. Never answer this question from the plan author's confidence alone.

**Examples:**

```
Category: Architecture
Question: "How should validation results be persisted?"
Options:
1. Save to plan.md frontmatter (Recommended) — updates existing plan
2. Create validation-answers.md — separate answers file
3. Don't persist — ephemeral validation only
```

```
Category: Assumptions
Question: "Plan assumes API rate limiting not needed. Correct?"
Options:
1. Yes, not needed for MVP
2. No, add basic rate limiting now (Recommended)
3. Defer to Phase 2
```

```
Category: Preservation (MANDATORY when title/frontmatter: fix, bug, regression, broken, defect)
Question: "List 2-3 inputs where CURRENT code is correct. Will fix change behavior on any?"
Options (multi-select):
1. "Current code correct on: {input A}. Fix preserves behavior." (Recommended)
2. "Current code correct on: {input B}. Fix CHANGES behavior because: {justification}"
3. "Current code has NO preserved-correctness inputs — every input was broken" (rare; requires confirmation)
4. "Unsure — need to investigate" (STOP: run $plan preservation analysis)
```

**Follow-up rules:**

- Option 2 selected → `plan.md` Preservation Inventory MUST cite Preservation TC asserting new behavior is intended
- Option 4 selected → return BLOCKED status, recommend `$plan` before proceeding
- Option 3 selected → ask the user directly follow-up: "Confirm: current code has NO preserved invariant? [Yes, every input broken / No, missed some — re-investigate]"

### Step 4: Interview User

Use ask the user directly — NEVER skip or auto-answer.

**Rules:**

- Use question count from `## Plan Context` → `Validation: mode=X, questions=MIN-MAX`
- Group related questions (max 4 per tool call)
- Focus: assumptions, risks, tradeoffs, architecture
- MANDATORY IMPORTANT MUST ATTENTION: if plan introduces new tech/packages, ask: "Plan uses {lib}. Were alternatives evaluated? Confirm choice or research more?"

### Step 5: Document Answers

Add `## Validation Summary` to `plan.md`:

```markdown
## Validation Summary

**Validated:** {date}
**Questions asked:** {count}

### Applicability

- **Branch:** DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | FRAMEWORK-LIBRARY | EXEMPT | BLOCKED
- **Owning artifact / roadmap:** `{paths}` or `NOT APPLICABLE — embedded/framework/EXEMPT`
- **Slice / milestone / technical outcome:** `{ID and outcome}`
- **Scope handoff / scenarios:** `{paths or conditional N/A}`
- **Plan Gate:** DECOMPOSITION-EMBEDDED | READY | FRAMEWORK-LIBRARY | EXEMPT | BLOCKED
- **Human approval:** APPROVED | REQUIRED

### Confirmed Decisions

- {decision 1}: {user choice}
- {decision 2}: {user choice}

### Action Items

- [ ] {changes needed based on answers}
```

NEVER modify phase files — only document what needs updating.

## Output

After validation:

- Questions asked count
- Key decisions confirmed
- Items flagged for plan revision
- Recommendation: proceed to implementation OR revise plan first

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use ask the user directly to present:

- **"$feature-implement (Recommended)"** — Begin implementation with validated plan
- **"$refine"** — If plan needs PBI refinement first
- **"Skip, continue manually"** — User decides

---

> **[BLOCKING]** MUST ATTENTION use ask the user directly to interview user. Completing without asking ≥1 question = violation.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** Complex/lengthy work → write findings + results to `tmp/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence % (>80% act, <80% verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `cross-service-check` — Scan producers, consumers, sagas and shared contracts for cross-service impact; concluding an investigation, plan or spec in a service-based system → .claude/skills/shared/protocols/cross-service-check.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `plan-quality` — Every plan phase carries test specifications and purpose-named contracts; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:plan-quality:reminder -->

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call the current task list and re-read the phase file; verify `file:line` evidence before completion.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

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

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**IMPORTANT MUST ATTENTION Main steps:** detect plan type → resolve the plan and applicability gate → read plan/phase files → extract decision topics → ask bounded user questions → document confirmed answers → offer implement/refine/skip.

**IMPORTANT MUST ATTENTION Applicability:** validate the embedded decomposition/slice evidence, explicit roadmap milestone chain, framework technical evidence, or EXEMPT reason/owner plus non-goals, definitions, scenario proof where applicable, skeleton/commands, redacted evidence, and human approval before offering implementation; unresolved intent or evidence is BLOCKED.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** child skill still creates visible phase tasks; link parent when nested.
- **Task Tracking & External Report:** bootstrap task breakdown first; persist findings incrementally to `tmp/reports/`.
- **Critical Thinking:** MUST ATTENTION apply critical + sequential thinking; cite proof; confidence >80% to act.
- **Sequential Thinking:** structured multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Project Reference Docs:** read required project-reference docs before target work; always include `lessons.md`.
- **Understand Code First:** MUST ATTENTION read code and grep 3+ patterns before any modification.
- **Plan Quality:** include `## Test Specifications` with TC-{FEATURE}-{NNN} IDs per phase.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** run the main steps IN ORDER — Phase 0 Detect Plan Type → resolve plan path → load `mode` + `questions` range → Phase 0.5 Product Readiness / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md` (flag decisions/assumptions/risks/tradeoffs) → Step 2 Extract topics (9 categories) → Step 3 Generate questions (2-4 options each) → Step 4 Interview by asking the user directly (≤4 per call) → Step 5 Document answers → offer implement/refine/skip — why: the pipeline IS the work; never collapse or skip a step from memory

**IMPORTANT MUST ATTENTION** validate decisions with the user by asking the user directly — NEVER auto-decide or self-answer; completing without ≥1 question is a protocol violation — why: the user owns every assumption-laden choice, not the agent
**IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) BEFORE generating questions — bugfix keywords (fix, bug, regression, broken, defect) make the Preservation question BLOCKING, never skipped — why: detection drives which categories fire and the Preservation gate
**IMPORTANT MUST ATTENTION** NEVER modify phase files — persist results by adding ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — why: phase files are the plan's source of truth and validation is a read-then-annotate pass

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting (including a task per file read); call the current task list first on context loss, never duplicate — why: resume existing tasks rather than re-plan after compaction
- **MANDATORY IMPORTANT MUST ATTENTION** honor the `questions` MIN-MAX range and `mode` from `## Plan Context` as hard constraints; give 2-4 concrete options per question, never go below min — why: the interview budget is configured, not improvised
- **MANDATORY IMPORTANT MUST ATTENTION** treat the Preservation "Unsure" answer as BLOCKED → return BLOCKED status and route to `$plan` preservation analysis before any implementation — why: an unverified preserved-correctness invariant is a silent regression risk
- **MANDATORY IMPORTANT MUST ATTENTION** if the plan introduces new tech/packages, probe whether alternatives were evaluated before accepting the choice — why: unevaluated dependency choices raise future change cost
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with confidence % for every claim (>80% act, <80% verify first); admit uncertainty rather than present a guess as fact — why: speculation drives wrong validation questions
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read the plan + phase files BEFORE generating questions — match the codebase's local conventions over generic framework defaults — why: questions grounded in actual code surface real decisions, not invented ones
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Easy-to-Change lens before any rule below — flag decisions that raise future change cost (coupling, hidden state, duplicated knowledge, unclear intent, irreversible early choices)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review task to verify work quality

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                            |
| ---------------------------------- | ------------------------------------------------------------------- |
| "Plan is simple, skip validation"  | Simple plans still have implicit decisions. Apply anyway.           |
| "Already know the answers"         | Show user responses as proof. No responses = no validation.         |
| "Preservation doesn't apply here"  | If title has fix/bug/regression/broken/defect → ALWAYS applies.     |
| "Phase 0 not needed"               | Detection drives the Preservation gate. NEVER skip.                 |
| "Only ask a few questions"         | Use the `questions` range from Plan Context. Never go below min.    |
| "I'll just answer for the user"    | ask the user directly is mandatory. Self-answer = no validation.        |
| "New library is obviously fine"    | Probe whether alternatives were evaluated before accepting it.      |
| "I'll edit the phase files inline" | NEVER. Add only a `## Validation Summary` to `plan.md`.             |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**IMPORTANT MUST ATTENTION** detect plan type (Phase 0) FIRST — bugfix keywords make Preservation BLOCKING.
**IMPORTANT MUST ATTENTION** validate with the user by asking the user directly — NEVER auto-decide.
**IMPORTANT MUST ATTENTION** NEVER modify phase files — add only a `## Validation Summary` to `plan.md`.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

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
