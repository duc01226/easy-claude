---
name: harness-setup
version: 1.2.1
description: '[Quality] Use when a workflow step or the user asks for an agent quality harness. Sets up feedforward guides and feedback sensors.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Wire every feedforward guide and feedback sensor into the greenfield project so all later AI coding agents operate with maximum guidance and self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.

**Summary:**
- **Purpose:** complete the outer harness—feedforward guidance plus computational and inferential feedback—so later agents self-correct before human review.
- **Testability contract:** resolve Unit/Integration/System/E2E and warranted Performance/Scale applicability from runner/config evidence; record owner/root/data, copy-ready full/focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof. Block unresolved applicable fields; record evidence-backed `N/A` for non-applicable tiers.
- **Ordered path:** 1 Guards → 2 Phase A Stack Detection → 3 Phase B Feedforward Guides → 4 Phase C Computational Sensors → 5 Phase D Inferential Sensors → 6 Phase E Behaviour Harness → 7 Phase F Inventory Report → 8 Next Steps. Each phase blocks the next; feedforward and sensor choices require `AskUserQuestion`.
- **Quality boundary:** `/linter-setup` supplies computational sensors; this skill never installs them. Gate behavior on mutation score plus property/behavior coverage, never line coverage; append inventory after every phase and keep it living.

**Main steps (run in order — each BLOCKS the next):**

1. **Guards** — verify `/linter-setup` (linter config + pre-commit hook + CI gate); detect existing inventory and enhance it, never skip it.
2. **Phase A — Stack Detection** — read plan / architecture-design / tech-stack reports; write `stack-profile.md`; use `AskUserQuestion` for undetectable fields.
3. **Phase B — Feedforward Guides** — author/enhance CLAUDE.md/AGENTS.md (architecture patterns, anti-patterns, naming, boundaries), skill-activation rules, `docs/architecture/*` notes, and pattern catalog; confirm via `AskUserQuestion`.
4. **Phase C — Computational Sensors** — confirm `/linter-setup` outputs and list config paths; invoke it if any are missing.
5. **Phase D — Inferential Sensors** — wire review skills to lifecycle gates (`/why-review` pre-impl · `/code-review` pre-commit · `/domain-entities-review` post-impl · `/production-readiness-review` + `/security-review` pre-release · `/scan-codebase-health` recurring · `/integration-test-review` feature-area TC audit BOTH pre-release AND recurring, catching orphaned Section-8 TCs and uncovered behavior); record under `## Review Gates`.
6. **Phase E — Behaviour Harness** — choose spec format, test pyramid, fixtures, mutation/property/behavior coverage, and `test-strategy.md`; NEVER gate on line `%`.
7. **Phase F — Inventory Report** — append `harness-inventory.md` with all sensors and gaps; present it via `AskUserQuestion`.
8. **Next Steps** — use `AskUserQuestion` to choose `/feature-implement` (recommended), `/why-review`, or skip.

**Produces:**

- Feedforward guides: CLAUDE.md/AGENTS.md conventions, architecture docs, pattern catalogs, skill-activation rules
- Computational feedback sensors: `/linter-setup` linters, formatters, pre-commit hooks, and CI gates
- Inferential feedback sensors: AI review skills wired to lifecycle stages
- Harness inventory: `tmp/harness/harness-inventory.md`

**When invoked:** After `/scaffold` + `/linter-setup` in greenfield workflow; scaffolding must be complete.

**Does NOT do:** Install linters or configure formatters; `/linter-setup` owns that work.

---

## Activation Guards

**Check 1 — `/linter-setup` prerequisite (BLOCK if missing):** Before phases, verify it completed by checking for a root linter config (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`), pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`), and CI quality gate definition. If any is missing → `AskUserQuestion`: "/linter-setup appears incomplete. Computational feedback sensors must be in place before harness setup. Run /linter-setup first, then return here?" **BLOCK** Phases A–E until verification passes.

