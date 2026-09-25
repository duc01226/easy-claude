---
name: pbi-challenge
version: 1.0.0
description: '[Code Quality] Use when a workflow step or the user asks for a Dev BA PIC review of PBI drafts. Runs an AI-assisted challenge of each draft.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **AI-SDD Artifact Contract** — M1-M7 are hard gates: M1/M2 keep implementation identifiers in evidence carriers; M3 requires logical IDs plus abstract anchors; M4/M5 require unambiguous, rebuildable behavior; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate definitions and carrier rules.

> **Releasable PBI Contract** — One PBI names one actor-facing outcome with a complete entry → result → exit journey, visible/persisted truth, applicable access/error/recovery behavior, and evidence; UI PBIs require connected pages/views, navigation, components, states, and demo flow; technical work stays enabling work.
> MUST ATTENTION READ `.claude/skills/shared/releasable-pbi-contract.md` for the full outcome and full-flow contract.

## Quick Summary

**Goal:** Help a Dev BA PIC challenge a BA drafter's PBI before grooming, surfacing evidence-backed feasibility, AC, authorization, cross-service, M1-M7, releasable-outcome, and full-flow gaps so no infeasible or under-specified PBI reaches grooming as a false APPROVE; AI analyzes, human decides.

**Summary:**

- **Purpose:** CROSS-PERSON review: a different Dev BA PIC challenges the BA drafter's PBI; NEVER review your own draft—use `/artifact-review --type=pbi`. — why: external skepticism breaks confirmation bias.
- **Pipeline (8, in order):** (1) locate PBI → (2) detect + **confirm module via `AskUserQuestion` before domain docs** → (3) Technical Feasibility → (4) AC Quality + M1-M7 → (5) Cross-Cutting Concerns (auth/seed/migration/performance/UI Layout + releasable/full-flow surface) → (6) generate SPECIFIC challenge prompts with suggested answers → (7) Challenge Prompts FIRST, then AI Verdict → (8) human records final decision via `AskUserQuestion`.
- **Blocking gates:** Any M1-M5 or M7 failure forces `REQUEST_REVISION` with mandate ID + exact section/line/AC; missing releasable outcome or full-flow surface also forces `REQUEST_REVISION`.
- **Decision:** AI provides analysis; human decides via `AskUserQuestion`. Verdicts: `APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`; technical veto is unilateral, non-technical decisions require 2/3 BA vote; Next Steps remains user-routed.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

Informal PBI review misses architecture feasibility, vague AC, auth, and cross-service gaps. `/refine` creates PBIs; `/artifact-review --type=pbi` self-reviews and leaves drafter blind spots. This skill gives a different Dev BA PIC specific, evidence-backed challenges before grooming.

## Alternatives Considered

| Approach                                                                      | Pros                                                                     | Cons                                                                                                                | Decision                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Extend `/artifact-review --type=pbi` with a reviewer-role flag                             | No new skill, single codebase                                            | Drafter runs it themselves in practice; role separation breaks down without enforcement                             | Rejected — role separation requires a distinct invocation point owned by a different person      |
| Fully autonomous AI verdict (no human decision)                               | Faster, no Dev BA PIC scheduling needed                                  | Automation bias: AI wrong on domain specifics propagates unchecked; no human accountability for false APPROVE       | Rejected — cost of false APPROVE on infeasible PBIs exceeds review time saved                    |
| Static DoR checklist given to Dev BA PIC (no AI)                              | Simple, no AI dependency                                                 | No domain entity context loading, no AC vagueness flagging; manual effort is high and inconsistent across reviewers | Rejected — AI domain lookup provides non-trivial value for cross-service entity detection        |
| Async comment-thread model (AI generates questions posted as ticket comments) | Eliminates scheduling bottleneck; drafter can research before responding | Slower feedback loop; requires external ticket integration                                                          | Valid alternative for async teams; prefer if Dev BA PIC availability is chronically a bottleneck |

## Risk Assessment

