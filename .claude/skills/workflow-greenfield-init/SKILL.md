---
name: workflow-greenfield-init
version: 1.0.0
description: '[Workflow] Use when starting a new project from scratch — full waterfall inception from idea through implementation and integration testing.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** [Workflow] Trigger Greenfield Project Init workflow — full waterfall project inception from idea through implementation with a test architecture contract, integration verification, conditional E2E evaluation, and final full/focused verification.

**Summary:**

- Begin with the shared large-idea classification and embedded decomposition contract; run `/scenario` before the first plan when the outcome slices require adversarial risk analysis. A roadmap artifact is not a default greenfield prerequisite.
- Research the product, domain, technology, architecture, and foundation in order; scaffold and review the foundation before feature work.
- Every generated PBI MUST pass the Releasable Outcome Gate: one independently releasable actor-facing outcome with a complete entry-to-result journey; foundation/scaffold/setup work is enabling work attached to that outcome, never a standalone technical PBI. UI PBIs require the full page/view, navigation, component, state, and mock-app flow surface.
- Preserve the full spec/PBI/story/test chain, emit the test architecture contract before implementation planning completes, and finish with implementation, integration verification, conditional E2E evaluation, conditional experience exercise/inspection, synchronized evidence, and final full/focused verification.

 - **Main steps:** classify/decompose → research → domain/tech/architecture + test contract → scenario/plan/review → PBI/story/mock-up/spec gates → scaffold/lint/harness/architecture review → implementation/integration verification → conditional E2E → final full/focused verification → final review/security/test/docs/handoff.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION classify the greenfield idea with `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before market research, architecture, specs, PBIs, or plans. When true, require the complete embedded `large_idea_decomposition` block in the owning PBI/spec with `outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, and `deferred_work_owner`, then carry stable slice IDs into stories, mock-ups, and the all-PBI presentation; run `/scenario` only when the selected scope needs adversarial risk analysis, otherwise record the conditional skip with evidence. An explicit roadmap request may use the standalone writer separately.
- MUST ATTENTION emit and validate the Test Architecture & Execution Contract matrix before the first implementation plan completes; block handoff when any applicable tier lacks a copy-ready full command, focused command, zero-match behavior, or unique run/data identity, and record evidence-backed `N/A` for non-applicable tiers.
- MUST ATTENTION after `/integration-test-verify`, inspect configured E2E evidence and invoke `/e2e-test` only when a runnable E2E framework/command is configured; otherwise record explicit evidence-backed `N/A`. The final `/test` must report full/focused verification and exact results.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                                                          |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `/plan`                              | 1st (pos 14) | PLAN₁: High-level architecture plan (after architecture-design and conditional decomposition scenario gate) |
| `/plan`                              | 2nd (pos 34) | PLAN₂: Sprint-ready implementation plan (after artifact-review --type=spec-tests)         |
| `/plan`                              | 3rd (pos 51) | PLAN₃: Integration test architecture plan (post-implementation)                           |
| `/plan-review`                       | 1st (pos 15) | Review PLAN₁ architecture (immediate gate; replaces former rationale why-review)          |
| `/plan-review`                       | 2nd (pos 18) | Re-review PLAN₁ after architecture-security + performance analysis                        |
| `/plan-review`                       | 3rd (pos 35) | Review PLAN₂ implementation                                                               |
| `/plan-review`                       | 4th (pos 52) | Review PLAN₃ integration tests                                                            |
| `/security-review`                   | 1st (pos 16) | Architecture security review                                                              |
| `/security-review`                   | 2nd (pos 59) | Production readiness security review                                                      |
| `/spec [mode=tests]`                 | 1st (pos 30) | TDD-SPEC₁: Feature test specs (before implementation)                                     |
| `/spec [mode=tests]`                 | 2nd (pos 48) | TDD-SPEC₂: Post-implementation test spec update                                           |
| `/artifact-review --type=spec-tests` | 1st (pos 32) | Review TDD-SPEC₁                                                                          |
| `/artifact-review --type=spec-tests` | 2nd (pos 50) | Review TDD-SPEC₂                                                                          |
| `/e2e-test`                          | (conditional, pos 56) | Run after integration-test-verify only when E2E is configured; otherwise record evidence-backed N/A |
| `/test`                              | 1st (pos 57) | Test after integration tests and conditional E2E evaluation                               |
| `/test`                              | 2nd (pos 61) | Final full/focused test verification                                                       |
| `/domain-entities-review`            | 1st (pos 47) | DDD quality review — conditional: skip if no domain entity files in changeset             |
| `/linter-setup`                      | (new)        | LINTER-SETUP: Install and configure computational feedback sensors                        |
| `/harness-setup`                     | (new)        | HARNESS-SETUP: Full outer agent harness (feedforward guides + feedback sensors inventory) |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /security-review -> /performance-review -> /plan-review -> /refine -> /why-review -> /artifact-review --type=pbi -> /story -> /why-review -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /linter-setup -> /harness-setup -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /why-review -> /plan-execute -> /seed-test-data -> /domain-entities-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /integration-test -> /integration-test-review -> /integration-test-verify -> /e2e-test -> /test -> /workflow-review-changes -> /security-review -> /changelog -> /test -> /scan --target=domain-entities -> /docs-update -> /workflow-end -> /watzup