**Check 2 — Existing harness inventory:** Check `tmp/harness/harness-inventory.md`. If found → `AskUserQuestion`: "Harness inventory already exists — re-run to enhance existing harness, or skip?" Existing `CLAUDE.md`/`AGENTS.md` are feedforward guides to enhance, NEVER skip signals.

---

## Phase A — Stack Detection

Read, in order: `plan.md` frontmatter → architecture-design report → tech-stack-comparison report. Extract:

- Primary language(s) and framework(s)
- Test framework and test runner
- CI provider/tooling
- Package manager and monorepo structure (if any)
- Module system and build tooling

Write detection result to `tmp/harness/stack-profile.md`.

If any field is undetectable → `AskUserQuestion` before proceeding.

---

## Phase B — Feedforward Guide Setup (Inferential)

For each guide type, check existence; create it or enhance an existing guide:

1. **CLAUDE.md / AGENTS.md — Architecture conventions:** add "Architecture Patterns" (choices from `/architecture-design`, e.g., Clean Architecture, CQRS, Repository), "Anti-Patterns" (stack-specific), "Naming Conventions" (language-idiomatic), and "Module Boundaries" (allowed imports and dependency direction).
2. **Skill activation rules:** document CLAUDE.md auto-activation for common stack tasks, e.g., domain-entity changes → `/domain-entities-review`; before commits → `/code-review`.
3. **Architecture notes:** create `docs/architecture/` with `bounded-contexts.md` (boundaries/ownership), `dependency-rules.md` (allowed layer imports), and `naming-conventions.md` (project-specific file/class/function names).
4. **Pattern catalog:** create `docs/architecture/pattern-catalog.md`, document each `/architecture-design` choice with DO/DON'T examples, and anchor examples to actual project files once scaffolding produces them.
5. **Discovery gate (`SYNC:ai-discovery-doc-quality`):** every created or enhanced guide leads with its purpose, when to read it and its critical rules, ends with closing reminders when long, and is routed from the root instruction file or docs index by a `read <path> when <situation>` trigger — a guide nothing routes to is never read. Put generated root-context changes through `/ai-context-refresh`, not a hand-edit of a generated section; run `/prompt-enhance` on each hand-owned guide that changed.

Present created/updated guides via `AskUserQuestion`: "Feedforward guides above will be created/enhanced. Confirm or adjust?"

---

## Phase C — Computational Feedback Sensors

Confirm `/linter-setup` outputs by checking the root linter config (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`), pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`), and CI quality gate. If any is missing, invoke `/linter-setup` before continuing. Output confirmation with file paths.

---

## Phase D — Inferential Feedback Sensors

Configure AI review skills by lifecycle stage. Present via `AskUserQuestion`: "Which inferential sensors should be mandatory vs optional for this repository?"

- **Pre-implementation:** `/why-review` validates design rationale before the implementation approach is committed.
- **Pre-commit:** document in CLAUDE.md that significant changes run `/code-review`.
- **Post-implementation:** `/domain-entities-review` when domain entity files are in the changeset.
- **Pre-release (mandatory):** `/production-readiness-review` for reliability/operations and `/security-review` for production security.
- **Recurring drift:** schedule `/scan-codebase-health` quarterly or on CI schedule. Also wire `/integration-test-review`'s Missing Integration Test / Spec-Coverage Gate feature-area TC audit (Phase 3 addendum), which catches orphaned Section-8 TCs and uncovered behavior, both pre-release alongside the two mandatory gates and on the same recurring cadence; a diff-scoped run cannot catch a Section-8 TC whose test regressed outside the current changeset.

Add the agreed sensor configuration to CLAUDE.md under "## Review Gates".

---

## Phase E — Behaviour Harness (Spec + Test Strategy)

Define the project behaviour harness:

