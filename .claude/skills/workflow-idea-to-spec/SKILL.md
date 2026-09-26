---
name: workflow-idea-to-spec
version: 3.0.0
description: '[Workflow] Use when turning a raw idea, vision, or problem into one reviewed provisional canonical spec under the configured artifact profile. Stops at the spec; chain workflow-spec-to-pbi for a backlog.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** turn a raw idea, vision or problem into ONE reviewed, docs-synced, provisional canonical spec per converged capability — with planned test/evidence cases in the configured artifact contract — and STOP there. **MUST ATTENTION** no PBI, story, backlog, mockup or roadmap artifact is produced here.

**Use it when** a PO/BA wants intended behavior captured as the source of truth BEFORE code exists (spec-first). **Use a sibling instead when:** code already exists → `workflow-code-to-spec`; the user wants the backlog in one pass → `workflow-idea-to-pbi`; a spec already exists and needs PBIs → `workflow-spec-to-pbi`; the behavior is already written and needs building → `workflow-implement-spec`; a bug → `workflow-bugfix`.

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /brainstorm -> /spec-discovery -> /scenario -> /domain-analysis -> /why-review -> /idea -> /spec [mode=draft] -> /spec [mode=tests] -> /artifact-review --type=spec-tests -> /artifact-review -> /design-spec -> /spec-clarify -> /why-review -> /docs-update -> /feature-presentation -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged to the run's deviation log. The list above is the recommended default order; the triage below decides which recommendations earn their cost.

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
| **Scope confirmed with the user**                           | Brainstorm convergence and the spec-discovery scope decision (NEW spec · EXTEND existing spec via `spec [mode=update]` · SPLIT into N) confirmed via `AskUserQuestion`; never auto-select scope.                                                                                                                                                                                      |
| **Spec authored**                                           | The canonical provisional spec at its configured path (`spec [mode=draft]`, or `spec [mode=update]` for EXTEND) with planned test/evidence cases (`spec [mode=tests]`) — each case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.                                                                                                             |
| **Spec review converged** (`review-converged`)              | `/artifact-review` on the spec and on its test/evidence cases, including the BLOCKING **M1-M7** gate (tech-agnostic intent prose, business-visible cases); validated findings fixed and re-reviewed.                                                                                                                                                                                  |
| **Decisions clarified**                                     | `/spec-clarify` in authored-spec context: every NON-OBVIOUS, CONFLICTS and high-impact decision confirmed by the user and written to the native role and its decision record; residual confidence below 80% stays an Open Question. Depth scales with the triage; it always records at least the OBVIOUS decisions and its verdict.                                                   |
| **Docs synced**                                             | `/docs-update` synced the spec, its configured test/evidence carrier, and only declared derived indexes.                                                                                                                                                                                                                                                                              |
| **Run closed** (`run-closed`)                               | `/workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                                                                     |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, provisional state and test/evidence carriers. Keep intent roles tech-agnostic; put permitted technical detail only in declared contract/evidence roles. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free eight sections with the inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI features, Section 8 `TC-{FEATURE}-{NNN}` cases carrying `Evidence: TBD`, `Status: Planned`, `provisional: true` — applies only when neither exists. Unknown mapping or missing required coverage is BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE. Never invent a section, ID, provisional field or second case registry.

## 3. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                      | Proves / feeds                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `/web-research` → `/deep-research`                        | external market, competitor or best-practice evidence would change the spec (deep-research only when web-research ran)                                   | evidence base for the brainstorm                            |
| `/brainstorm`                                             | always; short for XS, Double Diamond (POV/5 Whys/JTBD/HMW → OST or Lean Canvas → SCAMPER → converge) for M+                                              | converged capability → scope gate                           |
| `/spec-discovery`                                         | any canonical spec or related code exists; short-circuits with a recorded reason on an empty corpus                                                      | overlap/gap/invariant landscape + NEW/EXTEND/SPLIT decision |
| `/scenario`                                               | the decomposition or scope needs adversarial replay, state, ownership, persistence, recovery or evidence analysis                                        | risks feeding the spec's invariants                         |
| `/domain-analysis`                                        | new or changed domain entities/aggregates                                                                                                                | entity model for the spec                                   |
| `/why-review` (framing)                                   | the problem framing is not already validated, or credible alternatives exist — PASS proceeds, WARN needs user acknowledgment, FAIL returns to brainstorm | right problem before authoring                              |
| `/idea`                                                   | a durable idea artifact is needed (several capabilities, stakeholder handoff, later backlog chain)                                                       | idea record under the configured team artifacts root        |
| `/spec [mode=draft]` · `/spec [mode=tests]`               | always (the spec-driven core)                                                                                                                            | spec authored gate                                          |
| `/artifact-review --type=spec-tests` · `/artifact-review` | always; depth scales with case count and ambiguity                                                                                                       | review-converged gate                                       |
| `/design-spec`                                            | the idea has a user-facing UI; UI specs only (no mockup, no backlog), seeded from the profile's interaction-intent owner                                 | UI intent companion to the spec                             |
| `/spec-clarify`                                           | always (depth by triage)                                                                                                                                 | decisions-clarified gate                                    |
| `/why-review` (rationale)                                 | recommended; may merge into the artifact review for XS/S specs with no open decision                                                                     | rationale + completeness of the authored spec               |
| `/docs-update`                                            | always                                                                                                                                                   | docs-synced gate                                            |
| `/feature-presentation`                                   | several stakeholders review the spec (M+, UI, several capabilities, or on request); spec-only deck, no HTML mockups                                      | stakeholder review input                                    |
| `/workflow-end` → `/watzup`                               | always, last                                                                                                                                             | run-closed gate + handoff                                   |

## 4. Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the spec exists before it is reviewed or clarified; clarification fixes land before the rationale review and docs sync that check them; fixes are re-verified after they land; `/workflow-end` runs last; user-approval gates are never parallelized. XS/S work runs inline; for 4+ capabilities spawn one `spec` sub-agent per capability in ONE message, each brief carrying the framing, the resolved profile and its output path.

## 5. Memory, Reporting and Fix Path

- One task per selected step (per capability when several) so nothing is lost after compaction; write the run report under `tmp/reports/` FIRST and append per step; after compaction re-read the report and `TaskList` before continuing.
- Write every artifact immediately to its configured root (plans, team artifacts, business spec root) — never batch.
- Findings are validated (evidence-backed) before fixing; fix in the owning spec role; re-run the review that raised them. Review loop: round 1 exits on zero findings; round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 2 rounds (+1 when a CRITICAL/HIGH stays open); escalate via `AskUserQuestion` on no progress.
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
- **MUST ATTENTION** the spec quality gates always hold: spec + planned cases authored, `/artifact-review` converged with the M1-M7 gate, `/spec-clarify` confirmed every non-obvious decision with the user, `/docs-update` synced, `/workflow-end` closed.
- **NEVER** produce PBIs, stories, mockups or a roadmap artifact here; never auto-select scope — confirm it with the user.
- **MUST ATTENTION** one task per selected step, report in `tmp/reports/` written first and re-read after compaction; every case names the business intent it guards.