**IMPORTANT MANDATORY Steps:** /idea -> /web-research -> /deep-research -> /market-analysis -> /business-evaluation -> /spec-discovery -> /domain-analysis -> /why-review -> /tech-stack-research -> /architecture-design -> /architecture-scalability-review -> /why-review -> /scenario -> /plan -> /plan-review -> /security-review -> /performance-review -> /plan-review -> /refine -> /why-review -> /artifact-review --type=pbi -> /story -> /why-review -> /artifact-review --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /spec-clarify -> /plan -> /plan-review -> /scaffold -> /linter-setup -> /harness-setup -> /architecture-review-full -> /scan --target=ui-system -> /scan --target=backend-patterns -> /scan --target=integration-tests -> /scan --target=project-structure -> /why-review -> /plan-execute -> /seed-test-data -> /domain-entities-review -> /spec [mode=tests] -> /why-review -> /artifact-review --type=spec-tests -> /plan -> /plan-review -> /integration-test -> /integration-test-review -> /integration-test-verify -> /e2e-test -> /test -> /workflow-review-changes -> /security-review -> /changelog -> /test -> /scan --target=domain-entities -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each selected step MUST ATTENTION invoke its `Skill` tool — marking a selected task `completed` without skill invocation is a workflow violation. A declared conditional step such as `/scenario` may be marked skipped only with evidence and an explicit reason; NEVER batch-complete validation gates.

Activate the `workflow-greenfield-init` workflow. Run `/start-workflow workflow-greenfield-init` with the user's prompt as context.

**Steps:** /idea → /web-research → /deep-research → /market-analysis → /business-evaluation → /spec-discovery → /domain-analysis → /why-review → /tech-stack-research → /architecture-design → /architecture-scalability-review → /why-review → /scenario → /plan → /plan-review → /security-review → /performance-review → /plan-review → /refine → /why-review → /artifact-review --type=pbi → /story → /why-review → /artifact-review --type=story → /pbi-challenge → /dor-gate → /pbi-mockup → /plan-validate → /why-review → /spec [mode=tests] → /why-review → /artifact-review --type=spec-tests → /spec-clarify → /plan → /plan-review → /scaffold → /linter-setup → /harness-setup → /architecture-review-full → /scan --target=ui-system → /scan --target=backend-patterns → /scan --target=integration-tests → /scan --target=project-structure → /why-review → /plan-execute → /seed-test-data → /domain-entities-review → /spec [mode=tests] → /why-review → /artifact-review --type=spec-tests → /plan → /plan-review → /integration-test → /integration-test-review → /integration-test-verify → /e2e-test → /test → /workflow-review-changes → /security-review → /changelog → /test → /scan --target=domain-entities → /docs-update → /workflow-end → /watzup

> **[CONDITIONAL TERMINAL DOMAIN-ENTITY REFERENCE REFRESH]** After `/test` and before `/docs-update`, run `/scan --target=domain-entities` to refresh the project-reference entity catalog only when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in `docs/project-reference/domain-entities-reference.md`. Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope; this is the explicitly authorized exception to the per-step skill-invocation rule.