- **Functional spec:** `AskUserQuestion`: "Feature documentation format?" Options: feature-spec (8-section tech-free), TDD specs only, lightweight ADRs. Establish the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) or an equivalent spec home.
- **Test pyramid:** Unit = pure functions, domain entities, business logic (no I/O); Integration = subcutaneous CQRS and real-DB repository tests; E2E = critical user journeys only (full coverage is too slow).
- **Approved fixtures:** pre-seed reference/lookup data as approved snapshots; integration tests accumulate data and NEVER delete/reset it.

### Testability & Execution Matrix (write to `test-strategy.md`)

Copy the architecture-design contract into `test-strategy.md`; resolve every tier from verified project/configuration evidence before choosing tools:

| Tier | Applicability + evidence | Owner | Runner/framework + config | Test root | Data/fixture policy | Full command | Focused/partial command | Zero-match behavior | CI gate | Simple Windows/macOS/Linux entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config} | {root} | {fixtures/factories} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate} | `{command, or .cmd + .sh pair}` | `{result or planned owner}` |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config} | {root} | {public-path + additive data} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate} | `{command, or .cmd + .sh pair}` | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {configured browser/config} | {root} | {reachable journey data} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate} | `{command, or .cmd + .sh pair}` | `{result or evidence-backed N/A}` |

`APPLICABLE` requires runner/framework/configuration/root/command evidence. If no E2E framework, configuration, and command are verified, record `N/A — {config/source evidence}`; do not infer a browser stack from generic examples. Full/focused commands must be copy-ready, report exact counts/exit status, and fail invalid or zero-match selection.

### Run, Data, Isolation & Repeat Policy (write beside the matrix)

For each applicable persistent-state tier, record run/test identity generation and unique business-data suffix, supported public paths, realistic valid data, count-before-create idempotent/restart-safe reference setup, keyed additive accumulation with integrity checks, mutable-root/parallel-worker isolation, immutable shared data, realistic actor pacing, observable arrange barriers, and exact results. Require two consecutive no-reset full runs; until executed, mark proof `planned — {owner}`, not PASS. Keep property/invariant, mutation, change, and behavior coverage meaningful; line coverage remains diagnostic only.

**Test-strength sensors (NOT a line-coverage gate):**

- **Line coverage is a diagnostic only — NEVER gate a build on it.** Low coverage is a useful NEGATIVE signal (an area is untested → investigate); high coverage is NOT evidence of quality (lines can execute with no meaningful assertion). Report it as a diagnostic; do not fail CI on a coverage %.
- **Mutation score is the real test-strength metric — gate on this.** `AskUserQuestion`: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" A surviving mutant = a fault your tests did not catch = a missing/weak assertion. Add a minimum mutation-score threshold to CI as the computational test-strength sensor.
- **Property coverage (optional second sensor):** each named business invariant guarded by ≥1 property/metamorphic test. Track which invariants have a property test; an unguarded invariant is a gap to fill.
- **Keep behavior/change-coverage (meaningful, not a %):** every behavior-changing file must have a test that asserts the changed outcome — see `/integration-test-review` Gate 7. This is the right notion of "coverage"; the line-% is not.

Document the agreed strategy in `docs/architecture/test-strategy.md`.

---

## Phase F — Harness Inventory Report

Write `tmp/harness/harness-inventory.md`:

