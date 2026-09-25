---
name: dor-gate
version: 1.0.0
description: '[Code Quality] Use when a workflow step or the user asks for a Definition of Ready check. Validates a PBI against DoR and the M1-M7 gates before grooming.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**Summary:**

- **Purpose:** Automated quality gate, not collaborative review (`/pbi-challenge` handles collaboration). Run 8 required DoR criteria plus M1-M7; any failure returns `FAIL`.
- **Execution:** Before step 1, use `TaskCreate` for every step plus a final review; keep one `in_progress` and record evidence/skips. Then run: (1) locate PBI → (2) apply self-contained DoR checklist → (3) evaluate all 8 criteria (story template; GIVEN/WHEN/THEN ×3 + auth; full-flow surface; UI design; AI review; estimate; dependencies; releasable outcome) → (4) run M1-M7 → (5) verify estimation → (6) classify → (7) emit result template → (8) route via `AskUserQuestion` (`/prioritize`, `/refine`, `/pbi-challenge`, or skip).
- **Evidence/gates:** BA Refinement Context is self-contained; cite concrete PBI section + line/AC for every verdict; any M1-M5 or M7 violation forces `FAIL`; M1/M2 carriers are exempt.
- **Contract/estimate:** Apply the shared releasable-PBI contract; technical-only/foundation/setup PBIs fail, UI PBIs need a connected multi-view flow, and story-point frontmatter needs Fibonacci 1-21, complexity, man-day, risk, and blast-radius evidence. `>13` SP = SHOULD-SPLIT `WARN`, not `FAIL`.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Workflow

1. **Locate PBI** — Find the artifact in `pbis/` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) or in active plan context; if absent, ask the user for its path.
2. **Apply DoR checklist** — Use the self-contained 8-criteria checklist below.
3. **Evaluate all 8 criteria** — Check story format; AC vagueness, GIVEN/WHEN/THEN (minimum 3 plus 1 auth scenario); full-flow page/view, navigation, component, state, and mockup coverage; UI design; AI pre-review; story points/complexity; dependency columns; and the releasable actor-facing outcome with entry → result, evidence, and no standalone technical/foundation/migration/setup scope.
4. **Run M1-M7 gate** — Apply each mandate below; M1-M5 or M7 failure forces `FAIL`. Distinguish M1 vocabulary from M7 demoability and exempt carriers from M1/M2.
5. **Verify estimation** — Check frontmatter against the SYNC estimation framework: `story_points` Fibonacci 1-21, complexity, man-day range, risk, and blast radius. `>13` SP is a SHOULD-SPLIT `WARN`, not a `FAIL`.
6. **Classify result** — `PASS` only when all 8 criteria and applicable M1-M5/M7 checks pass; otherwise `FAIL` and list fixes.
7. **Output verdict** — Emit the DoR Gate Result template; cite evidence for every criterion and mandate.
8. **Route next step** — After output, use `AskUserQuestion` to present the options in **Next Steps**; never decide the user's route.

### Shared contract references

> **Releasable PBI Contract** — One PBI names one independently releasable actor-facing outcome with complete entry → result → exit, visible/persisted truth, applicable access/error/recovery behavior, and evidence; UI PBIs need page/view, navigation, component, state, and connected mock-app coverage; technical work remains enabling work.
> MUST ATTENTION READ `.claude/skills/shared/releasable-pbi-contract.md` for the full outcome and full-flow contract.

> **AI-SDD Artifact Contract** — M1-M7 are hard gates: M1/M2 restrict implementation identifiers to carriers; M3 requires logical IDs plus abstract anchors; M4/M5 require unambiguous, rebuildable behavior; M6 requires gate failure; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate definitions and carrier rules.

## Checklist (self-contained DoR; M1-M7 gate below)

### Required (ALL must pass)

- MUST ATTENTION verify **User story template** — "As a {role}, I want {goal}, so that {benefit}" present
- MUST ATTENTION verify **AC testable** — All AC use GIVEN/WHEN/THEN, no vague language, min 3 scenarios + 1 auth scenario
- MUST ATTENTION verify **Releasable outcome** — The PBI names one independently releasable actor-facing outcome, demonstrates entry → action → result → exit, covers applicable visible/persisted truth and recovery, and does not make technical/foundation/migration/setup work the outcome
- MUST ATTENTION verify **Wireframes/mockups and full-flow surface** — For UI PBIs, all required pages/views, navigation, common/domain/page components, applicable states, and a connected demo/mockup are present; backend-only requires an explicit "N/A" reason
- MUST ATTENTION verify **UI design ready** — Completed incl. design-spec linked (`/design-spec` artifact or inline UI specs in `## UI Layout`) for UI PBIs; or "N/A" for backend-only
- MUST ATTENTION verify **AI pre-review** — `/artifact-review --type=pbi` or `/pbi-challenge` result is PASS or WARN
- MUST ATTENTION verify **Story points** — Valid Fibonacci (1-21) + complexity (Low/Medium/High)
- MUST ATTENTION verify **Dependencies table** — Complete with Dependency, Type (must-before/can-parallel/blocked-by/independent), and Status columns

