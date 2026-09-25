---
name: idea
description: '[Project Management] Use when a workflow step or the user asks for an idea to be captured. Records new ideas, feature requests or concepts for later refinement.'
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

> **[BLOCKING]** Run declared skill steps in order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Update task tracking before/after each step or sub-skill: `in_progress` → `completed`.
> **[BLOCKING]** Completed steps need brief evidence; skipped steps need an explicit reason.
> **[BLOCKING]** If Task tools are unavailable, maintain an equivalent tracker with synchronized statuses.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **AI-SDD Artifact Contract (M1–M7):** Ideas stay tech-agnostic business intent; logical IDs belong downstream, and abstract `[Source: namespace/service/id]` anchors stay in a separate evidence carrier. Keep physical code coordinates and repository paths out of portable narrative.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate and carrier rules.
> **Project Protocol Overlay:** Resolve only the most-specific matching tier; derive body paths from overlay names, report malformed or missing bodies, and apply surviving rules additively without waiving framework or user-confirmation gates.
> MUST ATTENTION READ `.claude/skills/project-skill-protocol/references/registry.md` for the full resolution contract.

## Quick Summary

**Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored backlog artifact ready for `$refine` to convert into a PBI — preserving problem intent without leaking solution or stack choices.

**Summary:**

- **Purpose:** capture raw idea as structured, validated backlog artifact; preserve problem intent, keep the problem statement tech-agnostic with no solution/stack/IDs, and hand clean narrative to `$refine`.
- **Main steps/tasks (run in order):** (1) Gather problem/value/users/scope; (2) Generate `IDEA-{YYMMDD}-{NNN}` draft from `idea-template.md`; (3) Capture problem/value/users; (4) Detect module by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) silently, prompting only if ambiguous/no match; (5) Load feature context (8-12K tokens: entities, BR-/TC patterns); (6) Save canonical artifact; (6.5) **Discovery Interview** — 3-5 ask the user directly; (7) **Validate** — 2-3 ask the user directly; (8) Suggest `$refine`.
- **Modes/gates:** Existing repo → silently detect module and load context; Greenfield → skip module detection and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack. Discovery Interview (Step 6.5: 3-5 questions incl. always-on testability) and Validation (Step 7: 2-3 questions) are NON-NEGOTIABLE.
- **Output:** Persist to `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) with `t_shirt_size`; downstream PBI owns `FR-`/`BR-` IDs and inherits the clean narrative.

> **MANDATORY IMPORTANT MUST ATTENTION** task tracking task to READ `project-structure-reference.md` — project patterns and structure. Not found → search project documentation, coding standards, architecture docs.

**Workflow:**

1. **Gather Info** — Ask problem, value, scope, target users
2. **Generate Artifact** — Create `IDEA-YYMMDD-NNN` file from template with `draft` status
3. **Capture Details** — Record problem statement, value, target users
4. **Detect Module** — Auto-match module and load feature context from docs
5. **Load Context** — Read related module/feature docs within the 8-12K budget
6. **Save Artifact** — Persist to the canonical ideas path
6.5. **Discovery Interview** — ask the user directly 3-5 structured questions (MANDATORY)
7. **Validate** — ask the user directly 2-3 questions (MANDATORY)
8. **Suggest Next** — Point to `$refine` for PBI creation

**Key Rules:**

- Output: `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
- Validation NEVER optional — MANDATORY.
- Auto-detect module silently; prompt only when ambiguous or no match.
- MUST ATTENTION include `t_shirt_size` (XS/S/M/L/XL) in artifact for early sizing
- **[BLOCKING] Tech-agnostic output (M1):** Keep the problem statement tech-agnostic in all modes per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path); name no framework/product/language/design-pattern; defer stack preference to tech research.
- **M3 Logical-ID Assignment (forward to PBI):** Ideas assign no logical IDs. When advanced via `$refine`, the PBI assigns `FR-`/`BR-` IDs as the PRIMARY citation spine and carries `[Source: namespace/service/id]` abstract anchors separately from business-intent prose; never put physical code coordinates or repository-root paths in the idea. Keep problem/value narrative free of source identifiers so the PBI inherits it cleanly.

