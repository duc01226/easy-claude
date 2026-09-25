---
name: harness-setup
description: '[Quality] Use when a workflow step or the user asks for an agent quality harness. Sets up feedforward guides and feedback sensors.'
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
- **Ordered path:** 1 Guards → 2 Phase A Stack Detection → 3 Phase B Feedforward Guides → 4 Phase C Computational Sensors → 5 Phase D Inferential Sensors → 6 Phase E Behaviour Harness → 7 Phase F Inventory Report → 8 Next Steps. Each phase blocks the next; feedforward and sensor choices require ask the user directly.
- **Quality boundary:** `$linter-setup` supplies computational sensors; this skill never installs them. Gate behavior on mutation score plus property/behavior coverage, never line coverage; append inventory after every phase and keep it living.

**Main steps (run in order — each BLOCKS the next):**

1. **Guards** — verify `$linter-setup` (linter config + pre-commit hook + CI gate); detect existing inventory and enhance it, never skip it.
2. **Phase A — Stack Detection** — read plan / architecture-design / tech-stack reports; write `stack-profile.md`; use ask the user directly for undetectable fields.
3. **Phase B — Feedforward Guides** — author/enhance CLAUDE.md/AGENTS.md (architecture patterns, anti-patterns, naming, boundaries), skill-activation rules, `docs/architecture/*` notes, and pattern catalog; confirm by asking the user directly.
4. **Phase C — Computational Sensors** — confirm `$linter-setup` outputs and list config paths; invoke it if any are missing.
5. **Phase D — Inferential Sensors** — wire review skills to lifecycle gates (`$why-review` pre-impl · `$code-review` pre-commit · `$domain-entities-review` post-impl · `$production-readiness-review` + `$security-review` pre-release · `$scan-codebase-health` recurring · `$integration-test-review` feature-area TC audit BOTH pre-release AND recurring, catching orphaned Section-8 TCs and uncovered behavior); record under `## Review Gates`.
6. **Phase E — Behaviour Harness** — choose spec format, test pyramid, fixtures, mutation/property/behavior coverage, and `test-strategy.md`; NEVER gate on line `%`.
7. **Phase F — Inventory Report** — append `harness-inventory.md` with all sensors and gaps; present it by asking the user directly.
8. **Next Steps** — use ask the user directly to choose `$feature-implement` (recommended), `$why-review`, or skip.

**Produces:**

- Feedforward guides: CLAUDE.md/AGENTS.md conventions, architecture docs, pattern catalogs, skill-activation rules
- Computational feedback sensors: `$linter-setup` linters, formatters, pre-commit hooks, and CI gates
- Inferential feedback sensors: AI review skills wired to lifecycle stages
- Harness inventory: `tmp/harness/harness-inventory.md`

**When invoked:** After `$scaffold` + `$linter-setup` in greenfield workflow; scaffolding must be complete.

**Does NOT do:** Install linters or configure formatters; `$linter-setup` owns that work.

---

## Activation Guards

**Check 1 — `$linter-setup` prerequisite (BLOCK if missing):** Before phases, verify it completed by checking for a root linter config (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`), pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`), and CI quality gate definition. If any is missing → ask the user directly: "$linter-setup appears incomplete. Computational feedback sensors must be in place before harness setup. Run $linter-setup first, then return here?" **BLOCK** Phases A–E until verification passes.

**Check 2 — Existing harness inventory:** Check `tmp/harness/harness-inventory.md`. If found → ask the user directly: "Harness inventory already exists — re-run to enhance existing harness, or skip?" Existing `CLAUDE.md`/`AGENTS.md` are feedforward guides to enhance, NEVER skip signals.

---

## Phase A — Stack Detection

Read, in order: `plan.md` frontmatter → architecture-design report → tech-stack-comparison report. Extract:

- Primary language(s) and framework(s)
- Test framework and test runner
- CI provider/tooling
- Package manager and monorepo structure (if any)
- Module system and build tooling

Write detection result to `tmp/harness/stack-profile.md`.

If any field is undetectable → ask the user directly before proceeding.

---

## Phase B — Feedforward Guide Setup (Inferential)

For each guide type, check existence; create it or enhance an existing guide:

1. **CLAUDE.md / AGENTS.md — Architecture conventions:** add "Architecture Patterns" (choices from `$architecture-design`, e.g., Clean Architecture, CQRS, Repository), "Anti-Patterns" (stack-specific), "Naming Conventions" (language-idiomatic), and "Module Boundaries" (allowed imports and dependency direction).
2. **Skill activation rules:** document CLAUDE.md auto-activation for common stack tasks, e.g., domain-entity changes → `$domain-entities-review`; before commits → `$code-review`.
3. **Architecture notes:** create `docs/architecture/` with `bounded-contexts.md` (boundaries/ownership), `dependency-rules.md` (allowed layer imports), and `naming-conventions.md` (project-specific file/class/function names).
4. **Pattern catalog:** create `docs/architecture/pattern-catalog.md`, document each `$architecture-design` choice with DO/DON'T examples, and anchor examples to actual project files once scaffolding produces them.
5. **Discovery gate (`SYNC:ai-discovery-doc-quality`):** every created or enhanced guide leads with its purpose, when to read it and its critical rules, ends with closing reminders when long, and is routed from the root instruction file or docs index by a `read <path> when <situation>` trigger — a guide nothing routes to is never read. Put generated root-context changes through `$ai-context-refresh`, not a hand-edit of a generated section; run `$prompt-enhance` on each hand-owned guide that changed.

Present created/updated guides by asking the user directly: "Feedforward guides above will be created/enhanced. Confirm or adjust?"

---

## Phase C — Computational Feedback Sensors

Confirm `$linter-setup` outputs by checking the root linter config (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`), pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`), and CI quality gate. If any is missing, invoke `$linter-setup` before continuing. Output confirmation with file paths.

---

## Phase D — Inferential Feedback Sensors

Configure AI review skills by lifecycle stage. Present by asking the user directly: "Which inferential sensors should be mandatory vs optional for this repository?"

- **Pre-implementation:** `$why-review` validates design rationale before the implementation approach is committed.
- **Pre-commit:** document in CLAUDE.md that significant changes run `$code-review`.
- **Post-implementation:** `$domain-entities-review` when domain entity files are in the changeset.
- **Pre-release (mandatory):** `$production-readiness-review` for reliability/operations and `$security-review` for production security.
- **Recurring drift:** schedule `$scan-codebase-health` quarterly or on CI schedule. Also wire `$integration-test-review`'s Missing Integration Test / Spec-Coverage Gate feature-area TC audit (Phase 3 addendum), which catches orphaned Section-8 TCs and uncovered behavior, both pre-release alongside the two mandatory gates and on the same recurring cadence; a diff-scoped run cannot catch a Section-8 TC whose test regressed outside the current changeset.

Add the agreed sensor configuration to CLAUDE.md under "## Review Gates".

---

## Phase E — Behaviour Harness (Spec + Test Strategy)

Define the project behaviour harness:

- **Functional spec:** ask the user directly: "Feature documentation format?" Options: feature-spec (8-section tech-free), TDD specs only, lightweight ADRs. Establish the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) or an equivalent spec home.
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
- **Mutation score is the real test-strength metric — gate on this.** ask the user directly: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" A surviving mutant = a fault your tests did not catch = a missing/weak assertion. Add a minimum mutation-score threshold to CI as the computational test-strength sensor.
- **Property coverage (optional second sensor):** each named business invariant guarded by ≥1 property/metamorphic test. Track which invariants have a property test; an unguarded invariant is a gap to fill.
- **Keep behavior/change-coverage (meaningful, not a %):** every behavior-changing file must have a test that asserts the changed outcome — see `$integration-test-review` Gate 7. This is the right notion of "coverage"; the line-% is not.

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
| Pre-implementation  | $why-review             | Design rationale gaps          |
| Pre-commit          | $code-review            | Convention drift, logic errors |
| Post-implementation | $domain-entities-review | Domain model quality           |
| Pre-release         | $production-readiness-review             | Operational readiness          |
| Pre-release         | $security-review               | Security vulnerabilities       |
| Pre-release + Recurring | $integration-test-review (feature-area TC audit) | Orphaned Section-8 TCs, uncovered changed behavior |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

Present inventory to user for review by asking the user directly.

---

## Next Steps

ask the user directly:

- **"$feature-implement (Recommended)"** — Begin implementing the project plan with full harness in place
- **"$why-review"** — Review harness design rationale before proceeding
- **"Skip"** — Proceed manually without workflow guidance

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Wire every feedforward guide and feedback sensor into the greenfield project so all later AI coding agents operate with maximum guidance and self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.
**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E and warranted Performance/Scale rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, supported host/container modes and environment reach, unique run identity, isolation, and repeat proof before claiming setup, review, or test completion.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Harness Engineering:** feedforward + feedback loops; gate on mutation score, never line-coverage %, keep quality left.

