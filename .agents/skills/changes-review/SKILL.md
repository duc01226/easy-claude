---
name: changes-review
description: '[Code Quality] Use when reviewing current changes, staged or unstaged diffs, or branch-to-branch diffs. Flag: --fix-loop reviews, fixes and re-reviews until converged.'
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
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[TOP REMINDER — WHY-REVIEW FINDINGS-VALIDATION GATE IS NON-NEGOTIABLE]**
>
> If this review produces **ANY** finding (Critical / High / Medium / Low) in standalone mode, you **MUST invoke the `$why-review` skill** through the skill invocation with `--validate-findings <report-path>` **before** any fix, docs-update, commit, or handoff. An actual skill call is the ONLY way to pass this gate — re-reading the cited `file:line`s yourself, "self-validating," or any inline/manual substitute does **NOT** count.
>
> **Create the todo the moment the first finding is recorded — never rely on memory:** call task tracking → `[Review Phase 6] Why-review findings validation gate — invoke $why-review` so the gate is tracked and cannot be skipped. Inside `$workflow-review-changes`, stop after the report and hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step. Full protocol in **Phase 6**; mirrored in the **Closing Reminders** at the bottom.

## Quick Summary

**Goal:** Review current working-tree, staged, branch, or commit diffs across code, docs, config, infra, and non-code artifacts — finding correctness bugs, flaws, missing updates, stale docs, and convention drift with evidence — so every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.

**Summary:** read-this-if-nothing-else digest —

- **Report-driven and evidence-gated.** Every finding is written to `tmp/reports/code-review-{date}-{slug}.md` with `file:line` proof; speculation is forbidden, "looks fine" is not a verdict, codebase convention (grep 3+ examples) wins over textbook rules.
- **Self-recursive loop is protocol-bound (goal-gated when available).** Standalone mode's FIRST action (Phase -1) binds the review loop as a standing protocol obligation you self-drive — and installs a `/goal` Stop-hook condition WHEN available — so stopping is BLOCKED until the loop converges. Findings are never auto-fixed on sight: validate (Phase 6 `$why-review --validate-findings`, an actual skill call) → SELF-FIX (Phase 7) → restart `$changes-review` from Phase 0 over the WHOLE updated diff (combined with prior fixes, not just the last fix), looping until one whole pass clears that round's exit bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list those LOWs as deferred, never fix-and-loop for them)**. Inside `$workflow-review-changes` you skip Phase -1, stop after the report, and hand findings to the parent (which owns the goal).
- **When code changed, three delegated gates are MANDATORY:** Phase 3.5 `$code-simplifier` (clarity/maintainability), Phase 3.7 `$integration-test-review` Gate-7 coverage (every behavior change → profile-declared canonical scenario/case mapped to executing tests and assertions/results at configured cardinality; the strict default profile uses TCs), and — for every behavior change — Spec Drift Adjudication + the Dual-Feedback Ledger (the gap feeds BOTH spec AND tests).
- **Docs-update is the unconditional terminal step.** Once the loop converges clean, Phase 8 `$docs-update` ALWAYS runs over the full changeset (deferred only to the parent inside the workflow).
- **Optional `--fix-loop` mode (standalone-only) DECOUPLES find from fix.** Each round runs the default review pass INLINE report-only (Phase 0 → Phase 5, fresh task list, stop before Phase 6), then `$why-review --validate-findings` → `$fix` on validated blocking findings → a FRESH full re-review of the changed diff, under a Goal Contract and bound convergence loop (optional `/goal`). Exit bar, round cap 2 (+1 extension on an open round-2 CRITICAL/HIGH), uncapped failing tests, no-shrink/increasing-blocker escalation, and a terminal Phase 8 `$docs-update` all apply. No flag → default behavior unchanged. Full protocol in **Mode: Fix-Loop**.
- **MUST ATTENTION — run ALL main phases in order (the steps AI keeps forgetting):** Phase -1 bind self-recursive review loop — protocol-primary, optional `/goal` gate when available (standalone, FIRST action) → 0 `$graph-blast-radius` → 0.1 change-context + full-pipeline trace (tier FE↔BE + cross-service/event) → 0.3 change-type risk tasks → 0.7 surface-detection dimension tasks → 0.8 parallel full-mode `$why-review` rationale sub-agent, spawned in the SAME batch as the 0.7 agents → 0.5 plan compliance → 1 collect diff + create report → 2 file-by-file review → 3 fresh-context gate (SKIP when findings exist) → 3.5 `$code-simplifier` (code diffs) → 3.7 `$integration-test-review` Gate-7 coverage (behavior diffs) → 4 finalize + Dual-Feedback Ledger → 5 docs triage → 6 `$why-review --validate-findings` → 7 self-fix + full restart from Phase 0 → 7.5 holistic full-mode `$why-review` → 8 `$docs-update` (unconditional terminal) — why: a skipped phase silently drops a guard (coverage, spec-drift, holistic review, or docs sync) and ships unreviewed work.

> **Routing boundary:** This skill reviews a **git diff** — working-tree (default), staged, branch, or commit. For an explicit file-set or SHA-range review, processing received review feedback, or a pre-completion verification gate over already-known scope, use `code-review` instead.

> **Shared engine (keep in sync):** `changes-review` and `code-review` share the same review-protocol `SYNC:` blocks. Canonical source: `.claude/skills/shared/sync-inline-versions.md`; policy: `SYNC:shared-protocol-duplication-policy`. When you change a shared block in one skill, update the canonical file AND the sibling skill so the two never drift. The skills differ only in entry intent (diff vs explicit scope) and diff-specific gates (integration-test-sync, translation-sync, the Phase 3.7 integration-test-review coverage gate) — not in review quality.

> **Current-principles applicability:** At Phase 0.1/0.7, apply `SYNC:review-principle-awareness` and route only relevant scale-ready foundation, Given → When → Then test, AI-agent-as-user, or UI/component obligations to their detailed protocols. Record evidence-backed applicability/status and owner/next step; do not invent unrelated findings or expand a diff review into an unowned refactor.

> **E2E Quality Protocol** — the shared gate covers user-flow intent, stable locators/page objects, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` when the diff contains an executable E2E/browser/user-flow surface; trigger the report-only leaf only when the protocol's applicability evidence is positive.

**Workflow:**

0. **Phase -1: Bind the Self-Recursive Review Loop (FIRST ACTION — standalone-only; protocol-first, `/goal` optional)** — Before any other work, in standalone mode bind the review loop as a standing protocol obligation you self-drive — and, WHEN available, invoke the `/goal` command as an ACTUAL call — with a self-recursive review-loop condition so stopping is BLOCKED until the loop converges: *review the full diff → validate findings (Phase 6) → SELF-FIX validated findings that block the current round (Phase 7) → restart `$changes-review` from Phase 0 over the WHOLE updated diff (combined with the prior fixes, never just re-checking the last fix) → loop until one complete pass clears that round's exit bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list those LOWs as deferred, never fix-and-loop for them)**, then docs-update*. Skip this gate when running as step 1 inside `$workflow-review-changes` (the parent owns the goal). Full procedure in **Phase -1**.
1. **Phase 0: Blast Radius** — Call `$graph-blast-radius` skill FIRST (if `.code-graph/graph.db` exists)
2. **Phase 0.1: Change Context & Full-Pipeline Impact Trace (MANDATORY comprehension-first)** — Note the change context, then holistically trace the main affected area's full pipeline across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classifying each seam/touchpoint NONE/ADDITIVE/BREAKING (explicit N/A for single-tier or monolith)
3. **Phase 0.3: Change Types** — Detect high-risk change types; create risk tasks
4. **Phase 0.7: Surface Detection** — AI categorizes changed files; creates dimension tasks
5. **Phase 0.8: Parallel Rationale Review** — Spawn a full-mode `$why-review` sub-agent in the SAME parallel batch as the 0.7 dimensional agents; its findings merge into the Phase 4 final evaluation (standalone-only)
6. **Phase 0.5: Plan Compliance** — Verify against active plan (conditional)
7. **Phase 1: Collect** — Run git status/diff, create report file
8. **Phase 2: File Review** — Review each changed file, update report incrementally
9. **Phase 3: Fresh-Context Gate** — Skip when findings already exist; run a second-round sub-agent only for an explicit user/workflow/high-risk synthesis trigger
10. **Phase 3.5: Code-Simplifier Optimization (MANDATORY when code files changed)** — Invoke `$code-simplifier` scoped to the changed code files to surface clarity/consistency/maintainability simplifications; record them as findings that flow into the same validation/fix loop (skip docs-only diffs)
11. **Phase 3.7: Integration-Test-Review Coverage Gate (MANDATORY when behavior-bearing code changed)** — Invoke `$integration-test-review` over the full diff; its 8 quality gates audit changed tests AND its Gate 7 (Change Coverage) maps every behavior-changing production file to a covering test (integration-first; unit fallback needs justification) and the profile-declared canonical scenario/case. Strict-default TC mapping applies only when that profile declares it. GAP/SPEC-GAP results become findings for the same validation/fix loop (skip docs-only diffs; deferred to the parent's dedicated step inside `$workflow-review-changes`)
12. **Phase 3.8: Domain Entity Gate (MANDATORY when the diff touches an entity/VO/aggregate)** — Apply `SYNC:domain-entity-change-gate` over the changed domain types; Mode A reviews inline, Mode B delegates to `$domain-entities-review` (its A–P checklist owns the gate). Findings flow into the same validation/fix loop (skip when no domain-entity surface)
13. **Phase 3.9: Conditional E2E Quality Gate (MANDATORY only when Phase 0.7 detects an executable E2E/browser/user-flow surface)** — Invoke `$e2e-test-verify` report-only over the fixed E2E scope; apply the shared GWT/invariant and quality-gate record; findings flow into the same validation/fix loop (skip with evidence-backed `NOT-APPLICABLE` when no trigger)
14. **Phase 4: Finalize** — Generate critical issues, recommendations, suggested commit message
15. **Phase 5: Docs Triage** — Record stale-doc findings for validation/fix loop
16. **Phase 6: Why-Review Findings Validation (standalone-only; REQUIRED before any standalone fix)** — Whenever the report contains one or more findings, you MUST invoke the `$why-review` skill (an actual skill invocation-tool call) with `--validate-findings` to verify every finding is correct, proof-backed, reasonable, and best-practice before fixing. This is a genuine skill invocation — re-reading the cited lines yourself, "self-validating," or any inline/manual substitute does NOT satisfy this gate. When this skill is step 1 inside `$workflow-review-changes`, stop after the report and hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.
17. **Phase 7: Recursive Fix + Full Re-Review Loop (standalone-only)** — If validated findings that block the current round remain in standalone mode, auto-fix those findings, then re-invoke `$changes-review` from Phase 0 with a fresh task breakdown over the full current diff; repeat until an entire review pass clears that round's exit bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list those LOWs as deferred, never fix-and-loop for them)**. When inside `$workflow-review-changes`, parent steps 11–14 (`$plan` → `$plan-review` → `$plan-execute` → conditional step-14 `$why-review` re-review) own plan/fix/restart.
18. **Phase 7.5: Holistic Standalone Full-Mode Why-Review Gate (standalone-only)** — Once the dimensional review/fix loop converges clean, invoke `$why-review` in **FULL mode** (NOT `--validate-findings`) ONCE over the WHOLE review target combined with the current changes as a single artifact — a real standalone `$why-review` call, the same as a user running `$why-review` against the target directly. The per-file/per-dimension reviewers and the Phase 6 validate-findings gate routinely miss holistic design-rationale and whole-package issues that a standalone full-mode review catches. If it surfaces findings, fix only those that block the current round and re-run Phase 7.5 (run→fix→run) until a full-mode pass clears that round's exit bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list those LOWs as deferred, never fix-and-loop for them)**. When inside `$workflow-review-changes`, SKIP this — the parent workflow's dedicated standalone `$why-review` step (step 14) owns the holistic pass.
19. **Phase 8: Mandatory Final Docs-Update Gate (MANDATORY — runs once the review/fix loop clears its current exit bar)** — After the review reaches zero blocking findings for the current round (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOW deferred) and all required fixes are applied, ALWAYS invoke `$docs-update` over the full changeset so no stale docs survive. This is unconditional (not gated on a flagged finding) — `$docs-update` independently detects impacted docs the review may not have surfaced. When inside `$workflow-review-changes`, the parent workflow's `$docs-update` step owns this; do not run it locally.

**Key Rules:**

- **Conditional E2E review lane:** Phase 0.7 detects executable E2E/browser/user-flow artifacts; only a positive trigger runs Phase 3.9 `$e2e-test-verify` report-only with the shared quality protocol. No trigger is an evidence-backed `NOT-APPLICABLE`; this lane is separate from the workflow's conditional runtime/visual `experience-review` step.

- Report-driven: ALWAYS write findings to `tmp/reports/code-review-{date}-{slug}.md`
- MUST ATTENTION create todo tasks for ALL phases before starting
- MUST ATTENTION run `SYNC:review-principle-awareness` during change-context and surface detection; check the detailed protocol only when applicable and record `NOT-APPLICABLE`, `DEFER-AS-OPPORTUNITY`, `UNVERIFIED`, or `BLOCKED` with evidence and ownership.
- Skeptical: every claim needs `file:line` proof
- Verify convention by grepping 3+ existing examples before flagging violations
- Actively check DRY violations, YAGNI/KISS over-engineering, correctness bugs
- When changed files include source code, run the Easy-to-Change gate: estimate future edit sites, coupling, hidden state, duplicated knowledge, unclear intent, and abstraction boundary health
- When changed files include source code, run the Phase 3.5 `$code-simplifier` optimization gate over the changed code files — its simplification opportunities are findings that flow through the same Phase 6 validation → Phase 7 fix loop (never auto-applied unvalidated)
- When changed files include behavior-bearing code, run the Phase 3.7 `$integration-test-review` coverage gate over the full diff — every behavior change must map from its configured canonical scenario/case to a covering test and assertion/result (integration-first; unit fallback needs justification); strict-default TC mapping applies only when declared by that profile. GAP/SPEC-GAP verdicts are findings for the same Phase 6 → Phase 7 loop, never silently logged
- Cross-reference changed files against related docs — flag stale docs, test specs, READMEs
- MANDATORY FINAL step: once the review/fix loop clears the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), ALWAYS run the Phase 8 `$docs-update` sweep over the full changeset — unconditional, never skipped on a clean verdict — why: a clean code review still leaves docs stale unless docs-update reconciles them against the actual changes
- Findings are not eligible for auto-fix until Phase 6 why-review validation returns CLEAN for the current finding set
- FIRST ACTION (standalone): bind the Phase -1 self-recursive review loop — the **protocol loop is the primary, host-independent binding** you self-drive, plus an optional `/goal` Stop-hook gate WHEN available — so stopping is blocked until a complete review pass over the whole diff clears the current round's exit bar; soft "loop until clean" prose alone is not enough, and the protocol binding makes abandoning the loop early impossible whether or not `/goal` exists
- After Phase 6 validation, the skill MUST SELF-FIX every validated finding that **blocks the current round** in Phase 7 (standalone) — a surfaced+validated blocking finding that is reported but left unfixed keeps the review loop open (and, when available, the `/goal` gate). From round 2 onward, a validated LOW is non-blocking: record it under `## Deferred LOW Findings (severity floor, round ≥2)` and do not fix it solely to keep the loop moving; never hand blocking findings back to the user as "recommendations" in standalone mode
- Every fix cycle invalidates the prior review result; restart `$changes-review` from Phase 0 and review the full updated diff AS A WHOLE FROM THE BEGINNING — combined with the prior fixes, NOT just re-reviewing the previous cycle's fix in isolation
- Continue review → validate findings → self-fix → full whole-diff re-review until a complete review pass clears that round's exit bar — **zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; list those LOWs as deferred, never fix-and-loop for them)**; do not add a fresh-context pass just because findings exist or a fix cycle restarted the review
- **Severity floor — from round 2, LOW stops blocking.** Round 1 of the Phase 7 loop require zero findings at any severity. **From round 2 the bar is zero validated CRITICAL/HIGH/MEDIUM — a round whose validated findings are ALL LOW ENDS the loop.** Do NOT restart Phase 0 for LOW findings alone: record them under `## Deferred LOW Findings (severity floor, round ≥2)` in the report and advance to Phase 7.5. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (a required profile-mapped scenario/case or guarding-test gap is HIGH, not a deferrable LOW; under the strict default profile this includes a missing §8 TC). Severity tiers per `SYNC:severity-rubric`.

> **MANDATORY** Plan ToDo Task to discover and READ project-specific reference docs:
>
> 1. Search for code standards docs: `*code-review*`, `*patterns*`, `*conventions*`, `*style-guide*` — read any found
> 2. Search for architecture docs: `*architecture*`, `*adr-*`, `README.md` at service/module roots
> 3. Look for docs referencing changed technology areas (backend, frontend, infra, etc.)
> 4. Read docs most relevant to the categories of files changed

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both artifacts AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

# Code Review: Current Or Branch Diff

Review current changes or explicit branch/commit diffs against project standards.

## Review Scope

Target: current working-tree changes by default; explicit branch/tag/commit diff when user asks branch comparison.

Use these sources:

- Current changes: `git status`, `git diff`, and `git diff --cached`
- Branch diff: `git diff <base>...<head>` plus `git diff --name-only <base>...<head>`
- Commit range: `git diff <base>..<head>` plus `git diff --name-only <base>..<head>`

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

- Verify correctness by reading actual implementations, never accept it at face value
- Every finding MUST include `file:line` evidence (grep results, read confirmations)
- Include a claim only when a trace proves it; otherwise leave it out of the report
- Question assumptions: "Does this actually work?" → trace call path to confirm
- Challenge completeness: "Is this all?" → grep related usages
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what was verified and how

## First Principle — Easy to Change

Apply this gate when diff includes source-code or code-adjacent files
(`.cs`, `.ts`, `.html`, `.scss`, `.css`, tests, scripts, build/config-as-code).
Pure docs-only changes skip this gate except for executable examples or code
snippets.

> **Success metric: _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — all serve one goal: **make next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Favor project-owned boundaries around external libraries, e.g. component/service input-output contracts, when they localize future library changes; reject pass-through wrappers adding ceremony without lowering change cost.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** specific rules, patterns, or checklists below. If downstream rule raises change cost, this principle wins.

---

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused parameters, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. "Is there a simpler way meeting same requirement?"
**DRY** — Actively grep for similar/duplicate code before accepting new code. 3+ similar patterns → flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples. Codebase convention wins over textbook rules.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary values). Check error handling covers failure modes.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation FORBIDDEN.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag stale or missing updates.

> Run `python .claude/scripts/code_graph batch-query <f1> <f2> --json` on changed files for test coverage and caller impact.

## Blast Radius Pre-Analysis (MANDATORY FIRST REVIEW STEP)

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST *review* action in every review — only the Phase -1 self-recursive review-loop binding (standalone) precedes it. Call `$graph-blast-radius` BEFORE any other review work.

If `.code-graph/graph.db` exists, run graph-blast-radius analysis before reviewing changes:

- Call `$graph-blast-radius` skill (runs `python .claude/scripts/code_graph blast-radius --json`)
- Include in review: impacted files count, untested changes, risk level based on blast radius size
- Use results to prioritize file review order (highest-impact files first)

### Graph-Assisted Change Review

For each changed file, trace full impact:

1. `python .claude/scripts/code_graph trace <changed-file> --direction downstream --json` — all files affected by changes
2. Flag any affected file NOT covered by tests
3. Catches cross-service impact simple diff review misses

## Review Approach (Report-Driven Multi-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks for Review Phases**
Before starting, call task tracking with:

- [ ] `[Review Phase -1] Bind self-recursive review loop — protocol-primary; optional /goal gate when available (standalone-only; skip inside $workflow-review-changes)` - in_progress **(MUST ATTENTION BE FIRST)**
- [ ] `[Review Phase 0] Run $graph-blast-radius to analyze change impact` - pending **(FIRST review step after the goal gate)**
- [ ] `[Review Phase 0.1] Note change context + holistic full-pipeline trace across BOTH boundaries — client↔server tier (FE↔BE) AND service/event/external — classify each seam/touchpoint NONE/ADDITIVE/BREAKING` - pending **(MANDATORY comprehension-first; record explicit N/A for single-tier or monolith)**
- [ ] `[Review Phase 0.3] Detect high-risk change types, create risk tasks` - pending
- [ ] `[Review Phase 0.7] Categorize changed files, create dimension review tasks` - pending
- [ ] `[Review Phase 0.8] Spawn parallel $why-review full-mode rationale sub-agent in the SAME batch as the Phase 0.7 dimensional agents; merge its findings into the final evaluation` - pending **(MANDATORY standalone; skip inside `$workflow-review-changes` — parent step 2 (`$why-review --target=whole-review-target`) owns it)**
- [ ] `[Review Phase 0.5] Plan compliance check (skip if no active plan)` - pending
- [ ] `[Review Phase 1] Get changes and create report file` - pending
- [ ] `[Review Phase 2] Review file-by-file and update report` - pending
- [ ] `[Review Phase 3] Evaluate fresh-context gate; skip when findings already exist` - pending
- [ ] `[Review Phase 3.5] Run $code-simplifier on changed code files to optimize code quality` - pending **(MANDATORY when code files changed; skip docs-only diffs)**
- [ ] `[Review Phase 3.7] Run $integration-test-review coverage gate over full diff` - pending **(MANDATORY when behavior-bearing code changed; skip docs-only diffs; deferred to parent step inside `$workflow-review-changes`)**
- [ ] `[Review Phase 3.8] Run the domain entity change gate over changed entities/VOs/aggregates` - pending **(MANDATORY when the diff touches an entity, value object, or aggregate; skip otherwise)**
- [ ] `[Review Phase 4] Generate final review findings` - pending
- [ ] `[Review Phase 5] Record stale-doc findings for validation/fix loop` - pending
- [ ] `[Review Phase 6] Why-review findings validation gate before any fix` - pending **(MANDATORY when findings exist)**
- [ ] `[Review Phase 7] Auto-fix validated findings that block the current round and restart $changes-review from Phase 0` - pending **(MANDATORY when validated blocking findings remain; round-2 LOW-only findings are deferred)**
- [ ] `[Review Phase 7.5] Run standalone full-mode $why-review over the whole target+diff; fix and re-run until the current round bar is clear` - pending **(MANDATORY when review loop converges clean; standalone-only — skip inside `$workflow-review-changes`)**
- [ ] `[Review Phase 8] Run $docs-update over full changeset to sync all impacted docs` - pending **(MANDATORY FINAL — always runs once the current round bar is clear; never skipped)**