```markdown
# Harness Inventory

Generated: {date}
Stack: {detected stack from Phase A}

## Testability & Verification Contract

Copy the resolved `test-strategy.md` matrix into this inventory and keep the status current:

**Status:** `PASS | PARTIAL | BLOCKED`

| Tier | Applicability + evidence | Owner | Runner/config/root | Full | Focused/partial | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Identity/data/isolation/fidelity policy | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate / command} | {policy reference} | {result/status} |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate / command} | {policy reference} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | `{command}` | `{filter}` | `{non-zero behavior}` | {gate / command} | {policy reference} | `{result or evidence-backed N/A}` |

Missing/placeholder evidence is an open gap, not a PASS. The inventory must preserve the strategy's unique identity, additive-data, isolation, realistic-fidelity, and two-run proof fields; E2E N/A remains evidence-backed.

## Feedforward Guides

| Type          | File/Skill                           | Purpose                         |
| ------------- | ------------------------------------ | ------------------------------- |
| Inferential   | CLAUDE.md §Architecture Patterns     | Shapes AI architectural choices |
| Inferential   | CLAUDE.md §Anti-Patterns             | Prevents known bad patterns     |
| Inferential   | docs/architecture/pattern-catalog.md | DO/DON'T examples per pattern   |
| Computational | .editorconfig                        | Cross-IDE consistency           |

## Feedback Sensors — Computational

| Stage      | Tool/Hook          | What it catches                                |
| ---------- | ------------------ | ---------------------------------------------- |
| Pre-commit | {linter}           | Style violations, common errors                |
| Pre-commit | {formatter}        | Code formatting drift                          |
| CI         | {type-checker}     | Type errors                                    |
| CI         | {static-analyzer}  | Security, complexity, dead code                |
| CI         | {mutation-tool}    | Weak/missing assertions (test-strength GATE)   |
| CI         | {coverage-tool}    | Untested areas (DIAGNOSTIC only — never gated) |

## Feedback Sensors — Inferential

| Stage               | Skill/Agent             | What it catches                |
| ------------------- | ----------------------- | ------------------------------ |
| Pre-implementation  | /why-review             | Design rationale gaps          |
| Pre-commit          | /code-review            | Convention drift, logic errors |
| Post-implementation | /domain-entities-review | Domain model quality           |
| Pre-release         | /production-readiness-review             | Operational readiness          |
| Pre-release         | /security-review               | Security vulnerabilities       |
| Pre-release + Recurring | /integration-test-review (feature-area TC audit) | Orphaned Section-8 TCs, uncovered changed behavior |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

Present inventory to user for review via `AskUserQuestion`.

---

## Next Steps

`AskUserQuestion`:

- **"/feature-implement (Recommended)"** — Begin implementing the project plan with full harness in place
- **"/why-review"** — Review harness design rationale before proceeding
- **"Skip"** — Proceed manually without workflow guidance

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `harness-setup` — Agent quality harness: feedforward guides and feedback sensors; setting up an agent quality harness → .claude/skills/shared/protocols/harness-setup.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md

<!-- PROTOCOL-GUIDES:END -->

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

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** engineering-foundation gate — judges whether the team can build, run, test, and change the system repeatably as it grows. Derive lifecycle, scale, criticality, repository shape, and runtime from evidence; take the lower supported tier when unknown. Judge all 7 dimensions, using `N/A-by-profile` with evidence when a concern truly does not apply. **F1** reproducible build/run/test path · **F2** document and exercise each supported or required execution mode; dual host/container or other modes only when the project uses or needs them · **F3** environment portability at applicable local/CI/production-shaped targets · **F4** meaningful test-strength evidence without making one mutation tool universal · **F5** measured performance where scale/risk warrants it · **F6** change/build scalability where the repository has meaningful module boundaries · **F7** mechanical checks selected for the stack/profile. For each, judge outcomes rather than tools, and preserve anti-over-engineering. Foundation creation may block on missing warranted outcomes; brownfield audits advise and name the smallest next step. Catalog → `.claude/docs/engineering-foundation-catalog.md` (update first, then re-run `inject_engineering_foundation_gate.py`).

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Wire every feedforward guide and feedback sensor into the greenfield project so all later AI coding agents operate with maximum guidance and self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.
**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E and warranted Performance/Scale rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, supported host/container modes and environment reach, unique run identity, isolation, and repeat proof before claiming setup, review, or test completion.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Harness Engineering:** feedforward + feedback loops; gate on mutation score, never line-coverage %, keep quality left.

**IMPORTANT MUST ATTENTION Main steps (in order — each BLOCKS the next):** Guards (verify `/linter-setup`) → A Stack Detection (`stack-profile.md`) → B Feedforward Guides (CLAUDE.md patterns/anti-patterns/naming/boundaries + skill-activation rules + pattern catalog) → C Computational Sensors (confirm linter/hook/CI) → D Inferential Sensors (wire `/why-review`, `/code-review`, `/domain-entities-review`, `/production-readiness-review`, `/security-review`, `/scan-codebase-health`, `/integration-test-review` missing-test/spec-coverage gate to gates) → E Behaviour Harness (spec format + test pyramid + mutation-score gate + `test-strategy.md`) → F Inventory Report (`harness-inventory.md`) → Next Steps. NEVER skip or reorder — why: each phase consumes the prior phase's verified output.

**IMPORTANT MUST ATTENTION** BLOCK on the `/linter-setup` prerequisite first — ALWAYS verify computational sensors (linter config, pre-commit hook, CI gate) exist before any phase runs — why: keep quality left; cheapest gates must precede inferential ones, and this skill never installs them itself
**IMPORTANT MUST ATTENTION** NEVER auto-decide feedforward-guide or sensor content — present the draft and confirm via `AskUserQuestion` — why: harness conventions bind every future agent; silent choices propagate to all later sessions
**IMPORTANT MUST ATTENTION** write `tmp/harness/harness-inventory.md` incrementally (append after each phase) — NEVER hold findings in memory — why: long context drifts and silently drops findings
**IMPORTANT MUST ATTENTION** walk phases A→F as a hard barrier sequence — NEVER skip or reorder; each phase BLOCKS the next until its guard passes — why: a later phase consumes the prior phase's verified output
**IMPORTANT MUST ATTENTION** gate the behaviour harness on mutation score + property coverage — NEVER fail a build on a line-coverage % — why: lines execute without asserting intent, so coverage % is a diagnostic only, never a quality gate
**IMPORTANT MUST ATTENTION** wire `/integration-test-review`'s feature-area-wide TC audit as a Phase D sensor BOTH pre-release AND on the SAME recurring cadence as `/scan-codebase-health` — never pre-release only — why: a diff-scoped-only run cannot see a §8 TC whose covering test regressed outside the current change set; only a periodic feature-area sweep catches it
**IMPORTANT MUST ATTENTION** research tool choices per detected stack — NEVER hardcode a linter/formatter/mutation tool — present top 2-3 options, enforce strictest defaults, loosen only with explicit approval — why: harnessability depends on the actual stack, not a default
**IMPORTANT MUST ATTENTION** harness inventory is a LIVING document — update it when new sensors are added later — why: a stale inventory misrepresents the active feedback loop
**IMPORTANT MUST ATTENTION** grep 3+ existing guides/sensors before authoring a new one; verify fit (same stack, gate stage, lifecycle) before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** cite `file:line` / config-path evidence for every detected sensor and stack fact (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate a tool exists; grep the config to confirm — why: a hallucinated sensor leaves a real gap unguarded
**IMPORTANT MUST ATTENTION** bootstrap task tracking before phases — `TaskCreate` one todo per phase, mark `in_progress`/`completed` as you go; on context loss `TaskList` first — why: resume work, never duplicate phases

**Anti-Rationalization:**

| Evasion                                         | Rebuttal                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Linter probably set up — skip the prereq check" | Grep for the config files. No `file:line` proof = BLOCK Phase A/B/C/D/E until verified.   |
| "I'll pick the obvious linter myself"            | NEVER auto-decide — present top 2-3 via `AskUserQuestion`; the user owns binding conventions. |
| "High line coverage means tests are strong"      | Coverage is a diagnostic, not a gate. Gate on mutation score; lines run without asserting. |
| "Inventory's small, I'll hold it in memory"      | Append per phase to the inventory file — context loss silently drops findings.            |
| "CLAUDE.md exists, harness already done"         | CLAUDE.md is a feedforward guide to ENHANCE, never a signal to skip phases.               |

**IMPORTANT MUST ATTENTION** BLOCK on `/linter-setup` before any phase · NEVER auto-decide harness content (`AskUserQuestion`-gate) · gate behaviour on mutation score, NEVER on line-coverage %.
