---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Use when fixing a bug, error, or crash — root-cause investigation, fix, verification.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Fix a reported defect at the root cause its end-to-start trace proves, guarded by a regression test that fails before the fix and passes after it — cheap on a small local bug, thorough on a wide or risky one.

**Use this** for a bug, error, crash, regression or stale/incorrect output whose cause is unknown or whose reach is wide. A known one-line cause in one module fits a custom-simple route (investigate → fix → test → review). A request that changes intended behavior is a feature (`workflow-feature`); a behavior-preserving restructure is `workflow-refactor`.

**Key rules:**

- **MUST** triage size, kind and risk FIRST — the triage picks which recommended skills run and how deep.
- **MUST** trace the root cause end-to-start before any fix, classify Code Bug vs Spec Bug before any regression test, and prove the regression test RED before the fix and GREEN after.
- **MUST** fix at the layer that owns the violated invariant; converge the change review; sync the spec when a canonical spec or specified behavior changed.
- **NEVER** encode the buggy behavior into a spec or test, and NEVER weaken a test to turn it green.

## Size & Kind Triage (first action)

Classify the defect before choosing steps and record the result in the workflow report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300.
- **Kind** (all that apply): behavior bug · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · performance · UI surface · test-only · tooling/config · cross-module/cross-service.
- **Risk:** irreversible, data, security, cross-module. Escalate depth on risk and ambiguity, not on file count alone.

| Triage result | Typical route through the recommended skills |
| --- | --- |
| XS/S, one owning layer, Code Bug, no contract/data/security | investigate → RED test → fix → verify → review → close; `/fix` plans inline; spec steps only when a canonical spec covers the area |
| M, or a Spec Bug, or several TCs | add `/plan`; add the spec-tests review when the TC change is more than one regression case |
| L/XL, cross-module, contract/data/security, or ambiguous cause | full sequence; add an ad hoc `/plan-review` when the fix set is large or ambiguous; partition verification and review per module |

## Required Quality Gates

Non-negotiable — `/workflow-end` checks each against its evidence before the run closes:

1. **Root cause traced** (`/debug-investigate`, gate) — end-to-start trace from the observed final state through reader → storage/projection → writer → consumer/job → producer, every feeder path, a hypothesis matrix with the environment weighed as a competing cause, the owning fix layer and a forward convergence proof, all with `file:line`.
2. **Code Bug vs Spec Bug classified** before any regression TC or test (gate below), with a preservation note: `current behavior → expected behavior → unchanged behavior to preserve → regression evidence`.
3. **Regression guard RED → GREEN** — the first `/integration-test` (gate) reproduces the bug and FAILS; after `/fix` it PASSES. A test that passes before the fix does not catch the bug. Each regression test names its `Business Intent / Invariant Guarded`; lifecycle/state logic asserts state before/after and invalid-transition rejection. A reproducing test that cannot run here is `ENVIRONMENT-BLOCKED` and escalated, never assumed green.
4. **Tests pass** (`/integration-test-verify`, gate) — every behavior the fix changed is covered by tests that ran green in THIS run.
5. **Spec synced** — when a canonical spec or test-case artifact governs the affected area and behavior or a public contract changed, or that spec lacked the case the bug exposed. No canonical spec governs the area → the gate is N/A: record that fact with the searched paths and offer `/spec` as a follow-up.
6. **Review converged** (`/workflow-review-changes`, gate, INLINE in the main session) — validated blocking findings fixed and the fixed state re-reviewed over the whole package (spec + tests + fix).
7. **Goal satisfied and run closed** — the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) maps root cause and RED/GREEN evidence to the saved success criteria; `/workflow-end` closes the run (top-level only).

