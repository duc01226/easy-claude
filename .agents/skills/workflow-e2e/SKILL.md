---
name: workflow-e2e
description: '[Workflow] Use when writing, updating, and verifying E2E tests through a bounded green fix/retest loop. Flags: --source={changes|recording|update-ui|prompt|context|whole}, --visual-review={true|false} (resolve from the task request and project contract; no framework-wide default).'
disable-model-invocation: false
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

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** One E2E lifecycle for every request — resolve the source and scope, author or update tests only when the source needs it, then converge the fixed scope to an honest green through the project's configured runner, or escalate with exact evidence. Visual review runs only when requested or required by the project contract for an applicable visual surface; there is no framework-wide screenshot default.

**Use this** to write, update, run, verify or fix E2E/browser/user-flow coverage. Use `workflow-integration-test-green` / `workflow-write-integration-test` for integration tiers, `$e2e-test-verify` alone for a one-shot report-only check, and `workflow-bugfix` when the task is a product bug whose E2E test is only the proof.

**IMPORTANT MANDATORY Steps:** $investigate -> $e2e-test -> $e2e-test-verify --fix-loop -> $docs-update -> $workflow-end -> $watzup

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

## Size & Kind Triage (FIRST action)

Before choosing steps, classify the target and record the result in the run report:

- **Source** — resolve `--source` (below) and `--visual-review` (below). State both before any step.
- **Size** — XS: one known test or journey · S: one feature's cases (≤15 test files) · M: several features or ≤60 files · L/XL: a module-wide or `whole` run (hundreds of cases). Size sets batching and delegation, never whether the green gate runs.
- **Kind** — test-only authoring · baseline/visual update · verification-only (`prompt|context|whole` with no expected edits) · product fix expected (a failing journey on changed behavior) · data/auth/environment-sensitive (seed, accounts, external services).
- **Risk** — escalate depth on shared persistent state, auth/secrets, irreversible data, cross-service journeys, or an ambiguous scope; not on file count alone.

The triage picks which recommended skills run and how deep. An unresolvable source or scope stops with an ambiguity record — never a silently chosen maintenance mode.

## Required Quality Gates (non-negotiable)

