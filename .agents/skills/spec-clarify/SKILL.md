---
name: spec-clarify
description: '[Code Quality] Use when validating a canonical specification or separately declared test-case artifact''s decisions with the user. Resolves project artifact profile and blocks on unresolved intent.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
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

**Situation-based docs:**
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `configured styling reference`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Finalize the selected canonical artifact or separately governed case artifact only after reflecting every related behavior/invariant from the discovered system and user-confirming every encoded NON-OBVIOUS or CONFLICTING decision through an exhaustive, budget-bounded blocking clarification gate.

**Summary:**

- **Context-aware (Phase 0):** resolves the project artifact profile first, then detects `AUTHORED-SPEC`, `EXISTING-SPEC`, or `TEST-SPEC` from that profile's canonical roles, provisional markers, and active workflow. `TEST-SPEC` exists only when the selected profile has a separate test-spec artifact; native cases inside a canonical owner remain in that owner's context. The detection precedence + ambiguity gate are in Phase 0; the category catalog + per-context audit matrix live in `references/clarify-interview.md`.
- **Main steps (read-this-if-nothing-else — run in order, never skip/merge):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs (artifact, `spec-discovery` landscape, originating idea, domain-analysis), flag any missing as a finding → Step 1 completeness pass vs the discovered SYSTEM (cross-ref, implied coverage, profile-owned cases/invariants, UI interaction surface) → Step 2 category-driven hypothesis/decision audit — walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply confirmed decisions to the artifact + Decisions Log → Step 6 validate own findings via `$why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED.
- Runs in the validation slot of its flow — AFTER the artifact exists (and, for AUTHORED, after `$artifact-review` checks it in isolation against the artifact-facing mandates (M1-M5 + M7) and `$why-review` checks rationale). This skill adds the two things neither does: completeness-vs-the-discovered-system, and a BLOCKING user-confirmation loop on every non-obvious decision.
- It is NOT a duplicate of `artifact-review`: that one judges the artifact against itself (sections present, ACs testable, M1-M5 + M7 clean). `spec-clarify` judges it against the SYSTEM (does it reflect every related spec, every existing invariant, every operation the idea implies) and against the USER (are the encoded assumptions actually what the user wants).
- **Exhaustive within a budget:** walk EVERY applicable validation category (per the matrix), classify every assumption/default/scope-boundary/ambiguity the artifact encodes as **OBVIOUS** (document and proceed), **NON-OBVIOUS** (must confirm with the user), or **CONFLICTS** (disagrees with a discovered spec or invariant → must reconcile), then route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to a configured `Spec Validation: questions=MIN-MAX` budget (per-context defaults when absent). NEVER silently pick a NON-OBVIOUS decision — the whole value is the active question; the budget (not "ask only a few") is the fatigue control.
- Runs INLINE on the main agent (NOT a sub-agent): the Step 4 clarification gate is a BLOCKING ask the user directly loop, and ask the user directly only works on the main interactive agent — a sub-agent cannot ask the user. Before applying confirmed decisions, validate this skill's OWN findings through the terminal `$why-review --validate-findings` gate, at parity with the other review-family skills.

**Workflow:**

0. **Phase 0 — Profile and Spec-Context Detection** — resolve profile, then detect `AUTHORED-SPEC` / `EXISTING-SPEC` / separately declared `TEST-SPEC` and question budget; ambiguous context → blocking user confirmation or `BLOCKED` if unavailable
1. **Completeness pass** — cross-reference the artifact against the discovered system landscape (per-context emphasis); find missing outcomes, requirements, profile-owned cases, and uncovered invariants
2. **Hypothesis & decision audit (category-driven)** — walk every applicable category in `references/clarify-interview.md`; enumerate and classify every encoded assumption as OBVIOUS / NON-OBVIOUS / CONFLICTS
3. **Brainstorm open questions** — questions whose answers would change the artifact + a pre-mortem
4. **Clarification gate** — BLOCKING ask the user directly on NON-OBVIOUS + CONFLICTS + high-impact items, exhaustive within the MIN-MAX budget (≤4/call, recommended-first)
5. **Apply** — write confirmed decisions back into the artifact + a Decisions Log
6. **Report + verdict** — CLARIFIED or NEEDS-AUTHORING-FIX, after validating own findings

**Key Rules:**

- Resolve the artifact profile, then detect validation context FIRST (Phase 0); it tunes which declared roles/categories are audited and the question budget. Ambiguous → blocking confirmation or `BLOCKED` if unavailable.
- Completeness is judged against the SYSTEM, not the artifact alone — every related/affected behavior must be reflected.
- Walk EVERY applicable category (breadth is mandatory); route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to the configured/default budget. The budget — not "surface only a few" — is the fatigue control.
- NON-OBVIOUS and CONFLICTS decisions MUST go to the user; only OBVIOUS decisions are documented-and-proceeded.
- Runs INLINE (no `execution-mode: subagent`) because the clarification gate needs ask the user directly, which requires the main interactive agent.
- This complements — never duplicates — `artifact-review` (isolation / M1-M5 + M7) and `why-review` (rationale).

## Artifact and Case Profile Gate (BLOCKING)

Before context detection, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec references, the active workflow, and the matched clarification references. Resolve exactly one:

- **Strict default:** neither config nor required project references explicitly declares a native artifact/case contract. Use the eight-section / Section 8 TC rules below.
- **Native profile:** config or a required project reference explicitly declares a different canonical owner, section/field roles, logical IDs, case carrier, or case-to-test relation. A missing optional profile field in config does not erase an explicit owner contract in a required reference. MUST ATTENTION use that profile's owner, roles, IDs, and evidence form without adding a TC or Section 8 copy.
- **Unresolved:** invalid/incomplete config, conflicting references, or an unresolved owner/section/carrier means `BLOCKED`/`UNKNOWN`; do not infer the strict default from a filename, heading, or missing optional config field.

A root/template/filename change alone does not select a native model. After profile selection, detect context from active workflow plus the profile's declared artifact roles and provisional markers. In strict default, retain the §1-8/provisional rules below. A native case embedded in a canonical owner is `EXISTING-SPEC` unless the profile explicitly declares a separate test-spec artifact; only a separately owned artifact may be `TEST-SPEC`.

The semantic duties do not change: completeness against the discovered system; evidence for every gap; property and boundary coverage for universal invariants; preservation of existing behavior; business visibility where applicable; and confirmation of every non-obvious/conflicting decision before applying it. Previous user acceptance may be reused only with cited evidence that the exact decision and scope match; it never authorizes new or adjacent decisions.

Step 4 remains blocking. When a non-obvious decision, profile ambiguity, or conflict needs the user and ask the user directly is unavailable, the environment is unattended, or no user answer can be obtained, MUST ATTENTION preserve the unresolved questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER mutate the artifact, infer a choice, or emit `CLARIFIED`. This skill stays inline for interactive confirmation; no routing or prior approval waives the active decision gate.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

A Feature Spec can be internally perfect — all 8 sections present, every AC testable, every prose line tech-agnostic — and still be WRONG, because:

1. It silently omits a related behavior the discovered system already owns (a spec that doesn't reflect an adjacent capability's invariant ships a contradiction).
2. It encodes a default, scope boundary, or ambiguous behavior that the AUTHOR picked but the USER never confirmed (the most expensive specs fail not on what they said, but on what they assumed without asking).
3. It leaves open questions whose answers would materially change §1-8 — and nobody surfaced them before code started.

`artifact-review --type=spec-tests` and `--type=design` check the spec **in isolation** against the artifact-facing mandates (M1-M5 + M7 — M6 binds the reviewer, not the artifact) and an adversarial section-quality checklist. `why-review` checks the **rationale** of decisions already made. Neither one (a) cross-references the spec against the broader discovered system, nor (b) actively ASKS THE USER to confirm the non-obvious choices. `spec-clarify` is the gate that does both — completeness-vs-system plus a blocking human-confirmation loop — so the spec is finalized confirmed, not merely well-formed.

**Delineation from sibling skills (so reviewers see NO duplication):**

| Skill                            | Judges the spec against… | Output                                   | Asks the user?                  |
| -------------------------------- | ------------------------ | ---------------------------------------- | ------------------------------- |
| `artifact-review --type=spec-tests` / `--type=design` | ITSELF — artifact-facing mandates (M1-M5 + M7), AC testability, adversarial section quality | PASS / WARN / FAIL | No (AI self-review)            |
| `why-review`                     | the RATIONALE of its decisions | PASS / NEEDS-WORK + validated findings   | Only to escalate (ask the user directly) |
| `spec-clarify` (this skill)      | the SYSTEM + the USER — completeness vs discovered landscape, confirmed decisions | CLARIFIED / NEEDS-AUTHORING-FIX | **YES — blocking gate on every non-obvious decision** |

**Why not just extend `artifact-review`?** Self-review cannot ask the user, and adding a blocking interactive gate to a skill designed to run as a fresh sub-agent breaks the sub-agent contract (a sub-agent cannot run ask the user directly). The completeness-vs-system pass and the human-confirmation loop need a distinct, inline invocation point.

## Alternatives Considered

| Approach                                                                 | Pros                                                             | Cons                                                                                                            | Decision                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Add a "completeness + confirm" phase to `artifact-review --type=spec-tests` | No new skill; one place to maintain                             | `artifact-review` runs fresh sub-agents for re-review; a sub-agent cannot run ask the user directly, so the confirm loop is impossible there | Rejected — the blocking user gate is structurally incompatible with the sub-agent re-review model |
| Fold the open-questions brainstorm into `why-review`                     | `why-review` already does adversarial rationale work            | `why-review` validates decisions already MADE; it does not surface decisions the author never realized they made, nor confirm them with the user | Rejected — different purpose (rationale of made decisions vs surfacing+confirming unmade ones)    |
| Fully autonomous — AI resolves every ambiguity by best-guess, no user gate | Fastest; no human round-trip                                    | Automation bias: a silently-picked NON-OBVIOUS default ships a spec the user never agreed to; the failure surfaces only in code | Rejected — the cost of a wrong silent default exceeds one confirmation round                      |
| Run BEFORE authoring instead of after                                    | Catches gaps earlier                                            | Before authoring there is no concrete artifact to audit for hypotheses/conflicts; the assumptions are not yet encoded | Rejected — this gate operates on a CONCRETE artifact; earlier discovery is `investigate`/`spec-discovery`'s job |
| A separate `spec-validate` skill (mirroring `plan-validate`) per flow      | Clean single-purpose per context                                | +1 skill per context = SYNC-carrier + mirror + catalog drift; duplicates this skill's completeness-vs-system engine three times | Rejected — the three contexts share ONE core (audit a concrete artifact vs system + user); a Phase-0 branch over one skill is the lower future-change-cost choice |
| Keep the single AUTHORED context + minimal gate                            | Smallest skill                                                  | Fails the two PBI flows (spec-to-pbi has NO spec-decision gate; idea-to-pbi has only plan/PBI gates) and the "ask a lot of questions / all important aspects" intent | Rejected — leaves the exact gaps this upgrade exists to close |

## Risk Assessment

| Risk                                                                                       | Likelihood | Impact | Mitigation                                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| **Silent decision** — AI classifies a NON-OBVIOUS choice as OBVIOUS to avoid asking        | High       | High   | Step 2 forces an explicit OBVIOUS/NON-OBVIOUS/CONFLICTS label per item; the Anti-Rationalization table rebuts "it's obvious"; ambiguity defaults to NON-OBVIOUS |
| **Overlap creep** — drifts into re-checking M1-M5 + M7 / AC testability and duplicates `artifact-review` | Medium     | Medium | Scope is fixed to completeness-vs-system + confirmation; profile-owned invariant-to-case coverage is a CROSS-CHECK only — the detailed property/case quality audit is deferred to `artifact-review --type=spec-tests` |
| **Question fatigue** — the widened, category-driven audit asks too many questions                  | Medium     | Medium | The configured `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) is the hard cap; ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler; ≤4 options per ask the user directly call; recommended option first. Only NON-OBVIOUS + CONFLICTS + high-impact items become questions — breadth of *probing* is exhaustive, breadth of *asking* is budget-bounded |
| **Context mis-detection** — Phase 0 picks the wrong context and audits the wrong sections          | Medium     | High   | Resolve profile-owned roles plus active workflow/provisional state; ambiguous → blocking user confirmation, or `BLOCKED` if no user/tool is available |
| **Unvalidated findings applied** — AI rewrites a canonical owner from a phantom completeness gap | Medium     | High   | Step 6 runs `$why-review --validate-findings` on this skill's own findings BEFORE applying any decision          |
| **Stale landscape** — the discovered-system report is outdated, so completeness is judged against a wrong baseline | Low        | Medium | Step 0 verifies the discovery inputs exist and are current; a missing/stale landscape is itself a NEEDS-AUTHORING-FIX finding |

