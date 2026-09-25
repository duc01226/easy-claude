---
name: sync-opencode
description: '[opencode] Use when running the opencode sync and verify pipeline (reconcile the recommended root opencode.json, write the skill-selection policy into permission.skill with its ownership ledger and the .opencode/commands/ files for hidden skills, generate the .opencode hooks bridge plugin and sub-agent mirror, run tooling tests, verify drift).'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->
## Codex Project-Reference Loading (Hook-Independent)

Claude and Codex use static project-reference loading as the authority; hooks may accelerate discovery but never replace the explicit read.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**
- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$ai-context-refresh`) before ordinary project-specific work. A full `$sync-codex` run preflights `CLAUDE.md`; a completed `$ai-context-refresh` run may invoke the standalone runner with `--skip=claude-md` after final source edits. Markerless roots need AI smart-merge unless `portability.requireUniversalGuides: false` is explicit.

**Situation-based docs** (pick by the phase you are about to enter — plan/investigate, edit, test, spec/doc, review — and read only docs the project selects in `referenceDocs` that exist):
- Planning, investigation, or design: `project-structure-reference.md`, `domain-entities-reference.md`, plus the docs below for every file type the plan touches
- Editing or writing code: `code-review-rules.md` plus the backend or frontend docs below for the file type
- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md` (or the configured styling reference), `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Test-data seeders: `seed-test-data-reference.md`
- Code review/audit work: `code-review-rules.md` plus the docs above for every file type under review
- Per-file conventions (`contextGroups[]`): before editing an unfamiliar path class, run `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`

**Dedup:** a doc counts as loaded only when your own read returned its full content to this context after the last compaction and within roughly the last 200K tokens, and it has not changed since — cite it `(loaded)` instead of re-reading. A hook reminder, a summary, or a prior mention never counts; a delegated sub-agent starts empty, so name the resolved doc paths in its brief.

Never read all docs blindly: route from `docs-index-reference.md` and open only what the task needs.
<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Reconcile the project-root `opencode.json` with the framework's recommended opencode defaults, compile `.claude/settings.json` into a portable opencode plugin (`.opencode/plugins/easy-claude-hooks.js`), and verify both. This runner is the **single and only** entrypoint for the opencode surface pipeline.

> **PORTABILITY CONTRACT — `.claude/` and `.opencode/` are portable, self-running and self-testing.**
> Copy them into ANY repository — a Python repo, a .NET repo, a repo with no `package.json` at all —
> and the sync / verify / test entrypoint still works, because it is a path INSIDE the bundle invoked
> with plain `node`. **Never** drive this framework through a host `package.json` script, and never
> document one: `npm run …` names a command that does not exist in most projects the bundle is copied
> into. The only external requirement is `node` >= 18 — no `node_modules`, no npm, no lockfile. The
> generated plugin imports only `node:` built-ins and spawns the canonical `.claude/hooks/*.cjs`
> scripts.
>
> Discover the roster instead of memorizing it:
> `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --list-stages`

**Summary:**

- opencode has **no shell-command hook system** — hooks are JavaScript plugin callbacks. This skill compiles `.claude/settings.json` into a bridge plugin whose runtime drives the original Claude hooks from opencode's plugin events.
- **Recommended opencode config is part of the framework.** `.opencode/opencode.recommended.json` is the single source of truth for the framework's opencode defaults; the `config` stage deep-merges it into the project-root `opencode.json` (recommended keys win, project-only keys survive).
- Scope is **hooks + recommended config + skill permissions + the sub-agent mirror**. opencode already auto-discovers skills from `.claude/skills` and `.agents/skills`, so there is **no skill mirroring** here (unlike `$sync-codex`). opencode ignores `disable-model-invocation`, so the `skills` stage enforces the selection policy through `permission.skill` in the project-root `opencode.json` instead, and writes a `.opencode/commands/<name>.md` per hidden skill so its explicit `/name` keeps working — see [Skill permissions](#skill-permissions). Sub-agents are NOT auto-discovered, so `.claude/agents/*.md` IS mirrored into `.opencode/agent/*.md` by the `agents` stage — that is what lets the workflow protocols dispatch the same specialists (`architect`, `code-reviewer`, `security-auditor`, …) on opencode.
- Keep `.claude` canonical: edit `.claude/settings.json` / `.claude/hooks/**` and re-run this pipeline; never hand-edit the generated `.opencode/plugins/easy-claude-hooks.js`.
- To change a default opencode setting, edit `.opencode/opencode.recommended.json`, then re-run this pipeline to propagate it into the root config of every project the `.opencode/` folder is copied into.
- The legacy hand-written `.opencode/plugins/notification.js` is superseded by the generated bridge; the runner backs it up under `tmp/opencode-legacy/` and removes it so notifications are not sent twice.

**Workflow:**

1. **Config** — `node .claude/scripts/opencode/sync-config.mjs` deep-merges `.opencode/opencode.recommended.json` into the project-root `opencode.json`.
2. **Sync** — `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs` rewrites `permission.skill` in the project-root `opencode.json` together with its ownership ledger `.opencode/skill-permissions.generated.json`, writes a marked `.opencode/commands/<name>.md` per hidden skill, and regenerates the bridge plugin, the `.opencode/agent/*.md` mirror, and the sync report.
3. **Test** — the runner executes the opencode tooling tests (config + writer + generated-plugin runtime).
4. **Verify** — the runner re-merges/re-renders in memory with the REAL writers and byte-compares against the tracked files.
5. **Inspect** — on failure, re-run the failing stage with `--only=<stage> --verbose`.

**Key Rules:**

- MUST run stages in order — the orchestrator fails fast on the first non-zero exit
- NEVER hand-edit `.opencode/plugins/easy-claude-hooks.js`; regenerate it from `.claude/settings.json`
- **NEVER hand-edit a project-root `opencode.json` as the way to change framework defaults** — edit `.opencode/opencode.recommended.json` and re-run the pipeline
- `.opencode/opencode.recommended.json` MUST NOT be named `.opencode/opencode.json`; opencode auto-loads that path as project config
- The generated plugin and `.opencode/plugins/**` are the only opencode hook surface; no skill mirror is produced (skills are auto-discovered, sub-agents are mirrored into `.opencode/agent/**`)
- Only `node "$CLAUDE_PROJECT_DIR"/...` hook commands are compiled; other command shapes are reported as `unsupported-command-shape`
- Claude events opencode cannot reproduce are reported as `skipped-events` in the sync report — never silently dropped
- The `skills` stage changes only `permission.skill` keys recorded in `.opencode/skill-permissions.generated.json`; a user-set key is never adopted, overwritten or loosened, and a called skill is never hidden; it rewrites or deletes only `.opencode/commands/*.md` files that carry its generated marker
- Idempotent — re-running the sync produces byte-identical plugin, config, permission, and agent output

## Why a bridge plugin (not a config mirror)

> The `config` stage above reconciles framework-recommended opencode **defaults**; it is not a mirror of Claude settings. This section explains why the project's *hook* surface is generated as a plugin.

Codex supports lifecycle hooks and can be driven by `.codex/hooks.json`. opencode cannot: its only
extension point for lifecycle behavior is a JS/TS plugin under `.opencode/plugins/` (or an npm plugin).
So instead of transcribing commands into a JSON file, this pipeline emits a self-contained plugin that
spawns the canonical Claude hook scripts and translates both directions:

| Direction | Translation |
| --- | --- |
| opencode → Claude hook | event name, tool id → Claude matcher name, opencode args → `tool_input` field names |
| Claude hook → opencode | exit `0` = allow · exit `2` = block (throw) · stdout `hookSpecificOutput.updatedInput` = argument rewrite · stdout `hookSpecificOutput.additionalContext` = injected context · stdout `hookSpecificOutput.permissionDecision: "deny"` = block |

## Recommended opencode config (source of truth)

The framework ships recommended opencode defaults as a portable template and
reconciles them into whatever project the `.opencode/` folder is copied into.

| Item | Path |
| --- | --- |
| **Source of truth (edit this)** | `.opencode/opencode.recommended.json` |
| **Generated target (never hand-edit for defaults)** | `<project-root>/opencode.json` |
| Writer / verifier | `.claude/scripts/opencode/sync-config.mjs` (`--check` for verify) |

> **To change a default recommended opencode setting in the future, edit `.opencode/opencode.recommended.json`** and re-run `$sync-opencode`. Every project that receives the `.opencode/` folder then gets the updated default the next time the pipeline runs. The recommended file is deliberately NOT named `.opencode/opencode.json` because opencode auto-loads that path as project config — keeping the `.recommended.json` name makes it a template, not an active config.

**Merge semantics:** the writer deep-merges the recommended defaults into the existing root `opencode.json`. Recommended keys win at every leaf; object keys that exist only in the project survive untouched; arrays in the recommended file replace the project's array. A project with no root config receives the recommended defaults verbatim. A malformed existing root config is reported, never clobbered.

### Compaction: host default

The framework pins no auto-compaction budget on any of its three surfaces (Claude Code,
Codex, opencode), so each host applies its own default and each user sets their own.
The recommended file therefore carries no model `limit`: opencode takes the window from
the model's registry entry (models.dev). For the pinned model that is `context: 1000000`,
`output: 384000` (verified with `opencode models opencode-go --verbose`, v1.18.31).

opencode has no absolute compaction threshold — it compacts relative to the model's
declared window, so the window IS the knob. From `session/overflow.ts` (v1.18.31):

```text
usable = limit.input ? max(0, limit.input - (compaction.reserved ?? min(20_000, maxOutput)))
                     : max(0, limit.context - maxOutput)
maxOutput = min(limit.output, 32_000)          // OUTPUT_TOKEN_MAX
compaction happens once total tokens >= usable
```

So the registry window compacts at **968,000** tokens (1,000,000 − 32,000). A user who
wants an earlier point sets their own `limit` on the model — in the project-root
`opencode.json` or their global opencode config. For example, `limit.context: 500000` +
`limit.output: 384000` compacts at 468,000.

**Retiring the old pin:** the `config` stage removes the model's `limit` from the root
`opencode.json` only when it is exactly the formerly bundled
`{ "context": 500000, "output": 384000 }` (the deep merge alone never deletes a key). Any
other `limit` is the user's: it is kept and reported with one `kept user-set …` line. Keep
a personal 500K budget in the global opencode config if the root file must stay untouched.

Two traps for anyone setting their own `limit`, both verified against the released source:

- **`compaction.reserved` is inert here.** It is only read on the `limit.input` branch,
  and models.dev declares no `input` for this model. Raising it does nothing.
- **Do NOT express the budget as `limit.input`.** It is undocumented, and `limit.context`
  is what the rest of opencode reads as the window — the TUI context percentage, ACP usage
  reporting, and the `limits` handed to the AI SDK. Capping `input` while leaving `context`
  at 1M shows ~48% in the TUI at the moment it compacts.

**Copying the framework into a new project:** copy `.claude/` and `.opencode/` (including `.opencode/opencode.recommended.json`), then run `$sync-opencode` — it generates/updates that project's root `opencode.json`, bridge plugin, and reports. Do NOT copy `.opencode/skill-permissions.generated.json` or `.opencode/commands/`: both are generated per project by the `skills` stage, and a copied ledger is ignored anyway because it names the other project — why: a ledger from another project would otherwise claim the adopter's own `permission.skill` entries.

## Skill permissions

opencode lists every discovered skill to the model and ignores `disable-model-invocation`, so the `skills` stage (`.claude/scripts/opencode/sync-skills.mjs`) writes the framework's selection policy into `permission.skill` of the project-root `opencode.json`. A `deny` entry hides the skill from the model and rejects loading it through the skill tool.

| Skill | Effective tier or mark | `permission.skill` entry |
| --- | --- | --- |
| Command-only skill (`disable-model-invocation: true`) | — | `deny` |
| Workflow wrapper (skill name = a `.claude/workflows.json` id) | manual | `deny` |
| Workflow wrapper | confirm | `ask` |
| Workflow wrapper | auto | none |
| Skill in `skillProfile.nameOnly` | — | no entry from the profile; a stricter entry from a row above stays |
| Skill in `skillProfile.commandOnly` or `skillProfile.off` | — | `deny` plus a generated command, so `/name` still runs it |
| Any other skill | — | none |

- **Effective tier, team scope.** A wrapper follows its effective tier — the project override for that workflow, otherwise the stricter of its framework tier and the project default (`portability.workflowActivation` in the project config, default `docs/project-config.json`) — never the raw `workflows.json` value. The tier wins over the wrapper's own `disable-model-invocation` mark, so an override that loosens a manual workflow to `auto` removes its entry. `opencode.json` is a project file, so a developer's `.claude/.ck.local.json` never lands in it.
- **Called skills are never hidden.** A skill named as a step of any workflow (`sequence` or any `variants.*.sequence`), in an agent's `skills:` frontmatter list, or in the curated `calledByOthers` or `entrySkills` lists of `.claude/config/skill-profiles.json` gets no policy entry, and the run prints one line per skill: `skipped <name>: called by <callers>`. The called set has one owner, `resolveProfile().called` in `.claude/scripts/sync-skill-profile.cjs`. A `.claude/workflows.json` without a `workflows` map stops the stage instead of counting as empty.
- **Skill profile.** The `skillProfile` rows come from the same `resolveProfile()` as the Claude sync (read `.claude/config/README.md` → Skill profile when you need the presets and lists). `nameOnly` writes nothing, because an `ask` would stop every workflow step that loads the skill; it never loosens an entry the policy already writes. A called skill in `commandOnly` or `off` is refused unless `skillProfile.allowHidingCalledSkills` is `true`: the stage prints the resolver's message and `skill-profile: nothing was written`, exits non-zero, and `--check` fails the same way. With the opt-in the `deny` is written and a warning line names the skill. Resolver warnings print as `warning: skill profile: ...` only when `skillProfile` is declared. Profile entries go through the same ownership ledger, so a user key is never adopted, overwritten or loosened.
- **Ownership.** `.opencode/skill-permissions.generated.json` lists each key the generator owns, with the value it wrote. Only listed keys are updated or removed.
- **The ledger is bound to its project.** It records `project` = `project.name` from the project config (default `docs/project-config.json`; `.claude/.ck.json` `portability.projectConfigPath` relocates it), or `null` when there is none. A ledger whose `project` is missing or differs — copied from another project, or left over from a rename — is ignored with one line, `warning: ignored .opencode/skill-permissions.generated.json: it belongs to another project (...)`, owns nothing, and is rewritten for this project, so every entry already in `opencode.json` stays the user's. A project config that exists but is not valid JSON stops the stage before anything is written.

| Situation | Outcome |
| --- | --- |
| Key existed before the generator first wrote it | Kept and never recorded as owned; `conflict: permission.skill.<name> is <user value>, generator wants <value>; kept the user value` when it differs |
| Key listed only in a ledger from another project | Treated as the previous row: never owned |
| Owned key the user changed | Kept; the same conflict line |
| Owned key the user deleted | Restored to the policy value with no conflict line — set an explicit value such as `allow` to keep a skill loadable |
| `permission` or `permission.skill` is a single value, not a map | Unchanged; one conflict line; no skill entries written |
| Wildcard key such as `internal-*` | Always the user's; never rewritten |

- **Only the skill tool is restricted.** The stage writes no `read`, `edit` or other permission, so reading `.claude/skills/<name>/SKILL.md` by path keeps working for workflows that load a skill file directly.
- A skill folder whose name is not lowercase letters, digits and hyphens (`^[a-z0-9][a-z0-9-]*$`) is skipped with a warning.
- `--check` fails when `permission.skill`, the ledger or a generated command differs from a fresh sync. A kept user value or user command is not drift.

### Commands for hidden skills

A hidden skill keeps its explicit `/name`: the same stage writes `.opencode/commands/<name>.md` for every skill whose final exact `permission.skill` entry is `deny` — the policy's own entries and a user deny alike (wildcard keys are not evaluated). A skill the policy denies but whose kept user value is not `deny`, or whose entry could not be written because `permission` / `permission.skill` is not a map, gets no command.

```markdown
---
description: "<the skill description, whitespace collapsed, YAML-escaped>"
---

<!-- GENERATED OPENCODE COMMAND (sync-skills.mjs) for .claude/skills/<name>/SKILL.md — do not hand-edit; re-run:
     node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs -->

@.claude/skills/<name>/SKILL.md

Arguments: $ARGUMENTS
```

- **Name.** The command name is the skill folder name, never the `name:` inside the skill; the write path must resolve inside `.opencode/commands/`.
- **Marker ownership.** Only files carrying the `GENERATED OPENCODE COMMAND` marker are rewritten or deleted. A marked command whose skill is no longer hidden is removed.
- **Same-name user command.** A command without the marker that already uses a hidden skill's name — in `.opencode/commands/` or opencode's singular `.opencode/command/` folder — is kept unchanged, no generated command replaces it, and the run prints `conflict: <path> is a user command without the generated marker; kept it, no command generated for skill <name>`.
- **No shell in generated bodies.** Generated commands never contain `` !`…` ``. **Shell note:** opencode substitutes `$ARGUMENTS` before it runs `` !`cmd` `` injections, so typed arguments that themselves contain `` !`…` `` run as shell on that host. Do not paste untrusted text as command arguments.

## Hook mapping

| Claude hook event | opencode plugin surface | Notes |
| --- | --- | --- |
| `PreToolUse` | `tool.execute.before` | throw blocks the tool; `updatedInput` rewrites `output.args` |
| `PostToolUse` | `tool.execute.after` | `additionalContext` is appended to the tool output |
| `UserPromptSubmit` | `chat.message` | `additionalContext` is injected as a synthetic text part |
| `SessionStart` | `event:session.created` / `event:session.compacted` + `experimental.chat.system.transform` | `additionalContext` is injected into the system prompt |
| `SessionEnd` | `event:session.deleted` | |
| `Stop` | `event:session.idle` | |
| `Notification` | `event:question.asked` / `event:permission.asked` | matcher vocabulary `AskUserPrompt` / `permission_prompt` |
| `PermissionRequest` | `permission.ask` | blocked → `status: "deny"` |

**Tool id aliases** (opencode → Claude matcher names the hooks are written against):

| opencode tool | Claude matcher names |
| --- | --- |
| `bash` | `Bash` |
| `edit` | `Edit`, `MultiEdit` |
| `write` | `Write` |
| `read` | `Read` |
| `grep` | `Grep` |
| `glob` | `Glob` |
| `apply_patch` | `Edit`, `Write`, `MultiEdit`, `NotebookEdit` |
| `todowrite` | `TodoWrite`, task tracking, `TaskUpdate`, `update_plan` |
| `webfetch` / `websearch` | `WebFetch` / `WebSearch` |
| `question` | ask the user directly |
| `skill` | skill invocation |
| `<server>_<tool>` (MCP) | `mcp__<server>__*` |

## Known limitations

- **MCP argument visibility.** opencode registers MCP tools as `<server>_<tool>`, and Claude matchers like `mcp__github__*` are matched against that convention. However, opencode does **not** expose MCP tool arguments to `tool.execute.before`, so an MCP `PreToolUse` hook that inspects `tool_input` cannot see them on this host.
- **`apply_patch` has no `file_path`.** The bridge reports it as `Edit`/`Write`/`MultiEdit` and passes `patchText` through as `patch`; hooks that require `file_path` (doc-sync-gate) allow/ignore it exactly as they do on other hosts.
- **Session resume.** `SessionStart` runs on `session.created` and `session.compacted`; when opencode resumes a session without either event, the bridge runs `source: "startup"` once on the first `chat.message`.
- **Claude-only stdout fields** other than `updatedInput`, `additionalContext`, and `permissionDecision` are ignored by the bridge.

## Usage

```bash
# Discover the stage roster:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --list-stages

# Full sync + test + verify:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs

# Stream live child output:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --verbose

# Every read-only gate (no mutation):
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --verify-only

# Just regenerate the plugin:
node .claude/scripts/opencode/sync-hooks.mjs

# Just verify the tracked plugin is current:
node .claude/scripts/opencode/sync-hooks.mjs --check

# Just reconcile the recommended root opencode.json:
node .claude/scripts/opencode/sync-config.mjs

# Just verify the root opencode.json is current:
node .claude/scripts/opencode/sync-config.mjs --check

# Just write the skill permissions:
node .claude/scripts/opencode/sync-skills.mjs

# Just verify the skill permissions are current:
node .claude/scripts/opencode/sync-skills.mjs --check

# Skip a stage while debugging:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --skip=hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

## Stages

9 stages, sequential — the complete opencode surface pipeline, owned entirely by this runner:

| # | Stage | Script | Effect |
| --- | --- | --- | --- |
| 1 | config | `.claude/scripts/opencode/sync-config.mjs` | Deep-merge `.opencode/opencode.recommended.json` into the project-root `opencode.json` |
| 2 | skills | `.claude/scripts/opencode/sync-skills.mjs` | Write `permission.skill` in the project-root `opencode.json`, the ownership ledger `.opencode/skill-permissions.generated.json`, and a marked `.opencode/commands/<name>.md` per hidden skill (see [Skill permissions](#skill-permissions)) |
| 3 | hooks | `.claude/scripts/opencode/sync-hooks.mjs` | Generate `.opencode/plugins/easy-claude-hooks.js` + `tmp/opencode-hooks.sync.report.json`; back up/remove legacy `notification.js` |
| 4 | agents | `.claude/scripts/opencode/sync-agents.mjs` | Mirror `.claude/agents/*.md` into `.opencode/agent/*.md` (`mode: subagent` + the canonical body verbatim) |
| 5 | tests | Runner discovers `.claude/scripts/opencode/tests/*.test.{mjs,cjs}` | Run opencode tooling tests; missing or empty discovery fails |
| 6 | verify-config | `.claude/scripts/opencode/sync-config.mjs --check` | Re-merge with the REAL writer and byte-compare with the project-root `opencode.json` |
| 7 | verify-skills | `.claude/scripts/opencode/sync-skills.mjs --check` | Re-plan with the REAL writer; fail when `permission.skill`, the ledger, or a generated command is missing, changed or stale |
| 8 | verify-hooks | `.claude/scripts/opencode/sync-hooks.mjs --check` | Re-render with the REAL writer and byte-compare with the tracked plugin |
| 9 | verify-agents | `.claude/scripts/opencode/sync-agents.mjs --check` | Re-render every agent with the REAL writer and byte-compare with the tracked `.opencode/agent/*.md` |

## Closing Reminders

**Protocols in force** (concise digest of the SYNC/shared blocks this skill carries) — **MUST ATTENTION** each canonical body below still binds:

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, never guess.

**MUST ATTENTION** keep the `$sync-opencode` skill user-invoked-only; no unrelated skill, agent, or workflow may auto-run the mutating pipeline.
**MUST ATTENTION** edit `.claude/settings.json` and `.claude/hooks/**` as the source, then regenerate; NEVER hand-edit `.opencode/plugins/easy-claude-hooks.js`
**MUST ATTENTION** the framework's default opencode settings live in `.opencode/opencode.recommended.json` — edit THAT file to change defaults, then re-run this pipeline; never treat a project-root `opencode.json` as the source
**MUST ATTENTION** the generated plugin must import only `node:` built-ins so `.claude`/`.opencode` stay portable into any project
**MUST ATTENTION** the `config` stage deep-merges (recommended wins, project-only keys survive) and never clobbers a malformed root config — it reports instead
**MUST ATTENTION** the runner auto-resolves the repo root from its own path — do not pass a cwd flag
**MUST ATTENTION** the legacy `notification.js` is backed up, never destroyed, before removal

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Just edit the .opencode plugin directly" | Next sync overwrites it. Edit `.claude/settings.json` and regenerate. |
| "Just edit the project-root opencode.json to change the defaults" | The next sync re-merges the recommended file and your default is lost, and no other project gets it. Edit `.opencode/opencode.recommended.json` and re-run. |
| "Make the recommended file `.opencode/opencode.json`" | opencode auto-loads that exact path as project config, so it would stop being a template. Keep the `.recommended.json` name. |
| "Skip the tests stage" | The tests exercise the generated plugin against real hook subprocesses; skipping ships an untested bridge. |
| "Mirror skills too for symmetry with sync-codex" | opencode already discovers `.claude/skills`; a mirror would duplicate and drift. Out of scope by design. |

> **[FAILS FAST]** First non-zero stage exit aborts the chain. Re-run the failing stage with `--only=<id> --verbose`.
> **[REPO ROOT]** The orchestrator auto-resolves the repo root from its own path.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — A hook delivers each protocol's full text when this skill loads. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-mistake-prevention` — Failure modes to avoid on every task; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/ai-mistake-prevention.md
- `critical-thinking-mindset` — Critical and sequential thinking with traced proof for every claim; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/critical-thinking-mindset.md
- `project-protocol-overlay` — Resolve the additive project overlays for the running skill; carried by the root instruction file; if it is absent, read → .claude/skills/shared/protocols/project-protocol-overlay.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; overridable in `docs/project-config.json`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->
## Static Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs` (static quality-protocol composer)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Resolve `specArtifacts` before selecting identity or carrier: use a valid profile, use strict-default TC/test identity only when the profile is absent, and block a malformed or unsupported declaration. Trace every requirement or invariant through decision, task, configured case/test identity and inspected assertion evidence, then carry it through source evidence and canonical docs/spec updates.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Resolve and validate `specArtifacts`: use valid native owner/case/variant identity and assertion-bearing evidence; use strict-default TC/TestSpec only when the profile is absent; block a malformed or unsupported declaration without fallback.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, analyze the task graph (output dependencies, shared write targets) into ordered parallel waves per PARALLELIZE before starting any task, then keep it synchronized as each step starts/completes. Preserve fixed ordering when a skill or workflow explicitly fixes it.
- **MANDATORY** Pin `Original goal:` before the first action and keep `User prompts this session: P1…Pn` current; re-read both at every step, before delegation, and after compaction.
- **MANDATORY** Before claiming done, map the result to the original goal and every prompt (`P# → done | deferred | n/a`); never store secrets in them.
## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/a linter catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
**[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
**Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
**Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.
**Judgement integrity:** For theory checks, judgements, evaluations and gap hunts, the prompt's premise is a hypothesis — test it AND its opposite with one evidence bar (web-verify external facts), why-review the draft as an inline self-check (run the `why-review` skill only for a formal review/audit/gap-hunt deliverable or a MEDIUM+/consequential issue the inline pass cannot settle), never invent findings or manufacture disagreement ("no material issues" is a valid verdict); end with a `Bias check:` line (`SYNC:judgement-integrity`).
## Common AI Mistake Prevention (System Lessons)

- **Resolve project applicability before using framework examples.** Read the project config and relevant references, then inspect local evidence; honor explicit N/A and never impose a language, framework, architecture layer, styling method, tool, or runtime surface the project does not use.
- **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
- **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
- **Re-read and re-verify after context compaction or resume.** Compaction wipes read state and memory; summaries describe intent, not environment state. Re-read before editing, audit current state (git status, files) before creating anything new, grep-verify sub-agent output — every "completed" claim is a hypothesis until evidence confirms it.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace every consumer before and after a change.** Map referencing files before deleting; after bulk replacements, renames, or extractions, grep ALL consumer file types (templates, configs, catalogs and generated files fail silently) for every old or removed name; trace the full dependency chain of an edited definition; update docs that embed canonical data alongside their source.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Sub-agents: inherit, cover, persist.** Sub-agents know only their agent .md definition — use custom agent types, not built-in Explore. Reconcile the union of assignments against the full target list — category splits miss boundary items. Make the report write the first deliverable, appended per file/section with bounded scope; a truncated run with no report → spawn a narrower scope, never the same prompt.
- **Ownership before action.** When investigating a failure, ask which part owns the behavior before changing anything. Trace the wrong state to the component responsible for its invariant, then make one authoritative correction there.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec if one exists (the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting any constant/limit/flag/cutoff, read comments, git blame, the CALLER's ordering (the guarantee usually runs immediately BEFORE the cited line), and 2+ sibling call sites. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic analysis — resist the nearest-attention trap.** Do not dive into the first plausible cause. List every precondition (configuration, environment, inputs, dependencies, versions, permissions, state) and verify each against evidence. Ask "what would falsify this?" — if nothing, it is not a hypothesis.
- **Minimal changes — apply the relevance test.** Every change must trace to the reported problem: "Would this change exist if I were not addressing this request?" — if not, remove or disclose it; never silently expand scope.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort ("(1) [N h], (2) [N h]. Which matters?"), list assumptions, name a simpler path when one exists.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC: steel-man a rejected alternative, invert each reason ("what does it sacrifice?"), stress-test the top 2-3 assumptions, run a pre-mortem. Quality = causal reasoning + mitigations + evidence, not section presence.
- **OOM/memory: check row count before row size.** An unbounded query (no DB filter for the trigger) → push the filter to the DB; then large rows → projection. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** For async work (queues, retries, background jobs, caches, replication) assert the final business/entity state — NEVER delivery bookkeeping (consume/send status, attempt counts, last-error, broker/scheduler/outbox rows) that ANY co-running process can write: green alone, flaky once anything shares that broker + database. Gate: "would this hold no matter WHICH process did the work?" Process-local fault injection is a stress amplifier (arm → bounded window → disarm → assert convergence), never a precondition.
- **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
- **Judge the environment before judging the code — a competing hypothesis, not a fallback.** A bug, failed test, error, or odd output is NOT proof of a code defect. Before any verdict, sweep environment preconditions (toolchain/lockfile state, stale build/cache artifacts, env vars and config, service dependencies, ports/clock, OS path/locale, permissions, leftover processes/test data) AND transient resource pressure (RAM/OOM, CPU, disk/temp, handle and connection-pool limits, network, a timeout that is really slowness). Tell-tale: non-deterministic, fails only in parallel, on one machine or only on CI, or an error naming resources. Cite the discriminator you ran (clean environment? path changed? concurrency 1?) — a verdict without one is a guess. Fix an environment cause in the environment; NEVER edit product code or weaken/skip a test to absorb it; a failure that vanishes on retry stays unexplained until its mechanism is named.
- **Cross-platform execution is a required contract.** Before authoring or changing a tool, script, process launcher, path assertion, or filesystem test, name the supported Windows, macOS, and Linux behaviors. Use platform-neutral APIs and literal argv vectors; never infer shell, temp-path, executable-extension, ACL, or symlink semantics from the current host. A documented command gives its Windows, macOS, and Linux form (Python: `py -3` on Windows, `python3` on macOS/Linux; shell: PowerShell/`.cmd` beside POSIX `sh`) or one platform-neutral runner such as `node <script>`. Canonicalize existing paths before identity, hashing, or equality checks; test native Windows and POSIX seams when behavior differs; keep CI platform matrices authoritative. Preserve fail-closed security boundaries — repair the fixture or platform branch, never weaken the guard just to make one OS green.
- **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer must reference NO consumer-specific domain concept (tenant/customer/product IDs, business entities, feature rules); such a leak compiles, runs, and passes review while coupling the layer to one consumer. Push domain fields/logic down into the consumer via subclass/composition.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
