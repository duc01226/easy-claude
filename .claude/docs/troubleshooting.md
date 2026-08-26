# Troubleshooting & Support

> Portable troubleshooting for the Claude Code enhancement framework. The `.claude/` directory is reusable; project-specific behavior comes from the adopting project's configuration and reference docs.

## Quick Navigation

-   [Start with context and setup](#start-with-context-and-setup)
-   [Skills or workflows not discovered](#skills-or-workflows-not-discovered)
-   [Hooks not running](#hooks-not-running)
-   [Configuration not applied](#configuration-not-applied)
-   [An edit or command is blocked](#an-edit-or-command-is-blocked)
-   [Tests or tooling fail](#tests-or-tooling-fail)
-   [Code graph unavailable or stale](#code-graph-unavailable-or-stale)
-   [Generated docs or mirrors are stale](#generated-docs-or-mirrors-are-stale)
-   [Getting help](#getting-help)

## Start with Context and Setup

Run diagnostics from the project root—the directory that contains `.claude/`.

1. Confirm the host tools are available:

    ```bash
    claude --version
    node --version
    git --version
    ```

    The framework requires Node.js 18 or newer. Code-graph features are optional and additionally require Python 3.10 or newer.

2. Run `/project-init`. It is the idempotent setup and re-evaluation entry point for project configuration, reference docs, root instructions, and optional graph setup.

3. Check the generated project context:

    - `docs/project-config.json` describes the current project.
    - `docs/project-reference/` contains project-specific patterns and conventions.
    - `CLAUDE.md` contains the project instructions used by Claude Code.
    - `AGENTS.md` and `.codex/` are relevant when Codex compatibility is enabled.

4. If a warning says that context is missing or stale, rerun `/project-init`. Use a targeted `/scan --target=<key>` when only one reference document is outdated.

The portability boundary is intentional:

| Reusable framework assets                                                                                             | Project-owned context                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `.claude/skills/`, `.claude/agents/`, `.claude/hooks/`, `.claude/workflows/`, `.claude/scripts/`, and `.claude/docs/` | `docs/project-config.json`, `docs/project-reference/`, `CLAUDE.md`, and `AGENTS.md` |

Do not copy project-owned context from one project into another. Regenerate it with `/project-init` instead.

## Skills or Workflows Not Discovered

### A skill is missing or has stale metadata

1. Confirm the skill directory contains a `SKILL.md` entry point:

    ```text
    .claude/skills/<skill-name>/SKILL.md
    ```

2. Ask `/ck-help` for the current command and skill catalog.

3. If the catalog is stale, regenerate it from the project root:

    ```bash
    # Windows
    py -3 .claude/scripts/generate_catalogs.py --skills

    # macOS/Linux
    python3 .claude/scripts/generate_catalogs.py --skills
    ```

4. Restart the Claude Code session after adding or copying skills.

### A workflow is not selected

Workflow selection is model-driven. Check that `.claude/workflows.json` exists and is valid, then use the explicit skill or `/start-workflow <workflow-id>` when you need deterministic routing.

Validate the workflow catalog with:

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/workflows.json', 'utf8')); console.log('workflows.json OK')"
```

If the workflow catalog or project instructions are stale, run `/project-init` and restart the session.

## Hooks Not Running

Hook registrations live in `.claude/settings.json`, and registered commands resolve the project root through `CLAUDE_PROJECT_DIR`.

### Check the registration and hook file

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json', 'utf8')); console.log('settings.json OK')"
node --check .claude/hooks/<hook-name>.cjs
```

Confirm that:

-   The hook file named by the registration exists under `.claude/hooks/`.
-   The registration uses the correct Claude Code event and matcher.
-   The command points into the current project's `.claude/hooks/` directory.
-   The session was restarted after changing settings.

### Run the framework test suites

```bash
# Primary hook tests
node .claude/hooks/tests/test-all-hooks.cjs

# Aggregate hook and discovered-suite tests
node .claude/hooks/tests/run-all-tests.cjs
```

To exercise one hook directly, provide the JSON event payload it expects. For example:

```bash
# POSIX shells
printf '%s\n' '{"hook_event_name":"SessionStart"}' | node .claude/hooks/session-init.cjs

# PowerShell
'{"hook_event_name":"SessionStart"}' | node .claude/hooks/session-init.cjs
```

Read [hooks/README.md](./hooks/README.md) for the event table, registration rules, safety gates, and test-runner details.

## Configuration Not Applied

Check the configuration surface that owns the behavior:

| File                          | Owns                                                      |
| ----------------------------- | --------------------------------------------------------- |
| `.claude/settings.json`       | Claude Code settings and hook registrations               |
| `.claude/settings.local.json` | Local, uncommitted overrides when present                 |
| `.claude/.ck.json`            | Framework options such as output style and assertions     |
| `.claude/workflows.json`      | Workflow definitions and sequences                        |
| `docs/project-config.json`    | Project paths, tools, patterns, and reference-doc routing |

Validate the required JSON files together:

```bash
node -e "for (const f of ['.claude/settings.json', '.claude/.ck.json', '.claude/workflows.json', 'docs/project-config.json']) { JSON.parse(require('fs').readFileSync(f, 'utf8')); console.log(f + ' OK') }"
```

Then:

1. Check `.claude/settings.local.json` for a local override if the behavior differs between machines.
2. Confirm that the setting name belongs to the file you edited; similarly named settings are not interchangeable.
3. Restart Claude Code so session-start configuration is loaded again.
4. Run `/project-init` if the issue involves project paths, generated reference docs, root instructions, or graph configuration.

See [configuration/README.md](./configuration/README.md) for precedence and file-specific options.

## An Edit or Command Is Blocked

Blocking is expected when a safety gate detects a risky target or command. Use the message emitted by the gate to identify the cause:

| Gate                                                     | Typical cause                                                | Safe next check                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `path-boundary-block.cjs`                                | The target is outside the project root                       | Confirm the path and run from the correct project root                           |
| `privacy-block.cjs`                                      | The target may contain secrets or credentials                | Narrow the request and keep secrets out of general documentation or source files |
| `scout-block.cjs`                                        | A read/search is broader than the approved scope             | Search a smaller, explicit path first                                            |
| `git-commit-block.cjs`                                   | A commit or push was attempted without the approved workflow | Review the diff, then use the explicit commit workflow when authorized           |
| `windows-command-detector.cjs` or `bash-shell-guard.cjs` | Shell syntax does not match the active shell                 | Rewrite the command using the syntax named by the diagnostic                     |

Do not disable a safety gate globally to bypass one blocked operation. Confirm the target, reduce the scope, or correct the command first.

## Tests or Tooling Fail

Start with the smallest relevant check:

```bash
node --version
node .claude/hooks/tests/test-all-hooks.cjs
```

If the primary suite passes but the aggregate suite fails, rerun the affected suite with the runner's filter and verbose options:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=<suite-name> --verbose
```

For catalog or graph scripts, use the Python command appropriate to the host. On Windows, use `py -3`; on macOS/Linux, use `python3`. Keep the working directory at the project root so relative `.claude/` and `docs/` paths resolve correctly.

When reporting a failure, include the first error, the command, the current directory, and the relevant tool versions. Redact tokens, keys, credentials, and other sensitive values.

## Code Graph Unavailable or Stale

The code graph is optional. Skills and hooks continue to work without it, with less structural context.

### Check graph status

```bash
# Windows
py -3 .claude/scripts/code_graph status --json

# macOS/Linux
python3 .claude/scripts/code_graph status --json
```

### Build or resynchronize the graph

```bash
# Windows
py -3 .claude/scripts/code_graph build --json
py -3 .claude/scripts/code_graph sync --json

# macOS/Linux
python3 .claude/scripts/code_graph build --json
python3 .claude/scripts/code_graph sync --json
```

If Python dependencies are missing, follow [code-graph-setup.md](./code-graph-setup.md). If project configuration is not populated, run `/project-init` before building the graph.

## Generated Docs or Mirrors Are Stale

Some files are generated from canonical sources. Fix the source and then run the appropriate synchronization command; do not hand-edit a generated mirror and expect it to persist.

| Symptom                                              | Recovery                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Skill catalog does not match `.claude/skills/`       | Run `generate_catalogs.py --skills`                                |
| Project reference docs are missing or generic        | Run `/project-init` or the relevant `/scan --target=<key>`         |
| `CLAUDE.md` sections are stale                       | Run `/claude-md-init` through the project setup route              |
| `AGENTS.md` or `.codex/` differs from Claude sources | Run `/sync-codex` after updating the canonical Claude-side sources |
| Graph state does not match the current checkout      | Run the graph `sync` command or `/graph-build`                     |

When stale guidance names a consumer project, first verify whether the problem is in project-owned context (`docs/project-config.json`, `docs/project-reference/`, or generated root instructions) rather than in the portable `.claude/` framework.

## Getting Help

Start with the reference that owns the problem:

-   [Universal setup guide](./universal-setup-guide.md) for adoption and project initialization.
-   [Hooks reference](./hooks/README.md) for lifecycle events, registrations, gates, and tests.
-   [Configuration reference](./configuration/README.md) for settings and precedence.
-   [Code graph setup](./code-graph-setup.md) for optional graph prerequisites and commands.
-   [AI debugging protocol](./AI-DEBUGGING-PROTOCOL.md) for evidence-based investigation.

Before asking for help, collect:

1. The command or prompt that failed.
2. The project-root path, operating system, and tool versions.
3. The first diagnostic or stack trace, including the command's exit code.
4. Whether `/project-init` and the relevant test command have been run.

Never include secrets in a report.

_Source: portable framework documentation and the linked authoritative references._
