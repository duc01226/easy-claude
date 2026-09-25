---
name: idea
version: 1.1.0
description: '[Project Management] Use when a workflow step or the user asks for an idea to be captured. Records new ideas, feature requests or concepts for later refinement.'
---

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

**Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored backlog artifact ready for `/refine` to convert into a PBI — preserving problem intent without leaking solution or stack choices.

**Summary:**

- **Purpose:** capture raw idea as structured, validated backlog artifact; preserve problem intent, keep the problem statement tech-agnostic with no solution/stack/IDs, and hand clean narrative to `/refine`.
- **Main steps/tasks (run in order):** (1) Gather problem/value/users/scope; (2) Generate `IDEA-{YYMMDD}-{NNN}` draft from `idea-template.md`; (3) Capture problem/value/users; (4) Detect module by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) silently, prompting only if ambiguous/no match; (5) Load feature context (8-12K tokens: entities, BR-/TC patterns); (6) Save canonical artifact; (6.5) **Discovery Interview** — 3-5 `AskUserQuestion`; (7) **Validate** — 2-3 `AskUserQuestion`; (8) Suggest `/refine`.
- **Modes/gates:** Existing repo → silently detect module and load context; Greenfield → skip module detection and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack. Discovery Interview (Step 6.5: 3-5 questions incl. always-on testability) and Validation (Step 7: 2-3 questions) are NON-NEGOTIABLE.
- **Output:** Persist to `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) with `t_shirt_size`; downstream PBI owns `FR-`/`BR-` IDs and inherits the clean narrative.

> **MANDATORY IMPORTANT MUST ATTENTION** TaskCreate task to READ `project-structure-reference.md` — project patterns and structure. Not found → search project documentation, coding standards, architecture docs.

**Workflow:**

1. **Gather Info** — Ask problem, value, scope, target users
2. **Generate Artifact** — Create `IDEA-YYMMDD-NNN` file from template with `draft` status
3. **Capture Details** — Record problem statement, value, target users
4. **Detect Module** — Auto-match module and load feature context from docs
5. **Load Context** — Read related module/feature docs within the 8-12K budget
6. **Save Artifact** — Persist to the canonical ideas path
6.5. **Discovery Interview** — `AskUserQuestion` 3-5 structured questions (MANDATORY)
7. **Validate** — `AskUserQuestion` 2-3 questions (MANDATORY)
8. **Suggest Next** — Point to `/refine` for PBI creation

**Key Rules:**

- Output: `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
- Validation NEVER optional — MANDATORY.
- Auto-detect module silently; prompt only when ambiguous or no match.
- MUST ATTENTION include `t_shirt_size` (XS/S/M/L/XL) in artifact for early sizing
- **[BLOCKING] Tech-agnostic output (M1):** Keep the problem statement tech-agnostic in all modes per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path); name no framework/product/language/design-pattern; defer stack preference to tech research.
- **M3 Logical-ID Assignment (forward to PBI):** Ideas assign no logical IDs. When advanced via `/refine`, the PBI assigns `FR-`/`BR-` IDs as the PRIMARY citation spine and carries `[Source: namespace/service/id]` abstract anchors separately from business-intent prose; never put physical code coordinates or repository-root paths in the idea. Keep problem/value narrative free of source identifiers so the PBI inherits it cleanly.

## Greenfield Mode

> **Auto-detected:** No codebase means no discovered source directories, manifest files, or populated `project-config.json`; planning artifacts (`docs/`, `plans/`, `.claude/`) don't count. Require actual code directories with content.

**Greenfield actions:**

1. Skip module detection (no modules exist yet)
2. Skip `project-structure-reference.md` (won't exist)
3. Focus on market gap, competitors, differentiation
4. Keep problem statement tech-agnostic
5. Enable WebSearch for market/competitor context
6. Increase `AskUserQuestion` frequency — capture vision, constraints, team profile, scale expectations
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

> **Artifact Path (canonical convention)** — Command `/idea` → base path `ideas/` inside the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), role token `po`, type `idea`. Filename pattern: `{YYMMDD}-{role}-{type}-{slug}.md` → e.g. `260119-po-idea-dark-mode-toggle.md`. Slug = lowercased basename, non-alphanumeric → `-`, trimmed, max 50 chars.

### Step 6.5: Discovery Interview (MANDATORY)

Use `AskUserQuestion` for 3-5 structured questions. Each MUST ATTENTION have 2-4 options, one marked "(Recommended)".

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

Use `AskUserQuestion` for 2-3 validation questions:

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

After capture, use `AskUserQuestion`:

1. `/refine` — Refine into PBI (Recommended)
2. `/spec [mode=tests]` — Jump straight to test spec
3. `/plan` — Start implementation planning

Output: "Idea captured! To refine into a PBI, run: `/refine {filename}`". If detected, add: "Module context from {module} will be used during refinement."

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
/idea "Dark mode toggle for settings"
# Creates: <team-artifacts root>/ideas/260119-po-idea-dark-mode-toggle.md

