<!-- Last scanned: 2026-08-04 -->

# Code Review Rules

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Read by review skills and agents through the project-reference-docs gate in CLAUDE.md. -->

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:START -->

## Quick Summary

**Goal:** Review easy-claude changes against the repository's actual CJS hook runtime, canonical-source architecture, skill/agent authoring conventions, and verification gates.

**Summary:**

- Start with the changed artifact's runtime and ownership boundary; use the Decision Trees before applying a checklist.
- Treat `.claude` as authored source and generated mirrors as verification outputs.
- Require repository evidence for findings and observable verification for completion claims.

**Review sequence:** classify the changed artifact → trace its dependencies → apply the relevant rules/checklist → run targeted tests → verify mirrors/docs and stale-term cleanup.

<!-- PROMPT-ENHANCE:QUICK-SUMMARY:END -->

## Critical Rules

1. **Match runtime boundary** — Hooks and hook libraries are strict CommonJS `.cjs`; ESM tooling stays in `.mjs` (`.claude/hooks/graph-session-init.cjs:1-16`; `.claude/scripts/codex/sync-context-workflows.mjs:1-8`).
2. **Centralize event adaptation** — Use `runHook`/`runHookSync` when their lifecycle fits, or the shared parser when explicit blocking-gate exit control is required (`.claude/hooks/lib/hook-runner.cjs:56-175`; `.claude/hooks/lib/stdin-parser.cjs:28-97`).
3. **Separate policy rejection from runtime failure** — Exit `2` only for a proved unsafe operation; malformed input, timeouts, and exceptions remain fail-open unless a tested deny-closed model exists (`.claude/hooks/git-commit-block.cjs:139-163`; `.claude/hooks/lib/hook-runner.cjs:144-175`).
4. **Protect output channels** — stdout carries intentional result/context; diagnostics and rejection reasons use stderr (`.claude/hooks/lib/hook-runner.cjs:79-85,119-125`; `.claude/hooks/lib/debug-log.cjs:34-40,60-66`).
5. **Canonical source before mirrors** — Edit `.claude` owners, then generate `.agents`, `.codex`, and `AGENTS.md`; verify parity and provenance (`.claude/skills/shared/sync-inline-versions.md:3-7`; `package.json:25-39`).
6. **Entrypoints depend inward** — Hook files orchestrate lifecycle events and delegate reusable behavior to `hooks/lib` or focused hook-local subsystems (`.claude/hooks/session-end.cjs:15-48`; `.claude/hooks/doc-sync-gate.cjs:39-40,238-260`).
7. **Evidence before claims** — Every rule, finding, and recommendation needs `file:line`, grep, graph, or command output; completion requires fresh verification.

---

## Backend Rules

### CJS Executable Layer

### File Structure

- Extension: `.cjs` (mandatory)
- Location: `.claude/hooks/<name>.cjs`
- Shared utilities: `.claude/hooks/lib/<name>.cjs`
- File naming: kebab-case (e.g., `privacy-block.cjs`, `session-init.cjs`)
- Cohesion: entrypoints orchestrate one lifecycle event; move reusable or independently testable logic to `hooks/lib` or a focused hook-local subsystem

### Required Patterns

| Pattern                         | How                                                                 | Why                                                   |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Choose one shared event adapter | `runHook`/`runHookSync`, or shared parser for explicit blocker control | Prevent divergent stdin/default/error semantics       |
| Load config when behavior needs it | Use shared config/schema helpers at the owning boundary          | Avoid universal imports and duplicate JSON reads      |
| Use debug logging for diagnostics | `debug`/`debugError` write gated diagnostics to stderr            | Keep stdout clean; user-facing errors remain visible  |
| `'use strict'`                  | Top of every file                                                   | Catch silent errors                                   |
| Make behavior observable        | Export helpers when unit seams help; otherwise cover the process entrypoint | Test behavior without forcing artificial exports |

### Golden-Path Examples

- Standard asynchronous lifecycle: `graph-session-init.cjs` uses `runHook`, returns early when configuration or graph prerequisites are absent, and suppresses result output (`.claude/hooks/graph-session-init.cjs:12-20,34-39`).
- Standard synchronous lifecycle: `session-end.cjs` uses `runHookSync` and delegates cleanup/state operations to shared libraries (`.claude/hooks/session-end.cjs:14-21,27-48`).
- Explicit blocking policy: `privacy-block.cjs` uses shared event parsing, writes its rejection reason to stderr, and exits `2` only after sensitive paths are confirmed (`.claude/hooks/privacy-block.cjs:204-239`).