Update todo status as each phase completes.

> **`--fix-loop`:** plan the Fix-Loop Step 0 → Step 3 tasks first; inside every round create this Phase 0 → Phase 5 list FRESH and omit Phase -1 and Phases 6-8 (the mode's own steps own them).

> **Note:** If Phase 1 reveals 10+ changed files, replace Phase 2-4 tasks with Systematic Review Protocol tasks:
> `[Review Phase 2] Categorize and fire parallel sub-agents`, `[Review Phase 3] Synchronize and cross-reference`, `[Review Phase 3.5] Run $code-simplifier on changed code files`, `[Review Phase 3.7] Run $integration-test-review coverage gate`, `[Review Phase 4] Generate consolidated report`

**Phase -1: Bind the Self-Recursive Review Loop (FIRST ACTION — standalone-only; protocol-first, `/goal` optional)**

> **IMPORTANT MANDATORY MUST ATTENTION:** This is the VERY FIRST action in standalone mode — before Phase 0, before any git/graph command. Its purpose is to make the review→fix→re-review loop UNABANDONABLE. The loop is bound by TWO layers: the **protocol loop (primary, host-independent)** you self-drive, plus an **optional `/goal` accelerator** (a session Stop hook) WHEN available. Correctness rides on the protocol loop — hooks/commands are accelerators only, so `/goal`'s absence NEVER weakens it.

**Entry gate:**

- **Run** in standalone invocation (user called `$changes-review` directly).
- **SKIP** when this skill is invoked as step 1 inside `$workflow-review-changes` — the parent workflow owns the loop goal (its own Phase -1 / step-0 goal gate). Record: `Phase -1 deferred to parent $workflow-review-changes goal gate.`
- **SKIP** when `--fix-loop` is set — Fix-Loop Step 0b owns the single convergence binding and every round's review pass is report-only. Record: `Phase -1 deferred to --fix-loop Step 0b.`

**Procedure:**

1. Set the `[Review Phase -1]` task to `in_progress`.
2. **Protocol loop — ALWAYS binding (hook/command-independent).** You, the running agent, are personally responsible for not stopping until the loop below converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

    > Review the full diff → run `$why-review --validate-findings` on every finding → SELF-FIX each validated finding that blocks the current round → restart `$changes-review` from Phase 0 over the WHOLE updated diff (combined with the prior fixes, not just the last fix) → loop until one complete review pass clears that round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, a LOW-only round ENDS the loop with the LOWs recorded as deferred) → then run Phase 7.5: one standalone FULL-mode `$why-review` over the whole target+diff (NOT `--validate-findings`), fixing only findings that block the current round and re-running until that bar is clear → only then run the Phase 8 `$docs-update`. Do not stop while any validated blocking finding is unfixed, any review pass is non-clean at its current round bar, or the holistic full-mode `$why-review` has unaddressed blocking findings; round-2 LOW-only findings are recorded and deferred, not fixed to manufacture another round.

3. **`/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (the actual command, NOT a paraphrase) with the SAME condition, so a session Stop hook mechanically enforces the loop:

    ```
    /goal changes-review self-recursive loop: review the full diff → run $why-review --validate-findings on every finding → SELF-FIX each validated finding that blocks the current round → restart $changes-review from Phase 0 over the WHOLE updated diff (combined with the prior fixes, not just the last fix) → loop until one complete review pass clears that round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, a LOW-only round ENDS the loop with the LOWs recorded as deferred) → then run Phase 7.5: one standalone FULL-mode $why-review over the whole target+diff (NOT --validate-findings), fixing only findings that block the current round and re-running until that bar is clear → only then run the Phase 8 $docs-update. Do not stop while any validated blocking finding is unfixed, any review pass is non-clean at its current round bar, or the holistic full-mode $why-review has unaddressed blocking findings; round-2 LOW-only findings are recorded and deferred, not fixed to manufacture another round.
    ```

    The `/goal` Stop hook blocks stopping until that condition holds and auto-clears when it does — do not tell the user to clear it. **If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record `/goal accelerator unavailable — review loop bound by protocol (Phase -1 step 2)` on the `[Review Phase -1]` task and proceed; the protocol loop IS the gate, enforced by discipline instead of a hook.

4. Set the `[Review Phase -1]` task to `completed` and proceed to Phase 0.

> **Why bind the loop, not just prose:** the loop rules below ("restart from Phase 0", "continue until the current exit bar is clear") are soft directives an agent can rationalize away after one cycle. Binding them as a standing protocol obligation (and, WHEN available, a `/goal` Stop hook) converts them into a mechanical block — the session cannot end with a validated CRITICAL/HIGH/MEDIUM finding still unfixed or a non-clean round-1 pass; validated LOWs may be deferred from round 2 onward and must remain visible in the report. — why: a review that reports blocking findings but stops before fixing-and-reproving them ships unreviewed work.

**Phase 0: Run Graph Blast Radius Analysis (MANDATORY FIRST REVIEW STEP)**

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST review step, after the Phase -1 goal gate and before ANY other review work.

- Call `$graph-blast-radius` skill
- Record in report: changed files count, impacted files count, untested changes, risk level
- Use blast radius output to prioritize which files to review most carefully in Phase 2
- If `.code-graph/graph.db` does not exist, note "Graph not available — skipping blast radius" and proceed to Phase 0.1

**Phase 0.1: Change Context Comprehension & Full-Pipeline Impact Trace (MANDATORY — comprehension-first)**

> **IMPORTANT MANDATORY MUST ATTENTION:** First *comprehension* step — before any file-by-file or dimensional review. Blast radius (Phase 0) gathers impact data; here holistically UNDERSTAND the change, trace main affected area's full pipeline across every boundary it crosses. Apply BOTH the **Cross-Stack Impact Trace** and **Cross-Service Check** protocols (bodies in the SYNC section below). This holistic first-pass map FEEDS the later Phase 0.3 change-type risk tasks and the conditional Phase 3 synthesis — does not replace them.

Write a one-paragraph **Change Context** note (what changed · intent · originating tier · main affected feature/flow), then run both traces per the **Cross-Stack Impact Trace** and **Cross-Service Check** protocols (SYNC blocks below).

**Parent workflow boundary:** Inside `$workflow-review-changes`, still RUN Phase 0.1 (comprehension is local review value) but hand findings to the parent — same pattern as Phase 3.5/3.7.

**Phase 0.3: Change Type Detection + Risk Tasks (MANDATORY)**

> **Purpose:** Identify HIGH-RISK change types in this diff before dimensional review.
> Each detected type creates a focused risk task. Change types are ORTHOGONAL to file category:
> the same file can be both a migration AND a security change — detect all independently.

**Step 1: Detect change types**

```bash
git diff --name-only HEAD       # unstaged
git diff --cached --name-only   # staged
# For branch or commit-range review, use the user-provided diff source:
git diff --name-only <base>...<head>
```

Evaluate each change type for this diff:

| Change Type        | Detection Signal (adapt to project's actual conventions)                                                                            | TRUE if...                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **DepUpgrade**     | Dependency manifest changed (`package.json`, `*.csproj`, `Gemfile`, `go.mod`, `requirements.txt`, `Cargo.toml`, `pom.xml`, etc.)    | A version number changed in any dependency manifest       |
| **Migration**      | File path or name suggests schema change (contains `migration`, `schema`, `alter_table`, or matches project's migration convention) | Any migration-convention file appears in the diff         |
| **BusEvent**       | New or modified event/message definition or consumer (infer from project conventions: consumer naming, message type directories)    | A consumer or event class is new or its contract changed  |
| **ApiContract**    | API definition file changed (controller, route handler, OpenAPI/GraphQL schema) with route or field differences                     | Diff shows route/action/field additions or removals       |
| **SecurityChange** | Auth/permission definition changed — infer from project conventions (auth middleware, permission constants, policy definitions)     | Any auth or permission gate is added, removed, or changed |
| **ConfigChange**   | Configuration files changed (e.g., `*.json`, `*.yaml`, `*.env*`, `*Config*`, `*Options*`, `*Settings*`, `*.toml`)                   | Any config-convention file appears                        |
| **InfraChange**    | Infrastructure definition changed (`Dockerfile`, `docker-compose*.yml`, CI/CD pipelines, k8s manifests, IaC files)                  | Any infra-convention file appears                         |

Record in report:

```
## Change Type Analysis
DepUpgrade: [YES/NO] | Migration: [YES/NO] | BusEvent: [YES/NO]
ApiContract: [YES/NO] | SecurityChange: [YES/NO] | ConfigChange: [YES/NO] | InfraChange: [YES/NO]
```

**Step 2: Create change-type risk tasks (ALWAYS before any review work)**

> **MANDATORY:** Call task tracking for each TRUE signal. Do NOT create tasks for FALSE signals.
> The concerns listed are starting points — apply domain knowledge beyond them.

| Condition           | task tracking subject                                                                                   | Key concerns to investigate (starting points — expand with domain knowledge)                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DepUpgrade TRUE     | `[Review-DepUpgrade] Dependency upgrade — semver, breaking changes, security advisories`             | Major/minor/patch? Read upstream CHANGELOG for breaking API changes. Grep deprecated API usage. Check transitive dependency changes. Known security advisories for new version? Peer dependency compatibility? Tests still passing?                                   |
| Migration TRUE      | `[Review-Migration] DB migration — rollback path, volume impact, zero-downtime`                      | Rollback/Down script exists? Table size estimate — large tables need lock analysis. NOT NULL column without default on non-empty table? Indexes created with no-lock option? Deployment ordering (before/after service deploy)? Backfill idempotent if run twice?     |
| BusEvent TRUE       | `[Review-BusEvent] Cross-service event/message — consumer, idempotency, retry, poison pill`          | Consumer exists for new event? Retry strategy: prerequisite data not synced → wait-retry vs silent skip? Handler safe to run twice (idempotency)? Malformed message handling / dead-letter configured? Ordering assumptions vs broker guarantees?                     |
| ApiContract TRUE    | `[Review-ApiContract] API contract change — backward compat, client alignment, auth`                 | Additive or breaking? Breaking → versioning or coordinated deploy required. All callers (UI, other services, tests) still compatible? New endpoint protected appropriately? No required response fields added without client update?                                  |
| SecurityChange TRUE | `[Review-SecurityChange] Security/permission change — all paths covered, no privilege escalation`    | All code paths reaching the gate covered? Negative test verifying unauthorized access DENIED? Privilege escalation possible? BOTH enforcement AND display control updated? Permission definition in single authoritative place (no duplicated strings risking drift)? |
| ConfigChange TRUE   | `[Review-ConfigChange] Config/env change — all environments, no secrets committed`                   | New config key present in ALL environment configs? Hardcoded default masking missing production config? Any secret value in the diff? → CRITICAL if yes. Documented in setup guide? App fails fast if config missing?                                                 |
| InfraChange TRUE    | `[Review-InfraChange] Infrastructure change — env parity, no dev values in prod, reproducible build` | Change affects all environments consistently? Hardcoded dev values (localhost, debug flags, dev credentials)? Pinned image/dependency versions? Local dev impact documented? CI/CD secret/permission requirements documented?                                         |

**AI-SDD risk lenses:** Apply these lenses when the changed files touch specs, workflows, tooling, or shared guidance.

| Lens                     | Review focus                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Contract/API/routes      | Public behavior, clients, generated specs, and regression tests still agree.                   |
| Permissions/security-review     | Enforcement, display controls, negative tests, and authoritative permission definitions align. |
| Config/flags             | All environments, examples, fail-fast behavior, and docs are current.                          |
| Docs/spec/test drift     | Canonical specs, profile-declared scenarios/cases, dashboards, and mapped executing tests are synchronized or explicitly N/A. Section 8 TCs apply only under the strict default profile. |
| Generated mirrors        | Shared skill/workflow/tooling changes were synced to generated agent surfaces.                 |
| Reference-only artifacts | AI-extracted spec or test-case artifacts remain draft/reference until accepted by the configured owner/review gate. |

**Step 3: Work through change-type tasks before dimensional review**

For each created change-type task:

1. Set task to `in_progress`
2. Work through ALL applicable concerns — the table above is a starting point, not a ceiling
3. For each concern: cite `file:line` for PASS or describe finding for FAIL/WARN
4. Write findings under `## {Task Subject} Findings` in report
5. Set task to `completed`

> **IMPORTANT:** Complete ALL change-type tasks FIRST, then proceed to Phase 0.7.
> If no change-type signals detected, log `"No high-risk change types detected"` and proceed.

**Phase 0.7: Change Surface Detection + Dynamic Review Tasks (MANDATORY)**

> **Purpose:** Let AI categorize the changes by nature and create review tasks accordingly.
> Derive categories from what the project's actual changed files are, never assume a fixed set.
> **Think, don't classify into a preset grid.** The AI owns this step entirely.

**Step 1: Derive categories from the diff**

```bash
git diff --name-only HEAD        # unstaged
git diff --cached --name-only    # staged
# For branch or commit-range review, use the user-provided diff source:
git diff --name-only <base>...<head>
```

For each changed file, infer its category by examining:

- **Language/extension:** What technology or domain does this file belong to?
- **Directory semantics:** What layer, module, or concern does this path represent in the project?
- **Change nature:** Is this logic, data schema, configuration, documentation, infrastructure, styling, testing, or tooling?

**Do NOT map to fixed buckets.** Derive categories that fit the current repository's actual structure and vocabulary.

Common category types to consider as starting points (not exhaustive — derive what fits):

- _Server-side logic_ — business rules, API handlers, services, consumers, event processors
- _Client-side logic_ — UI components, state management, API integration
- _Data/Schema_ — migrations, schemas, seed data, domain models
- _Styles/Assets_ — CSS/SCSS, design tokens, images, fonts
- _Configuration_ — app settings, env vars, feature flags
- _Infrastructure_ — Docker, CI/CD, pipelines, cloud manifests
- _Documentation/Specs_ — markdown docs, ADRs, feature specs, test specs
- _Tests_ — unit, integration, E2E test files
- _Build/Tooling_ — build scripts, linters, formatters, bundlers, agent scripts
- _Security_ — auth config, permission definitions, certificates

Record in report:

```
## Change Surface
{Category name} ({category type}): {N} files
{Category name} ({category type}): {M} files
...
```

**Step 2: For each category, enumerate concerns and create a task**

> **This is where you THINK, not fill in blanks.** Apply `SYNC:category-review-thinking` for each category.

For EACH identified category:

1. **Understand the domain:** What is this category's purpose? What invariants govern it? Who depends on it?
2. **Read project conventions:** Grep for style guides, patterns docs, READMEs specific to this area
3. **Derive concerns from first principles** — DO NOT limit to any fixed list; trust your domain knowledge
4. **Create a task tracking task** named `[Review-{Category}] {brief concern summary}` listing derived concerns
5. **Select the appropriate sub-agent type** (see Sub-Agent Type Selection)

> **ALWAYS create:** `[Review-General]` — universal quality: correctness, YAGNI/KISS/DRY, doc staleness, test coverage. Runs across ALL changed files regardless of other categories.

**Sub-Agent Type Selection:**

| Category Nature                        | `agent_type`         |
| -------------------------------------- | ----------------------- |
| Code logic (any stack)                 | `code-reviewer`         |
| Implements a documented spec/PBI       | `spec-compliance-reviewer` (pre-pass, before `code-reviewer`) |
| Security, auth, permissions            | `security-auditor`      |
| Performance, query efficiency, latency | `performance-optimizer` |
| Documentation, plans, specs, ADRs      | `general-purpose`       |
| Infrastructure, CI/CD, config          | `general-purpose`       |
| Mixed or default                       | `code-reviewer`         |

> **Spec-compliance pre-pass (when the changeset implements a capability documented under the business spec root — default `docs/specs/**`, overridable via `specRoots.business.path` in `docs/project-config.json` — or a PBI/story):** spawn `spec-compliance-reviewer` FIRST — it verifies the implementation matches the spec (catches spec drift, missing requirements, extra features) BEFORE the `code-reviewer` quality pass runs. Skip when no spec/PBI governs the change (then `code-reviewer` is the sole code pass). This is the one wired dispatch site for `spec-compliance-reviewer` (`sub-agent-selection-guide.md` "Spec compliance" row).

> **UI/frontend dimension (OWNED by this skill):** When a _Client-side logic_ or _Styles/Assets_ category surfaces frontend files matching the project's configured frontend/UI file patterns, `$changes-review` owns the UI review and invokes `$ui-review` as its UI dimension — preferably as a dedicated `ui-ux-designer` sub-agent spawned in the same parallel batch as the other dimensional agents (inline-fold its checklist only when sub-agent spawning is unavailable). The checklist: long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen via flex, flex-grow vs fixed sizing (prefer min/max + flex over fixed px), z-index scale discipline (no raw numbers, no `!important`), and project-selected styling conventions. This is the SAME behavior in both standalone and workflow contexts — `$ui-review` is NOT a separate workflow step; it always runs here. Skip entirely if no frontend files changed.

### Conditional E2E/browser/user-flow trigger

Apply `.claude/skills/shared/e2e-quality-protocol.md` after deriving categories and before spawning the dimensional wave:

- **Trigger only** for changed executable E2E test/spec files, browser configuration, fixtures, page/component objects, browser helpers, recordings, or source changes that alter an exercised user journey. A `.claude/skills/**` or documentation file that merely mentions E2E is not a trigger.
- Record trigger paths and config/reference evidence. Positive evidence creates `[Review-E2E] Shared E2E quality gate — intent, object model, isolation, auth, visual/accessibility, waits, evidence, cleanup, traceability` and marks the lane `APPLICABLE`.
- With no trigger, record `E2E quality gate: NOT-APPLICABLE — no executable E2E/browser/user-flow surface in the diff` and do not invoke an E2E verifier. This keeps the lane optional for ordinary reviews.
- A positive trigger with a missing runnable framework, auth/data path, browser, service, or evidence capability remains `ENVIRONMENT-BLOCKED`; never downgrade it to `NOT-APPLICABLE` or PASS.

**Step 2.5: Declare the Dimensional Wave (MANDATORY before spawning any reviewer)**

> **Purpose:** the dimensional reviewers are read-only over the same frozen diff and share no write target — they are ONE wave, not a queue. This declaration lives in the SKILL, not only in a parent workflow's injected context, because standalone runs receive no injected context at all and would otherwise serialize the batch.

1. **Spec-compliance pre-pass FIRST, then declare and spawn the wave in ONE message.** When a documented spec/PBI governs the change, spawn `spec-compliance-reviewer` ALONE and let it RETURN before wave 1 is spawned — its completion is a precondition for the wave, per the pre-pass rule above — why: a pass running concurrently with the pass it precedes is not a pre-pass, and the parallel-dispatch protocol below forbids parallelizing an order this skill explicitly fixes. When no spec/PBI governs the change, record the skip and spawn the wave immediately — a skipped pre-pass NEVER delays it. Then declare: `Parallel plan: SEQ pre-pass = [spec-compliance-reviewer (conditional — returns BEFORE wave 1 is spawned)] · wave 1 = [every [Review-{Category}] agent from Step 2, [Review-General], ui-review (conditional), Phase 0.8 $why-review] · SEQ = [Phase 4 consolidation, Phase 6 validation, Phase 7 fixes] (each consumes the whole wave)`.
2. **Batch members** = every `[Review-{Category}]` task created in Step 2 + the always-created `[Review-General]` + the Phase 0.8 `$why-review` rationale agent, each routed per **Sub-Agent Type Selection** above (`code-reviewer`, `security-auditor`, `performance-optimizer`, `ui-ux-designer`, `general-purpose`).
3. **Conditional members are skipped ENTIRELY when their trigger files are absent — and a skipped member counts as "returned"** for the barrier; never hold the wave open for an agent that was correctly never spawned. Record each skip with its trigger: `ui-review` (no frontend files in the diff) and any derived category with no changed files.
4. **The batch is READ-ONLY.** No member edits code, docs, or specs — findings only, each with `file:line` proof, persisted incrementally to its own `tmp/reports/` file. Many agents reading one file is safe; any agent WRITING during the wave races the diff every other agent is reading.
5. **Barrier before every mutating step.** Phase 4 consolidation waits for ALL members; `$code-simplifier` (3.5), Phase 7 fixes, and the Phase 8 `$docs-update` act only on the consolidated post-barrier snapshot — consolidating on a partial agent set silently drops a whole dimension's findings.
6. **One level deep.** A dimensional reviewer reviews its own file set and does not fan out further; a category too large for one agent escalates through `SYNC:systematic-review-batching` (size-capped batches), which YOU orchestrate.