## Phase 0: Profile and Spec-Context Detection (run FIRST)

Resolve the profile in the blocking gate above, then detect WHICH artifact is being validated — the context tunes which declared sections/categories are audited and the question budget. The full per-context audit matrix + category catalog live in [`references/clarify-interview.md`](./references/clarify-interview.md).

| Context | Signals | Artifact under validation | Audit emphasis |
| --- | --- | --- | --- |
| `AUTHORED-SPEC` | active authoring workflow; selected profile's provisional marker/state; canonical owner has its declared authored roles | the provisional canonical owner | all applicable declared roles |
| `EXISTING-SPEC` | active decomposition/review workflow; canonical owner is not provisional under its declared state | the existing canonical owner | all applicable roles, weighted to decomposition-driving decisions and cases |
| `TEST-SPEC` | active workflow and selected profile explicitly define a separate test-spec artifact; no provisional canonical draft is being validated | the separate test-spec artifact plus its required idea inputs | case decisions, implied rules, and the owning requirements |

**Strict-default detection:** full §1-8 + `provisional: true` → `AUTHORED-SPEC`; full §1-8 + NOT provisional → `EXISTING-SPEC`; only §8 / refined idea (no §1-7 draft) → `TEST-SPEC`. **Native detection:** use the profile's owner roles, provisional marker, separate-artifact declaration, and active workflow. A native case embedded in the owner does not become `TEST-SPEC` by itself. If workflow and artifact evidence disagree or context remains ambiguous, ask the user before auditing; if user confirmation is unavailable, return `BLOCKED`/`NEEDS-CLARIFICATION` and do not proceed.