| Risk                                                                                                                 | Likelihood | Impact | Mitigation                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Automation bias** — Dev BA PIC rubber-stamps AI verdict without independent assessment                             | High       | High   | Workflow Step 7 shows challenge prompts BEFORE the verdict — Dev BA PIC forms their own view first                       |
| **Module misdetection** — AI loads wrong domain context, produces entity conflict analysis for wrong service         | Medium     | High   | Workflow Step 2 confirms detected module with Dev BA PIC via AskUserQuestion before proceeding                           |
| **Challenge prompts ignored** — Drafter revises PBI superficially to satisfy reviewer without resolving root gaps    | Medium     | Medium | Decision Record includes drafter-response field; Dev BA PIC re-runs skill on revision, not just reads revised PBI        |
| **Suggested answers create adoption pressure** — Drafter adopts suggested answer rather than reasoning independently | Medium     | Medium | Suggested answers framed as "consider whether X" options, not corrections; language review in challenge prompt templates |
| **3-way BA vote deadlock** — UX BA, Designer BA, Dev BA PIC all disagree                                             | Low        | Medium | Escalation path per `ba-team-decision-model`: Engineering Manager for tech uncertainty, PO for business value            |

### Frontend/UI Context (if applicable)

For frontend/UI changes, read — every filename below resolves inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

## Workflow

1. **Locate PBI draft** — Find BA drafter's draft in `pbis/` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) or the user-provided path.
2. **Load domain context** — Auto-detect module from PBI content. **MANDATORY: Use `AskUserQuestion` to confirm the module with the Dev BA PIC before loading domain docs.** Wrong module = wrong entity context = false APPROVE risk. Then load:
    - `domain-entities-reference.md` in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — entity definitions
    - Relevant feature docs from `{App}/` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path)
    - Existing business rules (BR-{MOD}-XXX) from feature docs
3. **Technical Feasibility Analysis:**
     - Can the described feature fit the project architecture?
     - Any domain entity conflicts? Cross-reference entity definitions.
     - Any cross-service implications? Check message-bus events and shared data.
     - Does estimated complexity align with story points?

4. **AC Quality Analysis:**
     - Vagueness detector: flag "should", "might", "TBD", "etc.", "various", "appropriate".
     - Coverage: happy path + edge case + error case + authorization scenario.
     - Missing scenarios: suggest specific additions for the feature type.
5. **Cross-Cutting Concerns Check:**
     - Authorization section complete? Use roles × CRUD matrix.
     - Seed data addressed, or explicit "N/A"?
     - Data migration implications? Check schema changes.
     - Performance considerations for list/grid/export features?
     - **Releasable outcome and full flow present?** Name the actor-facing result, entry → action → result → exit journey, visible/persisted truth, applicable access/recovery behavior, and no standalone technical/foundation/setup scope.
     - **UI Layout/full-flow surface present?** UI PBIs need `## UI Layout` per UI wireframe protocol with required pages/views, navigation map, common/domain/page components, states, and connected mock-app journey. Backend-only needs explicit "N/A" plus observable no-UI reason. Flag isolated screens or missing UI visualization.
6. **Generate Challenge Prompts** — Output specific, actionable questions with suggested answers. Never write only "needs work" or "improve AC"; e.g., "AC #2 says 'user can filter results' — which filters? Suggest: status, date range, priority."
7. **Present Challenge Prompts first, then AI Verdict** — Show prompts BEFORE the verdict so the Dev BA PIC forms an independent view, then show `APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`.
     - **Technical decisions** (feasibility, dependencies, cross-service impact, security): Dev BA PIC has unilateral veto power; no 2/3 vote.
     - **Non-technical decisions** (UI/UX, visual design, business value): require 2/3 majority (Dev BA PIC + UX BA + Designer BA per `ba-team-decision-model`).
8. **AskUserQuestion** — Dev BA PIC records the FINAL decision (`APPROVE` / `REQUEST_REVISION` / `ESCALATE_TO_LEAD`) in the Decision Record. This is human decision, not Next Steps routing.

## M1-M7 Compliance Gate (BLOCKING — drives the AI Verdict)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". This challenge enforces M6: a PBI draft that violates any of M1-M5 or M7 MUST produce an AI Verdict of REQUEST_REVISION with a challenge prompt that names the violated mandate ID and cites the exact PBI section + line/AC. An APPROVE over an M1-M5 or M7 violation is itself defective. (AI provides the analysis; the human still records the final decision.)
>
> **M1 governs vocabulary; M7 governs subject matter.** A technical case written in impeccably tech-free prose satisfies M1 while violating M7 — that gap is the most common way business specs rot. A clean M1 pass is NEVER evidence of an M7 pass; challenge both.
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `CoveredBy:` fields, legacy `**IntegrationTest:**` migration fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only challenge leakage in PBI narrative prose (problem statement, AC text, scope, rule descriptions). Banned prose token list: `spec-principles.md` §3.2, in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).

