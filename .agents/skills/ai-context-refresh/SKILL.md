---
name: ai-context-refresh
description: '[Documentation] Use when initializing, updating, smart-merging, or refactoring portable project AI context and its Claude/Codex projections.'
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

**Goal:** Refresh the portable project AI-context lifecycle — generate or update the Claude root context from project-config.json + template, preserve project instructions through smart merge/refactor, and refresh Codex projections.

**Summary:**

- Preflight config and detect `init`, `update`, markerless `smart-merge`, or AI-only `refactor` mode.
- Generate/update root context from config + template while preserving unmanaged project instructions.
- AI-fill and verify markers, placeholders, portability, and project-specific content.
- After final root edits, run the standalone sync runner with `--skip=claude-md`; verify every Codex mirror and report failures.

**Workflow:**

1. **Detect Mode** — init (no root context or `--mode init`), update (`--mode update`), refactor (`--mode refactor`)
2. **Run Generator** — `node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode <mode>`
3. **AI Fill** — Review output, fill creative sections (project description, golden rules inference)
4. **Verify** — Confirm output is valid, no project-specific leaks from template, and the AI-discovery gate passes (project purpose + critical rules on top, Doc Lookup triggers to existing docs, closing reminders at the bottom)
5. **Sync Codex Mirrors** — After the final AI edits and verification, run the shared standalone runner with `--skip=claude-md` so `AGENTS.md`, `.agents/`, and `.codex/` are regenerated from the finished `CLAUDE.md`.

**Key Rules:**

- Generic — works in any project by reading `docs/project-config.json`
- Section markers (`<!-- SECTION:key -->`) enable incremental updates without overwriting user content
- Conditional sections — generated ONLY when config has matching data; empty config = section omitted
- Static framework sections (8 total) are portable across all projects
- `$sync-codex` owns Codex mirror generation; this skill owns the root AI-context lifecycle and calls the same runner only after its explicit init/update/refactor work is complete

## Bootstrap Gate (when CLAUDE.md is missing or incomplete)

This skill is the **AI-runnable** route the agent-files bootstrap gate offers when a portable
`.claude` install lands in a project without a root `CLAUDE.md` — or with one that carries only
project-specific knowledge and is missing the universal portable guides. A single hook detects the gap
and routes here (shared detection lib: `.claude/hooks/lib/agent-files-state.cjs`):

- `init-prompt-gate.cjs` (UserPromptSubmit) — blocks the first prompt once `project-config.json`
  is populated but `CLAUDE.md` / `AGENTS.md` is missing **or incomplete**. This UserPromptSubmit
  gate is the sole agent-files bootstrap router.

**Three-state detection** per root file: `missing` → routes to `--mode init` (fresh from template);
`incomplete` → routes to `--mode update` (smart-merge — preserves your project content, injects the
guides); `ok` → no block. Completeness is decided by `hasUniversalGuides()`: a current-or-newer
sentinel (`<!-- CK:UNIVERSAL-GUIDES v7 -->`) → complete; an older sentinel → flag for update; no
sentinel → fall back to scanning required anchors (Workflow Step Advancement,
Task Planning Rules, Code Responsibility Hierarchy, Evidence-Based Reasoning) so legacy/hand-written
complete files still pass.

Run `$ai-context-refresh` (or the generator directly) to produce `CLAUDE.md` from
`docs/project-config.json` + template. The generated file ships the canonical workflow gate and universal guides
(workflow execution barriers for explicitly invoked workflows, task planning, code hierarchy,
naming, and evidence rules) and stamps the sentinel at the top so the gate recognizes it as
complete. It removes legacy `CK:WORKFLOW-GATE`, `CK:WORKFLOW-SKILLS`, and generated
`## First Action Decision` content before stamping the canonical routing gate into tracked files.

**Default-on workflow routing** is stamped into tracked context by this skill. A team can disable it
in tracked `docs/project-config.json`:

```jsonc
{ "portability": { "workflowAutoDetect": false } }
```

A developer can override the team value in `.claude/.ck.local.json`, which the portable bundle's
`.claude/.gitignore` excludes:

```jsonc
{ "portability": { "workflowAutoDetect": true } }
```

