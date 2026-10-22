# Project config — Help Mode detail

> Read when Help Mode triggers (see `SKILL.md`). Help Mode stays read-only and terminal: present the generator output, answer, and stop.

## Help Mode (`--help`)

```bash
node .claude/skills/project-config/scripts/project-config-help.cjs            # orientation + most-consumed options
node .claude/skills/project-config/scripts/project-config-help.cjs --sections # every option, one line each
node .claude/skills/project-config/scripts/project-config-help.cjs --section=<name>
node .claude/skills/project-config/scripts/project-config-help.cjs --consumers        # who reads what, ranked
node .claude/skills/project-config/scripts/project-config-help.cjs --consumers=<key>  # name the skills/agents/hooks
node .claude/skills/project-config/scripts/project-config-help.cjs --docs     # reference docs: purpose + regenerating owner
node .claude/skills/project-config/scripts/project-config-help.cjs --roots    # relocatable roots, defaults, current values
node .claude/skills/project-config/scripts/project-config-help.cjs --skills   # skills that read project-config
node .claude/skills/project-config/scripts/project-config-help.cjs --current  # declared vs defaulted in THIS project
node .claude/skills/project-config/scripts/project-config-help.cjs --search=<term>
```

**Mode selection:**

| The user asks | Run |
|---|---|
| "what options are there", "help" | (no flag), then `--sections` if they want the full list |
| "what does `<section>` do / control" | `--section=<section>` |
| "how many skills use X", "what breaks if I change X" | `--consumers=<key>` |
| "which reference docs exist / what is each for" | `--docs` |
| "where do specs / plans / ADRs / templates live" | `--roots` |
| "what is configured for this project" | `--current` |
| anything by keyword | `--search=<term>` |
| settings outside the project config: `.ck.json` / `.ck.local.json`, environment variables, "turn X off" switches | `node .claude/scripts/ck-config-help.cjs` (the same output `$framework-config --mode=help config` shows) |

`--sections` lists every top-level option on one line. `--section=<name>` lists every field under it at any depth — nested properties as `a.b`, array-item fields as `a[].b` (for example `contextGroups[].on`), map values as `a{}`, and the fields of each `oneOf` form — and `--search=<term>` finds any field by name or help text. Every field shows its help text. That text is the field's schema `describe`, or its entry in `.claude/scripts/lib/config-option-describes.cjs`; `config-help-coverage.test.cjs` fails when a new field has neither, so a new option always appears here.

**Presentation rules:**

- Show the script output **verbatim and complete** — it is generated from `SCHEMA`, `PORTABILITY_TOKENS`, the reference-doc registry, and a live scan of `.claude/skills`, `.claude/agents`, `.claude/workflows`, and `.claude/hooks`. Do not summarise it away, and never retype a list from memory.
- THEN add the interpretation the script cannot: which change the user actually wants, what it will move, and the one command that applies it.
- Consumer counts are **name-reference counts**, not a call graph. A section with no named consumer may still be read indirectly through `project-config-loader.cjs`; say so rather than calling it unused.
- `--current` reports declared vs defaulted only. For a verdict on validity, run `node .claude/hooks/lib/project-config-schema.cjs --validate <configured path>`.
- For framework-wide help beyond the config file (skills, workflows, hooks, project architecture), suggest the user run `$project-help`, or read `.claude/docs/README.md`. For init-time routing decisions, route to `$project-init --help`.