### Exit Code Rules

| Code | Meaning                              | Use Case                                                                                                                                      |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success / allow / non-critical error | Default for all hooks                                                                                                                         |
| `2`  | Block operation                      | Verified safety/policy violations in `privacy-block`, `path-boundary-block`, `scout-block`, `git-commit-block`, and `windows-command-detector` |

**Rule:** Always exit `0` on errors unless the hook is explicitly a safety blocker. Hooks must be non-blocking by default.

### Error Handling

Runner-managed hooks inherit fail-open exception and timeout handling from `runHook`/`runHookSync` (`.claude/hooks/lib/hook-runner.cjs:87-97,127-136`). Direct-parser blockers must catch runtime failures separately from verified policy rejection, as `privacy-block.cjs` does (`.claude/hooks/privacy-block.cjs:230-248`).

### Performance

- Keep execution fast — hooks run synchronously in the Claude Code pipeline
- No external API calls (network requests)
- Use local checks only (file reads, regex tests, in-memory operations)
- Minimize context injection — truncate to relevant snippets, avoid injecting full documentation files

---

## Frontend Rules

Not applicable to this repository: Phase-0 detection found no frontend application or framework manifest. Skill-local reader/Remotion assets are reviewed within their owning skill boundaries; do not generalize them into application frontend rules (`docs/project-config.json:4-16,105-121`; `docs/project-reference/frontend-patterns-reference.md:7-18`).

---

## Architecture Rules

| Rule | DO — repository evidence | DON'T |
| --- | --- | --- |
| Canonical → generated | Edit `.claude` owners, then run sync + parity/provenance verification (`.claude/skills/shared/sync-inline-versions.md:3-7`; `package.json:25-39`) | Hand-edit `.agents`, `.codex`, or `AGENTS.md`; those consumers are overwritten |
| Entrypoints → libraries | Register lifecycle handlers declaratively and import reusable helpers inward (`.claude/settings.json:44-129`; `.claude/hooks/session-end.cjs:15-48`) | Import top-level hooks from libraries or duplicate reusable infrastructure inside entrypoints |
| One protocol owner | Own shared protocol bodies in `sync-inline-versions.md`; compose verified carriers (`.claude/scripts/lib/hookless-prompt-protocol.cjs:5-39`) | Maintain standalone or copy-pasted protocol bodies without a canonical owner/parity check |
| Narrow security blocking | Normalize untrusted input and exit `2` only after a verified policy breach (`.claude/hooks/path-boundary-block.cjs:87-88,149-154,425-437`) | Treat advisory/context gates or parser failures as security violations |
| Isolated tests | Use temp directories and restore environment state (`.claude/hooks/tests/lib/test-utils.cjs:11-20,156-192`) | Leak cwd, environment variables, or shared temp state across suites |
| Schema-driven config/docs | Keep config shape in the shared schema and doc impact in the shared classifier (`.claude/hooks/lib/project-config-schema.cjs:517-673`; `.claude/hooks/lib/doc-sync-classify.cjs:24`) | Hardcode module/spec roots, credentials, or doc-impact rules in individual hooks |

---

## Skill Definition Conventions

### Directory Structure

```
.claude/skills/<skill-name>/
├── SKILL.md              # Entry point (mandatory)
└── references/           # Optional: progressive disclosure for detailed content
    ├── topic-a.md
    └── topic-b.md
```

### SKILL.md Format

**YAML Frontmatter:**

```yaml
---
name: skill-name # Must match directory name exactly
version: 2.0.0 # Semantic versioning (MAJOR.MINOR.PATCH)
description: '...' # Include trigger keywords for discoverability
---
```

`name` and `description` identify and route the skill; this repository also versions its skills. Add only metadata supported by the skill's behavior and project conventions, such as `execution-mode`, `context-budget`, or `disable-model-invocation` (`.claude/skills/scan/SKILL.md:1-5`; `.claude/skills/code-review/SKILL.md:1-7`; `.claude/skills/design/SKILL.md:1-6`; `docs/project-config.json:18-21`).

### Naming Rules

