# .agents Directory

This directory is used by Codex for project-level skills and plugins.

In this repository:

- `skills` holds a generated mirror of `.claude/skills`
- each mirrored `SKILL.md` is sanitized so Codex only reads compatible frontmatter
- `skills/.codex-mirror.json` records the entries the sync generated; the sync replaces or removes only those
- any other entry in `skills` (a skill written for Codex only, or installed by another tool) is kept as it is, and each sync prints one `kept` line for it; move it into `.claude/skills` to mirror it to every host
- create/update the mirror with:

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs
```

Read-only verification can be run without regenerating mirrors:

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only
```
