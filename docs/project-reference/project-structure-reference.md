# Project Structure Reference

<!-- Last scanned: 2026-10-03 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> Read this guide when planning or investigating framework ownership, runtime entry points, configuration, or verification commands.

## Quick Summary

**Goal:** Locate the authoritative framework component and its execution boundary before changing easy-claude.

- `.claude/` owns framework source; `.agents/`, `.codex/`, `.opencode/` and `AGENTS.md` are generated host surfaces.
- The repository supplies hook handlers and task tooling. Configured modules are libraries; skill-local packages are optional tooling, not application services.
- Invoke portable tooling by its in-framework path. The root manifest has no npm scripts.
- Read configuration for versions, setting names and ports; preserve user settings and keep credential values out of documentation.

## Repository Scope & Architecture

The root package is private repository development tooling with Node `>=18.0.0`; its manifest declares formatter/commit tooling and an empty `scripts` object (`package.json:1–24`). The seven library modules are declared in `docs/project-config.json` → `modules`; their implementation roots are shown below. Hook entry points import shared libraries inward, for example `session-init.cjs` imports workflow/config helpers and `hook-runner.cjs` adapts host input (`.claude/hooks/session-init.cjs:18–40`; `.claude/hooks/lib/hook-runner.cjs:294–306`).

Read `.claude/docs/framework-portability.md` when changing portable framework code or a host mirror; it defines the copy/verification boundary. Read `.claude/skills/sync-codex/SKILL.md` when canonical source edits require Codex regeneration; the standalone runner owns its stage roster (`.claude/skills/sync-codex/scripts/run-codex-sync.mjs:3–16`). OpenCode has its own owner at `.claude/skills/sync-opencode/SKILL.md`; the Codex runner delegates to it when `.opencode/` is present.

## Applications & Entry Points

| Entry point | Read/use when | Evidence |
| --- | --- | --- |
| `.claude/settings.json` → `hooks` | Resolving a lifecycle event's registered commands, matchers and timeouts | `.claude/settings.json:30–194` |
| `.claude/hooks/session-init.cjs` | Tracing startup, resume, clear and persisted session/workflow state | `.claude/hooks/session-init.cjs:313–330` |
| `.claude/hooks/lib/hook-runner.cjs` | Selecting normalized hook-event and result/error handling | `.claude/hooks/lib/hook-runner.cjs:294–323` |
| `.claude/skills/<name>/SKILL.md` | Executing a named task contract; discover current names through the skill catalog | `.claude/scripts/scan_skills.py:127–175` |
| `.claude/workflows.json` + `.claude/scripts/lib/workflow-manifest.cjs` | Resolving workflow occurrences, variants, roles and outcome gates | `.claude/scripts/lib/workflow-manifest.cjs:162–212` |
| `.claude/hooks/notifications/notify.cjs` | Tracing main-session alerts and configured providers | `.claude/hooks/notifications/notify.cjs:75–171` |
| `.claude/scripts/review-prepare.cjs` | Preparing exact local/staged/branch/named-file review targets, active skill-mode/source binding and optional OCR; read `.claude/docs/review-preparation.md` when selecting capture or adoption behavior | `.claude/scripts/lib/review-preparation.cjs:45-88,117-123` |
| `.claude/skills/project-config/scripts/review-setup.cjs` | Inspecting or saving the OCR project preference through the canonical relocated config loader; read `.claude/skills/project-config/SKILL.md` when accepting enable/off setup | `.claude/skills/project-config/scripts/review-setup.cjs:20-39,93-97,114-174` |
| `.claude/scripts/ai-signal-scan.cjs` | Discovering AI-feature surfaces before an AI review | `.claude/scripts/ai-signal-scan.cjs:187-215` |

Workflow progression is model-driven through the resolved manifest and tracked tasks; persisted state is recovery data, not proof that an outcome gate passed. Read `.claude/skills/start-workflow/SKILL.md` when resolving execution/flex rules, and `.claude/skills/workflow-end/SKILL.md` when closing a run. Read `.claude/docs/hooks/README.md` when changing registered lifecycle behavior; use the current registrations rather than a copied hook list.