| Gate                                                                                       | Evidence that proves it                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests-pass` — the fixed scope is green in THIS run                                        | `$e2e-test-verify --fix-loop` report: exact runner output (counts, failing names, exit status), the configured consecutive fresh green runs, Round Integrity Check pass, no scope shrink, no skipped/weakened/deleted test                    |
| Case traceability                                                                          | Each selected owner-qualified case/variant (or strict-default TC/§8 when no native `specArtifacts` profile applies) maps to an actual test, assertion and observed result; ID presence alone is not proof; unresolved links stay `UNVERIFIED` |
| Honest verdicts                                                                            | Every failure is classified `SOURCE-WRONG` / `TEST-WRONG` / `TEST-NOT-OPTIMAL` / `ENVIRONMENT-BLOCKED` / `AMBIGUOUS` before any edit; a fix lands at the owning layer and is reviewed                                                         |
| Explicit acceptance                                                                        | No snapshot, baseline, fixture or expectation changes without a named acceptance record; otherwise `ACCEPTANCE-PENDING`                                                                                                                       |
| Visual (when it applies)                                                                   | Every required capture opened and read case by case via `$experience-review --rounds=0` before synthesis; validated blocking findings fixed and the same scope rerun. A false value cannot waive a project-required gate                      |
| Docs synced (when the run changed tests, baselines, product source or documented behavior) | `$docs-update` triage result with terminal evidence                                                                                                                                                                                           |
| `run-closed`                                                                               | `$workflow-end` (top-level only) verifies every gate above                                                                                                                                                                                    |

`N/A` needs evidence: E2E is `APPLICABLE` only with a configured framework, runner and command; a relevant but unavailable capability is `ENVIRONMENT-BLOCKED`, never green.

## Recommended Skills

| Skill                                   | Earns its cost when                                                                                | Proves / feeds                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `$investigate`                          | Scope, runner, case profile or test organization is not already evidenced in this session; M+ size | Applicability, case map, commands, data strategy           |
| `$e2e-test` (`e2e-author`, conditional) | `--source` is `changes`, `recording` or `update-ui`                                                | Authored/updated artifact + exact scope handed to the loop |
| `$e2e-test-verify --fix-loop` (gate)    | Always                                                                                             | `tests-pass`, verdicts, visual gate, fresh reruns          |
| `$experience-review --rounds=0`         | Called by the loop when visual review applies                                                      | Per-capture records, blocking vs advisory findings         |
| `$docs-update` (conditional)            | The run changed tests, baselines, product source, specs or documented behavior                     | Docs synced                                                |
| `$workflow-end` + `$watzup`             | Always (top-level run)                                                                             | `run-closed`, handoff summary                              |

`$test` is not a second top-level run and no separate visual-fix loop exists — `$e2e-test-verify --fix-loop` is the single convergence and remediation owner after preparation. Skipping a recommended skill is fine when triage shows it does no real work; log it as a deviation (`intent-skip` / `when-false`) with evidence.

**Conditional step notes (registry `skipReason`, verbatim):**

- `$e2e-test` — skip when: Resolved --source is prompt, context, or whole; e2e-test-verify --fix-loop owns scenario selection or generation for that source.
- `$docs-update` — skip when: Verification-only run: no test, baseline, product source, spec, or documented behavior changed, so docs-update has nothing to record; cite the unchanged diff and the terminal verify report.

## Source Dispatch (`--source`)

An explicit value wins. When omitted, infer in order: recording JSON present → `recording`; explicit whole-project request → `whole`; run/verify/QC a feature, bugfix, journey or current context → `prompt` or `context`; UI/style/template diff with baseline intent → `update-ui`; confirmed code/spec/API change → `changes`. No evidenced signal → stop with an ambiguity record.

| `--source`           | Use when                                                                    | `$e2e-test` mode it drives                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changes`            | Test specs, source or API changed and E2E coverage must follow              | `from-changes` / `from-spec`: update only cases the changed intent requires                                                                                       |
| `recording`          | A browser recording JSON exists and a runner test is wanted                 | `from-recording`: convert with the project's configured recorder/converter (else author by hand), add outcome assertions, follow the configured test organization |
| `update-ui`          | UI changed and screenshot baselines need review                             | `update-ui`: collect candidate evidence; keep accepted expectations until an explicit acceptance record                                                           |
| `prompt` / `context` | A feature, bugfix, journey, QC request or current context defines the scope | none — the loop selects or generates cases                                                                                                                        |
| `whole`              | Project-wide E2E/QC verification                                            | none — the loop runs the configured full suite                                                                                                                    |

Authoring sources run only a focused authoring check at most; the final full green run belongs to the loop. Every source hands the loop one exact scope plus its case map.

## Visual Review (`--visual-review`)

Resolve independently from an explicit value, the task request and the project contract. `true` (explicit or project-required) on an applicable surface: capture the project-declared state × viewport matrix per the resolved `uiStateCapture.mode` (default `declared-only`; transitions only under explicitly configured, supported `every-action`; `off` keeps the matrix and records transition coverage as `N/A`), index captures, and have `$experience-review --rounds=0` read and record every required capture before synthesis. Validated `BLOCKING` findings join the E2E failure set, get one owning-layer fix, and the same scope reruns. `ADVISORY` polish and identity findings are recorded, never looped on. A false value cannot waive a project-required gate — record the conflict as a blocker. A non-visual scope records `N/A`. Behavior and visual quality are separate claims: a green run is not design approval.

Read `.claude/skills/shared/e2e-quality-protocol.md` before authoring or verification, and `.claude/skills/shared/ui-state-capture-protocol.md` when visual review applies; they own the scenario/invariant, isolation, auth, wait, evidence, cleanup and capture rows. This workflow owns only sequencing.

## Test Architecture Contract Handoff

Resolve one record before the first authoring or verification step and carry it to every step (the loop owns execution evidence; `$docs-update` receives the terminal result):