| Rule                          | Example                           | Anti-Pattern                           |
| ----------------------------- | --------------------------------- | -------------------------------------- |
| lowercase-hyphen-case only    | `code-review`                     | `CodeReview`, `code_review`            |
| Max 64 characters             | `arch-security-review`            | `angular-19-nx-component-review-skill` |
| Characters: `a-z`, `0-9`, `-` | `plan-validate`                   | `plan_validate`, `Plan Validate`       |
| `name` field = directory name | `name: debug` in `debug/SKILL.md` | Mismatch between name and directory    |
| No redundant suffixes         | `debug`                           | `debugging-skill`                      |

### Shared Modules (`.claude/skills/shared/`)

- Only extract content duplicated across 3+ skills
- Keep under 500 words
- Self-contained (no dependencies on other shared modules)
- Reference format: `**Prerequisites:** Read \`.claude/skills/shared/{file}.md\` before executing.`

### Skill Content Rules

- Include `> **[IMPORTANT]** Use TaskCreate to break ALL work into small tasks BEFORE starting` when applicable
- Include evidence gate: every recommendation needs `file:line` proof
- Reference project-specific docs via `**MUST READ**` callouts
- Move substantial supporting detail to `references/` when it is not required for routing or the execution spine

---

## Agent Definition Conventions

### File Format

- Location: `.claude/agents/<agent-name>.md`
- Naming: kebab-case (e.g., `code-reviewer.md`, `fullstack-developer.md`)

### YAML Frontmatter

```yaml
---
name: agent-name
description: >-
    What this agent does and when to use it.
model: inherit
memory: project
# skills: related-skill-name # when the agent delegates to a skill
---
```

`name` and `description` are the routing identity. Current agents also declare `model` and `memory`; `skills` appears only when an agent delegates to one or more skills (`.claude/agents/code-reviewer.md:1-10`; `.claude/agents/frontend-developer.md:1-11`; `.claude/agents/architect.md:1-12`).

### Required Sections

| Section | Purpose |
| --- | --- |
| `## Quick Summary` | Goal, concise operating summary, and the ordered workflow when the role owns one |
| `## Project Context` | Reference docs to read before project-specific work |
| `## Key Rules` | Role-specific rules with evidence and examples where helpful |
| `## Output` | Expected deliverable format |
| `## Closing Reminders` | Highest-priority current instructions repeated at the end |

Use a dedicated `## Workflow` when the agent owns an ordered process. The three current examples share Quick Summary, Project Context, Key Rules, Output, and Closing Reminders; their workflow details remain role-specific (`.claude/agents/code-reviewer.md:12-30`; `.claude/agents/frontend-developer.md:13-30`; `.claude/agents/architect.md:14-30`).

### Agent Design Rules

- Agents must NOT duplicate skill logic — delegate to skills
- Include the role's evidence gate in its live instructions
- Include external memory directive for complex work (write to `plans/reports/`)
- Include project-specific reference doc callouts
- Keep focused: one agent = one specialized role

---

## Anti-Patterns

| Anti-Pattern                                      | Why It's Bad                                     | Correct Approach                                                |
| ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| ES module syntax in hooks (`import`/`export`)     | Breaks Node.js CJS hook loading                  | Use `require()`/`module.exports`                                |
| Duplicated hand-rolled `process.stdin` parsing without a documented blocker need | Divergent empty-input, malformed-input, and exit behavior | Use `runHook`/`runHookSync`, or the shared parser for an explicitly tested blocker |
| Hardcoded service paths in hooks                  | Breaks portability across projects               | Use `docs/project-config.json`                                  |
| Skipping hook tests after changes                 | Regressions go undetected                        | Run `test-all-hooks.cjs` after every hook change                |
| Skill without SKILL.md                            | Not discoverable by catalog or hooks             | Always create SKILL.md as entry point                           |
| Hook exits non-zero on non-critical error         | Blocks Claude Code operations unnecessarily      | Exit `0` on error; only safety hooks use exit `2`               |
| Injecting entire doc files into context           | Bloats context window, wastes tokens             | Inject focused snippets, truncate to relevant sections          |
| Creating new files when similar exist             | Duplication, inconsistency                       | Extend existing files unless architecture demands separation    |
| "Should work" / "probably fixed" claims           | No verification evidence                         | Run command, read output, cite evidence                         |
| Copy-pasting code instead of reusing patterns     | DRY violation, maintenance burden                | Search for existing abstractions first (`Grep`/`Glob`)          |
| Implementing without reading existing code        | Wrong patterns, missed conventions               | Follow understand-code-first-protocol: read 3+ similar examples |
| Shared module extracted for <3 consumers          | Premature abstraction                            | Keep inline until 3+ skills need it                             |
| Magic numbers/strings in hook logic               | Unclear intent, hard to maintain                 | Extract to named constants                                      |
| Agent duplicating skill logic                     | Logic diverges over time                         | Agent delegates to skill via `skills:` field                    |
| Seed data in migrations                           | Lost after DB reset, skipped on new environments | Use idempotent application startup seeder                       |
| Claiming completion without fresh verification    | May be wrong; "should pass" is not evidence      | Run verification command, read output, cite result              |
| 3+ fix attempts on same issue without reassessing | Root cause not identified, guessing              | Stop, report attempts, investigate root cause                   |

