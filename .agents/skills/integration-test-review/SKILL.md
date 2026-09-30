---
name: integration-test-review
description: '[Code Quality] Use when a workflow step or the user asks for an integration-test review. Performs one evidence-backed review pass over tests, source, and governing specs; maximum one review round per invocation.'
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

## Quick Summary

**Goal:** In one review pass, determine whether integration tests protect intended behavior through realistic, repeatable, observable boundaries and remain aligned with source and canonical specs.

**Summary:**

- **ONE ROUND MAXIMUM per invocation.** Review once, validate/deduplicate findings, report, stop. Never fix tests/source or re-review inside this skill.
- Review the package, not isolated test files: governing spec/cases + production path + integration tests + runner/config evidence.
- `--report-only` is the normal workflow-specialist mode. `--prove-tests` may inspect existing runner evidence or run the configured relevant suite only when the caller owns test execution; it does not open another review round.
- Preserve the AI-surface lens when the tested path calls a model, prompt, agent, tool/MCP, retrieval, or guardrail.

**Workflow:** Resolve scope/profile → trace spec/test/source package → run eight quality gates once → validate/deduplicate → verdict/report → stop.

**Key Rules:**

- Maximum one review round per invocation; another pass requires a new explicit invocation after the caller revises the target.
- Read-only on source, tests, specs, and config. Write only the review report under `tmp/reports/`.
- Never weaken assertions, add skips, widen timeouts, or rewrite source/tests to force green.

## One-Round Contract

`round = 1`, `maxRounds = 1`, `minRounds = 1`.

- The round includes evidence loading, all quality gates, optional parallel batches/lenses, finding validation, deduplication, and verdict.
- Findings return to the caller as `CHANGES_REQUESTED`; the caller owns fixes and final verification.
- No internal fix loop, fresh-context re-review, round-2 severity floor, or review-policy continuation applies.
- Test reruns used to diagnose a failure are verification/recovery, not review rounds, and remain owned by `integration-test-verify` or the parent workflow.

## Scope and Case Profile

1. Resolve `docs/project-config.json`, the configured integration-test command, relevant reference docs, and `specArtifacts`.
2. Valid native profile: use its intent/contracts/evidence roles, case identity, carrier dialect, and cardinality. Absent profile: use the strict-default feature-spec/TC contract. Malformed profile: `BLOCKED`, no fallback.
3. Locate the whole package:
   - canonical intent/contract and case/scenario;
   - production entry path and owned outcome;
   - integration test and assertion path;
   - fixtures/builders/data isolation and runner configuration.
4. Create `tmp/reports/integration-test-review-{YYMMDD}-{HHmm}-{slug}.md` before findings.

## Single Review Pass — Eight Gates

Judge each gate `PASS`, `FAIL`, `N/A`, or `NOT VERIFIABLE` with `file:line`/config/runner evidence.

### 1. Assertion value

- Does the assertion fail when the protected rule breaks, or does it only prove no exception/status bookkeeping?
- Name the mutant or behavioral break that should make the case red.

### 2. Owned outcome

- Assert the business/entity/system outcome the tested component owns, not queue attempts, delivery bookkeeping, sleeps, or another process's mutable internals.
- For async behavior, assert convergence independent of which worker completes it.

### 3. Repeatability and isolation

- Test data/state is isolated under the configured concurrency model; cleanup removes only owned resources.
- Reruns do not depend on order, shared leftovers, wall-clock luck, or a blind delay.

### 4. Behavior ownership

- Setup uses the production boundary when that boundary is under test; unrelated preconditions may use project-native fixtures/builders without bypassing the protected contract.
- A failure is provisionally classified SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS before any recommendation.

### 5. Spec/case traceability

- Owner + case/scenario + optional variant resolves to the actual executor and inspected assertion.
- Identity text alone is not proof; preserve configured many-to-many mappings.

### 6. Spec ↔ tests ↔ code consistency

- Triangulate all three faces and classify divergence as CODE-WRONG, SPEC-STALE, SPEC-SILENT, TEST-GAP, WEAK-TEST, or AMBIGUOUS.
- Green tests never normalize drift. A changed invariant missing from the canonical owner remains incomplete.

### 7. Change coverage

- Every changed behavior, error path, edge/boundary, authorization rule, state transition, and regression risk has appropriate integration coverage or an evidence-backed reason another test tier owns it.
- Do not require integration tests for mechanics already better proven by a narrower/lower-cost test.

### 8. Real-world fidelity