**Question budget:** read the injected `Spec Validation: questions=MIN-MAX` line (workflow `injectContext` supplies it per flow). When absent (standalone run), fall back to the per-context defaults in `references/clarify-interview.md` — `AUTHORED-SPEC` 5-10, `EXISTING-SPEC` 4-8, `TEST-SPEC` 3-6. The budget bounds the Step 4 gate: ask ≥MIN when ≥MIN genuine decisions exist, never exceed MAX.

State `Profile: {STRICT-DEFAULT | NATIVE | BLOCKED} | Context: {AUTHORED-SPEC | EXISTING-SPEC | TEST-SPEC} | Budget: {MIN-MAX} (injected | default)` before Step 0.

## Inputs (Step 0)

Resolve and confirm these inputs exist BEFORE the completeness pass. A missing input is a finding, not a reason to guess.

1. **The artifact under validation** — `AUTHORED-SPEC` / `EXISTING-SPEC` → the selected canonical owner and its declared roles; `TEST-SPEC` → a separately declared test-spec artifact and its source owner/idea inputs. The strict default uses the full §1-8 Feature Spec and §8 `TC-{FEATURE}-{NNN}` set. Read the configured feature/spec-system/principles references first; config's root paths locate them but do not alone define the case model.
2. **The `spec-discovery` landscape report** — `{plan-dir}/research/spec-discovery-{slug}.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) (Related Specs, Related Code, Affected Specs, Gaps, Invariant Landscape, Open Questions), the investigation of related/overlapping/affected specs + code. This is the baseline against which completeness is judged. For `TEST-SPEC` the landscape also comes from `spec-discovery` (present in the `idea-to-pbi` deep-mode sequence). If it is absent (skill run standalone), fall back to `$investigate` plus the derived `$spec-index` artifacts (index / ERD / reimplementation guide) under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), and flag the absence as a finding.
3. **The originating idea / brainstorm** — the requirement that the artifact is meant to satisfy; its implied operations and edge cases drive the missing-coverage check.
4. **The domain-analysis output** — bounded contexts, aggregates, entities, domain events, and the invariants the artifact must respect.

State `Inputs resolved: ... | Missing (flag as finding): ...` before Step 1.

## Workflow

Run **Phase 0 (Spec-Context Detection)** above first — it sets the context + budget that the steps below consume.

0. **Inputs** — resolve the four inputs above (artifact resolved per the detected context); flag any missing one as a finding.
1. **Completeness pass (vs system)** — judge the artifact against the discovered landscape, NOT against itself, weighting the sections the context emphasizes (see the per-context matrix in `references/clarify-interview.md`):
    - **Cross-reference completeness** — every related/affected spec from the landscape is reflected (a behavior the system already owns and this feature touches must appear, or its absence must be deliberate and noted). For `TEST-SPEC`, judge the separate artifact and its owner contract against the landscape.
    - **Implied coverage** — missing user stories / acceptance criteria / business rules the originating idea implies but the artifact omits.
    - **Case-coverage completeness** — missing canonical cases for implied operations and edge cases (presence/scope only). Strict default checks §8 TCs; native profile checks its declared case carrier without adding a parallel registry.
    - **Invariant coverage** — every NEEDED invariant (this feature must establish) AND every EXISTING invariant the artifact must respect (from domain-analysis / adjacent owners) is captured; each universal hard rule maps to the selected profile's property/invariant case. This is a CROSS-CHECK that the case exists — defer property quantification and boundary counter-case quality to `artifact-review --type=spec-tests`.
    - **Interaction surface completeness (UI-bearing specs)** — judge the selected profile's declared interaction fields against the implied UI. Strict default uses §6.2 view inventory, §6.3 navigation, §6.4 observable states, §6.5 story flows, plus the §6 skip reason for backend-only features. Presence/scope only — visual fidelity stays in the companion design artifact.
2. **Hypothesis & decision audit (category-driven)** — walk EVERY applicable category for the detected context (the 9-category catalog + per-context matrix in [`references/clarify-interview.md`](./references/clarify-interview.md)); for each, run its audit prompts to surface every assumption, default value, scope boundary, and ambiguous behavior the artifact encodes. Classify each:
    - **OBVIOUS** — a single reasonable reading any competent reader shares → document it in the Decisions Log and proceed.
    - **NON-OBVIOUS** — more than one defensible reading, or a default the user has not confirmed → candidate for the Step 4 gate.
    - **CONFLICTS** — disagrees with a discovered landscape spec or an existing invariant → MUST be reconciled (and surfaced to the user). Default to NON-OBVIOUS when the classification itself is unclear.
    Probing breadth is exhaustive (every applicable category); asking breadth is the budget.
3. **Brainstorm open questions** — questions whose answers would MATERIALLY change the artifact (scope, a default, an invariant boundary, an actor/permission). Run an adversarial **pre-mortem**: "this artifact ships and the feature fails in production within 3 months — what spec gap caused it?" Each pre-mortem failure that maps to a real gap becomes either a NON-OBVIOUS question or a completeness finding.
    > **Interaction Surface category (UI-bearing specs):** use the selected profile's interaction roles; strict default checks §6.2–§6.5. Treat ambiguous view purpose, missing observable state, and unmapped user flow as gate candidates. Classify each OBVIOUS / NON-OBVIOUS / CONFLICTS like any other; route NON-OBVIOUS + CONFLICTS to the gate within budget. Ask about UX intent only — never framework/route/CSS/component-class detail (that belongs to the companion design artifact).

4. **Clarification gate (BLOCKING user-confirmation tool)** — present the NON-OBVIOUS + CONFLICTS + high-impact items to the user as structured options, **exhaustive within the MIN-MAX budget** from Phase 0: ask ≥MIN questions when ≥MIN genuine decisions exist, never exceed MAX, ≤4 options per call, the recommended option FIRST, issue multiple calls when there are more than 4 decisions. When fewer than MIN genuine decisions exist, ask only the genuine ones and record "below-MIN: only N real decisions" — NEVER invent filler. Capture each answer. If the tool/user is unavailable, preserve the questions and stop `BLOCKED`/`NEEDS-CLARIFICATION`; do not apply, infer, or emit `CLARIFIED`.
5. **Apply** — write only the user's confirmed decisions to the selected canonical owner/fields and record them in an **"Open Questions / Decisions Log"** with rationale and residual confidence. For `AUTHORED-SPEC`/`EXISTING-SPEC`, material owner changes go through its declared authoring procedure, then Step 1 runs again. In the strict default, use `$spec [mode=update]`; for `TEST-SPEC`, apply only through its explicitly declared owner/workflow. This skill itself never re-authors an `EXISTING-SPEC`.
6. **Report + verdict** — before applying decisions, run `$why-review --validate-findings <report-path>` on THIS skill's own findings (validate-before-fix discipline, at parity with `artifact-review` / `plan-review`); fix/drop any finding the gate flags, then apply only validated decisions. Write the report to `tmp/reports/spec-clarify-{date}.md` and emit a verdict:
    - **CLARIFIED** — every NON-OBVIOUS/CONFLICTS decision confirmed by the user, completeness gaps resolved or accepted, no residual blocking question.
    - **NEEDS-AUTHORING-FIX** — a material completeness gap or unreconciled conflict needs correction by the selected owner's declared authoring procedure before finalization; the strict default uses `$spec [mode=update]`.
    - **BLOCKED / NEEDS-CLARIFICATION** — a profile, owner, material decision, or required user answer remains unresolved. No mutation or `CLARIFIED` verdict is permitted.

## Output

```markdown
## Spec Clarification Report

