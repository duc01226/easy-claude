---
name: workflow-idea-to-spec
description: '[Workflow] Turn a raw idea, vision or problem into reviewed provisional canonical specs with planned test cases; stop before backlog or implementation.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user question tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-idea-to-spec` together with this skill. Call [`$start-workflow workflow-idea-to-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** create ALL selected occurrence tasks before triage, analysis or step execution, including conditional/optional tasks; preserve occurrence IDs, roles and barrier groups. Use native task tools or an equivalent persistent ledger. Then mark the first task `in_progress`; attach evidence before `completed`.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a task or turn a conditional skill into an unconditional call. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$web-research`](../web-research/SKILL.md) (optional; conditional) → [`$source-deep-dive`](../source-deep-dive/SKILL.md) (optional; conditional) → [`$brainstorm`](../brainstorm/SKILL.md) (core) → [`$spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`$why-review`](../why-review/SKILL.md) (optional; conditional) → [`$idea`](../idea/SKILL.md) (optional; conditional) → [`$spec [mode=draft]`](../spec/SKILL.md) (core) → [`$spec [mode=tests]`](../spec/SKILL.md) (core) → [`$pbi --mode=review --type=spec-tests`](../pbi/SKILL.md) (core) → [`$pbi --mode=review`](../pbi/SKILL.md) (gate) → [`$design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`$spec [mode=clarify]`](../spec/SKILL.md) (gate) → [`$why-review`](../why-review/SKILL.md) (core) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (core) → [`$feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (core)
<!-- workflow-mode:default fingerprint:a8a8eea2d05f431bb6c986f0642a676ca248359724527dc7cfc48612e5d9d18e -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Turn a raw idea, vision or problem into one reviewed, docs-synced provisional canonical spec per converged capability, with planned cases under the configured artifact contract; stop before backlog or implementation.

**Summary:** Triage/profile → conditional research/deep dive → brainstorm/discovery → scenario/domain/framing review → idea → draft/tests → case/spec review → UI design → clarify/rationale → docs sync → presentation → close/wrap-up. Gates remain fixed; conditions below select optional work. Produce planned evidence, not implemented proof.

**Use when:** PO/BA needs canonical intent before code exists. **Adjacent routes:** existing code → `workflow-code-to-spec`; idea + backlog → `workflow-idea-to-pbi`; spec + PBIs → `workflow-spec-to-pbi`; specified behavior to build → `workflow-implement-spec`; bug → `workflow-bugfix`.

**IMPORTANT MANDATORY Steps:** $web-research -> $source-deep-dive -> $brainstorm -> $spec [mode=discovery] -> $scenario -> $domain-analysis -> $why-review -> $idea -> $spec [mode=draft] -> $spec [mode=tests] -> $pbi --mode=review --type=spec-tests -> $pbi --mode=review -> $design-spec -> $spec [mode=clarify] -> $why-review -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup

**Key Rules:** Confirm scope with the user; resolve artifact roles before authoring; create no PBI, story, backlog, mockup or roadmap artifact.

**Step contract:** Follow `$start-workflow` → Step Execution Protocol: gates always run; invoke every selected skill through the active host; log deviations. Triage selects recommendations and depth.

## 1. Triage (FIRST action, before choosing steps)

Record size, kinds and risk in the run report before selecting steps. Escalate depth on ambiguity and risk, not length.

| Band     | Signal                                                                            | Default depth                                                                                                                           |
| -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **XS**   | one small capability, clear problem, no existing spec overlap                     | inline; short brainstorm; spec [mode=discovery] only if specs/code exist; light clarify (records OBVIOUS decisions)                            |
| **S**    | one capability, a few rules/states, some open questions                           | inline; full clarify on the non-obvious decisions                                                                                       |
| **M**    | one capability with many rules/states, UI surface, or overlap with existing specs | full framing (why-review), design-spec when UI, presentation when stakeholders review                                                   |
| **L/XL** | several capabilities, release scope, research-heavy or ambiguous idea             | `isLargeIdea` true → decomposition block; one spec per capability; 4+ capabilities → one `spec` sub-agent per capability in ONE message |