> **[BLOCKING TEST ARCHITECTURE HANDOFF GATE]** During `/architecture-design`, emit the Test Architecture & Execution Contract matrix before the first `/plan` completes. Before `/plan-execute` or any feature-implementation handoff, validate every potentially applicable Unit, Integration/System, and E2E row: `APPLICABLE` requires evidence-backed runner/framework/configuration, copy-ready full and focused commands, zero-match behavior, and unique run/data identity; missing any of these blocks handoff. Record `N/A — <evidence>` for every non-applicable tier; never substitute an assumption for missing evidence.

> **[CONDITIONAL E2E GATE]** Immediately after `/integration-test-verify`, inspect `docs/project-config.json` → `e2eTesting` and the matching runnable framework, entry points, and commands. When configured, invoke `/e2e-test`; otherwise complete that conditional step as `N/A — <evidence>` citing the configuration and repository scan, without fabricating browser setup. When the implementation exposes a configured or likely observable surface, run the conditional `/experience-review` after final review convergence; a relevant surface without a runnable/inspectable capability is `ENVIRONMENT-BLOCKED`, not `N/A` or PASS. The following `/test` step performs final full/focused verification and reports exact results and exit status for each applicable tier.

> **Architecture quality gate (`/architecture-scalability-review`, pos 11).** Immediately after `/architecture-design` and before the first `/plan`, greenfield runs the architecture & scalability scorecard (init mode) so its findings and gate items feed the implementation plan. This is the comprehensive project-quality evaluation for greenfield/init — Build & CI scalability, architecture pattern (modular monolith vs. microservices / distributed-monolith avoidance), module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction/easy-to-change, clean architecture, and observability/DevOps. Brownfield or day-to-day audits invoke the same skill on demand via `/architecture-scalability-review mode=audit`; it is intentionally NOT a member of the every-change `workflow-review-changes` batch — that batch's `architecture-review` step carries the lightweight per-change scalability & coupling regression check instead.

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Do not infer a trimmed variant or skip gates that the selected manifest does not authorize.

