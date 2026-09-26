# Configuration Reference

> Complete guide to Claude Code configuration files

## Overview

Claude Code uses multiple configuration files to customize behavior, permissions, hooks, workflows, and integrations. This guide covers all configuration options and their effects.

```
.claude/
├── settings.json        # Main settings (hooks, permissions, plugins)
├── .ck.json             # Claude Kit configuration (levels, assertions)
├── .ck.local.json       # Optional developer-local CK overrides (gitignored)
├── workflows.json       # Workflow automation definitions
└── .mcp.json            # MCP server integrations
CLAUDE.md                # Project instructions at repo root (read by Claude)
```

---

## Configuration Files

### settings.json

**Purpose:** Core Claude Code settings including hooks, permissions, and plugins.

| Section          | Purpose                        |
| ---------------- | ------------------------------ |
| `permissions`    | Tool allow/deny/ask rules      |
| `hooks`          | Event-based hook registrations |
| `env`            | Environment variables          |
| `attribution`    | Commit/PR footer text          |
| `enabledPlugins` | Plugin toggles                 |
| `statusLine`     | Custom status line command     |

**See:** [settings-reference.md](./settings-reference.md) for complete reference.

---

### settings.local.json

**Purpose:** Local overrides not committed to git (gitignored).

**Location:** `.claude/settings.local.json`

**Common uses:** API keys and secrets, personal preferences, development-only hooks, local MCP servers.

```json
{
    "mcpServers": {
        "local-db": {
            "command": "node",
            "args": ["./local-mcp-server.js"],
            "env": { "DB_HOST": "localhost" }
        }
    }
}
```

---

### .ck.json

**Purpose:** Claude Kit settings for output style, planning, and hook behavior. Project-specific architecture and coding conventions belong in `docs/project-config.json` and its referenced project documentation.

```json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "validation": {
            "mode": "prompt",
            "minQuestions": 3,
            "maxQuestions": 8
        }
    },
    "assertions": ["Search for existing implementations before creating new code", "Follow the project's documented architecture and conventions"]
}
```

| Field               | Type     | Description                                                                                                                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plan.namingFormat` | string   | Plan directory naming pattern                                                                                                                                                  |
| `plan.validation`   | object   | Plan validation settings                                                                                                                                                       |
| `assertions`        | string[] | Legacy compatibility field. The standard SessionStart path does not add it to prompt context; active project rules belong in `docs/project-config.json` and its reference docs |
| `locale`            | object   | Language settings for thinking/responses                                                                                                                                       |
| `trust`             | object   | Trust passphrase configuration                                                                                                                                                 |

In this repository, the SessionStart hook loads `.ck.json` settings but does not inject the `assertions` array into prompt text. Keep this field only for compatibility with external consumers; use `contextGroups` and project reference docs for active project conventions.

**See:** [output-styles.md](./output-styles.md) for custom output styles.

### Experience verification

Project-specific user/downstream experience review is configured in
`docs/project-config.json` under `experienceVerification`. It supports
web/mobile/desktop/terminal/API/library/background/generated surfaces without
assuming a particular runner. See
[experience-verification.md](./experience-verification.md) for the evidence,
baseline, and explicit-acceptance lifecycle.

#### Code Review Configuration

The `codeReview` section records which project-specific review-rule doc the review skills/agents read (rules are read on demand via the project-reference-docs gate in `CLAUDE.md`):

| Field            | Type     | Description                                                                                                                                                                                                                         |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`        | boolean  | Whether review skills/agents consult the rules doc (default: `true`)                                                                                                                                                                |
| `rulesPath`      | string   | Path to rules markdown file (default: `code-review-rules.md` in the project-reference docs root, itself defaulting to `docs/project-reference` unless `docsRoots.projectReference.path` in `docs/project-config.json` overrides it) |
| `injectOnSkills` | string[] | Skills associated with the review-rules doc                                                                                                                                                                                         |

**To update code review rules:** Edit `code-review-rules.md` in the project-reference docs root directly. Review skills/agents read it on demand via the project-reference-docs gate.

**To add new trigger skills:** Edit `.claude/.ck.json`, add skill name to `injectOnSkills` array. Matching is case-insensitive and partial.

### Per-file convention injection

`docs/project-config.json` `contextGroups[]` entries double as convention classes; the optional top-level `conventionInjection` object switches the per-file reminder hook (`file-convention-inject.cjs`) on. Absent object or `enabled` not `true` ⇒ the hook is silent.

```json
{
    "contextGroups": [
        {
            "name": "feature-spec",
            "pathRegexes": [],
            "pathGlobs": ["docs/specs/**/*.md"],
            "priority": 100,
            "skills": ["spec"],
            "referenceDocs": ["docs/project-reference/feature-spec-reference.md"]
        },
        {
            "name": "general-code",
            "pathRegexes": [],
            "pathGlobs": ["**/*"],
            "excludePathGlobs": ["**/node_modules/**", "tmp/**"],
            "fileExtensions": [".js", ".cjs"],
            "priority": 900,
            "referenceDocs": ["docs/project-reference/code-review-rules.md"]
        }
    ],
    "conventionInjection": { "enabled": true }
}
```