Resolution is default `true` → tracked team value → developer-local value, with the last valid
boolean winning. The tracked value controls generated context; the local value controls only the
runtime refresh hook so one developer cannot rewrite shared files. Missing, malformed, and non-boolean layers fall through. The hook emits only on
`UserPromptSubmit`, never blocks a prompt, and records delivery per session and content hash. It
re-injects after compaction, a content change, or about 4.5 MB of transcript growth (the existing
framework proxy for roughly 200k tokens); hosts without a measurable transcript use a bounded age
fallback. While the effective value is off, the hook delivers a short routing-OFF notice instead,
which supersedes the tracked gate's auto-select for that checkout. Explicitly named skills and
workflows remain available through normal host discovery.

The optional **custom route protocol** (`portability.workflowRouteProtocol`, team or developer-local)
is RUNTIME-ONLY: `workflow-route-inject.cjs` appends it at `UserPromptSubmit`, and it must NEVER be
stamped into tracked `CLAUDE.md`/`AGENTS.md`/Codex context. A valid local value replaces the team
value. This skill ignores it entirely when generating tracked files.

**Opt-out (universal guides)** — to keep a project-only `CLAUDE.md`/`AGENTS.md` (your custom knowledge, none of the
universal guides), set `portability.requireUniversalGuides: false` in `docs/project-config.json`
(persistent; default `true`). The gate then checks only existence, never completeness. The transient
`skip init` escape still dismisses both hooks for 24h. The gate is dormant in empty/greenfield folders
and before config is populated. `AGENTS.md` and the other Codex surfaces are generated by the shared runner owned by
`$sync-codex`; this skill invokes that runner directly after its final source edit, rather than recursively invoking
the skill. A full `$sync-codex` invocation performs its own CLAUDE.md preflight before mirror generation.

