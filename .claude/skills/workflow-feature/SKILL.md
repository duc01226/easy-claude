---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Use when implementing a well-defined feature, adding a component, or building a capability — including TDD and spec-driven test-first work.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`/spec [mode=tests]`) are written and reviewed BEFORE implementation (`/plan-execute`), covering former TDD/test-first use cases.

**Summary:**

- Apply the shared `isLargeIdea` rule before the first mutating `/spec`; when true, carry the five-field `large_idea_decomposition` block through the owning spec/PBI and downstream presentation/mock-up artifacts. Do not create a roadmap artifact by default.
- For a genuinely isolated brownfield change, carry the shared contract's EXEMPT reason/owner and retain spec, scenario, test, review, and human-confirmation gates.
- Follow the investigation → spec → scenario → plan → review → implementation → verification sequence; never let implementation outrun product readiness.

 - **Main steps:** investigate → spec/clarify → scenario → plan/review/validate → pre-implementation test specs → implement → integration/spec sync → review → optional near-end `workflow-e2e` on explicit request → security/test/docs/demo handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require test specs/tests to name `Business Intent / Invariant Guarded` and fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- MUST ATTENTION preserve expected, unchanged, and no-regression behavior in the plan and review evidence when behavior can change.
- MUST ATTENTION treat code-extracted specs and TCs as reference-only until canonical review accepts them.
- MUST ATTENTION apply `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before the first mutating `/spec`. A true signal requires `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`; all-false work omits them. Run `/scenario` after spec clarification only when slice risks require it. An explicitly supplied roadmap is read-only context; the standalone writer is explicit-only.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                 |
| ------------------------------------ | ------------ | ------------------------------------------------ |
| `/plan`                              | 1st (pos 10) | PLAN₁: Feature Spec-backed implementation plan   |
| `/plan`                              | 2nd (pos 17) | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `/plan-review`                       | 1st (pos 11) | Review PLAN₁                                     |
| `/plan-review`                       | 2nd (pos 18) | Review PLAN₂                                     |
| `/spec [mode=tests]`                 | 1st (pos 14) | TDD-SPEC₁: Pre-implementation test specs         |
| `/spec [mode=tests]`                 | 2nd (pos 22) | TDD-SPEC₂: Post-implementation test spec update  |
| `/artifact-review --type=spec-tests` | 1st (pos 16) | Review TDD-SPEC₁                                 |
| `/artifact-review --type=spec-tests` | 2nd (pos 24) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `/investigate`):

- If image/wireframe/Figma URL is provided → route to `/design-spec --mode=wireframe` or `/figma-design` before `/plan`
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every non-skipped step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. A cited conditional skip explicitly authorized by canonical `preActions.injectContext` may complete without a skill call.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **Existing-behavior trace gate:** If the feature modifies an existing final output, persisted state, API response, projection, or user-visible workflow, include an end-to-start trace of the existing path (final reader -> storage/projection -> writer -> producer/origin), feeder paths, invariants to preserve, and forward proof for the intended new behavior before implementation.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the feature request). Before `/plan-execute`, verify the plan's feature success criteria map to the saved criteria. Pass the same goal file reference to every child step — child skills read the SAME saved goal, never a re-derived one from chat memory. Before `/workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

> **Large-Idea preflight:** Before the first mutating `/spec` for a new, broad, ambiguous, release-scoped, or multi-capability outcome, evaluate the shared four-operand rule and require the complete embedded decomposition block in the owning artifacts. After spec clarification and before `/plan`, run `/scenario` conditionally for replay/state/ownership/recovery risks. A `BLOCKED` Plan Gate stops `/plan-execute`; no default roadmap file is created.

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-discovery -> /domain-analysis -> /why-review -> /spec -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /domain-entities-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /workflow-review-changes -> /workflow-e2e --source=context -> /security-review -> /changelog -> /test -> /scan --target=domain-entities -> /docs-update -> /demo-guide -> /workflow-end -> /watzup

> **[EXPERIENCE ACCEPTANCE HANDOFF]** `/workflow-review-changes` carries the conditional `/experience-review` gate after code/rationale convergence. It exercises and inspects configured or likely observable surfaces, records `NOT-APPLICABLE` or `ENVIRONMENT-BLOCKED` honestly, and never promotes a new expectation without explicit acceptance.