| Field                            | Required content                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applicability`                  | `APPLICABLE` with evidence of a configured framework, runner and command; otherwise `N/A — <evidence>`. Skill-local browser helpers are not project evidence               |
| `caseMap`                        | Configured owner/case/scenario/variant + evidence fields, or strict-default TC/§8 when no native profile applies; a malformed declared profile blocks and never falls back |
| `fullCommand` / `focusedCommand` | Copy-ready configured commands; invalid or zero-match selections exit non-zero                                                                                             |
| `runIdentity` / `dataStrategy`   | Unique non-sensitive run identity, public-path setup, declared seed/accumulation mode, parallel-worker isolation                                                           |
| `testOrganization`               | The declared local pattern and its canonical locator/action/wait owners; never require a Page Object Model or abstract base the project does not select                    |
| `result`                         | Exact counts, failing names, exit status, repeat evidence; two consecutive no-reset full runs for each applicable persistent-state suite                                   |

Browser journeys follow observe → act → observe with the configured runner's native waits or an evidenced project helper; action pacing applies only when the project contract configures it and never substitutes for a real settle signal.

## Orchestration Freedom

You choose inline vs sub-agent, batching and wave layout, optimizing wall-clock and token cost at equal quality. Fixed constraints only: a test exists before it is verified; fixes are re-verified after they land; `$workflow-end` runs last; gates awaiting user approval never run in parallel; each loop round runs the default verify pass inline (never a nested `--fix-loop`). Recommended: XS/S inline without sub-agents; L/XL partition authoring and failure triage per module or feature batch (one report per batch), while the green gate still runs the full fixed scope; delegate authoring to the `e2e-runner` agent when the batch is large.

## Memory & Reporting

- One task per selected step (and per batch for L/XL) so nothing is lost after compaction.
- Write the run report under `tmp/reports/` FIRST, then append per step, round and batch; visual records are appended one capture at a time.
- After compaction, re-read the report and the current task list before continuing; sub-agent briefs make report writing their first deliverable and return only the summary envelope.

## Fix Path & Loop Bounds

Owned by `$e2e-test-verify --fix-loop`; this workflow only enforces its bounds. Classify before editing, trace root cause with `$debug-investigate`, fix at the owning layer with `$fix`, review the round's diff with `$changes-review`, run the Round Integrity Check, then rerun fresh over the same scope. Converge on the configured consecutive fresh green runs (default 2) within the round cap (default 3). A non-shrinking or rising failure count, a cap hit with failures open, scope shrink or test loss → `NOT-CONVERGED` and escalate by asking the user directly with exact evidence. Never weaken, skip, narrow, delete, silence or auto-accept to obtain green.
<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `e2e-visual-design-contract` — Evidence and baseline rules for visual review in E2E and human QC; handling visual-review evidence or visual baseline updates → .claude/skills/shared/protocols/e2e-visual-design-contract.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `$ui-review` and runtime image evidence to `$experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one E2E lifecycle — resolve `--source` and visual mode, author only when the source needs it, then converge the fixed scope to an honest green through `$e2e-test-verify --fix-loop` or escalate with exact evidence.

- **MUST ATTENTION** triage first (source, size, kind, risk) and record it; size changes batching and depth, never whether the green gate runs.
- **MUST ATTENTION** `tests-pass` = exact runner output for the fixed scope, configured consecutive fresh green runs within the round cap, Round Integrity Check pass — never weaken, skip, narrow, delete or auto-accept a test or baseline to get there.
- **MUST ATTENTION** map every selected owner-qualified case (or strict-default TC/§8) to an actual test, assertion and result; classify each failure before editing and fix at the owning layer.
- **MUST ATTENTION** visual review only when requested or required by the project contract for an applicable surface; read and record every required capture case by case via `$experience-review --rounds=0`; a false value cannot waive a project-required gate.
- **MUST ATTENTION** write the report under `tmp/reports/` first, keep one task per selected step, re-read both after compaction; `$workflow-end` runs last.

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