**IMPORTANT MUST ATTENTION Main steps (in order — each BLOCKS the next):** Guards (verify `$linter-setup`) → A Stack Detection (`stack-profile.md`) → B Feedforward Guides (CLAUDE.md patterns/anti-patterns/naming/boundaries + skill-activation rules + pattern catalog) → C Computational Sensors (confirm linter/hook/CI) → D Inferential Sensors (wire `$why-review`, `$code-review`, `$domain-entities-review`, `$production-readiness-review`, `$security-review`, `$scan-codebase-health`, `$integration-test-review` missing-test/spec-coverage gate to gates) → E Behaviour Harness (spec format + test pyramid + mutation-score gate + `test-strategy.md`) → F Inventory Report (`harness-inventory.md`) → Next Steps. NEVER skip or reorder — why: each phase consumes the prior phase's verified output.

**IMPORTANT MUST ATTENTION** BLOCK on the `$linter-setup` prerequisite first — ALWAYS verify computational sensors (linter config, pre-commit hook, CI gate) exist before any phase runs — why: keep quality left; cheapest gates must precede inferential ones, and this skill never installs them itself
**IMPORTANT MUST ATTENTION** NEVER auto-decide feedforward-guide or sensor content — present the draft and confirm by asking the user directly — why: harness conventions bind every future agent; silent choices propagate to all later sessions
**IMPORTANT MUST ATTENTION** write `tmp/harness/harness-inventory.md` incrementally (append after each phase) — NEVER hold findings in memory — why: long context drifts and silently drops findings
**IMPORTANT MUST ATTENTION** walk phases A→F as a hard barrier sequence — NEVER skip or reorder; each phase BLOCKS the next until its guard passes — why: a later phase consumes the prior phase's verified output
**IMPORTANT MUST ATTENTION** gate the behaviour harness on mutation score + property coverage — NEVER fail a build on a line-coverage % — why: lines execute without asserting intent, so coverage % is a diagnostic only, never a quality gate
**IMPORTANT MUST ATTENTION** wire `$integration-test-review`'s feature-area-wide TC audit as a Phase D sensor BOTH pre-release AND on the SAME recurring cadence as `$scan-codebase-health` — never pre-release only — why: a diff-scoped-only run cannot see a §8 TC whose covering test regressed outside the current change set; only a periodic feature-area sweep catches it
**IMPORTANT MUST ATTENTION** research tool choices per detected stack — NEVER hardcode a linter/formatter/mutation tool — present top 2-3 options, enforce strictest defaults, loosen only with explicit approval — why: harnessability depends on the actual stack, not a default
**IMPORTANT MUST ATTENTION** harness inventory is a LIVING document — update it when new sensors are added later — why: a stale inventory misrepresents the active feedback loop
**IMPORTANT MUST ATTENTION** grep 3+ existing guides/sensors before authoring a new one; verify fit (same stack, gate stage, lifecycle) before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** cite `file:line` / config-path evidence for every detected sensor and stack fact (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate a tool exists; grep the config to confirm — why: a hallucinated sensor leaves a real gap unguarded
**IMPORTANT MUST ATTENTION** bootstrap task tracking before phases — task tracking one todo per phase, mark `in_progress`/`completed` as you go; on context loss the current task list first — why: resume work, never duplicate phases

**Anti-Rationalization:**

| Evasion                                         | Rebuttal                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Linter probably set up — skip the prereq check" | Grep for the config files. No `file:line` proof = BLOCK Phase A/B/C/D/E until verified.   |
| "I'll pick the obvious linter myself"            | NEVER auto-decide — present top 2-3 by asking the user directly; the user owns binding conventions. |
| "High line coverage means tests are strong"      | Coverage is a diagnostic, not a gate. Gate on mutation score; lines run without asserting. |
| "Inventory's small, I'll hold it in memory"      | Append per phase to the inventory file — context loss silently drops findings.            |
| "CLAUDE.md exists, harness already done"         | CLAUDE.md is a feedforward guide to ENHANCE, never a signal to skip phases.               |

**IMPORTANT MUST ATTENTION** BLOCK on `$linter-setup` before any phase · NEVER auto-decide harness content (ask the user directly-gate) · gate behaviour on mutation score, NEVER on line-coverage %.

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
