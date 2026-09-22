---
name: sync-opencode
version: 1.1.0
description: '[opencode] Use when running the opencode sync and verify pipeline (reconcile the recommended root opencode.json, generate the .opencode hooks bridge plugin, run tooling tests, verify drift).'
disable-model-invocation: true
---

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
- Scope is **hooks + recommended config + the sub-agent mirror**. opencode already auto-discovers skills from `.claude/skills` and `.agents/skills`, so there is **no skill mirroring** here (unlike `$sync-codex`). Sub-agents are NOT auto-discovered, so `.claude/agents/*.md` IS mirrored into `.opencode/agent/*.md` by the `agents` stage — that is what lets the workflow protocols dispatch the same specialists (`architect`, `code-reviewer`, `security-auditor`, …) on opencode.
- Keep `.claude` canonical: edit `.claude/settings.json` / `.claude/hooks/**` and re-run this pipeline; never hand-edit the generated `.opencode/plugins/easy-claude-hooks.js`.
- To change a default opencode setting, edit `.opencode/opencode.recommended.json`, then re-run this pipeline to propagate it into the root config of every project the `.opencode/` folder is copied into.
- The legacy hand-written `.opencode/plugins/notification.js` is superseded by the generated bridge; the runner backs it up under `tmp/opencode-legacy/` and removes it so notifications are not sent twice.

**Workflow:**

1. **Config** — `node .claude/scripts/opencode/sync-config.mjs` deep-merges `.opencode/opencode.recommended.json` into the project-root `opencode.json`.
2. **Sync** — `node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs` regenerates the bridge plugin, the `.opencode/agent/*.md` mirror, and the sync report.
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
- Idempotent — re-running the sync produces byte-identical plugin, config, and agent output

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

### Compaction budget — 500K tokens