## Greenfield Mode

> **Auto-detected:** No codebase means no discovered source directories, manifest files, or populated `project-config.json`; planning artifacts (`docs/`, `plans/`, `.claude/`) don't count. Require actual code directories with content.

**Greenfield actions:**

1. Skip module detection (no modules exist yet)
2. Skip `project-structure-reference.md` (won't exist)
3. Focus on market gap, competitors, differentiation
4. Keep problem statement tech-agnostic
5. Enable WebSearch for market/competitor context
6. Increase ask the user directly frequency — capture vision, constraints, team profile, scale expectations
7. **[CRITICAL] NEVER ask about tech stack during idea capture.** Stack is a research-driven decision AFTER full business analysis (business-evaluation phase); acknowledge volunteered preferences, then defer to tech-stack research.

## Detailed Workflow

### Step 1: Gather Information

- No title → ask: "What's the idea in one sentence?" Ask: "What problem does this solve?" "Who benefits from this?" "Any initial scope thoughts?"

### Step 2: Generate Artifact

- Template: `.claude/docs/team-artifacts/templates/idea-template.md` (framework-owned path — NOT the configurable team-artifacts root in `docs/project-config.json`); ID: `IDEA-{YYMMDD}-{NNN}` (sequential); status: `draft`.

### Step 3: Capture Details

- Document problem statement, expected value, and target users.

### Step 4: Detect Project Module

**Dynamic Discovery:**

1. Glob `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); extract module names from paths; match idea keywords against module keywords.

| Scenario             | Action                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Clear match          | Auto-detect — NEVER show confidence levels                                      |
| Ambiguous / no match | Prompt: "Which project module?" + Glob results + "Cross-cutting/Infrastructure" |
| 2+ modules detected  | Load ALL modules, add all to `related_features`                                 |

**If module detected:**

1. Read `{module}/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) (first 200 lines); extract its Quick Navigation feature list.
2. Add frontmatter: `module: {detected_module}`, `related_features: [Feature1, Feature2]`.

### Step 5: Load Feature Context

1. Read module README overview (~2K tokens); identify closest matching feature(s).
2. Read corresponding feature doc (3-5K tokens); extract related entities, existing business rules (`BR-{MOD}-XXX`), and test patterns (`TC-{FEATURE}-{NNN}`).

**Token Budget:** Target 8-12K tokens total.

### Step 6: Save Artifact

- Path: `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); infer role from context or ask; include detected domain context.

> **Artifact Path (canonical convention)** — Command `$idea` → base path `ideas/` inside the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), role token `po`, type `idea`. Filename pattern: `{YYMMDD}-{role}-{type}-{slug}.md` → e.g. `260119-po-idea-dark-mode-toggle.md`. Slug = lowercased basename, non-alphanumeric → `-`, trimmed, max 50 chars.

### Step 6.5: Discovery Interview (MANDATORY)

Use ask the user directly for 3-5 structured questions. Each MUST ATTENTION have 2-4 options, one marked "(Recommended)".

| Category        | Purpose                           | Example                                   |
| --------------- | --------------------------------- | ----------------------------------------- |
| Problem Clarity | Distinguish problem from solution | "What problem does this solve?" + options |
| User Persona    | Identify primary user             | "Who benefits most?" + role options       |
| Scope           | MVP vs full vision                | "What's smallest valuable version?"       |
| Testability     | Define done?                      | "How would you verify this works?"        |
| Impact          | Business value sizing             | "How many users/processes affected?"      |
| Constraints     | Known blockers                    | "Any technical/business constraints?"     |
| Scale           | Expected load/growth              | "How many users/transactions expected?"   |

> **Greenfield:** NEVER include tech-stack questions; focus on business problem, users, scale, constraints.

**Testability Question (ALWAYS include):** "How would you verify this feature works correctly?" — Options: manual test steps, automated test criteria, metric thresholds.

Document all answers under `## Discovery Interview`.

### Step 7: Validate Idea (MANDATORY)

