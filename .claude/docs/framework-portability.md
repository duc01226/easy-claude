# Agent-Folder Portability Protocol

The agent folders are copied verbatim into other repositories. A change is portable when an adopting
project can take them as-is and have them work, with nothing of this repository left in them.

> **Rule:** every AI-agent folder — `.claude/`, `.codex/`, `.agents/`, `.opencode/`, and any other
> agent surface added later — must be portable, copyable and configurable into any project, with no
> project-specific leaks. Project specifics live in `docs/project-config.json` and the
> project-reference docs, never in an agent folder.

`.claude/` is the SOURCE. `.codex/`, `.agents/` and `.opencode/` are GENERATED mirrors of it: never
hand-edit them — fix the `.claude/**` source and regenerate, or the next sync silently reverts you.
A leak in a mirror means the leak is in the source.

## What counts as a leak

| Leak | Instead |
| --- | --- |
| A consumer project, product or company name | Say nothing, or name the role (`the consuming project`) |
| An absolute path (`D:\...`, `/Users/...`, `/home/...`) | A repo-relative path |
| A root literal (`docs/specs`, `plans/`, `team-artifacts/`) stated as fact | Form (b): the config value with the default as fallback, naming `docs/project-config.json` |
| A consumer's base classes, packages or module names as load-bearing rules | Frame as a marked example, or route through a reference doc |
| A test asserting this repository's own corpus, prose or file tree | Build the fixture in a temp dir, or gate on that corpus being present |
| A generated mirror edited by hand | Edit the `.claude/**` source, then regenerate |

## Form (b) — the sanctioned way to state a default

A default is fine when the same line says it is a default and where the override lives:

```js
const specRoot = (config.specRoots?.business?.path) || 'docs/specs'; // docs/project-config.json overrides
```

```md
the business spec root (default `docs/specs`; `specRoots.business.path` in
`docs/project-config.json` overrides it)
```

Naming `docs/project-config.json` on the line is what clears the root-literal gate.

## Gates

| Gate | Catches |
| --- | --- |
| `verify-no-project-residue.mjs` | Consumer project names and this codebase's framework symbols |
| `verify-configurable-root-literals.mjs` | Root literals not written as form (b) |
| `portable-paths.test.mjs` | Bare `scripts/` and other non-portable path references |
| `verify-sync-divergence.mjs` | A mirror that drifted from its source |

Run them together with `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.

A gate passing is not proof of portability — it proves only what the gate checks. The residue gate
listed just two consumer names for a long time, so another project's spec paths, package names and
design-doc pointers sat inside a scanned directory and passed. **When a leak gets through, fix the
leak and the gate that missed it**, or the next one lands the same way.

## Local artifacts are not leaks

`.venv/`, `node_modules/` and `__pycache__/` under `.claude/` are gitignored build output. They carry
machine-specific absolute paths but never ship, so they are not bundle leaks — and they are untracked,
so deleting them destroys the only copy. Leave them alone.
