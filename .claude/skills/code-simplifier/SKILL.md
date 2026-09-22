---
name: code-simplifier
version: 2.3.0
description: '[Code Quality] Use when simplifying code for clarity, consistency, and maintainability while preserving behavior.'
context-budget: critical
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — by simplifying and refining code for clarity, consistency, and maintainability without altering any observable behavior. — why: every simplification serves future change cost, not aesthetics.

**Summary:** (read-this-if-nothing-else digest — purpose + every main step)

- **Purpose — skeptical-first MUTATOR, not a suggester:** grep all usages + trace consumers (graph downstream when graph.db exists) and cite `file:line` BEFORE touching anything; apply a simplification ONLY when certain it preserves behavior, never when unsure. — why: an unverified "safe" rewrite silently breaks a downstream consumer.
- **Main steps, run in order:** (1) **Phase 0 Detect** target + scope from project config/source; (2) **Identify Targets** — recent git changes or named files, HARD-SKIP generated/migration/vendor; (3) **Analyze** via the 5 Simplification Dimensions, marking inapplicable ones N/A with a reason; (4) **Apply** one refactoring type at a time (KISS/DRY/YAGNI, behavior-preserving); (5) **Verify** related tests after EACH change; (6) **Self-Recursive Loop** (analyze→simplify→verify) until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) or a no-progress/unsafe/owner-decision stop hits — do NOT spawn a fresh-context reviewer for your own findings; (7) **Self-Review Gate**.
- **The 5 Simplification Dimensions (step 3):** readability · DRY/abstraction (compare real repetition; apply YAGNI) · responsibility based on the project's documented architecture and evidenced ownership · complexity reduction · persistence/query bounds on applicable changed paths only (otherwise N/A) — every technique answers ONE test: does this make the next change cheaper?
- **Self-Review Gate (step 7) — this skill owns review of its own output:** when it changed any file, self-invoke `/code-review` scoped to ONLY those changed files (recursion-safe leaf — NEVER `/changes-review`); skip + log the reason when nothing changed. — why: the simplifier rewrites code after the main review batch, so its output ships unreviewed without this gate.
- **Read FIRST:** `code-review-rules.md` (anti-patterns/checklists) then `project-structure-reference.md`, both under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — before any modification.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan task to READ:
>
> - `code-review-rules.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — anti-patterns, review checklists **(READ FIRST)**
> - `project-structure-reference.md` — project patterns/structure
>
> If not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Phase 0: Detect** — Classify target types present in the project (source, UI/client, tests, configuration, or other) and scope
2. **Identify Targets** — Recent git changes or specified files (skip generated/migration/vendor)
3. **Analyze** — Apply simplification dimensions (see below)
4. **Apply** — One refactoring type at a time following KISS/DRY/YAGNI
5. **Verify** — Run related tests, confirm no behavior changes
6. **Self-Recursive Check** — Re-run this skill's simplification analysis until the current round's exit bar is clear: Round 1 requires zero validated findings at any severity; from Round 2 onward only validated CRITICAL/HIGH/MEDIUM findings reopen the loop, while LOW findings are recorded as deferred and do not justify another cycle. Failed binary gates always block.
7. **Self-Review Gate (MANDATORY when code changed)** — If this skill modified any files, self-invoke `/code-review` scoped to ONLY those changed files; skip + log if nothing changed

**Key Rules:**

- Preserve all existing functionality — no behavior changes
- Apply conventions supported by `docs/project-config.json`, its referenced project docs, and relevant existing code; treat an explicit N/A or absent stack as a signal to verify the target, not as a missing pattern to invent
- Easy to Change is the primary simplification goal for source files; DRY, SOLID, abstraction, and patterns are valid only when they lower future edit sites or cognitive load
- Tests pass after every change
- Apply simplification only when certain it preserves behavior — NEVER apply when unsure

## Phase 0: Artifact Detection

**MUST ATTENTION** classify before simplifying — detection drives focus and optional escalation only:

| Artifact Type       | Detection                                                                 | Key Focus                                                                                                        |
| ------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Source              | Target paths and file types identified from project config or user scope  | Preserve behavior; apply only responsibilities and conventions evidenced for the relevant code                  |
| UI/client (if any)  | Affected UI paths identified from project config or source                 | Use configured UI, state, lifecycle, and styling conventions only when present; otherwise follow local evidence |
| Tests               | Test paths and runner identified by project config or source              | Preserve the assertions, async behavior, isolation, and runner conventions that apply to this project           |
| Generated/migration/vendor | Generated markers, configured paths, or vendor/migration directories       | **SKIP** generated, migration, and vendor code                                                                   |

File extensions and stack-specific names in prompts or examples are search clues, not requirements. Classify the actual target using the project's config, references, and source.

Optional escalation by artifact:

| Artifact             | Escalate only when                                      |
| -------------------- | ------------------------------------------------------- |
| Source code/diffs    | Broad review is requested after simplifier loop is clean |
| Security-sensitive   | Security-specific risk is present                      |
| Performance-critical | Performance behavior is part of the change             |
| Plans, docs, specs   | Artifact review is explicitly requested                |

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Favor project-owned boundaries around external libraries, for example
  component/service input-output contracts, when they localize future library
  changes; reject pass-through wrappers that add ceremony without lowering
  change cost.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Simplification Mindset

**Skeptical-first:** Verify before simplifying. Every change needs proof preserving behavior.

- NEVER assume code redundant — trace call paths and read implementations first
- Before removing/replacing: grep all usages confirming nothing depends on current form
- Before flagging convention violation: grep 3+ existing examples — codebase convention wins
- Every simplification requires `file:line` evidence of what was verified
- Apply simplification only when certain it preserves behavior; if unsure → DO NOT apply

## Simplification Dimensions

Dimension-based reasoning replaces fixed checklists. Each dimension has a `Think:` prompt forcing first-principles reasoning.

### Dimension 1: Readability

> **Think:** Would a new engineer understand this in 30 seconds? What forces multiple file traces?

- Schema visibility: functions computing data structures need output-shape comment
- Non-obvious pipelines: A→B→C transformations need brief pipeline explanation
- Self-documenting signatures: params explain role; remove unused params
- Magic values: replace unexplained numbers/strings with named constants
- Naming clarity: names reveal intent without reading implementation

### Dimension 2: DRY & Abstraction

> **Think:** Is the same responsibility repeated, and would a shared abstraction reduce future change cost without hiding intentional differences?

- Search by behavior and responsibility; names or type suffixes are clues for discovery, not proof that types share a base or contract
- Extract a shared function, module, or type only when repeated behavior and change reasons align and the abstraction reduces edit sites or cognitive load
- YAGNI gate: NEVER extract for hypothetical future use — 3+ similar occurrences prompt comparison, not automatic extraction

### Dimension 3: Right Responsibility

> **Think:** Which module or layer owns this invariant under the project's documented architecture and current call paths?

- Read the project structure and relevant pattern references, then trace callers to identify the owner supported by evidence
- When those docs are silent, follow a consistent existing code pattern; if no owner is evidenced, keep the change local and report the uncertainty
- Place transformations at the boundary documented or demonstrated by this project; do not create an assumed layer, entity, or DTO convention

### Dimension 4: Complexity Reduction

> **Think:** What is cognitive load? Can nesting/conditionals flatten?

- Nesting >3 → refactor (early returns, extract methods)
- Methods >20 lines → extract
- Complex conditionals → flatten or Strategy pattern (3+ branching occurrences only)

### Dimension 5: Data Access and Storage (when applicable)

Apply this dimension only when project config/reference docs identify a persistence system or relevant target code proves it is used, and the changed path reads or writes that system. If no database/storage is configured or evidenced in source, or the changed code does not use its query/index model, mark this dimension `N/A — reason`; do not require paging or indexes for unrelated code.

> **Think:** Can this particular access path exceed its intended bound, and what evidence shows the configured or code-evidenced store needs a different access path?

1. **Result bounds:** For a changed list/search/report path over persistent data, check expected result size and the caller contract. When results can grow and the project supports it, use its documented paging/window/cursor convention; otherwise cite the evidence that bounds the result. Names such as `GetAll`, `ToList`, `Find`, or `Skip/Take` are search examples, not defects by themselves.
2. **Index fit:** Only for a database configured or evidenced in source and a changed query path that uses it (or a schema/index change supporting that query), inspect filters, ordering, joins, schema/index definitions, and query plans when available. Recommend an index only when evidence supports it and account for write/storage cost; do not demand indexes on every filter, foreign key, or sort field.
3. **Other storage models:** Follow the configured and code-evidenced access, query, and bound conventions for the storage in use. If persistent data is not in the changed path, record `N/A — reason`.

## Project Patterns

- Read `docs/project-config.json` and its configured reference-doc index to resolve conventions for the affected paths; honor documented `N/A` entries and custom paths.
- For backend/API, UI/client, test, or other specialized code, load only the relevant configured reference docs. Do not assume that the project has a backend, frontend, database, component system, or any named abstraction.
- When references are absent or silent, inspect at least three relevant existing examples and follow a consistent local convention. If none exists, keep the change minimal and state the gap rather than inventing a framework pattern.
- Any named language, file extension, layer, class, helper, state tool, styling method, or storage API in an example is illustrative; apply it only when project config/reference docs and the changed code show that it fits.
- **MUST ATTENTION** resolve the affected paths against project config and load their configured references before applying stack-specific checks; if those docs are missing, use source evidence and report the gap.
- **MUST ATTENTION** mark Dimension 5 `N/A — reason` unless project config/source confirms a database and the changed path uses its query or index model.
- **MUST ATTENTION** apply UI-specific conventions only when config or source confirms the affected path is a UI surface.
- **NEVER** infer a layer, entity/DTO, state store, styling method, or database solely from names, file extensions, or this skill's examples.
- **ALWAYS** cite config/schema/source evidence and query/runtime behavior before recommending paging or index changes.

## Graph Intelligence (MANDATORY if graph.db exists)

Before simplifying, trace what depends on target:

```
python .claude/scripts/code_graph trace <file> --direction downstream --json
```

Verify simplified code preserves the interface for every traced consumer. When the changed contract crosses a module, process, or service boundary, trace all consumers configured or found in source; message-bus consumers are one example only when the project uses that boundary.

Additional queries:

- Verify no callers break: `python .claude/scripts/code_graph query callers_of <function> --json`
- Check dependents: `python .claude/scripts/code_graph query importers_of <module> --json`
- Batch analysis: `python .claude/scripts/code_graph batch-query file1 file2 --json`

## Execution

```
Agent(subagent_type="code-simplifier", prompt="Review and simplify [target files]")
```

**Example:**

```typescript
// Before
function getData() {
    const result = fetchData();
    if (result !== null && result !== undefined) {
        return result;
    } else {
        return null;
    }
}