**Spec:** {spec path}
**Date:** {date}
**Profile:** STRICT-DEFAULT | NATIVE | BLOCKED
**Context:** AUTHORED-SPEC | EXISTING-SPEC | TEST-SPEC
**Verdict:** CLARIFIED | NEEDS-AUTHORING-FIX | BLOCKED / NEEDS-CLARIFICATION
**Confidence:** {X%} — {what was verified vs. what remains residual}

### Completeness (vs discovered system)

| Area                          | Status        | Gap / Evidence (`file:line` or spec/section ref)            |
| ----------------------------- | ------------- | ----------------------------------------------------------- |
| Related/affected specs reflected | ✅/❌        | {which related behavior is/ isn't reflected}                |
| Implied stories / AC / rules  | ✅/❌          | {missing item the idea implies}                             |
| Canonical case coverage vs operations | ✅/❌ | {owner/case/variant missing for an operation or edge case; strict default: §8 TC} |
| Invariant coverage (needed + existing) | ✅/❌ | {universal rule without its profile-owned property case, or existing invariant not respected} |

### Hypothesis & Decision Audit

| # | Encoded assumption / default / boundary | Class (OBVIOUS / NON-OBVIOUS / CONFLICTS) | Evidence |
| - | --------------------------------------- | ----------------------------------------- | -------- |
| 1 | {assumption}                            | {class}                                   | {ref}    |

### Open Questions (pre-mortem + materially-changing)

1. {question — what changes in the selected canonical owner depending on the answer}

### Decisions Log

| Decision | User's confirmed choice | Applied to | Residual confidence |
| -------- | ----------------------- | ---------- | ------------------- |
| {non-obvious decision} | {user-confirmed answer} | {owner section/field} | {>=80% / <80% residual} |

### Verdict

{CLARIFIED | NEEDS-AUTHORING-FIX | BLOCKED / NEEDS-CLARIFICATION} — {evidence-based justification; name the owning procedure for any required correction}
```

## Key Rules

- **Resolve profile, then detect context (Phase 0)** — use the selected owner's roles, identifiers, and provisional markers; `TEST-SPEC` exists only when separately declared. Ambiguous → blocking user confirmation or `BLOCKED` if unavailable.
- **Walk every applicable category, ask within the budget** — probing breadth is exhaustive (the 9-category catalog × the per-context matrix in `references/clarify-interview.md`); the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) caps how many reach the gate. Never invent filler to hit MIN; never exceed MAX.
- **Completeness is judged against the SYSTEM** — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted. The artifact passing in isolation is NOT enough.
- **NON-OBVIOUS and CONFLICTS go to the user** — only OBVIOUS decisions are documented-and-proceeded; ambiguity in the classification itself defaults to NON-OBVIOUS.
- **NEVER silently pick a non-obvious decision** — the blocking user-confirmation gate is the entire value of this skill; no user/tool response means `BLOCKED`/`NEEDS-CLARIFICATION` with no mutation.
- **Runs INLINE, not as a sub-agent** — the clarification gate needs ask the user directly, which only the main interactive agent can run; do NOT add `execution-mode: subagent`.
- **Complements, never duplicates** — `artifact-review` owns isolation/M1-M5 + M7, `why-review` owns rationale; cross-check each universal invariant against the profile-owned case and defer detailed property/case quality to `artifact-review --type=spec-tests`.
- **Validate before applying** — run `$why-review --validate-findings` on this skill's own findings before updating any canonical owner.
- **Evidence-based** — every completeness gap, classification, and conflict cites `file:line` / a spec section / an invariant ref with a confidence percentage.

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including a final review task to verify completeness and that every non-obvious decision was confirmed.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] /skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate (static JIT)** — Run after task-tracking bootstrap and immediately before target/source file reads, grep, edits, tests, or analysis. Project docs override generic framework assumptions; hooks may remind or accelerate this gate, but never prove that it ran.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read the configured project-config file first, if it exists.** Resolve its path through the project-config loader (default `docs/project-config.json`). **The project config is OPTIONAL: a project with no config is a supported, first-class state, not an error.** When it is absent, run on the framework's portable defaults and derive project facts (paths, run commands, conventions, architecture, test and spec layout) from repository evidence — manifests, lockfiles, scripts, CI definitions, directory layout, root instruction files — stating the assumption whenever one is material; do not block, and do not demand a bootstrap route before ordinary work. When it IS present, the minimum valid shape has a non-empty `project.name`; omitted optional capability properties use neutral defaults or skip that capability. A section its author DECLARED but left malformed or incomplete is a configuration error: fail closed on that section and run `$project-init` or `$project-config` before relying on it, because silently substituting defaults would present wrong project facts as authoritative. Use valid config for the adopter's paths, commands, architecture, specs, tests, and workflows, then verify material hints against repository evidence; never assume generic defaults are project facts.
> 3. **Always-on vs task-specific references:** Project initialization owns and ensures the project's `lessons.md` and docs-index inputs at their configured owner paths. Read them under the static project-context contract independently of task-specific `referenceDocs`; do not append them to that selection. For task-specific docs, when the configured `referenceDocs` property is an array, follow it exactly, including subsets and `[]`. When absent, use the runtime capability-aware resolver: its portable baseline plus only configuration- or repository-evidenced capabilities; a minimal project with no capability evidence may resolve to an empty task-specific set. The full scan-target manifest is a registry of metadata/aliases, not a default selection. Resolve configured paths using `docsRoots.projectReference.path` when present (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A custom reference doc declares `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Built-in filenames keep their exact framework-owned target; other custom docs default to manual ownership, while `scanTarget: "generic"` opts one exact selected file into evidence-based scanning. Manual docs are not freshness-tracked or impact-routed. Never infer a target by basename; config and runtime path resolution reject lexical traversal and physical symlink escapes.
> 4. Read selected task-specific docs just in time before target work, then state: `Reference docs read: ... | Not applicable: ...`; an explicit empty selection means no task-specific docs are selected by the catalog. Still honor separately required references named by the active skill or task. An absent project config is not a missing doc: proceed on repository evidence and, at most, OFFER `$project-init` or `$project-config` as an optional one-time recording of those facts. If an always-on input or a selected/otherwise required doc is missing or stale, or a declared config section is malformed, use `$project-init` or the narrow owner route (`$project-config`, `$docs-init`, `$scan --target=<key>`, `$ai-context-refresh`) before relying on that input. If Codex mirrors are stale, use the explicit `$sync-codex` route or its documented `$ai-context-refresh` completion handoff for the active source-authoring task. After compaction, resume, delegation, or material context change, repeat selection and reading; prior conversation and hook output are not proof of current loading.
>
> **Ready when:** scope evaluated, the configured project-config file consulted or its absence recorded and the portable-defaults fallback applied, root always-on inputs are confirmed (completing project initialization if they are missing or stale), the declared task-specific `referenceDocs` selection is applied exactly or, when absent, the runtime capability-aware resolver output is applied (which may be empty), selected docs are read or an explicit empty selection is recorded, and the citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists and the task concerns code relationships.
> 4. Map affected dependencies and callers with available repository tools; do not block on an absent graph or unsupported tool.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable. A report-only/read-only reviewer never edits source, generated output, or user data: it validates and records the finding/repair handoff, then returns to the caller, which owns the fix and any re-review.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** After a validated-finding fix cycle, or to satisfy an explicitly declared independent-pass `minRounds`. A review round that finds zero issues ENDS the loop once that persisted minimum is met — do NOT invent a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `tmp/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues AND the persisted `minRounds` is met (no fixes or required independent pass = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **round 1** → zero findings at any severity; **round 2 (and the conditional round 3)** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop once the persisted minimum is met (list those LOWs as deferred instead of spawning another round). The budget is 2 rounds plus ONE extension to round 3, granted only when round 2 leaves a validated CRITICAL/HIGH open (a failed non-test binary gate counts as CRITICAL); round 3 is the review hard cap. A failing test gate is not budgeted — keep fixing and re-running until the tests pass. If the same validated blocker repeats across 2 full invocations with no progress, escalate by asking the user directly. **Read-only/report-only role boundary:** when this block is carried by a security auditor or another report-only role, “fix” means return the validated repair proposal to the parent; do not modify source, generated carriers, or user data and do not restart the review locally.
> - Persist completed rounds, repeated blockers, findings and the explicit minimum in the owning run's `review-policy.cjs` record. Resume that record after interruption; target changes invalidate evidence and acceptance but preserve the bounded round budget. In-flight attempt IDs may be session-local; they do not replace or reset completed-round state

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE and unmodified. They are the review-tier renderings of their canonical `SYNC:` tags, not literal copies; when a canonical protocol changes, update the matching body here in the same edit. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone. Read `docs/project-config.json` and resolve `specArtifacts`: a valid profile selects its configured `intent/contracts/evidence` section roles, identifiers, ownership rule, and test-carrier dialects; only an absent profile selects the strict-default business-spec shape (§3 ACs / §4 BRs / §5 invariants / §8 TCs). A malformed or unsupported declaration is `BLOCKED`; never treat it as absent or fall back. Load the governing artifact, its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the canonical owner section(s), the tests that guard them, and the production code that implements them. With a native profile, preserve owner path + case/scenario ID + optional variant and resolve each through its configured carrier to the actual test. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no configured `intent/contracts` rule (or strict-default §3/§4/§5/§8 rule) describes → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: a configured native case with no executing assertion, or a test asserting behavior no native rule/case names → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding, added to the profile's configured `intent` or `contracts` section, and linked from its `evidence` section to a native case whose executing assertion is inspected. Without a profile, use strict-default §3/§4/§5/§8 and TC. This is the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Priority checks for every code change:
1. Consistency and reuse: follow documented local patterns; extract a shared abstraction only when repetition or a demonstrated consumer need justifies its cost. Similar names alone do not require a shared base class.
2. Responsibility: follow the architecture established by project configuration, references, accepted decisions, and existing code. Place behavior with its actual owner; do not presume an entity/service/controller hierarchy or forbid a layer without project evidence.
3. Apply cohesion, coupling, and dependency-management principles when their assumptions fit the project's paradigm. SOLID is useful for object-oriented boundaries, not a mandatory checklist for every language or codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: Treat repeated patterns as evidence to evaluate extraction, not a numeric threshold. Extract when a shared reason to change, real consumers, or an evidenced ownership/substitution boundary lowers total change cost; do not create patterns for hypothetical future use.
6. Purpose-oriented naming: Name public or cross-layer abstractions by the capability, domain purpose, or contract consumers rely on—not the current provider, SDK, framework, database, or transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit check: Read callers and every implementation before judging a name; narrow an over-broad abstraction (`IObjectStore`, `DocumentStore`) instead of rewarding a generic name that lies about behavior.
8. Mechanism/generic-name smell: Treat `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations, and unexplained abbreviations as review signals—not automatic defects; flag them only when they hide purpose, scope, or responsibility.
9. Concrete implementation names: Provider, strategy, transport, or test-double names are valid on concrete types when they distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); keep those details out of the caller-facing contract unless the contract promises them.
10. Language convention: Preserve local interface syntax and naming style; `.NET` `I` prefixes and Google TypeScript's unmarked interfaces are both valid local conventions.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Do not assume the crash site owns the defect. Trace the actual execution and data flow, then fix the component that owns the violated contract.
MANDATORY before ANY fix:
1. Trace the affected path — map the real origin, transformations, boundaries, and observed failure in the surfaces this project uses. Do not invent absent layers.
2. Identify the contract owner — use project architecture and code evidence to find which component is responsible for the invalid state or behavior.
3. Choose the correction point — fix the authoritative owner and retain any validation required at untrusted boundaries. A multi-file correction can be valid; justify it by the contracts each file owns rather than a file-count threshold.
4. Check bypass paths — inspect relevant constructors, adapters, parsers, caches, persistence, or other entry points that actually exist in the affected flow.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
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
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

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
> | LOW | Record and defer; never open another fix/re-review round from round 2 onward, and never counts toward the round-3 extension | Non-blocking polish with no credible present correctness, security, privacy, authority, availability, or data-integrity impact: wording/formatting, minor documentation or convention drift, optional defensive cleanup, or a cosmetic/refinement suggestion. |
>
> **Consequence decision tree (apply in order):** (1) Is a binary gate failed? Keep it as a separate hard blocker (the executable helper represents it as synthetic CRITICAL); do not use the ordinary severity label to hide what failed. Otherwise, would shipping permit immediate material security/safety/authority harm, irreversible destruction, data loss/corruption, or a critical-path silent failure? → **CRITICAL**. (2) Otherwise, does a supported path, invariant, public contract, privacy/authority boundary, compatibility promise, or behavior-changing proof fail with material user/downstream impact? → **HIGH**. (3) Otherwise, is there a bounded but consequential edge, resilience, observability, testability, maintainability, or architectural gap with a credible impact? → **MEDIUM**. (4) Otherwise, is the evidence sufficient to show only non-blocking polish with no credible present material impact? → **LOW**. (5) If the evidence needed to choose between steps 1–4 is missing, → **NOT VERIFIABLE**, not LOW. When multiple tiers fit, select the highest credible consequence; effort, implementation cost, reviewer discomfort, frequency alone, proximity to the round cap, and whether a tier would unlock or forfeit the conditional round-3 extension never decide the tier.
>
> **Boundary examples (normalize before applying the round predicate):** an auth bypass, exposed secret/PII, destructive command without an authority gate, or failed required test/generation/parity gate is **CRITICAL**; a wrong supported response, broken invariant/API/schema, meaningful privacy/authority defect, or unproven behavior-changing fix is **HIGH**; a bounded retry/timeout/alert/testability gap or credible maintainability drift is **MEDIUM**; a typo, formatting inconsistency, optional cleanup, or cosmetic suggestion proven not to affect present behavior is **LOW**. A missing fact about any of those boundaries is **NOT VERIFIABLE** until evidence or an explicitly documented residual-risk decision exists.
>
> **Classification procedure (required for every finding):** (1) state the affected user, system, data, contract, or gate; (2) assess consequence if the issue ships; (3) assess exposure/likelihood and reversibility/detectability; (4) select the highest tier justified by those facts; (5) cite `file:line` or equivalent evidence and a confidence percentage. Effort, implementation cost, reviewer discomfort, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is a pending evidence state, not one of the four tiers and never a LOW escape hatch: if the unresolved claim could affect required behavior, security, privacy, authority, availability, data integrity, or a binary gate, it remains an open evidence blocker until resolved or explicitly owner-accepted with documented residual risk. Classify an item LOW only when evidence supports the absence of credible present material impact.
>
> **Hard-gate rule:** Binary gates (tests, required artifacts, security must-fix checks, generated parity, policy compliance) are not ordinary severity-rated findings. The executable helper records a failed gate as a synthetic CRITICAL blocker solely so one predicate can carry it; the report must still name the gate and failure evidence. A failed gate blocks at every round, including when all ordinary findings are LOW; never disguise a failed gate as LOW. A failed non-test gate counts as CRITICAL for the round-3 extension; a failing test gate is outside the round budget and loops until the tests pass.
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
> A finding's tier drives the gate: CRITICAL/HIGH/MEDIUM remain actionable and blocking under the round policy, and only an open CRITICAL/HIGH at round 2 (a failed non-test binary gate counts as CRITICAL) unlocks the single conditional extension round; LOW may be tracked as a follow-up and, from round 2, does not by itself justify another fix/re-review. An owner decision may explain or schedule an open MEDIUM but does not turn it into a clean pass; owner acceptance never makes a failed binary gate pass and must record scope, rationale, and residual risk.

