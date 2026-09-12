---
name: dor-gate
version: 1.0.0
description: '[Code Quality] Use when validating a PBI against Definition of Ready before grooming.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**Summary:**

- **Purpose:** Automated quality gate, not collaborative review (`/pbi-challenge` handles collaboration). Run 8 required DoR criteria plus M1-M7; any failure returns `FAIL`.
- **Execution:** Before step 1, use `TaskCreate` for every step plus a final review; keep one `in_progress` and record evidence/skips. Then run: (1) locate PBI → (2) apply self-contained DoR checklist → (3) evaluate all 8 criteria (story template; GIVEN/WHEN/THEN ×3 + auth; full-flow surface; UI design; AI review; estimate; dependencies; releasable outcome) → (4) run M1-M7 → (5) verify estimation → (6) classify → (7) emit result template → (8) route via `AskUserQuestion` (`/prioritize`, `/refine`, `/pbi-challenge`, or skip).
- **Evidence/gates:** BA Refinement Context is self-contained; cite concrete PBI section + line/AC for every verdict; any M1-M5 or M7 violation forces `FAIL`; M1/M2 carriers are exempt.
- **Contract/estimate:** Apply the shared releasable-PBI contract; technical-only/foundation/setup PBIs fail, UI PBIs need a connected multi-view flow, and story-point frontmatter needs Fibonacci 1-21, complexity, man-day, risk, and blast-radius evidence. `>13` SP = SHOULD-SPLIT `WARN`, not `FAIL`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

1. **Locate PBI** — Find the artifact in `team-artifacts/pbis/` or active plan context; if absent, ask the user for its path.
2. **Apply DoR checklist** — Use the self-contained 8-criteria checklist below.
3. **Evaluate all 8 criteria** — Check story format; AC vagueness, GIVEN/WHEN/THEN (minimum 3 plus 1 auth scenario); full-flow page/view, navigation, component, state, and mockup coverage; UI design; AI pre-review; story points/complexity; dependency columns; and the releasable actor-facing outcome with entry → result, evidence, and no standalone technical/foundation/migration/setup scope.
4. **Run M1-M7 gate** — Apply each mandate below; M1-M5 or M7 failure forces `FAIL`. Distinguish M1 vocabulary from M7 demoability and exempt carriers from M1/M2.
5. **Verify estimation** — Check frontmatter against the SYNC estimation framework: `story_points` Fibonacci 1-21, complexity, man-day range, risk, and blast radius. `>13` SP is a SHOULD-SPLIT `WARN`, not a `FAIL`.
6. **Classify result** — `PASS` only when all 8 criteria and applicable M1-M5/M7 checks pass; otherwise `FAIL` and list fixes.
7. **Output verdict** — Emit the DoR Gate Result template; cite evidence for every criterion and mandate.
8. **Route next step** — After output, use `AskUserQuestion` to present the options in **Next Steps**; never decide the user's route.

### Shared contract references

> **Releasable PBI Contract** — One PBI names one independently releasable actor-facing outcome with complete entry → result → exit, visible/persisted truth, applicable access/error/recovery behavior, and evidence; UI PBIs need page/view, navigation, component, state, and connected mock-app coverage; technical work remains enabling work.
> MUST ATTENTION READ `.claude/skills/shared/releasable-pbi-contract.md` for the full outcome and full-flow contract.

> **AI-SDD Artifact Contract** — M1-M7 are hard gates: M1/M2 restrict implementation identifiers to carriers; M3 requires logical IDs plus abstract anchors; M4/M5 require unambiguous, rebuildable behavior; M6 requires gate failure; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate definitions and carrier rules.

## Checklist (self-contained DoR; M1-M7 gate below)

### Required (ALL must pass)

- MUST ATTENTION verify **User story template** — "As a {role}, I want {goal}, so that {benefit}" present
- MUST ATTENTION verify **AC testable** — All AC use GIVEN/WHEN/THEN, no vague language, min 3 scenarios + 1 auth scenario
- MUST ATTENTION verify **Releasable outcome** — The PBI names one independently releasable actor-facing outcome, demonstrates entry → action → result → exit, covers applicable visible/persisted truth and recovery, and does not make technical/foundation/migration/setup work the outcome
- MUST ATTENTION verify **Wireframes/mockups and full-flow surface** — For UI PBIs, all required pages/views, navigation, common/domain/page components, applicable states, and a connected demo/mockup are present; backend-only requires an explicit "N/A" reason
- MUST ATTENTION verify **UI design ready** — Completed incl. design-spec linked (`/design-spec` artifact or inline UI specs in `## UI Layout`) for UI PBIs; or "N/A" for backend-only
- MUST ATTENTION verify **AI pre-review** — `/artifact-review --type=pbi` or `/pbi-challenge` result is PASS or WARN
- MUST ATTENTION verify **Story points** — Valid Fibonacci (1-21) + complexity (Low/Medium/High)
- MUST ATTENTION verify **Dependencies table** — Complete with Dependency, Type (must-before/can-parallel/blocked-by/independent), and Status columns