| `conventionInjection` field | Default   | Allowed       | Meaning                                                                                                         |
| --------------------------- | --------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `enabled`                   | `false`   | boolean       | Explicit opt-in                                                                                                 |
| `maxChars`                  | `4000`    | 500–10000     | Reminder size cap                                                                                               |
| `maxClassesPerEdit`         | `4`       | 1–10          | Classes per trigger (applied before dedup)                                                                      |
| `reinjectAfterBytes`        | `4500000` | ≥ 4500000     | Conversation-history growth (transcript bytes, ~5–6 per visible character, ≈200K tokens) that re-arms a class   |
| `reinjectAfterMinutes`      | `30`      | 1–1440        | Age re-arm when history size is unknown but condensations ARE observed (host report or transcript mark)         |
| `blindReinjectAfterMinutes` | `5`       | 1–1440        | Age re-arm when the scope is blind — no transcript AND no condensation ever observed, so age is the only signal |
| `onRead`                    | `true`    | boolean       | Reads trigger reminders too                                                                                     |
| `compactionMarkers`         | `[]`      | regex strings | Extra transcript condensation marks                                                                             |

Each group may also set `on` — which file operation delivers it: `read`, `edit`, or `both` (default `both`, so an omitted `on` keeps delivery on reads and edits). `edit` keeps a group's read-first docs and skill pointers off plain reads; `conventionInjection.onRead: false` still turns read delivery off for every group. Any other value is a validation error naming the group and `read|edit|both`.

Class fields deciding membership (`pathRegexes`, `pathGlobs`, `fileNameRegexes`, `excludePathRegexes`, `excludePathGlobs`, `fileExtensions`) are part of the class's content version, so editing one re-delivers the class and changes its `[[convention:name@hash8]]` tag — regenerate CLAUDE.md/AGENTS.md afterwards. `guideDoc`/`patternsDoc` are the only fields used for documentation-impact routing (`.claude/scripts/doc-impact-map.cjs`); the delivery matchers are not.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`. Typical errors: `contextGroups[1] ("general-code"): needs at least one include matcher (pathRegexes, pathGlobs or fileNameRegexes)`, a duplicate or blank `name`, a malformed regex (the error names the class), or an out-of-range `conventionInjection.<field>`. Unknown group fields and a non-whole `priority` are warnings. Check what a file receives: `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`. Details: [../hooks/README.md § Per-File Convention Injection](../hooks/README.md#per-file-convention-injection).

### Session prompt ledger

The optional `.claude/.ck.json` `promptLedger` object tunes the prompt-ledger hook (`prompt-ledger.cjs`), which records every user prompt of a session and re-anchors the original goal after condensation. It is ON by default — no config needed; `enabled: false` (or `CK_PROMPT_LEDGER=0|off|false`) makes it inert, leaving the static `SYNC:session-goal-ledger` protocol as the only carrier.

```json
{ "promptLedger": { "enabled": true, "maxPromptChars": 4000, "maxEntries": 200, "reinjectAfterBytes": 1000000, "reinjectAfterMinutes": 45 } }
```

| `promptLedger` field   | Default   | Allowed   | Meaning                                                          |
| ---------------------- | --------- | --------- | ---------------------------------------------------------------- |
| `enabled`              | `true`    | boolean   | Record prompts and deliver reminders                             |
| `maxPromptChars`       | `4000`    | 200–20000 | Per-prompt stored size before a truncation marker                |
| `maxEntries`           | `200`     | 2–1000    | Entries kept per session (the original request is never evicted) |
| `reinjectAfterBytes`   | `1000000` | ≥ 50000   | Conversation-history growth that re-arms the reminder            |
| `reinjectAfterMinutes` | `45`      | 1–1440    | Age re-arm when history size is unknown                          |