<!-- /SYNC:severity-rubric -->


<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code/conventions BEFORE any modification or explanation. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before project-specific work, load the OPTIONAL project-config (default `docs/project-config.json`) via its loader. No config is supported — fall back to portable defaults plus repository evidence, state material assumptions, never block. When present: require non-empty `project.name`, use neutral defaults/skips for omitted optional capabilities, and fail closed on a declared malformed section.
- **MANDATORY** Apply an explicit `referenceDocs` array exactly, including `[]`; when absent use only the capability-aware resolver output, which may be empty. Cite `Reference docs read: ...` and note the selected or empty set.
- **MANDATORY** Load detail JUST IN TIME, immediately before the first target read/grep/edit/test — a hook event or a prior turn is NEVER evidence that the current files were read. Re-resolve selection and re-read after compaction, resume, delegation, or a context change.
- **MANDATORY** The project-init-owned `lessons.md` and docs-index inputs are always-on at their configured owner paths, read independently of task-specific `referenceDocs`. A missing/stale root instruction file or required reference doc, or a malformed declared config section → auto-run `$project-init` (or the narrow lower-level route) before relying on that input. An absent config never gates work — offer `$project-init` or `$project-config` once. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] /skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `tmp/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Finalize the selected canonical owner or separately declared case artifact only after reflecting every related behavior/invariant from the discovered system and user-confirming every encoded NON-OBVIOUS or CONFLICTING decision through an exhaustive, budget-bounded blocking clarification gate.

**IMPORTANT MUST ATTENTION Main steps (do NOT skip, reorder, or collapse the loop):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs, flag missing as findings → Step 1 completeness pass vs the SYSTEM → Step 2 walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply only confirmed decisions + Decisions Log through the owner's procedure → Step 6 validate findings via `$why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED — why: the audit→classify→ask→validate sequence prevents silent assumptions and unattended sessions cannot authorize decisions.

