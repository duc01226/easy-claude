---
name: ai-context-refresh
version: 1.0.0
description: '[Documentation] Use when initializing, updating, smart-merging, or refactoring portable project AI context and its Claude/Codex projections.'
---

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
- `/sync-codex` owns Codex mirror generation; this skill owns the root AI-context lifecycle and calls the same runner only after its explicit init/update/refactor work is complete

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

Run `/ai-context-refresh` (or the generator directly) to produce `CLAUDE.md` from
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
`/sync-codex`; this skill invokes that runner directly after its final source edit, rather than recursively invoking
the skill. A full `/sync-codex` invocation performs its own CLAUDE.md preflight before mirror generation.

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
  `/ai-context-refresh --mode update`, preserve the project instructions through AI smart-merge, then rerun sync.
- The handoff uses the runner directly, not a nested `/sync-codex` skill call, so there is no recursion or duplicate
  source generation. If the runner fails, report the failing stage and do not claim that Codex mirrors are current.

## Modes

| Mode       | When                                     | Behavior                                                                                                                |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `init`     | No CLAUDE.md exists, or first-time setup | Generate fresh CLAUDE.md from template + config. Populates all markers.                                                 |
| `update`   | CLAUDE.md exists with markers            | Replace only content between markers. Preserve everything else.                                                         |
| `refactor` | CLAUDE.md exists, needs optimization     | AI reads entire CLAUDE.md, optimizes for token efficiency, removes redundancy, improves structure. No script — pure AI. |

## Prerequisites

- `docs/project-config.json` — primary data source (run `/project-config` first if missing)
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
- [ ] A discovery defect inside a `SECTION:*` block is fixed in its builder, the template or `docs/project-config.json`, then regenerated — never hand-edited; hand-owned prose that changed ran `/prompt-enhance`

## Phase 5: Sync Codex mirrors (after the final CLAUDE.md edit)

Writing/updating CLAUDE.md makes the generated mirror surfaces stale — `AGENTS.md` (Codex), the
`.codex/` mirrors, and other downstream surfaces are derived FROM CLAUDE.md. They must be regenerated
only after the final AI fill/refactor and verification, otherwise the mirrors can capture an intermediate
source state.

**MUST add a final todo task — "Sync Codex mirrors from updated CLAUDE.md" — after
init/update/refactor and verification complete.** When CLAUDE.md content changed, execute the shared
standalone runner directly:

```text
TaskCreate: "Sync Codex mirrors from updated CLAUDE.md → invoke /sync-codex"
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md
```

`--skip=claude-md` is intentional: this skill has just completed the root-source lifecycle, so the
runner must start at mirror generation and still execute every configured verification stage. The
direct node call is the authorized completion handoff of an explicit `/ai-context-refresh` request; it is
not an autonomous invocation of the user-facing `/sync-codex` skill. Skip the task only when no
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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**MUST ATTENTION** AI-read docs: purpose + critical rules on top, closing reminders at the bottom when long; route to other docs as `read <path> when <situation>` with existing targets only, no orphan docs, N/A named once as a skip; token-efficient per `/prompt-enhance`; fix generated docs at their source; run the final gate on every changed doc.

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** execute in order: preflight config and detect mode → generate/update or AI smart-merge/refactor while preserving unmanaged content → AI-fill and verify markers/placeholders/portability plus the AI-discovery gate → run the standalone `/sync-codex` runner with `--skip=claude-md` after final root edits and verify every Codex mirror

| Evasion | Rebuttal |
| --- | --- |
| "It is only a rename" | Trace canonical sources, generated mirrors, catalogs, routes, and tests. |
| "The mirrors are already current" | Run the sync and divergence gates; stale derived output is not completion. |
| "Hand-fix the Codex copy" | Edit `.claude/**` sources, then regenerate `.agents/`, `.codex/`, and `AGENTS.md`. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