/idea "Add goal progress tracking notification"
# Creates with module context: <team-artifacts root>/ideas/260119-po-idea-goal-progress-notification.md
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If not already in a workflow, MUST ATTENTION use `AskUserQuestion`:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** via `/start-workflow workflow-idea-to-pbi` (Recommended) — idea → refine → artifact-review --type=pbi → story → artifact-review --type=story → prioritize
> 2. **Execute `/idea` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** After completion, use `AskUserQuestion`:

- **"/refine (Recommended)"** — Transform idea into actionable PBI
- **"/web-research"** — Idea needs market research first
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** Before starting, use `TaskCreate` for small tasks, including each file read. For simple tasks, AI MUST ATTENTION ask whether to skip.

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
- **MANDATORY** An explicit `referenceDocs` array is exact, including `[]`; absent → only the capability-aware resolver output, which may be empty. `lessons.md` and docs-index are always-on, outside that selection. A missing/stale required input or malformed declared section → `/project-init` or the narrow owner route before relying on it.
- **MANDATORY** Pick docs by the phase you are about to enter — plan/investigate, edit code, tests, specs/docs, review — from the gate's routing table, JUST IN TIME before the first target read/grep/edit/test, plus the file's `contextGroups[]` conventions before editing it; cite `Reference docs read: ...`.
- **MANDATORY** Dedup: skip a re-read only for your own full read after the last compaction, within ~200K tokens, unchanged since — a hook reminder, summary, or prior mention is NEVER evidence; re-read after compaction or resume, and give delegated sub-agents the resolved doc paths. Project config and conventions override generic framework defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn a vague product idea into a validated, tech-agnostic, module-anchored backlog artifact ready for `/refine` to convert into a PBI — preserving problem intent without leaking solution or stack choices.

**IMPORTANT MUST ATTENTION — Main steps (run in order, NEVER skip/reorder):** (1) Gather info; (2) Generate artifact `IDEA-{YYMMDD}-{NNN}` draft from `idea-template.md`; (3) Capture problem/value/users; (4) Detect module by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path); (5) Load feature context (8-12K budget); (6) Save to canonical path; (6.5) Discovery Interview (`AskUserQuestion` 3-5); (7) Validate (`AskUserQuestion` 2-3); (8) Suggest next → `/refine`. — why: AI keeps dropping the skill's own mid-pipeline steps; the two gates and module detection are the most-forgotten.

**IMPORTANT MUST ATTENTION** Mode gate: existing codebase → detect module and load context; Greenfield → skip module and structure reads, use market/WebSearch context, ask business questions more often, and NEVER ask about tech stack.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **UI Wireframe:** classify each component into ONE tier; search libs first, reuse ≥80% match.
- **AI-SDD M1–M3:** Keep idea prose tech-agnostic business intent; defer logical IDs and `[Source: ...]` carriers to the downstream PBI.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim; confidence >80% to act; never present guess as fact.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.

**IMPORTANT MUST ATTENTION** Discovery Interview (Step 6.5) + Validation (Step 7) NEVER optional — run BOTH `AskUserQuestion` gates even for "simple" ideas — why: discovery uncovers hidden constraints, validation confirms problem framing; different question categories
**IMPORTANT MUST ATTENTION** ALWAYS keep problem statement tech-agnostic (M1, `spec-principles.md` §3, all modes) — name no framework/product/language/design-pattern; defer any stack preference to the later tech-research phase — why: PBI inherits the narrative cleanly downstream
**IMPORTANT MUST ATTENTION** in greenfield mode NEVER ask about tech stack — acknowledge a volunteered preference, then defer to the business-evaluation phase — why: stack is a research-driven decision after business analysis, not a capture-time guess
**IMPORTANT MUST ATTENTION** `TaskCreate` break ALL work into small tasks BEFORE starting — including a task to READ `project-structure-reference.md` (skip in greenfield — it won't exist)
**IMPORTANT MUST ATTENTION** validate all decisions with user via `AskUserQuestion` — NEVER auto-decide — and NEVER show confidence levels on an auto-detected module match
**IMPORTANT MUST ATTENTION** auto-detect module silently by globbing `*/README.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — prompt only when ambiguous or no match; greenfield → skip module detection — why: confirm with `Glob()` evidence, not assumption
**IMPORTANT MUST ATTENTION** assign NO logical IDs (M3) — an idea is tech-agnostic business intent only; the downstream PBI owns `FR-`/`BR-` assignment and `[Source: namespace/service/id]` anchors — why: keep the problem/value narrative free of source identifiers so the PBI inherits it cleanly
**IMPORTANT MUST ATTENTION** include `t_shirt_size` (XS/S/M/L/XL) in the artifact and keep the feature-context load within the 8-12K token budget — why: early sizing feeds prioritization; over-budget reads dilute attention
**IMPORTANT MUST ATTENTION** persist to `ideas/{YYMMDD}-{role}-idea-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), then hand off to `/refine` for PBI conversion — why: canonical path keeps downstream tooling aligned
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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** the 3 rules to never skip: (1) run BOTH Discovery + Validation `AskUserQuestion` gates; (2) keep the problem statement tech-agnostic (no stack/IDs); (3) cite `file:line` evidence, confidence >80% to act.
