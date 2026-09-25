---
name: workflow-seed-test-data
version: 1.0.0
description: '[Workflow] Use when seeding test data or implementing idempotent QC happy-path seeders.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Seed Test Data workflow — investigate existing seeder patterns, implement idempotent QC happy-path seeders via application commands, review compliance, simplify.

**Summary:** Run `/investigate` → `/seed-test-data` → conditional `/experience-review` → `/code-simplifier` → `/test` → `/changes-review` → `/docs-update` → `/workflow-end` → `/watzup`; before writing, read the Data Seeders project-config group and seed reference, then enforce environment-first gating, configured counts, application-command-only writes, `existing_count`→`target_count` idempotency, and scoped DI per iteration.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /code-simplifier -> /test -> /changes-review -> /docs-update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Read Project Config Gate:** The `/seed-test-data` step MUST read `docs/project-config.json` → 'Data Seeders' context group and `docs/project-reference/seed-test-data-reference.md` BEFORE writing any seeder code. Seeder written without reading the project base class and DI scope pattern is guaranteed to be wrong.

Activate the `workflow-seed-test-data` workflow. Run `/start-workflow workflow-seed-test-data` with the user's prompt as context.

**Steps:** /investigate → /seed-test-data → /experience-review → /code-simplifier → /test → /changes-review → /docs-update → /workflow-end → /watzup

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`/investigate`** — Find feature area command files; locate existing seeders in the same service for pattern matching. Output: target seeder file path (or "none — create new") + existing seeder examples.
> **`/investigate`** — Read the commands the seeder will call. Map: required inputs, validation rules, side effects, cross-service dependencies. Output: command signature list + dependency chain (what data must pre-exist).
> **`/seed-test-data`** — Implement or enhance the seeder. Environment gate FIRST → read count from config → idempotency check → loop from existing to target → dispatch application commands with realistic, diverse inputs.
> **`/experience-review`** (CONDITIONAL) — Exercise the seeder against its configured entry point and INSPECT the data a QC/operator actually observes (running app screen, API response, CLI transcript, or generated artifact) against the scenario's intended purpose. A seeder that exits 0 has not been verified; the seeded state must be observed. Classify `OBSERVED`/`JUDGED`/`HUMAN-ACCEPTED`/`UNVERIFIED`/`ENVIRONMENT-BLOCKED`/`NOT-APPLICABLE` and never promote a new expected baseline without an explicit acceptance record.
> **`/code-simplifier`** — DRY and simplify the seeder without changing behavior. Merge duplication, extract reusable builders, remove unnecessary scaffolding.
> **`/test`** — Run the project's tests against the final seeder code, after simplification, so the tests-pass gate proves the code that ships.
> **`/changes-review`** — Full compliance review: environment gate present, count read from config key, idempotency correct (loop from `existing` not from `0`), no direct DB writes for domain entities, project's scoped DI mechanism used per iteration.
> **`/docs-update`** — Triage doc impact from changed seeder files. Update feature docs if dev-data coverage changed materially.
> **`/workflow-end`** + **`/watzup`** — Close workflow state, then summarize; `/watzup` hands off to `/understand` only for a large code change or on request.

> **[STEP CONDITIONS]** The bare list above is the canonical order; only one step is conditional:
>
> - **`/experience-review`** — run when the seeded data reaches a configured `experienceVerification` surface whose `reviewOn` trigger intersects the change, OR when the seeder creates/changes data a QC/operator observes through a running application, API, CLI, or generated artifact. Skip ONLY with an evidence-backed `NOT-APPLICABLE` reason citing the inspected `docs/project-config.json` and seeder diff — never a generic "not a UI change". A relevant surface that cannot be run or inspected (no dev environment, no seeded database, no client) is `ENVIRONMENT-BLOCKED`, never PASS and never `NOT-APPLICABLE`. When the surface is likely but `experienceVerification` is unconfigured, run the skill and record `ENVIRONMENT-BLOCKED` — do not invent a runner.
> - **All other steps** — always run.
>
> **Why the gate sits here, before `/changes-review`:** a seeder's deliverable is observed data, not code. `/changes-review` proves the seeder obeys the environment/idempotency/command rules; only `/experience-review` proves the scenarios it produced are the ones QC needs. The step runs its own bounded remediation loop (`--rounds=N`, default 3): a BLOCKING defect in the seeded data is adjudicated, fixed at the owning layer, code-reviewed, and re-proved by re-seeding and re-observing from scratch. It never rewrites an expectation, fixture, or acceptance criterion to close the gap, and it converges to `AGENT-RECOMMENDED-ACCEPT`/`ACCEPTANCE-PENDING` — never to a signed acceptance. Unresolved defects at the cap are reported `NOT-CONVERGED` and routed back to `/seed-test-data`.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /code-simplifier -> /test -> /changes-review -> /docs-update -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
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

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Seed Test Data workflow — investigate existing seeder patterns, implement idempotent QC happy-path seeders via application commands, review compliance, simplify.
**IMPORTANT MUST ATTENTION Workflow:** Read the Data Seeders project-config group and `seed-test-data-reference.md` in the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) → `/investigate` patterns/commands → `/seed-test-data` with environment/count/idempotency/scoped-DI gates → conditional `/experience-review` → `/code-simplifier` → `/test` → `/changes-review` → `/docs-update` → `/workflow-end` → `/watzup`; use application commands for domain entities, preserve evidence, and never batch or skip mandatory steps.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; NEVER skip one):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases and link the parent when nested; one `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `tmp/reports/` per file, never hold in memory.
- **Sub-Agent Return Contract:** sub-agents return summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** read `docs/project-config.json` → 'Data Seeders' AND `docs/project-reference/seed-test-data-reference.md` BEFORE writing any seeder code
**IMPORTANT MUST ATTENTION** NEVER call repository/DB directly for domain entities — use application-layer commands only
**IMPORTANT MUST ATTENTION** ALWAYS gate by environment FIRST; ALWAYS check count before seeding
**IMPORTANT MUST ATTENTION** loop from `existing_count` to `target_count` — NEVER from `0` (restart-safety)
**IMPORTANT MUST ATTENTION** use project's scoped DI mechanism per iteration — never share a DI scope across loop iterations
**IMPORTANT MUST ATTENTION** run conditional `/experience-review` after `/seed-test-data` whenever the seeded data reaches a configured or likely observable surface — a seeder exit code is NOT evidence that the seeded scenarios are correct; skip only with an evidence-backed `NOT-APPLICABLE`, and record `ENVIRONMENT-BLOCKED` (never PASS) when a relevant surface cannot be run or inspected
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