### M1-M7 Compliance Gate (BLOCKING — each check FAILs the gate)

> **M6 enforcement:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". A PBI violating any of M1-M5 or M7 is NOT ready for grooming — return `FAIL` and name the mandate ID with its concrete PBI section + line/AC citation. A DoR `PASS` over an M1-M5 or M7 violation is defective.
>
> **M1 governs vocabulary; M7 governs subject matter.** A technical case written in impeccably tech-free prose satisfies M1 while violating M7 — that gap is the most common way business specs rot. Passing M1 is NEVER evidence of passing M7; run both.
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in PBI narrative prose (problem statement, AC text, scope, rule descriptions). Banned prose token list: `spec-principles.md` §3.2.

- MUST ATTENTION verify **M1 — Tech-agnostic prose** — FAIL if problem statement, AC, or rule prose names a framework/product, language-native type, or product/design-pattern class name (banned list in `spec-principles.md` §3.2). Cite section + token.
- MUST ATTENTION verify **M2 — No source code in prose** — FAIL if a requirement is expressed as a class/method/file-path/namespace instead of a business operation. Source identifiers belong only in evidence carriers. Cite section + line.
- MUST ATTENTION verify **M3 — Abstract-IDs-first** — FAIL if a requirement/rule lacks a logical ID (`FR-/BR-/OP-`), has a logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, uses physical code coordinates or repository-root paths instead of an abstract anchor, or makes the anchor its primary citation. Evidence is REQUIRED and KEPT, but SECONDARY to the logical ID (physical coordinates live only in the provenance sidecar).
- MUST ATTENTION verify **M4 — Unambiguous AC** — FAIL if any AC uses vague language ("handle appropriately", "process normally", "as needed"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists. (Reinforces the "AC testable" required criterion above.)
- MUST ATTENTION verify **M5 — Implementable from artifact alone** — FAIL if a competent team with ZERO codebase knowledge could not implement the PBI on a different stack from the PBI alone (relies on reading source to understand it). Cite section + missing detail.
- MUST ATTENTION verify **M7 — Business-visibility** — apply the demo test to each case's BODY: _"what would a stakeholder SEE change?"_ — no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count. Judge the BODY, never the title or ID. Cite section + the offending `Given`/`When`/`Then` line.

If ANY box fails → DoR result is FAIL; list each violated mandate ID with its concrete section/line citation in the Blocking Items.

## BA Refinement Context (canonical DoR)

> Applies to Writes under `team-artifacts/pbis/`. Mirrored for Codex via `SYNC:refinement-dor-checklist` / `SYNC:ba-team-decision-model` in AGENTS.md (do not hand-edit the mirror). This is the self-contained DoR source — no external protocol-file dependency required to run the gate.

**Decision Model:** 2/3 majority vote (UX BA + Designer BA + Dev BA PIC). Dev BA PIC has technical veto. Disagree-and-commit after decision. Grooming override requires >75% remaining-team vote.

**DoR Gate (ALL must pass before grooming):**

- MUST ATTENTION verify user story template (`As a... I want... So that...`)
- MUST ATTENTION verify testable AC (GIVEN/WHEN/THEN, no vague language; minimum 3 scenarios + 1 auth scenario)
- MUST ATTENTION verify releasable actor-facing outcome and complete entry-to-result journey; no standalone technical/foundation/migration/setup PBI
- MUST ATTENTION verify UX wireframes/full-flow mock app + Designer BA UI readiness: page/view inventory, navigation, components, applicable states, and linked design spec (`/design-spec` artifact or inline `## UI Layout`) for UI PBIs; backend-only requires explicit `N/A` reason
- MUST ATTENTION verify AI pre-review (`/artifact-review --type=pbi` or `/pbi-challenge` returned `PASS` or `WARN`)
- MUST ATTENTION verify story points (Fibonacci 1-21 + complexity); `>13` SP → recommend split
- MUST ATTENTION verify complete dependencies table (Dependency · Type must-before/can-parallel/blocked-by/independent · Status)

**Failure fixes:** Vague AC → specify exact CRUD + roles; missing auth → add roles × CRUD table; no wireframes → UX BA creates; TBD AC → replace with a decision.

## Output

```markdown
## DoR Gate Result

**PBI:** {PBI filename}
**Status:** PASS | FAIL
**Date:** {date}

### Checklist Results

| #   | Criterion                   | Status    | Evidence / Issue |
| --- | --------------------------- | --------- | ---------------- |
| 1   | User story template         | ✅/❌     | {evidence}       |
| 2   | AC testable and unambiguous | ✅/❌     | {evidence}       |
| 3   | Releasable actor-facing outcome | ✅/❌  | {evidence}       |
| 4   | Full-flow wireframes/mock app | ✅/❌/N/A | {evidence}       |
| 5   | UI design ready             | ✅/❌/N/A | {evidence}       |
| 6   | AI pre-review passed        | ✅/❌     | {evidence}       |
| 7   | Story points estimated      | ✅/❌     | {evidence}       |
| 8   | Dependencies complete       | ✅/❌     | {evidence}       |

### Blocking Items (if FAIL)

1. {Fix instruction}

### Verdict

**{READY_FOR_GROOMING | FIX_REQUIRED}**
```

## Key Rules

- **FAIL blocks grooming** — If ANY required criterion fails, PBI cannot enter grooming. List specific fixes.
- **No guessing** — Every check must reference specific content (line numbers) in the PBI artifact.
- **Protocol is source of truth** — Always reference `refinement-dor-checklist-protocol.md` for criteria definitions.
- **Story points >13** — Flag recommendation to split (not a FAIL, but a strong WARN).

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — If PASS: PBI is grooming-ready; prioritize into the backlog
- **"/refine"** — If FAIL: revise PBI
- **"/pbi-challenge"** — If collaborative review needed before re-checking DoR
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, `plans/`, `team-artifacts/`, or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**IMPORTANT MUST ATTENTION Purpose:** Automated DoR gate, NOT collaborative review: run 8 required criteria plus M1-M7; the user chooses the next route.

**IMPORTANT MUST ATTENTION Main steps (1-8):** Before step 1, use `TaskCreate` for every step plus final review and track evidence/skips → (1) locate PBI → (2) apply self-contained DoR → (3) evaluate story, AC, full-flow/UI, AI review, estimate, dependencies, and releasable outcome → (4) run M1-M7 → (5) verify estimation frontmatter → (6) classify `PASS`/`FAIL` → (7) emit DoR Gate Result → (8) use `AskUserQuestion` for `/prioritize`, `/refine`, `/pbi-challenge`, or skip. NEVER skip, reorder, or merge without approval.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above, NEVER a replacement):**