> **[OPTIONAL E2E HANDOFF]** The sequence includes `/workflow-e2e --source=context` immediately after `/workflow-review-changes`. Run this occurrence only when the user explicitly requests E2E work, including wording such as “include E2E,” “write E2E,” “call E2E,” “run E2E,” or “do end-to-end verification.” Otherwise skip it with the manifest applicability reason; the step is disabled by default. When run, its nested workflow uses the default-on screenshot review and records evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when the repository lacks the applicable capability.

---

**IMPORTANT MANDATORY Steps:** /investigate -> /spec-discovery -> /domain-analysis -> /why-review -> /spec -> /spec-clarify -> /scenario -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /domain-entities-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /workflow-review-changes -> /workflow-e2e --source=context -> /security-review -> /changelog -> /test -> /scan --target=domain-entities -> /docs-update -> /demo-guide -> /workflow-end -> /watzup

> **Single-pass steps are self-loop-backed (convergence lives in the skill, not the sequence):** `/domain-entities-review` and both `/artifact-review --type=spec-tests` occurrences appear once each in the flat sequence with no repeat wired — intentionally. Each carries the full `SYNC:double-round-trip-review` self-loop (review → validate findings → fix validated findings → full re-review until the current exit bar is clear; round-2 LOW-only findings are deferred), so a single sequence occurrence still converges without spinning on polish. The workflow relies on that per-skill loop; it does NOT re-list the step to force convergence. (Contrast the six specialists in `/workflow-review-changes` steps 3–8, whose scoped-re-run note lives in that skill.)

> **Severity-floor clarification:** the shared loop fixes only findings that block the current round. Round 1 fixes all validated findings; from round 2 onward, CRITICAL/HIGH/MEDIUM findings remain blocking, while LOW-only findings are recorded as deferred and never open another fix/re-review round.

> **[BLOCKING]** Each non-skipped step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation, except a cited conditional skip explicitly authorized by canonical `preActions.injectContext`. NEVER batch-complete validation gates.

Activate the `workflow-feature` workflow. Run `/start-workflow workflow-feature` with the user's prompt as context.

> **Spec check (before investigation):** If `docs/specs/` has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: `ls docs/specs/` to discover available app buckets or flat system folders; then probe `ls docs/specs/{app-bucket}/` or `ls docs/specs/{system-name}/` to find the specific service spec.

