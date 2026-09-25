# Claude Config Directory

Centralized configuration templates for Claude skills and workflows.

## Purpose

This directory provides a single source of truth for reusable configuration templates that can be referenced by skills, agents, and workflows.

## Files

| File | Purpose |
|------|---------|
| `release-notes-template.yaml` | Template for release notes generation |
| `skill-template.md` | Template for creating new skills |
| `agent-template.md` | Template for creating new agents |
| `vanilla-settings.json` | Session settings that run Claude Code without the framework (see [Run without the framework](#run-without-the-framework)) |
| `skill-profiles.json` | Skill-profile presets (`full`, `standard`, `minimal`), the curated `calledByOthers` list and the `entrySkills` list, read by `.claude/scripts/sync-skill-profile.cjs` (see [Skill profile](#skill-profile)) |

## Run without the framework

Start one session with the framework switched off, without deleting or editing `.claude/`. Run from the project root; the command is the same in PowerShell, cmd, bash and zsh:

```bash
claude --settings .claude/config/vanilla-settings.json --disable-slash-commands
```

| Part | Turns off | Also affects |
| --- | --- | --- |
| `disableAllHooks: true` | Every project hook: context injection, the workflow route reminder, the review commit gate and the other safety hooks | Any custom status line and `@` file-suggestion command |
| `instructionFiles: "managed-only"` | Project `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/` and every `AGENTS.md` at launch | Your own `~/.claude/CLAUDE.md` too. Auto memory and organization-managed instructions still load, and a subdirectory's `CLAUDE.md` or path-scoped rules still load when Claude reads a file there |
| `--disable-slash-commands` | Every skill and custom command, so workflows cannot start | Your personal skills and commands too. Leave the flag off to keep skills while hooks and project instructions stay off |

Project agents in `.claude/agents/` and the permission rules in `.claude/settings.json` stay active. `--settings` overrides the same keys in every settings file for this session only; the next plain `claude` session runs the full framework again.

To keep the framework but stop automatic workflow routing, turn `portability.workflowAutoDetect` off instead — for the team in `docs/project-config.json`, or for yourself in `.claude/.ck.local.json` (see `.claude/docs/configuration/README.md`).

## Adopter quick settings

Common ways to make the framework lighter for one project. Team settings go in `docs/project-config.json` and are validated by its schema (`node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`); personal settings go in `.claude/.ck.local.json`, which git ignores. Read `.claude/docs/configuration/README.md` when you need a key's full contract.

| Need | Setting or action | Undo |
| --- | --- | --- |
| Workflows ask before they start | `portability.workflowActivation.default: "confirm"` (or `"manual"`). A default only tightens a workflow's own tier; `portability.workflowActivation.overrides` sets one workflow's tier exactly, looser included. A valid value in `.claude/.ck.local.json` wins for you alone | Remove the key |
| No automatic workflow routing | `portability.workflowAutoDetect: false`, then regenerate `CLAUDE.md` (`/ai-context-refresh`) so the root file drops the routing gate; the route hook then sends a short routing-off notice instead of the catalog | Set `true` and regenerate |
| Reading a file stops pulling authoring docs | Per convention class: `on: "edit"` on the `contextGroups[]` entry (`read`, `edit` or `both`; default `both`). For every class: `conventionInjection.onRead: false` | Remove `on` / the key |
| Code graph only when the project wants it | `hooks.codeGraph.enabled`: `auto` (default: active only once `.code-graph/graph.db` exists, built with `/graph-build`), `on`, or `off` (graph hooks silent, graph CLI refuses) | Remove the key |
| No `Fix-Origin:` commit trailer | Nothing to do: it is off by default. Set `commit.fixOriginTrailer: true` to opt in; it applies to new commits only, and a check that demands it on older commits must be made forward-only rather than rewriting history | Remove the key |
| The host's built-in code reviewer | Type `/review` in Claude Code; the framework ships no skill of that name, so the built-in runs. It stops working if `code-review` is set `off` (see [Skill visibility and settings precedence](#skill-visibility-and-settings-precedence)) | None needed |
| Fewer skills in the model's list | `skillProfile` in `docs/project-config.json`, then `node .claude/scripts/sync-skill-profile.cjs` (see [Skill profile](#skill-profile)) | Remove `skillProfile` and run the sync again |
| Your own compaction window | The framework sets none, so each host uses its default. Claude: `/autocompact <size>`, or an `env` entry in `.claude/settings.local.json`. Codex and OpenCode: see "No compaction pin" in `.claude/docs/configuration/README.md` | Remove your value |
| One session without the framework | Claude: the launcher in [Run without the framework](#run-without-the-framework). Codex: `[features] hooks = false` in your personal Codex config (hooks off; project instructions and skills still load). OpenCode: start it with the environment variable `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` (stops loading `.claude/skills`) | Per session |

## Skill profile

`skillProfile` in `docs/project-config.json` sets which skills the model sees, for the whole team. Keys: `preset` (`full` | `standard` | `minimal`, defined in `skill-profiles.json`), the lists `nameOnly`, `commandOnly` and `off` (skill folder names; a skill sits in at most one list), and `allowHidingCalledSkills` (default `false`). Check a key's contract with `node .claude/skills/project-config/scripts/project-config-help.cjs --search=skillProfile`.

Apply it with `node .claude/scripts/sync-skill-profile.cjs` (`--check` = read-only; exits non-zero when the result is stale or refused). The sync writes only the keys it owns into `.claude/settings.json` `skillOverrides` and records them in the team-tracked ledger `.claude/skill-profile.generated.json`; a key someone else wrote is never adopted or overwritten (a differing value prints a `conflict:` line). With no `skillProfile` and no owned keys it reads nothing and writes nothing. Removing `skillProfile` and running the sync again restores the original settings bytes.

- **Called skills are protected.** A skill that a workflow step, an agent `skills:` entry, the curated `calledByOthers` list or the `entrySkills` list (the workflow runner `start-workflow`, `commit` and the setup skills that routing gates and hooks start) names is never made `commandOnly` or `off` unless `allowHidingCalledSkills: true`; otherwise every host sync refuses and writes nothing. `nameOnly` is allowed for any skill.
- **Fail-closed inputs.** A `.claude/workflows.json` without a `workflows` map, a malformed profile, or a non-map `skillOverrides` stops the sync. The Codex sync also stops on a project config that is not valid JSON, because it cannot tell whether the config hides skills.

| List | Claude (`skillOverrides`) | Codex (`agents/openai.yaml` of the skill mirror, via `/sync-codex`) | OpenCode (`opencode.json` `permission.skill`, via the OpenCode sync) |
| --- | --- | --- | --- |
| `nameOnly` | `name-only`: out of the model's list, callable by name | `allow_implicit_invocation: false` only for a skill nothing starts; a called skill keeps implicit invocation (one note line), so preset `standard` hides nothing on Codex | No entry (no effect) |
| `commandOnly` | `user-invocable-only`: only a user's `/name` starts it | Implicit invocation off | `deny` plus a generated command |
| `off` | `off`: a call by name fails | Implicit invocation off | `deny` plus a generated command |

A skill whose frontmatter already sets `disable-model-invocation: true` is left out of the `minimal` preset, and a skill that ships its own `agents/openai.yaml` without the policy is skipped on Codex with a conflict line. (A skill whose own `disable-model-invocation: true` meets such a file instead stops the Codex sync before any mirror file is written.)

## Skill visibility and settings precedence

- **Precedence (Claude Code, per key):** `--settings` flag > `.claude/settings.local.json` > `.claude/settings.json` > the user file `~/.claude/settings.json`. Put a personal override in `.claude/settings.local.json`; a value in your user file loses to a team key of the same name.
- **`off` also blocks the built-in skill of that name.** A project skill named like a built-in (for example `code-review`, `design`, `plan`, `security-review`) replaces the built-in's `/name`, and `skillOverrides` `"<name>": "off"` disables both: the built-in does not come back. That includes the `/review` alias, which reaches the built-in code reviewer only while `code-review` is not `off`. There is no profile setting that turns a framework skill off and restores the built-in.

## Codex trust entries

`codex exec -s workspace-write` adds a `trust_level = "trusted"` entry for its working directory to the user file `~/.codex/config.toml` without asking. A test fixture or spike that runs Codex in a temp project must snapshot that file first and restore it afterwards, so the run leaves no trusted temp paths behind.

## Usage

### In Skills/Scripts

```javascript
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('.claude/config/release-notes-template.yaml', 'utf8'));
```

### Creating New Skills

1. Copy `skill-template.md` to `.claude/skills/{skill-name}/SKILL.md`
2. Update frontmatter with skill details
3. Add skill-specific content and examples
4. Optionally create `references/` subdirectory for detailed docs

### Creating New Agents

1. Copy `agent-template.md` to `.claude/agents/{agent-name}.md`
2. Update frontmatter with agent details
3. Define agent behavior, constraints, and process

## Conventions

- **YAML files**: Use for structured configuration (templates, mappings)
- **Markdown files**: Use for documentation and skill/agent definitions
- **File naming**: Use lowercase with hyphens (e.g., `release-notes-template.yaml`)