## Runtime & Integrations

Hooks execute as host-registered Node commands. No mandatory database, broker, API service or infrastructure unit is declared in `docs/project-config.json` → `databases`, `messaging`, `api`, `infrastructure`. This does not exclude optional tooling connections.

- Code-graph tooling persists source topology in SQLite (`.claude/scripts/code_graph/graph.py:26–71`). Read `.claude/docs/code-graph-setup.md` when installing/building it; read `.claude/docs/code-graph-mechanism.md` when tracing graph ownership.
- Notifications support desktop plus optional Telegram, Discord and Slack remote delivery. Provider calls are owned by `.claude/hooks/notifications/providers/telegram.cjs:110–114`, `discord.cjs:171–177` and `slack.cjs:130–132` under that same provider directory. Read `.claude/docs/configuration/README.md` when enabling them.
- `html-export` uses its own Playwright/ffmpeg execution boundary; read `.claude/skills/html-export/SKILL.md` when exporting artifacts. Its override binaries are resolved by `.claude/skills/html-export/scripts/lib/ffmpeg.cjs:95–137`.

No required application port is established by this configuration. Record a port only after reading the owning runtime configuration. A repository-wide maintained-manifest search found no CI, IaC or container deployment definition; delivery provider, promotion and rollback remain unknown.

## Build, Delivery & Operations

Use these platform-neutral Node entry points on Windows, macOS and Linux:

| Command | Purpose / owner |
| --- | --- |
| `node .claude/hooks/tests/test-all-hooks.cjs` | Hook tests; configured in `docs/project-config.json` → `testing.commands` |
| `node .claude/hooks/tests/run-all-tests.cjs` | All suites; configured in `docs/project-config.json` → `testing.commands` |
| `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --list-stages` | Discover current sync/verification stages (`run-codex-sync.mjs:3–16`) |
| `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only` | Execute read-only Codex pipeline gates (`run-codex-sync.mjs:3–16`) |

Read `docs/project-reference/integration-test-reference.md` when running, writing or reviewing shipped tests. Python tooling uses `py -3` on Windows and `python3` on macOS/Linux, as documented in `docs/project-config.json` → `testing.commandsNote`. Root `.cmd` files are Windows launch helpers; `claude-start.cmd` and `codex-start.cmd` explicitly bypass their hosts' permission/sandbox checks, so they are not ordinary verification commands.

## Environment & Secret Configuration

