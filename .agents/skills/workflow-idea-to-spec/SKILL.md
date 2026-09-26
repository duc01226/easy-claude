---
name: workflow-idea-to-spec
description: '[Workflow] Use when turning a raw idea, vision, or problem into one reviewed provisional canonical spec under the configured artifact profile. Stops at the spec; chain workflow-spec-to-pbi for a backlog.'
disable-model-invocation: false
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

**Goal:** turn a raw idea, vision or problem into ONE reviewed, docs-synced, provisional canonical spec per converged capability — with planned test/evidence cases in the configured artifact contract — and STOP there. **MUST ATTENTION** no PBI, story, backlog, mockup or roadmap artifact is produced here.

**Use it when** a PO/BA wants intended behavior captured as the source of truth BEFORE code exists (spec-first). **Use a sibling instead when:** code already exists → `workflow-code-to-spec`; the user wants the backlog in one pass → `workflow-idea-to-pbi`; a spec already exists and needs PBIs → `workflow-spec-to-pbi`; the behavior is already written and needs building → `workflow-implement-spec`; a bug → `workflow-bugfix`.

**IMPORTANT MANDATORY Steps:** $web-research -> $deep-research -> $brainstorm -> $spec-discovery -> $scenario -> $domain-analysis -> $why-review -> $idea -> $spec [mode=draft] -> $spec [mode=tests] -> $artifact-review --type=spec-tests -> $artifact-review -> $design-spec -> $spec-clarify -> $why-review -> $docs-update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged to the run's deviation log. The list above is the recommended default order; the triage below decides which recommendations earn their cost.

## 1. Triage (FIRST action, before choosing steps)

Classify the idea and record the result in the run report. Escalate depth on ambiguity and risk, not on length alone.

| Band     | Signal                                                                            | Default depth                                                                                                                           |
| -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **XS**   | one small capability, clear problem, no existing spec overlap                     | inline; short brainstorm; spec-discovery only if specs/code exist; light clarify (records OBVIOUS decisions)                            |
| **S**    | one capability, a few rules/states, some open questions                           | inline; full clarify on the non-obvious decisions                                                                                       |
| **M**    | one capability with many rules/states, UI surface, or overlap with existing specs | full framing (why-review), design-spec when UI, presentation when stakeholders review                                                   |
| **L/XL** | several capabilities, release scope, research-heavy or ambiguous idea             | `isLargeIdea` true → decomposition block; one spec per capability; 4+ capabilities → one `spec` sub-agent per capability in ONE message |

**Kinds** (each selects optional steps): external market/competitor evidence would change the spec → `web-research` (+ `deep-research`) · specs or code already exist for the area → `spec-discovery` · new/changed domain entities → `domain-analysis` · adversarial replay/state/ownership/recovery/evidence analysis needed → `scenario` · user-facing UI → `design-spec` · multiple stakeholders or M+ spec → `feature-presentation`.

**Large-idea rule (MANDATORY, shared):** evaluate `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before authoring. Any true signal → the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) goes in the spec role the native profile or local artifact reference declares for slice plans, and its stable slice IDs carry into downstream inputs. All false → omit the block. When neither the profile nor the local reference declares such a role, stop and resolve the mapping; never invent a section. A supplied roadmap is read-only context; the standalone `product-roadmap` skill runs only on an explicit user request.

## 2. Required Quality Gates (non-negotiable)

| Gate                                                        | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved** before discovery or authoring | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the resolved path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback. |
| **Scope confirmed with the user**                           | Brainstorm convergence and the spec-discovery scope decision (NEW spec · EXTEND existing spec via `spec [mode=update]` · SPLIT into N) confirmed by asking the user directly; never auto-select scope.                                                                                                                                                                                      |
| **Spec authored**                                           | The canonical provisional spec at its configured path (`spec [mode=draft]`, or `spec [mode=update]` for EXTEND) with planned test/evidence cases (`spec [mode=tests]`) — each case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.                                                                                                             |
| **Spec review converged** (`review-converged`)              | `$artifact-review` on the spec and on its test/evidence cases, including the BLOCKING **M1-M7** gate (tech-agnostic intent prose, business-visible cases); validated findings fixed and re-reviewed.                                                                                                                                                                                  |
| **Decisions clarified**                                     | `$spec-clarify` in authored-spec context: every NON-OBVIOUS, CONFLICTS and high-impact decision confirmed by the user and written to the native role and its decision record; residual confidence below 80% stays an Open Question. Depth scales with the triage; it always records at least the OBVIOUS decisions and its verdict.                                                   |
| **Docs synced**                                             | `$docs-update` synced the spec, its configured test/evidence carrier, and only declared derived indexes.                                                                                                                                                                                                                                                                              |
| **Run closed** (`run-closed`)                               | `$workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                                                                     |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, provisional state and test/evidence carriers. Keep intent roles tech-agnostic; put permitted technical detail only in declared contract/evidence roles. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free eight sections with the inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI features, Section 8 `TC-{FEATURE}-{NNN}` cases carrying `Evidence: TBD`, `Status: Planned`, `provisional: true` — applies only when neither exists. Unknown mapping or missing required coverage is BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE. Never invent a section, ID, provisional field or second case registry.

