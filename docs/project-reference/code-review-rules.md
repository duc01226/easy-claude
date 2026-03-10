# Code Review Rules

<!-- Last scanned: 2026-03-10 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

## Critical Rules

1. **CommonJS only** — All hooks and hook libraries use `require()`/`module.exports`. No ES modules.
2. **stdin/stdout contract** — Hooks receive JSON on stdin, output context via stdout, errors via stderr. Exit codes: 0=allow, 1=block (overridable), 2=block (security).
3. **No hardcoded project paths** — All project-specific values must come from `docs/project-config.json`, never hardcoded in hooks.
4. **Idempotent hooks** — Hooks must be safe to run multiple times without side effects.
5. **Graceful degradation** — If `project-config.json` is missing or incomplete, hooks must still function (skip injection, don't crash).

## Hook Rules

- Hooks in `.claude/hooks/` must be `.cjs` extension
- Shared utilities go in `.claude/hooks/lib/`
- Use `stdin-parser.cjs` to parse input, never raw `process.stdin`
- Use `project-config-loader.cjs` to load config, never raw `fs.readFileSync`
- Test all hooks via `node .claude/hooks/tests/test-all-hooks.cjs`

## Skill Rules

- Each skill is a directory with `SKILL.md` as entry point
- Follow naming conventions in `.claude/docs/skill-naming-conventions.md`
- Skills with scripts must include tests
- Reference docs go in `references/` subdirectory

## Agent Rules

- Agent definitions are markdown files in `.claude/agents/`
- Follow patterns in `.claude/docs/agents/agent-patterns.md`
- Agents must not duplicate skill logic — delegate to skills

## Anti-Patterns

| Anti-Pattern                     | Why It's Bad                | Correct Approach             |
| -------------------------------- | --------------------------- | ---------------------------- |
| Hardcoded service paths in hooks | Breaks portability          | Use `project-config.json`    |
| ES module syntax in hooks        | Breaks Node.js hook loading | Use CommonJS                 |
| Direct `process.stdin` parsing   | Error-prone, duplicated     | Use `stdin-parser.cjs`       |
| Skipping hook tests              | Regressions go undetected   | Run `test-all-hooks.cjs`     |
| Skill without SKILL.md           | Not discoverable            | Always create SKILL.md entry |

## Checklists

### Hook PR Checklist

- [ ] Uses CommonJS (`require`/`module.exports`)
- [ ] Parses stdin via `stdin-parser.cjs`
- [ ] Loads config via `project-config-loader.cjs`
- [ ] Handles missing config gracefully
- [ ] Has test coverage in `hooks/tests/`
- [ ] Exit codes follow convention (0/1/2)
- [ ] No hardcoded project-specific values

### Skill PR Checklist

- [ ] Has `SKILL.md` with YAML frontmatter
- [ ] Follows naming conventions
- [ ] Scripts have tests (if applicable)
- [ ] Referenced in workflow if applicable