**Inside `$workflow-review-changes`:** this local wave is nested INSIDE parent step 1 and covers only this skill's own dimensions; the parent's own parallel groups and barriers are declared in `.claude/workflows.json` (the authority — read them there, never restate them here), and each phase's workflow-mode entry gate owns its own defer/skip rule.

**Phase 0.8: Parallel Why-Review Rationale Dimension (MANDATORY — spawned in the SAME batch as the Phase 0.7 dimensional agents)**

> **Purpose:** every Phase 0.7 dimensional reviewer is *scoped* — one category, one file set, one concern. NONE asks the rationale question: *was this change the right call, and does its reasoning survive an adversarial pass?* `$why-review` owns it. Run it CONCURRENTLY with the dimensional agents so rationale findings enter the finding set from the START and flow through the same validate → fix → re-review loop as every other finding; NEVER defer them to Phase 7.5, where fixes already rest on an unquestioned premise. — why: a diff can be clean on every dimension and still be the wrong change; discovering that after the loop converges wastes the whole loop.

**Entry gate:**

- **Run** in standalone mode on EVERY diff — code, docs, specs, config. NEVER exempt one as "too small to have a rationale".
- **SKIP** inside `$workflow-review-changes` — parent step 2 (`$why-review --target=whole-review-target`) runs immediately after this skill and owns the rationale pass. Record: `Phase 0.8 deferred to parent workflow $why-review step (2).` — why: firing here AND at parent step 2 reviews the identical target twice, back to back.

**Protocol:**

1. Set the `[Review Phase 0.8]` task to `in_progress`.
2. **Spawn ONE `spawn_agent` sub-agent (`agent_type: general-purpose`) in the SAME parallel batch as the Phase 0.7 dimensional agents** — one message, all agents together — so review runs concurrently, NEVER as a blocking pre-step. Its prompt MUST invoke `$why-review` in FULL mode (an actual skill invocation call, NOT `--validate-findings`) over the Phase 1 diff + the Phase 0.1 Change Context note, and MUST carry all four constraints below verbatim.
3. **Report-only constraints (ALL FOUR are binding on the sub-agent):**

    | Constraint | Rule |
    | --- | --- |
    | **NEVER bind the `/goal` gate** | The sub-agent MUST record `/goal accelerator unavailable — sub-agent context` and rely on why-review's protocol loop instead — why: a sub-agent cannot own the session Stop hook, so a goal bound there silently never fires. |
    | **NEVER fix anything** | Return findings only. Phase 7 owns fixes, after Phase 6 validates them — why: a sub-agent fixing in parallel with reviewers races the diff the other agents are reading. |
    | **SKIP the Integration-Test-Review Linkage** | Record the deferral line; `$changes-review` Phase 3.7 owns the `$integration-test-review` audit — why: running it here duplicates a full 8-gate audit in the same review. |
    | **NEVER invoke `$changes-review`** | This skill is the caller — why: a callback closes a `changes-review → why-review → changes-review` cycle. |

4. **Capture — NEVER auto-fix.** Integrate the returned `SYNC:subagent-return-contract` summary into the main report under `## Why-Review Rationale Findings`, preserving each finding's `file:line` proof, severity, confidence.
5. Set the `[Review Phase 0.8]` task to `completed` once the sub-agent returns. Per the parallel-phase barrier, advance to Phase 4 consolidation ONLY after this agent AND every Phase 0.7 dimensional agent has returned — why: consolidating on a partial agent set silently drops a whole dimension's findings.

**Pipeline integration:** Phase 0.8 findings are ORDINARY findings — consolidated in Phase 4 (Final Review Result), validated in Phase 6 (`$why-review --validate-findings`), fixed in Phase 7 ONLY once validated. They also arm the Phase 3 entry gate: rationale findings count as "findings already exist", so Phase 3's fresh-context pass is skipped exactly as for any other finding.

**Relationship to Phase 7.5 — DISTINCT gates, NEITHER replaces the other:**

| Gate | Reviews | When | Catches |
| --- | --- | --- | --- |
| **Phase 0.8** (this gate) | the diff **as authored**, pre-fix | start, in parallel | a wrong premise, before the fix loop builds on it |
| **Phase 7.5** | the **post-fix package**, whole target + every Phase 7 fix read together | after the loop converges clean | rationale defects the FIXES introduced, which 0.8 could not have seen |

> A clean Phase 0.8 NEVER exempts Phase 7.5, and vice versa — they review different artifacts at different times. Recording one as satisfying the other is a skipped gate.

**Step 3: Work through tasks in order**

For each created task:

1. Set task to `in_progress` before starting
2. Review ONLY files in that category's scope
3. Apply `SYNC:category-review-thinking` — trust your domain knowledge beyond the examples there
4. Write findings to report under `## {Task Subject} Findings` section
5. Set task to `completed` before starting next task

> **NEVER mark a dimension task completed by scanning.** Work through each relevant file explicitly.
> For large categories (10+ files): escalate to a parallel sub-agent using the Systematic Review Protocol.

**Phase 0.5: Plan Compliance Check (CONDITIONAL — only when active plan exists)**

Check `## Plan Context` in injected context:

- If "Plan: none" → skip, log "No active plan — skipping plan compliance"
- If "Plan: {path}" → load plan and verify:

1. Read `{plan-path}/plan.md` — get phase list and scope
2. Read relevant phase files — extract files to modify, test specifications, success criteria
3. Verify (**MUST ATTENTION** — all four):
    - **Scope match** — changed files listed in plan phases (warn on unplanned files)
    - **Test evidence** — tests mapped to completed phases have evidence (file:line), not "TBD"
    - **Success criteria met** — phase success criteria satisfied by changes
    - **Test intent traceability** — mapped tests name the business rule/invariant they protect, not just current behavior
4. Add "Plan Compliance" section to review report

**Phase 1: Get Changes and Create Report File (MUST ATTENTION)**

- Identify diff source: current working tree, staged changes, branch comparison, or commit range
- Run `git status` for current changes, or `git diff --name-only <base>...<head>` for branch comparisons
- Run `git diff` or `git diff <base>...<head>` to see actual changes
- Create `tmp/reports/code-review-{date}-{slug}.md`
- Initialize with Scope, Files to Review, Blast Radius Summary sections

**Phase 2: File-by-File Review (Build Report Incrementally)**

For EACH changed file, read and **immediately update report** with:

- File path and change type (added/modified/deleted)
- Change Summary: what modified/added
- Purpose: why change exists
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic paths — handles null, empty, boundary values, error cases?
- **DRY check:** Grep similar/duplicate code — does this logic already exist elsewhere?
- **Intention check:** Does change serve stated purpose? Flag unrelated modifications
- **Logic trace:** Trace one happy path + one error path. Logic matches requirements?
- **Semantic correctness:** Does the artifact DO what it's supposed to?
- Issues Found: naming, typing, responsibility, patterns, bugs, over-engineering, logic errors
- Continue to next file, repeat

**Phase 3: Fresh-Context Gate (Conditional Protocol — branch on findings and Phase 0.7 surface)**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above).
> **INVARIANT:** Phase 3 is review-only. It may add findings, but it MUST NOT fix or validate them. Existing findings do not require a fresh-context re-review; any non-zero finding set flows to Phase 6 why-review validation, then Phase 7 auto-fix + full `$changes-review` restart from Phase 0. A Phase 7 restart alone is NOT a Phase 3 trigger.

**Entry gate:**

1. If Phase 2 or any dimensional review already found findings, **SKIP Phase 3**. Record: `Skipped fresh-context pass because findings already exist; Phase 6 why-review validation is the required next gate.` Then proceed to Phase 4 consolidation and Phase 6 validation.
2. If there are zero findings and no explicit independent-review trigger, **SKIP Phase 3**. Record: `Skipped fresh-context pass because the current review is clean and no second-round trigger exists.` Then proceed to Phase 4 finalization.
3. Run Phase 3 only when the current finding set is zero **and** at least one trigger exists:
    - the user explicitly requested a second-round/fresh-context review;
    - the selected workflow explicitly requires an independent reviewer for this invocation;
    - high-risk multi-domain changes need synthesis before a clean verdict.

**Anti-waste rule:** Do not run Phase 3 to re-review known findings before Phase 6. Do not run Phase 3 solely because Phase 7 restarted the review after fixes. The restarted review is already the required full pass; if it has zero findings and no explicit trigger above, finalize cleanly.

If the entry gate allows Phase 3, check categories from Phase 0.7 — if multiple distinct domains changed (e.g., server-side + client-side), run **Synthesis Mode**. Otherwise run **Holistic Mode**.

---

**[SYNTHESIS MODE — when multiple distinct domains changed]**

Spawn a **Synthesis Agent** as Round 2. Purpose: catch cross-boundary issues individual dimensional tasks cannot see.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim, `agent_type: "code-reviewer"`
2. Embed all 11 universal SYNC blocks verbatim
3. Set Task as:

    ```
    Synthesis review — cross-boundary concerns ONLY across the changed domains in this diff.
    You have these dimensional findings as context: {summary from each dimensional task}.
    Re-read ALL changed files from scratch via your own tool calls.

    Focus ONLY on cross-boundary concerns — do NOT re-review each domain's internals:
    1. Contract Alignment: Do callers match what callees expose? (routes, parameters, field names, types)
    2. Data Consistency: Are field names/types consistent across layer boundaries?
    3. Security Boundary: Is auth enforced on BOTH sides (enforcement AND display control)?
    4. Cross-Layer Naming: Same concept named differently across layers?
    5. Missing Wiring: New producer with no consumer? New consumer with no producer? New feature with no doc?
    6. Documentation: Docs reflect changes in BOTH domains together?
    ```

4. Set Target Files as `"use the selected diff source from Phase 1"`
5. Set report path as `tmp/reports/synthesis-review-{date}.md`

After sub-agent returns:

1. **Read** synthesis report
2. **Integrate** findings as `## Synthesis Round Findings` in main report — DO NOT filter or override
3. **If findings exist:** do NOT fix here; mark Phase 3 complete and proceed to Phase 6 why-review validation
4. **If no findings exist:** proceed to Phase 4 finalization as a clean synthesis pass

---

**[HOLISTIC MODE — when single domain changed]**

No cross-boundary synthesis needed. Spawn standard holistic Round 2.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Select `agent_type` based on domain's dominant concern (see Sub-Agent Type Selection)
3. Set Task as: `"Review the selected diff holistically. Focus on big picture — overall technical approach coherence, architecture layers, logic placement (lowest layer), DRY violations, YAGNI/KISS, function complexity. Domain: {category from Phase 0.7} — apply domain knowledge for this category accordingly."`
4. Set Target Files as `"use the selected diff source from Phase 1"`
5. Set report path as `tmp/reports/changes-review-round{N}-{date}.md`

After sub-agent returns:

1. **Read** sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in main report — DO NOT filter or override
3. **If findings exist:** do NOT fix here; mark Phase 3 complete and proceed to Phase 6 why-review validation
4. **If no findings exist:** proceed to Phase 4 finalization as a clean holistic pass
5. **Final verdict** must incorporate findings from ALL review passes executed in this invocation

The following checks are handled by sub-agent but can be verified in Phase 4:

**Clean Code & Over-engineering Checks:**

- MUST ATTENTION **YAGNI:** Code solving hypothetical future problems? Unused params, speculative interfaces?
- MUST ATTENTION **KISS:** Unnecessarily complex solution? Could this be simpler while meeting the same requirement?
- MUST ATTENTION **Function complexity:** Methods too long? Nesting too deep? Multiple responsibilities?
- MUST ATTENTION **Readability:** Would a new team member understand without reading the full implementation?

**Documentation Staleness Check (REQUIRED):**

For each changed file, identify related documentation:

- Search for feature docs, architecture references, READMEs at module/service roots, API docs, test specs, setup guides
- Flag any doc where content no longer matches the changed artifact
- Flag missing docs for new features or components that should be documented
- **Flag in the report** with the specific stale section and what changed. Do not fix yet; Phase 6 must validate the finding before Phase 7 invokes `$docs-update` or applies doc edits.

**Spec Drift Adjudication (REQUIRED when behavior changed):** Apply `SYNC:spec-drift-adjudication`. Resolve the business root and native representation from `docs/project-config.json` and the required project-reference docs before review; compare every behavior-bearing change against its configured canonical owner. Classify divergence as **CODE-WRONG** (change violates an intended requirement/invariant → BLOCKING finding, fix code/test), **SPEC-STALE** (intentional behavior change the canonical owner no longer reflects → route to `$spec [update]` and reconcile its profile-declared scenario/case plus executing tests), **AMBIGUOUS** (ask the user directly before editing either side), or **SPEC-SILENT** (code correctly enforces an invariant no canonical artifact states → ENRICH the configured owner with the missing requirement/invariant and scenario/case, then ensure an actual guarding test is mapped to its assertion/result at the declared cardinality). Record the verdict per changed behavior (`Spec in sync` when no divergence). Do not normalize drift just because code/tests pass. This is the bidirectional generalization of the post-bugfix check — it runs for ALL behavior-changing reviews. Flag findings here; Phase 6 validates and Phase 7 fixes. The strict default profile represents enrichment as §4 BR/§3 AC + §8 TC; a native profile uses its declared owner, identifiers and carrier.

**Correctness & Bug Detection:** Apply `SYNC:bug-detection` — null safety, boundaries, error handling, resource cleanup, concurrency.

**Test Spec Verification:** Apply `SYNC:test-spec-verification` — locate specs, verify coverage, flag gaps.

**Integration Test Sync:** Apply `SYNC:integration-test-sync-check` — surface missing tests by asking the user directly.

**Translation Sync:** Apply `SYNC:translation-sync-check` — for multilingual UI text changes, require translation updates or explicit user risk acceptance.

**Phase 3.5: Code-Simplifier Quality Optimization (MANDATORY when code files changed)**

> **Purpose:** A correctness review proves the change WORKS; this gate proves the changed code stays **easy to read, consistent, and cheap to change**. Bug-finding (Phases 2-3) and simplification optimization are different lenses — run both. `$code-simplifier` is the canonical owner of clarity/consistency/maintainability refinement, so this skill delegates to it rather than duplicating that logic.

**Entry gate:**

- Run when the diff includes source-code or code-adjacent files (`.cs`, `.ts`, `.tsx`, `.html`, `.scss`, `.css`, tests, scripts, build/config-as-code).
- **SKIP** for docs-only / markdown-only diffs. Record: `Skipped Phase 3.5 — no code files in diff.`

**Protocol:**

1. Set the `[Review Phase 3.5]` task to `in_progress`.
2. **Invoke `$code-simplifier`** scoped to the **changed code files only** (pass the Phase 1 diff source — working-tree, staged, branch, or commit range — so it refines the related changed files, NOT the whole codebase). Direct it to surface reuse, DRY, KISS/YAGNI, naming, dead-code, altitude/layer-placement, and readability simplifications.
3. **Capture, do NOT auto-apply.** In review context, `$code-simplifier` runs in *report* mode: integrate its recommendations into the main report under `## Code-Simplifier Optimization Findings` with `file:line` evidence and a one-line rationale each. These are findings, not edits.
4. Set the `[Review Phase 3.5]` task to `completed`.

**Pipeline integration:** Phase 3.5 findings are ordinary findings — they consolidate in Phase 4, are validated in Phase 6 (`$why-review --validate-findings` filters false-positive or change-cost-raising simplifications), and only validated ones are fixed in Phase 7. NEVER let `$code-simplifier` mutate the working tree before Phase 6 validates its suggestions.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, still run Phase 3.5 (it is a review dimension, producing findings for the report) but do NOT fix here — the parent workflow's `$code-simplifier` self-review and `$feature-implement` fix cycle own application. Record the findings and hand the report to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.

**Phase 3.7: Integration-Test-Review Coverage Gate (MANDATORY when behavior-bearing code changed)**

> **Purpose:** Phases 2-3 prove the change is correct as written; this gate proves the change is **covered and specced**. `$integration-test-review` is the canonical owner of the test-quality audit — its Gate 7 (Change Coverage) maps every behavior-changing production file in the diff from the profile-declared canonical scenario/case to a covering test and assertion/result (integration-first; unit fallback needs explicit justification). The strict default profile uses spec TCs when it declares that carrier. This skill delegates to it rather than duplicating that logic. `SYNC:integration-test-sync-check` stays as the lightweight file-pairing check; this gate goes deeper — assertion quality, data-state verification, repeatability, and bidirectional spec↔test↔code alignment over the full change set.

**Entry gate:**

- Run when the diff includes behavior-bearing source code: handlers, commands, queries, services, entities, event consumers, controllers, background jobs, or frontend logic.
- **SKIP** for docs-only / markdown-only / pure styling-asset diffs. Record: `Skipped Phase 3.7 — no behavior-bearing code in diff.`

**Protocol:**

1. Set the `[Review Phase 3.7]` task to `in_progress`.
2. **Invoke `$integration-test-review`** scoped to the Phase 1 diff source (working-tree, staged, branch, or commit range) so it audits the **FULL change set** — changed production code AND changed test files, never just the test files. It runs all 8 quality gates, builds the Gate 7 Coverage Mapping Table, and cross-checks profile-declared scenarios/cases and mapped tests in both directions; strict-default TC cross-checks apply only when configured.
3. **Capture, do NOT auto-fix.** Integrate its output into the main report under `## Integration-Test-Review Findings`: per-gate verdicts, the Coverage Mapping Table, and every GAP / SPEC-GAP / unjustified COVERED-UNIT as a finding (GAP = HIGH severity minimum; CRITICAL for auth/money/data-integrity paths).
4. Set the `[Review Phase 3.7]` task to `completed`.

**Pipeline integration:** Phase 3.7 findings are ordinary findings — consolidated in Phase 4, validated in Phase 6, fixed in Phase 7. GAP fixes WRITE the missing test via `$integration-test`; SPEC-GAP fixes reconcile the configured scenario/case and test mapping through their declared owner and updater. Use `$spec [mode=tests] [update]` only when the strict default profile declares that carrier. The Phase 7 restart then re-audits coverage over the full updated diff, including the new tests.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run Phase 3.7 locally — the parent workflow's dedicated `$integration-test-review` step owns the 7-gate audit and coverage mapping. Record `Phase 3.7 deferred to parent workflow $integration-test-review step.` (`SYNC:integration-test-sync-check` still applies locally as the lightweight pairing check.)

**Phase 3.8: Domain Entity Change Gate (MANDATORY when the diff touches an entity, value object, or aggregate)**

> **Purpose:** Phase 3.7 proves the change is covered and specced; this gate proves the **domain model itself** is sound. `$domain-entities-review` is the canonical owner of the A–P entity checklist — this skill routes to it rather than judging aggregate boundaries, invariant ownership, or concurrency by eye. Apply `SYNC:domain-entity-change-gate` (inlined below) — the SAME protocol `$plan` and `$plan-review` read, so a design planned under it is reviewed under it.

**Entry gate:**

- Run when the diff adds or changes a domain entity, value object, aggregate root, repository, domain event, or a cross-aggregate reference.
- **SKIP** when no domain-entity surface is touched. Record: `Skipped Phase 3.8 — no domain-entity surface in diff.`

**Protocol:**

1. Set the `[Review Phase 3.8]` task to `in_progress`.
2. Detect **paradigm** (OO-mutable / type-driven-immutable / event-sourced, per aggregate) and **subdomain fit** (core / supporting / generic / CRUD) FIRST — both decide which rules apply. NEVER report anemic model before stating the subdomain judgment with evidence.
3. Apply the gate's 6 decision points as review lenses — **Mode A (default):** read `$domain-entities-review` Phase 2 A–P and apply inline. **Mode B:** delegate to `$domain-entities-review` when standalone AND the diff carries 3+ entity files.
4. Findings enter the normal set with `file:line` + severity — they consolidate in Phase 4, validate in Phase 6, and only validated ones are fixed in Phase 7.
5. Set the `[Review Phase 3.8]` task to `completed`.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run Phase 3.8 locally — the parent workflow's dedicated `$domain-entities-review` step 4 owns the A–P audit. Record `Phase 3.8 deferred to parent workflow $domain-entities-review step 4.` — why: running both duplicates a parallel-batch member and closes a review cycle.

**Phase 3.9: Conditional E2E Quality Gate (report-only)**

**Entry gate:** Run only when the Phase 0.7 E2E trigger is positive. Otherwise record the exact `NOT-APPLICABLE` reason and continue the existing phase order. This lane is not a second workflow step.

**Protocol:**

1. Set the `[Review Phase 3.9]` task to `in_progress`.
2. Read `.claude/skills/shared/e2e-quality-protocol.md`, freeze the E2E scope from the diff, and record one `Given` → `When` → `Then` scenario with its protected invariant and canonical scenario/case plus mapped-test trace.
3. Invoke `$e2e-test-verify` in report-only mode over that fixed scope. It applies the shared gate, runs the configured verification command when available, and writes exact output/evidence; it does not edit source, tests, fixtures, baselines, or user data.
4. Integrate its full report under `## E2E Quality Gate Findings`: gate-row verdicts, exact command/counts/exit status, readable redacted artifacts, cleanup result, failure classification, `file:line`/config evidence, confidence, owner, and next step. A report-only `ENVIRONMENT-BLOCKED` result stays an open finding.
5. Set the `[Review Phase 3.9]` task to `completed` only after the report is persisted and reconciled.

**Pipeline boundary:** Phase 3.9 produces ordinary findings for Phase 4 → Phase 6 validation → Phase 7 fixing. It never repairs E2E code and never replaces `$experience-review`: step 15 owns runtime/visual exercise and acceptance for configured or likely observable surfaces. In `$workflow-review-changes`, Phase 3.9 remains inside inline step 1; the parent validates and owns any fix cycle.