---

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

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. For every potentially applicable tier — Unit, Integration/System, E2E, and Performance/Scale (warranted at `T1+`/`B2+`) — record `APPLICABLE` only with evidence of its runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage.
>
> 1. **Matrix before implementation:** Record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple/Windows entry point (a `.cmd` when the project needs one), the **host-mode AND container-mode commands** where the project supports both, and the **environment reach** (which of local / CI / production-shaped this tier can target).
> 1a. **E2E profile handoff:** For E2E, also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields remain explicit blockers or N/A; they are never filled from generic browser defaults.
> 2. **Runnable scopes:** Full and focused commands must be copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and be safe to repeat. E2E uses only configured browser/service commands. Before every browser/UI E2E operation on a UI control, use the canonical bounded `waitUntil(condition, options)` helper for readiness/actionability and applicable blocking error-alert absence; after the operation, use it for the expected positive/negative postcondition or error-alert state, then wait exactly **500ms** at the end. The delay is presentation pacing, never a readiness or settle mechanism, and applies to automation as well as visible human-QC.
> 2a. **E2E object-model gate (when E2E is applicable):** Build and reuse a three-tier test object model — **Common components** for cross-feature controls, **Domain-Shared components** for reusable domain behavior, and **Page components/objects** for page-specific composition. Each object records its tier, owner, and base abstraction.
> 2b. **E2E abstraction and DRY gate:** Use an idiomatic abstract base class or language-equivalent protocol/trait for shared lifecycle, locator, readiness, and pacing behavior; centralize purpose-specific utilities/helpers for data, auth, and evidence; keep assertions in tests. Reuse or compose existing objects before creating new ones, keep one canonical owner for each selector/action/wait, and treat duplicated wrappers or setup as a finding; extract at 3+ similar implementations.
> 2c. **E2E test layering:** Test a reusable Common or Domain-Shared component contract once, then let Page tests cover page-specific composition and outcomes; do not copy lower-tier component cases into every Page test.
> 2d. **E2E wait-until gate:** The object model MUST expose or compose one reusable `waitUntil(condition, options)` utility accepting a positive or negative boolean/async predicate, bounded timeout/poll settings, and a diagnostic description. Before each action wait for a ready/actionable control and the applicable error-free precondition; after each action wait for the expected state transition, dropdown/options visibility, selected state, or expected error-alert presence/absence. Keep the final business assertion in the test and fail with the wait diagnostics on timeout.
> 3. **Fresh valid state:** Each run/test owns a unique run identity and business-data suffix, arranges through supported public paths, and uses realistic valid data. Reference setup is count-before-create, idempotent, and restart-safe. Intentional accumulation is additive, keyed, and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it may remove only ephemeral resources owned by the current run; it must never delete persistent/additive data or another run's data, reset shared state, or replace no-reset proof.
> 4. **Isolation and fidelity:** Isolate mutable roots and parallel workers; share only immutable/reference data. Preserve real actor pacing and observable arrange barriers. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** Report command, scope, identity, seed/accumulation mode, exact result, and repeat proof. For each applicable persistent-state suite, require two consecutive no-reset full runs. Treat line coverage as diagnostic only; use meaningful property/invariant, mutation, change, and behavior coverage signals.
> 6. **Execution modes and environment reach:** A tier claiming two run modes must have **BOTH exercised** — the bare-host command and the fully-containerized command, driven from ONE source of truth for config and topology; record which mode CI exercises, because an unexercised mode rots silently and a claimed-but-rotten mode is worse than one never claimed. The SAME suite must reach local, CI and (where warranted) a production-shaped target, **parameterized by configuration, never by forked test code** — only one fork ever stays maintained, so forking guarantees divergence. A target lacking a required capability reports `ENVIRONMENT-BLOCKED`, never a silent pass. Tests unsafe against production are excluded by an **ENFORCED** mechanism whose absence fails loudly, not by a convention someone must remember; *"runs in prod"* means a safe, declared, **NON-MUTATING** subset. Reproducibility underwrites all of it — pinned toolchain, locked dependencies, declared external prerequisites — which is the difference between a suite that passes anywhere and one that passes on its author's machine. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

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

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Before implementation, record evidence-backed Unit/Integration/System/E2E **and Performance/Scale** (`T1+`/`B2+`) applicability (or explicit N/A), copy-ready full + focused commands, zero-match behavior, a simple/Windows entry point, **the host-mode AND container-mode commands where both are supported, plus each tier's environment reach (local / CI / production-shaped)**, unique run identity, realistic valid data, idempotent/restart-safe reference setup, intentional additive accumulation, parallel isolation, exact results, and two no-reset full runs for each applicable persistent-state suite. **Both claimed run modes must be EXERCISED** (an unexercised mode rots; a claimed-but-rotten mode is worse than one never claimed), the same suite reaches every target **parameterized by config, never by forked test code**, a missing capability reports `ENVIRONMENT-BLOCKED` rather than passing silently, and *"runs in prod"* means a safe, declared, **NON-MUTATING** subset excluded by an enforced mechanism, not by convention. For applicable browser/UI E2E, every UI-control operation also uses the canonical bounded `waitUntil(condition, options)` helper before the action for readiness/actionability and applicable error-alert absence, then after the action for the expected positive/negative state, dropdown/options, selected state, or error-alert presence/absence, followed by the mandatory post-operation **500ms** presentation delay. The object model still requires three-tier Common/Domain-Shared/Page reuse with an idiomatic abstract base, cohesive helpers/utilities, and reusable lower-tier component tests.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Complete greenfield inception from an owner-approved capability boundary—using embedded large-idea decomposition when triggered, or an explicit roadmap only when requested—through a releasable first vertical outcome, reviewed enabling foundation, test architecture contract, implementation, integration verification, conditional E2E evaluation, final full/focused verification, and handoff without skipping gates.
**IMPORTANT MUST ATTENTION Main steps:** classify/decompose → research → domain/tech/architecture + test contract → scenario/plan/review → PBI/story/mock-up/spec gates → scaffold/lint/harness/architecture review → implementation/integration verification → conditional E2E → final full/focused verification → final review/security/test/docs/handoff.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/releasable-pbi-contract.md`: no standalone technical/foundation/setup PBI; UI PBIs must include all required pages/views, navigation, components, states, and a connected mock-app demo.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested, one task `in_progress`.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Incremental Persistence:** append findings to `tmp/reports/` per file, never hold in memory.
- **Sub-Agent Return Contract:** return summary only (≤10 bullets), full detail to disk.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
