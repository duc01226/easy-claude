---
name: workflow-idea-to-spec
version: 2.0.0
description: '[Workflow] Use when activating the Idea-to-Spec workflow — turn a raw idea/vision/problem into ONE canonical (provisional) Feature Spec. STOPS at the reviewed spec; chain workflow-spec-to-pbi for a backlog. For code→spec use workflow-code-to-spec.'
disable-model-invocation: true
---

> **Renamed:** formerly `workflow-product-discovery` — now `/workflow-idea-to-spec`. The old name no longer resolves as a slash command.

## Quick Summary

**Goal:** [Workflow] Trigger the spec-driven Idea-to-Spec workflow to convert a raw idea — a raw vision or problem → structured brainstorm framing → canonical, provisional Feature Spec (the tech-free 8-section spec + §8 test specs at `docs/specs/{Bucket}/README.{Feature}.md`, `Evidence: TBD` until code lands) → reviewed and docs-synced. This workflow **STOPS at the reviewed Feature Spec** — it does NOT produce a PBI backlog. For a backlog, chain `workflow-spec-to-pbi` afterward; for idea → full backlog in one pass use `workflow-idea-to-pbi`; for code→spec (implementation already exists) use `workflow-code-to-spec`.

**Workflow:**

1. **Frame** — brainstorm the idea, analyze domain, validate the problem framing (why-review).
2. **Author** — capture the idea, then author the canonical provisional Feature Spec (`spec [mode=draft]`) + §8 test specs (`spec [mode=tests]`).
3. **Review & Sync** — review the test specs and the Feature Spec, validate rationale (why-review), sync docs.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION author the spec via `spec [mode=draft]` — idea-sourced, no code yet → §8 `Evidence: TBD`, `Status: Planned`, frontmatter `provisional: true`.
- NEVER decompose into PBIs/stories/backlog here — that is `workflow-spec-to-pbi`'s job. NEVER skip the Feature Spec authoring core.

## When to Use

- PO/BA has a raw product vision, problem statement, or "we need to build X" starting point and wants a canonical Feature Spec
- Team wants to capture intended behavior as a tech-free spec BEFORE any code exists (spec-first / TDD-first)
- A single idea or capability needs a reviewed, AI-implementable Feature Spec as the source of truth for later implementation

## When NOT to Use

- Implementation already exists and you want a spec FROM code → use `workflow-code-to-spec`
- You want a full grooming-ready PBI backlog from the idea in one pass → use `workflow-idea-to-pbi`
- You already have a Feature Spec and want PBIs from it → use `workflow-spec-to-pbi`
- Implementation work (code writing) → use `workflow-feature` or `workflow-big-feature`
- Bug fixes → use `workflow-bugfix`

## Key Mechanics

### 1. Brainstorm → Converge on the Capability to Spec

The `/brainstorm` step frames the idea using the Double Diamond process:

- **Problem framing:** POV statement, 5 Whys / Fishbone, JTBD job stories, HMW questions
- **Opportunity framing:** Opportunity Solution Tree (enhancement) OR Lean Canvas (new product)
- **Ideation:** SCAMPER, Crazy 8s, Impact Mapping
- **Convergence:** pick the single feature/capability to author as a Feature Spec

Output: the converged capability (or a short list if multiple distinct capabilities emerge).
AI presents the framing and confirms scope: **"Which capability should we author as a Feature Spec?"** If multiple distinct capabilities are in scope, confirm with the user and author one Feature Spec per capability (sub-agent per capability for 4+ — see Scale awareness).

### 2. Why-Review Gate (After domain-analysis, Before spec authoring)

Before authoring the spec, validate the idea framing with `/why-review`:

**Challenge prompts:**

- Is this truly the right problem to solve? What was deprioritized and why?
- Pre-mortem: if this is built and misses in 6 months, what was the root cause?
- Are there systemic alternatives (infrastructure change, process change) that make this unnecessary?

| Result | Action                                          |
| ------ | ----------------------------------------------- |
| PASS   | Proceed to spec authoring                       |
| WARN   | Document risk, acknowledge with user, proceed   |
| FAIL   | Revisit brainstorm framing before authoring     |

### 3. Spec Authoring Flow (core mechanic — idea → provisional Feature Spec)

These steps run in sequence. **Spec-driven order: idea → draft Feature Spec → test specs → review.**