Run these six checks as part of Step 4 (AC Quality) and Step 5 (Cross-Cutting Concerns); any failure becomes a specific challenge prompt and forces REQUEST_REVISION:

- **MUST ATTENTION M1 — Tech-agnostic prose.** FAIL if problem statement, AC, or rule prose names framework/product, language-native type, or product/design-pattern class name (banned list `spec-principles.md` §3.2). Challenge: cite section + leaked token + business-term replacement. — why: stack-named prose locks the PBI to one implementation.
- **MUST ATTENTION M2 — No source code in prose.** FAIL if requirement expressed as class/method/file-path/namespace instead of business operation. Source identifiers belong only in evidence carriers. Challenge: cite section + line.
- **MUST ATTENTION M3 — Abstract-IDs-first.** FAIL if requirement/rule lacks logical ID (`FR-/BR-/OP-`), has logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, uses physical code coordinates or repository-root paths instead of abstract anchor, or makes anchor its primary citation. Evidence REQUIRED and KEPT, but SECONDARY to logical ID (physical coordinates live only in provenance sidecar).
- **MUST ATTENTION M4 — Unambiguous AC.** FAIL if any AC uses vague language ("should", "might", "appropriate", "various", "as needed"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists. (Extends Step-4 vagueness detector to M4 verdict.)
- **MUST ATTENTION M5 — Implementable from artifact alone.** FAIL if competent team with ZERO codebase knowledge could not build PBI on different stack from PBI alone (relies on reading source to understand it). Challenge: cite section + missing detail.
- **MUST ATTENTION M7 — Business-visibility.** Apply the demo test to each case's BODY: _"what would a stakeholder SEE change?"_ — no answer → FAIL as TECHNICAL-ONLY and force REQUEST_REVISION. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count. Judge the BODY, never the title or ID. Challenge: cite section + the offending `Given`/`When`/`Then` + a demoable rewrite to consider. — why: a technical case in business clothing ships an un-demoable AC to grooming.

If ANY check fails → AI Verdict is REQUEST_REVISION; tag each violated mandate ID with its concrete section/line citation in the Challenge Prompts and the AI Verdict Reason.

## Output

```markdown
## PBI Challenge Review

**PBI:** {PBI filename}
**Reviewer:** Dev BA PIC
**Date:** {date}
**Module:** {detected module code}

### Technical Feasibility

**Status:** FEASIBLE | CONCERNS | INFEASIBLE
{Analysis with evidence — cite domain entities, service boundaries, architecture constraints}

### AC Quality

**Status:** GOOD | NEEDS_REVISION | POOR

| AC # | Issue            | Suggested Fix             |
| ---- | ---------------- | ------------------------- |
| {#}  | {specific issue} | {specific fix suggestion} |

### Cross-Cutting Concerns

| Concern        | Status    | Issue    |
| -------------- | --------- | -------- |
| Authorization  | ✅/❌     | {detail} |
| Seed Data      | ✅/❌/N/A | {detail} |
| Data Migration | ✅/❌/N/A | {detail} |
| Performance    | ✅/❌/N/A | {detail} |

### Releasable Outcome and Full-Flow Surface

| Check | Status | Evidence / Challenge |
| ----- | ------ | -------------------- |
| Actor-facing outcome and complete entry → result → exit journey | ✅/❌ | {detail} |
| No standalone technical/foundation/setup/migration outcome | ✅/❌ | {detail} |
| UI page/view inventory + navigation + common/domain/page components + applicable states + connected mock-app demo | ✅/❌/N/A | {detail or explicit backend-only reason} |

### Challenge Prompts for BA Drafters

1. {Specific actionable question with suggested answer}
2. {Specific actionable question with suggested answer}
3. {Specific actionable question with suggested answer}

### AI Verdict

**{APPROVE | REQUEST_REVISION | ESCALATE_TO_LEAD}**
**Reason:** {evidence-based justification}
**Confidence:** {X%} — {what was verified vs. what needs more investigation}

### Decision Record

**Dev BA PIC Decision:** {filled after human review via AskUserQuestion}
**Vote:** {approve / request-revision / escalate}
**Conditions:** {if any}
**Drafter Response (on revision):** {drafter's response to each challenge prompt — filled when Dev BA PIC re-runs on revised PBI}
**Resolution:** {how each challenge prompt was addressed, deferred, or accepted as known risk}
**Stored at:** `tmp/reports/pbi-challenge-{YYMMDD}-{pbi-id}.md` (save output there for audit trail)
```

## Key Rules

- **AI provides ANALYSIS, human makes DECISION** — Never auto-approve or auto-reject
- **Challenge prompts must be specific** — Include suggested answers, not just questions
- **Domain context required** — Always load entity reference + feature docs before analysis
- **Technical veto scope** — Dev BA PIC CAN veto: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value (see `ba-team-decision-model-protocol.md` §2)
- **Evidence-based** — Every concern raised must cite source (protocol section, entity definition, feature doc)
- **Constructive tone** — Focus on improving the PBI, not criticizing the drafters

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/dor-gate (Recommended)"** — If APPROVE: validate DoR before grooming
- **"/refine"** — If REQUEST_REVISION: BA drafters revise, then re-run `/pbi-challenge`
- **"Escalate to Engineering Manager"** — If ESCALATE_TO_LEAD: document concern for technical consultation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `ba-team-decision-model` — Two-of-three BA vote and its escalation path; a BA team must reach a decision → .claude/skills/shared/protocols/ba-team-decision-model.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `estimation-framework` — Bottom-up estimation with derived story points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `refinement-dor-checklist` — Eight Definition of Ready criteria before grooming; challenging or grooming a PBI → .claude/skills/shared/protocols/refinement-dor-checklist.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:ui-system-context:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Project config is OPTIONAL (default `docs/project-config.json`, via its loader): absent → portable defaults plus repository evidence, state material assumptions, never block; present → non-empty `project.name`, neutral defaults for omitted capabilities, fail closed on a declared malformed section.
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Help a Dev BA PIC challenge a BA drafter's PBI before grooming, surfacing evidence-backed feasibility, AC, authorization, cross-service, M1-M7, releasable-outcome, and full-flow gaps so no infeasible or under-specified PBI reaches grooming as a false APPROVE; AI analyzes, human decides.

**IMPORTANT MUST ATTENTION Main steps (8, in order):** (1) locate PBI draft → (2) detect + **confirm module via `AskUserQuestion` before loading domain docs** → (3) Technical Feasibility → (4) AC Quality (+ M1-M7 checks) → (5) Cross-Cutting Concerns (auth/seed/migration/perf/UI Layout + Releasable Outcome/full-flow surface) → (6) generate SPECIFIC challenge prompts → (7) Challenge Prompts FIRST, then AI Verdict → (8) human records decision via `AskUserQuestion`. NEVER skip, reorder, or merge steps without explicit user approval — why: the prompts-before-verdict and module-confirm ordering is what defeats automation bias and false APPROVE.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each canonical body still governs:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **UI System Context:** ALWAYS read frontend-patterns, scss-styling, design-system before any UI change.
- **BA Team Decision Model:** 2/3 BA vote; Dev BA PIC technical veto; escalate 3-way splits.
- **Releasable PBI Contract:** Apply `.claude/skills/shared/releasable-pbi-contract.md`; technical-only PBIs and UI PBIs missing the full page/view/component/state/mock-app surface force REQUEST_REVISION.
- **Refinement DoR Checklist:** All 8 DoR criteria pass before grooming; testable AC, full-flow wireframes/mock app, estimate, and releasable outcome.
- **Estimation Framework:** Bottom-up phase hours drive man-days; SP derived; UI usually dominates.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act, <60% reject.
- **Sequential Thinking:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS; NEVER skip confidence closer.

**IMPORTANT MUST ATTENTION** AI provides ANALYSIS, human makes DECISION — present Challenge Prompts FIRST, AI Verdict (APPROVE / REQUEST_REVISION / ESCALATE_TO_LEAD) SECOND, then record the human decision via `AskUserQuestion`. NEVER auto-approve or auto-reject — why: verdict-first triggers automation bias and the Dev BA PIC rubber-stamps without independent assessment.
**IMPORTANT MUST ATTENTION** this is CROSS-PERSON review, not self-review — run only on a BA drafter's draft, NEVER on your own; route self-review to `/artifact-review --type=pbi` — why: external skepticism breaks the drafter's blind spots that self-review rationalizes away.
**IMPORTANT MUST ATTENTION** M1-M7 Compliance Gate is BLOCKING and drives the verdict — any M1-M5 or M7 failure forces REQUEST_REVISION with a challenge prompt naming the violated mandate ID + exact section/line/AC; an APPROVE over an M1-M5 or M7 violation is itself defective. M1 governs vocabulary, M7 governs subject matter — tech-free prose satisfies M1 and can still violate M7, so apply the demo test to the BODY. Carriers (`[Source: ...]`, `**Evidence**`, `CoveredBy:`, legacy `**IntegrationTest:**`, YAML, mermaid) are EXEMPT — challenge leakage only in PBI narrative prose — why: stack-named or under-specified prose locks the PBI to one implementation and ships ambiguity to grooming.
**IMPORTANT MUST ATTENTION** confirm the auto-detected module via `AskUserQuestion` BEFORE loading domain docs — wrong module = wrong entity context = false APPROVE — why: entity-conflict analysis built on the wrong service is worse than none.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; keep one `in_progress`; add a final review todo to verify work quality — why: untracked multi-step work loses state on compaction.
**IMPORTANT MUST ATTENTION** every concern raised must cite source (`file:line`, protocol section, entity definition, feature doc) with confidence — >80% to act, <60% DO NOT recommend; "Insufficient evidence" is valid output. NEVER present a guess as a verdict — why: a false APPROVE on an infeasible PBI costs more than the review.
**IMPORTANT MUST ATTENTION** challenge prompts must be SPECIFIC with suggested answers, not vague ("needs work") — frame suggestions as "consider whether X" options, never corrections — why: vague challenges get superficially satisfied; corrections create adoption pressure that suppresses independent reasoning.
**IMPORTANT MUST ATTENTION** search 3+ existing entity definitions + feature docs in the detected module before flagging a conflict or feasibility gap; verify the PBI's context shares the same constraints before reusing a nearby pattern as evidence — why: closest example ≠ matching preconditions.
**IMPORTANT MUST ATTENTION** Technical-veto scope (architecture feasibility, dependency correctness, cross-service impact, performance, security) is the Dev BA PIC's unilateral call — no 2/3 vote; non-technical decisions (UI/UX, visual design, business value) require 2/3 BA majority per `ba-team-decision-model` — why: routing a technical veto through a vote dilutes accountability for false APPROVE.
**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion` to present Next Steps (`/dor-gate` on APPROVE, `/refine` on REQUEST_REVISION, escalate on ESCALATE_TO_LEAD, or skip) — the user decides; never skip because the task seems obvious.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| "Verdict first, prompts are just support"        | Verdict-first = automation bias. Prompts FIRST so the human forms their own view.          |
| "I can review my own draft with this"            | This is cross-person review. Use `/artifact-review --type=pbi` for self-review.            |
| "Minor M1-M5 slip, still APPROVE"                | Any M1-M5 or M7 failure forces REQUEST_REVISION. An APPROVE over a violation is itself defective. |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Module is obvious, skip the confirm"            | Wrong module = wrong entity context = false APPROVE. Confirm via `AskUserQuestion`.        |
| "Concern is clearly right, no citation needed"   | Show `file:line` / section / entity ref + confidence. No proof = no verdict.               |
| "Challenge prompt good enough as a question"     | Must be SPECIFIC with a suggested answer, or the drafter satisfies it superficially.       |

**IMPORTANT MUST ATTENTION** AI provides ANALYSIS, human makes DECISION — challenge prompts FIRST, verdict SECOND, human records via `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** M1-M5 or M7 violation forces REQUEST_REVISION with mandate ID + section/line citation — an APPROVE over a violation is defective.
**IMPORTANT MUST ATTENTION** cite `file:line`/section/entity evidence for every concern (confidence >80% to act); never run on your own draft — cross-person review only.