**Steps:** /investigate → /spec-discovery → /domain-analysis → /why-review → /spec → /spec-clarify → /scenario → /plan → /plan-review → /plan-validate → /why-review → /spec [mode=tests] → /why-review → /artifact-review --type=spec-tests → /plan → /plan-review → /plan-execute → /seed-test-data → /domain-entities-review → /spec [mode=tests] → /why-review → /artifact-review --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-review → /integration-test-verify → /workflow-review-changes → /workflow-e2e --source=context → /security-review → /changelog → /test → /scan --target=domain-entities → /docs-update → /demo-guide → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH]** After `/test` and before `/docs-update`, run `/scan --target=domain-entities` to refresh the project-reference entity catalog only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `docs/project-reference/domain-entities-reference.md`. Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope; this is the explicitly authorized exception to the per-step skill-invocation rule.
>
> **[PERFORMANCE-SDD ROUTE]** If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run `/performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Run `/plan-execute` even on the performance route — never skip it. If behavior can change, run `/test` and any relevant functional no-regression checks. Update docs/specs for changed SLA, performance constraints, or behavior boundaries. Use project-specific performance docs from `docs/project-config.json` / `docs/project-reference/` when available.

> **[AI-SDD CLOSURE]** Before `/workflow-end`, confirm changed behavior, unchanged behavior, TCs/tests, docs/specs, and generated mirror sync are either completed or explicitly skipped with evidence.
>
> **[AI-SDD CLOSURE — POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY)]** The `/spec` authored at step 6 (before `/plan`) captured _intended_ behavior. After `/plan-execute`, re-verify Feature Spec **§1-7** (not only §8 TCs) against what was _actually built_ and adjudicate every divergence per `shared/sdd-artifact-contract.md` → Drift Gates (`SYNC:spec-drift-adjudication`): **CODE-WRONG** → fix code/test against the spec; **SPEC-STALE** → run `/spec [update]` to record the new intended behavior, then `/spec [mode=tests] [update]` + `/spec [mode=sync]`; **AMBIGUOUS** → escalate to the spec owner. A feature that shipped behavior the spec does not describe leaves the spec stale and is NOT closure-ready. This re-verify is not optional cleanup — it is the "after implement, verify and create/update specs again" half of the SDD cycle.

> **UI-intent maintenance (conditional)** — runs alongside the `/spec [mode=sync]` step, **only when the change carries user-facing behavior** (else state the skip reason — backend-only change, no §6 change). When user-facing behavior is present, run `/spec` (ui-intent intent) to refresh the affected Feature Spec **§6** interaction surface — View Inventory, Key UI States, and the per-story (`US-`/`OP-`/`BR-`) click-path the feature touched — and link the governing `/design-spec`/mockup in the spec frontmatter so §6 and the design artifact stay coupled to what was actually built. The rules live in the shared block below (`SYNC:ui-intent-layer`) — follow it; do not restate it here.

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

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
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:ui-intent-layer -->

> **[BLOCKING] Capture a tech-agnostic UI/UX intent layer in every UI-bearing spec — a reader must be able to visualize how the feature works without naming any technology.** When the feature has a user interface, the spec MUST ATTENTION carry an interaction-surface section so the application — not just its API — can be rebuilt on any stack:
>
> 1. **View Inventory** — list each view/screen by its UX ROLE and purpose (e.g. "list of items", "item editor", "confirmation step") and what information it presents. Describe by role, never by an implementation name.
> 2. **Navigation Map** — how a user moves between views: entry points, transitions, and exits. Trace how this surface connects to neighboring features already in the system.
> 3. **Key observable UI States** — the distinct states a user can observe per view (empty, loading, populated, error, success, permission-denied, etc.) — described as what the user perceives, not how it is rendered.
> 4. **Per-story interaction flow** — for each user story, the step-by-step click/action path from intent to outcome, cross-referenced to the logical IDs the spec already owns (`US-`/`OP-`/`BR-`).
> 5. **Couple to the companion design artifact** — keep deep visual fidelity (layout, tokens, pixel detail) OUT of the spec; it lives in the linked `design-spec`/mockup. Record that companion's path in the spec frontmatter so the spec stays the navigable hub.
>
> **M1-clean (NON-NEGOTIABLE):** the prose names ZERO frameworks, routes/URLs, CSS, or component-class names — only roles, information, states, and flows. Technology detail belongs in the companion design artifact, never here.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that reason explicitly in the section.

<!-- /SYNC:ui-intent-layer -->

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
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, and proximity to the round cap never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW.
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
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (View Inventory + Navigation Map + observable UI States + per-story `US-/OP-/BR-`-traced flow); keep deep visual fidelity in the linked `design-spec`/mockup recorded in frontmatter; name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`/spec [mode=tests]`) are written and reviewed BEFORE implementation (`/plan-execute`), covering former TDD/test-first use cases.
**IMPORTANT MUST ATTENTION Main steps:** investigate → spec/clarify → scenario → plan/review/validate → pre-implementation test specs → implement → integration/spec sync → review → optional near-end `workflow-e2e` on explicit request → security/test/docs/demo handoff; large ideas carry embedded decomposition and ordinary runs never create a roadmap file.
**IMPORTANT MUST ATTENTION Workflow:** Execute `/investigate` → `/spec-discovery` → `/domain-analysis` → `/why-review` → `/spec` → `/spec-clarify` → `/scenario` → `/plan` → `/plan-review` → `/plan-validate` → `/why-review` → `/spec [mode=tests]` → `/why-review` → `/artifact-review --type=spec-tests` → `/plan` → `/plan-review` → `/plan-execute` → `/seed-test-data` → `/domain-entities-review` → `/spec [mode=tests]` → `/why-review` → `/artifact-review --type=spec-tests` → `/spec [mode=sync]` → `/integration-test` → `/integration-test-review` → `/integration-test-verify` → `/workflow-review-changes` → optional `/workflow-e2e --source=context` → `/security-review` → `/changelog` → `/test` → conditional `/scan --target=domain-entities` → `/docs-update` → `/demo-guide` → `/workflow-end` → `/watzup`; preserve large-idea decomposition, Goal Contract, spec-drift, UI-intent, performance, and explicit conditional-skip gates.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End To Start Debugger Trace:** trace observed output backward; matrix hypotheses before fixing.
- **Nested Task Creation:** expand child phases; link parent when nested.
- **Critical Thinking:** trace every claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** append findings to report file; never hold in memory.
- **Subagent Return Contract:** sub-agents return summary only; NEVER inline full output; report on disk.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