---

## Decision Trees

| Decision | Route |
| --- | --- |
| How should a hook read an event? | Standard lifecycle/result serialization → `runHook`/`runHookSync`; explicit blocking-gate exit control → shared parser plus process-level allow/deny/malformed-input tests |
| Where should new logic live? | Reusable/pure behavior → `hooks/lib`; one lifecycle orchestration → top-level hook; isolated complex subsystem → focused hook-local directory |
| Which exit code? | Proven policy violation → `2`; irrelevant event, malformed input, timeout, dependency/config/runtime failure → `0` unless a documented and tested deny-closed model applies |
| Which file is authoritative? | `.claude` authored source → edit there, sync mirrors, run parity/provenance verification; generated mirror → never edit directly |

---

## Testing Requirements

### Hook Testing

| What                      | Command                                                                                                                                                                                                                        | When                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| All hook tests            | `node .claude/hooks/tests/test-all-hooks.cjs`                                                                                                                                                                                  | After any hook change         |
| Core lib tests            | `node .claude/hooks/tests/test-lib-modules.cjs`                                                                                                                                                                                | After lib module changes      |
| Extended lib tests        | `node .claude/hooks/tests/test-lib-modules-extended.cjs`                                                                                                                                                                       | After lib module changes      |
| Swap engine               | `node .claude/hooks/tests/test-swap-engine.cjs`                                                                                                                                                                                | After swap-engine changes     |
| Project config validation | `node -e "const {validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(formatResult(validateConfig(JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8')))))"` | After config schema changes   |

