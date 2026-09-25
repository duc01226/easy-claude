---
name: spec-clarify
version: 2.0.0
description: '[Code Quality] Use when a workflow step or the user asks for spec decisions to be validated with the user. Covers a canonical spec or declared test-case artifact; blocks on unresolved intent.'
context-budget: medium
---

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
- **Main steps (read-this-if-nothing-else — run in order, never skip/merge):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs (artifact, `spec-discovery` landscape, originating idea, domain-analysis), flag any missing as a finding → Step 1 completeness pass vs the discovered SYSTEM (cross-ref, implied coverage, profile-owned cases/invariants, UI interaction surface) → Step 2 category-driven hypothesis/decision audit — walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply confirmed decisions to the artifact + Decisions Log → Step 6 validate own findings via `/why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED.
- Runs in the validation slot of its flow — AFTER the artifact exists (and, for AUTHORED, after `/artifact-review` checks it in isolation against the artifact-facing mandates (M1-M5 + M7) and `/why-review` checks rationale). This skill adds the two things neither does: completeness-vs-the-discovered-system, and a BLOCKING user-confirmation loop on every non-obvious decision.
- It is NOT a duplicate of `artifact-review`: that one judges the artifact against itself (sections present, ACs testable, M1-M5 + M7 clean). `spec-clarify` judges it against the SYSTEM (does it reflect every related spec, every existing invariant, every operation the idea implies) and against the USER (are the encoded assumptions actually what the user wants).
- **Exhaustive within a budget:** walk EVERY applicable validation category (per the matrix), classify every assumption/default/scope-boundary/ambiguity the artifact encodes as **OBVIOUS** (document and proceed), **NON-OBVIOUS** (must confirm with the user), or **CONFLICTS** (disagrees with a discovered spec or invariant → must reconcile), then route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to a configured `Spec Validation: questions=MIN-MAX` budget (per-context defaults when absent). NEVER silently pick a NON-OBVIOUS decision — the whole value is the active question; the budget (not "ask only a few") is the fatigue control.
- Runs INLINE on the main agent (NOT a sub-agent): the Step 4 clarification gate is a BLOCKING `AskUserQuestion` loop, and `AskUserQuestion` only works on the main interactive agent — a sub-agent cannot ask the user. Before applying confirmed decisions, validate this skill's OWN findings through the terminal `/why-review --validate-findings` gate, at parity with the other review-family skills.

**Workflow:**

0. **Phase 0 — Profile and Spec-Context Detection** — resolve profile, then detect `AUTHORED-SPEC` / `EXISTING-SPEC` / separately declared `TEST-SPEC` and question budget; ambiguous context → blocking user confirmation or `BLOCKED` if unavailable
1. **Completeness pass** — cross-reference the artifact against the discovered system landscape (per-context emphasis); find missing outcomes, requirements, profile-owned cases, and uncovered invariants
2. **Hypothesis & decision audit (category-driven)** — walk every applicable category in `references/clarify-interview.md`; enumerate and classify every encoded assumption as OBVIOUS / NON-OBVIOUS / CONFLICTS
3. **Brainstorm open questions** — questions whose answers would change the artifact + a pre-mortem
4. **Clarification gate** — BLOCKING `AskUserQuestion` on NON-OBVIOUS + CONFLICTS + high-impact items, exhaustive within the MIN-MAX budget (≤4/call, recommended-first)
5. **Apply** — write confirmed decisions back into the artifact + a Decisions Log
6. **Report + verdict** — CLARIFIED or NEEDS-AUTHORING-FIX, after validating own findings

**Key Rules:**

- Resolve the artifact profile, then detect validation context FIRST (Phase 0); it tunes which declared roles/categories are audited and the question budget. Ambiguous → blocking confirmation or `BLOCKED` if unavailable.
- Completeness is judged against the SYSTEM, not the artifact alone — every related/affected behavior must be reflected.
- Walk EVERY applicable category (breadth is mandatory); route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to the configured/default budget. The budget — not "surface only a few" — is the fatigue control.
- NON-OBVIOUS and CONFLICTS decisions MUST go to the user; only OBVIOUS decisions are documented-and-proceeded.
- Runs INLINE (no `execution-mode: subagent`) because the clarification gate needs `AskUserQuestion`, which requires the main interactive agent.
- This complements — never duplicates — `artifact-review` (isolation / M1-M5 + M7) and `why-review` (rationale).

## Artifact and Case Profile Gate (BLOCKING)

Before context detection, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec references, the active workflow, and the matched clarification references. Resolve exactly one:

- **Strict default:** neither config nor required project references explicitly declares a native artifact/case contract. Use the eight-section / Section 8 TC rules below.
- **Native profile:** config or a required project reference explicitly declares a different canonical owner, section/field roles, logical IDs, case carrier, or case-to-test relation. A missing optional profile field in config does not erase an explicit owner contract in a required reference. MUST ATTENTION use that profile's owner, roles, IDs, and evidence form without adding a TC or Section 8 copy.
- **Unresolved:** invalid/incomplete config, conflicting references, or an unresolved owner/section/carrier means `BLOCKED`/`UNKNOWN`; do not infer the strict default from a filename, heading, or missing optional config field.

A root/template/filename change alone does not select a native model. After profile selection, detect context from active workflow plus the profile's declared artifact roles and provisional markers. In strict default, retain the §1-8/provisional rules below. A native case embedded in a canonical owner is `EXISTING-SPEC` unless the profile explicitly declares a separate test-spec artifact; only a separately owned artifact may be `TEST-SPEC`.

The semantic duties do not change: completeness against the discovered system; evidence for every gap; property and boundary coverage for universal invariants; preservation of existing behavior; business visibility where applicable; and confirmation of every non-obvious/conflicting decision before applying it. Previous user acceptance may be reused only with cited evidence that the exact decision and scope match; it never authorizes new or adjacent decisions.

Step 4 remains blocking. When a non-obvious decision, profile ambiguity, or conflict needs the user and `AskUserQuestion` is unavailable, the environment is unattended, or no user answer can be obtained, MUST ATTENTION preserve the unresolved questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER mutate the artifact, infer a choice, or emit `CLARIFIED`. This skill stays inline for interactive confirmation; no routing or prior approval waives the active decision gate.

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
| `why-review`                     | the RATIONALE of its decisions | PASS / NEEDS-WORK + validated findings   | Only to escalate (`AskUserQuestion`) |
| `spec-clarify` (this skill)      | the SYSTEM + the USER — completeness vs discovered landscape, confirmed decisions | CLARIFIED / NEEDS-AUTHORING-FIX | **YES — blocking gate on every non-obvious decision** |

**Why not just extend `artifact-review`?** Self-review cannot ask the user, and adding a blocking interactive gate to a skill designed to run as a fresh sub-agent breaks the sub-agent contract (a sub-agent cannot run `AskUserQuestion`). The completeness-vs-system pass and the human-confirmation loop need a distinct, inline invocation point.

## Alternatives Considered

| Approach                                                                 | Pros                                                             | Cons                                                                                                            | Decision                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Add a "completeness + confirm" phase to `artifact-review --type=spec-tests` | No new skill; one place to maintain                             | `artifact-review` runs fresh sub-agents for re-review; a sub-agent cannot run `AskUserQuestion`, so the confirm loop is impossible there | Rejected — the blocking user gate is structurally incompatible with the sub-agent re-review model |
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
| **Question fatigue** — the widened, category-driven audit asks too many questions                  | Medium     | Medium | The configured `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) is the hard cap; ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler; ≤4 options per `AskUserQuestion` call; recommended option first. Only NON-OBVIOUS + CONFLICTS + high-impact items become questions — breadth of *probing* is exhaustive, breadth of *asking* is budget-bounded |
| **Context mis-detection** — Phase 0 picks the wrong context and audits the wrong sections          | Medium     | High   | Resolve profile-owned roles plus active workflow/provisional state; ambiguous → blocking user confirmation, or `BLOCKED` if no user/tool is available |
| **Unvalidated findings applied** — AI rewrites a canonical owner from a phantom completeness gap | Medium     | High   | Step 6 runs `/why-review --validate-findings` on this skill's own findings BEFORE applying any decision          |
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
2. **The `spec-discovery` landscape report** — `{plan-dir}/research/spec-discovery-{slug}.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) (Related Specs, Related Code, Affected Specs, Gaps, Invariant Landscape, Open Questions), the investigation of related/overlapping/affected specs + code. This is the baseline against which completeness is judged. For `TEST-SPEC` the landscape also comes from `spec-discovery` (present in the `idea-to-pbi` deep-mode sequence). If it is absent (skill run standalone), fall back to `/investigate` plus the derived `/spec-index` artifacts (index / ERD / reimplementation guide) under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), and flag the absence as a finding.
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
5. **Apply** — write only the user's confirmed decisions to the selected canonical owner/fields and record them in an **"Open Questions / Decisions Log"** with rationale and residual confidence. For `AUTHORED-SPEC`/`EXISTING-SPEC`, material owner changes go through its declared authoring procedure, then Step 1 runs again. In the strict default, use `/spec [mode=update]`; for `TEST-SPEC`, apply only through its explicitly declared owner/workflow. This skill itself never re-authors an `EXISTING-SPEC`.
6. **Report + verdict** — before applying decisions, run `/why-review --validate-findings <report-path>` on THIS skill's own findings (validate-before-fix discipline, at parity with `artifact-review` / `plan-review`); fix/drop any finding the gate flags, then apply only validated decisions. Write the report to `tmp/reports/spec-clarify-{date}.md` and emit a verdict:
    - **CLARIFIED** — every NON-OBVIOUS/CONFLICTS decision confirmed by the user, completeness gaps resolved or accepted, no residual blocking question.
    - **NEEDS-AUTHORING-FIX** — a material completeness gap or unreconciled conflict needs correction by the selected owner's declared authoring procedure before finalization; the strict default uses `/spec [mode=update]`.
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
- **Runs INLINE, not as a sub-agent** — the clarification gate needs `AskUserQuestion`, which only the main interactive agent can run; do NOT add `execution-mode: subagent`.
- **Complements, never duplicates** — `artifact-review` owns isolation/M1-M5 + M7, `why-review` owns rationale; cross-check each universal invariant against the profile-owned case and defer detailed property/case quality to `artifact-review --type=spec-tests`.
- **Validate before applying** — run `/why-review --validate-findings` on this skill's own findings before updating any canonical owner.
- **Evidence-based** — every completeness gap, classification, and conflict cites `file:line` / a spec section / an invariant ref with a confidence percentage.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including a final review task to verify completeness and that every non-obvious decision was confirmed.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `fresh-context-review` — Restart the full review in isolated sub-agents after fixes to avoid confirmation bias; re-reviewing after a fix cycle → .claude/skills/shared/protocols/fresh-context-review.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

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

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

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

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Finalize the selected canonical owner or separately declared case artifact only after reflecting every related behavior/invariant from the discovered system and user-confirming every encoded NON-OBVIOUS or CONFLICTING decision through an exhaustive, budget-bounded blocking clarification gate.

**IMPORTANT MUST ATTENTION Main steps (do NOT skip, reorder, or collapse the loop):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs, flag missing as findings → Step 1 completeness pass vs the SYSTEM → Step 2 walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply only confirmed decisions + Decisions Log through the owner's procedure → Step 6 validate findings via `/why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED — why: the audit→classify→ask→validate sequence prevents silent assumptions and unattended sessions cannot authorize decisions.

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
**IMPORTANT MUST ATTENTION** this skill runs INLINE on the main agent (no `execution-mode: subagent`) — the gate needs `AskUserQuestion`, which only the main interactive agent can run; a sub-agent cannot ask the user — why: a blocking confirmation loop is structurally impossible in an isolated sub-agent.
**IMPORTANT MUST ATTENTION** before applying any decision, validate this skill's OWN findings via `/why-review --validate-findings <report-path>`, then apply only confirmed, validated decisions through the owner procedure and re-run Step 1 — why: rewriting canonical intent from a phantom gap is worse than the gap.
**IMPORTANT MUST ATTENTION** complement, never duplicate — cross-check universal invariant → profile-owned property-case existence only; defer quantified property and boundary-case quality to `artifact-review --type=spec-tests` — why: re-running that audit here drifts this skill into overlap and wastes the budget.
**IMPORTANT MUST ATTENTION** cite `file:line` / spec-section / invariant evidence for every completeness gap, classification, and conflict with a confidence percentage (>80% to act, <60% DO NOT recommend); "Insufficient evidence" is valid output — why: speculation produces non-fixable findings and false conflicts.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; keep one `in_progress`; add a final review task to verify every non-obvious decision was confirmed — why: untracked multi-step work loses state on compaction.

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
| "Findings are clearly right, apply them now"     | Validate via `/why-review --validate-findings` and get required user confirmation BEFORE changing the canonical owner — a phantom gap rewrites intent wrongly. |

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM + confirm every NON-OBVIOUS / CONFLICTS decision with the user — the distinct value vs isolation review.
**IMPORTANT MUST ATTENTION** the clarification gate is a BLOCKING `AskUserQuestion` loop; runs INLINE on the main agent — if the user/tool cannot answer, preserve open questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER silently pick a non-obvious decision.
**IMPORTANT MUST ATTENTION** validate own findings via `/why-review --validate-findings` before applying; cite `file:line`/section evidence with confidence for every claim.