**Phase 4: Generate Final Review Result**

Update report with final sections (**MUST ATTENTION** — include every section below):

- Overall Assessment (big picture summary)
- Critical Issues (must fix before merge)
- High Priority (should fix)
- **Why-Review Rationale Findings (from the Phase 0.8 parallel sub-agent — its verdict + every rationale finding with `file:line`, severity, confidence; or `Phase 0.8 deferred to parent workflow $why-review step (2)`).** MUST ATTENTION fold these into the Overall Assessment rather than listing them apart — a diff that is dimensionally clean but rationally unsound is NOT a passing review.
- Architecture Recommendations
- Cross-Boundary Impact (from Phase 0.1 — per client↔server seam AND per service/event/external touchpoint: NONE / ADDITIVE / BREAKING with routed fix; or explicit "Single-tier / monolith — N/A")
- Documentation Staleness (list stale docs with what changed, or "No doc updates needed")
- Spec Drift Adjudication (per behavior-changing file: CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT / `Spec in sync`, with the routed fix; or "No behavior change — N/A")
- Dual-Feedback Ledger (REQUIRED — see below; or "No behavior change — N/A")
- Positive Observations
- Suggested commit message (based on changes)

> **Dual-Feedback Ledger (REQUIRED for every behavior-changing finding).** A behavior gap must feed back into BOTH the spec AND the tests — not merely fix the code. The Spec Drift Adjudication row above and the Phase 3.7 Gate 7 coverage row each cover only ONE axis; this ledger unifies them into a single "update BOTH" assertion so neither is silently skipped. For each behavior-changing finding, emit one row with two cells:
>
> | Finding (`file:line`) | Spec feedback | Test feedback |
> | --- | --- | --- |
> | `{cite}` | `{the profile-mapped canonical-owner update needed — e.g. add the missing requirement/invariant and scenario/case via the configured updater, OR N/A because the owner already states intended behavior}` | `{the actual guarding test/executor and assertion/result needed — e.g. a new mapped test via the configured test-sync path, or N/A with evidence}` |
>
> - **A blank cell on EITHER axis = FAIL.** "N/A" alone is not allowed — every N/A must carry its reason inline (e.g. `N/A — CODE-WRONG: canonical spec already describes the correct behavior, so no owner edit; only the mapped guarding regression test is owed`).
> - **CODE-WRONG** finding → Spec feedback is typically `N/A — spec correct`, Test feedback is REQUIRED (the guarding regression test first, per `SYNC:spec-drift-adjudication`).
> - **SPEC-STALE** finding → BOTH cells are non-N/A: Spec feedback updates the configured owner and reconciles its scenario/case; Test feedback maps the executing test, assertion/result, and declared cardinality. Use `$spec [update]` and `$spec [mode=tests]` only under the strict default profile.
> - **SPEC-SILENT** finding (code correctly enforces an invariant the canonical owner never states) → BOTH cells are non-N/A: Spec feedback = add the missing requirement/invariant and canonical scenario/case through the configured owner; Test feedback = the actual property/regression assertion mapped to that owner/scenario/variant at the profile's declared cardinality. Under the strict default profile, this is §4 BR / §3 AC (+ §5 invariant if applicable) and a §8 TC via `$spec [update]` + `$spec [mode=tests]`. The highest-value capture — never leave a discovered invariant only in code or only in tests.
> - **Covered-but-stale scenario/case** (Gate 7 SPEC-GAP routed by `$integration-test-review`): classify a canonical scenario/case row that no longer describes intended behavior as a SPEC-GAP, not satisfied coverage. Correct it at its configured owner, then update every mapped executor/assertion and variant row as required by the declared cardinality. Under the strict default profile, the owner is the §8 TC registry.
> - This ledger is itself an ordinary finding set: it consolidates here (Phase 4), is validated in Phase 6 (`$why-review --validate-findings` confirms BOTH axes are present for each behavior change), and its owed spec/test actions are applied in Phase 7. A ledger row with a blank axis that survives to Phase 7 = the review is INCOMPLETE.

## Phase 5: Docs-Update Triage (CONDITIONAL)

If Documentation Staleness Check in Phase 4 identified stale docs:

1. Record impacted documentation and the proposed sync/update path in the review report
2. Add each stale-doc item to the Phase 6 findings validation payload
3. Do NOT invoke `$docs-update` yet; stale-doc findings are fixed in Phase 7 only after `$why-review --validate-findings` returns CLEAN for them
4. If Phase 7 later applies doc fixes, the next recursive `$changes-review` invocation must re-review the updated docs from Phase 0

> **Phase 5 triages only the docs the review FLAGGED.** Regardless of whether anything is flagged here, the **mandatory Phase 8 final `$docs-update` gate** still runs once the review converges clean — it independently detects impacted docs this triage may have missed. Phase 5 is conditional; Phase 8 is unconditional.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify artifacts are **easy to read, maintain, understand**:

- **Schema visibility** — Function computes data structure? Comment shows output shape so readers don't trace code
- **Non-obvious data flows** — Data transforms through multiple steps? Brief comment explains pipeline
- **Self-documenting signatures** — Params explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings → named constants or inline rationale
- **Naming clarity** — Variables/functions reveal intent without reading implementation

## Review Checklist

### 1. Architecture Compliance (MUST ATTENTION)

- Follows project's layer/module boundaries (read `docs/project-config.json` or equivalent)
- No cross-module/service direct data access where boundaries exist
- Logic placed in lowest responsible layer (not in orchestrators/top-layer classes)

### 2. Code Quality & Clean Code (MUST ATTENTION)

- Single Responsibility Principle — each function/class does ONE thing
- No code duplication (DRY) — grep for similar code, extract if 3+ occurrences
- Appropriate error handling following project patterns
- No magic numbers/strings (extract to named constants)
- Type annotations on all functions (where language requires)
- Early returns/guard clauses used
- YAGNI — no speculative features, unused parameters, premature abstractions
- KISS — simplest solution meeting requirement
- Follows existing codebase conventions (verify with grep for 3+ examples)

### 2.5. Naming Conventions (MUST ATTENTION)