### Manual Hook Testing

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":".env"}}' | node .claude/hooks/privacy-block.cjs
echo $?  # Verify exit code
```

### Testing Rules

- Every hook must have observable test coverage in `hooks/tests/`
- Export helpers when a unit seam is useful; process-test entrypoints when exported helpers would be artificial
- Tests must run before push — DO NOT ignore failed tests to pass CI
- Run linting before commit
- New hooks: add manual test command in extending-hooks pattern

---

## Checklists

### Hook PR Checklist

- [ ] Uses CommonJS (`require`/`module.exports`)
- [ ] Uses the shared event adapter suited to the lifecycle: runner for standard handling, or shared parser for documented blocker semantics
- [ ] Loads config via `project-config-loader.cjs` (if config needed)
- [ ] Handles missing config gracefully (fail-open)
- [ ] Has `'use strict'` at top
- [ ] Has test coverage in `hooks/tests/`
- [ ] Exit codes follow convention (`0` = allow, `2` = block for safety only)
- [ ] No hardcoded project-specific values
- [ ] No external API calls (network requests)
- [ ] Has an observable test seam: exported helper or process-level entrypoint coverage
- [ ] Context injection is concise (no full doc dumps)
- [ ] Entrypoint is cohesive and delegates reusable or independently testable logic
- [ ] Registered in `.claude/settings.json` with correct event and matcher
- [ ] All hook tests pass after changes

### Skill PR Checklist

- [ ] Has `SKILL.md` with routing frontmatter (`name`, `description`) and repository version metadata
- [ ] `name` field matches directory name exactly
- [ ] Uses lowercase-hyphen-case, under 64 characters
- [ ] Has version in semantic format (MAJOR.MINOR.PATCH)
- [ ] Description includes trigger keywords for discoverability
- [ ] References shared protocols via `**Prerequisites:** Read ...` (if applicable)
- [ ] Supporting detail not required for routing or the execution spine uses progressive-disclosure `references/`
- [ ] Scripts have tests (if applicable)
- [ ] Referenced in workflow if applicable
- [ ] Shared module extractions have 3+ consumers

### Agent PR Checklist

- [ ] Is a markdown file in `.claude/agents/`
- [ ] Has routing frontmatter (`name`, `description`) plus applicable runtime metadata (`model`, `memory`, `skills`)
- [ ] Uses kebab-case filename
- [ ] Has Quick Summary, Project Context, Key Rules, Output, and Closing Reminders; includes Workflow when the role owns ordered steps
- [ ] Includes an evidence gate in the live role instructions
- [ ] Includes external memory directive (write to `plans/reports/`)
- [ ] Includes `**MUST READ**` callouts for project reference docs
- [ ] Does NOT duplicate skill logic — delegates via `skills:` field

### General PR Checklist

- [ ] File naming follows kebab-case convention
- [ ] Files are cohesive; reusable or independently testable logic is delegated to the lowest appropriate module
- [ ] No confidential data committed (.env, API keys, credentials)
- [ ] Commit message uses conventional format (feat, fix, docs, refactor, etc.)
- [ ] No "should work" / "probably" / "I think" language in code comments
- [ ] Changed files checked against related docs for staleness (hook changes -> hooks README, skill changes -> skills README)
- [ ] Grep verification performed after bulk replacements (old term returns 0 results)

---

## Lessons-Informed Rules

These rules derive from project lessons learned (`docs/project-reference/lessons.md`):

1. **Mirror copies create staleness traps** — After editing a canonical source, grep for ALL mirrored copies (configs, skill definitions, docs, catalogs) and update them. Verify with `grep` after edits.
2. **Docs embedding derived data go stale silently** — Documentation that inlines data from a canonical source (workflow sequences, schemas, config tables) must be updated alongside the source. Map all docs that embed canonical data before modifying the source.
3. **Trace full dependency chain after edits** — Changing a definition misses downstream variables and consumers. Always trace the full chain.
4. **Grep for old terms after bulk replacements** — AI over-trusts its own find/replace completeness. Always grep the full repo after bulk edits.
5. **Check downstream references before deleting** — Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
6. **Re-read files after context compaction** — Edit tools require prior Read in the same context. After compaction, all read state is lost — always re-read before editing.

---

## Red Flags That Should Block a Review

If any of these are detected during review, the review must flag them as **CRITICAL**:

| Red Flag                                                  | Action                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| ES module syntax in a `.cjs` hook                         | Block — will break hook loading            |
| Hook exits non-zero on non-critical error                 | Block — will break Claude Code operations  |
| Hardcoded file paths that should come from config         | Block — breaks portability                 |
| Missing SKILL.md in a skill directory                     | Block — skill is undiscoverable            |
| Agent `name` field doesn't match filename                 | Block — agent routing will fail            |
| Sensitive data in committed files (.env, keys)            | Block — security violation                 |
| Tests skipped or ignored to pass CI                       | Block — masks regressions                  |
| Completion claims without verification evidence           | Block — unverified claims are unreliable   |
| 3+ fix attempts on same issue without root cause analysis | Stop — reassess approach before continuing |
| Hook making external network requests                     | Block — violates performance contract      |

---

## Cross-Reference

- **Read by:** review skills and agents through the project-reference-docs gate in `CLAUDE.md`
- **Consumed by:** `/code-review`, `/changes-review`, and the `code-reviewer` agent
- **Canonical shared protocol source:** `.claude/skills/shared/sync-inline-versions.md`
- **Hookless protocol composer:** `.claude/scripts/lib/hookless-prompt-protocol.cjs`
- **Hook docs:** `.claude/docs/hooks/README.md`, `.claude/docs/hooks/extending-hooks.md`, `.claude/docs/hooks/architecture.md`
- **Skill docs:** `.claude/docs/skill-naming-conventions.md`
- **Agent docs:** `.claude/docs/agents/agent-patterns.md`

---

<!-- PROMPT-ENHANCE:CLOSING-REMINDERS:START -->

## Closing Reminders

1. **Prove the runtime boundary first** — `.cjs` hooks, `.mjs` tooling, and event-specific adapters have different contracts.
2. **Edit canonical source first** — change `.claude`, regenerate mirrors, and verify parity/provenance before approval.
3. **No claim without evidence** — cite repository lines for findings and run the observable checks that protect the changed behavior.

<!-- PROMPT-ENHANCE:CLOSING-REMINDERS:END -->
