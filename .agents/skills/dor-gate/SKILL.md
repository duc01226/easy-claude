---
name: dor-gate
description: '[Code Quality] Use when a workflow step or the user asks for a Definition of Ready check. Validates a PBI against DoR and the M1-M7 gates before grooming.'
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

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**Summary:**

- **Purpose:** Automated quality gate, not collaborative review (`$pbi-challenge` handles collaboration). Run 8 required DoR criteria plus M1-M7; any failure returns `FAIL`.
- **Execution:** Before step 1, use task tracking for every step plus a final review; keep one `in_progress` and record evidence/skips. Then run: (1) locate PBI → (2) apply self-contained DoR checklist → (3) evaluate all 8 criteria (story template; GIVEN/WHEN/THEN ×3 + auth; full-flow surface; UI design; AI review; estimate; dependencies; releasable outcome) → (4) run M1-M7 → (5) verify estimation → (6) classify → (7) emit result template → (8) route by asking the user directly (`$prioritize`, `$refine`, `$pbi-challenge`, or skip).
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
8. **Route next step** — After output, use ask the user directly to present the options in **Next Steps**; never decide the user's route.

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
- MUST ATTENTION verify **UI design ready** — Completed incl. design-spec linked (`$design-spec` artifact or inline UI specs in `## UI Layout`) for UI PBIs; or "N/A" for backend-only
- MUST ATTENTION verify **AI pre-review** — `$artifact-review --type=pbi` or `$pbi-challenge` result is PASS or WARN
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
- MUST ATTENTION verify UX wireframes/full-flow mock app + Designer BA UI readiness: page/view inventory, navigation, components, applicable states, and linked design spec (`$design-spec` artifact or inline `## UI Layout`) for UI PBIs; backend-only requires explicit `N/A` reason
- MUST ATTENTION verify AI pre-review (`$artifact-review --type=pbi` or `$pbi-challenge` returned `PASS` or `WARN`)
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

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use ask the user directly to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$prioritize (Recommended)"** — If PASS: PBI is grooming-ready; prioritize into the backlog
- **"$refine"** — If FAIL: revise PBI
- **"$pbi-challenge"** — If collaborative review needed before re-checking DoR
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `$project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate each PBI against the self-contained DoR 8-criteria and M1-M7 gates so only evidence-backed, unambiguous, implementable, releasable PBIs reach grooming, with every failure cited to its PBI section/line.

**IMPORTANT MUST ATTENTION Purpose:** Automated DoR gate, NOT collaborative review: run 8 required criteria plus M1-M7; the user chooses the next route.

**IMPORTANT MUST ATTENTION Main steps (1-8):** Before step 1, use task tracking for every step plus final review and track evidence/skips → (1) locate PBI → (2) apply self-contained DoR → (3) evaluate story, AC, full-flow/UI, AI review, estimate, dependencies, and releasable outcome → (4) run M1-M7 → (5) verify estimation frontmatter → (6) classify `PASS`/`FAIL` → (7) emit DoR Gate Result → (8) use ask the user directly for `$prioritize`, `$refine`, `$pbi-challenge`, or skip. NEVER skip, reorder, or merge without approval.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost to its canonical body above, NEVER a replacement):**

- **AI Mistakes:** holistic-first debugging, fix at responsible layer, surgical diff, verify all outputs.
- **Estimation:** bottom-up phase hours drive man-days; SP derived; >13 SHOULD-SPLIT.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess.

**MANDATORY IMPORTANT MUST ATTENTION** `FAIL` blocks grooming — any required criterion or M1-M5/M7 failure returns `FAIL` with mandate ID + concrete PBI section/line/AC; NEVER pass an M1-M5/M7 violation, technical-only PBI, or UI PBI missing full-flow pages/components/states. — why: unready stories ship ambiguity downstream.
**IMPORTANT MUST ATTENTION** every verdict cites `file:line`/section evidence (confidence >80% to act, <60% DO NOT decide); NEVER guess a criterion's status. — why: uncited PASS/FAIL is unauditable.
**IMPORTANT MUST ATTENTION** carriers are EXEMPT from M1/M2: source identifiers are valid inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**`, YAML frontmatter, and ` ```mermaid ``` `; inspect narrative prose only (banned tokens: `spec-principles.md` §3.2). — why: carrier flagging creates a false FAIL.
**IMPORTANT MUST ATTENTION** verify estimation frontmatter via the SYNC framework: Fibonacci 1-21 + complexity, bottom-up `man_days` range, risk, and blast radius; `>13` SP = SHOULD-SPLIT `WARN`, NOT `FAIL`. — why: a WARN must not block a groomable story.
**IMPORTANT MUST ATTENTION** Decision Model: 2/3 BA majority; Dev BA PIC has technical veto; grooming override requires >75% remaining-team vote.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small task tracking tasks, keep one `in_progress`, record evidence/skips, and add a final review task.
**MANDATORY IMPORTANT MUST ATTENTION** emit the DoR Gate Result template (checklist table + Blocking Items + Verdict), then use ask the user directly — never auto-decide the next step.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| "AC looks testable enough, pass it"              | Show GIVEN/WHEN/THEN ×3 + 1 auth scenario, no vague tokens. No proof = FAIL.                      |
| "M1-M5 is minor, the rest passes — PASS overall" | ANY M1-M5 or M7 violation = FAIL. A PASS over one is itself defective.                            |
| "No tech words in it — M7 passes"                | M1 ≠ M7. Apply the demo test to the BODY: what would a stakeholder SEE change? No answer → FAIL, however clean the prose. |
| "Source name in `[Source: ...]` — flag it M1/M2" | Carriers are EXEMPT. Flag leakage ONLY in narrative prose, never in evidence carriers.            |
| "Story points >13, fail the gate"                | >13 SP = SHOULD-SPLIT WARN, not a FAIL. Do not escalate a WARN to a FAIL.                         |
| "Skip ask the user directly, result is obvious"      | NEVER auto-decide. Emit the result template, then route by asking the user directly — the user decides. |

**[TASK-PLANNING]** Before acting, analyze scope and break it into small tasks and sub-tasks with task tracking.

---

**IMPORTANT MUST ATTENTION** FAIL blocks grooming on ANY required-criterion or M1-M5/M7 failure — name the violated ID + cite PBI section/line; NEVER PASS over an M1-M5 or M7 violation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section for EVERY verdict (>80% confidence to act); NEVER guess a check's status.
**IMPORTANT MUST ATTENTION** emit the DoR Gate Result template, then route by asking the user directly — never auto-decide.

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