The framework targets the SAME 500K auto-compact budget on all three surfaces:
Claude Code (`env.CLAUDE_CODE_AUTO_COMPACT_WINDOW` in `.claude/settings.json`), Codex
(`model_auto_compact_token_limit` in `.codex/config.toml`) and opencode (the pinned
model's `limit.context` here).

opencode has no absolute compaction threshold — it compacts relative to the model's
declared window, so the window IS the knob. From `session/overflow.ts` (v1.18.31):

```text
usable = limit.input ? max(0, limit.input - (compaction.reserved ?? min(20_000, maxOutput)))
                     : max(0, limit.context - maxOutput)
maxOutput = min(limit.output, 32_000)          // OUTPUT_TOKEN_MAX
compaction happens once total tokens >= usable
```

So `limit.context: 500000` + `limit.output: 384000` compacts at **468,000** tokens.

Two traps this encodes, both verified against the released source:

- **`compaction.reserved` is inert here.** It is only read on the `limit.input` branch,
  and models.dev declares no `input` for this model. Raising it does nothing.
- **Do NOT express the budget as `limit.input`.** It is undocumented, and `limit.context`
  is what the rest of opencode reads as the window — the TUI context percentage, ACP usage
  reporting, and the `limits` handed to the AI SDK. Capping `input` while leaving `context`
  at 1M shows ~48% in the TUI at the moment it compacts.

**Copying the framework into a new project:** copy `.claude/` and `.opencode/` (including `.opencode/opencode.recommended.json`), then run `$sync-opencode` — it generates/updates that project's root `opencode.json`, bridge plugin, and reports.

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
| `todowrite` | `TodoWrite`, `TaskCreate`, `TaskUpdate`, `update_plan` |
| `webfetch` / `websearch` | `WebFetch` / `WebSearch` |
| `question` | `AskUserQuestion` |
| `skill` | `Skill` |
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

# Skip a stage while debugging:
node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --skip=hooks
```

**Exit codes:** `0` all pass · `1` orchestrator failure · non-zero propagates from failing stage.

## Stages

7 stages, sequential — the complete opencode surface pipeline, owned entirely by this runner:

| # | Stage | Script | Effect |
| --- | --- | --- | --- |
| 1 | config | `.claude/scripts/opencode/sync-config.mjs` | Deep-merge `.opencode/opencode.recommended.json` into the project-root `opencode.json` |
| 2 | hooks | `.claude/scripts/opencode/sync-hooks.mjs` | Generate `.opencode/plugins/easy-claude-hooks.js` + `tmp/opencode-hooks.sync.report.json`; back up/remove legacy `notification.js` |
| 3 | agents | `.claude/scripts/opencode/sync-agents.mjs` | Mirror `.claude/agents/*.md` into `.opencode/agent/*.md` (`mode: subagent` + the canonical body verbatim) |
| 4 | tests | Runner discovers `.claude/scripts/opencode/tests/*.test.{mjs,cjs}` | Run opencode tooling tests; missing or empty discovery fails |
| 5 | verify-config | `.claude/scripts/opencode/sync-config.mjs --check` | Re-merge with the REAL writer and byte-compare with the project-root `opencode.json` |
| 6 | verify-hooks | `.claude/scripts/opencode/sync-hooks.mjs --check` | Re-render with the REAL writer and byte-compare with the tracked plugin |
| 7 | verify-agents | `.claude/scripts/opencode/sync-agents.mjs --check` | Re-render every agent with the REAL writer and byte-compare with the tracked `.opencode/agent/*.md` |

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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Project applicability gate.** Before applying a stack, layer, style, tool, or architecture rule, read the project's config and relevant references, then check local implementations. Treat framework examples as examples; honor explicit N/A and do not require a technology or convention the project does not use.
> **ROOT-CAUSE GATE — INVESTIGATE FIRST.** Before applying any project-related correction, always use the project's root-cause investigation protocol and establish the cause; the failure site may be only a symptom.
> **FAILED-TEST GATE.** For any failed or unstable test, use the project's test-investigation protocol before editing source or tests; never change either side merely to force green.
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Store disposable generated output in the project workspace.** If an output can be regenerated and is not source code, a canonical source-of-truth, or an intentionally versioned projection, write it under the project-root `tmp/` or `temp/` directory (prefer `tmp/`), scoped to the run. This includes temporary state, integration/E2E results, reports, logs, screenshots, traces, videos, coverage, dumps, and candidate evidence. Never put these outputs in source, docs, the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path), the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in the same config overrides the path), or mirror directories; the project-root `.gitignore` must ignore `/tmp/` and `/temp/` by default. Committed fixtures, accepted baselines, canonical specs/docs, and explicitly versioned generated mirrors remain at their declared owner paths.
> **Judge the environment before judging the code.** A bug report, failed test, error, or unexpected output is not proof of a code defect. Before and during adjudication, weigh environment causes as a competing hypothesis — setup, config, version and dependency state, service dependencies, stale artifacts or leftover state, and transient resource pressure (RAM, CPU, disk, handles, network). State the discriminator you ran; fix an environment cause in the environment, never by editing product code or weakening a test to absorb it.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve project overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it). A matching `referenceDocs[]` filename may relocate the index within that root; this registry is independent from task-specific reference-doc selection, so omitted or empty `referenceDocs` does not disable it. The index's `**Protocols directory:**` header selects a project-root-relative body directory (default `docs/project-protocols/`). Match this skill against the `Target` column and take the most specific tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read only matched bodies derived as `<protocols-dir>/<Name>.md`; the row's Body link is display text, never a read path. Reject unsafe paths without reading. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. An absent index or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve this skill's overlays from the index at `<docsRoots.projectReference.path>/skill-protocols-reference.md` (default `docs/project-reference/`); an empty task `referenceDocs` does NOT disable this lookup. Read ONLY matched bodies from the directory the index header names (default `docs/project-protocols/`). Specificity (exact > glob > `*`) ranks overlays against EACH OTHER, never against the skill. Missing/malformed body → report and skip; no index or no match → proceed silently. Overlays are ADDITIVE ONLY — never an authority escalation or a gate waiver; equal-tier contradiction goes to the user.
<!-- /SYNC:project-protocol-overlay:reminder -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** critical + sequential thinking: every claim carries traced evidence (`file:line` for code, source URL or artifact section otherwise); confidence >80% to act, <60% do NOT recommend. Never present a guess as fact; admit uncertainty and stay skeptical of your own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** Check project config, relevant references, and local evidence before applying stack-specific conventions; honor explicit N/A. ROOT-CAUSE GATE: before any project-related correction, use the appropriate root-cause investigation protocol; failed/unstable tests require the test-investigation protocol before editing source/tests — never force green.

<!-- /SYNC:ai-mistake-prevention:reminder -->
