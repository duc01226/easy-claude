# easy-claude

Claude Code enhancement framework — a collection of hooks, skills, agents, and workflows that extend Claude Code's capabilities.

## Project Structure

- `.claude/hooks/` — Runtime hooks (36 CJS modules) for context injection, enforcement, and session management
- `.claude/skills/` — 237 skill definitions (SKILL.md + scripts) for task automation
- `.claude/agents/` — 28 agent definitions for specialized subagent roles
- `.claude/docs/` — Framework documentation
- `.claude/scripts/` — Utility scripts (catalog generation, skill management)
- `docs/project-config.json` — Project configuration consumed by hooks at runtime
- `docs/project-reference/` — Reference documentation populated by `/scan-*` skills

## Tech Stack

- **Language:** JavaScript (CommonJS)
- **Runtime:** Node.js
- **Testing:** Custom test runner (`node .claude/hooks/tests/test-all-hooks.cjs`)

## Key Commands

- **Run all hook tests:** `node .claude/hooks/tests/test-all-hooks.cjs`
- **Validate project config:** `node -e "const {validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');console.log(formatResult(validateConfig(JSON.parse(require('fs').readFileSync('docs/project-config.json','utf-8')))))"`
- **Validate .ck.json:** `node .claude/hooks/lib/ck-config-schema.cjs .claude/.ck.json`
- **Generate skills catalog:** `python .claude/scripts/generate_catalogs.py --skills`
- **Generate commands catalog:** `python .claude/scripts/generate_catalogs.py --commands`

## Conventions

- Hook files: `.claude/hooks/<name>.cjs`
- Hook libraries: `.claude/hooks/lib/<name>.cjs`
- Skill definitions: `.claude/skills/<skill-name>/SKILL.md`
- Agent definitions: `.claude/agents/<agent-name>.md`
- File naming: kebab-case