### M1-M7 Compliance Gate (BLOCKING — each check FAILs the gate)

> **M6 enforcement:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)". A PBI violating any of M1-M5 or M7 is NOT ready for grooming — return `FAIL` and name the mandate ID with its concrete PBI section + line/AC citation. A DoR `PASS` over an M1-M5 or M7 violation is defective.
>
> **M1 governs vocabulary; M7 governs subject matter.** A technical case written in impeccably tech-free prose satisfies M1 while violating M7 — that gap is the most common way business specs rot. Passing M1 is NEVER evidence of passing M7; run both.
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in PBI narrative prose (problem statement, AC text, scope, rule descriptions). Banned prose token list: `spec-principles.md` §3.2.

- MUST ATTENTION verify **M1 — Tech-agnostic prose** — FAIL if problem statement, AC, or rule prose names a framework/product, language-native type, or product/design-pattern class name (banned list in `spec-principles.md` §3.2). Cite section + token.
- MUST ATTENTION verify **M2 — No source code in prose** — FAIL if a requirement is expressed as a class/method/file-path/namespace instead of a business operation. Source identifiers belong only in evidence carriers. Cite section + line.
- MUST ATTENTION verify **M3 — Abstract-IDs-first** — FAIL if a requirement/rule lacks a logical ID (`FR-/BR-/OP-`), has a logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, uses physical code coordinates or repository-root paths instead of an abstract anchor, or makes the anchor its primary citation. Evidence is REQUIRED and KEPT, but SECONDARY to the logical ID (physical coordinates live only in the provenance sidecar).
- MUST ATTENTION verify **M4 — Unambiguous AC** — FAIL if any AC uses vague language ("handle appropriately", "process normally", "as needed"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists. (Reinforces the "AC testable" required criterion above.)
- MUST ATTENTION verify **M5 — Implementable from artifact alone** — FAIL if a competent team with ZERO codebase knowledge could not implement the PBI on a different stack from the PBI alone (relies on reading source to understand it). Cite section + missing detail.
- MUST ATTENTION verify **M7 — Business-visibility** — apply the demo test to each case's BODY: _"what would a stakeholder SEE change?"_ — no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count. Judge the BODY, never the title or ID. Cite section + the offending `Given`/`When`/`Then` line.

If ANY box fails → DoR result is FAIL; list each violated mandate ID with its concrete section/line citation in the Blocking Items.

## BA Refinement Context (canonical DoR)

> Applies to Writes under `pbis/` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides). Mirrored for Codex via `SYNC:refinement-dor-checklist` / `SYNC:ba-team-decision-model` in AGENTS.md (do not hand-edit the mirror). This is the self-contained DoR source — no external protocol-file dependency required to run the gate.

**Decision Model:** 2/3 majority vote (UX BA + Designer BA + Dev BA PIC). Dev BA PIC has technical veto. Disagree-and-commit after decision. Grooming override requires >75% remaining-team vote.

**DoR Gate (ALL must pass before grooming):**

- MUST ATTENTION verify user story template (`As a... I want... So that...`)
- MUST ATTENTION verify testable AC (GIVEN/WHEN/THEN, no vague language; minimum 3 scenarios + 1 auth scenario)
- MUST ATTENTION verify releasable actor-facing outcome and complete entry-to-result journey; no standalone technical/foundation/migration/setup PBI
- MUST ATTENTION verify UX wireframes/full-flow mock app + Designer BA UI readiness: page/view inventory, navigation, components, applicable states, and linked design spec (`/design-spec` artifact or inline `## UI Layout`) for UI PBIs; backend-only requires explicit `N/A` reason
- MUST ATTENTION verify AI pre-review (`/artifact-review --type=pbi` or `/pbi-challenge` returned `PASS` or `WARN`)
- MUST ATTENTION verify story points (Fibonacci 1-21 + complexity); `>13` SP → recommend split
- MUST ATTENTION verify complete dependencies table (Dependency · Type must-before/can-parallel/blocked-by/independent · Status)

**Failure fixes:** Vague AC → specify exact CRUD + roles; missing auth → add roles × CRUD table; no wireframes → UX BA creates; TBD AC → replace with a decision.

## Output

```markdown
## DoR Gate Result

**PBI:** {PBI filename}
**Status:** PASS | FAIL
**Date:** {date}

### Checklist Results

| #   | Criterion                   | Status    | Evidence / Issue |
| --- | --------------------------- | --------- | ---------------- |
| 1   | User story template         | ✅/❌     | {evidence}       |
| 2   | AC testable and unambiguous | ✅/❌     | {evidence}       |
| 3   | Releasable actor-facing outcome | ✅/❌  | {evidence}       |
| 4   | Full-flow wireframes/mock app | ✅/❌/N/A | {evidence}       |
| 5   | UI design ready             | ✅/❌/N/A | {evidence}       |
| 6   | AI pre-review passed        | ✅/❌     | {evidence}       |
| 7   | Story points estimated      | ✅/❌     | {evidence}       |
| 8   | Dependencies complete       | ✅/❌     | {evidence}       |

### Blocking Items (if FAIL)

1. {Fix instruction}

### Verdict

**{READY_FOR_GROOMING | FIX_REQUIRED}**
```