## 3. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                      | Proves / feeds                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `$web-research` → `$deep-research`                        | external market, competitor or best-practice evidence would change the spec (deep-research only when web-research ran)                                   | evidence base for the brainstorm                            |
| `$brainstorm`                                             | always; short for XS, Double Diamond (POV/5 Whys/JTBD/HMW → OST or Lean Canvas → SCAMPER → converge) for M+                                              | converged capability → scope gate                           |
| `$spec-discovery`                                         | any canonical spec or related code exists; short-circuits with a recorded reason on an empty corpus                                                      | overlap/gap/invariant landscape + NEW/EXTEND/SPLIT decision |
| `$scenario`                                               | the decomposition or scope needs adversarial replay, state, ownership, persistence, recovery or evidence analysis                                        | risks feeding the spec's invariants                         |
| `$domain-analysis`                                        | new or changed domain entities/aggregates                                                                                                                | entity model for the spec                                   |
| `$why-review` (framing)                                   | the problem framing is not already validated, or credible alternatives exist — PASS proceeds, WARN needs user acknowledgment, FAIL returns to brainstorm | right problem before authoring                              |
| `$idea`                                                   | a durable idea artifact is needed (several capabilities, stakeholder handoff, later backlog chain)                                                       | idea record under the configured team artifacts root        |
| `$spec [mode=draft]` · `$spec [mode=tests]`               | always (the spec-driven core)                                                                                                                            | spec authored gate                                          |
| `$artifact-review --type=spec-tests` · `$artifact-review` | always; depth scales with case count and ambiguity                                                                                                       | review-converged gate                                       |
| `$design-spec`                                            | the idea has a user-facing UI; UI specs only (no mockup, no backlog), seeded from the profile's interaction-intent owner                                 | UI intent companion to the spec                             |
| `$spec-clarify`                                           | always (depth by triage)                                                                                                                                 | decisions-clarified gate                                    |
| `$why-review` (rationale)                                 | recommended; may merge into the artifact review for XS/S specs with no open decision                                                                     | rationale + completeness of the authored spec               |
| `$docs-update`                                            | always                                                                                                                                                   | docs-synced gate                                            |
| `$feature-presentation`                                   | several stakeholders review the spec (M+, UI, several capabilities, or on request); spec-only deck, no HTML mockups                                      | stakeholder review input                                    |
| `$workflow-end` → `$watzup`                               | always, last                                                                                                                                             | run-closed gate + handoff                                   |

## 4. Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the spec exists before it is reviewed or clarified; clarification fixes land before the rationale review and docs sync that check them; fixes are re-verified after they land; `$workflow-end` runs last; user-approval gates are never parallelized. XS/S work runs inline; for 4+ capabilities spawn one `spec` sub-agent per capability in ONE message, each brief carrying the framing, the resolved profile and its output path.

## 5. Memory, Reporting and Fix Path

- One task per selected step (per capability when several) so nothing is lost after compaction; write the run report under `tmp/reports/` FIRST and append per step; after compaction re-read the report and the current task list before continuing.
- Write every artifact immediately to its configured root (plans, team artifacts, business spec root) — never batch.
- Findings are validated (evidence-backed) before fixing; fix in the owning spec role; re-run the review that raised them. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 2 rounds (+1 when a CRITICAL/HIGH stays open); escalate by asking the user directly on no progress.
- **Provisional output:** no code exists yet, so use the provisional/planned-evidence convention of the native profile. The first `workflow-code-to-spec` / `spec [mode=update]` run against real code reconciles planned cases with executable proof and clears provisional markers only when the profile's acceptance rule is met.
- **Handoff at close:** canonical spec paths, case/evidence coverage, open questions below 80% confidence, the presentation path when produced, and the next route — `workflow-spec-to-pbi` for a backlog or `workflow-implement-spec` to build.
<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `nested-task-creation` — A child skill creates its own phase tasks under the workflow parent row; a skill runs as a workflow step → .claude/skills/shared/protocols/nested-task-creation.md
- `parallel-subagent-dispatch` — Tag tasks PAR or SEQ, group them into disjoint waves and dispatch each wave at once; a task list has independent tasks → .claude/skills/shared/protocols/parallel-subagent-dispatch.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
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

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** one reviewed, docs-synced, provisional canonical spec per converged capability under the configured artifact contract — then STOP; chain `workflow-spec-to-pbi` for a backlog or `workflow-implement-spec` to build.

- **MUST ATTENTION** triage FIRST (size band, kinds, risk, `isLargeIdea`); it selects the optional steps and their depth. Any large-idea signal → the complete `large_idea_decomposition` block in the profile's slice-plan role.
- **MUST ATTENTION** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the spec quality gates always hold: spec + planned cases authored, `$artifact-review` converged with the M1-M7 gate, `$spec-clarify` confirmed every non-obvious decision with the user, `$docs-update` synced, `$workflow-end` closed.
- **NEVER** produce PBIs, stories, mockups or a roadmap artifact here; never auto-select scope — confirm it with the user.
- **MUST ATTENTION** one task per selected step, report in `tmp/reports/` written first and re-read after compaction; every case names the business intent it guards.

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