// After
function getData() {
    return fetchData() ?? null;
}
```

## Constraints

- **Preserve functionality** — no behavior changes
- **Tests passing** — verify after every change
- **Follow patterns** — use the project's conventions, never invent
- **Doc staleness** — cross-ref changed files against feature docs, test specs, READMEs; flag updates needed
- **Preserve ALL invariants; never weaken a property/mutation test** — a refactor MUST keep every `[HARD]` §4 rule / §5 invariant intact and MUST NOT delete, relax, or trivialize any property test or mutation test that guards them. If a simplification changes observable behavior, that is NOT a silent change — it is a **Dual-Feedback finding** (feed the spec AND the tests, then re-review), report it and stop, never ship it. After simplifying, the package MUST still pass the SAME property/mutation bar it passed before — green tests on a weakened bar are not a pass.

---

## Self-Recursive Verification (MANDATORY after simplifications)

After simplifications are applied, verification requires a **self-recursive simplification pass** over the updated diff. Do NOT spawn a fresh-context reviewer to re-review this skill's own findings. Round 1 treats every validated simplification finding as blocking; from round 2 onward, repeat analyze → simplify → verify only while validated CRITICAL/HIGH/MEDIUM findings remain. A LOW-only round ends the loop, with each LOW recorded as deferred; do not spend another fix/review cycle on LOW polish alone. Stop on an unsafe/no-progress/user-decision blocker.

## Self-Review Gate (MANDATORY when this skill changed code)

> **This skill is a code MUTATOR. It owns the review of its own output.** Once the self-recursive simplification loop above is clean, gate the result:
>
> 1. **Did this skill modify any files?** Determine the exact set of files this skill changed (its own edits — not the whole working tree).
>    - **No files changed** → SKIP this gate and **log the skip reason** ("code-simplifier made no changes — no self-review needed"). Done.
>    - **Files changed** → continue.
> 2. **Self-invoke `/code-review` scoped to ONLY the changed files.** Pass the explicit changed-file set as the review target — not the full diff, not unrelated files.
> 3. **Integrate the `/code-review` findings.** If it surfaces blocking issues caused by the simplification, fix them (behavior-preserving only) and re-run the self-recursive loop + this gate. If issues are out of simplification scope, report them up — do not silently drop.
>
> **Recursion safety:** `/code-review` is a LEAF review skill — it does NOT invoke `/code-simplifier` back, so there is no cycle. Use `/code-review` here, NEVER `/changes-review` (the heavyweight workflow that itself contains `/code-simplifier` and would recurse).
>
> **Why this gate exists:** `/code-simplifier` rewrites code after the main review batch has already run. Without this gate, the simplifier's output would ship unreviewed. This gate moves that review responsibility into the mutator itself — so the `workflow-review-changes` workflow no longer needs a separate `/code-review` step after `/code-simplifier`.

Used standalone (outside a review workflow), this self-review gate is sufficient for the simplifier's own changes; you may still finish with `/changes-review` or the active workflow's review gate for broader, whole-changeset coverage.

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in workflow, use `AskUserQuestion` to ask user. Do NOT decide this is "simple enough to skip" — the user decides:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — full changes-review restart gate → validated fix cycle (plan → plan-review → feature-implement) → re-review → docs
> 2. **Execute `/code-simplifier` directly** — run standalone (this skill self-reviews its own changes via the Self-Review Gate)

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, use `AskUserQuestion`:

- **"/workflow-review-changes (Recommended)"** — Review all changes before commit
- **"/code-review"** — Full code review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence (confidence >80% to act, <80% verify first).

> **DRY and abstraction fit:** Compare repeated behavior and responsibility before proposing a shared abstraction. Recommend a function, module, or type only when evidence shows the instances share a reason to change and the abstraction reduces future edits; names or suffixes alone do not justify a base type. Verify any project-specific lint/analyzer rule in its config.

## Self-Recursive Simplification Loop

**Purpose:** Avoid spending tokens on a fresh-context review of this skill's own findings. The simplifier owns its own convergence loop; broader review workflows can still run after the simplifier reports clean.

Loop:

1. Analyze the current target/diff for simplification findings with `file:line` evidence.
2. Apply only behavior-preserving simplifications that satisfy the evidence gate.
3. Run targeted verification after each change set.
4. Re-read the updated diff and re-run this skill's simplification dimensions.
5. Repeat until this skill's current round bar is clear: round 1 has zero validated simplification findings; round 2 have zero validated CRITICAL/HIGH/MEDIUM findings, with LOWs recorded as deferred.

Stop conditions:

- The same simplification finding repeats for 3 passes with no progress.
- A simplification needs product/owner input or has behavior-change risk.
- Verification cannot run or cannot prove behavior preservation.

Rules:

- Do not spawn a fresh-context reviewer just because simplifications were applied.
- Do not re-review known findings in a fresh context before fixing them.
- Do not hand off until the self-recursive pass clears the current round bar; never silently discard deferred LOWs.
- After the self-recursive loop is clean, run the **Self-Review Gate** — if any files were changed, self-invoke `/code-review` scoped to those files (recursion-safe leaf skill); skip + log if nothing changed.

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

<!-- SYNC:ui-system-context -->

> **UI System Context** — Apply only when the changed artifact is part of a user-interface surface; a `.ts`, `.html`, `.scss`, or `.css` extension alone does not establish that.
>
> 1. Resolve applicable UI paths and conventions from `docs/project-config.json`, its configured project-reference docs, accepted decisions, and existing code. Read only references relevant to this surface (frontend patterns, styling, component system, design system, accessibility, or platform guide).
> 2. Respect an explicit N/A or absent UI surface. Do not require BEM, SCSS, tokens, component tiers, base classes, stores, API wrappers, or teardown helpers unless this project documents or demonstrates them.
> 3. Follow the configured/observed styling and component conventions. Use `componentSystem.layerClassification` when configured; otherwise describe the actual component owners without inventing Common/Domain-Shared/Page tiers.
> 4. Reuse or compose an existing abstraction when its contract and platform fit. When none fits, use the project's idiomatic local pattern; do not add a shared base or wrapper just to satisfy this checklist.
>
> Project config may customize these conventions through `contextGroups[].rules`, `workflowPatterns`, `styling`, `componentSystem`, and the configured reference docs.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by effort, reviewer preference, or how annoying the fix is. One scale applies to every review, skill, agent, workflow, and host so a tier has the same meaning everywhere. Choose the highest credible consequence supported by evidence; do not lower a tier to make a round pass.
>
> **Finding vs observation (required):** An observation becomes a finding only when it names the affected user/system/data/contract, the shipped consequence, the evidence location, and the normalized tier. `INFO`, advice, preference, duplicate wording, or an unsubstantiated concern is not a finding and must not reopen a loop. If the concern might affect a required behavior or gate but evidence is incomplete, emit `NOT VERIFIABLE` with the missing evidence and keep it unresolved; never silently convert uncertainty into LOW.
>
> | Severity | Action | Definition and examples |
> | --- | --- | --- |
> | CRITICAL | Block immediately; escalate | Immediate material risk if shipped: authentication/authorization or safety bypass; secrets/PII exposure; irreversible destructive action; data loss/corruption; or a silent failure on a critical path. A failed binary gate that makes the result untrustworthy is represented as a separate synthetic blocker by the executable policy (not as an ordinary severity judgment). |
> | HIGH | Must fix before PASS/merge | Material correctness or contract risk: wrong behavior on a supported path; violated business/data invariant; meaningful privacy or authority gap; breaking API/schema/compatibility change; likely harm to users/downstream systems; or a missing proof for a behavior-changing fix. |
> | MEDIUM | Must clear the current round; escalate if the fix needs an owner decision | Bounded but consequential risk: an edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift whose impact is real but not immediate material loss. An explicit follow-up records the escalation/residual risk; it does not make an open MEDIUM a clean pass. |
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks readiness), `1` = MEDIUM (partial, consequential gap), `2` = pass (no finding). If the criterion is only polish, use LOW rather than forcing a `0`.
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): high impact + high exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact and low exposure → LOW. Record the axes and why the selected tier is the highest credible consequence.
> - **Scorecards / `/20` grades** (e.g. architecture-scalability-review): the aggregate score and verdict band are separate from finding severity. A sub-80 area is evidence to investigate, not an automatic CRITICAL/HIGH/MEDIUM/LOW label; classify each underlying gap by the consequence decision tree and keep advisory score deductions separate from blocking findings.
>
> **Domain-vocabulary normalization (mandatory):** Specialized skills may keep a local reporting vocabulary, but it MUST feed this same four-tier round predicate — never a second severity system:
>
> - `BLOCKED`, `HARD FAIL`, or `FAIL` is a blocking local verdict, not an automatic CRITICAL label. Classify the underlying consequence as CRITICAL when it is an immediate material risk or failed binary gate; otherwise classify it as HIGH or MEDIUM with evidence, while preserving the local block until the owning gate is satisfied.
> - `WARN` is not permission to ignore a finding. Map it to MEDIUM when the gap is consequential, to LOW only when evidence supports no credible present material impact, or upward to HIGH/CRITICAL when the consequence warrants it. `PASS`/compliant is not a finding.
> - UI `P0`/`P1`/`P2`/`P3`/`P4` map to CRITICAL/HIGH/MEDIUM/LOW/LOW respectively as a starting point; override upward only when the evidence shows a higher shipped consequence. A P0/P1 accessibility or task-completion floor remains a blocking gate even when a local UI report calls it a priority rather than a severity.
> - Numeric SRE/readiness or impact/likelihood scores are evidence inputs, not replacement tiers. Emit the score, the consequence, and the normalized CRITICAL/HIGH/MEDIUM/LOW tier together. `INFO`/advisory observations are not findings unless the evidence shows a material consequence.
>
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
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

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — by simplifying and refining code for clarity, consistency, and maintainability without altering any observable behavior. — why: every simplification serves future change cost, not aesthetics.

**IMPORTANT MUST ATTENTION Main steps (run in declared order, never skip/merge):** (1) Phase 0 Detect target and scope from project config/source → (2) Identify Targets (skip generated/migration/vendor) → (3) Analyze the 5 Dimensions and mark inapplicable ones N/A with a reason → (4) Apply one refactoring type at a time → (5) Verify tests after EACH change → (6) Self-Recursive Loop until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → (7) Self-Review Gate (`/code-review` on changed files). — why: AI keeps forgetting the skill's own steps; surfacing them here is the recency anchor.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Subagent Return Contract:** sub-agents return only the summary shape; full detail to report file.
- **UI System Context:** read frontend-patterns, scss-styling-guide, design-system before touching UI files.
- **Shared Protocol Duplication Policy:** inline SYNC duplication is intentional — NEVER extract behind file reference.
- **Source/Test Drift Check:** when source behavior changes, decide from evidence whether tests follow or source is a bug.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, NEVER present guess as fact.
- **Understand Code First:** read target + grep 3+ patterns + graph trace before writing or fixing.
- **Design Patterns Quality:** assess abstraction and responsibility using the project's evidenced architecture; do not impose a fixed object, layer, or framework convention.
- **Complexity Prevention:** look for evidence-backed change amplification and unclear ownership using the project's actual module boundaries.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every validated finding, round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** apply a simplification ONLY when certain it preserves behavior — grep all usages + trace consumers (graph downstream when graph.db exists) and cite `file:line` BEFORE touching anything; if unsure → DO NOT apply. — why: an unverified "safe" rewrite silently breaks a downstream consumer.
**IMPORTANT MUST ATTENTION** NEVER simplify generated, migration, or vendor files — HARD-SKIP them in Phase 0. — why: regenerated output overwrites edits and migrations are one-time execution paths, not core logic.
**IMPORTANT MUST ATTENTION** run the Self-Recursive Loop (analyze → simplify → verify) until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred); do NOT spawn a fresh-context reviewer for this skill's own findings. — why: re-reviewing your own findings in fresh context burns tokens the convergence loop already owns.

- **MANDATORY** Evidence Gate — every finding/recommendation needs `file:line` proof or a traced call chain; confidence >80% to act, 60-80% verify first, <60% DO NOT recommend. NEVER use "obviously"/"I think"/"should be" without proof.
- **MANDATORY** break work into small todo tasks via `TaskCreate` BEFORE starting (one task per file read); keep exactly one `in_progress`; mark `completed` immediately; add a final review task. On context loss, `TaskList` first — resume, never duplicate.
- **MANDATORY** READ `code-review-rules.md` FIRST, then `project-structure-reference.md` — both under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides); search 3+ existing patterns and read the target code BEFORE modification. Run graph trace when `graph.db` exists.
- **MANDATORY** evaluate pattern FIT before copying nearby code — verify same scope, lifetime, base class, constraints; closest example ≠ matching preconditions. — why: a copied pattern with mismatched preconditions compiles but is wrong.
- **MANDATORY** reason by the 5 Simplification Dimensions — readability, evidenced DRY/abstraction, responsibility according to documented architecture and actual ownership, complexity reduction, and configured persistence/query bounds when relevant (otherwise N/A with a reason); every technique answers ONE test: does this make the next change cheaper?
- **MANDATORY IMPORTANT MUST ATTENTION** compare repeated behavior before abstraction and assign responsibility from project docs and traced code; names/suffixes are clues only. After every extraction/move/rename, grep ENTIRE scope for dangling references — zero tolerance. — why: "primary file done" ≠ secondary files clean.
- **MANDATORY IMPORTANT MUST ATTENTION** preserve ALL invariants — NEVER weaken, delete, or trivialize a property/mutation test guarding a `[HARD]` §4 rule or §5 invariant; a behavior change is a Dual-Feedback finding (feed spec AND tests, re-review) — report and stop, never ship silently. — why: green tests on a weakened bar are not a pass.
- **MANDATORY IMPORTANT MUST ATTENTION** verify ALL affected outputs and tests pass after EACH change (apply one refactoring type at a time) — one build green ≠ all green. — why: multi-stack changes regress the stack you didn't check.
- **MANDATORY IMPORTANT MUST ATTENTION** Self-Review Gate — when this skill changed code, self-invoke `/code-review` scoped to ONLY the changed files (recursion-safe leaf skill; NEVER `/changes-review` — it recurses into `/code-simplifier`); skip + log the reason when nothing changed. The simplifier owns review of its own output. — why: the simplifier rewrites code after the main review batch, so its output ships unreviewed without this gate.
- **MANDATORY** validate route decisions with the user via `AskUserQuestion` when outside a workflow — never auto-decide "simple enough to skip".

**Anti-Rationalization:**

| Evasion                          | Rebuttal                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| "Too simple for graph trace"     | Wrong assumptions waste more time. Run trace anyway when `graph.db` exists.                                                            |
| "Already searched"               | Show `file:line` evidence. No proof = no search.                                                                                       |
| "Just a small simplification"    | Small change at wrong layer cascades. Trace consumers first.                                                                           |
| "Code is self-explanatory"       | Future readers need an evidence trail. Document non-obvious intent.                                                                    |
| "Simplification is safe"         | NEVER assume safe — grep ALL usages first; <80% confidence = do not apply.                                                            |
| "Best practice says abstract it" | Abstract only when it lowers future change cost; pass-through indirection is complexity, not simplification.                            |
| "This pattern is everywhere"     | Pattern fit ≠ pattern presence. Verify same scope/lifetime/base-class/constraints before copying.                                     |
| "Tests still pass, ship it"      | Did you weaken the bar? A relaxed property/mutation test passing is not a pass. Keep the SAME invariant bar.                            |
| "Skip recursive check after fixing" | Every simplification changes the diff. Re-run this skill's own simplification analysis until the current round bar is clear; after round 1, LOW-only findings are recorded/deferred rather than causing another cycle. |
| "Generated file is messy too"    | NEVER touch generated/migration/vendor — HARD-SKIP. Regeneration overwrites you.                                                       |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks using TaskCreate.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