Use ask the user directly for 2-3 validation questions:

| Category     | Example Question                                      |
| ------------ | ----------------------------------------------------- |
| Problem      | "Is the problem statement clear and user-focused?"    |
| Value        | "What's the expected business value or user benefit?" |
| Scope        | "Any scope boundaries to clarify now?"                |
| Stakeholders | "Who else should review this idea?"                   |

Document answers under `## Validation Summary`; update artifact from them.

**Validation Output Format:**

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed

- {decision}: {user choice}

### Action Items

- [ ] {follow-up if any}
```

### Step 8: Suggest Next Step

After capture, use ask the user directly:

1. `$refine` — Refine into PBI (Recommended)
2. `$spec [mode=tests]` — Jump straight to test spec
3. `$plan` — Start implementation planning

Output: "Idea captured! To refine into a PBI, run: `$refine {filename}`". If detected, add: "Module context from {module} will be used during refinement."

## Output Formats

### Domain Context Section

```markdown
## Domain Context (Project Features)

### Module

{module_name}

### Related Features

- {Feature1} - [docs link]
- {Feature2} - [docs link]

### Domain Entities

- **Primary:** {Entity1}, {Entity2}
- **Related:** {Entity3}

### Existing Business Rules

- BR-{MOD}-XXX: {Brief description}
```

### UI Sketch Section

```markdown
## UI Sketch

### Layout

{Rough ASCII wireframe — see UI wireframe protocol}

### Key Components

- **{Component}** — {purpose} _(tier: common | domain-shared | page/app)_
```

> Search existing libs before proposing new components.
> Backend-only idea: `## UI Sketch` → `N/A — Backend-only change. No UI affected.`

## Examples

Paths below show the default team-artifacts root; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides it.

