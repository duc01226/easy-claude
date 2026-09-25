---
name: code-simplifier
version: 2.3.0
description: '[Code Quality] Use when a workflow step or the user asks for code simplification. Improves clarity, consistency and maintainability while preserving behavior.'
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

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `complexity-prevention` — Change-cost lens on complexity (Ousterhout); designing or reviewing code → .claude/skills/shared/protocols/complexity-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `design-patterns-quality` — Design quality: one owner per rule, fitted patterns, no speculative abstraction; designing or reviewing code structure → .claude/skills/shared/protocols/design-patterns-quality.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

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