**Just-in-time path rules** — when inlined `contextGroups[].rules` push the root past its byte budget, set
`portability.inlinePathRules: false` in `docs/project-config.json` (default `true`). `SECTION:golden-rules` then
names each rule-bearing group and points to the file-conventions hook, which injects the full rules when a
matching file is touched, and its `--lookup` CLI — the non-automatic carrier for shell reads and hookless hosts
(the spec's BR-PFCI-13 exception). Compact form requires BOTH `conventionInjection.enabled: true` AND an available
conventions lib (`.claude/hooks/lib/file-conventions.cjs`), with every rule-bearing group deliverable (named,
unique) and ranked within the per-path class cap (`conventionInjection.maxClassesPerEdit`), and a worst-case digest (longest accepted path, the largest rule sets the cap admits) within `conventionInjection.maxChars`; otherwise the rules stay inline and the generator prints `[WARN] INLINE_PATH_RULES` naming the missing
precondition. Never hand-compact that section instead — `--mode update` regenerates it.

## Coordination with sync-codex

`ai-context-refresh` and `sync-codex` remain separate user-facing skills with one executable pipeline:

- `ai-context-refresh` owns root-context authoring and the AI smart-merge/refactor decision. After init/update/refactor and the
  final AI fill, it runs `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md`.
- `sync-codex` owns generated outputs and verification. Its full run starts with a `claude-md` preflight: missing
  `CLAUDE.md` is initialized, marker-managed content is updated, and `portability.requireUniversalGuides: false`
  may accept a markerless project-only root.
- A markerless root with universal guides required is never overwritten by preflight. Run
  `$ai-context-refresh --mode update`, preserve the project instructions through AI smart-merge, then rerun sync.
- The handoff uses the runner directly, not a nested `$sync-codex` skill call, so there is no recursion or duplicate
  source generation. If the runner fails, report the failing stage and do not claim that Codex mirrors are current.

## Modes

| Mode       | When                                     | Behavior                                                                                                                |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `init`     | No CLAUDE.md exists, or first-time setup | Generate fresh CLAUDE.md from template + config. Populates all markers.                                                 |
| `update`   | CLAUDE.md exists with markers            | Replace only content between markers. Preserve everything else.                                                         |
| `refactor` | CLAUDE.md exists, needs optimization     | AI reads entire CLAUDE.md, optimizes for token efficiency, removes redundancy, improves structure. No script — pure AI. |

## Prerequisites

- `docs/project-config.json` — primary data source (run `$project-config` first if missing)
- Node.js available (for generator script)

## Phase 1: Detect Mode

```bash
# Check CLAUDE.md state
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --detect
```

**Decision logic:**

- No CLAUDE.md → `init`
- CLAUDE.md with markers → `update`
- CLAUDE.md without markers → `smart-merge` (see below)
- User explicit `--mode` flag → override detection

## Phase 2: Run Generator Script

```bash
# Init mode: generate fresh CLAUDE.md
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode init

# Update mode: sync marked sections only
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode update
```

**Script behavior:**

1. Reads `docs/project-config.json`
2. Reads template (`references/claude-md-template.md`) for init, or existing CLAUDE.md for update
3. Calls section builders to generate content for each marker key
4. Writes output to `CLAUDE.md` (creates backup `.claude-md.backup` first)
5. Outputs report: which sections were generated, which skipped (no data), which preserved

### Smart-Merge (Update on CLAUDE.md Without Markers)

When running update on an existing CLAUDE.md that has NO section markers:

1. Read existing CLAUDE.md
2. Match sections by `##` heading text against known section keys (see `references/section-registry.md`)
3. For each matched section: wrap with markers, replace content with generated content
4. For unmatched user sections: preserve as-is (no markers added)
5. Write output with backup

## Phase 3: AI Fill (Post-Script)

After the script generates the mechanical parts, AI reviews and fills:

1. **Project description** in TL;DR — write a concise 2-3 sentence description based on config + codebase
2. **Golden rules** — preserve each contextGroups group's name, matchers, exclusions, and rule scope; never promote a path-scoped rule to a global reminder.
3. **Decision quick-ref** — use explicit pattern declarations and project references; never infer architecture from database, broker, framework, or resource presence alone.
4. **Naming conventions** — detect from codebase patterns if not in config

## Phase 4: Verify

- [ ] CLAUDE.md is valid markdown
- [ ] All section markers are properly paired (open + close)
- [ ] No template placeholder text remains (e.g., `{project-name}`, `TODO`)
- [ ] No `.claude/skills/ai-context-refresh/` implementation paths leak into generated project context (self-reference)
- [ ] Conditional sections with no data are omitted (not empty stubs)
- [ ] **AI-discovery gate (`SYNC:ai-discovery-doc-quality`):** the first screen carries the project purpose (the `tldr` line), the discovery order (config → docs index + `lessons.md` → Doc Lookup row) and the critical rules; every Doc Lookup / path-routing row names a trigger and an existing target; a not-applicable doc appears once as a skip; the file ends with closing reminders repeating the critical rules (the template's final `Critical reminders:` line)
- [ ] A discovery defect inside a `SECTION:*` block is fixed in its builder, the template or `docs/project-config.json`, then regenerated — never hand-edited; hand-owned prose that changed ran `$prompt-enhance`

## Phase 5: Sync Codex mirrors (after the final CLAUDE.md edit)

Writing/updating CLAUDE.md makes the generated mirror surfaces stale — `AGENTS.md` (Codex), the
`.codex/` mirrors, and other downstream surfaces are derived FROM CLAUDE.md. They must be regenerated
only after the final AI fill/refactor and verification, otherwise the mirrors can capture an intermediate
source state.

**MUST add a final todo task — "Sync Codex mirrors from updated CLAUDE.md" — after
init/update/refactor and verification complete.** When CLAUDE.md content changed, execute the shared
standalone runner directly:

```text
Task tracking: "Sync Codex mirrors from updated CLAUDE.md → invoke $sync-codex"
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md
```

`--skip=claude-md` is intentional: this skill has just completed the root-source lifecycle, so the
runner must start at mirror generation and still execute every configured verification stage. The
direct node call is the authorized completion handoff of an explicit `$ai-context-refresh` request; it is
not an autonomous invocation of the user-facing `$sync-codex` skill. Skip the task only when no
CLAUDE.md content actually changed. If the runner fails, keep this task incomplete and report the
failing stage and exact recovery command.

## Refactor Mode (AI-Only)

When `--mode refactor` or user asks to optimize CLAUDE.md:

1. Read entire CLAUDE.md
2. Identify: redundant sections, verbose explanations, duplicate info available in referenced docs
3. Apply token efficiency: remove duplication, consolidate tables, shorten where possible
4. Preserve all section markers
5. Report: lines before/after, sections changed, estimated token savings

## Section Marker Protocol

```markdown
<!-- SECTION:tldr -->

Auto-generated content here...

<!-- /SECTION:tldr -->
```

**Rules:**

- Only content between markers is replaced on update
- Content outside markers is never touched
- Missing markers in update mode → section skipped (not inserted)
- Init mode uses template which includes all markers
- Markers use lowercase kebab-case keys matching section-registry.md

## Section Keys (Quick Reference)

See `references/section-registry.md` for full mapping. Summary:

| Key                   | Source                                  | Conditional?              |
| --------------------- | --------------------------------------- | ------------------------- |
| `tldr`                | `project.*`, `modules[]`, `framework.*` | No — always generated     |
| `golden-rules`        | `contextGroups[].rules`                 | Yes — skip if no rules    |
| `decision-quick-ref`  | `modules[]`, `framework.*`              | Yes — skip if no modules  |
| `key-locations`       | `modules[].pathRegex`                   | Yes — skip if no modules  |
| `dev-commands`        | `testing.commands`, `infrastructure.*`  | Yes — skip if no commands |
| `infra-ports`         | `modules[].meta.port` (infra)           | Yes — skip if no ports    |
| `api-ports`           | `modules[].meta.port` (services)        | Yes — skip if no ports    |
| `integration-testing` | `framework.integrationTestDoc`          | Yes — skip if no doc; doc declared N/A in `referenceDocs` → one-line skip notice |
| `e2e-testing`         | `framework.e2eTestDoc` / `e2eTesting.guideDoc`, `testing.frameworks[]`, `e2eTesting.framework`, or `e2eTesting.execution` | Yes — skip only when no guide doc AND no E2E evidence/profile; guide declared N/A with no evidence → one-line skip notice |
| `doc-index`           | Scan `docs/` directory                  | Yes — skip if no docs/    |
| `doc-lookup`          | `modules[]`, spec rows, `referenceDocs[]` (N/A via `notApplicable: true` or an N/A purpose → named once as a skip), docs index, `lessons.md`, ADRs, `.claude/docs` — only files that exist | No — always generated; heading `## Doc Lookup — What to Read When`, back-filled onto older roots on `--mode update`, projected first into `AGENTS.md` |

## Running Tests

Generator + bootstrap-gate coverage lives in the hooks test suite:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-files
```

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-discovery-doc-quality` — Keep AI-read docs discoverable: rules first, routed pointers, closing reminders; writing a doc that an agent reads → .claude/skills/shared/protocols/ai-discovery-doc-quality.md
- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `output-quality-principles` — Token-efficient output without losing quality; writing generated docs or reports → .claude/skills/shared/protocols/output-quality-principles.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** maintain >=8 rules per 100 lines. Critical rules in first+last 5 lines. Tables over prose.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-discovery-doc-quality:reminder -->

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `$prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

<!-- /SYNC:ai-discovery-doc-quality:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Refresh the portable project AI-context lifecycle — generate or update the Claude root context from project-config.json + template, preserve project instructions through smart merge/refactor, and refresh Codex projections.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below.

- **Critical Thinking:** apply critical + sequential thinking; traced proof, confidence >80% to act.
- **Output Quality:** token-efficient — no inventories/trees/TOCs; tables over prose.
- **AI-Discovery Doc Quality:** project purpose + critical rules on top, reminders at the bottom, every cross-doc pointer a `read <path> when <situation>` trigger to an existing target; fix generated sections at their source.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** execute in order: preflight config and detect mode → generate/update or AI smart-merge/refactor while preserving unmanaged content → AI-fill and verify markers/placeholders/portability plus the AI-discovery gate → run the standalone `$sync-codex` runner with `--skip=claude-md` after final root edits and verify every Codex mirror

| Evasion | Rebuttal |
| --- | --- |
| "It is only a rename" | Trace canonical sources, generated mirrors, catalogs, routes, and tests. |
| "The mirrors are already current" | Run the sync and divergence gates; stale derived output is not completion. |
| "Hand-fix the Codex copy" | Edit `.claude/**` sources, then regenerate `.agents/`, `.codex/`, and `AGENTS.md`. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