Records live in `tmp/prompt-ledger/<session>/` (override `CK_PROMPT_LEDGER_DIR`) and are pruned after 7 days. Out-of-range values are clamped, not rejected. Details: [../hooks/README.md § Session Prompt Ledger](../hooks/README.md#session-prompt-ledger).

### Advisory prompt routers

Two UserPromptSubmit accelerators are ON by default and inject a short conditional directive; the static `CLAUDE.md` / `AGENTS.md` rules bind every host without them, so turning one off loses only the reminder. `.claude/.ck.local.json` overrides `.ck.json` per key (local wins), and the switch accepts `false` or the strings `"0"`, `"off"`, `"false"`, `"no"`, `"disabled"`.

| Hook                            | Injects when                                                                                                                                 | Opt-out (`.claude/.ck.json`)                          | Env opt-out                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| `commit-skill-route.cjs`        | the prompt asks for a commit — run the `commit` skill, never a raw `git commit` (`review-commit-gate.cjs` still blocks an unreviewed commit) | `{ "commitSkillRoute": { "enabled": false } }`        | `CK_COMMIT_SKILL_ROUTE=0`        |
| `judgement-integrity-route.cjs` | the prompt asks for a verdict, root cause, evaluation, or gap hunt — the `SYNC:judgement-integrity:reminder` directive                       | `{ "judgementIntegrityRoute": { "enabled": false } }` | `CK_JUDGEMENT_INTEGRITY_ROUTE=0` |

### Default-on workflow routing

Automatic route selection is enabled by default. The tracked team preference lives in `docs/project-config.json` and can disable it:

```json
{ "portability": { "workflowAutoDetect": false } }
```

One developer can override that preference in `.claude/.ck.local.json`, which is ignored by `.claude/.gitignore` and travels with the portable `.claude` layout without entering version control:

```json
{ "portability": { "workflowAutoDetect": false } }
```

The local boolean wins over the team boolean for runtime prompt refreshes. Missing files, malformed JSON, and non-boolean values express no preference; when neither layer supplies a valid boolean, the effective value is `true`.

When the tracked value is enabled, generated `CLAUDE.md`, `AGENTS.md`, and `.codex/CODEX_CONTEXT.md` carry the canonical route gate. When the effective runtime value is enabled, `workflow-route-inject.cjs` refreshes that gate with the current workflow/skill catalog at `UserPromptSubmit`. It emits advisory plaintext, never blocks a prompt, suppresses duplicate delivery within a session, and re-arms after content changes, compaction, or about 4.5 MB of transcript growth (the framework proxy for roughly 200K tokens). When the effective value is disabled, the same hook delivers a short routing-OFF notice instead: it supersedes the tracked gate's auto-select (which a local override cannot remove), tells the model to skip skill steps that recommend switching to a workflow, and keeps every quality gate. Explicit skill or workflow invocation remains available while automatic routing is off.

To run a session with the whole framework off — hooks, project instructions and skills — without editing `.claude/`, start `claude --settings .claude/config/vanilla-settings.json --disable-slash-commands` (details and trade-offs: `.claude/config/README.md`).

### Workflow activation tiers

Each `.claude/workflows.json` entry may declare `activation` (default `auto`):

| Tier | The model may | Enforced by |
| --- | --- | --- |
| `auto` | Select and start it on the first task of a session | Route gate |
| `confirm` | Select it, but ask the user once (its step count vs. the lean custom-simple route) before starting it | Route gate, `start-workflow` |
| `manual` | Never select or start it; it names the workflow in its route declaration and runs it only on an explicit user request | Route gate, `start-workflow`, the wrapper skill's `disable-model-invocation: true` (Claude) and the generated `agents/openai.yaml` `policy.allow_implicit_invocation: false` (Codex) |

Framework defaults: `workflow-feature` is `confirm`; `workflow-big-feature`, `workflow-greenfield-init`, `workflow-idea-to-pbi` and `workflow-spec-to-pbi` are `manual`. An explicit request (`/workflow-<id>`, `/start-workflow <id>`, or asking in words) runs any tier. Changing a workflow to or from `manual` also means changing its wrapper skill's `disable-model-invocation` — a test fails when the two disagree.

A project can tighten these tiers without forking `workflows.json` through `portability.workflowActivation` in `docs/project-config.json`:

```json
{ "portability": { "workflowActivation": { "default": "confirm", "overrides": { "workflow-bugfix": "auto" } } } }
```

| `portability.workflowActivation` field | Default | Allowed | Meaning |
| --- | --- | --- | --- |
| `default` | none (framework tiers) | `auto`, `confirm`, `manual` | Floor applied to every workflow: the effective tier is the stricter of this and the framework tier, so it only tightens |
| `overrides` | none | map of workflow id → `auto`, `confirm`, `manual` | Pins one workflow's tier; wins over `default` and the framework tier, so it may loosen |

Tier order is `auto` < `confirm` < `manual`. Omitting the object keeps every framework tier. An unknown tier in either field is a validation error naming the key and `auto|confirm|manual`. A developer may override it in the git-ignored `.claude/.ck.local.json` (same nesting): each setting in `.claude/.ck.local.json` wins over the team value; overrides merge per workflow id, so a local `overrides`-only object keeps the team `default`.

### Custom workflow-route protocol

The same hook can carry project-supplied additional route rules via `portability.workflowRouteProtocol`. The team value lives in `docs/project-config.json`; a developer can override it in the git-ignored `.claude/.ck.local.json` (a valid local value replaces the team value). The value is either an inline string or an object `{ "text"?, "path"? }` where `path` is a repo-relative markdown file read at runtime (absolute paths and `..` segments are rejected):

```json
{ "portability": { "workflowRouteProtocol": { "path": "docs/project-protocols/route.md" } } }
```

`workflow-route-inject.cjs` appends the resolved text in its own marker block (`<!-- CK:WORKFLOW-ROUTE-PROTOCOL -->`), advisory only and never blocking. A `path` naming a privacy-sensitive file (`.env`, credentials, secrets, `*.pem`/`*.key`) is refused — the validator rejects it and the runtime treats it as no opinion — and a file over 20,000 bytes is truncated with a visible marker. It is runtime-only and is never stamped into tracked `CLAUDE.md`/`AGENTS.md`/Codex context.

### Just-in-time path rules

When inlined `contextGroups[].rules` push the generated root context past its byte budget, the team can opt out of inlining them in `docs/project-config.json`:

```json
{ "portability": { "inlinePathRules": false } }
```

`SECTION:golden-rules` then names each rule-bearing group and points to the file-conventions hook and its `--lookup` CLI instead of repeating the rule text. It is honored only when `conventionInjection.enabled` is `true`, the conventions lib is available, every rule-bearing group is named, unique and ranked within `conventionInjection.maxClassesPerEdit`, and a worst-case digest fits `conventionInjection.maxChars` (raise it, up to 10000, when the warning names the size budget); otherwise the rules stay inline and `generate-claude-md.cjs` prints `[WARN] INLINE_PATH_RULES` naming the missing precondition. Read `.claude/skills/ai-context-refresh/SKILL.md` (Just-in-time path rules) when enabling it.

### Startup dependency installation

`docs/project-config.json` `hooks.startupInstall` tunes the startup dependency install. Its single
consumer is the registered SessionStart integrity hook `.claude/hooks/verify-install.cjs`, which runs
the install-integrity scan first and then delegates policy to `.claude/hooks/lib/startup-install.cjs`.
The install is attempted only on an explicit `startup` session source and only when the project root
manifest declares dependencies that are not installed; no root manifest, no declared dependencies, or
dependencies already present are clean no-ops. A partial `.claude` bundle reports the repair path
and attempts no install at all.

```json
{
    "hooks": {
        "startupInstall": {
            "enabled": true,
            "packageManager": "auto",
            "allowLifecycleScripts": false
        }
    }
}
```

| `hooks.startupInstall` field | Type    | Default  | Allowed                              | Meaning                                                                                                   |
| ---------------------------- | ------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `enabled`                    | boolean | `true`   | boolean                              | `false` disables installation only (outcome `skip-disabled`)                                              |
| `packageManager`             | string  | `"auto"` | `auto`, `npm`, `pnpm`, `yarn`, `bun` | One manager **signal**, never a precedence override                                                       |
| `allowLifecycleScripts`      | boolean | `false`  | boolean                              | A repository **request** only — effective solely with the `CK_STARTUP_INSTALL_TRUST=1` host grant (below) |

**The section and every property in it are optional.** An omitted property keeps the portable default,
and the defaults are identical whether the property, the whole `hooks` section, or the entire
`docs/project-config.json` file is absent: `enabled: true`, `packageManager: "auto"`,
`allowLifecycleScripts: false`. A project that declares nothing behaves exactly as it did before the
section existed, so declare it only to record a needed non-default.

**A declared `packageManager` is a signal, not an override.** A non-`auto` value joins the other
available signals — the root manifest's Corepack `packageManager` field, `project.packageManagers`,
every recognized root lockfile, and a detected Yarn PnP install — and all of them must resolve to one
manager (and to at most one pinned version) or the install fails closed with `skip-manager-conflict`
and runs nothing. Declaring `"npm"` in a project carrying `pnpm-lock.yaml` therefore installs nothing;
it does not switch the project to npm. With no signal at all the historical `npm` fallback applies.

**Disabling installation never disables integrity verification.** `enabled: false` short-circuits the
install only; `verify-install.cjs` still scans the `.claude` bundle for missing hook files and
transitive requires, and still reports a partial copy.

**The manager executable and its arguments are not configurable — by design.** No config key can
supply a command, a flag, or a path. The hook only ever runs a fixed, version-matched argv taken from
its own support matrix, so no project config can turn the startup hook into an arbitrary command
runner, under a fixed 120-second deadline for the manager process. That closed argv is what makes
this section safe to expose at all. `allowLifecycleScripts: true` only removes the suppression
argument that matrix row already defines (`--ignore-scripts`, `--skip-builds`, or
`--mode=skip-build`); it grants nothing else, manager-native policy such as Bun's
`trustedDependencies` still governs dependency scripts, and a project-loaded manager extension
(a `pnpmfile`, `YARN_PLUGINS`, a `.yarnrc` `yarn-path`) skips the install regardless of the opt-in.

**`allowLifecycleScripts: true` needs a second, host-side signal to do anything.** A repository can
only REQUEST unsuppressed scripts; the environment variable `CK_STARTUP_INSTALL_TRUST=1` is the grant,
and the effective value is `allowLifecycleScripts === true && CK_STARTUP_INSTALL_TRUST === '1'`. This
is deliberate: a checked-in config travels with a clone, so it must not be able to authorize running a
dependency's install scripts on a machine whose owner never agreed to that. Without the grant the
install still proceeds with suppression intact — so the failure mode of setting only the config key is
SILENT (you get `--ignore-scripts` anyway, and the diagnostic vocabulary has no code for "request not
granted"). Grant it per machine in `.claude/settings.local.json`, which is git-ignored:

```json
{
    "env": {
        "CK_STARTUP_INSTALL_TRUST": "1"
    }
}
```

The same grant has a **second effect that is easy to miss**: without it the runner sanitizes the
manager's child environment — known registry-credential variables are stripped and npm's user and
global config paths are pointed at a credential-free device path, so an ambient `.npmrc` cannot be
read. Granting trust stops that sanitization, which is what lets a private-registry install
authenticate, and equally what exposes those credentials to whatever lifecycle scripts now run. Grant
it when a project genuinely needs built native dependencies or a private registry at session start;
leave it ungranted otherwise.

**Supported breadth.** Managers `npm`, `pnpm`, `yarn`, `bun` across the matrix rows `npm@10-11`,
`npm@12`, `pnpm@9.15.0`, `pnpm@12`, `yarn@1`, `yarn@2.4`, `yarn@3-4`, `bun@1.2`; recognized root
lockfiles `package-lock.json` and `npm-shrinkwrap.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock`
(yarn), `bun.lock` and `bun.lockb` (bun); platforms `win32`, `linux`, `darwin`. A manager version
outside the matrix, an ambiguous lockfile pair, a lockfile that is recognized but unsupported on the
installed version (npm 12 with only `npm-shrinkwrap.json`, Bun 1.2 with only the legacy `bun.lockb`),
an unsupported platform, or a Corepack shim all skip instead of guessing — a pinned dependency graph is
never reinterpreted as lockless.

**Config states.** An absent config file uses the defaults above. An invalid config file skips
installation with `skip-config-invalid`, and a config loader that cannot be loaded at all skips with
`skip-config-unavailable` — it fails closed rather than falling through to the enabled default, because
an adopter's explicit disablement cannot be established. Diagnostics are one-line, fixed-vocabulary
strings on stderr; they never echo a path, a config value, or manager output, and most skips are silent
no-ops.

Validate with `node .claude/hooks/lib/project-config-schema.cjs --validate docs/project-config.json`
(`--describe` prints the authoritative field list). Hook-side details:
[../hooks/README.md](../hooks/README.md).

### Code graph switch

`docs/project-config.json` `hooks.codeGraph.enabled` decides whether the code-graph hooks and CLI run:

| Value | Meaning |
| --- | --- |
| `"auto"` (default) | Active only when `.code-graph/graph.db` exists |
| `"on"` | Always active |
| `"off"` | Graph hooks stay silent and the graph CLI refuses to run |

Omitting the key or the `codeGraph` object means `"auto"`. Any other value is a validation error naming `auto|on|off`.

### Token checkpoint

> **Read by `token-budget-checkpoint.cjs`.** The checkpoint hook (PostToolUse on `TodoWrite|TaskCreate|TaskUpdate|update_plan`, main conversation only) reads `hooks.tokenBudget` on every task/plan step and counts the session's main and sub-agent Claude transcripts. On a host whose transcript it cannot read, it stays silent. A malformed section keeps the checkpoint off until the config is fixed. Claude users can also check spend with `/context`.

`docs/project-config.json` `hooks.tokenBudget` tunes an advisory checkpoint at task/plan step boundaries: each time the session's non-cached tokens (input + cache creation + output; cache reads never count) cross the next multiple of `checkpointTokens`, the model gets one note suggesting a progress report and asking whether to continue. It never blocks.

```json
{ "hooks": { "tokenBudget": { "enabled": true, "checkpointTokens": 500000 } } }
```

| `hooks.tokenBudget` field | Type    | Default  | Allowed             | Meaning                              |
| ------------------------- | ------- | -------- | ------------------- | ------------------------------------ |
| `enabled`                 | boolean | `true`   | boolean             | `false` turns the note off           |
| `checkpointTokens`        | integer | `500000` | 50000–20000000      | Non-cached tokens between two notes  |

A `checkpointTokens` value outside the range, or not a whole number, is a validation error naming the key and the range.

### Commit `Fix-Origin` trailer

`docs/project-config.json` `commit.fixOriginTrailer` (boolean, default `false`) opts a project into the author-declared `Fix-Origin: <feedback|regression|not-applicable>` trailer. When `true`, the `commit` skill writes it on new commits only; existing commits are never reworded to add it. When omitted or `false`, commit messages carry no `Fix-Origin` trailer.

### Skill profile

`docs/project-config.json` `skillProfile` sets, for the whole team, which skills the model sees. `preset` picks a base from `.claude/config/skill-profiles.json`: `full` (no overrides), `standard` (skills other skills or hooks start leave the model's list but stay callable by name), or `minimal` (only the entry skills stay listed). The lists `nameOnly`, `commandOnly` (only a user's `/name` starts it) and `off` (skill folder names; one list per skill) apply on top of the preset.

Apply it with `node .claude/scripts/sync-skill-profile.cjs` (`--check` is read-only). The guard refuses, and writes nothing, when `commandOnly` or `off` would hide a called skill — one a workflow step or an agent `skills:` entry starts, or one on the curated `calledByOthers` or `entrySkills` list (the workflow runner and the setup skills that gates and hooks start) — unless `allowHidingCalledSkills: true`. `nameOnly` is allowed for any skill. Read `.claude/config/README.md#skill-profile` when you need the per-host effect (Claude `skillOverrides`, Codex, OpenCode), the ownership ledger, or the fail-closed inputs.

---

### workflows.json

**Purpose:** Canonical workflow definitions and execution metadata. Use `portability.workflowAutoDetect` above to opt out of automatic routing, and a workflow's `activation` tier ([Workflow activation tiers](#workflow-activation-tiers)) to keep it from being started automatically.

```json
{
    "version": "2.4.0",
    "workflows": {
        "feature": {
            "sequence": ["plan", "feature-implement", "test", "code-review", "docs-update"],
            "whenToUse": "User wants to implement new functionality"
        }
    }
}
```

**Schema:** Each workflow entry supports `activation`, `defaultMode`, `description`, `intent`, `name`, `outcomeGates`, `parallelGroups`, `preActions`, `sequence`, `stepMeta`, `variants`, `whenToUse` (`WorkflowEntry` in `.claude/workflows.schema.json`). There are NO `priority` or `triggers` properties. When runtime routing is enabled, the model semantically matches the prompt against `whenToUse`; otherwise the catalog remains available only through explicitly invoked workflow skills.

**Live catalog (20 workflows):** `workflow-big-feature`, `workflow-bugfix`, `workflow-e2e`, `workflow-feature`, `workflow-implement-spec`, `workflow-feature-spec`, `workflow-greenfield-init`, `workflow-idea-to-pbi`, `workflow-idea-to-spec`, `workflow-refactor`, `workflow-research`, `workflow-review-changes`, `workflow-architecture-audit`, `workflow-code-to-spec`, `workflow-spec-to-pbi`, `workflow-spec-sync`, `workflow-visualize`, `workflow-seed-test-data`, `workflow-write-integration-test`, `workflow-integration-test-green`.

| Workflow                  | Sequence (abridged, from `workflows.json`)                                                                                                                                          | whenToUse (abridged)                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `workflow-feature`        | investigate → … → plan → plan-review → … → plan-execute → … → integration-test → … → workflow-end                                                                                   | Well-defined feature; no canonical spec has the behavior yet |
| `workflow-implement-spec` | investigate → spec-clarify → plan → plan-execute → spec [mode=sync] (when behavior differs) → integration-test → integration-test-verify → workflow-review-changes → test → workflow-end → watzup | Behavior already written in a canonical spec or TC set |
| `workflow-bugfix`         | investigate → debug-investigate → … → fix → … → workflow-end                                                                                                                        | Bug, error, crash, regression; end-to-start trace |
| `workflow-refactor`       | investigate → plan → … → plan-execute → … → workflow-end                                                                                                                            | Restructure code without behavior change          |
| `workflow-review-changes` | [parallel: changes-review + whole-target why-review] → parallel specialists → code-simplifier → … → final whole-target why-review (conditional on fix-cycle changes) → workflow-end | Review uncommitted changes before committing      |

---

### .mcp.json

**Purpose:** Model Context Protocol server integrations.

```json
{
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "" }
        },
        "context7": {
            "command": "npx",
            "args": ["-y", "@context7/mcp-server"]
        }
    }
}
```

| Server     | Purpose                                                               |
| ---------- | --------------------------------------------------------------------- |
| `github`   | GitHub API integration (issues, PRs, repos)                           |
| `context7` | Optional library-docs accelerator for `/web-research` (host-agnostic) |

---

### opencode.json (recommended defaults)

**Purpose:** opencode's project config. The framework ships recommended defaults and reconciles them into each consuming project through `$sync-opencode`.

| Item                                           | Path                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Source of truth (edit this to change defaults) | `.opencode/opencode.recommended.json`                                                                 |
| Generated target (created/updated by the sync) | `<project-root>/opencode.json`                                                                        |
| Writer / verifier                              | `.claude/scripts/opencode/sync-config.mjs` (`--check` verifies)                                       |
| Sub-agent mirror source of truth               | `.claude/agents/*.md`                                                                                 |
| Sub-agent mirror target (generated)            | `.opencode/agent/<name>.md` — one per canonical agent, `mode: subagent` + the canonical body verbatim |
| Sub-agent mirror writer / verifier             | `.claude/scripts/opencode/sync-agents.mjs` (`--check` verifies)                                       |

**To update a default recommended opencode setting:** edit `.opencode/opencode.recommended.json` and run `$sync-opencode` (or `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs`). The `config` stage deep-merges the recommended defaults into the project-root `opencode.json` — recommended keys win at every leaf, project-only keys survive untouched, and a project with no root config receives the recommended defaults verbatim. A malformed existing root config is reported, never clobbered.

**Adopting the framework in a new project:** copy the `.opencode/` folder (including `opencode.recommended.json`) plus `.claude/`, then run `$sync-opencode` to generate/update the project's root `opencode.json`, the hooks bridge, the `.opencode/agent/*.md` sub-agent mirror, the `permission.skill` entries and the `.opencode/commands/<name>.md` files. Do NOT copy `.opencode/skill-permissions.generated.json` (the skill-permission ownership ledger) or `.opencode/commands/`: both are generated per project. The ledger records its project's name (`project.name` from the project config, default `docs/project-config.json`), so a ledger copied from another project is ignored and treated as empty.

**No compaction pin (all three surfaces):**

The portable bundle sets no auto-compaction budget on any host, so each host compacts at its own default and each person picks their own value. Keep a personal budget in personal or local config, never in a file the bundle ships to the whole team.

| Surface     | Host default (no pin)                                                                                          | Set your own                                                                                                                                                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | Compacts near the model's context limit: about 967K on a 1M-window model; 200K models are unchanged              | `/autocompact 500k` (saved as `autoCompactWindow` in your user settings) · `claude --autocompact 500k` (one launch) · `env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` in `~/.claude/settings.json` (all projects) or `.claude/settings.local.json` (this project only). Never put it in `.claude/settings.json`: that shared scope outranks user settings, and the env var overrides `/autocompact` |
| Codex       | Codex's own default                                                                                            | `model_auto_compact_token_limit` in `~/.codex/config.toml`, or top-level in the project `.codex/config.toml`                                                                                                                                                                                              |
| opencode    | The model's registry window; the bundled model declares a 1M `context` and 384K `output`, so it compacts at 968,000 | `provider.<id>.models.<model>.limit` in the project-root `opencode.json` or your global opencode config                                                                                                                                                                                                    |

**Retiring the old pin.** Earlier bundles pinned 500K on every host. `$sync-codex` removes a top-level `model_auto_compact_token_limit` from `.codex/config.toml` only when its value is exactly `500000`, along with the bundled comment block above it when that block is unchanged. `$sync-opencode` removes the pinned model's `limit` from the root `opencode.json` only when it is exactly `{ "context": 500000, "output": 384000 }`. Any other value belongs to the user: the sync keeps it and prints one `kept user-set …` line. A personal 500K budget should therefore live in user-level config (`~/.codex/config.toml`, the global opencode config), where no sync looks.

**Codex `AGENTS.md` read budget:** the same upsert raises top-level `project_doc_max_bytes` to 98304 in `.codex/config.toml` (a larger project value is kept). Codex silently stops reading `AGENTS.md` at 32 KiB by default, and the generated root is larger; the projection orders Doc Lookup and Git discipline first so they survive the default window if the host ignores the project key (set it in `~/.codex/config.toml` then). The budget is shared by every `AGENTS.md` Codex concatenates from the project root down to the working directory, so nested `AGENTS.md` files eat into the root's share.

opencode has no absolute compaction threshold — it compacts relative to the model's declared window, so a `limit.context` you set is the knob (it compacts at `limit.context - min(limit.output, 32000)`). `compaction.reserved` is inert for this model: opencode reads it only for models that declare `limit.input`. Read the `sync-opencode` skill ("Compaction: host default") for the exact formula before setting your own `limit`.

> `.opencode/opencode.recommended.json` MUST NOT be renamed to `.opencode/opencode.json`: opencode auto-loads that path as project config, so it would stop being a template.

**See:** the `sync-opencode` skill for the full stage roster and merge/portability contract.

---

## Quick Configuration Guide

### Enable/Disable Features

```json
// .ck.json
{
  "promptLedger": { "enabled": false },      // Disable prompt-ledger recording
  "commitSkillRoute": { "enabled": false },        // Disable the commit-skill prompt router
  "judgementIntegrityRoute": { "enabled": false }  // Disable the judgement-integrity prompt router
}

// settings.json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": false  // Disable plugin
  }
}
```

### Store Active Project Rules

Keep tracked `.claude` defaults project-neutral. Put path-specific conventions in
`docs/project-config.json` `contextGroups` and authoritative detail in the
referenced project docs. `.ck.json.assertions` is retained for compatibility,
but its values are not injected into the standard prompt context.

### Customize Plan Naming

```json
// .ck.json
{
    "plan": {
        "namingFormat": "{date}-{issue}-{slug}",
        "dateFormat": "YYMMDD-HHmm",
        "issuePrefix": "GH-"
    }
}
```

### Add Tool Permissions

```json
// settings.json
{
    "permissions": {
        "allow": ["Bash(docker:*)"],
        "deny": ["Bash(rm -rf /*)"],
        "ask": ["Bash(git push:*)"]
    }
}
```

---

## Configuration Inheritance

Configuration is loaded in order with later files overriding earlier:

1. **Claude Code defaults** - Built-in settings
2. **User settings** - `~/.claude/settings.json`
3. **Project settings** - `.claude/settings.json`
4. **Session settings** - Runtime modifications

---

## Environment Variables

Set a personal switch as an `env` entry in the git-ignored `.claude/settings.local.json`, or in your shell.

| Variable                                | Purpose                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE_PROJECT_DIR`                    | Project root directory, set by the host and used in hook commands                                                                    |
| `CK_DEBUG`                              | `1` or `true`: framework hooks print diagnostics to stderr (`.claude/hooks/lib/debug-log.cjs`)                                       |
| `CLAUDE_HOOK_DEBUG`                     | `1` or `true`: hooks append a lifecycle trace (no transcript text) to a log file, rotated at 1 MB, keeping one backup                                     |
| `CLAUDE_HOOK_DEBUG_LOG`                 | Path of that trace file; default `<os temp>/ck/debug/bash-hooks.log`                                                                 |
| `CK_NO_AUTO_OPEN`                       | `1`: HTML reports (`watzup`, `understand`) print their path instead of opening; nothing opens under `CI` or headless Linux either    |
| `CK_STARTUP_INSTALL_TRUST`              | `1`: host grant that lets `hooks.startupInstall.allowLifecycleScripts: true` take effect (see [Startup dependency installation](#startup-dependency-installation)) |
| `CK_PROMPT_LEDGER`                      | `0` / `false` / `off` / `no`: turns the session prompt ledger off, like `promptLedger.enabled: false` in `.ck.json`                  |
| `CK_PROMPT_LEDGER_DIR`                  | Directory for prompt-ledger records instead of `<project>/tmp/prompt-ledger`                                                         |
| `CK_COMMIT_SKILL_ROUTE`                 | `0`: stops the reminder to commit through the `commit` skill, like `commitSkillRoute.enabled: false`                                 |
| `CK_JUDGEMENT_INTEGRITY_ROUTE`          | `0`: stops the judgement-integrity reminder, like `judgementIntegrityRoute.enabled: false`                                           |
| `DOC_SYNC_OVERRIDE`                     | `1`: silences the doc-sync commit warning (the gate only warns, never blocks); each use is appended to the gate's audit log            |
| `ENABLE_DESKTOP_NOTIFICATIONS`          | `false`: turns off desktop turn-complete alerts (on by default)                                                                     |
| `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` / `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Setting one turns on turn-complete alerts in that chat channel; setup: `.claude/hooks/notifications/docs/` |
| `PYTHON_PATH`                           | Python executable tried first when session start detects the Python version                                                          |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`   | `1` when starting OpenCode: it stops loading `.claude/skills` for that session                                                       |
| `GITHUB_PERSONAL_ACCESS_TOKEN`          | GitHub MCP server auth                                                                                                               |

---

## Permission Configuration

### Allowlist Patterns

```json
{
    "permissions": {
        "allow": ["Tool/**", "Tool(pattern:*)", "Bash(npm:*)", "Bash(git commit:*)", "Read(src/**)", "Write(src/**, !*.secret)"]
    }
}
```

### Common Permission Sets

**Read-only development:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Glob/**", "Grep/**"],
        "deny": ["Write/**", "Edit/**", "Bash(rm:*)"]
    }
}
```

**Full development access:**

```json
{
    "permissions": {
        "allow": ["Read/**", "Write/**", "Edit/**", "Glob/**", "Grep/**", "Bash(npm:*)", "Bash(git:*)", "Bash(node:*)"]
    }
}
```

---

## Hook Configuration

### Event Types

| Event              | When Triggered            |
| ------------------ | ------------------------- |
| `SessionStart`     | Session begins            |
| `UserPromptSubmit` | User sends message        |
| `PreToolUse`       | Before tool execution     |
| `PostToolUse`      | After tool execution      |
| `Stop`             | Response complete         |
| `PreCompact`       | Before context compaction |
| `SessionEnd`       | Session ends              |
| `SubagentStart`    | Subagent spawning         |
| `UserPromptExpansion` | Typed `/command` expands |
| `Notification`     | Idle/waiting events       |

> These are the Claude Code events available for hooks. This framework registers no `PreCompact` hook. `SubagentStart` and `UserPromptExpansion` carry only the six `protocol-inject-<group>.cjs` protocol-delivery handlers (full protocol texts for skill-preloading agents and typed `/command` skills); standing sub-agent context stays static in `agents/*.md`. Read `../hooks/README.md` when you need the per-event registration counts.

### Hook Structure

```json
{
    "hooks": {
        "EventName": [
            {
                "matcher": "ToolPattern",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/hook.cjs",
                        "timeout": 60
                    }
                ]
            }
        ]
    }
}
```

### Matcher Patterns

| Pattern               | Matches                |
| --------------------- | ---------------------- |
| `"Write"`             | Exact tool name        |
| `"Write\|Edit"`       | Multiple tools (regex) |
| `"*"` or `""`         | All tools              |
| `"mcp__server__tool"` | MCP tool               |

---

## Common Customizations

### Adding a New MCP Server

```json
{
    "mcpServers": {
        "my-server": {
            "command": "npx",
            "args": ["-y", "@my/mcp-server"],
            "env": { "API_KEY": "${MY_API_KEY}" }
        }
    }
}
```

### Adding a Custom Hook

```json
{
    "hooks": {
        "PostToolUse": [
            {
                "matcher": "Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node .claude/hooks/my-custom-hook.cjs",
                        "timeout": 30
                    }
                ]
            }
        ]
    }
}
```

---

## Troubleshooting

### Configuration Not Applied

1. Check file syntax: `node -e "console.log(JSON.parse(require('fs').readFileSync('.claude/settings.json')))"`
2. Verify file location
3. Check for local override in settings.local.json
4. Restart Claude Code session

### Hook Not Running

1. Check matcher pattern matches tool
2. Verify hook script exists
3. Check timeout setting
4. Run hook manually: `echo '{}' | node .claude/hooks/hook.cjs`

### Permission Denied

1. Check allow patterns match file path
2. Check for deny patterns overriding
3. Verify glob syntax

---

## Related Documentation

- [settings-reference.md](./settings-reference.md) - Complete settings.json reference
- [output-styles.md](./output-styles.md) - Custom output styles
- [../hooks/README.md](../hooks/README.md) - Hook system overview
- [../hooks/extending-hooks.md](../hooks/extending-hooks.md) - Creating custom hooks

---

_Source: `.claude/` configuration files_
