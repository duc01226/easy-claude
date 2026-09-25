---
name: plan-validate
version: 2.0.0
description: '[Planning] Use when a workflow step or the user asks for plan validation. Validates a plan through a critical-questions interview.'
---

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
- **Main steps (run in order):** Phase 0 Detect Plan Type → resolve plan path (`$ARGUMENTS` / `## Plan Context` / ask) → load `mode` + `questions` range as hard constraints → Phase 0.5 resolve Applicability / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md`, flag decisions/assumptions/risks/tradeoffs → Step 2 Extract topics across 9 categories (Applicability, Architecture, Assumptions, Tradeoffs, Risks, Scope, New Tech/Lib, Test Specs, Preservation) → Step 3 Generate questions (2-4 concrete options each, surface implicit decisions) → Step 4 Interview via `AskUserQuestion` (≤4 per call) → Step 5 Document answers → offer implement/refine/skip.
- **Phase 0 weights everything:** plan type (bugfix/feature/migration/refactor/other) decides which question categories fire; any fix/bug/regression/broken/defect keyword makes the Preservation question BLOCKING — never skip it.
- **The output is a REAL interview, not a self-answer:** honor the `questions` MIN-MAX range from `## Plan Context`, give 2-4 concrete options per question, treat the Preservation "Unsure" answer as BLOCKED → route to `/plan`; if the plan adds new tech/packages, probe whether alternatives were evaluated before accepting the choice.
- **Persist results narrowly:** add ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — NEVER edit phase files; close by offering implement/refine/skip via `AskUserQuestion`.
- **Applicability is mandatory for every plan:** read `.claude/skills/shared/product-roadmap-contract.md`, verify the plan's branch-specific `## Plan Gate`, and ask the owner to confirm the embedded slice/decomposition, explicit roadmap outcome, framework technical outcome, or EXEMPT boundary plus non-goals, scenario proof, commands, evidence, and approval. `BLOCKED`, `OPEN`, `MISSING`, or `REQUIRED` cannot be silently upgraded.

**Workflow:**

1. **Detect Plan Type** — Classify plan (bugfix/feature/migration/refactor) to weight question categories
2. **Read Plan** — Parse plan.md + phase files for decisions, assumptions, risks
3. **Extract Topics** — Scan architecture, assumptions, tradeoffs, risks, scope keywords
4. **Generate Questions** — Formulate concrete questions with 2-4 options each
5. **Interview User** — Present questions using configured count range
6. **Document Answers** — Add Validation Summary section to plan.md

**Key Rules:**

- MUST ATTENTION use `AskUserQuestion` — NEVER auto-decide on behalf of user — why: the user owns every assumption-laden choice, not the agent
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
3. No plan → ask user for a path or run `/plan` first

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
4. "Unsure — need to investigate" (STOP: run /plan preservation analysis)
```

**Follow-up rules:**

- Option 2 selected → `plan.md` Preservation Inventory MUST cite Preservation TC asserting new behavior is intended
- Option 4 selected → return BLOCKED status, recommend `/plan` before proceeding
- Option 3 selected → `AskUserQuestion` follow-up: "Confirm: current code has NO preserved invariant? [Yes, every input broken / No, missed some — re-investigate]"

### Step 4: Interview User

Use `AskUserQuestion` — NEVER skip or auto-answer.

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

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion` to present:

- **"/feature-implement (Recommended)"** — Begin implementation with validated plan
- **"/refine"** — If plan needs PBI refinement first
- **"Skip, continue manually"** — User decides

---

> **[BLOCKING]** MUST ATTENTION use `AskUserQuestion` to interview user. Completing without asking ≥1 question = violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**MUST ATTENTION** Resolve `specArtifacts` first: use its identity and carrier only when valid, use strict-default `TC-{FEATURE}-{NNN}` and legacy TestSpec shape only when absent, and block a malformed declaration. Every plan phase maps its cases to an inspected assertion-bearing executor. Before each workflow step and after compaction, call `TaskList` and re-read the phase file; verify `file:line` evidence before completion.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
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

**IMPORTANT MUST ATTENTION** run the main steps IN ORDER — Phase 0 Detect Plan Type → resolve plan path → load `mode` + `questions` range → Phase 0.5 Product Readiness / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md` (flag decisions/assumptions/risks/tradeoffs) → Step 2 Extract topics (9 categories) → Step 3 Generate questions (2-4 options each) → Step 4 Interview via `AskUserQuestion` (≤4 per call) → Step 5 Document answers → offer implement/refine/skip — why: the pipeline IS the work; never collapse or skip a step from memory

**IMPORTANT MUST ATTENTION** validate decisions with the user via `AskUserQuestion` — NEVER auto-decide or self-answer; completing without ≥1 question is a protocol violation — why: the user owns every assumption-laden choice, not the agent
**IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) BEFORE generating questions — bugfix keywords (fix, bug, regression, broken, defect) make the Preservation question BLOCKING, never skipped — why: detection drives which categories fire and the Preservation gate
**IMPORTANT MUST ATTENTION** NEVER modify phase files — persist results by adding ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — why: phase files are the plan's source of truth and validation is a read-then-annotate pass

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting (including a task per file read); call `TaskList` first on context loss, never duplicate — why: resume existing tasks rather than re-plan after compaction
- **MANDATORY IMPORTANT MUST ATTENTION** honor the `questions` MIN-MAX range and `mode` from `## Plan Context` as hard constraints; give 2-4 concrete options per question, never go below min — why: the interview budget is configured, not improvised
- **MANDATORY IMPORTANT MUST ATTENTION** treat the Preservation "Unsure" answer as BLOCKED → return BLOCKED status and route to `/plan` preservation analysis before any implementation — why: an unverified preserved-correctness invariant is a silent regression risk
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
| "I'll just answer for the user"    | `AskUserQuestion` is mandatory. Self-answer = no validation.        |
| "New library is obviously fine"    | Probe whether alternatives were evaluated before accepting it.      |
| "I'll edit the phase files inline" | NEVER. Add only a `## Validation Summary` to `plan.md`.             |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** detect plan type (Phase 0) FIRST — bugfix keywords make Preservation BLOCKING.
**IMPORTANT MUST ATTENTION** validate with the user via `AskUserQuestion` — NEVER auto-decide.
**IMPORTANT MUST ATTENTION** NEVER modify phase files — add only a `## Validation Summary` to `plan.md`.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