| Source | Setting names / mechanism |
| --- | --- |
| `.claude/settings.json:26–29` | `CLAUDE_CODE_ENABLE_TODO_TOOLS`, `MCP_TIMEOUT` |
| `.claude/hooks/lib/ck-config-loader.cjs:19–22` | Framework settings at project `.claude/.ck.json`, local `.ck.local.json`, personal `~/.claude/.ck.json`; read `.claude/docs/configuration/README.md` when selecting a setting | <!-- path-role: user-local -->
| `.claude/hooks/notifications/.env.example:8–21` | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`; environment precedence is process → personal → project (`notifications/lib/env-loader.cjs:80–100`) |
| `.claude/.env.example:34–50` | Optional skill credential references `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`; inspect the skill's own loader before asserting precedence |
| `.claude/skills/html-export/scripts/lib/ffmpeg.cjs:95–137` | `HTML_EXPORT_FFMPEG`, `HTML_EXPORT_FFPROBE`; Windows overrides must resolve supported executable files |
| `.claude/hooks/lib/prompt-ledger-store.cjs:460–467` | `CK_PROMPT_LEDGER_DIR` optionally relocates per-session prompt records; default project `tmp/prompt-ledger` |

Session-scoped legacy helpers use OS-temp `ck`; project dismiss/freshness markers use `tmp/claude-temp` (`.claude/hooks/lib/ck-paths.cjs:25–54`). Prompt and convention stores have their own owners; do not assume all runtime data uses one temp root.

## Languages & Toolchain

The root Node range is `>=18.0.0` (`package.json:12–14`); html-export requires `>=20` in `.claude/skills/html-export/package.json`. Use the selected tool’s requirement. Hooks/libraries use CommonJS `.cjs`; host-sync tooling also uses ESM `.mjs` (`hook-runner.cjs`; `run-codex-sync.mjs`). Read `.claude/scripts/README.md` when catalog/scanner PyYAML is missing: `.claude/scripts/lib/python_dependencies.py` owns the bounded global attempt, local fallback and actual-import verification. Python tooling requirements are ranges: `pyyaml>=6.0` in `.claude/scripts/requirements.txt`; graph dependencies are `tree-sitter>=0.21.0`, `tree-sitter-language-pack>=0.7.0`, `networkx>=3.0` in `.claude/scripts/code_graph/requirements.txt`. Optional conversion/export tools own separate manifests; do not present their packages as root runtime dependencies.

Read `.claude/.mcp.json.example` when interpreting example MCP authentication references; its context7 API-key argument and `GOOGLE_GEMINI_API_KEY` reference do not establish an installed server. Read `.claude/docs/review-preparation.md` when selecting OCR machine policy: personal/ignored-local declarations and `CK_REVIEW_TOOL_*` restrictions are owned by `.claude/scripts/lib/review-acquisition-policy.cjs`. Tracked project groups grant no machine permission.

## Source Organization

Read `docs/project-config.json` → `modules` when selecting a component; module paths are project configuration and must be corroborated by source. `.claude/hooks/` contains entry points, `hooks/lib/` shared utilities, `skills/` task contracts/local tools, `agents/` specialized roles, `scripts/` maintenance tools, `workflows.json` workflow definitions and `docs/` framework guidance. Read `docs/project-reference/docs-index-reference.md` when locating project/reference/spec documentation.

## Component Architecture

| Component      | Count                                                                                         | Location                      | Format                                                                              |
| -------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Hooks          | <!-- COUNT:hooks -->30<!-- /COUNT -->                                                         | `.claude/hooks/*.cjs`         | Top-level CommonJS Node.js hook scripts counted by ADR-0002                         |
| Hook Libraries | <!-- COUNT:lib-modules -->45<!-- /COUNT -->                                                   | `.claude/hooks/lib/*.cjs`     | CommonJS utility modules                                                            |
| Skills         | <!-- COUNT:skills -->101<!-- /COUNT -->                                                       | `.claude/skills/*/SKILL.md`   | Markdown + YAML frontmatter                                                         |
| Agents         | <!-- COUNT:agents -->24<!-- /COUNT -->                                                        | `.claude/agents/*.md`         | Markdown definitions                                                                |
| Workflows      | <!-- COUNT:workflows -->19<!-- /COUNT -->                                                     | `.claude/workflows.json`      | JSON workflow definitions                                                           |
| Hook Tests     | 99 suites + 9 `test-*` files                                                                  | `.claude/hooks/tests/`        | CJS/JS test files; top-level `test-*` files plus `run-all-tests.cjs` aggregate      |
| Codex Mirrors  | <!-- COUNT:skills -->101<!-- /COUNT --> skills, <!-- COUNT:agents -->24<!-- /COUNT --> agents | `.agents/`, `.codex/`         | Generated Codex-compatible copy                                                     |


## Module Codes

| Code | Module         | Location                       | Description                                                                                                               |
| ---- | -------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| HK   | Hooks          | `.claude/hooks/`               | <!-- COUNT:hooks -->30<!-- /COUNT --> top-level `.cjs` runtime hook files (session init, safety gates, graph, formatting) |
| HL   | Hook Libraries | `.claude/hooks/lib/`           | <!-- COUNT:lib-modules -->45<!-- /COUNT --> shared utility modules for hooks                                              |
| SK   | Skills         | `.claude/skills/`              | <!-- COUNT:skills -->101<!-- /COUNT --> task automation skill definitions                                                 |
| AG   | Agents         | `.claude/agents/`              | <!-- COUNT:agents -->24<!-- /COUNT --> specialized subagent role definitions                                              |
| WF   | Workflows      | `.claude/workflows.json`       | <!-- COUNT:workflows -->19<!-- /COUNT --> end-to-end process orchestrations                                               |
| SC   | Scripts        | `.claude/scripts/`             | Catalog, protocol, graph and maintenance tools                                        |
| CX   | Codex Tooling  | `.claude/scripts/codex/`       | ESM sync, migration, notification and verification tools                                                  |
| CM   | Codex Mirrors  | `.agents/`, `.codex/`          | Generated Codex-compatible skills, agents, hooks                                                                          |
| NT   | Notifications  | `.claude/hooks/notifications/` | `notify.cjs` dispatcher + 4 channel providers in `providers/` (desktop, telegram, discord, slack)                         |
| HT   | Hook Tests     | `.claude/hooks/tests/`         | 99 suite files + 9 top-level `test-*` files + `run-all-tests.cjs` aggregate                                               |


## Repository review responsibility

`docs/project-config.json` opts this repository into supplemental OCR with user-owned groups derived from existing modules/context classes. Read `.claude/docs/review-preparation.md` when preparing targets or changing rule routing.

OCR preference belongs to the loader-selected project config: omitted provider is Unset, `open-code-review` is Enabled, and `none` is Off. For a nonempty source review with valid required policy, Unset offers exactly Accept setup / Turn off OCR for this project / Skip this time. Enabled uses permitted readiness/fallback; Off suppresses later adoption prompts. Read `.claude/skills/shared/review-preparation.md` when asking as the top-level review owner, verifying a save, recapturing target/policy after a save, or propagating invocation-only `--provider-decision skip` to children and rechecks (`.claude/scripts/lib/review-preparation.cjs:84-88`; `.claude/skills/shared/review-preparation.md:17-34`).

Read `.claude/skills/framework-config/SKILL.md` when an OCR preference request enters framework configuration; it routes to the same project-config helper. That helper preserves unrelated settings and validates the consent-bound candidate/readback; it never invokes or acquires OCR. Saved Enabled is a preference, not tool Ready or machine permission (`.claude/skills/project-config/scripts/review-setup.cjs:114-174`).

| Primary group | Priority | Existing classifier references |
| --- | ---: | --- |
| tests | 50 | context classes `integration-test`, `shipped-tests` |
| specs | 60 | context class `feature-spec` |
| hooks | 100 | modules `hooks`, `hooks-lib` |
| skills | 200 | module `skills` |
| agents | 300 | module `agents` |
| scripts | 400 | module `scripts` |
| docs | 500 | module `docs-framework` |
| mirrors | 600 | context class `agent-mirrors-context` |

**MUST ATTENTION** preserve one primary owner per entry and every matching required convention. Tests/specs precede enclosing framework modules; unmatched paths retain `general`. These team groups do not grant machine permission. Additional `ruleDocs` is omitted. Required sources include declared active skill-mode procedures, host-selected project/spec/ADR/caller documents, selected review references and matching conventions. The host carries the same `--skill-mode` and repeated `--required-doc` union through capture, child replay and final recheck; `policySelection` exposes this choice (`.claude/scripts/lib/review-rule-policy.cjs:48-88,170-240`; `.claude/scripts/lib/review-preparation.cjs:45-64,117-123`).

## Advisory Selection and Workflow Discovery

Read `.claude/hooks/skill-activation-inject.cjs` when tracing runtime skill-selection guidance and `.claude/hooks/workflow-route-inject.cjs` when tracing route/catalog delivery; neither changes host permission or advances workflow steps. SubagentStart carries protocol delivery and advisory skill context. `workflow-end` is the unregistered lifecycle skill; route-mode configuration belongs to `.claude/skills/framework-config/SKILL.md` and `.claude/scripts/workflow-mode.cjs`. Use the current manifest/catalog instead of restoring a stale workflow-mode skill inventory.

## Closing Reminders

Locate the authoritative component, resolve its runtime/configuration, then verify the affected output. Edit canonical framework source before regenerating host mirrors. Use source-defined commands, ranges and setting names; keep credentials private and leave unsupported deployment/port claims unknown.