```bash
$idea "Dark mode toggle for settings"
# Creates: <team-artifacts root>/ideas/260119-po-idea-dark-mode-toggle.md

$idea "Add goal progress tracking notification"
# Creates with module context: <team-artifacts root>/ideas/260119-po-idea-goal-progress-notification.md
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, MUST ATTENTION use ask the user directly:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** via `$start-workflow workflow-idea-to-pbi` (Recommended) — idea → refine → artifact-review --type=pbi → story → artifact-review --type=story → prioritize
> 2. **Execute `$idea` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** After completion, use ask the user directly:

- **"$refine (Recommended)"** — Transform idea into actionable PBI
- **"$web-research"** — Idea needs market research first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Before starting, use task tracking for small tasks, including each file read. For simple tasks, AI MUST ATTENTION ask whether to skip.

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings to `tmp/reports/` — prevents context loss and preserves a deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, or recommendation needs `file:line` proof or traced evidence; confidence >80% acts, <80% verifies first.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md
- `project-reference-docs-guide` — Read the project config and the right reference docs just in time; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-reference-docs-guide.md
- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md
- `ui-wireframe` — Wireframe from the design inputs using the project's component owners; sketching a user interface → .claude/skills/shared/protocols/ui-wireframe.md

<!-- PROTOCOL-GUIDES:END -->

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

**IMPORTANT MUST ATTENTION** Run declared steps in order; NEVER skip, reorder, or merge without explicit user approval.
**IMPORTANT MUST ATTENTION** Set task `in_progress` before each step/sub-skill; set `completed` after.
**IMPORTANT MUST ATTENTION** Completed steps need concise evidence; skipped steps need explicit reasons.
**IMPORTANT MUST ATTENTION** If Task tools unavailable, maintain an equivalent synchronized tracker.

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

**IMPORTANT MUST ATTENTION Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored backlog artifact ready for `$refine` to convert into a PBI — preserving problem intent without leaking solution or stack choices.

**IMPORTANT MUST ATTENTION — Main steps (run in order, NEVER skip/reorder):** (1) Gather info; (2) Generate artifact `IDEA-{YYMMDD}-{NNN}` draft from `idea-template.md`; (3) Capture problem/value/users; (4) Detect module by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); (5) Load feature context (8-12K budget); (6) Save to canonical path; (6.5) Discovery Interview (ask the user directly 3-5); (7) Validate (ask the user directly 2-3); (8) Suggest next → `$refine`. — why: AI keeps dropping the skill's own mid-pipeline steps; the two gates and module detection are the most-forgotten.

**IMPORTANT MUST ATTENTION** Mode gate: existing codebase → detect module and load context; Greenfield → skip module and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **UI Wireframe:** classify each component into ONE tier; search libs first, reuse ≥80% match.
- **AI-SDD M1–M3:** Keep idea prose tech-agnostic business intent; defer logical IDs and `[Source: ...]` carriers to the downstream PBI.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim; confidence >80% to act; never present guess as fact.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.

**IMPORTANT MUST ATTENTION** Discovery Interview (Step 6.5) + Validation (Step 7) NEVER optional — run BOTH ask the user directly gates even for "simple" ideas — why: discovery uncovers hidden constraints, validation confirms problem framing; different question categories
**IMPORTANT MUST ATTENTION** ALWAYS keep problem statement tech-agnostic (M1, `spec-principles.md` §3, all modes) — name no framework/product/language/design-pattern; defer any stack preference to the later tech-research phase — why: PBI inherits the narrative cleanly downstream
**IMPORTANT MUST ATTENTION** in greenfield mode NEVER ask about tech stack — acknowledge a volunteered preference, then defer to the business-evaluation phase — why: stack is a research-driven decision after business analysis, not a capture-time guess
**IMPORTANT MUST ATTENTION** task tracking break ALL work into small tasks BEFORE starting — including a task to READ `project-structure-reference.md` (skip in greenfield — it won't exist)
**IMPORTANT MUST ATTENTION** validate all decisions with user by asking the user directly — NEVER auto-decide — and NEVER show confidence levels on an auto-detected module match
**IMPORTANT MUST ATTENTION** auto-detect module silently by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — prompt only when ambiguous or no match; greenfield → skip module detection — why: confirm with `Glob()` evidence, not assumption
**IMPORTANT MUST ATTENTION** assign NO logical IDs (M3) — an idea is tech-agnostic business intent only; the downstream PBI owns `FR-`/`BR-` assignment and `[Source: namespace/service/id]` anchors — why: keep the problem/value narrative free of source identifiers so the PBI inherits it cleanly
**IMPORTANT MUST ATTENTION** include `t_shirt_size` (XS/S/M/L/XL) in the artifact and keep the feature-context load within the 8-12K token budget — why: early sizing feeds prioritization; over-budget reads dilute attention
**IMPORTANT MUST ATTENTION** persist to `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), then hand off to `$refine` for PBI conversion — why: canonical path keeps downstream tooling aligned
**IMPORTANT MUST ATTENTION** search existing component libraries before proposing any new UI component (≥80% match = reuse); classify each into exactly ONE tier — why: duplicate UI code = wrong tier
**IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence for every claim/recommendation, confidence >80% to act, <80% verify first — why: certainty without evidence is the root of hallucination
**IMPORTANT MUST ATTENTION** add a final review task to verify work quality

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| "Idea is simple, skip interview"          | NEVER skip — discovery uncovers hidden constraints                       |
| "Module is obvious, skip detection"       | Still run `Glob()` — confirm with evidence not assumption                |
| "Validation is redundant after interview" | ALWAYS run both — different question categories                          |
| "Greenfield check is optional"            | Auto-detect is MANDATORY — no manual override                           |
| "User mentioned a framework, capture it"  | Stay tech-agnostic — acknowledge, defer to tech-research phase           |
| "I'll assign FR-/BR- IDs now"             | NO logical IDs at idea stage — the PBI assigns them downstream           |
| "Reuse an existing component? new is faster" | Search libs first — ≥80% match = reuse; new without search = wrong tier |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

**IMPORTANT MUST ATTENTION** the 3 rules to never skip: (1) run BOTH Discovery + Validation ask the user directly gates; (2) keep the problem statement tech-agnostic (no stack/IDs); (3) cite `file:line` evidence, confidence >80% to act.

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
