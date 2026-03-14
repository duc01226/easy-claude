# Code Review Rules

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Auto-injected by code-review-rules-injector.cjs when review skills activate. -->

## Critical Rules

1. **CommonJS only** — All hooks and hook libraries use `require()`/`module.exports`. No ES modules (`import`/`export`).
2. **stdin/stdout contract** — Hooks receive JSON on stdin, output context via `console.log()` to stdout, errors via stderr. Exit codes: `0` = allow, `2` = block (security/safety).
3. **No hardcoded project paths** — All project-specific values come from `docs/project-config.json`, never hardcoded in hooks.
4. **Idempotent hooks** — Hooks must be safe to run multiple times without side effects.
5. **Graceful degradation (fail-open)** — If `project-config.json` is missing or incomplete, hooks must still function (skip injection, don't crash). On errors, exit `0` (allow) unless the hook is a safety blocker.
6. **YAGNI / KISS / DRY** — No speculative code, no unnecessary complexity, no duplication. Every piece of code must earn its existence.
7. **Evidence before claims** — Every review finding, recommendation, or code change must cite `file:line` evidence or grep results. Speculation is forbidden.

---

## Hook Code Conventions

### File Structure

- Extension: `.cjs` (mandatory)
- Location: `.claude/hooks/<name>.cjs`
- Shared utilities: `.claude/hooks/lib/<name>.cjs`
- File naming: kebab-case (e.g., `privacy-block.cjs`, `session-init.cjs`)
- File size: Keep under 200 lines; extract to lib modules when larger

### Required Patterns

| Pattern                         | How                                                                 | Why                                                   |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Use `hook-runner.cjs`           | `const { runHook } = require('./lib/hook-runner.cjs')`              | Standardized execution, error handling, stdin parsing |
| Use `stdin-parser.cjs`          | `const { parseStdinSync } = require('./lib/stdin-parser.cjs')`      | Consistent stdin handling with defaults               |
| Use `project-config-loader.cjs` | `const { loadConfig } = require('./lib/project-config-loader.cjs')` | Config loading with graceful fallback                 |
| Use `debug-log.cjs`             | `const { debug, debugError } = require('./lib/debug-log.cjs')`      | Debug logging gated behind `CK_DEBUG=1`               |
| `'use strict'`                  | Top of every file                                                   | Catch silent errors                                   |
| Export testable functions       | `module.exports = { myFunction }` at end of file                    | Enable unit testing of hook logic                     |

### Hook Template

```javascript
#!/usr/bin/env node
/**
 * my-hook.cjs - Brief description
 *
 * Event: PreToolUse | PostToolUse | SessionStart | etc.
 * Purpose: What this hook does
 */

"use strict";

const { runHook } = require("./lib/hook-runner.cjs");
const { debug } = require("./lib/debug-log.cjs");

runHook(
  "my-hook",
  async (event) => {
    // event.hookEventName, event.toolName, event.toolInput, event.toolResult
    // event.sessionId, event.cwd

    return {
      continue: true, // false = block operation
      inject: "Context", // Optional: inject into Claude context
      message: "User msg", // Optional: display to user
    };
  },
  { exitCode: 0, errorExitCode: 0, outputResult: true },
);

module.exports = {
  /* exported test helpers */
};
```

### Exit Code Rules

| Code | Meaning                              | Use Case                                                                                      |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `0`  | Success / allow / non-critical error | Default for all hooks                                                                         |
| `2`  | Block operation                      | Safety hooks only (`privacy-block`, `path-boundary-block`, `scout-block`, `init-prompt-gate`) |

**Rule:** Always exit `0` on errors unless the hook is explicitly a safety blocker. Hooks must be non-blocking by default.

### Error Handling

```javascript
// Correct: fail-open
try {
  // hook logic
} catch (error) {
  debugError("my-hook", error);
  process.exit(0); // allow operation on error
}
```

### Performance

- Keep execution fast — hooks run synchronously in the Claude Code pipeline
- No external API calls (network requests)
- Use local checks only (file reads, regex tests, in-memory operations)
- Minimize context injection — truncate to relevant snippets, avoid injecting full documentation files

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

**YAML Frontmatter (mandatory):**

```yaml
---
name: skill-name # Must match directory name exactly
version: 2.0.0 # Semantic versioning (MAJOR.MINOR.PATCH)
description: "..." # Include trigger keywords for discoverability
allowed-tools: Read, Grep, Glob, Bash, Write, TaskCreate, Edit
---
```

### Naming Rules

| Rule                          | Example                           | Anti-Pattern                           |
| ----------------------------- | --------------------------------- | -------------------------------------- |
| lowercase-hyphen-case only    | `code-review`                     | `CodeReview`, `code_review`            |
| Max 64 characters             | `arch-security-review`            | `angular-19-nx-component-review-skill` |
| Characters: `a-z`, `0-9`, `-` | `fix-parallel`                    | `fix_parallel`, `Fix Parallel`         |
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
- Large skills (>200 lines): use `references/` subdirectory for progressive disclosure

---

## Agent Definition Conventions

### File Format

- Location: `.claude/agents/<agent-name>.md`
- Naming: kebab-case (e.g., `code-reviewer.md`, `fullstack-developer.md`)

### YAML Frontmatter (mandatory)

```yaml
---
name: agent-name
description: >-
  What this agent does and when to use it.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, TaskCreate
model: inherit
skills: related-skill-name
memory: project
maxTurns: 30
---
```

### Required Sections

| Section              | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `## Role`            | What the agent does, evidence gate, external memory note |
| `## Project Context` | Reference docs to read (`**MUST READ**` callouts)        |
| `## Key Rules`       | Numbered rules with code examples where helpful          |
| `## Workflow`        | Step-by-step process                                     |
| `## Constraints`     | What the agent must NEVER/ALWAYS do                      |
| `## Output`          | Expected deliverable format                              |
| `## Reminders`       | Final NEVER/ALWAYS rules reinforcing key constraints     |

### Agent Design Rules

- Agents must NOT duplicate skill logic — delegate to skills
- Include evidence gate in the Role section
- Include external memory directive for complex work (write to `plans/reports/`)
- Include project-specific reference doc callouts
- Keep focused: one agent = one specialized role

---

## Common Anti-Patterns

| Anti-Pattern                                      | Why It's Bad                                     | Correct Approach                                                |
| ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| ES module syntax in hooks (`import`/`export`)     | Breaks Node.js CJS hook loading                  | Use `require()`/`module.exports`                                |
| Direct `process.stdin` parsing                    | Error-prone, no defaults                         | Use `stdin-parser.cjs`                                          |
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

## Testing Requirements

### Hook Testing

| What                      | Command                                                                                                                                                                                                                        | When                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| All hook tests            | `node .claude/hooks/tests/test-all-hooks.cjs`                                                                                                                                                                                  | After any hook change         |
| Core lib tests            | `node .claude/hooks/tests/test-lib-modules.cjs`                                                                                                                                                                                | After lib module changes      |
| Extended lib tests        | `node .claude/hooks/tests/test-lib-modules-extended.cjs`                                                                                                                                                                       | After lib module changes      |
| Swap engine               | `node .claude/hooks/tests/test-swap-engine.cjs`                                                                                                                                                                                | After swap-engine changes     |
| Context tracker           | `node .claude/hooks/tests/test-context-tracker.cjs`                                                                                                                                                                            | After context-tracker changes |
| Project config validation | `node -e "const {validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(formatResult(validateConfig(JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8')))))"` | After config schema changes   |

### Manual Hook Testing

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":".env"}}' | node .claude/hooks/my-hook.cjs
echo $?  # Verify exit code
```

### Testing Rules

- Every hook must have test coverage in `hooks/tests/`
- Export testable functions from hook files for unit testing
- Tests must run before push — DO NOT ignore failed tests to pass CI
- Run linting before commit
- New hooks: add manual test command in extending-hooks pattern

---

## Review Checklists

### Hook PR Checklist

- [ ] Uses CommonJS (`require`/`module.exports`)
- [ ] Uses `hook-runner.cjs` for execution (not raw stdin parsing)
- [ ] Parses stdin via `stdin-parser.cjs`
- [ ] Loads config via `project-config-loader.cjs` (if config needed)
- [ ] Handles missing config gracefully (fail-open)
- [ ] Has `'use strict'` at top
- [ ] Has test coverage in `hooks/tests/`
- [ ] Exit codes follow convention (`0` = allow, `2` = block for safety only)
- [ ] No hardcoded project-specific values
- [ ] No external API calls (network requests)
- [ ] Exports testable functions via `module.exports`
- [ ] Context injection is concise (no full doc dumps)
- [ ] File is under 200 lines (complex logic extracted to lib)
- [ ] Registered in `.claude/settings.json` with correct event and matcher
- [ ] All hook tests pass after changes

### Skill PR Checklist

- [ ] Has `SKILL.md` with YAML frontmatter (`name`, `version`, `description`, `allowed-tools`)
- [ ] `name` field matches directory name exactly
- [ ] Uses lowercase-hyphen-case, under 64 characters
- [ ] Has version in semantic format (MAJOR.MINOR.PATCH)
- [ ] Description includes trigger keywords for discoverability
- [ ] References shared protocols via `**Prerequisites:** Read ...` (if applicable)
- [ ] Large skills (>200 lines) use `references/` subdirectory
- [ ] Scripts have tests (if applicable)
- [ ] Referenced in workflow if applicable
- [ ] Shared module extractions have 3+ consumers

### Agent PR Checklist

- [ ] Is a markdown file in `.claude/agents/`
- [ ] Has YAML frontmatter (`name`, `description`, `tools`, `model`, `maxTurns`)
- [ ] Uses kebab-case filename
- [ ] Has required sections: Role, Key Rules, Workflow, Constraints, Output
- [ ] Includes evidence gate in Role section
- [ ] Includes external memory directive (write to `plans/reports/`)
- [ ] Includes `**MUST READ**` callouts for project reference docs
- [ ] Does NOT duplicate skill logic — delegates via `skills:` field
- [ ] `maxTurns` is set to reasonable value

### General PR Checklist

- [ ] File naming follows kebab-case convention
- [ ] Individual files under 200 lines
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

- **Injected by:** `code-review-rules-injector.cjs` (on review skill activation)
- **Consumed by:** `/code-review`, `/review-changes`, `/review-pr`, `code-reviewer` agent
- **Source protocols:** `evidence-based-reasoning-protocol.md`, `understand-code-first-protocol.md`, `rationalization-prevention-protocol.md`, `red-flag-stop-conditions-protocol.md`, `two-stage-task-review-protocol.md`
- **Hook docs:** `.claude/docs/hooks/README.md`, `.claude/docs/hooks/extending-hooks.md`, `.claude/docs/hooks/architecture.md`
- **Skill docs:** `.claude/docs/skill-naming-conventions.md`
- **Agent docs:** `.claude/docs/agents/agent-patterns.md`