- Names reveal intent (WHAT not HOW)
- Public/cross-layer abstractions name the capability or domain contract; provider/framework/transport names stay on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`)
- Check callers and implementations before flagging a broad or technology-specific name; use a narrower purpose name when `IStorage` overpromises
- Specific names, not generic (`orderRecords` not `data`)
- Booleans: prefix with state-indicating verb (`isActive`, `hasPermission`, `canEdit`)
- No cryptic abbreviations

### 3. Project-Specific Patterns (MUST ATTENTION)

- Read project's patterns/conventions reference docs BEFORE flagging violations
- Verify 3+ existing examples before concluding a pattern is a violation
- Flag deviation from project patterns with evidence (`file:line` showing existing pattern)

### 4. Security (MUST ATTENTION)

- No hardcoded credentials, tokens, or secrets
- Proper authorization checks at all entry points
- Input validation at system boundaries (user input, external APIs, message payloads)
- No injection risks (SQL, command, template, etc.)

### 5. Performance (MUST ATTENTION)

> Concise hot-path pass — OOM first, then structure, then batching. Deep multi-dimension analysis belongs to `$performance-review`; flag here, route there if it needs measurement.

- **[MOST IMPORTANT] OOM / out-of-memory bad practices** — bound EVERY result set (page/limit/cursor); no unbounded read-all / `SELECT *`, no full materialization before paging/filtering, stream/chunk instead of buffering a whole export, no blobs/large-JSON/tracked entities loaded for list views, no unbounded cache/accumulator, no accidental multiple enumeration. Reduce rows AT THE SOURCE — row COUNT before row SIZE
- **Best data structure & algorithm for the stack** — O(1) `Set`/`Map`/dict lookup instead of linear `find`/`includes`/`contains` inside a loop; no O(n²) where O(n log n)/O(n)/O(1) exists
- **Batch once, or parallelize — never serial fan-out** — collapse per-item query/API/cache calls into one batched call (`IN`/bulk/aggregate/prefetch); run independent calls bounded-parallel, not sequential awaits (preserve ordering/authorization)
- No N+1 query patterns (batch load related data before iterating); query patterns have appropriate indexes
- Async/await used correctly (no blocking in async context)

### 6. Common Issues (MUST ATTENTION)

- Unused imports or variables
- Debug/logging statements left in that should not be in production
- Hardcoded values that should be configuration
- Missing async/await or promise handling
- Incorrect or absent exception handling
- Missing validation at boundaries

### 6.5 Bugfix Debugger Trace Gate (MUST ATTENTION)

For bugfix, failed-verification, stale/incorrect final output, regression, or behavior-changing fixes, FAIL review if any required proof is missing:

- `Debugger Trace: End -> Start` names the observed final state and final reader/query/renderer/assertion
- backward hops are evidenced from reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- all feeder paths that can write the final state are enumerated or explicitly marked unknown
- hypothesis matrix classifies root causes as primary, contributing, ruled out, latent, or unknown
- owning fix layer is justified as the lowest shared owner, not the symptom site by default
- forward convergence proof and regression test/proof mapping show why the final symptom cannot persist

### 7. Documentation Staleness (MUST ATTENTION)

- For each changed file: identify related docs (feature docs, architecture references, READMEs)
- Changed logic → verify relevant feature/module docs still accurate
- Changed tooling (scripts, configs, CI) → verify setup/getting-started docs still accurate
- New feature/component added → flag if corresponding doc missing
- Test artifacts and assertions reflect current behavior after changes
- API changes reflected in relevant API docs or specs
- **Spec-drift adjudication** (`SYNC:spec-drift-adjudication`): for every behavior-changing file, decide whether divergence from the configured canonical owner is CODE-WRONG (change violates intended behavior — BLOCKING, fix code/test), SPEC-STALE (intended change — update the owner and reconcile its scenario/case and mapped tests), AMBIGUOUS (intended behavior unclear — ask the user directly before editing either side), or SPEC-SILENT (code correctly enforces an unstated invariant — enrich the configured owner with the requirement/invariant and scenario/case, then prove its guarding test mapping). Do not flag a divergence as one-directional stale documentation without naming which side is canonical. The strict default profile uses §4 BR/§3 AC + §8 TC; native profiles use their configured fields and carriers. Unadjudicated behavior-vs-spec divergence is a FAIL; an unwritten-but-enforced invariant left uncaptured is equally a FAIL.

### 8. M1-M7 Compliance Gate — Code-to-Spec Drift (BLOCKING, MUST ATTENTION)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". This review enforces M6 for any spec/feature-doc/PBI/story/test-spec touched by — or supposed to be synced by — this change. Frame each check as: **did this change introduce M1/M2 prose leakage, break a logical-ID mapping (M3), create AC/expected-result ambiguity (M4), or ADD A NON-DEMOABLE CASE TO A BUSINESS SPEC (M7)?** A FAIL must name the violated mandate ID and cite the changed file + line. Passing an introduced **M1-M5/M7** violation makes this review itself defective. (M6 binds THIS review, not the artifact — hence the artifact-facing set reads M1-M5 **and M7**, never "M1-M6".)
>
> Carriers are EXEMPT from M1/M2 — source identifiers stay CORRECT inside `[Source: ...]`, `**Evidence**`, `CoveredBy:` fields, legacy `**IntegrationTest:**` migration fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in spec/doc narrative prose. Banned prose token list: `spec-principles.md` §3.2 under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides). Scope this gate to changed artifact files (specs under the business spec root — default `docs/specs/**`, overridable via `specRoots.business.path` — plus PBI/story/test-spec files in the diff); SKIP with a one-line note when the diff touches no such artifact.

- **M1 — No introduced tech leakage in prose.** FAIL if the diff adds a framework/product, language-native type, or product/design-pattern class name to spec/doc narrative prose, headings, or AC text (banned list in `spec-principles.md` §3.2). Cite the changed file + line + token.
- **M2 — No introduced source code in prose.** FAIL if the diff expresses a requirement as a class/method/file-path/namespace used as a noun instead of a business operation. Source identifiers belong only in evidence carriers. Cite the changed line.
- **M3 — Logical-ID mapping preserved.** FAIL if the change adds a requirement/rule/scenario without the logical ID declared by the configured profile, strips or demotes a logical ID below `[Source:]` evidence, writes physical code coordinates instead of the required portable evidence anchor, or drops that evidence. The strict default profile uses IDs such as `FR-`/`BR-`/`OP-`/`TC-`; a native profile uses its declared owner-qualified identifiers. Evidence stays secondary to the requirement/scenario spine and maps to implementation/test artifacts using the configured carrier.
- **M4 — No introduced AC ambiguity.** FAIL if the change leaves an AC/expected-result vague ("handle appropriately", "process normally", "as needed"), implementable two different ways while both claim conformance, or with no observable completion state / named error condition.
- **M5 — Spec stays rebuildable.** FAIL if the change makes the spec/doc depend on reading the new code to be understood (a zero-codebase-knowledge team could no longer re-implement on a different stack from the artifact alone). Cite the file + missing detail.
- 🔴 **M7 — No introduced NON-DEMOABLE case in a business spec.** For **every case this diff ADDS to a business-tree artifact**, apply the demo test to its BODY: *"what would a stakeholder SEE change?"* — **no answer → FAIL as TECHNICAL-ONLY.** FAIL an added case whose `When` is an invocation (a handler runs, a consumer receives, a job fires, data syncs, a model/schema is inspected) or whose `Then` asserts a schema/type/nullability/column/call-count rather than a business outcome. Cite the changed file + line + the offending `When`/`Then`. **The case belongs in the technical tree — the fix is to move it there, or rewrite it demoably, NOT to reword it.**

> 🔴 **M7 is the gate on the bugfix→spec pump — this is the step where business specs actually rot.** The failure has a signature: a **technical** bug is fixed (a sync, a consumer, an event handler, a load path, a UI defect), **no business behavior changes**, and a new case is nonetheless appended to the business spec — carefully worded to avoid technical vocabulary, and therefore **passing M1 and M2 cleanly** while remaining a case no user or QC could ever demo. ⚠️ **M1 governs vocabulary; M7 governs subject matter.** A reviewer who checks only M1/M2 waves these through forever, one defensible case at a time, and the business tree fills with cases that cannot be demoed.
>
> **Ask on every diff that fixes a technical bug: did the BUSINESS behavior change?** If NO, the business spec should usually gain **NOTHING** — ⚠️ **"a no-op is a correct outcome"** (see the contract's `[HARD] A no-op is a correct outcome`). **A regression test in the technical tree is the correct home for a technical fix.** Adding a business scenario/case "for coverage" is the defect, not diligence.

If ANY item fails → the verdict is FAIL; list each violated mandate ID with its changed-file/line citation in the Critical Issues or High Priority section.

## Output Format

Provide feedback in this format:

**Summary:** Brief overall assessment

**Critical Issues:** (Must fix before commit)

- Issue 1: Description and suggested fix

**High Priority:** (Should fix)

- Issue 1: Description

**Suggestions:** (Nice to have)

- Suggestion 1

**Documentation Staleness:** (Docs that may need updating)

- Doc 1: What is stale and why
- `No doc updates needed` — if no changed file maps to a doc

**Spec Drift Adjudication:** (Behavior-changing changes only — per `SYNC:spec-drift-adjudication`)

- `<behavior/file>` → CODE-WRONG | SPEC-STALE | AMBIGUOUS | SPEC-SILENT — verdict + profile-mapped owner/test action; strict default only: regression TC and §4 BR/§3 AC + §8 TC enrichment
- `Spec in sync` — if changed behavior matches the canonical Feature Spec
- `No behavior change — N/A` — if the diff is docs/tooling/style only

**Debugger Trace Gaps:** (Bugfix/behavior-changing changes only)

- `Trace complete` — if the required trace, feeder paths, hypothesis matrix, owner, and forward proof are present
- Gap 1: Missing or weak trace evidence and why it blocks PASS

**Goal Satisfaction:** (MANDATORY before any PASS verdict — resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol: active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides); if none exists, record `No active goal — skipped: {one-line reason}`)

| Success Criterion | Evidence | Status |
| --- | --- | --- |
| {saved criterion} | {file:line, command output, report path} | PASS/FAIL/BLOCKED |

- Overall PASS is BLOCKED while any required criterion is FAIL — a code-quality-clean review that misses the saved goal is NOT a PASS.
- BLOCKED status requires a user-facing escalation reason recorded in the matrix row and the goal file.
- Cite evidence references; never restate the goal text or copy secrets/sensitive payloads into the matrix or goal file.
- After the verdict, update the goal file: append an Iteration Log entry and sync its Goal Satisfaction matrix.

**Positive Notes:**

- What was done well

**Suggested Commit Message:**

```
type(scope): description

- Detail 1
- Detail 2
```

---

## Systematic Review Protocol (for 10+ changed files)

> When Phase 1 finds 10+ changed files, apply the **Systematic Review Batching** protocol (map-reduce: size-capped batches + hierarchical synthesis) defined below.

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use ask the user directly to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — run the canonical workflow from `.claude/workflows.json`; it sequences this skill, the whole-target `$why-review`, the parallel specialist reviewers, `code-simplifier` self-review, the fix-plan cycle, the conditional step-14 `$why-review` re-review, docs, and handoff.
> 2. **Execute `$changes-review` directly** — run this skill standalone

---

## Architecture Boundary Check

For each changed file, verify no import from forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match path against each rule's `paths` glob patterns
3. **Scan imports** — Grep file for import statements
4. **Check violations** — If any import path contains layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` not present in project-config.json, skip silently.

---

## Phase 6: Why-Review Findings Validation Gate (MANDATORY before fixing findings)

> **Purpose:** Validate own findings BEFORE any fix. Verify EVERY finding is **correct, proof-backed (`file:line`), reasonable, and convention-aligned**. Catch false positives, inflated severity, and missed improvements before code/doc edits.

> **MANDATORY:** REQUIRED todo task whenever findings exist. Register via task tracking as `[Review Phase 6] Why-review findings validation gate` (already in Phase task list above). Do NOT fix, docs-update, commit, or hand off until this gate passes CLEAN or reaches an explicit blocked state.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). A Medium or Low severity NEVER exempts a finding — even a single low-severity nit, naming note, or "minor" suggestion triggers the full `$why-review --validate-findings` gate. The ONLY skip is a literally empty finding set (unconditional PASS, zero findings of any severity). — why: severity is itself a finding claim the gate must validate; letting "it's only Low" bypass validation is exactly the inflation/false-positive the gate exists to catch.

> **UNCONDITIONAL INVOCATION:** If even one finding exists, the `$why-review` skill MUST be invoked via the skill invocation before any fix, docs-update, commit, or handoff. There is NO inline alternative — manually re-reading the cited `file:line`s, re-tracing in your head, or declaring the findings "already validated" does NOT count. The only way to pass this gate is an actual `$why-review --validate-findings` skill call that returns a verdict.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run this Phase 6 locally. Stop after the review report and hand it to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.

**Protocol (capped re-do loop):**

1. Read own finalized report from `tmp/reports/{skill}-{date}-{slug}.md`
2. **Invoke the `$why-review` skill via the skill invocation** (terminal `--validate-findings` mode — runs in the SAME main-agent session, never spawns a sub-agent, never recurses). "Same session" means the why-review skill executes in this conversation — it does NOT mean you may substitute your own inline re-reading for the skill call. The skill MUST actually run. Pass arg: `--validate-findings tmp/reports/{skill}-{date}-{slug}.md — for EACH finding verify (a) file:line proof exists and is accurate, (b) the finding is correct (re-trace the cited code), (c) severity is reasonable and not inflated, (d) it reflects project best practices/conventions; steel-man each rejected interpretation; and surface any MISSED finding or enhancement opportunity the review overlooked`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **Classify the why-review verdict:**
    - **CLEAN** — all findings confirmed correct / proof-backed / reasonable / best-practice, AND no new finding issue or enhancement opportunity surfaced → append `## Why-Review Validation` line to own report ("All N findings re-validated against actual code; no changes."), gate PASSES; if N > 0, proceed immediately to Phase 7.
    - **HAS ISSUES** — why-review demotes/removes a finding, flags a missing or inaccurate proof, OR surfaces a new finding issue / enhancement opportunity → go to step 5.
5. **Reconcile:** UPDATE own finalized report — revise severities, remove false positives, add the surfaced findings/enhancements, and record a `## Why-Review Validation Notes` section citing what changed and why.
6. **RE-DO `$why-review --validate-findings`** on the UPDATED report (return to step 2) — re-validation is required ONLY because the report changed. Each pass is terminal (validate mode never recurses); the loop is owned and bounded HERE. Repeat until a why-review round comes back CLEAN, or **at most 1 re-do round** (2 total validate passes) is reached.
7. **If still not CLEAN after the cap:** record unresolved items under `## Why-Review Validation — Unresolved` and escalate to the user by asking the user directly instead of silently looping.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate" and do NOT run Phase 7
- `$why-review` itself is the active skill context → do NOT recurse; why-review re-validates via its own terminal `--validate-findings` mode (see its `Findings Validation Gate`)

**Why this exists:** AI reports can inherit confirmation bias, false positives, and severity inflation. Validation proves findings before edits; re-validation after report changes closes the gap where corrected findings are never checked again.

---

## Phase 7: Recursive Auto-Fix + Full Re-Review Loop (MANDATORY when validated findings remain)

> **Purpose:** Fixes change the review target. Next check MUST be a full new `$changes-review` invocation from Phase 0, not continuation from old review state.

**Trigger:** Phase 6 returns CLEAN and the validated report still contains one or more findings, weaknesses, stale-doc items, missing-test items, or required improvements **that block the current round**. In round 2, LOW-only findings do not trigger Phase 7: record them under `## Deferred LOW Findings (severity floor, round ≥2)` and advance to Phase 7.5 or the parent workflow's next step.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT auto-fix or re-invoke `$changes-review` from here. Parent workflow steps 10–14 own `$plan`, `$plan-review`, `$plan-validate`, `$why-review`, `$feature-implement`, and the full restart gate.

**Protocol:**

1. Create fresh fix-cycle tasks before editing: one task per validated finding, one targeted-verification task, one `$changes-review` restart task.
2. Auto-fix validated findings that block the current round at the owning layer. Stale docs: run `$docs-update` or edit canonical docs only after validation. Tests/specs: update canonical artifact before derived dashboards. Do not spend a round-2 fix cycle on LOW-only findings; record and defer them instead.
3. Run targeted verification for the fix set: tests, lint, docs/spec sync, SDD, graph, or config checks as applicable.
4. Append `## Fix Cycle {N}` to the review report: findings fixed, files changed, verification commands/results, and unresolved items with reasons.
5. **Re-invoke `$changes-review` in the SAME main-agent session** on the full current review target:
    - Create brand-new task list for all phases
    - Re-run Phase 0 blast radius, Phase 0.3 risk detection, Phase 0.7 surface categorization, Phase 1 diff collection, and later phases
    - Re-read all changed files from scratch, including original changes and Phase 7 fixes
    - Treat previous report as historical context only; never reuse prior findings as truth
6. Repeat Phase 0 → Phase 7 until one complete `$changes-review` invocation clears that round's bar: **round 1** → unconditional PASS with zero findings and Phase 6 skipped as "no findings to validate"; **round 2** → zero validated CRITICAL/HIGH/MEDIUM, with any remaining LOW findings recorded under `## Deferred LOW Findings (severity floor, round ≥2)` instead of triggering another round.

**Stop conditions:**

- If the same validated finding repeats for 2 full review invocations with no observable progress, stop and ask the user for a decision instead of spinning.
- If a finding cannot be safely auto-fixed without product/owner input, record the blocker and ask the user.
- If required verification tools or sub-skills are unavailable, stop and ask before adapting the protocol.

**Non-negotiable rules:**

- NEVER fix findings before `$why-review --validate-findings` confirms the current finding set.
- NEVER mark review clean after a fix without rerunning the full `$changes-review` protocol from Phase 0.
- NEVER review only the fixed files after a fix; review the full current diff because fixes can interact with earlier changes.
- NEVER reuse old todo tasks after restart; each recursive review invocation breaks down all phases again.
- NEVER declare unconditional PASS without the Output Format's Goal Satisfaction matrix showing every required saved criterion PASS (or BLOCKED with a user-facing escalation reason). A required-criterion FAIL is a validated finding for this fix loop.
- The Phase -1 review-loop binding stays in force until this loop converges (the `/goal` gate too, WHEN available) — the session cannot stop while any validated **blocking** finding is unfixed or any review pass is non-clean at its current round bar. Do NOT report blocking findings to the user and stop; SELF-FIX them here, then re-review the whole diff. Round-2 LOW-only findings are not blocking: record them as deferred and continue to the next required gate. (Standalone only; inside `$workflow-review-changes` the parent's goal gate governs.)

---

## Phase 7.5: Holistic Standalone Full-Mode Why-Review Gate (MANDATORY when the loop converges clean — standalone-only)

> **Purpose:** The dimensional/per-file reviewers (Phases 2-3.7) and the Phase 6 `--validate-findings` gate are SCOPED — each looks at one file, one dimension, or one supplied finding-list. They routinely miss **whole-package** problems: design-rationale gaps, an alternative the change silently foreclosed, assumptions that only break when the changed files are read together, a pre-mortem failure mode spanning the whole diff. A standalone **full-mode** `$why-review` of the entire review target — exactly what a user gets running `$why-review` against the target by hand — applies the adversarial SKEPTIC pass over the package as one artifact and catches what scoped review cannot. This gate exists because, in practice, `$changes-review` alone has missed issues that a standalone `$why-review` of the same target surfaces immediately.

**Trigger:** The Phase 7 review/fix loop has converged — one full `$changes-review` pass cleared the current round's exit bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOWs recorded as deferred) and all required fixes are applied. This gate runs in **standalone mode only**.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, **SKIP Phase 7.5 entirely** — the parent workflow now has its own dedicated standalone `$why-review` step (step 14, after the dimensional review steps and before `$docs-update`) that owns the holistic full-mode pass. Record `Phase 7.5 deferred to parent workflow standalone $why-review step (14).`

**Protocol:**

1. Set the `[Review Phase 7.5]` task to `in_progress`.
2. **Invoke `$why-review` in FULL mode** — an ACTUAL skill invocation-tool call, NOT `--validate-findings`, NOT a manual/inline self-review — over the **WHOLE review target combined with the current changes** as a single artifact (the full Phase 1 diff plus every Phase 7 fix, read together). Frame it as a standalone holistic review of the target, identical to a user running `$why-review` against that target directly. Let `$why-review` apply its own adversarial mindset (steel-man rejected alternatives, invert stated reasons, stress-test top assumptions, pre-mortem, surface missed alternatives) and its own internal validation/self-recursion.
3. **If `$why-review` returns CLEAN at the current round's exit bar:** record `Phase 7.5: full-mode $why-review of whole target — CLEAN at round bar` in the review report and proceed to Phase 8. In round 1 CLEAN means zero findings; from round 2 it may include deferred LOW findings.
4. **If `$why-review` returns findings:** treat them as validated holistic findings — auto-fix only those that block the current round at the owning layer (same fix discipline as Phase 7), record any round-2 LOWs under `## Deferred LOW Findings (severity floor, round ≥2)`, append a `## Phase 7.5 Holistic Fix Cycle {N}` block to the report (findings, files changed, verification), then **re-run Phase 7.5 from step 2** over the full updated target only when a blocking finding was fixed. Repeat run→fix→run until one full-mode `$why-review` pass clears the round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW-only ENDS the loop with the LOWs deferred).
5. Set the `[Review Phase 7.5]` task to `completed` once a full-mode pass is clean (or the gate was deferred to the parent workflow).

**Stop conditions:** Same as Phase 7 — if the same holistic finding repeats for 2 full-mode passes with no observable progress, or a finding needs product/owner input, stop and ask the user instead of spinning. The Phase -1 review-loop binding stays in force until this gate's loop also converges clean (the `/goal` gate too, WHEN available).

> **MANDATORY:** In standalone mode, never advance to Phase 8 or hand off until one full-mode `$why-review` pass over the whole target has cleared the round's bar — zero findings, or (from round 2) zero CRITICAL/HIGH/MEDIUM with the remaining LOW findings recorded as deferred — (or the gate was explicitly deferred to the parent workflow). A passing dimensional review with a skipped holistic `$why-review` is an INCOMPLETE review — it is exactly the gap this gate closes.

---

## Phase 8: Mandatory Final Docs-Update Gate (MANDATORY — always runs after the review/fix loop converges clean)

> **Purpose:** Guarantee **no stale docs survive the change**. Phases 5-7 fix only docs the review *flagged* as findings; this terminal gate runs `$docs-update` unconditionally so impacted docs the dimensional review never surfaced still get reconciled against the actual changes. A clean code-review verdict does NOT imply docs are current.

**Trigger:** The review has converged — one full `$changes-review` pass cleared the current round's exit bar, all required fixes are applied, and (standalone) the Phase 7.5 holistic full-mode `$why-review` pass has also cleared its current round bar. This gate ALWAYS runs in standalone mode; it is NOT gated on a flagged staleness finding.

**Parent workflow boundary:** When this skill is invoked as step 1 inside `$workflow-review-changes`, do NOT run Phase 8 locally — the parent workflow's own `$docs-update` step (after `$feature-implement` and the restart gate) owns the final docs sync. Record `Phase 8 deferred to parent workflow $docs-update step.`

**Protocol:**

1. Set the `[Review Phase 8]` task to `in_progress`.
2. **Invoke `$docs-update`** over the FULL changeset (the Phase 1 diff source plus any Phase 7 fixes). Let it detect impacted docs from the changes — feature docs, architecture references, READMEs, API docs, test specs, setup/getting-started guides.
3. If Phase 4 returned **SPEC-STALE**, update the configured canonical owner BEFORE `$docs-update`, then reconcile its profile-declared scenario/case and mapped tests. Never let `$docs-update` codify broken or superseded behavior. CODE-WRONG is not a spec edit — it was corrected in the Phase 7 code-fix loop. For **SPEC-SILENT**, enrich the configured owner with the missing requirement/invariant and scenario/case, then ensure an actual guarding test is mapped to its assertion/result before `$docs-update`. Only the strict default profile uses `$spec [update]` for §4 BR/§3 AC and `$spec [mode=tests]` for §8 TC.
4. Record applied doc updates (or `No impacted docs — verified N changed files against related docs`) under `## Phase 8 Docs-Update` in the review report.
5. Set the `[Review Phase 8]` task to `completed`.

**Termination guarantee:** Distinguish two edit kinds in Phase 8. **Docs PROSE edits** (narrative/reference text, no new spec rule) do NOT re-trigger the loop; they remain subject to the M1-M7 check and a final read-back. **SPEC-CONTENT edits** — a new requirement/invariant or canonical scenario/case under the configured profile, or a correction to intended behavior — trigger exactly ONE bounded, module-scoped re-review of the whole affected package (canonical owner + tests + code), confirming the new rule is enforced and every claimed executor/assertion is mapped. That single pass terminates unless it finds a new validated issue, which enters the normal loop. Under the strict default profile the relevant carriers include §3/§4/§8; native profiles use their declared structure.

> **MANDATORY:** Never declare the review complete or hand off until Phase 8 has run (or been explicitly deferred to the parent workflow). A passing review with skipped docs-update is an INCOMPLETE review.

---

## Mode: Fix-Loop (`--fix-loop`)

**Trigger:** `$changes-review --fix-loop [scope]`. Optional; standalone-only. Without the flag, every phase above runs exactly as documented. When this skill is step 1 inside `$workflow-review-changes`, the parent boundary wins — ignore the flag and record `--fix-loop ignored — parent $workflow-review-changes owns the loop`.

**Goal:** Drive a fixed diff scope to a **clean pass** by DECOUPLING find from fix — each round runs this skill's default review pass INLINE in **report-only mode** to surface findings, validates them with `$why-review --validate-findings`, hands the VALIDATED blocking findings to a dedicated `$fix` half at the owning layer, then loops with a FRESH full review pass over the CHANGED diff — stopping when a complete review pass clears the round's exit bar: **zero validated findings** in round 1, and **zero validated CRITICAL/HIGH/MEDIUM** from round 2 (LOW-only ENDS the loop, deferred not fixed).

**Why this mode exists:** the default standalone path COUPLES find + fix inside one invocation (Phase -1 binding → Phase 7 self-fix → restart) — the review and the fix share one context, one lens, and one confirmation bias. `--fix-loop` runs the review purely as a finder, validates the findings, gives them to `$fix` with its own intelligent routing at the lowest owning layer, then re-runs a **fresh full** review over the changed diff. That split plus the fresh-full re-review each round catches **fix-induced regressions** the coupled loop can rationalize away.

**Mode summary:**

- **Each round = report-only review pass + validate + `$fix`.** The pass is this skill's own default pass — Phase 0 → Phase 5 with a brand-new phase task list — run INLINE in this session and STOPPED after its findings report; it never re-invokes this skill with `--fix-loop`. The loop owns the validation gate and the `$fix` half, so the review pass never self-validates or self-fixes; one without the other never converges.
- **Mode boundary (per round):** SKIP Phase -1 (Step 0b below owns the single convergence binding); RUN Phase 0 → Phase 5, including the review-producing Phases 0.8, 3.5, 3.7, 3.8, and 3.9 (report mode — they skip only inside `$workflow-review-changes`); STOP before Phase 6 / Phase 7 / Phase 7.5 / Phase 8. Step 1.3 owns validation, Step 1.4 owns fixing, and Step 3 runs the Phase 8 protocol once. Phase 7.5 does not run separately: every round's Phase 0.8 full-mode `$why-review` already reviews the CURRENT post-fix diff, so the converging round carries the holistic pass over the final package.
- **Convergence:** stop ONLY when a **fresh full** review pass over the CURRENT (post-fix) diff clears the round's exit bar — not a stale clean report predating the last fix.
- **Severity floor — from round 2, LOW stops blocking.** Same floor as the default Key Rules and `SYNC:severity-rubric`: never open another round to fix LOW alone; list every deferred LOW in the recap and Goal Contract, and NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit.
- **Inline invariant:** run the review pass and `$why-review` in the main session (`$why-review` via the skill invocation), NEVER the `spawn_agent` tool — a sub-agent cannot own or carry back this loop's convergence obligation. The pass's own Phase 0.7/0.8 reviewers stay sub-agents by design, so context stays bounded.
- **Apply ONLY validated findings:** every finding is validated to the ≥85% survival bar via `$why-review --validate-findings` before `$fix` touches it; apply THOSE at the invariant-owning component identified from project architecture and source evidence, routed by change type — NEVER unvalidated findings.
- **Scope base is FIXED; the working tree grows.** Recompute the diff scope each round (`branch-diff base` ∪ current uncommitted changes) so convergence is measured against a stable subject as fixes accumulate.
- **Bounded:** round cap default 2 plus one conditional extension to round 3, granted ONLY when round 2 leaves a validated CRITICAL/HIGH open (round 3 is the review hard cap); a failing test gate has NO round cap — keep fixing and re-running until the tests pass; review blockers not shrinking across 2 rounds, or the budget spent with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate** by asking the user directly. Increasing review blockers → STOP (fixes regressing). Both count-based stops are checked only after the round-2 CRITICAL/HIGH extension, which is granted first.
- **Round cap (default 2, extendable ONCE to 3)** and **review-blockers-not-shrinking / increasing → STOP & escalate** by asking the user directly. NEVER loop open-ended. Round 3 is granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL), is checked before the count-based stops, never renews, and round 2 blocked by MEDIUM alone escalates instead. A failing test gate is never capped: the loop keeps fixing and re-running until the tests pass. Cap exhaustion escalates only when CRITICAL/HIGH/MEDIUM remain — a LOW-only round converges via the severity floor.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, never lowers the ≥85% finding-survival bar, and never applies to a binary gate (a failing test is a failure, not a LOW finding).

**Mode sequence:** Step 0 (resolve diff scope + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: report-only review pass INLINE → `$why-review --validate-findings` → `$fix` on validated blocking findings → log) → Step 2 (converge when a fresh review clears the round's bar / escalate on non-progress) → Step 3 (terminal Phase 8 `$docs-update` + mint the review receipt + recap).

### Fix-Loop First Principle — Convergence, Not Motion

> A round that changes the diff is progress **only if** the next fresh review finds fewer things to fix.
> The loop exists to reach a fixed point (no blocking findings), not to keep editing the code.
> The bar tightens by round: everything blocks in round 1; from round 2 only CRITICAL/HIGH/MEDIUM block, so a LOW-only round is the fixed point.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round — except the one round-2 CRITICAL/HIGH extension, which is granted first.

### Fix-Loop Step 0 — Resolve Diff Scope + Goal Contract (FIRST ACTION)

1. **Parse the review scope** from the user prompt into a stable, reusable scope string — exactly the diff kinds in [Review Scope](#review-scope). It has two parts UNIONed:
   - **Branch-diff base** — a branch-to-branch or PR diff (e.g. `git diff develop...HEAD`, three-dot: changes on the feature branch since it forked from `develop`) so the base is a **fixed merge-base**, not a moving target. If the prompt names a commit range, capture it the same way.
   - **Current changes** — the uncommitted working-tree changes (`git status --porcelain`, `git diff` + `git diff --staged`).
   - **Scope string (recompute each round):** `{branch-diff base} ∪ {current uncommitted changes}`. The base commit is fixed for the whole loop; the uncommitted set legitimately grows as fixes land.
   - If the prompt names no branch diff (pure "current changes" review), the scope is just the working-tree changes — the loop still applies. **NEVER silently convert the diff source type.**
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` — plans root default `plans/`, overridable via `docsRoots.plans.path` in `docs/project-config.json` — template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
   > *A fresh full report-only review pass over `{scope}` clears the round's exit bar: **round 1** → **zero validated findings** (no finding of any severity survives the loop's `$why-review --validate-findings` gate); **round 2** → **zero validated CRITICAL/HIGH/MEDIUM findings**, with any remaining LOW findings recorded as deferred rather than fixed.*
   Record the round cap (default 2, extendable once to 3 on an open CRITICAL/HIGH at round 2; failing test gates uncapped until green) and the scope string in **Constraints**.
3. **Plan the loop tasks FIRST.** Create a todo-task plan enumerating every step and the planned rounds; a round MUST NOT start until that round's fresh task plan exists, and every new round REGENERATES it — NEVER reuse the prior round's task list.

### Fix-Loop Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (Steps 1–2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run the report-only review pass (Phase 0 → Phase 5) INLINE over `{scope}` (recomputed each round). After each review, validate its findings with `$why-review --validate-findings`, apply only the VALIDATED findings that block the current round via `$fix` at their owning layer, then re-run a FRESH full review pass over the CHANGED diff. Do NOT stop while the last review still produced findings that BLOCK at the current round's bar. Converge when a fresh full review pass clears that bar: **round 1** → zero validated findings; **round 2** → zero validated CRITICAL/HIGH/MEDIUM (LOW-only ENDS the loop, with the LOWs recorded as deferred). Cap at `{N=2}` rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds or increase (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with CRITICAL/HIGH/MEDIUM still open → STOP and escalate by asking the user directly. Never loop open-ended.

Treat this as a standing obligation you re-read at every Step 2 checkpoint — NOT a one-time note you can rationalize away after the first fix cycle. The Goal Contract's required Success Criterion (Step 0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal changes-review --fix-loop convergence loop: repeatedly run the report-only review pass (Phase 0 → Phase 5) INLINE over {scope} (recomputed each round). After each review, validate its findings with $why-review --validate-findings, apply only VALIDATED findings that block the current round via $fix at their owning layer, then re-run a FRESH full review pass over the CHANGED diff. If blocking validated findings>0 → apply fixes and run another round; if a fresh full review pass clears the round's bar (round 1: zero validated findings; round 2: zero validated CRITICAL/HIGH/MEDIUM, LOW-only counts as clear with the LOWs recorded as deferred) → CONVERGED, run the terminal Phase 8 $docs-update and clear the gate. Do NOT stop while the last review still produced blocking validated findings. Cap at {N=2} rounds, extendable ONCE to round 3 only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); a failing test gate is outside the cap and the no-progress rule — keep fixing and re-running until the tests pass, never forcing green; if review blockers do not shrink across 2 consecutive rounds or increase (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the review budget (round 2, or round 3 when extended) is spent with CRITICAL/HIGH/MEDIUM still open → STOP and escalate by asking the user directly. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** the report-only pass skips Phase -1, so no inner self-fix gate is installed; THIS loop owns the single convergence gate. Each inner `$why-review --validate-findings` self-clears when that round's findings are all adjudicated. All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

### Fix-Loop Step 1 — Round Loop (review → validate → `$fix` → log)

Each round couples the two halves — **review to find, fix to resolve.** For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat` — as the fixes-applied baseline and convergence backstop. Before reviewing, also capture the exact full candidate with `node .claude/hooks/lib/review-receipt.cjs snapshot --target=<worktree|staged|commit-descriptor> [--descriptor-json='<exact descriptor JSON>']` and retain its complete JSON output. The default branch-diff ∪ uncommitted review scope uses `worktree`; use another target only when that review covers the same complete supported commit candidate. Artifact-only, external, or subset reviews never qualify. `CLEAN` needs no receipt; `ERROR` blocks issuance. After any fix, capture a new candidate before the next full review pass.
2. **Run the report-only review pass INLINE** on the recomputed `{scope}`: a brand-new Phase 0 → Phase 5 task list, every changed file re-read from scratch (original changes AND prior-round fixes), the previous report treated as history only. STOP after the findings report (`tmp/reports/code-review-*.md`) — do NOT run Phase 6 validation, Phase 7 self-fix, Phase 7.5 holistic, or Phase 8 docs-update here. If the before-snapshot shows the pass mutated the working tree anyway, treat those edits as this round's fix half and skip Steps 1.3–1.4 for this round to avoid double-fixing; the next round's fresh pass still re-proves them.
3. **Validate the findings — THE LOOP OWNS THIS GATE.** Run `$why-review --validate-findings <report-path>` INLINE via the skill invocation over the report the pass just produced, so every finding is confirmed correct, proof-backed, reasonable, and best-practice (≥85% survival bar) before any fix. Apply the Phase 6 protocol (reconcile the report, at most 1 re-do, then escalate). If the validated finding set is empty → no fix half is needed; go to Step 2, which converges only while no test gate is failing.
4. **Run `$fix` on the validated blocking findings** (findings>0 only) — this is the half the loop owns. Resolve each validated blocking finding at its owning layer: code → `$fix` (its `--target` intelligent routing) or a direct edit at the invariant-owning component identified from project architecture and source evidence; spec-drift (CODE-WRONG/SPEC-STALE/SPEC-SILENT) → update the configured canonical owner and reconcile its profile-declared scenario/case and mapped tests; use `$spec [update]` + `$spec [mode=tests]` only when the strict default profile declares those carriers; missing coverage (GAP/SPEC-GAP) → `$integration-test`; docs → defer to the terminal Step 3 docs-update; behavior-changing → honor the finding's Phase 4 Dual-Feedback Ledger (spec verdict + test action). Fix ONLY validated findings that block this round — never an unvalidated, demoted, or round-2 LOW-only finding.
5. **Append an Iteration Log entry** to the Goal Contract: round number, validated findings count, files/artifacts changed this round (`file:line`), fixes applied, and remaining gaps.

### Fix-Loop Step 2 — Convergence & Escalation Gate

Evaluate after every round, **in this order — the first matching row decides** (rows (1), (4), (5) and (6) are the outcomes `SYNC:double-round-trip-review` and `review-policy.cjs` enforce; the count-based stops (2) and (3) are this loop's stricter exit on top of them, evaluated after the extension so they never pre-empt it; count only review blockers — validated findings at each round's own bar plus failed non-test binary gates, never failing test gates): (1) round 2 left a validated CRITICAL/HIGH review blocker open → the one extension round, even when the blocker count did not shrink; (2) review blockers increased vs the prior round → STOP & escalate; (3) review blockers are still open and did not shrink across 2 consecutive rounds → STOP & escalate (the EARLIER exit before the budget); (4) the review budget is spent with a review blocker still open (round 2 without a CRITICAL/HIGH, or round 3 and later) → STOP & escalate, even while a test gate is also red; (5) a test gate is failing and no review blocker is open → keep looping with no round cap, and never converge while it is red; (6) the current round bar is clear (LOW-only from round 2) and no test gate is failing → CONVERGED; (7) review blockers are open within budget and shrank (or this is round 1) → fix them and any failing test, then run the next round. A MATERIAL trade-off pauses the loop at any step before its fix lands.

| Condition | Action |
| --- | --- |
| Fresh full review pass returned **zero validated findings** AND the working tree is unchanged by that final review pass AND no test gate is failing | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to Step 3. |
| Validated findings > 0 AND round `< N` AND findings shrank vs prior round | Apply the validated fixes (Step 1.4), recompute `{scope}`, then run round `R+1` (fresh full re-review of the changed diff). |
| Review blockers are still open and did **not shrink** across 2 consecutive rounds (same/increasing count; failing tests excluded — they loop until green; a round-2 CRITICAL/HIGH takes the extension row first) | **STOP & escalate** by asking the user directly — a non-converging loop is a signal, not a reason to spin. |
| Round `R ≥ 2` AND the fresh review's validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM) AND no test gate is failing | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to Step 3. |
| Round 2 completed with a validated **CRITICAL or HIGH** still open | **ONE extension round is granted** → apply the validated fixes and run round 3 (fresh full re-review), even when the blocker count did not shrink. Granted once per loop; it never renews. A failed non-test binary gate counts as CRITICAL here. |
| A **test gate** is failing (a suite that must actually pass) and no review blocker is open, at any round within or past the budget | **Keep looping — NO round cap.** Run the failed-test investigation gate, fix at the owning layer, re-run the tests, and continue past round 3 until they pass. NEVER weaken an assertion, add a skip, or relax a timeout to force green. A failing test never counts toward the no-progress escalation or the round-3 extension. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM still open — round 2 blocked by MEDIUM or an unresolved `NOT VERIFIABLE` alone, or round 3 (the review hard cap) blocked by any review blocker | **STOP & escalate** by asking the user directly — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.) |

> **Increasing review blockers = STOP.** If round `R` surfaces MORE review blockers (validated findings at its own bar plus failed non-test binary gates) than round `R-1`, the fixes are regressing the code — STOP and escalate immediately, unless round 2 left a validated CRITICAL/HIGH open, which takes the one extension round first. A LOW-only round 2 has zero review blockers, so it is never an increase. Never trade one fix for two new findings across rounds.

### Fix-Loop Step 3 — Terminal Docs-Update + Recap

1. **Terminal docs-update (MANDATORY once converged).** Each round's pass stopped before Phase 8, so run the **Phase 8 protocol** exactly once now — `$docs-update` INLINE over the full changeset, with any SPEC-STALE/SPEC-SILENT `$spec` updates first and its termination guarantee — once a fresh full review pass clears the round's exit bar (zero validated findings in round 1, or zero validated CRITICAL/HIGH/MEDIUM from round 2 onward with LOW deferred), so no stale docs survive.
2. **Mint the review receipt (MANDATORY terminal action).** Once converged AND the terminal docs-update has no further content changes, issue only from the original snapshot of the final full review pass:

   ```bash
   node .claude/hooks/lib/review-receipt.cjs issue --kind=changes-review --scope=full-changeset --snapshot-json='<exact JSON captured before the final full review pass>'
   ```

   This records — for the review-before-commit gate (`review-commit-gate.cjs`) — that this exact candidate passed a fix-loop. Pass the original pre-review snapshot; issuance rechecks that same target and rejects drift. Do not capture or reconstruct a snapshot at terminal issuance. If the terminal docs-update or any other action changed content after that snapshot, issue nothing and restart a full review round on the updated candidate; a later clean pass must be followed by a no-change docs-update. Artifact-only, external, subset, or `CLEAN` targets receive `review-receipt: N/A — no full changeset candidate`; issue nothing. `ERROR` blocks and is never clean.
3. **Recap.** Emit a concise convergence recap: rounds run, validated findings per round (the shrinking sequence), the fixes applied at each round, the final zero-findings evidence, the deferred LOWs, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's review report under `tmp/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

### Fix-Loop Convergence Detection — Why a Fresh Full Re-Review Is Required

A round converges ONLY when a review pass that ran over the **current, post-fix** diff clears the round's exit bar — zero validated findings in round 1, zero validated CRITICAL/HIGH/MEDIUM from round 2. Both properties are required because:

- **Fresh over the changed diff** — a clean report from a review that predates the last fix proves nothing about the fix. Every applied fix invalidates the prior verdict (same rule as Phase 7); the loop MUST re-review after fixing, never reuse a stale clean report.
- **Zero *validated* findings** — the loop's `$why-review --validate-findings` gate already dropped inflated/unproven findings below the ≥85% bar; convergence rides on that validated set, so the loop never chases a nit the review itself would demote.
- **Working-tree unchanged backstop** — the objective `git`-diff comparison (Step 1.1 snapshot) confirms the converging review actually landed no fix; a "clean" verdict that still mutated files means the round DID fix things → run another round to re-prove clean.

When validated findings remain but cannot be fixed (owner/product input needed) → **escalate**, do not loop. When a fix lands but the next fresh review still finds issues → run another round. Convergence is a fixed point, not a single clean read.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing this skill, MUST use ask the user directly to present options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"$code-review (Recommended)"** — Deeper code quality review
- **"$watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

## Related Skills

| Skill                      | Relationship                                                                | When to Call                                                                                                |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `$why-review`              | **THREE distinct gates** — Phase 0.8 FULL mode (parallel: rationale review of the diff **as authored**, spawned with the dimensional agents) · Phase 6 `--validate-findings` (scoped: verifies the supplied finding-list) · Phase 7.5 FULL mode (holistic: whole **post-fix** target+diff as one artifact) | Phase 0.8 at start, always (standalone); Phase 6 whenever findings exist; Phase 7.5 (standalone) once the loop converges clean. All three deferred to the parent's own steps inside `$workflow-review-changes`. NEVER let one stand in for another — different artifacts, different times. |
| `$docs-update`             | **Mandatory terminal gate (Phase 8)** — final docs sync after the review/fix loop converges; also the primary fix path for flagged staleness | ALWAYS at Phase 8 once review is clean (standalone) — unconditional; AND during Phase 7 for validated staleness findings. Deferred to parent in `$workflow-review-changes`. |
| `$spec-index`              | **Derived index** — regenerates the bucket `INDEX.md`/ERD FROM the Feature Specs (never a source of truth) | After specs change, to refresh navigation aids — NOT for correcting specs |
| `$spec [update]`   | **Configured canonical-owner updater** — the strict default profile uses feature-doc sections §1–8 | Call directly only for targeted default-profile updates; native profiles use their configured owner/carrier path |
| `$spec [mode=tests] [update]`       | **Strict-default test-spec updater** — reconciles test cases in the §8 representation                 | Use only when the strict default profile declares that test-spec carrier; native profiles use their mapped test-sync path |
| `$integration-test-review` | **Mandatory coverage gate (Phase 3.7)** — 7-gate test-quality audit + Gate 7 change-coverage mapping (each behavior change → profile-declared scenario/case mapped to executing tests/assertions/results at configured cardinality; strict default uses spec TCs) | ALWAYS at Phase 3.7 when behavior-bearing code changed (standalone); deferred to the parent's dedicated step in `$workflow-review-changes`. Skip only docs-only diffs |
| `$ui-review`               | **UI/frontend quality gate** — overflow, responsive flex, z-index, SCSS/BEM | Owned by this skill — invoked internally as the UI dimension (ui-ux-designer sub-agent) when the diff has frontend/UI files; NOT a separate workflow step |
| `$code-simplifier`         | **Quality-optimization dimension** — clarity/consistency/maintainability simplifications | Owned by this skill — invoked internally in Phase 3.5 (report mode) when the diff has code files; its findings flow through Phase 6 validation → Phase 7 fix |
| `$domain-entities-review`  | **Domain entity gate (Phase 3.8)** — canonical owner of `SYNC:domain-entity-change-gate`; its Phase 2 A–P checklist IS the gate | Phase 3.8 Mode B, when the diff changes 3+ entity/VO/aggregate files; Mode A reviews inline against the same gate. Skip when the diff has no domain-entity surface |
| `$code-review`             | **Code quality** — deeper review of changed code                            | Always follows changes-review quality pass                                                                  |
| `$fix`                     | **Fix half of `--fix-loop`** — resolves validated blocking findings at the owning layer with its `--target` routing | Only in `--fix-loop` Step 1.4, after `$why-review --validate-findings`; the default path self-fixes in Phase 7 |

## Standalone Chain

> **When called outside a workflow** (i.e., user ran $changes-review directly):

```
changes-review (you are here)
  │
  ├─ Phase 0.8: Parallel rationale dimension (INTERNAL — $why-review FULL mode in a sub-agent, spawned WITH the Phase 0.7 dimensional agents)
  │    → Reviews the diff AS AUTHORED, before any fix — catches a wrong premise the dimensional reviewers cannot see
  │    → Sub-agent is report-only: no /goal bind, no fixes, no integration-test linkage (Phase 3.7 owns it), no $changes-review callback
  │    → Findings merge into the Phase 4 final evaluation → Phase 6 validation → Phase 7 fix
  │    → SKIP inside $workflow-review-changes — the parent's $why-review step (2) owns it
  │
  ├─ Phase 3.5: Code-simplifier optimization (INTERNAL — $code-simplifier over changed code files, report mode)
  │    → Simplification findings feed Phase 6 validation → Phase 7 fix (skip docs-only diffs)
  │
  ├─ Phase 3.7: Integration-test-review coverage gate (INTERNAL — $integration-test-review over the FULL diff, 8 gates)
  │    → Gate 7 maps every behavior-changing production file from its canonical scenario/case to a covering test and assertion/result (integration-first); strict-default profiles also map the declared TCs
  │    → GAP/SPEC-GAP verdicts feed Phase 6 validation → Phase 7 fix
  │    → GAP fix = WRITE the missing test via $integration-test; SPEC-GAP fix = $spec [mode=tests] [update] (skip docs-only diffs)
  │
  ├─ Phase 3.8: Domain entity gate (INTERNAL — SYNC:domain-entity-change-gate over changed entities/VOs/aggregates)
  │    → Mode A reviews inline; Mode B (3+ entity files) delegates to $domain-entities-review
  │    → Gate findings feed Phase 6 validation → Phase 7 fix (skip when no domain-entity surface)
  │
  ├─ Follow-on quality checks (architecture-review → code-review → performance)
  │
  ├─ Phase 5: Documentation Staleness Triage
  │    → If stale docs detected: [REQUIRED] include as finding for Phase 6 validation
  │    → If validated in Phase 6: [REQUIRED] fix in Phase 7 via $docs-update or canonical doc edit
  │    → Then recursively restart $changes-review from Phase 0
  │
  ├─ Integration test check (SYNC:integration-test-sync-check):
  │    → If logic changes touch tested areas: [REQUIRED] → $integration-test [from-changes]
  │    → Then: $integration-test-review → $integration-test-verify
  │
  ├─ Translation sync check (SYNC:translation-sync-check):
  │    → If multilingual UI text changes lack locale updates: [REQUIRED] ask the user directly + explicit decision
  │
  ├─ Spec drift adjudication (SYNC:spec-drift-adjudication) — ALL behavior-changing reviews:
  │    For every behavior-bearing change diverging from the configured canonical owner, classify:
  │    → CODE-WRONG (change violates an intended requirement/invariant) → [REQUIRED] BLOCKING finding; fix code and add/update its profile-mapped guarding test
  │    → SPEC-STALE (intentional new behavior the owner no longer reflects) → [REQUIRED] update the configured owner BEFORE $docs-update, then reconcile its profile-declared scenario/case and mapped tests
  │    → AMBIGUOUS → [REQUIRED] ask the user directly (or canonical spec owner) before editing either side
  │    → SPEC-SILENT (code enforces a correct invariant no canonical artifact states) → [REQUIRED] enrich the configured owner with its missing requirement/invariant and scenario/case, then map the actual guarding assertion/result at configured cardinality; strict default only: `$spec [update]` §4 BR/§3 AC + `$spec [mode=tests]` §8 TC
  │    Bugfix sub-case: if post-bugfix AND spec documents the bug as expected behavior → SPEC-STALE; never let $docs-update codify broken behavior.
  │    Never normalize drift just because code/tests are green.
  │
  ├─ Phase 6 + Phase 7 recursive loop
  │    → If ANY findings exist: $why-review --validate-findings
  │    → If validated findings remain: auto-fix, verify, then restart $changes-review from Phase 0
  │    → Repeat until a full review invocation clears the round's bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW-only ends it)
  │
  ├─ Phase 7.5: [MANDATORY after the loop converges clean — standalone-only] → $why-review FULL mode (NOT --validate-findings)
  │    → ONE real standalone $why-review of the WHOLE target + diff as a single artifact (what scoped per-file/per-dimension review misses)
  │    → If it finds blocking issues at the current bar: fix, then re-run Phase 7.5 until that bar is clear
  │    → SKIP inside $workflow-review-changes — the parent's dedicated $why-review step (14) owns this
  │
  ├─ Phase 8: [MANDATORY FINAL after the current round bar is clear] → $docs-update over the full changeset
  │    → ALWAYS runs (unconditional) — syncs every impacted doc so none stay stale
  │    → docs PROSE edits (no new spec rule); M1-M7 check + read-back, NO full code re-review (guarantees termination)
  │    → SPEC-CONTENT edits (a new requirement/invariant or canonical scenario/case under the configured profile, or a SPEC-STALE correction changing intended behavior) → exactly ONE bounded, module-scoped re-review of the affected package (canonical owner + tests + code) to confirm the rule is enforced and every claimed executor/assertion is mapped; that single pass terminates unless it yields a new validated finding (then normal loop). Under the strict default profile this includes §3/§4/§8; native profiles use their declared carriers. At most once per enrichment, never a full Phase-0 restart.
  │    → A passing review with skipped docs-update is an INCOMPLETE review
  │
  └─ [RECOMMENDED after Phase 8] → $watzup
        Summary of all review findings, doc changes, and test coverage status.
```

> **[CRITICAL — TOP 3 RULES]**
>
> 1. **MUST ATTENTION Phase 0 graph blast-radius FIRST** — NEVER skip; informs entire review order
> 2. **Findings trigger validate → fix → full restart.** Run `$why-review --validate-findings`, fix validated findings that block the current round, then rerun `$changes-review` from Phase 0 until a full pass clears the round's bar — zero findings in round 1, zero CRITICAL/HIGH/MEDIUM from round 2 (a LOW-only round ENDS the loop; defer those LOWs instead of opening another fix/re-review round).
> 3. **MUST ATTENTION task tracking ALL phases** before starting; missing tests MUST surface by asking the user directly — NOT silently logged

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:review-policy -->

> **Executable review policy — one predicate, one durable transition model.** Review skills and their tooling MUST use the canonical helper `.claude/scripts/lib/review-policy.cjs` (policy version 4) for round eligibility. The helper's `blockingFindings(round, findings, hardGates)` predicate returns every validated finding in round 1, and only CRITICAL/HIGH/MEDIUM findings from round 2 onward; `NOT VERIFIABLE` is a separate unresolved-evidence state that remains blocking at every round. Failed binary gates are synthetic CRITICAL blocking findings at every round; record a test-green gate with `kind: 'test'` and every other gate with `kind: 'binary'` (the default). `evaluateRound` retains floor-round LOWs in `deferredLow`, never treats a LOW-only round as blocked after the floor applies, reports `extensionGranted` plus an `ESCALATE` status when the review budget is spent with review blockers open, and reports `failingTestGates` / `testLoopContinues` when failing test gates keep the round open. Severity is assigned before the predicate and never changed to obtain a PASS.
>
> **Round and minimum rules.** `MAX_ROUNDS` (the base budget) is 2 and `HARD_MAX_ROUNDS` is 3; both are ceilings, never targets. Round 3 is an EXTENSION, not part of the default budget: the helper grants it only when the recorded round-2 evaluation still has a validated CRITICAL or HIGH review blocker — a finding, or a failed non-test binary gate carried as synthetic CRITICAL — (`extensionGranted`), grants it at most once per run, and rejects any attempt to reach round 3 without that evidence, except the failing-test continuation below, when round 2's only blockers are failing test gates. **Failing test gates are outside the review budget:** they never earn the extension and never escalate, so while failing `kind: 'test'` gates are the ONLY blockers the helper keeps the run in `CONTINUE` and accepts the next round — past round 3 if needed — until the tests pass. A review blocker past the budget still escalates, and a round with no failing test gate never re-opens the run past its budget. A round-2 evaluation whose blockers are only MEDIUM or `NOT VERIFIABLE` ends the budget and escalates. A clean review ends once `round >= minRounds`; the default minimum is 1 and an explicit `minRounds` may not exceed the base budget of 2 — the extension is earned by evidence, never declared up front. The declaration is persisted and cannot be inferred from a round counter. A failing test-green, security-must-fix, required-artifact, or other binary gate is never waived by the severity floor.
>
> **Durable run record.** A review run MUST identify `runId`, target fingerprint, policy version, target revision, minimum/maximum rounds, completed rounds, full findings/gate evidence, interruption/resume metadata, and acceptance. Use the atomic, lock-serialized transitions in `review-policy.cjs`: `start`, `record`, `accept`, `interrupt`, `resume`, `invalidate`, and `check`. Repeating an identical completed round is idempotent and MUST NOT consume budget twice. A changed target fingerprint invalidates prior evidence and acceptance but MUST preserve the bounded round budget; stale evidence cannot be accepted. A policy-version change (including the round-2 LOW floor and the conditional round-3 extension) invalidates old records; start a new run rather than interpreting old evidence under new semantics. Interrupted/resumed runs retain completed rounds and findings. The record is bookkeeping, not consent, native permission, or proof that a host actually performed the review.
>
> **CLI boundary.** The helper CLI accepts JSON on stdin and uses its own real clock; a supplied `now` is rejected. State directories must be absolute, non-root real directories, records are size-bounded, and malformed/locked state fails closed for the transition. Full reports remain on disk; an inline result envelope is only a transport summary. Any new review policy consumer must add a semantic fixture, boundary counter-cases, a seeded mutant, and a report with the target fingerprint and command exit status.

<!-- /SYNC:review-policy -->

<!-- SYNC:cross-stack-impact-trace -->

> **Cross-Stack Impact Trace** — FIRST review action: comprehend change holistically, THEN judge files. Every reviewed diff: note change context, trace full pipeline of main affected area end-to-end across client↔server seam, so a change on one tier can never silently break the other. (Distinct from `SYNC:cross-service-check`, which owns service-to-service / event boundary — this owns client↔server tier seam inside one app; pair both for full-pipeline coverage.)
>
> 1. **Comprehend context FIRST** — before file-by-file review, write short **Change Context** note: what changed, intent (why), originating tier (frontend / backend / shared / infra), main affected feature/flow. Do before flagging anything.
> 2. **Identify cross-stack seam(s)** — for main affected area, locate contract seam(s) between client and server: API route/endpoint + verb, request/response DTO or payload shape, shared type/schema, event/message contract, query/route params. Infer tier layout from `docs/project-config.json` and project conventions.
> 3. **Trace full pipeline end-to-end, in change's direction:**
>     - **Backend change → trace FORWARD to every frontend consumer:** handler/controller → response DTO/serializer → API client/service → store/state → component/template rendering or submitting it.
>     - **Frontend change → trace BACKWARD to backend contract:** component/form → API client call → route/endpoint → request DTO/validation → handler/domain.
>     - When `.code-graph/graph.db` exists, use `$graph-connect-api` and `python .claude/scripts/code_graph trace <file> --direction both --json` to map connection; otherwise grep route path, DTO/type name, each field name across BOTH tiers.
> 4. **Verify BOTH sides still agree** — for every changed seam confirm other tier matches: route path & verb, field names & types, nullability/optionality, required vs optional params, enum values, auth/permission, error/status shape. Any mismatch = **BREAKING** finding (backend change breaks a frontend consumer, or frontend now sends what backend rejects).
> 5. **Classify each seam:** NONE (no contract change) / ADDITIVE (backward-compatible) / BREAKING (consumer on other tier must change too). BREAKING seam whose other-tier consumer NOT updated in same diff = HIGH severity minimum (CRITICAL for auth/money/data-integrity paths).
>
> **Skip ONLY** when change has no cross-tier seam — pure docs, pure styling with no data contract, or single-tier tooling. State explicitly: `Single-tier change — no cross-stack seam`. Backend-only or single-tier repo still traces internal consumers (`SYNC:cross-service-check` for service/event boundaries).
>
> **BLOCKED until:** Change Context noted · seam(s) identified or explicit N/A · full pipeline traced in change direction · every changed seam classified NONE / ADDITIVE / BREAKING.

<!-- /SYNC:cross-stack-impact-trace -->

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the *concern axis*; orient with these examples, derive what fits the repository:
>
> | Category Type | Example Groupings |
> | --- | --- |
> | Agent/Tooling | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs | Root README, project config, CI/CD pipeline configs |
> | Reference docs | Architecture docs, patterns references, setup guides |
> | Feature/domain docs | Business feature documentation, spec files, ADRs |
> | Backend logic | Service/handler/controller source (infer from project structure) |
> | Frontend logic | UI component/state/API source (infer from project structure) |
> | Data/Schema | Migrations, schema files, seed data |
> | Tests | Unit, integration, E2E test files |
> | Infrastructure | Docker, k8s, CI/CD, cloud manifests |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `tmp/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>   - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate by asking the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

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

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle or an explicitly declared independent-pass minimum, not by a round number alone. Review purpose: `review → validate findings → fix validated findings that block the current round → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop once the persisted `minRounds` is met (default 1); an explicitly declared minimum such as 2 still requires that independent pass.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — "double-round-trip" means a validated-finding fix cycle forces at least one fresh re-review. It runs until the current round's exit bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred), bounded by the **2-round ceiling — extendable ONCE to round 3 when CRITICAL/HIGH remain** — defined below. A failing **test gate** (a suite that must actually pass) is outside that ceiling: the loop keeps fixing and re-running until the tests pass.
>
> **Round cap — 2 rounds MAX, extendable ONCE to round 3 (a ceiling, NEVER a target).** A clean pass ENDS the loop at ANY round once `round >= minRounds` — round 1 included with the default minimum; the cap never obliges an extra round. What happens when round 2 completes with blocking findings still open (severity floor applied) depends on WHAT is still open:
>
> - **Validated CRITICAL or HIGH still open → ONE extra round is granted (round 3, the review hard cap).** A failed non-test binary gate (security must-fix, required artifact, generated parity, policy compliance) counts as a CRITICAL blocker here. The extension is earned by that evidence alone, is never a default, is granted at most once per run, and never renews. Record the granting findings in the run record and report.
> - **Only MEDIUM (or an unresolved `NOT VERIFIABLE`) still open → NO extension.** → **STOP and escalate by asking the user directly** with the still-open findings listed.
> - **Round 3 completes with ANY review blocker still open → STOP and escalate by asking the user directly.** Round 3 is the review hard cap; no review finding or non-test gate opens a round 4.
> - **A failing TEST gate → NO round cap, at any round.** Failing tests never escalate for budget or no-progress and never buy or spend the extension: run the failed-test investigation gate, fix at the owning layer, and re-run until the tests pass — past round 3 if needed. NEVER weaken an assertion, add a skip, or relax a timeout to force green. Review blockers open beside failing tests still follow the bullets above.
>
> NEVER emit a silent "good enough" PASS on cap exhaustion, NEVER let the cap substitute for the clean-review requirement, and NEVER loop past round 3 on review blockers — only failing test gates continue beyond it. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 2, LOW stops blocking.** The exit bar tightens after the first review pass, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in round 1 and only validated CRITICAL/HIGH/MEDIUM findings from round 2 onward. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so; in practice binary gates always remain blocking when they fail.
>
> | Round | Exit bar — loop ENDS when the fresh full review has… | Must be fixed to continue |
> | --- | --- | --- |
> | 1 | zero validated findings at ANY severity | CRITICAL · HIGH · MEDIUM · LOW |
> | 2 | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 3 — extension round, reachable ONLY when round 2 left CRITICAL/HIGH open (or failing tests were the only blocker) | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only clears the severity bar** | CRITICAL · HIGH · MEDIUM only |
> | 4+ — test-gate continuation, reachable ONLY while failing test gates were the sole blocker | the tests pass and no review blocker is open | failing tests; any review blocker here escalates |
>
> From round 2 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop once the persisted minimum is met** — do not open another fix/re-review round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM must clear the current round · LOW record/defer); round 1 remains strict, so a LOW found initially is still validated and fixed when warranted before the floor can apply.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥2)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **Never re-tier a finding to reach — or to dodge — the extension.** The extension is unlocked by a real CRITICAL/HIGH, so promoting a MEDIUM to HIGH to buy round 3, or demoting a real CRITICAL/HIGH to MEDIUM to force an earlier escalation, are both FALSE classifications. Severity is set by consequence before the round bar and the extension test are applied. — why: an extension that can be reached by relabeling bounds nothing.
> - **The floor bounds the loop, not the standard.** It ends *iteration*; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `$why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `$why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS if `round >= minRounds`; otherwise perform the explicitly required independent pass. Do NOT invent a confirmation pass.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings that block the current round, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared and persisted minimum met → END; blocking findings remain → validate findings → fix → restart from the first review phase. Round 1 clears only on zero findings at any severity; **from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted minimum is met** (deferred LOWs go in the report). Capped at **2 rounds, extendable ONCE to round 3 when round 2 leaves validated CRITICAL/HIGH open**. Escalate by asking the user directly at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 2 completes with MEDIUM-only (or `NOT VERIFIABLE`) blocking, which earns no extension · round 3 completes with any review blocker still open. A failing test gate triggers none of these escalations — it loops until green. NEVER loop past round 3 on review blockers, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review when `minRounds=1`; an explicitly declared `minRounds=2` requires the independent second pass
> - From round 2 on, a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-2 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early once the persisted minimum is met, and cap exhaustion escalates rather than passes
> - Enforce the base cap of 2 rounds, the single conditional extension to round 3 (unlocked ONLY by validated CRITICAL/HIGH open at round 2; a failed non-test binary gate counts as CRITICAL), and the 2 repeated-no-progress blocker rule together; all three are escalation triggers for review blockers, none is a completion criterion
> - The extension is granted at most ONCE per run and never renews — round 3 is the review hard cap regardless of what it finds
> - Failing test gates are outside the round budget: never escalate them for budget or no-progress, never let them buy the extension, and keep fixing and re-running until the tests pass — never forcing green
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥2)` whenever the loop ended on the severity floor with LOWs still open. When round 3 ran, the report must name the CRITICAL/HIGH findings that granted the extension; when rounds continued on failing tests, it must name the failing test gates of each such round.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero findings at any severity; **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify every finding by consequence, not by fix effort; `SYNC:severity-rubric` is authoritative and this is only a quick reminder:**
> - **CRITICAL → block immediately:** an immediate material security/authorization or safety bypass, secret/PII exposure, destructive action, data loss/corruption, or silent failure on a critical path. A failed binary gate is a separate hard blocker (represented as synthetic CRITICAL by the executable policy), not an ordinary tier judgment.
> - **HIGH → must fix before PASS/merge:** wrong behavior on a supported path, violated business/data invariant, meaningful privacy/authority gap, breaking contract/compatibility change, likely material harm, or missing proof for a behavior-changing fix.
> - **MEDIUM → clear before the current round can pass:** a bounded but consequential edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift with real impact but no immediate material loss. If the fix needs an owner/product decision, stop and escalate with an explicit follow-up and residual-risk record; that record is not a clean-pass waiver.
> - **LOW → record/defer from round 2 onward:** wording/formatting, minor documentation or convention drift, optional defensive cleanup, or cosmetic refinement with no credible present correctness, security, privacy, authority, availability, or data-integrity impact.
> Assign the highest tier supported by evidence. An observation is not a finding until it names the affected asset/user/data/contract, consequence, evidence, and tier. Effort, annoyance, implementation cost, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is an evidence state, not a tier; if the unresolved claim could affect a required behavior or binary gate, keep it blocking until proved or explicitly owner-accepted with residual risk. Failed tests, parity, required artifacts, and security-must-fix checks are binary gates and block independently of severity. For the full decision tree, boundary examples, score mappings, and domain-vocabulary normalization, follow `SYNC:severity-rubric`.

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

<!-- SYNC:integration-test-sync-check -->

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`). Exclude migration files: schema/data migrations are one-time execution paths, not core application logic.
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use ask the user directly: "Business logic file `{file}` has no integration tests — run `$integration-test` before proceeding, or confirm tests already written?" Options: "Run `$integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Surface every business-logic change that lacks test coverage for an explicit user decision — never silently skip. — why: a silent skip ships untested business logic to production.**

<!-- /SYNC:integration-test-sync-check -->

<!-- SYNC:translation-sync-check -->

> **Translation Sync Check** — Verify multilingual UI changes include translation updates.
>
> 1. Determine multilingual mode from project config: `localization.enabled === true` and `supportedLocales.length > 1`
> 2. Detect UI-facing file changes via extensions/path patterns (`.ts`, `.tsx`, `.html`, `.css`, `.scss` plus `localization.uiPathPatterns` when configured)
> 3. For multilingual UI changes, verify translation resource diffs exist (`localization.translationFilePatterns` when configured)
> 4. If translation updates are missing → **MANDATORY**: use ask the user directly: "UI text changed in a multilingual project, but translation updates were not detected. Run translation sync now or proceed with explicit risk acceptance?" Options: "Run translation sync first" (Recommended) | "Proceed with explicit risk acceptance"
> 5. Severity: **HIGH** — no silent pass for multilingual UI text changes without explicit translation-sync decision
>
> **Do NOT silently skip. Multilingual UI text changes require explicit translation-sync confirmation.**

<!-- /SYNC:translation-sync-check -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `$project-init` or `$project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `$project-init` or `$project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `$project-init` or the narrow owner route (`$project-config`, `$docs-init`, `$scan --target=<key>`, `$ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `$sync-codex` route or its documented `$ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever behavior diverges from a canonical owner artifact under the configured business root (`specRoots.business.path`, default `docs/specs`), you MUST NOT silently pick a side. Resolve and validate `specArtifacts` from `docs/project-config.json`: when valid, use its `intent/contracts/evidence` section roles and native case carriers; only when absent, use the strict-default Feature Spec sections (§3 AC, §4 BR, §5 invariant, §8 TC). A malformed or unsupported declaration blocks; never fall back. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the owner's documented intent/contracts and linked evidence. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>    - **CODE-WRONG** — the owner artifact correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior, creating or updating a regression case in the configured native carrier (strict-default TC when no profile exists).
>    - **SPEC-STALE** — the change is the new intended behavior and the owner now documents the old/wrong behavior → update the canonical owner FIRST through the configured spec workflow, then synchronize its evidence/test carriers. Without a profile, use `$spec [mode=update]`, `$spec [mode=tests]`, then `$spec [mode=sync]`.
>    - **AMBIGUOUS** — intended behavior is unclear → ask the user or canonical spec owner before editing either side.
>    - **SPEC-SILENT** — code correctly enforces an invariant/behavior absent from the owner artifact → not drift but an UNWRITTEN rule. Prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, add it to the configured `intent` or `contracts` section, and link it from `evidence` to a native case with an inspected assertion. Without a profile, use the invariant-harvest workflow to add the rule to strict-default §4 (or §3/§5) and a guarding §8 TC. A discovered invariant left only in code or tests is INCOMPLETE.
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured in the configured owner and case evidence (strict-default §4/§8) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

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


<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:domain-entity-change-gate -->

> **Domain Entity Change Gate** — ONE DDD-specific protocol binding every skill or agent that PLANS, IMPLEMENTS, or REVIEWS a change to a domain entity, value object, or aggregate in a model that uses DDD tactical patterns or an evidenced equivalent. First inspect the project's domain model and accepted architecture. If neither uses that model, record `DDD-specific gate N/A — project model: <evidence>`; still apply the project's normal ownership, invariant, assertion-backed test, and evidence rules. `$domain-entities-review` is the canonical owner of the full A–P checklist; this gate is the shared trigger plus the decisions that must be answered when applicable. NEVER re-derive a weaker local copy — why: when planning and review disagree on entity rules, the plan ships a design that review then rejects, and the rework is paid twice.
>
> **Trigger — after DDD applicability is established, fires when ANY holds:** a new entity / value object / aggregate root is introduced · an existing one gains or loses a field, invariant, relationship, or state transition · an aggregate boundary, repository, or cross-aggregate reference changes · a domain event is added, renamed, or re-payloaded · a concurrency or reconstitution concern on a root changes. State `No domain-entity surface — gate N/A` when none holds.
>
> **Step 1 — Detect BEFORE deciding.** Both answers change which rules even apply:
>
> - **Paradigm** (per aggregate, from the code — NEVER assumed): OO-mutable · type-driven/immutable · event-sourced. Setter, mutability, and reconstitution rules are written for OO-mutable; applying them to the other two manufactures false findings and false plan tasks.
> - **Subdomain fit:** core (rich model owed) · supporting (Active Record or light model) · generic (buy, do not model) · CRUD (Transaction Script — a rich entity here is ceremony). NEVER plan or flag a rich model where the subdomain has no invariant beyond required-field.
>
> **Step 2 — Answer all 6 decision points.** Each is a decision the change MUST make explicitly:
>
> | # | Decision point | Answered when |
> | - | -------------- | ------------- |
> | 1 | **Classification** — entity vs value object vs aggregate root | The swap test is applied ("would an identical copy be interchangeable?"); a VO is immutable with structural equality and has no repository |
> | 2 | **Invariant ownership** — entity owns "can this state exist?", the boundary owns "is this input acceptable?" | Each rule is placed on one side and named; failure signalling (throw vs `Result`) matches the project convention consistently; a DB constraint is a backstop, NEVER the rule |
> | 3 | **Aggregate boundary + concurrency** | Only true always-consistent invariants share an aggregate; cross-aggregate references are by ID; one aggregate mutates per transaction; the ROOT carries the concurrency token; set-based invariants (uniqueness across instances) name a real enforcing mechanism, never an in-memory check |
> | 4 | **Construction vs reconstitution** | Creation and load are separate paths; the load path raises NO domain events and re-runs NO creation rules; required data sits in the constructor/factory |
> | 5 | **Events** | Raised inside the aggregate; dispatched AFTER commit (outbox when crossing a process); internal domain events kept distinct from published integration contracts; handlers idempotent |
> | 6 | **Test obligation** | Every applicable invariant is named and protected by an executing assertion in the project's native test format, with property and boundary-countercase coverage where applicable; GWT is optional. A valid `specArtifacts` profile supplies case identity/carriers; use property TCs only when the profile is absent. A malformed declared profile blocks; a happy-path example alone is NOT coverage |
>
> **Step 3 — Apply by context.** Same decisions, different obligation:
>
> | Calling context | Obligation |
> | --------------- | ---------- |
> | **Planning** (`$plan`) | The plan MUST name the decision and the owning file for every triggered row. An unanswered row is a plan that is not executable — surface it, do NOT let implementation discover it. |
> | **Plan review** (`$plan-review`) | An unanswered, hand-waved, or deferred-to-implementation row is a FINDING with `file:line` into the plan. Presence of the word "entity" is NEVER an answer. |
> | **Implementation** (`$plan-execute`, `$fix`, and any implementing agent — e.g. `backend-developer`) | The decisions are INPUTS, not questions to reopen: implement each triggered row as the plan/spec decided it, at the owning file it named. A row that arrives UNANSWERED is a blocker — surface it and get it decided; NEVER settle it silently at the keyboard, and NEVER pick an aggregate boundary from a DB table or UI screen because the plan left it open. Paradigm and subdomain fit still gate which rules apply. |
> | **Change review** (`$changes-review`) | Route to the owner — **Mode A (default):** read `$domain-entities-review`'s Phase 2 A–P checklist and apply it as review lenses. **Mode B (escalation):** delegate to `$domain-entities-review` when standalone AND the diff carries 3+ entity files. Findings enter the normal finding set with `file:line` + severity. |
>
> **Duplication guard — SKIP the gate entirely when ANY row holds.** Record the deferral line, then proceed:
>
> | Suppressing context | Deferral line |
> | ------------------- | ------------- |
> | The running skill IS `$domain-entities-review` | `Gate is this skill's own body — A–P checklist owns it.` |
> | Invoked inside `$workflow-review-changes` (its step 4 runs `$domain-entities-review` as a dedicated conditional parallel member) | `Gate deferred to workflow step 4 $domain-entities-review.` |
> | `$why-review` running in `--validate-findings` terminal mode | `Gate N/A — validate-findings is terminal, no sub-skill calls.` |
>
> — why: unguarded, this edge duplicates a review the parent workflow already runs and closes a `changes-review → domain-entities-review → why-review → changes-review` cycle.
>
> **BLOCKED until:** DDD applicability evaluated with project evidence (or the DDD-specific gate is recorded N/A) · if applicable, trigger evaluated (or `gate N/A` recorded), paradigm + subdomain fit stated, all 6 triggered decision points answered or raised as findings, and guard row checked before any delegation.

<!-- /SYNC:domain-entity-change-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q`, ~130 checks with failure signals and default severities): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (backlog) · `P4` note. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order.** §A core usability heuristics · §B cognitive load & decision design · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture · **§F web / §G mobile / §H desktop — conditional on platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** when a changed model uses DDD tactical patterns or an evidenced equivalent, apply the **Domain Entity Change Gate** — `$domain-entities-review` owns the full A–P checklist; detect paradigm + subdomain fit FIRST, then answer all 6 applicable decisions (classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · assertion-backed native test obligation). Use property TCs only under the absent-profile default; a malformed declared `specArtifacts` profile blocks without fallback. When the project does not use this model, record the DDD-specific gate N/A and still protect actual invariants and outcomes through the configured owner. Planning must NAME each applicable decision; plan review treats an unanswered row as a FINDING; change review routes to the owner (Mode A read / Mode B delegate). SKIP under the 3-row duplication guard and record the deferral line. — why: one protocol shared by planner and reviewer is what stops a plan shipping an entity design that review then rejects.

<!-- /SYNC:domain-entity-change-gate:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files before concluding when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT code does matches WHY it changed. Trace happy + error paths.

<!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundaries, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map changed code paths to test cases. Flag untested paths.

<!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:integration-test-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** check changed logic files for matching tests. Surface missing tests by asking the user directly — mandatory, not advisory.

<!-- /SYNC:integration-test-sync-check:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates. If missing, require explicit user decision by asking the user directly.

<!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:cross-stack-impact-trace:reminder -->

**MUST ATTENTION** FIRST review action — note change context + holistically trace full pipeline of main affected area across client↔server seam (BE→FE forward, FE→BE backward). Verify both tiers still agree on route/DTO/field/type/nullability/auth; any mismatch = BREAKING finding. Skip only for single-tier / docs-only changes (state so).

<!-- /SYNC:cross-stack-impact-trace:reminder -->

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

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `$project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `$project-init` or `$project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing; select the authoritative invariant owner from project architecture and retain validation at untrusted boundaries. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated blocking findings → FULL re-review. Any newly produced output/judgment gets ≥1 self-review, and any new judgment ≥1 `$why-review --validate-findings` pass, before it is treated as final.
- **MANDATORY severity floor:** round 1 exits only on zero findings at any severity; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop once the persisted `minRounds` is met — list every deferred LOW in the report. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY round cap of 2, extendable ONCE to round 3 — a ceiling, NEVER a target.** A clean pass ends the loop once the persisted `minRounds` is met (default 1; explicit 2 requires an independent pass). Round 2 ending with a validated CRITICAL/HIGH still open (a failed non-test binary gate counts as CRITICAL) grants exactly ONE extra round; round 2 ending with only MEDIUM/`NOT VERIFIABLE` open, or round 3 ending with any review blocker open → **STOP and escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule escalates earlier if it trips first. A failing TEST gate has NO round cap and buys no extension — keep fixing and re-running until tests pass, never forcing green.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture-review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture-review`, `integration-test-review`, `security-review`, `performance-review`, `ui-review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review current working-tree, staged, branch, or commit diffs across code, docs, config, infra, and non-code artifacts — finding correctness bugs, flaws, missing updates, stale docs, and convention drift with evidence — so every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.

**IMPORTANT MUST ATTENTION** follow the ordered review path: Phase -1 self-recursive loop → Phase 0 graph blast radius → Phase 0.1 full-pipeline trace → Phase 0.3 risk tasks → Phase 0.7 surface detection → Phase 0.8 rationale review → Phase 0.5 plan compliance → Phase 1 collect/report → Phase 2 file review → Phase 3 fresh-context gate → Phase 3.5 simplifier for code → Phase 3.7 behavior coverage → Phase 3.8 domain gate for entities → Phase 4 finalize → Phase 5 docs triage → Phase 6 why-review validation → Phase 7 validated fix/full restart → Phase 7.5 holistic why-review → Phase 8 docs-update.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above — MUST ATTENTION honor the full block, NEVER act on the digest alone):**

- **Systematic Batching:** ≥10 files → size-capped parallel batches.
- **Debugger Trace:** bug/fix → End→Start backward trace gate.
- **Critical Thinking:** every claim traced; confidence >80% to act.
- **Sequential Thinking:** multi-step Thought N/M with markers.
- **Understand Code First:** grep 3+, read code before changes.
- **Design Patterns Quality:** DRY/SOLID, right responsibility layer.
- **Complexity Prevention:** one business change = one code change.
- **Double Round-Trip Review:** validate → fix only current-round blocking findings → full re-review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred; binary gates always block).
- **Fresh Context Review:** fresh zero-memory sub-agent after fixes.
- **Review Protocol Injection:** embed 11 protocols verbatim into sub-agent prompts.
- **Logic And Intention Review:** WHAT code does matches WHY changed.
- **Bug Detection:** null, boundaries, error handling, resource cleanup.
- **Test Spec Verification:** map changed paths to test cases.
- **Integration Test Sync:** missing tests surface by asking the user directly.
- **Translation Sync:** multilingual UI text changes need translation updates.
- **Category Review Thinking:** derive categories from file + change nature.
- **Graph-Assisted Investigation:** run graph trace on key files.
- **Nested Task Creation:** expand child phases, link parent.
- **Project Reference Docs:** read required docs including `lessons.md`.
- **Task Tracking + Report:** bootstrap tasks, persist findings incrementally.
- **Source/Test Drift:** behavior change → reconcile affected tests.
- **Spec Drift:** classify CODE-WRONG/SPEC-STALE/AMBIGUOUS/SPEC-SILENT, route fix.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** classify Critical/High/Medium/Low by consequence.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

> **[CRITICAL — TOP 3 RULES REPEATED]**
>
> 1. **MUST ATTENTION Phase -1 self-recursive review-loop binding is the FIRST ACTION (standalone)** — bind it (protocol loop primary, host-independent; optional `/goal` gate WHEN available) before Phase 0 so stopping is blocked until a whole-diff review pass clears the current round bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred); Phase 0 graph blast-radius is the first *review* step. Skip Phase -1 only inside `$workflow-review-changes` (parent owns the goal).
> 2. **MUST ATTENTION findings follow the active ownership boundary, and validated findings are SELF-FIXED, not handed back.** Standalone mode runs Phase 6 validate → Phase 7 self-fix → full whole-diff `$changes-review` restart (combined with prior fixes, not just the last fix), looping until the current round bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred); inside `$workflow-review-changes`, stop after the report and hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.
> 3. **MUST ATTENTION task tracking ALL phases** before starting; missing tests MUST surface by asking the user directly

- **MANDATORY** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via task tracking with `[N.M] $changes-review — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage. Workflow row is container, not substitute.
- **MANDATORY** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY** validate decisions with user by asking the user directly — NEVER auto-decide
- **MANDATORY** add final review todo task to verify work quality
- **MANDATORY** discover and READ project-specific reference docs before starting
- **MANDATORY** Phase 0 graph blast-radius is FIRST step — NEVER skip it
- **MANDATORY** any finding must be validated before fix; standalone mode invokes `$why-review --validate-findings`, while `$workflow-review-changes` parent mode stops after the report and hands findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step
- **MANDATORY** after fixing validated findings in standalone mode, recursively invoke `$changes-review` again from Phase 0 with a brand-new task breakdown and review the full current diff, not only the fixed files; in parent mode, parent steps 10–14 own the fix plan, feature-implement, and full restart
- **MANDATORY** continue validate → fix → full restart until one complete review invocation clears the current round bar (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs deferred); standalone mode executes that loop locally, parent mode reports findings to `$workflow-review-changes` for the loop
- **MANDATORY** documentation staleness check is REQUIRED in every review — flag stale docs even if not auto-fixing
- **MANDATORY** run the **Phase 0.8 Parallel Why-Review Rationale Dimension** at the START of every standalone review — spawn ONE `general-purpose` sub-agent in the SAME parallel batch as the Phase 0.7 dimensional agents (one message, all agents together; NEVER a blocking pre-step) that invokes `$why-review` in FULL mode over the diff as authored, under all four report-only constraints (NEVER bind `/goal` — a sub-agent cannot own the session Stop hook · NEVER fix · SKIP the Integration-Test-Review Linkage, Phase 3.7 owns it · NEVER call back into `$changes-review`). Merge its findings into the Phase 4 final evaluation, where they become ordinary findings for Phase 6 validation and Phase 7 fixes. Deferred inside `$workflow-review-changes` to the parent's `$why-review` step (2). A clean Phase 0.8 NEVER exempts Phase 7.5 — 0.8 reviews the PRE-fix diff, 7.5 reviews the POST-fix package — why: every dimensional reviewer is scoped to a category and none asks whether the change was the right call at all; surfacing a wrong premise only at Phase 7.5 means the entire fix loop was spent building on it.
- **MANDATORY** run the **Phase 7.5 Holistic Standalone Full-Mode Why-Review gate** once the dimensional review/fix loop clears the current round bar, in standalone mode — invoke the `$why-review` skill in FULL mode (an ACTUAL skill invocation call, NOT `--validate-findings`, NOT inline self-review) ONCE over the WHOLE review target combined with the current changes as a single artifact, exactly as a user running `$why-review` against the target directly; fix only validated findings that block the current round bar and re-run until that bar is clear (round 1: zero findings; round 2: zero CRITICAL/HIGH/MEDIUM, with LOWs recorded as deferred); deferred only inside `$workflow-review-changes` to the parent's dedicated `$why-review` step (14) — why: the per-file/per-dimension reviewers and the Phase 6 `--validate-findings` gate are scoped and routinely miss whole-package design-rationale/holistic issues that a standalone full-mode `$why-review` of the target catches; a clean dimensional review with a skipped holistic pass is INCOMPLETE
- **MANDATORY** run the **Phase 8 final `$docs-update` gate** once the review/fix loop clears the current round bar — ALWAYS, unconditional, never skipped on a passing verdict (deferred only inside `$workflow-review-changes` to the parent's docs-update step) — why: a passing code review still leaves docs stale until docs-update reconciles every impacted doc against the actual changes; a passing review with skipped docs-update is INCOMPLETE
- **MANDATORY** run the **Phase 3.5 Code-Simplifier Optimization gate** whenever the diff includes code files — invoke `$code-simplifier` (report mode) over the changed code files, record its clarity/consistency/maintainability findings in the report, and route them through Phase 6 validation → Phase 7 fix; skip ONLY for docs-only diffs (record the skip reason) — why: correctness review proves it works, the simplifier gate proves it stays cheap to change, and the step is silently dropped without an anchored reminder
- **MANDATORY** run the **Phase 3.7 Integration-Test-Review Coverage Gate** whenever the diff includes behavior-bearing code — invoke `$integration-test-review` over the FULL change set (production code AND tests); its Gate 7 must map every behavior change from the configured canonical scenario/case to a covering test and assertion/result (integration-first; unit fallback justified); strict-default TC mapping applies only when declared by that profile. Every GAP/SPEC-GAP becomes a finding for Phase 6 validation → Phase 7 fix (GAP fix = write the missing test); skip ONLY for docs-only diffs with recorded reason, and defer to the parent's dedicated `$integration-test-review` step inside `$workflow-review-changes` — why: a correct-looking change with no covering test or stale spec ships unprotected behavior; the pairing check alone proves file names, not coverage
- **MANDATORY** missing tests for changed business logic MUST surface to user by asking the user directly — NOT silently logged
- **MANDATORY** run the **Phase 6 Why-Review Findings Validation Gate** whenever ANY finding exists in standalone mode — invoke the `$why-review` skill through the skill invocation with `--validate-findings` (terminal mode, same session; an ACTUAL skill call — re-reading the cited lines yourself or any inline/manual self-validation does NOT satisfy this gate). The moment the first finding is recorded, register `[Review Phase 6] Why-review findings validation gate — invoke $why-review` via task tracking so it is never forgotten. Verify every finding is correct, proof-backed, reasonable, and best-practice; RE-DO it ONLY if it surfaces finding issues or enhancement opportunities (at most 1 re-do, then escalate by asking the user directly); then Phase 7 fixes validated findings and restarts this skill. Inside `$workflow-review-changes`, do not run Phase 6/7 locally; hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.
- **MANDATORY** follow declared step order; NEVER skip, reorder, or merge steps without explicit user approval
- **MANDATORY** every skipped step includes explicit reason; every completed step includes concise evidence
- **MANDATORY** Report-driven — write every finding to `tmp/reports/code-review-{date}-{slug}.md` incrementally as each file/dimension is reviewed, NOT in one final batch — why: the report is external memory AND the deliverable; findings held only in context are lost on compaction
- **MANDATORY** Evidence Gate — back every claim, finding, and recommendation with `file:line` proof or a traced call chain plus a confidence read (>80% act, 60-80% verify first, <60% DO NOT recommend); speculation is FORBIDDEN output and "insufficient evidence" is a valid verdict — why: an unproven finding wastes the author's time and erodes trust in the whole report
- **MANDATORY** Convention-before-flag — grep 3+ existing examples before flagging ANY pattern, naming, or style violation; codebase convention wins over textbook rules — why: flagging against a rule the project never adopted manufactures false positives
- **MANDATORY** Enforce YAGNI / KISS / DRY / Clean Code on changed code — flag speculative generality, needless complexity, and duplicated knowledge; 3+ similar patterns = MANDATORY extraction, 2+ same-kind violations = a structural finding (not individual nits) — why: these are the day-to-day forms of the Easy-to-Change success metric
- **MANDATORY** Spec Drift Adjudication runs for EVERY behavior-changing review (not only post-bugfix) — classify each divergence CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and route the owed owner/test correction through the configured profile; use a regression TC and `$spec [update]` + `$spec [mode=tests]` only under the strict default profile; record `Spec in sync` when none — why: passing code and tests can still silently normalize a spec violation
- **MANDATORY** Dual-Feedback Ledger — every behavior-changing finding must feed BOTH the configured canonical owner AND the mapped tests; a blank or bare-"N/A" cell on either axis = FAIL (each N/A carries its reason inline) — why: fixing only the code leaves the canonical behavior or its test mapping stale and the gap reopens next change
- **MANDATORY** Bugfix Debugger Trace Gate (§6.5) — for bugfix / regression / failed-verification / stale-output / behavior-changing fixes, FAIL the review unless an End→Start debugger trace, enumerated feeder paths, hypothesis matrix, lowest-owning-fix-layer justification, and forward-convergence + regression-test proof are all present — why: a fix without a trace patches the symptom site and the bug recurs
- **MANDATORY** Fresh-Context Gate (Phase 3) is review-ONLY — it may ADD findings but NEVER fixes or validates them, NEVER re-reviews known findings, and does NOT run merely because Phase 7 restarted; any non-zero finding set flows straight to Phase 6 — why: re-reviewing known findings burns context without adding signal
- **MANDATORY** Integrate sub-agent and synthesis findings RAW into the main report — read them, NEVER filter, soften, or override them — why: the main agent rationalizes away its own mistakes; the zero-memory sub-agent exists to catch exactly those
- **MANDATORY** When the diff includes frontend/UI files, `$changes-review` OWNS the UI dimension — run `$ui-review` (prefer a `ui-ux-designer` sub-agent in the same parallel batch): long-content overflow, responsive flex sizing, z-index discipline, project-selected styling conventions; skip only when no frontend files changed — why: `$ui-review` is never a separate workflow step, so a skipped UI pass ships UI defects unreviewed
- **MANDATORY** M1-M7 Code-to-Spec Drift Gate (§8, BLOCKING) for any spec/feature-doc/PBI/story/test-spec the change touches or should sync — FAIL on introduced tech leakage (M1) / source-code-as-prose (M2) / broken logical-ID mapping (M3) / AC ambiguity (M4) / spec no longer rebuildable from artifact alone (M5) / **a NON-DEMOABLE case added to a business spec (M7)**; a FAIL must name the violated mandate ID + changed file:line; carriers (`[Source:]`, `**Evidence**`, frontmatter, mermaid) are EXEMPT — why: passing an introduced M1-M5/M7 violation makes the review itself defective
- **MANDATORY** M7 gates the bugfix→spec pump — for EVERY case the diff ADDS to a business spec, apply the demo test to its BODY (*what would a stakeholder SEE change?*); an invocation-shaped `When` or a schema/type/call-count `Then` FAILS **even in flawless tech-free prose**. If a technical fix changed no business behavior, the business spec should usually gain NOTHING — a no-op is a correct outcome; the regression test belongs in the technical tree — why: M1 governs vocabulary and M7 governs subject matter, so an M1-only reviewer waves through a non-demoable case on every bugfix and the business tree rots one defensible case at a time
- **MANDATORY** Architecture Boundary Check — for each changed file, read `architectureRules.layerBoundaries` from `docs/project-config.json`, match the file's layer, grep its imports, and BLOCK as Critical on any import from a `cannotImportFrom` layer; skip silently when `architectureRules` is absent — why: a layer-boundary breach compiles and ships silently while rotting the architecture
- **MANDATORY** AI Agent Integrity Gate before reporting ANY work done — grep every removed name (0 dangling refs across ALL file types), ask WHY before changing an existing value, verify ALL affected outputs (one green ≠ all green), evaluate pattern fit before copying nearby code (same scope/lifetime/base class/constraints), and prove every new artifact is wired (registered, imported, reachable) — why: completion ≠ correctness, and an unverified "done" is an untested hypothesis
- **MANDATORY** Large changeset (≥10 changed files) → Systematic Review Batching — categorize, size-cap batches (≤8 files OR ≤2000 diff-lines), fire one parallel sub-agent per batch, then reduce; >6 categories OR >40 files adds the hierarchical synthesis tier with the cross-concern interaction pass; ANNOUNCE any dropped/sampled scope — never review many files one-by-one and never let bounded coverage read as complete — why: a single agent's context silently truncates on big diffs, leaving files unreviewed

> **[BOTTOM REMINDER — WHY-REVIEW FINDINGS-VALIDATION GATE IS NON-NEGOTIABLE]**
>
> Same rule as the **Top Reminder**, repeated so it survives long contexts: ANY finding in standalone mode → you **MUST invoke the `$why-review` skill** (skill invocation, `--validate-findings <report-path>`) before any fix, docs-update, commit, or handoff. No inline/manual self-validation substitutes for the actual skill call. **task tracking the `[Review Phase 6]` gate the moment the first finding lands** so it can never be forgotten. Inside `$workflow-review-changes`, hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step.

**Anti-Rationalization:**

| Evasion                                | Rebuttal                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| "Too simple for graph blast-radius"    | Phase 0 graph check sets risk order; run it or record graph unavailable.                 |
| "No findings, skip docs/tests"         | Clean verdict still needs proof that docs/tests were checked or explicitly not relevant.              |
| "Dimensional review clean, skip the holistic why-review" | Phase 6 `--validate-findings` only checks the supplied finding-list; whole-package design-rationale issues need a standalone FULL-mode `$why-review` of the whole target. Run Phase 7.5 (standalone). |
| "Finding is obvious, fix now"          | Invoke the `$why-review` skill (`--validate-findings`) first — an actual skill call, not inline self-validation; unvalidated findings are not fixes. |
| "Only Low/Medium nits, skip validation" | Phase 6 triggers on ANY severity (Critical→Low). The gate is unconditional whenever ≥1 finding exists; severity does not exempt it. |
| "Findings look correct and reasonable already" | That judgment IS the validation the `$why-review` skill must perform — making it yourself is the confirmation bias the gate exists to break. Invoke the skill. |
| "I already re-checked the lines myself" | Inline re-reading does NOT pass Phase 6. The gate requires a real `$why-review` skill invocation that returns a verdict. |
| "Only re-check fixed files"            | Fixes can interact with earlier changes; restart `$changes-review` from Phase 0 on the full diff.     |
| "Sub-agent already reviewed"           | Main report must integrate raw findings and not override or filter them.                              |
| "Already searched project conventions" | Show 3+ `file:line` examples. No evidence means no search.                                            |
| "DRY/SOLID requires this abstraction"   | Prove it lowers future change cost; otherwise it is ceremony, not quality.                            |
| "Review found no bugs, skip simplifier" | Bug-finding ≠ simplification. Run Phase 3.5 `$code-simplifier` on changed code files anyway.          |
| "No test files changed, skip test review" | The review target is the CHANGE, not the test files. Phase 3.7 Gate 7 maps every behavior change to its canonical scenario/case and a covering test/assertion; strict-default profiles also map the TC. |
| "Test file with matching name exists"   | Name pairing ≠ coverage. Phase 3.7 `$integration-test-review` proves assertion-level coverage of the changed behavior. |
| "Clean review, docs surely fine"        | Clean code ≠ current docs. Run the Phase 8 `$docs-update` sweep before handoff — it is mandatory, not conditional. |
| "Behavior changed but spec + tests pass" | Passing ≠ in-sync. Run Spec Drift Adjudication AND the Dual-Feedback Ledger; classify the divergence and route the owed spec/test fix. |
| "Bug fixed, ship it"                     | A bugfix review FAILS without the §6.5 End→Start trace, feeder enumeration, hypothesis matrix, and regression proof. |
| "Confident enough, no need to cite"      | <80% confidence = verify first; no `file:line` = speculation, which is forbidden output. State what you traced and how. |
| "It reads fine, looks correct"           | "Looks fine" is not proof. Trace one happy path + one error path and cite the lines before calling it correct. |
| "Frontend tweak, skip UI review"         | `$changes-review` owns the UI dimension — any frontend file in the diff triggers `$ui-review`; it is never a separate step to defer. |
| "Nearby code does it this way, copy it"  | Closest example ≠ matching preconditions. Prove the new context shares the same scope, lifetime, base class, and constraints before copying. |
| "Spec prose names the class, harmless"   | Introduced tech/source-as-prose in spec narrative is an M1/M2 FAIL (§8). Name the mandate ID + changed file:line; carriers are the only exemption. |
| "Import compiles, layer is fine"         | Compiling ≠ allowed. Check `architectureRules.layerBoundaries`; a `cannotImportFrom` breach is a BLOCKING Critical, not a style nit. |
| "Many files, I'll just read them all"    | One context truncates silently on big diffs. ≥10 files → size-capped parallel batches + reduce; announce any dropped/sampled scope. |

**[TASK-PLANNING]** Break scope into small todo tasks before acting; maintain one `in_progress`; add final review todo.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION `--fix-loop` mode (optional, standalone-only; no flag → default unchanged):** (0) resolve the fixed diff scope + Goal Contract and plan the loop tasks → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop: report-only review pass INLINE (Phase 0 → Phase 5, fresh task list, stop before Phase 6) → `$why-review --validate-findings` → `$fix` on VALIDATED blocking findings at the owning layer → append Iteration Log → (2) converge when a FRESH full review pass over the post-fix diff clears the current round's bar (round 1: zero validated findings; round 2: zero validated CRITICAL/HIGH/MEDIUM, LOW deferred) with the working-tree-unchanged backstop / escalate on non-progress → (3) terminal Phase 8 `$docs-update` + recap; never commit or push unless asked. **Mode scope:** this standalone mode pairs ONE review pass with `$fix` on the validated findings; it is DISTINCT from `$workflow-review-changes --fix-loop`, which re-runs the WHOLE 19-step workflow until a round applies zero fixes.
**IMPORTANT MUST ATTENTION** in `--fix-loop`, run the review pass and `$why-review` INLINE — NEVER as a sub-agent, NEVER re-invoke this skill with `--fix-loop` — regenerate a fresh loop task plan every round, apply ONLY validated findings, and keep the diff base fixed (`{scope}` = branch-diff base ∪ current uncommitted changes, recomputed each round).
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 2, extendable ONCE to round 3 when round 2 leaves a validated CRITICAL/HIGH open)** in `--fix-loop`; review blockers not shrinking across 2 rounds or increasing (checked only after the round-2 CRITICAL/HIGH extension, which is granted first), or the budget spent with blocking findings still open → **STOP & escalate** by asking the user directly. NEVER loop past round 3 on review blockers, or open-ended — only failing test gates continue, until green; round-2 LOW-only findings converge and are recorded as deferred.
**IMPORTANT MUST ATTENTION** graph blast-radius runs first when `.code-graph/graph.db` exists.
**IMPORTANT MUST ATTENTION** every claim needs `file:line` proof; every stale docs/tests decision needs evidence.
**IMPORTANT MUST ATTENTION** ANY finding in standalone mode (Critical / High / Medium / OR Low) → you MUST invoke the `$why-review` skill via the skill invocation with `--validate-findings <report-path>` BEFORE any fix, docs-update, commit, or handoff; an actual skill call is the ONLY way to pass — inline self-validation, re-reading the cited lines, or declaring findings "already validated" do NOT count; task tracking the `[Review Phase 6]` gate the moment the first finding lands. Inside `$workflow-review-changes`, hand findings to the parent's fix cycle (steps 11–13) and the conditional step-14 `$why-review` re-review; the parent has no separate findings-validation step. — why: an unvalidated finding inherits the reviewer's confirmation bias and severity inflation, so fixing it before validation ships the wrong change.
**IMPORTANT MUST ATTENTION** when Phase 0.7 finds executable E2E/browser/user-flow artifacts, read `.claude/skills/shared/e2e-quality-protocol.md` and invoke `$e2e-test-verify` report-only in Phase 3.9; when no trigger exists, record `NOT-APPLICABLE` and do not run an E2E lane — why: optional routing preserves review cost while preventing unverified user-flow changes from hiding inside a generic code review.
**IMPORTANT MUST ATTENTION Goal:** Review current working-tree, staged, branch, or commit diffs across code, docs, config, infra, and non-code artifacts — finding correctness bugs, flaws, missing updates, stale docs, and convention drift with evidence — so every reviewed change is defect-free, evidence-backed, convention-aligned, and synchronized with required tests/docs before handoff; when code files changed, also prove the code stays easy to change.

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
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
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
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