- Sequence, timing, actors, topology, and data can occur in production—or an impossible-state test labels and justifies its corruption/recovery purpose.
- Use observable readiness/postconditions and native runner waits; no assertion retry, timeout widening, or fixed sleep masking.

### Conditional AI-surface lens

When the path calls a model, prompt, agent, tool/MCP, retrieval, eval, or guardrail, also review: deterministic seams/mocks at the correct boundary, tool authorization, untrusted output handling, bounded retries/spend, eval/trace evidence, fallback/kill switch, and assertions on owned outcomes. Route deep AI concerns to `ai-engineering-review --report-only`; keep it inside this one pass.

## Execution Evidence

- `--report-only`: do not run tests. Review source, specs, and any existing exact runner output supplied by the caller.
- `--prove-tests`: run the configured relevant suite once only when this invocation is the final proof owner and no parent verify-last step will run it later. Record exact command, exit code, scope, and output location.
- Any failure follows the test-failure investigation route. This skill reports the adjudicated finding; it does not edit or start another review pass.

## Finding Validation and Verdict

1. Deduplicate findings by root cause/owner.
2. Confirm reachable consequence, evidence, confidence, and normalized severity. Validate findings through `$why-review --validate-findings <report-path>`; terminal validation is part of round 1 and never opens another review round.
3. Emit:
   - `PASS` — all gates clear with no validated blocking finding.
   - `PASS_WITH_NOTES` — LOW observations only.
   - `CHANGES_REQUESTED` — validated test/source/spec findings require caller action.
   - `BLOCKED` — required profile, environment, owner intent, or execution evidence is unavailable.
4. Stop. Never fix or re-review.

## Report Shape

```markdown
# Integration Test Review — {scope}

## Verdict
PASS | PASS_WITH_NOTES | CHANGES_REQUESTED | BLOCKED
Review rounds: 1/1

## Package Traced
| spec/case | production owner | test/assertion | runner |

## Gate Results
| gate | status | evidence | note |

## Findings
### [SEVERITY] Short title
- Evidence and reachable path:
- Protected intent/consequence:
- Fault classification:
- Owner and recommended correction:
- Confidence:

## Coverage and Limits
- AI-surface lens: applied/N/A + evidence
- Test execution: deferred/proved + exact evidence
- Unverified items and owner
```

Inside a workflow, return the verdict/report path to the parent without next-step prompts.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-engineering-gate` — Thirty-eight AI-engineering clauses, AE-1.1 to AE-9.4: prompt contract, security, agents, retrieval, reliability, evals, operations, governance, UX; planning, building or reviewing a feature that calls a model → .claude/skills/shared/protocols/ai-engineering-gate.md
- `category-review-thinking` — Derive review concerns per category of changed files from domain knowledge; reviewing a changeset that spans several file categories → .claude/skills/shared/protocols/category-review-thinking.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md

<!-- PROTOCOL-GUIDES:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete one evidence-backed integration-test review pass over spec, source, test, and runner contracts.

- **MUST ATTENTION** maximum one review round per invocation: review → validate/deduplicate → verdict → stop.
- **MUST ATTENTION** never edit tests/source/specs or start a re-review inside this skill.
- **MUST ATTENTION** preserve assertion value, owned outcome, repeatability, behavior ownership, traceability, three-way sync, change coverage, and fidelity.
- **MUST ATTENTION** keep the conditional AI-surface lens and route deep findings to the AI reviewer within the same single pass.
- **MUST ATTENTION** test execution is deferred when a parent verify-last gate owns it.

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
2. Generality test: does it apply to ≥3 contexts (codebases for a universal lesson, everyday tasks here for a project convention)? If not, abstract one level up.
3. Write as a durable rule — a universal lesson strips project-specific names/paths/classes; a project convention states the convention itself, never this session's incident.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Value gate:** is it a project convention or a universal best-practice protocol worth reading on everyday work? Rare AI-agent quirks, one-off incidents and details of the current task → No → skip `$learn`.
6. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
7. **Auto-fix gate:** "Could `$code-quality-review`/`$code-simplifier`/`$security-audit`/a linter catch this?" — Yes → improve review skill instead.
8. ALL three gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Core engineering principles:** Every plan, implementation and review must lower future change cost. **Easy to change** — reuse before writing, one owner per rule, purpose-named interfaces/adapters at volatile boundaries. **Easy to scale** — extend by addition with bounded growth, sized to the project's real profile. **Easy to maintain** — intent-named tests that fail when a behavior breaks, mechanical harness green. Before done, answer: next change → how many edit sites? 10× → what breaks? which test goes red? (`SYNC:core-engineering-principles`).
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