**Protocols in force — MUST ATTENTION honor every block below (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Parent workflow rows never replace child phase tracking.
- **Project Reference Docs Guide:** Read required project docs (always `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist clarification findings to `tmp/reports/`.
- **Critical Thinking Mindset:** Traced `file:line` proof; confidence >80% to act.
- **Evidence Based Reasoning:** No claim without cited evidence; state confidence.
- **Understand Code First:** Read code, grep 3+ patterns before any change.
- **Fresh Context Review:** Validate findings, fix only current-round blocking findings, and restart the full review until the severity bar is clear (Round 1: zero findings; Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred); spawn a fresh zero-memory sub-agent after each fix cycle (re-review only — this skill itself runs inline).
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in any fresh sub-agent prompt.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** Classify findings Critical/High/Medium/Low by consequence.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM, not the spec alone — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted; this is the distinct value vs `artifact-review`'s isolation check — why: a spec that passes in isolation can still silently contradict an adjacent capability's invariant.
**IMPORTANT MUST ATTENTION** classify every encoded assumption/default/scope-boundary/ambiguity as OBVIOUS / NON-OBVIOUS / CONFLICTS — NON-OBVIOUS and CONFLICTS MUST go to the user gate; only OBVIOUS is documented-and-proceeded; ambiguity in the class itself defaults to NON-OBVIOUS — why: a silently-picked default ships a spec the user never agreed to.
**IMPORTANT MUST ATTENTION** resolve the configured/native artifact profile FIRST, then detect `AUTHORED-SPEC` / `EXISTING-SPEC` / separately declared `TEST-SPEC` from owner roles, provisional state, and active workflow; ambiguous or unavailable user confirmation → `BLOCKED`/`NEEDS-CLARIFICATION`, no mutation — why: the wrong context audits the wrong owner and unattended execution cannot confirm intent.
**IMPORTANT MUST ATTENTION** probe EVERY applicable category (the 9-category catalog × per-context matrix in `references/clarify-interview.md`) but ask only within the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) — ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler, never exceed MAX — why: breadth of probing catches every gap; the budget is the fatigue control, not "ask only a few".
**IMPORTANT MUST ATTENTION** the Step 4 user-confirmation gate is BLOCKING — present NON-OBVIOUS + CONFLICTS + high-impact items as ≤4 structured options (recommended first), issue multiple calls as needed, NEVER silently pick a non-obvious decision; if no user/tool response is available, preserve questions and return `BLOCKED`/`NEEDS-CLARIFICATION` — why: unanswered intent cannot authorize artifact mutation.
**IMPORTANT MUST ATTENTION** this skill runs INLINE on the main agent (no `execution-mode: subagent`) — the gate needs ask the user directly, which only the main interactive agent can run; a sub-agent cannot ask the user — why: a blocking confirmation loop is structurally impossible in an isolated sub-agent.
**IMPORTANT MUST ATTENTION** before applying any decision, validate this skill's OWN findings via `$why-review --validate-findings <report-path>`, then apply only confirmed, validated decisions through the owner procedure and re-run Step 1 — why: rewriting canonical intent from a phantom gap is worse than the gap.
**IMPORTANT MUST ATTENTION** complement, never duplicate — cross-check universal invariant → profile-owned property-case existence only; defer quantified property and boundary-case quality to `artifact-review --type=spec-tests` — why: re-running that audit here drifts this skill into overlap and wastes the budget.
**IMPORTANT MUST ATTENTION** cite `file:line` / spec-section / invariant evidence for every completeness gap, classification, and conflict with a confidence percentage (>80% to act, <60% DO NOT recommend); "Insufficient evidence" is valid output — why: speculation produces non-fixable findings and false conflicts.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; keep one `in_progress`; add a final review task to verify every non-obvious decision was confirmed — why: untracked multi-step work loses state on compaction.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "`artifact-review` already passed, skip this"    | That was isolation / M1-M5 + M7 / AC testability. It never checked completeness-vs-system or confirmed decisions with the user. Different gate. |
| "It's a spec, so audit the full §1-8"            | Resolve the profile first. Only the strict default uses §1-8; native profiles use their declared roles. `TEST-SPEC` must be separately declared. Auditing the wrong sections wastes the budget. |
| "Only ask a couple of the most important questions" | Probing is exhaustive across every applicable category; *asking* is bounded by the `questions=MIN-MAX` budget. Surfacing only a few SKIPS categories — that is the gap this upgrade closed. Walk all, ask up to MAX. |
| "Fewer than MIN real decisions, so invent some to hit MIN" | NEVER invent filler. Ask only the genuine decisions and record "below-MIN: only N real decisions". MIN is a floor for *real* questions, not a quota. |
| "The decision is obvious, I'll just document it" | If it is truly OBVIOUS (one reading any reader shares), document it. NON-OBVIOUS / CONFLICTS MUST go to the user gate — when unsure, it is NON-OBVIOUS. |
| "No open questions, the spec is complete"        | Run the pre-mortem FIRST ("ships, fails in 3 months — what spec gap caused it?") before claiming none. |
| "The user is unavailable; I'll assume the likely answer" | An unanswered NON-OBVIOUS choice stays unresolved. Return `BLOCKED`/`NEEDS-CLARIFICATION`; do not mutate or claim `CLARIFIED`. |
| "The conflict is minor, I'll reconcile it silently" | A CONFLICT with a discovered spec/invariant changes behavior — surface it AND confirm the resolution with the user. |
| "Findings are clearly right, apply them now"     | Validate via `$why-review --validate-findings` and get required user confirmation BEFORE changing the canonical owner — a phantom gap rewrites intent wrongly. |

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM + confirm every NON-OBVIOUS / CONFLICTS decision with the user — the distinct value vs isolation review.
**IMPORTANT MUST ATTENTION** the clarification gate is a BLOCKING ask the user directly loop; runs INLINE on the main agent — if the user/tool cannot answer, preserve open questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER silently pick a non-obvious decision.
**IMPORTANT MUST ATTENTION** validate own findings via `$why-review --validate-findings` before applying; cite `file:line`/section evidence with confidence for every claim.

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
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, and state). Verify each against evidence, not intuition. Ask "what would falsify this?" — if nothing, it is not a hypothesis. The most expensive failure is going deeper into an assumed area while the real issue sits in an unexamined condition.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem; avoid unrelated cleanup. For review or enhancement work, announce improvements beyond the main request rather than silently expanding scope. Ask: "Would this change exist if I were not addressing this request?" — if not, remove it or disclose it.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before deep tracing and before any verdict, sweep environment preconditions (toolchain/dependency/lockfile state, stale build or cache artifacts, env vars and config profile, service dependencies up-migrated-seeded, ports/network/clock, OS-path/locale, permissions and locks, leftover processes/containers/test data) AND transient resource pressure (RAM/OOM, CPU saturation under parallel workers, disk/temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness). Tell-tale shape: non-deterministic, timing-dependent, passes alone but fails in parallel, fails only on one machine or only on CI, or an error naming resources rather than business rules. Cite the discriminator you ran (clean environment? did code on the failing path change since it last passed? one machine or all? concurrency 1 or a clean rebuild?) — a verdict without one is a guess, for code as much as for the environment. Fix an environment cause in the environment or setup; NEVER edit product code or weaken/skip a test to absorb it, and a failure that vanishes on retry stays unexplained until its mechanism is named. — why: forcing green against an environment fault hides the real defect and permanently rots the test.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral Node APIs and literal argv vectors; never infer shell, temporary-path, executable-extension, ACL, or symlink semantics from the current host. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
