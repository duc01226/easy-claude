---
name: workflow-seed-test-data
version: 1.0.0
description: '[Workflow] Use when activating the Seed Test Data workflow for idempotent QC happy-path seeders.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Seed Test Data workflow — investigate existing seeder patterns, implement idempotent QC happy-path seeders via application commands, review compliance, simplify.

**Summary:** Run `/investigate` → `/seed-test-data` → conditional `/experience-review` → `/changes-review` → `/code-simplifier` → `/docs-update` → `/workflow-end` → `/watzup`; before writing, read the Data Seeders project-config group and seed reference, then enforce environment-first gating, configured counts, application-command-only writes, `existing_count`→`target_count` idempotency, and scoped DI per iteration.

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

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /changes-review -> /code-simplifier -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Read Project Config Gate:** The `/seed-test-data` step MUST read `docs/project-config.json` → 'Data Seeders' context group and `docs/project-reference/seed-test-data-reference.md` BEFORE writing any seeder code. Seeder written without reading the project base class and DI scope pattern is guaranteed to be wrong.

Activate the `workflow-seed-test-data` workflow. Run `/start-workflow workflow-seed-test-data` with the user's prompt as context.

**Steps:** /investigate → /seed-test-data → /experience-review → /changes-review → /code-simplifier → /docs-update → /workflow-end → /watzup

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> **`/investigate`** — Find feature area command files; locate existing seeders in the same service for pattern matching. Output: target seeder file path (or "none — create new") + existing seeder examples.
> **`/investigate`** — Read the commands the seeder will call. Map: required inputs, validation rules, side effects, cross-service dependencies. Output: command signature list + dependency chain (what data must pre-exist).
> **`/seed-test-data`** — Implement or enhance the seeder. Environment gate FIRST → read count from config → idempotency check → loop from existing to target → dispatch application commands with realistic, diverse inputs.
> **`/experience-review`** (CONDITIONAL) — Exercise the seeder against its configured entry point and INSPECT the data a QC/operator actually observes (running app screen, API response, CLI transcript, or generated artifact) against the scenario's intended purpose. A seeder that exits 0 has not been verified; the seeded state must be observed. Classify `OBSERVED`/`JUDGED`/`HUMAN-ACCEPTED`/`UNVERIFIED`/`ENVIRONMENT-BLOCKED`/`NOT-APPLICABLE` and never promote a new expected baseline without an explicit acceptance record.
> **`/changes-review`** — Full compliance review: environment gate present, count read from config key, idempotency correct (loop from `existing` not from `0`), no direct DB writes for domain entities, project's scoped DI mechanism used per iteration.
> **`/code-simplifier`** — DRY and simplify the seeder without changing behavior. Merge duplication, extract reusable builders, remove unnecessary scaffolding.
> **`/docs-update`** — Triage doc impact from changed seeder files. Update feature docs if dev-data coverage changed materially.
> **`/workflow-end`** + **`/watzup`** — Close workflow state, then summarize and run the final `/understand` handoff.

> **[STEP CONDITIONS]** The bare list above is the canonical order; only one step is conditional:
>
> - **`/experience-review`** — run when the seeded data reaches a configured `experienceVerification` surface whose `reviewOn` trigger intersects the change, OR when the seeder creates/changes data a QC/operator observes through a running application, API, CLI, or generated artifact. Skip ONLY with an evidence-backed `NOT-APPLICABLE` reason citing the inspected `docs/project-config.json` and seeder diff — never a generic "not a UI change". A relevant surface that cannot be run or inspected (no dev environment, no seeded database, no client) is `ENVIRONMENT-BLOCKED`, never PASS and never `NOT-APPLICABLE`. When the surface is likely but `experienceVerification` is unconfigured, run the skill and record `ENVIRONMENT-BLOCKED` — do not invent a runner.
> - **All other steps** — always run.
>
> **Why the gate sits here, before `/changes-review`:** a seeder's deliverable is observed data, not code. `/changes-review` proves the seeder obeys the environment/idempotency/command rules; only `/experience-review` proves the scenarios it produced are the ones QC needs. The step runs its own bounded remediation loop (`--rounds=N`, default 3): a BLOCKING defect in the seeded data is adjudicated, fixed at the owning layer, code-reviewed, and re-proved by re-seeding and re-observing from scratch. It never rewrites an expectation, fixture, or acceptance criterion to close the gap, and it converges to `AGENT-RECOMMENDED-ACCEPT`/`ACCEPTANCE-PENDING` — never to a signed acceptance. Unresolved defects at the cap are reported `NOT-CONVERGED` and routed back to `/seed-test-data`.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /changes-review -> /code-simplifier -> /docs-update -> /workflow-end -> /watzup

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint.
> 2. **After each file/section reviewed:** Append findings, evidence, changed paths, and gaps immediately — never hold them in memory.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. It preserves all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result from being mistaken for the current run.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

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
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Seed Test Data workflow — investigate existing seeder patterns, implement idempotent QC happy-path seeders via application commands, review compliance, simplify.
**IMPORTANT MUST ATTENTION Workflow:** Read the Data Seeders project-config group and `docs/project-reference/seed-test-data-reference.md` → `/investigate` patterns/commands → `/seed-test-data` with environment/count/idempotency/scoped-DI gates → conditional `/experience-review` → `/changes-review` → `/code-simplifier` → `/docs-update` → `/workflow-end` → `/watzup`; use application commands for domain entities, preserve evidence, and never batch or skip mandatory steps.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; NEVER skip one):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases and link the parent when nested; one `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `plans/reports/` per file, never hold in memory.
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