> **[BLOCKING] Code Bug vs Spec Bug Gate** (the bugfix instance of `SYNC:spec-drift-adjudication` in `shared/sdd-artifact-contract.md`):
>
> - **Code Bug** (= CODE-WRONG) — the canonical spec describes intended behavior and the code diverged → regression TCs for the intended behavior, then fix the code.
> - **Spec Bug** (= SPEC-STALE) — the spec documents the wrong behavior and the code implements it faithfully → correct the canonical spec first via `/spec [mode=amend]`, then TCs for the corrected behavior.
> - **Ambiguous** — ask the user or product owner which behavior is intended before writing TCs.
>
> Reconcile to canonical intent; never normalize the divergence to whichever side currently passes.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`, in its recommended default order.

| Step | Role | Runs when / earns its cost | Proves |
| --- | --- | --- | --- |
| `/debug-investigate` | gate | always — owns discovery and root cause | root cause traced |
| `/spec [mode=amend]` | optional | Spec Bug, or a resolved Ambiguous case | spec states intent |
| `/pbi-mockup --explore` | optional | the fix is size M+ AND creates new UI like a feature (a new page/view, component or dialog) — see below | selected mockup before planning |
| `/plan` | optional | size M+, Spec Bug, several TCs, cross-module, contract/data/security, several fix layers | fix plan |
| `/spec [mode=tests]` | optional | a canonical spec/TC registry covers the area | regression TC |
| `/artifact-review --type=spec-tests` | optional | TC change beyond one regression case, or M+ / risk | TC quality |
| `/integration-test` | gate | always — RED: reproduce the bug, expect FAIL | guard catches the bug |
| `/fix` | core | always in practice — at the owning layer | the change |
| `/integration-test` | core | GREEN after the fix; may fold into the verify gate | guard passes |
| `/integration-test-verify` | gate | always | tests pass |
| `/spec [mode=sync]` | optional | a canonical spec/TC changed, or specified behavior/contract changed | spec synced |
| `/workflow-review-changes` | gate | always — INLINE in the main session | review converged |
| `/workflow-e2e --source=context` | optional | the user explicitly asks for E2E work | E2E evidence |
| `/demo-guide` | optional | the fix changes user-facing behavior | demo path |
| `/workflow-end` | gate | always | run closed |
| `/watzup` | core | wrap-up summary | handoff |

**New-UI Explore Mockup (conditional, BEFORE `/plan`).** Only when the fix is large (size M+) and creates new user-facing UI like a feature — a new page/view, component or dialog — run the explore mockups (`/pbi-mockup --explore`). **Mockup scope gate first — BEFORE any analysis or drafting, so a skip saves tokens and time** (`pbi-mockup` Step 0): with `AskUserQuestion` available, ALWAYS ask 3 / 2 / 1 options or skip mockups (recommended option by scope; skip → record `Mockup: SKIPPED by user` and continue); without it, generate ONLY ONE mockup in the recommended direction, auto-select it and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in the plan or run report. Then Journey Report (`UX-1`) + design-authority read (`UX-2`) → the chosen 1–3 direction drafts rendered with html-export → each opened in the default browser (`node .claude/scripts/open-report.cjs <draft>`) → with 2–3 drafts, `AskUserQuestion` with one option per draft, your evidence-backed recommendation first labelled `(Recommended)` → the user's pick (or the `Selection:` line) is recorded in `direction-approved.md` and the plan's UI Layout builds on the selected mockup. Never pick for the user while they can be asked; drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit) and record `Selection: AUTO-SELECTED — <reason>` in `direction-approved.md` and the plan. Pass the investigation report (or the amended spec) as `--source`. A fix inside existing UI skips it with the registry `skipReason`.

Without `/plan`, `/fix` plans inline and the investigation report records the fix layer, blast radius and rollback.

Outcome gates: root cause traced · tests pass · spec synced (when a canonical spec governs the area and behavior or a public contract changed, or that spec lacked the case the bug exposed) · review converged · run closed.

A recommended step the triage shows would do no real work is not run; record it through the Step Execution Protocol with its evidence.

**Ad hoc skills (not registry steps):** `/performance-review` for a performance bug (below) · `/investigate` for an "unused code" removal decision (grep evidence, confidence ≥80%, cross-module check) · `/plan-review` for a large or ambiguous fix set · `/spec` (ui-intent) beside the spec sync when user-facing behavior changed — refresh the Feature Spec §6 interaction surface (View Inventory, Key UI States, the click-path the bug touched) and link the governing design spec; state the skip reason for a backend-only fix.

> **[PERFORMANCE-SDD ROUTE]** A performance bug (latency, throughput, memory, query speed, load behavior) runs `/performance-review` with SLA/benchmark evidence: target metric, baseline, measurement command and acceptable regression budget. Performance scope never bypasses functional no-regression checks — run them when behavior can change — and a changed SLA, performance constraint or behavior boundary updates specs and docs.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and order — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate (pbi-mockup Step 0) and the post-generation pick run in the session that can ask the user — never inside a delegated sub-agent; only the direction-draft builders may be sub-agents. A sub-agent would silently fall back to one auto-selected draft even though the user could have been asked. Fixed constraints (data dependencies):

- The root-cause trace exists before any fix plan, regression TC or fix; the RED run happens before `/fix` lands.
- A change exists before it is reviewed or tested; the spec sync runs before the review that checks it; fixes are re-verified after they land; `/workflow-end` runs last.
- `/workflow-review-changes` runs INLINE in the main session — never as a sub-agent — and owns the test-quality review, the docs/domain-entity reference refresh and experience acceptance; do not repeat them here.
- Gates awaiting user approval (Ambiguous classification, plan approval) are never parallelized.

Recommended: XS/S work inline without sub-agents; independent read-only investigations (feeder paths, hypotheses) as one parallel wave; L/XL verification and review partitioned into bounded batches per module with one report per batch.

## Memory, Reporting and Fix Path

- **Tasks:** one task per selected step or aspect so nothing is lost after compaction; child skills expand their phases under the parent row.
- **Report first:** create `tmp/reports/workflow-bugfix-{YYMMDD}-{HHmm}-{slug}.md` before the first finding; append triage, trace, RED/GREEN evidence and deviations per step; re-read it and `TaskList` after compaction. Sub-agent briefs make report-writing their first deliverable.
- **Goal Contract:** resolve the active goal at start per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the bug report); pass the same goal file to every child step; emit the Goal Satisfaction matrix before `/workflow-end`.
- **Spec context:** when the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) holds a spec for the affected module, read its rules and contracts before investigating.
- **Fix path:** validate a finding (evidence-backed, reproducible) before fixing it; fix at the owning layer; re-run the reviewer or test that raised it, plus a holistic pass when fixes were non-trivial. When the bug touches a `[HARD]` rule or invariant, regression TCs add invariant/property cases whose bar is a killed mutant, not line coverage, and each behavior-changing finding updates BOTH spec and tests.
- **Loop bounds:** round 1 fixes every validated finding; from round 2 only CRITICAL/HIGH/MEDIUM block and LOW-only findings are deferred; cap 2 rounds (+1 while a CRITICAL/HIGH stays open); failing tests are uncapped; no progress → escalate via `AskUserQuestion`. Single-occurrence review steps converge inside their own skill loop.

## Activation

Activate the `workflow-bugfix` workflow: run `/start-workflow workflow-bugfix` with the user's prompt as context. Apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; project conventions come from `docs/project-config.json` and the docs index. Code-extracted specs and TCs stay reference-only until canonical review accepts them.

Recommended default order (roles in the table above):

**IMPORTANT MANDATORY Steps:** /debug-investigate -> /spec [mode=amend] -> /pbi-mockup --explore -> /plan -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /integration-test -> /fix -> /integration-test -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /workflow-e2e --source=context -> /demo-guide -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; fixing a non-trivial bug, a regression or unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** fix the defect at the root cause its end-to-start trace proves, guarded by a regression test that fails before the fix and passes after it.

- **MUST ATTENTION** triage size, kind and risk FIRST; run only the recommended skills the triage shows do real work, and log every deviation with evidence.
- **MUST ATTENTION** root cause before fix: `/debug-investigate` (gate) produces the trace, feeder paths, hypothesis matrix, owning fix layer and forward convergence proof; classify Code Bug vs Spec Bug before any regression test.
- **MUST ATTENTION** regression guard: the RED `/integration-test` (gate) FAILS before `/fix` and the tests PASS after it in this run (`/integration-test-verify`, gate); NEVER encode buggy behavior or weaken a test to go green.
- **MUST ATTENTION** `/workflow-review-changes` runs INLINE in the main session and converges the whole package; sync the spec when a canonical spec or specified behavior changed; emit the Goal Satisfaction matrix and close with `/workflow-end`.