| Step             | Purpose                                                                     | Output                                          |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `/idea`          | Capture the converged idea as a structured artifact                         | `team-artifacts/ideas/{date}-po-idea-{slug}.md` |
| `/spec [mode=draft]` | Author the canonical tech-free 8-section Feature Spec §1-7 FROM the idea text (no code grep; `provisional: true` marker) | `docs/specs/{Bucket}/README.{Feature}.md`       |
| `/spec [mode=tests]` | Author §8 TC-{FEATURE}-{NNN} behavioral test cases (`Evidence: TBD`, `Status: Planned` — before any code) | Feature Spec §8 Test Specifications             |
| `/review-artifact --type=spec-tests` | Test-spec quality check                                      | Reviewed §8 TCs                                 |
| `/review-artifact` | Feature Spec quality check                                                 | Reviewed Feature Spec                           |
| `/why-review`    | Validate the authored spec's rationale and completeness                     | Why-Review checklist                            |
| `/docs-update`   | Sync the Feature Spec (§8) and derived bucket indexes                        | Docs-update report                              |

**Provisional output:** because no code exists yet, the spec is provisional — §8 TCs carry `Evidence: TBD` and `Status: Planned`, and frontmatter carries `provisional: true`. The first `workflow-code-to-spec` / `spec [mode=update]` run against real code upgrades `TBD` → real `[Source:]` anchors and clears the provisional flag.

### 4. Handoff

At `/workflow-end`, AI presents:

- Session summary: M Feature Specs authored (provisional), §8 TC counts, open questions (confidence < 80%)
- Feature Specs authored: `docs/specs/{Bucket}/README.{Feature}.md` paths
- Provisional note: these specs carry `Evidence: TBD` + `provisional: true` until code lands — reconcile via `workflow-code-to-spec` / `spec [mode=update]` once implemented
- Recommended next workflow: `/start-workflow workflow-spec-to-pbi` (decompose the Feature Spec(s) into a grooming-ready PBI backlog) OR `/start-workflow workflow-feature` (implement directly from the spec)

## Conditional Skip Rules

| Step                  | Skip When                                                                   |
| --------------------- | --------------------------------------------------------------------------- |
| `/domain-analysis`    | No new domain entities or aggregates involved                               |
| `/why-review` (gate)  | User has already validated the idea rationale; no alternatives available    |

---

**IMPORTANT MANDATORY Steps:** /brainstorm -> /domain-analysis -> /why-review -> /idea -> /spec [mode=draft] -> /spec [mode=tests] -> /review-artifact --type=spec-tests -> /review-artifact -> /why-review -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `workflow-idea-to-spec` workflow. Run `/start-workflow workflow-idea-to-spec` with the user's prompt as context.

**Steps:**
/brainstorm → /domain-analysis → /why-review → /idea → /spec [mode=draft] → /spec [mode=tests] → /review-artifact --type=spec-tests → /review-artifact → /why-review → /docs-update → /workflow-end → /watzup

> **Scale awareness:** When the brainstorm converges on multiple distinct capabilities, this workflow authors one Feature Spec per capability. For 4+ capabilities, spawn one `spec` sub-agent per capability in ONE message (each gets the framing context + output path); the main context assembles and reviews. Use incremental-write patterns to prevent context overrun.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure spec-driven idea-to-spec converts a raw idea into ONE canonical, provisional Feature Spec — reviewed and docs-synced, ready to hand off for backlog decomposition or implementation.
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per workflow step (per capability when multiple capabilities are in scope)
- **MANDATORY IMPORTANT MUST ATTENTION** brainstorm converges on the capability to spec BEFORE the `/idea` step
- **MANDATORY IMPORTANT MUST ATTENTION** SPEC-DRIVEN ORDER — author the Feature Spec (`/spec [mode=draft]` → `/spec [mode=tests]`) and review it; this workflow STOPS at the reviewed spec
- **MANDATORY IMPORTANT MUST ATTENTION** PROVISIONAL OUTPUT — §8 carries `Evidence: TBD` / `Status: Planned` and frontmatter `provisional: true`; reconcile against code later via `workflow-code-to-spec`
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER decompose into PBIs/stories/backlog here — chain `workflow-spec-to-pbi` for a backlog
- **MANDATORY IMPORTANT MUST ATTENTION** why-review runs after domain-analysis — FAIL revisits framing, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-select scope
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify the authored Feature Spec(s)

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
**Anti-Rationalization:**

| Evasion | Rebuttal |
| ------- | -------- |
| "Purpose obvious" | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough" | Echo Goal in Closing Reminders — bottom anchor prevents drift. |
| "Skip evidence for prompt edits" | Cite changed file evidence and verify no stale protocol text remains. |
| "Decompose into PBIs while I'm here" | Out of scope — this workflow STOPS at the spec. Chain workflow-spec-to-pbi. |