**Kinds:** Apply the conditions in Recommended Skills below to select optional steps.

**Large-idea rule (MANDATORY):** Evaluate `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedPbiThatMustSplit` before authoring. Any true signal → the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) goes in the spec role the native profile or local artifact reference declares for slice plans, and its stable slice IDs carry into downstream inputs. All false → omit it. If neither profile nor local reference declares the slice-plan role, stop and resolve it; never invent a section. A supplied roadmap is read-only; `product-roadmap` requires an explicit user request.

## 2. Required Quality Gates (non-negotiable)

| Gate                                                        | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved** before discovery or authoring | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the resolved path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback. |
| **Scope confirmed with the user**                           | Brainstorm convergence and the spec [mode=discovery] scope decision (NEW spec · EXTEND existing spec via `spec [mode=update]` · SPLIT into N) confirmed via `ask user question tool`; never auto-select scope.                                                                                                                                                                                      |
| **Spec authored**                                           | The canonical provisional spec at its configured path (`spec [mode=draft]`, or `spec [mode=update]` for EXTEND) with planned test/evidence cases (`spec [mode=tests]`) — each case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.                                                                                                             |
| **Spec review converged** (`review-converged`)              | `$pbi --mode=review` on the spec and on its test/evidence cases, including the BLOCKING **M1-M7** gate (tech-agnostic intent prose, business-visible cases); validated findings fixed and re-reviewed.                                                                                                                                                                                  |
| **Decisions clarified**                                     | `$spec [mode=clarify]` in authored-spec context: every NON-OBVIOUS, CONFLICTS and high-impact decision confirmed by the user and written to the native role and its decision record; residual confidence below 80% stays an Open Question. Depth scales with the triage; it always records at least the OBVIOUS decisions and its verdict.                                                   |
| **Docs synced**                                             | `$docs-manager --mode=update` synced the spec, its configured test/evidence carrier, and only declared derived indexes.                                                                                                                                                                                                                                                                              |
| **Run closed** (`run-closed`)                               | `$workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                                                                     |

**Profile rules.** Native profile/local contract owns paths, section roles, IDs, provisional state and case/evidence carriers. Keep intent tech-agnostic; permitted technical detail belongs only in declared contract/evidence roles. Only when neither contract exists, use `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`: eight tech-free sections, inline §5 Mermaid ERD, §6.2–§6.5 UI interaction intent, and Section 8 `TC-{FEATURE}-{NNN}` cases with `Evidence: TBD`, `Status: Planned`, `provisional: true`. Unknown mapping or missing coverage stays BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE. Never invent sections, IDs, provisional fields or a second case registry.

## 3. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                      | Proves / feeds                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `$web-research` → `$source-deep-dive`                        | external market, competitor or best-practice evidence would change the spec (source-deep-dive only when web-research ran)                                   | evidence base for the brainstorm                            |
| `$brainstorm`                                             | always; short for XS, Double Diamond (POV/5 Whys/JTBD/HMW → OST or Lean Canvas → SCAMPER → converge) for M+                                              | converged capability → scope gate                           |
| `$spec [mode=discovery]`                                         | any canonical spec or related code exists; short-circuits with a recorded reason on an empty corpus                                                      | overlap/gap/invariant landscape + NEW/EXTEND/SPLIT decision |
| `$scenario`                                               | the decomposition or scope needs adversarial replay, state, ownership, persistence, recovery or evidence analysis                                        | risks feeding the spec's invariants                         |
| `$domain-analysis`                                        | new or changed domain entities/aggregates                                                                                                                | entity model for the spec                                   |
| `$why-review` (framing)                                   | the problem framing is not already validated, or credible alternatives exist — PASS proceeds, WARN needs user acknowledgment, FAIL returns to brainstorm | right problem before authoring                              |
| `$idea`                                                   | a durable idea artifact is needed (several capabilities, stakeholder handoff, later backlog chain)                                                       | idea record under the configured team artifacts root        |
| `$spec [mode=draft]` · `$spec [mode=tests]`               | always (the spec-driven core)                                                                                                                            | spec authored gate                                          |
| `$pbi --mode=review --type=spec-tests` · `$pbi --mode=review` | always; depth scales with case count and ambiguity                                                                                                       | review-converged gate                                       |
| `$design-spec`                                            | the idea has a user-facing UI; UI specs only (no mockup, no backlog), seeded from the profile's interaction-intent owner                                 | UI intent companion to the spec                             |
| `$spec [mode=clarify]`                                           | always (depth by triage)                                                                                                                                 | decisions-clarified gate                                    |
| `$why-review` (rationale)                                 | recommended; may merge into the artifact review for XS/S specs with no open decision                                                                     | rationale + completeness of the authored spec               |
| `$docs-manager --mode=update`                                            | always                                                                                                                                                   | docs-synced gate                                            |
| `$feature-presentation`                                   | several stakeholders review the spec (M+, UI, several capabilities, or on request); spec-only deck, no HTML mockups                                      | stakeholder review input                                    |
| `$workflow-end` → `$watzup`                               | always, last                                                                                                                                             | run-closed gate + handoff                                   |

## 4. Orchestration Freedom

Choose inline/delegated work, waves, batching and order through the Step Execution Protocol. Preserve dependencies: author before review/clarification; land clarification fixes before rationale review and docs sync; re-verify fixes; `$workflow-end` closes the run; never parallelize user approvals. XS/S runs inline. For 4+ capabilities spawn one `spec` agent per capability in ONE message, with framing, resolved profile and output path.

## 5. Memory, Reporting and Fix Path

- Track each selected step per capability. Write the `tmp/reports/` report FIRST; append per step and re-read it with the task list after compaction.
- Write artifacts immediately to their configured roots (plans, team artifacts, business specs); never batch.
- Validate findings with evidence, fix in the owning spec role, then re-run the raising review. Round 1 exits on zero open findings (LOW deferral); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs deferred. Cap 3 review rounds; escalate via `ask user question tool` on no progress.
- **Provisional output:** use the profile's planned-evidence convention before code exists. The first `workflow-code-to-spec` / `spec [mode=update]` against real code reconciles planned cases with executable proof; clear provisional markers only when the profile's acceptance rule passes.
- **Handoff at close:** canonical spec paths, case/evidence coverage, open questions below 80% confidence, the presentation path when produced, and the next route — `workflow-spec-to-pbi` for a backlog or `workflow-implement-spec` to build.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn a raw idea, vision or problem into one reviewed, docs-synced provisional canonical spec per converged capability, with planned cases under the configured artifact contract; stop before backlog or implementation.

**MUST ATTENTION Main steps:** Triage/profile → conditional research/deep dive → brainstorm/discovery → scenario/domain/framing review → idea → draft/tests → case/spec review → UI design → clarify/rationale → docs sync → presentation → close/wrap-up.

- **MUST ATTENTION** triage FIRST (size band, kinds, risk, `isLargeIdea`); it selects the optional steps and their depth. Any large-idea signal → the complete `large_idea_decomposition` block in the profile's slice-plan role.
- **MUST ATTENTION** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the spec quality gates always hold: spec + planned cases authored, `$pbi --mode=review` converged with the M1-M7 gate, `$spec [mode=clarify]` confirmed every non-obvious decision with the user, `$docs-manager --mode=update` synced, `$workflow-end` closed.
- **NEVER** produce PBIs, stories, mockups or a roadmap artifact here; never auto-select scope — confirm it with the user.
- **MUST ATTENTION** one task per selected step, report in `tmp/reports/` written first and re-read after compaction; every case names the business intent it guards.

| Evasion | Required action |
| --- | --- |
| "Small idea, skip gates" | Scale depth; keep scope confirmation, review, clarity, sync and closure. |
| "Planned cases prove implementation" | Keep provisional markers until executable proof meets the profile's acceptance rule. |