- **AI Mistakes:** holistic-first debugging, fix at responsible layer, surgical diff, verify all outputs.
- **Estimation:** bottom-up phase hours drive man-days; SP derived; >13 SHOULD-SPLIT.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess.

**MANDATORY IMPORTANT MUST ATTENTION** `FAIL` blocks grooming — any required criterion or M1-M5/M7 failure returns `FAIL` with mandate ID + concrete PBI section/line/AC; NEVER pass an M1-M5/M7 violation, technical-only PBI, or UI PBI missing full-flow pages/components/states. — why: unready stories ship ambiguity downstream.
**IMPORTANT MUST ATTENTION** every verdict cites `file:line`/section evidence (confidence >80% to act, <60% DO NOT decide); NEVER guess a criterion's status. — why: uncited PASS/FAIL is unauditable.
**IMPORTANT MUST ATTENTION** carriers are EXEMPT from M1/M2: source identifiers are valid inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML frontmatter, and ` ```mermaid ``` `; inspect narrative prose only (banned tokens: `spec-principles.md` §3.2). — why: carrier flagging creates a false FAIL.
**IMPORTANT MUST ATTENTION** verify estimation frontmatter via the SYNC framework: Fibonacci 1-21 + complexity, bottom-up `man_days` range, risk, and blast radius; `>13` SP = SHOULD-SPLIT `WARN`, NOT `FAIL`. — why: a WARN must not block a groomable story.
**IMPORTANT MUST ATTENTION** Decision Model: 2/3 BA majority; Dev BA PIC has technical veto; grooming override requires >75% remaining-team vote.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks, keep one `in_progress`, record evidence/skips, and add a final review task.
**MANDATORY IMPORTANT MUST ATTENTION** emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then use `AskUserQuestion` — never auto-decide the next step.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "AC looks testable enough, pass it"              | Show GIVEN/WHEN/THEN ×3 + 1 auth scenario, no vague tokens. No proof = FAIL.                      |
| "M1-M5 is minor, the rest passes — PASS overall" | ANY M1-M5 or M7 violation = FAIL. A PASS over one is itself defective.                            |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Source name in `[Source: ...]` — flag it M1/M2" | Carriers are EXEMPT. Flag leakage ONLY in narrative prose, never in evidence carriers.            |
| "Story points >13, fail the gate"                | >13 SP = SHOULD-SPLIT WARN, not a FAIL. Do not escalate a WARN to a FAIL.                         |
| "Skip `AskUserQuestion`, result is obvious"      | NEVER auto-decide. Emit the result template, then route via `AskUserQuestion` — the user decides. |

**[TASK-PLANNING]** Before acting, analyze scope and break it into small tasks and sub-tasks with `TaskCreate`.

---

**IMPORTANT MUST ATTENTION** FAIL blocks grooming on ANY required-criterion or M1-M5/M7 failure — name the violated ID + cite PBI section/line; NEVER PASS over an M1-M5 or M7 violation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section for EVERY verdict (>80% confidence to act); NEVER guess a check's status.
**IMPORTANT MUST ATTENTION** emit the DoR Gate Result template, then route via `AskUserQuestion` — never auto-decide.