## Key Rules

- **FAIL blocks grooming** — If ANY required criterion fails, PBI cannot enter grooming. List specific fixes.
- **No guessing** — Every check must reference specific content (line numbers) in the PBI artifact.
- **Protocol is source of truth** — Always reference `refinement-dor-checklist-protocol.md` for criteria definitions.
- **Story points >13** — Flag recommendation to split (not a FAIL, but a strong WARN).

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/prioritize (Recommended)"** — If PASS: PBI is grooming-ready; prioritize into the backlog
- **"/refine"** — If FAIL: revise PBI
- **"/pbi-challenge"** — If collaborative review needed before re-checking DoR
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `estimation-framework` — Bottom-up estimation with derived story points and a min-max range; estimating effort → .claude/skills/shared/protocols/estimation-framework.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
<!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**IMPORTANT MUST ATTENTION Purpose:** Automated DoR gate, NOT collaborative review: run 8 required criteria plus M1-M7; the user chooses the next route.

**IMPORTANT MUST ATTENTION Main steps (1-8):** Before step 1, use `TaskCreate` for every step plus final review and track evidence/skips → (1) locate PBI → (2) apply self-contained DoR → (3) evaluate story, AC, full-flow/UI, AI review, estimate, dependencies, and releasable outcome → (4) run M1-M7 → (5) verify estimation frontmatter → (6) classify `PASS`/`FAIL` → (7) emit DoR Gate Result → (8) use `AskUserQuestion` for `/prioritize`, `/refine`, `/pbi-challenge`, or skip. NEVER skip, reorder, or merge without approval.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above, NEVER a replacement):**

- **AI Mistakes:** holistic-first debugging, fix at responsible layer, surgical diff, verify all outputs.
- **Estimation:** bottom-up phase hours drive man-days; SP derived; >13 SHOULD-SPLIT.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess.

**MANDATORY IMPORTANT MUST ATTENTION** `FAIL` blocks grooming — any required criterion or M1-M5/M7 failure returns `FAIL` with mandate ID + concrete PBI section/line/AC; NEVER pass an M1-M5/M7 violation, technical-only PBI, or UI PBI missing full-flow pages/components/states. — why: unready stories ship ambiguity downstream.
**IMPORTANT MUST ATTENTION** every verdict cites `file:line`/section evidence (confidence >80% to act, <60% DO NOT decide); NEVER guess a criterion's status. — why: uncited PASS/FAIL is unauditable.
**IMPORTANT MUST ATTENTION** carriers are EXEMPT from M1/M2: source identifiers are valid inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML frontmatter, and ` ```mermaid ``` `; inspect narrative prose only (banned tokens: `spec-principles.md` §3.2). — why: carrier flagging creates a false FAIL.
**IMPORTANT MUST ATTENTION** verify estimation frontmatter via the SYNC framework: Fibonacci 1-21 + complexity, bottom-up `man_days` range, risk, and blast radius; `>13` SP = SHOULD-SPLIT `WARN`, NOT `FAIL`. — why: a WARN must not block a groomable story.
**IMPORTANT MUST ATTENTION** Decision Model: 2/3 BA majority; Dev BA PIC has technical veto; grooming override requires >75% remaining-team vote.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks, keep one `in_progress`, record evidence/skips, and add a final review task.
**MANDATORY IMPORTANT MUST ATTENTION** emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then use `AskUserQuestion` — never auto-decide the next step.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "AC looks testable enough, pass it"              | Show GIVEN/WHEN/THEN ×3 + 1 auth scenario, no vague tokens. No proof = FAIL.                      |
| "M1-M5 is minor, the rest passes — PASS overall" | ANY M1-M5 or M7 violation = FAIL. A PASS over one is itself defective.                            |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Source name in `[Source: ...]` — flag it M1/M2" | Carriers are EXEMPT. Flag leakage ONLY in narrative prose, never in evidence carriers.            |
| "Story points >13, fail the gate"                | >13 SP = SHOULD-SPLIT WARN, not a FAIL. Do not escalate a WARN to a FAIL.                         |
| "Skip `AskUserQuestion`, result is obvious"      | NEVER auto-decide. Emit the result template, then route via `AskUserQuestion` — the user decides. |

**[TASK-PLANNING]** Before acting, analyze scope and break it into small tasks and sub-tasks with `TaskCreate`.

---

**IMPORTANT MUST ATTENTION** FAIL blocks grooming on ANY required-criterion or M1-M5/M7 failure — name the violated ID + cite PBI section/line; NEVER PASS over an M1-M5 or M7 violation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section for EVERY verdict (>80% confidence to act); NEVER guess a check's status.
**IMPORTANT MUST ATTENTION** emit the DoR Gate Result template, then route via `AskUserQuestion` — never auto-decide.
